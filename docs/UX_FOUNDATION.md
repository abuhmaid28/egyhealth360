# Product UX foundation

CURRENT AUTHORITATIVE Product UX reference for Foundation Reboot V2 Stage 2. It organizes the current product mental model; it is **not final owner approval of proposed journeys, task rankings, IA, content or design**. Inherited approved constraints and new recommendations are distinguished in [UX_DECISION_REGISTER](UX_DECISION_REGISTER.md). [Current authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565142946), [CURRENT_STATUS](CURRENT_STATUS.md) and the [charter](FOUNDATION_CHARTER.md) govern execution. Stage 3 is not authorized by this document.

Read this → [USER_JOURNEYS](USER_JOURNEYS.md) → [UX_DECISION_REGISTER](UX_DECISION_REGISTER.md). [Evidence inventory](PRODUCT_UX_INVENTORY.md) supplies current/V1/source detail; a product/design reader need not reconstruct backend code. The product remains a synthetic graduation platform, not a real-patient deployment.

## 1. Product mental model and scope

People seek care, clinicians conduct and document it, fulfillment staff carry out exact authorized work, and administrators maintain operational access. One healthcare story connects these responsibilities; it does not make every role entitled to every part of that story. Ordinary care does not require a CarePlan or research engine.

| User group | Mental model | Primary outcome |
| --- | --- | --- |
| Patient | My care, my appointment, what my clinician shared, what happens next | Find suitable care, attend it and understand the next step without learning hospital/database structure |
| Clinician | Today's work and the current patient's consultation | Conduct safe human-led care, document deliberately, communicate outcomes and follow-up |
| Pharmacy Staff | Exact assigned work awaiting acceptance/fulfillment; completed work with corrections | Fulfill valid routed prescription items once, with truthful attributable history |
| Laboratory Staff | FUTURE assigned orders, work status and verified results | Perform authorized diagnostics and explicitly finalize/correct the result |
| Admin | Operational people, organizations, memberships and permitted configuration | Keep legitimate access and operations working without clinical-content authority |

These are behavioral roles, not demographic personas or final workspace/navigation labels. A database model, module, artifact or role name does not automatically deserve a page, dashboard card or user-facing term.

### Current versus future

- **CURRENT backend:** identity/session, registration/profile, organizations/memberships, directory, bilateral relationships, finite availability, booking/schedule/attendance, consultation opening, documentation/release, FollowUpIntent/links and close, prescription lifecycle and pharmacy routing/acceptance/full-item dispense/correction/reversal.
- **CURRENT V1 Live integration:** login/profile, directory/availability, patient booking, clinician schedule/opening/documentation/follow-up/close, released summaries and bounded legacy record reads. Historical hosted I2 evidence exists. Live registration/relationship management and prescription/pharmacy integration are gaps in the inspected adapter. Hosted I3 parity is unverified. Admin management is not a Live frontend capability.
- **FUTURE — requires later explicit authorization:** Laboratory backend/UI, integrated I4 longitudinal timeline and notifications/reminders, EACCE, research/evaluation, later frontend integrations/redesign. Lab's accepted policy exists; implementation does not. Demo Lab/pharmacy/Admin interactions are synthetic presentation only.
- **Not silently added:** partial dispensing, refill/substitution, stock or pickup-readiness tracking, payments/delivery, clinical advice/automated dose choice, LIS/PACS, impersonation or broad record browsing.

“Current” in a task or journey below means the relevant domain capability exists, **not** that the final UI exists or that it is deployed. “Future” describes target needs and never grants implementation permission. [Detailed capability matrix](PRODUCT_UX_INVENTORY.md).

## 2. Behavioral profiles and jobs to be done

Frequency estimates describe a role during active use, not population statistics. No interviews/analytics were performed; validate the recommendations through owner review and later task-based evaluation. Importance and risk can outweigh frequency.

### Patient

**Primary goals:** find an appropriate clinician using public facts; book/manage a visit; understand its outcome and any medication/follow-up; control the explicit care relationship and see only permitted own information.

