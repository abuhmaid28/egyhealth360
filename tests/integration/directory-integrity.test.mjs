import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {request as rawRequest} from 'node:http';
import {isolatedDirectory as use,directoryAudits} from '../support/directory.mjs';
const reject=(p,code='DIRECTORY_INVALID')=>assert.rejects(p,e=>e.code===code);

test('I1S4 exact new index inventory and composite relational security cannot be bypassed by raw SQL',()=>use(async f=>{
 const indexes=(await f.pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('specialties','clinic_directory','clinician_directory','directory_affiliations') ORDER BY indexname")).rows.map(x=>x.indexname);
 assert.deepEqual(indexes,['specialties_pkey','directory_specialty_public_key','specialties_operation_key','clinic_directory_pkey','directory_clinic_public_key','directory_clinic_organization_key','directory_clinic_org_kind_key','clinic_directory_operation_key','clinician_directory_pkey','directory_provider_public_key','directory_provider_clinician_key','directory_provider_profile_key','directory_provider_user_key','clinician_directory_operation_key','directory_provider_specialty_idx','directory_clinic_published_idx','directory_specialty_published_idx','directory_affiliations_pkey','directory_affiliation_operation_key','directory_affiliation_active_key','directory_affiliation_clinic_idx'].sort());
 const attempt=async(sql,values)=>{const c=await f.pool.connect();try{await c.query('BEGIN');await assert.rejects(c.query(sql,values),e=>['23503','23505','23514'].includes(e.code));}finally{await c.query('ROLLBACK');c.release();}};
 for(const [table,column,value] of [['specialties','key','mutated-key'],['clinic_directory','public_id',randomUUID()],['clinician_directory','clinician_user_id',f.users.patient.id],['directory_affiliations','membership_id',f.membership.id]]){
  const id=table==='specialties'?f.specialty.id:table==='clinic_directory'?f.clinic.id:table==='clinician_directory'?f.provider.id:f.publication.id;
  if(table==='directory_affiliations')await attempt('UPDATE directory_affiliations SET clinician_user_id=$2 WHERE id=$1',[id,f.users.lab.id]);
  else await attempt(`UPDATE public.${table} SET ${column}=$2 WHERE id=$1`,[id,value]);
 }
 await attempt('INSERT INTO directory_affiliations(provider_id,clinician_user_id,membership_id,organization_id,specialty_id,published_by_user_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7)',[f.provider.id,f.users.clinician.id,f.membership.id,f.clinicOrg.id,f.specialty.id,f.users.admin.id,randomUUID()]);
 await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});
 await attempt('UPDATE directory_affiliations SET withdrawn_at=NULL,withdrawn_by_user_id=NULL WHERE id=$1',[f.publication.id]);
 for(const table of ['specialties','clinic_directory','clinician_directory','directory_affiliations'])for(const sql of [`DELETE FROM public.${table}`,`TRUNCATE public.${table} CASCADE`])await attempt(sql,[]);
 const labOrg=f.organization;
 await attempt('INSERT INTO clinic_directory(organization_id,display_name,city,address,created_by_user_id,changed_by_user_id,operation_key,creation_fingerprint) VALUES($1,\'X\',\'X\',\'X\',$2,$2,$3,$4)',[labOrg.id,f.users.admin.id,randomUUID(),'a'.repeat(64)]);
 await attempt('INSERT INTO specialties(key,display_name,created_by_user_id,changed_by_user_id,operation_key,creation_fingerprint,admin_role) VALUES(\'invalid\',\'X\',$1,$1,$2,$3,\'CLINICIAN\')',[f.users.clinician.id,randomUUID(),'a'.repeat(64)]);
}));

test('I1S4 durable SQL lookups cannot be replaced by TEMP shadow tables',()=>use(async f=>{
 await f.directory.withdrawAffiliation(f.actors.admin,{providerId:f.provider.id,publicationId:f.publication.id});
 await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});
 const c=await f.pool.connect();try{await c.query('BEGIN');
  for(const name of ['users','specialties','organizations','organization_memberships','clinic_directory','clinician_directory'])await c.query(`CREATE TEMP TABLE ${name} AS TABLE public.${name}`);
  await c.query("UPDATE pg_temp.organizations SET status='ACTIVE'");
  await assert.rejects(c.query('INSERT INTO public.directory_affiliations(provider_id,clinician_user_id,membership_id,organization_id,specialty_id,published_by_user_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7)',[f.provider.id,f.users.clinician.id,f.membership.id,f.clinicOrg.id,f.specialty.id,f.users.admin.id,randomUUID()]),e=>e.code==='23514');
 }finally{await c.query('ROLLBACK');c.release();}
}));

