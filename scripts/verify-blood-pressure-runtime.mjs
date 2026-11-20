import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createDemoPersistence,createAuthPersistence,createBloodPressureMeasurementPersistence } from '../packages/db/dist/index.js';
import { demoConfiguration,passwordCheck,verificationConfiguration } from './lib/m1-demo.mjs';
import { sessionHash } from '../apps/api/dist/auth.js';

// Explicit disposable demo workflow only, with genuine HTTP sessions and private credentials.
const config=demoConfiguration(process.env),http=verificationConfiguration(process.env);
const demo=createDemoPersistence(config.databaseUrl),auth=createAuthPersistence(config.databaseUrl),bp=createBloodPressureMeasurementPersistence(config.databaseUrl);
const sessions=[];
try{
  const state=await demo.inspectIdentities({acceptsExistingHash:passwordCheck(config.password)});
  const identities=Object.fromEntries(state.identities.map(i=>[i.key,i]));
  const request=async(path,{method='GET',body,session}={})=>fetch(http.base+'/api/v1'+path,{method,redirect:'error',signal:globalThis.AbortSignal.timeout(10000),headers:{...(method==='POST'?{Origin:http.origin,'Content-Type':'application/json'}:{}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  for(const identity of state.identities){
    const login=await fetch(http.base+'/api/v1/auth/login',{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:identity.email,password:config.password.toString('utf8')})});
    assert.equal(login.status,200);const data=await login.json();sessions.push({key:identity.key,cookie:login.headers.get('set-cookie').split(';')[0],csrf:data.data.csrfToken});
  }
  const input={systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-29T00:00:00.000Z'};
  for(const session of sessions)for(const target of ['patient-a','patient-b']){
    const patientId=identities[target].profileId,allowed=session.key===target||(session.key==='clinician-assigned'&&target==='patient-a');
    const path=`/patients/${patientId}/blood-pressure-measurements`;
    for(const method of ['POST','GET','HEAD']){
      const r=await request(path,{method,session,...(method==='POST'?{body:input}:{})});assert.equal(r.status,allowed?(method==='POST'?201:200):404);assert.equal(r.headers.get('cache-control'),'no-store');
      if(method==='HEAD'){assert.equal(await r.text(),'');continue;}
      const json=await r.json();
      if(!allowed){assert.deepEqual(json,{error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}});continue;}
      for(const row of method==='POST'?[json.data]:json.data)assert.deepEqual(Object.keys(row).sort(),['id','patientId','systolic','diastolic','unit','measuredAt','createdAt','sourceKind'].sort());
      if(method==='POST'){
        const principal=await auth.resolve(sessionHash(Buffer.from(session.cookie.split('=')[1],'base64url')));assert.ok(principal);
        const result=await bp.listBloodPressureMeasurements(principal,{patientId,page:1,pageSize:100});const row=result.measurements.find(row=>row.id===json.data.id);assert.ok(row);assert.equal(row.patientId,patientId);assert.equal(row.recordedByUserId,identities[session.key].userId);assert.equal(row.sourceKind,session.key.startsWith('patient-')?'PATIENT_SELF_ENTRY':'CLINICIAN_ENTRY');
      }
    }
  }
  console.log('EH-011 genuine BP HTTP submission/history/HEAD/IDOR/minimized projection/persisted provenance runtime PASS');
}catch{console.error('BP_RUNTIME_FAILED');process.exitCode=1;}
finally{
  for(const session of sessions)try{const r=await fetch(http.base+'/api/v1/auth/logout',{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json',Cookie:session.cookie,'X-CSRF-Token':session.csrf},body:'{}'});assert.equal(r.status,204);}catch{console.error('BP_RUNTIME_LOGOUT_FAILED');process.exitCode=1;}
  config.password.fill(0);await bp.close();await auth.close();await demo.close();
}
