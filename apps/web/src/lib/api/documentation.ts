import {
  DocumentationError,
  documentationFingerprint,
  emptyFacts,
  validFacts,
  validNarrative,
  type DocumentationApi,
  type DocumentationVersion,
  type DocumentationWorkspace,
  type FactsDraft,
  type ReleasedSummary,
} from "../clinical/documentation";
import type { OpeningReceipt } from "./consultation-opening";

export type DocumentationRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<T>;
export interface DocumentationContext {
  receipt: Pick<OpeningReceipt, "id" | "openedAt">;
  patientName: string;
  providerName: string;
  clinicName: string;
  timeZone: string;
}
export interface LiveDocumentationApi extends DocumentationApi {
  activate(): void;
  forConsultation(context: DocumentationContext): DocumentationApi;
  forPatient(patientId: string): DocumentationApi;
}
export function documentationHttpError(status: number, mutation = false) {
  return new DocumentationError(
    status === 401
      ? "expired"
      : status === 403
        ? "csrf"
        : status === 404
          ? "access"
          : status === 409
            ? "conflict"
            : status === 413
              ? "budget"
              : status === 415
                ? "media"
                : status === 400
                  ? "validation"
                  : mutation
                    ? "uncertain"
                    : "read",
  );
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail = (): never => {
  throw new DocumentationError("read");
};
const uuid = (x: unknown): string =>
  typeof x === "string" && uuidPattern.test(x) ? x : fail();
function object(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x)) return fail();
  return x as Record<string, unknown>;
}
function text(x: unknown, max: number): string {
  return typeof x === "string" && validNarrative(x, max) ? x : fail();
}
function timestamp(x: unknown): string {
  return typeof x === "string" && Number.isFinite(Date.parse(x)) ? x : fail();
}
function factsFrom(v: Record<string, unknown>): FactsDraft {
  const a = object(v.allergyReview);
  if (
    !Array.isArray(a.items) ||
    !Array.isArray(v.problems) ||
    !Array.isArray(v.diagnoses)
  )
    return fail();
  const facts: FactsDraft = {
    complaint: v.complaint === null ? "" : text(v.complaint, 2000),
    problems: v.problems.map((x) => text(x, 500)),
    diagnoses: v.diagnoses.map((x) => text(x, 500)),
    allergy: {
      state: a.state as FactsDraft["allergy"]["state"],
      items: a.items.map((x) => {
        const item = object(x);
        return {
          kind: item.kind as "ALLERGY" | "INTOLERANCE",
          substance: text(item.text, 500),
          reaction: item.reaction === null ? "" : text(item.reaction, 500),
        };
      }),
    },
  };
  if (!validFacts(facts)) return fail();
  return facts;
}
function bodyFacts(facts: FactsDraft) {
  if (!validFacts(facts)) throw new DocumentationError("validation");
  return {
    complaint: facts.complaint || null,
    problems: [...facts.problems],
    diagnoses: [...facts.diagnoses],
    allergyReview: {
      state: facts.allergy.state,
      items: facts.allergy.items.map((x) => ({
        kind: x.kind,
        text: x.substance,
        reaction: x.reaction || null,
      })),
    },
  };
}
interface Target {
  root: string;
  sequence: number;
  version: DocumentationVersion;
}
interface Pending {
  fingerprint: string;
  operationKey: string;
}
/** Session-local transport. Bodies and keys never enter storage, URLs, logs or analytics.
 * Successful mutation bodies are validated then discarded: ordinary reads reauthorize.
 * All fetches use the shared same-origin credentialed request. */
