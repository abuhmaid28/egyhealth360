import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
export const amendmentMigration = '20261021000000_bp_correction_invalidation';
export async function applyMigrationOnce(pool, name) {
  if ((await pool.query('SELECT 1 FROM _prisma_migrations WHERE migration_name=$1', [name])).rowCount) return;
  const sql = await readFile(`packages/db/prisma/migrations/${name}/migration.sql`, 'utf8');
  await pool.query(sql);
  await pool.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)', [randomUUID(), createHash('sha256').update(sql).digest('hex'), name]);
}
export async function applyBpReadSchema(pool) {
  for (const name of ['20261018000000_eh012_followup_encounters', '20261019000000_eh013_record_coverage_windows', '20261020000000_eh015_observed_clinical_applicability', amendmentMigration]) await applyMigrationOnce(pool, name);
}
