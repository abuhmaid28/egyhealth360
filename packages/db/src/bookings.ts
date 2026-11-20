import pg from 'pg';
import { createHash } from 'node:crypto';
import type { AuthPrincipal } from './auth.js';
import { availabilityExact, availabilityId, availabilityInteger, availabilityPage } from './availability-values.js';
type Tx = pg.PoolClient;
type Actor = {
    userId: string;
    sessionId: string;
    role: string;
};
type Row = Record<string, unknown> & {
    id: string;
    patient_id: string;
    patient_user_id: string;
    clinician_id: string;
    clinician_user_id: string;
    organization_id: string;
    slot_id: string;
    provider_id: string;
    membership_id: string;
    affiliation_id: string;
    specialty_id: string;
    start_at: Date;
    end_at: Date;
    time_zone: string;
    configuration_version: number;
    version: number;
    state: string;
};
type Command = 'CREATE' | 'CANCEL' | 'RESCHEDULE' | 'ATTEND' | 'CORRECT';
export class BookingError extends Error {
    constructor(public readonly code: 'BOOKING_INVALID' | 'BOOKING_UNAUTHENTICATED' | 'BOOKING_NOT_FOUND' | 'BOOKING_CONFLICT' | 'BOOKING_UNAVAILABLE') { super(code); }
}
function fail(code: BookingError['code']): never { throw new BookingError(code); }
export function bookingInput(command: Command, input: unknown) {
    try {
        const fields = command === 'CREATE' ? ['slotId', 'operationKey'] : command === 'RESCHEDULE' ? ['bookingId', 'slotId', 'operationKey', 'expectedVersion'] : command === 'ATTEND' ? ['bookingId', 'observation', 'operationKey', 'expectedVersion'] : command === 'CORRECT' ? ['bookingId', 'observation', 'reason', 'operationKey', 'expectedVersion'] : ['bookingId', 'operationKey', 'expectedVersion'];
        availabilityExact(input, fields);
        const out: Record<string, string | number> = { operationKey: availabilityId(input.operationKey) };
        if (command !== 'CREATE') {
            out.bookingId = availabilityId(input.bookingId);
            out.expectedVersion = availabilityInteger(input.expectedVersion, 1, 2147483646);
        }
        if (command === 'CREATE' || command === 'RESCHEDULE')
            out.slotId = availabilityId(input.slotId);
        if (command === 'ATTEND' || command === 'CORRECT') {
            if (input.observation !== 'ATTENDED' && input.observation !== 'NO_SHOW')
                fail('BOOKING_INVALID');
            out.observation = input.observation as string;
        }
        if (command === 'CORRECT') {
            const reason = input.reason;
            if (typeof reason !== 'string' || [...reason].length < 1 || [...reason].length > 1000 || !reason.trim() || [...reason].some(c => { const n = c.codePointAt(0)!; return n < 32 || (n >= 127 && n <= 159) || (n >= 55296 && n <= 57343); }))
                fail('BOOKING_INVALID');
            out.reason = reason as string;
        }
        return out;
    }
    catch (e) {
        if (e instanceof BookingError)
            throw e;
        return fail('BOOKING_INVALID');
    }
}
const instant = (sql: string) => `to_char(${sql} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const projection = `jsonb_build_object('id',b.id,'slotId',b.slot_id,'providerId',p.public_id,'clinicId',c.public_id,'patientDisplayName',pp.display_name,'startAt',${instant('b.start_at')},'endAt',${instant('b.end_at')},'timeZone',b.time_zone,'state',b.state,'version',b.version,'createdAt',${instant('b.created_at')},'predecessorId',b.predecessor_id,'successorId',(SELECT x.id FROM public.bookings x WHERE x.predecessor_id=b.id),'attendance',coalesce((SELECT a.observation FROM public.booking_attendance a WHERE a.booking_id=b.id ORDER BY version DESC LIMIT 1),'UNKNOWN'),'transitions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'command',e.command,'fromState',e.from_state,'toState',e.to_state,'recordedAt',${instant('e.recorded_at')}) ORDER BY e.version) FROM public.booking_events e WHERE e.booking_id=b.id),'[]'::jsonb),'attendanceHistory',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'observation',a.observation,'supersedesId',a.supersedes_id,'reason',a.reason,'recordedAt',${instant('a.recorded_at')}) ORDER BY a.version) FROM public.booking_attendance a WHERE a.booking_id=b.id),'[]'::jsonb))`;
const joins = `FROM public.bookings b JOIN public.availability_slots s ON s.id=b.slot_id JOIN public.clinician_directory p ON p.id=s.provider_id JOIN public.clinic_directory c ON c.organization_id=b.organization_id JOIN public.patient_profiles pp ON pp.id=b.patient_id AND pp.user_id=b.patient_user_id`;
/** Logistics only. Never reads or writes an assignment/clinical source. */
export function createBookingPersistence(connectionString: string | undefined) {
    if (!connectionString)
        fail('BOOKING_UNAVAILABLE');
    const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, lock_timeout: 5000, statement_timeout: 10000 });
    pool.on('error', () => { });
    function actor(value: AuthPrincipal): Actor { try {
        const d = Object.getOwnPropertyDescriptors(value);
        if (['userId', 'sessionId', 'role'].some(k => !d[k]?.enumerable || !('value' in d[k])))
            fail('BOOKING_UNAUTHENTICATED');
        const role = d.role.value;
        if (typeof role !== 'string')
            fail('BOOKING_UNAUTHENTICATED');
        return { userId: availabilityId(d.userId.value), sessionId: availabilityId(d.sessionId.value), role };
    }
    catch {
        return fail('BOOKING_UNAUTHENTICATED');
    } }
    async function current(tx: Tx, a: Actor) { const r = await tx.query("SELECT u.role FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=$1 AND u.status='ACTIVE' AND u.role=$3 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()", [a.userId, a.sessionId, a.role]); if (!r.rowCount)
        fail('BOOKING_UNAUTHENTICATED'); }
    async function transaction<T>(a: Actor, users: string[], action: (tx: Tx) => Promise<T>) {
        let tx: Tx | undefined;
        try {
            tx = await pool.connect();
            await tx.query('BEGIN');
            await tx.query("SET LOCAL transaction_timeout='30s'");
            await tx.query("SET LOCAL lock_timeout='5s'");
            await tx.query("SET LOCAL statement_timeout='10s'");
            if (['PATIENT', 'CLINICIAN'].includes(a.role))
                await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
            for (const user of [...new Set([a.userId, ...users])].sort())
                await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [user]);
            await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]);
            await current(tx, a);
            if (!['PATIENT', 'CLINICIAN'].includes(a.role))
                fail('BOOKING_NOT_FOUND');
            const result = await action(tx);
            await current(tx, a);
            await tx.query('COMMIT');
            return result;
        }
        catch (e) {
            if (tx)
                await tx.query('ROLLBACK').catch(() => { });
            if (e instanceof BookingError)
                throw e;
            if (e && typeof e === 'object' && 'code' in e && ['23P01', '23505'].includes(String(e.code)))
                return fail('BOOKING_CONFLICT');
            return fail('BOOKING_UNAVAILABLE');
        }
        finally {
            tx?.release();
        }
    }
    async function profiles(tx: Tx, a: Actor, clinicianUser?: string, patientUser?: string) { let cp, pp; if (clinicianUser)
        cp = (await tx.query("SELECT id,user_id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE", [clinicianUser])).rows[0]; if (patientUser)
        pp = (await tx.query("SELECT id,user_id FROM public.patient_profiles WHERE user_id=$1 AND user_role='PATIENT' FOR SHARE", [patientUser])).rows[0]; if ((clinicianUser && !cp) || (patientUser && !pp))
        fail('BOOKING_NOT_FOUND'); await current(tx, a); return { cp, pp }; }
    async function slot(tx: pg.Pool | Tx, id: string): Promise<Row | undefined> { return (await tx.query<Row>('SELECT s.*,p.specialty_id FROM public.availability_slots s JOIN public.clinician_directory p ON p.id=s.provider_id WHERE s.id=$1', [id])).rows[0]; }
    async function get(tx: pg.Pool | Tx, id: string): Promise<Row | undefined> { return (await tx.query<Row>('SELECT * FROM public.bookings WHERE id=$1', [id])).rows[0]; }
    async function directoryLocks(tx: Tx, slots: Row[]) {
        const stages = [['specialties', 'specialty_id', 'id'], ['organizations', 'organization_id', 'id'], ['clinic_directory', 'organization_id', 'organization_id'], ['organization_memberships', 'membership_id', 'id'], ['clinician_directory', 'provider_id', 'id'], ['directory_affiliations', 'affiliation_id', 'id']] as const;
        for (const [table, key, column] of stages)
            for (const value of [...new Set(slots.map(s => s[key] as string))].sort())
                await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`, [value]);
        const configs = new Map<string, {
            version: number;
            minimum_booking_lead: number;
            publication_horizon_days: number;
        }>();
        for (const org of [...new Set(slots.map(s => s.organization_id))].sort()) {
            const c = (await tx.query('SELECT * FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE', [org])).rows[0];
            if (c)
                configs.set(org, c);
        }
        return configs;
    }
    async function eligible(tx: Tx, s: Row) { const r = await tx.query(`SELECT s.id FROM public.availability_slots s JOIN public.clinician_profiles cp ON cp.id=s.clinician_id AND cp.user_id=s.clinician_user_id JOIN public.users u ON u.id=cp.user_id AND u.role='CLINICIAN' AND u.status='ACTIVE' JOIN public.clinician_directory p ON p.id=s.provider_id AND p.clinician_id=cp.id AND p.clinician_user_id=u.id AND p.is_published JOIN public.specialties sp ON sp.id=p.specialty_id AND sp.is_published JOIN public.directory_affiliations a ON a.id=s.affiliation_id AND a.provider_id=p.id AND a.clinician_user_id=u.id AND a.membership_id=s.membership_id AND a.organization_id=s.organization_id AND a.specialty_id=sp.id AND a.withdrawn_at IS NULL JOIN public.organization_memberships m ON m.id=a.membership_id AND m.user_id=u.id AND m.organization_id=s.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE' JOIN public.clinic_directory c ON c.organization_id=o.id AND c.is_published WHERE s.id=$1`, [s.id]); if (!r.rowCount)
        fail('BOOKING_NOT_FOUND'); }
    async function fresh(tx: Tx, s: Row, config: {
        minimum_booking_lead: number;
        publication_horizon_days: number;
    } | undefined, patientUser: string) { if (!config)
        fail('BOOKING_NOT_FOUND'); const r = await tx.query("SELECT s.state='PUBLISHED' AND s.start_at-$2::integer*interval '1 minute'>clock_timestamp() AND s.end_at<=clock_timestamp()+$3::integer*interval '24 hours' AND EXISTS(SELECT 1 FROM public.users WHERE id=$4 AND status='ACTIVE' AND role='PATIENT') ok FROM public.availability_slots s WHERE s.id=$1", [s.id, config.minimum_booking_lead, config.publication_horizon_days, patientUser]); if (!r.rows[0]?.ok)
        fail('BOOKING_CONFLICT'); }
    async function project(tx: Tx, id: string): Promise<Record<string, unknown>> { return (await tx.query(`SELECT ${projection} value ${joins} WHERE b.id=$1`, [id])).rows[0].value; }
    async function event(tx: Tx, a: Actor, command: Command, key: string, b: Row, from: string | null) { await tx.query('INSERT INTO public.booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7)', [b.id, b.version, command, from, b.state, a.userId, key]); }
    async function audit(tx: Tx, a: Actor, command: Command, id: string) { await tx.query("INSERT INTO public.audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,'booking',$3,'{}',clock_timestamp())", [a.userId, `BOOKING_${command}`, id]); }
    async function execute(principal: AuthPrincipal, command: Command, value: unknown) {
        const input = bookingInput(command, value), a = actor(principal), key = input.operationKey as string, fp = createHash('sha256').update(JSON.stringify(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)))).digest('hex');
        let old: Row | undefined, target: Row | undefined;
        try {
            if (command !== 'CREATE')
                old = await get(pool, input.bookingId as string);
            target = await slot(pool, (command === 'CREATE' || command === 'RESCHEDULE' ? input.slotId : old?.slot_id) as string);
        }
        catch {
            return fail('BOOKING_UNAVAILABLE');
        }
        return transaction(a, [old?.patient_user_id, old?.clinician_user_id, target?.clinician_user_id].filter((s): s is string => !!s), async (tx) => {
            if (command === 'CREATE' && a.role !== 'PATIENT')
                fail('BOOKING_NOT_FOUND');
            if (command !== 'CREATE' && (!old || !(a.role === 'PATIENT' ? old.patient_user_id === a.userId : old.clinician_user_id === a.userId)))
                fail('BOOKING_NOT_FOUND');
            if ((command === 'ATTEND' || command === 'CORRECT') && a.role !== 'CLINICIAN')
                fail('BOOKING_NOT_FOUND');
            if (!target)
                fail('BOOKING_NOT_FOUND');
            const identities = await profiles(tx, a, old?.clinician_user_id ?? target.clinician_user_id, old?.patient_user_id ?? a.userId);
            const patientUser = old?.patient_user_id ?? a.userId;
            if (old && (old.patient_id !== identities.pp.id || old.clinician_id !== identities.cp.id))
                fail('BOOKING_NOT_FOUND');
            const source = old ? await slot(tx, old.slot_id) : target;
            if (!source)
                fail('BOOKING_NOT_FOUND');
            const scopes = [source, target];
            const configs = await directoryLocks(tx, scopes);
            if (a.role === 'CLINICIAN')
                await eligible(tx, source);
            if (target.clinician_id !== identities.cp.id || target.clinician_user_id !== identities.cp.user_id || (old && target.organization_id !== old.organization_id))
                fail('BOOKING_CONFLICT');
            if (command === 'CREATE' || command === 'RESCHEDULE')
                await eligible(tx, target);
            await current(tx, a);
            // Fixed kind order: patient EH2P, then clinician EH2C shared with publication.
            await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))', [identities.pp.id]);
            await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))', [identities.cp.id]);
            for (const id of [...new Set(scopes.map(s => s.id))].sort())
                await tx.query('SELECT id FROM public.availability_slots WHERE id=$1 FOR UPDATE', [id]);
            if (old)
                await tx.query('SELECT id FROM public.bookings WHERE id=$1 FOR UPDATE', [old.id]);
            await current(tx, a);
            if (a.role === 'CLINICIAN')
                await eligible(tx, source);
            if (command === 'CREATE' || command === 'RESCHEDULE')
                await eligible(tx, target);
            const prior = (await tx.query('SELECT fingerprint,result FROM public.booking_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3', [a.userId, command, key])).rows[0];
            if (prior) {
                if (prior.fingerprint !== fp)
                    fail('BOOKING_CONFLICT');
                return prior.result as Record<string, unknown>;
            }
            if (old) {
                old = await get(tx, old.id);
                if (!old || old.version !== input.expectedVersion)
                    fail('BOOKING_CONFLICT');
            }
            if (command === 'CREATE' || command === 'RESCHEDULE')
                await fresh(tx, target, configs.get(target.organization_id), patientUser);
            let result!: Row;
            if (command === 'CREATE' || command === 'RESCHEDULE') {
                if (old) {
                    if (old.state !== 'BOOKED' || target.id === old.slot_id || (await tx.query('SELECT clock_timestamp()<$1::timestamptz ok', [old.start_at])).rows[0].ok !== true)
                        fail('BOOKING_CONFLICT');
                    const updated = (await tx.query<Row>("UPDATE public.bookings SET state='RESCHEDULED',version=version+1 WHERE id=$1 RETURNING *", [old.id])).rows[0];
                    await event(tx, a, command, key, updated, 'BOOKED');
                }
                result = (await tx.query<Row>(`INSERT INTO public.bookings(patient_id,patient_user_id,clinician_id,clinician_user_id,organization_id,slot_id,start_at,end_at,time_zone,slot_configuration_version,admission_configuration_version,created_by_user_id,predecessor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [identities.pp.id, patientUser, target.clinician_id, target.clinician_user_id, target.organization_id, target.id, target.start_at, target.end_at, target.time_zone, target.configuration_version, configs.get(target.organization_id)!.version, a.userId, old?.id ?? null])).rows[0];
                await event(tx, a, command, key, result, null);
            }
            else {
                const booking = old!;
                let state = booking.state;
                if (command === 'CANCEL') {
                    if (state !== 'BOOKED' || !(await tx.query('SELECT clock_timestamp()<$1::timestamptz ok', [booking.start_at])).rows[0].ok)
                        fail('BOOKING_CONFLICT');
                    state = 'CANCELLED';
                }
                else {
                    const attendance = (await tx.query('SELECT * FROM public.booking_attendance WHERE booking_id=$1 ORDER BY version DESC LIMIT 1', [booking.id])).rows[0];
                    if ((command === 'ATTEND' && (state !== 'BOOKED' || attendance)) || (command === 'CORRECT' && (!attendance || !['BOOKED', 'NO_SHOW'].includes(state))))
                        fail('BOOKING_CONFLICT');
                    if (!(await tx.query('SELECT clock_timestamp()>=$1::timestamptz ok', [input.observation === 'ATTENDED' ? booking.start_at : booking.end_at])).rows[0].ok)
                        fail('BOOKING_CONFLICT');
                    if (input.observation === 'NO_SHOW')
                        state = 'NO_SHOW';
                    result = (await tx.query<Row>('UPDATE public.bookings SET state=$2,version=version+1 WHERE id=$1 RETURNING *', [booking.id, state])).rows[0];
                    await event(tx, a, command, key, result, booking.state);
                    await tx.query('INSERT INTO public.booking_attendance(booking_id,version,observation,supersedes_id,reason,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)', [booking.id, result.version, input.observation, attendance?.id ?? null, input.reason ?? null, a.userId]);
                }
                if (command === 'CANCEL') {
                    result = (await tx.query<Row>('UPDATE public.bookings SET state=$2,version=version+1 WHERE id=$1 RETURNING *', [booking.id, state])).rows[0];
                    await event(tx, a, command, key, result, booking.state);
                }
            }
            const output = await project(tx, result!.id);
            await tx.query('INSERT INTO public.booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,$2,$3,$4,$5,$6)', [a.userId, command, key, fp, result!.id, JSON.stringify(output)]);
            await audit(tx, a, command, result!.id);
            if (command === 'CREATE' || command === 'RESCHEDULE')
                await fresh(tx, target, configs.get(target.organization_id), patientUser);
            if ((command === 'CANCEL' || command === 'RESCHEDULE') && old && !(await tx.query('SELECT clock_timestamp()<$1::timestamptz ok', [old.start_at])).rows[0].ok)
                fail('BOOKING_CONFLICT');
            return output;
        });
    }
    async function read(principal: AuthPrincipal, input: unknown, schedule: boolean, id?: string) {
        const a = actor(principal);
        let page;
        try {
            page = availabilityPage(input);
            if (id)
                availabilityId(id);
        }
        catch {
            return fail('BOOKING_INVALID');
        }
        return transaction(a, [], async (tx) => {
            if (id) {
                const b = await get(tx, id);
                if (!b || !(a.role === 'PATIENT' ? b.patient_user_id === a.userId : b.clinician_user_id === a.userId))
                    fail('BOOKING_NOT_FOUND');
                await profiles(tx, a, a.role === 'CLINICIAN' ? a.userId : undefined, a.role === 'PATIENT' ? a.userId : undefined);
                return { data: await project(tx, id) };
            }
            if (a.role !== (schedule ? 'CLINICIAN' : 'PATIENT'))
                fail('BOOKING_NOT_FOUND');
            await profiles(tx, a, schedule ? a.userId : undefined, schedule ? undefined : a.userId);
            return (await tx.query(`WITH projected AS(SELECT b.start_at,b.id,${projection} value ${joins} WHERE b.${schedule ? 'clinician_user_id' : 'patient_user_id'}=$1),selected AS(SELECT * FROM projected ORDER BY start_at DESC,id ASC LIMIT $2 OFFSET $3) SELECT jsonb_build_object('data',coalesce((SELECT jsonb_agg(value ORDER BY start_at DESC,id ASC) FROM selected),'[]'::jsonb),'meta',jsonb_build_object('page',$4::int,'pageSize',$2::int,'total',(SELECT count(*)::int FROM projected))) result`, [a.userId, page.pageSize, (page.page - 1) * page.pageSize, page.page])).rows[0].result;
        });
    }
    return { create: (a: AuthPrincipal, v: unknown) => execute(a, 'CREATE', v), cancel: (a: AuthPrincipal, v: unknown) => execute(a, 'CANCEL', v), reschedule: (a: AuthPrincipal, v: unknown) => execute(a, 'RESCHEDULE', v), attend: (a: AuthPrincipal, v: unknown) => execute(a, 'ATTEND', v), correct: (a: AuthPrincipal, v: unknown) => execute(a, 'CORRECT', v), history: (a: AuthPrincipal, v: unknown = {}) => read(a, v, false), schedule: (a: AuthPrincipal, v: unknown = {}) => read(a, v, true), detail: (a: AuthPrincipal, id: string) => read(a, {}, false, id), close: () => pool.end() };
}
export type BookingPersistence = ReturnType<typeof createBookingPersistence>;
