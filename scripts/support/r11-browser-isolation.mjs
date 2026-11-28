import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const BASE = '64cd6e9b9c00712e223366836d5763f49e8c1682';
export const BASE_TREE = '99b55a46535a2aca5d21784f7a7fa822e7e32d52';
export const APP = '8c6ea2682fad7da4a3b687bae7a57a87611f25ac';
export const APP_TREE = '8c9b48af9c41922762a01eadedf6849b3d2edd13';
export const BRANCH = 'task/g2-q2-r11-browser-isolation';
export const PATHS = Object.freeze([
  'scripts/support/r11-browser-isolation.mjs',
  'scripts/test-ui-r11-browser-isolation.mjs',
  'tests/ui-r11-browser-isolation.test.mjs',
]);
export const APP_FILES = 1614;
export const MANIFEST = '605a4986a0242d8956bd8a7fc2fa9d5291c4d9f17c9e450cb1972097cf0a1d38';
export const DOCKER_HOST_ARG = '--host=unix:///var/run/docker.sock';
export const NODE_IMAGE = 'node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54';
export const PG_IMAGE = 'postgres:18.6-bookworm';
export const GET_BUDGET = Object.freeze({ topology: 16, accountA: 65, accountB: 100, english: 54, arabic: 55 });
export const DOCKER_ID = /^[a-f0-9]{64}$/;
const PROJECT_ID = /^eh216-q2-[a-f0-9]{12}$/;
export const sha = input => createHash('sha256').update(input).digest('hex');

export class DiagnosticFailure extends Error {
  constructor(predicate) {
    super(predicate);
    this.predicate = predicate;
  }
}

export function requireCheck(ok, predicate) {
  if (!ok) throw new DiagnosticFailure(predicate);
}

export function gitEnvironment(root, source = process.env) {
  requireCheck(isAbsolute(root), 'GIT_CEILING_REJECTED');
  const env = Object.fromEntries(Object.entries(source).filter(([key]) => !/^git_/i.test(key)));
  return { ...env, GIT_CEILING_DIRECTORIES: root, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
}

export function gitIn(cwd, argv, timeout = 20000) {
  const env = gitEnvironment(resolve(cwd, '..'));
  const result = spawnSync('git', ['-C', cwd, ...argv], { cwd, env, encoding: 'utf8', timeout, maxBuffer: 2_000_000 });
  return commandOutput(result, 'git', 'GIT_COMMAND');
}

export function verifyWorkspace(path, { expected, tree, clean = true, remote = true }) {
  requireCheck(isAbsolute(path) && realpathSync(path) === path, 'WORKSPACE_REALPATH');
  const dotGit = join(path, '.git');
  requireCheck(statSync(dotGit, { throwIfNoEntry: false })?.isDirectory() && realpathSync(dotGit) === dotGit,
    'WORKSPACE_GIT_DIRECTORY');
  requireCheck(gitIn(path, ['rev-parse', '--show-toplevel']) === path
    && gitIn(path, ['rev-parse', '--path-format=absolute', '--git-common-dir']) === dotGit
    && gitIn(path, ['rev-parse', '--is-shallow-repository']) === 'false', 'WORKSPACE_GIT_CONTAINMENT');
  requireCheck(!statSync(join(dotGit, 'objects/info/alternates'), { throwIfNoEntry: false }), 'WORKSPACE_SHARED_OBJECTS');
  if (remote) requireCheck(gitIn(path, ['remote', 'get-url', 'origin']) === 'https://github.com/abuhmaid28/egyhealth360.git',
    'WORKSPACE_FOREIGN_ORIGIN');
  if (expected) requireCheck(gitIn(path, ['rev-parse', 'HEAD']) === expected, 'WORKSPACE_WRONG_HEAD');
  if (tree) requireCheck(gitIn(path, ['rev-parse', 'HEAD^{tree}']) === tree, 'WORKSPACE_WRONG_TREE');
  if (clean) requireCheck(gitIn(path, ['status', '--porcelain']) === '', 'WORKSPACE_DIRTY');
}

export function commandOutput(result, tool, operation, report = () => {}) {
  if (result.error || result.status !== 0) {
    report({ tool, operation, exit: Number.isInteger(result.status) ? result.status : null,
      kind: result.error?.code === 'ETIMEDOUT' ? 'timeout' : result.error ? 'spawn' : 'exit' });
    throw new DiagnosticFailure('BOUNDED_COMMAND_FAILED');
  }
  return result.stdout.trim();
}

export function manifestInput(paths) {
  requireCheck(Array.isArray(paths) && paths.length === APP_FILES
    && paths.every(path => typeof path === 'string'), 'MANIFEST_COUNT');
  const input = JSON.stringify(paths);
  requireCheck(sha(input) === MANIFEST, 'MANIFEST_PIN');
  return input;
}

async function sourceWorker(pin) {
  try {
    const { Buffer } = await import('node:buffer');
    const { createHash } = await import('node:crypto');
    const { readFileSync } = await import('node:fs');
    let count = 0;
    const chunks = [];
    if (process.argv.length !== 1) throw new Error();
    for await (const chunk of process.stdin) {
      count += chunk.length;
      if (count > 160_000) throw new Error();
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    if (createHash('sha256').update(raw).digest('hex') !== pin) throw new Error();
    const entries = JSON.parse(raw).map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]);
    process.stdout.write(JSON.stringify(Object.fromEntries(entries)));
  } catch {
    process.exitCode = 1;
  }
}

