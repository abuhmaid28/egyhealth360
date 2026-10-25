import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory as use,directoryAudits} from '../support/directory.mjs';
const page={page:1,pageSize:20,specialty:null,clinic:null};
const reject=(p,code='DIRECTORY_NOT_FOUND')=>assert.rejects(p,e=>e.code===code);

test('I1S4 current public provider projection is exact, anonymous and identical for every fixed role',()=>use(async f=>{
 const r=await f.request();assert.equal(r.response.status,200);assert.equal(r.response.headers.get('cache-control'),'no-store');assert.equal(r.response.headers.get('etag'),null);
 const data={id:f.provider.publicId,displayName:'Synthetic Doctor',specialty:{key:f.specialty.key,displayName:f.specialty.displayName},clinics:[{id:f.clinic.publicId,displayName:f.clinic.displayName,city:f.clinic.city,address:f.clinic.address}]};
 assert.deepEqual(r.json,{data:[data],meta:{page:1,pageSize:20,total:1}});
 for(const key of ['patient','clinician','lab','pharmacy','admin'])assert.deepEqual((await f.request(undefined,{headers:await f.login(key)})).json,r.json);
 assert.deepEqual((await f.request('/directory/providers/'+f.provider.publicId)).json,{data});
 const sessions=(await f.pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n;
 for(const headers of [{Cookie:'invalid=opaque'},{'X-User-Id':f.users.admin.id,'X-Role':'ADMIN'}]){const extra=await f.request(undefined,{headers});assert.deepEqual(extra.json,r.json);assert.equal(extra.response.headers.get('set-cookie'),null);}
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n,sessions);
 assert.deepEqual((await f.request('/directory/clinics')).json.data,data.clinics);
 assert.deepEqual((await f.request('/directory/specialties')).json.data,[data.specialty]);
 for(const privateValue of [f.users.clinician.id,f.users.clinician.profileId,f.membership.id,f.clinicOrg.id,f.provider.id,f.specialty.id,f.users.clinician.email])assert.ok(!r.raw.includes(privateValue),'private identity must not be public');
 assert.doesNotMatch(r.raw,/professionalIdentifier|password|email|userId|clinicianId|membershipId|operationKey|actor|session|csrf|patient|assignment|encounter|carePlan|audit/i);
}));

test('I1S4 deliberate unpublication, suspension, disable, catalog state and terminal membership revoke next reads; regrant never revives old publication',()=>use(async f=>{
 const detail=()=>f.request('/directory/providers/'+f.provider.publicId,{headers:{'If-None-Match':'*'}});
 await f.setProvider({isPublished:false});assert.equal((await detail()).response.status,404);await f.setProvider({isPublished:true});assert.equal((await detail()).response.status,200);
 await f.setClinic({isPublished:false});assert.equal((await detail()).response.status,404);await f.setClinic({isPublished:true});assert.equal((await detail()).response.status,200);
 await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});assert.equal((await detail()).response.status,404);
 await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'ACTIVE',expectedVersion:1});assert.equal((await detail()).response.status,200);
 await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.clinician.id]);assert.equal((await detail()).response.status,404);await f.pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1",[f.users.clinician.id]);
 await f.directory.setSpecialty(f.actors.admin,{specialtyId:f.specialty.id,displayName:f.specialty.displayName,isPublished:false,expectedVersion:1});assert.equal((await detail()).response.status,404);
 await f.directory.setSpecialty(f.actors.admin,{specialtyId:f.specialty.id,displayName:f.specialty.displayName,isPublished:true,expectedVersion:2});
 await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});assert.equal((await detail()).response.status,404);
 const fresh=(await f.grant(f.users.clinician,f.clinicOrg)).membership;assert.notEqual(fresh.id,f.membership.id);assert.equal((await detail()).response.status,404);
 await reject(f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()}));
 await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:fresh.id,operationKey:randomUUID()});assert.equal((await detail()).response.status,200);
 await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});assert.equal((await detail()).response.status,200);
}));

