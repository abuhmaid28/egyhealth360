import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {intentInput,intentJson,intentPage} from '../packages/db/dist/index.js';
import {intentQuery} from '../apps/api/dist/follow-up-intents.js';
const body=(extra={})=>({instruction:'Explicit human متابعة 😀\n',desiredWindow:null,operationKey:randomUUID(),...extra}),input=(extra={})=>({consultationId:randomUUID(),...body(extra)});
test('I2S6 exact scalar bounds, controls, immutable copied inputs and strict identities',()=>{
 assert.doesNotThrow(()=>intentInput('DRAFT',input({instruction:'😀'.repeat(2000)})));for(const instruction of ['', 'a'.repeat(2001),'\ud800','\udfff','a\rb','a\tb','a\0b','a\u0085b'])assert.throws(()=>intentInput('DRAFT',input({instruction})));
 for(const name of ['patientId','authorUserId','state','signedAt','bookingId'])assert.throws(()=>intentInput('DRAFT',input({[name]:randomUUID()})));
 for(const id of [randomUUID().toUpperCase(),'00000000-0000-1000-8000-000000000000',null])assert.throws(()=>intentInput('DRAFT',input({operationKey:id})));
 const v=input({desiredWindow:{startAt:'2026-01-01T02:00:00+02:00',endAt:'2026-01-02T02:00:00+02:00',timeZone:'Africa/Cairo'}}),out=intentInput('DRAFT',v);v.desiredWindow.timeZone='UTC';assert.equal(out.desiredWindow.timeZone,'Africa/Cairo');assert.equal(out.desiredWindow.startAt,'2026-01-01T00:00:00.000Z');
});
for(const window of [ {},{startAt:'2026-02-30T00:00:00Z',endAt:'2026-03-01T00:00:00Z',timeZone:'UTC'},{startAt:'2026-01-01T00:00:00',endAt:'2026-01-02T00:00:00Z',timeZone:'UTC'},{startAt:'2026-01-01T00:00:00Z',endAt:'2026-01-02T00:00:00Z',timeZone:'Africa/Cairo'},{startAt:'2026-01-01T00:00:00.0001Z',endAt:'2026-01-02T00:00:00Z',timeZone:'UTC'},{startAt:'2026-01-02T00:00:00Z',endAt:'2026-01-01T00:00:00Z',timeZone:'UTC'},{startAt:'2026-01-01T00:00:00Z',endAt:'2026-01-02T00:00:00Z',timeZone:'+02:00'}])test('I2S6 strict desired window '+JSON.stringify(window),()=>assert.throws(()=>intentInput('DRAFT',input({desiredWindow:window}))));
test('I2S6 DST offset snapshots and real calendar normalization without future-only rule',()=>{
 const desiredWindow={startAt:'2026-03-08T01:30:00-05:00',endAt:'2026-03-08T03:30:00-04:00',timeZone:'America/New_York'};assert.equal(intentInput('DRAFT',input({desiredWindow})).desiredWindow.endAt,'2026-03-08T07:30:00.000Z');assert.throws(()=>intentInput('DRAFT',input({desiredWindow:{...desiredWindow,endAt:'2026-03-08T03:30:00-05:00'}})));
});
test('I2S6 strict per-object decoded duplicate key rejection and command shapes',()=>{
 const b=body();assert.doesNotThrow(()=>intentJson(JSON.stringify(b),'DRAFT'));
 for(const raw of ['null','[]','{}',JSON.stringify({...b,consultationId:randomUUID()}),JSON.stringify(b).replace('"instruction":','"\\u0069nstruction":"x","instruction":'),JSON.stringify({...b,desiredWindow:{startAt:'2026-01-01T00:00:00Z',endAt:'2026-01-02T00:00:00Z',timeZone:'UTC'}}).replace('"timeZone":"UTC"','"timeZone":"UTC","\\u0074imeZone":"UTC"')])assert.throws(()=>intentJson(raw,'DRAFT'));
 assert.throws(()=>intentInput('RELEASE',{consultationId:randomUUID(),intentId:randomUUID(),expectedVersion:0,operationKey:randomUUID()}));assert.throws(()=>intentInput('LINK',{consultationId:randomUUID(),intentId:randomUUID(),bookingId:randomUUID(),expectedLinkVersion:1,operationKey:randomUUID()}));
});
test('I2S6 canonical bounded independent pagination rejects encoded aliases and list link pages',()=>{
 assert.deepEqual(intentQuery('/x?page=1&pageSize=100&linkPage=2&linkPageSize=3',false),{page:1,pageSize:100,linkPage:2,linkPageSize:3});
 for(const q of ['?','?page=01','?page=1&page=2','?%70age=1','?page=10001','?pageSize=101','?sort=id','?linkPage=1'])assert.throws(()=>intentQuery('/x'+q,true));assert.throws(()=>intentPage({page:-0}));
});
test('I2S6 all eighteen historical migrations preserve byte hashes',async()=>{const hashes=JSON.parse(await readFile('tests/fixtures/v3-i2-slice6-migration-checksums.json','utf8'));assert.equal(Object.keys(hashes).length,18);for(const [name,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile('packages/db/prisma/migrations/'+name+'/migration.sql')).digest('hex'),hash);});
test('I2S6 appends only bounded intent API; exact Slice 5 OpenAPI bytes preserved',async()=>{const {beforeI2Slice6,beforeI2Slice7}=await import('./support/openapi-baseline.mjs'),raw=beforeI2Slice7(await readFile('docs/openapi.json','utf8')),before=beforeI2Slice6(raw);assert.equal(createHash('sha256').update(before).digest('hex'),'779909773ee5a5cc4c12815d260f7a9284aa9faa2acc2127e7d87cf0f9b50db6');const api=JSON.parse(raw),old=JSON.parse(before),added=Object.keys(api.paths).filter(p=>!Object.hasOwn(old.paths,p));assert.equal(added.length,11);assert.ok(added.every(p=>p.includes('/follow-up-intents')));for(const path of added){assert.ok(Object.keys(api.paths[path]).every(m=>['get','head','post'].includes(m)));if(api.paths[path].post)assert.equal(api.paths[path].post.requestBody.required,true);if(api.paths[path].head)assert.ok(Object.values(api.paths[path].head.responses).every(r=>r.content===undefined));}});
