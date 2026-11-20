import {Buffer} from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPrescriptions,prescriptionBody} from '../support/prescriptions.mjs';
test('I3S1 strict HTTP JSON, input, CSRF/Origin/FetchMetadata, no-store HEAD, role and IDOR boundaries',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),path='/consultations/'+c.id+'/prescriptions',headers={...await f.rxLogin('clinician'),Origin:f.config.origin,'Content-Type':'application/json'},body=JSON.stringify(prescriptionBody());
 for(const raw of ['{','null','[]','{}',body.replace('"quantity":"10.125"','"quantity":"10.125","\\u0071uantity":"1"'),body.replace('tablets','bad\\ud800'),body.replace('tablets','bad\\tcontrol')])assert.equal((await f.rxRequest(path,{method:'POST',headers,body:raw})).response.status,400,raw);
 for(const key of ['actor','patientId','clinicianId','assignmentId','membershipId','signedAt','createdAt','state','refills'])assert.equal((await f.write(path,{...prescriptionBody(),[key]:'CANARY'})).response.status,400);
 for(const mod of [{'Content-Type':'text/plain'},{'Content-Encoding':'gzip'}])assert.equal((await f.rxRequest(path,{method:'POST',headers:{...headers,...mod},body})).response.status,415);
 for(const mod of [{Origin:'http://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'X-CSRF-Token':'bad'}])assert.equal((await f.rxRequest(path,{method:'POST',headers:{...headers,...mod},body})).response.status,403);
 assert.equal((await f.rxRequest(path,{method:'POST',headers,body:Buffer.from([0xff])})).response.status,400);assert.equal((await f.rxRequest(path,{method:'POST',headers,body:' '.repeat(16385)})).response.status,413);
 assert.equal((await f.rxRequest(path,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body})).response.status,400);
 for(const alias of [path+'/',path.replace('/prescriptions','/Prescriptions'),path.replace('/prescriptions','/%70rescriptions')])assert.equal((await f.rxRequest(alias,{method:'POST',headers,body})).response.status,404);
 for(const method of ['PUT','PATCH','DELETE'])assert.equal((await f.rxRequest(path,{method,headers})).response.status,405);
 for(const query of ['?page=0','?page=01','?pageSize=101','?page=1&page=2','?includeDraft=true','?search=x','?'])assert.equal((await f.read('/me/prescriptions'+query)).response.status,400);
 assert.equal((await f.rxRequest(path,{method:'POST',headers:{Origin:f.config.origin,'Content-Type':'application/json'},body})).response.status,401);
 const d=await f.write(path,prescriptionBody());assert.equal(d.response.status,201,d.raw);const id=d.json.data.id,root=path+'/'+id;
 for(const who of ['patient','other','admin','lab','pharmacy']){assert.equal((await f.read(root,who)).response.status,404);assert.equal((await f.write(root+'/sign',{expectedVersion:1,operationKey:randomUUID()},who)).response.status,404);}
 assert.equal((await f.write(root+'/sign',{expectedVersion:1,operationKey:randomUUID()})).response.status,200);
 for(const [target,who] of [[root,'clinician'],['/me/prescriptions/'+id,'patient']])for(const method of ['GET','HEAD']){const r=await f.read(target,who,method);assert.equal(r.response.status,200,r.raw);if(method==='HEAD')assert.equal(r.raw,'');assert.equal(r.response.headers.get('cache-control'),'no-store');assert.equal(r.response.headers.get('etag'),null);assert.equal(r.response.headers.get('last-modified'),null);}
 const r=await f.read('/me/prescriptions/'+id);assert.equal(r.json.data.version,undefined);for(const secret of [f.hash,f.password,f.users.clinician.email,f.membership.id,f.publication.id])assert.ok(!r.raw.includes(secret));
 assert.equal((await f.read(path.replace(c.id,randomUUID()),'clinician')).response.status,404);assert.equal((await f.read('/me/prescriptions/'+id,'other')).response.status,404);
 const restriction={operationKey:randomUUID(),reason:'Wrong patient'};assert.deepEqual((await f.write(root+'/privacy-restrictions',restriction)).json,{data:{restricted:true}});
 const restricted=await f.read('/me/prescriptions/'+id),absent=await f.read('/me/prescriptions/'+randomUUID());assert.equal(restricted.response.status,404);assert.deepEqual(restricted.json,absent.json);assert.ok(!restricted.raw.includes(id));
}));
