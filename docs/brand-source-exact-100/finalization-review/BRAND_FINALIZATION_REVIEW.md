# Consolidated Brand Finalization Review — AP02 / AP03 / AP05

**Owner review, not final Brand V2 or Design System approval.** [Current authorization and AP01/AP04 acceptance](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6760649216). Same Draft PR #101 / `design/100-source-exact-violet-apricot`; base/main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; preserved accepted evidence head `cca4942a75672f2fae1a79f771cae8e7070d2e1b`. #96 remains `cb3fd9112f15e17b3d500d7a9dd085dd6e412525`; #97 remains `e1abedc3d1c8811912f0fe6576e4b4f3459210ce`. No new branch, production change, merge or deployment.

## Decisions and recommendation

| Gate | Current disposition / next decision |
| --- | --- |
| DP01 | **OWNER ACCEPTED.** Preserve Arabic spacing, outlined paths and transforms. |
| DP02 | **OWNER ACCEPTED.** Preserve all six tagline-free AR/EN/bilingual primary lockups; historical taglines remain archival only. [Visual acceptance](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6759258304). |
| AP01 | **OWNER ACCEPTED UI typography:** Inter400/500/600/700 + genuine IBM Plex Sans Arabic400/600. [Unchanged provenance/OFL/weights](../ap01-ap04-review/evidence/font-provenance.json). Noto remains a reviewed comparison, not a silent default. The original outlined logo font is still historically approximate. |
| AP04 | **OWNER ACCEPTED Brand Color Reference:** Violet × Apricot A — Balanced, including the [exact tested supporting pairs/states](../ap01-ap04-review/evidence/color-pairs.json). No new colors/tokens adopted. Apricot is non-semantic; medical states remain separate. Acceptance does not certify every application combination. |
| AP02 | **PENDING OWNER AESTHETIC DECISION. Recommend accepting current source-exact gradients**, with disclosed smoother vector finish. No visible/measured defect here justifies adding effects or an alternative recolor/redraw. |
| AP03 | **PARTIAL EVIDENCE; distribution gate OPEN.** Desktop Chromium render/native-zoom and PDF-export checks below are bounded results. Physical OS icons, actual Chrome/Edge/Firefox/Safari, installed PWA, OS text settings and physical print remain NOT TESTED. |
| AP05 | **OPEN.** Font provenance is documented; underlying artwork creator permissions, exclusivity and trademark clearance are not established. Public/commercial rights claims remain blocked. Internal review is not legal clearance. |

## AP02 — actual material comparison

[Dark comparison](evidence/material-dark.png) · [Light comparison](evidence/material-light.png) · [native-size strip](evidence/native-sizes.png) · [reproducible viewer](comparison.html). Three representative PNGs only; previous evidence is reused below.

The comparison places the **actual historical raster master crop**, the **actual untouched #96 SVG** and the **actual existing Violet × Apricot SVG** side by side at310×320 CSS px on dark/light review surfaces. The same boards include existing primary/compact AR/EN lockups and16/24/32/64/192/512 icons at declared sizes. Original raster bytes are fetched from pinned #96, SHA-256 **`0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417`**; crop `(145,70,310,320)` selects its master symbol. The raster is not recolored, enhanced or substituted. It is injected by the verification tool for capture, not duplicated as a new source asset. Palette differences are already accepted AP04 decisions; they are not a material-fidelity score.

**Neutral critique:** the board has more localized glossy tonal variation and raster texture, especially the bright right shoulder/head and darker fold. #96 already translates this into cleaner, smoother vector ramps. The current candidate retains that vector material construction, open cavity, floating head and ribbon/fold hierarchy while using accepted violet/apricot. At large size, the finish is visibly less textured; at compact header size the soft volume remains distinguishable; at16–24px fine rims, fold edges and shading merge. This loss does not justify silently altering approved contours or inventing missing raster effects. No new gradient, contour, optical variant or background color is introduced. [Existing path/gradient audit](../evidence/dp02/path-audit.json).

**Owner choice:** accept this documented vector-material approximation, or specify a precise material concern for a separately bounded revision. Do not close AP02 from CI or this recommendation. A future small-icon optical exception is a separate owner-gated proposal only if real platform/recognition tests identify a meaningful failure; none is designed here.

## AP03 — actual capability matrix

Environment: Debian GNU/Linux13, Linux6.18.57, x86_64 virtual desktop/headless; Chromium154.0.8037.57; Playwright1.64.1. [Fresh measurements and browser availability](evidence/validation.json). PASS below refers only to the named operation.