**JTBD:** “When I need care, I need to compare clinicians, clinics and available times, so I can choose and book a suitable visit.” “When my visit changes or ends, I need to know its status and what was actually shared with me, so I can take the next step.” “When medication is prescribed, I need the clinician's exact instructions and truthful fulfillment status, so I do not confuse a prescription with medicine already supplied.” “When follow-up is recommended, I need to distinguish the instruction from a confirmed appointment, so I know whether I still need to book.”

**High-frequency tasks:** check appointment/current next action, reread shared instructions and existing bookings during an episode. **High-importance:** find/book care, recognize confirmation/change, understand released outcome and follow-up. **High-risk:** wrong clinician/date/time, confusing draft with released advice, misunderstanding medication validity/dispensing or who has clinical access.

**Immediately needed:** own identity/context; next relevant appointment's clinician, clinic, local date/time with declared clinic timezone, confirmed/current status and eligible action; released summary/instructions and follow-up recommendation where available; for a medication task, exact signed item/instructions/quantity/unit/validity and current route/dispense/correction state. Do not present all of these simultaneously regardless of task. No draft/private counts, unavailable future results or global care-complete indicator.

**On demand:** permitted prior appointments, released versions/corrections, source clinician/date, detailed own prescription history and relationship provenance; bounded existing BP/legacy record where relevant. Integrated timeline is future, not a reason to hide currently available source histories.

**Common uncertainty:** before booking—“Is this time still available, and where is the clinic?”; after submit—“Did it book?”; before consultation—“Does booking give the doctor access?”; afterward—“Was anything shared, and do I need to book again?”; medication—“Sent, accepted, or actually dispensed?”; future result—“Is it final/current?”

**Decision burden:** system displays authoritative eligibility/state, filters unavailable choices and preserves the last confirmed outcome. Patient chooses clinician/time, explicitly authorizes/ends their relationship and chooses to book. System does not select treatment, infer adherence, promise stock or auto-book a recommendation.

**Failure sensitivity:** repeated explanatory text is inconvenient; wrong-person context, leaking private records, false booking confirmation, medication instructions/validity errors or false “follow-up complete” claims are clinically/privacy significant.

### Clinician

**Primary goals:** understand today's workload; open the correct eligible consultation; retain relevant context while documenting; make and communicate human clinical decisions; review and close deliberately.

**JTBD:** “When I start my working day, I need my schedule and each appointment's state, so I can act on the right visit.” “When I consult, I need the correct patient, current authority and relevant clinical context, so I can document and decide safely.” “When I share an outcome, I need to review exactly what the patient will receive, so private notes remain private.” “When I finish, I need to see saved, signed, released and pending work separately, so I can close knowingly without unintended release.”

**High-frequency:** schedule/context review, documentation, explicit summary/follow-up release and close. **High-importance:** availability, relationship acceptance, safe prescribing and fulfillment context. **High-risk:** wrong patient, unauthorized access, treating unknown allergies as negative, releasing private content, incorrect prescription/validity, accidental close/sign/release or unsafe retries.

**Must remain available during consultation:** correct patient and visit/clinic identity; current consultation/access state; the document being edited and private-versus-patient-visible boundary; unsaved/saved/signed/released status; complaint/findings and explicit allergy review uncertainty; relevant permitted released history; consequential action's exact target and effect. For prescribing, exact medication/quantity/unit/instructions/validity and prior dispensing needed for reconciliation. This is a context requirement, not a sticky strip, split-pane or layout decision.

**Progressively disclosed/on demand:** older permitted released history, detailed version/addendum provenance, route/dispense correction history, other task-irrelevant past visits and operational metadata. Never hide an allergy-review uncertainty, wrong-patient context or release target merely to reduce clutter. Another clinician's private notes are never progressive disclosure: they are inaccessible.

**Common uncertainty:** “Can I open this appointment?”; “Has the patient authorized and have I accepted?”; “Which draft/version is saved?”; “Will signing this share it?”; “Was the previous prescription dispensed?”; “Does close publish anything?”; “Was the timed-out operation committed?”

**Decision burden:** system resolves authority/time/state, exposes known source context and validates bounds; clinician determines findings, diagnosis, treatment, explicit validity, whether to prescribe/order diagnostics, follow-up and release/close. No inferred diagnoses, dosage, required medical interval, auto-release or automated clinical readiness judgment.

