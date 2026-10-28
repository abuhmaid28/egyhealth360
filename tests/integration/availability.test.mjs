import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedAvailability,reject,availabilityAudits} from '../support/availability.mjs';
test('I2S2 operational ADMIN configuration immutable versions, role isolation, exact CAS and atomic audit',()=>isolatedAvailability(async f=>{
 const before=await availabilityAudits(f.pool);
 for(const role of ['clinician','patient','lab','pharmacy']){await reject(f.availability.setConfiguration(f.actors[role],{...f.settings,expectedVersion:1}),'AVAILABILITY_NOT_FOUND');await reject(f.availability.configurationHistory(f.actors[role],f.clinicOrg.id),'AVAILABILITY_NOT_FOUND');}
 await reject(f.availability.setConfiguration(f.actors.admin,f.settings),'AVAILABILITY_CONFLICT');
 await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1,timeZone:'America/New_York'});
 const history=await f.availability.configurationHistory(f.actors.admin,f.clinicOrg.id);assert.deepEqual(history.map(x=>x.version),[1,2]);assert.equal(history[0].time_zone,'UTC');assert.equal(history[1].changed_by_user_id,f.users.admin.id);assert.equal((await availabilityAudits(f.pool)).length,before.length+1);
 for(const sql of ['UPDATE clinic_scheduling_settings SET duration_minutes=60','DELETE FROM clinic_scheduling_settings WHERE false','TRUNCATE clinic_scheduling_settings CASCADE'])await assert.rejects(f.pool.query(sql),e=>e.code==='23514');
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);
}));
test('I2S2 finite publish, immutable snapshot, own history, deterministic operations and terminal withdrawal',()=>isolatedAvailability(async f=>{
 const input=f.input(),one=await f.availability.publish(f.actors.clinician,input),before=await availabilityAudits(f.pool);assert.equal(one.state,'PUBLISHED');assert.deepEqual(await f.availability.publish(f.actors.clinician,input),one);assert.deepEqual(await availabilityAudits(f.pool),before);
 await reject(f.availability.publish(f.actors.clinician,{...input,...f.input(60),operationKey:input.operationKey}),'AVAILABILITY_CONFLICT');
 await reject(f.availability.publish(f.actors.clinician,{...input,clinicId:randomUUID()}),'AVAILABILITY_CONFLICT');
 await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1,timeZone:'Etc/GMT-2'});
 const old=(await f.pool.query('SELECT * FROM availability_slots WHERE id=$1',[one.id])).rows[0];assert.equal(old.time_zone,'UTC');assert.equal(old.configuration_version,1);
 const stamp=new Date(f.start.getTime()+3600000+7200000).toISOString().replace('Z','+02:00'),end=new Date(f.start.getTime()+5400000+7200000).toISOString().replace('Z','+02:00');
 const next=await f.availability.publish(f.actors.clinician,f.input(60,{startAt:stamp,endAt:end}));assert.equal(next.timeZone,'Etc/GMT-2');
 assert.equal((await f.availability.history(f.actors.clinician,{})).meta.total,2);
 for(const sql of ["UPDATE availability_slots SET start_at=start_at+interval '1 minute' WHERE id=$1",'DELETE FROM availability_slots WHERE id=$1'])await assert.rejects(f.pool.query(sql,[one.id]),e=>e.code==='23514');
 const cmd={slotId:one.id,operationKey:randomUUID(),expectedVersion:1},withdrawn=await f.availability.withdraw(f.actors.clinician,cmd);assert.equal(withdrawn.state,'WITHDRAWN');assert.deepEqual(await f.availability.withdraw(f.actors.clinician,cmd),withdrawn);
 await reject(f.availability.withdraw(f.actors.clinician,{...cmd,operationKey:randomUUID()}),'AVAILABILITY_CONFLICT');
 assert.deepEqual(await f.availability.publish(f.actors.clinician,input),one);assert.equal((await f.pool.query('SELECT state FROM availability_slots WHERE id=$1',[one.id])).rows[0].state,'WITHDRAWN');
}));
test('I2S2 publication duration, timezone, horizon, no config and role checks fail closed',()=>isolatedAvailability(async f=>{
 for(const role of ['admin','patient','lab','pharmacy'])await reject(f.publish(0,{},f.actors[role]),'AVAILABILITY_NOT_FOUND');
 await reject(f.publish(0,{endAt:new Date(f.start.getTime()+31*60000).toISOString()}),'AVAILABILITY_INVALID');
 await reject(f.publish(0,{startAt:'2000-01-01T00:00:00Z',endAt:'2000-01-01T00:30:00Z'}),'AVAILABILITY_CONFLICT');
 await reject(f.publish(100*1440),'AVAILABILITY_CONFLICT');
 await reject(f.publish(0,{startAt:f.input().startAt.replace('Z','+02:00'),endAt:f.input().endAt.replace('Z','+02:00')}),'AVAILABILITY_INVALID');
 const org=await f.org('CLINIC');const member=(await f.grant(f.users.clinician,org)).membership;let clinic=(await f.directory.createClinic(f.actors.admin,{organizationId:org.id,displayName:'Second',city:'City',address:'Address',operationKey:randomUUID()})).clinic;clinic=(await f.directory.setClinic(f.actors.admin,{clinicId:clinic.id,displayName:clinic.displayName,city:clinic.city,address:clinic.address,isPublished:true,expectedVersion:0})).clinic;await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:member.id,operationKey:randomUUID()});await reject(f.publish(60,{clinicId:clinic.publicId}),'AVAILABILITY_NOT_FOUND');
}));
for(const change of ['membership','organization','user','provider','clinic','affiliation','specialty'])test('I2S2 current public '+change+' revocation removes eligibility without rewriting slot; replay denied',()=>isolatedAvailability(async f=>{
 const input=f.input(),slot=await f.availability.publish(f.actors.clinician,input),before=(await f.pool.query('SELECT * FROM availability_slots')).rows;
 if(change==='membership')await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});
 if(change==='organization')await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});
 if(change==='user')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);
 if(change==='provider')await f.setProvider({isPublished:false});if(change==='clinic')await f.setClinic({isPublished:false});
 if(change==='affiliation')await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});
 if(change==='specialty')await f.directory.setSpecialty(f.actors.admin,{specialtyId:f.specialty.id,displayName:f.specialty.displayName,isPublished:false,expectedVersion:f.specialty.version});
 assert.equal((await f.request(f.path)).response.status,404);assert.deepEqual((await f.pool.query('SELECT * FROM availability_slots')).rows,before);await reject(f.availability.publish(f.actors.clinician,input),change==='user'?'AVAILABILITY_UNAUTHENTICATED':'AVAILABILITY_NOT_FOUND');if(change!=='user')assert.equal((await f.availability.history(f.actors.clinician,{})).data[0].id,slot.id);
}));
test('I2S2 public exact allowlist, all-role/invalid-cookie equivalence, HEAD/security/methods and canaries',()=>isolatedAvailability(async f=>{
 const slot=await f.publish(),r=await f.request(f.path);assert.equal(r.response.status,200);assert.deepEqual(Object.keys(r.json.data[0]).sort(),['id','providerId','clinicId','startAt','endAt','timeZone','bookable'].sort());assert.equal(r.json.data[0].bookable,true);
 for(const role of ['admin','clinician','patient','lab','pharmacy'])assert.deepEqual((await f.request(f.path,{headers:await f.login(role)})).json,r.json);
 assert.deepEqual((await f.request(f.path,{headers:{Cookie:'eh_session=invalid'}})).json,r.json);
 for(const value of [f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.publication.id,f.provider.id,f.clinicOrg.id,f.hash,f.password])assert.ok(!r.raw.includes(value));
 assert.doesNotMatch(r.raw,/email|phone|professionalIdentifier|password|session|operationKey|audit|relationship|assignment|patient|clinical|membership|affiliation/i);
 for(const path of [f.path,'/me/availability']){const headers=path===f.path?{}:await f.login('clinician');const head=await f.request(path,{method:'HEAD',headers:{...headers,'If-None-Match':'*'}});assert.equal(head.response.status,200);assert.equal(head.raw,'');assert.equal(head.response.headers.get('etag'),null);assert.equal(head.response.headers.get('last-modified'),null);assert.equal(head.response.headers.get('cache-control'),'no-store');}
 for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal((await f.request(f.path,{method})).response.status,405);
 for(const path of [f.path+'/',f.path.replace('availability','Availability')])assert.equal((await f.request(path)).response.status,404);
 for(const query of ['?sort=id','?includePrivate=true','?page=01','?page=1&page=2','?from=invalid','?patientId='+f.users.patient.id]){const bad=await f.request(f.path+query);assert.equal(bad.response.status,400);assert.doesNotMatch(bad.raw,/patientId|SQL|stack|password/);}
 const doctor=await f.login('clinician'),headers={...doctor,Origin:f.config.origin,'Content-Type':'application/json'};
 assert.equal((await f.http(60)).response.status,200);
 for(const raw of ['null','[]','{"operationKey":"'+randomUUID()+'","role":"ADMIN"}',JSON.stringify(f.input()).replace('"clinicId":','"clinicId":"'+f.clinic.publicId+'","\\u0063linicId":')])assert.equal((await f.request('/me/availability',{method:'POST',headers,body:raw})).response.status,400);
 assert.equal((await f.request('/me/availability',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'})).response.status,415);
 assert.equal((await f.request('/me/availability',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},body:JSON.stringify(f.input(90))})).response.status,403);
 assert.equal((await f.request('/me/availability',{method:'POST',headers:{...headers,'X-CSRF-Token':'invalid'},body:JSON.stringify(f.input(90))})).response.status,403);
 for(const role of ['admin','patient','lab','pharmacy'])assert.equal((await f.request('/me/availability',{headers:await f.login(role)})).response.status,404);
 const user=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'CLINICIAN',profile:{displayName:'Unrelated'}});const actor=await f.auth.createSession({userId:user.id,verifiedHash:f.hash,tokenHash:randomUUID().replaceAll('-','').repeat(2),previousHash:null});
 await reject(f.availability.withdraw(actor,{slotId:slot.id,operationKey:randomUUID(),expectedVersion:1}),'AVAILABILITY_NOT_FOUND');await reject(f.availability.withdraw(actor,{slotId:randomUUID(),operationKey:randomUUID(),expectedVersion:1}),'AVAILABILITY_NOT_FOUND');
}));
test('I2S2 current booking lead closes public eligibility without mutating historical snapshot',()=>isolatedAvailability(async f=>{
 const slot=await f.publish();assert.equal((await f.request(f.path)).json.meta.total,1);await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1,minimumBookingLead:10080});assert.equal((await f.request(f.path)).json.meta.total,0);assert.equal((await f.availability.history(f.actors.clinician,{})).data[0].id,slot.id);
}));
test('I2S2 raw HTTP byte/media/duplicate security, no-store errors and database failure canary',()=>isolatedAvailability(async f=>{
 const {Buffer}=await import('node:buffer'),doctor=await f.login('clinician'),headers={...doctor,Origin:f.config.origin,'Content-Type':'application/json'};
 for(const [body,status,extra] of [[Buffer.from([0xff,0xfe]),400,{}],['x'.repeat(16385),413,{}],['{}',415,{'Content-Encoding':'gzip'}],['{}',400,{'Idempotency-Key':randomUUID()}]]){const r=await f.request('/me/availability',{method:'POST',headers:{...headers,...extra},body});assert.equal(r.response.status,status);assert.equal(r.response.headers.get('cache-control'),'no-store');}
 assert.equal((await f.request('/me/availability?page=1',{method:'POST',headers,body:JSON.stringify(f.input())})).response.status,400);
 for(const method of ['GET','HEAD']){const r=await f.request('/me/availability',{method});assert.equal(r.response.status,401);if(method==='HEAD')assert.equal(r.raw,'');}
 await f.pool.query('ALTER TABLE availability_slots RENAME TO private_sql_canary');
 try{for(const method of ['GET','HEAD']){const r=await f.request(f.path,{method});assert.equal(r.response.status,503);assert.doesNotMatch(r.raw,/private_sql_canary|SELECT|FROM|stack|postgres|password|operationKey/);if(method==='HEAD')assert.equal(r.raw,'');}}finally{await f.pool.query('ALTER TABLE private_sql_canary RENAME TO availability_slots');}
}));
test('I2S2 ended membership regrant does not rebind old slot publication operation',()=>isolatedAvailability(async f=>{
 const input=f.input();await f.availability.publish(f.actors.clinician,input);await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});const member=(await f.grant(f.users.clinician,f.clinicOrg)).membership;await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:member.id,operationKey:randomUUID()});await reject(f.availability.publish(f.actors.clinician,input),'AVAILABILITY_NOT_FOUND');assert.equal((await f.request(f.path)).json.meta.total,0);assert.equal((await f.availability.history(f.actors.clinician,{})).meta.total,1);
}));
test('I2S2 public success/error canaries exclude all retained identity/session/clinical/relationship/operation/audit sources',()=>isolatedAvailability(async f=>{
 const {createRelationshipPersistence}=await import('../../packages/db/dist/index.js');const relationships=createRelationshipPersistence(f.url);
 try{
  await f.pool.query("UPDATE clinician_profiles SET professional_identifier='PRIVATE_PROFESSIONAL_PHONE_01234567890',specialty='PRIVATE_CLINICAL_CONTENT_CANARY' WHERE id=$1",[f.users.clinician.profileId]);
  const assignment=await f.identities.assignPatient({clinicianId:f.users.clinician.profileId,patientId:f.users.patient.profileId});
  const request=await relationships.authorize(f.actors.patient,{assignmentId:assignment.id,operationKey:randomUUID()});await relationships.decide(f.actors.clinician,{requestId:request.request.id},'accept');
  const input=f.input(),slot=await f.availability.publish(f.actors.clinician,input);
  const sessions=(await f.pool.query('SELECT id,token_hash FROM sessions')).rows;
  const operations=(await f.pool.query('SELECT operation_key,fingerprint FROM availability_operations')).rows;
  const audit=(await f.pool.query("SELECT id FROM audit_logs WHERE action_type='AVAILABILITY_PUBLISHED'")).rows;
  const canaries=[f.users.clinician.email,f.users.patient.email,f.users.patient.id,f.users.patient.profileId,f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.publication.id,f.provider.id,f.clinicOrg.id,f.hash,f.password,input.operationKey,assignment.id,request.request.id,'PRIVATE_PROFESSIONAL_PHONE_01234567890','PRIVATE_CLINICAL_CONTENT_CANARY',...sessions.flatMap(x=>[x.id,x.token_hash]),...operations.flatMap(x=>[x.operation_key,x.fingerprint]),...audit.map(x=>x.id)];
  for(const path of [f.path,f.path+'?patientId='+f.users.patient.id,'/directory/providers/'+randomUUID()+'/availability']){const r=await f.request(path);assert.ok([200,400,404].includes(r.response.status));for(const canary of canaries)assert.ok(!r.raw.includes(canary));assert.doesNotMatch(r.raw,/email|phone|userId|profileId|professionalIdentifier|password|session|operationKey|audit|relationship|assignment|patient|clinical|membership|affiliation/i);}
  const history=await f.availability.history(f.actors.clinician,{});assert.deepEqual(Object.keys(history.data[0]).sort(),['id','providerId','clinicId','startAt','endAt','timeZone','state','version','publishedAt','withdrawnAt'].sort());
  await f.availability.withdraw(f.actors.clinician,{slotId:slot.id,expectedVersion:1,operationKey:randomUUID()});await assert.rejects(f.pool.query("UPDATE availability_slots SET state='PUBLISHED',version=1,withdrawn_at=NULL,withdrawn_by_user_id=NULL WHERE id=$1",[slot.id]),e=>e.code==='23514');
  await f.publish();const all=await f.availability.history(f.actors.clinician,{});assert.deepEqual(all.data.map(x=>x.id),all.data.map(x=>x.id).sort());assert.equal((await f.availability.history(f.actors.clinician,{page:'2',pageSize:'1'})).data[0].id,all.data[1].id);
 }finally{await relationships.close();}
}));
test('I2S2 ordinary SQL cannot rewrite operation/history, skip versions, bypass bounds or duplicate command identity',()=>isolatedAvailability(async f=>{
 const slot=await f.publish(),audit=await availabilityAudits(f.pool);
 for(const sql of ["UPDATE availability_operations SET result='{}' WHERE false",'DELETE FROM availability_operations WHERE false','TRUNCATE availability_operations','DELETE FROM availability_slots WHERE false','TRUNCATE availability_slots CASCADE'])await assert.rejects(f.pool.query(sql),e=>e.code==='23514');
 for(const [version,duration,zone] of [[3,30,'UTC'],[2,4,'UTC'],[2,30,'Not/AZone']])await assert.rejects(f.pool.query('INSERT INTO clinic_scheduling_settings(organization_id,version,time_zone,duration_minutes,minimum_booking_lead,publication_horizon_days,changed_by_user_id) VALUES($1,$2,$3,$4,0,30,$5)',[f.clinicOrg.id,version,zone,duration,f.users.admin.id]),e=>e.code==='23514');
 await assert.rejects(f.pool.query('INSERT INTO availability_operations SELECT * FROM availability_operations'),e=>e.code==='23505');
 assert.equal((await f.availability.configurationHistory(f.actors.admin,f.clinicOrg.id)).length,1);assert.equal((await f.availability.history(f.actors.clinician,{})).data[0].id,slot.id);assert.deepEqual(await availabilityAudits(f.pool),audit);
}));