export function sourceProgram() {
  return '(' + sourceWorker.toString() + ')(' + JSON.stringify(MANIFEST) + ')';
}

export function assertOwnedProject(project) {
  requireCheck(PROJECT_ID.test(project), 'RESOURCE_PROJECT');
  return project;
}

export function copyCommand(containerId, paths) {
  requireCheck(DOCKER_ID.test(containerId), 'RESOURCE_ID');
  return {
    argv: [DOCKER_HOST_ARG, 'exec', '-i', containerId, 'node', '-e', sourceProgram()],
    input: manifestInput(paths),
  };
}

export function checkSourceHashes(output, expected) {
  let actual;
  try { actual = JSON.parse(output); } catch { throw new DiagnosticFailure('MANIFEST_OUTPUT'); }
  requireCheck(actual && Object.keys(actual).length === APP_FILES && Object.keys(expected).length === APP_FILES
    && Object.entries(expected).every(([path, hash]) => Object.hasOwn(actual, path) && actual[path] === hash), 'MANIFEST_HASHES');
}

export function checkCompose(config, project, ports) {
  assertOwnedProject(project);
  requireCheck(config.name === project && !Object.keys(config.volumes ?? {}).length, 'COMPOSE_SCOPE');
  const services = config.services;
  requireCheck(Object.keys(services ?? {}).sort().join(',') === 'api,postgres,web,worker', 'COMPOSE_SERVICE_SET');
  for (const [name, service] of Object.entries(services)) {
    requireCheck(!service.privileged && !service.network_mode && !service.devices?.length && !service.cap_add?.length
      && !service.env_file?.length && !service.extra_hosts?.length
      && Object.keys(service.networks ?? {}).join(',') === 'default', 'COMPOSE_ISOLATION');
    const mounts = service.volumes ?? [];
    if (name === 'postgres') requireCheck(mounts.length === 1 && mounts[0].type === 'tmpfs'
      && mounts[0].target === '/var/lib/postgresql', 'COMPOSE_PG_STORAGE');
    else requireCheck(mounts.length === 0 && service.image === project + ':local', 'COMPOSE_APP_IMAGE_STORAGE');
    const mappings = service.ports ?? [];
    if (name === 'api' || name === 'web') {
      requireCheck(mappings.length === 1 && mappings[0].host_ip === '127.0.0.1'
        && Number(mappings[0].published) === ports[name]
        && mappings[0].target === (name === 'api' ? 3001 : 3000), 'COMPOSE_PORT');
    } else requireCheck(mappings.length === 0, 'COMPOSE_PRIVATE_SERVICE');
  }
  requireCheck(services.postgres.image === PG_IMAGE && services.api.build?.args?.EH_UI_API_ORIGIN === 'http://api:3001',
    'COMPOSE_PINS');
  requireCheck(config.networks?.default?.name === project + '_default' && !config.networks.default.external,
    'COMPOSE_NETWORK');
}

