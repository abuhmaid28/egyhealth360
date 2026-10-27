# V3-I2 — Booking & Consultation Contract

## 1. Status and authority

[Issue #48 — V3-I2 — Booking & Consultation](https://github.com/abuhmaid28/egyhealth360/issues/48) is the I2 governance umbrella. [Authorization 6441448885](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6441448885) records the Product Owner's instruction: **Slice 1 contract/readiness/current-status reconciliation ONLY**. **V3-I2 Slice 1 contract/readiness IMPLEMENTED / IN REVIEW** in [PR #49](https://github.com/abuhmaid28/egyhealth360/pull/49), OPEN / UNMERGED; scheduling contract reconciliation pending final independent exact-head approval. This documentation freeze is not implemented booking/consultation behavior or blanket implementation approval.

**M0, M1, M2, V3-G0 and V3-I1 COMPLETE. I2 runtime implementation NOT STARTED. Slices 2–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.**

Verified starting main: `d1b0a017896bdbef0062951264d2e0176732e6b9`. [PR #47](https://github.com/abuhmaid28/egyhealth360/pull/47) MERGED, ordered parents `7f977466252dcf96caca7510e85c66aee24b9cd8`, `63af9483964263114ce234470c584f678830a964`. [Bootstrap 40496696728](https://github.com/abuhmaid28/egyhealth360/actions/runs/40496696728), push/main, exact head, attempt 1, COMPLETED / SUCCESS; validate `122163838525`, all 37 steps SUCCESS. [Issue #39](https://github.com/abuhmaid28/egyhealth360/issues/39) CLOSED / completed; [final completion 6441304825](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6441304825). Baseline evidence is 98 unit / 583 integration / 7 container / 14 migrations PASS, zero failures/skips/cancellations; both audits 0 HIGH / 0 CRITICAL; Slice 6 25/25, runtime, smoke and cleanup PASS. These are accepted I1 baseline results, not I2 executable proof.

Live main/merge/run/job/issue/comment, all issue titles and open PRs were independently checked before mutation. No competing I2 umbrella/active PR or later conflicting owner instruction was found. Historical comments denying I2 were truthful when recorded; the current bounded instruction supersedes that gate for Slice 1 only. Material main drift requires stopping and reporting before rebasing this contract onto unknown state.

## 2. Dependencies and policy preservation

Inherit the entire [approved D01–D36 package](PRODUCT_V3_DECISIONS.md), [I1 contract](V3_I1_CONTRACT.md), implemented I1 slice contracts and accepted M0–M2 contracts. In particular D01/03/04, D08/09/10/11-A/12/13/14/15/24/31/32/33/35/36 govern I2. D06-A, D18-A and D23-B remain unchanged even though prescribing/fulfillment is excluded here. All ten D36 principles survive: I2 creates no routed-artifact entitlement or exception.

The technical states, tables, routes and configuration below refine approved policy; they are not new product choices or D37+. No unresolved product choice was identified in this bounded model. If implementation discovers one that cannot safely derive from D01–D36, stop that decision, record **owner decision required**, and do not guess. D33 deadline/capacity re-estimation is still required before delivery commitments; this contract makes none.

## 3. Scope

1. Finite clinician-published availability.
2. Patient booking.
3. Cancellation.
4. Atomic rescheduling.
5. Booking/history/clinician schedule.
6. Explicit attendance/no-show.
7. General consultation independent of CarePlan/EACCE.
8. Encounter ↔ booking linkage.
9. Clinic/provider and actual treating provenance.
10. Human-entered complaint/problems/diagnoses.
11. Minimal allergy/intolerance review.
12. Author-only private notes under current authority.
13. Separately signed/released patient summary/instructions.
14. Preserved addenda/corrections.
15. Follow-up intent without a slot.
16. EH-012 history/permissions/BP compatibility.
17. Golden Journey A's I2 portion only.

## 4. Explicit exclusions

No prescription, medication catalog, dispensing, pharmacy fulfillment, lab ordering/result fulfillment, imaging or I3 routed-artifact authority. No integrated longitudinal timeline, general notification/reminder system or I4 work. No EACCE, ClosureAssessment, recurrence, research pipeline or Evaluation Lab. No Product UI, UX, screens, branding or Design System. No payments, insurance, marketplace fees, video consultation, delivery, ERP, LIS or PACS. No diagnostic AI, automatic diagnosis, treatment or medication-dose recommendation. No enterprise roster, arbitrary recurring-rule language, external calendar synchronization or capacity optimizer. No real-patient/production-readiness claim.

Slice 1 changes docs/governance only: zero runtime TypeScript, Prisma/schema, migrations, OpenAPI, package manifests/lockfile, Docker, CI, tests, fixtures or seed changes. A necessary implementation change belongs to a later separately authorized slice and must stop Slice 1 implementation work.

## 5. Reused I1 and M0–M2 invariants

**Booking is NOT clinical authority. ClinicianPatientAssignment is the sole effective patient↔clinician clinical grant.** No booking, availability, consultation, request, membership, authorship, role or ADMIN shortcut creates/replaces it. Booking implies neither patient consent nor clinician acceptance. No permanent author access.

Retain current session/account/profile checks, ownership, ACTIVE/null-ended assignment, bilateral workflow, terminal histories, exact old-target retries, current privacy, immutable clinical facts, exact plan/rule pins, INITIAL-only generation and minimized atomic audit. Legacy ACTIVE assignments remain valid under I1 without invented consent. Public locators identify targets only. Current organization/membership authority is additional clinic-scoped authority, never a patient grant. No ADMIN/LAB_STAFF/PHARMACY_STAFF clinical shortcut, forensic view or break-glass.

Preserve existing cookie/Argon2id/login/logout/CSRF/Origin/Fetch Metadata/parser behavior, no-store/HEAD/IDOR contracts, M1 `eh-m1-demo-v1`, all historical SQL/checksums and historical evidence. Published directory removal does not silently end assignments. Relationship ending does not cancel otherwise valid future I3 artifacts; I2 introduces none.

## 6. Current inventory and domain model proposal

Inspection baseline: [Prisma](../packages/db/prisma/schema.prisma), fourteen migration SQL files, [31-model inventory](DATA_MODEL.md), [OpenAPI](openapi.json), [API runtime composition](../apps/api/src/app.ts). Database constraints/triggers, not Prisma alone, enforce partial uniqueness/immutability. No live production database access or clinical data inspection is claimed; baseline schema is migration-backed and full PostgreSQL catalog/upgrade proof remains in the unchanged CI gate.

| Existing objects | Reuse / additive extension / protected boundary |
|---|---|
| User / Session | REUSE canonical identities, five fixed roles, ACTIVE/DISABLED; session token hash, exact actor session, expiry/revocation. Never expose password/hash/session secrets or inject actor identity |
| PatientProfile | REUSE id/user-role mapping, displayName and own profile. DOB/opaque sex do not infer clinical facts. Patient id differs from user id |
| ClinicianProfile | REUSE id/user-role mapping; legacy specialty/professionalIdentifier remain private and are not verified directory authority |
| Organization / OrganizationMembership | REUSE CLINIC identity, ACTIVE/SUSPENDED, compatible CLINICIAN–CLINIC exact ACTIVE/unended membership, terminal end/new grant and versioned operational state |
| Specialty / ClinicDirectory / ClinicianDirectory / DirectoryAffiliation | REUSE curated specialty, separate public UUIDs, independent publication and exact provider/user/membership/clinic/specialty binding. No timezone exists today; add separate bounded clinic scheduling settings, not reinterpret address/city |
| RelationshipRequest | REUSE patient authorization/designated acceptance and exact assignment binding; PENDING/ACCEPTED/DECLINED/WITHDRAWN and accepted withdrawal provenance. Never access authority itself |
| ClinicianPatientAssignment / AssignmentEndProvenance | REUSE sole ACTIVE grant, terminal ending, partial ACTIVE pair uniqueness and actual participant end truth; preserve legacy unknown end actor and CareAction references |
| FollowUpAppointment | HISTORICAL, DO NOT REPURPOSE: patient/scheduledAt/purpose HTN_BP_FOLLOWUP, SCHEDULED→CANCELLED, clinician-created/cancelled, no provider/slot allocation. Patient reads only; legacy post-time cancellation/non-idempotent create remain |
| ClinicalEncounter | ADDITIVE EXTENSION ONLY: immutable id/patient/occurredAt/purpose/recordedByUserId/createdAt. No booking, treating clinician, clinic, timing lifecycle or document fields exist. Recorder is not proof of actual treating participation |
| EncounterBloodPressureAssociation / BloodPressureMeasurement | REUSE same-patient composite FKs and unique BP→encounter; immutable source/link and current Issue #31 masking. No reassignment, new inherited BP link or altered BP clinical qualification |
| AuditLog | REUSE real actor/action/entity/time, append-only and atomic empty safeMetadata; no clinical narrative or general reader |
| GuidelineSource / CarePlanTemplate / CareRuleDefinition / CarePlan | PRESERVE exact published/version pins, DRAFT/ACTIVE/CANCELLED and current authorization; no ordinary consultation prerequisite or new clinical rules |
| CareAction / CareActionDecision / CareActionApplicabilityInput | PRESERVE immutable INITIAL/source/assignment pins, protected evaluated decision and current privacy. Never use as follow-up intent or closure state |
| RecordCoverageWindow / ObservedClinicalApplicabilitySnapshot / Retraction | HISTORICAL, DO NOT REPURPOSE: synthetic observed evidence, explicit null/unknown and isolated truth; no clinical problem/allergy store or new inferred coverage |
| BpAmendmentOperation / BpExclusion / BpPrivacyTarget | PRESERVE current correction/exclusion/independent wrong-patient guards. Reuse safety pattern, never overload BP rows for consultation documents |

Future logical objects (names are technical proposals, not an executed Prisma design):

| New concept | Minimum retained information / integrity |
|---|---|
| ClinicSchedulingSettings | Operational clinic configuration under D28: exact clinic FK, version, authoritative declared IANA timezone, bounded duration/minimumBookingLead/publication horizon, genuine ADMIN change actor/time and preserved configuration-version history. Internal current-ADMIN service only; no clinical payload or authority |
| AvailabilitySlot | Immutable clinician/profile-user, clinic, exact membership/public affiliation, UTC start/end, server-resolved clinic timezone and configuration-version snapshot, capacity=1, publication/withdrawal provenance, operation identity. Explicit finite rows; no generated recurrence |
| Booking | Immutable patient/profile-user, booked clinician, clinic, selected slot and start/end; creator/time, operational state/version. One V3 operational booking authority |
| BookingEvent / BookingOperation | Append-only transition/attendance/cancellation/reschedule actor/time and exact links; actor+operation key/payload fingerprint uniqueness. Safe current replay, no generic workflow engine |
| Consultation | Same-patient one-to-one ClinicalEncounter sidecar, unique booking link, booked and actual treating clinician, recorder, clinic/exact membership, assignment used, actual opened/closed time and state. No grant of access |
| ConsultationDocumentVersion | Bounded complaint/problems/diagnoses/allergy review; PRIVATE_NOTE or PATIENT_SUMMARY content in separate identities, author, sign/release truth, exact predecessor/addendum/correction reason and operation identity. No universal clinical JSON event store |
| ConsultationPrivacyRestriction | Exact source/document identities, current-authority actor/time/reason, explicit bounded affected lineage; independent wrong-patient masking, no source move |
| FollowUpIntent / FollowUpIntentBookingLink | Patient/encounter/author, human instruction/optional desired interval, actual recording time; optional exact same-patient V3 booking link and historical replacements, never a reservation or action-completion state |

Use RESTRICT same-patient/composite identity FKs, immutable source identities and database guards against UPDATE/DELETE/TRUNCATE of signed/history rows. Operational state may advance only through bounded transitions with retained events. Do not fabricate missing historic treating/clinic/timing data.

## 7. Availability contract

Smallest deterministic model: each clinician explicitly publishes one finite bookable interval per row, capacity exactly one. Start < end, half-open `[start,end)`; adjacent intervals do not overlap. No bulk recurrence or variable capacity. Prevent overlapping live slots for the same clinician across clinics, and overlapping effective clinician/patient bookings independently.

ClinicSchedulingSettings is operational clinic configuration, contains no clinical payload and grants no clinical authority. Bounded configuration creation/read/change follows approved D28 ADMIN operational config/demo administration through a narrow internal current-ADMIN service, not a public HTTP endpoint or generalized admin/IAM/config framework. Require a current valid session, ACTIVE ADMIN user and exact existing CLINIC target; derive change actor/time server-side, enforce expected-version compare-and-set, retain prior versions and commit minimized audit atomically. Clinician publication authority never permits clinic-wide configuration mutation. ADMIN config authority grants no patient-record or consultation access, clinical authoring, impersonation or assignment authority.

Technical configuration envelope for the demo: duration integer minutes 5–240; one `minimumBookingLead` integer minutes 0–10080; maximum publication horizon integer days 1–90. Selected defaults remain bounded configuration/demo choices, not universal 30-minute/30-day product rules. Reject missing/invalid configuration before publication/booking and reject invalid ADMIN config changes. There is one booking cutoff: **booking closes at `startAt - minimumBookingLead`**. A new booking or reschedule replacement must occur strictly before that cutoff using current configured minimumBookingLead and database time; equality denies. Duration and publication horizon remain separate bounds; horizon applies when publishing and booking. Recheck current settings/version and clock after waits and before successful mutation. Existing bookings retain their original instants/history. D09 cancellation/rescheduling of the original remains before appointment start AND before consultation opening; no cancellation cutoff or fee is introduced.

Publish input is exactly `{clinicId,startAt,endAt,operationKey}`: exact clinic public locator, explicit-offset start/end and operation identity. Resolve the current actor's own clinician/provider and the declared IANA timezone from the exact current clinic configuration server-side. Reject caller-supplied timeZone/configuration-version fields and clinician/user/membership/status/capacity injection; no caller timezone overrides clinic configuration. The configured IANA zone must be recognized; each supplied offset must match that declared zone at its instant, including DST boundaries; ambiguous local-only time is rejected. UTC instants control overlap/cutoff. Store the resolved timezone, configuration version and bounded configuration snapshot with the immutable published slot. A later ADMIN configuration change never rewrites published/booked instants or their captured timezone/configuration snapshot; public availability exposes the stored slot timezone. New booking/replacement admission rechecks current minimumBookingLead/horizon and records the current admission configuration version separately from the slot's publication snapshot. Reuse strict finite calendar/millisecond timestamp parsing conventions, not medical timing rules.

Own availability publication/withdrawal requires current valid session, ACTIVE CLINICIAN user, current profile, ACTIVE CLINIC organization and exact compatible ACTIVE/unended membership. Require the same current published curated provider/specialty/clinic and unwithdrawn exact affiliation used by I1 discovery. Recheck all eligibility on booking. Suspension, membership end, user disable or publication withdrawal makes subsequent writes/new bookings fail closed; no automatic silent booking cancellation. Patients retain own logistics history. Clinical write authority additionally requires assignment.

Lifecycle: PUBLISHED→WITHDRAWN terminal; expired/full are derived eligibility, not fabricated events. Published slot time/clinician/clinic never overwritten. Withdraw unbooked slot or replace by a new publication with new identity. Occupied slot cannot be withdrawn/retimed to evade booking change rules: use explicit eligible booking cancellation/reschedule first, atomically retain history. Ended membership regrant never silently rebinds old slots; publish fresh rows.

Public GET projection only `id,providerId,clinicId,startAt,endAt,timeZone,bookable`; return current bookable rows only, `bookable=true`, no patient, occupancy count, complaint/history, user/profile/member IDs, operational reason or secret. Same public projection for all callers, including invalid/disabled/revoked-session callers: no authenticated widening. Order startAt ASC,id ASC; bounded page/pageSize and date interval within the horizon; count/page share one SQL statement. Current directory eligibility and slot/capacity checks in one statement, no cached entitlement. Availability is a locator/projection, not clinical authority.

## 8. Booking lifecycle and retries

Patient creates own booking from `slotId,operationKey`; derive patient/user/clinician/clinic/time server-side. Booked clinician sees own operational schedule only. Before relationship establishment, exact booking projection is limited to booking id, minimum patient booking identity (displayName and booking-scoped locator; no internal patient/user UUID), public provider/clinic locators, start/end/timezone, operational state and retained logistics transitions. Never accept complaint, diagnosis, history, clinical reason or clinical attachments in booking input/history. No provider patient browse/search.

| Operation | Technical state and conditions |
|---|---|
| Book | New BOOKED reservation; current patient session/user/profile, eligible slot/provider/clinic; capacity and patient/clinician overlap protected in database |
| Cancel | BOOKED→CANCELLED only before start AND before consultation opening; patient owner or exact booked clinician under current clinic authority; optional bounded operational reason code, no free clinical narrative |
| Reschedule | Before original start AND opening, to eligible target slot of the same booked clinician/clinic in this minimal model. Atomically original BOOKED→RESCHEDULED plus new BOOKED linked predecessor/successor. Changing provider is explicit cancel + fresh patient booking, never silent transfer |
| Consultation open | BOOKED→IN_CONSULTATION and create encounter/sidecar atomically under Section 10; blocks cancellation/reschedule |
| Close consultation | IN_CONSULTATION→CONSULTED with actual close actor/time; no implied summary release, clinical completion or CareAction closure |
| Attendance | Separate append-only explicit UNKNOWN→ATTENDED or UNKNOWN→NO_SHOW observation; booked clinician/current clinic scope. ATTENDED at/after appointment start; opening truthfully records attendance. NO_SHOW only at/after end, no opened consultation and no contrary attendance; BOOKED→NO_SHOW releases future operational eligibility, preserves original interval/history |

CANCELLED/RESCHEDULED/CONSULTED/NO_SHOW are terminal identities; do not reopen them. No time-elapsed auto-no-show or auto-attendance. Reasoned attendance correction appends a superseding observation preserving the original and actual actor; never resurrect reservation/consultation entitlement. Eligibility and state conflict information follow full scope authorization.

Patient reads own booking/history, cancels/reschedules own eligible reservation. Exact booked clinician reads own schedule and makes the same before-start cancel/reschedule changes under D09; patient identity/clinician/clinic cannot be retargeted. No unrelated ACTIVE-related clinician operational booking access. Clinician suspension/end blocks clinician-scoped writes; patient own cancellation can still remove their eligible booking when the provider is ineligible. Replacement must meet fresh target eligibility. No fees/payment rules.

Every create/reschedule/attendance/correction command uses immutable canonical UUIDv4 operationKey, scoped `(actorUserId,commandKind,operationKey)` with exact canonical payload fingerprint. Exact key/different payload conflicts. Commit result and event/audit together; uncommitted rollback leaves no consumed key. Cancel/exact close may use exact immutable target plus expected version and original command identity. Safe retry returns the retained original outcome/current privacy-safe projection without another reservation/transition/audit; terminal retry never reopens/regrants. Recheck current actor and applicable operation authority on every retry; no cached success as authority. Failure to reschedule leaves old booking unchanged, including audit/version/capacity. Lock old+target before releasing old capacity; transaction failure rolls everything back. No automatic retry on timeout/deadlock/serialization failure.

Bookings retain original patient, clinician, clinic, slot/time, creator and all transition/attendance/reschedule provenance. Schedule/history deterministic startAt DESC,id ASC (future schedule may request bounded startAt ASC,id ASC); pagination defaults 1/20, page≤10000, size≤100, fixed sort only. No silent destructive overwrite, removal or dual booking authority.

## 9. Relationship interaction

Reuse existing I1 patient authorization→designated clinician acceptance→exact ACTIVE assignment workflow. Relationship establishment may happen before or “at consultation,” but both explicit I1 commands must succeed **before the first clinical consultation mutation**. Opening never manufactures consent, calls a direct assign helper or treats a pending/accepted request alone as authority.

Every clinical read/write checks current ACTIVE/null-ended assignment and current session/user/profile. Acceptance in an earlier operation is not a reusable ticket. Ending blocks subsequent author/clinical access while preserving all histories. Re-establishment uses fresh I1 authorization/acceptance, not a consultation reactivation. Legacy ACTIVE grants retain their existing I1 compatibility and are not relabeled as proof of new consent.

## 10. Consultation lifecycle and encounter linkage

Minimal I2 new-journey opening is booking-backed: exact BOOKED appointment, correct patient/clinician/clinic, at/after its start, not cancelled/rescheduled/no-show, not previously opened. No unbooked walk-in/ad-hoc consultation path is added. An eligible BOOKED row may be opened late with truthful actual time; no invented medical lateness window or backdated opening. Final pre-mutation current-time/state check is required.

Only the booked clinician can open/author in this minimal contract. The server enforces actual treating clinician = current clinician = booked clinician; recorder = genuine opening actor for the new encounter. Store these as distinct provenance fields rather than infer historical equivalence. Substitution/multiple treating participants are deferred; no delegated recorder, ADMIN shortcut or silent provider reassignment. A currently related other clinician may read allowed released records, never another author's private note or edit/open that booking.

Opening requires valid current session, ACTIVE CLINICIAN user/profile, patient identity, current ACTIVE assignment and current ACTIVE exact clinic/membership/provider authority. Create immutable ClinicalEncounter + Consultation sidecar + booking transition + audit in one transaction, unique booking/encounter links and same-patient FKs. Actual openedAt is database-owned, independent of scheduled start; actual close time ≥ open. OPEN→CLOSED once. Clinical payload versions/sign/release remain separate; closing does not sign/release a draft.

Existing ClinicalEncounter purpose/SQL guard is HTN_BP_FOLLOWUP only. Later Slice 4 may add GENERAL_CONSULTATION for new rows through additive guard extension, never rewrite old purpose/occurredAt/recorder. Existing EH-012 HTTP remains purpose HTN-only; legacy lists/normalized candidates must select the legacy purpose so new general encounters do not widen old response enums or expose draft/private metadata. Existing BP link cardinality and old rows stay unchanged. Any new general-encounter BP adapter needs the same current assignment/clinic/consultation and privacy checks, not a permissive legacy-route bypass; it is not required to fabricate BP for a consultation. Populated/API regression proof is mandatory before accepting this extension.

Signing/release/addendum/correction requires current clinical authority and author ownership, even after CLOSE. Clinic suspension/end denies subsequent clinic-scoped clinical writes. Patient own released history remains readable; other currently ACTIVE-related clinicians use their own relationship for permitted released content, not the original source clinic membership. No source suspension automatically hides already released correct records. Private-note author reads additionally require current clinical authority; no grandfathering through authorship.

## 11. Documentation and privacy model

Human entry only; free bounded text, no curated coding engine required. No inference from BP/demographics/prescription/history, diagnostic suggestions, invented diagnoses/allergies or treatment advice. Complaint optional ≤2000 Unicode scalars; problems and diagnoses each ≤20 items of ≤500 scalars; private note/summary/instructions each ≤8000 scalars subject to total 16KiB JSON body. No silent truncation; reject controls/unpaired surrogates and unsafe framing; multiline narrative permits LF only among control characters. Distinct problem/diagnosis item kind, actual author and recording/signing time; clinical event time if supplied must be explicit, valid and not falsely treated as recording time.

Allergy/intolerance review always has explicit state, actual reviewer/time when reviewed:

| Technical state | Meaning |
|---|---|
| REVIEWED_POSITIVE | Human records ≥1 bounded item (≤20, each ≤500 scalars), allergy/intolerance kind and optional human reaction text; no inferred severity/certainty |
| REVIEWED_NO_KNOWN | Explicit human no-known assertion at that review; empty positive items, not a universal verified negative |
| UNKNOWN | Knowledge explicitly unknown; no positive/negative inference |
| NOT_REVIEWED | Review not performed; missing review maps here, never to no-known |

Unknown/not-reviewed preserve uncertainty; do not turn absence into medical knowledge. Versioned review belongs to encounter documentation; it is not a new longitudinal allergy reconciliation engine or synthetic applicability writer.

PRIVATE_NOTE and PATIENT_SUMMARY are separate record identities/content. Private notes may be draft then signed; read/write is exact author AND current clinical authority. Patient, other clinicians, ADMIN, staff and public never receive note payload, counts, titles, lengths, IDs or embedded references. An ACTIVE assignment does not suffice to read another author's note. Signing a note never releases it.

Patient summary/instructions use DRAFT→SIGNED_RELEASED by an explicit author sign-and-release command, real author/patient/encounter, signedAt/releasedAt and immutable operation identity. Only that command makes the bounded content patient-visible. Closing consultation cannot copy/promote private note content. Patient reads own released summary; other clinicians read released content only under their current ACTIVE relationship. Draft summary author-only/current authority. Human problems/diagnoses/allergy content becomes patient/other-clinician visible only when explicitly included in the released summary; separate private documentation stays author-only. No generic “all documents” expansion.

Signed sources never overwritten: corrections/addenda create new signed immutable version referencing exact original/root/predecessor with reason (1–1000 scalars), author/time and correction/addendum kind. Corrections preserve originals and identify effective/retracted status; no cross-patient record move, deleted authorship or original release time replacement. Ordinary history can show permitted same-patient signed lineage with clear supersession. Wrong-patient restriction independently suppresses affected payload, IDs/lineage references, counts and retries for all ordinary viewers; current authorized clinician may mark exact affected source identities without a raw-history/forensic API. No dynamic BP privacy propagation or automatic cross-module rewrite. Correct patient receives a fresh independently authorized record, never reassigned old content. Patient/ADMIN concern reporting does not grant clinical correction rights; a concern-report subsystem is not introduced here.

## 12. Follow-up intent

A currently authorized treating author can record bounded human follow-up instruction (≤2000 scalars) and optional desired start/end with explicit timezone, even without available slots. Store patient/encounter/author, actual time, signed/released visibility and additive correction lineage. No inferred timing or medical interval defaults. Patient sees only explicitly released intent; current related clinicians may read released intent. Private draft stays author-only.

Optional link to a same-patient V3 booking is explicit and versioned; slot booking still uses patient-owned booking authority/current availability. Cancellation/reschedule retains prior linkage and intent, and explicit new linkage may follow. Neither intent nor booking means encounter occurred, CareAction completed or EACCE SCHEDULED. No CareAction FK/closure bridge in I2. Follow-up intent is not EH-012 FollowUpAppointment.

## 13. EH-012 compatibility

Keep FollowUpAppointment, ClinicalEncounter, BP association, audits/migrations and permissions/history intact. Old appointment is not a slot reservation; it cannot be used to consume V3 capacity or bypass booking/relationship gates. Never invent historic V3 bookings or treating/clinic facts from recorder identity.

V3 Booking is the sole new-journey operational booking authority. No compulsory universal adapter. The minimal demo needs no automatic legacy appointment link; if a genuine legacy HTN encounter is explicitly associated with an I2 consultation, use one immutable same-patient unique legacy link with truthful provenance and no editable duplicate booking. Do not create a second editable EH-012 appointment for that event or synchronize independent cancellation writers. Existing legacy appointments remain separate historical HTN evidence, not relabeled as the new event. D24 allows this bounded separation, not destructive backfill.

Legacy APIs remain patient-read-only/assigned-clinician-write, non-idempotent creates, SCHEDULED/CANCELLED, HTN-purpose and existing cancellation/time/HEAD/error/privacy behavior. Normalized evidence stays legacy-scoped; no general-consultation existence becomes qualifying completion. Existing exact BP associations never move, and new correction BP never inherits a link.

## 14. Authorization matrix

Deny by default. All protected cells require current ACTIVE user and valid session. `P` = identical public scheduling projection only. `O` = own patient logistics read/change subject to lifecycle. `S` = exact booked clinician logistics/own schedule, current clinic authority for writes. `R` = released content/current privacy only. `A` = exact author/current ACTIVE assignment; clinic authority additionally for writes. Clinical read R for clinician always requires their own current ACTIVE assignment; booking/treating identity alone is insufficient.

| Actor | Public availability | Booking detail/history | Clinician schedule | Consultation | Problems/diagnoses | Allergy review | Private note | Released summary | Follow-up intent |
|---|---|---|---|---|---|---|---|---|---|
| Anonymous | P | deny | deny | deny | deny | deny | deny | deny | deny |
| Patient owner | P | O | deny | R metadata | R | R | deny | R | R |
| Other patient | P | deny | deny | deny | deny | deny | deny | deny | deny |
| Booked patient without relationship | P | O | deny | R own released only | R own released only | R own released only | deny | R own released only | R own released only |
| Booked clinician | P | S | S own | A open/write; R read | A/R | A/R | A only | A release / R read | A write / R read |
| Actual treating clinician | P | S only if also booked (enforced) | own only | A/R | A/R | A/R | A only | A/R | A/R |
| ACTIVE-related clinician, unrelated booking | P | deny | own schedule only | R read only | R read only | R read only | deny | R read only | R read only |
| Clinician without relationship | P | S if booked, logistics only | own only | deny | deny | deny | deny | deny | deny |
| Clinician with ended relationship | P | S if booked, logistics only | own only | deny | deny | deny | deny | deny | deny |
| Disabled clinician | P | deny | deny | deny | deny | deny | deny | deny | deny |
| Revoked session | P | deny | deny | deny | deny | deny | deny | deny | deny |
| Expired session | P | deny | deny | deny | deny | deny | deny | deny | deny |
| ADMIN | P | deny | deny | deny | deny | deny | deny | deny | deny |
| LAB_STAFF | P | deny | deny | deny | deny | deny | deny | deny | deny |
| PHARMACY_STAFF | P | deny | deny | deny | deny | deny | deny | deny | deny |

Clinic scheduling configuration is a separate operational resource, outside the clinical/logistics columns above. Only a current ACTIVE ADMIN with a valid current session may create/read/change it through the bounded internal service under D28; every other role, including a clinician publishing own slots, is denied configuration mutation. Public callers receive only the stored slot timezone in the availability allowlist, not a settings-management interface. ADMIN's clinical/booking denials in the matrix remain unchanged.

Patient clinical cells are read-only released records, not authoring. Consultation R metadata contains id, actual timing, public treating/clinic identity and release/correction state only when release permits; no draft/private counts. Patient logistics history survives relationship ending/provider suspension. Clinician logistics has no clinical complaint/history. Staff/admin operational membership tools retain their I1 scope, not I2 payload access. No ordinary record read survives independent wrong-patient restriction.

## 15. API proposal and current compatibility inventory

Current OpenAPI has exactly 25 paths. Runtime boundaries below were inspected; no path or behavior is added in Slice 1. All routes below use `/api/v1` prefix.

| Existing group and source | Exact routes / methods to preserve |
|---|---|
| app/auth | GET `/health`; POST `/auth/login`, `/auth/logout`; GET `/auth/me`. Runtime HEAD follows existing GET conventions even where not separately enumerated in OpenAPI; no cookie/session redesign |
| patient-entry | POST `/auth/register` with X-EH-Register: 1/Origin/Fetch Metadata, generic 202/no login; GET/HEAD/PUT `/me/profile` current PATIENT own fields only |
| authorization | GET `/patients/{patientId}/profile` (runtime HEAD same authorization, empty body), own/current ACTIVE assigned, uniform 404; minimal id/displayName |
| directory | GET/HEAD `/directory/specialties`, `/directory/clinics`, `/directory/providers`, `/directory/providers/{publicId}`; current published allowlist, exact bounded filters, no clinical queries/authority |
| relationships | GET/HEAD/POST `/me/relationship-requests`; GET/HEAD `/{requestId}` under it; PUT `/{requestId}/accept`, `/decline`, `/withdraw`; participant-only, exact idempotent provenance/current session |
| relationships | GET/HEAD `/me/relationships`, `/{assignmentId}` under it; PUT `/{assignmentId}/end`; exact participant grant, ended clinician patientId masking |
| blood-pressure | POST/GET/HEAD `/patients/{patientId}/blood-pressure-measurements`; own/current assigned, immutable non-idempotent create, minimized current-privacy history |
| followup | POST/GET/HEAD `/patients/{patientId}/follow-up-appointments`; POST `/{appointmentId}/cancel` under it; patient own reads/assigned clinician writes, HTN purpose only |
| followup | POST/GET/HEAD `/patients/{patientId}/clinical-encounters`; POST `/{encounterId}/blood-pressure-measurements/{measurementId}` and GET/HEAD `/{encounterId}/blood-pressure-associations` under it; immutable same-patient links/current BP privacy |

Organization/directory management, catalog/plans/coverage/applicability/BP amendment/INITIAL generation are internal services, not additional runtime HTTP routes. Preserve existing method Allow/405, route errors, parser precedence, session/CSRF, no-store/no ETag/Last-Modified/304, canonical pagination and strict projections. Existing BP/EH-012 Idempotency-Key rejection and non-idempotent creation remain; new I2 safe retries must not silently change them.

Future I2 route families (proposal for later exact OpenAPI review, NOT LIVE):

| Family | Methods / strict command shape / authority |
|---|---|
| `/directory/providers/{publicId}/availability` | GET/HEAD bounded public eligible slots; clinic/date/page filters only |
| `/me/availability` | GET/HEAD own publication history; POST `{clinicId,startAt,endAt,operationKey}` current clinician, timezone/configuration snapshot derived server-side; PUT `/{slotId}/withdraw` `{operationKey,expectedVersion}` |
| `/me/bookings` | GET/HEAD own patient history; POST `{slotId,operationKey}` patient only; GET/HEAD `/{bookingId}` participant logistics |
| `/me/bookings/{bookingId}/cancel` / `/reschedule` | PUT `{operationKey,expectedVersion}` / `{slotId,operationKey,expectedVersion}`; owner or booked clinician; no clinical payload |
| `/me/schedule` / `/me/bookings/{bookingId}/attendance` | GET/HEAD exact clinician own schedule; PUT `{observation,operationKey,expectedVersion}` plus separate reasoned correction command |
| `/me/bookings/{bookingId}/consultation` | POST `{operationKey}` booked clinician with current relationship + clinic authority; unique open replay; no patient/author/status injection |
| `/consultations/{consultationId}` / `/close` | GET/HEAD authorized reduced metadata; PUT close `{operationKey,expectedVersion}` treating author only |
| `/consultations/{consultationId}/documents` | Exact kind/content/review/operationKey draft command; author-only reads/writes. Separate `/{documentId}/sign-release`, `/addenda`, `/corrections`, `/privacy-restrictions` commands with exact bounded reason/predecessor/operationKey; private note cannot call release |
| `/me/summaries` / `/{summaryId}` | GET/HEAD own patient released projection/history only; clinician released reads via patient-scoped current relationship route |
| `/consultations/{consultationId}/follow-up-intents` | POST human instruction/optional desired interval/operationKey; separate explicit release and same-patient booking-link command; authorized clinical author only |

Clinic scheduling configuration remains a narrow internal ADMIN service, not a proposed public HTTP route. Its bounded command targets the exact clinic with expectedVersion, declared IANA timezone, duration, minimumBookingLead and publication horizon; actor/change time/new version are server-owned. Clinician availability commands cannot write these settings. No generic configuration registry or IAM surface is added.

Later slice contracts must enumerate every exact request/response/error schema before coding; no generic arbitrary field PATCH or record browser. Canonical lowercase UUIDv4 targets/operation keys, no encoded aliases; exact own enumerable fields and copied primitive inputs before await; no actor/owner/clinic-authority/status/signature injection. Provider/clinic public locators resolve internally; identifiers never prove authority. Strict flat or explicitly bounded nested JSON, duplicate decoded-key rejection at every accepted level, fatal UTF-8, 16KiB body, 8192-byte raw headers, 2048-byte URL, exact media/encoding, reject mutation query/Idempotency-Key; no arbitrary filters/sort/search.

Reuse current browser authenticated write protections: mandatory exact configured Origin, Fetch Metadata and session-bound CSRF; no CORS exception. Protected GET/HEAD current authorization, no-store, no ETag/304; HEAD executes the same checks without a body at every status. Uniform missing/forbidden/wrong-patient denial before conflicts; 401 invalid session, existing CSRF 403, generic scoped 404, 409 fully authorized state/capacity/key conflict, 400 shape/field errors, 405/413/415 existing conventions, sanitized 503 infrastructure failure. Public scheduling conflicts must not identify another patient/booking. Safe fixed errors never echo clinical values, unknown keys, SQL/stack or user/professional secrets. Project only necessary fields; signing actor can use public professional identity, not internal user UUID/email/professionalIdentifier. All draft/private revealing references/counts are filtered in the same query as page/count.

## 16. Migration strategy

Additive migrations only, preserving fourteen historical SQL bytes/checksums/ledger entries. No schema mutation in Slice 1. Future new objects start empty; no fake availability, booking/consultation history, diagnoses, summaries, consent or treating provenance. No EH-012→V3 rewrite/backfill. Composite RESTRICT FKs, state CHECKs, immutable guards, uniqueness/exclusion constraints and trusted SECURITY INVOKER qualified relations protect ordinary writes/TEMP shadows; database owners remain outside the web threat model.

Any future ClinicalEncounter purpose guard extension is a new migration with explicit legacy filtering/old OpenAPI compatibility proof, not an edit to EH-012 SQL. Avoid new scalar fields on old rows that break generated historical-stage queries; prefer sidecars, explicit selects and unchanged legacy tests. Enum additions commit before use where PostgreSQL requires. Fresh deploy/status/redeploy plus populated current fourteen→new upgrade must compare every old table/row, signed/history/audit/session/relationship identity and ledger checksum unchanged. Prove zero fabricated rows, repeated deploy ZERO_WRITE, preserved M1 clean/repeat/conflict and M2/I1 regressions. Separately version future synthetic integrated fixtures; do not change M1 or run automatic startup seeds.

## 17. Transaction and lock compatibility

Inspected `packages/db/src/auth.ts`, `authorization.ts`, `organizations.ts`, `directory.ts`, `relationships.ts`, `demo.ts`, `followup-common.ts`, `follow-up-appointments.ts`, `clinical-encounters.ts`, `blood-pressure.ts`, `care-plans.ts`, `care-actions.ts` and their migration guards. Existing graph:

| Path | Existing order / limitation |
|---|---|
| Auth | Resolve is current SQL snapshot; login User NO KEY UPDATE→prior Session UPDATE; logout exact Session UPDATE only, never add late User lock through I2 |
| EH-007 | One current scoped statement, no retained authorization ticket; in-flight snapshot can overlap later revocation |
| Organization | Sorted actor/target Users NO KEY UPDATE→actor Session UPDATE→Organization (UPDATE management/SHARE read)→Membership; no clinical locks |
| Directory | Sorted actor/clinician Users→Session→ClinicianProfile SHARE→Specialty→Organization→ClinicDirectory→Membership→ClinicianDirectory→DirectoryAffiliation (targets/modes vary); current eligible public read is one statement |
| Relationships | Compatible ROW EXCLUSIVE table intent before row locks (users/patient_profiles/clinician_profiles/assignments), sorted participant Users→actor Session→ClinicianProfile SHARE→PatientProfile SHARE→pair advisory→exact Assignment UPDATE→Request UPDATE; no late exclusive patient lock |
| EH-012/BP/plans | Actor User→Session→ClinicianProfile SHARE→ACTIVE Assignment SHARE→PatientProfile SHARE→resource; association Encounter SHARE→BP UPDATE; appointments UPDATE |
| EH-014 | Same clinical prefix, then PatientProfile UPDATE for generation→Plan UPDATE→Template SHARE→selected BP UPDATE; exact decision/action work afterwards |
| M1 seed | Four identity/assignment table SHARE ROW EXCLUSIVE locks before inserts; I2 must not hold rows then wait for incompatible table intent |

Proposed I2 canonical hierarchy (new flows only; **no existing runtime lock changes in Slice 1**):

1. Bounds/input snapshots and preliminary immutable scope lookup without authority; acquire compatible ROW EXCLUSIVE intent on the same four M1 tables before any row locks for I2 transactions that may touch clinical/booking provenance. No patient lock or session-derived authority ticket is held from a prior transaction.
2. Lock all involved User rows (actor, patient, booked/treating clinician; old and replacement scope) in UUID order, NO KEY UPDATE; then exact actor Session UPDATE; recheck current actor/role/session/expiry and immutable mappings. Do not acquire counterparty Session locks or a late User lock. Counterparty user disable serializes here; clinician/patient session revocation matters when that session is the actor.
3. ClinicianProfile SHARE; for clinical operations exact ACTIVE Assignment SHARE **before** PatientProfile SHARE. Logistics omits assignment (booking never requires/grants one), takes PatientProfile SHARE if needed. Never take patient exclusive and then wait for assignment; retain EH-014 compatibility. Do not call I1 acceptance/end nested inside a booking transaction.
4. In directory order: Specialty SHARE→sorted Organizations SHARE→ClinicDirectory SHARE→exact Memberships SHARE→ClinicianDirectory SHARE→Affiliations SHARE; take exact ClinicSchedulingSettings SHARE after the organization and before slot/booking locks. Re-read current settings/version after waits; publication snapshots the server-resolved timezone/configuration version, booking/replacement checks the current minimumBookingLead/horizon without changing the slot's stored snapshot. Require publication for new availability/bookings; ongoing clinical writes require current clinic/provider/membership scope, not public discoverability as a new clinical grant. Recheck identity/version/status after waits.
5. Acquire namespaced transaction advisory scheduling locks on patient and clinician identities in fixed kind/id order for absent-row/overlap work, then AvailabilitySlots in UUID order, Bookings in UUID order, Consultation/Encounter, document/intent lineage roots and exact operation ledger. Replacement takes the union of old/target scopes up front. Never book→slot, target→assignment, or ledger→User inversion. No nested legacy BP call that reacquires earlier locks; any later explicit BP adapter must obey Encounter→BP after this prefix and receive separate compatibility proof.
6. Recheck all required current authority/state/capacity/overlap/clock conditions from locked rows; mutate sources/events/operation outcome and append minimized audit atomically; final current user/session/role/clock check and required clinic/assignment checks before commit. Locks remain held. Unique constraints are final backstops, not permission checks.

ADMIN configuration transactions use the compatible operational subset: current ADMIN User NO KEY UPDATE→exact Session UPDATE→exact CLINIC Organization SHARE→ClinicSchedulingSettings UPDATE (or organization-serialized creation when absent). They acquire no clinician/patient/profile/assignment/booking locks and provide no clinical entitlement. Recheck current ADMIN/session/role/expiry after waits and before commit; expectedVersion mismatch conflicts without stale-authority retry. Preserve prior configuration versions and atomic safe audit. Publication/booking hold settings SHARE through their operation, so ADMIN changes serialize with them; whichever waits rechecks committed settings/version and current authority. Never acquire a late User/Session/Organization lock from settings.

Use existing bounded READ COMMITTED defaults: lock_timeout 5s, statement_timeout 10s, transaction maxWait 5s/timeout 30s. Sorted Users serialize same-clinician cross-clinic and same-patient competing writes; scheduling locks cover absent reservations, database constraints remain mandatory. A PostgreSQL exclusion constraint on effective reservation ranges (or equivalent database-enforced serialization plus tested constraints) must reject clinician and patient overlaps/capacity independently of application memory. No generic distributed lock service.

This is a proposed compatible graph, not a claim of deadlock freedom for arbitrary direct SQL. Legacy trigger/direct SQL inversion can abort; timeout/deadlock/serialization failures must roll back and return sanitized failure with **no stale-authority automatic retry**. Real PostgreSQL proof with existing I1/M2/seed graph is an implementation gate; if it requires changing legacy runtime locks, stop and seek separately bounded authorization. Revocation winning locks denies waiting operation; operation winning locks may commit before later revocation. Final expiry check is check-time protection, not stopping time until commit or recalling already sent responses.

## 18. Concurrency requirements

Real PostgreSQL, independent connections, bounded coordination, observed `pg_blocking_pids`/transaction identities, exact winner commit and rollback assertions. Application-memory-only or sleep-only tests are insufficient.

| Required race | Expected proof |
|---|---|
| Two patients, one slot/capacity | One reservation commits; loser receives safe conflict; rollback winner permits later contender; no patient leak |
| One patient, overlapping clinicians/times | At most one effective overlapping reservation across providers/clinics |
| One clinician, overlapping bookings | No overlap across clinics/slots, even distinct patients |
| Duplicate operation / changed payload | One retained result/event/audit; changed-payload reuse conflicts; rollback does not consume key |
| Cancel vs consultation open | Whichever serializes first determines legal state; never cancelled and opened; no partial encounter |
| Reschedule vs competing booking | Atomic target winner; failure keeps original intact |
| Reschedule winner commit | Linked old RESCHEDULED/new BOOKED once, target protected, old capacity released atomically |
| Reschedule winner rollback | Original remains BOOKED, no replacement/event/audit; contender can succeed without corrupting original |
| Clinician suspension / membership end | Both orderings, waiting publish/book/clinical writes deny after revocation; own patient logistics history retained |
| Clinician disable / actor session revoke | Both orderings, current checks after waits; no earlier session grandfathering |
| Patient disable / actor session revoke | Both orderings for booking/change/read; no stale owner ticket |
| Expiry during transaction | Tentative create/change/open/sign/intent + audit all roll back at final check, including exact replay |
| Assignment end / accepted withdrawal vs open/document/read | Ending first denies clinical operations; no implicit regrant or permanent-author access |
| Publication withdrawal | New eligibility uses current publication state; booked instants/history unchanged |
| Genuine bounded ADMIN config change vs publication/booking/replacement | Both orderings and winner commit/rollback against real PostgreSQL; current ADMIN session/user and exact clinic/settings version checked after waits, version conflict fails closed. Publication snapshots authoritative current clinic timezone; new booking/replacement uses current minimumBookingLead/horizon; immutable published/booked instants/timezone/config snapshots stay unchanged. No clinician config mutation or stale-authority retry |
| I1/M2/seed overlaps / real timeout/deadlock / audit failure | Existing graph preserved, bounded sanitized rollback, no retry, no partial history or invented consent |

## 19. Audit and history rules

Meaningful publish/withdraw/book/cancel/reschedule/attendance/open/close/document-sign/release/addendum/correction/privacy/intent/link transitions each have fixed action/entity codes in later slice contracts, genuine authenticated actor, actual database receipt time and exact immutable target. `safeMetadata={}`; narratives/reasons/clinical timestamps/booking patient identity stay in protected source/event records, never audit. No generic audit browser, sensitive logs, read/denial/failure/no-op noise or duplicate success audit on replay. Audit failure rolls back the full operation. Patient/clinic/source identities never move. Old source and signing/release/provenance remain preserved even when ordinary visibility is masked.

## 20. Test strategy and traceability

| Trace | Future acceptance proof |
|---|---|
| V3-FR-005 / D08 | Bounded duration/horizon and single minimumBookingLead cutoff, strictly-before/equality boundary; server-derived authoritative clinic timezone/offset/DST, rejection of caller timezone/version overrides, captured slot/config version preservation after change; current eligibility, publication/history, overlap/capacity and public field canaries |
| D28 operational scheduling configuration | Current ADMIN-only internal service; clinician/other-role mutation denial; no patient/consultation/authoring/impersonation/assignment entitlement; exact clinic/version compare-and-set, after-wait/final session checks, minimized atomic audit/rollback and real ADMIN config-vs-publication/booking races |
| V3-FR-006 / D09/10 | Own booking/history, exact clinician schedule, lifecycle/attendance/corrections, atomic failed replacement/safe retries; logistics never grants access |
| V3-FR-004/007 / D10/11-A/12 | Explicit existing bilateral workflow before mutation, current assignment/clinic/session, booking/encounter/treating/recorder distinctions and end/revocation |
| V3-FR-008 / D14 | Human bounded complaint/problems/diagnoses, four review states, no missing→negative/inference |
| V3-FR-009 / D13/15 | Author-only/private canaries, explicit sign-release, draft/closing denial, signed lineage/wrong-patient reference/count/retry masking |
| V3-FR-015 / D24 | Unbooked intent, explicit same-patient new-booking link, no twin writable legacy event, EH-012 compatibility |
| BR-001/002/020, AC-010/011, ERR-001 | Entire matrix, raw paths/IDOR/strict input/identity injection/CSRF/Origin/HEAD/no-store/errors and safe public/protected projections |
| D15/26/30/36 / FR-060/061 | Immutable history/atomic audit, M2 privacy/exact-pin/INITIAL regression, no routed authority or completion bridge |
| Migration and concurrency sections | Fresh/populated upgrade/redeploy/old rows/checksums, actual PG blocking/commit/rollback/revoke/expiry/deadlock |

Golden Journey A I2 exit: register→discover→view availability→book→establish explicit relationship→consult→human documentation→released summary/instructions→follow-up intent / follow-up booking where applicable, without CarePlan. **Full Golden Journey A remains incomplete until I3 prescription/test-order sources are implemented and verified.** No frontend simulation, policy coverage or contract text is executable proof.

Slice 1 checks: frozen install, lint, generate/Prisma validation/build/typecheck/unit, docs relative links/anchors, stale-status classification, D01–D36/ADR/historical preservation, exact docs-only allowlist/diff check and unchanged full Bootstrap gate on exact PR head. Future I2 tests above are not claimed executed in Slice 1. Retain all existing CI/migration/integration/runtime/smoke/cleanup/audit gates and independent review.

## 21. Proposed slices

| Slice | Boundary | Authorization |
|---|---|---|
| 1 | Contract/readiness/current-status reconciliation | AUTHORIZED docs only; PR handoff unmerged |
| 2 | Finite availability + clinician schedule publication foundation | NOT AUTHORIZED |
| 3 | Booking/cancel/reschedule/patient history/clinician schedule/attendance/no-show/concurrency | NOT AUTHORIZED |
| 4 | Consultation opening + booking/encounter/actual-treating provenance + current relationship gate | NOT AUTHORIZED |
| 5 | Complaint/problems/diagnoses/allergy review/private notes/released summary/instructions/signed addenda/corrections | NOT AUTHORIZED |
| 6 | Follow-up intent + new-booking integration + EH-012 compatibility | NOT AUTHORIZED |
| 7 | Combined I2 exit proof + independent security review | NOT AUTHORIZED |

No concrete repository reason required changing the Product Owner's proposed dependency order. Compatibility is tested in each affected slice, then combined in Slice 7. Every implementation slice needs a separately approved exact boundary; this table does not authorize execution.

## 22. Exit gate

I2 remains **INCOMPLETE** until every approved slice is merged after independent review of each exact PR head, successful exact-head CI, separate explicit merge authorization and successful exact-main post-merge CI. Preserve migration history and M0–M2/I1 regressions/invariants. Require real PostgreSQL booking/concurrency/revocation/expiry proof, IDOR/privacy/private-note boundary, released summary/signed correction/history proof, EH-012 compatibility, bounded Journey A I2 proof and combined independent I2 security exit review. Record actual evidence and unresolved limitations, never a predetermined test total or fabricated PASS.

Current handoff: **V3-I2 Slice 1 IMPLEMENTED / IN REVIEW — scheduling contract reconciliation pending final independent exact-head approval.** PR #49 OPEN / UNMERGED; Issue #48 OPEN. V3-I1 COMPLETE; I2 runtime implementation NOT STARTED. Slices 2–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. Do not merge or start Slice 2.
