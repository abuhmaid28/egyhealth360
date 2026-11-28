/** Opt-in synthetic browser isolation and R11 recovery diagnostic. */
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright';
import {
  APP, APP_FILES, APP_TREE, BASE, BASE_TREE, BRANCH, DOCKER_HOST_ARG, DOCKER_ID, NODE_IMAGE, PATHS, PG_IMAGE,
  DiagnosticFailure, checkCleanup, checkCompose, checkSourceHashes, checkWriteLedger, commandOutput,
  copyCommand, createLedger, createObservation, assertOwnedProject, gitIn, manifestInput, projectedResponse,
  requestTarget, requireCheck, scanText, sha, verifyWorkspace,
} from './support/r11-browser-isolation.mjs';

const PG_DIGEST = 'sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5';
const DB = 'eh216_q2';
const ME = '/api/v1/auth/me';
const LOGIN = '/api/v1/auth/login';
const LOGOUT = '/api/v1/auth/logout';
const HEALTH = '/api/v1/health';
const SUMMARY_API = '/api/v1/me/summaries';
const SUMMARY = '/patient/summaries';
const SIGN_IN = 'Sign in with live account';
const LIVE = '[data-session-mode="live"]';
const UI = Object.freeze({
  english: ['English', 'ltr', 1440, 'Refresh visible documentation', 'No visible released summaries'],
  arabic: ['العربية', 'rtl', 390, 'تحديث التوثيق المتاح للعرض', 'لا توجد ملخصات منشورة متاحة للعرض'],
});

