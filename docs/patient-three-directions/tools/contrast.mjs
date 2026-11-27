/* global document, getComputedStyle */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const origin=process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const directory='docs/patient-three-directions';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
function luminance(rgb){return rgb.slice(0,3).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
function ratio(fg,bg){const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
const results=[];
for(const candidate of ['a','b','c']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${origin}/${directory}/${candidate}.html`);
  await page.evaluate(()=>document.fonts.ready);
  const pairs=await page.evaluate(()=>{
    const parse=s=>s.match(/[\d.]+/g).map(Number);
    const result=[];
    for(const el of document.querySelectorAll('body *')){
      if(!el.getClientRects().length || el.closest('svg,[aria-hidden=true],dialog') || ![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()))continue;
      let ancestor=el,bg;
      while(ancestor){const color=parse(getComputedStyle(ancestor).backgroundColor);if(color.length===3 || color[3]===1){bg=color;break;}ancestor=ancestor.parentElement;}
      if(bg)result.push({selector:el.tagName+'.'+el.className,foreground:parse(getComputedStyle(el).color),background:bg,text:el.textContent.trim().slice(0,80)});
    }
    return result;
  });
  for(const pair of pairs)results.push({candidate,...pair,ratio:Number(ratio(pair.foreground,pair.background).toFixed(2)),threshold:4.5});
  await page.locator('.primary-action').click();
  const focus=await page.locator('.dialog-close').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
  results.push({candidate,selector:'.dialog-close',foreground:focus.fg,background:focus.bg,ratio:Number(ratio(focus.fg.match(/[\d.]+/g).map(Number),focus.bg.match(/[\d.]+/g).map(Number)).toFixed(2)),threshold:4.5});
  await page.close();
}
// A's radial gradient is not represented by computed backgroundColor: inspect the lightest authored endpoint explicitly.
for(const fg of [[255,255,255],[212,203,232],[201,192,221],[221,255,135]])results.push({candidate:'a',selector:'appointment gradient light endpoint',foreground:fg,background:[64,51,105],ratio:Number(ratio(fg,[64,51,105]).toFixed(2)),threshold:4.5});
const focusPairs=[{candidate:'a',fg:[225,255,123],bg:[16,14,36]},{candidate:'b',fg:[166,52,30],bg:[246,242,232]},{candidate:'c',fg:[21,94,77],bg:[240,246,242]}].map(p=>({...p,ratio:Number(ratio(p.fg,p.bg).toFixed(2)),threshold:3}));
await browser.close();
const report={method:'WCAG sRGB text ratios from visible direct text and nearest opaque CSS ancestor; explicit radial-gradient endpoint and candidate focus pairs. Sampling is not WCAG certification.',observations:results.length,minimum:Math.min(...results.map(r=>r.ratio)),failures:results.filter(r=>r.ratio<r.threshold),focusPairs,results};
await writeFile(`${directory}/evidence/contrast.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({observations:report.observations,minimum:report.minimum,failures:report.failures,focusPairs},null,2));
