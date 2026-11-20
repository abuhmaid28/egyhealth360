# V3-I1 Slice 4 — Validation Evidence

## Authority and baseline

[Slice 4 contract](V3_I1_SLICE4.md) / [authorization 6391008285](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6391008285). Verified starting main `e1a87df5031e7be48a43d99e2b311dbe397b2e7e`; PR #43 merged, push/main exact-head Bootstrap [40116846242](https://github.com/abuhmaid28/egyhealth360/actions/runs/40116846242) COMPLETED/SUCCESS. Actual job steps/logs, Issue #39 body/all comments and open PRs were inspected before mutation. Main/authorization were re-fetched during work with no drift/revocation.

Product V3 APPROVED; G0/M0–M2/Slices 1/2/3 COMPLETE. Slice 4 IMPLEMENTED / IN REVIEW, not merged/COMPLETE. I1 NOT COMPLETE; Issue #39 remains OPEN; Slice 5/6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.

## Exact compatibility and migration proof

New migration: `20261024000000_v3_i1_directory`; four tables, no enum or old scalar-field changes. All twelve historical checksums are pinned unchanged; generated OpenAPI and schema inventory assertions are deliberately extended, not weakened to subset checks. Pre-Slice-4 OpenAPI SHA256 remains `df91fb3f7c84bd6df258972b8d695316c984fbaa426f08cae4240dc2002f2c4c`; full Slice 4 hash `cd005b69cc22f783ced7458545360adf839b7f6861d4316943dcf64a8384f371`. Exact path/schema inventories both 13→17.

`directory-migration.test.mjs` uses the real Prisma deploy/status runner from the populated historical ten-migration M1/M2 fixture, creates an INITIAL action, upgrades to exactly twelve, then creates retained active/ended organization membership plus a separate synthetic legacy clinician (not modification of M1 identities). It snapshots every old table and ledger, upgrades twelve→thirteen, asserts every old row unchanged, verifies every checksum, verifies all four new tables empty, repeats deploy/status and compares the entire ledger. No curated specialty mapping, clinician/clinic locator or publication is fabricated. Historical Slice 2 migration proof remains pinned to its exact twelve-migration contract. Existing full migration script also proves fresh install/repeat deploy/status, earlier populated upgrades and real M1 HTTP verification.

## Security, privacy and HTTP proof

Actual HTTP tests assert exact nested key allowlists, absence of internal IDs/emails/professionalIdentifier/provenance/clinical fields, identical projections for anonymous and all five roles (including invalid cookies/role headers), and no cookie/session side effect from directory reads. Internal ADMIN operations deny every non-ADMIN role and expired/revoked/disabled principals. Input tests reject unknown/hidden/symbol/getter fields and snapshot primitives before await. Public projection/current eligibility is a single database statement, without clinical queries or a patient count.

Functional tests cover multiple clinics, explicit staging/global enable, no automatic affiliation publication, exact filters/pagination, no-op/create fingerprint replay, changed operation payload conflicts, terminal withdrawal, ended-member regrant with fresh publication only, specialty-change withdrawal, safe malformed/unknown/private locator 404, query/header bounds, methods/HEAD/case/trailing path behavior and no conditional 304. Published but unassigned clinician, staff and ADMIN remain clinically denied. Directory/org/member revocation does not end an existing clinical assignment.

Raw SQL tests prove composite role/kind/provider/member consistency, unique current approvals, immutable IDs, terminal affiliation history, version/ADMIN constraints and DELETE/TRUNCATE denial. TEMP tables cannot shadow durable eligibility relations. Forced real database lookup failure returns sanitized DIRECTORY_UNAVAILABLE/503 through actual HTTP; a unit-level fault also covers all routes/HEAD. Forced audit failure rolls back source creation and publication state with no partial success. Existing parser-sanitization regression remains unchanged.

## PostgreSQL concurrency evidence

