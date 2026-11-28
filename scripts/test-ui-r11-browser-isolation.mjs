/** Opt-in anonymous initial sign-in page observation in disposable resources. */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright';
import {
  APP, APP_FILES, APP_TREE, BASE, BASE_TREE, BRANCH, DOCKER_HOST_ARG, DOCKER_ID, NODE_IMAGE, PATHS, PG_IMAGE,
  DiagnosticFailure, checkCleanup, checkCompose, checkInitialApi, checkSourceHashes, checkZeroAuthLedger, commandOutput,
  classifyInitialRequest, copyCommand, createInitialLedger, createObservation, assertOwnedProject, gitIn, initialArguments,
  initialRequestTarget, manifestInput, projectedResponse, requireCheck, scanOwnedLogs, scanText, sha, verifyWorkspace,
} from './support/r11-browser-isolation.mjs';

const PG_DIGEST = 'sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5';
const DB = 'eh216_q2';
const ME = '/api/v1/auth/me';
const LOGIN = '/api/v1/auth/login';
const HEALTH = '/api/v1/health';
const SIGN_IN = 'Sign in with live account';

async function fixtureWorker(name) {
  let pool;
  let reader;
  let output;
  try {
    const { createRequire } = await import('node:module');
    const { createHash } = await import('node:crypto');
    const { Pool } = createRequire('/app/packages/db/package.json')('pg');
    const url = new URL(process.env.DATABASE_URL);
    if (url.protocol !== 'postgresql:' || url.hostname !== 'postgres' || url.port !== '5432'
      || url.pathname !== '/' + name || url.username !== name || !/^[a-f0-9]{48}$/.test(url.password)
      || url.search || url.hash || process.env.NODE_ENV !== 'development'
      || !/^eh216-q2-[a-f0-9]{12}$/.test(process.env.EH216_PROJECT) || process.argv.length !== 1) throw new Error();
    let body = '';
    for await (const chunk of process.stdin) {
      body += chunk;
      if (body.length > 2048) throw new Error();
    }
    const data = JSON.parse(body);
    pool = new Pool({ connectionString: url.href, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    reader = await pool.connect();
    await reader.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (data.action === 'snapshot') {
      const tables = (await reader.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
      const domains = {};
      for (const { tablename } of tables) {
        if (['sessions', 'audit_logs'].includes(tablename)) continue;
        if (!/^[a-z_][a-z0-9_]*$/.test(tablename)) throw new Error();
        const sql = "SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS items FROM public."
          + '"' + tablename + '" t';
        domains[tablename] = createHash('sha256').update(JSON.stringify((await reader.query(sql)).rows[0].items)).digest('hex');
      }
      const sessions = (await reader.query('SELECT count(*)::int AS sessions,'
        + ' count(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked,'
        + ' count(*) FILTER (WHERE revoked_at IS NULL)::int AS active FROM sessions')).rows[0];
      const audits = Object.fromEntries((await reader.query('SELECT action_type, count(*)::int AS n FROM audit_logs GROUP BY action_type'))
        .rows.map(row => [row.action_type, row.n]));
      const unsafelyAudited = (await reader.query("SELECT count(*)::int AS n FROM audit_logs WHERE safe_metadata <> '{}'::jsonb")).rows[0].n;
      const accounts = (await reader.query('SELECT count(*)::int AS n FROM public.users')).rows[0].n;
      output = { domains, accounts, ...sessions, audits, unsafelyAudited };
    } else if (data.action === 'migrations') {
      output = (await reader.query('SELECT migration_name,checksum FROM _prisma_migrations ORDER BY migration_name')).rows;
    } else throw new Error();
    await reader.query('COMMIT');
  } catch {
    process.exitCode = 1;
  } finally {
    reader?.release(true);
    try { await pool?.end(); } catch { process.exitCode = 1; }
  }
  if (!process.exitCode) process.stdout.write(JSON.stringify(output));
}
const fixtureProgram = () => '(' + fixtureWorker.toString() + ')(' + JSON.stringify(DB) + ')';
const parse = JSON.parse;

function freePort(port = 0) {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      server.close(error => error ? fail(error) : done(actual));
    });
  });
}

