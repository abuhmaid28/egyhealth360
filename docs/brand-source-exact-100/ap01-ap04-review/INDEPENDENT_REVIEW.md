# Independent AP01 / AP04 second review

**Verdict: PASS FOR OWNER REVIEW after correction of IR-01.** No unresolved blocking finding remains in the reviewed appendix. This is an independent technical/evidence review of the working candidate, not Product Owner typography, color, design or Brand approval. Exact committed-head input confirmation and required remote CI are separate delivery checks recorded in the Draft PR handoff. Do not merge, mark ready or deploy from this verdict.

Review date: 10 November 2026. Repository `abuhmaid28/egyhealth360`; existing Draft PR #101; branch `design/100-source-exact-violet-apricot`. Base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; accepted previous head `81ea915d10c4ad83578465dcd8b2d26d69d1b6fe`.

Reviewer: an independent second-review agent, separate from the appendix author.

## Authority, scope and independence

Read AGENTS, the live [latest owner authorization](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6759512805), CURRENT_STATUS, FOUNDATION_CHARTER, SOURCE_OF_TRUTH, accepted Arabic/content conventions, the preserved source package, and the current appendix. Independently fetched the candidate [#97 typography foundation at its pinned head](https://github.com/abuhmaid28/egyhealth360/blob/e1abedc3d1c8811912f0fe6576e4b4f3459210ce/docs/brand-identity-v2/TYPOGRAPHY.md). [Authority snapshot](evidence/independent-authority.json). Its old DP01/DP02 language is historical; the later explicit owner acceptance controls.

The reviewer wrote and executed separate tools, used direct git blob comparisons, fresh upstream font/license downloads, fontTools, the system HarfBuzz engine, a separate Playwright/Chromium run, actual platform-font inspection and fresh screenshots. Author source, QA outputs and screenshots were not edited by the reviewer. The author corrected the reported scaler defect and regenerated evidence; the reviewer then reran the full independent matrix. No production integration, dependency/CI configuration, clinical semantics or prior artwork change was requested or made by this review.

## Executed font identity and provenance

[Independent binary, license, shaping, contrast and preservation audit](evidence/independent-audit.json) · [audit tool](tools/independent-audit.py).

All four local binaries and all three full OFL notices were freshly downloaded from the pinned official Google Fonts commit. Font binaries and decompressed `.original.gz` license payloads compare byte-for-byte with upstream. Every font SHA-256 reproduces the author provenance. Readable `.txt` notices retain the complete license, names and copyright text, with only line endings normalized to LF and trailing whitespace removed. Independently verified that each plain notice equals exactly that normalization of its preserved upstream payload. Deterministic gzip preserves the original formatting without an exception to repository whitespace checks. This establishes those font-file notices, not logo rights or trademark clearance.

| Binary | Independently verified identity and real weights |
| --- | --- |
| Plex 400 | `IBMPlexSansArabic-Regular`; static OS/2 400; IBM Plex Sans Arabic |
| Plex 600 | `IBMPlexSansArabic-SemiBold`; static OS/2 600; typographic subfamily SemiBold; different binary/glyph tables from Regular |
| Inter variable | `Inter-Regular`; default OS/2 400; `wght` 100–900 and `opsz` 14–32; independently instantiated 400/500/600/700, each with correct OS/2 weight and distinct glyph-table hash |
| Noto variable | `NotoSansArabic-Regular`; default OS/2 400; `wght` 100–900 and `wdth` 62.5–100; independently instantiated 400/600 with correct OS/2 weights and distinct glyph-table hashes |

No Regular binary is relabeled as a static 600. Variable PostScript names remaining Regular at different weights are expected and do not alone prove or disprove interpolation. Binary axes/instances, computed weight, loaded byte hashes and rendered text jointly establish the evidence. CSS keeps `font-synthesis:none`, normal style/stretch and optical sizing off; non-weight axes remain at the documented defaults.

Executed HarfBuzz shaping on all three Arabic binaries with connected text, combining marks, lam-alef and dotted letters. No `.notdef` glyph occurred; ب/ت/ث/ن/ي produced distinct glyphs; connected runs differ from isolated-letter runs. The sampled Arabic code points/marks are present in each cmap. Browser screenshots additionally show connected letter forms and intact dots/diacritics in مُتابعة and مُلخّص at 400/600. This is sampled shaping/rendering evidence, not native Egyptian linguistic or physical-device certification.

## Independent browser execution and screenshot truth

[Current raw independent browser results](evidence/independent-browser.json) · [independent tool](tools/independent-browser.mjs) · [paired native zoom](evidence/independent-native-zoom.json).

Executed all **160 cases** independently: both Arabic families × Patient/Doctor × AR/EN × dark/light × 320/390/768/1024/1440 CSS px × normal/200% computed text. Chromium 154 on Linux, DPR1 for this matrix. The author’s final matrix also contains exactly 160 unique passing cases and 210 PNGs; responsive PNG widths match their declared CSS widths. All 64 author native observations pass their stated metrics and all 32 native200 PNG dimensions match the recorded physical windows.

The independent run records **2,488 actual visible-text platform-font observations**: every visible text/control-value/generated-label node at 390 normal, plus the six visible Arabic/Latin weight samples across every other case. All positive observations use only the selected custom Arabic family and/or custom Inter. Plex Arabic600 renders the actual SemiBold PostScript face. Empty inputs are size-tested without claiming rendered glyphs. All 406 observed font responses hash to the local verified binaries. A separately blocked-font negative control produces system fonts and is rejected. No system fallback, external request, failed positive-case asset or browser exception occurred.

Measured direction is RTL for AR and LTR for EN. Embedded numbers/references use LTR `bdi` isolation; the visible date/time/reference strings retain internal Latin order. Cairo UTC+02:00 is explicitly a demonstration-date value, not a new timezone policy. Medical status remains a neutral unassigned placeholder; colored error/warning/success examples concern the form only. No diagnosis, advice, medical inference or booking authority is introduced.

All 160 cases pass document-width, visible text boundary, sampled hidden-block clipping and asset checks. All visible text, input values and generated mobile labels double from their original computed sizes. In the previously failing320 AR Doctor example, both inputs now measure **16→32px**, and all 18 mobile table labels measure **14→28px**. The separate single-line field limitation below remains disclosed.

Executed **1,600 keyboard focus observations** across the matrix. The skip link is first; focus reaches enabled controls and skips the native disabled action; outlines are solid 3px with 4px offset, remain in the viewport and pass measured contrast. Preview text changes locally and appointment details open the explanation. No data is saved. This does not establish screen-reader or complete accessibility conformance.

Fresh captures reproduce **10/10 representative author PNGs byte-for-byte**, including both Arabic families in dark/light Patient390, dark/light Doctor1440, and corrected dark Doctor320/text200. Hashes for both sides are recorded in the raw independent results. This establishes those originals as faithful browser captures; it does not claim human visual inspection of every screenshot.

Independently constructed clean Chromium profiles for a paired native 100/200 Noto/Doctor/AR/light case with physical window 640. At100/200: CSS viewport 640/320, DPR 1/2, CDP viewport zoom 1/2, visualViewport.scale 1, CSS zoom 1 and computed title 30px. Direct CDP compositor capture retains physical bitmap width 640 at both zooms;200% is 640×9185. The independent200% bitmap is also byte-identical to the author’s corrected native screenshot. This is actual Chromium profile page zoom, separate from computed text doubling and from pinch/CSS zoom. No physical keyboard/OS zoom or installed PWA claim follows.

## Color role and focus verification

Independently recomputed all **96 author foreground/background pairs** using sRGB relative luminance; every reported ratio reproduces within 1e-10 and passes its stated threshold. Also collected **52 fresh browser rest/hover observations** for primary/secondary actions, inputs, invalid boundary, disabled state, open explanation, separate form semantic examples, tags/accent, chart decoration and neutral medical text.

| Measured role | Independent minimum | Threshold |
| --- | --- | --- |
| Ordinary text | 5.714728811:1 | 4.5:1 |
| Meaningful control boundary | 3.870504131:1 | 3:1 |
| Keyboard focus against surrounding surface | 5.217959365:1 | 3:1 |

The preferred starting dark/light HEX values are retained. Dark foreground on apricot and light dark-violet actions have sufficient contrast; hover uses actual distinct computed colors. Decorative separators are not presented as required 3:1 control boundaries. Chart values appear in text and bars are redundant decoration. The neutral medical status does not acquire purple or orange clinical meaning. Scope remains partial criterion evidence, not WCAG 2.2 certification or permission to adopt global tokens.

## Finding dispositions

| Finding | Disposition and evidence |
| --- | --- |
| **IR-01 — blocking evidence completeness:** initial computed200 scaler omitted input values and generated mobile table labels | **Resolved.** Independently measured input16→16 and first mobile label14→14 while regular label14→28. Author expanded its scaler, assertions and rendered-input audit, then regenerated 160 cases. Independent corrected 160-case rerun confirms input16→32 and generated labels14→28; corrected 320 PNGs match byte-for-byte. [Initial finding](evidence/independent-findings.json), [initial independent matrix](evidence/independent-browser-initial.json), [current matrix](evidence/independent-browser.json). |
| Native screenshot raster normalization, identified by the author during review | **Resolved before final assessment.** Original Playwright full-page helper normalized bitmap width; author switched to direct CDP capture with recorded physical dimensions/zoom. Independent direct capture verifies actual native zoom and reproduces one final native PNG exactly. |
| Upstream license formatting failed the unchanged whitespace gate | **Resolved without a gate exception.** Exact upstream payloads are preserved in deterministic `.original.gz` files; full readable notices normalize only line endings and trailing spaces/tabs. Fresh independent upstream comparisons, decompression and normalization assertions pass. Font binaries, browser source, QA and screenshots remain unchanged, so their existing execution evidence still applies. |
| Single-line reference at 320/text200 requires internal horizontal scrolling | **Nonblocking disclosed limitation.** Final character is initially outside the field’s visible content. Independent keyboard proof retains `DEMO-360-01`: End exposes its end with scrollLeft 13; Home returns scrollLeft 0; Ctrl+A selects 0..11. No data is lost. [Focused proof](evidence/independent-input.json), [tool](tools/independent-input.mjs). This is distinct from document overflow and sampled hidden-block claims. |
| Final font/palette selection, outline-font origin, material/device/rights questions | **Remain owner/future gates.** No technical result closes AP01/AP04 or AP02/AP03/AP05. Font licenses do not resolve artwork authorship/exclusivity. |

## Visual assessment and aesthetic concerns

Used the actual image viewer on all eight Arabic normal representatives: Plex/Noto Patient390 dark/light and Doctor1440 dark/light. Also inspected both final Doctor AR dark320/text200 originals, the initial320 captures when diagnosing IR-01, Doctor EN dark1440, AR tablet768 and the independently captured native200 Noto Doctor AR light screenshot.

Both Arabic candidates retain joined forms, visible dots/marks and a clear400/600 difference. Plex is narrower and more open; Noto appears fuller, particularly in headings, so equal nominal sizes do not produce identical optical prominence. Inter’s Latin digits/references are readable and isolated; six-row Doctor content remains scanable on desktop and stacks without document overflow on mobile. No visibly clipped Arabic marks were found in these viewed images.

These are separate owner/usability concerns, not measured contrast failures:

- At 14px, metadata and dense Arabic table rows remain visually small despite high contrast; Noto’s fuller forms and Plex’s finer regular strokes merit native Egyptian reader comparison at actual device scale.
- The evidence control bar is tall on mobile, and 320/text200 produces extensive vertical scrolling and heavily wrapped headings. It succeeds as an enlarged review specimen but does not establish an efficient final product layout.
- The320/text200 single-line reference requires horizontal movement inside the field; consider this in later field design, after owner typography choice.
- Equal nominal sizes do not fully balance Latin and Arabic optical weight. The proposed Plex recommendation is defensible from the shown examples, but Noto remains credible and the owner must choose.
- Apricot is restrained to an explicit synthetic badge and the palette has clear text hierarchy. Screen evidence does not settle long-session comfort, color-vision usability or final brand appeal.

## Preservation, input hashes and delivery boundary

Directly read every tracked file from accepted head `81ea915d10c4ad83578465dcd8b2d26d69d1b6fe` and compared current bytes: **1,651/1,653 identical**, zero missing. The only exceptions are the authorized `docs/CURRENT_STATUS.md` and `docs/SOURCE_OF_TRUTH.md` summaries. This includes all prior source-exact logos, archived screenshots/JSON, runtime, dependencies/lockfile, CI configuration, schema, migrations and OpenAPI. The reviewer did not alter #96/#97; their remote heads and final Draft/Open/Unmerged state remain delivery-handoff checks.

[Independent audit input manifest](evidence/independent-audit.json) records SHA-256 for all 242 reviewed author appendix inputs, including every author PNG and the three original license archives, plus six governance/content inputs. It excludes independent outputs and the derived self-referential `artifact-hashes.json`, which is finalized after this report. The delivery inventory must cover the resulting report/tools/evidence too.

| Key reviewed input | SHA-256 |
| --- | --- |
| `index.html` | `6d89214fe0c49ca07ef144a0dc274c6d482beb892649216819695e5c30924414` |
| `review.css` | `f0957ba99398838db99d3cda506e11f22c59eca99783aa96822baf67ada073ca` |
| `review.mjs` | `75f35903d6a1d274266b6bed26b583bbd94363294485429a2c8fc378d5b8eb9b` |
| `tools/qa.mjs` | `ed51760acfb5871a8825871571021406cab6e75c3522b595cc456bf75061723b` |
| `tools/native-zoom.mjs` | `706ac4f3a9bde7ac848ef1117358a9fe9eb242db5e452d3b58b39367c449a3c0` |
| `evidence/browser-qa.json` | `1c187a72664eaff0348a54acafc6927b7b7ff0973b6433703eda16438622af57` |
| `evidence/native-zoom.json` | `e3d455a604a6aa75e792342febf44df174983e1cf007a1fa7326cde5956d90fe` |
| `evidence/color-pairs.json` | `0a47e72ab3b25da419353bc51d2582463f8a7f2c1818499eb2a79011581eaea8` |

Unsupported by this review: Firefox, WebKit/Safari, Windows/macOS, Android/iOS, physical devices, touch, OS text settings, real assistive technology, installed PWA, print, color-vision participants, native Egyptian participant/editorial certification, whole-product WCAG conformance and legal/trademark clearance. The reviewer did not execute production flows or grant clinical policy, owner design, merge or deployment approval. Exact-head CI success is required before the delivery is called technically Green; **AP01/AP04 owner choice remains pending and the Draft PR must stop for owner review.**
