import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { isolatedFollowup } from './followup.mjs';
import { createNormalizedEvidencePersistence } from '../../packages/db/dist/index.js';

export const coverageMigration = '20261019000000_eh013_record_coverage_windows';

export async function isolatedCoverage(run) {
  return isolatedFollowup(async (f) => {
    const sql = await readFile(`packages/db/prisma/migrations/${coverageMigration}/migration.sql`, 'utf8');
    await f.pool.query(sql);
    await f.pool.query(
      'INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)',
      [randomUUID(), createHash('sha256').update(sql).digest('hex'), coverageMigration]
    );

    const normalized = createNormalizedEvidencePersistence(f.url);

    const insertCoverage = async (input = {}) => {
      const {
        patientId = f.patientId,
        sourceType = 'SYNTHETIC_BENCHMARK',
        sourceReference = 'eh013-demo-v1',
        coverageStatus = 'COMPLETE',
        startAt = '2026-01-01T00:00:00.000Z',
        endAt = '2026-06-01T00:00:00.000Z',
      } = input;

      const res = await f.pool.query(
        `INSERT INTO public.record_coverage_windows (
          id, patient_id, source_type, source_reference, coverage_status, start_at, end_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::public.record_coverage_source_type, $3, $4::public.record_coverage_status, $5::timestamptz(6), $6::timestamptz(6)
        )
        ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING
        RETURNING *`,
        [patientId, sourceType, sourceReference, coverageStatus, startAt, endAt]
      );

      if (res.rows.length === 1) return { window: res.rows[0], created: true };

      const existing = await f.pool.query(
        `SELECT * FROM public.record_coverage_windows
         WHERE patient_id = $1::uuid
           AND source_type = $2::public.record_coverage_source_type
           AND source_reference = $3
           AND coverage_status = $4::public.record_coverage_status
           AND start_at = $5::timestamptz(6)
           AND end_at = $6::timestamptz(6)`,
        [patientId, sourceType, sourceReference, coverageStatus, startAt, endAt]
      );
      return { window: existing.rows[0], created: false };
    };

    try {
      await run({ ...f, normalized, insertCoverage });
    } finally {
      await normalized.close();
    }
  });
}

export const coverageSnapshot = async (pool) => ({
  windows: (await pool.query('SELECT * FROM public.record_coverage_windows ORDER BY id')).rows,
  audit: (await pool.query('SELECT * FROM public.audit_logs ORDER BY id')).rows,
});
