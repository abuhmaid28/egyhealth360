# V3-I1 — Integrated Domain & Access Foundations Contract

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Slices 1–5 COMPLETE; PR #45 merged at `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, exact-main [Bootstrap 40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467) SUCCESS; [Slice 5 completion 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6 exit/security review](V3_I1_SLICE6_EXIT_REVIEW.md) IMPLEMENTED / IN REVIEW under [authorization 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). V3-I1 INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.

## Authority and delivery status

[Issue #39](https://github.com/abuhmaid28/egyhealth360/issues/39) records Product Owner approval of the complete I1 contract; [comment 6356123914](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6356123914) authorized **Slice 1 only: documentation adoption and compatibility inventory**. Slice 1 is merged/verified through PR #40 at `a03c0b63a0ed44bcf39a32428002af0c92edc7e0` / CI 39948145751 SUCCESS; [comment 6366843150](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6366843150) separately authorizes Slice 2 only (now COMPLETE in PR #41 / exact-main CI 40010140478). Comment [6374281944](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6374281944) separately authorizes Slice 3. See [bounded implementation](V3_I1_SLICE2.md) and [validation](V3_I1_SLICE2_VALIDATION.md). No D37+ product decision is required. [D01–D36](PRODUCT_V3_DECISIONS.md) remain frozen, including D06-A, D11-A, D18-A, D23-B and D36.

| Area | Status |
|---|---|
| Product V3 policy / V3-G0 | APPROVED / COMPLETE |
| M0 / M1 / M2 | COMPLETE; historical contracts and implementation preserved |
| V3-I1 contract | APPROVED; this document adopts Issue #39 |
| Slice 1 | Merged/verified (PR #40; exact-main CI 39948145751 SUCCESS) |
| V3-I1 runtime implementation | Slice 2 COMPLETE; Slice 3 COMPLETE; overall NOT COMPLETE |
| Slice 2 | COMPLETE — PR #41 merged, exact-main CI 40010140478 SUCCESS |
| Slice 3 | COMPLETE after PR #43 / exact-main CI 40116846242 SUCCESS |
| Slice 4 | COMPLETE — PR #44 merged, exact-main CI 40195060034 SUCCESS |
| Slice 5 | COMPLETE — PR #45 / exact-main CI 40252309467 |
| Slice 6 | IMPLEMENTED / IN REVIEW — authorization 6406691109 |
| EACCE | NOT STARTED |
| Product UI/design | FROZEN; no design unfreeze |

Historical Slice 1 reviewed starting main (not the Slice 5 starting gate): `091c612aca77ae41941fd1183f2de1cc380b1b30`; [PR #38](https://github.com/abuhmaid28/egyhealth360/pull/38) MERGED. [Bootstrap 39889035960](https://github.com/abuhmaid28/egyhealth360/actions/runs/39889035960), push/main on that exact SHA, completed SUCCESS. Its validate job completed install/generate/lint/Prisma/build/typecheck/unit, PostgreSQL/migrations/integration/auth measurement, both audits, Docker/config/build/startup, container auth/authorization, auth/authorization/M1/clinical/CareAction runtime, smoke and cleanup. Observed logs report 67 unit and 407 integration tests passing and both audits clean. These are baseline remote results, not execution of future I1 tests.

This contract governs later separately authorized I1 slices. It adds no runtime capability, schema, SQL, endpoint or OpenAPI change. Accepted M0–M2 contracts retain their original applicability; this document does not fabricate historical consent or retroactively redefine them.

## Scope and slice gates

I1 establishes patient registration/own profile, curated public clinician/specialty/clinic information, bounded organizations/staff membership, bilateral enrollment around the existing clinical grant, and current-authority/history/privacy foundations. Retain Next.js, NestJS modular monolith, PostgreSQL, Prisma, shared TypeScript packages, Docker and GitHub Actions. No architectural rewrite or new dependency is implied.

| Slice | Approved bounded scope | Current authorization / delivery |
|---|---|---|
| 1 | Contract adoption and compatibility inventory | Merged/verified |
| 2 | Fixed roles, organizations and memberships | COMPLETE |
| 3 | Patient registration and own profile | COMPLETE |
| 4 | Curated public provider directory | COMPLETE — PR #44 merged; exact-main CI 40195060034 SUCCESS |
| 5 | Bilateral relationship lifecycle | COMPLETE — PR #45 / exact-main CI 40252309467 |
| 6 | Combined I1 exit proof and independent security review | IMPLEMENTED / IN REVIEW — 6406691109 |

**Out of I1:** availability/slots/reservations/booking engine; general consultations/encounters, diagnoses/problems, private notes/released summaries; prescriptions/dispensing; lab order/result fulfillment; imaging; timeline/notifications/reminders; EACCE/recurrence/research pipeline; product UI/UX/wireframes/screens/branding/Design System; payments/insurance/video/delivery; ERP/LIS/PACS; diagnostic AI/treatment or dose recommendation; production deployment. Existing EH-012 follow-up behavior remains intact; it is not an I1 booking implementation.

## Minimal domain foundation

REUSE, EXTEND, NEW and DEFER retain the approved Slice 1 design classifications, not current implementation status. NEW identified concepts absent at that historical baseline; subsequent authorized slices deliver the subsets listed in the current status and API delivery rows. The current DATA_MODEL/API inventories and slice contracts identify executable models, fields and methods; DEFER still excludes implementation from I1.

| Concept | Treatment | Contract |
|---|---|---|
| User | EXTEND | Retain identity/canonical email/password/status; add only the two bounded staff roles and managed operations; one fixed role per account |
| PatientProfile | EXTEND | Retain PATIENT discriminator/ownership; patient registration and own permitted profile operations, no clinical authoring |
| ClinicianProfile | EXTEND | Retain CLINICIAN discriminator and private professional data; explicit curated specialty/publication projection, no inferred specialty verification |
| Session | REUSE | Current server-side session/expiry/revocation and browser protection; no cached relationship/membership ticket |
| AuditLog | REUSE | Atomic minimized append-only events; no broad audit browser |
| ClinicianPatientAssignment | EXTEND | Sole effective clinical grant; retain exact row identity, ACTIVE/ENDED rules, partial active-pair uniqueness and historical references; add truthful provenance around it |
| Organization | NEW | Simple clinic/laboratory/pharmacy identity, bounded operational/public information and current status; no facility tree |
| Specialty | NEW | Small curated catalog; no automatic conversion of legacy free-text specialty into verified catalog membership |
| OrganizationMembership | NEW | Compatible user–organization operational grant, current status and preserved grant/end provenance; multiple compatible memberships allowed |
| RelationshipRequest | NEW | Patient authorization and clinician disposition/provenance, binding to exact assignment on acceptance; not a second clinical grant |
| Booking, consultation, fulfillment, timeline, research concepts | DEFER | I2+ contracts; no hidden implementation in I1 |

## Fixed roles, organizations and memberships

Future fixed roles are PATIENT, CLINICIAN, LAB_STAFF, PHARMACY_STAFF and ADMIN. At the Slice 1 baseline only PATIENT, CLINICIAN and ADMIN existed; Slice 2 implements the two staff roles (now COMPLETE). One fixed role per account; no ordinary role switching, generalized IAM, arbitrary permission builder or client-selected privileged registration. Clinician/staff/admin accounts remain managed. Account role alone never confers patient clinical access.

Organizations have stable identity and kind (clinic, laboratory, pharmacy), bounded name/location information where needed and current operational status. Suspension disables organization-scoped authority without deleting identity/history. Restoration must be explicit and audited; it does not reactivate an ended membership. Publication is separate from operational status. No enterprise hierarchy or hard fixture-count limit is required.

| Account role | Compatible organization kind | Meaning |
|---|---|---|
| CLINICIAN | clinic | Professional affiliation/operational organization scope, not patient consent |
| LAB_STAFF | laboratory | Bounded staff organization scope, not order or patient authority |
| PHARMACY_STAFF | pharmacy | Bounded staff organization scope, not prescription or patient authority |
| PATIENT / ADMIN | None under this membership model | Patient ownership / operational administration are separate authorities |

At most one ACTIVE membership per user–organization pair; multiple compatible organizations are allowed. Preserve grant identity, actor/time and ending actor/time. Ending is terminal for that row; explicit regrant creates a new row. No self-grant or role/kind mismatch. Current user, session, organization and exact membership must be checked for each scoped operation. Client-supplied organization/user/role IDs are targets, never credentials. Do not cache an earlier successful check as a reusable ticket.

A clinician's organization affiliation does not replace or silently terminate the patient assignment. Ending an assignment and ending a membership are distinct operations. Organization suspension blocks organization-scoped operations; it does not automatically erase patient-owned history or rewrite existing M0–M2 access rules.

### D36 dependency boundary

All ten [D36 principles](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension) remain in force. I1 supplies current organization/membership foundations only. **I3 must additionally verify the exact routed artifact and its current authority**; membership alone never fulfills D36. No lab/pharmacy patient browsing, order/result access or dispensing is implemented in I1. Future completed-artifact correction access remains bounded by current authority/privacy; suspension blocks subsequent access, cancellation blocks future fulfillment, and history is retained. Relationship ending does not silently cancel valid routed sources. Patient and other clinicians use their independent authority. ADMIN gains no clinical payload/fulfillment rights; no break-glass, forensic or permanent-author exception.

## Patient registration and profile contract

Required registration input is email, password and display name only. Role PATIENT and status ACTIVE are server-owned; reject privileged-role/owner/status injection and unknown authority-bearing fields. Reuse the existing canonical email function: trim bounded outer ASCII whitespace, lowercase ASCII, printable nonwhitespace ASCII and one @ with nonempty parts; do not fold dots/plus aliases or invent internationalized identity rules.

Reuse the existing Argon2id codec/parameters and unmodified password bytes; no second codec, paid identity service or production-assurance claim. A dedicated non-simple registration header is REQUIRED in addition to strict JSON and the Origin/Fetch Metadata controls below. Freeze the exact registration-header name/value, detailed enrollment input bounds and error serialization in the separately authorized registration slice without altering existing login's 1–1024 UTF-8 byte contract. Required non-enumeration, bounded input/hash concurrency and throttling are not optional. No distributed/paid service dependency is required.

User, PatientProfile and successful minimized audit commit atomically. Unique canonical email is the final concurrency backstop. A valid duplicate/retry must not overwrite credentials/profile, create a second identity, expose account existence/status or issue a session. Return a generic non-enumerating acknowledgement rather than returning an existing account identifier; infrastructure failure remains a sanitized failure, not false success. No audit of failed/duplicate attempts containing supplied identity or secrets. No constant-time guarantee is claimed.

Successful registration does not log in, set a new session cookie or rotate an existing session; explicit existing login follows. Anonymous registration needs exact configured Origin, Fetch Metadata rejection of cross-site requests, strict JSON/size/shape, the dedicated non-simple registration header and an explicit guarded anonymous mutation contract. Check origin before expensive hashing. Missing Fetch Metadata must not bypass required Origin/header checks. Authenticated mutations retain existing session/CSRF checks unchanged. No CORS relaxation, paid verification or full password-recovery platform is included.

Own-profile operations derive the patient from the authenticated principal. Only permitted existing profile data may be read/updated; no arbitrary user/profile reassignment, role/status/email/password changes through profile mutation, or clinical facts inferred from demographic edits. DOB/sex remain profile context, not automatic applicability evidence. Audit successful changes minimally and preserve M1's fixed fixture expectations.


Slice 3 freezes the approved implementation details in [registration/profile contract](V3_I1_SLICE3.md): X-EH-Register: 1, 202 generic acknowledgement, existing-codec 1–1024-byte passwords, 1024-byte email representation, 160-scalar displayName, 16KiB body/8192-byte header bounds, two active local registration operations/30 attempts per minute, explicit login and the three-field own-profile projection. No I1 policy choice changes; [evidence](V3_I1_SLICE3_VALIDATION.md) is distinct from this historical readiness inventory.

## Published directory foundation

Expose only explicitly published doctor display identity, curated specialty, approved clinic affiliation and bounded public clinic/location information. An intentional public directory identifier is a locator, never authority. Publication requires eligible current account/organization/affiliation state; unpublication or suspension removes the affected public projection on the next current read. Do not publish account email/user identifiers, private professional identifiers, internal membership/grant data, patient associations, appointments or clinical content. No availability, slot, rating, marketplace or clinical search capability is included. Managed publication must not automatically publish every existing clinician or infer verified specialty from old free text.

Slice 4 freezes the physical/API implementation of this published-directory subset in [its contract](V3_I1_SLICE4.md) and [validation](V3_I1_SLICE4_VALIDATION.md), under comment 6391008285. It adds no clinical authority. The original Slice 1 compatibility inventory below remains historical; new model/route inventories are explicit in the Slice 4 inventory and current DATA_MODEL/API.

## Bilateral enrollment and assignment compatibility

**ClinicianPatientAssignment is the sole effective patient–clinician clinical grant.** RelationshipRequest records enrollment/provenance; it never independently authorizes clinical access. No competing relationship table, cached ACTIVE copy or OR-based alternate authority is permitted.

1. The authenticated patient explicitly authorizes a continuing relationship with a designated clinician. Record stable request identity, patient/clinician identity, truthful patient authorization actor/time and authorization context. A request does not grant access.
2. Only the designated currently authorized clinician accepts or declines that exact request. Pending-request access exposes only necessary enrollment identity, not clinical records or a global patient directory.
3. Dispositions are PENDING, ACCEPTED, DECLINED and WITHDRAWN. Preserve terminal outcomes and actual actors/times. Acceptance atomically binds or establishes the exact ACTIVE assignment and records clinician acceptance; no partial accepted-without-grant result.
4. Either participant can end the exact active assignment. Preserve ended time and actor provenance; operational reason handling must remain bounded, with no unnecessary clinical narrative in audit. ACTIVE → ENDED is terminal for that assignment row. Ended rows cannot be reactivated, retargeted or removed.
5. Re-establishment requires a fresh patient authorization and clinician acceptance and a new assignment row. An old end/retry must never end a later grant for the same pair. Accepted request history is retained even after its bound assignment ends.
6. Current assignment, current actor/session and resource-specific policy remain required on subsequent access. Authorship, booking, a pending request, an old accepted request or clinic membership is never sufficient. Other clinicians require their own grant. Future private-note policy remains separately restrictive.

Legacy ACTIVE assignments continue to satisfy accepted M0–M2 resource checks; no silent additional consent predicate is imposed on those historical resources. They are **not evidence of V3 bilateral consent**. A future enrollment may truthfully confirm an existing ACTIVE assignment, retaining its original assignedAt and recording the later authorization/acceptance separately. New V3 establishment must use the bilateral workflow; no new product path may expose the legacy direct assign helper as an ADMIN shortcut. No consent backfill or historical clinical-row rewrite.

One unresolved request per pair and one active assignment per pair are concurrency invariants. Exact authenticated retries preserve the original outcome/identity/time without duplicate audit; changed payload must not reuse a successful operation identity. Terminal retries never regrant. A fresh request after a terminal outcome is distinguishable from replay. Request operation identity and database uniqueness must support this without a generic workflow engine.

## Authorization matrix

This matrix is the approved I1 authority policy, not an endpoint inventory or an I1 completion claim. Slices 2–4 have delivered their applicable operational membership, registration/profile and published-directory subsets; Slice 5 relationship entries are COMPLETE. Slice 6 combined exit obligations are authorized and in progress; no I1 completion is claimed. Current API and slice contracts identify delivered methods. Every nonpublic operation requires a current ACTIVE user and valid current session. Unlisted permissions are denied. Public directory access is the same minimized projection for every actor.

| Resource/action | Public | PATIENT | CLINICIAN | LAB_STAFF / PHARMACY_STAFF | ADMIN |
|---|---|---|---|---|---|
| Patient registration | Guarded anonymous mutation | No privileged conversion; same patient-only registration boundary | No role conversion | No role conversion | No role conversion |
| Published clinician/specialty/clinic projection | Allowlisted only | Public | Public | Public | Public |
| Own permitted patient profile | Denied | Own only | Existing scoped patient read only with ACTIVE assignment; no patient-profile editing entitlement | Denied | Denied clinical/profile payload |
| Another patient's information | Denied | Denied | Current exact assignment plus module policy | Denied | Denied |
| Private clinician/account data | Denied | Denied | Own permitted fields | Own permitted account fields only | Minimum operational provisioning/status fields; no clinical content |
| Organization operations | Published projection only | Public projection only | Exact current compatible membership for permitted operational reads | Exact current compatible membership for permitted operational reads | Bounded operational create/status/publication management |
| Grant/end staff membership | Denied | Denied | No self-administration | No self-administration | Managed compatible grants/ending; no clinical entitlement |
| Authorize/withdraw request | Denied | Own exact request | Denied patient impersonation | Denied | Denied consent manufacture |
| Accept/decline request | Denied | Denied clinician impersonation | Designated clinician only | Denied | Denied |
| End assignment | Denied | Exact participant | Exact participant | Denied | No relationship manufacture/participant impersonation |
| Relationship history | Denied | Own minimized provenance | Own participant provenance only, not clinical history after ending | Denied | No broad relationship/clinical browser |
| Existing M0–M2 clinical resources | Denied | Existing module-specific own permissions | Existing ACTIVE-assignment and module-specific permissions | Denied | Denied |
| Operational user/status/catalog administration | Denied | Denied | Denied | Denied | Bounded operational only |

History access does not revive clinical authority. Current object scope is checked before revealing existence, payload or conflict detail; preserve generic object denial. Replacing patient/profile/request/assignment/organization/membership IDs, nested IDs, role headers or user IDs must never widen scope. No global clinician patient search, staff patient browser, raw-history/forensic endpoint, broad audit browser, impersonation or break-glass.

## History, privacy and audit

Existing assignment identity/endpoints/start time, terminal outcomes, clinical sources and audit remain preserved. Mutable own profile and curated public descriptive fields are not immutable clinical evidence; changes must not rewrite historical clinical provenance. Membership and enrollment history retain actual grants/authorization/acceptance/ending, rather than destructive replacement or silent reactivation. Deactivation/unpublication is separate from deleting history.

Successful new registration, managed identity/status/organization/membership/publication changes and relationship mutations require atomic minimized AuditLog events. Exact no-ops/retries and reads/denials do not fabricate successful mutation events. Reuse fixed action/entity references, genuine actors/time and empty metadata unless separately reviewed safe fields are essential. Registration's new identity is not an authenticated session; its audit must truthfully describe the creation, not pretend prior authentication. Never store passwords/hashes/tokens/CSRF, request bodies, clinical narrative or consent text in generic audit metadata.

Retain wrong-patient masking of clinical payload, references, counts and retries. I1 history cannot bypass it. Private notes and released summaries belong to I2; no I1 directory, enrollment or admin projection may pre-authorize their disclosure. Audit and patient timeline are distinct; neither a timeline nor a generic audit reader is added here.

## Concurrency and revocation guarantees

The table originated as required I1 proof obligations at the Slice 1 baseline; it remains the required concurrency contract. Authorized implemented slices now provide executed evidence for their applicable cases: [Slice 2](V3_I1_SLICE2_VALIDATION.md), [Slice 3](V3_I1_SLICE3_VALIDATION.md), [Slice 4](V3_I1_SLICE4_VALIDATION.md) and [Slice 5](V3_I1_SLICE5_VALIDATION.md). Slice 5 is COMPLETE with real PostgreSQL independent-connection blocking/race/rollback evidence, including M2 clinical and M1 seed-lock overlap. Slice 6 combined exit proof is IMPLEMENTED / IN REVIEW; V3-I1 remains INCOMPLETE. Database constraints protect cardinality/history; scoped transactions serialize mutations and audit, and current-authority rechecks follow waits. Never rely only on a preflight query or an API guard.

| Race/failure | Required outcome and mechanism |
|---|---|
| Duplicate registration | Unique canonical email; one atomic User/profile/audit winner; loser does not overwrite or leak identity; rollback leaves no orphan |
| Duplicate membership grant | Unique ACTIVE pair plus compatible role/kind checks; serialize pair grant/end, exact retries no new history/audit; ended rows never reused |
| Duplicate/unresolved request | Unique unresolved pair and stable operation identity; exact replay same outcome; conflicting payload rejected; terminal replay cannot create a fresh grant |
| Concurrent acceptance | Lock/recheck exact request and pair; at most one accepted binding/ACTIVE grant/audit result; winner rollback permits legitimate retry |
| Accept versus withdraw | Serialize exact request and recheck disposition. Withdrawal winning prevents acceptance. If acceptance wins first, a successful withdrawal of that exact authorization MUST atomically end its bound ACTIVE assignment (or preserve the exact already-ended terminal state) while retaining truthful ACCEPTED history; it must not require a separate later end command. Never acknowledge successful withdrawal while the authorization's bound grant remains active |
| Relationship end | Serialize exact assignment; terminal end, one actual transition/audit, current reads subsequently deny; authorized exact end retry does not rewrite history |
| Old end versus new grant | Target immutable assignment identity, not whichever row is active for the pair; new establishment requires fresh bilateral provenance |
| User disable | Current user check under compatible locks; disable visible before authorization denies; already serialized valid operation may commit first. Future managed disable must revoke existing sessions so reenabling cannot revive them; no retroactive claim about legacy direct SQL |
| Session expiry/revocation | Lock exact session for mutation and perform final current session/user/role/expiry check; rollback on failed final check; no renewal or stale ticket |
| Organization suspension | Serialize organization-scoped mutation with status change; recheck after wait; next access denies while suspended, without deleting history |
| Membership ending | Serialize exact membership/current organization authority; next scoped access denies; stale membership ID cannot authorize a regrant |
| Audit failure | All related new state rolls back; no partial account/profile, grant or accepted request |
| Lock/deadlock/timeout failure | Bounded sanitized failure and complete rollback; no hidden retry with stale authorization, no partially successful acknowledgement |

Preserve existing M2 ordering: actor user FOR NO KEY UPDATE → exact session FOR UPDATE → clinician profile FOR SHARE → ACTIVE/null-ended assignment FOR SHARE → patient lock → scoped resource locks. EH-014 generation takes patient FOR UPDATE before plan/template/selected BP, while other operations use their accepted compatible modes. Do not acquire an exclusive patient lock and then wait for an assignment held by an M2 operation that is waiting for that patient.

Pair serialization must also cover absent rows (row locks alone cannot serialize absence); combine uniqueness with a bounded pair-scoped transaction lock or equivalent demonstrated serialization. For operations locking multiple users/peers, establish a stable ordering before descending to session/profile/assignment locks. Organization-before-membership ordering must be consistent across scoped operations and revocation. Slice 5 implements pair-scoped transaction advisory locking and a reviewed lock graph against existing M2 helpers; its [transaction contract](V3_I1_SLICE5.md#transactions-races-and-revocation) and [executed overlap evidence](V3_I1_SLICE5_VALIDATION.md#real-postgresql-concurrency-and-rollback-evidence) record the result without changing those helpers. Further authorized changes must preserve and re-review the complete lock graph, not change M2 helpers casually.

Existing M2 uses READ COMMITTED, lock timeout 5s, statement timeout 10s, maxWait 5s and transaction bound 30s, with final expiry checks and no automatic stale retry. Preserve those accepted assumptions. A final clock check cannot stop time; no claim of response recall or universal serializable reads is made. EH-007's single-statement snapshot may overlap a later committed revocation; the next current-authority check must deny. No cached membership/relationship authority is a substitute.

Prove both operation orderings and winner commit/rollback on real PostgreSQL, with independent connections, bounded waits and observed blocker evidence (not sleep-only mock races). Include overlap with existing M2 clinical operations and seed locking. Authorized Slice 5 finalized its locks/SQL under these guarantees and records the executed cases in its implementation/validation contracts linked above. Those details remain subject to independent exact-head review; future authorized implementation must meet the same guarantees, and no Slice 6 combined exit proof or I1 completion is claimed here.

## Compatibility inventory — reviewed runtime baseline

PRESERVE EXACTLY protects existing observable behavior/invariants; EXTEND ADDITIVELY permits bounded authorized additions; FUTURE NEW described absence at the reviewed Slice 1 baseline; DEFER is outside I1. The invariant rows and baseline schema/test evidence retain that historical context. The explicit API delivery rows below record the current Slice 3–5 status without rewriting Slice 1 evidence. Existing historical clinical APIs remain governed by their accepted contracts; V3-I1 is INCOMPLETE.

| Existing behavior / source | Classification | Protected invariant and future extension boundary |
|---|---|---|
| [User identity persistence](../packages/db/src/persistence.ts) | PRESERVE EXACTLY | Canonical unique email, UUID identity, atomic role-bound profile creation, no password hash in returned projection; no dot/plus folding |
| Current PATIENT/CLINICIAN/ADMIN role inventory | EXTEND ADDITIVELY | Preserve meanings/denials; later add only LAB_STAFF/PHARMACY_STAFF and bounded principal/provisioning handling; one role/account |
| ACTIVE/DISABLED user state | EXTEND ADDITIVELY | Existing inactive-user denial retained; future managed disable/session revocation contract does not pretend raw SQL already revokes session rows |
| PatientProfile / ClinicianProfile | EXTEND ADDITIVELY | Unique user_id, fixed discriminator CHECKs, composite RESTRICT user-role FKs; no cross-role profile. Preserve optional opaque sex/free-text specialty/private professional identifier; no automatic clinical or verified mapping |
| [Session persistence](../packages/db/src/auth.ts) | PRESERVE EXACTLY | SHA256 token lookup only, current ACTIVE account/expiry/revocation, absolute 8h lifetime, multiple sessions, current-browser replacement only, atomic audit before cookie emission, no sliding renewal |
| [Password codec](../apps/api/src/password.ts) | PRESERVE EXACTLY | Application-specific 109-byte eh-pw-v1 envelope; Argon2id v19, 65536 KiB/3 passes/parallelism1, salt16/key32, canonical base64url, dummy verification and sanitized failure; no stored-parameter execution |
| [Origin/Fetch Metadata/CSRF](../apps/api/src/auth.ts) | PRESERVE EXACTLY | Exact configured Origin and accepted Fetch Metadata; no bypass from same-site/none or missing metadata; strict cookies, session-derived HMAC CSRF on authenticated mutations; registration adds its own guarded entry |
| [Patient self / clinician ACTIVE-assignment profile read](../packages/db/src/authorization.ts) | PRESERVE EXACTLY | Single scoped READ COMMITTED statement rechecks principal/session/account/role and maps correct profile; projection id/displayName only; no reusable ticket, no blanket clinical read |
| ADMIN patient-data denial | PRESERVE EXACTLY | Generic denial on existing patient/clinical resources; no staff/ADMIN carve-out, impersonation or permanent author |
| Assignment lifecycle and uniqueness | PRESERVE EXACTLY | Immutable ID/endpoints/assignedAt; ACTIVE/null endedAt or ENDED chronological end; terminal history; partial unique ACTIVE pair; no delete/truncate; new grant is a new row |
| Assignment enrollment provenance | EXTEND ADDITIVELY | Exact assignment remains sole effective grant; request history binds to it; legacy rows have no fabricated bilateral proof; CareActionDecision.assignmentId remains intact |
| [AuditLog](../packages/db/src/audit.ts) | PRESERVE EXACTLY | Append-only statement guards reject UPDATE/DELETE/TRUNCATE even zero-row statements; atomic genuine events with minimized metadata, no general reader. SQL object-only metadata constraint alone is not secret detection |
| [M1 fixture](../packages/db/src/demo.ts), [EH-008](EH-008_DEMO_IDENTITIES.md) | PRESERVE EXACTLY | eh-m1-demo-v1 five fixed identities, two patient/two clinician profiles, optional fields NULL, one exact active edge; actual UUID/time/salted hashes retained; repeat zero inserts; conflict rollback and ended-only pair fail closed |
| M1 CLI/verification boundary | PRESERVE EXACTLY | Explicit development/test opt-in, private password/no default; no production/startup seed; required historical checksums plus allowed later migrations; no fabricated seed sessions/audits; real login/logout verification retains genuine history |
| [Clinical definition contract](EH-009_CLINICAL_DEFINITION_CONTRACT.md) | PRESERVE EXACTLY | Exact approved publication/version pins, immutable published/retired source history and guards; no arbitrary clinical rule/editor |
| [CarePlan](EH-010_CARE_PLAN_CONTRACT.md) | PRESERVE EXACTLY | Assigned clinician service only, exact published pins, DRAFT/ACTIVE/CANCELLED history and active uniqueness, atomic audit/current locked authority; no new route |
| [BP](EH-011_BP_PROVENANCE_CONTRACT.md) | PRESERVE EXACTLY | Own patient/current assigned clinician, server-derived source/actor, immutable paired evidence, strict parser/history, non-idempotent accepted POST; no inferred clinical qualification |
| [Follow-up/encounter](EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md) | PRESERVE EXACTLY | SCHEDULED/CANCELLED HTN-purpose appointments, clinician writes/patient reads, immutable encounter/BP association, same-patient constraints; not booking or qualifying completion |
| [Coverage](EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md) | PRESERVE EXACTLY | Internal synthetic assertions, immutable deduplicated history; partitioned normalization and preserved silent gaps; no public write or clinical-completion inference |
| [Applicability](EH-015_OBSERVED_APPLICABILITY_CONTRACT.md) | PRESERVE EXACTLY | Protected synthetic observed snapshots/retractions, null/unknown/absent distinct, no truth leakage or inferred demographics; current scoped reads, immutable source and terminal retraction |
| [Correction/privacy](BP_CORRECTION_INVALIDATION_CONTRACT.md) | PRESERVE EXACTLY | Fresh full-pair same-patient corrections, terminal exclusion, independent wrong-patient masking including references/counts/retries, no source move/raw forensic route |
| [INITIAL CareAction](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) | PRESERVE EXACTLY | R1–R8, explicit clinician selection, exact plan/rule/applicability/BP snapshot, unique INITIAL/replay, protected decision/history and calendar, current privacy, atomic audits; no recurrence/closure/automatic bridge |
| Existing authorization locks/concurrency | PRESERVE EXACTLY | Current user/session/profile/assignment/patient/resource order, bounded waits, final expiry, no stale retry; retain EH-007 snapshot limitation rather than claiming stronger historic guarantees |
| Organization / Specialty / OrganizationMembership / RelationshipRequest | EXTEND ADDITIVELY | First three delivered in Slices 2/4; RelationshipRequest delivered in Slice 5 (COMPLETE), provenance only; no generalized IAM/facility/workflow engine |
| Registration / own-profile APIs | DELIVERED — Slice 3 COMPLETE | Guarded registration and authenticated own-profile GET/HEAD/PUT are live; [Slice 3 contract](V3_I1_SLICE3.md) and current OpenAPI govern them; historical clinical API contracts remain unchanged |
| Public directory APIs | DELIVERED — Slice 4 COMPLETE | Published specialty/clinic/provider GET/HEAD resources are live; [Slice 4 contract](V3_I1_SLICE4.md) and current OpenAPI govern the minimized public projection |
| Bilateral enrollment APIs | COMPLETE — Slice 5 | Participant authorization/accept/decline/withdraw/history/exact assignment end are delivered in Slice 5; [Slice 5 contract](V3_I1_SLICE5.md) and current OpenAPI govern them; ClinicianPatientAssignment remains the sole clinical grant; this does not complete I1 |
| General booking/consultation, fulfillment, timeline, notifications, EACCE/UI | DEFER | Later milestone contracts only; D36 artifact authorization deferred to I3 |

Database guards protect ordinary writes, not schema owners/superusers. Existing schema has no mandatory-profile SQL constraint, global role-immutability trigger or universal user/profile delete guard. Do not confuse future managed API restrictions with already-enforced database guarantees.

### Exact schema and test inventory extension points

Baseline [Prisma schema](../packages/db/prisma/schema.prisma) has 23 models: User, Session, PatientProfile, ClinicianProfile, ClinicianPatientAssignment, AuditLog, GuidelineSource, CarePlanTemplate, CareRuleDefinition, CarePlan, BloodPressureMeasurement, FollowUpAppointment, ClinicalEncounter, EncounterBloodPressureAssociation, RecordCoverageWindow, ObservedClinicalApplicabilitySnapshot, ObservedClinicalApplicabilityRetraction, BpAmendmentOperation, BpExclusion, BpPrivacyTarget, CareAction, CareActionDecision and CareActionApplicabilityInput. There are ten historical migration SQL files.

[Catalog tests](../tests/integration/catalog.test.mjs) assert exact tables/enums, CHECKs, FKs/index predicates/functions/triggers. [CareAction unit boundary tests](../tests/care-actions.test.mjs) assert the exact approved model boundary; historical clinical suites also assert absence of unapproved models. Later authorized schema additions must explicitly extend the latest-schema inventories for only approved objects and role values, preserving exact checks rather than replacing them with permissive subset assertions. Keep isolated historical migration suites on their historical baselines. No test expectation changes in Slice 1.

[Identity integration tests](../tests/integration/identity.test.mjs), [authorization integration tests](../tests/integration/authorization.test.mjs), [CareAction integration tests](../tests/integration/care-actions.test.mjs), demo/auth suites and [migration verifier](../scripts/verify-migrations.mjs) remain regression evidence. Preserve canonical identity/profile constraints, direct SQL/Prisma bypass denials, ACTIVE pair contention, terminal history, genuine HTTP IDOR, snapshot semantics, actual blocking races, audit failure rollback and wrong-patient privacy. Baseline counts are historical observations, not fixed future totals or substitutes for coverage.

## Additive migration and fixture strategy

No migration is created in Slice 1. Preserve all ten historical SQL files and ledger checksums. Later migrations must prove fresh deploy, populated ten-migration upgrade, repeated deploy/status and retained identity/session/audit/assignment/clinical rows and constraints. No destructive rename/replacement of ClinicianPatientAssignment or its historical foreign references. New enrollment provenance starts with actual new actions, not synthetic backfill.

Plan PostgreSQL enum extension so new values are committed before use where PostgreSQL prohibits use of an uncommitted added enum value. Do not modify old migrations to avoid this restriction. Explicitly test deployment through the repository migration runner on PostgreSQL, not only generated Prisma types.

No invented consent, organization membership, verified specialty or clinical evidence backfill. Existing specialty text and optional M1 fields stay unchanged. M1 deterministic fixture behavior and checksums remain protected; separately version any integrated V3 synthetic fixture and ensure it does not invalidate M1's fixed identities/edge constraints. Schema migration and fixture evolution are separate operations. No implementation-bearing V3 fixture is added in Slice 1.

## Future logical API and architecture map

The organization/membership operational subset is COMPLETE internally in Slice 2; registration/own-profile HTTP COMPLETE in Slice 3. Slice 4 completed the approved public directory routes and internal ADMIN specialty/publication service via PR #44; see [exact contract](V3_I1_SLICE4.md). [Slice 5](V3_I1_SLICE5.md) delivers participant enrollment/history/end (COMPLETE). Keep public validation separate from narrow current-principal persistence, without raw client or alternate clinical authority.

| Group | Intended authority |
|---|---|
| Anonymous patient registration | Guarded patient-only creation, no session issuance |
| Authenticated own patient profile | Current principal-derived ownership, permitted fields only |
| Public provider directory | Explicit published allowlist only, no availability in I1 |
| Managed users/organizations/specialties/publication | Bounded operational ADMIN; no clinical payload/impersonation |
| Organization membership grants/ending and scoped reads | Managed compatible grant; current exact organization membership for scoped staff reads, no patient browsing |
| Patient relationship authorization/withdrawal/history/end | Exact patient participant, minimal provenance |
| Clinician request acceptance/decline/history/end | Exact designated clinician/assignment participant; pending status never clinical access |

Existing [API/OpenAPI](API.md) remains authoritative for delivered methods. Registration/own-profile reuse current session/browser controls; any future managed directory/membership HTTP adapter must do so as well; relationship operations bind the existing assignment. No booking, consultation, prescription, lab-result or dispensing API belongs to I1. No frontend or visual work is implied by these resource groups.

## Acceptance, traceability and exit proof

All I1 evidence below is **required future evidence / NOT EXECUTED by Slice 1**.

| Trace | Required proof |
|---|---|
| V3-FR-001 / D06-A | Registration succeeds atomically; fixed role/status, no role injection; canonical duplicate/race non-enumeration; explicit login; dedicated non-simple registration header plus Origin/Fetch Metadata/body/hash bounds and throttling; audit rollback; own-profile IDOR denial |
| V3-FR-002 / D02/07 | Published allowlist only; private email/professional/account/membership/patient fields absent; inactive/unpublished handling; curated specialty without fake legacy verification; no availability |
| V3-FR-003 / D05/28/36 | Compatible fixed roles/kinds, multi-org membership isolation, duplicate ACTIVE prevention, terminal ending/new grant, user/org/membership suspension and no patient browsing; membership never artifact authority |
| V3-FR-004 / D10/11-A | Both sides required; designated clinician only; exact assignment binding; pending/declined/withdrawn denied; accept-vs-withdraw both orderings including successful post-accept withdrawal ending the exact bound assignment; legacy truthful confirmation; explicit either-side end, no reactivation/permanent author, current checks and exact historical replay |
| V3-FR-018 / D28/36 | ADMIN operations cannot manufacture consent, read clinical payload, impersonate or perform fulfillment; minimized operational projections |
| BR-001/002/020, AC-010/011, ERR-001 | Own/cross-patient and other-clinician denial, path/nested-ID/method attacks, no global patient browsing; role/user/organization identifier injection never authority |
| FR-060/061 / D15/25/26 | Atomic minimized audit, no mutation on audit failure, preserved histories and wrong-patient reference/count/retry masking, no broad audit/forensic endpoint |
| Concurrency contract above | Actual PostgreSQL blocking tests in both orderings for every listed race; winner rollback, final expiry, bounded lock/deadlock failure and existing M2 lock compatibility |
| Migration/fixture compatibility | Fresh and populated upgrade/redeploy/ledger preservation; exact inventory extension; unchanged M1 clean/repeat/conflict behavior and separately versioned future fixture |
| Legacy M0–M2 | Existing login/session/CSRF/Origin, schema/identity, authz, clinical definitions, plans/BP/follow-up/coverage/applicability/correction/INITIAL tests and runtime proofs remain passing |

Booking cannot imply relationship: I1 tests must show unrelated legacy appointment/source existence grants no assignment or enrollment permission. Actual new booking behavior is an I2 test obligation, not an I1 implementation prerequisite. Future private notes and fulfillment require their own module-specific tests, not an I1 claim of completion.

Before I1 COMPLETE: all separately authorized slices implemented, full required generate/lint/Prisma/build/typecheck/unit/migration/integration/auth measurement/audits/Docker/container/runtime/smoke/cleanup evidence, independent security/authorization review, successful exact-head CI, approved merges and exact-main post-merge verification. Record actual commands/counts/failures/limitations; no fabricated PASS and no fixed historical count requirement.

For Slice 1 alone: documentation diff/link/anchor/status checks, unchanged D01–D36 decision text and historical contracts/evidence, explicit forbidden-file inventory, repository lint and independent normal PR CI. No future tests are represented as run. Slice 1 passed its merge/exact-main gate. Slice 2 completed those gates in PR #41 / exact-main CI 40010140478. Slice 3 is COMPLETE after PR #43 / exact-main CI 40116846242. Slice 4 is COMPLETE via PR #44 / exact-main CI 40195060034. Slice 5 is COMPLETE via PR #45 / exact-main CI 40252309467. Next gate: Slice 6 exit proof, independent exact-head review, successful CI, separate Product Owner merge approval and exact-main verification. Leave the issue open; this document authorizes no runtime work.

## Current Slice 6 applicability

Slices 1–5 are COMPLETE through [PR #45](https://github.com/abuhmaid28/egyhealth360/pull/45), exact-main Bootstrap 40252309467 and [completion comment 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6](V3_I1_SLICE6_EXIT_REVIEW.md) is IMPLEMENTED / IN REVIEW by comment 6406691109 for combined verification/security review and strictly necessary contract fixes only. Historical slice/ADR status text records its adoption point. V3-I1 remains INCOMPLETE pending independent exact-head review, successful CI, separate Product Owner merge approval, merge and independently confirmed exact-main verification. Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.
