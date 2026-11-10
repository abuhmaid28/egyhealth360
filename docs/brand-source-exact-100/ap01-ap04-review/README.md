# AP01 typography / AP04 color role evidence

**Evidence only — owner choice pending. Same Draft PR #101; no merge or deployment.** [Latest Product Owner authorization](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6759512805). This appendix does not finalize fonts, global tokens, Brand V2, the Design System or product screens. The prior package is an exact historical snapshot: DP01 and all six tagline-free DP02 primary lockups were [visually accepted at `81ea915d10c4ad83578465dcd8b2d26d69d1b6fe`](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6759258304). Their files and every previous screenshot/JSON remain byte-identical.

[Interactive comparison](index.html) · [Side-by-side screenshot gallery / complete matrix / measured HEX pairs](gallery.html) · [Independent review](INDEPENDENT_REVIEW.md) · [Baseline](evidence/baseline.json) · [Preservation](evidence/preservation.json) · [Complete artifact hashes](evidence/artifact-hashes.json).

## Owner choice recommendation

Recommend **Inter 400/500/600/700 + IBM Plex Sans Arabic 400/600** as the next UI typography candidate, with the **Violet × Apricot A — Balanced** roles below. Plex's open letter forms and differentiated 400/600 remain clear in the synthetic dense rows and marked Arabic samples. Noto Sans Arabic is a credible, genuinely distinct alternative with a fuller, rounder appearance; inspect its Arabic headings and small metadata alongside Plex before choosing. These are visual judgments, not user-study results. Noto is an explicit comparison choice, not a concealed substitution when Plex fails to load.

Retain generous Arabic line height, real 600 instead of manufactured bold, and light-mode dark violet for actions. Apricot works as a restrained non-semantic accent with dark foreground; it is not warning text or a medical status. Both Arabic candidates reflow at the tested sizes without measured clipping. Owner may select either family or request a targeted size/spacing revision; **AP01/AP04 stay open until an explicit owner decision**. No further implementation follows automatically.

## Genuine local fonts and weights