**Failure sensitivity:** extra navigation is inconvenient; fragmented identity, lost draft meaning, private disclosure or duplicate/incorrect clinical mutation is significant. Reduce task fragmentation without weakening independent confirmations.

### Pharmacy Staff

**Primary goals:** work the current organization's exact routed prescriptions; accept responsibility explicitly; fulfill each eligible item once; correct erroneous recording transparently.

**JTBD:** “When a prescription is routed to my pharmacy, I need the exact authorized items and source eligibility, so I can decide whether to accept and carry out the work.” “When I dispense, I need to confirm the exact item and full prescribed quantity, so I record the supply accurately once.” “When a recorded dispense is wrong, I need a reasoned correction or reversal with retained history, so later readers understand what happened.”

**High-frequency:** eligible queue/detail, acceptance, item dispensing. **High-importance:** distinguish pending versus accepted responsibility, remaining work versus completion/history. **High-risk:** wrong item/patient, expired/cancelled source, duplicate supply record, interpreting reversal as renewed entitlement.

**Immediately needed:** current pharmacy scope; exact route, permitted minimum patient/source identity during fulfillment, routed item identity/quantity/unit/instructions, source validity/eligibility, acceptance and individual item fulfillment states, permitted action. Acceptance may precede validity; dispensing cannot. No stock/“ready to collect” fact is available.

**On demand:** bounded own-route dispense/correction history and attributable actor/time. History purpose for completed/cancelled/replaced/expired accepted artifacts is reduced: actual dispense/correction data only, no patient display name or source instructions. No unrelated routes, general patient profile/clinical record, consultation, private note or other provider's work.

**Common uncertainty:** “Is this assigned to this pharmacy?”; “Have we accepted?”; “May this item be dispensed now?”; “Is another item still pending?”; “Did the previous submit succeed?”; “Does reversal permit dispensing again?” (No.)

**Decision burden:** system filters current authority, eligibility and already-dispensed items and reports committed facts; staff explicitly accepts, records actual full-item supply and selects a justified correction/reversal. Staff does not alter prescription instructions/quantity, substitute, accumulate partial quantities or choose a new destination after acceptance.

**Failure sensitivity:** queue friction is inconvenient; widening patient access, duplicate recording or false renewed entitlement is clinically/privacy significant. Membership alone is insufficient authority, even if the user previously accepted this work.

### Laboratory Staff — FUTURE

**Primary goals:** identify authorized assigned diagnostic work, perform it, record and explicitly verify/finalize results, and amend/retract transparently.

**JTBD:** “When my lab receives an authorized order, I need its exact tests and permitted context, so I can accept or reasonedly reject the work.” “When results are entered, I need to verify the intended result before finalizing, so patient and authorized clinician receive a truthful final.” “When a final result is wrong, I need an attributable amendment or retraction, so the effective result is unambiguous.”

**High-frequency assumptions:** assigned orders, accepted work, draft entry and finalization. **High-importance:** meaningful work progress and correct final-result visibility. **High-risk:** wrong patient/order, draft leakage, false finalization, stale amended/retracted result. These are future-role hypotheses, not observed laboratory usage.

**Immediately needed, within future artifact scope:** current lab/role authority, exact order/tests and minimum permitted identity, acceptance/cancellation/rejection state, draft versus verified final state and eligible next action. **On demand:** permitted order/result versions and actual entry/verifier/correction provenance; no general patient record.

**Common uncertainty:** “Which lab is responsible?”; “Is work accepted or stopped?”; “Is this still a draft?”; “Who verified it?”; “Which version is current?”; “Has the patient been allowed to see it?”

**Decision burden:** system enforces current authority/state and identifies the current version; staff performs/records work, decides acceptance/rejection and explicitly verifies/finalizes. Accepted future policy allows the same person to enter and finalize with truthful provenance; no added second-verifier or doctor-release queue. System does not interpret values or invent alerts/diagnoses.

**Failure sensitivity:** finding an older order slowly is inconvenient; wrong-order finalization, draft disclosure, or treating retracted results as current is significant. Sample/barcode workflow, LIS integration, turnaround promises and additional backend states are **not frozen by Stage 2**. Accepted I3 policy remains binding when later implementation is authorized.

### Admin

