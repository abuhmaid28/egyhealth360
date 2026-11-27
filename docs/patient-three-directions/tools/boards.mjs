/* global document */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const origin=process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const directory='docs/patient-three-directions';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const names={a:'NOVA EVOLUTION',b:'EDITORIAL CARE FUTURE',c:'NEXT-GENERATION CONNECTED CARE'};
const signatures={a:'مدار رقمي · موعد في الصدارة',b:'تكوين تحريري · حروف ومساحات',c:'إطار متصل · مصادر بحدود واضحة'};
for(const size of ['mobile','desktop']){
  const width=size==='mobile'?390:720;
  const sourceWidth=size==='mobile'?390:1440;
  const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مقارنة التصميمات</title><style>@font-face{font-family:Plex;src:url('../assets/plex-arabic-regular.ttf')}@font-face{font-family:Plex;src:url('../assets/plex-arabic-semibold.ttf');font-weight:600}*{box-sizing:border-box}body{margin:0;padding:36px;background:#e8ecea;color:#18322b;font-family:Plex,sans-serif}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}h1{font-size:30px;margin:8px 0}p{font-size:14px;margin:0}header bdi{font-size:12px;letter-spacing:2px}.columns{display:flex;gap:24px;direction:ltr;align-items:flex-start}.candidate{width:${width}px;direction:rtl;flex:none}.caption{border-top:2px solid #18322b;padding:14px 0 18px;min-height:100px}.caption bdi{display:block;font:600 16px Arial,sans-serif;text-align:left;margin-bottom:8px}.caption p{font-size:16px}.candidate img{display:block;width:100%;height:auto;border:1px solid #ccd5cf}footer{margin-top:24px;border-top:1px solid #bac7bf;padding-top:18px;font-size:13px}.grayscale .candidate img{filter:grayscale(1)}</style></head><body><header><div><p>ثلاثة اقتراحات · متابعتي · عربي / RTL</p><h1>${size==='mobile'?'مقارنة الموبايل':'مقارنة الكمبيوتر'}</h1><p>نفس البيانات التجريبية. الاقتراحات لسه محتاجة اختيارك.</p></div><bdi dir="ltr">EGYHEALTH 360 / DESIGN EXPLORATION</bdi></header><div class="columns">${Object.keys(names).map(c=>`<section class="candidate"><div class="caption"><bdi dir="ltr">${c.toUpperCase()} — ${names[c]}</bdi><p>${signatures[c]}</p></div><img src="${c}-ar-${sourceWidth}-full.png" alt="التصميم ${c.toUpperCase()} كامل" /></section>`).join('')}</div><footer>لقطات كاملة من Chromium · ${sourceWidth}px CSS لكل شاشة · مفيش اعتماد نهائي أو تنفيذ للواجهة · الصور الأصلية كاملة متاحة منفصلة</footer></body></html>`;
  await writeFile(`${directory}/evidence/board-${size}-ar.html`,html);
  const page=await browser.newPage({viewport:{width:width*3+120,height:1100},deviceScaleFactor:1});
  await page.goto(`${origin}/${directory}/evidence/board-${size}-ar.html`);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${directory}/evidence/board-${size}-ar.png`,fullPage:true});
  await page.evaluate(()=>document.body.classList.add('grayscale'));
  await page.screenshot({path:`${directory}/evidence/grayscale-${size}.png`,fullPage:true});
  await page.close();
}
await browser.close();
console.log('Two actual-screenshot comparison boards and two grayscale diagnostics rendered.');
