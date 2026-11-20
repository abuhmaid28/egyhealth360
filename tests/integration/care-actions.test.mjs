import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedCareActions,counts,exclude,privacy,withdraw } from '../support/care-actions.mjs';
import { observeApplicabilityQueries,signal,waitBlockedBy } from '../support/observed-applicability.mjs';
const rejects=(p,code)=>assert.rejects(p,e=>e.code===code);
const use=isolatedCareActions;

test('EH014 durable INITIAL exact acceptance, immutable replay, both audits and stable retry without encounter/appointment',()=>use(async f=>{
 const c=await f.command();assert.equal(await f.pool.query('SELECT count(*)::int n FROM care_actions').then(r=>r.rows[0].n),0);
 const r=await f.actions.generateInitialAction(f.actor,c);assert.equal(r.created,true);assert.equal(r.action.triggerAt.toISOString(),f.measuredAt);
 assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
 const d=(await f.pool.query('SELECT * FROM care_action_decisions')).rows[0];
 assert.deepEqual(Object.fromEntries(Object.entries(d.inputs).filter(([key])=>key!=='bpOrigin')),c.expectedInputs);assert.equal(d.selecting_user_id,f.actor.userId);assert.equal(d.bp_id,f.bp.id);
 const audit=(await f.pool.query("SELECT * FROM audit_logs WHERE action_type LIKE 'CARE_ACTION_%' ORDER BY action_type")).rows;
 assert.equal(audit[0].actor_user_id,null);assert.equal(audit[1].actor_user_id,f.actor.userId);assert.ok(audit.every(a=>JSON.stringify(a.safe_metadata)==='{}'));
 assert.deepEqual(await f.actions.generateInitialAction(f.actor,c),{...r,created:false});
 await rejects(f.actions.generateInitialAction(f.actor,{...c,operationId:randomUUID()}),'CARE_ACTION_CONFLICT');
 assert.equal((await f.actions.listActions(f.principals['patient-a'],{patientId:f.patientId,page:1,pageSize:1})).total,1);
 assert.equal((await f.actions.inspectAction(f.actor,{patientId:f.patientId,actionId:r.action.id})).id,r.action.id);
 for(const table of ['clinical_encounters','follow_up_appointments'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0);
 await f.make({measuredAt:new Date(Date.parse(f.measuredAt)-1000).toISOString()});
 assert.deepEqual((await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0].inputs,d.inputs);
 await rejects(f.actions.generateInitialAction(f.actor,{...c,bpId:(await f.make()).id}),'CARE_ACTION_CONFLICT');
 assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
}));
for(const source of ['patient-a','clinician-assigned'])test(`EH014 ${source} requires explicit acceptance, association is not acceptance`,()=>use(async f=>{
 const b=await f.make({},f.principals[source]),s={...f.selection,bpId:b.id},c=await f.command(s);
 await rejects(f.actions.generateInitialAction(f.actor,{...c,accepted:false}),'CARE_ACTION_INVALID');
 const r=await f.actions.generateInitialAction(f.actor,c);assert.equal(r.created,true);
 assert.equal((await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0].inputs.bp.source_kind,source==='patient-a'?'PATIENT_SELF_ENTRY':'CLINICIAN_ENTRY');
}));
for(const [systolic,diastolic,ok] of [[139,89,true],[140,89,false],[139,90,false],[140,90,false],[0,-1,true]])test(`EH014 frozen threshold ${systolic}/${diastolic} no invented plausibility bounds`,()=>use(async f=>{
 const bp=await f.make({systolic,diastolic}),c=await f.command({...f.selection,bpId:bp.id});
 if(ok)assert.equal((await f.actions.generateInitialAction(f.actor,c)).created,true);
 else {await rejects(f.actions.generateInitialAction(f.actor,c),'CARE_ACTION_STALE_SELECTION');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});}
}));
for(const field of ['ageYearsAtAssessment','pregnancyStatus','hypertensionStatus','cvdStatus','diabetesStatus','ckdStatus'])test(`EH014 missing/conflicting ${field} fails without guessing`,()=>use(async f=>{
 const values=field==='ageYearsAtAssessment'?{ageAssertionState:'UNKNOWN',ageYearsAtAssessment:null}:{[field]:null};
 const missing=await f.insertSnapshot({effectiveAt:f.measuredAt,assertedAt:f.measuredAt,...values});
 await rejects(f.actions.generateInitialAction(f.actor,await f.command()),'CARE_ACTION_STALE_SELECTION');
 assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
 // Then independently test a single explicit excluding tuple, rather than only disagreement.
 await withdraw(f);await f.retractSnapshot({snapshotId:missing.snapshot.id,assertedAt:f.measuredAt});
 const exclusions={ageYearsAtAssessment:17,pregnancyStatus:'PREGNANT',hypertensionStatus:'ABSENT',cvdStatus:'PRESENT',diabetesStatus:'PRESENT',ckdStatus:'PRESENT'};
 const excluded=await f.insertSnapshot({effectiveAt:f.measuredAt,assertedAt:f.measuredAt,[field]:exclusions[field]});
 await rejects(f.actions.generateInitialAction(f.actor,await f.command({...f.selection,applicabilityId:excluded.snapshot.id})),'CARE_ACTION_STALE_SELECTION');
 if(field==='ageYearsAtAssessment'){
  await f.retractSnapshot({snapshotId:excluded.snapshot.id,assertedAt:f.measuredAt});
  const adult=await f.insertSnapshot({effectiveAt:f.measuredAt,assertedAt:f.measuredAt,ageYearsAtAssessment:18});
  assert.equal((await f.actions.generateInitialAction(f.actor,await f.command({...f.selection,applicabilityId:adult.snapshot.id}))).created,true);
 }
}));
for(const kind of ['point','preplan','withdrawn','membership','expected','excluded','private'])test(`EH014 stale ${kind} cannot substitute or persist`,()=>use(async f=>{
 let c=await f.command();
 if(kind==='point'){const x=await f.insertSnapshot({effectiveAt:new Date(Date.parse(f.measuredAt)-1).toISOString(),assertedAt:f.measuredAt});c=await f.command({...f.selection,applicabilityId:x.snapshot.id});}
 if(kind==='preplan'){const at=new Date(Date.parse(f.measuredAt)-1).toISOString(),b=await f.make({measuredAt:at}),a=await f.insertSnapshot({effectiveAt:at,assertedAt:at});c=await f.command({...f.selection,bpId:b.id,applicabilityId:a.snapshot.id});}
 if(kind==='withdrawn')await withdraw(f);
 if(kind==='membership')await f.insertSnapshot({effectiveAt:f.measuredAt,assertedAt:f.measuredAt});
 if(kind==='expected')c.expectedInputs.bp.systolic=130;
 if(kind==='excluded')await exclude(f);
 if(kind==='private')await privacy(f);
 await rejects(f.actions.generateInitialAction(f.actor,c),kind==='private'?'CARE_ACTION_NOT_FOUND':'CARE_ACTION_STALE_SELECTION');
 assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
}));
for(const role of ['patient-a','patient-b','admin','clinician-unassigned'])test(`EH014 current authorization denies ${role}`,()=>use(async f=>{
 await rejects(f.actions.generateInitialAction(f.principals[role],await f.command()),'CARE_ACTION_NOT_FOUND');
 await rejects(f.actions.previewSelection(f.principals[role],f.selection),'CARE_ACTION_NOT_FOUND');
 const read={patientId:f.patientId,page:1,pageSize:20};
 if(role==='patient-a')assert.deepEqual(await f.actions.listActions(f.principals[role],read),{total:0,actions:[]});
 else {
  await rejects(f.actions.listActions(f.principals[role],read),'CARE_ACTION_NOT_FOUND');
  await rejects(f.actions.inspectAction(f.principals[role],{patientId:f.patientId,actionId:randomUUID()}),'CARE_ACTION_NOT_FOUND');
 }
 assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
}));
test('EH014 strict input, hidden keys, getters, IDOR, operation conflict and copying before await',()=>use(async f=>{
 const c=await f.command();
 for(const bad of [{...c,actorUserId:f.actor.userId},{...c,accepted:undefined},{...c,expectedInputs:{...c.expectedInputs,groundTruth:true}}])await assert.rejects(f.actions.generateInitialAction(f.actor,bad));
 const hidden={...c};Object.defineProperty(hidden,'secret',{value:1});await rejects(f.actions.generateInitialAction(f.actor,hidden),'CARE_ACTION_INVALID');
 const getter={...c};Object.defineProperty(getter,'expectedInputs',{get(){throw Error('must not execute');}});await rejects(f.actions.generateInitialAction(f.actor,getter),'CARE_ACTION_INVALID');
 await rejects(f.actions.generateInitialAction(f.actor,{...c,patientId:f.identities['patient-b'].profileId}),'CARE_ACTION_NOT_FOUND');
 const entered=signal(),release=signal();let once=false;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&/SELECT id FROM public.users/.test(q.text)){once=true;entered.resolve();return release.promise.then(next);}return next();});
 try{const pending=f.actions.generateInitialAction(f.actor,c);await entered.promise;c.expectedInputs.bp.systolic=1;c.bpId=randomUUID();release.resolve();assert.equal((await pending).created,true);}finally{release.resolve();restore();}
}));
for(const event of ['CARE_ACTION_CREATED','CARE_ACTION_TRIGGER_SELECTED'])test(`EH014 ${event} audit fault rolls everything back`,()=>use(async f=>{
 await f.pool.query(`CREATE FUNCTION eh014_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='${event}' THEN RAISE EXCEPTION 'PRIVATE_CANARY'; END IF; RETURN NEW; END $$; CREATE TRIGGER eh014_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION eh014_fail()`);
 await rejects(f.actions.generateInitialAction(f.actor,await f.command()),'CARE_ACTION_UNAVAILABLE');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
}));
for(const change of ['exclude','privacy','withdraw','correct'])test(`EH014 later ${change} preserves historical action and snapshot; privacy suppresses all ordinary views`,()=>use(async f=>{
 const c=await f.command(),r=await f.actions.generateInitialAction(f.actor,c),before=(await f.pool.query('SELECT * FROM care_action_decisions')).rows;
 if(change==='exclude')await exclude(f);if(change==='privacy')await privacy(f);if(change==='withdraw')await withdraw(f);
 if(change==='correct')await f.amend.correct(f.actor,{patientId:f.patientId,bpId:f.bp.id,operationId:randomUUID(),reason:'DATA_ENTRY_ERROR',expectedState:'UNEXCLUDED',duplicateOfBpId:null,replacement:{systolic:138,diastolic:88,unit:'mmHg',measuredAt:f.measuredAt}});
 assert.deepEqual((await f.pool.query('SELECT * FROM care_action_decisions')).rows,before);
 for(const actor of [f.actor,f.principals['patient-a']]){
  const list=await f.actions.listActions(actor,{patientId:f.patientId,page:1,pageSize:1});assert.equal(list.total,change==='privacy'?0:1);
  if(change==='privacy'){assert.deepEqual(list.actions,[]);await rejects(f.actions.inspectAction(actor,{patientId:f.patientId,actionId:r.action.id}),'CARE_ACTION_NOT_FOUND');}
  else assert.deepEqual(await f.actions.inspectAction(actor,{patientId:f.patientId,actionId:r.action.id}),r.action);
 }
 if(change==='privacy')await rejects(f.actions.generateInitialAction(f.actor,c),'CARE_ACTION_NOT_FOUND');else assert.deepEqual(await f.actions.generateInitialAction(f.actor,c),{...r,created:false});
 assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
}));
for(const state of ['cancel','retire'])test(`EH014 ${state} blocks creation but exact historical retry is a no-op`,()=>use(async f=>{
 const c=await f.command(),r=await f.actions.generateInitialAction(f.actor,c);
 if(state==='cancel')await f.plans.cancelPlan(f.actor,{patientId:f.patientId,planId:f.plan.id});else await f.pool.query("UPDATE care_plan_templates SET status='RETIRED'");
 assert.deepEqual(await f.actions.generateInitialAction(f.actor,c),{...r,created:false});
}));
for(const state of ['DRAFT','CANCELLED','RETIRED'])test(`EH014 new action requires ACTIVE/PUBLISHED: ${state}`,()=>use(async f=>{
 let s=f.selection;
 if(state==='DRAFT'){const p=await f.create();s={...s,planId:p.id};}
 if(state==='CANCELLED')await f.plans.cancelPlan(f.actor,{patientId:f.patientId,planId:f.plan.id});
 if(state==='RETIRED')await f.pool.query("UPDATE care_plan_templates SET status='RETIRED'");
 await rejects(f.actions.generateInitialAction(f.actor,await f.command(s)),'CARE_ACTION_STALE_SELECTION');
}));