**Primary goals:** maintain valid operational users, organizations, compatible memberships, directory publication and bounded configuration; understand permitted operational failure without opening clinical content.

**JTBD:** “When legitimate operational access changes, I need to update the correct account/organization/membership scope, so the right staff can work under current authority.” “When a clinic's scheduling or directory setup is unavailable, I need permitted operational state, so I can correct configuration without inspecting patient care.”

**High-frequency assumption:** inspect operational exceptions and membership/status context. **High-importance:** correct organization/user/role, publication and configuration state. **High-risk:** suspending the wrong scope, granting incompatible membership, implying an ADMIN override of clinical privacy. Administrative work is not automatically low priority because it is infrequent.

**Immediately needed:** exact operational entity, role/kind, current status/version, intended scope/effect and permitted action; no patient-related payload or clinical counts. **On demand:** allowed operational change provenance, bounded configuration and safe technical health signals if exposed by a separately authorized interface. Generic clinical/audit browsing and research clinical datasets are not implied.

**Common uncertainty:** “Which organization does this affect?”; “Is the account active but membership ended?”; “Will changing directory publication affect clinical authority?”; “Why can I not inspect a patient record?”; “Is this Demo or a working management capability?”

**Decision burden:** system validates role/kind and current operational permission and shows authoritative effects; administrator makes legitimate provisioning/status/configuration decisions. No manufactured patient consent, assignment creation shortcut, impersonation, sign/release, dispense, result finalization or break-glass access.

**Failure sensitivity:** a stale operational overview is inconvenient; wrong revocation/grant or apparent access to clinical information is significant. Internal services exist for bounded operations; a full Live Admin interface/monitoring system is not implemented by the Demo shell.

## 3. Task priorities — recommendations for review

**P0:** core journey, must be straightforward and safe. **P1:** important recurring or consequential supporting task. **P2:** useful secondary task. **P3:** infrequent/later task with lower immediate journey value. “Effortless” removes avoidable cognitive work; it never removes explicit authorization, review or clinically consequential confirmation.

Frequency and risk use **HIGH / MEDIUM / LOW**. Risk rates misunderstanding or failed execution, including privacy and continuity consequences. These are relative qualitative estimates. Future tasks can be P0 within their future journey without becoming current implementation scope. P0/P1 here are UX priorities, not the foundation-defect severity scale. IDs connect tasks to [journeys](USER_JOURNEYS.md).

### Patient task inventory

| ID | Task | Priority | Frequency | Risk | Capability / reason |
| --- | --- | --- | --- | --- | --- |
| P01 | Enter own care: register/login and recover an expired session | P0 | MEDIUM | HIGH | CURRENT backend; registration frontend gap. Own identity is a prerequisite, no invented password recovery service |
| P02 | Find/select clinician and inspect clinic/available times | P0 | MEDIUM | MEDIUM | CURRENT; care entry, no automated clinical recommendation |
| P03 | Review and book exact appointment | P0 | MEDIUM | MEDIUM | CURRENT; trustworthy confirmation/timezone |
| P04 | Check appointment status, location/time and next action | P0 | HIGH | HIGH | CURRENT; act on confirmed state, not stale success |
| P05 | Understand released outcome, instructions and follow-up | P0 | HIGH | HIGH | CURRENT; close does not guarantee shared content |
| P06 | Understand signed prescription and exact fulfillment status | P0 | MEDIUM | HIGH | CURRENT backend; Live UI gap. Signed/routed/accepted/dispensed remain distinct |
| P07 | Cancel/reschedule an eligible booking | P1 | LOW | MEDIUM | CURRENT; avoid losing original on failed change |
| P08 | Authorize/withdraw/end own care relationship | P1 | LOW | HIGH | CURRENT backend; Live UI gap. Explicit prerequisite when a clinical grant is missing |
| P09 | Book a recommended follow-up | P1 | MEDIUM | HIGH | CURRENT booking + intent; booking and clinician link remain separate |
| P10 | Review own permitted history, corrections and profile | P2 | MEDIUM | MEDIUM | CURRENT bounded sources; no complete I4 claim |
| P11 | Read verified final result and its correction status | P0 | MEDIUM | HIGH | FUTURE Lab; no draft exposure |
| P12 | Review integrated longitudinal history / in-app updates | P2 | MEDIUM | MEDIUM | FUTURE I4; source records already exist separately |
| P13 | Review explainable research-related care status | P3 | LOW | HIGH | FUTURE EACCE; no treatment/adherence inference |

