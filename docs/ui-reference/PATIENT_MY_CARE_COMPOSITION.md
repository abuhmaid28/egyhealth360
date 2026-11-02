# Patient — My Care premium composition review

Authority: the Product Owner's second, explicit My Care composition instruction in this chat, refining the existing reference and superseding the earlier left-column-only layout. Base: `b1421ecf41a01c9734649f3d1833608fab19dc43`; main: `0a0e9c2038ecad420e95c2c67ae367129e195839`. Only the exact Patient My Care slice is authorized. Keep PR #79 OPEN / UNMERGED / AUTO-MERGE OFF. No deployment.

## Resolutions recorded before implementation

- Use a centered 1440px outer application container with 40px desktop padding, giving 1360px useful width at 1600px. Header, main and footer align to the same grid. Preserve the textual brand; no Final Brand/logo selection.
- Keep the approximately 8:4 appointment/next-actions top row and 24px gap. Preserve the compact appointment range, real metadata, initials, timezone/offset, access boundary and 44/48px CTA. Compact the existing next-actions rows while preserving their content and touch targets.
- Explicitly replace the previous rail-spanning/left-column-only layout: the quick-access group and recent-care list each span the useful page width. Four equal destinations share one lightweight surface with restrained dividers and focus/hover feedback. No new destination, metric or capability.
- Omit absent recent-care author/date metadata. Render only trusted values; never invent a replacement. Preserve event title/type, current status, destination, source/privacy boundaries and read projections.
- Put both existing Demo role and state controls inside one closed-by-default Demo utility. Keep capability and keyboard access; Live renders no Demo utility or fallback. Adapt browser helpers to open that utility rather than weakening the capability checks.
- Refine the existing mobile hierarchy, utilities, shortcut labels, bottom-navigation alignment and spacing. Keep true RTL/bidi, existing fonts, navy/teal family, stronger muted role, reduced motion and minimum targets. No purple, decorative imagery, sidebar, glass or new palette.
- Preserve adapters, API/read/state/session semantics, clinical authority/privacy, all other workspaces, CI and hosting. Prior references, reports and evidence remain unchanged; fresh evidence goes under `composition-evidence/`.

## Evidence and disposition

The current owner direction is implemented as a composition change, not pixel parity with the superseded SVG. Independent composition review and Product Owner visual acceptance remain **PENDING**. Technical Green does not establish visual approval.

| Owner criterion | Measured/rendered result |
| --- | --- |
| Centered useful width / alignment | 1440px outer container, **1360px useful width** at 1600px; main and header content both start **120px** from the left, with symmetric right breathing room. Desktop padding remains 40px. |
| Compact 8:4 top row | Approximately 891px appointment / 445px next-actions with a **24px gap**. Appointment remains **210.53px EN / 216.53px AR**. CTA remains **44px desktop / 48px mobile**. |
| Coherent full-width quick access | One **1360px** shared surface, four equal 80px destinations (82px including the group border), restrained icon variation, short dividers, hover and inset keyboard focus. No per-item boxes or metrics. |
| Full-width recent care | A **1360px** structured source/title/metadata/status/action list. Missing author/date creates no placeholder text or stray separator; source data is never invented. |
| Header and Demo utility | Aligned text identity, selected-nav underline, segmented language utility and account treatment. One closed-by-default Demo options disclosure contains the original role/state controls; Live contains no Demo utility. Escape closes it and restores summary focus. |
| Mobile / RTL | Same greeting → appointment → actions → shortcuts → recent-care priority. Refined utilities, action spacing, readable shortcut labels and aligned bottom-nav icon/text tracks. At 200% text, header utilities wrap and quick access adapts to two columns without content loss. Normal mobile retains four destinations across. Actual AR composition is visually inspected, including source-name isolation and directional arrows. |
| Preserved typography / contrast | Manrope, IBM Plex Sans Arabic and all root palette tokens remain unchanged from the base. Muted support remains **5.96:1**; **28** sampled rendered text/background pairs have a minimum **5.61:1**. No purple, new imagery, glow or glass. |

