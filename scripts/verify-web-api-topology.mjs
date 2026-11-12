/** Issue #122 E1 only. No build, migration, fixture, login or clinical command.
 * Caller owns a fresh isolated stack and its teardown. Optional outage stops
 * only the attested disposable API and restores it in finally. Never use this
 * against a normal developer/CI/hosted stack. Receipt contains no env/log/body.
 * node scripts/verify-web-api-topology.mjs --project eh122-e1-<unique>
 *   --source <clean HEAD> --image sha256:<local image ID>
 *   --web http://localhost:<port> --api http://127.0.0.1:<port>
 *   [--failure-recovery]
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export function topologyOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert.ok(['--project', '--source', '--image', '--web', '--api', '--failure-recovery'].includes(key));
    assert.ok(!Object.hasOwn(options, key));
    options[key] = key === '--failure-recovery' ? true : args[++i];
  }
  assert.match(options['--project'] ?? '', /^eh122-e1-[a-z0-9]{8,32}$/);
  assert.match(options['--source'] ?? '', /^[a-f0-9]{40}$/);
  assert.match(options['--image'] ?? '', /^sha256:[a-f0-9]{64}$/);
  for (const [key, host] of [['--web', 'localhost'], ['--api', '127.0.0.1']]) {
    const url = new URL(options[key]);
    assert.equal(url.protocol, 'http:');
    assert.equal(url.hostname, host);
    assert.ok(url.port && Number(url.port) >= 1024);
    assert.equal(url.href, url.origin + '/');
    assert.equal(url.username + url.password + url.search + url.hash, '');
    options[key] = url.origin;
  }
  assert.notEqual(new URL(options['--web']).port, new URL(options['--api']).port);
  return options;
}

export function verifyRewrite(manifest) {
  assert.equal(manifest.version, 3);
  const rewrites = Array.isArray(manifest.rewrites) ? manifest.rewrites
    : ['beforeFiles', 'afterFiles', 'fallback'].flatMap(key => manifest.rewrites[key] ?? []);
  const api = rewrites.filter(route => route.source === '/api/v1/:path*');
  assert.equal(api.length, 1);
  assert.equal(api[0].destination, 'http://api:3001/api/v1/:path*');
  // This bounded topology has no additional rewrite upstream.
  assert.equal(rewrites.length, 1);
}

const sha256 = value => createHash('sha256').update(value).digest('hex');
// Keep the configured registry/proxy credential location, never inherit
// application secrets, Node hooks or alternate Git/Docker endpoint selectors.
const dockerEnv = Object.fromEntries(['PATH', 'HOME', 'DOCKER_CONFIG'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
function command(binary, args, input) {
  const result = spawnSync(binary, args, {
    encoding: 'utf8', input, env: dockerEnv, timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ok(!result.error && result.status === 0, 'Bounded local inspection failed');
  return result.stdout.trim();
}
const docker = (...args) => command('docker', ['--host=unix:///var/run/docker.sock', ...args]);
const inspect = (kind, id) => JSON.parse(docker(kind, 'inspect', id))[0];
let phase = 'arguments';

async function main() {
  const o = topologyOptions(process.argv.slice(2));
  const project = o['--project'], image = o['--image'];
  const receipt = { result: 'PASS', scope: 'E1 health only; no session/clinical acceptance', project, source: o['--source'], localImageId: image };
  phase = 'source';
  assert.equal(command('git', ['rev-parse', 'HEAD']), o['--source']);
  assert.equal(command('git', ['status', '--porcelain', '--untracked-files=normal']), '');
  receipt.sourceTree = command('git', ['rev-parse', 'HEAD^{tree}']);
  phase = 'isolation';
  const ids = docker('ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`).split('\n').filter(Boolean);
  assert.equal(ids.length, 4);
  const containers = ids.map(id => inspect('container', id));
  const byService = Object.fromEntries(containers.map(c => [c.Config.Labels['com.docker.compose.service'], c]));
  assert.deepEqual(Object.keys(byService).sort(), ['api', 'postgres', 'web', 'worker']);
  const { api, postgres, web, worker } = byService;
  const pgImage = inspect('image', 'postgres:18.6-bookworm');
  assert.equal(postgres.Image, pgImage.Id);
  assert.deepEqual(postgres.Config.Entrypoint, ['docker-entrypoint.sh']);
  assert.deepEqual(postgres.Config.Cmd, ['postgres']);
  receipt.postgresImageId = pgImage.Id;
  const networkIds = new Set();
  for (const c of containers) {
    assert.equal(c.Config.Labels['com.docker.compose.project'], project);
    assert.equal(c.State.Running, true);
    assert.equal(c.HostConfig.Privileged, false);
    assert.equal(c.HostConfig.NetworkMode, `${project}_default`);
    const networks = Object.values(c.NetworkSettings.Networks);
    assert.equal(networks.length, 1);
    networkIds.add(networks[0].NetworkID);
    assert.ok(c.Mounts.every(m => m.Type === 'tmpfs'), 'No persistent or host mounts');
  }
  assert.equal(networkIds.size, 1);
  const network = inspect('network', [...networkIds][0]);
  // Match default Compose ingress: a dedicated ordinary bridge with only
  // loopback publications. This is resource isolation, not an egress firewall.
  assert.equal(network.Driver, 'bridge');
  assert.equal(network.Internal, false);
  assert.equal(network.ConfigOnly, false);
  assert.equal(network.Labels['com.docker.compose.project'], project);
  assert.deepEqual(Object.keys(network.Containers).sort(), containers.map(c => c.Id).sort());
  assert.equal(postgres.Mounts.length, 1);
  assert.equal(postgres.Mounts[0].Destination, '/var/lib/postgresql');
  assert.equal(Object.keys(postgres.NetworkSettings.Ports).length, 1);
  assert.equal(postgres.NetworkSettings.Ports['5432/tcp'], null);
  for (const [c, port, origin] of [[web, '3000/tcp', o['--web']], [api, '3001/tcp', o['--api']]]) {
    const bindings = c.NetworkSettings.Ports[port];
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].HostIp, '127.0.0.1');
    assert.equal(bindings[0].HostPort, new URL(origin).port);
    assert.equal(Object.values(c.NetworkSettings.Ports).filter(Boolean).length, 1);
  }
  assert.ok(Object.values(worker.NetworkSettings.Ports).every(value => value === null));
  const env = c => Object.fromEntries(c.Config.Env.map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
  for (const c of [api, worker]) {
    const db = new URL(env(c).DATABASE_URL);
    assert.equal(db.href, 'postgresql://eh122_e1:eh122-e1-only@postgres:5432/eh122_e1');
  }
  assert.equal(env(api).NODE_ENV, 'development');
  assert.equal(env(api).AUTH_BROWSER_ORIGIN, o['--web']);
  assert.equal(env(postgres).POSTGRES_DB, 'eh122_e1');
  assert.equal(env(postgres).POSTGRES_USER, 'eh122_e1');
  assert.equal(env(postgres).POSTGRES_PASSWORD, 'eh122-e1-only');
  const emptySchema = () => {
    const count = docker('exec', postgres.Id, 'psql', '-U', 'eh122_e1', '-d', 'eh122_e1', '-Atc',
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
    assert.equal(count, '0', 'Health-only stack must have no application schema/fixtures');
  };
  emptySchema();
  phase = 'artifact';
  for (const c of [api, web, worker]) {
    assert.equal(c.Image, image);
    assert.equal(c.Config.User, 'node');
    assert.equal(c.Config.WorkingDir, '/app');
    assert.deepEqual(c.Config.Entrypoint, ['docker-entrypoint.sh']);
  }
  assert.deepEqual(api.Config.Cmd, ['node', 'apps/api/dist/main.js']);
  assert.deepEqual(worker.Config.Cmd, ['node', 'apps/experiment-worker/dist/main.js']);
  assert.deepEqual(web.Config.Cmd, ['node', 'apps/web/node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '0.0.0.0']);
  // Compare every tracked source byte copied into the image, not only its tag.
  const paths = command('git', ['ls-files', '-z']).split('\0').filter(Boolean);
  const sourceHashes = Object.fromEntries(paths.map(path => [path, sha256(readFileSync(path))]));
  const copiedHashes = JSON.parse(command('docker', ['--host=unix:///var/run/docker.sock', 'exec', '-i', web.Id, 'node', '-e',
    "const fs=require('node:fs'),c=require('node:crypto');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify(Object.fromEntries(JSON.parse(s).map(p=>[p,c.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])))));"], JSON.stringify(paths)));
  assert.deepEqual(copiedHashes, sourceHashes);
  receipt.copiedSourceFiles = paths.length;
  receipt.copiedSourceSha256 = sha256(JSON.stringify(sourceHashes));
  const rawManifest = docker('exec', web.Id, 'node', '-e', "process.stdout.write(require('node:fs').readFileSync('apps/web/.next/routes-manifest.json'))");
  verifyRewrite(JSON.parse(rawManifest));
  receipt.manifestSha256 = sha256(rawManifest);
  const dns = JSON.parse(docker('exec', web.Id, 'node', '-e', "require('node:dns').lookup('api',{family:4},(e,r)=>{if(e)process.exit(1);console.log(JSON.stringify(r))})"));
  assert.equal(dns, Object.values(api.NetworkSettings.Networks)[0].IPAddress);
  receipt.network = { id: network.Id, driver: 'bridge', internal: false, apiAddress: dns, isolation: 'unique project, exact membership and loopback-only ingress; outbound network technically available' };
  receipt.containers = Object.fromEntries(Object.entries(byService).map(([service, c]) => [service, c.Id]));
  phase = 'health';
  const get = async (origin, path) => {
    const started = Date.now();
    const response = await fetch(origin + path, { method: 'GET', redirect: 'error', cache: 'no-store', signal: globalThis.AbortSignal.timeout(8000) });
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.text();
    assert.ok(body.length <= (path === '/' ? 1024 * 1024 : 1024));
    return { status: response.status, body, elapsedMs: Date.now() - started };
  };
  const healthy = async () => {
    const direct = await get(o['--api'], '/api/v1/health');
    const proxied = await get(o['--web'], '/api/v1/health');
    for (const response of [direct, proxied]) {
      assert.equal(response.status, 200);
      assert.deepEqual(JSON.parse(response.body), { data: { status: 'ok' } });
    }
    const root = await get(o['--web'], '/');
    assert.equal(root.status, 200);
    assert.match(root.body, /<html[\s>]/i);
    return { direct: direct.status, webRoot: root.status, proxied: proxied.status, healthBodySha256: sha256(proxied.body) };
  };
  receipt.R02 = await healthy();
  if (o['--failure-recovery']) {
    phase = 'upstream-failure';
    try {
      docker('stop', '--time', '10', api.Id);
      const failure = await get(o['--web'], '/api/v1/health');
      assert.ok([500, 502, 503, 504].includes(failure.status));
      assert.ok(['Internal Server Error', 'Bad Gateway', 'Service unavailable'].includes(failure.body.trim()));
      const root = await get(o['--web'], '/');
      assert.equal(root.status, 200);
      receipt.R03 = { status: failure.status, elapsedMs: failure.elapsedMs, bodySha256: sha256(failure.body), webRoot: root.status };
    } finally {
      // Even a failed negative assertion must restore only this attested API.
      docker('start', api.Id);
    }
    phase = 'recovery';
    let recovery;
    for (let i = 0; i < 15; i++) {
      try { recovery = await healthy(); break; } catch { await delay(1000); }
    }
    assert.ok(recovery, 'Same-candidate recovery failed');
    receipt.R03.recovery = recovery;
  }
  emptySchema();
  receipt.applicationTablesBeforeAndAfter = 0;
  console.log(JSON.stringify(receipt, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error(JSON.stringify({ result: 'FAIL', phase, error: 'E1_TOPOLOGY_REJECTED' })); process.exitCode = 1; });
}