### Clinician task inventory

| ID | Task | Priority | Frequency | Risk | Capability / reason |
| --- | --- | --- | --- | --- | --- |
| C01 | See today's schedule and correct next visit | P0 | HIGH | MEDIUM | CURRENT logistics; no pre-relationship clinical content |
| C02 | Verify patient/context/current authority and begin consultation | P0 | HIGH | HIGH | CURRENT; exact booked clinician, active relationship and clinic scope |
| C03 | Review relevant information; document findings and allergy uncertainty safely | P0 | HIGH | HIGH | CURRENT; saved/private/released meanings stay explicit |
| C04 | Review and explicitly release patient summary/instructions | P0 | HIGH | HIGH | CURRENT; independent of private-note signing/close |
| C05 | Create/review/sign prescription when clinically needed | P0 | HIGH | HIGH | CURRENT backend; Live UI gap. No requirement to prescribe at every visit |
| C06 | Define/release follow-up when needed, then review/close visit | P0 | HIGH | HIGH | CURRENT; optional follow-up, separate explicit release and close |
| C07 | Publish/withdraw finite availability; manage eligible logistics/attendance | P1 | MEDIUM | MEDIUM | CURRENT; no recurring scheduler, do not infer attendance from time |
| C08 | Accept/decline relationship and end own assignment | P1 | MEDIUM | HIGH | CURRENT backend; Live UI gap. Required before C02 if grant absent |
| C09 | Route selected signed items; withdraw/reroute before acceptance | P1 | HIGH | HIGH | CURRENT backend; explicit source-author action; essential handoff when pharmacy fulfillment is selected |
| C10 | Correct/cancel/replace signed source after reviewing prior dispensing | P1 | LOW | HIGH | CURRENT backend; preserve history/validity and new routing requirement |
| C11 | Add/correct/restrict documentation or follow-up; link valid same-patient booking | P1 | MEDIUM | HIGH | CURRENT; restrictions are source-specific, no automatic cross-module repair |
| C12 | Inspect older permitted released context/version history | P2 | MEDIUM | MEDIUM | CURRENT bounded source reads; other authors' private notes excluded |
| C13 | Order diagnostics and review current verified results | P0 | MEDIUM | HIGH | FUTURE Lab; human clinical choice, not an automatic visit step |
| C14 | Review integrated continuity / later explainable assessment | P3 | LOW | HIGH | FUTURE I4/EACCE; no closure inference from operations |

### Pharmacy Staff task inventory

| ID | Task | Priority | Frequency | Risk | Capability / reason |
| --- | --- | --- | --- | --- | --- |
| F01 | Identify exact assigned pending/accepted work in current pharmacy | P0 | HIGH | HIGH | CURRENT backend; Live UI gap, filter before counts |
| F02 | Inspect source/items/validity and explicitly accept | P0 | HIGH | HIGH | CURRENT backend; acceptance is not dispense |
| F03 | Verify exact item and record full-item dispense | P0 | HIGH | HIGH | CURRENT backend; one immutable fact per source item |
| F04 | Reconcile success/uncertain outcome and remaining items | P0 | HIGH | HIGH | CURRENT backend; explicit identical-command recovery, no duplicate fact |
| F05 | Append reasoned correction/reversal | P1 | LOW | HIGH | CURRENT backend; reversal never renews entitlement |
| F06 | Review permitted completed/exception history | P1 | MEDIUM | HIGH | CURRENT backend; reduced history purpose, current authority |
| F07 | Inspect own operational context / seek legitimate access resolution | P2 | LOW | MEDIUM | CURRENT authority facts; no self-grant or new support-ticket subsystem |

### Laboratory Staff task inventory — all FUTURE

