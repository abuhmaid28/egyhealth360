/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {writeRecordsReport} from './report.mjs';
const directory='docs/nova-dark-first',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const lum=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const results=[];
for(const locale of ['ar','en'])for(const state of ['normal','loading','empty','error','no-sources','unavailable']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${origin}/${directory}/${locale}.html?state=${state}`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);
  const sample=async phase=>{
    const pairs=await page.evaluate(()=>{
      const parse=s=>s.match(/[\d.]+/g)?.map(Number);
      const bgFor=el=>{
        let p=el;
        while(p){
          const style=getComputedStyle(p),bg=parse(style.backgroundColor);
          // All candidate surfaces are solid; unexpected gradients fail this sampler.
          if(style.backgroundImage!=='none')throw new Error('Unmodelled gradient');
          if(bg&&(bg.length===3||bg[3]===1))return bg;p=p.parentElement;
        }return [7,43,54];
      };
      const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('.sr-only');
      return [...document.querySelectorAll('body *')].filter(visible).flatMap(el=>{
        if(el.closest('svg'))return el.matches('svg.icon')?[{kind:'icon',selector:el.getAttribute('data-icon'),fg:parse(getComputedStyle(el).color),bg:bgFor(el),threshold:3}]:[];
        if(el.closest('[aria-hidden=true]')||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return [];
        return [{kind:'text',selector:el.tagName+'.'+el.className,text:el.textContent.trim().slice(0,70),fg:parse(getComputedStyle(el).color),bg:bgFor(el),threshold:4.5}];
      });
    });
    for(const p of pairs)results.push({locale,state,phase,...p,ratio:Number(contrast(p.fg,p.bg).toFixed(2))});
  };
  await sample('rest');
  for(const button of await page.locator('[data-preview]').all()){
    await button.hover();await page.waitForTimeout(170);await sample('hover:'+await button.getAttribute('data-preview'));
  }
  await page.locator('[data-preview]').first().click();await sample('dialog');
  await page.close();
}
await browser.close();
const pair=(label,fg,bg)=>({label,fg,bg,threshold:3,ratio:Number(contrast(fg,bg).toFixed(2))});
const nonText=[
 pair('focus / canvas and separation gap',[243,205,130],[7,43,54]),
 pair('focus / appointment and dialog',[243,205,130],[11,61,74]),
 pair('focus / source inset',[243,205,130],[9,50,63]),
 pair('active navigation underline / selected fill',[72,213,199],[23,78,92]),
 pair('active navigation boundary / selected fill',[133,170,179],[23,78,92]),
 pair('primary action fill / appointment',[72,213,199],[11,61,74]),
 pair('secondary boundary / surface',[133,170,179],[11,61,74]),
 pair('navigation boundary / hover',[133,170,179],[27,86,100]),
 pair('secondary boundary / hover',[72,213,199],[27,86,100]),
 pair('icon boundary / elevated fill',[133,170,179],[20,77,91])
];
const failures=[...results,...nonText].filter(p=>p.ratio<p.threshold);
const unique=new Map();for(const {phase,...sample} of results){const key=JSON.stringify(sample);if(!unique.has(key))unique.set(key,{...sample,phases:[]});unique.get(key).phases.push(phase);}
const report={method:'Actual rendered AR/EN six states at390; rest, all available hover controls, and modal. Visible direct text4.5:1; original icon strokes3:1. Solid semantic surfaces resolved through ancestor backgrounds. Explicit control boundaries, selected-navigation underline and focus surfaces3:1. This is sampled contrast evidence, not WCAG certification.',observations:results.length,textMinimum:Math.min(...results.filter(p=>p.kind==='text').map(p=>p.ratio)),iconMinimum:Math.min(...results.filter(p=>p.kind==='icon').map(p=>p.ratio)),nonText,exclusions:'Decorative gold date repeat, card/divider rules, inner arrow-frame separator and static loading skeleton carry no sole information or control-boundary meaning. Text labels, icon strokes, action fills and focus/selection are tested.',failures,results:[...unique.values()]};
await writeRecordsReport(`${directory}/evidence/contrast.json`,report,['results']);console.log(JSON.stringify({observations:report.observations,textMinimum:report.textMinimum,iconMinimum:report.iconMinimum,nonText,failures},null,2));assert.deepEqual(failures,[]);
