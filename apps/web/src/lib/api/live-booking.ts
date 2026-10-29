import { UiError } from "./errors";
import type { Availability, Page } from "./contracts";

/** Exact merged Slice 3 + Slice 4 logistics projection. No clinical record authority. */
export type BookingState =
  | "BOOKED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW"
  | "IN_CONSULTATION";
export type Observation = "ATTENDED" | "NO_SHOW";
export interface LiveBooking {
  id: string;
  slotId: string;
  providerId: string;
  clinicId: string;
  patientDisplayName: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  state: BookingState;
  version: number;
  createdAt: string;
  predecessorId: string | null;
  successorId: string | null;
  attendance: "UNKNOWN" | Observation;
  transitions: {
    id: string;
    command: "CREATE" | "CANCEL" | "RESCHEDULE" | "ATTEND" | "CORRECT" | "OPEN";
    fromState: "BOOKED" | "NO_SHOW" | null;
    toState: BookingState;
    recordedAt: string;
  }[];
  attendanceHistory: {
    id: string;
    observation: Observation;
    supersedesId: string | null;
    reason: string | null;
    recordedAt: string;
  }[];
}
export interface LiveBookingApi {
  create(slotId: string): Promise<LiveBooking>;
  history(page?: number): Promise<Page<LiveBooking>>;
  detail(id: string): Promise<LiveBooking>;
  schedule(page?: number): Promise<Page<LiveBooking>>;
  cancel(booking: LiveBooking): Promise<LiveBooking>;
  reschedule(booking: LiveBooking, slot: Availability): Promise<LiveBooking>;
  attendance(
    booking: LiveBooking,
    observation: Observation,
  ): Promise<LiveBooking>;
  correct(
    booking: LiveBooking,
    observation: Observation,
    reason: string,
  ): Promise<LiveBooking>;
  clearCommands(): void;
}
const messages: Record<number, string> = {
  400: "Check the booking command and try again. No medical information belongs in a booking.",
  401: "Your session has ended. Please sign in again.",
  403: "Request verification failed. Refresh your session before retrying.",
  404: "This booking or slot is unavailable for your current access.",
  409: "The booking changed or this action is no longer eligible. Refresh the booking and available times before trying a new command.",
  413: "The booking request is too large.",
  415: "The booking request could not be accepted. Refresh and try again.",
  503: "The booking service is unavailable. Your request may not have completed. Retry the unchanged command to check its outcome.",
};
export class BookingUiError extends UiError {
  constructor(public readonly status: number) {
    super(messages[status] ?? messages[503]);
  }
}
const invalid = (): never => {
  throw new BookingUiError(503);
};
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
const string = (value: unknown): string =>
  typeof value === "string" ? value : invalid();
const uuid = (value: unknown): string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  )
    ? value
    : invalid();
const nullableId = (value: unknown) => (value === null ? null : uuid(value));
const timestamp = (value: unknown): string =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : invalid();
const oneOf = <T extends string>(value: unknown, values: readonly T[]): T =>
  values.includes(value as T) ? (value as T) : invalid();
const state = (value: unknown) =>
  oneOf(value, [
    "BOOKED",
    "CANCELLED",
    "RESCHEDULED",
    "NO_SHOW",
    "IN_CONSULTATION",
  ] as const);
const observation = (value: unknown) =>
  oneOf(value, ["ATTENDED", "NO_SHOW"] as const);
