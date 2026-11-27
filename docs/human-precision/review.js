/* global document */
// Isolated presentation interactions only. No network, storage, signing or save.
const arabic = document.documentElement.lang === 'ar';
const t = (ar, en) => arabic ? ar : en;
const dialog = document.querySelector('#preview');
let invoker;
const explanations = {
  appointment: [t('تفاصيل الميعاد', 'Appointment details'), [
    t('عمر عبدالرحمن · د. مريم حسن · عيادة الدقي', 'Omar Abdelrahman · Dr Mariam Hassan · Dokki Clinic'),
    t('ميعاد افتراضي محجوز: 2 نوفمبر 2026، 14:30.', 'Synthetic booked appointment: 2 November 2026, 14:30.'),
    'Africa/Cairo · UTC+02:00',
    t('الحجز لوحده مش بيدي الدكتور صلاحية يشوف المعلومات الطبية. مفيش إجراء فعلي هنا.', 'Booking alone grants no clinical authority. No real operation is available here.')]],
  summary: [t('ملخص زيارة متشارك · مثال', 'Shared visit summary · specimen'), [
    t('مصدر من د. مريم حسن · 1 نوفمبر 2026.', 'Source: Dr Mariam Hassan · 1 November 2026.'),
    t('المثال ده بيوضح مكان النص السريري الموقّع زي ما اتسجّل، من غير توليد تعليمات علاجية. الملاحظة الخاصة مش جزء منه.', 'This specimen locates signed clinical text as recorded, without generating treatment instructions. The private note is not included.'),
    t('التصحيح بيظهر كنسخة جديدة مع بقاء المصدر والتاريخ.', 'A correction appears as a new version with retained source and chronology.')]],
  sign: [t('توقيع الملاحظة الخاصة · حدود الإجراء', 'Private-note signing · action boundary'), [
    t('الهدف: الملاحظة الخاصة بس، للمريض والزيارة المحددين. التوقيع مش بيشاركها مع المريض.', 'Target: the private note only, for the exact patient and visit. Signing does not share it with the patient.'),
    t('في الخدمة الفعلية: راجع النسخة ومحتواها والهوية والصلاحية الحالية قبل التأكيد الصريح.', 'In the connected service, review version, content, identity and current authority before explicit confirmation.'),
    t('العرض ده مش بينفّذ توقيع ومش بيعرض نجاح وهمي.', 'This review performs no signing and displays no invented success.')]],
  release: [t('مشاركة ملخص الزيارة · حدود الإجراء', 'Visit-summary release · action boundary'), [
    t('الهدف: نسخة ملخص المريض المعروضة بس. الملاحظة الخاصة والمتابعة والوصفة مش جزء من الإجراء.', 'Target: only the displayed patient-summary version. Private note, follow-up and prescription are separate.'),
    t('لازم مراجعة المحتوى اللي المريض هيشوفه والتأكيد الصريح. مفيش مشاركة فعلية في العرض ده.', 'Review exactly what the patient will receive and confirm explicitly. This specimen does not release anything.')]],
  close: [t('مراجعة أثر الإغلاق', 'Review closing consequences'), [
    t('الإغلاق نهائي: الاستشارة تصبح مغلقة والحجز تصبح حالته تمت الاستشارة.', 'Closing is irreversible: consultation becomes CLOSED and booking becomes CONSULTED.'),
    t('مش بيحفظ تعديلات أو يوقّع ملاحظة خاصة أو يشارك ملخص أو متابعة أو يخلّص الرعاية تلقائيًا.', 'It does not save edits, sign a private note, release a summary or follow-up, or automatically complete care.'),
    t('مفيش زر إغلاق فعلي هنا. ده شرح لحدود التصميم.', 'No real close control is present here. This explains the design boundary.')]],
  uncertain: [t('استرجاع نتيجة غير مؤكّدة', 'Recover an uncertain outcome'), [
    t('راجع نفس المصدر ونتيجة العملية الأصلية في الخدمة الفعلية. متعملش مفتاح عملية جديد ومتكرّرش تلقائيًا.', 'Inspect the same source and original operation outcome in the connected service. Do not create a new operation key or retry automatically.'),
    t('لو العقد بيسمح بإعادة صريحة، تفضل نفس العملية ونفس المحتوى. مش بنفترض نجاح أو فشل من انتهاء المهلة.', 'Where the accepted contract supports explicit replay, retain the same operation and content. A timeout proves neither success nor failure.'),
    t('مفيش إعادة تنفيذ أو طلب شبكة في المثال ده.', 'This specimen performs no retry and sends no network request.')]],
  retrieval: [t('المصادر المتاحة · مثال تنقل', 'Available sources · navigation specimen'), [
    t('الروابط في المنتج الفعلي تفتح النوع المحدد من مصادر الشخص المسموحة بس، مع إعادة فحص الصلاحية.', 'In the real product, each destination opens only that person’s permitted source type, with a current authority recheck.'),
    t('ده مش سجل شامل، ولا بيكشف ملاحظات خاصة أو أعداد لمصادر محمية. مفيش اتصال بخدمة فعلية.', 'This is not a complete longitudinal record and reveals no private notes or protected counts. No Live service is connected.')]],
  navigation: [t('مثال تنقل · خدمة غير متصلة', 'Navigation specimen · service not connected'), [
    t('البنية والوجهات المقبولة محفوظة. العرض ده مش بيحجز أو بيغيّر علاقات الرعاية أو بيفتح ملفات فعلية.', 'Accepted structure and destinations are preserved. This review cannot book, change care relationships or open real records.'),
    t('استخدم روابط حزمة المراجعة علشان تتنقل بين التصميمات.', 'Use the review-package links to move between designs.')]]
};
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
  if (!dialog) return;
  const [title, paragraphs] = explanations[button.dataset.preview];
  document.querySelector('#dialog-title').textContent = title;
  const container = document.querySelector('#dialog-content');
  container.replaceChildren(...paragraphs.map(text => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  }));
  invoker = button;
  dialog.showModal();
}));
dialog?.addEventListener('close', () => invoker?.focus());
const state = document.querySelector('#state');
state?.addEventListener('change', () => {
  document.querySelectorAll('.state-panel').forEach(panel => { panel.hidden = panel.id !== 'state-' + state.value; });
});
document.querySelector('#density')?.addEventListener('change', event => {
  document.querySelector('#density-demo').classList.toggle('compact', event.target.value === 'compact');
});
const form = document.querySelector('#specimen-form');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#specimen-name');
  const error = document.querySelector('#name-error');
  const result = document.querySelector('#form-result');
  const invalid = !input.value.trim();
  input.setAttribute('aria-invalid', String(invalid));
  error.hidden = !invalid;
  result.textContent = invalid ? '' : result.dataset.success;
  if (invalid) input.focus();
});
