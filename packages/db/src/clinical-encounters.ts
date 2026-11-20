import type { AuthPrincipal } from './auth.js';
import type { PatientProfileId } from './authorization.js';
import type { BloodPressureMeasurementId } from './blood-pressure.js';
import { appendAuditRecord } from './audit.js';
import { evidenceFail, evidenceInvalid, evidenceKeys, evidencePage, evidenceTransactions, evidenceUuid, evidenceValues, type EvidencePage, type EvidenceTx } from './followup-common.js';
export type ClinicalEncounterId = string & { readonly __encounterId: unique symbol };
export type ClinicalEncounterSnapshot = Readonly<{ id: string; patientId: string; occurredAt: Date; purpose: string; recordedByUserId: string; createdAt: Date }>;
export type EncounterBloodPressureAssociationSnapshot = Readonly<{ id: string; patientId: string; encounterId: string; bloodPressureMeasurementId: string; recordedByUserId: string; createdAt: Date }>;
async function lockEncounter(tx: EvidenceTx, patientId: string, encounterId: string) {
  if (!evidenceUuid(encounterId)) evidenceFail('EVIDENCE_NOT_FOUND');
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinical_encounters WHERE id=${encounterId}::uuid AND patient_id=${patientId}::uuid AND purpose='HTN_BP_FOLLOWUP' FOR SHARE`;
  if (rows.length !== 1) evidenceFail('EVIDENCE_NOT_FOUND');
}
export function createClinicalEncounterPersistence(connectionString: string | undefined) {
  const store = evidenceTransactions(connectionString, 'encounter');
  return {
    async createClinicalEncounter(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; occurredAt: string; purpose: 'HTN_BP_FOLLOWUP' }>): Promise<ClinicalEncounterSnapshot> {
      evidenceKeys(input, ['patientId', 'occurredAt', 'purpose']); const patientId = input.patientId, { time, purpose } = evidenceValues('encounter', input);
      return store.run(principal, patientId, true, async (tx, actor) => {
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) AS now`;
        if (time > now) evidenceInvalid('encounter', 'occurredAt', 'future');
        const row = await tx.clinicalEncounter.create({ data: { patientId, occurredAt: time, purpose, recordedByUserId: actor.userId } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'CLINICAL_ENCOUNTER_CREATED', entityType: 'clinical_encounter', entityId: row.id });
        return row;
      });
    },
    async listClinicalEncounters(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId } & EvidencePage>) {
      evidenceKeys(input, ['patientId', 'page', 'pageSize']); const patientId = input.patientId, page = evidencePage(input);
      return store.run(principal, patientId, false, async tx => {
        const [result] = await tx.$queryRaw<{ total: number; rows: ClinicalEncounterSnapshot[] }[]>`
          SELECT (SELECT count(*)::integer FROM public.clinical_encounters WHERE patient_id=${patientId}::uuid AND purpose='HTN_BP_FOLLOWUP') total,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."occurredAt" DESC,p.id DESC) FROM (
            SELECT id,patient_id AS "patientId",occurred_at AS "occurredAt",purpose,recorded_by_user_id AS "recordedByUserId",created_at AS "createdAt"
            FROM public.clinical_encounters WHERE patient_id=${patientId}::uuid AND purpose='HTN_BP_FOLLOWUP' ORDER BY occurred_at DESC,id DESC LIMIT ${page.pageSize} OFFSET ${(page.page - 1) * page.pageSize}
          ) p),'[]'::jsonb) rows`;
        return { data: result.rows.map(r => ({ ...r, occurredAt: new Date(r.occurredAt), createdAt: new Date(r.createdAt) })), meta: { ...page, total: result.total } };
      });
    },
    async associateBloodPressureMeasurement(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; encounterId: ClinicalEncounterId; measurementId: BloodPressureMeasurementId }>) {
      evidenceKeys(input, ['patientId', 'encounterId', 'measurementId']); const { patientId, encounterId, measurementId } = input;
      if (!evidenceUuid(encounterId) || !evidenceUuid(measurementId)) evidenceFail('EVIDENCE_NOT_FOUND');
      return store.run(principal, patientId, true, async (tx, actor) => {
        await lockEncounter(tx, patientId, encounterId);
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.blood_pressure_measurements WHERE id=${measurementId}::uuid AND patient_id=${patientId}::uuid AND public.bp31_disclosable(id) FOR UPDATE`;
        if (rows.length !== 1) evidenceFail('EVIDENCE_NOT_FOUND');
        // A lock-only privacy writer can commit during the wait without changing the BP
        // tuple. Recheck in a fresh statement before even an existing-pair acknowledgement.
        const [state] = await tx.$queryRaw<{ disclosable: boolean; effective: boolean }[]>`SELECT public.bp31_disclosable(${measurementId}::uuid) AS disclosable, public.bp31_effective(${measurementId}::uuid) AS effective`;
        if (!state.disclosable) evidenceFail('EVIDENCE_NOT_FOUND');
        const existing = await tx.encounterBloodPressureAssociation.findUnique({ where: { bloodPressureMeasurementId: measurementId } });
        if (existing) {
          if (existing.encounterId !== encounterId) evidenceFail('ENCOUNTER_BP_CONFLICT');
          return { association: existing, changed: false };
        }
        if (!state.effective) evidenceFail('EVIDENCE_NOT_FOUND');
        const association = await tx.encounterBloodPressureAssociation.create({ data: { patientId, encounterId, bloodPressureMeasurementId: measurementId, recordedByUserId: actor.userId } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'ENCOUNTER_BP_ASSOCIATED', entityType: 'encounter_bp_association', entityId: association.id });
        return { association, changed: true };
      });
    },
    async listEncounterBloodPressureAssociations(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; encounterId: ClinicalEncounterId } & EvidencePage>) {
      evidenceKeys(input, ['patientId', 'encounterId', 'page', 'pageSize']); const { patientId, encounterId } = input, page = evidencePage(input);
      return store.run(principal, patientId, false, async tx => {
        await lockEncounter(tx, patientId, encounterId);
        const [result] = await tx.$queryRaw<{ total: number; rows: EncounterBloodPressureAssociationSnapshot[] }[]>`
          SELECT (SELECT count(*)::integer FROM public.encounter_bp_associations WHERE patient_id=${patientId}::uuid AND encounter_id=${encounterId}::uuid AND public.bp31_disclosable(blood_pressure_measurement_id)) total,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."createdAt" DESC,p.id DESC) FROM (
            SELECT id,patient_id AS "patientId",encounter_id AS "encounterId",blood_pressure_measurement_id AS "bloodPressureMeasurementId",recorded_by_user_id AS "recordedByUserId",created_at AS "createdAt"
            FROM public.encounter_bp_associations WHERE patient_id=${patientId}::uuid AND encounter_id=${encounterId}::uuid AND public.bp31_disclosable(blood_pressure_measurement_id) ORDER BY created_at DESC,id DESC LIMIT ${page.pageSize} OFFSET ${(page.page - 1) * page.pageSize}
          ) p),'[]'::jsonb) rows`;
        return { data: result.rows.map(r => ({ ...r, createdAt: new Date(r.createdAt) })), meta: { ...page, total: result.total } };
      });
    },
    close: store.close,
  };
}
export type ClinicalEncounterPersistence = ReturnType<typeof createClinicalEncounterPersistence>;
