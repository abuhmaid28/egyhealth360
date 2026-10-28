import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from './directory.mjs';
export const reject=(p,code)=>import('node:assert/strict').then(({default:a})=>a.rejects(p,e=>e.code===code));
export const availabilityAudits=async pool=>(await pool.query("SELECT * FROM audit_logs WHERE action_type LIKE 'AVAILABILITY_%' OR action_type LIKE 'CLINIC_SCHEDULING_%' ORDER BY id")).rows;
export async function isolatedAvailability(run,{realRunner=false}={}){return isolatedDirectory(async f=>{
 const settings={organizationId:f.clinicOrg.id,expectedVersion:0,timeZone:'UTC',durationMinutes:30,minimumBookingLead:0,publicationHorizonDays:30};
 await f.availability.setConfiguration(f.actors.admin,settings);
 const now=(await f.pool.query('SELECT clock_timestamp() now')).rows[0].now;
 const start=new Date(Math.ceil(now.getTime()/3600000)*3600000+86400000);
 const input=(offset=0,extra={})=>({clinicId:f.clinic.publicId,startAt:new Date(start.getTime()+offset*60000).toISOString(),endAt:new Date(start.getTime()+(offset+30)*60000).toISOString(),operationKey:randomUUID(),...extra});
 const publish=(offset=0,extra={},actor=f.actors.clinician)=>f.availability.publish(actor,input(offset,extra));
 const path='/directory/providers/'+f.provider.publicId+'/availability';
 const http=async(offset=0,extra={})=>f.request('/me/availability',{method:'POST',headers:{...await f.login('clinician'),Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(input(offset,extra))});
 await run({...f,settings,start,input,publish,path,http});
 },{availability:true,realRunner});}
