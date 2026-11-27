/** Experimental only. Mandatory injected transport; no credentials, storage, logs or global fetch. */
import { createPharmacyRead, PharmacyReadError } from './pharmacy-read';
import type { PharmacyPurpose, PharmacyList, PharmacyDetail } from './pharmacy-read';
export type Code = 'INVALID_INPUT'|'INVALID_RESPONSE'|'DENIED'|'UNAUTHENTICATED'|'UNAVAILABLE'|'TIMEOUT'|'ABORTED'|'REDIRECT'|'TOO_LARGE'|'STALE';
export class LabError extends Error {
  readonly code: Code;
  constructor(code: Code) { super('Pharmacy read unavailable.'); this.name='LabError'; this.code=code; }
}
const fail=(c:Code):never=>{throw new LabError(c);};
export const validId=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s);
export function integer(n:unknown,min:number,max:number):number { if(typeof n!=='number'||!Number.isSafeInteger(n)||n<min||n>max)return fail('INVALID_INPUT');return n; }
function object(v:unknown,keys:string[]):Record<string,unknown>{
  if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))return fail('INVALID_RESPONSE');
  const d=Object.getOwnPropertyDescriptors(v);
  if(Reflect.ownKeys(d).length!==keys.length||keys.some(k=>!d[k]?.enumerable||!('value' in d[k])))return fail('INVALID_RESPONSE');
  return Object.fromEntries(keys.map(k=>[k,d[k].value]));
}
export type Contexts=Readonly<{data:readonly Readonly<{id:string;name:string}>[];meta:Readonly<{page:number;pageSize:number;total:number}>}>;
export function parseContexts(v:unknown,page=1,pageSize=20):Contexts{
  integer(page,1,10000);integer(pageSize,1,100);
  try{
    const o=object(v,['data','meta']),m=object(o.meta,['page','pageSize','total']);
    if(m.page!==page||m.pageSize!==pageSize)return fail('INVALID_RESPONSE');
    const total=integer(m.total,0,Number.MAX_SAFE_INTEGER);
    if(!Array.isArray(o.data)||Object.getPrototypeOf(o.data)!==Array.prototype||Reflect.ownKeys(o.data).length!==o.data.length+1||o.data.length!==Math.min(pageSize,Math.max(0,total-(page-1)*pageSize)))return fail('INVALID_RESPONSE');
    const data=Array.from({length:o.data.length},(_,i)=>{
      const d=Object.getOwnPropertyDescriptor(o.data,String(i));if(!d?.enumerable||!('value'in d))return fail('INVALID_RESPONSE');
      const r=object(d.value,['id','name']);
      if(!validId(r.id)||typeof r.name!=='string'||r.name.trim()!==r.name||!r.name||[...r.name].length>160||[...r.name].some(c=>{const n=c.codePointAt(0)!;return n<32||n>=127&&n<=159;}))return fail('INVALID_RESPONSE');
      return Object.freeze({id:r.id,name:r.name});
    });
    if(new Set(data.map(x=>x.id)).size!==data.length)return fail('INVALID_RESPONSE');
    return Object.freeze({data:Object.freeze(data),meta:Object.freeze({page,pageSize,total})});
  }catch{return fail('INVALID_RESPONSE');}
}
export type GetInit=Readonly<{method:'GET';cache:'no-store';credentials:'same-origin';redirect:'manual';signal:AbortSignal}>;
export type InjectedFetch=(path:string,init:GetInit)=>Promise<Response>;
/** Only these canonical paths may reach the injected transport. Never accepts an origin or arbitrary route. */
export function canonicalPath(path:string):boolean{
  const id='[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  const context=/^\/api\/v1\/pharmacies\/context\?page=([1-9][0-9]*)&pageSize=([1-9][0-9]*)$/.exec(path);
  const route=new RegExp('^/api/v1/pharmacies/'+id+'/routes(?:/'+id+')?\\?page=([1-9][0-9]*)&pageSize=([1-9][0-9]*)&purpose=(fulfillment|history)$').exec(path);
  const m=context??route;return !!m&&Number(m[1])<=10000&&Number(m[2])<=100;
}
/** A real deadline covers headers, streaming decode and cleanup; abort cooperation is not required. */
export async function getJSON(fetcher:InjectedFetch,request:{method:'GET';path:string;cache:'no-store'},external:AbortSignal,options:{timeoutMs?:number;maxBytes?:number}={}):Promise<{status:number;body:unknown}>{
  if(typeof fetcher!=='function'||request.method!=='GET'||request.cache!=='no-store'||!canonicalPath(request.path))return fail('INVALID_INPUT');
  const timeoutMs=integer(options.timeoutMs??10000,1,60000),maxBytes=integer(options.maxBytes??16*1024*1024,1,32*1024*1024);
  const controller=new AbortController();let stop:((e:LabError)=>void)|undefined;
  const stopped=new Promise<never>((_,reject)=>{stop=reject;});
  const abort=()=>{controller.abort();stop!(new LabError('ABORTED'));};
  const timer=setTimeout(()=>{controller.abort();stop!(new LabError('TIMEOUT'));},timeoutMs);
  external.addEventListener('abort',abort,{once:true});
  if(external.aborted)abort();
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  const cleanup=(body?:ReadableStream<Uint8Array>|null)=>{controller.abort();try{const p=reader?reader.cancel():body?.cancel();void p?.catch(()=>{});}catch{/* Never wait for an untrusted cancellation promise. */}};
  const work=async()=>{
    if(controller.signal.aborted)return fail('ABORTED');
    const r=await fetcher(request.path,Object.freeze({method:'GET',cache:'no-store',credentials:'same-origin',redirect:'manual',signal:controller.signal}));
    if(controller.signal.aborted){cleanup(r.body);return fail('ABORTED');}
    if(!Number.isInteger(r.status)||r.status<100||r.status>599)return fail('INVALID_RESPONSE');
    if(r.redirected||r.status>=300&&r.status<400){cleanup(r.body);return fail('REDIRECT');}
    if(r.status!==200){cleanup(r.body);return {status:r.status,body:undefined};}
    if(!/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??'')){cleanup(r.body);return fail('INVALID_RESPONSE');}
    const cl=r.headers.get('content-length');if(cl!==null&&(!/^[0-9]+$/.test(cl)||Number(cl)>maxBytes)){cleanup(r.body);return fail('TOO_LARGE');}
    if(!r.body||typeof r.body.getReader!=='function')return fail('INVALID_RESPONSE');
    reader=r.body.getReader();let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
    try{
      while(true){const {done,value}=await reader.read();if(controller.signal.aborted)return fail('ABORTED');if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)return fail('TOO_LARGE');text+=decoder.decode(value,{stream:true});}
      text+=decoder.decode();return {status:200,body:JSON.parse(text) as unknown};
    }catch(e){if(e instanceof LabError)throw e;return fail('INVALID_RESPONSE');}
    finally{cleanup();}
  };
  try{return await Promise.race([work(),stopped]);}
  catch(e){cleanup();if(e instanceof LabError)throw e;return fail('UNAVAILABLE');}
  finally{clearTimeout(timer);external.removeEventListener('abort',abort);}
}
type Scope=Readonly<{orgId:string;purpose:PharmacyPurpose;outerPage:number;outerSize:number;nestedPage:number;nestedSize:number}>;
export type Snapshot=Readonly<{epoch:number;status:'signed-out'|'ready'|'loading'|'empty'|'denied'|'unavailable';code?:Code;contexts?:Contexts;scope?:Scope;queue?:PharmacyList;detail?:PharmacyDetail}>;
export class PharmacyEngine {
  #fetch:InjectedFetch;#options:{timeoutMs?:number;maxBytes?:number};#epoch=0;#generation=0;#active=false;
  #controller?:AbortController;#state:Snapshot=Object.freeze({epoch:0,status:'signed-out'});#listeners=new Set<()=>void>();
  constructor(fetcher:InjectedFetch,options:{timeoutMs?:number;maxBytes?:number}={}){if(typeof fetcher!=='function')fail('INVALID_INPUT');this.#fetch=fetcher;this.#options=options;}
  snapshot=():Snapshot=>this.#state;
  subscribe=(f:()=>void)=>{this.#listeners.add(f);return()=>{this.#listeners.delete(f);};};
  #publish(s:Omit<Snapshot,'epoch'>){this.#state=Object.freeze({epoch:this.#epoch,...s});for(const fn of this.#listeners)fn();}
  #cancel(){this.#generation++;this.#controller?.abort();this.#controller=undefined;}
  /** Trusted host session observer only: this is NOT authentication and stores no credential. */
  establishSession(identity:{userId:string;role:string}|null){this.#cancel();this.#epoch++;this.#active=!!identity&&validId(identity.userId)&&identity.role==='PHARMACY_STAFF';this.#publish({status:this.#active?'ready':identity?'denied':'signed-out'});}
  invalidate(){this.establishSession(null);}
  /** Clear view/request scope without pretending the server session changed. */
  resetReadScope(){this.#cancel();this.#publish({status:this.#active?'ready':'signed-out'});}
  selectOrganization(id:string){
    const contexts=this.#state.contexts;this.#cancel();
    if(!this.#active||!validId(id)||!contexts?.data.some(o=>o.id===id)){this.#publish({status:'denied'});return;}
    this.#publish({status:'ready',contexts,scope:Object.freeze({orgId:id,purpose:'fulfillment',outerPage:1,outerSize:20,nestedPage:1,nestedSize:20})});
  }
  selectPurpose(purpose:PharmacyPurpose){
    const {scope,contexts}=this.#state;this.#cancel();
    if(!scope||!['fulfillment','history'].includes(purpose)){this.#publish({status:'denied'});return;}
    this.#publish({status:'ready',contexts,scope:Object.freeze({...scope,purpose,outerPage:1,nestedPage:1})});
  }
  async #run<T>(base:Omit<Snapshot,'epoch'|'status'>,action:(signal:AbortSignal)=>Promise<T>,commit:(v:T)=>Omit<Snapshot,'epoch'>){
    this.#cancel();const epoch=this.#epoch,generation=this.#generation;
    if(!this.#active){this.#publish({status:'denied'});return;}
    const controller=new AbortController();this.#controller=controller;this.#publish({...base,status:'loading'});
    try{const result=await action(controller.signal);if(epoch===this.#epoch&&generation===this.#generation)this.#publish(commit(result));}
    catch(e){
      if(epoch!==this.#epoch||generation!==this.#generation)return; // Includes stale401: cannot mutate the new session.
      let code:Code='UNAVAILABLE';
      if(e instanceof LabError)code=e.code;
      if(e instanceof PharmacyReadError)code=e.code==='UNAUTHENTICATED'?'UNAUTHENTICATED':e.code==='NOT_FOUND'||e.code==='FORBIDDEN'?'DENIED':e.code==='INVALID_RESPONSE'?'INVALID_RESPONSE':'UNAVAILABLE';
      if(code==='UNAUTHENTICATED'){this.invalidate();return;}
      // Denials and failures clear all protected payloads; no stale context/rows survive.
      this.#publish({status:code==='DENIED'?'denied':'unavailable',code});
    }
  }
  async contexts(page=1,pageSize=20){
    integer(page,1,10000);integer(pageSize,1,100);
    return this.#run<Contexts>({},async signal=>{const r=await getJSON(this.#fetch,{method:'GET',cache:'no-store',path:`/api/v1/pharmacies/context?page=${page}&pageSize=${pageSize}`},signal,this.#options);if(r.status!==200)return fail(r.status===401?'UNAUTHENTICATED':r.status===403||r.status===404?'DENIED':'UNAVAILABLE');return parseContexts(r.body,page,pageSize);},v=>({status:v.data.length?'ready':'empty',contexts:v}));
  }
  async queue(page=1,pageSize=20){
    integer(page,1,10000);integer(pageSize,1,100);const {scope,contexts}=this.#state;
    if(!scope){this.#publish({status:'denied'});return;}
    const next=Object.freeze({...scope,outerPage:page,outerSize:pageSize,nestedPage:1});
    return this.#run<PharmacyList>({scope:next,contexts},signal=>createPharmacyRead(r=>getJSON(this.#fetch,r,signal,this.#options)).list({pharmacyId:scope.orgId,purpose:scope.purpose,page,pageSize}),v=>({status:v.data.length?'ready':'empty',scope:next,contexts,queue:v}));
  }
  async detail(routeId:string,page=1,pageSize=20){
    integer(page,1,10000);integer(pageSize,1,100);const {scope,contexts,queue}=this.#state;
    if(!scope||!validId(routeId)||!queue?.data.some(r=>r.id===routeId)){this.#cancel();this.#publish({status:'denied'});return;}
    const next=Object.freeze({...scope,nestedPage:page,nestedSize:pageSize});
    return this.#run<PharmacyDetail>({scope:next,contexts,queue},signal=>createPharmacyRead(r=>getJSON(this.#fetch,r,signal,this.#options)).detail({pharmacyId:scope.orgId,routeId,purpose:scope.purpose,page,pageSize}),v=>({status:'ready',scope:next,contexts,queue,detail:v}));
  }
}
