/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
const directory='docs/nova-evolution-refinement-04';
const origin=process.env.SPECIMEN_ORIGIN || 'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(`${origin}/${directory}/index.html`);await page.evaluate(()=>document.fonts.ready);
const main=await page.evaluate(()=>{
  const text=document.body.innerText;
  const markers=[...document.querySelectorAll('.patient-marker,.doctor-marker')];
  const icons=[...document.querySelectorAll('svg.icon')];
  const broken=icons.filter(el=>!document.querySelector(el.querySelector('use').getAttribute('href')));
  return {text,noTechnicalTime:!/(UTC|[+-]0[23]:00|بتوقيت القاهرة|14:30|15:00)/.test(text),noInitials:markers.length===2&&markers.every(el=>!el.textContent.trim()),spriteComplete:icons.length>=20&&broken.length===0,iconCount:icons.length,iconStrokeWidths:[...new Set(icons.map(el=>getComputedStyle(el).strokeWidth))],dateMonthSize:getComputedStyle(document.querySelector('.calendar-month')).fontSize,visiblePrivacy:document.querySelector('.privacy').innerText,disclosure:document.querySelector('.study').innerText,footer:document.querySelector('footer').innerText,sourceOrder:[...document.querySelectorAll('.source')].map(el=>el.className),controls:[...document.querySelectorAll('[data-preview]')].map(el=>el.dataset.preview)};
});
assert.ok(main.noTechnicalTime&&main.noInitials&&main.spriteComplete);
assert.deepEqual(main.iconStrokeWidths,['1.65px']);
assert.equal(main.controls.length,7);
assert.ok(main.text.includes('مش ميعاد محجوز')&&main.text.includes('مربوط بالمتابعة دي هنا')&&main.text.includes('مش متاحة في المعاينة دي'));
const appointment=await page.evaluate(()=>{
  const times=[...document.querySelectorAll('.appointment-when time[datetime*="T"]')].map(el=>({instant:el.dateTime,label:el.innerText}));
  const [start,end]=times.map(t=>new Date(t.instant));
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'numeric',minute:'2-digit',hourCycle:'h12'});
  return {times,zone:document.querySelector('.appointment-when').dataset.timeZone,humanDisplay:document.querySelector('.time-line').innerText,formatted:[format.format(start),format.format(end)],sameInstants:start.toISOString()==='2026-11-12T12:30:00.000Z'&&end.toISOString()==='2026-11-12T13:00:00.000Z',durationMinutes:(end-start)/60000};
});
assert.ok(appointment.sameInstants);assert.equal(appointment.durationMinutes,30);
assert.deepEqual(appointment.times.map(t=>t.label),['2:30','3:00']);
await page.locator('[data-preview=appointment]').click();
const detail=await page.locator('dialog').innerText();
const privacy={main:main.visiblePrivacy,detail,detailPreservesBothApprovals:detail.includes('الحجز لوحده مش بيدي الدكتور صلاحية')&&detail.includes('طلب الرعاية الجديد محتاج موافقتك وقبول الدكتور.')};
assert.ok(privacy.detailPreservesBothApprovals);
await browser.close();
const report={main,appointment,privacy,method:'Actual rendered text, symbolic markers, local sprite references, exact offset-bearing datetime attributes and existing detail preview checked in Chromium. Editorial quality is independently reviewed, not inferred from token matching.',limits:'No native Egyptian participant, assistive, cross-browser or full-state validation.'};
await writeFile(`${directory}/evidence/content-checks.json`,JSON.stringify(report,null,2)+'\n');
console.log('PASS: no visible technical time or initials; shared local icons; exact original instants; human afternoon labels; preserved bilateral care truth and bounded sources.');
