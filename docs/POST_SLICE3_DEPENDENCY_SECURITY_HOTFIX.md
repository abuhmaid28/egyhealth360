# Post-Slice-3 Dependency Security Hotfix

## Authority, baseline and status

[Issue #39 authorization 6378425591](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6378425591) originally permitted dependency manifests/lockfile and minimal evidence only. [Parser-sanitization extension 6381469953](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6381469953) subsequently authorizes the narrow global error-boundary correction and focused tests, without product/API expansion. Full Issue #39 body/thread reviewed, including earlier authorization 6378233195; no newer revocation or competing open PR was present. Starting main is exactly `c25969421459a2151b39ff8072165628b3053caa` (PR #42 MERGED). [Exact-main Bootstrap 40039896473](https://github.com/abuhmaid28/egyhealth360/actions/runs/40039896473) failed solely at production HIGH audit; actual steps and decoded logs confirm frozen install/generate/lint/Prisma/build/typecheck, 76 units, migrations, 466 integrations and auth measurement passed first. Later gates were skipped, not successful.

Product V3 APPROVED; V3-G0/M0–M2/I1 Slice 1/2 COMPLETE. **Slice 3 MERGED, awaiting successful exact-main security restoration; not COMPLETE. Security hotfix IMPLEMENTED / IN REVIEW: dependency and separately authorized parser sanitization pass complete local validation. Exact-head remote CI evidence belongs to the submitted PR; review/merge approval and exact-main post-merge verification remain separate gates. Slice 4+ NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.** Historical Slice 3 reports retain their submission-era wording; this section and PROJECT govern the current gate. Issue #39 stays open.

## Discovery and separately authorized correction — existing malformed-JSON reflection

Before runtime correction, the extra no-request-body-leak probe **FAILED**, both on an independently installed/built detached checkout of untouched main and on the dependency-only patch. With required Origin/X-EH-Login headers and application/json, POST `/api/v1/auth/login` with invalid JSON `EHSECRET` returns 400 containing:

```json
{"message":"Unexpected token 'E', \"EHSECRET\" is not valid JSON","error":"Bad Request","statusCode":400}
```

Historical reproduction against either pre-correction built checkout: start the configured API and send `POST /api/v1/auth/login`, exact configured `Origin`, `X-EH-Login: 1`, `Content-Type: application/json`, and literal body `EHSECRET`. Expected safe generic 400; observed 400 reflecting the marker.

For a locally running API with the documented development Origin, the complete synthetic request is:

```sh
curl -i -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Origin: http://localhost:3000' \
  -H 'X-EH-Login: 1' \
  -H 'Content-Type: application/json' \
  --data-binary 'EHSECRET'
```

The marker is synthetic. No real password/token was used or recorded. Before the new regressions, the ordinary repository suites did not cover this malformed-primitive input class; their historical PASS did not mean this extra check passed.

The original global error filter in [app.ts](../apps/api/src/app.ts) treats any HttpException body containing an `error` property as already safe. Nest's translated parser BadRequest body has an `error` string and a message containing the malformed input; it therefore bypasses the intended generic error mapping. The body-parser patch did not cause or repair this application-level behavior. No server-log disclosure was observed; the demonstrated disclosure is in the HTTP error response.

The first execution stopped, preserved dependency/evidence commits `5d37cc8e3e3c28dfd233f9fc72a98396b2c0e3d0` and `dbde8526fe84c907141624592dc0c8767b3c46a8`, and did not push or open a PR. Product Owner extension **6381469953** then explicitly authorized this runtime correction. Main remained exactly unchanged, the working tree was clean, both commits were verified intact, and no newer revocation was present on resumption. The former blocker is resolved by that authorization and the correction below; it was not waived.

The only runtime edit is a private predicate in `apps/api/src/app.ts` replacing the generic `error`-key test. A permitted envelope is an exact plain data record with only `error`; its nested plain record has required string `code` (uppercase project-code format) and nonempty string `message`, optionally the existing BP/follow-up `fields` array of plain `{field, reason}` string records. Arrays, inherited properties, accessors, extra envelope keys, non-string values, hidden serializers and malformed/sparse diagnostic arrays are rejected. The optional array must have the normal Array prototype and exactly its indexed elements plus length. This is recognition of existing server-owned helper output, not authority derived from a submitted request body. Existing helper messages and diagnostic values remain server-generated; no untrusted payload is promoted into an application error.

Nest's `{message, error: "Bad Request", statusCode}` cannot match. It falls through to the unchanged generic mappings: malformed JSON → **400 `{ "error": { "code": "REQUEST_INVALID", "message": "Invalid request." } }`**; size → 413 REQUEST_TOO_LARGE; unknown route → 404 ROUTE_NOT_FOUND. Application-owned 400/401/403/404/409/413/429/503 status/code/message and BP/follow-up diagnostic projections remain intact; unknown internal failures retain sanitized 503. Successful request, authentication, CSRF/Origin, persistence and clinical-authorization behavior is unchanged.

New `tests/error-sanitization.test.mjs` adds 11 HTTP-through-Nest tests using existing login/health routes with controlled failing dependencies, covering all listed status envelopes, field diagnostics, malicious lookalike envelopes, framework 413/404/default failures and HEAD. New `tests/integration/error-sanitization.test.mjs` adds five real-PostgreSQL HTTP tests: canary login (raw/gzip, primitive/incomplete object), guarded registration (no hashing/identity/profile/session/audit), authenticated logout through the shared global parser plus BP through its existing route boundary (no partial writes/audits/session changes), raw/inflated framework and boundary 413 plus unknown GET/HEAD 404, and real invalid-credential/Origin/object-masking/throttle preservation. No synthetic production endpoints. Login/registration retain their required Origin and dedicated headers; protected calls use genuine session/CSRF credentials. No Set-Cookie side effect is permitted for rejected parsing.

Both stdout and stderr are captured/inspected across each PostgreSQL HTTP fixture; no canary or parser diagnostic is emitted. Nest already uses `logger: false`; this is preserved, with no new logging path. HTTP responses are checked for exact sanitized envelopes and absence of canaries, diagnostics, stacks and internal details. No existing exact test or security assertion is weakened.

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
2. In the repository's existing pnpm-workspace.yaml overrides section, add only **`'@nestjs/platform-express@11.2.7>multer': 2.5.0`**. Nest's exact 2.4.0 constraint prevents an ordinary in-range update. The scoped same-major security release retains the multer factory/options API and works on Node >=10.16; body-parser 2.4 requires Node >=18. Both are MIT and compatible with pinned Node 24.21. No wildcard forcing or advisory suppression.
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

A temporary diagnostic uses real PostgreSQL fixtures and the actual configured Nest createApp factory, all live API stores, existing native password codec, and real HTTP. **At the dependency-only stage, 22 ordinary cases were identical to baseline**, comparing statuses, success response-key shapes and complete error envelopes while excluding nondeterministic session credentials from output:

| Surface | Before and after |
|---|---|
| Patient/clinician valid JSON login | 200 |
| Login malformed object / oversized JSON / unsupported media | 400 / 413 / 415 |
| Login valid gzip JSON / oversized inflated gzip | 200 / 413, preserving existing global JSON parser inflate behavior |
| Registration valid / malformed / oversized / unsupported media / gzip | 202 / 400 / 413 / 415 / 415 |
| BP valid / malformed / oversized / unsupported media / gzip | 201 / 400 / 413 / 415 / 415 |
| Follow-up valid / malformed / oversized / unsupported media / gzip | 201 / 400 / 413 / 415 / 415 |

No compressed-body product feature is added: login already uses the configured global JSON inflater; registration/BP/follow-up retain their explicit identity-only encoding boundary. Ordinary malformed-object errors in this matrix contain no submitted marker, stack, SQL or hash. **After the separately authorized correction, the additional malformed-primitive privacy edge passes.** The ordinary 22-case recheck preserves 21 cases byte-for-byte and changes only the unsafe framework malformed-login envelope to generic REQUEST_INVALID; statuses remain unchanged.

Source/OpenAPI inspection finds no multipart/upload controller, interceptor or endpoint. Multer is transitive framework surface only; it is still remediated because it is in production. No upload capability is introduced. Routes/OpenAPI and parser/security configuration remain byte-unchanged; only the global error-envelope recognition changes.

## Validation evidence

The earlier dependency-only host run passed 76 unit and 466 integration tests, but stopped before Docker/PR/CI because the runtime correction was not yet authorized. Those are historical observations, not the final corrected-head results.

All results below were executed after the authorized runtime correction, using Node 24.21.0 and pnpm 10.34.6. The final private predicate was additionally rebuilt/typechecked and all units plus focused PostgreSQL tests rerun after rejecting hidden serializers/sparse diagnostic arrays. The complete integration run used that corrected build. No pending/queued CI result is represented as success.

| Command/check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm generate` | PASS |
| `pnpm lint` | PASS, including new tests/docs |
| `pnpm --filter @egyhealth/db validate` | PASS |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS; final API predicate also rebuilt/typechecked |
| `node --test tests/*.test.mjs` | **87 PASS**, 0 failed/skipped; 76 historical + 11 new |
| PostgreSQL Compose startup | PASS |
| `pnpm test:migrations` | PASS: 12 historical migrations; fresh/populated upgrades, repeat deploy/status and historical ledger/fixture preservation |
| `pnpm test:integration` | **471 PASS**, 0 failed/skipped, 831.71 seconds; 466 historical + 5 new, including all existing real PostgreSQL races |
| Focused parser/security tests | 11 HTTP/filter tests + 5 PostgreSQL HTTP tests PASS; primitive/incomplete/gzip login, guarded registration, protected logout/BP, no writes/audit/session/cookie/log disclosure |
| Ordinary parser matrix | 22 cases retain statuses; 21 identical projections/envelopes; only unsafe malformed-login diagnostics become generic REQUEST_INVALID |
| Original additional canary edge | PASS after correction; preserved pre-correction baseline/dependency-only FAIL evidence |
| `node scripts/measure-auth.mjs` | PASS; measurements below |
| Production HIGH audit | PASS / exit 0; 0 HIGH/CRITICAL, 2 MODERATE + 2 LOW |
| Full HIGH audit | PASS / exit 0; same visible lower findings |
| Full-severity diagnostic audit | Exit 1 as expected for the four remaining lower findings; not a replacement or weakening of either HIGH gate |
| `docker compose config --quiet` | PASS |
| Docker Compose build | PASS for API/web/worker using unchanged Dockerfile; session proxy CA supplied by temporary external BuildKit-secret override, TLS verification retained |
| Full service startup | API/web/worker/PostgreSQL all healthy |
| Container actual dependency resolution | Node 24.21.0, Nest 11.2.7, Express 5.2.1, body-parser 2.4.0, multer 2.5.0, body-parser qs 6.16.1 / Express qs 6.16.0 |
| Container auth/authorization tests | **7 PASS**, 0 failed/skipped |
| Container additional filter tests | **11 PASS**, 0 failed/skipped |
| Container auth measurement | PASS; measurements below |
| `verify-auth-runtime.mjs` | PASS: login/me/CSRF/logout/invalidation/health |
| `verify-authorization-runtime.mjs` | PASS: ownership/assignment/ADMIN denial/HEAD/no-store/ended denial |
| `verify-m1-runtime.mjs` | PASS: fixed seed, HTTP isolation/logout/repeat and historical clinical checks |
| `verify-clinical-runtime.mjs` | PASS: approved bootstrap/inspection/zero-write repeat |
| `verify-care-action-runtime.mjs` | PASS: eh-m2-initial-action-proof-v1, INITIAL_ONLY, 4 cases; historical manifest milestone label preserved |
| `verify-organization-runtime.mjs` | PASS: eh-v3-i1-slice2-proof-v1, ORGANIZATION_MEMBERSHIP_ONLY, 4 cases |
| `verify-patient-entry-runtime.mjs` | PASS: eh-v3-i1-slice3-proof-v1, V3_I1_SLICE3_PATIENT_REGISTRATION_PROFILE, **8 cases**, runningApi=true |
| Additional running-container HTTP proof | PASS: 6 cases, canary login/registration 400, raw/gzip 413, unknown GET/HEAD 404; identity/profile/session/audit counts unchanged |
| Live API container logs | No canary, SyntaxError or unexpected-token diagnostic |
| Web/API smoke | PASS: web HTTP 200 and API health HTTP 200 |
| Cleanup | PASS: API/web/worker/PostgreSQL containers, disposable volume and network removed |
| `git diff --check` | PASS |
| Relative documentation links/anchors | 268 checked; 0 errors |
| Protected history/scope review | No schema/migration/OpenAPI/workflow/fixture/product-decision/package.json/frontend changes; no existing tests weakened |
| Remote CI | Must be inspected for the exact final PR head; run URL/status/SHA are maintained in the PR evidence, independently of these local results |

Performance observations (not hard thresholds):

| Observation | Host | Container |
|---|---|---|
| Dummy startup | 148.48 ms | 157.00 ms |
| Hash median | 149.73 ms | 149.69 ms |
| Verify median | 143.53 ms | 150.02 ms |
| Four concurrent HTTP-login batch | 433.24 ms | 565.20 ms |
| Health during logins | 270.37 ms | 378.09 ms |
| Peak RSS | 467.41 MiB | 449.02 MiB |

Earlier local dependency-only hash median/batch were 149.38/487.89 ms; failed-main CI measured 126.16/579.22 ms. Machines/resources and run variance differ; no identical-timing claim. No obvious material startup/auth regression in the executed checks. No performance tuning was introduced.

Evidence is retained in `/tmp/eh-security-resumed-logs/`; earlier baseline/dependency-only reproduction is in `/tmp/eh-security-logs/` in the execution workspace. Nine-file inventory: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/api/src/app.ts`, `tests/error-sanitization.test.mjs`, `tests/integration/error-sanitization.test.mjs`, this evidence document, `AGENTS.md`, `README.md` and `docs/PROJECT.md`. Existing dependency commits are preserved; one additional focused correction/test/evidence commit follows them. The dependency files are byte-unchanged from the prepared dependency commit on resumption.

## Scope and next gate

Dependency configuration/lockfile, the single global error-boundary source file, two new focused test files and minimal hotfix status/evidence documentation change. No route addition, successful-API behavior, OpenAPI/schema/migration/fixture/workflow/product-rule change; only the explicitly authorized error-projection correction; no framework major or unrelated dependency upgrade. Historical migration checksums, deterministic M1 fixture, accepted M0–M2/Slice 2/3 contracts, and D01–D36 remain intact. No Slice 4+, EACCE or design work. Existing dependency/evidence commits are preserved, with the authorized runtime/test correction recorded separately.

Do not merge automatically. Independent review, successful exact-head CI and explicit Product Owner approval remain required. Slice 3 is not fully COMPLETE until the approved hotfix merges and exact-main post-merge verification succeeds. Slice 4 stays unauthorized, Issue #39 stays open, EACCE NOT STARTED and design/UI FROZEN.