export function composeOverride(project, ports) {
  assertOwnedProject(project);
  requireCheck(Object.values(ports).every(port => Number.isInteger(port) && port >= 1024 && port <= 65535)
    && ports.api !== ports.web, 'LOOPBACK_PORTS');
  const bind = (name, port) => [
    '    ports: !override', '      - target: ' + port, '        published: "' + ports[name] + '"', '        host_ip: 127.0.0.1',
  ];
  return [
    'services:', '  api:', '    image: ' + project + ':local', '    build:', '      secrets: [proxy_ca]',
    '    environment:', '      EH216_PROJECT: ' + project, '    healthcheck: {disable: true}', ...bind('api', 3001), '  web:',
    '    image: ' + project + ':local', '    healthcheck: {disable: true}', ...bind('web', 3000), '  worker:', '    image: ' + project + ':local',
    '  postgres:', '    volumes: !override', '      - type: tmpfs', '        target: /var/lib/postgresql',
    '        tmpfs:', '          size: 1073741824', 'volumes: !reset {}',
    'secrets:', '  proxy_ca:', '    file: $' + '{EH216_CA}', '',
  ].join('\n');
}

function sourceEntries(application) {
  return gitIn(application, ['ls-tree', '-rz', APP]).split('\0').filter(Boolean).map(entry => {
    const [metadata, path] = entry.split('\t');
    requireCheck(/^100(?:644|755) blob [a-f0-9]{40}$/.test(metadata) && path && !path.startsWith('/')
      && !path.split('/').includes('..'), 'APPLICATION_REGULAR_FILES');
    return [path, metadata.split(' ')[2]];
  });
}

export function projectAuthText(text, path, status, actor, secrets) {
  if (path !== ME && path !== LOGIN) return { text, valid: true };
  let json;
  try { json = parse(text); } catch { return { text, valid: true }; }
  const auth = json?.data;
  if (!auth || !Object.hasOwn(auth, 'csrfToken')) return { text, valid: status !== 200 };
  const occurrences = [...text.matchAll(/"csrfToken"\s*:\s*"([A-Za-z0-9_-]{43})"/g)];
  const valid = status === 200 && actor && auth.user?.id === actor.id && auth.user.email === actor.email
    && auth.user.role === 'PATIENT' && Object.keys(json).join(',') === 'data'
    && Object.keys(auth).sort().join(',') === 'csrfToken,session,user'
    && Object.keys(auth.user).sort().join(',') === 'email,id,role'
    && Object.keys(auth.session ?? {}).join(',') === 'expiresAt'
    && occurrences.length === 1 && occurrences[0][1] === auth.csrfToken;
  if (!valid) return { text, valid: false };
  secrets.add(auth.csrfToken);
  return { text: text.replace(occurrences[0][0], '"projectedField":null'), valid: true };
}

export async function signOutControl(page) {
  const summary = page.locator('summary[aria-label="Account"]');
  const menu = page.locator('details').filter({ has: summary });
  if (await menu.getAttribute('open') === null) await summary.click();
  return menu.getByRole('button', { name: 'Sign out', exact: true });
}

async function boundedAsync(operation, milliseconds, predicate) {
  const controller = new globalThis.AbortController();
  try {
    return await Promise.race([operation(), wait(milliseconds, undefined, { signal: controller.signal })
      .then(() => { throw new DiagnosticFailure(predicate); })]);
  } finally {
    controller.abort();
  }
}

async function waitForTcp(port) {
  const end = globalThis.performance.now() + 10000;
  while (globalThis.performance.now() < end) {
    const listening = await new Promise(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port });
      const finish = ready => { socket.destroy(); resolve(ready); };
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
      socket.setTimeout(150, () => finish(false));
    });
    if (listening) return;
    await wait(100);
  }
  throw new DiagnosticFailure('TOPOLOGY_TCP_TIMEOUT');
}

function ownedChromeProcesses() {
  const chrome = new Map();
  function collect(pid) {
    let children;
    try { children = readFileSync('/proc/' + pid + '/task/' + pid + '/children', 'utf8').trim(); }
    catch { return; }
    for (const child of children.split(/\s+/).filter(Boolean).map(Number)) {
      const info = processIdentity(child);
      if (info && /chrome|chromium/i.test(info.name)) chrome.set(child, info.birth);
      collect(child);
    }
  }
  collect(process.pid);
  return chrome;
}

