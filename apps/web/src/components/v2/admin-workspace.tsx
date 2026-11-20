"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useApp } from "../context";
import { Icon, useResource } from "../ui";
import { StaffHeading, StaffResource } from "./staff-workspace";
import { useStaffCopy } from "./staff-copy";
import s from "./staff-workspaces.module.css";

export function AdminWorkspace({ path, directory }: { path: string; directory?: ReactNode }) {
  const { c, status, copy } = useStaffCopy();
  const { api, preview } = useApp();
  const data = useResource(() => api.operations(), [api]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const organizations = path === "/admin/organizations" || path === "/admin/scheduling";
  return <>
    <StaffHeading eyebrow={c("Platform operations · view only", "إدارة المنصة · عرض فقط")} title={c("People & organizations", "الأشخاص والجهات")} description={c("A clear operational view. Membership never grants clinical authority.", "صورة تشغيلية واضحة. العضوية مش بتمنح صلاحية رعاية.")} />
    <nav className={s.tabs} aria-label={c("Operational views", "العروض التشغيلية")}>
      {[["/admin/users", c("People", "الأشخاص")], ["/admin/organizations", c("Organizations", "الجهات")], ["/admin/directory", c("Public directory", "الدليل العام")], ["/admin/scheduling", c("Clinic settings", "إعدادات العيادات")]].map(([href, label]) => <Link key={href} href={href} aria-current={path === href || path === "/admin" && href === "/admin/users" ? "page" : undefined}>{label}</Link>)}
    </nav>
    <StaffResource resource={data} preview={preview}>{o => {
      const rawRows = organizations ? o.organizations.filter(v => path !== "/admin/scheduling" || v.kind === "Clinic") : o.users;
      const rows = search.trim() ? rawRows.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || ("kind" in v ? v.kind : v.role).toLowerCase().includes(search.toLowerCase())) : rawRows;
      const chosen = rows.find(v => v.name === selected) ?? rows[0];
      return path === "/admin/directory" ? <div className={s.directory}>{directory}</div> : <div className={s.adminGrid}>
        <section className={s.people} aria-label={organizations ? c("Organizations", "الجهات") : c("People", "الأشخاص")}>
          <div className={s.panelHead}><div><p className={s.eyebrow}>{c("Synthetic operational projection", "عرض تشغيلي ببيانات مصطنعة")}</p><h2>{organizations ? c("Organization network", "شبكة الجهات") : c("People", "الأشخاص")}</h2></div><Icon name={organizations ? "building" : "user"} /></div>
          {rawRows.length > 0 && <div style={{ padding: "12px 16px 0 16px" }}><input type="search" className={s.searchInput} placeholder={copy.searchPlaceholderUsers} value={search} onChange={e => setSearch(e.target.value)} aria-label={copy.searchPlaceholderUsers} /></div>}
          {rows.map(v => <button className={s.personRow} key={v.name} aria-pressed={chosen?.name === v.name} onClick={() => setSelected(v.name)}><span className={s.avatar}><Icon name={organizations ? "building" : "user"} /></span><span><strong><bdi>{v.name}</bdi></strong><small>{status("kind" in v ? v.kind : v.role)}</small></span><span className={s.status}>{status(v.status)}</span></button>)}
          {!rows.length && rawRows.length > 0 && <p className={s.noResults}>{copy.noMatchingUsers}</p>}
          {!rawRows.length && <p className={s.content}>{c("No permitted entries", "مفيش بيانات مسموح بعرضها")}</p>}
        </section>
        <section className={s.panel} aria-label={c("Selected operational context", "السياق التشغيلي المحدد")}>
          <div className={s.panelHead}><div><p className={s.eyebrow}>{c("Selected context · no management commands", "السياق المحدد · من غير إجراءات إدارة")}</p><h2>{c("Operational details", "التفاصيل التشغيلية")}</h2></div><Icon name="shield" /></div>
          <div className={s.content}>{chosen ? <><h3 className={s.accountName}><bdi>{chosen.name}</bdi></h3><div className={s.facts}><div><span>{c("Kind / role", "النوع / الدور")}</span><strong>{status("kind" in chosen ? chosen.kind : chosen.role)}</strong></div><div><span>{c("Synthetic status", "الحالة التجريبية")}</span><strong>{status(chosen.status)}</strong></div></div>
            <div className={s.membership}><p className={s.eyebrow}>{c("Exact membership context", "سياق العضوية المحددة")}</p><h3>{c("Not supplied by this projection", "مش موجود في العرض ده")}</h3><p>{c("No person-to-organization membership is inferred from role or directory presence. No grant, end, transfer or impersonation action is available.", "مش بنستنتج عضوية شخص في جهة من دوره أو وجوده في الدليل. مفيش منح أو إنهاء عضوية أو نقل أو انتحال حساب.")}</p></div>
            {path === "/admin/scheduling" && <div className={s.boundary}><strong>{c("Africa/Cairo · viewing only", "Africa/Cairo · عرض فقط")}</strong><p>{c("This view does not load or change scheduling settings. No interval or publication count is inferred.", "العرض ده مش بيحمّل أو يغيّر إعدادات المواعيد. مش بنستنتج أعداد فترات أو نشر.")}</p></div>}
          </> : <p>{c("Select a permitted entry to inspect its context.", "اختار بيان مسموح عشان تراجع سياقه.")}</p>}
          <Link className={s.textLink} href="/admin/directory">{c("Browse the public directory", "استعرض الدليل العام")}<Icon name="arrow" size={16} /></Link></div>
          <footer className={s.panelFoot}><Icon name="shield" size={18} /><span>{c("No patient records, clinical counts, assignment creation or clinical audit feed.", "من غير ملفات مرضى أو أعداد سريرية أو إنشاء صلاحيات رعاية أو سجل سريري.")}</span></footer>
        </section>
      </div>;
    }}</StaffResource>
    <div className={s.lower}><h2>{c("Administration, with boundaries", "الإدارة، بحدود واضحة")}</h2><p>{c("Operational presentation only. This workspace does not execute user, organization, membership or publication changes.", "عرض تشغيلي بس. مساحة العمل دي مش بتنفّذ تغييرات في المستخدمين أو الجهات أو العضويات أو النشر.")}</p></div>
  </>;
}