test('EH014 SQL/Prisma unconditional history guards, exact FK ownership and no partial decision',()=>use(async f=>{
 await f.actions.generateInitialAction(f.actor,await f.command());
 for(const t of ['care_actions','care_action_decisions','care_action_applicability_inputs'])for(const sql of [`UPDATE ${t} SET patient_id=patient_id WHERE false`,`DELETE FROM ${t} WHERE false`,`TRUNCATE ${t} CASCADE`])await assert.rejects(f.pool.query(sql));
 for(const model of ['careAction','careActionDecision','careActionApplicabilityInput']){await assert.rejects(f.prisma[model].deleteMany());await assert.rejects(f.prisma[model].updateMany({data:{patientId:randomUUID()}}));}
 const d=(await f.pool.query('SELECT id FROM care_action_decisions')).rows[0];
 await assert.rejects(f.pool.query('INSERT INTO care_action_applicability_inputs(decision_id,snapshot_id,patient_id) VALUES($1,$2,$3)',[d.id,randomUUID(),f.patientId]));
 // Defeat only the write guard in rollback-only scaffolding to independently exercise composite FKs.
 const db=await f.pool.connect();try{await db.query('BEGIN');await db.query('ALTER TABLE care_actions DISABLE TRIGGER care_action_immutable');await assert.rejects(db.query('UPDATE care_actions SET patient_id=$1',[f.identities['patient-b'].profileId]));}finally{await db.query('ROLLBACK');db.release();}
}));

