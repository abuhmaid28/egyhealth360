/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const directory='docs/nova-logo-exploration',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const cases=[],errors=[],external=[],failed=[],smallSizes=[],keyboard=[];
for(const name of ['index','a-proof','b-proof','c-proof',...['a','b','c'].flatMap(id=>[id+'-ar-header',id+'-en-header'])])for(const width of (name.includes('header')?[1440,768,390,320]:[1280,768,390,320]))for(const scale of [1,2]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push({name,message:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({name,message:m.text()});});
  page.on('response',r=>{if(r.status()>=400)failed.push({name,status:r.status(),url:r.url()});});
  await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(origin+'/')&&!url.startsWith('data:')){external.push(url);return route.abort();}return route.continue();});
  await page.goto(`${origin}/${directory}/${name}.html`);
  for(const frame of page.frames())await frame.evaluate(()=>document.fonts.ready);
  if(scale===2)await page.evaluate(()=>{const samples=[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&!el.closest('svg')&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));for(const {el,size} of samples)el.style.fontSize=(size*2)+'px';document.body.dataset.textRatios=JSON.stringify(samples.map(({el,size})=>parseFloat(getComputedStyle(el).fontSize)/size));});
  const result=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.classList.contains('skip')&&!el.closest('svg');
    const overflow=[...document.querySelectorAll('body *')].filter(visible).filter(el=>{const r=el.getBoundingClientRect();return r.left<-.75||r.right>innerWidth+.75;}).map(el=>({selector:el.tagName+'.'+el.className,text:el.textContent.trim().slice(0,70)}));
    const clipping=[...document.querySelectorAll('h1,h2,h3,p,a,button')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2).map(el=>({selector:el.tagName+'.'+el.className,text:el.textContent.trim().slice(0,70)}));
    return {textRatios:JSON.parse(document.body.dataset.textRatios||'[1]'),documentWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflow,clipping,lang:document.documentElement.lang,dir:document.documentElement.dir,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),targets:[...document.querySelectorAll('a,button')].filter(visible).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),brokenImages:[...document.images].filter(el=>!el.complete||!el.naturalWidth).map(el=>el.src),missingIcons:[...document.querySelectorAll('use')].map(el=>el.getAttribute('href')).filter(href=>href?.startsWith('#')&&!document.querySelector(href)),brand:document.querySelector('.brand')?.textContent.trim(),brandSymbol:document.querySelector('.brand-symbol')?{width:document.querySelector('.brand-symbol').getBoundingClientRect().width,height:document.querySelector('.brand-symbol').getBoundingClientRect().height,transform:getComputedStyle(document.querySelector('.brand-symbol')).transform}:null,nav:document.querySelector('.primary-nav')?.innerText,heading:document.querySelector('.page-heading')?.innerText,bodyText:document.body.innerText};
  });
  const cdp=await page.context().newCDPSession(page);const tree=await cdp.send('Accessibility.getFullAXTree');
  result.unnamedControls=tree.nodes.filter(n=>!n.ignored&&['button','link'].includes(n.role?.value)&&!n.name?.value?.trim()).length;await cdp.detach();
  cases.push({name,width,scale,...result});
  if(name==='index'&&width===390&&scale===1){
    await page.keyboard.press('Tab');const skip=await page.evaluate(()=>({text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outlineWidth,top:document.activeElement.getBoundingClientRect().top}));await page.keyboard.press('Enter');const main=await page.evaluate(()=>document.activeElement.id);
    const links=[];for(const link of await page.locator('.actions a').all()){await link.focus();links.push(await link.evaluate(el=>({name:el.textContent,outline:getComputedStyle(el).outlineWidth,style:getComputedStyle(el).outlineStyle})));}keyboard.push({skip,main,links});
  }
  await page.close();
}
const sample=await browser.newPage();
for(const id of ['a','b','c'])for(const variant of ['dark','light','mono','reverse']){
  await sample.goto(`${origin}/${directory}/assets/${id}/symbol-${variant}.svg`);
  const bounds=await sample.evaluate(()=>{const svg=document.querySelector('svg');const b=svg.getBBox();return {viewBox:svg.getAttribute('viewBox'),bounds:{x:b.x,y:b.y,width:b.width,height:b.height}};});
  for(const size of [16,24,32]){await sample.setViewportSize({width:size,height:size});const display=await sample.evaluate(()=>({width:document.querySelector('svg').getBoundingClientRect().width,height:document.querySelector('svg').getBoundingClientRect().height}));smallSizes.push({id,variant,size,display,...bounds});}
}
await browser.close();
const failures=cases.filter(c=>c.documentWidth!==c.width||c.overflow.length||c.clipping.length||c.brokenImages.length||c.missingIcons.length||c.unnamedControls);
const report={browser:'Chromium154.0.8037.57',method:'80 actual page cases:4 owner/proof pages +6 pinnedheader contexts ×4 widths ×normal/root200%; all visible direct-text sizes are explicitly doubled with measured ratios, independent of rem/px; this is not native zoom. 36 native CSS-size vector configurations checked. AX semantics are not screenreader proof.',cases,smallSizes,keyboard,errors,external,failed,failures};
await writeFile(`${directory}/evidence/browser-results.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,failures:failures.map(c=>({name:c.name,width:c.width,scale:c.scale,documentWidth:c.documentWidth,overflow:c.overflow,clipping:c.clipping})),errors,external,failed},null,2));
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);assert.deepEqual(failures,[]);
