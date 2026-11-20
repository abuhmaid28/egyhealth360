import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {closeCommand,closeSnapshot,closeRace} from '../support/consultation-close.mjs';
import {observeApplicabilityQueries,waitBlocked,waitBlockedBy} from '../support/observed-applicability.mjs';
const reject=(p,code)=>assert.rejects(p,e=>e.code===code);

for(const sameKey of [false,true])for(const rollback of [false,true])test(`I2S7 close vs close sameKey=${sameKey} winnerRollback=${rollback}`,()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), a=closeCommand(c),b=closeCommand(c,sameKey?a.operationKey:randomUUID());
  const results=await closeRace(f,()=>f.consultations.closeConsultation(f.actors.clinician,a),()=>f.consultations.closeConsultation(f.actors.clinician,b),{name:'close/close',rollback,expected:rollback?['BOOKING_UNAVAILABLE','COMMIT']:['COMMIT',sameKey?'COMMIT':'BOOKING_CONFLICT']});
  if(sameKey&&!rollback)assert.deepEqual(results[0].value,results[1].value);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM booking_operations WHERE command='CLOSE'")).rows[0].n,1);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM booking_events WHERE command='CLOSE'")).rows[0].n,1);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type='CONSULTATION_CLOSED'")).rows[0].n,1);
  assert.equal((await f.pool.query('SELECT state FROM consultations')).rows[0].state,'CLOSED');
}));

for(const change of ['ASSIGNMENT','SESSION','CLINICIAN','PATIENT','ORG','MEMBERSHIP','AFFILIATION'])for(const revokeFirst of [true,false])test(`I2S7 close current authority ${change} revocationFirst=${revokeFirst}`,()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),command=closeCommand(c);
  const update=async(sql,args)=>{const x=await f.pool.connect();try{await x.query('BEGIN');await x.query(sql,args);await x.query('COMMIT');}finally{await x.query('ROLLBACK');x.release();}};
  const assignment=(await f.pool.query('SELECT assignment_id FROM consultations')).rows[0].assignment_id;
  const changes={
    ASSIGNMENT:()=>f.exitRelationships.end(f.actors.patient,{assignmentId:assignment}),
    SESSION:()=>update('UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.clinician.sessionId]),
    CLINICIAN:()=>update("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]),
    PATIENT:()=>update("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]),
    ORG:()=>f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0}),
    MEMBERSHIP:()=>f.store.endMembership(f.actors.admin2,{organizationId:f.clinicOrg.id,membershipId:f.membership.id}),
    AFFILIATION:()=>f.directory.withdrawAffiliation(f.actors.admin2,{providerId:f.provider.id,publicationId:f.publication.id}),
  };
  const patterns={ASSIGNMENT:/UPDATE "public"\."clinician_patient_assignments"/,SESSION:/UPDATE public\.sessions/,CLINICIAN:/UPDATE public\.users/,PATIENT:/UPDATE public\.users/,ORG:/UPDATE "public"\."organizations"/,MEMBERSHIP:/UPDATE "public"\."organization_memberships"/,AFFILIATION:/UPDATE "public"\."directory_affiliations"/};
  const denied=['SESSION','CLINICIAN'].includes(change)?'BOOKING_UNAUTHENTICATED':'BOOKING_NOT_FOUND';
  const close=()=>f.consultations.closeConsultation(f.actors.clinician,command);
  await closeRace(f,revokeFirst?changes[change]:close,revokeFirst?close:changes[change],{name:'close/'+change,pattern:revokeFirst?patterns[change]:undefined,expected:revokeFirst?['COMMIT',denied]:['COMMIT','COMMIT']});
  const state=(await f.pool.query('SELECT state FROM consultations')).rows[0].state;assert.equal(state,revokeFirst?'OPEN':'CLOSED');
  await reject(close(),denied);
}));

