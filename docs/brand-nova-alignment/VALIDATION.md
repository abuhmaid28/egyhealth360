# Focused validation — unified Brand-to-NOVA study

Disconnected synthetic specimens only. No production frontend, backend, API, database, clinical/privacy contract, CI configuration or deployment change. [Independent review](INDEPENDENT_REVIEW.md) supplies separate Visual / Functional UX / browser Technical verdicts. Neither technical Green nor reviewer PASS supplies Product Owner approval.

## Actual browser results

System Chromium **154.0.8037.57**, headless Playwright, device scale 1. Serve repository root locally at 127.0.0.1:8765. [Raw matrix](evidence/browser-results.json), [asserted assessment](evidence/assessment.json), [contrast](evidence/contrast.json), [runtime guards/motion](evidence/runtime.json).

| Check | Executed result |
| --- | --- |
| Responsive/state matrix | **96 PASS:** Arabic/English × normal/loading/empty/error/no-sources/unavailable × 320/390/768/1440 CSS px × 100%/200% computed text. No document/element horizontal overflow or sampled essential text clipping. |
| Text enlargement | Every sampled visible direct-text computed size is exactly doubled; full content reflows, navigation wraps into rows, source body gets a full row when needed. Not native browser zoom. |
| Semantics | Correct locale/direction, one main/H1, valid label references, named accessibility-tree controls, loaded Inter/Plex; no duplicate IDs. AX-tree inspection is not real screen-reader evidence. |
| Keyboard | **18 cases / 86 actions PASS**: actual Tab/Enter skip link, visible 3px focus, modal heading/top focus, Tab/Shift+Tab containment, Escape and opener return. Minimum measured action target **48px**. |
| Contrast | **6,396 rendered observations**, text and icon minimum **5.68:1**, no failures. Rest, available control hovers and dialogs in both languages/all six states. Explicit focus, selected navigation, action fill and control-boundary pairs exceed 3:1. |
| Initial projection | **8 stalled-script + 2 no-JS guards PASS**. Shell hidden/inert until requested state; localized fallback when JS is disabled. |
| Motion | **4 cases PASS**: both locales × normal/reduced preference. Static skeleton; reduced preference removes transitions/smooth scroll. |
| Browser/network | No page/console errors, failed HTTP responses or external requests in 96-case matrix. Fonts/assets local; no connect capability. |
| Same clinical meaning | Same exact appointment instants, 30 minutes, Africa/Cairo; ordinary Patient 12-hour convention retained from #94. No booking-created clinical access; independent released sources and bounded history. |
| Privacy states | Loading/read error remove stale appointment facts; no-sources/unavailable remove shared-source articles/provenance/counts/private hints. Raw files still contain synthetic fixtures; no server redaction claim. |

Contrast sampling resolves solid ancestor backgrounds. Candidate UI uses no gradients; actual logo gradient artwork is preserved and excluded from UI-text compliance measurements. Decorative gold date repeat, divider rules, loading skeleton and inner arrow separator do not carry sole state or control-boundary information. Explicit semantic status pairs on the proposal board were independently recomputed by the reviewer; they do not introduce clinical rules.

Primary evidence: [AR390](evidence/normal-ar-390-full.png), [AR1440](evidence/normal-ar-1440-full.png), [EN390](evidence/normal-en-390-full.png), [EN1440](evidence/normal-en-1440-full.png), [comparison](evidence/comparison.png), [visual language](evidence/visual-language.png), [AR320 text200](evidence/text200-ar-320.png), [EN320 text200](evidence/text200-en-320.png), [AR focus](evidence/focus-ar-390.png), [EN focus](evidence/focus-en-390.png). Comparison pairs show full-page images at equal scale within each size pair; both prior images are exact #94 copies.

## Findings corrected before delivery

| Finding | Correction / final evidence |
| --- | --- |
| English mobile duplicate calendar month broke awkwardly | Omit duplicate narrow English month; full semantic date remains. Final actual EN390 checked independently. |
| English320/200 identity and long source label overflow | Remove fixed 60px identity cap, constrain/wrap metadata, let source body take a full row on enlargement; final 96 cases and independent recheck pass. |
| Arabic320/200 navigation word fragmentation | Content-based flex wrapping places full controls into rows before breaking labels. |
| Enlarged introduction wasted width | Removed fixed narrow measure; content-based flex sizing uses a whole line when needed. |

No horizontal overflow hiding, essential-text truncation or clinical-copy rewriting was used to obtain these results. Extreme enlargement remains tall; the duplicate date tile is decorative and may disappear at narrow widths. Measured layout success is not participant task-efficiency evidence.

## Repository and provenance

Existing CI-policy/event tests: **30/30 PASS**, no skipped cases. All changed JS/MJS syntax checks and whitespace checks pass. Local ESLint packages are absent in this checkout; unchanged remote repository lint/build gates must run on the final head. Local document classification/reference gate runs after staging the final artifacts. [Preservation report](evidence/preservation.json) checks every baseline file byte-for-byte except the three permitted governance summaries; [provenance](evidence/provenance.json) verifies copied symbol/font/license/script/prior-PNG bytes and pinned playbook/reference hashes. [Complete package hashes](evidence/artifact-hashes.json).

This directory is isolated. Only CURRENT_STATUS, SOURCE_OF_TRUTH and IMPLEMENTATION_ROADMAP change outside it. PR #94/#96/#97 artifacts/heads remain preserved; none is merged or imported as branch history. No dependency/lockfile/CI/tool installer change. Existing free tools and bundled OFL assets only; no new paid service/API/asset purchase.

Exact final commit and remote CI run/job results belong in the Draft PR handoff, avoiding a self-referential commit hash in committed documents. The unchanged classifier conservatively selects full regression for these isolated static assets. No gate is weakened or assumed successful; prior heads' CI is never used as this candidate's result.

## Explicit untested limits

- **Native browser zoom:** actual headless Ctrl+= probe did not change metrics. Native zoom is not established by this run. Computed doubled text is reported separately.
- **Real screen readers/announcement timing, physical devices/touch/glare/OS text settings, Firefox/WebKit/Safari:** not exercised; no certification claim.
- **Human Egyptian editorial or participant comprehension:** no human review session. Egyptian Arabic is an authored candidate assessed by a separate agent, not native-speaker certification.
- **Production integration/server authorization:** disconnected static specimen, no service calls or runtime verification. All normal fixtures are synthetic.
- **Four other portals / full Design System:** no additional screens, dense clinical tasks, forms/tables/destructive flows or complete component inventory are validated.
- **Final brand/legal/print/installed-device approval:** outside scope. DP01 wordmark collision and DP02 tagline remain OPEN; no source lettering, slogan or symbol edits.

## Reproduce

From repository root, use the installed Playwright and `/usr/bin/chromium`; optional SPECIMEN_ORIGIN and CHROMIUM_PATH select local alternatives. Start `python3 -m http.server 8765 --bind 127.0.0.1`, then run the isolated tools in order: `validate.mjs`, `assess.mjs`, `contrast.mjs`, `runtime.mjs`, `boards.mjs`, `preserve.mjs`. Tools use createRequire to resolve the already provided runtime package without dependency changes. The independent reviewer used a separate harness and inspected actual rendered outputs.

Stop for Product Owner review of all four screens. Draft/open/unmerged/auto-merge off. No deployment, production implementation, wider rollout, Brand V2 finalization or Design System V2 freeze.