export function createLedger() {
  const byCase = Object.fromEntries(Object.keys(GET_BUDGET).map(name => [name, 0]));
  const totals = { get: 0, login: 0, logout: 0, outages: 0 };
  const counts = { accountA: { login: 0, logout: 0 }, accountB: { login: 0 }, arabic: { logout: 0 } };
  return {
    get(phase) {
      requireCheck(Object.hasOwn(byCase, phase), 'GET_PHASE');
      byCase[phase]++;
      totals.get++;
      requireCheck(byCase[phase] <= GET_BUDGET[phase] && totals.get <= 290, 'GET_BUDGET');
    },
    auth(phase, kind) {
      requireCheck(Object.hasOwn(counts[phase] ?? {}, kind), 'AUTH_PHASE');
      totals[kind]++;
      requireCheck(++counts[phase][kind] === 1 && totals[kind] <= 2, 'AUTH_BUDGET');
    },
    outage() { requireCheck(++totals.outages <= 4, 'OUTAGE_BUDGET'); },
    report: () => ({ ...totals, getByCase: { ...byCase } }),
  };
}

export function requestTarget(value, origin, method, profiles) {
  const url = new URL(value);
  requireCheck(url.origin === origin && url.protocol === 'http:' && !url.username && !url.password, 'FOREIGN_BROWSER_TARGET');
  if (method === 'POST') {
    requireCheck(!url.search && ['/api/v1/auth/login', '/api/v1/auth/logout'].includes(url.pathname), 'UNAUTHORIZED_BROWSER_WRITE');
    return url.pathname.endsWith('/login') ? 'login' : 'logout';
  }
  requireCheck(method === 'GET' || method === 'HEAD', 'UNAUTHORIZED_BROWSER_METHOD');
  if (url.pathname.startsWith('/api/')) {
    requireCheck(method === 'GET', 'UNAUTHORIZED_API_METHOD');
    requireCheck(/^\/api\/v1\/(?:auth\/me|me\/(?:profile|bookings|summaries|follow-up-intents|care-plan|care-plans|blood-pressure-measurements|record|prescriptions)|health)$/.test(url.pathname)
      || (['/api/v1/directory/providers', '/api/v1/directory/clinics'].includes(url.pathname)
        && url.search === '?page=1&pageSize=100')
      || profiles.some(id => url.pathname === '/api/v1/patients/' + id + '/profile' && !url.search), 'UNAUTHORIZED_API_READ');
    return 'api';
  }
  return 'asset';
}

export function scanText(text, protectedValues) {
  return !protectedValues.some(marker => marker && text.includes(marker))
    && !/(?:postgresql:\/\/|eh_session=|eh-pw-v1\$|password_hash|"csrfToken"\s*:|\bSELECT \w+.+ FROM |\bINSERT INTO )/i.test(text);
}

export function scanOwnedLogs(result, markers, report) {
  commandOutput(result, 'docker', 'OWNED_LOG_SCAN', report);
  return scanText(result.stdout, markers) && scanText(result.stderr, markers);
}

export function noContentLogout(path, method, status, headers) {
  return path === '/api/v1/auth/logout' && method === 'POST' && status === 204
    && headers['transfer-encoding'] === undefined
    && (headers['content-length'] === undefined || headers['content-length'] === '0');
}

export function projectedResponse(raw, { expected, type, noStore = true, markers = [] }) {
  requireCheck(scanText(raw.text, markers), 'RESPONSE_PRIVACY');
  let result;
  try { result = JSON.parse(raw.text); } catch { /* shape checked below */ }
  const cache = raw.cache === 'no-store';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const exact = (value, keys) => object(value) && Object.keys(value).sort().join(',') === keys;
  const shape = {
    error: Boolean(exact(result, 'error') && exact(result.error, 'code,message')
      && typeof result.error.code === 'string' && typeof result.error.message === 'string'),
    data: Boolean(exact(result, 'data')),
    empty: raw.text === '',
    upstream: raw.text.trim() === 'Internal Server Error',
  }[type];
  return { expected, actual: raw.status, cache, shape: Boolean(shape), scanned: true,
    pass: raw.status === expected && (!noStore || cache) && Boolean(shape) };
}

