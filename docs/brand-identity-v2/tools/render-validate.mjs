/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import {writeFile, readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const dir='docs/brand-identity-v2';
const origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const cases=[],errors=[],external=[],badResponses=[];
try {
  for(const mode of ['full','board']) {
  for(const width of [1440,768,390,320]) {
    for(const multiplier of [1,2]) {
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
      await page.route('**/*',route=>{
        const url=route.request().url();
        if(!url.startsWith(origin+'/')&&!url.startsWith('data:')){external.push(url);return route.abort();}
        return route.continue();
      });
      await page.goto(`${origin}/${dir}/index.html${mode==='board'?'?board=1':''}`,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      const initial=await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      if(multiplier===2)await page.evaluate(()=>{
        const all=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);
        for(const [element,size] of all)element.style.fontSize=`${size*2}px`;
      });
      const measurements=await page.evaluate(()=>({
        viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
        main:document.querySelectorAll('main').length,h1:document.querySelectorAll('h1').length,
        h1Size:parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
        brokenImages:[...document.images].filter(e=>!e.complete||e.naturalWidth===0).map(e=>e.src),
        imageCount:document.images.length,
        clipped:[...document.querySelectorAll('p,h1,h2,small,figcaption,code,span,a,strong')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent.trim().slice(0,80)),
        faviconSizes:[...document.querySelectorAll('.favicons img')].map(e=>({native:e.naturalWidth,css:e.getBoundingClientRect().width})),
      }));
      assert.equal(measurements.documentWidth,width,`overflow at ${width} / ${multiplier}`);
      assert.equal(measurements.main,1);assert.equal(measurements.h1,1);
      assert.equal(measurements.h1Size,initial*multiplier);
      assert.deepEqual(measurements.brokenImages,[]);assert.deepEqual(measurements.clipped,[]);
      for(const size of measurements.faviconSizes)assert.equal(size.native,size.css);
      await page.keyboard.press('Tab');
      const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));
      assert.equal(focus.tag,'A');assert.notEqual(focus.outline,'none');
      if(mode==='board'&&multiplier===1&&[1440,390].includes(width)) {
        await page.locator('h1').click();
        await page.screenshot({path:`${dir}/evidence/owner-${width===1440?'desktop':'mobile'}.png`,fullPage:true});
      }
      cases.push({mode,width,textMultiplier:multiplier,initialH1:initial,...measurements,focus,result:'PASS'});
      await page.close();
    }
  }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(badResponses,[]);
  const palette=JSON.parse(await readFile(`${dir}/evidence/palette.json`,'utf8'));
  const luminance=hex=>hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  for(const pair of palette.contrast){
    const colors=Object.fromEntries(palette.colors.map(c=>[c.name,c.hex]));
    const [a,b]=[luminance(colors[pair.foreground]),luminance(colors[pair.background])].sort((a,b)=>a-b);
    assert(Math.abs(pair.ratio-(b+0.05)/(a+0.05))<1e-12);
    assert.equal(pair.normalText4_5,pair.ratio>=4.5);assert.equal(pair.largeText3,pair.ratio>=3);
  }
  await writeFile(`${dir}/evidence/validation.json`,JSON.stringify({browser:await browser.version(),cases,errors,external,badResponses,palettePairsChecked:palette.contrast.length,textMethod:'Explicitly doubled computed text sizes; not native browser zoom',scope:'Static documentation board only; not production header usability'},null,2)+'\n');
  console.log({cases:cases.length,palettePairs:palette.contrast.length,errors,external,badResponses});
} finally {await browser.close();}
