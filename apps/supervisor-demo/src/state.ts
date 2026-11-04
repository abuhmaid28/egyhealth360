import { createControlledDocumentation } from "../../web/src/lib/mock/documentation-controlled";
import type { DocumentationApi, ReleasedSummary } from "../../web/src/lib/clinical/documentation";
import { draftBody, type FollowUpIntent, type FollowUpService } from "../../web/src/lib/api/follow-up-intents";

/** Authorized standalone synthetic host. No Live adapter, request function or auth receipt.
 * The existing controlled driver performs memory-only presentation transitions.
 * Only its reduced API is exposed; authority/fault/test controls remain private here. */
export function createSyntheticVisit() {
  const fixture = createControlledDocumentation();
  const documentation: DocumentationApi = {
    ...fixture.api,
    // Fresh reduced projection after every edit, amendment or restriction.
    async released(): Promise<ReleasedSummary[]> {
      const view = await fixture.api.workspace();
      return view.history.filter(v => v.kind === "PATIENT_SUMMARY" && v.state === "SIGNED_RELEASED").map(v => ({
        key: v.key, kind: "PATIENT_SUMMARY", state: "SIGNED_RELEASED", text: v.text,
        instructions: v.kind === "PATIENT_SUMMARY" ? v.instructions : "",
        signedAt: v.signedAt!, releasedAt: v.signedAt!, authorName: view.providerName,
        clinicName: view.clinicName, patientName: view.patientName, change: v.change, current: v.current,
      }));
    },
  };
  let intents: FollowUpIntent[] = [];
  const followUp: FollowUpService = {
    scopeStamp: () => "synthetic-follow-up", subscribe: () => () => {}, dispose() {},
    async list() { return { data: structuredClone(intents), meta: { page: 1, pageSize: 100, total: intents.length } }; },
    async create(value) {
      const draft = draftBody(value);
      intents.push({ ...structuredClone(draft), key: crypto.randomUUID(), state: "DRAFT", current: true, releasedAt: null, correction: false, booking: null });
    },
    async release(key) {
      intents = intents.map(v => v.key === key ? { ...v, state: "SIGNED_RELEASED", releasedAt: new Date().toISOString() } : v);
    },
    async correct(key, value, reason) {
      if (!reason.trim()) throw new Error("A demonstration correction reason is required.");
      const draft = draftBody(value);
      intents = intents.map(v => v.key === key ? { ...v, current: false } : v);
      intents.push({ ...structuredClone(draft), key: crypto.randomUUID(), state: "SIGNED_RELEASED", current: true, releasedAt: new Date().toISOString(), correction: true, booking: null });
    },
  };
  return { documentation, followUp, lifecycle: { closed: false } };
}
