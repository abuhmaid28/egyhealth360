/** Issue124 opt-in E2: NEW reconstruction, never the lost reviewed candidate.
 * Application under test is archived from PR123, not the harness branch.
 * No import-time effects; no inherited target, credentials or replay mode.
 * Checkpoints are WIP until measured E2 and exact-head CI earn acceptance.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, realpathSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { dirname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { verifyRewrite } from './verify-web-api-topology.mjs';
import { LEDGER, request as fixtureRequest, program } from './support/f06-live-fixtures.mjs';

export const APPLICATION = '94f3b75476a43ac0118665aecf75a2ce471190b0';
export const ALLOWLIST = Object.freeze([
  'scripts/support/f06-live-fixtures.mjs',
  'scripts/test-ui-live-topology.mjs',
  'tests/ui-live-topology.test.mjs',
]);
export function options(args) {
  const values = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert.ok(['--evidence-dir', '--chromium'].includes(key), 'Unknown E2 option');
    assert.ok(!Object.hasOwn(values, key), 'Duplicate E2 option');
    const value = args[++i]; assert.ok(typeof value === 'string' && value.startsWith('/'));
    values[key] = resolve(value);
  }
  assert.ok(values['--evidence-dir']);
  return { evidence: values['--evidence-dir'], chromium: values['--chromium'] };
}
export function cookieAttributes(header) {
  const [cookie, ...parts] = header.split(';');
  const fields = Object.fromEntries(parts.map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key.toLowerCase(), value.length ? value.join('=') : true];
  }));
  return { name: cookie.split('=')[0], httpOnly: fields.httponly === true,
    secure: fields.secure === true, sameSite: fields.samesite, path: fields.path,
    domainPresent: Object.hasOwn(fields, 'domain'), maxAge: Number(fields['max-age']) };
}
export function leaks(text, markers) {
  return [...new Set(markers)].filter(value => typeof value === 'string' && value.length && text.includes(value)).length;
}
const sha = value => createHash('sha256').update(value).digest('hex');
const UUID = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;

// Only loopback URLs constructed by this harness reach raw transport.
function raw(origin, path, { method = 'GET', headers = {}, body } = {}) {
  const url = new URL(path, origin);
  assert.equal(url.protocol, 'http:'); assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  return new Promise((done, reject) => {
    const transportHeaders = Array.isArray(headers) ? ['Host', url.host, ...headers] : headers;
    const req = httpRequest(url, { method, headers: transportHeaders, timeout: 10000 }, res => {
      const chunks = []; let size = 0;
      res.on('data', part => { size += part.length; if (size > 2000000) req.destroy(new Error('BODY_LIMIT')); else chunks.push(part); });
      res.on('end', () => { const text = Buffer.concat(chunks).toString('utf8'); let json; try { json = JSON.parse(text); } catch { /* shell/upstream error */ } done({ status: res.statusCode, headers: res.headers, text, json }); });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('HTTP_TIMEOUT')));
    if (body !== undefined) req.write(body); req.end();
  });
}
async function port() {
  const s = createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const n = s.address().port;
  await new Promise(r => s.close(r)); return n;
}
async function lifecycle(args, exercise) {
  const o = options(args), repo = realpathSync(process.cwd());
  assert.ok(!existsSync(o.evidence)); mkdirSync(o.evidence, { recursive: true, mode: 0o700 });
  const evidence = realpathSync(o.evidence); assert.ok(evidence !== repo && !evidence.startsWith(repo + sep));
  const context = resolve(evidence, 'application'); mkdirSync(context);
  const project = 'eh124-e2-' + randomUUID().replaceAll('-', '').slice(0, 12);
  const webPort = await port(), apiPort = await port(); assert.notEqual(webPort, apiPort);
  const origin = `http://localhost:${webPort}`, direct = `http://127.0.0.1:${apiPort}`, alternate = `http://127.0.0.1:${webPort}`;
  const env = { PATH: dirname(process.execPath) + ':/usr/local/bin:/usr/bin:/bin', HOME: process.env.HOME,
    POSTGRES_USER: 'eh124_e2', POSTGRES_DB: 'eh124_e2', POSTGRES_PASSWORD: randomBytes(24).toString('hex'), AUTH_BROWSER_ORIGIN: origin, NEXT_TELEMETRY_DISABLED: '1' };
  if (process.env.DOCKER_CONFIG) env.DOCKER_CONFIG = process.env.DOCKER_CONFIG;
  let commandFailure;
  const command = (binary, argv, input, timeout = 60000) => {
    const r = spawnSync(binary, argv, { cwd: repo, env, input, encoding: 'utf8', timeout, maxBuffer: 32000000 });
    if (r.error || r.status !== 0) commandFailure = { tool: binary, operation: argv.filter(v => ['network', 'connect', 'disconnect', 'compose', 'up', 'down', 'rm', 'exec', 'start', 'stop', 'inspect', 'image'].includes(v)).join(' '), exit: r.status,
      staticIpRejected: /user specified IP address|user-configured subnet|user configured subnet/i.test(r.stderr ?? '') };
    assert.ok(!r.error && r.status === 0, 'BOUNDED_COMMAND_FAILED'); return r.stdout.trim();
  };
  const docker = (...argv) => command('docker', ['--host=unix:///var/run/docker.sock', ...argv]);
  const inspect = (kind, id) => JSON.parse(docker(kind, 'inspect', id))[0];
  const resources = kind => docker(...(kind === 'container' ? ['ps', '-aq'] : [kind, 'ls', '-q']), '--filter', `label=com.docker.compose.project=${project}`).split('\n').filter(Boolean);
  const receipt = { issue: 124, result: 'FAIL', project, application: APPLICATION, harnessHead: command('git', ['rev-parse', 'HEAD']),
    sourceHashes: Object.fromEntries(ALLOWLIST.map(p => [p, sha(readFileSync(p))])), plannedWrites: { migrations: 1, ...LEDGER }, actualWrites: {},
    authRequests: { login: 0, logout: 0 }, cases: [], http: [], dom: [], requestCounts: {}, leaks: 0, blockedRequests: 0,
    browserErrors: 0, observations: [], origin, direct, startedAt: new Date().toISOString(),
    productionHTTPS: 'NOT EXECUTED: dev HTTP only; no Secure/__Host cookie certification', E3: 'NOT EXECUTED: no R12/replay/clinical mutation during read journeys' };
  const persist = () => writeFileSync(resolve(evidence, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
  let stage = 'preflight', active, compose, image, containers, fixture, browser;
  const used = new Set(); persist(); // Write inventory exists BEFORE resources/data.
  const check = async (id, label, fn) => {
    stage = id + ':' + label; active = { id, label, result: 'RUNNING' }; receipt.cases.push(active); persist();
    const detail = await fn(); active.result = 'PASS'; if (detail) active.detail = detail; persist(); active = undefined;
  };
  const fixtureCall = (action, input = {}) => {
    if (action !== 'snapshot') { assert.ok(!used.has(action), 'Fixture action cannot replay'); used.add(action); }
    const r = spawnSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', containers.api.Id, 'node', '--input-type=module', '-e', program()],
      { cwd: repo, env, input: fixtureRequest(action, fixture, input), encoding: 'utf8', timeout: 90000, maxBuffer: 2000000 });
    assert.ok(!r.error); const value = JSON.parse(r.stdout);
    if (!value.ok) receipt.fixtureFailure = { phase: value.phase, attempted: value.counts };
    for (const [key, count] of Object.entries(value.counts)) { receipt.actualWrites[key] = (receipt.actualWrites[key] ?? 0) + count; assert.ok(receipt.actualWrites[key] <= LEDGER[key]); }
    assert.ok(value.ok && r.status === 0, 'FIXTURE_FAILED');
    if (action !== 'snapshot') fixture = value.result; persist(); return value.result;
  };
  try {
    assert.equal(command('git', ['status', '--porcelain']), '', 'Commit/push candidate before execution');
    assert.equal(command('git', ['rev-parse', '@{upstream}']), receipt.harnessHead, 'Push checkpoint first');
    assert.deepEqual(command('git', ['diff', '--name-status', APPLICATION, 'HEAD']).split('\n').map(x => x.split('\t')).sort((a, b) => a[1].localeCompare(b[1])), ALLOWLIST.map(p => ['A', p]));
    for (const kind of ['container', 'network', 'volume']) assert.equal(resources(kind).length, 0);
    const entries = command('git', ['ls-tree', '-r', APPLICATION]).split('\n'); assert.equal(entries.length, 1424);
    for (const e of entries) { const [meta, path] = e.split('\t'), bytes = readFileSync(path); assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), meta.split(' ')[2]); }
    command('git', ['archive', '--format=tar', '--output', resolve(evidence, 'candidate.tar'), APPLICATION]); command('tar', ['-xf', resolve(evidence, 'candidate.tar'), '-C', context]);
    env.EH124_CA = process.env.CODEX_PROXY_CERT ?? '/etc/ssl/certs/ca-certificates.crt'; assert.ok(existsSync(env.EH124_CA));
    const override = resolve(evidence, 'compose.e2.yaml'), tag = project + ':local';
    writeFileSync(override, `services:\n  api:\n    image: ${tag}\n    build:\n      secrets: [proxy_ca]\n    environment:\n      EH124_PROJECT: ${project}\n    ports: !override\n      - target: 3001\n        published: "${apiPort}"\n        host_ip: 127.0.0.1\n  web:\n    image: ${tag}\n    ports: !override\n      - target: 3000\n        published: "${webPort}"\n        host_ip: 127.0.0.1\n  worker:\n    image: ${tag}\n  postgres:\n    volumes: !override\n      - type: tmpfs\n        target: /var/lib/postgresql\n        tmpfs:\n          size: 1073741824\nvolumes: !reset {}\nsecrets:\n  proxy_ca:\n    file: \${EH124_CA}\n`);
    compose = ['compose', '--project-name', project, '--env-file', '/dev/null', '-f', resolve(context, 'compose.yaml'), '-f', override];
    const config = JSON.parse(docker(...compose, 'config', '--format', 'json'));
    assert.equal(config.name, project); assert.equal(Object.keys(config.volumes ?? {}).length, 0);
    assert.equal(config.services.postgres.volumes[0].type, 'tmpfs'); assert.ok(!config.services.postgres.ports);
    assert.deepEqual(config.services.api.build.args, { EH_UI_API_ORIGIN: 'http://api:3001' });
    receipt.isolation = { database: 'new project postgres:5432/eh124_e2; tmpfs; not published', runtime: 'constructed values; no inherited application env/.env',
      network: 'dedicated ordinary bridge; outbound technically available, not an egress firewall', targets: ['local Docker socket', origin, direct, alternate, 'project api:3001/postgres:5432', 'build-only official image/package registries via managed proxy'] }; persist();
    stage = 'build'; const buildEnv = { ...env };
    for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) if (process.env[key]) buildEnv[key] = process.env[key];
    const log = openSync(resolve(evidence, 'private-build.log'), 'w', 0o600);
    try { const r = spawnSync('docker', ['--host=unix:///var/run/docker.sock', ...compose, '--progress', 'plain', 'build', 'api'], { cwd: repo, env: buildEnv, stdio: ['ignore', log, log], timeout: 1200000 }); assert.equal(r.status, 0); } finally { closeSync(log); }
    image = inspect('image', tag).Id; receipt.image = image;
    stage = 'start'; command('docker', ['--host=unix:///var/run/docker.sock', ...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120'], undefined, 180000);
    const identify = () => Object.fromEntries(resources('container').map(id => { const c = inspect('container', id); return [c.Config.Labels['com.docker.compose.service'], c]; }));
    containers = identify(); assert.deepEqual(Object.keys(containers).sort(), ['api', 'postgres', 'web', 'worker']);
    for (const [name, c] of Object.entries(containers)) {
      assert.ok(c.State.Running); assert.equal(c.HostConfig.Privileged, false); assert.equal(c.HostConfig.NetworkMode, project + '_default'); assert.equal(Object.keys(c.NetworkSettings.Networks).length, 1);
      assert.ok(c.Mounts.every(m => m.Type === 'tmpfs')); assert.deepEqual(c.Config.Entrypoint, ['docker-entrypoint.sh']);
      if (name !== 'postgres') { assert.equal(c.Image, image); assert.equal(c.Config.User, 'node'); assert.equal(c.Config.WorkingDir, '/app'); assert.equal(c.Mounts.length, 0); }
      assert.ok(!c.Config.Env.some(v => /^(RENDER_API_KEY|NODE_OPTIONS|EH_DEMO_PASSWORD|EH_DEMO_SEED_ENABLED)=/.test(v)));
    }
    const networkId = Object.values(containers.api.NetworkSettings.Networks)[0].NetworkID, network = inspect('network', networkId);
    assert.equal(network.Driver, 'bridge'); assert.equal(network.Internal, false); assert.deepEqual(Object.keys(network.Containers).sort(), Object.values(containers).map(c => c.Id).sort());
    assert.equal(containers.postgres.Image, inspect('image', 'postgres:18.6-bookworm').Id);
    assert.equal(containers.postgres.Mounts.length, 1); assert.equal(containers.postgres.Mounts[0].Destination, '/var/lib/postgresql');
    assert.deepEqual(containers.api.Config.Cmd, ['node', 'apps/api/dist/main.js']); assert.deepEqual(containers.worker.Config.Cmd, ['node', 'apps/experiment-worker/dist/main.js']);
    assert.deepEqual(containers.web.Config.Cmd, ['node', 'apps/web/node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '0.0.0.0']);
    const values = c => Object.fromEntries(c.Config.Env.map(v => { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1)]; }));
    assert.equal(values(containers.api).NODE_ENV, 'development'); assert.equal(values(containers.api).AUTH_BROWSER_ORIGIN, origin); assert.equal(values(containers.api).EH124_PROJECT, project);
    for (const name of ['api', 'worker']) assert.equal(values(containers[name]).DATABASE_URL, `postgresql://eh124_e2:${env.POSTGRES_PASSWORD}@postgres:5432/eh124_e2`);
    for (const key of ['USER', 'PASSWORD', 'DB']) assert.equal(values(containers.postgres)['POSTGRES_' + key], env['POSTGRES_' + key]);
    assert.ok(Object.values(containers.postgres.NetworkSettings.Ports).every(v => v === null));
    for (const [name, internal, published] of [['api', 3001, apiPort], ['web', 3000, webPort]]) assert.deepEqual(containers[name].NetworkSettings.Ports[internal + '/tcp'], [{ HostIp: '127.0.0.1', HostPort: String(published) }]);
    const paths = entries.map(e => e.split('\t')[1]), expected = Object.fromEntries(paths.map(p => [p, sha(readFileSync(resolve(context, p)))]));
    const actual = JSON.parse(command('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', containers.web.Id, 'node', '-e', "let s='';process.stdin.on('data',p=>s+=p);process.stdin.on('end',()=>{const fs=require('node:fs'),c=require('node:crypto');console.log(JSON.stringify(Object.fromEntries(JSON.parse(s).map(p=>[p,c.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))))});"], JSON.stringify(paths)));
    assert.deepEqual(actual, expected); receipt.copiedFiles = paths.length; receipt.copiedSha256 = sha(JSON.stringify(expected));
    const manifest = () => docker('exec', containers.web.Id, 'node', '-e', "process.stdout.write(require('node:fs').readFileSync('apps/web/.next/routes-manifest.json'))");
    const generated = manifest(); verifyRewrite(JSON.parse(generated)); receipt.manifestSha256 = sha(generated); writeFileSync(resolve(evidence, 'routes-manifest.json'), generated);
    assert.equal(docker('exec', containers.web.Id, 'node', '-e', "require('node:dns').lookup('api',{family:4},(e,a)=>{if(e)process.exit(1);console.log(a)})"), Object.values(containers.api.NetworkSettings.Networks)[0].IPAddress);
    await check('R01/R02', 'image/source/namespace and real proxied health', async () => { for (const target of [origin, direct]) { const r = await raw(target, '/api/v1/health'); assert.equal(r.status, 200); assert.deepEqual(r.json, { data: { status: 'ok' } }); } assert.equal((await raw(origin, '/')).status, 200); return { copiedFiles: paths.length, manifestSha256: receipt.manifestSha256, root: 200, direct: 200, proxied: 200 }; });
    stage = 'migrations'; assert.equal(docker('exec', containers.postgres.Id, 'psql', '-U', 'eh124_e2', '-d', 'eh124_e2', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"), '0');
    docker(...compose, 'run', '--rm', '--no-deps', 'api', 'node', 'packages/db/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'packages/db/prisma.config.ts');
    const migrations = JSON.parse(docker('exec', containers.api.Id, 'node', '--input-type=module', '-e', "import {createRequire} from 'node:module';const {Pool}=createRequire('/app/packages/db/package.json')('pg'),p=new Pool({connectionString:process.env.DATABASE_URL});console.log(JSON.stringify((await p.query('SELECT migration_name,checksum FROM _prisma_migrations ORDER BY migration_name')).rows));await p.end();"));
    assert.equal(migrations.length, 22); for (const m of migrations) assert.equal(m.checksum, sha(readFileSync(resolve(context, 'packages/db/prisma/migrations', m.migration_name, 'migration.sql'))));
    receipt.migrations = { deploys: 1, checksums: 22, match: true }; persist();
    stage = 'fixture-initialize'; const password = randomBytes(32).toString('base64url'); fixtureCall('initialize', { password, nonce: project.slice(-12) });
    const canonical = c => ({ image: c.Image, cmd: c.Config.Cmd, entrypoint: c.Config.Entrypoint, env: [...c.Config.Env].sort(), user: c.Config.User, ports: c.HostConfig.PortBindings, network: c.HostConfig.NetworkMode });
    const restore = () => {
      const before = Object.fromEntries(['api', 'web'].map(n => [n, canonical(containers[n])])), ids = Object.fromEntries(Object.entries(containers).map(([n, c]) => [n, c.Id]));
      docker(...compose, 'rm', '--stop', '--force', 'web', 'api'); command('docker', ['--host=unix:///var/run/docker.sock', ...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'api', 'web'], undefined, 180000); containers = identify();
      for (const n of ['api', 'web']) { assert.notEqual(containers[n].Id, ids[n]); assert.deepEqual(canonical(containers[n]), before[n]); }
      for (const n of ['postgres', 'worker']) assert.equal(containers[n].Id, ids[n]); assert.equal(sha(manifest()), receipt.manifestSha256);
      return { sameCandidate: APPLICATION, sameImage: image, sameManifest: true, newApiWeb: true, retainedDisposablePostgresWorker: true, crossVersionRollback: 'NOT EXECUTED' };
    };
    const outage = async (kind, fn) => {
      const pg = Object.values(inspect('container', containers.postgres.Id).NetworkSettings.Networks)[0];
      try { if (kind === 'database') docker('network', 'disconnect', networkId, containers.postgres.Id); docker('stop', '--time', '10', containers.api.Id); if (kind === 'database') docker('start', containers.api.Id); await fn(); }
      finally {
        if (kind === 'database') {
          // This bridge uses Docker-owned IPAM, not a user-defined static
          // subnet. Restore the same service/DNS aliases with Docker allocation.
          docker('network', 'connect', ...pg.Aliases.flatMap(a => ['--alias', a]), networkId, containers.postgres.Id);
          const restored = inspect('container', containers.postgres.Id).NetworkSettings.Networks;
          assert.equal(Object.keys(restored).length, 1); const current = Object.values(restored)[0]; assert.equal(current.NetworkID, networkId); assert.ok(current.IPAddress);
          for (const alias of pg.Aliases) assert.ok(current.Aliases.includes(alias));
          assert.deepEqual(Object.keys(inspect('network', networkId).Containers).sort(), Object.values(containers).map(c => c.Id).sort());
          receipt.databaseNetworkRestores = (receipt.databaseNetworkRestores ?? 0) + 1;
        } else docker('start', containers.api.Id);
      }
    };
    browser = await chromium.launch({ headless: true, env: { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' }, ...(o.chromium ? { executablePath: o.chromium } : {}) });
    const logs = markers => {
      for (const name of ['api', 'web', 'worker']) {
        const v = spawnSync('docker', ['--host=unix:///var/run/docker.sock', 'logs', containers[name].Id], { env, encoding: 'utf8', timeout: 15000, maxBuffer: 8000000 });
        assert.ok(!v.error && v.status === 0); const hits = leaks(v.stdout + v.stderr, [...markers, env.POSTGRES_PASSWORD]); receipt.leaks += hits; assert.equal(hits, 0, 'PROTECTED_LOG_DATA');
        receipt.logChecks = (receipt.logChecks ?? 0) + 1;
      }
    };
    await exercise({ browser, origin, direct, alternate, receipt, check, fixtureCall, fixture: () => fixture, password, runtimeSecrets: [env.POSTGRES_PASSWORD], persist, restore, outage, logs });
    receipt.result = 'PASS';
  } catch (error) {
    if (active) active.result = 'FAIL';
    receipt.failure = { stage, code: 'E2_REJECTED', line: Number(error.stack?.match(/test-ui-live-topology\.mjs:(\d+)/)?.[1] ?? 0), ...(commandFailure ? { command: commandFailure } : {}) };
  } finally {
    let closed = !browser; if (browser) { try { await browser.close(); closed = true; } catch { receipt.result = 'FAIL'; } }
    if (compose) { try { docker(...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10'); const remaining = Object.fromEntries(['container', 'network', 'volume'].map(k => [k, resources(k).length])); assert.ok(Object.values(remaining).every(n => n === 0)); if (image) docker('image', 'rm', project + ':local'); for (const n of [webPort, apiPort]) { const s = createServer(); await new Promise((r, reject) => { s.once('error', reject); s.listen(n, '127.0.0.1', r); }); await new Promise(r => s.close(r)); } assert.ok(closed); receipt.R13 = { result: 'PASS', remaining, browserClosed: closed, portsReleased: true, uniqueTagRemoved: !!image }; } catch { receipt.R13 = { result: 'FAIL' }; receipt.result = 'FAIL'; } }
    receipt.completedAt = new Date().toISOString(); persist(); console.log(JSON.stringify({ result: receipt.result, evidence, cases: receipt.cases.length, failure: receipt.failure }));
  }
  if (receipt.result !== 'PASS') process.exitCode = 1;
}
async function acceptance(s) {
  const { browser, origin, alternate, receipt: r, fixtureCall, fixture: f, password, check } = s;
  const state = { granted: false, authorEnded: false, otherEnded: false, summaryRestricted: false, intentRestricted: false, outage: '' };
  const secrets = [password, ...s.runtimeSecrets, ...f().secretHashes], credentialSecrets = [...secrets];
  const contexts = [], aliases = new WeakMap(), requestRules = new WeakMap(), inflight = new Set(), scans = new Set(), drains = new Set();
  let authWindow = false;
  const sourceMarkers = name => [f().canaries[name], f().sources[name].id, ...f().sources[name].versions.map(v => v.id)];
  const forbidden = alias => {
    let names = ['private', 'draftSummary', 'draftIntent'];
    if (alias === 'doctorA' && !state.authorEnded) names = [];
    if (['patientB', 'admin'].includes(alias) || alias === 'doctorB' && (!state.granted || state.otherEnded) || alias === 'doctorA' && state.authorEnded) names = Object.keys(f().canaries);
    if (state.summaryRestricted) names.push('summary'); if (state.intentRestricted) names.push('intent');
    const values = names.flatMap(sourceMarkers), identity = name => [f().users[name].id, f().users[name].profileId, f().users[name].email, f().users[name].displayName];
    if (alias === 'patientA') values.push(...identity('patientB'), f().otherBooking.id);
    if (alias === 'patientB') values.push(...identity('patientA'), f().booking.id, f().consultation.id);
    if (alias === 'doctorB' && (!state.granted || state.otherEnded)) values.push(...identity('patientA'), ...identity('patientB'), f().booking.id, f().otherBooking.id, f().consultation.id);
    // Author keeps legitimate booking logistics after assignment ends; ADMIN
    // operational identity visibility is not a clinical payload entitlement.
    if (['patientA', 'doctorB'].includes(alias)) for (const name of ['summary', 'intent']) values.push(...f().sources[name].versions.filter(v => v.state === 'DRAFT').map(v => v.id));
    return [...new Set(values)].filter(Boolean);
  };
  const assertClean = (text, markers) => { const n = leaks(text, markers); r.leaks += n; assert.equal(n, 0, 'PROTECTED_DATA'); };
  const settle = async () => {
    const end = Date.now() + 30000;
    while (inflight.size || drains.size) {
      if (Date.now() >= end) r.settleFailure = { reason: 'REQUESTS_NOT_QUIESCENT', paths: [...inflight].map(q => new URL(q.url()).pathname.replace(UUID, ':id')), scans: scans.size, drains: drains.size };
      assert.ok(Date.now() < end, 'REQUESTS_NOT_QUIESCENT'); await delay(50);
    }
    while (scans.size) await Promise.all([...scans]);
    assert.equal(r.leaks, 0); assert.equal(r.blockedRequests, 0); assert.equal(r.observationErrors ?? 0, 0); assert.equal(r.bodyDrainErrors ?? 0, 0);
  };
  const snapshot = () => fixtureCall('snapshot');
  const unchanged = (a, b, auth = false) => {
    assert.equal(b.unsafeAudit, 0);
    for (const table of Object.keys(a.hashes)) if (!(auth && ['sessions', 'audit_logs'].includes(table))) assert.equal(a.hashes[table], b.hashes[table], 'UNEXPECTED_DATABASE_WRITE');
    if (auth) for (const key of new Set([...Object.keys(a.audits), ...Object.keys(b.audits)])) if (!['AUTH_LOGIN', 'AUTH_SESSION_REVOKED'].includes(key)) assert.equal(a.audits[key], b.audits[key]);
  };
  const readOnly = async fn => { await settle(); const before = snapshot(); await fn(); await settle(); unchanged(before, snapshot()); };
  const authentication = async fn => { await settle(); const before = snapshot(); assert.equal(authWindow, false); authWindow = true; try { return await fn(); } finally { authWindow = false; await settle(); unchanged(before, snapshot(), true); } };
  const countAuth = path => { const kind = path.endsWith('/login') ? 'login' : 'logout'; r.authRequests[kind]++; assert.ok(r.authRequests[kind] <= LEDGER[kind + 'Maximum']); };
  const capture = (text, alias, authProjection = false) => assertClean(text, [...forbidden(alias), ...(authProjection ? credentialSecrets : secrets)]);
  const scanDom = async (page, alias) => {
    await page.waitForLoadState('networkidle'); await settle();
    const value = await page.evaluate(() => ({ html: globalThis.document.documentElement.outerHTML + [...globalThis.document.querySelectorAll('input,textarea')].map(e => e.value).join('\n'), visible: globalThis.document.body.innerText,
      storage: JSON.stringify({ local: { ...globalThis.localStorage }, session: { ...globalThis.sessionStorage } }), lang: globalThis.document.documentElement.lang, dir: globalThis.document.documentElement.dir,
      cookie: globalThis.document.cookie, mode: globalThis.localStorage.getItem('eh360-ui-mode') }));
    const cdp = await page.context().newCDPSession(page); const ax = await cdp.send('Accessibility.getFullAXTree'); await cdp.detach();
    // Known caller-supplied route UUIDs can appear in Next navigation/AX URLs.
    // Only hidden state gets this exemption; visible text and API never do.
    const supplied = new Set(new URL(page.url()).pathname.match(UUID) ?? []);
    const hidden = [...forbidden(alias).filter(v => !supplied.has(v)), ...secrets];
    assertClean(value.html, hidden); assertClean(JSON.stringify(ax), hidden); capture(value.visible, alias);
    assertClean(value.storage, [...secrets, ...Object.values(f().canaries), ...Object.values(f().users).flatMap(u => [u.id, u.profileId, u.email, u.displayName])]);
    assertClean(value.cookie, secrets); assert.ok(!value.cookie.includes('eh_session=')); assert.equal(value.mode, 'live');
    assert.equal(await page.locator('[data-session-mode="live"]').count(), 1); assert.equal(await page.locator('[data-session-mode="demo"],.demo-button,.demo-role-links').count(), 0);
    r.dom.push({ actor: alias, lang: value.lang, dir: value.dir, axNodes: ax.nodes.length, leakCount: 0, positiveLive: true, storedSecretsOrClinicalData: 0, suppliedHiddenRouteLocators: supplied.size });
  };
  const browserGet = (page, path, method = 'GET') => page.evaluate(async ({ path, method }) => {
    const response = await globalThis.fetch('/api/v1' + path, { method, credentials: 'same-origin', cache: 'no-store' });
    const text = await response.text(); let json; try { json = JSON.parse(text); } catch { /* actual upstream error */ }
    return { status: response.status, text, json, cache: response.headers.get('cache-control') };
  }, { path, method });
  const get = async (page, path, status, alias, method = 'GET') => {
    const v = await browserGet(page, path, method); r.http.push({ actor: alias, method, path: path.split('?')[0].replace(UUID, ':id'), expected: status, actual: v.status });
    assert.equal(v.status, status); assert.equal(v.cache, 'no-store'); capture(v.text, alias, path === '/auth/me' && status === 200);
    if (status >= 400) assertClean(v.text, path.match(UUID) ?? []); if (method === 'HEAD') assert.equal(v.text, ''); return v;
  };
  const navigate = async (page, path, alias) => { await page.goto(origin + path); await scanDom(page, alias); };
  const loginPage = async alias => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context); aliases.set(context, alias);
    await context.exposeBinding('__eh124BodyObservation', (_source, event, id, code) => {
      assert.match(id, /^[a-f0-9-]{36}$/);
      if (event === 'start') { assert.ok(!drains.has(id)); drains.add(id); }
      else if (event === 'error') { assert.ok(['BODY_READ', 'BODY_TIMEOUT', 'BODY_SIZE'].includes(code)); r.bodyDrainErrors = (r.bodyDrainErrors ?? 0) + 1; r.lastBodyDrainError = code; }
      else { assert.equal(event, 'end'); assert.ok(drains.delete(id)); r.bodyDrains = (r.bodyDrains ?? 0) + 1; }
    });
    await context.addInitScript(() => {
      const nativeFetch = globalThis.fetch;
      globalThis.fetch = async (...args) => {
        const response = await Reflect.apply(nativeFetch, globalThis, args);
        const url = new URL(response.url);
        if (url.origin === globalThis.location.origin && url.pathname.startsWith('/api/v1/')) {
          // Drain one bounded clone, no new HTTP or substituted Response. This
          // changes body-consumption timing; no uninstrumented timing claim.
          const clone = response.clone(), id = globalThis.crypto.randomUUID();
          void (async () => {
            await globalThis.__eh124BodyObservation('start', id);
            let timer, reader, code = 'BODY_READ';
            try {
              reader = clone.body?.getReader(); let bytes = 0;
              await Promise.race([
                (async () => { if (!reader) return; for (;;) { const part = await reader.read(); if (part.done) return; bytes += part.value.byteLength; if (bytes > 2000000) { code = 'BODY_SIZE'; throw new Error('BODY_SIZE'); } } })(),
                new Promise((_, reject) => { timer = globalThis.setTimeout(() => { code = 'BODY_TIMEOUT'; reject(new Error('BODY_TIMEOUT')); }, 15000); }),
              ]);
            } catch {
              if (reader) void reader.cancel().catch(() => {});
              await globalThis.__eh124BodyObservation('error', id, code);
            } finally { globalThis.clearTimeout(timer); await globalThis.__eh124BodyObservation('end', id); }
          })();
        }
        return response;
      };
    });
    await context.route('**/*', async route => {
      const q = route.request(), url = new URL(q.url()), auth = /^\/api\/v1\/auth\/(login|logout)$/.test(url.pathname);
      if (![origin, alternate].includes(url.origin) || !['GET', 'HEAD'].includes(q.method()) && !(authWindow && auth && ['POST', 'OPTIONS'].includes(q.method()))) { r.blockedRequests++; await route.abort(); return; }
      if (q.method() === 'POST' && auth) countAuth(url.pathname);
      await route.continue(); // No mocks/fulfillment; PASS requires zero aborts.
    });
    context.on('request', q => { inflight.add(q); requestRules.set(q, { alias: aliases.get(context), markers: forbidden(aliases.get(context)), outage: state.outage }); const key = q.method() + ' ' + new URL(q.url()).pathname.replace(UUID, ':id'); r.requestCounts[key] = (r.requestCounts[key] ?? 0) + 1; });
    context.on('requestfinished', q => inflight.delete(q)); context.on('requestfailed', q => inflight.delete(q));
    context.on('response', res => {
      const path = new URL(res.url()).pathname; if (!path.startsWith('/api/v1/')) return;
      const rule = requestRules.get(res.request());
      let observation = 'body';
      const pending = (async () => { const text = await res.text(); const auth = /^\/api\/v1\/auth\/(login|me)$/.test(path) && res.status() === 200;
        observation = 'privacy';
        assertClean(text, [...rule.markers, ...(auth ? credentialSecrets : secrets)]);
        observation = 'projection';
        if (auth) { const csrf = JSON.parse(text).data?.csrfToken; if (csrf) secrets.push(csrf); }
        observation = 'cache';
        if (/^\/api\/v1\/(auth|me|patients|consultations)(\/|$)/.test(path) && rule.outage !== 'upstream') assert.equal(res.headers()['cache-control'], 'no-store');
      })().catch(error => { r.observationErrors = (r.observationErrors ?? 0) + 1; r.lastObservationError = { path: path.replace(UUID, ':id'), status: res.status(), observation, kind: error instanceof assert.AssertionError ? 'ASSERTION' : 'BODY_OR_TRANSPORT', resourceGone: /No resource with given identifier/.test(error.message ?? ''), requestFailed: !!res.request().failure() }; }).finally(() => scans.delete(pending)); scans.add(pending);
    });
    const page = await context.newPage(); page.on('pageerror', () => r.browserErrors++);
    const network = await context.newCDPSession(page), loginIds = new Set(), extra = new Map();
    await network.send('Network.enable');
    network.on('Network.requestWillBeSent', e => { if (new URL(e.request.url).pathname === '/api/v1/auth/login' && e.request.method === 'POST') loginIds.add(e.requestId); });
    network.on('Network.requestWillBeSentExtraInfo', e => {
      const headers = Object.fromEntries(Object.entries(e.headers).map(([k, v]) => [k.toLowerCase(), v]));
      const site = headers['sec-fetch-site'];
      extra.set(e.requestId, { originMatches: headers.origin === origin, metadata: ['same-origin', 'same-site', 'none', 'cross-site'].includes(site) ? site : site === undefined ? 'ABSENT' : 'INVALID' });
    });
    await page.goto(origin); await page.getByRole('button', { name: 'Sign in with live account', exact: true }).waitFor();
    await authentication(async () => {
      await page.getByLabel('Email address', { exact: true }).fill(f().users[alias].email); await page.getByLabel('Password', { exact: true }).fill(password);
      const next = page.waitForRequest(q => new URL(q.url()).pathname === '/api/v1/auth/login' && q.method() === 'POST');
      const response = page.waitForResponse(v => new URL(v.url()).pathname === '/api/v1/auth/login' && v.request().method() === 'POST');
      await page.getByRole('button', { name: 'Sign in with live account', exact: true }).click(); const headers = await (await next).allHeaders();
      assert.equal((await response).status(), 200); await page.locator('[data-session-mode="live"]').waitFor(); await page.waitForLoadState('networkidle');
      const wire = [...loginIds].map(id => extra.get(id)).filter(Boolean); assert.equal(wire.length, 1);
      r.browserLoginHeaders ??= []; r.browserLoginHeaders.push({ actor: alias, requestOriginMatches: headers.origin === origin, ...wire[0] });
      assert.equal(wire[0].originMatches, true);
      // EH-006 explicitly permits absent Fetch Metadata with mandatory Origin
      // and X-EH-Login. Raw probes below prove both present and absent branches.
      assert.ok(['same-origin', 'same-site', 'none', 'ABSENT'].includes(wire[0].metadata));
    });
    await network.detach();
    const cookie = (await context.cookies()).find(c => c.name === 'eh_session'); assert.ok(cookie); secrets.push(cookie.value); credentialSecrets.push(cookie.value); return page;
  };
  const cookie = async page => { const c = (await page.context().cookies()).find(c => c.name === 'eh_session'); assert.ok(c); return 'eh_session=' + c.value; };
  const rawLogin = async (alias, previous, metadata) => {
    countAuth('/login'); const v = await raw(origin, '/api/v1/auth/login', { method: 'POST', headers: { Origin: origin, 'X-EH-Login': '1', 'Content-Type': 'application/json', ...(previous ? { Cookie: previous } : {}), ...(metadata ? { 'Sec-Fetch-Site': metadata } : {}) }, body: JSON.stringify({ email: f().users[alias].email, password }) });
    assert.equal(v.status, 200); assert.equal(v.headers['cache-control'], 'no-store'); const token = v.headers['set-cookie'][0].split(';')[0], csrf = v.json.data.csrfToken;
    secrets.push(token.split('=')[1], csrf); credentialSecrets.push(token.split('=')[1]); return { ...v, cookie: token, csrf };
  };
  const allPrivate = () => [...secrets, ...Object.values(f().canaries), ...Object.values(f().users).flatMap(u => [u.id, u.profileId, u.email, u.displayName])];
  const safeError = v => {
    assert.equal(v.headers['cache-control'], 'no-store'); assert.deepEqual(Object.keys(v.json), ['error']); assert.deepEqual(Object.keys(v.json.error).sort(), ['code', 'message']);
    assertClean(v.text, allPrivate()); assert.ok(!/postgresql:|SELECT |INSERT |stack|password_hash/i.test(v.text)); return v;
  };
  const rawLogout = async (token, csrf) => { countAuth('/logout'); const v = await raw(origin, '/api/v1/auth/logout', { method: 'POST', headers: { Origin: origin, Cookie: token, 'Content-Type': 'application/json', ...(csrf === undefined ? {} : { 'X-CSRF-Token': csrf }) }, body: '{}' }); if (v.status >= 400) safeError(v); if (v.status === 204) { assert.equal(v.headers['cache-control'], 'no-store'); assert.equal(cookieAttributes(v.headers['set-cookie'][0]).maxAge, 0); assert.equal(v.text, ''); } return v; };
  const meRaw = async token => { const v = await raw(origin, '/api/v1/auth/me', { headers: token ? { Cookie: token } : {} }); if (v.status >= 400) safeError(v); return v; };
  const tokenHash = value => sha(Buffer.from(value.split('=')[1], 'base64url'));
  const recover = async () => { for (let i = 0; i < 25; i++) { try { if ((await raw(origin, '/api/v1/health')).status === 200) return; } catch { /* GET readiness */ } await delay(500); } assert.fail('RECOVERY_TIMEOUT'); };
  let patient, patientB, author, other, admin;
  try {
  await check('R04', 'browser login/me/cookie/no renewal or stored credentials', async () => {
    patient = await loginPage('patientA'); const c = (await patient.context().cookies()).find(c => c.name === 'eh_session');
    assert.equal(c.httpOnly, true); assert.equal(c.secure, false); assert.equal(c.sameSite, 'Lax'); assert.equal(c.path, '/'); assert.equal(c.domain, 'localhost');
    await readOnly(async () => { const v = await get(patient, '/auth/me', 200, 'patientA'); assert.deepEqual(Object.keys(v.json.data).sort(), ['csrfToken', 'session', 'user']); assert.deepEqual(Object.keys(v.json.data.user).sort(), ['email', 'id', 'role']); assert.deepEqual(Object.keys(v.json.data.session), ['expiresAt']); assert.equal(v.json.data.user.id, f().users.patientA.id); assert.match(v.json.data.csrfToken, /^[A-Za-z0-9_-]{43}$/); assert.equal((await meRaw(await cookie(patient))).headers['set-cookie'], undefined); assert.equal((await patient.context().cookies()).find(c => c.name === 'eh_session').expires, c.expires); await scanDom(patient, 'patientA'); });
  });
  await check('R05/R06', 'raw invalid cookie/rotation/current session CSRF/logout', async () => {
    await authentication(async () => {
      const a = await rawLogin('patientA'), attributes = cookieAttributes(a.headers['set-cookie'][0]); assert.deepEqual({ ...attributes, maxAge: 0 }, { name: 'eh_session', httpOnly: true, secure: false, sameSite: 'Lax', path: '/', domainPresent: false, maxAge: 0 }); assert.ok(attributes.maxAge > 28000 && attributes.maxAge <= 28800);
      for (const token of [undefined, 'eh_session=bad', 'eh_session=' + randomBytes(32).toString('base64url'), a.cookie + '; ' + a.cookie]) { const v = await meRaw(token); assert.equal(v.status, 401); assert.equal(v.json.error.code, 'AUTH_UNAUTHENTICATED'); assert.equal(cookieAttributes(v.headers['set-cookie'][0]).maxAge, 0); }
      const b = await rawLogin('patientB', a.cookie); assert.notEqual(b.csrf, a.csrf); assert.equal((await meRaw(a.cookie)).status, 401);
      for (const csrf of [undefined, '', 'bad', a.csrf]) { const v = await rawLogout(b.cookie, csrf); assert.equal(v.status, 403); assert.equal(v.json.error.code, 'AUTH_CSRF_INVALID'); }
      countAuth('/logout'); assert.equal(safeError(await raw(origin, '/api/v1/auth/logout', { method: 'POST', headers: ['Origin', origin, 'Cookie', b.cookie, 'X-CSRF-Token', b.csrf, 'X-CSRF-Token', b.csrf, 'Content-Type', 'application/json'], body: '{}' })).status, 403);
      assert.equal((await meRaw(b.cookie)).status, 200); assert.equal((await rawLogout(b.cookie, b.csrf)).status, 204); assert.equal((await meRaw(b.cookie)).status, 401); assert.equal((await rawLogout(b.cookie, b.csrf)).status, 401);
    });
  });
  await check('R05', 'inactive/expired/revoked synthetic actors/sessions', async () => {
    fixtureCall('disable'); await authentication(async () => { countAuth('/login'); const v = safeError(await raw(origin, '/api/v1/auth/login', { method: 'POST', headers: { Origin: origin, 'X-EH-Login': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f().users.patientB.email, password }) })); assert.equal(v.status, 401); assert.equal(v.json.error.code, 'AUTH_INVALID_CREDENTIALS'); }); fixtureCall('enable');
    let expired, revoked; await authentication(async () => { expired = await rawLogin('patientB'); revoked = await rawLogin('patientB'); });
    fixtureCall('expire', { tokenHash: tokenHash(expired.cookie) }); fixtureCall('revoke', { tokenHash: tokenHash(revoked.cookie) });
    await readOnly(async () => { for (const v of [expired, revoked]) assert.equal((await meRaw(v.cookie)).status, 401); });
  });
  await check('R07', 'raw Origin/Fetch Metadata/JSON/request guards', async () => {
    const base = { Origin: origin, 'X-EH-Login': '1', 'Content-Type': 'application/json' }, body = JSON.stringify({ email: f().users.patientA.email, password });
    const variants = [
      ['missingOrigin', Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'Origin')), body, 403],
      ['missingLogin', Object.fromEntries(Object.entries(base).filter(([k]) => k !== 'X-EH-Login')), body, 403],
      ...[['blankOrigin', { Origin: '' }], ['otherOrigin', { Origin: alternate }], ['crossSite', { 'Sec-Fetch-Site': 'cross-site' }], ['invalidMetadata', { 'Sec-Fetch-Site': 'invalid' }], ['sameSiteNoBypass', { Origin: alternate, 'Sec-Fetch-Site': 'same-site' }], ['badLogin', { 'X-EH-Login': '' }]].map(([name, extra]) => [name, { ...base, ...extra }, body, 403]),
      ['duplicateOrigin', ['Origin', origin, 'Origin', origin, 'X-EH-Login', '1', 'Content-Type', 'application/json'], body, 403],
      ['duplicateMetadata', ['Origin', origin, 'Sec-Fetch-Site', 'same-origin', 'Sec-Fetch-Site', 'same-origin', 'X-EH-Login', '1', 'Content-Type', 'application/json'], body, 403],
      ['media', { ...base, 'Content-Type': 'text/plain' }, body, 415], ['malformed', base, '{', 400], ['oversized', base, '{"x":"' + 'a'.repeat(17000) + '"}', 413], ['badCredentials', base, JSON.stringify({ email: f().users.patientA.email, password: 'wrong synthetic value' }), 401],
    ];
    await authentication(async () => { for (const [variant, headers, payload, status] of variants) { countAuth('/login'); const v = safeError(await raw(origin, '/api/v1/auth/login', { method: 'POST', headers, body: payload })); assert.equal(v.status, status); r.http.push({ variant, path: '/auth/login', expected: status, actual: v.status, sanitized: true }); } });
    await authentication(async () => { for (const metadata of ['same-origin', 'same-site', 'none']) { const v = await rawLogin('patientB', undefined, metadata); assert.equal((await rawLogout(v.cookie, v.csrf)).status, 204); r.http.push({ variant: metadata, path: '/auth/login', expected: 200, actual: v.status }); } });
    const context = await browser.newContext();
    try { await context.route('**/*', async route => { const q = route.request(), u = new URL(q.url()); if (![origin, alternate].includes(u.origin) || !['GET', 'HEAD'].includes(q.method()) && !(authWindow && u.pathname === '/api/v1/auth/login' && ['POST', 'OPTIONS'].includes(q.method()))) { r.blockedRequests++; await route.abort(); } else { if (q.method() === 'POST') countAuth('/login'); await route.continue(); } }); const page = await context.newPage(); await page.goto(alternate); const before = snapshot();
      await authentication(async () => { const denied = await page.evaluate(async ({ origin, email, password }) => { try { await globalThis.fetch(origin + '/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'X-EH-Login': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return false; } catch { return true; } }, { origin, email: f().users.patientA.email, password }); assert.equal(denied, true); }); unchanged(before, snapshot());
    } finally { await context.close(); }
  });
  await check('R08/R10', 'fixture close/private sign do not implicitly release drafts', async () => { await readOnly(async () => { assert.equal(f().consultation.state, 'CLOSED'); for (const path of ['/me/summaries', '/me/follow-up-intents']) assert.equal((await get(patient, path, 200, 'patientA')).json.meta.total, 0); await get(patient, '/me/summaries/' + f().sources.draftSummary.id, 404, 'patientA'); await navigate(patient, '/patient/summaries', 'patientA'); }); });
  fixtureCall('release');
  await check('R08', 'patient-own/IDOR/nonexistent/count/HEAD and real UI reads', async () => {
    patientB = await loginPage('patientB'); await readOnly(async () => {
      const own = await get(patient, '/me/bookings', 200, 'patientA'); assert.equal(own.json.meta.total, 1); assert.equal(own.json.data[0].id, f().booking.id);
      const denied = await get(patient, '/me/bookings/' + f().otherBooking.id, 404, 'patientA'), absent = await get(patient, '/me/bookings/' + randomUUID(), 404, 'patientA'); assert.deepEqual(denied.json, absent.json);
      await get(patient, '/patients/' + f().users.patientB.profileId + '/profile', 404, 'patientA'); await get(patientB, '/me/bookings/' + f().otherBooking.id, 200, 'patientB'); await get(patientB, '/me/summaries/' + f().sources.summary.id, 404, 'patientB');
      for (const [path, name] of [['summaries', 'summary'], ['follow-up-intents', 'intent']]) { assert.equal((await get(patient, '/me/' + path + '?page=1&pageSize=1', 200, 'patientA')).json.meta.total, 1); await get(patient, '/me/' + path + '/' + f().sources[name].id, 200, 'patientA'); await get(patient, '/me/' + path + '/' + f().sources[name].id, 200, 'patientA', 'HEAD'); }
      for (const path of ['/patient/appointments/' + f().booking.id, '/patient/summaries', '/patient/follow-up']) await navigate(patient, path, 'patientA'); await navigate(patientB, '/patient/summaries', 'patientB');
    });
  });
  await check('R09/R10', 'current treating author versus booked-unassigned/other doctor/ADMIN', async () => {
    author = await loginPage('doctorA'); other = await loginPage('doctorB'); admin = await loginPage('admin');
    await readOnly(async () => {
      const documents = '/consultations/' + f().consultation.id + '/documents/';
      await get(author, '/me/bookings/' + f().booking.id + '/consultation', 200, 'doctorA'); await get(author, '/me/bookings/' + f().otherBooking.id, 200, 'doctorA'); await get(author, '/me/bookings/' + f().otherBooking.id + '/consultation', 404, 'doctorA'); await get(author, documents + f().sources.private.id, 200, 'doctorA');
      for (const [alias, page] of [['doctorB', other], ['admin', admin]]) { await get(page, '/patients/' + f().users.patientA.profileId + '/summaries', 404, alias); await get(page, documents + f().sources.private.id, 404, alias); await get(page, '/me/bookings/' + f().booking.id + '/consultation', 404, alias); await navigate(page, '/doctor/consultation/' + f().booking.id + '/documentation', alias); }
      await navigate(author, '/doctor/consultation/' + f().booking.id + '/documentation', 'doctorA');
    });
  });
  fixtureCall('grantOther'); state.granted = true;
  await check('R09/R10', 'separate current grant allows released sources, never private authoring', async () => { await readOnly(async () => { await get(other, '/patients/' + f().users.patientA.profileId + '/summaries/' + f().sources.summary.id, 200, 'doctorB'); await get(other, '/patients/' + f().users.patientA.profileId + '/follow-up-intents/' + f().sources.intent.id, 200, 'doctorB'); await get(other, '/consultations/' + f().consultation.id + '/documents/' + f().sources.private.id, 404, 'doctorB'); await other.goto(origin + '/doctor/summaries'); await other.getByLabel('Patient record locator', { exact: true }).fill(f().users.patientA.profileId); await other.getByRole('button', { name: 'View released summaries', exact: true }).click(); await scanDom(other, 'doctorB'); }); });
  await check('R14', 'same-candidate API/web restore retains session and safe read boundaries', async () => {
    await settle(); const before = snapshot(); s.logs(allPrivate()); const proof = s.restore(); await recover(); await patient.reload(); await get(patient, '/auth/me', 200, 'patientA'); await get(patient, '/me/bookings/' + f().otherBooking.id, 404, 'patientA'); await get(patient, '/me/summaries/' + f().sources.summary.id, 200, 'patientA'); await get(other, '/consultations/' + f().consultation.id + '/documents/' + f().sources.private.id, 404, 'doctorB'); await settle(); unchanged(before, snapshot());
    await authentication(async () => { const v = await rawLogin('patientB'); assert.equal((await rawLogout(v.cookie, v.csrf)).status, 204); }); await scanDom(patient, 'patientA'); r.R14 = { result: 'PASS', ...proof };
  });
  await check('R09', 'suspension denies clinic context but not independent released history', async () => {
    fixtureCall('suspend'); await readOnly(async () => { await get(author, '/me/bookings/' + f().booking.id + '/consultation', 404, 'doctorA'); await get(patient, '/me/summaries/' + f().sources.summary.id, 200, 'patientA'); await get(other, '/patients/' + f().users.patientA.profileId + '/summaries/' + f().sources.summary.id, 200, 'doctorB'); }); fixtureCall('restore'); await readOnly(async () => { await get(author, '/me/bookings/' + f().booking.id + '/consultation', 200, 'doctorA'); });
  });
  await check('R10', 'independent restrictions suppress ordinary details/counts, retain immutable versions', async () => {
    await settle(); const before = snapshot(); fixtureCall('restrictSummary'); state.summaryRestricted = true;
    await readOnly(async () => { await get(patient, '/me/summaries/' + f().sources.summary.id, 404, 'patientA'); assert.equal((await get(patient, '/me/summaries', 200, 'patientA')).json.meta.total, 0); await get(patient, '/me/follow-up-intents/' + f().sources.intent.id, 200, 'patientA'); await get(other, '/patients/' + f().users.patientA.profileId + '/summaries/' + f().sources.summary.id, 404, 'doctorB'); await navigate(patient, '/patient/summaries', 'patientA'); });
    fixtureCall('restrictIntent'); state.intentRestricted = true; await readOnly(async () => { await get(patient, '/me/follow-up-intents/' + f().sources.intent.id, 404, 'patientA'); assert.equal((await get(patient, '/me/follow-up-intents', 200, 'patientA')).json.meta.total, 0); await navigate(patient, '/patient/follow-up', 'patientA'); });
    const after = snapshot(); for (const name of ['consultation_document_versions', 'follow_up_intent_versions']) assert.equal(before.hashes[name], after.hashes[name]);
  });
  await check('R09', 'ended membership/grants recheck clinical authority, preserve legitimate logistics', async () => {
    fixtureCall('endMembership'); await readOnly(async () => { await get(author, '/me/bookings/' + f().booking.id + '/consultation', 404, 'doctorA'); await get(author, '/consultations/' + f().consultation.id + '/documents/' + f().sources.private.id, 200, 'doctorA'); });
    fixtureCall('endOther'); state.otherEnded = true; fixtureCall('endAuthor'); state.authorEnded = true;
    await readOnly(async () => { for (const [alias, page] of [['doctorA', author], ['doctorB', other]]) { for (const path of ['/patients/' + f().users.patientA.profileId + '/profile', '/patients/' + f().users.patientA.profileId + '/summaries', '/consultations/' + f().consultation.id + '/documents/' + f().sources.private.id]) await get(page, path, 404, alias); await navigate(page, '/doctor/consultation/' + f().booking.id + '/documentation', alias); } await get(author, '/me/bookings/' + f().booking.id, 200, 'doctorA'); });
  });
  await check('R11', 'real browser database503/upstream500 error/recovery EN/AR without Demo', async () => {
    for (const locale of ['en', 'ar']) {
      await patient.goto(origin + '/patient/summaries'); await patient.getByRole('button', { name: locale === 'ar' ? 'العربية' : 'English', exact: true }).click(); await patient.setViewportSize({ width: locale === 'ar' ? 390 : 1440, height: 900 }); await patient.waitForLoadState('networkidle');
      const refresh = () => patient.getByRole('button', { name: locale === 'ar' ? 'تحديث التوثيق المتاح للعرض' : 'Refresh visible documentation', exact: true });
      const empty = () => patient.getByText(locale === 'ar' ? 'لا توجد ملخصات منشورة متاحة للعرض' : 'No visible released summaries', { exact: true });
      await readOnly(async () => {
        for (const [kind, status] of [['database', 503], ['upstream', 500]]) {
          state.outage = kind;
          try { await s.outage(kind, async () => {
            let health; for (let i = 0; i < 20; i++) { try { const v = await raw(origin, '/api/v1/health'); if (v.status === status) { health = v; break; } } catch { /* GET readiness */ } await delay(500); } assert.equal(health?.status, status);
            if (kind === 'database') assert.equal(health.json.error.code, 'DATABASE_UNAVAILABLE'); else assert.equal(health.text.trim(), 'Internal Server Error');
            const next = patient.waitForResponse(v => new URL(v.url()).pathname === '/api/v1/me/summaries' && v.request().method() === 'GET'); await refresh().click(); assert.equal((await next).status(), status);
            const alert = patient.getByRole('alert').first(); await alert.waitFor({ state: 'visible' }); assert.ok((await alert.innerText()).trim()); assert.equal(await empty().isVisible(), false); await scanDom(patient, 'patientA');
            r.observations.push({ locale, width: locale === 'ar' ? 390 : 1440, failedRead: status, visibleError: true, falseEmpty: false, live: true });
          }); } finally { state.outage = ''; }
          await recover(); await refresh().click(); await empty().waitFor({ state: 'visible' });
        }
        await get(patient, '/auth/me', 200, 'patientA'); await scanDom(patient, 'patientA'); assert.equal(await patient.evaluate(() => globalThis.document.documentElement.dir), locale === 'ar' ? 'rtl' : 'ltr');
      });
    }
    r.observations.push({ F03: 'OPEN; critical Arabic fallback unchanged', F04: 'OPEN; initial EN/LTR SSR unchanged; only post-effect recovery checked' });
  });
  await check('R05/R11', 'UI logout/account switch/reload/Back/Forward clears prior patient data', async () => {
    await patient.getByRole('button', { name: 'English', exact: true }).click(); await authentication(async () => { await patient.getByRole('button', { name: 'Sign out', exact: true }).click(); await patient.getByRole('button', { name: 'Sign in with live account', exact: true }).waitFor(); assert.ok(!(await patient.context().cookies()).some(c => c.name === 'eh_session')); });
    await settle(); aliases.set(patient.context(), 'patientB');
    await authentication(async () => { await patient.getByLabel('Email address', { exact: true }).fill(f().users.patientB.email); await patient.getByLabel('Password', { exact: true }).fill(password); await patient.getByRole('button', { name: 'Sign in with live account', exact: true }).click(); await patient.locator('[data-session-mode="live"]').waitFor(); await patient.waitForLoadState('networkidle'); });
    await readOnly(async () => { assert.equal((await get(patient, '/auth/me', 200, 'patientB')).json.data.user.id, f().users.patientB.id); await patient.goto(origin + '/patient/appointments/' + f().booking.id); await patient.reload(); await patient.goBack(); await patient.goForward(); await get(patient, '/me/bookings/' + f().booking.id, 404, 'patientB'); await scanDom(patient, 'patientB'); });
  });
  await settle(); assert.equal(r.browserErrors, 0); r.finalRows = snapshot().rows;
  for (const context of contexts) await context.close();
  } finally { s.logs(allPrivate()); }
}
async function main() { await lifecycle(process.argv.slice(2), acceptance); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('E2_PREFLIGHT_REJECTED'); process.exitCode = 1; });
}
