"use client";
import { useState } from "react";
import Link from "next/link";
import type { Role } from "../lib/api/contracts";
import { useLocale } from "../lib/i18n/context";
import { useApp } from "./context";
import { Badge, Card, Icon } from "./ui";

export function BookingUnavailable({ doctor = false }: { doctor?: boolean }) {
  const { t } = useLocale();
  return (
    <Card className="booking-unavailable">
      <span className="icon-tile">
        <Icon name="calendar" />
      </span>
      <h3>{t("Live booking is not connected")}</h3>
      <p className="muted">
        {t(
          "Published availability is live. Booking and visit workflows are available in the graduation demo only.",
        )}
      </p>
      <Link
        href={doctor ? "/doctor/availability" : "/patient/discover"}
        className="button secondary"
      >
        {doctor ? t("Manage availability") : t("Find a doctor")}
        <Icon name="arrow" size={16} />
      </Link>
    </Card>
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
