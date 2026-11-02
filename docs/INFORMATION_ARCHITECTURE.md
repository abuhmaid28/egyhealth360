# Stage 3 — Information Architecture proposal

CURRENT AUTHORITATIVE **proposal**, not owner-approved navigation or an implementation specification. Authority: [Issue #72, Stage 3 authorization 6565633586](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565633586). Inspection/branch base: `248347f72a7c1d4646cbceb7224f0ec1a9d92f06`. [Stage 2 acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565530772) accepts UXD10–UXD16 and the role/task/journey foundation; UXD19 is planning direction only. Old pending-acceptance wording in the Stage 2 delivery package describes its adoption-time state, not a reopened gate.

Read this document → [five sitemaps](IA_SITEMAPS.md) → [decision register](IA_DECISION_REGISTER.md) → [validation](IA_VALIDATION.md). The sitemaps use stable review IDs, **not proposed URL paths or component names**. All English labels are semantic working labels; no final Arabic/English vocabulary, visual layout, navigation component, route refactor or runtime change is selected. Material choices require independent review and explicit owner acceptance.

## 1. Evidence and current IA audit

Read order followed: AGENTS → current issue/comment and supersession check → CURRENT_STATUS → charter/source index → UX_FOUNDATION → USER_JOURNEYS → UX_DECISION_REGISTER → PRODUCT_UX_INVENTORY → PRODUCT → only relevant I1/I2/I3 authority/fulfillment contracts → V1 implementation. The accepted Stage 2 mental models are the design inputs; V1 routes only establish friction and existing entry points.

### V1 route and view evidence

The [catch-all entry](../apps/web/app/[[...path]]/page.tsx) dispatches through [Application](../apps/web/src/components/application.tsx), [Patient](../apps/web/src/components/patient.tsx), [Doctor](../apps/web/src/components/doctor.tsx) and [Operations](../apps/web/src/components/operations.tsx). This is implementation history, not a required final hierarchy.

| V1 route/view family | Existing grouping and exposure | IA implication |
| --- | --- | --- |
| Entry/login, `/patient`, `/doctor`, `/pharmacy`, `/laboratory`, `/admin` | Role homes; explicit Demo/Live; Demo role choice does not select Live authority | Keep mode and actual scope intelligible; separate account entry from workspace authorization |
| `/patient/discover`, `/patient/doctors/:id`, `/patient/clinics/:id` | Live public discovery/profile/availability; nested selection and booking | Preserve one find-care task with selected clinician/clinic/time continuity |
| `/patient/appointments[/:id]` | Live own booking list/detail/logistics and change | Keep exact appointment detail; cancellation/reschedule stay inside it |
| `/patient/summaries`, `/patient/follow-up` | Separate Live released-source readers, summaries appended to main navigation | Merge retrieval under one care home; expose exact outcome/follow-up context without making each module global |
| `/patient/record`, `/patient/history` | Same record family with history selection; bounded legacy Live reads | One bounded history purpose, explicitly incomplete; avoid duplicate “record” and “history” destinations |
| `/patient/medications`, `/patient/laboratory` | Demo navigation entries removed from Live nav | Prescription domain CURRENT, Live integration gap; Lab FUTURE. Do not equate the two absences |
| `/doctor`, `/doctor/schedule`, `/doctor/appointments/:id` | Overview/Schedule share list implementation; distinct date/work and detail intentions | Single schedule home with Today as a scope; preserve appointment logistics before clinical grant |
| `/doctor/availability` | Current finite publication/withdrawal | Related secondary scheduling destination, not another clinical work mode |
| `/doctor/consultation/:bookingId[/documentation]` | Opening then document/follow-up/review controls within visit; global shell remains | Preserve sustained consultation with local task grouping and deliberate actions |
| `/doctor/summaries` | Live global released-summary reader | Revisit through authorized patient context, not an unscoped summary module |
| Staff inboxes and settings | Demo exact-looking work, unsupported Live commands | Replace synthetic progression conceptually with accepted exact work/history purpose |
| `/admin` plus organizations/users/directory/scheduling | Demo overview/metrics and operational lists/settings | Operational tasks only; management exposure is a dependency, not a Live console |
| Role settings routes | Patient own-profile integration; other surfaces partly explanatory | Shared account entry plus scoped operational settings, no self-grant |

### IA problem inventory

Classifications are proposals for product structure; REMOVE FROM PRIMARY IA never authorizes deleting data, routes or evidence. Source/screenshot inspection is qualitative, with no live usability experiment or newly executed browser proof.

| ID | Finding and evidence | Classification | Proposed disposition / test |
| --- | --- | --- | --- |
| E01 | Exact visit detail retains identity/time/status in Live booking | KEEP | Canonical appointment context, P04/P07; contextual actions, no cancel page |
| E02 | Patient main nav spans overview, discovery, appointments, record, follow-up, plus Live summaries; Demo adds medications/Lab | RESTRUCTURE | Two recurrent goals: My care and Find care. Source-specific access within My care; no feature-per-module primary IA |
| E03 | Live home repeats next visit in recent list plus journey/privacy/shared-care explanations; [home source](../apps/web/src/components/live-home.tsx) and [Arabic mobile BEFORE](ui-screenshots/doctor-demo/patient-dashboard-ar-390.png) | MERGE | Home owns orientation/next action, not copies of all source lists; one canonical object with references |
| E04 | Record and history are parallel labels for bounded source retrieval | MERGE | One bounded history index; distinguish available sources from future I4 integration |
| E05 | Follow-up and released summaries need separate global navigation in V1 | CONTEXTUALIZE | Released outcome contains recommendation and booking continuation; cross-visit index is secondary |
| E06 | Overview and My schedule render the same clinician list family | MERGE | Schedule is home; Today is a scope within it, not a duplicate primary destination |
| E07 | Clinician availability is global alongside daily clinical work | DEMOTE | Scheduling secondary entry with direct link from Schedule; preserve finite publication purpose |
| E08 | Schedule → booking detail → opening → documentation adds repeated orientation; [documentation BEFORE](ui-screenshots/doctor-demo/documentation-en-1440.png) retains useful patient context | RESTRUCTURE | Direct eligible work entry to consultation; logistics detail remains when needed; no mandatory intermediate page |
| E09 | Global clinician summaries separate retrieval from current patient context | CONTEXTUALIZE | Care relationships → authorized patient context → released source; recheck authority |
| E10 | Demo staff exposes artifact IDs and pharmacy preparation progress | REMOVE FROM PRIMARY IA | Assigned work/item facts are the mental model; technical identifiers on demand only for legitimate reconciliation; no readiness promise |
| E11 | Pharmacy single inbox obscures distinction between active work and reduced-purpose history | RESTRUCTURE | Assigned work primary, bounded history secondary; completed/stopped records never keep full fulfillment detail |
| E12 | Lab Demo looks functional although no backend exists | FUTURE | Lab sitemap is a future requirement; no Live destination/active result affordance |
| E13 | Admin overview cards/counts and scheduling settings have no proven working frontend management | REMOVE FROM PRIMARY IA | Enter People or Organizations; directory/settings secondary, capabilities gated by actual exposure |
| E14 | Missing relationship/registration integration can strand booking→consultation; absent summaries after close can look like dead ends | CONTEXTUALIZE | Explicit authorization/acceptance entry and safe return; no release available is a truthful outcome, not private draft counts |
| E15 | Responsive shell uses the same navigation list with a compact presentation (`application.tsx`, max-width 760px) | RESTRUCTURE | Reassess mobile primary set by task; preserve local consultation/work context rather than copy desktop lists |
| E16 | Same route structure serves both locales; catalog English fallback/direct operation strings risk unequal comprehension | KEEP | Keep equal task reachability; later Arabic authoring must independently validate grouping/status/return semantics, not translate English hierarchy mechanically |
| E17 | Demo includes clinical/operational surfaces missing in Live; [separate adapters](PRODUCT_UX_INVENTORY.md#existing-routeview-inventory--evidence-only-not-a-sitemap-proposal) | KEEP | Preserve explicit mode separation; no silent Demo fallback or active unsupported destination |
| E18 | Sign/release/follow-up/close already retain independent consequences | KEEP | Keep these deliberate within task context; navigation consolidation never bundles mutations |

## 2. IA principles and object/task model

| ID | Rule | Applied consequence |
| --- | --- | --- |
| I01 | Primary navigation serves recurring independently revisited goals | Every primary has Stage 2 task evidence and passes the destination test; an API/module does not qualify |
| I02 | Secondary navigation supports related lower-frequency retrieval or management | Bounded histories, availability and settings remain discoverable under a meaningful parent |
| I03 | Contextual actions act on the current object | Cancel, sign, route, accept, dispense, release and close have exact targets inside their context; no global action destinations |
| I04 | One object has one canonical detail context | Home, history and outcome may reference the same appointment/prescription; these are entries, not duplicate editable destinations |
| I05 | Progressive disclosure protects attention and privacy | History/provenance on demand; safety identity/uncertainty/consequences present while acting; unauthorized data is excluded |
| I06 | Preserve task continuity across source boundaries | Discovery→booking and consultation→document/prescribe/release/close stay in their respective task; no mandatory global page hopping |
| I07 | Orientation answers where, target, state and next responsibility | Workspace/scope, patient/visit or exact work item, source/work status and permitted next action remain intelligible, including after interruption |
| I08 | Scope and capability govern visibility before navigation | Current authority precedes payload/count/link disclosure; CURRENT domain ≠ integrated Live ≠ FUTURE. No navigation switch creates permission |
| I09 | Equivalent Arabic/English and mobile tasks, not copied navigation | Preserve goal, authority and depth semantics; validate natural Arabic grouping separately and reduce persistent mobile choices by task |

### Destination test

Evaluate recurring goal, independent revisit, unique information/actions, overload if nested, and meaning without backend knowledge. Five Y/N values below follow that order. Mostly N excludes a primary destination; a contextual detail can still be revisited directly. See [primary coverage](IA_VALIDATION.md#primary-destination-test).

### Product objects and their tasks

| User-understood concept | Canonical owner/context | Task and continuity rule |
| --- | --- | --- |
| Appointment | Patient My care / Clinician Schedule, actor-specific authorized projections | Time/location/status and eligible change; booking never creates clinical access |
| Released visit outcome | Patient My care → outcome; clinician consultation/patient context | Shared summary and independent recommendation/source references; no private material, no assumption every visit has an outcome |
| Follow-up recommendation | Exact released outcome with secondary cross-visit retrieval | Book through Find care; clinician explicitly links eligible same-patient booking; no auto-attachment or new booking authority |
| Prescription and supply status | Patient My care → prescription; clinician consultation → prescription | Signed source, validity, routing, per-item actual supply and correction distinct; one canonical detail per actor |
| Consultation | Clinician Schedule → sustained consultation | Review/context, documentation, prescription, follow-up, review/close; private versus patient-visible sources remain separate |
| Care relationship | Patient My care secondary / Clinician Care relationships | Explicit request/withdraw/end and acceptance/decline/end; current relationship grants only accepted module authority |
| Assigned prescription work | Pharmacy Assigned work → exact work detail | Accept then full-item recording; bounded actual facts/history after fulfillment purpose ends |
| Diagnostic order/result | FUTURE clinician consultation, Lab assigned work, Patient My care | Exact order and verified current final; draft excluded from patient/clinician projections |
| Operational person/organization/membership | Admin People / Organizations with exact operational details | Configure legitimate access without creating clinical assignment or clinical-content access |

An outcome is a **navigation association of permitted sources**, not a new aggregate medical record, backend entity, episode model or completeness signal. Where existing sources cannot establish a link, use a source-labelled list; do not infer the association. Dependencies are recorded below, not implemented.

## 3. Global architecture and cross-workspace navigation

Recommend **distinct authorized workspaces in one platform**, with a shared account/language/session layer. Reject a universal menu that mixes appointments, clinical authoring, dispensing, diagnostics and administration: these differ in authority and recurring responsibility. This is IA, not a service/framework split.

Authenticated entry resolves the actual role and current permitted scope. If a later authorized identity system legitimately exposes several roles/scopes, offer only server-verified eligible contexts; switching chooses a presentation context, never grants a role, assignment, organization or artifact. Current session contracts do not establish a general multi-role switcher: no such Live feature is claimed. A single eligible scope enters directly. A stale/revoked target returns a safe unavailable state and legitimate context selection only if available; do not expose hidden work/counts. Leave exact role/context selection mechanism to later design/technical authorization.

Within Pharmacy/future Lab, current organization is part of work context and every read/write rechecks exact membership/artifact authority. Clinician clinic context does not turn other providers' patients into browseable records. Admin membership work can restore operational eligibility, never create a clinical grant. Workspace switching must not carry a previous patient's clinical payload into another scope. Unsaved work, uncertain commands and confirmed committed results must be resolved or explicitly acknowledged before leaving; no implied save or automatic retry.

### Shared versus scoped destinations

| Concept | Placement / capability | Constraint |
| --- | --- | --- |
| Account/profile (`G1`) | CURRENT shared secondary entry | Own permitted identity/profile only; scoped professional/operational configuration remains under its workspace |
| Language | CURRENT shared preference/action | Same canonical target and task state if still authorized; localized labels do not make duplicate destinations |
| Workspace/organization context | Shared orientation, selection only when actually supported | Real authenticated scope; current broad multi-role/multi-org switching is a dependency, not a new entitlement |
| Sign out | CURRENT shared session action | Ends session; safe handling of unsaved/uncertain work, no clinical submission |
| Notifications/reminders | FUTURE, no active global inbox | No source exists for notification counts or delivery promises |
| Help/support | No new destination proposed | Existing contextual explanation is sufficient for scope; no supported service/ticket backend established |

### Handoff destinations and safe return

| Handoff | Sender context → receiver entry | What survives / what does not |
| --- | --- | --- |
| Patient request → clinician acceptance | P9 → C3 request scope → C4 | Minimum enrollment identity/state, not records before grant |
| Booking → visit | P4 → C1 → C2/C5 | Exact logistics; authority/opening separately checked |
| Released summary/follow-up → patient | C6/C8 → P5/P6; My care references them | Only explicit release; close is not a release event |
| Signed prescription → pharmacy | C7 → F1/F2 | Exact selected routed items; no general patient link |
| Supply/correction → care readers | F2/F4 → P7 or authorized C7 | Permitted source status/history; no adherence/readiness inference |
| Future diagnostics | C10 → L1/L2/L3 → P10/authorized C4 | FUTURE final/current version only; no private draft or mandatory doctor-release queue |
| Follow-up booking | P6 → P2/P3/P4; C8 explicit association | Confirmed appointment remains independent of recommendation; retain return to P6 with truthful link status |
| Operational access resolution | Workspace safe unavailable → supported Admin A1/A2 detail through legitimate operations | No patient payload in operational context; no assumed messaging/support channel |

Direct/deep entries use the same canonical context and current checks; missing, forbidden and restricted objects give privacy-safe unavailable feedback without references/counts. Back returns to the caller's authorized list/scope when retained safely, otherwise the workspace home. Session expiry uses G0 and revalidates the intended target after login; no stale clinical payload or clinical command auto-submission. Empty lists offer only relevant supported entry (e.g., Find care); errors/loading do not masquerade as empty history. One failed source does not hide appointment navigation.

## 4. Patient structural candidates

Both use the accepted “My care / what happens next” foundation. These are different grouping models, not different labels. Neither permits patient clinical authoring or private-note access.

**Candidate A — separate recurring care collections.** Primary: Home, Appointments, Find care, Shared care. Home orients; Appointments owns current/past booking logistics; Shared care groups summary/follow-up/prescription and future final results; a consultation outcome cross-links the two collections. Profile/relationships/history are secondary. A follow-up user leaves Shared care for Find care and returns through Appointments to reconcile the source recommendation. This favors independent lookup by familiar object purpose without putting every backend module in the main menu.

**Candidate B — care home with source-linked task contexts (recommended).** Primary: My care and Find care. My care owns current next steps and retrieval of existing appointments/outcomes/prescriptions through secondary lists; a selected item opens its canonical detail. Outcome → released recommendation → booking stays an explicit continuation. This does not invent episodes, a unified timeline or inferred completeness. Users can independently revisit a prescription through its secondary list without finding the old appointment first.

| Criterion | Candidate A | Candidate B |
| --- | --- | --- |
| Clarity | Familiar separate booking and shared-information collections; needs explanation of where post-visit work lives | One place for existing care, one to seek new care; internal source lists need clear purpose |
| Task completion | Independent booking retrieval is direct; follow-up/outcome crosses collections | Existing-care continuation in one home; explicit Find care transition only when booking |
| Scalability | Collections expand; pressure to add more primary categories | Add permitted source types below My care; risk of an overloaded care home must be controlled |
| Cognitive load | Four recurrent choices and two competing locations for one visit | Two recurrent choices; secondary retrieval must remain discoverable |
| Mobile fit | Four primary purposes compete during an active care task | Two stable primary purposes; exact task/context persists |
| Continuity | Cross-links repair logistics versus outcome separation | Canonical detail/source references carry next responsibility within My care |
| Future Lab/I4 | Results enter Shared care; integrated record could compete with it | Results join My care source retrieval; I4 later replaces bounded projection only with its own contract |
| Feature-dumping risk | New modules may become more primary entries | My care may become a feature grid unless immediate/conditional/on-demand rules are enforced |
| Implementation implications | Separate collections and source cross-links; still requires missing Live integrations | Care-home composition and cross-source linking need exposure/association validation; no new backend aggregate assumed |

**RECOMMENDED IA:** Candidate B. **ALTERNATIVE CONSIDERED:** Candidate A. **WHY RECOMMENDED:** follows P04/P05/P06 next-step continuity and UXD10/U03/U10 with fewer independent orientation demands. **TRADEOFFS:** secondary appointment/prescription retrieval must be explicit and testable; source association gaps cannot be hidden behind a “connected” promise. **OWNER DECISION REQUIRED:** choose B, A or a specified revision, including the two-primary grouping and history placement (IA02). No owner acceptance is claimed.

### Patient home responsibility

Immediately: own care context, current confirmed next responsibility and the relevant appointment or released source's state/next eligible action. If several care tasks coexist, keep distinct sources/responsibilities and allow selection; do not manufacture one clinical urgency rank. If no existing relevant task, offer Find care. Counts/private drafts are not proxies for missing advice.

Conditionally: an upcoming/changed appointment; missing relationship prerequisite; newly available released outcome/recommendation; a relevant prescription's validity/routing/actual supply/correction. These reference canonical contexts rather than duplicate their full content. Future final results may join only after authorized delivery. No “all care complete,” stock readiness or reminder feed.

On demand: all appointments, signed prescriptions, released outcomes/follow-ups, bounded source history/corrections and care relationships. Account/profile is shared secondary. No permanent feature grid, repeated privacy essay, identity/profile module or clinical metrics overview. See [Patient sitemap](IA_SITEMAPS.md#patient).

## 5. Clinician structural candidates

Both preserve “Today's work + sustained consultation context.” Neither turns document, prescription, follow-up or close into global modules. The alternative concerns how clinicians organize and revisit their work outside a consultation.

**Candidate A — work and visit archive.** Primary: Today, Schedule, Previous consultations. Today selects current workload/relationship prerequisites; Schedule independently owns dates/logistics/availability; Previous consultations retrieves past work by visit for aftercare/correction. Patient context is subordinate to the chosen visit. Relationship requests are secondary and also reachable from the blocked visit. Consultation local tasks stay together. This makes active work, planning and retrospective work independent destinations, but risks duplicated Today/Schedule purpose and makes ongoing non-visit relationship work harder to find.

**Candidate B — schedule and care relationships (recommended).** Primary: Schedule (Today is its initial scope) and Care relationships. Schedule owns dated work and contextual appointment/consultation entry. Care relationships owns minimal requests and currently authorized relationships, then exact permitted patient/source context for continuing care/corrections. Availability is secondary to Schedule. This is not a population/patient directory; ended/unauthorized relationships never provide clinical entry. No separate Today dashboard or global visit-summary archive.

| Criterion | Candidate A | Candidate B |
| --- | --- | --- |
| Clarity | Explicit daily, planning and retrospective purposes; Today and Schedule overlap | Dated work versus continuing authorized care; relationship label must communicate requests as well as ongoing care |
| Task completion | Fast return to a remembered previous visit; aftercare requires knowing which visit | Find patient through current authorized relationship, then exact source; daily visits remain direct |
| Scalability | Additional past source types pressure visit archive to become a record browser | Different source histories fit exact current patient context without widening authority |
| Cognitive load | Three work modes plus secondary relationship entry | Two work modes; date scopes and request/current relationship distinctions must be clear |
| Mobile fit | Today/Schedule duplication consumes recurrent choices | Two primary goals; consultation task context replaces global browsing during treatment |
| Continuity | Within-visit continuity strong; cross-visit history entered through a prior visit | Within-visit continuity plus permitted aftercare across sources; not an I4 timeline |
| Future Lab/I4 | Finals attach to visits; later longitudinal needs may require another destination | Future source results fit patient context; I4 remains a separately authorized evolution |
| Feature-dumping risk | Today may become metrics/cards and archive may mirror backend source modules | Patient context could bloat; constrain it to relevant permitted sources and on-demand history |
| Implementation implications | Requires retrospective visit retrieval and relationship secondary entry | Requires safe relationship/current-scope entry and source retrieval integration; no broad patient-search API assumed |

**RECOMMENDED IA:** Candidate B. **ALTERNATIVE CONSIDERED:** Candidate A. **WHY RECOMMENDED:** C01 daily work and C08/C10/C11 ongoing relationship/aftercare are different recurring goals; collapsing Today into Schedule removes duplication while preserving both. **TRADEOFFS:** ongoing care must be discoverable without implying a directory; the exact current relationship listing/exposure must support the chosen entry. If it cannot, record the limitation and seek a revised proposal, never bypass authority. **OWNER DECISION REQUIRED:** choose B, A or a specified revision and accept the secondary availability/local-consultation grouping (IA03).

### Consultation as a sustained context

Keep within the exact consultation: relevant permitted context and allergy uncertainty; findings; purpose-specific private-note and patient-summary documentation/history; optional prescription and its exact routing/dispense reconciliation; optional future diagnostics; follow-up recommendation/release/link; review and explicit close. These are **task/information groups**, not selected tabs, panes, sidebars, drawers, cards or screens. No mandatory sequence forces a prescription, diagnostic order or follow-up at every visit.

Always intelligible while acting: current patient, visit, clinician/clinic scope, consultation/access state, selected source purpose/audience, unsaved/saved/signed/released state, consequential target/effect and safety uncertainty. Review/close remains locally reachable from any task group and reports page-limited evidence honestly. Signing, releasing, routing and close each retain their own review and outcome; grouping never creates a bundled “finish all.”

Navigation away is justified for another dated visit, availability publication, relationship operations for another person, account/operational settings, or an independently selected previous patient's permitted context. Read relevant older history as a consultation continuation where possible; opening a different patient requires an explicit context change and current authorization. Unsaved work/uncertain submissions must remain understandable before leaving. Closed visits stay closed; subsequent exact-source correction/release/routing uses existing contracts without reopening or permanent author entitlement. See [Clinician sitemap](IA_SITEMAPS.md#clinician).

## 6. Pharmacy, future Lab and Admin architecture

**Pharmacy:** one primary Assigned work queue, scoped by current organization/exact routed work. Pending responsibility and accepted work with remaining items are queue scopes. Exact work detail holds acceptance, eligible full-item dispensing and explicit recovery. Dispense history is secondary, with a distinct reduced-purpose fact/correction context. Completion/source stop removes the fulfillment projection; no preserved patient name/instructions in history. Correction/reversal remains exact and reasoned; reversal never permits dispensing again. Operational scope/settings are secondary. No general patient directory, medical record or clinical timeline.

**Laboratory — FUTURE:** one primary Assigned diagnostics requirement; exact order context for responsibility/accept/reject; result entry/review and explicit verification/finalization inside that work; bounded completed/stopped history and authorized amendment/retraction; operational context secondary. No backend states/sample/barcode/LIS workflow invented. Same-person entry/finalization is allowed with truthful provenance. Patient/current authorized clinician sees permitted finals directly, never drafts or an invented doctor-release queue. Lab has no dependency on pharmacy completion. Its entire proposed workspace stays absent as an active Live service until separately authorized/delivered.

**Admin:** People and Organizations are primary recurring operational goals. Exact account, organization and membership details carry supported access/status actions. Directory configuration and permitted settings/provenance are secondary; service-health UI is FUTURE. Default entry is People, not a metrics dashboard. No clinical record browser, chart link, clinical override, impersonation, assignment-manufacture or break-glass. Existing internal services do not prove a full public API/UI; per-operation exposure remains a dependency. The [staff sitemaps](IA_SITEMAPS.md#pharmacy) record every destination's purpose/authority.

## 7. Desktop and mobile structural model

This specifies hierarchy and task availability, not placement, visual components, breakpoints or interaction appearance. A desktop secondary destination is still secondary even when easily visible. Mobile does not turn every available destination into persistent navigation. Direct authorized object entry stays possible on either device.

| Workspace | Desktop primary / secondary | Mobile primary / what may move to secondary access | Task context that must remain accessible |
| --- | --- | --- | --- |
| Patient | My care, Find care; history/shared outcomes/relationships and shared account secondary | Same two primary goals; all-appointment/prescription retrieval, shared outcomes and relationship management remain explicit secondary entries under My care | Selected clinician/clinic/time through booking; exact existing visit/outcome/medication state; next action and safe return, including after following a prescription source |
| Clinician | Schedule, Care relationships; availability and professional settings secondary; consultation local | Same two primary goals outside treatment; availability/settings/history stay secondary. During treatment the exact consultation and its local task groups take precedence; global navigation remains an intentional exit | Patient/visit/access/consultation state, source purpose/save/release state, safety uncertainty and local review/close; never require returning to a global menu to prescribe/release |
| Pharmacy | Assigned work primary; history and operational context secondary | Assigned work remains sole primary; accepted/pending/remaining scopes inside queue; history/settings via secondary entry | Exact work/item identity, source eligibility, responsibility, remaining items and committed/uncertain outcome; purpose transition to reduced history remains explicit |
| Lab — FUTURE | Assigned diagnostics primary; completed history/context secondary | Same future assigned goal; history/context secondary, no new mobile primary list for each work phase | Exact order, allowed context, draft versus current final, verification and correction target; no hidden finalization step |
| Admin | People, Organizations primary; directory/config/settings secondary | People/Organizations remain independently reachable primary goals; configuration/settings/service health (if later authorized) secondary | Exact account/org/membership/role, current state and intended operational effect; no quick clinical overrides |

Mobile may defer optional provenance/older history, never identity, uncertainty, source validity or the consequence of the current action. Source lists remain bounded/pageable and explicit when more history exists. EN/AR must support the same conceptual entry/detail/return path with natural grouping and task comprehension; RTL does not imply reversing clinical sequence, status meaning or chronological semantics. Later Arabic UX must test find-care versus existing-care distinction, request versus active relationship, and recommendation versus booked visit independently. No final translated labels or mirrored layout is specified here.

## 8. Dependencies and capability gaps

These are exposure/structure risks, not authorization to fix code or new backend-defect findings. CURRENT domain destinations are **proposed locations** until their actual API/Live integration is authorized and delivered. Do not show an active unsupported destination in Live, silently substitute Demo data, or use a disabled future menu to imply delivery. Existing supported source readers can remain the truthful V1 entry until later replacement approval; this docs sprint changes no UI.

| ID | Gap / evidence | Affected context | Required disposition before later delivery |
| --- | --- | --- | --- |
| D01 | Registration and bilateral relationships exist in backend but not complete Live adapter flow (inventory M01) | G0, P9, C3/C4, booking→consultation | Integrate both parties and safe return; verify current scoped listing before making Care relationships active. No role switch/assignment shortcut |
| D02 | Prescription/pharmacy domain current; Live integration/hosted I3 parity not established (M02) | P7, C7, F1–F4 | Authorized integration/deployment evidence separately; no Live pharmacy or medication promise from a sitemap |
| D03 | V1 source readers are separate; complete cross-source association/query composition not established | P1/P5/P6/P8/P11, C4 | Verify existing source identities/associations and bounded query support; use explicit source lists if association absent; no inferred episode, aggregate API or complete record |
| D04 | Bounded legacy record ≠ integrated longitudinal continuity (M04) | P8, C4 | State available sources/bounds; integrated I4 and notification/reminder systems remain FUTURE |
| D05 | Lab policy accepted, implementation absent; Demo transitions are not evidence (M05) | P10, C10, L1–L5 | Separate backend/result/history/authority implementation authorization before active Live navigation |
| D06 | Full Admin management exposure not established | A1–A7, C12, F5 | Inventory supported per-operation reads/mutations; keep unsupported management unavailable. Internal service existence ≠ a Live public API |
| D07 | Current session role contracts do not prove general multi-role/multi-org switching | Shared scope context | If needed later, separately validate supported identity/scope selection; no new generalized IAM rules |
| D08 | English fallback/direct strings/default locale risk; no usage research/analytics (M06/M07) | All workspace grouping and mobile retrieval | Content/Arabic stage and later task-based evaluation; do not claim tested discoverability, final vocabulary or empirical timing |
| D09 | No established product help service, notification inbox or service-health console | Shared/Admin | Do not add conventional destinations to fill a menu; future exposure decision required |

No new concrete P0/P1 foundation defect was established in this documentation/source audit. This is not a new runtime/security/deployment audit. Accepted health B and its limits remain; unresolved exposure gaps are visible rather than remediated here.

## 9. Owner decision package and deferred naming

| Material choice | Recommended IA | Alternative considered | Why / tradeoff | Owner decision required |
| --- | --- | --- | --- | --- |
| Platform model (IA01) | Separate authorized workspaces with shared account/session/language | Universal cross-role menu | Coherent responsibilities/authority; legitimate multi-context entry needs real server support | Accept workspace boundary and conditional multi-scope concept; no IAM grant |
| Patient (IA02) | Candidate B: My care + Find care; bounded history/shared-source retrieval secondary | Candidate A: Home/Appointments/Find care/Shared care | Next-step continuity and fewer competing destinations; secondary appointment/prescription discovery must be tested | Choose candidate/revision and history/retrieval placement |
| Clinician (IA03) | Candidate B: Schedule + Care relationships; sustained consultation local tasks | Candidate A: Today/Schedule/Previous consultations | Distinct dated versus ongoing care, less duplication; requests/current-authority entry is an integration dependency | Choose candidate/revision and consultation/availability hierarchy |
| Staff/Admin (IA04) | Exact assigned work + bounded secondary history; Admin People/Organizations | Separate primary entries per status/source; Admin overview | Work/authority aligned; history retrieval less persistent; internal Admin operation exposure incomplete | Accept queue/history and operational hierarchy |
| Responsive/visibility (IA05) | Compact recurring goal set; local task context; no active unsupported/future entry | Reuse every desktop nav item on mobile; future feature placeholders | Task continuity/honest delivery; secondary retrieval must stay discoverable | Accept structural desktop/mobile and capability-visibility rules |

Independent Stage 3 review and explicit owner acceptance are required before treating any of these recommendations as final. This is a complete reviewable proposal, so no interim approval questionnaire is needed. [Decision register](IA_DECISION_REGISTER.md) separates inherited foundation, recommendations, owner gates and future work.

Deferred to Content System + Arabic UX: final “My care,” “Find care,” “Care relationships,” “Available history,” clinician/doctor and account-address vocabulary; distinguish a recommendation from booking, signed from released, accepted from supplied, corrected from renewed entitlement, and final from clinician-reviewed. Clarify “history” as bounded sources, and make all-appointment/prescription retrieval discoverable naturally in Arabic and English. Authored clinical text and medication identities retain their proper semantics. Final glossary, exact translation/microcopy, dates/numbers/timezone conventions and language exceptions are not authored here.

No visual decisions were made. No content/Arabic stage, Brand, Design System, prototypes, frontend architecture/implementation, backend, Lab, I4/EACCE/research or deployment work begins from this package. Technical CI Green does not accept IA or authorize the next stage.
