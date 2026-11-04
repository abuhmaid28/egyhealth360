"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Context } from "../../web/src/components/context";
import { PatientMyCare } from "../../web/src/components/patient-my-care";
import { DocumentationWorkspaceScreen, ReleasedSummariesScreen } from "../../web/src/components/documentation";
import { ConsultationIdentity, ConsultationTasks, ClinicianPresentationContext } from "../../web/src/components/clinician-consultation-presentation";
import { FollowUpScreen } from "../../web/src/components/follow-up-intents";
import { Card, Field, Icon, Modal, useResource, Resource } from "../../web/src/components/ui";
import { LanguageSwitch, useLocale } from "../../web/src/lib/i18n/context";
import { createDemoAdapter } from "../../web/src/lib/mock/adapter";
import { createBookingService } from "../../web/src/lib/api/booking";
import { providers, slots } from "../../web/src/lib/mock/fixtures";
import { careDate, careTime } from "../../web/src/lib/patient-my-care";
import type { DocumentationWorkspace } from "../../web/src/lib/clinical/documentation";
import type { Session } from "../../web/src/lib/api/contracts";
import { createSyntheticVisit } from "./state";
import patient from "../../web/src/components/patient-my-care.module.css";
import clinician from "../../web/src/components/clinician-consultation.module.css";

const Visit = createContext<ReturnType<typeof createSyntheticVisit> | null>(null);
function useVisit() { return useContext(Visit)!; }
function useCopy() { const { locale } = useLocale(); return (en: string, ar: string) => locale === "ar" ? ar : en; }

export function DemoProvider({ children }: { children: ReactNode }) {
  const [api] = useState(() => createDemoAdapter());
  const [booking] = useState(() => createBookingService(api));
  const [visit] = useState(createSyntheticVisit);
  const [session, setSession] = useState<Session | null>(null);
  const [refresh, setRefresh] = useState(0), [toast, setToast] = useState("");
  const router = useRouter(), c = useCopy();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      const s = await api.enter("PATIENT");
      await booking.create(slots[0].id, "Synthetic graduation appointment · موعد تجريبي");
      setSession(s);
    })();
  }, [api, booking]);
  const reset = () => window.location.assign("/");
  return <Visit.Provider value={visit}>
    <div className="demo-notice" role="note">
      <strong>{c("SYNTHETIC DEMO", "عرض تجريبي ببيانات وهمية")}</strong>
      <span>{c("Every save, signature, release and booking is simulated in this tab. No clinical record or backend write. Please use fictional text only.", "كل حفظ وتوقيع ومشاركة وحجز محاكاة في التبويب ده بس. مفيش سجل طبي أو حفظ على خادم. استخدم نصوص وهمية بس.")}</span>
      <Link href="/">{c("Demo home", "بداية العرض")}</Link>
      <Link href="/patient">{c("Patient", "المريض")}</Link>
      <Link href="/doctor/consultation/synthetic-visit/documentation">{c("Clinician", "الدكتور")}</Link>
      <button onClick={reset}>{c("Reset demo", "ابدأ العرض من جديد")}</button>
    </div>
    {session ? <Context.Provider value={{ api, booking, session, refresh, preview: "ready", notify: setToast, changed: () => setRefresh(v => v + 1), openDemoWorkspace: async role => {
      if (role === "CLINICIAN") router.push("/doctor/consultation/synthetic-visit/documentation");
      else if (role === "PATIENT") router.push("/patient");
      else setToast(c("This temporary demonstration includes Patient and Clinician only.", "العرض المؤقت فيه المريض والدكتور بس."));
    } }}>{children}</Context.Provider> : <p className="demo-loading">{c("Preparing synthetic demonstration…", "بنجهّز العرض التجريبي…")}</p>}
    {toast && <div className="demo-toast" role="status">{toast}<button onClick={() => setToast("")}>{c("Dismiss", "إغلاق")}</button></div>}
  </Visit.Provider>;
}

