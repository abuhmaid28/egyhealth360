# Product Owner decision package and validation

**Issue [#116](https://github.com/abuhmaid28/egyhealth360/issues/116) · one documentation-only comparative proposal · STOP for owner review.** Read [current boundaries and A/B options](CURRENT_BOUNDARIES_AND_AB_OPTIONS.md) and [F06, dependencies and rollback](RISKS_F06_DEPENDENCIES_AND_ROLLBACK.md). This document is not an architecture decision record selecting A or B. The [controlling owner decision](https://github.com/abuhmaid28/egyhealth360/pull/115#issuecomment-6785655141) authorizes this proposal and independent review only.

## 1. Decision separation

| Accepted / observed | Still proposed, open or unverified | Owner action after this proposal |
| --- | --- | --- |
| Audit #115 head `1dda926d0bedfad9fa0ccb69c013aa8263742386` accepted as **INCOMPLETE / CONDITIONAL**; F01–F06/U01–U04 ledger retained | No full health/release-ready verdict; no demonstrated P0/P1 in executed checks is not evidence of none elsewhere | Accept/revise/defer this proposal and disposition affected evidence gates, especially F06 required paths |
| Source main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; actual app-local composition, empty UI package | A incremental app evolution versus B genuine neutral package extraction; no measured performance/reuse saving | **Separate architecture selection decision**, or separately scoped read-only evidence gathering; proposal acceptance alone selects neither |
| DP01/DP02 source-exact no-tagline logo; AP01 Inter/Plex; AP02 gradients; AP04 raw Brand pairs | Semantic aliases/API/shape/focus/icon sizing/type density/shell/full screen states remain owner-gated; no final DS | Approve exact component/copy/navigation/screen/asset scope before any implementation request |
| Patient/Doctor preferred visuals, Navigation A review direction; T1 System + session-only override direction | T1 first-paint/reset implementation unbuilt; AR-first strategy/F03/F04 unresolved | Ratify detailed initial-render/reset behavior and no sensitive persistence |
| CD07 future Patient appointment overview/detail12h; professional/consequential24h, exact zones/precision retained | Runtime unchanged; no all-patient12h preference | Review scope-specific format/state acceptance, never change eligibility/storage/parser implicitly |
| Pharmacy backend and internal operational foundations exist | Pharmacy Live UI gap; Admin public management exposure gap; Lab backend/results/Live FUTURE; AP03/AP05 OPEN | Independent capability-specific authorization and applicable distribution/rights evidence; screenshots confer no clinical authority |

**Recommendation, not a selection:** evaluate A's neutral boundaries first because all verified consumers are app-local, while retaining B if real reuse justifies its toolchain/export surface. A has duplication/cascade risks; B can enforce a useful neutral API but adds unproved build/consumer/CSS/SSR burden. Identical Patient/Doctor tasks, privacy/accessibility tests, performance budgets and rollback rules apply to both. An owner may choose B, choose A, request bounded evidence, or defer; no weighted score or invented numeric saving predetermines the answer. F06 gates affected paths under either choice.

## 2. Concrete next-owner package

The requested decision **now** is acceptance/revision/deferment of this three-document proposal and its F06 impact analysis. The next decision remains separate:

1. Name required local Live/demo/CI/hosted evidence paths and owners. Keep F06 P2 unless demonstrated mandatory-path impact warrants a P1 escalation recommendation; any Stage1.5/fix needs separate authorization. Assign F02/U03 source/ledger/configuration proof without hosted writes.
2. Choose A or B explicitly, or authorize a bounded evidence-only follow-up with exact files/environment/budget. Neither is selected by this PR, reviewer verdict or CI.
3. Resolve selected component/token/shape/focus/icons/shell/copy/T1 first-paint details, exact asset/license allowlist and Patient/Doctor read-only pilot scope. Keep independent sign/release/close and current authority intact.
4. Only later authorize a bounded implementation slice after applicable findings/topology/specification gates. Later staff capability work, AP03/AP05 and final DS/release acceptance remain separate. No automatic next milestone.

An architecture-selection record should identify chosen scope, alternatives rejected with reasons, allowed files/dependencies, exact source/asset references, required topology tests and rollback owner. This is a future document, not a decision supplied by the writer.

## 3. Independent criticism and disposition

Issue #116 expressly requires independent roles separate from the writer. Two read-only agent reviewers independently inspected source/contracts and then these documents. They did not edit source, run clinical transactions, reproduce Docker failure, certify clinical/legal safety or test physical devices. Both content reviews found no blocking issue after the recorded clarifications. Their bounded verdicts and final-head verification are distinguished below; review addresses adequacy of this proposal, not implementation approval.

| Independent role | Critical review scope / requested corrections | Disposition and limits |
| --- | --- | --- |
| `architecture_review` — technical architecture | Actual26TSX/23 client directives; zero UI consumers; missing package JSX/DOM/React/export contract; eager role imports and cross-role dependencies; F06 build/topology/CI gap; fair A/B criteria; exact Patient appointment and Doctor consultation routes; memory-only rollback limits | Added exact route dispatch, type/runtime-aware full import adjacency and source blobs, equal import-fence/SSR/budget tests, B toolchain prerequisites and drain/unsaved/uncertainty guard. **Content PASS for bounded proposal**, conditional on final local/remote receipts; independently matched all54 source graph blobs and all9 asset blob/SHA-256 rows. Final-head receipt in PR handoff; no prototype/build benchmark claimed. |
| `security_clinical_review` — security/clinical/privacy contracts | Current assignment/own data, independent sign/release/close, privacy before replay, memory-only uncertain-key recovery, DOM/hydration/count leakage beyond import fences, health≠auth proof, F05 interpretation, D36 independence, T1/CD07 precision/AP03/AP05 | Added explicit DOM/labels/hidden counts/hydration/URL/log/error negative checks, health versus auth stages, safe-boundary rollback and no key reconstruction; retained F05 P3/open semantics and all release/capability holds. **Content PASS for bounded proposal, no remaining blocker**; independently verified all1423 baseline paths/modes,1421 unchanged blobs and all9 asset rows. Final-head receipt in PR handoff; no licensed medical/legal/security certification. |

**Unresolved disagreements/decisions remain visible:** F05 desired I2 prior-scope denial interpretation requires owner/security disposition; no payload breach is asserted. Current source does not establish perceptible Arabic flash or real AT impact. B's reuse/build benefit and A's long-term boundary durability are unmeasured. F06 mandatory-path severity depends on owner-approved next-phase requirements. Raw Brand approval does not settle token/shape/focus/navigation/clinical-state choices. Reviewer agreement on proposal adequacy cannot resolve these owner gates.

## 4. Exact changed-file inventory and preservation proof

Only **five Markdown files** may differ from main; no copied screenshot/font/logo/audit tree or new script/test artifact:

| Path | Exact purpose |
| --- | --- |
| `docs/frontend-architecture-v2/proposal/CURRENT_BOUNDARIES_AND_AB_OPTIONS.md` | NEW: source/module/import/provider/role/style/dependency map, A/B ownership and same requirements, prospective asset blob/hash/license allowlist |
| `docs/frontend-architecture-v2/proposal/RISKS_F06_DEPENDENCIES_AND_ROLLBACK.md` | NEW: F01–F06/U01–U04, F06 impact/retest/severity, phased dependencies/tests/rollback |
| `docs/frontend-architecture-v2/proposal/OWNER_DECISION_AND_VALIDATION.md` | NEW: accepted/proposed/open decisions, independent criticism, validation/limits and owner stop |
| `docs/CURRENT_STATUS.md` | Minimal current-scope pointer; preserves historical paragraphs |
| `docs/SOURCE_OF_TRUTH.md` | Minimal classification/pointers for these three docs |

Preservation is checked using complete `git ls-tree -r` mode/type/blob maps for base and final head, not a sample or file extension guess. All **1423 baseline paths retained;1421 mode/blob-identical**, with only the two named status/index exceptions; exactly three new Markdown files. Runtime frontend/backend, auth/security/clinical contracts, API/OpenAPI, schemas/all22 SQL migrations, dependencies/lockfile/toolchain, Docker/Compose, CI policy/workflow, PWA configuration, accepted/historical assets and protected screenshots remain byte-identical. Source reference PR heads stay at their pinned values. No synthetic/hosted transaction, runtime build/test, Docker reproduction, fix, merge, deployment, branch promotion or ready transition was executed for this proposal.

Read-only AST/import inventory and Git blob/SHA-256 asset comparisons are newly executed analysis. Prospective asset records are derived from pinned #101 objects and cross-checked against #105's reference manifest, not copied binary files. Local ephemeral inventory/validation helpers stay outside tracked repository files. Protected source evidence stays at existing paths; audit #115 is linked at its exact head rather than imported.

## 5. Validation method, actual receipts and exact-head remote CI

New local validation is intentionally narrow: `node --test tests/ci/*.test.mjs`, `git diff --check`, existing changed-Markdown reference/anchor/classification checker with an actual PR-shaped base/head event, policy classifier on exact diff, and exhaustive baseline path/mode/blob preservation. Observed local policy tests:30/30 PASS,0 failures/skips; the intentional invalid-SHA negative-control diagnostic is expected. The35 unique pinned external source file targets resolve to existing Git objects;54 source blob rows and9 asset blob/SHA-256 rows match their pinned inputs. Exact final changed-doc results/counts and reviewed file hashes are retained in the PR handoff, which is the mutable receipt after final commit; no historical audit test is relabeled as newly run.

The **final immutable source head, base/sole parent, three-document SHA-256 hashes and exact remote run/job links/results are recorded in this Draft PR's description** after the final commit. This avoids self-referential head hashes and a post-CI documentation commit. The PR is discoverable from Issue #116 and branch `docs/116-frontend-v2-proposal`. Verify the source `head_sha`/`headRefOid`, not GitHub's temporary merge-test SHA, and compare local/remote head together. Any subsequent source commit invalidates that receipt until revalidated.

Expected existing policy for these five Markdown paths: **DOCS_GOVERNANCE/full=false**; selected `classify`, `docs-check`, `validate`; omitted `frontend-check`, `backend-check`, `postgres`, `docker-runtime`, `dependency-audit`. This is an expectation, not a PASS claim. Final handoff must inspect actual final-head `pull_request` run/event/attempt/conclusion, every job's success/skipped/failure/cancellation, classifier and docs logs, Draft/Open/Unmerged state and auto-merge OFF. No prior PR/main CI, pending check, selected-lane assumption or green icon alone substitutes for actual results. No manual full dispatch, rerun, waiver or CI-policy change is intended.

Heavy policy skips do **not** mean frontend/backend/PostgreSQL/Docker/dependency PASS. Historical #115's336 unit and1286 integration passes,18 API-container verifier successes, failing web rewrite500, four navigation traces/eight axe scenes and all hosted/platform limits remain historical evidence only. This proposal performs no performance experiment, browser/AT/clinical test, F06 retest, rollback rehearsal, real-device/print/rights investigation or hosted health refresh.

## 6. Hard stop and acceptance checklist

- [x] One comparative documentation-only proposal; neither A nor B selected, prototyped or implemented. Same tasks, risks, test/budget/dependency and rollback bar.
- [x] F06 analyzed as a path-specific pre-implementation gate; P2 retained with explicit conditional P1 criteria and separately authorized retest/fix. Hosted historical200 is separate evidence.
- [x] F01–F06/U01–U04, incomplete-health limits, F05 policy uncertainty, CD07 precision, T1 unimplemented direction, staff capability gaps and AP03/AP05 remain visible.
- [x] Exact source/owner/asset links and hashes, independent critical review, exact five-file inventory and exhaustive preservation method; no duplicated historical evidence.
- Final remote exact-head CI and independent final-state verification belong to the PR handoff receipt; delivery requires actual verification. This source document deliberately does not forecast results.

**STOP for separate Product Owner acceptance/revision of the proposal and F06 impact.** Leave the one fresh PR and all source PRs Draft/Open/Unmerged/auto-merge OFF. No architecture selection, remediation, production code/config/API/schema/dependency/CI-policy change, merge, deploy, Final Design System approval or automatic follow-on work is authorized.
