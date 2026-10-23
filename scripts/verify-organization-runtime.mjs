import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedOrganizations } from '../tests/support/organizations.mjs';
import { createApp } from '../apps/api/dist/app.js';
import { createDatabase,createAuthorizationPersistence } from '../packages/db/dist/index.js';
import { authConfiguration } from '../packages/config/dist/index.js';
import { createPasswordVerifier } from '../apps/api/dist/password.js';

// Explicit isolated synthetic verification only; never imported by product/startup/worker.
try {
 await isolatedOrganizations(async f=>{
  const db=createDatabase(f.url),authorization=createAuthorizationPersistence(f.url);
  const app=await createApp(db,{store:f.auth,passwords:await createPasswordVerifier(),config:authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'})},authorization);
  try{
   await app.listen(0,'127.0.0.1');const base=await app.getUrl();
   for(const key of ['lab','pharmacy']){
    const login=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:f.users[key].email,password:f.password})});
    assert.equal(login.status,200);const json=await login.json();assert.equal(json.data.user.role,f.users[key].role);const cookie=login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(`${base}/api/v1/patients/${f.users.patient.profileId}/profile`,{headers:{Cookie:cookie}})).status,404);
    assert.equal((await fetch(base+'/api/v1/auth/logout',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':json.data.csrfToken},body:'{}'})).status,204);
   }
   assert.equal((await f.store.readMemberOrganization(f.actors.lab,f.scope)).id,f.organization.id);
   await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.organization.id,status:'SUSPENDED',expectedVersion:0});
   await assert.rejects(f.store.readMemberOrganization(f.actors.lab,f.scope),e=>e.code==='ORGANIZATION_NOT_FOUND');
   await f.store.endMembership(f.actors.admin,f.scope);
   await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.organization.id,status:'ACTIVE',expectedVersion:1});
   await assert.rejects(f.store.readMemberOrganization(f.actors.lab,f.scope));
   const fresh=await f.grant(f.users.lab,f.organization,f.actors.admin,randomUUID());assert.notEqual(fresh.membership.id,f.membership.id);
   assert.equal((await f.store.readMemberOrganization(f.actors.lab,{...f.scope,membershipId:fresh.membership.id})).id,f.organization.id);
  }finally{await app.close();await db.close();await authorization.close();}
 });
 console.log(JSON.stringify({manifest:'eh-v3-i1-slice2-proof-v1',scope:'ORGANIZATION_MEMBERSHIP_ONLY',result:'PASS',cases:4}));
}catch{console.error('ORGANIZATION_RUNTIME_FAILED');process.exitCode=1;}
