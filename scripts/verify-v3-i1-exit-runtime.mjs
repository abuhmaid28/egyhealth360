import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isolatedDirectory} from '../tests/support/directory.mjs';
export const EXIT_MANIFEST='eh-v3-i1-slice6-exit-proof-v1';
export async function verifyI1Exit(){
 let cases=0;
 await isolatedDirectory(async f=>{
  const mutate=(path,body,headers={},method='PUT')=>f.request(path,{method,headers:{...headers,Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const input={email:`${randomUUID()}@example.invalid`,password:' Synthetic slice6 password bytes ',displayName:'Synthetic Slice 6 Patient'};
  const register=body=>mutate('/auth/register',body,{'X-EH-Register':'1'},'POST');
  for(const field of ['role','status','organizationId','membershipId','providerId','relationshipRequest','assignmentId']){
   const r=await register({...input,[field]:field==='role'?'ADMIN':f.provider.publicId});assert.equal(r.response.status,400);
  }cases++;
  const registered=await register(input);assert.equal(registered.response.status,202);assert.deepEqual(registered.json,{data:{accepted:true}});assert.equal(registered.response.headers.get('set-cookie'),null);cases++;
  const before=(await f.pool.query('SELECT id,password_hash,role,status FROM users WHERE email=$1',[input.email])).rows[0];assert.equal(before.role,'PATIENT');assert.equal(before.status,'ACTIVE');
  assert.equal((await register({...input,displayName:'Do not overwrite',password:'different'})).response.status,202);assert.deepEqual((await f.pool.query('SELECT id,password_hash,role,status FROM users WHERE email=$1',[input.email])).rows[0],before);cases++;
  const login=await mutate('/auth/login',{email:input.email,password:input.password},{'X-EH-Login':'1'},'POST');assert.equal(login.response.status,200);
  const patient={Cookie:login.response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':login.json.data.csrfToken};cases++;
  const own=await f.request('/me/profile',{headers:patient});assert.equal(own.response.status,200);const patientId=own.json.data.id;
  assert.equal((await mutate('/me/profile',{displayName:input.displayName,dateOfBirth:null,sex:null},patient)).response.status,200);cases++;
  const clinician=await f.login('clinician'),otherPatient=await f.login('patient');
  const clinical=()=>f.request(`/patients/${patientId}/blood-pressure-measurements`,{headers:clinician});
  assert.equal((await clinical()).response.status,404);cases++;
  const publicBefore=await f.request();assert.equal(publicBefore.json.data[0].id,f.provider.publicId);
  for(const secret of [before.id,patientId,f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.provider.id,input.email,before.password_hash])assert.ok(!publicBefore.raw.includes(secret));cases++;
  const authorize=async()=>{const r=await mutate('/me/relationship-requests',{providerId:f.provider.publicId,operationKey:randomUUID()},patient,'POST');assert.equal(r.response.status,200);return r.json.data.request;};
  const request=await authorize();assert.equal((await clinical()).response.status,404);cases++;
  assert.equal((await mutate(`/me/relationship-requests/${request.id}/accept`,{},patient)).response.status,404);
  assert.equal((await f.request(`/me/relationship-requests/${request.id}`,{headers:otherPatient})).response.status,404);cases++;
  const accepted=await mutate(`/me/relationship-requests/${request.id}/accept`,{},clinician);assert.equal(accepted.response.status,200);const a=accepted.json.data.request.assignmentId;
  assert.ok(a);assert.equal((await clinical()).response.status,200);cases++;
  const bp=await mutate(`/patients/${patientId}/blood-pressure-measurements`,{systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-29T00:00:00.000Z'},patient,'POST');assert.equal(bp.response.status,201);assert.equal((await clinical()).json.data.length,1);cases++;
  for(const role of ['lab','pharmacy','admin']){const headers=await f.login(role);
   if(role==='pharmacy'){const org=await f.org('PHARMACY');await f.grant(f.users.pharmacy,org);}
   for(const path of [`/patients/${patientId}/profile`,`/patients/${patientId}/blood-pressure-measurements`,'/me/profile','/me/relationship-requests'])assert.equal((await f.request(path,{headers})).response.status,404);
   assert.deepEqual((await f.request('/directory/providers',{headers})).json,publicBefore.json);cases++;
  }
  assert.equal((await f.request(`/patients/${patientId}/profile`,{headers:otherPatient})).response.status,404);cases++;
  await f.setProvider({isPublished:false});assert.equal((await f.request()).json.data.length,0);assert.equal((await clinical()).response.status,200);cases++;
  await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});assert.equal((await clinical()).response.status,200);cases++;
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});assert.equal((await clinical()).response.status,200);cases++;
  const withdraw=await mutate(`/me/relationship-requests/${request.id}/withdraw`,{},patient);assert.equal(withdraw.response.status,200);assert.equal(withdraw.json.data.request.status,'ACCEPTED');assert.equal((await clinical()).response.status,404);cases++;
  const history=await f.request(`/me/relationships/${a}`,{headers:clinician});assert.equal(history.json.data.status,'ENDED');assert.equal(history.json.data.patientId,null);cases++;
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'ACTIVE',expectedVersion:1});
  const membership=(await f.grant(f.users.clinician,f.clinicOrg)).membership;
  await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:membership.id,operationKey:randomUUID()});await f.setProvider({isPublished:true});
  const fresh=await authorize();assert.equal((await clinical()).response.status,404);
  const reaccepted=await mutate(`/me/relationship-requests/${fresh.id}/accept`,{},clinician);assert.equal(reaccepted.response.status,200);const b=reaccepted.json.data.request.assignmentId;assert.notEqual(a,b);cases++;
  for(const path of [`/me/relationships/${a}/end`,`/me/relationship-requests/${request.id}/withdraw`]){assert.equal((await mutate(path,{},patient)).json.data.changed,false);assert.equal((await clinical()).response.status,200);}cases++;
  await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);assert.equal((await clinical()).response.status,401);assert.equal((await f.request()).json.data.length,0);cases++;
  await mutate('/auth/logout',{},patient,'POST');assert.equal((await f.request('/me/profile',{headers:patient})).response.status,401);cases++;
  const audits=(await f.pool.query('SELECT safe_metadata FROM audit_logs')).rows;assert.ok(audits.every(a=>JSON.stringify(a.safe_metadata)==='{}'));
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type='PATIENT_SELF_REGISTERED'")).rows[0].n,1);
  assert.deepEqual((await f.pool.query('SELECT status FROM clinician_patient_assignments ORDER BY assigned_at,id')).rows.map(x=>x.status),['ENDED','ACTIVE']);cases++;
 },{relationships:true,patientEntry:true});
 return{manifest:EXIT_MANIFEST,result:'PASS',cases,realHttp:true,isolatedSyntheticDatabase:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{assert.ok(['development','test'].includes(process.env.NODE_ENV));console.log(JSON.stringify(await verifyI1Exit()));}
 catch{console.error(JSON.stringify({manifest:EXIT_MANIFEST,result:'FAIL'}));process.exitCode=1;}
}
