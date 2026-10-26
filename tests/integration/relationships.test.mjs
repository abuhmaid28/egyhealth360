import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../support/directory.mjs';
const fixture=run=>isolatedDirectory(run,{relationships:true});
const authorize=f=>f.relationships.authorize(f.actors.patient,{providerId:f.provider.publicId,operationKey:randomUUID()});
const decide=(f,r,what)=>f.relationships.decide(f.actors[what==='withdraw'?'patient':'clinician'],{requestId:r.id},what);
const count=async(f,table)=>(await f.pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n;
const reject=(p,code)=>assert.rejects(p,e=>e.code===code);
test('I1S5 new bilateral grant; accepted withdrawal retains acceptance and atomically ends exact grant; fresh re-establishment; old end cannot end B',()=>fixture(async f=>{
 assert.equal(await count(f,'clinician_patient_assignments'),0);
 const r=(await authorize(f)).request;assert.equal(r.status,'PENDING');assert.equal(await count(f,'clinician_patient_assignments'),0);
 const accepted=await decide(f,r,'accept');const a=accepted.request.assignmentId;assert.ok(a);
 assert.equal((await decide(f,r,'accept')).changed,false);
 const withdrawn=await decide(f,r,'withdraw');assert.equal(withdrawn.request.status,'ACCEPTED');assert.deepEqual(withdrawn.request.acceptedAt,accepted.request.acceptedAt);assert.ok(withdrawn.request.authorizationWithdrawnAt);
 const ended=(await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a])).rows[0];assert.equal(ended.status,'ENDED');assert.equal(await count(f,'assignment_end_provenance'),1);
 const r2=(await authorize(f)).request,b=(await decide(f,r2,'accept')).request.assignmentId;assert.notEqual(a,b);
 const audits=await count(f,'audit_logs');assert.equal((await f.relationships.end(f.actors.patient,{assignmentId:a})).changed,false);assert.equal((await decide(f,r,'withdraw')).changed,false);assert.equal(await count(f,'audit_logs'),audits);
 assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[b])).rows[0].status,'ACTIVE');
 const history=await f.relationships.read(f.actors.clinician,'relationships',a);assert.equal(history.data.patientId,null);assert.equal(history.data.endedByRole,'PATIENT');
}));
test('I1S5 pending withdrawal/decline are terminal; exact replay and operation-key retargeting; fresh request after terminal',()=>fixture(async f=>{
 const key=randomUUID(),v={providerId:f.provider.publicId,operationKey:key};const first=await f.relationships.authorize(f.actors.patient,v);assert.equal((await f.relationships.authorize(f.actors.patient,v)).changed,false);
 await reject(f.relationships.authorize(f.actors.patient,{...v,providerId:randomUUID()}),'RELATIONSHIP_CONFLICT');await decide(f,first.request,'withdraw');assert.equal((await decide(f,first.request,'withdraw')).changed,false);await reject(decide(f,first.request,'accept'),'RELATIONSHIP_CONFLICT');
 const r=(await authorize(f)).request;await decide(f,r,'decline');assert.equal((await decide(f,r,'decline')).changed,false);await reject(decide(f,r,'accept'),'RELATIONSHIP_CONFLICT');assert.equal(await count(f,'clinician_patient_assignments'),0);
 assert.equal((await f.relationships.authorize(f.actors.patient,v)).request.status,'WITHDRAWN');assert.equal((await authorize(f)).request.status,'PENDING');
}));
test('I1S5 legacy confirmation preserves exact assignment and later truth; ending pending legacy context requires fresh authorization',()=>fixture(async f=>{
 const a=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});
 const before=(await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0];const r=(await authorize(f)).request;
 assert.equal((await decide(f,r,'accept')).request.assignmentId,a.id);assert.deepEqual((await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0],before);assert.equal(await count(f,'clinician_patient_assignments'),1);
 await f.relationships.end(f.actors.clinician,{assignmentId:a.id});const r2=(await authorize(f)).request;assert.ok((await decide(f,r2,'accept')).request.assignmentId);
}));
test('I1S5 pending context cannot re-establish after its legacy assignment ends',()=>fixture(async f=>{
 const a=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});const r=(await authorize(f)).request;await f.relationships.end(f.actors.patient,{assignmentId:a.id});await reject(decide(f,r,'accept'),'RELATIONSHIP_CONFLICT');assert.equal(await count(f,'clinician_patient_assignments'),1);await decide(f,r,'withdraw');const fresh=(await authorize(f)).request;assert.notEqual((await decide(f,fresh,'accept')).request.assignmentId,a.id);
}));
test('I1S5 participant-only real HTTP surface, strict shape/CSRF/Origin, no directory/role/ID-based clinical authority, HEAD/no-store',()=>fixture(async f=>{
 const patient=await f.login('patient'),clinician=await f.login('clinician');const headers={...patient,Origin:f.config.origin,'Content-Type':'application/json'};
 const send=(path,body,extra={})=>f.request(path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
 const input={providerId:f.provider.publicId,operationKey:randomUUID()};
 assert.equal((await send('/me/relationship-requests',{...input,role:'ADMIN'})).response.status,400);assert.equal((await send('/me/relationship-requests',input,{Origin:'http://attacker.invalid'})).response.status,403);
 const r=await send('/me/relationship-requests',input);assert.equal(r.response.status,200);const requestId=r.json.data.request.id;
 for(const role of ['admin','lab','pharmacy']){const cookie=await f.login(role);assert.equal((await f.request('/me/relationship-requests',{headers:cookie})).response.status,404);}
 const leaked=JSON.stringify(r.json);for(const key of ['patientId','patientUserId','clinicianId','clinicianUserId','operationKey','email','professionalIdentifier','passwordHash'])assert.ok(!leaked.includes('"'+key+'"'));
 assert.equal((await f.request('/patients/'+f.users.patient.profileId+'/profile',{headers:clinician})).response.status,404);
 const accepted=await f.request('/me/relationship-requests/'+requestId+'/accept',{method:'PUT',headers:{...clinician,Origin:f.config.origin,'Content-Type':'application/json'},body:'{}'});assert.equal(accepted.response.status,200);
 assert.equal((await f.request('/patients/'+f.users.patient.profileId+'/profile',{headers:clinician})).response.status,200);
 const head=await f.request('/me/relationship-requests',{method:'HEAD',headers:patient});assert.equal(head.response.status,200);assert.equal(head.raw,'');assert.equal(head.response.headers.get('cache-control'),'no-store');
 assert.equal((await f.request('/me/relationship-requests?page=1&page=2',{headers:patient})).response.status,400);
 assert.equal((await f.request('/me/relationship-requests/'+requestId,{headers:patient})).response.status,200);
}));
test('I1S5 cross-patient/cross-clinician IDOR and fake actor/role/session targets cannot manufacture consent or clinical access',()=>fixture(async f=>{
 const r=(await authorize(f)).request;
 for(const role of ['PATIENT','CLINICIAN']){
  const user=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role,profile:{displayName:'Synthetic outsider'}});
  const session=await f.auth.createSession({userId:user.id,verifiedHash:f.hash,tokenHash:randomUUID().replaceAll('-','')+randomUUID().replaceAll('-',''),previousHash:null});
  await reject(f.relationships.read(session,'requests',r.id),'RELATIONSHIP_NOT_FOUND');await reject(f.relationships.decide(session,{requestId:r.id},role==='PATIENT'?'withdraw':'accept'),'RELATIONSHIP_NOT_FOUND');
  assert.deepEqual((await f.relationships.read(session,'requests',null)).data,[]);
 }
 await reject(f.relationships.decide({...f.actors.patient,role:'CLINICIAN'},{requestId:r.id},'accept'),'RELATIONSHIP_NOT_FOUND');
 await reject(f.relationships.decide({...f.actors.clinician,userId:f.users.patient.id},{requestId:r.id},'accept'),'RELATIONSHIP_UNAUTHENTICATED');
 for(const key of ['admin','lab','pharmacy']){
  await reject(f.relationships.authorize(f.actors[key],{providerId:f.provider.publicId,operationKey:randomUUID()}),'RELATIONSHIP_NOT_FOUND');
  await reject(f.relationships.decide(f.actors[key],{requestId:r.id},'accept'),'RELATIONSHIP_NOT_FOUND');
 }
 assert.equal(await count(f,'clinician_patient_assignments'),0);
}));
test('I1S5 no cached authority: publication/membership is only discovery, existing request acceptance/end need bilateral participant authority',()=>fixture(async f=>{
 const r=(await authorize(f)).request;
 await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});await f.setProvider({isPublished:false});
 assert.equal((await f.request()).json.meta.total,0);const accepted=await decide(f,r,'accept');assert.ok(accepted.request.assignmentId);
 await f.relationships.end(f.actors.patient,{assignmentId:accepted.request.assignmentId});await reject(authorize(f),'RELATIONSHIP_NOT_FOUND');
}));
for(const change of ['disabled','revoked','expired'])test(`I1S5 current ${change} actor denied on all reads/mutations; no state/audit`,()=>fixture(async f=>{
 const r=(await authorize(f)).request,assignmentId=(await decide(f,r,'accept')).request.assignmentId;const before=(await f.pool.query('SELECT * FROM audit_logs ORDER BY id')).rows;
 if(change==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]);
 if(change==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.patient.sessionId]);
 if(change==='expired')await f.pool.query("UPDATE sessions SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[f.actors.patient.sessionId]);
 for(const op of [()=>authorize(f),()=>decide(f,r,'withdraw'),()=>f.relationships.end(f.actors.patient,{assignmentId}),()=>f.relationships.read(f.actors.patient,'requests',null),()=>f.relationships.read(f.actors.patient,'relationships',assignmentId)])await reject(op(),'RELATIONSHIP_UNAUTHENTICATED');
 assert.deepEqual((await f.pool.query('SELECT * FROM audit_logs ORDER BY id')).rows,before);
}));
test('I1S5 actual HTTP database failures, malformed JSON/header/query/path variants and HEAD are sanitized without side effects',()=>fixture(async f=>{
 const patient=await f.login('patient'),headers={...patient,Origin:f.config.origin,'Content-Type':'application/json'};
 for(const body of ['{"EHSECRET_RELATIONSHIP":','{"providerId":"'+f.provider.publicId+'","operationKey":"'+randomUUID()+'","patientId":"'+f.users.patient.profileId+'"}']){
  const r=await f.request('/me/relationship-requests',{method:'POST',headers,body});assert.equal(r.response.status,400);assert.deepEqual(r.json,{error:{code:'REQUEST_INVALID',message:'Invalid request.'}});assert.ok(!r.raw.includes('EHSECRET'));
 }
 for(const path of ['/me/relationship-requests?page=%31','/me/relationship-requests?','/me/relationship-requests?page=01','/me/relationship-requests?patientId='+f.users.patient.profileId])assert.equal((await f.request(path,{headers:patient})).response.status,400);
 for(const path of ['/me/relationship-requests/','/me/RELATIONSHIP-REQUESTS','/me/relationship-requests/'+randomUUID().toUpperCase(),'/me/relationship-requests/%61'])assert.equal((await f.request(path,{headers:patient})).response.status,404);
 assert.equal((await f.request('/me/relationship-requests',{method:'POST',headers,body:' '.repeat(16385)})).response.status,413);
 assert.equal(await count(f,'relationship_requests'),0);
 await f.pool.query('ALTER TABLE public.relationship_requests RENAME TO private_relationship_failure_canary');
 try{const r=await f.request('/me/relationship-requests',{headers:patient});assert.equal(r.response.status,503);assert.deepEqual(r.json,{error:{code:'RELATIONSHIP_UNAVAILABLE',message:'Service unavailable.'}});assert.doesNotMatch(r.raw,/Prisma|SELECT|canary|postgres|stack/);
 const h=await f.request('/me/relationship-requests',{headers:patient,method:'HEAD'});assert.equal(h.response.status,503);assert.equal(h.raw,'');}finally{await f.pool.query('ALTER TABLE public.private_relationship_failure_canary RENAME TO relationship_requests');}
}));
test('I1S5 unpublished legacy assignment can be truthfully confirmed by its owning patient without public/internal clinician target; no automatic publication',()=>fixture(async f=>{
 const a=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});await f.setProvider({isPublished:false});
 const before=(await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0],key=randomUUID();
 const r=(await f.relationships.authorize(f.actors.patient,{assignmentId:a.id,operationKey:key})).request;assert.equal(r.providerId,null);
 const accepted=await decide(f,r,'accept');assert.equal(accepted.request.assignmentId,a.id);assert.deepEqual((await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0],before);assert.equal((await f.request()).json.meta.total,0);
 const patient=await f.login('patient');const replay=await f.request('/me/relationship-requests',{method:'POST',headers:{...patient,Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify({assignmentId:a.id,operationKey:key})});assert.equal(replay.response.status,200);assert.equal(replay.json.data.changed,false);
 await reject(f.relationships.authorize(f.actors.patient,{assignmentId:a.id,operationKey:randomUUID()}),'RELATIONSHIP_CONFLICT');
}));
test('I1S5 first withdrawal of old accepted A after clinician ended A and fresh B established ends no newer grant',()=>fixture(async f=>{
 const old=(await authorize(f)).request,a=(await decide(f,old,'accept')).request.assignmentId;await f.relationships.end(f.actors.clinician,{assignmentId:a});const fresh=(await authorize(f)).request,b=(await decide(f,fresh,'accept')).request.assignmentId,before=await count(f,'audit_logs');
 const withdrawal=await decide(f,old,'withdraw');assert.equal(withdrawal.changed,true);assert.equal(withdrawal.request.status,'ACCEPTED');assert.ok(withdrawal.request.authorizationWithdrawnAt);assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[b])).rows[0].status,'ACTIVE');assert.equal(await count(f,'audit_logs'),before+1);assert.equal((await f.pool.query('SELECT actor_role FROM assignment_end_provenance WHERE assignment_id=$1',[a])).rows[0].actor_role,'CLINICIAN');
}));
test('I1S5 withdrawing/declining pending legacy confirmation does not rewrite its independently valid legacy grant; explicit exact end remains available',()=>fixture(async f=>{
 for(const decision of ['withdraw','decline']){
  const a=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});const before=(await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0];
  const r=(await f.relationships.authorize(f.actors.patient,{assignmentId:a.id,operationKey:randomUUID()})).request;await decide(f,r,decision);
  assert.deepEqual((await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[a.id])).rows[0],before);assert.equal((await f.pool.query('SELECT count(*)::int n FROM assignment_end_provenance WHERE assignment_id=$1',[a.id])).rows[0].n,0);
  assert.equal((await f.relationships.end(f.actors.patient,{assignmentId:a.id})).changed,true);
 }
}));