test('EH014 damaged protected membership fails unavailable without raw expansion',()=>use(async f=>{
 const r=await f.actions.generateInitialAction(f.actor,await f.command());
 await f.pool.query('ALTER TABLE care_action_applicability_inputs DISABLE TRIGGER care_input_immutable; DELETE FROM care_action_applicability_inputs; ALTER TABLE care_action_applicability_inputs ENABLE TRIGGER care_input_immutable');
 await rejects(f.actions.inspectAction(f.actor,{patientId:f.patientId,actionId:r.action.id}),'CARE_ACTION_UNAVAILABLE');
 await rejects(f.actions.listActions(f.actor,{patientId:f.patientId,page:1,pageSize:20}),'CARE_ACTION_UNAVAILABLE');
}));

for(const mode of ['same','different','rollback'])test(`EH014 actual concurrent INITIAL ${mode} with distinct clinicians/sessions`,{timeout:45000},()=>use(async f=>{
 const other=f.principals['clinician-unassigned'];await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.identities['clinician-unassigned'].profileId,f.patientId]);
 const c=await f.command(),c2=mode==='different'?await f.command({...f.selection,bpId:(await f.make()).id},other):{...c};
 const entered=signal(),release=signal();let once=false,blocker;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO public.care_action_decisions/.test(q.text)){once=true;blocker=q.pid;entered.resolve();return release.promise.then(()=>mode==='rollback'?Promise.reject(Error('winner rollback')):next());}return next();});
 try{
  const a=f.actions.generateInitialAction(f.actor,c);const first=a.then(v=>({v}),e=>({e}));await entered.promise;
  const second=f.actions.generateInitialAction(other,c2).then(v=>({v}),e=>({e}));await waitBlockedBy(f.pool,blocker);release.resolve();const [x,y]=await Promise.all([first,second]);
  if(mode==='rollback'){assert.equal(x.e.code,'CARE_ACTION_UNAVAILABLE');assert.equal(y.v.created,true);}else{assert.equal(x.v.created,true);if(mode==='different')assert.equal(y.e.code,'CARE_ACTION_CONFLICT');else assert.deepEqual(y.v,{...x.v,created:false});}
  assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
 }finally{release.resolve();restore();}
}));
for(const kind of ['exclude','privacy','withdraw'])for(const winner of ['change','generation'])test(`EH014 real ${kind} race ${winner} wins`,{timeout:45000},()=>use(async f=>{
 const c=await f.command(),entered=signal(),release=signal();let once=false,blocker;
 const other=f.principals['clinician-unassigned'];
 if(kind!=='withdraw')await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.identities['clinician-unassigned'].profileId,f.patientId]);
 const marker=winner==='generation'?/INSERT INTO public.care_action_decisions/:kind==='withdraw'?/INSERT INTO public.observed_applicability_retractions/:/INSERT INTO "public"\."bp_amendment_operations"/;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&marker.test(q.text)){once=true;blocker=q.pid;entered.resolve();return release.promise.then(next);}return next();});
 const mutate=()=>kind==='exclude'?exclude({...f,actor:other}):kind==='privacy'?privacy({...f,actor:other}):withdraw(f);
 try{
  const first=(winner==='generation'?f.actions.generateInitialAction(f.actor,c):mutate()).then(v=>({v}),e=>({e}));await entered.promise;
  const second=(winner==='generation'?mutate():f.actions.generateInitialAction(f.actor,c)).then(v=>({v}),e=>({e}));await waitBlockedBy(f.pool,blocker);release.resolve();const [a,b]=await Promise.all([first,second]);assert.equal(a.e,undefined);
  if(winner==='change'){assert.equal(b.e.code,kind==='privacy'?'CARE_ACTION_NOT_FOUND':'CARE_ACTION_STALE_SELECTION');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});}
  else {assert.equal(b.e,undefined);assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});}
 }finally{release.resolve();restore();}
}));

