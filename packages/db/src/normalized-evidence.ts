import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import type { PatientProfileId } from './authorization.js';
import {
  parseCoverageTimestamp,
  validateSourceReference,
  type RecordCoverageStatus,
} from './record-coverage.js';

export type NormalizedEvidenceCode =
  | 'REQUEST_INVALID'
  | 'EVIDENCE_UNAUTHENTICATED'
  | 'EVIDENCE_NOT_FOUND'
  | 'EVIDENCE_SERVICE_UNAVAILABLE';

export class NormalizedEvidenceError extends Error {
  constructor(
    public readonly code: NormalizedEvidenceCode,
    public readonly details?: unknown
  ) {
    super(code);
  }
}

export interface NormalizedBpMeasurement {
  readonly id: string;
  readonly patientId: string;
  readonly systolic: number;
  readonly diastolic: number;
  readonly unit: 'mmHg';
  readonly measuredAt: Date;
  readonly createdAt: Date;
  readonly recordedByUserId: string;
  readonly sourceKind: 'PATIENT_SELF_ENTRY' | 'CLINICIAN_ENTRY';
}

export interface NormalizedClinicalEncounter {
  readonly id: string;
  readonly patientId: string;
  readonly occurredAt: Date;
  readonly purpose: string;
  readonly recordedByUserId: string;
  readonly createdAt: Date;
}

export interface StructuralEncounterBpCandidate {
  readonly associationId: string;
  readonly encounterId: string;
  readonly bloodPressureMeasurementId: string;
  readonly encounterOccurredAt: Date;
  readonly bpMeasuredAt: Date;
  readonly systolic: number;
  readonly diastolic: number;
  readonly unit: 'mmHg';
  readonly bpSourceKind: 'PATIENT_SELF_ENTRY' | 'CLINICIAN_ENTRY';
}

export interface OperationalAppointmentCandidate {
  readonly appointmentId: string;
  readonly scheduledAt: Date;
  readonly purpose: 'HTN_BP_FOLLOWUP';
  readonly status: 'SCHEDULED';
}

export interface NormalizedCoverageWindow {
  readonly id: string;
  readonly patientId: string;
  readonly sourceType: 'SYNTHETIC_BENCHMARK';
  readonly sourceReference: string;
  readonly coverageStatus: 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';
  readonly startAt: Date;
  readonly endAt: Date;
  readonly createdAt: Date;
}

export interface EffectiveCoverageSegment {
  readonly startAt: Date;
  readonly endAt: Date;
  readonly status: 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';
  readonly contributingWindowIds: readonly string[];
}

export interface UnassertedCoverageSegment {
  readonly startAt: Date;
  readonly endAt: Date;
}

export interface NormalizedPatientEvidence {
  readonly patientId: string;
  readonly queryInterval: {
    readonly startAt: Date;
    readonly endAt: Date;
  };
  readonly partition: {
    readonly sourceType: 'SYNTHETIC_BENCHMARK';
    readonly sourceReference: string;
  };
  readonly bloodPressureMeasurements: readonly NormalizedBpMeasurement[];
  readonly clinicalEncounters: readonly NormalizedClinicalEncounter[];
  readonly structuralEncounterBpCandidates: readonly StructuralEncounterBpCandidate[];
  readonly operationalAppointmentCandidates: readonly OperationalAppointmentCandidate[];
  readonly coverageFacts: {
    readonly rawWindows: readonly NormalizedCoverageWindow[];
    readonly effectiveSegments: readonly EffectiveCoverageSegment[];
    readonly unassertedSegments: readonly UnassertedCoverageSegment[];
  };
}

export type GetNormalizedPatientEvidenceInput = Readonly<{
  patientId: PatientProfileId;
  queryInterval: Readonly<{
    startAt: string | Date;
    endAt: string | Date;
  }>;
  partition: Readonly<{
    sourceType: 'SYNTHETIC_BENCHMARK';
    sourceReference: string;
  }>;
}>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function exactKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'Invalid object shape');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some(k => typeof k !== 'string' || !keys.includes(k))) {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'Unknown or unexpected fields');
  }
  for (const k of keys) {
    if (!Object.hasOwn(descriptors, k) || !('value' in descriptors[k])) {
      throw new NormalizedEvidenceError('REQUEST_INVALID', `Missing field: ${k}`);
    }
  }
}

