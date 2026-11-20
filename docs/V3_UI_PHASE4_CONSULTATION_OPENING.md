# UI Phase 4 — Real Consultation Opening

**Stage B implemented; review readiness blocked by required CI.** Branch `feat/v3-ui-phase4-consultation-opening`, existing [PR #57](https://github.com/abuhmaid28/egyhealth360/pull/57), OPEN / UNMERGED. [Stage B authorization 6495191078](https://github.com/abuhmaid28/egyhealth360/pull/57#issuecomment-6495191078).

Initial base `b82553e1eb16aac19f9aab24a0bca011217d6dd4`; preserved Stage A head `cae36ad51b957ebb45fe41702f9cc59c830c644a`. Independently merged Slice 4 main `c302b215dca398955d9830ceeb32964f20e80b75` is integrated by normal merge `3d021acf06478e54ff3353eb924b97c8265093d0`. No conflicts, rebase, force-push or second frontend PR. No backend/OpenAPI/schema/migration/authorization/lock/security-policy changes beyond inheriting merged main.

## Actual merged contract and adapter

`POST /api/v1/me/bookings/{bookingId}/consultation` sends **only `{operationKey}`**, a canonical lowercase UUIDv4. No expectedVersion, patient/clinician/clinic authority, timestamp, complaint, diagnosis, notes or consent fields. Existing same-origin credentials/no-store/session-CSRF transport is reused; no Idempotency-Key header or automatic retry.

The adapter now validates and projects the exact merged eight-field result: `{id,encounterId,bookingId,providerId,clinicId,state,bookingState,openedAt}`; state is `OPEN`, bookingState `IN_CONSULTATION`. Every locator is validated; mismatched booking/invalid result fails closed, and unknown/private fields are discarded. Source authority is merged `docs/openapi.json`, `apps/api/src/bookings.ts`, `packages/db/src/consultations.ts` and [Slice 4](V3_I2_SLICE4.md), not the earlier provisional receipt.

`src/lib/api/consultation-opening.ts` remains separate from synthetic clinical models. `createLiveAdapter().consultationOpening` is active in normal Live builds. The Stage A environment flag, disabled transport and extra fixture-build runner are removed. Controlled browser tests now exercise the ordinary production build with merged-contract HTTP fixtures; real persistence is proven separately.

The client-only root `LiveSessionProvider` preserves the adapter's uncertain-command keys/receipts across navigation. Existing page shell/loading behavior remains intact; each shell mount resolves `/auth/me`. Logout, changed authenticated identity, failed session resolution, explicit mode change and full reload clear state. No credentials, keys, receipts or clinical payload are persisted to browser storage.

## Doctor journey and states

`/doctor` and `/doctor/schedule` read the exact backend schedule: upcoming/time-may-be-eligible guidance, operational state and attendance. Timing guidance is not authorization. `/doctor/appointments/:bookingId` shows permitted patient display identity, public clinic name when available, booked time/timezone and state, then explicit Start Consultation confirmation.

Before start, opening is disabled with an explanation. Cancelled/rescheduled/no-show visits cannot open. At/after start, the server must still verify DB time, exact current clinician, ACTIVE assignment and exact current clinic/membership/provider/affiliation/session scope. Uniform scoped 404 explains access requirements without revealing which private authority check failed. 401/403/400/409/503 and unexpected transport/parser failures show safe authored recovery states, never raw errors or Demo fallback.

Opening is explicit. Pending disables duplicate UI actions and announces progress. Uncertain/failed unchanged commands retain their operation key for explicit retry; concurrent/delayed attempts and successful duplicate replay share the same unique opening command. Another booking gets a new key. There is no automatic timeout/deadlock/503 retry.

On server-confirmed success, Booking is refreshed. `IN_CONSULTATION` suppresses cancel/reschedule, initial attendance/no-show and correction controls where merged backend eligibility disallows them. OPEN history is translated using the merged Booking transition enum. `/doctor/consultation/:bookingId` retains a metadata-only shell with the actual returned openedAt, current booking/clinic context and explicit clinical-documentation boundary. It invents no consultation-read endpoint. Full reload discards the receipt and shows an intentional metadata-not-retained state while reading current Booking logistics; it does not fake a timestamp or replay automatically.

## Authority, privacy and Demo separation

**Booking clinical authority = ZERO.** Opening requires an independently established current relationship. The application creates no assignment, relationship, consent or acceptance as a side effect. Neither opening receipt nor public identifiers are a grant for future record reads. No patient browse, medical-history lookup, private content, internal user/profile/assignment/membership/affiliation identity or document count is displayed.

Patient Live UI reflects only the merged Booking operational state; no patient consultation endpoint or authoring is added. ADMIN/LAB/PHARMACY gain no clinical action. Complaint/problems/diagnoses/allergies/private notes/summary/instructions/close/prescriptions/labs/pharmacy/clinical follow-up remain **Demo-only**. No Demo clinical data enters a real consultation. The complete reviewed English/Arabic graduation Demo is retained.

## English, Arabic, responsive and accessibility

All new authored copy uses the existing Arabic catalog. API names/values and entered text remain verbatim with bidi isolation; dates keep the stored clinic timezone and existing Gregorian formatting. EN/LTR and AR/RTL are tested at **1440 / 834 / 390** for schedule, detail, early/terminal/opened states, confirmation, access/error/pending states and the metadata shell. Dialog focus containment/restoration, keyboard dismissal, disabled explanations, semantic headings, status/alert announcements and reduced-motion behavior remain intact.

## Real browser → API → PostgreSQL proof

The existing `pnpm test:ui:real` now wires actual merged Nest controllers, including the existing I1 bilateral relationship APIs, to the same isolated PostgreSQL fixture behind Next's real rewrite. There are **no HTTP mocks**. Existing availability and full Booking proof runs first with zero assignments/clinical queries, then returns its exact attended booking for opening proof. The accepted `pastBooking` schema-owner fixture has restored all database guards before UI requests; no runtime frontend command supplies timestamps or modifies database guards. The separate merged opening runtime additionally waits for actual DB time without timestamp mutation.

`scripts/support/ui-consultation-opening-real.mjs` proves exact clinician schedule/detail; real opening denial with zero ACTIVE assignment; explicit patient authorization and clinician acceptance through existing HTTP routes; successful persisted Consultation + GENERAL_CONSULTATION encounter, exact linkage and DB-owned openedAt; `IN_CONSULTATION`; rejected cancel/reschedule/no-show; unrelated clinician, patient and ADMIN 404; no clinical document or Demo payload.

The test proxy drops **one genuine successful post-commit response**, never fabricates a backend result. The UI must explicitly retry the exact same body/key; the real backend replays its retained result. SQL asserts one Consultation, one encounter, one OPEN event/operation/audit, retained prior attendance, no new relationship/assignment from opening and no duplicate on an additional actual browser replay. Internal-identity canaries are absent from the rendered shell. Future clinical document/prescription/lab sources are absent; the clinician opening flow issues no clinical read/write. Existing patient own-profile/BP/HTN self-service remains unchanged.

## Presentation captures

These seven captures are controlled merged-contract HTTP fixtures, not database proof. Real proof above is separate. Prior reviewed presentation images are retained unchanged.

| Screen | Capture |
| --- | --- |
| Doctor Live schedule | [39](ui-screenshots/39-en-opening-schedule.png) |
| Booking before opening | [40](ui-screenshots/40-en-opening-booking-detail.png) |
| Explicit Start Consultation | [41](ui-screenshots/41-en-start-consultation.png) |
| Scoped relationship/current-authority unavailable | [42](ui-screenshots/42-en-opening-relationship-required.png) |
| Opened metadata shell | [43](ui-screenshots/43-en-consultation-opened.png) |
| Arabic opened metadata | [44](ui-screenshots/44-ar-consultation-opened.png) |
| Arabic mobile opened metadata | [45](ui-screenshots/45-ar-mobile-consultation-opened.png) |

## Validation and required CI

Local frozen install, generate, workspace build, lint and typecheck PASS. **167/167 unit tests PASS**, including **17 opening adapter/contract tests**; zero failures/skips/cancellations. Existing English/Arabic Golden Demos, Phase 3 navigation/focus/accessibility, Real Booking controlled tests and the new normal-build opening browser matrix PASS. The actual browser→Next→Nest→PostgreSQL Booking + Consultation Opening proof PASS. The separate real-DB-clock opening runtime is **19/19 PASS**. Fresh/populated migration preservation/redeploy PASS across 17 migrations. Both audits retain **0 HIGH / 0 CRITICAL**, with 2 LOW / 3 MODERATE findings. Docker image build PASS. Full integration/container/runtime and new exact-head results are recorded in PR #57 after execution. Historical Stage A Bootstrap `40803225215` / job `123215977713` passed all 42 steps at `cae36ad…` / base `b82553e…`; it is not substituted for Stage B evidence.

Required exact-main Bootstrap **40864144595 attempt 2 FAILED** at exact main `c302b215dca398955d9830ceeb32964f20e80b75`. Job **123414855633** did not start: zero steps, no runner and no job logs. Its check annotation is exactly: “The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings”. No account/billing/spending setting is changed by this UI task.

Both the required controlling exact-main gate and NEW exact-head Bootstrap must be SUCCESS before ready-for-review. Until then, PR #57 remains **DRAFT / OPEN / UNMERGED / NOT REVIEW-READY**. No success, backend completion, merge or deployment is inferred from local tests. Clinical documentation and later clinical workflows remain Demo-only.
