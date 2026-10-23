import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';

export type OrganizationKind = 'CLINIC' | 'LABORATORY' | 'PHARMACY';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED';
export type OrganizationSnapshot = Readonly<{
  id: string; kind: OrganizationKind; name: string; status: OrganizationStatus;
  statusVersion: number; createdAt: Date; statusChangedAt: Date;
}>;
export type MembershipSnapshot = Readonly<{
  id: string; organizationId: string; userId: string; userRole: string;
  status: 'ACTIVE' | 'ENDED'; grantedAt: Date; endedAt: Date | null;
}>;
type Code = 'ORGANIZATION_INVALID' | 'ORGANIZATION_UNAUTHENTICATED' | 'ORGANIZATION_NOT_FOUND' | 'ORGANIZATION_CONFLICT' | 'ORGANIZATION_UNAVAILABLE';
export class OrganizationError extends Error { constructor(public readonly code: Code) { super(code); } }
const fail = (code: Code): never => { throw new OrganizationError(code); };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function id(v: unknown): string { if (!uuid(v)) fail('ORGANIZATION_NOT_FOUND'); return (v as string).toLowerCase(); }
function key(v: unknown): string { if (!uuid(v)) fail('ORGANIZATION_INVALID'); return (v as string).toLowerCase(); }
function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('ORGANIZATION_INVALID');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value as object).length !== keys.length || keys.some(k => !descriptors[k] || !('value' in descriptors[k]))) fail('ORGANIZATION_INVALID');
}
const compatible = (role: string, kind: OrganizationKind) =>
  (role === 'CLINICIAN' && kind === 'CLINIC') || (role === 'LAB_STAFF' && kind === 'LABORATORY') || (role === 'PHARMACY_STAFF' && kind === 'PHARMACY');
