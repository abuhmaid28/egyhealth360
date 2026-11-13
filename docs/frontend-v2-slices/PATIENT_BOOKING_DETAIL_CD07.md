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

Checkpoint: implementation and nine fixed-expectation render tests complete locally; final build/browser evidence, independent verdicts and exact-head CI are pending. Final immutable head and remote run/job results will be recorded in the Draft PR after verification; this checkpoint is not a PASS claim for those checks.

## Open gates and rollback

F02/U03 hosted source/operational parity, F03 critical Arabic fallback, F04 first EN/LTR render, F06/E2, AP03 real-device/AT/PWA/print and AP05 artwork rights/trademark remain OPEN. [#124 latest diagnostic disposition](https://github.com/abuhmaid28/egyhealth360/issues/124#issuecomment-6834261572) does not establish E2 acceptance. No F06/E2, Docker/PostgreSQL acceptance, hosted probe, synthetic backend session/fixture/clinical write, merge, deployment, promotion or ready transition is authorized here. Existing CI policy selects frontend/docs only for these paths; actual selected jobs must finish before a technical Green claim.

Rollback proposal, not rehearsed: after reaching a safe boundary for unsaved/uncertain work, revert this isolated display diff to its exact main parent; server facts/schema/operation keys are unchanged. Stop for Product Owner review of the delivered Draft PR; no wider V2 phase is authorized.
