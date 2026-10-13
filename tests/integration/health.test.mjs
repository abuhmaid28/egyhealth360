import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { createDatabase } from '../../packages/db/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';

test('Prisma connects to the migrated database; API returns the documented health contract', async () => {
  const db = createDatabase(process.env.DATABASE_URL);
  const app = await createApp(db);
  try {
    await db.check();
    await app.listen(0, '127.0.0.1');
    const response = await fetch(`${await app.getUrl()}/api/v1/health`);
    assert.equal(response.status, 200);
    const contract = JSON.parse(await readFile(new URL('../../docs/openapi.json', import.meta.url)));
    assert.deepEqual(await response.json(), contract.paths['/api/v1/health'].get.responses['200'].content['application/json'].schema.const);
  } finally { await app.close(); await db.close(); }
});

test('worker repeats database checks and shuts down cleanly', { timeout: 20000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eh003-'));
  const heartbeat = join(dir, 'health');
  const child = spawn(process.execPath, ['apps/experiment-worker/dist/main.js'], { env: { ...process.env, WORKER_POLL_MS: '100', WORKER_HEARTBEAT_FILE: heartbeat }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const exit = once(child, 'exit');
  try {
    for (let i = 0; i < 100 && (output.match(/Worker database health: ok/g) ?? []).length < 2; i++) await delay(100);
    assert.ok((output.match(/Worker database health: ok/g) ?? []).length >= 2, 'worker should perform repeated successful health checks');
    assert.ok(Number(await readFile(heartbeat, 'utf8')) > 0);
    child.kill('SIGTERM');
    const [code] = await exit;
    assert.equal(code, 0);
    await assert.rejects(readFile(heartbeat), { code: 'ENOENT' });
  } finally { child.kill('SIGKILL'); await rm(dir, { recursive: true, force: true }); }
});
