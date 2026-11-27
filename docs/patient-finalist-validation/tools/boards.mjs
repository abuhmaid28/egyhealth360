/* global document */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const directory='docs/patient-finalist-validation';
const states=['normal','loading','empty','error','no-sources','unavailable'];
const captions={ar:['ميعاد مؤكد','التحميل','مفيش ميعاد جاي في العرض','مشكلة في قراءة المواعيد','مفيش مصادر متاحة','محتوى غير متاح'],en:['Confirmed appointment','Loading','No upcoming appointment','Appointment read failure','No shared sources available','Content unavailable']};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
await mkdir('/workspace/work/patient-finalist/boards',{recursive:true});
for(const locale of ['ar','en']){
  const cards=[];
  for(const [i,state] of states.entries()){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto(`${origin}/${directory}/${locale}.html?state=${state}`);
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);
    const selector=['no-sources','unavailable'].includes(state)?'.shared-care':'.appointment';
    const image=await page.locator(selector).screenshot();
    cards.push(`<section><h2>${captions[locale][i]}</h2><p>${locale==='ar'?(selector==='.appointment'?'منطقة المواعيد':'منطقة المصادر المشتركة'):(selector==='.appointment'?'Appointment region':'Shared-source region')}</p><img src="data:image/png;base64,${image.toString('base64')}" alt="${captions[locale][i]}"></section>`);
    await page.close();
  }
  const html=`<!doctype html><html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><title>NOVA state comparison</title><style>@font-face{font-family:Plex;src:url('${origin}/${directory}/assets/plex-arabic-regular.ttf')}@font-face{font-family:Plex;src:url('${origin}/${directory}/assets/plex-arabic-semibold.ttf');font-weight:600}@font-face{font-family:Manrope;src:url('${origin}/${directory}/assets/manrope.ttf')}*{box-sizing:border-box}body{margin:0;padding:32px;background:#e9e5ef;color:#30243c;font-family:${locale==='ar'?'Plex':'Manrope'},sans-serif}h1{font-size:28px;margin:10px 0}header p{font-size:15px;line-height:1.9;margin:0}header{border-bottom:1px solid #b2a3bf;padding-bottom:22px}.grid{display:grid;grid-template-columns:repeat(3,350px);gap:30px;margin-top:24px}section h2{font-size:19px;line-height:1.7;margin:0}section p{font-size:12px;color:#685472;margin:3px 0 14px}section img{display:block;width:350px;height:auto}footer{border-top:1px solid #b2a3bf;margin-top:24px;padding-top:16px;font-size:13px;line-height:1.9}</style></head><body><header><p dir="ltr">EGYHEALTH 360 / NOVA REFINEMENT 04 / CANDIDATE VALIDATION</p><h1>${locale==='ar'?'حالات متابعتي — مقارنة عربية':'My care states — English comparison'}</h1><p>${locale==='ar'?'مقتطفات كاملة من المنطقة المتأثرة بكل حالة، عند عرض موبايل 390px. اللقطات الطبيعية الكاملة متاحة منفصلة.':'Complete affected-region excerpts from a 390px phone viewport. Full normal-state screens are supplied separately.'}</p></header><div class="grid">${cards.join('')}</div><footer>${locale==='ar'?'بيانات تجريبية · معاينة حالات منفصلة، مش عمليات حقيقية. التحميل مش قائمة فاضية؛ فشل القراءة مش عدم وجود مواعيد؛ المحتوى غير المتاح مش تأكيد لوجود مصدر محمي.':'Synthetic data · separate preview states, not real operations. Loading is not empty; read failure does not mean no appointments; unavailable content does not confirm a protected source exists.'}</footer></body></html>`;
  await writeFile(`/workspace/work/patient-finalist/boards/${locale}.html`,html);
  const board=await browser.newPage({viewport:{width:1174,height:1000},deviceScaleFactor:1});await board.setContent(html);await board.evaluate(()=>document.fonts.ready);await board.screenshot({path:`${directory}/evidence/states-${locale}.png`,fullPage:true});await board.close();
}
await browser.close();console.log('Two actual-browser affected-region state boards rendered; no duplicate full-state PNG files committed.');
