import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {directoryExact,directoryId,directoryText,specialtyKey,directoryPage,providerPage,createDirectoryPersistence} from '../packages/db/dist/index.js';
import {parseDirectoryQuery} from '../apps/api/dist/directory.js';
import {createApp} from '../apps/api/dist/app.js';
import {beforeSlice4} from './support/openapi-baseline.mjs';

test('I1S4 bounded immutable public locators, curated keys/text and exact primitive shapes',()=>{
 const id=randomUUID();assert.equal(directoryId(id,true),id);assert.equal(directoryId(id.toUpperCase()),id);
 for(const v of [id.toUpperCase(),id+'\n',' '+id,id.replaceAll('-',''),null,{},'x'.repeat(1000)])assert.throws(()=>directoryId(v,true));
 for(const v of ['general','synthetic-cardiology','a'.repeat(48)])assert.equal(specialtyKey(v),v);
 for(const v of ['A','x-','-x','x--y','x y','x\n','a'.repeat(49),{},'x\u0000'])assert.throws(()=>specialtyKey(v));
 assert.equal(directoryText('👩'.repeat(80),80).length,160);
 for(const v of ['', ' x','x ', 'x\t','x\u0080','\ud800','x'.repeat(81)])assert.throws(()=>directoryText(v,80));
 for(const v of [[],null,Object.create({x:1}),{get x(){throw new Error('getter must never run');}},Object.defineProperty({x:1},'hidden',{value:1}),{x:1,[Symbol('secret')]:1}])assert.throws(()=>directoryExact(v,['x']));
 assert.deepEqual(directoryPage({page:10000,pageSize:100}),{page:10000,pageSize:100});
 for(const p of [0,-1,10001,Infinity,1.1,'1'])assert.throws(()=>directoryPage({page:p,pageSize:20}));
 assert.deepEqual(providerPage({page:1,pageSize:1,specialty:null,clinic:null}),{page:1,pageSize:1,specialty:null,clinic:null});
});

test('I1S4 query grammar rejects ambiguity, encoding and authority-bearing filters',()=>{
 assert.deepEqual(parseDirectoryQuery('/directory/providers',true),{page:1,pageSize:20,specialty:null,clinic:null});
 assert.equal(parseDirectoryQuery('?specialty=general&pageSize=100&page=2',true).specialty,'general');
 for(const q of ['?','?page=0','?page=01','?page=1&page=1','?page=%31','?page=1.0','?pageSize=101','?sort=id','?role=ADMIN','?specialty=%FF','?clinic=not-valid','?patientId='+randomUUID()])assert.throws(()=>parseDirectoryQuery(q,true));
 assert.throws(()=>parseDirectoryQuery('?specialty=general',false));
});

test('I1S4 no HTTP management or clinical authorizer exported; exact service surface and schema scope',async()=>{
 const store=createDirectoryPersistence('postgresql://unused:unused@127.0.0.1:1/unused');
 try{assert.deepEqual(Object.keys(store).sort(),['createSpecialty','setSpecialty','createClinic','setClinic','createProvider','setProvider','publishAffiliation','withdrawAffiliation','inspect','listSpecialties','listClinics','listProviders','getProvider','close'].sort());}finally{await store.close();}
 const schema=await readFile('packages/db/prisma/schema.prisma','utf8');
 for(const name of ['Specialty','ClinicDirectory','ClinicianDirectory','DirectoryAffiliation'])assert.match(schema,new RegExp('model '+name+' \\{'));
 assert.doesNotMatch(schema,/model (RelationshipRequest|Booking|Availability|Slot|Prescription|LabOrder|LabResult|Notification|ClosureAssessment)\b/);
 const source=await readFile('packages/db/src/directory.ts','utf8');assert.doesNotMatch(source,/patient_profiles|clinician_patient_assignments|care_plans|blood_pressure_measurements|clinical_encounters|professional_identifier|u\.email/);
 assert.doesNotMatch(await readFile('packages/db/src/authorization.ts','utf8'),/directory|membership/);
});

test('I1S4 exact OpenAPI append preserves every pre-Slice-4 byte and exposes only approved public keys',async()=>{
 const text=await readFile('docs/openapi.json','utf8'),api=JSON.parse(text);
 assert.equal(createHash('sha256').update(text).digest('hex'),'cd005b69cc22f783ced7458545360adf839b7f6861d4316943dcf64a8384f371');
 assert.equal(createHash('sha256').update(beforeSlice4(text)).digest('hex'),'df91fb3f7c84bd6df258972b8d695316c984fbaa426f08cae4240dc2002f2c4c');
 const old=JSON.parse(beforeSlice4(text));assert.deepEqual(Object.keys(api.paths),[...Object.keys(old.paths),'/api/v1/directory/specialties','/api/v1/directory/clinics','/api/v1/directory/providers','/api/v1/directory/providers/{publicId}']);
 assert.deepEqual(Object.keys(api.components.schemas),[...Object.keys(old.components.schemas),'PublicDirectorySpecialty','PublicDirectoryClinic','PublicDirectoryProvider','PublicDirectoryPage']);
 for(const [name,keys] of [['PublicDirectorySpecialty',['key','displayName']],['PublicDirectoryClinic',['id','displayName','city','address']],['PublicDirectoryProvider',['id','displayName','specialty','clinics']],['PublicDirectoryPage',['page','pageSize','total']]]){const s=api.components.schemas[name];assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,keys);assert.deepEqual(Object.keys(s.properties),keys);}
 for(const [path,operation] of Object.entries(api.paths).filter(([p])=>p.includes('/directory/'))){assert.deepEqual(Object.keys(operation),['get','head'],path);assert.deepEqual(operation.get.security,[]);assert.doesNotMatch(JSON.stringify(operation),/"(?:professionalIdentifier|patientId|organizationMembershipId|availability|booking)"\s*:/);}
});

test('I1S4 public failure projection uses the existing global safe-error boundary and empty HEAD',async()=>{
 const marker='PRIVATE_DIRECTORY_DATABASE_CANARY',fail=async()=>{throw new Error(marker);};
 const app=await createApp({async check(){}},undefined,undefined,undefined,undefined,undefined,{listSpecialties:fail,listClinics:fail,listProviders:fail,getProvider:fail});
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  for(const path of ['/directory/specialties','/directory/clinics','/directory/providers','/directory/providers/'+randomUUID()]){
   for(const method of ['GET','HEAD']){const r=await fetch(base+'/api/v1'+path,{method});assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');const raw=await r.text();assert.equal(raw,method==='HEAD'?'':JSON.stringify({error:{code:'DIRECTORY_UNAVAILABLE',message:'Service unavailable.'}}));assert.ok(!raw.includes(marker));}
  }
 }finally{await app.close();}
});

test('I1S4 exact migration addition retains twelve historical SQL files unchanged',async()=>{
 const names=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort();
 assert.equal(names.length,13);assert.equal(names.at(-1),'20261024000000_v3_i1_directory');
 const sql=await readFile('packages/db/prisma/migrations/'+names.at(-1)+'/migration.sql','utf8');
 assert.doesNotMatch(sql,/UPDATE public\.(users|clinician_profiles|organizations|organization_memberships)|INSERT INTO public\.(specialties|clinic_directory|clinician_directory|directory_affiliations)/);
 assert.match(sql,/SET search_path=pg_catalog,public,pg_temp/);assert.match(sql,/REFERENCES public\.organization_memberships\(id,user_id,organization_id,user_role,organization_kind\)/);
});
