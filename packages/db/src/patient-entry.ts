import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';
import { entryKeys, registrationIdentity, profileValues, PatientEntryError, type OwnProfile } from './patient-entry-values.js';
export { PatientEntryError, profileValues, registrationIdentity } from './patient-entry-values.js';
export type { OwnProfile } from './patient-entry-values.js';
const fail = (code: PatientEntryError['code']): never => { throw new PatientEntryError(code); };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
type Tx = Prisma.TransactionClient;
const select = { id: true, displayName: true, dateOfBirth: true, sex: true } as const;
const view = (p: { id: string; displayName: string; dateOfBirth: Date | string | null; sex: string | null }): OwnProfile & { id: string } => ({ id: p.id, displayName: p.displayName, dateOfBirth: p.dateOfBirth instanceof Date ? p.dateOfBirth.toISOString().split('T', 1)[0] : p.dateOfBirth, sex: p.sex });
async function storedProfile(tx: Tx, actor: AuthPrincipal) {
  // Read existing DATE as text so legacy years outside the new write bounds never
  // pass through Prisma's narrower JSON DateTime codec or get truncated by JS.
  const rows = await tx.$queryRaw<({ id: string } & OwnProfile)[]>`SELECT id,display_name AS "displayName",
    date_of_birth::text AS "dateOfBirth",sex FROM public.patient_profiles WHERE user_id=${actor.userId}::uuid AND user_role='PATIENT'`;
  return rows[0];
}
async function current(tx: Tx, actor: AuthPrincipal) {
  const rows = await tx.$queryRaw<{ role: string }[]>`SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id
    WHERE u.id=${actor.userId}::uuid AND s.id=${actor.sessionId}::uuid AND u.status='ACTIVE'
    AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
  if (rows.length !== 1) fail('PATIENT_ENTRY_UNAUTHENTICATED');
  if (rows[0].role !== actor.role || rows[0].role !== 'PATIENT') fail('PATIENT_ENTRY_NOT_FOUND');
}
/** Patient entry only; no arbitrary target, clinical authorizer or session creation. */
export function createPatientEntryPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('PATIENT_ENTRY_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 }); pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  async function transaction<T>(operation: (tx: Tx) => Promise<T>) {
    try {
      return await client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout='5s'`; await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
        await tx.$executeRaw`SET LOCAL datestyle='ISO, YMD'`;
        return operation(tx);
      }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
    } catch (error) { if (error instanceof PatientEntryError) throw error; return fail('PATIENT_ENTRY_UNAVAILABLE'); }
  }
  async function own<T>(principal: AuthPrincipal, operation: (tx: Tx, actor: AuthPrincipal) => Promise<T>) {
    const actor = { ...principal };
    if (!uuid(actor.userId) || !uuid(actor.sessionId)) fail('PATIENT_ENTRY_UNAUTHENTICATED');
    return transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM public.users WHERE id=${actor.userId}::uuid FOR NO KEY UPDATE`;
      await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;
      await current(tx, actor);
      await tx.$queryRaw`SELECT id FROM public.patient_profiles WHERE user_id=${actor.userId}::uuid AND user_role='PATIENT' FOR UPDATE`;
      const result = await operation(tx, actor);
      await current(tx, actor);
      return result;
    });
  }
  return {
    async register(input: { email: string; passwordHash: string; displayName: string }): Promise<void> {
      entryKeys(input, ['email', 'passwordHash', 'displayName']);
      const identity = registrationIdentity({ email: input.email, displayName: input.displayName });
      const passwordHash = input.passwordHash;
      // Only the existing fixed application codec is accepted at this private hash boundary.
      if (typeof passwordHash !== 'string' || !/^eh-pw-v1\$argon2id\$v=19\$m=65536,t=3,p=1\$s=[A-Za-z0-9_-]{22}\$h=[A-Za-z0-9_-]{43}$/.test(passwordHash)) fail('PATIENT_ENTRY_INVALID');
      await transaction(async tx => {
        // Conflict on the canonical identity is the only safe duplicate outcome. Every other failure rolls back.
        const rows = await tx.$queryRaw<{ id: string }[]>`INSERT INTO public.users (email,password_hash,role,status)
          VALUES (${identity.email},${passwordHash},'PATIENT','ACTIVE') ON CONFLICT (email) DO NOTHING RETURNING id`;
        if (!rows.length) return;
        const userId = rows[0].id;
        await tx.patientProfile.create({ data: { userId, displayName: identity.displayName } });
        await appendAuditRecord(tx, { actorUserId: null, actionType: 'PATIENT_SELF_REGISTERED', entityType: 'user', entityId: userId });
      });
    },
    async readOwnProfile(principal: AuthPrincipal): Promise<OwnProfile & { id: string }> {
      return own(principal, async (tx, actor) => {
        const profile = await storedProfile(tx, actor);
        if (!profile) fail('PATIENT_ENTRY_NOT_FOUND');
        return view(profile!);
      });
    },
    async replaceOwnProfile(principal: AuthPrincipal, input: OwnProfile): Promise<OwnProfile & { id: string }> {
      const values = profileValues(input);
      return own(principal, async (tx, actor) => {
        const old = await storedProfile(tx, actor);
        if (!old) fail('PATIENT_ENTRY_NOT_FOUND');
        const previous = view(old!);
        if (previous.displayName === values.displayName && previous.dateOfBirth === values.dateOfBirth && previous.sex === values.sex) return previous;
        const row = await tx.patientProfile.update({ where: { id: old!.id }, data: { ...values, dateOfBirth: values.dateOfBirth === null ? null : new Date(`${values.dateOfBirth}T00:00:00.000Z`) }, select });
        await appendAuditRecord(tx, { actorUserId: actor.userId, actionType: 'PATIENT_PROFILE_UPDATED', entityType: 'patient_profile', entityId: old!.id });
        return view(row);
      });
    },
    async close() { await client.$disconnect(); await pool.end(); },
  };
}
export type PatientEntryPersistence = ReturnType<typeof createPatientEntryPersistence>;
