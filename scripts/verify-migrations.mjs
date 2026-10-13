import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Pool } from '../tests/support/database.mjs';

// Intentionally refuses nonempty databases. Use only disposable local/CI DBs.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = await pool.connect();
function prisma(command) {
  const result = spawnSync('pnpm', ['--filter', '@egyhealth/db', 'exec', 'prisma', 'migrate', command], { stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `prisma migrate ${command} failed`);
}
try {
  const tables = await connection.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  assert.equal(tables.rowCount, 0, 'Migration verification requires a clean disposable database');
  prisma('deploy');
  prisma('status');
  const before = (await connection.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.equal(before.length, 1);
  assert.ok(before[0].finished_at);
  assert.equal(before[0].rolled_back_at, null);
  assert.equal(before[0].migration_name, '20261012200810_eh005_identity_core_foundation');
  await connection.query('BEGIN');
  const sentinel = (await connection.query(`INSERT INTO users(email, password_hash, role)
    VALUES ('migration-sentinel@example.invalid', 'synthetic-test-hash', 'ADMIN') RETURNING *`)).rows[0];
  prisma('deploy');
  prisma('status');
  assert.deepEqual((await connection.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, before);
  assert.deepEqual((await connection.query('SELECT * FROM users WHERE id = $1', [sentinel.id])).rows[0], sentinel);
  await connection.query('ROLLBACK');
  console.log('Fresh migration and second deploy verified; sentinel rolled back');
} finally {
  await connection.query('ROLLBACK');
  connection.release();
  await pool.end();
}
