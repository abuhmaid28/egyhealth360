# PR #55 — UI Phase 3 + Real Booking

Continuation authorization: [PR #55 comment 6483476451](https://github.com/abuhmaid28/egyhealth360/pull/55#issuecomment-6483476451). Existing branch `feat/v3-ui-phase3-polish`; old reviewed UI head `27e67efe55ca37d1d46ef79d894dcb7f83ad70e0`. Normally merged main `46b3db47ad52ec9d4e703b9e7be66a1826475cdf` (independently merged backend PR #53) in merge commit `d2e4359563e9af8ffc0055dba2f5789e26f63fd7`. No conflicts, rebase, force-push, new PR or merge to main. Backend/OpenAPI/schema/migration/security-policy changes are inherited unchanged from main.

## Phase 4 continuation

[PR #57 / UI Phase 4](V3_UI_PHASE4_CONSULTATION_OPENING.md) now integrates merged Slice 4 Consultation Opening through a separate current-relationship-gated Live capability. Booking grants zero clinical authority; clinical documentation remains Demo-only. The availability-only consultation boundary below records the PR #55 baseline, not the current Phase 4 capability. Required CI gates still control review readiness.

## Architecture and PR #55 boundary

`src/lib/api/live-booking.ts` defines the exact merged `Booking` logistics projection, safe error mapping, recursive response allowlists, command eligibility helpers and the Live Booking transport. `createLiveAdapter()` exposes this typed subtree as `liveBookings`, sharing the existing same-origin/no-store session and CSRF request function. `src/components/live-booking.tsx` renders reusable Live list/detail/review/action/reschedule screens. Demo appointment/consultation models remain separate: legacy demo-service methods are denied in Live mode rather than converting real bookings into clinical-shaped synthetic appointments.

Live: authentication/session, directory, profile and existing own BP/HTN record, availability publication/withdrawal, booking create/history/detail/cancel/reschedule, exact clinician schedule, attendance/no-show and appended correction. Demo-only: general consultation, clinical documentation, prescription, lab request/results, pharmacy fulfillment and clinical follow-up. The complete offline English/Arabic Golden Demo is retained. There is no automatic Live→Demo transition, no fake successful mutation and no Booking-to-consultation action in Live mode.

## Exact HTTP mapping

Paths below are beneath `/api/v1`. Reads use GET/no-store; this UI does not need HEAD. Writes use session CSRF and exact JSON bodies; no `Idempotency-Key` header.

| Capability               | Route                                             | Exact body/query                                       |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------ |
| Create                   | POST `/me/bookings`                               | `{slotId, operationKey}`                               |
| Own history              | GET `/me/bookings`                                | `page`, `pageSize=20`                                  |
| Detail                   | GET `/me/bookings/{bookingId}`                    | none                                                   |
| Cancel                   | PUT `/me/bookings/{bookingId}/cancel`             | `{expectedVersion, operationKey}`                      |
| Reschedule               | PUT `/me/bookings/{bookingId}/reschedule`         | `{slotId, expectedVersion, operationKey}`              |
| Exact clinician schedule | GET `/me/schedule`                                | `page`, `pageSize=20`                                  |
| Attendance               | PUT `/me/bookings/{bookingId}/attendance`         | `{observation, expectedVersion, operationKey}`         |
| Correction               | PUT `/me/bookings/{bookingId}/attendance/correct` | `{observation, reason, expectedVersion, operationKey}` |

Only merged `BOOKED / CANCELLED / RESCHEDULED / NO_SHOW` states and `UNKNOWN / ATTENDED / NO_SHOW` observations are rendered. Attendance is separate from booking state, never inferred or recorded automatically. Client timing is advisory; the backend remains authoritative for timing, scope, eligibility, concurrency and current authority. Correction input follows the merged 1–1000 Unicode scalar/no-control-character rules, remains verbatim and is never truncated. Corrections append observations and do not reopen capacity; prior observations remain visible.

## Patient and clinician routes

Live provider profiles retain public clinic filtering, finite-slot paging, explicit clinic timezone and safe loading/empty/error states. Live mode has no clinical-reason field. Review confirms a real booking; success navigates to `/patient/appointments/{id}`. `/patient/appointments` reads real own history with pagination. Detail displays source provider/clinic names where the public directory still supplies them, start/end/timezone, operational state, attendance, retained transitions and predecessor/successor links with descriptive labels. Resource identifiers are routing keys, not visible content.

Directory enrichment is separate from logistics reads and writes. A provider disappearing from discovery cannot hide booking history/detail or gate eligible cancellation. Rescheduling reads real `/directory/providers/{bookedPublicProviderId}/availability` with the booked public clinic filter. The picker additionally allowlists only bookable replacements at that exact provider/clinic and excludes the current slot. Provider change is a separate cancel/new-booking journey. Atomic replacement uses only the merged reschedule command; a conflict does not alter the original UI booking.

Live `/doctor` and `/doctor/schedule` read `/me/schedule`; `/doctor/appointments/{id}` reads exact logistics detail. There is no patient search/browse or medical-record lookup. Initial attendance and separate reasoned correction dialogs use current returned version and temporal/state eligibility. Live consultation URLs show an explicit unavailable clinical boundary without calling clinical APIs. Demo routes preserve all reviewed Phase 3 consultation/release/fulfillment work.

## Retry and error behavior

The Live adapter owns an in-memory pending-command registry scoped to the current adapter/session. Each command/target retains its payload fingerprint and canonical lowercase UUIDv4 `operationKey`. An unchanged failed retry reuses the complete original body, including version/key, across rerenders, dialog reopen and client navigation. Changed payloads receive a new key; a successful command clears only its matching pending entry, so a genuinely new command gets a new key. Concurrent identical invocations share the key. No automatic retry is performed. Logout clears pending entries. Keys/credentials/correction text are not persisted to browser storage; after full reload, inspect real history/detail before starting a new command rather than automatically replaying it.

400/401/403/404/409/413/415/503 statuses map to authored, localized guidance. Raw backend bodies, SQL, parser errors, stack traces and internal identifiers are never reflected. Network/malformed-response failures are safe unavailable states and retain the pending command key because the server outcome may be uncertain. Conflicts instruct the user to refresh logistics and availability before a new command. Session recovery reloads the server-derived session. Failed Live operations remain Live; no synthetic fallback occurs.

## Privacy and authority

All live Booking payloads are logistics-only. Create never submits patient/clinician identity, clinical reason, complaint, diagnosis, notes or attachments. Only a public slot ID is submitted; provider/clinic/patient provenance is server-derived. Responses are projected into the exact 16-field Booking shape and explicit nested transition/observation shapes, discarding extra upstream fields. Source/API names and entered correction text are never translated.

Booking grants **ZERO clinical authority**. There is no assignment, consent, acceptance, clinical encounter or medical-record entitlement created or implied. Existing BP/HTN own-record APIs stay independent; general clinical workflows remain Demo-only. Admin receives no clinical navigation or entitlement.

## Validation and evidence

Run pinned frozen install, generate, lint, typecheck, workspace build, root unit tests, UI adapter/localization tests, browser suites, real API smoke and both audits. Bootstrap workflow and all merged backend tests remain intact. Review readiness additionally requires exact-main `40787996614` SUCCESS and a new exact-head PR #55 Bootstrap SUCCESS; exact head/base/run/job and final counts belong in the PR handoff.

- `tests/ui-booking.test.mjs`: successful exact requests, canonical UUID keys, unchanged lost-response retries, changed/successful command keys, history/detail/schedule, cancellation without directory calls, conflicts, same-provider/clinic reschedule restriction, attendance/correction, status/session/service errors, no Demo fallback, nested privacy allowlists, timing and Unicode input.
- `scripts/support/ui-booking-browser.mjs`: controlled HTTP regression in English and Arabic/RTL; real-contract create/retry/pagination/detail/cancel/reschedule/conflicts, schedule/attendance/correction, safe errors, loading/empty, clinical boundary and **1440 / 834 / 390** layouts. It does not substitute for database proof.
- `scripts/support/ui-booking-real.mjs`, invoked by existing `test:ui:real`: actual browser → Next rewrite → Nest → isolated PostgreSQL; real create/occupied-slot hiding/history/detail/reschedule/cancel after provider unpublication, exact clinician schedule, explicit attendance/no-show/correction, retained history and zero assignments/relationships/clinical encounters. Timing uses the backend's existing approved isolated `pastBooking` fixture with guards restored before browser assertions; the separate merged backend runtime independently proves real-clock timing. The terminal no-show availability is withdrawn before preparing the next timing case, preserving the finite availability exclusion.
- Existing English/Arabic offline Golden Demos, Phase 3 keyboard/navigation/form/RTL checks, 23 route/state variants, live availability failures/pagination/timezone/publication/withdrawal and audit gates remain enabled. Obsolete live-slot→synthetic clinical handoff assertions are replaced by real Booking and zero-clinical-continuation assertions.

Controlled presentation screenshots: [English live review](ui-screenshots/31-en-live-review.png), [detail](ui-screenshots/32-en-live-booking.png), [history](ui-screenshots/33-en-live-history.png), [clinician schedule](ui-screenshots/34-en-live-schedule.png), [correction](ui-screenshots/35-en-attendance-correction.png), [Arabic review](ui-screenshots/36-ar-live-review.png), [Arabic detail](ui-screenshots/37-ar-live-booking.png), [Arabic mobile history](ui-screenshots/38-ar-mobile-bookings.png). Real API proof is separate from screenshot fixtures.

Remaining dependencies: general consultation/clinical documentation authority, prescribing, diagnostics, pharmacy and clinical follow-up integrations require their own backend slices. Booking itself supplies none of these grants. No merge is authorized by this task.
