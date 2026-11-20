# UI Phase 2 — Arabic / RTL

> Current PR #55 continuation: [Real Booking integration](V3_UI_REAL_BOOKING.md) now provides Live create/history/detail/cancel/reschedule/schedule/attendance/correction from merged Slice 3. The availability-only/Booking-unavailable boundaries below describe the earlier phase baseline. General clinical workflows remain Demo-only; Booking grants no clinical authority.


Branch `feat/v3-ui-ar-rtl-polish`, based on main `652d6fd0661a030b1eacfd9ac650a5a97c9e17a9` (merged PR #52). Authorization: [Issue #51 comment 6458941165](https://github.com/abuhmaid28/egyhealth360/issues/51#issuecomment-6458941165), within [Fast-Track delegation](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6458907853). PR #53 and backend semantics are outside this phase. No merge is performed by this task.

## Localization

`apps/web/src/lib/i18n/ar.ts` is a locally authored Arabic catalog, keyed by English interface copy. `catalog.ts` provides pure locale parsing and placeholder interpolation; `context.tsx` owns the React presentation preference and language switch. No service, paid dependency, runtime translation library or DOM text rewriting is used.

The accessible `English | العربية` button group is present on login and in the shared header. Switching is immediate through context and preserves route, form state and entered content. The dedicated `eh360-locale` storage entry contains only the literal `en` or `ar`; it never contains identity, credentials, session, patient or clinical data. The existing demo store remains separate and unchanged by language switching. Invalid preference values resolve to English. Document `lang` and `dir` are updated together; the server initially renders English and restores the saved presentation preference after hydration.

Interface labels, authored descriptions, controlled statuses, empty/loading/error states and notifications use the catalog. JSX option labels are localized while their original explicit values remain unchanged. Public/API names and free-text medical content are not automatically translated: complaints, assessments, notes, medication/dose/lab text, patient instructions and results remain exactly as entered. No diagnosis, translation service or generated clinical recommendation is introduced. Catalog coverage tests require Arabic entries for authored static UI translation calls and matching interpolation placeholders.

## Routes

Both languages cover login; Patient dashboard, discovery, doctor/clinic profile, availability, booking review/confirmation, appointments, record/history, medications, laboratory, follow-up and settings; Doctor dashboard/schedule/availability, appointment context, patient summary and consultation assessment/allergy/private-note/prescription/lab/instructions/review/release forms; Pharmacy, Laboratory and Admin operational workspaces. Existing route URLs and role values remain unchanged.

Arabic uses a real RTL document and right-side navigation. Existing logical margins/padding and grid/flex direction adapt naturally; focused overrides cover mobile drawer transform, popover anchoring, directional arrows, long labels, modal sizing and header wrapping. Medical symbols are not mirrored. ISO timestamp/email/password fields remain LTR; entered multiline text uses its own text direction. Gregorian dates and digits retain the existing `Intl` clinic-zone format in both languages, rather than reinterpreting timestamps through the browser's timezone. Arabic-Indic numeric/date formatting can be added later as a presentation option. IANA identifiers and API instants remain unchanged.

## Live / demo boundary

Live auth, public directory, own profile/BP/HTN history and Slice 2 availability read/publication/withdrawal remain live. Booking, consultation, prescription, lab/fulfillment and follow-up intention remain browser-only demo capabilities. The Arabic live-slot review explicitly states that no live slot is reserved and no care relationship or clinical authority is created. The synthetic Ahmed–Mariam relationship remains independent of booking. No speculative booking endpoint, backend code, API contract, schema, migration or authority change is included.

## Validation

Existing Bootstrap gates remain intact. The English Golden Demo and existing live availability/browser matrix are retained. `tests/ui-locale.test.mjs` checks enum-only preference parsing, literal placeholder preservation and static catalog coverage. The added Arabic browser suite covers switching both ways without reload, preference persistence/isolation, document language/direction, clinical text preservation, full consultation/release and fulfillment journey, dialogs, role navigation, live availability/boundary text and 1440/834/390 viewport overflow. The existing real API UI smoke now also checks Arabic patient availability and the explicit demo handoff against actual isolated Nest/PostgreSQL fixtures; clinician publication/withdrawal still runs in English.

Run pinned Node 24.21.0 / pnpm 10.34.6:

```sh
pnpm install --frozen-lockfile
pnpm generate
pnpm lint
pnpm typecheck
pnpm build
node --test tests/*.test.mjs
pnpm test:ui
pnpm test:ui:browser
# Disposable DATABASE_URL and free ports 3000/3001:
pnpm test:ui:real
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
```

Use `EH_UI_CHROMIUM=/usr/bin/chromium` for a system browser and `UI_SCREENSHOT_DIR=docs/ui-screenshots` to regenerate captures. Exact main post-merge and candidate-head Bootstrap evidence belongs in the PR handoff; no review-readiness claim is made before those succeed.

## Arabic screenshots

[Login](ui-screenshots/20-ar-login.png) · [Patient dashboard](ui-screenshots/21-ar-patient-dashboard.png) · [Discovery](ui-screenshots/22-ar-discovery.png) · [Doctor profile](ui-screenshots/23-ar-doctor-profile.png) · [Booking review](ui-screenshots/24-ar-booking-review.png) · [Doctor dashboard](ui-screenshots/25-ar-doctor-dashboard.png) · [Consultation workspace](ui-screenshots/26-ar-consultation-workspace.png) · [Mobile dashboard](ui-screenshots/27-ar-mobile-dashboard.png) · [Live availability](ui-screenshots/28-ar-live-availability.png).

Screenshots use controlled synthetic demo/HTTP fixtures. Real API behavior is separately verified by the real API smoke, not claimed on the basis of screenshot labels. Public provider/clinic names, timezone identifiers and entered clinical material may remain in their original language. Future UI depth (enrollment, cancellation/rescheduling, corrections and richer operational management) remains governed by the existing UI guide and separate backend dependency gates.