| ID | Task | Priority | Frequency | Risk | Reason / boundary |
| --- | --- | --- | --- | --- | --- |
| L01 | Inspect exact assigned order/current responsibility | P0 | HIGH | HIGH | Current artifact/org/membership checks when implemented |
| L02 | Accept or reasonedly reject authorized order | P0 | HIGH | HIGH | No automatic responsibility transfer |
| L03 | Perform work and enter/review draft result | P0 | HIGH | HIGH | Work execution is human; draft remains private to permitted scope |
| L04 | Explicitly verify/finalize and make final result available | P0 | HIGH | HIGH | No invented mandatory second verifier/doctor release |
| L05 | Amend/retract erroneous final result | P1 | LOW | HIGH | Effective version and retained history clear |
| L06 | Review bounded completed/cancelled/rejected order history | P1 | MEDIUM | HIGH | History is not permission for new fulfillment |
| L07 | Review permitted operational context | P2 | LOW | MEDIUM | No general patient browser, LIS or inventory system |

### Admin task inventory

| ID | Task | Priority | Frequency | Risk | Capability / reason |
| --- | --- | --- | --- | --- | --- |
| A01 | Identify exact operational user/org/membership and resolve legitimate access scope | P0 | MEDIUM | HIGH | CURRENT bounded services; Live UI gap. Core Admin job, not a clinical-access shortcut |
| A02 | Manage compatible membership / account / organization status | P1 | MEDIUM | HIGH | CURRENT bounded operational foundation; expose only supported operations in later UI |
| A03 | Maintain approved public directory/catalog state and clinic configuration | P1 | MEDIUM | MEDIUM | CURRENT bounded services/API where present; no clinical recommendation or grant |
| A04 | Review permitted operational provenance and configuration | P2 | LOW | MEDIUM | CURRENT bounded internal scope; not broad audit/clinical browsing |
| A05 | Inspect safe service-health/operational exceptions in a product workspace | P2 | MEDIUM | MEDIUM | FUTURE UI/exposure decision; no asserted full Live monitoring product |
| A06 | Administer separately authorized synthetic research/demo runs | P3 | LOW | HIGH | FUTURE research workflow; ground truth isolated, no clinical authority implied |

Priority rationale: Patient P0s complete entry → choice → booking → understandable outcome; Clinician P0s support today's actual consultation; Pharmacy P0s protect the exact assigned item through committed fulfillment. Relationship/routing/correction P1s remain critical prerequisites or safety exceptions where applicable. No P0 task maps automatically to a navigation tab. No new medical requirement or mandatory artifact is created by these rankings.

## 4. Ten Product UX principles

The inherited safety clauses below are binding accepted foundations. Their experience framing is a Stage 2 recommendation; evidence and status are in [the decision register](UX_DECISION_REGISTER.md).

| ID | Principle | Project-specific behavioral rule / later evaluation |
| --- | --- | --- |
| U01 | Human intention first, clinical meaning intact | A patient can explain their next care task without “entity,” “artifact” or package names. Preserve exact medication quantity/unit, human instructions and meaningful status distinctions; simplification never changes the clinical fact |
| U02 | Make current state and next responsibility clear | For a booking, release or routed item, answer what happened, what is current and who can act next. Separate awaiting clinician acceptance from booked care, pharmacy acceptance from dispense, and closed visit from released advice |
| U03 | Organize around complete tasks | Discovery→booking and consultation→documentation→review should retain context. A backend boundary need not become a user navigation boundary; no new final tab/page grouping is chosen here |
| U04 | Disclose detail progressively, retain safety context | Show role/task-relevant identity, uncertainty, current source/eligibility and action consequence before optional provenance/history. A clinician's patient context and allergy-review uncertainty cannot vanish into secondary detail; private data is excluded, not merely collapsed |
| U05 | Connect care without broadening access | Link permitted sources and handoffs conceptually while rechecking each role's authority. Patient continuity does not give pharmacy a patient browser or Admin a clinical console; future I4 preserves the same boundaries |
| U06 | Consequential clinical actions stay deliberate | Open, sign, release, route, accept, dispense, correct/reverse, future finalize and close each have their own truthful target/effect. No gesture, bundled “finish all,” auto-release or automatic clinical mutation retry replaces that decision |
| U07 | Be honest about uncertainty and evidence | Unknown/not-reviewed is not no-known; timeout is not success; absent release is not absence of illness. Server-owned state/time and preserved history outrank optimistic presentation. Page-limited evidence is not a complete readiness assessment |
| U08 | One source of operational truth, visible correction history | Booking, recommendation, source validity, fulfillment and actual use are different. Failed reschedule preserves original; reversal preserves the original dispense and consumes its entitlement; no silent overwrites, duplicate editable bookings or inferred care completion |
| U09 | Arabic and English support the same task equally | Author system content for natural Arabic/RTL and English parity, including statuses/errors/dates/timezones. Missing translations cannot silently become English. Personal UI should not unnecessarily address the person as “المريض”; preserve human-authored clinical text and approved medication/proper-name exceptions |
| U10 | Protect attention and trust through relevance | Prefer information that changes a decision or explains a next step over repeated reassurance, counts and generic feature promotion. Calm means understandable workload and honest feedback, not a selected color/font/card style. Clearly identify Demo, unsupported and future scope |