test('I1S4 managed current ADMIN only, creation fingerprints and CAS no-ops preserve exact audit',()=>use(async f=>{
 const input={key:'synthetic-second',displayName:'Synthetic Second',operationKey:randomUUID()},before=await directoryAudits(f.pool);
 for(const role of ['patient','clinician','lab','pharmacy'])await reject(f.directory.createSpecialty(f.actors[role],input));
 assert.deepEqual(await directoryAudits(f.pool),before);
 const first=await f.directory.createSpecialty(f.actors.admin,input);assert.equal(first.created,true);
 assert.equal((await f.directory.createSpecialty(f.actors.admin,input)).created,false);
 await reject(f.directory.createSpecialty(f.actors.admin,{...input,displayName:'Different'}),'DIRECTORY_CONFLICT');
 const next={specialtyId:first.specialty.id,displayName:'Renamed',isPublished:true,expectedVersion:0};
 assert.equal((await f.directory.setSpecialty(f.actors.admin,next)).changed,true);
 assert.equal((await f.directory.setSpecialty(f.actors.admin,next)).changed,false);
 assert.equal((await f.directory.createSpecialty(f.actors.admin,input)).created,false);
 assert.equal((await directoryAudits(f.pool)).length,before.length+2);
 const p={providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()};
 await reject(f.directory.publishAffiliation(f.actors.admin,p),'DIRECTORY_CONFLICT');
 assert.ok((await directoryAudits(f.pool)).every(a=>a.actor_user_id&&Object.keys(a.safe_metadata).length===0));
 const a=f.actors.admin;await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[a.sessionId]);
 await reject(f.directory.createSpecialty(a,{...input,operationKey:randomUUID()}),'DIRECTORY_UNAUTHENTICATED');
}));

test('I1S4 multi-clinic approved affiliations, exact filters and independently published states',()=>use(async f=>{
 const org=await f.org('CLINIC'),member=(await f.grant(f.users.clinician,org)).membership;
 const created=(await f.directory.createClinic(f.actors.admin,{organizationId:org.id,displayName:'Second Synthetic Clinic',city:'Second City',address:'Second Address',operationKey:randomUUID()})).clinic;
 assert.equal((await f.request()).json.data[0].clinics.length,1);
 const clinic=(await f.directory.setClinic(f.actors.admin,{clinicId:created.id,displayName:created.displayName,city:created.city,address:created.address,isPublished:true,expectedVersion:0})).clinic;
 const p=await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:member.id,operationKey:randomUUID()});
 assert.equal((await f.request()).json.data.length,1);assert.equal((await f.request()).json.data[0].clinics.length,2);
 assert.equal((await f.request('/directory/providers?clinic='+clinic.publicId)).json.data[0].clinics.length,1);
 assert.equal((await f.request('/directory/providers?specialty='+f.specialty.key)).json.meta.total,1);
 assert.equal((await f.request('/directory/providers?specialty=not-published')).json.meta.total,0);
 const before=await directoryAudits(f.pool);await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:p.publication.id});
 await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:p.publication.id});
 assert.equal((await directoryAudits(f.pool)).length,before.length+1);assert.equal((await f.request()).json.data[0].clinics.length,1);
 await reject(f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()}),'DIRECTORY_CONFLICT');
}));

test('I1S4 curated specialty changes withdraw old publications and never reuse legacy free text',()=>use(async f=>{
 await f.pool.query("UPDATE clinician_profiles SET specialty='Synthetic General',professional_identifier='PRIVATE_IDENTIFIER_CANARY' WHERE id=$1",[f.users.clinician.profileId]);
 const s=await f.directory.createSpecialty(f.actors.admin,{key:'synthetic-new',displayName:'Synthetic New',operationKey:randomUUID()});
 await f.directory.setSpecialty(f.actors.admin,{specialtyId:s.specialty.id,displayName:s.specialty.displayName,isPublished:true,expectedVersion:0});
 await f.setProvider({specialtyId:s.specialty.id,isPublished:false});assert.equal((await f.request()).json.meta.total,0);
 const history=(await f.pool.query('SELECT specialty_id,withdrawn_at FROM directory_affiliations WHERE id=$1',[f.publication.id])).rows[0];assert.equal(history.specialty_id,f.specialty.id);assert.ok(history.withdrawn_at);
 await reject(f.setProvider({isPublished:true}));
 await f.directory.publishAffiliation(f.actors.admin,{providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()});await f.setProvider({isPublished:true});
 assert.equal((await f.request()).json.data[0].specialty.key,s.specialty.key);
 assert.equal((await f.pool.query('SELECT specialty FROM clinician_profiles WHERE id=$1',[f.users.clinician.profileId])).rows[0].specialty,'Synthetic General');
 assert.doesNotMatch((await f.request()).raw,/PRIVATE_IDENTIFIER_CANARY/);
}));

