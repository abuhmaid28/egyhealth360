import {randomUUID} from 'node:crypto';
import {isolatedOrganizations} from './organizations.mjs';
import {createRelationshipPersistence,createDirectoryPersistence,createDatabase,createAuthorizationPersistence,createBloodPressureMeasurementPersistence} from '../../packages/db/dist/index.js';
import {createApp} from '../../apps/api/dist/app.js';
import {createPasswordVerifier} from '../../apps/api/dist/password.js';
import {authConfiguration} from '../../packages/config/dist/index.js';
export const directoryAudits=async pool=>(await pool.query("SELECT action_type,entity_type,entity_id,actor_user_id,safe_metadata FROM audit_logs WHERE entity_type IN ('specialty','clinic_directory','clinician_directory','directory_affiliation') ORDER BY timestamp,id")).rows;
export async function isolatedDirectory(run,{relationships=false}={}){return isolatedOrganizations(async f=>{
 const directory=createDirectoryPersistence(f.url),database=createDatabase(f.url),authorization=createAuthorizationPersistence(f.url),bp=createBloodPressureMeasurementPersistence(f.url);
 const config=authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'});
 const relationshipStore=relationships?createRelationshipPersistence(f.url):undefined;
 const app=await createApp(database,{config,store:f.auth,passwords:await createPasswordVerifier()},authorization,bp,undefined,undefined,directory,relationshipStore);
 try{
  const admin=f.actors.admin;
  let specialty=(await directory.createSpecialty(admin,{key:'synthetic-general',displayName:'Synthetic General',operationKey:randomUUID()})).specialty;
  specialty=(await directory.setSpecialty(admin,{specialtyId:specialty.id,displayName:specialty.displayName,isPublished:true,expectedVersion:specialty.version})).specialty;
  const clinicOrg=await f.org('CLINIC');const membership=(await f.grant(f.users.clinician,clinicOrg)).membership;
  let clinic=(await directory.createClinic(admin,{organizationId:clinicOrg.id,displayName:'Synthetic Clinic',city:'Synthetic City',address:'Synthetic demo address',operationKey:randomUUID()})).clinic;
  const setClinic=async(fields={})=>{clinic=(await directory.setClinic(admin,{clinicId:clinic.id,displayName:clinic.displayName,city:clinic.city,address:clinic.address,isPublished:clinic.isPublished,expectedVersion:clinic.version,...fields})).clinic;return clinic;};
  await setClinic({isPublished:true});
  let provider=(await directory.createProvider(admin,{clinicianId:f.users.clinician.profileId,specialtyId:specialty.id,displayName:'Synthetic Doctor',operationKey:randomUUID()})).provider;
  const publication=(await directory.publishAffiliation(admin,{providerId:provider.id,membershipId:membership.id,operationKey:randomUUID()})).publication;
  const setProvider=async(fields={})=>{provider=(await directory.setProvider(admin,{providerId:provider.id,specialtyId:provider.specialtyId,displayName:provider.displayName,isPublished:provider.isPublished,expectedVersion:provider.version,...fields})).provider;return provider;};
  await setProvider({isPublished:true});
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  const request=async(path='/directory/providers',options={})=>{const response=await fetch(base+'/api/v1'+path,{...options,signal:globalThis.AbortSignal.timeout(8000)});const raw=await response.text();return{response,raw,json:raw?JSON.parse(raw):null};};
  const login=async(key)=>{const r=await request('/auth/login',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:f.users[key].email,password:f.password})});if(r.response.status!==200)throw new Error('Synthetic login failed');return{Cookie:r.response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':r.json.data.csrfToken};};
  await run({...f,relationships:relationshipStore,directory,request,login,config,specialty,clinic,clinicOrg,membership,provider,publication,setClinic,setProvider});
 }finally{await app.close();if(relationshipStore)await relationshipStore.close();await directory.close();await authorization.close();await bp.close();await database.close();}
});}
