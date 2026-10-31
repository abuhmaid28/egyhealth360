# UI Phase 5 — Live clinical documentation (Stage B)

Current frontend continuation: [Live Follow-up Intent integration](V3_UI_FOLLOW_UP_INTENT_LIVE.md) adds merged Slice 6 draft/review/release/correction and patient released reading under authorization 6536467435. Its bounded scope supersedes older follow-up Demo-only statements below; historical evidence retains its meaning.

Current-main note: PR #59 merged at `b97bd990644aef1e0de77098b139597adb2fbf0f` and is inherited by verified main `4cb20b39370e5317eba14c4916517b6ae88c12e5`. OPEN/IN REVIEW statements below are historical review snapshots. [UI / Live delivery accelerator](V3_UI_LIVE_ACCELERATOR.md) documents the bounded frontend follow-on and deployment settings.

**UI Phase 5 Stage B — IMPLEMENTED / IN REVIEW. Clinical Documentation — REAL LIVE INTEGRATION. PR #59 remains OPEN / UNMERGED; DO NOT MERGE.**

Stage B follows [Issue #48 gate authorization 6524790227](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6524790227), backend main `42b59da01e591f9c4792b81c2cb9b48a0a00cd2d`, and its successful exact-main Bootstrap 41008236990 / validate 123907937943. The existing Stage A branch was continued, without rebase or force-push. Normal merge-from-main commit: `cbcaeab` (ordered parents: Stage A `41af71992862b4f75423c977a1f1036d7403ee13`, backend main above). Final head and exact-head Bootstrap run/job are recorded in [PR #59](https://github.com/abuhmaid28/egyhealth360/pull/59).

## Reconciliation with the actual merged backend

The source of truth is [OpenAPI](openapi.json), [Slice 5 contract/runtime](V3_I2_SLICE5.md), `apps/api/src/documentation.ts` and `packages/db/src/documentation.ts`. Stage A's controlled view models are not transport DTOs.

- Findings are explicit fields of each document. Live has separate private-note and patient-summary findings, with an explicit document selector. There is no standalone findings-save endpoint. Saving either draft includes only that document's entered complaint, problems, diagnoses and allergy review; there is no private-to-summary copying. Summary findings are included in its explicit release preview and released view.
- Draft saves create independent immutable roots. There is no draft-update command. The UI explains each save and offers a blank separate draft without copying signed content. Signed changes use the backend's reasoned correction/addendum commands.
- Document `kind` is `PRIVATE_NOTE`/`PATIENT_SUMMARY`; version `kind` is `DRAFT`/`SIGN`/`RELEASE`/`ADDENDUM`/`CORRECT`. They are mapped separately. Exact root/version/sequence targets remain transient author command state. Patient views omit author-only sequence, draft predecessors, consultation/root IDs and raw DTOs.
- `effective` is server-owned; an addendum supplements signed content. Only the newest head of each root has amendment commands. A fresher detail response supersedes an older list head.
- Restricting an exact version suppresses that entire document lineage in ordinary backend projections. UI invalidation clears every registered session service, pending narrative/replay state, IDs and page metadata before re-reading. Disposed scopes and delayed responses cannot repopulate newer views. No forensic history is exposed.
- Released DTOs do not supply author/clinic/patient display names. The released view does not fabricate them. The author's opening context uses permitted booking and public-directory metadata only.

## Exact Live routes integrated

All paths below are prefixed with `/api/v1`. Browser reads use GET; backend HEAD/no-store parity remains covered by the inherited Slice 5 integration suite.

| Purpose | Actual merged route |
| --- | --- |
| Independent immutable draft; current-author document list | POST / GET `/consultations/{consultationId}/documents` |
| Current-author bounded version detail | GET `/consultations/{consultationId}/documents/{documentId}` |
| Sign private note only | POST `/consultations/{consultationId}/documents/{documentId}/sign` |
| Deliberate patient-summary release only | POST `/consultations/{consultationId}/documents/{documentId}/sign-release` |
| Append signed addendum / correction | POST `/consultations/{consultationId}/documents/{documentId}/addenda` / `/corrections` |
| Exact wrong-patient restriction | POST `/consultations/{consultationId}/documents/{documentId}/privacy-restrictions` |
| Own released list / permitted history | GET `/me/summaries` / `/me/summaries/{summaryId}` |
| Current-related clinician released list / history | GET `/patients/{patientId}/summaries` / `/patients/{patientId}/summaries/{summaryId}` |

Author entry: existing Live opening → opening details → **Open clinical documentation**. Own released entry: `/patient/summaries`. Related-clinician entry: `/doctor/summaries`, requiring the exact patient locator and that clinician's own current ACTIVE relationship. This does not create a relationship or grant access. Lists and histories have explicit bounded twenty-entry pagination; no unbounded background collection is performed.

## Transport, privacy and recovery

`src/lib/api/documentation.ts` uses the existing credentialed, same-origin Live adapter and Next rewrite. HttpOnly sessions remain browser-managed; CSRF, operation keys, entered content and projection state remain in memory. No clinical payload enters URLs, browser storage, logs or analytics. No `Idempotency-Key` header, automatic mutation retry or Live → Demo fallback exists.

Actual outgoing JSON must fit the 16 KiB budget without truncation. Canonical UUIDv4 keys are retained for explicit unchanged retries. Changed commands use a fresh key, including concurrent changed payloads. Pending fingerprints are SHA-256 values rather than retained narrative copies. Invalid/malformed/lost mutation responses are uncertain; the UI never invents success. Ordinary reads reauthorize after writes instead of treating replay bodies as current authority.

Safe authored states cover validation, 401 expiry, 403 CSRF failure, scoped 404, 409 conflict, 413, 415 and unavailable/uncertain responses. Logout, session expiry and identity/role changes invalidate the entire clinical capability scope. Scope subscriptions synchronously remove editors, history and dialogs. Generation/read-serial checks discard delayed results, and React development effect replay preserves the current service while real unmount disposes it. A restriction clears other retained service instances as well as the initiating one. Other tabs refresh through the server; already delivered responses cannot be recalled.

**PRIVATE_NOTE boundary — PRESERVED. Patient Release — EXPLICIT ONLY. Wrong-patient masking — PRESERVED. Booking clinical authority — ZERO.** UNKNOWN and NOT_REVIEWED always retain their distinct uncertainty labels. ADMIN and unrelated clinicians receive no private access.

## Validation and presentation

The real `test:ui:real` runner retains Availability, Booking, schedule/attendance/correction and Consultation Opening, then runs `scripts/support/ui-documentation-real.mjs` through **Browser → Next → Nest → PostgreSQL**. Genuine bilateral patient authorization and clinician acceptance establish each clinician's relationship. Documentation proof covers all four allergy states, immutable drafts/private signing, explicit release with a deliberately lost committed response and exact unchanged UI retry, no duplicate versions, own/current-related released list/detail, private boundary, correction/addendum preservation, deliberate restriction with a lost response, ordinary masking/replay denial, relationship ending/session revocation and memory-only responsive UI. No documentation HTTP route is mocked.

Thirty-three focused Live adapter tests supplement the twenty-two retained controlled capability tests. They include strict DTO projection, actual request bytes, every safe error category, concurrent command keys, scoped disposal, cross-service invalidation, delayed-read isolation, authenticated identity renewal, fresher detail heads and pagination. The complete controlled EN/AR/RTL browser matrix remains separate from persistence proof. Final full unit/integration counts, exact head and Bootstrap job are maintained in the PR after actual execution. Both dependency audits retain 0 HIGH / 0 CRITICAL (2 LOW / 3 MODERATE inherited findings).

| Real capture | Surface |
| --- | --- |
| [55](ui-screenshots/55-en-live-documentation-release.png) | English explicit Live release, including saved structured findings |
| [56](ui-screenshots/56-en-mobile-live-released-summary.png) | English mobile patient released projection |
| [57](ui-screenshots/57-ar-mobile-live-documentation.png) | Arabic/RTL mobile author workspace |
| [58](ui-screenshots/58-ar-mobile-live-released-summary.png) | Arabic/RTL mobile patient released projection |

These use synthetic data persisted by the real API/database; previous controlled captures 46–54 retain their historical meaning. Responsive checks cover 1440/834/390, English/Arabic and RTL; existing native dialogs retain keyboard/focus behavior. Language changes preserve unsaved Live fields and command state.

## Retained limitations and scope

The merged backend has no consultation-read/recovery endpoint. Author entry therefore requires the genuine opening receipt in the current client session. After a full browser reload/logout the UI explains that context is unavailable; it does not guess a consultation/booking binding, issue an automatic mutation, persist clinical context or invent a route. Patient and related-clinician released views remain available after fresh authentication. Independent draft identities and append-only signed amendments follow the actual backend contract; there is no in-place draft editor. The related-clinician screen requires an exact patient locator because no approved clinical-patient directory is implemented here.

No backend implementation, schema, migration, clinical policy or `.github/workflows/ci.yml` changes were authored. No Slice 6, prescriptions/labs/pharmacy backend work, I3 or EACCE is included. Graduation Demo remains separate and deterministic. Final independent review and exact-head Bootstrap are required before any later merge decision; this task does not authorize merge.

---

## Historical Stage A record

The following is the original Stage A record. Its "not Live" and "Stage B pending" statements describe that earlier delivered stage and are superseded by the Stage B implementation above.

# UI Phase 5 — Stage A clinical documentation

**CONTROLLED / NOT LIVE.** Branch `feat/v3-ui-phase5-consultation-documentation`. This bounded frontend track follows [Issue #48 Fast-Track authorization 6513918540](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6513918540) and the frozen [I2 documentation/privacy contract, §11](V3_I2_CONTRACT.md#11-documentation-and-privacy-model). Backend Slice 5 is not integrated by Stage A. Keep this PR **DRAFT / OPEN / UNMERGED**; no merge is authorized.

The branch starts at exact main `1439016d9271a1deff5ddd98b8f2b2d58aa8baa4`. Before source changes, [Bootstrap 40995148133](https://github.com/abuhmaid28/egyhealth360/actions/runs/40995148133), attempt 1, validate job `123866429499`, was verified **COMPLETED / SUCCESS** on that exact SHA. This inherits the merged, verified Real Consultation Opening work. Earlier Phase 4 CI failures are historical evidence, not a current blocker. No backend-status reconciliation is performed here.

## Architecture and integration mapping

| Surface                                                     | Stage A behavior                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal Live `/doctor/consultation/:bookingId/documentation` | Opened metadata shell links to integration status. Intentional unavailable state; no authoring, fake success or documentation HTTP request.                                                                   |
| Normal Live `/patient/summaries`                            | Prepared patient released-summary route, unavailable until real integration. No document reads or hidden counts.                                                                                              |
| Isolated clinician presentation host `/`                    | Complete controlled workspace: complaint, problems, diagnoses, allergy/intolerance review, private note, summary/instructions, signing, release, immutable history, amendments and wrong-patient restriction. |
| Isolated patient presentation host `/`, patient role        | Strict own `SIGNED_RELEASED` projection only, with safe signing/release metadata and permitted correction/addendum history.                                                                                   |
| Existing Live capabilities                                  | Authentication, directory/profile, availability, Booking lifecycle/schedule/attendance/correction and Consultation Opening are preserved.                                                                     |
| Existing graduation Demo                                    | Unchanged and separate; its clinical data never enters the documentation capability.                                                                                                                          |

`src/lib/clinical/documentation.ts` defines typed **frontend view/capability models**, validation and an in-memory command coordinator. They are not future backend DTOs, routes, status/error declarations or authorization policy. `createUnavailableDocumentation()` is the only normal Live documentation implementation: every read/write rejects before transport, with no driver, fixture import or activation flag.

`src/components/documentation.tsx` renders the service without knowledge of HTTP. Independent section state preserves unrelated unsaved fields. Scope-keyed mounts and generation-stamped refreshes discard stale author responses before another viewer or a restricted projection can render. Recovery offers an explicit refresh; no automatic mutation retries occur.

`src/lib/mock/documentation-controlled.ts` is imported only by `src/previews/documentation.tsx` and tests. `scripts/support/ui-documentation-host.mjs` generates a temporary Next host beneath ignored `apps/web/.next/documentation-preview-*`, using the existing React/Next components, styling and localization. It builds and serves a separate artifact; it never overwrites normal `.next/static` or server output. Production has **no preview route, environment switch, query parameter or browser-storage switch**. Browser validation scans normal build artifacts for a marker used by the fixture driver, as well as the private-content canary, and tests attempted flag injection.

Launch the local controlled host after frozen install/build:

```sh
node scripts/preview-ui-documentation.mjs
# http://127.0.0.1:3205 — synthetic controlled preview, NOT Live
```

The collapsible preview controls switch synthetic viewers and authority/open-context/session scenarios, hold a response, or inject one uncertain/conflicting action result. They do not create real relationships or permissions. All clinical narratives, drafts, operation keys and synthetic versions exist only in memory and disappear on full reload/host shutdown. Only the existing language preference may use browser storage. No clinical content is written to URLs, console logs, analytics or error messages.

## Workspace, release and privacy

Complaint is optional; problems and diagnoses have add/edit/remove and limit feedback. All four authored allergy states are explicit; missing review defaults to `NOT_REVIEWED`, never “no known.” Positive review requires a human-entered finding, kind and optional reaction; there are no suggestions or inferred diagnoses/allergies.

Private Note and Patient Summary have separate identities and editors. The note states **“Private — visible only to you while you retain current clinical authority.”** Saving or signing a note cannot release it. Patient summary/instructions are independently saved drafts, marked **“Not visible to patient yet.”** No clinical text is automatically copied between sections. Release previews only the exact saved summary and instructions and requires a separate deliberate confirmation; dirty drafts must be saved first. Navigation, consultation opening and ordinary saving never release content.

Controlled signed versions remain immutable; correction/addendum creates another signed version with bounded reason and visible predecessor/change/current labels, retaining the original. Summary amendments deliberately confirm patient release again; private amendments stay private. Wrong-patient restriction requires selection of an exact visible version, a reason, a warning and acknowledgement. Matching visible version labels disambiguate versions without exposing UUIDs. Ordinary projections remove affected payload and lineage; retained uncertain-command outcomes cannot resurrect it. This controlled fixture masks the selected document's synthetic lineage; it is **not a backend propagation-policy decision**. Restriction never moves a record to another patient and exposes no forensic screen or hidden counts.

The patient projection uses an explicit allowlist with no private-note/facts/draft/authority properties or hidden lineage. Another patient sees no content; another clinician and ADMIN cannot inspect the author's private workspace. Patient own released summaries remain separate from the author's current authority. Current author access is required again after scope changes, including pending responses; opening a visit confers no continuing permission.

**Booking clinical authority = ZERO.** This frontend creates no assignment, relationship, consent or acceptance. Real authority and all Stage B writes must remain server enforced.

## Bounds, commands and safe states

Frozen UI bounds: complaint 2,000 Unicode scalars; up to 20 problem/diagnosis/allergy items, each text up to 500; note/summary/instructions each 8,000; reasons 1–1,000. Controls except LF, C1 controls and unpaired surrogates are rejected. The 16 KiB combined command budget fails explicitly without truncation. This Stage A view-command envelope is **not** an HTTP schema; Stage B must apply the actual merged request envelope and transport byte limit.

Canonical lowercase UUIDv4 operation keys are held in memory per scope, command, target and canonicalized unchanged payload. An uncertain unchanged explicit retry reuses its key; a changed payload or acknowledged new command receives a new key. Payloads are snapshotted before awaiting responses; concurrent unchanged attempts share their pending key. Scope changes discard pending identity. No `Idempotency-Key` header, endpoint, automatic mutation retry or Live → Demo fallback exists.

Uncertain restriction results retain an authored warning across the fresh scoped read; unchanged visible content never implies success. Amendment denials clear the stale workspace through a fresh scoped read, with explicit refresh recovery for conflicts.

Intentional states include loading, empty signed/released history, pending save/sign/restrict, saved draft, signed/private, explicitly released, uncertain/retry, unavailable integration, current-access denial, session expiry, conflict/stale target, restricted document, scalar validation and combined-budget rejection. Authored messages reveal no hidden authority sub-check, raw exception, parser output or clinical payload. English and authored Arabic share the existing localization architecture; entered text/names/codes stay verbatim with bidi handling. Logical layouts, native dialogs, focus return, associated labels/help/errors and live announcements support keyboard and touch use.

## Presentation evidence — controlled only

These captures demonstrate UI states using transient synthetic data. **They are not real Slice 5 persistence, security or end-to-end backend proof.** Prior reviewed screenshots 01–45 are preserved unchanged.

| Capture                                                       | Screen                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| [46](ui-screenshots/46-en-documentation-workspace.png)        | English clinician workspace and explicit review uncertainty |
| [47](ui-screenshots/47-en-documentation-private-boundary.png) | Private note boundary                                       |
| [48](ui-screenshots/48-en-documentation-release-review.png)   | Explicit summary-only release confirmation                  |
| [49](ui-screenshots/49-en-documentation-signed-history.png)   | Preserved signed correction/addendum history                |
| [50](ui-screenshots/50-en-documentation-restriction.png)      | Exact-version wrong-patient safety confirmation             |
| [51](ui-screenshots/51-en-patient-released-summary.png)       | Patient own released summary                                |
| [52](ui-screenshots/52-ar-documentation-workspace.png)        | Arabic/RTL workspace                                        |
| [53](ui-screenshots/53-ar-documentation-private-boundary.png) | Arabic private note boundary                                |
| [54](ui-screenshots/54-ar-mobile-released-summary.png)        | Arabic mobile released summary                              |

## Validation

Frozen install, generate, workspace build, lint and typecheck pass using repository-pinned Node 24.21.0 / pnpm 10.34.6. **189/189 unit tests pass**, including **22 documentation capability/privacy/retry tests**. Existing Booking/Opening adapter assertions are unchanged; their standalone compiler output paths now explicitly preserve the library root after the new clinical sibling import. The localization catalog check also covers the isolated preview entry.

`pnpm test:ui:browser` includes existing English/Arabic Golden Demos, Phase 3 accessibility/navigation, live-contract Booking/Opening matrices and the new isolated documentation matrix. Documentation checks cover EN/LTR and AR/RTL at **1440 / 834 / 390**, loading, private separation, saved/dirty drafts, explicit release and uncertain retry, conflicts/recovery, corrections/addenda, restriction including uncertain results before and after controlled commit, scoped/expired sessions, patient/other-clinician/ADMIN projections, keyboard/dialog focus, memory-only state and normal-build fixture exclusion.

`pnpm test:ui:real` passes the **existing** Browser → Next → Nest → PostgreSQL Availability, Booking and relationship-gated Consultation Opening regressions, including exact retry/no duplicates, terminal action rejection and zero implicit clinical authority/assignment. It is not a real clinical-documentation test. Stage A sends no documentation request. Production/full audits report **0 HIGH / 0 CRITICAL**, with the unchanged baseline of 2 LOW / 3 MODERATE findings; no dependencies or lockfile changed. Existing Bootstrap CI is retained without weakening; new exact-head evidence is recorded in the draft PR.

## Stage B — pending, not executed

Use this same branch/PR only after backend Slice 5 independent review, normal merge and successful exact-main post-merge Bootstrap. Fetch and normally merge current main (no rebase/force-push), then read the actual merged OpenAPI/runtime before implementing transport. Reconcile view models, identity/version references, authority refresh, bounds, restriction propagation, errors and replay semantics with that merged truth. Do not treat the controlled fixture as a backend contract.

Stage B must supply strict real response projections and actual Browser → Next → Nest → PostgreSQL proof, verify privacy/restriction/retry/persistence, and pass full exact-head Bootstrap before independent review readiness. No speculative clinical HTTP calls are added now. Live complaints/diagnoses/allergy/notes/summary/instructions remain disabled. New prescription/lab/pharmacy/follow-up, I3/EACCE and diagnostic automation are outside this bounded track. Backend, schemas, migrations, authorization and security policy remain unchanged.
