import {PharmacyError} from './pharmacy-values.js';
import {createPharmacyModule} from './pharmacy.js';
import pg from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthPrincipal } from './auth.js';
import { availabilityId } from './availability-values.js';
import { PrescriptionError, prescriptionFail as fail, prescriptionDeny as deny, prescriptionInput, prescriptionPage, medicationInput, type PrescriptionCommand } from './prescription-values.js';
type Actor = {userId:string;sessionId:string;role:string};
type Scope = {id:string;patient_id:string;patient_user_id:string;treating_clinician_id:string;treating_clinician_user_id:string;encounter_id:string;organization_id:string;membership_id:string;provider_id:string;affiliation_id:string;specialty_id:string};
const fingerprint = (value:unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function principal(value:AuthPrincipal):Actor {
  try { const d=Object.getOwnPropertyDescriptors(value); if(['userId','sessionId','role'].some(k=>!d[k]?.enumerable||!('value' in d[k]))||typeof d.role.value!=='string'||!['PATIENT','CLINICIAN','ADMIN','LAB_STAFF','PHARMACY_STAFF'].includes(d.role.value))fail('PRESCRIPTION_UNAUTHENTICATED'); return {userId:availabilityId(d.userId.value),sessionId:availabilityId(d.sessionId.value),role:d.role.value as string}; } catch {return fail('PRESCRIPTION_UNAUTHENTICATED');}
}
/** Source authority and pharmacy artifact composition. No clinical inference or mutation retries. */
export function createPrescriptionPersistence(connectionString:string|undefined) {
  if(!connectionString)fail('PRESCRIPTION_UNAVAILABLE');
  const pool=new pg.Pool({connectionString,max:4,connectionTimeoutMillis:5000,lock_timeout:5000,statement_timeout:10000});pool.on('error',()=>{});
  async function current(tx:pg.PoolClient,a:Actor) {
    if(!(await tx.query("SELECT u.id FROM public.users u JOIN public.sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.role=$3 AND u.status='ACTIVE' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()",[a.userId,a.sessionId,a.role])).rowCount)fail('PRESCRIPTION_UNAUTHENTICATED');
  }
  async function scope(id:string) {return (await pool.query<Scope>('SELECT c.*,p.specialty_id FROM public.consultations c JOIN public.clinician_directory p ON p.id=c.provider_id WHERE c.id=$1',[id])).rows[0];}
  async function run<T>(a:Actor,patientId:string|null,sources:Scope[],author:boolean,action:(tx:pg.PoolClient,grants:Map<string,string>,final:()=>Promise<void>)=>Promise<T>,catalog=false) {
    let tx:pg.PoolClient|undefined,discard=false;
    const connectionError=()=>{discard=true;};
    try {
      const patients=catalog?[]:(await pool.query('SELECT id,user_id FROM public.patient_profiles WHERE '+(sources.length?'id=ANY($1::uuid[])':patientId?'id=$1':'user_id=$1'),[sources.length?[...new Set(sources.map(s=>s.patient_id))]:patientId??a.userId])).rows as {id:string;user_id:string}[];
      tx=await pool.connect();tx.on('error',connectionError);await tx.query('BEGIN');await tx.query("SET LOCAL transaction_timeout='30s'");await tx.query("SET LOCAL lock_timeout='5s'");await tx.query("SET LOCAL statement_timeout='10s'");
      if(!catalog)await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
      for(const id of [...new Set([a.userId,...patients.map(p=>p.user_id)])].sort())await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE',[id]);
      await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE',[a.sessionId]);await current(tx,a);
      if(catalog ? !['ADMIN','CLINICIAN'].includes(a.role) : !patients.length||!['PATIENT','CLINICIAN'].includes(a.role)||author&&a.role!=='CLINICIAN')deny();
      const grants=new Map<string,string>();let clinicianId:string|null=null;
      if(!catalog&&a.role==='CLINICIAN') {
        const cp=(await tx.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN' FOR SHARE",[a.userId])).rows[0];if(!cp)deny();clinicianId=cp.id;
        for(const p of [...patients].sort((a,b)=>a.id.localeCompare(b.id))) {
          const g=(await tx.query("SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL FOR SHARE",[cp.id,p.id])).rows[0];if(!g)deny();grants.set(p.id,g.id);
        }
      }
      for(const p of [...patients].sort((a,b)=>a.id.localeCompare(b.id))) {
        if(a.role==='PATIENT'&&p.user_id!==a.userId)deny();
        if(!(await tx.query("SELECT id FROM public.patient_profiles WHERE id=$1 AND user_id=$2 AND user_role='PATIENT' FOR SHARE",[p.id,p.user_id])).rowCount)deny();
      }
      if(author) {
        if(sources.some(s=>s.treating_clinician_user_id!==a.userId||s.treating_clinician_id!==clinicianId))deny();
        const stages=[['specialties','id','specialty_id'],['organizations','id','organization_id'],['clinic_directory','organization_id','organization_id'],['organization_memberships','id','membership_id'],['clinician_directory','id','provider_id'],['directory_affiliations','id','affiliation_id']] as const;
        for(const [table,column,key] of stages)for(const id of [...new Set(sources.map(s=>s[key]))].sort())await tx.query(`SELECT ${column} FROM public.${table} WHERE ${column}=$1 FOR SHARE`,[id]);
        for(const id of [...new Set(sources.map(s=>s.organization_id))].sort())if(!(await tx.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 ORDER BY version DESC LIMIT 1 FOR SHARE',[id])).rowCount)deny();
      }
      const final=async()=>{
        await current(tx!,a);
        if(catalog&&a.role==='CLINICIAN'&&!(await tx!.query("SELECT id FROM public.clinician_profiles WHERE user_id=$1 AND user_role='CLINICIAN'",[a.userId])).rowCount)deny();
        for(const p of patients) {
          if(!(await tx!.query("SELECT id FROM public.users WHERE id=$1 AND role='PATIENT' AND status='ACTIVE'",[p.user_id])).rowCount)deny();
          if(clinicianId&&!(await tx!.query("SELECT g.id FROM public.clinician_patient_assignments g JOIN public.clinician_profiles cp ON cp.id=g.clinician_id AND cp.user_id=$4 AND cp.user_role='CLINICIAN' WHERE g.id=$1 AND g.patient_id=$2 AND g.clinician_id=$3 AND g.status='ACTIVE' AND g.ended_at IS NULL",[grants.get(p.id),p.id,clinicianId,a.userId])).rowCount)deny();
        }
        if(author)for(const s of sources)if(!(await tx!.query(`SELECT c.id FROM public.consultations c
          JOIN public.organizations o ON o.id=c.organization_id AND o.kind='CLINIC' AND o.status='ACTIVE'
          JOIN public.organization_memberships m ON m.id=c.membership_id AND m.organization_id=o.id AND m.user_id=c.treating_clinician_user_id AND m.user_role='CLINICIAN' AND m.organization_kind='CLINIC' AND m.status='ACTIVE' AND m.ended_at IS NULL
          JOIN public.clinician_directory p ON p.id=c.provider_id AND p.clinician_id=c.treating_clinician_id AND p.clinician_user_id=c.treating_clinician_user_id
          JOIN public.specialties sp ON sp.id=p.specialty_id JOIN public.clinic_directory cd ON cd.organization_id=o.id
          JOIN public.directory_affiliations af ON af.id=c.affiliation_id AND af.provider_id=p.id AND af.organization_id=o.id AND af.membership_id=m.id AND af.clinician_user_id=c.treating_clinician_user_id AND af.specialty_id=p.specialty_id AND af.withdrawn_at IS NULL
          WHERE c.id=$1 AND c.patient_id=$2 AND c.encounter_id=$3 AND c.treating_clinician_user_id=$4`,[s.id,s.patient_id,s.encounter_id,a.userId])).rowCount)deny();
      };
      await final();
      for(const id of patients.map(p=>p.id).sort())await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))',[id]);
      if(clinicianId)await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359363,pg_catalog.hashtext($1::text))',[clinicianId]);
      for(const s of [...sources].sort((a,b)=>a.id.localeCompare(b.id))) {await tx.query('SELECT id FROM public.consultations WHERE id=$1 FOR SHARE',[s.id]);await tx.query('SELECT id FROM public.clinical_encounters WHERE id=$1 FOR SHARE',[s.encounter_id]);}
      await final();const result=await action(tx,grants,final);await final();await tx.query('COMMIT');return result;
    } catch(e) {
      // A failed/uncertain transaction must never return a damaged connection
      // to the pool before pg delivers its asynchronous disconnect event.
      if(!(e instanceof PrescriptionError)&&!(e instanceof PharmacyError))discard=true;
      if(tx)await tx.query('ROLLBACK').catch(()=>{discard=true;});
      if(e instanceof PrescriptionError||e instanceof PharmacyError)throw e;
      if(e&&typeof e==='object'&&'code' in e&&['23505','23P01'].includes(String(e.code)))fail('PRESCRIPTION_CONFLICT');
      return fail('PRESCRIPTION_UNAVAILABLE');
    } finally {tx?.release(discard);tx?.removeListener('error',connectionError);}
  }
  async function restricted(tx:pg.PoolClient,rootId:string) {return !!(await tx.query('SELECT p.id FROM public.prescriptions r JOIN public.prescription_privacy_restrictions p ON p.lineage_id=r.lineage_id WHERE r.id=$1',[rootId])).rowCount;}
  async function projection(tx:pg.PoolClient,a:Actor,patient:string,rootId:string|null,consultation:string|null,signed:boolean,page=prescriptionPage({}),retainedVersion:string|null=null) {
    const available=(await tx.query("SELECT to_regclass('public.pharmacy_dispenses') IS NOT NULL ready")).rows[0].ready;
    const fulfillment=available?'public.i3_pharmacy_item_projection(i.id,$9,$10)':"jsonb_build_object('fulfillmentState','NOT_DISPENSED')";
    const result=(await tx.query(`WITH visible AS MATERIALIZED (
      SELECT r.*,v.id version_id,v.version,v.state,v.valid_from,v.valid_until,v.signed_at,v.recorded_at,v.reason,v.replacement_id,
      (SELECT state FROM public.prescription_versions latest WHERE latest.root_id=r.id ORDER BY version DESC LIMIT 1) current_state,
      (v.state='SIGNED' AND (SELECT state FROM public.prescription_versions latest WHERE latest.root_id=r.id ORDER BY version DESC LIMIT 1)='SIGNED' AND v.valid_from<=clock_timestamp() AND clock_timestamp()<v.valid_until) eligible
      FROM public.prescriptions r JOIN LATERAL (SELECT * FROM public.prescription_versions v WHERE v.root_id=r.id AND ($8::uuid IS NULL OR v.version<=(SELECT version FROM public.prescription_versions WHERE id=$8)) ORDER BY version DESC LIMIT 1) v ON true
      WHERE r.patient_id=$1 AND ($2::uuid IS NULL OR r.id=$2) AND ($3::uuid IS NULL OR r.consultation_id=$3)
      AND CASE WHEN $4::boolean THEN v.state<>'DRAFT' ELSE r.author_user_id=$5 END
      AND NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions p WHERE p.lineage_id=r.lineage_id)
    ), selected AS (SELECT * FROM visible ORDER BY created_at DESC,id ASC LIMIT $6 OFFSET $7)
    SELECT (SELECT count(*)::int FROM visible) total,coalesce((SELECT jsonb_agg((CASE WHEN $4::boolean THEN '{}'::jsonb ELSE jsonb_build_object('version',r.version) END)||jsonb_build_object(
      'id',r.id,'consultationId',r.consultation_id,'encounterId',r.encounter_id,'patientId',r.patient_id,'authorClinicianId',r.author_clinician_id,'originatingClinicId',r.organization_id,
      'state',r.state,'currentState',r.current_state,'validFrom',r.valid_from,'validUntil',r.valid_until,'signedAt',r.signed_at,'createdAt',r.created_at,'eligible',r.eligible,
      'predecessorId',CASE WHEN EXISTS(SELECT 1 FROM public.prescriptions x WHERE x.id=r.predecessor_id AND NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions p WHERE p.lineage_id=x.lineage_id)) THEN r.predecessor_id ELSE NULL END,
      'replacementId',CASE WHEN EXISTS(SELECT 1 FROM public.prescriptions x WHERE x.id=r.replacement_id AND NOT EXISTS(SELECT 1 FROM public.prescription_privacy_restrictions p WHERE p.lineage_id=x.lineage_id)) THEN r.replacement_id ELSE NULL END,
      'reason',r.reason,'history',(SELECT coalesce(jsonb_agg(jsonb_build_object('state',h.state,'signedAt',h.signed_at,'recordedAt',h.recorded_at,'reason',h.reason) ORDER BY h.version),'[]'::jsonb) FROM public.prescription_versions h WHERE h.root_id=r.id AND h.state<>'DRAFT' AND h.version<=r.version),'items',(SELECT jsonb_agg(jsonb_build_object('id',i.id,'medicationId',i.medication_id,'medicationDisplay',i.medication_display,'quantity',trim(trailing '.' FROM trim(trailing '0' FROM i.quantity::text)),'unit',i.unit,'instructions',i.instructions)||CASE WHEN $9::int>=1 AND $10::int>=1 THEN ${fulfillment} ELSE '{}'::jsonb END ORDER BY vi.position) FROM public.prescription_version_items vi JOIN public.prescription_items i ON i.id=vi.item_id WHERE vi.version_id=r.version_id)
    ) ORDER BY r.created_at DESC,r.id ASC) FROM selected r),'[]'::jsonb) data`,[patient,rootId,consultation,signed,a.userId,rootId?1:page.pageSize,rootId?0:(page.page-1)*page.pageSize,retainedVersion,rootId?page.page:1,rootId?page.pageSize:1])).rows[0];
    if(rootId) {if(!result.data.length)deny();return {data:result.data[0]};}
    return {data:result.data,meta:{...page,total:result.total}};
  }
  async function selectedItems(tx:pg.PoolClient,items:NonNullable<ReturnType<typeof prescriptionInput>['content']>['items'],signing:boolean) {
    for(const id of [...new Set(items.map(i=>i.medicationId))].sort())if(!(await tx.query('SELECT id FROM public.medications WHERE id=$1 FOR SHARE',[id])).rowCount)fail('PRESCRIPTION_INVALID');
    const result=[];
    for(const item of items) {const m=(await tx.query('SELECT * FROM public.medication_versions WHERE medication_id=$1 ORDER BY version DESC LIMIT 1',[item.medicationId])).rows[0];if(!m||signing&&(!m.is_active||!m.is_published))fail('PRESCRIPTION_CONFLICT');result.push({...item,displayName:m.display_name});}
    return result;
  }
  async function execute(command:PrescriptionCommand,actor:AuthPrincipal,value:unknown) {
    const input=prescriptionInput(command,value),a=principal(actor),hash=fingerprint(input);
    try {
      const s=await scope(input.consultationId);
      // Discover the prior target before locks so both patients/clinics can be
      // locked in stable order. The actor row serializes competing keyed calls.
      const hint=(await pool.query('SELECT o.*,r.consultation_id FROM public.prescription_operations o JOIN public.prescriptions r ON r.id=o.target_root_id WHERE o.actor_user_id=$1 AND o.command=$2 AND o.operation_key=$3',[a.userId,command,input.operationKey])).rows[0];
      const priorScope=hint?await scope(hint.consultation_id):undefined;
      const sources=[...new Map([s,priorScope].filter((v):v is Scope=>!!v).map(v=>[v.id,v])).values()];
      return await run(a,s?.patient_id??input.consultationId,sources,true,async(tx,grants,final)=>{
        if(!s)deny();
        const root=input.prescriptionId?(await tx.query('SELECT * FROM public.prescriptions WHERE id=$1 AND consultation_id=$2 AND author_user_id=$3 FOR UPDATE',[input.prescriptionId,s.id,a.userId])).rows[0]:null;
        if(input.prescriptionId&&!root)deny();
        const prior=(await tx.query('SELECT o.*,r.consultation_id FROM public.prescription_operations o JOIN public.prescriptions r ON r.id=o.target_root_id WHERE o.actor_user_id=$1 AND o.command=$2 AND o.operation_key=$3 FOR SHARE OF o',[a.userId,command,input.operationKey])).rows[0];
        // A newly appeared cross-scope operation was not part of the lock set.
        // Deny without revealing conflict; an explicit retry can authorize both.
        if(prior&&!sources.some(s=>s.id===prior.consultation_id))deny();
        const exactPrivacy=command==='PRIVACY'&&prior?.fingerprint===hash&&prior.target_root_id===root?.id;
        if(root&&await restricted(tx,root.id)&&!exactPrivacy)deny();
        if(prior) {
          if(await restricted(tx,prior.target_root_id)&&!exactPrivacy||await restricted(tx,prior.result_root_id)&&!exactPrivacy)deny();
          if(prior.fingerprint!==hash)fail('PRESCRIPTION_CONFLICT');
          await final();return {status:200,...(command==='PRIVACY'?{data:{restricted:true}}:await projection(tx,a,s.patient_id,prior.result_root_id,s.id,false,prescriptionPage({}),prior.result_version_id))};
        }
        const head=root?(await tx.query('SELECT * FROM public.prescription_versions WHERE root_id=$1 ORDER BY version DESC LIMIT 1',[root.id])).rows[0]:null;
        if(command==='DRAFT'&&(await tx.query("SELECT id FROM public.consultations WHERE id=$1 AND state='OPEN'",[s.id])).rowCount!==1)fail('PRESCRIPTION_CONFLICT');
        if(input.expectedVersion!==null&&head.version!==input.expectedVersion)fail('PRESCRIPTION_CONFLICT');
        if(['EDIT','SIGN'].includes(command)&&head.state!=='DRAFT'||['CANCEL','REPLACE'].includes(command)&&head.state!=='SIGNED')fail('PRESCRIPTION_CONFLICT');
        const op=randomUUID(),audit=randomUUID(),target=root?.id??randomUUID(),resultId=command==='REPLACE'?randomUUID():target;
        let versionId:string|null=null;
        async function insertRoot(id:string,predecessor:string|null) {await tx.query('INSERT INTO public.prescriptions(id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,organization_id,membership_id,assignment_id,lineage_id,predecessor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,s!.id,s!.encounter_id,s!.patient_id,a.userId,s!.treating_clinician_id,s!.organization_id,s!.membership_id,grants.get(s!.patient_id),root?.lineage_id??id,predecessor]);}
        async function append(id:string,version:number,state:string,content:typeof input.content,copyVersion:string|null,replacement:string|null) {
          const newVersion=randomUUID();let ids:string[]=[];
          const body=content??{validFrom:head.valid_from,validUntil:head.valid_until,items:[]};
          if(state==='SIGNED'&&!(await tx.query('SELECT $1::timestamptz>clock_timestamp() valid',[body.validUntil])).rows[0].valid)fail('PRESCRIPTION_CONFLICT');
          if(content) {
            const entries=await selectedItems(tx,content.items,state==='SIGNED');
            for(const item of entries) {const itemId=randomUUID();await tx.query('INSERT INTO public.prescription_items(id,root_id,medication_id,medication_display,quantity,unit,instructions) VALUES($1,$2,$3,$4,$5,$6,$7)',[itemId,id,item.medicationId,item.displayName,item.quantity,item.unit,item.instructions]);ids.push(itemId);}
          } else {
            const entries=(await tx.query('SELECT i.*,vi.position FROM public.prescription_version_items vi JOIN public.prescription_items i ON i.id=vi.item_id WHERE vi.version_id=$1 ORDER BY vi.position',[copyVersion])).rows;
            if(state==='SIGNED') {
              const selected=await selectedItems(tx,entries.map(i=>({medicationId:i.medication_id,quantity:i.quantity,unit:i.unit,instructions:i.instructions})),true);
              // A catalog rename between draft and sign requires explicit draft edit.
              if(selected.some((m,i)=>m.displayName!==entries[i].medication_display))fail('PRESCRIPTION_CONFLICT');
            }
            ids=entries.map(i=>i.id);
          }
          const v=(await tx.query('INSERT INTO public.prescription_versions(id,root_id,version,command,state,valid_from,valid_until,signed_at,actor_user_id,reason,replacement_id,operation_id,assignment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',[newVersion,id,version,command,state,body.validFrom,body.validUntil,state==='DRAFT'?null:new Date(),a.userId,input.reason,replacement,op,grants.get(s!.patient_id)])).rows[0];
          for(const [index,item] of ids.entries())await tx.query('INSERT INTO public.prescription_version_items(version_id,root_id,item_id,position) VALUES($1,$2,$3,$4)',[newVersion,id,item,index+1]);
          return v;
        }
        if(command==='PRIVACY')await tx.query('INSERT INTO public.prescription_privacy_restrictions(lineage_id,patient_id,target_root_id,actor_user_id,operation_id,reason,assignment_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[root.lineage_id,s.patient_id,target,a.userId,op,input.reason,grants.get(s.patient_id)]);
        else {
          if(command==='DRAFT')await insertRoot(target,null);
          if(command==='REPLACE') {await insertRoot(resultId,target);versionId=(await append(resultId,1,'SIGNED',input.content,null,null)).id;await append(target,head.version+1,'REPLACED',null,head.id,resultId);}
          else versionId=(await append(target,(head?.version??0)+1,command==='CANCEL'?'CANCELLED':command==='SIGN'?'SIGNED':'DRAFT',input.content,head?.id??null,null)).id;
        }
        await tx.query('INSERT INTO public.prescription_operations(id,actor_user_id,command,operation_key,fingerprint,target_root_id,result_root_id,result_version_id,audit_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[op,a.userId,command,input.operationKey,hash,target,resultId,versionId,audit]);
        await tx.query("INSERT INTO public.audit_logs(id,actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,$3,'prescription',$4,'{}',clock_timestamp())",[audit,a.userId,'PRESCRIPTION_'+command,target]);
        await final();
        // Validity and catalog eligibility are also checked by deferred DB guards.
        if(['SIGN','REPLACE'].includes(command)&&!(await tx.query('SELECT valid_until>clock_timestamp() valid FROM public.prescription_versions WHERE id=$1',[versionId])).rows[0].valid)fail('PRESCRIPTION_CONFLICT');
        return {status:['DRAFT','REPLACE'].includes(command)?201:200,...(command==='PRIVACY'?{data:{restricted:true}}:await projection(tx,a,s.patient_id,resultId,s.id,false,prescriptionPage({}),versionId))};
      });
    } catch(e) {if(e instanceof PrescriptionError||e instanceof PharmacyError)throw e;return fail('PRESCRIPTION_UNAVAILABLE');}
  }
  const pharmacy=createPharmacyModule(pool,{principal,scope,current,run});
  return {
    pharmacy,
    execute,
    async authorRead(actor:AuthPrincipal,consultationId:string,prescriptionId:string|null,page:unknown={}) {
      const a=principal(actor);let id:string,target:string|null;try{id=availabilityId(consultationId);target=prescriptionId===null?null:availabilityId(prescriptionId);}catch{return deny();}
      const s=await scope(id),p=prescriptionPage(page);return run(a,s?.patient_id??id,s?[s]:[],true,async tx=>{if(!s)deny();return projection(tx,a,s.patient_id,target,s.id,false,p);});
    },
    async signedRead(actor:AuthPrincipal,patientId:string|null,prescriptionId:string|null,page:unknown={}) {
      const a=principal(actor),p=prescriptionPage(page);let patient:string|null,target:string|null;try{patient=patientId===null?null:availabilityId(patientId);target=prescriptionId===null?null:availabilityId(prescriptionId);}catch{return deny();}
      return run(a,patient,[],false,async tx=>{if(patient===null&&a.role!=='PATIENT'||patient!==null&&a.role!=='CLINICIAN')deny();const id=patient??(await tx.query('SELECT id FROM public.patient_profiles WHERE user_id=$1',[a.userId])).rows[0]?.id;if(!id)deny();return projection(tx,a,id,target,null,true,p);});
    },
    async catalogRead(actor:AuthPrincipal,page:unknown={}) {
      const a=principal(actor),p=prescriptionPage(page);return run(a,null,[],false,async tx=>{
        const rows=(await tx.query(`WITH visible AS MATERIALIZED (SELECT m.id,v.* FROM public.medications m JOIN LATERAL (SELECT version,display_name,is_active,is_published FROM public.medication_versions WHERE medication_id=m.id ORDER BY version DESC LIMIT 1) v ON true WHERE $1::boolean OR v.is_active AND v.is_published) SELECT (SELECT count(*)::int FROM visible) total,coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'version',version,'displayName',display_name,'isActive',is_active,'isPublished',is_published) ORDER BY id) FROM (SELECT * FROM visible ORDER BY id LIMIT $2 OFFSET $3) s),'[]'::jsonb) data`,[a.role==='ADMIN',p.pageSize,(p.page-1)*p.pageSize])).rows[0];return {data:rows.data,meta:{...p,total:rows.total}};
      },true);
    },
    async catalogSet(actor:AuthPrincipal,value:unknown) {
      const a=principal(actor),input=medicationInput(value),hash=fingerprint(input);return run(a,null,[],false,async(tx,_grants,final)=>{
        if(a.role!=='ADMIN')deny();
        const prior=(await tx.query('SELECT * FROM public.medication_operations WHERE actor_user_id=$1 AND operation_key=$2',[a.userId,input.operationKey])).rows[0];
        if(!(await tx.query('SELECT id FROM public.medications WHERE id=$1 FOR UPDATE',[input.medicationId])).rowCount)deny();
        if(prior) {if(prior.fingerprint!==hash)fail('PRESCRIPTION_CONFLICT');const v=(await tx.query('SELECT * FROM public.medication_versions WHERE id=$1',[prior.result_version_id])).rows[0];return {data:{id:v.medication_id,version:v.version,displayName:v.display_name,isActive:v.is_active,isPublished:v.is_published}};}
        const head=(await tx.query('SELECT * FROM public.medication_versions WHERE medication_id=$1 ORDER BY version DESC LIMIT 1',[input.medicationId])).rows[0];if(head.version!==input.expectedVersion)fail('PRESCRIPTION_CONFLICT');
        const op=randomUUID(),audit=randomUUID(),v=(await tx.query('INSERT INTO public.medication_versions(medication_id,version,display_name,is_active,is_published,actor_user_id,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[input.medicationId,head.version+1,input.displayName,input.isActive,input.isPublished,a.userId,op])).rows[0];
        await tx.query('INSERT INTO public.medication_operations(id,actor_user_id,operation_key,fingerprint,medication_id,result_version_id,audit_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[op,a.userId,input.operationKey,hash,input.medicationId,v.id,audit]);
        await tx.query("INSERT INTO public.audit_logs(id,actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,'MEDICATION_SET','medication',$3,'{}',clock_timestamp())",[audit,a.userId,input.medicationId]);await final();return {data:{id:input.medicationId,version:v.version,displayName:v.display_name,isActive:v.is_active,isPublished:v.is_published}};
      },true);
    },
    close:()=>pool.end(),
  };
}
export type PrescriptionPersistence=ReturnType<typeof createPrescriptionPersistence>;
