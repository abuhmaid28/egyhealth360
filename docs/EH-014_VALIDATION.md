# EH-014 implementation validation

Approved starting baseline: `e83e9b3e0e6e42988cc4e4ba905d9bcc589b9adc` (remote main/origin/main/clean HEAD exact before branch creation). Branch: `feature/eh-014-initial-care-action`. Approval: Issue #28 comment 6317196946. This is bounded INITIAL implementation evidence, not merge approval or M2 completion.

## Environment and commands

Pinned Node 24.21.0 and pnpm 10.34.6 were installed in task-local `/tmp/eh014-tools` because the environment initially supplied Node 24.19.0/pnpm 11.25.0. Every validation Node/pnpm command used the pinned task-local PATH. PostgreSQL 18.6 ran in the task's disposable Compose project `eh014`. No real patient data was used. Raw execution logs are task-local `/tmp/eh014-*.log`.

Commands used the task-specific disposable DATABASE_URL and POSTGRES_PASSWORD, never production targets. Docker builds used the existing optional `proxy_ca` BuildKit secret via an untracked `/tmp` Compose override; certificate verification stayed enabled and no certificate/credential was committed.

| Command group | Observed result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; no dependency/lockfile change |
| `pnpm generate`; `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm lint`; `pnpm typecheck`; `pnpm build` | PASS on final implementation source |
| `node --test tests/*.test.mjs` | 67/67 passed, zero failed/cancelled/skipped |
| Full integration glob | `node --test --test-concurrency=1 --test-reporter=tap tests/integration/*.test.mjs`: 407/407 passed, zero failed/cancelled/skipped; includes all 69 EH-014 tests |
| Focused EH-014 | Focused command `node --test tests/integration/care-actions.test.mjs`: 69/69 passed; after preflight privacy hardening the three affected cases also passed; the final stricter original-operation-key retry case passed 1/1; all 69 are included in the complete suite |
| `pnpm test:migrations` | Final fresh 10-migration, populated historical chained upgrade through nine-to-ten and repeat deploy/status PASS; all old rows/links/ledger retained and new action tables empty |
| Historical files | All nine old SQL migrations/migration lock, pnpm lock and OpenAPI byte-identical to approved baseline |
| `pnpm audit --prod --audit-level high`; `pnpm audit --audit-level high` | Both PASS: no known vulnerabilities |
| Docker config/build | Final config validation, full image build and all four healthy services PASS |
| Runtime auth/authorization/M1/EH-015/clinical | All PASS in built container; container auth unit tests 7/7; host/container Argon2 measurement PASS |
| `pnpm m2:verify` / container synthetic proof | Host proof PASS; built-container verifier PASS (four synthetic cases); first container attempt failed, diagnostic and normal-command repeats passed, as recorded below |
| HTTP smoke / disposable cleanup | Web 200 and API health 200; disposable Compose services/network/volume removed |
| Exact-head PR CI | Not yet opened; no CI result claimed |

## Honest development history

Initial TypeScript narrowing errors were corrected before successful builds. Negative threshold tests exposed Prisma 7 adapter errors nested under `meta.driverAdapterError.cause.originalCode`; mapping now distinguishes selected-input check failures from unexpected storage failures. The rejected clinical evidence never persisted. A test-only unused coordination latch caused an asynchronous timeout after a passing assertion; all latches now resolve during cleanup, and the six affected authority/lifecycle tests passed without late activity.

A development full/focused run overlapped Docker builds, migration validation and typechecking, causing substantial CPU contention and a timeout in an existing Issue #31 race test. Those development runs were stopped and are not counted as full-suite passes. Complete database validation was rerun without the competing build workload. Two historical latest-schema test inventories initially omitted the new EH-014 objects/migration; their exact allowlists were extended, preserving every old expectation, and the new-schema catalog check passed 2/2. The complete final suite uses the same full integration glob with `--test-concurrency=1 --test-reporter=tap`; no file/case is excluded. Failed/interrupted attempts are not reported as validation success.

The first complete new-schema run reported 406/407: the new selector-assignment FK causes PostgreSQL to reject plain assignment TRUNCATE with 0A000 before the existing history trigger. The test now separately asserts that FK rejection and the unchanged 23514 assignment history guard with TRUNCATE CASCADE; the focused identity file passed 5/5. A parallel repeat produced an intermittent legacy authorization assertion that passed its direct rerun, so final complete validation uses a fresh database with sequential test-file execution, matching the repository workflow pattern. These unsuccessful/interrupted runs are not counted as a green complete suite.

Review also found that a preflight origin expansion could reveal a private correction-predecessor ID while its fresh replacement remained disclosable. Ordinary selection views now always omit correction-origin lineage; protected persistence still captures the full server-derived origin. The exact-retry comparison uses the same safe view. The three focused replay/completeness/private-predecessor cases passed after this hardening, and the complete suite includes the strengthened case.

The sequential full integration run then exposed a legacy heartbeat fixture race (406/407): a health-file write can transiently truncate the file after the second success log. The assertion now waits within its original bounded polling window for both success logs and a positive heartbeat, preserving shutdown-zero/removal checks. Production worker code is unchanged. The final complete sequential integration run passed 407/407.

The first built-container M2 verifier exited with its sanitized failure result. An immediate diagnostic repeat passed all four cases, followed by a successful repeat of the normal verifier entry point on the same image. The original failure did not yield a diagnostic cause and is not counted as a pass; this repeatability limitation remains visible for independent review and exact-head CI. No production guard was relaxed to obtain the repeat passes.

Canonical retry also requires the original operation identity. A new key for an occupied INITIAL occurrence conflicts rather than returning an unrecorded successful alias; the final focused retry test passed 1/1 after this stricter check.

## Evidence and limits

Tests cover explicit acceptance for both BP entry sources, independent threshold boundaries, exact trigger/applicability time, complete/unknown/conflicting facts, pre-plan/equality/post-start, expected point membership, protected replay and source provenance, one INITIAL, canonical retry/conflict and scoped operation keys, real blocked concurrent selection/rollback, both-order exclusion/privacy/withdrawal and authority/lifecycle races, final expiry, both audit faults, SQL/Prisma immutability, composite integrity/deferred completeness, privacy/count/page/retry suppression and damaged-linkage defenses, retirement/cancellation history, Gregorian clamp/century/leap/offset/timezone/precision/overflow and deterministic synthetic proof.

The private synthetic verifier provisions disposable state through genuine service/session boundaries and existing explicitly synthetic fixture helpers. It creates no product/research writer. Logical expectations are fixed; generated UUIDs/receipts and reached plan-start instants naturally vary. It does not claim arbitrary historical transaction visibility or clinical validation in the real world.

Independent implementation review, approved PR merge, successful post-merge CI on the exact main merge SHA, and explicit M2 exit proof/review remain outstanding. Issue #28 remains OPEN. M2 IN PROGRESS. FR-024 incomplete; AC-004/AC-005 unsatisfied. No recurrence, EACCE or design work.

New migration SHA-256: `244207da379c6db2a8132d2aabe8a138d5f9183054b519f58676848c9f80e228`.
