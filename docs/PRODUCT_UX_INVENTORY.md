# Product UX evidence inventory — Stage 2

Point-in-time evidence at main `7156b7fe667342a2ed4b356d857ff56c2f7da7fa`, inspected for the [Stage 2 authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565142946). This is analysis, not a design specification or a fresh hosted runtime test. [CURRENT_STATUS](CURRENT_STATUS.md) owns delivery truth; [UX_FOUNDATION](UX_FOUNDATION.md) owns current Product UX guidance.

## Evidence and limits

Read current GitHub context, AGENTS, CURRENT_STATUS, charter, source index, Product, Architecture and roadmap before accepted I1/I2/I3 contracts and implementation. Checked actual frontend dispatch/adapters, accepted behavior and test evidence; visually inspected the seven existing screenshots listed below. No screens regenerated, browser mutations performed, deployments changed or runtime suites rerun for this inventory. Task frequencies and usability implications are reasoned hypotheses, not analytics, interviews or measured error rates.

The latest hosted I2 evidence is [the doctor-demo report](PRE_FINAL_DOCTOR_DEMO_UI.md) and its [hosted results](ui-screenshots/doctor-demo/hosted-results.json). It proves the recorded synthetic candidate, not today's main deployment parity. Frontend Live integration, backend implementation and verified hosted delivery are separate claims. A Demo interaction is never proof of a backend capability.

## A. Domain capability → B. current V1 experience → C. target product need

| Capability and authority | Current domain truth | Current V1 exposure | Target product need / gap |
| --- | --- | --- | --- |
| Identity / own profile | I1 registration, explicit login, session and own permitted profile are implemented | Live login/profile through `application.tsx` and `live.ts`; no registration command in the Live adapter | Enter own care safely; registration acknowledgement must not imply login or disclose another account. Registration UI is a gap, not missing backend policy |
| Organizations / memberships / publication | Principal-checked internal operational management; no generic public ADMIN mutation API | Admin Demo overview; Live `operations` unsupported | Manage legitimate operational scope without patient record access; no claim that the Demo shell performs administration |
| Find appropriate clinician | Published, active directory and finite eligible slots implemented | Live discovery, clinician/clinic detail and availability | Compare public clinician/specialty/clinic/time facts; no invented clinical matching, ranking or recommendation engine |
| Establish care relationship | Patient authorization + designated clinician acceptance create the sole current clinical grant | Opening explains missing authority; no bilateral relationship management commands in Live adapter | Understand who must act before care can begin; avoid a dead end after booking. Future UI integration must preserve both explicit actions |
| Book / manage visit | Own booking, cancellation, atomic reschedule, logistics/history and clinician schedule implemented | Live patient bookings, clinician schedule/detail, attendance and opening | Know exact clinician, clinic, time/timezone, confirmed state and eligible next action; failed replacement preserves original booking |
| Consult / document / release | Booking-backed opening, human findings/allergy review, author-only notes, independent patient-summary release implemented | Live consultation/documentation; separate saved drafts, private signing, release/history controls | Keep patient/visit context and draft/release distinction available through the task; private findings never copied automatically |
| Follow-up / explicit close | FollowUpIntent draft/release/correction/explicit booking link; one-way consultation close implemented | Live follow-up and Review & Close | Recommendation is not a booking; close is not release or clinical completion. Patient can act on released instructions |
| Prescribe | Curated catalog; draft/sign/cancel/replace, explicit validity and signed-source history implemented in I3 Slice 1 | Demo prescription continuation; no I3 prescription Live adapter integration | Read exact clinician instructions and validity; clinician reviews prior dispensing before replacement. Backend-ready UX need, not Live delivery |
| Route / accept / dispense / correct | I3 Slice 2 exact routed items, explicit staff acceptance, full-item dispense, correction/reversal and bounded history implemented | Pharmacy Demo `Received → Preparing → Dispensed`; Live `artifacts/fulfillment/updateFulfillment` unsupported | Exact queue responsibility, separate acceptance/eligibility/item fulfillment and correction truth. Demo “Preparing” is not an implemented stock/readiness event |
| Laboratory | Accepted future I3 policy; no Lab backend | Demo request/result shell only; patient Lab hidden from Live navigation | Future assigned orders, explicit work/finalization, released result and amendment/retraction understanding; do not inherit Demo semantics as contract |
| Continuity / BP / plans | Existing M2 BP/EH-012/planning/INITIAL foundations and separate released I2/I3 sources | Live record reads bounded BP/legacy encounters/follow-ups; Demo provides broader story | Understand sources together without false completeness. Integrated I4 timeline/updates/reminders are future; legacy follow-up is not a new slot booking |
| EACCE / research | Not implemented; engine/adapter/worker are scaffolds | No evidence of working assessment/evaluation product | Future bounded explainable review; never fabricate classifications, evidence, clinical advice or results |

