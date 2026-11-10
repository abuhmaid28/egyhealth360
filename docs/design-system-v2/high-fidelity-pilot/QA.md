# Browser evidence and bounded QA

**Issue #106, isolated design candidate.** Author: root Codex agent; independent visual reviewer: separate `/root/independent_visual_review`, attributed in [its report](evidence/independent-review.md). Technical success is not Product Owner visual/content approval, clinical runtime proof, legal clearance or full WCAG conformance.

## Reproduce

1. From repository root, run `python docs/design-system-v2/high-fidelity-pilot/prepare-reference.py`. Nine pinned inputs are verified by length/SHA-256 in ignored `.reference/`. The three fonts and four logos are not recommitted; two original OFL files accompany local use. [Reference identities](reference-manifest.json), [parsed font identity](evidence/font-identity.json).
2. For local review and automated browser evidence, serve only this folder with `python -m http.server 8766 --bind 127.0.0.1 --directory docs/design-system-v2/high-fidelity-pilot`, then open `http://127.0.0.1:8766/gallery.html` ([source](gallery.html)). This managed Chromium blocks `file://` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; direct-file behavior in other browsers is untested.
3. Install tooling in a separate temporary directory, without changing repository manifests or lockfiles: `npm install --prefix /tmp/eh106-tools playwright@1.56.1 @axe-core/playwright@4.11.0`. Use system Chromium. Run `QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/verify.mjs`. Override `CHROMIUM_PATH` or `QA_BASE_URL` if needed.
4. Inspect [qa-results.json](evidence/qa-results.json), the actual screenshots below, [independent critique](evidence/independent-review.md) and [preservation inventory](evidence/preservation.json). Re-running captures replaces only this candidate's generated evidence. Historical evidence is preserved.

Actual environment: Linux headless **Chromium154.0.8037.57**, Playwright1.56.1, axe-core4.11.0, deviceScaleFactor1. Existing repo tooling remains unchanged; this is not a claim to have run its pinned Playwright version. Viewport emulation is a CSS layout test, not a physical phone or an installed PWA. Desktop screenshot viewport is1440×1200; narrow/tablet captures use full-page PNG. The JSON records dimensions/settings, exact screenshot bytes and SHA-256s.

## Executed coverage and interpretation

**Final author result: PASS within this scope.**64 layout/text cases,16 axe audits with zero violations and zero incomplete results,13 actual PNGs.62 distinct computed contrast pairs represent4,984 observations; minimum text5.218:1, essential non-text3.871:1. Zero horizontal document overflow, text-range clipping, undersized visible controls, missing assets, external requests or page errors in this matrix. This does not extend to the untested platforms listed below.

- **40 core cases:**2 roles ×2 languages ×2 appearances ×320/390/768/1024/1440px. **8 additional1920px cases** and **16 text200% cases** at320/390px. Total64 distinct layout/text cases. Document overflow, rendered text-range clipping, text contrast, essential icon/control boundaries,44px target comfort, missing assets and external requests are checked per case. Hidden controls are excluded; offscreen but visible product content remains checked.
- **16 axe cases:** both roles/locales/appearances at390/1440px, WCAG2/2.1/2.2A/AA rule tags. All actual violations/incomplete results are recorded, rather than equating automation with conformance. Logo artwork is treated as branding, not ordinary text. Decorative separators do not supply control meaning and are not required to meet3:1.
- **16 keyboard/modal cases:** Enter activation,3px visible keyboard focus, Tab containment, Escape and opener focus restoration. Patient details verify IANA zone/date-specific offset. Doctor390px probes source jump before action, focus on context, return to documentation and keyboard task disclosure. Native details and real anchors preserve browser semantics. No fixed/sticky surface obscures focus.
- **Font proof:** CDP `CSS.getPlatformFontsForNode` confirms actual custom Inter / IBM Plex Sans Arabic SemiBold glyph use in rendered headings at390/1440, beyond `document.fonts.check`. Parsed OS/2 weights/variable axes and hashes establish genuine approved regular/semibold/variable files. `font-synthesis:none`; Arabic heading tracking zero. Missing references show a prominent warning. Native OS/browser fallback behavior outside Chromium remains untested.
- **Actual contrast:** sRGB opaque computed foreground/background observations are deduplicated with counts in JSON. Text target≥4.5:1, essential non-text/focus≥3:1. Input/control boundaries are tested against actual inner and outer adjacent backgrounds; a same-fill primary border is evaluated against its outside plane, not against itself. Focus uses the3px gap's adjacent surface. No inherited approval from arbitrary raw-color combinations, opacity or mechanical inversion.
- **Text200%** changes root font-size16→32px, preserving viewport width. This verifies text growth/reflow and action wrapping, not native browser zoom or OS font settings. The AR narrow capture is included below. Body/task/clinical text remains16px at100%; quiet footer/eyebrow metadata can be14px.

The machine summary and per-case entries in JSON are the exact authority for counts/failures; source/screenshot hashes bound what was inspected. The independent visual report separately decides whether the aesthetic is suitable for owner review. Remote exact-head CI is recorded in the Draft PR after completion, not inferred from local checks or an earlier run. No CI policy or gate is changed.

## Selected actual PNGs

