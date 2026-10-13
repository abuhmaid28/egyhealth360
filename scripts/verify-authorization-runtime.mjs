import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPersistence } from '../packages/db/dist/index.js';
import { hashPassword } from '../apps/api/dist/password.js';

// Runtime fixtures only; no demo credentials, cookies or profile content printed.
const password=randomBytes(32).toString('base64url');
const passwordHash=await hashPassword(Buffer.from(password));
const store=createPersistence(process.env.DATABASE_URL);
try {
  const identities=[];
  for(const role of ['PATIENT','PATIENT','CLINICIAN','ADMIN']) identities.push(await store.createUser({role,email:`${randomUUID()}@example.invalid`,passwordHash,...(role==='ADMIN'?{}:{profile:{displayName:'Synthetic runtime authorization'}})}));
  const base=`http://localhost:${process.env.API_PORT??3001}/api/v1`;
  const cookies=[];
  for(const identity of identities) {
    const response=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:process.env.AUTH_BROWSER_ORIGIN,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:identity.email,password})});
    assert.equal(response.status,200); cookies.push(response.headers.get('set-cookie').split(';')[0]);
  }
  const read=async(index,id,method='GET')=>fetch(`${base}/patients/${id}/profile`,{method,headers:{Cookie:cookies[index]}});
  assert.equal((await read(0,identities[0].profileId)).status,200);
  for(const index of [0,2,3]) {const response=await read(index,identities[1].profileId);assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:{code:'PATIENT_NOT_FOUND',message:'Not found.'}});assert.equal(response.headers.get('cache-control'),'no-store');}
  const assignment=await store.assignPatient({clinicianId:identities[2].profileId,patientId:identities[0].profileId});
  assert.equal((await read(2,identities[0].profileId)).status,200);
  assert.equal((await read(2,identities[0].profileId,'HEAD')).status,200);
  await store.endAssignment(assignment.id);
  assert.equal((await read(2,identities[0].profileId)).status,404);
  console.log('Running API ownership/assignment/admin/HEAD/no-store/ended denial verified');
} finally {await store.close();}
