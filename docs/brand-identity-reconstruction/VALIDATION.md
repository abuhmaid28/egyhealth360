# Selected-board reconstruction — technical validation

Source is exclusively the supplied1536×1024 PNG with SHA-256 `0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417`. It remains unchanged under `source/`. Previous logos are not fidelity references.

## Executed evidence

| Check | Actual evidence / limits |
| --- | --- |
| [Source and asset audit](evidence/audit.json) | Rechecks exact source hash;13 self-contained editable SVGs; all four required text strings in lockup metadata; native PNG dimensions; source fonts/licenses; preservation and artifact hashes. |
| [Browser validation](evidence/validation.json) | 16 actual Chromium proof-page cases:2 pages ×1220/768/390/320 ×normal/measured200% direct text. No document overflow, broken image, browser error, failed response or external request. One main/h1 and named44px-minimum-height links. |
| [Native raster outputs](evidence/render.json) | App PNG exactly512×512; favicon PNGs exactly32×32,24×24,16×16.13 individual vector renders +3 comparison/presentation captures. The small PNGs are not enlarged thumbnails mislabeled as native sizes. |
| [Color-region diagnostics](evidence/color-region-comparison.json) | Source-aligned310×320 primary box; gold/cyan/pale-rim threshold masks and intersection RGB MAE. No global silhouette/beauty/acceptance score. Deep fold/background are excluded; thin-rim agreement is particularly sensitive to pixel thresholds and smoothing. |
| [Independent visual fidelity](INDEPENDENT_REVIEW.md) | Actual approved raster vs actual vector renders; geometry, materials, hierarchy, exact strings, small sizes and approximations assessed independently. Technical checks cannot substitute for this review or owner acceptance. |

200% is measured computed text enlargement, **not native browser zoom**. Logo artwork remains scalable imagery with accessible names. The static source-board header arrangement is deliberately retained rather than inventing a responsive production navigation redesign.

## Corrections during reconstruction

Initial material/typography findings were addressed: localized left-lobe volume and dark fold, warmer head/ribbon highlights, tonal gold360, deeper Light gold, narrower pale-cyan taglines and a lighter English tagline. Gold/rim tracing was smoothed to remove threshold stair-stepping. Geometry remained tied to the verified primary hero; no new concept was introduced. A long source hash initially overflowed narrow proof-page footers; wrapping corrected it without clipping or artwork changes. The first render attempt encountered a stopped local preview server; loopback serving was restored before successful checks. No failed attempt is reported as PASS.

## Explicit approximations and NOT TESTED

Exact font identification, weights, letter spacing and Arabic raster glyph forms are **not verified**. Inter800/450/Plex Arabic600 are disclosed approximations; horizontal fitting and outlined glyphs preserve exact approved strings. The source's richer glossy/texture effects cannot be claimed identical to smooth vector gradients. Monochrome cannot preserve full-color material cues;16px cannot preserve all master detail. These are material fidelity limits for owner review.

Native browser zoom, physical devices/OS scaling/touch, Firefox/WebKit/Safari, real screen readers and native Arabic editorial review are **NOT TESTED**. No WCAG certification, participant recognition, trademark clearance, production integration, clinical behavior or Design System completeness is claimed. Source-reference raster embedding exists only in the HTML comparison viewport; all deliverable SVG assets are raster-free.

## Reproduction and preservation

With existing installed tools, run `python3 tools/generate.py`, `python3 tools/pages.py`, `node tools/render.mjs`, `python3 tools/compare.py`, `node tools/validate.mjs`, and `node tools/audit.mjs` with repository-relative paths from the root. Browser scripts use a loopback repository file server at127.0.0.1:8765. The generator asserts the source hash before reading it; no installer or remote API is needed. Fonts and native libraries are listed in README.

Only this isolated folder and three governance summaries change. [Preservation](evidence/preservation.json) compares all other pre-existing files against base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; production frontend/backend/auth, clinical contracts, schema/migrations, dependencies, CI policy and historical candidates remain byte-identical. Exact final-head remote CI uses the unchanged repository policy and is reported in the Draft PR handoff, not replaced by checkpoint or earlier sprint results. No merge, deployment, alias/promotion, Brand V2 or Design System freeze.