export function validateNormalizedEvidenceInput(rawInput: unknown): {
  patientId: string;
  queryStart: Date;
  queryEnd: Date;
  partition: {
    sourceType: 'SYNTHETIC_BENCHMARK';
    sourceReference: string;
  };
} {
  exactKeys(rawInput, ['patientId', 'queryInterval', 'partition']);

  const patientId = rawInput.patientId;
  if (typeof patientId !== 'string' || !UUID_REGEX.test(patientId)) {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'Invalid patientId format');
  }

  exactKeys(rawInput.queryInterval, ['startAt', 'endAt']);
  let queryStart: Date;
  let queryEnd: Date;
  try {
    queryStart = parseCoverageTimestamp(rawInput.queryInterval.startAt, 'startAt');
    queryEnd = parseCoverageTimestamp(rawInput.queryInterval.endAt, 'endAt');
  } catch (err) {
    if (err instanceof NormalizedEvidenceError) throw err;
    throw new NormalizedEvidenceError('REQUEST_INVALID', err instanceof Error ? err.message : 'Invalid timestamp format');
  }

  if (queryEnd.getTime() <= queryStart.getTime()) {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'Query endAt must be chronologically after startAt');
  }

  exactKeys(rawInput.partition, ['sourceType', 'sourceReference']);
  if (rawInput.partition.sourceType !== 'SYNTHETIC_BENCHMARK') {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'Invalid partition sourceType');
  }
  let sourceReference: string;
  try {
    sourceReference = validateSourceReference(rawInput.partition.sourceReference);
  } catch (err) {
    if (err instanceof NormalizedEvidenceError) throw err;
    throw new NormalizedEvidenceError('REQUEST_INVALID', err instanceof Error ? err.message : 'Invalid sourceReference');
  }

  return {
    patientId: patientId.toLowerCase(),
    queryStart,
    queryEnd,
    partition: {
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference,
    },
  };
}

/**
 * Pure coverage normalization algorithm.
 * Segments intersecting raw windows within queryInterval, applying precedence
 * INCOMPLETE > UNKNOWN > COMPLETE strictly within the same source identity partition.
 * Adjacent identical-status segments are coalesced with their contributing window IDs unified.
 * Portions with no asserted coverage metadata are reported as factual unassertedSegments.
 */
