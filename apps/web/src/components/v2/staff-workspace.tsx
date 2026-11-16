"use client";
import type { ReactNode } from "react";
import { useApp } from "../context";
import { useLocale } from "../../lib/i18n/context";
import { Icon, type Preview, type useResource } from "../ui";
import { useStaffCopy } from "./staff-copy";
import s from "./staff-workspaces.module.css";

export function StaffWorkspace({ children }: { children: ReactNode }) {
  const { api, session } = useApp();
  const { c } = useStaffCopy();
  const lab = session.role === "LAB_STAFF";
  return <section className={s.root} data-staff-workspace data-staff-role={session.role}>
    <div className={s.notice} role="note"><Icon name="shield" size={18} /><strong>{lab
      ? c("FUTURE / CONCEPT / NOT LIVE", "مستقبلي / تصوّر / غير متاح فعليًا")
      : api.mode === "demo" ? c("DEMO ONLY · synthetic workspace", "عرض تجريبي فقط · بيانات مصطنعة")
        : session.role === "PHARMACY_STAFF" && api.pharmacyRead ? c("Live · Pharmacy READ ONLY", "الرعاية المتصلة · قراءة الصيدلية فقط") : c("Live · staff capabilities unavailable", "الرعاية المتصلة · إمكانيات الفريق مش متاحة")}</strong>
      <span>{lab ? c("No active orders or results", "مفيش طلبات أو نتائج فعلية") : c("Purpose-limited access", "المعلومات المطلوبة للمهمة بس")}</span></div>
    {children}
  </section>;
}

export function StaffHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className={s.heading}><p className={s.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>;
}

/** No stale payload on pending/error/preview; retry is an explicit read only. */
export function StaffResource<T>({ resource, preview, children }: {
  resource: ReturnType<typeof useResource<T>>; preview: Preview; children: (data: T) => ReactNode;
}) {
  const { c } = useStaffCopy();
  const { t } = useLocale();
  if (resource.pending || preview === "loading") return <div className={s.safe} role="status">{c("Loading permitted work…", "بنحمّل العمل المسموح بعرضه…")}</div>;
  if (resource.error || preview === "error") return <div className={s.safe} role="alert"><Icon name="shield" /><h2>{t("We couldn’t load this view")}</h2><strong>{c("This view is unavailable", "العرض ده مش متاح")}</strong><p>{c("No previous details are shown. Check current access before trying again. No action has been confirmed here.", "مفيش تفاصيل سابقة ظاهرة. راجع صلاحيتك الحالية قبل المحاولة تاني. مفيش إجراء اتأكد هنا.")}</p><button className={s.secondary} onClick={resource.retry}>{c("Try again", "حاول تاني")}</button></div>;
  if (preview === "empty") return <div className={s.safe}><h2>{t("Nothing here yet")}</h2><strong>{c("No permitted work to show", "مفيش عمل مسموح بعرضه هنا")}</strong><p>{c("Synthetic empty-state preview.", "معاينة تجريبية للحالة الفاضية.")}</p></div>;
  return resource.data === undefined ? null : children(resource.data);
}
