/* global document, getComputedStyle, NodeFilter, innerWidth, URLSearchParams -- Playwright browser evaluations */
// Isolated visual-review QA. Dependencies are tooling outside this repository.
// QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/verify.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(root,'evidence/refinement');
const toolRoot = process.env.QA_TOOL_ROOT;
assert.ok(toolRoot, 'Set QA_TOOL_ROOT to isolated tooling with playwright and @axe-core/playwright.');
const { chromium } = await import(pathToFileURL(resolve(toolRoot,'node_modules/playwright/index.mjs')));
const { default: AxeBuilder } = await import(pathToFileURL(resolve(toolRoot,'node_modules/@axe-core/playwright/dist/index.mjs')));
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:8766';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox']});
const evidence = {baseline:'7181bde73ececcf2ba68882d6ecd2c10ab756385',browser:await browser.version(),playwright:'1.56.1',axe:'4.11.0',matrix:[],contrasts:[],interactions:[],screenshots:[]};
const pairs = new Map();
const errors = [];

function inspect(){
  const lum = c => {const values=c.startsWith('#')?c.slice(1).match(/../g).map(x=>parseInt(x,16)):c.match(/[\d.]+/g).slice(0,3).map(Number);const rgb=values.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const ratio = (a,b) => {const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const bg = el => {for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent')return c;}return getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();};
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && !el.closest('[hidden],dialog:not([open])');
  const texts=[],badText=[],clipped=[],badTargets=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode,el=node.parentElement;
    if(!node.textContent.trim() || !visible(el) || ['SCRIPT','STYLE','TEXTAREA'].includes(el.tagName)||el.closest('svg'))continue;
    const s=getComputedStyle(el),background=bg(el),r=ratio(s.color,background);
    const value={foreground:s.color,background,ratio:+r.toFixed(3),example:node.textContent.trim().slice(0,90),size:s.fontSize};texts.push(value);if(r<4.5)badText.push(value);
    const range=document.createRange();range.selectNodeContents(node);
    for(const box of range.getClientRects())if(box.width&& (box.left < -1 || box.right>innerWidth+1))clipped.push({tag:el.tagName,text:node.textContent.trim(),left:box.left,right:box.right});
  }
  for(const el of document.querySelectorAll('a,button,summary,textarea')){
    if(!visible(el)||el.classList.contains('skip'))continue;
    const r=el.getBoundingClientRect();if(r.width<43.9||r.height<43.9)badTargets.push({tag:el.tagName,text:el.textContent.trim(),width:r.width,height:r.height});
  }
  const checks=[];
  for(const el of document.querySelectorAll('.button,.writing-field,.global-nav a[aria-current],.local-nav a,.context-disclosure')){
    if(!visible(el))continue;const s=getComputedStyle(el);const border=s.borderTopColor;
    if(parseFloat(s.borderTopWidth)>0) checks.push({kind:'control outer boundary',foreground:border,background:bg(el.parentElement),ratio:+ratio(border,bg(el.parentElement)).toFixed(3)});
    if(parseFloat(s.borderTopWidth)>0 && border!==s.backgroundColor)checks.push({kind:'control inner boundary',foreground:border,background:bg(el),ratio:+ratio(border,bg(el)).toFixed(3)});
  }
  const focus=getComputedStyle(document.documentElement).getPropertyValue('--action').trim();
  const canvases=new Set([...document.querySelectorAll('main,header,.appointment,.appointment-bottom,.editor,.visit-anchor,.source-context')].filter(visible).map(bg));
  for(const background of canvases)checks.push({kind:'focus gap adjacency',foreground:focus,background,ratio:+ratio(focus,background).toFixed(3)});
  const primary=document.querySelector('.button.primary');if(primary){const s=getComputedStyle(primary);checks.push({kind:'primary outer boundary',foreground:s.backgroundColor,background:bg(primary.parentElement),ratio:+ratio(s.backgroundColor,bg(primary.parentElement)).toFixed(3)});}
  const icons=[...document.querySelectorAll('svg')].filter(visible).map(el=>{const s=getComputedStyle(el);return{kind:'labelled icon',foreground:s.color,background:bg(el),ratio:+ratio(s.color,bg(el)).toFixed(3)};});
  const textarea=document.querySelector('textarea');if(textarea){const s=getComputedStyle(textarea);texts.push({foreground:s.color,background:bg(textarea),ratio:+ratio(s.color,bg(textarea)).toFixed(3),example:'textarea content',size:s.fontSize});}
  return {overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,clipped,badText,badTargets,texts,nonText:[...checks,...icons],warning:!document.querySelector('#asset-warning').hidden,dir:document.documentElement.dir,fontsReady:document.body.dataset.fontsReady};
}

for(const text of [100,200])for(const role of ['patient','doctor'])for(const lang of ['ar','en'])for(const theme of ['light','dark'])for(const width of text===100?[320,390,768,1024,1440,1920]:[320,390]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});const page=await context.newPage();
  const requests=[];page.on('request',r=>{if(!r.url().startsWith(base+'/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/screen.html?${new URLSearchParams({role,lang,theme,text})}`);await page.evaluate(()=>document.fonts.ready);await page.waitForSelector('body[data-fonts-ready=true]');
  const data=await page.evaluate(inspect);const record={role,lang,theme,width,text,overflow:data.overflow,clipped:data.clipped,badText:data.badText,badTargets:data.badTargets,warning:data.warning,dir:data.dir,externalRequests:requests};
  const nonTextFailures=data.nonText.filter(v=>v.ratio<3);record.nonTextFailures=nonTextFailures;
  for(const v of [...data.texts.map(v=>({...v,kind:'text'})),...data.nonText]){const key=`${theme}|${v.kind}|${v.foreground}|${v.background}`;if(!pairs.has(key))pairs.set(key,{theme,...v,observations:0});pairs.get(key).observations++;}
  if(text===100 && [390,1440].includes(width)){
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();record.axe={violations:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:audit.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};
    const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'h1'});record.platformFonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;
    // Actual keyboard dialog, Escape and focus restoration for both screen families.
    const selector=role==='patient'?'[data-appointment]':'[data-write-preview]';const target=page.locator(selector).first();await target.focus();await page.keyboard.press('Tab');await target.focus();record.focus=await target.evaluate(el=>({color:getComputedStyle(el).outlineColor,width:getComputedStyle(el).outlineWidth,style:getComputedStyle(el).outlineStyle}));assert.equal(record.focus.width,'3px');await page.keyboard.press('Enter');assert.ok(await page.locator('dialog').evaluate(el=>el.open));await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('dialog')!==null));await page.keyboard.press('Escape');assert.ok(await target.evaluate(el=>el===document.activeElement));
    if(role==='patient'){await target.click();assert.match(await page.locator('dialog').innerText(),/Africa\/Cairo \(UTC\+02:00\)/);await page.keyboard.press('Escape');}
    else if(width===390){await page.locator('.context-disclosure>summary').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('.context-disclosure').evaluate(el=>el.open));assert.match(await page.locator('.context-identity').innerText(),/15:00–15:30/);await page.locator('.context-return').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'context-opener');assert.equal(await page.locator('.context-disclosure').evaluate(el=>el.open),false);}
    record.keyboard='PASS: activation, modal containment, Escape, focus restore; narrow Doctor source disclosure/return where applicable';
  }
  record.pageHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  record.headerFocusOrder=await page.evaluate(()=>[...document.querySelector('.masthead-inner').children].map(el=>el.className));
  if(role==='doctor'){
    const assessState=async state=>{
      const d=await page.evaluate(inspect);
      for(const v of [...d.texts.map(v=>({...v,kind:'text'})),...d.nonText]){const key=`${theme}|${v.kind}|${v.foreground}|${v.background}`;if(!pairs.has(key))pairs.set(key,{theme,...v,observations:0});pairs.get(key).observations++;}
      const entry={role,lang,theme,width,text,state,overflow:d.overflow,clipped:d.clipped,badText:d.badText,badTargets:d.badTargets,nonTextFailures:d.nonText.filter(v=>v.ratio<3)};
      if(text===100&&width===390){const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();entry.axe={violations:audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),incomplete:audit.incomplete.map(v=>v.id)};}
      evidence.interactions.push(entry);
    };
    if(width<900){await page.locator('.context-disclosure').evaluate(el=>el.open=true);await assessState('source-disclosure-open');await page.locator('.context-return').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'context-opener');}
    const originalNote=await page.locator('#private-note').inputValue();
    await page.locator('#private-note').fill(originalNote+'\nQA transient input');
    for(const id of ['follow-up','review-close']){
      await page.locator(`[data-task="${id}"]`).click();await page.waitForFunction(id=>document.querySelector(`[data-task-panel="${id}"]`).hidden===false,id);
      assert.equal(await page.locator('.local-nav [aria-current]').getAttribute('data-task'),id);
      await assessState(id);
      await page.locator(`#${id} [data-write-preview]`).click();assert.match(await page.locator('dialog').innerText(),/Design preview only|معاينة تصميم فقط/);await page.keyboard.press('Escape');
    }
    await page.locator('[data-task="documentation"]').click();await page.waitForFunction(()=>!document.querySelector('[data-task-panel="documentation"]').hidden);
    assert.equal(await page.locator('#private-note').inputValue(),originalNote+'\nQA transient input');
    await page.locator('#private-note').fill(originalNote);
  }
  evidence.matrix.push(record);console.log(`Checked ${role}/${lang}/${theme}/${width}/text${text}`);await context.close();
}
evidence.contrasts=[...pairs.values()];evidence.pageErrors=errors;
const captureCases=[
 {role:'patient',lang:'ar',theme:'light',width:390},
 {role:'patient',lang:'ar',theme:'dark',width:390},
 {role:'patient',lang:'en',theme:'light',width:768},
 {role:'patient',lang:'ar',theme:'dark',width:390,text:200},
 {role:'doctor',lang:'ar',theme:'light',width:390},
 {role:'doctor',lang:'en',theme:'dark',width:390},
 {role:'doctor',lang:'ar',theme:'dark',width:1440},
 {role:'doctor',lang:'ar',theme:'light',width:390,state:'context-open'}
];
for(const{role,lang,theme,width,text=100,state}of captureCases){
 const context=await browser.newContext({viewport:{width,height:1200},deviceScaleFactor:1});const page=await context.newPage();await page.goto(`${base}/screen.html?${new URLSearchParams({role,lang,theme,text})}`);await page.evaluate(()=>document.fonts.ready);
 if(state==='context-open')await page.locator('.context-disclosure>summary').click();
 const file=`${role}-${lang}-${theme}-${width}${text===200?'-text200':''}${state?'-'+state:''}.png`;
 await page.screenshot({path:resolve(outputRoot,file),fullPage:width<1024});
 const bytes=readFileSync(resolve(outputRoot,file));evidence.screenshots.push({file,role,lang,theme,width,text,state:state??'default',fullPage:width<1024,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});await context.close();
}
// Review wrapper selectors and deliberately paired browser views.
const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(`${base}/gallery.html`);await page.selectOption('#role','doctor');await page.selectOption('#lang','en');await page.selectOption('#theme','dark');await page.selectOption('#width','768');await page.selectOption('#text','200');assert.match(await page.locator('#screen').getAttribute('src'),/role=doctor&lang=en&theme=dark&text=200/);assert.equal(await page.locator('#light').getAttribute('width'),'768');assert.match(await page.locator('#light').getAttribute('src'),/theme=light/);await page.selectOption('#comparison-case','doctor-en-dark-390');assert.equal(await page.locator('#after-image').getAttribute('src'),'evidence/refinement/doctor-en-dark-390.png');evidence.galleryControls='PASS';await page.close();
const failures=[...evidence.matrix,...evidence.interactions].filter(r=>r.overflow||r.clipped.length||r.badText.length||r.badTargets.length||r.nonTextFailures.length||r.warning||r.externalRequests?.length||r.axe?.violations.length);
evidence.summary={cases:evidence.matrix.length,coreCases:40,wideCases:8,text200Cases:16,axeCases:[...evidence.matrix,...evidence.interactions].filter(r=>r.axe).length,interactionStates:evidence.interactions.length,failures:failures.length,contrastPairCount:evidence.contrasts.length,contrastObservations:evidence.contrasts.reduce((n,r)=>n+r.observations,0),screenshots:evidence.screenshots.length};
writeFileSync(resolve(outputRoot,'qa-results.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence.summary));for(const row of failures)console.log(JSON.stringify(row));await browser.close();
if(failures.length||errors.length)process.exitCode=1;
