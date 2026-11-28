import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { composeOverride, projectAuthText } from '../scripts/test-ui-r11-browser-isolation.mjs';
import {
  APP, APP_FILES, APP_TREE, DOCKER_HOST_ARG, GET_BUDGET, PG_IMAGE,
  checkCleanup, checkCompose, checkSourceHashes, checkWriteLedger, commandOutput, copyCommand, createLedger,
  createObservation, assertOwnedProject, gitEnvironment, gitIn, manifestInput, projectedResponse, requestTarget,
  scanText, sha, sourceProgram, verifyWorkspace,
} from '../scripts/support/r11-browser-isolation.mjs';

const project = 'eh216-q2-0123456789ab';
const origin = 'http://127.0.0.1:32000';
const ports = { api: 32001, web: 32000 };
const sibling = resolve('..', 'application');
const fromGit = () => gitIn(sibling, ['ls-tree', '-rz', '--name-only', APP]).split('\0').filter(Boolean);

test('Git verifies explicit contained clone and rejects foreign repository selection', t => {
  verifyWorkspace(sibling, { expected: APP, tree: APP_TREE });
  const scratch = mkdtempSync(join(tmpdir(), 'r11-git-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const invalid = join(scratch, 'wrong');
  mkdirSync(invalid);
  assert.throws(() => verifyWorkspace(invalid, {}), /WORKSPACE_GIT_DIRECTORY/);
  const alias = join(scratch, 'alias');
  symlinkSync(sibling, alias);
  assert.throws(() => verifyWorkspace(alias, {}), /WORKSPACE_REALPATH/);
  const decoy = { GIT_DIR: '/unrelated', GIT_WORK_TREE: '/unrelated', git_index_file: '/unrelated',
    GIT_CONFIG_COUNT: '1', GIT_OBJECT_DIRECTORY: '/unrelated', PATH: process.env.PATH };
  const env = gitEnvironment(scratch, decoy);
  assert.deepEqual(Object.keys(env).sort(), ['GIT_CEILING_DIRECTORIES', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM',
    'GIT_OPTIONAL_LOCKS', 'PATH']);
  const discovery = spawnSync('git', ['-C', invalid, 'rev-parse', '--show-toplevel'], { cwd: invalid,
    env, encoding: 'utf8', timeout: 5000 });
  assert.notEqual(discovery.status, 0);
  assert.equal(discovery.stdout, '');
});

test('fixed Docker source-copy worker gets only canonical pinned stdin and compares all file bytes', t => {
  const paths = fromGit();
  const id = '0'.repeat(64);
  const { argv, input } = copyCommand(id, paths);
  assert.deepEqual(argv, [DOCKER_HOST_ARG, 'exec', '-i', id, 'node', '-e', sourceProgram()]);
  assert.equal(input, JSON.stringify(paths));
  assert.ok(!argv.includes(input));
  assert.equal(paths.length, APP_FILES);
  const scratch = mkdtempSync(join(tmpdir(), 'r11-copy-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const want = Object.fromEntries(paths.map((path, index) => {
    const full = join(scratch, path);
    mkdirSync(dirname(full), { recursive: true });
    const value = 'fixture-' + index;
    writeFileSync(full, value);
    return [path, sha(value)];
  }));
  const result = spawnSync(process.execPath, argv.slice(5), { cwd: scratch, input, encoding: 'utf8', timeout: 6000 });
  assert.equal(result.status, 0);
  assert.doesNotThrow(() => checkSourceHashes(result.stdout, want));
  assert.throws(() => checkSourceHashes(result.stdout, { ...want, [paths[0]]: 'wrong' }), /MANIFEST_HASHES/);
  assert.throws(() => checkSourceHashes('<invalid>', want), /MANIFEST_OUTPUT/);
  assert.throws(() => manifestInput(paths.slice(1)), /MANIFEST_COUNT/);
  assert.throws(() => manifestInput(['../x', ...paths.slice(1)]), /MANIFEST_PIN/);
  assert.throws(() => copyCommand('--foreign', paths), /RESOURCE_ID/);
});

test('bounded worker rejects absent, invalid or argv input without displaying diagnostics', () => {
  const complete = JSON.stringify(fromGit());
  for (const [input, argv] of [[undefined, []], ['{"hidden":', []], ['[]', []],
    ['x'.repeat(160001), []], [complete, [complete]]]) {
    const result = spawnSync(process.execPath, ['-e', sourceProgram(), ...argv], { cwd: sibling, input,
      encoding: 'utf8', timeout: 5000 });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

test('command failure and timeout project only fixed fields', () => {
  for (const [fault, kind] of [[null, 'exit'], [{ code: 'ETIMEDOUT', message: 'private-value' }, 'timeout']]) {
    let report;
    assert.throws(() => commandOutput({ status: fault ? null : 1, error: fault, stdout: 'private-value', stderr: 'private-value' },
      'docker', 'SOURCE_COPY', value => { report = value; }), /BOUNDED_COMMAND_FAILED/);
    assert.deepEqual(report, { tool: 'docker', operation: 'SOURCE_COPY', exit: fault ? null : 1, kind });
  }
});

test('rejects unowned projects, extra ports, volumes, privileges and networks', () => {
  const network = { default: null };
  const app = { image: project + ':local', networks: network };
  const mapping = (published, target) => [{ host_ip: '127.0.0.1', published, target }];
  const config = {
    name: project, networks: { default: { name: project + '_default' } }, services: {
      api: { ...app, ports: mapping(ports.api, 3001), build: { args: { EH_UI_API_ORIGIN: 'http://api:3001' } } },
      web: { ...app, ports: mapping(ports.web, 3000) }, worker: app,
      postgres: { image: PG_IMAGE, networks: network, volumes: [{ type: 'tmpfs', target: '/var/lib/postgresql' }] },
    },
  };
  assert.match(composeOverride(project, ports), /host_ip: 127\.0\.0\.1/);
  assert.doesNotThrow(() => checkCompose(config, project, ports));
  assert.throws(() => assertOwnedProject('different-project'), /RESOURCE_PROJECT/);
  for (const altered of [{ privileged: true }, { networks: network, volumes: [{ type: 'bind' }] },
    { ports: [{ host_ip: '0.0.0.0', target: 3000, published: ports.web }] }, { networks: { other: null } }]) {
    assert.throws(() => checkCompose({ ...config, services: { ...config.services, web: { ...config.services.web, ...altered } } },
      project, ports), /COMPOSE_/);
  }
});

test('network and per-case request budgets reject foreign targets and writes', () => {
  assert.equal(requestTarget(origin + '/api/v1/auth/login', origin, 'POST', []), 'login');
  assert.equal(requestTarget(origin + '/api/v1/me/profile', origin, 'GET', []), 'api');
  for (const [url, method] of [[origin + '/api/v1/me/profile', 'PUT'],
    [origin + '/api/v1/unknown', 'GET'], ['http://127.0.0.1:32002/', 'GET'],
    [origin + '/api/v1/auth/logout?extra=1', 'POST']]) {
    assert.throws(() => requestTarget(url, origin, method, []));
  }
  const ledger = createLedger();
  for (let index = 0; index < GET_BUDGET.topology; index++) ledger.get('topology');
  assert.throws(() => ledger.get('topology'), /GET_BUDGET/);
  ledger.auth('accountA', 'login');
  assert.throws(() => ledger.auth('accountA', 'login'), /AUTH_BUDGET/);
  assert.throws(() => ledger.auth('arabic', 'login'), /AUTH_PHASE/);
  for (let i = 0; i < 4; i++) ledger.outage();
  assert.throws(() => ledger.outage(), /OUTAGE_BUDGET/);
});

test('terminal ledger fails on API cancellation, unavailable body and pending observation', async () => {
  const ok = createObservation();
  ok.start('first', true);
  ok.terminal('first', { scanned: true });
  ok.start('second', false);
  ok.terminal('second', { failed: true, cancelled: true });
  await ok.settle(100, 0);
  assert.equal(ok.report().started, 2);
  assert.equal(ok.report().scans, 1);
  assert.equal(ok.report().cancelled, 1);
  const asset = createObservation();
  asset.start('asset', false);
  asset.terminal('asset', { failed: true });
  await assert.rejects(asset.settle(100, 0), /OBSERVER_ASSET_FAILURE/);
  for (const terminal of [{}, { failed: true }]) {
    const failed = createObservation();
    failed.start('api', true);
    failed.terminal('api', terminal);
    await assert.rejects(failed.settle(100, 0), /OBSERVER_API_UNSCANNED/);
    assert.equal(failed.report().scanFailures, 1);
  }
  const pending = createObservation();
  pending.start('api', true);
  await assert.rejects(pending.settle(20, 0), /OBSERVER_PENDING/);
  assert.throws(() => pending.terminal('not-started'), /OBSERVER_UNKNOWN_TERMINAL/);
});

test('response privacy runs before status, cache and shape checks', () => {
  const expected = { expected: 404, type: 'error', markers: ['private-canary'] };
  const correct = { status: 404, cache: 'no-store', text: '{"error":{"code":"PATIENT_NOT_FOUND","message":"Not found."}}' };
  assert.equal(projectedResponse(correct, expected).pass, true);
  for (const broken of [{ status: 200 }, { cache: 'private' }, { text: '{"ignored":{}}' }]) {
    assert.equal(projectedResponse({ ...correct, ...broken }, expected).pass, false);
  }
  assert.throws(() => projectedResponse({ status: 500, text: 'private-canary bad-json' }, expected), /RESPONSE_PRIVACY/);
  assert.equal(scanText('arbitrary prior-profile-canary', ['prior-profile-canary']), false);
  assert.equal(scanText('postgresql://local', []), false);
});

test('only the exact own authentication success field is projected before scanning', () => {
  const actor = { id: 'fixture-a', email: 'fixture-address' };
  const inert = 'x'.repeat(43);
  const raw = JSON.stringify({ data: { user: { ...actor, role: 'PATIENT' },
    session: { expiresAt: 'fixture' }, csrfToken: inert } });
  const secrets = new Set();
  const expected = projectAuthText(raw, '/api/v1/auth/me', 200, actor, secrets);
  assert.equal(expected.valid, true);
  assert.equal(scanText(expected.text, [...secrets]), true);
  for (const [body, status, current] of [[raw, 401, actor], [raw, 200, { id: 'fixture-other' }],
    [raw.replace('"session"', '"csrfToken":"' + inert + '","session"'), 200, actor]]) {
    const result = projectAuthText(body, '/api/v1/auth/me', status, current, secrets);
    assert.equal(result.valid, false);
    assert.equal(scanText(result.text, [...secrets]), false);
  }
});

test('domain writes and cleanup fail closed on a single drifted field', () => {
  const before = { domains: { fixture: 'unchanged' }, sessions: 0, audits: {} };
  const after = { domains: before.domains, sessions: 2, revoked: 2, active: 0, unsafelyAudited: 0,
    audits: { AUTH_LOGIN: 2, AUTH_SESSION_REVOKED: 2 } };
  assert.doesNotThrow(() => checkWriteLedger(before, after));
  assert.throws(() => checkWriteLedger(before, { ...after, domains: { fixture: 'changed' } }), /UNAUTHORIZED_DOMAIN_WRITE/);
  assert.throws(() => checkWriteLedger(before, { ...after, revoked: 1 }), /AUTH_WRITE_LEDGER/);
  const clean = { closed: true, containers: 0, networks: 0, volumes: 0, image: false, imageId: false, portsReleased: true };
  assert.doesNotThrow(() => checkCleanup(clean));
  for (const changed of [{ portsReleased: false }, { containers: 1 }, { imageId: true }, { closed: false }]) {
    assert.throws(() => checkCleanup({ ...clean, ...changed }), /R13_CLEANUP/);
  }
});

function inertAdapter(supply) {
  const source = gitIn(sibling, ['show', APP + ':apps/web/src/lib/api/live.ts']);
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const factory = () => ({ clear() {}, activate() {}, clearCommands() {} });
  class InertPharmacy {
    invalidate() { this.status = 'signed-out'; }
    establishSession() { this.status = 'ready'; }
    snapshot() { return { status: this.status }; }
  }
  const stubs = {
    './pharmacy-live': { PharmacyEngine: InertPharmacy },
    './consultation-close': { createConsultationCloseApi: factory },
    './consultation-opening': { createConsultationOpeningApi: factory },
    './documentation': { createLiveDocumentationApi: factory },
    './follow-up-intents': { createLiveFollowUpApi: factory },
    './live-booking': { createLiveBookingApi: factory },
    './errors': { UiError: Error },
    './availability': {},
  };
  const exports = {};
  runInNewContext(code, { exports, fetch: supply, require: name => {
    assert.ok(Object.hasOwn(stubs, name));
    return stubs[name];
  } }, { timeout: 1000 });
  return exports.createLiveAdapter();
}

for (const status of [200, 401]) {
  test('inert fixture: older result ' + status + ' cannot overwrite newer adapter generation', async () => {
    const payload = name => ({ ok: true, status: 200, json: async () => ({
      data: { user: { id: name, email: name, role: 'PATIENT' }, csrfToken: 'mock-' + name },
    }) });
    let complete;
    const deferred = new Promise(resolveDeferred => { complete = resolveDeferred; });
    let calls = 0;
    const adapter = inertAdapter(async (path, init) => {
      calls++;
      if (calls === 1) { assert.equal(path, '/api/v1/auth/me'); return deferred; }
      if (calls === 2) { assert.equal(init.method, 'POST'); return payload('fixture-new'); }
      assert.equal(path, '/api/v1/auth/me');
      return payload('fixture-new');
    });
    const old = adapter.session();
    assert.equal((await adapter.login('inert-name', 'inert-placeholder')).name, 'fixture-new');
    complete(status === 200 ? payload('fixture-old') : { ok: false, status: 401 });
    assert.equal(await old, null);
    assert.equal(adapter.pharmacyRead.snapshot().status, 'ready');
    assert.equal((await adapter.session()).name, 'fixture-new');
    assert.equal(calls, 3);
  });
}
