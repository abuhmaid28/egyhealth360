# Testing Strategy V1

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
