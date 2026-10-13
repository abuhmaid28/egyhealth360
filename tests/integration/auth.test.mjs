import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool, withTransaction, rejectsConstraint, user } from '../support/database.mjs';
import { createAuthPersistence, createPersistence, createDatabase } from '../../packages/db/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';
import { hashPassword, createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';
import { sessionHash, csrfToken } from '../../apps/api/dist/auth.js';

const origin = 'http://localhost:3000';
const password = randomBytes(32).toString('base64url');
const encoded = await hashPassword(Buffer.from(password));
const passwords = await createPasswordVerifier();

async function fixture(role = 'ADMIN') {
  const persistence = createPersistence(process.env.DATABASE_URL);
  try {
    return await persistence.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash: encoded, role,
      ...(role === 'ADMIN' ? {} : { profile: { displayName: 'Synthetic auth test' } }),
    });
  } finally { await persistence.close(); }
}

async function withApi(run, production = false, override = {}) {
  const store = createAuthPersistence(process.env.DATABASE_URL);
  const db = createDatabase(process.env.DATABASE_URL);
  const config = authConfiguration({ NODE_ENV: production ? 'production' : 'test', AUTH_BROWSER_ORIGIN: production ? 'https://app.example.invalid' : origin });
  const app = await createApp(db, { store: { ...store, ...override }, passwords, config });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await app.listen(0, '127.0.0.1');
    const request = async (path, { method = 'GET', body, cookie, csrf, headers = {} } = {}) => fetch(`${await app.getUrl()}/api/v1/auth/${path}`, {
      method, headers: { ...(method === 'POST' ? { Origin: config.origin, 'Content-Type': 'application/json', 'X-EH-Login': '1' } : {}),
        ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers },
      ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    });
    const login = async (identity, cookie, headers) => {
      const response = await request('login', { method: 'POST', body: { email: identity.email, password }, cookie, headers });
      assert.equal(response.status, 200);
      const json = await response.json();
      const setCookie = response.headers.get('set-cookie');
      const browserCookie = setCookie.split(';', 1)[0];
      return { response, json, setCookie, cookie: browserCookie, token: browserCookie.split('=')[1] };
    };
    await run({ request, login, pool, store, config });
  } finally { await app.close(); await store.close(); await db.close(); await pool.end(); }
}

test('role logins, strict response projection, database hash-only sessions, cookie flags and reload CSRF', () => withApi(async ({ login, request, pool }) => {
  const tokens = new Set();
  for (const role of ['PATIENT', 'CLINICIAN', 'ADMIN']) {
    const identity = await fixture(role);
    const session = await login(identity, undefined, { 'Sec-Fetch-Site': 'same-site' });
    tokens.add(session.token);
    assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(session.json.data.user, { id: identity.id, email: identity.email, role });
    assert.deepEqual(Object.keys(session.json.data).sort(), ['csrfToken', 'session', 'user']);
    assert.deepEqual(Object.keys(session.json.data.session), ['expiresAt']);
    const rows = (await pool.query('SELECT * FROM sessions WHERE user_id=$1', [identity.id])).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].token_hash, sessionHash(Buffer.from(session.token, 'base64url')));
    assert.equal(rows[0].expires_at - rows[0].created_at, 28800000);
    assert.equal(rows[0].revoked_at, null);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['created_at', 'expires_at', 'id', 'revoked_at', 'token_hash', 'user_id']);
    assert.doesNotMatch(JSON.stringify(rows), new RegExp(session.token));
    assert.match(session.setCookie, /^eh_session=.*; Path=\/; HttpOnly; SameSite=Lax; Max-Age=28\d{3}; Expires=/);
    assert.doesNotMatch(session.setCookie, /Secure|Domain/);
    const me = await request('me', { cookie: session.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.headers.get('cache-control'), 'no-store');
    assert.equal(me.headers.get('set-cookie'), null);
    assert.deepEqual(await me.json(), session.json);
    assert.equal(session.json.data.csrfToken, csrfToken(Buffer.from(session.token, 'base64url')));
    const audit = (await pool.query('SELECT * FROM audit_logs WHERE entity_id=$1', [rows[0].id])).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].action_type, 'AUTH_LOGIN');
    assert.deepEqual(audit[0].safe_metadata, {});
    for (const secret of [password, encoded, session.token, rows[0].token_hash, session.json.data.csrfToken]) assert.equal(JSON.stringify(audit).includes(secret), false);
  }
  assert.equal(tokens.size, 3);
}));

