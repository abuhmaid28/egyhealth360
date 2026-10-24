import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createApp } from '../apps/api/dist/app.js';
import { authError } from '../apps/api/dist/auth.js';
import { authConfiguration } from '../packages/config/dist/index.js';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { HttpException, BadRequestException } = require('@nestjs/common');
const config = authConfiguration({ NODE_ENV: 'test', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
const invalid = { error: { code: 'REQUEST_INVALID', message: 'Invalid request.' } };

// Existing login/health routes exercise the real Nest filter with a failing
// dependency; no test-only production route or PostgreSQL dependency is needed.
async function withFailure(failure, run) {
  const app = await createApp({ async check() { throw new Error('private dependency detail'); } }, {
    config, passwords: { async verify() { return false; } },
    store: { async credentials() { throw failure; } },
  });
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const send = (path, options = {}) => fetch(base + '/api/v1' + path, options);
    const login = () => send('/auth/login', { method: 'POST', headers: {
      Origin: config.origin, 'X-EH-Login': '1', 'Content-Type': 'application/json',
    }, body: JSON.stringify({ email: 'synthetic@example.invalid', password: 'synthetic' }) });
    await run({ send, login });
  } finally { await app.close(); }
}

for (const [status, code, message] of [
  [400, 'REQUEST_INVALID', 'Invalid request.'],
  [401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials.'],
  [403, 'AUTH_CSRF_INVALID', 'Request verification failed.'],
  [404, 'PATIENT_NOT_FOUND', 'Not found.'],
  [409, 'ENCOUNTER_BP_CONFLICT', 'Association conflict.'],
  [413, 'REQUEST_TOO_LARGE', 'Request too large.'],
  [429, 'REGISTRATION_BUSY', 'Registration temporarily unavailable.'],
  [503, 'AUTH_SERVICE_UNAVAILABLE', 'Service unavailable.'],
]) test(`safe error filter preserves application-owned ${status} envelope`, () => withFailure(authError(status, code, message), async ({ login }) => {
  const response = await login();
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error: { code, message } });
  assert.equal(response.headers.get('set-cookie'), null);
}));

test('safe error filter preserves bounded BP/follow-up field diagnostics', async () => {
  for (const [code, message, field] of [
    ['BP_MEASUREMENT_INVALID', 'Invalid blood pressure measurement.', 'systolic'],
    ['FOLLOW_UP_APPOINTMENT_INVALID', 'Invalid follow-up appointment.', 'scheduledAt'],
  ]) {
    const body = { error: { code, message, fields: [{ field, reason: 'type' }] } };
    await withFailure(new HttpException(body, 400), async ({ login }) => {
      const response = await login(); assert.equal(response.status, 400); assert.deepEqual(await response.json(), body);
    });
  }
});

test('safe error filter rejects framework and malformed lookalike envelopes without reflecting contents', async () => {
  const marker = `EHSECRET_ENVELOPE_${randomUUID()}`;
  const inherited = Object.create({ code: 'REQUEST_INVALID', message: marker });
  const accessor = { code: 'REQUEST_INVALID', get message() { throw new Error(marker); } };
  const hidden = Object.defineProperty({ error: { code: 'REQUEST_INVALID', message: marker } }, 'toJSON', { value: () => ({ raw: marker }) });
  const fieldsWithSerializer = Object.assign([], { toJSON: () => marker });
  for (const body of [
    hidden,
    { error: { code: 'REQUEST_INVALID', message: marker, fields: fieldsWithSerializer } },
    { error: { code: 'REQUEST_INVALID', message: marker, fields: Array(1) } },
    marker, [], { error: marker }, { error: [marker] },
    { message: marker, error: 'Bad Request', statusCode: 400 },
    { error: { code: [], message: marker } }, { error: { code: 'REQUEST_INVALID', message: [marker] } },
    { error: { code: 'REQUEST_INVALID', message: marker, request: marker } },
    { error: { code: 'REQUEST_INVALID', message: marker }, request: marker },
    { error: inherited }, { error: accessor },
    { error: { code: 'REQUEST_INVALID', message: marker, fields: [marker] } },
    { error: { code: 'REQUEST_INVALID', message: marker, fields: [{ field: {}, reason: marker }] } },
    { error: { code: 'REQUEST_INVALID', message: marker, fields: [{ field: '$', reason: 'type', raw: marker }] } },
  ]) await withFailure(new HttpException(body, 400), async ({ login }) => {
    const response = await login(); assert.equal(response.status, 400); assert.deepEqual(await response.json(), invalid);
  });
  await withFailure(new BadRequestException(marker), async ({ login }) => {
    const response = await login(); assert.equal(response.status, 400); assert.deepEqual(await response.json(), invalid);
  });
});

test('safe framework 413/404 and unknown failures preserve generic projections; HEAD has no body', async () => {
  const marker = `EHSECRET_FRAMEWORK_${randomUUID()}`;
  for (const [status, code, message] of [[413, 'REQUEST_TOO_LARGE', 'Request too large.'], [404, 'ROUTE_NOT_FOUND', 'Not found.'], [500, 'AUTH_SERVICE_UNAVAILABLE', 'Service unavailable.']]) {
    await withFailure(new HttpException({ message: marker, error: 'Framework error', statusCode: status }, status), async ({ login }) => {
      const response = await login(); assert.equal(response.status, status === 500 ? 503 : status);
      assert.deepEqual(await response.json(), { error: { code, message } });
    });
  }
  await withFailure(new Error(marker), async ({ send }) => {
    for (const method of ['GET', 'HEAD']) {
      const response = await send('/unknown-' + marker, { method }); assert.equal(response.status, 404);
      assert.equal(await response.text(), method === 'HEAD' ? '' : JSON.stringify({ error: { code: 'ROUTE_NOT_FOUND', message: 'Not found.' } }));
    }
    const health = await send('/health'); assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { error: { code: 'DATABASE_UNAVAILABLE', message: 'Service unavailable' } });
  });
});
