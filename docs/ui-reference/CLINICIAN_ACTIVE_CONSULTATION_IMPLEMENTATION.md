# Clinician Active Consultation master implementation

Authority: [Issue #72 / owner authorization 6594105174](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6594105174), the [execution prompt](CLINICIAN_ACTIVE_CONSULTATION_CODEX_PROMPT.md) and controlling [master spec](CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md). Implementation base: `fcff95f2dc1d13a399b5b04423da6897c7a45077`. Patient visual baseline: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`. Main: `0a0e9c2038ecad420e95c2c67ae367129e195839`.

## Resolutions recorded before implementation

- Limit runtime presentation to the existing **Live CLINICIAN** `/doctor/consultation/:bookingId/documentation` route family. Keep other routes, all Patient-specific source/assets/evidence and Patient PR #79 unchanged. Reuse the actual Patient CSS token/font/header primitives rather than inventing a separate identity. Text wordmark only.
- During this exact URL family's existing authentication/bootstrap wait, render only the approved text wordmark and the existing loading component. No actor, clinical UI or value is granted before the unchanged session checks complete. Other routes retain their original boot.
- The accepted “People in your care / مرضاي” destination has no integrated current frontend route. Show the accepted IA label with an explicit unavailable state; do not invent a people directory, repurpose released-summary lookup as a directory, or add a dead active route. Schedule remains functional. Availability/settings remain secondary supported utilities.
- Use the exact current booking/context for patient identity, visit time/timezone, provider and clinic, omitting missing values. Derive initials only from the available patient display name. No extra demographics or clinical facts are introduced.
- Preserve current source/command machinery. Extend documentation with an opt-in **presentation-only** source-state rail rendered inside its currently authorized editor view; do not duplicate service reads or retain a separate clinical snapshot after redaction. Distinguish loaded/saved source state from unsaved editor content. Omit allergy metadata when its source is absent.
- Use a connected white three-plane workspace with the specified outline, flexible authoring plane and context rail. Retain full-width narrative sections and independent private/summary action rows, with restrained internal dividers and spacing rather than independent dashboard cards.
- The legacy allergy anchor surrounds the entire findings form. In the master opt-in presentation, point the outline to the actual allergy-review heading and keep its sticky-context clearance. Other authoring surfaces retain their original anchor.
- Preserve contract-permitted separately authorized documentation actions after closure. CLOSED is read-only lifecycle orientation, not a new blanket clinical-write prohibition. Signed sources remain immutable; the existing closed confirmation, explicit release/retry and restriction semantics remain unchanged.
- Local documentation/follow-up/review-close anchors remain exact-consultation tasks. No Prescription/Lab/Results/vitals/medications/AI/completeness chrome. No new integration, clinical command or automatic retry.
- Desktop EN/AR are the visual gate. Narrow widths receive structural reflow only, preserving current accessible controls and identity/uncertainty meaning; no clinician mobile product redesign.
- The legacy generic Arabic date/time helper defaults to Arabic-Indic digits and a 12-hour clock. The master requires Latin digits, named months and 24-hour event times. Reuse the approved Patient formatters for this shell's timestamps, including opt-in signed-history/close presentation; do not change global helpers or event/timezone semantics.

## Implemented composition and source boundaries

The authenticated master uses the same Patient CSS token/font/header primitives directly, with no new font asset or logo symbol. At 1600px the useful width is **1360px**, header/workspace both start at **120px**, and the connected workspace columns are **200 / 790 / 280px** with **24px gaps**. The header is 72px plus its 1px border. The compact context ribbon measures approximately **99.98px EN / 104.39px AR** including its border; the written spec's nominal range is approximate. Context and local tasks remain available during scrolling, using the existing measured sticky offset and focus-clearance behavior.

The original authoring handlers, state/resource/effect hooks and service calls remain unchanged. Five shared implementation files receive opt-in presentation/dispatch changes; four new scoped product files provide the shell, pure presentation components, CSS and structural bilingual copy. Source-state presentation is derived inside the authorized editor render. It disappears with that editor on invalidation/redaction, never keeps an independent clinical snapshot and adds no service read. Existing shared presentation defaults remain unchanged outside this exact shell. Patient-specific files/assets/reports/evidence are byte-identical.

## Fresh production-built evidence

[Before/after comparison board](clinician-evidence/review.html) · [Rendered board](clinician-evidence/review.png) · [Geometry, format, focus/reflow and source hashes](clinician-evidence/after/checks.json) · [Exact inventory/preservation](clinician-evidence/preservation.json).

| Evidence | English | Arabic RTL |
| --- | --- | --- |
| Desktop 1600×1000 | [EN](clinician-evidence/after/desktop-en.png) | [AR](clinician-evidence/after/desktop-ar.png) |
| Full page | [EN](clinician-evidence/after/full-en.png) | [AR](clinician-evidence/after/full-ar.png) |
| 1280px structure | [EN](clinician-evidence/after/1280-en.png) | [AR](clinician-evidence/after/1280-ar.png) |
| 200% text | [EN](clinician-evidence/after/text-200-en.png) | [AR](clinician-evidence/after/text-200-ar.png) |
| Keyboard focus | [EN](clinician-evidence/after/focus-en.png) | [AR](clinician-evidence/after/focus-ar.png) |
| Text-only authentication bootstrap | [EN](clinician-evidence/after/boot-en.png) | [AR](clinician-evidence/after/boot-ar.png) |
| Documentation loading | [EN](clinician-evidence/after/loading-en.png) | [AR](clinician-evidence/after/loading-ar.png) |
| Read error | [EN](clinician-evidence/after/error-en.png) | [AR](clinician-evidence/after/error-ar.png) |
| Access redacted | [EN](clinician-evidence/after/redacted-en.png) | [AR](clinician-evidence/after/redacted-ar.png) |
| No draft selected | [EN](clinician-evidence/after/empty-en.png) | [AR](clinician-evidence/after/empty-ar.png) |
| Signed private + released summary / history | [EN](clinician-evidence/after/signed-en.png) | [AR](clinician-evidence/after/signed-ar.png) |
| Closed visit / immutable signed sources | [EN](clinician-evidence/after/closed-en.png) | [AR](clinician-evidence/after/closed-ar.png) |
| Independent released follow-up / desired window | [EN](clinician-evidence/after/follow-up-en.png) | [AR](clinician-evidence/after/follow-up-ar.png) |
| Uncertain private command / explicit retry | [EN](clinician-evidence/after/uncertain-en.png) | [AR](clinician-evidence/after/uncertain-ar.png) |
| Long entered narrative | [EN](clinician-evidence/after/long-en.png) | [AR](clinician-evidence/after/long-ar.png) |
| Separate summary sign/release review | [EN](clinician-evidence/after/release-review-en.png) | [AR](clinician-evidence/after/release-review-ar.png) |
| Independent Review & Close acknowledgement | [EN](clinician-evidence/after/close-review-en.png) | [AR](clinician-evidence/after/close-review-ar.png) |
| Actual V1 before / 1600×1000 | [EN](clinician-evidence/before/desktop-en.png) | [AR](clinician-evidence/before/desktop-ar.png) |
| Actual V1 before / full page | [EN](clinician-evidence/before/full-en.png) | [AR](clinician-evidence/before/full-ar.png) |

Before captures were taken from the production build before any product-source edit. The capture script refuses a new before capture unless the original source matches the implementation base. After captures use the production-built **actual Live route and adapters**, with controlled HTTP responses. They are not visual mockups or the isolated documentation preview. Runtime source hashes and the build ID accompany the captures. The V1 before and master after use the same default synthetic source projection. Full-page images retain normal product layout; 200% proof doubles computed text sizes without changing the viewport. The context rail moves below authoring at enlarged text sizes to preserve content; native scrolling remains available.

## Visible-value provenance

| Visible content | Actual evidence source / limit |
| --- | --- |
| Ahmed Mostafa; Dr. Mariam Hassan; Nile Care Clinic | Existing `apps/web/src/lib/mock/fixtures.ts` profile/directory values, reused through `myCareDemoState()` in the browser-only fixture. Live IDs are canonical synthetic UUIDs. DOB/sex present in the general fixture are deliberately **not** sent to this booking/documentation workspace or displayed. |
| Scheduled/opened visit, timezone, OPEN/CLOSED, booking state | Controlled close browser fixture's existing `2026-10-31T10:00:00Z`, Africa/Cairo and canonical identity pattern, assembled into the accepted Live response shapes. These are **synthetic HTTP fixture values**, not observed production appointments or server events. CLOSED uses consultation version 2 / booking version 3. |
| Private complaint, private canary, summary text | Existing real-documentation browser test strings (`Private complaint only`, `SYNTHETIC_PRIVATE_LIVE_CANARY`, `Synthetic summary NOT_REVIEWED`, `Shared human complaint`) projected as explicit synthetic saved sources. No clinical diagnosis or recommendation is fabricated. |
| Draft/signed/released/history/allergy states | Explicit controlled versions in the accepted read shape. Signed examples preserve a prior immutable draft and a separate signed/released version. Allergy is explicitly NOT_REVIEWED, never inferred no-known. Empty/unloaded sources are described as unselected; missing source allergy metadata is omitted. |
| Follow-up content / desired window | Existing follow-up presentation fixture's synthetic instruction and November window, with an explicit draft and separate release. This remains a preference, not a booked appointment. The original source timezone governs window times; release-date metadata lacking a clinical timezone is labeled UTC. |
| Long EN/AR narrative | Clearly synthetic, manually entered stress text. It is preserved literally and is never saved or used as a clinical finding/suggestion. |
| Navigation, privacy purposes, loaded-source labels, independence reminder | Structural copy in `clinician-consultation-copy.ts`, using accepted IA and existing command/content catalog. These are interface explanations, not patient facts. |
| Initials | Derived from the supplied patient display name only. Account uses a neutral existing user glyph. The brand link is text only. |

All review data is synthetic. Controlled HTTP presentation verifies rendering/adapter behavior and the requested states; it does **not** establish real backend persistence, production authority or production-data parity. Existing real PostgreSQL/browser proof remains a separate required CI gate. No fixture flag, preview route or clinical source is added to the application runtime.

## Validation and preservation

Production frontend build, standalone generated-route TypeScript check, affected frontend/support-script lint, **162 UI tests**, the complete existing browser regression plus the new Clinician master checks, production screenshot assertions, repository documentation/reference sanity and exact-base preservation: **PASS**. Remote exact-head CI is reported separately in the final handoff; local controlled screenshots are not backend persistence proof.

The new browser checks verify inherited family/geometry, exact local anchors, reflow down to 320px, sticky focus clearance, direct allergy-section navigation, private/summary separation, no pre-auth clinical fields, text-only bootstrap, explicit unchanged retry body/key and erasure of the new rail on access denial. Existing state/privacy/role/booking/documentation/follow-up/close tests remain. Capture assertions additionally verify 1280px, 200% text, visible 3px focus, Latin digits / 24-hour time with explicit source timezone/offset, absence of private content in summary release review, independent close acknowledgement and unchanged long entered text.

The preservation checker verifies **1071 other existing files**, including **124 prior Patient evidence files**, against the exact base. It canonicalizes Application after removing only the two route presentation branches, then compares every original JSX event handler, state/resource/effect hook and service call in the four affected clinical components. The new presentation context holds a boolean only; it does not contain authority, actor, clinical content or a service snapshot. All API/adapters/clinical model files, backend/OpenAPI, database/schema/migrations, authorization/security, other workspace implementations, dependencies, CI and hosting are byte-identical. Source hashes also bind the captures to the final product files.

The exact resulting head, PR and actual remote CI result live in the PR/final handoff to avoid a self-referential evidence commit. The review PR is stacked on the unchanged Patient review baseline, so it does not duplicate Patient implementation changes in its review diff. No main/Patient merge or deployment is performed.

## Discrepancy register

| Difference / limit | Classification | Disposition |
| --- | --- | --- |
| People in your care has no integrated frontend destination. | Intentional / source-required; existing integration debt | Accepted label is visible but explicitly unavailable, with no active fabricated directory or repurposed summary lookup. Separate integration authorization remains necessary. |
| 72px header + 1px border; context about 100px EN / 104.4px AR; columns 200/790/280 with 24px gaps. | Intentional / nominal geometry | Follows the written approximate geometry and inherited application grid. There is no supplied clinician pixel reference or pixel-perfect claim. |
| Outline collapses before the rail, then rail stacks at enlarged text/narrow widths. | Intentional / accessibility and scope | Preserves identity, source purposes and controls. This is structural sanity, not approval of a full clinician mobile redesign. |
| Documentation remains independently permitted after closure under current authority. | Intentional / contract-required | CLOSED lifecycle and signed-source read-only state are clear; no new blanket lock contradicts accepted clinical contracts. Close still does not save/sign/release. |
| Loaded-source states do not copy unsaved editor changes or invent an unloaded follow-up state. | Intentional / truth and privacy | The rail labels saved selected sources; independent follow-up remains reachable and retains its own actual read/state surface. |
| Master dates use approved Patient Latin-digit/24-hour formatters; existing structural section ordinals remain in the accepted Arabic catalog. | Intentional / content contract | No event, timezone, source order, entered text or operation payload changes. Follow-up chronological direction is explicitly isolated. |
| Other clinician destinations, generic login and other portals retain prior presentation. | Intentional / scope | No wider rollout, integration, final logo/Brand/Design System freeze or deployment. |
| Chromium author checks do not certify native-device, cross-browser, assistive technology or independent Arabic acceptance. | Unresolved review coverage | Independent visual/product/security review and explicit owner visual acceptance remain mandatory. |

## Health and next gate

The bounded author checks establish no new P0/P1 foundation defect; existing integration, native/assistive/research and deployment-parity debt remains unchanged. The unintegrated People destination and prescription authoring boundary remain explicit rather than being filled with invented capability. This is a single review candidate, not a wider frontend or clinical milestone approval.

**Independent visual/product/security review: PENDING. Product Owner visual acceptance: PENDING.** Technical Green is not visual approval. Keep the Clinician review open/unmerged/auto-merge off, and keep Patient PR #79 unchanged/open/unmerged/auto-merge off. No deployment.

Reproduce after the normal production build with a local server at 127.0.0.1:3235: `node scripts/capture-clinician-master.mjs`, `EH_UI_CHROMIUM=/usr/bin/chromium node scripts/test-ui-browser.mjs`, `node scripts/check-clinician-master-preservation.mjs` and the existing build/type/lint/UI/doc gates. The before-capture guard requires the original product source. No dependency or CI policy change is needed.
