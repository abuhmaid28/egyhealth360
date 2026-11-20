import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../tests/support/directory.mjs';
const manifest={manifest:'eh-v3-i1-slice4-directory-proof-v1',scope:'V3_I1_SLICE4_CURATED_PUBLIC_DIRECTORY'};
// Explicit synthetic, isolated database + real HTTP API, same pattern as Slice 2.
// No import from startup/worker, no M1 edits, no default privileged credential.
// Generated IDs/password are local test values; assertions/data/ordering are fixed.
try{
 assert.ok(['development','test'].includes(process.env.NODE_ENV),'Disposable development/test only');
 let cases=0;
 await isolatedDirectory(async f=>{
  const expected={id:f.provider.publicId,displayName:'Synthetic Doctor',specialty:{key:f.specialty.key,displayName:f.specialty.displayName},clinics:[{id:f.clinic.publicId,displayName:f.clinic.displayName,city:f.clinic.city,address:f.clinic.address}]};
  let r=await f.request();assert.equal(r.response.status,200);assert.deepEqual(r.json.data,[expected]);cases++;
  assert.deepEqual((await f.request('/directory/specialties')).json.data,[expected.specialty]);cases++;
  assert.deepEqual((await f.request('/directory/clinics')).json.data,expected.clinics);cases++;
  assert.deepEqual((await f.request('/directory/providers/'+f.provider.publicId)).json,{data:expected});cases++;
  const unpublished=(await f.directory.createProvider(f.actors.admin,{clinicianId:(await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'CLINICIAN',profile:{displayName:'Synthetic Unpublished'}})).profileId,specialtyId:f.specialty.id,displayName:'Synthetic Unpublished',operationKey:randomUUID()})).provider;
  assert.equal((await f.request('/directory/providers/'+unpublished.publicId)).response.status,404);cases++;
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});assert.equal((await f.request()).json.meta.total,0);
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'ACTIVE',expectedVersion:1});assert.equal((await f.request()).json.meta.total,1);cases++;
  await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);assert.equal((await f.request()).json.meta.total,0);await f.pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1",[f.users.clinician.id]);cases++;
  assert.doesNotMatch(r.raw,/email|password|userId|clinicianId|professionalIdentifier|membershipId|grantedBy|operationKey|actor|patient|assignment|encounter|audit/i);
  for(const privateId of [f.users.clinician.id,f.users.clinician.profileId,f.clinicOrg.id,f.membership.id,f.provider.id])assert.ok(!r.raw.includes(privateId));cases++;
  for(const role of ['patient','clinician','lab','pharmacy','admin'])assert.deepEqual((await f.request(undefined,{headers:await f.login(role)})).json.data,[expected]);cases++;
  const doctor=await f.login('clinician');assert.equal((await f.request('/patients/'+f.users.patient.profileId+'/blood-pressure-measurements',{headers:doctor})).response.status,404);assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);cases++;
  await f.setClinic({isPublished:false});assert.equal((await f.request('/directory/providers/'+f.provider.publicId,{headers:{'If-None-Match':'*'}})).response.status,404);await f.setClinic({isPublished:true});
  r=await f.request('/directory/providers/'+f.provider.publicId,{method:'HEAD',headers:{'If-None-Match':'*'}});assert.equal(r.response.status,200);assert.equal(r.raw,'');assert.equal(r.response.headers.get('cache-control'),'no-store');assert.equal(r.response.headers.get('etag'),null);cases++;
  await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});assert.equal((await f.request()).json.meta.total,0);
  const fresh=(await f.grant(f.users.clinician,f.clinicOrg)).membership;assert.notEqual(fresh.id,f.membership.id);assert.equal((await f.request()).json.meta.total,0);
  await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:fresh.id,operationKey:randomUUID()});assert.equal((await f.request()).json.meta.total,1);cases++;
 });
 console.log(JSON.stringify({...manifest,result:'PASS',cases,realHttp:true,isolatedSyntheticDatabase:true}));
}catch{console.error(JSON.stringify({...manifest,result:'FAIL'}));process.exitCode=1;}