export function DemoPage() {
  const path = usePathname(), router = useRouter(), c = useCopy(), app = useContext(Context)!;
  if (path === "/patient" || path === "/patient/") return <PatientMyCare onLogout={async () => router.push("/")} onRoleChange={app.openDemoWorkspace} toast="" onDismiss={() => {}} />;
  if (path.startsWith("/doctor/consultation/")) return <SyntheticConsultation />;
  return <Chrome><main id="main" className="demo-main">
    {path.startsWith("/patient") ? <PatientPages path={path.replace(/\/$/, "")} /> : path.startsWith("/doctor") ? <><h1>{c("Clinician workspace", "مساحة الدكتور")}</h1><Card><p>{c("Synthetic Salma · Cairo Care · Demonstration visit", "سلمى — بيانات وهمية · عيادة القاهرة · زيارة تجريبية")}</p><p>{c("This temporary review includes one synthetic consultation. Schedule and availability changes are outside this demonstration.", "العرض المؤقت فيه استشارة وهمية واحدة. تعديل الجدول والمواعيد المتاحة خارج نطاق العرض.")}</p><Link className="button primary" href="/doctor/consultation/synthetic-visit/documentation">{c("Open synthetic consultation", "افتح الاستشارة التجريبية")}</Link></Card></> : <Landing />}
  </main></Chrome>;
}
function Chrome({ children }: { children: ReactNode }) {
  const { locale } = useLocale(), c = useCopy();
  return <div className={patient.root} dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
    <header className={patient.header}><div className={patient.headerInner}>
      <Link className={patient.wordmark} href="/"><bdi dir="ltr">EgyHealth 360</bdi></Link>
      <nav className={patient.primaryNav} aria-label={c("Main navigation", "القائمة الرئيسية")}><Link href="/patient">{c("My care", "متابعتي")}</Link><Link href="/patient/discover">{c("Find care", "دور على دكتور")}</Link></nav>
      <div className={patient.utilities}><LanguageSwitch /></div>
    </div></header>{children}
    <footer className={patient.footer}><bdi dir="ltr">© 2026 EgyHealth 360</bdi><span>{c("Graduation demonstration · synthetic state only", "عرض مشروع التخرج · بيانات وهمية بس")}</span></footer>
  </div>;
}
function Landing() {
  const c = useCopy();
  return <><section className="demo-entry"><p className="eyebrow">{c("YOUR CARE, CONNECTED", "رعايتك، متوصلة")}</p><h1>{c("Every step of care, in one place.", "كل خطوة في رعايتك، في مكان واحد.")}</h1><p>{c("Explore the Patient and Clinician experiences in a working, bilingual graduation demonstration.", "جرّب تجربة المريض والدكتور في عرض تفاعلي بالعربي والإنجليزي لمشروع التخرج.")}</p><div className="documentation-action-row"><Link className="button white" href="/patient">{c("Explore Patient My Care", "جرّب متابعتي للمريض")} <Icon name="arrow" /></Link><Link className="button white" href="/doctor/consultation/synthetic-visit/documentation">{c("Explore Clinician consultation", "جرّب استشارة الدكتور")} <Icon name="arrow" /></Link></div></section>
    <div className="demo-entry-grid"><Card><Icon name="heart" /><h2>{c("Patient My Care", "متابعتي")}</h2><p>{c("View your next appointment, discover doctors, book a synthetic visit and explore shared care.", "شوف موعدك الجاي، دور على دكتور، احجز زيارة تجريبية وتابع اللي اتشارك معاك.")}</p></Card><Card><Icon name="record" /><h2>{c("Clinician consultation", "استشارة الدكتور")}</h2><p>{c("Try private documentation, a patient summary, follow-up instructions and an explicit Review & Close.", "جرّب التوثيق الخاص وملخص الزيارة وتعليمات المتابعة ومراجعة وقفل الزيارة.")}</p></Card></div>
    <p className="demo-explanation">{c("No account is required. All names, visits and actions are fictional. State lasts while this tab stays open; reloading resets it. Nothing here is medical advice.", "مش محتاج حساب. كل الأسماء والزيارات والإجراءات وهمية. الحالة بتفضل طول ما التبويب مفتوح؛ إعادة التحميل بتبدأها من جديد. المحتوى مش نصيحة طبية.")}</p></>;
}

