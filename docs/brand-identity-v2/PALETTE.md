# Palette — source, approximation and proposed roles

Foundation recommendations only. No production tokens change. The selected logo keeps its exact PR #96 gradients; this palette does not flatten or recolor its materials. [Machine-readable tokens and contrast measurements](evidence/palette.json).

## Board-labelled colors

These HEX values are transcribed from the selected board's swatch labels. They are not claims that all logo or background pixels have these values.

| Working token | HEX | RGB | Intended foundation use |
| --- | --- | --- | --- |
| brand.nile-night | #0B3D4A | 11, 61, 74 | Primary dark identity background; strong text on light surfaces. |
| brand.turquoise | #0FB5A8 | 15, 181, 168 | Brand accent, controlled decorative emphasis; not automatic accessible text or clinical success. |
| brand.gold | #E3B45C | 227, 180, 92 | Restrained identity accent; not a warning/status semantic. |
| surface.light | #F7F9FA | 247, 249, 250 | Quiet light presentation surface. |

## Reconstruction material family — measured/manual approximations

These are existing stops in the selected SVG, not newly approved brand-flat colors. Intermediate offsets, radial position and opacity matter; see the unchanged SVG definitions.

| Material | Existing stops (HEX / RGB) | Guidance |
| --- | --- | --- |
| Main turquoise | #00C9CB / 0,201,203; #00A6AD / 0,166,173; #005466 / 0,84,102 | Left care volume; preserve gradient direction and contrast with cavity. |
| Light turquoise | #72EEE4 / 114,238,228; #3DDED7 / 61,222,215; #00BABC / 0,186,188 | Right care volume; not a pale text color on white. |
| Fold | #003544 / 0,53,68; #00586A / 0,88,106; #003E50 / 0,62,80 | Dimensional underside, not clinical-state styling. |
| Ribbon | #FFE976 / 255,233,118; #FFCE35 / 255,206,53; #FFAD00 / 255,173,0 | Gold highlight through warm edge. |
| Head | #FFF1A4 / 255,241,164; #FFDB56 / 255,219,86; #FFBA12 / 255,186,18; #F9AD00 / 249,173,0 | Floating circle's soft volume. |
| Highlight / shade overlays | #38FFF0 / 56,255,240 at 0.34 opacity fading to 0; #003042 / 0,48,66 at 0.4 fading to 0 | Local overlays; do not convert into global UI fills. |
| Dark proof surface | #043B49 / 4,59,73 | Existing lockup surface, approximate to board presentation. |
| Wordmark gold, dark / light | #FFAC00 / 255,172,0 → #FFDF68 / 255,223,104; #C58C16 / 197,140,22 → #E8B74F / 232,183,79 | Exact copied variant materials; flat swatch brand.gold is not a substitute. |

## Proposed support neutrals

| Working token | HEX | RGB | Proposal / provenance |
| --- | --- | --- | --- |
| surface.white | #FFFFFF | 255,255,255 | Generic proposed neutral; also used by the reconstruction light/mono art. |
| text.strong | #0B3D4A | 11,61,74 | Board dark reused for strong readable type. |
| text.muted | #45616A | 69,97,106 | New foundation approximation for secondary readable text. |
| border.subtle | #D6E3E7 | 214,227,231 | New decorative-divider approximation; insufficient alone for essential control boundaries. |
| surface.soft | #EDF4F5 | 237,244,245 | New support-surface approximation. |
| text.on-dark | #FFFFFF | 255,255,255 | Proposed ordinary text on dark. |

These working labels are documentation vocabulary, not a frozen Design System token contract. Do not replace existing accepted tokens automatically. Semantic error/success/warning/info colors require separate clinical/product decisions and accessibility validation.

## Contrast observations

Calculated using WCAG sRGB relative luminance, solid opaque colors, rounded to two decimals. Threshold comparisons use unrounded values. The ratios are local pair measurements, not an overall accessibility certification; gradients, compositing and actual components require later testing.

| Foreground / background | Ratio | Ordinary text guidance |
| --- | --- | --- |
| White / Nile Night | 11.79:1 | Exceeds 4.5:1 normal-text threshold. |
| Nile Night / Light | 11.17:1 | Exceeds 4.5:1. |
| Turquoise / White | 2.56:1 | Fails 4.5:1 normal and 3:1 large text. Do not use as body text or sole essential boundary. |
| Gold / White | 1.92:1 | Fails normal and large text thresholds. Decorative/identity use only here. |
| Nile Night / Turquoise | 4.60:1 | Exceeds 4.5:1 for this exact solid pair; validate actual sizes and states. |
| Nile Night / Gold | 6.15:1 | Exceeds 4.5:1 for this exact solid pair. |
| Muted / Light | 6.27:1 | Exceeds 4.5:1. |
| Subtle border / White | 1.31:1 | Decorative separators only; not sole essential control/focus indicator. |

Logo/text-in-logo exemptions do not make turquoise/gold UI text accessible. Brand gold is not the default link color. Use strong ink and separately validated focus/interactive treatments; communicate medical states with precise text and appropriate non-color cues. Actual output from the calculator in palette.json is authoritative for the measurements above; no audit of unchanged production UI is implied.
