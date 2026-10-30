import { UiError } from "../api/errors";

/** Frontend view/capability models for Stage A. NOT proposed backend DTOs/routes.
 * Clinical transport remains unavailable until separately merged Slice 5 truth. */
export const documentationLimits = {
  complaint: 2000,
  items: 20,
  item: 500,
  narrative: 8000,
  reason: 1000,
  bytes: 16384,
} as const;
export type AllergyState =
  | "REVIEWED_POSITIVE"
  | "REVIEWED_NO_KNOWN"
  | "UNKNOWN"
  | "NOT_REVIEWED";
export interface FactsDraft {
  complaint: string;
  problems: string[];
  diagnoses: string[];
  allergy: {
    state: AllergyState;
    items: {
      kind: "ALLERGY" | "INTOLERANCE";
      substance: string;
      reaction: string;
    }[];
  };
}
export const emptyFacts = (): FactsDraft => ({
  complaint: "",
  problems: [],
  diagnoses: [],
  allergy: { state: "NOT_REVIEWED", items: [] },
});
export type AmendmentKind = "ADDENDUM" | "CORRECTION";
interface VersionMetadata {
  key: string;
  recordedAt: string;
  signedAt?: string;
  change: "ORIGINAL" | AmendmentKind;
  predecessorKey?: string;
  reason?: string;
  current: boolean;
}
export interface PrivateVersion extends VersionMetadata {
  kind: "PRIVATE_NOTE";
  state: "DRAFT" | "SIGNED";
  text: string;
}
export interface SummaryVersion extends VersionMetadata {
  kind: "PATIENT_SUMMARY";
  state: "DRAFT" | "SIGNED_RELEASED";
  text: string;
  instructions: string;
  releasedAt?: string;
}
export type DocumentationVersion = PrivateVersion | SummaryVersion;
/** Patient projection has no private-note/facts/authority fields or hidden counts. */
export interface ReleasedSummary {
  key: string;
  kind: "PATIENT_SUMMARY";
  state: "SIGNED_RELEASED";
  text: string;
  instructions: string;
  signedAt: string;
  releasedAt: string;
  authorName: string;
  clinicName: string;
  patientName: string;
  change: "ORIGINAL" | AmendmentKind;
  predecessorKey?: string;
  current: boolean;
}
export interface DocumentationWorkspace {
  scopeStamp: string;
  patientName: string;
  providerName: string;
  clinicName: string;
  openedAt: string;
  timeZone: string;
  facts: FactsDraft;
  note: PrivateVersion | null;
  summary: SummaryVersion | null;
  history: DocumentationVersion[];
}
export type DocumentationErrorCode =
  | "budget"
  | "uncertain"
  | "unavailable"
  | "access"
  | "expired"
  | "conflict"
  | "restricted"
  | "validation";
