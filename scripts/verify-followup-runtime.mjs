import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { createDemoPersistence,createAuthPersistence,createBloodPressureMeasurementPersistence,createFollowUpAppointmentPersistence,createClinicalEncounterPersistence } from '../packages/db/dist/index.js';
import { demoConfiguration,passwordCheck,verificationConfiguration } from './lib/m1-demo.mjs';
import { sessionHash } from '../apps/api/dist/auth.js';
const require=createRequire(new URL('../packages/db/package.json',import.meta.url));const {Pool}=require('pg');
// Explicit disposable synthetic workflow only. Never called by application startup.
const config=demoConfiguration(process.env),http=verificationConfiguration(process.env);
const demo=createDemoPersistence(config.databaseUrl),auth=createAuthPersistence(config.databaseUrl),bp=createBloodPressureMeasurementPersistence(config.databaseUrl),appointments=createFollowUpAppointmentPersistence(config.databaseUrl),encounters=createClinicalEncounterPersistence(config.databaseUrl),pool=new Pool({connectionString:config.databaseUrl});
const sessions={};
try{
  const state=await demo.inspectIdentities({acceptsExistingHash:passwordCheck(config.password)}),ids=Object.fromEntries(state.identities.map(i=>[i.key,i]));
  const request=async(path,{method='GET',body,session}={})=>{
    const res=await fetch(http.base+'/api/v1'+path,{method,redirect:'error',signal:globalThis.AbortSignal.timeout(10000),headers:{...(method==='POST'?{Origin:http.origin,'Content-Type':'application/json'}:{}),...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('etag'),null);assert.equal(res.headers.get('last-modified'),null);
    return {status:res.status,json:method==='HEAD'?undefined:await res.json(),text:method==='HEAD'?await res.text():undefined};
  };
  for(const i of state.identities){
    const res=await fetch(http.base+'/api/v1/auth/login',{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:i.email,password:config.password.toString('utf8')})});assert.equal(res.status,200);const json=await res.json();
    sessions[i.key]={cookie:res.headers.get('set-cookie').split(';')[0],csrf:json.data.csrfToken};
  }
  const principal=await auth.resolve(sessionHash(Buffer.from(sessions['clinician-assigned'].cookie.split('=')[1],'base64url')));assert.ok(principal);
  const patientId=ids['patient-a'].profileId,root=`/patients/${patientId}`,assigned=sessions['clinician-assigned'];
  const appointmentBody={scheduledAt:new Date(Date.now()+86400000).toISOString(),purpose:'HTN_BP_FOLLOWUP'},encounterBody={occurredAt:'2024-02-29T00:00:00.000Z',purpose:'HTN_BP_FOLLOWUP'};
  const a=await request(root+'/follow-up-appointments',{method:'POST',body:appointmentBody,session:assigned});assert.equal(a.status,201);
  const e=await request(root+'/clinical-encounters',{method:'POST',body:encounterBody,session:assigned});assert.equal(e.status,201);
  const measurements=[];
  for(const key of ['patient-a','clinician-assigned']){
    const r=await request(root+'/blood-pressure-measurements',{method:'POST',body:{systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-29T00:00:00.000Z'},session:sessions[key]});assert.equal(r.status,201);measurements.push(r.json.data);
  }
  const bpBefore=(await bp.listBloodPressureMeasurements(principal,{patientId,page:1,pageSize:100})).measurements.filter(r=>measurements.some(m=>m.id===r.id));assert.equal(bpBefore.length,2);
  const links=[];
  for(const b of measurements){const r=await request(root+`/clinical-encounters/${e.json.data.id}/blood-pressure-measurements/${b.id}`,{method:'POST',body:{},session:assigned});assert.equal(r.status,201);links.push(r.json.data);}
  const cancel=root+`/follow-up-appointments/${a.json.data.id}/cancel`,link=root+`/clinical-encounters/${e.json.data.id}/blood-pressure-measurements/${measurements[0].id}`,history=root+`/clinical-encounters/${e.json.data.id}/blood-pressure-associations`;
  for(const [key,session] of Object.entries(sessions)){
    const allowed=['patient-a','clinician-assigned'].includes(key);
    for(const path of [root+'/follow-up-appointments',root+'/clinical-encounters',history])for(const method of ['GET','HEAD']){
      const r=await request(path,{session,method});assert.equal(r.status,allowed?200:404);if(method==='HEAD')assert.equal(r.text,'');else if(!allowed)assert.deepEqual(r.json,{error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}});
    }
    if(key!=='clinician-assigned')for(const [path,body] of [[root+'/follow-up-appointments',appointmentBody],[root+'/clinical-encounters',encounterBody],[cancel,{}],[link,{}]])assert.equal((await request(path,{method:'POST',session,body})).status,404);
    if(key==='clinician-assigned')for(const path of [root+'/follow-up-appointments',root+'/clinical-encounters'])assert.equal((await request(path.replace(patientId,ids['patient-b'].profileId),{session})).status,404);
  }
  const cancelled=await request(cancel,{method:'POST',body:{},session:assigned});assert.equal(cancelled.status,200);assert.equal(cancelled.json.data.status,'CANCELLED');
  const entityIds=[a.json.data.id,e.json.data.id,...links.map(x=>x.id)];const events=async()=>(await pool.query('SELECT * FROM public.audit_logs WHERE entity_id=ANY($1::uuid[]) ORDER BY id',[entityIds])).rows;
  const before=await events();assert.equal(before.length,5);assert.ok(before.every(r=>r.actor_user_id===ids['clinician-assigned'].userId&&JSON.stringify(r.safe_metadata)==='{}'));
  assert.deepEqual((await request(cancel,{method:'POST',body:{},session:assigned})).json,cancelled.json);
  const repeat=await request(link,{method:'POST',body:{},session:assigned});assert.equal(repeat.status,200);assert.deepEqual(repeat.json.data,links[0]);assert.deepEqual(await events(),before);
  const associations=await request(history,{session:sessions['patient-a']});assert.equal(associations.json.meta.total,2);for(const row of associations.json.data)assert.deepEqual(Object.keys(row).sort(),['id','patientId','encounterId','bloodPressureMeasurementId','createdAt'].sort());
  assert.deepEqual((await bp.listBloodPressureMeasurements(principal,{patientId,page:1,pageSize:100})).measurements.filter(r=>measurements.some(m=>m.id===r.id)),bpBefore);
  const ap=(await appointments.listFollowUpAppointments(principal,{patientId,page:1,pageSize:100})).data.find(r=>r.id===a.json.data.id);assert.equal(ap.createdByUserId,ids['clinician-assigned'].userId);assert.equal(ap.cancelledByUserId,ids['clinician-assigned'].userId);
  const en=(await encounters.listClinicalEncounters(principal,{patientId,page:1,pageSize:100})).data.find(r=>r.id===e.json.data.id);assert.equal(en.recordedByUserId,ids['clinician-assigned'].userId);
  console.log('EH-012 genuine HTTP appointments/encounters/associations/IDOR/provenance/audit/no-op runtime PASS');
}catch{console.error('FOLLOWUP_RUNTIME_FAILED');process.exitCode=1;}
finally{
  for(const session of Object.values(sessions))try{const r=await fetch(http.base+'/api/v1/auth/logout',{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json',Cookie:session.cookie,'X-CSRF-Token':session.csrf},body:'{}'});assert.equal(r.status,204);}catch{console.error('FOLLOWUP_RUNTIME_LOGOUT_FAILED');process.exitCode=1;}
  config.password.fill(0);await pool.end();await encounters.close();await appointments.close();await bp.close();await auth.close();await demo.close();
}
