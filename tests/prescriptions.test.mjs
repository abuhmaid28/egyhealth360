import test from 'node:test';
import assert from 'node:assert/strict';
import {prescriptionInput,prescriptionJson,medicationInput,prescriptionPage} from '../packages/db/dist/index.js';
import {randomUUID} from 'node:crypto';
const body=()=>({consultationId:randomUUID(),operationKey:randomUUID(),items:[{medicationId:randomUUID(),quantity:'1.230',unit:'unit',instructions:'Human text'}],validFrom:'2026-11-01T10:00:00+02:00',validUntil:'2026-11-02T10:00:00+02:00'});
const invalid=fn=>assert.throws(fn,e=>e.code==='PRESCRIPTION_INVALID');
test('I3S1 exact decimals and offset instants canonicalize without rounding',()=>{const v=prescriptionInput('DRAFT',body());assert.equal(v.content.items[0].quantity,'1.23');assert.equal(v.content.validFrom,'2026-11-01T08:00:00.000Z');});
for(const quantity of [0,1.1,'0','0.000','-1','01','1e3','1.0001','1000000000','NaN','Infinity',' 1'])test('I3S1 quantity rejects '+quantity,()=>{const b=body();b.items[0].quantity=quantity;invalid(()=>prescriptionInput('DRAFT',b));});
for(const extra of [{actor:randomUUID()},{patientId:randomUUID()},{signedAt:'2026-11-01T00:00:00Z'},{expectedVersion:1},{status:'SIGNED'}])test('I3S1 rejects actor/identity/state injection '+Object.keys(extra)[0],()=>invalid(()=>prescriptionInput('DRAFT',{...body(),...extra})));
test('I3S1 bounded items/text/date/prototype and strict JSON',()=>{
 for(const edit of [b=>b.items=[],b=>b.items=Array(21).fill(b.items[0]),b=>b.items[0].unit=' ',b=>b.items[0].instructions='x'.repeat(2001),b=>b.validUntil=b.validFrom,b=>b.validFrom='2026-11-01T00:00:00',b=>b.validFrom='2026-02-30T10:00:00Z',b=>b.items[0].refills=1,b=>b.operationKey=b.operationKey.toUpperCase()]){const b=body();edit(b);invalid(()=>prescriptionInput('DRAFT',b));}
 const b=body();Object.defineProperty(b.items[0],'instructions',{get(){throw Error('must not execute');},enumerable:true});invalid(()=>prescriptionInput('DRAFT',b));
 invalid(()=>prescriptionInput('DRAFT',Object.assign(Object.create({}),body())));
 const {consultationId:ignored,...http}=body();assert.ok(ignored);const raw=JSON.stringify(http);assert.deepEqual(prescriptionJson(raw,'DRAFT'),http);invalid(()=>prescriptionJson(raw.replace('"quantity":"1.230"','"quantity":"1","quantity":"1.230"'),'DRAFT'));invalid(()=>prescriptionJson(JSON.stringify({...http,consultationId:randomUUID()}),'DRAFT'));
});
test('I3S1 strict reason, version, catalog and pagination',()=>{
 const b={consultationId:randomUUID(),prescriptionId:randomUUID(),operationKey:randomUUID(),expectedVersion:1};assert.equal(prescriptionInput('SIGN',b).expectedVersion,1);invalid(()=>prescriptionInput('SIGN',{...b,expectedVersion:'1'}));invalid(()=>prescriptionInput('CANCEL',{...b,reason:' '}));invalid(()=>prescriptionInput('PRIVACY',{...b,reason:'Wrong patient'}));
 invalid(()=>medicationInput({medicationId:randomUUID(),operationKey:randomUUID(),expectedVersion:1,displayName:'Test',isActive:1,isPublished:true}));assert.deepEqual(prescriptionPage({pageSize:3}),{page:1,pageSize:3});invalid(()=>prescriptionPage({pageSize:101}));
});
test('I3S1 additive OpenAPI and all twenty historical migration checksums remain byte-identical',async()=>{
 const {readFile,readdir}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{beforeI3Slice1,beforeI3Slice2}=await import('./support/openapi-baseline.mjs');
 const raw=beforeI3Slice2(await readFile('docs/openapi.json','utf8')),old=beforeI3Slice1(raw),api=JSON.parse(raw),baseline=JSON.parse(old);assert.equal(createHash('sha256').update(old).digest('hex'),'d909bd9a8130f6db9d3c9b4ccfb16f8a69950416bf77180d309ffd27da0f9594');
 const paths=Object.keys(api.paths).filter(p=>!Object.hasOwn(baseline.paths,p));assert.equal(paths.length,13);assert.ok(paths.every(p=>p.includes('/prescriptions')||p.includes('/medications')));for(const p of paths)assert.ok(Object.keys(api.paths[p]).every(m=>['get','head','post'].includes(m)));
 const checksums=JSON.parse(await readFile('tests/fixtures/v3-i3-slice1-migration-checksums.json','utf8'));assert.equal(Object.keys(checksums).length,20);for(const [name,hash]of Object.entries(checksums))assert.equal(createHash('sha256').update(await readFile('packages/db/prisma/migrations/'+name+'/migration.sql')).digest('hex'),hash);
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort().slice(0,21);assert.equal(names.length,21);assert.equal(names.at(-1),'20261101150000_v3_i3_prescription_source');
 const schema=(await readFile('packages/db/prisma/schema.prisma','utf8')).split('// I3 Slice 2 pharmacy fulfillment.')[0];assert.equal([...schema.matchAll(/^model /gm)].length,57);assert.doesNotMatch(schema,/model (PharmacyRoute|Dispense|LabOrder|LabResult)\b/);
});
