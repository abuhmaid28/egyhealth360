import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPrescriptions,prescriptionBody,prescriptionCounts,rxReject} from '../support/prescriptions.mjs';
import {rxRace,rxWrite} from '../support/prescription-races.mjs';
import {observeApplicabilityQueries,waitBlockedBy,waitBlocked} from '../support/observed-applicability.mjs';
import {createRelationshipPersistence} from '../../packages/db/dist/index.js';
async function prepare(f,kind) {
 const c=await f.readyRx(),d=await f.draft(c);let source=d;
 if(['CANCEL','REPLACE'].includes(kind))source=await f.command(c,d,'SIGN');
 const key=randomUUID(),extra=kind==='DRAFT'?prescriptionBody({operationKey:key}):kind==='EDIT'?prescriptionBody({operationKey:key}):kind==='REPLACE'?prescriptionBody({operationKey:key,reason:'Synthetic correction'}):kind==='CANCEL'||kind==='PRIVACY'?{operationKey:key,reason:'Synthetic reason'}:{operationKey:key};
 const run=()=>kind==='DRAFT'?f.draft(c,extra):f.command(c,source,kind,extra);return {c,d:source,extra,key,run};
}
for(const kind of ['SIGN','EDIT'])for(const sameKey of [false,true])for(const rollback of [false,true])test(`I3S1 ${kind} competing sameKey=${sameKey} rollback=${rollback}`,()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,kind),before=await prescriptionCounts(f);await rxRace(f,op.run,()=>sameKey?op.run():f.command(op.c,op.d,kind,{...op.extra,operationKey:randomUUID()}),{name:kind+'/competing',rollback,expected:rollback?['PRESCRIPTION_UNAVAILABLE','COMMIT']:['COMMIT',sameKey?'COMMIT':'PRESCRIPTION_CONFLICT']});const after=await prescriptionCounts(f);assert.equal(after.prescription_operations,before.prescription_operations+1);assert.equal(after.audit_logs,before.audit_logs+1);
}));
for(const change of ['ASSIGNMENT','SESSION','MEMBERSHIP','ORG','AFFILIATION','CLINICIAN','PATIENT'])for(const revokeFirst of [false,true])test(`I3S1 sign vs ${change} revocationFirst=${revokeFirst}`,()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,'SIGN'),relationships=createRelationshipPersistence(f.url);
 try {
 const update=async(sql,args)=>{const x=await f.pool.connect();try{await x.query('BEGIN');await x.query(sql,args);await x.query('COMMIT');}finally{await x.query('ROLLBACK');x.release();}};
 const assignment=(await f.pool.query('SELECT assignment_id FROM consultations WHERE id=$1',[op.c.id])).rows[0].assignment_id;
 const changes={ASSIGNMENT:()=>relationships.end(f.actors.patient,{assignmentId:assignment}),SESSION:()=>update('UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.clinician.sessionId]),MEMBERSHIP:()=>f.store.endMembership(f.actors.admin2,{organizationId:f.clinicOrg.id,membershipId:f.membership.id}),ORG:()=>f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0}),AFFILIATION:()=>f.directory.withdrawAffiliation(f.actors.admin2,{providerId:f.provider.id,publicationId:f.publication.id}),CLINICIAN:()=>update("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]),PATIENT:()=>update("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.patient.id])};
 const patterns={ASSIGNMENT:/UPDATE "public"\."clinician_patient_assignments"/,SESSION:/UPDATE public\.sessions/,MEMBERSHIP:/UPDATE "public"\."organization_memberships"/,ORG:/UPDATE "public"\."organizations"/,AFFILIATION:/UPDATE "public"\."directory_affiliations"/,CLINICIAN:/UPDATE public\.users/,PATIENT:/UPDATE public\.users/};
 const denied=['SESSION','CLINICIAN'].includes(change)?'PRESCRIPTION_UNAUTHENTICATED':'PRESCRIPTION_NOT_FOUND';
 await rxRace(f,revokeFirst?changes[change]:op.run,revokeFirst?op.run:changes[change],{name:'sign/'+change,pattern:revokeFirst?patterns[change]:rxWrite,expected:revokeFirst?['COMMIT',denied]:['COMMIT','COMMIT']});await rxReject(op.run(),denied);
 }finally{await relationships.close();}
}));
for(const cancelFirst of [false,true])test('I3S1 cancel vs replace first='+cancelFirst,()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,'REPLACE'),cancel=()=>f.command(op.c,op.d,'CANCEL',{reason:'Synthetic cancel'});await rxRace(f,cancelFirst?cancel:op.run,cancelFirst?op.run:cancel,{name:'cancel/replace'});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM prescriptions')).rows[0].n,cancelFirst?1:2);
}));
for(const kind of ['SIGN','EDIT','CANCEL','REPLACE','READ','REPLAY'])for(const privacyFirst of [false,true])test(`I3S1 privacy vs ${kind} privacyFirst=${privacyFirst}`,()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,['READ','REPLAY'].includes(kind)?'SIGN':kind);if(['READ','REPLAY'].includes(kind))await op.run();
 const privacy=()=>f.command(op.c,op.d,'PRIVACY',{reason:'Wrong patient'}),other=kind==='READ'?()=>f.prescriptions.signedRead(f.actors.patient,null,op.d.data.id):op.run;
 const pattern=privacyFirst?/INSERT INTO public\.prescription_privacy_restrictions/:kind==='READ'?/WITH visible AS MATERIALIZED/:rxWrite;
 // Replay is read-only: pause its projection after current authority/privacy.
 await rxRace(f,privacyFirst?privacy:other,privacyFirst?other:privacy,{name:'privacy/'+kind,pattern:!privacyFirst&&kind==='REPLAY'?/WITH visible AS MATERIALIZED/:pattern,expected:privacyFirst?['COMMIT','PRESCRIPTION_NOT_FOUND']:['COMMIT','COMMIT']});
}));
for(const kind of ['DRAFT','EDIT','SIGN','CANCEL','REPLACE','PRIVACY'])test('I3S1 '+kind+' atomic audit failure, rollback key reuse and no retries',()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,kind),before=await prescriptionCounts(f);await f.pool.query("CREATE FUNCTION public.synthetic_rx_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='prescription' THEN RAISE EXCEPTION 'synthetic'; END IF; RETURN NEW; END $$; CREATE TRIGGER synthetic_rx_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION synthetic_rx_audit_failure()");let attempts=0;const stop=observeApplicabilityQueries((q,next)=>{if(/INSERT INTO public\.prescription_operations/.test(q.text))attempts++;return next();});try{await rxReject(op.run(),'PRESCRIPTION_UNAVAILABLE');assert.equal(attempts,1);assert.deepEqual(await prescriptionCounts(f),before);}finally{stop();await f.pool.query('DROP TRIGGER synthetic_rx_audit_failure ON audit_logs;DROP FUNCTION synthetic_rx_audit_failure()');}await op.run();
}));
test('I3S1 lock timeout, statement timeout, deadlock and rollback keep operation key reusable without retry',()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,'SIGN'),before=await prescriptionCounts(f),x=await f.pool.connect();let pending,inverted;
 try {
 await x.query('BEGIN');await x.query("SET LOCAL deadlock_timeout='10s'");const blocker=(await x.query('SELECT pg_backend_pid() pid')).rows[0].pid;await x.query('SELECT pg_advisory_xact_lock(1162359376,hashtext($1))',[f.users.patient.profileId]);pending=op.run();pending.catch(()=>{});let waiter=await waitBlockedBy(f.pool,blocker);await rxReject(pending,'PRESCRIPTION_UNAVAILABLE');assert.deepEqual(await prescriptionCounts(f),before);console.log('I3S1_LOCK_TIMEOUT',JSON.stringify({blocker,waiter,noRetry:true}));
 pending=op.run();pending.catch(()=>{});waiter=await waitBlockedBy(f.pool,blocker);inverted=x.query("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]);inverted.catch(()=>{});await waitBlocked(f.pool,blocker,4000,waiter);await rxReject(pending,'PRESCRIPTION_UNAVAILABLE');await inverted;await x.query('ROLLBACK');assert.deepEqual(await prescriptionCounts(f),before);console.log('I3S1_DEADLOCK',JSON.stringify({blocker,waiter,noRetry:true}));
 }finally{await x.query('ROLLBACK');x.release();await Promise.allSettled([pending,inverted]);}
 const signed=await op.run(),op2={run:()=>f.command(op.c,signed,'CANCEL',{reason:'Synthetic cancellation',operationKey:op.key})},snap=await prescriptionCounts(f);
 // Trigger sleeps inside the actual mutation statement, so PostgreSQL enforces its configured timeout.
 await f.pool.query("CREATE FUNCTION public.synthetic_rx_slow() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(11);RETURN NEW; END $$;CREATE TRIGGER synthetic_rx_slow BEFORE INSERT ON prescription_versions FOR EACH ROW EXECUTE FUNCTION synthetic_rx_slow()");
 try{await rxReject(op2.run(),'PRESCRIPTION_UNAVAILABLE');assert.deepEqual(await prescriptionCounts(f),snap);}finally{await f.pool.query('DROP TRIGGER synthetic_rx_slow ON prescription_versions;DROP FUNCTION synthetic_rx_slow()');}await op2.run();
}));
test('I3S1 expiry after lock wait and after audit rolls signing back',()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,'SIGN'),before=await prescriptionCounts(f),x=await f.pool.connect();let pending;
 try {await x.query('BEGIN');const blocker=(await x.query('SELECT pg_backend_pid() pid')).rows[0].pid;await x.query('SELECT pg_advisory_xact_lock(1162359376,hashtext($1))',[f.users.patient.profileId]);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);pending=op.run();pending.catch(()=>{});await waitBlockedBy(f.pool,blocker);await f.pool.query('SELECT pg_sleep(2.1)');await x.query('ROLLBACK');await rxReject(pending,'PRESCRIPTION_UNAUTHENTICATED');assert.deepEqual(await prescriptionCounts(f),before);}finally{await x.query('ROLLBACK');x.release();await Promise.allSettled([pending]);}
 await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);let held=false;const stop=observeApplicabilityQueries((q,next)=>!held&&/INSERT INTO public\.audit_logs/.test(q.text)?(held=true,Promise.resolve(next()).then(async r=>{await f.pool.query('SELECT pg_sleep(2.1)');return r;})):next());try{await rxReject(op.run(),'PRESCRIPTION_UNAUTHENTICATED');assert.ok(held);assert.deepEqual(await prescriptionCounts(f),before);}finally{stop();}await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 hour' WHERE id=$1",[f.actors.clinician.sessionId]);await op.run();
}));
for(const catalogFirst of [false,true])test('I3S1 catalog deactivation vs sign first='+catalogFirst,()=>isolatedPrescriptions(async f=>{
 const op=await prepare(f,'SIGN'),medication=op.d.data.items[0];const deactivate=()=>f.prescriptions.catalogSet(f.actors.admin,{medicationId:medication.medicationId,operationKey:randomUUID(),expectedVersion:1,displayName:medication.medicationDisplay,isActive:false,isPublished:true});
 await rxRace(f,catalogFirst?deactivate:op.run,catalogFirst?op.run:deactivate,{name:'catalog/sign',pattern:catalogFirst?/INSERT INTO public\.medication_versions/:rxWrite,expected:catalogFirst?['COMMIT','PRESCRIPTION_CONFLICT']:['COMMIT','COMMIT']});
}));
test('I3S1 validity expiring after tentative audit rolls back sign and leaves key reusable',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),now=(await f.pool.query('SELECT clock_timestamp() now')).rows[0].now,d=await f.draft(c,prescriptionBody({validUntil:new Date(now.getTime()+1500).toISOString()})),key=randomUUID(),before=await prescriptionCounts(f);let held=false;
 const stop=observeApplicabilityQueries((q,next)=>!held&&/INSERT INTO public\.audit_logs/.test(q.text)?(held=true,Promise.resolve(next()).then(async r=>{await f.pool.query('SELECT pg_sleep(1.6)');return r;})):next());try{await rxReject(f.command(c,d,'SIGN',{operationKey:key}),'PRESCRIPTION_CONFLICT');assert.ok(held);assert.deepEqual(await prescriptionCounts(f),before);}finally{stop();}
 const edited=await f.command(c,d,'EDIT',prescriptionBody());await f.command(c,edited,'SIGN',{operationKey:key});
}));
