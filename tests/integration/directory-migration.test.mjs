import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedCareActions} from '../support/care-actions.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';
import {createOrganizationPersistence} from '../../packages/db/dist/index.js';

test('I1S4 real populated twelve-to-thirteen runner retains complete M1/M2/organization/session/legacy rows and fabricates zero publication or specialty',()=>isolatedCareActions(async f=>{
 await f.actions.generateInitialAction(f.actor,await f.command());migrationRunner(f.url,'deploy',12);
 const store=createOrganizationPersistence(f.url);
 try{
  const admin=f.principals.admin,org=(await store.createOrganization(admin,{kind:'CLINIC',name:'Synthetic retained clinic',operationKey:randomUUID()})).organization;
  const old=(await store.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;
  await store.endMembership(admin,{organizationId:org.id,membershipId:old.id});await store.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()});
  const legacyUser=(await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,'synthetic-legacy-upgrade-only','CLINICIAN') RETURNING id",[randomUUID()+'@example.invalid'])).rows[0];
  await f.pool.query("INSERT INTO clinician_profiles(user_id,display_name,specialty,professional_identifier) VALUES($1,'Synthetic retained legacy clinician','Synthetic General','PRIVATE_LEGACY_UPGRADE_ONLY')",[legacyUser.id]);
  const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
  const rows=await Promise.all(tables.map(t=>f.pool.query(`SELECT * FROM public.${t} ORDER BY ${t==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)));
  assert.equal(tables.length,26);assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_profiles WHERE specialty IS NOT NULL')).rows[0].n,1);
  migrationRunner(f.url,'deploy',13);migrationRunner(f.url,'status',13);
  for(let i=0;i<tables.length;i++){
   const actual=(await f.pool.query(`SELECT * FROM public.${tables[i]} ORDER BY ${tables[i]==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)).rows;
   if(tables[i]==='_prisma_migrations'){assert.equal(actual.length,13);assert.deepEqual(actual.filter(x=>rows[i].rows.some(y=>y.id===x.id)),rows[i].rows);for(const row of actual)assert.equal(row.checksum,createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));}
   else assert.deepEqual(actual,rows[i].rows,tables[i]);
  }
  for(const t of ['specialties','clinic_directory','clinician_directory','directory_affiliations'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n,0);
  const ledger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
  migrationRunner(f.url,'deploy',13);migrationRunner(f.url,'status',13);assert.deepEqual((await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,ledger);
  console.log('I1S4_POPULATED_UPGRADE',JSON.stringify({from:12,to:13,retainedTables:25,retainedAssignments:true,retainedInitialAction:true,retainedEndedAndActiveMemberships:true,legacySpecialtyUntouched:true,newRows:0,repeatDeployStatus:'PASS'}));
 }finally{await store.close();}
}));

// Preserve the existing M2 lock graph by actually overlapping both domains.
import {createDirectoryPersistence} from '../../packages/db/dist/index.js';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';
for(const directoryFirst of [true,false])test(`I1S4 directory approval overlaps existing M2 INITIAL generation, ${directoryFirst?'directory':'clinical'} first`,()=>isolatedCareActions(async f=>{
 migrationRunner(f.url,'deploy',13);const store=createOrganizationPersistence(f.url),directory=createDirectoryPersistence(f.url),admin=f.principals.admin;
 try{
  const org=(await store.createOrganization(admin,{kind:'CLINIC',name:'Synthetic overlap',operationKey:randomUUID()})).organization,m=(await store.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;
  let s=(await directory.createSpecialty(admin,{key:'synthetic-overlap',displayName:'Synthetic Overlap',operationKey:randomUUID()})).specialty;s=(await directory.setSpecialty(admin,{specialtyId:s.id,displayName:s.displayName,isPublished:true,expectedVersion:0})).specialty;
  const c=(await directory.createClinic(admin,{organizationId:org.id,displayName:'Synthetic Overlap',city:'Synthetic City',address:'Synthetic Address',operationKey:randomUUID()})).clinic;await directory.setClinic(admin,{clinicId:c.id,displayName:c.displayName,city:c.city,address:c.address,isPublished:true,expectedVersion:0});
  const p=(await directory.createProvider(admin,{clinicianId:f.identities['clinician-assigned'].profileId,specialtyId:s.id,displayName:'Synthetic Overlap',operationKey:randomUUID()})).provider,command=await f.command();
  const entered=signal(),release=signal();let once=false,a,b;
  const restore=observeApplicabilityQueries((q,next)=>{if(!once&&(directoryFirst?/INSERT INTO "public"\."directory_affiliations"/:/INSERT INTO public.care_action_decisions/).test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve(q.pid);await release.promise;return r;});}return next();});
  const publish=()=>directory.publishAffiliation(admin,{providerId:p.id,membershipId:m.id,operationKey:randomUUID()}),generate=()=>f.actions.generateInitialAction(f.actor,command);
  try{a=directoryFirst?publish():generate();a.catch(()=>{});const blocker=await entered.promise;b=directoryFirst?generate():publish();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);assert.notEqual(waiter,blocker);release.resolve();const results=await Promise.all([a,b]);assert.equal(results[directoryFirst?1:0].created,true);assert.equal((await f.pool.query('SELECT count(*)::int n FROM care_actions')).rows[0].n,1);assert.equal((await f.pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type LIKE 'CARE_ACTION_%'")).rows[0].n,2);console.log('I1S4_POSTGRES_M2_OVERLAP',JSON.stringify({directoryFirst,blockerPid:blocker,waiterPid:waiter,actions:1,clinicalAudits:2}));}
  finally{release.resolve();restore();await Promise.allSettled([a,b]);}
 }finally{await directory.close();await store.close();}
}));
