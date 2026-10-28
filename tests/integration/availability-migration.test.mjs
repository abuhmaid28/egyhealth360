import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedCareActions} from '../support/care-actions.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';
import {createOrganizationPersistence,createDirectoryPersistence,createRelationshipPersistence} from '../../packages/db/dist/index.js';
test('I2S2 populated exact-main 14 to 15 preserves all 31 historical tables and ledger; zero fabricated rows; repeat ZERO_WRITE',()=>isolatedCareActions(async f=>{
 await f.actions.generateInitialAction(f.actor,await f.command());migrationRunner(f.url,'deploy',14);
 const orgs=createOrganizationPersistence(f.url),directory=createDirectoryPersistence(f.url),relationships=createRelationshipPersistence(f.url);
 try{
 const admin=f.principals.admin,org=(await orgs.createOrganization(admin,{kind:'CLINIC',name:'Retained synthetic clinic',operationKey:randomUUID()})).organization;
 const ended=(await orgs.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;await orgs.endMembership(admin,{organizationId:org.id,membershipId:ended.id});const member=(await orgs.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;
 let specialty=(await directory.createSpecialty(admin,{key:'retained-synthetic',displayName:'Retained Synthetic',operationKey:randomUUID()})).specialty;specialty=(await directory.setSpecialty(admin,{specialtyId:specialty.id,displayName:specialty.displayName,isPublished:true,expectedVersion:0})).specialty;
 let clinic=(await directory.createClinic(admin,{organizationId:org.id,displayName:'Retained Synthetic',city:'City',address:'Address',operationKey:randomUUID()})).clinic;await directory.setClinic(admin,{clinicId:clinic.id,displayName:clinic.displayName,city:clinic.city,address:clinic.address,isPublished:true,expectedVersion:0});
 let provider=(await directory.createProvider(admin,{clinicianId:f.identities['clinician-assigned'].profileId,specialtyId:specialty.id,displayName:'Retained Doctor',operationKey:randomUUID()})).provider;await directory.publishAffiliation(admin,{providerId:provider.id,membershipId:member.id,operationKey:randomUUID()});provider=(await directory.setProvider(admin,{providerId:provider.id,specialtyId:specialty.id,displayName:provider.displayName,isPublished:true,expectedVersion:0})).provider;
 // Retained legacy and genuine bilateral history, without manufacturing consent.
 const request=await relationships.authorize(f.principals['patient-b'],{providerId:provider.publicId,operationKey:randomUUID()});await relationships.decide(f.actor,{requestId:request.request.id},'accept');await relationships.decide(f.principals['patient-b'],{requestId:request.request.id},'withdraw');
 const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);assert.equal(tables.length,32);
 const snapshot=async names=>Object.fromEntries(await Promise.all(names.map(async t=>[t,(await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])));
 const before=await snapshot(tables),ledger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
 migrationRunner(f.url,'deploy',15);migrationRunner(f.url,'status',15);
 for(const table of tables.filter(t=>t!=='_prisma_migrations'))assert.deepEqual((await snapshot([table]))[table],before[table],table);
 const afterLedger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;assert.equal(afterLedger.length,15);assert.deepEqual(afterLedger.slice(0,14),ledger);
 for(const row of afterLedger)assert.equal(row.checksum,createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
 for(const table of ['clinic_scheduling_settings','availability_slots','availability_operations'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0);
 const all=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename),final=await snapshot(all);assert.equal(all.length,35);migrationRunner(f.url,'deploy',15);migrationRunner(f.url,'status',15);assert.deepEqual(await snapshot(all),final);
 console.log('I2S2_POPULATED_UPGRADE',JSON.stringify({from:14,to:15,oldDomainTables:31,newDomainTables:34,retainedRows:Object.values(before).reduce((n,v)=>n+v.length,0)-ledger.length,allOldRowsUnchanged:true,allHistoricalChecksumsUnchanged:true,fabricatedSettings:0,fabricatedSlots:0,repeatDeploy:'ZERO_WRITE'}));
 }finally{await relationships.close();await directory.close();await orgs.close();}
}));
