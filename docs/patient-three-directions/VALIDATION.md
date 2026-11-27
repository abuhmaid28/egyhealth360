# Focused technical and governance evidence

Subject: three disconnected Arabic Patient My Care HTML/CSS/SVG proposals at [the package](README.md), based on main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. This evidence is not production integration or final design approval.

## Gate T — technical credibility

- Actual **Chromium 154.0.8037.57**, installed Playwright, Linux, device scale 1, localhost. Six full-page primary PNGs: each direction at 390×844 and 1440×1050 CSS viewport. The full-page PNG extends vertically to include all content; it does not claim to be a single mobile viewport.
- [Browser measurements](evidence/browser-results.json): 15 cases — each direction at 1440, 390 and 320px, plus computed **200% text at both 390 and 320px**. Zero document horizontal overflow, offscreen essential element bounds or measured scroll-box clipping in the final layouts. No fixed content heights, ellipsis or clinical text truncation. Enlargement increases page height and wraps labels rather than hiding facts.
- `lang=ar`, `dir=rtl`, Arabic source order and semantic headings verified. Dates use Latin digits, named Gregorian months, 24-hour ranges and isolated Latin clinic/time/offset. `Intl.DateTimeFormat` with `Africa/Cairo` verifies `UTC+02:00` for 12 November 2026. Every candidate has one h1 and named native buttons. Decorative duplicate calendar art is hidden from assistive reading; the full date remains textual.
- Existing local **Plex / Noto / Manrope** font faces load successfully. No Google Fonts or other external asset requests. Browser request log contains only local GETs; CSP has `connect-src 'none'`. No runtime/console errors or failed asset responses. Buttons only open local explanatory previews; no booking, clinical mutation, persistence or service call.
- Skip navigation, normal DOM tab order, visible 3px focus and all seven preview buttons per candidate are checked with keyboard Enter. Dialogs expose accessible heading, loop Tab on their single close action, close with Escape and return focus to the opener. Focus-return checks await the native close event. Native primary navigation remains an anchor to My Care plus a specimen-only Find care button. C's navigation uses 44px targets; all key mobile actions are at least 48px. Minimum enabled control dimensions are in the JSON.
- [Contrast observations](evidence/contrast.json): **178** direct-text observations including explicit lightest A gradient endpoint and dialog buttons; minimum **5.45:1**, zero sampled normal-text failures below 4.5:1. Candidate focus/canvas pairs are **16.92:1 / 6.00:1 / 7.00:1**, above 3:1. These are bounded text/focus samples, not every rendered pixel or a comprehensive non-text contrast audit.
- Reduced-motion emulation yields `scroll-behavior: auto`; no essential information depends on animation. Original SVGs are light decorative geometry; no charts, health scores, diagnostic meaning or AI capability.
- Source semantics are equal: independent booked appointment, separately attributed released follow-up, independently shared summary, bounded retrieval, unconnected prescriptions, and explicit bilateral-care permission boundary. No laboratory/AI/active medication module, private information or hidden source count.

## Findings corrected within this isolated scope

1. B's annotation arrow initially used an unsupported Unicode glyph. Replaced with original SVG and re-rendered.
2. Initial Arabic font ink exceeded some tight line boxes; Noto line heights and heading padding were expanded. At 200% text, B's heading and day numeral exceeded narrow columns; mobile headline scale and content-sized date column now preserve full labels/numerals.
3. A's enlarged heading exceeded a 320px container. Greeting shrink bounds and a narrow decorative-stop adjustment preserve content. Its large mobile orbit was reduced after independent critique.
4. C's mobile date capsule was narrowed and unused doctor/date spacing reduced, leaving more room for time/zone. Its source copy was increased for readability.
5. Independent critique found overly shared icon treatment. A now uses angular fine-stroke frames, B unframed print glyphs, C rounded node treatment. Grayscale boards retain the three distinct compositions.
6. The first keyboard harness sampled before asynchronous dialog close/focus return. It now waits for the actual event result; no test condition was weakened. A deterministic single-action Tab loop was added to the specimen dialog.

[Initial measurements](evidence/initial-measurements.json) retain the initial six-case results; final measurements supersede them. Independent review covers fresh images and records its own limitations.

## Gate G — governance and preservation

Only `docs/patient-three-directions/**`, a minimal `docs/CURRENT_STATUS.md` notice and `docs/SOURCE_OF_TRUTH.md` classification are changed. [Preservation report](evidence/preservation.json) compares every pre-existing tracked file to the exact main base, excluding only those two authorized current-document entries. Application source, backend, packages, API/OpenAPI, database/schema/migrations, clinical/security contracts, CI, dependencies and historical design/doctor-demo evidence remain byte-identical.

One isolated branch and one **Draft PR**. No edits to #86/#87/#89, no fix to #88, no native Skill activation claim, no S1 completion, no winner or final palette/type/logo/system freeze. No merge, auto-merge, deployment, promotion, alias/domain or production environment action.

Local checks: specimen ESLint, unchanged CI-policy tests, existing docs/reference validation, complete base-to-head whitespace check, local-reference/content equality and byte-preservation verification. Actual final-head GitHub CI is reported separately in the Draft PR with the run URL and job conclusions; base/older green runs never substitute for it. The unchanged classifier treats new static artifact paths as unmapped infrastructure, so **full regression is expected**. No classifier/CI optimization or skipped-gate invention is introduced.

The initial `pnpm exec eslint` invocation encountered a provisioned pnpm-version mismatch and attempted an install, which aborted before changes. Validation then used the already installed `node node_modules/eslint/bin/eslint.js` directly. No dependency or lockfile changed. Local Node is 24.19.0; CI uses the repository's pinned 24.21.0 and pnpm 10.34.6. No new installation was needed.

## Limits, cost and next gate

Computed text stress is **not native browser zoom**, and browser emulation is **not real-device coverage**. No screen-reader, native Egyptian participant/editorial, English visual parity, cross-browser, touch-device or complete WCAG conformance claim. Only the canonical normal scenario is designed in this initial round; bilingual/loading/empty/error/denied/uncertain states remain later finalist review. No production error state was repaired.

No new subscription, purchase, paid API, image-generation service, asset, credit transaction, premium feature or paid runner was used. Authoring/review use the owner's existing Codex runtime; fonts are existing OFL assets; browser tooling is installed and free/open-source. The verified repository is public; existing unchanged standard Ubuntu GitHub Actions runners perform the required CI. No billing setting was changed. Existing runtime/subscription limits and underlying compute costs are not claimed to disappear.

Gate V remains an independent qualitative judgment in [the review](INDEPENDENT_REVIEW.md). A technical PASS means credible for owner visual evaluation; it does not approve product design. Stop here for the four choices in [owner decision](README.md#owner-decision).
