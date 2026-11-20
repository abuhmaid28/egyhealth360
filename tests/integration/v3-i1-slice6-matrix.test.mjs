import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {isolatedCareActions,privacy} from '../support/care-actions.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';
import {createBloodPressureMeasurementPersistence,createPersistence,createAuthPersistence,createOrganizationPersistence,createDirectoryPersistence,createRelationshipPersistence,createPatientEntryPersistence,createAuthorizationPersistence} from '../../packages/db/dist/index.js';

test('I1S6 executable cross-slice matrix against populated M1/M2 resources and retained privacy',async t=>isolatedCareActions(async f=>{
 migrationRunner(f.url,'deploy',14);
 const identities=createPersistence(f.url),auth=createAuthPersistence(f.url),orgs=createOrganizationPersistence(f.url),directory=createDirectoryPersistence(f.url),relationships=createRelationshipPersistence(f.url),entry=createPatientEntryPersistence(f.url),profiles=createAuthorizationPersistence(f.url);
 const bp=createBloodPressureMeasurementPersistence(f.url);
 const stores=[bp,identities,auth,orgs,directory,relationships,entry,profiles];
 try{
  const admin=f.principals.admin,actors={...f.principals},memberships={};let pending;
  const hash=(await f.pool.query('SELECT password_hash FROM users WHERE id=$1',[admin.userId])).rows[0].password_hash;
  for(const [key,role] of [['published-member','CLINICIAN'],['lab','LAB_STAFF'],['pharmacy','PHARMACY_STAFF']]){
   const user=await identities.createUser({email:`${randomUUID()}@example.invalid`,passwordHash:hash,role,...(role==='CLINICIAN'?{profile:{displayName:'Synthetic matrix clinician',professionalIdentifier:'PRIVATE-S6-CANARY'}}:{})});
   actors[key]=await auth.createSession({userId:user.id,verifiedHash:hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});
   const org=(await orgs.createOrganization(admin,{kind:role==='CLINICIAN'?'CLINIC':role==='LAB_STAFF'?'LABORATORY':'PHARMACY',name:'Synthetic matrix organization',operationKey:randomUUID()})).organization;
   const membership=(await orgs.grantMembership(admin,{organizationId:org.id,userId:user.id,operationKey:randomUUID()})).membership;memberships[key]={organizationId:org.id,membershipId:membership.id};
   if(role==='CLINICIAN'){
    const s=(await directory.createSpecialty(admin,{key:'synthetic-matrix',displayName:'Synthetic matrix',operationKey:randomUUID()})).specialty;await directory.setSpecialty(admin,{specialtyId:s.id,displayName:s.displayName,isPublished:true,expectedVersion:0});
    const c=(await directory.createClinic(admin,{organizationId:org.id,displayName:'Synthetic matrix',city:'Synthetic',address:'Synthetic',operationKey:randomUUID()})).clinic;await directory.setClinic(admin,{clinicId:c.id,displayName:c.displayName,city:c.city,address:c.address,isPublished:true,expectedVersion:0});
    const p=(await directory.createProvider(admin,{clinicianId:user.profileId,specialtyId:s.id,displayName:'Synthetic matrix',operationKey:randomUUID()})).provider;await directory.publishAffiliation(admin,{providerId:p.id,membershipId:membership.id,operationKey:randomUUID()});await directory.setProvider(admin,{providerId:p.id,specialtyId:s.id,displayName:p.displayName,isPublished:true,expectedVersion:0});
    actors['clinic-member']=actors[key];
    const request=(await relationships.authorize(actors['patient-a'],{providerId:p.publicId,operationKey:randomUUID()})).request;
    actors['pending-request']=actors[key];
    // Test pending independently before accepting and ending the same exact historical pair.
    assert.equal((await profiles.readPatientProfileAccess(actors[key],{patientId:f.patientId})).profile,null);
    pending=request;
   }
  }
  const generated=await f.actions.generateInitialAction(f.actor,await f.command());
  await f.appointment();await f.encounter();
  const clinical={
   profile:async a=>{const r=await profiles.readPatientProfileAccess(a,{patientId:f.patientId});if(!r.profile)throw Object.assign(new Error('denied'),{code:'PROFILE_NOT_FOUND'});return r.profile;},
   BP:a=>bp.listBloodPressureMeasurements(a,{patientId:f.patientId,page:1,pageSize:20}),
   followup:a=>f.appointments.listFollowUpAppointments(a,{patientId:f.patientId,page:1,pageSize:20}),
   encounter:a=>f.encounters.listClinicalEncounters(a,{patientId:f.patientId,page:1,pageSize:20}),
   normalized:a=>f.normalized.getNormalizedPatientEvidence(a,{patientId:f.patientId,queryInterval:{startAt:'2020-01-01T00:00:00.000Z',endAt:'2099-01-01T00:00:00.000Z'},partition:{sourceType:'SYNTHETIC_BENCHMARK',sourceReference:'eh013-demo-v1'}}),
   applicability:a=>f.applicability.getObservedApplicabilitySnapshots(a,{patientId:f.patientId,effectiveAt:f.measuredAt}),
   CareAction:a=>f.actions.inspectAction(a,{patientId:f.patientId,actionId:generated.action.id}),
   CarePlan:a=>f.plans.inspectPlan(a,{patientId:f.patientId,planId:f.plan.id}),
  };
  const matrix=async(key,a,valid=true)=>{
   const before=(await f.pool.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n;
   const results={};
   for(const [resource,read] of Object.entries(clinical)){
    const allow=valid&&(key==='clinician-assigned'||key==='patient-a'&&resource!=='CarePlan');
    if(allow){await read(a);results[resource]='ALLOW';}else{await assert.rejects(read(a),e=>/NOT_FOUND|UNAUTHENTICATED$/.test(e.code));results[resource]='DENY';}
   }
   if(valid&&['patient-a','patient-b'].includes(key)){const own=await entry.readOwnProfile(a);assert.equal(own.id,f.identities[key].profileId);}else await assert.rejects(entry.readOwnProfile(a));
   if(valid&&memberships[key])await orgs.readMemberOrganization(a,memberships[key]);
   else await assert.rejects(orgs.readMemberOrganization(a,memberships.lab));
   if(valid&&['patient-a','patient-b','clinician-assigned','clinician-unassigned','published-member','clinic-member','pending-request','accepted-ended'].includes(key))await relationships.read(a,'relationships',null);else await assert.rejects(relationships.read(a,'relationships',null));
   assert.equal((await directory.listProviders({page:1,pageSize:20,specialty:null,clinic:null})).data.length,1);
   assert.equal((await f.pool.query('SELECT count(*)::int n FROM audit_logs')).rows[0].n,before);
   console.log('I1S6_MATRIX',JSON.stringify({actor:key,valid,resources:results,publicDirectory:'ALLOW_MINIMIZED',auditDelta:0}));
  };
  for(const [key,a] of Object.entries(actors))await t.test(key,()=>matrix(key,a));
  const accepted=await relationships.decide(actors['published-member'],{requestId:pending.id},'accept');
  await t.test('fresh-accepted',()=>matrix('clinician-assigned',actors['published-member']));
  await relationships.end(actors['patient-a'],{assignmentId:accepted.request.assignmentId});
  await t.test('accepted-ended',()=>matrix('accepted-ended',actors['published-member']));
  for(const state of ['disabled','revoked','expired']){
   const a=await auth.createSession({userId:actors.lab.userId,verifiedHash:hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});
   if(state==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[a.userId]);
   else if(state==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[a.sessionId]);
   else await f.pool.query("UPDATE sessions SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[a.sessionId]);
   await t.test(state,()=>matrix(state,a,false));
   if(state==='disabled')await f.pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1",[a.userId]);
  }
  await privacy(f);
  for(const a of [actors['patient-a'],actors['clinician-assigned']]){
   await assert.rejects(f.actions.inspectAction(a,{patientId:f.patientId,actionId:generated.action.id}),e=>e.code==='CARE_ACTION_NOT_FOUND');
   assert.equal((await f.actions.listActions(a,{patientId:f.patientId,page:1,pageSize:20})).total,0);
  }
  // Repeat deploy on populated final I1, including relationship/clinical history, is exactly zero-write.
  const snapshot=async()=>{const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;return Object.fromEntries(await Promise.all(tables.map(async({tablename})=>[tablename,(await f.pool.query(`SELECT to_jsonb(t)::text value FROM public.${tablename} t ORDER BY to_jsonb(t)::text`)).rows])));};
  const before=await snapshot();migrationRunner(f.url,'deploy',14);migrationRunner(f.url,'status',14);assert.deepEqual(await snapshot(),before);
  console.log('I1S6_POPULATED_FINAL',JSON.stringify({migrations:14,tables:Object.keys(before).length-1,relationshipHistory:true,clinicalHistory:true,repeatDeploy:'ZERO_WRITE'}));
 }finally{for(const s of stores)await s.close();}
}));
