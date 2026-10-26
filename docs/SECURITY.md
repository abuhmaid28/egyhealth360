# Security & Medical Safety — V3 Policy, M0–M2 Enforcement

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Slices 1–5 COMPLETE; PR #45 merged at `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, exact-main [Bootstrap 40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467) SUCCESS; [Slice 5 completion 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6 exit/security review](V3_I1_SLICE6_EXIT_REVIEW.md) AUTHORIZED / IN PROGRESS under [authorization 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). V3-I1 INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.

[Issue #39 I1 contract](V3_I1_CONTRACT.md) remains APPROVED. Slice 1/2 COMPLETE; [Slice 3](V3_I1_SLICE3.md) security contract COMPLETE; I1 NOT COMPLETE and Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 AUTHORIZED / IN PROGRESS. Registration is guarded anonymous patient-only creation; profile read/replace requires current PATIENT ownership, and writes retain session CSRF. No ADMIN/staff clinical or profile entitlement. D36 routed-artifact authority remains I3; membership alone never suffices. Existing security contracts below are preserved.

## Slice 4 directory enforcement

[Contract](V3_I1_SLICE4.md) separates public locator/projection from current clinical authority. All directory queries recheck current User/profile, curated Specialty, exact approved publication, exact ACTIVE compatible membership, ACTIVE CLINIC organization and separate clinic publication. Public reads are one SQL statement, no-store/no ETag or 304; no cookies/roles widen the allowlist. Public routes never query clinical tables. Internal ADMIN management rechecks user/session before and after locks and at transaction end; no new browser mutation bypass. Minimized audit is atomic; exact replay/no-op creates no event. Database composite FKs/history guards and real PostgreSQL revocation/deadlock tests support these guarantees. No directory state creates assignments, consent or D36 fulfillment authority.

## Policy versus implementation

Product V3 is APPROVED at policy level; V3-I1 overall is NOT COMPLETE. Existing PATIENT/CLINICIAN/ADMIN roles, EH-006 session/CSRF/Origin and own/ACTIVE-assignment checks remain implemented and unchanged. Slice 2 adds fixed LAB_STAFF/PHARMACY_STAFF and operational organization membership COMPLETE; bilateral enrollment is COMPLETE in Slice 5; booking and fulfillment remain **NOT IMPLEMENTED**. No current endpoint gains a booking/staff exception.

## Approved future authorization boundary

| Area | Policy for later reviewed implementation contracts |
|---|---|
| Registration / own data | Only patient self-registration; no privileged role selection. Permitted own profile/bookings/released clinical data only; no clinical authoring, arbitrary action closure or another patient's owner/reference assignment. Managed privileged accounts; no production identity-assurance or mandatory paid verification/recovery subsystem |
| Public provider discovery | Slice 4 curated published professional profile and clinic/specialty only; availability is deferred to I2; no patient bookings, account/private identity data or clinical history |
| Doctor schedule / booking | Own professional/provider scope and minimum identity/time/logistics only before a genuine relationship; complaint/history are clinical data, not scheduling metadata |
| Relationship | Explicit patient authorization + clinician acceptance before/at consultation. Continue until either ends; preserve history. Recheck current authority on subsequent access; no author entitlement, automatic renewal or pending-result exception. Other doctors need their own current relationship |
| Private notes / released summary | Private notes author-only under current clinical authority; no automatic patient/other-doctor/staff/ADMIN disclosure. Signed/released summaries/instructions have separate permitted projections and preserved addenda |
| Lab | Active bounded staff, matching active organization/membership, valid routed order and minimum necessary patient/test context; own result/fulfillment history only |
| Pharmacy | Equivalent current routed signed-prescription authority and own full-item dispense history only; cannot rewrite prescribing; no unrelated medication/diagnosis/timeline access |
| Admin | Operational account/provider/membership/status/config/demo and research administration only; no clinical payload, impersonation, signing, finalization, dispensing or unconsented relationship creation by ADMIN alone |
| IDOR/provider isolation | Patient and nested artifact identity never grants authority. Deny cross-patient/cross-provider access without protected existence/payload disclosure; no global staff patient search shortcut |
| History/privacy | Preserve signed source versions/addenda/retractions/reversals; wrong-patient restriction independent of exclusion/correction. No cross-patient move; mask payload and revealing references/counts/notifications in ordinary projections. Patients/ADMIN may flag concerns without gaining clinical edit authority |

## D36 — Cross-module fulfillment authority and suspension

1. Ending a doctor relationship denies later doctor access but does not silently cancel an otherwise valid routed prescription/test order.
2. Lab/pharmacy authority is artifact-scoped, never general patient-record access.
3. Reads/writes require current active user, organization, membership and valid artifact authority; prior session, role or authorship alone is insufficient.
4. Completed artifact access is limited to bounded source correction/audit under current organization/artifact authority and privacy restrictions; no future orders or permanent author entitlement.
5. Effective staff/membership/organization suspension or revocation blocks subsequent staff clinical reads/writes, including pending work; no grandfathering. This means the next current-authority check, not recall of already authorized responses or reversal of committed facts.
6. Preserve source/history across ending, suspension and cancellation.
7. Patient own access and another currently authorized doctor's access rely on their own authority/release/privacy; source-organization suspension does not automatically hide already released history from them.
8. Authorized cancellation/withdrawal blocks future fulfillment, preserves prior results/dispenses, and reasoned corrections/reversals do not silently restore entitlement.
9. ADMIN may administer operational status/escalation, but no clinical payload/fulfillment rights. Pending work remains; restoration/rerouting needs fresh authority and history, never silent transfer of accepted/fulfilled artifacts.
10. No break-glass, forensic/raw-history, permanent-author or legacy ACTIVE-assignment exception is created.

The authorized clinician signs/routes to an approved recipient considering patient preference; patient does not rewrite the signed artifact. Authorized pre-acceptance rerouting preserves history; completed/processing work needs cancellation/reissue/reconciliation. New source-owning correction authority does not open existing BP/CarePlan/CareAction resources or protected generation decisions.

**Policy completeness:** own data, public directory, schedule/logistics, relationship transitions/ending, artifact-scoped fulfillment, revocation, private notes, release, cancellation/correction, IDOR/provider isolation and timeline masking are covered by [D01–D36](PRODUCT_V3_DECISIONS.md). Technical enforcement/permission/error/race contracts and verification remain future work. No implementation-level permission table or transaction change is introduced here.

## Retained security principles and accepted implementation notes

The principles below remain applicable; slice notes describe their delivered scope at the time. They do not claim V3 enforcement or recall of in-flight reads after revocation.


## Security target
Use OWASP ASVS 5.0 as the verification reference, with a practical L1 baseline plus risk-driven L2 controls for authorization, sessions, sensitive data, logging, and privacy.

## Authorization
- Patient: own data only
- Clinician: active assigned-patient relationship required
- Admin: no default unrestricted clinical access
- Deny by default
- Backend authorization is authoritative

## Authentication/session
- Server-side database-backed sessions
- secure HttpOnly cookies
- CSRF protection for state-changing requests
- Argon2id password hashing
- logout invalidates the server-side session
- generic authentication errors to reduce account enumeration

## Data/privacy
- Synthetic/demo data only in Core V1
- No real patient PHI
- Minimum necessary profile data
- HTTPS in deployed environments
- PostgreSQL not publicly exposed
- secrets via environment/repository-secret mechanisms, never committed
- application logs must not contain raw passwords, session tokens, secrets, or unnecessary full medical payloads

## Audit
Critical mutations and clinician review actions are append-only/auditable. Audit records are distinct from the clinical timeline and are not user-editable through normal APIs.

## Research integrity
- Ground truth must never enter Baseline/EACCE runtime inputs
- Research ground truth is logically isolated from product APIs
- Same observed evidence is used for comparative engines
- Experiment seed/config/version information is preserved

## Medical safety
- EACCE does not diagnose, prescribe, recommend treatment, or determine medication dosage
- TRUE_GAP means an expected care action appears genuinely unresolved under sufficient evidence, not medical emergency
- Missing relevant coverage can produce UNCERTAIN rather than forced classification
- COMPLETED requires qualifying evidence
- Stale assessments must not be presented as current
- Published clinical rules require authoritative source/version/location and are immutable by version
- Clinician overrides preserve the original engine result

## Compliance boundary
Do not claim HIPAA, GDPR, or other legal compliance. This is a security-conscious graduation research prototype using synthetic data, not a certified clinical system.

## EH-007 implemented authorization foundation

Patient-profile reads require EH-006 authentication plus self ownership or a current
ACTIVE clinician assignment. ADMIN and missing profiles fail closed. The scoped SQL
read rechecks session/user/role and projects only permitted data; no result caching.
Uniform object 404 avoids existence reasons. READ COMMITTED snapshot semantics allow
already authorized in-flight responses to overlap revocation/assignment ending.
See `EH-007_AUTHORIZATION.md`; later clinical endpoints need their own scoped tests.

## EH-008 synthetic bootstrap boundary

Explicit CLI opt-in and development/test mode only; private injected demo password,
no default and no production seed allowance. A fixed insert-only dataset validates
existing credentials/profile/relationship state before writing; conflicts roll back.
No seed audit fabrication/reset/client export. m1:verify uses real HTTP and is not
read-only: genuine login/logout sessions/audits remain retained. Hostname checks are
accident prevention, not proof of database ownership. See EH-008_DEMO_IDENTITIES.md.

## EH-009 catalog ordinary-write protection

Exact publication whitelist, immutable source/version/FK identities, parent-row
serialization, and database CHECK/write/removal guards protect catalog history.
SQL/Prisma cannot publish arbitrary clinical JSON or an unapproved version. This does
not protect against schema owners/superusers. No executable expressions/eval, product
route or authorization change. Trusted explicit CLI only; bounded transactions;
fixed safe output; atomic empty-metadata system publication/retirement audit.
See EH-009_CLINICAL_DEFINITION_CONTRACT.md. No patient clinical data is introduced.

## EH-010 care-plan service boundary

No new HTTP endpoint. Every public plan operation revalidates EH-006 session/user/
role and ACTIVE clinician assignment inside a bounded transaction. User/session/
profile/assignment/patient/plan/template locks preserve the documented transaction
contract; no reusable read authorization ticket. Generic object denial and allowlisted
errors prevent raw diagnostics/resource-existence leakage. Creator derives from the
validated principal; lifecycle audits are atomic and empty-metadata. SQL triggers
protect structure/history, not authentication. Exact approved catalog pins, trusted
search paths and qualified lookups prevent alternative-definition/TEMP bypasses.
Read-only deferred specifications contain no inferred clinical evidence or action.
See EH-010_CARE_PLAN_CONTRACT.md for lock order, expiry and ordinary-write limits.


## EH-011 authenticated BP evidence

BP creation and history use the EH-006 principal, current locked user/session/profile/
ACTIVE assignment revalidation and final expiry check. PATIENT self only, CLINICIAN
assigned only, ADMIN denied; no actor/source override. Raw JSON lexical checks are
confined to bounded BP POST; existing global parser/session/Origin/CSRF behavior stays.
Uniform object denial, no-store, allowlisted field errors and explicit minimized HTTP
projection omit internal recorder UUID. Source kinds assert entry, not medical validity.
One atomic BP_MEASUREMENT_CREATED event uses the real actor and empty metadata;
reads/rejections append none. SQL invoker guards and qualified lookups protect ordinary
structural provenance and reject all BP UPDATE/DELETE/TRUNCATE, including TEMP bypasses.
Corrections and clinical evidence selection remain separately gated. See EH-011 contract.

## EH-012 follow-up and encounter authorization

Patient own reads only; current ACTIVE-assigned clinician reads/writes; Admin denied. All operations revalidate principal/session/user/profile/assignment under the EH-010/EH-011 lock discipline; target appointment lock or encounter-then-BP locks follow authorization. Final clock-expiry check, bounded READ COMMITTED, no cached ticket/automatic retry. Internal actors are omitted from HTTP. Uniform nested target denial precedes conflict disclosure. Scoped strict JSON, existing Origin/CSRF, no-store/HEAD/no conditional caching. Four genuine atomic audits contain {} only; no read/denied/no-op noise. Composite FKs enforce patient consistency, unique BP enforces cardinality, invoker/trusted-path/qualified guards protect structural provenance and immutable history against ordinary SQL/TEMP bypasses. Guards do not authenticate sessions or resist schema owners. See EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md.

## EH-013 record coverage and normalized evidence query authorization

RecordCoverageWindow persistence has no public write route. Machine processes (demo/bootstrap, synthetic benchmark fixtures) insert coverage assertions internally.
Normalized evidence queries use an authorized persistence wrapper enforcing the standard EgyHealth 360 authorization matrix:
- Patient role: own-data read only (`principal.userId === target.userId`).
- Clinician role: read requires an active clinician-patient assignment (`clinician_patient_assignments.status === 'ACTIVE'`).
- Admin role: denied.
- Unassigned clinician: denied.
- Cross-patient access: denied with uniform access denial.
Authorization is revalidated transactionally with session and assignment validation.
Immutability is enforced at the database layer via triggers rejecting UPDATE, DELETE, and TRUNCATE.
No public HTTP routes are added in EH-013; `docs/openapi.json` is byte-for-byte unchanged.

## EH-015 observed clinical applicability authorization and boundary

Observed applicability snapshots and retractions have no public write HTTP route. Internal machine processes (synthetic benchmark fixtures, research evaluation inputs) write assertions internally using private helpers (`internalInsertObservedApplicabilitySnapshot`, `internalRetractObservedApplicabilitySnapshot`).
Authorized query operations (`getObservedApplicabilitySnapshots`) strictly enforce the canonical EgyHealth 360 authorization discipline:
- Patient role: own-data read only (`principal.userId === target.userId`).
- Clinician role: read requires an active clinician-patient assignment (`clinician_patient_assignments.status === 'ACTIVE'`).
- Admin role: denied by role alone.
- Unassigned clinician: denied.
- Cross-patient access: denied with uniform access denial.
Authorization is revalidated transactionally with session and assignment validation.
Immutability is enforced at the database layer via triggers rejecting UPDATE, DELETE, and TRUNCATE unconditionally on both `observed_applicability_snapshots` and `observed_applicability_retractions`.
Research noninterference: complete research ground truth is strictly inaccessible to the observed applicability engine. Missing observed fields (`null`) are preserved without inference or backfilling.
Zero public HTTP routes are added in EH-015; `docs/openapi.json` is byte-for-byte unchanged.

## Issue #31 correction and wrong-patient safety

Only currently assigned active clinicians may correct, exclude, restate or determine wrong-patient privacy; self-patients and ADMIN cannot mutate old evidence. Reuse locked transaction authorization and final session checks. Scope denial is uniform, failures sanitized, canonical payloads copied before awaiting, actor/kind/operation keys reject changed-payload replay. Atomic audits use fixed actor/action/entity references and empty metadata; clinical reasons/linkage stay in protected records.

Private BP payload/references are omitted from patient and clinician history, encounter association history, normalized/effective evidence and retry replacement references. F1 permits independent privacy on an already-excluded BP while preserving its original reason. Explicit same-lineage frozen targets never propagate dynamically. No new forensic role/raw-history endpoint/cross-patient movement; source persistence remains immutable. Absence of exclusion is not verification, plausibility or clinical qualification. D1 supplies no arbitrary historical visibility guarantee. Exact threat boundary and downstream decisions: [BP contract](BP_CORRECTION_INVALIDATION_CONTRACT.md).


## EH-014 bounded INITIAL implementation — merged and verified

EH-014 generation requires current ACTIVE assigned-clinician authority and exact session locks, exclusive patient scope, plan/template and selected-BP locks plus final expiry check. Both explicit human selection and NULL-actor derivation audits are atomic with immutable state, metadata {}. Privacy suppresses whole affected ordinary action/read/count/page/retry results, including dates and protected references; fail-closed linkage checks prevent raw fallback. Self-patient reads only, Admin denied, no forensic/public mutation route or research writer. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).

Status evidence: [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. [Post-merge validation](EH-014_VALIDATION.md#post-merge-validation). No behavioral or R1–R8 contract change is introduced by this status closeout.

## Current Slice 6 applicability

Slices 1–5 are COMPLETE through [PR #45](https://github.com/abuhmaid28/egyhealth360/pull/45), exact-main Bootstrap 40252309467 and [completion comment 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6](V3_I1_SLICE6_EXIT_REVIEW.md) is AUTHORIZED / IN PROGRESS by comment 6406691109 for combined verification/security review and strictly necessary contract fixes only. Historical slice/ADR status text records its adoption point. V3-I1 remains INCOMPLETE pending independent exact-head review, successful CI, separate Product Owner merge approval, merge and independently confirmed exact-main verification. Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.