test('EH014 independent UTC Gregorian calendar vectors, offsets, century/leap, timezone and overflow',()=>use(async f=>{
 const vectors=[
 ['2025-01-31T10:20:30.123Z','2025-04-30T10:20:30.123Z','2025-07-31T10:20:30.123Z'],
 ['2023-11-30T08:00:00Z','2024-02-29T08:00:00.000Z','2024-05-30T08:00:00.000Z'],
 ['2024-11-30T08:00:00Z','2025-02-28T08:00:00.000Z','2025-05-30T08:00:00.000Z'],
 ['2024-02-29T08:09:10.007Z','2024-05-29T08:09:10.007Z','2024-08-29T08:09:10.007Z'],
 ['1899-11-30T23:59:59.999Z','1900-02-28T23:59:59.999Z','1900-05-30T23:59:59.999Z'],
 ['1999-11-30T23:59:59.999Z','2000-02-29T23:59:59.999Z','2000-05-30T23:59:59.999Z'],
 ['2024-03-01T00:30:00.123+02:00','2024-05-29T22:30:00.123Z','2024-08-29T22:30:00.123Z'],
 ['0001-01-31T00:00:00Z','0001-04-30T00:00:00.000Z','0001-07-31T00:00:00.000Z']];
 for(const tz of ['UTC','Africa/Cairo','America/New_York']){const db=await f.pool.connect();try{
  await db.query("SELECT set_config('TimeZone',$1,false)",[tz]);
  for(const [t,a,b]of vectors){const r=(await db.query('SELECT eh014_add_months($1,3) a,eh014_add_months($1,6) b',[t])).rows[0];assert.equal(r.a.toISOString(),a);assert.equal(r.b.toISOString(),b);}
 }finally{await db.query("SET TimeZone='UTC'");db.release();}}
 for(const t of ['9999-10-31T00:00:00Z','infinity','0001-01-01T00:00:00.000001Z'])await assert.rejects(f.pool.query('SELECT eh014_add_months($1,6)',[t]));
}));