## 5. Safety, privacy and feedback constraints

| Situation | Required behavior | Never infer or expose |
| --- | --- | --- |
| Booking before clinical relationship | Logistics only; patient authorization + designated clinician acceptance separately establish current grant | Complaint/history, implicit consent, ADMIN-created assignment or permanent author access |
| Consultation context | Exact current patient/visit, treating clinician and clinic scope; human findings and explicit allergy uncertainty | Diagnosis/allergy/clinical eligibility from absence, demographics or booking |
| Save/sign/release/close | State exact saved version and audience; private-note signing, summary release, follow-up release, prescription signing and close independent | Auto-save, auto-share, all-care-complete, mandatory release as a new backend close precondition |
| Prescription and fulfillment | Human instructions/quantity/unit/validity; route/accept/dispense separate; exact full-item fact and correction flag/history | Substitution, partial/refill, stock/readiness, actual use/adherence or entitlement renewed by reversal |
| Fulfillment access | Current exact artifact + active user/session/organization/membership; purpose-appropriate minimal projection | General patient profile/clinical history, private notes, unrelated routes, pharmacy history patient name/instructions where excluded |
| Revocation/privacy | Reauthorize reads/writes/replay; safe unavailable state, suppress forbidden payload/references/counts | Details explaining a hidden patient's record existence, stale context or “admin override” |
| Errors and retry | Distinguish validation, conflict, expired session, unavailable and uncertain commit using privacy-safe feedback. Existing I2/I3 uncertain commands require explicit identical-command recovery | Automatic clinical mutation retry, duplicate new keys, logging medical payload/secrets or assuming legacy endpoints are idempotent |
| Future Lab | Explicit verified final, draft hidden, correction/retraction distinct; current authority for later access | Mandatory doctor-release queue, mandatory second verifier, inferred normality or completed care |
| Admin operations | Exact operational target/effect and supported configuration only | Clinical payload/forensic audit, impersonation, sign/dispense/finalize/break-glass authority |

Loading is not empty; unavailable is not no records; current access denial is not evidence of a specific hidden condition. Success feedback should name the actual completed action and surviving next responsibility. Later design must support readable semantic status, keyboard/assistive interaction, focus recovery and equivalent EN/AR task comprehension; Stage 2 chooses no component, dimensions or appearance.

## 6. Product hierarchy and Stage 3 requirements

Future information decisions follow this order:

1. **User goal:** what outcome the person needs now.
2. **Critical task:** what must be done to advance that outcome safely.
3. **Required information:** what that task needs, scoped to current authority.
4. **Required action:** what this actor may deliberately do.
5. **Status / feedback:** what is confirmed, pending, uncertain or stopped, and who acts next.
6. **Secondary detail:** relevant history/provenance/less frequent choices on demand.
7. **System/internal metadata:** only when it serves a legitimate task; never the dominant mental model.

Stage 3 must test grouping by intent and episode, contextual continuation after booking/consultation, differentiation of patient versus clinician workload, queue versus bounded history for pharmacy/future lab, operational isolation for Admin, and discoverable entry/relationship prerequisites. It must account for current versus future capability, empty/error/authority-loss states, mobile task continuity, Arabic/RTL and access-safe contextual links. It must decide how the user finds the next task without needing to know module structure.

**Deferred to Stage 3:** exact sidebar/bottom navigation, navigation labels, sitemap, final page hierarchy, grouping and cross-surface routes. These task IDs are not navigation items. No wireframe, layout or final interaction mechanism is approved here.