All four binaries are unmodified files from the official [Google Fonts repository at `5bb28733cec313b63fbd415b574b5ae35c8aa8b8`](https://github.com/google/fonts/tree/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl). [Full provenance](evidence/font-provenance.json) includes pinned download URLs, names, version, OS/2 weight, variable axes and SHA-256. Full OFL notices and upstream metadata are retained locally. Readable OFL copies normalize line endings/trailing spaces only to satisfy the unchanged whitespace gate; each exact upstream license byte payload is also preserved in a deterministic `fonts/*-OFL.original.gz` archive. Original and readable hashes are recorded in provenance; no notice text is removed or rewritten. No remote font request, paid dependency, CSS stretching, synthetic italic or simulated bold is used (`font-synthesis: none`). Existing font files elsewhere in the repository are untouched and unused here.

| Local binary | Verified identity / weights | SHA-256 |
| --- | --- | --- |
| [plex-400.ttf](fonts/plex-400.ttf) | IBM Plex Sans Arabic Regular; PostScript `IBMPlexSansArabic-Regular`; OS/2 **400**, static, v1.101 | `6f611412270a132bbac838da9259d4c68569b4175f3b3b8fa3fa36a30b56dab9` |
| [plex-600.ttf](fonts/plex-600.ttf) | IBM Plex Sans Arabic SemiBold; PostScript `IBMPlexSansArabic-SemiBold`; OS/2 **600**, static, v1.101 | `597bd5502e5997be4414e4c9c88834b30ff3784250c84f20bce2b20e53ebd467` |
| [inter-variable.ttf](fonts/inter-variable.ttf) | Inter; PostScript `Inter-Regular`; default OS/2 400; real `wght` 100–900, used **400/500/600/700**; `opsz` 14–32, held at default **14**, v4.001 | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| [noto-variable.ttf](fonts/noto-variable.ttf) | Noto Sans Arabic; PostScript `NotoSansArabic-Regular`; default OS/2 400; real `wght` 100–900, used **400/600**; `wdth` 62.5–100, held at default **100**, v2.012 | `63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e` |

Licenses: [Plex OFL](fonts/ibmplexsansarabic-OFL.txt), [Inter OFL](fonts/inter-OFL.txt), [Noto OFL](fonts/notosansarabic-OFL.txt). Plex SemiBold's legacy name ID2 is `Regular`, but name ID1 identifies the SemiBold family, typographic name ID17 is `SemiBold`, PostScript names differ and OS/2 is **600**. The regular file is never relabeled 600. Variable PostScript names remain `*-Regular` at multiple rendered weights; they identify the binary, not a fabricated static weight. The [font instance audit](evidence/font-instance-audit.json) instantiates all eight requested weights, verifies OS/2 and different glyph-table hashes, and checks Arabic diacritic/sample coverage. Derived instances are validation objects only and are not redistributed.

Browser proof combines exact HTTP response-byte hashes, CSS weight/synthesis checks, Chromium `CSS.getPlatformFontsForNode` on real rendered text, distinct Plex PostScript names, and six script/weight probes per case. `document.fonts.ready` is only synchronization. [Raw browser QA](evidence/browser-qa.json) includes **1,624 rendered-text observations** across every family/role/language/theme at 390px, plus **960 probe observations** across all 160 cases. A separate blocked-font negative control produces system fallback and is correctly rejected by the detector. An early unintended system fallback in the English page's Arabic language link was fixed and the final matrix regenerated.

## Comparable text and responsive evidence

The same responsive Web/PWA specimen covers Patient and Doctor contexts in AR RTL / EN LTR, dark/light, with a tablet layout. Controls in the separate review bar switch language, theme, role and Arabic family. The specimen has headings, named Gregorian month/date, 24-hour appointment times, actions, form labels/helpers, invalid/empty states, expandable tooltip explanation, medical-information labels, dense six-row doctor table, diacritics, Latin digits and isolated references. All people, appointments and chart counts are generic synthetic fixtures. No real patient information, diagnosis, treatment, clinical recommendation, persistence, authority grant or new production journey exists.

| Text role | English | Arabic (both candidates) |
| --- | --- | --- |
| Page title | 30px / 700 / 1.4 | 30px / 600 / 1.4 |
| Section heading | 20px / 600 / 1.65 | 20px / 600 / 1.65 |
| Body | 16px / 400 / 1.6 | 16px / 400 / 1.85 |
| Metadata / dense table | 14px / 400 | 14px / 400 |
| Labels / actions | 14–16px / 500 | 14–16px / 600 |

Script prominence is compared at the same nominal sizes; this is not a claim that both scripts have identical glyph height or optical weight. No Arabic letter spacing or fixed-height text boxes are used. Under computed text scaling each visible text element, form value and generated mobile table label is doubled from its original computed size, including nested Latin runs. This is separate from native zoom. Small metadata and real assistive-tech reading remain owner/usability review concerns. At320px with200% computed text, the long single-line reference input needs its native internal horizontal scrolling to show the final character; the full value is retained. This is a bounded field usability limitation, separate from document overflow and hidden block clipping.

Accepted content conventions are retained: natural modern Egyptian Arabic, Latin digits, named Gregorian months, 24-hour times and the event timezone. Demonstration appointments are **10 November 2026, Cairo (UTC+02:00)**; that offset is specific to this example date, not a permanent timezone policy. Medical labels are unassigned neutral placeholders. Error/warning/success examples describe form UI only, with explicit text and distinct semantic colors, never a medical inference.

**Responsive matrix: 160 full-page PNGs**, 2 families × 2 roles × 2 languages × 2 themes × 320/390/768/1024/1440 CSS px × normal/200% computed text; Chromium 154 Linux, DPR1. No document overflow, sampled hidden clipping, broken assets, unexpected fallback, browser exceptions, failed positive-case requests or external requests. Independent finding IR-01 caught initially unscaled input values and generated table labels; the scaler was corrected and all160 screenshots regenerated before final review. Input-value fonts are inspected inside Chromium's user-agent shadow DOM; empty fields are size-tested without claiming rendered glyphs. Keyboard tab/focus checks cover every focusable specimen control in every case; [focus PNG example](evidence/screenshots/focus-plex-patient-ar-dark-320-text200.png). Local preview action, expandable tooltip and visible disabled state are checked separately. The [gallery](gallery.html#matrix) links every full-resolution PNG.

Representative originals: [Plex Patient AR390 dark](evidence/screenshots/plex-patient-ar-dark-390-normal.png), [Noto Patient AR390 dark](evidence/screenshots/noto-patient-ar-dark-390-normal.png), [Plex Patient AR390 light](evidence/screenshots/plex-patient-ar-light-390-normal.png), [Noto Patient AR390 light](evidence/screenshots/noto-patient-ar-light-390-normal.png), [Plex Doctor AR1440 light](evidence/screenshots/plex-doctor-ar-light-1440-normal.png), [Noto Doctor AR1440 light](evidence/screenshots/noto-doctor-ar-light-1440-normal.png), [Doctor EN1440 dark](evidence/screenshots/plex-doctor-en-dark-1440-normal.png), [AR tablet768](evidence/screenshots/plex-doctor-ar-dark-768-normal.png), [AR320 text200](evidence/screenshots/plex-doctor-ar-dark-320-text200.png).

**Native browser page zoom: 64 paired observations** at 100%/200%, including **32 PNGs** across both families/roles/languages/themes and physical window widths 640/1280. Chromium's actual profile page-zoom preference is used, not CSS zoom, pinch zoom or screenshot resizing. At 200%, CSS widths become 320/640, devicePixelRatio is 2, `visualViewport.scale` remains 1 and title CSS size stays 30px. CDP separately reports native page zoom2; native compositor captures retain physical bitmap widths640/1280 using the browser's non-CSS content rectangle. No image is resized; Playwright's CSS-normalized zoom export is deliberately bypassed. No document overflow. [Native-zoom measurements and method](evidence/native-zoom.json) · [native AR320 example](evidence/screenshots/native200-plex-patient-ar-dark-window640.png). This proves automated Chromium page zoom, not a physical user's browser/OS keyboard behavior.

## Candidate color roles — exact values, not system tokens

All starting owner-preferred values are retained. Supporting roles are derived only for these review specimens. [Complete measured HEX matrix, rest/hover/disabled/focus](gallery.html#colors) · [raw 96 actual pairs](evidence/color-pairs.json).

| Role | Dark | Light | Application |
| --- | --- | --- | --- |
| Background / card / elevated | `#10121D` / `#1D2030` / `#262A3C` | `#F8F7FB` / `#FFFFFF` / `#EFEAF7` | Solid surfaces |
| Primary ink / secondary ink | `#F6F2FF` / `#C2BED2` | `#17142B` / `#595269` | Body, metadata, chart labels |
| Primary / foreground | `#A78BFA` / `#17142B` | `#6240B8` / `#FFFFFF` | Action text contrast **6.588 / 7.131:1** |
| Primary hover / foreground | `#BDA7FF` / `#17142B` | `#50309D` / `#FFFFFF` | Real hover state, measured separately |
| Apricot / foreground | `#FFB88B` / `#17142B` | `#FFB88B` / `#17142B` | Non-semantic accent, **10.655:1** |
| Meaningful control border | `#85839C` | `#787084` | Inputs, secondary CTA, disabled example; **≥3.870:1** on adjacent surfaces |
| Decorative card / divider border | `#36394E` | `#DDD7E9` | Low-contrast grouping decoration, not the sole required control boundary |
| Secondary CTA | ink on card; border above | ink on card; border above | Hover uses elevated surface |
| Focus ring | `#A78BFA` | `#6240B8` | 3px solid with 4px offset; **≥5.217:1** against observed surrounding surfaces |
| Disabled ink / background | `#C2BED2` / `#36394E` | `#595269` / `#E5E0EC` | Native disabled, opacity1; **6.258 / 5.715:1**, voluntarily meets text threshold |
| Form error | `#FFB4B8` | `#9F2638` | Text + invalid boundary, **9.583 / 7.477:1** on card |
| Form warning | `#F1DE91` | `#695100` | Text + explicit warning label, **11.984 / 7.560:1** on card |
| Form success | `#9CD9BE` | `#226346` | Text + explicit success label, **10.051 / 7.140:1** on card |
| Medical status | secondary ink, unassigned | secondary ink, unassigned | Separate neutral placeholder; no clinical meaning or purple status |

WCAG sRGB luminance computation on actual computed solid foreground/background pairs gives minimum **5.7147:1 ordinary text**, **3.8705:1 meaningful boundaries**, **5.2179:1 focus**. Thresholds are 4.5:1 text and 3:1 required non-text/focus. Card separation is decorative; textual headings carry grouping. Chart labels show all synthetic values in text; bars are redundant decoration. Logo artwork is preserved trademark imagery and is outside ordinary UI-text claims. This is partial criterion evidence, **not WCAG 2.2 certification**.

## Reproduction, scope and remaining gates

Serve the repository: `python -m http.server 8100 --bind 127.0.0.1`. Free Playwright 1.64.1 and repository-pinned ESLint tools were installed under `/tmp/eh-review-tools`, outside repository dependencies. Python fontTools 4.61.1 and Chromium 154 are environment tools. Run from repository root:

```sh
EH_REVIEW_PLAYWRIGHT=/tmp/eh-review-tools/node_modules/playwright/index.mjs node docs/brand-source-exact-100/ap01-ap04-review/tools/qa.mjs
EH_REVIEW_PLAYWRIGHT=/tmp/eh-review-tools/node_modules/playwright/index.mjs node docs/brand-source-exact-100/ap01-ap04-review/tools/native-zoom.mjs
python docs/brand-source-exact-100/ap01-ap04-review/tools/build-index.py
python docs/brand-source-exact-100/ap01-ap04-review/tools/audit.py
```

QA includes an intentional blocked-font negative-control page; its expected failures are separated from the zero-error positive cases. Regenerate the index after QA and the hash inventory after all reviewer/docs outputs. Local repository CI-policy tests (30), focused unchanged-config ESLint, Python/MJS syntax, whitespace, reference classification and preservation checks are required. Actual exact-committed-head CI and final remote state are reported in the PR handoff, avoiding a self-referential SHA embedded in its own commit.

Only this new appendix plus `docs/CURRENT_STATUS.md` and `docs/SOURCE_OF_TRUTH.md` change from the accepted head. The per-file [preservation report](evidence/preservation.json) verifies every previous tracked file, with only those two summary exceptions. Runtime, dependencies/lockfile, CI configuration, schema/migrations/OpenAPI, approved SVGs, previous source assets/evidence and protected screenshots remain byte-identical. #96/#97 remain unchanged; no production import, manifest/service worker, ownership policy, deployment, merge, ready transition or auto-merge.

Five checkpoints: baseline; font provenance; AR/EN typography; color/responsive proof; independent review/exact-head CI/owner gate. Technical delivery completion is recorded with the actual remote CI in the PR; the owner decision remains a separate pending gate.

**Open:** AP01 owner typography choice and approximate original outlined-font origin; AP04 owner color-role/usage decision; AP02 material fidelity; AP03 installed-device/small-size/print behavior; AP05 rights/trademark clearance. Font OFL provenance does not establish ownership of logo artwork. No final Brand V2 or Design System approval.

**Not tested / unsupported by this evidence:** Firefox, WebKit/Safari, Windows, macOS, Android, iOS, physical devices/touch, OS text settings, installed PWA, real assistive technology/screen readers, print, color-vision participant testing, native Egyptian participant/editorial validation and legal/trademark clearance. Native page zoom is verified only in automated Linux Chromium. No whole-product accessibility or production behavior claim. Stop for owner review.
