# Patient finalist — technical validation

Candidate scope: isolated [AR/EN specimens](README.md), based on main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; sole visual reference PR #93 `459037baa0d7c2e67fd95715bfca7999592dfd45`. This report proves a synthetic design specimen in system Chromium154.0.8037.57. It does not prove production integration, server authorization, complete WCAG conformance, final design acceptance or deployment parity.

## Executed checks

| Check | Actual result / evidence |
| --- | --- |
| Responsive and enlarged text | **96 PASS**: AR/EN × six states ×1440/768/390/320 ×100%/200% text; document width matches viewport, no sampled essential clipping. [Browser measurements](evidence/browser-results.json), [assertions](evidence/assessment.json) |
| 200% method | Root font16→32px, every visible direct-text computed size ratio measured2×. Layout allowed to grow vertically. This is **computed text scaling**, not native zoom |
| Keyboard / modal | **18 cases,86 actions PASS**: skip-to-main, Enter,3px visible focus, named modal, initial heading focus/top, Tab/Shift+Tab containment, Escape and opener focus return; narrow200% dialogs included |
| Touch targets | Minimum measured visible link/button dimension **48px**, excluding offscreen skip link; 44px floor passes. Static unavailable prescription row is not a control |
| Language and semantics | Correct `lang`/`dir`, one main/h1, valid accessible references and unique IDs, named links/buttons; CDP AX trees in96 cases. Loading has `aria-busy` with outside status text; failed read has alert. **AX inspection is not screen-reader testing** |
| Text contrast | Rendered AR/EN six states, resting/hover controls/modal; conservative lightest authored gradient endpoints. Minimum **7.05:1**, all samples≥4.5:1. [Contrast evidence](evidence/contrast.json) |
| Meaningful non-text | Original icon strokes minimum **6.46:1**; explicit focus/selected-nav/action-fill pairs≥3:1. Decorative orbit, separators, frame rules and skeleton do not carry sole meaning; exclusions recorded. This sample does not certify every future component |
| Reduced motion | AR/EN normal/reduced preferences:140ms control/arrow transitions normally,0s and automatic scroll under reduce. Static loading skeleton never animates. [Runtime evidence](evidence/runtime.json) |
| Initial state integrity | **8 stalled-script +2 JavaScript-disabled cases PASS**: shell remains hidden/inert before state projection; safe localized preparation/fallback. Normal-state facts are not briefly displayed for loading/error/no-shared/unavailable |
| Fact and state parity | Same instants:12:30–13:00Z,30minutes, Africa/Cairo; ordinary local2:30–3:00PM. No technical zone or24-hour strings on main. Loading/empty/error remove stale appointment facts; no-shared/unavailable remove source articles/provenance/counts; two released sources remain independent in normal. [Assessment](evidence/assessment.json) |
| Browser / network | No runtime/console errors, failed HTTP responses or external requests across96 cases. Self-hosted fonts load in intended locale; no paid API/asset/dependency |
| Scope preservation | **1,420 of1,423 pre-existing files byte-identical**, only CURRENT_STATUS, SOURCE_OF_TRUTH and IMPLEMENTATION_ROADMAP are authorized summary exceptions. Six copied CSS/font/license files match pinned #93 exactly. [Preservation](evidence/preservation.json), [artifact hashes](evidence/artifact-hashes.json) |

ARIA status/alert, accessible-name semantics and source projection are authored/inspected here; raw HTML/JS still contains synthetic normal fixtures. This is not a secure payload filter. A real app must retrieve only permitted data and enforce authorization on the server. No actual clinical content, signing/release action, booking mutation, automated follow-up, prescription, diagnosis or AI insight is implemented. Reload opens a labeled explanation of read-only recovery; there is no mocked successful service call.

## Findings corrected within this specimen

| ID | Finding | Fix / verification |
| --- | --- | --- |
| FX01 | Requested unavailable/loading/error state could flash normal facts while deferred script stalled | Hidden/inert initial shell and safe localized fallback until requested projection; independently retested stalled/disabled JS |
| TX01 | Long English follow-up heading clipped at320px/200% | Natural wrapping, no truncation or content removal; independently retested |
| TX02 | Duplicated decorative English month exceeded narrow tile at200% | Bound and wrap month inside tile; complete semantic appointment date retained; independently retested all six EN320/200% states |
| FX02 | Enlarged modal initially focused bottom close button and scrolled past context | Focus heading and reset scroll to start; retain keyboard trap/Escape/opener return; repeat keyboard matrix includes initial-title visibility |
| FX03 | Queued close handler could steal focus from the next control during rapid keyboard traversal | Preserve native restoration; fallback only if closed and focus is still inside dialog/body, never override a newer outside control or open dialog; repeat86-action traversal |

The clipping detector excludes `.sr-only` announcements intentionally rendered into a1px clipped region. Their contents are retained for accessibility; treating that deliberate mechanism as essential visible-text clipping would be a false positive. No horizontal-overflow hiding or clipped clinical copy was added.

## Exact NOT TESTED limits

| Unavailable check | Reason / remaining work |
| --- | --- |
| Native browser zoom | Genuine headlessCtrl+= probe did not change viewport/DPR/visual-viewport metrics; local extension `chrome.tabs.setZoom` probes with/without default extension blocking produced no worker. No DISPLAY, Xvfb or shared native controls. Native200% zoom remains **NOT TESTED** |
| Firefox / WebKit / Safari | No supported executables installed; no claimed cross-engine result |
| Real screen readers | No Orca/NVDA/VoiceOver environment; no spoken-output or announcement-timing claim |
| Physical phones/tablets, touch, OS text settings | CSS viewports and measured targets only; no hardware/gesture/glare result |
| Native Egyptian editorial / participants | No human editor/participant session; Professional Egyptian Arabic is an authored candidate, not native certification or measured comprehension |
| Production integration / authorization | Disconnected static specimens; application/backend/contracts unchanged |
| Broad Design System / four other portals | Outside this gate; compatibility provisional, no freeze or rollout |

These gaps remain in later acceptance planning; none is silently converted to PASS. [Independent Visual / Functional UX / Technical verdicts](INDEPENDENT_REVIEW.md) are separate and do not substitute for owner approval. Brand V2 remains blocked until actual identity approval; Design System V2 follows Brand.

## Reproduction and final CI

Use existing repository Playwright with system Chromium, serve the repository root locally, then run `node docs/patient-finalist-validation/tools/validate.mjs`, `assess.mjs`, `contrast.mjs`, `runtime.mjs`, `boards.mjs` and `preserve.mjs` from the repository root. `SPECIMEN_ORIGIN`/`CHROMIUM_PATH` can select the available local environment. No installer is required. `boards.mjs` places temporary HTML under `/workspace/work/patient-finalist/boards` and commits only the two board PNGs.

Focused repository checks: CI policy/event tests, changed-specimen ESLint, document classification/local links, scope/hash preservation and `git diff --check`. Existing classifier conservatively selects full regression for unmapped isolated HTML/CSS/assets; no CI policy/configuration is altered. Exact final commit, all actual remote job conclusions and run link are recorded in the Draft PR handoff, so this report does not embed a self-referential commit hash or reuse prior CI as final evidence. CI Green is technical evidence only. No merge, auto-merge, deployment, alias or production promotion is authorized.
