# R1 UX integration repair — review candidate

Authorization: Product Owner's “Critical R1 UX Integration Repair” brief in the current session, under issue #72. This authorizes this bounded repair and five-portal candidates; it does not select Final Brand V2 or Design System V2. Based on the real application at `6fbd247a09d774fa42d9712068699753a88e10e6` (PR #80); PR #82 is excluded.

## Diagnosis

`Application` selected `PatientMyCare` only for exact `/patient`; every other Patient destination selected a different outer sidebar/topbar layout. Its relative `next/link` destinations were correct and remained on the same origin. `ClinicianConsultation` similarly selected premium chrome only for the authenticated Live documentation route. The defect was route-dependent presentation ownership, not duplicated booking logic or an external booking website.

In the frozen source, `Graduation demo` was rendered only when `api.mode === "demo"`. The baseline clean browser reproduced it after **explicit** Demo entry, then navigation to discovery. No Live-to-Demo transition was established for the Product Owner's original observation; neither their browser state nor screenshot provenance is available. Do not infer an original cause from the label alone.

Source inspection identified a separate restoration weakness: each page read `eh360-ui-mode`, defaulting to Demo if browser storage was absent/inaccessible. The repair retains explicit mode in the root client provider across navigation and defaults to Live when an API is configured. An explicit stored Demo preference remains Demo. Full reloads without storage default to Live and resolve the real cookie session. Live API failures and expired sessions never instantiate Demo as recovery. Session tokens, CSRF tokens and identity remain out of browser storage.

## Implementation boundary

One reusable role-aware `PortalShell` now owns the text wordmark, fonts, mode indication, role destinations, language/account/logout controls, secondary navigation, mobile Patient navigation, Demo-only utilities and notifications. My Care and the premium clinician editor reuse it. Existing screen components, Live services, booking/clinical commands and server authorization stay responsible for behavior. Patient/Clinician screens retain distinct densities within the accepted family.

Pharmacy, Laboratory and Admin are **bounded visual candidates for owner review**. A real Live identity sees explicit integration limits. Demo screens preserve their existing browser-only simulation. No prescription/lab/backend persistence, authority, clinical policy or final brand decision is added.

## Five-portal capability and visual inventory

“Live” below means integrated in `apps/web` through the existing adapter, not merely an endpoint somewhere in `apps/api`. All role routes require the matching app session; public directory data remains public. Before = frozen R1. After = this unapproved candidate.

