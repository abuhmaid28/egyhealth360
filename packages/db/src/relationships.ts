import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';
import { appendAuditRecord } from './audit.js';
import { resolveRelationshipProvider } from './directory.js';
import { RelationshipError, relationshipFail as fail, relationshipId as id, relationshipInput as input, relationshipPage, relationshipAuthorization } from './relationship-values.js';
type Tx = Prisma.TransactionClient;
type Actor = {
    userId: string;
    sessionId: string;
    role: string;
};
type Pair = {
    patientId: string;
    patientUserId: string;
    clinicianId: string;
    clinicianUserId: string;
};
type Scope = Pair & {
    requestId?: string;
    assignmentId?: string | null;
};
const requestSelect = { id: true, patientId: true, patientUserId: true, clinicianId: true, clinicianUserId: true, providerPublicId: true, operationKey: true, status: true, authorizedAt: true, authorizedAssignmentId: true, assignmentCountAtAuthorization: true, assignmentId: true, acceptedAt: true, acceptedByUserId: true, declinedAt: true, declinedByUserId: true, authorizationWithdrawnAt: true, withdrawnByUserId: true } as const;
type RequestRow = Prisma.RelationshipRequestGetPayload<{
    select: typeof requestSelect;
}>;
const assignmentSelect = { id: true, clinicianId: true, patientId: true, status: true, assignedAt: true, endedAt: true } as const;
type AssignmentRow = Prisma.ClinicianPatientAssignmentGetPayload<{
    select: typeof assignmentSelect;
}>;
function actor(principal: AuthPrincipal): Actor {
    const d: PropertyDescriptorMap = principal && typeof principal === 'object' ? Object.getOwnPropertyDescriptors(principal) : {};
    if (['userId', 'sessionId', 'role'].some(k => !d[k] || !('value' in d[k])))
        fail('RELATIONSHIP_UNAUTHENTICATED');
    try {
        return { userId: id(d.userId.value), sessionId: id(d.sessionId.value), role: d.role.value };
    }
    catch {
        return fail('RELATIONSHIP_UNAUTHENTICATED');
    }
}
async function current(tx: Tx, a: Actor) {
    const rows = await tx.$queryRaw<{
        role: string;
    }[]> `SELECT u.role::text role FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=${a.userId}::uuid AND s.id=${a.sessionId}::uuid AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>pg_catalog.clock_timestamp()`;
    if (rows.length !== 1)
        fail('RELATIONSHIP_UNAUTHENTICATED');
    if (rows[0].role !== a.role || !['PATIENT', 'CLINICIAN'].includes(rows[0].role))
        fail('RELATIONSHIP_NOT_FOUND');
}
const timestamp = async (tx: Tx, lower: Date = new Date(0)) => (await tx.$queryRaw<{
    now: Date;
}[]> `SELECT greatest(pg_catalog.clock_timestamp()::timestamptz(3),${lower}::timestamptz) now`)[0].now;
const audit = (tx: Tx, a: Actor, actionType: string, entityType: string, entityId: string) => appendAuditRecord(tx, { actorUserId: a.userId, actionType, entityType, entityId });
function participant(a: Actor, p: Pair) {
    if (a.role === 'PATIENT' ? a.userId !== p.patientUserId : a.userId !== p.clinicianUserId)
        fail('RELATIONSHIP_NOT_FOUND');
}
async function profiles(tx: Tx, p: Pair, activePeer: boolean) {
    const c = await tx.$queryRaw<{
        id: string;
    }[]> `SELECT id FROM public.clinician_profiles WHERE id=${p.clinicianId}::uuid AND user_id=${p.clinicianUserId}::uuid AND user_role='CLINICIAN' FOR SHARE`;
    const patient = await tx.$queryRaw<{
        id: string;
    }[]> `SELECT id FROM public.patient_profiles WHERE id=${p.patientId}::uuid AND user_id=${p.patientUserId}::uuid AND user_role='PATIENT' FOR SHARE`;
    if (c.length !== 1 || patient.length !== 1)
        fail('RELATIONSHIP_NOT_FOUND');
    if (activePeer && (await tx.user.count({ where: { id: { in: [p.patientUserId, p.clinicianUserId] }, status: 'ACTIVE' } })) !== 2)
        fail('RELATIONSHIP_NOT_FOUND');
}
async function requestProjection(tx: Tx, r: RequestRow) {
    const [p, c] = await Promise.all([tx.patientProfile.findUniqueOrThrow({ where: { id: r.patientId }, select: { displayName: true } }), tx.clinicianProfile.findUniqueOrThrow({ where: { id: r.clinicianId }, select: { displayName: true } })]);
    return { id: r.id, providerId: r.providerPublicId, patientDisplayName: p.displayName, clinicianDisplayName: c.displayName, status: r.status, authorizedAt: r.authorizedAt, acceptedAt: r.acceptedAt, declinedAt: r.declinedAt, authorizationWithdrawnAt: r.authorizationWithdrawnAt, assignmentId: r.assignmentId };
}
async function assignmentProjection(tx: Tx, a: Actor, row: AssignmentRow) {
    const [p, c, end] = await Promise.all([tx.patientProfile.findUniqueOrThrow({ where: { id: row.patientId }, select: { displayName: true } }), tx.clinicianProfile.findUniqueOrThrow({ where: { id: row.clinicianId }, select: { displayName: true } }), tx.assignmentEndProvenance.findUnique({ where: { assignmentId: row.id }, select: { actorRole: true } })]);
    return { id: row.id, patientId: a.role === 'PATIENT' || row.status === 'ACTIVE' ? row.patientId : null, patientDisplayName: p.displayName, clinicianDisplayName: c.displayName, status: row.status, assignedAt: row.assignedAt, endedAt: row.endedAt, endedByRole: end?.actorRole ?? null };
}
/** Participant enrollment/provenance. Only Assignment.status is a clinical grant. */
export function createRelationshipPersistence(connectionString: string | undefined) {
    if (!connectionString)
        fail('RELATIONSHIP_UNAVAILABLE');
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
    pool.on('error', () => { });
    const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
    async function transaction<T>(a: Actor, operation: (tx: Tx) => Promise<T>): Promise<T> {
        try {
            return await client.$transaction(async (tx) => {
                await tx.$executeRaw `SET LOCAL lock_timeout='5s'`;
                await tx.$executeRaw `SET LOCAL statement_timeout='10s'`;
                await current(tx, a);
                // Acquire compatible table intent BEFORE row locks: M1 seed takes these four tables first.
                await tx.$executeRaw `LOCK TABLE public.users, public.patient_profiles, public.clinician_profiles, public.clinician_patient_assignments IN ROW EXCLUSIVE MODE`;
                const result = await operation(tx);
                await current(tx, a);
                return result;
            }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
        }
        catch (e) {
            if (e instanceof RelationshipError)
                throw e;
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
                fail('RELATIONSHIP_CONFLICT');
            return fail('RELATIONSHIP_UNAVAILABLE');
        }
    }
    async function lock(tx: Tx, a: Actor, p: Pair, activePeer = false) {
        participant(a, p);
        for (const userId of [...new Set([p.patientUserId, p.clinicianUserId])].sort())
            await tx.$queryRaw `SELECT id FROM public.users WHERE id=${userId}::uuid FOR NO KEY UPDATE`;
        await tx.$queryRaw `SELECT id FROM public.sessions WHERE id=${a.sessionId}::uuid FOR UPDATE`;
        await current(tx, a);
        await profiles(tx, p, activePeer);
        const key = `eh-i1-relationship-v1:${p.clinicianId}:${p.patientId}`;
        await tx.$queryRaw `SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${key},0))::text`;
        await current(tx, a);
    }
    async function requestScope(tx: Tx, a: Actor, requestId: string): Promise<Scope> {
        const r = await tx.relationshipRequest.findUnique({ where: { id: requestId }, select: requestSelect });
        if (!r)
            fail('RELATIONSHIP_NOT_FOUND');
        participant(a, r!);
        return { ...r!, requestId };
    }
    async function assignmentScope(tx: Tx, a: Actor, assignmentId: string): Promise<Scope> {
        const rows = await tx.$queryRaw<Pair[]> `SELECT a.patient_id AS "patientId",p.user_id AS "patientUserId",a.clinician_id AS "clinicianId",c.user_id AS "clinicianUserId" FROM public.clinician_patient_assignments a JOIN public.patient_profiles p ON p.id=a.patient_id JOIN public.clinician_profiles c ON c.id=a.clinician_id WHERE a.id=${assignmentId}::uuid`;
        if (rows.length !== 1)
            fail('RELATIONSHIP_NOT_FOUND');
        participant(a, rows[0]);
        return { ...rows[0], assignmentId };
    }
    async function exactAssignment(tx: Tx, assignmentId: string) {
        await tx.$queryRaw `SELECT id FROM public.clinician_patient_assignments WHERE id=${assignmentId}::uuid FOR UPDATE`;
        return tx.clinicianPatientAssignment.findUniqueOrThrow({ where: { id: assignmentId }, select: assignmentSelect });
    }
    async function end(tx: Tx, a: Actor, old: AssignmentRow) {
        if (old.status === 'ENDED')
            return { relationship: await assignmentProjection(tx, a, old), changed: false };
        const endedAt = await timestamp(tx, old.assignedAt);
        await tx.assignmentEndProvenance.create({ data: { assignmentId: old.id, clinicianId: old.clinicianId, patientId: old.patientId, actorUserId: a.userId, actorRole: a.role as 'PATIENT' | 'CLINICIAN', endedAt } });
        const row = await tx.clinicianPatientAssignment.update({ where: { id: old.id }, data: { status: 'ENDED', endedAt }, select: assignmentSelect });
        await audit(tx, a, 'CLINICIAN_PATIENT_RELATIONSHIP_ENDED', 'clinician_patient_assignment', row.id);
        return { relationship: await assignmentProjection(tx, a, row), changed: true };
    }
    return {
        async authorize(principal: AuthPrincipal, value: {
            providerId: string;
            operationKey: string;
        } | {
            assignmentId: string;
            operationKey: string;
        }) {
            const a = actor(principal), v = relationshipAuthorization(value);
            const matches = (r: RequestRow) => v.providerId !== null ? r.providerPublicId === v.providerId : r.providerPublicId === null && r.authorizedAssignmentId === v.assignmentId;
            return transaction(a, async (tx) => {
                if (a.role !== 'PATIENT')
                    fail('RELATIONSHIP_NOT_FOUND');
                const old = await tx.relationshipRequest.findUnique({ where: { patientUserId_operationKey: { patientUserId: a.userId, operationKey: v.operationKey } }, select: requestSelect });
                let p: Pair;
                if (old) {
                    if (!matches(old))
                        fail('RELATIONSHIP_CONFLICT');
                    p = old;
                }
                else {
                    if (v.assignmentId)
                        p = await assignmentScope(tx, a, v.assignmentId);
                    else {
                        const provider = await resolveRelationshipProvider(tx, v.providerId!), patient = await tx.patientProfile.findUnique({ where: { userId: a.userId }, select: { id: true } });
                        if (!provider || !patient)
                            fail('RELATIONSHIP_NOT_FOUND');
                        p = { ...provider!, patientId: patient!.id, patientUserId: a.userId };
                    }
                }
                await lock(tx, a, p, !old);
                // Same operation may have committed while we waited for the pair/users.
                const replay = await tx.relationshipRequest.findUnique({ where: { patientUserId_operationKey: { patientUserId: a.userId, operationKey: v.operationKey } }, select: requestSelect });
                if (replay) {
                    if (!matches(replay))
                        fail('RELATIONSHIP_CONFLICT');
                    return { request: await requestProjection(tx, replay), changed: false };
                }
                if (v.providerId && !await resolveRelationshipProvider(tx, v.providerId))
                    fail('RELATIONSHIP_NOT_FOUND');
                const assignments = await tx.clinicianPatientAssignment.findMany({ where: { clinicianId: p.clinicianId, patientId: p.patientId }, select: assignmentSelect });
                const active = assignments.find(x => x.status === 'ACTIVE');
                if (v.assignmentId && active?.id !== v.assignmentId)
                    fail('RELATIONSHIP_NOT_FOUND');
                if (await tx.relationshipRequest.count({ where: { clinicianId: p.clinicianId, patientId: p.patientId, OR: [{ status: 'PENDING' }, ...(active ? [{ assignmentId: active.id }] : [])] } }))
                    fail('RELATIONSHIP_CONFLICT');
                const row = await tx.relationshipRequest.create({ data: { patientId: p.patientId, patientUserId: p.patientUserId, clinicianId: p.clinicianId, clinicianUserId: p.clinicianUserId, providerPublicId: v.providerId, operationKey: v.operationKey, authorizedAt: await timestamp(tx), authorizedAssignmentId: active?.id ?? null, assignmentCountAtAuthorization: assignments.length }, select: requestSelect });
                await audit(tx, a, 'RELATIONSHIP_AUTHORIZED', 'relationship_request', row.id);
                return { request: await requestProjection(tx, row), changed: true };
            });
        },
        async decide(principal: AuthPrincipal, value: {
            requestId: string;
        }, decision: 'accept' | 'decline' | 'withdraw') {
            const a = actor(principal), v = input(value, ['requestId']);
            if (!['accept', 'decline', 'withdraw'].includes(decision))
                fail('RELATIONSHIP_INVALID');
            return transaction(a, async (tx) => {
                if (decision === 'withdraw' ? a.role !== 'PATIENT' : a.role !== 'CLINICIAN')
                    fail('RELATIONSHIP_NOT_FOUND');
                const p = await requestScope(tx, a, v.requestId);
                await lock(tx, a, p);
                // Assignment lock precedes request lock; patient lock is SHARE, compatible with M2.
                const first = await tx.relationshipRequest.findUniqueOrThrow({ where: { id: v.requestId }, select: requestSelect });
                let bound = first.assignmentId ? await exactAssignment(tx, first.assignmentId) : null;
                if (decision === 'accept' && first.status === 'PENDING') {
                    const active = await tx.clinicianPatientAssignment.findFirst({ where: { clinicianId: p.clinicianId, patientId: p.patientId, status: 'ACTIVE' }, select: assignmentSelect });
                    if (active)
                        bound = await exactAssignment(tx, active.id);
                }
                await tx.$queryRaw `SELECT id FROM public.relationship_requests WHERE id=${v.requestId}::uuid FOR UPDATE`;
                const r = await tx.relationshipRequest.findUniqueOrThrow({ where: { id: v.requestId }, select: requestSelect });
                if (decision === 'accept' && r.status === 'ACCEPTED' || decision === 'decline' && r.status === 'DECLINED' || decision === 'withdraw' && r.authorizationWithdrawnAt)
                    return { request: await requestProjection(tx, r), changed: false };
                if (r.status !== 'PENDING' && !(decision === 'withdraw' && r.status === 'ACCEPTED'))
                    fail('RELATIONSHIP_CONFLICT');
                const now = await timestamp(tx, r.acceptedAt ?? r.authorizedAt);
                let data: Prisma.RelationshipRequestUncheckedUpdateInput;
                if (decision === 'accept') {
                    await profiles(tx, p, true);
                    const count = await tx.clinicianPatientAssignment.count({ where: { clinicianId: p.clinicianId, patientId: p.patientId } });
                    if (count !== r.assignmentCountAtAuthorization || (r.authorizedAssignmentId ? bound?.id !== r.authorizedAssignmentId : bound !== null))
                        fail('RELATIONSHIP_CONFLICT');
                    if (!bound) {
                        bound = await tx.clinicianPatientAssignment.create({ data: { clinicianId: p.clinicianId, patientId: p.patientId, assignedAt: now }, select: assignmentSelect });
                        await audit(tx, a, 'CLINICIAN_PATIENT_RELATIONSHIP_ESTABLISHED', 'clinician_patient_assignment', bound.id);
                    }
                    data = { status: 'ACCEPTED', assignmentId: bound.id, acceptedAt: now, acceptedByUserId: a.userId };
                }
                else if (decision === 'decline')
                    data = { status: 'DECLINED', declinedAt: now, declinedByUserId: a.userId };
                else {
                    if (r.status === 'ACCEPTED') {
                        if (!bound)
                            fail('RELATIONSHIP_UNAVAILABLE');
                        await end(tx, a, bound!);
                    }
                    data = { status: r.status === 'ACCEPTED' ? 'ACCEPTED' : 'WITHDRAWN', authorizationWithdrawnAt: now, withdrawnByUserId: a.userId };
                }
                const row = await tx.relationshipRequest.update({ where: { id: r.id }, data, select: requestSelect });
                await audit(tx, a, decision === 'accept' ? 'RELATIONSHIP_REQUEST_ACCEPTED' : decision === 'decline' ? 'RELATIONSHIP_REQUEST_DECLINED' : 'RELATIONSHIP_AUTHORIZATION_WITHDRAWN', 'relationship_request', row.id);
                return { request: await requestProjection(tx, row), changed: true };
            });
        },
        async end(principal: AuthPrincipal, value: {
            assignmentId: string;
        }) {
            const a = actor(principal), v = input(value, ['assignmentId']);
            return transaction(a, async (tx) => { const p = await assignmentScope(tx, a, v.assignmentId); await lock(tx, a, p); return end(tx, a, await exactAssignment(tx, v.assignmentId)); });
        },
        async read(principal: AuthPrincipal, kind: 'requests' | 'relationships', target: string | null, query: unknown = {}) {
            const a = actor(principal), page = relationshipPage(query);
            if (target !== null)
                target = id(target);
            if (!['requests', 'relationships'].includes(kind))
                fail('RELATIONSHIP_INVALID');
            // Read transaction locks actor/session as existing mutable-own-profile reads do;
            // never acquires a clinical grant from a request or directory publication.
            return transaction(a, async (tx) => {
                await tx.$queryRaw `SELECT id FROM public.users WHERE id=${a.userId}::uuid FOR NO KEY UPDATE`;
                await tx.$queryRaw `SELECT id FROM public.sessions WHERE id=${a.sessionId}::uuid FOR UPDATE`;
                await current(tx, a);
                if (kind === 'requests') {
                    const where = { ...(a.role === 'PATIENT' ? { patientUserId: a.userId } : { clinicianUserId: a.userId }), ...(target ? { id: target } : {}) };
                    const rows = await tx.relationshipRequest.findMany({ where, select: requestSelect, orderBy: [{ authorizedAt: 'desc' }, { id: 'asc' }], skip: target ? 0 : (page.page - 1) * page.pageSize, take: target ? 1 : page.pageSize });
                    if (target && !rows.length)
                        fail('RELATIONSHIP_NOT_FOUND');
                    const data = await Promise.all(rows.map(r => requestProjection(tx, r)));
                    return target ? { data: data[0] } : { data, meta: { ...page, total: await tx.relationshipRequest.count({ where }) } };
                }
                const where = { ...(a.role === 'PATIENT' ? { patient: { userId: a.userId } } : { clinician: { userId: a.userId } }), ...(target ? { id: target } : {}) };
                const rows = await tx.clinicianPatientAssignment.findMany({ where, select: assignmentSelect, orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }], skip: target ? 0 : (page.page - 1) * page.pageSize, take: target ? 1 : page.pageSize });
                if (target && !rows.length)
                    fail('RELATIONSHIP_NOT_FOUND');
                const data = await Promise.all(rows.map(r => assignmentProjection(tx, a, r)));
                return target ? { data: data[0] } : { data, meta: { ...page, total: await tx.clinicianPatientAssignment.count({ where }) } };
            });
        },
        async close() { await client.$disconnect(); await pool.end(); },
    };
}
export type RelationshipPersistence = ReturnType<typeof createRelationshipPersistence>;
