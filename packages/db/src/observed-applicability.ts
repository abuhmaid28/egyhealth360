import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import {
  UUID_REGEX,
  ObservedApplicabilityError,
  type ObservedApplicabilitySnapshot,
  type ObservedApplicabilityRetraction,
  type ObservedApplicabilityPoint,
  type ObservedTupleComparison,
  type GetObservedApplicabilitySnapshotsInput,
  type ObservedApplicabilitySourceType,
  type ObservedAgeAssertionState,
  type ObservedPregnancyStatus,
  type ObservedConditionStatus,
  validateInsertSnapshotInput,
  validateRetractSnapshotInput,
  validateGetApplicabilityInput,
} from './observed-applicability-values.js';

export interface RawJoinedSnapshotRow {
  readonly id: string;
  readonly patientId: string;
  readonly sourceType: string;
  readonly sourceReference: string;
  readonly assertionReference: string;
  readonly effectiveAt: Date;
  readonly assertedAt: Date;
  readonly recordedAt: Date;
  readonly ageAssertionState: string;
  readonly ageYearsAtAssessment: number | null;
  readonly pregnancyStatus: string | null;
  readonly hypertensionStatus: string | null;
  readonly cvdStatus: string | null;
  readonly diabetesStatus: string | null;
  readonly ckdStatus: string | null;
  readonly retractionId: string | null;
  readonly retractionSnapshotId: string | null;
  readonly retractionPatientId: string | null;
  readonly retractionSourceType: string | null;
  readonly retractionSourceReference: string | null;
  readonly retractionReference: string | null;
  readonly retractionAssertedAt: Date | null;
  readonly retractionRecordedAt: Date | null;
  readonly retractionReasonCode: string | null;
}

export function projectObservedApplicabilityPoint(
  patientId: string,
  effectiveAtCanonicalUtc: string,
  rawRows: readonly RawJoinedSnapshotRow[]
): ObservedApplicabilityPoint {
  const snapshots: ObservedApplicabilitySnapshot[] = rawRows.map(row => {
    const retraction: ObservedApplicabilityRetraction | null = row.retractionId
      ? {
          id: row.retractionId,
          snapshotId: row.retractionSnapshotId!,
          patientId: row.retractionPatientId!,
          sourceType: 'SYNTHETIC_OBSERVED_INPUT' as const,
          sourceReference: row.retractionSourceReference!,
          retractionReference: row.retractionReference!,
          assertedAt: new Date(row.retractionAssertedAt!.getTime()),
          recordedAt: new Date(row.retractionRecordedAt!.getTime()),
          reasonCode: row.retractionReasonCode!,
        }
      : null;

    return {
      id: row.id,
      patientId: row.patientId,
      sourceType: 'SYNTHETIC_OBSERVED_INPUT' as const,
      sourceReference: row.sourceReference,
      assertionReference: row.assertionReference,
      effectiveAt: new Date(row.effectiveAt.getTime()),
      assertedAt: new Date(row.assertedAt.getTime()),
      recordedAt: new Date(row.recordedAt.getTime()),
      ageAssertionState: row.ageAssertionState as ObservedAgeAssertionState,
      ageYearsAtAssessment: row.ageYearsAtAssessment,
      pregnancyStatus: (row.pregnancyStatus ?? null) as ObservedPregnancyStatus | null,
      hypertensionStatus: (row.hypertensionStatus ?? null) as ObservedConditionStatus | null,
      cvdStatus: (row.cvdStatus ?? null) as ObservedConditionStatus | null,
      diabetesStatus: (row.diabetesStatus ?? null) as ObservedConditionStatus | null,
      ckdStatus: (row.ckdStatus ?? null) as ObservedConditionStatus | null,
      retraction,
    };
  });

  const nonRetracted = snapshots.filter(s => s.retraction === null);
  const canonicalSortUuid = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const nonRetractedSnapshotIds = nonRetracted.map(s => s.id).sort(canonicalSortUuid);

  let tupleComparison: ObservedTupleComparison;
  let differingTupleSnapshotIds: readonly string[] = [];

  if (nonRetracted.length === 0) {
    tupleComparison = 'NO_NON_RETRACTED_ROWS';
    differingTupleSnapshotIds = [];
  } else if (nonRetracted.length === 1) {
    tupleComparison = 'IDENTICAL_TUPLES';
    differingTupleSnapshotIds = [];
  } else {
    const first = nonRetracted[0];
    const isSameTuple = (a: ObservedApplicabilitySnapshot, b: ObservedApplicabilitySnapshot) =>
      a.ageAssertionState === b.ageAssertionState &&
      a.ageYearsAtAssessment === b.ageYearsAtAssessment &&
      a.pregnancyStatus === b.pregnancyStatus &&
      a.hypertensionStatus === b.hypertensionStatus &&
      a.cvdStatus === b.cvdStatus &&
      a.diabetesStatus === b.diabetesStatus &&
      a.ckdStatus === b.ckdStatus;

    const allIdentical = nonRetracted.slice(1).every(s => isSameTuple(first, s));
    if (allIdentical) {
      tupleComparison = 'IDENTICAL_TUPLES';
      differingTupleSnapshotIds = [];
    } else {
      tupleComparison = 'DIFFERING_TUPLES';
      differingTupleSnapshotIds = [...nonRetractedSnapshotIds];
    }
  }

  return {
    patientId,
    effectiveAt: effectiveAtCanonicalUtc,
    snapshots,
    tupleComparison,
    nonRetractedSnapshotIds,
    differingTupleSnapshotIds,
  };
}

