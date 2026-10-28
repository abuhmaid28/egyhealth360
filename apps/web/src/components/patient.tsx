"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  Appointment,
  Availability,
  Consultation,
  Provider,
} from "../lib/api/contracts";
import { useApp } from "./context";
import { PublicAvailability } from "./availability";
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
export function PatientScreen({ path }: { path: string }) {
  if (path === "/patient") return <Dashboard />;
  if (path === "/patient/discover") return <Discovery />;
  if (path.startsWith("/patient/doctors/"))
    return <DoctorProfile id={path.split("/")[3]} />;
  if (path.startsWith("/patient/clinics/"))
    return <ClinicScreen id={path.split("/")[3]} />;
  if (
    path === "/patient/appointments" ||
    path.startsWith("/patient/appointments/")
  )
    return <Appointments id={path.split("/")[3]} />;
  if (path === "/patient/settings") return <Settings />;
  if (
    [
      "/patient/record",
      "/patient/history",
      "/patient/medications",
      "/patient/laboratory",
      "/patient/follow-up",
    ].includes(path)
  )
    return <RecordScreen section={path.split("/")[2]} />;
  return (
    <Empty title="Page not found" href="/patient" action="Back to overview" />
  );
}
function Dashboard() {
  const { api, session, preview, refresh } = useApp();
  const overview = useResource(
    () => Promise.all([api.profile(), api.record(), api.providers()]),
    [api, refresh],
  );
  const appointments = useResource(() => api.appointments(), [api, refresh]);
  return (
    <>
      <Heading
        eyebrow="Your health, all together"
        title={`Good morning, ${session.name.split(" ")[0]}.`}
        description="A little clarity. A lot more confidence in your care."
      >
        <Link className="button primary" href="/patient/discover">
          <Icon name="plus" size={18} />
          Book an appointment
        </Link>
      </Heading>
      <Resource resource={overview} preview={preview}>
        {([profile, record, providers]) => (
          <>
            <div className="hero">
              <div className="hero-copy">
                <span className="hero-label">
                  <span className="status-dot" />
                  YOUR CONNECTED HEALTH JOURNEY
                </span>
                <h2>
                  Better care starts
                  <br />
                  with the right connection.
                </h2>
                <p>
                  Find your doctor, plan your visit, and keep every
                  <br className="desktop-only" /> step of your health journey in
                  one place.
                </p>
                <Link className="button white" href="/patient/discover">
                  Find your doctor
                  <Icon name="arrow" size={18} />
                </Link>
              </div>
              <div className="health-illustration" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="medical-cross">+</div>
                <div className="float-label float-one">
                  <span className="mini-icon">
                    <Icon name="heart" />
                  </span>
                  <div>
                    <strong>Care that connects</strong>
                    <small>Every step, together</small>
                  </div>
                </div>
                <div className="float-label float-two">
                  <Icon name="shield" />
                  <span>Your health story</span>
                  <Icon name="check" size={15} />
                </div>
                <svg viewBox="0 0 220 55" className="pulse-line">
                  <path d="M0 28h50l12-16 15 35L96 3l18 25h106" />
                </svg>
              </div>
            </div>
            <div className="stats-grid">
              <Stat
                icon="calendar"
                label="Upcoming appointments"
                value={
                  appointments.data
                    ? String(
                        appointments.data.filter((a) => a.status === "Upcoming")
                          .length,
                      ).padStart(2, "0")
                    : "—"
                }
                note="Your next steps in care"
              />
              <Stat
                icon="record"
                label="Visit summaries"
                value={String(record.consultations.length).padStart(2, "0")}
                note="Your story, in one place"
              />
              <Stat
                icon="activity"
                label="Latest blood pressure"
                value={
                  record.measurements[0]
                    ? `${record.measurements[0].systolic}/${record.measurements[0].diastolic}`
                    : "—"
                }
                note={
                  record.measurements[0]
                    ? `mmHg · ${date(record.measurements[0].measuredAt)}`
                    : "No measurements recorded"
                }
              />
            </div>
            <div className="dashboard-columns">
              <div className="stack">
                <Card>
                  <CardTitle
                    title="Your next appointment"
                    href="/patient/appointments"
                  />
                  <Resource resource={appointments} preview={preview}>
                    {(rows) => {
                      const next = rows.find((a) => a.status === "Upcoming");
                      return next ? (
                        <AppointmentRow appointment={next} />
                      ) : (
                        <Empty
                          title="Make time for your health"
                          description="Find a doctor and choose a time that works for you."
                          href="/patient/discover"
                        />
                      );
                    }}
                  </Resource>
                </Card>
                <Card>
                  <CardTitle
                    title="Your care timeline"
                    href="/patient/record"
                    action="Open record"
                  />
                  <div className="timeline">
                    {record.consultations
                      .slice()
                      .reverse()
                      .map((c) => (
                        <div className="timeline-item" key={c.appointmentId}>
                          <span className="timeline-node">
                            <Icon name="check" size={14} />
                          </span>
                          <div>
                            <Badge tone="soft">Visit summary</Badge>
                            <h3>{c.diagnosis || "Consultation summary"}</h3>
                            <p>{c.instructions}</p>
                            <Link className="text-link" href="/patient/history">
                              View consultation
                              <Icon name="arrow" size={15} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    {record.consultations.length === 0 && (
                      <Empty title="Your health story starts here" />
                    )}
                  </div>
                </Card>
              </div>
              <div className="stack">
                <Card className="quick-actions">
                  <CardTitle title="What would you like to do?" />
                  {[
                    [
                      "search",
                      "Find a specialist",
                      "Care that fits your needs",
                      "/patient/discover",
                    ],
                    [
                      "pill",
                      "View medications",
                      "Your prescriptions, together",
                      "/patient/medications",
                    ],
                    [
                      "lab",
                      "Check lab results",
                      "Keep track of your tests",
                      "/patient/laboratory",
                    ],
                  ].map(([icon, title, sub, href]) => (
                    <Link href={href} key={href}>
                      <span className="icon-tile">
                        <Icon name={icon as "search"} />
                      </span>
                      <span>
                        <strong>{title}</strong>
                        <small>{sub}</small>
                      </span>
                      <Icon name="chevron" size={16} />
                    </Link>
                  ))}
                </Card>
                <Card className="profile-card">
                  <div className="inline">
                    <Avatar name={profile.displayName} />
                    <div>
                      <h3>{profile.displayName}</h3>
                      <small className="muted">
                        Your personal health profile
                      </small>
                    </div>
                  </div>
                  <div className="profile-line">
                    <span>Profile details</span>
                    <Badge tone="soft">Ready to review</Badge>
                  </div>
                  <p className="muted">
                    Keep your personal details up to date for your next visit.
                  </p>
                  <Link className="text-link" href="/patient/settings">
                    Manage your profile
                    <Icon name="arrow" size={16} />
                  </Link>
                </Card>
              </div>
            </div>
            <div className="section-heading">
              <div>
                <h2>Meet your next care partner</h2>
                <p className="muted">
                  Explore doctors in our curated directory.
                </p>
              </div>
              <Link className="text-link" href="/patient/discover">
                Explore directory
                <Icon name="arrow" size={16} />
              </Link>
            </div>
            <div className="provider-grid">
              {providers.slice(0, 3).map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </>
        )}
      </Resource>
    </>
  );
}
export function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: "calendar" | "record" | "activity" | "user" | "building" | "lab";
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="stat">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <span className="icon-tile">
        <Icon name={icon} size={23} />
      </span>
    </Card>
  );
}
export function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Card className="provider-card">
      <div className="provider-top">
        <Avatar name={provider.displayName} large />
        <Badge tone="soft">{provider.specialty.displayName}</Badge>
      </div>
      <h3>
        <Link href={`/patient/doctors/${provider.id}`}>
          {provider.displayName}
        </Link>
      </h3>
      <p className="muted">{provider.specialty.displayName}</p>
      <div className="provider-clinic">
        <Icon name="pin" size={16} />
        <span>
          {provider.clinics[0]?.displayName} · {provider.clinics[0]?.city}
        </span>
      </div>
      <Link
        className="button secondary full"
        href={`/patient/doctors/${provider.id}`}
      >
        View profile & availability
        <Icon name="arrow" size={16} />
      </Link>
    </Card>
  );
}
function Discovery() {
  const { api, preview } = useApp();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState("");
  const data = useResource(
    () => Promise.all([api.providers(), api.specialties(), api.clinics()]),
    [api],
  );
  return (
    <>
      <Heading
        eyebrow="Find your care partner"
        title="The right doctor. A better next step."
        description="Explore specialties, get to know your doctor, and plan your visit."
      />
      <Resource resource={data} preview={preview}>
        {([providers, specialties, clinics]) => {
          const filtered = providers.filter(
            (p) =>
              (!query ||
                p.displayName.toLowerCase().includes(query.toLowerCase())) &&
              (!specialty || p.specialty.key === specialty) &&
              (!clinic || p.clinics.some((c) => c.id === clinic)),
          );
          return (
            <>
              <Card className="search-card">
                <div className="search-input">
                  <Icon name="search" />
                  <input
                    aria-label="Search doctors"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by doctor’s name"
                  />
                </div>
                <select
                  aria-label="Specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  <option value="">All specialties</option>
                  {specialties.map((s) => (
                    <option value={s.key} key={s.key}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Clinic"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                >
                  <option value="">All clinics</option>
                  {clinics.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </Card>
              <div className="filter-chips">
                <button
                  className={!specialty ? "selected" : ""}
                  onClick={() => setSpecialty("")}
                >
                  All specialties
                </button>
                {specialties.map((s) => (
                  <button
                    key={s.key}
                    className={specialty === s.key ? "selected" : ""}
                    onClick={() => setSpecialty(s.key)}
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
              <div className="section-heading">
                <p className="muted">
                  {filtered.length} doctors in this directory view
                </p>
                <span className="muted small">Curated public profiles</span>
              </div>
              {filtered.length ? (
                <div className="provider-grid">
                  {filtered.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              ) : (
                <Empty
                  title="No doctors match your search"
                  description="Try a different name, specialty, or clinic."
                />
              )}
              <Card className="directory-note">
                <Icon name="shield" />
                <p>
                  Directory profiles help you discover care. A profile or
                  booking does not grant access to your medical record.
                </p>
              </Card>
            </>
          );
        }}
      </Resource>
    </>
  );
}
function DoctorProfile({ id }: { id: string }) {
  const { api, preview, changed, notify, startDemoBooking } = useApp();
  const router = useRouter();
  const data = useResource(() => api.provider(id), [api, id]);
  const [slot, setSlot] = useState<Availability>();
  const [reason, setReason] = useState("Routine health review");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Link href="/patient/discover" className="back-link">
        ← Back to doctors
      </Link>
      <Resource resource={data} preview={preview}>
        {(p) => (
          <>
            <Card className="doctor-profile">
              <Avatar name={p.displayName} large />
              <div>
                <Badge tone="soft">{p.specialty.displayName}</Badge>
                <h1>{p.displayName}</h1>
                <p className="muted">
                  {p.specialty.displayName} ·{" "}
                  {p.clinics.map((c) => c.city).join(", ")}
                </p>
                <div className="inline muted">
                  <Icon name="building" size={17} />
                  {p.clinics[0]?.displayName}
                </div>
              </div>
              <div className="profile-seal">
                <Icon name="heart" size={32} />
                <span>
                  A more connected
                  <br />
                  care experience
                </span>
              </div>
            </Card>
            <div className="two-column">
              <div className="stack">
                <Card>
                  <CardTitle title="About this doctor" />
                  <p className="body-copy">
                    Explore {p.displayName}’s{" "}
                    {p.specialty.displayName.toLowerCase()} appointments at the
                    clinics below. Select an available time to plan an in-person
                    visit.
                  </p>
                  <p className="muted">
                    Your consultation is a space to discuss your concerns and
                    decide the next steps together.
                  </p>
                </Card>
                <Card>
                  <CardTitle title="Clinic & location" />
                  {p.clinics.map((c) => (
                    <div key={c.id} className="clinic-detail">
                      <Detail icon="pin" title={c.city}>
                        <Link
                          className="text-link"
                          href={`/patient/clinics/${c.id}`}
                        >
                          {c.displayName}
                          <Icon name="arrow" size={15} />
                        </Link>
                      </Detail>
                      <p className="muted">{c.address}</p>
                      <div className="map-art">
                        <Icon name="pin" size={32} />
                        <span>{c.displayName}</span>
                      </div>
                    </div>
                  ))}
                </Card>
                <Card>
                  <CardTitle title="Before your visit" />
                  <ul className="check-list">
                    <li>
                      <Icon name="check" />
                      Bring a list of your current medications.
                    </li>
                    <li>
                      <Icon name="check" />
                      Have any previous results ready to discuss.
                    </li>
                    <li>
                      <Icon name="check" />
                      Write down the questions that matter to you.
                    </li>
                  </ul>
                </Card>
              </div>
              <PublicAvailability
                provider={p}
                reason={reason}
                setReason={setReason}
                onReview={(selection) => {
                  setSlot(selection);
                  setError("");
                  setConfirm(true);
                }}
              />
            </div>
            {confirm && slot && (
              <BookingDialog
                provider={p}
                liveBoundary={api.mode === "live"}
                slot={slot}
                reason={reason}
                busy={busy}
                error={error}
                close={() => setConfirm(false)}
                submit={async () => {
                  setBusy(true);
                  try {
                    const a =
                      api.mode === "live"
                        ? await startDemoBooking(p, slot, reason.trim())
                        : await api.book(slot.id, reason.trim());
                    changed();
                    notify("Your appointment is confirmed.");
                    router.push(`/patient/appointments/${a.id}`);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </>
        )}
      </Resource>
    </>
  );
}
function BookingDialog({
  provider,
  liveBoundary,
  slot,
  reason,
  close,
  submit,
  busy,
  error,
}: {
  provider: Provider;
  liveBoundary: boolean;
  slot: Availability;
  reason: string;
  close: () => void;
  submit: () => Promise<void>;
  busy: boolean;
  error: string;
}) {
  // Native modal provides focus containment, Escape handling and focus restoration.
  return (
    <dialog
      className="modal"
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
      onClose={close}
      aria-labelledby="booking-title"
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="calendar" />
        </span>
        <button
          className="icon-button"
          aria-label="Close booking"
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="eyebrow">One step closer to care</p>
      <h2 id="booking-title">Let’s confirm your visit.</h2>
      <p className="muted">Review your appointment details below.</p>
      {liveBoundary && (
        <div className="boundary-notice">
          <Badge tone="amber">Live availability → Demo booking</Badge>
          <p>
            Confirming switches to synthetic Patient Ahmed. The selected public
            slot is copied only for a browser preview, remains unreserved on the
            backend, and creates no relationship with this live provider. The
            clinical continuation uses the separate synthetic Ahmed–Mariam
            story.
          </p>
        </div>
      )}
      <div className="confirmation-details">
        <Detail icon="user" title="Your doctor">
          {provider.displayName}
        </Detail>
        <Detail icon="calendar" title="Date & time">
          {date(slot.startAt, slot.timeZone)} ·{" "}
          {time(slot.startAt, slot.timeZone)} –{" "}
          {date(slot.endAt, slot.timeZone)} · {time(slot.endAt, slot.timeZone)}
          <small className="muted">{slot.timeZone}</small>
        </Detail>
        <Detail icon="pin" title="Clinic">
          {provider.clinics.find((c) => c.id === slot.clinicId)?.displayName}
        </Detail>
        <Detail icon="record" title="Reason for visit">
          {reason}
        </Detail>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary full"
        disabled={busy}
        onClick={() => {
          void submit();
        }}
      >
        {busy
          ? "Confirming…"
          : liveBoundary
            ? "Confirm demo booking"
            : "Confirm booking"}
        <Icon name="check" size={18} />
      </button>
      <button className="button subtle full" disabled={busy} onClick={close}>
        Go back
      </button>
    </dialog>
  );
}
function ClinicScreen({ id }: { id: string }) {
  const { api, preview } = useApp();
  const data = useResource(
    () => Promise.all([api.clinics(), api.providers()]),
    [api, id],
  );
  return (
    <>
      <Link href="/patient/discover" className="back-link">
        ← Back to directory
      </Link>
      <Resource resource={data} preview={preview}>
        {([clinics, providers]) => {
          const c = clinics.find((c) => c.id === id);
          return c ? (
            <>
              <Heading
                eyebrow="Your local care"
                title={c.displayName}
                description={`${c.address} · ${c.city}`}
              />
              <Card className="map-art large-map">
                <Icon name="pin" size={40} />
                <strong>{c.displayName}</strong>
                <span>Address overview · illustrative map</span>
              </Card>
              <div className="section-heading">
                <h2>Doctors at this clinic</h2>
              </div>
              <div className="provider-grid">
                {providers
                  .filter((p) => p.clinics.some((c) => c.id === id))
                  .map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
              </div>
            </>
          ) : (
            <Empty title="Clinic not found" />
          );
        }}
      </Resource>
    </>
  );
}
export function AppointmentRow({
  appointment: a,
  doctor = false,
}: {
  appointment: Appointment;
  doctor?: boolean;
}) {
  return (
    <div className="appointment-row">
      <div className="appointment-date">
        <strong>
          {new Intl.DateTimeFormat("en", {
            day: "numeric",
            timeZone: a.slot.timeZone,
          }).format(new Date(a.slot.startAt))}
        </strong>
        <span>
          {new Date(a.slot.startAt).toLocaleString("en", {
            month: "short",
            timeZone: a.slot.timeZone,
          })}
        </span>
      </div>
      <div className="appointment-main">
        <Badge tone={a.status === "Completed" ? "soft" : "green"}>
          {a.status}
        </Badge>
        <h3>{doctor ? a.patientName : a.provider.displayName}</h3>
        <p>
          {a.provider.specialty.displayName} ·{" "}
          {time(a.slot.startAt, a.slot.timeZone)}–
          {time(a.slot.endAt, a.slot.timeZone)}
        </p>
        <small>
          <Icon name="pin" size={13} />
          {
            a.provider.clinics.find((c) => c.id === a.slot.clinicId)
              ?.displayName
          }
        </small>
      </div>
      <Link
        className="button secondary"
        href={
          doctor
            ? `/doctor/appointments/${a.id}`
            : `/patient/appointments/${a.id}`
        }
      >
        {doctor ? "Open patient" : "View details"}
        <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}
function Appointments({ id }: { id?: string }) {
  const { api, preview, refresh } = useApp();
  const [tab, setTab] = useState("Upcoming");
  const data = useResource(() => api.appointments(), [api, refresh]);
  return (
    <>
      <Heading
        eyebrow="Your next steps"
        title={id ? "Your appointment" : "Appointments"}
        description="Keep your upcoming visits and past appointments together."
      />
      <Resource resource={data} preview={preview}>
        {(rows) => {
          if (id) {
            const a = rows.find((a) => a.id === id);
            return a ? (
              <>
                <div className="success-banner">
                  <Icon name="check" />
                  <div>
                    <strong>
                      {a.availabilitySource === "live"
                        ? "Demo appointment saved — live slot not reserved"
                        : a.status === "Completed"
                          ? "Your visit summary is ready"
                          : "You’re all set for your visit"}
                    </strong>
                    <p>
                      {a.status === "Completed"
                        ? "Your doctor has shared the next steps in your medical record."
                        : "Your appointment is saved. You can find it here anytime."}
                    </p>
                  </div>
                  <Badge>{a.status}</Badge>
                </div>
                {a.availabilitySource === "live" && (
                  <div className="boundary-notice">
                    <Badge tone="amber">
                      Synthetic continuation from live availability
                    </Badge>
                    <p>
                      No backend booking or live-provider clinical relationship
                      was created. The Doctor demo continues with the
                      independent synthetic Ahmed–Mariam relationship. The
                      public slot may change or be withdrawn independently.
                    </p>
                  </div>
                )}
                <div className="two-column">
                  <Card>
                    <CardTitle title="Appointment details" />
                    <div className="inline">
                      <Avatar name={a.provider.displayName} large />
                      <div>
                        <h2>{a.provider.displayName}</h2>
                        <p className="muted">
                          {a.provider.specialty.displayName}
                        </p>
                      </div>
                    </div>
                    <div className="confirmation-details">
                      <Detail icon="calendar" title="Date">
                        {date(a.slot.startAt, a.slot.timeZone)}
                      </Detail>
                      <Detail icon="clock" title="Time">
                        {time(a.slot.startAt, a.slot.timeZone)}–
                        {time(a.slot.endAt, a.slot.timeZone)} ·{" "}
                        {a.slot.timeZone}
                      </Detail>
                      <Detail icon="pin" title="Location">
                        {
                          a.provider.clinics.find(
                            (c) => c.id === a.slot.clinicId,
                          )?.displayName
                        }
                      </Detail>
                      <Detail icon="record" title="Reason for visit">
                        {a.reason}
                      </Detail>
                    </div>
                  </Card>
                  <div className="stack">
                    <Card className="tinted">
                      <CardTitle title="A connected care experience" />
                      <p className="body-copy">
                        After your visit, your released summary, prescriptions,
                        and test requests will appear in your health record.
                      </p>
                      <Link className="button secondary" href="/patient/record">
                        Open medical record
                        <Icon name="arrow" size={16} />
                      </Link>
                    </Card>
                    <Card>
                      <CardTitle title="Getting ready" />
                      <p className="muted">
                        Bring your previous results and a current medication
                        list. Arrive a little early to get settled.
                      </p>
                    </Card>
                  </div>
                </div>
                <Link href="/patient/appointments" className="back-link">
                  ← All appointments
                </Link>
              </>
            ) : (
              <Empty title="Appointment not found" />
            );
          }
          const filtered = rows.filter((a) => a.status === tab);
          return (
            <>
              <div className="tabs">
                {["Upcoming", "Completed"].map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                    <span>{rows.filter((a) => a.status === t).length}</span>
                  </button>
                ))}
              </div>
              <Card>
                {filtered.length ? (
                  filtered.map((a) => (
                    <AppointmentRow key={a.id} appointment={a} />
                  ))
                ) : (
                  <Empty
                    title={
                      tab === "Upcoming"
                        ? "Your next visit starts here"
                        : "No completed visits yet"
                    }
                    description="Your appointments will appear here as your journey continues."
                    href="/patient/discover"
                  />
                )}
              </Card>
            </>
          );
        }}
      </Resource>
    </>
  );
}
function RecordScreen({ section }: { section: string }) {
  const { api, preview, refresh } = useApp();
  const record = useResource(() => api.record(), [api, refresh]);
  const titles: Record<string, string> = {
    record: "Your health story",
    history: "Consultations & history",
    medications: "Your medications",
    laboratory: "Laboratory tests & results",
    "follow-up": "Your next steps in care",
  };
  return (
    <>
      <Heading
        eyebrow="Continuity, made simple"
        title={titles[section]}
        description="Your released visit summaries and next steps, together in one place."
      />
      <div className="tabs record-tabs">
        {[
          ["record", "Overview"],
          ["history", "Consultations"],
          ["medications", "Medications"],
          ["laboratory", "Laboratory"],
          ["follow-up", "Follow-up"],
        ].map(([s, label]) => (
          <Link
            key={s}
            href={`/patient/${s}`}
            className={section === s ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </div>
      <Resource resource={record} preview={preview}>
        {(r) => {
          const visits = r.consultations.slice().reverse();
          return (
            <>
              {!r.generalConsultationAvailable && (
                <Card className="directory-note">
                  <Icon name="shield" />
                  <p>
                    Live record scope: blood pressure, HTN encounters and HTN
                    follow-ups. General consultation, prescription, laboratory
                    and follow-up intention capabilities are not integrated yet.
                  </p>
                </Card>
              )}
              {(section === "record" || section === "history") &&
                r.encounters.length > 0 && (
                  <Card>
                    <CardTitle title="Recorded HTN encounters" />
                    {r.encounters.map((e) => (
                      <Detail
                        key={e.id}
                        icon="record"
                        title="HTN BP follow-up encounter"
                      >
                        {date(e.occurredAt)}
                      </Detail>
                    ))}
                  </Card>
                )}
              {(section === "record" || section === "follow-up") &&
                r.legacyFollowUps.length > 0 && (
                  <Card>
                    <CardTitle title="Recorded HTN follow-up appointments" />
                    {r.legacyFollowUps.map((f) => (
                      <Detail key={f.id} icon="calendar" title={f.status}>
                        {date(f.scheduledAt)} · {time(f.scheduledAt)}
                      </Detail>
                    ))}
                    <p className="small muted">
                      Existing EH-012 records are separate from general bookings
                      and follow-up intentions.
                    </p>
                  </Card>
                )}

              {section === "record" && (
                <div className="two-column">
                  <Card>
                    <CardTitle title="Recent care" />
                    {visits.length ? (
                      visits.map((c) => (
                        <VisitSummary c={c} key={c.appointmentId} compact />
                      ))
                    ) : (
                      <Empty title="No released summaries yet" />
                    )}
                  </Card>
                  <Card>
                    <CardTitle title="Recorded measurements" />
                    {r.measurements.length ? (
                      r.measurements.map((m) => (
                        <div className="measurement" key={m.id}>
                          <span className="icon-tile">
                            <Icon name="activity" />
                          </span>
                          <div>
                            <small>Blood pressure</small>
                            <strong>
                              {m.systolic}/{m.diastolic} <span>mmHg</span>
                            </strong>
                            <small>{date(m.measuredAt)}</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty title="No measurements recorded" />
                    )}
                    <p className="small muted">
                      Recorded values are shown without an automated clinical
                      interpretation.
                    </p>
                  </Card>
                </div>
              )}
              {section === "history" &&
                (visits.length ? (
                  visits.map((c) => (
                    <Card key={c.appointmentId}>
                      <VisitSummary c={c} />
                    </Card>
                  ))
                ) : (
                  <Card>
                    <Empty title="No consultation summaries yet" />
                  </Card>
                ))}
              {section === "medications" && (
                <Card>
                  <CardTitle title="Prescriptions from your care team" />
                  {visits.filter((c) => c.medication).length ? (
                    visits
                      .filter((c) => c.medication)
                      .map((c) => (
                        <div className="artifact-row" key={c.appointmentId}>
                          <span className="icon-tile">
                            <Icon name="pill" size={26} />
                          </span>
                          <div>
                            <h3>{c.medication}</h3>
                            <p>{c.dosage}</p>
                            <small className="muted">
                              Human-entered at your consultation ·{" "}
                              {c.appointmentId}
                            </small>
                          </div>
                          <ArtifactStatus id={c.appointmentId} />
                        </div>
                      ))
                  ) : (
                    <Empty
                      title="No prescriptions shared yet"
                      description="A prescription appears here after your doctor releases it."
                    />
                  )}
                  <p className="small muted">
                    Only your clinician decides your medication and dose. This
                    view does not recommend treatment.
                  </p>
                </Card>
              )}
              {section === "laboratory" && (
                <Card>
                  <CardTitle title="Your laboratory requests" />
                  {visits.filter((c) => c.lab).length ? (
                    visits
                      .filter((c) => c.lab)
                      .map((c) => (
                        <div className="lab-result" key={c.appointmentId}>
                          <div className="artifact-row">
                            <span className="icon-tile">
                              <Icon name="lab" size={26} />
                            </span>
                            <div>
                              <h3>{c.lab}</h3>
                              <p className="muted">
                                Requested by your care team
                              </p>
                            </div>
                          </div>
                          <ArtifactStatus id={c.appointmentId} lab />
                        </div>
                      ))
                  ) : (
                    <Empty
                      title="No laboratory requests yet"
                      description="Your requested tests and released results will appear here."
                    />
                  )}
                </Card>
              )}
              {section === "follow-up" && (
                <Card>
                  <CardTitle title="Follow-up intentions" />
                  {visits
                    .filter((c) => c.followUp)
                    .map((c) => (
                      <div key={c.appointmentId} className="followup">
                        <span className="icon-tile">
                          <Icon name="heart" />
                        </span>
                        <div>
                          <Badge tone="amber">Not booked</Badge>
                          <h3>{c.followUp}</h3>
                          <p className="muted">
                            This is an intention from your visit, not an
                            appointment or completed action.
                          </p>
                        </div>
                        <Link
                          className="button secondary"
                          href="/patient/discover"
                        >
                          Plan a visit
                          <Icon name="arrow" size={16} />
                        </Link>
                      </div>
                    ))}
                  {!visits.some((c) => c.followUp) && (
                    <Empty title="No follow-up intentions shared" />
                  )}
                </Card>
              )}
            </>
          );
        }}
      </Resource>
    </>
  );
}
function VisitSummary({
  c,
  compact = false,
}: {
  c: Consultation;
  compact?: boolean;
}) {
  return (
    <article className="visit-summary">
      <div className="card-title">
        <h3>{c.diagnosis || "Consultation summary"}</h3>
        <Badge tone="soft">Released summary</Badge>
      </div>
      <p className="muted">{c.complaint}</p>
      <p className="body-copy">{c.instructions}</p>
      {!compact && (
        <div className="summary-grid">
          <Detail icon="shield" title="Allergy review">
            {c.allergies}
          </Detail>
          <Detail icon="pill" title="Prescription">
            {c.medication ? `${c.medication} · ${c.dosage}` : "None shared"}
          </Detail>
          <Detail icon="lab" title="Laboratory request">
            {c.lab || "None shared"}
          </Detail>
          <Detail icon="heart" title="Follow-up intention">
            {c.followUp || "None shared"}
          </Detail>
        </div>
      )}
      {compact && (
        <Link className="text-link" href="/patient/history">
          Read summary
          <Icon name="arrow" size={16} />
        </Link>
      )}
    </article>
  );
}
export function Settings() {
  const { api, preview, refresh, notify, changed } = useApp();
  const data = useResource(() => api.profile(), [api, refresh]);
  return (
    <>
      <Heading
        eyebrow="Make it yours"
        title="Profile & settings"
        description="Review the personal details shared with your care experience."
      />
      <Resource resource={data} preview={preview}>
        {(p) => (
          <ProfileForm
            key={`${p.displayName}-${p.dateOfBirth}-${p.sex}`}
            profile={p}
            save={async (value) => {
              await api.saveProfile(value);
              notify("Your profile has been updated.");
              changed();
            }}
          />
        )}
      </Resource>
    </>
  );
}
function ProfileForm({
  profile: p,
  save,
}: {
  profile: {
    displayName: string;
    dateOfBirth: string | null;
    sex: string | null;
  };
  save: (p: {
    displayName: string;
    dateOfBirth: string | null;
    sex: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(p.displayName);
  const [dob, setDob] = useState(p.dateOfBirth ?? "");
  const [sex, setSex] = useState(p.sex ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="two-column">
      <Card>
        <CardTitle title="Personal information" />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await save({
                displayName: name.trim(),
                dateOfBirth: dob || null,
                sex: sex || null,
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Display name">
            <input
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </Field>
            <Field
              label="Sex"
              hint="Optional profile context; no clinical interpretation."
            >
              <input
                maxLength={64}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                placeholder="Not specified"
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save changes"}
            <Icon name="check" size={17} />
          </button>
        </form>
      </Card>
      <Card className="tinted">
        <CardTitle title="Your privacy matters" />
        <p className="body-copy">
          Your profile helps put your care in context. Access to your clinical
          record is separate from booking and directory discovery.
        </p>
        <Detail icon="shield" title="Language architecture">
          English primary · Arabic translation planned
        </Detail>
        <p className="muted small">
          Presentation fixtures are synthetic. Profile edits in demo mode stay
          in this browser.
        </p>
      </Card>
    </div>
  );
}

function ArtifactStatus({ id, lab = false }: { id: string; lab?: boolean }) {
  const { api, refresh } = useApp();
  const data = useResource(() => api.fulfillment(id), [api, id, refresh]);
  return (
    <Resource resource={data}>
      {(f) => (
        <>
          <Badge tone={lab && f.lab !== "Result ready" ? "amber" : "green"}>
            {lab ? f.lab : f.prescription}
          </Badge>
          {lab && f.lab === "Result ready" && (
            <div className="result-text">
              <h3>Shared result</h3>
              <p>{f.result}</p>
              <small className="muted">
                Synthetic lab entry. Discuss interpretation with your doctor.
              </small>
            </div>
          )}
        </>
      )}
    </Resource>
  );
}
