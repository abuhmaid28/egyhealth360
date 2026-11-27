/* global document */
'use strict';
const dialog = document.querySelector('dialog');
const content = document.querySelector('#preview-content');
const title = document.querySelector('#preview-title');
let opener;
const messages = {
  appointment: ['تفاصيل ميعادك', '<p>د. عمر علي · <bdi dir="ltr">Nile Care Clinic</bdi></p><p>الخميس، <bdi>12</bdi> نوفمبر <bdi>2026</bdi><br>من <bdi dir="ltr">2:30</bdi> لحد <bdi dir="ltr">3:00</bdi> مساءً. الحجز اتأكد.</p><p>التوقيت المعروض هو توقيت العيادة في القاهرة.</p><p>الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. طلب الرعاية الجديد محتاج موافقتك وقبول الدكتور.</p>'],
  find: ['دور على دكتور', '<p>دي معاينة لشكل البحث عن دكتور. البحث والحجز مش شغّالين هنا.</p>'],
  followup: ['الدكتور رشّح لك متابعة', '<p>دي توصية من د. عمر علي، اتشاركت معاك يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>، مش حجز ميعاد. لسه مفيش ميعاد مربوط بالمتابعة دي هنا.</p>'],
  summary: ['ملخص الزيارة', '<p>الدكتور عمر علي شارك ملخص الزيارة يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>. المعاينة دي مفيهاش محتوى طبي حقيقي.</p>'],
  appointments: ['مواعيدك', '<p>دي معاينة لقائمة مواعيدك الجاية والسابقة. القائمة مش شغّالة هنا.</p>'],
  summaries: ['الملخصات والمتابعة', '<p>الملخص وتوصية المتابعة منفصلين عن بعض. دي معاينة بس، مفيهاش معلومات طبية حقيقية.</p>'],
  history: ['السجل المتاح', '<p>هنا بتشوف بس اللي متاح ليك، مش سجلك الطبي بالكامل. المعاينة مش بتفتح سجل فعلي.</p>'],
  generic: ['معاينة التصميم', '<p>دي معاينة للتصميم بس.</p>']
};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-preview]');
  if (!button) return;
  opener = button;
  const [heading, text] = messages[button.dataset.preview] || messages.generic;
  title.textContent = heading;
  content.innerHTML = text + '<p>دي معاينة ببيانات للتجربة. مفيش حجز أو تغيير في بياناتك.</p>';
  dialog.showModal();
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    document.querySelector('.dialog-close').focus();
  }
});
dialog.addEventListener('close', () => opener?.focus());
