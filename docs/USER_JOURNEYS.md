# User journeys and cross-role handoffs

CURRENT AUTHORITATIVE Stage 2 journey-analysis reference; proposed experience sequences remain **RECOMMENDATION** pending owner review. Existing policy constraints are inherited, not amended. Read [UX_FOUNDATION](UX_FOUNDATION.md) for roles/tasks and [UX_DECISION_REGISTER](UX_DECISION_REGISTER.md) for decisions. [CURRENT_STATUS](CURRENT_STATUS.md) governs delivery. No final navigation, page hierarchy, exact vocabulary, visual treatment or implementation is authorized here.

**CURRENT** means the domain capability is implemented. It does not mean that its V2 UI exists or that it is hosted. Prescription/pharmacy backend is current but Live UI integration/hosted parity is not established; registration and bilateral relationships also have Live frontend gaps. **FUTURE** means later explicit authorization is required; Lab, I4 and EACCE/research are not Live. [Evidence inventory](PRODUCT_UX_INVENTORY.md).

Each transition below names leaving → receiving actor, minimum information transferred, status to understand, and failure/recovery. A handoff means responsibility or permitted visibility, not an automatic push notification, new authority or new API. A same-person transition still requires retaining the right task context. Patient and clinician may act concurrently after release; fulfillment branches are optional and independent, not mandatory serial steps.

## J1. Patient appointment — CURRENT domain, partial Live entry integration

**Intent:** get appropriate care and know what to do afterward. **Tasks:** P01–P05, P07–P09; C01–C04/C06/C08. **Success:** exact confirmed booking, legitimate consultation and truthful released outcome/next action. Empty shared content is not proof of no clinical issue or completed care.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Need care → discover/select clinician | Patient → Patient | Public specialty, clinician/clinic identity and location | Exploring published choices; not receiving clinical triage | No suitable clinician/slot: explain absence and allow another eligible choice; do not fabricate suitability |
| Select → inspect clinician and clinic | Patient → Patient | Published professional/clinic facts, selected clinician context | Selection under consideration | Public identity is not a grant to records; distinguish clinician from clinic |
| Inspect → choose availability | Patient → Patient | Exact eligible date/start/end and declared clinic timezone | Available now, not reserved | Slot eligibility may change; keep clinician/clinic/time context and show current availability |
| Choose → authenticate/register if needed | Patient → Patient | Intended selection only; own identity | Registration acknowledgement is separate from login and booking | Never imply account creation/login or reserved capacity from a generic acknowledgement; no privileged-role selection |
| Review → submit booking | Patient → Patient + booked clinician's schedule | Confirmed booking identity, clinician/clinic/time/timezone; minimum patient logistics for clinician | BOOKED only on committed success | Timeout is uncertain, not failure/success; use existing explicit same-command recovery. Capacity conflict does not reveal another patient |
| Booked → understand/manage visit | Patient → Patient; booked clinician for permitted logistics | Current state, historical change, eligible cancel/reschedule action | New appointment confirmed only after successful replacement; original retained on failure | Old time must not remain presented as current after reschedule; no clinical complaint in logistics |
| Booked → establish relationship if absent | Patient → designated clinician, then clinician → Patient | Explicit patient request, minimal enrollment identity, acceptance outcome | Pending authorization/acceptance is not clinical access; current active relationship is separate from booking | Booking must not manufacture consent. Decline/withdraw/ended authority is explained without exposing restricted clinical detail. Live workflow gap recorded |
| Attend → begin consultation | Patient/booked clinician → same booked clinician | Exact booking, current relationship and clinic eligibility, actual visit context | Consultation OPEN / booking IN_CONSULTATION only after explicit server-confirmed opening | Arrival/time passage is not clinical opening; no-show/attendance explicit. Missing authority prevents opening; no retry-created relationship |
| Consultation → receive outcome | Clinician → Patient | Only separately signed/released summary/instructions and follow-up; optional signed prescription | Private/draft absent; closed visit and shared outcome are separate | No summary may yet be released, even after close. Do not expose private/draft counts or treat absence as reassurance |
| Outcome → understand next step | Patient → Patient; relevant next role when selected | Released instruction, actual booking state, optional medication fulfillment state | Read, book, or await explicit work according to known source; no invented obligation | Follow-up recommendation is not scheduled; pharmacy acceptance is not stock/dispense. Future Lab and integrated history clearly future |

