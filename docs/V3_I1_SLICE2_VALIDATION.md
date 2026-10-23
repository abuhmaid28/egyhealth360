# V3-I1 Slice 2 — Validation and Review Handoff

Current applicability: Slice 2 is COMPLETE (PR #41 merged at `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9`; exact-main CI 40010140478 SUCCESS). Review/pending-Slice-3 wording below records the original Slice 2 submission point. [Slice 3](V3_I1_SLICE3.md) is separately authorized by comment 6374281944 and in review; Slice 4+ remain unauthorized. Historical evidence is retained.

## Baseline and authorization

Starting main: `a03c0b63a0ed44bcf39a32428002af0c92edc7e0`. PR #40 MERGED; [exact-main Bootstrap 39948145751](https://github.com/abuhmaid28/egyhealth360/actions/runs/39948145751) was independently verified as push/main, that exact SHA, completed SUCCESS. Actual job steps and logs were inspected: baseline 67 unit / 407 integration, migration/audits/Docker/runtime/smoke/cleanup PASS. These are prior remote observations, not new local counts.

[Issue #39 comment 6366843150](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6366843150) authorizes Slice 2 only. [Implementation contract](V3_I1_SLICE2.md) describes the exact physical objects, service methods, authorization and exclusions. Slice 1 merged/verified; Slice 2 submitted for independent review; I1 NOT COMPLETE, Slice 3 NOT AUTHORIZED, EACCE NOT STARTED, design FROZEN. Issue #39 remains open; no automatic merge.

## Actual local validation

Executed on 2026-10-23 UTC with Node 24.21.0, pnpm 10.34.6 and PostgreSQL 18.6. Local commands use a dedicated disposable Compose database; no retained/real-patient database is reset.

| Command/check | Observed result |
|---|---|
| pnpm install --frozen-lockfile | PASS; unchanged dependency manifests/lockfile |
| pnpm generate | PASS; generated client remains ignored |
| pnpm lint | PASS |
| pnpm --filter @egyhealth/db validate | PASS |
| pnpm build | PASS, including Next.js and all workspace packages |
| pnpm typecheck | PASS |
| node --test tests/*.test.mjs | PASS: 70/70, zero skipped |
| pnpm test:migrations | PASS: fresh twelve migrations, populated historical upgrades, ten-to-twelve upgrade, exact historical rows/ledger/checksums, enum commit boundary, zero organization/membership backfill, repeat deploy/status and M1 verification |
| Focused organization and migration/M2-overlap tests | PASS; expanded cases also included in full integration below |
| Exact latest catalog check | PASS: 3/3, including exact new indexes/columns and retained original catalog/guard checks |
| Pinned historical demo redeploy test | PASS: exact ten-entry historical ledger and original seeded-row comparisons retained |
| pnpm test:integration | PASS: 437/437, zero skipped; final full run 857228.59 ms |
| node scripts/measure-auth.mjs | PASS; actual host native Argon2id/HTTP measurement |
| pnpm audit --prod --audit-level high | PASS: No known vulnerabilities found |
| pnpm audit --audit-level high | PASS: No known vulnerabilities found |
| docker compose config --quiet | PASS |
| Docker Compose build | PASS with temporary environment proxy/CA build override; repository Dockerfile/dependencies unchanged |
| Docker Compose startup | PASS; all services healthy. Local override retained host PostgreSQL mapping for host integration tests |
| Container node --test tests/auth.test.mjs tests/authorization.test.mjs | PASS: 7/7 |
| Container measure-auth.mjs | PASS |
| Container verify-auth-runtime.mjs | PASS: login/me/CSRF logout/invalidation/health |
| Container verify-authorization-runtime.mjs | PASS: ownership/assignment/ADMIN/HEAD/no-store/ending |
| Container verify-m1-runtime.mjs | PASS: M1 seed/HTTP isolation/logout/repeat plus historical EH-010/011/012/015 runtime proofs |
| Container verify-clinical-runtime.mjs | PASS |
| Container verify-care-action-runtime.mjs | PASS: eh-m2-initial-action-proof-v1, INITIAL_ONLY, four cases; its historical milestone label remains unchanged |
| Container verify-organization-runtime.mjs | PASS: eh-v3-i1-slice2-proof-v1, ORGANIZATION_MEMBERSHIP_ONLY, four cases |
| Web/API HTTP smoke | PASS; web response and API health data.status=ok |
| Compose cleanup | PASS: task containers/network/disposable volume removed |
| git diff --check; Markdown links/anchors; scope/status inventory | PASS: 232 relative links/anchors; no whitespace errors; exact inventory and preserved-file comparisons passed |

Host measurement observed memory policy 65536 KiB / 3 passes / parallelism 1, hash median 175.80 ms / p95 206.56 ms, verify median 170.31 ms / p95 209.97 ms, four concurrent HTTP logins batch 821.05 ms, health during that batch 343.62 ms, peak RSS 454.08 MiB under 2 CPUs / 8 GiB cgroup limits. These are local observations, not a production SLA or timing-equality claim.

## Real PostgreSQL race evidence

Tests use independent transaction connections A/B, plus an independent monitor querying pg_blocking_pids. Transport instrumentation pauses only after a real lock/statement has executed; distinct blocker/waiter PIDs are asserted and emitted for held-operation cases. No production test hook or reusable authorization ticket is added. Audit deltas below refer to **organization audit events**, excluding genuine setup AUTH_LOGIN events. Each isolated organization fixture starts with one organization, one membership and two organization events.

| Race / order | Connections, blocker and winner | Final source state / organization audit outcome |
|---|---|---|
| Duplicate grant, winner commits | A (ADMIN 1) holds inserted grant; B (ADMIN 2) is actually blocked on shared target/pair scope; A commits | One ACTIVE target-pair row; B conflicts; exactly one new grant event |
| Duplicate grant, winner rolls back | Same observed A/B blocking; injected A failure rolls its transaction back; B resumes | Only B's ACTIVE target-pair row/event remains; A returns sanitized UNAVAILABLE |
| Grant before end | A holds organization/target scope while discovering existing ACTIVE grant; B end waits | A conflicts without audit; B ends original exact row; one end event, no new grant |
| End before grant | A holds terminal update; B fresh-key grant waits | Original row ENDED, new row ACTIVE with different ID; one end and one new grant event |
| Membership end before read | A end transaction holds target-user/organization/membership locks; B read waits | B denies after A commits; one retained ENDED row, one end event |
| Member read before end | A holds current user/session/organization/membership; B end waits | A may complete; B ends exact row; subsequent read denies; one end event |
| Organization suspension before read | A holds organization status update; B read waits | Organization SUSPENDED; membership retained ACTIVE; B/next read deny; one suspension event |
| Member read before suspension | A holds organization SHARE; B suspension waits | A may complete; B suspends; next read denies; membership history unchanged, one suspension event |
| Account disable before read | External A holds DISABLED user update; service B waits on user lock | After commit B/next read UNAUTHENTICATED; membership retained; no organization event |
| Member read before account disable | Service A holds current user; external B disable waits | A may complete, then next read UNAUTHENTICATED; no organization event |
| Session revoke before read | External A holds exact session revocation; B waits on session lock | B/next read UNAUTHENTICATED; source membership retained; no organization event |
| Member read before session revoke | Service A holds exact session; external B revoke waits | A may complete, next read UNAUTHENTICATED; no organization event |
| Target disable before grant | External A holds target-user disable; ADMIN B grant waits | B denies; zero new membership/grant event |
| Grant before target disable | A holds grant and target-user lock; external B disable waits | Valid grant commits then account disabled; one preserved new grant/event; disabled account cannot use it |
| Expiry after insertion | Exact session deadline set before mutation; service A held after real INSERT while independent DB clock wait crosses deadline | Final check UNAUTHENTICATED; new membership and its audit rolled back |
| Lock timeout | External A holds organization UPDATE; B waits with real configured 5s lock timeout | B returns sanitized UNAVAILABLE within asserted bound; no retry, source/audit delta zero |
| Real deadlock | External A holds organization; B service holds user/session and waits on A; A then waits on B's user lock (both blocker directions observed) | Service B is deadlock victim, sanitized UNAVAILABLE, no retry/audit; A's temporary disable is rolled back; next authorized read succeeds |
| Organization read before M2 INITIAL generation | A organization service and B existing clinical service use separate pools, same genuine clinician; B waits on established user/session prefix | Both succeed serially; one INITIAL/action/decision, exactly two action events, membership unchanged |
| M2 INITIAL generation before organization read | A clinical generation holds its real decision insertion/clinical locks; B organization read waits on shared prefix | Both succeed serially; same exact clinical/action and organization invariants; no lock inversion |

Grant/end/admin mutations keep bounded READ COMMITTED transactions: 5s lock timeout, 10s statement timeout, 5s maxWait, 30s transaction. Audit-fault cases independently prove rollback for creation, suspension, grant and end. Direct SQL/Prisma tests prove composite role/kind binding, active uniqueness, immutable endpoints/provenance, terminal ends, chronology, removal protection and stale-ID denial. Whole-row/context copies are made before awaits. Historical M2 locks and snapshot/in-flight limitations remain unchanged.

### Observed PostgreSQL blockers from the final local run

Held-operation, M2-overlap and deadlock cases emitted these actual local PIDs; manual writer cases assert the exact blocker directly in their tests. PIDs are transient test-process identities.

| Passing case | Blocker PID | Waiter/service PID | Transaction outcome |
|---|---|---|---|
| I1S2 clinician membership operation and existing M2 INITIAL generation overlap, membership first | 10769 | 10770 | both serialized successfully |
| I1S2 clinician membership operation and existing M2 INITIAL generation overlap, clinical first | 10789 | 10788 | both serialized successfully |
| I1S2 real concurrent duplicate grant with winner commit | 10844 | 10845 | fulfilled, ORGANIZATION_CONFLICT |
| I1S2 real concurrent duplicate grant with winner rollback | 10850 | 10851 | ORGANIZATION_UNAVAILABLE, fulfilled |
| I1S2 real grant versus end with grant first preserves exact historical row | 10856 | 10857 | ORGANIZATION_CONFLICT, fulfilled |
| I1S2 real grant versus end with end first preserves exact historical row | 10862 | 10863 | fulfilled, fulfilled |
| I1S2 real membership revocation first | 10877 | 10878 | fulfilled, ORGANIZATION_NOT_FOUND |
| I1S2 real membership revocation after authorized read | 10883 | 10884 | fulfilled, fulfilled |
| I1S2 real organization revocation first | 10889 | 10890 | fulfilled, ORGANIZATION_NOT_FOUND |
| I1S2 real organization revocation after authorized read | 10895 | 10896 | fulfilled, fulfilled |
| I1S2 real user revocation after authorized read | 10907 | 10904 | fulfilled, fulfilled |
| I1S2 real session revocation after authorized read | 10919 | 10916 | fulfilled, fulfilled |
| I1S2 membership grant and target disable, grant first | 10971 | 10968 | fulfilled, fulfilled |
| I1S2 real PostgreSQL deadlock victim fails sanitized without stale retry or audit | 10982 | 10985 | service deadlock victim; external rollback |

## Compatibility, security and scope proof

- Exactly two new models, three new enum types and two appended user-role values. No Specialty, RelationshipRequest, registration, own-profile mutation, directory/publication, booking, consultation, fulfillment, timeline, notification, EACCE or UI implementation.
- No patient browsing for LAB_STAFF/PHARMACY_STAFF; real staff HTTP login/logout and patient-route denials, plus internal M0–M2 clinical denials. ADMIN still denied clinical payload. Clinic membership alone does not authorize a patient; suspending that clinic does not silently terminate an existing assignment. No assignment OR membership predicate.
- Existing auth/password/cookie/Origin/Fetch Metadata/CSRF, patient authorization/audit code, deterministic M1 fixture, clinical source/rules and all historical migrations/contracts/validation reports are byte-preserved. New role support only extends the principal union and trusted low-level provisioning; no new user-administration/signup API is claimed.
- OpenAPI changes only the existing AuthSuccess role enum. A normalized exact-byte hash test proves every other OpenAPI byte remains the accepted baseline; all 11 HTTP paths remain unchanged.
- CI adds one container organization proof step, retaining all previous steps, audit severity and thresholds. No advisory ignores/suppression, package/lockfile upgrade or repository Docker/network modification.
- D01–D36 decision-register text unchanged; all 86 historical normative requirement lines and old ADR text preserved. Status metadata identifies accepted Slice 1 and Slice 2 in review; it does not mark I1 COMPLETE or authorize Slice 3.

## Development failures and corrections

These failed attempts are not represented as passing evidence:

- Initial tool invocation found the environment's unpinned Node/pnpm; switched to the repository-pinned versions before validation. Frozen install then passed.
- Initial focused run had six fixture-cleanup failures from forced DROP DATABASE; normal drop after orderly connection closure fixed the fixture. Subsequent focused runs passed.
- Initial unit run 65/67 exposed old global ten-migration count assertions. Extended exact latest inventory to twelve while retaining historical hashes; final 70/70 includes three new unit checks.
- Initial Docker build stalled without this environment's proxy CA. Temporary build-only proxy/CA override retained TLS verification and passed; no repository dependency/network change.
- First host integration attempt was interrupted when Compose base startup removed the host PostgreSQL port. Restored the local override and restarted; the interrupted run is failed evidence.
- Restarted full integration run passed 436/437; historical demo redeploy incorrectly used the latest migration directory while asserting its pinned ten-entry ledger. Pinned that runner to the ten historical migrations without weakening its row/ledger assertions. Targeted regression passed; final full result is recorded above.

## Changed-file inventory

43 files. Runtime/schema/tests/workflow changes are limited to the bounded slice; documentation changes adopt current status and evidence.

```text
.github/workflows/ci.yml
AGENTS.md
FIRST_AGENT_PROMPT.txt
README.md
docs/API.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/DECISIONS.md
docs/DEEP_PLANNING_AUDIT_SUMMARY.md
docs/DOMAIN.md
docs/IMPLEMENTATION_ROADMAP.md
docs/PRODUCT.md
docs/PRODUCT_V3_DECISIONS.md
docs/PROJECT.md
docs/PROJECT_PLAN_6_MONTHS.md
docs/REQUIREMENTS.md
docs/SECURITY.md
docs/TESTING.md
docs/THESIS_STRUCTURE_V1.md
docs/TRACEABILITY_MATRIX_V1.md
docs/V3_I1_CONTRACT.md
docs/V3_I1_SLICE2.md
docs/V3_I1_SLICE2_VALIDATION.md
docs/openapi.json
packages/db/prisma/migrations/20261023000000_v3_i1_staff_roles/migration.sql
packages/db/prisma/migrations/20261023000100_v3_i1_organizations/migration.sql
packages/db/prisma/schema.prisma
packages/db/src/auth.ts
packages/db/src/index.ts
packages/db/src/organizations.ts
packages/db/src/persistence.ts
scripts/verify-migrations.mjs
scripts/verify-organization-runtime.mjs
tests/care-actions.test.mjs
tests/coverage-normalization.test.mjs
tests/followup.test.mjs
tests/integration/catalog.test.mjs
tests/integration/demo.test.mjs
tests/integration/organizations-migration.test.mjs
tests/integration/organizations.test.mjs
tests/observed-applicability-boundary.test.mjs
tests/organizations.test.mjs
tests/support/organizations.mjs
```

## Final gate

Local validation does not replace successful exact-head PR CI or independent review. Do not merge automatically. Slice 2 implementation is not accepted merely because the PR exists. Next gate is independent review + successful exact-head CI + Product Owner merge approval + exact-main post-merge verification. Slice 3 remains unauthorized until that gate completes.
