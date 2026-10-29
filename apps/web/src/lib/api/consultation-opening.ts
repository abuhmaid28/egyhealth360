import { UiError } from "./errors";
import type { LiveBooking } from "./live-booking";

/** Stage A presentation receipt, NOT a frozen backend DTO. Stage B must reconcile
 * this allowlist against merged OpenAPI before enabling the normal Live adapter. */
export interface OpeningReceipt {
  id: string;
  bookingId: string;
  providerId: string;
  clinicId: string;
  openedAt: string;
  state: "OPEN";
}
export interface ConsultationOpeningApi {
  readonly available: boolean;
  open(bookingId: string): Promise<OpeningReceipt>;
  receipt(bookingId: string): OpeningReceipt | undefined;
  clear(): void;
}
export const openingMessages: Record<number, string> = {
  400: "The opening request could not be accepted. Refresh the booking before trying again.",
  401: "Your session has ended. Please sign in again.",
  403: "Request verification failed. Refresh your session before retrying.",
  404: "Consultation opening is unavailable for your current access. An active patient relationship and current clinician and clinic authority are required. Booking alone grants none of these permissions.",
  409: "The booking or opening command changed. Refresh the booking to see its current state before trying again.",
  503: "The opening service is unavailable. The outcome is uncertain. Retry the unchanged opening command to check its outcome; do not start another visit.",
};
export class OpeningUiError extends UiError {
  constructor(public readonly status: number) {
    super(openingMessages[status] ?? openingMessages[503]);
  }
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function uuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new OpeningUiError(503);
  return value;
}
/** No state, consent or relationship inference: the server still checks all authority. */
export function openingEligibility(booking: LiveBooking, now = Date.now()) {
  if (booking.state !== "BOOKED") return "unavailable";
  return now < Date.parse(booking.startAt) ? "too-early" : "may-open";
}
export function projectOpening(
  value: unknown,
  bookingId: string,
): OpeningReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new OpeningUiError(503);
  const r = value as Record<string, unknown>;
  if (
    r.bookingId !== bookingId ||
    r.state !== "OPEN" ||
    typeof r.openedAt !== "string" ||
    !Number.isFinite(Date.parse(r.openedAt))
  )
    throw new OpeningUiError(503);
  return {
    id: uuid(r.id),
    bookingId: uuid(r.bookingId),
    providerId: uuid(r.providerId),
    clinicId: uuid(r.clinicId),
    openedAt: r.openedAt,
    state: "OPEN",
  };
}
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
/** Pending keys and receipts are session-memory only. Never automatic retries,
 * no Idempotency-Key header, no clinical command fields, no synthetic fallback. */
export function createConsultationOpeningApi(
  request: Request,
  csrf: () => string,
  available = false,
  newKey = () => crypto.randomUUID(),
): ConsultationOpeningApi {
  const pending = new Map<string, string>();
  const receipts = new Map<string, OpeningReceipt>();
  return {
    available,
    receipt: (id) => receipts.get(id),
    async open(id) {
      if (!available)
        throw new UiError(
          "Consultation opening is awaiting backend integration. Your real booking remains unchanged.",
        );
      uuid(id);
      let key = pending.get(id);
      if (!key) {
        key = uuid(newKey());
        pending.set(id, key);
      }
      try {
        const response = await request<{ data: unknown }>(
          `/me/bookings/${id}/consultation`,
          {
            method: "POST",
            headers: { "X-CSRF-Token": csrf() },
            body: JSON.stringify({ operationKey: key }),
          },
        );
        const result = projectOpening(response.data, id);
        receipts.set(id, result);
        // A successful unique opening is retained as the same command for safe
        // explicit duplicate replay. A new booking gets its own new command.
        return result;
      } catch (e) {
        if (e instanceof OpeningUiError) throw e;
        throw new OpeningUiError(503);
      }
    },
    clear() {
      pending.clear();
      receipts.clear();
    },
  };
}