for(const kind of ['session','user','assignment','mapping'])for(const winner of ['change','generation'])test(`EH014 real authority ${kind}: ${winner} wins`,{timeout:45000},()=>use(async f=>{
 const c=await f.command(),db=await f.pool.connect();const entered=signal(),release=signal();let once=false,blocker;
 const statements={session:['UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',f.actor.sessionId],user:["UPDATE users SET status='DISABLED' WHERE id=$1",f.actor.userId],assignment:["UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE id=$1",f.assignmentId],mapping:["UPDATE clinician_profiles SET user_id=(SELECT id FROM users WHERE email='eh014-mapping@example.invalid') WHERE id=$1",f.identities['clinician-assigned'].profileId]};
 if(kind==='mapping')await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES('eh014-mapping@example.invalid','synthetic-only','CLINICIAN')");
 const [sql,id]=statements[kind];let restore=()=>{};
 try{
  if(winner==='change'){
   await db.query('BEGIN');await db.query(sql,[id]);const pid=(await db.query('SELECT pg_backend_pid() pid')).rows[0].pid;
   const pending=f.actions.generateInitialAction(f.actor,c).then(v=>({v}),e=>({e}));await waitBlockedBy(f.pool,pid);await db.query('COMMIT');const r=await pending;
   {assert.equal(r.e.code,['session','user'].includes(kind)?'CARE_ACTION_UNAUTHENTICATED':'CARE_ACTION_NOT_FOUND');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});}
  }else{
   restore=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO public.care_action_decisions/.test(q.text)){once=true;blocker=q.pid;entered.resolve();return release.promise.then(next);}return next();});
   const first=f.actions.generateInitialAction(f.actor,c);await entered.promise;const second=db.query(sql,[id]);await waitBlockedBy(f.pool,blocker);release.resolve();assert.equal((await first).created,true);await second;
  }
 }finally{entered.resolve();release.resolve();restore();await db.query('ROLLBACK');db.release();}
}));

