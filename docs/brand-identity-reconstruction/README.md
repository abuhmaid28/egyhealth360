# EgyHealth 360 — selected-board reconstruction

Faithful reconstruction of the owner's selected turquoise-and-gold human-care identity, not a new concept or redesign. **No production implementation, merge, deployment, Brand V2 freeze or Design System V2 freeze.** Owner fidelity review remains required.

## Sole visual authority

The owner supplied `EgyHealth360_Approved_Brand_Board_Source.zip`. The extracted `EgyHealth_360_Logo_Implementation_Package.png` is preserved byte-for-byte as [approved-board.png](source/approved-board.png): **1536×1024 RGBA**, SHA-256 **`0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417`**. Hash verification precedes generation and validation. No earlier crop, cube, exploration proposal or mistaken reference is used as visual authority. The approved board's large upper-left hero supplies master geometry; its smaller examples guide variants and placement, without mixing their minor raster inconsistencies into the master.

## Owner-ready proofs and editable assets

[Raster vs vector fidelity board](evidence/fidelity-board.png) · [All proofs](evidence/all-proofs.png) · [Mobile proof sheet](evidence/mobile-proofs.png) · [Interactive-size source viewer](fidelity.html).

| Deliverable | Editable SVG | Actual PNG proof |
| --- | --- | --- |
| Primary transparent master | [symbol-primary.svg](assets/symbol-primary.svg) | [PNG](evidence/symbol-primary.png) |
| Full horizontal dark lockup | [SVG](assets/lockup-dark.svg) | [PNG](evidence/lockup-dark.png) |
| Full horizontal light lockup | [SVG](assets/lockup-light.svg) | [PNG](evidence/lockup-light.png) |
| Monochrome lockup | [SVG](assets/lockup-mono.svg) | [PNG](evidence/lockup-mono.png) |
| Standalone dark / light / mono | [Dark](assets/icon-dark.svg), [light](assets/icon-light.svg), [mono](assets/icon-mono.svg) | [Dark](evidence/icon-dark.png), [light](evidence/icon-light.png), [mono](evidence/icon-mono.png) |
| App icon512px | [SVG](assets/app-icon-512.svg) | [512×512 PNG](evidence/app-icon-512.png) |
| Favicon32 /24 /16px | [32](assets/favicon-32.svg), [24](assets/favicon-24.svg), [16](assets/favicon-16.svg) | [32](evidence/favicon-32.png), [24](evidence/favicon-24.png), [16](evidence/favicon-16.png) |
| Board-based NOVA headers | [Arabic](assets/nova-header-ar.svg), [English](assets/nova-header-en.svg) | [Arabic](evidence/nova-header-ar.png), [English](evidence/nova-header-en.png) |

The headers reconstruct the **teal application shown on this board**, not earlier NOVA screens. Both retain its bilingual name and fixed artwork arrangement, with locale labels in the proof viewer. They are static placement studies, not functional navigation, notifications or a production component.

## What is reconstructed and what is approximate

The editable master has separate left/right care surfaces, hollow cavity, gold accent ribbon, darker lower fold, selective pale rims and floating gold head. Linear/radial gradients and localized shading preserve the soft3D character. Gold/rim contours are derived from this verified raster's primary box `(145,70,310,320)` and smoothed into editable curves; remaining contours and material gradients are measured/manual approximations. SVG assets contain no embedded raster, scripts or remote fonts.

Every lockup preserves **EgyHealth 360**, **إيجي هيلث 360**, **رعاية متكاملة حولك**, and **Integrated care around you**. Exact source font files/weights are not known. Existing licensed Inter800/450 and IBM Plex Sans Arabic600 are approximations to the board-listed families. Arabic is shaped with installed HarfBuzz and both scripts are outlined; widths/positions are fitted to the raster. The generator retains exact text strings and editable path groups. No new Arabic name or slogan is invented; garbled small explanatory labels in the raster are not reproduced as brand text.

The vector is smoother than the source's local glossy shading and raster texture. It is **not pixel-perfect typography or material reproduction**. Presentation backgrounds are approximations. Monochrome uses the same master paths with one ink and a white ribbon-edge separation; it is a print derivation, not a replacement master. App/favicon versions use unchanged master geometry at uniform scales; no silent small-size substitution. At16px the coarse turquoise/gold identity survives while fine shading cannot.

Color-region metrics in [comparison diagnostics](evidence/color-region-comparison.json) are threshold-mask agreement and intersection color error only. They exclude background/deep-fold tones and are sensitive to anti-aliasing/color/smoothing. **They are not overall fidelity percentages, acceptance scores or proof of beauty.** Read the [independent fidelity review](INDEPENDENT_REVIEW.md) separately.

## Provenance, tools and governance

Original source remains unchanged. The reconstruction generator and source-guided contour code are in [tools](tools/). Font binaries are copied from the existing repository with [Inter OFL](assets/Inter-OFL.txt) and [Plex OFL](assets/plex-arabic-OFL.txt). Existing FontTools, HarfBuzz, Brotli, NumPy/Pillow/SciPy/ContourPy and Chromium/Playwright are used; no new paid API, image-generation service, asset, subscription or installer. Source artwork was supplied/selected by the owner; underlying authorship and trademark rights are not independently certified. No native Skill activation or S1 completion is claimed.

Main base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; isolated branch `design/72-exact-brand-reconstruction`. Initial verified-source reconstruction was secured at checkpoint `662786ba4c791d5e81ab6394c6ddd2451d78fd01`. Earlier candidates/PRs remain untouched. [Technical results and exact limits](VALIDATION.md); final head and actual exact-head CI belong in the Draft PR handoff. Technical Green and a fidelity PASS do not approve or freeze the complete identity. Stop for owner review of reconstruction and disclosed approximations.
