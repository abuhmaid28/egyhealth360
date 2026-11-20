import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { argon2, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { hashPassword, parsePasswordHash, verifyPassword, createPasswordVerifier, canonicalBytes } from '../apps/api/dist/password.js';
import { authConfiguration } from '../packages/config/dist/index.js';
import { sessionCookie, sessionCredential, sessionHash, csrfToken } from '../apps/api/dist/auth.js';

test('pinned runtime Argon2id matches independent RFC 9106 known-answer vector', async () => {
  assert.equal(process.version, 'v24.21.0');
  const key = await promisify(argon2)('argon2id', {
    message: Buffer.alloc(32, 1), nonce: Buffer.alloc(16, 2), secret: Buffer.alloc(8, 3),
    associatedData: Buffer.alloc(12, 4), parallelism: 4, tagLength: 32, memory: 32, passes: 3,
  });
  // RFC 9106 section 5.3. Primitive-only vector: application policy rejects these parameters.
  assert.equal(key.toString('hex'), '0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659');
});

test('strict 109-byte application codec round trips and verifies unmodified UTF-8 passwords', async () => {
  const password = Buffer.from(`  Sécret\u0000${randomBytes(16).toString('hex')}  `);
  const encoded = await hashPassword(password);
  const other = await hashPassword(password);
  assert.equal(Buffer.byteLength(encoded), 109);
  assert.notEqual(encoded, other);
  const parsed = parsePasswordHash(encoded);
  assert.equal(parsed.salt.length, 16);
  assert.equal(parsed.key.length, 32);
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword(Buffer.from('wrong'), encoded), false);
  const salt = parsed.salt.toString('base64url');
  const key = parsed.key.toString('base64url');
  assert.equal(encoded, `eh-pw-v1$argon2id$v=19$m=65536,t=3,p=1$s=${salt}$h=${key}`);
  for (const malformed of [
    encoded + '\n', ' ' + encoded, encoded + '$x=1', encoded.slice(1),
    encoded.replace('eh-pw-v1', 'eh-pw-v2'), encoded.replace('argon2id', 'argon2i'),
    encoded.replace('v=19', 'v=16'), encoded.replace('65536', '65535'), encoded.replace('t=3', 't=4'),
    encoded.replace('p=1', 'p=2'), encoded.replace('m=65536,t=3,p=1', 'p=1,t=3,m=65536'),
    encoded.replace('t=3', 't=03'), encoded.replace('$h=', '$s='), encoded.replace('s=', 'S='),
    encoded.replace(salt, salt + '='), encoded.replace(key, key.slice(0, -1)),
    encoded.replace(salt, '/' + salt.slice(1)), encoded.replace(key, '+' + key.slice(1)),
    // Same decoded bytes but nonzero unused base64 bits must not be accepted.
    encoded.replace(salt, salt.slice(0, -1) + 'B'),
  ]) assert.equal(parsePasswordHash(malformed), null, 'must reject noncanonical format');
  assert.equal(await verifyPassword(password, 'unsupported'), false);
  assert.equal(canonicalBytes('A'.repeat(42) + 'B', 32), null);
});

test('dummy verifier rejects unsupported/nonexistent credentials without substituting an account', async () => {
  const verifier = await createPasswordVerifier();
  const password = randomBytes(32);
  const encoded = await hashPassword(password);
  assert.equal(await verifier.verify(password, encoded), true);
  assert.equal(await verifier.verify(password, undefined), false);
  assert.equal(await verifier.verify(password, 'synthetic-test-hash'), false);
  assert.equal(await verifier.verify(Buffer.from('wrong'), encoded), false);
});

test('auth mode/origin configuration fails closed and describes the browser origin', () => {
  const dev = authConfiguration({ NODE_ENV: 'development', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
  assert.equal(dev.cookieName, 'eh_session');
  const prod = authConfiguration({ NODE_ENV: 'production', AUTH_BROWSER_ORIGIN: 'https://app.example.invalid' });
  assert.equal(prod.cookieName, '__Host-eh_session');
  for (const env of [
    {}, { NODE_ENV: 'test' }, { NODE_ENV: 'unknown', AUTH_BROWSER_ORIGIN: dev.origin },
    ...['http://localhost:3000', 'https://app.invalid/', 'https://user@app.invalid', 'https://app.invalid?x=1', 'https://app.invalid#x', 'https://*.app.invalid', 'invalid'].map(origin => ({ NODE_ENV: 'production', AUTH_BROWSER_ORIGIN: origin })),
    { NODE_ENV: 'development', AUTH_BROWSER_ORIGIN: 'http://external.invalid' },
  ]) assert.throws(() => authConfiguration(env));
});

test('cookie credentials are canonical, duplicated values rejected; cookie flags and clearing exact', () => {
  const bytes = randomBytes(32);
  const token = bytes.toString('base64url');
  const request = value => ({ headers: { cookie: value }, rawHeaders: ['Cookie', value] });
  assert.deepEqual(sessionCredential(request(`other=value; eh_session=${token}`), 'eh_session'), bytes);
  for (const value of [`eh_session=${token}; eh_session=${token}`, `eh_session=${token}=`, `eh_session=${'A'.repeat(42)}B`, `eh_session=${token}%00`]) {
    assert.equal(sessionCredential(request(value), 'eh_session'), null);
  }
  assert.equal(sessionCredential({ headers: { cookie: token }, rawHeaders: ['Cookie', token, 'Cookie', token] }, 'eh_session'), null);
  assert.equal(sessionHash(bytes).length, 64);
  assert.equal(csrfToken(bytes).length, 43);
  assert.notEqual(csrfToken(bytes), token);
  for (const production of [false, true]) {
    const config = { production, cookieName: production ? '__Host-eh_session' : 'eh_session' };
    const expiry = new Date(Date.now() + 28800000);
    const cookie = sessionCookie(config, token, expiry);
    assert.match(cookie, /; Path=\/; HttpOnly;/);
    assert.equal(cookie.includes('; Secure;'), production);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Domain=/);
    assert.equal(cookie.includes(`Expires=${expiry.toUTCString()}`), true);
    assert.match(sessionCookie(config, null), /Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT$/);
  }
});