test('EH014 expiry after selection rolls decision/action/audits back',()=>use(async f=>{
 const c=await f.command();await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE id=$1",[f.actor.sessionId]);
 let once=false;const restore=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO public.care_action_decisions/.test(q.text)){once=true;return new Promise(resolve=>setTimeout(resolve,1100)).then(next);}return next();});
 try{await rejects(f.actions.generateInitialAction(f.actor,c),'CARE_ACTION_UNAUTHENTICATED');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});}finally{restore();}
}));

test('EH014 bounded deterministic synthetic M2 implementation proof', {timeout:90000},async()=>{
 const {verifyInitialCareActionProof}=await import('../../scripts/lib/m2-action-proof.mjs');
 assert.deepEqual(await verifyInitialCareActionProof(),{manifest:'eh-m2-initial-action-proof-v1',result:'PASS',scope:'INITIAL_ONLY',milestone:'M2_IN_PROGRESS',cases:4});
});

test('EH014 guarded SQL cannot commit orphan state or omit required atomic audit',()=>use(async f=>{
 const c=await f.command();const protectedInputs=(await f.pool.query('SELECT eh014_inputs($1,$2,$3) inputs',[c.planId,c.bpId,c.applicabilityId])).rows[0].inputs;const db=await f.pool.connect();
 for(const withAction of [false,true]){
  const decisionId=randomUUID(),actionId=randomUUID();await db.query('BEGIN');
  try{
   await db.query(`INSERT INTO care_action_decisions(id,action_id,patient_id,care_plan_id,template_id,rule_definition_id,bp_id,applicability_id,selecting_user_id,assignment_id,operation_key,accepted,inputs,trigger_at,recommended_at,due_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$13,$13)`,[decisionId,actionId,f.patientId,f.plan.id,f.plan.templateId,f.plan.ruleDefinitionId,f.bp.id,f.observation.snapshot.id,f.actor.userId,f.assignmentId,randomUUID(),JSON.stringify(protectedInputs),f.measuredAt]);
   if(withAction){
    await db.query(`INSERT INTO care_actions(id,patient_id,care_plan_id,template_id,rule_definition_id,decision_id,occurrence,action_type,trigger_at,recommended_at,due_by) SELECT action_id,patient_id,care_plan_id,template_id,rule_definition_id,id,'INITIAL','HTN_BP_FOLLOWUP',trigger_at,recommended_at,due_by FROM care_action_decisions WHERE id=$1`,[decisionId]);
    await db.query(`INSERT INTO care_action_applicability_inputs(decision_id,snapshot_id,patient_id) VALUES($1,$2,$3)`,[decisionId,f.observation.snapshot.id,f.patientId]);
   }
   await assert.rejects(db.query('SET CONSTRAINTS ALL IMMEDIATE'));
  }finally{await db.query('ROLLBACK');}
 }
 db.release();assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
}));

