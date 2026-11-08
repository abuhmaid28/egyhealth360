# Dark-first study — executed checks and limits

Subject: synthetic, disconnected Patient My Care. System Chromium **154.0.8037.57**, installed Playwright, device scale 1. [Independent three-gate review](INDEPENDENT_REVIEW.md) is separate from author checks and final-head repository CI. No Product Owner selection or full accessibility certification is inferred.

## Author evidence

| Check | Actual executed result |
| --- | --- |
| Responsive/state matrix | **96 PASS**: Arabic/English × normal/loading/empty/error/no-sources/unavailable × 320/390/768/1440px × 100%/200% computed text. No document/element horizontal overflow or sampled essential clipping. [Raw matrix](evidence/browser-results.json), [asserted facts](evidence/assessment.json). |
| Text enlargement | Visible direct-text samples measured exactly 2×, with content-driven reflow. This is not native browser zoom. Emergency English word wrapping at320/200% remains an inherited minor limitation, independently reproduced in #98. |
| Keyboard/focus | **18 cases / 86 actions PASS**: skip link, named native controls, visible 3px focus, modal heading/top focus, Tab/Shift+Tab containment, Escape and opener return. Minimum measured visible target **48px**. |
| Contrast | **6,396 rendered text/icon observations**: both minima **5.73:1**, zero failures. Rest, available hovers and dialogs across both locales/six states. **10 explicit non-text pairs**, minimum **3.28:1**, covering focus, selection underline, control/icon boundaries and hover. [Contrast evidence](evidence/contrast.json). |
| Projection guards | **8 stalled-script +2 no-JS cases PASS**. Initial shell hidden/inert until requested state; localized fallback when JavaScript is disabled. |
| Reduced motion | **4 cases PASS**: both locales × normal/reduced preference. Static skeleton; reduced preference removes transitions and smooth scroll. [Runtime evidence](evidence/runtime.json). |
| Browser/network | No page/console errors, failed HTTP responses or external requests in96 cases. Local fonts/actual symbol loaded, correct RTL/LTR, one main/H1, valid label references and named AX controls. |
| Clinical/source meaning | Exact #94 instants `2026-11-12T14:30:00+02:00` / `2026-11-12T15:00:00+02:00`, 30minutes, Africa/Cairo; ordinary Patient12-hour convention retained. Booking is logistics, recommendation is not booked, summary/follow-up stay independent, history bounded, prescriptions unavailable. |
| Comparison board | All four #98 reference PNGs copied unchanged; all four new actual captures at matched native widths, scaled proportionally with no crops. Full board renders without broken images, failed responses, page errors or horizontal overflow. [Board geometry](evidence/board-results.json). |

Solid ancestor backgrounds are resolved for sampled foregrounds; no authored UI gradients. Original logo gradients remain unchanged and are not treated as ordinary UI-text contrast evidence. Decorative rules/calendar repeat/inner arrow separator/static skeleton do not carry sole control or state meaning. Focus uses a3px pale-gold outline,4px offset and2px dark separation; contrast is checked against adjacent dark surfaces. Actual text labels, icon strokes, selected edge and essential control boundaries are checked.

The contrast pass includes final stronger control boundary `#85AAB3` and lighter secondary hover foreground `#8BE8DD`. An initial boundary was marginal/failing on selected/hover surfaces; it was corrected rather than waived. Secondary hover text initially passed narrowly at4.54:1; the final role raises it to5.73:1. Independent checks remeasured the final actual hover. These color-only refinements did not change geometry; final renders and review hashes match the retained candidate.

## Independent evidence and observed tradeoffs

The separate reviewer inspected all four actual final screenshots and four matched #98 references, the comparison board, and used its own harness. Actual independent checks:16normal responsive/enlarged layouts,10state checks,14enlarged modal actions,4motion cases,2no-JS and2stalled-script checks, actual normal/hover/focus/boundary samples. See the [independent report](INDEPENDENT_REVIEW.md), [raw browser results](evidence/independent-browser.json), [follow-up/reference checks](evidence/independent-followup.json), [reviewed artifact hashes](evidence/independent-reviewed-artifacts.json).

