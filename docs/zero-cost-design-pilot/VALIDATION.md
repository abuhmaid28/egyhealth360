# Browser and preservation evidence

This package validates an isolated design comparison. It does not implement or remediate the product, certify accessibility, activate a native Skill, complete S1 or select a final visual direction. [Independent visual review](INDEPENDENT_REVIEW.md) is a separate finding/verdict record.

## Frozen rendered candidate

Actual installed Chromium **154.0.8037.57** / Playwright **1.62.1** rendered localhost static files. No product server, database, session, API, deployment or paid rendering service was used. [Browser measurements](evidence/browser-measurements.json) and [states/focus](evidence/states-and-focus.json) independently record the same three specimen SHA-256 values:

| Source | SHA-256 |
| --- | --- |
| `specimen/index.html` | `6ae202bc0064e79e8d7a6fee936e35524cdff6c0749dbbffcea392a958c405dd` |
| `specimen/specimen.js` | `202234e96c306dcf261537fb35d8cc56f51600d7db37de36651ac7e437ecec80` |
| `specimen/specimen.css` | `9deb9e123f029d4cdc457e9c95ccb0886b9c647563684861f95363eee8eb9178` |

Each render tool hashes inputs before and after capture and fails if they change. Source files were frozen during the final runs. Earlier captures are superseded except four explicitly retained defect screenshots under [before-revision](evidence/before-revision/). The initial JSON there includes intentional assistive-text hiding among its clipping observations; the final detector excludes that hiding and checks text ranges against clipping ancestors.

## Actual coverage and findings

| Check | Observed result |
| --- | --- |
| Core output | 16 default combinations: 2 directions × 2 roles × EN/AR × desktop/mobile. Each has a viewport and complete-page PNG. |
| Responsive matrix | 48 layouts: all 8 direction/role/language combinations at 1440/768/390/320px normal text, plus 390/320px with actual 2× text. Desktop height 1000; other capture viewports 844 CSS px. |
| Enlarged text validity | 16 cases; all sampled element computed post/pre font-size ratios exactly 2. The harness uses important inline overrides so author CSS floors cannot defeat enlargement. This is text resizing, not browser zoom. |
| Reflow/text | Zero horizontal overflows, own-element clipping or text-range clipping against hidden/clip ancestors. Zero measured normal-text leaves below the pilot's 12px floor. Geometric checks still cannot detect every poor word break; independent screenshots found and drove additional repairs. |
| Contrast | 3,660 enabled-text observations across the matrix; none below 4.5:1; minimum observed 5.06:1. These are repeated computed foreground/background observations, not 3,660 independent design decisions or a full WCAG audit. |
| Targets | Zero measured normal mobile interactive controls below 44×44 CSS px. This is the pilot design target, not a claim that WCAG AA universally requires 44px. |
| Fonts | Actual local Manrope loaded in EN; local PlexArabic also loaded in AR. No external font request or loading failure. |
| Browser/network | Zero browser page/HTTP errors and zero external-origin request attempts during the default matrix. All requests were constrained to localhost. Source scan found no fetch/XHR/storage/cookie/WebSocket/beacon or external import in specimens. |
| Keyboard/dialog | 8 mobile variant cases: actual Tab reached visible skip link; Enter opened native preview dialog; Escape closed it; focus returned. One H1 per default layout. This is not exhaustive screen-reader or keyboard certification. |
| Recovery/privacy states | 12 actual mobile state renders: both directions × both languages × read-error/uniform-unavailable/uncertain-write. Four unavailable samples suppress visible patient/visit/source identity and fixture clinical payload. No state overflow or external request. |
| Long clinical scroll | 8 screenshot cases: both directions × both languages × focused summary-sign or close action. Actual focused control unobscured; repeated patient/visit/state context adjacent. |
| Controlled data | Fixture objects match within each role/language across directions and widths. Patient 09:00 and clinician 14:35 are intentionally different synthetic moments. Python zoneinfo confirms Cairo offset UTC+02:00 on the event date; no permanently fixed-offset policy is inferred. |
| Owner exports | Four comparison-board PNGs, four-page PDF, full PNGs and source gallery. GitHub PNG/PDF links require no owner software installation or local IDE. |

