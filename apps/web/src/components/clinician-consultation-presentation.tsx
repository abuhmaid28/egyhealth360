"use client";
import Link from "next/link";
import { createContext, useEffect, useRef, useState } from "react";
import { useLocale } from "../lib/i18n/context";
import { clinicianConsultationCopy } from "../lib/clinician-consultation-copy";
import { presentationName, timeZoneLabel, repeatedTimeOffset } from "../lib/presentation";
import { careDate, careTime, careOffset } from "../lib/patient-my-care";
import type {
  DocumentationWorkspace,
  FactsDraft,
} from "../lib/clinical/documentation";
import { Icon } from "./ui";
/** Presentation mode only. Never contains actor, authority, clinical values or service snapshots. */
export const ClinicianPresentationContext = createContext(false);

export function ConsultationIdentity({
  patientName,
  providerName,
  clinicName,
  startAt,
  timeZone,
  state,
  bookingId,
}: {
  patientName: string;
  providerName: string;
  clinicName: string;
  startAt: string;
  timeZone: string;
  state: "OPEN" | "CLOSED";
  bookingId: string;
}) {
  const { t } = useLocale();
  const offset = repeatedTimeOffset(startAt, timeZone);
  const name = presentationName(patientName, t);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0])
    .join("");
  return (
    <header className="master-context-ribbon">
      <div className="master-identity">
        {initials && (
          <span className="master-patient-monogram" aria-hidden="true">
            <bdi>{initials}</bdi>
          </span>
        )}
        <div>
          <p className="eyebrow">{t("Patient and visit")}</p>
          <h1>
            <bdi>{name}</bdi>
          </h1>
          {(providerName || clinicName) && (
            <p className="master-provider">
              {providerName && <bdi>{presentationName(providerName, t)}</bdi>}
              {providerName && clinicName && (
                <span aria-hidden="true"> · </span>
              )}
              {clinicName && <bdi>{presentationName(clinicName, t)}</bdi>}
            </p>
          )}
        </div>
      </div>
      <div className="master-visit">
        <ClinicalTimestamp value={startAt} zone={timeZone} />
        <small>
          <bdi>{timeZoneLabel(timeZone, t)}</bdi>
          {offset && <> · <bdi dir="ltr">{offset}</bdi></>}
        </small>
      </div>
      <span className="master-consultation-state" data-state={state}>
        {t(state === "CLOSED" ? "Closed visit" : "Consultation open")}
      </span>
      <Link className="master-back" href={`/doctor/consultation/${bookingId}`}>
        <Icon name="arrow" size={16} />
        <span>{t("Back to consultation")}</span>
      </Link>
    </header>
  );
}
export function ConsultationTasks() {
  const { t } = useLocale();
  const [active, setActive] = useState("live-documentation");
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      const scope = ref.current?.closest(".scoped-consultation");
      const bottom =
        scope?.querySelector(".consultation-ribbon")?.getBoundingClientRect()
          .bottom ?? 0;
      let next = "live-documentation";
      for (const id of [
        "live-documentation",
        "live-follow-up",
        "review-close",
      ]) {
        const el = scope?.querySelector(`#${id}`);
        if (el && el.getBoundingClientRect().top <= bottom + 48) next = id;
      }
      setActive(next);
    };
    globalThis.addEventListener("scroll", update, { passive: true });
    globalThis.addEventListener("resize", update);
    update();
    return () => {
      globalThis.removeEventListener("scroll", update);
      globalThis.removeEventListener("resize", update);
    };
  }, []);
  return (
    <nav
      ref={ref}
      className="master-local-tasks"
      aria-label={t("Consultation steps")}
      data-clinician-local-tasks
    >
      {[
        ["live-documentation", "Clinical documentation"],
        ["live-follow-up", "Follow-up instructions"],
        ["review-close", "Review & close consultation"],
      ].map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "location" : undefined}
          onClick={() => setActive(id)}
        >
          {t(label)}
        </a>
      ))}
    </nav>
  );
}
export function ClinicianSourceRail({
  view,
  factTarget,
}: {
  view: DocumentationWorkspace;
  factTarget: "PRIVATE_NOTE" | "PATIENT_SUMMARY";
}) {
  const { locale, t } = useLocale(),
    c = clinicianConsultationCopy[locale];
  const facts: FactsDraft | undefined =
    factTarget === "PRIVATE_NOTE" ? view.note?.facts : view.summary?.facts;
  const allergy = facts?.allergy.state;
  const allergyLabel =
    allergy === "NOT_REVIEWED"
      ? "Not reviewed — review has not taken place"
      : allergy === "UNKNOWN"
        ? "Unknown — information is not available"
        : allergy === "REVIEWED_NO_KNOWN"
          ? "Reviewed — no known allergy or intolerance"
          : "Reviewed — positive human-entered findings";
  return (
    <aside
      className="master-source-rail"
      aria-labelledby="master-source-title"
      data-clinician-source-rail
    >
      <h2 id="master-source-title">{c.sources}</h2>
      <dl>
        <div>
          <dt>{t("Private note")}</dt>
          <dd className="master-source-state">
            {view.note
              ? view.note.state === "SIGNED"
                ? c.signedPrivate
                : c.saved
              : c.noPrivate}
          </dd>
          <dd className="master-purpose">{c.privatePurpose}</dd>
        </div>
        <div>
          <dt>{t("Patient summary")}</dt>
          <dd className="master-source-state">
            {view.summary
              ? view.summary.state === "SIGNED_RELEASED"
                ? t("Signed and released")
                : c.saved
              : c.noSummary}
          </dd>
          <dd className="master-purpose">{c.patientPurpose}</dd>
        </div>
        {allergy && (
          <div>
            <dt>{t("Allergy review")}</dt>
            <dd>{t(allergyLabel)}</dd>
            <dd className="master-purpose">
              {c.currentSource}:{" "}
              {t(
                factTarget === "PRIVATE_NOTE"
                  ? "Private note"
                  : "Patient summary",
              )}
            </dd>
          </div>
        )}
        <div>
          <dt>{c.opened}</dt>
          <dd>
            <ClinicalTimestamp value={view.openedAt} zone={view.timeZone} />
            <br />
            <bdi dir="ltr">
              {view.timeZone} · {careOffset(view.openedAt, view.timeZone)}
            </bdi>
          </dd>
        </div>
      </dl>
      <p className="master-source-boundary">
        {t("Booking grants no clinical authority")}
      </p>
      <a href="#live-follow-up">
        {t("Follow-up instructions")}
        <Icon name="arrow" size={16} />
      </a>
      <small>{c.separate}</small>
      <p className="master-independent">{c.independent}</p>
    </aside>
  );
}
export function SourcePurpose({ kind }: { kind: "private" | "summary" }) {
  const { locale } = useLocale(),
    c = clinicianConsultationCopy[locale];
  return (
    <small className="master-purpose" aria-hidden="true">
      {kind === "private" ? c.privatePurpose : c.patientPurpose}
    </small>
  );
}
export function ClinicalTimestamp({
  value,
  zone,
}: {
  value: string;
  zone: string;
}) {
  const { locale } = useLocale();
  return (
    <bdi>
      {careDate(value, zone, locale)} ·{" "}
      <bdi dir="ltr">{careTime(value, zone)}</bdi>
    </bdi>
  );
}
