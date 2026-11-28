import type { Locale } from "../../../lib/i18n/catalog";

const EN_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const AR_WEEKDAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/** Normalize Eastern Arabic-Indic digits to Western Latin digits (0-9). */
export function toLatinDigits(value: string | number): string {
  return String(value)
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0));
}

function getCairoParts(isoString: string): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
} | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString.trim());
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const utc = new Date(Date.UTC(year, month - 1, day));
    return {
      year,
      month,
      day,
      weekday: utc.getUTCDay(),
      hour: 9,
      minute: 0,
    };
  }
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });
    const parts = formatter.formatToParts(parsed);
    const lookup = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      year: Number(lookup("year")),
      month: Number(lookup("month")),
      day: Number(lookup("day")),
      weekday: weekdayMap[lookup("weekday")] ?? parsed.getUTCDay(),
      hour: Number(lookup("hour")) % 24,
      minute: Number(lookup("minute")),
    };
  } catch {
    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate(),
      weekday: parsed.getUTCDay(),
      hour: parsed.getUTCHours(),
      minute: parsed.getUTCMinutes(),
    };
  }
}

/** Format ISO date/datetime with full weekday and explicit month name + Latin digits. */
export function formatFullDate(isoString: string, locale: Locale): string {
  const parts = getCairoParts(isoString);
  if (!parts) return toLatinDigits(isoString);
  if (locale === "ar") {
    return `${AR_WEEKDAYS[parts.weekday]}، ${parts.day} ${AR_MONTHS[parts.month - 1]} ${parts.year}`;
  }
  return `${EN_WEEKDAYS[parts.weekday]}, ${parts.day} ${EN_MONTHS[parts.month - 1]} ${parts.year}`;
}

/** Short explicit month + day badge (never numeric MM/DD) with Latin digits. */
export function formatDayMonthTile(isoString: string, locale: Locale): { day: string; month: string } {
  const parts = getCairoParts(isoString);
  if (!parts) return { day: toLatinDigits(isoString), month: "" };
  return {
    day: String(parts.day),
    month: (locale === "ar" ? AR_MONTHS[parts.month - 1] : EN_MONTHS[parts.month - 1]?.slice(0, 3)) ?? "",
  };
}

/** Format ISO timestamp or HH:mm: 12h with AM/PM or ص/م for patients; strict 24h for clinicians/staff. */
export function formatTimeDisplay(
  input: string,
  locale: Locale,
  audience: "patient" | "professional",
): string {
  const clean = toLatinDigits(input.trim());
  const hhmmOnly = /^(\d{1,2}):(\d{2})$/.exec(clean);
  let hour24 = 0;
  let minute = 0;
  if (hhmmOnly) {
    hour24 = Number(hhmmOnly[1]);
    minute = Number(hhmmOnly[2]);
  } else {
    const parts = getCairoParts(clean);
    if (!parts) return clean;
    hour24 = parts.hour;
    minute = parts.minute;
  }
  const mm = String(minute).padStart(2, "0");
  if (audience === "professional") {
    return `${String(hour24).padStart(2, "0")}:${mm}`;
  }
  const period = hour24 >= 12 ? (locale === "ar" ? "م" : "PM") : locale === "ar" ? "ص" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, "0")}:${mm} ${period}`;
}

function normalizeCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.trunc(count));
}

export function formatBookedVisitsCount(count: number, locale: Locale): string {
  const n = normalizeCount(count);
  const nStr = toLatinDigits(n);
  if (locale === "ar") {
    if (n === 0) return "لا توجد مواعيد مسجلة";
    if (n === 1) return "موعد واحد مسجل";
    if (n === 2) return "موعدان مسجلان";
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return `${nStr} مواعيد مسجلة`;
    return `${nStr} موعد مسجل`;
  }
  if (n === 1) return "1 booked visit";
  return `${nStr} booked visits`;
}

export function formatReleasedSummariesCount(count: number, locale: Locale): string {
  const n = normalizeCount(count);
  const nStr = toLatinDigits(n);
  if (locale === "ar") {
    if (n === 0) return "لا توجد ملخصات معتمدة";
    if (n === 1) return "ملخص واحد معتمد";
    if (n === 2) return "ملخصان معتمدان";
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return `${nStr} ملخصات معتمدة`;
    return `${nStr} ملخص معتمد`;
  }
  if (n === 1) return "1 released summary";
  return `${nStr} released summaries`;
}

const APPOINTMENT_STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  Upcoming: { en: "Upcoming", ar: "قادم" },
  Completed: { en: "Completed", ar: "مكتمل" },
};

const AVAILABILITY_STATE_LABELS: Record<string, { en: string; ar: string }> = {
  PUBLISHED: { en: "Published", ar: "منشور" },
  WITHDRAWN: { en: "Withdrawn", ar: "مسحوب" },
};

export function formatAppointmentStatus(status: string, locale: Locale): string {
  const entry = Object.prototype.hasOwnProperty.call(APPOINTMENT_STATUS_LABELS, status)
    ? APPOINTMENT_STATUS_LABELS[status]
    : undefined;
  if (!entry) return locale === "ar" ? "غير معروف" : "Unknown";
  return locale === "ar" ? entry.ar : entry.en;
}

export function formatAvailabilityState(state: string, locale: Locale): string {
  const entry = Object.prototype.hasOwnProperty.call(AVAILABILITY_STATE_LABELS, state)
    ? AVAILABILITY_STATE_LABELS[state]
    : undefined;
  if (!entry) return locale === "ar" ? "غير معروف" : "Unknown";
  return locale === "ar" ? entry.ar : entry.en;
}
