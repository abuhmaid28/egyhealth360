/* global document */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
const origin=process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const directory='docs/nova-evolution-refinement';
const baseline='5aad95092a74e5818214c71d4263451b9d28eb86';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const measurements=JSON.parse(await readFile(`${directory}/evidence/browser-results.json`,'utf8'));
const comparison=[];
for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?1050:844},reducedMotion:'reduce'});
  await page.route(`${origin}/__original/**`,route=>{
    const path=new URL(route.request().url()).pathname.replace('/__original/','');
    const body=execFileSync('git',['show',`${baseline}:docs/patient-three-directions/${path}`],{maxBuffer:5*1024*1024});
    const ext=path.split('.').pop();
    return route.fulfill({body,contentType:{html:'text/html',css:'text/css',js:'application/javascript',ttf:'font/ttf',woff2:'font/woff2'}[ext] || 'application/octet-stream'});
  });
  await page.goto(`${origin}/__original/a.html`);
  await page.evaluate(()=>document.fonts.ready);
  const before=await page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    return {appointment:box('.appointment'),action:box('.primary-action'),source:box('.followup'),followupTitle:box('#followup-title'),documentHeight:document.documentElement.scrollHeight};
  });
  await page.goto(`${origin}/${directory}/index.html`);
  await page.evaluate(()=>document.fonts.ready);
  const after=await page.evaluate(()=>{
    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    return {appointment:box('.appointment'),action:box('.primary-action'),source:box('.followup'),followupTitle:box('#followup-title'),documentHeight:document.documentElement.scrollHeight};
  });
  comparison.push({width,before,after,appointmentReductionPercent:Number((100*(before.appointment.height-after.appointment.height)/before.appointment.height).toFixed(1)),primaryActionEarlierPixels:Number((before.action.bottom-after.action.bottom).toFixed(1)),followupTitleEarlierPixels:Number((before.followupTitle.top-after.followupTitle.top).toFixed(1))});
  await page.close();
}
const mobile=comparison[0];
await writeFile(`${directory}/evidence/comparison-metrics.json`,JSON.stringify({browser:browser.version(),source:baseline,method:'Actual browser geometry of pinned original HTML/CSS/fonts fulfilled from Git; screenshots copied byte-identically from that commit. These are layout measurements, not user-research metrics.',comparison,renderCases:measurements.viewports.length},null,2)+'\n');
const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>NOVA — قبل وبعد</title><style>@font-face{font-family:Plex;src:url('../assets/plex-arabic-regular.ttf')}@font-face{font-family:Plex;src:url('../assets/plex-arabic-semibold.ttf');font-weight:600}*{box-sizing:border-box}body{margin:0;background:#eae7ef;color:#2c2238;padding:36px;font-family:Plex,sans-serif}header{display:flex;align-items:center;justify-content:space-between;gap:30px;border-bottom:1px solid #b5a6bf;padding-bottom:24px}h1{font-size:32px;margin:4px 0}p{margin:0;font-size:15px}header bdi{font:600 13px Arial,sans-serif;letter-spacing:2px}.mobile{display:flex;gap:48px;align-items:flex-start;margin-top:28px}.notes{flex:1;padding:58px 0 0 28px}.notes h2{font-size:26px;margin:0 0 16px}.notes p{font-size:18px;line-height:1.9;margin-bottom:18px}.metric{border-block:1px solid #b5a6bf;padding-block:18px;margin-block:26px;font-size:18px}.metric strong{font:600 46px Arial,sans-serif;display:block;margin-bottom:10px}.phones{display:flex;gap:24px;direction:ltr}.phone{width:390px;direction:rtl}.caption{min-height:62px;font-size:18px;font-weight:600}.caption small{display:block;font-size:12px;font-weight:400;color:#65526f}.phone-frame{width:390px;height:844px;overflow:hidden;border:1px solid #a99bb5}.phone img{width:390px;display:block}.desktop{display:flex;gap:24px;direction:ltr;margin-top:36px;padding-top:26px;border-top:1px solid #b5a6bf}.desktop section{width:720px;direction:rtl}.desktop img{display:block;width:720px;height:auto;border:1px solid #a99bb5}footer{padding-top:24px;font-size:13px;color:#65526f}footer bdi{font-family:Arial,sans-serif}</style></head><body><header><div><p>متابعتي · بيانات تجريبية متطابقة · عربي / RTL</p><h1>نفس NOVA. اهتمام أوضح بالتفاصيل.</h1><p>تنقيح الاتجاه المختار مبدئيًا — لسه محتاج قرارك البصري.</p></div><bdi dir="ltr">NOVA EVOLUTION / REFINEMENT 01</bdi></header><div class="mobile"><aside class="notes"><h2>تحسينات واضحة في التكوين</h2><p>ميعاد أقصر على الموبايل، مع الدكتور والتاريخ والساعة والإجراء في تكوين واحد.</p><p>مدار أصغر، وكتابة عربية أوضح. سطح فاتح متدرّج مع مساحة الميعاد، ومصادر منفصلة بنسبتها للدكتور.</p><div class="metric"><strong dir="ltr">${mobile.appointmentReductionPercent}%</strong>تقليل ارتفاع مساحة الميعاد عند عرض <bdi>390px</bdi>.<br>قياس هندسي للتصميم، مش نتيجة بحث مع مستخدمين.</div><p>المواعيد والتوصية والملخص والصلاحيات زي المصدر الأصلي. مفيش خدمات متصلة أو تنفيذ للواجهة.</p></aside><div class="phones"><section class="phone"><div class="caption">قبل · Candidate A الأصلي<small>عرض أول 844px من اللقطة الكاملة · 390px CSS</small></div><div class="phone-frame"><img src="before-ar-390.png" alt="Candidate A الأصلي على الموبايل"></div></section><section class="phone"><div class="caption">بعد · تنقيح NOVA<small>نفس أبعاد العرض · اللقطة الكاملة متاحة منفصلة</small></div><div class="phone-frame"><img src="refined-ar-390-full.png" alt="NOVA المنقّح على الموبايل"></div></section></div></div><div class="desktop"><section><div class="caption">قبل · الكمبيوتر<small>لقطة كاملة عند 1440px · معروضة بنصف الحجم</small></div><img src="before-ar-1440.png" alt="التصميم الأصلي على الكمبيوتر"></section><section><div class="caption">بعد · الكمبيوتر<small>تكوين مخصص للعرض الواسع · نفس البيانات</small></div><img src="refined-ar-1440-full.png" alt="التنقيح على الكمبيوتر"></section></div><footer>المصدر الأصلي: PR #90 · <bdi dir="ltr">${baseline}</bdi> · صور فعلية من Chromium · لا اعتماد نهائي للهوية أو النظام أو التنفيذ.</footer></body></html>`;
await writeFile(`${directory}/evidence/before-after.html`,html);
const page=await browser.newPage({viewport:{width:1536,height:1050},deviceScaleFactor:1,reducedMotion:'reduce'});
await page.goto(`${origin}/${directory}/evidence/before-after.html`);
await page.evaluate(()=>document.fonts.ready);
await page.screenshot({path:`${directory}/evidence/before-after.png`,fullPage:true});
await browser.close();
console.log(JSON.stringify(comparison,null,2));