**Deferred to Content System + Arabic UX:** final glossary, personal/workspace address, Doctor/Clinician choice, signed/released/closed and pharmacy/result status vocabulary, EN/AR microcopy, date/number/timezone presentation and approved language exceptions. Examples in this package illustrate meaning, not approved final strings.

**Deferred to Brand / Design:** logo, colors, typography/fonts, radii, shadows, card choices, icons, illustration, visual language, component appearance and final page layout; three future distinct visual/brand directions, owner selection, Design System V2 and approved prototypes follow charter gates. No frontend implementation starts from this foundation alone.

## 7. Anti-patterns to avoid

“Observed” refers to [source/screenshot inspection](PRODUCT_UX_INVENTORY.md), not measured task failure. “Anticipated” is a risk to test later, not an accusation that current code violates policy. No visual solution is chosen here.

| Anti-pattern | Evidence level | Why it matters / required alternative behavior |
| --- | --- | --- |
| Cards everywhere / equal emphasis for unrelated content | Observed V1 repeated card sections | Critical task information must outrank supporting information; do not infer a ban or a new card design |
| Dashboard as feature dumping | Observed multiple home entry/explanation sections; anticipated expansion | Home content must serve current task/state, not advertise every backend capability |
| Backend/domain terminology exposed unnecessarily | Observed “Artifact-scoped workspace,” synthetic IDs; anticipated entity/module headings | Explain assigned work and permitted actions in human terms; preserve technical IDs only for a real need |
| Role names as awkward personal labels | Observed Patient portal/workspace and synthetic role-based names | Personal self-service should address the person appropriately; role identifiers remain useful for operational context where needed |
| English leakage in Arabic | Observed fallback-to-key and unwrapped English operations strings; date helpers default to English | Full authored-content parity and locale-aware status/date handling; exact vocabulary deferred |
| Excessive clinical detail for Patient | Anticipated if backend payload drives display | Show released outcome/instructions and useful source context; exclude private/draft content rather than just hiding it |
| Insufficient context for Clinician | Anticipated during fragmented/paginated tasks; current identity strip is a strength | Keep patient, visit, document purpose and uncertainty available while acting; do not replace clinical work with generic metrics |
| Repeated navigation to finish one task | Observed schedule/open/documentation links; anticipated fragmentation as I3 is integrated | Retain meaningful task context across stages; no screen count or layout imposed |
| Hiding or flattening status | Anticipated if Demo progress is reused; explicit current close states are a strength | Keep source, workflow, fulfillment, release and correction meanings distinct |
| Unclear next action | Observed closed-visit next step routes through appointment while released content is elsewhere | Prioritize the actual permitted next responsibility, including truthful no-action/awaiting states; exact entry route deferred |
| Unavailable future functionality presented as Live | Demo Lab/prescription surfaces observed; Live hides some unsupported links | Preserve explicit mode/capability truth; no fictional result, successful mutation or fallback |
| Admin implying clinical access | Anticipated; current Admin Demo explicitly denies it | Keep operational and clinical authority separate in task descriptions and later affordances |
| Decorative metrics without useful decisions | Observed Demo organization/role/inbox counts | A count must help choose work and remain scoped; no vanity care-completion/accuracy score |
| Duplicated information across sections | Observed next/recent visit and overlapping released/privacy messages | Prefer one clear factual interpretation and useful continuation; no duplicated stale status |
| Conflating fulfillment and clinical meaning | Observed Demo preparation language; anticipated reuse | Accepted ≠ ready stock, dispensed ≠ taken, reversal ≠ refill, final result ≠ clinician reviewed |
| One “complete care” action | Anticipated | Independent human decisions/release boundaries cannot collapse into automatic signing, ordering, booking or closure |

## 8. Review and approval gate

[Decision register](UX_DECISION_REGISTER.md) identifies inherited approved foundations, proposed foundation candidates, recommendations, material owner decisions and deferred work. Owner review must accept/revise role goals, P0/P1 priorities and journey emphasis before a separately bounded Stage 3 authorization. Technical Green is not Product UX approval. Codex may document and validate this proposal; it may not choose or implement the final UI from it.
