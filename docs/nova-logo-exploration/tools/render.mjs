/* global document */
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const directory='docs/nova-logo-exploration',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const observations=[],errors=[],external=[];
for(const [name,width,file] of [['index',1280,'comparison-wide'],['index',390,'comparison-mobile'],...['a','b','c'].map(id=>[id+'-proof',1000,id+'-proof'])]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(origin+'/')&&!url.startsWith('data:')){external.push(url);return route.abort();}return route.continue();});
  await page.goto(`${origin}/${directory}/${name}.html`);
  for(const frame of page.frames())await frame.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].every(f=>f.contentDocument?.readyState==='complete'&&f.contentDocument.fonts.status==='loaded'&&f.clientHeight>=Math.ceil(f.contentDocument.body.getBoundingClientRect().height)));

  observations.push({name,width,height:await page.evaluate(()=>document.documentElement.scrollHeight)});
  await page.screenshot({path:`${directory}/evidence/${file}.png`,fullPage:true});await page.close();
}
await browser.close();
await writeFile(`${directory}/evidence/render.json`,JSON.stringify({browser:browser.version(),observations,errors,external},null,2)+'\n');
console.log(JSON.stringify({observations,errors,external}));
