# UI Phase 4 — Consultation Opening

**Stage A implemented; Stage B pending. Not review-ready.** This is frontend preparation, not a claim that real Consultation Opening exists on main. Normal Live builds do not send an opening request. Booking remains logistics-only and grants **zero clinical authority**.

Branch: `feat/v3-ui-phase4-consultation-opening`. Initial main: `b82553e1eb16aac19f9aab24a0bca011217d6dd4` (merged PR #55). This task uses one frontend PR, left open/unmerged. Backend Slice 4 is independent, authorized in [Issue #48 comment 6485213892](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6485213892); this UI task changes no backend implementation, authority, schema, migration, lock, OpenAPI or security policy.

## Stage A architecture and routes

- `src/lib/api/consultation-opening.ts` is a separate frontend capability with explicit availability, an opening command, ephemeral result receipts and session cleanup. It does not use the synthetic clinical `Consultation` model or store. The presentation receipt is **provisional**, not a frozen backend response DTO.
- A small client-only `LiveSessionProvider` lives in the persistent root layout and retains the Live adapter across route navigation. The existing page shell/loading boundaries stay in place; each page shell mount still resolves `/auth/me`. This preserves uncertain-command keys and receipts without module-global identity or browser-storage persistence. Logout, changed authenticated identity, failed session resolution, explicit mode change and full reload clear them.
- `createLiveAdapter()` shares the existing credentials/same-origin/no-store/session-CSRF request transport. The opening capability defaults to **unavailable**, rejecting before any HTTP call. Exact authenticated Booking and availability capabilities continue unchanged.
- `src/components/consultation-opening.tsx` supplies timing/access guidance, a focused explicit-confirmation dialog, pending/uncertain-retry/error states and a metadata-only shell. HTTP and command-key logic stay outside components.
- `/doctor` and `/doctor/schedule` retain the exact booked operational schedule, adding upcoming/may-be-eligible guidance. Neither label represents clinical authorization.
- `/doctor/appointments/:bookingId` shows patient display identity, public-directory clinic name when available, scheduled time and stored timezone; the opening card explains the relationship gate. Directory enrichment never gates Booking history/cancellation.
- `/doctor/consultation/:bookingId` is explicitly **booking-scoped**, not an invented consultation-read endpoint. It reads Booking logistics and can show the allowlisted result of the current session's explicit opening command. On full reload, it shows a metadata-not-retained state rather than fabricating a read, timestamp or clinical data.

Normal Live UI explains that backend integration is pending. There is no automatic Live→Demo fallback. Opening success exists only in explicitly controlled test builds during Stage A. Demo Mode retains its complete separate synthetic consultation/documentation/prescription/lab/fulfillment/follow-up journey.

## Timing, errors and retries

Before scheduled start, the opening control is disabled with a readable explanation. Terminal cancelled/rescheduled/no-show states disable opening. At/after start, the UI may offer the command only when the capability is enabled; the server must still check DB time, exact clinician, current assignment, clinic and session. The frozen contract's anticipated `IN_CONSULTATION` state (and the `OPEN` transition in the separately published, unmerged backend PR #56 candidate) is recognized for safe action suppression, but Stage B must reconcile every Booking enum and transition against merged truth.

Safe authored errors cover malformed requests, expired session, request verification, scoped access denial, conflict and service uncertainty. A uniform scoped 404 is **not** diagnosed as a definitive missing assignment: copy explains relationship/current eligibility requirements without revealing which check failed. No raw error body, internal identity or clinical data is shown.

The anticipated write is only `POST /api/v1/me/bookings/{bookingId}/consultation` with `{operationKey}`. It is inactive in normal Stage A builds. No patient/clinician/clinic authority fields, clinical fields, expected version or `Idempotency-Key` header are submitted. Canonical lowercase UUIDv4 keys are retained in memory per exact booking opening command, including delayed/concurrent/failed explicit retries and duplicate successful replay. Another booking receives another key. There is no automatic retry. Logout clears keys and receipts; full reload discards them. No operation key, credential or receipt is persisted in localStorage.

After successful controlled opening, the UI refreshes authoritative Booking data, suppresses invalid logistics actions and shows only a safe metadata result. No assignment, consent, relationship acceptance, clinical document or Demo clinical payload is created. Metadata shown from a command receipt is not an authorization grant for future clinical reads.

## English, Arabic and accessibility

New authored text is in the existing local Arabic catalog. Source names and values are preserved, mixed values use bidi isolation, and time uses the stored clinic timezone. Layout uses existing logical responsive cards/actions and the viewport-bounded native dialog. Explicit labels, dialog descriptions, focus containment/restoration, disabled-state explanations, pending/success announcements and alert text preserve keyboard and reduced-motion support. There are no Live clinical authoring fields.

## Controlled validation and screenshots

`tests/ui-consultation-opening.test.mjs` tests the disabled gate, exact command, unchanged/concurrent/uncertain replay keys, session cleanup, explicit response allowlist, malformed-response failure, eligibility and safe errors. Existing Real Booking, Demo and localization tests remain required.

`scripts/support/ui-consultation-opening-browser.mjs` runs from the existing browser suite. The ordinary build proves the disabled integration gate in EN/AR at 1440/834/390 without any opening HTTP call. The browser command automatically creates an additional controlled test build, exercises it, then restores the normal disabled build even on failure. It enables the provisional transport only for those HTTP fixtures. For manual isolated fixture inspection the equivalent commands are:

```sh
NEXT_PUBLIC_EH_OPENING_FIXTURE=stage-a-controlled-fixture pnpm build
EH_UI_CHROMIUM=/usr/bin/chromium UI_SCREENSHOT_DIR=/tmp/eh-opening-shots pnpm test:ui:browser
```

The build flag is **only for controlled fixture testing**, not backend integration or deployment. Do not use it with a real API during Stage A. The controlled matrix additionally proves too early, cancelled/rescheduled/no-show, scoped authority unavailable, conflict, session expiry, service unavailable, pending, exact retry body/key, opened shell, refresh/no auto replay, no clinical read/relationship write, no Demo fallback, keyboard restoration, Arabic direction and all three viewport widths. These tests and screenshots are **not real backend proof**.

New presentation captures `39`–`45` in `docs/ui-screenshots/` are synthetic controlled HTTP fixtures: schedule, pre-opening detail, confirmation, scoped relationship/current-authority unavailable, opened metadata, Arabic opened metadata and Arabic mobile opened metadata. No persistence or real-patient claim is made by an image.

## Mandatory Stage B gate — still pending

1. Backend Slice 4 merged into current main and its exact-main Bootstrap **SUCCESS**.
2. Fetch main and merge it normally into this branch; no rebase or force-push.
3. Read actual merged OpenAPI/implementation. Replace the provisional receipt/fixture gating with the exact merged response, enums, replay, errors and eligibility; remove the test-build-only flag once normal Live integration is valid. Do not invent a consultation-read endpoint or patient-visible clinical content.
4. Reconcile action suppression and authoritative Booking refresh. Keep documentation and future clinical workflows Demo-only.
5. Extend the real browser→Next→Nest→isolated PostgreSQL smoke with legitimate I1 relationship workflow, exact opening/persistence/encounter/DB-clock linkage, duplicate replay, role denials, no document/Demo insert and current Booking regressions. Controlled fixtures cannot satisfy this gate.
6. Run full new exact-head Bootstrap including merged Slice 4 backend runtime gates; verify head/base, all gates and audits; keep this frontend PR OPEN / UNMERGED.

## Stage A validation record

Local frozen install, generate, workspace build, frontend normal/controlled builds, lint and typecheck PASS. Full unit suite: **164/164 PASS**, including **16 Consultation Opening tests**; zero failures/skips/cancellations. Existing English/Arabic Golden Demos, Phase 3 accessibility/navigation proofs, Real Booking controlled regressions and the new controlled opening/browser matrix PASS. Viewports: **1440 / 834 / 390** in both languages. New screenshots were visually inspected; prior reviewed screenshot files are retained unchanged.

Existing real Nest/PostgreSQL/browser **availability + Booking regression PASS**: publication/withdrawal/overlap, actual create and occupied-slot hiding, own history/detail, atomic same-scope reschedule, cancel after provider unpublication, exact clinician schedule, explicit attendance/no-show, appended correction and zero Booking-created clinical assignments/queries. This is **Booking regression proof, not Consultation Opening proof**.

Production and full dependency audits: **0 HIGH / 0 CRITICAL**, retained **2 LOW / 3 MODERATE** findings. No dependencies, backend tests/contracts, migrations or CI workflow were changed. Remote exact-head Bootstrap status is recorded in the PR; Stage B exact-head evidence remains required after the independent backend merge.

| Controlled presentation capture | File |
| --- | --- |
| Doctor Live schedule | [39](ui-screenshots/39-en-opening-schedule.png) |
| Booking before opening | [40](ui-screenshots/40-en-opening-booking-detail.png) |
| Explicit Start Consultation confirmation | [41](ui-screenshots/41-en-start-consultation.png) |
| Scoped relationship/current-authority unavailable | [42](ui-screenshots/42-en-opening-relationship-required.png) |
| Opened metadata shell | [43](ui-screenshots/43-en-consultation-opened.png) |
| Arabic opened metadata shell | [44](ui-screenshots/44-ar-consultation-opened.png) |
| Arabic mobile opened metadata shell | [45](ui-screenshots/45-ar-mobile-consultation-opened.png) |

Until then: **Stage A / backend integration pending; no real Consultation Opening completion claim and no review-readiness claim.** No backend-status reconciliation is performed by this frontend document.
