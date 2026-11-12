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
    const req = httpRequest(url, { method, headers, timeout: 10000 }, res => {
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
  const command = (binary, argv, input, timeout = 60000) => {
    const r = spawnSync(binary, argv, { cwd: repo, env, input, encoding: 'utf8', timeout, maxBuffer: 32000000 });
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
      finally { if (kind === 'database') docker('network', 'connect', '--ip', pg.IPAddress, ...pg.Aliases.flatMap(a => ['--alias', a]), networkId, containers.postgres.Id); else docker('start', containers.api.Id); }
    };
    browser = await chromium.launch({ headless: true, env: { PATH: env.PATH, HOME: env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' }, ...(o.chromium ? { executablePath: o.chromium } : {}) });
    await exercise({ browser, origin, direct, alternate, receipt, check, fixtureCall, fixture: () => fixture, password, persist, restore, outage });
    receipt.result = 'PASS';
  } catch (error) {
    if (active) active.result = 'FAIL';
    receipt.failure = { stage, code: 'E2_REJECTED', line: Number(error.stack?.match(/test-ui-live-topology\.mjs:(\d+)/)?.[1] ?? 0) };
  } finally {
    let closed = !browser; if (browser) { try { await browser.close(); closed = true; } catch { receipt.result = 'FAIL'; } }
    if (compose) { try { docker(...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '10'); const remaining = Object.fromEntries(['container', 'network', 'volume'].map(k => [k, resources(k).length])); assert.ok(Object.values(remaining).every(n => n === 0)); if (image) docker('image', 'rm', project + ':local'); for (const n of [webPort, apiPort]) { const s = createServer(); await new Promise((r, reject) => { s.once('error', reject); s.listen(n, '127.0.0.1', r); }); await new Promise(r => s.close(r)); } assert.ok(closed); receipt.R13 = { result: 'PASS', remaining, browserClosed: closed, portsReleased: true, uniqueTagRemoved: !!image }; } catch { receipt.R13 = { result: 'FAIL' }; receipt.result = 'FAIL'; } }
    receipt.completedAt = new Date().toISOString(); persist(); console.log(JSON.stringify({ result: receipt.result, evidence, cases: receipt.cases.length, failure: receipt.failure }));
  }
  if (receipt.result !== 'PASS') process.exitCode = 1;
}
async function main() {
  options(process.argv.slice(2));
  // WIP lifecycle checkpoint: no execution until acceptance is implemented.
  void lifecycle; void delay; void UUID;
  throw new Error('E2_WIP_NOT_EXECUTABLE');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('E2_WIP_NOT_EXECUTABLE'); process.exitCode = 1; });
}
