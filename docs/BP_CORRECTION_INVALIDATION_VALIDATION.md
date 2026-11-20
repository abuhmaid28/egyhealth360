# Issue #31 implementation validation

## Baseline and authority

Repository `abuhmaid28/egyhealth360`; branch `feature/bp-correction-invalidation` starts at exact `4733d1c27e70672ed6a4f52a793e53b320290b03`. Fresh fetch, main/origin equality and completely clean tracked/untracked state were checked before implementation. PR #30 remains merged; Issue #31 and EH-014 #28 remain open. A subsequent fetch before handoff also retained that exact baseline. The [final implementation approval](https://github.com/abuhmaid28/egyhealth360/issues/31#issuecomment-6305526971), complete A–V review, D1/D2 and F1 discussion govern this slice. No new EH number was assigned.

This is implementation evidence, not merge approval or prerequisite completion. The pushed commit SHA, PR and exact-head CI link are recorded in the PR and Issue #31 handoff to avoid a self-referential commit hash in this file. Independent review, merge and post-merge validation remain required.

## Implemented surface

`packages/db/src/bp-amendments.ts` supplies principal-checked exclusion, full-pair correction, required bare-exclusion restatement, explicit wrong-patient privacy, minimized history and effective retrieval. Existing BP history, encounter association reads/retries and normalized BP/pair queries apply current disclosure/evidence filters. `followup-common.ts` retains existing authority/lock checks and permits the new fixed domain errors through its private transaction boundary. No public amendment endpoint or unscoped client export.

One additive migration, `20261021000000_bp_correction_invalidation`, creates three immutable tables with scoped operation uniqueness, terminal exclusion/privacy uniqueness, exclusive fresh replacement ownership, composite same-patient RESTRICT references, typed shape/reason/time checks, indexes and trusted invoker guards. Fresh and populated-upgrade proofs preserve existing rows and all eight old migration checksums; no clinical backfill.

- New migration SHA-256: `00fb72bcd773f1927e520cfe9db37ade2f78f546ab8ea330a66c633f1b6fc91f`.
- OpenAPI SHA-256: `c4577d43f7c2d43b9ff2c0d4ef1516e2cd5a48d59176ae869ae34c26cdca9ae0`. Only descriptions change for existing history/association behavior; response schemas/routes stay intact. The former EH-015 OpenAPI checksum remains historical evidence in its validation document.
- Package manifests and lockfile unchanged; no new dependency. Node `24.21.0`, pnpm `10.34.6`, PostgreSQL `18.6`.

## Synthetic acceptance evidence

| Case | Concrete assertion |
|---|---|
| Original/correction | Original `128/82 mmHg`, measured `2024-02-29T00:00:00.000Z`, remains byte-for-byte unchanged; fresh `149/89` has a new UUID and the current clinician's CLINICIAN_ENTRY provenance |
| Component/time change | Complete pair is required even for a single erroneous component; later `138/89` measured `2024-03-01T09:00:00.000Z` is distinct evidence, without rewriting older event/receipt times |
| Independent readings | Identical/newer submissions coexist until exact identity is explicitly excluded; no medical plausibility or threshold inference |
| Restatement | Bare excluded A may own one fresh linked B; retries reuse B; another direct restatement conflicts; B can itself be corrected without resurrecting A |
| F1 already excluded | DATA_ENTRY_ERROR exclusion remains identical after independent privacy; no second exclusion or duplicate exclusion audit |
| Explicit target sets | In A→B→C, frozen {A,B} masks exactly A/B; B-only does not infer A/C; later successor unaffected; CORRECT and required RESTATE edges both support explicit predecessor validation |
| Canonical retry | Same actor across sessions, equivalent UTC offsets, uppercase UUID and reordered predecessor set reuse IDs/time without new audits; changed target/patient/payload conflicts after current authorization |
| Privacy reads | Actual Patient and assigned-Clinician HTTP GET/HEAD, counts/pages, BP history, encounter references, effective/normalized BP and encounter pairs mask restricted evidence; raw BP/link persistence remains |
| Authorization | Patient/Admin/unassigned/cross-patient denial; revoked session retry denial; real session/user/assignment/profile races in both orders and final expiry rollback |
| Atomic faults | BP creation/exclusion/privacy/restatement audits and late multi-target privacy failure roll all new clinical/link/audit records back |
| Concurrency | Actual PostgreSQL blocking, distinct clinician sessions, correction/correction, correction/exclusion, exclusion/exclusion, privacy/privacy, already-excluded privacy, privacy/correction in both orders, exact retry, opposing duplicate adjudications and winner rollback |
| Waiting association retry | Privacy writer holds BP lock; another clinician's exact existing-link retry waits, then rechecks disclosure and denies without acknowledging a hidden BP |
| Persistence defenses | Ordinary SQL and generated Prisma cannot UPDATE/DELETE/TRUNCATE source/amendment history; old replacement reuse, incomplete operation, wrong patient, invalid reasons and TEMP shadows fail closed; uniqueness remains in database |
| Corruption defense | Fixture-only owner removal of privacy/exclusion children, including privacy after DATA_ENTRY_ERROR, cannot restore disclosure/effectiveness; retained explicit operation targets are honored without graph propagation; incomplete amendment history and retry acknowledgements fail unavailable |
| D1 compatibility | A separately captured synthetic input object retains exact prior IDs/values after exclusion/privacy while a fresh effective query changes; this test adds no production B2 snapshot model or arbitrary wall-clock replay guarantee |

