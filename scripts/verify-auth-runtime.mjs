import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPersistence } from '../packages/db/dist/index.js';
import { hashPassword } from '../apps/api/dist/password.js';

// Probe the actual running API, never seed demo credentials or print cookies.
const password = randomBytes(32).toString('base64url');
const persistence = createPersistence(process.env.DATABASE_URL);
try {
  const user = await persistence.createUser({ email: `${randomUUID()}@example.invalid`, role: 'ADMIN', passwordHash: await hashPassword(Buffer.from(password)) });
  const base = `http://localhost:${process.env.API_PORT ?? 3001}/api/v1`;
  const headers = { Origin: process.env.AUTH_BROWSER_ORIGIN, 'Content-Type': 'application/json', 'X-EH-Login': '1' };
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: user.email, password }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  const body = await login.json();
  assert.equal(body.data.user.id, user.id);
  const me = await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), body);
  const logout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { ...headers, Cookie: cookie, 'X-CSRF-Token': body.data.csrfToken }, body: '{}' });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await fetch(`${base}/health`)).status, 200);
  console.log('Running Docker API login/me/CSRF logout/invalidation/health verified');
} finally { await persistence.close(); }
