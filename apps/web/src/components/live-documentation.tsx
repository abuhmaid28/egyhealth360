"use client";
import { ConsultationCloseCard } from "./consultation-close";
import type { ConsultationContext } from "../lib/api/consultation-close";
import { FollowUpScreen } from "./follow-up-intents";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "./context";
import { useLocale } from "../lib/i18n/context";
import { DocumentationError } from "../lib/clinical/documentation";
import {
  DocumentationWorkspaceScreen,
  ReleasedSummariesScreen,
} from "./documentation";
import { Card, Field, Resource, useResource } from "./ui";

export function LiveDocumentationWorkspace({
  bookingId,
}: {
  bookingId: string;
}) {
  const { api } = useApp();
  const { t } = useLocale();
  const resource = useResource(async () => {
    const receipt = await api.consultationClose?.context(bookingId);
    if (!receipt || !api.liveBookings || !api.liveDocumentation)
      throw new DocumentationError("context");
    const [booking, providers, clinics] = await Promise.all([
      api.liveBookings.detail(bookingId),
      api.providers().catch(() => []),
      api.clinics().catch(() => []),
    ]);
    return {
      receipt,
      booking,
      providerName:
        providers.find((p) => p.id === booking.providerId)?.displayName ?? "",
      clinicName:
        clinics.find((c) => c.id === booking.clinicId)?.displayName ?? "",
    };
  }, [api, bookingId]);
  return (
    <>
      <Link className="back-link" href={`/doctor/consultation/${bookingId}`}>
        {t("Back to consultation")}
      </Link>
      <Resource resource={resource}>
        {({ receipt, booking, providerName, clinicName }) => (
          <ScopedWorkspace
            receipt={receipt}
            booking={booking}
            providerName={providerName}
            clinicName={clinicName}
          />
        )}
      </Resource>
    </>
  );
}
function ScopedWorkspace({
  receipt,
  booking,
  providerName,
  clinicName,
}: {
  providerName: string;
  clinicName: string;
  receipt: ConsultationContext;
  booking: import("../lib/api/live-booking").LiveBooking;
}) {
  const { api } = useApp();
  const { t } = useLocale();
  const [lifecycle, setLifecycle] = useState(receipt);
  const documentation = useMemo(
    () => ({
      receipt,
      patientName: booking.patientDisplayName,
      providerName,
      clinicName,
      timeZone: booking.timeZone,
    }),
    [receipt, booking, providerName, clinicName],
  );
  const service = useMemo(
    () =>
      api.liveDocumentation!.forConsultation({
        receipt,
        patientName: booking.patientDisplayName,
        providerName,
        clinicName,
        timeZone: booking.timeZone,
      }),
    [api, receipt, booking, providerName, clinicName],
  );
  const followUp = useMemo(
    () => api.followUpIntents!.forConsultation(receipt.id),
    [api, receipt.id],
  );
  return (
    <>
      <ConsultationCloseCard
        context={lifecycle}
        documentation={documentation}
        update={setLifecycle}
      />
      <nav
        className="documentation-action-row"
        aria-label={t("Consultation steps")}
      >
        <a className="button secondary" href="#live-documentation">
          {t("Clinical documentation")}
        </a>
        <a className="button secondary" href="#review-close">
          {t("Review & close consultation")}
        </a>
        <a className="button secondary" href="#live-follow-up">
          {t("Follow-up instructions")}
        </a>
      </nav>
      <div id="live-documentation">
        <DocumentationWorkspaceScreen service={service} />
      </div>
      <FollowUpScreen service={followUp} author />
    </>
  );
}
/** Exact current-related released projection. No generic clinical/forensic browser. */
export function RelatedSummaries() {
  const { api } = useApp();
  const { t } = useLocale();
  const [locator, setLocator] = useState("");
  const [patient, setPatient] = useState("");
  const service = useMemo(
    () => patient && api.liveDocumentation?.forPatient(patient),
    [api, patient],
  );
  return (
    <>
      <Card>
        <h2>{t("Current-related patient released summaries")}</h2>
        <p>
          {t(
            "Your own current active patient relationship is required. Private notes and drafts are never included.",
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPatient(locator);
          }}
        >
          <Field label={t("Patient record locator")}>
            <input
              value={locator}
              onChange={(e) => {
                setLocator(e.target.value);
                setPatient("");
              }}
              pattern="[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
              required
              autoComplete="off"
            />
          </Field>
          <button className="button primary">
            {t("View released summaries")}
          </button>
        </form>
      </Card>
      {service && <ReleasedSummariesScreen service={service} />}
    </>
  );
}
