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

export function createObservation() {
  const pending = new Map();
  const counts = { started: 0, finished: 0, failed: 0, scans: 0, cancelled: 0, scanFailures: 0 };
  let fault = null;
  const markFault = cause => { fault ??= cause; };
  return {
    start(key, api) {
      requireCheck(!pending.has(key), 'OBSERVER_DUPLICATE');
      pending.set(key, api);
      counts.started++;
    },
    terminal(key, { failed = false, scanned = false, cancelled = false } = {}) {
      requireCheck(pending.has(key), 'OBSERVER_UNKNOWN_TERMINAL');
      const api = pending.get(key);
      pending.delete(key);
      if (failed) {
        counts.failed++;
        if (cancelled) counts.cancelled++;
        else if (!api) markFault('OBSERVER_ASSET_FAILURE');
      } else counts.finished++;
      if (scanned) counts.scans++;
      if (api && (failed || !scanned)) { counts.scanFailures++; markFault('OBSERVER_API_UNSCANNED'); }
    },
    fault: markFault,
    report: () => ({ ...counts, pending: pending.size, fault }),
    async settle(timeout = 12000, quiet = 300) {
      const end = Date.now() + timeout;
      let since = Date.now();
      let seen = counts.started;
      while (Date.now() < end) {
        requireCheck(!fault, fault);
        if (seen !== counts.started || pending.size) { seen = counts.started; since = Date.now(); }
        if (!pending.size && Date.now() - since >= quiet) {
          requireCheck(counts.started === counts.finished + counts.failed, 'OBSERVER_TOTALS');
          return;
        }
        await sleep(20);
      }
      throw new DiagnosticFailure('OBSERVER_PENDING');
    },
  };
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
