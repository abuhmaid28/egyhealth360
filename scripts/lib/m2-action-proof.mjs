import assert from 'node:assert/strict';
import { isolatedCareActions,counts,exclude,privacy,withdraw } from '../../tests/support/care-actions.mjs';
import { observeApplicabilityQueries,signal,waitBlockedBy } from '../../tests/support/observed-applicability.mjs';

// Explicit disposable synthetic verification tool. Never imported by product/startup/worker.
// Logical content is fixed; real database receipt/activation times and UUIDs are not fabricated.
export async function verifyInitialCareActionProof() {
 await isolatedCareActions(async f=>{
  const other=f.principals['clinician-unassigned'];
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.identities['clinician-unassigned'].profileId,f.patientId]);
  const c=await f.command(),different=await f.command({...f.selection,bpId:(await f.make()).id},other);
  const entered=signal(),release=signal();let once=false,blocker;
  const restore=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO public.care_action_decisions/.test(q.text)){once=true;blocker=q.pid;entered.resolve();return release.promise.then(next);}return next();});
  let created;
  try{
   const winner=f.actions.generateInitialAction(f.actor,c);await entered.promise;
   const loser=f.actions.generateInitialAction(other,different).then(()=>null,e=>e.code);
   await waitBlockedBy(f.pool,blocker);release.resolve();created=await winner;assert.equal(await loser,'CARE_ACTION_CONFLICT');
  }finally{release.resolve();restore();}
  assert.equal(created.created,true);assert.equal(created.action.triggerAt.toISOString(),f.measuredAt);
  const d=(await f.pool.query('SELECT * FROM care_action_decisions')).rows[0];
  assert.deepEqual(Object.fromEntries(Object.entries(d.inputs).filter(([key])=>key!=='bpOrigin')),c.expectedInputs);assert.equal(d.selecting_user_id,f.actor.userId);
  assert.equal(d.inputs.rule.rule_key,'CR-HTN-FU-001');assert.equal(d.inputs.template.version,'1.0.0-draft');assert.equal(d.inputs.source.source_key,'WHO-HTN-2021');
  assert.deepEqual(await f.actions.generateInitialAction(other,c),{...created,created:false});
  const schedule=(await f.pool.query('SELECT eh014_add_months($1,3) r,eh014_add_months($1,6) d',[f.measuredAt])).rows[0];
  assert.equal(created.action.recommendedAt.toISOString(),schedule.r.toISOString());assert.equal(created.action.dueBy.toISOString(),schedule.d.toISOString());
  const fixed=(await f.pool.query("SELECT eh014_add_months('2025-01-31T10:20:30.123Z',3) r,eh014_add_months('2025-01-31T10:20:30.123Z',6) d")).rows[0];
  assert.equal(fixed.r.toISOString(),'2025-04-30T10:20:30.123Z');assert.equal(fixed.d.toISOString(),'2025-07-31T10:20:30.123Z');
  await exclude(f);await withdraw(f);
  assert.deepEqual(await f.actions.inspectAction(f.actor,{patientId:f.patientId,actionId:created.action.id}),created.action);
  assert.deepEqual((await f.pool.query('SELECT inputs FROM care_action_decisions')).rows[0].inputs,d.inputs);
  await privacy(f);
  for(const actor of [f.actor,f.principals['patient-a']]){
   assert.deepEqual(await f.actions.listActions(actor,{patientId:f.patientId,page:1,pageSize:1}),{total:0,actions:[]});
   await assert.rejects(f.actions.inspectAction(actor,{patientId:f.patientId,actionId:created.action.id}),e=>e.code==='CARE_ACTION_NOT_FOUND');
  }
  await assert.rejects(f.actions.generateInitialAction(f.actor,c),e=>e.code==='CARE_ACTION_NOT_FOUND');
  await assert.rejects(f.actions.listActions(f.principals['patient-b'],{patientId:f.patientId,page:1,pageSize:1}),e=>e.code==='CARE_ACTION_NOT_FOUND');
  assert.deepEqual(await counts(f.pool),{actions:1,decisions:1,audits:2});
 });
 for(const stale of [exclude,privacy,withdraw])await isolatedCareActions(async f=>{
  const c=await f.command();await stale(f);await assert.rejects(f.actions.generateInitialAction(f.actor,c));
  assert.deepEqual(await counts(f.pool),{actions:0,decisions:0,audits:0});
 });
 return {manifest:'eh-m2-initial-action-proof-v1',result:'PASS',scope:'INITIAL_ONLY',milestone:'M2_IN_PROGRESS',cases:4};
}
