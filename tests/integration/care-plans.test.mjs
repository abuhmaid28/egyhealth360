import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedPlans,planSnapshot,waitBlocked } from '../support/care-plans.mjs';
import { insertTemplate,insertRule } from '../support/clinical-catalog.mjs';
const rejects=(promise,code)=>assert.rejects(promise,e=>{assert.equal(e.code,code);assert.equal(e.message,code);return true;});
const sqlReject=promise=>assert.rejects(promise,e=>['23514','23503','23505','23001','22P02'].includes(e.code));

test('assigned clinician creates pinned drafts; lifecycle, exact audits, zero-write retries and historical specifications',()=>isolatedPlans(async f=>{
  const {plans,actor,patientId,create,target,pool,definition}=f;
  assert.deepEqual(Object.keys(plans).sort(),['activatePlan','cancelPlan','close','createDraftPlan','inspectDeferredActionSpecification','inspectPlan']);
  const p=await create(),other=await create();assert.notEqual(p.id,other.id);
  assert.equal(p.patientId,patientId);assert.equal(p.templateId,definition.template.id);assert.equal(p.ruleDefinitionId,definition.rule.id);assert.equal(p.createdByUserId,actor.userId);
  assert.equal(p.status,'DRAFT');assert.equal(p.startedAt,null);assert.equal(p.cancelledAt,null);
  for(const state of ['DRAFT','ACTIVE','CANCELLED']) {
    if(state==='ACTIVE')assert.equal((await plans.activatePlan(actor,target(p))).changed,true);
    if(state==='CANCELLED')assert.equal((await plans.cancelPlan(actor,target(p))).changed,true);
    const before=await planSnapshot(pool),current=await plans.inspectPlan(actor,target(p));assert.equal(current.status,state);
    const spec=await plans.inspectDeferredActionSpecification(actor,target(p));
    assert.deepEqual(Object.keys(spec).sort(),['actionType','patientId','persistence','planId','planStatus','ruleDefinitionId','templateId','timing','triggerRequirement','unmetGates']);
    assert.deepEqual(spec,{planId:p.id,patientId,templateId:p.templateId,ruleDefinitionId:p.ruleDefinitionId,planStatus:state,
      actionType:'HTN_BP_FOLLOWUP',triggerRequirement:'QUALIFYING_OBSERVED_BP_ASSESSMENT',
      timing:{recommendedWindowStart:{operation:'ADD_CALENDAR_MONTHS',value:3},dueBy:{operation:'ADD_CALENDAR_MONTHS',value:6}},
      persistence:'DEFERRED',unmetGates:['PERSISTED_QUALIFYING_EVIDENCE','APPROVED_CALENDAR_ARITHMETIC','OCCURRENCE_RETRIGGER_SELECTION']});
    assert.deepEqual(await plans.inspectDeferredActionSpecification(actor,target(p)),spec);
    if(state!=='DRAFT')assert.equal((await plans[state==='ACTIVE'?'activatePlan':'cancelPlan'](actor,target(p))).changed,false);
    assert.deepEqual(await planSnapshot(pool),before);
  }
  await rejects(plans.activatePlan(actor,target(p)),'CARE_PLAN_INVALID_STATE');
  const cancelled=(await plans.cancelPlan(actor,target(other))).plan;assert.equal(cancelled.startedAt,null);assert.ok(cancelled.cancelledAt>=cancelled.createdAt);
  const audit=(await pool.query("SELECT * FROM audit_logs WHERE entity_id=$1 ORDER BY timestamp,id",[p.id])).rows;
  assert.deepEqual(audit.map(a=>a.action_type).sort(),['CARE_PLAN_ACTIVATED','CARE_PLAN_CANCELLED','CARE_PLAN_CREATED']);
  assert.ok(audit.every(a=>a.actor_user_id===actor.userId&&a.entity_type==='care_plan'&&JSON.stringify(a.safe_metadata)==='{}'));
}));
for(const role of ['patient-a','admin','clinician-unassigned'])test(`${role} denied every public operation without audit`,()=>isolatedPlans(async({plans,principals,create,target,pool})=>{
  const p=await create(),actor=principals[role],before=await planSnapshot(pool);
  await rejects(plans.createDraftPlan(actor,{patientId:p.patientId}),'CARE_PLAN_NOT_FOUND');
  for(const method of ['activatePlan','cancelPlan','inspectPlan','inspectDeferredActionSpecification'])await rejects(plans[method](actor,target(p)),'CARE_PLAN_NOT_FOUND');
  assert.deepEqual(await planSnapshot(pool),before);
}));
for(const mode of ['revoked','expired','disabled','role','missing-profile','wrong-patient','nonexistent','invalid','extra'])test(`current actor/scope validation: ${mode}`,()=>isolatedPlans(async f=>{
  const {pool,plans,actor,create,target,identities}=f,p=await create();let a=actor,t=target(p),code='CARE_PLAN_NOT_FOUND';
  if(mode==='revoked'){await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[actor.sessionId]);code='CARE_PLAN_UNAUTHENTICATED';}
  if(mode==='expired'){await pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE id=$1",[actor.sessionId]);code='CARE_PLAN_UNAUTHENTICATED';}
  if(mode==='disabled'){await pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[actor.userId]);code='CARE_PLAN_UNAUTHENTICATED';}
  if(mode==='role')a={...actor,role:'ADMIN'};
  if(mode==='missing-profile') {
    await pool.query('DELETE FROM clinician_profiles WHERE id=$1',[identities['clinician-unassigned'].profileId]);
    a=f.principals['clinician-unassigned'];
  }
  if(mode==='wrong-patient')t={...t,patientId:identities['patient-b'].profileId};
  if(mode==='nonexistent')t={...t,planId:randomUUID()};
  if(mode==='invalid'){t={...t,planId:'invalid'};code='CARE_PLAN_INVALID';}
  if(mode==='extra'){t={...t,status:'ACTIVE'};code='CARE_PLAN_INVALID';}
  const before=await planSnapshot(pool);
  if(['revoked','expired','disabled','role','missing-profile','wrong-patient'].includes(mode))await rejects(plans.createDraftPlan(a,{patientId:t.patientId}),code);
  for(const method of ['activatePlan','cancelPlan','inspectPlan','inspectDeferredActionSpecification'])await rejects(plans[method](a,t),code);
  assert.deepEqual(await planSnapshot(pool),before);
}));
test('one ACTIVE plan; losing activation rolls back; cancelled plan frees slot',()=>isolatedPlans(async({plans,actor,create,target,pool})=>{
  const a=await create(),b=await create();const results=await Promise.allSettled([plans.activatePlan(actor,target(a)),plans.activatePlan(actor,target(b))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'CARE_PLAN_ACTIVE_CONFLICT');
  assert.equal((await pool.query("SELECT count(*)::int n FROM care_plans WHERE status='ACTIVE'")).rows[0].n,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type='CARE_PLAN_ACTIVATED'")).rows[0].n,1);
  const active=results.find(r=>r.status==='fulfilled').value.plan;await plans.cancelPlan(actor,target(active));
  await plans.activatePlan(actor,target(active.id===a.id?b:a));
}));
test('concurrent activate/cancel serializes with retained lifecycle history',()=>isolatedPlans(async({plans,actor,create,target,pool})=>{
  const p=await create();const results=await Promise.allSettled([plans.activatePlan(actor,target(p)),plans.cancelPlan(actor,target(p))]);
  assert.equal((await plans.inspectPlan(actor,target(p))).status,'CANCELLED');
  for(const r of results)if(r.status==='rejected')assert.equal(r.reason.code,'CARE_PLAN_INVALID_STATE');
  assert.equal((await pool.query("SELECT count(*)::int n FROM audit_logs WHERE entity_id=$1 AND action_type='CARE_PLAN_CANCELLED'",[p.id])).rows[0].n,1);
}));
test('retirement blocks new creation/activation but retains inspection, specification and cancellation',()=>isolatedPlans(async({plans,actor,create,target,catalog,definition,pool})=>{
  const a=await create(),d=await create();await plans.activatePlan(actor,target(a));const before=(await pool.query('SELECT * FROM care_plans ORDER BY id')).rows;
  await catalog.retireTemplateVersion(definition.template.id);assert.deepEqual((await pool.query('SELECT * FROM care_plans ORDER BY id')).rows,before);
  await rejects(create(),'CARE_PLAN_DEFINITION_UNAVAILABLE');await rejects(plans.activatePlan(actor,target(d)),'CARE_PLAN_DEFINITION_UNAVAILABLE');
  for(const p of [a,d]){assert.equal((await plans.inspectPlan(actor,target(p))).id,p.id);assert.equal((await plans.inspectDeferredActionSpecification(actor,target(p))).persistence,'DEFERRED');await plans.cancelPlan(actor,target(p));}
}));
for(const phase of ['create','activate','cancel'])test(`audit failure rolls back ${phase}`,()=>isolatedPlans(async({pool,plans,actor,create,target})=>{
  const p=phase==='create'?null:await create();
  await pool.query("CREATE FUNCTION fail_eh010_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'secret failure'; END $$; CREATE TRIGGER test_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_eh010_audit()");
  const before=await planSnapshot(pool);await rejects(phase==='create'?create():plans[phase==='activate'?'activatePlan':'cancelPlan'](actor,target(p)),'CARE_PLAN_SERVICE_UNAVAILABLE');assert.deepEqual(await planSnapshot(pool),before);
}));
test('ordinary SQL rejects immutable identities/timestamps, invalid lifecycle and all removal',()=>isolatedPlans(async({pool,create,plans,actor,target})=>{
  const p=await create();
  for(const field of ['id','patient_id','template_id','rule_definition_id','created_by_user_id'])await sqlReject(pool.query(`UPDATE care_plans SET ${field}=$1 WHERE id=$2`,[randomUUID(),p.id]));
  for(const field of ['created_at','started_at','cancelled_at'])await sqlReject(pool.query(`UPDATE care_plans SET ${field}=now()-interval '1 day' WHERE id=$1`,[p.id]));
  await sqlReject(pool.query("UPDATE care_plans SET status='COMPLETED' WHERE id=$1",[p.id]));
  await plans.activatePlan(actor,target(p));await sqlReject(pool.query("UPDATE care_plans SET status='DRAFT' WHERE id=$1",[p.id]));
  await plans.cancelPlan(actor,target(p));for(const status of ['DRAFT','ACTIVE'])await sqlReject(pool.query('UPDATE care_plans SET status=$1 WHERE id=$2',[status,p.id]));
  for(const sql of ['DELETE FROM care_plans','DELETE FROM care_plans WHERE false','TRUNCATE care_plans','TRUNCATE care_plans CASCADE'])await sqlReject(pool.query(sql));
  const before=await planSnapshot(pool);await pool.query('UPDATE care_plans SET status=status');assert.deepEqual(await planSnapshot(pool),before);
}));
test('direct SQL exact aggregate, creator, initial status and composite pins are enforced',()=>isolatedPlans(async({pool,definition,actor,patientId})=>{
  const insert=(template,rule,creator=actor.userId,status='DRAFT')=>pool.query('INSERT INTO care_plans(patient_id,template_id,rule_definition_id,created_by_user_id,status) VALUES($1,$2,$3,$4,$5)',[patientId,template,rule,creator,status]);
  for(const status of ['ACTIVE','CANCELLED'])await sqlReject(insert(definition.template.id,definition.rule.id,actor.userId,status));
  await sqlReject(insert(definition.template.id,definition.rule.id,randomUUID()));
  const other=await insertTemplate(pool,definition.source.id,{version:'2.0.0'});const rule=await insertRule(pool,other.id,{ruleVersion:'2.0.0'});
  await sqlReject(insert(other.id,rule.id));await sqlReject(insert(definition.template.id,rule.id));
  await sqlReject(insert(other.id,definition.rule.id));
}));
test('TEMP definition shadows cannot authorize ordinary SQL plans',()=>isolatedPlans(async({pool,definition,patientId,actor})=>{
  const c=await pool.connect();try{await c.query('BEGIN');
    await c.query('CREATE TEMP TABLE care_plan_templates AS SELECT * FROM public.care_plan_templates');
    await c.query('CREATE TEMP TABLE care_rule_definitions AS SELECT * FROM public.care_rule_definitions');
    const fake=randomUUID();await c.query('UPDATE care_plan_templates SET id=$1',[fake]);await c.query('UPDATE care_rule_definitions SET template_id=$1',[fake]);
    await assert.rejects(c.query('INSERT INTO public.care_plans(patient_id,template_id,rule_definition_id,created_by_user_id) VALUES($1,$2,$3,$4)',[patientId,fake,definition.rule.id,actor.userId]));
  }finally{await c.query('ROLLBACK');c.release();}
}));
for(const race of ['session','user','assignment','template'])test(`${race} change wins lock: activation waits then fails closed`,()=>isolatedPlans(async({pool,plans,actor,create,target,assignmentId,definition})=>{
  const p=await create(),c=await pool.connect();try{
    await c.query('BEGIN');
    const sql={session:'UPDATE sessions SET revoked_at=now() WHERE id=$1',user:"UPDATE users SET status='DISABLED' WHERE id=$1",assignment:"UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1",template:"UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1"}[race];
    await c.query(sql,[{session:actor.sessionId,user:actor.userId,assignment:assignmentId,template:definition.template.id}[race]]);
    const blocker=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    const pending=plans.activatePlan(actor,target(p)).then(value=>({value}),error=>({error}));
    let blocked=false;for(let i=0;i<500;i++){const rows=(await pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[blocker])).rows;if(rows.length){blocked=true;break;}}
    assert.equal(blocked,true);await c.query('COMMIT');const result=await pending;
    assert.equal(result.error?.code,race==='template'?'CARE_PLAN_DEFINITION_UNAVAILABLE':['user','session'].includes(race)?'CARE_PLAN_UNAUTHENTICATED':'CARE_PLAN_NOT_FOUND');
    assert.equal((await pool.query('SELECT status FROM care_plans WHERE id=$1',[p.id])).rows[0].status,'DRAFT');
    assert.equal((await pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type='CARE_PLAN_ACTIVATED'")).rows[0].n,0);
  }finally{await c.query('ROLLBACK');c.release();}
}));
test('template SHARE lock actually blocks EH-009 retirement update',()=>isolatedPlans(async({pool,definition})=>{
  const a=await pool.connect(),b=await pool.connect();try{await a.query('BEGIN');await a.query('SELECT id FROM care_plan_templates WHERE id=$1 FOR SHARE',[definition.template.id]);
    const pid=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    const pending=b.query("UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1",[definition.template.id]);await waitBlocked(pool,pid);await a.query('COMMIT');await pending;
  }finally{await a.query('ROLLBACK');a.release();b.release();}
}));
for(const race of ['session','user','assignment','template'])test(`service activation holds ${race} lock through audit and commit`,()=>isolatedPlans(async({pool,plans,actor,create,target,assignmentId,definition})=>{
  const p=await create(),gate=await pool.connect(),change=await pool.connect();
  await pool.query("CREATE FUNCTION pause_eh010_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='CARE_PLAN_ACTIVATED' THEN PERFORM pg_advisory_xact_lock(1010); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_eh010_audit()");
  let activation,mutation;
  try {
    await gate.query('BEGIN');await gate.query('SELECT pg_advisory_xact_lock(1010)');
    const gatePid=(await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    activation=plans.activatePlan(actor,target(p)).then(value=>({value}),error=>({error}));
    let waiting=false;for(let i=0;i<500;i++)if((await pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[gatePid])).rowCount){waiting=true;break;}assert.equal(waiting,true);
    const pid=(await change.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    const sql={session:'UPDATE sessions SET revoked_at=now() WHERE id=$1',user:"UPDATE users SET status='DISABLED' WHERE id=$1",assignment:"UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1",template:"UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1"}[race];
    mutation=change.query(sql,[{session:actor.sessionId,user:actor.userId,assignment:assignmentId,template:definition.template.id}[race]]);
    await waitBlocked(pool,pid);await gate.query('COMMIT');assert.equal((await activation).value?.plan.status,'ACTIVE');await mutation;
    assert.equal((await pool.query('SELECT status FROM care_plans WHERE id=$1',[p.id])).rows[0].status,'ACTIVE');
    assert.equal((await pool.query("SELECT count(*)::int n FROM audit_logs WHERE entity_id=$1 AND action_type='CARE_PLAN_ACTIVATED'",[p.id])).rows[0].n,1);
  }finally{await gate.query('ROLLBACK');if(activation)await activation;if(mutation)await mutation;gate.release();change.release();}
}));
test('TEMP creator/assignment/source shadows cannot bypass structural provenance',()=>isolatedPlans(async({pool,definition,patientId,principals})=>{
  const c=await pool.connect();try{await c.query('BEGIN');
    for(const table of ['users','clinician_profiles','clinician_patient_assignments','guideline_sources'])await c.query(`CREATE TEMP TABLE ${table} AS SELECT * FROM public.${table}`);
    const fake=principals.admin.userId;await c.query("UPDATE users SET role='CLINICIAN' WHERE id=$1",[fake]);
    await c.query('UPDATE clinician_profiles SET user_id=$1',[fake]);
    await assert.rejects(c.query('INSERT INTO public.care_plans(patient_id,template_id,rule_definition_id,created_by_user_id) VALUES($1,$2,$3,$4)',[patientId,definition.template.id,definition.rule.id,fake]),e=>e.constraint==='care_plans_creator_guard');
  }finally{await c.query('ROLLBACK');c.release();}
}));
test('exact SQL column, pin, index and trusted function catalog',()=>isolatedPlans(async({pool})=>{
  const columns=(await pool.query("SELECT column_name,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='care_plans' ORDER BY ordinal_position")).rows;
  assert.deepEqual(columns.map(c=>[c.column_name,c.udt_name,c.is_nullable]),[['id','uuid','NO'],['patient_id','uuid','NO'],['template_id','uuid','NO'],['rule_definition_id','uuid','NO'],['created_by_user_id','uuid','NO'],['status','care_plan_status','NO'],['created_at','timestamptz','NO'],['started_at','timestamptz','YES'],['cancelled_at','timestamptz','YES']]);
  const fks=(await pool.query("SELECT conname,pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='public.care_plans'::regclass AND contype='f' ORDER BY conname")).rows;
  assert.match(fks.find(f=>f.conname==='care_plans_rule_template_fkey').def,/FOREIGN KEY \(rule_definition_id, template_id\) REFERENCES care_rule_definitions\(id, template_id\) ON UPDATE RESTRICT ON DELETE RESTRICT/);
  assert.match(fks.find(f=>f.conname==='care_plans_patient_fkey').def,/REFERENCES patient_profiles\(id\)/);
  const index=(await pool.query("SELECT indisunique,indisvalid,pg_get_expr(indpred,indrelid) predicate,pg_get_indexdef(indexrelid) def FROM pg_index WHERE indexrelid='public.care_plans_active_htn_patient_key'::regclass")).rows[0];
  assert.equal(index.indisunique,true);assert.equal(index.indisvalid,true);assert.match(index.def,/\(patient_id\)/);assert.match(index.predicate,/status = 'ACTIVE'::care_plan_status/);
  const funcs=(await pool.query("SELECT prosecdef,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'eh010_%'")).rows;
  assert.equal(funcs.length,2);assert.ok(funcs.every(f=>f.prosecdef===false&&f.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
}));
