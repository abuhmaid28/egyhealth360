"use client";
import { LiveDocumentationWorkspace, RelatedSummaries } from "./live-documentation";
import { directoryLabel, timeZoneLabel } from "../lib/presentation";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Appointment, Consultation } from "../lib/api/contracts";
import { useApp } from "./context";
import expressive from "./v2/doctor-schedule-signature.module.css";
import ops from "./v2/doctor-operations-signature.module.css";
import recovery from "./v2/visual-recovery.module.css";
import { LiveBookingList, LiveBookingDetail } from "./live-booking";
import { LiveConsultationShell } from "./consultation-opening";
import { DemoContinuation } from "./journey";
import { DoctorAvailability } from "./availability";
import { AppointmentRow, Stat } from "./patient";
import {
  Avatar,
  Badge,
  Card,
  CardTitle,
  date,
  Detail,
  Empty,
  Field,
  Heading,
  Icon,
  Resource,
  Modal,
  time,
  useResource,
} from "./ui";
export function DoctorScreen({ path }: { path: string }) {
  const { t } = useLocale();

  const { api, booking, session } = useApp();
  if (
    api.mode === "live" &&
    (path === "/doctor" || path === "/doctor/schedule")
  )
    return <LiveBookingList clinician dashboard={path === "/doctor"} />;
  if (api.mode === "live" && path.startsWith("/doctor/appointments/"))
    return <LiveBookingDetail clinician id={path.split("/")[3]} />;
  if (
    api.mode === "live" &&
    path.startsWith("/doctor/consultation/") &&
    path.endsWith("/documentation")
  )
    return <LiveDocumentationWorkspace bookingId={path.split("/")[3]} />;
  if (api.mode === "live" && path === "/doctor/summaries") return <RelatedSummaries />;
  if (api.mode === "live" && path.startsWith("/doctor/consultation/"))
    return <LiveConsultationShell bookingId={path.split("/")[3]} />;
  if (
    path === "/doctor/schedule" &&
    session.role === "CLINICIAN" &&
    session.mode === "demo" &&
    api.mode === "demo" &&
    booking.implementation === "demo"
  )
    return <ExpressiveSchedule />;
  if (path === "/doctor" || path === "/doctor/schedule")
    return <Schedule dashboard={path === "/doctor"} />;
  if (path === "/doctor/availability") return <DoctorAvailability />;
  if (path.startsWith("/doctor/appointments/"))
    return <PatientAppointment id={path.split("/")[3]} />;
  if (path.startsWith("/doctor/consultation/"))
    return <Workspace id={path.split("/")[3]} />;
  if (path === "/doctor/settings")
    return (
      <>
        <Heading
          title={t("Workspace settings")}
          description={t(
            "Your clinician workspace is separate from patient self-service.",
          )}
        />
        <Card>
          <Detail icon="shield" title={t("Clinical access")}>
            {t(
              "A current active patient relationship is required. Booking alone does not provide clinical access.",
            )}
          </Detail>
          <p className="muted">
            {t(
              "Account and organization settings are not available here yet.",
            )}
          </p>
        </Card>
      </>
    );
  return (
    <Empty
      title={t("Page not found")}
      href="/doctor"
      action={t("Open schedule")}
    />
  );
}
const scheduleFilters = ["All", "Upcoming", "Completed"] as const;
// Put only a row position on this browser history entry. No patient or booking data.
const scheduleFocusKey = "ehDemoDoctorScheduleOpener";

