import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../tests/support/directory.mjs';
const manifest={manifest:'eh-v3-i1-slice5-bilateral-proof-v1',scope:'V3_I1_SLICE5_BILATERAL_RELATIONSHIP_LIFECYCLE'};
try{
 assert.ok(['development','test'].includes(process.env.NODE_ENV),'Disposable synthetic development/test only');let cases=0;
 await isolatedDirectory(async f=>{
  const patient=await f.login('patient'),clinician=await f.login('clinician');
  const mutate=async(path,body={},headers=patient,method='PUT')=>f.request(path,{method,headers:{...headers,Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const authorize=async()=>{const r=await mutate('/me/relationship-requests',{providerId:f.provider.publicId,operationKey:randomUUID()},patient,'POST');assert.equal(r.response.status,200);return r.json.data.request;};
  const clinical=()=>f.request('/patients/'+f.users.patient.profileId+'/profile',{headers:clinician});
  assert.equal((await clinical()).response.status,404);cases++;
  const pending=await authorize();assert.equal(pending.status,'PENDING');assert.equal((await clinical()).response.status,404);cases++;
  for(const role of ['admin','lab','pharmacy']){const h=await f.login(role);assert.equal((await f.request('/me/relationship-requests',{headers:h})).response.status,404);}cases++;
  assert.equal((await mutate('/me/relationship-requests/'+pending.id+'/accept',{},patient)).response.status,404);cases++;
  const accepted=await mutate('/me/relationship-requests/'+pending.id+'/accept',{},clinician);assert.equal(accepted.response.status,200);assert.equal(accepted.json.data.request.status,'ACCEPTED');const a=accepted.json.data.request.assignmentId;assert.equal((await clinical()).response.status,200);cases++;
  const withdrawn=await mutate('/me/relationship-requests/'+pending.id+'/withdraw');assert.equal(withdrawn.response.status,200);assert.equal(withdrawn.json.data.request.status,'ACCEPTED');assert.ok(withdrawn.json.data.request.authorizationWithdrawnAt);assert.equal((await clinical()).response.status,404);cases++;
  assert.equal((await mutate('/me/relationship-requests/'+pending.id+'/withdraw')).json.data.changed,false);cases++;
  const fresh=await authorize(),b=(await mutate('/me/relationship-requests/'+fresh.id+'/accept',{},clinician)).json.data.request.assignmentId;assert.notEqual(a,b);assert.equal((await mutate('/me/relationships/'+a+'/end')).json.data.changed,false);assert.equal((await clinical()).response.status,200);cases++;
  assert.equal((await mutate('/me/relationships/'+b+'/end',{},clinician)).response.status,200);assert.equal((await clinical()).response.status,404);cases++;
  const history=await f.request('/me/relationships/'+b,{headers:clinician});assert.equal(history.json.data.patientId,null);assert.equal(history.json.data.endedByRole,'CLINICIAN');cases++;
  const decline=await authorize();assert.equal((await mutate('/me/relationship-requests/'+decline.id+'/decline',{},clinician)).json.data.request.status,'DECLINED');cases++;
  const withdraw=await authorize();assert.equal((await mutate('/me/relationship-requests/'+withdraw.id+'/withdraw')).json.data.request.status,'WITHDRAWN');assert.equal((await mutate('/me/relationship-requests/'+withdraw.id+'/accept',{},clinician)).response.status,409);cases++;
  const head=await f.request('/me/relationship-requests',{method:'HEAD',headers:patient});assert.equal(head.raw,'');assert.equal(head.response.headers.get('cache-control'),'no-store');assert.equal(head.response.headers.get('etag'),null);cases++;
  const legacy=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});await f.setProvider({isPublished:false});
  const confirmation=await mutate('/me/relationship-requests',{assignmentId:legacy.id,operationKey:randomUUID()},patient,'POST');assert.equal(confirmation.response.status,200);assert.equal(confirmation.json.data.request.providerId,null);
  const legacyRequest=confirmation.json.data.request.id;assert.equal((await mutate('/me/relationship-requests/'+legacyRequest+'/accept',{},clinician)).json.data.request.assignmentId,legacy.id);assert.equal((await mutate('/me/relationship-requests/'+legacyRequest+'/withdraw')).response.status,200);assert.equal((await clinical()).response.status,404);cases++;
  for(const key of ['patientUserId','clinicianUserId','clinicianId','email','professionalIdentifier','operationKey','passwordHash'])assert.ok(!JSON.stringify(accepted.json).includes('"'+key+'"'));assert.equal((await f.pool.query('SELECT count(*)::int n FROM assignment_end_provenance')).rows[0].n,3);cases++;
 },{relationships:true});
 console.log(JSON.stringify({...manifest,result:'PASS',cases,realHttp:true,isolatedSyntheticDatabase:true}));
}catch{console.error(JSON.stringify({...manifest,result:'FAIL'}));process.exitCode=1;}
