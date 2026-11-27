/* global document, innerHeight, innerWidth, localStorage, sessionStorage */
import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='docs/design-system-v2/staff-admin-pilot/evidence/refinement';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage(), requests=[];page.on('request',r=>requests.push({url:r.url(),method:r.method()}));const report={browser:browser.version(),height:900,metrics:[],comparisons:[],interactions:[]};
for(const role of ['pharmacy','laboratory','admin'])for(const lang of ['ar','en'])for(const theme of ['light','dark'])for(const width of [320,390]){
 const item={role,lang,theme,width};
 for(const [phase,port] of [['before',8769],['after',8768]]){
 await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:${port}/screen.html?role=${role}&lang=${lang}&theme=${theme}`);await page.evaluate(()=>document.fonts.ready);
 item[phase]=await page.evaluate(()=>{
 const action=document.querySelector('[data-review]'),panel=document.querySelector('.panel'),rect=action.getBoundingClientRect();
 return{pageHeight:document.documentElement.scrollHeight,selectedTop:Math.round(panel.getBoundingClientRect().top),actionTop:Math.round(rect.top),actionBottom:Math.round(rect.bottom),actionFullyVisible:rect.bottom<=innerHeight,scrollToReveal:Math.max(0,Math.ceil(rect.bottom-innerHeight)),headingsBeforeAction:[...document.querySelectorAll('h1,h2,h3')].filter(e=>(e.compareDocumentPosition(action)&4)!==0).length,viewport:{width:innerWidth,height:innerHeight}};
 });
 for(let count=1;count<=20;count++){await page.keyboard.press('Tab');if(await page.locator('[data-review]').evaluate(e=>e===document.activeElement)){item[phase].actionTabPresses=count;break;}}
 }item.improvement={actionPx:item.before.actionTop-item.after.actionTop,actionPercent:Math.round((1-item.after.actionTop/item.before.actionTop)*100),pagePx:item.before.pageHeight-item.after.pageHeight};report.metrics.push(item);
}
// Six focused before/after comparisons rendered directly by Chromium in paired natural-width iframes.
for(const [role,lang,theme,width] of [['pharmacy','ar','light',390],['pharmacy','ar','dark',390],['laboratory','ar','light',390],['admin','ar','dark',390],['laboratory','ar','dark',768],['admin','en','light',1440]]){
 const urls=[8769,8768].map(port=>`http://127.0.0.1:${port}/screen.html?role=${role}&lang=${lang}&theme=${theme}`),heights=[];
 for(const url of urls){await page.setViewportSize({width,height:900});await page.goto(url);await page.evaluate(()=>document.fonts.ready);heights.push(await page.evaluate(()=>document.documentElement.scrollHeight));}
 const height=Math.max(...heights);await page.setViewportSize({width:width*2+24,height:1000});await page.setContent(`<style>body{margin:0;background:#dedce5;font:16px Arial}main{display:flex;gap:24px}section{width:${width}px}h1{font-size:16px;margin:0;padding:12px;height:24px}iframe{display:block;width:${width}px;height:${height}px;border:0}</style><main>${urls.map((url,n)=>`<section><h1>${n?'AFTER · candidate':'BEFORE · 87535bb'} · ${role} / ${lang} / ${theme} / ${width}px</h1><iframe src="${url}"></iframe></section>`).join('')}</main>`);
 for(const frame of page.frames().slice(1))await frame.evaluate(()=>document.fonts.ready);
 const file=`${role}-${lang}-${theme}-${width}-comparison.png`;await page.screenshot({path:`${root}/${file}`,fullPage:true});report.comparisons.push({file,width:width*2+24,height:height+48,viewportWidth:width,lang,theme,role,sha256:createHash('sha256').update(await readFile(`${root}/${file}`)).digest('hex')});
}
for(const role of ['pharmacy','laboratory','admin']){
 await page.setViewportSize({width:390,height:900});await page.goto(`http://127.0.0.1:8768/screen.html?role=${role}&lang=ar&theme=dark`);const trigger=page.locator('[data-review]');await trigger.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');const trapped=await page.locator('dialog').evaluate(e=>e.contains(document.activeElement));await page.keyboard.press('Shift+Tab');const reverseTrapped=await page.locator('dialog').evaluate(e=>e.contains(document.activeElement));await page.keyboard.press('Escape');report.interactions.push({role,trapped,reverseTrapped,focusReturn:await trigger.evaluate(e=>e===document.activeElement)});
}
await page.goto('http://127.0.0.1:8768/screen.html?role=pharmacy&lang=en');await page.locator('.queue-picker summary').click();await page.getByRole('link',{name:'Illustrative route B'}).click();report.interactions.push({role:'pharmacy',acceptedHeading:await page.locator('#detail').textContent(),action:await page.locator('[data-review]').getAttribute('data-review')});await page.getByRole('link',{name:'Dispense history',exact:true}).first().click();report.interactions.push({historyNoPatient:await page.getByText('Illustrative patient A',{exact:true}).count()===0,historyNoAction:await page.locator('[data-review]').count()===0});
report.network={requests:requests.length,localGetOnly:requests.every(r=>/^http:\/\/127\.0\.0\.1:876[89]\//.test(r.url)&&r.method==='GET')};report.storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
await writeFile(`${root}/comparison-results.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.metrics.filter(x=>x.lang==='ar'&&x.width===390),null,2));await browser.close();
