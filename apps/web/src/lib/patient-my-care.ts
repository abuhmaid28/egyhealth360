import type { Appointment, Provider } from "./api/contracts";
import type { LiveBooking } from "./api/live-booking";
import type { ReleasedSummary } from "./clinical/documentation";

/** Read-only display projections. No command, grant, inferred completion or fake Live data. */
export interface CareAppointment {
  id: string;
  doctor: string | null;
  specialty: string | null;
  clinic: string | null;
  startAt: string;
  timeZone: string;
  state: LiveBooking["state"];
}
export interface CareActivity {
  key: string;
  kind: "summary" | "appointment";
  title: string;
  source: string | null;
  occurredAt: string | null;
  timeZone: string;
  href: string;
  state: string;
}
export const ownDemoAppointment = (row: Appointment): CareAppointment => ({
  id: row.id,
  doctor: row.provider.displayName,
  specialty: row.provider.specialty.displayName,
  clinic:
    row.provider.clinics.find((c) => c.id === row.slot.clinicId)?.displayName ??
    null,
  startAt: row.slot.startAt,
  timeZone: row.slot.timeZone,
  state: row.status === "Upcoming" ? "BOOKED" : "CONSULTED",
});
export function ownLiveAppointment(
  row: LiveBooking,
  providers: Provider[],
  clinics: { id: string; displayName: string }[],
): CareAppointment {
  const provider = providers.find((p) => p.id === row.providerId);
  return {
    id: row.id,
    doctor: provider?.displayName ?? null,
    specialty: provider?.specialty.displayName ?? null,
    clinic: clinics.find((c) => c.id === row.clinicId)?.displayName ?? null,
    startAt: row.startAt,
    timeZone: row.timeZone,
    state: row.state,
  };
}
export function nextCareAppointment(
  rows: readonly CareAppointment[],
): CareAppointment | undefined {
  // A past BOOKED visit stays BOOKED. The server, not the browser clock, owns status.
  return [...rows]
    .filter((r) => ["BOOKED", "IN_CONSULTATION"].includes(r.state))
    .sort(
      (a, b) =>
        Number(b.state === "IN_CONSULTATION") -
          Number(a.state === "IN_CONSULTATION") ||
        Date.parse(a.startAt) - Date.parse(b.startAt),
    )[0];
}
export function sharedActivity(
  rows: readonly ReleasedSummary[],
): CareActivity[] {
  return rows
    .filter((r) => r.current && r.state === "SIGNED_RELEASED")
    .map((r) => ({
      key: r.key,
      kind: "summary",
      title: "Visit summary",
      source: r.authorName,
      occurredAt: r.releasedAt,
      timeZone: "UTC",
      href: "/patient/summaries",
      state: "Shared with you",
    }));
}
export function appointmentActivity(
  rows: readonly CareAppointment[],
): CareActivity[] {
  return rows.map((r) => ({
    key: r.id,
    kind: "appointment",
    title: "Appointment",
    source: r.doctor,
    occurredAt: r.startAt,
    timeZone: r.timeZone,
    href: `/patient/appointments/${encodeURIComponent(r.id)}`,
    state: r.state,
  }));
}
export function careDate(value: string, zone: string, locale: "ar" | "en") {
  return new Intl.DateTimeFormat(
    locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: zone,
    },
  ).format(new Date(value));
}
export function careTime(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  }).format(new Date(value));
}
export function careOffset(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(value))
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "UTC");
}