**Alternate paths:** cancellation/reschedule only within accepted eligibility; no-show is a recorded observation, not an inference from elapsed time. Relationship ending does not erase permitted patient logistics/released history or cancel otherwise valid routed artifacts. Consultation currently requires a booking; this does not define a walk-in workflow.

## J2. Clinician consultation — CURRENT, with optional FUTURE diagnostic branch

**Intent:** conduct a safe consultation without fragmented context. **Tasks:** C01–C13. **Success:** correct patient and current authority; deliberate documentation, optional prescribing/follow-up and explicit review/close. No requirement to create every artifact.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Today's schedule → select visit | Clinician → Clinician | Own schedule, minimum patient logistics, clinician/clinic/time and booking state | Scheduled/changed/no-show/in progress/consulted are distinct | Schedule visibility does not confer clinical access; no patient-wide browse |
| Selected visit → open patient context | Clinician → Clinician; Patient only if explicit authorization needed | Correct identity and current access eligibility; permitted relevant records only | Clinical context available only with current assignment/module authority | Missing grant uses J1 bilateral workflow; never collect clinical complaint in scheduling to bypass it |
| Eligible context → begin | Booked clinician → same clinician | Exact booking/clinic, current assignment and actual server opening time | OPEN; real treating clinician equals booked clinician in current scope | No substitute clinician/admin/delegated recorder path; uncertain response recovered explicitly without duplicate opening |
| Begin → review relevant information | Clinician → Clinician | Permitted released history, complaint and explicit allergy-review state | Known, unknown and not reviewed remain different | No known allergies cannot be inferred from an empty record; another author's private note is excluded |
| Review → document | Clinician → Clinician | Human findings, selected document purpose, current saved version and edit state | Unsaved versus saved draft; private note versus patient summary | Preserve task context; do not silently copy private findings into patient-facing content or imply autosave |
| Document → optional prescription | Clinician → same clinician, then Patient on signing | Exact catalog medication, quantity/unit, human instructions, explicit validity and prior dispensing context | Draft private; signing creates visible immutable source; not yet routed or dispensed | No software dosage/default validity inference. Existing-source correction after close follows its contract; new independent draft requires OPEN consultation |
| Document → optional diagnostic order | Clinician → Laboratory Staff (FUTURE) | Exact authorized signed order/tests and designated lab under future I3 policy | FUTURE ordered/routed; not final result | No Demo order treated as Live; see J5, no pharmacy dependency |
| Clinical decisions → define follow-up if needed | Clinician → Clinician, then Patient on explicit release | Human recommendation and optional desired window | Draft until independently signed/released; no slot reserved | No default medical interval or automatic booking/notification |
| Saved material → review shareable outcome | Clinician → Patient on explicit summary/intent releases | Exact reviewed content and genuine author/release provenance | Each source's saved/signed/released state separately | Signing private note is not sharing; summary release does not release follow-up or prescription automatically |
| Review → close | Clinician → Clinician + Patient's logistics view | Exact visit, visible saved/released state and close consequence; server close time | CLOSED / CONSULTED; close is irreversible in current model | No auto-save/sign/release; no completeness inference from a page-limited list. Close is not blocked by a new invented “all artifacts complete” rule |
| Closed → permitted aftercare/correction | Clinician → Patient/current authorized clinician or fulfillment staff within their scope | Independent release/correction/addendum, existing-source routing and retained history | Closed remains closed; subsequent source actions are separate | No reopen, timeless author entitlement or automatic cross-module privacy repair; recheck current authority for each action |

**Always available in context:** patient/visit identity, consultation/access state, document purpose/privacy, save/release state, relevant safety uncertainty and exact consequential action. Older permitted source versions and nonessential metadata can be on demand. This does not select a layout or navigation mechanism.

## J3. Prescription → Pharmacy — CURRENT backend, Live UI/hosting unverified

