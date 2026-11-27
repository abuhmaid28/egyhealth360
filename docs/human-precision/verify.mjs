/* global document, getComputedStyle, innerWidth, Node, scrollTo */
// Browser proof for the isolated review package; never starts the application.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const root = process.cwd(), folder = resolve(root, 'docs/human-precision');
const inventory = JSON.parse(await readFile(resolve(folder, 'evidence/inventory.json')));
const baseline = inventory.base;
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.ttf':'font/ttf', '.json':'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/')) throw new Error('Outside root');
    const file = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    res.setHeader('Content-Type', types[extname(file)] ?? 'text/plain; charset=utf-8');
    res.end(await readFile(file));
  } catch { res.statusCode=404; res.end('Unavailable'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + '/docs/human-precision/';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ deviceScaleFactor:1, reducedMotion:'reduce' });
const errors=[], external=[], mutations=[], measures=[], keyboard=[], contrasts=[], screenshots=[], interactions=[];
await context.route('**/*', route => {
  if (!route.request().url().startsWith(origin+'/')) { external.push(route.request().url()); return route.abort(); }
  if (route.request().method() !== 'GET') { mutations.push(route.request().method()); return route.abort(); }
  return route.continue();
});
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
async function open(path,width=1440,height=1000) {
  await page.setViewportSize({width,height});
  await page.goto(base+path,{waitUntil:'load'});
  await page.evaluate(() => document.fonts.ready);
}
async function screenshot(name,fullPage=false) {
  await page.screenshot({path:resolve(folder,'evidence',name+'.png'),fullPage});
  screenshots.push({path:'evidence/'+name+'.png',fullPage,viewport:page.viewportSize()});
}
async function measure(path,width,mode='normal') {
  const m=await page.evaluate(() => {
    const over=[...document.querySelectorAll('body *')].filter(el => {
      if (el.closest('dialog:not([open])') || el.classList.contains('skip')) return false;
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width>0 && r.height>0 && s.visibility!=='hidden' && (r.left < -1 || r.right > innerWidth+1);
    }).map(el=>({tag:el.tagName,class:typeof el.className==='string'?el.className:'svg',text:el.textContent.slice(0,70)}));
    const clipped=[...document.querySelectorAll('button,a,input,select,h1,h2,h3,p')].filter(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return r.width>0 && r.height>0 && (s.overflow==='hidden'||s.overflow==='clip') && el.scrollHeight>el.clientHeight+2;
    }).map(el=>el.textContent.slice(0,60));
    return {scrollWidth:document.documentElement.scrollWidth,overflow:over,clipped,fonts:[...document.fonts].filter(f=>f.status==='error').map(f=>f.family),direction:document.documentElement.dir};
  });
  measures.push({path,width,mode,...m});
}
function luminance(rgb) {
  const v=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return v.reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0);
}
function ratio(a,b) {
  const [low,high]=[luminance(a),luminance(b)].sort((x,y)=>x-y);
  return Math.round((high+.05)/(low+.05)*100)/100;
}
async function contrast(path) {
  const pairs=await page.evaluate(()=>{
    const pairs=new Map();
    for (const el of document.querySelectorAll('body *')) {
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      if(!r.width||!r.height||s.visibility==='hidden')continue;
      const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
      if(!text&&!['INPUT','TEXTAREA','SELECT'].includes(el.tagName))continue;
      let p=el,bg='';
      while(p){const b=getComputedStyle(p).backgroundColor;if(b!=='rgba(0, 0, 0, 0)'&&b!=='transparent'){bg=b;break;}p=p.parentElement;}
      const key=s.color+'/'+bg;
      if(!pairs.has(key))pairs.set(key,{foreground:s.color,background:bg,example:text.slice(0,70),tag:el.tagName,disabled:!!el.disabled});
    }
    return [...pairs.values()];
  });
  for(const pair of pairs)contrasts.push({path,...pair,ratio:ratio(pair.foreground,pair.background)});
}
try {
  await mkdir(resolve(folder,'evidence'),{recursive:true});
  for(const item of inventory.screens.filter(x=>x.class.startsWith('product'))) {
    const stem=item.path.replace('.html','');
    const primary=/-(patient|clinician)-/.test(stem);
    for(const width of [1440,768,390,320]) {
      await open(item.path,width,width<500?844:1000);
      await measure(item.path,width);
      if(width===1440)await contrast(item.path);
      if(primary || width===1440 || width===390)await screenshot(stem+'-'+width);
      if(primary && [1440,390].includes(width))await screenshot(stem+'-'+width+'-full',true);
      if(width===390) {
        const mobileActions=await page.locator('#main button:visible').evaluateAll(els=>els.filter(el=>!el.disabled).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
        assert.ok(mobileActions.every(x=>x.width>=44&&x.height>=44),`Mobile target under 44px ${stem}`);
        if(stem.includes('clinician'))assert.equal(await page.locator('#main .note-editor:visible').count(),0,'Phone must not squeeze signing editor');
      }
    }
    // True 200% text enlargement of computed text metrics, without widening containers.
    await open(item.path,390,844);
    await page.evaluate(()=>{
      const items=[...document.querySelectorAll('body *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
      for(const [el,size] of items)el.style.fontSize=(size*2)+'px';
    });
    await measure(item.path,390,'text-200');
    if(primary)await screenshot(stem+'-text-200',true);
    await page.setViewportSize({width:320,height:844});
    await measure(item.path,320,'text-200');
    if(primary)await screenshot(stem+'-text-200-320',true);
    if(stem.includes('patient')){
      assert.equal(await page.locator('.calendar-tile strong').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length;}),1,'Calendar day stays on one line at 200% text / 320px');
    }
    if(primary) {
      await open(item.path,1440,1000);
      // Browser page-zoom analogue: half CSS viewport at doubled pixel scale is
      // separately represented by 720px reflow; text enlargement above is stricter.
      await page.setViewportSize({width:720,height:500});
      await measure(item.path,720,'zoom-200-reflow');
      await open(item.path,1440,1000);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip').evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.slice(0,50),outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));
      assert.equal(focus.outline,'solid');assert.equal(focus.width,'3px');
      keyboard.push({path:item.path,...focus});
      if(stem.includes('clinician')){
        await page.evaluate(()=>document.querySelector('#summary').scrollIntoView());
        const top=await page.locator('.visit-ribbon').evaluate(el=>el.getBoundingClientRect().top);
        assert.ok(top>=-1&&top<100,'Patient context remains visible while scrolling');
        await page.evaluate(()=>scrollTo(0,0));
      }
      if(stem==='h-patient-ar'){await page.locator('.appointment .button').focus();await screenshot('focus-anchor-ar');}
    }
  }
  for(const lang of ['ar','en']) {
    const path=`specimen-${lang}.html`;
    await open(path,1440);
    await screenshot('specimen-'+lang,true);
    const trigger=page.locator('[data-preview="sign"]').first();
    await trigger.focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
    for(let i=0;i<4;i++)await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true,'Dialog focus trap');
    await contrast(path+'#dialog');
    await screenshot('sign-boundary-'+lang);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Focus returns to invoker');
    await page.locator('#specimen-form button').click();
    assert.equal(await page.locator('#specimen-name').getAttribute('aria-invalid'),'true');
    assert.equal(await page.locator('#name-error').isVisible(),true);
    assert.equal(await page.locator('#specimen-name').evaluate(el=>el===document.activeElement),true);
    await page.locator('#specimen-name').fill(lang==='ar'?'اسم افتراضي':'Synthetic name');
    await page.locator('#specimen-form button').click();
    assert.equal(await page.locator('#specimen-name').getAttribute('aria-invalid'),'false');
    assert.ok((await page.locator('#form-result').textContent()).length>0);
    const initial=await page.locator('.density-demo .source-row').first().evaluate(el=>el.getBoundingClientRect().height);
    await page.locator('#density').selectOption('compact');
    assert.ok(await page.locator('.density-demo .source-row').first().evaluate(el=>el.getBoundingClientRect().height)<initial);
    for(const state of ['loading','empty','success','error','denied','unavailable','uncertain','time']) {
      await page.locator('#state').selectOption(state);
      assert.equal(await page.locator('.state-panel:visible').count(),1);
      await contrast(path+'#'+state);
      if(['uncertain','denied','error','time'].includes(state))await screenshot('state-'+state+'-'+lang,true);
      for(const width of [768,390,320]) {
        await page.setViewportSize({width,height:844});
        await measure(path+'#'+state,width);
      }
      await page.setViewportSize({width:1440,height:1000});
    }
    interactions.push({language:lang,dialogEscape:true,focusTrap:true,focusReturn:true,errorAssociation:true,validationFocus:true,validLocalForm:true,density:true,states:8});
  }
  // Verify repeated Cairo times from actual IANA rules rather than illustrative guesses.
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'});
  const ambiguous=['2026-10-29T20:30:00Z','2026-10-29T21:30:00Z'].map(x=>formatter.format(new Date(x)));
  assert.ok(ambiguous[0].includes('23:30')&&ambiguous[1].includes('23:30'));
  assert.ok(ambiguous[0].includes('GMT+03:00')&&ambiguous[1].includes('GMT+02:00'));
  for(const path of ['typography.html','system.html'])for(const width of [1440,768,390,320]) {
    await open(path,width,1000);await measure(path,width);await contrast(path);
    if(width===1440)await screenshot(path.replace('.html',''),true);
  }
  // Screenshots exist before boards are rendered, so the linked images resolve.
  for(const path of ['index.html','compare.html'])for(const width of [1600,768,390,320]) {
    await open(path,width,1000);await measure(path,width);await contrast(path);
    if(width===1600)await screenshot(path.replace('.html',''),true);
  }
  const changed=execFileSync('git',['diff','--name-only',baseline],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  assert.ok(changed.every(x=>['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md'].includes(x)||x.startsWith('docs/human-precision/')),'Unexpected scope change');
  const tracked=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n');
  const protectedFiles=tracked.filter(x=>!['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md'].includes(x));
  for(const file of protectedFiles) {
    const expected=execFileSync('git',['rev-parse',baseline+':'+file],{encoding:'utf8'}).trim();
    const actual=execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim();
    assert.equal(actual,expected,'Preservation '+file);
  }
  const badMeasures=measures.filter(x=>x.scrollWidth>x.width+1||x.overflow.length||x.clipped.length||x.fonts.length);
  const badContrast=contrasts.filter(x=>!x.disabled&&x.ratio<4.5);
  const report={base:baseline,browser:await browser.version(),method:'Actual Chromium; local fonts; external requests blocked; no application runtime',measures,keyboard,interactions,ambiguousCairo:ambiguous,contrasts,screenshots,external,mutations,errors,preservation:{existingFilesByteIdentical:protectedFiles.length,permittedExistingChanges:['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md'],runtimeChanged:false},summary:{measurements:measures.length,screenCaptures:screenshots.length,contrastPairs:contrasts.length,contrastFailures:badContrast.length,reflowFailures:badMeasures.length}};
  await writeFile(resolve(folder,'evidence/browser-results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({summary:report.summary,badMeasures,badContrast,errors,external,mutations,preservation:report.preservation},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);
  assert.deepEqual(badMeasures,[],'Reflow failures');assert.deepEqual(badContrast,[],'Contrast failures');
} finally {await browser.close();await new Promise(done=>server.close(done));}