export const INITIAL_MODE = '--initial-page-only';
export const INITIAL_REQUEST_LIMIT = 60;
const requestClasses = ['DOCUMENT', 'SCRIPT', 'STYLESHEET', 'FONT', 'IMAGE', 'OTHER_ASSET', 'ALLOWED_API', 'UNKNOWN'];
const requestMethods = ['GET', 'HEAD', 'OTHER'];
const requestPhases = ['TOPOLOGY', 'INITIAL_PAGE'];
const ageBuckets = ['UNDER_300_MS', 'UNDER_3_S', 'UNDER_12_S', 'AT_LEAST_12_S'];
const requestStages = {
  REQUEST_DISPATCHED: ['BROWSER_RESPONSE', 'BROWSER_FINISHED', 'BROWSER_FAILED'],
  BROWSER_RESPONSE: ['BROWSER_FINISHED', 'BROWSER_FAILED'],
  BROWSER_FINISHED: ['RESPONSE_ACQUIRING'],
  BROWSER_FAILED: ['TERMINAL'],
  RESPONSE_ACQUIRING: ['RESPONSE_ACQUIRED'],
  RESPONSE_ACQUIRED: ['BODY_ACQUIRING', 'TERMINAL'],
  BODY_ACQUIRING: ['BODY_ACQUIRED'],
  BODY_ACQUIRED: ['SCAN_STARTED'],
  SCAN_STARTED: ['SCAN_COMPLETED'],
  SCAN_COMPLETED: ['TERMINAL'],
  TERMINAL: [],
};
const stageCounters = {
  BROWSER_RESPONSE: 'browserResponses', BROWSER_FINISHED: 'browserFinished', BROWSER_FAILED: 'browserFailed',
  RESPONSE_ACQUIRED: 'responsesAcquired', BODY_ACQUIRED: 'bodiesAcquired',
  SCAN_STARTED: 'scansStarted', SCAN_COMPLETED: 'scans',
};
const countsFor = keys => Object.fromEntries(keys.map(key => [key, 0]));
const methodGroup = method => requestMethods.includes(method) ? method : 'OTHER';

export function initialArguments(argv) {
  requireCheck(argv.length === 3 && argv[0] === INITIAL_MODE && argv[1] === '--evidence-dir'
    && isAbsolute(argv[2]), 'INITIAL_PAGE_MODE_REQUIRED');
  return argv[2];
}

export function createInitialLedger() {
  const phases = countsFor(requestPhases);
  const methods = countsFor(requestMethods);
  let total = 0;
  return {
    dispatch(phase, method) {
      requireCheck(Object.hasOwn(phases, phase), 'GET_PHASE');
      phases[phase]++;
      methods[methodGroup(method)]++;
      requireCheck(++total <= INITIAL_REQUEST_LIMIT, 'GET_BUDGET');
      requireCheck(method === 'GET' || method === 'HEAD', 'UNAUTHORIZED_BROWSER_METHOD');
    },
    report: () => ({ total, byPhase: { ...phases }, byMethod: { ...methods }, login: 0, logout: 0, outages: 0 }),
  };
}

export function classifyInitialRequest(value, resource) {
  let path;
  try { path = new URL(value).pathname; } catch { return 'UNKNOWN'; }
  if (path === '/api/v1/auth/me') return 'ALLOWED_API';
  if (path.startsWith('/api/')) return 'UNKNOWN';
  if (path === '/patient' && resource === 'document') return 'DOCUMENT';
  if (path.startsWith('/_next/static/') || /^\/(?:favicon\.ico|icon[^/]*\.png)$/.test(path)) {
    return { script: 'SCRIPT', stylesheet: 'STYLESHEET', font: 'FONT', image: 'IMAGE', other: 'OTHER_ASSET' }[resource] ?? 'UNKNOWN';
  }
  if (/^\/fonts\/(?:inter-latin-variable\.woff2|noto-sans-arabic-variable\.woff2|my-care\/(?:manrope|plex-arabic-(?:regular|semibold))\.ttf)$/.test(path)) {
    return resource === 'font' ? 'FONT' : 'UNKNOWN';
  }
  if (/^\/brand\/dp02\/(?:primary|compact)-(?:en|ar)-(?:light|dark)\.svg$/.test(path)
    || path === '/visual-recovery/care-encounter.webp') return resource === 'image' ? 'IMAGE' : 'UNKNOWN';
  return 'UNKNOWN';
}

