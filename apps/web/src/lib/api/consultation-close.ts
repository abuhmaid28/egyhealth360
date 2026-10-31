import { UiError } from "./errors";

export interface ConsultationContext {
  id: string;
  encounterId: string;
  bookingId: string;
  providerId: string;
  clinicId: string;
  openedAt: string;
  closedAt: string | null;
  state: "OPEN" | "CLOSED";
  bookingState: "IN_CONSULTATION" | "CONSULTED";
  version: 1 | 2;
}
export type CloseReceipt = Omit<ConsultationContext, "openedAt"> & {
  state: "CLOSED";
  bookingState: "CONSULTED";
  version: 2;
  closedAt: string;
};
export const closeMessages: Record<number, string> = {
  400: "The close request could not be accepted. Refresh the consultation before continuing.",
  401: "Your session has ended. Please sign in again.",
  403: "Request verification failed. Refresh your session before retrying.",
  404: "This consultation is unavailable for your current access. Current treating authority and an active patient relationship are required.",
  409: "The consultation changed or is already closed. Refresh its current state before continuing.",
  503: "The close outcome is uncertain. Retry the unchanged close explicitly to check the result. Live mode remains active.",
};
export class CloseUiError extends UiError {
  constructor(
    public readonly status: number,
    read = false,
  ) {
    super(
      read && status === 503
        ? "Consultation context could not be refreshed. Check your current access and try again."
        : (closeMessages[status] ?? closeMessages[503]),
    );
  }
}
const invalid = (): never => {
  throw new CloseUiError(503);
};
const uuid = (v: unknown): string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    v,
  )
    ? v
    : invalid();
const timestamp = (v: unknown): string =>
  typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : invalid();
function object(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : invalid();
}
export function projectClose(
  value: unknown,
  context: ConsultationContext,
): CloseReceipt {
  const r = object(value);
  if (
    r.id !== context.id ||
    r.bookingId !== context.bookingId ||
    r.encounterId !== context.encounterId ||
    r.providerId !== context.providerId ||
    r.clinicId !== context.clinicId ||
    r.state !== "CLOSED" ||
    r.bookingState !== "CONSULTED" ||
    r.version !== 2
  )
    return invalid();
  return {
    id: uuid(r.id),
    bookingId: uuid(r.bookingId),
    encounterId: uuid(r.encounterId),
    providerId: uuid(r.providerId),
    clinicId: uuid(r.clinicId),
    state: "CLOSED",
    bookingState: "CONSULTED",
    version: 2,
    closedAt: timestamp(r.closedAt),
  };
}
export function projectContext(
  value: unknown,
  bookingId: string,
): ConsultationContext {
  const r = object(value);
  if (
    r.bookingId !== bookingId ||
    !(
      (r.state === "OPEN" &&
        r.bookingState === "IN_CONSULTATION" &&
        r.version === 1 &&
        r.closedAt === null) ||
      (r.state === "CLOSED" &&
        r.bookingState === "CONSULTED" &&
        r.version === 2)
    )
  )
    return invalid();
  return {
    id: uuid(r.id),
    encounterId: uuid(r.encounterId),
    bookingId: uuid(r.bookingId),
    providerId: uuid(r.providerId),
    clinicId: uuid(r.clinicId),
    openedAt: timestamp(r.openedAt),
    closedAt: r.state === "CLOSED" ? timestamp(r.closedAt) : null,
    state: r.state,
    bookingState: r.bookingState as ConsultationContext["bookingState"],
    version: r.version as 1 | 2,
  };
}
export interface ConsultationCloseApi {
  context(bookingId: string): Promise<ConsultationContext>;
  close(context: ConsultationContext): Promise<CloseReceipt>;
  clear(): void;
}
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
/** Keys live only in the authenticated in-memory scope. Unchanged explicit
 * retries retain the command, including after a committed response is lost.
 * No mutation is retried automatically and no clinical content is cached. */
export function createConsultationCloseApi(
  request: Request,
  csrf: () => string,
  newKey = () => crypto.randomUUID(),
): ConsultationCloseApi {
  const pending = new Map<string, string>();
  let generation = 0;
  return {
    async context(bookingId) {
      uuid(bookingId);
      const current = generation;
      try {
        const r = await request<{ data: unknown }>(
          `/me/bookings/${bookingId}/consultation`,
        );
        if (current !== generation) throw new CloseUiError(401);
        return projectContext(r.data, bookingId);
      } catch (e) {
        if (e instanceof CloseUiError) throw new CloseUiError(e.status, true);
        throw new CloseUiError(503, true);
      }
    },
    async close(context) {
      uuid(context.id);
      if (context.state !== "OPEN" || context.version !== 1)
        throw new CloseUiError(409);
      const current = generation,
        fingerprint = `${context.id}:${context.version}`;
      let key = pending.get(fingerprint);
      if (!key) {
        key = uuid(newKey());
        pending.set(fingerprint, key);
      }
      try {
        const r = await request<{ data: unknown }>(
          `/consultations/${context.id}/close`,
          {
            method: "PUT",
            headers: { "X-CSRF-Token": csrf() },
            body: JSON.stringify({
              operationKey: key,
              expectedVersion: context.version,
            }),
          },
        );
        if (current !== generation) throw new CloseUiError(401);
        return projectClose(r.data, context);
      } catch (e) {
        if (e instanceof CloseUiError) throw e;
        throw new CloseUiError(503);
      }
    },
    clear() {
      generation++;
      pending.clear();
    },
  };
}
