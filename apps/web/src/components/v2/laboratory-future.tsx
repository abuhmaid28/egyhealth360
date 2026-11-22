"use client";
import { useState } from "react";
import { Icon, useResource, Field } from "../ui";
import { useApp } from "../context";
import { DemoContinuation } from "../journey";
import { useLocale } from "../../lib/i18n/context";
import type { Fulfillment } from "../../lib/api/contracts";
import { useStaffCopy } from "./staff-copy";
import { StaffHeading, StaffResource } from "./staff-workspace";
import s from "./staff-workspaces.module.css";

export function LaboratoryFuture() {
  const { c } = useStaffCopy();
  const [stage, setStage] = useState(0);
  const stages = [
    [c("Assigned order", "طلب مسند"), c("Future explicit acceptance", "قبول صريح مستقبلًا")],
    [c("Draft result", "مسودة النتيجة"), c("Future private working state", "حالة عمل خاصة مستقبلًا")],
    [c("Verified final", "نهائية متحقَّق منها"), c("Future explicit verification", "تحقّق صريح مستقبلًا")],
  ];
  return <>
    <StaffHeading eyebrow={c("Nile Diagnostics · future workspace", "Nile Diagnostics · مساحة عمل مستقبلية")} title={c("Future laboratory", "المعمل المستقبلي")} description={c("A considered place for future diagnostic work. No active service is connected.", "مساحة مدروسة لشغل الفحوصات مستقبلًا. مفيش خدمة فعلية متصلة.")} />
    <section className={`${s.panel} ${s.future}`}>
      <div className={s.panelHead}><div><p className={s.eyebrow}>{c("FUTURE / CONCEPT / NOT LIVE", "مستقبلي / تصوّر / غير متاح فعليًا")}</p><h2>{c("From assigned work to a verified final", "من العمل المسند لنتيجة نهائية متحقَّق منها")}</h2></div><Icon name="lab" size={30} /></div>
      <div className={s.content}><div className={s.conceptIntro}><span className={s.conceptNumber}>03</span><div><h3>{c("Distinct meanings. Explicit decisions.", "معاني منفصلة. قرارات صريحة.")}</h3><p>{c("Explore a stage explanation. Selection records nothing and calls no service.", "اختار شرح مرحلة. الاختيار مش بيسجّل حاجة ومش بيتصل بأي خدمة.")}</p></div></div>
        <div className={s.stages} role="group" aria-label={c("Future stage explanations", "شرح المراحل المستقبلية")}>{stages.map(([name, detail], i) => <button key={name} aria-pressed={stage === i} onClick={() => setStage(i)}><b>0{i + 1}</b><strong>{name}</strong><small>{detail}</small></button>)}</div>
        <div className={s.resultPlane} role="status" aria-live="polite"><Icon name="lab" size={32} /><p className={s.eyebrow}>{c("CONCEPT ONLY · no actual result", "تصوّر بس · مفيش نتيجة فعلية")}</p><h3>{stages[stage][0]}</h3><p>{stage === 0 ? c("No assigned order exists here. A future order needs exact current organization, membership and artifact authority.", "مفيش طلب مسند هنا. الطلب المستقبلي محتاج صلاحية حالية للجهة والعضوية والطلب المحدد.") : stage === 1 ? c("No draft or medical values exist here. Future drafts remain hidden from patients and doctors.", "مفيش مسودة أو قيم تحاليل هنا. المسودات مستقبلًا مش هتظهر للمريض أو الدكتور.") : c("No verification or finalization has occurred. Future finalization requires an explicit authorized action with actual attribution. No doctor-release queue is implied.", "مفيش تحقّق أو اعتماد حصل. الاعتماد مستقبلًا محتاج إجراء صريح بصلاحية ونسبة الإجراء للي عمله. مفيش قائمة إصدار من الدكتور.")}</p></div>
        <details className={s.history}><summary>{c("Future correction history", "سجل التصحيحات المستقبلي")}</summary><p>{c("No events to show. Future amendment and retraction preserve history and require their own authority. No result, patient identity or clinical values are populated.", "مفيش أحداث معروضة. التعديل والسحب مستقبلًا بيحافظوا على السجل وليهم صلاحيات مستقلة. مفيش نتيجة أو هوية مريض أو قيم سريرية مضافة.")}</p></details>
      </div>
      <footer className={s.panelFoot}><Icon name="shield" size={18} /><strong>{c("FUTURE / NOT LIVE · No result is created, verified or released.", "مستقبلي / غير متاح فعليًا · مفيش نتيجة اتعملت أو اتراجعت أو اتصدرت.")}</strong></footer>
    </section>
    <LegacyLabSimulation />
    <DemoContinuation next={["patient"]} />
  </>;
}

