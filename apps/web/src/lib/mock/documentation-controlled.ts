/** TEST/PRESENTATION HOST ONLY. Never imported by the production application or
 * a Live adapter. Synthetic transient state is not backend persistence/security. */
import {
  DocumentationError,
  documentationFingerprint,
  createDocumentationCommands,
  emptyFacts,
  validFacts,
  validNarrative,
  documentationLimits,
  type DocumentationApi,
  type DocumentationVersion,
  type DocumentationWorkspace,
  type FactsDraft,
  type PrivateVersion,
  type ReleasedSummary,
  type SummaryVersion,
  type ViewCommand,
} from "../clinical/documentation";
export type ControlledActor =
  | "author"
  | "patient"
  | "other-patient"
  | "other-clinician"
  | "admin";
export const controlledDocumentationCanary =
  "EH5_CONTROLLED_PRIVATE_NOTE_NEVER_PUBLIC_30";
export function createControlledDocumentation() {
  let actor: ControlledActor = "author",
    authority = true,
    opened = true,
    expired = false,
    epoch = 1,
    tick = 0;
  let facts = emptyFacts();
  const versions: DocumentationVersion[] = [],
    restricted = new Set<string>();
  const root = new Map<string, string>(),
    ledger = new Map<string, { fingerprint: string; target?: string }>();
  const commandKeys: string[] = [];
  let fault:
    | { code: "conflict" | "uncertain"; afterCommit: boolean }
    | undefined;
  let delay: Promise<void> | undefined;
  let nextCommandDelay = 0;
  const stamp = () =>
    `EH5_CONTROLLED_PREVIEW_DRIVER_ONLY:${actor}:${authority}:${opened}:${expired}:${epoch}`;
  const time = () =>
    new Date(Date.UTC(2026, 9, 30, 9, 0, tick++)).toISOString();
  const clone = <T>(value: T): T => structuredClone(value);
  const visible = (v: DocumentationVersion) =>
    !restricted.has(root.get(v.key)!);
  const current = (kind: DocumentationVersion["kind"]) =>
    versions.findLast((v) => v.kind === kind && visible(v));
  const author = () => {
    if (expired) throw new DocumentationError("expired");
    if (actor !== "author" || !authority || !opened)
      throw new DocumentationError("access");
  };
  const target = (key: string) => {
    const v = versions.find((v) => v.key === key);
    if (!v || !visible(v)) throw new DocumentationError("restricted");
    return v;
  };
  const add = (
    value: DocumentationVersion,
    previous?: DocumentationVersion,
  ) => {
    // Signed originals are never rewritten. Effective flags are derived in views.
    versions.push(Object.freeze(clone(value)));
    root.set(value.key, previous ? root.get(previous.key)! : value.key);
  };
  const viewVersions = () =>
    versions
      .filter(visible)
      .map((v) => ({ ...clone(v), current: current(v.kind)?.key === v.key }));
  const workspace = async (): Promise<DocumentationWorkspace> => {
    const start = stamp();
    author();
    if (delay) await delay;
    author();
    if (start !== stamp()) throw new DocumentationError("access");
    const history = viewVersions();
    return {
      scopeStamp: stamp(),
      patientName: "Synthetic Salma · سلمى",
      providerName: "Dr. Noor · د. نور",
      clinicName: "Cairo Care · عيادة القاهرة",
      openedAt: "2026-10-30T08:55:00Z",
      timeZone: "Africa/Cairo",
      facts: clone(facts),
      note:
        history.findLast(
          (v): v is PrivateVersion => v.kind === "PRIVATE_NOTE",
        ) ?? null,
      summary:
        history.findLast(
          (v): v is SummaryVersion => v.kind === "PATIENT_SUMMARY",
        ) ?? null,
      history,
    };
  };
  const execute = createDocumentationCommands(
    stamp,
    async (request: ViewCommand) => {
      const begin = stamp();
      author();
      commandKeys.push(request.operationKey);
      const p = request.payload as Record<string, unknown>,
        key = typeof p.targetKey === "string" ? p.targetKey : undefined;
      if (key) target(key); // Privacy recheck BEFORE replay; retained outcomes cannot unhide.
      if (delay) await delay;
      if (nextCommandDelay) {
        const duration = nextCommandDelay;
        nextCommandDelay = 0;
        await new Promise((resolve) => setTimeout(resolve, duration));
      }
      author();
      if (begin !== stamp()) throw new DocumentationError("access");
      const fingerprint = documentationFingerprint({
        command: request.command,
        payload: request.payload,
      });
      const prior = ledger.get(request.operationKey);
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new DocumentationError("conflict");
        if (prior.target) target(prior.target);
        return;
      }
      const error = fault;
      fault = undefined;
      if (error && !error.afterCommit) throw new DocumentationError(error.code);
      let changedKey: string | undefined;
      if (request.command === "FACTS") {
        if (!validFacts(p.value as FactsDraft))
          throw new DocumentationError("validation");
        facts = clone(p.value as FactsDraft);
      } else if (
        request.command === "PRIVATE_NOTE" ||
        request.command === "SUMMARY"
      ) {
        const kind =
            request.command === "PRIVATE_NOTE"
              ? "PRIVATE_NOTE"
              : "PATIENT_SUMMARY",
          old = current(kind);
        if (old && old.state !== "DRAFT")
          throw new DocumentationError("conflict");
        if (
          !validNarrative(
            p.text as string,
            documentationLimits.narrative,
            true,
          ) ||
          !validNarrative(
            (p.instructions ?? "") as string,
            documentationLimits.narrative,
          )
        )
          throw new DocumentationError("validation");
        // Draft editing is allowed; a signed source is never a draft mutation target.
        if (old) {
          versions.splice(
            versions.findIndex((v) => v.key === old.key),
            1,
          );
          root.delete(old.key);
        }
        changedKey = old?.key ?? crypto.randomUUID();
        const base = {
          key: changedKey,
          recordedAt: time(),
          change: "ORIGINAL" as const,
          current: true,
        };
        add(
          kind === "PRIVATE_NOTE"
            ? { ...base, kind, state: "DRAFT", text: p.text as string }
            : {
                ...base,
                kind,
                state: "DRAFT",
                text: p.text as string,
                instructions: p.instructions as string,
              },
        );
      } else if (
        request.command === "SIGN_PRIVATE" ||
        request.command === "RELEASE"
      ) {
        const old = target(key!);
        if (old.state !== "DRAFT" || current(old.kind)?.key !== old.key)
          throw new DocumentationError("conflict");
        if (
          (request.command === "RELEASE" && old.kind !== "PATIENT_SUMMARY") ||
          (request.command === "SIGN_PRIVATE" && old.kind !== "PRIVATE_NOTE")
        )
          throw new DocumentationError("validation");
        // Draft-to-signed transition creates a distinct immutable version in this
        // view fixture. Stage B must map actual backend identities, not assume this.
        changedKey = crypto.randomUUID();
        const signedAt = time();
        add(
          old.kind === "PRIVATE_NOTE"
            ? {
                ...clone(old),
                key: changedKey,
                state: "SIGNED",
                signedAt,
                predecessorKey: old.key,
              }
            : {
                ...clone(old),
                key: changedKey,
                state: "SIGNED_RELEASED",
                signedAt,
                releasedAt: signedAt,
                predecessorKey: old.key,
              },
          old,
        );
      } else if (request.command === "AMEND") {
        const old = target(key!);
        if (old.state === "DRAFT" || current(old.kind)?.key !== old.key)
          throw new DocumentationError("conflict");
        if (
          !["CORRECTION", "ADDENDUM"].includes(p.change as string) ||
          !validNarrative(
            p.reason as string,
            documentationLimits.reason,
            true,
          ) ||
          !validNarrative(
            p.text as string,
            documentationLimits.narrative,
            true,
          ) ||
          !validNarrative(
            p.instructions as string,
            documentationLimits.narrative,
          ) ||
          (old.kind === "PRIVATE_NOTE" && p.instructions !== "")
        )
          throw new DocumentationError("validation");
        changedKey = crypto.randomUUID();
        const signedAt = time();
        const base = {
          key: changedKey,
          recordedAt: signedAt,
          signedAt,
          change: p.change as "CORRECTION" | "ADDENDUM",
          predecessorKey: old.key,
          reason: p.reason as string,
          current: true,
          text: p.text as string,
        };
        add(
          old.kind === "PRIVATE_NOTE"
            ? { ...base, kind: "PRIVATE_NOTE", state: "SIGNED" }
            : {
                ...base,
                kind: "PATIENT_SUMMARY",
                state: "SIGNED_RELEASED",
                releasedAt: signedAt,
                instructions: p.instructions as string,
              },
          old,
        );
      } else if (request.command === "RESTRICT") {
        if (
          !validNarrative(p.reason as string, documentationLimits.reason, true)
        )
          throw new DocumentationError("validation");
        const affected = target(key!);
        restricted.add(root.get(affected.key)!);
        // Controlled ordinary-view projection hides the selected document lineage.
        // This is a preview behavior, not a backend propagation-policy contract.
      }
      ledger.set(request.operationKey, {
        fingerprint,
        target: changedKey ?? key,
      });
      if (error?.afterCommit) throw new DocumentationError(error.code);
    },
  );
  const api: DocumentationApi = {
    mode: "controlled",
    scopeStamp: stamp,
    workspace,
    async released() {
      const start = stamp();
      if (delay) await delay;
      if (start !== stamp()) throw new DocumentationError("access");
      if (expired) throw new DocumentationError("expired");
      if (actor === "admin" || actor === "other-clinician")
        throw new DocumentationError("access");
      if (actor !== "patient") return [];
      const allowed = versions.filter(
        (v): v is SummaryVersion =>
          visible(v) &&
          v.kind === "PATIENT_SUMMARY" &&
          v.state === "SIGNED_RELEASED",
      );
      const keys = new Set(allowed.map((v) => v.key));
      return allowed.map(
        (v): ReleasedSummary => ({
          key: v.key,
          kind: "PATIENT_SUMMARY",
          state: "SIGNED_RELEASED",
          text: v.text,
          instructions: v.instructions,
          signedAt: v.signedAt!,
          releasedAt: v.releasedAt!,
          authorName: "Dr. Noor · د. نور",
          clinicName: "Cairo Care · عيادة القاهرة",
          patientName: "Synthetic Salma · سلمى",
          change: v.change,
          current: current("PATIENT_SUMMARY")?.key === v.key,
          ...(v.predecessorKey && keys.has(v.predecessorKey)
            ? { predecessorKey: v.predecessorKey }
            : {}),
        }),
      );
    },
    saveFacts: (value) => execute("FACTS", { value }),
    savePrivateNote: (text) => execute("PRIVATE_NOTE", { text }),
    saveSummary: (value) =>
      execute("SUMMARY", {
        text: value.text,
        instructions: value.instructions,
      }),
    signPrivateNote: (targetKey) =>
      execute("SIGN_PRIVATE", { targetKey }, targetKey),
    releaseSummary: (targetKey) => execute("RELEASE", { targetKey }, targetKey),
    amend: (value) => execute("AMEND", { ...value }, value.targetKey),
    restrict: (value) =>
      execute(
        "RESTRICT",
        { targetKey: value.targetKey, reason: value.reason },
        value.targetKey,
      ),
  };
  return {
    api,
    controls: {
      setActor(value: ControlledActor) {
        actor = value;
        epoch++;
      },
      setAuthority(value: boolean) {
        authority = value;
        epoch++;
      },
      setOpened(value: boolean) {
        opened = value;
        epoch++;
      },
      setExpired(value: boolean) {
        expired = value;
        epoch++;
      },
      failNext(code: "conflict" | "uncertain", afterCommit = false) {
        fault = { code, afterCommit };
      },
      delayNextCommand() {
        nextCommandDelay = 1200;
      },
      hold() {
        let release!: () => void;
        delay = new Promise<void>((resolve) => {
          release = resolve;
        });
        return () => {
          delay = undefined;
          release();
        };
      },
      commandKeysForTest: () => [...commandKeys],
      retainedVersionsForTest: () => clone(versions),
    },
  };
}
