import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client.js';
import { appendAuditRecord, type AppendAuditInput } from './audit.js';
export type { AppendAuditInput } from './audit.js';

/** Bounded Core V1 identity policy, not full RFC email validation. */
export function canonicalizeEmail(input: string): string {
  const whitespace = (code: number) => code === 32 || (code >= 9 && code <= 13);
  let start = 0;
  let end = input.length;
  while (start < end && whitespace(input.charCodeAt(start))) start++;
  while (end > start && whitespace(input.charCodeAt(end - 1))) end--;
  const email = input.slice(start, end).replace(/[A-Z]/g, character => character.toLowerCase());
  if (!/^[\x21-\x7e]+$/.test(email) || !/^[^@]+@[^@]+$/.test(email)) {
    throw new Error('Invalid bounded email identity');
  }
  return email;
}

type IdentityInput = { email: string; passwordHash: string };
export type CreateUserInput = IdentityInput & (
  | { role: 'PATIENT'; profile: { displayName: string; dateOfBirth?: Date; sex?: string } }
  | { role: 'CLINICIAN'; profile: { displayName: string; specialty?: string; professionalIdentifier?: string } }
  | { role: 'ADMIN' | 'LAB_STAFF' | 'PHARMACY_STAFF'; profile?: never }
);

/** Narrow persistence operations; no general client, delete, or role-change API. */
export function createPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async createUser(input: CreateUserInput) {
      const email = canonicalizeEmail(input.email);
      if (!input.passwordHash.trim()) throw new Error('Password hash must be nonblank');
      if (!['PATIENT', 'CLINICIAN', 'ADMIN', 'LAB_STAFF', 'PHARMACY_STAFF'].includes(input.role)) throw new Error('Invalid user role');
      if (input.role === 'ADMIN' && input.profile !== undefined) throw new Error('Admin cannot have a role-bound profile');
      if (['LAB_STAFF', 'PHARMACY_STAFF'].includes(input.role) && input.profile !== undefined) throw new Error('Staff cannot have a role-bound profile');
      return client.$transaction(async transaction => {
        const user = await transaction.user.create({
          data: { email, passwordHash: input.passwordHash, role: input.role },
          select: { id: true, email: true, role: true, status: true },
        });
        let profileId: string | null = null;
        if (input.role === 'PATIENT') {
          const profile = await transaction.patientProfile.create({ data: {
            userId: user.id, displayName: input.profile.displayName,
            dateOfBirth: input.profile.dateOfBirth, sex: input.profile.sex,
          } });
          profileId = profile.id;
        } else if (input.role === 'CLINICIAN') {
          const profile = await transaction.clinicianProfile.create({ data: {
            userId: user.id, displayName: input.profile.displayName,
            specialty: input.profile.specialty, professionalIdentifier: input.profile.professionalIdentifier,
          } });
          profileId = profile.id;
        }
        return { ...user, profileId };
      });
    },
    async assignPatient(input: { clinicianId: string; patientId: string }) {
      return client.clinicianPatientAssignment.create({ data: {
        clinicianId: input.clinicianId, patientId: input.patientId,
      } });
    },
    async endAssignment(id: string) {
      const result = await client.clinicianPatientAssignment.updateMany({
        where: { id, status: 'ACTIVE' }, data: { status: 'ENDED', endedAt: new Date() },
      });
      if (result.count !== 1) throw new Error('Active assignment not found');
    },
    async appendAudit(input: AppendAuditInput) {
      return appendAuditRecord(client, input);
    },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
