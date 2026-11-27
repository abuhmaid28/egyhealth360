/* global document, scrollY */
// Objective before/after browser observations; page length is evidence, not an approval score.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(resolve(process.env.QA_TOOL_ROOT,'node_modules/playwright/index.mjs')));
const root=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const result={baseline:'7181bde73ececcf2ba68882d6ecd2c10ab756385',browser:await browser.version(),viewport:{width:390,height:1200},cases:[]};
for(const role of ['patient','doctor'])for(const lang of ['ar','en'])for(const theme of ['light','dark']){
 const row={role,lang,theme};
 for(const phase of ['before','after']){
  const context=await browser.newContext({viewport:result.viewport,deviceScaleFactor:1});const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${phase==='before'?8767:8766}/screen.html?role=${role}&lang=${lang}&theme=${theme}`);await page.evaluate(()=>document.fonts.ready);
  row[phase]=await page.evaluate(role=>({height:document.documentElement.scrollHeight,appointmentActionY:document.querySelector('[data-appointment]')?.getBoundingClientRect().top,findCareLinks:[...document.querySelectorAll('a')].filter(el=>el.getClientRects().length&&/^(Find care|دور على دكتور)$/.test(el.textContent.trim())).length,historyLinks:[...document.querySelectorAll('a')].filter(el=>el.getClientRects().length&&/available history|السجل المتاح/i.test(el.textContent)).length,editorY:role==='doctor'?document.querySelector('#documentation').getBoundingClientRect().top:undefined}),role);
  if(role==='doctor'){
   const access=page.locator(phase==='before'?'.context-shortcut':'.context-disclosure>summary');
   const before=await page.evaluate(()=>scrollY);await access.click();
   row[phase].contextScrollDistance=Math.abs(await page.evaluate(()=>scrollY)-before);
   row[phase].contextFocused=await page.evaluate(()=>document.activeElement.id);
   row[phase].contextSourceY=await page.locator('#context').evaluate(el=>el.getBoundingClientRect().top+scrollY);
   if(phase==='after'){
    row[phase].nearEditorIdentity=await page.locator('.context-identity').innerText();
    await page.locator('.context-return').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'context-opener');
   }
   await page.goto(`http://127.0.0.1:${phase==='before'?8767:8766}/screen.html?role=doctor&lang=${lang}&theme=${theme}`);await page.evaluate(()=>document.fonts.ready);
   if(phase==='before')await page.locator('.task-disclosure>summary').click();
   await page.locator(phase==='before'?'.task-disclosure a[href="#follow-up"]':'[data-task="follow-up"]').click();
   row[phase].followUpScrollY=await page.evaluate(()=>scrollY);
   row[phase].followUpFocus=await page.evaluate(()=>document.activeElement.id);
   if(phase==='after'){
    await page.goBack();await page.waitForFunction(()=>!document.querySelector('[data-task-panel="documentation"]').hidden);
    await page.goForward();await page.waitForFunction(()=>!document.querySelector('[data-task-panel="follow-up"]').hidden);
    row[phase].browserBackForward='PASS';
   }
  }
  await context.close();
 }
 row.heightReductionPercent=+((1-row.after.height/row.before.height)*100).toFixed(1);result.cases.push(row);
}
result.limit='A matched390px browser observation of static synthetic previews. Length and scroll distances support visual critique; they do not establish real-device usability or clinical task safety.';
writeFileSync(resolve(root,'evidence/refinement/before-after.json'),JSON.stringify(result,null,2)+'\n');await browser.close();console.log('Matched before/after browser observations recorded.');
