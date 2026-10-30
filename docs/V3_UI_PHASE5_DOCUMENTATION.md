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

`pnpm test:ui:browser` includes existing English/Arabic Golden Demos, Phase 3 accessibility/navigation, live-contract Booking/Opening matrices and the new isolated documentation matrix. Documentation checks cover EN/LTR and AR/RTL at **1440 / 834 / 390**, loading, private separation, saved/dirty drafts, explicit release and uncertain retry, conflicts/recovery, corrections/addenda, restriction including uncertain committed outcome, scoped/expired sessions, patient/other-clinician/ADMIN projections, keyboard/dialog focus, memory-only state and normal-build fixture exclusion.

`pnpm test:ui:real` passes the **existing** Browser → Next → Nest → PostgreSQL Availability, Booking and relationship-gated Consultation Opening regressions, including exact retry/no duplicates, terminal action rejection and zero implicit clinical authority/assignment. It is not a real clinical-documentation test. Stage A sends no documentation request. Production/full audits report **0 HIGH / 0 CRITICAL**, with the unchanged baseline of 2 LOW / 3 MODERATE findings; no dependencies or lockfile changed. Existing Bootstrap CI is retained without weakening; new exact-head evidence is recorded in the draft PR.

## Stage B — pending, not executed

Use this same branch/PR only after backend Slice 5 independent review, normal merge and successful exact-main post-merge Bootstrap. Fetch and normally merge current main (no rebase/force-push), then read the actual merged OpenAPI/runtime before implementing transport. Reconcile view models, identity/version references, authority refresh, bounds, restriction propagation, errors and replay semantics with that merged truth. Do not treat the controlled fixture as a backend contract.

Stage B must supply strict real response projections and actual Browser → Next → Nest → PostgreSQL proof, verify privacy/restriction/retry/persistence, and pass full exact-head Bootstrap before independent review readiness. No speculative clinical HTTP calls are added now. Live complaints/diagnoses/allergy/notes/summary/instructions remain disabled. New prescription/lab/pharmacy/follow-up, I3/EACCE and diagnostic automation are outside this bounded track. Backend, schemas, migrations, authorization and security policy remain unchanged.