async function fixtureWorker(name) {
  let pool;
  let persistence;
  let output;
  try {
    const { Buffer } = await import('node:buffer');
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
    if (data.action === 'init') {
      if (!/^[a-f0-9]{12}$/.test(data.nonce) || !Array.isArray(data.passwords) || data.passwords.length !== 2
        || !data.passwords.every(value => /^[A-Za-z0-9_-]{43}$/.test(value))
        || (await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n !== 0) throw new Error();
      const { createPersistence } = await import('/app/packages/db/dist/index.js');
      const { hashPassword } = await import('/app/apps/api/dist/password.js');
      persistence = createPersistence(url.href);
      const actors = [];
      for (const [index, alias] of ['A', 'B'].entries()) {
        const displayName = 'Qtwo' + alias + data.nonce;
        const email = 'patient' + alias.toLowerCase() + '-' + data.nonce + '@q2.example.invalid';
        const hash = await hashPassword(Buffer.from(data.passwords[index]));
        const created = await persistence.createUser({ role: 'PATIENT', email, passwordHash: hash, profile: { displayName } });
        actors.push({ id: created.id, profileId: created.profileId, email, displayName, hash });
      }
      output = actors;
    } else if (data.action === 'snapshot') {
      const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
      const domains = {};
      for (const { tablename } of tables) {
        if (['sessions', 'audit_logs'].includes(tablename)) continue;
        if (!/^[a-z_][a-z0-9_]*$/.test(tablename)) throw new Error();
        const sql = "SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS items FROM public."
          + '"' + tablename + '" t';
        domains[tablename] = createHash('sha256').update(JSON.stringify((await pool.query(sql)).rows[0].items)).digest('hex');
      }
      const sessions = (await pool.query('SELECT count(*)::int AS sessions,'
        + ' count(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked,'
        + ' count(*) FILTER (WHERE revoked_at IS NULL)::int AS active FROM sessions')).rows[0];
      const audits = Object.fromEntries((await pool.query('SELECT action_type, count(*)::int AS n FROM audit_logs GROUP BY action_type'))
        .rows.map(row => [row.action_type, row.n]));
      const unsafelyAudited = (await pool.query("SELECT count(*)::int AS n FROM audit_logs WHERE safe_metadata <> '{}'::jsonb")).rows[0].n;
      output = { domains, ...sessions, audits, unsafelyAudited };
    } else if (data.action === 'migrations') {
      output = (await pool.query('SELECT migration_name,checksum FROM _prisma_migrations ORDER BY migration_name')).rows;
    } else throw new Error();
  } catch {
    process.exitCode = 1;
  } finally {
    try { await persistence?.close(); } catch { process.exitCode = 1; }
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
    '    environment:', '      EH216_PROJECT: ' + project, ...bind('api', 3001), '  web:',
    '    image: ' + project + ':local', ...bind('web', 3000), '  worker:', '    image: ' + project + ':local',
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

async function exercise({ context, origin, actors, passwords, secrets, ledger, observation, receipt, step, outage, ready }) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  let phase = 'accountA';
  let actor = null;
  let authWindow = null;
  const profiles = actors.map(item => item.profileId);
  const markers = item => [item.id, item.profileId, item.email, item.displayName];
  const restricted = active => [...secrets, ...actors.filter(item => item !== active).flatMap(markers)];
  const requestActor = new Map();
  context.on('request', request => {
    try {
      const method = request.method();
      if (method === 'GET') ledger.get(phase);
      const type = requestTarget(request.url(), origin, method, profiles);
      if (type === 'login' || type === 'logout') {
        requireCheck(authWindow === type, 'AUTH_WINDOW');
        ledger.auth(phase, type);
      }
      observation.start(request, type !== 'asset');
      requestActor.set(request, actor);
    } catch (error) {
      observation.fault(error.predicate ?? 'OBSERVER_REQUEST');
      void context.close().catch(() => {});
    }
  });
  const terminal = (request, value) => {
    requestActor.delete(request);
    try { observation.terminal(request, value); } catch { observation.fault('OBSERVER_TERMINAL'); }
  };
  context.on('requestfailed', request => terminal(request, { failed: true }));
  context.on('requestfinished', request => {
    const path = new URL(request.url()).pathname;
    if (!path.startsWith('/api/v1/')) return terminal(request, {});
    const atDispatch = requestActor.get(request);
    void (async () => {
      let scanned = false;
      try {
        const response = await request.response();
        requireCheck(response, 'OBSERVER_RESPONSE_MISSING');
        const bytes = await response.body();
        requireCheck(bytes.length <= 1_000_000, 'OBSERVER_RESPONSE_SIZE');
        const projection = projectAuthText(bytes.toString('utf8'), path, response.status(), atDispatch, secrets);
        requireCheck(scanText(projection.text, restricted(atDispatch)), 'RESPONSE_PRIVACY');
        requireCheck(projection.valid, 'AUTH_PROJECTION_UNSAFE');
        scanned = true;
      } catch (error) { observation.fault(error.predicate ?? 'OBSERVER_BODY_UNAVAILABLE'); }
      finally { terminal(request, { scanned }); }
    })();
  });
  page.on('pageerror', () => { receipt.browserErrors++; });
  const match = (path, method = 'GET') => page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.origin === origin && url.pathname === path && response.request().method() === method;
  });
  const check = async (response, label, expected, type, active, noStore = true) => {
    let raw;
    try { raw = (await response.body()).toString('utf8'); } catch { throw new DiagnosticFailure('CASE_BODY_UNAVAILABLE'); }
    const path = new URL(response.url()).pathname;
    const auth = projectAuthText(raw, path, response.status(), active, secrets);
    const projection = projectedResponse({ text: auth.text, cache: response.headers()['cache-control'], status: response.status() },
      { expected, type, noStore, markers: restricted(active) });
    receipt.statuses.push({ label, ...projection });
    requireCheck(auth.valid, 'AUTH_PROJECTION_UNSAFE');
    requireCheck(projection.pass, 'CASE_HTTP_CONTRACT');
    return type === 'data' || type === 'error' ? parse(raw) : null;
  };
  const request = async (path, label, expected, type, active) => {
    const [response] = await Promise.all([match(path), page.evaluate(async route => {
      const value = await fetch(route, { credentials: 'same-origin', cache: 'no-store' });
      await value.arrayBuffer();
    }, path)]);
    return check(response, label, expected, type, active);
  };
  const surface = async active => {
    await observation.settle();
    const { html, storage } = await page.evaluate(() => ({
      html: globalThis.document.documentElement.outerHTML,
      storage: JSON.stringify([Object.entries(globalThis.localStorage), Object.entries(globalThis.sessionStorage), globalThis.document.cookie]),
    }));
    requireCheck(scanText(html, restricted(active)), 'DOM_PRIVACY');
    requireCheck(scanText(storage, restricted(null)), 'STORAGE_PRIVACY');
    receipt.domScans++;
    receipt.storageScans++;
    requireCheck(receipt.browserErrors === 0, 'BROWSER_PAGE_ERROR');
  };
  const live = async () => {
    await page.locator(LIVE).waitFor();
    requireCheck(await page.locator('[data-session-mode="demo"],.demo-role-links,.demo-button').count() === 0, 'DEMO_FALLBACK');
  };
  const checkActor = async (active, label) => {
    const me = await request(ME, label + '_ME', 200, 'data', active);
    requireCheck(me.data?.user?.id === active.id && me.data.user.email === active.email && me.data.user.role === 'PATIENT', 'CURRENT_ACTOR');
    const cookies = (await context.cookies()).filter(cookie => cookie.name === 'eh_session');
    requireCheck(cookies.length === 1 && cookies[0].httpOnly && !cookies[0].secure
      && cookies[0].sameSite === 'Lax' && cookies[0].path === '/', 'LOCAL_COOKIE_ATTRIBUTES');
    secrets.add(cookies[0].value);
    receipt.cookieChecks.push({ label, currentActor: true, present: true, httpOnly: true, local: true });
    await live();
  };
  const visible = async active => {
    await page.locator('h1').filter({ hasText: active.displayName }).waitFor();
    await surface(active);
    receipt.ownVisible++;
  };
  const readProfile = (active, label) => request('/api/v1/patients/' + active.profileId + '/profile', label, 200, 'data', active);
  const checkProfile = (own, active) => requireCheck(Object.keys(own.data ?? {}).sort().join(',') === 'displayName,id'
    && own.data.id === active.profileId && own.data.displayName === active.displayName, 'OWN_PROFILE');
  const profilesFor = async (active, foreign, label) => {
    checkProfile(await readProfile(active, label + '_OWN'), active);
    const denied = await request('/api/v1/patients/' + foreign.profileId + '/profile', label + '_FOREIGN', 404, 'error', active);
    requireCheck(denied.error.code === 'PATIENT_NOT_FOUND', 'FOREIGN_PROFILE_PROJECTION');
    await surface(active);
  };
  const signIn = async (active, index, label) => {
    actor = active;
    await page.getByLabel('Email address', { exact: true }).fill(active.email);
    await page.getByLabel('Password', { exact: true }).fill(passwords[index]);
    authWindow = 'login';
    try {
      const [response] = await Promise.all([match(LOGIN, 'POST'),
        page.getByRole('button', { name: SIGN_IN, exact: true }).click()]);
      const value = await check(response, label + '_LOGIN', 200, 'data', active);
      requireCheck(value.data?.user?.id === active.id, 'LOGIN_ACTOR');
    } finally { authWindow = null; }
    await live();
    await observation.settle();
    await page.goto(origin + '/patient');
    await checkActor(active, label);
    await visible(active);
  };
  const signOut = async (active, label) => {
    authWindow = 'logout';
    try {
      const [response] = await Promise.all([match(LOGOUT, 'POST'),
        page.getByRole('button', { name: 'Sign out', exact: true }).click()]);
      await check(response, label + '_LOGOUT', 204, 'empty', active);
    } finally { authWindow = null; }
    await page.getByRole('button', { name: SIGN_IN, exact: true }).waitFor();
    await observation.settle();
    actor = null;
    await request(ME, label + '_SIGNED_OUT_ME', 401, 'error', null);
    requireCheck(!(await context.cookies()).some(cookie => cookie.name === 'eh_session'), 'SIGNED_OUT_COOKIE_PRESENT');
    receipt.cookieChecks.push({ label, present: false, signedOut: true });
    await surface(null);
  };

  const [a, b] = actors;
  await step('ACCOUNT_A', async () => {
    await page.goto(origin + '/patient');
    await page.getByRole('button', { name: SIGN_IN, exact: true }).waitFor();
    await observation.settle();
    await signIn(a, 0, 'A');
    await profilesFor(a, b, 'A');
    await signOut(a, 'A');
  });
  phase = 'accountB';
  await step('ACCOUNT_B_HISTORY', async () => {
    await signIn(b, 1, 'B');
    await profilesFor(b, a, 'B');
    await page.goto(origin + SUMMARY);
    await live();
    await surface(b);
    await page.reload();
    await checkActor(b, 'RELOAD');
    await surface(b);
    await page.goBack();
    await checkActor(b, 'BACK');
    await visible(b);
    await page.goForward();
    await checkActor(b, 'FORWARD');
    await surface(b);
  });

  for (const [locale, [language, direction, width, refreshText, emptyText]] of Object.entries(UI)) {
    phase = locale;
    await step(locale === 'english' ? 'RECOVERY_EN' : 'RECOVERY_AR', async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('button', { name: language, exact: true }).click();
      const refresh = () => page.getByRole('button', { name: refreshText, exact: true });
      const empty = () => page.getByText(emptyText, { exact: true });
      await empty().waitFor();
      await surface(b);
      for (const [kind, status] of [['database', 503], ['api', 500]]) {
        const label = locale.toUpperCase() + '_' + kind.toUpperCase();
        await outage(kind, async () => {
          await ready(origin, status, phase, label);
          const [response] = await Promise.all([match(SUMMARY_API), refresh().click()]);
          await check(response, label + '_SUMMARIES', status, kind === 'api' ? 'upstream' : 'error', b, kind !== 'api');
          const error = page.getByRole('alert').first();
          await error.waitFor();
          requireCheck((await error.innerText()).trim() && !await empty().isVisible(), 'OUTAGE_FALSE_EMPTY_OR_ERROR');
          await live();
          await surface(b);
        });
        await ready(origin, 200, phase, label + '_RESTORED');
        const [response] = await Promise.all([match(SUMMARY_API), refresh().click()]);
        await check(response, label + '_RECOVERED', 200, 'data', b);
        await empty().waitFor();
        await checkActor(b, label + '_RESTORE');
        checkProfile(await readProfile(b, label + '_OWN_RESTORED'), b);
        requireCheck(await page.locator('html').getAttribute('dir') === direction, 'RECOVERED_DIRECTION');
        await surface(b);
        receipt.recovery.push({ label, visibleError: true, falseEmpty: false, live: true, direction, ownProfile: true });
      }
      if (locale === 'arabic') {
        await page.getByRole('button', { name: 'English', exact: true }).click();
        await signOut(b, 'B');
      }
    });
  }
  await observation.settle();
}