**Intent:** carry a clinician's signed instruction through exact authorized supply and truthful patient/clinician visibility. **Tasks:** C05/C09/C10; F01–F06; P06. **Success:** source items remain immutable and each actual full-item dispense is recorded once; supply is never equated with ingestion/adherence.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Draft → signed prescription | Source clinician → Patient/currently assigned clinician | Signed item snapshot, instructions, quantity/unit, validity and author/time | SIGNED source; item NOT_DISPENSED | Signed before validFrom is allowed; not currently dispense-eligible yet. No pharmacy entitlement without routing |
| Signed source → select items/destination and route | Current exact source clinician → exact pharmacy's currently authorized staff | Exact item set and current eligible pharmacy; only necessary fulfillment context | Route PENDING; neither accepted nor dispensed | One active destination per item; no automatic routing or source replacement transfer |
| Pending queue → inspect/accept | Pharmacy Staff → same pharmacy's current staff responsibility | Exact route/items, source/validity, current organization/membership | ACCEPTED only after explicit successful action | Acceptance may precede validFrom; no stock/readiness guarantee. Member/role alone cannot access unrelated work |
| Accepted → dispense exact item | Pharmacy Staff → Patient/currently assigned clinician via permitted source reads | Server-resolved medication/quantity/unit, actual actor/pharmacy/time | Item FULLY_DISPENSED; other items may remain NOT_DISPENSED | Full item only, no partial/substitution/refill. Current validity/source/authority checked at action, not inherited from acceptance |
| Item recorded → reconcile remaining work/history | Pharmacy Staff → same staff; Patient/current clinician under separate read authority | Exact committed result and independent per-item states | Route completion derived when all bound items have facts | Do not collapse source validity, route acceptance, per-item fulfillment and correction into one “done” status |
| Recorded supply → understand next step | Patient/current clinician → Patient/current clinician | Permitted signed source + route/dispense/correction history | Dispensed means recorded supply, never taken/adherent or care complete | No “ready to collect”/stock fact, delivery promise or adherence inference |

### Prescription/pharmacy exceptions — same current contract

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Pending route → withdraw/reroute | Source clinician → old/new pharmacy only within permitted route scope | Reasoned withdrawal; fresh route for exact same items at new destination | Old WITHDRAWN, new PENDING atomically; failure keeps original | Accepted route cannot be moved/withdrawn; old pending staff do not retain a history entitlement |
| Active source → cancel/replace/expiry | Current source clinician (cancel/replace), or passage of validity time → staff/readers | Current source eligibility; preserved prior facts; replacement is new source/items | No new fulfillment on cancelled/replaced/expired source; past facts retained | Replacement needs fresh explicit routing; not an automatic transfer or renewal |
| Dispense error → correction/reversal | Current exact-route Pharmacy Staff → permitted history readers | Reason, predecessor, actual correcting actor/time | Correction annotation or terminal reversal retained beside original FULLY_DISPENSED fact | Reversal never resets to NOT_DISPENSED or permits a second dispense. Further supply requires a new signed/routed source |
| Completed/stopped work → history purpose | Pharmacy Staff → same currently authorized staff | Bounded own-route actual dispense/correction records; no patient display name/instructions | History/correction only, not active fulfillment | A full original detail view must not be retained for convenience; no unrelated patient/route browser |
| Response uncertain → explicit recovery | Acting clinician/staff → same actor after reauthorization | Retained same command/target/key, current safe result | Unknown until resolved; no new success assumed | No automatic clinical retry, new-key duplicate or cached-authority bypass; changed/stopped eligibility may deny replay |
| Authority/privacy changes → deny later access | Effective revocation/restriction → formerly authorized actor receives safe denial | Only privacy-safe unavailable state | Previous access/acceptance is not a permanent grant | No revealing hidden count/reference/reason. Ending prescriber assignment alone does not revoke valid pharmacy artifact authority |

## J4. Follow-up — CURRENT recommendation and booking, FUTURE integrated continuity

