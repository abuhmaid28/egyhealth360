# Pre-final doctor demo / UI polish

Authorized by [Issue #48, comment 6550128680](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6550128680).
Starting main: `5f64d21cf76058d7bb58295abeb0f3eca49a5ec9`.
One branch: `feat/pre-final-doctor-demo-ui-polish`.

## Hosted audit

The actual existing staging site was inspected in 25 settled English and Arabic
views: Live patient home, discovery, bookings, released summaries and follow-up;
Live clinician home/schedule, availability and a persisted consultation workspace;
Live admin; and existing Demo pharmacy/laboratory/admin shells. Desktop and mobile
captures include loading states separately from settled views. No audited view had
document-level horizontal overflow. Before captures and the text inventory are in
`/workspace/ui-polish/before`.

| Priority | Observed presentation issue | Bounded response |
| --- | --- | --- |
| P0 | Account email becomes the main greeting and dominates Arabic mobile | Clear role/account labels; approved synthetic identities remain explicitly synthetic |
| P0 | Login role shortcuts can be mistaken for Live access | Clearly separate Live sign-in from synthetic portal previews |
| P1 | Patient home delays appointments behind unrelated record/directory reads and shows unpopulated metric placeholders | Independent existing reads; appointment-first home with truthful next actions |
| P1 | Clinician overview repeats the schedule without next-step guidance | Clear visit priority, date/time grouping and consultation navigation |
| P1 | Long engineering notices compete with patient and visit information | Plain-language privacy guidance; retain exact server authorization behavior |
| P1 | Private/draft/released distinctions are small and consultation context scrolls away | Strong privacy grouping and persistent, bounded consultation context |
| P1 | Teal primary, 16px cards and fallback fonts differ from the approved design reference | Blue primary, restrained teal, 12px cards/8px controls, self-hosted Inter/Noto Sans Arabic |
| P1 | Small language/icon controls and weak muted text | 44px interaction targets, contrast/focus and responsive checks |
| P2 | Repeated dates, uneven spacing and technical Arabic | Compact localized metadata and natural Arabic on modified surfaces |

No backend product, schema, migration, authority, privacy or lifecycle changes are
authorized by this polish. Existing incomplete portals stay explicit Demo previews.
Live failures stay Live. Final `egyhealth360.vercel.app` remains untouched.

## Delivered presentation

- The shared shell now follows the blue primary/teal accent reference, loads local
  OFL-licensed Inter and Noto Sans Arabic, and uses consistent cards, controls,
  metadata, focus and language targets. Live sign-in and fictional portal previews
  are explicitly distinguished.
- Patient home reads profile and booking history independently, prioritizes actual
  loaded appointment states, and links directly to released summaries/follow-up.
  No placeholder global counts, inferred completion, or Demo fallback are added.
- Only exact approved synthetic identity/directory labels receive friendly display
  aliases. Authentication identity, role, unknown names and authored clinical text
  are unchanged. Discovery can search the displayed alias as well as source name.
- Clinician home explains the existing visit sequence. Documentation keeps patient,
  doctor, clinic, appointment and actual consultation state in a persistent header;
  private note and patient summary have distinct sections. Review & Close follows
  documentation/follow-up and shows saved private/released status before its
  existing deliberate acknowledgement and irreversible close.
- Modified navigation, headings, guidance and statuses have natural Arabic copy,
  logical RTL spacing and localized appointment metadata. Clinical text is never
  machine-translated.

## Validation and boundaries

Focused validation uses web typecheck/build, repository lint, 157 UI unit tests,
controlled browser privacy/authority/retry tests and real hosted staging. The
controlled browser suite retains the complete Golden Demo and all existing Live
booking, opening, documentation, release and close boundaries.

The opt-in `EH_STAGING_UI_POLISH=1` mode of `scripts/test-staging-browser.mjs`
adds presentation-safe screenshots and a seven-width matrix to the same real
hosted journey. It uses normal HTTPS login, CSRF-protected UI commands and the
actual published start time; no clock override, direct database writes or response
mocks. The private synthetic password stays outside Git and is never logged.

No API implementation, API client contract, schema, migration, dependency lockfile,
clinical authority, privacy or lifecycle semantics changed. No I3/EACCE or new
pharmacy/laboratory capability was started. The existing Demo shells stay fictional.
Only the existing pre-final frontend project is deployed; the API, Neon setup and
reserved final `egyhealth360.vercel.app` are unchanged.

### Presentation limitations

- This remains pre-final staging with synthetic identities, finite published
  appointment windows and existing treating assignments. It is not production.
- Appointment prioritization uses the currently loaded API page (up to 20 rows),
  without claiming a global total or inferring attendance/clinical completion.
- Availability administration retains explicit-offset timestamps and clinic timezone
  identifiers for safe scheduling. Unknown directory names and clinician-authored
  text retain their source language.
- Pharmacy/laboratory shells are existing browser Demo previews; no new Live
  fulfillment, prescriptions, notifications or AI is implied.

### Hosted results and presentation evidence

The real hosted walkthrough passed all 10 acceptance groups, including secure
session/CSRF behavior, publication and booking, schedule visibility, opening,
persisted drafts/context recovery, separate summary and FollowUpIntent releases,
private-note exclusion, deliberate close and persisted CLOSED/CONSULTED. Illegal
post-close cancellation and attendance return HTTP 409. No browser exceptions.
The visual matrix covers 119 screen/locale/width combinations across 14 screens:
1440/1200/1024/834/768/560/390 English and representative 1440/834/390 Arabic.

The final frontend candidate is deployment `dpl_E8HY54CoDEHwXDgeJHcjqvkAbmSK`
in the existing staging project. Its stable URL is
[pre-final Live staging](https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app/).
Final CSS/height-observer refinements were checked through read-only hosted
navigation; the completed clinical journey was preserved.

Axe 4.10.2 found zero automated WCAG A/AA violations in 10 hosted EN/AR views:
login, patient home/discovery, provider profile and clinician home/documentation.
Gradient avatar/map backgrounds were checked manually: the darker avatar endpoint
has 4.76:1 contrast; normal primary button text is 6.89:1 and muted canvas text
5.52:1. Offscreen editor checks are supplemented by keyboard/focus and section-link
checks, not treated as automatic conformance certification. The sticky header
tracks its actual wrapped height; real hosted links remain unobscured at all
seven widths. Controlled EN/AR tests cover the same seven widths, modal focus,
Escape, pending dismissal guards and explicit release/close boundaries. Six additional hosted EN/AR pointer checks at 1440/834/390 confirm separate-summary
draft actions activate and reset the editor, with zero clinical writes. Focus scrolling
respects visible keyboard focus so pointer action targets stay in place. Language
and icon controls use 44px targets. Status always includes text.

Evidence is synthetic, token-free, and committed for later slides/PDF use:

| Screen | English desktop | Arabic/mobile |
| --- | --- | --- |
| Patient dashboard | [1440px](ui-screenshots/doctor-demo/patient-dashboard-en-1440.png) | [AR 390px](ui-screenshots/doctor-demo/patient-dashboard-ar-390.png) |
| Provider/booking | [1440px](ui-screenshots/doctor-demo/provider-booking-en-1440.png) | Walkthrough matrix |
| Clinician schedule | [1440px](ui-screenshots/doctor-demo/clinician-schedule-en-1440.png) | Walkthrough matrix |
| Documentation | [1440px](ui-screenshots/doctor-demo/documentation-en-1440.png) | [AR 390px](ui-screenshots/doctor-demo/documentation-ar-390.png) |
| Private vs released | [Context and sections](ui-screenshots/doctor-demo/privacy-context-en-1440.png) | [Patient summary](ui-screenshots/doctor-demo/patient-summary-ar-390.png) |
| Review & Close | [1440px](ui-screenshots/doctor-demo/review-close-en-1440.png) | [EN 390px](ui-screenshots/doctor-demo/review-close-en-390.png), [AR 390px](ui-screenshots/doctor-demo/review-close-ar-390.png) |
| Closed consultation | [1440px](ui-screenshots/doctor-demo/closed-consultation-en-1440.png) | [AR 390px](ui-screenshots/doctor-demo/closed-consultation-ar-390.png) |

Machine-readable records: [hosted journey/matrix](ui-screenshots/doctor-demo/hosted-results.json)
[accessibility results](ui-screenshots/doctor-demo/accessibility-results.json),
and [12 hosted EN/AR editor-focus checks](ui-screenshots/doctor-demo/focus-results.json).
The provider capture shows the truthful availability after the booked visit, rather
than inventing new slots for a screenshot. Review dialogs scroll internally on
small screens; the confirm action remains reachable by keyboard/touch.