export async function run(argv) {
  requireCheck(argv.length === 2 && argv[0] === '--evidence-dir' && isAbsolute(argv[1]), 'EXPLICIT_EVIDENCE_DIRECTORY');
  const harness = process.cwd();
  const root = dirname(harness);
  const application = join(root, 'application');
  const evidence = resolve(argv[1]);
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
  let actorMarkers = [];
  const ledger = createLedger();
  const observation = createObservation();
  const receipt = { issue: 216, result: 'FAIL', app: APP, appTree: APP_TREE, harness: gitIn(harness, ['rev-parse', 'HEAD']),
    cases: [], statuses: [], cookieChecks: [], domScans: 0, storageScans: 0, ownVisible: 0, browserErrors: 0, recovery: [],
    staleResponses: 'NOT PROVEN', delayedCookies: 'NOT PROVEN', wrongExistingBooking: 'NOT PROVEN',
    clinicalFixtures: 0, clinicalWrites: null, fixtureCount: null, logScans: 0 };
  let stage = 'TOPOLOGY';
  let browser;
  let image;
  let compose;
  let services;
  let network;
  let commandFailure;
  let preexisting = false;
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
    const item = { id, result: 'FAIL' };
    receipt.cases.push(item);
    await action();
    item.result = 'PASS';
  };
  const fixture = data => {
    const api = inspect('container', services.api.Id);
    requireCheck(api.Config.Labels['com.docker.compose.project'] === project && api.Image === image && api.State.Running,
      'FIXTURE_CONTAINER_OWNERSHIP');
    return parse(docker('FIXTURE', ['exec', '-i', api.Id, 'node', '-e', fixtureProgram()], { input: JSON.stringify(data) }));
  };
  const ready = async (target, expected, phase, label) => {
    requireCheck(target === origin || target === direct, 'HEALTH_TARGET');
    let raw;
    for (let i = 0; i < 6; i++) {
      ledger.get(phase);
      let response;
      try { response = await fetch(target + HEALTH, { redirect: 'error', signal: globalThis.AbortSignal.timeout(3500) }); }
      catch { await wait(300); continue; }
      const text = await response.text();
      requireCheck(text.length < 16000 && scanText(text, [...secrets, ...actorMarkers]), 'HEALTH_PRIVACY');
      raw = { status: response.status, text, cache: response.headers.get('cache-control') };
      if (raw.status === expected) break;
      await wait(300);
    }
    const type = expected === 200 ? 'data' : expected === 503 ? 'error' : 'upstream';
    const item = projectedResponse(raw ?? { status: 0, text: '' }, { expected, type, noStore: false });
    receipt.statuses.push({ label, ...item });
    requireCheck(item.pass, 'HEALTH_STATUS_SHAPE');
    if (expected === 200) requireCheck(parse(raw.text)?.data?.status === 'ok', 'HEALTH_OK_CONTRACT');
    if (expected === 503) requireCheck(parse(raw.text)?.error?.code === 'DATABASE_UNAVAILABLE', 'HEALTH_DATABASE_CONTRACT');
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
  const outage = async (kind, action) => {
    requireCheck(kind === 'database' || kind === 'api', 'OUTAGE_KIND');
    const before = proveLive();
    requireCheck(sameResources(before), 'OUTAGE_RESOURCE_DRIFT');
    ledger.outage();
    const pg = services.postgres.Id;
    const api = services.api.Id;
    const aliases = before.running.postgres.NetworkSettings.Networks[network.Name].Aliases;
    requireCheck(aliases.includes('postgres') && aliases.every(alias => alias === 'postgres' || alias === project + '-postgres-1'),
      'POSTGRES_ALIASES');
    try {
      if (kind === 'database') {
        docker('DATABASE_DISCONNECT', ['network', 'disconnect', network.Id, pg]);
        docker('API_STOP', ['stop', '--time', '10', api]);
        docker('API_START', ['start', api]);
      } else docker('API_STOP', ['stop', '--time', '10', api]);
      await action();
    } finally {
      if (kind === 'database' && !inspect('container', pg).NetworkSettings.Networks[network.Name]) {
        docker('DATABASE_RECONNECT', ['network', 'connect', ...aliases.flatMap(alias => ['--alias', alias]), network.Id, pg]);
      }
      if (!inspect('container', api).State.Running) docker('API_START', ['start', api]);
      requireCheck(sameResources(proveLive()), 'OUTAGE_RESTORE_IDENTITY');
    }
  };

  try {
    await step('TOPOLOGY', async () => {
      const entries = sourceEntries(application);
      const paths = entries.map(([path]) => path);
      manifestInput(paths);
      preexisting = ['container', 'network', 'volume'].some(kind => owned(kind).length > 0) || tagged();
      requireCheck(!preexisting, 'PREEXISTING_OWNED_LABEL');
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
      checkCompose(parse(docker('COMPOSE_CONFIG', [...compose, 'config', '--format', 'json'])), project, ports);
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
      await ready(direct, 200, 'topology', 'DIRECT_HEALTH');
      await ready(origin, 200, 'topology', 'PROXIED_HEALTH');
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

    stage = 'FIXTURES';
    const passwords = Array.from({ length: 2 }, () => randomBytes(32).toString('base64url'));
    for (const password of passwords) secrets.add(password);
    const actors = fixture({ action: 'init', passwords, nonce: project.slice(-12) });
    requireCheck(actors.length === 2 && actors.every(actor => ['id', 'profileId'].every(key =>
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(actor[key])))
      && actors[0].id !== actors[1].id && actors[0].profileId !== actors[1].profileId, 'EXACT_SYNTHETIC_ACTORS');
    actorMarkers = actors.flatMap(({ id, profileId, email, displayName }) => [id, profileId, email, displayName]);
    for (const actor of actors) secrets.add(actor.hash);
    receipt.fixtureCount = 2;
    const before = fixture({ action: 'snapshot' });
    stage = 'BROWSER_LAUNCH';
    browser = await chromium.launch({ headless: true, args: ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
      env: { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' } });
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
    await exercise({ context, origin, actors, passwords, secrets, ledger, observation, receipt, step, outage, ready });
    stage = 'WRITE_LEDGER';
    const after = fixture({ action: 'snapshot' });
    checkWriteLedger(before, after);
    receipt.writes = { clinical: 0, domainSnapshotUnchanged: true, sessions: after.sessions, revoked: after.revoked, audits: after.audits };
    receipt.clinicalWrites = 0;
    receipt.result = 'PASS';
  } catch (error) {
    receipt.failure = { stage, predicate: error instanceof DiagnosticFailure ? error.predicate : 'UNEXPECTED_FAILURE',
      ...(commandFailure ? { command: commandFailure } : {}) };
  } finally {
    if (services) {
      for (const name of ['api', 'web']) {
        try {
          const logs = docker('OWNED_LOG_SCAN', ['logs', services[name].Id], { timeout: 15000 });
          requireCheck(scanText(logs, [...secrets, ...actorMarkers]), 'SERVICE_LOG_PRIVACY');
          receipt.logScans++;
        } catch (error) {
          receipt.result = 'FAIL';
          receipt.logFailure = error instanceof DiagnosticFailure ? error.predicate : 'SERVICE_LOG_UNAVAILABLE';
        }
      }
    }
    const cleanup = { closed: !browser, containers: null, networks: null, volumes: null, image: null, imageId: null, portsReleased: false };
    try { await browser?.close(); cleanup.closed = true; } catch { /* recorded */ }
    if (!preexisting) {
      try { if (compose) docker('COMPOSE_DOWN', [...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10']); }
      catch { receipt.cleanupDownFailure = true; }
      try { if (tagged()) docker('OWNED_IMAGE_REMOVE', ['image', 'rm', tag]); }
      catch { receipt.cleanupImageFailure = true; }
      try {
        cleanup.containers = owned('container').length;
        cleanup.networks = owned('network').length;
        cleanup.volumes = owned('volume').length;
        cleanup.image = tagged();
        cleanup.imageId = Boolean(image && spawnSync('docker', [DOCKER_HOST_ARG, 'image', 'inspect', image],
          { cwd: harness, env, stdio: 'ignore', timeout: 15000 }).status === 0);
        await freePort(ports.api);
        await freePort(ports.web);
        cleanup.portsReleased = true;
        checkCleanup(cleanup);
        requireCheck(!receipt.cleanupDownFailure && !receipt.cleanupImageFailure, 'R13_CLEANUP_COMMAND');
        cleanup.result = 'PASS';
      } catch { /* recorded */ }
    }
    cleanup.result ??= 'FAIL';
    if (cleanup.result !== 'PASS') receipt.result = 'FAIL';
    receipt.R13 = cleanup;
    receipt.observer = observation.report();
    receipt.ledger = ledger.report();
    const serialized = JSON.stringify(receipt, null, 2) + '\n';
    requireCheck(scanText(serialized, [...secrets, ...actorMarkers]), 'RECEIPT_PRIVACY');
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
