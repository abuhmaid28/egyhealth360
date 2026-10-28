import { createHash } from 'node:crypto';
import pg from 'pg';
import type { AuthPrincipal } from './auth.js';
import { AvailabilityError, availabilityFail as fail, availabilityExact as exact, availabilityId as id, availabilityInteger as integer, availabilityTime as time, schedulingValues, offsetMatches, availabilityPage } from './availability-values.js';
type Tx = pg.PoolClient;
type Actor = Pick<AuthPrincipal, 'userId' | 'sessionId' | 'role'>;
type Config = {
    organization_id: string;
    version: number;
    time_zone: string;
    duration_minutes: number;
    minimum_booking_lead: number;
    publication_horizon_days: number;
    changed_by_user_id: string;
    changed_at: Date;
};
type Scope = {
    clinician_id: string;
    provider_id: string;
    organization_id: string;
    membership_id: string;
    affiliation_id: string;
    specialty_id: string;
};
type Slot = Scope & {
    id: string;
    clinician_user_id: string;
    start_at: Date;
    end_at: Date;
    time_zone: string;
    state: string;
    version: number;
    published_at: Date;
    withdrawn_at: Date | null;
};
export type AvailabilityProjection = {
    id: string;
    providerId: string;
    clinicId: string;
    startAt: string;
    endAt: string;
    timeZone: string;
    state: string;
    version: number;
    publishedAt: string;
    withdrawnAt: string | null;
};
const fingerprint = (v: unknown[]) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function current(tx: Tx, a: Actor, role: string) { const r = await tx.query(`SELECT u.role FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()`, [a.userId, a.sessionId]); if (r.rowCount !== 1)
    fail('AVAILABILITY_UNAUTHENTICATED'); if (r.rows[0].role !== role || a.role !== role)
    fail('AVAILABILITY_NOT_FOUND'); }
const publicEligibility = `FROM public.availability_slots v
 JOIN public.clinician_profiles cp ON cp.id=v.clinician_id AND cp.user_id=v.clinician_user_id AND cp.user_role='CLINICIAN'
 JOIN public.users u ON u.id=cp.user_id AND u.role='CLINICIAN' AND u.status='ACTIVE'
 JOIN public.clinician_directory p ON p.id=v.provider_id AND p.clinician_id=cp.id AND p.clinician_user_id=u.id AND p.is_published
 JOIN public.specialties sp ON sp.id=p.specialty_id AND sp.is_published
 JOIN public.directory_affiliations a ON a.id=v.affiliation_id AND a.provider_id=p.id AND a.clinician_user_id=u.id AND a.organization_id=v.organization_id AND a.membership_id=v.membership_id AND a.specialty_id=sp.id AND a.withdrawn_at IS NULL
 JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=u.id AND m.organization_id=a.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
 JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
 JOIN public.clinic_directory c ON c.organization_id=o.id AND c.organization_kind='CLINIC' AND c.is_published
 JOIN LATERAL(SELECT * FROM public.clinic_scheduling_settings WHERE organization_id=o.id ORDER BY version DESC LIMIT 1) cfg ON true`;
