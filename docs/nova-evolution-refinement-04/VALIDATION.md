# Technical validation — NOVA refinement 04

One disconnected Arabic/RTL Patient My Care design/content specimen. Main/base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; preserved visual source PR #92 at `6e1d5aa011d2e229f17e22415bf3efe0aa035c49`. [Rationale](README.md), [writing note](EGYPTIAN_ARABIC_UI_WRITING_NOTE.md), [independent V/C/T review](INDEPENDENT_REVIEW.md).

## Browser and interaction evidence

Chromium **154.0.8037.57**, Linux, installed Playwright, DPR 1. Full primary PNGs use 390×844 and 1440×1050 viewports. The comparison reads before-image bytes directly from pinned Git; it shows both complete phones and complete scaled desktops. No generated image substitutes for rendering.

| CSS width | Computed text | Full page height | Overflow / sampled text clipping |
| --- | --- | --- | --- |
| 390px | 100% | 1907px | 0 / 0 |
| 1440px | 100% | 1295px | 0 / 0 |
| 320px | 100% | 2078px | 0 / 0 |
| 390px | 200% | 4283px | 0 / 0 |
| 320px | 200% | 4984px | 0 / 0 |
| 1440px | 200% | 2002px | 0 / 0 |

[Six-case results](evidence/browser-results.json): zero final offscreen bounds/scroll clipping, page/console errors, failed asset responses or external request attempts. All three local fonts load in every case. One H1, Arabic/RTL, isolated Latin names/numbers, natural source order and chronological times remain. Each element's computed text is doubled independently; this is not native browser zoom.

All seven existing preview actions pass keyboard Enter, Tab/Shift+Tab containment, Escape and opener focus return. Visible skip navigation reaches main. Controls measure at least 44×44px; main/source phone actions at least 52px high. Visible 3px focus uses a dark separation layer. [Motion](evidence/motion.json): normal button/arrow transitions 140ms, reduced preference 0s with automatic scrolling; no continuous animation. No extra screen/state or real operation is introduced.

[Contrast](evidence/contrast.json): **122 sampled text observations**, minimum **6.90:1**, zero sampled text failures. Explicit lightest appointment-gradient colors and canvas/appointment/source/dialog focus backgrounds are included; minimum focus/surface sample **9.69:1**. Sampling is bounded and does not certify every icon, border or pixel.

## Explicit content and identity checks

[Rendered content checks](evidence/content-checks.json) verify:

- Main visible text has **no UTC/offset notation, Cairo label, or 24-hour appointment time**. The closed dialog is excluded by actual rendered text rather than deleting timezone evidence.
- Both identity marker text contents are empty: decorative profile/doctor glyphs, with full factual names/clinic next to them. No patient/doctor initials, credential seal or verified identity claim.
- **20 icon instances** resolve to the local symbol definitions, all using computed **1.65px** stroke. An initial check caught old 1.4/1.5 stroke overrides; these were corrected, then captures/evidence regenerated.
- Visible start **2:30 مساءً**, end **لحد 3:00 مساءً** correspond to original `2026-11-12T14:30:00+02:00` and `2026-11-12T15:00:00+02:00`: **12:30Z→13:00Z**, 30 minutes, `Africa/Cairo`. Stored/semantic time truth and chronology do not change. Full date/year remain; the month is stronger.
- Main booking helper retains “booking alone”; existing appointment detail retains clinical-access meaning and patient approval + doctor acceptance for a new care request. It does not assert that existing legitimate care access is absent.
- Recommendation is separate from a booked appointment, missing association stays qualified **هنا**, summary remains doctor-shared, history bounded, Rx unavailable specifically in the preview, specimen honesty visible.

Editorial quality cannot be established by token assertions. The separate reviewer judges Egyptian naturalness, formality, visual quality and semantic consequences independently; [writing note](EGYPTIAN_ARABIC_UI_WRITING_NOTE.md) documents the owner-directed rule and scoped amendment to older presentation examples. Recorded clinical/source text and policy are not rewritten.

All specimen requests are local GETs; CSP has `connect-src 'none'`. No API, storage, booking, clinical mutation, retry or fake Live service. Dialog copy explicitly says it is a preview with no real operation.

## Preservation, repository gates and limits

[Preservation](evidence/preservation.json): all **1,421 pre-existing tracked files**, excluding only minimal current-status/source-index notices, are byte-identical to verified main. Production frontend/backend, API/OpenAPI, schema/migrations, dependencies, CI, accepted contracts and historical evidence are untouched. PR #92 remains at its pinned head; before-image [fingerprints](evidence/comparison-sources.json) match original Git bytes. New content/source/evidence is confined to `docs/nova-evolution-refinement-04/`.

Local gates include actual browser/content/contrast/motion checks, all required semantic facts, local symbol/asset references, JavaScript syntax and unchanged-config ESLint, existing **30/30 CI-policy tests**, Markdown/reference classification, complete-range whitespace and preservation. Local Node is 24.19.0; remote CI uses the repository's pinned setup. Existing scratch-installed pinned lint tools are reused; no project dependency/lockfile changes.

Required final committed-head CI and actual per-job results/run URL are recorded in the Draft PR handoff. The unchanged classifier selects full regression for new static specimen paths; no invented skip or policy edit. PR #92's green run is not substituted. No source/image changes follow final CI.

Remaining limits: no native Egyptian participant/editorial study, native-device, native zoom, screen-reader, cross-browser, English parity or wider-state validation. No WCAG certification, measured comprehension, final brand/system or production-readiness claim. The familiar two-panel source layout and low quick-destination placement remain owner-review considerations. Keep Draft/Open/Unmerged with auto-merge off; no deployment or automatic finalist validation.
