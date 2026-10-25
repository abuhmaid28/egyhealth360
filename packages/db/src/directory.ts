import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';
import { DirectoryError, directoryFail as fail, directoryExact as exact, directoryId as id, directoryText as text, specialtyKey, directoryVersion as version, directoryBoolean as bool, directoryPage, providerPage, type DirectoryPage, type ProviderPage, type PublicClinic, type PublicProvider, type PublicSpecialty } from './directory-values.js';
type Tx = Prisma.TransactionClient;
const specialtySelect = { id: true, key: true, displayName: true, isPublished: true, version: true } as const;
const clinicSelect = { id: true, publicId: true, organizationId: true, displayName: true, city: true, address: true, isPublished: true, version: true } as const;
const providerSelect = { id: true, publicId: true, clinicianId: true, clinicianUserId: true, specialtyId: true, displayName: true, isPublished: true, version: true } as const;
const affiliationSelect = { id: true, providerId: true, membershipId: true, organizationId: true, specialtyId: true, publishedAt: true, withdrawnAt: true } as const;
const fingerprint = (values: unknown[]) => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const opKey = (v: unknown) => { try {
    return id(v);
}
catch {
    return fail('DIRECTORY_INVALID');
} };
const now = async (tx: Tx, lower: Date = new Date(0)) => (await tx.$queryRaw<{
    now: Date;
}[]> `SELECT greatest(pg_catalog.clock_timestamp()::timestamptz(3),${lower}::timestamptz) now`)[0].now;
async function current(tx: Tx, a: {
    userId: string;
    sessionId: string;
    role: string;
}) {
    const rows = await tx.$queryRaw<{
        role: string;
    }[]> `SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=${a.userId}::uuid AND s.id=${a.sessionId}::uuid AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
    if (rows.length !== 1)
        fail('DIRECTORY_UNAUTHENTICATED');
    if (rows[0].role !== 'ADMIN' || a.role !== 'ADMIN')
        fail('DIRECTORY_NOT_FOUND');
}
async function profile(tx: Tx, clinicianId: string) {
    const rows = await tx.$queryRaw<{
        userId: string;
        status: string;
    }[]> `SELECT u.id AS "userId",u.status::text status FROM public.clinician_profiles cp JOIN public.users u ON u.id=cp.user_id AND u.role='CLINICIAN' WHERE cp.id=${clinicianId}::uuid AND cp.user_role='CLINICIAN' FOR SHARE OF cp`;
    if (rows.length !== 1)
        fail('DIRECTORY_NOT_FOUND');
    return rows[0];
}
async function specialty(tx: Tx, specialtyId: string) {
    await tx.$queryRaw `SELECT id FROM public.specialties WHERE id=${specialtyId}::uuid FOR SHARE`;
    const s = await tx.specialty.findUnique({ where: { id: specialtyId } });
    if (!s)
        fail('DIRECTORY_NOT_FOUND');
    return s!;
}
async function clinic(tx: Tx, organizationId: string) {
    await tx.$queryRaw `SELECT id FROM public.organizations WHERE id=${organizationId}::uuid FOR SHARE`;
    const o = await tx.organization.findUnique({ where: { id: organizationId } });
    if (!o || o.kind !== 'CLINIC')
        fail('DIRECTORY_NOT_FOUND');
    await tx.$queryRaw `SELECT id FROM public.clinic_directory WHERE organization_id=${organizationId}::uuid FOR SHARE`;
    const c = await tx.clinicDirectory.findUnique({ where: { organizationId } });
    if (!c)
        fail('DIRECTORY_NOT_FOUND');
    return { o: o!, c: c! };
}
const eligibleSql = Prisma.sql `SELECT p.public_id id,p.display_name,s.key specialty_key,s.display_name specialty_name,
 c.public_id clinic_id,c.display_name clinic_name,c.city,c.address
 FROM public.clinician_directory p
 JOIN public.clinician_profiles cp ON cp.id=p.clinician_id AND cp.user_id=p.clinician_user_id AND cp.user_role='CLINICIAN'
 JOIN public.users u ON u.id=cp.user_id AND u.role='CLINICIAN' AND u.status='ACTIVE'
 JOIN public.specialties s ON s.id=p.specialty_id AND s.is_published
 JOIN public.directory_affiliations a ON a.provider_id=p.id AND a.clinician_user_id=u.id AND a.specialty_id=s.id AND a.withdrawn_at IS NULL
 JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=u.id AND m.organization_id=a.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
 JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
 JOIN public.clinic_directory c ON c.organization_id=o.id AND c.organization_kind='CLINIC' AND c.is_published
 WHERE p.is_published`;
const providerJson = Prisma.sql `jsonb_build_object('id',id,'displayName',display_name,'specialty',jsonb_build_object('key',specialty_key,'displayName',specialty_name),
 'clinics',jsonb_agg(jsonb_build_object('id',clinic_id,'displayName',clinic_name,'city',city,'address',address) ORDER BY clinic_id))`;
/** Curated operational service and current public projection only. No clinical authorizer. */
export function createDirectoryPersistence(connectionString: string | undefined) {
    if (!connectionString)
        fail('DIRECTORY_UNAVAILABLE');
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
    pool.on('error', () => { });
    const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
    async function run<T>(principal: AuthPrincipal, peers: (tx: Tx) => Promise<string[]>, action: (tx: Tx, a: {
        userId: string;
        sessionId: string;
        role: string;
    }) => Promise<T>) {
        const d: PropertyDescriptorMap = principal && typeof principal === 'object' ? Object.getOwnPropertyDescriptors(principal) : {};
        if (['userId', 'sessionId', 'role'].some(k => !d[k] || !('value' in d[k])))
            fail('DIRECTORY_UNAUTHENTICATED');
        let userId: string, sessionId: string;
        try {
            userId = id(d.userId.value);
            sessionId = id(d.sessionId.value);
        }
        catch {
            return fail('DIRECTORY_UNAUTHENTICATED');
        }
        const a = { userId, sessionId, role: d.role.value as string };
        try {
            return await client.$transaction(async (tx) => {
                await tx.$executeRaw `SET LOCAL lock_timeout='5s'`;
                await tx.$executeRaw `SET LOCAL statement_timeout='10s'`;
                await current(tx, a);
                for (const target of [...new Set([a.userId, ...await peers(tx)])].sort())
                    await tx.$queryRaw `SELECT id FROM public.users WHERE id=${target}::uuid FOR NO KEY UPDATE`;
                await tx.$queryRaw `SELECT id FROM public.sessions WHERE id=${a.sessionId}::uuid FOR UPDATE`;
                await current(tx, a);
                const result = await action(tx, a);
                await current(tx, a);
                return result;
            }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
        }
        catch (e) {
            if (e instanceof DirectoryError)
                throw e;
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
                fail('DIRECTORY_CONFLICT');
            return fail('DIRECTORY_UNAVAILABLE');
        }
    }
    const none = async () => [];
    const providerPeers = (providerId: string) => async (tx: Tx) => { const p = await tx.clinicianDirectory.findUnique({ where: { id: providerId }, select: { clinicianUserId: true } }); return p ? [p.clinicianUserId] : []; };
    const audit = (tx: Tx, a: {
        userId: string;
    }, actionType: string, entityType: string, entityId: string) => appendAuditRecord(tx, { actorUserId: a.userId, actionType, entityType, entityId });
    async function withdraw(tx: Tx, a: {
        userId: string;
    }, publicationId: string) {
        await tx.$queryRaw `SELECT id FROM public.directory_affiliations WHERE id=${publicationId}::uuid FOR UPDATE`;
        const old = await tx.directoryAffiliation.findUniqueOrThrow({ where: { id: publicationId } });
        if (old.withdrawnAt)
            return { publication: await tx.directoryAffiliation.findUniqueOrThrow({ where: { id: publicationId }, select: affiliationSelect }), changed: false };
        const publication = await tx.directoryAffiliation.update({ where: { id: publicationId }, data: { withdrawnAt: await now(tx, old.publishedAt), withdrawnByUserId: a.userId }, select: affiliationSelect });
        await audit(tx, a, 'CLINICIAN_DIRECTORY_UNPUBLISHED', 'directory_affiliation', publicationId);
        return { publication, changed: true };
    }
    async function publicRead<T>(query: Prisma.Sql): Promise<T> { try {
        return (await client.$queryRaw<{
            result: T;
        }[]>(query))[0].result;
    }
    catch {
        return fail('DIRECTORY_UNAVAILABLE');
    } }
    function pageResult(query: Prisma.Sql, page: DirectoryPage, order: Prisma.Sql) { return Prisma.sql `WITH projected AS (${query}), selected AS (SELECT * FROM projected ORDER BY ${order} LIMIT ${page.pageSize} OFFSET ${(page.page - 1) * page.pageSize}) SELECT jsonb_build_object('data',coalesce((SELECT jsonb_agg(value ORDER BY sort) FROM selected),'[]'::jsonb),'meta',jsonb_build_object('page',${page.page}::int,'pageSize',${page.pageSize}::int,'total',(SELECT count(*)::int FROM projected))) result`; }
    return {
        async createSpecialty(actor: AuthPrincipal, input: {
            key: string;
            displayName: string;
            operationKey: string;
        }) {
            exact(input, ['key', 'displayName', 'operationKey']);
            const key = specialtyKey(input.key), displayName = text(input.displayName, 80), operationKey = opKey(input.operationKey), fp = fingerprint([key, displayName]);
            return run(actor, none, async (tx, a) => {
                const old = await tx.specialty.findUnique({ where: { createdByUserId_operationKey: { createdByUserId: a.userId, operationKey } } });
                if (old) {
                    if (old.creationFingerprint !== fp)
                        fail('DIRECTORY_CONFLICT');
                    return { specialty: await tx.specialty.findUniqueOrThrow({ where: { id: old.id }, select: specialtySelect }), created: false };
                }
                const time = await now(tx);
                const row = await tx.specialty.create({ data: { key, displayName, createdByUserId: a.userId, changedByUserId: a.userId, operationKey, creationFingerprint: fp, createdAt: time, changedAt: time }, select: specialtySelect });
                await audit(tx, a, 'SPECIALTY_CREATED', 'specialty', row.id);
                return { specialty: row, created: true };
            });
        },
        async setSpecialty(actor: AuthPrincipal, input: {
            specialtyId: string;
            displayName: string;
            isPublished: boolean;
            expectedVersion: number;
        }) {
            exact(input, ['specialtyId', 'displayName', 'isPublished', 'expectedVersion']);
            const specialtyId = id(input.specialtyId), displayName = text(input.displayName, 80), isPublished = bool(input.isPublished), expectedVersion = version(input.expectedVersion);
            return run(actor, none, async (tx, a) => {
                await tx.$queryRaw `SELECT id FROM public.specialties WHERE id=${specialtyId}::uuid FOR UPDATE`;
                const old = await tx.specialty.findUnique({ where: { id: specialtyId } });
                if (!old)
                    fail('DIRECTORY_NOT_FOUND');
                const same = old!.displayName === displayName && old!.isPublished === isPublished;
                if (old!.version !== expectedVersion && !(same && old!.version === expectedVersion + 1))
                    fail('DIRECTORY_CONFLICT');
                if (same)
                    return { specialty: await tx.specialty.findUniqueOrThrow({ where: { id: specialtyId }, select: specialtySelect }), changed: false };
                const row = await tx.specialty.update({ where: { id: specialtyId }, data: { displayName, isPublished, version: old!.version + 1, changedAt: await now(tx, old!.changedAt), changedByUserId: a.userId }, select: specialtySelect });
                await audit(tx, a, old!.isPublished === isPublished ? 'SPECIALTY_RENAMED' : isPublished ? 'SPECIALTY_PUBLISHED' : 'SPECIALTY_UNPUBLISHED', 'specialty', specialtyId);
                return { specialty: row, changed: true };
            });
        },
        async createClinic(actor: AuthPrincipal, input: {
            organizationId: string;
            displayName: string;
            city: string;
            address: string;
            operationKey: string;
        }) {
            exact(input, ['organizationId', 'displayName', 'city', 'address', 'operationKey']);
            const organizationId = id(input.organizationId), displayName = text(input.displayName, 160), city = text(input.city, 80), address = text(input.address, 240), operationKey = opKey(input.operationKey), fp = fingerprint([organizationId, displayName, city, address]);
            return run(actor, none, async (tx, a) => {
                await tx.$queryRaw `SELECT id FROM public.organizations WHERE id=${organizationId}::uuid FOR UPDATE`;
                const o = await tx.organization.findUnique({ where: { id: organizationId } });
                if (!o || o.kind !== 'CLINIC')
                    fail('DIRECTORY_NOT_FOUND');
                const old = await tx.clinicDirectory.findUnique({ where: { createdByUserId_operationKey: { createdByUserId: a.userId, operationKey } } });
                if (old) {
                    if (old.creationFingerprint !== fp)
                        fail('DIRECTORY_CONFLICT');
                    return { clinic: await tx.clinicDirectory.findUniqueOrThrow({ where: { id: old.id }, select: clinicSelect }), created: false };
                }
                const time = await now(tx);
                const row = await tx.clinicDirectory.create({ data: { organizationId, displayName, city, address, createdByUserId: a.userId, changedByUserId: a.userId, operationKey, creationFingerprint: fp, createdAt: time, changedAt: time }, select: clinicSelect });
                await audit(tx, a, 'CLINIC_DIRECTORY_CREATED', 'clinic_directory', row.id);
                return { clinic: row, created: true };
            });
        },
        async setClinic(actor: AuthPrincipal, input: {
            clinicId: string;
            displayName: string;
            city: string;
            address: string;
            isPublished: boolean;
            expectedVersion: number;
        }) {
            exact(input, ['clinicId', 'displayName', 'city', 'address', 'isPublished', 'expectedVersion']);
            const clinicId = id(input.clinicId), displayName = text(input.displayName, 160), city = text(input.city, 80), address = text(input.address, 240), isPublished = bool(input.isPublished), expectedVersion = version(input.expectedVersion);
            return run(actor, none, async (tx, a) => {
                const target = await tx.clinicDirectory.findUnique({ where: { id: clinicId }, select: { organizationId: true } });
                if (!target)
                    fail('DIRECTORY_NOT_FOUND');
                await tx.$queryRaw `SELECT id FROM public.organizations WHERE id=${target!.organizationId}::uuid FOR SHARE`;
                await tx.$queryRaw `SELECT id FROM public.clinic_directory WHERE id=${clinicId}::uuid FOR UPDATE`;
                const old = await tx.clinicDirectory.findUniqueOrThrow({ where: { id: clinicId } });
                const same = old.displayName === displayName && old.city === city && old.address === address && old.isPublished === isPublished;
                if (old.version !== expectedVersion && !(same && old.version === expectedVersion + 1))
                    fail('DIRECTORY_CONFLICT');
                if (same)
                    return { clinic: await tx.clinicDirectory.findUniqueOrThrow({ where: { id: clinicId }, select: clinicSelect }), changed: false };
                if (isPublished) {
                    const o = await tx.organization.findUniqueOrThrow({ where: { id: old.organizationId } });
                    if (o.status !== 'ACTIVE')
                        fail('DIRECTORY_NOT_FOUND');
                }
                const row = await tx.clinicDirectory.update({ where: { id: clinicId }, data: { displayName, city, address, isPublished, version: old.version + 1, changedAt: await now(tx, old.changedAt), changedByUserId: a.userId }, select: clinicSelect });
                await audit(tx, a, old.isPublished === isPublished ? 'CLINIC_DIRECTORY_UPDATED' : isPublished ? 'CLINIC_DIRECTORY_PUBLISHED' : 'CLINIC_DIRECTORY_UNPUBLISHED', 'clinic_directory', clinicId);
                return { clinic: row, changed: true };
            });
        },
        async createProvider(actor: AuthPrincipal, input: {
            clinicianId: string;
            specialtyId: string;
            displayName: string;
            operationKey: string;
        }) {
            exact(input, ['clinicianId', 'specialtyId', 'displayName', 'operationKey']);
            const clinicianId = id(input.clinicianId), specialtyId = id(input.specialtyId), displayName = text(input.displayName, 160), operationKey = opKey(input.operationKey), fp = fingerprint([clinicianId, specialtyId, displayName]);
            return run(actor, async (tx) => { const cp = await tx.clinicianProfile.findUnique({ where: { id: clinicianId }, select: { userId: true } }); return cp ? [cp.userId] : []; }, async (tx, a) => {
                const cp = await profile(tx, clinicianId);
                await specialty(tx, specialtyId);
                const old = await tx.clinicianDirectory.findUnique({ where: { createdByUserId_operationKey: { createdByUserId: a.userId, operationKey } } });
                if (old) {
                    if (old.creationFingerprint !== fp)
                        fail('DIRECTORY_CONFLICT');
                    return { provider: await tx.clinicianDirectory.findUniqueOrThrow({ where: { id: old.id }, select: providerSelect }), created: false };
                }
                if (cp.status !== 'ACTIVE')
                    fail('DIRECTORY_NOT_FOUND');
                const time = await now(tx);
                const row = await tx.clinicianDirectory.create({ data: { clinicianId, clinicianUserId: cp.userId, specialtyId, displayName, createdByUserId: a.userId, changedByUserId: a.userId, operationKey, creationFingerprint: fp, createdAt: time, changedAt: time }, select: providerSelect });
                await audit(tx, a, 'CLINICIAN_DIRECTORY_CREATED', 'clinician_directory', row.id);
                return { provider: row, created: true };
            });
        },
        async setProvider(actor: AuthPrincipal, input: {
            providerId: string;
            specialtyId: string;
            displayName: string;
            isPublished: boolean;
            expectedVersion: number;
        }) {
            exact(input, ['providerId', 'specialtyId', 'displayName', 'isPublished', 'expectedVersion']);
            const providerId = id(input.providerId), specialtyId = id(input.specialtyId), displayName = text(input.displayName, 160), isPublished = bool(input.isPublished), expectedVersion = version(input.expectedVersion);
            return run(actor, providerPeers(providerId), async (tx, a) => {
                const target = await tx.clinicianDirectory.findUnique({ where: { id: providerId } });
                if (!target)
                    fail('DIRECTORY_NOT_FOUND');
                const cp = await profile(tx, target!.clinicianId), s = await specialty(tx, specialtyId);
                // Lock existing eligible affiliations before the provider row, matching publish.
                const affiliations = await tx.directoryAffiliation.findMany({ where: { providerId, withdrawnAt: null }, orderBy: { id: 'asc' } });
                if (isPublished) {
                    if (cp.status !== 'ACTIVE' || !s.isPublished || specialtyId !== target!.specialtyId)
                        fail('DIRECTORY_NOT_FOUND');
                    for (const orgId of [...new Set(affiliations.map(x => x.organizationId))].sort())
                        await clinic(tx, orgId);
                    for (const mId of [...new Set(affiliations.map(x => x.membershipId))].sort())
                        await tx.$queryRaw `SELECT id FROM public.organization_memberships WHERE id=${mId}::uuid FOR SHARE`;
                    const count = await tx.$queryRaw<{
                        n: number;
                    }[]> `SELECT count(*)::int n FROM (${eligibleSql} AND p.id=${providerId}::uuid) e`;
                    // Initial global enable needs the same eligibility without p.is_published.
                    if (!count[0].n) {
                        const ok = await tx.directoryAffiliation.count({ where: { providerId, withdrawnAt: null, specialtyId, membership: { status: 'ACTIVE', endedAt: null }, clinic: { isPublished: true, organization: { status: 'ACTIVE' } } } });
                        if (!ok)
                            fail('DIRECTORY_NOT_FOUND');
                    }
                }
                await tx.$queryRaw `SELECT id FROM public.clinician_directory WHERE id=${providerId}::uuid FOR UPDATE`;
                const old = await tx.clinicianDirectory.findUniqueOrThrow({ where: { id: providerId } });
                const same = old.specialtyId === specialtyId && old.displayName === displayName && old.isPublished === isPublished;
                if (old.version !== expectedVersion && !(same && old.version === expectedVersion + 1))
                    fail('DIRECTORY_CONFLICT');
                if (same)
                    return { provider: await tx.clinicianDirectory.findUniqueOrThrow({ where: { id: providerId }, select: providerSelect }), changed: false };
                if (old.specialtyId !== specialtyId) {
                    if (isPublished)
                        fail('DIRECTORY_CONFLICT');
                    for (const pub of affiliations)
                        await withdraw(tx, a, pub.id);
                }
                const row = await tx.clinicianDirectory.update({ where: { id: providerId }, data: { specialtyId, displayName, isPublished, version: old.version + 1, changedAt: await now(tx, old.changedAt), changedByUserId: a.userId }, select: providerSelect });
                await audit(tx, a, old.isPublished !== isPublished ? (isPublished ? 'CLINICIAN_DIRECTORY_ENABLED' : 'CLINICIAN_DIRECTORY_DISABLED') : old.specialtyId !== specialtyId ? 'CLINICIAN_SPECIALTY_CHANGED' : 'CLINICIAN_DIRECTORY_UPDATED', 'clinician_directory', providerId);
                if (old.specialtyId !== specialtyId && old.isPublished !== isPublished)
                    await audit(tx, a, 'CLINICIAN_SPECIALTY_CHANGED', 'clinician_directory', providerId);
                return { provider: row, changed: true };
            });
        },
        async publishAffiliation(actor: AuthPrincipal, input: {
            providerId: string;
            membershipId: string;
            operationKey: string;
        }) {
            exact(input, ['providerId', 'membershipId', 'operationKey']);
            const providerId = id(input.providerId), membershipId = id(input.membershipId), operationKey = opKey(input.operationKey);
            return run(actor, providerPeers(providerId), async (tx, a) => {
                const p = await tx.clinicianDirectory.findUnique({ where: { id: providerId } });
                if (!p)
                    fail('DIRECTORY_NOT_FOUND');
                const cp = await profile(tx, p!.clinicianId);
                const previous = await tx.directoryAffiliation.findUnique({ where: { publishedByUserId_operationKey: { publishedByUserId: a.userId, operationKey } } });
                if (previous) {
                    if (previous.providerId !== providerId || previous.membershipId !== membershipId)
                        fail('DIRECTORY_CONFLICT');
                    return { publication: await tx.directoryAffiliation.findUniqueOrThrow({ where: { id: previous.id }, select: affiliationSelect }), created: false };
                }
                const s = await specialty(tx, p!.specialtyId);
                const target = await tx.organizationMembership.findUnique({ where: { id: membershipId } });
                if (!target || target.userId !== p!.clinicianUserId || target.userRole !== 'CLINICIAN' || target.organizationKind !== 'CLINIC')
                    fail('DIRECTORY_NOT_FOUND');
                const { o, c } = await clinic(tx, target!.organizationId);
                await tx.$queryRaw `SELECT id FROM public.organization_memberships WHERE id=${membershipId}::uuid FOR SHARE`;
                const m = await tx.organizationMembership.findUniqueOrThrow({ where: { id: membershipId } });
                if (cp.status !== 'ACTIVE' || !s.isPublished || o.status !== 'ACTIVE' || !c.isPublished || m.status !== 'ACTIVE' || m.endedAt)
                    fail('DIRECTORY_NOT_FOUND');
                await tx.$queryRaw `SELECT id FROM public.clinician_directory WHERE id=${providerId}::uuid FOR UPDATE`;
                if (await tx.directoryAffiliation.count({ where: { providerId, membershipId, withdrawnAt: null } }))
                    fail('DIRECTORY_CONFLICT');
                const publication = await tx.directoryAffiliation.create({ data: { providerId, clinicianUserId: p!.clinicianUserId, membershipId, organizationId: m.organizationId, specialtyId: p!.specialtyId, publishedByUserId: a.userId, operationKey, publishedAt: await now(tx) }, select: affiliationSelect });
                await audit(tx, a, 'CLINICIAN_DIRECTORY_PUBLISHED', 'directory_affiliation', publication.id);
                return { publication, created: true };
            });
        },
        async withdrawAffiliation(actor: AuthPrincipal, input: {
            providerId: string;
            publicationId: string;
        }) {
            exact(input, ['providerId', 'publicationId']);
            const providerId = id(input.providerId), publicationId = id(input.publicationId);
            return run(actor, providerPeers(providerId), async (tx, a) => {
                const p = await tx.clinicianDirectory.findUnique({ where: { id: providerId } });
                if (!p)
                    fail('DIRECTORY_NOT_FOUND');
                await profile(tx, p!.clinicianId);
                await tx.$queryRaw `SELECT id FROM public.clinician_directory WHERE id=${providerId}::uuid FOR UPDATE`;
                const row = await tx.directoryAffiliation.findFirst({ where: { id: publicationId, providerId }, select: { id: true } });
                if (!row)
                    fail('DIRECTORY_NOT_FOUND');
                return withdraw(tx, a, publicationId);
            });
        },
        async inspect(actor: AuthPrincipal, input: {
            kind: 'specialty' | 'clinic' | 'provider';
            id: string;
        }) {
            exact(input, ['kind', 'id']);
            const kind = input.kind, target = id(input.id);
            if (!['specialty', 'clinic', 'provider'].includes(kind))
                fail('DIRECTORY_INVALID');
            return run(actor, none, async (tx) => { const row = kind === 'specialty' ? await tx.specialty.findUnique({ where: { id: target }, select: specialtySelect }) : kind === 'clinic' ? await tx.clinicDirectory.findUnique({ where: { id: target }, select: clinicSelect }) : await tx.clinicianDirectory.findUnique({ where: { id: target }, select: providerSelect }); if (!row)
                fail('DIRECTORY_NOT_FOUND'); return row!; });
        },
        async listSpecialties(input: DirectoryPage) { const p = directoryPage(input); return publicRead<{
            data: PublicSpecialty[];
            meta: {
                page: number;
                pageSize: number;
                total: number;
            };
        }>(pageResult(Prisma.sql `SELECT key sort,jsonb_build_object('key',key,'displayName',display_name) value FROM public.specialties WHERE is_published`, p, Prisma.sql `sort`)); },
        async listClinics(input: DirectoryPage) { const p = directoryPage(input); return publicRead<{
            data: PublicClinic[];
            meta: {
                page: number;
                pageSize: number;
                total: number;
            };
        }>(pageResult(Prisma.sql `SELECT c.public_id sort,jsonb_build_object('id',c.public_id,'displayName',c.display_name,'city',c.city,'address',c.address) value FROM public.clinic_directory c JOIN public.organizations o ON o.id=c.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE' WHERE c.is_published`, p, Prisma.sql `sort`)); },
        async listProviders(input: ProviderPage) { const p = providerPage(input); return publicRead<{
            data: PublicProvider[];
            meta: {
                page: number;
                pageSize: number;
                total: number;
            };
        }>(pageResult(Prisma.sql `WITH eligible AS (${eligibleSql}) SELECT id sort,${providerJson} value FROM eligible WHERE (${p.specialty}::text IS NULL OR specialty_key=${p.specialty}) AND (${p.clinic}::uuid IS NULL OR clinic_id=${p.clinic}::uuid) GROUP BY id,display_name,specialty_key,specialty_name`, p, Prisma.sql `sort`)); },
        async getProvider(publicId: string) { const target = id(publicId, true); const value = await publicRead<PublicProvider | null>(Prisma.sql `WITH eligible AS (${eligibleSql}),projected AS (SELECT ${providerJson} value FROM eligible WHERE id=${target}::uuid GROUP BY id,display_name,specialty_key,specialty_name) SELECT (SELECT value FROM projected) result`); if (!value)
            fail('DIRECTORY_NOT_FOUND'); return value!; },
        async close() { await client.$disconnect(); await pool.end(); },
    };
}
export type DirectoryPersistence = ReturnType<typeof createDirectoryPersistence>;
export type PublicDirectory = Pick<DirectoryPersistence, 'listSpecialties' | 'listClinics' | 'listProviders' | 'getProvider'>;
