import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes,randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { isolatedFollowup,appointmentInput,encounterInput,followupSnapshot } from '../support/followup.mjs';
import { createApp } from '../../apps/api/dist/app.js';
import { createAuthPersistence,createDatabase } from '../../packages/db/dist/index.js';
import { hashPassword,createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';
const denied={error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}};
async function withHttp(run,wrap=f=>f){return isolatedFollowup(async f=>{
  const password=randomBytes(32).toString('base64url');
  await f.pool.query('UPDATE users SET password_hash=$1',[await hashPassword(Buffer.from(password))]);
  const auth=createAuthPersistence(f.url),db=createDatabase(f.url),config=authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'});
  const app=await createApp(db,{store:auth,passwords:await createPasswordVerifier(),config},undefined,f.bp,{appointments:wrap(f).appointments,encounters:wrap(f).encounters});
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
    const path=id=>`/api/v1/patients/${id}`;
    await run({...f,request,path,sessions,config,auth});
  }finally{await app.close();await auth.close();await db.close();}
});}
const noStore=r=>{assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers.etag,undefined);assert.equal(r.headers['last-modified'],undefined);};
const appointmentPath=f=>f.path(f.patientId)+'/follow-up-appointments';
const encounterPath=f=>f.path(f.patientId)+'/clinical-encounters';
async function resources(f){const a=await f.appointment(),e=await f.encounter(),b=await f.write(f.principals['patient-a']);return {a,e,b,cancel:appointmentPath(f)+`/${a.id}/cancel`,link:encounterPath(f)+`/${e.id}/blood-pressure-measurements/${b.id}`,associations:encounterPath(f)+`/${e.id}/blood-pressure-associations`};}
function keys(row,expected){assert.deepEqual(Object.keys(row).sort(),expected.sort());}
test('EH-012 genuine HTTP matrix, minimized projections, provenance, lifecycle and association no-op',()=>withHttp(async f=>{
  const r=await resources(f),assigned=f.sessions['clinician-assigned'];
  for(const [key,session] of Object.entries(f.sessions))for(const method of ['GET','HEAD'])for(const path of [appointmentPath(f),encounterPath(f),r.associations]){
    const response=await f.request(path,{session,method});assert.equal(response.status,['patient-a','clinician-assigned'].includes(key)?200:404);noStore(response);if(method==='HEAD')assert.equal(response.text,'');else if(response.status===404)assert.deepEqual(response.json,denied);
  }
  for(const [key,session] of Object.entries(f.sessions))for(const [path,body] of [[appointmentPath(f),appointmentInput],[encounterPath(f),encounterInput],[r.cancel,{}],[r.link,{}]]){
    const before=await followupSnapshot(f.pool),res=await f.request(path,{session,method:'POST',body});noStore(res);
    assert.equal(res.status,key==='clinician-assigned'?(path===r.cancel?200:201):404);
    if(key!=='clinician-assigned'){assert.deepEqual(res.json,denied);assert.deepEqual(await followupSnapshot(f.pool),before);}
  }
  const retry=await f.request(r.link,{session:assigned,method:'POST',body:{}});assert.equal(retry.status,200);keys(retry.json.data,['id','patientId','encounterId','bloodPressureMeasurementId','createdAt']);
  const before=await followupSnapshot(f.pool);assert.deepEqual((await f.request(r.link,{session:assigned,method:'POST',body:{}})).json,retry.json);assert.equal((await f.request(r.cancel,{session:assigned,method:'POST',body:{}})).status,200);assert.deepEqual(await followupSnapshot(f.pool),before);
  const appointments=await f.request(appointmentPath(f),{session:f.sessions['patient-a']});appointments.json.data.forEach(x=>keys(x,['id','patientId','scheduledAt','purpose','status','createdAt','cancelledAt']));
  const encounters=await f.request(encounterPath(f),{session:f.sessions['patient-a']});encounters.json.data.forEach(x=>keys(x,['id','patientId','occurredAt','purpose','createdAt']));
  assert.equal((await f.pool.query('SELECT source_kind FROM blood_pressure_measurements WHERE id=$1',[r.b.id])).rows[0].source_kind,'PATIENT_SELF_ENTRY');
}));
test('EH-012 HTTP malformed bodies and strict field errors never echo authority/payload',()=>withHttp(async f=>{
  const session=f.sessions['clinician-assigned'],r=await resources(f),before=await followupSnapshot(f.pool);
  for(const [path,input] of [[appointmentPath(f),appointmentInput],[encounterPath(f),encounterInput]]){
    const raw=JSON.stringify(input);
    for(const body of ['', '{bad','null','[]','1','true','{}',JSON.stringify({...input,actorId:'secret-payload'}),JSON.stringify({...input,status:'CANCELLED'}),raw.replace('"purpose":','"purp\\u006fse":"HTN_BP_FOLLOWUP","purpose":')]){
      const res=await f.request(path,{session,method:'POST',body});assert.equal(res.status,400);assert.equal(res.json.error.code,'REQUEST_INVALID');noStore(res);assert.ok(!res.text.includes('secret-payload'));
    }
    for(const purpose of ['OTHER',null,1]){const res=await f.request(path,{session,method:'POST',body:{...input,purpose}});assert.equal(res.status,400);assert.ok(['FOLLOW_UP_APPOINTMENT_INVALID','CLINICAL_ENCOUNTER_INVALID'].includes(res.json.error.code));assert.deepEqual(res.json.error.fields.map(x=>x.field),['purpose']);}
  }
  for(const path of [r.cancel,r.link])for(const body of ['','null','[]','{"status":"CANCELLED"}'])assert.equal((await f.request(path,{session,method:'POST',body})).json.error.code,'REQUEST_INVALID');
  assert.deepEqual(await followupSnapshot(f.pool),before);
  assert.equal((await f.request(appointmentPath(f),{session,method:'POST',body:{...appointmentInput,scheduledAt:'2024-01-01T00:00:00Z'}})).json.error.code,'FOLLOW_UP_APPOINTMENT_INVALID');
  assert.equal((await f.request(encounterPath(f),{session,method:'POST',body:{...encounterInput,occurredAt:'9999-01-01T00:00:00Z'}})).json.error.code,'CLINICAL_ENCOUNTER_INVALID');
}));
test('EH-012 HTTP security/media/query/size controls cover every write',()=>withHttp(async f=>{
  const session=f.sessions['clinician-assigned'],r=await resources(f),before=await followupSnapshot(f.pool);
  for(const [path,body] of [[appointmentPath(f),appointmentInput],[encounterPath(f),encounterInput],[r.cancel,{}],[r.link,{}]]){
    for(const headers of [{Origin:undefined},{Origin:'null'},{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':'unknown'},{'X-CSRF-Token':undefined},{'X-CSRF-Token':'wrong'}]){const res=await f.request(path,{session,method:'POST',body,headers});assert.equal(res.status,403);noStore(res);}
    for(const headers of [{'Content-Type':undefined},{'Content-Type':'text/plain'},{'Content-Type':'application/json; charset=latin1'},{'Content-Encoding':'gzip'}]){const res=await f.request(path,{session,method:'POST',body,headers});assert.equal(res.status,415);noStore(res);}
    assert.equal((await f.request(path,{session,method:'POST',body,pairs:[['Content-Type','application/json']]})).status,415);
    assert.equal((await f.request(path,{session,method:'POST',body,headers:{'Idempotency-Key':'retry'}})).status,400);
    for(const q of ['?','?page=1'])assert.equal((await f.request(path+q,{session,method:'POST',body})).status,400);
    const large=await f.request(path,{session,method:'POST',body:JSON.stringify({...body,payload:'x'.repeat(17000)})});assert.equal(large.status,413);noStore(large);
  }
  assert.deepEqual(await followupSnapshot(f.pool),before);
}));
test('EH-012 HTTP pagination/order/duplicates, exact collection routes and conditional HEAD behavior',()=>withHttp(async f=>{
  const session=f.sessions['clinician-assigned'],r=await resources(f);
  for(const [path,input,time] of [[appointmentPath(f),appointmentInput,'scheduledAt'],[encounterPath(f),encounterInput,'occurredAt']]){
    const created=[];for(let i=0;i<3;i++){const x=await f.request(path,{session,method:'POST',body:input});assert.equal(x.status,201);created.push(x.json.data);}assert.equal(new Set(created.map(x=>x.id)).size,3);
    const res=await f.request(path+'?pageSize=2',{session});assert.equal(res.status,200);assert.equal(res.json.meta.total,4);assert.equal(res.json.data.length,2);
    const sorted=[...created,...(await f.request(path,{session})).json.data.filter(x=>!created.some(c=>c.id===x.id))].sort((a,b)=>b[time].localeCompare(a[time])||b.id.localeCompare(a.id));assert.deepEqual(res.json.data,sorted.slice(0,2));
    for(const q of ['','page=0','page=01','page=1e2','pageSize=101','pageSize=','page=1&page=2','actor=x','%70age=1','page=%31'])for(const method of ['GET','HEAD']){const bad=await f.request(path+'?'+q,{session,method});assert.equal(bad.status,400);noStore(bad);if(method==='HEAD')assert.equal(bad.text,'');}
  }
  for(const path of [appointmentPath(f),encounterPath(f),r.associations])for(const method of ['GET','HEAD']){
    const res=await f.request(path,{session,method,headers:{'If-None-Match':'*','If-Modified-Since':'Thu, 31 Dec 9999 23:59:59 GMT'}});assert.equal(res.status,200);noStore(res);if(method==='HEAD')assert.equal(res.text,'');
    assert.equal((await f.request(path,{session,method,body:'{}'})).status,400);
  }
  assert.equal((await f.request(encounterPath(f)+`/${r.e.id}/blood-pressure-measurements`,{session})).status,404);
}));
test('EH-012 HTTP methods, case/slash variants, IDOR and encoded nested targets are generic',()=>withHttp(async f=>{
  const session=f.sessions['clinician-assigned'],r=await resources(f);
  for(const [path,allow] of [[appointmentPath(f),'GET, HEAD, POST'],[encounterPath(f),'GET, HEAD, POST'],[r.associations,'GET, HEAD'],[r.cancel,'POST'],[r.link,'POST']])for(const method of ['PUT','PATCH','DELETE','OPTIONS',...(allow==='POST'?['GET','HEAD']:[])]){
    const res=await f.request(path,{method});assert.equal(res.status,405);assert.equal(res.headers.allow,allow);noStore(res);assert.equal(res.headers['access-control-allow-origin'],undefined);if(method==='HEAD')assert.equal(res.text,'');
  }
  for(const variant of [appointmentPath(f).replace('/patients/','/PATIENTS/').replace('follow-up-appointments','FOLLOW-UP-APPOINTMENTS'),appointmentPath(f)+'/',encounterPath(f)+'/',r.associations+'/'])assert.equal((await f.request(variant,{session})).status,200);
  for(const bad of ['bad','%','%ZZ','%FF',f.patientId+'%2Fextra',randomUUID(),f.identities['patient-a'].userId])for(const [path,method,body] of [[appointmentPath(f).replace(f.patientId,bad),'GET'],[r.cancel.replace(r.a.id,bad),'POST',{}],[r.link.replace(r.e.id,bad),'POST',{}],[r.link.replace(r.b.id,bad),'POST',{}],[r.associations.replace(r.e.id,bad),'HEAD']]){
    const res=await f.request(path,{session,method,body});assert.equal(res.status,404,path);noStore(res);if(method!=='HEAD')assert.deepEqual(res.json,denied);else assert.equal(res.text,'');
  }
  for(const path of [r.cancel,r.link]){const res=await f.request(path.replace(f.patientId,f.identities['patient-b'].profileId),{session,method:'POST',body:{}});assert.deepEqual(res.json,denied);}
}));
test('EH-012 association conflict follows scope authorization and never leaks another patient',()=>withHttp(async f=>{
  const r=await resources(f),e2=await f.encounter(),session=f.sessions['clinician-assigned'];await f.request(r.link,{session,method:'POST',body:{}});
  const conflictPath=r.link.replace(r.e.id,e2.id);const conflict=await f.request(conflictPath,{session,method:'POST',body:{}});assert.equal(conflict.status,409);assert.equal(conflict.json.error.code,'ENCOUNTER_BP_CONFLICT');
  for(const key of ['patient-a','patient-b','clinician-unassigned','admin'])assert.deepEqual((await f.request(conflictPath,{session:f.sessions[key],method:'POST',body:{}})).json,denied);
  const b=await f.write(f.principals['patient-b'],{patientId:f.identities['patient-b'].profileId});const wrong=await f.request(r.link.replace(r.b.id,b.id),{session,method:'POST',body:{}});assert.deepEqual(wrong.json,denied);
}));
for(const mode of ['revoked','expired','disabled'])test(`EH-012 HTTP ${mode} has uniform 401 and empty HEAD`,()=>withHttp(async f=>{
  const r=await resources(f),session=f.sessions['clinician-assigned'],user=f.actor.userId;
  if(mode==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[user]);
  if(mode==='expired')await f.pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",[user]);
  if(mode==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[user]);
  const before=await followupSnapshot(f.pool);
  for(const path of [appointmentPath(f),encounterPath(f),r.associations])for(const method of ['GET','HEAD']){const res=await f.request(path,{session,method});assert.equal(res.status,401);noStore(res);assert.match(res.headers['set-cookie'][0],/Max-Age=0/);if(method==='HEAD')assert.equal(res.text,'');}
  for(const [path,body] of [[appointmentPath(f),appointmentInput],[encounterPath(f),encounterInput],[r.cancel,{}],[r.link,{}]])assert.equal((await f.request(path,{session,method:'POST',body})).status,401);
  assert.deepEqual(await followupSnapshot(f.pool),before);
}));
test('EH-012 missing sessions and spoof headers cannot authorize',()=>withHttp(async f=>{
  const r=await resources(f);for(const path of [appointmentPath(f),encounterPath(f),r.associations])for(const method of ['GET','HEAD'])assert.equal((await f.request(path,{method})).status,401);
  const headers={'X-User-Id':f.actor.userId,'X-Role':'CLINICIAN','X-Actor-Id':f.actor.userId};const res=await f.request(appointmentPath(f),{session:f.sessions['patient-a'],method:'POST',body:appointmentInput,headers});assert.deepEqual(res.json,denied);
}));
test('EH-012 persistence failure responses are sanitized for each resource',()=>withHttp(async f=>{
  for(const [path,body,code] of [[appointmentPath(f),appointmentInput,'FOLLOW_UP_SERVICE_UNAVAILABLE'],[encounterPath(f),encounterInput,'CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE']]){const res=await f.request(path,{session:f.sessions['clinician-assigned'],method:'POST',body});assert.equal(res.status,503);assert.equal(res.json.error.code,code);assert.ok(!res.text.includes('secret'));noStore(res);}
},f=>({...f,appointments:{...f.appointments,createFollowUpAppointment:async()=>{throw new Error('secret-driver');}},encounters:{...f.encounters,createClinicalEncounter:async()=>{throw new Error('secret-driver');}}})));
test('EH-012 persistence rechecks revocation after the HTTP guard and clears cookie',()=>withHttp(async f=>{
  const r=await f.request(appointmentPath(f),{session:f.sessions['clinician-assigned'],method:'POST',body:appointmentInput});assert.equal(r.status,401);assert.match(r.headers['set-cookie'][0],/Max-Age=0/);noStore(r);assert.equal((await f.pool.query('SELECT count(*)::int n FROM follow_up_appointments')).rows[0].n,0);
},f=>({...f,appointments:{...f.appointments,createFollowUpAppointment:async(principal,input)=>{await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[principal.sessionId]);return f.appointments.createFollowUpAppointment(principal,input);}}})));