| Platform / operation | Actual result and limit |
| --- | --- |
| Chromium Linux desktop SVG rendering | **PASS:** dark/light boards, native16/24/32/64/192/512 CSS dimensions, loaded images and no browser/network/external-request errors. All existing assets retained. This is not an installed favicon test. |
| Native Chromium page zoom | **PASS, two focused100/200 observations:** approved Plex/AR/Patient specimen at physical1280px; CSS viewport1280→640, DPR1→2, native CDP zoom1→2; title stays30 CSS px and document reflows. [Previously validated native captures](../ap01-ap04-review/evidence/native-zoom.json) remain unchanged; the160-case matrix is not repeated. |
| Computed text scaling / AR/EN layouts | **REUSED exact-head evidence**, not a fresh whole-matrix claim: [160 cases and known field-scroll limitation](../ap01-ap04-review/README.md#comparable-text-and-responsive-evidence). No relevant runtime/CSS change to those specimens. OS text settings remain NOT TESTED. |
| Maskable geometry | **REUSED browser geometry proof:** bounding-corner radius170.604px within204.8px safe circle; [original safe-zone capture](../evidence/dp02/maskable-safe-area.png), [raw measurement](../evidence/dp02/browser-qa.json). This does not prove OS mask selection or installation. |
| Chrome-branded desktop / Edge / Firefox / Safari | **NOT TESTED.** Only open-source Chromium is present; Edge/Firefox/WebKit browser executables are absent and there is no Apple Safari/OS. Chromium similarity does not substitute for these products. |
| Android / iOS home screen and installed PWA | **NOT TESTED / future distribution gate.** No physical devices, authorized install build or platform installation session. No manifest/service worker/website changes. |
| Chromium PDF export | **PASS for export only:** [actual one-page A4 PDF, gzip archive](evidence/chromium-print.pdf.gz), generated with backgrounds, checked and rendered with Poppler. Poppler exits0 and the viewed page is intact, but emits five `Bad bounding box in Type 3 glyph` warnings; PDF compatibility remains limited, not certified. This is not physical printing, CMYK/press/monochrome proof or installed-platform evidence. |
| Physical print / OS text settings / touch / assistive technology | **NOT TESTED / future respective gate.** No physical printer/device or assistive-technology session. |

The exact native PDF payload is gzip-packaged to preserve required PDF cross-reference whitespace under the unchanged repository whitespace gate, without editing PDF bytes or adding a CI/Git-attribute exception. Unpack with `gzip -dc docs/brand-source-exact-100/finalization-review/evidence/chromium-print.pdf.gz > /tmp/brand-print.pdf`; then open `/tmp/brand-print.pdf`.

### Short executable manual checks — future authorized test session

Record exact build SHA, URL, OS/device/browser versions, viewport/DPR and settings in every result. Use only an independently authorized local/HTTPS test build; these instructions do not authorize deployment. The names below are **expected future captures, not existing evidence**.

For the light comparison in an actual browser, run this local DevTools Console command (use `dark` for the other theme): `{ const t="light"; document.documentElement.dataset.theme=t; document.querySelectorAll(".themed").forEach(i=>i.src="../assets/"+i.dataset.file+"-"+t+".svg"); document.querySelector("#theme-label").textContent=t+" review surface · AP02 pending"; }`. Use the verified themed PNGs as visual references; the historical raster slot is populated only by the verification tool.

| Check | Execute / expected capture and acceptance |
| --- | --- |
| Chrome, Edge, Firefox, Safari | Open `comparison.html` served from the pinned checkout and the approved AR/EN specimen; inspect both themes at100% and200% browser zoom. Save `{browser}-{os}-{theme}-zoom{100,200}.png`. Expected: correct source art/colors, joined Arabic/marks, readable reference order, no document overflow or missing glyphs; record failures, not inferred PASS. |
| Real favicon / small sizes | In each actual browser use a separately authorized HTTPS test build whose manifest/favicon URLs map to the hashed existing exports. Clear site/icon cache; inspect normal/pinned tabs and bookmark surfaces where supported. Capture tab+favicon with browser/version visible. Record which16/24/32 asset was selected and whether head/ribbon remain distinguishable; do not substitute an optical redraw. |
| Android installation | On an actual Android phone/Chrome record OS/model, manifest icon URLs/hashes and maskable purpose; install the authorized build, capture install prompt, home screen at native scale and launched standalone view. Check chosen192/512 export, mask/clipping and launch icon; repeat supported OS text/display-size changes. Save `android-{version}-{model}-{home,launch,text200}.png`. No device means NOT TESTED. |
| iOS installation | On an actual iPhone/iPad/Safari record versions and selected touch/manifest icon; Add to Home Screen, capture home screen and launch, then supported Larger Text/display settings. Save `ios-{version}-{model}-{home,launch,largetext}.png`. Check real icon selection/masking, recognizability and no clipping; do not infer Apple behavior from Android/Chromium. |
| Physical print | Open the attached PDF at100%/actual size; print without fit-to-page in color and grayscale. Record viewer/printer/paper/scaling; photograph with ruler and retain scan. Expected outer icon sizes at96CSSpx/in:32px≈8.47mm,64px≈16.93mm,192px≈50.8mm. Inspect fold/rim separation, Arabic dots and readability under ordinary light. Record color/gray failures; a PDF preview is not this result. |

**Use boundary:** private desk/review artifacts support bounded graduation-project evaluation with synthetic content and honest labels; they do not establish public PWA branding readiness, universal small-size recognition or print readiness. Public distribution must retain the applicable AP03 checks as explicit hold points. No universal minimum size is finalized here.

## AP05 — provenance and rights risk register

Reviewed evidence: [#96 source/provenance account](https://github.com/abuhmaid28/egyhealth360/blob/cb3fd9112f15e17b3d500d7a9dd085dd6e412525/docs/brand-identity-reconstruction/README.md), [#97 deferred rights disclosure](https://github.com/abuhmaid28/egyhealth360/blob/e1abedc3d1c8811912f0fe6576e4b4f3459210ce/docs/brand-identity-v2/DEFERRED_POLISH.md), current repo/source manifests and live #96/#97 discussions (no comments). No separate creator grant or trademark clearance was found in that reviewed set; this is not proof that none exists elsewhere. No paid service, remote IP search or invented clearance was used.

| Item | Evidence / disposition | Owner action and release effect |
| --- | --- | --- |
| User-selected original artwork | #96 records owner-supplied `EgyHealth360_Approved_Brand_Board_Source.zip`; extracted1536×1024 board hash is verified. Selection/upload establishes the project reference, **not creator identity or ownership**. | **OPEN:** identify creator/source and retain the original delivery, date and any terms. Missing provenance blocks assured public/commercial rights claims. |
| Reconstruction / gradients / outlined assets | #96 records measured/manual source-derived contours, fitted outlines and smoother gradients; #101 preserves those paths and accepted decisions. A reconstruction/owner aesthetic approval is not a new independent copyright grant. | **OPEN:** obtain written permission covering reproduction, modification, display, distribution and intended uses; resolve contributor rights. Do not assume sublicensing or exclusivity. |
| UI and outline-font notices | Accepted AP01 [pinned binary hashes and full OFLs](../ap01-ap04-review/evidence/font-provenance.json), including exact original notice archives and readable copies; earlier notices preserved. Verified font licenses do not license the source board or prove the original outlined font identity. | **DOCUMENTED FONT PROVENANCE:** retain notices and comply with relevant font/redistribution terms. Do not convert this into artwork/trademark clearance. |
| Originality / similar name or symbol | No originality/exclusivity opinion or jurisdiction-specific trademark search is evidenced. | **OPEN:** owner records intended jurisdictions/goods/services; collect creator originality statement and any permitted reverse-image/public trademark search results. A search can flag conflicts; no result proves ownership or clearance. Public trademark/exclusive/commercial claims stay blocked. |
| Guarded internal graduation preview | Current authorization covers synthetic design/documentation review, with no new public deployment. This reduces exposure compared with public rollout but supplies **no legal exemption or third-party permission**. | Owner retains/obtains the necessary permissions, limits access and attributes sources where required. Do not advertise legal clearance or treat internal demonstration as assured public distribution. |

**Zero-cost owner evidence packet:** creator/contact + original source URL/file and dates; signed/email permission with exact asset hashes and intended uses; contributor/stock/AI-service terms where applicable; preserved font notices; dated conflict-search notes with jurisdiction/scope and unresolved flags. Archive the actual documents, not a checkbox assertion. Legal advice may be appropriate for intended commercial/trademark claims, but no purchase or certification is required to document these OPEN items.

## Validation, preservation and next action

[Validation](evidence/validation.json) · [whole-baseline preservation /23 SVG hashes](evidence/preservation.json) · [small new-file inventory](evidence/inventory.json) · [independent validation](evidence/independent-review.json). All prior1921 tracked files are checked against the immutable accepted head; only CURRENT_STATUS and SOURCE_OF_TRUTH may differ. All original logos, screenshots/JSON, approved AP01 fonts/OFL/provenance and AP04 color roles remain byte-identical. Earlier pending-approval prose is a historical snapshot superseded by the current owner comment; it is not rewritten.

Reproduce from repository root with the existing free environment tools: serve via `python -m http.server 8100 --bind 127.0.0.1`, then `node docs/brand-source-exact-100/finalization-review/verify.mjs`. The tool fetches the pinned historical board into `/tmp` if absent and verifies its hash before capture. `--inventory` refreshes only deterministic preservation/new-file hashes after final review. No dependency or CI configuration changes. Final committed head, independent exact-commit confirmation and actual required CI belong in the same Draft PR handoff; no old-head Green is substituted.

Five checkpoints: baseline; material comparison; platform/rights disposition; independent validation; exact-head CI / same Draft PR handoff. Evidence delivery completion does not close AP02/AP03/AP05.

**Next owner action:** accept current gradients for AP02 or name a bounded material concern; assign AP03 device/print test responsibility and AP05 provenance/rights responsibility. The owner can then separately authorize the next documentation/design planning step with explicit distribution/legal hold points. No automatic final Brand V2/Design System adoption, implementation, merge, deployment or unresolved-gate closure follows. Stop for owner decision.