function ExpressiveSchedule() {
  const { t, locale } = useLocale();
  const { booking, preview, refresh, session } = useApp();
  const [filter, setFilter] = useState<(typeof scheduleFilters)[number]>("All");
  const appointments = useResource(() => booking.clinicianSchedule(), [booking, refresh]);
  const agenda = useRef<HTMLElement>(null);
  const { data, pending } = appointments;
  useEffect(() => {
    if (pending || preview !== "ready" || !data) return;
    const history = globalThis.history;
    const position = history.state?.[scheduleFocusKey];
    if (!Number.isInteger(position) || position < 0) return;
    const state = { ...history.state };
    delete state[scheduleFocusKey];
    history.replaceState(state, "");
    agenda.current?.querySelectorAll<HTMLAnchorElement>("li a")[position]?.focus();
  }, [data, pending, preview]);
  const count = new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    minimumIntegerDigits: 2,
  });

  return (
    <div className={expressive.root} data-expressive-doctor-schedule>
      <header className={expressive.heading}>
        <div>
          <h1>{t("My schedule")}</h1>
          <p><bdi>{session.name}</bdi></p>
        </div>
        <Link className={expressive.availability} href="/doctor/availability">
          {t("Manage availability")} <Icon name="arrow" size={16} />
        </Link>
      </header>
      <Resource resource={appointments} preview={preview}>
        {(rows) => {
          const visible = rows.filter((a) => filter === "All" || a.status === filter);
          return (
            <div className={expressive.layout}>
              <section ref={agenda} className={expressive.agenda} aria-labelledby="doctor-agenda">
                <h2 id="doctor-agenda">{t("Patient appointments")}</h2>
                <div className={expressive.filters} role="group" aria-label={t("Patient appointments")}>
                  {scheduleFilters.map((status) => (
                    <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}>
                      {t(status)}
                    </button>
                  ))}
                </div>
                {visible.length ? (
                  <ul className={expressive.rows}>
                    {visible.map((appointment) => (
                      <DoctorScheduleRow key={appointment.id} appointment={appointment}
                        onOpen={() => {
                          const history = globalThis.history;
                          history.replaceState({ ...history.state, [scheduleFocusKey]: rows.indexOf(appointment) }, "");
                        }} />
                    ))}
                  </ul>
                ) : (
                  <div className={expressive.empty} role="status">
                    <h3>{t("A little space in your day")}</h3>
                    {!rows.length && <p>{t("Demo appointments appear here after booking from the Patient workspace.")}</p>}
                  </div>
                )}
              </section>
              <dl className={expressive.stats}>
                {([
                  ["Scheduled visits", rows.filter((a) => a.status === "Upcoming").length],
                  ["Completed visits", rows.filter((a) => a.status === "Completed").length],
                  ["Patient appointments", rows.length],
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <dt>{t(label)}</dt>
                    <dd>{count.format(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        }}
      </Resource>
      <aside className={expressive.notice}>
        <Icon name="shield" />
        <div>
          <h2>{t("Clinical access is separate")}</h2>
          <p>{t("The schedule provides logistics only. A booking does not establish patient authorization or clinician acceptance.")}</p>
        </div>
      </aside>
    </div>
  );
}

function DoctorScheduleRow({ appointment: a, onOpen }: {
  appointment: Appointment;
  onOpen: () => void;
}) {
  const { t, locale } = useLocale();
  const { startAt, endAt, timeZone, clinicId } = a.slot;
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { ...options, timeZone }).format(new Date(startAt));
  const clinic = a.provider.clinics.find((item) => item.id === clinicId);
  const href = `/doctor/appointments/${a.id}`;
  return (
    <li className={expressive.row}>
      <time className={expressive.tile} dateTime={startAt}>
        <strong>{format({ day: "numeric" })}</strong>
        <span>{format({ month: "short", year: "numeric" })}</span>
      </time>
      <div className={expressive.logistics}>
        <p className={expressive.status}>{t(a.status)}</p>
        <h3><bdi>{a.patientName}</bdi></h3>
        <p><bdi>{directoryLabel(a.provider.specialty.displayName, t)}</bdi></p>
        <p><bdi dir="ltr">{time(startAt, timeZone, locale)}–{time(endAt, timeZone, locale)}</bdi> · <bdi>{timeZoneLabel(timeZone, t)}</bdi></p>
        {clinic && <p className={expressive.clinic}><Icon name="pin" size={16} /><bdi>{clinic.displayName}</bdi></p>}
        <Link className={expressive.appointment} href={href} prefetch={false} onNavigate={onOpen}>
          {t("View appointment")} <Icon name="arrow" size={16} />
        </Link>
      </div>
    </li>
  );
}

function Schedule({ dashboard }: { dashboard: boolean }) {
  const { locale, t } = useLocale();

  const { api, booking, preview, refresh, session } = useApp();
  const [filter, setFilter] = useState("All");
  const appointments = useResource(
    () => booking.clinicianSchedule(),
    [api, refresh],
  );

  const heading = (
      <Heading
        eyebrow={t("My schedule")}
        title={
          dashboard
            ? <>{locale === "ar" ? "أهلًا بعودتك،" : "Welcome back,"} <bdi>{session.name}.</bdi></>
            : t("Your schedule")
        }
        description={t("Review your upcoming visits and pick up where your care team left off.")}
      >
        <Link className="button primary" href="/doctor/availability">
          <Icon name="plus" size={18} />
          {t("Manage availability")}
        </Link>
      </Heading>
  );
  return (
    <>
      {dashboard ? (
        <div className={`clinician-hero ${recovery.doctorHero}`}>
          {heading}
          <span className={recovery.heroGlyph} aria-hidden="true"><Icon name="activity" size={54} /></span>
        </div>
      ) : heading}
      <Resource resource={appointments} preview={preview}>
        {(rows) => (
          <>
            {dashboard && (
                <div className={`stats-grid ${recovery.scheduleStats}`}>
                  <Stat
                    icon="calendar"
                    label={t("Scheduled visits")}
                    value={String(
                      rows.filter((a) => a.status === "Upcoming").length,
                    ).padStart(2, "0")}
                    note="Demo schedule · Cairo time"
                  />
                  <Stat
                    icon="record"
                    label={t("Completed visits")}
                    value={String(
                      rows.filter((a) => a.status === "Completed").length,
                    ).padStart(2, "0")}
                    note="Released consultation summaries"
                  />
                  <Stat
                    icon="user"
                    label={t("Patients on schedule")}
                    value={rows.length ? "01" : "00"}
                    note="Minimum appointment logistics"
                  />
                </div>
            )}
            <div className={`two-column ${recovery.scheduleColumns}`}>
              <Card>
                <CardTitle title={t("Patient appointments")} />
                <div className="tabs">
                  {["All", "Upcoming", "Completed"].map((tabLabel) => (
                    <button
                      key={t(tabLabel)}
                      className={filter === tabLabel ? "active" : ""}
                      aria-pressed={filter === tabLabel}
                      onClick={() => setFilter(tabLabel)}
                    >
                      {t(tabLabel)}
                    </button>
                  ))}
                </div>
                {rows.filter((a) => filter === "All" || a.status === filter)
                  .length ? (
                  rows
                    .filter((a) => filter === "All" || a.status === filter)
                    .map((a) => (
                      <AppointmentRow doctor key={a.id} appointment={a} />
                    ))
                ) : (
                  <Empty
                    title={t("A little space in your day")}
                    description={t(
                      "Demo appointments appear here after booking from the Patient workspace.",
                    )}
                  />
                )}
              </Card>
              <div className="stack">
                <Card className="tinted">
                  <CardTitle title={t("A thoughtful start to every visit")} />
                  <ul className="check-list">
                    <li>
                      <Icon name="check" />
                      {t("Confirm the right patient and appointment.")}
                    </li>
                    <li>
                      <Icon name="check" />
                      {t("Check the current care relationship.")}
                    </li>
                    <li>
                      <Icon name="check" />
                      {t("Review allergies with explicit uncertainty.")}
                    </li>
                    <li>
                      <Icon name="check" />
                      {t("Share clear instructions and next steps.")}
                    </li>
                  </ul>
                </Card>
                <Card>
                  <CardTitle title={t("Clinical access is separate")} />
                  <p className="muted">
                    {t(
                      "The schedule provides logistics only. A booking does not establish patient authorization or clinician acceptance.",
                    )}
                  </p>
                  <Badge tone="amber">
                    {t("Current relationship required")}
                  </Badge>
                </Card>
              </div>
            </div>
          </>
        )}
      </Resource>
    </>
  );
}
function PatientAppointment({ id }: { id: string }) {
  const { t, locale } = useLocale();

  const { api, booking, preview, refresh, session } = useApp();
  const data = useResource(async () => {
    const appointment = await booking.detail(id);
    return appointment ? [appointment] : [];
  }, [booking, id, refresh]);
  const isExpressiveDemo =
    api.mode === "demo" &&
    session.mode === "demo" &&
    session.role === "CLINICIAN" &&
    booking.implementation === "demo";
  const formatTile = (iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
      ...options,
      timeZone,
    }).format(new Date(iso));

  if (!isExpressiveDemo) {
    return (
      <>
        <Link href="/doctor/schedule" className="back-link">
          {t("← Back to schedule")}
        </Link>
        <Heading
          eyebrow={t("Prepare for your visit")}
          title={t("Patient appointment")}
          description={t(
            "Confirm the patient and review the context before starting.",
          )}
        />
        <Resource resource={data} preview={preview}>
          {(rows) => {
            const a = rows.find((a) => a.id === id);
            return a ? (
              <div className="two-column">
                <Card>
                  <CardTitle title={t("Appointment logistics")} />
                  {a.availabilitySource === "live" && (
                    <div className="boundary-notice">
                      <Badge tone="amber">
                        {t("Live-slot preview · synthetic clinical continuation")}
                      </Badge>
                      <p>
                        {t(
                          "This is not the live provider’s schedule. Synthetic Dr. Mariam simulates the continuation with Ahmed through their pre-existing demo relationship. No live booking or clinical authority was created.",
                        )}
                      </p>
                    </div>
                  )}
                  <div className="inline">
                    <Avatar name={a.patientName} large />
                    <div>
                      <h2>{a.patientName}</h2>
                      <Badge>{a.status}</Badge>
                    </div>
                  </div>
                  <div className="confirmation-details">
                    <Detail icon="calendar" title={t("Visit time")}>
                      {date(a.slot.startAt, a.slot.timeZone, locale)} {t("·")}{" "}
                      {time(a.slot.startAt, a.slot.timeZone, locale)}
                      <small className="muted">
                        <bdi>{timeZoneLabel(a.slot.timeZone, t)}</bdi>
                      </small>
                    </Detail>
                    <Detail icon="pin" title={t("Clinic")}>
                      {
                        a.provider.clinics.find(
                          (clinic) => clinic.id === a.slot.clinicId,
                        )?.displayName
                      }
                    </Detail>
                    <Detail icon="record" title={t("Reason for visit")}>
                      {a.reason}
                    </Detail>
                  </div>
                  <Link
                    className="button primary"
                    href={`/doctor/consultation/${a.id}`}
                  >
                    {a.status === "Completed"
                      ? t("View consultation")
                      : t("Open consultation workspace")}
                    <Icon name="arrow" size={18} />
                  </Link>
                </Card>
                <Card className="tinted">
                  <CardTitle title={t("Separate relationship check")} />
                  <Detail icon="shield" title={t("Synthetic fixture")}>
                    {t(
                      "The patient and this clinician have a pre-existing active demo care relationship.",
                    )}
                  </Detail>
                  <p className="body-copy">
                    {t(
                      "This synthetic relationship is independent of the booking. No assignment, consent, or acceptance is created by this frontend.",
                    )}
                  </p>
                  <p className="muted">
                    {t(
                      "This is a separate Demo consultation. Use your Live account for connected care.",
                    )}
                  </p>
                </Card>
              </div>
            ) : (
              <Empty title={t("Appointment not found")} />
            );
          }}
        </Resource>
      </>
    );
  }

  return (
    <div className={ops.root} data-expressive-doctor-appointment>
      <div className={ops.topBar}>
        <Link href="/doctor/schedule" className={ops.backLink}>
          {t("← Back to schedule")}
        </Link>
      </div>
      <header className={ops.heading}>
        <div className={ops.headingBody}>
          <p className={ops.eyebrow}>{t("Prepare for your visit")}</p>
          <h1>{t("Patient appointment")}</h1>
          <p className={ops.lead}>
            {t("Confirm the patient and review the context before starting.")}
          </p>
        </div>
      </header>
      <Resource resource={data} preview={preview}>
        {(rows) => {
          const a = rows.find((item) => item.id === id);
          if (!a) return <Empty title={t("Appointment not found")} />;
          const clinic = a.provider.clinics.find(
            (item) => item.id === a.slot.clinicId,
          );
          return (
            <div className={ops.layout}>
              <section
                className={`${ops.panel} ${ops.detailCard}`}
                aria-labelledby="doctor-appointment-logistics"
              >
                <div className={ops.detailHero}>
                  <time className={ops.tile} dateTime={a.slot.startAt}>
                    <strong>{formatTile(a.slot.startAt, a.slot.timeZone, { day: "numeric" })}</strong>
                    <span>
                      {formatTile(a.slot.startAt, a.slot.timeZone, {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </time>
                  <div className={ops.heroIdentity}>
                    <Avatar name={a.patientName} large />
                    <div className={ops.heroText}>
                      <span className={ops.heroStatus}>{t(a.status)}</span>
                      <h2>
                        <bdi>{a.patientName}</bdi>
                      </h2>
                      <p className={ops.heroSub}>
                        <bdi>{directoryLabel(a.provider.specialty.displayName, t)}</bdi>
                      </p>
                    </div>
                  </div>
                </div>
                <div className={ops.detailBody}>
                  {a.availabilitySource === "live" && (
                    <div className="boundary-notice">
                      <Badge tone="amber">
                        {t("Live-slot preview · synthetic clinical continuation")}
                      </Badge>
                      <p>
                        {t(
                          "This is not the live provider’s schedule. Synthetic Dr. Mariam simulates the continuation with Ahmed through their pre-existing demo relationship. No live booking or clinical authority was created.",
                        )}
                      </p>
                    </div>
                  )}
                  <h3 id="doctor-appointment-logistics" className={ops.sectionTitle}>
                    {t("Appointment logistics")}
                  </h3>
                  <div className="confirmation-details">
                    <Detail icon="calendar" title={t("Visit time")}>
                      <bdi>{date(a.slot.startAt, a.slot.timeZone, locale)}</bdi> {t("·")}{" "}
                      <bdi dir="ltr">
                        {time(a.slot.startAt, a.slot.timeZone, locale)}
                        {t("–")}
                        {time(a.slot.endAt, a.slot.timeZone, locale)}
                      </bdi>
                      <small className="muted">
                        <bdi>{timeZoneLabel(a.slot.timeZone, t)}</bdi>
                      </small>
                    </Detail>
                    <Detail icon="pin" title={t("Clinic")}>
                      <bdi>{clinic?.displayName ?? t("Clinic unavailable")}</bdi>
                    </Detail>
                    <Detail icon="record" title={t("Reason for visit")}>
                      <bdi>{a.reason}</bdi>
                    </Detail>
                  </div>
                  <Link
                    className={`button primary ${ops.primaryAction}`}
                    href={`/doctor/consultation/${a.id}`}
                  >
                    {a.status === "Completed"
                      ? t("View consultation")
                      : t("Open consultation workspace")}
                    <Icon name="arrow" size={18} />
                  </Link>
                </div>
              </section>
              <aside
                className={`${ops.panel} ${ops.relationshipPanel}`}
                aria-labelledby="doctor-appointment-relationship"
              >
                <div className={ops.relationshipHead}>
                  <Icon name="shield" size={20} />
                  <h2 id="doctor-appointment-relationship">
                    {t("Separate relationship check")}
                  </h2>
                </div>
                <Detail icon="shield" title={t("Synthetic fixture")}>
                  {t(
                    "The patient and this clinician have a pre-existing active demo care relationship.",
                  )}
                </Detail>
                <p className="body-copy">
                  {t(
                    "This synthetic relationship is independent of the booking. No assignment, consent, or acceptance is created by this frontend.",
                  )}
                </p>
                <p className="muted">
                  {t(
                    "This is a separate Demo consultation. Use your Live account for connected care.",
                  )}
                </p>
              </aside>
            </div>
          );
        }}
      </Resource>
    </div>
  );
}
function Workspace({ id }: { id: string }) {
  const { t, locale } = useLocale();

  const { api, preview, refresh } = useApp();
  const data = useResource(
    () => Promise.all([api.consultation(id), api.profile(), api.record()]),
    [api, id, refresh],
  );
  return (
    <>
      <Link href={`/doctor/appointments/${id}`} className="back-link">
        {t("← Appointment details")}
      </Link>
      <Heading
        eyebrow={t("Care in context")}
        title={t("Consultation workspace")}
        description={t(
          "Listen, document, and share clear next steps with your patient.",
        )}
      />
      <Resource resource={data} preview={preview}>
        {([c, p, r]) => (
          <>
            <Card className="patient-strip">
              <Avatar name={p.displayName} />
              <div>
                <h2>{p.displayName}</h2>
                <p className="muted">
                  {p.dateOfBirth
                    ? t("Born {date}", { date: date(p.dateOfBirth, undefined, locale) })
                    : t("Date of birth not recorded")}{" "}
                  {t("·")}
                  {p.sex ?? "Sex not recorded"}
                </p>
              </div>
              <Badge tone="soft">{t("Synthetic active relationship")}</Badge>
              <span className="patient-strip-id">{id}</span>
            </Card>
            <div className={`workspace-grid ${recovery.consultationColumns}`}>
              <div>
                <ConsultationForm key={c.appointmentId} initial={c} />
              </div>
              <aside className="stack">
                <Card>
                  <CardTitle title={t("Patient summary")} />
                  <Detail icon="activity" title={t("Latest recorded BP")}>
                    {r.measurements[0]
                      ? `${r.measurements[0].systolic}/${r.measurements[0].diastolic} mmHg`
                      : t("Not recorded")}
                  </Detail>
                  <p className="small muted">
                    {t(
                      "A recorded measurement, without automated interpretation.",
                    )}
                  </p>
                  <Detail icon="record" title={t("Previous released visit")}>
                    {r.consultations[0]?.diagnosis || t("None shared")}
                  </Detail>
                  <p className="muted">{r.consultations[0]?.instructions}</p>
                </Card>
                <Card className="tinted">
                  <CardTitle title={t("A human-led consultation")} />
                  <p className="muted">
                    {t(
                      "All clinical content is entered by the clinician. There are no diagnosis suggestions, dosing recommendations, or automated clinical decisions.",
                    )}
                  </p>
                  <Detail icon="shield" title={t("Private notes")}>
                    {t(
                      "Private notes stay out of the patient’s released summary.",
                    )}
                  </Detail>
                </Card>
              </aside>
            </div>
          </>
        )}
      </Resource>
    </>
  );
}
function ConsultationForm({ initial }: { initial: Consultation }) {
  const { t } = useLocale();

  const { api, notify, changed } = useApp();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const update = (key: keyof Consultation, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setReview(true);
      }}
    >
      <div
        className="consultation-outline"
        role="group"
        aria-label={t("Consultation sections")}
      >
        <a href="#consultation-assessment">{t("Assessment & allergies")}</a>
        <a href="#consultation-treatment">{t("Prescription & tests")}</a>
        <a href="#consultation-instructions">{t("Instructions & follow-up")}</a>
      </div>
      {form.released && (
        <p className="released-note">
          {t(
            "Released summary · read-only. Private notes remain excluded from the patient record.",
          )}
        </p>
      )}
      <fieldset disabled={form.released || busy} className="fieldset">
        <Card>
          <h2
            className="section-anchor"
            id="consultation-assessment"
            tabIndex={-1}
          >
            {t("Assessment & allergies")}
          </h2>
          <CardTitle title={t("01 · Complaint & assessment")} />
          <Field label={t("Presenting complaint / problems")}>
            <textarea
              dir="auto"
              required
              maxLength={2000}
              rows={3}
              value={form.complaint}
              onChange={(e) => update("complaint", e.target.value)}
              placeholder={t(
                "Document the patient’s concerns in their context",
              )}
            />
          </Field>
          <Field
            label={t("Clinician-entered diagnosis / assessment")}
            hint={t("Human-authored text. No automated diagnosis.")}
          >
            <input
              dir="auto"
              required
              maxLength={500}
              value={form.diagnosis}
              onChange={(e) => update("diagnosis", e.target.value)}
              placeholder={t("Enter your assessment")}
            />
          </Field>
          <Field label={t("Allergy / intolerance review")}>
            <select
              value={form.allergies}
              onChange={(e) => update("allergies", e.target.value)}
            >
              <option value="Not yet reviewed">{t("Not yet reviewed")}</option>
              <option value="Unknown — patient unable to confirm">
                {t("Unknown — patient unable to confirm")}
              </option>
              <option value="Patient reports no known allergies">
                {t("Patient reports no known allergies")}
              </option>
              <option value="Known allergy / intolerance — see instructions">
                {t("Known allergy / intolerance — see instructions")}
              </option>
            </select>
          </Field>
          <Field
            label={t("Private clinician note")}
            hint={t("Not included in the patient-facing summary.")}
          >
            <textarea
              dir="auto"
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder={t("Private visit context")}
            />
          </Field>
        </Card>
        <Card>
          <h2
            className="section-anchor"
            id="consultation-treatment"
            tabIndex={-1}
          >
            {t("Prescription & tests")}
          </h2>
          <CardTitle title={t("02 · Prescription & laboratory")} />
          <div className="form-grid">
            <Field label={t("Medication name (optional)")}>
              <input
                dir="auto"
                maxLength={200}
                value={form.medication}
                onChange={(e) => update("medication", e.target.value)}
                placeholder={t("Clinician-entered medication")}
              />
            </Field>
            <Field
              label={t("Dose, route & instructions")}
              hint={t("Enter manually; no suggested dose.")}
            >
              <input
                dir="auto"
                required={!!form.medication}
                maxLength={500}
                value={form.dosage}
                onChange={(e) => update("dosage", e.target.value)}
                placeholder={t("Enter prescription directions")}
              />
            </Field>
          </div>
          <Field label={t("Laboratory request (optional)")}>
            <textarea
              dir="auto"
              rows={2}
              maxLength={500}
              value={form.lab}
              onChange={(e) => update("lab", e.target.value)}
              placeholder={t("Test name and request details")}
            />
          </Field>
          <p className="small muted">
            {t(
              "Prescription and laboratory fulfillment are frontend simulation only. No order is sent to a real organization.",
            )}
          </p>
        </Card>
        <Card>
          <h2
            className="section-anchor"
            id="consultation-instructions"
            tabIndex={-1}
          >
            {t("Instructions & follow-up")}
          </h2>
          <CardTitle title={t("03 · Patient summary & follow-up")} />
          <Field label={t("Released patient instructions / summary")}>
            <textarea
              dir="auto"
              required
              rows={4}
              maxLength={2000}
              value={form.instructions}
              onChange={(e) => update("instructions", e.target.value)}
              placeholder={t("Explain the visit and agreed next steps clearly")}
            />
          </Field>
          <Field
            label={t("Follow-up intention (optional)")}
            hint={t(
              "An unbooked intention, not an appointment or care-action completion.",
            )}
          >
            <input
              dir="auto"
              maxLength={500}
              value={form.followUp}
              onChange={(e) => update("followUp", e.target.value)}
              placeholder={t("Agreed follow-up plan")}
            />
          </Field>
        </Card>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      {form.released ? (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>{t("Summary released to the demo patient")}</strong>
            <p>
              {t("Switch to Patient to see the visit in the medical record.")}
            </p>
          </div>
          <Badge>{t("Completed")}</Badge>
        </div>
      ) : (
        <div className="form-footer">
          <span className="muted small">
            {t("Unsaved form · browser-only demo")}
          </span>
          <button className="button primary" disabled={busy}>
            {t("Review & release summary")}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      )}
      {form.released && (
        <DemoContinuation next={["pharmacy", "laboratory", "patient"]} />
      )}
      {review && (
        <Modal
          className="modal"
          onCancel={(event) => {
            if (busy) event.preventDefault();
            else setReview(false);
          }}
          aria-describedby="release-description"
          aria-labelledby="release-title"
        >
          <div className="modal-header">
            <span className="icon-tile">
              <Icon name="record" />
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={t("Close review")}
              disabled={busy}
              onClick={() => setReview(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="release-title">{t("Share this visit summary?")}</h2>
          <p className="muted" id="release-description">
            {t(
              "Review the patient-facing content. Private notes are excluded.",
            )}
          </p>
          <div className="confirmation-details">
            <h3 dir="auto">{form.diagnosis}</h3>
            <Detail icon="record" title={t("Presenting complaint / problems")}>
              <bdi>{form.complaint}</bdi>
            </Detail>
            <Detail icon="shield" title={t("Allergy review")}>
              <bdi>{t(form.allergies)}</bdi>
            </Detail>
            <Detail icon="record" title={t("Patient instructions")}>
              <bdi>{form.instructions}</bdi>
            </Detail>
            {form.medication && (
              <Detail icon="pill" title={t("Prescription")}>
                {form.medication} {t("·")}
                {form.dosage}
              </Detail>
            )}
            {form.lab && (
              <Detail icon="lab" title={t("Lab request")}>
                {form.lab}
              </Detail>
            )}
            <Detail icon="heart" title={t("Follow-up intention")}>
              {form.followUp || t("None entered")}
            </Detail>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {t(error)}
            </p>
          )}
          <button
            type="button"
            className="button primary full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api.release(form);
                setForm({ ...form, released: true });
                setReview(false);
                notify("Summary released to the patient’s demo record.");
                changed();
              } catch (e) {
                setError(safeErrorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("Sharing…") : t("Release demo summary")}
            <Icon name="check" size={18} />
          </button>
        </Modal>
      )}
    </form>
  );
}
