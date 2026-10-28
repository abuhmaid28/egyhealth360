import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {isolatedAvailability,reject,availabilityAudits} from '../support/availability.mjs';
import {observeApplicabilityQueries,signal,waitBlocked,waitBlockedBy} from '../support/observed-applicability.mjs';

// EH2C is a dedicated two-int domain, separate from legacy one-bigint locks.
const namespace=0x45483243;
const advisorySql='SELECT pg_catalog.pg_advisory_xact_lock($1::integer,pg_catalog.hashtext($2::text))';
const advisory=/SELECT pg_catalog\.pg_advisory_xact_lock\(1162359363,/;
const forbidden=['patient_profiles','clinician_profiles','clinician_patient_assignments'];
const pid=async c=>(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
const locks=async(f,p)=> (await f.pool.query("SELECT classid::text, objid::text,objsubid,granted FROM pg_locks WHERE pid=$1 AND locktype='advisory' ORDER BY classid,objid,objsubid",[p])).rows;
async function noClinicalLocks(f,p){
 assert.deepEqual((await f.pool.query('SELECT c.relname,l.mode,l.granted FROM pg_locks l JOIN pg_class c ON c.oid=l.relation WHERE l.pid=$1 AND c.relnamespace=\'public\'::regnamespace AND c.relname=ANY($2::text[])',[p,forbidden])).rows,[]);
}
function order(trace,identity){
 const position=pattern=>{const n=trace.findIndex(q=>pattern.test(q.text));assert.ok(n>=0,pattern.source);return n;};
 const stages=[/LOCK TABLE public\.users,public\.patient_profiles/,/public\.users WHERE id=\$1 FOR NO KEY UPDATE/,/public\.sessions WHERE id=\$1 FOR UPDATE/,/public\.clinician_profiles WHERE user_id=.*FOR SHARE/,/public\.specialties WHERE id=.*FOR SHARE/,/public\.organizations WHERE id=.*FOR SHARE/,/public\.clinic_directory WHERE organization_id=.*FOR SHARE/,/public\.organization_memberships WHERE id=.*FOR SHARE/,/public\.clinician_directory WHERE id=.*FOR SHARE/,/public\.directory_affiliations WHERE id=.*FOR SHARE/,/public\.clinic_scheduling_settings.*FOR SHARE/,advisory];
 const positions=stages.map(position);assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));assert.equal(new Set(positions).size,positions.length);
 const index=positions.at(-1);assert.deepEqual(trace[index].values,[identity]);assert.match(trace[index-1].text,/JOIN public\.sessions/);
 assert.ok(!trace.slice(0,index).some(q=>/INSERT INTO public\.availability_slots|UPDATE public\.availability_slots/.test(q.text)));
}
async function secondClinic(f){
 const org=await f.org('CLINIC'),m=(await f.grant(f.users.clinician,org)).membership;
 let c=(await f.directory.createClinic(f.actors.admin,{organizationId:org.id,displayName:'Other synthetic clinic',city:'City',address:'Address',operationKey:randomUUID()})).clinic;
 c=(await f.directory.setClinic(f.actors.admin,{clinicId:c.id,displayName:c.displayName,city:c.city,address:c.address,isPublished:true,expectedVersion:0})).clinic;
 await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:m.id,operationKey:randomUUID()});
 await f.availability.setConfiguration(f.actors.admin,{...f.settings,organizationId:org.id});return c;
}

