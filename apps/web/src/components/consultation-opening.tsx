"use client";
import Link from "next/link";
import { useState } from "react";
import type { ConsultationContext } from "../lib/api/consultation-close";
import type { LiveBooking } from "../lib/api/live-booking";
import {
  openingEligibility,
  type OpeningReceipt,
} from "../lib/api/consultation-opening";
import { safeErrorMessage } from "../lib/api/errors";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import {
  BookingTime,
  BookingIdentity,
  useDirectoryNames,
  useNow,
} from "./live-booking";
import {
  Badge,
  Card,
  CardTitle,
  date,
  Heading,
  Icon,
  Modal,
  Resource,
  SessionRecovery,
  time,
  useResource,
} from "./ui";

export function ClinicalOpeningBoundary() {
  const { t } = useLocale();
  return (
    <div className="logistics-boundary">
      <Icon name="shield" size={18} />
      <p>
        {t(
          "Confirm the patient and your current care relationship before opening. An appointment alone does not give access to medical information.",
        )}
      </p>
    </div>
  );
}
export function OpeningScheduleStatus({ booking }: { booking: LiveBooking }) {
  const { t } = useLocale();
  const now = useNow();
  if (booking.state === "IN_CONSULTATION") return null;
  if (booking.state !== "BOOKED") return null;
  return (
    <Badge
      tone={openingEligibility(booking, now) === "may-open" ? "green" : "soft"}
    >
      {t(
        openingEligibility(booking, now) === "may-open"
          ? "Opening may be eligible"
          : "Upcoming visit",
      )}
    </Badge>
  );
}
export function ConsultationOpeningCard({
  booking,
  refresh,
}: {
  booking: LiveBooking;
  refresh: () => void;
}) {
  const { t } = useLocale();
  const { api } = useApp();
  const now = useNow();
  const service = api.consultationOpening;
  const eligibility = openingEligibility(booking, now);
  const receipt = service?.receipt(booking.id);
  const closed = booking.state === "CONSULTED";
  const opened = booking.state === "IN_CONSULTATION" || closed || !!receipt;
  const [confirm, setConfirm] = useState(false);
  const explanation = !service?.available
    ? "Consultation opening is unavailable. Refresh the booking before trying again."
    : eligibility === "too-early"
      ? "Consultation can be opened when the scheduled visit begins. The server checks the actual time and current authority."
      : eligibility === "unavailable"
        ? "This operational state does not allow consultation opening. Cancelled, rescheduled and no-show visits cannot be opened."
        : "The scheduled time has arrived. An active patient relationship and current clinician and clinic authority must still be verified by the server.";
  return (
    <Card className="opening-card">
      <CardTitle title={t("Consultation opening")} />
      <ClinicalOpeningBoundary />
      {opened ? (
        <>
          <p className="opening-success" role="status">
            <Icon name="check" />
            {t(closed ? "Consultation closed" : "Consultation opened")}
          </p>
          <p>
            {t(
              "The opening was confirmed by the server. Documentation requires your current clinical authority.",
            )}
          </p>
          <Link
            className="button primary"
            href={`/doctor/consultation/${booking.id}`}
          >
            {t(closed ? "Review closed consultation" : "View opening details")}
            <Icon name="arrow" size={16} />
          </Link>
        </>
      ) : (
        <>
          <p id="opening-eligibility" className="muted">
            {t(explanation)}
          </p>
          <button
            className="button primary"
            disabled={!service?.available || eligibility !== "may-open"}
            aria-describedby="opening-eligibility"
            onClick={() => setConfirm(true)}
          >
            {t("Start consultation")}
            <Icon name="arrow" size={16} />
          </button>
        </>
      )}
      {confirm && (
        <OpeningDialog
          booking={booking}
          close={() => setConfirm(false)}
          done={() => {
            setConfirm(false);
            refresh();
          }}
        />
      )}
    </Card>
  );
}
function OpeningDialog({
  booking,
  close,
  done,
}: {
  booking: LiveBooking;
  close: () => void;
  done: () => void;
}) {
  const { t } = useLocale();
  const { api, changed } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = useNow();
  const names = useDirectoryNames();
  return (
    <Modal
      className="modal"
      aria-labelledby="opening-title"
      aria-describedby="opening-confirm-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
    >
      <div className="modal-header">
        <span className="icon-tile">
          <Icon name="shield" />
        </span>
        <button
          className="icon-button"
          aria-label={t("Close")}
          disabled={busy}
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="eyebrow">{t("Live consultation opening")}</p>
      <h2 id="opening-title">{t("Open this scheduled visit?")}</h2>
      <p id="opening-confirm-description" className="muted">
        {t(
          "This explicit action asks the server to open this exact booking. It does not create a patient relationship or save clinical documentation.",
        )}
      </p>
      <div className="confirmation-details">
        <BookingIdentity booking={booking} clinician names={names} />
        <BookingTime booking={booking} />
      </div>
      <ClinicalOpeningBoundary />
      <div aria-live="polite" role="status">
        {busy && (
          <p>
            {t(
              "Opening the consultation… Keep this visit open while the server confirms the outcome.",
            )}
          </p>
        )}
      </div>
      {error && (
        <>
          <p className="form-error" role="alert">
            {t(error)}
          </p>
          <SessionRecovery message={error} />
          <p className="small muted">
            {t(
              "Access may be unavailable because a current relationship or clinician or clinic eligibility is missing. No relationship is created by retrying.",
            )}
          </p>
        </>
      )}
      <div className="booking-actions">
        <button
          className="button primary"
          disabled={busy || openingEligibility(booking, now) !== "may-open"}
          onClick={async () => {
            if (!api.consultationOpening) return;
            setBusy(true);
            setError("");
            try {
              await api.consultationOpening.open(booking.id);
              changed();
              done();
            } catch (e) {
              setError(safeErrorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? t("Opening…")
            : error
              ? t("Retry unchanged opening")
              : t("Confirm opening")}
        </button>
        <button className="button secondary" disabled={busy} onClick={close}>
          {t("Go back")}
        </button>
      </div>
    </Modal>
  );
}
function OpeningMetadata({
  receipt,
  booking,
}: {
  receipt?: OpeningReceipt | ConsultationContext;
  booking: LiveBooking;
}) {
  const { t } = useLocale();
  const names = useDirectoryNames();
  return (
    <div className="two-column">
      <Card>
        <CardTitle
          title={t(booking.state === "CONSULTED" ? "Consultation closed" : receipt ? "Consultation opened" : "Opening status")}
        />
        {receipt ? (
          <>
            <Badge tone="green">{t(booking.state === "CONSULTED" ? "Closed · booking consulted" : "Opening confirmed")}</Badge>
            <p className="muted">
              {t("Actual opening time, confirmed by the server")}
            </p>
            <p className="opening-timestamp">
              <bdi>
                {date(receipt.openedAt, booking.timeZone)} ·{" "}
                {time(receipt.openedAt, booking.timeZone)}
              </bdi>
            </p>
            <small>
              <bdi>{booking.timeZone}</bdi>
            </small>
          </>
        ) : (
          <p>
            {t(
              "Return to the booking to check its current server state before opening the consultation.",
            )}
          </p>
        )}
        <h3>{t("Scheduled visit")}</h3>
        <BookingIdentity booking={booking} clinician names={names} />
        <BookingTime booking={booking} />
        <Link className="text-link" href={`/doctor/appointments/${booking.id}`}>
          {t("Return to booking")}
          <Icon name="arrow" size={16} />
        </Link>
      </Card>
      <Card className="tinted">
        <CardTitle title={t("Clinical documentation is separate")} />
        <p>
          {t(
            "Private notes and explicitly released patient summaries are available with current clinical authority.",
          )}
        </p>
        <p className="muted">
          {t(
            "The graduation Demo workspace remains a separate synthetic experience. Opening a real visit never copies Demo clinical content into it.",
          )}
        </p>
        <Link
          className="button secondary"
          href={`/doctor/consultation/${booking.id}/documentation`}
        >
          {t("Open clinical documentation")}
        </Link>
        <Link className="button secondary" href="/doctor/schedule">
          {t("Back to schedule")}
        </Link>
      </Card>
    </div>
  );
}
/** Booking-scoped recovery rechecks current treating authority on the server. */
export function LiveConsultationShell({ bookingId }: { bookingId: string }) {
  const { t } = useLocale();
  const { api, refresh } = useApp();
  const resource = useResource(async () => {
    if (!api.liveBookings) throw new Error("Live booking context missing.");
    const booking = await api.liveBookings.detail(bookingId);
    const receipt = (booking.state === "IN_CONSULTATION" || booking.state === "CONSULTED")
      ? await api.consultationClose!.context(bookingId) : undefined;
    return { booking, receipt };
  }, [api, bookingId, refresh]);
  return (
    <>
      <Link className="back-link" href="/doctor/schedule">
        {t("Back to schedule")}
      </Link>
      <Heading
        eyebrow={t("Live consultation opening")}
        title={t("Scheduled consultation")}
        description={t(
          "Opening details and documentation for this scheduled consultation.",
        )}
      />
      <ClinicalOpeningBoundary />
      <Resource resource={resource}>
        {({ booking, receipt }) => (
          <OpeningMetadata
            receipt={receipt}
            booking={booking}
          />
        )}
      </Resource>
    </>
  );
}
