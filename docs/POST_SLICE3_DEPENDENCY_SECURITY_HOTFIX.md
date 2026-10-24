# Post-Slice-3 Dependency Security Hotfix

## Authority, baseline and status

[Issue #39 authorization 6378425591](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6378425591) permits dependency manifests/lockfile and minimal evidence only. Full Issue #39 body/thread reviewed, including earlier authorization 6378233195; no newer revocation or competing open PR was present. Starting main is exactly `c25969421459a2151b39ff8072165628b3053caa` (PR #42 MERGED). [Exact-main Bootstrap 40039896473](https://github.com/abuhmaid28/egyhealth360/actions/runs/40039896473) failed solely at production HIGH audit; actual steps and decoded logs confirm frozen install/generate/lint/Prisma/build/typecheck, 76 units, migrations, 466 integrations and auth measurement passed first. Later gates were skipped, not successful.

Product V3 APPROVED; V3-G0/M0–M2/I1 Slice 1/2 COMPLETE. **Slice 3 MERGED, awaiting successful exact-main security restoration; not COMPLETE. Dependency remediation prepared locally; delivery BLOCKED by the acceptance finding below. No PR submitted. Slice 4+ NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.** Historical Slice 3 reports retain their submission-era wording; this section and PROJECT govern the current gate. Issue #39 stays open.

## Additional acceptance blocker — existing malformed-JSON reflection

The extra no-request-body-leak probe **FAILS**, both on an independently installed/built detached checkout of untouched main and on this patch. With required Origin/X-EH-Login headers and application/json, POST `/api/v1/auth/login` with invalid JSON `EHSECRET` returns 400 containing:

```json
{"message":"Unexpected token 'E', \"EHSECRET\" is not valid JSON","error":"Bad Request","statusCode":400}
```

Reproduction against either built checkout: start the configured API and send `POST /api/v1/auth/login`, exact configured `Origin`, `X-EH-Login: 1`, `Content-Type: application/json`, and literal body `EHSECRET`. Expected safe generic 400; observed 400 reflecting the marker.

For a locally running API with the documented development Origin, the complete synthetic request is:

```sh
curl -i -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Origin: http://localhost:3000' \
  -H 'X-EH-Login: 1' \
  -H 'Content-Type: application/json' \
  --data-binary 'EHSECRET'
```

The marker is synthetic. No real password/token was used or recorded. Standard malformed-object/size/media regressions and the ordinary repository suites do not cover this input class; their PASS does not mean this extra check passed.

The unchanged global error filter in [app.ts](../apps/api/src/app.ts) treats any HttpException body containing an `error` property as already safe. Nest's translated parser BadRequest body has an `error` string and a message containing the malformed input; it therefore bypasses the intended generic error mapping. The body-parser patch does not cause or repair this application-level behavior. No server-log disclosure was observed; the demonstrated disclosure is in the HTTP error response.

A correction requires changing runtime error serialization and adding a focused regression test. The proposed additional scope is limited to distinguishing existing structured project error envelopes from framework parser errors, mapping parser failures to the existing generic 400 envelope, and proving that malformed primitive input is never reflected. Preserve all current successful API behavior and authenticated security checks; no new route or product behavior. This is a recommendation only, not an implemented change. Current authorization explicitly permits **“update only the dependency manifests/lockfile and minimal documentation/evidence”**; the task also prohibits API/product behavior changes. No such runtime change is made here. **The extra no-body-leak requirement is unresolved and needs explicit scope authorization before this task can claim full acceptance.** Do not suppress the failing check or describe every security check as successful. Green standard CI cannot substitute for resolving this finding. The dependency remediation itself remains reviewable and removes both HIGH advisories.

## Investigation before remediation

Pinned tools: Node 24.21.0, pnpm 10.34.6. Current manifests, workspace/.npmrc/lock, CI, installed tree, registry package metadata and complete current audit were inspected before selecting the fix.

| Package | Actual before | Required patch | Actual parent/range |
|---|---|---|---|
| body-parser | 2.3.0 | >=2.4.0 | API → @nestjs/platform-express 11.2.7 → express 5.2.1 → body-parser ^2.2.1 |
| multer | 2.4.0 | >=2.5.0 | API → @nestjs/platform-express 11.2.7 → multer **exactly 2.4.0** |

`pnpm -r why body-parser multer --json` and recursive Infinity-depth lists show one resolved version/copy of each, originating only in API production dependencies. Nest core's peer/optional references repeat paths to the same platform package; they are not extra vulnerable copies. Development-only importers add no separate versions. Production and full audits both initially fail with **2 HIGH / 2 MODERATE / 2 LOW / 0 CRITICAL**.

- [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828): body-parser compressed trailing-byte denial of service, >=2.0.0 <2.4.0.
- [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m): multer asynchronous fileFilter/request-teardown denial of service, >=2.0.0 <2.5.0.

## Minimal remediation and exact resulting graph

1. Ordinary in-range transitive refresh: `pnpm -r update body-parser --depth Infinity --lockfile-only --ignore-scripts` selects 2.4.0 through Express's existing ^2.2.1 range. No body-parser override or new direct dependency.
2. In the repository's existing pnpm-workspace.yaml overrides section, add only **`'@nestjs/platform-express@11.2.7>multer': 2.5.0`**. Nest's exact 2.4.0 constraint prevents an ordinary in-range update. The scoped same-major patch retains the multer factory/options API and works on Node >=10.16; body-parser 2.4 requires Node >=18. Both are MIT and compatible with pinned Node 24.21. No wildcard forcing or advisory suppression.
3. Normal lockfile generation/install, then frozen install. Body-parser 2.4.0 requires qs ^6.16.1: its new qs 6.16.1 child is the only additional package version. Express retains its existing qs 6.16.0. Other child versions remain unchanged.

```text
@egyhealth/api
└─ @nestjs/platform-express 11.2.7
   ├─ express 5.2.1
   │  └─ body-parser 2.4.0
   │     └─ qs 6.16.1
   └─ multer 2.5.0  [exact-parent override]
```

All package.json files unchanged. Nest common/core/platform remain aligned at 11.2.7; Express 5.2.1, Node 24.21.0, pnpm 10.34.6, React/Next/Prisma/TypeScript remain unchanged. Nest 11.2.8 was inspected and still pins vulnerable multer 2.4.0; latest Nest 12.2.0 is a prohibited/unnecessary major. Therefore a framework upgrade would not be the minimum safe route. Remove/review the exact-parent override when an independently authorized upstream Nest version natively requires a patched multer; future unrelated consumers remain subject to the unchanged audit gate.

Lockfile delta is only the override, body-parser/multer versions and integrity records, corresponding snapshot edges, and addition of qs 6.16.1. Old vulnerable package/snapshot resolutions are removed. Existing deepmerge-ts/mysql2 security overrides and all importers remain unchanged. Installed Node resolution, recursive production/full trees and audit independently confirm body-parser 2.4.0 / multer 2.5.0, without a remaining vulnerable copy.

## Audit outcomes and remaining lower advisories

Production HIGH and full HIGH commands both return **exit 0**, with **0 HIGH / 0 CRITICAL / 2 MODERATE / 2 LOW**. This is not zero total vulnerabilities. No audit ignore, allowlist, bypass, severity change or CI modification.

The four retained findings concern fast-uri **3.1.8**, through `packages/db → prisma → @prisma/dev → @prisma/streams-local → ajv → fast-uri`; patched version >=3.1.9:

| Severity | Advisory |
|---|---|
| MODERATE | GHSA-w74x-v6f9-j3xg |
| MODERATE | GHSA-wjr9-j795-jxcr |
| LOW | GHSA-xhq7-xmqj-769h |
| LOW | GHSA-333x-w4r6-6crp |

They remain visible and are not waived or suppressed. Unrelated Prisma/URI-tree updates are not bundled into the minimum HIGH-gate restoration.

## Request parsing and multipart surface

A temporary diagnostic uses real PostgreSQL fixtures and the actual configured Nest createApp factory, all live API stores, existing native password codec, and real HTTP. **22 ordinary cases are identical before/after**, comparing statuses, success response-key shapes and complete error envelopes while excluding nondeterministic session credentials from output:

| Surface | Before and after |
|---|---|
| Patient/clinician valid JSON login | 200 |
| Login malformed object / oversized JSON / unsupported media | 400 / 413 / 415 |
| Login valid gzip JSON / oversized inflated gzip | 200 / 413, preserving existing global JSON parser inflate behavior |
| Registration valid / malformed / oversized / unsupported media / gzip | 202 / 400 / 413 / 415 / 415 |
| BP valid / malformed / oversized / unsupported media / gzip | 201 / 400 / 413 / 415 / 415 |
| Follow-up valid / malformed / oversized / unsupported media / gzip | 201 / 400 / 413 / 415 / 415 |

No compressed-body product feature is added: login already uses the configured global JSON inflater; registration/BP/follow-up retain their explicit identity-only encoding boundary. Ordinary malformed-object errors in this matrix contain no submitted marker, stack, SQL or hash. **The additional malformed-primitive privacy edge above fails and is reported separately.** No claim of complete sanitization is made.

Source/OpenAPI inspection finds no multipart/upload controller, interceptor or endpoint. Multer is transitive framework surface only; it is still remediated because it is in production. No upload capability is introduced. Application/API/OpenAPI and parser/security configuration remain byte-unchanged.

## Validation evidence

The host validation already in progress completed successfully before stopping at the runtime-scope blocker. These are new executions on the dependency patch, not copied baseline counts:

| Command/check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm generate` | PASS |
| `pnpm lint` (including final documentation state) | PASS |
| `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |
| `node --test tests/*.test.mjs` | 76 PASS; 0 failed/skipped |
| PostgreSQL Compose startup | PASS |
| `pnpm test:migrations` | PASS: 12 historical migrations, fresh install, populated upgrades, repeat deploy/status, historical ledger/fixture preservation |
| `pnpm test:integration` | 466 PASS; 0 failed/skipped; 845.11 seconds, including real PostgreSQL duplicate/revocation/membership/profile races |
| `node scripts/measure-auth.mjs` | PASS; real native Argon2 and four concurrent HTTP logins |
| `pnpm audit --prod --audit-level high` | PASS, exit 0; 2 MODERATE + 2 LOW, no HIGH/CRITICAL |
| `pnpm audit --audit-level high` | PASS, exit 0; same remaining findings |
| Extra before/after live HTTP parser matrix | 22 ordinary cases identical; PASS |
| Extra malformed-primitive response-privacy check | **FAIL on untouched main and patch**, as detailed above |
| `git diff --check` | PASS |
| Relative documentation links/anchors | 268 checked; 0 errors |
| Lockfile structural comparison | All importers unchanged; only body-parser/multer replacements, qs 6.16.1 addition, two parent snapshot edges and the exact scoped override change |
| Protected source/schema/migrations/OpenAPI/tests/scripts/workflow/package.json comparison | Byte-unchanged against starting main |
| Docker config/build/full startup, container tests/measurement, seven container runtime proofs, web/API smoke | **NOT RUN**: stopped before these gates because the extra privacy requirement needs unauthorized runtime changes |
| Cleanup | PASS: task PostgreSQL container, disposable volume and network removed; temporary detached baseline worktree removed |
| Push / PR / remote exact-head CI | **NOT PERFORMED**: scope blocker; no remote success claimed |

Host auth measurements: dummy startup 163.34 ms; hash/verify medians 149.38/146.42 ms; four concurrent HTTP logins batch 487.89 ms; health during those logins 302.70 ms; peak RSS 466.15 MiB. The failed baseline CI reported startup 203.86 ms, hash/verify medians 126.16/126.77 ms, batch 579.22 ms, health 445.72 ms, RSS 441.96 MiB. These are different machines, not a controlled performance comparison; no identical-timing or production-performance claim. No obvious order-of-magnitude regression in this measured host proof. Container startup/performance remains unverified.

Evidence logs are retained in `/tmp/eh-security-logs/` in this execution workspace. The six-file local change inventory is `pnpm-workspace.yaml`, `pnpm-lock.yaml`, this evidence document, `AGENTS.md`, `README.md` and `docs/PROJECT.md`. Status notices distinguish merged Slice 3 from its incomplete security-restoration gate. Dependency commit: `5d37cc8`; separate local evidence commit records the blocked state. Work remains local, not a submitted or accepted implementation. No existing test was weakened or changed. The additional privacy blocker remains distinct from standard-suite results.

## Scope and next gate

Only dependency configuration/lockfile and hotfix status/evidence documentation change. No application/source/API/OpenAPI/test/schema/migration/fixture/workflow/product-rule change. No Slice 4+, EACCE or design work. Historical migration checksums and M0–M2/Slice 2/3 contracts remain intact.

Do not merge automatically. Independent review, successful exact-head CI and explicit Product Owner approval remain required for the dependency patch. The outstanding no-body-leak acceptance requirement additionally needs narrowly scoped runtime-sanitization authorization; a green dependency-hotfix PR does not resolve it. Slice 3 is not fully COMPLETE until an approved hotfix merges and exact-main post-merge verification succeeds. Slice 4 stays unauthorized.
