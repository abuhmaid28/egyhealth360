import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import { createDemoPersistence, DEMO_FIXTURES, DEMO_DATASET, DemoStateError } from '../../packages/db/dist/index.js';
import { hashPassword, parsePasswordHash, verifyPassword } from '../../apps/api/dist/password.js';
import { authConfiguration, positiveInteger } from '../../packages/config/dist/index.js';

export function demoConfiguration(env) {
  if (env.EH_DEMO_SEED_ENABLED !== '1' || !['development', 'test'].includes(env.NODE_ENV)) throw new Error('DEMO_CONFIG_INVALID');
  const password = typeof env.EH_DEMO_PASSWORD === 'string' ? Buffer.from(env.EH_DEMO_PASSWORD, 'utf8') : Buffer.alloc(0);
  if (password.length < 16 || password.length > 1024 || /^\s*$/u.test(password.toString('utf8'))) { password.fill(0); throw new Error('DEMO_CONFIG_INVALID'); }
  try {
    const url = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(url.hostname) || !url.pathname || url.pathname === '/') throw new Error();
    // libpq query parameters must not override the approved hostname/topology.
    if (url.search || url.hash) throw new Error();
    return { password, databaseUrl: env.DATABASE_URL };
  } catch { password.fill(0); throw new Error('DEMO_CONFIG_INVALID'); }
}

export function verificationConfiguration(env) {
  const auth = authConfiguration(env);
  const url = new URL(env.M1_API_BASE_URL ?? `http://127.0.0.1:${positiveInteger(env.API_PORT, 3001)}`);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('DEMO_CONFIG_INVALID');
  // Explicit loopback URL only; never infer Origin from listener or forwarded headers.
  if (isIP(url.hostname) && url.hostname !== '127.0.0.1') throw new Error('DEMO_CONFIG_INVALID');
  return { origin: auth.origin, cookieName: auth.cookieName, base: url.origin };
}

export function passwordCheck(password) {
  return async encoded => parsePasswordHash(encoded) !== null && await verifyPassword(password, encoded);
}
export async function seedDemo(store, password, { requireExisting = false } = {}) {
  const newPasswordHashes = {};
  for (const fixture of DEMO_FIXTURES) newPasswordHashes[fixture.key] = await hashPassword(password);
  return store.seedIdentities({ newPasswordHashes, acceptsExistingHash: passwordCheck(password), ...(requireExisting ? { requireExisting: true } : {}) });
}
export function safeFailure(error, fallback = 'DEMO_SERVICE_UNAVAILABLE') {
  const code = error instanceof DemoStateError ? error.code : ['DEMO_CONFIG_INVALID', 'M1_HTTP_FAILED', 'M1_CLEANUP_FAILED', 'M1_REPEAT_FAILED'].includes(error?.message) ? error.message : fallback;
  return { error: { code, ...(error instanceof DemoStateError && error.fixture ? { fixture: error.fixture } : {}) } };
}
export async function seedCommand(env) {
  const config = demoConfiguration(env);
  const store = createDemoPersistence(config.databaseUrl);
  try {
    const result = await seedDemo(store, config.password);
    return { dataset: DEMO_DATASET, result: 'PASS', created: result.created };
  } finally { config.password.fill(0); await store.close(); }
}
