import {Buffer} from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPharmacy,pharmacyCounts} from '../support/pharmacy.mjs';
test('I3S2 HTTP exact artifact journey and strict CSRF/JSON/IDOR/HEAD/pagination boundaries',()=>isolatedPharmacy(async f=>{
 const destinations=await f.read('/pharmacy-destinations','clinician');assert.equal(destinations.response.status,200,destinations.raw);assert.equal(destinations.json.meta.total,2);assert.equal((await f.read('/pharmacy-destinations','pharmacy')).response.status,404);
 const path=f.sourcePath+'/pharmacy-routes',input=f.routeInput(),{consultationId:ignored,prescriptionId:also,...body}=input;assert.ok(ignored&&also);
 const headers={...await f.rxLogin('clinician'),Origin:f.config.origin,'Content-Type':'application/json'},raw=JSON.stringify(body);
 for(const text of ['null','[]','{',raw.replace('"expectedVersion":2','"expectedVersion":1,"expectedVersion":2')])assert.equal((await f.rxRequest(path,{method:'POST',headers,body:text})).response.status,400);
 for(const mod of [{Origin:'http://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'X-CSRF-Token':'bad'}])assert.equal((await f.rxRequest(path,{method:'POST',headers:{...headers,...mod},body:raw})).response.status,403);
 for(const mod of [{'Content-Type':'text/plain'},{'Content-Encoding':'gzip'}])assert.equal((await f.rxRequest(path,{method:'POST',headers:{...headers,...mod},body:raw})).response.status,415);
 assert.equal((await f.rxRequest(path,{method:'POST',headers,body:Buffer.from([0xff])})).response.status,400);assert.equal((await f.rxRequest(path,{method:'POST',headers,body:' '.repeat(16385)})).response.status,413);
 for(const key of ['actor','patientId','membershipId','quantity','state','dispensedAt'])assert.equal((await f.write(path,{...body,[key]:'CANARY'})).response.status,400);
 const before=await pharmacyCounts(f),r=await f.write(path,body);assert.equal(r.response.status,201,r.raw);const id=r.json.data.id,detail=f.queuePath+'/'+id;assert.equal((await f.write(path,body)).response.status,200);assert.equal((await pharmacyCounts(f)).pharmacy_routes,before.pharmacy_routes+1);
 for(const who of ['admin','patient','clinician','lab','other'])assert.equal((await f.read(f.queuePath,who)).response.status,404);
 const q=await f.read(f.queuePath,'pharmacy');assert.equal(q.response.status,200,q.raw);assert.equal(q.json.meta.total,1);assert.equal(q.json.data[0].items[0].routingHistory,undefined);for(const canary of [f.users.patient.profileId,f.users.patient.id,f.c.id,f.c.encounterId,f.hash,f.password])assert.ok(!q.raw.includes(canary));
 for(const query of ['?patientId='+f.users.patient.profileId,'?search=x','?purpose=forensic','?page=0','?pageSize=101','?page=1&page=2'])assert.equal((await f.read(f.queuePath+query,'pharmacy')).response.status,400);
 const head=await f.read(detail,'pharmacy','HEAD');assert.equal(head.response.status,200);assert.equal(head.raw,'');assert.equal(head.response.headers.get('cache-control'),'no-store');assert.equal(head.response.headers.get('etag'),null);
 for(const alias of [detail+'/',detail.replace('/routes','/Routes'),detail.replace('/routes','/%72outes')])assert.equal((await f.read(alias,'pharmacy')).response.status,404);
 for(const method of ['PUT','PATCH','DELETE'])assert.equal((await f.rxRequest(detail,{method,headers})).response.status,405);
 assert.equal((await f.write(detail+'/accept',{expectedVersion:1,operationKey:randomUUID()},'admin')).response.status,404);
 const a=await f.write(detail+'/accept',{expectedVersion:1,operationKey:randomUUID()},'pharmacy');assert.equal(a.response.status,200,a.raw);
 const dispensePath=detail+'/items/'+f.signed.data.items[0].id+'/dispenses',key=randomUUID();assert.equal((await f.write(dispensePath,{expectedVersion:2,operationKey:key,quantity:'1'},'pharmacy')).response.status,400);
 const d=await f.write(dispensePath,{expectedVersion:2,operationKey:key},'pharmacy');assert.equal(d.response.status,201,d.raw);assert.equal((await f.read('/me/prescriptions/'+f.signed.data.id)).json.data.items[0].fulfillmentState,'FULLY_DISPENSED');
 const h=await f.read(detail+'?purpose=history','pharmacy');assert.equal(h.response.status,200,h.raw);assert.equal(h.json.data.purpose,'CORRECTION_HISTORY');
 const reversed=await f.write(detail+'/dispenses/'+d.json.data.items[0].dispense.id+'/reversals',{expectedVersion:0,operationKey:randomUUID(),reason:'Human reversal'},'pharmacy');assert.equal(reversed.response.status,201,reversed.raw);
 assert.equal((await f.read('/me/prescriptions/'+f.signed.data.id,'pharmacy')).response.status,404);
}));

test('S1 context HTTP canonical strict GET/HEAD, minimized scope, roles and safe failures',()=>isolatedPharmacy(async f=>{
 const path='/pharmacies/context',r=await f.read(path,'pharmacy');assert.equal(r.response.status,200,r.raw);assert.equal(r.json.meta.total,2);
 for(const item of r.json.data)assert.deepEqual(Object.keys(item).sort(),['id','name']);
 for(const canary of [f.users.pharmacy.id,f.pharmacyMember.id,f.users.patient.id,f.c.id,f.signed.data.id,f.hash,f.password])assert.ok(!r.raw.includes(canary));
 assert.equal(r.response.headers.get('cache-control'),'no-store');
 const head=await f.read(path,'pharmacy','HEAD');assert.equal(head.response.status,200);assert.equal(head.raw,'');assert.equal(head.response.headers.get('cache-control'),'no-store');
 for(const role of ['patient','clinician','admin','lab']){const denied=await f.read(path,role);assert.equal(denied.response.status,404);assert.ok(!denied.raw.includes(f.pharmacyOrg.id));}
 assert.equal((await f.rxRequest(path)).response.status,401);
 for(const query of ['?purpose=fulfillment','?purpose=history','?search=CANARY','?userId='+f.users.pharmacy.id,'?pharmacyId='+f.pharmacyOrg.id,'?page=0','?pageSize=101','?page=1&page=2','?page=01','?page=10001','?'])assert.equal((await f.read(path+query,'pharmacy')).response.status,400,query);
 for(const alias of [path+'/',path.replace('context','Context'),path.replace('context','%63ontext'),path+'/routes'])assert.equal((await f.read(alias,'pharmacy')).response.status,404,alias);
 for(const method of ['POST','PUT','PATCH','DELETE']){const denied=await f.rxRequest(path,{method,headers:await f.rxLogin('pharmacy')});assert.equal(denied.response.status,405);assert.equal(denied.response.headers.get('allow'),'GET, HEAD');}
 const far=await f.read(path+'?page=10000&pageSize=1','pharmacy');assert.deepEqual(far.json.data,[]);assert.equal(far.json.meta.total,2);
 const {request}=await import('node:http'),awaitableHeaders=await f.rxLogin('pharmacy');
 const bodyStatus=await new Promise((resolve,reject)=>{const req=request(new URL(r.response.url),{method:'GET',headers:{...Object.fromEntries(Object.entries(awaitableHeaders)), 'Content-Length':'1'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end('x');});
 assert.equal(bodyStatus,400);
 await f.pool.query("UPDATE public.users SET status='DISABLED' WHERE id=$1",[f.users.pharmacy.id]);
 assert.equal((await f.read(path,'pharmacy')).response.status,401);
}));

test('S1 context query failure is sanitized 503, never empty success',()=>isolatedPharmacy(async f=>{
 const {observeApplicabilityQueries}=await import('../support/observed-applicability.mjs');
 const stop=observeApplicabilityQueries((q,next)=>{if(/WITH pharmacy_context AS MATERIALIZED/.test(q.text))throw Error('SYNTHETIC_PRIVATE_SQL_CANARY');return next();});
 try{const r=await f.read('/pharmacies/context','pharmacy');assert.equal(r.response.status,503);assert.equal(r.json.data,undefined);assert.ok(!r.raw.includes('SYNTHETIC_PRIVATE_SQL_CANARY'));assert.equal(r.response.headers.get('cache-control'),'no-store');}finally{stop();}
}));
