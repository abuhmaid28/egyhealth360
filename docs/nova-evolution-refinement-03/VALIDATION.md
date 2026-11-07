# Technical validation — NOVA refinement 03

Subject: one static Arabic/RTL, synthetic, disconnected Patient My Care specimen. Base main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; comparison source PR #91 at `e760ed4332ffca876702b32f6ffd4b1787d20783`. [Rationale/provenance](README.md), [independent visual and technical review](INDEPENDENT_REVIEW.md).

## Actual browser evidence

Chromium **154.0.8037.57**, Linux, installed Playwright, DPR 1. Primary screenshot viewports are 390×844 and 1440×1050; both exports show the full page. No generated interface image is substituted for HTML/CSS/SVG rendering.

| Width | Computed text scale | Full height | Document overflow / sampled text clipping |
| --- | --- | --- | --- |
| 390px | 100% | 2002px | 0 / 0 |
| 1440px | 100% | 1277px | 0 / 0 |
| 320px | 100% | 2180px | 0 / 0 |
| 390px | 200% | 4790px | 0 / 0 |
| 320px | 200% | 5430px | 0 / 0 |
| 1440px | 200% | 2220px | 0 / 0 |

[Raw six-case browser results](evidence/browser-results.json). Text scale doubles each element's computed font size, including small nested labels; it is not native browser zoom. Essential copy and controls wrap. All three local font faces load in every case. One H1, Arabic language/RTL, natural DOM reading order, isolated Latin names/time/offset, and actual Cairo offset are verified. Decorative calendar art may be omitted at intermediate widths; the full factual date remains in text.

All seven preview actions pass Enter, forward and reverse Tab containment, Escape and return to opener. The skip link has visible focus and reaches main. Measured link/button targets are at least 44×44px; main and source phone actions are at least 52px high. Focus is a visible 3px lime outline with a dark separation layer on all surfaces. The independent report separately checks actual traversal and the corrected avatar/heading at enlarged text.

[Contrast evidence](evidence/contrast.json): **122 sampled text observations**, minimum **6.90:1**, zero sampled failures under the conservative 4.5:1 text threshold. Mobile and desktop visible direct text, dialog close control, explicit lightest appointment-gradient endpoint and four actual focus backgrounds are included. Minimum sampled focus/surface ratio is **9.69:1**. Nearest opaque ancestor/gradient-endpoint sampling is bounded; it does not certify every pixel, icon or decorative border.

[Motion evidence](evidence/motion.json): normal button/arrow transitions are 140ms; reduced-motion preference makes transitions 0s and scrolling automatic. Hover feedback changes appearance without changing any clinical state. No continuous orbital animation. Loading/empty/error variants are outside this one normal-state brief; no fake loading capability is added.

**Zero external request attempts, failed asset responses, console errors or page exceptions** across the six layout cases. All browser specimen requests are local GETs. CSP explicitly sets `connect-src 'none'`; no API, persistence, booking, clinical command or automatic retry exists. Preview dialogs disclose the disconnected specimen.

## Corrections and content preservation

Independent review caught patient initials overflowing their fixed decorative avatar at 320px/200%. Font-relative minimum dimensions and a fitting line height correct it. The additional 1440px/200% test exposed a tight H1 ink box; increasing its line height corrects that without shrinking type. Fresh final captures and all six layout cases were generated after these fixes.

[Preservation check](evidence/preservation.json): **1,421 pre-existing tracked files** are byte-identical to main, excluding only minimal `CURRENT_STATUS.md` and `SOURCE_OF_TRUTH.md` notices. This includes frontend, backend, API, schema, migrations, dependencies, CI, accepted contracts and historical screenshots. All original visible body text equals pinned PR #91 after excluding the removed doctor initials and revision marker; preview JavaScript is byte-identical. Original before PNG bytes are read from Git and verified by [comparison fingerprints](evidence/comparison-sources.json), without adding duplicate before images. PR #91's remote head is separately rechecked at delivery.

Source, full captures, one comparison, compact documentation and reproducible evidence are isolated under `docs/nova-evolution-refinement-03/`; only two current-document notices sit outside. No other portal or direction is produced. Fonts and OFL notices are copied unchanged from PR #91.

## Repository checks and final remote gate

Local checks: six browser cases; seven keyboard preview actions; normal/reduced motion; contrast sampling; visible-copy/preview equality; local references; historical/runtime preservation; JavaScript syntax and specimen/tool ESLint with the unchanged repository configuration; existing **30/30 CI-policy tests**; repository Markdown/reference checker; complete-range whitespace check. Native-device, screen-reader, English-parity and cross-browser testing are not claimed.

Required CI is run on the final committed HEAD in a new Draft PR. Actual run URL, exact SHA and per-job results are recorded in its handoff rather than substituting PR #91's earlier green run. The unchanged classifier treats new static specimen paths as unmapped and selects full regression, including frontend/backend/PostgreSQL/Docker/dependency gates. No policy is changed or skip invented. Local Node is 24.19.0; remote CI uses the repository's pinned Node/pnpm setup. No dependency or lockfile is changed. The pinned repository ESLint tool versions were installed only in a temporary scratch tool directory for local lint; they were not added to the project.

## Limits and stop boundary

This is bounded Chromium evidence, not full WCAG certification, native browser zoom, patient research or production readiness. English visual parity, wider states, screen readers, native devices, Egyptian editorial/participant validation and cross-browser checks remain untested. The phone is 221px longer than PR #91 because navigation and readable secondary text have more space. Independent aesthetic judgment and Product Owner acceptance remain separate from technical Green.

Keep the delivery Draft/Open/Unmerged, auto-merge off. No deployment, promotion, alias, final branding/system freeze or automatic finalist validation. Stop for Product Owner review.
