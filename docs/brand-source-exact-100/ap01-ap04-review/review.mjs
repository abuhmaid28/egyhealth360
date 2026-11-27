/* global document */
const params = new URL(document.URL).searchParams;
const lang = params.get('lang') === 'ar' ? 'ar' : 'en';
const theme = params.get('theme') === 'light' ? 'light' : 'dark';
const font = params.get('font') === 'noto' ? 'noto' : 'plex';
const role = params.get('role') === 'doctor' ? 'doctor' : 'patient';
const ar = lang === 'ar';
const t = (en, arabic) => ar ? arabic : en;
const num = text => `<bdi dir="ltr" class="number">${text}</bdi>`;
const latin = text => `<bdi dir="ltr" class="latin">${text}</bdi>`;
Object.assign(document.documentElement, { lang, dir: ar ? 'rtl' : 'ltr' });
Object.assign(document.documentElement.dataset, { theme, font, role });
document.querySelector('.skip').textContent = t('Skip to specimen', 'روح للمحتوى');
document.querySelector('.review-bar').setAttribute('aria-label', t('Evidence controls', 'اختيارات المقارنة'));
document.querySelector('#review-note').textContent = t('Evidence only · synthetic content · owner decision pending', 'مقارنة للمراجعة بس · بيانات تجريبية · في انتظار قرار المالك');
document.querySelector('#candidate-label').textContent = `${font === 'plex' ? 'IBM Plex Sans Arabic' : 'Noto Sans Arabic'} 400 / 600 + Inter 400 / 500 / 600 / 700 · ${t('Violet × Apricot A — Balanced', 'البنفسجي والمشمشي — الاختيار المتوازن')}`;
const choices = [
  ['lang', ar ? 'en' : 'ar', ar ? 'English' : 'العربية'],
  ['theme', theme === 'dark' ? 'light' : 'dark', t(theme === 'dark' ? 'Light' : 'Dark', theme === 'dark' ? 'فاتح' : 'داكن')],
  ['font', font === 'plex' ? 'noto' : 'plex', font === 'plex' ? 'Noto Sans Arabic' : 'IBM Plex Sans Arabic'],
  ['role', role === 'patient' ? 'doctor' : 'patient', t(role === 'patient' ? 'Doctor specimen' : 'Patient specimen', role === 'patient' ? 'نموذج الدكتور' : 'نموذج المريض')],
];
document.querySelector('#controls').innerHTML = choices.map(([key, value, label]) => {
  const next = new URL(document.URL); next.searchParams.set(key, value);
  return `<a class="action" ${key === 'lang' ? `lang="${value}"` : ''} href="${next.pathname + next.search}">${label}</a>`;
}).join('');
const date = `${num('10')} ${t('November', 'نوفمبر')} ${num('2026')}`;
const time = `${num('14:30')} — ${t('Cairo time', 'بتوقيت القاهرة')} ${latin('(UTC+02:00)')}`;
const tableLabels = [t('Time', 'الميعاد'), t('Person', 'الشخص'), t('Appointment', 'الحجز')];
const table = `<table><thead><tr>${tableLabels.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${['14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map((clock, i) => `<tr>
  <td data-label="${tableLabels[0]}">${num(clock)}<span class="meta">${date}</span></td>
  <td data-label="${tableLabels[1]}">${t('Sample person', 'شخص تجريبي')} ${num(i + 1)}<span class="meta">${t('Synthetic record', 'سجل تجريبي')}</span></td>
  <td data-label="${tableLabels[2]}">${t('Demonstration booking', 'حجز للعرض')}<span class="meta">${t('No clinical access implied', 'الحجز مش بيدي صلاحية طبية')}</span></td>
