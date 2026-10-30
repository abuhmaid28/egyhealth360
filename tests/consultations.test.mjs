import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {consultationInput} from '../packages/db/dist/index.js';
import {parseBookingJson} from '../apps/api/dist/bookings.js';
import {beforeI2Slice4,beforeI2Slice5} from './support/openapi-baseline.mjs';
// Byte hashes of current-main b82553e; CI shallow checkout needs no Git history.
const historicalChecksums={
  "20261012200810_eh005_identity_core_foundation": "d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a",
  "20261013014000_eh006_auth_sessions": "2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b",
  "20261013235221_eh009_clinical_definition_foundation": "bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a",
  "20261016000000_eh010_care_plan_lifecycle": "47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38",
  "20261017000000_eh011_bp_provenance": "5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21",
  "20261018000000_eh012_followup_encounters": "7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01",
  "20261019000000_eh013_record_coverage_windows": "f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b",
  "20261020000000_eh015_observed_clinical_applicability": "49b5afca8d394e7f501a111409eb39dcba65166f8ef22f39a954028de8f9ea69",
  "20261021000000_bp_correction_invalidation": "00fb72bcd773f1927e520cfe9db37ade2f78f546ab8ea330a66c633f1b6fc91f",
  "20261022000000_eh014_initial_care_action": "244207da379c6db2a8132d2aabe8a138d5f9183054b519f58676848c9f80e228",
  "20261023000000_v3_i1_staff_roles": "fe77189c4dddbf4dbc2f1ef7faf958103b1202de57c0bac47d30cb48dba48a3b",
  "20261023000100_v3_i1_organizations": "f6a14d2fa1bbaabb0b1b6e4a0ce8215820a2b6b4da23cee62d5a67d28a235b31",
  "20261024000000_v3_i1_directory": "2175f8d202f1e774ba3465a5afda1652ceccf4e3ef98150eb54ab8dd0ed8f104",
  "20261025190000_v3_i1_relationships": "44a6848ac658afeec01b6ea1005d226589b9b96967f11fcc62623089ac9e729d",
  "20261027210000_v3_i2_availability": "973eb49890e444434d94013c234c19399eabaf5e814c289fec74244f43c43c0f",
  "20261028090000_v3_i2_bookings": "e9ed5902893077701c4b81fcde955c358002757c48ef6f44157b7fe18dabdced"
};
test('I2S4 exact command, canonical identity and copied data descriptors',()=>{const input={bookingId:randomUUID(),operationKey:randomUUID()};assert.deepEqual(consultationInput(input),input);assert.deepEqual(parseBookingJson(JSON.stringify({operationKey:input.operationKey}),'OPEN'),{operationKey:input.operationKey});for(const extra of ['patientId','assignmentId','clinicianId','openedAt','notes','state'])assert.throws(()=>consultationInput({...input,[extra]:'x'}));for(const value of [null,[],{},Object.create(input),{...input,operationKey:input.operationKey.toUpperCase()},{...input,bookingId:input.bookingId+'/'},Object.defineProperty({...input},'operationKey',{get(){throw Error('getter must not execute');}})])assert.throws(()=>consultationInput(value));});
test('I2S4 exact additive route/schemas and sixteen unchanged historical SQL checksums',async()=>{const raw=beforeI2Slice5(await readFile('docs/openapi.json','utf8')),base=beforeI2Slice4(raw),api=JSON.parse(raw),prior=JSON.parse(base);assert.equal(createHash('sha256').update(base).digest('hex'),'3994597ce3d7363561fe9c08869653cb26ad375aa28488ff8fe00cfd3850588c');assert.deepEqual(Object.keys(api.paths).slice(Object.keys(prior.paths).length),['/api/v1/me/bookings/{bookingId}/consultation']);assert.deepEqual(Object.keys(api.paths['/api/v1/me/bookings/{bookingId}/consultation']),['post']);assert.equal(Object.keys(api.components.schemas).length,Object.keys(prior.components.schemas).length+3);assert.deepEqual(api.components.schemas.Booking.properties.state.enum,[...prior.components.schemas.Booking.properties.state.enum,'IN_CONSULTATION']);assert.deepEqual(api.components.schemas.BookingTransition.properties.command.enum,[...prior.components.schemas.BookingTransition.properties.command.enum,'OPEN']);const names=(await readdir('packages/db/prisma/migrations')).filter(x=>x!=='migration_lock.toml').sort();assert.equal(names.length,18);assert.equal(names[16],'20261029090000_v3_i2_consultation_opening');for(const name of names.slice(0,16)){const file=`packages/db/prisma/migrations/${name}/migration.sql`;assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),historicalChecksums[name]);}const schema=await readFile('packages/db/prisma/schema.prisma','utf8');assert.equal([...schema.matchAll(/^model /gm)].length,43);assert.doesNotMatch(schema,/model (FollowUpIntent|Prescription|LabOrder)\b/);});
