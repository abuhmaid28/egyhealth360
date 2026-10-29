"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Availability, Provider } from "../lib/api/contracts";
import {
  bookingEligibility,
  correctionReasonValid,
  type LiveBooking,
  type Observation,
} from "../lib/api/live-booking";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import {
  Badge,
  Card,
  CardTitle,
  date,
  Detail,
  Empty,
  Field,
  Heading,
  Icon,
  Modal,
  Resource,
  time,
  useResource,
  SessionRecovery,
} from "./ui";

export const bookingLabels = {
  BOOKED: "Booked",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "No-show",
  UNKNOWN: "Not recorded",
  ATTENDED: "Attended",
  CREATE: "Booking created",
  CANCEL: "Booking cancelled",
  RESCHEDULE: "Booking rescheduled",
  ATTEND: "Attendance recorded",
  CORRECT: "Attendance corrected",
} as const;
function useLiveBookings() {
  const { api } = useApp();
  if (api.mode !== "live" || !api.liveBookings)
    throw new Error("Live booking context missing.");
  return api.liveBookings;
}
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function BookingBoundary() {
  const { t } = useLocale();
  return (
    <div className="logistics-boundary">
      <Icon name="shield" size={18} />
      <p>
        {t(
          "Booking is logistics only. It grants no access to medical records. Consultation, prescriptions, tests and clinical follow-up remain Demo-only.",
        )}
      </p>
    </div>
  );
}
function useDirectoryNames() {
  const { api } = useApp();
  // Directory enrichment never gates history, detail or cancellation after provider revocation.
  const names = useResource(async () => {
    const [providers, clinics] = await Promise.allSettled([
      api.providers(),
      api.clinics(),
    ]);
    return {
      providers: providers.status === "fulfilled" ? providers.value : [],
      clinics: clinics.status === "fulfilled" ? clinics.value : [],
    };
  }, [api]);
  return names.data;
}
function BookingIdentity({
  booking: b,
  clinician = false,
  names,
}: {
  booking: LiveBooking;
  clinician?: boolean;
  names: ReturnType<typeof useDirectoryNames>;
}) {
  const { t } = useLocale();
  return (
    <div className="booking-identity">
      <h3>
        <bdi>
          {clinician
            ? b.patientDisplayName
            : (names?.providers.find((p) => p.id === b.providerId)
                ?.displayName ?? t("Provider unavailable"))}
        </bdi>
      </h3>
      <p className="muted">
        <Icon name="pin" size={14} />
        <bdi>
          {names?.clinics.find((c) => c.id === b.clinicId)?.displayName ??
            t("Clinic unavailable")}
        </bdi>
      </p>
    </div>
  );
}
export function BookingTime({
  booking: b,
}: {
  booking: Pick<LiveBooking, "startAt" | "endAt" | "timeZone">;
}) {
  return (
    <div className="booking-time">
      <bdi>
        {date(b.startAt, b.timeZone)} · {time(b.startAt, b.timeZone)} –{" "}
        {date(b.endAt, b.timeZone)} · {time(b.endAt, b.timeZone)}
      </bdi>
      <small>
        <bdi>{b.timeZone}</bdi>
      </small>
    </div>
  );
}
function Status({ booking: b }: { booking: LiveBooking }) {
  const { t } = useLocale();
  return (
    <div className="booking-status">
      <Badge tone={b.state === "BOOKED" ? "green" : "soft"}>
        {t(bookingLabels[b.state])}
      </Badge>
      <Badge tone={b.attendance === "UNKNOWN" ? "amber" : "soft"}>
        {t(bookingLabels[b.attendance])}
      </Badge>
    </div>
  );
}
export function LiveBookingList({
  clinician = false,
  compact = false,
}: {
  clinician?: boolean;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const live = useLiveBookings();
  const { refresh } = useApp();
  const [page, setPage] = useState(1);
  const names = useDirectoryNames();
  const resource = useResource(
    () => (clinician ? live.schedule(page) : live.history(page)),
    [live, page, refresh, clinician],
  );
  return (
    <>
      {!compact && (
        <>
          <Heading
            eyebrow={t("Live booking")}
            title={clinician ? t("My schedule") : t("My bookings")}
            description={
              clinician
                ? t(
                    "Only your booked operational schedule. Booking does not grant clinical access.",
                  )
                : t("Your real bookings, retained history and next visits.")
            }
          />
          <BookingBoundary />
        </>
      )}
      <Resource resource={resource}>
        {(result) => (
          <Card>
            <CardTitle
              title={clinician ? t("Booked schedule") : t("My bookings")}
              href={
                compact
                  ? clinician
                    ? "/doctor/schedule"
                    : "/patient/appointments"
                  : undefined
              }
            />
            {result.data.length ? (
              <div className="live-booking-list">
                {result.data.slice(0, compact ? 3 : 20).map((b) => (
                  <article className="live-booking-row" key={b.id}>
                    <div>
                      <Status booking={b} />
                      <BookingIdentity
                        booking={b}
                        clinician={clinician}
                        names={names}
                      />
                      <BookingTime booking={b} />
                    </div>
                    <Link
                      className="button secondary"
                      href={`${clinician ? "/doctor" : "/patient"}/appointments/${b.id}`}
                    >
                      {t("View booking")}
                      <Icon name="arrow" size={16} />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  clinician
                    ? t("No bookings on this schedule")
                    : t("No bookings yet")
                }
                description={
                  clinician
                    ? t(
                        "Bookings for your exact clinician account appear here. No patient search or clinical history is provided.",
                      )
                    : t("Choose a published time to book your next visit.")
                }
                href={clinician ? undefined : "/patient/discover"}
              />
            )}
            {!compact &&
              (result.meta.total > result.meta.pageSize || page > 1) && (
                <div className="pagination">
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t("Previous")}
                  </button>
                  <span>
                    {t("Page {page} · {total} bookings", {
                      page: String(page),
                      total: String(result.meta.total),
                    })}
                  </span>
                  <button
                    className="button secondary"
                    disabled={
                      page >= 10000 ||
                      page * result.meta.pageSize >= result.meta.total
                    }
                    onClick={() => setPage(page + 1)}
                  >
                    {t("Next")}
                  </button>
                </div>
              )}
          </Card>
        )}
      </Resource>
    </>
  );
}
export function LiveCreateReview({
  provider,
  slot,
  close,
}: {
  provider: Provider;
  slot: Availability;
  close: () => void;
}) {
  const { t } = useLocale();
  const live = useLiveBookings();
  const router = useRouter();
  const { notify, changed } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      className="modal"
      aria-labelledby="live-booking-title"
      aria-describedby="live-booking-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="calendar" />
        </span>
        <button
          className="icon-button"
          disabled={busy}
          aria-label={t("Close booking")}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="eyebrow">{t("Live booking")}</p>
      <h2 id="live-booking-title">{t("Confirm your booking")}</h2>
      <p className="muted" id="live-booking-description">
        {t(
          "Confirm this published time with your live account. Only slot and operation identifiers are submitted.",
        )}
      </p>
      <ol className="workflow-steps" aria-label={t("Booking progress")}>
        <li>{t("Choose a time")}</li>
        <li aria-current="step">{t("Review details")}</li>
        <li>{t("Booking confirmation")}</li>
      </ol>
      <div className="confirmation-details">
        <Detail icon="user" title={t("Your doctor")}>
          <bdi>{provider.displayName}</bdi>
        </Detail>
        <Detail icon="pin" title={t("Clinic")}>
          <bdi>
            {provider.clinics.find((c) => c.id === slot.clinicId)
              ?.displayName ?? t("Clinic unavailable")}
          </bdi>
        </Detail>
        <BookingTime booking={slot} />
      </div>
      <BookingBoundary />
      {error && <BookingError message={error} />}
      <button
        className="button primary full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const booking = await live.create(slot.id);
            changed();
            notify("Your live booking is confirmed.");
            router.push(`/patient/appointments/${booking.id}`);
          } catch (e) {
            setError(safeErrorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? t("Confirming…")
          : error
            ? t("Retry unchanged booking")
            : t("Confirm live booking")}
        <Icon name="check" size={16} />
      </button>
      <button className="button subtle full" disabled={busy} onClick={close}>
        {t("Go back")}
      </button>
    </Modal>
  );
}
function BookingError({ message }: { message: string }) {
  const { t } = useLocale();
  return (
    <>
      <p className="form-error" role="alert">
        {t(message)}
      </p>
      <SessionRecovery message={message} />
    </>
  );
}
export function LiveBookingDetail({
  id,
  clinician = false,
}: {
  id: string;
  clinician?: boolean;
}) {
  const { t } = useLocale();
  const live = useLiveBookings();
  const { refresh } = useApp();
  const resource = useResource(() => live.detail(id), [live, id, refresh]);
  const home = clinician ? "/doctor/schedule" : "/patient/appointments";
  return (
    <>
      <Link className="back-link" href={home}>
        {t(clinician ? "Back to schedule" : "Back to my bookings")}
      </Link>
      <Heading
        eyebrow={t("Live booking")}
        title={t("Booking details")}
        description={t(
          "Operational booking details and retained history. No medical record is included.",
        )}
      />
      <BookingBoundary />
      <Resource resource={resource}>
        {(b) => (
          <BookingDetails
            key={b.id}
            booking={b}
            clinician={clinician}
            reload={resource.retry}
          />
        )}
      </Resource>
    </>
  );
}
function BookingDetails({
  booking: b,
  clinician,
  reload,
}: {
  booking: LiveBooking;
  clinician: boolean;
  reload: () => void;
}) {
  const { t } = useLocale();
  const now = useNow();
  const eligible = bookingEligibility(b, now);
  const names = useDirectoryNames();
  const [action, setAction] = useState<
    "cancel" | "reschedule" | "attend" | "correct"
  >();
  return (
    <>
      <div className="two-column">
        <Card>
          <div className="card-title">
            <h2>{t("Booking summary")}</h2>
            <Status booking={b} />
          </div>
          <BookingIdentity booking={b} clinician={clinician} names={names} />
          <BookingTime booking={b} />
          <div className="booking-actions">
            {!clinician && (
              <>
                <button
                  className="button secondary"
                  disabled={!eligible.change}
                  onClick={() => setAction("reschedule")}
                >
                  {t("Reschedule booking")}
                </button>
                <button
                  className="button subtle"
                  disabled={!eligible.change}
                  onClick={() => setAction("cancel")}
                >
                  {t("Cancel booking")}
                </button>
              </>
            )}
            {clinician && (
              <>
                <button
                  className="button primary"
                  disabled={!eligible.attend && !eligible.noShow}
                  onClick={() => setAction("attend")}
                >
                  {t("Record attendance")}
                </button>
                <button
                  className="button secondary"
                  disabled={!eligible.correct}
                  onClick={() => setAction("correct")}
                >
                  {t("Correct attendance")}
                </button>
              </>
            )}
          </div>
          <p className="small muted">
            {t(
              clinician
                ? "Attendance is recorded explicitly. Attended is eligible from the start; no-show from the end. The server rechecks current timing, state and authority."
                : eligible.change
                  ? "Cancellation does not depend on directory availability. Rescheduling keeps the same clinician and clinic."
                  : "This booking can no longer be cancelled or rescheduled. Only booked visits before their start can be changed.",
            )}
          </p>
          <button className="text-link" onClick={reload}>
            {t("Refresh booking")}
            <Icon name="activity" size={16} />
          </button>
          {(b.predecessorId || b.successorId) && (
            <div className="booking-actions">
              {b.predecessorId && (
                <Link
                  className="text-link"
                  href={`${clinician ? "/doctor" : "/patient"}/appointments/${b.predecessorId}`}
                >
                  {t("Previous booking")}
                </Link>
              )}
              {b.successorId && (
                <Link
                  className="text-link"
                  href={`${clinician ? "/doctor" : "/patient"}/appointments/${b.successorId}`}
                >
                  {t("Replacement booking")}
                </Link>
              )}
            </div>
          )}
        </Card>
        <Card className="tinted">
          <CardTitle title={t("Retained booking history")} />
          <div className="timeline">
            {b.transitions.map((e) => (
              <div className="timeline-item" key={e.id}>
                <span className="timeline-node">
                  <Icon name="check" size={14} />
                </span>
                <div>
                  <strong>{t(bookingLabels[e.command])}</strong>
                  <p>
                    <bdi>
                      {date(e.recordedAt, b.timeZone)} ·{" "}
                      {time(e.recordedAt, b.timeZone)}
                    </bdi>
                  </p>
                  <Badge tone="soft">{t(bookingLabels[e.toState])}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardTitle title={t("Attendance observations")} />
        {b.attendanceHistory.length ? (
          b.attendanceHistory.map((e) => (
            <article className="observation-row" key={e.id}>
              <Badge tone="soft">{t(bookingLabels[e.observation])}</Badge>
              <span>
                {t(
                  e.supersedesId
                    ? "Correction appended"
                    : "Original observation",
                )}
              </span>
              <small>
                <bdi>
                  {date(e.recordedAt, b.timeZone)} ·{" "}
                  {time(e.recordedAt, b.timeZone)}
                </bdi>
              </small>
              {e.reason && <p dir="auto">{e.reason}</p>}
            </article>
          ))
        ) : (
          <p className="muted">
            {t(
              "No attendance observation has been recorded. Attendance and no-show are never automatic.",
            )}
          </p>
        )}
        <p className="small muted">
          {t(
            "Corrections preserve previous observations and never reopen booking capacity.",
          )}
        </p>
      </Card>
      {action === "reschedule" ? (
        <RescheduleDialog booking={b} close={() => setAction(undefined)} />
      ) : (
        action && (
          <BookingActionDialog
            action={action}
            booking={b}
            close={() => setAction(undefined)}
            done={() => {
              setAction(undefined);
              reload();
            }}
          />
        )
      )}
    </>
  );
}
function BookingActionDialog({
  action,
  booking: b,
  close,
  done,
}: {
  action: "cancel" | "attend" | "correct";
  booking: LiveBooking;
  close: () => void;
  done: () => void;
}) {
  const { t } = useLocale();
  const live = useLiveBookings();
  const { notify } = useApp();
  const now = useNow();
  const eligible = bookingEligibility(b, now);
  const [value, setValue] = useState<Observation>("ATTENDED"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const allowed =
    action === "cancel"
      ? eligible.change
      : action === "correct"
        ? eligible.correct &&
          correctionReasonValid(reason) &&
          now >= Date.parse(value === "ATTENDED" ? b.startAt : b.endAt)
        : value === "ATTENDED"
          ? eligible.attend
          : eligible.noShow;
  const title =
    action === "cancel"
      ? "Cancel this booking?"
      : action === "correct"
        ? "Append an attendance correction"
        : "Record attendance";
  return (
    <Modal
      className="modal"
      aria-labelledby="booking-action-title"
      aria-describedby="booking-action-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="calendar" />
        </span>
        <button
          className="icon-button"
          disabled={busy}
          aria-label={t("Close booking action")}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="booking-action-title">{t(title)}</h2>
      <p className="muted" id="booking-action-description">
        {t(
          action === "cancel"
            ? "Cancellation is final for this booking. The server verifies eligibility before applying it."
            : action === "correct"
              ? "Append a new observation with a reason. Previous observations remain in history; capacity is not reopened."
              : "Confirm the observation explicitly. This does not open a consultation or grant medical-record access.",
        )}
      </p>
      <BookingTime booking={b} />
      {action === "correct" && (
        <div className="boundary-notice">
          <strong>{t("Previous observation")}</strong>
          <p>{t(bookingLabels[b.attendance])}</p>
          {b.attendanceHistory.at(-1)?.reason && (
            <p dir="auto">{b.attendanceHistory.at(-1)?.reason}</p>
          )}
        </div>
      )}
      {action !== "cancel" && (
        <Field label={t("Attendance observation")}>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value as Observation)}
            disabled={busy}
          >
            <option value="ATTENDED">{t("Attended")}</option>
            <option value="NO_SHOW">{t("No-show")}</option>
          </select>
        </Field>
      )}
      {action === "correct" && (
        <Field
          label={t("Correction reason")}
          hint={t(
            "Required: 1–1000 characters, no control characters. Enter operational context only.",
          )}
        >
          <textarea
            rows={3}
            dir="auto"
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      )}
      {!allowed && (
        <p className="small muted">
          {t(
            action === "correct" && !correctionReasonValid(reason)
              ? "Enter a valid bounded correction reason."
              : "This observation or action is not yet eligible for the selected time and state.",
          )}
        </p>
      )}
      {error && <BookingError message={error} />}
      <button
        className="button primary full"
        disabled={busy || !allowed}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (action === "cancel") await live.cancel(b);
            else if (action === "correct") await live.correct(b, value, reason);
            else await live.attendance(b, value);
            notify(
              action === "cancel"
                ? "Your booking was cancelled."
                : action === "correct"
                  ? "Attendance correction appended."
                  : "Attendance observation saved.",
            );
            done();
          } catch (e) {
            setError(safeErrorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? t(action === "cancel" ? "Cancelling…" : "Saving observation…")
          : t(
              action === "cancel"
                ? "Confirm cancellation"
                : action === "correct"
                  ? "Append correction"
                  : "Confirm observation",
            )}
      </button>
      <button className="button subtle full" disabled={busy} onClick={close}>
        {t("Go back")}
      </button>
    </Modal>
  );
}
function RescheduleDialog({
  booking: b,
  close,
}: {
  booking: LiveBooking;
  close: () => void;
}) {
  const { t } = useLocale();
  const { api, changed, notify } = useApp();
  const live = useLiveBookings();
  const router = useRouter();
  const [page, setPage] = useState(1),
    [slot, setSlot] = useState<Availability>(),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const choices = useResource(
    () =>
      api.availabilityPage(b.providerId, {
        clinic: b.clinicId,
        page,
        pageSize: 20,
      }),
    [api, b.providerId, b.clinicId, page],
  );
  return (
    <Modal
      className="modal reschedule-modal"
      aria-labelledby="reschedule-title"
      aria-describedby="reschedule-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="calendar" />
        </span>
        <button
          className="icon-button"
          disabled={busy}
          aria-label={t("Close reschedule")}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="reschedule-title">
        {t(review ? "Review reschedule" : "Choose a replacement time")}
      </h2>
      <p className="muted" id="reschedule-description">
        {t(
          "Same clinician and same clinic only. To change provider, cancel and make a separate new booking.",
        )}
      </p>
      <Detail icon="calendar" title={t("Current booking")}>
        <BookingTime booking={b} />
      </Detail>
      {review && slot ? (
        <>
          <Detail icon="clock" title={t("Replacement time")}>
            <BookingTime booking={slot} />
          </Detail>
          <p className="small muted">
            {t(
              "The server replaces the booking atomically. A failed replacement leaves the original booking unchanged.",
            )}
          </p>
        </>
      ) : (
        <Resource resource={choices}>
          {(p) => {
            const rows = p.data.filter(
              (s) =>
                s.providerId === b.providerId &&
                s.clinicId === b.clinicId &&
                s.id !== b.slotId &&
                s.bookable,
            );
            return (
              <>
                {rows.length ? (
                  <div className="slots live-slots">
                    {rows.map((s) => (
                      <button
                        key={s.id}
                        aria-pressed={slot?.id === s.id}
                        className={slot?.id === s.id ? "selected" : ""}
                        onClick={() => setSlot(s)}
                      >
                        <BookingTime booking={s} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title={t("No eligible replacement times")}
                    description={t(
                      "Try another page or return later. Your original booking remains unchanged.",
                    )}
                  />
                )}
                <div className="pagination">
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() => {
                      setSlot(undefined);
                      setPage(page - 1);
                    }}
                  >
                    {t("Previous")}
                  </button>
                  <span>{t("Page {page}", { page: String(page) })}</span>
                  <button
                    className="button secondary"
                    disabled={
                      page >= 10000 || page * p.meta.pageSize >= p.meta.total
                    }
                    onClick={() => {
                      setSlot(undefined);
                      setPage(page + 1);
                    }}
                  >
                    {t("Next")}
                  </button>
                </div>
              </>
            );
          }}
        </Resource>
      )}
      {error && <BookingError message={error} />}
      <button
        className="button primary full"
        disabled={busy || !slot}
        onClick={async () => {
          if (!slot) return;
          if (!review) {
            setReview(true);
            return;
          }
          setBusy(true);
          setError("");
          try {
            const next = await live.reschedule(b, slot);
            notify("Your booking was rescheduled.");
            changed();
            close();
            router.push(`/patient/appointments/${next.id}`);
          } catch (e) {
            setError(safeErrorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? t("Rescheduling…")
          : t(review ? "Confirm reschedule" : "Review reschedule")}
      </button>
      <button
        className="button subtle full"
        disabled={busy}
        onClick={() => {
          if (review) {
            setReview(false);
            setError("");
          } else close();
        }}
      >
        {t("Go back")}
      </button>
    </Modal>
  );
}