export async function internalInsertObservedApplicabilitySnapshot(
  tx: Prisma.TransactionClient,
  rawInput: unknown
): Promise<{ snapshot: ObservedApplicabilitySnapshot; created: boolean }> {
  const input = validateInsertSnapshotInput(rawInput);

  try {
    const inserted = await tx.$queryRaw<
      Array<{
        id: string;
        patient_id: string;
        source_type: string;
        source_reference: string;
        assertion_reference: string;
        effective_at: Date;
        asserted_at: Date;
        recorded_at: Date;
        age_assertion_state: string;
        age_years_at_assessment: number | null;
        pregnancy_status: string | null;
        hypertension_status: string | null;
        cvd_status: string | null;
        diabetes_status: string | null;
        ckd_status: string | null;
      }>
    >`
      INSERT INTO public.observed_applicability_snapshots (
        patient_id,
        source_type,
        source_reference,
        assertion_reference,
        effective_at,
        asserted_at,
        age_assertion_state,
        age_years_at_assessment,
        pregnancy_status,
        hypertension_status,
        cvd_status,
        diabetes_status,
        ckd_status
      ) VALUES (
        ${input.patientId}::uuid,
        CAST(${input.sourceType} AS public.observed_applicability_source_type),
        ${input.sourceReference},
        ${input.assertionReference},
        ${input.effectiveAt.toISOString()}::timestamptz(6),
        ${input.assertedAt.toISOString()}::timestamptz(6),
        CAST(${input.ageAssertionState} AS public.observed_age_assertion_state),
        ${input.ageYearsAtAssessment},
        CAST(${input.pregnancyStatus} AS public.observed_pregnancy_status),
        CAST(${input.hypertensionStatus} AS public.observed_condition_status),
        CAST(${input.cvdStatus} AS public.observed_condition_status),
        CAST(${input.diabetesStatus} AS public.observed_condition_status),
        CAST(${input.ckdStatus} AS public.observed_condition_status)
      )
      ON CONFLICT ON CONSTRAINT oa_snapshots_source_identity_key DO NOTHING
      RETURNING
        id,
        patient_id,
        source_type::text,
        source_reference,
        assertion_reference,
        effective_at,
        asserted_at,
        recorded_at,
        age_assertion_state::text,
        age_years_at_assessment,
        pregnancy_status::text,
        hypertension_status::text,
        cvd_status::text,
        diabetes_status::text,
        ckd_status::text
    `;

    if (inserted.length === 1) {
      const row = inserted[0];
      return {
        snapshot: {
          id: row.id,
          patientId: row.patient_id,
          sourceType: row.source_type as ObservedApplicabilitySourceType,
          sourceReference: row.source_reference,
          assertionReference: row.assertion_reference,
          effectiveAt: new Date(row.effective_at.getTime()),
          assertedAt: new Date(row.asserted_at.getTime()),
          recordedAt: new Date(row.recorded_at.getTime()),
          ageAssertionState: row.age_assertion_state as ObservedAgeAssertionState,
          ageYearsAtAssessment: row.age_years_at_assessment,
          pregnancyStatus: (row.pregnancy_status ?? null) as ObservedPregnancyStatus | null,
          hypertensionStatus: (row.hypertension_status ?? null) as ObservedConditionStatus | null,
          cvdStatus: (row.cvd_status ?? null) as ObservedConditionStatus | null,
          diabetesStatus: (row.diabetes_status ?? null) as ObservedConditionStatus | null,
          ckdStatus: (row.ckd_status ?? null) as ObservedConditionStatus | null,
          retraction: null,
        },
        created: true,
      };
    }
  } catch (error: unknown) {
    if (error instanceof ObservedApplicabilityError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    const dbErr = error as { code?: string };
    if (
      msg.includes('oa_snapshots_scope_guard') ||
      msg.includes('oa_snapshots_patient_fkey') ||
      msg.includes('patient_profiles')
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
    }
    if (
      msg.includes('oa_snapshots_source_reference_check') ||
      msg.includes('oa_snapshots_assertion_reference_check') ||
      msg.includes('oa_snapshots_age_assertion_check') ||
      msg.includes('oa_snapshots_chronology_check') ||
      dbErr?.code === '23514' ||
      dbErr?.code === '23503'
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_INVALID');
    }
    if (
      dbErr?.code === '23505' ||
      msg.includes('oa_snapshots_source_identity_key') ||
      msg.includes('Unique constraint failed')
    ) {
      // Unique conflict handled below
    } else {
      throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE');
    }
  }

  // Conflict: query fresh row under READ COMMITTED
  const existing = await tx.$queryRaw<
    Array<{
      id: string;
      patient_id: string;
      source_type: string;
      source_reference: string;
      assertion_reference: string;
      effective_at: Date;
      asserted_at: Date;
      recorded_at: Date;
      age_assertion_state: string;
      age_years_at_assessment: number | null;
      pregnancy_status: string | null;
      hypertension_status: string | null;
      cvd_status: string | null;
      diabetes_status: string | null;
      ckd_status: string | null;
    }>
  >`
    SELECT
      id,
      patient_id,
      source_type::text,
      source_reference,
      assertion_reference,
      effective_at,
      asserted_at,
      recorded_at,
      age_assertion_state::text,
      age_years_at_assessment,
      pregnancy_status::text,
      hypertension_status::text,
      cvd_status::text,
      diabetes_status::text,
      ckd_status::text
    FROM public.observed_applicability_snapshots
    WHERE patient_id = ${input.patientId}::uuid
      AND source_type = CAST(${input.sourceType} AS public.observed_applicability_source_type)
      AND source_reference = ${input.sourceReference}
      AND assertion_reference = ${input.assertionReference}
  `;

  if (existing.length !== 1) {
    throw new ObservedApplicabilityError('APPLICABILITY_CONFLICT');
  }

  const row = existing[0];
  const exactMatch =
    row.patient_id === input.patientId &&
    row.source_type === input.sourceType &&
    row.source_reference === input.sourceReference &&
    row.assertion_reference === input.assertionReference &&
    row.effective_at.getTime() === input.effectiveAt.getTime() &&
    row.asserted_at.getTime() === input.assertedAt.getTime() &&
    row.age_assertion_state === input.ageAssertionState &&
    row.age_years_at_assessment === input.ageYearsAtAssessment &&
    (row.pregnancy_status ?? null) === (input.pregnancyStatus ?? null) &&
    (row.hypertension_status ?? null) === (input.hypertensionStatus ?? null) &&
    (row.cvd_status ?? null) === (input.cvdStatus ?? null) &&
    (row.diabetes_status ?? null) === (input.diabetesStatus ?? null) &&
    (row.ckd_status ?? null) === (input.ckdStatus ?? null);

  if (!exactMatch) {
    throw new ObservedApplicabilityError('APPLICABILITY_CONFLICT');
  }

  // Check if retraction exists for this existing row
  const retractions = await tx.$queryRaw<
    Array<{
      id: string;
      snapshot_id: string;
      patient_id: string;
      source_type: string;
      source_reference: string;
      retraction_reference: string;
      asserted_at: Date;
      recorded_at: Date;
      reason_code: string;
    }>
  >`
    SELECT
      id,
      snapshot_id,
      patient_id,
      source_type::text,
      source_reference,
      retraction_reference,
      asserted_at,
      recorded_at,
      reason_code
    FROM public.observed_applicability_retractions
    WHERE snapshot_id = ${row.id}::uuid
  `;

  const retraction: ObservedApplicabilityRetraction | null =
    retractions.length === 1
      ? {
          id: retractions[0].id,
          snapshotId: retractions[0].snapshot_id,
          patientId: retractions[0].patient_id,
          sourceType: retractions[0].source_type as ObservedApplicabilitySourceType,
          sourceReference: retractions[0].source_reference,
          retractionReference: retractions[0].retraction_reference,
          assertedAt: new Date(retractions[0].asserted_at.getTime()),
          recordedAt: new Date(retractions[0].recorded_at.getTime()),
          reasonCode: retractions[0].reason_code,
        }
      : null;

  return {
    snapshot: {
      id: row.id,
      patientId: row.patient_id,
      sourceType: row.source_type as ObservedApplicabilitySourceType,
      sourceReference: row.source_reference,
      assertionReference: row.assertion_reference,
      effectiveAt: new Date(row.effective_at.getTime()),
      assertedAt: new Date(row.asserted_at.getTime()),
      recordedAt: new Date(row.recorded_at.getTime()),
      ageAssertionState: row.age_assertion_state as ObservedAgeAssertionState,
      ageYearsAtAssessment: row.age_years_at_assessment,
      pregnancyStatus: (row.pregnancy_status ?? null) as ObservedPregnancyStatus | null,
      hypertensionStatus: (row.hypertension_status ?? null) as ObservedConditionStatus | null,
      cvdStatus: (row.cvd_status ?? null) as ObservedConditionStatus | null,
      diabetesStatus: (row.diabetes_status ?? null) as ObservedConditionStatus | null,
      ckdStatus: (row.ckd_status ?? null) as ObservedConditionStatus | null,
      retraction,
    },
    created: false,
  };
}

export async function internalRetractObservedApplicabilitySnapshot(
  tx: Prisma.TransactionClient,
  rawInput: unknown
): Promise<{ retraction: ObservedApplicabilityRetraction; created: boolean }> {
  const input = validateRetractSnapshotInput(rawInput);

  // 1. Lock patient FOR SHARE
  const patients = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.patient_profiles WHERE id=${input.patientId}::uuid AND user_role='PATIENT' FOR SHARE
  `;
  if (patients.length !== 1) {
    throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
  }

  // 2. Lock target snapshot FOR UPDATE
  const targets = await tx.$queryRaw<
    Array<{
      id: string;
      patient_id: string;
      source_type: string;
      source_reference: string;
      assertion_reference: string;
      asserted_at: Date;
      recorded_at: Date;
    }>
  >`
    SELECT
      id,
      patient_id,
      source_type::text,
      source_reference,
      assertion_reference,
      asserted_at,
      recorded_at
    FROM public.observed_applicability_snapshots
    WHERE id = ${input.snapshotId}::uuid
      AND patient_id = ${input.patientId}::uuid
      AND source_type = CAST(${input.sourceType} AS public.observed_applicability_source_type)
      AND source_reference = ${input.sourceReference}
    FOR UPDATE
  `;
  if (targets.length !== 1) {
    throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
  }

  const target = targets[0];

  // Chronology: retraction asserted_at >= target asserted_at
  if (input.assertedAt.getTime() < target.asserted_at.getTime()) {
    throw new ObservedApplicabilityError('APPLICABILITY_INVALID', [
      { field: 'assertedAt', reason: 'chronology' },
    ]);
  }

  // 3. Inspect existing retraction on target snapshot
  const existingRetractions = await tx.$queryRaw<
    Array<{
      id: string;
      snapshot_id: string;
      patient_id: string;
      source_type: string;
      source_reference: string;
      retraction_reference: string;
      asserted_at: Date;
      recorded_at: Date;
      reason_code: string;
    }>
  >`
    SELECT
      id,
      snapshot_id,
      patient_id,
      source_type::text,
      source_reference,
      retraction_reference,
      asserted_at,
      recorded_at,
      reason_code
    FROM public.observed_applicability_retractions
    WHERE snapshot_id = ${input.snapshotId}::uuid
  `;

  if (existingRetractions.length === 1) {
    const existing = existingRetractions[0];
    const exactMatch =
      existing.patient_id === input.patientId &&
      existing.source_type === input.sourceType &&
      existing.source_reference === input.sourceReference &&
      existing.retraction_reference === input.retractionReference &&
      existing.asserted_at.getTime() === input.assertedAt.getTime() &&
      existing.reason_code === input.reasonCode;

    if (exactMatch) {
      return {
        retraction: {
          id: existing.id,
          snapshotId: existing.snapshot_id,
          patientId: existing.patient_id,
          sourceType: existing.source_type as ObservedApplicabilitySourceType,
          sourceReference: existing.source_reference,
          retractionReference: existing.retraction_reference,
          assertedAt: new Date(existing.asserted_at.getTime()),
          recordedAt: new Date(existing.recorded_at.getTime()),
          reasonCode: existing.reason_code,
        },
        created: false,
      };
    }
    throw new ObservedApplicabilityError('APPLICABILITY_CONFLICT');
  }

  // 4. Check if retraction reference was used for another snapshot under same source partition
  const reusedRef = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.observed_applicability_retractions
    WHERE patient_id = ${input.patientId}::uuid
      AND source_type = CAST(${input.sourceType} AS public.observed_applicability_source_type)
      AND source_reference = ${input.sourceReference}
      AND retraction_reference = ${input.retractionReference}
  `;
  if (reusedRef.length > 0) {
    throw new ObservedApplicabilityError('APPLICABILITY_CONFLICT');
  }

  // 5. Insert retraction
  try {
    const inserted = await tx.$queryRaw<
      Array<{
        id: string;
        snapshot_id: string;
        patient_id: string;
        source_type: string;
        source_reference: string;
        retraction_reference: string;
        asserted_at: Date;
        recorded_at: Date;
        reason_code: string;
      }>
    >`
      INSERT INTO public.observed_applicability_retractions (
        snapshot_id,
        patient_id,
        source_type,
        source_reference,
        retraction_reference,
        asserted_at,
        reason_code
      ) VALUES (
        ${input.snapshotId}::uuid,
        ${input.patientId}::uuid,
        CAST(${input.sourceType} AS public.observed_applicability_source_type),
        ${input.sourceReference},
        ${input.retractionReference},
        ${input.assertedAt.toISOString()}::timestamptz(6),
        ${input.reasonCode}
      )
      RETURNING
        id,
        snapshot_id,
        patient_id,
        source_type::text,
        source_reference,
        retraction_reference,
        asserted_at,
        recorded_at,
        reason_code
    `;

    if (inserted.length === 1) {
      const row = inserted[0];
      return {
        retraction: {
          id: row.id,
          snapshotId: row.snapshot_id,
          patientId: row.patient_id,
          sourceType: row.source_type as ObservedApplicabilitySourceType,
          sourceReference: row.source_reference,
          retractionReference: row.retraction_reference,
          assertedAt: new Date(row.asserted_at.getTime()),
          recordedAt: new Date(row.recorded_at.getTime()),
          reasonCode: row.reason_code,
        },
        created: true,
      };
    }
    throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE');
  } catch (error: unknown) {
    if (error instanceof ObservedApplicabilityError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    const dbErr = error as { code?: string };
    if (
      dbErr?.code === '23505' ||
      msg.includes('oa_retractions_source_identity_key') ||
      msg.includes('oa_retractions_target_key') ||
      msg.includes('Unique constraint failed')
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_CONFLICT');
    }
    if (
      msg.includes('oa_retractions_scope_guard') ||
      msg.includes('oa_retractions_target_scope_guard') ||
      msg.includes('oa_retractions_snapshot_scope_fkey') ||
      msg.includes('Target snapshot not found')
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
    }
    if (
      msg.includes('oa_retractions_target_chronology_guard') ||
      msg.includes('oa_retractions_receipt_chronology_guard') ||
      msg.includes('oa_retractions_chronology_check')
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_INVALID', [
        { field: 'assertedAt', reason: 'chronology' },
      ]);
    }
    if (
      msg.includes('oa_retractions_source_reference_check') ||
      msg.includes('oa_retractions_retraction_reference_check') ||
      dbErr?.code === '23514' ||
      dbErr?.code === '23503'
    ) {
      throw new ObservedApplicabilityError('APPLICABILITY_INVALID');
    }
    throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE');
  }
}

