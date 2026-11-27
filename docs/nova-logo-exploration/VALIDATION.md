# Logo exploration — validation and limits

Subject: three isolated proposal families and owner viewer. Base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; source Patient header PR94 `9e5fca14c7f931a49e94dd88915f8c9fa24a45da`. Recovery checkpoint `ca0ff90ed834d328e68ec0ed0bcfba0ac317bfd8` contains61 recovered files, preserved before continuing. Source CSS is relocated with only font-URL rebasing; source validation CSS and five font/license files are copied unchanged.

## Executed matrix

| Evidence | Method and boundary |
| --- | --- |
| [Browser report](evidence/browser-results.json) | 80 cases: viewer +3 proof pages +6 AR/EN header contexts ×4 widths ×normal/200% measured direct text. Viewer widths1280/768/390/320; headers1440/768/390/320. Includes overflow, essential sampled text, fonts, images, icon references and AX control names. |
| Native small-size proof | 3 families ×4 symbol variants ×16/24/32 =36 configurations; actual displayed SVG dimensions and vector bounds recorded. No small-size replacement geometry. Proof sheets show native sizes, not enlarged thumbnails labeled16px. |
| Keyboard | Viewer skip link, focus-to-main and six proposal/download links, visible3px focus. No modal or clinical action is introduced. |
| [Additional audit](evidence/audit.json) | Final report assertions, local SVG safety/inventory, sampled text/symbol contrast, source font/license parity and preservation. Automated evidence does not establish beauty or legal distinctiveness. |
| [Render report](evidence/render.json) | Five actual Chromium captures; original frame icons retained. Capture waits for inner fonts and iframe heights so disclosures remain visible. |

The recovered80-case report had no failures. A first resumption attempt failed because the interrupted local server had stopped; it was restarted on loopback, then final checks were rerun. No failed/incomplete attempt is counted as PASS. The renderer's frame-fitting synchronization was corrected after an independent observation; only affected render/technical evidence is refreshed. Original draft rejections and A optical defect are documented in the independent review, not hidden behind passing layout results.

200% means every visible direct-text computed size is doubled and ratios recorded, regardless of px/rem declarations. **It is not native browser zoom.** Symbols and wordmark vector art remain images with accessible names. Standalone headers are tested at doubled text separately from the normal embedded header examples.

## NOT TESTED / unresolved

Native browser zoom, physical devices/OS scaling/touch/glare, Firefox/WebKit/Safari, real screen readers/spoken announcement timing, native Egyptian editorial/participant recognition, exhaustive global logo search and legal trademark clearance are **NOT TESTED**. The existing headless environment cannot establish these results. Automated AX/contrast/reflow checks are not WCAG certification. No clinical/backend integration, final Design System, final identity approval or multi-portal product test is implied.

All code/assets are isolated under this folder. Three governance summaries are the only existing-file exceptions: CURRENT_STATUS, SOURCE_OF_TRUTH, IMPLEMENTATION_ROADMAP. Production code, auth, clinical contracts, schema/migrations, dependencies, CI policy and all historical candidate bytes remain preserved. [Preservation and artifact inventory](evidence/preservation.json).

## Reproduction / delivery

Use installed Python FontTools and repository Playwright/system Chromium; no dependency installer is required. `generate.py` reads exact94 header blobs with `git show` (that object must be available), writes original SVGs and HTML; `render.mjs` and `validate.mjs` use a loopback repository file server via `SPECIMEN_ORIGIN`, default `http://127.0.0.1:8765`. `audit.mjs` asserts the final report and scope. `CHROMIUM_PATH` may select an existing browser.

Existing CI policy conservatively selects full regression for unmapped design assets. Final-head run/job conclusions and exact head are recorded in the Draft PR handoff, after the stable final commit. No CI policy is weakened; no old or checkpoint green run substitutes for final-head CI. Technical Green is distinct from independent visual assessment and owner selection. Draft stays open/unmerged/auto-merge off; no deployment.