Tests intercept only transport to pause after an actual SQL lock/insert; statements still execute on PostgreSQL. Independent connections/transactions are required to produce distinct blocker/waiter PIDs, verified via `pg_blocking_pids`. No sleep-only mock race. Expiry proof waits for the pre-set database deadline; lock and deadlock proofs exercise PostgreSQL itself. Events print `I1S4_POSTGRES_RACE`, `I1S4_POSTGRES_MVCC`, `I1S4_POSTGRES_DEADLOCK`, `I1S4_POSTGRES_M2_OVERLAP`.

| Case | Required/observed outcome and durable/audit assertion |
|---|---|
| Duplicate approval, first commits | One current row / one success event; other operation conflicts |
| Duplicate approval, first rolls back | First sanitized UNAVAILABLE, waiter creates the sole current row / success event |
| Exact concurrent operation replay | Both return same row; first created=true, second=false; exactly one success event |
| Publication vs exact membership END, both orders | End-first denies creation; publish-first commits then END hides it. Terminal membership retained; no stale reactivation |
| Publication vs organization suspension, both orders | Suspend-first denies; publish-first may commit then projection disappears; history remains |
| Publication vs clinician disable, both orders | Disable-first denies; already serialized publication may commit, then next read absent |
| Publication vs clinic unpublication, both orders | Withdraw-first denies; publication-first commits then current projection absent; no publication audit for denial |
| Specialty change vs publication, both orders | Current new specialty approval only, or old approval terminally withdrawn; old specialty never remains current |
| Public read vs six uncommitted revocations | Prior committed projection before COMMIT, zero providers on next read after COMMIT. READ COMMITTED, not serializable/recall semantics |
| Session expires after actual INSERT | Final check denies; new publication/audit rolled back |
| Exact org row held >5s | Sanitized UNAVAILABLE within bounded transaction limits; no retry or audit |
| Deliberate two-connection deadlock | Service is victim, sanitized UNAVAILABLE, no publication/audit; competing transaction rolled back, a fresh authorized call succeeds |
| Directory/M2 INITIAL overlap, both orders | Actual blocking in shared user-lock prefix; both commit, exactly one INITIAL action/two clinical audit events; no lock-order regression |

Focused observed examples: final focused deadlock 2120/2128; M2 overlap directory-first 1362/1363 and clinical-first 1405/1404. Complete executed race records from the final rerun are summarized below. PIDs identify disposable test connections, not product data.

## Executed validation

Pinned Node 24.21.0 / pnpm 10.34.6 / PostgreSQL 18.6. Initial default-environment pnpm attempt refused wrong pinned tooling; corrected with pinned tools outside the repository, without a dependency change. Early development failures (Prisma redundant composite uniqueness, public SQL untyped page JSON parameters, historical inventory extension and two fixture assumptions) were repaired; focused reruns passed, including final 31-case functional/concurrency and 5-case integrity executions. No test/security assertion was removed to conceal them. The first full integration run was 509/510: the new retained affiliation FK makes PostgreSQL reject plain membership TRUNCATE with exact 0A000 before its removal trigger. The historical test now additionally asserts that exact FK protection and reaches the unchanged 23514/i1_history_removal_guard through TRUNCATE CASCADE. The focused organization rerun passed all 26 tests; the subsequent complete rerun passed 510/510 with zero failures/skips. No history guard or runtime behavior was weakened.

The following are actual new executions for Slice 4. The final full integration rerun and all local gates completed successfully before push; no remote CI success is inferred from local results.