export async function internalGetObservedApplicabilitySnapshots(
  tx: Prisma.TransactionClient,
  rawInput: unknown
): Promise<ObservedApplicabilityPoint> {
  const { patientId, effectiveAt, effectiveAtCanonicalUtc } = validateGetApplicabilityInput(rawInput);

  const rawRows = await tx.$queryRaw<
    Array<{
      id: string;
      patientId: string;
      sourceType: string;
      sourceReference: string;
      assertionReference: string;
      effectiveAt: Date;
      assertedAt: Date;
      recordedAt: Date;
      ageAssertionState: string;
      ageYearsAtAssessment: number | null;
      pregnancyStatus: string | null;
      hypertensionStatus: string | null;
      cvdStatus: string | null;
      diabetesStatus: string | null;
      ckdStatus: string | null;
      retractionId: string | null;
      retractionSnapshotId: string | null;
      retractionPatientId: string | null;
      retractionSourceType: string | null;
      retractionSourceReference: string | null;
      retractionReference: string | null;
      retractionAssertedAt: Date | null;
      retractionRecordedAt: Date | null;
      retractionReasonCode: string | null;
    }>
  >`
    SELECT
      s.id,
      s.patient_id AS "patientId",
      s.source_type::text AS "sourceType",
      s.source_reference AS "sourceReference",
      s.assertion_reference AS "assertionReference",
      s.effective_at AS "effectiveAt",
      s.asserted_at AS "assertedAt",
      s.recorded_at AS "recordedAt",
      s.age_assertion_state::text AS "ageAssertionState",
      s.age_years_at_assessment AS "ageYearsAtAssessment",
      s.pregnancy_status::text AS "pregnancyStatus",
      s.hypertension_status::text AS "hypertensionStatus",
      s.cvd_status::text AS "cvdStatus",
      s.diabetes_status::text AS "diabetesStatus",
      s.ckd_status::text AS "ckdStatus",
      r.id AS "retractionId",
      r.snapshot_id AS "retractionSnapshotId",
      r.patient_id AS "retractionPatientId",
      r.source_type::text AS "retractionSourceType",
      r.source_reference AS "retractionSourceReference",
      r.retraction_reference AS "retractionReference",
      r.asserted_at AS "retractionAssertedAt",
      r.recorded_at AS "retractionRecordedAt",
      r.reason_code AS "retractionReasonCode"
    FROM public.observed_applicability_snapshots s
    LEFT JOIN public.observed_applicability_retractions r
      ON r.snapshot_id = s.id
      AND r.patient_id = s.patient_id
      AND r.source_type = s.source_type
      AND r.source_reference = s.source_reference
    WHERE s.patient_id = ${patientId}::uuid
      AND s.effective_at = ${effectiveAt.toISOString()}::timestamptz(6)
    ORDER BY
      s.source_type ASC,
      s.source_reference COLLATE "C" ASC,
      s.assertion_reference COLLATE "C" ASC,
      s.id ASC
  `;

  return projectObservedApplicabilityPoint(patientId, effectiveAtCanonicalUtc, rawRows);
}

