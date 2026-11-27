// Review boards are browser-rendered compositions of actual browser screenshots.
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const title={en:'Two ways to bring care into focus',ar:'اتجاهين لتصميم المتابعة'};
const tiles=(lang,size)=>['interval','relay'].flatMap(direction=>['patient','clinician'].map(role=>{
 const label=lang==='ar'?(role==='patient'?'متابعتي':'الاستشارة الحالية'):(role==='patient'?'My care':'Active consultation');
 const width=size==='desktop'?1440:390;
 const key=`${direction}-${role}-${lang}-${width}`;
 return `<article><div class="tile-label"><b>${direction.toUpperCase()}</b><span>${label}</span></div><a href="${key}-full.png"><img alt="${direction} ${label} ${lang} ${size} actual browser render" src="${key}-viewport.png"></a><p>${size==='desktop'?'1440 × 1000':'390 × 844'} CSS px · ${lang==='ar'?'Arabic / RTL':'English / LTR'}</p></article>`;
})).join('');
const sheet=(lang,size)=>`<section class="sheet ${size}" lang="${lang}"><header><span>EGYHEALTH 360 / DESIGN-ONLY PILOT</span><h1>${title[lang]}</h1><p>${lang==='ar'?'بيانات تجريبية متطابقة · اقتراحات للمراجعة · مفيش اعتماد نهائي أو تنفيذ للمنتج':'Identical synthetic data · proposals for evaluation · no final approval or product implementation'}</p></header><div class="tiles">${tiles(lang,size)}</div><footer>INTERVAL: care-event architecture / RELAY: bounded source sequence · Actual Chromium screenshots · Open full PNG for complete content</footer></section>`;
const style=`*{box-sizing:border-box}body{margin:0;background:#e9edf0;color:#182b34;font:16px Arial,sans-serif}header{padding:36px 40px 26px}header>span{font-size:12px;letter-spacing:2px}h1{font-size:36px;line-height:1.25;margin:14px 0 8px}header p{font-size:15px;margin:0}.sheet[lang=ar] header{direction:rtl;text-align:right}.sheet{background:#edf1f3;padding-bottom:22px;break-after:page}.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;padding:0 40px}.tile-label{display:flex;justify-content:space-between;padding:14px 0 10px;font-size:15px}.tile-label b{letter-spacing:2px}.tiles article{min-width:0}.tiles img{width:100%;height:auto;display:block;border:1px solid #c7d0d5}.tiles p{font-size:12px;margin:8px 0 0}.mobile .tiles{grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}.mobile .tile-label{display:block;line-height:1.8}.mobile .tile-label span{display:block}.mobile .tiles img{min-height:0}footer{padding:20px 40px 0;font-size:12px}@page{size:1600px 1320px;margin:0}@media print{.sheet{width:1600px;height:1320px}.mobile .tiles img{max-height:950px;object-fit:contain;object-position:top}.desktop .tiles img{max-height:500px;object-fit:contain}.sheet{overflow:hidden}}`;
for(const lang of ['en','ar'])for(const size of ['desktop','mobile'])writeFileSync(resolve(root,`evidence/board-${size}-${lang}.html`),`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design comparison — ${size} ${lang}</title><style>${style}</style><body>${sheet(lang,size)}</body></html>`);
writeFileSync(resolve(root,'evidence/owner-review.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>EgyHealth 360 — owner review packet</title><style>${style}</style><body>${['en','ar'].flatMap(lang=>['desktop','mobile'].map(size=>sheet(lang,size))).join('')}</body></html>`);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const origin=process.env.PILOT_ORIGIN || 'http://127.0.0.1:8765';
const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
for(const lang of ['en','ar'])for(const size of ['desktop','mobile']){await page.goto(`${origin}/docs/zero-cost-design-pilot/evidence/board-${size}-${lang}.html`);await page.screenshot({path:resolve(root,`evidence/board-${size}-${lang}.png`),fullPage:true});}
await page.goto(`${origin}/docs/zero-cost-design-pilot/evidence/owner-review.html`);await page.pdf({path:resolve(root,'evidence/owner-review.pdf'),printBackground:true,preferCSSPageSize:true});
await browser.close();console.log('Four actual-browser comparison boards and owner-review.pdf created.');
