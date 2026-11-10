# Source-exact Violet × Apricot — issue #100

**A — Balanced; one provisional review candidate. DRAFT / no merge / no deployment.** [Issue #100](https://github.com/abuhmaid28/egyhealth360/issues/100) records the owner’s “موافق كمل” authorization on 10 November 2026. This package implements that bounded design/documentation task only. Technical validation and independent review do not approve final Brand V2, typography, Design System or frontend rollout. **Stop at owner visual review.**

[Responsive review page](index.html) · [Dark AR 390](evidence/page-dark-ar-390-normal.png) · [Dark EN 1440](evidence/page-dark-en-1440-normal.png) · [Light AR 390](evidence/page-light-ar-390-normal.png) · [Light EN 1440](evidence/page-light-en-1440-normal.png) · [Validation](VALIDATION.md) · [Independent review](INDEPENDENT_REVIEW.md).

## Source and exact deltas

Fresh main/base: **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**. One branch: `design/100-source-exact-violet-apricot`. Original source: [PR #96](https://github.com/abuhmaid28/egyhealth360/pull/96), **`cb3fd9112f15e17b3d500d7a9dd085dd6e412525`**. Foundation/deferred gates: [PR #97](https://github.com/abuhmaid28/egyhealth360/pull/97), **`e1abedc3d1c8811912f0fe6576e4b4f3459210ce`**. Both remain independent, open Draft reviews. No branch was imported or prior PR edited. Fresh issue/comments, umbrella authorization and existing review refs were checked for supersession.

Untouched local captures: [symbol-primary](source/symbol-primary.svg), [lockup-dark](source/lockup-dark.svg), [lockup-light](source/lockup-light.svg). These are original turquoise/gold historical evidence. Their hashes and original paths are in [provenance.json](evidence/provenance.json). They must not be replaced by the new theme.

All reused `d` values retain literal UTF-8 bytes, order and internal glyph transforms. The symbol retains **eight paths plus its separate head ellipse**; the latter’s center/radii are also immutable. No font shaping, PNG tracing, contour editing, mirroring, glyph replacement or new concept. Source outlines retain PR #96’s disclosed approximation to the owner board; “source-exact” means exact to these SVGs, not a new claim of exact original font identification or raster fidelity.

[path-audit.json](evidence/path-audit.json) contains per-path SHA-256, per-group SHA-256 (ordered 8-byte byte-length prefixes plus raw `d` bytes), exact source/output group inventories, and every permitted attribute delta. English name: 9 paths; each `360`: 3; Arabic name: 8; reference Arabic tagline: 16; English tagline: 23. Full bilingual specimens contain 70 paths, compact EN 20, compact AR 19, symbol/icons 8. Entire non-applicable groups are omitted from compact/icon variants; no partial glyph editing occurs.

Allowed changes are limited to existing gradient **stop colors** (offsets, opacity and gradient geometry retained), two rim fills, text-group fills, external wrapper transforms/spacing, presentation roots/titles/sizes/backgrounds, and omission of complete non-applicable groups. New full-size light `360` uses **#6240B8**. New compact headers omit **both** taglines.

## Actual-size Arabic proof

| Before / after | Intended size | Evidence |
| --- | --- | --- |
| Original PR #96, unmodified | 505 × 175 CSS px / PNG pixels | [Before](evidence/arabic-before-505.png) |
| Candidate, dark | 505 × 201 | [After dark](evidence/arabic-after-dark-505.png) |
| Candidate, light | 505 × 201 | [After light](evidence/arabic-after-light-505.png) |
| Compact Arabic dark / light | 234 × 43.5 CSS px; 234 × 44 PNG pixels | [Dark](evidence/compact-ar-dark.png) / [Light](evidence/compact-ar-light.png) |
| Compact English dark / light | 234 × 43.5 CSS px; 234 × 44 PNG pixels | [Dark](evidence/compact-en-dark.png) / [Light](evidence/compact-en-light.png) |

The Arabic reference tagline moves down **28 source units** and English reference tagline **34**. The canvas grows from 350 to 402 units; the name, marks and symbol stay in their original full-lockup positions. At 505px width the **whole-group bounding-envelope gap** improves from **−0.523px** to **13.477px**. This is a conservative geometry measurement, not a perceptual clearance score. Actual screenshots show the dots clear of the next line; all groups remain inside the canvas. **DP01 has a technically validated candidate correction; owner acceptance remains pending.**

## Assets and native pixels

| Deliverable | Editable SVG / actual PNG |
| --- | --- |
| Original-derived transparent symbol | [SVG](assets/symbol-transparent.svg) / [310 × 320 PNG](evidence/symbol-transparent.png) |
| Compact EN, dark / light | [Dark SVG](assets/compact-en-dark.svg) / [Light SVG](assets/compact-en-light.svg) |
| Compact AR, dark / light | [Dark SVG](assets/compact-ar-dark.svg) / [Light SVG](assets/compact-ar-light.svg) |
| Large bilingual, dark / light | [Dark SVG](assets/bilingual-dark.svg) / [Light SVG](assets/bilingual-light.svg) / [Dark PNG](evidence/bilingual-dark.png) / [Light PNG](evidence/bilingual-light.png) |
| Favicon 16 | [SVG](assets/icon-16.svg) / [native PNG](evidence/icon-16.png) |
| Favicon 24 | [SVG](assets/icon-24.svg) / [native PNG](evidence/icon-24.png) |
| Favicon 32 | [SVG](assets/icon-32.svg) / [native PNG](evidence/icon-32.png) |
| App icon 64 | [SVG](assets/icon-64.svg) / [native PNG](evidence/icon-64.png) |
| App icon 192 | [SVG](assets/icon-192.svg) / [native PNG](evidence/icon-192.png) |
| App icon 512 | [SVG](assets/icon-512.svg) / [native PNG](evidence/icon-512.png) |
| Maskable candidate | [SVG](assets/maskable-512.svg) / [512 PNG](evidence/maskable-512.png) / [safe circle overlay](evidence/maskable-safe-area.png) / [circular-mask simulation](evidence/maskable-circle.png) |

[Native-size strip](evidence/native-pixel-strip.png) shows 16/24/32/64/192 at 1×; open each PNG at native size. At 16–24px fine rims/fold/shading lose separation. Broad head/body/ribbon survive, but recognition and installed favicon behavior are unproven. No simplified substitute is hidden in the exports. The 512 maskable candidate uses the same geometry at a smaller external scale. Even its conservative bounding rectangle fits inside the central 80%-diameter circle: farthest corner **170.604px**, safe radius **204.8px**. The circular screenshot is a browser simulation, not OS/PWA installation evidence. A distribution manifest/service worker is outside this docs task.

## Theme and responsive header

Dark: background **#10121D**, card **#1D2030**, text **#F6F2FF**, violet **#A78BFA**, apricot **#FFB88B**. Light: background **#F8F7FB**, white card, ink **#17142B**, action violet **#6240B8**. These are issue-local provisional values, **not global approved tokens**. Existing gradients reuse only these candidate colors; existing opacity and interpolation still produce intermediate rendered pixels. Brand colors carry no medical success/warning/error meaning. No clinical status system is designed here.

One shared Web/PWA header shows the source-derived locale lockup and a real language link. EN is LTR; AR is RTL. The SVG symbol is never mirrored; Arabic outlined shaping/order and Latin digits remain source paths. No tagline, notification count, profile data, fictional native navigation or new product destination is added. Narrow/enlarged layouts may wrap the utility onto another row instead of clipping. The image remains trademark artwork during the computed-text test; ordinary link/caption/review text is doubled and measured. No native mobile app or actual installed PWA is claimed.

The screenshot matrix and actual UI contrast pairs are in [VALIDATION.md](VALIDATION.md). The source artwork’s historical colors are comparison evidence; trademark art is not indiscriminately judged as ordinary UI text. UI text is tested at ≥4.5:1 and meaningful control/focus boundaries at ≥3:1; this is **not WCAG certification**.

## Unresolved owner gates

| ID | Current disposition / gate |
| --- | --- |
| DP01 | Source-preserving spacing correction delivered and technically checked; owner must accept the actual-size Arabic/EN results. No final wordmark approval inferred. |
| DP02 | **OPEN.** رعاية متكاملة حولك remains reference-only in the large specimens and untouched sources. No new Arabic copy; compact headers omit taglines. Native Egyptian editorial review and owner copy disposition remain future gates. |
| AP01 | Exact original font identification/weight remains approximate from #96. Reusing those exact outlines does not resolve that limit; owner typography/wordmark acceptance and any future live-text parity remain pending. |
| AP02 | Source materials were already smoother than the raster. This candidate deliberately recolors existing gradients; owner decides material/color sufficiency. No new contour or texture work. |
| AP03 | 16px detail loss; actual devices/favicon/platform masking, installed PWA and print remain untested. Any future optical derivative needs separate scope. |
| AP04 | Exact palette/usage/minimum sizes/clear space remain provisional; no final tokens, clinical semantics or Design System approval. |
| AP05 | Artwork authorship/exclusivity/trademark clearance not independently established. Copied Inter/Plex fonts and OFL notices retain pinned bytes; no legal certification. |

**NOT TESTED:** native browser zoom, real screen readers, physical devices/OS text settings/touch, installed PWA, WebKit, print, native Egyptian editorial/user recognition and trademark clearance. Computed 200% text is not native zoom. No production integration, security/backend or clinical behavior has been changed or newly certified.

## Reproduce and preservation

From repository root, run `python docs/brand-source-exact-100/tools/generate.py`, then `python docs/brand-source-exact-100/tools/audit.py`. Serve the repository locally with `python -m http.server 8100 --bind 127.0.0.1`. Run `EH100_PLAYWRIGHT=/tmp/eh100-tools/node_modules/playwright/index.mjs node docs/brand-source-exact-100/tools/qa.mjs` with free Playwright 1.64.1 installed outside this repository and existing Chromium (`CHROMIUM_PATH` can override). The audit requires the pinned source Git objects; it refuses source/path/internal-transform changes. It records literal serialized path bytes, not an approximate geometry comparison.

Only this isolated folder and the two current governance entry points (`CURRENT_STATUS.md`, `SOURCE_OF_TRUTH.md`) change. [Preservation](evidence/preservation.json) hashes every baseline tracked file; all **1,421 / 1,423** outside those two summaries must remain byte-identical, including runtime, schema, migrations, OpenAPI, dependencies, CI and protected historical screenshots/assets. [Artifact inventory and SHA-256](evidence/artifact-hashes.json) covers the final review files, excluding that self-hashing manifest. No paid tool/service and no new repository dependency.

Final base/head, Draft PR URL, complete changed-file inventory and **actual exact-final-head remote CI** belong in the PR handoff. This avoids a self-referential head embedded in its own commit. No earlier source PR’s Green is substituted. Review/CI must not be interpreted as owner visual acceptance, merge permission or deployment authorization.
