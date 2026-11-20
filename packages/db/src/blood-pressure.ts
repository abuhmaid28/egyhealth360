import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import type { PatientProfileId } from './authorization.js';
import { appendAuditRecord } from './audit.js';
import { BloodPressureError, bpInvalid, exactBpKeys, validateBpValues } from './blood-pressure-values.js';
export type BloodPressureMeasurementId = string & { readonly __bpId: unique symbol };
export type BloodPressureMeasurementSnapshot = Readonly<{
  id: string; patientId: string; systolic: number; diastolic: number; unit: string;
  measuredAt: Date; createdAt: Date; recordedByUserId: string; sourceKind: 'PATIENT_SELF_ENTRY' | 'CLINICIAN_ENTRY';
}>;
type Tx = Prisma.TransactionClient;
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const fail = (code: ConstructorParameters<typeof BloodPressureError>[0]): never => { throw new BloodPressureError(code); };
async function session(tx: Tx, actor: AuthPrincipal) {
  const rows = await tx.$queryRaw<{ role: string }[]>`SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id
    WHERE u.id=${actor.userId}::uuid AND s.id=${actor.sessionId}::uuid AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
  if (rows.length !== 1) fail('BP_UNAUTHENTICATED');
  if (rows[0].role !== actor.role || !['PATIENT', 'CLINICIAN'].includes(rows[0].role)) fail('BP_NOT_FOUND');
}
async function authorize(tx: Tx, actor: AuthPrincipal, patientId: string) {
  await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;
  await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;
  await session(tx, actor);
  if (actor.role === 'CLINICIAN') {
    const clinicians = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_profiles WHERE user_id=${actor.userId}::uuid AND user_role='CLINICIAN' FOR SHARE`;
    if (clinicians.length !== 1) fail('BP_NOT_FOUND');
    const assignments = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=${clinicians[0].id}::uuid AND patient_id=${patientId}::uuid AND status='ACTIVE' AND ended_at IS NULL FOR SHARE`;
    if (assignments.length !== 1) fail('BP_NOT_FOUND');
  }
  const patients = await tx.$queryRaw<{ userId: string }[]>`SELECT user_id AS "userId" FROM public.patient_profiles WHERE id=${patientId}::uuid AND user_role='PATIENT' FOR SHARE`;
  if (patients.length !== 1 || (actor.role === 'PATIENT' && patients[0].userId !== actor.userId.toLowerCase())) fail('BP_NOT_FOUND');
}
export function createBloodPressureMeasurementPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('BP_SERVICE_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  async function run<T>(principal: AuthPrincipal, patientId: string, operation: (tx: Tx, actor: AuthPrincipal) => Promise<T>): Promise<T> {
    const actor = { ...principal };
    if (!uuid(actor.userId) || !uuid(actor.sessionId)) fail('BP_UNAUTHENTICATED');
    if (!uuid(patientId)) fail('BP_NOT_FOUND');
    try {
      return await client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
        await authorize(tx, actor, patientId);
        const result = await operation(tx, actor);
        await session(tx, actor);
        return result;
      }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
    } catch (error) { if (error instanceof BloodPressureError) throw error; return fail('BP_SERVICE_UNAVAILABLE'); }
  }
  return {
    async createBloodPressureMeasurement(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; systolic: number; diastolic: number; unit: 'mmHg'; measuredAt: string }>): Promise<BloodPressureMeasurementSnapshot> {
      exactBpKeys(input, ['patientId', 'systolic', 'diastolic', 'unit', 'measuredAt']);
      const patientId = input.patientId, values = validateBpValues(input);
      return run(principal, patientId, async (tx, actor) => {
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) AS now`;
        if (values.measuredAt > now) bpInvalid('measuredAt', 'future');
        const row = await tx.bloodPressureMeasurement.create({ data: { ...values, patientId, recordedByUserId: actor.userId, sourceKind: actor.role === 'PATIENT' ? 'PATIENT_SELF_ENTRY' : 'CLINICIAN_ENTRY' } });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'BP_MEASUREMENT_CREATED', entityType: 'blood_pressure_measurement', entityId: row.id });
        return row;
      });
    },
    async listBloodPressureMeasurements(principal: AuthPrincipal, input: Readonly<{ patientId: PatientProfileId; page: number; pageSize: number }>) {
      exactBpKeys(input, ['patientId', 'page', 'pageSize']);
      const { patientId, page, pageSize } = input;
      if (!Number.isInteger(page) || page < 1 || page > 2147483647 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) bpInvalid('$', 'representation');
      return run(principal, patientId, async tx => {
        // One statement snapshot supplies count and page, including an empty page.
        const [result] = await tx.$queryRaw<{ total: number; measurements: BloodPressureMeasurementSnapshot[] }[]>`
          SELECT (SELECT count(*)::integer FROM public.blood_pressure_measurements WHERE patient_id=${patientId}::uuid AND public.bp31_disclosable(id)) total,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."measuredAt" DESC,p.id DESC) FROM (
            SELECT id,patient_id AS "patientId",systolic,diastolic,unit,measured_at AS "measuredAt",created_at AS "createdAt",recorded_by_user_id AS "recordedByUserId",source_kind AS "sourceKind"
            FROM public.blood_pressure_measurements WHERE patient_id=${patientId}::uuid AND public.bp31_disclosable(id) ORDER BY measured_at DESC,id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
          ) p),'[]'::jsonb) measurements`;
        return { measurements: result.measurements.map(row => ({ ...row, measuredAt: new Date(row.measuredAt), createdAt: new Date(row.createdAt) })), page, pageSize, total: result.total };
      });
    },
    async close() { try { await client.$disconnect(); await pool.end(); } catch { fail('BP_SERVICE_UNAVAILABLE'); } },
  };
}
export type BloodPressureMeasurementPersistence = ReturnType<typeof createBloodPressureMeasurementPersistence>;
