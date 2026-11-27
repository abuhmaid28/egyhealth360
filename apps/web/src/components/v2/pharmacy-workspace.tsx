"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HealthcareAdapter, Fulfillment } from "../../lib/api/contracts";
import { useLocale } from "../../lib/i18n/context";
import { useApp } from "../context";
import { DemoContinuation } from "../journey";
import { Icon, useResource } from "../ui";
import { StaffHeading, StaffResource } from "./staff-workspace";
import { useStaffCopy } from "./staff-copy";
import s from "./staff-workspaces.module.css";
type FocusRequest = { id: string; prescription: Fulfillment["prescription"] };
type Artifact = Awaited<ReturnType<HealthcareAdapter["artifacts"]>>[number];

export function PharmacyWorkspace() {
  const { c } = useStaffCopy();
  const { api, preview, refresh } = useApp();
  const [selected, setSelected] = useState("");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const rows = useResource(() => api.artifacts(), [api, refresh]);
  return <>
    <StaffHeading eyebrow={c("CarePoint Pharmacy · synthetic organization", "صيدلية CarePoint · جهة تجريبية")} title={c("Assigned work. Clear responsibility.", "عمل مسند. مسؤولية واضحة.")} description={c("Review the exact routed prescription. Only the information this task needs.", "راجع الوصفة الطبية الموجّهة دي. المعلومات اللي المهمة محتاجاها بس.")} />
    <StaffResource resource={rows} preview={preview}>{all => <PharmacyQueue list={all.filter(a => !!a.medication)} selected={selected} onSelect={setSelected} focusRequest={focusRequest} onAction={setFocusRequest} onRestored={() => setFocusRequest(null)} />}</StaffResource>
    <DemoContinuation next={["laboratory", "patient"]} />
  </>;
}
function PharmacyQueue({ list, selected, onSelect, focusRequest, onAction, onRestored }: { list: Artifact[]; selected: string; onSelect: (id: string) => void; focusRequest: FocusRequest | null; onAction: (request: FocusRequest) => void; onRestored: () => void }) {
  const { c, copy } = useStaffCopy();
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? list.filter(a => a.id.toLowerCase().includes(search.toLowerCase()) || (a.medication && a.medication.toLowerCase().includes(search.toLowerCase())) || (a.patient && a.patient.toLowerCase().includes(search.toLowerCase())) || (a.provider && a.provider.toLowerCase().includes(search.toLowerCase()))) : list;
  const artifact = filtered.find(a => a.id === selected) ?? filtered[0] ?? list.find(a => a.id === selected) ?? list[0];
  return <div className={s.pharmacyGrid}>
    <aside className={s.queue} aria-label={c("Assigned prescriptions", "الوصفات الطبية المسندة")}>
      <h2>{c("Assigned to this workspace", "مسند لمساحة العمل دي")}</h2>
      <p className={s.muted}>{c("Synthetic organization inbox", "صندوق الجهة التجريبي")}</p>
      {list.length > 0 && <div className={s.searchBox}><input type="search" className={s.searchInput} placeholder={copy.searchPlaceholderRx} value={search} onChange={e => setSearch(e.target.value)} aria-label={copy.searchPlaceholderRx} /></div>}
      {filtered.map((a, index) => <button key={a.id} className={s.queueRow} aria-pressed={artifact?.id === a.id} onClick={() => onSelect(a.id)}>
        <span className={s.symbol}><Icon name="record" /></span><span><strong>{c("Route", "المسار")} {index + 1}</strong><small>{c("Open exact prescription", "افتح الوصفة المحددة")}</small></span><Icon name="chevron" size={16} />
      </button>)}
      {!filtered.length && list.length > 0 && <p className={s.noResults}>{copy.noMatchingRoutes}</p>}
      {!list.length && <p>{c("Your prescription inbox is clear", "مفيش وصفات طبية في الصندوق")}</p>}
      <details className={s.scope}><summary>{c("Current scope, every time", "الصلاحية الحالية، في كل مرة")}</summary><p>{c("Exact organization, current membership and routed artifact. Role alone never opens a patient record.", "الجهة المحددة والعضوية الحالية والوصفة الموجّهة. الدور لوحده مش بيفتح ملف مريض.")}</p></details>
      <Link className={s.textLink} href="/pharmacy/settings">{c("Workspace access", "صلاحية مساحة العمل")} <Icon name="arrow" size={16} /></Link>
    </aside>
    {artifact ? <PharmacyDetail key={artifact.id} artifact={artifact} focusRequest={focusRequest?.id === artifact.id ? focusRequest : null} onAction={onAction} onRestored={onRestored} /> : <section className={s.panel}><div className={s.empty}><Icon name="record" size={36} /><h2>{c("Ready for the next permitted handoff", "جاهزين للتسليم المسموح الجاي")}</h2><p>{c("A matching released synthetic visit with a medication assignment will route here automatically.", "أي كشف تجريبي معتمد ومحدد له دواء هيوصل هنا تلقائيًا.")}</p></div></section>}
  </div>;
}
function PharmacyDetail({ artifact: a, focusRequest, onAction, onRestored }: { artifact: Artifact; focusRequest: FocusRequest | null; onAction: (request: FocusRequest) => void; onRestored: () => void }) {
  const { t } = useLocale();
  const { c, status } = useStaffCopy();
  const { api, refresh, preview, changed, notify } = useApp();
  const data = useResource(() => api.fulfillment(a.id), [api, a.id, refresh]);
  const panel = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    if (!focusRequest || data.pending || data.data?.prescription !== focusRequest.prescription) return;
    const target = panel.current?.querySelector<HTMLElement>("[data-staff-action]") ?? panel.current?.querySelector<HTMLElement>("[data-staff-status]");
    target?.focus();
    onRestored();
  }, [focusRequest, data.pending, data.data, onRestored]);
  const save = async (f: Fulfillment) => {
    if (busy || uncertain) return;
    setBusy(true); setUncertain(false);
    try { await api.updateFulfillment(f, a.id); onAction({ id: a.id, prescription: f.prescription }); changed(); notify("Prescription status updated in the demo."); }
    catch { setUncertain(true); }
    finally { setBusy(false); }
  };
  return <section ref={panel} className={s.panel} aria-label={c("Exact prescription details", "تفاصيل الوصفة المحددة")}>
    <StaffResource resource={data} preview={preview}>{f => <>
      <div className={s.panelHead}><div><p className={s.eyebrow}>{c("Exact assigned route / synthetic source", "المسار المسند المحدد / مصدر تجريبي")}</p><h2>{c("Prescription details", "تفاصيل الوصفة الطبية")}</h2></div><Icon name="shield" /></div>
      <div className={s.content}>
        <div className={s.facts}><div><span>{c("Patient · source identity", "المريض · الهوية من المصدر")}</span><strong><bdi>{a.patient}</bdi></strong></div><div><span>{c("Prescriber · source identity", "الدكتور · الهوية من المصدر")}</span><strong><bdi>{a.provider}</bdi></strong></div></div>
        <div className={s.source}><span className={s.itemNumber}>01</span><div><p className={s.eyebrow}>{c("Exact source medication", "الدواء من المصدر زي ما هو")}</p><h3 dir="auto">{a.medication}</h3><p className={s.eyebrow}>{c("Clinician directions · unchanged", "تعليمات الدكتور · من غير تغيير")}</p><p dir="auto">{a.dosage || c("No directions supplied by this synthetic source.", "المصدر التجريبي ده مفيهوش تعليمات.")}</p></div></div>
        <p className={s.boundary}>{c("The Demo adapter has no signed-item quantity or acceptance command. These actions simulate its original preparation and full-item states only.", "واجهة البيانات التجريبية مفيهاش كمية من مصدر موقّع أو إجراء قبول. الأزرار بتحاكي حالات التجهيز وصرف البند الأصلية بس.")}</p>
        <p className={s.boundaryNotice}>{c("Synthetic demo queue only. Live pharmacy operations require authorized PharmacyRoute session context.", "قائمة تجريبية فقط. تتطلب عمليات الصيدلية المباشرة سياق مسار صيدلية معتمد.")}</p>
        <span className={s.status} data-staff-status={f.prescription} tabIndex={-1} role="status" aria-live="polite">{t(f.prescription)}</span>
        <ol className={s.steps}>{["Received", "Preparing", "Dispensed"].map((value, index) => <li key={value} aria-current={f.prescription === value ? "step" : undefined}><b>{index + 1}</b>{status(value)}</li>)}</ol>
        {!uncertain && (f.prescription === "Received" || f.prescription === "Preparing") && <button data-staff-action className={s.primary} disabled={busy} onClick={() => void save({ ...f, prescription: f.prescription === "Received" ? "Preparing" : "Dispensed" })}>{busy ? c("Updating demo…", "بنحدّث العرض التجريبي…") : t(f.prescription === "Received" ? "Begin preparation" : "Confirm full-item dispensing")}<Icon name="check" size={18} /></button>}
        {!["Received", "Preparing", "Dispensed"].includes(f.prescription) && <p role="alert">{c("Unknown state. No action is available.", "الحالة مش معروفة. مفيش إجراء متاح.")}</p>}
        {uncertain && <div className={s.boundary} role="alert"><strong>{c("Outcome not confirmed", "النتيجة لسه مش مؤكدة")}</strong><p>{c("Do not assume completion or repeat the write. Reopen this exact route to read its current state first.", "ما تعتبرش الإجراء تم وما تكررش الكتابة. افتح نفس المسار تاني عشان تقرأ حالته الحالية الأول.")}</p></div>}
        <details className={s.history}><summary>{c("Own-route status history · minimized", "سجل حالة المسار ده · معلومات محدودة")}</summary><p>{c("Current synthetic state", "الحالة التجريبية الحالية")}: {status(f.prescription)}</p><p>{c("The adapter supplies no event history, timestamps, acceptance or correction receipts. No past events are inferred.", "واجهة البيانات مفيهاش سجل أحداث أو أوقات أو إيصالات قبول أو تصحيح. مش بنستنتج أحداث سابقة.")}</p></details>
      </div>
      <footer className={s.panelFoot}><Icon name="shield" size={18} /><span>{c("Acceptance is separate from dispensing. No partial supply, substitutions, stock or confirmed medication use. Live pharmacy operations require authorized PharmacyRoute session context.", "القبول مستقل عن الصرف. مفيش صرف جزئي أو بدائل أو مخزون أو تأكيد إن الدواء اتاخد. عمليات الصيدلية المباشرة تتطلب سياق مسار معتمد.")}</span></footer>
    </>}</StaffResource>
  </section>;
}
