# CI Accelerator V2 policy

CURRENT AUTHORITATIVE infrastructure reference. [Workflow](../.github/workflows/ci.yml), [executable classification and dependency mapping](../scripts/ci/policy.mjs), [testing](TESTING.md). This policy changes validation routing only; technical Green does not authorize Product/UX/Design, Lab or final-domain work.

## Classification and execution

Every PR to main and push to main starts `classify`; there are no workflow-level path exclusions. PR diffs use merge-base(base SHA, head SHA) → head, covering the entire PR. Main pushes compare event before → after, including every pushed commit. Rename detection is disabled so both removed and added paths contribute risk. Missing/unavailable/empty diffs conservatively select full regression. No API file pagination or filename-count limit can truncate classification.

| Class | Known paths | Validation |
| --- | --- | --- |
| A `DOCS_GOVERNANCE` | Markdown, FIRST_AGENT_PROMPT.txt, docs/ui-screenshots evidence; sensitive accepted contracts below override Markdown | Repository/reference/source-index sanity + policy tests only |
| B `FRONTEND_ONLY` | apps/web, packages/ui, tests/ui*.test.mjs, controlled UI browser script/helpers; sensitive paths/tooling below override | Frontend lint, UI package + Next build/typecheck, UI units, controlled Chromium browser suite; no PostgreSQL or Docker |
| C `NORMAL_BACKEND` | Explicit known apps/api/src module files in the table below | Backend lint, Prisma validation, non-web workspace build/typecheck, affected units + auth/authority/error baseline, affected PostgreSQL tests and Docker runtime |
| D `DATABASE_HIGH_RISK` | All packages/db files (including Prisma/migrations), migration directories, persistence/transaction/locking paths, API prescriptions/pharmacy, packages/clinical-rules | Full regression, including migration/upgrade, integration/concurrency, browser, security and every historical runtime |
| E `SECURITY_HIGH_RISK` | Auth/authorization/session/password/CSRF/origin/privacy/masking/authority/membership/assignment/security path segments; accepted security/product/clinical contracts and OpenAPI | Full regression |
| F `INFRASTRUCTURE` | .github, Docker/Compose, manifests/lockfile, workspace/TypeScript/ESLint/deployment config, CI scripts/tests; any unmapped path | Full regression |
| G `MANUAL_FULL` | Manual dispatch, ci:full or milestone-exit PR label | Full regression |

All classes are unioned. Docs never downgrade runtime risk. High-risk contract paths include docs/SECURITY.md, PRODUCT.md, PRODUCT_V3_DECISIONS.md, DECISIONS.md, *CONTRACT.md, EH-005 through EH-009 contract documents and openapi.json. Frontend session/security paths and frontend package/TypeScript/build configuration elevate too. New API files, shared non-UI packages, test fixtures/support and unmapped scripts fail safe to full until deliberately reviewed and mapped. Path routing cannot infer semantic risk inside a known module: use full mode for cross-cutting authority/privacy/clinical changes regardless of filename, and verify this during independent review.

## Explicit targeted backend dependencies

Every bounded backend change includes auth, authorization, identity and error-sanitization test families, plus auth and authorization runtimes. Family selection includes exact names and hyphen-suffixed HTTP, integrity, migration and concurrency suites when present. The [mapping](../scripts/ci/policy.mjs) owns the executable lists; changes to it themselves require full CI.

| API source module | Additional test families | Additional runtimes |
| --- | --- | --- |
| bookings | bookings, availability, consultations | availability, booking, consultation-opening |
| availability | availability, bookings | availability, booking |
| directory | directory, organizations | organization, directory |
| patient-entry | patient-entry, relationships | patient-entry, relationship |
| relationships | relationships, relationship | relationship, v3-i1-exit |
| blood-pressure | blood-pressure, bp-amendments, followup | clinical, care-action |
| followup | followup, blood-pressure | clinical, care-action |
| documentation | documentation, consultation-context, consultations | consultation-opening, consultation-documentation |
| follow-up-intents | follow-up-intents, documentation, consultation-close | consultation-documentation, follow-up-intent, v3-i2-exit |
| consultation-close | consultation-close, consultations, documentation, follow-up-intents | consultation-opening, consultation-documentation, follow-up-intent, v3-i2-exit |

Multiple modules take the union; verifiers run once in historical order. Persistence changes, prescriptions/pharmacy and foundational composition (app.ts/main.ts), shared contracts, auth and unknown modules intentionally remain full. Pharmacy therefore includes prescription and all authority dependencies. The expensive booking verifier still runs whenever booking/availability or full regression requires it; its assertions/timeouts are unchanged.

## Workflow and truthful required gate

`classify` publishes a versioned JSON plan, per-lane booleans, classes, modules, runtime selection and reasons in the Actions summary. All lanes depend on that decision:

- `docs-check`: policy tests, maintained/changed Markdown local paths/anchors, all docs Markdown entries in SOURCE_OF_TRUTH, required repository entrypoints and whitespace sanity. No dependency installation, browser, database or Docker.
- `frontend-check`: web/UI build, typecheck, lint, all UI unit tests and controlled browser suite.
- `backend-check`: remaining workspace build/typecheck, lint/Prisma and affected non-UI unit tests.
- `postgres`: affected integration families for bounded backend; full mode adds the historical migration verifier, all integration tests, real Live browser proof and auth measurements.
- `docker-runtime`: build/load one shared image, fresh disposable DB + explicit schema deploy, API/web/worker health, container auth tests, selected runtime chain and HTTP smoke; full mode retains container auth measurements.
- `dependency-audit`: production and full high/critical dependency reports, required for full/infrastructure/dependency changes.

