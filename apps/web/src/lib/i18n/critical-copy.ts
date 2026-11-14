import { ar } from "./ar";
import type { Locale } from "./catalog";

/** Authored UI dependencies of one transaction, never recorded person/clinical data. */
export const criticalCopyTasks = {
  bookingCreate: {
    required: [
      "Close booking", "Live booking", "Confirm your booking",
      "Check your doctor, clinic and appointment time before confirming your booking.",
      "Your doctor", "Clinic", "Clinic unavailable",
      "An appointment reserves a time. Medical information is shared only through your current care relationship.",
      "Confirming…", "Retry unchanged booking", "Confirm live booking", "Go back",
      "Your live booking is confirmed.", "View booking", "Booking details", "Refresh session",
      "Check the booking command and try again. No medical information belongs in a booking.",
      "Your session has ended. Please sign in again.",
      "Request verification failed. Refresh your session before retrying.",
      "This booking or slot is unavailable for your current access.",
      "The booking changed or this action is no longer eligible. Refresh the booking and available times before trying a new command.",
      "The booking request is too large.",
      "The booking request could not be accepted. Refresh and try again.",
      "The booking service is unavailable. Your request may not have completed. Retry the unchanged command to check its outcome.",
      "The service could not complete this request. Please try again.",
    ],
    optional: ["Booking progress", "Choose a time", "Review details", "Booking confirmation"],
  },
} as const;
export type CriticalCopyTask = keyof typeof criticalCopyTasks;
export interface CriticalCopyState {
  ready: boolean;
  optionalReady: boolean;
  missing: readonly string[];
}
const placeholders = (value: string) => {
  if (/[{}]/.test(value.replace(/\{\w+\}/g, ""))) return null;
  return (value.match(/\{\w+\}/g) ?? []).sort().join("\0");
};
const available = (key: string) =>
  Object.hasOwn(ar, key) && typeof ar[key] === "string" &&
  ar[key].trim().length > 0 && placeholders(ar[key]) !== null &&
  placeholders(ar[key]) === placeholders(key);

/** Pure completeness check, before interpolation. No logging, state, or translation fallback. */
export function criticalCopyState(
  locale: Locale,
  task: CriticalCopyTask,
  selectedAuthoredKeys: readonly string[] = [],
): CriticalCopyState {
  if (locale === "en") return { ready: true, optionalReady: true, missing: [] };
  const group = criticalCopyTasks[task];
  const missing = [...new Set([...group.required, ...selectedAuthoredKeys])].filter(
    (key) => !available(key),
  );
  return { ready: missing.length === 0, optionalReady: group.optional.every(available), missing };
}

/** Fixed fallback chrome and actual-outcome copy, independent of a damaged catalog.
 * Unavailable/U: accepted ARABIC_UX/CONTENT_SYSTEM; other labels reuse current ar.ts.
 */
export const bookingCopySafety = {
  unavailable: "المهمة دي مش متاحة بالعربي دلوقتي.",
  close: "إغلاق مراجعة الحجز",
  back: "رجوع",
  refreshSession: "تحديث جلسة الدخول",
  confirmed: "تم تأكيد حجزك الفعلي.",
  uncertain: "مش قادرين نأكد إذا كان الإجراء اكتمل ولا لأ. راجع الحالة الحالية. ما تبدأش طلب جديد. لو استعادة الطلب الأصلي متاحة، استخدمها.",
  uncertainEnglish: "We could not confirm whether the action completed. Check the current state. Do not start a new action. Recover the original request if available.",
  unrecoverable: "مش متاح استعادة الطلب الأصلي هنا. ما تكررش إجراء الرعاية بطلب جديد.",
  unrecoverableEnglish: "The original request cannot be recovered here. Do not repeat this care action from a new request.",
} as const;
