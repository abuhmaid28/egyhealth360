import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeEmail, profileValues, registrationIdentity } from '../packages/db/dist/index.js';
import { parsePatientEntryJson, RegistrationBudget, registrationGuards, REGISTRATION_ACK, REGISTRATION_HEADER, REGISTRATION_HEADER_VALUE } from '../apps/api/dist/patient-entry.js';
const valid = { email: ' Person.Name+Tag@Example.INVALID\t', password: ' untrimmed\u0000é ', displayName: 'Synthetic Patient' };

test('I1S3 registration strict shape, bounded canonical email and unmodified login-compatible UTF8 password', () => {
  for (const email of ['A@B',' \tA.Name+TAG@Example.invalid\r\n','!@?']) {
    const value = parsePatientEntryJson(JSON.stringify({ ...valid,email }), true);
    assert.equal(value.email, canonicalizeEmail(email)); assert.equal(value.password,valid.password);
  }
  assert.notEqual(canonicalizeEmail('a.b@c'),canonicalizeEmail('ab@c'));
  assert.notEqual(canonicalizeEmail('a+b@c'),canonicalizeEmail('a@c'));
  for(const email of ['a b@c','a@@c','@c','a@','é@c','a@c\u00a0','a'.repeat(1025)+'@b'])assert.throws(()=>parsePatientEntryJson(JSON.stringify({...valid,email}),true));
  for (const password of ['x','\u0000','a'.repeat(1024),'é'.repeat(512)])assert.equal(parsePatientEntryJson(JSON.stringify({...valid,password}),true).password,password);
  for(const password of ['', 'é'.repeat(513),null,1024])assert.throws(()=>parsePatientEntryJson(JSON.stringify({...valid,password}),true));
  for(const key of ['role','status','userId','owner','patientId','profileId','organization','membership','auditActor','__proto__','extra']) {
    assert.throws(()=>parsePatientEntryJson(JSON.stringify({...valid,[key]:'ADMIN'}),true));
  }
  for(const raw of ['null','[]','{}','{','{"email":"a@b","email":"c@d","password":"a","displayName":"A"}','{"email":"a@b","em\\u0061il":"c@d","password":"a","displayName":"A"}'])assert.throws(()=>parsePatientEntryJson(raw,true));
  for(const name of ['', ' ', ' x', 'x ', 'x\n', '\ud800', 'x'.repeat(161)])assert.throws(()=>registrationIdentity({email:'a@b',displayName:name}));
  assert.equal(registrationIdentity({email:'a@b',displayName:'👩'.repeat(160)}).displayName.length,320);
});

test('I1S3 profile is exact existing-context fields; strict valid calendar and opaque sex, never authority',()=>{
 const data={displayName:'Synthetic',dateOfBirth:'2000-02-29',sex:'opaque context'};
 assert.deepEqual(profileValues(data),data);
 for(const dateOfBirth of [null,'0001-01-01','9999-12-31'])assert.equal(profileValues({...data,dateOfBirth}).dateOfBirth,dateOfBirth);
 for(const dateOfBirth of ['0000-01-01','2001-02-29','2000-04-31','2000-1-01','2020-01-01T00:00:00Z',0,''])assert.throws(()=>profileValues({...data,dateOfBirth}));
 for(const sex of ['', 'x'.repeat(65),'x\n',0])assert.throws(()=>profileValues({...data,sex}));
 for(const extra of ['id','userId','patientId','profileId','role','status','email','password','assignmentId'])assert.throws(()=>profileValues({...data,[extra]:'x'}));
 assert.throws(()=>parsePatientEntryJson('{"displayName":"A","dateOfBirth":null,"sex":null,"s\\u0065x":"x"}',false));
});

test('I1S3 dedicated non-simple header plus exact Origin and Fetch Metadata independently fail closed',()=>{
 assert.equal(REGISTRATION_HEADER,'x-eh-register');assert.equal(REGISTRATION_HEADER_VALUE,'1');assert.deepEqual(REGISTRATION_ACK,{data:{accepted:true}});
 const base={'origin':'http://localhost:3000','content-type':'application/json','x-eh-register':'1'};
 const check=(headers,raw)=>registrationGuards({headers,rawHeaders:raw??Object.entries(headers).flat()},{config:{origin:base.origin}});
 check(base);for(const site of ['same-origin','same-site','none'])check({...base,'sec-fetch-site':site});
 for(const headers of [{...base,origin:'http://evil.invalid'},{...base,origin:undefined},{...base,'sec-fetch-site':'cross-site'},{...base,'sec-fetch-site':'bogus'},{...base,'x-eh-register':undefined},{...base,'x-eh-register':'true'},{...base,'content-type':'text/plain'}])assert.throws(()=>check(headers));
 assert.throws(()=>check(base,[...Object.entries(base).flat(),'X-EH-Register','1']));
 assert.throws(()=>check(base,[...Object.entries(base).flat(),'Origin',base.origin]));
});

test('I1S3 bounded hash concurrency has no queue, release is idempotent, failures cannot leak permits',()=>{
 let now=0;const budget=new RegistrationBudget(()=>now);
 const one=budget.acquire(),two=budget.acquire();assert.throws(()=>budget.acquire(),e=>e.getStatus()===429);
 one();one();const three=budget.acquire();assert.throws(()=>budget.acquire());two();three();
 now=60000;const release=budget.acquire();release();
});

test('I1S3 throttling has fixed memory, 30 attempts/window independent of identity; saturation consumes an attempt',()=>{
 let now=0;const budget=new RegistrationBudget(()=>now);
 for(let i=0;i<30;i++)budget.acquire()();
 assert.throws(()=>budget.acquire(),e=>e.getStatus()===429);
 now=59999;assert.throws(()=>budget.acquire());now=60000;budget.acquire()();
 assert.deepEqual(Object.keys(budget).sort(),['active','attempts','now','start']);
 const running=new RegistrationBudget(()=>now),release=running.acquire(),release2=running.acquire();
 now+=60000;assert.throws(()=>running.acquire());release();running.acquire()();release2();
});


test('I1S3 exact OpenAPI inventory/delta leaves every prior route/schema unchanged', async()=>{
 const {readFile}=await import('node:fs/promises');const {createHash}=await import('node:crypto');
 const {beforeSlice3}=await import('./support/openapi-baseline.mjs');
 const text=await readFile('docs/openapi.json','utf8'),api=JSON.parse(text);
 assert.equal(createHash('sha256').update(text).digest('hex'),'493e9aa9bbba6e1b51cfb5061227c1e95ef03357d1595440d3c571a9a9edd551');
 assert.equal(createHash('sha256').update(beforeSlice3(text)).digest('hex'),'b658be382f191f8e7a23b8311cdbd18e0da46b14f7b3f78613b1514c6668956c');
 assert.equal(Object.keys(api.paths).length,13);assert.equal(Object.keys(api.components.schemas).length,13);
 assert.deepEqual(Object.keys(api.paths['/api/v1/auth/register']),['post']);
 assert.deepEqual(Object.keys(api.paths['/api/v1/me/profile']),['get','head','put']);
 assert.deepEqual(api.components.schemas.PatientRegistrationRequest.required,['email','password','displayName']);
 assert.deepEqual(api.components.schemas.OwnPatientProfile.required,['displayName','dateOfBirth','sex']);
 assert.equal(api.components.schemas.PatientRegistrationRequest.additionalProperties,false);
});
