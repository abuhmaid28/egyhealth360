# Bounded refinement — browser QA and evidence

**One owner-authorized refinement on existing Draft PR #107.** [Authorization6768498133](https://github.com/abuhmaid28/egyhealth360/pull/107#issuecomment-6768498133); old head `7181bde73ececcf2ba68882d6ecd2c10ab756385`; unchanged main/base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. Current design rationale and owner choices: [DESIGN_REVIEW.md](DESIGN_REVIEW.md). Technical success is not Product Owner visual acceptance, full WCAG conformance or clinical runtime proof.

## Reproduce and inspect

1. Run `python docs/design-system-v2/high-fidelity-pilot/prepare-reference.py`. Nine immutable font/logo/OFL inputs are verified into ignored `.reference/`; [manifest](reference-manifest.json), [parsed font identity](evidence/font-identity.json). No new fonts, icon family or production dependency.
2. Serve this folder on loopback: `python -m http.server 8766 --bind 127.0.0.1 --directory docs/design-system-v2/high-fidelity-pilot`. Open `http://127.0.0.1:8766/gallery.html`. Managed Chromium blocks `file://` with `ERR_BLOCKED_BY_ADMINISTRATOR`; direct-file behavior elsewhere is untested. Gallery and image controls make local asset loads, no API/external request or persistence.
3. Tooling stays outside the repo: `npm install --prefix /tmp/eh106-tools playwright@1.56.1 @axe-core/playwright@4.11.0`. Run `QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/verify.mjs`, then `QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/supplemental.mjs`. `CHROMIUM_PATH` and `QA_BASE_URL` can be overridden. These now write only new `evidence/refinement/` outputs.
4. [Current matrix/contrast/captures](evidence/refinement/qa-results.json), [supplemental bidi/time/spacing/states](evidence/refinement/supplemental.json), [before/after observations](evidence/refinement/before-after.json), [current source hashes](evidence/refinement/source-manifest.json), [preservation and exact changed-path inventory](evidence/refinement/preservation.json), [independent visual critique](evidence/refinement/independent-review.json).

Actual browser: Linux headless **Chromium154.0.8037.57**, Playwright1.56.1, axe-core4.11.0, DPR1. Screenshot viewport height1200; narrow/tablet PNGs capture the full page, desktop captures the1200px viewport. These are real browser pixels, not generated mockups or native-app frames. No additional screenshot board PNG is created: the gallery presents actual old/new PNGs side by side.

For matched browser observations, serve the old head's `screen.html`, `screen.js`, `screen.css` and `icon-paths.js` from a temporary folder on8767, with the unchanged nine `.reference/` inputs. Each old file comes from `git show 7181bde73ececcf2ba68882d6ecd2c10ab756385:docs/design-system-v2/high-fidelity-pilot/{file}`. Run `QA_TOOL_ROOT=/tmp/eh106-tools node docs/design-system-v2/high-fidelity-pilot/compare.mjs`. This records actual page/CTA positions, repeated links and context/task scroll behavior; it does not turn length into a usability approval score.

## Executed checks and limits

**Final author result: PASS within this bounded scope.**64 layout/text cases and84 additional Doctor interaction-state checks;28 axe audits with zero violations or incomplete results.60 computed contrast pairs represent10,500 observations; minimum text5.218:1, essential UI/focus3.871:1. No recorded document overflow, text-range clipping, undersized visible action, missing reference, external request or page error. Eight new PNGs are separately hashed. Local exact-root-rule ESLint,30/30 repository CI-policy tests and diff whitespace checks pass. Remote exact-new-head CI is reported in the same PR after completion, not inferred from these checks.

The exact final counts and findings are in the current matrix JSON. Coverage remains **40 required layout cases** (2 roles ×2 locales ×2 themes ×320/390/768/1024/1440),8 additional1920px cases and16 text200% cases at320/390px. Each checks document overflow, actual text-range clipping,44px controls, assets, external requests and computed text/essential-boundary/focus contrast. Core text target≥4.5:1, essential UI/focus≥3:1. Decorative separators/shadows do not supply control meaning.

Expanded Doctor checks open the near-editor source disclosure, return focus to its opener, select Follow-up and Review & close, inspect each visible task, return to Documentation and verify transient textarea edits survive. Hash navigation is ordinary web navigation. Each task's action opens an explicitly noncommitting dialog; Enter, Tab containment, Escape and focus return are checked. Additional axe audits cover opened context and alternate tasks at390px, beyond initial390/1440 audits. All actual violations and incomplete results are retained in JSON, not silently certified away.

