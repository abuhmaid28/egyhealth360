# Validation — issue #100

Scope: one source-exact provisional Violet × Apricot review package. [Entry/assets/gates](README.md), [independent review](INDEPENDENT_REVIEW.md). No application, dependency, policy or CI changes. Exact final remote head/results are recorded in the Draft PR handoff after GitHub runs complete; local PASS is not remote Green.

## Executed evidence

| Gate | Actual executed result / evidence |
| --- | --- |
| Three original source SVG captures | Byte-identical to pinned #96; SHA-256 in [provenance](evidence/provenance.json). |
| XML / group inventory / source path identity | 14 derived SVGs; literal `d` bytes, ordered paths, all glyph child transforms and head ellipse identical. Root/whole-group omissions/wrappers and color-only changes audited. [Complete audit](evidence/path-audit.json). |
| Arabic DP01 | At 505 CSS px: bounding-envelope gap −0.523px before, 13.477px after on both themes. Name and symbol unmoved; following Arabic line +28 source units, English +34. Before/after actual-size PNGs and compact 234px proofs linked in README. No clipping in any rendered asset. |
| Responsive / computed text | **40 PASS**: 5 widths × 2 locales × 2 themes × normal/200% computed text. No document/element horizontal overflow, sampled text clipping, missing logo or control smaller than 48×48px. Every measured text-owning element equals its saved normal computed size ×2. [Raw cases](evidence/browser-qa.json). |
| Keyboard / focus | **40 PASS**, six actions each: Tab skip → brand → locale; Shift+Tab back; Tab and Enter change locale/direction. Visible ≥3px outline; boundary/focus contrast measured. [Raw keyboard cases](evidence/browser-qa.json). |
| Contrast | 1,524 observations including normal/focus pairs and four hovered controls; ordinary text ≥4.5:1, meaningful focus/control boundaries ≥3:1. [Actual sampled pair table](evidence/contrast.json). Source/trademark artwork is exempt from ordinary text certification claims. |
| Native exports | PNG IHDR dimensions checked at 16/24/32/64/192/512; no resampling from a PNG master. All are rasterized directly from source-derived SVG at DPR1. [Native strip](evidence/native-pixel-strip.png). Fine detail softens at 16–24px; no universal recognition claim. |
| Maskable | Exact symbol inside central 80%-diameter circle; conservative rectangle corner radius170.604px <204.8px. [Overlay](evidence/maskable-safe-area.png), [circle simulation](evidence/maskable-circle.png). OS/installed PWA NOT TESTED. |
| Browser network/errors | No page errors, failed responses/requests or external requests during final executed author harness. Local fonts and assets only. Chromium engine/version and all measurement data in raw JSON. |
| Preservation | [Every baseline file hash](evidence/preservation.json); only two governance summaries may differ. Original sources, prior branches/evidence, runtime/schema/dependencies/CI remain preserved. |

The normal text contrast minimum is 5.93:1. The minimum meaningful boundary observation is 5.93:1. Hover text uses ink #17142B on #A78BFA in dark mode and white on #6240B8 in light mode; exact sampled ratios below. These observations do not certify the entire design against WCAG or apply normal text rules indiscriminately to the logo.

## Actual UI contrast pairs

| Theme / state | Actual foreground | Actual background | Ratio | Required |
| --- | --- | --- | --- | --- |
| dark / ordinary text | #A78BFA | #1D2030 | 5.93:1 | 4.5:1 |
| dark / ordinary text | #A78BFA | #10121D | 6.85:1 | 4.5:1 |
| dark / ordinary text | #F6F2FF | #10121D | 16.93:1 | 4.5:1 |
| dark / ordinary text | #17142B | #F8F7FB | 16.81:1 | 4.5:1 |
| dark / ordinary text | #F6F2FF | #1D2030 | 14.65:1 | 4.5:1 |
| dark / outlineColor | #FFB88B | #1D2030 | 9.59:1 | 3:1 |
| dark / borderColor | #A78BFA | #1D2030 | 5.93:1 | 3:1 |
| light / ordinary text | #6240B8 | #FFFFFF | 7.13:1 | 4.5:1 |
| light / ordinary text | #6240B8 | #F8F7FB | 6.69:1 | 4.5:1 |
| light / ordinary text | #17142B | #F8F7FB | 16.81:1 | 4.5:1 |
| light / ordinary text | #F6F2FF | #10121D | 16.93:1 | 4.5:1 |
| light / ordinary text | #F6F2FF | #1D2030 | 14.65:1 | 4.5:1 |
| light / borderColor | #6240B8 | #FFFFFF | 7.13:1 | 3:1 |
| dark / hover .locale | #17142B | #A78BFA | 6.59:1 | 4.5:1 |
| dark / hover filled boundary | #A78BFA | #1D2030 | 5.93:1 | 3:1 |
| dark / hover .review-links a:first-child | #17142B | #A78BFA | 6.59:1 | 4.5:1 |
| dark / hover filled boundary | #A78BFA | #10121D | 6.85:1 | 3:1 |
| light / hover .locale | #FFFFFF | #6240B8 | 7.13:1 | 4.5:1 |
| light / hover filled boundary | #6240B8 | #FFFFFF | 7.13:1 | 3:1 |
| light / hover .review-links a:first-child | #FFFFFF | #6240B8 | 7.13:1 | 4.5:1 |
| light / hover filled boundary | #6240B8 | #F8F7FB | 6.69:1 | 3:1 |

