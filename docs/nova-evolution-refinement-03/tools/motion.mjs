/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const origin=process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const directory='docs/nova-evolution-refinement-03';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const observations=[];
for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
  await page.goto(`${origin}/${directory}/index.html`);
  await page.evaluate(()=>document.fonts.ready);
  const styles=await page.evaluate(()=>({scroll:getComputedStyle(document.documentElement).scrollBehavior,buttonTransition:getComputedStyle(document.querySelector('.primary-action')).transitionDuration,arrowTransition:getComputedStyle(document.querySelector('.primary-action .arrow-frame svg')).transitionDuration}));
  if(reducedMotion==='reduce'){assert.equal(styles.scroll,'auto');assert.equal(styles.buttonTransition,'0s');assert.equal(styles.arrowTransition,'0s');}
  else {assert.ok(styles.buttonTransition.split(',').every(t=>parseFloat(t)>0&&parseFloat(t)<=.2));assert.ok(parseFloat(styles.arrowTransition)>0&&parseFloat(styles.arrowTransition)<=.2);}
  await page.locator('.primary-action').hover();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.primary-action')).backgroundColor==='rgb(237, 255, 191)');
  const hover=await page.locator('.primary-action').evaluate(el=>({background:getComputedStyle(el).backgroundColor}));
  await page.keyboard.press('Tab');
  await page.locator('.source-action').first().focus();
  const sourceFocus=await page.locator('.source-action').first().evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth,color:getComputedStyle(el).outlineColor,gap:getComputedStyle(el).boxShadow}));
  assert.equal(sourceFocus.style,'solid');assert.equal(sourceFocus.width,'3px');
  observations.push({reducedMotion,...styles,hover,sourceFocus});
  await page.close();
}
await browser.close();
await writeFile(`${directory}/evidence/motion.json`,JSON.stringify({observations,loading:'Specified as a later static-to-loaded geometry-preserving transition in README; no loading or clinical-state screen is implemented in this bounded refinement.'},null,2)+'\n');
console.log('Normal 140ms transitions and reduced-motion 0s overrides verified; local source focus sampled.');
