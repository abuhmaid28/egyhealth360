import pg from 'pg';
import {createHash,randomUUID} from 'node:crypto';
import type {AuthPrincipal} from './auth.js';
import {availabilityId} from './availability-values.js';
import {PrescriptionError} from './prescription-values.js';
import {PharmacyError,pharmacyFail as fail,pharmacyDeny as deny,pharmacyInput,pharmacyPage,type PharmacyCommand} from './pharmacy-values.js';
type Actor={userId:string;sessionId:string;role:string};
type Scope={id:string;patient_id:string;patient_user_id:string;treating_clinician_id:string;treating_clinician_user_id:string;encounter_id:string;organization_id:string;membership_id:string;provider_id:string;affiliation_id:string;specialty_id:string};
type Hint={id:string;root_id:string;patient_id:string;patient_user_id:string;pharmacy_id:string;consultation_id:string;author_user_id:string};
type SourceAccess={principal:(a:AuthPrincipal)=>Actor;scope:(id:string)=>Promise<Scope|undefined>;current:(tx:pg.PoolClient,a:Actor)=>Promise<void>;run:<T>(a:Actor,patientId:string|null,sources:Scope[],author:boolean,action:(tx:pg.PoolClient,grants:Map<string,string>,final:()=>Promise<void>)=>Promise<T>,catalog?:boolean)=>Promise<T>};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function translate(e:unknown):never{
 if(e instanceof PharmacyError)throw e;
 if(e instanceof PrescriptionError)throw new PharmacyError(e.code.replace('PRESCRIPTION_','PHARMACY_') as PharmacyError['code']);
 if(e&&typeof e==='object'&&'code'in e&&['23505','23P01'].includes(String(e.code)))return fail('PHARMACY_CONFLICT');
 return fail('PHARMACY_UNAVAILABLE');
}
/** Internal composition with source authority; no raw transaction capability is exported from the package. */
export function createPharmacyModule(pool:pg.Pool,source:SourceAccess){
 const actor=(a:AuthPrincipal)=>{try{return source.principal(a);}catch(e){return translate(e);}};
 async function hint(routeId:string,connection:pg.Pool|pg.PoolClient=pool){return(await connection.query<Hint>(`SELECT r.*,p.consultation_id,pp.user_id patient_user_id FROM public.pharmacy_routes r JOIN public.prescriptions p ON p.id=r.root_id JOIN public.patient_profiles pp ON pp.id=r.patient_id WHERE r.id=$1`,[routeId])).rows[0];}
 async function priorHint(a:Actor,command:PharmacyCommand,key:string){const op=(await pool.query('SELECT * FROM public.pharmacy_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3',[a.userId,command,key])).rows[0];return op?await hint(op.target_route_id):undefined;}
 async function privacy(tx:pg.PoolClient,root:string){return!!(await tx.query('SELECT pr.id FROM public.prescriptions p JOIN public.prescription_privacy_restrictions pr ON pr.lineage_id=p.lineage_id WHERE p.id=$1',[root])).rowCount;}
 async function eligible(tx:pg.PoolClient,root:string,dispensing=false){return!!(await tx.query('SELECT public.i3_pharmacy_source($1,$2) eligible',[root,dispensing])).rows[0].eligible;}
 async function route(tx:pg.PoolClient,id:string,root?:string){return(await tx.query('SELECT r.*,v.version,v.state FROM public.pharmacy_routes r JOIN LATERAL(SELECT * FROM public.pharmacy_route_versions WHERE route_id=r.id ORDER BY version DESC LIMIT 1) v ON true WHERE r.id=$1 AND ($2::uuid IS NULL OR r.root_id=$2) FOR UPDATE OF r',[id,root??null])).rows[0];}
 async function orgLocks(tx:pg.PoolClient,ids:string[],exclusive=false){for(const id of [...new Set(ids)].sort())if(!(await tx.query(`SELECT id FROM public.organizations WHERE id=$1 AND kind='PHARMACY' FOR ${exclusive?'UPDATE':'SHARE'}`,[id])).rowCount)deny();}
 async function staffRun<T>(a:Actor,org:string,hints:Hint[],action:(tx:pg.PoolClient,members:Map<string,string>,final:()=>Promise<void>)=>Promise<T>,artifactCheck?:(tx:pg.PoolClient)=>Promise<void>){
  let tx:pg.PoolClient|undefined;const connectionError=()=>{};
  try{
   tx=await pool.connect();tx.on('error',connectionError);await tx.query('BEGIN');await tx.query("SET LOCAL transaction_timeout='30s'");await tx.query("SET LOCAL lock_timeout='5s'");await tx.query("SET LOCAL statement_timeout='10s'");
   await tx.query('LOCK TABLE public.users,public.patient_profiles,public.clinician_profiles,public.clinician_patient_assignments IN ROW EXCLUSIVE MODE');
   for(const id of [...new Set([a.userId,...hints.map(h=>h.patient_user_id)])].sort())await tx.query('SELECT id FROM public.users WHERE id=$1 FOR NO KEY UPDATE',[id]);
   await tx.query('SELECT id FROM public.sessions WHERE id=$1 FOR UPDATE',[a.sessionId]);await source.current(tx,a);if(a.role!=='PHARMACY_STAFF')deny();
   const orgs=[...new Set([org,...hints.map(h=>h.pharmacy_id)])].sort();await orgLocks(tx,orgs);
   const members=new Map<string,string>();for(const id of orgs){const m=(await tx.query("SELECT id FROM public.organization_memberships WHERE organization_id=$1 AND user_id=$2 AND user_role='PHARMACY_STAFF' AND organization_kind='PHARMACY' AND status='ACTIVE' AND ended_at IS NULL FOR SHARE",[id,a.userId])).rows[0];if(!m)deny();members.set(id,m.id);}
   const final=async()=>{await source.current(tx!,a);for(const [id,member]of members)if(!(await tx!.query('SELECT public.i3_pharmacy_member($1,$2,$3) allowed',[member,a.userId,id])).rows[0].allowed)deny();if(artifactCheck)await artifactCheck(tx!);};
   await final();for(const id of [...new Set(hints.map(h=>h.patient_id))].sort())await tx.query('SELECT pg_catalog.pg_advisory_xact_lock(1162359376,pg_catalog.hashtext($1::text))',[id]);
   for(const id of [...new Set(hints.map(h=>h.root_id))].sort())await tx.query('SELECT id FROM public.prescriptions WHERE id=$1 FOR UPDATE',[id]);
   await final();const result=await action(tx,members,final);await final();await tx.query('COMMIT');return result;
  }catch(e){if(tx)await tx.query('ROLLBACK').catch(()=>{});return translate(e);}finally{tx?.release();tx?.removeListener('error',connectionError);}
 }
 async function view(tx:pg.PoolClient,org:string|null,root:string|null,id:string|null,page=pharmacyPage({}),staff=false,receipt=false){
  const result=(await tx.query(`WITH visible AS MATERIALIZED (
   SELECT r.*,o.name pharmacy_name,v.version,v.state retained_state,public.i3_pharmacy_route_state(r.id) state,
   public.i3_pharmacy_source(r.root_id) eligible,
   (SELECT display_name FROM public.patient_profiles WHERE id=r.patient_id) patient_name
   FROM public.pharmacy_routes r JOIN public.organizations o ON o.id=r.pharmacy_id JOIN LATERAL(SELECT * FROM public.pharmacy_route_versions WHERE route_id=r.id ORDER BY version DESC LIMIT 1) v ON true
   WHERE ($1::uuid IS NULL OR r.pharmacy_id=$1) AND ($2::uuid IS NULL OR r.root_id=$2) AND ($3::uuid IS NULL OR r.id=$3)
   AND NOT EXISTS(SELECT 1 FROM public.prescriptions p JOIN public.prescription_privacy_restrictions pr ON pr.lineage_id=p.lineage_id WHERE p.id=r.root_id)
   AND (NOT $4::boolean OR CASE WHEN $5='history' THEN v.state='ACCEPTED' AND ($8::boolean OR NOT public.i3_pharmacy_source(r.root_id) OR NOT EXISTS(SELECT 1 FROM public.pharmacy_route_items ri WHERE ri.route_id=r.id AND NOT EXISTS(SELECT 1 FROM public.pharmacy_dispenses d WHERE d.item_id=ri.item_id))) ELSE public.i3_pharmacy_source(r.root_id) AND v.state IN ('PENDING','ACCEPTED') AND ($8::boolean OR EXISTS(SELECT 1 FROM public.pharmacy_route_items ri WHERE ri.route_id=r.id AND NOT EXISTS(SELECT 1 FROM public.pharmacy_dispenses d WHERE d.item_id=ri.item_id))) END)
  ), selected AS(SELECT * FROM visible ORDER BY created_at DESC,id LIMIT $6 OFFSET $7)
  SELECT (SELECT count(*)::int FROM visible) total,coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'prescriptionId',r.root_id,'pharmacyId',r.pharmacy_id,'pharmacyName',r.pharmacy_name,'version',r.version,'state',r.state,'recordedState',r.retained_state,'purpose',CASE WHEN $5='history' THEN 'CORRECTION_HISTORY' ELSE 'FULFILLMENT' END,'createdAt',r.created_at,'patientDisplayName',CASE WHEN $5='history' THEN NULL ELSE r.patient_name END,
   'validFrom',(SELECT valid_from FROM public.prescription_versions WHERE root_id=r.root_id ORDER BY version DESC LIMIT 1),'validUntil',(SELECT valid_until FROM public.prescription_versions WHERE root_id=r.root_id ORDER BY version DESC LIMIT 1),
   'transitions',(SELECT jsonb_agg(jsonb_build_object('state',state,'recordedAt',recorded_at,'reason',reason) ORDER BY version) FROM public.pharmacy_route_versions WHERE route_id=r.id),
   'items',(SELECT jsonb_agg(jsonb_build_object('id',i.id,'medicationId',i.medication_id,'medicationDisplay',i.medication_display,'quantity',trim(trailing '.' FROM trim(trailing '0' FROM i.quantity::text)),'unit',i.unit,'instructions',CASE WHEN $5='history' THEN NULL ELSE i.instructions END)||(CASE WHEN $4::boolean THEN public.i3_pharmacy_item_projection(i.id,$9,$10)-'routingHistory'-'routingHistoryMeta' ELSE public.i3_pharmacy_item_projection(i.id,$9,$10) END) ORDER BY i.id) FROM public.pharmacy_route_items ri JOIN public.prescription_items i ON i.id=ri.item_id WHERE ri.route_id=r.id AND (NOT $4::boolean OR $5<>'history' OR EXISTS(SELECT 1 FROM public.pharmacy_dispenses d WHERE d.item_id=i.id)))
  ) ORDER BY r.created_at DESC,r.id) FROM selected r),'[]'::jsonb) data`,[org,root,id,staff,page.purpose,id?1:page.pageSize,id?0:(page.page-1)*page.pageSize,receipt,id?page.page:1,id?page.pageSize:1])).rows[0];
  if(id){if(!result.data.length)deny();return{data:result.data[0]};}return{data:result.data,meta:{...page,total:result.total}};
 }
 async function operation(tx:pg.PoolClient,a:Actor,command:PharmacyCommand,input:ReturnType<typeof pharmacyInput>,ids:{op:string;target:string;result:string;version:string|null;dispense:string|null;correction:string|null}){
  const audit=randomUUID();await tx.query('INSERT INTO public.pharmacy_operations(id,actor_user_id,command,operation_key,fingerprint,target_route_id,result_route_id,result_route_version_id,result_dispense_id,result_correction_id,audit_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[ids.op,a.userId,command,input.operationKey,hash(input),ids.target,ids.result,ids.version,ids.dispense,ids.correction,audit]);
  await tx.query("INSERT INTO public.audit_logs(id,actor_user_id,action_type,entity_type,entity_id,safe_metadata,timestamp) VALUES($1,$2,$3,'pharmacy_route',$4,'{}',clock_timestamp())",[audit,a.userId,'PHARMACY_'+command,ids.target]);
 }
 async function clinician(command:'ROUTE'|'WITHDRAW'|'REROUTE',principal:AuthPrincipal,value:unknown){
  const input=pharmacyInput(command,value),a=actor(principal);
  try{
   const s=await source.scope(input.consultationId!),previous=await priorHint(a,command,input.operationKey),ps=previous?await source.scope(previous.consultation_id):undefined;
   const scopes=[...new Map([s,ps].filter((s):s is Scope=>!!s).map(s=>[s.id,s])).values()];
   return await source.run(a,s?.patient_id??input.consultationId!,scopes,true,async(tx,grants,final)=>{
    if(!s)deny();const root=(await tx.query('SELECT * FROM public.prescriptions WHERE id=$1 AND consultation_id=$2 AND author_user_id=$3 FOR UPDATE',[input.prescriptionId,s!.id,a.userId])).rows[0];if(!root||await privacy(tx,root.id))deny();
    const old=input.routeId?await route(tx,input.routeId,root.id):null;if(input.routeId&&!old)deny();
    const prior=(await tx.query('SELECT * FROM public.pharmacy_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3',[a.userId,command,input.operationKey])).rows[0];
    if(prior){const h=await hint(prior.target_route_id,tx);if(!h||!scopes.some(s=>s.id===h.consultation_id)||await privacy(tx,h.root_id))deny();if(prior.fingerprint!==hash(input))fail('PHARMACY_CONFLICT');return{status:200,...await view(tx,null,h.root_id,prior.result_route_id)};}
    const head=(await tx.query('SELECT * FROM public.prescription_versions WHERE root_id=$1 ORDER BY version DESC LIMIT 1',[root.id])).rows[0];if(!await eligible(tx,root.id))fail('PHARMACY_CONFLICT');
    if(command==='ROUTE'?head.version!==input.expectedVersion:old.version!==input.expectedVersion||old.state!=='PENDING')fail('PHARMACY_CONFLICT');
    await orgLocks(tx,[...(input.destinationId?[input.destinationId]:[]),...(old?[old.pharmacy_id]:[])],true);
    if(input.destinationId&&!(await tx.query("SELECT id FROM public.organizations WHERE id=$1 AND kind='PHARMACY' AND status='ACTIVE'",[input.destinationId])).rowCount)deny();
    if(command==='REROUTE'&&old.pharmacy_id===input.destinationId)fail('PHARMACY_CONFLICT');
    const op=randomUUID(),target=old?.id??randomUUID(),result=command==='REROUTE'?randomUUID():target;let versionId:string|null=null;
    async function version(id:string,n:number,state:string){const v=randomUUID();await tx.query('INSERT INTO public.pharmacy_route_versions(id,route_id,version,command,state,actor_user_id,assignment_id,reason,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[v,id,n,command,state,a.userId,grants.get(s!.patient_id),input.reason,op]);return v;}
    if(old)versionId=await version(old.id,old.version+1,'WITHDRAWN');
    if(command!=='WITHDRAW'){
     const itemIds=command==='ROUTE'?input.itemIds:(await tx.query('SELECT item_id FROM public.pharmacy_route_items WHERE route_id=$1 ORDER BY item_id',[old.id])).rows.map(i=>i.item_id as string);
     for(const id of itemIds){if(!(await tx.query('SELECT i.id FROM public.prescription_items i JOIN public.prescription_version_items vi ON vi.item_id=i.id AND vi.version_id=$2 WHERE i.id=$1 AND i.root_id=$3 FOR UPDATE OF i',[id,head.id,root.id])).rowCount)deny();
      if((await tx.query('SELECT id FROM public.pharmacy_dispenses WHERE item_id=$1',[id])).rowCount)fail('PHARMACY_CONFLICT');
      const bound=(await tx.query('SELECT ri.route_id,v.state FROM public.pharmacy_route_items ri JOIN LATERAL(SELECT state FROM public.pharmacy_route_versions WHERE route_id=ri.route_id ORDER BY version DESC LIMIT 1) v ON true WHERE ri.item_id=$1 ORDER BY ri.sequence DESC LIMIT 1',[id])).rows[0];if(bound&&bound.state!=='WITHDRAWN')fail('PHARMACY_CONFLICT');}
     await tx.query('INSERT INTO public.pharmacy_routes(id,root_id,patient_id,pharmacy_id,author_user_id,assignment_id,predecessor_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[result,root.id,root.patient_id,input.destinationId,a.userId,grants.get(s!.patient_id),command==='REROUTE'?target:null]);
     for(const id of itemIds){const prev=(await tx.query('SELECT * FROM public.pharmacy_route_items WHERE item_id=$1 ORDER BY sequence DESC LIMIT 1',[id])).rows[0];await tx.query('INSERT INTO public.pharmacy_route_items(route_id,root_id,patient_id,item_id,sequence,predecessor_id) VALUES($1,$2,$3,$4,$5,$6)',[result,root.id,root.patient_id,id,(prev?.sequence??0)+1,prev?.id??null]);}
     versionId=await version(result,1,'PENDING');
    }
    await operation(tx,a,command,input,{op,target,result,version:versionId,dispense:null,correction:null});await final();if(!await eligible(tx,root.id))fail('PHARMACY_CONFLICT');return{status:command==='WITHDRAW'?200:201,...await view(tx,null,root.id,result)};
   });
  }catch(e){return translate(e);}
 }
 async function staff(command:'ACCEPT'|'DISPENSE'|'CORRECT'|'REVERSE',principal:AuthPrincipal,value:unknown){
  const input=pharmacyInput(command,value),a=actor(principal),h=await hint(input.routeId!),previous=await priorHint(a,command,input.operationKey),hints=[h,previous].filter((h):h is Hint=>!!h);
  return staffRun(a,input.pharmacyId!,hints,async(tx,members,final)=>{
   if(!h||h.pharmacy_id!==input.pharmacyId)deny();const r=await route(tx,h.id);if(!r||await privacy(tx,h.root_id))deny();
   const correcting=['CORRECT','REVERSE'].includes(command);
   if(!correcting&&(!await eligible(tx,h.root_id,command==='DISPENSE')||r.state==='WITHDRAWN'))deny();
   if(command==='DISPENSE'&&!(await tx.query('SELECT item_id FROM public.pharmacy_route_items WHERE route_id=$1 AND item_id=$2',[r.id,input.itemId])).rowCount)deny();
   if(correcting&&!(await tx.query('SELECT id FROM public.pharmacy_dispenses WHERE id=$1 AND route_id=$2 AND pharmacy_id=$3',[input.dispenseId,r.id,h.pharmacy_id])).rowCount)deny();
   const prior=(await tx.query('SELECT * FROM public.pharmacy_operations WHERE actor_user_id=$1 AND command=$2 AND operation_key=$3',[a.userId,command,input.operationKey])).rows[0];
   if(prior){const ph=await hint(prior.target_route_id,tx);if(!ph||!hints.some(x=>x.id===ph.id)||await privacy(tx,ph.root_id)||!correcting&&!await eligible(tx,ph.root_id,command==='DISPENSE'))deny();if(prior.fingerprint!==hash(input))fail('PHARMACY_CONFLICT');return{status:200,...await view(tx,ph.pharmacy_id,null,prior.result_route_id,pharmacyPage({purpose:correcting?'history':'fulfillment'}),true,true)};}
   const op=randomUUID(),member=members.get(h.pharmacy_id)!;let version:string|null=null,dispense:string|null=null,correction:string|null=null;
   if(command==='ACCEPT'){
    if(r.version!==input.expectedVersion||r.state!=='PENDING')fail('PHARMACY_CONFLICT');version=randomUUID();await tx.query("INSERT INTO public.pharmacy_route_versions(id,route_id,version,command,state,actor_user_id,membership_id,operation_id) VALUES($1,$2,$3,'ACCEPT','ACCEPTED',$4,$5,$6)",[version,r.id,r.version+1,a.userId,member,op]);
   }else if(command==='DISPENSE'){
    if(r.version!==input.expectedVersion||r.state!=='ACCEPTED')fail('PHARMACY_CONFLICT');
    if(!(await tx.query('SELECT item_id FROM public.pharmacy_route_items WHERE route_id=$1 AND item_id=$2 FOR SHARE',[r.id,input.itemId])).rowCount)deny();
    await tx.query('SELECT id FROM public.prescription_items WHERE id=$1 FOR UPDATE',[input.itemId]);if((await tx.query('SELECT id FROM public.pharmacy_dispenses WHERE item_id=$1',[input.itemId])).rowCount)fail('PHARMACY_CONFLICT');
    dispense=randomUUID();await tx.query("INSERT INTO public.pharmacy_dispenses(id,route_id,item_id,root_id,patient_id,pharmacy_id,medication_id,medication_display,quantity,unit,actor_user_id,membership_id,operation_id) SELECT $1,$2,i.id,$3,$4,$5,i.medication_id,i.medication_display,i.quantity,i.unit,$6,$7,$8 FROM public.prescription_items i WHERE i.id=$9",[dispense,r.id,h.root_id,h.patient_id,h.pharmacy_id,a.userId,member,op,input.itemId]);
   }else{
    const fact=(await tx.query('SELECT * FROM public.pharmacy_dispenses WHERE id=$1 AND route_id=$2 AND pharmacy_id=$3 FOR UPDATE',[input.dispenseId,r.id,h.pharmacy_id])).rows[0];if(!fact)deny();
    const prev=(await tx.query('SELECT * FROM public.pharmacy_dispense_corrections WHERE dispense_id=$1 ORDER BY version DESC LIMIT 1',[fact.id])).rows[0];if((prev?.version??0)!==input.expectedVersion||prev?.kind==='REVERSAL')fail('PHARMACY_CONFLICT');
    dispense=fact.id;correction=randomUUID();await tx.query('INSERT INTO public.pharmacy_dispense_corrections(id,dispense_id,route_id,item_id,pharmacy_id,version,predecessor_id,kind,actor_user_id,membership_id,reason,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[correction,fact.id,r.id,fact.item_id,h.pharmacy_id,(prev?.version??0)+1,prev?.id??null,command==='CORRECT'?'CORRECTION':'REVERSAL',a.userId,member,input.reason,op]);
   }
   await operation(tx,a,command,input,{op,target:r.id,result:r.id,version,dispense,correction});await final();if(!correcting&&!await eligible(tx,h.root_id,command==='DISPENSE'))deny();
   // Correction receipts are artifact-scoped even while the route still has
   // other eligible items; the normal history queue remains separately filtered.
   return{status:command==='ACCEPT'?200:201,...await view(tx,h.pharmacy_id,null,r.id,pharmacyPage({purpose:correcting?'history':'fulfillment'}),true,true)};
  },async tx=>{for(const target of hints){if(await privacy(tx,target.root_id))deny();if(!['CORRECT','REVERSE'].includes(command)&&!await eligible(tx,target.root_id,command==='DISPENSE'))deny();}});
 }
 return{
  async destinations(principal:AuthPrincipal,page:unknown={}){
   const a=actor(principal),p=pharmacyPage(page);try{return await source.run(a,null,[],false,async tx=>{if(a.role!=='CLINICIAN'||p.purpose!=='fulfillment')deny();const result=(await tx.query("WITH visible AS MATERIALIZED(SELECT id,name FROM public.organizations WHERE kind='PHARMACY' AND status='ACTIVE') SELECT (SELECT count(*)::int FROM visible) total,coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id) FROM (SELECT * FROM visible ORDER BY id LIMIT $1 OFFSET $2) p),'[]'::jsonb) data",[p.pageSize,(p.page-1)*p.pageSize])).rows[0];return{data:result.data,meta:{page:p.page,pageSize:p.pageSize,total:result.total}};},true);}catch(e){return translate(e);}
  },
  async execute(command:PharmacyCommand,a:AuthPrincipal,value:unknown){try{return ['ROUTE','WITHDRAW','REROUTE'].includes(command)?await clinician(command as 'ROUTE'|'WITHDRAW'|'REROUTE',a,value):await staff(command as 'ACCEPT'|'DISPENSE'|'CORRECT'|'REVERSE',a,value);}catch(e){return translate(e);}},
  async read(principal:AuthPrincipal,pharmacyId:string,routeId:string|null=null,page:unknown={}){
   const a=actor(principal),p=pharmacyPage(page);let org:string,id:string|null;try{org=availabilityId(pharmacyId);id=routeId===null?null:availabilityId(routeId);}catch{return deny();}
   const h=id?await hint(id):undefined;return staffRun(a,org,h?[h]:[],async tx=>{if(id&&(!h||h.pharmacy_id!==org))deny();return view(tx,org,null,id,p,true);});
  },
 };
}
