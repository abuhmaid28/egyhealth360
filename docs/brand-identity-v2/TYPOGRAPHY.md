# Typography foundation

Recommendation, not final typography adoption or a runtime change. Current SVG wordmarks are preserved outlines from PR #96 and do not depend on fonts at render time.

## Family and approximation status

| Context | Recommendation / current evidence | Limit |
| --- | --- | --- |
| English brand | Inter; reconstruction uses weight 800 for name and 450 for English tagline | Board lists Inter / IBM Plex Sans (EN), not exact source font/weight files. Horizontal fit and spacing were approximated. No exact-font claim. |
| English product UI | Inter 400 body, 500 labels, 600 subheads, 700 primary headings | Existing free repository family. Proposed hierarchy only; avoid heavy brand weight for dense clinical text. |
| Arabic brand and UI | IBM Plex Sans Arabic, 400 body and 600 headings/labels | Board lists family; reconstruction outlines use 600, shaped with HarfBuzz and fitted. Exact glyph/weight/spacing match remains unverified. |

Inter and IBM Plex Sans Arabic binaries/notices are copied byte-for-byte from PR #96 into [assets](assets/). OFL notices: [Inter](assets/Inter-OFL.txt), [Plex](assets/plex-arabic-OFL.txt). Neither font recommendation conveys ownership of the logo artwork. No paid font or remote font request is introduced.

## Suggested hierarchy for later prototypes

Sizes are CSS-pixel starting ranges, not frozen tokens. Match perceived prominence between scripts rather than forcing equal glyph height. Preserve room for Arabic marks and dots.

| Role | English | Arabic | Application |
| --- | --- | --- | --- |
| Display / brand presentation | 32–40 / 700 | 32–40 / 600 | Marketing/brand board, not every clinical screen. |
| Page title | 24–32 / 700 | 24–32 / 600 | One clear page/task title. |
| Section heading | 18–22 / 600 | 18–22 / 600 | Source/task groupings without excessive visual weight. |
| Body | 16 / 400 | 16–18 / 400 | Care explanations and ordinary content. |
| UI labels | 14–16 / 500–600 | 14–16 / 600 | Short actions and labels with explicit objects. |
| Secondary metadata | 14 / 400 | 14–16 / 400 | Keep readable; never hide clinical consequence in tiny type. |

Start English body line-height around 1.5–1.65 and Arabic around 1.7–1.9. These are UI-text recommendations, not permission to apply CSS line-height to outlined logo artwork. Avoid Arabic letter spacing, fixed-height clipping and forced uppercase equivalents. Isolate `EgyHealth 360` and `360` in mixed RTL prose; preserve logical reading order and Latin digits under accepted content policy. Font weight alone must not communicate clinical status.

## Known Arabic wordmark fit debt — DP01

In the current artwork, final ya dots in **إيجي** collide visually with the line below. The owner explicitly defers this as non-blocking for the foundation. It remains visible in copied lockups; this sprint does not claim to fix it. A later authorized correction should adjust interline spacing/baseline/type fit with current wording intact, preserve the selected symbol and compare EN/AR desktop/mobile at intended size. Confirm separated dots, unclipped marks and balanced bilingual prominence before approving the revised wordmark.

Current Arabic tagline **رعاية متكاملة حولك** is reference-only pending a professional Egyptian Arabic rewrite (DP02). Do not use it as a canonical translation in new product copy. No replacement slogan is proposed here. Exact source typography, local glossy materials and 16px detail loss remain disclosed concerns; see [register](DEFERRED_POLISH.md).