`validate` remains the single final required name. It always runs and verifies classification success, a complete known lane set, a structurally valid full/targeted plan, `success` for every selected lane and `skipped` for every omitted lane. Failure, cancellation, a missing result/output, malformed plan or unexpected skip fails. No continue-on-error turns failed checks green. Repository branch protection must continue requiring validate; this sprint does not edit protection settings.

## Full regression and main policy

Use **Actions → Bootstrap CI → Run workflow → select branch → Run workflow**, or `gh workflow run ci.yml --ref <branch>`. Dispatch always selects full regression. For PRs, add `ci:full` or `milestone-exit`; labeled/unlabeled events recalculate routing. These controls can elevate any bounded change. High-risk/infrastructure/unknown paths select full automatically. A milestone exit requires full validation on its candidate; no nightly schedule is added.

Main pushes use the same path contract over the complete push range. Docs merges stay lightweight; frontend merges stay frontend; bounded backend merges get relevant proof; high-risk changes get full proof. PR labels are not inherited by a main push, so a release/milestone requiring a fresh main proof uses manual dispatch on main. This policy retains separate PR/main assurance where selected, while removing indiscriminate full repetition after trivial merges.

Full mode preserves all historical top-level unit tests (UI and non-UI across frontend/backend), both browser modes, fresh/repeat/populated migration verification, all PostgreSQL integration/concurrency tests, both audits, container auth tests/measurements, every baseline runtime from auth through pharmacy, worker/Compose health and HTTP smoke. Tests are selected, never rewritten to weaken accepted behavior.

## Caches, isolation and cancellation

- The pinned Node/pnpm toolchain uses setup-node's pnpm content-addressed store cache keyed by pnpm-lock.yaml. Frozen installation still runs. node_modules, built application artifacts and database fixtures are not cached.
- Chromium binaries are cached by runner OS/architecture and exact lockfile; only browser lanes restore/install them. System libraries are always installed. No broad restore keys mix browser revisions.
- Buildx builds and loads the shared Compose image once, with GitHub Actions cache import/export scoped to ci-runtime. Compose starts with --no-build. Dockerfile, image contents and runtime commands are unchanged; no registry push occurs. PR cache isolation follows GitHub's cache access rules.
- Each job builds the artifacts it needs in its own isolated filesystem. Backend build/typecheck no longer invokes root scripts that repeatedly generate/rebuild dependencies. The full PostgreSQL job still builds web for its real browser proof; Docker still independently builds the deployed artifact. Cross-job dist/node_modules transfer is deliberately avoided to preserve isolation.
- Concurrency groups use workflow + PR number (otherwise ref). Only PR events set cancel-in-progress true, cancelling superseded commits. Main/manual runs are not actively cancelled; standard GitHub concurrency may replace a pending run with a newer pending run. Every resulting main push is still path-classified; milestone proof is pinned to the candidate SHA.

## Cost audit and evidence limits

Observed successful historical runs, not duration guarantees:

| Evidence | static-browser | postgres | full integration step | docker-runtime | booking verifier | Docker build |
| --- | --- | --- | --- | --- | --- | --- |
| [PR #73 run 41351166398](https://github.com/abuhmaid28/egyhealth360/actions/runs/41351166398) | 2m53s | 25m49s | 21m28s | 9m41s | 5m23s | 48s |
| [Main run 41353803730](https://github.com/abuhmaid28/egyhealth360/actions/runs/41353803730) | 2m33s | 21m13s | 17m40s | 9m03s | 5m21s | 39s |

The docs-only foundation change ran all these checks in both PR and main. Two host installs/builds plus a separate image build repeated the same source; root build/typecheck repeated generation/package builds. Both host lanes installed Chromium (PR: 20s each), although controlled browser and real Live browser prove different boundaries. Auth units/measurements and domain proofs repeat across host/container contexts. Full mode retains these deliberate independent assurances. Docker build was materially smaller than booking runtime; the largest observed cost was full PostgreSQL integration. Neither runtime verifier timeouts nor integration concurrency have been changed just to accelerate CI. Audits took about a second each in that PR run; their low cost does not justify network/dependency setup for docs-only work.

Policy scenarios run in every docs-check: docs/UX → docs-check only; component/UI package → frontend; booking controller → targeted backend/PostgreSQL/runtime; prescription/migration/auth → full; mixed files union; unknown → full. Event tests use real Git histories to prove docs-only PR **and main** plans, multi-commit pushes, rename/deletion elevation, missing refs and full controls. Gate tests inject failed/cancelled/missing/skipped lane results. These are deterministic routing proofs, not measured executions of every scenario's application suite. The infrastructure PR itself selects full regression; actual exact-head workflow results and before/after routing evidence belong in its PR handoff, without inventing timing savings or claiming a separate docs-only application run.

## Maintenance

Run `node --test tests/ci/*.test.mjs`, `node scripts/ci/check-docs.mjs`, lint CI scripts, and actionlint when editing routing/workflows. New modules require an explicit dependency/review decision; otherwise full remains the safe default. Local links/anchors are checked for current references and changed Markdown; historical unchanged report links and external URLs are not availability-tested. SOURCE_OF_TRUTH must classify newly added docs. CI Green is technical evidence only.
