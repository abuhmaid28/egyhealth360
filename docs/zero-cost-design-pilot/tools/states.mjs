/* global document, window, getComputedStyle, innerHeight */
// Real browser state, privacy representation and focus checks on isolated specimens.
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceHashes=()=>Object.fromEntries(['index.html','specimen.js','specimen.css'].map(n=>[n,createHash('sha256').update(readFileSync(resolve(root,'specimen',n))).digest('hex')]));
const inputHashes=sourceHashes();
const origin=process.env.PILOT_ORIGIN || 'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const results=[],blocked=[];
for(const direction of ['interval','relay'])for(const lang of ['en','ar'])for(const state of ['read-error','access-redacted','uncertain-write']){
 const role=state==='read-error'?'patient':'clinician';
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){blocked.push(r.request().url());return r.abort();}return r.continue();});
 const page=await context.newPage();await page.goto(`${origin}/docs/zero-cost-design-pilot/specimen/index.html?direction=${direction}&role=${role}&lang=${lang}&state=${state}`);await page.evaluate(()=>document.fonts.ready);
 const key=`${direction}-${role}-${lang}-${state}-390`;
 const result=await page.evaluate(()=>({text:document.body.innerText,scrollWidth:document.documentElement.scrollWidth,fixture:window.designFixture,mainControls:[...document.querySelectorAll('main button')].map(e=>({text:e.textContent,fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,rect:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}))}));
 if(state==='access-redacted')result.identitySuppressed=!/Salma Hassan|سلمى حسن|12 November 2026|12 نوفمبر 2026|Nile Care Clinic/.test(result.text)&&result.fixture.clinicalPayload===null;
 await page.screenshot({path:resolve(root,`evidence/${key}-full.png`),fullPage:true});
 results.push({direction,lang,role,state,key,...result});await context.close();
}
const focus=[];
for(const direction of ['interval','relay'])for(const lang of ['en','ar']){
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(`${origin}/docs/zero-cost-design-pilot/specimen/index.html?direction=${direction}&role=clinician&lang=${lang}`);await page.evaluate(()=>document.fonts.ready);
 for(const action of ['summary','close']){
  const selector=action==='summary'?'.summary-editor .primary-button':'.close-review button';
  await page.locator(selector).focus();
  const result=await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();const contexts=[...document.querySelectorAll('.consultation-context,.mobile-context,.action-target')].map(c=>{const b=c.getBoundingClientRect();return {text:c.textContent.trim(),top:b.top,bottom:b.bottom,visible:b.bottom>0&&b.top<innerHeight&&getComputedStyle(c).display!=='none'};});return {text:e.textContent,outline:getComputedStyle(e).outline,top:r.top,bottom:r.bottom,viewport:innerHeight,contexts};});
  const key=`${direction}-clinician-${lang}-390-focus-${action}`;
  await page.screenshot({path:resolve(root,`evidence/${key}.png`)});focus.push({direction,lang,action,key,...result});
 }
 await page.close();
}
if(JSON.stringify(inputHashes)!==JSON.stringify(sourceHashes()))throw new Error('Specimen source changed during state capture.');
writeFileSync(resolve(root,'evidence/states-and-focus.json'),JSON.stringify({inputHashes,browser:await browser.version(),scope:'Static representation only; no backend authorization/runtime fix claim',blockedExternalRequests:blocked,results,focus},null,2)+'\n');
console.log(JSON.stringify({states:results.length,identitySuppressed:results.filter(x=>x.state==='access-redacted').every(x=>x.identitySuppressed),overflows:results.filter(x=>x.scrollWidth>390).map(x=>x.key),focusCaptures:focus.length,blocked},null,2));await browser.close();
