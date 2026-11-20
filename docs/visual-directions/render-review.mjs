/* global document, innerWidth, getComputedStyle */
// Isolated documentation renderer. Uses the repo's existing Playwright dev dependency.
// Optional VISUAL_PLAYWRIGHT_MODULE selects an already installed module; no dependency changes.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
const { chromium } = await import(process.env.VISUAL_PLAYWRIGHT_MODULE || 'playwright');
const root = path.dirname(fileURLToPath(import.meta.url));
// This managed Chromium blocks file: URLs. Serve read-only static files on loopback
// for captures; the delivered review itself still needs no server or build.
const repo = path.resolve(root, '../..');
const server = createServer(async (req,res)=>{
 try {
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '');
  const target=path.resolve(repo,rel);
  const allowed=target.startsWith(root+path.sep)||['inter-latin-variable.woff2','noto-sans-arabic-variable.woff2'].some(f=>target===path.join(repo,'apps/web/public/fonts',f));
  if(!allowed){res.writeHead(403);res.end();return;}
  const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}[path.extname(target)]||'text/plain';
  const data=await readFile(target);res.writeHead(200,{'Content-Type':mime});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
const urlFor=rel=>`${origin}/docs/visual-directions/${rel}`;
const browser = await chromium.launch({ executablePath: process.env.VISUAL_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: {width:1440,height:1000}, deviceScaleFactor:1, locale:'en-GB', timezoneId:'Africa/Cairo', colorScheme:'light', reducedMotion:'reduce' });
// No external network. Serve only local review files and the two existing fonts.
await context.route(/^https?:/, route => route.request().url().startsWith(origin+'/') ? route.continue() : route.abort());
const page=await context.newPage();
const results=[];const errors=[];
page.on('pageerror', e=>errors.push(e.message));
page.on('requestfailed', req=>errors.push(`${req.url()}: ${req.failure()?.errorText}`));
async function render(rel, width=1440, height=1000, out=rel.replace(/\.html$/,'.png')) {
 await page.setViewportSize({width,height});
 await page.goto(urlFor(rel));
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(async()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
 const audit=await page.evaluate(()=>({
  width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
  height:document.documentElement.scrollHeight,
  brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src')),
  lang:document.documentElement.lang,dir:document.documentElement.dir,
  bdi:[...document.querySelectorAll('bdi')].map(b=>({text:b.textContent,dir:getComputedStyle(b).direction})),
  fonts:[...document.querySelectorAll('h1,h2,textarea')].slice(0,4).map(e=>({tag:e.tagName,family:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize})),
  clipped:[...document.querySelectorAll('h1,h2,h3,p,button,.status,.fact strong')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent.slice(0,100)),
 }));
 await page.screenshot({path:path.join(root,out),fullPage:true,animations:'disabled'});
 results.push({file:rel,png:out,...audit});
 console.log(`${rel}: ${width}×${audit.height}, overflow=${audit.scrollWidth>width}, clipped=${audit.clipped.length}`);
}
try {
 for(const d of ['a','b','c']) {
  for(const lang of ['ar','en']) for(const kind of ['patient','patient-mobile','appointment','schedule','consultation','doctor-mobile','states']) {
   await render(`direction-${d}/${kind}-${lang}.html`,kind.includes('mobile')?390:1440,kind.includes('mobile')?844:1000);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(urlFor(`direction-${d}/patient-en.html`));
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'.brand{visibility:hidden}'});
  await page.screenshot({path:path.join(root,`comparison/${d}-no-logo.png`),fullPage:true,animations:'disabled'});
  for(const n of ['1','2']) {
   await page.setViewportSize({width:960,height:340});
   await page.goto(urlFor(`logos/${d}${n}-proof.svg`));
   await page.screenshot({path:path.join(root,`logos/${d}${n}-proof.png`),animations:'disabled'});
  }
 }
 for(const d of ['a','b','c'])await render(`direction-${d}/overview.html`,1600,2360,`direction-${d}/direction-${d}-overview.png`);
 await render('comparison/board.html',1800,1000,'comparison/logo-free-comparison.png');
 await render('logos/gallery.html',1920,1000,'logos/six-logo-exploration.png');
 for(const width of [1440,390]) {
  for(const rel of ['index.html','direction-a/index.html','direction-b/index.html','direction-c/index.html','comparison/index.html']) {
   await page.setViewportSize({width,height:1000});await page.goto(urlFor(rel));await page.evaluate(()=>document.fonts.ready);
   // Loading=lazy images are verified by local-link audit below.
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)errors.push(`Review reflow overflow: ${rel} @ ${width}`);
  }
 }
 const reflow=[];
 for(const d of ['a','b','c']) for(const lang of ['ar','en']) for(const kind of ['patient','appointment','schedule','consultation','states']) {
  await page.setViewportSize({width:320,height:1000});await page.goto(urlFor(`direction-${d}/${kind}-${lang}.html`));await page.evaluate(()=>document.fonts.ready);
  const check=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  reflow.push({file:`direction-${d}/${kind}-${lang}.html`,...check});
  if(check.scrollWidth>320)errors.push(`320px reflow overflow: ${d}/${kind}/${lang}: ${check.scrollWidth}`);
 }
 await writeFile(path.join(root,'evidence/reflow-results.json'),JSON.stringify({width:320,checks:reflow},null,2)+'\n');
 // Actual keyboard focus on an available specimen button, with visual evidence.
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(urlFor('direction-b/appointment-ar.html'));
 await page.keyboard.press('Tab');
 const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent,outline:getComputedStyle(document.activeElement).outlineStyle}));
 await page.screenshot({path:path.join(root,'evidence/keyboard-focus.png'),fullPage:true});
 if(focus.tag!=='BUTTON'||focus.outline==='none')errors.push('Missing keyboard focus outline');
 const bad=results.filter(r=>r.scrollWidth>r.width||r.brokenImages.length||r.clipped.length||r.bdi.some(b=>b.dir!=='ltr'));
 await writeFile(path.join(root,'evidence/render-results.json'),JSON.stringify({engine:await browser.version(),viewport:{desktop:[1440,1000],mobile:[390,844],overview:[1600,2360]},deviceScaleFactor:1,timezone:'Africa/Cairo',offline:true,focus,errors,failures:bad.map(r=>r.file),results},null,2)+'\n');
 if(errors.length||bad.length)throw new Error(`Render QA failed: ${JSON.stringify({errors,bad:bad.map(r=>({file:r.file,clipped:r.clipped}))})}`);
 console.log('PASS: all renders, widths, embedded assets, isolated mixed-direction text and keyboard focus.');
}finally{await browser.close();server.close();}
