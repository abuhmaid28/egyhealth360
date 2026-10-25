import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory,directoryAudits} from '../support/directory.mjs';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';
const reject=(p,code)=>assert.rejects(p,e=>e.code===code);
async function held(f,pattern,first,second,check,rollback=false){
 const entered=signal(),release=signal();let once=false,a,b;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&pattern.test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve(q.pid);await release.promise;if(rollback)throw Error('Synthetic winner rollback');return r;});}return next();});
 try{a=first();a.catch(()=>{});const blocker=await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);assert.notEqual(waiter,blocker);release.resolve();const results=await Promise.allSettled([a,b]);await check(results);console.log('I1S4_POSTGRES_RACE',JSON.stringify({lock:pattern.source,blockerPid:blocker,waiterPid:waiter,rollback,outcomes:results.map(x=>x.status==='fulfilled'?'committed':x.reason.code)}));}
 finally{release.resolve();restore();await Promise.allSettled([a,b]);}
}
const withdraw=f=>f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});
const publish=(f,actor=f.actors.admin,key=randomUUID())=>f.directory.publishAffiliation(actor,{providerId:f.provider.id,membershipId:f.membership.id,operationKey:key});
for(const rollback of [false,true])test(`I1S4 duplicate publication overlapping connections: winner ${rollback?'rollback':'commit'}`,()=>isolatedDirectory(async f=>{
 await withdraw(f);const before=await directoryAudits(f.pool);
 await held(f,/INSERT INTO "public"\."directory_affiliations"/,()=>publish(f),()=>publish(f,f.actors.admin2),async r=>{assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r[rollback?0:1].reason.code,rollback?'DIRECTORY_UNAVAILABLE':'DIRECTORY_CONFLICT');},rollback);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM directory_affiliations WHERE provider_id=$1 AND withdrawn_at IS NULL',[f.provider.id])).rows[0].n,1);
 assert.equal((await directoryAudits(f.pool)).length,before.length+1);
}));
for(const change of ['membership','organization','clinic','user'])for(const revokeFirst of [true,false])test(`I1S4 publication vs ${change}: ${revokeFirst?'revocation':'publication'} serializes first`,()=>isolatedDirectory(async f=>{
 await withdraw(f);const before=(await directoryAudits(f.pool)).length;
 const revoke=change==='membership'?()=>f.store.endMembership(f.actors.admin2,{organizationId:f.clinicOrg.id,membershipId:f.membership.id}):change==='organization'?()=>f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0}):change==='clinic'?()=>f.directory.setClinic(f.actors.admin2,{clinicId:f.clinic.id,displayName:f.clinic.displayName,city:f.clinic.city,address:f.clinic.address,isPublished:false,expectedVersion:f.clinic.version}):()=>f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);
 if(revokeFirst&&change==='user'){
  const c=await f.pool.connect();try{await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);const p=publish(f);p.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);await c.query('COMMIT');await reject(p,'DIRECTORY_NOT_FOUND');console.log('I1S4_POSTGRES_RACE',JSON.stringify({change,revokeFirst,blockerPid:pid,waiterPid:waiter}));}finally{await c.query('ROLLBACK');c.release();}
 }else{
  const pattern=revokeFirst?(change==='membership'?/UPDATE "public"\."organization_memberships"/:change==='organization'?/UPDATE "public"\."organizations"/:/UPDATE "public"\."clinic_directory"/):/INSERT INTO "public"\."directory_affiliations"/;
  await held(f,pattern,revokeFirst?revoke:()=>publish(f),revokeFirst?()=>publish(f):revoke,async r=>{assert.equal(r[0].status,'fulfilled');if(revokeFirst){assert.equal(r[1].status,'rejected');assert.equal(r[1].reason.code,'DIRECTORY_NOT_FOUND');}else assert.equal(r[1].status,'fulfilled');});
 }
 assert.equal((await f.request()).json.meta.total,0);assert.equal((await f.request('/directory/providers/'+f.provider.publicId)).response.status,404);
 const publications=(await f.pool.query('SELECT count(*)::int n FROM directory_affiliations WHERE provider_id=$1 AND withdrawn_at IS NULL',[f.provider.id])).rows[0].n;assert.equal(publications,revokeFirst?0:1);
 assert.equal((await directoryAudits(f.pool)).length,before+(revokeFirst?0:1)+(change==='clinic'?1:0));
}));
for(const change of ['membership','organization','clinic','user','provider','specialty'])test(`I1S4 current public read uses committed MVCC state during ${change}, next read after COMMIT removes projection`,()=>isolatedDirectory(async f=>{
 const c=await f.pool.connect();try{await c.query('BEGIN');
  const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  if(change==='membership')await c.query("UPDATE organization_memberships SET status='ENDED',ended_at=clock_timestamp(),ended_by_user_id=$2 WHERE id=$1",[f.membership.id,f.users.admin.id]);
  if(change==='organization')await c.query("UPDATE organizations SET status='SUSPENDED',status_version=status_version+1,status_changed_at=clock_timestamp(),status_changed_by_user_id=$2 WHERE id=$1",[f.clinicOrg.id,f.users.admin.id]);
  if(change==='user')await c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);
  if(['clinic','provider','specialty'].includes(change)){const table=change==='clinic'?'clinic_directory':change==='provider'?'clinician_directory':'specialties',id=change==='clinic'?f.clinic.id:change==='provider'?f.provider.id:f.specialty.id;await c.query(`UPDATE public.${table} SET is_published=false,version=version+1,changed_at=clock_timestamp(),changed_by_user_id=$2 WHERE id=$1`,[id,f.users.admin.id]);}
  assert.equal((await f.request()).json.meta.total,1);await c.query('COMMIT');assert.equal((await f.request()).json.meta.total,0);console.log('I1S4_POSTGRES_MVCC',JSON.stringify({change,writerPid:pid,beforeCommit:1,afterCommit:0}));
 }finally{await c.query('ROLLBACK');c.release();}
}));
for(const changeFirst of [true,false])test(`I1S4 specialty change vs old affiliation publication: ${changeFirst?'change':'publication'} first`,()=>isolatedDirectory(async f=>{
 await withdraw(f);let s=(await f.directory.createSpecialty(f.actors.admin,{key:'synthetic-other',displayName:'Synthetic Other',operationKey:randomUUID()})).specialty;s=(await f.directory.setSpecialty(f.actors.admin,{specialtyId:s.id,displayName:s.displayName,isPublished:true,expectedVersion:0})).specialty;
 const change=()=>f.directory.setProvider(f.actors.admin2,{providerId:f.provider.id,specialtyId:s.id,displayName:f.provider.displayName,isPublished:false,expectedVersion:f.provider.version});
 await held(f,changeFirst?/UPDATE "public"\."clinician_directory"/:/INSERT INTO "public"\."directory_affiliations"/,changeFirst?change:()=>publish(f),changeFirst?()=>publish(f):change,async r=>{assert.ok(r.every(x=>x.status==='fulfilled'));});
 const active=(await f.pool.query('SELECT specialty_id FROM directory_affiliations WHERE provider_id=$1 AND withdrawn_at IS NULL',[f.provider.id])).rows;assert.deepEqual(active,changeFirst?[{specialty_id:s.id}]:[]);assert.equal((await f.request()).json.meta.total,0);
}));
test('I1S4 final session expiry rolls back publication and audit; real lock timeout is bounded and sanitized',()=>isolatedDirectory(async f=>{
 await withdraw(f);const before=await directoryAudits(f.pool);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.admin.sessionId]);
 const entered=signal(),release=signal();let once=false,p;
 const stop=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO "public"\."directory_affiliations"/.test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve();await release.promise;return r;});}return next();});
 try{p=publish(f);p.catch(()=>{});await entered.promise;await f.pool.query('SELECT pg_sleep(2.1)');release.resolve();await reject(p,'DIRECTORY_UNAUTHENTICATED');}finally{release.resolve();stop();await Promise.allSettled([p]);}
 const c=await f.pool.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[f.clinicOrg.id]);const start=Date.now();await reject(publish(f,f.actors.admin2),'DIRECTORY_UNAVAILABLE');assert.ok(Date.now()-start<9000);}finally{await c.query('ROLLBACK');c.release();}
 assert.deepEqual(await directoryAudits(f.pool),before);
}));
test('I1S4 real PostgreSQL deadlock victim is sanitized, rolled back, never retried with stale authority',()=>isolatedDirectory(async f=>{
 await withdraw(f);const before=await directoryAudits(f.pool),c=await f.pool.connect();let operation,competing;
 try{await c.query('BEGIN');await c.query("SET LOCAL deadlock_timeout='10s'");const blocker=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[f.clinicOrg.id]);operation=publish(f);operation.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);competing=c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);competing.catch(()=>{});assert.equal(await waitBlockedBy(f.pool,waiter),blocker);await reject(operation,'DIRECTORY_UNAVAILABLE');await competing;await c.query('ROLLBACK');console.log('I1S4_POSTGRES_DEADLOCK',JSON.stringify({blockerPid:blocker,servicePid:waiter}));assert.deepEqual(await directoryAudits(f.pool),before);assert.equal((await publish(f)).created,true);}
 finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([operation,competing]);}
}));

test('I1S4 concurrent exact operation replay returns original publication identity with exactly one success audit',()=>isolatedDirectory(async f=>{
 await withdraw(f);const key=randomUUID(),before=(await directoryAudits(f.pool)).length;
 await held(f,/INSERT INTO "public"\."directory_affiliations"/,()=>publish(f,f.actors.admin,key),()=>publish(f,f.actors.admin,key),async r=>{assert.ok(r.every(x=>x.status==='fulfilled'));assert.equal(r[0].value.created,true);assert.equal(r[1].value.created,false);assert.equal(r[0].value.publication.id,r[1].value.publication.id);});
 assert.equal((await directoryAudits(f.pool)).length,before+1);
}));
