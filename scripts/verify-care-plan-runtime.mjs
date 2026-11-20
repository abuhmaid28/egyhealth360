import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createDemoPersistence,createAuthPersistence,createCarePlanPersistence } from '../packages/db/dist/index.js';
import { demoConfiguration,passwordCheck,verificationConfiguration } from './lib/m1-demo.mjs';
import { sessionHash } from '../apps/api/dist/auth.js';

// Explicit disposable synthetic runtime proof, never startup or an HTTP plan endpoint.
const config=demoConfiguration(process.env),http=verificationConfiguration(process.env);
const demo=createDemoPersistence(config.databaseUrl),auth=createAuthPersistence(config.databaseUrl),plans=createCarePlanPersistence(config.databaseUrl);
let cookie,csrf,plan,actor,patientId;
try {
  const state=await demo.inspectIdentities({acceptsExistingHash:passwordCheck(config.password)});
  const clinician=state.identities.find(i=>i.key==='clinician-assigned');patientId=state.identities.find(i=>i.key==='patient-a').profileId;
  const login=await fetch(`${http.base}/api/v1/auth/login`,{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:clinician.email,password:config.password.toString('utf8')})});
  assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';',1)[0];csrf=(await login.json()).data.csrfToken;
  actor=await auth.resolve(sessionHash(Buffer.from(cookie.split('=')[1],'base64url')));assert.ok(actor);
  plan=await plans.createDraftPlan(actor,{patientId});const target={patientId,planId:plan.id};
  const spec=await plans.inspectDeferredActionSpecification(actor,target);assert.equal(spec.persistence,'DEFERRED');assert.equal(spec.planStatus,'DRAFT');
  assert.deepEqual(await plans.inspectDeferredActionSpecification(actor,target),spec);
  assert.equal((await plans.activatePlan(actor,target)).changed,true);
  assert.equal((await plans.activatePlan(actor,target)).changed,false);
  assert.equal((await plans.cancelPlan(actor,target)).changed,true);
  assert.equal((await plans.cancelPlan(actor,target)).changed,false);
  assert.equal((await plans.inspectDeferredActionSpecification(actor,target)).planStatus,'CANCELLED');
  console.log('EH-010 synthetic service lifecycle/pins/deferred specification runtime PASS; no plan HTTP route');
} catch {console.error('CARE_PLAN_RUNTIME_FAILED');process.exitCode=1;}
finally {
  if(actor&&plan)try{await plans.cancelPlan(actor,{patientId,planId:plan.id});}catch{process.exitCode=1;}
  if(cookie)try{const response=await fetch(`${http.base}/api/v1/auth/logout`,{method:'POST',headers:{Origin:http.origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:'{}'});assert.equal(response.status,204);}catch{console.error('CARE_PLAN_RUNTIME_LOGOUT_FAILED');process.exitCode=1;}
  config.password.fill(0);await plans.close();await auth.close();await demo.close();
}