| Gate | Executed result |
|---|---|
| Frozen install, generate, Prisma validate | PASS |
| Build/typecheck/lint | PASS; new TypeScript files reformatted without semantic change and DB/API rebuilt |
| Full unit suite | 93 PASS, zero failures/skips |
| Focused initial directory integration | 8 PASS, then extended with additional boundary/regression cases |
| Focused concurrency | 20 PASS initially, extended with exact concurrent replay |
| Focused integrity/catalog/populated upgrade | 9 PASS |
| Focused populated upgrade plus M2 overlap | 3 PASS |
| Full migration verifier | PASS; fresh/repeated/history/M1 proofs |
| Full integration suite | **510 PASS**, zero failures/skips; 39 added integration cases over the 471-test baseline. Final complete rerun duration 903.225s |
| Authentication measurement | PASS; startup dummy 150.99ms, hash median 146.98ms/p95 153.54ms, four-login batch 471.30ms, concurrent health 254.98ms. No material regression |
| Production / full HIGH audits | Both exit 0; 2 MODERATE + 2 LOW, zero HIGH/CRITICAL; no suppression. Remaining fast-uri 3.1.8 findings: GHSA-w74x-v6f9-j3xg / GHSA-wjr9-j795-jxcr (MODERATE), GHSA-xhq7-xmqj-769h / GHSA-333x-w4r6-6crp (LOW); not changed |
| Compose config / image build | PASS; build uses external ephemeral proxy/CA settings, no Dockerfile/TLS weakening |
| Docker startup / container auth | PASS; all four services healthy in separate disposable runtime project, 7/7 container tests; fresh container Prisma deploy applied all 13 migrations |
| Container auth measurement | PASS; hash median 144.84ms, four-login batch 428.08ms; no material regression observed |
| Docker runtime proofs | Auth, authorization, M1, clinical, CareAction (4), organization (4), Slice 3 (8), Slice 4 (12) all PASS |
| Web/API/directory smoke | PASS; live API after unchanged M1 fixture has zero directory providers, proving no automatic publication |
| Runtime cleanup | PASS; dedicated runtime containers/network/volume removed. Host test PostgreSQL, its volume/network also removed after final suite/measurement/audits; no task containers remain |
| Docs links/status/diff/invariants | PASS; 233 relative links/anchors across 20 changed Markdown/text files, diff whitespace check, all historical requirement IDs (100 requirements / 85 traceability IDs), historical ADR bodies, 57 protected files and 12 migration checksums preserved. D01–D36 normative/interpretation SHA256 f79fc639968c21b2351e90e369c9e97b654310f28076b667df8e41d6f2e1ea53 |

## Runtime and final review gate

Manifest `eh-v3-i1-slice4-directory-proof-v1`: twelve cases, real HTTP against an isolated synthetic API/database inside the API container, following the existing organization proof convention. It verifies published clinician/detail/specialty/clinic, unpublished absence, org suspension, account disable, exact allowlist, every role, clinical denial, cache/HEAD and terminal member regrant. Host and container execution both passed; the separate container result is recorded above. Live primary API directory is also checked alongside web/API smoke. No production seed/default privileged credential or M1 fixture edit. Docker runtime uses a separate Compose project/database to avoid sharing live proof writes with the host regression database; product image/commands are unchanged. The local VFS Docker driver briefly exhausted disk while starting containers; unused build cache was removed (5.909GB reported), retaining source, live image and both databases. Services remained healthy and proof/cleanup succeeded. The brief workspace transport disconnect also recovered with branch/files/processes intact; no work was discarded.

Only the new deterministic directory proof step is added to Bootstrap CI; existing pinned Actions, audits, tests and runtime gates remain. Remote exact-head CI evidence is recorded on the submitted PR and must correspond to its final SHA. A queued/running run is not SUCCESS. Merge is prohibited without independent review and explicit Product Owner approval; post-merge exact-main verification is still required for Slice 4 completion. Slice 5/6 remain unauthorized.

## Recorded full-rerun PostgreSQL connection evidence

These are actual records from the complete local regression rerun; outcomes/row/audit assertions are specified in the matrix above and executable tests. Writer-only rows are nonblocking MVCC read proofs, not claimed lock waits.

