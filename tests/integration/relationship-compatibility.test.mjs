import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedCareActions} from '../support/care-actions.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';
import {createOrganizationPersistence,createDirectoryPersistence,createRelationshipPersistence,createDemoPersistence} from '../../packages/db/dist/index.js';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';
async function foundation(f){
 const organizations=createOrganizationPersistence(f.url),directory=createDirectoryPersistence(f.url),admin=f.principals.admin;
 const org=(await organizations.createOrganization(admin,{kind:'CLINIC',name:'Synthetic compatibility',operationKey:randomUUID()})).organization;
 const ended=(await organizations.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;await organizations.endMembership(admin,{organizationId:org.id,membershipId:ended.id});
 const membership=(await organizations.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;
 let specialty=(await directory.createSpecialty(admin,{key:'synthetic-bilateral',displayName:'Synthetic Bilateral',operationKey:randomUUID()})).specialty;specialty=(await directory.setSpecialty(admin,{specialtyId:specialty.id,displayName:specialty.displayName,isPublished:true,expectedVersion:0})).specialty;
 const clinic=(await directory.createClinic(admin,{organizationId:org.id,displayName:'Synthetic Clinic',city:'Synthetic City',address:'Synthetic Address',operationKey:randomUUID()})).clinic;await directory.setClinic(admin,{clinicId:clinic.id,displayName:clinic.displayName,city:clinic.city,address:clinic.address,isPublished:true,expectedVersion:0});
 const provider=(await directory.createProvider(admin,{clinicianId:f.identities['clinician-assigned'].profileId,specialtyId:specialty.id,displayName:'Synthetic Clinician',operationKey:randomUUID()})).provider;
 await directory.publishAffiliation(admin,{providerId:provider.id,membershipId:membership.id,operationKey:randomUUID()});await directory.setProvider(admin,{providerId:provider.id,specialtyId:specialty.id,displayName:provider.displayName,isPublished:true,expectedVersion:0});
 return{provider,close:async()=>{await directory.close();await organizations.close();}};
}
test('I1S5 actual populated thirteen-to-fourteen upgrade preserves every M1/M2/directory row, fabricates zero requests/consent/end actors; repeat deploy/status',()=>isolatedCareActions(async f=>{
 await f.actions.generateInitialAction(f.actor,await f.command());migrationRunner(f.url,'deploy',13);const d=await foundation(f);
 try{
  const other=(await f.pool.query("INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2) RETURNING id",[f.identities['clinician-unassigned'].profileId,f.identities['patient-b'].profileId])).rows[0];await f.pool.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE id=$1",[other.id]);
  await f.pool.query("UPDATE clinician_profiles SET specialty='Legacy free text remains private' WHERE id=$1",[f.identities['clinician-unassigned'].profileId]);
  const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
  const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await f.pool.query(`SELECT * FROM public.${t} ORDER BY ${t==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)).rows])));
  const before=await snapshot();assert.equal(tables.length,30);migrationRunner(f.url,'deploy',14);migrationRunner(f.url,'status',14);
  const after=await snapshot();for(const t of tables)if(t!=='_prisma_migrations')assert.deepEqual(after[t],before[t],t);else{assert.equal(after[t].length,14);assert.deepEqual(after[t].filter(x=>before[t].some(y=>y.id===x.id)),before[t]);for(const r of after[t])assert.equal(r.checksum,createHash('sha256').update(await readFile('packages/db/prisma/migrations/'+r.migration_name+'/migration.sql')).digest('hex'));}
  for(const t of ['relationship_requests','assignment_end_provenance'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n,0);
  const ledger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;migrationRunner(f.url,'deploy',14);migrationRunner(f.url,'status',14);assert.deepEqual((await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,ledger);
  console.log('I1S5_POPULATED_UPGRADE',JSON.stringify({from:13,to:14,retainedTables:29,legacyActiveEnded:true,m1AssignmentUnchanged:true,careActionAssignmentReferenceUnchanged:true,directoryAndMembershipHistoryUnchanged:true,fabricatedRequests:0,fabricatedEndActors:0,repeatDeployStatus:'PASS'}));
 }finally{await d.close();}
}));
async function overlap(f,pattern,first,second,check){
 const entered=signal(),release=signal();let once=false,a,b;const restore=observeApplicabilityQueries((q,next)=>{if(!once&&pattern.test(q.text)){once=true;return Promise.resolve(next()).then(async result=>{entered.resolve(q.pid);await release.promise;return result;});}return next();});
 try{a=first();a.catch(()=>{});const blocker=await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();const results=await Promise.allSettled([a,b]);await check(results);console.log('I1S5_COMPATIBILITY_OVERLAP',JSON.stringify({lock:pattern.source,blockerPid:blocker,waiterPid:waiter,outcomes:results.map(r=>r.status==='fulfilled'?'committed':r.reason.code)}));}finally{release.resolve();restore();await Promise.allSettled([a,b]);}
}
for(const endFirst of [true,false])test(`I1S5 exact assignment end overlaps M2 INITIAL generation, ${endFirst?'end':'clinical'} first`,()=>isolatedCareActions(async f=>{
 migrationRunner(f.url,'deploy',14);const relationships=createRelationshipPersistence(f.url),command=await f.command();
 const end=()=>relationships.end(f.principals['patient-a'],{assignmentId:f.assignmentId}),generate=()=>f.actions.generateInitialAction(f.actor,command);
 try{await overlap(f,endFirst?/UPDATE "public"\."clinician_patient_assignments"/:/INSERT INTO public.care_action_decisions/,endFirst?end:generate,endFirst?generate:end,async r=>{assert.equal(r[0].status,'fulfilled');if(endFirst)assert.equal(r[1].reason.code,'CARE_ACTION_NOT_FOUND');else assert.equal(r[1].status,'fulfilled');});assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[f.assignmentId])).rows[0].status,'ENDED');assert.equal((await f.pool.query('SELECT count(*)::int n FROM care_actions')).rows[0].n,endFirst?0:1);}finally{await relationships.close();}
}));
for(const seedFirst of [true,false])test(`I1S5 genuine M1 seed table-lock overlap with legacy bilateral confirmation, ${seedFirst?'seed':'accept'} first`,()=>isolatedCareActions(async f=>{
 migrationRunner(f.url,'deploy',14);const relationships=createRelationshipPersistence(f.url),demo=createDemoPersistence(f.url);
 try{
  const r=(await relationships.authorize(f.principals['patient-a'],{assignmentId:f.assignmentId,operationKey:randomUUID()})).request;
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_directory')).rows[0].n,0);
  const assignment=(await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[f.assignmentId])).rows[0];
  // Existing hashes are verified synthetically by the established test-local callback;
  // no credential/identity/fixture changes. Real seed takes its existing table locks.
  const seed=()=>demo.seedIdentities({newPasswordHashes:{},acceptsExistingHash:async()=>true});
  const accept=()=>relationships.decide(f.actor,{requestId:r.id},'accept');
  const pattern=seedFirst?/LOCK TABLE users, patient_profiles, clinician_profiles, clinician_patient_assignments IN SHARE ROW EXCLUSIVE MODE/:/UPDATE "public"\."relationship_requests"/;
  await overlap(f,pattern,seedFirst?seed:accept,seedFirst?accept:seed,async results=>{assert.ok(results.every(r=>r.status==='fulfilled'));assert.equal(results[seedFirst?1:0].value.request.assignmentId,f.assignmentId);assert.deepEqual(results[seedFirst?0:1].value.created,{users:0,profiles:0,assignments:0});});
  assert.deepEqual((await f.pool.query('SELECT * FROM clinician_patient_assignments WHERE id=$1',[f.assignmentId])).rows[0],assignment);
 }finally{await relationships.close();await demo.close();}
}));