for(const table of forbidden)test('I2S2 lock correction ADMIN config/history bypass forbidden '+table+' intent path',()=>isolatedAvailability(async f=>{
 const blocker=await f.pool.connect(),control=await f.pool.connect(),entered=signal(),release=signal();let pending,probe,configPid,historyPid;
 const trace=[];
 const stop=observeApplicabilityQueries((q,next)=>{
  trace.push(q);
  if(/INSERT INTO public\.clinic_scheduling_settings/.test(q.text))return Promise.resolve(next()).then(async r=>{configPid=q.pid;entered.resolve();await release.promise;return r;});
  if(/SELECT \* FROM public\.clinic_scheduling_settings WHERE organization_id=\$1 ORDER BY version$/.test(q.text))historyPid=q.pid;
  return next();
 });
 try{
  await blocker.query('BEGIN');const blockerPid=await pid(blocker);await blocker.query(`LOCK TABLE public.${table} IN ACCESS EXCLUSIVE MODE`);
  // A real independent control demonstrates that the old intent path would wait.
  await control.query('BEGIN');const controlPid=await pid(control);probe=control.query(`LOCK TABLE public.${table} IN ROW EXCLUSIVE MODE`);probe.catch(()=>{});
  await waitBlocked(f.pool,controlPid,4000,blockerPid);
  pending=f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1});pending.catch(()=>{});await entered.promise;
  await noClinicalLocks(f,configPid);assert.deepEqual((await f.pool.query('SELECT pg_blocking_pids($1) pids',[configPid])).rows[0].pids,[]);
  const statements=trace.filter(q=>q.pid===configPid);assert.ok(!statements.some(q=>forbidden.some(t=>q.text.includes(t))));
  const user=statements.findIndex(q=>/public\.users.*FOR NO KEY UPDATE/.test(q.text)),session=statements.findIndex(q=>/public\.sessions.*FOR UPDATE/.test(q.text)),org=statements.findIndex(q=>/public\.organizations.*FOR UPDATE/.test(q.text)),settings=statements.findIndex(q=>/clinic_scheduling_settings.*FOR UPDATE/.test(q.text));
  assert.ok(user>=0&&user<session&&session<org&&org<settings);
  release.resolve();assert.equal((await pending).version,2);
  const history=await f.availability.configurationHistory(f.actors.admin,f.clinicOrg.id);assert.deepEqual(history.map(x=>x.version),[1,2]);assert.ok(historyPid);
  assert.ok(!trace.filter(q=>q.pid===historyPid).some(q=>forbidden.some(t=>q.text.includes(t))));await noClinicalLocks(f,historyPid);
  await waitBlocked(f.pool,controlPid,4000,blockerPid);
  console.log('I2S2_ADMIN_LOCK_ISOLATION',JSON.stringify({table,blockerPid,controlWaiterPid:controlPid,configPid,historyPid,forbiddenLocks:0,configVersion:2}));
 }finally{release.resolve();stop();await blocker.query('ROLLBACK');await Promise.allSettled([probe,pending]);await control.query('ROLLBACK');blocker.release();control.release();}
}));

for(const resource of ['user','session','organization','settings'])test('I2S2 lock correction ADMIN preserves '+resource+' row serialization and recheck',()=>isolatedAvailability(async f=>{
 const c=await f.pool.connect(),before=await availabilityAudits(f.pool);let mutation;
 try{
  await c.query('BEGIN');const blocker=await pid(c);
  if(resource==='user')await c.query("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.actors.admin.userId]);
  if(resource==='session')await c.query('UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.admin.sessionId]);
  if(resource==='organization')await c.query('SELECT id FROM public.organizations WHERE id=$1 FOR UPDATE',[f.clinicOrg.id]);
  if(resource==='settings')await c.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 FOR UPDATE',[f.clinicOrg.id]);
  mutation=f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1});mutation.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);
  const active=(await f.pool.query('SELECT query FROM pg_stat_activity WHERE pid=$1',[waiter])).rows[0].query;
  assert.match(active,resource==='user'?/public\.users.*FOR NO KEY UPDATE/:resource==='session'?/public\.sessions.*FOR UPDATE/:resource==='organization'?/public\.organizations.*FOR UPDATE/:/clinic_scheduling_settings.*FOR UPDATE/);
  await c.query('COMMIT');
  if(['user','session'].includes(resource)){await reject(mutation,'AVAILABILITY_UNAUTHENTICATED');assert.deepEqual(await availabilityAudits(f.pool),before);}
  else{assert.equal((await mutation).version,2);await reject(f.availability.setConfiguration(f.actors.admin,f.settings),'AVAILABILITY_CONFLICT');}
  console.log('I2S2_ADMIN_PREFIX_WAIT',JSON.stringify({resource,blockerPid:blocker,waiterPid:waiter,outcome:['user','session'].includes(resource)?'DENIED':'COMMIT'}));
 }finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([mutation]);}
}));

