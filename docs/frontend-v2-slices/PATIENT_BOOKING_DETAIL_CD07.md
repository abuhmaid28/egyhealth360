# Patient Booking Detail — bounded CD07 implementation

Issue [#125](https://github.com/abuhmaid28/egyhealth360/issues/125). **UI-only candidate; no merge/deployment/final Design System approval.** Direct source base/main: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`, verified 13 November 2026. Independent of unmerged PR #119; no source reference branch was imported.

## Authority and exact scope

The explicit Product Owner six-file authorization is recorded in Issue #125. Read the [Visual Convergence Review](https://github.com/abuhmaid28/egyhealth360/pull/111#issuecomment-6842148189), accepted [canonical CD07 reconciliation](https://github.com/abuhmaid28/egyhealth360/pull/113#issuecomment-6783681366) at `9ba6ea54a0ca2facd75bc962b953d62a2df75449`, and [bounded #119 acceptance](https://github.com/abuhmaid28/egyhealth360/pull/119#issuecomment-6797641030) at `4270a682ae3973385ca2c4c86f587d1ca9f1ca03`. Those remain unmerged references. Main's older universal24h content records adoption-time history; this explicit task applies only the already accepted patient appointment detail exception without editing canonical contracts.

| Allowed file | Responsibility |
| --- | --- |
| `apps/web/src/components/live-booking.tsx` | Local optional BookingTime patient-detail branch, enabled only by BookingDetails when not clinician |
| `tests/ui-patient-booking-time.test.mjs` | Actual component render fixtures with fixed independent time/date/offset expectations and caller-scope assertions |
| `scripts/support/ui-staging-time-browser.mjs` | Controlled GET-only patient detail12h/offset/reflow/focus/denial checks; existing overview/professional checks retained |
| `docs/frontend-v2-slices/PATIENT_BOOKING_DETAIL_CD07.md` | This implementation/evidence/limits receipt |
| `docs/CURRENT_STATUS.md` | Minimal scope pointer |
| `docs/SOURCE_OF_TRUTH.md` | Classification/pointer |

## Resulting display and preservation

Patient Booking Details alone renders both recorded endpoints with explicit `am/pm` or `صباحًا/مساءً`, Latin digits, named Gregorian dates and actual IANA event zone. Equal endpoint offsets appear with the zone; differing offsets appear beside their respective endpoints, including a backwards wall-clock range across DST. Cross-midnight retains both dates. Outer LTR chronology and isolated Arabic endpoint runs preserve ordering without changing stored text or timestamps. No unavailable endpoint/duration is inferred; the unchanged API projection validates both actual instants.

Default BookingTime markup, all six other callers, Doctor detail24h, history/attendance24h and shared date/time formatters remain unchanged. No new style, asset, font, theme, navigation, dependency or DS token. No API/projection/eligibility/command/session/CSRF/authority/retry change. Patient own-data/current-authority and source privacy contracts remain backend responsibilities. Controlled fixtures do not establish real backend enforcement.

## Validation and review receipt

Pinned toolchain: Node24.21.0/pnpm10.34.6 and frozen existing lockfile; Next16.4.1/React19.3.0. Local frontend lint, UI/Next production builds and UI/web typechecks PASS. UI unit result: **175/175 PASS**, including nine new actual-component render tests; policy tests **30/30 PASS**. This main-based candidate does not import #119's ten tests or its overview implementation.

The focused controlled production-browser helper passes EN/AR, same-day/cross-midnight/Cairo fold/New York detail display at320/390/1440, computed200% text at all three widths, indivisible clock+period geometry, full recorded long names, unchanged Doctor/default list/history/attendance24h, Back/focus/existing controls, and401/403/404/503 payload/reference suppression in DOM and accessibility snapshot. All fixture requests GET; no backend server/session/DB or clinical mutation. Existing overview and professional assertions remain intact; only the authorized Patient Detail24h expectation was superseded. These are controlled projection/presentation checks, not real authorization/CSRF/session or Live E2E proof.

**Actual before/after evidence:**12 PNGs, six matched cases (AR390 ordinary/fold/midnight, EN1440 ordinary, EN390 New York, AR320 computed200%). Before source is exact main; after captured at runtime checkpoint `333505619dc2ee827b920392652b103994257bc7`. Final delivered runtime bytes are checked against captured hashes; the final test/documentation commit does not require pretending the PNGs were captured on a different SHA. Both sides use isolated local production Turbopack builds, Chromium154.0.8037.57 / Playwright1.64.1, DPR1, height1200; mobile full-page, desktop viewport; device zone Pacific/Honolulu proves event-zone presentation. The app's existing “Live” indicator appears in screenshots but all API responses are controlled synthetic GET fixtures: **NOT LIVE**. No new theme/brand or prototype integration is implied.

The external handoff folder `/workspace/scratch/egyhealth360-125-evidence/` supplies `before-after.html`, original PNGs and `captures.json` with each PNG SHA-256, exact source identities/input hashes, browser/viewport/locale and sanitized request receipts. Artifacts are outside Git, not hosted GitHub image assets; final viewer/manifest/archive hashes and immutable candidate/PR/CI links are recorded in the PR receipt. Existing protected source screenshots/assets are unchanged.

**Independent reviews:** Architecture/Frontend **PASS** after source/render tests and actual before/after image inspection; Security/Clinical/Privacy **PASS** after independent source/preservation/browser/hash checks and reproduction of the focused controlled helper. No remaining bounded-slice blocker; no licensed clinical/accessibility/security certification. Final immutable head, each actual selected/skipped CI job, and final reviewer source verification live in the Draft PR receipt; no pending run is labelled Green here.

**Corrections retained:** initial unit harness omitted its unchanged timeZoneLabel binding; corrected and9/9passed. The first temporary before-build used cross-root dependency symlinks rejected by Turbopack; a frozen isolated install allowed the unchanged before source to build. Both reviewers found a test-only Cairo history expectation incorrectly reused for New York; corrected to fixed08:45/10:05 while preserving24h semantics. Actual images exposed a clock/period wrap; two endpoint-local nowrap styles fixed it and six After images were recaptured. Original Before PNGs remained byte-identical; intermediate captures remain separately preserved outside Git. No failing check was waived and no product formatter/history contract changed to satisfy a test.

**Limits:** computed200% is not native zoom/OS scaling or real AT. The existing V1 bottom navigation can overlay document areas in a full-page200% capture; no broader shell/focus-obscuration fix or accessibility certification is claimed. Physical device/PWA/print, full clinical/backend privacy/revocation, hosted parity, F06/E2 and rollback rehearsal were not tested. Wider V2 overview remains main's V1 behavior because #119 stays independent.

## Open gates and rollback

F02/U03 hosted source/operational parity, F03 critical Arabic fallback, F04 first EN/LTR render, F06/E2, AP03 real-device/AT/PWA/print and AP05 artwork rights/trademark remain OPEN. [#124 latest diagnostic disposition](https://github.com/abuhmaid28/egyhealth360/issues/124#issuecomment-6834261572) does not establish E2 acceptance. No F06/E2, Docker/PostgreSQL acceptance, hosted probe, synthetic backend session/fixture/clinical write, merge, deployment, promotion or ready transition is authorized here. Existing CI policy selects frontend/docs only for these paths; actual selected jobs must finish before a technical Green claim.

Rollback proposal, not rehearsed: after reaching a safe boundary for unsaved/uncertain work, revert this isolated display diff to its exact main parent; server facts/schema/operation keys are unchanged. Stop for Product Owner review of the delivered Draft PR; no wider V2 phase is authorized.
