# V3-I2 Slice 6 — validation record

Baseline: `42b59da01e591f9c4792b81c2cb9b48a0a00cd2d`.
Exact authorized main Bootstrap 41008236990 / validate 123907937943 was verified
COMPLETED / SUCCESS before source changes. That is baseline evidence, not Slice 6 CI.
[Reconciled contract and migration-by-migration inventory](V3_I2_SLICE6.md).
[Reconciliation comment](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6525107918)
and [audit compatibility delta](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6525453594).

## Checkpoints

1. `4e868c7`: repository reconciliation, stable domain/API/DB/lock contract and all
   eighteen historical migration hashes pinned before production implementation.
2. `fb67fa5`: additive migration, persistence, strict API and appended OpenAPI.
3. `2d3dd61`: authorization/replay/audit/security proof and compatibility corrections.
4. `6b0becb`: verification/runtime implementation complete. `3d3ca44` records the
   timezone catalog compatibility refinement. All local gates below now PASS.
   Exact-head Bootstrap and PR opening remain gated on Lane A; no review approval
   or overall Slice 6 completion is claimed.

## Executed focused evidence

- Prisma validate, full build, typecheck and lint PASS; frozen Docker install/build PASS.
- Final full unit run 198/198 PASS; intent unit suite 13/13 PASS.
- New service/strict HTTP/direct SQL/rollback tests PASS. Scopes include all roles,
  author/current assignment, unrelated/wrong patient, draft privacy, released-only
  reads, source suspension independence, canonical UUID/query handling, JSON decoded
  duplicate keys including nested objects, fatal UTF-8, controls/scalar bounds,
  IANA/DST/calendar normalization, strict media/encoding, body/header/URL limits,
  Origin/Fetch Metadata/CSRF, no Idempotency-Key, methods, no-store and HEAD.
- All 192 current-authority race cases PASS: six commands × assignment ending,
  bilateral withdrawal, session revoke, clinician disable, patient disable,
  membership ending, org suspension and affiliation withdrawal × both orders ×
  commit/rollback. Independent connections and `pg_blocking_pids` observed.
- Duplicate commands, competing release/correction/replacement, privacy/write races,
  forced audit failure for all six commands, expiry after advisory waits/before
  commit, actual lock timeout/external deadlock, key reuse and no retry PASS.
- Initial link vs cancel/reschedule/open/no-show, 16/16 corrected-fixture cases PASS.
  Replacement vs old and target booking cancel/reschedule, both orders and rollback,
  16/16 PASS. Different-provider same-patient booking races, retained replay vs
  privacy and concurrent changed-payload keys, 14/14 PASS. Canonical legacy lock order is unchanged.
- Populated real-runner 18→19 upgrade PASS: all 43 historical domain tables, 108 retained
  rows (including scheduled/cancelled EH-012 appointments and an HTN encounter/BP link) and the eighteen-entry ledger preserved; historical checksums unchanged;
  five new tables empty; repeat deploy/status ZERO_WRITE. Fresh deploy/status/redeploy
  and the repository historical migration verifier PASS in a separate disposable DB.
- Ordinary SQL rejects UPDATE/DELETE/TRUNCATE including empty statements, mismatched
  consultation/patient/author, missing initial source, sequence gaps, missing/wrong
  operation result, cross-patient/non-BOOKED link, reused historical privacy operation
  and missing audit. Retained legacy audit/TRUNCATE regression PASS. Deferred exact
  audit existence preserves atomicity without adding an audit FK.
- EH-012 service and real HTTP regression PASS: old non-idempotent appointments remain
  SCHEDULED/CANCELLED, old patient-read/clinician-write and cancel/no-op behavior remain.
  Creating an intent creates no FollowUpAppointment/Booking/CareAction; creating an
  old appointment creates no intent/Booking/CareAction. No EACCE/closure bridge.
- `eh-v3-i2-slice6-follow-up-intent-proof-v1`: 23/23 PASS locally and inside the built
  Docker image, genuine HTTP, isolated synthetic DB and real database clock. It waits
  for real availability before consultation opening; no time/trigger bypass in runtime.
- Container auth/authorization unit 7/7 PASS. Docker API/web/worker/PostgreSQL healthy.
- EN/AR/RTL controlled browser and real Browser→Next→Nest→PostgreSQL availability,
  Booking and Consultation Opening regression PASS using installed Chromium through
  existing `EH_UI_CHROMIUM=/usr/bin/chromium`. No frontend source changes.
- Both HIGH-severity audits PASS: 0 HIGH/CRITICAL, existing 2 LOW / 3 MODERATE.

The initial test runs exposed fixture/accounting issues, all corrected: synthetic
past slots overlapped; deferred events had to be flushed before re-enabling fixture
guards; additional role logins added authentication audits before replay comparisons;
a 5-minute runtime publication configuration needed explicit restoration to 30 minutes
before later test publications. Origin failure correctly follows existing 403 CSRF
semantics. A second-pass Intl/PostgreSQL timezone catalog mismatch now returns authorized
400 before any insert, preserving exact declared zone without alias coercion; its
focused HTTP/rollback suite is 4/4 PASS. No product semantics were weakened to make
tests pass.

