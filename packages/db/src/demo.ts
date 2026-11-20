import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, type Prisma } from './generated/prisma/client.js';

export const DEMO_DATASET = 'eh-m1-demo-v1';
export type DemoFixtureKey = 'patient-a' | 'patient-b' | 'clinician-assigned' | 'clinician-unassigned' | 'admin';
type Fixture = Readonly<{ key: DemoFixtureKey; role: 'PATIENT' | 'CLINICIAN' | 'ADMIN'; email: string; label: string }>;
export const DEMO_FIXTURES: readonly Fixture[] = Object.freeze([
  { key: 'patient-a', role: 'PATIENT', email: 'eh-m1-patient-a@example.invalid', label: 'Synthetic Demo Patient A' },
  { key: 'patient-b', role: 'PATIENT', email: 'eh-m1-patient-b@example.invalid', label: 'Synthetic Demo Patient B' },
  { key: 'clinician-assigned', role: 'CLINICIAN', email: 'eh-m1-clinician-assigned@example.invalid', label: 'Synthetic Demo Assigned Clinician' },
  { key: 'clinician-unassigned', role: 'CLINICIAN', email: 'eh-m1-clinician-unassigned@example.invalid', label: 'Synthetic Demo Unassigned Clinician' },
  { key: 'admin', role: 'ADMIN', email: 'eh-m1-admin@example.invalid', label: 'Synthetic Demo Admin' },
].map(fixture => Object.freeze(fixture as Fixture)));

// SHA256 of approved historical SQL, not credentials. Additional valid migrations are allowed.
const requiredMigrations = [
  ['20261012200810_eh005_identity_core_foundation', 'd8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a'],
  ['20261013014000_eh006_auth_sessions', '2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b'],
];
export type DemoPasswordCheck = (encodedHash: string) => Promise<boolean>;
export type DemoIdentityState = {
  dataset: typeof DEMO_DATASET;
  identities: { key: DemoFixtureKey; userId: string; email: string; role: Fixture['role']; profileId: string | null; label: string }[];
  assignmentId: string;
};
export type DemoSeedResult = { created: { users: number; profiles: number; assignments: number }; state: DemoIdentityState };
export class DemoStateError extends Error {
  constructor(public readonly code: 'DEMO_MIGRATIONS_INVALID' | 'DEMO_STATE_CONFLICT', public readonly fixture?: DemoFixtureKey) {
    super(code);
  }
}
const conflict = (fixture?: DemoFixtureKey): never => { throw new DemoStateError('DEMO_STATE_CONFLICT', fixture); };