export function initialRequestTarget(value, origin, method, resource) {
  let url;
  try { url = new URL(value); } catch { throw new DiagnosticFailure('FOREIGN_BROWSER_TARGET'); }
  requireCheck(url.origin === origin && url.protocol === 'http:' && !url.username && !url.password, 'FOREIGN_BROWSER_TARGET');
  requireCheck(method === 'GET' || method === 'HEAD', 'UNAUTHORIZED_BROWSER_METHOD');
  requireCheck(!url.search && !url.hash, 'UNAUTHORIZED_INITIAL_QUERY');
  const requestClass = classifyInitialRequest(value, resource);
  requireCheck(requestClass !== 'UNKNOWN', 'UNAUTHORIZED_INITIAL_TARGET');
  if (requestClass === 'ALLOWED_API') requireCheck(method === 'GET', 'UNAUTHORIZED_API_METHOD');
  return requestClass;
}

export function createObservation({ now = () => globalThis.performance.now() } = {}) {
  const entries = new Map();
  const counts = { started: 0, browserResponses: 0, browserFinished: 0, browserFailed: 0,
    responsesAcquired: 0, bodiesAcquired: 0, scansStarted: 0, scans: 0,
    finished: 0, failed: 0, bodyless: 0, assetsWithoutBodies: 0, cancelled: 0, scanFailures: 0 };
  let firstFailure;
  let fault = null;
  let revision = 0;

  function snapshot() {
    const byClass = countsFor(requestClasses);
    const byStage = countsFor(Object.keys(requestStages).filter(stage => stage !== 'TERMINAL'));
    const byAge = countsFor(ageBuckets);
    const byMethod = countsFor(requestMethods);
    const byPhase = countsFor(requestPhases);
    const time = now();
    let pending = 0;
    for (const entry of entries.values()) {
      if (entry.stage === 'TERMINAL') continue;
      pending++;
      byClass[entry.requestClass]++;
      byStage[entry.stage]++;
      byMethod[entry.method]++;
      byPhase[entry.phase]++;
      const age = time - entry.started;
      byAge[age < 300 ? ageBuckets[0] : age < 3000 ? ageBuckets[1] : age < 12000 ? ageBuckets[2] : ageBuckets[3]]++;
    }
    return Object.freeze({ ...counts, pending, fault, pendingByClass: Object.freeze(byClass),
      pendingByStage: Object.freeze(byStage), pendingByAge: Object.freeze(byAge),
      pendingByMethod: Object.freeze(byMethod), pendingByPhase: Object.freeze(byPhase) });
  }

  function markFault(cause) {
    if (fault !== null) return;
    fault = typeof cause === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(cause) ? cause : 'OBSERVER_UNEXPECTED';
    firstFailure = snapshot();
  }

  function requireTransition(condition, cause) {
    if (condition) return;
    markFault(cause);
    throw new DiagnosticFailure(cause);
  }

  function entryFor(key) {
    const entry = entries.get(key);
    requireTransition(entry, 'OBSERVER_UNKNOWN_TERMINAL');
    return entry;
  }

  function advance(entry, stage) {
    requireTransition(requestStages[entry.stage].includes(stage), 'OBSERVER_INVALID_TRANSITION');
    entry.stage = stage;
    revision++;
    if (stageCounters[stage]) counts[stageCounters[stage]]++;
  }

  const requiresScan = entry => ['ALLOWED_API', 'DOCUMENT', 'UNKNOWN'].includes(entry.requestClass);
  return {
    start(key, { requestClass = 'UNKNOWN', method = 'OTHER', phase = 'INITIAL_PAGE' } = {}) {
      requireTransition(!entries.has(key), 'OBSERVER_DUPLICATE');
      requireTransition(requestClasses.includes(requestClass) && requestPhases.includes(phase), 'OBSERVER_CLASSIFICATION');
      entries.set(key, { stage: 'REQUEST_DISPATCHED', started: now(), requestClass, method: methodGroup(method), phase });
      counts.started++;
      revision++;
    },
    event(key, stage) {
      requireTransition(stage !== 'TERMINAL' && Object.hasOwn(requestStages, stage), 'OBSERVER_INVALID_TRANSITION');
      advance(entryFor(key), stage);
    },
    terminal(key, { bodyless = false, cancelled = false, cause = null } = {}) {
      const entry = entryFor(key);
      const browserFailure = entry.stage === 'BROWSER_FAILED';
      const unfinished = !browserFailure && entry.stage !== 'SCAN_COMPLETED'
        && !(entry.stage === 'RESPONSE_ACQUIRED' && (bodyless || !requiresScan(entry)));
      const invalidOutcome = (bodyless && (browserFailure || entry.stage !== 'RESPONSE_ACQUIRED'))
        || (cancelled && !browserFailure);
      requireTransition(entry.stage !== 'TERMINAL' && !invalidOutcome, 'OBSERVER_INVALID_TRANSITION');
      if (cause || unfinished || browserFailure) {
        if (requiresScan(entry)) counts.scanFailures++;
        if (cause || requiresScan(entry) || !cancelled) {
          markFault(cause ?? (requiresScan(entry) ? 'OBSERVER_API_UNSCANNED' : 'OBSERVER_ASSET_FAILURE'));
        }
        counts.failed++;
        if (cancelled) counts.cancelled++;
        entry.stage = 'TERMINAL';
        revision++;
        return;
      }
      advance(entry, 'TERMINAL');
      counts.finished++;
      if (bodyless) counts.bodyless++;
      else if (!requiresScan(entry)) counts.assetsWithoutBodies++;
    },
    fault: markFault,
    firstFailure: () => firstFailure,
    report: snapshot,
    async settle(timeout = 12000, quiet = 300) {
      const end = now() + timeout;
      let since = now();
      let seen = revision;
      while (now() < end) {
        requireCheck(!fault, fault);
        const pending = counts.started - counts.finished - counts.failed;
        if (seen !== revision || pending) { seen = revision; since = now(); }
        if (!pending && now() - since >= quiet) {
          requireTransition(counts.started === counts.finished + counts.failed
            && counts.started === counts.browserFinished + counts.browserFailed, 'OBSERVER_TOTALS');
          return;
        }
        await sleep(20);
      }
      markFault('OBSERVER_PENDING');
      throw new DiagnosticFailure(fault);
    },
  };
}

