# EH-015 implementation-fix validation

## Review and exact-head evidence

This records fixes for independent implementation review
[5563885959](https://github.com/abuhmaid28/egyhealth360/pull/30#pullrequestreview-5563885959),
which reviewed `56e0944191f9f40fbecdc789ad1a1f7edf6c9ea9` against approved main
`40f3a0ecd64e0d9fe2389c9bd3efea4acaa63591`.

The earlier R1–R4 fix head and its GitHub Actions run/status are pinned in
[PR #30 resolution record](https://github.com/abuhmaid28/egyhealth360/pull/30#issuecomment-6254195992).
The final cleanup-patch commit/run pair is pinned in the separate record below,
avoiding a self-referencing commit hash here.
Local results below are actual executions of the fixes on this branch, not copied
results from the reviewed Windows implementation. Independent exact-head re-review
is still required; this document does not approve merge.

## Final cleanup P2 correction — review 5572638325

The final patch is limited to the cleanup failure boundary identified in
[review 5572638325](https://github.com/abuhmaid28/egyhealth360/pull/30#pullrequestreview-5572638325)
at `c8bfb63938b175fccf49c4bbbf3c14b9ecb7133e`. R1–R4 remain resolved.
Sequential best-effort cleanup contains both synchronous zeroization failures and
asynchronous close/disconnect/end rejections, attempts every later action, emits
only `APPLICABILITY_RUNTIME_CLEANUP_FAILED`, and retains exit code 1. Logout
continues to emit its separate fixed `APPLICABILITY_RUNTIME_LOGOUT_FAILED`.

`tests/observed-applicability-cleanup.test.mjs` executes the actual entry-script
source in isolated subprocess VM modules with synthetic imports. Seven behavioral
cases cover successful cleanup, applicability close rejection, Prisma disconnect
rejection, multiple failures, combined operational/cleanup failure, synchronous
password zeroization failure and logout failure. Assertions check the complete
ordered callback list, exact fixed diagnostics, no canary/stack in stdout, stderr
or module rejection, and the real subprocess exit status. Before the patch, five
failure cases reproduced the defect; after the patch all seven pass. No production
fault-injection API was added.

Local validation uses Node 24.21.0 and pnpm 10.34.6, disposable PostgreSQL
18.6-bookworm and the existing Compose configuration. Docker build uses a
session-only CA secret override outside the repository. No dependency, schema,
migration, OpenAPI or clinical contract change is part of this patch.

Actual local results for this final patch (all exited normally):

| Executed check | Observed result |
|---|---|
| `pnpm install --frozen-lockfile` with pinned pnpm | PASS |
| `node --test tests/observed-applicability-cleanup.test.mjs` | 7 passed; 0 failed/cancelled/skipped |
| `pnpm lint` | PASS |
| `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm build` / `pnpm typecheck` | PASS |
| `node --test tests/*.test.mjs` | 63 passed; 0 failed/cancelled/skipped |
| `pnpm test:migrations` | PASS; fresh/chained populated upgrades/redeploy |
| `pnpm test:integration` | 289 passed; 0 failed/cancelled/skipped; 473295 ms |
| `node scripts/measure-auth.mjs` | PASS |
| Production and full `pnpm audit --audit-level high` | No known vulnerabilities found |
| Compose config / build / healthy startup | PASS |
| Container auth tests / auth measurement | 7 tests passed / PASS |
| Container auth / authorization / M1 and EH-015 / clinical runtime probes | PASS |
| Web and API HTTP smoke | PASS |
| Disposable Compose `down --volumes` | PASS |

The [final P2 evidence record](https://github.com/abuhmaid28/egyhealth360/pull/30#issuecomment-6270290219)
pins the pushed final head and its exact-head CI result after verification. This
patch requires independent re-review; it does not approve merge. All eight
migration hashes and OpenAPI were recomputed unchanged. Fault-injection tests use
synthetic dependencies, while the existing actual runtime was also exercised in
Docker; no universal guarantee about arbitrary startup failures is claimed.

## Earlier R1–R4 fix validation

Linux managed workspace; Node **24.21.0**, pnpm **10.34.6**, PostgreSQL
**18.6-bookworm**. Docker API/runtime also reports Node 24.21.0. Installed workspace
dependencies with `pnpm install --frozen-lockfile`; no dependency/lockfile change.
Disposable PostgreSQL and existing Docker Compose configuration were used.

| Executed command | Observed result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm build` | PASS, including generate and workspace builds |
| `pnpm typecheck` | PASS |
| `node --test tests/*.test.mjs` | **56 passed**, 0 failed/cancelled/skipped |
| `node --test tests/observed-applicability.test.mjs tests/observed-applicability-boundary.test.mjs` | **17 passed**, 0 failed/cancelled/skipped |
| `node --test tests/integration/observed-applicability*.test.mjs` | Initial targeted run: **34 passed**; two subsequently added receipt/atomic-fixture cases each passed a filtered run and are included in the complete suite below |
| `pnpm test:migrations` | PASS: fresh eight-migration deploy/status/redeploy, historical chained upgrades, populated EH-013→EH-015 preservation and genuine M1 verification |
| `pnpm test:integration` | **289 passed**, 0 failed/cancelled/skipped; normal exit, 608748 ms |
| `node scripts/measure-auth.mjs` | PASS |
| `pnpm audit --prod --audit-level high` | No known vulnerabilities found |
| `pnpm audit --audit-level high` | No known vulnerabilities found |
| `docker compose config --quiet` | PASS |
| `docker compose -f compose.yaml -f compose.local.yaml -f /tmp/eh015-compose-proxy.json build` | PASS; session-only CA secret override, no repository infrastructure change |
| `docker compose -f compose.yaml -f compose.local.yaml -f /tmp/eh015-compose-proxy.json up -d --wait --wait-timeout 120` | PASS; postgres/API/web/worker healthy |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node --test tests/auth.test.mjs tests/authorization.test.mjs` | **7 passed**, 0 failed/cancelled/skipped |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node scripts/measure-auth.mjs` | PASS |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node scripts/verify-auth-runtime.mjs` | Running API login/me/CSRF logout/invalidation/health verified |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node scripts/verify-authorization-runtime.mjs` | Ownership/assignment/Admin/HEAD/no-store/ended denial verified |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node scripts/verify-m1-runtime.mjs` | M1 plus CarePlan/BP/follow-up/**EH-015 applicability runtime PASS** |
| `docker compose -f compose.yaml -f compose.local.yaml exec -T api node scripts/verify-clinical-runtime.mjs` | Approved bootstrap/inspect/zero-write repeat PASS |
| `curl --fail --silent http://localhost:3000` | PASS |
| `curl --fail --silent http://localhost:3001/api/v1/health` | PASS |

No test was killed and counted as passing. The bounded lock-failure test observes
an actual lock wait, waits for the configured database timeout, verifies rollback,
and then successfully applies the fixture after release. The final CI record
reports the independent clean-checkout validation at the pushed head.

## Findings and behavioral evidence

- **R1:** the read wrapper validates once and copies canonical patientId and
  effectiveAt before its first await. Real PostgreSQL transport instrumentation
  pauses authorization, mutates the caller object to Patient B/T2, and observes
  the evidence query still using Patient A/T1 for both Patient and Clinician.
- **R2:** loading and custom injection use the same exact manifest/snapshot/
  retraction validator. Actual validator→mapper→writer→DB tests vary inaccessible
  complete/cohort/outcome/corruption canaries, trap hidden fallback/SQL access and
  compare all input-owned stored fields. Visible diabetes NULL, UNKNOWN and ABSENT
  remain distinct; age/pregnancy/HTN/CVD/CKD missingness is retained. Extra hidden
  keys at every manifest level are rejected before writes. These replace the old
  unused-local-variable test; no hidden truth argument or ingestion system exists.
- **R3:** transaction-local real snapshot/retraction helpers are raced with exact
  blocker PID observation, commit/rollback and changed payloads. Tests cover both
  authorization lock orders, final expiry, exact T±1ms/offset retrieval, one
  evidence statement/coherent retraction history, SQL finite/year/sub-ms/chronology,
  receipt spoofing, independent real-patient/source composite FK rejection, TEMP
  shadows, Prisma/SQL immutability and atomic late-failure rollback. The actual
  fixture path also rolls back its snapshots and first withdrawal on a later
  withdrawal conflict. All coordination and transactions are bounded and drained.
- **Upgrade sentinels:** real appointment, encounter and encounter→BP association
  rows/IDs are populated before upgrades; these and coverage plus all prior rows
  and migration ledger records survive upgrade and repeated deploy unchanged.
- **R4:** both runtime fixture applications use the same explicit READ COMMITTED
  wrapper, maxWait=5000/timeout=30000, and transaction-local 5s lock/10s statement
  limits. The actual apply path fails boundedly under a held duplicate lock,
  leaves zero partial snapshots/retractions, and succeeds after lock cleanup.
- **P2:** explicit SQL PK names match Prisma; catalog assertions verify them.
  Operational, logout and cleanup failures print only fixed sanitized summaries. ADR re-review reference,
  full chronology, current-ledger/point semantics and PR #30 review trace are fixed.
  Product/API/web/worker/startup import guards follow transitive relative/workspace
  imports without adding a general module analyzer or dependencies.

## Migration and OpenAPI hashes

Only the unmerged EH-015 migration changed, to name its two PKs explicitly.
All seven historical migration files remain byte-identical to reviewed main.

| Slice | SHA-256 |
|---|---|
| EH-005 | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| EH-006 | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| EH-009 | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| EH-010 | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |
| EH-011 | `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21` |
| EH-012 | `7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01` |
| EH-013 | `f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b` |
| EH-015 / `20261020000000_eh015_observed_clinical_applicability` | `49b5afca8d394e7f501a111409eb39dcba65166f8ef22f39a954028de8f9ea69` |

OpenAPI remains byte-identical:
`37a52027d416859f0c676fce86e8d7b347eae16a5d11398748e5ab17cdfcd83d`.
Zero HTTP routes and product write permissions were added.

## Remaining gates

B1 persistence is implemented in PR #30, pending independent re-review and merge.
B2/B3/B4 remain OPEN; EH-014 remains BLOCKED; CareAction DEFERRED;
FR-021 INCOMPLETE; FR-024 FOUNDATION-ONLY / INCOMPLETE; AC-004/AC-005 UNSATISFIED;
M2 IN PROGRESS; M3 NOT STARTED. Issues #28/#29 remain open. No merge or milestone
completion is claimed by the implementation fixes or these validation results.