export function createObservedApplicabilityPersistence(connectionString: string | undefined) {
  if (!connectionString) {
    throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE', [
      { field: '$', reason: 'required' },
    ]);
  }
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });

  return {
    async getObservedApplicabilitySnapshots(
      principal: AuthPrincipal,
      rawInput: GetObservedApplicabilitySnapshotsInput
    ): Promise<ObservedApplicabilityPoint> {
      const actor = { ...principal };
      if (!UUID_REGEX.test(actor.userId) || !UUID_REGEX.test(actor.sessionId)) {
        throw new ObservedApplicabilityError('APPLICABILITY_UNAUTHENTICATED');
      }

      const { patientId } = validateGetApplicabilityInput(rawInput);

      try {
        return await client.$transaction(
          async tx => {
            await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
            await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;

            // 1. Lock actor user FOR NO KEY UPDATE
            await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;

            // 2. Lock exact session FOR UPDATE
            await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;

            // 3. Validate user and session status
            const sessions = await tx.$queryRaw<{ role: string }[]>`
              SELECT u.role::text role
              FROM public.users u
              JOIN public.sessions s ON s.user_id = u.id
              WHERE u.id=${actor.userId}::uuid
                AND s.id=${actor.sessionId}::uuid
                AND u.status='ACTIVE'
                AND s.revoked_at IS NULL
                AND s.expires_at > pg_catalog.clock_timestamp()
            `;
            if (sessions.length !== 1) {
              throw new ObservedApplicabilityError('APPLICABILITY_UNAUTHENTICATED');
            }
            if (sessions[0].role !== actor.role || !['PATIENT', 'CLINICIAN'].includes(sessions[0].role)) {
              throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
            }

            // 4. Clinician authorization
            if (actor.role === 'CLINICIAN') {
              const clinicians = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM public.clinician_profiles WHERE user_id=${actor.userId}::uuid AND user_role='CLINICIAN' FOR SHARE
              `;
              if (clinicians.length !== 1) {
                throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
              }

              const assignments = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM public.clinician_patient_assignments
                WHERE clinician_id=${clinicians[0].id}::uuid
                  AND patient_id=${patientId}::uuid
                  AND status='ACTIVE'
                  AND ended_at IS NULL
                FOR SHARE
              `;
              if (assignments.length !== 1) {
                throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
              }
            }

            // 5. Patient profile verification
            const patients = await tx.$queryRaw<{ userId: string }[]>`
              SELECT user_id AS "userId" FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' FOR SHARE
            `;
            if (
              patients.length !== 1 ||
              (actor.role === 'PATIENT' && patients[0].userId !== actor.userId.toLowerCase())
            ) {
              throw new ObservedApplicabilityError('APPLICABILITY_NOT_FOUND');
            }

            // 6. Execute evidence snapshot
            const point = await internalGetObservedApplicabilitySnapshots(tx, rawInput);

            // 7. Final session / user verification before commit
            const recheck = await tx.$queryRaw<{ role: string }[]>`
              SELECT u.role::text role
              FROM public.users u
              JOIN public.sessions s ON s.user_id = u.id
              WHERE u.id=${actor.userId}::uuid
                AND s.id=${actor.sessionId}::uuid
                AND u.status='ACTIVE'
                AND s.revoked_at IS NULL
                AND s.expires_at > pg_catalog.clock_timestamp()
            `;
            if (recheck.length !== 1) {
              throw new ObservedApplicabilityError('APPLICABILITY_UNAUTHENTICATED');
            }

            return point;
          },
          { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 }
        );
      } catch (error) {
        if (error instanceof ObservedApplicabilityError) throw error;
        throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE');
      }
    },

    async close(): Promise<void> {
      try {
        await client.$disconnect();
        await pool.end();
      } catch {
        throw new ObservedApplicabilityError('APPLICABILITY_SERVICE_UNAVAILABLE');
      }
    },
  };
}

export type ObservedApplicabilityPersistence = ReturnType<typeof createObservedApplicabilityPersistence>;