**Intent:** carry a clinician's recommendation into an actual next appointment when appropriate. **Tasks:** C06/C11; P05/P09. **Success:** recommendation, booking/link and actual encounter remain distinguishable. No automatic reminder or clinical closure is promised.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Consultation outcome → draft recommendation | Clinician → Clinician | Human instruction, optional desired interval | Private draft; no reservation | Clinical interval is not inferred; follow-up optional |
| Review draft → release | Clinician → Patient/current assigned clinician | Explicitly signed/released instruction/window and provenance | Recommendation available; may be unbooked | Summary release/close does not publish intent; no unseen draft counts |
| Understand recommendation → consider booking | Patient → Patient | Desired window if supplied, clinician's actual instruction and eligible availability | Still a recommendation until booking commits | No suitable time: keep recommendation truthful; no fake booked state or automatic alternative clinical advice |
| Select → book next visit | Patient → booked clinician's logistics schedule | Exact new booking/clinic/time/timezone | BOOKED under the single V3 booking authority | No duplicate editable legacy EH-012 appointment, no CareAction completion/EACCE SCHEDULED inference |
| Existing same-patient booking → explicit intent link | Current treating author → permitted Patient/current-clinician readers | Versioned link to actual booking and prior link history | Linked, not newly booked by link action | Patient self-booking does not automatically attach intent; association does not grant a different clinician access |
| Booking changed/cancelled → reassess link | Patient/booked clinician → Patient; treating author if permitted | Actual booking state and preserved prior link | Recommendation persists; old link may no longer describe a current visit | Do not auto-rewrite intent or create a fresh appointment; explicit replacement link when appropriate |
| Next actual encounter → later continuity | Patient/clinician → permitted source readers; FUTURE I4 projection | Actual source event and permitted history | Attended/consulted only on recorded event; integrated view future | Booking alone is not completed care or proof of action closure |

## J5. Laboratory — FUTURE, no backend or Live delivery

**Intent:** obtain a reliable verified result from an exact authorized order. **Tasks:** C13, L01–L07, P11. This models accepted future I3 policy and user needs; it invents no new backend states, sample/barcode system, timing SLA or mandatory verification staff split. “Assigned/work/final” are conceptual responsibilities, not final labels. Lab is independent of pharmacy.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Clinical decision → author order | Clinician → Clinician | Human-selected tests, correct patient/consultation and designated lab | Draft private; FUTURE capability | No diagnostic recommendation engine or Demo-as-Live order |
| Sign/route → receive authorized order | Source clinician → exact current Laboratory Staff | Signed order/tests and minimum allowed context; source provenance | Routed/pending responsibility | Membership alone not entitlement; no patient-wide search |
| Inspect → accept/reject | Laboratory Staff → same lab's staff; permitted source readers | Explicit acceptance or reasoned rejection | Work accepted or stopped, not resulted | No automatic destination transfer or new mandatory sample substeps |
| Accepted → perform work/enter result | Laboratory Staff → authorized lab editor/verifier (may be same person) | Human-entered result and draft provenance | Draft; not visible to patient/general clinician, including IDs/counts | No result preview leakage; actual entry and verification actors remain truthful |
| Review → verify/finalize | Authorized verifier → Patient/currently assigned clinician | Immutable verified final result and release provenance | Final and available under current privacy | No doctor-release queue or mandatory second verifier; finalization is explicit and human |
| Final → read and interpret | Patient/current clinician → Patient/current clinician | Current permitted final and source context | Available is not clinician-reviewed; no automatic clinical interpretation | Do not imply a clinician has reviewed solely because it was released; no automatic diagnosis/advice |
| Error → amend/retract | Current exact-route Laboratory Staff → permitted final-history readers | Reason, predecessor, verified amendment or terminal retraction, actual actor/time | Corrected current final versus superseded/retracted history | Never silently overwrite or present retracted result as current; fresh order for new fulfillment after terminal retraction |
| Cancellation/rejection/access change → stop work or restrict access | Source clinician/lab/current authority → relevant permitted actor | Safe stopped/unavailable state and preserved allowed final history | New fulfillment stopped; prior final not silently deleted | Suspension does not automatically hide patient/current-doctor released history or reroute work; privacy restrictions still suppress affected sources |
| Final source → longitudinal record | Authorized source readers → FUTURE I4 projection | Permitted source-linked current result/correction status | Integrated continuity FUTURE | Do not imply I4 exists or results automatically complete CareActions |

## J6. Admin operational work — CURRENT bounded foundation, Live management gap

**Intent:** keep legitimate operational access/configuration usable without clinical-content authority. **Tasks:** A01–A05. No generic user/record console, audit browser, research dataset access or self-service IAM is authorized by this journey.

