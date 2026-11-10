/* global document, location, URLSearchParams, iconPaths, matchMedia */
/* Isolated review surface. No API, storage, submission, theme preference or clinical command. */
const params = new URLSearchParams(location.search);
const ar = params.get('lang') !== 'en';
const doctor = params.get('role') === 'doctor';
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const t = (arabic, english) => ar ? arabic : english;
const icon = (name, directional = false) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${directional ? ' class="directional"' : ''}>${iconPaths[name]}</svg>`;
const name = t('د. ليلى أحمد عبد الرحمن','Dr Layla Ahmed Abdelrahman');
const patient = t('نور أحمد عبد الله','Nour Ahmed Abdallah');
const clinic = t('عيادة النيل • المعادي','Nile Clinic • Maadi');
const date = t('الخميس، 12 نوفمبر 2026','Thursday, 12 November 2026');
const preciseDate = t('12 نوفمبر 2026','12 November 2026');
document.documentElement.lang = ar ? 'ar' : 'en';
document.documentElement.dir = ar ? 'rtl' : 'ltr';
document.documentElement.dataset.theme = theme;
document.documentElement.style.fontSize = params.get('text') === '200' ? '32px' : '16px';
document.title = `${t('إيجي هيلث 360','EgyHealth 360')} — ${doctor ? t('الاستشارة الحالية','Active consultation') : t('متابعتي','My care')}`;

const nav = doctor ? [[t('جدول المواعيد','Schedule'),'calendar-days'],[t('مرضاي','People in your care'),'users']] : [[t('متابعتي','My care'),'calendar-days'],[t('دور على دكتور','Find care'),'search']];
const previewLink = (label, cls = 'text-link', symbol = 'arrow-up-right') => `<a href="#review" class="${cls}" data-preview="${label}">${label}${icon(symbol,true)}</a>`;
const header = `<a class="skip" href="#main">${t('روح للمحتوى','Skip to content')}</a><header class="masthead"><div class="shell masthead-inner"><a class="brand" href="#main" aria-label="${t('إيجي هيلث 360 — الصفحة الحالية','EgyHealth 360 — current page')}"><img src=".reference/${ar?'ar':'en'}-${theme}.svg" width="188" height="52" alt="${t('إيجي هيلث 360','EgyHealth 360')}"></a><nav class="global-nav" aria-label="${t('التنقل الرئيسي','Main navigation')}">${nav.map(([label,symbol],i)=>`<a href="${i===0?'#main':'#review'}"${i===0?` aria-current="${doctor?'location':'page'}"`:` data-preview="${label}"`}>${icon(symbol)}<span>${label}</span></a>`).join('')}</nav><div class="account"><span class="account-name subtle">${doctor?name:t('نور أحمد','Nour Ahmed')}</span><button data-preview="${t('الحساب','Account')}" aria-label="${t('افتح حسابك','Open your account')}"><span class="avatar" aria-hidden="true">${doctor?t('ل أ','LA'):t('ن أ','NA')}</span></button></div></div></header>`;

function patientScreen() {
  const row = (symbol,label,helper='') => `<a class="care-row" href="#review" data-preview="${label}">${icon(symbol)}<span><strong>${label}</strong>${helper?`<small>${helper}</small>`:''}</span>${icon('chevron-right',true)}</a>`;
  return `<main id="main" class="shell patient-page" tabindex="-1">
    <div class="intro"><div><div class="eyebrow">${t('أهلًا يا نور','Hello, Nour')}</div><h1>${t('متابعتك، خطوة بخطوة','Your care, one step at a time')}</h1></div><div class="intro-date subtle">${icon('calendar-days')}<span>${t('10 نوفمبر 2026','10 November 2026')}</span></div></div>
    <div class="patient-layout">
      <section class="appointment" aria-labelledby="appointment-title">
        <div class="appointment-top"><h2 id="appointment-title">${t('ميعادك الجاي','Your next appointment')}</h2><span class="status">${icon('calendar-check-2')}${t('الحجز اتأكد','Booking confirmed')}</span></div>
        <div class="appointment-main">
          <div class="date-tile"><bdi class="day">12</bdi><span class="month">${t('نوفمبر 2026','November 2026')}</span><span class="weekday subtle">${t('الخميس','Thursday')}</span></div>
          <div><h3 class="appointment-name">${name}</h3><p class="specialty">${t('دكتور باطنة','Internal medicine')}</p><p class="time">${t('3 مساءً','3 pm')} <span class="subtle">${t('بتوقيت القاهرة','Cairo time')}</span></p><p class="detail-line subtle">${icon('clock-3')}<span>${t('لحد 3:30 مساءً','Until 3:30 pm')}</span></p><p class="detail-line">${icon('map-pin')}<span>${clinic}</span></p></div>
        </div>
        <div class="appointment-bottom"><button class="button primary" data-appointment>${t('شوف تفاصيل الميعاد','View appointment details')}${icon('arrow-up-right',true)}</button></div>
      </section>
      <section class="care-index" aria-labelledby="care-index-title">
        <div class="section-heading"><h2 id="care-index-title">${t('متابعتك والسجل المتاح','Your care & available history')}</h2></div>
        ${row('notebook-pen',t('الملخصات والمتابعة','Summaries & follow-up'),t('مفيش ملخصات مشتركة في العرض الحالي.','No shared summaries in this view.'))}
        ${row('calendar-days',t('مواعيدك','Appointments'))}
        ${row('file-text',t('روشتاتك','Prescriptions'))}
        ${row('clock-3',t('السجل المتاح','Available history'))}
        ${row('users',t('دكاترتي','Your doctors'),t('حسب صلاحية الرعاية الحالية.','Under current care access.'))}
        <p class="care-permission">${t('سماحك وقبول الدكتور مطلوبين لطلب الرعاية الجديد. الحجز لوحده مش بيدي صلاحية طبية.','New care requests need your permission and the doctor’s acceptance. Booking alone grants no clinical access.')}</p>
      </section>
    </div>
    <footer class="patient-footer"><span class="brand-cue"><i class="brand-dot" aria-hidden="true"></i>${t('المعلومات المشتركة معاك بس هي اللي بتظهر هنا.','Only information shared with you appears here.')}</span><span>${t('عرض توضيحي','Demonstration')}</span></footer>
  </main>`;
}

function doctorScreen() {
  const localTask = (id,label,symbol,current=false) => `<a href="#${id}" data-task="${id}"${current?' aria-current="location"':''}>${icon(symbol)}<span>${label}</span></a>`;
  return `<main id="main" class="shell consultation" tabindex="-1">
    <div class="intro"><div><a class="crumb" href="#review" data-preview="${t('جدول المواعيد','Schedule')}">${icon('arrow-left',true)}${t('جدول المواعيد','Schedule')}</a><h1>${t('الاستشارة الحالية','Active consultation')}</h1></div><span class="status">${icon('clock-3')}${t('الاستشارة مفتوحة','Consultation open')}</span></div>
    <section class="visit-anchor" aria-label="${t('المريض والزيارة وصلاحية الرعاية','Patient, visit and care access')}">
      <div class="patient-identity"><span class="avatar" aria-hidden="true">${t('ن أ','NA')}</span><div><h2>${patient}</h2><p class="visit-specifics">${date} • <bdi dir="ltr">15:00–15:30</bdi></p><p class="visit-specifics">${clinic} • <bdi dir="ltr">Africa/Cairo (UTC+02:00)</bdi></p><p class="visit-specifics">${name}</p></div></div>
      <div class="authority">${icon('shield-check')}<div><strong>${t('صلاحية الرعاية الحالية سارية','Current care access is active')}</strong><p>${t('صلاحية الرعاية مستقلة عن الحجز.','Care access is separate from booking.')}</p><details class="authority-details"><summary>${t('تفاصيل صلاحية الرعاية','Care access details')}${icon('chevron-down')}</summary><p>${t('سماح المريض وقبول الدكتور قائمين. الصلاحية الحالية مطلوبة لكل قراءة وإجراء؛ الحجز أو التوثيق السابق مش صلاحية دائمة.','Patient permission and doctor acceptance are current. Every read and action requires current access; booking or earlier authorship is not permanent authority.')}</p></details></div></div>
    </section>
    <nav class="local-nav" aria-label="${t('مهام الزيارة الحالية','Current consultation tasks')}">
      ${localTask('documentation',t('التوثيق','Documentation'),'notebook-pen',true)}
      ${localTask('follow-up',t('تعليمات المتابعة','Follow-up'),'calendar-days')}
      ${localTask('review-close',t('المراجعة والإغلاق','Review & close'),'file-text')}
    </nav>
    <div class="workspace">
      <nav class="outline" aria-label="${t('أقسام التوثيق','Documentation sections')}"><a href="#documentation" aria-current="location">${t('الملاحظة الخاصة','Private note')}</a><a href="#summary">${t('ملخص الزيارة','Visit summary')}</a><a href="#history">${t('السجل الموقّع','Signed history')}</a></nav>
      <div class="task-plane">
        <details class="context-disclosure"><summary id="context-opener">${icon('circle-help')}<span><strong>${t('سياق الزيارة ومصادرها','Visit context & sources')}</strong><small>${t('الحساسية: لم تُراجع بعد','Allergies: not reviewed')}</small></span>${icon('chevron-down')}</summary><div id="context-slot"></div></details>
        <div data-task-panel="documentation">
          <section class="editor" id="documentation" tabindex="-1" aria-labelledby="documentation-title">
            <div class="editor-heading"><div><div class="audience">${icon('lock-keyhole')}${t('خاصة بالدكتور المعالج','Private to the treating doctor')}</div><h2 id="documentation-title">${t('الملاحظة الخاصة','Private note')}</h2></div><span class="draft-label">${t('غير محفوظة','Unsaved')}</span></div>
            <div class="editor-content"><label class="field-label" for="private-note">${t('توثيق الزيارة','Visit documentation')}</label><p class="field-help" id="note-help">${t('الملاحظة الخاصة مش بتظهر للمريض. ملخص الزيارة مصدر منفصل.','The private note is not visible to the patient. The visit summary is a separate source.')}</p><textarea class="writing-field" id="private-note" aria-describedby="note-help note-local" spellcheck="false">${t('سبب الزيارة والملاحظات:\n\nالمشكلات والتقييم:\n\nالخطة والتوثيق:','Reason for visit and findings:\n\nProblems and assessment:\n\nPlan and documentation:')}</textarea><div class="field-meta"><span id="note-local">${t('التغييرات لسه مش محفوظة','Changes have not been saved')}</span><span>${icon('lock-keyhole')}${t('مصدر خاص','Private source')}</span></div><div class="editor-actions"><button class="button primary" data-write-preview="${t('حفظ مسودة الملاحظة','Save private note draft')}">${t('احفظ مسودة الملاحظة','Save private note draft')}</button><button class="button" data-write-preview="${t('مراجعة وتوقيع الملاحظة الخاصة','Review & sign private note')}">${t('راجع ووقّع الملاحظة','Review & sign note')}</button></div><p class="editor-note">${t('التوقيع بيخص الملاحظة دي فقط، ومش بيشاركها مع المريض.','Signing applies only to this note and does not share it with the patient.')}</p></div>
          </section>
          <section class="continued-section" id="summary" tabindex="-1"><h2>${t('ملخص الزيارة','Visit summary')}</h2><p>${t('مصدر منفصل للمريض. المشاركة محتاجة مراجعة وتوقيع وإصدار صريح.','A separate patient-facing source. Sharing requires explicit review, signing and release.')}</p>${previewLink(t('افتح ملخص الزيارة','Open visit summary'))}</section>
          <section class="continued-section" id="history" tabindex="-1"><h2>${t('السجل الموقّع','Signed history')}</h2><p>${t('مفيش مصادر موقّعة معروضة في الزيارة دي.','No signed sources are displayed for this visit.')}</p></section>
        </div>
        <section class="task-panel editor" data-task-panel="follow-up" id="follow-up" tabindex="-1" aria-labelledby="follow-up-title" hidden><div class="editor-heading"><div><div class="audience">${icon('file-text')}${t('مصدر منفصل للمريض','Separate patient-facing source')}</div><h2 id="follow-up-title">${t('تعليمات المتابعة','Follow-up instructions')}</h2></div></div><div class="editor-content"><p class="panel-state">${t('لم تُصدر للمريض','Not released to patient')}</p><p>${t('إصدار المتابعة مش بيحجز ميعاد، ومش بيصدر ملخص الزيارة.','Releasing follow-up does not book an appointment or release the visit summary.')}</p><button class="button" data-write-preview="${t('مراجعة تعليمات المتابعة','Review follow-up instructions')}">${t('راجع تعليمات المتابعة','Review follow-up instructions')}</button></div></section>
        <section class="task-panel editor" data-task-panel="review-close" id="review-close" tabindex="-1" aria-labelledby="review-close-title" hidden><div class="editor-heading"><h2 id="review-close-title">${t('المراجعة والإغلاق','Review & close')}</h2></div><div class="editor-content"><p>${t('الإغلاق نهائي. مش بيحفظ تعديلاتك، ومش بيوقّع الملاحظات أو بيشارك الملخص والمتابعة.','Closing is irreversible. It does not save changes, sign notes, or release the summary or follow-up.')}</p><button class="button" data-write-preview="${t('مراجعة إغلاق الاستشارة','Review consultation closure')}">${t('راجع قبل الإغلاق','Review before closing')}</button></div></section>
      </div>
      <aside class="source-context" id="context" tabindex="-1" aria-labelledby="context-title"><div class="context-identity"><strong>${patient}</strong><p>${preciseDate} • <bdi dir="ltr">15:00–15:30</bdi></p><p><bdi dir="ltr">Africa/Cairo (UTC+02:00)</bdi></p><p>${t('صلاحية الرعاية الحالية سارية؛ مستقلة عن الحجز.','Current care access active; separate from booking.')}</p></div><h2 id="context-title">${t('سياق الزيارة ومصادرها','Visit context & sources')}</h2><p>${t('كل مصدر له حالة وإجراء مستقل.','Each source has its own state and action.')}</p>
        <div class="source-state"><span class="state-name">${icon('circle-help')}${t('مراجعة الحساسية','Allergy review')}</span><p>${t('لم تُراجع بعد','Not reviewed')}</p><p>${t('ده مش معناه عدم وجود حساسية.','This does not mean no allergies.')}</p></div>
        <div class="source-state"><span class="state-name">${icon('lock-keyhole')}${t('الملاحظة الخاصة','Private note')}</span><p>${t('تغييرات غير محفوظة','Unsaved changes')}</p></div>
        <div class="source-state"><span class="state-name">${icon('file-text')}${t('ملخص المريض','Patient summary')}</span><p>${t('لم يُصدر للمريض','Not released to patient')}</p></div>
        <div class="source-state"><span class="state-name">${icon('calendar-days')}${t('تعليمات المتابعة','Follow-up instructions')}</span><p>${t('لم تُصدر للمريض','Not released to patient')}</p></div>
        <button class="button context-return" type="button">${t('ارجع لمهمة الزيارة','Return to visit task')}</button>
      </aside>
    </div><footer class="consultation-footer">${t('عرض توضيحي','Demonstration')}</footer>
  </main>`;
}

document.querySelector('#app').innerHTML = `<div class="asset-warning" hidden role="alert" id="asset-warning">Pinned Brand inputs missing. Run prepare-reference.py before visual review.</div>${header}${doctor ? doctorScreen() : patientScreen()}<dialog id="review-dialog" aria-labelledby="dialog-title"><h2 id="dialog-title"></h2><div id="dialog-content"></div><button class="button" autofocus id="dialog-close">${t('ارجع للشاشة','Back to screen')}</button></dialog>`;
const dialog = document.querySelector('#review-dialog');
// Reparent actual DOM nodes at the content threshold; visual and focus order agree.
const narrow = matchMedia('(max-width:899px)');
function arrangeNarrowLayout(){
  const masthead=document.querySelector('.masthead-inner');
  const account=document.querySelector('.account');
  const globalNav=document.querySelector('.global-nav');
  if(narrow.matches)masthead.insertBefore(account,globalNav);else masthead.append(account);
  if(!doctor)return;
  const source=document.querySelector('#context');
  const disclosure=document.querySelector('.context-disclosure');
  if(narrow.matches)document.querySelector('#context-slot').append(source);
  else{disclosure.open=false;document.querySelector('.workspace').append(source);}
}
arrangeNarrowLayout();
narrow.addEventListener('change',arrangeNarrowLayout);
if(doctor){
  const taskIds=['documentation','follow-up','review-close'];
  function showTaskFromHash(){
    const fragment=location.hash.slice(1);
    const task=taskIds.includes(fragment)?fragment:'documentation';
    document.querySelectorAll('[data-task-panel]').forEach(el=>{el.hidden=el.dataset.taskPanel!==task;});
    document.querySelectorAll('[data-task]').forEach(el=>{if(el.dataset.task===task)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');});
    document.querySelector('.outline').hidden=task!=='documentation';
  }
  document.querySelectorAll('[data-task],.outline a').forEach(el=>el.addEventListener('click',()=>{
    // Click of the current hash also restores its task after following a section anchor.
    const id=el.getAttribute('href').slice(1);
    if(taskIds.includes(id))document.querySelectorAll('[data-task-panel]').forEach(panel=>{panel.hidden=panel.dataset.taskPanel!==id;});
  }));
  globalThis.addEventListener('hashchange',showTaskFromHash);
  showTaskFromHash();
  document.querySelector('.context-return').addEventListener('click',()=>{
    document.querySelector('.context-disclosure').open=false;
    const opener=document.querySelector('#context-opener');opener.focus();opener.scrollIntoView({block:'start'});
  });
}
let opener;
function openDialog(button, title, content) {
  opener = button;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-content').innerHTML = content;
  dialog.showModal();
  document.querySelector('#dialog-close').focus();
}
document.querySelector('#dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=items[0],last=items.at(-1);
  if((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){
    event.preventDefault();(event.shiftKey?last:first)?.focus();
  }
});
document.querySelector('[data-appointment]')?.addEventListener('click',e=>openDialog(e.currentTarget,t('تفاصيل ميعادك','Your appointment details'),`<p><strong>${name}</strong></p><dl><dt>${t('التاريخ','Date')}</dt><dd>${date}</dd><dt>${t('بداية الميعاد','Appointment starts')}</dt><dd>${t('3 مساءً','3 pm')}</dd><dt>${t('نهاية الميعاد','Appointment ends')}</dt><dd>${t('3:30 مساءً','3:30 pm')}</dd><dt>${t('العيادة','Clinic')}</dt><dd>${clinic}</dd><dt>${t('المنطقة الزمنية للعيادة في التاريخ ده','Clinic time zone on this date')}</dt><dd><bdi dir="ltr">Africa/Cairo (UTC+02:00)</bdi></dd></dl><p>${t('الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية.','Booking alone does not give the doctor access to your medical information.')}</p>`));
document.querySelectorAll('[data-preview]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openDialog(el,el.dataset.preview,`<p>${t('معاينة تصميم. الوجهة دي خارج الشاشتين المعروضتين للمراجعة.','Design preview. This destination is outside the two screens in this review.')}</p>`);}));
document.querySelectorAll('[data-write-preview]').forEach(el=>el.addEventListener('click',()=>openDialog(el,el.dataset.writePreview,`<p>${t('معاينة تصميم فقط. مفيش حفظ أو توقيع أو إصدار أو إغلاق في المعاينة دي.','Design preview only. Saving, signing, releasing and closing are unavailable here.')}</p><p><strong>${patient}</strong><br>${preciseDate} • <bdi dir="ltr">15:00–15:30 · Africa/Cairo (UTC+02:00)</bdi></p><button class="button" disabled>${t('الإجراء غير متاح في المعاينة','Action unavailable in preview')}</button>`)));
document.querySelector('.brand img').addEventListener('error',()=>{document.querySelector('#asset-warning').hidden=false;});
Promise.all([document.fonts.load('400 16px Inter'),document.fonts.load('600 16px Plex')]).then(()=>{document.body.dataset.fontsReady='true';}).catch(()=>{document.querySelector('#asset-warning').hidden=false;});
