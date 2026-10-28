"use client";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import Link from "next/link";
import { useState } from "react";
import type { Consultation } from "../lib/api/contracts";
import { useApp } from "./context";
import { BookingUnavailable, DemoContinuation } from "./journey";
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
              "Account and organization membership management remains outside this frontend track.",
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
function Schedule({ dashboard }: { dashboard: boolean }) {
  const { t } = useLocale();

  const { api, booking, preview, refresh, session } = useApp();
  const [filter, setFilter] = useState("All");
  const appointments = useResource(
    () => booking.clinicianSchedule(),
    [api, refresh],
  );
  if (booking.implementation === "unavailable")
    return (
      <>
        <Heading
          title={t("My schedule")}
          description={t(
            "The schedule provides logistics only. A booking does not establish patient authorization or clinician acceptance.",
          )}
        />
        <BookingUnavailable doctor />
      </>
    );

  return (
    <>
      <Heading
        eyebrow={t("A clear view of your day")}
        title={
          dashboard
            ? t("Welcome back, {name}.", { name: session.name })
            : "Your schedule"
        }
        description={t(
          "Every appointment is a chance to make care feel more connected.",
        )}
      >
        <Link className="button primary" href="/doctor/availability">
          <Icon name="plus" size={18} />
          {t("Manage availability")}
        </Link>
      </Heading>
      <Resource resource={appointments} preview={preview}>
        {(rows) => (
          <>
            {dashboard && (
              <>
                <div className="clinician-hero">
                  <div>
                    <Badge tone="soft">{t("Your practice, organized")}</Badge>
                    <h2>
                      {t("More time for your patients.")}
                      <br />
                      {t("A clearer picture of their care.")}
                    </h2>
                    <p>
                      {t(
                        "Review your upcoming visits and pick up where your care team left off.",
                      )}
                    </p>
                  </div>
                  <span className="clinician-hero-icon">
                    <Icon name="activity" size={80} />
                  </span>
                </div>
                <div className="stats-grid">
                  <Stat
                    icon="calendar"
                    label={t("Scheduled visits")}
                    value={String(
                      rows.filter((a) => a.status === "Upcoming").length,
                    ).padStart(2, "0")}
                    note="28 October · Africa/Cairo"
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
              </>
            )}
            <div className="two-column">
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
                      "Patient bookings will appear here. For the Golden Demo, book a visit with Dr. Mariam Hassan from the Patient workspace first.",
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
  const { t } = useLocale();

  const { booking, preview, refresh } = useApp();
  const data = useResource(async () => {
    const appointment = await booking.detail(id);
    return appointment ? [appointment] : [];
  }, [booking, id, refresh]);
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
                    {date(a.slot.startAt, a.slot.timeZone)} {t("·")}{" "}
                    {time(a.slot.startAt, a.slot.timeZone)}
                    <small className="muted">
                      <bdi>{a.slot.timeZone}</bdi>
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
                    "The live workspace must recheck current server authority before clinical reads and writes. It remains unavailable until that integration is approved.",
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
function Workspace({ id }: { id: string }) {
  const { t } = useLocale();

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
                    ? t("Born {date}", { date: date(p.dateOfBirth) })
                    : t("Date of birth not recorded")}{" "}
                  {t("·")}
                  {p.sex ?? "Sex not recorded"}
                </p>
              </div>
              <Badge tone="soft">{t("Synthetic active relationship")}</Badge>
              <span className="patient-strip-id">{id}</span>
            </Card>
            <div className="workspace-grid">
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