test('generic invalid-login behavior, failed relogin preserves session, and no failure audit', () => withApi(async ({ login, request, pool }) => {
  const active = await fixture();
  const disabled = await fixture();
  const unsupported = await fixture();
  await pool.query('UPDATE users SET status=\'DISABLED\' WHERE id=$1', [disabled.id]);
  await pool.query('UPDATE users SET password_hash=\'synthetic-test-hash\' WHERE id=$1', [unsupported.id]);
  const session = await login(active);
  const before = (await pool.query('SELECT count(*)::int AS n FROM audit_logs WHERE actor_user_id=ANY($1::uuid[])', [[active.id, disabled.id, unsupported.id]])).rows[0].n;
  for (const body of [
    { email: active.email, password: 'wrong' }, { email: `${randomUUID()}@example.invalid`, password },
    { email: disabled.email, password }, { email: unsupported.email, password },
    { email: 'not-an-email', password }, { email: 'é@example.invalid', password },
    { email: active.email, password, role: 'ADMIN' }, {}, { email: 12, password },
    { email: active.email, password: 'x'.repeat(1025) },
  ]) {
    const response = await request('login', { method: 'POST', body, cookie: session.cookie });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials.' } });
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.equal((await request('me', { cookie: session.cookie })).status, 200);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM audit_logs WHERE actor_user_id=ANY($1::uuid[])', [[active.id, disabled.id, unsupported.id]])).rows[0].n, before);
}));

test('missing, invalid, expired, revoked, duplicate and disabled-user sessions fail uniformly and clear cookies', () => withApi(async ({ login, request, pool }) => {
  const cases = [undefined, 'eh_session=invalid', `eh_session=${randomBytes(32).toString('base64url')}`];
  for (const mode of ['expired', 'revoked', 'disabled', 'duplicate']) {
    const identity = await fixture();
    const session = await login(identity);
    const hash = sessionHash(Buffer.from(session.token, 'base64url'));
    if (mode === 'expired') await pool.query('UPDATE sessions SET created_at=now()-interval \'9 hours\', expires_at=now()-interval \'1 hour\' WHERE token_hash=$1', [hash]);
    if (mode === 'revoked') await pool.query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1', [hash]);
    if (mode === 'disabled') await pool.query('UPDATE users SET status=\'DISABLED\' WHERE id=$1', [identity.id]);
    cases.push(mode === 'duplicate' ? `${session.cookie}; ${session.cookie}` : session.cookie);
  }
  for (const cookie of cases) for (const path of ['me', 'logout']) {
    const response = await request(path, { cookie, ...(path === 'logout' ? { method: 'POST', body: {} } : {}) });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: { code: 'AUTH_UNAUTHENTICATED', message: 'Authentication required.' } });
    assert.match(response.headers.get('set-cookie'), /eh_session=;.*Max-Age=0; Expires=Thu, 01 Jan 1970/);
  }
}));

test('logout CSRF, rotation/fixation, multi-session isolation and exactly-once revocation audit', () => withApi(async ({ login, request, pool }) => {
  const identity = await fixture();
  const original = await login(identity, `eh_session=${randomBytes(32).toString('base64url')}`);
  const otherDevice = await login(identity);
  for (const csrf of [undefined, 'wrong', randomBytes(32).toString('base64url'), original.json.data.csrfToken + '=']) {
    const response = await request('logout', { method: 'POST', body: {}, cookie: original.cookie, csrf });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(await response.json(), { error: { code: 'AUTH_CSRF_INVALID', message: 'Request verification failed.' } });
  }
  assert.equal((await request('me', { cookie: original.cookie })).status, 200);
  const replacement = await login(identity, original.cookie);
  assert.notEqual(replacement.token, original.token);
  assert.notEqual(replacement.json.data.csrfToken, original.json.data.csrfToken);
  assert.equal((await request('me', { cookie: original.cookie })).status, 401);
  assert.equal((await request('me', { cookie: otherDevice.cookie })).status, 200);
  const responses = await Promise.all([1, 2].map(() => request('logout', { method: 'POST', body: {}, cookie: replacement.cookie, csrf: replacement.json.data.csrfToken })));
  assert.deepEqual(responses.map(response => response.status).sort(), [204, 401]);
  for (const response of responses) assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await request('me', { cookie: replacement.cookie })).status, 401);
  assert.equal((await request('me', { cookie: otherDevice.cookie })).status, 200);
  const rows = (await pool.query('SELECT * FROM sessions WHERE user_id=$1', [identity.id])).rows;
  assert.equal(rows.length, 3);
  assert.equal(rows.filter(row => row.revoked_at).length, 2);
  const audit = (await pool.query('SELECT action_type,entity_id,safe_metadata FROM audit_logs WHERE actor_user_id=$1', [identity.id])).rows;
  assert.equal(audit.filter(row => row.action_type === 'AUTH_LOGIN').length, 3);
  assert.equal(audit.filter(row => row.action_type === 'AUTH_SESSION_REVOKED').length, 2);
  assert.ok(audit.every(row => Object.keys(row.safe_metadata).length === 0));
}));

