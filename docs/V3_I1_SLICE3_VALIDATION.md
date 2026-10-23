# V3-I1 Slice 3 — Validation Evidence

## Scope and baseline

[Implementation contract](V3_I1_SLICE3.md), [Issue #39 authorization 6374281944](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6374281944). Verified starting main `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9`, PR #41 merged; exact-main [Bootstrap 40010140478](https://github.com/abuhmaid28/egyhealth360/actions/runs/40010140478) completed SUCCESS. Actual job steps and decoded logs were inspected, not metadata alone. Full Issue #39 thread read; no later revocation.

Slice 1/2 COMPLETE; Slice 3 implemented/in review; I1 NOT COMPLETE; Slice 4+ NOT AUTHORIZED; EACCE NOT STARTED; design FROZEN. No merge authorization is claimed.

Frozen anonymous registration header: **`X-EH-Register: 1`**, independently combined with exact Origin/Fetch Metadata checks. Registration is 202 `{ "data": { "accepted": true } }` for new/duplicate-safe valid input, never auto-login. Input bounds and local limiter details are frozen in [the implementation contract](V3_I1_SLICE3.md#frozen-registration-request-and-bounds).

## Executed local validation

Pinned Node **24.21.0**, pnpm **10.34.6**, PostgreSQL **18.6**. These are new executions for this slice, not copied historical PASS counts.

| Gate | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; manifests/lockfile unchanged |
| `pnpm generate` / `pnpm --filter @egyhealth/db validate` | PASS; no schema/model delta |
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | PASS; host build and Docker full build, DB/API rebuilt after review fixes |
| `node --test tests/*.test.mjs` | **76 PASS**, 0 fail/skip |
| `pnpm test:migrations` | PASS on fresh disposable database: twelve migrations, populated historical upgrades, repeat deploy/status, exact preserved ledger/checksums and genuine M1 verification |
| `pnpm test:integration` | **466 PASS**, 0 fail/skip, clean-database full rerun; includes **29 Slice 3 cases** plus all 437 retained tests |
| Focused Slice 3 execution | **29 PASS**, plus targeted duplicate/network, revocation and HTTP privacy reruns after review assertions |
| `node scripts/measure-auth.mjs` | PASS on pinned host; existing Argon2id parameters unchanged |
| `pnpm audit --prod --audit-level high` | PASS — No known vulnerabilities found |
| `pnpm audit --audit-level high` | PASS — No known vulnerabilities found |
| Docker/config/container/runtime/smoke/cleanup | PASS: config, full build, all four services healthy; 7 container auth/authorization tests; container auth measurement; auth, authorization, M1, clinical, CareAction, organization and Slice 3 runtime proofs; web/API smoke; task-owned containers/network/volume removed |
| `git diff --check`, relative links/anchors and scope/history inventory | PASS; D01–D36, 87 legacy normative requirement lines and 33 prior ADR sections preserved; all historical migration/clinical/M1/auth/password implementation protected |

Local Docker builds use the repository's existing build-secret support with an external, untracked proxy/CA Compose override. No Dockerfile/dependency/TLS/CI security weakening. Repeated exploratory local image builds exhausted disk during an earlier integration attempt (PostgreSQL SQLSTATE 53100 and Docker no-space error). Unused image/build cache was reclaimed, only the task-owned disposable stack/database was recreated, and the complete fresh-migration/full-integration sequence reran successfully with stable disk space. The initial full local result was recorded at submitted head `5ba33f0172c66597559905f5391170ffacb0d864`; the subsequent read-only locator compatibility adjustment reran all 76 units, all 29 focused PostgreSQL/HTTP cases, typecheck, full Docker build, container tests, all seven runtime proofs, smoke and cleanup. Latest-head complete CI is recorded separately in the PR; no earlier-head CI is substituted for it. The interrupted run is not counted as a PASS. A legacy extended-year profile test initially exposed Prisma's narrower date codec; the new own read now uses parameterized PostgreSQL ISO date text, preserves legacy context, and proves new-write DOB boundaries 0001/9999. No historical row rewrite or migration was used.

Remote exact-head CI is a separate required gate recorded in the PR/Actions evidence. This file does not predeclare queued/in-progress CI successful or authorize a merge.

Runtime manifest result: `{"manifest":"eh-v3-i1-slice3-proof-v1","scope":"V3_I1_SLICE3_PATIENT_REGISTRATION_PROFILE","result":"PASS","cases":8,"runningApi":true}`. Historical runtime manifest labels retain their original vocabulary and do not reopen M2.

## Real PostgreSQL concurrency cases

All cases use independent physical connections/transactions through existing `observeApplicabilityQueries`, bounded signals and `pg_blocking_pids`/`pg_stat_activity` waiter observation. No sleep-only synthetic race. Structured test output records actual blocker/waiter PIDs, ordering, outcomes and relevant final row/audit counts.

| Case | First transaction / blocked operation | Required observed outcome |
|---|---|---|
| Canonical duplicate, commit | First actual INSERT held uncommitted; second independent canonical INSERT waits on unique identity | Both internal calls resolve, exactly one new user/profile/anonymous success audit, first displayName retained |
| Canonical duplicate, rollback | Same real wait; first transaction forced to roll back | First sanitized unavailable, second wins with its own profile; one committed identity/profile/audit, no orphan |
| Account disable first, read/update | Direct SQL disable holds User; own operation waits | Commit disable, waiting read/update denies current authority; no profile/audit change |
| Profile operation first, account disable | Own operation holds User/current session/profile; direct disable waits | Operation commits legitimately, then disable; next read/update denies; one audit for changed update, none for read |
| Session revoke first, read/update | Direct SQL revoke holds exact Session; own operation waits | Commit revoke, waiting operation denies; no profile/audit change |
| Profile operation first, session revoke | Own operation holds exact Session; revoke waits | Operation may commit, revoke follows; next operation denies; one changed-update audit only |
| Concurrent identical profile replacement | First owns patient lock; second own operation blocks on actor User | Both resolve same profile, exactly one change audit, no second timestamp write |
| Profile versus accepted M2 clinician BP, both orders | One holds patient UPDATE or M2 SHARE; other operation waits | Both complete after release with no lock cycle, one correct BP source and one profile audit |
| Expiry during pending read/update | Own profile lock held; independent DB clock reaches exact stored expiry | Final current-session check denies, demographics/updatedAt and audit roll back. Database-clock wait proves expiry, not guessed sleep timing |
| Lock failure | Independent connection holds patient row, production 5s lock timeout fires | Sanitized unavailable, no partial state/audit, no automatic stale retry |

## Atomicity and HTTP/security coverage

Focused tests prove real User/Profile/Audit creation, canonical uniqueness and login compatibility including 1-byte/1024-byte UTF-8 password boundaries; sequential/exact/concurrent duplicate behavior; no overwrite or disabled-account reactivation; generic semantics for all existing roles; forced profile/audit failure rollback; sanitized crypto/database failure; Origin/header/Fetch Metadata/media/encoding/size/UTF-8/shape/duplicate-key/authority injection denial before hashing; hash saturation/throttling; no sessions/cookies/rotation even with an unrelated existing authenticated cookie.

Own-profile HTTP and persistence cases prove current PATIENT ownership, no target-ID contract, another patient's ID/header manipulation cannot widen scope, read-only server-derived own-profile locator with strict three-field replacement, no-op audit/timestamp silence, CSRF/Origin, HEAD/method/no-store behavior, ADMIN/clinician/staff denial, revoked/disabled/expired authority, audit-failure rollback and preserved M2 lock order. Unit clock/permit tests have deterministic time and bounded fixed-memory state.

Final compatibility review adds the authenticated own-profile locator needed to address unchanged BP paths. It is never returned by anonymous registration or accepted as update authority; response ID is server-derived and role/current-ownership checks remain unchanged. Focused and exact-head CI reruns cover this response-only adjustment.

The running-container script `scripts/verify-patient-entry-runtime.mjs` targets the already running API on port 3001, not a mock or separately started test API. Its stable manifest is `eh-v3-i1-slice3-proof-v1`, scope `V3_I1_SLICE3_PATIENT_REGISTRATION_PROFILE`, eight grouped cases. It uses fresh synthetic identities, preserves M1 fixed actors/profiles and retains genuine audit/session history until disposable-volume cleanup.

## Protected scope

No Prisma/model/migration/dependency/lockfile/frontend/clinical-logic changes. No old migration edits. Existing password/email/auth/session/assignment/clinical/M1 fixture implementations remain unchanged. Only approved root-service exports and app wiring extend them. Workflow adds exactly the Slice 3 runtime proof, with no removed gate or audit suppression.

D01–D36 normative decision text and historical M0–M2 contracts/validation evidence remain intact. Slice 2 reports receive only a current-applicability notice; their original evidence remains historical. OpenAPI adds exactly two paths/four operations/two schemas; legacy byte hashes remain pinned after stripping those appended blocks; complete current hash is independently pinned.

## Review gate

Local evidence and PR existence are not acceptance. Independent review of the exact Slice 3 PR head. Do not merge until review passes and Product Owner explicitly approves the merge. Successful exact-head CI and exact-main post-merge verification are required; Slice 4 remains separately unauthorized.

## Observed local PostgreSQL blockers

The clean 466-test run emitted these **13 actual blocking overlaps**. PIDs are disposable execution evidence, not stable fixture identities. Two further final-expiry cases and the real 5s lock-failure case separately pass. No permission was inferred from a cached result.

| Case | Blocker → waiter PID | Outcome / committed profile or registration audits |
|---|---|---|
| Duplicate / first commit | 5791 → 5792 | fulfilled, fulfilled; 1 identity / 1 profile / 1 anonymous audit |
| Duplicate / first rollback | 5798 → 5799 | PATIENT_ENTRY_UNAVAILABLE, fulfilled; 1 identity / 1 profile / 1 anonymous audit |
| user / revocation first / read | 5839 → 5844 | rejected; 0 change audits; next access denied |
| user / revocation first / update | 5846 → 5851 | rejected; 0 change audits; next access denied |
| user / operation first / read | 5866 → 5860 | fulfilled; 0 change audits; next access denied |
| user / operation first / update | 5873 → 5869 | fulfilled; 1 change audits; next access denied |
| session / revocation first / read | 5876 → 5880 | rejected; 0 change audits; next access denied |
| session / revocation first / update | 5883 → 5889 | rejected; 0 change audits; next access denied |
| session / operation first / read | 5895 → 5891 | fulfilled; 0 change audits; next access denied |
| session / operation first / update | 5902 → 5898 | fulfilled; 1 change audits; next access denied |
| Identical replacement | 5916 → 5918 | Both resolve; one changed profile / one change audit |
| M2 overlap / profile first | 5968 → 5969 | Both committed; one BP source / one profile change audit |
| M2 overlap / M2 first | 5975 → 5976 | Both committed; one BP source / one profile change audit |

## Changed-file inventory

Only the following 37 files differ from the verified baseline (source/API/tests plus targeted current documentation). No schema/migration/dependency/frontend change.

```text
.github/workflows/ci.yml
AGENTS.md
FIRST_AGENT_PROMPT.txt
README.md
apps/api/src/app.ts
apps/api/src/main.ts
apps/api/src/patient-entry.ts
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
docs/V3_I1_SLICE2.md
docs/V3_I1_SLICE2_VALIDATION.md
docs/V3_I1_SLICE3.md
docs/V3_I1_SLICE3_VALIDATION.md
docs/openapi.json
packages/db/src/index.ts
packages/db/src/patient-entry-values.ts
packages/db/src/patient-entry.ts
scripts/verify-patient-entry-runtime.mjs
tests/integration/patient-entry.test.mjs
tests/observed-applicability-boundary.test.mjs
tests/organizations.test.mjs
tests/patient-entry.test.mjs
tests/support/openapi-baseline.mjs
tests/support/patient-entry.mjs
```
