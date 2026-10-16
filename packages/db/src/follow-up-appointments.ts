import type { AuthPrincipal } from './auth.js';
import type { PatientProfileId } from './authorization.js';
import { appendAuditRecord } from './audit.js';
import { evidenceFail, evidenceInvalid, evidenceKeys, evidencePage, evidenceTransactions, evidenceUuid, evidenceValues, type EvidencePage } from './followup-common.js';
export type FollowUpAppointmentId = string & { readonly __appointmentId: unique symbol };
export type FollowUpAppointmentSnapshot = Readonly<{
  id: string; patientId: string; scheduledAt: Date; purpose: string; status: 'SCHEDULED' | 'CANCELLED';
  createdByUserId: string; createdAt: Date; cancelledAt: Date | null; cancelledByUserId: string | null;
}>;
export function createFollowUpAppointmentPersistence(connectionString: string | undefined) {
  const store = evidenceTransactions(connectionString, 'appointment');
  return {
    async createFollowUpAppointment(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; scheduledAt: string; purpose: 'HTN_BP_FOLLOWUP' }>): Promise<FollowUpAppointmentSnapshot> {
      evidenceKeys(input, ['patientId', 'scheduledAt', 'purpose']);
      const patientId = input.patientId, { time, purpose } = evidenceValues('appointment', input);
      return store.run(principal, patientId, true, async (tx, actor) => {
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) AS now`;
        if (time <= now) evidenceInvalid('appointment', 'scheduledAt', 'not_future');
        const row = await tx.followUpAppointment.create({ data: { patientId, scheduledAt: time, purpose, createdByUserId: actor.userId } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'FOLLOW_UP_APPOINTMENT_CREATED', entityType: 'follow_up_appointment', entityId: row.id });
        return row;
      });
    },
    async cancelFollowUpAppointment(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; appointmentId: FollowUpAppointmentId }>) {
      evidenceKeys(input, ['patientId', 'appointmentId']); const { patientId, appointmentId } = input;
      if (!evidenceUuid(appointmentId)) evidenceFail('EVIDENCE_NOT_FOUND');
      return store.run(principal, patientId, true, async (tx, actor) => {
        const rows = await tx.$queryRaw<FollowUpAppointmentSnapshot[]>`SELECT id FROM public.follow_up_appointments WHERE id=${appointmentId}::uuid AND patient_id=${patientId}::uuid FOR UPDATE`;
        if (rows.length !== 1) evidenceFail('EVIDENCE_NOT_FOUND');
        const row = await tx.followUpAppointment.findUniqueOrThrow({ where: { id: appointmentId } });
        if (row.status === 'CANCELLED') return { appointment: row, changed: false };
        const appointment = await tx.followUpAppointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED', cancelledByUserId: actor.userId } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'FOLLOW_UP_APPOINTMENT_CANCELLED', entityType: 'follow_up_appointment', entityId: row.id });
        return { appointment, changed: true };
      });
    },
    async listFollowUpAppointments(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId } & EvidencePage>) {
      evidenceKeys(input, ['patientId', 'page', 'pageSize']); const patientId = input.patientId, page = evidencePage(input);
      return store.run(principal, patientId, false, async tx => {
        const [result] = await tx.$queryRaw<{ total: number; rows: FollowUpAppointmentSnapshot[] }[]>`
          SELECT (SELECT count(*)::integer FROM public.follow_up_appointments WHERE patient_id=${patientId}::uuid) total,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."scheduledAt" DESC,p.id DESC) FROM (
            SELECT id,patient_id AS "patientId",scheduled_at AS "scheduledAt",purpose,status,created_by_user_id AS "createdByUserId",created_at AS "createdAt",cancelled_at AS "cancelledAt",cancelled_by_user_id AS "cancelledByUserId"
            FROM public.follow_up_appointments WHERE patient_id=${patientId}::uuid ORDER BY scheduled_at DESC,id DESC LIMIT ${page.pageSize} OFFSET ${(page.page - 1) * page.pageSize}
          ) p),'[]'::jsonb) rows`;
        return { data: result.rows.map(r => ({ ...r, scheduledAt: new Date(r.scheduledAt), createdAt: new Date(r.createdAt), cancelledAt: r.cancelledAt ? new Date(r.cancelledAt) : null })), meta: { ...page, total: result.total } };
      });
    },
    close: store.close,
  };
}
export type FollowUpAppointmentPersistence = ReturnType<typeof createFollowUpAppointmentPersistence>;
