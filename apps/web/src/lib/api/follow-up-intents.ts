import { UiError } from "./errors";
import { validNarrative } from "../clinical/documentation";
import type { DocumentationRequest } from "./documentation";
import type { BookingState } from "./live-booking";
import type { Page } from "./contracts";

export interface DesiredWindow {
  startAt: string;
  endAt: string;
  timeZone: string;
}
export interface FollowUpDraft {
  instruction: string;
  desiredWindow: DesiredWindow | null;
}
/** Reduced presentation projection; author command targets stay inside the service. */
export interface FollowUpIntent extends FollowUpDraft {
  key: string;
  state: "DRAFT" | "SIGNED_RELEASED";
  current: boolean;
  releasedAt: string | null;
  correction: boolean;
  booking: { id: string; state: BookingState } | null;
}
const messages = {
  read: "Follow-up instructions could not be refreshed. Please try again.",
  uncertain:
    "The follow-up result is uncertain. Retry the unchanged command explicitly before editing it.",
  access:
    "Follow-up instructions are unavailable for your current access. Refresh your session before continuing.",
  expired: "Your session has ended. Please sign in again.",
  csrf: "Request verification failed. Refresh your session before retrying.",
  validation:
    "Check the follow-up instruction and desired window. Use explicit timestamp offsets and the exact IANA time zone.",
  conflict:
    "This follow-up intent changed. Refresh before making a new command.",
  budget:
    "The follow-up request exceeds the save limit. Shorten it before saving.",
  media: "The follow-up request must use JSON.",
} as const;
export class FollowUpError extends UiError {
  constructor(public readonly code: keyof typeof messages) {
    super(messages[code]);
  }
}
export function followUpHttpError(status: number, mutation = false) {
  return new FollowUpError(
    status === 401
      ? "expired"
      : status === 403
        ? "csrf"
        : status === 404
          ? "access"
          : status === 409
            ? "conflict"
            : status === 400
              ? "validation"
              : status === 413
                ? "budget"
                : status === 415
                  ? "media"
                  : mutation
                    ? "uncertain"
                    : "read",
  );
}
const fail = (): never => {
  throw new FollowUpError("read");
};
const uuid = (x: unknown): string =>
  typeof x === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    x,
  )
    ? x
    : fail();
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : fail();
const instant = (x: unknown): string =>
  typeof x === "string" &&
  /^\d{4}-\d\d-\d\dT/.test(x) &&
  Number.isFinite(Date.parse(x))
    ? x
    : fail();
function windowFrom(x: unknown): DesiredWindow | null {
  if (x === null) return null;
  const w = obj(x);
  const startAt = instant(w.startAt),
    endAt = instant(w.endAt);
  if (
    typeof w.timeZone !== "string" ||
    Date.parse(startAt) >= Date.parse(endAt)
  )
    return fail();
  try {
    new Intl.DateTimeFormat("en", { timeZone: w.timeZone }).format();
  } catch {
    return fail();
  }
  return { startAt, endAt, timeZone: w.timeZone };
}
export function draftBody(value: FollowUpDraft) {
  if (!validNarrative(value.instruction, 2000, true))
    throw new FollowUpError("validation");
  try {
    return {
      instruction: value.instruction,
      desiredWindow: windowFrom(value.desiredWindow),
    };
  } catch {
    throw new FollowUpError("validation");
  }
}
/** Convert server UTC instants back to zone-matching offsets for an explicit correction.
 * DST offsets are calculated independently at both ends; clinical times are never inferred. */
