import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { bpTimestamp } from './blood-pressure-values.js';

export type RecordCoverageSourceType = 'SYNTHETIC_BENCHMARK';
export type RecordCoverageStatus = 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';

export type RecordCoverageWindowSnapshot = Readonly<{
  id: string;
  patientId: string;
  sourceType: RecordCoverageSourceType;
  sourceReference: string;
  coverageStatus: RecordCoverageStatus;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
}>;

export type CreateRecordCoverageWindowInput = Readonly<{
  patientId: string;
  sourceType: 'SYNTHETIC_BENCHMARK';
  sourceReference: string;
  coverageStatus: 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';
  startAt: Date | string;
  endAt: Date | string;
}>;

export class RecordCoverageError extends Error {
  constructor(
    public readonly code: 'COVERAGE_INVALID' | 'COVERAGE_NOT_FOUND' | 'COVERAGE_SERVICE_UNAVAILABLE',
    public readonly details?: unknown
  ) {
    super(code);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_REF_REGEX = /^[A-Za-z0-9_.-]{1,128}$/;

export function validateSourceReference(sourceReference: unknown): string {
  if (typeof sourceReference !== 'string' || !SOURCE_REF_REGEX.test(sourceReference)) {
    throw new RecordCoverageError('COVERAGE_INVALID', { field: 'sourceReference', reason: 'format' });
  }
  return sourceReference;
}

export function parseCoverageTimestamp(value: unknown, field: 'startAt' | 'endAt'): Date {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime()) || value.getUTCFullYear() < 1 || value.getUTCFullYear() > 9999) {
      throw new RecordCoverageError('COVERAGE_INVALID', { field, reason: 'format' });
    }
    // Check millisecond precision (no fractional sub-milliseconds)
    if (value.getTime() !== Math.floor(value.getTime())) {
      throw new RecordCoverageError('COVERAGE_INVALID', { field, reason: 'precision' });
    }
    return new Date(value.getTime());
  }
  if (typeof value === 'string') {
    try {
      return bpTimestamp(value);
    } catch {
      throw new RecordCoverageError('COVERAGE_INVALID', { field, reason: 'format' });
    }
  }
  throw new RecordCoverageError('COVERAGE_INVALID', { field, reason: 'type' });
}

export function validateCoverageInput(input: CreateRecordCoverageWindowInput): {
  patientId: string;
  sourceType: 'SYNTHETIC_BENCHMARK';
  sourceReference: string;
  coverageStatus: 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';
  startAt: Date;
  endAt: Date;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new RecordCoverageError('COVERAGE_INVALID', { reason: 'representation' });
  }
  const keys = ['patientId', 'sourceType', 'sourceReference', 'coverageStatus', 'startAt', 'endAt'];
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== keys.length || ownKeys.some(k => typeof k !== 'string' || !keys.includes(k))) {
    throw new RecordCoverageError('COVERAGE_INVALID', { reason: 'unknown_fields' });
  }

  if (typeof input.patientId !== 'string' || !UUID_REGEX.test(input.patientId)) {
    throw new RecordCoverageError('COVERAGE_INVALID', { field: 'patientId', reason: 'format' });
  }

  if (input.sourceType !== 'SYNTHETIC_BENCHMARK') {
    throw new RecordCoverageError('COVERAGE_INVALID', { field: 'sourceType', reason: 'format' });
  }

  const sourceReference = validateSourceReference(input.sourceReference);

  if (!['COMPLETE', 'INCOMPLETE', 'UNKNOWN'].includes(input.coverageStatus)) {
    throw new RecordCoverageError('COVERAGE_INVALID', { field: 'coverageStatus', reason: 'format' });
  }

  const startAt = parseCoverageTimestamp(input.startAt, 'startAt');
  const endAt = parseCoverageTimestamp(input.endAt, 'endAt');

  if (endAt.getTime() <= startAt.getTime()) {
    throw new RecordCoverageError('COVERAGE_INVALID', { field: 'chronology', reason: 'end_before_start' });
  }

  return {
    patientId: input.patientId.toLowerCase(),
    sourceType: 'SYNTHETIC_BENCHMARK',
    sourceReference,
    coverageStatus: input.coverageStatus,
    startAt,
    endAt,
  };
}

