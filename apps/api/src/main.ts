import { createDatabase } from '@egyhealth/db';
import { positiveInteger } from '@egyhealth/config';
import { createApp } from './app.js';

async function main() {
  const database = createDatabase(process.env.DATABASE_URL);
  const app = await createApp(database);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await app.close();
    await database.close();
  };
  const shutdown = () => { void close().catch(() => { console.error('API shutdown failed'); process.exitCode = 1; }); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  await app.listen(positiveInteger(process.env.API_PORT, 3001), '0.0.0.0');
  console.log('API started');
}
main().catch(() => { console.error('API startup failed'); process.exit(1); });
