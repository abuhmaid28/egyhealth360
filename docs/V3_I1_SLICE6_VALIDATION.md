# V3-I1 Slice 6 — Validation evidence

[Exit/security review](V3_I1_SLICE6_EXIT_REVIEW.md), authorized by [Issue #39 comment 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). Starting/base main `9fc25a4cd2428b2aa990b39fad8208867c7c0201`; PR #45 / exact-main Bootstrap 40252309467 SUCCESS, job 121346667188; Slice 5 completion 6406188558. No authorization revocation or main drift observed. No merge authorized/performed.

## Revision and environment

Validation is running against the Slice 6 working tree; exact committed content and final CI are recorded at closeout below. Unfinished gates are not PASS. Tests operate only on disposable synthetic databases.

Pinned Node **24.21.0**, pnpm **10.34.6**, PostgreSQL **18.6**, Prisma **7.10.0**, Docker **28.4.0** / Compose **2.40.3**. Default workspace Node 24.19.0/pnpm 11.25.0 were replaced for task commands by an external `/tmp/egyhealth-slice6-tools/node_modules/.bin` PATH, with no repository dependency change. Docker uses the managed local socket. Host PostgreSQL and runtime Compose have separate task-owned projects/volumes, preventing running API writes from interfering with historical regression fixtures.

## Actual commands and results

The task sets `PATH=/tmp/egyhealth-slice6-tools/node_modules/.bin:$PATH`, synthetic-only `POSTGRES_PASSWORD`, `DATABASE_URL=postgresql://egyhealth:<local-only-password>@localhost:5432/egyhealth`, `AUTH_BROWSER_ORIGIN=http://localhost:3000`, `NEXT_TELEMETRY_DISABLED=1` as appropriate. No real credentials/patient data are used. The commands below record the actual validation sequence; read-only repository/GitHub inspection additionally fetched main, Issue #39/comments, PRs, runs/steps/decoded logs and protected-file hashes.

| Command / gate | Actual result |
| --- | --- |
| `npm install --prefix /tmp/egyhealth-slice6-tools node@24.21.0 pnpm@10.34.6` | PASS; pinned tools outside repo |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm generate` | PASS |
| `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `node --test tests/*.test.mjs` | 98 PASS; zero fail/cancel/skip |
| `docker compose -p egyhealth-slice6-host -f compose.yaml -f compose.local.yaml up -d --wait postgres` | PASS |
| `pnpm test:migrations` | PASS; fourteen fresh migrations, migrate status/redeploy and historical populated chains/M1 |
| `node --test tests/integration/v3-i1-slice6-*.test.mjs` | Focused 25 PASS before added standalone end audit-fault case; final full suite covers complete source |
| `pnpm test:integration` | RUNNING |
| `node scripts/measure-auth.mjs` | PASS; existing Argon2id policy unchanged |
| `pnpm audit --prod --audit-level high` | PASS; 0 HIGH/CRITICAL, 2 LOW / 2 MODERATE |
| `pnpm audit --audit-level high` | PASS; 0 HIGH/CRITICAL, 2 LOW / 2 MODERATE |
| `docker compose ... config --quiet` / `build` | PASS; external CA build overlay, TLS verification intact |
| `docker compose -p egyhealth-slice6-runtime up -d --wait --wait-timeout 120` | PASS; API/web/worker/PostgreSQL healthy |
| Container Prisma `migrate deploy/status` with `--config packages/db/prisma.config.ts` | PASS; fourteen migrations, final status up to date |
| Container `node --test tests/auth.test.mjs tests/authorization.test.mjs` | 7 PASS; zero fail/cancel/skip |
| Container `node scripts/measure-auth.mjs` | PASS |
| Container auth runtime | PASS |
| Container authorization runtime | PASS |
| Container M1 runtime | PASS; seed/HTTP/repeat plus retained clinical proofs |
| Container clinical runtime | PASS; bootstrap/inspect/zero-write repeat |
| Container CareAction runtime | PASS; 4 cases |
| Container organization runtime | PASS; 4 cases |
| Container Slice 3 patient-entry runtime | PASS; 8 cases |
| Container Slice 4 directory runtime | PASS; 12 cases |
| Container Slice 5 relationship runtime | PASS; 15 cases |
| Container Slice 6 combined runtime | PASS; 25 cases |
| Web/API smoke | PASS; web 200, API `{data:{status:"ok"}}` |
| Docker/volume cleanup | PENDING |

Runtime commands use `docker compose -p egyhealth-slice6-runtime exec -T api node scripts/verify-<name>-runtime.mjs` in exactly this order: auth, authorization, m1, clinical, care-action, organization, patient-entry, directory, relationship, v3-i1-exit. Slice 6 is additive after Slice 5 in Bootstrap CI. No existing test/runtime/audit/build/smoke/cleanup gate or threshold is removed, skipped or weakened; no continue-on-error.

Local build command adds `-f /tmp/slice6-build-overlay.json` to `-f compose.yaml`; this external overlay supplies the managed public CA as the repository Dockerfile's existing `proxy_ca` build secret. No CA, local environment overlay, credentials or Dockerfile change is committed. Smoke commands are `curl --fail http://localhost:3000` and `curl --fail http://localhost:3001/api/v1/health`. Cleanup uses `docker compose -p <task-project> -f compose.yaml -f compose.local.yaml down --volumes` for both projects and verifies no task container/volume remains.

Host auth measurement: hash median 183.97ms / p95 328.60ms, verify median 182.58ms, four-login batch 604.75ms, health during logins 295.71ms, peak RSS 447.08MiB. Container measurement: hash median 144.80ms / p95 152.63ms, verify median 148.68ms, four-login batch 584.73ms, health 428.46ms, peak RSS 477.91MiB. These are observations while sharing the environment with regression work, not production SLAs or constant-time claims.

## Combined proof and preserved evidence

Manifest **`eh-v3-i1-slice6-exit-proof-v1`**: 25 grouped real-HTTP assertions spanning registration/no-overwrite/explicit login/own profile/discovery/pending denial/designated acceptance/BP/all fixed role boundaries/publication-member-org independence/withdrawal/history/fresh re-establishment/stale exact commands/disable/logout/audit. It is deterministic in scenario/outcome; UUIDs/secrets remain naturally generated. It does not modify the fixed M1 implementation or run at startup.

New matrix uses genuine populated historical M1/M2 and later I1 schema: legacy assignment, fresh bilateral assignment, eight protected resource classes per actor, exact own/member/history boundaries, invalidated sessions and post-enrollment wrong-patient masking. It snapshots all **31 final domain tables plus migration ledger**, reruns actual deploy/status and asserts every row identical. Existing populated **13→14** upgrade compares all **29 prior domain tables**, preserving ACTIVE/ENDED/M1 assignments, sessions, action references, org/member/directory history and legacy specialty; new request/end-actor rows remain zero. No invented consent, membership, verified specialty or publication.

Protected comparison against starting main verified **63 file comparisons**, fourteen historical migrations, production source/M1/schema/OpenAPI/dependency files unchanged. OpenAPI remains `29929536d16f7c1abd21c21aed8dafbc97a1150f58bf9bcbc67d1e46dc02b48b` with 25 paths / 22 schemas. All ADR bodies and D01–D36 plus cross-provider interpretation are unchanged (the comparison segment from the decision-register heading through the final cross-provider/supersession prose hashes `1dd582fc118c5aa2a93481b8588f3861fb918eac57747367caeb2cff2275775d`; historical reports hash a shorter segment). Runtime scope scan found no unauthorized future implementation; public/private allowlists and migration inventories remain exact.

## PostgreSQL concurrency and audit

Nine new integration cases: eight live lock overlaps in both orderings plus standalone participant-end audit failure. The complete suite reruns actual timeout/deadlock victims, absent pair serialization, registration duplicates, disable/revoke/expiry, org/member/directory revocation, M1 seed and M2 clinical overlaps. The [exit review](V3_I1_SLICE6_EXIT_REVIEW.md#combined-concurrency-evidence-map) maps required races to executable files.

Final actual blocker/waiter records and suite totals will be filled after completion. Transport observers pause only after real SQL executes; `pg_blocking_pids` independently proves distinct backend waits. No Promise-order-only concurrency claim. Failed audit insert must roll back exact source/provenance/audit; no new successful audit on denied/no-op/replay reads.

## Failures, warnings and cleanup transparency

Early proof development exposed a test-fixture BP row/service name collision, an incorrect normalized-evidence input shape and an incorrect assertion denying Patient B their own profile. Corrected verification code; no production permissions changed, no failed test ignored. The complete focused rerun passed before full regression.

Two local orchestration attempts were unsuccessful: host auth measurement omitted DATABASE_URL; the first runtime-container auth measurement ran before migrating its separate fresh volume. Corrected the environment and explicitly deployed/status-checked all fourteen migrations before rerunning. These unsuccessful attempts are not counted as PASS and do not change repository/CI behavior.

Existing non-blocking warnings: pg adapter concurrent-query deprecation (no skipped tests); Prisma/OpenSSL informational notices; historical CareAction runtime milestone label. Existing fast-uri advisories remain unsuppressed: GHSA-w74x-v6f9-j3xg / GHSA-wjr9-j795-jxcr MODERATE, GHSA-xhq7-xmqj-769h / GHSA-333x-w4r6-6crp LOW. No HIGH/CRITICAL, new dependency or audit suppression. All claims remain synthetic prototype verification, not compliance/certification or production readiness.

## Final gate

Local execution is still in progress. V3-I1 remains INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN. Final exact-head CI and independent review must follow. No merge performed.