| Role / route | Real Live UI capability | Demo-only / unsupported | Before → required adaptation / candidate |
| --- | --- | --- | --- |
| Patient `/patient` | Own profile, booking history/next appointment, released summary/follow-up projections | Preview states and fictional fixtures only in explicit Demo | Premium master → shared chrome; preserve appointment/source composition |
| Patient `/patient/discover` | Public providers, specialties, clinic filters/search | No new provider ranking, reviews or inference | Legacy sidebar → Patient-family navigation/forms/provider cards |
| Patient `/patient/doctors/:id` | Public provider details, clinic links, real availability, existing booking review/command | Demo booking uses browser state; booking grants no clinical authority | Legacy → shared Patient shell, existing booking dialog |
| Patient `/patient/clinics/:id` | Published clinic details and provider navigation | No invented clinic administration or services | Legacy → shared Patient shell |
| Patient `/patient/appointments` | Own persisted bookings/history | Demo list separately scoped | Legacy → shared Patient shell |
| Patient `/patient/appointments/:id` | Own detail, eligible cancel/reschedule, history | No clinical grant or automatic consultation | Legacy → shared shell; preserve exact command/dialog semantics |
| Patient `/patient/summaries` | Explicitly released visible summaries only | No private notes/drafts/restricted content | Legacy → shared Patient shell |
| Patient `/patient/record` | Own BP measurements and legacy HTN encounter/follow-up reads, links to released summaries | Demo clinical narrative is synthetic; no integrated universal chart | Legacy → shared shell; retain bounded source descriptions |
| Patient `/patient/history` | Bounded HTN encounter history and released summary entry | No invented unified timeline | Legacy → shared shell with explicit retrieval navigation |
| Patient `/patient/follow-up` | Current visible released FollowUpIntent/history/link state | No automatic booking/reminder or EH-012 bridge | Legacy → shared shell |
| Patient `/patient/medications` | Not integrated in UI | Browser-only Demo medication projection; Live prescription backend exists separately | Legacy empty-looking Live page → explicit unavailable state in Patient shell |
| Patient `/patient/laboratory` | Unsupported | Browser-only simulated orders/results; real Lab lifecycle not implemented | Legacy empty-looking Live page → explicit unavailable state |
| Patient `/patient/settings` | Existing own profile read/update | No new account/security settings | Legacy → shared shell and existing form |
| Clinician `/doctor`, `/doctor/schedule` | Own schedule and logistics | Demo schedule separately scoped; no general patient browsing | Legacy → denser professional shared shell |
| Clinician `/doctor/availability` | Own finite publish/withdraw/history with clinic settings | No recurrence or automatic availability | Legacy → professional shell; retain version/key semantics |
| Clinician `/doctor/appointments/:id` | Own booking logistics/attendance; eligible explicit opening | Booking alone grants zero clinical access | Legacy → professional shell; exact authority checks retained |
| Clinician `/doctor/consultation/:id` | Existing opening context/links under current authority | No automatic acceptance, grants or clinical write | Legacy → professional shell |
| Clinician `/doctor/consultation/:id/documentation` | Findings/allergy review, independent private signing and explicit summary release, FollowUpIntent, explicit close | No new prescribing, lab tabs, diagnoses or clinical rules | Premium master → same shared chrome; retain connected editor and local tasks |
| Clinician `/doctor/summaries` | Current-authority visible released summaries | No blanket authorship access | Legacy → professional shell |
| Clinician `/doctor/settings` | Existing scope explanation | Account/membership administration not integrated | Legacy → professional shell |
| Pharmacy `/pharmacy` | Authenticated role boundary; fulfillment backend exists but UI adapter is not integrated | Existing Demo preparation/full-item simulation only; no real queue/read/dispense UI | Legacy → bounded shared-shell candidate with explicit Live unavailability |
| Pharmacy `/pharmacy/settings` | Membership/artifact-scope explanation | No administration or new grant | Legacy → candidate shell |
| Laboratory `/laboratory` | Authenticated role boundary only | Existing Demo processing/result simulation; real orders/results unsupported | Legacy → candidate shell with explicit Live unavailability |
| Laboratory `/laboratory/settings` | Scope explanation | No lab organization mutation | Legacy → candidate shell |
| Admin `/admin` | Authenticated operational boundary only | Synthetic overview; no Live aggregate operations adapter | Legacy → candidate shell with explicit limits; no fake KPI values in Live |
| Admin `/admin/organizations` | UI not integrated; real operational backend exists | Demo read-only list; no new mutation | Legacy → candidate shell/unavailable Live state |
| Admin `/admin/users` | UI not integrated | Demo fixed-role read-only overview | Legacy → candidate shell/unavailable Live state |
| Admin `/admin/directory` | Existing public directory reader | No publication management in this UI | Legacy → candidate shell and public directory, independently of operations adapter |
| Admin `/admin/scheduling` | No Live configuration UI | Demo high-level read-only representation | Legacy → candidate shell/unavailable Live state |
| Admin `/admin/settings` | Operational boundary explanation | No clinical entitlement, impersonation or authority management | Legacy → candidate shell/scope explanation |
| Wrong-role or unknown route | Existing account boundary or not-found handling | No cross-role Live switching | Same role shell and recovery destination; do not render another role's screen |

## Evidence and release gate

Evidence records below will be completed with actual results before handoff. No repaired deployment, stable staging/database/alias change, merge or main mutation is authorized by this report. The existing R1 frontend/API settings were inspected read-only and still report protection disabled.

Existing R1 frontend project: `prj_gEMNj6OqiDYNaCkrRzLOudQaPrko`. API: `prj_R8czAlBlecnq9prhZ0j2kKd0gEDi`. Neon: `spring-star-16308392`, isolated non-default branch `br-dry-truth-arc61ht4`, 22 completed migrations verified read-only. Existing deployment metadata reports the frozen source SHA; it is not the repaired candidate.