test('I2S2 lock correction ADMIN expiry during settings wait rolls back without audit',()=>isolatedAvailability(async f=>{
 const c=await f.pool.connect(),before=await availabilityAudits(f.pool);let mutation;
 try{await c.query('BEGIN');const blocker=await pid(c);await c.query('SELECT version FROM public.clinic_scheduling_settings WHERE organization_id=$1 FOR UPDATE',[f.clinicOrg.id]);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.admin.sessionId]);mutation=f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1});mutation.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);await f.pool.query('SELECT pg_sleep(2.1)');await c.query('COMMIT');await reject(mutation,'AVAILABILITY_UNAUTHENTICATED');assert.deepEqual(await availabilityAudits(f.pool),before);assert.equal((await f.availability.configurationHistory(f.actors.admin2,f.clinicOrg.id)).length,1);console.log('I2S2_ADMIN_WAIT_EXPIRY',JSON.stringify({blockerPid:blocker,waiterPid:waiter,outcome:'ROLLBACK'}));}finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([mutation]);}
}));

for(const crossClinic of [false,true])for(const rollback of [false,true])test(`I2S2 lock correction advisory lifetime/ordered contender crossClinic=${crossClinic} rollback=${rollback}`,()=>isolatedAvailability(async f=>{
 const clinic=crossClinic?await secondClinic(f):f.clinic,probe=await f.pool.connect(),entered=signal(),release=signal(),bUser=signal(),bAdvisory=signal(),trace=new Map(),before=(await availabilityAudits(f.pool)).length;
 let a,b,probeWait,aPid,bPid,first=true;
 const stop=observeApplicabilityQueries((q,next)=>{
  if(!trace.has(q.pid))trace.set(q.pid,[]);trace.get(q.pid).push(q);
  if(aPid&&q.pid!==aPid&&/public\.users.*FOR NO KEY UPDATE/.test(q.text)&&q.values?.[0]===f.users.clinician.id){bPid=q.pid;bUser.resolve(q.pid);}
  if(advisory.test(q.text)){
   if(first){first=false;return Promise.resolve(next()).then(async r=>{aPid=q.pid;entered.resolve();await release.promise;if(rollback)throw Error('Synthetic advisory winner rollback');return r;});}
   if(q.pid===bPid)bAdvisory.resolve(q.pid);
  }
  return next();
 });
 try{
  a=f.publish();a.catch(()=>{});await entered.promise;
  order(trace.get(aPid),f.users.clinician.profileId);const held=await locks(f,aPid);assert.equal(held.length,1);assert.deepEqual({classid:held[0].classid,objsubid:held[0].objsubid,granted:held[0].granted},{classid:String(namespace),objsubid:2,granted:true});
  await probe.query('BEGIN');const probePid=await pid(probe);probeWait=probe.query(advisorySql,[namespace,f.users.clinician.profileId]);probeWait.catch(()=>{});await waitBlocked(f.pool,probePid,4000,aPid);
  b=f.publish(15,{clinicId:clinic.publicId});b.catch(()=>{});await bUser.promise;await waitBlocked(f.pool,bPid,4000,aPid);
  // Full same-clinician services must first serialize at the frozen User prefix.
  assert.deepEqual(await locks(f,bPid),[]);release.resolve();const firstResult=await Promise.allSettled([a]);assert.equal(firstResult[0].status,rollback?'rejected':'fulfilled');if(rollback)assert.equal(firstResult[0].reason.code,'AVAILABILITY_UNAVAILABLE');
  await probeWait;await bAdvisory.promise;await waitBlocked(f.pool,bPid,4000,probePid);
  const waiting=await locks(f,bPid);assert.equal(waiting.length,1);assert.equal(waiting[0].granted,false);assert.equal(waiting[0].objid,held[0].objid);assert.equal(waiting[0].classid,String(namespace));assert.equal(waiting[0].objsubid,2);
  assert.deepEqual(await locks(f,aPid),[]);order(trace.get(bPid),f.users.clinician.profileId);
  await probe.query('ROLLBACK');if(rollback)await b;else await reject(b,'AVAILABILITY_CONFLICT');
  const after=trace.get(bPid),at=after.findIndex(q=>advisory.test(q.text));assert.match(after[at+1].text,/JOIN public\.sessions/);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM availability_slots')).rows[0].n,1);assert.equal((await f.pool.query('SELECT count(*)::int n FROM availability_operations')).rows[0].n,1);assert.equal((await availabilityAudits(f.pool)).length,before+1);assert.deepEqual(await locks(f,bPid),[]);
  console.log('I2S2_ADVISORY_ORDERED_RACE',JSON.stringify({namespace,clinicianId:f.users.clinician.profileId,crossClinic,rollback,publicationAPid:aPid,publicationBPid:bPid,advisoryProbePid:probePid,userPrefixBlocker:aPid,advisoryStageBlocker:probePid,advisoryKey:held[0].objid,outcome:rollback?'B_COMMIT':'B_CONFLICT',durableSlots:1}));
 }finally{release.resolve();stop();await probe.query('ROLLBACK');await Promise.allSettled([a,b,probeWait]);probe.release();}
}));