Sources: [I1](V3_I1_CONTRACT.md), [I2](V3_I2_CONTRACT.md), [I3](V3_I3_CONTRACT.md), [prescription](V3_I3_SLICE1.md), [pharmacy](V3_I3_SLICE2.md), [Architecture](ARCHITECTURE.md), [API](API.md). Tests supporting current behavior include [I2 combined runtime](../scripts/verify-v3-i2-exit-runtime.mjs), [prescription runtime](../scripts/verify-prescription-runtime.mjs) and [pharmacy runtime](../scripts/verify-pharmacy-runtime.mjs). These are existing evidence paths, not tests executed in Stage 2.

## Existing route/view inventory — evidence only, not a sitemap proposal

The [catch-all page](../apps/web/app/[[...path]]/page.tsx) renders [Application](../apps/web/src/components/application.tsx); [PatientScreen](../apps/web/src/components/patient.tsx), [DoctorScreen](../apps/web/src/components/doctor.tsx) and [OperationsScreen](../apps/web/src/components/operations.tsx) dispatch by path and mode. Paths below describe current implementation, not approved Stage 3 structure or labels.

| Existing path/view family | Current mode/behavior |
| --- | --- |
| Entry/login; role homes `/patient`, `/doctor`, `/pharmacy`, `/laboratory`, `/admin` | Explicit Demo/Live; role picker is Demo, not permission selection for Live |
| `/patient/discover`, `/patient/doctors/:id`, `/patient/clinics/:id` | Directory/profile/availability; Live backend integration |
| `/patient/appointments[/:id]`, `/doctor/schedule`, `/doctor/appointments/:id` | Live logistics/history/detail/change, clinician attendance; Demo equivalents separately modeled |
| `/doctor/availability` | Live own finite publication/withdrawal, not recurring scheduling engine |
| `/doctor/consultation/:bookingId[/documentation]` | Live opening/context, documentation, follow-up and Review & Close; separate synthetic Demo consultation |
| `/patient/summaries`, `/doctor/summaries` | Live released-summary readers; current clinician authority still required |
| `/patient/follow-up` | Live released instructions; does not reserve a slot |
| `/patient/record`, `/patient/history` | Bounded Live legacy record reads; not I4 integrated timeline |
| `/patient/medications`, `/patient/laboratory` | Demo sections; removed from Live navigation; no Live fulfillment claim |
| `/patient/settings`, `/doctor/settings`, operational settings | Patient own profile in Live; clinician/operational explanatory scope is not a generic management API |
| `/pharmacy`, `/laboratory` | Demo artifact inbox/detail/fulfillment; Live commands unsupported |
| `/admin`, `/admin/organizations`, `/admin/users`, `/admin/directory`, `/admin/scheduling` | Demo operational presentation; no live admin mutations |

[Live adapter](../apps/web/src/lib/api/live.ts) and [mock adapter](../apps/web/src/lib/mock/adapter.ts) are separate. Unsupported Live calls reject explicitly; no silent Demo fallback. Actual shared primitives are [ui.tsx](../apps/web/src/components/ui.tsx); [packages/ui](../packages/ui/src/index.ts) is a scaffold. Their structure is not a user mental model or a Stage 2 refactor target.

## Historical screenshot observations

