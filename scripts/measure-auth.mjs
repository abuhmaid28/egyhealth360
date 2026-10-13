import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { hashPassword, verifyPassword, createPasswordVerifier } from '../apps/api/dist/password.js';
import { createAuthPersistence, createDatabase, createPersistence } from '../packages/db/dist/index.js';
import { authConfiguration } from '../packages/config/dist/index.js';
import { createApp } from '../apps/api/dist/app.js';

// Explicit validation workflow, synthetic fixture only; never outputs credentials.
assert.equal(process.version, 'v24.21.0');
const sampleCount = 20;
const password = Buffer.from(randomBytes(32).toString('base64url'), 'utf8');
const startup = performance.now();
const verifier = await createPasswordVerifier();
const startupMs = performance.now() - startup;
const encoded = await hashPassword(password);
const summary = values => {
  const ordered = [...values].sort((a, b) => a - b);
  const round = n => Math.round(n * 100) / 100;
  return { samples: values.length, medianMs: round(ordered[Math.floor(values.length / 2)]), p95Ms: round(ordered[Math.ceil(values.length * 0.95) - 1]), maxMs: round(ordered.at(-1)) };
};
async function measure(operation) {
  await operation();
  const values = [];
  for (let i = 0; i < sampleCount; i++) {
    const start = performance.now();
    await operation();
    values.push(performance.now() - start);
  }
  return summary(values);
}
const timings = {
  hash: await measure(() => hashPassword(password)),
  verify: await measure(async () => assert.equal(await verifyPassword(password, encoded), true)),
  wrongPassword: await measure(async () => assert.equal(await verifyPassword(Buffer.from('wrong'), encoded), false)),
  dummy: await measure(async () => assert.equal(await verifier.verify(password, undefined), false)),
};
const persistence = createPersistence(process.env.DATABASE_URL);
const store = createAuthPersistence(process.env.DATABASE_URL);
const database = createDatabase(process.env.DATABASE_URL);
const config = authConfiguration({ NODE_ENV: 'test', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
const identity = await persistence.createUser({ email: `${randomUUID()}@example.invalid`, role: 'ADMIN', passwordHash: encoded });
let started = 0;
let notifyStarted;
const fourStarted = new Promise(resolve => { notifyStarted = resolve; });
const app = await createApp(database, { store, config, passwords: {
  async verify(...args) {
    started++;
    if (started === 4) notifyStarted();
    return verifier.verify(...args);
  },
} });
try {
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  const beforeRssMiB = process.memoryUsage().rss / 1024 / 1024;
  const requests = [];
  const start = performance.now();
  const logins = Promise.all(Array.from({ length: 4 }, async () => {
    const begin = performance.now();
    const response = await fetch(`${url}/api/v1/auth/login`, { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json', 'X-EH-Login': '1' }, body: JSON.stringify({ email: identity.email, password: password.toString('utf8') }) });
    assert.equal(response.status, 200);
    await response.arrayBuffer();
    requests.push(performance.now() - begin);
  }));
  // Wait until all four HTTP requests have entered actual password verification.
  await fourStarted;
  const healthStart = performance.now();
  const health = await fetch(`${url}/api/v1/health`);
  assert.equal(health.status, 200);
  const healthMs = performance.now() - healthStart;
  await logins;
  const concurrentMs = performance.now() - start;
  console.log(JSON.stringify({
    node: process.version, openssl: process.versions.openssl, platform: process.platform, arch: process.arch,
    resourceLimits: {
      cgroupMemoryMax: await readFile('/sys/fs/cgroup/memory.max', 'utf8').then(value => value.trim()).catch(() => 'unavailable'),
      cgroupCpuMax: await readFile('/sys/fs/cgroup/cpu.max', 'utf8').then(value => value.trim()).catch(() => 'unavailable'),
    },
    policy: { memoryKiB: 65536, passes: 3, parallelism: 1, saltBytes: 16, keyBytes: 32 },
    startupDummyMs: Math.round(startupMs * 100) / 100, ...timings,
    fourConcurrentHttpLogins: { ...summary(requests), batchMs: Math.round(concurrentMs * 100) / 100 },
    healthDuringLoginsMs: Math.round(healthMs * 100) / 100,
    beforeConcurrentRssMiB: Math.round(beforeRssMiB * 100) / 100,
    peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024 * 100) / 100,
  }, null, 2));
} finally { await app.close(); await store.close(); await database.close(); await persistence.close(); }