function processIdentity(pid) {
  try {
    const stat = readFileSync('/proc/' + pid + '/stat', 'utf8');
    const end = stat.lastIndexOf(')');
    const [state, ...fields] = stat.slice(end + 2).trim().split(/\s+/);
    return { name: stat.slice(stat.indexOf('(') + 1, end), state, birth: fields[18] };
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') return null;
    throw error;
  }
}

function liveOwnedChrome(owned) {
  return [...owned].filter(([pid, birth]) => {
    const info = processIdentity(pid);
    return info?.birth === birth && !['Z', 'X'].includes(info.state);
  }).length;
}

export async function closeInitialBrowser({ attempted, browser, inventory, closed, drain }) {
  if (!attempted) return;
  try {
    inventory();
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await drain();
    }
  }
  requireCheck(browser && closed(), 'BROWSER_CLEANUP_UNVERIFIED');
}

export async function finishInitialEvidence({ close, snapshot, before, ledger }) {
  const cleanup = { closed: false };
  try {
    await close();
    cleanup.closed = true;
  } catch (error) {
    cleanup.closeFailure = error instanceof DiagnosticFailure ? error.predicate : 'BROWSER_CLEANUP_UNAVAILABLE';
  }
  const result = writes => ({ ...cleanup, writes });
  if (!before) return result({ result: 'NOT VERIFIED', attempted: false });
  let after;
  try { after = await snapshot(); }
  catch { return result({ result: 'NOT VERIFIED', attempted: true }); }
  try {
    checkZeroAuthLedger(before, after, ledger());
  } catch (error) {
    const predicate = error instanceof DiagnosticFailure ? error.predicate : 'WRITE_LEDGER_UNAVAILABLE';
    return result({ result: predicate === 'WRITE_LEDGER_UNAVAILABLE' ? 'NOT VERIFIED' : 'FAIL',
      attempted: true, predicate });
  }
  if (!cleanup.closed) return result({ result: 'NOT VERIFIED', attempted: true });
  return result({ result: 'PASS', attempted: true, accounts: 0, sessions: 0, audits: 0, domainSnapshotUnchanged: true });
}

