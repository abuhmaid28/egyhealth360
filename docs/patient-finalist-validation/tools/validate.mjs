/* global document, window, getComputedStyle, innerWidth */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import {writeRecordsReport} from './report.mjs';
const origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const directory='docs/patient-finalist-validation';
const states=['normal','loading','empty','error','no-sources','unavailable'];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const report={browser:browser.version(),method:'96 actual Chromium cases: two locales × six states × four widths × normal/200% root text. Text ratios measured. AX trees are semantic inspection, not screen-reader testing. No native zoom claim.',cases:[],keyboard:[],errors:[],externalRequests:[],failedResponses:[]};
await mkdir(`${directory}/evidence`,{recursive:true});
for(const locale of ['ar','en'])for(const state of states)for(const width of [1440,768,390,320])for(const textScale of [1,2]){
  const page=await browser.newPage({viewport:{width,height:width===1440?1050:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push({locale,state,width,textScale,message:e.message}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({locale,state,width,textScale,message:m.text()});});
  page.on('response',r=>{if(r.status()>=400)report.failedResponses.push({locale,state,url:r.url(),status:r.status()});});
  await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(origin+'/')&&!url.startsWith('data:')){report.externalRequests.push(url);return route.abort();}return route.continue();});
  await page.goto(`${origin}/${directory}/${locale}.html?state=${state}`);
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.evaluate(()=>document.fonts.ready);
  if(textScale===2)await page.evaluate(()=>{
    window.qaFontProbe=[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&!el.closest('svg')&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));
    document.documentElement.style.fontSize='32px';
  });
  const metrics=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.classList.contains('sr-only');
    const overflow=[...document.querySelectorAll('main *,header *,footer *')].filter(el=>visible(el)&&!el.closest('svg')).map(el=>({el,r:el.getBoundingClientRect()})).filter(({r})=>r.left<-.75||r.right>innerWidth+.75).map(({el,r})=>({selector:el.tagName+'#'+el.id+'.'+el.className,left:r.left,right:r.right,text:el.textContent.trim().slice(0,80)}));
    const clipping=[...document.querySelectorAll('h1,h2,h3,p,button,a,small,time,.time-line')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2).map(el=>({selector:el.tagName+'#'+el.id+'.'+el.className,text:el.textContent.trim().slice(0,100),client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]}));
    const targets=[...document.querySelectorAll('button,a')].filter(el=>visible(el)&&!el.classList.contains('skip')).map(el=>({name:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    const badReferences=[...document.querySelectorAll('[aria-labelledby],[aria-describedby]')].flatMap(el=>[el.getAttribute('aria-labelledby'),el.getAttribute('aria-describedby')].filter(Boolean).flatMap(s=>s.split(' ')).filter(id=>!document.getElementById(id)));
    const ratios=window.qaFontProbe?.map(({el,size})=>parseFloat(getComputedStyle(el).fontSize)/size)||[1];
    return {documentWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflow,clipping,targets,lang:document.documentElement.lang,dir:document.documentElement.dir,mainCount:document.querySelectorAll('main').length,h1Count:document.querySelectorAll('h1').length,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),badReferences,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),textRatios:[Math.min(...ratios),Math.max(...ratios)],timeInstants:[...document.querySelectorAll('.appointment time[datetime*=T]')].map(el=>el.dateTime),clinicZone:document.querySelector('.appointment-when')?.dataset.timeZone||null,appointmentText:document.querySelector('.appointment').innerText,sharedText:document.querySelector('.shared-care').innerText,sourceArticles:document.querySelectorAll('.source').length,sourceProvenance:document.querySelectorAll('.shared-care .provenance').length,busy:document.querySelector('.appointment').getAttribute('aria-busy'),alert:document.querySelectorAll('[role=alert]').length,mainText:document.querySelector('main').innerText,motion:getComputedStyle(document.documentElement).scrollBehavior,fixture:window.validationFixture};
  });
  const cdp=await page.context().newCDPSession(page);
  const tree=await cdp.send('Accessibility.getFullAXTree');
  const nodes=tree.nodes.filter(n=>!n.ignored);
  const ax={controls:nodes.filter(n=>['button','link'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value||''})),headings:nodes.filter(n=>n.role?.value==='heading').map(n=>({name:n.name?.value,level:n.properties?.find(p=>p.name==='level')?.value?.value})),roles:[...new Set(nodes.map(n=>n.role?.value))]};
  await cdp.detach();
  report.cases.push({locale,state,width,textScale,...metrics,ax});
  if(state==='normal'&&textScale===1&&[390,1440].includes(width))await page.screenshot({path:`${directory}/evidence/normal-${locale}-${width}-full.png`,fullPage:true});
  if((width===390&&textScale===1)||(width===320&&textScale===2&&['normal','error','unavailable'].includes(state))){
    await page.keyboard.press('Tab');const skip=await page.evaluate(()=>({name:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outlineStyle,top:document.activeElement.getBoundingClientRect().top}));await page.keyboard.press('Enter');const skipTarget=await page.evaluate(()=>document.activeElement.id);
    const actions=[];
    const buttons=await page.locator('[data-preview]').all();
    for(const button of (textScale===1?buttons:buttons.slice(0,2))){
      await button.focus();const focus=await button.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth,color:getComputedStyle(el).outlineColor}));
      await page.keyboard.press('Enter');await page.locator('dialog').waitFor({state:'visible'});
      const initialDialog=await page.locator('dialog').evaluate(el=>({scrollTop:el.scrollTop,focused:document.activeElement.id,titleTop:document.querySelector('#preview-title').getBoundingClientRect().top,top:el.getBoundingClientRect().top}));
      const forward=await page.keyboard.press('Tab').then(()=>page.evaluate(()=>!!document.activeElement.closest('dialog')));
      const backward=await page.keyboard.press('Shift+Tab').then(()=>page.evaluate(()=>!!document.activeElement.closest('dialog')));
      const dialogText=await page.locator('dialog').innerText();
      const dialogClipping=await page.locator('dialog').evaluate(el=>({width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
      await page.keyboard.press('Escape');
      try{await page.waitForFunction(el=>!document.querySelector('dialog').open&&document.activeElement===el,await button.elementHandle(),{timeout:5000});}catch(error){console.error(JSON.stringify({locale,state,width,textScale,action:await button.getAttribute('data-preview'),diagnostic:await page.evaluate(()=>({open:document.querySelector('dialog').open,active:document.activeElement.outerHTML}))}));await browser.close();throw error;}
      actions.push({initialDialog,action:await button.getAttribute('data-preview'),name:await button.innerText(),focus,forward,backward,returned:await button.evaluate(el=>document.activeElement===el),dialogText,dialogClipping});
    }
    report.keyboard.push({locale,state,width,textScale,skip,skipTarget,actions});
  }
  await page.close();
}
await browser.close();
await writeRecordsReport(`${directory}/evidence/browser-results.json`,report,['cases','keyboard']);
console.log(JSON.stringify({browser:report.browser,cases:report.cases.length,keyboardCases:report.keyboard.length,keyboardActions:report.keyboard.reduce((s,c)=>s+c.actions.length,0),errors:report.errors,external:report.externalRequests,failedResponses:report.failedResponses,layoutFailures:report.cases.filter(c=>c.documentWidth!==c.width||c.overflow.length||c.clipping.length).map(c=>({locale:c.locale,state:c.state,width:c.width,textScale:c.textScale,documentWidth:c.documentWidth,overflow:c.overflow,clipping:c.clipping}))},null,2));
