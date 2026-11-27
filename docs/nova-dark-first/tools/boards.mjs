/* global document */
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const directory='docs/nova-dark-first',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const locale of ['ar','en'])for(const width of [390,1440]){
 const screen=await b.newPage({viewport:{width,height:1000},deviceScaleFactor:1});await screen.goto(`${origin}/${directory}/${locale}.html`);await screen.evaluate(()=>document.fonts.ready);await screen.screenshot({path:`${directory}/evidence/normal-${locale}-${width}-full.png`,fullPage:true});await screen.close();
}
const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});await p.goto(`${origin}/${directory}/comparison.html`);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${directory}/evidence/comparison.png`,fullPage:true});const dimensions=await p.evaluate(()=>({viewport:1440,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,complete:i.complete}))}));await p.close();
for(const l of ['ar','en']){
 const q=await b.newPage({viewport:{width:320,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});await q.goto(`${origin}/${directory}/${l}.html`);await q.evaluate(()=>document.fonts.ready);await q.evaluate(()=>{document.documentElement.style.fontSize='32px'});await q.screenshot({path:`${directory}/evidence/text200-${l}-320.png`,fullPage:true});await q.close();
 const r=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await r.goto(`${origin}/${directory}/${l}.html`);await r.evaluate(()=>document.fonts.ready);await r.locator('[data-preview=appointment]').focus();await r.screenshot({path:`${directory}/evidence/focus-${l}-390.png`,fullPage:true});await r.close();
}
await b.close();await writeFile(`${directory}/evidence/board-results.json`,JSON.stringify({errors,...dimensions},null,2)+'\n');if(errors.length||dimensions.width!==1440||dimensions.images.some(i=>!i.complete||!i.width))throw Error('Board render failed');console.log('Captured full comparison, doubled-text and focus evidence.');