export function checkZeroAuthLedger(before, after, ledger) {
  requireCheck(before && after && ledger, 'WRITE_LEDGER_UNAVAILABLE');
  requireCheck(JSON.stringify(before.domains) === JSON.stringify(after.domains), 'UNAUTHORIZED_DOMAIN_WRITE');
  for (const state of [before, after]) {
    requireCheck(state.accounts === 0 && state.sessions === 0 && state.active === 0 && state.revoked === 0
      && state.audits && Object.keys(state.audits).length === 0 && state.unsafelyAudited === 0, 'ZERO_AUTH_WRITE_LEDGER');
  }
  requireCheck(ledger.login === 0 && ledger.logout === 0 && ledger.outages === 0 && ledger.byMethod?.OTHER === 0, 'ZERO_AUTH_REQUEST_LEDGER');
}

export function checkCleanup(proof) {
  requireCheck(proof?.closed === true && proof.containers === 0 && proof.networks === 0 && proof.volumes === 0
    && proof.image === false && proof.imageId === false && proof.portsReleased === true, 'R13_CLEANUP');
}

export function checkWriteLedger(before, after) {
  requireCheck(JSON.stringify(before.domains) === JSON.stringify(after.domains), 'UNAUTHORIZED_DOMAIN_WRITE');
  const expected = { AUTH_LOGIN: 2, AUTH_SESSION_REVOKED: 2 };
  requireCheck(before.sessions === 0 && Object.keys(before.audits).length === 0 && after.sessions === 2
    && after.revoked === 2 && after.active === 0 && after.unsafelyAudited === 0
    && Object.keys(after.audits).length === 2 && Object.entries(expected).every(([key, count]) => after.audits[key] === count),
  'AUTH_WRITE_LEDGER');
}