test('login CSRF rejects hostile origins/simple forms and accepts trusted same-site or absent metadata', () => withApi(async ({ login, request }) => {
  const identity = await fixture();
  for (const headers of [
    { Origin: 'https://evil.invalid' }, { Origin: 'null' }, { Origin: '' }, { Origin: `${origin}.evil.invalid` },
    { 'X-EH-Login': '' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'unknown' },
    { Origin: 'https://evil.invalid', 'Sec-Fetch-Site': 'same-origin' },
    { Origin: 'https://evil.invalid', 'Sec-Fetch-Site': 'same-site' },
  ]) {
    const response = await request('login', { method: 'POST', body: { email: identity.email, password }, headers });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
    assert.equal((await request('login', { method: 'POST', body: '{}', headers: { 'Content-Type': type } })).status, 415);
  }
  assert.equal((await request('login', { method: 'POST', body: '{malformed' })).status, 400);
  assert.equal((await request('login', { method: 'POST', body: { email: identity.email, password: 'x'.repeat(17000) } })).status, 413);
  for (const site of ['same-site', 'same-origin']) await login(identity, undefined, { 'Sec-Fetch-Site': site });
  const session = await login(identity);
  const hostileLogout = await request('logout', { method: 'POST', body: {}, cookie: session.cookie, csrf: session.json.data.csrfToken, headers: { Origin: 'https://evil.invalid' } });
  assert.equal(hostileLogout.status, 403);
  assert.equal((await request('me', { cookie: session.cookie })).status, 200);
  const options = await request('login', { method: 'OPTIONS', headers: { Origin: 'https://evil.invalid', 'Access-Control-Request-Headers': 'x-eh-login' } });
  assert.equal(options.headers.get('access-control-allow-origin'), null);
}));

test('production session cookie is host-only Secure and can be cleared with matching attributes', () => withApi(async ({ login, request }) => {
  const identity = await fixture();
  const session = await login(identity);
  assert.match(session.setCookie, /^__Host-eh_session=.*; Path=\/; HttpOnly; Secure; SameSite=Lax;/);
  assert.doesNotMatch(session.setCookie, /Domain=/);
  const response = await request('logout', { method: 'POST', body: {}, cookie: session.cookie, csrf: session.json.data.csrfToken });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('set-cookie'), /^__Host-eh_session=; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=0;/);
}, true));

test('database failures are sanitized and never clear an existing cookie or expose/log driver secrets', async () => {
  const secret = 'driver-secret-password-token';
  const output = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...args) => output.push(args.join(' '));
  console.log = (...args) => output.push(args.join(' '));
  try {
    await withApi(async ({ request }) => {
      for (const path of ['me', 'login']) {
        const response = await request(path, { cookie: `eh_session=${randomBytes(32).toString('base64url')}`,
          ...(path === 'login' ? { method: 'POST', body: { email: 'valid@example.invalid', password } } : {}) });
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Service unavailable.' } });
        assert.equal(response.headers.get('set-cookie'), null);
      }
    }, false, { credentials: async () => { throw new Error(secret); }, resolve: async () => { throw new Error(secret); } });
    assert.equal(output.join('').includes(secret), false);
  } finally { console.error = originalError; console.log = originalLog; }
});

