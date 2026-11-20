import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../support/directory.mjs';
import {createPatientEntryPersistence,createBloodPressureMeasurementPersistence} from '../../packages/db/dist/index.js';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';
async function overlap(f,pattern,first,second){
 const entered=signal(),release=signal();let once=false,a,b;
 const restore=observeApplicabilityQueries((q,next)=>{if(!once&&pattern.test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve(q.pid);await release.promise;return r;});}return next();});
 try{a=first();a.catch(()=>{});const blocker=await entered.promise;b=second();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,blocker);assert.notEqual(blocker,waiter);release.resolve();const results=await Promise.allSettled([a,b]);assert.ok(results.every(x=>x.status==='fulfilled'));console.log('I1S6_POSTGRES_RACE',JSON.stringify({lock:pattern.source,blockerPid:blocker,waiterPid:waiter,outcomes:['committed','committed']}));return results.map(r=>r.value);}
 finally{release.resolve();restore();await Promise.allSettled([a,b]);}
}
for(const domain of ['relationship-read','profile','membership','directory'])for(const changeFirst of [false,true])test(`I1S6 ${domain} and clinical relationship authority compose, changeFirst=${changeFirst}`,()=>isolatedDirectory(async f=>{
 const entry=createPatientEntryPersistence(f.url),bp=createBloodPressureMeasurementPersistence(f.url);
 try{
  const r=(await f.relationships.authorize(f.actors.patient,{providerId:f.provider.publicId,operationKey:randomUUID()})).request;
  const a=(await f.relationships.decide(f.actors.clinician,{requestId:r.id},'accept')).request.assignmentId;
  let change,read,changePattern,readPattern;
  if(domain==='relationship-read'){
   change=()=>f.relationships.end(f.actors.patient,{assignmentId:a});read=()=>f.relationships.read(f.actors.clinician,'relationships',a);
   changePattern=/UPDATE "public"\."clinician_patient_assignments"/;readPattern=/SELECT id FROM public\.sessions WHERE id=.*FOR UPDATE/;
  }else if(domain==='profile'){
   change=()=>entry.replaceOwnProfile(f.actors.patient,{displayName:'Synthetic composite profile',dateOfBirth:null,sex:null});read=()=>f.relationships.end(f.actors.clinician,{assignmentId:a});
   changePattern=/UPDATE "public"\."patient_profiles"/;readPattern=/UPDATE "public"\."clinician_patient_assignments"/;
  }else{
   change=domain==='membership'?()=>f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id}):()=>f.setProvider({isPublished:false});
   read=()=>bp.listBloodPressureMeasurements(f.actors.clinician,{patientId:f.users.patient.profileId,page:1,pageSize:20});
   changePattern=domain==='membership'?/UPDATE "public"\."organization_memberships"/:/UPDATE "public"\."clinician_directory"/;
   readPattern=/SELECT id FROM public\.clinician_patient_assignments WHERE clinician_id=.*FOR SHARE/;
  }
  const result=await overlap(f,changeFirst?changePattern:readPattern,changeFirst?change:read,changeFirst?read:change);
  if(domain==='relationship-read')assert.equal(result[changeFirst?1:0].data.status,changeFirst?'ENDED':'ACTIVE');
  if(['membership','directory'].includes(domain)){
   assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[a])).rows[0].status,'ACTIVE');assert.equal((await f.directory.listProviders({page:1,pageSize:20,specialty:null,clinic:null})).data.length,0);
  }else assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[a])).rows[0].status,'ENDED');
 }finally{await entry.close();await bp.close();}
},{relationships:true})) ;
test('I1S6 participant end audit failure preserves assignment, provenance, directory and M2 access atomically',()=>isolatedDirectory(async f=>{
 const r=(await f.relationships.authorize(f.actors.patient,{providerId:f.provider.publicId,operationKey:randomUUID()})).request;
 const a=(await f.relationships.decide(f.actors.clinician,{requestId:r.id},'accept')).request.assignmentId;
 const before=(await f.pool.query('SELECT * FROM audit_logs ORDER BY id')).rows;
 await f.pool.query("CREATE FUNCTION public.s6_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='CLINICIAN_PATIENT_RELATIONSHIP_ENDED' THEN RAISE EXCEPTION 'PRIVATE-S6-AUDIT-CANARY'; END IF; RETURN NEW; END $$; CREATE TRIGGER s6_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION public.s6_audit_failure()");
 await assert.rejects(f.relationships.end(f.actors.patient,{assignmentId:a}),e=>e.code==='RELATIONSHIP_UNAVAILABLE'&&!JSON.stringify(e).includes('PRIVATE-S6-AUDIT-CANARY'));
 assert.deepEqual((await f.pool.query('SELECT * FROM audit_logs ORDER BY id')).rows,before);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM assignment_end_provenance')).rows[0].n,0);
 assert.equal((await f.pool.query('SELECT status FROM clinician_patient_assignments WHERE id=$1',[a])).rows[0].status,'ACTIVE');
 assert.equal((await f.request('/directory/providers')).json.data.length,1);
 const headers=await f.login('clinician');assert.equal((await f.request(`/patients/${f.users.patient.profileId}/blood-pressure-measurements`,{headers})).response.status,200);
},{relationships:true}));