## Fresh evidence

[Before/after composition comparison](composition-evidence/patient-my-care-review.html) · [Rendered comparison](composition-evidence/patient-my-care-review.png) · [Measurements/contrast](composition-evidence/patient-my-care-visual.json) · [Browser assertions](composition-evidence/patient-my-care-browser.json) · [Exact changed paths and preservation hashes](composition-evidence/patient-my-care-composition-preservation.json).

| Evidence | English | Arabic RTL |
| --- | --- | --- |
| Desktop 1600×1000 | [EN](composition-evidence/patient-my-care-desktop-en.png) | [AR](composition-evidence/patient-my-care-desktop-ar.png) |
| Full-page desktop | [EN](composition-evidence/patient-my-care-desktop-en-full.png) | [AR](composition-evidence/patient-my-care-desktop-ar-full.png) |
| Mobile 390×844 | [EN](composition-evidence/patient-my-care-mobile-en.png) | [AR](composition-evidence/patient-my-care-mobile-ar.png) |
| Full mobile reading export | [EN](composition-evidence/patient-my-care-mobile-en-full.png) | [AR](composition-evidence/patient-my-care-mobile-ar-full.png) |
| 320px proof | [EN](composition-evidence/patient-my-care-320-en.png) | [AR](composition-evidence/patient-my-care-320-ar.png) |
| 200% text proof | [EN](composition-evidence/patient-my-care-text-200-en.png) | [AR](composition-evidence/patient-my-care-text-200-ar.png) |
| Desktop quick-access focus | [EN](composition-evidence/patient-my-care-focus-desktop-en.png) | [AR](composition-evidence/patient-my-care-focus-desktop-ar.png) |
| Mobile keyboard focus | [EN](composition-evidence/patient-my-care-focus-en.png) | [AR](composition-evidence/patient-my-care-focus-ar.png) |
| Loading | [EN](composition-evidence/patient-my-care-loading-en.png) | [AR](composition-evidence/patient-my-care-loading-ar.png) |
| Empty | [EN](composition-evidence/patient-my-care-empty-en.png) | [AR](composition-evidence/patient-my-care-empty-ar.png) |
| Read error | [EN](composition-evidence/patient-my-care-error-en.png) | [AR](composition-evidence/patient-my-care-error-ar.png) |
| Uncertain/source verification | [EN](composition-evidence/patient-my-care-uncertain-en.png) | [AR](composition-evidence/patient-my-care-uncertain-ar.png) |
| Controlled Live | [EN](composition-evidence/patient-my-care-live-desktop-en.png) | [AR](composition-evidence/patient-my-care-live-desktop-ar.png) |
| Live read failure | [EN](composition-evidence/patient-my-care-live-error-en.png) | [AR](composition-evidence/patient-my-care-live-error-ar.png) |

These are actual production-built frontend captures using existing synthetic fixtures and controlled Live transport, not visual mockups. The full-page exports include the entire current page; this bounded fixture can fit inside the desktop viewport. Mobile viewport captures retain the real sticky bottom navigation; full reading exports temporarily move it to the footer to avoid export overlay. Earlier reference-window rasterizations remain contextual evidence, not a pixel-parity target for the new composition.

## Discrepancy register

