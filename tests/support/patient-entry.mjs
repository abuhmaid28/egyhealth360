import { isolatedOrganizations } from './organizations.mjs';
import { createPatientEntryPersistence, createDatabase } from '../../packages/db/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';
import { patientEntryRuntime } from '../../apps/api/dist/patient-entry.js';
import { createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';

export const profile = { displayName:'Synthetic Updated',dateOfBirth:'2000-02-29',sex:'opaque' };
export const entryAudits = async pool => (await pool.query("SELECT * FROM audit_logs WHERE action_type IN ('PATIENT_SELF_REGISTERED','PATIENT_PROFILE_UPDATED') ORDER BY timestamp,id")).rows;
export async function isolatedPatientEntry(run) {
 return isolatedOrganizations(async f=>{
  const entry=createPatientEntryPersistence(f.url),database=createDatabase(f.url);
  const runtime=patientEntryRuntime(entry);
  const config=authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'});
  const authRuntime={config,store:f.auth,passwords:await createPasswordVerifier()};
  const app=await createApp(database,authRuntime,undefined,undefined,undefined,runtime);
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  const send=async(path,options={})=>{
   const response=await fetch(base+'/api/v1'+path,options);
   return {response,body:response.status===204||options.method==='HEAD'?null:await response.json()};
  };
  const login=async(email,password=f.password)=>{
   const r=await send('/auth/login',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email,password})});
   return {...r,cookie:r.response.headers.get('set-cookie')?.split(';')[0],csrf:r.body?.data?.csrfToken};
  };
  const register=(input,headers={})=>send('/auth/register',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','X-EH-Register':'1',...headers},body:typeof input==='string'?input:JSON.stringify(input)});
  try {await run({...f,entry,runtime,app,base,send,login,register,config});}
  finally {await app.close();await entry.close();await database.close();}
 });
}
