import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedAvailability} from '../tests/support/availability.mjs';
const manifest='eh-v3-i2-slice2-availability-proof-v1';
let cases=0;
try{
 assert.ok(['development','test'].includes(process.env.NODE_ENV));
 await isolatedAvailability(async f=>{
  assert.ok(f.clinic.publicId);cases++;
  const cfg=await f.availability.configurationHistory(f.actors.admin,f.clinicOrg.id);assert.equal(cfg[0].time_zone,'UTC');assert.equal(cfg[0].version,1);cases++;
  await assert.rejects(f.availability.setConfiguration(f.actors.clinician,{...f.settings,expectedVersion:1}),e=>e.code==='AVAILABILITY_NOT_FOUND');cases++;
  const doctor=await f.login('clinician'),headers={...doctor,Origin:f.config.origin,'Content-Type':'application/json'},input=f.input();
  const write=body=>f.request('/me/availability',{method:'POST',headers,body:JSON.stringify(body)});
  const publication=await write(input);assert.equal(publication.response.status,200);const slot=publication.json.data;cases++;
  const publicResult=await f.request(f.path);assert.equal(publicResult.json.meta.total,1);assert.deepEqual(Object.keys(publicResult.json.data[0]).sort(),['id','providerId','clinicId','startAt','endAt','timeZone','bookable'].sort());cases++;
  for(const role of ['admin','clinician','patient','lab','pharmacy'])assert.deepEqual((await f.request(f.path,{headers:await f.login(role)})).json,publicResult.json);assert.deepEqual((await f.request(f.path,{headers:{Cookie:'eh_session=invalid'}})).json,publicResult.json);cases++;
  f.users.unrelated=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'CLINICIAN',profile:{displayName:'Synthetic Unrelated'}});
  const other=await f.login('unrelated');assert.equal((await f.request('/me/availability/'+slot.id+'/withdraw',{method:'PUT',headers:{...other,Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify({operationKey:randomUUID(),expectedVersion:1})})).response.status,404);cases++;
  assert.equal((await f.request('/me/availability',{headers:doctor})).json.data[0].id,slot.id);cases++;
  assert.equal((await write(f.input(15))).response.status,409);cases++;
  assert.equal((await write(f.input(30))).response.status,200);cases++;
  assert.deepEqual((await write(input)).json,publication.json);cases++;
  assert.equal((await write({...f.input(90),operationKey:input.operationKey})).response.status,409);cases++;
  await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1,timeZone:'Etc/GMT-2'});
  const retained=(await f.pool.query('SELECT time_zone,configuration_version FROM availability_slots WHERE id=$1',[slot.id])).rows[0];assert.deepEqual(retained,{time_zone:'UTC',configuration_version:1});cases++;
  const shifted=f.input(60);for(const field of ['startAt','endAt'])shifted[field]=new Date(new Date(shifted[field]).getTime()+7200000).toISOString().replace('Z','+02:00');
  const fresh=await write(shifted);assert.equal(fresh.response.status,200);assert.equal(fresh.json.data.timeZone,'Etc/GMT-2');assert.equal((await f.pool.query('SELECT configuration_version FROM availability_slots WHERE id=$1',[fresh.json.data.id])).rows[0].configuration_version,2);cases++;
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});assert.equal((await f.request(f.path)).response.status,404);assert.equal((await f.request('/me/availability',{headers:doctor})).json.meta.total,3);await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'ACTIVE',expectedVersion:1});cases++;
  await f.setProvider({isPublished:false});assert.equal((await f.request(f.path)).response.status,404);await f.setProvider({isPublished:true});assert.equal((await f.request(f.path)).json.meta.total,3);cases++;
  const command={operationKey:randomUUID(),expectedVersion:1},withdrawPath='/me/availability/'+slot.id+'/withdraw';const withdrawn=await f.request(withdrawPath,{method:'PUT',headers,body:JSON.stringify(command)});assert.equal(withdrawn.response.status,200);assert.equal(withdrawn.json.data.state,'WITHDRAWN');assert.deepEqual((await f.request(withdrawPath,{method:'PUT',headers,body:JSON.stringify(command)})).json,withdrawn.json);cases++;
  assert.ok(!(await f.request(f.path)).json.data.some(x=>x.id===slot.id));cases++;
  await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});assert.equal((await f.request(f.path)).response.status,404);const history=(await f.request('/me/availability',{headers:doctor})).json;assert.equal(history.meta.total,3);assert.equal(history.data.find(x=>x.id===slot.id).state,'WITHDRAWN');cases++;
  assert.equal((await f.request('/patients/'+f.users.patient.profileId+'/profile',{headers:await f.login('admin')})).response.status,404);assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);cases++;
  for(const path of [f.path,'/me/availability']){const head=await f.request(path,{method:'HEAD',headers:doctor});assert.equal(head.raw,'');assert.equal(head.response.headers.get('cache-control'),'no-store');assert.equal(head.response.headers.get('etag'),null);}cases++;
  assert.doesNotMatch(publicResult.raw,/email|phone|password|session|professionalIdentifier|membership|affiliation|operationKey|audit|assignment|patient|clinical/i);for(const value of [f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.publication.id,f.provider.id,f.hash,f.password,input.operationKey])assert.ok(!publicResult.raw.includes(value));cases++;
 });
 console.log(JSON.stringify({manifest,result:'PASS',cases,realHttp:true,isolatedSyntheticDatabase:true}));
}catch(e){console.error(JSON.stringify({manifest,result:'FAIL',cases,error:e.code??e.message}));process.exitCode=1;}
