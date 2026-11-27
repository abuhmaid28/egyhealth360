/* global document */
'use strict';
const dialog = document.querySelector('dialog');
const content = document.querySelector('#preview-content');
const title = document.querySelector('#preview-title');
let opener;
const messages = {
  appointment: ['تفاصيل الميعاد', '<p>د. عمر علي · <bdi dir="ltr">Nile Care Clinic</bdi></p><p>الخميس، <bdi>12</bdi> نوفمبر <bdi>2026</bdi><br><bdi dir="ltr">14:30–15:00</bdi> بتوقيت القاهرة <bdi dir="ltr">UTC+02:00</bdi><br>الحجز اتأكد.</p>'],
  find: ['دور على دكتور', '<p>المكان ده مخصص للبحث عن دكتور في المنتج. هنا معاينة للتصميم بس، ومفيش بحث أو حجز فعلي.</p>'],
  followup: ['متابعة الدكتور رشّحها ليك', '<p>توصية مستقلة من د. عمر علي، اتشاركت معاك يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>. لسه مفيش ميعاد مرتبط بالتوصية هنا. النموذج مش بيحجز أو بيربط مواعيد.</p>'],
  summary: ['ملخص الزيارة', '<p>مصدر مستقل من د. عمر علي، اتشارك معاك يوم <bdi>5</bdi> نوفمبر <bdi>2026</bdi>. المعاينة دي بتوضح الوصول للمصدر المتاح ليك، ومش بتعرض محتوى طبي فعلي.</p>'],
  appointments: ['مواعيدك', '<p>وجهة المواعيد الجاية والسابقة في المنتج. هنا معاينة بس، ومفيش استرجاع بيانات.</p>'],
  summaries: ['الملخصات والمتابعة', '<p>وجهة المصادر اللي الدكتور شاركها معاك. الملخص وتوصية المتابعة مصدرين منفصلين. هنا معاينة بس.</p>'],
  history: ['السجل المتاح', '<p>الوصول للمصادر المتاحة ليك بس. ده مش سجل طبي شامل، ومفيش استرجاع بيانات في النموذج.</p>'],
  generic: ['معاينة التصميم', '<p>معاينة بس لمراجعة التصميم.</p>']
};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-preview]');
  if (!button) return;
  opener = button;
  const [heading, text] = messages[button.dataset.preview] || messages.generic;
  title.textContent = heading;
  content.innerHTML = text + '<p>بيانات تجريبية · مفيش خدمات متصلة، أو تعديل في المواعيد والمعلومات الطبية.</p>';
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