const historyJson = `jsonb_build_object('id',v.id,'providerId',p.public_id,'clinicId',c.public_id,'startAt',to_char(v.start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'endAt',to_char(v.end_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'timeZone',v.time_zone,'state',v.state,'version',v.version,'publishedAt',to_char(v.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'withdrawnAt',CASE WHEN v.withdrawn_at IS NULL THEN NULL ELSE to_char(v.withdrawn_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END)`;
/** Narrow scheduling persistence. No patient, assignment or clinical authority. */
export function createAvailabilityPersistence(connectionString: string | undefined) {
    if (!connectionString)
        fail('AVAILABILITY_UNAVAILABLE');
    const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, lock_timeout: 5000, statement_timeout: 10000 });
    pool.on('error', () => { });
    async function run<T>(principal: AuthPrincipal, role: 'ADMIN' | 'CLINICIAN', action: (tx: Tx, a: Actor) => Promise<T>): Promise<T> {
        const d: PropertyDescriptorMap = principal && typeof principal === 'object' ? Object.getOwnPropertyDescriptors(principal) : {};
        if (['userId', 'sessionId', 'role'].some(k => !d[k] || !('value' in d[k])))
            fail('AVAILABILITY_UNAUTHENTICATED');
        let a: Actor;
        try {
            a = { userId: id(d.userId.value), sessionId: id(d.sessionId.value), role: d.role.value };
        }
        catch {
            return fail('AVAILABILITY_UNAUTHENTICATED');
        }
        let tx: Tx | undefined;
        try {
            tx = await pool.connect();
            await tx.query('BEGIN');
            await tx.query("SET LOCAL transaction_timeout='30s'");
            await tx.query("SET LOCAL lock_timeout='5s'");
            await tx.query("SET LOCAL statement_timeout='10s'");
            // Only the clinician path takes M1-compatible intent before row locks.
            // ADMIN configuration/history must stay in the operational subset.
            if (role === 'CLINICIAN')
                await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
            await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [a.userId]);
            await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]);
            await current(tx, a, role);
            if (role === 'CLINICIAN' && (await tx.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE", [a.userId])).rowCount !== 1)
                fail('AVAILABILITY_NOT_FOUND');
            const result = await action(tx, a);
            await current(tx, a, role);
            await tx.query('COMMIT');
            return result;
        }
        catch (e) {
            if (tx)
                await tx.query('ROLLBACK').catch(() => { });
            if (e instanceof AvailabilityError)
                throw e;
            if (e && typeof e === 'object' && 'code' in e && ['23P01', '23505'].includes(String(e.code)))
                fail('AVAILABILITY_CONFLICT');
            return fail('AVAILABILITY_UNAVAILABLE');
        }
        finally {
            tx?.release();
        }
    }
    async function config(tx: Tx, organizationId: string, write = false) { const r = await tx.query<Config>(`SELECT * FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR ${write ? 'UPDATE' : 'SHARE'}`, [organizationId]); return r.rows[0] ?? null; }
    async function audit(tx: Tx, a: Actor, action: string, entity: string, target: string) { await tx.query("INSERT INTO public.audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,$3,$4,'{}',clock_timestamp())", [a.userId, action, entity, target]); }
    async function scope(tx: Tx, a: Actor, clinicId: string, source?: Slot): Promise<Scope> {
        const preliminary = await tx.query<Scope>(`SELECT cp.id clinician_id,p.id provider_id,c.organization_id,a.membership_id,a.id affiliation_id,p.specialty_id FROM public.clinician_profiles cp JOIN public.clinician_directory p ON p.clinician_id=cp.id AND p.clinician_user_id=cp.user_id JOIN public.directory_affiliations a ON a.provider_id=p.id JOIN public.clinic_directory c ON c.organization_id=a.organization_id WHERE cp.user_id=$1 AND c.public_id=$2 AND ${source ? 'a.id=$3' : 'a.withdrawn_at IS NULL'} ORDER BY a.id LIMIT 1`, source ? [a.userId, clinicId, source.affiliation_id] : [a.userId, clinicId]);
        const s = preliminary.rows[0];
        if (!s)
            fail('AVAILABILITY_NOT_FOUND');
        await tx.query('SELECT id FROM public.specialties WHERE id=$1 FOR SHARE', [s.specialty_id]);
        await tx.query('SELECT id FROM public.organizations WHERE id=$1 FOR SHARE', [s.organization_id]);
        await tx.query('SELECT id FROM public.clinic_directory WHERE organization_id=$1 FOR SHARE', [s.organization_id]);
        await tx.query('SELECT id FROM public.organization_memberships WHERE id=$1 FOR SHARE', [s.membership_id]);
        await tx.query('SELECT id FROM public.clinician_directory WHERE id=$1 FOR SHARE', [s.provider_id]);
        await tx.query('SELECT id FROM public.directory_affiliations WHERE id=$1 FOR SHARE', [s.affiliation_id]);
        const check = await tx.query(`SELECT a.id FROM public.directory_affiliations a JOIN public.clinician_directory p ON p.id=a.provider_id AND p.clinician_user_id=$1 AND p.clinician_id=$2 AND p.is_published AND p.specialty_id=a.specialty_id JOIN public.specialties sp ON sp.id=a.specialty_id AND sp.is_published JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=$1 AND m.organization_id=a.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE' JOIN public.clinic_directory c ON c.organization_id=o.id AND c.is_published WHERE a.id=$3 AND a.withdrawn_at IS NULL AND a.membership_id=$4 AND a.organization_id=$5 AND a.clinician_user_id=$1`, [a.userId, s.clinician_id, s.affiliation_id, s.membership_id, s.organization_id]);
        if (check.rowCount !== 1)
            fail('AVAILABILITY_NOT_FOUND');
        await current(tx, a, 'CLINICIAN');
        return s;
    }
    async function project(tx: Tx, slotId: string): Promise<AvailabilityProjection> { return (await tx.query(`SELECT ${historyJson} value FROM public.availability_slots v JOIN public.clinician_directory p ON p.id=v.provider_id JOIN public.clinic_directory c ON c.organization_id=v.organization_id WHERE v.id=$1`, [slotId])).rows[0].value; }
    async function replay(tx: Tx, a: Actor, command: string, key: string, fp: string) { const r = await tx.query('SELECT fingerprint,result FROM public.availability_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3', [a.userId, command, key]); if (!r.rowCount)
        return null; if (r.rows[0].fingerprint !== fp)
        fail('AVAILABILITY_CONFLICT'); return r.rows[0].result as AvailabilityProjection; }
    async function retain(tx: Tx, a: Actor, command: string, key: string, fp: string, slotId: string) { const result = await project(tx, slotId); await tx.query('INSERT INTO public.availability_operations(actor_user_id,command,operation_key,fingerprint,slot_id,result) VALUES($1,$2,$3,$4,$5,$6)', [a.userId, command, key, fp, slotId, JSON.stringify(result)]); return result; }
    async function within(tx: Tx, start: Date, end: Date, c: Config) { const r = await tx.query('SELECT $1::timestamptz>clock_timestamp() AND $2::timestamptz<=clock_timestamp()+$3::integer*interval \'24 hours\' ok', [start, end, c.publication_horizon_days]); if (!r.rows[0].ok)
        fail('AVAILABILITY_CONFLICT'); }
    return {
        async setConfiguration(actor: AuthPrincipal, input: {
            organizationId: string;
            expectedVersion: number;
            timeZone: string;
            durationMinutes: number;
            minimumBookingLead: number;
            publicationHorizonDays: number;
        }) {
            exact(input, ['organizationId', 'expectedVersion', 'timeZone', 'durationMinutes', 'minimumBookingLead', 'publicationHorizonDays']);
            const organizationId = id(input.organizationId), expectedVersion = integer(input.expectedVersion, 0, 2147483646), v = schedulingValues({ timeZone: input.timeZone, durationMinutes: input.durationMinutes, minimumBookingLead: input.minimumBookingLead, publicationHorizonDays: input.publicationHorizonDays });
            return run(actor, 'ADMIN', async (tx, a) => { const org = await tx.query("SELECT id FROM public.organizations WHERE id=$1 AND kind='CLINIC' FOR UPDATE", [organizationId]); if (org.rowCount !== 1)
                fail('AVAILABILITY_NOT_FOUND'); const old = await config(tx, organizationId, true); await current(tx, a, 'ADMIN'); if ((old?.version ?? 0) !== expectedVersion)
                fail('AVAILABILITY_CONFLICT'); const row = (await tx.query<Config>('INSERT INTO public.clinic_scheduling_settings(organization_id,version,time_zone,duration_minutes,minimum_booking_lead,publication_horizon_days,changed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [organizationId, expectedVersion + 1, v.timeZone, v.durationMinutes, v.minimumBookingLead, v.publicationHorizonDays, a.userId])).rows[0]; await audit(tx, a, old ? 'CLINIC_SCHEDULING_CHANGED' : 'CLINIC_SCHEDULING_CREATED', 'clinic_scheduling_settings', organizationId); return row; });
        },
        async configurationHistory(actor: AuthPrincipal, organizationId: string) { const target = id(organizationId); return run(actor, 'ADMIN', async (tx) => { if ((await tx.query("SELECT id FROM public.organizations WHERE id=$1 AND kind='CLINIC' FOR SHARE", [target])).rowCount !== 1)
            fail('AVAILABILITY_NOT_FOUND'); return (await tx.query<Config>('SELECT * FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version', [target])).rows; }); },
        async publish(actor: AuthPrincipal, input: {
            clinicId: string;
            startAt: string;
            endAt: string;
            operationKey: string;
        }) {
            exact(input, ['clinicId', 'startAt', 'endAt', 'operationKey']);
            const clinicId = id(input.clinicId), operationKey = id(input.operationKey), start = time(input.startAt), end = time(input.endAt), startText = input.startAt, endText = input.endAt, fp = fingerprint([clinicId, start.toISOString(), end.toISOString()]);
            return run(actor, 'CLINICIAN', async (tx, a) => {
                const prior = (await tx.query<Slot>("SELECT v.* FROM public.availability_operations op JOIN public.availability_slots v ON v.id=op.slot_id WHERE op.actor_user_id=$1 AND op.command='PUBLISH' AND op.operation_key=$2", [a.userId, operationKey])).rows[0];
                const resolvedClinic = prior ? (await tx.query('SELECT public_id FROM public.clinic_directory WHERE organization_id=$1', [prior.organization_id])).rows[0].public_id as string : clinicId;
                const s = await scope(tx, a, resolvedClinic, prior), c = await config(tx, s.organization_id);
                if (!c)
                    fail('AVAILABILITY_NOT_FOUND');
                await current(tx, a, 'CLINICIAN');
                // EH2C: dedicated two-int advisory namespace, disjoint from the
                // legacy one-bigint relationship/clinical advisory domains.
                // Identity comes from the locked profile, never the request clinic.
                await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363, pg_catalog.hashtext($1::text))', [s.clinician_id]);
                await current(tx, a, 'CLINICIAN');
                const previous = await replay(tx, a, 'PUBLISH', operationKey, fp);
                if (previous)
                    return previous;
                offsetMatches(startText, c.time_zone);
                offsetMatches(endText, c.time_zone);
                if (end.getTime() - start.getTime() !== c.duration_minutes * 60000)
                    fail('AVAILABILITY_INVALID');
                await within(tx, start, end, c);
                const slot = (await tx.query<Slot>(`INSERT INTO public.availability_slots(clinician_id,clinician_user_id,organization_id,provider_id,membership_id,affiliation_id,start_at,end_at,time_zone,configuration_version,duration_minutes,minimum_booking_lead,publication_horizon_days,published_by_user_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$2,$14) RETURNING *`, [s.clinician_id, a.userId, s.organization_id, s.provider_id, s.membership_id, s.affiliation_id, start, end, c.time_zone, c.version, c.duration_minutes, c.minimum_booking_lead, c.publication_horizon_days, operationKey])).rows[0];
                await audit(tx, a, 'AVAILABILITY_PUBLISHED', 'availability_slot', slot.id);
                const result = await retain(tx, a, 'PUBLISH', operationKey, fp, slot.id);
                await within(tx, start, end, c);
                return result;
            });
        },
        async withdraw(actor: AuthPrincipal, input: {
            slotId: string;
            operationKey: string;
            expectedVersion: number;
        }) {
            exact(input, ['slotId', 'operationKey', 'expectedVersion']);
            const slotId = id(input.slotId), operationKey = id(input.operationKey), expectedVersion = integer(input.expectedVersion, 1, 2147483646), fp = fingerprint([slotId, expectedVersion]);
            return run(actor, 'CLINICIAN', async (tx, a) => { const source = (await tx.query<Slot>('SELECT * FROM public.availability_slots WHERE id=$1 AND clinician_user_id=$2', [slotId, a.userId])).rows[0]; if (!source)
                fail('AVAILABILITY_NOT_FOUND'); const locator = (await tx.query('SELECT public_id FROM public.clinic_directory WHERE organization_id=$1', [source.organization_id])).rows[0].public_id; await scope(tx, a, locator, source); await config(tx, source.organization_id); await tx.query('SELECT id FROM public.availability_slots WHERE id=$1 FOR UPDATE', [slotId]); await current(tx, a, 'CLINICIAN'); const previous = await replay(tx, a, 'WITHDRAW', operationKey, fp); if (previous)
                return previous; const slot = (await tx.query<Slot>('SELECT * FROM public.availability_slots WHERE id=$1', [slotId])).rows[0]; if (slot.state !== 'PUBLISHED' || slot.version !== expectedVersion)
                fail('AVAILABILITY_CONFLICT'); await tx.query("UPDATE public.availability_slots SET state='WITHDRAWN',version=2,withdrawn_by_user_id=$2,withdrawn_at=clock_timestamp() WHERE id=$1", [slotId, a.userId]); await audit(tx, a, 'AVAILABILITY_WITHDRAWN', 'availability_slot', slotId); return retain(tx, a, 'WITHDRAW', operationKey, fp, slotId); });
        },
        async history(actor: AuthPrincipal, input: unknown = {}) { const p = availabilityPage(input); return run(actor, 'CLINICIAN', async (tx, a) => (await tx.query(`WITH projected AS(SELECT v.start_at,v.id,${historyJson} value FROM public.availability_slots v JOIN public.clinician_directory p ON p.id=v.provider_id JOIN public.clinic_directory c ON c.organization_id=v.organization_id WHERE v.clinician_user_id=$1),selected AS(SELECT * FROM projected ORDER BY start_at,id LIMIT $2 OFFSET $3) SELECT jsonb_build_object('data',coalesce((SELECT jsonb_agg(value ORDER BY start_at,id) FROM selected),'[]'::jsonb),'meta',jsonb_build_object('page',$4::int,'pageSize',$2::int,'total',(SELECT count(*)::int FROM projected))) result`, [a.userId, p.pageSize, (p.page - 1) * p.pageSize, p.page])).rows[0].result); },
        async publicAvailability(providerId: string, input: unknown = {}) {
            const target = id(providerId), p = availabilityPage(input, true);
            try {
                // Eligibility of a provider with no slots is still the directory's exact 404 contract.
                const r = await pool.query(`WITH eligible_provider AS(SELECT p.id FROM public.clinician_directory p JOIN public.clinician_profiles cp ON cp.id=p.clinician_id AND cp.user_id=p.clinician_user_id AND cp.user_role='CLINICIAN' JOIN public.users u ON u.id=cp.user_id AND u.role='CLINICIAN' AND u.status='ACTIVE' JOIN public.specialties sp ON sp.id=p.specialty_id AND sp.is_published JOIN public.directory_affiliations a ON a.provider_id=p.id AND a.specialty_id=sp.id AND a.clinician_user_id=u.id AND a.withdrawn_at IS NULL JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=u.id AND m.organization_id=a.organization_id AND m.status='ACTIVE' AND m.ended_at IS NULL AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE' JOIN public.clinic_directory c ON c.organization_id=o.id AND c.is_published WHERE p.public_id=$1 AND p.is_published), projected AS(SELECT v.start_at,v.id,jsonb_build_object('id',v.id,'providerId',p.public_id,'clinicId',c.public_id,'startAt',to_char(v.start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'endAt',to_char(v.end_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'timeZone',v.time_zone,'bookable',true) value ${publicEligibility} WHERE p.public_id=$1 AND v.state='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM public.bookings occupied WHERE occupied.slot_id=v.id AND occupied.state='BOOKED') AND v.start_at-cfg.minimum_booking_lead*interval '1 minute'>statement_timestamp() AND v.end_at<=statement_timestamp()+cfg.publication_horizon_days*interval '24 hours' AND ($2::uuid IS NULL OR c.public_id=$2) AND ($3::timestamptz IS NULL OR v.start_at>=$3) AND ($4::timestamptz IS NULL OR v.end_at<=$4)),selected AS(SELECT * FROM projected ORDER BY start_at,id LIMIT $5 OFFSET $6) SELECT EXISTS(SELECT 1 FROM eligible_provider) eligible,jsonb_build_object('data',coalesce((SELECT jsonb_agg(value ORDER BY start_at,id) FROM selected),'[]'::jsonb),'meta',jsonb_build_object('page',$7::int,'pageSize',$5::int,'total',(SELECT count(*)::int FROM projected))) result`, [target, p.clinic, p.from, p.to, p.pageSize, (p.page - 1) * p.pageSize, p.page]);
                if (!r.rows[0].eligible)
                    fail('AVAILABILITY_NOT_FOUND');
                return r.rows[0].result;
            }
            catch (e) {
                if (e instanceof AvailabilityError)
                    throw e;
                return fail('AVAILABILITY_UNAVAILABLE');
            }
        },
        async close() { await pool.end(); }
    };
}
export type AvailabilityPersistence = ReturnType<typeof createAvailabilityPersistence>;