export function normalizeCoverageIntervals(
  queryInterval: { startAt: Date; endAt: Date },
  rawWindows: readonly NormalizedCoverageWindow[]
): {
  effectiveSegments: readonly EffectiveCoverageSegment[];
  unassertedSegments: readonly UnassertedCoverageSegment[];
} {
  const qStart = queryInterval.startAt.getTime();
  const qEnd = queryInterval.endAt.getTime();
  if (qStart >= qEnd) {
    throw new NormalizedEvidenceError('REQUEST_INVALID', 'queryInterval must be non-empty');
  }

  const boundaries = new Set<number>();
  boundaries.add(qStart);
  boundaries.add(qEnd);

  for (const w of rawWindows) {
    const wStart = w.startAt.getTime();
    const wEnd = w.endAt.getTime();
    if (wStart > qStart && wStart < qEnd) boundaries.add(wStart);
    if (wEnd > qStart && wEnd < qEnd) boundaries.add(wEnd);
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const rawEffective: EffectiveCoverageSegment[] = [];
  const rawUnasserted: UnassertedCoverageSegment[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];
    if (segStart >= segEnd) continue;

    // Filter covering windows: a window covers [segStart, segEnd) iff start <= segStart and end >= segEnd
    const covering = rawWindows.filter(
      w => w.startAt.getTime() <= segStart && w.endAt.getTime() >= segEnd
    );

    if (covering.length === 0) {
      rawUnasserted.push({
        startAt: new Date(segStart),
        endAt: new Date(segEnd),
      });
    } else {
      // Precedence: INCOMPLETE > UNKNOWN > COMPLETE
      const hasIncomplete = covering.some(w => w.coverageStatus === 'INCOMPLETE');
      const hasUnknown = covering.some(w => w.coverageStatus === 'UNKNOWN');
      const status: RecordCoverageStatus = hasIncomplete ? 'INCOMPLETE' : hasUnknown ? 'UNKNOWN' : 'COMPLETE';
      const contributingWindowIds = Array.from(new Set(covering.map(w => w.id))).sort();

      rawEffective.push({
        startAt: new Date(segStart),
        endAt: new Date(segEnd),
        status,
        contributingWindowIds,
      });
    }
  }

  // Coalesce adjacent unasserted segments
  const unassertedSegments: UnassertedCoverageSegment[] = [];
  for (const seg of rawUnasserted) {
    if (
      unassertedSegments.length > 0 &&
      unassertedSegments[unassertedSegments.length - 1].endAt.getTime() === seg.startAt.getTime()
    ) {
      unassertedSegments[unassertedSegments.length - 1] = {
        startAt: unassertedSegments[unassertedSegments.length - 1].startAt,
        endAt: seg.endAt,
      };
    } else {
      unassertedSegments.push(seg);
    }
  }

  // Coalesce adjacent effective segments with identical status
  const effectiveSegments: EffectiveCoverageSegment[] = [];
  for (const seg of rawEffective) {
    if (
      effectiveSegments.length > 0 &&
      effectiveSegments[effectiveSegments.length - 1].endAt.getTime() === seg.startAt.getTime() &&
      effectiveSegments[effectiveSegments.length - 1].status === seg.status
    ) {
      const prev = effectiveSegments[effectiveSegments.length - 1];
      const mergedContributing = Array.from(
        new Set([...prev.contributingWindowIds, ...seg.contributingWindowIds])
      ).sort();
      effectiveSegments[effectiveSegments.length - 1] = {
        startAt: prev.startAt,
        endAt: seg.endAt,
        status: prev.status,
        contributingWindowIds: mergedContributing,
      };
    } else {
      effectiveSegments.push(seg);
    }
  }

  return {
    effectiveSegments,
    unassertedSegments,
  };
}

type RawSnapshotRow = {
  payload: {
    bloodPressureMeasurements: Array<{
      id: string;
      patientId: string;
      systolic: number;
      diastolic: number;
      unit: string;
      measuredAt: string;
      createdAt: string;
      recordedByUserId: string;
      sourceKind: 'PATIENT_SELF_ENTRY' | 'CLINICIAN_ENTRY';
    }>;
    clinicalEncounters: Array<{
      id: string;
      patientId: string;
      occurredAt: string;
      purpose: string;
      recordedByUserId: string;
      createdAt: string;
    }>;
    structuralEncounterBpCandidates: Array<{
      associationId: string;
      encounterId: string;
      bloodPressureMeasurementId: string;
      encounterOccurredAt: string;
      bpMeasuredAt: string;
      systolic: number;
      diastolic: number;
      unit: string;
      bpSourceKind: 'PATIENT_SELF_ENTRY' | 'CLINICIAN_ENTRY';
    }>;
    operationalAppointmentCandidates: Array<{
      appointmentId: string;
      scheduledAt: string;
      purpose: 'HTN_BP_FOLLOWUP';
      status: 'SCHEDULED';
    }>;
    rawCoverageWindows: Array<{
      id: string;
      patientId: string;
      sourceType: 'SYNTHETIC_BENCHMARK';
      sourceReference: string;
      coverageStatus: 'COMPLETE' | 'INCOMPLETE' | 'UNKNOWN';
      startAt: string;
      endAt: string;
      createdAt: string;
    }>;
  };
};

/**
 * Executes the single-statement snapshot query retrieving all 5 factual evidence streams in
 * one transactional database statement snapshot.
 */
