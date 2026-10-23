# Testing Strategy — V3 Acceptance and Retained Slice Evidence

[I1 compatibility inventory](V3_I1_CONTRACT.md#compatibility-inventory--reviewed-runtime-baseline), [race guarantees](V3_I1_CONTRACT.md#concurrency-and-revocation-guarantees) and [acceptance matrix](V3_I1_CONTRACT.md#acceptance-traceability-and-exit-proof) are approved future obligations under Issue #39. Slice 1 merged/verified; [Slice 2 tests and validation](V3_I1_SLICE2_VALIDATION.md) cover its bounded roles/organizations/memberships implementation in review. I1 NOT COMPLETE; Slice 3 NOT AUTHORIZED. Other I1 obligations remain future work. Do not weaken historical tests or represent future I1 concurrency tests as passing.

## V3 policy versus delivered evidence

Product V3 policy APPROVED; V3-G0 COMPLETE ([verified closeout](PROJECT.md#v3-g0-completion-evidence)); V3-I1 NOT COMPLETE; EACCE/UI NOT STARTED and DESIGN FROZEN. The requirements below are future verification obligations, not new tests or passing implementation claims. Existing M0–M2 validation reports/test contracts remain unchanged.

Prove [journeys A–D](PRODUCT.md#golden-journeys-and-success) through real backend/domain behavior: signup/discovery/booking/relationship/consultation, lab final results, full-item dispensing and longitudinal BP/plan/action continuity. Then prove future EACCE against its explicitly approved input/evidence contracts. Imaging is SHOULD only and claimed only after proof. Policy coverage PASS is not executable PASS.

Extend security verification to public/private directory data, patient-only signup/no role escalation, own bookings, own schedule/minimal pre-relationship logistics, explicit authorization/acceptance/ending, current cross-provider clinical relationship and private-note/released-summary separation. Add recipient-scoped lab/pharmacy cross-patient/provider IDOR and D36 current user/org/membership/artifact suspension/cancellation checks, without weakening legacy ACTIVE-assignment tests.

Later signed prescription/result/consultation tests must preserve source versions/corrections/retractions, wrong-patient payload/reference/count/notification masking and patient/current-doctor independent access; ADMIN must never gain clinical payload or fulfillment by role. Verify booking contention/retries/failed replacement, full-item duplicate dispensing and cancellation/replacement reconciliation in their own frozen contracts. No operational event implies adherence, applicability, coverage sufficiency or action completion.

Map future evidence through [V3 requirements/traceability](TRACEABILITY_MATRIX_V1.md). Preserve the fixed M1 seed, ten historical migrations and M2 exact-pin/INITIAL/privacy regressions. Research B0/B1/P1/holdout isolation remains unchanged. Frontend/accessibility checks occur only after separate design-unfreeze approval and implemented relevant domain behavior.

## Retained strategy and historical slice evidence

General principles remain applicable; old screen-centric journey names and M3 references below are historical Layer C targets, mapped to V3-I5/I6/I7. They are not the complete V3 product journey or current design authorization.

## Principle
A feature is not done because code compiles or a screen renders. Tests are selected by risk and requirement coverage.

## Core layers
- Unit/domain tests
- Database constraint tests
- Integration tests against PostgreSQL
- API contract/validation tests
- Authorization/IDOR regression tests
- Frontend behavior/accessibility tests
- Playwright golden-journey E2E tests
- Security/regression tests
- Research-integrity/reproducibility tests

## EACCE golden cases
At minimum test deterministic cases for:
- NOT_DUE
- COMPLETED
- SCHEDULED
- TRUE_GAP
- UNCERTAIN
- EXEMPT

Edge cases include irrelevant missing windows, cancelled future appointments, out-of-window completion evidence, duplicate events, conflicting evidence, and deterministic repeatability.

Classification and explanation/reason codes must remain logically consistent.

## Authorization matrix
Automated tests must verify:
- Patient A -> own data allowed
- Patient A -> Patient B denied
- Clinician -> assigned patient allowed
- Clinician -> unassigned patient denied
- Admin -> normal clinical editing denied

Every protected endpoint referencing patient/care-plan/action/assessment IDs requires object-level authorization regression coverage.

## Research-integrity tests
- ground-truth-only fields absent from engine inputs
- Baseline and EACCE receive equivalent observed inputs
- corruption deterministic for fixed seed/config
- corruption does not change preserved ground truth
- silent missingness supplies no hidden hint
- metrics verified against small known confusion matrices
- small experiment reproducible across repeated runs

## Golden E2E journeys
1. Clinician -> TRUE_GAP case -> explanation -> confirm
2. Clinician -> incomplete-coverage case -> UNCERTAIN, not confirmed gap
3. New evidence changes current classification while preserving history
4. Patient -> plan -> BP measurement flow
5. Admin -> Evaluation Lab -> experiment completes -> real metrics displayed

## CI
Typical PR gate:
Lint -> Typecheck -> Unit -> EACCE Golden -> DB/Integration -> Authorization/API -> critical frontend tests -> Build.

Add Playwright golden journeys once the application foundation is stable. Full research matrix is not required on every PR; CI uses a small smoke experiment and full runs are explicit research workflows.

## Demo readiness
A deterministic demo-verification command should verify database health, demo seed, logins, and fixed TRUE_GAP/UNCERTAIN/SCHEDULED/COMPLETED scenarios before the final presentation.

## Bug policy
Every meaningful fixed bug receives a regression test. Final-demo target: zero known P0/P1 defects.

## EH-007 automated evidence

`tests/authorization.test.mjs` and `tests/integration/authorization.test.mjs` cover
T-AUTHZ-IDOR-* through real Nest HTTP + database sessions: self/cross-patient, ACTIVE/
ENDED/no/wrong clinician, ADMIN/missing profiles, input/path/HEAD bypass attempts,
uniform denial, current-state recheck, failure sanitization, audit silence and no
renewal/cache. Running-container proof: `scripts/verify-authorization-runtime.mjs`.
Snapshot concurrency limits are tested without claiming in-flight revocation.

## EH-008 seed and milestone verification

Demo unit/integration tests cover guard/secret handling, first/repeat/concurrent/
partial seed, profile recovery, credential/role/status/profile/relationship conflicts,
rollback, unrelated history preservation and future-compatible migration checks.
Actual Nest HTTP verifies all five logins, ownership, clinician assignment, ADMIN
denial, logout and zero-insert repetition. CI executes the running-container M1
workflow, preserving all EH-005/EH-006/EH-007 regressions. See EH-008_VALIDATION.md.

## EH-009 clinical-definition evidence

`tests/clinical-rules.test.mjs` checks the reviewed fixture, exact source/sections,
strict unknown/missing/type validation and deferred declarations. `tests/integration/
clinical-catalog.test.mjs` compares SQL/application validators, tests direct SQL/Prisma
publication bypasses, lifecycle/immutability/history, exact versions, concurrency,
stale snapshots, bounded lock timeouts, bootstrap conflicts/idempotency and audit/late
failure rollback. `tests/fixtures/eh009-approved-definition.json` is the reviewed
contract fixture; do not regenerate it to bless changed clinical logic.

The migration verifier retains EH-005 -> EH-006 checks and additionally upgrades a
seeded M1 database with real HTTP-generated session/audit history to EH-009, preserving
all six M1 tables and ledger entries. It repeats deploy/status and actual M1 verification.
Use only an empty disposable target database. Historical checksums remain pinned.
CI retains all M1/security/health/worker/Docker gates and adds explicit running-container
clinical bootstrap/repeat verification. See EH-009_VALIDATION.md for observed results.

## EH-010 care-plan foundation

Care-plan unit/integration tests cover exact read-only deferred declarations, nine-field
schema, explicit version pins, current clinician authorization, lifecycle/terminal
history, same-state audit silence, ACTIVE uniqueness and concurrency, retirement,
identity/timestamp immutability, SQL/TEMP bypass attempts and atomic audit rollback.
Session revocation/user disabling/assignment ending races must wait and fail closed.
Fresh four-migration and EH-009 upgrade proof retain M1/session/audit/catalog state and
ledger, repeat deploy/status and actual M1 HTTP verification. Historical baseline
suites remain isolated; latest-schema catalog/demo suites include EH-010.
Action generation/idempotency, calendar and evidence tests remain deferred acceptance
gates, not EH-010 PASS claims. All prior tests/audits/Docker/runtime/CI and independent
second-pass review remain required. See EH-010_VALIDATION.md.


## EH-011 BP evidence/API

BP unit tests cover exact flat JSON keys, escaped duplicate keys, lossless integer
numeric spellings, storage-only bounds and strict calendar/offset/precision parsing.
BP integration tests cover genuine-session HTTP role/IDOR matrix, minimized projection,
POST security/media/query/size errors, history pagination/order, HEAD/method/no-store,
source/actor consistency, immutable SQL/Prisma history, TEMP shadows, audit rollback,
non-idempotent duplicate preservation and controlled current-authorization races.
Fresh five-migration deploy and seeded EH-010 upgrade preserve all ten previous domain
tables, including three CarePlan lifecycle states, session/audit/catalog data and ledger.
Historical isolated EH-009/EH-010 tests retain their own migration baselines.
verify-m1-runtime additionally runs the genuine demo-session BP HTTP/provenance probe.
All existing suites, literal commands, audits, Docker and independent review/CI remain
mandatory. No action-generation/clinical-eligibility PASS is implied. See EH-011_VALIDATION.md.

## EH-012 operational evidence foundation

Follow-up unit/persistence/HTTP suites verify exact fields, purpose-only semantics, two-state lifecycle, backdating/future/precision, duplicate retention, cancellation and association no-ops, genuine provenance/audit rollback, own/assigned/denied matrix, both lock orderings for revocation/disable/assignment/mapping, final expiry, immutable SQL/Prisma history, declarative composite FKs, unique BP and TEMP-shadow resistance. HTTP tests cover strict scoped parsing, corrected association-reference route, nested IDOR, minimized projections, Origin/CSRF/media/query/size, methods/HEAD/no-store and no conditional 304. Existing global/BP parsers remain unchanged.

Fresh six-migration and populated EH-011->EH-012 upgrade retain all eleven prior domain tables, both BP source kinds, lifecycle/catalog/session/audit state and prior ledger. Repeat deploy/status and literal M1 commands remain required. Historical isolated suites retain their own migration baselines; broad model-absence assertions permit only the approved additions. verify-m1-runtime invokes verify-followup-runtime with private synthetic credentials, genuine HTTP and persisted audit/provenance proof. Both audits, Docker/runtime, final-head CI and separate independent review remain gates. Actual counts/results: EH-012_VALIDATION.md.

## EH-013 record coverage windows and normalized evidence queries

Coverage and normalized evidence suites cover:
- RecordCoverageWindow validation: regex `^[A-Za-z0-9_.-]{1,128}$` for sourceReference, chronology `startAt < endAt`, enum variants (`SYNTHETIC_BENCHMARK`, `COMPLETE`, `INCOMPLETE`, `UNKNOWN`).
- Exact assertion deduplication via `record_coverage_windows_assertion_key` and ON CONFLICT DO NOTHING insertion.
- Immutability guards rejecting UPDATE, DELETE, and TRUNCATE via database triggers.
- Source-partitioned coverage normalization: intervals partitioned strictly by (patientId, sourceType, sourceReference); precedence `INCOMPLETE > UNKNOWN > COMPLETE`; unasserted silent gaps preserved; adjacent identical segments coalesced; contributing raw window IDs preserved on every segment.
- Authorized normalized evidence persistence wrapper: Patient own-data access; Clinician active-assignment access; Admin/unassigned clinician/cross-patient denied.
- Single-statement snapshot retrieval returning normalized coverage timeline, raw BP measurements, encounter-anchored BP candidates, and operational appointment candidates without clinical qualification.
- Zero public HTTP routes; OpenAPI spec unchanged; no CareAction generation or EACCE classification.
- Fresh seven-migration deploy and EH-012 -> EH-013 upgrade verification preserving all 14 previous domain tables and ledger checksums.
Actual counts and results: EH-013_VALIDATION.md.

## EH-015 observed clinical applicability foundation

Observed applicability test suites cover:
- Age assertion truth table: validation and SQL check constraint `oa_snapshots_age_assertion_check` enforcing that `NO_ASSERTION` and `UNKNOWN` require age NULL, and `ASSERTED_VALUE` requires age >= 0. Rejection of string coercions, floats, and negative numbers.
- SQL triggers enforcing unconditional immutability on `observed_applicability_snapshots` and `observed_applicability_retractions` (UPDATE, DELETE, and TRUNCATE rejected).
- Machine writer idempotency: exact duplicate returns original snapshot/retraction (`created: false`); conflicting assertions fail closed with `APPLICABILITY_CONFLICT`.
- Terminal one-to-one retractions: target snapshot lock FOR UPDATE; partition FK integrity; chronology checks; duplicate retraction reference conflicts; cross-patient rejection.
- Mechanical point projection: pure in-memory evaluation of non-retracted snapshots returning `NO_NON_RETRACTED_ROWS`, `IDENTICAL_TUPLES`, or `DIFFERING_TUPLES`.
- Research noninterference & missingness preservation: inaccessible complete ground truth never backfills missing observed fields (`null` strictly preserved); explicit `UNKNOWN` and `ABSENT` preserved.
- Zero product audit events: internal synthetic writes and reads generate zero `audit_logs` entries.
- Authorized query service matrix: Patient own read allowed, ACTIVE-assigned Clinician read allowed, Admin denied, unassigned Clinician denied, cross-patient denied with uniform access denial.
- Architectural boundaries: `@egyhealth/db` exports only persistence wrapper, errors, and types; `apps/api` prevented from importing private writers/readers; zero public HTTP routes; OpenAPI spec unchanged.
- Migration verification: 8 migrations verified, and EH-013 -> EH-015 upgrade preserving all 15 previous domain tables.
Actual counts and results: EH-015_VALIDATION.md.



### EH-015 review 5563885959 regression evidence

`tests/integration/observed-applicability-fixes.test.mjs` exercises the real
PostgreSQL transport and transaction-local writers: immutable target/time copies
for Patient and Clinician reads (observed SQL parameters), snapshot/retraction
exact/conflicting retries with winner commit/rollback and exact blocker PIDs,
both lock orders for session/user/assignment/profile changes, final expiry,
exact point/offset retrieval, one-statement/coherent withdrawal views, held-lock
fixture failure/rollback, late-failure atomic correction, SQL precision/chronology/
receipt spoofing, independent composite FKs, TEMP shadows, named PKs and Prisma
immutability. Coordination signals, database waits and transactions are bounded.

The research suite uses the actual strict fixture validator, visible mapper and
writer, with external inaccessible canaries and SQL access guards. It preserves
NULL/UNKNOWN/explicit ABSENT and rejects hidden keys at all three manifest levels.
Loader and custom injection use the same exact-shape validation. Boundary tests
cover product/API/web/worker/startup and transitive local/workspace imports,
root-only exports, unchanged OpenAPI and sanitized runtime failure output.
The upgrade verifier preserves populated appointment/encounter/BP associations
and coverage as well as all previous rows and migration ledger entries.

## Issue #31 correction/invalidation acceptance

`tests/bp-amendments.test.mjs` covers strict canonical input and scope boundaries. `tests/integration/bp-amendments.test.mjs` runs against real isolated PostgreSQL databases: immutable source/full-pair corrections, one exclusion, bare restatement, F1 initial/already-excluded privacy, exact frozen predecessor sets, current-privacy retries, assignment/RBAC/IDOR denial, SQL constraints, audit-fault rollback, explicit duplicate provenance, real blocking concurrent operations and patient/clinician HTTP GET/HEAD/reference masking. Existing BP, encounter, normalized, auth and applicability regression suites remain required. Fixture helpers apply all read dependencies once; older migration checksums remain pinned. `pnpm test:migrations` proves fresh deploy, populated eight-to-nine upgrade with zero backfill/source changes and repeat deploy. Full commands/results and temporal limitations are in [BP_CORRECTION_INVALIDATION_VALIDATION.md](BP_CORRECTION_INVALIDATION_VALIDATION.md).


## EH-014 bounded INITIAL implementation — merged and post-merge validated

EH-014 acceptance is in tests/integration/care-actions.test.mjs: R1–R8, exact/competing retries, actual blocker-observed concurrent selections and both-order evidence/authority changes, audit rollback, SQL/Prisma immutability, privacy projections, snapshot preservation, calendar vectors and bounded synthetic proof. scripts/verify-migrations.mjs adds populated nine-to-ten migration preservation/zero-backfill/redeploy; pnpm m2:verify runs the isolated proof in host/runtime CI. Existing isolated historical foundation suites are retained; their global schema-absence assertions now permit the separately authorized EH-014 models, without weakening their source-model boundaries. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).

[PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. The exact-main validate job passed **67/67 unit**, **407/407 integration** (including 69 EH-014), fresh/populated/repeat verification across **10 migrations**, **7/7 container auth**, and the **EH-014 synthetic runtime proof PASS** (`eh-m2-initial-action-proof-v1`, INITIAL_ONLY, four cases). Lint/generation/Prisma validation/build/typecheck, audits, Docker health, existing runtime probes and smoke/cleanup also passed. These are observed remote results, not reruns in this documentation task; historical development failures remain intact in the validation report.

M2 functional exit gate PASS applies to traceable INITIAL generation, not EACCE. FR-024 remains foundation-only/incomplete; AC-004/AC-005 unsatisfied. Issue #28 is CLOSED/completed at the reconciliation baseline; M0–M2 remain COMPLETE. Old unstarted M3 is superseded/resequenced to V3-I5; EACCE has not started; Slice 2 is in review and I1 is not complete. Historical results above are retained evidence, not tests rerun for this documentation change.
