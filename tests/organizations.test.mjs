import test from 'node:test';
import { beforeSlice3 } from './support/openapi-baseline.mjs';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createOrganizationPersistence } from '../packages/db/dist/index.js';

test('I1S2 narrow runtime surface has no patient, fulfillment, publication or reusable authorization operations',async()=>{
 const store=createOrganizationPersistence('postgresql://unused:unused@127.0.0.1:1/unused');
 try{assert.deepEqual(Object.keys(store).sort(),['createOrganization','inspectOrganization','setOrganizationStatus','grantMembership','endMembership','inspectMembership','readMemberOrganization','close'].sort());}
 finally{await store.close();}
 const schema=(await readFile('packages/db/prisma/schema.prisma','utf8')).split('// Slice 3 logistics.')[0];
 for(const model of ['Organization','OrganizationMembership'])assert.match(schema,new RegExp(`model ${model} \\{`));
 assert.doesNotMatch(schema,/model (Prescription|LabOrder|LabResult|Notification|Booking)\b/);
 assert.doesNotMatch(await readFile('packages/db/src/authorization.ts','utf8'),/organization_memberships|membership|LAB_STAFF|PHARMACY_STAFF/);
});

test('I1S2 HTTP paths and legacy OpenAPI remain exact, with only the two authenticated staff roles added',async()=>{
 const text=beforeSlice3(await readFile('docs/openapi.json','utf8')),api=JSON.parse(text);
 assert.deepEqual(api.components.schemas.AuthSuccess.properties.data.properties.user.properties.role.enum,['PATIENT','CLINICIAN','ADMIN','LAB_STAFF','PHARMACY_STAFF']);
 const old=text.replace(',\n                      "LAB_STAFF",\n                      "PHARMACY_STAFF"','');
 assert.equal(createHash('sha256').update(old).digest('hex'),'c4577d43f7c2d43b9ff2c0d4ef1516e2cd5a48d59176ae869ae34c26cdca9ae0');
 assert.equal(Object.keys(api.paths).length,11);
});

test('I1S2 exact additive migration inventory and all historical SQL hashes remain frozen',async()=>{
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort().slice(0,14);
 const expected={
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
  "20261025190000_v3_i1_relationships": "44a6848ac658afeec01b6ea1005d226589b9b96967f11fcc62623089ac9e729d"
};
 assert.deepEqual(names,Object.keys(expected));
 for(const [name,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${name}/migration.sql`)).digest('hex'),hash,name);
});
