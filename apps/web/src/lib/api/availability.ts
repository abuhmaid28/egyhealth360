import { UiError } from "./errors";
import type { Availability, OwnAvailability, Page } from "./contracts";
const invalid = () =>
  new UiError(
    "The availability service returned an invalid response. Please refresh.",
  );
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
};
const string = (row: Record<string, unknown>, key: string): string => {
  if (typeof row[key] !== "string") throw invalid();
  return row[key] as string;
};
function base(value: unknown) {
  const row = object(value);
  const startAt = string(row, "startAt"),
    endAt = string(row, "endAt"),
    timeZone = string(row, "timeZone");
  if (
    !Number.isFinite(Date.parse(startAt)) ||
    !Number.isFinite(Date.parse(endAt)) ||
    Date.parse(startAt) >= Date.parse(endAt)
  )
    throw invalid();
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    throw invalid();
  }
  return {
    id: string(row, "id"),
    providerId: string(row, "providerId"),
    clinicId: string(row, "clinicId"),
    startAt,
    endAt,
    timeZone,
  };
}
/** Explicit allowlist projection. Extra upstream/internal fields never enter presentation/demo state. */
export function publicSlot(value: unknown): Availability {
  const row = object(value);
  if (typeof row.bookable !== "boolean") throw invalid();
  return { ...base(value), bookable: row.bookable };
}
export function ownSlot(value: unknown): OwnAvailability {
  const row = object(value);
  if (
    !["PUBLISHED", "WITHDRAWN"].includes(String(row.state)) ||
    typeof row.version !== "number" ||
    ![1, 2].includes(row.version) ||
    (row.withdrawnAt !== null && typeof row.withdrawnAt !== "string")
  )
    throw invalid();
  return {
    ...base(value),
    state: row.state as OwnAvailability["state"],
    version: row.version as number,
    publishedAt: string(row, "publishedAt"),
    withdrawnAt: row.withdrawnAt as string | null,
  };
}
export function availabilityPage<T>(
  value: unknown,
  project: (value: unknown) => T,
): Page<T> {
  const row = object(value),
    meta = object(row.meta);
  if (
    !Array.isArray(row.data) ||
    !Number.isInteger(meta.page) ||
    Number(meta.page) < 1 ||
    !Number.isInteger(meta.pageSize) ||
    Number(meta.pageSize) < 1 ||
    !Number.isInteger(meta.total) ||
    Number(meta.total) < 0
  )
    throw invalid();
  return {
    data: row.data.map(project),
    meta: {
      page: Number(meta.page),
      pageSize: Number(meta.pageSize),
      total: Number(meta.total),
    },
  };
}