export function windowForEditing(
  w: DesiredWindow | null,
): DesiredWindow | null {
  if (!w) return null;
  const format = (s: string) => {
    const d = new Date(s);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: w.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const offset = Math.round(
      (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) -
        Math.floor(d.getTime() / 1000) * 1000) /
        60000,
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${String(d.getUTCMilliseconds()).padStart(3, "0")}${offset < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  };
  return {
    startAt: format(w.startAt),
    endAt: format(w.endAt),
    timeZone: w.timeZone,
  };
}
export interface FollowUpService {
  scopeStamp(): string;
  subscribe(listener: () => void): () => void;
  dispose(): void;
  list(page?: number): Promise<Page<FollowUpIntent>>;
  create(value: FollowUpDraft): Promise<void>;
  release(key: string): Promise<void>;
  correct(key: string, value: FollowUpDraft, reason: string): Promise<void>;
}
export interface LiveFollowUpApi {
  clear(reason?: "access" | "expired"): void;
  forConsultation(id: string): FollowUpService;
  forPatient(id?: string): FollowUpService;
}
/** Memory-only session scope. No automatic mutation retries or synthetic fallback.
 * Mutations validate their receipt, then the UI re-reads current authorized state. */
export function createLiveFollowUpApi(
  request: DocumentationRequest,
  csrf: () => string,
  newKey = () => crypto.randomUUID(),
): LiveFollowUpApi {
  let epoch = 0,
    cleared: "access" | "expired" = "access";
  const cleaners = new Set<() => void>();
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const f of listeners) f();
  };
  function service(consultation?: string, patient?: string): FollowUpService {
    const base = consultation
      ? `/consultations/${uuid(consultation)}/follow-up-intents`
      : patient
        ? `/patients/${uuid(patient)}/follow-up-intents`
        : "/me/follow-up-intents";
    const born = epoch;
    let generation = 0,
      serial = 0,
      disposed = false;
    const targets = new Map<
      string,
      { root: string; sequence: number; state: FollowUpIntent["state"] }
    >();
    const pending = new Map<
      string,
      { fingerprint: string; operationKey: string }
    >();
    const clean = () => {
      generation++;
      serial++;
      targets.clear();
      pending.clear();
    };
    cleaners.add(clean);
    const assert = (g: number) => {
      if (born !== epoch) throw new FollowUpError(cleared);
      if (disposed || g !== generation) throw new FollowUpError("access");
    };
    const deny = (e: unknown, g: number) => {
      if (
        e instanceof FollowUpError &&
        ["access", "expired"].includes(e.code) &&
        g === generation
      ) {
        disposed = true;
        clean();
        emit();
      }
    };
    function project(raw: unknown, registry = targets): FollowUpIntent {
      const root = obj(raw),
        id = uuid(root.id);
      uuid(root.consultationId);
      if (consultation && root.consultationId !== consultation) return fail();
      if (
        !Array.isArray(root.versions) ||
        !root.versions.length ||
        root.versions.length > 100 ||
        !Array.isArray(root.links) ||
        root.links.length > 100
      )
        return fail();
      const versions = root.versions.map((raw) => {
        const v = obj(raw),
          key = uuid(v.id);
        if (
          !["DRAFT", "SIGNED_RELEASED"].includes(String(v.state)) ||
          typeof v.effective !== "boolean" ||
          typeof v.instruction !== "string" ||
          !validNarrative(v.instruction, 2000, true)
        )
          return fail();
        if (
          !consultation &&
          (v.state !== "SIGNED_RELEASED" || Object.hasOwn(v, "version"))
        )
          return fail();
        if (v.predecessorId !== null) uuid(v.predecessorId);
        const releasedAt = v.releasedAt === null ? null : instant(v.releasedAt);
        if (v.state === "SIGNED_RELEASED" && (!releasedAt || !v.signedAt))
          return fail();
        if (v.signedAt !== null) instant(v.signedAt);
        instant(v.createdAt);
        if (
          v.reason !== null &&
          (typeof v.reason !== "string" ||
            !validNarrative(v.reason, 1000, true))
        )
          return fail();
        if (consultation) {
          if (!Number.isInteger(v.version) || Number(v.version) < 1)
            return fail();
          registry.set(key, {
            root: id,
            sequence: Number(v.version),
            state: v.state as FollowUpIntent["state"],
          });
        }
        return {
          key,
          instruction: v.instruction,
          desiredWindow: windowFrom(v.desiredWindow),
          state: v.state as FollowUpIntent["state"],
          current: v.effective,
          releasedAt,
          correction: v.reason !== null,
        };
      });
      const links = root.links.map((raw) => {
        const l = obj(raw);
        uuid(l.id);
        if (l.previousLinkId !== null) uuid(l.previousLinkId);
        instant(l.linkedAt);
        if (
          ![
            "BOOKED",
            "CANCELLED",
            "RESCHEDULED",
            "NO_SHOW",
            "IN_CONSULTATION",
            "CONSULTED",
          ].includes(String(l.bookingState))
        )
          return fail();
        return {
          id: uuid(l.bookingId),
          state: l.bookingState as NonNullable<
            FollowUpIntent["booking"]
          >["state"],
        };
      });
      const history = obj(root.history),
        linkHistory = obj(root.linkHistory);
      if (
        !Number.isInteger(history.total) ||
        Number(history.total) < versions.length ||
        !Number.isInteger(linkHistory.total) ||
        Number(linkHistory.total) < links.length
      )
        return fail();
      return { ...versions.at(-1)!, booking: links.at(-1) ?? null };
    }
    async function mutate(path: string, payload: object, slot: string) {
      if (!consultation) throw new FollowUpError("access");
      const g = generation;
      assert(g);
      const copy = structuredClone(payload);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify([path, copy])),
      );
      assert(g);
      const fingerprint = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      let command = pending.get(slot);
      if (!command || command.fingerprint !== fingerprint) {
        command = { fingerprint, operationKey: uuid(newKey()) };
        pending.set(slot, command);
      }
      const body = JSON.stringify({
        ...copy,
        operationKey: command.operationKey,
      });
      if (new TextEncoder().encode(body).length > 16384)
        throw new FollowUpError("budget");
      try {
        const response = obj(
          await request<unknown>(path, {
            method: "POST",
            headers: { "X-CSRF-Token": csrf() },
            body,
          }),
        );
        assert(g);
        project(response.data, new Map());
        if (pending.get(slot) === command) pending.delete(slot);
      } catch (e) {
        assert(g);
        deny(e, g);
        throw e instanceof FollowUpError && e.code !== "read"
          ? e
          : new FollowUpError("uncertain");
      }
    }
    function target(key: string, state: FollowUpIntent["state"]) {
      assert(generation);
      const t = targets.get(key);
      if (!t || t.state !== state) throw new FollowUpError("conflict");
      return t;
    }
    return {
      scopeStamp: () => `${born}:${generation}:${disposed}`,
      subscribe: (f) => {
        listeners.add(f);
        return () => {
          listeners.delete(f);
        };
      },
      dispose() {
        disposed = true;
        clean();
        cleaners.delete(clean);
      },
      async list(page = 1) {
        const g = generation,
          n = ++serial;
        assert(g);
        if (!Number.isInteger(page) || page < 1 || page > 10000)
          throw new FollowUpError("validation");
        try {
          const response = obj(
            await request<unknown>(`${base}?page=${page}&pageSize=20`),
          );
          assert(g);
          if (n !== serial) throw new FollowUpError("access");
          const meta = obj(response.meta);
          if (
            !Array.isArray(response.data) ||
            response.data.length > 20 ||
            meta.page !== page ||
            meta.pageSize !== 20 ||
            !Number.isInteger(meta.total) ||
            Number(meta.total) < response.data.length
          )
            return fail();
          const staged = new Map();
          const data = response.data.map((x) => project(x, staged));
          targets.clear();
          for (const [key, value] of staged) targets.set(key, value);
          const visible = new Set([...staged.values()].map((t) => t.root));
          for (const slot of pending.keys())
            if (slot !== "create" && !visible.has(slot.split(":")[1]))
              pending.delete(slot);
          return {
            data,
            meta: { page, pageSize: 20, total: Number(meta.total) },
          };
        } catch (e) {
          if (g === generation && n === serial) {
            targets.clear();
            deny(e, g);
          }
          throw e instanceof FollowUpError ? e : new FollowUpError("read");
        }
      },
      create: (value) => mutate(base, draftBody(value), "create"),
      release(key) {
        const t = target(key, "DRAFT");
        return mutate(
          `${base}/${t.root}/sign-release`,
          { expectedVersion: t.sequence },
          `release:${t.root}`,
        );
      },
      correct(key, value, reason) {
        const t = target(key, "SIGNED_RELEASED");
        if (!validNarrative(reason, 1000, true))
          throw new FollowUpError("validation");
        return mutate(
          `${base}/${t.root}/corrections`,
          {
            expectedVersion: t.sequence,
            predecessorId: key,
            reason,
            ...draftBody(value),
          },
          `correct:${t.root}`,
        );
      },
    };
  }
  return {
    clear(reason = "access") {
      cleared = reason;
      epoch++;
      for (const f of cleaners) f();
      emit();
    },
    forConsultation: (id) => service(id),
    forPatient: (id) => service(undefined, id),
  };
}
