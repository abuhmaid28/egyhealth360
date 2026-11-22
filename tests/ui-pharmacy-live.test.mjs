import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const compile=(p,imports={})=>{const out={};new Function('exports','require',ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(out,p=>imports[p]);return out;};
const s0=compile('apps/web/src/lib/api/pharmacy-read.ts');
const engine=compile('apps/web/src/lib/api/pharmacy-live.ts',{'./pharmacy-read':s0});
const pending=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const good=()=>new globalThis.Response(JSON.stringify({data:[{id:id(1),name:'Synthetic org'}],meta:{page:1,pageSize:20,total:1}}),{headers:{'content-type':'application/json'}});
test('mirror S0 source is exact147, not rewritten or activated through legacy methods',()=>{assert.equal(createHash('sha256').update(readFileSync('apps/web/src/lib/api/pharmacy-read.ts')).digest('hex'),'e37f0f4861147cce3e387fa119b97d2c91a7bf4eb3945a52cceebde3a8fa0595');const s=readFileSync('apps/web/src/lib/api/live.ts','utf8');assert.match(s,/fulfillment: unavailable/);assert.match(s,/updateFulfillment: unavailable/);assert.match(s,/artifacts: unavailable/);});
test('actual adapted engine retains mandatory injected transport and bounded scope validation',async()=>{const e=new engine.PharmacyEngine(async()=>good());e.establishSession({userId:id(9),role:'PHARMACY_STAFF'});await e.contexts();e.selectOrganization(id(99));assert.equal(e.snapshot().status,'denied');assert.equal(e.snapshot().scope,undefined);});
for(const replacement of ['login','session'])test('actual Live transport stale401 and current401 replacement='+replacement,async()=>{
 let clears=0;const components=()=>({clearCommands(){clears++;},clear(){clears++;},activate(){}});
 const deps={createConsultationCloseApi:components,createLiveFollowUpApi:components,createLiveDocumentationApi:components,createConsultationOpeningApi:components,createLiveBookingApi:components,UiError:class extends Error{}};
 const out={},old=globalThis.fetch,d=pending();let delayed=false,inc=1;
 const auth=()=>new globalThis.Response(JSON.stringify({data:{user:{id:id(9),email:'Synthetic staff',role:'PHARMACY_STAFF'},csrfToken:'MODEL_'+inc}}),{headers:{'content-type':'application/json'}});
 globalThis.fetch=async(path)=>{if(path.endsWith('/auth/me'))return auth();if(path.endsWith('/auth/login'))return auth();if(delayed)return d.promise;return good();};
 try{new Function('exports','require',ts.transpileModule(readFileSync('apps/web/src/lib/api/live.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(out,p=>p==='./pharmacy-live'?engine:deps);
 const api=out.createLiveAdapter();await api.session();delayed=true;const oldRead=api.pharmacyRead.contexts();inc++;if(replacement==='login')await api.login();else await api.session();delayed=false;await api.pharmacyRead.contexts();const epoch=api.pharmacyRead.snapshot().epoch,beforeClears=clears;d.resolve(new globalThis.Response('{}',{status:401}));await oldRead;assert.equal(api.pharmacyRead.snapshot().epoch,epoch);assert.equal(clears,beforeClears);assert.ok(api.pharmacyRead.snapshot().contexts);
 globalThis.fetch=async()=>new globalThis.Response('{}',{status:401});await api.pharmacyRead.contexts();assert.equal(api.pharmacyRead.snapshot().status,'signed-out');assert.ok(clears>beforeClears);
 }finally{globalThis.fetch=old;}
});

// B4 regressions execute the actual shared adapter, including deferred body delivery.
function actualAdapter(){
 let clears=0;const components=()=>({clearCommands(){clears++;},clear(){clears++;},activate(){}});
 const deps={createConsultationCloseApi:components,createLiveFollowUpApi:components,createLiveDocumentationApi:components,createConsultationOpeningApi:components,createLiveBookingApi:request=>({...components(),probe:()=>request("/me/bookings")}),BookingUiError:class extends Error{constructor(status){super("Safe expiry");this.status=status;}},UiError:class extends Error{}};
 const out={};new Function('exports','require',ts.transpileModule(readFileSync('apps/web/src/lib/api/live.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(out,p=>p==='./pharmacy-live'?engine:deps);
 return{api:out.createLiveAdapter(),clears:()=>clears};
}
const authPayload=(name,role='PHARMACY_STAFF',csrfToken='MODEL_FIXED')=>({data:{user:{id:id(9),email:name,role},csrfToken}});
test('B4 role replacement with same ID and CSRF clears pharmacy synchronously',async()=>{
 const old=globalThis.fetch;let role='PHARMACY_STAFF';globalThis.fetch=async path=>path.endsWith('/auth/me')?new globalThis.Response(JSON.stringify(authPayload('Synthetic same user',role))):good();
 try{const {api}=actualAdapter();await api.session();await api.pharmacyRead.contexts();api.pharmacyRead.selectOrganization(id(1));const epoch=api.pharmacyRead.snapshot().epoch;role='ADMIN';await api.session();assert.ok(api.pharmacyRead.snapshot().epoch>epoch);assert.equal(api.pharmacyRead.snapshot().status,'denied');assert.equal(api.pharmacyRead.snapshot().contexts,undefined);assert.equal(api.pharmacyRead.snapshot().scope,undefined);}finally{globalThis.fetch=old;}
});
test('B4 old auth body cannot overwrite new login or clear unrelated command state',async()=>{
 const old=globalThis.fetch,body=pending(),started=pending();let hold=false;
 globalThis.fetch=async path=>{if(path.endsWith('/auth/me')&&hold)return{ok:true,status:200,json(){started.resolve();return body.promise;}};return new globalThis.Response(JSON.stringify(authPayload(hold?'Synthetic new':'Synthetic old','PHARMACY_STAFF',hold?'MODEL_NEW':'MODEL_OLD')));};
 try{const {api,clears}=actualAdapter();await api.session();hold=true;const stale=api.session();await started.promise;await api.login('Synthetic new','synthetic-only');const epoch=api.pharmacyRead.snapshot().epoch,n=clears();body.resolve(authPayload('Synthetic old','PHARMACY_STAFF','MODEL_OLD'));assert.equal(await stale,null);assert.equal(api.pharmacyRead.snapshot().epoch,epoch);assert.equal(clears(),n);}finally{globalThis.fetch=old;}
});

test('B4 current401 fences a pre-expiry successful auth body and preserves typed401',async()=>{
 const old=globalThis.fetch,body=pending(),started=pending();let hold=false;
 globalThis.fetch=async path=>{if(path.endsWith('/auth/me')&&hold)return{ok:true,status:200,json(){started.resolve();return body.promise;}};if(hold)return new globalThis.Response('{}',{status:401});return new globalThis.Response(JSON.stringify(authPayload('Synthetic staff')));};
 try{const {api}=actualAdapter();await api.session();hold=true;const stale=api.session();await started.promise;await assert.rejects(api.liveBookings.probe(),e=>e.status===401);assert.equal(api.pharmacyRead.snapshot().status,'signed-out');body.resolve(authPayload('Synthetic staff'));assert.equal(await stale,null);assert.equal(api.pharmacyRead.snapshot().status,'signed-out');assert.equal(api.pharmacyRead.snapshot().contexts,undefined);}finally{globalThis.fetch=old;}
});

test('Combined keeps all original pins and reviewed overlays and bounds S0 activation to the typed Pharmacy engine',()=>{
 const inherited=readFileSync('tests/ui-v2-combined-integration.test.mjs','utf8');
 const pinned=JSON.parse(inherited.match(/const pinned = (\[[\s\S]*?\n\]);/)[1]);
 const overlays={"apps/web/src/components/operations.tsx": "e51f634f1dfac48778b0b0d2050ba07bf433f400", "apps/web/src/components/v2/staff-workspace.tsx": "1b244354aec894e63495a164046bbc0569e9e8e3", "apps/web/src/components/v2/staff-copy.ts": "28cf7d49645068fd558797f22283dfc28cbf8518", "apps/web/src/components/v2/pharmacy-workspace.tsx": "737e998a3bda1f3deeafaa968e3cf44419ca2543", "apps/web/src/components/v2/admin-workspace.tsx": "317383ce833232984c2eed239b3cc0a8dc211c7e", "apps/web/src/components/application.tsx": "56682e0e560f08fc5c95a22c4304f53a1a29c35d", "scripts/support/ui-v2-patient-doctor-browser.mjs": "83a12bbd2f4ca4aba298c30374e6cbc830501625"}; const changed=new Set(Object.keys(overlays));
 assert.equal(pinned.length,44);assert.equal(changed.size,7);assert.ok([...changed].every(path=>pinned.some(p=>p.path===path)));
 const visualRecovery = JSON.parse(inherited.match(/const visualRecoveryOverlays = (\{[\s\S]*?\n\});/)[1]);
 const expressiveDiscoveryOverlay = JSON.parse(inherited.match(/const expressiveDiscoveryOverlay = (\{[\s\S]*?\n\});/)[1]);
 const expressiveDoctorOverlay = JSON.parse(inherited.match(/const expressiveDoctorOverlay = (\{[\s\S]*?\n\});/)[1]);
 assert.deepEqual(Object.keys(expressiveDoctorOverlay), ['apps/web/src/components/doctor.tsx']);
 assert.equal(expressiveDoctorOverlay['apps/web/src/components/doctor.tsx'].mode, '100644');
 assert.equal(visualRecovery['apps/web/src/components/doctor.tsx'], '41aeec758d5f4976592255d6db4fdff2b3528776');
 assert.deepEqual(Object.keys(expressiveDiscoveryOverlay), ['apps/web/src/components/patient.tsx']);
 assert.equal(visualRecovery['apps/web/src/components/patient.tsx'], '507eef5fb8b76577850888ce438541da4cbfd75b');
 assert.equal(pinned.filter(p=>!changed.has(p.path)).length,37);
 for(const row of pinned) {
   const bytes=readFileSync(row.path);
   assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),expressiveDoctorOverlay[row.path]?.blob??expressiveDiscoveryOverlay[row.path]??visualRecovery[row.path]??overlays[row.path]??row.blob,row.path);
   assert.equal(statSync(row.path).mode&0o111?"100755":"100644",row.mode,row.path);
 }
 const transport=readFileSync('apps/web/src/lib/api/pharmacy-live.ts','utf8');assert.match(transport,/from '\.\/pharmacy-read'/);
 const entry=readFileSync('scripts/test-ui-browser.mjs','utf8');assert.ok(entry.includes('testCombinedV2'));assert.ok(entry.includes('--pharmacy-read-lab'));
});
