import { applyMigrationOnce } from './bp-amendment-schema.mjs';

import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { isolatedFollowup } from './followup.mjs';
import { createNormalizedEvidencePersistence } from '../../packages/db/dist/index.js';
import { internalCreateRecordCoverageWindow } from '../../packages/db/dist/record-coverage.js';

export const coverageMigration = '20261019000000_eh013_record_coverage_windows';

export async function waitBlocked(pool, pid) {
  for (let i = 0; i < 500; i++) {
    const res = await pool.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked', [pid]);
    if (res.rows[0]?.blocked) return;
  }
  throw new Error(`Expected lock wait on pid ${pid}`);
}

export async function isolatedCoverage(run) {
  return isolatedFollowup(async (f) => {
  await applyMigrationOnce(f.pool, coverageMigration);

    const adapter = new PrismaPg(f.pool);
    const prisma = new PrismaClient({ adapter });
    const normalized = createNormalizedEvidencePersistence(f.url);

    const insertCoverage = async (input = {}) => {
      const fullInput = {
        patientId: f.patientId,
        sourceType: 'SYNTHETIC_BENCHMARK',
        sourceReference: 'eh013-demo-v1',
        coverageStatus: 'COMPLETE',
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-06-01T00:00:00.000Z',
        ...input,
      };
      return internalCreateRecordCoverageWindow(prisma, fullInput);
    };

    try {
      await run({ ...f, normalized, insertCoverage, prisma });
    } finally {
      await prisma.$disconnect();
      await normalized.close();
    }
  });
}

export const coverageSnapshot = async (pool) => ({
  windows: (await pool.query('SELECT * FROM public.record_coverage_windows ORDER BY id')).rows,
  audit: (await pool.query('SELECT * FROM public.audit_logs ORDER BY id')).rows,
});
