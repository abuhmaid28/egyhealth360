/* global document, getComputedStyle, innerWidth -- Playwright browser evaluations */
// Bounded mixed-direction, temporal, text-spacing and rendered-state probes.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const {chromium}=await import(pathToFileURL(resolve(process.env.QA_TOOL_ROOT,'node_modules/playwright/index.mjs')));
const root=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const output={browser:await browser.version(),mixedBidi:[],temporal:[],spacing:[],states:[]};
const base=process.env.QA_BASE_URL??'http://127.0.0.1:8766';
const page=await browser.newPage({viewport:{width:390,height:1000}});
await page.goto(`${base}/screen.html?role=doctor&lang=ar&theme=light`);await page.evaluate(()=>document.fonts.ready);
const values=['Omar Ali','Amoxicillin','1.25 mL','23:30 → 00:30','UTC+02:00','RX-AB12-34','+20 10 1234 5678','care@example.test','Nile Care Clinic'];
output.mixedBidi=await page.evaluate(values=>values.map(value=>{const p=document.createElement('p');p.dir='rtl';p.append('القيمة: ');const bdi=document.createElement('bdi');bdi.dir='ltr';bdi.textContent=value;p.append(bdi);document.body.append(p);const range=document.createRange();range.selectNodeContents(bdi);const result={value,copied:range.toString(),direction:getComputedStyle(bdi).direction,unicodeBidi:getComputedStyle(bdi).unicodeBidi};p.remove();return result;}),values);
for(const r of output.mixedBidi){assert.equal(r.value,r.copied);assert.equal(r.direction,'ltr');assert.equal(r.unicodeBidi,'isolate');}
output.temporal=await page.evaluate(()=>{
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'});
 return ['2026-11-12T13:00:00Z','2026-11-12T13:30:00Z','2026-10-29T20:30:00Z','2026-10-29T21:30:00Z','2026-11-12T21:30:00Z','2026-11-12T22:30:00Z'].map(instant=>({instant,formatted:formatter.format(new Date(instant))}));
});
assert.match(output.temporal[0].formatted,/12 November 2026.*15:00.*GMT\+02:00/);assert.match(output.temporal[1].formatted,/15:30/);
assert.match(output.temporal[2].formatted,/29 October 2026.*23:30.*GMT\+03:00/);assert.match(output.temporal[3].formatted,/29 October 2026.*23:30.*GMT\+02:00/);
assert.match(output.temporal[4].formatted,/12 November 2026.*23:30/);assert.match(output.temporal[5].formatted,/13 November 2026.*00:30/);
for(const role of ['patient','doctor'])for(const lang of ['ar','en'])for(const theme of ['light','dark']){
 await page.goto(`${base}/screen.html?role=${role}&lang=${lang}&theme=${theme}`);await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'body *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
 const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(result.scrollWidth<=result.width);output.spacing.push({role,lang,theme,...result});
}
for(const theme of ['light','dark']){
 await page.goto(`${base}/screen.html?role=doctor&lang=en&theme=${theme}`);await page.evaluate(()=>document.fonts.ready);
 const samples=[['primary','.button.primary'],['secondary','.editor-actions .button:not(.primary)'],['link','.context-shortcut'],['navigation','.global-nav a[aria-current]']];
 for(const[name,selector]of samples){const target=page.locator(selector).first();await target.hover();output.states.push({theme,state:'hover',name,...await target.evaluate(el=>{const s=getComputedStyle(el);return{color:s.color,background:s.backgroundColor,border:s.borderTopColor};})});}
 await page.locator('[data-write-preview]').first().click();output.states.push({theme,state:'disabled',name:'noncommitting action',...await page.locator('dialog button:disabled').evaluate(el=>{const s=getComputedStyle(el);return{color:s.color,background:s.backgroundColor,border:s.borderTopColor,disabled:el.disabled};})});
 await page.keyboard.press('Escape');
}
function luminance(color){const n=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return n[0]*.2126+n[1]*.7152+n[2]*.0722;}
for(const r of output.states){if(r.background==='rgba(0, 0, 0, 0)')continue;const a=luminance(r.color),b=luminance(r.background);r.textContrast=+((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(3);assert.ok(r.textContrast>=4.5);}
output.result='PASS';output.limits='DOM range-copy and computed bidi isolation, not clipboard/assistive speech. Intl validates fixture instants and DST/midnight obligations; alternate appointment screens/formatter are not implemented. Text-spacing is a CSS override, not physical OS/native zoom.';
writeFileSync(resolve(root,'evidence/supplemental.json'),JSON.stringify(output,null,2)+'\n');await browser.close();console.log('Supplemental mixed-direction/temporal/text-spacing/hover-disabled probes PASS.');
