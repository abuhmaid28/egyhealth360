import { setTimeout } from 'node:timers/promises';
import { writeFile, unlink } from 'node:fs/promises';
import { createDatabase } from '@egyhealth/db';
import { positiveInteger } from '@egyhealth/config';
import { bootstrapSmoke } from '@egyhealth/closure-engine';

async function main() {
  const database = createDatabase(process.env.DATABASE_URL);
  const interval = positiveInteger(process.env.WORKER_POLL_MS, 5000);
  const heartbeat = process.env.WORKER_HEARTBEAT_FILE ?? '/tmp/egyhealth-worker-health';
  const stop = new AbortController();
  process.once('SIGINT', () => stop.abort());
  process.once('SIGTERM', () => stop.abort());
  console.log('Worker started: health polling only');
  try {
    while (!stop.signal.aborted) {
      try {
        await database.check();
        await writeFile(heartbeat, String(Date.now()), { mode: 0o600 });
        console.log(bootstrapSmoke('Worker database health: ok'));
      } catch {
        await unlink(heartbeat).catch(() => {});
        console.error('Worker database health: unavailable');
      }
      await setTimeout(interval, undefined, { signal: stop.signal }).catch(() => {});
    }
  } finally {
    await unlink(heartbeat).catch(() => {});
    await database.close();
  }
}
main().catch(() => { console.error('Worker startup failed'); process.exit(1); });