async function migrations(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`;
  if (rows.some(row => !row.finished_at || row.rolled_back_at)
    || requiredMigrations.some(([name, checksum]) => {
      const applied = rows.filter(row => row.migration_name === name);
      return applied.length !== 1 || applied[0].checksum !== checksum;
    })) throw new DemoStateError('DEMO_MIGRATIONS_INVALID');
}

async function collect(tx: Prisma.TransactionClient, accepts: DemoPasswordCheck, complete: boolean) {
  const users = await tx.user.findMany({ where: { email: { in: DEMO_FIXTURES.map(f => f.email) } }, include: { patientProfile: true, clinicianProfile: true } });
  for (const f of DEMO_FIXTURES) {
    const user = users.find(u => u.email === f.email);
    if (!user) { if (complete) conflict(f.key); continue; }
    if (user.role !== f.role || user.status !== 'ACTIVE' || !await accepts(user.passwordHash)) conflict(f.key);
    const p = user.patientProfile, c = user.clinicianProfile;
    if (f.role === 'PATIENT') {
      if (c || (p && (p.userRole !== 'PATIENT' || p.displayName !== f.label || p.dateOfBirth !== null || p.sex !== null))) conflict(f.key);
      if (!p && complete) conflict(f.key);
    } else if (f.role === 'CLINICIAN') {
      if (p || (c && (c.userRole !== 'CLINICIAN' || c.displayName !== f.label || c.specialty !== null || c.professionalIdentifier !== null))) conflict(f.key);
      if (!c && complete) conflict(f.key);
    } else if (p || c) conflict(f.key);
  }
  const patients = users.flatMap(u => u.patientProfile ? [u.patientProfile.id] : []);
  const clinicians = users.flatMap(u => u.clinicianProfile ? [u.clinicianProfile.id] : []);
  const assigned = users.find(u => u.email === DEMO_FIXTURES.find(f => f.key === 'clinician-assigned')!.email)?.clinicianProfile?.id;
  const patient = users.find(u => u.email === DEMO_FIXTURES.find(f => f.key === 'patient-a')!.email)?.patientProfile?.id;
  const active = await tx.clinicianPatientAssignment.findMany({ where: { status: 'ACTIVE', OR: [{ clinicianId: { in: clinicians } }, { patientId: { in: patients } }] } });
  if (active.some(r => r.clinicianId !== assigned || r.patientId !== patient || r.endedAt !== null) || active.length > 1) conflict();
  const history = assigned && patient ? await tx.clinicianPatientAssignment.count({ where: { clinicianId: assigned, patientId: patient, status: 'ENDED' } }) : 0;
  if (!active.length && (history > 0 || complete)) conflict();
  return { users, active };
}

function manifest(data: Awaited<ReturnType<typeof collect>>): DemoIdentityState {
  return { dataset: DEMO_DATASET, identities: DEMO_FIXTURES.map(f => {
    const u = data.users.find(u => u.email === f.email)!;
    return { key: f.key, userId: u.id, email: u.email, role: f.role, profileId: u.patientProfile?.id ?? u.clinicianProfile?.id ?? null, label: f.label };
  }), assignmentId: data.active[0].id };
}

/** Fixed synthetic bootstrap only: never called by API/startup; no generic client or lookup. */
export function createDemoPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DEMO_CONFIG_INVALID');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 2 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async seedIdentities(input: { newPasswordHashes: Readonly<Record<DemoFixtureKey, string>>; acceptsExistingHash: DemoPasswordCheck; requireExisting?: true }): Promise<DemoSeedResult> {
      const checked = new Map<string, boolean>();
      const accepts = async (hash: string) => {
        if (!checked.has(hash)) checked.set(hash, await input.acceptsExistingHash(hash));
        return checked.get(hash)!;
      };
      return client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '15s'`;
        await tx.$executeRaw`LOCK TABLE users, patient_profiles, clinician_profiles, clinician_patient_assignments IN SHARE ROW EXCLUSIVE MODE`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
        await migrations(tx);
        const before = await collect(tx, accepts, input.requireExisting === true);
        const created = { users: 0, profiles: 0, assignments: 0 };
        for (const f of DEMO_FIXTURES) {
          let u = before.users.find(u => u.email === f.email);
          if (!u) {
            const hash = input.newPasswordHashes[f.key];
            if (typeof hash !== 'string' || !await accepts(hash)) conflict(f.key);
            u = await tx.user.create({ data: { email: f.email, role: f.role, passwordHash: hash }, include: { patientProfile: true, clinicianProfile: true } });
            created.users++;
          }
          if (f.role === 'PATIENT' && !u.patientProfile) {
            await tx.patientProfile.create({ data: { userId: u.id, displayName: f.label } }); created.profiles++;
          }
          if (f.role === 'CLINICIAN' && !u.clinicianProfile) {
            await tx.clinicianProfile.create({ data: { userId: u.id, displayName: f.label } }); created.profiles++;
          }
        }
        const ready = await collect(tx, accepts, false);
        if (!ready.active.length) {
          const c = ready.users.find(u => u.clinicianProfile?.displayName === 'Synthetic Demo Assigned Clinician')!.clinicianProfile!;
          const p = ready.users.find(u => u.patientProfile?.displayName === 'Synthetic Demo Patient A')!.patientProfile!;
          await tx.clinicianPatientAssignment.create({ data: { clinicianId: c.id, patientId: p.id } }); created.assignments++;
        }
        return { created, state: manifest(await collect(tx, accepts, true)) };
      }, { maxWait: 5000, timeout: 30000 });
    },
    async inspectIdentities(input: { acceptsExistingHash: DemoPasswordCheck }): Promise<DemoIdentityState> {
      return client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
        await migrations(tx);
        return manifest(await collect(tx, input.acceptsExistingHash, true));
      }, { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 });
    },
    async close() { await client.$disconnect(); await pool.end(); },
  };
}
