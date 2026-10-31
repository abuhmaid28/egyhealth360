# V3-I2 Slice 7 — Validation record

Scope/base/authority/findings and **I2 exit BLOCKED** are in the [exit review](V3_I2_SLICE7_EXIT_REVIEW.md). Baseline Bootstrap 41146078616 SUCCESS is base evidence only. Final PR body records the observed final head/run/job/event/attempt/conclusion and complete counts after CI; do not infer candidate success from the base run.

## Local environment and commands

Pinned Node 24.21.0 and pnpm 10.34.6 installed in a task-local tool directory; frozen install with no dependency/lockfile changes. PostgreSQL 18.6 runs in Docker on a disposable local database. The 8 GB executor uses Docker vfs; full application-image build/runtime is assigned to the unchanged exact-head `docker-runtime` lane rather than exhausting this host's disk. No gate is skipped or weakened in CI.

Executed commands include frozen install, generate/workspace build, Prisma validate, typecheck, lint, unit tests, historical migration verification, focused documentation/security/integrity/concurrency suites, latest-schema populated repeat deploy/status, controlled browser and real browser checks, production/full HIGH audits and the composed runtime. Final outcomes are reported only when the corresponding command completes.

Initial composed real-HTTP/database-clock journey: **16 assertions PASS**. New latest-schema populated repeat proof: **48 domain tables / 19 migration rows / 108 retained domain rows**, exact full snapshot and ledger unchanged, **ZERO_WRITE**. Historical populated upgrade suites remain separate and retain every historical row/checksum assertion.

## Deliberate regression and minimum fix

`node --env-file=.env --test --test-name-pattern='independent document/intent privacy' tests/integration/v3-i2-security-exit.test.mjs` reproduced I2-S7-SEC-01 before the source fix: **1 failed, actual 409 / expected 404**. This is retained red evidence, not a passing run. The fix moves targeted/retained-result privacy checks before non-PRIVACY operation fingerprint conflicts, without changing any SQL/schema/route/authority or immutable source.

New independent PostgreSQL race cases hold a real privacy transaction after INSERT, observe the retry's blocker PID through `pg_blocking_pids`, then commit or force rollback. A committed restriction must deny changed-payload replay with DOCUMENT_NOT_FOUND; rollback must preserve DOCUMENT_CONFLICT. Exact version/operation counts remain unchanged by either rejected retry.

## Attempt accounting

- An initial broad local integration invocation was interrupted to rebuild the discovered privacy fix; it is not complete passing evidence.
- The first real-browser command did not load the local `.env` and refused to run without DATABASE_URL. It is a failed invocation, not application regression evidence; the corrected command explicitly loads the private local environment file.
- Initial lint identified missing Node/global qualifications in the new test helper; those test-only errors were corrected before final lint/CI.
- Focused counts overlap aggregate integration counts and must not be added to them.

Production and full audits keep the existing HIGH gate: local observations **0 HIGH / 0 CRITICAL**; production has 2 LOW / 3 MODERATE, full has 2 LOW / 5 MODERATE. Advisory data can change independently of the unchanged lockfile. Exact-head CI supplies its own observed audit outcome. Nothing is suppressed, updated or reclassified by this PR.

## Required exact-head acceptance evidence

All existing static-browser, postgres and docker-runtime steps remain; one combined runtime command is appended after the existing Slice 6 runtime. Fail-closed aggregate `validate` still requires success from all three lanes. Full integration includes all historical authorization/migrations/clinical/availability/booking/documentation/intent regressions and all new exit tests. Docker must also pass every accepted runtime, auth measurement/container tests, API/web smoke and unconditional cleanup. Browser proof remains real Browser→Next→Nest→PostgreSQL where the existing suite specifies it.

Final head/PR/run IDs, job outcomes, test totals, runtime manifests and cleanup are recorded in the final PR evidence after actual logs are inspected, avoiding a self-referential commit that claims CI for its own untested SHA. Unresolved consultation close remains an exit blocker even if all executable checks pass. Independent review is still required; DO NOT MERGE.
