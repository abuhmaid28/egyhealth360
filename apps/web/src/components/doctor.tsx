"use client";
import Link from "next/link";
import { useState } from "react";
import type { Consultation } from "../lib/api/contracts";
import { useApp } from "./context";
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
  time,
  useResource,
} from "./ui";
export function DoctorScreen({ path }: { path: string }) {
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
          title="Workspace settings"
          description="Your clinician workspace is separate from patient self-service."
        />
        <Card>
          <Detail icon="shield" title="Clinical access">
            A current active patient relationship is required. Booking alone
            does not provide clinical access.
          </Detail>
          <p className="muted">
            Account and organization membership management remains outside this
            frontend track.
          </p>
        </Card>
      </>
    );
  return <Empty title="Page not found" href="/doctor" action="Open schedule" />;
}
function Schedule({ dashboard }: { dashboard: boolean }) {
  const { api, preview, refresh, session } = useApp();
  const [filter, setFilter] = useState("All");
  const appointments = useResource(() => api.appointments(), [api, refresh]);
  return (
    <>
      <Heading
        eyebrow="A clear view of your day"
        title={dashboard ? `Welcome back, ${session.name}.` : "Your schedule"}
        description="Every appointment is a chance to make care feel more connected."
      >
        <Link className="button primary" href="/doctor/availability">
          <Icon name="plus" size={18} />
          Manage availability
        </Link>
      </Heading>
      <Resource resource={appointments} preview={preview}>
        {(rows) => (
          <>
            {dashboard && (
              <>
                <div className="clinician-hero">
                  <div>
                    <Badge tone="soft">Your practice, organized</Badge>
                    <h2>
                      More time for your patients.
                      <br />A clearer picture of their care.
                    </h2>
                    <p>
                      Review your upcoming visits and pick up where your care
                      team left off.
                    </p>
                  </div>
                  <span className="clinician-hero-icon">
                    <Icon name="activity" size={80} />
                  </span>
                </div>
                <div className="stats-grid">
                  <Stat
                    icon="calendar"
                    label="Scheduled visits"
                    value={String(
                      rows.filter((a) => a.status === "Upcoming").length,
                    ).padStart(2, "0")}
                    note="28 October · Africa/Cairo"
                  />
                  <Stat
                    icon="record"
                    label="Completed visits"
                    value={String(
                      rows.filter((a) => a.status === "Completed").length,
                    ).padStart(2, "0")}
                    note="Released consultation summaries"
                  />
                  <Stat
                    icon="user"
                    label="Patients on schedule"
                    value={rows.length ? "01" : "00"}
                    note="Minimum appointment logistics"
                  />
                </div>
              </>
            )}
            <div className="two-column">
              <Card>
                <CardTitle title="Patient appointments" />
                <div className="tabs">
                  {["All", "Upcoming", "Completed"].map((t) => (
                    <button
                      key={t}
                      className={filter === t ? "active" : ""}
                      onClick={() => setFilter(t)}
                    >
                      {t}
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
                    title="A little space in your day"
                    description="Patient bookings will appear here. For the Golden Demo, book a visit with Dr. Mariam Hassan from the Patient workspace first."
                  />
                )}
              </Card>
              <div className="stack">
                <Card className="tinted">
                  <CardTitle title="A thoughtful start to every visit" />
                  <ul className="check-list">
                    <li>
                      <Icon name="check" />
                      Confirm the right patient and appointment.
                    </li>
                    <li>
                      <Icon name="check" />
                      Check the current care relationship.
                    </li>
                    <li>
                      <Icon name="check" />
                      Review allergies with explicit uncertainty.
                    </li>
                    <li>
                      <Icon name="check" />
                      Share clear instructions and next steps.
                    </li>
                  </ul>
                </Card>
                <Card>
                  <CardTitle title="Clinical access is separate" />
                  <p className="muted">
                    The schedule provides logistics only. A booking does not
                    establish patient authorization or clinician acceptance.
                  </p>
                  <Badge tone="amber">Current relationship required</Badge>
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
  const { api, preview, refresh } = useApp();
  const data = useResource(() => api.appointments(), [api, refresh]);
  return (
    <>
      <Link href="/doctor/schedule" className="back-link">
        ← Back to schedule
      </Link>
      <Heading
        eyebrow="Prepare for your visit"
        title="Patient appointment"
        description="Confirm the patient and review the context before starting."
      />
      <Resource resource={data} preview={preview}>
        {(rows) => {
          const a = rows.find((a) => a.id === id);
          return a ? (
            <div className="two-column">
              <Card>
                <CardTitle title="Appointment logistics" />
                {a.availabilitySource === "live" && (
                  <div className="boundary-notice">
                    <Badge tone="amber">
                      Live-slot preview · synthetic clinical continuation
                    </Badge>
                    <p>
                      This is not the live provider’s schedule. Synthetic Dr.
                      Mariam simulates the continuation with Ahmed through their
                      pre-existing demo relationship. No live booking or
                      clinical authority was created.
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
                  <Detail icon="calendar" title="Visit time">
                    {date(a.slot.startAt, a.slot.timeZone)} ·{" "}
                    {time(a.slot.startAt, a.slot.timeZone)}
                  </Detail>
                  <Detail icon="pin" title="Clinic">
                    {a.provider.clinics[0].displayName}
                  </Detail>
                  <Detail icon="record" title="Reason for visit">
                    {a.reason}
                  </Detail>
                </div>
                <Link
                  className="button primary"
                  href={`/doctor/consultation/${a.id}`}
                >
                  {a.status === "Completed"
                    ? "View consultation"
                    : "Open consultation workspace"}
                  <Icon name="arrow" size={18} />
                </Link>
              </Card>
              <Card className="tinted">
                <CardTitle title="Separate relationship check" />
                <Detail icon="shield" title="Synthetic fixture">
                  The patient and this clinician have a pre-existing active demo
                  care relationship.
                </Detail>
                <p className="body-copy">
                  This synthetic relationship is independent of the booking. No
                  assignment, consent, or acceptance is created by this
                  frontend.
                </p>
                <p className="muted">
                  The live workspace must recheck current server authority
                  before clinical reads and writes. It remains unavailable until
                  that integration is approved.
                </p>
              </Card>
            </div>
          ) : (
            <Empty title="Appointment not found" />
          );
        }}
      </Resource>
    </>
  );
}
function Workspace({ id }: { id: string }) {
  const { api, preview, refresh } = useApp();
  const data = useResource(
    () => Promise.all([api.consultation(id), api.profile(), api.record()]),
    [api, id, refresh],
  );
  return (
    <>
      <Link href={`/doctor/appointments/${id}`} className="back-link">
        ← Appointment details
      </Link>
      <Heading
        eyebrow="Care in context"
        title="Consultation workspace"
        description="Listen, document, and share clear next steps with your patient."
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
                    ? `Born ${date(p.dateOfBirth)}`
                    : "Date of birth not recorded"}{" "}
                  · {p.sex ?? "Sex not recorded"}
                </p>
              </div>
              <Badge tone="soft">Synthetic active relationship</Badge>
              <span className="patient-strip-id">{id}</span>
            </Card>
            <div className="workspace-grid">
              <div>
                <ConsultationForm key={c.appointmentId} initial={c} />
              </div>
              <aside className="stack">
                <Card>
                  <CardTitle title="Patient summary" />
                  <Detail icon="activity" title="Latest recorded BP">
                    {r.measurements[0]
                      ? `${r.measurements[0].systolic}/${r.measurements[0].diastolic} mmHg`
                      : "Not recorded"}
                  </Detail>
                  <p className="small muted">
                    A recorded measurement, without automated interpretation.
                  </p>
                  <Detail icon="record" title="Previous released visit">
                    {r.consultations[0]?.diagnosis || "None shared"}
                  </Detail>
                  <p className="muted">{r.consultations[0]?.instructions}</p>
                </Card>
                <Card className="tinted">
                  <CardTitle title="A human-led consultation" />
                  <p className="muted">
                    All clinical content is entered by the clinician. There are
                    no diagnosis suggestions, dosing recommendations, or
                    automated clinical decisions.
                  </p>
                  <Detail icon="shield" title="Private notes">
                    Private notes stay out of the patient’s released summary.
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
      <fieldset disabled={form.released || busy} className="fieldset">
        <Card>
          <CardTitle title="01 · Complaint & assessment" />
          <Field label="Presenting complaint / problems">
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={form.complaint}
              onChange={(e) => update("complaint", e.target.value)}
              placeholder="Document the patient’s concerns in their context"
            />
          </Field>
          <Field
            label="Clinician-entered diagnosis / assessment"
            hint="Human-authored text. No automated diagnosis."
          >
            <input
              required
              maxLength={500}
              value={form.diagnosis}
              onChange={(e) => update("diagnosis", e.target.value)}
              placeholder="Enter your assessment"
            />
          </Field>
          <Field label="Allergy / intolerance review">
            <select
              value={form.allergies}
              onChange={(e) => update("allergies", e.target.value)}
            >
              <option>Not yet reviewed</option>
              <option>Unknown — patient unable to confirm</option>
              <option>Patient reports no known allergies</option>
              <option>Known allergy / intolerance — see instructions</option>
            </select>
          </Field>
          <Field
            label="Private clinician note"
            hint="Not included in the patient-facing summary."
          >
            <textarea
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Private visit context"
            />
          </Field>
        </Card>
        <Card>
          <CardTitle title="02 · Prescription & laboratory" />
          <div className="form-grid">
            <Field label="Medication name (optional)">
              <input
                maxLength={200}
                value={form.medication}
                onChange={(e) => update("medication", e.target.value)}
                placeholder="Clinician-entered medication"
              />
            </Field>
            <Field
              label="Dose, route & instructions"
              hint="Enter manually; no suggested dose."
            >
              <input
                required={!!form.medication}
                maxLength={500}
                value={form.dosage}
                onChange={(e) => update("dosage", e.target.value)}
                placeholder="Enter prescription directions"
              />
            </Field>
          </div>
          <Field label="Laboratory request (optional)">
            <textarea
              rows={2}
              maxLength={500}
              value={form.lab}
              onChange={(e) => update("lab", e.target.value)}
              placeholder="Test name and request details"
            />
          </Field>
          <p className="small muted">
            Prescription and laboratory fulfillment are frontend simulation
            only. No order is sent to a real organization.
          </p>
        </Card>
        <Card>
          <CardTitle title="03 · Patient summary & follow-up" />
          <Field label="Released patient instructions / summary">
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={form.instructions}
              onChange={(e) => update("instructions", e.target.value)}
              placeholder="Explain the visit and agreed next steps clearly"
            />
          </Field>
          <Field
            label="Follow-up intention (optional)"
            hint="An unbooked intention, not an appointment or care-action completion."
          >
            <input
              maxLength={500}
              value={form.followUp}
              onChange={(e) => update("followUp", e.target.value)}
              placeholder="Agreed follow-up plan"
            />
          </Field>
        </Card>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {form.released ? (
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Summary released to the demo patient</strong>
            <p>Switch to Patient to see the visit in the medical record.</p>
          </div>
          <Badge>Completed</Badge>
        </div>
      ) : (
        <div className="form-footer">
          <span className="muted small">Unsaved form · browser-only demo</span>
          <button className="button primary" disabled={busy}>
            Review & release summary
            <Icon name="arrow" size={18} />
          </button>
        </div>
      )}
      {review && (
        <dialog
          className="modal"
          ref={(n) => {
            if (n && !n.open) n.showModal();
          }}
          onCancel={() => setReview(false)}
          aria-labelledby="release-title"
        >
          <div className="modal-header">
            <span className="icon-tile">
              <Icon name="record" />
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Close review"
              onClick={() => setReview(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="release-title">Share this visit summary?</h2>
          <p className="muted">
            Review the patient-facing content. Private notes are excluded.
          </p>
          <div className="confirmation-details">
            <h3>{form.diagnosis}</h3>
            <p>{form.instructions}</p>
            {form.medication && (
              <Detail icon="pill" title="Prescription">
                {form.medication} · {form.dosage}
              </Detail>
            )}
            {form.lab && (
              <Detail icon="lab" title="Lab request">
                {form.lab}
              </Detail>
            )}
            <Detail icon="heart" title="Follow-up intention">
              {form.followUp || "None entered"}
            </Detail>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
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
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sharing…" : "Release demo summary"}
            <Icon name="check" size={18} />
          </button>
        </dialog>
      )}
    </form>
  );
}