## Final local gates and Lane A boundary

The first full integration invocation was intentionally interrupted to run the
complete current file set with local `--test-concurrency=4` on the two-core executor.
That interrupted invocation is not counted as a passing suite. The final full run passed **1096/1096 integration tests**, zero failures/skips/
cancellations, in 1857.877 seconds on this two-core executor. Its 279 new Slice 6
cases include the 239-case authority/booking/security matrix, 14 cross-provider/
privacy/key races, 16 old/target replacement races and 10 core/HTTP/integrity/
upgrade/rollback cases. The subsequently strengthened populated-EH-012 upgrade
fixture also passed separately (1/1, 108 retained rows). This is local execution
configuration, not a CI/workflow edit. No interrupted/skipped/cancelled test is
reported as a pass. All legacy Docker runtime verifiers, auth measurement, web/API
smoke and cleanup PASS. Final-image intent runtime 23/23 and focused HTTP/rollback
4/4 PASS, in addition to the full local unit 198/198 and typecheck/Prisma/lint gates.
Task-owned API/web/worker processes were stopped; only the two named disposable
validation/runtime DBs and their temporary environment files were removed. The
pre-existing local database/volume was retained.

`.github/workflows/ci.yml` remains byte-identical to the authorized main. Required new
CI command: `docker compose exec -T api node scripts/verify-follow-up-intent-runtime.mjs`.
Only after Control Center confirms Lane A merged: fetch main, normal merge into this
branch, wire that command into the accelerated architecture, run full exact-head
Bootstrap, then open exactly one PR to main OPEN / UNMERGED with auto-merge disabled.
If CI wiring is the sole remaining task while Lane A is unresolved, stop at that gate.
No merge or deployment authorization exists. At the final gate, fetched main is
still `42b59da01e591f9c4792b81c2cb9b48a0a00cd2d`; Lane A [PR #60](https://github.com/abuhmaid28/egyhealth360/pull/60)
is OPEN / UNMERGED (all four checks successful). Control Center has not confirmed
a merge. Therefore the explicit stop condition applies: workflow wiring is the sole
remaining implementation task. No Slice 6 PR was opened and no Slice 6 CI run/job
is claimed; the verified baseline run/job above must not be mistaken for Slice 6
CI. Resume by normal main merge only after the Lane A confirmation.

## Limits

No frontend, generic clinical engine, auto-booking/reservation, recurrence, inferred
follow-up, medication/lab/pharmacy/notification work, I3 or EACCE. No historical
reinterpretation/backfill. Ordinary SQL guards protect structure/history; application
sessions establish authority, owners/superusers can disable guards. Expiry is a final
check-time guarantee, not recall of responses. Empty first link history is valid for
unlinked intent; exhausted detail pages return scoped 404. Historical replay retains
result ceilings while reflecting current booking state/effectivity and privacy.

## Changed files

39 files; no frontend, dependency, workflow or historical SQL edits.

- `AGENTS.md`
- `apps/api/src/app.ts`
- `apps/api/src/documentation.ts`
- `apps/api/src/follow-up-intents.ts`
- `apps/api/src/main.ts`
- `docs/API.md`
- `docs/DATA_MODEL.md`
- `docs/PROJECT.md`
- `docs/SECURITY.md`
- `docs/V3_I2_CONTRACT.md`
- `docs/V3_I2_SLICE6.md`
- `docs/V3_I2_SLICE6_VALIDATION.md`
- `docs/openapi.json`
- `packages/db/prisma/migrations/20261030120000_v3_i2_follow_up_intent/migration.sql`
- `packages/db/prisma/schema.prisma`
- `packages/db/src/follow-up-intent-values.ts`
- `packages/db/src/follow-up-intents.ts`
- `packages/db/src/index.ts`
- `scripts/verify-follow-up-intent-runtime.mjs`
- `scripts/verify-migrations.mjs`
- `tests/bp-amendments.test.mjs`
- `tests/care-actions.test.mjs`
- `tests/consultations.test.mjs`
- `tests/documentation.test.mjs`
- `tests/fixtures/v3-i2-slice6-catalog.json`
- `tests/fixtures/v3-i2-slice6-migration-checksums.json`
- `tests/follow-up-intents.test.mjs`
- `tests/integration/catalog.test.mjs`
- `tests/integration/follow-up-intents-concurrency.test.mjs`
- `tests/integration/follow-up-intents-cross-provider.test.mjs`
- `tests/integration/follow-up-intents-http.test.mjs`
- `tests/integration/follow-up-intents-integrity.test.mjs`
- `tests/integration/follow-up-intents-migration.test.mjs`
- `tests/integration/follow-up-intents-replacement-races.test.mjs`
- `tests/integration/follow-up-intents-rollback.test.mjs`
- `tests/integration/follow-up-intents.test.mjs`
- `tests/support/follow-up-intent-races.mjs`
- `tests/support/follow-up-intents.mjs`
- `tests/support/openapi-baseline.mjs`