async function observeInitialPage({ context, origin, secrets, ledger, observation, receipt, tasks }) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const active = new Map();
  let navigations = 0;

  const fail = error => observation.fault(error instanceof DiagnosticFailure ? error.predicate : 'OBSERVER_UNEXPECTED');
  const halt = error => {
    fail(error);
    void context.close().catch(() => {});
  };
  const observe = callback => (...args) => {
    try { callback(...args); } catch (error) { halt(error); }
  };

  context.on('page', observe(() => { requireCheck(context.pages().length === 1, 'INITIAL_PAGE_COUNT'); }));
  context.on('request', observe(request => {
    const method = request.method();
    const resource = request.resourceType();
    const requestClass = classifyInitialRequest(request.url(), resource);
    const navigation = request.isNavigationRequest();
    if (navigation) receipt.navigations = ++navigations;
    let budget;
    try {
      budget = ledger.dispatch('INITIAL_PAGE', method);
    } finally {
      observation.start(request, { requestClass, method });
    }
    requireCheck(budget, 'GET_BUDGET_REACHED');
    active.set(request, initialRequestTarget(request.url(), origin, method, resource));
    if (navigation) requireCheck(navigations === 1 && requestClass === 'DOCUMENT', 'INITIAL_NAVIGATION_LIMIT');
  }));
  context.on('response', observe(response => observation.event(response.request(), 'BROWSER_RESPONSE')));
  context.on('requestfailed', observe(request => {
    observation.event(request, 'BROWSER_FAILED');
    observation.terminal(request, { cancelled: request.failure()?.errorText === 'net::ERR_ABORTED' });
    active.delete(request);
  }));
  context.on('requestfinished', observe(request => {
    observation.event(request, 'BROWSER_FINISHED');
    observation.event(request, 'RESPONSE_ACQUIRING');
    const task = (async () => {
      try {
        const response = await request.response();
        requireCheck(response, 'OBSERVER_RESPONSE_MISSING');
        observation.event(request, 'RESPONSE_ACQUIRED');
        const headers = response.headers();
        const cookie = await response.headerValue('set-cookie');
        const type = active.get(request);
        requireCheck(type, 'OBSERVER_CLASSIFICATION');
        requireCheck(type === 'ALLOWED_API' || cookie === null, 'ANONYMOUS_COOKIE_WRITE');
        if (type !== 'DOCUMENT' && type !== 'ALLOWED_API') return observation.terminal(request);
        if (request.method() === 'HEAD' && type === 'DOCUMENT') {
          return observation.terminal(request, { bodyless: true });
        }
        observation.event(request, 'BODY_ACQUIRING');
        let bytes;
        try { bytes = await response.body(); }
        catch { throw new DiagnosticFailure('OBSERVER_BODY_UNAVAILABLE'); }
        requireCheck(bytes, 'OBSERVER_BODY_UNAVAILABLE');
        observation.event(request, 'BODY_ACQUIRED');
        requireCheck(bytes.length > 0, 'OBSERVER_BODY_UNAVAILABLE');
        requireCheck(bytes.length <= 1_000_000, 'OBSERVER_RESPONSE_SIZE');
        observation.event(request, 'SCAN_STARTED');
        const body = bytes.toString('utf8');
        const clean = scanText(body, [...secrets]);
        observation.event(request, 'SCAN_COMPLETED');
        requireCheck(clean, 'RESPONSE_PRIVACY');
        if (type === 'ALLOWED_API') {
          checkInitialApi(new URL(request.url()).pathname, response.status(), headers['cache-control'], body, cookie);
        } else requireCheck(response.status() === 200, 'INITIAL_DOCUMENT_STATUS');
        observation.terminal(request);
      } catch (error) {
        try { observation.terminal(request, { cause: error instanceof DiagnosticFailure ? error.predicate : 'OBSERVER_UNEXPECTED' }); }
        catch (terminalError) { fail(terminalError); }
      } finally {
        active.delete(request);
      }
    })();
    tasks.add(task);
    void task.then(() => tasks.delete(task), error => { tasks.delete(task); halt(error); });
  }));
  page.on('pageerror', () => { receipt.browserErrors++; observation.fault('BROWSER_PAGE_ERROR'); });
  receipt.navigationAttempts = 1;
  await page.goto(origin + '/patient', { waitUntil: 'domcontentloaded', timeout: 12000 });
  await page.getByRole('button', { name: SIGN_IN, exact: true }).waitFor({ timeout: 12000 });
  receipt.signInControl = true;
  await observation.settle();
  requireCheck(navigations === 1 && context.pages().length === 1, 'INITIAL_NAVIGATION_LIMIT');
}