/**
 * Internal machine-process coverage window writer.
 * Uses ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING
 * for concurrency-safe idempotent assertion insertion.
 *
 * NOTE: Not exported from the public package surface.
 */
export async function internalCreateRecordCoverageWindow(
  tx: Prisma.TransactionClient | PrismaClient,
  rawInput: CreateRecordCoverageWindowInput
): Promise<{ window: RecordCoverageWindowSnapshot; created: boolean }> {
  const input = validateCoverageInput(rawInput);

  try {
    const inserted = await tx.$queryRaw<
      Array<{
        id: string;
        patientId: string;
        sourceType: RecordCoverageSourceType;
        sourceReference: string;
        coverageStatus: RecordCoverageStatus;
        startAt: Date;
        endAt: Date;
        createdAt: Date;
      }>
    >`
      INSERT INTO public.record_coverage_windows (
        id,
        patient_id,
        source_type,
        source_reference,
        coverage_status,
        start_at,
        end_at
      ) VALUES (
        pg_catalog.gen_random_uuid(),
        ${input.patientId}::uuid,
        ${input.sourceType}::public.record_coverage_source_type,
        ${input.sourceReference},
        ${input.coverageStatus}::public.record_coverage_status,
        ${input.startAt.toISOString()}::timestamptz(6),
        ${input.endAt.toISOString()}::timestamptz(6)
      )
      ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING
      RETURNING
        id,
        patient_id AS "patientId",
        source_type AS "sourceType",
        source_reference AS "sourceReference",
        coverage_status AS "coverageStatus",
        start_at AS "startAt",
        end_at AS "endAt",
        created_at AS "createdAt"
    `;

    if (inserted.length === 1) {
      const row = inserted[0];
      return {
        window: {
          id: row.id,
          patientId: row.patientId,
          sourceType: row.sourceType,
          sourceReference: row.sourceReference,
          coverageStatus: row.coverageStatus,
          startAt: new Date(row.startAt),
          endAt: new Date(row.endAt),
          createdAt: new Date(row.createdAt),
        },
        created: true,
      };
    }

    // Exact duplicate assertion conflict: deterministically query existing row
    const existing = await tx.$queryRaw<
      Array<{
        id: string;
        patientId: string;
        sourceType: RecordCoverageSourceType;
        sourceReference: string;
        coverageStatus: RecordCoverageStatus;
        startAt: Date;
        endAt: Date;
        createdAt: Date;
      }>
    >`
      SELECT
        id,
        patient_id AS "patientId",
        source_type AS "sourceType",
        source_reference AS "sourceReference",
        coverage_status AS "coverageStatus",
        start_at AS "startAt",
        end_at AS "endAt",
        created_at AS "createdAt"
      FROM public.record_coverage_windows
      WHERE patient_id = ${input.patientId}::uuid
        AND source_type = ${input.sourceType}::public.record_coverage_source_type
        AND source_reference = ${input.sourceReference}
        AND coverage_status = ${input.coverageStatus}::public.record_coverage_status
        AND start_at = ${input.startAt.toISOString()}::timestamptz(6)
        AND end_at = ${input.endAt.toISOString()}::timestamptz(6)
    `;

    if (existing.length !== 1) {
      throw new RecordCoverageError('COVERAGE_SERVICE_UNAVAILABLE', 'Duplicate resolution mismatch');
    }

    const row = existing[0];
    return {
      window: {
        id: row.id,
        patientId: row.patientId,
        sourceType: row.sourceType,
        sourceReference: row.sourceReference,
        coverageStatus: row.coverageStatus,
        startAt: new Date(row.startAt),
        endAt: new Date(row.endAt),
        createdAt: new Date(row.createdAt),
      },
      created: false,
    };
  } catch (error) {
    if (error instanceof RecordCoverageError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('record_coverage_windows_scope_guard') || msg.includes('record_coverage_windows_patient_fkey')) {
      throw new RecordCoverageError('COVERAGE_NOT_FOUND', 'Patient profile not found');
    }
    if (msg.includes('record_coverage_windows_source_reference_check')) {
      throw new RecordCoverageError('COVERAGE_INVALID', { field: 'sourceReference', reason: 'format' });
    }
    if (msg.includes('record_coverage_windows_chronology_check')) {
      throw new RecordCoverageError('COVERAGE_INVALID', { field: 'chronology', reason: 'end_before_start' });
    }
    throw error;
  }
}
