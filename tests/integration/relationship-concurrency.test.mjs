import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../support/directory.mjs';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';
const fixture=run=>isolatedDirectory(run,{relationships:true});
const authorize=(f,key=randomUUID())=>f.relationships.authorize(f.actors.patient,{providerId:f.provider.publicId,operationKey:key});
const decide=(f,r,what)=>f.relationships.decide(f.actors[what==='withdraw'?'patient':'clinician'],{requestId:r.id},what);
const reject=(p,code)=>assert.rejects(p,e=>e.code===code);
const audits=async f=>(await f.pool.query("SELECT action_type,entity_id,actor_user_id,safe_metadata FROM audit_logs WHERE action_type LIKE 'RELATIONSHIP_%' OR action_type LIKE 'CLINICIAN_PATIENT_RELATIONSHIP_%' ORDER BY timestamp,id")).rows;
async function held(f,pattern,first,second,check,rollback=false){
 const entered=signal(),release=signal();let once=false,a,b;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&pattern.test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve(q.pid);await release.promise;if(rollback)throw Error('Synthetic winner rollback');return r;});}return next();});
 try{a=first();a.catch(()=>{});const blocker=await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();const results=await Promise.allSettled([a,b]);await check(results);console.log('I1S5_POSTGRES_RACE',JSON.stringify({lock:pattern.source,blockerPid:blocker,waiterPid:waiter,rollback,outcomes:results.map(x=>x.status==='fulfilled'?'committed':x.reason.code)}));}
 finally{release.resolve();restore();await Promise.allSettled([a,b]);}
}
for(const rollback of [false,true])test(`I1S5 duplicate authorization absent-row serialization, winner ${rollback?'rollback':'commit'}`,()=>fixture(async f=>{
 const key=randomUUID();await held(f,/INSERT INTO "public"\."relationship_requests"/,()=>authorize(f,key),()=>authorize(f,key),async r=>{
  assert.equal(r[1].status,'fulfilled');assert.equal(r[1].value.changed,rollback);if(rollback)assert.equal(r[0].reason.code,'RELATIONSHIP_UNAVAILABLE');else{assert.equal(r[0].value.request.id,r[1].value.request.id);assert.equal(r[0].value.changed,true);}
 },rollback);assert.equal((await f.pool.query('SELECT count(*)::int n FROM relationship_requests')).rows[0].n,1);assert.equal((await audits(f)).length,1);
}));
for(const rollback of [false,true])test(`I1S5 concurrent acceptance, winner ${rollback?'rollback':'commit'}`,()=>fixture(async f=>{
 const r=(await authorize(f)).request;await held(f,/UPDATE "public"\."relationship_requests"/,()=>decide(f,r,'accept'),()=>decide(f,r,'accept'),async results=>{
  assert.equal(results[1].status,'fulfilled');assert.equal(results[1].value.changed,rollback);if(rollback)assert.equal(results[0].reason.code,'RELATIONSHIP_UNAVAILABLE');else assert.equal(results[0].value.request.assignmentId,results[1].value.request.assignmentId);
 },rollback);assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,1);assert.equal((await audits(f)).length,3);
}));
for(const other of ['withdraw','decline'])for(const acceptFirst of [true,false])test(`I1S5 acceptance vs ${other}, ${acceptFirst?'accept':'other'} first`,()=>fixture(async f=>{
 const r=(await authorize(f)).request;await held(f,/UPDATE "public"\."relationship_requests"/,()=>decide(f,r,acceptFirst?'accept':other),()=>decide(f,r,acceptFirst?other:'accept'),async results=>{
  assert.equal(results[0].status,'fulfilled');if(acceptFirst&&other==='withdraw')assert.equal(results[1].status,'fulfilled');else assert.equal(results[1].reason.code,'RELATIONSHIP_CONFLICT');
 });
 const request=(await f.pool.query('SELECT * FROM relationship_requests WHERE id=$1',[r.id])).rows[0],assignments=(await f.pool.query('SELECT * FROM clinician_patient_assignments')).rows;
 assert.equal(request.status,acceptFirst?'ACCEPTED':other==='withdraw'?'WITHDRAWN':'DECLINED');assert.equal(assignments.length,acceptFirst?1:0);
 if(acceptFirst){assert.equal(assignments[0].status,other==='withdraw'?'ENDED':'ACTIVE');assert.equal((await audits(f)).length,other==='withdraw'?5:3);}else assert.equal((await audits(f)).length,2);
}));
for(const who of ['patient','clinician'])for(const disableFirst of [true,false])test(`I1S5 ${who} disable vs accept, ${disableFirst?'disable':'accept'} first`,()=>fixture(async f=>{
 const r=(await authorize(f)).request,c=await f.pool.connect();let p;
 try{if(disableFirst){await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users[who].id]);p=decide(f,r,'accept');p.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);await c.query('COMMIT');await reject(p,who==='clinician'?'RELATIONSHIP_UNAUTHENTICATED':'RELATIONSHIP_NOT_FOUND');console.log('I1S5_DISABLE_RACE',JSON.stringify({who,blockerPid:pid,waiterPid:waiter}));}
 else await held(f,/UPDATE "public"\."relationship_requests"/,()=>decide(f,r,'accept'),()=>f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users[who].id]),async r=>assert.ok(r.every(x=>x.status==='fulfilled')));
 assert.equal((await f.pool.query("SELECT count(*)::int n FROM clinician_patient_assignments WHERE status='ACTIVE'")).rows[0].n,disableFirst?0:1);
 }finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([p]);}
}));
for(const what of ['revoked','expired'])test(`I1S5 ${what} session committed while acceptance waits denies, no state/audit`,()=>fixture(async f=>{
 const r=(await authorize(f)).request,before=await audits(f),c=await f.pool.connect();let p;
 try{await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
 await c.query(what==='revoked'?"UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1":"UPDATE sessions SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[f.actors.clinician.sessionId]);
 p=decide(f,r,'accept');p.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);await c.query('COMMIT');await reject(p,'RELATIONSHIP_UNAUTHENTICATED');assert.deepEqual(await audits(f),before);assert.equal((await f.pool.query('SELECT status FROM relationship_requests WHERE id=$1',[r.id])).rows[0].status,'PENDING');console.log('I1S5_SESSION_RACE',JSON.stringify({what,blockerPid:pid,waiterPid:waiter}));
 }finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([p]);}
}));
test('I1S5 final expiry after tentative writes rolls back assignment/request/audit',()=>fixture(async f=>{
 const r=(await authorize(f)).request,before=await audits(f);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);
 const entered=signal(),release=signal();let once=false,p;const restore=observeApplicabilityQueries((q,next)=>{if(!once&&/UPDATE "public"\."relationship_requests"/.test(q.text)){once=true;return Promise.resolve(next()).then(async result=>{entered.resolve();await release.promise;return result;});}return next();});
 try{p=decide(f,r,'accept');p.catch(()=>{});await entered.promise;await f.pool.query('SELECT pg_sleep(2.1)');release.resolve();await reject(p,'RELATIONSHIP_UNAUTHENTICATED');assert.deepEqual(await audits(f),before);assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);}finally{release.resolve();restore();await Promise.allSettled([p]);}
}));
test('I1S5 accepted withdrawal audit failure rolls back end provenance, assignment, request and all audit',()=>fixture(async f=>{
 const r=(await authorize(f)).request,a=(await decide(f,r,'accept')).request.assignmentId,before=await audits(f);
 await f.pool.query("CREATE FUNCTION public.s5_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='RELATIONSHIP_AUTHORIZATION_WITHDRAWN' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER s5_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION public.s5_audit_failure()");
 await reject(decide(f,r,'withdraw'),'RELATIONSHIP_UNAVAILABLE');assert.deepEqual(await audits(f),before);assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[a])).rows[0].status,'ACTIVE');assert.equal((await f.pool.query('SELECT count(*)::int n FROM assignment_end_provenance')).rows[0].n,0);assert.equal((await f.pool.query('SELECT authorization_withdrawn_at FROM relationship_requests WHERE id=$1',[r.id])).rows[0].authorization_withdrawn_at,null);
}));
for(const oldFirst of [true,false])test(`I1S5 old exact end A vs fresh accept B: ${oldFirst?'old-end':'new-grant'} first, no retarget/audit`,()=>fixture(async f=>{
 const r=(await authorize(f)).request,a=(await decide(f,r,'accept')).request.assignmentId;await f.relationships.end(f.actors.patient,{assignmentId:a});const fresh=(await authorize(f)).request,before=await audits(f);
 await held(f,oldFirst?/SELECT id FROM public\.clinician_patient_assignments WHERE id=.*FOR UPDATE/:/UPDATE "public"\."relationship_requests"/,oldFirst?()=>f.relationships.end(f.actors.patient,{assignmentId:a}):()=>decide(f,fresh,'accept'),oldFirst?()=>decide(f,fresh,'accept'):()=>f.relationships.end(f.actors.patient,{assignmentId:a}),async results=>{assert.ok(results.every(x=>x.status==='fulfilled'));assert.equal(results[oldFirst?0:1].value.changed,false);});
 const rows=(await f.pool.query('SELECT id,status FROM clinician_patient_assignments ORDER BY assigned_at,id')).rows;assert.equal(rows.length,2);assert.equal(rows.find(x=>x.id===a).status,'ENDED');assert.equal(rows.filter(x=>x.status==='ACTIVE').length,1);assert.equal((await audits(f)).length,before.length+2);
}));
test('I1S5 pair advisory lock serializes absence, bounded timeout rolls back without stale retry',()=>fixture(async f=>{
 const c=await f.pool.connect();let p;try{await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`eh-i1-relationship-v1:${f.users.clinician.profileId}:${f.users.patient.profileId}`]);assert.equal((await f.pool.query('SELECT count(*)::int n FROM relationship_requests')).rows[0].n,0);
 const start=Date.now();p=authorize(f);p.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);await reject(p,'RELATIONSHIP_UNAVAILABLE');assert.ok(Date.now()-start<9000);assert.deepEqual(await audits(f),[]);console.log('I1S5_ABSENT_PAIR_TIMEOUT',JSON.stringify({blockerPid:pid,waiterPid:waiter}));}finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([p]);}
}));
test('I1S5 real deadlock victim sanitizes and rolls back, no hidden stale retry',()=>fixture(async f=>{
 const c=await f.pool.connect();let p,other;try{await c.query('BEGIN');await c.query("SET LOCAL deadlock_timeout='10s'");const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`eh-i1-relationship-v1:${f.users.clinician.profileId}:${f.users.patient.profileId}`]);p=authorize(f);p.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);other=c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]);other.catch(()=>{});assert.equal(await waitBlockedBy(f.pool,waiter),pid);await reject(p,'RELATIONSHIP_UNAVAILABLE');await other;await c.query('ROLLBACK');assert.deepEqual(await audits(f),[]);console.log('I1S5_DEADLOCK',JSON.stringify({blockerPid:pid,servicePid:waiter}));assert.equal((await authorize(f)).changed,true);}finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([p,other]);}
}));
for(const endFirst of [true,false])test(`I1S5 exact end versus accepted authorization withdrawal, ${endFirst?'clinician end':'patient withdrawal'} first`,()=>fixture(async f=>{
 const r=(await authorize(f)).request,a=(await decide(f,r,'accept')).request.assignmentId,before=await audits(f),end=()=>f.relationships.end(f.actors.clinician,{assignmentId:a}),withdraw=()=>decide(f,r,'withdraw');
 await held(f,/UPDATE "public"\."clinician_patient_assignments"/,endFirst?end:withdraw,endFirst?withdraw:end,async results=>assert.ok(results.every(x=>x.status==='fulfilled')));
 const facts=(await f.pool.query('SELECT actor_role FROM assignment_end_provenance WHERE assignment_id=$1',[a])).rows;assert.deepEqual(facts,[{actor_role:endFirst?'CLINICIAN':'PATIENT'}]);assert.equal((await audits(f)).length,before.length+2);assert.equal((await f.pool.query('SELECT status,authorization_withdrawn_at FROM relationship_requests WHERE id=$1',[r.id])).rows[0].status,'ACCEPTED');
}));
for(const rollback of [false,true])test(`I1S5 different operation keys cannot create duplicate unresolved requests, winner ${rollback?'rollback':'commit'}`,()=>fixture(async f=>{
 await held(f,/INSERT INTO "public"\."relationship_requests"/,()=>authorize(f),()=>authorize(f),async r=>{if(rollback){assert.equal(r[0].reason.code,'RELATIONSHIP_UNAVAILABLE');assert.equal(r[1].status,'fulfilled');}else{assert.equal(r[0].status,'fulfilled');assert.equal(r[1].reason.code,'RELATIONSHIP_CONFLICT');}},rollback);
 assert.equal((await f.pool.query("SELECT count(*)::int n FROM relationship_requests WHERE status='PENDING'")).rows[0].n,1);assert.equal((await audits(f)).length,1);
}));
test('I1S5 acceptance serialized before session revocation commits truthfully, subsequent decision is denied',()=>fixture(async f=>{
 const r=(await authorize(f)).request,tokenHash=(await f.pool.query('SELECT token_hash FROM sessions WHERE id=$1',[f.actors.clinician.sessionId])).rows[0].token_hash;
 await held(f,/UPDATE "public"\."relationship_requests"/,()=>decide(f,r,'accept'),()=>f.auth.revoke(tokenHash),async results=>assert.ok(results.every(x=>x.status==='fulfilled')));
 await reject(decide(f,r,'accept'),'RELATIONSHIP_UNAUTHENTICATED');assert.equal((await f.pool.query('SELECT status FROM relationship_requests WHERE id=$1',[r.id])).rows[0].status,'ACCEPTED');
}));
