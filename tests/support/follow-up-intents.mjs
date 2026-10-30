import {randomUUID} from 'node:crypto';
import {isolatedConsultations} from './consultations.mjs';
import {createFollowUpIntentPersistence,createDocumentationPersistence,createFollowUpAppointmentPersistence,createClinicalEncounterPersistence,createDatabase} from '../../packages/db/dist/index.js';
import {createApp} from '../../apps/api/dist/app.js';
import {createPasswordVerifier} from '../../apps/api/dist/password.js';
export const intentTables=['follow_up_intents','follow_up_intent_versions','follow_up_intent_operations','follow_up_intent_booking_links','follow_up_intent_privacy_restrictions'];
export const intentCounts=async f=>Object.fromEntries(await Promise.all([...intentTables,'audit_logs','follow_up_appointments','bookings','care_actions'].map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
export const intentBody=(extra={})=>({instruction:'Explicit human synthetic follow-up instruction',desiredWindow:null,operationKey:randomUUID(),...extra});
export const intentReject=(p,code='FOLLOW_UP_INTENT_NOT_FOUND')=>import('node:assert/strict').then(({default:a})=>a.rejects(p,e=>e.code===code));
export async function isolatedIntents(run,options={}) {return isolatedConsultations(async f=>{
 const intents=createFollowUpIntentPersistence(f.url),documentation=createDocumentationPersistence(f.url),appointments=createFollowUpAppointmentPersistence(f.url),encounters=createClinicalEncounterPersistence(f.url),db=createDatabase(f.url);
 const app=await createApp(db,{config:f.config,store:f.auth,passwords:await createPasswordVerifier()},undefined,undefined,{appointments,encounters},undefined,undefined,undefined,undefined,undefined,undefined,documentation,intents);
 try {await app.listen(0,'127.0.0.1');const base=await app.getUrl(),credentials=new Map();
 const login=async who=>{if(!credentials.has(who))credentials.set(who,await f.login(who));return credentials.get(who);};
 const request=async(path,options={})=>{const response=await fetch(base+'/api/v1'+path,{...options,signal:globalThis.AbortSignal.timeout(15000)}),raw=await response.text();return{response,raw,json:raw?JSON.parse(raw):null};};
 const write=async(path,body,who='clinician')=>request(path,{method:'POST',headers:{...await login(who),Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const read=async(path,who='patient',method='GET')=>request(path,{method,headers:await login(who)});
 const readyIntent=async()=>f.open(await f.ready());
 const draft=(c,body=intentBody(),actor=f.actors.clinician)=>intents.execute('DRAFT',actor,{consultationId:c.id,...body});
 const command=(c,d,kind,extra={},actor=f.actors.clinician)=>intents.execute(kind,actor,{consultationId:c.id,intentId:d.data.id,operationKey:randomUUID(),...extra});
 const released=async c=>{const d=await draft(c);return command(c,d,'RELEASE',{expectedVersion:1});};
 await run({...f,intents,documentation,appointments,encounters,intentRequest:request,write,read,intentLogin:login,readyIntent,draft,command,released});
 } finally {await app.close();await intents.close();await documentation.close();await appointments.close();await encounters.close();await db.close();}
 },options);}
