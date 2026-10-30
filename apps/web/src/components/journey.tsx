"use client";
import { useState } from "react";
import Link from "next/link";
import type { Role } from "../lib/api/contracts";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import { Badge, Card, Icon } from "./ui";

/** Navigation only: no inferred completion, counts or new clinical authority. */
export function PatientJourney() {
  const { api } = useApp();
  const { t } = useLocale();
  return (
    <section className="patient-journey" aria-label={t("Your care journey")}>
      <div>
        <strong>{t("Your care journey")}</strong>
        <small>
          {api.mode === "live" ? t("Connected live care") : t("Browser-only demo care")}
        </small>
      </div>
      {[
        ["/patient/discover", "Discover care", "search"],
        ["/patient/appointments", "Plan your visit", "calendar"],
        [
          api.mode === "live" ? "/patient/summaries" : "/patient/record",
          "Read released care",
          "record",
        ],
      ].map(([href, label, icon], index) => (
        <Link key={href} href={href}>
          <span className="journey-number" aria-hidden="true">
            {index + 1}
          </span>
          <span>{t(label)}</span>
          <Icon name={icon as "search"} size={18} />
        </Link>
      ))}
    </section>
  );
}

export function LiveSummaryEntry() {
  const { t } = useLocale();
  return (
    <div className="live-summary-entry">
      <span className="icon-tile">
        <Icon name="record" />
      </span>
      <h3>{t("Your released care, ready to read")}</h3>
      <p className="muted">
        {t(
          "Read signed summaries and instructions shared by your clinician. Private notes and unreleased drafts stay private.",
        )}
      </p>
      <Link className="button secondary" href="/patient/summaries">
        {t("Open released summaries")}
        <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}

const destinations = {
  doctor: {
    role: "CLINICIAN",
    path: "/doctor/schedule",
    label: "Continue as doctor",
  },
  pharmacy: {
    role: "PHARMACY_STAFF",
    path: "/pharmacy",
    label: "Continue to pharmacy",
  },
  laboratory: {
    role: "LAB_STAFF",
    path: "/laboratory",
    label: "Continue to laboratory",
  },
  patient: {
    role: "PATIENT",
    path: "/patient/record",
    label: "See the patient record",
  },
} satisfies Record<string, { role: Role; path: string; label: string }>;

/** Presenter shortcuts are exclusively synthetic; not authorization or clinical navigation. */
export function DemoContinuation({
  next,
}: {
  next: (keyof typeof destinations)[];
}) {
  const { api, openDemoWorkspace } = useApp();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (api.mode !== "demo") return null;
  return (
    <Card className="journey-continuation">
      <div>
        <Badge tone="soft">{t("Demo journey")}</Badge>
        <h3>{t("Continue the care story")}</h3>
        <p className="muted">
          {t(
            "Switch synthetic workspaces to follow this browser-only journey.",
          )}
        </p>
      </div>
      <div className="journey-actions">
        {next.map((key) => {
          const destination = destinations[key];
          return (
            <button
              key={key}
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(false);
                try {
                  await openDemoWorkspace(destination.role, destination.path);
                } catch {
                  setError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t(destination.label)}
              <Icon name="arrow" size={16} />
            </button>
          );
        })}
        {error && <p role="alert">{t("Please try again.")}</p>}
      </div>
    </Card>
  );
}