Hosted authenticated acceptance requires authorized synthetic Patient/Clinician credentials through a secure local binding. The implementation can be verified independently using a disposable local PostgreSQL 18 database and the actual Nest/Next applications. These are distinct evidence classes; local proof is not hosted proof.

## Public R1 access findings

The correct existing review origin is **[https://eh360-r1-6fbd247-review.vercel.app](https://eh360-r1-6fbd247-review.vercel.app)**. Read-only Vercel alias lookup binds it to `dpl_AgxF9xtofEfKCjVTsk2xEiYU7u8e`, the supplied R1 frontend project and frozen source. The API's non-secret `AUTH_BROWSER_ORIGIN` is exactly this origin. The frontend's non-secret `EH_UI_API_ORIGIN` is the supplied isolated R1 API deployment. No protection, Origin setting, environment variable, deployment or alias was changed.

A clean anonymous Chromium context reached landing/login/private-route login gates without Vercel credentials. Through the frontend rewrite and directly at the API, health returned 200; auth/me, own bookings, clinician schedule, summaries and synthetic patient/consultation record probes returned 401. A wrong Origin and missing login-verification header returned 403. A correctly verified login with deliberately invalid synthetic credentials returned 401. Anonymous logout without session/CSRF was rejected. `/.env` returned the catch-all app page rather than a dotenv payload; no credentials were present. No Vercel or app-session cookie was issued. See [actual anonymous results](r1-repair-evidence/public-access.json) and [login screenshot](r1-repair-evidence/public-login.png).

The raw frontend deployment hostname also serves pages anonymously, but a write from that raw hostname returns 403 because it is not the configured browser origin. This is expected exact-Origin enforcement, not a reason to expand the allowlist. Use the canonical R1 review origin for authenticated acceptance. Its browser storage is a separate origin from the raw hostname; that fact alone does not establish the cause of the Product Owner's earlier Demo observation.

These negative probes establish tested boundaries, not an exhaustive security certification. Valid hosted login, production session-cookie behavior and a hosted booking round trip remain unverified without authorized R1 test credentials. Local security tests and browser persistence evidence are reported separately.

## Before/after review package

- [Matched before/after viewer](r1-repair-evidence/review.html): 59 states per phase, including all five portals, Patient destinations, professional documentation, EN/AR, desktop/mobile and explicit Live unavailability candidates.
- [Before inventory](r1-repair-evidence/before/routes.json) / [after inventory](r1-repair-evidence/after/routes.json) identify mode and fixture provenance for every capture. These matched visual captures use browser-only Demo fixtures or controlled Live responses; they do not prove persistence.
- [Actual public baseline trace](r1-repair-evidence/public-before.json) reproduces the legacy shell after explicit Demo entry, retaining the same origin throughout.
- [Real database browser route evidence](r1-repair-evidence/real-after/routes.json) contains synthetic screenshots from actual Next/Nest/PostgreSQL flow. Credentials, cookies, CSRF/session tokens and request bodies are excluded.

Representative comparisons: [Patient discovery before](r1-repair-evidence/before/patient-discover-en-1440.png) / [after](r1-repair-evidence/after/patient-discover-en-1440.png); [Arabic mobile after](r1-repair-evidence/after/patient-discover-ar-390.png); [clinician documentation before](r1-repair-evidence/before/clinician-documentation-en-1440.png) / [after](r1-repair-evidence/after/clinician-documentation-en-1440.png); [Pharmacy Live candidate](r1-repair-evidence/after/pharmacy_staff-live-en-1440.png), [Laboratory Live candidate](r1-repair-evidence/after/lab_staff-live-en-1440.png), [Admin Live candidate](r1-repair-evidence/after/admin-live-en-1440.png).

## Required browser regression — evidence classification

| Required journey | Actual evidence / result |
| --- | --- |
| Patient login → My Care | Real synthetic account, Nest session and PostgreSQL; hosted valid login still pending credentials |
| My Care → Find care → provider → booking | Actual same-origin links, back/forward and existing booking dialog; no duplicate booking implementation |
| Booking persistence | Real disposable PostgreSQL booking reader confirms BOOKED; supplied Neon branch migration parity checked separately, no hosted booking claim |
| Back to My Care | Actual link to shared shell and exact booking anchor |
| Reload/session/persistence | Full browser reload recovers Live and same PostgreSQL booking; controlled tests also cover unavailable browser storage |
| Appointment detail/history/summaries/follow-up | Real own-source readers and explicit retrieval destinations; no invented unified chart |
| Clinician schedule → consultation → documentation | Real booking/logistics, bilateral patient authorization + clinician acceptance, persisted opening, current authority checks |
| Independent private signing/summary release | Real immutable versions; private canary excluded from patient release; separate source operations |
| Follow-up release/explicit close | Real release, correction/history, explicit CLOSED/CONSULTED, no implied save/sign/release by closing |
| Arabic/English/RTL/responsive | Browser switch/reflow and clinical mutation preservation; 1440/834/390 real flow plus existing finer-width controlled regression; native device/assistive certification remains outside evidence |
| Five portals | Shared chrome and visual candidates; real operational-role login/destination checks included in final database regression |
| No unintended Demo | Controlled normal/storage-denied/503/deep-link/reload/logout tests retain Live; real booking/clinical flow checks mode and excludes Demo controls |

## Remaining owner decisions and release sequence

1. Review this focused PR and the actual screenshots. Accept/revise the bounded Pharmacy/Laboratory/Admin visual candidates and shared navigation adaptation. Technical checks do not approve final brand/Design System or product readiness.
2. Supply authorized R1 synthetic Patient/Clinician credentials through a secure local binding or approved access procedure. Do not paste credentials in Git, issue text, screenshots or evidence. Hosted valid-login/booking/clinical acceptance cannot be substituted with mocks or local proof.
3. After review and required CI, explicitly authorize a **temporary R1-only frontend release** of the exact reviewed commit to `prj_gEMNj6OqiDYNaCkrRzLOudQaPrko`. Keep the compatible existing API project/isolated Neon branch. Preserve exact canonical review Origin. A staged build without stable aliases, followed by an expressly authorized update of only `eh360-r1-6fbd247-review.vercel.app`, can retain the existing API Origin policy. The raw deployment hostname cannot independently pass browser mutations under that policy. Record new deployment ID/source SHA, anonymously repeat public checks, then run valid hosted Patient/Clinician acceptance and database persistence checks. On failure, restore only the R1 alias to the recorded prior R1 deployment.
4. Original staging refresh is a later, separate owner decision after repaired R1 acceptance, independent review and exact source/API/database/migration parity checks. No main merge, original database/alias change, protected production domain change, new clinical scope or lab/pharmacy integration is bundled into this repair.

The implementation PR remains open/unmerged with auto-merge off. No release is performed by this task. Independent Product/UX/security review remains a separate verdict; this agent does not label its own implementation independently approved.

## Local validation and preservation

- Pinned Node **24.21.0** / pnpm **10.34.6**. Production Next build, standalone web TypeScript and repository ESLint pass. No dependency/lockfile change.
- UI tests: **164/164 PASS** (162 existing + two deterministic client regressions), no failures/skips. CI-policy tests: **30/30 PASS**. Repository document checks pass.
- Actual complete browser regression passes: Golden Demo, all role boundaries, route states, Live contract/error/retry probes, Patient/Clinician masters, Arabic/RTL, 320px reflow, 200% text, keyboard/focus, source privacy, documentation and close. The obsolete drawer checks now test visible navigation and the native account menu; the clinician master retains its primary-header bounds while allowing the new secondary route navigation.
- The real browser runner now wires the same profile, authorization, BP, encounter/follow-up, prescription and clinical modules as the API entrypoint. Own record/profile routes must load without an error panel. This corrects incomplete test wiring; no backend module was changed.
- Complete actual Next → Nest → disposable PostgreSQL 18.6 browser journey passes: create/history/detail/reschedule/cancel, exact clinician schedule and attendance; bilateral authority-gated opening; independent private signing, explicit summary/follow-up releases, preserved corrections/restrictions and explicit close; lost committed responses and identical retained-command retry without duplication. Real Pharmacy/Lab/Admin login and every operational destination, patient-payload denial, wrong-role UI boundary, language/mobile and logout also pass.
- Existing PostgreSQL authentication/authorization integration tests: **22/22 PASS**, no failures/skips. Includes strict response projection, hash-only sessions, production cookie flags, reload CSRF, invalid/expired/revoked/disabled sessions, logout/rotation, hostile Origin, IDOR/current authority and denial sanitation.
- Mode regression covers configured Live default, storage access denied, failed Live requests, authorized deep-link recovery, reload, language, logout/back navigation and wrong-role routes. No unintended Live-to-Demo transition was reproduced in the repaired candidate. These targeted restoration tests use controlled responses and do not replace database or hosted evidence.
- [Preservation manifest](r1-repair-evidence/preservation.json): **461 existing protected files byte-identical** to the frozen baseline. This includes API/database/packages, client services/adapters except the explicitly documented retry-key coordinator correction, accepted premium CSS/font assets, routing configuration, dependencies and historical screenshots. Backend logic, clinical command DTOs/semantics, schema/migrations, authentication/authorization policy and CI workflow remain unchanged.

Runtime changes are limited to these ten paths: `apps/web/app/error.tsx`; `apps/web/src/components/application.tsx`, `clinician-consultation.tsx`, `live-session.tsx`, `operations.tsx`, `patient-my-care.tsx`, `patient.tsx`, `portal-shell.tsx` and `portal-shell.module.css`; plus `apps/web/src/lib/api/documentation.ts` for the client-only retry-key ordering correction below. The global error boundary also replaces its misleading unconditional browser-Demo sentence with neutral recovery copy; this is distinct from the unexplained original screenshot observation. Test/evidence tooling and current documentation comprise the remaining delta. The complete path list is recorded in [changed files](r1-repair-evidence/changed-files.txt).

Remote CI must be read on the PR's exact final head. Local pass is not substituted for that gate, hosted valid credentials, independent review or Product Owner approval.


## CI-discovered client retry-key ordering correction

The first exact-head CI run [41822873064](https://github.com/abuhmaid28/egyhealth360/actions/runs/41822873064) found one existing documentation concurrency assertion failing (161/162). The client service and test were byte-identical to the frozen baseline at that point. A controlled diagnostic forced SHA-256 completion B before A and reproduced the changed retry key; [baseline diagnostic](r1-repair-evidence/client-order-baseline.log). A passing nondeterministic rerun was not treated as resolution.

The existing client retained one fingerprint/key per command slot, but asynchronous hash completion could let an older invocation displace the newer command's retry identity. The correction reserves key selection in invocation order. Hashing can proceed concurrently; the reservation is released **before HTTP**, so network requests remain concurrent. Scope invalidation clears the reservation registry, and the existing generation/epoch check prevents queued stale writes. Request endpoints, methods, canonical payload/fingerprint/key formats, response projection, server authorization and clinical semantics are unchanged. No backend logic, schema, migration or authentication policy is changed.

The original concurrency assertion remains. Two added deterministic regressions force reversed hash completion while retaining concurrent requests and exact retry bytes, and revoke scope while fingerprint work is queued to prove zero stale writes. The full UI suite is now 164 tests. Full browser and real PostgreSQL clinical/authority/history/retry checks are rerun for this candidate. The superseded CI run was cancelled; the final exact-head run and review verdict belong on the PR. This is an existing guarantee repair, not new clinical scope or a replacement service.

The additional existing PostgreSQL documentation concurrency/HTTP suite passed **33/33**, including observed database blocking, duplicate/rollback key reuse, assignment/session/membership/organization revocation, privacy/correction serialization, atomic audit rollback, expiry/deadlock sanitation, strict CSRF/JSON boundaries and private/draft secrecy. [Actual log](r1-repair-evidence/documentation-postgres.log). Complete browser and real PostgreSQL journeys also passed again after the client correction.