function PatientPages({ path }: { path: string }) {
  const app = useContext(Context)!, visit = useVisit(), c = useCopy(), { locale } = useLocale();
  const [selected, setSelected] = useState(""), [reason, setReason] = useState(""), [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const resource = useResource(() => app.booking.listOwn(), [app.api, app.refresh]);
  const availability = useResource(() => app.api.availability(), [app.api, app.refresh]);
  const name = path.endsWith("discover") ? c("Find care", "دور على دكتور") : path.endsWith("settings") ? c("Your demo account", "حسابك التجريبي") : path.includes("appointments") ? c("Appointments", "المواعيد") : path.endsWith("doctors") ? c("My doctors", "دكاترتي") : c("Shared care & history", "رعايتي المشتركة وسجل الزيارات");
  return <><Link className="back-link" href="/patient">{c("Back to My Care", "ارجع لمتابعتي")}</Link><h1>{name}</h1>
    <nav className="demo-subnav" aria-label={c("Patient navigation", "قائمة المريض")}>{[["appointments", c("Appointments", "المواعيد")], ["discover", c("Find care", "دور على دكتور")], ["record", c("Visit summaries", "ملخصات الزيارات")], ["follow-up", c("Follow-up", "المتابعة")], ["settings", c("Account", "الحساب")]].map(([href, label]) => <Link key={href} href={`/patient/${href}`}>{label}</Link>)}</nav>
    {message && <p role="status" className="documentation-warning">{message}</p>}
    {path.endsWith("medications") ? <Card><h2>{c("No prescriptions in this demo", "مفيش روشتات في العرض ده")}</h2><p>{c("Prescribing and pharmacy workflows are outside this temporary demonstration. No prescriptions can be created, signed or sent.", "كتابة الروشتات وخدمات الصيدلية خارج العرض المؤقت ده. مش ممكن تعمل أو توقّع أو تبعت روشتة.")}</p><Link className="button secondary" href="/patient">{c("Back to My Care", "ارجع لمتابعتي")}</Link></Card> : path.endsWith("settings") ? <Card><h2>{c("Fictional patient: Ahmed Mostafa", "مريض وهمي: أحمد مصطفى")}</h2><p>{c("Language can be changed above. This review has no login credentials or live profile. Reload to reset all synthetic state.", "تقدر تغير اللغة من فوق. العرض مفيهوش بيانات دخول أو ملف حقيقي. اعمل إعادة تحميل علشان تبدأ البيانات الوهمية من جديد.")}</p><Link className="button secondary" href="/">{c("Return to demo entry", "ارجع لبداية العرض")}</Link></Card> : path.endsWith("discover") || path.endsWith("doctors") ? <>
      <Field label={c("Search doctors", "دور على دكتور")}><input value={search} onChange={e => setSearch(e.target.value)} placeholder={c("Name or specialty", "الاسم أو التخصص")} /></Field>
      {providers.filter(p => `${p.displayName} ${p.specialty.displayName}`.toLowerCase().includes(search.toLowerCase())).map(p => <Card key={p.id}><h2>{app.api.mode === "demo" ? p.displayName : ""}</h2><p>{p.specialty.displayName} · {p.clinics[0].displayName}</p><Resource resource={availability}>{rows => <div className="demo-slots">{rows.filter(s => s.providerId === p.id && s.bookable).map(s => <button key={s.id} aria-pressed={selected === s.id} className={`button ${selected === s.id ? "primary" : "secondary"}`} onClick={() => setSelected(s.id)}>{careDate(s.startAt, s.timeZone, locale)} · {careTime(s.startAt, s.timeZone)} · {s.timeZone}</button>)}</div>}</Resource></Card>)}
      <Card><form onSubmit={async e => { e.preventDefault(); if (busy || !selected) return; setBusy(true); try { await app.booking.create(selected, reason); app.changed(); setSelected(""); setReason(""); setMessage(c("Demo appointment booked in this tab only. View it in Appointments.", "تم حجز الموعد التجريبي في التبويب ده بس. شوفه في المواعيد.")); } catch { setMessage(c("That synthetic slot is unavailable. Choose another time.", "المعاد التجريبي ده مش متاح. اختار وقت تاني.")); } finally { setBusy(false); } }}><Field label={c("Reason for this demo appointment", "سبب الموعد التجريبي")}><input value={reason} onChange={e => setReason(e.target.value)} required maxLength={500} /></Field><button className="button primary" disabled={!selected || busy}>{c("Confirm demo booking", "أكد الحجز التجريبي")}</button></form></Card>
    </> : path.includes("appointments") ? <Resource resource={resource}>{rows => <>{rows.filter(a => !path.split("/")[3] || a.id === path.split("/")[3]).map(a => <Card key={a.id}><h2>{a.provider.displayName}</h2><p>{careDate(a.slot.startAt, a.slot.timeZone, locale)} · {careTime(a.slot.startAt, a.slot.timeZone)} · {a.slot.timeZone}</p><p>{a.provider.clinics[0].displayName}</p><p>{a.reason}</p><strong>{c("Upcoming · synthetic booking", "موعد جاي · حجز وهمي")}</strong></Card>)}<Link className="button primary" href="/patient/discover">{c("Book another demo appointment", "احجز موعد تجريبي تاني")}</Link></>}</Resource> : <><Card><h2>{c("Sample shared visit", "زيارة مشتركة — مثال")}</h2><p>{c("Routine wellness review · fictional existing history", "مراجعة عامة · سجل سابق وهمي")}</p><p>{c("Keep a record of your questions for your next visit. This is demonstration text, not medical advice.", "دوّن أسئلتك للزيارة الجاية. ده نص تجريبي، مش نصيحة طبية.")}</p></Card><ReleasedSummariesScreen service={visit.documentation} /><FollowUpScreen service={{ ...visit.followUp, async list() { const r = await visit.followUp.list(); const data = r.data.filter(v => v.state === "SIGNED_RELEASED"); return { ...r, data, meta: { ...r.meta, total: data.length } }; } }} /><p>{c("The Clinician example uses a separate fictional persona, Synthetic Salma. Its explicitly simulated releases appear here to illustrate the patient projection; private notes are excluded.", "مثال الدكتور بيستخدم شخصية وهمية تانية: سلمى. المشاركات التجريبية الواضحة بتظهر هنا لشرح عرض المريض؛ الملاحظات الخاصة مش بتظهر.")}</p></>}
  </>;
}

function SyntheticConsultation() {
  const visit = useVisit(), { locale, t } = useLocale(), c = useCopy();
  const [closed, setClosed] = useState(visit.lifecycle.closed), [review, setReview] = useState<DocumentationWorkspace | null>(null), [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null), ribbon = useRef<HTMLElement>(null);
  useEffect(() => { const el = ribbon.current; if (!el) return; const sync = () => container.current?.style.setProperty("--consultation-offset", `${Math.ceil(el.getBoundingClientRect().height) + 24}px`); const observer = new ResizeObserver(sync); observer.observe(el); sync(); return () => observer.disconnect(); }, []);
  return <div className={`${patient.root} ${clinician.root}`} dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} data-clinician-master>
    <header className={patient.header}><div className={`${patient.headerInner} ${clinician.headerInner}`}><Link className={patient.wordmark} href="/"><bdi dir="ltr">EgyHealth 360</bdi></Link><nav className={patient.primaryNav} aria-label={c("Clinician navigation", "قائمة الدكتور")}><Link href="/doctor/schedule">{c("Schedule", "الجدول")}</Link><Link href="/patient/record">{c("Patient demonstration", "عرض المريض")}</Link></nav><div className={patient.utilities}><LanguageSwitch /></div></div></header>
    <main id="main" className={clinician.main}>
      <ClinicianPresentationContext.Provider value={true}><div className="scoped-consultation" ref={container}>
        <section className="consultation-ribbon" ref={ribbon}><ConsultationIdentity patientName="Synthetic Salma · سلمى" providerName="Dr. Noor · د. نور" clinicName="Cairo Care · عيادة القاهرة" startAt="2026-10-30T08:55:00Z" timeZone="Africa/Cairo" state={closed ? "CLOSED" : "OPEN"} bookingId="synthetic-visit" /><ConsultationTasks /></section>
        <p className="documentation-warning">{c("DEMONSTRATION: Save, sign and release below change fictional state in this tab only. No clinical authority is granted and nothing is sent to a server.", "عرض تجريبي: الحفظ والتوقيع والمشاركة هنا بيغيروا حالة وهمية في التبويب ده بس. مفيش صلاحية طبية أو إرسال لخادم.")}</p>
        {closed && <p role="status" className="documentation-warning">{c("Demo visit closed. Reload or reset to start again.", "تم قفل الزيارة التجريبية. اعمل إعادة تحميل أو ابدأ العرض من جديد.")}</p>}
        <fieldset className="demo-clinical-fields" disabled={closed}><div id="live-documentation"><DocumentationWorkspaceScreen service={visit.documentation} professional /></div><FollowUpScreen service={visit.followUp} author /></fieldset>
        <Card className="consultation-close-card" id="review-close"><h2>{t("Review & close consultation")}</h2><p>{c("Closing this demo changes only the synthetic visit label. It does not sign or release any draft.", "قفل العرض ده بيغير حالة الزيارة الوهمية بس. مش بيوقّع أو بيشارك أي مسودة.")}</p><button className="button primary" disabled={closed} onClick={async () => { try { setReview(await visit.documentation.workspace()); setAck(false); setError(""); } catch { setError(c("Could not load the synthetic review. Reset the demo.", "مقدرناش نفتح المراجعة التجريبية. ابدأ العرض من جديد.")); } }}>{c("Review & close demo visit", "راجع واقفل الزيارة التجريبية")}</button>{error && <p role="alert">{error}</p>}</Card>
        {review && <Modal className="modal close-review-modal" aria-labelledby="demo-close-title" onCancel={() => setReview(null)}><div className="modal-header"><Icon name="check" /><button className="icon-button" aria-label={t("Close")} onClick={() => setReview(null)}><Icon name="close" /></button></div><p className="eyebrow">{c("DEMONSTRATION · FINAL REVIEW", "عرض تجريبي · مراجعة أخيرة")}</p><h2 id="demo-close-title">{c("Close this synthetic visit?", "تقفل الزيارة الوهمية دي؟")}</h2><p>{c("No records will be created or sent. Unsaved editor text is not included in this review.", "مش هيتعمل أو يتبعت أي سجل. النصوص اللي لسه مش محفوظة مش ضمن المراجعة دي.")}</p><dl className="close-review-facts"><div><dt>{t("Private note")}</dt><dd>{review.note ? t(review.note.state === "SIGNED" ? "Signed privately" : "Saved draft · private") : t("No recent saved note")}</dd></div><div><dt>{t("Patient summary")}</dt><dd>{review.summary ? t(review.summary.state === "SIGNED_RELEASED" ? "Explicitly released" : "Saved draft · not released") : t("No recent saved summary")}</dd></div></dl><label className="documentation-ack"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />{c("I understand this closes only the synthetic demonstration visit.", "فاهم إن ده بيقفل الزيارة التجريبية الوهمية بس.")}</label><div className="documentation-action-row"><button className="button secondary" onClick={() => setReview(null)}>{t("Cancel")}</button><button className="button primary" disabled={!ack} onClick={() => { visit.lifecycle.closed = true; setClosed(true); setReview(null); }}>{c("Simulate closing visit", "حاكي قفل الزيارة")}</button></div></Modal>}
      </div></ClinicianPresentationContext.Provider>
    </main><footer className={clinician.footer}><bdi dir="ltr">© 2026 EgyHealth 360</bdi><span>{c("Synthetic demonstration · no backend persistence", "عرض تجريبي وهمي · مفيش حفظ على خادم")}</span></footer>
  </div>;
}