Card/canvas tonal separation is decorative; the language control’s border and focus ring carry its meaningful boundary. The original turquoise/gold source proof is historical comparison artwork. No medical status is assigned a color by this package.

## Header screenshot matrix

All widths are CSS pixels, DPR1, Chromium. Each entry links the actual `.web-header` screenshot at normal and 200% computed text; the RTL language link changes the page language and header asset. The page is a static review, not a connected healthcare journey.

| Width | Dark EN | Dark AR / RTL | Light EN | Light AR / RTL |
| --- | --- | --- | --- | --- |
| 320 | [100%](evidence/header-dark-en-320-normal.png) / [200%](evidence/header-dark-en-320-text200.png) | [100%](evidence/header-dark-ar-320-normal.png) / [200%](evidence/header-dark-ar-320-text200.png) | [100%](evidence/header-light-en-320-normal.png) / [200%](evidence/header-light-en-320-text200.png) | [100%](evidence/header-light-ar-320-normal.png) / [200%](evidence/header-light-ar-320-text200.png) |
| 390 | [100%](evidence/header-dark-en-390-normal.png) / [200%](evidence/header-dark-en-390-text200.png) | [100%](evidence/header-dark-ar-390-normal.png) / [200%](evidence/header-dark-ar-390-text200.png) | [100%](evidence/header-light-en-390-normal.png) / [200%](evidence/header-light-en-390-text200.png) | [100%](evidence/header-light-ar-390-normal.png) / [200%](evidence/header-light-ar-390-text200.png) |
| 768 | [100%](evidence/header-dark-en-768-normal.png) / [200%](evidence/header-dark-en-768-text200.png) | [100%](evidence/header-dark-ar-768-normal.png) / [200%](evidence/header-dark-ar-768-text200.png) | [100%](evidence/header-light-en-768-normal.png) / [200%](evidence/header-light-en-768-text200.png) | [100%](evidence/header-light-ar-768-normal.png) / [200%](evidence/header-light-ar-768-text200.png) |
| 1024 | [100%](evidence/header-dark-en-1024-normal.png) / [200%](evidence/header-dark-en-1024-text200.png) | [100%](evidence/header-dark-ar-1024-normal.png) / [200%](evidence/header-dark-ar-1024-text200.png) | [100%](evidence/header-light-en-1024-normal.png) / [200%](evidence/header-light-en-1024-text200.png) | [100%](evidence/header-light-ar-1024-normal.png) / [200%](evidence/header-light-ar-1024-text200.png) |
| 1440 | [100%](evidence/header-dark-en-1440-normal.png) / [200%](evidence/header-dark-en-1440-text200.png) | [100%](evidence/header-dark-ar-1440-normal.png) / [200%](evidence/header-dark-ar-1440-text200.png) | [100%](evidence/header-light-en-1440-normal.png) / [200%](evidence/header-light-en-1440-text200.png) | [100%](evidence/header-light-ar-1440-normal.png) / [200%](evidence/header-light-ar-1440-text200.png) |

Full review sheets: [Dark AR390](evidence/page-dark-ar-390-normal.png), [Dark AR1440](evidence/page-dark-ar-1440-normal.png), [Dark EN390](evidence/page-dark-en-390-normal.png), [Dark EN1440](evidence/page-dark-en-1440-normal.png), [Light AR390](evidence/page-light-ar-390-normal.png), [Light AR1440](evidence/page-light-ar-1440-normal.png), [Light EN390](evidence/page-light-en-390-normal.png), [Light EN1440](evidence/page-light-en-1440-normal.png). [Dark AR320 focus](evidence/focus-dark-ar-320-text200.png), [Light EN320 focus](evidence/focus-light-en-320-text200.png).

## Limits and independent gate

**NOT TESTED:** native zoom; real screen readers/announcement behavior; physical devices/touch/OS scaling; installed PWA or favicon browser/OS behavior; WebKit; print; native Egyptian editorial/participant recognition; trademark clearance. Text doubling is an explicit computed-size experiment. Accessibility tree or keyboard execution cannot substitute for actual assistive technology tests.

Independent screenshot/source/browser findings and limits are separately authored in [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md). DP01 owner acceptance, DP02 and AP01–AP05 remain as recorded in README. No Product/UX/Brand/Design System approval or automatic next stage follows from technical PASS.

## Repository gates

The unchanged repository classifier selects the actual required CI lanes. This folder includes static HTML/CSS/JS/SVG/PNG/Python/JSON; do not invent a docs-only skip or weaken policy. Local policy/event tests: **30/30 PASS**. JS/MJS syntax, staged whitespace, and focused ESLint using the unchanged repository configuration with its existing pinned ESLint/TypeScript-ESLint versions installed outside the repository: **PASS**. The review script explicitly declares its browser globals; no runtime behavior changed for the lint correction. The current/changed Markdown reference gate is rerun on the committed final candidate with its actual base/head event. The unchanged classifier is expected to select full regression for this static review folder; actual remote selection/results belong in the PR handoff. Existing full remote lint/build/browser/PostgreSQL/Docker/audit jobs must complete on the exact final head when selected. The PR handoff records actual results and links; source PR #96/#97 CI is historical only.
