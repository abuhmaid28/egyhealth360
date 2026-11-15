# Frontend V2 Package A — Issue 136

Bounded implementation candidate, authorized by [Issue #136](https://github.com/abuhmaid28/egyhealth360/issues/136); [roadmap](https://github.com/abuhmaid28/egyhealth360/issues/135). No merge, deployment, Package B or release approval.

## Source and G0 freeze (checkpoint 1/6)

- Sole parent: PR #134 `d268264b1d062c65425a223f8f25d6e72442586e`, tree `92fb45db0c933b7bfe47cc272d953950f10999ac`. Remote Draft/open/unmerged and baseline CI run 43643309450 success verified on 15 November 2026.
- Branch: `feat/136-frontend-v2-package-a`; final stacked Draft must target `integrate/133-bounded-candidates`. No historical code merge/cherry-pick.
- Visual references: #107 Patient date-led card/compact retrieval, Doctor current-source context/local task links. #101 audited Violet × Apricot A roles, licensed on-repo Inter/Plex. #105 Navigation A and Patient appointment-only12h; professional24h retained. #111 aliases are candidate presentation only, not final DS.
- Text wordmark retained: AP05 logo rights remain open. No new assets beyond eight authorized real-browser captures.
- T1: CSS system first paint, explicit System/Light/Dark in memory after mount; no persistence; clear on logout/account switch/reload. LocaleProvider, session, adapters and operation identities remain owners of their existing state.

### Source-to-screen and capability ownership

| Destinations | Production owners | Capability / boundary |
| --- | --- | --- |
| `/patient` | PatientMyCare, own profile/bookings, released readers | Own-source Live and explicitly separate synthetic Demo; no private/draft counts |
| `/patient/discover`, `/patient/doctors/:id`, `/patient/clinics/:id` | PatientScreen, availability | Existing public directory/finite availability; booking gives no clinical authority |
| `/patient/appointments`, `/patient/appointments/:id` | PatientScreen, LiveBookingList/Detail | Existing booking review/change/cancel/history; exact IANA/DST and appointment-only12h |
| `/patient/summaries`, `/patient/follow-up`, `/patient/history`, `/patient/record` | Existing documentation/follow-up and bounded source readers | Only existing released/own scopes; record is Demo where unsupported Live |
| `/patient/settings`, Demo medications/laboratory | Existing PatientScreen | Existing settings and explicit unsupported/Demo truth; no new Live prescription/lab |
| `/doctor`, `/doctor/schedule`, `/doctor/appointments/:id` | DoctorScreen, LiveBookingList/Detail | Minimum schedule logistics; no clinical grant inferred |
| `/doctor/consultation/:id`, `/doctor/consultation/:id/documentation` | Opening, LiveDocumentationWorkspace, consultation presentation | Exact current assignment/source; stable editor; independent sign/release/follow-up/close |
| `/doctor/availability`, `/doctor/summaries`, `/doctor/settings` | Existing availability/released readers/DoctorScreen | Existing supported functions only; care-relationship management unavailable in interface |

No new API call, clinical command, route, session behavior, automatic retry or Live→Demo fallback. Pending/uncertain outcomes stay with original keys. Backend/Auth/Session/CSRF/Clinical/DB and staff sources are outside this package.

### Exact maximum scope

Only these 50 paths may differ from the sole parent; paths are a ceiling, not a target. Everything outside must remain blob/mode/type identical.

1. `apps/web/app/globals.css`
2. `apps/web/app/layout.tsx`
3. `apps/web/app/loading.tsx`
4. `apps/web/src/components/ui.tsx`
5. `apps/web/src/components/application.tsx`
6. `apps/web/src/components/portal-shell.tsx`
7. `apps/web/src/components/portal-shell.module.css`
8. `apps/web/src/components/v2/read-context.tsx`
9. `apps/web/src/components/v2/read-context.module.css`
10. `apps/web/src/components/patient-my-care.tsx`
11. `apps/web/src/components/patient-my-care.module.css`
12. `apps/web/src/components/patient.tsx`
13. `apps/web/src/components/availability.tsx`
14. `apps/web/src/components/live-home.tsx`
15. `apps/web/src/components/live-booking.tsx`
16. `apps/web/src/components/doctor.tsx`
17. `apps/web/src/components/clinician-consultation.tsx`
18. `apps/web/src/components/clinician-consultation-presentation.tsx`
19. `apps/web/src/components/clinician-consultation.module.css`
20. `apps/web/src/components/consultation-opening.tsx`
21. `apps/web/src/components/documentation.tsx`
22. `apps/web/src/components/live-documentation.tsx`
23. `apps/web/src/components/follow-up-intents.tsx`
24. `apps/web/src/components/consultation-close.tsx`
25. `apps/web/src/lib/i18n/context.tsx`
26. `apps/web/src/lib/i18n/ar.ts`
27. `apps/web/src/lib/i18n/catalog.ts`
28. `apps/web/src/lib/presentation.ts`
29. `scripts/test-ui-browser.mjs`
30. `tests/ui-v2-read-surfaces.test.mjs`
31. `tests/ui-locale.test.mjs`
32. `tests/ui-critical-booking-copy.test.mjs`
33. `tests/ui-patient-booking-time.test.mjs`
34. `docs/CURRENT_STATUS.md`
35. `docs/SOURCE_OF_TRUTH.md`
36. `docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md`
37. `apps/web/src/components/v2/frontend-v2-theme.tsx`
38. `apps/web/src/components/v2/frontend-v2-tokens.css`
39. `apps/web/src/components/v2/patient-doctor-layout.module.css`
40. `scripts/support/ui-v2-patient-doctor-browser.mjs`
41. `tests/ui-v2-visual-integration.test.mjs`
42. `docs/frontend-v2-slices/FRONTEND_V2_PACKAGE_A.md`
43. `docs/frontend-v2-slices/evidence/a-patient-ar-light-390.png`
44. `docs/frontend-v2-slices/evidence/a-patient-ar-dark-390.png`
45. `docs/frontend-v2-slices/evidence/a-patient-en-light-1440.png`
46. `docs/frontend-v2-slices/evidence/a-patient-en-dark-1440.png`
47. `docs/frontend-v2-slices/evidence/a-doctor-ar-light-390.png`
48. `docs/frontend-v2-slices/evidence/a-doctor-ar-dark-390.png`
49. `docs/frontend-v2-slices/evidence/a-doctor-en-light-1440.png`
50. `docs/frontend-v2-slices/evidence/a-doctor-en-dark-1440.png`

### Verified reference heads

- `origin/reference-107`: `56f4f700aa83297c9f5c164a5304135303137f75`
- `origin/reference-101`: `687f94074c0ac4d45610546517ea6aa228d36183`
- `origin/reference-105`: `82fbbe9fef28a6407947852d47473ea35cd057a8`
- `origin/reference-111`: `84e39a14a888686307562a5df383d2a475bfcd2f`

## Checkpoint ledger and resumption

1. Source/G0 freeze complete. Baseline browser capture pending local build.
2. Shared foundation/navigation/T1 implemented: scoped audited Light/Dark pairs, CSS System first paint, memory-only override, session/account/capability reset without remount. Original source/CSS preservation tests retained. Build/typecheck/focused lint PASS; real Chromium baseline captured outside Git. Full visual QA remains checkpoint5.
3. Patient presentation complete on existing journeys: date-led single-CTA My Care, supported discovery/provider/clinic/availability, booking review/detail/history/released/follow-up/settings via scoped foundation. Original adapters/data preparation and all Patient12h/DST/privacy assertions preserved;25 focused tests and production build PASS. Responsive/functional matrix follows in checkpoint5.
4. Doctor presentation complete on existing schedule/availability/opening/consultation/documentation/follow-up/close/released/settings. Source context is before the editor in DOM and responsive disclosure; editor and all command-owning children remain mounted. Ordinary task links gain native focusable destinations. All245 inherited UI tests plus3 new integration tests pass; production build/focused lint pass. Full browser matrix remains checkpoint5.
5. Full local QA/screenshots pending.
6. Independent reviews/one Draft/final-head CI pending.

Resume from the branch and latest checkpoint commit; preserve all original assertions. Local evidence lives under `/tmp/eh136-*` until receipt is finalized. Do not claim remote CI or reviews before execution.
