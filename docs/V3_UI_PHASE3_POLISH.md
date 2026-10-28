# UI Phase 3 — presentation polish and booking boundary

Branch `feat/v3-ui-phase3-polish`, starting main `ac590fbae0e1cf4244928dee33ad2e5328d7ece8` (merged Arabic/RTL PR #54). Product Owner session authorization is limited to this frontend track. Backend Slice 3 / PR #53 is separate and untouched. No backend completion, clinical authority or merge is claimed.

## Delivered experience

Patient routes remain `/patient`, `/patient/discover`, `/patient/doctors/:id`, `/patient/clinics/:id`, `/patient/appointments[/id]`, `/patient/record`, `/patient/history`, `/patient/medications`, `/patient/laboratory`, `/patient/follow-up` and `/patient/settings`. Discovery has recoverable search/filters; booking review has three-step progress and an explicit demo disclosure. Appointment rows expose clinic-local timezone, and the Doctor appointment uses the selected clinic rather than the first provider clinic. The dashboard reduces the promotional hero when a visit is upcoming, leaving more room for care information. Detail breadcrumbs identify the actual screen.

Doctor routes remain `/doctor`, `/doctor/schedule`, `/doctor/availability`, `/doctor/appointments/:id` and `/doctor/consultation/:id`. Consultation section links navigate assessment/allergies, prescription/tests and instructions/follow-up without resetting entered text. Final review now includes complaint and allergy status alongside assessment, instructions, prescription, tests and follow-up; private notes stay excluded. Released content is explicitly read-only. No release/correction policy changes.

Explicit synthetic workspace actions connect Patient confirmation → Doctor schedule, released consultation → Pharmacy/Laboratory/Patient record, Pharmacy → Laboratory/Patient record and Laboratory → Patient record. They are presenter shortcuts, hidden in Live mode, using the existing synthetic roles and state. They do not establish clinical relationships or grant access. Admin receives no clinical action or navigation.

## Replaceable booking architecture

`src/lib/api/booking.ts` contains the presentation-level `BookingService`: `create`, `listOwn`, `detail` and `clinicianSchedule`. Components consume this service through context instead of calling demo booking methods directly. The demo service delegates to the existing role-scoped adapter/store. The live implementation is **unavailable** and rejects before any adapter/HTTP call. Live views show an intentional availability-only panel. `src/lib/mock/booking.ts` owns the explicit live-public-slot → synthetic Patient preview, preserving the original seven-field public slot and separate Ahmed–Mariam fixture.

This is not a proposed REST/OpenAPI contract. No Booking endpoint, DTO, status schema, identifier mapping, idempotency or attendance policy is invented. Cancel/reschedule/attendance interfaces are deferred until screens and merged reviewed contracts require them. Existing adapter methods are retained for compatibility; booking state remains entirely in the demo adapter. A future integration can replace the service factory after Slice 3 reaches main and receives separate frontend integration review. Consultation remains separately gated by current clinical authority; booking never supplies that authority.

## Live/demo mapping

| Capability                                                                 | Status in this PR                                                     |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Auth/session; directory; own profile and existing BP/HTN record            | Existing Live integration preserved                                   |
| Slice 2 public availability; clinician publication/withdrawal              | Existing Live integration preserved; no synthetic fallback on failure |
| Booking, schedule/appointment demo                                         | Browser-only Demo; Live service unavailable, no Booking HTTP calls    |
| Consultation, prescription, lab, pharmacy fulfillment, follow-up intention | Browser-only Demo, unchanged persistence/authority boundaries         |
| Admin operations                                                           | Existing bounded operational demo; no clinical access                 |

## Arabic, responsive and accessibility

All added copy uses the authored Arabic catalog. Clinical free text, API names, IDs and codes are retained; mixed text uses bidi isolation/automatic input direction. Gregorian formatting still uses the slot's explicit IANA timezone, never the browser timezone. No translation service, new dependency or credential storage is introduced.

Drawer navigation is inert and hidden when closed on mobile. Opening confines keyboard navigation, makes the background inert, locks body scrolling, supports Escape and provides a close button. Closing restores focus and scrolling. Desktop navigation remains available. The main landmark accepts skip-link focus. Booking/release dialogs retain native focus containment, accessible descriptions and Escape behavior; release cannot be dismissed during its pending write. Reusable fields explicitly associate labels and separate hint descriptions, keeping stable accessible names for filled multiline controls. Status filters expose pressed/current state. Existing focus and reduced-motion styles remain.

Action groups wrap on tablet/mobile, long Arabic consultation labels fit, confirmation content wraps, and dialogs scroll within dynamic viewport height. Availability pagination stacks its context above controls at narrow widths. Authored adapter errors use `UiError`; `safeErrorMessage` suppresses raw transport/parser/error payloads while preserving authored, translated recovery guidance.

## Validation and evidence

Existing Bootstrap gates are unchanged. Run the pinned Node 24.21.0 / pnpm 10.34.6 install, generate, lint, typecheck, workspace build, root unit suite, UI adapter suite, browser suites, real API smoke and both audits. Exact-head CI run/job/head/base and conclusions are recorded in the PR handoff after completion.

Four focused adapter tests cover service delegation/scoping, unavailable Live booking with zero method/HTTP invocation, explicit preview isolation and error redaction. The existing localization coverage test includes added authored messages. `scripts/support/ui-polish-browser.mjs` extends the existing browser runner with English/Arabic handoff continuity, filter recovery, unavailable controls, complete release review/private-note exclusion, drawer keyboard/focus, dialog Escape and responsive checks on ten major surfaces at **1440 / 834 / 390**. The existing English/Arabic Golden Demos, all 23 route/state variants, Live Availability matrix and actual Nest/PostgreSQL browser smoke remain enabled.

Screenshots in [the presentation gallery](V3_UI_DEMO.md#screenshots) and [Arabic gallery](V3_UI_AR_RTL.md#arabic-screenshots) are refreshed using deterministic synthetic/controlled HTTP fixtures. Minimum presentation set: [Patient dashboard](ui-screenshots/02-patient-dashboard.png), [Discovery](ui-screenshots/03-discovery.png), [Doctor profile](ui-screenshots/04-doctor-profile.png), [Live availability](ui-screenshots/16-live-availability-desktop.png), [Booking review](ui-screenshots/05-booking-review.png), [Doctor dashboard](ui-screenshots/07-clinician-dashboard.png), [Consultation](ui-screenshots/08-consultation-workspace.png), [Arabic dashboard](ui-screenshots/21-ar-patient-dashboard.png), [Arabic live availability](ui-screenshots/28-ar-live-availability.png), [Mobile dashboard](ui-screenshots/13-mobile-dashboard.png). Added after-booking dashboard captures show the compact hero and actual upcoming visit: [English](ui-screenshots/29-upcoming-dashboard.png) · [Arabic](ui-screenshots/30-ar-upcoming-dashboard.png). Screenshots are presentation evidence; real-backend claims rely on the independent smoke/CI.

## Remaining scope

Backend Booking integration, cancellation/rescheduling/attendance UI, clinical draft persistence/corrections, enrollment UX, independent live-record retries and deeper operational editing remain separate work. Public entity names and clinical text can remain in their source language. Arabic-specific date digits/calendar formatting is optional future presentation work. No full WCAG certification or screen-reader audit is claimed; this phase adds focused browser accessibility checks. Booking backend integration is not implemented by this PR.
