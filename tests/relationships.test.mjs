import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {relationshipId,relationshipInput,relationshipPage,createRelationshipPersistence} from '../packages/db/dist/index.js';
import {parseRelationshipJson} from '../apps/api/dist/relationships.js';
import {beforeSlice5} from './support/openapi-baseline.mjs';
test('I1S5 canonical immutable-target inputs and strict primitive snapshot, no identity injection/getters/hidden fields',()=>{
 const u=randomUUID(),v=randomUUID();assert.equal(relationshipId(u),u);for(const value of [u.toUpperCase(),u+'\n',null,{},u.replaceAll('-','')])assert.throws(()=>relationshipId(value));
 assert.deepEqual(relationshipInput({providerId:u,operationKey:v},['providerId','operationKey']),{providerId:u,operationKey:v});
 for(const value of [{providerId:u,operationKey:v,role:'ADMIN'},Object.create({providerId:u,operationKey:v}),{get providerId(){throw Error('Getter must not run');},operationKey:v},Object.defineProperty({providerId:u,operationKey:v},'hidden',{value:true}),{providerId:u,operationKey:v,[Symbol()]:1}])assert.throws(()=>relationshipInput(value,['providerId','operationKey']));
 for(const raw of ['null','[]','{"role":"ADMIN"}','{"providerId":"'+u+'","providerId":"'+v+'","operationKey":"'+v+'"}','{"providerId":"'+u+'","\\u0070roviderId":"'+u+'","operationKey":"'+v+'"}','{"__proto__":{}}'])assert.throws(()=>parseRelationshipJson(raw,true));
 assert.deepEqual(parseRelationshipJson('{}',false),{});assert.throws(()=>parseRelationshipJson('{"operationKey":"'+u+'"}',false));
});
test('I1S5 bounded deterministic history pagination; no authority or arbitrary query fields',()=>{
 assert.deepEqual(relationshipPage({}),{page:1,pageSize:20});assert.deepEqual(relationshipPage({page:'10000',pageSize:'100'}),{page:10000,pageSize:100});
 for(const q of [{page:'0'},{page:'01'},{page:'10001'},{pageSize:'101'},{page:1},{sort:'id'},{patientId:randomUUID()},{get page(){throw Error('must not run');}}])assert.throws(()=>relationshipPage(q));
});
test('I1S5 exact narrow service and sole clinical grant boundary, no future slice/domain leakage',async()=>{
 const store=createRelationshipPersistence('postgresql://unused:unused@127.0.0.1:1/unused');try{assert.deepEqual(Object.keys(store).sort(),['authorize','decide','end','read','close'].sort());}finally{await store.close();}
 const source=await readFile('packages/db/src/authorization.ts','utf8');assert.doesNotMatch(source,/relationship_requests|RelationshipRequest|membership|directory/i);
 const schema=await readFile('packages/db/prisma/schema.prisma','utf8');assert.doesNotMatch(schema,/model (Booking|Availability|Prescription|LabOrder|LabResult|Notification|ClosureAssessment)\b/);
 assert.match(schema,/model RelationshipRequest \{/);assert.match(schema,/model AssignmentEndProvenance \{/);
});
test('I1S5 exact API append preserves all historical bytes and route/schema inventories',async()=>{
 const text=await readFile('docs/openapi.json','utf8'),api=JSON.parse(text),old=JSON.parse(beforeSlice5(text));
 assert.equal(createHash('sha256').update(text).digest('hex'),'29929536d16f7c1abd21c21aed8dafbc97a1150f58bf9bcbc67d1e46dc02b48b');
 assert.equal(createHash('sha256').update(beforeSlice5(text)).digest('hex'),'cd005b69cc22f783ced7458545360adf839b7f6861d4316943dcf64a8384f371');
 const paths=['/api/v1/me/relationship-requests','/api/v1/me/relationship-requests/{requestId}','/api/v1/me/relationship-requests/{requestId}/accept','/api/v1/me/relationship-requests/{requestId}/decline','/api/v1/me/relationship-requests/{requestId}/withdraw','/api/v1/me/relationships','/api/v1/me/relationships/{assignmentId}','/api/v1/me/relationships/{assignmentId}/end'];
 assert.deepEqual(Object.keys(api.paths),[...Object.keys(old.paths),...paths]);assert.deepEqual(Object.keys(api.components.schemas),[...Object.keys(old.components.schemas),'RelationshipAuthorization','RelationshipCommand','RelationshipRequest','ParticipantRelationship','RelationshipPage']);
 for(const path of paths)for(const [method,op] of Object.entries(api.paths[path])){assert.deepEqual(op.security,[{sessionCookie:[]}]);assert.ok(op.responses['200']);if(method==='head')assert.ok(Object.values(op.responses).every(r=>!r.content));}
});
test('I1S5 one additive migration; no old field backfills or historical assignment schema rewrite',async()=>{
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort();assert.equal(names.length,14);assert.equal(names.at(-1),'20261025190000_v3_i1_relationships');
 const sql=await readFile('packages/db/prisma/migrations/'+names.at(-1)+'/migration.sql','utf8');assert.doesNotMatch(sql,/ALTER TABLE "clinician_patient_assignments" ADD COLUMN|INSERT INTO public\.(relationship_requests|assignment_end_provenance)|UPDATE public\.(users|clinician_patient_assignments|clinician_profiles|directory_affiliations)/);
 assert.match(sql,/relationship_requests_pending_pair_key/);assert.match(sql,/DEFERRABLE INITIALLY DEFERRED/);assert.match(sql,/SECURITY INVOKER/);
});