export function createLiveDocumentationApi(
  request: DocumentationRequest,
  csrf: () => string,
  newKey = () => crypto.randomUUID(),
): LiveDocumentationApi {
  let epoch = 0;
  let clearedReason: "access" | "expired" = "access";
  const listeners = new Set<() => void>();
  const cleaners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const invalidate = () => {
    for (const clean of cleaners) clean();
    emit();
  };
  const clear = (reason: "access" | "expired" = "access") => {
    clearedReason = reason;
    epoch++;
    invalidate();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  function service(
    context?: DocumentationContext,
    patientId?: string,
  ): DocumentationApi {
    const targets = new Map<string, Target>();
    const pending = new Map<string, Pending>();
    let generation = 0;
    let readSerial = 0;
    let denied = false;
    let pages = { documents: 1, history: 1 };
    const born = epoch;
    const clean = () => {
      generation++;
      readSerial++;
      targets.clear();
      pending.clear();
      pages = { documents: 1, history: 1 };
    };
    cleaners.add(clean);
    const assertCurrent = (stamp: number) => {
      if (born !== epoch) throw new DocumentationError(clearedReason);
      if (denied || stamp !== generation)
        throw new DocumentationError("access");
    };
    const stamp = () =>
      `${epoch}:${generation}:${context?.receipt.id ?? patientId ?? "own-released"}`;
    const get = async (path: string) => {
      const g = generation;
      assertCurrent(g);
      try {
        const result = await request<unknown>(path);
        assertCurrent(g);
        return object(result);
      } catch (e) {
        if (born !== epoch || g !== generation)
          throw e instanceof DocumentationError
            ? e
            : new DocumentationError("access");
        if (
          e instanceof DocumentationError &&
          ["access", "expired"].includes(e.code)
        ) {
          denied = true;
          clean();
          emit();
        }
        throw e instanceof DocumentationError
          ? e
          : new DocumentationError("read");
      }
    };
    const base = context
      ? `/consultations/${uuid(context.receipt.id)}/documents`
      : "";
    const releasedBase = patientId
      ? `/patients/${uuid(patientId)}/summaries`
      : "/me/summaries";
    function project(value: unknown, released: boolean, registry = targets) {
      const root = object(value),
        id = uuid(root.id);
      uuid(root.consultationId);
      if (
        (context && root.consultationId !== context.receipt.id) ||
        !["PRIVATE_NOTE", "PATIENT_SUMMARY"].includes(String(root.kind)) ||
        (released && root.kind !== "PATIENT_SUMMARY")
      )
        return fail();
      if (
        !Array.isArray(root.versions) ||
        !root.versions.length ||
        root.versions.length > 100
      )
        return fail();
      const h = object(root.history);
      if (!Number.isInteger(h.total) || Number(h.total) < root.versions.length)
        return fail();
      const versions = root.versions.map((raw) => {
        const v = object(raw),
          key = uuid(v.id);
        if (
          !["DRAFT", "SIGN", "RELEASE", "ADDENDUM", "CORRECT"].includes(
            String(v.kind),
          ) ||
          typeof v.effective !== "boolean"
        )
          return fail();
        const isPrivate = root.kind === "PRIVATE_NOTE";
        if (
          (released &&
            (v.state !== "SIGNED_RELEASED" ||
              v.kind === "DRAFT" ||
              v.kind === "SIGN" ||
              Object.hasOwn(v, "version"))) ||
          (isPrivate && !["DRAFT", "SIGNED"].includes(String(v.state))) ||
          (!isPrivate &&
            !["DRAFT", "SIGNED_RELEASED"].includes(String(v.state)))
        )
          return fail();
        const version = {
          key,
          recordedAt: timestamp(v.createdAt),
          signedAt: v.signedAt === null ? undefined : timestamp(v.signedAt),
          change:
            v.kind === "CORRECT"
              ? ("CORRECTION" as const)
              : v.kind === "ADDENDUM"
                ? ("ADDENDUM" as const)
                : ("ORIGINAL" as const),
          current: v.effective,
          reason: v.reason === null ? undefined : text(v.reason, 1000),
          facts: factsFrom(v),
          text: text(v.content, 8000),
        };
        if (v.state !== "DRAFT" && !version.signedAt) return fail();
        const instructions = text(v.patientInstructions, 8000);
        if (isPrivate && instructions !== "") return fail();
        const result: DocumentationVersion = isPrivate
          ? {
              ...version,
              kind: "PRIVATE_NOTE",
              state: v.state as "DRAFT" | "SIGNED",
            }
          : {
              ...version,
              kind: "PATIENT_SUMMARY",
              state: v.state as "DRAFT" | "SIGNED_RELEASED",
              instructions,
              releasedAt:
                v.releasedAt === null ? undefined : timestamp(v.releasedAt),
            };
        if (
          !isPrivate &&
          v.state === "SIGNED_RELEASED" &&
          !("releasedAt" in result && result.releasedAt)
        )
          return fail();
        if (!released) {
          if (!Number.isInteger(v.version) || Number(v.version) < 1)
            return fail();
          registry.set(key, {
            root: id,
            sequence: Number(v.version),
            version: result,
          });
        }
        return result;
      });
      const last = versions.at(-1)!;
      // Latest head controls commands. Backend effectivity can include supplemental addenda.
      for (const v of versions) v.head = v === last;
      return { id, versions, total: Number(h.total) };
    }
    async function collection(
      path: string,
      released: boolean,
      page = 1,
      historyPage = 1,
      generationAtStart = generation,
      serial = readSerial,
    ) {
      if (
        ![page, historyPage].every(
          (n) => Number.isInteger(n) && n >= 1 && n <= 10000,
        )
      )
        throw new DocumentationError("validation");
      // Bounded document and version-history pages, twenty entries each. No unbounded background harvesting of clinical data.
      const assertRead = () => {
        assertCurrent(generationAtStart);
        if (serial !== readSerial) throw new DocumentationError("access");
      };
      const staged = new Map<string, Target>();
      const response = await get(`${path}?page=${page}&pageSize=20`);
      assertRead();
      if (!Array.isArray(response.data) || response.data.length > 20)
        return fail();
      const meta = object(response.meta);
      if (
        !Number.isInteger(meta.total) ||
        Number(meta.total) < response.data.length
      )
        return fail();
      const result = [];
      const pageTotals = {
        documents: Math.max(1, Math.ceil(Number(meta.total) / 20)),
        history: 1,
      };
      for (const root of response.data) {
        const id = uuid(object(root).id);
        const latest = project(root, released, staged);
        const historyPages = Math.ceil(latest.total / 20);
        pageTotals.history = Math.max(pageTotals.history, historyPages);
        const selectedPage = Math.min(historyPage, historyPages);
        const detail = await get(
          `${path}/${id}?page=${selectedPage}&pageSize=20`,
        );
        assertRead();
        const projected = project(detail.data, released, staged);
        if (projected.id !== id) return fail();
        pageTotals.history = Math.max(
          pageTotals.history,
          Math.ceil(projected.total / 20),
        );
        const head =
          selectedPage === 1
            ? projected.versions.at(-1)!
            : latest.versions.at(-1)!;
        for (const v of projected.versions) v.head = v.key === head.key;
        result.push({ ...projected, head });
      }
      assertRead();
      return { docs: result, pageTotals, staged };
    }
    async function mutate(
      path: string,
      payload: object,
      slot: string,
      privacy = false,
    ) {
      const g = generation;
      assertCurrent(g);
      const copy = structuredClone(payload);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(documentationFingerprint(copy)),
      );
      assertCurrent(g);
      const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
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
        throw new DocumentationError("budget");
      try {
        const result = object(
          await request<unknown>(path, {
            method: "POST",
            headers: { "X-CSRF-Token": csrf() },
            body,
          }),
        );
        assertCurrent(g);
        if (privacy) {
          if (object(result.data).restricted !== true) return fail();
          invalidate();
        } else {
          project(result.data, false);
          if (pending.get(slot) === command) pending.delete(slot);
        }
      } catch (e) {
        if (e instanceof DocumentationError && e.code === "expired") throw e;
        if (born !== epoch || g !== generation)
          throw new DocumentationError("access");
        const error =
          e instanceof DocumentationError
            ? e
            : new DocumentationError("uncertain");
        if (["access", "expired"].includes(error.code)) {
          denied = true;
          clean();
          emit();
        }
        // A malformed success body also leaves a mutation's outcome uncertain.
        throw error.code === "read"
          ? new DocumentationError("uncertain")
          : error;
      }
    }
    function target(key: string) {
      const t = targets.get(key);
      if (!t) throw new DocumentationError("conflict");
      return t;
    }
    function clinicalBody(
      text: string,
      instructions: string,
      facts: FactsDraft,
    ) {
      if (!validNarrative(text, 8000) || !validNarrative(instructions, 8000))
        throw new DocumentationError("validation");
      return {
        content: text,
        patientInstructions: instructions,
        ...bodyFacts(facts),
      };
    }
    const api: DocumentationApi = {
      mode: "live",
      scopeStamp: stamp,
      clear,
      subscribe,
      dispose: () => {
        denied = true;
        clean();
        cleaners.delete(clean);
      },
      paging: () => pages,
      async workspace(
        page = 1,
        historyPage = 1,
      ): Promise<DocumentationWorkspace> {
        if (!context) throw new DocumentationError("context");
        const g = generation,
          serial = ++readSerial;
        try {
          const result = await collection(
            base,
            false,
            page,
            historyPage,
            g,
            serial,
          );
          assertCurrent(g);
          if (serial !== readSerial) throw new DocumentationError("access");
          const docs = result.docs;
          targets.clear();
          for (const [key, target] of result.staged) targets.set(key, target);
          pages = result.pageTotals;
          const visible = new Set(docs.map((d) => d.id));
          for (const slot of pending.keys()) {
            const root = slot.split(":")[1];
            if (uuidPattern.test(root) && !visible.has(root))
              pending.delete(slot);
          }
          const versions = docs.flatMap((x) => x.versions);
          const note = docs.find(
            (x) => x.versions[0].kind === "PRIVATE_NOTE",
          )?.head;
          const summary = docs.find(
            (x) => x.versions[0].kind === "PATIENT_SUMMARY",
          )?.head;
          return {
            scopeStamp: stamp(),
            patientName: context.patientName,
            providerName: context.providerName,
            clinicName: context.clinicName,
            openedAt: context.receipt.openedAt,
            timeZone: context.timeZone,
            facts: emptyFacts(),
            note: note?.kind === "PRIVATE_NOTE" ? note : null,
            summary: summary?.kind === "PATIENT_SUMMARY" ? summary : null,
            history: versions,
          };
        } catch (e) {
          if (g === generation && serial === readSerial) {
            targets.clear();
            pages = { documents: 1, history: 1 };
          }
          throw e;
        }
      },
      async released(page = 1, historyPage = 1): Promise<ReleasedSummary[]> {
        // A failed refresh must not retain earlier permitted-page metadata.
        pages = { documents: 1, history: 1 };
        const g = generation,
          serial = ++readSerial;
        const result = await collection(
          releasedBase,
          true,
          page,
          historyPage,
          g,
          serial,
        );
        assertCurrent(g);
        if (serial !== readSerial) throw new DocumentationError("access");
        pages = result.pageTotals;
        return result.docs.flatMap((d) =>
          d.versions.map((v) => {
            if (
              v.kind !== "PATIENT_SUMMARY" ||
              v.state !== "SIGNED_RELEASED" ||
              !v.signedAt ||
              !v.releasedAt
            )
              return fail();
            // No internal sequence, draft predecessor, consultation/root ID, actor ID or raw DTO.
            return {
              key: v.key,
              kind: "PATIENT_SUMMARY",
              state: "SIGNED_RELEASED",
              text: v.text,
              instructions: v.instructions,
              facts: v.facts,
              signedAt: v.signedAt,
              releasedAt: v.releasedAt,
              change: v.change,
              current: v.current,
              authorName: "",
              clinicName: "",
              patientName: "",
            };
          }),
        );
      },
      async saveFacts() {
        throw new DocumentationError("validation");
      },
      async savePrivateNote(text, facts = emptyFacts()) {
        if (!base) throw new DocumentationError("context");
        await mutate(
          base,
          { kind: "PRIVATE_NOTE", ...clinicalBody(text, "", facts) },
          "draft:private",
        );
      },
      async saveSummary({ text, instructions, facts = emptyFacts() }) {
        if (!base) throw new DocumentationError("context");
        await mutate(
          base,
          {
            kind: "PATIENT_SUMMARY",
            ...clinicalBody(text, instructions, facts),
          },
          "draft:summary",
        );
      },
      async signPrivateNote(key) {
        const t = target(key);
        if (t.version.kind !== "PRIVATE_NOTE")
          throw new DocumentationError("validation");
        await mutate(
          `${base}/${t.root}/sign`,
          { expectedVersion: t.sequence },
          `sign:${t.root}`,
        );
      },
      async releaseSummary(key) {
        const t = target(key);
        if (t.version.kind !== "PATIENT_SUMMARY")
          throw new DocumentationError("validation");
        await mutate(
          `${base}/${t.root}/sign-release`,
          { expectedVersion: t.sequence },
          `release:${t.root}`,
        );
      },
      async amend(value) {
        const t = target(value.targetKey);
        if (
          !validNarrative(value.reason, 1000, true) ||
          (t.version.kind === "PRIVATE_NOTE" && value.instructions !== "")
        )
          throw new DocumentationError("validation");
        await mutate(
          `${base}/${t.root}/${value.change === "ADDENDUM" ? "addenda" : "corrections"}`,
          {
            expectedVersion: t.sequence,
            predecessorId: value.targetKey,
            reason: value.reason,
            ...clinicalBody(
              value.text,
              value.instructions,
              value.facts ?? t.version.facts ?? emptyFacts(),
            ),
          },
          `amend:${t.root}`,
        );
      },
      async restrict(value) {
        const t = target(value.targetKey);
        if (!validNarrative(value.reason, 1000, true))
          throw new DocumentationError("validation");
        // Purge retained narrative/replay material before deliberate restriction, including
        // uncertain draft outcomes. Only the minimal exact privacy retry identity remains.
        for (const key of pending.keys())
          if (!key.startsWith("privacy:")) pending.delete(key);
        await mutate(
          `${base}/${t.root}/privacy-restrictions`,
          { versionIds: [value.targetKey], reason: value.reason },
          `privacy:${t.root}`,
          true,
        );
      },
    };
    return api;
  }
  let own = service(),
    ownEpoch = epoch;
  return {
    ...own,
    dispose: undefined,
    activate() {
      if (ownEpoch !== epoch) {
        own.dispose?.();
        own = service();
        ownEpoch = epoch;
      }
    },
    scopeStamp: () => own.scopeStamp(),
    released: (page, historyPage) => own.released(page, historyPage),
    paging: () => own.paging!(),
    forConsultation: (context) => service(context),
    forPatient: (id) => service(undefined, id),
  };
}