/** Allowlist every nested projection. Unknown upstream identifiers/clinical fields are discarded. */
export function projectBooking(value: unknown): LiveBooking {
  const b = object(value);
  if (
    !Number.isInteger(b.version) ||
    Number(b.version) < 1 ||
    !Array.isArray(b.transitions) ||
    !Array.isArray(b.attendanceHistory)
  )
    return invalid();
  const startAt = timestamp(b.startAt),
    endAt = timestamp(b.endAt),
    timeZone = string(b.timeZone);
  if (Date.parse(endAt) <= Date.parse(startAt)) return invalid();
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
  } catch {
    return invalid();
  }
  return {
    id: uuid(b.id),
    slotId: uuid(b.slotId),
    providerId: uuid(b.providerId),
    clinicId: uuid(b.clinicId),
    patientDisplayName: string(b.patientDisplayName),
    startAt,
    endAt,
    timeZone,
    state: state(b.state),
    version: Number(b.version),
    createdAt: timestamp(b.createdAt),
    predecessorId: nullableId(b.predecessorId),
    successorId: nullableId(b.successorId),
    attendance: oneOf(b.attendance, [
      "UNKNOWN",
      "ATTENDED",
      "NO_SHOW",
    ] as const),
    transitions: b.transitions.map((value) => {
      const e = object(value);
      return {
        id: uuid(e.id),
        command: oneOf(e.command, [
          "CREATE",
          "CANCEL",
          "RESCHEDULE",
          "ATTEND",
          "CORRECT",
          "OPEN",
        ] as const),
        fromState:
          e.fromState === null
            ? null
            : oneOf(e.fromState, ["BOOKED", "NO_SHOW"] as const),
        toState: state(e.toState),
        recordedAt: timestamp(e.recordedAt),
      };
    }),
    attendanceHistory: b.attendanceHistory.map((value) => {
      const e = object(value);
      return {
        id: uuid(e.id),
        observation: observation(e.observation),
        supersedesId: nullableId(e.supersedesId),
        reason: e.reason === null ? null : string(e.reason),
        recordedAt: timestamp(e.recordedAt),
      };
    }),
  };
}
function page(value: unknown): Page<LiveBooking> {
  const p = object(value),
    m = object(p.meta);
  if (
    !Array.isArray(p.data) ||
    !Number.isInteger(m.page) ||
    Number(m.page) < 1 ||
    Number(m.page) > 10000 ||
    !Number.isInteger(m.pageSize) ||
    Number(m.pageSize) < 1 ||
    Number(m.pageSize) > 100 ||
    !Number.isInteger(m.total) ||
    Number(m.total) < 0
  )
    return invalid();
  return {
    data: p.data.map(projectBooking),
    meta: {
      page: Number(m.page),
      pageSize: Number(m.pageSize),
      total: Number(m.total),
    },
  };
}
export function correctionReasonValid(reason: string) {
  return (
    !!reason.trim() &&
    [...reason].length <= 1000 &&
    ![...reason].some((c) => {
      const n = c.codePointAt(0)!;
      return n < 32 || (n >= 127 && n <= 159) || (n >= 55296 && n <= 57343);
    })
  );
}
export function bookingEligibility(b: LiveBooking, now = Date.now()) {
  return {
    change: b.state === "BOOKED" && now < Date.parse(b.startAt),
    attend:
      b.state === "BOOKED" &&
      b.attendance === "UNKNOWN" &&
      now >= Date.parse(b.startAt),
    noShow:
      b.state === "BOOKED" &&
      b.attendance === "UNKNOWN" &&
      now >= Date.parse(b.endAt),
    correct:
      b.attendance !== "UNKNOWN" &&
      (b.state === "BOOKED" || b.state === "NO_SHOW"),
  };
}
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
/** Pending commands live only in memory for this session. No automatic HTTP retries.
 * An unchanged failed command retains its exact UUIDv4 key. Payload edits or success start a new command.
 */
export function createLiveBookingApi(
  request: Request,
  csrf: () => string,
  newKey = () => globalThis.crypto.randomUUID(),
): LiveBookingApi {
  const commands = new Map<string, { fingerprint: string; key: string }>();
  const safely = async <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (e) {
      if (e instanceof BookingUiError) throw e;
      throw new BookingUiError(503);
    }
  };
  const read = (path: string) =>
    safely(async () =>
      projectBooking(object(await request<unknown>(path)).data),
    );
  const mutate = async (
    scope: string,
    path: string,
    payload: Record<string, string | number>,
    method = "PUT",
  ) =>
    safely(async () => {
      const fingerprint = JSON.stringify(payload);
      let command = commands.get(scope);
      if (!command || command.fingerprint !== fingerprint) {
        command = { fingerprint, key: uuid(newKey()) };
        commands.set(scope, command);
      }
      const response = await request<unknown>(path, {
        method,
        headers: { "X-CSRF-Token": csrf() },
        body: JSON.stringify({ ...payload, operationKey: command.key }),
      });
      const result = projectBooking(object(response).data);
      if (commands.get(scope) === command) commands.delete(scope);
      return result;
    });
  return {
    create: (slotId) =>
      mutate("CREATE", "/me/bookings", { slotId: uuid(slotId) }, "POST"),
    history: (n = 1) =>
      safely(async () =>
        page(await request(`/me/bookings?page=${n}&pageSize=20`)),
      ),
    schedule: (n = 1) =>
      safely(async () =>
        page(await request(`/me/schedule?page=${n}&pageSize=20`)),
      ),
    detail: (id) => read(`/me/bookings/${uuid(id)}`),
    cancel: (b) =>
      mutate(`CANCEL:${b.id}`, `/me/bookings/${uuid(b.id)}/cancel`, {
        expectedVersion: b.version,
      }),
    reschedule: (b, s) => {
      if (
        s.providerId !== b.providerId ||
        s.clinicId !== b.clinicId ||
        !s.bookable ||
        s.id === b.slotId
      )
        return Promise.reject(new BookingUiError(409));
      return mutate(
        `RESCHEDULE:${b.id}`,
        `/me/bookings/${uuid(b.id)}/reschedule`,
        { slotId: uuid(s.id), expectedVersion: b.version },
      );
    },
    attendance: (b, o) =>
      mutate(`ATTEND:${b.id}`, `/me/bookings/${uuid(b.id)}/attendance`, {
        observation: observation(o),
        expectedVersion: b.version,
      }),
    correct: (b, o, reason) => {
      if (!correctionReasonValid(reason))
        return Promise.reject(new BookingUiError(400));
      return mutate(
        `CORRECT:${b.id}`,
        `/me/bookings/${uuid(b.id)}/attendance/correct`,
        { observation: observation(o), reason, expectedVersion: b.version },
      );
    },
    clearCommands: () => commands.clear(),
  };
}
