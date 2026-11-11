# Decisions and next owner gates — Issue #112

**One-page recommended owner disposition** (11 November 2026). [Issue #112](https://github.com/abuhmaid28/egyhealth360/issues/112), [controlling owner decision](https://github.com/abuhmaid28/egyhealth360/pull/111#issuecomment-6783144377), [review plan](HEALTH_AND_FRONTEND_ARCHITECTURE_REVIEW_PLAN.md). **Docs only; fresh audit NOT EXECUTED; Architecture V2 NOT SELECTED.**

## Already approved — preserve scope

| Decision | Current disposition |
| --- | --- |
| CD01–CD07 baseline | Accepted under [#77 owner decision](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568210676); not reopened. |
| Scoped CD07 exception | [#105 DSV2-02](https://github.com/abuhmaid28/egyhealth360/pull/105#issuecomment-6766897207) accepts future V2 patient appointment overview AND detail12h with explicit localized period. Professional/consequential timestamps stay24h with precise IANA zone/offset/DST/seconds. This PR reconciles canonical docs only. |
| #111 consolidation | `84e39a14a888686307562a5df383d2a475bfcd2f` accepted as **reference only**, not final DS/components/screens/architecture, asset migration or runtime implementation. |
| Theme T1 | **Selected design direction only**: System default + current-session in-memory System/Light/Dark override; survives navigation, clears on logout/account switch/session end/new session/reload; no persistence/sync. SSR/FOUC/AT/OS-transition proof remains future. |
| Brand / preferred visual references | Preserve exact source assets/fonts/approval classes at the pinned sources below; no asset copied and no draft merged. |

## Recommended next owner decision

1. Accept/revise the **bounded CD07 documentary alignment**, including EN/AR example scopes; do not turn the exception into all-patient12h or change runtime formatting/eligibility.
2. Accept/revise this **health/architecture review plan**. If accepted, separately authorize the genuine health audit: exact future candidate/environment/allowed hosted reads, independent reviewer roles, evidence location, free-budget ceiling and scope. No current health grade or remediation is being approved.
3. After the real health report and any owner-approved P0/P1 remediation, separately authorize an architecture proposal: evaluate **A (`apps/web`) first**, then B (`packages/ui`) against identical requirements and measured reuse/build/SSR/state/test/rollback evidence. Select neither now.

**Keep OPEN:** AP03 actual physical/platform/AT/install/print checks + five Type3 warnings; AP05 original artwork/derivative/distribution/trademark evidence; Pharmacy Live UI/hosted parity, FUTURE Lab backend/results/UI, Admin public management exposure; semantic aliases, radius/focus/icon scale/density and staff/Admin shell; final DS/Architecture V2 and screen-level/implementation/release decisions. Applicable release gates require evidence/owner disposition, while this docs plan can be reviewed independently.

**STOP for Product Owner review.** No new phase, implementation, merge, ready transition, auto-merge, deploy or whole-project health acceptance is implied.

## Provenance and changed-file appendix

Fresh main/base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. Branch `docs/112-cd07-health-architecture-plan` starts there; no source branch is merged/cherry-picked. Fresh GitHub checks found no superseding issue decision or changed source heads before editing; all six references remain Draft/Open/Unmerged.

| Pinned source | Exact head / authority |
| --- | --- |
| [#101 Brand](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6761920764) | `687f94074c0ac4d45610546517ea6aa228d36183`; source-exact no-tagline artwork/gradients, Inter/Plex, Violet × Apricot accepted within bounded Brand roles; AP03/AP05 OPEN |
| [#103 blueprint](https://github.com/abuhmaid28/egyhealth360/pull/103#issuecomment-6763681689) | `4052e2657dd8d354fe11e33ed51fc32ec8065583`; planning only |
| [#105 spec/time](https://github.com/abuhmaid28/egyhealth360/pull/105#issuecomment-6766897207) | `82fbbe9fef28a6407947852d47473ea35cd057a8`; preliminary spec, scoped CD07 amendment, Patient/Doctor Navigation A review direction |
| [#107 Patient/Doctor](https://github.com/abuhmaid28/egyhealth360/pull/107#issuecomment-6769908758) | `56f4f700aa83297c9f5c164a5304135303137f75`; preferred visual reference only |
| [#109 Pharmacy/FUTURE Lab/Admin](https://github.com/abuhmaid28/egyhealth360/pull/109#issuecomment-6779297149) | `69a5113d310158b55bdb2000982fd6d2e34f35bd`; preferred visual reference only |
| [#111 consolidation](https://github.com/abuhmaid28/egyhealth360/blob/84e39a14a888686307562a5df383d2a475bfcd2f/docs/design-system-v2/consolidation-review/CONSOLIDATED_REFERENCE.md) | `84e39a14a888686307562a5df383d2a475bfcd2f`; accepted reference only, superseded Theme proposal by T1 selected direction in [owner comment](https://github.com/abuhmaid28/egyhealth360/pull/111#issuecomment-6783144377) |

Expected inventory: three narrowly amended canonical docs (`CONTENT_DECISION_REGISTER.md`, `ARABIC_UX.md`, `CONTENT_SYSTEM.md`), these two planning docs, and minimal `CURRENT_STATUS.md`/`SOURCE_OF_TRUTH.md` entries. `TERMINOLOGY_GLOSSARY.md` has no conflicting time example and `CONTENT_VALIDATION.md` is explicitly historical: both remain byte-identical. Original CD01–06 rows/adoption records, clinical/security/IA contracts, runtime/schema/migrations/OpenAPI/dependencies/CI/config/PWA and all protected design evidence remain unchanged. No copied screenshots, fonts, logo or patient data.

## Validation and limits

**Local PASS:** documentation reference/classification/anchor checks include both new plans and affected canonical docs (**921 references / 55 maintained or changed Markdown files**); **30/30 CI-policy tests**, staged whitespace and exact seven-path inventory pass. All **1,418 baseline tracked files outside the five allowed existing docs** byte-match main, including glossary, historical validation, clinical/security/IA contracts, runtime/schema/migrations/OpenAPI/dependencies/CI/config and protected evidence; CD01–06 rows are unchanged.

Nine illustrative IANA conversions under **tzdata2026b** match both local wall-clock/offset and UTC instant; the500ms validity illustration, cross-midnight dates, periods, date-only and narrow12h/24h scope checks pass. An initial temporary fixture checker used Python cross-zone datetime equality on an ambiguous repeated hour and failed; corrected it to compare explicit wall-clock/offset plus normalized UTC, then reran successfully. The examples did not change. These are documentary arithmetic/consistency checks, not frontend/backend/eligibility tests or a new health verdict.

Reproduce documentation checks with `node scripts/ci/check-docs.mjs` and the actual PR event in `GITHUB_EVENT_PATH` to include changed Markdown, `node --test tests/ci/*.test.mjs`, and `git diff --check`; compare `git diff --name-status 5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3 HEAD` to the seven paths above and byte-compare all other baseline files. Existing classifier selects DOCS_GOVERNANCE/docs-check, with five heavy lanes unselected; final remote CI must verify actual successes/skips/failures at the exact published head in the Draft PR receipt. No costly clinical/deployment suites, device tests, health audit, architecture migration or remediation is executed in this scope.

## Independent content, security and architecture review

Reviewer: separate agent `/root/cd07_plan_review`, 11 November 2026; review-only assignment. **PASS for this bounded documentation/owner-review package.** This is not a fresh project-health verdict, final Architecture/Design System approval, runtime proof or release clearance.

- Independently read Issue #112, current #111 owner comment `6783144377`, #105 DSV2-02 comment `6766897207`, AGENTS/charter, and the canonical diffs plus both planning documents. No superseding #111 decision was returned in the fresh discussion read.
- The dated supersession and amended CD07 row apply only to future V2 patient appointment overview AND detail, with explicit localized periods, Latin digits and named Gregorian months. Other patient clinical timestamps are not globally converted; original CD01–06 rows and historical approval context remain intact.
- Independently checked nine instant→IANA-zone conversions using Python zoneinfo with installed tzdata **2026b**: Cairo standard appointment, repeated29 October23:30 with distinct `UTC+03:00` / `UTC+02:00`, midnight rollover, Cairo/New York same-instant comparison, professional and FUTURE Lab subsecond examples. All match the matrix. The validity interval is exactly500ms, with inclusive start/exclusive end preserved; date-only text does not gain a timezone.
- English/Arabic periods, endpoint dates, explicit ambiguity offsets and IANA detail disclosure preserve chronology/precision without making locale strings a command parser. Professional/sign/release/history/audit and consequential validity stay24h; spring-forward gaps are not silently normalized. Lab timestamp copy is explicitly illustrative/FUTURE, with no result or verification claimed.
- Read actual catch-all Application entry, app-local UI/session/locale/Live boundaries and empty `packages/ui` export, together with security and I3/Slice2 contracts. The A-first recommendation is evaluation order only; neither architecture is selected. Business reuse, imports/providers/styles/fonts, SSR/client/bundle evidence, testing, free-infrastructure impact and rollback are concrete later decision inputs.
- The health worklist distinguishes observed source/historical evidence from PLANNED checks; P0 blocks continuation, P1 blocks the major phase and foundational remediation requires a separately approved scope. Critical claims need independent reproduction; hosted writes, restore/provisioning and costly tests require later explicit authorization/disposable targets. No fresh health grade or finding is manufactured.
- T1 is correctly an approved direction without implementation/persistence. AP03/AP05 and Pharmacy/Lab/Admin capability gaps remain OPEN. Booking never grants clinical authority; source-specific release/close, exact routed staff/current-authority/privacy checks, reduced history and no automatic clinical retry remain binding.

No remaining review-blocking defect found. I did not run a fresh health audit, production/browser/clinical suites, deployment checks, devices/AT/print or rights clearance. Parent owns final path/byte preservation and exact-final-head CI verification; actual selected/skipped/failed jobs must be disclosed. **Stop for Product Owner review.**

## Final receipt boundary

Exact new head/Draft PR/remote CI jobs belong in its PR receipt after commit to avoid a self-referential SHA in this file. Keep PR Draft/Open/Unmerged, auto-merge off; preserve all six source PRs. **STOP for Product Owner review.**
