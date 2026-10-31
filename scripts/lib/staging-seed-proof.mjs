import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeStaging } from './staging-seed.mjs';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { Pool } = require('pg');

/** Real-database proof: only genuine temporary session/audit history may change. */
export async function proveStagingInitialization(config) {
  const pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('sessions','audit_logs') ORDER BY tablename")).rows;
    const snapshot = async () => {
      const data = {};
      for (const { tablename } of tables) {
        assert.match(tablename, /^[a-z_]+$/);
        data[tablename] = (await pool.query(`SELECT to_jsonb(t) AS row FROM public.${tablename} t ORDER BY to_jsonb(t)::text`)).rows;
      }
      return data;
    };
    const baseline = await snapshot();
    for (let pass = 0; pass < 2; pass++) {
      assert.deepEqual(await initializeStaging(config), { result: 'PASS', created: { users: 0, profiles: 0, assignments: 0 } });
      assert.deepEqual(await snapshot(), baseline, 'repeat must preserve every identity, setup, authority, clinical record and migration row');
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.email='eh-m1-admin@example.invalid' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()")).rows[0].n, 0);
    }
  } finally { await pool.end(); }
}
