import {randomUUID} from 'node:crypto';
import {isolatedConsultations} from './consultations.mjs';
import {createPrescriptionPersistence,createDatabase} from '../../packages/db/dist/index.js';
import {createApp} from '../../apps/api/dist/app.js';
import {createPasswordVerifier} from '../../apps/api/dist/password.js';
export const medicationId='a3d10000-0000-4000-8000-000000000001';
export const prescriptionBody=(extra={})=>({items:[{medicationId,quantity:'10.125',unit:'tablets',instructions:'SYNTHETIC human-entered instructions'}],validFrom:'2026-01-01T00:00:00.000Z',validUntil:'2099-01-01T00:00:00.000Z',operationKey:randomUUID(),...extra});
export const prescriptionTables=['prescriptions','prescription_versions','prescription_items','prescription_version_items','prescription_operations','prescription_privacy_restrictions','medications','medication_versions','medication_operations','audit_logs'];
export const prescriptionCounts=async f=>Object.fromEntries(await Promise.all(prescriptionTables.map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
export const rxReject=(p,code='PRESCRIPTION_NOT_FOUND')=>import('node:assert/strict').then(({default:a})=>a.rejects(p,e=>e.code===code));
export async function isolatedPrescriptions(run,options={}) {return isolatedConsultations(async f=>{
 const prescriptions=createPrescriptionPersistence(f.url),db=createDatabase(f.url),app=await createApp(db,{config:f.config,store:f.auth,passwords:await createPasswordVerifier()},undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,prescriptions);
 try {await app.listen(0,'127.0.0.1');const base=await app.getUrl(),credentials=new Map();
 const login=async who=>{if(!credentials.has(who))credentials.set(who,await f.login(who));return credentials.get(who);};
 const request=async(path,options={})=>{const response=await fetch(base+'/api/v1'+path,{...options,signal:globalThis.AbortSignal.timeout(15000)}),raw=await response.text();return{response,raw,json:raw?JSON.parse(raw):null};};
 const write=async(path,body,who='clinician')=>request(path,{method:'POST',headers:{...await login(who),Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const read=async(path,who='patient',method='GET')=>request(path,{method,headers:await login(who)});
 const readyRx=async()=>f.open(await f.ready());
 const draft=(c,body=prescriptionBody(),actor=f.actors.clinician)=>prescriptions.execute('DRAFT',actor,{consultationId:c.id,...body});
 const command=(c,d,kind,extra={},actor=f.actors.clinician)=>prescriptions.execute(kind,actor,{consultationId:c.id,prescriptionId:d.data.id,operationKey:randomUUID(),...(kind==='PRIVACY'?{}:{expectedVersion:d.data.version}),...extra});
 const signed=async c=>command(c,await draft(c),'SIGN');
 await run({...f,prescriptions,rxRequest:request,write,read,rxLogin:login,readyRx,draft,command,signed});
 }finally{await app.close();await prescriptions.close();await db.close();}
 },options);}