test('EH014 retained wrong-patient operation masks actions even with missing privacy/exclusion children',()=>use(async f=>{
 const c=await f.command(),r=await f.actions.generateInitialAction(f.actor,c);await privacy(f);
 await f.pool.query('ALTER TABLE bp_privacy_targets DISABLE TRIGGER bp_privacy_immutable; DELETE FROM bp_privacy_targets; ALTER TABLE bp_privacy_targets ENABLE TRIGGER bp_privacy_immutable; ALTER TABLE bp_exclusions DISABLE TRIGGER bp_exclusion_immutable; DELETE FROM bp_exclusions; ALTER TABLE bp_exclusions ENABLE TRIGGER bp_exclusion_immutable');
 assert.deepEqual(await f.actions.listActions(f.actor,{patientId:f.patientId,page:1,pageSize:20}),{total:0,actions:[]});
 await rejects(f.actions.inspectAction(f.actor,{patientId:f.patientId,actionId:r.action.id}),'CARE_ACTION_NOT_FOUND');
 await rejects(f.actions.generateInitialAction(f.actor,c),'CARE_ACTION_NOT_FOUND');
}));

test('EH014 post-start trigger with exact retrospective applicability is valid and cannot drift',()=>use(async f=>{
 const at=new Date(Date.parse(f.measuredAt)+1).toISOString();
 const b=await f.make({measuredAt:at}),a=await f.insertSnapshot({effectiveAt:at,assertedAt:new Date().toISOString()});
 const c=await f.command({...f.selection,bpId:b.id,applicabilityId:a.snapshot.id});
 const r=await f.actions.generateInitialAction(f.actor,c);assert.equal(r.action.triggerAt.toISOString(),at);
 const before=(await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0].inputs;
 await f.insertSnapshot({effectiveAt:at,assertedAt:new Date().toISOString()});
 assert.deepEqual(await f.actions.generateInitialAction(f.actor,c),{...r,created:false});
 assert.deepEqual((await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0].inputs,before);
}));

test('EH014 encounter association supplies no implicit acceptance and no generation side effect',()=>use(async f=>{
 const {createClinicalEncounterPersistence}=await import('../../packages/db/dist/index.js');const encounters=createClinicalEncounterPersistence(f.url);
 try{
  const e=await encounters.createClinicalEncounter(f.actor,{patientId:f.patientId,occurredAt:f.measuredAt,purpose:'HTN_BP_FOLLOWUP'});
  await encounters.associateBloodPressureMeasurement(f.actor,{patientId:f.patientId,encounterId:e.id,measurementId:f.bp.id});
  assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
  await rejects(f.actions.generateInitialAction(f.actor,{...await f.command(),accepted:false}),'CARE_ACTION_INVALID');
  assert.equal((await f.actions.generateInitialAction(f.actor,await f.command())).created,true);
 }finally{await encounters.close();}
}));

