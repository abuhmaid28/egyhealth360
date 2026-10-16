import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { bpTimestamp } from './blood-pressure-values.js';

export type EvidenceKind = 'appointment' | 'encounter';
export type EvidenceField = 'scheduledAt' | 'occurredAt' | 'purpose' | '$';
export type EvidenceFieldError = Readonly<{ field: EvidenceField; reason: 'required' | 'type' | 'format' | 'precision' | 'future' | 'not_future' | 'unknown_fields' | 'representation' }>;
export type EvidenceCode = 'REQUEST_INVALID' | 'FOLLOW_UP_APPOINTMENT_INVALID' | 'CLINICAL_ENCOUNTER_INVALID' | 'EVIDENCE_UNAUTHENTICATED' | 'EVIDENCE_NOT_FOUND' | 'ENCOUNTER_BP_CONFLICT' | 'FOLLOW_UP_SERVICE_UNAVAILABLE' | 'CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE';
export class ClinicalEvidenceError extends Error {
  constructor(public readonly code: EvidenceCode, public readonly fields: readonly EvidenceFieldError[] = []) { super(code); }
}
export const evidenceFail = (code: EvidenceCode): never => { throw new ClinicalEvidenceError(code); };
export const evidenceInvalid = (kind: EvidenceKind, field: EvidenceField, reason: EvidenceFieldError['reason']): never => {
  throw new ClinicalEvidenceError(kind === 'appointment' ? 'FOLLOW_UP_APPOINTMENT_INVALID' : 'CLINICAL_ENCOUNTER_INVALID', [{ field, reason }]);
};
export const evidenceUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function evidenceKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return evidenceFail('REQUEST_INVALID');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== keys.length || Reflect.ownKeys(value).some(k => typeof k !== 'string' || !keys.includes(k))
    || keys.some(k => !Object.hasOwn(descriptors, k) || !('value' in descriptors[k]))) evidenceFail('REQUEST_INVALID');
}
export function evidenceValues(kind: EvidenceKind, input: Record<string, unknown>) {
  const field = kind === 'appointment' ? 'scheduledAt' : 'occurredAt';
  if (input.purpose !== 'HTN_BP_FOLLOWUP') evidenceInvalid(kind, 'purpose', typeof input.purpose === 'string' ? 'format' : 'type');
  let time: Date;
  try { time = bpTimestamp(input[field]); } catch { return evidenceInvalid(kind, field, typeof input[field] === 'string' ? 'format' : 'type'); }
  return { time, purpose: 'HTN_BP_FOLLOWUP' as const };
}
export type EvidencePage = Readonly<{ page: number; pageSize: number }>;
export function evidencePage(input: EvidencePage) {
  if (!Number.isInteger(input.page) || input.page < 1 || input.page > 2147483647 || !Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100) evidenceFail('REQUEST_INVALID');
  return { page: input.page, pageSize: input.pageSize };
}
export type EvidenceTx = Prisma.TransactionClient;
async function checkSession(tx: EvidenceTx, actor: AuthPrincipal) {
  const rows = await tx.$queryRaw<{ role: string }[]>`SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id
    WHERE u.id=${actor.userId}::uuid AND s.id=${actor.sessionId}::uuid AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
  if (rows.length !== 1) evidenceFail('EVIDENCE_UNAUTHENTICATED');
  if (rows[0].role !== actor.role || !['PATIENT', 'CLINICIAN'].includes(rows[0].role)) evidenceFail('EVIDENCE_NOT_FOUND');
}
/** Internal EH-012 transaction helper. No unscoped client is exported from the package. */
export function evidenceTransactions(connectionString: string | undefined, kind: EvidenceKind) {
  const unavailable = kind === 'appointment' ? 'FOLLOW_UP_SERVICE_UNAVAILABLE' : 'CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE';
  if (!connectionString) evidenceFail(unavailable);
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 }); pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async run<T>(principal: AuthPrincipal, patientId: string, write: boolean, operation: (tx: EvidenceTx, actor: AuthPrincipal) => Promise<T>): Promise<T> {
      const actor = { ...principal };
      if (!evidenceUuid(actor.userId) || !evidenceUuid(actor.sessionId)) evidenceFail('EVIDENCE_UNAUTHENTICATED');
      if (!evidenceUuid(patientId)) evidenceFail('EVIDENCE_NOT_FOUND');
      try {
        return await client.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
          await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
          await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;
          await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;
          await checkSession(tx, actor);
          if (write && actor.role !== 'CLINICIAN') evidenceFail('EVIDENCE_NOT_FOUND');
          if (actor.role === 'CLINICIAN') {
            const clinicians = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_profiles WHERE user_id=${actor.userId}::uuid AND user_role='CLINICIAN' FOR SHARE`;
            if (clinicians.length !== 1) evidenceFail('EVIDENCE_NOT_FOUND');
            const assignments = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=${clinicians[0].id}::uuid AND patient_id=${patientId}::uuid AND status='ACTIVE' AND ended_at IS NULL FOR SHARE`;
            if (assignments.length !== 1) evidenceFail('EVIDENCE_NOT_FOUND');
          }
          const patients = await tx.$queryRaw<{ userId: string }[]>`SELECT user_id AS "userId" FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' FOR SHARE`;
          if (patients.length !== 1 || (actor.role === 'PATIENT' && patients[0].userId !== actor.userId.toLowerCase())) evidenceFail('EVIDENCE_NOT_FOUND');
          const result = await operation(tx, actor);
          await checkSession(tx, actor);
          return result;
        }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
      } catch (error) { if (error instanceof ClinicalEvidenceError) throw error; return evidenceFail(unavailable); }
    },
    async close() { try { await client.$disconnect(); await pool.end(); } catch { evidenceFail(unavailable); } },
  };
}