There are **64 current PNGs**: 32 default viewport/full captures, 8 enlarged-text captures, 12 state captures, 8 scrolled focus captures and 4 boards. Four earlier defect PNGs are retained separately (**68 total**), alongside their initial measurement summary. [Artifact digest inventory](evidence/artifact-hashes.json) distinguishes all paths.

Independent critique identified calendar clipping, small typography/targets, source ownership ambiguity, lost action context after scrolling, weak Relay differentiation, and initials/task-label stress defects. The design agent revised them. A nominal 200% method was rejected and corrected before final evidence. Read [the review](INDEPENDENT_REVIEW.md) for actual screenshot inspection, residual aesthetic/usability limitations and verdict; this table is not visual approval.

## Scope and local technical checks

[Preservation proof](evidence/preservation.json) compares every pinned baseline git blob against working-tree bytes. Base is **5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3**; **1,421 of 1,423** pre-existing files are byte-identical. Only `docs/CURRENT_STATUS.md` and `docs/SOURCE_OF_TRUTH.md` change among baseline files. Every new artifact is under `docs/zero-cost-design-pilot/`.

This preserves application/backend/database/schema/migrations/OpenAPI/tests/dependencies/CI/deployment configuration, accepted UX/content/Arabic/security/clinical/governance contracts, local fonts/license notices and protected historical screenshots. PR #86 and #87 heads remain unchanged; S1 files are not imported or edited. Issue #88 remains unremediated/tracking-only.

Executed local checks: original existing CI-policy suite **30/30 passed, zero skipped**; JavaScript syntax checks and complete-diff whitespace checks passed. The unchanged repository Markdown checker passed 1,021 local references in 60 current/changed Markdown files. Exact-head remote validation is reported in the PR handoff rather than substituting baseline success.

## Required remote CI

The verified baseline push/main CI [42165554605](https://github.com/abuhmaid28/egyhealth360/actions/runs/42165554605) completed SUCCESS on the exact base. It does not validate this proposal.

The unchanged classifier elevates isolated HTML/CSS/JS/SVG/PNG/PDF/JSON tooling paths that are not mapped to docs-only. Therefore this delivery must run the actual selected full regression; no path is moved or policy weakened to avoid it. The final PR records its exact head, classification, required `validate` result and each selected job. Until that exact-head run completes, no technical Green or 100% task completion is claimed. The remote CI record remains in the PR to avoid a self-referential documentation-only follow-up rerun.

## Health, limits and next gate

No new product-foundation P0/P1 is established by this isolated package; product bytes and contracts are preserved. The known recovery caption issue remains separately tracked in #88. Existing integration gaps, future Lab/I4/EACCE boundaries, deployment truth and clinical enforcement are not retested or changed by static rendering. Required repository CI supplies separate runtime regression evidence; it cannot approve the proposed design.

No new subscription, paid API/asset, model credit purchase, dependency or deployment was introduced. [Cost and supply-chain audit](AUDIT.md) scopes that incremental-cost statement. Native Skill activation and paired efficacy remain unverified; the explicit playbook is temporary. Complete state specifications, native assistive/device testing, non-Chromium rendering, browser zoom/text-spacing/high-contrast behavior, task-based usability and final brand/system choices remain gaps. These are not a requirement that the owner install tools, design screens or write code.

Next gate: Product Owner disposition on the shown directions, followed by an agent-executed bounded specification/refinement pass. Later Final Brand/Design System/prototype approvals and a separate implementation grant remain necessary. Keep delivery OPEN / UNMERGED / AUTO-MERGE OFF. No automatic deployment.