test('EH014 successful command key cannot move scopes; revoked exact retries retain authorization requirements',()=>use(async f=>{
 const c=await f.command();await f.actions.generateInitialAction(f.actor,c);
 await f.plans.cancelPlan(f.actor,{patientId:f.patientId,planId:f.plan.id});const next=await f.create();await f.plans.activatePlan(f.actor,f.target(next));
 await rejects(f.actions.generateInitialAction(f.actor,{...c,planId:next.id}),'CARE_ACTION_CONFLICT');
 await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actor.sessionId]);
 await rejects(f.actions.generateInitialAction(f.actor,c),'CARE_ACTION_UNAUTHENTICATED');
 assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
}));

for(const kind of ['cancel','retire'])for(const winner of ['change','generation'])test(`EH014 lifecycle ${kind}: ${winner} wins actual locks`,{timeout:45000},()=>use(async f=>{
 const c=await f.command(),db=await f.pool.connect(),entered=signal(),release=signal();let once=false,blocker,restore=()=>{};
 const sql=kind==='cancel'?"UPDATE care_plans SET status='CANCELLED' WHERE id=$1":"UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1",id=kind==='cancel'?f.plan.id:f.plan.templateId;
 try{
  if(winner==='change'){
   await db.query('BEGIN');await db.query(sql,[id]);const pid=(await db.query('SELECT pg_backend_pid() pid')).rows[0].pid;
   const pending=f.actions.generateInitialAction(f.actor,c).then(v=>({v}),e=>({e}));await waitBlockedBy(f.pool,pid);await db.query('COMMIT');assert.equal((await pending).e.code,'CARE_ACTION_STALE_SELECTION');assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
  }else{
   restore=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO public.care_action_decisions/.test(q.text)){once=true;blocker=q.pid;entered.resolve();return release.promise.then(next);}return next();});
   const first=f.actions.generateInitialAction(f.actor,c);await entered.promise;const second=db.query(sql,[id]);await waitBlockedBy(f.pool,blocker);release.resolve();const r=await first;await second;assert.equal(r.created,true);assert.deepEqual(await f.actions.generateInitialAction(f.actor,c),{...r,created:false});
  }
 }finally{entered.resolve();release.resolve();restore();await db.query('ROLLBACK');db.release();}
}));

test('EH014 corrected replacement needs explicit acceptance and coherent originating amendment',()=>use(async f=>{
 const r=await f.amend.correct(f.actor,{patientId:f.patientId,bpId:f.bp.id,operationId:randomUUID(),reason:'DATA_ENTRY_ERROR',expectedState:'UNEXCLUDED',duplicateOfBpId:null,replacement:{systolic:138,diastolic:88,unit:'mmHg',measuredAt:f.measuredAt}});
 const s={...f.selection,bpId:r.replacementId};
 // Explicit predecessor privacy does not propagate to the replacement, and preflight cannot reveal it.
 await privacy(f);
 const c=await f.command(s);assert.equal(Object.hasOwn(c.expectedInputs,'bpOrigin'),false);
 assert.equal(JSON.stringify(c.expectedInputs).includes(f.bp.id),false);
 await rejects(f.actions.generateInitialAction(f.actor,{...c,accepted:false}),'CARE_ACTION_INVALID');
 const created=await f.actions.generateInitialAction(f.actor,c);assert.equal(created.created,true);
 assert.equal((await f.actions.listActions(f.actor,{patientId:f.patientId,page:1,pageSize:20})).total,1);
 const d=(await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0];assert.equal(d.inputs.bpOrigin.id,r.operationId);
 await f.pool.query('ALTER TABLE bp_exclusions DISABLE TRIGGER bp_exclusion_immutable; DELETE FROM bp_exclusions; ALTER TABLE bp_exclusions ENABLE TRIGGER bp_exclusion_immutable');
 await rejects(f.actions.inspectAction(f.actor,{patientId:f.patientId,actionId:created.action.id}),'CARE_ACTION_UNAVAILABLE');
 await rejects(f.actions.previewSelection(f.actor,s),'CARE_ACTION_UNAVAILABLE');
}));