test('I2S2 lock correction different clinicians keep distinct advisory scheduling domains',()=>isolatedAvailability(async f=>{
 const user=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'CLINICIAN',profile:{displayName:'Other synthetic clinician'}}),actor=await f.auth.createSession({userId:user.id,verifiedHash:f.hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});
 const m=(await f.grant(user,f.clinicOrg)).membership;let p=(await f.directory.createProvider(f.actors.admin,{clinicianId:user.profileId,specialtyId:f.specialty.id,displayName:'Other synthetic clinician',operationKey:randomUUID()})).provider;
 await f.directory.publishAffiliation(f.actors.admin,{providerId:p.id,membershipId:m.id,operationKey:randomUUID()});p=(await f.directory.setProvider(f.actors.admin,{providerId:p.id,specialtyId:p.specialtyId,displayName:p.displayName,isPublished:true,expectedVersion:0})).provider;
 const entered=signal(),release=signal();let first=true,a,aPid,bPid;
 const stop=observeApplicabilityQueries((q,next)=>{if(advisory.test(q.text)){if(first){first=false;return Promise.resolve(next()).then(async r=>{aPid=q.pid;entered.resolve();await release.promise;return r;});}bPid=q.pid;return Promise.resolve(next()).then(async r=>{const one=await locks(f,aPid),two=await locks(f,bPid);assert.equal(one.length,1);assert.equal(two.length,1);assert.notEqual(one[0].objid,two[0].objid);assert.equal(two[0].granted,true);return r;});}return next();});
 try{a=f.publish();a.catch(()=>{});await entered.promise;const second=await f.availability.publish(actor,f.input());assert.equal(second.providerId,p.publicId);assert.notEqual(aPid,bPid);assert.deepEqual(await locks(f,bPid),[]);release.resolve();await a;assert.equal((await f.pool.query('SELECT count(*)::int n FROM availability_slots')).rows[0].n,2);console.log('I2S2_ADVISORY_DIFFERENT_CLINICIANS',JSON.stringify({namespace,publicationAPid:aPid,publicationBPid:bPid,secondCommittedWhileFirstHeld:true}));}finally{release.resolve();stop();await Promise.allSettled([a]);}
}));

