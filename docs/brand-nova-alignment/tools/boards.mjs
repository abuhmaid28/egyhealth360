/* global document */
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const directory='docs/brand-nova-alignment',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
for(const [source,name] of [['comparison.html','comparison'],['language.html','visual-language']]){
 const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});await p.goto(`${origin}/${directory}/${source}`);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${directory}/evidence/${name}.png`,fullPage:true});await p.close();
}
for(const l of ['ar','en']){
 const p=await b.newPage({viewport:{width:320,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});await p.goto(`${origin}/${directory}/${l}.html`);await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>{document.documentElement.style.fontSize='32px'});await p.screenshot({path:`${directory}/evidence/text200-${l}-320.png`,fullPage:true});await p.close();
 const q=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await q.goto(`${origin}/${directory}/${l}.html`);await q.evaluate(()=>document.fonts.ready);await q.locator('[data-preview=appointment]').focus();await q.screenshot({path:`${directory}/evidence/focus-${l}-390.png`,fullPage:true});await q.close();
}
await b.close();console.log('Captured comparison, visual-language, 320px text200 and 390px focus evidence.');
