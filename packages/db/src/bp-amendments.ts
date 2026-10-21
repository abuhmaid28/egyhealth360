import { Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';
import { exactBpKeys, validateBpValues } from './blood-pressure-values.js';
import { ClinicalEvidenceError, evidenceTransactions, type EvidenceTx } from './followup-common.js';

export const BP_EXCLUSION_REASONS = Object.freeze(['DATA_ENTRY_ERROR', 'MEASUREMENT_ERROR', 'DUPLICATE', 'WRONG_PATIENT', 'WRONG_CONTEXT', 'SOURCE_WITHDRAWAL', 'PROVENANCE_ERROR', 'CORRECTION_ERROR'] as const);
export type BpExclusionReason = typeof BP_EXCLUSION_REASONS[number];
export type BpAmendmentKind = 'EXCLUDE' | 'CORRECT' | 'RESTATE' | 'PRIVACY';
export class BpAmendmentError extends Error {
  constructor(public readonly code: 'BP_AMENDMENT_INVALID' | 'BP_AMENDMENT_CONFLICT' | 'BP_AMENDMENT_NOT_FOUND' | 'BP_AMENDMENT_UNAUTHENTICATED' | 'BP_AMENDMENT_UNAVAILABLE') { super(code); }
}
type PairInput = Readonly<{ systolic: number; diastolic: number; unit: 'mmHg'; measuredAt: string }>;
type Target = Readonly<{ patientId: string; bpId: string }>;
type Command = Target & Readonly<{ operationId: string; reason: BpExclusionReason; expectedState: 'UNEXCLUDED'; duplicateOfBpId: string | null }>;
type Canonical = { patientId: string; bpId: string; operationId: string; kind: BpAmendmentKind; reason: BpExclusionReason; duplicateOfBpId: string | null; predecessorIds: string[]; pair: { systolic: number; diastolic: number; unit: 'mmHg'; measuredAt: Date } | null };
export type BpAmendmentResult = Readonly<{ operationId: string; kind: string; recordedAt: Date; created: boolean; replacementId: string | null; exclusionIds: string[]; privacyIds: string[] }>;
const invalid = (): never => { throw new BpAmendmentError('BP_AMENDMENT_INVALID'); };
const conflict = (): never => { throw new BpAmendmentError('BP_AMENDMENT_CONFLICT'); };
const denied = (): never => { throw new BpAmendmentError('BP_AMENDMENT_NOT_FOUND'); };
const uuid = (v: unknown): string => {
  if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return invalid();
  return v.toLowerCase();
};
function canonical(raw: unknown, kind: BpAmendmentKind): Canonical {
  try {
    const fields = ['patientId', 'bpId', 'operationId'];
    if (kind === 'EXCLUDE' || kind === 'CORRECT') fields.push('reason', 'expectedState', 'duplicateOfBpId');
    if (kind === 'CORRECT' || kind === 'RESTATE') fields.push('replacement');
    if (kind === 'PRIVACY') fields.push('predecessorIds');
    exactBpKeys(raw, fields);
    const patientId = uuid(raw.patientId), bpId = uuid(raw.bpId), operationId = uuid(raw.operationId);
    const reason = kind === 'PRIVACY' ? 'WRONG_PATIENT' : kind === 'RESTATE' ? 'CORRECTION_ERROR' : raw.reason;
    if (!BP_EXCLUSION_REASONS.includes(reason as BpExclusionReason)) invalid();
    if ((kind === 'EXCLUDE' || kind === 'CORRECT') && raw.expectedState !== 'UNEXCLUDED') invalid();
    if (kind === 'CORRECT' && reason === 'WRONG_PATIENT') invalid();
    const duplicateOfBpId = kind === 'EXCLUDE' || kind === 'CORRECT' ? raw.duplicateOfBpId === null ? null : uuid(raw.duplicateOfBpId) : null;
    if (duplicateOfBpId && (reason !== 'DUPLICATE' || duplicateOfBpId === bpId)) invalid();
    let predecessorIds: string[] = [];
    if (kind === 'PRIVACY') {
      const ids = raw.predecessorIds;
      if (!Array.isArray(ids)) return invalid();
      if (ids.length > 99 || Object.getPrototypeOf(ids) !== Array.prototype || Reflect.ownKeys(ids).length !== ids.length + 1 || Object.keys(ids).length !== ids.length) invalid();
      // Do not invoke accessors on caller-owned arrays during normalization.
      predecessorIds = Array.from({ length: ids.length }, (_, i) => {
        const d = Object.getOwnPropertyDescriptor(ids, String(i));
        return d && 'value' in d ? uuid(d.value) : invalid();
      }).sort();
      if (new Set(predecessorIds).size !== predecessorIds.length || predecessorIds.includes(bpId)) invalid();
    }
    let pair: Canonical['pair'] = null;
    if (kind === 'CORRECT' || kind === 'RESTATE') {
      exactBpKeys(raw.replacement, ['systolic', 'diastolic', 'unit', 'measuredAt']);
      pair = validateBpValues(raw.replacement);
    }
    return { patientId, bpId, operationId, kind, reason: reason as BpExclusionReason, duplicateOfBpId, predecessorIds, pair };
  } catch { return invalid(); }
}
function dbError(error: unknown): never {
  if (error instanceof BpAmendmentError) throw error;
  const e = error as { code?: string; meta?: { code?: string } };
  if (e?.code === 'P2002' || e?.meta?.code === '23505') return conflict();
  if (e?.code === 'P2003' || ['23514', '23503'].includes(e?.meta?.code ?? '')) return invalid();
  throw new BpAmendmentError('BP_AMENDMENT_UNAVAILABLE');
}
export function createBpAmendmentPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new BpAmendmentError('BP_AMENDMENT_UNAVAILABLE');
  const store = evidenceTransactions(connectionString, 'encounter', error => error instanceof BpAmendmentError);
  async function run<T>(principal: AuthPrincipal, patientId: string, write: boolean, action: (tx: EvidenceTx, actor: AuthPrincipal) => Promise<T>): Promise<T> {
    try { return await store.run(principal, patientId, write, async (tx, actor) => { try { return await action(tx, actor); } catch (e) { return dbError(e); } }); }
    catch (e) {
      if (e instanceof BpAmendmentError) throw e;
      if (e instanceof ClinicalEvidenceError) {
        if (e.code === 'EVIDENCE_UNAUTHENTICATED') throw new BpAmendmentError('BP_AMENDMENT_UNAUTHENTICATED');
        if (e.code === 'EVIDENCE_NOT_FOUND') return denied();
      }
      throw new BpAmendmentError('BP_AMENDMENT_UNAVAILABLE');
    }
  }
  async function result(tx: EvidenceTx, id: string, created: boolean): Promise<BpAmendmentResult> {
    // Always use current privacy projection, including exact retries after a later restriction.
    const [row] = await tx.$queryRaw<(BpAmendmentResult & { coherent: boolean })[]>`SELECT o.id AS "operationId",o.kind,o.recorded_at AS "recordedAt",
      CASE WHEN public.bp31_disclosable(o.new_bp_id) THEN o.new_bp_id ELSE NULL END AS "replacementId",
      ARRAY(SELECT id FROM public.bp_exclusions WHERE operation_id=o.id ORDER BY id) AS "exclusionIds",
      ARRAY(SELECT id FROM public.bp_privacy_targets WHERE operation_id=o.id ORDER BY id) AS "privacyIds",
      (o.kind NOT IN ('EXCLUDE','CORRECT') OR EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.operation_id=o.id AND e.bp_id=o.target_bp_id))
      AND (o.kind<>'RESTATE' OR EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.bp_id=o.target_bp_id))
      AND (o.new_bp_id IS NULL OR EXISTS (SELECT 1 FROM public.blood_pressure_measurements b WHERE b.id=o.new_bp_id AND b.patient_id=o.patient_id))
      AND (NOT (o.kind='PRIVACY' OR (o.kind='EXCLUDE' AND o.reason_code='WRONG_PATIENT')) OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.unnest(ARRAY[o.target_bp_id] || o.predecessor_ids) target
        WHERE NOT EXISTS (SELECT 1 FROM public.bp_privacy_targets p WHERE p.operation_id=o.id AND p.bp_id=target)
          OR NOT EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.bp_id=target))) AS coherent
      FROM public.bp_amendment_operations o WHERE o.id=${id}::uuid`;
    if (!row?.coherent) throw new BpAmendmentError('BP_AMENDMENT_UNAVAILABLE');
    return { operationId: row.operationId, kind: row.kind, recordedAt: row.recordedAt, replacementId: row.replacementId,
      exclusionIds: row.exclusionIds, privacyIds: row.privacyIds, created };
  }
  async function execute(principal: AuthPrincipal, c: Canonical) {
    return run(principal, c.patientId, true, async (tx, actor) => {
      const ids = [...new Set([c.bpId, ...c.predecessorIds, ...(c.duplicateOfBpId ? [c.duplicateOfBpId] : [])])].sort();
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.blood_pressure_measurements WHERE patient_id=${c.patientId}::uuid AND id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`;
      if (rows.length !== ids.length) return denied();
      const prior = await tx.bpAmendmentOperation.findUnique({ where: { actorUserId_kind_operationKey: { actorUserId: actor.userId, kind: c.kind, operationKey: c.operationId } } });
      if (prior) {
        if (prior.patientId !== c.patientId || prior.targetBpId !== c.bpId || prior.reasonCode !== c.reason || prior.duplicateOfBpId !== c.duplicateOfBpId
          || JSON.stringify(prior.predecessorIds) !== JSON.stringify(c.predecessorIds) || prior.systolic !== (c.pair?.systolic ?? null)
          || prior.diastolic !== (c.pair?.diastolic ?? null) || prior.measuredAt?.getTime() !== c.pair?.measuredAt.getTime()) return conflict();
        return result(tx, prior.id, false);
      }
      if (c.predecessorIds.length) {
        const [lineage] = await tx.$queryRaw<{ count: number }[]>`WITH RECURSIVE ancestors(id) AS (
          SELECT target_bp_id FROM public.bp_amendment_operations WHERE kind IN ('CORRECT','RESTATE') AND new_bp_id=${c.bpId}::uuid
          UNION SELECT o.target_bp_id FROM public.bp_amendment_operations o JOIN ancestors a ON o.new_bp_id=a.id WHERE o.kind IN ('CORRECT','RESTATE')
        ) SELECT count(*)::integer AS count FROM ancestors WHERE id IN (${Prisma.join(c.predecessorIds.map(id => Prisma.sql`${id}::uuid`))})`;
        if (lineage.count !== c.predecessorIds.length) return invalid();
      }
      const existing = await tx.bpExclusion.findUnique({ where: { bpId: c.bpId } });
      if (existing && (c.kind === 'EXCLUDE' || c.kind === 'CORRECT')) return conflict();
      if (c.kind === 'RESTATE') {
        if (!existing) return invalid();
        const sourceOperation = await tx.bpAmendmentOperation.findUnique({ where: { id: existing.operationId } });
        if (!sourceOperation || sourceOperation.newBpId !== null) return invalid();
      }
      if (c.kind === 'PRIVACY' && await tx.bpPrivacyTarget.count({ where: { bpId: { in: [c.bpId, ...c.predecessorIds] } } })) return conflict();
      let newBpId: string | null = null;
      if (c.pair) {
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) AS now`;
        if (c.pair.measuredAt > now) return invalid();
        const bp = await tx.bloodPressureMeasurement.create({ data: { patientId: c.patientId, ...c.pair, sourceKind: 'CLINICIAN_ENTRY', recordedByUserId: actor.userId } });
        newBpId = bp.id;
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'BP_MEASUREMENT_CREATED', entityType: 'blood_pressure_measurement', entityId: bp.id });
      }
      const op = await tx.bpAmendmentOperation.create({ data: { patientId: c.patientId, actorUserId: actor.userId, kind: c.kind, operationKey: c.operationId,
        targetBpId: c.bpId, reasonCode: c.reason, duplicateOfBpId: c.duplicateOfBpId, predecessorIds: c.predecessorIds,
        newBpId, systolic: c.pair?.systolic, diastolic: c.pair?.diastolic, measuredAt: c.pair?.measuredAt } });
      const targets = c.kind === 'PRIVACY' ? [c.bpId, ...c.predecessorIds].sort() : [c.bpId];
      for (const bpId of targets) {
        if (c.kind !== 'RESTATE' && !await tx.bpExclusion.findUnique({ where: { bpId } })) {
          const exclusion = await tx.bpExclusion.create({ data: { patientId: c.patientId, bpId, operationId: op.id, reasonCode: c.reason } });
          await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'BP_EVIDENCE_EXCLUDED', entityType: 'bp_exclusion', entityId: exclusion.id });
        }
        if (c.kind === 'PRIVACY' || c.reason === 'WRONG_PATIENT') {
          const privacy = await tx.bpPrivacyTarget.create({ data: { patientId: c.patientId, bpId, operationId: op.id } });
          await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'BP_PRIVACY_RESTRICTED', entityType: 'bp_privacy_target', entityId: privacy.id });
        }
      }
      if (c.kind === 'RESTATE') await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'BP_EVIDENCE_RESTATED', entityType: 'bp_amendment_operation', entityId: op.id });
      return result(tx, op.id, true);
    });
  }
  return {
    async exclude(principal: AuthPrincipal, input: Command) { return execute(principal, canonical(input, 'EXCLUDE')); },
    async correct(principal: AuthPrincipal, input: Command & Readonly<{ replacement: PairInput }>) { return execute(principal, canonical(input, 'CORRECT')); },
    async restate(principal: AuthPrincipal, input: Target & Readonly<{ operationId: string; replacement: PairInput }>) { return execute(principal, canonical(input, 'RESTATE')); },
    async restrictWrongPatient(principal: AuthPrincipal, input: Target & Readonly<{ operationId: string; predecessorIds: readonly string[] }>) { return execute(principal, canonical(input, 'PRIVACY')); },
    async getHistory(principal: AuthPrincipal, input: Target) {
      try { exactBpKeys(input, ['patientId', 'bpId']); } catch { return invalid(); }
      const patientId = uuid(input.patientId), bpId = uuid(input.bpId);
      return run(principal, patientId, false, async tx => {
        const [row] = await tx.$queryRaw<{ coherent: boolean; measurement: Record<string, unknown>; exclusion: Record<string, unknown> | null; restatements: string[]; predecessors: string[] }[]>`
          SELECT jsonb_build_object('id',b.id,'patientId',b.patient_id,'systolic',b.systolic,'diastolic',b.diastolic,'unit',b.unit,'measuredAt',b.measured_at,'createdAt',b.created_at,'sourceKind',b.source_kind) AS measurement,
          (SELECT jsonb_build_object('id',e.id,'reason',e.reason_code,'assertedAt',e.asserted_at,'recordedAt',e.recorded_at,'operationId',e.operation_id,
             'replacementId',CASE WHEN public.bp31_disclosable(o.new_bp_id) THEN o.new_bp_id ELSE NULL END)
             FROM public.bp_exclusions e JOIN public.bp_amendment_operations o ON o.id=e.operation_id WHERE e.bp_id=b.id) AS exclusion,
          ARRAY(SELECT o.new_bp_id FROM public.bp_amendment_operations o WHERE o.kind='RESTATE' AND o.target_bp_id=b.id AND public.bp31_disclosable(o.new_bp_id) ORDER BY o.id) AS restatements,
          ARRAY(SELECT o.target_bp_id FROM public.bp_amendment_operations o WHERE o.new_bp_id=b.id AND public.bp31_disclosable(o.target_bp_id) ORDER BY o.id) AS predecessors,
          NOT EXISTS (SELECT 1 FROM public.bp_amendment_operations o WHERE (o.target_bp_id=b.id OR o.new_bp_id=b.id)
            AND o.kind IN ('EXCLUDE','CORRECT') AND NOT EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.operation_id=o.id AND e.bp_id=o.target_bp_id))
          AND NOT EXISTS (SELECT 1 FROM public.bp_exclusions e WHERE e.bp_id=b.id AND NOT EXISTS (SELECT 1 FROM public.bp_amendment_operations o WHERE o.id=e.operation_id)) AS coherent
          FROM public.blood_pressure_measurements b WHERE b.id=${bpId}::uuid AND b.patient_id=${patientId}::uuid AND public.bp31_disclosable(b.id)`;
        if (!row) return denied();
        if (!row.coherent) throw new BpAmendmentError('BP_AMENDMENT_UNAVAILABLE');
        const { measurement, exclusion, restatements, predecessors } = row;
        return { measurement, exclusion, restatements, predecessors };
      });
    },
    async listEffective(principal: AuthPrincipal, input: Readonly<{ patientId: string; page: number; pageSize: number }>) {
      try { exactBpKeys(input, ['patientId', 'page', 'pageSize']); } catch { return invalid(); }
      const patientId = uuid(input.patientId), { page, pageSize } = input;
      if (!Number.isInteger(page) || page < 1 || page > 2147483647 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) invalid();
      return run(principal, patientId, false, async tx => {
        const [row] = await tx.$queryRaw<{ total: number; measurements: unknown[] }[]>`WITH permitted AS (
          SELECT id,patient_id AS "patientId",systolic,diastolic,unit,measured_at AS "measuredAt",created_at AS "createdAt",source_kind AS "sourceKind"
          FROM public.blood_pressure_measurements WHERE patient_id=${patientId}::uuid AND public.bp31_effective(id))
          SELECT (SELECT count(*)::integer FROM permitted) total,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."measuredAt" DESC,p.id DESC) FROM (SELECT * FROM permitted ORDER BY "measuredAt" DESC,id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}) p),'[]'::jsonb) measurements`;
        return { ...row, page, pageSize };
      });
    },
    close: store.close,
  };
}