const orgSelect = { id: true, kind: true, name: true, status: true, statusVersion: true, createdAt: true, statusChangedAt: true } as const;
const memberSelect = { id: true, organizationId: true, userId: true, userRole: true, status: true, grantedAt: true, endedAt: true } as const;
type Tx = Prisma.TransactionClient;
async function current(tx: Tx, actor: AuthPrincipal, admin: boolean) {
  const rows = await tx.$queryRaw<{ role: string }[]>`SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id
    WHERE u.id=${actor.userId}::uuid AND s.id=${actor.sessionId}::uuid AND u.status='ACTIVE'
    AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
  if (rows.length !== 1) fail('ORGANIZATION_UNAUTHENTICATED');
  if (rows[0].role !== actor.role || (admin ? rows[0].role !== 'ADMIN' : !['CLINICIAN', 'LAB_STAFF', 'PHARMACY_STAFF'].includes(rows[0].role))) fail('ORGANIZATION_NOT_FOUND');
}
async function organization(tx: Tx, organizationId: string, write: boolean) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM public.organizations WHERE id=${organizationId}::uuid ${write ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR SHARE`}`);
  const row = await tx.organization.findUnique({ where: { id: organizationId }, select: orgSelect });
  if (!row) fail('ORGANIZATION_NOT_FOUND');
  return row!;
}

/** Bounded operational service. Never authorizes a patient resource or returns a reusable authority ticket. */
export function createOrganizationPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('ORGANIZATION_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 }); pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  async function run<T>(principal: AuthPrincipal, admin: boolean, peers: (tx: Tx) => Promise<string[]>, operation: (tx: Tx, actor: AuthPrincipal) => Promise<T>): Promise<T> {
    const actor = { ...principal };
    if (!uuid(actor.userId) || !uuid(actor.sessionId)) fail('ORGANIZATION_UNAUTHENTICATED');
    actor.userId = actor.userId.toLowerCase(); actor.sessionId = actor.sessionId.toLowerCase();
    try {
      return await client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout='5s'`; await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
        // Peer identities are immutable resource targets, not authority. No payload is returned before current().
        const users = [...new Set([actor.userId, ...await peers(tx)])].sort();
        for (const userId of users) await tx.$queryRaw`SELECT id FROM public.users WHERE id=${userId}::uuid FOR NO KEY UPDATE`;
        await tx.$queryRaw`SELECT id FROM public.sessions WHERE id=${actor.sessionId}::uuid FOR UPDATE`;
        await current(tx, actor, admin);
        const result = await operation(tx, actor);
        await current(tx, actor, admin);
        return result;
      }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
    } catch (e) {
      if (e instanceof OrganizationError) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') fail('ORGANIZATION_CONFLICT');
      return fail('ORGANIZATION_UNAVAILABLE');
    }
  }
  const none = async () => [];
  return {
    async createOrganization(actor: AuthPrincipal, input: { kind: OrganizationKind; name: string; operationKey: string }) {
      exact(input, ['kind', 'name', 'operationKey']);
      const kind = input.kind, name = input.name, operationKey = key(input.operationKey);
      if (!['CLINIC', 'LABORATORY', 'PHARMACY'].includes(kind) || typeof name !== 'string' || name.trim() !== name || [...name].length < 1 || [...name].length > 160 || [...name].some(c => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159))) fail('ORGANIZATION_INVALID');
      return run(actor, true, none, async (tx, a) => {
        const old = await tx.organization.findUnique({ where: { createdByUserId_operationKey: { createdByUserId: a.userId, operationKey } } });
        if (old) {
          if (old.kind !== kind || old.name !== name) fail('ORGANIZATION_CONFLICT');
          return { organization: (await tx.organization.findUniqueOrThrow({ where: { id: old.id }, select: orgSelect })), created: false };
        }
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) now`;
        const row = await tx.organization.create({ data: { kind, name, operationKey, createdByUserId: a.userId, statusChangedByUserId: a.userId, createdAt: now, statusChangedAt: now }, select: orgSelect });
        await appendAuditRecord(tx, { actorUserId: a.userId, actionType: 'ORGANIZATION_CREATED', entityType: 'organization', entityId: row.id });
        return { organization: row, created: true };
      });
    },
    async inspectOrganization(actor: AuthPrincipal, input: { organizationId: string }) {
      exact(input, ['organizationId']); const organizationId = id(input.organizationId);
      return run(actor, true, none, tx => organization(tx, organizationId, false));
    },
    async setOrganizationStatus(actor: AuthPrincipal, input: { organizationId: string; status: OrganizationStatus; expectedVersion: number }) {
      exact(input, ['organizationId', 'status', 'expectedVersion']);
      const organizationId = id(input.organizationId), status = input.status, expectedVersion = input.expectedVersion;
      if (!['ACTIVE', 'SUSPENDED'].includes(status) || !Number.isInteger(expectedVersion) || expectedVersion < 0 || expectedVersion >= 2147483647) fail('ORGANIZATION_INVALID');
      return run(actor, true, none, async (tx, a) => {
        const old = await organization(tx, organizationId, true);
        if (old.statusVersion !== expectedVersion) {
          if (old.status === status && old.statusVersion === expectedVersion + 1) return { organization: old, changed: false };
          fail('ORGANIZATION_CONFLICT');
        }
        if (old.status === status) return { organization: old, changed: false };
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT greatest(pg_catalog.clock_timestamp()::timestamptz(3),${old.statusChangedAt}::timestamptz) now`;
        const row = await tx.organization.update({ where: { id: organizationId }, data: { status, statusVersion: old.statusVersion + 1, statusChangedAt: now, statusChangedByUserId: a.userId }, select: orgSelect });
        await appendAuditRecord(tx, { actorUserId: a.userId, actionType: status === 'SUSPENDED' ? 'ORGANIZATION_SUSPENDED' : 'ORGANIZATION_RESTORED', entityType: 'organization', entityId: row.id });
        return { organization: row, changed: true };
      });
    },
    async grantMembership(actor: AuthPrincipal, input: { organizationId: string; userId: string; operationKey: string }) {
      exact(input, ['organizationId', 'userId', 'operationKey']);
      const organizationId = id(input.organizationId), userId = id(input.userId), operationKey = key(input.operationKey);
      return run(actor, true, async () => [userId], async (tx, a) => {
        const org = await organization(tx, organizationId, true);
        const old = await tx.organizationMembership.findUnique({ where: { grantedByUserId_operationKey: { grantedByUserId: a.userId, operationKey } }, select: memberSelect });
        if (old) {
          if (old.organizationId !== organizationId || old.userId !== userId) fail('ORGANIZATION_CONFLICT');
          return { membership: old, created: false };
        }
        const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
        if (org.status !== 'ACTIVE' || !user || user.status !== 'ACTIVE' || !compatible(user.role, org.kind) || a.userId === userId) fail('ORGANIZATION_NOT_FOUND');
        if (await tx.organizationMembership.count({ where: { organizationId, userId, status: 'ACTIVE' } })) fail('ORGANIZATION_CONFLICT');
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT pg_catalog.clock_timestamp()::timestamptz(3) now`;
        const row = await tx.organizationMembership.create({ data: { organizationId, organizationKind: org.kind, userId, userRole: user!.role, grantedByUserId: a.userId, operationKey, grantedAt: now }, select: memberSelect });
        await appendAuditRecord(tx, { actorUserId: a.userId, actionType: 'ORGANIZATION_MEMBERSHIP_GRANTED', entityType: 'organization_membership', entityId: row.id });
        return { membership: row, created: true };
      });
    },
    async endMembership(actor: AuthPrincipal, input: { organizationId: string; membershipId: string }) {
      exact(input, ['organizationId', 'membershipId']); const organizationId = id(input.organizationId), membershipId = id(input.membershipId);
      return run(actor, true, async tx => {
        const target = await tx.organizationMembership.findFirst({ where: { id: membershipId, organizationId }, select: { userId: true } });
        return target ? [target.userId] : [];
      }, async (tx, a) => {
        // Administrative ending is allowed while the organization/user is suspended/disabled.
        await organization(tx, organizationId, true);
        await tx.$queryRaw`SELECT id FROM public.organization_memberships WHERE id=${membershipId}::uuid AND organization_id=${organizationId}::uuid FOR UPDATE`;
        const old = await tx.organizationMembership.findFirst({ where: { id: membershipId, organizationId }, select: memberSelect });
        if (!old) fail('ORGANIZATION_NOT_FOUND');
        if (old!.status === 'ENDED') return { membership: old!, changed: false };
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT greatest(pg_catalog.clock_timestamp()::timestamptz(3),${old!.grantedAt}::timestamptz) now`;
        const row = await tx.organizationMembership.update({ where: { id: membershipId }, data: { status: 'ENDED', endedAt: now, endedByUserId: a.userId }, select: memberSelect });
        await appendAuditRecord(tx, { actorUserId: a.userId, actionType: 'ORGANIZATION_MEMBERSHIP_ENDED', entityType: 'organization_membership', entityId: row.id });
        return { membership: row, changed: true };
      });
    },
    async inspectMembership(actor: AuthPrincipal, input: { organizationId: string; membershipId: string }) {
      exact(input, ['organizationId', 'membershipId']); const organizationId = id(input.organizationId), membershipId = id(input.membershipId);
      return run(actor, true, none, async tx => {
        await organization(tx, organizationId, false);
        const row = await tx.organizationMembership.findFirst({ where: { id: membershipId, organizationId }, select: memberSelect });
        if (!row) fail('ORGANIZATION_NOT_FOUND');
        return row!;
      });
    },
    async readMemberOrganization(actor: AuthPrincipal, input: { organizationId: string; membershipId: string }) {
      exact(input, ['organizationId', 'membershipId']); const organizationId = id(input.organizationId), membershipId = id(input.membershipId);
      return run(actor, false, none, async (tx, a) => {
        const org = await organization(tx, organizationId, false);
        await tx.$queryRaw`SELECT id FROM public.organization_memberships WHERE id=${membershipId}::uuid AND organization_id=${organizationId}::uuid FOR SHARE`;
        const row = await tx.organizationMembership.findFirst({ where: { id: membershipId, organizationId, userId: a.userId, status: 'ACTIVE', endedAt: null }, select: { userRole: true } });
        if (org.status !== 'ACTIVE' || !row || row.userRole !== a.role || !compatible(a.role, org.kind)) fail('ORGANIZATION_NOT_FOUND');
        return org;
      });
    },
    async close() { await client.$disconnect(); await pool.end(); },
  };
}
export type OrganizationPersistence = ReturnType<typeof createOrganizationPersistence>;
