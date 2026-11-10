# Independent source and screenshot review

Reviewed 10 November 2026 by a separate review agent under Issue #100's independent screenshot-review requirement. The reviewer did not generate or modify the candidate logo, page styling, assets, source captures or author QA tools. This is a bounded design/documentation review, not Product Owner acceptance.

**Verdict: source fidelity PASS; visual PASS FOR OWNER REVIEW; executed browser/keyboard/contrast checks PASS.** No blocking visual defect found in the inspected evidence. Final Brand, typography, palette and Design System approval remain separate owner decisions; remote CI is reported in the PR handoff.

## Independent evidence

- [Separate source audit](evidence/independent-source.json): all 14 derived SVGs checked against PR #96 commit `cb3fd9112f15e17b3d500d7a9dd085dd6e412525`. The three original SVG copies are byte-identical to their Git blobs. Separate XML traversal and literal `d` extraction establish ordered path-string identity, preserved child transforms, ellipse geometry and group descendants. Only the permitted group/rim fills differ inside logo/glyph groups. No font rebuild or tracing found.
- [Separate browser checks](evidence/independent-browser.json): 40 responsive/keyboard cases, covering 320/390/768/1024/1440 CSS px × AR/EN × dark/light × normal/explicit doubled computed text. No horizontal document overflow; both header links remain inside the viewport and at least 48px in each target dimension. Tab reaches skip → brand → language; Shift+Tab returns to brand; Enter changes locale/direction. Focus is visible. No observed page exception or failed request in this independent run.
- [Reviewed asset hashes](evidence/independent-reviewed-assets.json): source/derived SVGs, CSS, review JS and final page HTML pinned for this review. The author’s full artifact inventory and preservation report are distinct evidence.

At 505 CSS px the reviewer independently reproduced Arabic name-to-tagline bounding-box clearance of **−0.523px before → +13.477px after**, in both dark/light candidates. The actual screenshots show the final ya dots clear of the following reference-only line. The correction moves following lines rather than editing glyph outlines. Compact lockups contain no tagline and show no observed dot clipping.

The symbol silhouette, open cavity, separate head, ribbon and underside remain coherent in the reviewed larger images. At 16px and 24px fine rim/fold detail weakens and shades merge; this is correctly disclosed and remains AP03, not a claim of universal recognition. The maskable inset appears conservative: the source symbol is fully inside the indicated central circle in the reviewed browser simulation. No OS masking or installed-PWA proof follows from it.

Actual locale-control contrast, independently sampled from computed browser styles:

| Actual pair/state | Text | Meaningful boundary against card |
| --- | --- | --- |
| Dark normal: violet on dark card | 5.93:1 | 5.93:1 |
| Dark hover: dark ink on violet | 6.59:1 | 5.93:1 |
| Light normal: dark violet on white | 7.13:1 | 7.13:1 |
| Light hover: white on dark violet | 7.13:1 | 7.13:1 |

These selected UI checks exceed 4.5:1 text and 3:1 meaningful-boundary thresholds. Trademark artwork was inspected visually and for source identity; text contrast requirements were not indiscriminately applied to gradient logo pixels. This is not whole-design WCAG certification.

## Screenshots actually inspected

- Arabic [before at 505px](evidence/arabic-before-505.png), [after dark](evidence/arabic-after-dark-505.png), [after light](evidence/arabic-after-light-505.png).
- Compact outlined lockups: [AR dark](evidence/compact-ar-dark.png), [EN dark](evidence/compact-en-dark.png), [AR light](evidence/compact-ar-light.png), [EN light](evidence/compact-en-light.png).
- Native exports viewed individually: [16](evidence/icon-16.png), [24](evidence/icon-24.png), [32](evidence/icon-32.png), [64](evidence/icon-64.png), [192](evidence/icon-192.png), [512](evidence/icon-512.png).
- Maskable [safe-area overlay](evidence/maskable-safe-area.png) and [circle simulation](evidence/maskable-circle.png).
- Header samples across every required width: [AR dark 320 normal](evidence/header-dark-ar-320-normal.png), [AR dark 320 doubled](evidence/header-dark-ar-320-text200.png), [EN light 320 doubled](evidence/header-light-en-320-text200.png), [EN dark 390](evidence/header-dark-en-390-normal.png), [AR light 768 doubled](evidence/header-light-ar-768-text200.png), [AR dark 1024](evidence/header-dark-ar-1024-normal.png), [EN light 1440](evidence/header-light-en-1440-normal.png).
- Full review-page samples: [AR dark 390](evidence/page-dark-ar-390-normal.png), [EN light 1440](evidence/page-light-en-1440-normal.png). The board prose is English; the header alone is the bilingual Web/PWA specimen.
- Reviewer-captured [AR 320 doubled/focus](evidence/independent-ar-320-text200-focus.png) and [EN 1440 light/hover](evidence/independent-en-1440-light-hover.png).

The reviewer executed all 40 layout cases independently; screenshot inspection used the explicitly listed subset rather than claiming a separate manual inspection of all 40 author captures.

## Finding and remaining gates

IR01 — minor accessibility metadata, **RESOLVED**: English review-board sections initially inherited `lang="ar"` when the header locale was Arabic. The author added `lang="en"` to the shared `main#review` ancestor and English skip link. The reviewer independently checked both locale variants: every English section inherits English, the skip link is English, and the Arabic/English header alternative text and document locale remain correct. This has no visual effect; the final HTML hash and verification are recorded in the linked independent evidence.

DP01 is a technically evidenced layout correction proposed for owner acceptance, not silently closed final-wordmark approval. DP02 stays OPEN and the existing Arabic tagline stays reference-only. AP01 typography/fit, AP02 material fidelity, AP03 small-medium/platform/print checks, AP04 final palette/usage and AP05 rights/trademark disposition remain their respective owner/distribution gates.

NOT TESTED: native browser zoom, real screen readers or announcement behavior, real devices/touch/OS settings, installed PWA or platform favicon caching, WebKit, print, native Egyptian editorial/participant recognition or trademark clearance. Explicit computed-text doubling is not native zoom. No production header integration, native mobile-app design or broader portal UI is approved by this review.