test('I1S4 primitive snapshots, strict inputs and current ADMIN/session checks fail closed',()=>use(async f=>{
 const input={key:'snapshot-copy',displayName:'Original',operationKey:randomUUID()},pending=f.directory.createSpecialty(f.actors.admin,input);input.key='mutated';input.displayName='Mutated';const result=await pending;assert.equal(result.specialty.key,'snapshot-copy');assert.equal(result.specialty.displayName,'Original');
 const base={key:'reject',displayName:'Reject',operationKey:randomUUID()};
 for(const bad of [{...base,role:'ADMIN'},{...base,actor:f.users.admin.id},{...base,displayName:'x\u0000'},{...base,[Symbol('authority')]:1},Object.defineProperty({...base},'displayName',{get(){throw Error('Getter ran');}})])await reject(f.directory.createSpecialty(f.actors.admin,bad));
 const operations=a=>[()=>f.directory.setSpecialty(a,{specialtyId:f.specialty.id,displayName:'Changed',isPublished:false,expectedVersion:1}),()=>f.directory.createClinic(a,{organizationId:f.clinicOrg.id,displayName:'X',city:'X',address:'X',operationKey:randomUUID()}),()=>f.directory.setClinic(a,{clinicId:f.clinic.id,displayName:'X',city:'X',address:'X',isPublished:false,expectedVersion:f.clinic.version}),()=>f.directory.createProvider(a,{clinicianId:f.users.clinician.profileId,specialtyId:f.specialty.id,displayName:'X',operationKey:randomUUID()}),()=>f.directory.setProvider(a,{providerId:f.provider.id,specialtyId:f.specialty.id,displayName:'X',isPublished:false,expectedVersion:f.provider.version}),()=>f.directory.publishAffiliation(a,{providerId:f.provider.id,membershipId:f.membership.id,operationKey:randomUUID()}),()=>f.directory.withdrawAffiliation(a,{providerId:f.provider.id,publicationId:f.publication.id}),()=>f.directory.inspect(a,{kind:'provider',id:f.provider.id})];
 const before=await directoryAudits(f.pool);
 for(const role of ['patient','clinician','lab','pharmacy'])for(const op of operations(f.actors[role]))await reject(op(),'DIRECTORY_NOT_FOUND');
 for(const change of ['disable','expiry','revocation']){
  if(change==='disable')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.admin.id]);
  if(change==='expiry'){await f.pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1",[f.users.admin.id]);await f.pool.query("UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[f.actors.admin.sessionId]);}
  if(change==='revocation')await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 hour',revoked_at=clock_timestamp() WHERE id=$1",[f.actors.admin.sessionId]);
  for(const op of operations(f.actors.admin))await reject(op(),'DIRECTORY_UNAUTHENTICATED');
 }
 assert.deepEqual(await directoryAudits(f.pool),before);
}));

test('I1S4 actual database failure is sanitized on every public route without table/SQL/connection leakage',()=>use(async f=>{
 await f.pool.query('ALTER TABLE public.specialties RENAME TO directory_private_failure_canary');
 try{for(const path of ['/directory/providers','/directory/specialties','/directory/providers/'+f.provider.publicId]){
  const r=await f.request(path);assert.equal(r.response.status,503);assert.deepEqual(r.json,{error:{code:'DIRECTORY_UNAVAILABLE',message:'Service unavailable.'}});assert.doesNotMatch(r.raw,/canary|specialties|SELECT|Prisma|postgres|uuid|stack/i);
 }}finally{await f.pool.query('ALTER TABLE public.directory_private_failure_canary RENAME TO specialties');}
}));

test('I1S4 deterministic pagination separates multiple providers and rejects oversized headers/body safely',()=>use(async f=>{
 const clinician=await f.identities.createUser({email:randomUUID()+'@example.invalid',passwordHash:f.hash,role:'CLINICIAN',profile:{displayName:'Other Synthetic'}});
 const m=(await f.grant(clinician,f.clinicOrg)).membership,p=(await f.directory.createProvider(f.actors.admin,{clinicianId:clinician.profileId,specialtyId:f.specialty.id,displayName:'Other Synthetic',operationKey:randomUUID()})).provider;
 await f.directory.publishAffiliation(f.actors.admin,{providerId:p.id,membershipId:m.id,operationKey:randomUUID()});await f.directory.setProvider(f.actors.admin,{providerId:p.id,specialtyId:p.specialtyId,displayName:p.displayName,isPublished:true,expectedVersion:0});
 const a=(await f.request('/directory/providers?page=1&pageSize=1')).json,b=(await f.request('/directory/providers?page=2&pageSize=1')).json;assert.equal(a.meta.total,2);assert.equal(b.meta.total,2);assert.deepEqual([...a.data,...b.data].map(x=>x.id),[p.publicId,f.provider.publicId].sort());assert.equal((await f.request('/directory/providers?page=3&pageSize=1')).json.data.length,0);
 const big=await f.request('/directory/providers',{headers:{'X-Bounded':'x'.repeat(8200)}});assert.equal(big.response.status,400);assert.deepEqual(big.json,{error:{code:'REQUEST_INVALID',message:'Invalid request.'}});
 const raw=await new Promise((resolve,reject)=>{const req=rawRequest(big.response.url,{method:'GET',headers:{'Content-Type':'application/json','Content-Length':'2'}},res=>{let body='';res.setEncoding('utf8');res.on('data',part=>{body+=part;});res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.setTimeout(3000,()=>req.destroy(Error('Bounded HTTP timeout')));req.end('{}');});
 assert.equal(raw.status,400);assert.deepEqual(JSON.parse(raw.body),{error:{code:'REQUEST_INVALID',message:'Invalid request.'}});
}));
