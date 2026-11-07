/* global document, getComputedStyle, innerWidth */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const origin = process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const directory = 'docs/nova-evolution-refinement-03';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const initial = process.argv.includes('--initial');
const report = { browser: browser.version(), source: 'original isolated Arabic HTML/CSS/SVG', viewports: [], interactions: [], requests: [], errors: [], externalRequests: [], failedResponses: [], limitations: ['Arabic only; English visual parity untested', 'Computed 200% text stress, not native browser zoom', 'Chromium emulation, not native device or screen-reader/WCAG conformance testing'] };
await mkdir(`${directory}/evidence`, { recursive: true });
for (const candidate of ['refined']) {
  for (const [width, textScale] of (initial ? [[1440,1],[390,1]] : [[1440,1],[390,1],[320,1],[390,2],[320,2],[1440,2]])) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1050 : 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push({ candidate, error: e.message }));
    page.on('console', m => { if (m.type() === 'error') report.errors.push({ candidate, error: m.text() }); });
    page.on('response', r => { if(r.status() >= 400) report.failedResponses.push({ candidate, url:r.url(), status:r.status() }); });
    await page.route('**/*', route => {
      const url=route.request().url();
      if (!url.startsWith(origin + '/') && !url.startsWith('data:')) { report.externalRequests.push(url); return route.abort(); }
      report.requests.push({candidate,path:url.replace(origin,''),method:route.request().method()});
      return route.continue();
    });
    await page.goto(`${origin}/${directory}/index.html`);
    await page.evaluate(() => document.fonts.ready);
    if (textScale === 2) await page.evaluate(() => {
      const sizes = [...document.querySelectorAll('body, body *:not(svg):not(svg *)')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
      for(const [el,size] of sizes) el.style.fontSize=`${size*2}px`;
      document.body.classList.add('text200');
    });
    const measurements = await page.evaluate(() => {
      const width = innerWidth;
      const visible = el=>el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
      const overflow = [...document.querySelectorAll('main *,header *,footer *')].filter(el=>visible(el) && !el.closest('svg') && !el.classList.contains('orbit')).map(el=>({el,rect:el.getBoundingClientRect()})).filter(({rect})=>rect.left < -1 || rect.right > width+1).map(({el,rect})=>({selector:el.tagName+'.'+el.className,left:rect.left,right:rect.right,text:el.textContent.slice(0,90)}));
      const clipping = [...document.querySelectorAll('h1,h2,h3,p,button,a,small,time,.time-line')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+2 || el.scrollHeight>el.clientHeight+2).map(el=>({selector:el.tagName+'.'+el.className,text:el.textContent.slice(0,90),client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]}));
      const targets = [...document.querySelectorAll('button,a')].filter(el=>visible(el)&&!el.classList.contains('skip')).map(el=>({label:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      const appointment=document.querySelector('.appointment').getBoundingClientRect(); const action=document.querySelector('.primary-action').getBoundingClientRect(); const source=document.querySelector('.source').getBoundingClientRect(); return {appointment:{top:appointment.top,height:appointment.height,bottom:appointment.bottom},action:{top:action.top,bottom:action.bottom},source:{top:source.top},documentWidth:document.documentElement.scrollWidth,viewport:width,height:document.documentElement.scrollHeight,overflow,clipping,targets,rtl:document.documentElement.dir==='rtl',lang:document.documentElement.lang,headings:[...document.querySelectorAll('h1')].length,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,status:f.status})),motion:getComputedStyle(document.documentElement).scrollBehavior,timezone:new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',timeZoneName:'longOffset',hour:'2-digit',hour12:false}).format(new Date('2026-11-12T14:30:00+02:00'))};
    });
    report.viewports.push({candidate,width,textScale,...measurements});
    if (textScale === 1 && width !== 320) await page.screenshot({ path:`${directory}/evidence/${candidate}-ar-${width}-full.png`, fullPage: true });
    if (textScale === 2 && (measurements.overflow.length || measurements.clipping.length)) await page.screenshot({ path:`/workspace/work/${candidate}-${width}-text200-diagnostic.png`,fullPage:true });
    if (!initial && textScale===1 && width===390) {
      await page.keyboard.press('Tab');
      const skip = await page.evaluate(()=>({class:document.activeElement.className,outline:getComputedStyle(document.activeElement).outlineStyle,top:document.activeElement.getBoundingClientRect().top}));
      await page.keyboard.press('Enter');
      const skipTarget=await page.evaluate(()=>document.activeElement.id);
      const actions=[];
      for (const button of await page.locator('[data-preview]').all()) {
        await button.focus();
        const focus=await button.evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));
        await page.keyboard.press('Enter');
        const open=await page.locator('dialog').evaluate(el=>el.open);
        await page.keyboard.press('Tab');
        const trapped=await page.evaluate(()=>!!document.activeElement.closest('dialog'));
        await page.keyboard.press('Shift+Tab');
        const reverseTrapped=await page.evaluate(()=>!!document.activeElement.closest('dialog'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(el => document.activeElement === el, await button.elementHandle());
        const returned=await button.evaluate(el=>document.activeElement===el);
        actions.push({label:await button.textContent(),focus,open,trapped,reverseTrapped,returned});
      }
      report.interactions.push({candidate,skip,skipTarget,actions});
    }
    await page.close();
  }
}
await browser.close();
await writeFile(`${directory}/evidence/${initial?'initial-measurements':'browser-results'}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({browser:report.browser,cases:report.viewports.length,errors:report.errors,external:report.externalRequests,failedResponses:report.failedResponses,layouts:report.viewports.map(v=>({candidate:v.candidate,width:v.width,textScale:v.textScale,height:v.height,overflow:v.overflow.length,clipping:v.clipping.length,fonts:v.fonts}))},null,2));
