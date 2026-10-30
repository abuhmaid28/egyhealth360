import {randomUUID} from 'node:crypto';
import {isolatedConsultations} from './consultations.mjs';
import {createDocumentationPersistence,createDatabase} from '../../packages/db/dist/index.js';
import {createApp} from '../../apps/api/dist/app.js';
import {createPasswordVerifier} from '../../apps/api/dist/password.js';
export const documentTables=['consultation_documents','consultation_document_versions','consultation_document_operations','consultation_privacy_restrictions','audit_logs'];
export const documentCounts=async f=>Object.fromEntries(await Promise.all(documentTables.map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
export const draftBody=(kind='PATIENT_SUMMARY',extra={})=>({kind,content:kind==='PRIVATE_NOTE'?'PRIVATE_CANARY_SYNTHETIC':'Synthetic released summary',patientInstructions:kind==='PRIVATE_NOTE'?'':'Human instructions',complaint:'Human complaint',problems:['Human problem'],diagnoses:['Human diagnosis'],allergyReview:{state:'UNKNOWN',items:[]},operationKey:randomUUID(),...extra});
export const rejection=(p,code='DOCUMENT_NOT_FOUND')=>import('node:assert/strict').then(({default:a})=>a.rejects(p,e=>e.code===code));
export async function isolatedDocumentation(run,options={}){return isolatedConsultations(async f=>{
 const documentation=createDocumentationPersistence(f.url),db=createDatabase(f.url),app=await createApp(db,{config:f.config,store:f.auth,passwords:await createPasswordVerifier()},undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,documentation);
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl();
 const credentials=new Map();const login=async who=>{if(!credentials.has(who))credentials.set(who,await f.login(who));return credentials.get(who);};
 const request=async(path,options={})=>{const response=await fetch(base+'/api/v1'+path,{...options,signal:globalThis.AbortSignal.timeout(12000)}),raw=await response.text();return{response,raw,json:raw?JSON.parse(raw):null};};
 const write=async(path,body,who='clinician')=>request(path,{method:'POST',headers:{...await login(who),Origin:f.config.origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const read=async(path,who='patient',method='GET')=>request(path,{method,headers:await login(who)});
 const ready=async()=>f.open(await f.ready());
 const draft=(c,body=draftBody(),actor=f.actors.clinician)=>documentation.execute('DRAFT',actor,{consultationId:c.id,...body});
 const command=(c,d,kind,extra={},actor=f.actors.clinician)=>documentation.execute(kind,actor,{consultationId:c.id,documentId:d.data.id,operationKey:randomUUID(),...extra});
 await run({...f,documentation,documentRequest:request,write,read,readyDocument:ready,draft,command});
 }finally{await app.close();await documentation.close();await db.close();}
 },options);}
