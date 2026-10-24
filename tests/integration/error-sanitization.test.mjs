import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { isolatedOrganizations } from '../support/organizations.mjs';
import { createApp } from '../../apps/api/dist/app.js';
import { createPasswordVerifier } from '../../apps/api/dist/password.js';
import { patientEntryRuntime } from '../../apps/api/dist/patient-entry.js';
import { createDatabase, createPatientEntryPersistence, createBloodPressureMeasurementPersistence } from '../../packages/db/dist/index.js';
import { authConfiguration } from '../../packages/config/dist/index.js';

const invalid = { error: { code: 'REQUEST_INVALID', message: 'Invalid request.' } };
const tooLarge = { error: { code: 'REQUEST_TOO_LARGE', message: 'Request too large.' } };
const snapshot = async pool => (await pool.query(`SELECT
 (SELECT count(*) FROM users) users, (SELECT count(*) FROM patient_profiles) profiles,
 (SELECT count(*) FROM sessions) sessions, (SELECT count(*) FROM audit_logs) audits,
 (SELECT count(*) FROM blood_pressure_measurements) bp,
 (SELECT count(*) FROM follow_up_appointments) appointments,
 (SELECT count(*) FROM clinical_encounters) encounters`)).rows;

async function withHttp(t, run) {
  const output = [];
  // Nest is deliberately configured with logger:false. Capture both streams as
  // well as exercising errors, so a newly introduced console/log path fails.
  for (const stream of [process.stdout, process.stderr]) {
    const write = stream.write;
    t.mock.method(stream, 'write', function(chunk, ...args) {
      output.push(String(chunk)); return write.call(this, chunk, ...args);
    });
  }
  try {
    await isolatedOrganizations(async f => {
      const database = createDatabase(f.url), entry = createPatientEntryPersistence(f.url), bp = createBloodPressureMeasurementPersistence(f.url);
      const config = authConfiguration({ NODE_ENV: 'test', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
      const runtime = patientEntryRuntime(entry);
      const app = await createApp(database, { config, store: f.auth, passwords: await createPasswordVerifier() }, undefined, bp, undefined, runtime);
      try {
        await app.listen(0, '127.0.0.1');
        const send = async (path, body, headers = {}, method = 'POST') => {
          const response = await fetch((await app.getUrl()) + '/api/v1' + path, { method,
            headers: { Origin: config.origin, 'Content-Type': 'application/json', ...headers },
            ...(body === undefined ? {} : { body }), signal: globalThis.AbortSignal.timeout(8000) });
          return { response, text: await response.text() };
        };
        const login = async (key = 'patient') => {
          const { response, text } = await send('/auth/login', JSON.stringify({ email: f.users[key].email, password: f.password }), { 'X-EH-Login': '1' });
          assert.equal(response.status, 200);
          return { Cookie: response.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token': JSON.parse(text).data.csrfToken };
        };
        await run({ ...f, runtime, send, login });
      } finally { await app.close(); await entry.close(); await bp.close(); await database.close(); }
    });
    assert.doesNotMatch(output.join(''), /EHSECRET_|SyntaxError|Unexpected token|Unexpected end of JSON/);
  } finally { t.mock.restoreAll(); }
}
function expect(result, status, body) {
  assert.equal(result.response.status, status);
  assert.deepEqual(JSON.parse(result.text), body);
  assert.doesNotMatch(result.text, /EHSECRET_|SyntaxError|Unexpected token|JSON at position|stack|passwordHash|Prisma/);
  assert.equal(result.response.headers.get('set-cookie'), null);
}

test('parser security: actual guarded login never reflects malformed JSON, changes session, or writes audit/logs', t => withHttp(t, async f => {
  const headers = { ...await f.login(), 'X-EH-Login': '1' };
  const before = await snapshot(f.pool);
  const sessions = (await f.pool.query('SELECT id,revoked_at,expires_at FROM sessions ORDER BY id')).rows;
  for (const raw of [`EHSECRET_LOGIN_${randomUUID()}`, `{"password":"EHSECRET_LOGIN_${randomUUID()}"`]) {
    expect(await f.send('/auth/login', raw, headers), 400, invalid);
    expect(await f.send('/auth/login', gzipSync(raw), { ...headers, 'Content-Encoding': 'gzip' }), 400, invalid);
  }
  assert.deepEqual(await snapshot(f.pool), before);
  assert.deepEqual((await f.pool.query('SELECT id,revoked_at,expires_at FROM sessions ORDER BY id')).rows, sessions);
}));

test('parser security: guarded registration rejects malformed JSON with zero identity/profile/session/audit/hash effects', t => withHttp(t, async f => {
  const before = await snapshot(f.pool); let hashes = 0;
  f.runtime.hash = async () => { hashes++; throw new Error('must not hash malformed input'); };
  for (const raw of [`EHSECRET_REGISTER_${randomUUID()}`, `{"displayName":"EHSECRET_REGISTER_${randomUUID()}"`]) {
    expect(await f.send('/auth/register', raw, { 'X-EH-Register': '1' }), 400, invalid);
  }
  assert.equal(hashes, 0); assert.deepEqual(await snapshot(f.pool), before);
}));

test('parser security: authenticated logout and BP mutations reject malformed JSON with zero partial writes/audits', t => withHttp(t, async f => {
  const headers = await f.login(), before = await snapshot(f.pool);
  const sessions = (await f.pool.query('SELECT id,revoked_at FROM sessions ORDER BY id')).rows;
  // Logout reaches the shared global parser/filter; BP retains its existing
  // route-specific parser ahead of it. Both use genuine authenticated headers.
  for (const path of ['/auth/logout', `/patients/${f.users.patient.profileId}/blood-pressure-measurements`]) {
    expect(await f.send(path, `EHSECRET_PROTECTED_${randomUUID()}`, headers), 400, invalid);
  }
  assert.deepEqual(await snapshot(f.pool), before);
  assert.deepEqual((await f.pool.query('SELECT id,revoked_at FROM sessions ORDER BY id')).rows, sessions);
}));

test('parser security: framework inflated/raw and route-boundary size failures remain sanitized 413; unknown GET/HEAD remain safe 404', t => withHttp(t, async f => {
  const before = await snapshot(f.pool), raw = `EHSECRET_SIZE_${randomUUID()}` + 'x'.repeat(16385);
  for (const [body, headers] of [[raw, {}], [gzipSync(raw), { 'Content-Encoding': 'gzip' }]]) {
    expect(await f.send('/auth/login', body, { 'X-EH-Login': '1', ...headers }), 413, tooLarge);
  }
  expect(await f.send('/auth/register', raw, { 'X-EH-Register': '1' }), 413, tooLarge);
  for (const method of ['GET', 'HEAD']) {
    const result = await f.send('/unknown-EHSECRET_ROUTE_' + randomUUID(), undefined, {}, method);
    assert.equal(result.response.status, 404);
    if (method === 'HEAD') assert.equal(result.text, '');
    else expect(result, 404, { error: { code: 'ROUTE_NOT_FOUND', message: 'Not found.' } });
  }
  assert.deepEqual(await snapshot(f.pool), before);
}));

test('parser security: real invalid credentials, Origin denial, protected-object masking and registration throttling preserve app errors', t => withHttp(t, async f => {
  const before = await snapshot(f.pool);
  expect(await f.send('/auth/login', JSON.stringify({ email: f.users.patient.email, password: 'wrong synthetic' }), { 'X-EH-Login': '1' }), 401, { error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials.' } });
  expect(await f.send('/auth/login', '{}', { 'X-EH-Login': '1', Origin: 'https://evil.invalid' }), 403, { error: { code: 'AUTH_CSRF_INVALID', message: 'Request verification failed.' } });
  assert.deepEqual(await snapshot(f.pool), before);
  const admin = await f.login('admin');
  expect(await f.send('/me/profile', undefined, admin, 'GET'), 404, { error: { code: 'PATIENT_NOT_FOUND', message: 'Not found.' } });
  for (let i = 0; i < 30; i++) f.runtime.budget.acquire()();
  const afterLogin = await snapshot(f.pool);
  expect(await f.send('/auth/register', JSON.stringify({ email: `${randomUUID()}@example.invalid`, password: 'synthetic', displayName: 'Synthetic' }), { 'X-EH-Register': '1' }), 429, { error: { code: 'REGISTRATION_BUSY', message: 'Registration temporarily unavailable.' } });
  assert.deepEqual(await snapshot(f.pool), afterLogin);
}));
