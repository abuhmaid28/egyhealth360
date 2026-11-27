# Foundation validation evidence

This validates the static design/governance package, not production UI, final Brand V2 or Design System V2. The independent reviewer authors [their own report](INDEPENDENT_REVIEW.md). Exact-final-head remote CI is recorded in the Draft PR handoff after commit; PR #96's old CI does not validate this new sprint.

## Actual local evidence

- [Source manifest](evidence/source.json): 22 SVG/font/license/native-PNG artifacts copied byte-for-byte from PR #96 `cb3fd9112f15e17b3d500d7a9dd085dd6e412525`. No master geometry, outlined words or tagline changed. Original board hash is independently rechecked against the pinned Git object.
- [Responsive measurements](evidence/validation.json): Chromium 154.0.8037.57, full review page and compact board mode, widths 1440/768/390/320, normal and explicitly doubled computed text: **16 cases PASS**. No document overflow, sampled text-container clipping, broken images, page exceptions, failed responses or external requests. First visible keyboard link receives an outline. This is a focused specimen check, not full assistive-technology testing.
- Actual PNGs: [desktop board](evidence/owner-desktop.png), [mobile board](evidence/owner-mobile.png), native 512px app and 32/24/16px favicon copies. Favicons retain native CSS size at device scale 1 in browser cases. The PNGs use compact `index.html?board=1`; the full [review page](index.html) retains all variants/guidance. Mobile compact board omits redundant lockup thumbnails; all variants remain in the full page and usage package.
- [Palette evidence](evidence/palette.json): eight independently recomputed solid sRGB pair ratios, threshold decisions use unrounded values. No gradient/component/production accessibility certification.
- [Preservation report](evidence/preservation.json): every baseline tracked file checked; only CURRENT_STATUS, SOURCE_OF_TRUTH and IMPLEMENTATION_ROADMAP differ. Runtime, schema, migrations, OpenAPI, dependencies, CI policy and historical evidence remain byte-identical. All 13 copied SVGs parse and contain no raster/script/foreign object or external reference.
- [Artifact hashes](evidence/artifact-hashes.json) cover the final package except the manifest itself. Recalculate after any actual correction; unchanged source copies must remain equal to their pinned Git objects.

An intermediate 768px/doubled-text overflow was found and corrected in the documentation layout. A first compact-board focus check exposed hidden links; visible document links were retained. Neither issue changed source artwork or production code. Final evidence replaces incomplete intermediate runs; no failed run is described as a pass.

## Reproduction and repository gates

Use the existing runtime; no install/new dependency required. From repository root, serve it through a loopback-only static server (for example `python -m http.server 8765 --bind 127.0.0.1`), then:

```sh
node docs/brand-identity-v2/tools/render-validate.mjs
python docs/brand-identity-v2/tools/preserve.py
node node_modules/eslint/bin/eslint.js docs/brand-identity-v2/tools/render-validate.mjs
node --test tests/ci/*.test.mjs
```

Run the existing `scripts/ci/check-docs.mjs` against the actual base/head event after staging/commit, plus `git diff --check`. Actual repository gate results and exact-head workflow/job evidence belong in the PR handoff. No CI policy edits or path exclusions are introduced. New HTML/CSS/assets may trigger the existing full validation path; do not assume a docs-only skip.

## Limits

Computed 200% text is **not native browser zoom**. No physical-device, screen-reader, Firefox/WebKit, print-production, installed app/favicon, native Egyptian editorial or user-recognition testing is claimed. No legal/trademark clearance. Current source typography, material/background approximations and tiny-size detail loss remain; DP01/DP02 are intentionally deferred non-blockers for the foundation. This does not claim that the Arabic collision is corrected, that the formal Arabic tagline is final, or that the fixed source header art proves responsive localized product behavior.

Cloud runtime skill explicitly loaded for rendering/validation; no native design Skill activation claimed. Documentation and boards use existing free runtime assets/tools only. CI Green cannot approve any recommendation or authorize merge/deployment.
