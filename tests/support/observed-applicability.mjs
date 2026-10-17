import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { isolatedCoverage, waitBlocked } from './coverage.mjs';
import { createObservedApplicabilityPersistence } from '../../packages/db/dist/index.js';
import {
  internalInsertObservedApplicabilitySnapshot,
  internalRetractObservedApplicabilitySnapshot,
  internalGetObservedApplicabilitySnapshots,
} from '../../packages/db/dist/observed-applicability.js';

export const applicabilityMigration = '20261020000000_eh015_observed_clinical_applicability';

export { waitBlocked };

export async function isolatedObservedApplicability(run) {
  return isolatedCoverage(async (f) => {
    const sql = await readFile(`packages/db/prisma/migrations/${applicabilityMigration}/migration.sql`, 'utf8');
    await f.pool.query(sql);
    await f.pool.query(
      'INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)',
      [randomUUID(), createHash('sha256').update(sql).digest('hex'), applicabilityMigration]
    );

    const adapter = new PrismaPg(f.pool);
    const prisma = new PrismaClient({ adapter });
    const applicability = createObservedApplicabilityPersistence(f.url);

    const insertSnapshot = async (input = {}) => {
      const fullInput = {
        patientId: f.patientId,
        sourceType: 'SYNTHETIC_OBSERVED_INPUT',
        sourceReference: 'eh015-test-src',
        assertionReference: `assert-${randomUUID()}`,
        effectiveAt: '2026-03-01T08:00:00.000Z',
        assertedAt: '2026-03-01T08:30:00.000Z',
        ageAssertionState: 'ASSERTED_VALUE',
        ageYearsAtAssessment: 45,
        pregnancyStatus: 'NOT_PREGNANT',
        hypertensionStatus: 'PRESENT',
        cvdStatus: 'ABSENT',
        diabetesStatus: 'ABSENT',
        ckdStatus: 'ABSENT',
        ...input,
      };
      return internalInsertObservedApplicabilitySnapshot(prisma, fullInput);
    };

    const retractSnapshot = async (input = {}) => {
      const fullInput = {
        patientId: f.patientId,
        sourceType: 'SYNTHETIC_OBSERVED_INPUT',
        sourceReference: 'eh015-test-src',
        retractionReference: `retract-${randomUUID()}`,
        assertedAt: '2026-03-01T09:00:00.000Z',
        reasonCode: 'SOURCE_ASSERTION_WITHDRAWN',
        ...input,
      };
      return internalRetractObservedApplicabilitySnapshot(prisma, fullInput);
    };

    const getRawPoint = async (patientId, effectiveAt) => {
      return internalGetObservedApplicabilitySnapshots(prisma, { patientId, effectiveAt });
    };

    try {
      await run({
        ...f,
        applicability,
        insertSnapshot,
        retractSnapshot,
        getRawPoint,
        prisma,
      });
    } finally {
      await prisma.$disconnect();
      await applicability.close();
    }
  });
}

export const applicabilitySnapshot = async (pool) => ({
  snapshots: (await pool.query('SELECT * FROM public.observed_applicability_snapshots ORDER BY id')).rows,
  retractions: (await pool.query('SELECT * FROM public.observed_applicability_retractions ORDER BY id')).rows,
  audit: (await pool.query('SELECT * FROM public.audit_logs ORDER BY id')).rows,
});