test('session database constraints enforce hash, chronology, uniqueness and RESTRICT', () => withTransaction(async connection => {
  const owner = await user(connection, 'ADMIN');
  const hash = randomBytes(32).toString('hex');
  const insert = 'INSERT INTO sessions(user_id,token_hash,created_at,expires_at,revoked_at) VALUES ($1,$2,$3,$4,$5)';
  const now = new Date();
  const later = new Date(now.getTime() + 10000);
  await connection.query(insert, [owner.id, hash, now, later, null]);
  await rejectsConstraint(connection, insert, [owner.id, hash, now, later, null], '23505', 'sessions_token_hash_key');
  for (const bad of ['a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64)]) await rejectsConstraint(connection, insert, [owner.id, bad, now, later, null], '23514', 'sessions_token_hash_format_check');
  await rejectsConstraint(connection, insert, [owner.id, randomBytes(32).toString('hex'), now, now, null], '23514', 'sessions_expiry_check');
  await rejectsConstraint(connection, insert, [owner.id, randomBytes(32).toString('hex'), now, later, new Date(now.getTime() - 1)], '23514', 'sessions_revocation_check');
  await rejectsConstraint(connection, insert, [randomUUID(), randomBytes(32).toString('hex'), now, later, null], '23503', 'sessions_user_fkey');
  await rejectsConstraint(connection, 'DELETE FROM users WHERE id=$1', [owner.id], '23001', 'sessions_user_fkey');
}));

test('transactional login rejects stale verified hashes and disabled status at commit', async () => {
  const identity = await fixture();
  const store = createAuthPersistence(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const input = { userId: identity.id, verifiedHash: encoded + 'wrong', tokenHash: randomBytes(32).toString('hex'), previousHash: null };
    assert.equal(await store.createSession(input), null);
    await pool.query('UPDATE users SET status=\'DISABLED\' WHERE id=$1', [identity.id]);
    assert.equal(await store.createSession({ ...input, verifiedHash: encoded }), null);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1', [identity.id])).rows[0].n, 0);
  } finally { await store.close(); await pool.end(); }
});

test('Express path variants cannot bypass login CSRF or auth no-store headers', () => withApi(async ({ login, request }) => {
  const identity = await fixture();
  for (const path of ['login/', 'LOGIN', 'LOGIN/']) {
    const response = await request(path, { method: 'POST', body: { email: identity.email, password }, headers: { Origin: 'https://evil.invalid', 'X-EH-Login': '' } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const session = await login(identity);
  for (const path of ['me/', 'ME', 'ME/']) {
    const response = await request(path, { cookie: session.cookie });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
}));

test('concurrent replacement/logout serialize without deadlocks or duplicate revocation events', () => withApi(async ({ login, request, pool }) => {
  const identity = await fixture();
  for (let i = 0; i < 8; i++) {
    const session = await login(identity);
    const [replacement, logout] = await Promise.all([
      request('login', { method: 'POST', body: { email: identity.email, password }, cookie: session.cookie }),
      request('logout', { method: 'POST', body: {}, cookie: session.cookie, csrf: session.json.data.csrfToken }),
    ]);
    assert.equal(replacement.status, 200);
    assert.ok([204, 401].includes(logout.status));
    const sessionId = (await pool.query('SELECT id FROM sessions WHERE token_hash=$1', [sessionHash(Buffer.from(session.token, 'base64url'))])).rows[0].id;
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM audit_logs WHERE entity_id=$1 AND action_type='AUTH_SESSION_REVOKED'", [sessionId])).rows[0].n, 1);
  }
}));

test('audit failure rolls back creation, replacement and revocation in an isolated database', async () => {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = `eh006_atomic_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${name}`;
  let pool;
  let store;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    pool = new Pool({ connectionString: url.toString() });
    for (const migration of ['20261012200810_eh005_identity_core_foundation', '20261013014000_eh006_auth_sessions']) {
      await pool.query(await readFile(`packages/db/prisma/migrations/${migration}/migration.sql`, 'utf8'));
    }
    const identity = (await pool.query(`INSERT INTO users(email,password_hash,role) VALUES ('atomic@example.invalid',$1,'ADMIN') RETURNING *`, [encoded])).rows[0];
    store = createAuthPersistence(url.toString());
    const originalHash = randomBytes(32).toString('hex');
    const input = { userId: identity.id, verifiedHash: encoded, tokenHash: originalHash, previousHash: null };
    const principal = await store.createSession(input);
    await pool.query(`CREATE FUNCTION reject_test_auth_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END $$;
      CREATE TRIGGER test_auth_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_test_auth_audit()`);
    const before = (await pool.query('SELECT * FROM sessions ORDER BY id')).rows;
    await assert.rejects(store.createSession({ ...input, tokenHash: randomBytes(32).toString('hex') }));
    await assert.rejects(store.createSession({ ...input, tokenHash: randomBytes(32).toString('hex'), previousHash: originalHash }));
    await assert.rejects(store.revoke(originalHash));
    assert.deepEqual((await pool.query('SELECT * FROM sessions ORDER BY id')).rows, before);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM audit_logs')).rows[0].n, 1);
    assert.equal((await store.resolve(originalHash)).sessionId, principal.sessionId);
  } finally {
    if (store) await store.close();
    if (pool) await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.end();
  }
});