test('I2S7 close audit failure rolls both transitions/history back and leaves exact key reusable',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),command=closeCommand(c),before=await closeSnapshot(f);
  await f.pool.query("CREATE FUNCTION public.synthetic_close_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='CONSULTATION_CLOSED' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_close_audit_failure BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.synthetic_close_audit_failure()");
  await reject(f.consultations.closeConsultation(f.actors.clinician,command),'BOOKING_UNAVAILABLE');assert.deepEqual(await closeSnapshot(f),before);
  await f.pool.query('DROP TRIGGER synthetic_close_audit_failure ON public.audit_logs; DROP FUNCTION public.synthetic_close_audit_failure()');
  await f.consultations.closeConsultation(f.actors.clinician,command);
}));

test('I2S7 close expiry after advisory wait and tentative audit rolls back with reusable operation key',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),command=closeCommand(c),before=await closeSnapshot(f),x=await f.pool.connect();let pending;
  try {
    await x.query('BEGIN');const blocker=(await x.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    await x.query('SELECT pg_advisory_xact_lock(1162359376,hashtext($1))',[f.users.patient.profileId]);
    await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);
    pending=f.consultations.closeConsultation(f.actors.clinician,command);pending.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);
    await f.pool.query('SELECT pg_sleep(2.1)');await x.query('ROLLBACK');await reject(pending,'BOOKING_UNAUTHENTICATED');assert.deepEqual(await closeSnapshot(f),before);
    console.log('I2S7_CLOSE_EXPIRY',JSON.stringify({blockerPid:blocker,waiterPid:waiter,pgBlockingPidsObserved:true}));
  }finally{await x.query('ROLLBACK');x.release();await Promise.allSettled([pending]);}
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);
  let held=false;const stop=observeApplicabilityQueries((q,next)=>!held&&/INSERT INTO public\.audit_logs/.test(q.text)?(held=true,Promise.resolve(next()).then(async r=>{await f.pool.query('SELECT pg_sleep(2.1)');return r;})):next());
  try{await reject(f.consultations.closeConsultation(f.actors.clinician,command),'BOOKING_UNAUTHENTICATED');assert.ok(held);assert.deepEqual(await closeSnapshot(f),before);}finally{stop();}
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 hour' WHERE id=$1",[f.actors.clinician.sessionId]);await f.consultations.closeConsultation(f.actors.clinician,command);
}));

test('I2S7 close actual timeout/deadlock fails sanitized with no retry or partial state',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),command=closeCommand(c),before=await closeSnapshot(f),x=await f.pool.connect();let pending,inverted;
  try {
    await x.query('BEGIN');await x.query("SET LOCAL deadlock_timeout='10s'");const blocker=(await x.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    await x.query('SELECT pg_advisory_xact_lock(1162359376,hashtext($1))',[f.users.patient.profileId]);
    let attempts=0;const stop=observeApplicabilityQueries((q,next)=>{if(q.text==='BEGIN')attempts++;return next();});
    try{pending=f.consultations.closeConsultation(f.actors.clinician,command);pending.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);await reject(pending,'BOOKING_UNAVAILABLE');assert.equal(attempts,1);assert.deepEqual(await closeSnapshot(f),before);console.log('I2S7_CLOSE_TIMEOUT',JSON.stringify({blockerPid:blocker,waiterPid:waiter,noAutomaticRetry:true}));}finally{stop();}
    pending=f.consultations.closeConsultation(f.actors.clinician,command);pending.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);
    inverted=x.query("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]);inverted.catch(()=>{});await waitBlocked(f.pool,blocker,4000,waiter);
    await reject(pending,'BOOKING_UNAVAILABLE');await inverted;await x.query('ROLLBACK');assert.deepEqual(await closeSnapshot(f),before);console.log('I2S7_CLOSE_DEADLOCK',JSON.stringify({blockerPid:blocker,waiterPid:waiter,noAutomaticRetry:true}));
  }finally{await x.query('ROLLBACK');x.release();await Promise.allSettled([pending,inverted]);}
  await f.consultations.closeConsultation(f.actors.clinician,command);
}));
