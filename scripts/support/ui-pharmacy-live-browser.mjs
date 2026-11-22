/** Local controlled HTTP integration. No Playwright route mocks and no hosted endpoints. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {syntheticServer,id,route,historyWithFact} from '../../../pharmacy-s2-lab/src/fixtures.ts';
const evidence=new globalThis.URL('../../../evidence/',import.meta.url);await mkdir(evidence,{recursive:true});
const origin='http://localhost:3000',paths=[],browserErrors=[];let control={},cases=0,web,browser;
const fixture=syntheticServer({facts:true});
const api=createServer(async(req,res)=>{
 const mode={...control},path=req.url,method=req.method;
 paths.push({path:path.replace(/[a-f0-9]{8}-[a-f0-9-]{27}/g,':id'),method});
 if(mode.delay&&path.includes('/routes'))await new Promise(r=>setTimeout(r,mode.delay));
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(method!=='GET'&&method!=='HEAD'){res.writeHead(405);res.end();return;}
 if(path.startsWith('/api/v1/auth/me')){
  res.statusCode=mode.anonymous?401:200;res.end(JSON.stringify(mode.anonymous?{error:{code:'AUTH_UNAUTHENTICATED',message:'Authentication required.'}}:{data:{user:{id:id(100),email:'Synthetic staff',role:mode.role??'PHARMACY_STAFF'},csrfToken:'MODEL_'+(mode.inc??1)}}));return;
 }
 if(!path.startsWith('/api/v1/pharmacies/')){res.statusCode=404;res.end('{}');return;}
 if(mode.fault){res.statusCode=mode.fault;if(mode.fault===302)res.setHeader('Location','/api/v1/redirect-target');res.end(JSON.stringify({error:{message:'PRIVATE_HTTP_CANARY'}}));return;}
 const response=await fixture.fetch(path,{method:'GET'});let body=await response.json();
 const u=new globalThis.URL(path,'http://synthetic.invalid');
 if(body.meta&&path.includes('/routes')){const page=Number(u.searchParams.get('page')),size=Number(u.searchParams.get('pageSize'));body.meta.total=2;if(page===2&&size===1){const history=u.searchParams.get('purpose')==='history',org=u.pathname.split('/')[4],r=history?historyWithFact(org,1,1):route(org);r.id=id(12);r.prescriptionId=id(13);if(r.items[0]?.dispense)r.items[0].dispense.routeId=id(12);body.data=[r];}}
 if(mode.emptyQueue&&path.includes('/routes')&&body.meta){body.data=[];body.meta.total=0;}
 if(mode.emptyContexts&&path.includes('/context')){body.data=[];body.meta.total=0;}
 if(path.split('?')[0].split('/').length===7&&body.data&&!Array.isArray(body.data))body.data.id=u.pathname.split('/')[6];
 if(!path.includes('/context')){for(const r of Array.isArray(body.data)?body.data:[body.data])if(r.id===id(12)){r.prescriptionId=id(13);for(const i of r.items??[]){i.id=id(22);if(i.dispense){i.dispense.id=id(34);i.dispense.routeId=id(12);i.dispense.corrections.forEach((x,n)=>{x.id=id(35+n);});}}}}
 if(!path.includes('/context')){const rows=Array.isArray(body.data)?body.data:[body.data];for(const r of rows){for(const i of r.items??[]){const marker=r.pharmacyId===id(1)?'ORG_A_SCOPE':'ORG_B_SCOPE';i.medicationDisplay+=' '+marker;if(i.dispense)i.dispense.medicationDisplay=i.medicationDisplay;}}}
 if(mode.nullHistory&&path.includes('purpose=history')){if(body.data instanceof Array)for(const r of body.data)r.items=null;else body.data.items=null;}
 if(mode.badContext&&path.includes('/context'))body.data[0].id=id(999)+'invalid';
 if(mode.zeroFacts&&path.includes('purpose=history')){if(Array.isArray(body.data))for(const r of body.data){r.items=[];r.state='CANCELLED';}else{body.data.items=[];body.data.state='CANCELLED';}}
 if(mode.nullPatient&&!path.includes('/context')){if(Array.isArray(body.data))for(const r of body.data)r.patientDisplayName=null;else body.data.patientDisplayName=null;}
 res.statusCode=200;res.end(JSON.stringify(body));
});
const waitServer=async()=>{for(let i=0;i<100;i++){try{if((await globalThis.fetch(origin)).ok)return;}catch{/* The owned local server is still starting. */}await new Promise(r=>setTimeout(r,100));}throw Error('LOCAL_SERVER_START_FAILED');};
const open=async(options={})=>{
 control=options;const context=await browser.newContext();const page=await context.newPage();
 page.on('pageerror',e=>browserErrors.push(e.message));
 page.on('request',q=>{assert.equal(new globalThis.URL(q.url()).origin,origin,'External request prohibited');});
 await page.goto(origin+'/pharmacy');return{context,page};
};
const choose=async(page,org=id(1))=>{await page.getByLabel('Pharmacy organization',{exact:true}).selectOption(org);};
const load=async page=>{await page.getByRole('button',{name:'Load queue',exact:true}).click();await page.locator('[data-queue-meta]').waitFor();};
const detail=async page=>{await page.getByRole('button',{name:/^Open route/}).first().click();await page.locator('[data-route-detail]').waitFor();};
const check=async(name,fn)=>{await fn();cases++;console.log('B3_BROWSER_CASE',JSON.stringify({caseId:name,pass:true}));};
try{
 await new Promise(r=>api.listen(3001,'127.0.0.1',r));
 web=spawn(process.execPath,['apps/web/node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port','3000'],{stdio:['ignore','pipe','pipe']});let logs='';web.stdout.on('data',x=>logs+=x);web.stderr.on('data',x=>logs+=x);await waitServer();
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 await check('context-explicit-no-default',async()=>{const {page,context}=await open();await page.getByLabel('Pharmacy organization',{exact:true}).waitFor();assert.equal(await page.locator('[data-queue-meta]').count(),0);assert.equal(await page.getByLabel('Pharmacy organization',{exact:true}).inputValue(),'');await context.close();});
 await check('exact-source-quantity-nullable-patient',async()=>{const {page,context}=await open({nullPatient:true});await choose(page);await load(page);await detail(page);const text=await page.locator('[data-route-detail]').innerText();assert.match(text,/123\.4500/);assert.match(text,/تعليمات المصدر/);assert.match(text,/Not supplied/);assert.match(text,/Recorded: ACCEPTED/);await context.close();});
 await check('outer-pagination',async()=>{const {page,context}=await open();await choose(page);await load(page);await page.getByRole('button',{name:'Next queue page',exact:true}).click();await page.locator('[data-queue-meta]').filter({hasText:'page 2'}).waitFor();assert.equal(await page.locator('[data-route-detail]').count(),0);await detail(page);assert.match(await page.locator('[data-route-detail]').innerText(),/123\.4500/);await page.getByRole('button',{name:'Previous queue page',exact:true}).click();await page.locator('[data-queue-meta]').filter({hasText:'page 1'}).waitFor();await context.close();});
 await check('empty-queue',async()=>{const {page,context}=await open({emptyQueue:true});await choose(page);await page.getByRole('button',{name:'Load queue',exact:true}).click();await page.getByText('No permitted rows on this page',{exact:true}).waitFor();assert.equal(await page.locator('[data-route-detail]').count(),0);await context.close();});
 await check('history-facts-and-nested-pagination',async()=>{const {page,context}=await open();await choose(page);await page.getByLabel('Purpose',{exact:true}).selectOption('history');await load(page);await detail(page);assert.doesNotMatch(await page.locator('[data-route-detail]').innerText(),/SYNTHETIC_PATIENT|تعليمات المصدر/);await page.getByRole('button',{name:'Next correction page',exact:true}).click();await page.getByText('CORRECTION Synthetic correction',{exact:false}).waitFor();assert.match(await page.locator('[data-route-detail]').innerText(),/reversed: true/);await context.close();});
 await check('history-zero-facts',async()=>{const {page,context}=await open({zeroFacts:true});await choose(page);await page.getByLabel('Purpose',{exact:true}).selectOption('history');await load(page);await detail(page);await page.getByText('No dispense facts for this history route.',{exact:true}).waitFor();await context.close();});
 for(const [name,options]of [['malformed-context',{badContext:true}],['denied404',{fault:404}],['forbidden403',{fault:403}],['unavailable503',{fault:503}],['redirect302',{fault:302}]])await check(name,async()=>{const {page,context}=await open(options);await page.locator('[data-read-status]').filter({hasText:options.fault===403||options.fault===404?'Current access unavailable':'Service unavailable'}).waitFor();assert.equal(await page.locator('[data-route-detail]').count(),0);assert.doesNotMatch(await page.locator('[data-pharmacy-read]').innerText(),/PRIVATE_HTTP_CANARY|SYNTHETIC_PATIENT/);await context.close();});
 await check('history-null-fails-closed',async()=>{const {page,context}=await open({nullHistory:true});await choose(page);await page.getByLabel('Purpose',{exact:true}).selectOption('history');await page.getByRole('button',{name:'Load queue',exact:true}).click();await page.getByText('Service unavailable; no previous details shown',{exact:true}).waitFor();assert.equal(await page.locator('[data-queue-meta]').count(),0);await context.close();});
 await check('organization-switch-abort-and-stale-result',async()=>{const {page,context}=await open();await choose(page);await load(page);await detail(page);assert.match(await page.locator('[data-route-detail]').innerText(),/ORG_A_SCOPE/);control={delay:250};await page.getByRole('button',{name:'Load queue',exact:true}).click();await choose(page,id(2));assert.equal(await page.locator('[data-route-detail]').count(),0);assert.doesNotMatch(await page.locator('[data-pharmacy-read]').innerText(),/ORG_A_SCOPE/);control={};await load(page);await detail(page);await page.waitForTimeout(350);assert.match(await page.locator('[data-route-detail]').innerText(),/ORG_B_SCOPE/);assert.doesNotMatch(await page.locator('[data-pharmacy-read]').innerText(),/ORG_A_SCOPE/);const cdp=await page.context().newCDPSession(page);const ax=await cdp.send('Accessibility.getFullAXTree');assert.doesNotMatch(JSON.stringify(ax),/ORG_A_SCOPE/);await cdp.detach();assert.equal(await page.getByLabel('Pharmacy organization',{exact:true}).inputValue(),id(2));assert.doesNotMatch(page.url(),new RegExp(id(1)));await context.close();});
 await check('same-user-new-incarnation-old401',async()=>{const {page,context}=await open();await choose(page);control={delay:250,fault:401};await page.getByRole('button',{name:'Load queue',exact:true}).click();await page.waitForTimeout(30);control={inc:2};await page.evaluate(()=>globalThis.window.dispatchEvent(new globalThis.Event('focus')));await page.getByLabel('Pharmacy organization',{exact:true}).waitFor();await page.waitForTimeout(350);await choose(page);await load(page);await detail(page);await context.close();});
 await check('current401-clears-scope',async()=>{const {page,context}=await open();await choose(page);await load(page);await detail(page);control={fault:401};await page.getByRole('button',{name:'Load queue',exact:true}).click();await page.getByText('Session unavailable. Sign in again.',{exact:true}).waitFor();assert.equal(await page.locator('[data-route-detail]').count(),0);await context.close();});
 await check('wrong-role-admin-not-pharmacy',async()=>{const {page,context}=await open({role:'ADMIN'});assert.equal(await page.locator('[data-pharmacy-read]').count(),0);await context.close();});
 await check('anonymous-no-pharmacy',async()=>{const {page,context}=await open({anonymous:true});await page.getByRole('button',{name:'Sign in with live account',exact:true}).waitFor();assert.equal(await page.locator('[data-pharmacy-read]').count(),0);await context.close();});
 await check('ar-rtl-narrow-functional-read',async()=>{const {page,context}=await open();await choose(page);await load(page);await detail(page);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'العربية',exact:true}).click();await page.getByRole('heading',{name:'قراءات الصيدلية المسموحة',exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.screenshot({path:fileURLToPath(new globalThis.URL('pharmacy-ar-read.png',evidence)),fullPage:true});await context.close();});
 assert.ok(paths.filter(x=>x.path.startsWith('/api/v1/pharmacies/')).every(x=>x.method==='GET'));assert.ok(!paths.some(x=>x.path.includes('redirect-target')));assert.equal(browserErrors.length,0);
 await writeFile(new globalThis.URL('browser-network.json',evidence),JSON.stringify({manifest:'b3-local-http-browser-v1',cases,actualBrowser:true,actualNextRewrite:true,controlledHTTPBackend:true,postgres:false,pharmacyPosts:0,redirectsFollowed:0,pageErrors:0,requests:paths},null,2));
 console.log('B3_BROWSER_PASS',JSON.stringify({cases,pharmacyPosts:0,redirectsFollowed:0}));
}finally{if(browser)await browser.close();if(web){web.kill('SIGTERM');await new Promise(r=>web.once('exit',r));}await new Promise(r=>api.close(r));}
