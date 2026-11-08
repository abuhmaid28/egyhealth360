/* global document */
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const dir='docs/brand-identity-reconstruction',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],external=[],captures=[];
for(const [name,w,h] of [['symbol-primary',310,320],['lockup-dark',1010,350],['lockup-light',1010,350],['lockup-mono',1010,350],['icon-dark',330,340],['icon-light',330,340],['icon-mono',330,340],['app-icon-512',512,512],['favicon-32',32,32],['favicon-24',24,24],['favicon-16',16,16],['nova-header-ar',1200,140],['nova-header-en',1200,140]]){
 const p=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>{const u=r.request().url();if(!u.startsWith(origin+'/')&&!u.startsWith('data:')){external.push(u);return r.abort();}return r.continue();});
 await p.goto(`${origin}/${dir}/assets/${name}.svg`);await p.screenshot({path:`${dir}/evidence/${name}.png`,omitBackground:true});captures.push({name,width:w,height:h});await p.close();
}
for(const [name,width,file] of [['fidelity',1220,'fidelity-board'],['index',1100,'all-proofs'],['index',390,'mobile-proofs']]){const p=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});await p.goto(`${origin}/${dir}/${name}.html`);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${dir}/evidence/${file}.png`,fullPage:true});captures.push({name,width});await p.close();}
await browser.close();await writeFile(`${dir}/evidence/render.json`,JSON.stringify({captures,errors,external},null,2)+'\n');console.log({captures:captures.length,errors,external});