const messages: Record<DocumentationErrorCode, string> = {
  budget:
    "The combined draft exceeds the save limit. Shorten it before saving; nothing has been saved or automatically shortened.",
  uncertain:
    "The result is uncertain. Retry the unchanged command explicitly before editing it.",
  unavailable:
    "Clinical documentation is awaiting backend integration. No clinical information has been sent or saved in Live mode.",
  access:
    "Clinical documentation is unavailable for your current access. A current clinical relationship and clinician authority are required.",
  expired: "Your session has ended. Please sign in again.",
  conflict:
    "This document changed. Refresh the visible record before making a new command.",
  restricted:
    "This document is no longer available in ordinary views. Refresh the visible record. Retrying cannot restore restricted content.",
  validation:
    "Check the highlighted limits and required fields. Nothing has been shortened or saved.",
};
export class DocumentationError extends UiError {
  constructor(public readonly code: DocumentationErrorCode) {
    super(messages[code]);
  }
}
export interface DocumentationApi {
  readonly mode: "unavailable" | "controlled";
  scopeStamp(): string;
  workspace(): Promise<DocumentationWorkspace>;
  released(): Promise<ReleasedSummary[]>;
  saveFacts(value: FactsDraft): Promise<void>;
  savePrivateNote(text: string): Promise<void>;
  saveSummary(value: { text: string; instructions: string }): Promise<void>;
  signPrivateNote(targetKey: string): Promise<void>;
  releaseSummary(targetKey: string): Promise<void>;
  amend(value: {
    targetKey: string;
    change: AmendmentKind;
    text: string;
    instructions: string;
    reason: string;
  }): Promise<void>;
  restrict(value: { targetKey: string; reason: string }): Promise<void>;
}
/** Normal Live capability has NO driver, mock import, HTTP path or activation flag. */
export function createUnavailableDocumentation(): DocumentationApi {
  const deny = async (): Promise<never> => {
    throw new DocumentationError("unavailable");
  };
  return {
    mode: "unavailable",
    scopeStamp: () => "live-unavailable",
    workspace: deny,
    released: deny,
    saveFacts: deny,
    savePrivateNote: deny,
    saveSummary: deny,
    signPrivateNote: deny,
    releaseSummary: deny,
    amend: deny,
    restrict: deny,
  };
}
export const scalarLength = (text: string) => [...text].length;
export function validNarrative(text: string, limit: number, required = false) {
  return (
    typeof text === "string" &&
    (!required || !!text.trim()) &&
    scalarLength(text) <= limit &&
    ![...text].some((char) => {
      const point = char.codePointAt(0)!;
      return (
        (point < 32 && point !== 10) ||
        (point >= 127 && point <= 159) ||
        (point >= 55296 && point <= 57343)
      );
    })
  );
}
export function validFacts(value: FactsDraft) {
  const list = (items: string[]) =>
    Array.isArray(items) &&
    items.length <= documentationLimits.items &&
    items.every((text) => validNarrative(text, documentationLimits.item, true));
  const review = value.allergy;
  return (
    validNarrative(value.complaint, documentationLimits.complaint) &&
    list(value.problems) &&
    list(value.diagnoses) &&
    [
      "REVIEWED_POSITIVE",
      "REVIEWED_NO_KNOWN",
      "UNKNOWN",
      "NOT_REVIEWED",
    ].includes(review.state) &&
    review.items.length <= documentationLimits.items &&
    (review.state === "REVIEWED_POSITIVE"
      ? review.items.length > 0 &&
        review.items.every(
          (item) =>
            ["ALLERGY", "INTOLERANCE"].includes(item.kind) &&
            validNarrative(item.substance, documentationLimits.item, true) &&
            validNarrative(item.reaction, documentationLimits.item),
        )
      : review.items.length === 0)
  );
}
export type DocumentationCommand =
  | "FACTS"
  | "PRIVATE_NOTE"
  | "SUMMARY"
  | "SIGN_PRIVATE"
  | "RELEASE"
  | "AMEND"
  | "RESTRICT";
export interface ViewCommand {
  command: DocumentationCommand;
  payload: unknown;
  operationKey: string;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export const documentationFingerprint = (value: unknown) =>
  JSON.stringify(canonical(value));

/** Generic in-memory command coordinator. It defines no HTTP request schema.
 * Scope changes discard pending identity; no automatic mutation retry. */
export function createDocumentationCommands(
  scope: () => string,
  driver: (value: ViewCommand) => Promise<void>,
  newKey = () => crypto.randomUUID(),
) {
  let stamp = scope();
  const pending = new Map<string, { fingerprint: string; key: string }>();
  return async (
    command: DocumentationCommand,
    payload: unknown,
    target = "consultation",
  ) => {
    if (stamp !== scope()) {
      stamp = scope();
      pending.clear();
    }
    const requestScope = stamp,
      copy = structuredClone(payload),
      fingerprint = documentationFingerprint(copy),
      slot = `${command}:${target}`;
    let current = pending.get(slot);
    if (!current || current.fingerprint !== fingerprint) {
      current = { fingerprint, key: newKey() };
      pending.set(slot, current);
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        current.key,
      )
    )
      throw new DocumentationError("validation");
    const value = { command, payload: copy, operationKey: current.key };
    if (
      new TextEncoder().encode(JSON.stringify(value)).length >
      documentationLimits.bytes
    )
      throw new DocumentationError("budget");
    await driver(value);
    if (requestScope !== scope()) throw new DocumentationError("access");
    if (pending.get(slot) === current) pending.delete(slot);
  };
}