</tr>`).join('')}</tbody></table>`;
const details = `<dl>${[
  [t('Record reference', 'مرجع السجل'), latin('DEMO-360-01')],
  [t('Allergies', 'الحساسية'), t('No demonstration entry', 'مفيش بيانات في النموذج')],
  [t('Medical history', 'التاريخ المرضي'), t('Not provided in this specimen', 'مش معروض في النموذج ده')],
  [t('Medical status', 'الحالة الطبية'), t('Unassigned placeholder', 'مكان توضيحي من غير حالة محددة')],
].map(([label, value]) => `<div class="detail"><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
document.querySelector('#app').innerHTML = `
  <header class="brand-header">
    <img src="../assets/compact-${lang}-${theme}.svg" alt="${t('EgyHealth 360', 'إيجي هيلث 360')}" width="190" height="36">
    <span class="tag">${t('Web / PWA review specimen', 'نموذج ويب للمراجعة')}</span>
  </header>
  <main id="main" class="workspace" tabindex="-1">
    <div class="page-heading"><div>
      <p class="eyebrow">${t(role === 'patient' ? 'Patient workspace' : 'Doctor workspace', role === 'patient' ? 'مساحة المريض' : 'مساحة الدكتور')}</p>
      <h1>${t(role === 'patient' ? 'My care' : 'Schedule', role === 'patient' ? 'متابعتي' : 'جدول المواعيد')}</h1>
      <p class="date">${date} · ${t('Demonstration date', 'تاريخ تجريبي')}</p>
    </div><span class="accent">${t('Synthetic sample', 'نموذج تجريبي')}</span></div>
    <div class="layout">
      <div class="stack">
        <section class="card"><h2>${t(role === 'patient' ? 'Your appointments' : 'Demonstration schedule', role === 'patient' ? 'مواعيدك' : 'جدول تجريبي')}</h2>
          ${role === 'doctor' ? `<p class="meta">${t('Times below share Cairo time (UTC+02:00) on this sample date.', 'المواعيد دي بتوقيت القاهرة (UTC+02:00) في التاريخ التجريبي المعروض.')}</p>${table}` : `
          <div class="appointment"><div class="row"><h3>${t('Sample doctor', 'دكتور تجريبي')}</h3><span class="tag">${t('Demonstration booking', 'حجز للعرض')}</span></div>
            <p>${date}</p><p>${time}</p><p class="meta">${t('Sample clinic · no real appointment', 'عيادة تجريبية · مفيش حجز حقيقي')}</p>
            <div class="actions"><button class="primary" id="details-action" aria-describedby="demo-tip">${t('Appointment details', 'تفاصيل الميعاد')}</button><a class="action" href="#medical-info">${t('Available information', 'المعلومات المتاحة')}</a></div>
          </div><p>${t('This specimen demonstrates text only. Booking alone does not grant a doctor access to medical information.', 'النموذج ده لعرض النصوص بس. الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية.')}</p>`}
          <details><summary>${t('About the demonstration', 'عن النموذج التجريبي')}</summary><p class="tip" id="demo-tip" role="note">${t('Tooltip example: these controls do not create or change an appointment.', 'توضيح: الاختيارات دي مش بتحجز ميعاد ومش بتغيّر حجز.')}</p></details>
        </section>
        <section class="card" id="medical-info"><h2>${t('Medical information labels', 'عناوين المعلومات الطبية')}</h2>${details}<p class="meta">${t('Layout placeholders only. No diagnosis, advice or clinical state is assigned.', 'عناوين لتجربة التنسيق بس. مفيش تشخيص أو نصيحة طبية أو حالة طبية محددة.')}</p></section>
        <section class="card"><h2>${t('Shared visit summaries', 'ملخصات الزيارات المتاحة')}</h2><h3>${t('No shared summary in this sample', 'مفيش ملخص متاح في النموذج ده')}</h3><p>${t('An empty demonstration is not evidence about a real care record.', 'النموذج الفاضي مش دليل على محتوى أي سجل رعاية حقيقي.')}</p></section>
      </div>
      <div class="stack">
        <section class="card"><h2>${t('Form typography', 'نصوص النموذج')}</h2>
          <div><label for="sample-reference">${t('Demonstration reference', 'مرجع تجريبي')}</label><input id="sample-reference" dir="ltr" class="latin" value="DEMO-360-01" aria-describedby="reference-help"><p class="meta" id="reference-help">${t('Synthetic reference; no patient data.', 'مرجع تجريبي؛ من غير بيانات شخصية.')}</p></div>
          <div><label for="sample-label">${t('Sample label', 'عنوان تجريبي')}</label><input id="sample-label" value="" aria-invalid="true" aria-describedby="label-error"><p class="error" id="label-error">${t('Error example: enter a label to continue.', 'مثال خطأ: اكتب عنوان علشان تكمّل.')}</p></div>
          <div class="actions"><button class="primary" id="preview-action">${t('Preview text', 'اعرض النص')}</button><button disabled>${t('Save unavailable', 'الحفظ مش متاح')}</button></div>
          <p id="preview-result" class="meta" aria-live="polite">${t('Local display only; no data is saved.', 'عرض محلي بس؛ مفيش بيانات بتتحفظ.')}</p>
        </section>
        <section class="card"><h2>${t('Interface message examples', 'أمثلة رسائل الواجهة')}</h2><p class="meta">${t('Form semantics only; separate from medical statuses.', 'أمثلة للنموذج بس؛ منفصلة عن الحالات الطبية.')}</p>
          <p class="state error">${t('Error: a required label is missing.', 'خطأ: العنوان المطلوب ناقص.')}</p>
          <p class="state warning">${t('Warning: this preview is not saved.', 'تنبيه: المعاينة دي مش محفوظة.')}</p>
          <p class="state success">${t('Success: demonstration text is ready.', 'نجاح: النص التجريبي جاهز.')}</p>
        </section>
        <section class="card"><h2>${t('Appointment chart labels', 'عناوين رسم المواعيد')}</h2><p class="meta">${t('Invented counts for typography only', 'أعداد تجريبية لعرض النصوص بس')}</p><ul class="chart">${[2, 4, 3].map((count, i) => `<li><span>${t(['Morning', 'Afternoon', 'Evening'][i], ['الصبح', 'بعد الضهر', 'المسا'][i])} · ${num(count)}</span><div class="bar" aria-hidden="true" style="width:${count * 20}%"></div></li>`).join('')}</ul></section>
      </div>
    </div>
    <section class="card specimen"><h2>${t('Script and weight comparison', 'مقارنة الحروف والأوزان')}</h2>
      <p class="font-sample ar w400" lang="ar" dir="rtl" id="visible-ar400">مُتابعة واضحة — ميعادك يوم ${num('10')} نوفمبر ${num('2026')}، الساعة ${num('14:30')}.</p>
      <p class="font-sample ar w600" lang="ar" dir="rtl" id="visible-ar600">مُلخّص الزيارة والمعلومات المُتاحة — اتأكد من الدكتور والميعاد.</p>
      ${[400, 500, 600, 700].map(w => `<p class="font-sample en w${w}" lang="en" dir="ltr" id="visible-en${w}">Inter ${w} · Available information · Visit summary · 0123456789</p>`).join('')}
      <p class="meta">${t('Same sizes and spacing for both Arabic candidates: body 16px / 1.85; metadata 14px; headings 20px and 30px. English body 16px / 1.6. No letter spacing or simulated weights.', 'نفس الأحجام والمسافات في الخطّين العربي: النص 16px وتباعد السطور 1.85؛ المعلومات الثانوية 14px؛ العناوين 20px و30px. النص الإنجليزي 16px وتباعد السطور 1.6. من غير تغيير المسافات بين الحروف أو أوزان مصطنعة.')}</p>
    </section>
    <footer>${t('Evidence specimen only. Physical devices, installed PWA, print, assistive technology and final brand approval are outside this proof.', 'نموذج للمراجعة بس. التجربة دي مش بتثبت سلوك الأجهزة الفعلية أو تثبيت التطبيق أو الطباعة أو التقنيات المساعدة، ومش اعتماد نهائي للهوية.')}</footer>
  </main>`;
document.querySelector('#font-probes').innerHTML = `${[400, 600].map(w => `<span id="probe-ar${w}" class="font-sample ar w${w}" lang="ar">مُلخّص الزيارة</span>`).join('')}${[400, 500, 600, 700].map(w => `<span id="probe-en${w}" class="font-sample en w${w}">Visit summary 360</span>`).join('')}`;
document.querySelector('#preview-action').addEventListener('click', () => {
  document.querySelector('#preview-result').textContent = t('Text preview ready. Nothing was saved.', 'معاينة النص جاهزة. مفيش حاجة اتحفظت.');
});
document.querySelector('#details-action')?.addEventListener('click', () => {
  document.querySelector('details').open = true;
});
