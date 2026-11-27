/* global document, window, URLSearchParams */
'use strict';
const lang=document.documentElement.lang==='en'?'en':'ar';
const tr=(ar,en)=>lang==='ar'?ar:en;
const params=new URLSearchParams(window.location.search);
const states=['normal','loading','empty','error','no-sources','unavailable'];
const state=states.includes(params.get('state'))?params.get('state'):'normal';
document.body.dataset.previewState=state;
const icon=name=>`<svg class="icon" data-icon="${name}" aria-hidden="true" viewBox="0 0 24 24"><use href="#i-${name}"/></svg>`;
const action=(label,target)=>`<button type="button" class="primary-action" data-preview="${target}"><span>${label}</span><span class="arrow-frame">${icon('arrow')}</span></button>`;
const appointment=document.querySelector('.appointment');
const stateContent={
  loading:{title:tr('بنحمّل مواعيدك','Loading your appointments'),copy:tr('لسه المواعيد ما اتحمّلتش. حالة الحجز هتظهر بعد ما التحميل يكتمل.','Appointments have not loaded yet. Booking status will appear after loading completes.')},
  empty:{title:tr('مفيش ميعاد جاي ظاهر هنا','No upcoming appointment in this view'),copy:tr('مفيش مواعيد جاية في المعلومات المتاحة هنا. تقدر تدور على دكتور.','There are no upcoming appointments in the information available here. You can find care.')},
  error:{title:tr('مواعيدك ما اتحمّلتش','Your appointments could not load'),copy:tr('مش قادرين نعرض حالة مواعيدك دلوقتي. دي مشكلة تحميل، مش معناها إن مفيش مواعيد.','We cannot show your current appointment status. This is a loading failure, not an empty appointments list.')}
};
if(stateContent[state]){
  const c=stateContent[state];
  appointment.classList.add('state-card');
  appointment.setAttribute('aria-busy',state==='loading'?'true':'false');
  appointment.innerHTML=`<div class="appointment-top"><span class="eyebrow">${tr('ميعادك الجاي','Your next appointment')}</span><span class="state-label">${tr('معاينة حالة','State preview')}</span></div><div class="state-content"><h2 id="appointment-title">${c.title}</h2><p ${state==='error'?'role="alert"':''}>${c.copy}</p>${state==='loading'?'<div class="state-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>':''}${state==='empty'?action(tr('دور على دكتور','Find care'),'find'):state==='error'?action(tr('حمّل المواعيد تاني','Reload appointments'),'retry'):''}</div>`;
  document.querySelector('#state-announcer').textContent=c.title;
}
if(state==='no-sources'||state==='unavailable'){
  const shared=document.querySelector('.shared-care');
  const unavailable=state==='unavailable';
  const heading=unavailable?tr('المعلومات المتاحة','Available information'):tr('اللي الدكتور شاركه معاك','What your doctor shared');
  const title=unavailable?tr('المحتوى مش متاح هنا','This content is unavailable here'):tr('لسه مفيش ملخص أو متابعة متاحة ليك هنا','No shared summary or follow-up is available here');
  const copy=unavailable?tr('المحتوى مش متاح في العرض ده. تقدر ترجع للمعلومات المتاحة ليك.','Content is unavailable in this view. You can return to information available to you.'):tr('هنا تقدر تشوف الملخصات والتعليمات اللي اتشاركت معاك بس.','This view shows only summaries and instructions shared with you.');
  shared.innerHTML=`<header class="shared-heading"><h2 id="shared-title">${heading}</h2></header><div class="source-placeholder" aria-labelledby="source-state-title"><span class="source-icon">${icon('summary')}</span><h3 id="source-state-title">${title}</h3><p>${copy}</p></div>`;
}
const sourceAvailable=state!=='no-sources'&&state!=='unavailable';
const dialog=document.querySelector('dialog');
const content=document.querySelector('#preview-content');
const title=document.querySelector('#preview-title');
title.setAttribute('tabindex','-1');
let opener;
const messages={
  appointment:[tr('تفاصيل ميعادك','Appointment details'),tr('<p>د. عمر علي · <bdi dir="ltr">Nile Care Clinic</bdi></p><p>الخميس، <bdi>12</bdi> نوفمبر <bdi>2026</bdi><br>من <bdi dir="ltr">2:30</bdi> لحد <bdi dir="ltr">3:00</bdi> مساءً. الحجز اتأكد.</p><p>التوقيت المعروض هو توقيت العيادة في القاهرة.</p><p>الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. طلب الرعاية الجديد محتاج موافقتك وقبول الدكتور.</p>','<p>Dr Omar Ali · <bdi dir="ltr">Nile Care Clinic</bdi></p><p>Thursday, 12 November 2026<br>2:30 PM – 3:00 PM. Appointment confirmed.</p><p>The displayed time is the clinic’s time in Cairo.</p><p>Booking alone does not give the doctor access to your medical information. A new care request needs your permission and the doctor’s acceptance.</p>')],
  find:[tr('دور على دكتور','Find care'),tr('<p>دي معاينة لشكل البحث عن دكتور. البحث والحجز مش شغّالين هنا.</p>','<p>This previews the find-care destination. Search and booking are not connected here.</p>')],
  followup:[tr('الدكتور رشّح لك متابعة','Follow-up recommendation'),tr('<p>دي توصية من د. عمر علي، اتشاركت معاك يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>، مش حجز ميعاد. لسه مفيش ميعاد مربوط بالمتابعة دي هنا.</p>','<p>Dr Omar Ali shared this recommendation on 5 November 2026. It is not a booked appointment. No appointment is linked to it here.</p>')],
  summary:[tr('ملخص الزيارة','Visit summary'),tr('<p>الدكتور عمر علي شارك ملخص الزيارة يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>. دي معاينة للوصول للملخص بس، من غير محتوى طبي فعلي.</p>','<p>Dr Omar Ali shared the visit summary on 5 November 2026. This only previews access to the shared source, without actual clinical content.</p>')],
  appointments:[tr('مواعيدك','Appointments'),tr('<p>دي معاينة لوجهة المواعيد الجاية والسابقة، من غير تحميل بيانات.</p>','<p>This previews upcoming and past appointment retrieval, without loading data.</p>')],
  summaries:[tr('الملخصات والمتابعة','Summaries and follow-up'),sourceAvailable?tr('<p>دي معاينة للمصادر اللي الدكتور شاركها معاك. الملخص والمتابعة مصدرين منفصلين.</p>','<p>This previews sources your doctor shared. The summary and recommendation remain independent sources.</p>'):tr('<p>المعاينة دي مش بتسترجع محتوى أو بتأكد وجود مصادر غير متاحة ليك.</p>','<p>This preview does not retrieve content or confirm that inaccessible sources exist.</p>')],
  history:[tr('السجل المتاح','Available history'),tr('<p>دي معاينة للي متاح ليك هنا بس، مش سجل طبي شامل.</p>','<p>This previews only information available to you here, not a complete medical record.</p>')],
  retry:[tr('معاينة إعادة تحميل المواعيد','Appointment reload preview'),tr('<p>ده مثال لاستعادة القراءة بس. في المنتج، الإجراء ده هيحمّل المواعيد تاني، مش هيعيد إرسال حجز أو إجراء طبي. المعاينة دي مش بتتصل بخدمة.</p>','<p>This previews read-only recovery. In the product, this would reload appointments, not resubmit a booking or clinical command. This specimen does not contact a service.</p>')]
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-preview]');if(!button)return;
  opener=button;const message=messages[button.dataset.preview];if(!message)return;
  title.textContent=message[0];content.innerHTML=message[1]+tr('<p>دي معاينة بس. مفيش خدمة شغّالة أو حجز أو تغيير في بياناتك.</p>','<p>Preview only. There is no connected service, booking or change to your information.</p>');
  dialog.showModal();
  title.focus();
  dialog.scrollTop=0;
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();document.querySelector('.dialog-close').focus();}});
// Native dialog restores focus synchronously. The queued close event must not
// steal focus from a newer outside control or a subsequently opened dialog.
dialog.addEventListener('close',()=>{
  if(!dialog.open&&(document.activeElement===document.body||dialog.contains(document.activeElement)))opener?.focus();
});
window.validationFixture=Object.freeze({locale:lang,state,synthetic:true,connected:false,appointmentStart:'2026-11-12T14:30:00+02:00',appointmentEnd:'2026-11-12T15:00:00+02:00',timeZone:'Africa/Cairo',sharedProjection:sourceAvailable?'permitted synthetic sources':'no source references or counts projected'});
document.querySelector('.shell').removeAttribute('inert');
document.documentElement.dataset.ready='true';
