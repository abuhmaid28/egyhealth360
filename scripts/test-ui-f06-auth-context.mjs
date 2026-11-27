/**
 * Issue #203 (G2-Q1) opt-in bounded auth-context diagnostic runner.
 * Preserves R01/R02, R04 browser observer/login, and R05/R06 raw session sequence
 * with scan-before-failure sanitized projections.
 * Never imports f06-live-fixtures.mjs or schedules the full E2 clinical matrix.
 * No import-time side effects.
 */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { dirname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { verifyRewrite } from './verify-web-api-topology.mjs';
import {
  ALLOWLIST,
  APPLICATION,
  AUTH_LEDGER,
  HARNESS_BASE,
  OMITTED_HISTORICAL_VARIABLES,
  assertDatabaseWrites,
  assertIsolatedComposeConfig,
  assertLoopbackHttpUrl,
  assertObserverQuiescent,
  assertOwnedProject,
  buildDomScanPolicy,
  cookieAttributes,
  createBudgetTracker,
  createObserverMetrics,
  finalizeSafeReceipt,
  inspectAuthResponse,
  parseOptions,
  scanAuthorizedResponse,
  scanSensitiveText,
  sha256Hex,
  summarizeBrowserCookieState,
} from './support/f06-auth-context.mjs';

export { APPLICATION, HARNESS_BASE, ALLOWLIST, AUTH_LEDGER };

/**
 * Generates an auth-only setup/snapshot inline module for the isolated API container.
 * Strictly bounded to 2 synthetic PATIENT identities and read-only table hashing.
 */
export function authSetupProgram() {
  return `(${authOnlyWorker.toString()})(${JSON.stringify(AUTH_LEDGER)})`;
}

async function authOnlyWorker(limits) {
  const { default: assertModule } = await import('node:assert/strict');
  const { createRequire } = await import('node:module');
  const { createHash: nodeCreateHash } = await import('node:crypto');
  const { Buffer: NodeBuffer } = await import('node:buffer');
  const { Pool } = createRequire('/app/packages/db/package.json')('pg');
  const db = await import('/app/packages/db/dist/index.js');
  const { hashPassword } = await import('/app/apps/api/dist/password.js');

  let pool;
  let persistence;
  let output;
  let phase = 'input';
  const counts = { identities: 0 };

  try {
    let raw = '';
    for await (const chunk of process.stdin) {
      raw += chunk;
      assertModule.ok(raw.length < 100000);
    }
    const { action, input } = JSON.parse(raw);
    assertModule.ok(['initialize', 'snapshot'].includes(action), 'AUTH_SETUP_ACTION_REJECTED');

    const url = new URL(process.env.DATABASE_URL);
    assertModule.equal(url.protocol, 'postgresql:');
    assertModule.equal(url.hostname, 'postgres');
    assertModule.equal(url.port, '5432');
    assertModule.equal(url.pathname, '/eh203_q1');
    assertModule.equal(url.username, 'eh203_q1');
    assertModule.ok(url.password.length >= 32);
    assertModule.equal(url.search + url.hash, '');
    assertModule.equal(process.env.NODE_ENV, 'development');
    assertModule.match(process.env.EH203_PROJECT ?? '', /^eh203-q1-[a-f0-9]{12}$/);

    pool = new Pool({ connectionString: url.href, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    persistence = db.createPersistence(url.href);

    if (action === 'initialize') {
      phase = 'initialize';
      assertModule.equal((await pool.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 0);
      assertModule.match(input?.nonce ?? '', /^[a-f0-9]{12}$/);
      assertModule.ok(typeof input?.password === 'string' && input.password.length >= 32);
      const passwordHash = await hashPassword(NodeBuffer.from(input.password));
      const users = {};
      for (const alias of ['patientA', 'patientB']) {
        counts.identities += 1;
        assertModule.ok(counts.identities <= limits.identities, 'IDENTITY_BUDGET_EXCEEDED');
        const displayName = `Synthetic Q1 ${alias} ${input.nonce}`;
        users[alias] = await persistence.createUser({
          email: `${alias.toLowerCase()}-${input.nonce}@q1.example.invalid`,
          passwordHash,
          role: 'PATIENT',
          profile: { displayName },
        });
        users[alias].displayName = displayName;
      }
      output = { ok: true, result: { users, secretHashes: [passwordHash] }, counts };
    } else {
      phase = 'snapshot';
      const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
      const hashes = {};
      const rows = {};
      for (const name of tables) {
        assertModule.match(name, /^[a-z_][a-z0-9_]*$/);
        const value = (await pool.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM public."${name}" t`)).rows[0].value;
        rows[name] = value.length;
        hashes[name] = nodeCreateHash('sha256').update(JSON.stringify(value)).digest('hex');
      }
      const audits = Object.fromEntries((await pool.query('SELECT action_type, count(*)::int AS n FROM audit_logs GROUP BY action_type')).rows.map(r => [r.action_type, r.n]));
      const unsafeAudit = (await pool.query("SELECT count(*)::int AS n FROM audit_logs WHERE safe_metadata <> '{}'::jsonb")).rows[0].n;
      output = { ok: true, result: { hashes, rows, audits, unsafeAudit }, counts };
    }
  } catch {
    output = { ok: false, phase, counts };
  } finally {
    let closed = true;
    if (persistence) {
      try { await persistence.close(); } catch { closed = false; }
    }
    if (pool) {
      try { await pool.end(); } catch { closed = false; }
    }
    if (!closed) output = { ok: false, phase: 'cleanup', counts };
  }
  process.stdout.write(JSON.stringify(output));
  if (!output.ok) process.exitCode = 1;
}

export function buildComposeOverrideYaml({ project, tag, apiPort, webPort }) {
  assertOwnedProject(project);
  assert.ok(Number.isInteger(apiPort) && apiPort >= 1024 && apiPort <= 65535);
  assert.ok(Number.isInteger(webPort) && webPort >= 1024 && webPort <= 65535);
  assert.notEqual(apiPort, webPort);
  return [
    'services:',
    '  api:',
    `    image: ${tag}`,
    '    build:',
    '      secrets: [proxy_ca]',
    '    environment:',
    `      EH203_PROJECT: ${project}`,
    '    ports: !override',
    '      - target: 3001',
    `        published: "${apiPort}"`,
    '        host_ip: 127.0.0.1',
    '  web:',
    `    image: ${tag}`,
    '    ports: !override',
    '      - target: 3000',
    `        published: "${webPort}"`,
    '        host_ip: 127.0.0.1',
    '  worker:',
    `    image: ${tag}`,
    '  postgres:',
    '    volumes: !override',
    '      - type: tmpfs',
    '        target: /var/lib/postgresql',
    '        tmpfs:',
    '          size: 1073741824',
    'volumes: !reset {}',
    'secrets:',
    '  proxy_ca:',
    '    file: ${EH203_CA}',
    '',
  ].join('\n');
}

export async function rawHttpRequest(origin, path, { method = 'GET', headers = {}, body } = {}) {
  const url = assertLoopbackHttpUrl(new URL(path, origin));
  const startedAt = Date.now();
  return new Promise((done, reject) => {
    const transportHeaders = Array.isArray(headers) ? ['Host', url.host, ...headers] : headers;
    const req = httpRequest(url, { method, headers: transportHeaders, timeout: 10000 }, res => {
      const chunks = [];
      let size = 0;
      res.on('data', part => {
        size += part.length;
        if (size > 2000000) req.destroy(new Error('BODY_LIMIT'));
        else chunks.push(part);
      });
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          /* Upstream or non-JSON body captured safely in projection. */
        }
        done({
          status: res.statusCode,
          headers: res.headers,
          text,
          json,
          elapsedMs: Date.now() - startedAt,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('HTTP_TIMEOUT')));
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function allocateLoopbackPort() {
  const server = createServer();
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address();
  await new Promise(resolveClose => server.close(resolveClose));
  return port;
}

async function verifyPortFree(portNumber) {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(portNumber, '127.0.0.1', resolveListen);
  });
  await new Promise(resolveClose => server.close(resolveClose));
}

export async function cleanupOwnedResources({ browser, compose, docker, listResources, project, imageBuilt, ports }) {
  assertOwnedProject(project);
  let browserClosed = !browser;
  if (browser) {
    try {
      await browser.close();
      browserClosed = true;
    } catch {
      browserClosed = false;
    }
  }
  let remaining = { container: 0, network: 0, volume: 0 };
  let composeDownOk = !compose;
  let uniqueTagRemoved = !imageBuilt;
  let portsReleased = false;
  if (compose) {
    try {
      docker(...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10');
      remaining = Object.fromEntries(['container', 'network', 'volume'].map(kind => [kind, listResources(kind).length]));
      composeDownOk = Object.values(remaining).every(n => n === 0);
    } catch {
      composeDownOk = false;
    }
  }
  if (imageBuilt) {
    try {
      docker('image', 'rm', `${project}:local`);
      uniqueTagRemoved = true;
    } catch {
      uniqueTagRemoved = false;
    }
  }
  try {
    for (const p of ports ?? []) await verifyPortFree(p);
    portsReleased = true;
  } catch {
    portsReleased = false;
  }
  const ok = composeDownOk && uniqueTagRemoved && portsReleased && browserClosed;
  return {
    result: ok ? 'PASS' : 'FAIL',
    remaining,
    browserClosed,
    portsReleased,
    uniqueTagRemoved,
  };
}

export async function runAuthContextDiagnostic(args) {
  const opts = parseOptions(args);
  const repo = realpathSync(process.cwd());
  assert.ok(!existsSync(opts.evidence), 'EVIDENCE_DIR_MUST_NOT_EXIST');
  mkdirSync(opts.evidence, { recursive: true, mode: 0o700 });
  const evidence = realpathSync(opts.evidence);
  assert.ok(evidence !== repo && !evidence.startsWith(repo + sep), 'EVIDENCE_OUTSIDE_REPO_REQUIRED');

  const contextDir = resolve(evidence, 'application');
  mkdirSync(contextDir);
  const project = assertOwnedProject('eh203-q1-' + randomUUID().replaceAll('-', '').slice(0, 12));
  const webPort = await allocateLoopbackPort();
  const apiPort = await allocateLoopbackPort();
  assert.notEqual(webPort, apiPort);

  const origin = `http://localhost:${webPort}`;
  const direct = `http://127.0.0.1:${apiPort}`;
  const alternate = `http://127.0.0.1:${webPort}`;
  const env = {
    PATH: `${dirname(process.execPath)}:/usr/local/bin:/usr/bin:/bin`,
    HOME: process.env.HOME ?? '',
    POSTGRES_USER: 'eh203_q1',
    POSTGRES_DB: 'eh203_q1',
    POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
    AUTH_BROWSER_ORIGIN: origin,
    NEXT_TELEMETRY_DISABLED: '1',
  };
  if (process.env.DOCKER_CONFIG) env.DOCKER_CONFIG = process.env.DOCKER_CONFIG;

  let commandFailure;
  const runCommand = (binary, argv, input, timeout = 60000) => {
    const r = spawnSync(binary, argv, { cwd: repo, env, input, encoding: 'utf8', timeout, maxBuffer: 32000000 });
    if (r.error || r.status !== 0) {
      commandFailure = {
        tool: binary,
        operation: argv.filter(v => ['config', 'compose', 'up', 'down', 'rm', 'exec', 'inspect', 'image', 'ps', 'network', 'volume'].includes(v)).join(' '),
        exit: r.status,
      };
    }
    assert.ok(!r.error && r.status === 0, 'BOUNDED_COMMAND_FAILED');
    return r.stdout.trim();
  };
  const docker = (...argv) => runCommand('docker', ['--host=unix:///var/run/docker.sock', ...argv]);
  const inspect = (kind, id) => JSON.parse(docker(kind, 'inspect', id))[0];
  const listResources = kind => docker(...(kind === 'container' ? ['ps', '-aq'] : [kind, 'ls', '-q']), '--filter', `label=com.docker.compose.project=${project}`).split('\n').filter(Boolean);

  const budget = createBudgetTracker(AUTH_LEDGER);
  const observer = createObserverMetrics();
  const receipt = {
    issue: 203,
    result: 'FAIL',
    project,
    application: APPLICATION,
    harnessBase: HARNESS_BASE,
    harnessHead: runCommand('git', ['rev-parse', 'HEAD']),
    sourceHashes: Object.fromEntries(ALLOWLIST.map(p => [p, sha256Hex(readFileSync(p))])),
    plannedWrites: { ...AUTH_LEDGER },
    actualWrites: { identities: 0, clinical: 0 },
    authRequests: { login: 0, logout: 0 },
    omittedHistoricalVariables: [...OMITTED_HISTORICAL_VARIABLES],
    cases: [],
    rawCases: [],
    browserCookieStates: {},
    observer,
    leaks: 0,
    blockedRequests: 0,
    browserErrors: 0,
    logChecks: 0,
    origin,
    direct,
    startedAt: new Date().toISOString(),
  };

  let allSecrets = [env.POSTGRES_PASSWORD];
  const persist = () => {
    const { serialized } = finalizeSafeReceipt(receipt, allSecrets);
    writeFileSync(resolve(evidence, 'receipt.json'), serialized, { mode: 0o600 });
  };

  let stage = 'preflight';
  let activeCase;
  let compose;
  let imageBuilt = false;
  let containers;
  let browser;
  persist();

  const runStageCase = async (id, label, fn) => {
    stage = `${id}:${label}`;
    activeCase = { id, label, result: 'RUNNING' };
    receipt.cases.push(activeCase);
    persist();
    const detail = await fn();
    activeCase.result = 'PASS';
    if (detail) activeCase.detail = detail;
    persist();
    activeCase = undefined;
  };

  try {
    assert.equal(runCommand('git', ['status', '--porcelain']), '', 'CLEAN_WORKTREE_REQUIRED');
    const changedFromHarnessBase = runCommand('git', ['diff', '--name-status', HARNESS_BASE, 'HEAD'])
      .split('\n')
      .filter(Boolean)
      .map(line => line.split('\t'))
      .sort((a, b) => a[1].localeCompare(b[1]));
    assert.deepEqual(changedFromHarnessBase, ALLOWLIST.map(p => ['A', p]), 'HARNESS_SCOPE_ALLOWLIST_MISMATCH');
    const entries = runCommand('git', ['ls-tree', '-r', APPLICATION]).split('\n');
    assert.equal(entries.length, 1424, 'APPLICATION_TREE_COUNT_MISMATCH');
    for (const entry of entries) {
      const [meta, path] = entry.split('\t');
      const bytes = readFileSync(path);
      const expectedHash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      assert.equal(expectedHash, meta.split(' ')[2], `APPLICATION_FILE_DRIFT:${path}`);
    }
    for (const kind of ['container', 'network', 'volume']) assert.equal(listResources(kind).length, 0);

    runCommand('git', ['archive', '--format=tar', '--output', resolve(evidence, 'candidate.tar'), APPLICATION]);
    runCommand('tar', ['-xf', resolve(evidence, 'candidate.tar'), '-C', contextDir]);

    env.EH203_CA = process.env.CODEX_PROXY_CERT ?? '/etc/ssl/certs/ca-certificates.crt';
    assert.ok(existsSync(env.EH203_CA), 'PROXY_CA_CERT_REQUIRED');
    const overridePath = resolve(evidence, 'compose.q1.yaml');
    const tag = `${project}:local`;
    writeFileSync(overridePath, buildComposeOverrideYaml({ project, tag, apiPort, webPort }));
    compose = ['compose', '--project-name', project, '--env-file', '/dev/null', '-f', resolve(contextDir, 'compose.yaml'), '-f', overridePath];
    const parsedConfig = JSON.parse(docker(...compose, 'config', '--format', 'json'));
    assertIsolatedComposeConfig(parsedConfig, project, apiPort, webPort);

    stage = 'build';
    const buildEnv = { ...env };
    for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) {
      if (process.env[key]) buildEnv[key] = process.env[key];
    }
    const buildLogFd = openSync(resolve(evidence, 'private-build.log'), 'w', 0o600);
    try {
      const buildRes = spawnSync('docker', ['--host=unix:///var/run/docker.sock', ...compose, '--progress', 'plain', 'build', 'api'], {
        cwd: repo,
        env: buildEnv,
        stdio: ['ignore', buildLogFd, buildLogFd],
        timeout: 1200000,
      });
      assert.equal(buildRes.status, 0, 'COMPOSE_BUILD_FAILED');
    } finally {
      closeSync(buildLogFd);
    }
    imageBuilt = true;
    const imageId = inspect('image', tag).Id;
    receipt.image = imageId;

    stage = 'start';
    docker(...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120');
    const identify = () => Object.fromEntries(listResources('container').map(id => {
      const info = inspect('container', id);
      return [info.Config.Labels['com.docker.compose.service'], info];
    }));
    containers = identify();
    assert.deepEqual(Object.keys(containers).sort(), ['api', 'postgres', 'web', 'worker']);
    assert.equal(containers.postgres.Image, inspect('image', 'postgres:18.6-bookworm').Id);
    for (const [svcName, c] of Object.entries(containers)) {
      assert.equal(c.State.Running, true, `CONTAINER_NOT_RUNNING:${svcName}`);
      assert.equal(c.HostConfig.Privileged, false, `PRIVILEGED_CONTAINER:${svcName}`);
      assert.equal(c.HostConfig.NetworkMode, `${project}_default`, `NETWORK_MODE_DRIFT:${svcName}`);
      assert.equal(Object.keys(c.NetworkSettings.Networks).length, 1, `NETWORK_COUNT_DRIFT:${svcName}`);
      assert.ok(c.Mounts.every(m => m.Type === 'tmpfs'), `NON_TMPFS_MOUNT:${svcName}`);
      if (svcName !== 'postgres') {
        assert.equal(c.Image, imageId, `IMAGE_MISMATCH:${svcName}`);
        assert.equal(c.Mounts.length, 0, `UNEXPECTED_MOUNT:${svcName}`);
      }
    }
    assert.equal(containers.postgres.Mounts.length, 1, 'POSTGRES_MOUNT_COUNT');
    assert.equal(containers.postgres.Mounts[0].Destination, '/var/lib/postgresql', 'POSTGRES_MOUNT_DEST');
    assert.ok(Object.values(containers.postgres.NetworkSettings.Ports).every(v => v === null), 'POSTGRES_PORT_EXPOSED');
    assert.ok(Object.values(containers.worker.NetworkSettings.Ports).every(v => v === null), 'WORKER_PORT_EXPOSED');
    assert.deepEqual(containers.api.NetworkSettings.Ports['3001/tcp'], [{ HostIp: '127.0.0.1', HostPort: String(apiPort) }]);
    assert.deepEqual(containers.web.NetworkSettings.Ports['3000/tcp'], [{ HostIp: '127.0.0.1', HostPort: String(webPort) }]);

    const paths = entries.map(e => e.split('\t')[1]);
    const expectedFiles = Object.fromEntries(paths.map(p => [p, sha256Hex(readFileSync(resolve(contextDir, p)))]));
    const actualFiles = JSON.parse(docker('exec', '-i', containers.web.Id, 'node', '-e',
      "let s='';process.stdin.on('data',p=>s+=p);process.stdin.on('end',()=>{const fs=require('node:fs'),c=require('node:crypto');console.log(JSON.stringify(Object.fromEntries(JSON.parse(s).map(p=>[p,c.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))))});",
      JSON.stringify(paths)));
    assert.deepEqual(actualFiles, expectedFiles);
    receipt.copiedFiles = paths.length;
    receipt.copiedSha256 = sha256Hex(JSON.stringify(expectedFiles));

    const manifestRaw = docker('exec', containers.web.Id, 'node', '-e', "process.stdout.write(require('node:fs').readFileSync('apps/web/.next/routes-manifest.json'))");
    verifyRewrite(JSON.parse(manifestRaw));
    receipt.manifestSha256 = sha256Hex(manifestRaw);

    await runStageCase('R01/R02', 'image/source/namespace and real proxied health', async () => {
      for (const target of [origin, direct]) {
        const res = await rawHttpRequest(target, '/api/v1/health');
        assert.equal(res.status, 200);
        assert.deepEqual(res.json, { data: { status: 'ok' } });
      }
      assert.equal((await rawHttpRequest(origin, '/')).status, 200);
      return { copiedFiles: paths.length, manifestSha256: receipt.manifestSha256, root: 200, direct: 200, proxied: 200 };
    });

    stage = 'migrations';
    assert.equal(docker('exec', containers.postgres.Id, 'psql', '-U', 'eh203_q1', '-d', 'eh203_q1', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"), '0');
    docker(...compose, 'run', '--rm', '--no-deps', 'api', 'node', 'packages/db/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'packages/db/prisma.config.ts');
    const migrations = JSON.parse(docker('exec', containers.api.Id, 'node', '--input-type=module', '-e',
      "import {createRequire} from 'node:module';const {Pool}=createRequire('/app/packages/db/package.json')('pg'),p=new Pool({connectionString:process.env.DATABASE_URL});console.log(JSON.stringify((await p.query('SELECT migration_name,checksum FROM _prisma_migrations ORDER BY migration_name')).rows));await p.end();"));
    assert.equal(migrations.length, 22);
    for (const m of migrations) {
      assert.equal(m.checksum, sha256Hex(readFileSync(resolve(contextDir, 'packages/db/prisma/migrations', m.migration_name, 'migration.sql'))));
    }
    receipt.migrations = { deploys: 1, checksums: 22, match: true };

    stage = 'auth-setup';
    const setupCall = (action, input = {}) => {
      const res = spawnSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', containers.api.Id, 'node', '--input-type=module', '-e', authSetupProgram()], {
        cwd: repo,
        env,
        input: JSON.stringify({ action, input }),
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 2000000,
      });
      assert.ok(!res.error && res.status === 0, 'AUTH_SETUP_FAILED');
      const parsed = JSON.parse(res.stdout);
      assert.ok(parsed.ok, 'AUTH_SETUP_REJECTED');
      return parsed.result;
    };

    const password = randomBytes(32).toString('base64url');
    const setup = setupCall('initialize', { password, nonce: project.slice(-12) });
    budget.recordIdentity();
    budget.recordIdentity();
    receipt.actualWrites.identities = 2;
    const users = setup.users;
    const userMarkers = Object.values(users).flatMap(u => [u.id, u.profileId, u.email, u.displayName]);
    const credentialSecrets = [password, env.POSTGRES_PASSWORD, ...setup.secretHashes];
    const runtimeSecrets = [...credentialSecrets];
    allSecrets = [...runtimeSecrets, ...userMarkers];
    persist();

    browser = await chromium.launch({
      headless: true,
      env: { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' },
      ...(opts.chromium ? { executablePath: opts.chromium } : {}),
    });

    const inflight = new Set();
    const scans = new Set();
    const drains = new Set();
    const staleCsrfTokens = [];
    let currentBrowserCsrf = null;
    let authWindow = false;
    const assertClean = (text, markers, patterns) => {
      const scan = scanSensitiveText(text, markers, patterns);
      receipt.leaks += scan.leaksDetected;
      assert.equal(scan.leaksDetected, 0, 'PROTECTED_DATA');
    };
    const settle = async () => {
      const deadline = Date.now() + 30000;
      while (inflight.size || drains.size) {
        assert.ok(Date.now() < deadline, 'REQUESTS_NOT_QUIESCENT');
        await delay(50);
      }
      while (scans.size) await Promise.all([...scans]);
      assertObserverQuiescent(observer, { inflight: inflight.size, drains: drains.size, scans: scans.size });
      assert.equal(receipt.leaks, 0);
      assert.equal(receipt.blockedRequests, 0);
    };
    const snapshot = () => setupCall('snapshot');
    const runReadOnlyWindow = async fn => {
      await settle();
      const before = snapshot();
      const result = await fn();
      await settle();
      assertDatabaseWrites(before, snapshot(), { allowAuthMutations: false });
      return result;
    };
    const runAuthWindow = async fn => {
      await settle();
      const before = snapshot();
      assert.equal(authWindow, false);
      authWindow = true;
      let result;
      try {
        result = await fn();
      } finally {
        authWindow = false;
      }
      await settle();
      assertDatabaseWrites(before, snapshot(), { allowAuthMutations: true });
      return result;
    };
    const scanDom = async (page, alias) => {
      await page.waitForLoadState('networkidle');
      await settle();
      const value = await page.evaluate(() => ({
        html: globalThis.document.documentElement.outerHTML
          + [...globalThis.document.querySelectorAll('input,textarea')].map(e => e.value).join('\n'),
        visible: globalThis.document.body.innerText,
        storage: JSON.stringify({ local: { ...globalThis.localStorage }, session: { ...globalThis.sessionStorage } }),
        cookie: globalThis.document.cookie,
        mode: globalThis.localStorage.getItem('eh360-ui-mode'),
      }));
      const cdp = await page.context().newCDPSession(page);
      const ax = await cdp.send('Accessibility.getFullAXTree');
      await cdp.detach();
      const policy = buildDomScanPolicy({
        activeActor: users[alias],
        allUsers: users,
        runtimeSecrets,
        staleCsrfTokens,
      });
      assertClean(value.html, policy.domMarkers, policy.patterns);
      assertClean(JSON.stringify(ax), policy.domMarkers, policy.patterns);
      assertClean(value.visible, policy.domMarkers, policy.patterns);
      assertClean(value.storage, policy.storageMarkers, policy.patterns);
      assertClean(value.cookie, policy.cookieMarkers, policy.patterns);
      assert.ok(!value.cookie.includes('eh_session='), 'HTTPONLY_COOKIE_EXPOSED_TO_DOM');
      assert.equal(value.mode, 'live');
      assert.equal(await page.locator('[data-session-mode="live"]').count(), 1);
      assert.equal(await page.locator('[data-session-mode="demo"],.demo-button,.demo-role-links').count(), 0);
      return { actor: alias, axNodes: ax.nodes.length };
    };
    const recordAuth = path => {
      const kind = path.endsWith('/login') ? 'login' : 'logout';
      budget.recordAuthRequest(kind);
      receipt.authRequests = budget.snapshot();
    };

    let patientPage;
    let browserCookieDigest = null;

    await runStageCase('R04', 'browser observer, UI login, /auth/me, cookie attrs, no renewal', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.exposeBinding('__eh203BodyObservation', (_source, event, id, code) => {
        assert.match(id, /^[a-f0-9-]{36}$/);
        if (event === 'start') {
          drains.add(id);
          observer.drainsStarted += 1;
        } else if (event === 'error') {
          if (code === 'BODY_CANCELLED') observer.drainCancelled += 1;
          else observer.drainErrors += 1;
        } else if (event === 'end') {
          drains.delete(id);
          observer.drainsCompleted += 1;
        }
      });
      await context.addInitScript(() => {
        const nativeFetch = globalThis.fetch;
        globalThis.fetch = async (...fetchArgs) => {
          const response = await Reflect.apply(nativeFetch, globalThis, fetchArgs);
          const url = new URL(response.url);
          if (url.origin === globalThis.location.origin && url.pathname.startsWith('/api/v1/')) {
            const clone = response.clone();
            const id = globalThis.crypto.randomUUID();
            void (async () => {
              await globalThis.__eh203BodyObservation('start', id);
              let timer;
              let reader;
              let code = 'BODY_READ';
              try {
                reader = clone.body?.getReader();
                let bytes = 0;
                await Promise.race([
                  (async () => {
                    if (!reader) return;
                    for (;;) {
                      const part = await reader.read();
                      if (part.done) return;
                      bytes += part.value.byteLength;
                      if (bytes > 2000000) { code = 'BODY_SIZE'; throw new Error('BODY_SIZE'); }
                    }
                  })(),
                  new Promise((_, reject) => {
                    timer = globalThis.setTimeout(() => { code = 'BODY_TIMEOUT'; reject(new Error('BODY_TIMEOUT')); }, 15000);
                  }),
                ]);
              } catch {
                if (reader) void reader.cancel().catch(() => {});
                await globalThis.__eh203BodyObservation('error', id, code);
              } finally {
                globalThis.clearTimeout(timer);
                await globalThis.__eh203BodyObservation('end', id);
              }
            })();
          }
          return response;
        };
      });
      await context.route('**/*', async route => {
        const req = route.request();
        const url = new URL(req.url());
        const isAuth = /^\/api\/v1\/auth\/(login|logout)$/.test(url.pathname);
        if (![origin, alternate].includes(url.origin) || (!['GET', 'HEAD'].includes(req.method()) && !(authWindow && isAuth && ['POST', 'OPTIONS'].includes(req.method())))) {
          receipt.blockedRequests += 1;
          await route.abort();
          return;
        }
        if (req.method() === 'POST' && isAuth) recordAuth(url.pathname);
        await route.continue();
      });
      const requestMeta = new WeakMap();
      context.on('request', req => {
        inflight.add(req);
        observer.requestsStarted += 1;
        const reqPath = new URL(req.url()).pathname;
        requestMeta.set(req, {
          method: req.method(),
          path: reqPath,
          actor: users.patientA,
          allowFreshCsrf: authWindow && req.method() === 'POST' && reqPath === '/api/v1/auth/login' && currentBrowserCsrf === null,
        });
      });
      context.on('requestfinished', req => {
        inflight.delete(req);
        observer.requestsFinished += 1;
      });
      context.on('requestfailed', req => {
        inflight.delete(req);
        observer.requestsFailed += 1;
      });
      context.on('response', res => {
        const path = new URL(res.url()).pathname;
        if (!path.startsWith('/api/v1/')) return;
        const meta = requestMeta.get(res.request()) ?? {
          method: res.request().method(),
          path,
          actor: users.patientA,
          allowFreshCsrf: false,
        };
        const endpoint = meta.method === 'POST' && path === '/api/v1/auth/login'
          ? 'AUTH_LOGIN'
          : meta.method === 'GET' && path === '/api/v1/auth/me'
            ? 'AUTH_ME'
            : meta.method === 'GET' && path === '/api/v1/me/profile'
              ? 'ME_PROFILE'
              : 'OTHER_API';
        observer.scansStarted += 1;
        const pending = (async () => {
          const text = await res.text();
          const result = scanAuthorizedResponse({
            text,
            status: res.status(),
            endpoint,
            method: meta.method,
            activeActor: meta.actor,
            allUserMarkers: userMarkers,
            credentialSecrets,
            staleCsrfTokens,
            currentCsrfToken: currentBrowserCsrf,
            allowFreshCsrf: meta.allowFreshCsrf,
          });
          receipt.leaks += result.scan.leaksDetected;
          assert.ok(result.scan.clean, 'PROTECTED_DATA');
          if (res.status() === 200 && result.successScoped) {
            assert.ok(result.shapeValid && result.actorMatch && result.csrfMatch, 'AUTH_OBSERVER_SHAPE_INVALID');
            if (endpoint === 'AUTH_LOGIN' && result.extractedCsrf) {
              currentBrowserCsrf = result.extractedCsrf;
              runtimeSecrets.push(currentBrowserCsrf);
              allSecrets.push(currentBrowserCsrf);
            }
          }
          if (/^\/api\/v1\/(auth|me|patients)(\/|$)/.test(path)) {
            assert.equal(res.headers()['cache-control'], 'no-store');
          }
        })().catch(() => {
          observer.scanErrors += 1;
        }).finally(() => {
          observer.scansCompleted += 1;
          scans.delete(pending);
        });
        scans.add(pending);
      });

      patientPage = await context.newPage();
      patientPage.on('pageerror', () => { receipt.browserErrors += 1; });
      const network = await context.newCDPSession(patientPage);
      const loginIds = new Set();
      const extraHeaders = new Map();
      await network.send('Network.enable');
      network.on('Network.requestWillBeSent', e => {
        if (new URL(e.request.url).pathname === '/api/v1/auth/login' && e.request.method === 'POST') loginIds.add(e.requestId);
      });
      network.on('Network.requestWillBeSentExtraInfo', e => {
        const headers = Object.fromEntries(Object.entries(e.headers).map(([k, v]) => [k.toLowerCase(), v]));
        const site = headers['sec-fetch-site'];
        extraHeaders.set(e.requestId, {
          originMatches: headers.origin === origin,
          metadata: ['same-origin', 'same-site', 'none', 'cross-site'].includes(site) ? site : site === undefined ? 'ABSENT' : 'INVALID',
        });
      });

      await patientPage.goto(origin);
      await patientPage.getByRole('button', { name: 'Sign in with live account', exact: true }).waitFor();
      await runAuthWindow(async () => {
        await patientPage.getByLabel('Email address', { exact: true }).fill(users.patientA.email);
        await patientPage.getByLabel('Password', { exact: true }).fill(password);
        const nextReq = patientPage.waitForRequest(q => new URL(q.url()).pathname === '/api/v1/auth/login' && q.method() === 'POST');
        const nextRes = patientPage.waitForResponse(v => new URL(v.url()).pathname === '/api/v1/auth/login' && v.request().method() === 'POST');
        await patientPage.getByRole('button', { name: 'Sign in with live account', exact: true }).click();
        const reqHeaders = await (await nextReq).allHeaders();
        assert.equal((await nextRes).status(), 200);
        await patientPage.locator('[data-session-mode="live"]').waitFor();
        await patientPage.waitForLoadState('networkidle');
        const wire = [...loginIds].map(id => extraHeaders.get(id)).filter(Boolean);
        assert.equal(wire.length, 1);
        assert.equal(wire[0].originMatches, true);
        assert.ok(['same-origin', 'same-site', 'none', 'ABSENT'].includes(wire[0].metadata));
        receipt.browserLoginHeaders = [{ actor: 'patientA', requestOriginMatches: reqHeaders.origin === origin, ...wire[0] }];
      });
      await network.detach();
      assert.ok(typeof currentBrowserCsrf === 'string' && currentBrowserCsrf.length === 43, 'BROWSER_CSRF_NOT_REGISTERED');

      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name === 'eh_session');
      assert.ok(sessionCookie);
      runtimeSecrets.push(sessionCookie.value);
      credentialSecrets.push(sessionCookie.value);
      allSecrets.push(sessionCookie.value);
      browserCookieDigest = sha256Hex(sessionCookie.value);
      assert.equal(sessionCookie.httpOnly, true);
      assert.equal(sessionCookie.secure, false);
      assert.equal(sessionCookie.sameSite, 'Lax');
      assert.equal(sessionCookie.path, '/');
      assert.equal(sessionCookie.domain, 'localhost');
      receipt.browserCookieStates.afterR04 = summarizeBrowserCookieState(cookies, browserCookieDigest);

      await runReadOnlyWindow(async () => {
        const meInBrowser = await patientPage.evaluate(async () => {
          const r = await globalThis.fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' });
          const text = await r.text();
          return { status: r.status, text, headers: { 'cache-control': r.headers.get('cache-control') ?? undefined } };
        });
        inspectAuthResponse({
          caseId: 'ME_BROWSER_A',
          phase: 'R04',
          endpoint: 'AUTH_ME',
          method: 'GET',
          callSite: 'browserMe:patientA',
          expectedStatus: 200,
          response: meInBrowser,
          activeActor: users.patientA,
          allUserMarkers: userMarkers,
          credentialSecrets,
          staleCsrfTokens,
          currentCsrfToken: currentBrowserCsrf,
        });
        const meRawCheck = await rawHttpRequest(origin, '/api/v1/auth/me', { headers: { Cookie: `eh_session=${sessionCookie.value}` } });
        inspectAuthResponse({
          caseId: 'ME_BROWSER_A',
          phase: 'R04',
          endpoint: 'AUTH_ME',
          method: 'GET',
          callSite: 'browserMeRaw:patientA',
          expectedStatus: 200,
          expectNoSetCookie: true,
          response: meRawCheck,
          activeActor: users.patientA,
          allUserMarkers: userMarkers,
          credentialSecrets,
          staleCsrfTokens,
          currentCsrfToken: currentBrowserCsrf,
        });
        const refreshedCookie = (await context.cookies()).find(c => c.name === 'eh_session');
        assert.ok(Boolean(refreshedCookie && refreshedCookie.expires === sessionCookie.expires), 'SESSION_EXPIRES_CHANGED');
        return scanDom(patientPage, 'patientA');
      });
    });

    await runStageCase('R05/R06', 'raw invalid cookie, rotation, CSRF, logout under active browser observer', async () => {
      const rawCase = async (params) => {
        const response = await rawHttpRequest(origin, params.endpointPath, params.requestInit);
        try {
          const projection = inspectAuthResponse({
            caseId: params.caseId,
            phase: 'R05/R06',
            endpoint: params.endpoint,
            method: params.method,
            callSite: params.callSite,
            expectedStatus: params.expectedStatus,
            expectedCode: params.expectedCode ?? null,
            expectSetCookie: params.expectSetCookie ?? false,
            expectNoSetCookie: params.expectNoSetCookie ?? false,
            expectClearedCookie: params.expectClearedCookie ?? false,
            expectEmptyBody: params.expectEmptyBody ?? false,
            response,
            activeActor: params.activeActor ?? null,
            allUserMarkers: userMarkers,
            credentialSecrets,
            staleCsrfTokens,
            currentCsrfToken: params.currentCsrfToken ?? null,
            allowFreshCsrf: params.allowFreshCsrf ?? false,
          });
          receipt.rawCases.push(projection);
          return { response, projection };
        } catch (error) {
          if (error?.projection) receipt.rawCases.push(error.projection);
          throw error;
        }
      };

      await runAuthWindow(async () => {
        recordAuth('/login');
        const loginA = await rawCase({
          caseId: 'LOGIN_RAW_A',
          endpoint: 'AUTH_LOGIN',
          endpointPath: '/api/v1/auth/login',
          method: 'POST',
          callSite: 'rawLogin:patientA',
          expectedStatus: 200,
          expectSetCookie: true,
          activeActor: users.patientA,
          allowFreshCsrf: true,
          requestInit: {
            method: 'POST',
            headers: { Origin: origin, 'X-EH-Login': '1', 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: users.patientA.email, password }),
          },
        });
        const cookieA = loginA.response.headers['set-cookie'][0].split(';')[0];
        const csrfA = loginA.response.json.data.csrfToken;
        runtimeSecrets.push(cookieA.split('=')[1], csrfA);
        credentialSecrets.push(cookieA.split('=')[1]);
        allSecrets.push(cookieA.split('=')[1], csrfA);
        const attrsA = cookieAttributes(loginA.response.headers['set-cookie'][0]);
        assert.deepEqual({ ...attrsA, maxAge: 0 }, { name: 'eh_session', httpOnly: true, secure: false, sameSite: 'Lax', path: '/', domainPresent: false, maxAge: 0 });
        assert.ok(attrsA.maxAge > 28000 && attrsA.maxAge <= 28800);

        receipt.browserCookieStates.afterRawLoginA = summarizeBrowserCookieState(await patientPage.context().cookies(), browserCookieDigest);

        for (const [caseId, token] of [
          ['ME_ABSENT', undefined],
          ['ME_MALFORMED', 'eh_session=bad'],
          ['ME_UNKNOWN', 'eh_session=' + randomBytes(32).toString('base64url')],
          ['ME_DUPLICATE', `${cookieA}; ${cookieA}`],
        ]) {
          await rawCase({
            caseId,
            endpoint: 'AUTH_ME',
            endpointPath: '/api/v1/auth/me',
            method: 'GET',
            callSite: `meRaw:${caseId}`,
            expectedStatus: 401,
            expectedCode: 'AUTH_UNAUTHENTICATED',
            expectClearedCookie: true,
            currentCsrfToken: csrfA,
            requestInit: { headers: token ? { Cookie: token } : {} },
          });
        }

        staleCsrfTokens.push(csrfA);
        recordAuth('/login');
        const loginB = await rawCase({
          caseId: 'LOGIN_RAW_B_ROTATE',
          endpoint: 'AUTH_LOGIN',
          endpointPath: '/api/v1/auth/login',
          method: 'POST',
          callSite: 'rawLogin:patientB:rotate',
          expectedStatus: 200,
          expectSetCookie: true,
          activeActor: users.patientB,
          allowFreshCsrf: true,
          requestInit: {
            method: 'POST',
            headers: { Origin: origin, 'X-EH-Login': '1', 'Content-Type': 'application/json', Cookie: cookieA },
            body: JSON.stringify({ email: users.patientB.email, password }),
          },
        });
        const cookieB = loginB.response.headers['set-cookie'][0].split(';')[0];
        const csrfB = loginB.response.json.data.csrfToken;
        runtimeSecrets.push(cookieB.split('=')[1], csrfB);
        credentialSecrets.push(cookieB.split('=')[1]);
        allSecrets.push(cookieB.split('=')[1], csrfB);
        assert.ok(sha256Hex(cookieB.split('=')[1]) !== sha256Hex(cookieA.split('=')[1]), 'SESSION_COOKIE_NOT_ROTATED');
        assert.ok(sha256Hex(csrfB) !== sha256Hex(csrfA), 'CSRF_NOT_ROTATED');

        await rawCase({
          caseId: 'ME_ROTATED',
          endpoint: 'AUTH_ME',
          endpointPath: '/api/v1/auth/me',
          method: 'GET',
          callSite: 'meRaw:ME_ROTATED',
          expectedStatus: 401,
          expectedCode: 'AUTH_UNAUTHENTICATED',
          expectClearedCookie: true,
          currentCsrfToken: csrfB,
          requestInit: { headers: { Cookie: cookieA } },
        });

        for (const [caseId, csrf] of [
          ['CSRF_ABSENT', undefined],
          ['CSRF_EMPTY', ''],
          ['CSRF_MALFORMED', 'bad'],
          ['CSRF_OLD', csrfA],
        ]) {
          recordAuth('/logout');
          await rawCase({
            caseId,
            endpoint: 'AUTH_LOGOUT',
            endpointPath: '/api/v1/auth/logout',
            method: 'POST',
            callSite: `rawLogout:${caseId}`,
            expectedStatus: 403,
            expectedCode: 'AUTH_CSRF_INVALID',
            currentCsrfToken: csrfB,
            requestInit: {
              method: 'POST',
              headers: { Origin: origin, Cookie: cookieB, 'Content-Type': 'application/json', ...(csrf === undefined ? {} : { 'X-CSRF-Token': csrf }) },
              body: '{}',
            },
          });
        }

        recordAuth('/logout');
        await rawCase({
          caseId: 'CSRF_DUPLICATE',
          endpoint: 'AUTH_LOGOUT',
          endpointPath: '/api/v1/auth/logout',
          method: 'POST',
          callSite: 'rawLogout:CSRF_DUPLICATE',
          expectedStatus: 403,
          expectedCode: 'AUTH_CSRF_INVALID',
          currentCsrfToken: csrfB,
          requestInit: {
            method: 'POST',
            headers: ['Origin', origin, 'Cookie', cookieB, 'X-CSRF-Token', csrfB, 'X-CSRF-Token', csrfB, 'Content-Type', 'application/json'],
            body: '{}',
          },
        });

        await rawCase({
          caseId: 'ME_ACTIVE_B',
          endpoint: 'AUTH_ME',
          endpointPath: '/api/v1/auth/me',
          method: 'GET',
          callSite: 'meRaw:ME_ACTIVE_B',
          expectedStatus: 200,
          expectNoSetCookie: true,
          activeActor: users.patientB,
          currentCsrfToken: csrfB,
          requestInit: { headers: { Cookie: cookieB } },
        });

        recordAuth('/logout');
        await rawCase({
          caseId: 'LOGOUT_VALID_B',
          endpoint: 'AUTH_LOGOUT',
          endpointPath: '/api/v1/auth/logout',
          method: 'POST',
          callSite: 'rawLogout:LOGOUT_VALID_B',
          expectedStatus: 204,
          expectClearedCookie: true,
          expectEmptyBody: true,
          currentCsrfToken: csrfB,
          requestInit: {
            method: 'POST',
            headers: { Origin: origin, Cookie: cookieB, 'Content-Type': 'application/json', 'X-CSRF-Token': csrfB },
            body: '{}',
          },
        });
        staleCsrfTokens.push(csrfB);

        await rawCase({
          caseId: 'ME_LOGGED_OUT',
          endpoint: 'AUTH_ME',
          endpointPath: '/api/v1/auth/me',
          method: 'GET',
          callSite: 'meRaw:ME_LOGGED_OUT',
          expectedStatus: 401,
          expectedCode: 'AUTH_UNAUTHENTICATED',
          expectClearedCookie: true,
          requestInit: { headers: { Cookie: cookieB } },
        });

        recordAuth('/logout');
        await rawCase({
          caseId: 'LOGOUT_REVOKED',
          endpoint: 'AUTH_LOGOUT',
          endpointPath: '/api/v1/auth/logout',
          method: 'POST',
          callSite: 'rawLogout:LOGOUT_REVOKED',
          expectedStatus: 401,
          expectedCode: 'AUTH_UNAUTHENTICATED',
          expectClearedCookie: true,
          requestInit: {
            method: 'POST',
            headers: { Origin: origin, Cookie: cookieB, 'Content-Type': 'application/json', 'X-CSRF-Token': csrfB },
            body: '{}',
          },
        });

        receipt.browserCookieStates.afterR05R06 = summarizeBrowserCookieState(await patientPage.context().cookies(), browserCookieDigest);
      });

      await runReadOnlyWindow(async () => {
        const browserAfter = await patientPage.evaluate(async () => {
          const r = await globalThis.fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' });
          const text = await r.text();
          return { status: r.status, text, headers: { 'cache-control': r.headers.get('cache-control') ?? undefined } };
        });
        inspectAuthResponse({
          caseId: 'ME_BROWSER_A',
          phase: 'R05/R06',
          endpoint: 'AUTH_ME',
          method: 'GET',
          callSite: 'browserMeAfter:patientA',
          expectedStatus: 200,
          response: browserAfter,
          activeActor: users.patientA,
          allUserMarkers: userMarkers,
          credentialSecrets,
          staleCsrfTokens,
          currentCsrfToken: currentBrowserCsrf,
        });
      });
    });

    for (const containerName of ['api', 'web', 'worker']) {
      const logRes = spawnSync('docker', ['--host=unix:///var/run/docker.sock', 'logs', containers[containerName].Id], {
        env,
        encoding: 'utf8',
        timeout: 15000,
        maxBuffer: 8000000,
      });
      assert.ok(!logRes.error && logRes.status === 0);
      const logScan = scanSensitiveText(logRes.stdout + logRes.stderr, allSecrets);
      receipt.leaks += logScan.leaksDetected;
      assert.equal(logScan.leaksDetected, 0, 'PROTECTED_LOG_DATA');
      receipt.logChecks += 1;
    }

    receipt.result = 'PASS';
  } catch (error) {
    if (activeCase) activeCase.result = 'FAIL';
    receipt.failure = {
      stage,
      code: 'G2_Q1_DIAGNOSTIC_FAILED',
      caseId: error?.caseId ?? null,
      failedPredicates: error?.failedPredicates ?? [],
      line: Number(error?.stack?.match(/test-ui-f06-auth-context\.mjs:(\d+)/)?.[1] ?? 0),
      ...(commandFailure ? { command: commandFailure } : {}),
    };
  } finally {
    receipt.R13 = await cleanupOwnedResources({
      browser,
      compose,
      docker,
      listResources,
      project,
      imageBuilt,
      ports: [webPort, apiPort],
    });
    if (receipt.R13.result !== 'PASS') receipt.result = 'FAIL';
    receipt.completedAt = new Date().toISOString();
    const { receiptSha256 } = finalizeSafeReceipt(receipt, allSecrets);
    receipt.receiptSha256 = receiptSha256;
    const finalSafe = finalizeSafeReceipt(receipt, allSecrets);
    writeFileSync(resolve(evidence, 'receipt.json'), finalSafe.serialized, { mode: 0o600 });
    console.log(JSON.stringify({
      result: receipt.result,
      cases: receipt.cases.length,
      rawCases: receipt.rawCases.length,
      failure: receipt.failure ?? null,
      R13: receipt.R13.result,
      receiptSha256,
    }));
  }

  if (receipt.result !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runAuthContextDiagnostic(process.argv.slice(2)).catch(() => {
    console.error('F06_AUTH_CONTEXT_PREFLIGHT_REJECTED');
    process.exitCode = 1;
  });
}