The tests use only synthetic fixtures. Race coordination checks actual `pg_blocking_pids` under bounded gates. The only deliberate wall-clock delay tests session expiry. No mocked selector, CareAction or hidden research truth is used as clinical input.

## Executed quality gates

Results for the final implementation are completed before commit and published in the issue/PR evidence.

| Command/check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; package/lock files unchanged |
| `pnpm --filter @egyhealth/db validate`, `pnpm generate` | PASS |
| `pnpm build`, `pnpm typecheck`, `pnpm lint` | PASS |
| `node --test tests/*.test.mjs` | 65 passed, zero failed/cancelled/skipped |
| `pnpm test:migrations` | PASS: fresh nine-migration deploy; all chained populated upgrades; exact-baseline populated eight-to-nine upgrade; repeat deploy/status; original rows/ledger retained; new tables empty |
| Production and full dependency audits at high severity | No known vulnerabilities found |
| `node scripts/measure-auth.mjs` | PASS on pinned Node |
| `pnpm test:integration` | 338 passed, zero failed/cancelled/skipped; 667485 ms |
| `node --test tests/integration/bp-amendments.test.mjs` (final focused suite) | 49 passed, zero failed/cancelled/skipped; 156258 ms |
| Compose config / Docker build / healthy startup | PASS; session CA supplied as an optional build secret, no TLS checks disabled |
| Container auth/authorization tests | 7 passed, zero failed/cancelled/skipped |
| Container auth measurement and auth / authorization / M1 / EH-015 / clinical probes | PASS |
| Web / API HTTP smoke | PASS |
| Disposable Compose shutdown and volume cleanup | PASS; only this task's eh31 project removed |

Docker/runtime probes use a separate disposable migrated database so their synthetic mutations cannot affect the integration database. All eight historical migration files, dependency files, clinical-rules/closure-engine/FHIR/research packages and CI workflow remain unchanged.

Early validation exposed outdated fixed migration/catalog counts and an abandoned test gate timer. Expectations were extended for the authorized additive objects while preserving original hash/guard assertions; unused gates are now resolved on cleanup. A workspace restart interrupted jobs, an operator restart of the disposable database invalidated an earlier database test run, and concurrent Docker build storage pressure caused temporary PostgreSQL disk-space failures in another run. The legacy demo redeploy fixture was also extended to the nine-migration baseline while retaining its zero-change assertion. Those interrupted/connection-failure runs are not counted as passes; final results use a stable newly migrated disposable database. Self-review also added restatement predecessor validation, defensive frozen-operation privacy checks and a fresh privacy recheck after an association lock wait.

## Acceptance limits

See [the implementation contract](BP_CORRECTION_INVALIDATION_CONTRACT.md). D1 provides immutable truthful receipts, not arbitrary historical transaction visibility. D2/F1 supplies no forensic role/raw public route/cross-patient transfer or privacy reversal. Effective evidence is not clinical qualification. No B2 selector, B3 occurrence/retrigger, CareAction lifecycle/generation or EACCE implementation; research packages unchanged. EH-014 remains open and requires readiness re-review only after this prerequisite is independently reviewed, merged and post-merge validated. FR-021 incomplete; FR-024 foundation-only; AC-004/AC-005 unsatisfied; M2 **IN PROGRESS**.