export async function run(argv) {
  const evidencePath = initialArguments(argv);
  const harness = process.cwd();
  const root = dirname(harness);
  const application = join(root, 'application');
  const evidence = resolve(evidencePath);
  requireCheck(dirname(evidence) === root && !existsSync(evidence) && realpathSync(root) === root, 'EVIDENCE_CONTAINMENT');
  verifyWorkspace(harness, {});
  verifyWorkspace(application, { expected: APP, tree: APP_TREE });
  requireCheck(gitIn(harness, ['rev-parse', BASE + '^{tree}']) === BASE_TREE
    && gitIn(harness, ['branch', '--show-current']) === BRANCH
    && gitIn(harness, ['diff', '--name-status', BASE, 'HEAD']) === PATHS.map(path => 'A\t' + path).join('\n'), 'HARNESS_SOURCE_SCOPE');
  requireCheck(process.versions.node === '24.21.0', 'HARNESS_NODE_PIN');
  mkdirSync(evidence, { mode: 0o700 });
  const archive = join(evidence, 'application');
  mkdirSync(archive, { mode: 0o700 });
  const project = assertOwnedProject('eh216-q2-' + randomBytes(6).toString('hex'));
  const ports = { web: await freePort(), api: await freePort() };
  const origin = 'http://127.0.0.1:' + ports.web;
  const direct = 'http://127.0.0.1:' + ports.api;
  const tag = project + ':local';
  const scopeFile = join(evidence, 'private-scope.json');
  writeFileSync(scopeFile, JSON.stringify({ project, ports }), { mode: 0o600, flag: 'wx' });
  const env = { PATH: dirname(process.execPath) + ':/usr/local/bin:/usr/bin:/bin', HOME: process.env.HOME ?? '',
    POSTGRES_USER: DB, POSTGRES_DB: DB, POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
    AUTH_BROWSER_ORIGIN: origin, EH216_CA: process.env.CODEX_PROXY_CERT ?? '/etc/ssl/certs/ca-certificates.crt' };
  const secrets = new Set([env.POSTGRES_PASSWORD]);
  const ledger = createInitialLedger();
  const observation = createObservation();
  const receipt = { issue: 216, result: 'FAIL', app: APP, appTree: APP_TREE, harness: gitIn(harness, ['rev-parse', 'HEAD']),
    cases: [], statuses: [], browserErrors: 0, navigations: 0, navigationAttempts: 0,
    clinicalFixtures: 0, clinicalWrites: null, logScans: 0 };
  let stage = 'TOPOLOGY';
  let browser;
  let launchAttempted = false;
  const tasks = new Set();
  let before;
  const chrome = new Map();
  let image;
  let compose;
  let services;
  let network;
  let commandFailure;
  let ownershipEstablished = false;
  const recordFailure = (failureStage, predicate, command) => {
    receipt.result = 'FAIL';
    if (receipt.failure) return;
    receipt.failure = { stage: failureStage, predicate, ...(command ? { command } : {}) };
    receipt.failureObservation = observation.firstFailure() ?? observation.report();
  };
  const bounded = (binary, operation, args, { input, timeout = 60000, extraEnv = env } = {}) => commandOutput(
    spawnSync(binary, args, { cwd: harness, input, env: extraEnv, timeout, maxBuffer: 32_000_000, encoding: 'utf8' }),
    binary, operation, failure => { commandFailure = failure; });
  const docker = (operation, args, settings) => bounded('docker', operation, [DOCKER_HOST_ARG, ...args], settings);
  const inspect = (kind, id) => parse(docker('INSPECT', [kind, 'inspect', id]))[0];
  const owned = kind => docker('OWNED_LIST', [
    ...(kind === 'container' ? ['ps', '-aq'] : [kind, 'ls', '-q']),
    '--filter', 'label=com.docker.compose.project=' + project,
  ]).split('\n').filter(Boolean);
  const tagged = () => docker('TAG_LIST', ['image', 'ls', '-q', '--filter', 'reference=' + tag]) !== '';
  const step = async (id, action) => {
    stage = id;
    const started = Date.now();
    const item = { id, result: 'FAIL' };
    receipt.cases.push(item);
    try {
      await action();
      item.result = 'PASS';
    } finally { item.elapsedMs = Date.now() - started; }
  };
  const fixture = data => {
    const api = inspect('container', services.api.Id);
    requireCheck(api.Config.Labels['com.docker.compose.project'] === project && api.Image === image && api.State.Running,
      'FIXTURE_CONTAINER_OWNERSHIP');
    return parse(docker('FIXTURE', ['exec', '-i', api.Id, 'node', '-e', fixtureProgram()], { input: JSON.stringify(data) }));
  };
  const ready = async (target, label) => {
    requireCheck(target === origin || target === direct, 'HEALTH_TARGET');
    ledger.dispatch('TOPOLOGY', 'GET');
    const response = await fetch(target + HEALTH, { redirect: 'error', signal: globalThis.AbortSignal.timeout(3500) });
    const body = await response.text();
    requireCheck(body.length < 16000 && scanText(body, [...secrets]), 'HEALTH_PRIVACY');
    const item = projectedResponse({ status: response.status, text: body, cache: response.headers.get('cache-control') },
      { expected: 200, type: 'data', noStore: false });
    receipt.statuses.push({ label, ...item });
    requireCheck(item.pass && parse(body)?.data?.status === 'ok', 'HEALTH_OK_CONTRACT');
  };
  const proveLive = () => {
    const running = Object.fromEntries(owned('container').map(id => {
      const item = inspect('container', id);
      return [item.Config.Labels['com.docker.compose.service'], item];
    }));
    requireCheck(Object.keys(running).sort().join(',') === 'api,postgres,web', 'RUNNING_SERVICE_SET');
    for (const [name, item] of Object.entries(running)) {
      requireCheck(DOCKER_ID.test(item.Id) && item.State.Running && !item.HostConfig.Privileged
        && item.Config.Labels['com.docker.compose.project'] === project
        && Object.keys(item.NetworkSettings.Networks).join(',') === project + '_default', 'RUNNING_SERVICE_SCOPE');
      if (name === 'postgres') {
        requireCheck(item.Image === inspect('image', PG_IMAGE).Id
          && item.Mounts.length === 1 && item.Mounts[0].Type === 'tmpfs'
          && item.Mounts[0].Destination === '/var/lib/postgresql'
          && Object.values(item.NetworkSettings.Ports).every(value => value === null), 'RUNNING_POSTGRES_SCOPE');
      } else {
        const bindings = item.NetworkSettings.Ports[(name === 'api' ? '3001' : '3000') + '/tcp'];
        requireCheck(item.Image === image && item.Config.User === 'node' && item.Config.WorkingDir === '/app'
          && item.Config.Healthcheck?.Test?.[0] === 'NONE'
          && item.Mounts.length === 0 && bindings?.length === 1 && bindings[0].HostIp === '127.0.0.1'
          && Number(bindings[0].HostPort) === ports[name], 'RUNNING_APP_SCOPE');
      }
    }
    const net = inspect('network', project + '_default');
    requireCheck(DOCKER_ID.test(net.Id) && net.Labels['com.docker.compose.project'] === project && net.Driver === 'bridge'
      && Object.keys(net.Containers).sort().join(',') === Object.values(running).map(item => item.Id).sort().join(','),
    'RUNNING_NETWORK_SCOPE');
    return { running, net };
  };
  const sameResources = candidate => candidate.net.Id === network.Id
    && Object.keys(services).every(name => candidate.running[name].Id === services[name].Id);
  try {
    await step('TOPOLOGY', async () => {
      const entries = sourceEntries(application);
      const paths = entries.map(([path]) => path);
      manifestInput(paths);
      requireCheck(!['container', 'network', 'volume'].some(kind => owned(kind).length > 0) && !tagged(), 'PREEXISTING_OWNED_LABEL');
      ownershipEstablished = true;
      requireCheck(inspect('image', NODE_IMAGE).RepoDigests.some(value => value.endsWith(NODE_IMAGE.split('@')[1]))
        && inspect('image', PG_IMAGE).RepoDigests.some(value => value.endsWith(PG_DIGEST)), 'BASE_IMAGE_PINS');
      const bundle = join(evidence, 'candidate.tar');
      gitIn(application, ['archive', '--format=tar', '--output', bundle, APP], 60000);
      bounded('tar', 'ARCHIVE_EXTRACT', ['-xf', bundle, '-C', archive]);
      const hashes = Object.fromEntries(entries.map(([path, gitHash]) => {
        const data = readFileSync(join(archive, path));
        const blob = createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
        requireCheck(blob === gitHash, 'ARCHIVE_BLOB_INTEGRITY');
        return [path, sha(data)];
      }));
      const override = join(evidence, 'override.yaml');
      writeFileSync(override, composeOverride(project, ports), { mode: 0o600 });
      compose = ['compose', '--project-name', project, '--env-file', '/dev/null', '-f', join(archive, 'compose.yaml'), '-f', override];
      const config = parse(docker('COMPOSE_CONFIG', [...compose, 'config', '--format', 'json']));
      checkCompose(config, project, ports);
      requireCheck(['api', 'web'].every(name => config.services[name].healthcheck.disable === true), 'NO_UNCOUNTED_HTTP_HEALTH');
      stage = 'BUILD';
      const extraEnv = { ...env };
      for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) {
        if (!process.env[key]) continue;
        if (['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].includes(key)) {
          const proxy = new URL(process.env[key]);
          requireCheck(!proxy.username && !proxy.password, 'BUILD_PROXY_CREDENTIALS');
        }
        extraEnv[key] = process.env[key];
      }
      docker('IMAGE_BUILD', [...compose, 'build', '--no-cache', 'api'], { extraEnv, timeout: 1200000 });
      image = inspect('image', tag).Id;
      requireCheck(/^sha256:[a-f0-9]{64}$/.test(image), 'OWNED_IMAGE_ID');
      writeFileSync(scopeFile, JSON.stringify({ project, ports, image }), { mode: 0o600 });
      stage = 'START';
      docker('COMPOSE_START', [...compose, 'up', '-d', '--no-build', '--no-deps', '--wait', '--wait-timeout', '100',
        'postgres', 'api', 'web'], { timeout: 120000 });
      const status = proveLive();
      services = status.running;
      network = status.net;
      requireCheck(docker('NODE_VERSION', ['exec', services.web.Id, 'node', '--version']) === 'v24.22.3', 'APPLICATION_NODE_PIN');
      const { argv: copyArgs, input } = copyCommand(services.web.Id, paths);
      checkSourceHashes(bounded('docker', 'SOURCE_COPY', copyArgs, { input }), hashes);
      const routes = docker('REWRITE_MANIFEST', ['exec', services.web.Id, 'node', '-e',
        "process.stdout.write(require('node:fs').readFileSync('apps/web/.next/routes-manifest.json'))"]);
      const manifest = parse(routes);
      requireCheck(manifest.version === 3, 'REWRITE_VERSION');
      const rewrite = manifest.rewrites;
      const rules = Array.isArray(rewrite) ? rewrite : [...rewrite.beforeFiles, ...rewrite.afterFiles, ...rewrite.fallback];
      requireCheck(rules.length === 1 && rules[0].source === '/api/v1/:path*'
        && rules[0].destination === 'http://api:3001/api/v1/:path*', 'EXACT_REWRITE');
      Object.assign(receipt, { copied: APP_FILES, sourceSha: sha(JSON.stringify(hashes)), rewriteSha: sha(routes),
        applicationNode: '24.22.3' });
      await Promise.all([waitForTcp(ports.api), waitForTcp(ports.web)]);
      await ready(direct, 'DIRECT_HEALTH');
      await ready(origin, 'PROXIED_HEALTH');
      stage = 'MIGRATIONS';
      requireCheck(docker('PG_EMPTY', ['exec', services.postgres.Id, 'psql', '-U', DB, '-d', DB, '-Atc',
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"]) === '0', 'PG_EMPTY_SCHEMA');
      docker('MIGRATION_DEPLOY', ['exec', services.api.Id, 'node', 'packages/db/node_modules/prisma/build/index.js',
        'migrate', 'deploy', '--config', 'packages/db/prisma.config.ts'], { timeout: 90000 });
      const migrated = fixture({ action: 'migrations' });
      const expected = paths.filter(path => /^packages\/db\/prisma\/migrations\/[^/]+\/migration\.sql$/.test(path));
      requireCheck(migrated.length === 22 && migrated.length === expected.length && expected.every(path =>
        migrated.some(item => item.migration_name === path.split('/')[4] && item.checksum === hashes[path])), 'MIGRATION_CHECKSUMS');
      receipt.migrations = 22;
    });

    stage = 'BASELINE_LEDGER';
    before = fixture({ action: 'snapshot' });
    checkZeroAuthLedger(before, before, ledger.report());
    stage = 'BROWSER_LAUNCH';
    launchAttempted = true;
    browser = await chromium.launch({ headless: true,
      args: ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
      env: { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' } });
    for (const [pid, birth] of ownedChromeProcesses()) chrome.set(pid, birth);
    requireCheck(chrome.size > 0, 'BROWSER_PROCESS_OWNERSHIP');
    writeFileSync(scopeFile, JSON.stringify({ project, ports, image, chromium: [...chrome] }), { mode: 0o600 });
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US', viewport: { width: 1440, height: 900 } });
    await step('INITIAL_PAGE', () => observeInitialPage({ context, origin, secrets, ledger, observation, receipt, tasks }));
    receipt.result = 'PASS';
  } catch (error) {
    const predicate = observation.firstFailure()?.fault ?? (error instanceof DiagnosticFailure ? error.predicate
      : error?.name === 'TimeoutError' ? 'BROWSER_WAIT_TIMEOUT' : 'UNEXPECTED_FAILURE');
    recordFailure(stage, predicate, commandFailure);
  } finally {
    const final = await finishInitialEvidence({
      close: () => boundedAsync(() => closeInitialBrowser({
        attempted: launchAttempted, browser,
        inventory: () => {
          for (const [pid, birth] of ownedChromeProcesses()) chrome.set(pid, birth);
          writeFileSync(scopeFile, JSON.stringify({ project, ports, image, chromium: [...chrome] }), { mode: 0o600 });
        },
        closed: () => chrome.size > 0 && liveOwnedChrome(chrome) === 0,
        drain: async () => { while (tasks.size) await Promise.allSettled(tasks); },
      }), 10000, 'BROWSER_CLOSE_TIMEOUT'),
      snapshot: () => {
        requireCheck(sameResources(proveLive()), 'FINAL_RESOURCE_DRIFT');
        return fixture({ action: 'snapshot' });
      },
      before, ledger: ledger.report,
    });
    receipt.writes = final.writes;
    if (observation.firstFailure()) recordFailure('INITIAL_PAGE', observation.firstFailure().fault);
    if (final.closeFailure) {
      receipt.closeFailure = final.closeFailure;
      recordFailure('BROWSER_CLOSE', final.closeFailure);
    }
    try { observation.verifyComplete(ledger.report().byPhase.INITIAL_PAGE); }
    catch (error) { recordFailure('INITIAL_PAGE', error.predicate); }
    if (final.writes.result !== 'PASS') recordFailure('WRITE_LEDGER', final.writes.predicate ?? 'WRITE_LEDGER_UNAVAILABLE');
    else receipt.clinicalWrites = 0;
    if (services) {
      for (const name of ['api', 'web']) {
        try {
          const logs = spawnSync('docker', [DOCKER_HOST_ARG, 'logs', services[name].Id], {
            cwd: harness, env, encoding: 'utf8', timeout: 15000, maxBuffer: 8_000_000,
          });
          requireCheck(scanOwnedLogs(logs, [...secrets], failure => { commandFailure = failure; }),
            'SERVICE_LOG_PRIVACY');
          receipt.logScans++;
        } catch (error) {
          receipt.logFailure = error instanceof DiagnosticFailure ? error.predicate : 'SERVICE_LOG_UNAVAILABLE';
          recordFailure('LOG_SCAN', receipt.logFailure, commandFailure);
        }
      }
    }
    const cleanup = { closed: final.closed && !browser?.isConnected(), containers: null, networks: null, volumes: null,
      image: null, imageId: null, portsReleased: false, liveChromium: null };
    if (ownershipEstablished) {
      try { if (compose) docker('COMPOSE_DOWN', [...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10']); }
      catch { receipt.cleanupDownFailure = true; }
      try { if (tagged()) docker('OWNED_IMAGE_REMOVE', ['image', 'rm', tag]); }
      catch { receipt.cleanupImageFailure = true; }
      try {
        cleanup.containers = owned('container').length;
        cleanup.networks = owned('network').length;
        cleanup.volumes = owned('volume').length;
        cleanup.image = tagged();
        cleanup.imageId = Boolean(image && docker('IMAGE_ID_LIST', ['image', 'ls', '-aq', '--no-trunc'])
          .split('\n').includes(image));
        await freePort(ports.api);
        await freePort(ports.web);
        cleanup.portsReleased = true;
        cleanup.liveChromium = liveOwnedChrome(chrome);
        requireCheck(cleanup.liveChromium === 0, 'CHROMIUM_STILL_RUNNING');
        checkCleanup(cleanup);
        requireCheck(!receipt.cleanupDownFailure && !receipt.cleanupImageFailure, 'R13_CLEANUP_COMMAND');
        cleanup.result = 'PASS';
      } catch { /* recorded */ }
    }
    cleanup.result ??= 'FAIL';
    if (cleanup.result !== 'PASS') recordFailure('R13', 'R13_CLEANUP');
    receipt.R13 = cleanup;
    receipt.ledger = ledger.report();
    try { observation.verifyComplete(receipt.ledger.byPhase.INITIAL_PAGE); }
    catch (error) { recordFailure('INITIAL_PAGE', error.predicate); }
    receipt.observer = observation.report();
    const serialized = JSON.stringify(receipt, null, 2) + '\n';
    requireCheck(scanText(serialized, [...secrets]), 'RECEIPT_PRIVACY');
    writeFileSync(join(evidence, 'receipt.json'), serialized, { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ result: receipt.result, failure: receipt.failure ?? null, R13: cleanup.result, digest: sha(serialized) }));
  }
  if (receipt.result !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch(() => {
    console.error('R11_DIAGNOSTIC_PREFLIGHT_REJECTED');
    process.exitCode = 1;
  });
}
