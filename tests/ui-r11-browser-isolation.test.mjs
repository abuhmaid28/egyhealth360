import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { closeInitialBrowser, composeOverride, finishInitialEvidence, projectAuthText, signOutControl } from '../scripts/test-ui-r11-browser-isolation.mjs';
import {
  APP, APP_FILES, APP_TREE, DOCKER_HOST_ARG, GET_BUDGET, PG_IMAGE,
  checkCleanup, checkCompose, checkSourceHashes, checkWriteLedger, commandOutput, copyCommand, createLedger,
  createObservation, assertOwnedProject, gitEnvironment, gitIn, manifestInput, noContentLogout, projectedResponse, requestTarget,
  scanOwnedLogs, scanText, sha, sourceProgram, verifyWorkspace,
  checkInitialApi, checkZeroAuthLedger, classifyInitialRequest, createInitialLedger, initialArguments, initialRequestTarget,
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
  assert.equal(requestTarget(origin + '/api/v1/directory/providers?page=1&pageSize=100', origin, 'GET', []), 'api');
  assert.throws(() => requestTarget(origin + '/api/v1/directory/providers', origin, 'GET', []), /UNAUTHORIZED_API_READ/);
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

const scanStages = [
  'BROWSER_RESPONSE', 'BROWSER_FINISHED', 'RESPONSE_ACQUIRING', 'RESPONSE_ACQUIRED',
  'BODY_ACQUIRING', 'BODY_ACQUIRED', 'SCAN_STARTED', 'SCAN_COMPLETED',
];

test('terminal ledger fails on API cancellation, unavailable body and pending observation', async () => {
  const ok = createObservation();
  ok.start('first', { requestClass: 'ALLOWED_API', method: 'GET' });
  for (const stage of scanStages) ok.event('first', stage);
  ok.terminal('first');
  ok.start('second', { requestClass: 'IMAGE' });
  ok.event('second', 'BROWSER_FAILED');
  ok.terminal('second', { cancelled: true });
  await ok.settle(100, 0);
  assert.equal(ok.report().started, 2);
  assert.equal(ok.report().scans, 1);
  assert.equal(ok.report().cancelled, 1);
  const asset = createObservation();
  asset.start('asset', { requestClass: 'IMAGE' });
  asset.event('asset', 'BROWSER_FAILED');
  asset.terminal('asset');
  await assert.rejects(asset.settle(100, 0), /OBSERVER_ASSET_FAILURE/);
  for (const browserStage of ['BROWSER_FINISHED', 'BROWSER_FAILED']) {
    const failed = createObservation();
    failed.start('api', { requestClass: 'ALLOWED_API' });
    failed.event('api', browserStage);
    failed.terminal('api');
    await assert.rejects(failed.settle(100, 0), /OBSERVER_API_UNSCANNED/);
    assert.equal(failed.report().scanFailures, 1);
  }
  const pending = createObservation();
  pending.start('api', { requestClass: 'ALLOWED_API' });
  await assert.rejects(pending.settle(20, 0), /OBSERVER_PENDING/);
  assert.throws(() => pending.terminal('not-started'), /OBSERVER_UNKNOWN_TERMINAL/);
});

test('only contractually bodyless logout can complete without a retrieved API body', async () => {
  const logout = '/api/v1/auth/logout';
  assert.equal(noContentLogout(logout, 'POST', 204, {}), true);
  for (const sample of [['GET', 204, {}], ['POST', 200, {}], ['POST', 204, { 'content-length': '1' }],
    ['POST', 204, { 'transfer-encoding': 'chunked' }]]) assert.equal(noContentLogout(logout, ...sample), false);
  assert.equal(noContentLogout('/api/v1/auth/me', 'POST', 204, {}), false);
  const observation = createObservation();
  observation.start('empty-response', { requestClass: 'ALLOWED_API', method: 'POST' });
  for (const stage of scanStages.slice(0, 4)) observation.event('empty-response', stage);
  observation.terminal('empty-response', { bodyless: noContentLogout(logout, 'POST', 204, {}) });
  await observation.settle(100, 0);
  assert.equal(observation.report().bodyless, 1);
  assert.equal(observation.report().scans, 0);
});

test('ordinary sign-out opens the scoped account control first', async () => {
  const events = [];
  const control = {};
  const summary = { click: async () => { events.push('open'); } };
  const menu = {
    getAttribute: async name => { assert.equal(name, 'open'); return null; },
    getByRole: (role, options) => {
      assert.equal(role, 'button');
      assert.deepEqual(options, { name: 'Sign out', exact: true });
      events.push('scoped');
      return control;
    },
  };
  const page = { locator: selector => {
    if (selector === 'summary[aria-label="Account"]') return summary;
    assert.equal(selector, 'details');
    return { filter: ({ has }) => { assert.equal(has, summary); return menu; } };
  } };
  assert.equal(await signOutControl(page), control);
  assert.deepEqual(events, ['open', 'scoped']);
});

test('owned service-log scan checks stdout and stderr independently', () => {
  const clean = { status: 0, stdout: 'ordinary', stderr: 'ordinary' };
  assert.equal(scanOwnedLogs(clean, ['private-canary']), true);
  for (const stream of ['stdout', 'stderr']) {
    assert.equal(scanOwnedLogs({ ...clean, [stream]: 'private-canary' }, ['private-canary']), false);
  }
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

test('initial ledger counts rejected dispatches, enforces sixty, and refuses the earlier runtime entrypoint', () => {
  assert.throws(() => initialArguments(['--evidence-dir', '/owned']), /INITIAL_PAGE_MODE_REQUIRED/);
  assert.throws(() => initialArguments(['--initial-page-only', '--evidence-dir', 'relative']), /INITIAL_PAGE_MODE_REQUIRED/);
  assert.equal(initialArguments(['--initial-page-only', '--evidence-dir', '/owned']), '/owned');
  const ledger = createInitialLedger();
  ledger.dispatch('TOPOLOGY', 'GET');
  for (let i = 0; i < 58; i++) assert.equal(ledger.dispatch('INITIAL_PAGE', 'HEAD'), true);
  assert.equal(ledger.dispatch('INITIAL_PAGE', 'HEAD'), false);
  assert.throws(() => ledger.dispatch('INITIAL_PAGE', 'GET'), /GET_BUDGET/);
  assert.equal(ledger.report().total, 61);
  const unauthorized = createInitialLedger();
  assert.throws(() => unauthorized.dispatch('INITIAL_PAGE', 'POST'), /UNAUTHORIZED_BROWSER_METHOD/);
  assert.deepEqual(unauthorized.report().byMethod, { GET: 0, HEAD: 0, OTHER: 1 });
  for (const [path, type, expected] of [['/patient', 'document', 'DOCUMENT'],
    ['/_next/static/chunks/app.js', 'script', 'SCRIPT'], ['/_next/static/app.css', 'stylesheet', 'STYLESHEET'],
    ['/fonts/inter-latin-variable.woff2', 'font', 'FONT'], ['/brand/dp02/primary-en-dark.svg', 'image', 'IMAGE'],
    ['/_next/static/asset', 'other', 'OTHER_ASSET'], ['/api/v1/auth/me', 'fetch', 'ALLOWED_API']]) {
    assert.equal(initialRequestTarget(origin + path, origin, 'GET', type), expected);
  }
  assert.equal(classifyInitialRequest(origin + '/unknown?private=marker', 'fetch'), 'UNKNOWN');
  assert.throws(() => initialRequestTarget('http://127.0.0.1:9/patient', origin, 'GET', 'document'), /FOREIGN_BROWSER_TARGET/);
  assert.throws(() => initialRequestTarget(origin + '/api/v1/auth/login', origin, 'POST', 'fetch'), /UNAUTHORIZED_BROWSER_METHOD/);
  assert.throws(() => initialRequestTarget(origin + '/api/v1/me/profile', origin, 'GET', 'fetch'), /UNAUTHORIZED_INITIAL_TARGET/);
  assert.throws(() => initialRequestTarget(origin + '/api/v1/auth/me?private=marker', origin, 'GET', 'fetch'), /UNAUTHORIZED_INITIAL_QUERY/);
});

test('same pending count distinguishes browser finish, response wait, body wait and incomplete scan', async () => {
  for (const [stopAfter, expectedStage] of [[0, 'REQUEST_DISPATCHED'], [2, 'BROWSER_FINISHED'],
    [3, 'RESPONSE_ACQUIRING'], [5, 'BODY_ACQUIRING'], [7, 'SCAN_STARTED']]) {
    const observer = createObservation();
    observer.start(Symbol('private-marker'), { requestClass: 'ALLOWED_API', method: 'GET' });
    const key = {};
    observer.start(key, { requestClass: 'DOCUMENT', method: 'GET' });
    for (const stage of scanStages.slice(0, stopAfter)) observer.event(key, stage);
    await assert.rejects(observer.settle(20, 0), /OBSERVER_PENDING/);
    const evidence = observer.firstFailure();
    assert.equal(evidence.pending, 2);
    assert.equal(evidence.browserFinished, stopAfter >= 2 ? 1 : 0);
    assert.equal(evidence.responsesAcquired, stopAfter >= 4 ? 1 : 0);
    assert.equal(evidence.bodiesAcquired, stopAfter >= 6 ? 1 : 0);
    assert.equal(evidence.scansStarted, stopAfter >= 7 ? 1 : 0);
    assert.equal(evidence.scans, 0);
    assert.equal(evidence.finished, 0);
    assert.equal(evidence.pendingByClass.DOCUMENT, 1);
    assert.equal(evidence.pendingByStage[expectedStage], stopAfter ? 1 : 2);
    assert.doesNotMatch(JSON.stringify(evidence), /private-marker/);
    for (const stage of scanStages.slice(stopAfter)) observer.event(key, stage);
    observer.terminal(key);
    observer.fault('LATER_CLEANUP_ERROR');
    assert.equal(observer.report().finished, 1);
    assert.equal(observer.firstFailure(), evidence);
    assert.equal(evidence.finished, 0);
    assert.equal(evidence.fault, 'OBSERVER_PENDING');
    assert.ok(Object.isFrozen(evidence.pendingByStage));
  }
});

test('unknown, duplicate, late and invalid events fail closed and scans are distinct from browser events', () => {
  const unknown = createObservation();
  assert.throws(() => unknown.event({}, 'BROWSER_RESPONSE'), /OBSERVER_UNKNOWN_TERMINAL/);
  const invalid = createObservation();
  invalid.start('opaque');
  assert.equal(invalid.report().pendingByClass.UNKNOWN, 1);
  assert.throws(() => invalid.event('opaque', 'BODY_ACQUIRED'), /OBSERVER_INVALID_TRANSITION/);
  assert.throws(() => invalid.start('opaque'), /OBSERVER_DUPLICATE/);
  assert.equal(invalid.firstFailure().fault, 'OBSERVER_INVALID_TRANSITION');
  for (const [cause, stopAfter] of [['OBSERVER_RESPONSE_MISSING', 3], ['OBSERVER_BODY_UNAVAILABLE', 5], ['RESPONSE_PRIVACY', 7]]) {
    const failed = createObservation();
    failed.start('private-marker', { requestClass: 'ALLOWED_API' });
    for (const stage of scanStages.slice(0, stopAfter)) failed.event('private-marker', stage);
    failed.terminal('private-marker', { cause });
    assert.equal(failed.firstFailure().fault, cause);
    assert.equal(failed.report().scans, 0);
    assert.equal(failed.report().failed, 1);
    assert.throws(() => failed.terminal('private-marker'), /OBSERVER_INVALID_TRANSITION/);
    assert.throws(() => failed.event('private-marker', 'BROWSER_RESPONSE'), /OBSERVER_INVALID_TRANSITION/);
  }
  const complete = createObservation();
  complete.start('page', { requestClass: 'DOCUMENT' });
  for (const stage of scanStages) complete.event('page', stage);
  complete.terminal('page');
  const evidence = complete.report();
  assert.equal(evidence.started, 1);
  assert.equal(evidence.browserResponses, 1);
  assert.equal(evidence.browserFinished, 1);
  assert.equal(evidence.responsesAcquired, 1);
  assert.equal(evidence.bodiesAcquired, 1);
  assert.equal(evidence.scansStarted, 1);
  assert.equal(evidence.scans, 1);
  assert.equal(evidence.finished, 1);
  assert.equal(evidence.pending, 0);
});

test('final accounting rejects requests observed after settle and mismatched dispatch totals', async () => {
  const observer = createObservation();
  await observer.settle(100, 0);
  observer.start('late', { requestClass: 'SCRIPT', method: 'GET' });
  assert.throws(() => observer.verifyComplete(1), /OBSERVER_PENDING/);
  assert.equal(observer.firstFailure().pendingByClass.SCRIPT, 1);
  observer.event('late', 'BROWSER_FAILED');
  observer.terminal('late', { cancelled: true });
  assert.throws(() => observer.verifyComplete(1), /OBSERVER_PENDING/);
  assert.equal(observer.report().pending, 0);
  assert.throws(() => createObservation().verifyComplete(1), /OBSERVER_TOTALS/);
});

test('browser cleanup is attempted despite an inventory fault and fails closed without a launch handle', async () => {
  const operations = [];
  const drain = async () => { operations.push('drain'); };
  const inventory = () => { operations.push('inventory'); };
  const closed = () => true;
  await closeInitialBrowser({ attempted: false, inventory, closed, drain });
  assert.deepEqual(operations, []);
  await assert.rejects(closeInitialBrowser({ attempted: true, inventory, closed, drain }), /BROWSER_CLEANUP_UNVERIFIED/);
  assert.deepEqual(operations.splice(0), ['inventory', 'drain']);
  const browser = { close: async () => { operations.push('close'); } };
  const unavailable = () => { inventory(); throw Error('inert-failure'); };
  await assert.rejects(closeInitialBrowser({ attempted: true, browser, inventory: unavailable, closed, drain }), /inert-failure/);
  assert.deepEqual(operations, ['inventory', 'close', 'drain']);
});

test('zero-auth write comparison runs after close, fails closed and never substitutes for the observation fault', async () => {
  const before = { domains: { users: 'inert' }, accounts: 0, sessions: 0, revoked: 0, active: 0, audits: {}, unsafelyAudited: 0 };
  const ledger = createInitialLedger();
  checkZeroAuthLedger(before, globalThis.structuredClone(before), ledger.report());
  for (const field of ['accounts', 'sessions', 'revoked', 'active', 'unsafelyAudited']) {
    assert.throws(() => checkZeroAuthLedger(before, { ...before, [field]: 1 }, ledger.report()), /ZERO_AUTH_WRITE_LEDGER/);
  }
  assert.throws(() => checkZeroAuthLedger(before, { ...before, audits: { AUTH_LOGIN: 1 } }, ledger.report()), /ZERO_AUTH_WRITE_LEDGER/);
  assert.throws(() => checkZeroAuthLedger({ ...before, domains: undefined }, { ...before, domains: undefined }, ledger.report()),
    /WRITE_LEDGER_UNAVAILABLE/);
  const operations = [];
  const observer = createObservation();
  observer.start('pending', { requestClass: 'STYLESHEET' });
  observer.fault('OBSERVER_PENDING');
  const evidence = observer.firstFailure();
  const finish = snapshot => finishInitialEvidence({ before, ledger: ledger.report,
    close: async () => { operations.push('close'); observer.event('pending', 'BROWSER_FAILED');
      observer.terminal('pending', { cancelled: true }); },
    snapshot: async () => { operations.push('snapshot'); return snapshot(); },
  });
  assert.deepEqual(await finish(() => { throw Error('private-marker'); }),
    { closed: true, writes: { result: 'NOT VERIFIED', attempted: true } });
  assert.deepEqual(operations, ['close', 'snapshot']);
  assert.equal(observer.firstFailure(), evidence);
  assert.equal(evidence.pending, 1);
  assert.equal(observer.report().pending, 0);
  const finishWithoutClose = await finishInitialEvidence({ before, ledger: ledger.report,
    close: async () => { throw Error('private-marker'); }, snapshot: async () => before });
  assert.deepEqual(finishWithoutClose, { closed: false, writes: { result: 'NOT VERIFIED', attempted: true } });
  for (const [state, result] of [[before, 'PASS'], [{ ...before, domains: { users: 'changed' } }, 'FAIL']]) {
    const completed = await finishInitialEvidence({ before, ledger: ledger.report,
      close: async () => {}, snapshot: async () => state });
    assert.equal(completed.writes.result, result);
    assert.doesNotMatch(JSON.stringify(completed), /"inert"|"changed"|private-marker/);
  }
});

test('anonymous API accepts only source-supported session expiration and empty public directory responses', () => {
  const expired = 'eh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const error = JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Synthetic denial' } });
  checkInitialApi('/api/v1/auth/me', 401, 'no-store', error, expired);
  assert.throws(() => checkInitialApi('/api/v1/auth/me', 401, 'no-store', error, expired + '; Domain=example.invalid'), /ANONYMOUS_COOKIE_WRITE/);
  assert.throws(() => checkInitialApi('/api/v1/auth/me', 200, 'no-store', error, null), /ANONYMOUS_API_CONTRACT/);
  const directory = JSON.stringify({ data: [], meta: { page: 1, pageSize: 100, total: 0 } });
  for (const route of ['providers', 'clinics']) {
    const path = '/api/v1/directory/' + route;
    assert.equal(initialRequestTarget(origin + path + '?page=1&pageSize=100', origin, 'GET', 'fetch'), 'ALLOWED_API');
    assert.throws(() => initialRequestTarget(origin + path + '?page=2&pageSize=100', origin, 'GET', 'fetch'), /UNAUTHORIZED_INITIAL_QUERY/);
    checkInitialApi(path, 200, 'no-store', directory, null);
    assert.throws(() => checkInitialApi(path, 200, 'no-store', directory, expired), /ANONYMOUS_COOKIE_WRITE/);
    assert.throws(() => checkInitialApi(path, 200, 'no-store', JSON.stringify({ data: [1] }), null), /ANONYMOUS_DIRECTORY_CONTRACT/);
  }
});
