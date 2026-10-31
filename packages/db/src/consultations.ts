import pg from 'pg';
import { createHash } from 'node:crypto';
import type { AuthPrincipal } from './auth.js';
import { availabilityExact, availabilityId, availabilityInteger } from './availability-values.js';
import { BookingError } from './bookings.js';

const fail = (code: BookingError['code']): never => { throw new BookingError(code); };
export function consultationInput(value: unknown) {
  try {
    availabilityExact(value, ['bookingId', 'operationKey']);
    return { bookingId: availabilityId(value.bookingId), operationKey: availabilityId(value.operationKey) };
  } catch { return fail('BOOKING_INVALID'); }
}
export function consultationCloseInput(value: unknown) {
  try {
    availabilityExact(value, ['consultationId', 'operationKey', 'expectedVersion']);
    return { consultationId: availabilityId(value.consultationId), operationKey: availabilityId(value.operationKey), expectedVersion: availabilityInteger(value.expectedVersion, 1, 2147483646) };
  } catch { return fail('BOOKING_INVALID'); }
}
type Actor = { userId: string; sessionId: string; role: string };
type Scope = {
  id: string; patient_id: string; patient_user_id: string; clinician_id: string; clinician_user_id: string;
  organization_id: string; slot_id: string; provider_id: string; membership_id: string; affiliation_id: string;
  specialty_id: string; start_at: Date; end_at: Date; time_zone: string;
};
/** Booking-backed opening only. No assignment writer or nested legacy clinical service. */
export function createConsultationPersistence(connectionString: string | undefined) {
  if (!connectionString) fail('BOOKING_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, lock_timeout: 5000, statement_timeout: 10000 });
  pool.on('error', () => {});
  function actor(value: AuthPrincipal): Actor {
    try {
      const d = Object.getOwnPropertyDescriptors(value);
      if (['userId', 'sessionId', 'role'].some(k => !d[k]?.enumerable || !('value' in d[k])) || typeof d.role.value !== 'string') fail('BOOKING_UNAUTHENTICATED');
      return { userId: availabilityId(d.userId.value), sessionId: availabilityId(d.sessionId.value), role: d.role.value as string };
    } catch { return fail('BOOKING_UNAUTHENTICATED'); }
  }
  async function current(tx: pg.PoolClient, a: Actor) {
    if (!(await tx.query(`SELECT u.id FROM public.users u JOIN public.sessions s ON s.user_id=u.id
      WHERE u.id=$1 AND u.status='ACTIVE' AND u.role=$3 AND s.id=$2 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()`, [a.userId, a.sessionId, a.role])).rowCount) fail('BOOKING_UNAUTHENTICATED');
  }
  async function authority(tx: pg.PoolClient, a: Actor, scope: Scope, assignment: string) {
    await current(tx, a);
    // Ongoing clinical scope does not require public discoverability. Exact retained
    // provider/clinic/affiliation/membership identities still must be current.
    const r = await tx.query(`SELECT b.id FROM public.bookings b
      JOIN public.patient_profiles pp ON pp.id=b.patient_id AND pp.user_id=b.patient_user_id AND pp.user_role='PATIENT'
      JOIN public.users pu ON pu.id=pp.user_id AND pu.role='PATIENT' AND pu.status='ACTIVE'
      JOIN public.clinician_profiles cp ON cp.id=b.clinician_id AND cp.user_id=b.clinician_user_id AND cp.user_role='CLINICIAN'
      JOIN public.users cu ON cu.id=cp.user_id AND cu.role='CLINICIAN' AND cu.status='ACTIVE'
      JOIN public.clinician_patient_assignments grant_ ON grant_.id=$2 AND grant_.clinician_id=cp.id AND grant_.patient_id=pp.id AND grant_.status='ACTIVE' AND grant_.ended_at IS NULL
      JOIN public.availability_slots s ON s.id=b.slot_id AND s.clinician_id=cp.id AND s.organization_id=b.organization_id
      JOIN public.clinician_directory p ON p.id=s.provider_id AND p.clinician_id=cp.id AND p.clinician_user_id=cu.id
      JOIN public.specialties sp ON sp.id=p.specialty_id
      JOIN public.directory_affiliations af ON af.id=s.affiliation_id AND af.provider_id=p.id AND af.specialty_id=sp.id AND af.membership_id=s.membership_id AND af.organization_id=b.organization_id AND af.clinician_user_id=cu.id AND af.withdrawn_at IS NULL
      JOIN public.organization_memberships m ON m.id=af.membership_id AND m.user_id=cu.id AND m.organization_id=b.organization_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
      JOIN public.organizations o ON o.id=m.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
      JOIN public.clinic_directory cd ON cd.organization_id=o.id
      WHERE b.id=$1 AND b.clinician_user_id=$3`, [scope.id, assignment, a.userId]);
    if (!r.rowCount) fail('BOOKING_NOT_FOUND');
  }
  async function open(principal: AuthPrincipal, value: unknown) {
    const input = consultationInput(value), a = actor(principal);
    const fingerprint = createHash('sha256').update(JSON.stringify({ bookingId: input.bookingId })).digest('hex');
    let tx: pg.PoolClient | undefined;
    try {
      // Immutable scope lookup only; no authority retained from this statement.
      const scope = (await pool.query<Scope>(`SELECT b.*,s.provider_id,s.membership_id,s.affiliation_id,p.specialty_id
        FROM public.bookings b JOIN public.availability_slots s ON s.id=b.slot_id JOIN public.clinician_directory p ON p.id=s.provider_id WHERE b.id=$1`, [input.bookingId])).rows[0];
      tx = await pool.connect();
      await tx.query('BEGIN');
      await tx.query("SET LOCAL transaction_timeout='30s'");
      await tx.query("SET LOCAL lock_timeout='5s'");
      await tx.query("SET LOCAL statement_timeout='10s'");
      if (a.role === 'CLINICIAN') await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
      for (const id of [...new Set([a.userId, ...(scope ? [scope.patient_user_id, scope.clinician_user_id] : [])])].sort()) await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [id]);
      await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]);
      await current(tx, a);
      if (a.role !== 'CLINICIAN' || !scope || scope.clinician_user_id !== a.userId) fail('BOOKING_NOT_FOUND');
      const cp = (await tx.query("SELECT id FROM public.clinician_profiles WHERE id=$1 AND user_id=$2 AND user_role='CLINICIAN' FOR SHARE", [scope.clinician_id, a.userId])).rows[0];
      if (!cp) fail('BOOKING_NOT_FOUND');
      const grant = (await tx.query("SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL FOR SHARE", [cp.id, scope.patient_id])).rows[0];
      if (!grant) fail('BOOKING_NOT_FOUND');
      if (!(await tx.query("SELECT id FROM public.patient_profiles WHERE id=$1 AND user_id=$2 AND user_role='PATIENT' FOR SHARE", [scope.patient_id, scope.patient_user_id])).rowCount) fail('BOOKING_NOT_FOUND');
      const stages = [['specialties', 'id', scope.specialty_id], ['organizations', 'id', scope.organization_id], ['clinic_directory', 'organization_id', scope.organization_id], ['organization_memberships', 'id', scope.membership_id], ['clinician_directory', 'id', scope.provider_id], ['directory_affiliations', 'id', scope.affiliation_id]];
      for (const [table, column, id] of stages) await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`, [id]);
      if (!(await tx.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE', [scope.organization_id])).rowCount) fail('BOOKING_NOT_FOUND');
      await authority(tx, a, scope, grant.id);
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))', [scope.patient_id]);
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))', [scope.clinician_id]);
      await tx.query('SELECT id FROM public.availability_slots WHERE id=$1 FOR UPDATE', [scope.slot_id]);
      const b = (await tx.query('SELECT * FROM public.bookings WHERE id=$1 FOR UPDATE', [scope.id])).rows[0];
      await tx.query('SELECT id FROM public.consultations WHERE booking_id=$1 FOR SHARE', [scope.id]);
      await authority(tx, a, scope, grant.id);
      const prior = (await tx.query("SELECT fingerprint,result FROM public.booking_operations WHERE actor_user_id=$1 AND command='OPEN' AND operation_key=$2", [a.userId, input.operationKey])).rows[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail('BOOKING_CONFLICT');
        await authority(tx, a, scope, grant.id);
        await tx.query('COMMIT');
        return prior.result as Record<string, unknown>;
      }
      const attendance = (await tx.query('SELECT * FROM public.booking_attendance WHERE booking_id=$1 ORDER BY version DESC LIMIT 1', [scope.id])).rows[0];
      if (b.state !== 'BOOKED' || attendance?.observation === 'NO_SHOW' || !(await tx.query('SELECT clock_timestamp()>=$1::timestamptz ok', [b.start_at])).rows[0].ok) fail('BOOKING_CONFLICT');
      // Final authority and DB clock are checked after all relevant waits.
      await authority(tx, a, scope, grant.id);
      const updated = (await tx.query("UPDATE public.bookings SET state='IN_CONSULTATION',version=version+1 WHERE id=$1 AND state='BOOKED' AND start_at<=clock_timestamp() RETURNING version", [scope.id])).rows[0];
      if (!updated) fail('BOOKING_CONFLICT');
      await tx.query("INSERT INTO public.booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,$2,'OPEN','BOOKED','IN_CONSULTATION',$3,$4)", [scope.id, updated.version, a.userId, input.operationKey]);
      if (!attendance) await tx.query("INSERT INTO public.booking_attendance(booking_id,version,observation,actor_user_id) VALUES($1,$2,'ATTENDED',$3)", [scope.id, updated.version, a.userId]);
      const encounter = (await tx.query("INSERT INTO public.clinical_encounters(patient_id,occurred_at,purpose,recorded_by_user_id) VALUES($1,clock_timestamp(),'GENERAL_CONSULTATION',$2) RETURNING id", [scope.patient_id, a.userId])).rows[0];
      const consultation = (await tx.query(`INSERT INTO public.consultations(encounter_id,booking_id,patient_id,patient_user_id,booked_clinician_id,booked_clinician_user_id,treating_clinician_id,treating_clinician_user_id,opened_by_user_id,organization_id,slot_id,provider_id,membership_id,affiliation_id,assignment_id,scheduled_start_at,scheduled_end_at,time_zone,operation_key)
        VALUES($1,$2,$3,$4,$5,$6,$5,$6,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id,to_char(opened_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') opened_at`, [encounter.id, scope.id, scope.patient_id, scope.patient_user_id, scope.clinician_id, a.userId, scope.organization_id, scope.slot_id, scope.provider_id, scope.membership_id, scope.affiliation_id, grant.id, b.start_at, b.end_at, b.time_zone, input.operationKey])).rows[0];
      const locators = (await tx.query('SELECT p.public_id provider,c.public_id clinic FROM public.clinician_directory p JOIN public.clinic_directory c ON c.organization_id=$2 WHERE p.id=$1', [scope.provider_id, scope.organization_id])).rows[0];
      const result = { id: consultation.id, encounterId: encounter.id, bookingId: scope.id, state: 'OPEN', bookingState: 'IN_CONSULTATION', openedAt: consultation.opened_at, providerId: locators.provider, clinicId: locators.clinic };
      await tx.query("INSERT INTO public.booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,'OPEN',$2,$3,$4,$5)", [a.userId, input.operationKey, fingerprint, scope.id, JSON.stringify(result)]);
      await tx.query("INSERT INTO public.audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,'CONSULTATION_OPENED','consultation',$2,'{}',clock_timestamp())", [a.userId, consultation.id]);
      await authority(tx, a, scope, grant.id);
      await tx.query('COMMIT');
      return result;
    } catch (e) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (e instanceof BookingError) throw e;
      if (e && typeof e === 'object' && 'code' in e && ['23P01', '23505'].includes(String(e.code))) fail('BOOKING_CONFLICT');
      return fail('BOOKING_UNAVAILABLE');
    } finally { tx?.release(); }
  }
  async function closeConsultation(principal: AuthPrincipal, value: unknown) {
    const input = consultationCloseInput(value), a = actor(principal);
    const fingerprint = createHash('sha256').update(JSON.stringify({ consultationId: input.consultationId, expectedVersion: input.expectedVersion })).digest('hex');
    let tx: pg.PoolClient | undefined;
    try {
      // Immutable scope hints only. The same clinical prefix as opening is held
      // before locking booking -> consultation and rechecking current authority.
      const s = (await pool.query<Scope>(`SELECT b.*,sl.provider_id,sl.membership_id,sl.affiliation_id,p.specialty_id
        FROM public.consultations c JOIN public.bookings b ON b.id=c.booking_id
        JOIN public.availability_slots sl ON sl.id=b.slot_id JOIN public.clinician_directory p ON p.id=sl.provider_id WHERE c.id=$1`, [input.consultationId])).rows[0];
      tx = await pool.connect(); await tx.query('BEGIN');
      await tx.query("SET LOCAL transaction_timeout='30s'"); await tx.query("SET LOCAL lock_timeout='5s'"); await tx.query("SET LOCAL statement_timeout='10s'");
      if (a.role === 'CLINICIAN') await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
      for (const id of [...new Set([a.userId, ...(s ? [s.patient_user_id, s.clinician_user_id] : [])])].sort()) await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [id]);
      await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]); await current(tx, a);
      if (a.role !== 'CLINICIAN' || !s || s.clinician_user_id !== a.userId) fail('BOOKING_NOT_FOUND');
      if (!(await tx.query("SELECT id FROM public.clinician_profiles WHERE id=$1 AND user_id=$2 AND user_role='CLINICIAN' FOR SHARE", [s.clinician_id, a.userId])).rowCount) fail('BOOKING_NOT_FOUND');
      const grant = (await tx.query("SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL FOR SHARE", [s.clinician_id, s.patient_id])).rows[0];
      if (!grant) fail('BOOKING_NOT_FOUND');
      if (!(await tx.query("SELECT id FROM public.patient_profiles WHERE id=$1 AND user_id=$2 AND user_role='PATIENT' FOR SHARE", [s.patient_id, s.patient_user_id])).rowCount) fail('BOOKING_NOT_FOUND');
      const stages = [['specialties','id',s.specialty_id],['organizations','id',s.organization_id],['clinic_directory','organization_id',s.organization_id],['organization_memberships','id',s.membership_id],['clinician_directory','id',s.provider_id],['directory_affiliations','id',s.affiliation_id]];
      for (const [table,column,id] of stages) await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`, [id]);
      if (!(await tx.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE', [s.organization_id])).rowCount) fail('BOOKING_NOT_FOUND');
      await authority(tx, a, s, grant.id);
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))', [s.patient_id]);
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))', [s.clinician_id]);
      await tx.query('SELECT id FROM public.availability_slots WHERE id=$1 FOR UPDATE', [s.slot_id]);
      const booking = (await tx.query('SELECT * FROM public.bookings WHERE id=$1 FOR UPDATE', [s.id])).rows[0];
      const c = (await tx.query('SELECT * FROM public.consultations WHERE id=$1 FOR UPDATE', [input.consultationId])).rows[0];
      if (!c || c.booking_id !== s.id || c.patient_id !== s.patient_id || c.booked_clinician_user_id !== a.userId || c.treating_clinician_user_id !== a.userId) fail('BOOKING_NOT_FOUND');
      await tx.query('SELECT id FROM public.clinical_encounters WHERE id=$1 FOR SHARE', [c.encounter_id]);
      await authority(tx, a, s, grant.id);
      const prior = (await tx.query("SELECT fingerprint,result FROM public.booking_operations WHERE actor_user_id=$1 AND command='CLOSE' AND operation_key=$2", [a.userId, input.operationKey])).rows[0];
      if (prior) {
        if (prior.fingerprint !== fingerprint) fail('BOOKING_CONFLICT');
        await authority(tx, a, s, grant.id); await tx.query('COMMIT');
        return prior.result as Record<string, unknown>;
      }
      if (c.state !== 'OPEN' || c.version !== input.expectedVersion || booking.state !== 'IN_CONSULTATION') fail('BOOKING_CONFLICT');
      await authority(tx, a, s, grant.id);
      const updated = (await tx.query("UPDATE public.bookings SET state='CONSULTED',version=version+1 WHERE id=$1 AND state='IN_CONSULTATION' RETURNING version", [s.id])).rows[0];
      if (!updated) fail('BOOKING_CONFLICT');
      await tx.query("INSERT INTO public.booking_events(booking_id,version,command,from_state,to_state,actor_user_id,operation_key) VALUES($1,$2,'CLOSE','IN_CONSULTATION','CONSULTED',$3,$4)", [s.id, updated.version, a.userId, input.operationKey]);
      const closed = (await tx.query(`UPDATE public.consultations SET state='CLOSED',version=2,closed_by_user_id=$2,close_assignment_id=$3,close_command='CLOSE',close_operation_key=$4 WHERE id=$1 AND state='OPEN' AND version=$5 RETURNING to_char(closed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') closed_at`, [c.id, a.userId, grant.id, input.operationKey, input.expectedVersion])).rows[0];
      if (!closed) fail('BOOKING_CONFLICT');
      const locators = (await tx.query('SELECT p.public_id provider,cd.public_id clinic FROM public.clinician_directory p JOIN public.clinic_directory cd ON cd.organization_id=$2 WHERE p.id=$1', [s.provider_id, s.organization_id])).rows[0];
      const result = { id:c.id, encounterId:c.encounter_id, bookingId:s.id, state:'CLOSED', bookingState:'CONSULTED', version:2, closedAt:closed.closed_at, providerId:locators.provider, clinicId:locators.clinic };
      await tx.query("INSERT INTO public.booking_operations(actor_user_id,command,operation_key,fingerprint,booking_id,result) VALUES($1,'CLOSE',$2,$3,$4,$5)", [a.userId, input.operationKey, fingerprint, s.id, JSON.stringify(result)]);
      await tx.query("INSERT INTO public.audit_logs(actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,'CONSULTATION_CLOSED','consultation',$2,'{}',clock_timestamp())", [a.userId, c.id]);
      await authority(tx, a, s, grant.id); await tx.query('COMMIT');
      return result;
    } catch (e) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (e instanceof BookingError) throw e;
      if (e && typeof e === 'object' && 'code' in e && ['23P01','23505'].includes(String(e.code))) fail('BOOKING_CONFLICT');
      return fail('BOOKING_UNAVAILABLE');
    } finally { tx?.release(); }
  }
  return { open, closeConsultation, close: () => pool.end() };
}
export type ConsultationPersistence = ReturnType<typeof createConsultationPersistence>;