| Transition | Leaving → receiving actor | Information transferred | Status user should understand | Confusion / failure and recovery requirement |
| --- | --- | --- | --- | --- |
| Operational need → inspect exact scope | Operational user/Admin → Admin | Minimum user/organization/membership or configuration identity; no clinical payload | Current account, organization and membership states separately | Demo overview is not a working management tool; no patient search to diagnose access |
| Inspect → choose permitted operation | Admin → Admin | Compatible role/kind, exact target/current version and intended operational effect | Decision ready for bounded operation | No consent manufacture/assignment-creation, impersonation or clinical signing/fulfillment shortcut |
| Execute supported operation → confirm | Admin → Admin; affected user's subsequent permitted operation | Committed operational status/provenance | Success only on authoritative result; current checks on later use | No implied push notification or automatic cancellation/clinical erasure |
| Change effective → resume/recheck work | Affected user → same user in exact permitted role | Current session/org/membership/artifact/assignment eligibility | Operational access may be valid; clinical/artifact entitlement remains separate | Membership activation alone cannot open a patient record or unassigned prescription |
| Exception → investigate safely | Admin → authorized operational maintainer/Admin | Safe configuration/health signal within available tools | Unavailable/changed scope, not hidden clinical reason | No clinical payload in errors/metrics/audit; broader monitoring UI is future |

## J7. Cross-role healthcare continuity

**Intent:** a coherent care story across exact responsibilities, without forcing users to learn internal modules. This is a conceptual map, not a UI sitemap or an implemented unified timeline. Optional prescription and diagnostic branches may run independently; neither must finish before follow-up can be recommended or booked.

| Transition / handoff | Leaving → receiving actor | Information transferred | Status user should understand | Likely confusion / boundary |
| --- | --- | --- | --- | --- |
| Booking → consultation | Patient → booked clinician | Logistics; explicit bilateral relationship separately; then permitted context | BOOKED → OPEN/IN_CONSULTATION on actual opening | Booking is not consent or clinical authority |
| Consultation → documentation | Treating clinician → same clinician | Correct visit/context, human findings, selected private/summary purpose | Saved/draft/signed/released differ | Private content must not flow through a shared “artifact” bucket |
| Documentation → shared outcome | Clinician → Patient/current assigned clinician | Explicit released summary/instructions; independent follow-up | Shared source, independent of close | Close cannot publish or imply complete care |
| Optional prescription → pharmacy | Source clinician → exact Pharmacy Staff | Signed valid source's exact selected routed items | Pending → accepted → actual item dispense | No general patient access; acceptance not supply/readiness |
| Pharmacy → care readers | Pharmacy Staff → Patient/current assigned clinician | Permitted supply/correction history | Full-item fact and reversal separate | Dispensed not taken/adherent; reversed not new entitlement |
| Optional diagnostic order → lab | Clinician → exact Laboratory Staff | FUTURE authorized order and permitted minimum context | FUTURE routed/accepted work | Lab has no backend now and no dependency on pharmacy |
| Lab → care readers | Laboratory Staff → Patient/current assigned clinician | FUTURE verified final/amended/retracted result | Final available, not automatically clinician-reviewed | Draft hidden; no mandatory doctor-release gate |
| Outcome → follow-up | Clinician → Patient | Released recommendation/window | Recommended, booked and attended differ | Patient books; clinician links explicitly; no automatic reminders |
| Permitted sources → longitudinal history | Each source actor → Patient/current authorized clinician | Existing source histories; FUTURE I4 connected projection | Source-linked history, completeness not guaranteed | No expanded authority or CareAction/EACCE closure inference |

**Major responsibility handoffs:** patient authorization → clinician acceptance; patient booking → clinician visit; clinician release → patient understanding/action; clinician routing → pharmacy acceptance/dispense; future clinician order → lab finalization → patient/clinician interpretation; released follow-up → patient booking → explicit clinician linkage. Admin supports operational eligibility alongside these flows and never becomes the clinical intermediary.

## Shared recovery and information rules

- Loading, empty, unavailable, stale, uncertain commit and confirmed success are different states. A missing/forbidden/restricted record must not be distinguished in ways that leak existence. Empty lists/counts must already respect privacy; “no data” is not “no clinical issue.”
- Preserve task/identity context within current authorization, but clear sensitive context when access/session changes. Do not persist a hidden clinical payload merely to make back-navigation convenient.
- Consequential mutation review explains exact target/effect and current state. Timeouts do not trigger automatic clinical mutation retries; an explicit identical-command recovery follows existing per-resource semantics. Do not generalize I2/I3 idempotency to legacy non-idempotent APIs.
- Show localized date/time/status while preserving actual instants and declared clinic timezone. Unknown/derived/recorded facts remain distinguishable. Exact Arabic and English copy is deferred.
- No new communication channel, support-ticket workflow, clinical escalation policy or recovery backend is added by these requirements. Unresolved integration needs go to later bounded work, not invented promises.
