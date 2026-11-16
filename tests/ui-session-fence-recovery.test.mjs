import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile=(p,imports={})=>{const out={};new Function('exports','require',ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(out,p=>typeof imports==='function'?imports(p):imports[p]);return out;};
const s0=compile('apps/web/src/lib/api/pharmacy-read.ts'),engine=compile('apps/web/src/lib/api/pharmacy-live.ts',{'./pharmacy-read':s0});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const originalAuth=()=>({user:{id:id(9),email:'patient@example.invalid',role:'PATIENT'},csrfToken:'SYNTHETIC_SESSION_BOUND'});
async function scenario(options={}){
 const originalFetch=globalThis.fetch,requests=[],clearKinds=[];let authCount=0,bookingCount=0,release,started;
 const body=new Promise(r=>release=r),start=new Promise(r=>started=r);
 const component=kind=>({clearCommands(){clearKinds.push(kind);},clear(){clearKinds.push(kind);},activate(){clearKinds.push('activate:'+kind);}});
 const deps={UiError:class extends Error{},documentationHttpError:status=>Object.assign(new Error('Synthetic denial'),{status}),
 createConsultationCloseApi:()=>component('close'),createConsultationOpeningApi:()=>component('opening'),createLiveFollowUpApi:()=>component('followup'),
 createLiveDocumentationApi:request=>({...component('documentation'),denial:()=>request('/me/summaries'),clinical:()=>request('/consultations/'+id(20))}),
 createLiveBookingApi:request=>({...component('booking'),probe:()=>request(options.path??'/me/bookings?page=1&pageSize=20',options.method?{method:options.method,body:'{}'}:undefined)})};
 globalThis.fetch=async(path,init)=>{
  requests.push({path,method:init?.method??'GET',csrf:init?.headers?.['X-CSRF-Token']??null});
  if(path.endsWith('/auth/me')){authCount++;if(authCount>1&&options.revalidation) return options.revalidation({auth:originalAuth(),requests,api});return new Response(JSON.stringify({data:originalAuth()}));}
  if(path.endsWith('/auth/login'))return new Response(JSON.stringify({data:options.loginAuth??originalAuth()}));
  if(path.endsWith('/auth/logout'))return new Response(null,{status:204});
  if(path.includes('/me/bookings')||path.includes('/consultations')){bookingCount++;if(bookingCount===1)return{ok:true,status:200,json(){started();return body;}};return options.fresh401?new Response('{}',{status:401}):new Response(JSON.stringify({data:[{id:id(1),source:'FRESH_REAUTHORIZED_ONLY'}]}));}
  return new Response('{}',{status:401});
 };
 let api;
 try{
  api=compile('apps/web/src/lib/api/live.ts',p=>p==='./pharmacy-live'?engine:deps).createLiveAdapter();await api.session();const activationsBefore=clearKinds.filter(x=>x.startsWith('activate:')).length;
  const result=api.liveBookings.probe().then(value=>({ok:true,value}),()=>({ok:false}));await start;
  await api.documentation.denial().catch(()=>{});await options.afterDenial?.(api);
  release({data:[{id:id(1),source:'OLD_BODY_MUST_NEVER_RETURN'}]});
  const output=await result;
  return{...output,requests,authCount,bookingCount,activationsBefore,activationsAfter:clearKinds.filter(x=>x.startsWith('activate:')).length,pharmacy:api.pharmacyRead.snapshot()};
 }finally{globalThis.fetch=originalFetch;}
}
test('current401 never admits old booking body; same-session server confirmation permits only a NEW GET',async()=>{
 const r=await scenario();assert.equal(r.ok,true);assert.equal(r.value.data[0].source,'FRESH_REAUTHORIZED_ONLY');assert.equal(r.bookingCount,2);assert.equal(r.authCount,2);assert.equal(r.activationsAfter,r.activationsBefore);assert.equal(r.pharmacy.status,'signed-out');assert.ok(r.requests.every(x=>x.method==='GET'));
});
for(const status of [401,403,503])test(`expired/unavailable auth revalidation${status} denies booking with no retry`,async()=>{
 const r=await scenario({revalidation:()=>new Response('{}',{status})});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);assert.ok(r.requests.every(x=>x.method==='GET'));
});
for(const field of ['id','role','email','csrfToken'])test(`changed ${field} rejects recovery without returning old data or issuing a new booking GET`,async()=>{
 const r=await scenario({revalidation:({auth})=>{if(field==='csrfToken')auth.csrfToken='DIFFERENT_SESSION_TOKEN';else auth.user[field]=field==='id'?id(10):field==='role'?'CLINICIAN':'other@example.invalid';return new Response(JSON.stringify({data:auth}));}});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);
});
for(const data of [null,{}, {user:{role:'PATIENT'},csrfToken:'SYNTHETIC_SESSION_BOUND'}])test('malformed authentication confirmation never creates read authority '+JSON.stringify(data),async()=>{
 const r=await scenario({revalidation:()=>new Response(JSON.stringify({data}))});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);
});
for(const action of ['login','logout'])test(`${action} boundary prevents old response recovery`,async()=>{
 const r=await scenario({afterDenial:api=>action==='login'?api.login('patient@example.invalid','synthetic'):api.logout()});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);assert.equal(r.requests.filter(x=>x.method==='POST').length,1);
});
test('fresh booking401 remains typed failure and recovery is bounded to a single attempt',async()=>{const r=await scenario({fresh401:true});assert.equal(r.ok,false);assert.ok(r.authCount<=2);assert.ok(r.bookingCount<=2);});
test('booking commands are never automatically retried after unrelated401',async()=>{const r=await scenario({method:'POST'});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);assert.equal(r.requests.filter(x=>x.method==='POST').length,1);});
test('clinical payload requests never enter Patient logistics recovery',async()=>{const r=await scenario({path:'/consultations/'+id(20)});assert.equal(r.ok,false);assert.equal(r.bookingCount,1);});