Independent verdicts are scoped Visual PASS FOR OWNER REVIEW, Functional UX PASS WITH LIMITS, Technical PASS FOR EXECUTED CHECKS. They do not choose Dark-first over Light-first. Desktop becomes a paired appointment/source workspace; mobile stays in its accepted reading order. Native normal page heights: AR mobile1967px vs #98 1957px; EN mobile2218px vs2207px. AR desktop1260px vs1334px; EN desktop1247px vs1316px. Height differences are measured geometry, not task-time or usability scores. [Assessment](ASSESSMENT.md).

IR01: English320px/200% long words may fragment and vertical travel is substantial. All content/actions remain available; matched #98 shows the same limitation. No overflow hiding, essential truncation or clinical-copy rewrite was used. No observed blocking Dark-first-specific regression remains in the executed checks.

## Scope, local gates and exact-head CI

Existing CI-policy/event tests: **30/30 PASS**, none skipped. All isolated JS/MJS syntax and complete-diff whitespace checks pass. Local repository document classification/reference gate is run on the staged final candidate. Local ESLint dependencies are absent; the unchanged remote repository lint/build/test gates must validate the exact final head. No gate is bypassed or narrowed.

[Preservation](evidence/preservation.json) compares every baseline file byte-for-byte except CURRENT_STATUS, SOURCE_OF_TRUTH and IMPLEMENTATION_ROADMAP. All other production/frontend/backend/API/authentication/database/migrations/clinical/privacy/dependency/CI/history files remain unchanged. PR #98's branch/artifacts are preserved at the pinned head; this branch begins on main and imports no #98 history. Source assets/script and four copied reference PNGs match pinned Git bytes. [Provenance](evidence/provenance.json), [package artifact hashes](evidence/artifact-hashes.json).

Final commit, actual remote workflow/run/attempt, every selected job conclusion and final Draft/open/unmerged state belong in the PR handoff. Older #98 CI is not this candidate's CI. The existing classifier conservatively selects full regression for isolated HTML/CSS/assets; no CI policy/configuration is changed. CI Green cannot decide art direction or close brand gates.

## Explicit NOT TESTED limits

Native browser zoom is **not established**: actual headless Ctrl+= did not change measured viewport/DPR/visual scale. Computed200% text is reported separately. Real screen readers/announcement timing, physical devices/touch/OS scaling/glare, Firefox/WebKit/Safari, human Egyptian editorial/participants, long-reading comfort and long clinical content are untested. No native-device or WCAG certification claim.

No production/server authorization, actual booking/retrieval/clinical mutation, real data/network workflow, four other portals or complete Design System component inventory is tested. Raw static fixtures contain synthetic normal facts; hidden/inert rendering and suppressed source regions are presentation evidence, not secure server payload redaction.

**DP01 and DP02 remain OPEN.** No Arabic source lettering, selected logo geometry/gradient or tagline is changed. No source lockup correction, final Brand V2, Design System V2 approval, merge, auto-merge or deployment. Existing installed free tools/bundled OFL assets only; no paid API/service/subscription/asset or dependency installation.

## Reproduce

Serve the repository root: `python3 -m http.server 8765 --bind 127.0.0.1`. From root, run the isolated tools in order: `validate.mjs`, `assess.mjs`, `contrast.mjs`, `runtime.mjs`, `boards.mjs`, `preserve.mjs`. Installed Playwright resolves through createRequire; system Chromium is `/usr/bin/chromium`; SPECIMEN_ORIGIN/CHROMIUM_PATH may select local alternatives. Independent harnesses are retained as evidence and record their exact local paths. No production service is needed.

Stop for owner visual review of the four screens and comparison. No automatic next sprint or direction selection.