| Difference / limit | Classification | Disposition |
| --- | --- | --- |
| Centered width, full-width quick-access/recent-care rows and compact next-actions replace the previous left-column-only arrangement. | Intentional / owner-required | The current instruction explicitly supersedes the old SVG and earlier rail-spanning choice. No new destinations, counts or decorative filler. |
| Missing recent-care source/date is omitted instead of displaying absence labels. | Intentional / owner-required | The row retains its factual type/title, status and action; adapters and source values are unchanged. A missing value is never replaced with an invented clinician/time. |
| Demo controls require opening the discreet utility. | Intentional / owner-required | Role and state capabilities and original handlers remain; browser tests now wait for the mounted surface and open it with a normal click. Live has no such control. |
| Text expansion increases height and can wrap utilities / use two shortcut columns at 200%. | Intentional / accessibility | No fixed clipping or smaller text to force the normal-size arrangement. Minimum controls, all labels and actions remain available. |
| Existing unintegrated Live prescription capability and incomplete Demo source metadata remain. | Implementation debt — unchanged | Live Rx stays explicitly unavailable; unavailable recent metadata is simply omitted. No integration or clinical capability is claimed. |
| Linux Chromium visual checks do not establish native-device, cross-browser, assistive-technology certification or independent Arabic acceptance. | Unresolved review coverage | Preserve the existing validation/acceptance gates. Independent composition review and Product Owner approval remain pending. |

## Validation and scope preservation

- Production Next build, actual frontend ESLint and TypeScript: PASS. UI tests: **162/162 PASS**.
- Full existing browser regression: PASS, including EN/AR/RTL, role navigation, Golden Demo, denied-storage multi-workspace recovery, booking, documentation, current-source privacy, follow-up and close/retry boundaries.
- The first remote frontend attempt exposed a denied-storage fixture race against the transitional legacy workspace selector before My Care mounted. The test now waits for the final Patient surface before opening the collapsed utility, and for its removal when switching roles. No product behavior, visibility assertion or capability check is weakened.
- My Care assertions: PASS for 14 width/locale cases down to 320px, both 200% text cases, default-hidden/keyboard-operable Demo utility, original state controls, Live absence, missing-metadata omission, source denial/session recovery, full-width geometry, unchanged appointment bounds, hover and visible 3px quick-access focus.
- Capture geometry checks require the current useful width, exact header/main alignment, 24px top gap and full-width sections. Measured contrast covers actual visible text pairs, including the worst appointment gradient endpoint. These are bounded author checks, not visual approval or full accessibility certification.
- Document classification/references, diff whitespace and byte-preservation checks pass. Required exact-head remote CI is recorded in PR #79 and the final handoff; CI policy is unchanged.

The **54-path** composition diff contains 12 modified source/test/current-document files and 42 additions (40 fresh evidence files, this report and the scope checker). The linked inventory lists every path. Product files are only `patient-my-care.tsx`, `patient-my-care.module.css` and the two new Demo utility label entries in `patient-my-care-copy.ts`. Supporting changes are confined to the existing My Care browser/capture harness, four current scope/index documents and the new composition evidence/checker.

The scope checker preserves **1010 other existing files**, including all **18** protected V1 screenshots and **72** prior implementation/refinement evidence files. Application dispatch, read/state/session prefix, appointment/next-action/shortcut source and route behavior, monogram/date/source projections, local fonts/licenses, root tokens, backend, API/OpenAPI, database/schema/migrations, authorization/security, Clinician/Pharmacy/Lab/Admin implementation, CI policy and hosting/deployment remain byte-identical to the base. New recent-care rendering and collapsed Demo presentation are explicitly authorized view changes, not changes to the underlying data or authority model.

Reproduce after normal build/setup with `node --test tests/ui*.test.mjs`, `EH_UI_CHROMIUM=/usr/bin/chromium node scripts/test-ui-browser.mjs`, `MY_CARE_COMPOSITION=1 node scripts/capture-patient-my-care.mjs`, `python3 scripts/check-patient-my-care-composition-scope.py` and `node scripts/ci/check-docs.mjs`. The composition flag writes only the new evidence directory. Local Node is 24.19.0 / Chromium 154.0.8037.57; remote application CI uses pinned Node 24.21.0 / pnpm 10.34.6. No dependency is added.

## Health and next gate

No new P0/P1 foundation defect is established; existing integration/native/research debt remains bounded and unchanged. There is no wider rollout, Final Brand/Design System freeze, Lab/I4/I5/EACCE/AI, deployment or merge. Next: **independent Patient My Care premium composition review**, followed by Product Owner review. PR #79 remains **OPEN / UNMERGED / AUTO-MERGE OFF**.
