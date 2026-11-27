/* global document, getComputedStyle, innerWidth, Node, matchMedia, URLSearchParams */
// Local file-only proof; existing Playwright, no server/dependency installation.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 1000 } });
const origin = 'http://design-review.test';
const intercepted = [];
await context.route('**/*', async route => {
  const u = new URL(route.request().url());
  if(u.origin !== origin) return route.abort('blockedbyclient');
  const relative = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const path = resolve(root,relative);
  if(!path.startsWith(root+'/')) return route.abort('blockedbyclient');
  const ext = path.split('.').pop();
  const contentType = {html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',ttf:'font/ttf'}[ext] || 'application/octet-stream';
  try { const body=readFileSync(path);intercepted.push(relative);await route.fulfill({status:200,contentType,body}); }
  catch { await route.fulfill({status:404,body:'Missing local reference'}); }
});
const page = await context.newPage();
const exceptions = [], network = [];
page.on('pageerror', error => exceptions.push(String(error)));
page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) network.push(request.url()); });
const url = options => `${origin}/specimen.html?${new URLSearchParams(options)}`;
async function open(options) {
  await page.goto(url(options));
  await page.waitForFunction(() => document.documentElement.dataset.assets);
  if (await page.getAttribute('html', 'data-assets') !== 'ready') throw new Error('Pinned assets failed to load');
}
const layout = [], contrast = new Map(), checks = [];
function check(name, pass, details) { checks.push({ name, pass, details }); }
async function metrics() {
  return page.evaluate(() => {
    const visible = e => !!(e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
    const clipped = [...document.querySelectorAll('h1,h2,h3,p,button,a,input,select,summary,bdi')].filter(visible).filter(e => {
      const r=e.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth+1 || (e.scrollWidth > e.clientWidth+2 && !['BDI','A'].includes(e.tagName));
    }).map(e => e.tagName+':'+e.textContent.trim().slice(0,70));
    const small = [...document.querySelectorAll('button,a,input,select,summary')].filter(visible).filter(e => e.getBoundingClientRect().height < 43.9).map(e => e.outerHTML.slice(0,100));
    return { scrollWidth:document.documentElement.scrollWidth, width:innerWidth, clipped, smallTargets:small, font:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight})), direction:document.documentElement.dir };
  });
}
async function measureContrast(state) {
  const data = await page.evaluate(() => {
    const rgb = s => { const a = s.match(/[\d.]+/g)?.map(Number); return a && a.length>=3 ? a : null; };
    const bg = el => { for(let e=el;e;e=e.parentElement) {const c=rgb(getComputedStyle(e).backgroundColor);if(c && (c.length===3 || c[3]===1)) return c.slice(0,3);} return null; };
    const lum = c => c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const rows = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility==='hidden') continue;
      const style=getComputedStyle(el), back=bg(el), fore=rgb(style.color);
      if(back && fore && (el.matches('input,select') || [...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) && !['SCRIPT','STYLE','OPTION'].includes(el.tagName)) rows.push({kind:'text',foreground:fore.slice(0,3),background:back,ratio:ratio(fore,back),threshold:4.5,example:el.textContent.trim().slice(0,70)});
      if(el.matches('input[placeholder]') && back) {
        const ph=getComputedStyle(el,'::placeholder'), color=rgb(ph.color);
        if(color) rows.push({kind:'placeholder',foreground:color.slice(0,3),background:back,ratio:ratio(color,back),threshold:4.5,example:el.getAttribute('placeholder'),opacity:ph.opacity});
      }
      if (el.matches('input,select,button,.button')) {
        const border=rgb(style.borderTopColor), adjacent=bg(el.parentElement);
        if(border && adjacent) rows.push({kind:'boundary',foreground:border.slice(0,3),background:adjacent,ratio:ratio(border,adjacent),threshold:3,example:el.tagName+':'+(el.textContent.trim()||el.id).slice(0,55)});
      }
      if (style.outlineStyle!=='none' && parseFloat(style.outlineWidth)>0 && el===document.activeElement) {
        const ring=rgb(style.outlineColor), adjacent=bg(el.parentElement);
        if(ring&&adjacent) rows.push({kind:'focus',foreground:ring.slice(0,3),background:adjacent,ratio:ratio(ring,adjacent),threshold:3,example:el.tagName});
      }
    }
    return rows;
  });
  for (const row of data) {
    const key=JSON.stringify([state, row.kind,row.foreground,row.background]);
    if(!contrast.has(key)) contrast.set(key,{ state,...row });
  }
}
for(const role of ['patient','doctor']) for(const locale of ['ar','en']) for(const theme of ['light','dark']) for(const width of [320,390,768,1024,1440]) {
  await page.setViewportSize({width,height:1000});await open({role,locale,theme,nav:'top'});
  const m=await metrics();layout.push({role,locale,theme,width,...m,pass:m.scrollWidth<=width && !m.clipped.length && !m.smallTargets.length});
  if(width===390) await measureContrast(`${role}/${locale}/${theme}/rest`);
}
for(const locale of ['ar','en']) for(const theme of ['light','dark']) {
  await page.setViewportSize({width:390,height:1000});await open({role:'patient',locale,theme});
  await page.locator('.primary').first().hover();await measureContrast(`patient/${locale}/${theme}/hover-primary`);
  await page.locator('.primary').first().focus();await measureContrast(`patient/${locale}/${theme}/focus-primary`);
  await page.locator('.primary').first().hover();await page.mouse.down();await measureContrast(`patient/${locale}/${theme}/active-primary`);
  await page.mouse.up();if(await page.locator('dialog').evaluate(e=>e.open)) await page.keyboard.press('Escape');
  await page.locator('.global .button').nth(1).hover();await measureContrast(`patient/${locale}/${theme}/hover-secondary`);
  await page.locator('#invalid').focus();await measureContrast(`patient/${locale}/${theme}/focus-invalid`);
  await page.locator('.primary').first().click();check(`dialog opens ${locale}/${theme}`, await page.locator('dialog').evaluate(e=>e.open),null);
  check(`dialog initial focus ${locale}/${theme}`, await page.locator('#close-dialog').evaluate(e=>e===document.activeElement),null);
  await page.keyboard.press('Tab');check(`modal focus contained ${locale}/${theme}`,await page.locator('dialog').evaluate(e=>e.contains(document.activeElement)),null);
  await measureContrast(`patient/${locale}/${theme}/dialog`);
  await page.keyboard.press('Escape');check(`Escape closes & restores ${locale}/${theme}`,await page.locator('.primary').first().evaluate(e=>e===document.activeElement)&& !await page.locator('dialog').evaluate(e=>e.open),null);
  await page.locator('details summary').click();const content=await page.locator('details').innerText();check(`time alternatives ${locale}/${theme}`,content.includes('15:00')&&content.includes('UTC+02:00')&&content.includes(locale==='ar'?'3 مساءً':'3 pm'),null);
}
const extras=[];
for(const role of ['patient','doctor']) for(const locale of ['ar','en']) for(const theme of ['light','dark']) {
  for(const mode of ['text200','lower','wide1920']) {
    const width=mode==='wide1920'?1920:320;await page.setViewportSize({width,height:1000});await open({role,locale,theme,nav:mode==='lower'?'lower':'top',text:mode==='text200'?'200':'100'});
    const m=await metrics();extras.push({role,locale,theme,mode,width,...m,pass:m.scrollWidth<=width&&!m.clipped.length&&!m.smallTargets.length});
    if(mode==='lower') check(`lower DOM order ${role}/${locale}/${theme}`,await page.evaluate(()=>!!(document.querySelector('main').compareDocumentPosition(document.querySelector('.global')) & Node.DOCUMENT_POSITION_FOLLOWING)),null);
  }
}
// Actual keyboard traversal from page start; positions should move in reading order.
await page.setViewportSize({width:390,height:1000});await open({role:'doctor',locale:'ar',theme:'dark'});
const sequence=[];for(let i=0;i<12;i++){await page.keyboard.press('Tab');sequence.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim().slice(0,65)})));}
check('keyboard traversal of twelve in-document stops',sequence.every(x=>['A','BUTTON','SUMMARY','INPUT','SELECT'].includes(x.tag)),sequence);
await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await open({role:'doctor',locale:'ar',theme:'dark'});
check('forced colors and reduced motion render', (await metrics()).scrollWidth<=390, await page.evaluate(()=>({forced:matchMedia('(forced-colors:active)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches})));
await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'none'});
await open({role:'patient',locale:'ar',theme:'light'});
await page.addStyleTag({content:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-block-end:2em!important}'});
check('text spacing override reflow', (await metrics()).scrollWidth<=390,await metrics());
const captures = [
 ['patient','ar','light',1440,'top','100'],['patient','ar','dark',390,'top','100'],
 ['patient','en','light',768,'top','100'],['patient','en','dark',1440,'top','100'],
 ['doctor','ar','light',390,'top','100'],['doctor','ar','dark',1440,'top','100'],
 ['doctor','en','light',1440,'top','100'],['doctor','en','dark',768,'top','100'],
 ['patient','ar','light',320,'lower','100'],['doctor','ar','dark',390,'top','200']
];
const screenshots=[];
for(const [role,locale,theme,width,nav,text] of captures){
  await page.setViewportSize({width,height:1000});await open({role,locale,theme,nav,text});
  const name=`${role}-${locale}-${theme}-${width}-${nav}-${text}.png`;
  if(role==='patient' && locale==='ar' && width===1440) await page.locator('details summary').click();
  await page.screenshot({path:resolve(root,'evidence',name),fullPage:true});
  const bytes=readFileSync(resolve(root,'evidence',name));screenshots.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
// Prove asset failure is visible rather than silently accepting fallback.
await page.route('**/.reference/**', route => route.fulfill({status:404,body:'Missing reference test'}));
await page.goto(url({role:'patient',locale:'ar',theme:'light'}));
await page.waitForFunction(()=>document.documentElement.dataset.assets==='missing');
check('missing-font/logo warning visible',await page.locator('#asset-status').isVisible(),null);
await page.unroute('**/.reference/**');
// Outer gallery control wiring, same local-file rendering model.
await page.goto(`${origin}/gallery.html`);
await page.selectOption('#role','doctor');await page.selectOption('#locale','en');await page.selectOption('#theme','dark');await page.selectOption('#width','768');
await page.frameLocator('#preview').locator('html[data-assets=ready]').waitFor();
check('gallery controls drive specimen',await page.locator('#preview').getAttribute('width')==='768' && await page.frameLocator('#preview').locator('html').getAttribute('lang')==='en',null);
const inputHashes=Object.fromEntries(['gallery.html','gallery.js','specimen.html','specimen.css','specimen.js','prepare-reference.py','reference-manifest.json','qa-browser.mjs'].map(file=>[file,createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex')]));
const report={inputHashes,browser:browser.version(),platform:process.platform,node:process.version,dpr:1,protocol:'In-memory HTTP interception of local files; no listening server or network egress. Managed Chromium blocks file://.',interceptedFiles:[...new Set(intercepted)],date:new Date().toISOString(),layout,extras,checks,contrast:[...contrast.values()],screenshots,exceptions,network,limits:['No native 400% browser zoom','No real device or installed PWA','No real screen reader speech','No Firefox/Safari/physical print','No runtime authorization or API tests']};
report.pass=layout.every(x=>x.pass)&&extras.every(x=>x.pass)&&checks.every(x=>x.pass)&&report.contrast.every(x=>x.ratio>=x.threshold)&&!exceptions.length&&!network.length;
writeFileSync(resolve(root,'evidence/qa-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:report.pass,browser:report.browser,layout:layout.length,layoutFailed:layout.filter(x=>!x.pass),extrasFailed:extras.filter(x=>!x.pass),checksFailed:checks.filter(x=>!x.pass),contrast:contrast.size,contrastFailed:report.contrast.filter(x=>x.ratio<x.threshold),screenshots:screenshots.length,bytes:screenshots.reduce((s,x)=>s+x.bytes,0),exceptions,network},null,2));
await browser.close();if(!report.pass)process.exitCode=1;
