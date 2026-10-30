import test from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {randomUUID} from 'node:crypto';
import {isolatedDocumentation,draftBody} from '../support/documentation.mjs';
test('I2S5 real HTTP private/draft secrecy, explicit release, HEAD parity/no-store and patient canaries',()=>isolatedDocumentation(async f=>{
 const c=await f.readyDocument(),path='/consultations/'+c.id+'/documents',privateBody=draftBody('PRIVATE_NOTE'),priv=await f.write(path,privateBody),draft=await f.write(path,draftBody());assert.equal(priv.response.status,200,priv.raw);assert.equal(draft.response.status,200,draft.raw);
 const doc=draft.json.data;for(const who of ['patient','other','admin','lab','pharmacy']){const r=await f.read(path,who);assert.equal(r.response.status,404);assert.ok(!r.raw.includes('PRIVATE_CANARY'));}
 assert.equal((await f.read('/me/summaries')).json.meta.total,0);assert.equal((await f.read('/me/summaries/'+doc.id)).response.status,404);
 const released=await f.write(path+'/'+doc.id+'/sign-release',{operationKey:randomUUID(),expectedVersion:1});assert.equal(released.response.status,200,released.raw);
 const conditional=await f.documentRequest('/me/summaries/'+doc.id,{headers:{...await f.login('patient'),'If-None-Match':'*','If-Modified-Since':'Wed, 21 Oct 2030 07:28:00 GMT'}});assert.equal(conditional.response.status,200);
 const shown=await f.read('/me/summaries/'+doc.id);assert.equal(shown.response.status,200,shown.raw);assert.equal(shown.json.data.versions.length,1);assert.equal(shown.json.data.versions[0].state,'SIGNED_RELEASED');
 const canaries=[privateBody.content,priv.json.data.id,...priv.json.data.versions.map(v=>v.id),doc.versions[0].id,privateBody.operationKey,f.users.patient.email,f.users.clinician.email,f.users.patient.id,f.users.patient.profileId,f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.publication.id,f.hash,f.password];
 for(const path2 of ['/me/summaries','/me/summaries/'+doc.id])for(const method of ['GET','HEAD']){const r=await f.read(path2,'patient',method);assert.equal(r.response.status,200);if(method==='HEAD')assert.equal(r.raw,'');for(const v of canaries)assert.ok(!r.raw.includes(v),v);assert.equal(r.response.headers.get('cache-control'),'no-store');for(const h of ['etag','last-modified'])assert.equal(r.response.headers.get(h),null);}
 const restricted=await f.write(path+'/'+doc.id+'/privacy-restrictions',{operationKey:randomUUID(),versionIds:[released.json.data.versions.at(-1).id],reason:'Human wrong patient'});assert.deepEqual(restricted.json,{data:{restricted:true}});
 for(const who of ['patient','other'])for(const method of ['GET','HEAD']){const r=await f.read('/me/summaries/'+doc.id,who,method);assert.equal(r.response.status,404);if(method==='HEAD')assert.equal(r.raw,'');for(const v of [...canaries,doc.id,released.json.data.versions.at(-1).id])assert.ok(!r.raw.includes(v));}assert.equal((await f.read('/me/summaries')).json.meta.total,0);
}));
test('I2S5 HTTP strict nested JSON/raw/media/framing/identity/method/query/alias/CSRF boundary',()=>isolatedDocumentation(async f=>{
 const c=await f.readyDocument(),path='/consultations/'+c.id+'/documents',headers={...await f.login('clinician'),Origin:f.config.origin,'Content-Type':'application/json'},body=JSON.stringify(draftBody());
 for(const raw of ['{','null','[]','{}',body.replace('"state":"UNKNOWN"','"state":"UNKNOWN","\\u0073tate":"NOT_REVIEWED"'),body.replace('Human complaint','bad\\ud800'),body.replace('Human complaint','bad\\tcontrol')])assert.equal((await f.documentRequest(path,{method:'POST',headers,body:raw})).response.status,400,raw);
 for(const key of ['authorUserId','patientId','clinicianId','assignmentId','membershipId','reviewedAt','signedAt','releasedAt','state'])assert.equal((await f.write(path,{...draftBody(),[key]:'CANARY'})).response.status,400);
 assert.equal((await f.documentRequest(path,{method:'POST',headers,body:Buffer.from([0xff])})).response.status,400);assert.equal((await f.documentRequest(path,{method:'POST',headers,body:' '.repeat(16385)})).response.status,413);
 for(const mod of [{'Content-Type':'text/plain'},{'Content-Encoding':'gzip'}])assert.equal((await f.documentRequest(path,{method:'POST',headers:{...headers,...mod},body})).response.status,415);
 for(const mod of [{Origin:'http://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'X-CSRF-Token':'bad'}])assert.equal((await f.documentRequest(path,{method:'POST',headers:{...headers,...mod},body})).response.status,403);
 assert.equal((await f.documentRequest(path,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body})).response.status,400);
 assert.equal((await f.documentRequest(path+'?x='+('x'.repeat(2100)),{method:'POST',headers,body})).response.status,400);assert.equal((await f.documentRequest(path,{method:'POST',headers:{...headers,'X-Synthetic-Bound':'x'.repeat(8300)},body})).response.status,400);
 assert.equal((await f.documentRequest(path+'?x=1',{method:'POST',headers,body})).response.status,400);
 assert.equal((await f.documentRequest(path,{method:'POST',headers:{Origin:f.config.origin,'Content-Type':'application/json'},body})).response.status,401);
 for(const alias of [path+'/',path.replace('/documents','/Documents'),path.replace('/documents','/%64ocuments')])assert.equal((await f.documentRequest(alias,{method:'POST',headers,body})).response.status,404);
 for(const method of ['PUT','PATCH','DELETE'])assert.equal((await f.documentRequest(path,{method,headers})).response.status,405);
 for(const query of ['?page=0','?page=01','?page=10001','?pageSize=101','?page=1&page=2','?includePrivate=true','?sort=id','?search=x'])assert.equal((await f.read('/me/summaries'+query)).response.status,400);
 const made=await f.write(path,draftBody());assert.equal(made.response.status,200,made.raw);const detail=path+'/'+made.json.data.id;
 assert.equal((await f.read(detail+'?page=1&pageSize=1','clinician')).response.status,200);assert.equal((await f.read(detail+'?includePrivate=1','clinician')).response.status,400);
 for(const method of ['GET','HEAD']){const r=await f.read(detail,'clinician',method);assert.equal(r.response.status,200);if(method==='HEAD')assert.equal(r.raw,'');}
 assert.equal((await f.documentRequest(detail+'/sign-release',{method:'HEAD',headers})).response.status,405);
 assert.equal((await f.read(path.replace(c.id,randomUUID()),'clinician')).response.status,404);
}));
test('I2S5 current related released HTTP route has no patient browse or private widening',()=>isolatedDocumentation(async f=>{
 const c=await f.readyDocument(),d=await f.draft(c),priv=await f.draft(c,draftBody('PRIVATE_NOTE'));await f.command(c,d,'RELEASE',{expectedVersion:1});const other=await f.otherClinician(),path='/patients/'+f.users.patient.profileId+'/summaries';
 assert.equal((await f.read(path,'otherClinician')).response.status,404);await f.identities.assignPatient({clinicianId:other.user.profileId,patientId:f.users.patient.profileId});const r=await f.read(path,'otherClinician');assert.equal(r.response.status,200,r.raw);assert.equal(r.json.meta.total,1);assert.ok(!r.raw.includes(priv.data.id));assert.equal((await f.read(path+'/'+priv.data.id,'otherClinician')).response.status,404);
 for(const who of ['patient','other','admin','lab','pharmacy'])assert.equal((await f.read(path,who)).response.status,404);
 await f.pool.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1",[other.user.profileId]);assert.equal((await f.read(path,'otherClinician')).response.status,404);
}));
