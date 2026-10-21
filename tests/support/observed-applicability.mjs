import { applyMigrationOnce } from './bp-amendment-schema.mjs';
import { setTimeout, clearTimeout } from 'node:timers';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const { PrismaPg } = require('@prisma/adapter-pg');
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { isolatedCoverage } from './coverage.mjs';
import { createObservedApplicabilityPersistence } from '../../packages/db/dist/index.js';
import {
  internalInsertObservedApplicabilitySnapshot,
  internalRetractObservedApplicabilitySnapshot,
  internalGetObservedApplicabilitySnapshots,
} from '../../packages/db/dist/observed-applicability.js';

export const applicabilityMigration = '20261020000000_eh015_observed_clinical_applicability';

export async function waitBlocked(pool, pid, timeoutMs = 5000, blockerPid = null) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await pool.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AND ($2::int IS NULL OR $2=ANY(pg_blocking_pids($1))) AS blocked', [pid, blockerPid]);
    if (res.rows[0]?.blocked) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Expected lock wait on pid ${pid} within ${timeoutMs}ms`);
}

export async function isolatedObservedApplicability(run) {
  return isolatedCoverage(async (f) => {
  await applyMigrationOnce(f.pool, applicabilityMigration);

    const adapter = new PrismaPg(f.pool);
    const prisma = new PrismaClient({ adapter });
    const applicability = createObservedApplicabilityPersistence(f.url);

    const transaction = run => prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
      return run(tx);
    }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });

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
      return transaction(tx => internalInsertObservedApplicabilitySnapshot(tx, fullInput));
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
      return transaction(tx => internalRetractObservedApplicabilitySnapshot(tx, fullInput));
    };

    const getRawPoint = async (patientId, effectiveAt) => {
      return transaction(tx => internalGetObservedApplicabilitySnapshots(tx, { patientId, effectiveAt }));
    };

    try {
      await run({
        ...f,
        applicability,
        insertSnapshot,
        retractSnapshot,
        getRawPoint,
        prisma,
        transaction,
      });
    } finally {
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore disconnect error */
      }
      try {
        await applicability.close();
      } catch {
        /* ignore close error */
      }
    }
  });
}

export const applicabilitySnapshot = async (pool) => ({
  snapshots: (await pool.query('SELECT * FROM public.observed_applicability_snapshots ORDER BY id')).rows,
  retractions: (await pool.query('SELECT * FROM public.observed_applicability_retractions ORDER BY id')).rows,
  audit: (await pool.query('SELECT * FROM public.audit_logs ORDER BY id')).rows,
});

// Tests intercept only the SQL transport; every statement still runs on PostgreSQL.
export function observeApplicabilityQueries(observer) {
  const { Client } = require('pg');
  const original = Client.prototype.query;
  Client.prototype.query = function (...args) {
    const config = args[0];
    const text = typeof config === 'string' ? config : config.text;
    const values = typeof config === 'string' ? args[1] : config.values;
    return observer({ text, values, pid: this.processID }, () => original.apply(this, args));
  };
  return () => { Client.prototype.query = original; };
}

export function signal() {
  const latch = Promise.withResolvers();
  const timer = setTimeout(() => latch.reject(new Error('Bounded test coordination timed out')), 12000);
  timer.unref();
  return { promise: latch.promise, resolve: value => { clearTimeout(timer); latch.resolve(value); } };
}

export async function waitBlockedBy(pool, blockerPid, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = (await pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))', [blockerPid])).rows;
    if (rows.length) return rows[0].pid;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected bounded lock wait on exact blocker');
}
