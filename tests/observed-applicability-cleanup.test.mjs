import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Execute the actual entry source with synthetic imports, never a production
// fault-injection hook. Each child has its own VM and process exit status.
const harness = String.raw`
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
const scenario = JSON.parse(process.argv[1]);
const calls = [], output = [];
const fail = name => {
  calls.push(name);
  if (scenario.failures.includes(name)) throw new Error('CANARY_DRIVER_SQL_PAYLOAD');
};
const password = { toString: () => 'synthetic', fill: () => fail('zeroize') };
const context = vm.createContext({ URL, process: { env: {}, exitCode: 0 },
  console: { log: (...args) => output.push(args), error: (...args) => output.push(args) },
  fetch: async url => {
    if (url.endsWith('/logout')) { fail('logout'); return { status: 204 }; }
    return { status: 200, json: async () => ({ data: { csrfToken: 'synthetic' } }),
      headers: { get: () => 'session=c3ludGhldGlj; HttpOnly' } };
  },
});
class Pool { async end() { fail('pool'); } }
class PrismaClient {
  async $queryRaw() { return [{ count: 0 }]; }
  async $disconnect() { fail('disconnect'); }
}
const demo = {
  inspectIdentities: async () => {
    if (scenario.operationalFailure) throw new Error('CANARY_OPERATION_SOURCE_PAYLOAD');
    return { identities: [{ key: 'patient-a', role: 'PATIENT', profileId: 'patient-a' }] };
  },
  close: async () => fail('demo'),
};
const applicability = {
  close: async () => fail('applicability'),
  getObservedApplicabilitySnapshots: async (_principal, input) => {
    const first = input.effectiveAt === '2026-03-01T08:00:00.000Z';
    return { ...input, snapshots: [{}, {}], nonRetractedSnapshotIds: first ? ['a'] : ['a', 'b'],
      tupleComparison: first ? 'IDENTICAL_TUPLES' : 'DIFFERING_TUPLES',
      differingTupleSnapshotIds: first ? [] : ['a', 'b'] };
  },
};
const imports = {
  // Synthetic responses cross VM realms; compare their JSON values, not prototypes.
  'node:assert/strict': { default: Object.assign((...args) => assert(...args), assert, {
    deepEqual: (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))),
  }) }, 'node:buffer': { Buffer },
  'node:module': { createRequire: () => name => name === 'pg' ? { Pool } : { PrismaPg: class {} } },
  '../packages/db/dist/generated/prisma/client.js': { PrismaClient },
  '../packages/db/dist/index.js': {
    createDemoPersistence: () => demo,
    createAuthPersistence: () => ({ resolve: async () => ({}), close: async () => fail('auth') }),
    createObservedApplicabilityPersistence: () => applicability,
    ObservedApplicabilityError: class extends Error {},
  },
  './lib/m1-demo.mjs': { demoConfiguration: () => ({ databaseUrl: 'synthetic', password }),
    verificationConfiguration: () => ({ base: 'http://synthetic', origin: 'http://synthetic' }),
    passwordCheck: () => null },
  '../apps/api/dist/auth.js': { sessionHash: () => null },
  './lib/observed-applicability-fixture.mjs': { applyObservedApplicabilityFixtureTransaction:
    async () => ({ success: true, snapshotCount: 4, retractionCount: 1 }) },
};
const path = new URL('./scripts/verify-observed-applicability-runtime.mjs', 'file://' + process.cwd() + '/');
const entry = new vm.SourceTextModule(await readFile(path, 'utf8'), { context,
  initializeImportMeta: meta => { meta.url = path.href; } });
await entry.link(specifier => {
  const values = imports[specifier];
  assert.ok(values, 'Unexpected runtime import: ' + specifier);
  return new vm.SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
});
let rejection = null;
try { await entry.evaluate(); } catch (error) { rejection = String(error.stack); }
console.log(JSON.stringify({ calls, output, rejection, exitCode: context.process.exitCode }));
process.exitCode = rejection ? 2 : context.process.exitCode;
`;

const cleanupOrder = ['zeroize', 'applicability', 'auth', 'demo', 'disconnect', 'pool'];
const scenarios = [
  { name: 'successful cleanup', failures: [] },
  { name: 'applicability close rejection', failures: ['applicability'] },
  { name: 'Prisma disconnect rejection', failures: ['disconnect'] },
  { name: 'multiple cleanup rejections', failures: ['applicability', 'auth', 'demo', 'disconnect', 'pool'] },
  { name: 'operational failure plus cleanup rejection', failures: ['applicability', 'disconnect'], operationalFailure: true },
  { name: 'synchronous password zeroization failure', failures: ['zeroize'] },
  { name: 'logout failure remains sanitized', failures: ['logout'] },
];
for (const scenario of scenarios) test(`EH-015 actual runtime cleanup: ${scenario.name}`, () => {
  const child = spawnSync(process.execPath,
    ['--experimental-vm-modules', '--disable-warning=ExperimentalWarning', '--input-type=module', '-e', harness, JSON.stringify(scenario)],
    { encoding: 'utf8', timeout: 10000 });
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.doesNotMatch(child.stdout + child.stderr, /CANARY|Error:|\bat .*:\d+:\d+/);
  assert.equal(child.stderr, '');
  const result = JSON.parse(child.stdout);
  assert.equal(result.rejection, null, 'entry module must contain cleanup rejections');
  assert.deepEqual(result.calls, scenario.operationalFailure ? cleanupOrder : ['logout', ...cleanupOrder]);
  const expected = [[scenario.operationalFailure ? 'APPLICABILITY_RUNTIME_FAILED' : 'EH-015 observed applicability runtime PASS']];
  if (scenario.failures.includes('logout')) expected.push(['APPLICABILITY_RUNTIME_LOGOUT_FAILED']);
  for (const step of cleanupOrder) if (scenario.failures.includes(step)) expected.push(['APPLICABILITY_RUNTIME_CLEANUP_FAILED']);
  assert.deepEqual(result.output, expected, 'only deterministic fixed diagnostics may be emitted');
  const exitCode = scenario.operationalFailure || scenario.failures.length ? 1 : 0;
  assert.equal(result.exitCode, exitCode);
  assert.equal(child.status, exitCode, 'real subprocess must retain the nonzero runtime status');
});