export async function internalExecuteEvidenceSnapshot(
  tx: Prisma.TransactionClient,
  patientId: string,
  queryStart: Date,
  queryEnd: Date,
  partition: { sourceType: 'SYNTHETIC_BENCHMARK'; sourceReference: string }
): Promise<NormalizedPatientEvidence> {
  const rows = await tx.$queryRaw<RawSnapshotRow[]>`
    WITH
      bp_rows AS (
        SELECT
          id,
          patient_id AS "patientId",
          systolic,
          diastolic,
          unit,
          measured_at AS "measuredAt",
          created_at AS "createdAt",
          recorded_by_user_id AS "recordedByUserId",
          source_kind AS "sourceKind"
        FROM public.blood_pressure_measurements
        WHERE patient_id = ${patientId}::uuid
          AND public.bp31_effective(id)
          AND measured_at >= ${queryStart.toISOString()}::timestamptz(6)
          AND measured_at < ${queryEnd.toISOString()}::timestamptz(6)
        ORDER BY measured_at ASC, id ASC
      ),
      encounter_rows AS (
        SELECT
          id,
          patient_id AS "patientId",
          occurred_at AS "occurredAt",
          purpose,
          recorded_by_user_id AS "recordedByUserId",
          created_at AS "createdAt"
        FROM public.clinical_encounters
        WHERE patient_id = ${patientId}::uuid
          AND occurred_at >= ${queryStart.toISOString()}::timestamptz(6)
          AND occurred_at < ${queryEnd.toISOString()}::timestamptz(6)
        ORDER BY occurred_at ASC, id ASC
      ),
      pair_rows AS (
        SELECT
          a.id AS "associationId",
          e.id AS "encounterId",
          b.id AS "bloodPressureMeasurementId",
          e.occurred_at AS "encounterOccurredAt",
          b.measured_at AS "bpMeasuredAt",
          b.systolic AS "systolic",
          b.diastolic AS "diastolic",
          b.unit AS "unit",
          b.source_kind AS "bpSourceKind"
        FROM public.clinical_encounters e
        JOIN public.encounter_bp_associations a
          ON a.encounter_id = e.id AND a.patient_id = e.patient_id
        JOIN public.blood_pressure_measurements b
          ON b.id = a.blood_pressure_measurement_id AND b.patient_id = a.patient_id
        WHERE e.patient_id = ${patientId}::uuid
          AND public.bp31_effective(b.id)
          AND e.occurred_at >= ${queryStart.toISOString()}::timestamptz(6)
          AND e.occurred_at < ${queryEnd.toISOString()}::timestamptz(6)
        ORDER BY e.occurred_at ASC, e.id ASC, a.id ASC
      ),
      appointment_rows AS (
        SELECT
          id AS "appointmentId",
          scheduled_at AS "scheduledAt",
          purpose,
          status
        FROM public.follow_up_appointments
        WHERE patient_id = ${patientId}::uuid
          AND scheduled_at >= ${queryStart.toISOString()}::timestamptz(6)
          AND scheduled_at < ${queryEnd.toISOString()}::timestamptz(6)
          AND status = 'SCHEDULED'
        ORDER BY scheduled_at ASC, id ASC
      ),
      coverage_rows AS (
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
        WHERE patient_id = ${patientId}::uuid
          AND source_type = ${partition.sourceType}::public.record_coverage_source_type
          AND source_reference = ${partition.sourceReference}
          AND start_at < ${queryEnd.toISOString()}::timestamptz(6)
          AND end_at > ${queryStart.toISOString()}::timestamptz(6)
        ORDER BY start_at ASC, end_at ASC, id ASC
      )
    SELECT
      jsonb_build_object(
        'bloodPressureMeasurements', COALESCE((SELECT jsonb_agg(to_jsonb(bp) ORDER BY bp."measuredAt" ASC, bp.id ASC) FROM bp_rows bp), '[]'::jsonb),
        'clinicalEncounters', COALESCE((SELECT jsonb_agg(to_jsonb(enc) ORDER BY enc."occurredAt" ASC, enc.id ASC) FROM encounter_rows enc), '[]'::jsonb),
        'structuralEncounterBpCandidates', COALESCE((SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr."encounterOccurredAt" ASC, pr."encounterId" ASC, pr."associationId" ASC) FROM pair_rows pr), '[]'::jsonb),
        'operationalAppointmentCandidates', COALESCE((SELECT jsonb_agg(to_jsonb(ap) ORDER BY ap."scheduledAt" ASC, ap."appointmentId" ASC) FROM appointment_rows ap), '[]'::jsonb),
        'rawCoverageWindows', COALESCE((SELECT jsonb_agg(to_jsonb(cov) ORDER BY cov."startAt" ASC, cov."endAt" ASC, cov.id ASC) FROM coverage_rows cov), '[]'::jsonb)
      ) AS payload
  `;

  if (rows.length !== 1 || !rows[0].payload) {
    throw new NormalizedEvidenceError('EVIDENCE_SERVICE_UNAVAILABLE', 'Empty snapshot payload');
  }

  const raw = rows[0].payload;

  const bloodPressureMeasurements: readonly NormalizedBpMeasurement[] = raw.bloodPressureMeasurements.map(bp => ({
    id: bp.id,
    patientId: bp.patientId,
    systolic: bp.systolic,
    diastolic: bp.diastolic,
    unit: 'mmHg',
    measuredAt: new Date(bp.measuredAt),
    createdAt: new Date(bp.createdAt),
    recordedByUserId: bp.recordedByUserId,
    sourceKind: bp.sourceKind,
  }));

  const clinicalEncounters: readonly NormalizedClinicalEncounter[] = raw.clinicalEncounters.map(enc => ({
    id: enc.id,
    patientId: enc.patientId,
    occurredAt: new Date(enc.occurredAt),
    purpose: enc.purpose,
    recordedByUserId: enc.recordedByUserId,
    createdAt: new Date(enc.createdAt),
  }));

  const structuralEncounterBpCandidates: readonly StructuralEncounterBpCandidate[] = raw.structuralEncounterBpCandidates.map(pr => ({
    associationId: pr.associationId,
    encounterId: pr.encounterId,
    bloodPressureMeasurementId: pr.bloodPressureMeasurementId,
    encounterOccurredAt: new Date(pr.encounterOccurredAt),
    bpMeasuredAt: new Date(pr.bpMeasuredAt),
    systolic: pr.systolic,
    diastolic: pr.diastolic,
    unit: 'mmHg',
    bpSourceKind: pr.bpSourceKind,
  }));

  const operationalAppointmentCandidates: readonly OperationalAppointmentCandidate[] = raw.operationalAppointmentCandidates.map(ap => ({
    appointmentId: ap.appointmentId,
    scheduledAt: new Date(ap.scheduledAt),
    purpose: 'HTN_BP_FOLLOWUP',
    status: 'SCHEDULED',
  }));

  const rawWindows: readonly NormalizedCoverageWindow[] = raw.rawCoverageWindows.map(cov => ({
    id: cov.id,
    patientId: cov.patientId,
    sourceType: cov.sourceType,
    sourceReference: cov.sourceReference,
    coverageStatus: cov.coverageStatus,
    startAt: new Date(cov.startAt),
    endAt: new Date(cov.endAt),
    createdAt: new Date(cov.createdAt),
  }));

  const { effectiveSegments, unassertedSegments } = normalizeCoverageIntervals(
    { startAt: queryStart, endAt: queryEnd },
    rawWindows
  );

  return {
    patientId,
    queryInterval: {
      startAt: queryStart,
      endAt: queryEnd,
    },
    partition: {
      sourceType: partition.sourceType,
      sourceReference: partition.sourceReference,
    },
    bloodPressureMeasurements,
    clinicalEncounters,
    structuralEncounterBpCandidates,
    operationalAppointmentCandidates,
    coverageFacts: {
      rawWindows,
      effectiveSegments,
      unassertedSegments,
    },
  };
}