test('I2S2 lock correction namespace separates legacy bigint and unrelated two-int domains',()=>isolatedAvailability(async f=>{
 const c=await f.pool.connect(),entered=signal(),release=signal();let publication,publicationPid;
 const stop=observeApplicabilityQueries((q,next)=>{if(advisory.test(q.text))return Promise.resolve(next()).then(async r=>{publicationPid=q.pid;entered.resolve();await release.promise;return r;});return next();});
 try{await c.query('BEGIN');const otherPid=await pid(c);await c.query('SELECT pg_advisory_xact_lock(($1::bigint<<32)|(pg_catalog.hashtext($2)::bigint & 4294967295))',[namespace,f.users.clinician.profileId]);await c.query(advisorySql,[namespace+1,f.users.clinician.profileId]);publication=f.publish();publication.catch(()=>{});await entered.promise;const own=(await locks(f,publicationPid))[0],other=await locks(f,otherPid);assert.equal(own.granted,true);assert.ok(other.some(l=>l.classid===own.classid&&l.objid===own.objid&&l.objsubid===1));assert.ok(other.some(l=>l.classid===String(namespace+1)&&l.objid===own.objid&&l.objsubid===2));release.resolve();await publication;console.log('I2S2_ADVISORY_NAMESPACE',JSON.stringify({namespace,publicationPid,unrelatedHolderPid:otherPid,legacyBigintAndOtherNamespaceDoNotBlock:true}));}finally{release.resolve();stop();await c.query('ROLLBACK');c.release();await Promise.allSettled([publication]);}
}));

test('I2S2 lock correction advisory wait rechecks expiry before replay/mutation',()=>isolatedAvailability(async f=>{
 const c=await f.pool.connect(),before=await availabilityAudits(f.pool),input=f.input();let publication;
 try{await c.query('BEGIN');const blocker=await pid(c);await c.query(advisorySql,[namespace,f.users.clinician.profileId]);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.clinician.sessionId]);publication=f.availability.publish(f.actors.clinician,input);publication.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);const pending=(await locks(f,waiter))[0];assert.equal(pending.granted,false);await f.pool.query('SELECT pg_sleep(2.1)');await c.query('ROLLBACK');await reject(publication,'AVAILABILITY_UNAUTHENTICATED');assert.deepEqual(await availabilityAudits(f.pool),before);assert.equal((await f.pool.query('SELECT count(*)::int n FROM availability_operations')).rows[0].n,0);await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 hour' WHERE id=$1",[f.actors.clinician.sessionId]);await f.availability.publish(f.actors.clinician,input);console.log('I2S2_ADVISORY_WAIT_EXPIRY',JSON.stringify({namespace,blockerPid:blocker,waiterPid:waiter,outcome:'ROLLBACK_KEY_REUSABLE'}));}finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([publication]);}
}));

test('I2S2 lock correction advisory deadlock abort is sanitized without retry/partial writes',()=>isolatedAvailability(async f=>{
 const c=await f.pool.connect(),before=await availabilityAudits(f.pool);let publication,inverted;
 try{await c.query('BEGIN');await c.query("SET LOCAL deadlock_timeout='10s'");const blocker=await pid(c);await c.query(advisorySql,[namespace,f.users.clinician.profileId]);publication=f.publish();publication.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);assert.equal((await locks(f,waiter))[0].granted,false);inverted=c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);inverted.catch(()=>{});await waitBlocked(f.pool,blocker,4000,waiter);await reject(publication,'AVAILABILITY_UNAVAILABLE');await inverted;await c.query('ROLLBACK');assert.deepEqual(await availabilityAudits(f.pool),before);assert.equal((await f.pool.query('SELECT count(*)::int n FROM availability_slots')).rows[0].n,0);await f.publish();console.log('I2S2_ADVISORY_DEADLOCK',JSON.stringify({namespace,blockerPid:blocker,serviceVictimPid:waiter,noAutomaticRetry:true}));}finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([publication,inverted]);}
}));
