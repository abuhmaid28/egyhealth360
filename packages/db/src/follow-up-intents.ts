import pg from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthPrincipal } from './auth.js';
import { availabilityId } from './availability-values.js';
import { FollowUpIntentError, intentFail, intentInput, intentPage, type IntentCommand } from './follow-up-intent-values.js';
type Actor = { userId: string; sessionId: string; role: string };
type Scope = { id: string; patient_id: string; patient_user_id: string; treating_clinician_id: string; treating_clinician_user_id: string; encounter_id: string; organization_id: string; membership_id: string; provider_id: string; affiliation_id: string; specialty_id: string };
type BookingHint = {id:string;patient_id:string;patient_user_id:string;clinician_id:string;clinician_user_id:string;slot_id:string;specialty_id:string;organization_id:string;membership_id:string;provider_id:string;affiliation_id:string};
const deny = (): never => intentFail('FOLLOW_UP_INTENT_NOT_FOUND');
function principal(value: AuthPrincipal): Actor {
  try { const d = Object.getOwnPropertyDescriptors(value); if (['userId', 'sessionId', 'role'].some(k => !d[k]?.enumerable || !('value' in d[k])) || typeof d.role.value !== 'string' || !['PATIENT','CLINICIAN','ADMIN','LAB_STAFF','PHARMACY_STAFF'].includes(d.role.value)) intentFail('FOLLOW_UP_INTENT_UNAUTHENTICATED'); return { userId: availabilityId(d.userId.value), sessionId: availabilityId(d.sessionId.value), role: d.role.value as string }; }
  catch { return intentFail('FOLLOW_UP_INTENT_UNAUTHENTICATED'); }
}
/** Purpose-built follow-up intents. No legacy service nesting or assignment writer. */
export function createFollowUpIntentPersistence(connectionString: string | undefined) {
  if (!connectionString) intentFail('FOLLOW_UP_INTENT_UNAVAILABLE');
  const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, lock_timeout: 5000, statement_timeout: 10000 });
  pool.on('error', () => {});
  async function current(tx: pg.PoolClient, a: Actor) {
    if (!(await tx.query(`SELECT u.id FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.status='ACTIVE' AND u.role=$3 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()`, [a.userId, a.sessionId, a.role])).rowCount) intentFail('FOLLOW_UP_INTENT_UNAUTHENTICATED');
  }
  async function scope(id: string) { return (await pool.query<Scope>('SELECT c.*,p.specialty_id FROM public.consultations c JOIN public.clinician_directory p ON p.id=c.provider_id WHERE c.id=$1', [id])).rows[0]; }
  async function run<T>(a: Actor, patientId: string | null, source: Scope | undefined, write: boolean, author: boolean, hints: BookingHint[], action: (tx: pg.PoolClient, clinicianId: string | null, final: () => Promise<void>) => Promise<T>) {
    let tx: pg.PoolClient | undefined;
    try {
      const pp = (await pool.query('SELECT id,user_id FROM public.patient_profiles WHERE '+(patientId ? 'id=$1' : 'user_id=$1'), [patientId ?? a.userId])).rows[0];
      tx = await pool.connect(); await tx.query('BEGIN');
      await tx.query("SET LOCAL transaction_timeout='30s'"); await tx.query("SET LOCAL lock_timeout='5s'"); await tx.query("SET LOCAL statement_timeout='10s'");
      if (['CLINICIAN', 'PATIENT'].includes(a.role)) await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
      for (const id of [...new Set([a.userId, ...(pp ? [pp.user_id] : []), ...hints.flatMap(h => [h.patient_user_id,h.clinician_user_id])])].sort()) await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE', [id]);
      await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE', [a.sessionId]); await current(tx, a);
      if (!pp || !['CLINICIAN', 'PATIENT'].includes(a.role) || (write || author) && a.role !== 'CLINICIAN') deny();
      if (source && (source.patient_id !== pp.id || author && source.treating_clinician_user_id !== a.userId)) deny();
      let clinicianId: string | null = null, grantId: string | null = null;
      if (a.role === 'CLINICIAN') {
        for (const userId of [...new Set([a.userId,...hints.map(h=>h.clinician_user_id)])].sort()) await tx.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE",[userId]);
        const cp = (await tx.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE", [a.userId])).rows[0]; if (!cp) deny(); clinicianId = cp.id;
        const grant = (await tx.query("SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL FOR SHARE", [cp.id, pp.id])).rows[0]; if (!grant) deny(); grantId = grant.id;
      } else if (pp.user_id !== a.userId) deny();
      if (!(await tx.query("SELECT id FROM public.patient_profiles WHERE id=$1 AND user_id=$2 AND user_role='PATIENT' FOR SHARE", [pp.id, pp.user_id])).rowCount) deny();
      if (write) {
        if (!source || source.treating_clinician_id !== clinicianId) return deny();
        const scopes = [source,...hints];
        const stages = [['specialties','id','specialty_id'],['organizations','id','organization_id'],['clinic_directory','organization_id','organization_id'],['organization_memberships','id','membership_id'],['clinician_directory','id','provider_id'],['directory_affiliations','id','affiliation_id']] as const;
        for (const [table,column,key] of stages) for (const id of [...new Set(scopes.map(s=>s[key]))].sort()) await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`,[id]);
        for (const org of [...new Set(scopes.map(s=>s.organization_id))].sort()) if (!(await tx.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE',[org])).rowCount) deny();
      }
      const final = async () => {
        await current(tx!, a);
        if (!(await tx!.query("SELECT id FROM public.users WHERE id=$1 AND role='PATIENT' AND status='ACTIVE'", [pp.user_id])).rowCount) deny();
        if (clinicianId && !(await tx!.query("SELECT g.id FROM public.clinician_patient_assignments g JOIN public.clinician_profiles cp ON cp.id=g.clinician_id AND cp.user_id=$4 AND cp.user_role='CLINICIAN' WHERE g.id=$1 AND g.patient_id=$2 AND g.clinician_id=$3 AND g.status='ACTIVE' AND g.ended_at IS NULL", [grantId, pp.id, clinicianId, a.userId])).rowCount) deny();
        if (write && source && !(await tx!.query(`SELECT c.id FROM public.consultations c
          JOIN public.organizations o ON o.id=c.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
          JOIN public.organization_memberships m ON m.id=c.membership_id AND m.organization_id=o.id AND m.user_id=c.treating_clinician_user_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
          JOIN public.clinician_directory p ON p.id=c.provider_id AND p.clinician_id=c.treating_clinician_id AND p.clinician_user_id=c.treating_clinician_user_id
          JOIN public.specialties sp ON sp.id=p.specialty_id
          JOIN public.clinic_directory cd ON cd.organization_id=o.id
          JOIN public.directory_affiliations af ON af.id=c.affiliation_id AND af.provider_id=p.id AND af.organization_id=o.id AND af.membership_id=m.id AND af.clinician_user_id=c.treating_clinician_user_id AND af.specialty_id=p.specialty_id AND af.withdrawn_at IS NULL
          WHERE c.id=$1 AND c.patient_id=$2 AND c.encounter_id=$3 AND c.treating_clinician_user_id=$4`, [source.id, pp.id, source.encounter_id, a.userId])).rowCount) deny();
      };
      await final();
      await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))', [pp.id]);
      for (const id of [...new Set([...(clinicianId ? [clinicianId] : []),...hints.map(h=>h.clinician_id)])].sort()) await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))',[id]);
      for (const id of [...new Set(hints.map(h=>h.slot_id))].sort()) await tx.query('SELECT id FROM public.availability_slots WHERE id=$1 FOR UPDATE',[id]);
      for (const id of [...new Set(hints.map(h=>h.id))].sort()) { const b=(await tx.query('SELECT * FROM public.bookings WHERE id=$1 FOR UPDATE',[id])).rows[0], h=hints.find(h=>h.id===id)!; if (!b || b.patient_id!==pp.id || b.patient_user_id!==h.patient_user_id || b.clinician_id!==h.clinician_id || b.clinician_user_id!==h.clinician_user_id || b.slot_id!==h.slot_id) deny(); }
      if (source) { await tx.query('SELECT id FROM public.consultations WHERE id=$1 FOR SHARE', [source.id]); await tx.query('SELECT id FROM public.clinical_encounters WHERE id=$1 FOR SHARE', [source.encounter_id]); }
      await final(); const result = await action(tx, clinicianId, final); await final(); await tx.query('COMMIT'); return result;
    } catch (e) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (e instanceof FollowUpIntentError) throw e;
      if (e && typeof e === 'object' && 'code' in e && ['23505', '23P01'].includes(String(e.code))) intentFail('FOLLOW_UP_INTENT_CONFLICT');
      return intentFail('FOLLOW_UP_INTENT_UNAVAILABLE');
    } finally { tx?.release(); }
  }
  async function projection(tx: pg.PoolClient, a: Actor, patientId: string, rootId: string | null, consultationId: string | null, released: boolean, page = intentPage({}), versionLimit: number | null = null, linkLimit: number | null = null) {
    // One snapshot: privacy/visibility precede roots/counts/pages. No draft IDs or
    // internal sequence is disclosed to released viewers.
    const result = (await tx.query(`WITH visible AS MATERIALIZED (
      SELECT v.*,r.created_at root_created FROM public.follow_up_intents r JOIN public.follow_up_intent_versions v ON v.root_id=r.id
      WHERE r.patient_id=$1 AND ($2::uuid IS NULL OR r.id=$2) AND ($3::uuid IS NULL OR r.consultation_id=$3)
      AND CASE WHEN $4::boolean THEN v.state='SIGNED_RELEASED' ELSE r.author_user_id=$5 END
      AND ($10::int IS NULL OR v.version<=$10)
      AND NOT EXISTS(SELECT 1 FROM public.follow_up_intent_privacy_restrictions p WHERE p.root_id=r.id)
    ), ranked AS (SELECT v.*,row_number() OVER(PARTITION BY root_id ORDER BY version DESC) rn,count(*) OVER(PARTITION BY root_id) total FROM visible v),
    roots AS (SELECT DISTINCT root_id,root_created FROM visible), selected AS (
      SELECT * FROM roots ORDER BY root_created DESC,root_id ASC LIMIT CASE WHEN $2::uuid IS NULL THEN $6 ELSE 1 END OFFSET CASE WHEN $2::uuid IS NULL THEN $7 ELSE 0 END
    ), entries AS (
      SELECT s.*,jsonb_build_object('id',s.root_id,'consultationId',(SELECT consultation_id FROM visible WHERE root_id=s.root_id LIMIT 1),
        'versions',versions.data,'history',jsonb_build_object('page',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $8 END,'pageSize',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $6 END,'total',versions.total),
        'links',links.data,'linkHistory',jsonb_build_object('page',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $12 END,'pageSize',CASE WHEN $2::uuid IS NULL THEN 1 ELSE $9 END,'total',links.total)) value
      FROM selected s
      CROSS JOIN LATERAL (SELECT max(v.total) total,jsonb_agg((CASE WHEN $4::boolean THEN '{}'::jsonb ELSE jsonb_build_object('version',v.version) END)||jsonb_build_object(
        'id',v.id,'state',v.state,'instruction',v.instruction,'desiredWindow',CASE WHEN v.time_zone IS NULL THEN NULL ELSE jsonb_build_object('startAt',to_char(v.desired_start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'endAt',to_char(v.desired_end_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'timeZone',v.time_zone) END,
        'createdAt',to_char(v.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'signedAt',to_char(v.signed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'releasedAt',to_char(v.released_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'reason',v.reason,'predecessorId',CASE WHEN EXISTS(SELECT 1 FROM visible p WHERE p.id=v.predecessor_id) THEN v.predecessor_id ELSE NULL END,
        'effective',NOT EXISTS(SELECT 1 FROM public.follow_up_intent_versions later WHERE later.root_id=v.root_id AND later.version>v.version)) ORDER BY v.version) data
        FROM ranked v WHERE v.root_id=s.root_id AND v.rn>CASE WHEN $2::uuid IS NULL THEN 0 ELSE $7 END AND v.rn<=CASE WHEN $2::uuid IS NULL THEN 1 ELSE $7+$6 END) versions
      CROSS JOIN LATERAL (WITH available AS MATERIALIZED (
        SELECT l.*,b.state booking_state,row_number() OVER(ORDER BY l.sequence DESC) rn FROM public.follow_up_intent_booking_links l JOIN public.bookings b ON b.id=l.booking_id AND b.patient_id=l.patient_id
        WHERE l.root_id=s.root_id AND ($11::int IS NULL OR l.sequence<=$11)
      ) SELECT (SELECT count(*)::int FROM available) total,coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'bookingId',booking_id,'previousLinkId',predecessor_id,'linkedAt',to_char(recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'bookingState',booking_state) ORDER BY sequence) FROM available WHERE rn>CASE WHEN $2::uuid IS NULL THEN 0 ELSE $13 END AND rn<=CASE WHEN $2::uuid IS NULL THEN 1 ELSE $13+$9 END),'[]'::jsonb) data) links
      WHERE versions.data IS NOT NULL AND ($2::uuid IS NULL OR jsonb_array_length(links.data)>0 OR links.total=0 AND $12=1)
    ) SELECT (SELECT count(*)::int FROM roots) total,coalesce((SELECT jsonb_agg(value ORDER BY root_created DESC,root_id ASC) FROM entries),'[]'::jsonb) data`, [patientId,rootId,consultationId,released,a.userId,page.pageSize,(page.page-1)*page.pageSize,page.page,page.linkPageSize,versionLimit,linkLimit,page.linkPage,(page.linkPage-1)*page.linkPageSize])).rows[0];
    if (rootId) { if (!result.data.length) deny(); return {data:result.data[0]}; }
    return {data:result.data,meta:{page:page.page,pageSize:page.pageSize,total:result.total}};
  }
  async function execute(command: IntentCommand, actor: AuthPrincipal, value: unknown) {
    const input=intentInput(command,value), a=principal(actor), fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    try {
      const s=await scope(input.consultationId), hints: BookingHint[]=[];
      if (input.bookingId) {
        const ids=[input.bookingId];
        if (input.previousLinkId) { const prior=(await pool.query('SELECT booking_id FROM public.follow_up_intent_booking_links WHERE id=$1 AND root_id=$2',[input.previousLinkId,input.intentId])).rows[0]; if(prior) ids.push(prior.booking_id); }
        for(const id of [...new Set(ids)].sort()) {
          const h=(await pool.query<BookingHint>(`SELECT b.*,sl.provider_id,sl.membership_id,sl.affiliation_id,p.specialty_id FROM public.bookings b JOIN public.availability_slots sl ON sl.id=b.slot_id JOIN public.clinician_directory p ON p.id=sl.provider_id WHERE b.id=$1`,[id])).rows[0];
          // A cross-patient hint is never a reason to lock another patient's scope.
          if(h && s && h.patient_id===s.patient_id) hints.push(h);
        }
      }
      return await run(a,s?.patient_id??input.consultationId,s,true,true,hints,async(tx,clinicianId,final)=>{
        if(!s) deny();
        const root=input.intentId ? (await tx.query('SELECT * FROM public.follow_up_intents WHERE id=$1 AND consultation_id=$2 AND author_user_id=$3 FOR UPDATE',[input.intentId,s.id,a.userId])).rows[0]:null;
        if(input.intentId&&!root) deny();
        if(input.bookingId&&!hints.some(h=>h.id===input.bookingId)) deny();
        if(input.previousLinkId&&!(await tx.query('SELECT id FROM public.follow_up_intent_booking_links WHERE id=$1 AND root_id=$2',[input.previousLinkId,root.id])).rowCount) deny();
        if(root) {
          await tx.query('SELECT id FROM public.follow_up_intent_versions WHERE root_id=$1 ORDER BY version FOR SHARE',[root.id]);
          await tx.query('SELECT id FROM public.follow_up_intent_booking_links WHERE root_id=$1 ORDER BY sequence FOR SHARE',[root.id]);
          await tx.query('SELECT id FROM public.follow_up_intent_privacy_restrictions WHERE root_id=$1 ORDER BY id FOR SHARE',[root.id]);
          if(command!=='PRIVACY'&&(await tx.query('SELECT id FROM public.follow_up_intent_privacy_restrictions WHERE root_id=$1',[root.id])).rowCount) deny();
        }
        const prior=(await tx.query('SELECT * FROM public.follow_up_intent_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3 FOR SHARE',[a.userId,command,input.operationKey])).rows[0];
        if(prior) {
          if(command!=='PRIVACY'&&(await tx.query('SELECT id FROM public.follow_up_intent_privacy_restrictions WHERE root_id=$1',[prior.root_id])).rowCount) deny();
          if(prior.fingerprint!==fingerprint) intentFail('FOLLOW_UP_INTENT_CONFLICT');
          await final();
          return {status:200,...(command==='PRIVACY'?{data:{restricted:true}}:await projection(tx,a,s.patient_id,prior.root_id,s.id,false,intentPage({}),prior.version_limit,prior.link_limit))};
        }
        let head=root?(await tx.query('SELECT * FROM public.follow_up_intent_versions WHERE root_id=$1 ORDER BY version DESC LIMIT 1',[root.id])).rows[0]:null;
        let link=root?(await tx.query('SELECT * FROM public.follow_up_intent_booking_links WHERE root_id=$1 ORDER BY sequence DESC LIMIT 1',[root.id])).rows[0]:null;
        if(['RELEASE','CORRECT'].includes(command)&&(head.version!==input.expectedVersion||input.predecessorId!==null&&input.predecessorId!==head.id)) intentFail('FOLLOW_UP_INTENT_CONFLICT');
        if(command==='RELEASE'&&head.state!=='DRAFT'||command==='CORRECT'&&head.state!=='SIGNED_RELEASED') intentFail('FOLLOW_UP_INTENT_CONFLICT');
        if(['LINK','REPLACE'].includes(command)) {
          if(head.state!=='SIGNED_RELEASED'||(link?.sequence??0)!==input.expectedLinkVersion||command==='REPLACE'&&link?.id!==input.previousLinkId) intentFail('FOLLOW_UP_INTENT_CONFLICT');
          const booking=(await tx.query('SELECT state FROM public.bookings WHERE id=$1 AND patient_id=$2',[input.bookingId,s.patient_id])).rows[0]; if(!booking) deny();
          if(booking.state!=='BOOKED'||link?.booking_id===input.bookingId) intentFail('FOLLOW_UP_INTENT_CONFLICT');
          if(command==='REPLACE') { const old=(await tx.query('SELECT state FROM public.bookings WHERE id=$1',[link.booking_id])).rows[0]; if(!old||!['CANCELLED','RESCHEDULED'].includes(old.state)) intentFail('FOLLOW_UP_INTENT_CONFLICT'); }
        }
        await final();
        if(input.desiredWindow && !(await tx.query('SELECT name FROM pg_catalog.pg_timezone_names WHERE name=$1',[input.desiredWindow.timeZone])).rowCount) intentFail('FOLLOW_UP_INTENT_INVALID');
        const id=root?.id??randomUUID(), op=randomUUID(), audit=randomUUID(); let versionId:string|null=null, linkId:string|null=null;
        if(command==='DRAFT') await tx.query('INSERT INTO public.follow_up_intents(id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) VALUES($1,$2,$3,$4,$5,$6)',[id,s.id,s.encounter_id,s.patient_id,clinicianId,a.userId]);
        if(['DRAFT','RELEASE','CORRECT'].includes(command)) {
          versionId=randomUUID();
          const instruction=command==='RELEASE'?head.instruction:input.instruction, window=command==='RELEASE'?(head.time_zone?{startAt:head.desired_start_at,endAt:head.desired_end_at,timeZone:head.time_zone}:null):input.desiredWindow;
          head=(await tx.query(`INSERT INTO public.follow_up_intent_versions(id,root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id,version,command,state,instruction,desired_start_at,desired_end_at,time_zone,predecessor_id,reason,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,[versionId,id,s.id,s.encounter_id,s.patient_id,clinicianId,a.userId,(head?.version??0)+1,command,command==='DRAFT'?'DRAFT':'SIGNED_RELEASED',instruction,window?.startAt??null,window?.endAt??null,window?.timeZone??null,head?.id??null,input.reason,op])).rows[0];
        } else if(command==='PRIVACY') {
          const targets=(await tx.query('SELECT id FROM public.follow_up_intent_versions WHERE root_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR SHARE',[id,input.versionIds])).rows;
          if(targets.length!==input.versionIds.length) deny();
          if((await tx.query('SELECT id FROM public.follow_up_intent_privacy_restrictions WHERE version_id=ANY($1::uuid[])',[input.versionIds])).rowCount) deny();
          for(const target of targets) await tx.query('INSERT INTO public.follow_up_intent_privacy_restrictions(root_id,patient_id,version_id,actor_user_id,operation_id,reason) VALUES($1,$2,$3,$4,$5,$6)',[id,s.patient_id,target.id,a.userId,op,input.reason]);
        } else {
          linkId=randomUUID();
          link=(await tx.query('INSERT INTO public.follow_up_intent_booking_links(id,root_id,patient_id,booking_id,sequence,predecessor_id,actor_user_id,command,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[linkId,id,s.patient_id,input.bookingId,(link?.sequence??0)+1,link?.id??null,a.userId,command,op])).rows[0];
        }
        await tx.query('INSERT INTO public.follow_up_intent_operations(id,actor_user_id,root_id,patient_id,command,operation_key,fingerprint,result_version_id,result_link_id,audit_id,version_limit,link_limit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[op,a.userId,id,s.patient_id,command,input.operationKey,fingerprint,versionId,linkId,audit,head?.version??0,link?.sequence??0]);
        const actions={DRAFT:'FOLLOW_UP_INTENT_DRAFTED',RELEASE:'FOLLOW_UP_INTENT_RELEASED',CORRECT:'FOLLOW_UP_INTENT_CORRECTED',LINK:'FOLLOW_UP_INTENT_BOOKING_LINKED',REPLACE:'FOLLOW_UP_INTENT_BOOKING_REPLACED',PRIVACY:'FOLLOW_UP_INTENT_PRIVACY_RESTRICTED'};
        await tx.query("INSERT INTO public.audit_logs(id,actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,$3,'follow_up_intent',$4,'{}',clock_timestamp())",[audit,a.userId,actions[command],id]);
        await final();
        return {status:command==='RELEASE'||command==='PRIVACY'?200:201,...(command==='PRIVACY'?{data:{restricted:true}}:await projection(tx,a,s.patient_id,id,s.id,false,intentPage({}),head.version,link?.sequence??0))};
      });
    } catch(e) {if(e instanceof FollowUpIntentError) throw e; return intentFail('FOLLOW_UP_INTENT_UNAVAILABLE');}
  }
  return {
    execute,
    async authorRead(actor:AuthPrincipal,consultationId:string,intentId:string|null,page:unknown={}) {
      const a=principal(actor); let id:string,target:string|null; try{id=availabilityId(consultationId);target=intentId===null?null:availabilityId(intentId);}catch{return deny();}
      try {const s=await scope(id),p=intentPage(page,target!==null);return await run(a,s?.patient_id??id,s,false,true,[],async tx=>{if(!s)deny();return projection(tx,a,s.patient_id,target,id,false,p);});}catch(e){if(e instanceof FollowUpIntentError)throw e;return intentFail('FOLLOW_UP_INTENT_UNAVAILABLE');}
    },
    async releasedRead(actor:AuthPrincipal,patientId:string|null,intentId:string|null,page:unknown={}) {
      const a=principal(actor),p=intentPage(page,intentId!==null);let target:string|null,patient:string|null;try{patient=patientId===null?null:availabilityId(patientId);target=intentId===null?null:availabilityId(intentId);}catch{return deny();}
      return run(a,patient,undefined,false,false,[],async tx=>{
        if(patient===null&&a.role!=='PATIENT'||patient!==null&&a.role!=='CLINICIAN')deny();
        const pp=patient??(await tx.query('SELECT id FROM public.patient_profiles WHERE user_id=$1',[a.userId])).rows[0]?.id;if(!pp)deny();return projection(tx,a,pp,target,null,true,p);
      });
    },
    close:()=>pool.end(),
  };
}
export type FollowUpIntentPersistence=ReturnType<typeof createFollowUpIntentPersistence>;