test('I1S4 public HTTP strict queries, locators, cache/HEAD/method variants and generic absence',()=>use(async f=>{
 const before=await directoryAudits(f.pool);
 for(const path of ['/directory/providers?page=0','/directory/providers?page=01','/directory/providers?page=10001','/directory/providers?pageSize=101','/directory/providers?page=1&page=2','/directory/providers?role=ADMIN','/directory/providers?page=%31','/directory/providers?','/directory/specialties?clinic='+f.clinic.publicId])assert.equal((await f.request(path)).response.status,400,path);
 for(const id of ['not-valid',randomUUID(),f.users.clinician.profileId,f.provider.publicId.toUpperCase(),'%ZZ','%2f']){
  const r=await f.request('/directory/providers/'+id);assert.equal(r.response.status,404);assert.deepEqual(r.json,{error:{code:'DIRECTORY_NOT_FOUND',message:'Not found.'}});
 }
 for(const path of ['/DIRECTORY/PROVIDERS/','/directory/providers/'+f.provider.publicId+'/']){const r=await f.request(path,{method:'HEAD',headers:{'If-None-Match':'*','If-Modified-Since':new Date().toUTCString()}});assert.equal(r.response.status,200);assert.equal(r.raw,'');assert.equal(r.response.headers.get('etag'),null);}
 const r=await f.request('/directory/providers',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"role":"ADMIN"}'});assert.equal(r.response.status,405);assert.equal(r.response.headers.get('allow'),'GET, HEAD');
 assert.deepEqual(await directoryAudits(f.pool),before);
 assert.deepEqual(await f.directory.listProviders(page),(await f.request()).json);
}));

test('I1S4 public locators/publication create no relationship or clinical permission; ADMIN and staff stay denied',()=>use(async f=>{
 const before=(await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n;
 const path='/patients/'+f.users.patient.profileId+'/blood-pressure-measurements';
 for(const role of ['clinician','admin','lab','pharmacy']){const h=await f.login(role);assert.equal((await f.request(path,{headers:h})).response.status,404);assert.equal((await f.request(path,{method:'POST',headers:{...h,Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify({systolic:120,diastolic:80,unit:'mmHg',measuredAt:'2026-01-01T00:00:00Z'})})).response.status,404);}
 const patient=await f.login('patient');assert.equal((await f.request('/patients/'+f.provider.publicId+'/blood-pressure-measurements',{headers:patient})).response.status,404);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,before);
}));

test('I1S4 source creation and updates roll back on audit failure without partial publication',()=>use(async f=>{
 const before=await directoryAudits(f.pool);
 await f.pool.query("CREATE FUNCTION public.s4_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type IN ('specialty','clinic_directory','clinician_directory','directory_affiliation') THEN RAISE EXCEPTION 'PRIVATE_SQL_CANARY'; END IF; RETURN NEW; END $$; CREATE TRIGGER s4_fault BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.s4_fault()");
 const old=(await f.pool.query('SELECT * FROM specialties ORDER BY id')).rows;
 await reject(f.directory.createSpecialty(f.actors.admin,{key:'fault',displayName:'Fault',operationKey:randomUUID()}),'DIRECTORY_UNAVAILABLE');
 await reject(f.setProvider({isPublished:false}),'DIRECTORY_UNAVAILABLE');
 assert.deepEqual((await f.pool.query('SELECT * FROM specialties ORDER BY id')).rows,old);assert.deepEqual(await directoryAudits(f.pool),before);assert.equal((await f.request()).response.status,200);assert.equal((await f.request()).json.meta.total,1);
}));

test('I1S4 exact publication replay is historical/no-authority after end; changed payload cannot hijack its operation',()=>use(async f=>{
 await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});
 const command={providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()},first=await f.directory.publishAffiliation(f.actors.admin,command);
 await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});
 const before=await directoryAudits(f.pool),replay=await f.directory.publishAffiliation(f.actors.admin,command);assert.equal(replay.created,false);assert.equal(replay.publication.id,first.publication.id);assert.equal((await f.request()).json.meta.total,0);
 await reject(f.directory.publishAffiliation(f.actors.admin,{...command,membershipId:randomUUID()}),'DIRECTORY_CONFLICT');assert.deepEqual(await directoryAudits(f.pool),before);
}));

test('I1S4 directory and organization revocation never terminate an existing clinical assignment',()=>use(async f=>{
 await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.users.clinician.profileId,f.users.patient.profileId]);
 const rows=(await f.pool.query('SELECT * FROM clinician_patient_assignments ORDER BY id')).rows,h=await f.login('clinician'),path='/patients/'+f.users.patient.profileId+'/blood-pressure-measurements';
 assert.equal((await f.request(path,{headers:h})).response.status,200);
 await f.setProvider({isPublished:false});await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});await f.store.endMembership(f.actors.admin,{organizationId:f.clinicOrg.id,membershipId:f.membership.id});
 assert.equal((await f.request()).json.meta.total,0);assert.equal((await f.request(path,{headers:h})).response.status,200);assert.deepEqual((await f.pool.query('SELECT * FROM clinician_patient_assignments ORDER BY id')).rows,rows);
}));