| Screen | Direct PNG |
| --- | --- |
| **Patient AR mobile390 light — primary review** | [Open PNG](evidence/patient-ar-light-390.png) |
| Patient AR mobile390 dark | [Open PNG](evidence/patient-ar-dark-390.png) |
| Patient EN desktop1440 light | [Open PNG](evidence/patient-en-light-1440.png) |
| Patient EN desktop1440 dark | [Open PNG](evidence/patient-en-dark-1440.png) |
| Patient EN tablet768 light | [Open PNG](evidence/patient-en-light-768.png) |
| Patient AR mobile390 dark,200% text | [Open PNG](evidence/patient-ar-dark-390-text200.png) |
| **Doctor AR desktop1440 light — primary review** | [Open PNG](evidence/doctor-ar-light-1440.png) |
| Doctor AR desktop1440 dark | [Open PNG](evidence/doctor-ar-dark-1440.png) |
| Doctor EN mobile390 light | [Open PNG](evidence/doctor-en-light-390.png) |
| Doctor EN mobile390 dark | [Open PNG](evidence/doctor-en-dark-390.png) |
| Doctor AR tablet768 dark | [Open PNG](evidence/doctor-ar-dark-768.png) |
| Doctor EN desktop1440 light | [Open PNG](evidence/doctor-en-light-1440.png) |
| Patient AR desktop1440 light | [Open PNG](evidence/patient-ar-light-1440.png) |

These are real browser pixels, not image-generation compositions or a native-app mockup. Desktop captures show the1200px viewport, with longer content accessible in gallery; narrow/tablet captures include the whole page. No status/testing/issue labels are inserted in primary product content. The reviewer wrapper carries synthetic/nonconnected disclosure; the screen footer retains a subtle Demonstration label. It is not a fake live consultation. PNGs have no EXIF patient identity metadata and use only synthetic fixtures.

## Bidi, clinical and source checks

AR RTL and EN LTR use logical spacing and the same task sequence. Navigation arrows alone mirror. Complete doctor/patient names wrap; no ellipsis or clipping. Date band changes shape on mobile rather than stacking a desktop date card. Gregorian months/year remain readable. Doctor range and IANA identifier/offset are isolated with `bdi dir=ltr`; patient detail retains chronological start/end labels. Recorded Latin proper names, punctuation, decimal/unit, reference, phone/email and midnight/DST cases are checked separately in [supplemental.json](evidence/supplemental.json):9 bidi range-copy/isolation fixtures,6 event/DST/midnight instant probes,8 text-spacing cases, and10 computed hover/disabled states. Run `QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/supplemental.mjs` to reproduce. The static fixture does not implement a general timezone formatter or a time-preference feature; it demonstrates one date-specific Cairo event. Repeated-hour/cross-zone overview and both-date cross-midnight requirements remain binding for later integration.

Patient My Care contains no private-note existence/counts, fabricated clinical data, made-up releases or signed history. The empty shared-source state is explicit. Doctor authority is a synthetic current-assignment fixture independent of booking. Private signing, summary release, follow-up release and irreversible close are distinct. No action performs a transaction, reports signing/releasing/closing success, retries a write, calls an API or stores content. Textarea edits are transient document state. Source status and unsaved draft labels are16px; allergy uncertainty is explicit. Global destinations open an outside-scope preview notice; they are not completed additional screens or unsupported Live capabilities.

## Preservation and remaining limits

Local repository checks:30/30 CI-policy tests pass; the unchanged repository ESLint configuration passes for every new JS/MJS file using the exact root tool versions in a temporary tooling directory; documentation classification/local-reference checks and `git diff --check` pass. [source-manifest.json](evidence/source-manifest.json) pins rendering, provenance and QA-tool source identities. The independent reviewer reconfirmed byte-identical affected renders after final browser-global declarations were added for lint.

[preservation.json](evidence/preservation.json) inventories every baseline tracked path against main's Git blob identity, with only two allowed governance-summary exceptions: `docs/CURRENT_STATUS.md` and `docs/SOURCE_OF_TRUTH.md`. All other existing files, runtime, DB/migrations, API/OpenAPI, clinical/auth/privacy contracts, dependencies/lockfiles, CI, deployments and historical assets/screenshots remain byte-identical. All new review artifacts live under this one folder. No production build/integration is implied by local design tests.

**UNTESTED:** native400% browser zoom; real screen-reader speech/order/announcements; physical Android/iOS; installed PWA/installability/offline behavior; Chrome/Edge products, Firefox/Safari/WebKit; OS text settings/virtual keyboard ergonomics; physical print/PDF; native Egyptian participant/clinical editorial usability; runtime authority/revocation/concurrency/privacy/backend behavior. Forced-colors/reduced-motion CSS is present but no platform conformance PASS is claimed. AP03 remains OPEN, including historical PDF Type3 warning debt. AP05 creator/permission/exclusivity/trademark remains OPEN; OFL font and ISC icon licenses do not clear underlying logo rights.

Known design tradeoffs: narrow Doctor context requires an explicit jump/return, secondary content makes mobile pages long, and the restrained violet-neutral language is conservative. Theme default/system detection/persistence/shared-device scope remains OPEN. Pharmacy/Lab/Admin high-fidelity designs, final Design System, frontend architecture and whole-project health review are not completed by this task. Stop for Product Owner visual approval.
