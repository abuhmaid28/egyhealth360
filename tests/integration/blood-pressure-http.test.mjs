import test from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { isolatedBp,bpInput,bpSnapshot } from '../support/blood-pressure.mjs';
import { createApp } from '../../apps/api/dist/app.js';
import { createAuthPersistence,createDatabase } from '../../packages/db/dist/index.js';
import { hashPassword,createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';
const denied={error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}};
async function withHttp(run,wrap=bp=>bp){return isolatedBp(async f=>{
  const password=randomBytes(32).toString('base64url');
  await f.pool.query('UPDATE users SET password_hash=$1',[await hashPassword(Buffer.from(password))]);
  const auth=createAuthPersistence(f.url),db=createDatabase(f.url),config=authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'});
  const app=await createApp(db,{store:auth,passwords:await createPasswordVerifier(),config},undefined,wrap(f.bp,f));
  try{
    await app.listen(0,'127.0.0.1');const base=await app.getUrl();
    const request=(path,{method='GET',body,session,headers={},pairs=[]}={})=>new Promise((resolve,reject)=>{
      const text=body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body);
      const h={Host:new URL(base).host,...(method==='POST'?{Origin:config.origin,'Content-Type':'application/json'}:{}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...(text!==undefined?{'Content-Length':Buffer.byteLength(text)}:{}),...headers};
      const req=httpRequest(base,{path,method,headers:[...Object.entries(h).filter(([,v])=>v!==undefined).flat(),...pairs.flat()]},res=>{
        let text='';res.on('data',b=>{text+=b;});res.on('end',()=>{let json;try{json=text?JSON.parse(text):undefined;}catch{reject(new Error('Non-JSON response'));return;}resolve({status:res.statusCode,headers:res.headers,text,json});});
      });req.on('error',reject);req.end(text);
    });
    const sessions={};for(const [key,i] of Object.entries(f.identities)){
      const r=await request('/api/v1/auth/login',{method:'POST',body:{email:i.email,password},headers:{'X-EH-Login':'1'}});assert.equal(r.status,200);
      sessions[key]={cookie:r.headers['set-cookie'][0].split(';')[0],csrf:r.json.data.csrfToken};
    }
    const path=id=>`/api/v1/patients/${id}/blood-pressure-measurements`;
    await run({...f,request,path,sessions,config,auth});
  }finally{await app.close();await auth.close();await db.close();}
});}
function noStore(r){assert.equal(r.headers['cache-control'],'no-store');}
function projection(row){assert.deepEqual(Object.keys(row).sort(),['id','patientId','systolic','diastolic','unit','measuredAt','createdAt','sourceKind'].sort());assert.equal(row.unit,'mmHg');assert.match(row.measuredAt,/\.\d{3}Z$/);assert.match(row.createdAt,/\.\d{3}Z$/);}
test('BP HTTP genuine sessions: self/assigned matrix, exact minimized projection and persisted provenance',()=>withHttp(async f=>{
  for(const [key,identity] of Object.entries(f.identities))for(const target of ['patient-a','patient-b']){
    const patientId=f.identities[target].profileId,allowed=key===target||(key==='clinician-assigned'&&target==='patient-a'),session=f.sessions[key];
    for(const method of ['POST','GET','HEAD']){
      const before=await bpSnapshot(f.pool);
      const r=await f.request(f.path(patientId),{session,method,...(method==='POST'?{body:bpInput}:{})});noStore(r);assert.equal(r.status,allowed?(method==='POST'?201:200):404);
      if(method==='HEAD')assert.equal(r.text,'');else if(!allowed)assert.deepEqual(r.json,denied);else if(method==='POST'){
        projection(r.json.data);const row=(await f.pool.query('SELECT * FROM blood_pressure_measurements WHERE id=$1',[r.json.data.id])).rows[0];assert.equal(row.patient_id,patientId);assert.equal(row.recorded_by_user_id,identity.userId);assert.equal(row.source_kind,key.startsWith('patient-')?'PATIENT_SELF_ENTRY':'CLINICIAN_ENTRY');
      }else {r.json.data.forEach(projection);assert.equal(r.json.meta.page,1);}
      const after=await bpSnapshot(f.pool);assert.equal(after.bp.length-before.bp.length,method==='POST'&&allowed?1:0);assert.equal(after.audit.length-before.audit.length,method==='POST'&&allowed?1:0);
    }
  }
}));
test('BP HTTP lexical, shape, unit, time and malformed input errors are safe and atomic',()=>withHttp(async f=>{
  const session=f.sessions['patient-a'],path=f.path(f.patientId),valid=JSON.stringify(bpInput),before=await bpSnapshot(f.pool);
  const invalid=['','{bad','null','[]','true','{}',...['"128"','true','null','128.1','128.0','1e2','-0','2147483648','128.00000000000000001','1e999'].map(n=>valid.replace('128',n)),valid.replace('"systolic":128','"systolic":128,"systolic":129'),valid.replace('"systolic":128','"systolic":128,"sy\\u0073tolic":129')];
  for(const key of ['actorId','recordedByUserId','sourceKind','patientId','role','clinicianId','unknown-secret'])invalid.push(JSON.stringify({...bpInput,[key]:'sensitive-value'}));
  for(const measuredAt of ['2023-02-29T00:00:00Z','2024-04-31T00:00:00Z','2024-01-01T24:00:00Z','2024-01-01T00:00:60Z','2024-01-01T00:00:00','2024-01-01T00:00:00.0001Z','2024-01-01T00:00:00-00:00','0000-01-01T00:00:00Z','9999-01-01T00:00:00Z','2024-01-01T00:00:00Z\n'])invalid.push(JSON.stringify({...bpInput,measuredAt}));
  for(const unit of [null,'mmhg','mmHg ','kPa'])invalid.push(JSON.stringify({...bpInput,unit}));
  for(const key of Object.keys(bpInput)){const b={...bpInput};delete b[key];invalid.push(JSON.stringify(b));}
  for(const body of invalid){const r=await f.request(path,{method:'POST',session,body});assert.equal(r.status,400,body);noStore(r);assert.ok(['REQUEST_INVALID','BP_MEASUREMENT_INVALID'].includes(r.json.error.code));for(const field of r.json.error.fields??[])assert.ok(['systolic','diastolic','unit','measuredAt','$'].includes(field.field));assert.ok(!r.text.includes('sensitive-value'));assert.ok(!r.text.includes('unknown-secret'));}
  assert.deepEqual(await bpSnapshot(f.pool),before);
  for(const [fraction,expected] of [['','000'],['.1','100'],['.12','120'],['.123','123']]){
    const r=await f.request(path,{method:'POST',session,body:{...bpInput,systolic:-2147483648,diastolic:2147483647,measuredAt:`2024-02-29T02:30:00${fraction}+02:30`}});assert.equal(r.status,201);assert.equal(r.json.data.measuredAt,`2024-02-29T00:00:00.${expected}Z`);
  }
}));
test('BP HTTP Origin, Fetch Metadata, CSRF, media, size, query and idempotency contracts',()=>withHttp(async f=>{
  const path=f.path(f.patientId),session=f.sessions['patient-a'],before=await bpSnapshot(f.pool);
  for(const headers of [{Origin:undefined},{Origin:'null'},{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':'unknown'},{'X-CSRF-Token':undefined},{'X-CSRF-Token':'invalid'}]){
    const r=await f.request(path,{method:'POST',session,body:bpInput,headers});assert.equal(r.status,403);noStore(r);
  }
  for(const headers of [{'Content-Type':undefined},{'Content-Type':'text/plain'},{'Content-Type':'application/json; charset=latin1'},{'Content-Encoding':'gzip'}]){
    const r=await f.request(path,{method:'POST',session,body:bpInput,headers});assert.equal(r.status,415);noStore(r);
  }
  const duplicate=await f.request(path,{method:'POST',session,body:bpInput,pairs:[['Content-Type','application/json']]});assert.equal(duplicate.status,415);noStore(duplicate);
  for(const suffix of ['?','?page=1'])assert.equal((await f.request(path+suffix,{method:'POST',session,body:bpInput})).status,400);
  assert.equal((await f.request(path,{method:'POST',session,body:bpInput,headers:{'Idempotency-Key':'test'}})).status,400);
  const large=await f.request(path,{method:'POST',session,body:JSON.stringify({...bpInput,payload:'x'.repeat(17000)})});assert.equal(large.status,413);noStore(large);
  assert.deepEqual(await bpSnapshot(f.pool),before);
  for(const site of [undefined,'same-site','same-origin','none'])assert.equal((await f.request(path,{method:'POST',session,body:bpInput,headers:{'Content-Type':'application/json; charset=utf-8','Sec-Fetch-Site':site}})).status,201);
}));
test('BP HTTP pagination/empty/ordering and non-idempotent repeated POST',()=>withHttp(async f=>{
  const session=f.sessions['patient-a'],path=f.path(f.patientId);const empty=await f.request(path,{session});assert.deepEqual(empty.json,{data:[],meta:{page:1,pageSize:20,total:0}});
  const rows=[];for(const measuredAt of ['2024-01-01T00:00:00Z','2024-02-01T00:00:00Z','2024-02-01T00:00:00Z']){const r=await f.request(path,{method:'POST',session,body:{...bpInput,measuredAt}});assert.equal(r.status,201);rows.push(r.json.data);}
  assert.notEqual(rows[1].id,rows[2].id);
  const expected=[...rows].sort((a,b)=>b.measuredAt.localeCompare(a.measuredAt)||b.id.localeCompare(a.id));
  const page=await f.request(path+'?page=1&pageSize=2',{session});assert.deepEqual(page.json.data,expected.slice(0,2));assert.deepEqual(page.json.meta,{page:1,pageSize:2,total:3});
  assert.deepEqual((await f.request(path+'?page=2&pageSize=2',{session})).json.data,expected.slice(2));
  assert.deepEqual((await f.request(path+'?page=3&pageSize=2',{session})).json.data,[]);
  for(const query of ['','page=0','page=01','page=1e2','pageSize=101','pageSize=','page=1&page=2','actor=x','%70age=1','page=%31']){const r=await f.request(path+'?'+query,{session});assert.equal(r.status,400);noStore(r);}
  for(const method of ['GET','HEAD'])assert.equal((await f.request(path,{method,session,body:'{}'})).status,400);
  const audits=await bpSnapshot(f.pool);assert.equal(audits.audit.length,3);
}));
test('BP HTTP malformed/encoded IDs, aliases, HEAD and unsupported methods do not leak objects',()=>withHttp(async f=>{
  const session=f.sessions['patient-a'];
  for(const id of [randomUUID(),f.identities['patient-b'].profileId,f.identities['patient-a'].userId,'bad','%','%ZZ','%FF','%E0%A4%A','%61'+f.patientId.slice(1),f.patientId+'%2Fextra'])for(const method of ['POST','GET','HEAD']){
    const r=await f.request(f.path(id),{session,method,...(method==='POST'?{body:bpInput}:{})});assert.equal(r.status,404);noStore(r);if(method!=='HEAD')assert.deepEqual(r.json,denied);else assert.equal(r.text,'');
  }
  for(const variant of [f.path(f.patientId.toUpperCase()),f.path(f.patientId)+'/',f.path(f.patientId).replace('/patients/','/PATIENTS/').replace('blood-pressure-measurements','BLOOD-PRESSURE-MEASUREMENTS')])assert.equal((await f.request(variant,{session})).status,200);
  for(const id of [f.patientId,randomUUID()])for(const method of ['PUT','PATCH','DELETE','OPTIONS']){const r=await f.request(f.path(id),{method});assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, HEAD, POST');noStore(r);assert.equal(r.headers['access-control-allow-origin'],undefined);}
  const spoof={'X-User-Id':f.identities['patient-b'].userId,'X-Actor-Id':f.actor.userId,'X-Role':'CLINICIAN','X-Source-Kind':'CLINICIAN_ENTRY'};
  const own=await f.request(f.path(f.patientId),{method:'POST',session,body:bpInput,headers:spoof});assert.equal(own.status,201);assert.equal(own.json.data.sourceKind,'PATIENT_SELF_ENTRY');
  const cross=await f.request(f.path(f.identities['patient-b'].profileId),{method:'POST',session,body:bpInput,headers:spoof});assert.equal(cross.status,404);
}));
for(const mode of ['revoked','expired','disabled'])test(`BP HTTP ${mode} session fails uniformly without mutation`,()=>withHttp(async f=>{
  const user=f.identities['patient-a'].userId;
  if(mode==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[user]);
  if(mode==='expired')await f.pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",[user]);
  if(mode==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[user]);
  for(const method of ['POST','GET','HEAD']){const r=await f.request(f.path(f.patientId),{method,session:f.sessions['patient-a'],...(method==='POST'?{body:bpInput}:{})});assert.equal(r.status,401);assert.match(r.headers['set-cookie'][0],/Max-Age=0/);noStore(r);}
  assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));
test('BP HTTP service failures sanitize errors; scoped revalidation can clear revoked-session cookies',()=>withHttp(async f=>{
  for(const method of ['POST','GET']){const r=await f.request(f.path(f.patientId),{method,session:f.sessions['patient-a'],...(method==='POST'?{body:bpInput}:{})});assert.equal(r.status,503);assert.deepEqual(r.json,{error:{code:'BP_SERVICE_UNAVAILABLE',message:'Service unavailable.'}});noStore(r);}
},bp=>({...bp,createBloodPressureMeasurement:async()=>{throw new Error('secret-driver');},listBloodPressureMeasurements:async()=>{throw new Error('secret-driver');}})));
for(const mode of ['revoked-after-guard','role-after-guard'])test(`BP HTTP ${mode} is rechecked by persistence`,()=>withHttp(async f=>{
  const r=await f.request(f.path(f.patientId),{method:'POST',session:f.sessions['patient-a'],body:bpInput});assert.equal(r.status,mode==='role-after-guard'?404:401);noStore(r);
  if(mode==='revoked-after-guard')assert.match(r.headers['set-cookie'][0],/Max-Age=0/);
  assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
},(bp,f)=>({...bp,createBloodPressureMeasurement:async(principal,input)=>{
  if(mode==='revoked-after-guard')await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[principal.sessionId]);
  return bp.createBloodPressureMeasurement(mode==='role-after-guard'?{...principal,role:'CLINICIAN'}:principal,input);
}})));
test('BP HTTP absent sessions and missing profiles fail closed',()=>withHttp(async f=>{
  for(const method of ['POST','GET','HEAD'])for(const id of [f.patientId,'bad','%ZZ']){
    const r=await f.request(f.path(id),{method,...(method==='POST'?{body:bpInput}:{})});assert.equal(r.status,401);noStore(r);
  }
  await f.pool.query('DELETE FROM patient_profiles WHERE id=$1',[f.identities['patient-b'].profileId]);
  await f.pool.query('DELETE FROM clinician_profiles WHERE id=$1',[f.identities['clinician-unassigned'].profileId]);
  for(const key of ['patient-b','clinician-unassigned'])for(const method of ['POST','GET','HEAD']){
    const r=await f.request(f.path(key==='patient-b'?f.identities['patient-b'].profileId:f.patientId),{method,session:f.sessions[key],...(method==='POST'?{body:bpInput}:{})});assert.equal(r.status,404);noStore(r);
  }
  assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));

test('BP HTTP never emits ETags or conditional 304 for POST/GET/HEAD',()=>withHttp(async f=>{
  const path=f.path(f.patientId),session=f.sessions['patient-a'];
  const post=await f.request(path,{method:'POST',session,body:bpInput});assert.equal(post.status,201);assert.equal(post.headers.etag,undefined);assert.equal(post.headers['last-modified'],undefined);
  const first=await f.request(path,{session});assert.equal(first.status,200);assert.equal(first.headers.etag,undefined);noStore(first);
  for(const method of ['GET','HEAD'])for(const headers of [{'If-None-Match':'*'},{'If-None-Match':'W/"cached"'},{'If-Modified-Since':'Thu, 31 Dec 9999 23:59:59 GMT'},{'If-None-Match':'*','Cache-Control':'max-age=0'}]){
    const r=await f.request(path,{method,session,headers});assert.equal(r.status,200);noStore(r);assert.equal(r.headers.etag,undefined);assert.equal(r.headers['last-modified'],undefined);if(method==='HEAD')assert.equal(r.text,'');else assert.deepEqual(r.json,first.json);
  }
}));
