/* global document, window, innerWidth, getComputedStyle */
// Isolated browser evidence; no product server, API, paid service or upstream script.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
let chromium;
try { ({chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')); }
catch { ({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sourceHashes=()=>Object.fromEntries(['index.html','specimen.js','specimen.css'].map(n=>[n,createHash('sha256').update(readFileSync(resolve(root,'specimen',n))).digest('hex')]));
const inputHashes=sourceHashes();
const output=resolve(root,'evidence'); mkdirSync(output,{recursive:true});
const origin=process.env.PILOT_ORIGIN || 'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[], requests=new Set(), failures=[];
for (const direction of ['interval','relay']) for (const role of ['patient','clinician']) for (const lang of ['en','ar']) {
 for (const width of [1440,768,390,320]) for (const textScale of (width<400?[1,2]:[1])) {
  const context=await browser.newContext({viewport:{width,height:width>800?1000:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){requests.add(u.origin);return route.abort();}return route.continue();});
  const page=await context.newPage(); page.on('pageerror',e=>failures.push(e.message));
  page.on('response',res=>{if(res.status()>=400)failures.push(`${res.status()} ${res.url()}`);});
  const url=`${origin}/docs/zero-cost-design-pilot/specimen/index.html?direction=${direction}&role=${role}&lang=${lang}`;
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  let scaleVerification=null;
  if(textScale===2) scaleVerification=await page.evaluate(()=>{const sizes=[...document.querySelectorAll('body,body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,size]of sizes)e.style.setProperty('font-size',`${size*2}px`,'important');const ratios=sizes.filter(([,before])=>before>0).map(([e,before])=>parseFloat(getComputedStyle(e).fontSize)/before);return {elements:ratios.length,minRatio:Math.min(...ratios),maxRatio:Math.max(...ratios),mismatches:ratios.filter(r=>Math.abs(r-2)>.01).length};});
  const measurement=await page.evaluate(()=>{
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
   const essential=[...document.querySelectorAll('h1,h2,h3,p,label,button,a,summary,.status,bdi')].filter(visible);
   const clipped=essential.filter(e=>!e.closest('textarea,.sr-only')&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)&&getComputedStyle(e).overflow!=='visible').map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,100)}));
   const ancestorClipping=[];
   for(const e of essential){if(e.closest('.sr-only'))continue;for(const node of e.childNodes){if(node.nodeType!==3||!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects()){let a=e;while(a&&a!==document.body){const style=getComputedStyle(a),b=a.getBoundingClientRect();if((['hidden','clip'].includes(style.overflowX)&&(rect.left<b.left-2||rect.right>b.right+2))||(['hidden','clip'].includes(style.overflowY)&&(rect.top<b.top-2||rect.bottom>b.bottom+2))){ancestorClipping.push({text:node.textContent.trim().slice(0,90),ancestor:a.className});break;}a=a.parentElement;}}}}
   const color=s=>(s.match(/[\d.]+/g)||[]).map(Number);
   function backdrop(e){if(!e)return [255,255,255];const c=color(getComputedStyle(e).backgroundColor);const a=c.length>3?c[3]:1;if(a===1)return c.slice(0,3);const b=backdrop(e.parentElement);return b.map((v,i)=>Math.round(c[i]*a+v*(1-a)));}
   const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
   const contrasts=[];
   for(const e of document.querySelectorAll('body *')){if(!visible(e)||e.closest('svg,dialog:not([open])')||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const s=getComputedStyle(e),fg=color(s.color),bg=backdrop(e),l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);contrasts.push({text:e.textContent.trim().slice(0,100),foreground:s.color,background:bg,ratio:Number(ratio.toFixed(2)),size:s.fontSize,weight:s.fontWeight,disabled:!!e.closest('[disabled],[aria-disabled="true"]')});}
   const controls=[...document.querySelectorAll('button,a,input,textarea,summary')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,text:(e.textContent||e.getAttribute('aria-label')||e.id).trim().slice(0,70),width:Math.round(r.width),height:Math.round(r.height),disabled:e.disabled||e.getAttribute('aria-disabled')==='true'};});
   return {title:document.title,dir:document.documentElement.dir,lang:document.documentElement.lang,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,fonts:document.fonts.status,loadedFonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),h1:document.querySelectorAll('h1').length,clipped,ancestorClipping,contrasts,controls,fixture:window.designFixture};
  });
  const key=`${direction}-${role}-${lang}-${width}${textScale===2?'-text200':''}`;
  if((textScale===1&&[1440,390].includes(width))||(textScale===2&&width===320)){
   await page.screenshot({path:resolve(output,`${key}-full.png`),fullPage:true});
   if(textScale===1)await page.screenshot({path:resolve(output,`${key}-viewport.png`)});
  }
  // Real keyboard entry and native preview-dialog dismissal/return, one default mobile sample per variant.
  if(width===390&&textScale===1){
   await page.keyboard.press('Tab');const first=await page.evaluate(()=>({text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outline,visible:document.activeElement.getBoundingClientRect().top>=0}));
   measurement.keyboardFirst=first;
   const preview=page.locator('button[data-preview]').first();await preview.focus();await page.keyboard.press('Enter');
   measurement.dialogOpened=await page.locator('dialog').evaluate(e=>e.open);
   await page.keyboard.press('Escape');measurement.dialogClosed=await page.locator('dialog').evaluate(e=>!e.open);
   measurement.focusReturned=await preview.evaluate(e=>document.activeElement===e);
  }
  results.push({direction,role,lang,width,textScale,key,url,scaleVerification,...measurement});
  await context.close();
 }
}
const summary={measuredLayouts:results.length,normalTextBelow12px:results.filter(x=>x.textScale===1).flatMap(x=>x.contrasts.filter(c=>parseFloat(c.size)<12).map(c=>({key:x.key,text:c.text,size:c.size}))),mobileTargetsBelow44px:results.filter(x=>x.textScale===1&&x.width<400).flatMap(x=>x.controls.filter(c=>!c.disabled&&(c.width<44||c.height<44)).map(c=>({key:x.key,...c}))),textScaleVerificationFailures:results.filter(x=>x.scaleVerification?.mismatches>0).map(x=>x.key),horizontalOverflows:results.filter(x=>x.scrollWidth>x.width+1).map(x=>x.key),clipped:results.filter(x=>x.clipped.length).map(x=>({key:x.key,clipped:x.clipped})),ancestorClipping:results.filter(x=>x.ancestorClipping.length).map(x=>({key:x.key,items:x.ancestorClipping})),contrastFailures:results.flatMap(x=>x.contrasts.filter(c=>!c.disabled&&c.ratio<4.5).map(c=>({key:x.key,...c}))),externalRequestsBlocked:[...requests],browserErrors:failures};
if(JSON.stringify(inputHashes)!==JSON.stringify(sourceHashes()))throw new Error('Specimen source changed during capture; rerender required.');
writeFileSync(resolve(output,'browser-measurements.json'),JSON.stringify({inputHashes,browser:await browser.version(),mode:'standalone synthetic HTML; textScale 2 means computed text sizes doubled, not browser zoom',summary,results},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));await browser.close();