Font evidence uses actual Chromium CDP custom-font glyph observations, not `document.fonts.check` alone. Original file hashes and parsed real weights/axes remain unchanged. Arabic heading tracking is zero; genuine Plex400/600 and Inter approved weights are used with `font-synthesis:none`. Text200% changes root16→32px while preserving viewport width; it is not native zoom or OS font scaling. Supplemental tests include9 bidi range-copy/isolation fixtures,6 date/DST/midnight instant observations,8 text-spacing overrides and10 hover/disabled states. Actual clipboard and assistive speech are untested.

The appointment preserves full name, named Gregorian date/year, explicit12h period, end time and clinic; details show actual IANA zone/date-specific offset. Doctor keeps24h, exact patient/visit, current independent authority, private audience and unsaved status. Closed context says allergies not reviewed; expanded content states this is not “no allergies”. Source and task state are text-labelled, never brand-color diagnoses. Patient summaries remain honestly empty. No automatic save/sign/release/close/retry, clinical API, unauthorized payload/count, fabricated release/history or new Live capability.

## Eight new review captures; originals preserved

| Current screenshot | Matching original where available |
| --- | --- |
| **[Patient AR390 Light](evidence/refinement/patient-ar-light-390.png)** | [Before](evidence/patient-ar-light-390.png) |
| **[Patient AR390 Dark](evidence/refinement/patient-ar-dark-390.png)** | [Before](evidence/patient-ar-dark-390.png) |
| [Patient EN768 Light](evidence/refinement/patient-en-light-768.png) | [Before](evidence/patient-en-light-768.png) |
| [Patient AR390 Dark text200%](evidence/refinement/patient-ar-dark-390-text200.png) | [Before](evidence/patient-ar-dark-390-text200.png) |
| **[Doctor AR390 Light](evidence/refinement/doctor-ar-light-390.png)** | Newly selected Arabic mobile case; original head can be rendered locally |
| [Doctor AR390 Light — context open](evidence/refinement/doctor-ar-light-390-context-open.png) | Interaction proof, not a new clinical state |
| **[Doctor EN390 Dark](evidence/refinement/doctor-en-dark-390.png)** | [Before](evidence/doctor-en-dark-390.png) |
| **[Doctor AR1440 Dark](evidence/refinement/doctor-ar-dark-1440.png)** | [Before](evidence/doctor-ar-dark-1440.png) |

All13 original PNGs and original evidence JSON/report remain byte-identical. They describe the **old** head; the original [QA report](https://github.com/abuhmaid28/egyhealth360/blob/7181bde73ececcf2ba68882d6ecd2c10ab756385/docs/design-system-v2/high-fidelity-pilot/QA.md) and [old independent report](evidence/independent-review.md) are historical, not current-candidate PASS claims. New screenshot SHA-256s/settings are recorded separately. Original Brand/DS assets and reference inventories are untouched.

## Scope, independent review and stop

Only `docs/design-system-v2/high-fidelity-pilot/` changes relative to old head, as explicitly required by the latest owner authorization. Existing governance summaries outside the folder remain unchanged for that reason. The current [preservation inventory](evidence/refinement/preservation.json) compares every old-head tracked path and lists exact modified/new paths, including byte preservation of all original screenshots, original QA/report JSON, fonts/logo/icon manifests and all production/runtime/schema/migrations/API/OpenAPI/contracts/dependencies/CI/deployment files.

The new [independent critique](evidence/refinement/independent-review.json) assesses actual before/after screenshots, not merely this author report. It records attribution, source/screenshot hashes, remaining aesthetics and the slight increase in initial editor depth. Exact-new-head remote CI, selected jobs/skips and final old/new/base identities will be recorded in the same Draft PR after completion. Old CI is not substituted; no gate policy is changed.

**UNTESTED:** physical Android/iOS and installed PWA; Safari/Firefox/Chrome/Edge products; native400% zoom; actual screen-reader speech/announcements; OS text/virtual keyboard; physical print/PDF; native Egyptian participant/clinical usability; real authority/revocation/privacy/concurrency or backend behavior. Reduced-motion/forced-colors styling is present without new platform certification. AP03 real-platform/install/print, historical PDF warning debt and AP05 creator permission/exclusivity/trademark remain OPEN. Theme policy, final DS, full five-role designs, frontend architecture and whole-project health review remain outside this refinement.

**Stop for Product Owner visual approval.** Same PR stays Draft/Open/Unmerged, auto-merge off, no deployment or production integration.
