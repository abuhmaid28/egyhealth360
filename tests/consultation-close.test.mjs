import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {consultationCloseInput} from '../packages/db/dist/index.js';
import {beforeI2Slice7,beforeI2LiveCloseout} from './support/openapi-baseline.mjs';

test('I2S7 close exact canonical copied input; no caller close actor/time or unknown fields',()=>{
  const input={consultationId:randomUUID(),operationKey:randomUUID(),expectedVersion:1},out=consultationCloseInput(input);
  assert.deepEqual(out,input);input.expectedVersion=9;assert.equal(out.expectedVersion,1);
  for(const key of ['closedAt','closedByUserId','actorUserId','patientId','state','closeAssignmentId','command'])assert.throws(()=>consultationCloseInput({...out,[key]:'spoof'}));
  for(const expectedVersion of [0,-1,1.5,'1',null,2147483647])assert.throws(()=>consultationCloseInput({...out,expectedVersion}));
  for(const v of [null,[],{},Object.create(out),{...out,consultationId:out.consultationId.toUpperCase()},Object.defineProperty({...out},'operationKey',{get(){throw Error('must not invoke getter');}})])assert.throws(()=>consultationCloseInput(v));
});

test('I2S7 adds only frozen PUT close plus exact booking enums; all previous OpenAPI bytes remain pinned',async()=>{
  const raw=beforeI2LiveCloseout(await readFile('docs/openapi.json','utf8')),old=beforeI2Slice7(raw),api=JSON.parse(raw),prior=JSON.parse(old);
  assert.equal(createHash('sha256').update(old).digest('hex'),'da32158718b0475d44c9b4bdcee495cd165814de0b8ba11a2fe3d5c2e3ada8cb');
  const added=Object.keys(api.paths).filter(p=>!Object.hasOwn(prior.paths,p));assert.deepEqual(added,['/api/v1/consultations/{consultationId}/close']);
  assert.deepEqual(Object.keys(api.paths[added[0]]),['put']);assert.equal(Object.keys(api.components.schemas).length,Object.keys(prior.components.schemas).length+2);
  assert.deepEqual(api.components.schemas.ConsultationClose.required,['operationKey','expectedVersion']);
  assert.deepEqual(api.components.schemas.Booking.properties.state.enum,[...prior.components.schemas.Booking.properties.state.enum,'CONSULTED']);
  const migrations=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort().slice(0,20);assert.equal(migrations.length,20);assert.equal(migrations.at(-1),'20261031140000_v3_i2_consultation_close');
});