/**
 * Low-level pure internal query reader (for testing and internal engine execution).
 * NOT exported from the package root.
 */
export async function internalGetNormalizedPatientEvidence(
  tx: Prisma.TransactionClient,
  rawInput: GetNormalizedPatientEvidenceInput
): Promise<NormalizedPatientEvidence> {
  const validated = validateNormalizedEvidenceInput(rawInput);
  return internalExecuteEvidenceSnapshot(
    tx,
    validated.patientId,
    validated.queryStart,
    validated.queryEnd,
    validated.partition
  );
}

/**
 * Public authorized persistence wrapper.
 * Strictly enforces current AuthPrincipal checks:
 * - Patient may access own normalized evidence only.
 * - Active assigned clinician may access assigned patient evidence only.
 * - Unassigned or wrong-patient clinician is denied (EVIDENCE_NOT_FOUND).
 * - Admin is denied by role alone (EVIDENCE_NOT_FOUND).
 */
export function createNormalizedEvidencePersistence(connectionString: string | undefined) {
  if (!connectionString) throw new NormalizedEvidenceError('EVIDENCE_SERVICE_UNAVAILABLE', 'Missing connection string');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });

  return {
    async getNormalizedPatientEvidence(
      principal: AuthPrincipal,
      rawInput: GetNormalizedPatientEvidenceInput
    ): Promise<NormalizedPatientEvidence> {
      const actor = { ...principal };
      if (!UUID_REGEX.test(actor.userId) || !UUID_REGEX.test(actor.sessionId)) {
        throw new NormalizedEvidenceError('EVIDENCE_UNAUTHENTICATED');
      }

      const validated = validateNormalizedEvidenceInput(rawInput);
      const patientId = validated.patientId;

      try {
        return await client.$transaction(
          async tx => {
            await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
            await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;

            // Lock user and session in canonical order
            await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;
            await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;

            // Validate current active session and user status
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
            if (sessions.length !== 1) throw new NormalizedEvidenceError('EVIDENCE_UNAUTHENTICATED');
            if (sessions[0].role !== actor.role || !['PATIENT', 'CLINICIAN'].includes(sessions[0].role)) {
              throw new NormalizedEvidenceError('EVIDENCE_NOT_FOUND');
            }

            // Clinician authorization: active assignment required
            if (actor.role === 'CLINICIAN') {
              const clinicians = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM public.clinician_profiles WHERE user_id=${actor.userId}::uuid AND user_role='CLINICIAN' FOR SHARE
              `;
              if (clinicians.length !== 1) throw new NormalizedEvidenceError('EVIDENCE_NOT_FOUND');

              const assignments = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM public.clinician_patient_assignments
                WHERE clinician_id=${clinicians[0].id}::uuid
                  AND patient_id=${patientId}::uuid
                  AND status='ACTIVE'
                  AND ended_at IS NULL
                FOR SHARE
              `;
              if (assignments.length !== 1) throw new NormalizedEvidenceError('EVIDENCE_NOT_FOUND');
            }

            // Patient authorization: own profile required
            const patients = await tx.$queryRaw<{ userId: string }[]>`
              SELECT user_id AS "userId" FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' FOR SHARE
            `;
            if (patients.length !== 1 || (actor.role === 'PATIENT' && patients[0].userId !== actor.userId.toLowerCase())) {
              throw new NormalizedEvidenceError('EVIDENCE_NOT_FOUND');
            }

            // Execute single-statement snapshot
            const result = await internalExecuteEvidenceSnapshot(
              tx,
              patientId,
              validated.queryStart,
              validated.queryEnd,
              validated.partition
            );

            // Recheck session status before commit
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
            if (recheck.length !== 1) throw new NormalizedEvidenceError('EVIDENCE_UNAUTHENTICATED');

            return result;
          },
          { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 }
        );
      } catch (error) {
        if (error instanceof NormalizedEvidenceError) throw error;
        throw new NormalizedEvidenceError('EVIDENCE_SERVICE_UNAVAILABLE', error);
      }
    },

    async close(): Promise<void> {
      try {
        await client.$disconnect();
        await pool.end();
      } catch {
        throw new NormalizedEvidenceError('EVIDENCE_SERVICE_UNAVAILABLE');
      }
    },
  };
}

export type NormalizedEvidencePersistence = ReturnType<typeof createNormalizedEvidencePersistence>;
