import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pharmacyInput,pharmacyJson,pharmacyPage} from '../packages/db/dist/index.js';
const base=()=>({consultationId:randomUUID(),prescriptionId:randomUUID(),expectedVersion:2,itemIds:[randomUUID(),randomUUID()],destinationId:randomUUID(),operationKey:randomUUID()});
const invalid=fn=>assert.throws(fn,e=>e.code==='PHARMACY_INVALID');
test('I3S2 canonical route item set and explicit expected versions; no client authority or fulfillment injection',()=>{
 const b=base(),r=pharmacyInput('ROUTE',b);assert.deepEqual(r.itemIds,[...b.itemIds].sort());assert.equal(r.expectedVersion,2);
 for(const key of ['patientId','actor','membershipId','sourceAuthor','quantity','dispensedAt','state','refills','medicationId'])invalid(()=>pharmacyInput('ROUTE',{...b,[key]:'CANARY'}));
 for(const value of [[],Array(21).fill(b.itemIds[0]),[b.itemIds[0],b.itemIds[0]],[b.itemIds[0].toUpperCase()]])invalid(()=>pharmacyInput('ROUTE',{...b,itemIds:value}));
 for(const expectedVersion of [0,-1,'2',2.5,2147483647])invalid(()=>pharmacyInput('ROUTE',{...b,expectedVersion}));
});
test('I3S2 staff exact target parsing, reason bounds, correction version zero and immutable dispense quantity',()=>{
 const b={pharmacyId:randomUUID(),routeId:randomUUID(),operationKey:randomUUID(),expectedVersion:2},d={...b,itemId:randomUUID()};assert.ok(pharmacyInput('DISPENSE',d));
 for(const k of ['quantity','unit','medicationId','actorUserId','membershipId','recordedAt'])invalid(()=>pharmacyInput('DISPENSE',{...d,[k]:'spoof'}));
 const c={...b,dispenseId:randomUUID(),expectedVersion:0,reason:'Human correction'};assert.equal(pharmacyInput('CORRECT',c).expectedVersion,0);for(const reason of [' ','x'.repeat(1001),'bad\tcontrol'])invalid(()=>pharmacyInput('REVERSE',{...c,reason}));
 invalid(()=>pharmacyInput('ACCEPT',{...b,reason:'extra'}));invalid(()=>pharmacyInput('UNKNOWN',b));
});
test('I3S2 strict raw duplicate/nested JSON and bounded purpose pagination',()=>{
 const {consultationId:ignored,prescriptionId:also,...b}=base();assert.ok(ignored&&also);const raw=JSON.stringify(b);assert.deepEqual(pharmacyJson(raw,'ROUTE'),b);
 invalid(()=>pharmacyJson(raw.replace('"expectedVersion":2','"expectedVersion":1,"expectedVersion":2'),'ROUTE'));invalid(()=>pharmacyJson(JSON.stringify({...b,patientId:randomUUID()}),'ROUTE'));invalid(()=>pharmacyJson('null','ACCEPT'));
 assert.deepEqual(pharmacyPage({purpose:'history',pageSize:1}),{page:1,pageSize:1,purpose:'history'});for(const v of [{purpose:'forensic'},{patientId:randomUUID()},{pageSize:101},Object.create({page:1})])invalid(()=>pharmacyPage(v));
 const a=base();Object.defineProperty(a,'itemIds',{get(){throw Error('do not execute');},enumerable:true});invalid(()=>pharmacyInput('ROUTE',a));
});
test('I3S2 exact additive API/model inventory and all twenty-one historical migration bytes remain pinned',async()=>{
 const {readFile,readdir}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{beforeI3Slice2}=await import('./support/openapi-baseline.mjs');
 const raw=await readFile('docs/openapi.json','utf8'),old=beforeI3Slice2(raw),api=JSON.parse(raw),prior=JSON.parse(old);assert.equal(createHash('sha256').update(old).digest('hex'),'f8b9cc152df87f118d671222b6270b62ff2955f5cd7a13e47837b8a7223d2362');
 const paths=Object.keys(api.paths).filter(p=>!Object.hasOwn(prior.paths,p));assert.equal(paths.length,10);assert.ok(paths.every(p=>p.includes('/pharmacy-routes')||p.includes('/pharmacies/')||p.endsWith('/pharmacy-destinations')));assert.deepEqual(api.components.schemas.PrescriptionItem.properties.fulfillmentState.enum,['NOT_DISPENSED','FULLY_DISPENSED']);for(const p of paths)if(api.paths[p].head)assert.ok(Object.values(api.paths[p].head.responses).every(r=>r.content===undefined));
 const checksums=JSON.parse(await readFile('tests/fixtures/v3-i3-slice2-migration-checksums.json','utf8'));assert.equal(Object.keys(checksums).length,21);for(const[name,digest]of Object.entries(checksums))assert.equal(createHash('sha256').update(await readFile('packages/db/prisma/migrations/'+name+'/migration.sql')).digest('hex'),digest);
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort();assert.equal(names.length,22);assert.equal(names.at(-1),'20261101170000_v3_i3_pharmacy_fulfillment');const schema=await readFile('packages/db/prisma/schema.prisma','utf8');assert.equal([...schema.matchAll(/^model /gm)].length,63);assert.doesNotMatch(schema,/model (LabOrder|LabResult|DispensePartial|Refill|ClosureAssessment)\b/);
});