/** Inherited Golden Demo only. Never mounted from the Live branch in operations.tsx. */
function LegacyLabSimulation() {
  const { api, preview, refresh } = useApp();
  const { c } = useStaffCopy();
  const rows = useResource(() => api.artifacts(), [api, refresh]);
  return <section className={s.panel} style={{ marginBlockStart: 24 }}>
    <div className={s.panelHead}><div><p className={s.eyebrow}>{c("FUTURE / NOT LIVE · inherited browser-local Demo", "مستقبلي / غير متاح فعليًا · محاكاة المتصفح التجريبية الأصلية")}</p><h2>{c("Synthetic training only", "تدريب تجريبي بس")}</h2></div></div>
    <div className={s.content}><p>{c("This original Demo stores synthetic text in this browser only. It creates no real order, verification or release. Training text can appear in the synthetic patient demo.", "العرض الأصلي بيحفظ نص تجريبي في المتصفح ده بس. مش بيعمل طلب أو تحقّق أو إصدار فعلي. نص التدريب ممكن يظهر في عرض المريض التجريبي.")}</p>
    <StaffResource resource={rows} preview={preview}>{all => {
      const a = all.find(a => !!a.lab);
      return a ? <LegacyLabAction key={a.id} id={a.id} /> : <p>{c("No synthetic training request.", "مفيش طلب تدريب تجريبي.")}</p>;
    }}</StaffResource></div>
  </section>;
}
function LegacyLabAction({ id }: { id: string }) {
  const { api, preview, refresh, changed, notify } = useApp();
  const { t } = useLocale();
  const { c } = useStaffCopy();
  const data = useResource(() => api.fulfillment(id), [api, id, refresh]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const save = async (value: Fulfillment) => {
    if (busy || uncertain) return;
    setBusy(true);
    try { await api.updateFulfillment(value, id); changed(); notify("Laboratory status updated in the demo."); }
    catch { setUncertain(true); }
    finally { setBusy(false); }
  };
  return <StaffResource resource={data} preview={preview}>{f => <>
    {uncertain ? <p role="alert">{c("Demo outcome not confirmed. Do not repeat the write. Reopen this workspace to read current state.", "نتيجة العرض التجريبي مش مؤكدة. ما تكررش الكتابة. افتح مساحة العمل تاني عشان تقرأ الحالة الحالية.")}</p> : f.lab === "Requested" ? <button className={s.secondary} disabled={busy} onClick={() => void save({ ...f, lab: "In progress" })}>{t("Start processing")}</button> : f.lab === "In progress" ? <form onSubmit={e => { e.preventDefault(); if (text.trim()) void save({ ...f, lab: "Result ready", result: text.trim() }); }}>
      <Field label={t("Result text")} hint={c("Synthetic training text only; stored locally. No clinical verification.", "نص تدريب تجريبي بس، بيتحفظ محليًا. مفيش تحقّق سريري.")}><textarea dir="auto" rows={3} required maxLength={2000} value={text} onChange={e => setText(e.target.value)} /></Field>
      <button className={s.secondary} disabled={busy || !text.trim()}>{t("Share demo result")}</button>
    </form> : f.lab === "Result ready" ? <div><h3>{t("Shared result")}</h3><p>{c("Synthetic browser-local training text is available in the patient Demo only. No clinical finalization occurred.", "نص التدريب التجريبي المحلي متاح في عرض المريض بس. مفيش اعتماد سريري حصل.")}</p></div> : <p role="alert">{c("Unknown synthetic state; no action.", "الحالة التجريبية مش معروفة؛ مفيش إجراء.")}</p>}
  </>}</StaffResource>;
}