| Executed case | Actual connection evidence | Outcome |
|---|---|---|
| I1S4 duplicate publication overlapping connections: winner commit | blocker 10342 / waiter 10343 | committed, DIRECTORY_CONFLICT |
| I1S4 duplicate publication overlapping connections: winner rollback | blocker 10349 / waiter 10350 | DIRECTORY_UNAVAILABLE, committed |
| I1S4 publication vs membership: revocation serializes first | blocker 10355 / waiter 10356 | committed, DIRECTORY_NOT_FOUND |
| I1S4 publication vs membership: publication serializes first | blocker 10362 / waiter 10361 | committed, committed |
| I1S4 publication vs organization: revocation serializes first | blocker 10368 / waiter 10369 | committed, DIRECTORY_NOT_FOUND |
| I1S4 publication vs organization: publication serializes first | blocker 10375 / waiter 10374 | committed, committed |
| I1S4 publication vs clinic: revocation serializes first | blocker 10389 / waiter 10390 | committed, DIRECTORY_NOT_FOUND |
| I1S4 publication vs clinic: publication serializes first | blocker 10396 / waiter 10397 | committed, committed |
| I1S4 publication vs user: revocation serializes first | blocker 10399 / waiter 10403 | revocation committed / publication denied |
| I1S4 publication vs user: publication serializes first | blocker 10410 / waiter 10406 | committed, committed |
| I1S4 current public read uses committed MVCC state during membership, next read after COMMIT removes projection | writer 10413 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 current public read uses committed MVCC state during organization, next read after COMMIT removes projection | writer 10419 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 current public read uses committed MVCC state during clinic, next read after COMMIT removes projection | writer 10433 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 current public read uses committed MVCC state during user, next read after COMMIT removes projection | writer 10439 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 current public read uses committed MVCC state during provider, next read after COMMIT removes projection | writer 10445 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 current public read uses committed MVCC state during specialty, next read after COMMIT removes projection | writer 10451 / independent HTTP-store connection | before COMMIT 1, after 0 |
| I1S4 specialty change vs old affiliation publication: change first | blocker 10461 / waiter 10462 | committed, committed |
| I1S4 specialty change vs old affiliation publication: publication first | blocker 10474 / waiter 10477 | committed, committed |
| I1S4 real PostgreSQL deadlock victim is sanitized, rolled back, never retried with stale authority | blocker 10494 / service 10498 | service victim; rollback/no event; fresh call succeeds |
| I1S4 concurrent exact operation replay returns original publication identity with exactly one success audit | blocker 10513 / waiter 10514 | committed, committed |
| I1S4 directory approval overlaps existing M2 INITIAL generation, directory first | blocker 10612 / waiter 10613 | 1 INITIAL / 2 clinical events |
| I1S4 directory approval overlaps existing M2 INITIAL generation, clinical first | blocker 10633 / waiter 10632 | 1 INITIAL / 2 clinical events |

## Exact changed-file inventory

Forty-eight files comprise the Slice 4 change; no package/lockfile, frontend, old migration, M1 fixture, clinical-rule or EACCE source change. The workflow delta is one additional directory runtime proof step.

```text
.github/workflows/ci.yml
AGENTS.md
FIRST_AGENT_PROMPT.txt
README.md
apps/api/src/app.ts
apps/api/src/directory.ts
apps/api/src/main.ts
docs/API.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/DECISIONS.md
docs/DOMAIN.md
docs/IMPLEMENTATION_ROADMAP.md
docs/PRODUCT.md
docs/PRODUCT_V3_DECISIONS.md
docs/PROJECT.md
docs/PROJECT_PLAN_6_MONTHS.md
docs/REQUIREMENTS.md
docs/SECURITY.md
docs/TESTING.md
docs/TRACEABILITY_MATRIX_V1.md
docs/V3_I1_CONTRACT.md
docs/V3_I1_SLICE4.md
docs/V3_I1_SLICE4_VALIDATION.md
docs/openapi.json
packages/db/prisma/migrations/20261024000000_v3_i1_directory/migration.sql
packages/db/prisma/schema.prisma
packages/db/src/directory-values.ts
packages/db/src/directory.ts
packages/db/src/index.ts
scripts/verify-directory-runtime.mjs
scripts/verify-migrations.mjs
tests/care-actions.test.mjs
tests/coverage-normalization.test.mjs
tests/directory.test.mjs
tests/followup.test.mjs
tests/integration/catalog.test.mjs
tests/integration/directory-concurrency.test.mjs
tests/integration/directory-integrity.test.mjs
tests/integration/directory-migration.test.mjs
tests/integration/directory.test.mjs
tests/integration/organizations-migration.test.mjs
tests/integration/organizations.test.mjs
tests/organizations.test.mjs
tests/patient-entry.test.mjs
tests/support/directory.mjs
tests/support/migration-runner.mjs
tests/support/openapi-baseline.mjs
```