| Existing image inspected | Observation and bounded implication |
| --- | --- |
| [Patient desktop](ui-screenshots/doctor-demo/patient-dashboard-en-1440.png) | A useful next-visit status coexists with journey strip, recent visits, identity and two overlapping released-care/privacy explanations. Repetition can obscure the actual next action; no measured usability claim |
| [Patient Arabic mobile](ui-screenshots/doctor-demo/patient-dashboard-ar-390.png) | RTL and much localized content already work; long stacked content repeats privacy/released-care messaging. Role-based portal/account language merits personal-context review, not a blanket ban on role descriptions |
| [Clinician documentation](ui-screenshots/doctor-demo/documentation-en-1440.png) | Patient/visit strip and explicit private/released boundaries are valuable. Long sequential sections and separate follow-up/review controls create a context-retention requirement; not proof that every section needs a new page |
| [Review and close](ui-screenshots/doctor-demo/review-close-en-1440.png) | Explicit irreversible close and separate release warnings are strengths to preserve. Saved/released counts are page-limited, so future UX must not imply a complete clinical readiness assessment |
| [Pharmacy Demo](ui-screenshots/09-pharmacy.png) | Task inbox and scope boundary are useful. Synthetic metric, artifact ID and “Preparing” progress must not become assertions about current backend supply readiness |
| [Laboratory Demo](ui-screenshots/10-laboratory.png) | Synthetic result presentation is not order/finalization/amendment proof. “Clinician review required” must not imply a mandatory doctor-release gate; future accepted policy releases finalized results directly |
| [Admin Demo](ui-screenshots/12-admin-operations.png) | Explicit no-clinical-access and presentation-only notices are correct. Counts/quick links alone do not establish a working operational management journey |

All images remain historical BEFORE evidence at their existing paths. No visual treatment is endorsed or selected by these observations.

## Content and behavior findings

Observed: personal screens use “Patient portal” / role labels; Demo operations expose “Artifact-scoped workspace” and opaque IDs. The [Arabic catalog fallback](../apps/web/src/lib/i18n/catalog.ts) returns the English key when missing; operations headings contain direct English strings; date helpers default to English if locale is omitted. These are evidence of leakage risk/current code gaps, not a claim that every screenshot leaks English. Preserve clinical authored text and medication identities rather than blindly translating them. Final glossary, exact Arabic wording and date/number conventions need the later content gate.

[UX.md](UX.md) is now a pointer to the Stage 2 package. [DESIGN_SYSTEM](DESIGN_SYSTEM.md) remains historical V1 direction: its fonts/colors/layout/navigation suggestions cannot authorize V2. [PRODUCT](PRODUCT.md) retains a stale opening “Stage 0+1 audit” task sentence; current authorization and CURRENT_STATUS supersede that mutable sentence. It is deliberately unchanged because this sprint changes no product policy and the CI classifier treats that accepted scope file as high risk. Do not widen this sprint merely to clean its header.

## Mismatch register and disposition

| ID | Mismatch / uncertainty | Disposition |
| --- | --- | --- |
| M01 | Registration and bilateral relationship APIs exist without corresponding Live self-service in the inspected adapter | Record frontend integration need; Stage 3 must account for entry and two-party authorization. No backend or UI fix here |
| M02 | Prescription/pharmacy backend complete but Live UI/hosted I3 parity unverified | Separate backend capability from visible delivery everywhere; later authorized implementation/deployment gate |
| M03 | Pharmacy Demo preparation sequence differs from accepted routing/acceptance/full-item model | Do not reuse Demo transitions as requirements. No “ready for pickup” promise without an actual source |
| M04 | General record expectation exceeds bounded legacy Live record projection | Explain available sources without claiming complete history; I4 integration remains future |
| M05 | Future Lab Demo does not prove accepted result release/correction semantics | Future journey derives from accepted policy, not mock states; no extra sample/LIS/second-verifier requirements |
| M06 | Repeated home information, long consultation task and English fallback | Stage 3 task continuity and later Content/Arabic acceptance requirements; no design/layout selected |
| M07 | No patient/clinician usage research or frequency analytics in this sprint | Priorities/frequencies remain recommendations for owner review, not measured findings |

No new concrete P0/P1 backend foundation defect was established by this bounded review. That is not a fresh runtime/security audit; accepted Stage 1 health disposition and CI evidence retain their stated limits. Product integration gaps are not permission to modify accepted behavior.
