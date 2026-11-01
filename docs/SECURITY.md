# Security and clinical authority

CURRENT AUTHORITATIVE security reference at the [CURRENT_STATUS](CURRENT_STATUS.md) baseline, constrained by accepted EH/I1/I2/I3 contracts. This reboot changes no security policy or implementation.

## Current authority map

| Boundary | Current enforcement |
| --- | --- |
| Auth/session | Server-side database sessions, Argon2id, Secure/HttpOnly production host cookies, session expiry/revocation, CSRF + Origin/Fetch Metadata |
| Patient | Own permitted resources; no clinical authoring or other-patient data |
| Clinician | Current ACTIVE ClinicianPatientAssignment is the clinical grant; authoring additionally checks exact treating/source author and clinic scope |
| Booking/directory/membership | Operational logistics/publication only; ZERO clinical authority |
| Private notes/released data | Notes author-only with current authority; summaries and FollowUpIntent independently explicitly released; close grants no release/signature |
| Pharmacy | Active exact staff user/session, PHARMACY org, exact current active membership and valid routed artifact; minimum necessary source/items/history, no general patient browser |
| Lab | Operational staff/org foundation exists; fulfillment backend is future/unauthorized |
| ADMIN | Operational only; no blanket clinical payload, authoring, assignment creation, impersonation, fulfillment or break-glass shortcut |
| Wrong-patient privacy | Preserved source history with ordinary payload/identifier/reference/count/replay/conflict suppression; no cross-patient move |

Reauthorize reads/writes/replay against current state. Preserve canonical lock order, DB clock expiry, immutable history, operation keys and minimized atomic audit. Accepted concurrency guarantees concern the actual ordering of transactions/current checks, not recall of responses already authorized. Source cancellation/replacement/expiry blocks new fulfillment; relationship ending does not itself cancel a valid routed pharmacy artifact. [Pharmacy implementation/security](V3_I3_SLICE2.md).

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

**Policy completeness:** own data, public directory, schedule/logistics, relationship transitions/ending, artifact-scoped fulfillment, revocation, private notes, release, cancellation/correction, IDOR/provider isolation and timeline masking are covered by [D01–D36](PRODUCT_V3_DECISIONS.md). Pharmacy enforcement is implemented under I3 Slice 2; Laboratory enforcement remains future. Exact contracts/tests define current methods and race semantics. No implementation-level permission table or transaction change is introduced here.

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

## V3-I2 Slice 2 operational scheduling enforcement

[Exact boundary and lock graph](V3_I2_SLICE2.md#authority-clocks-and-locking): internal current ADMIN configuration only; current owner clinician/session/profile and exact active clinic/member/published directory affiliation for publication/withdrawal. Availability never checks or grants clinical assignment authority. Immutable timezone/configuration snapshots; current settings for public eligibility. Safe actor/command/key replay always rechecks authority, including original membership/affiliation. Atomic empty-metadata audit, real PostgreSQL exclusion/races/revocation/expiry/rollback and strict HTTP/no-store/HEAD/public canary proof. No Booking or ADMIN patient/clinical shortcut.

## Slice 6 current authority and privacy

Follow-up Intent commands require exact treating author plus current ACTIVE/null-ended assignment and exact current source clinic/member/provider/affiliation. Author reads require current assignment; patient own and current-related clinician reads are released-only. Any targeted version suppresses its entire root, link identities and counts, including replay. Sorted multi-provider locking extends existing order without legacy changes; no ADMIN shortcut. See [Slice 6](V3_I2_SLICE6.md) for exact lock/HTTP/replay bounds; the runtime verifier is wired into accelerated CI after consultation-documentation and before smoke/cleanup.

## V3-I3 Slice 1 prescription boundaries

Prescription source writes require the exact current treating author, active assignment, valid current session and originating clinic/membership/affiliation. Signed read authority remains patient-own or a clinician's own current assignment. ADMIN is catalog-operational only; lab/pharmacy staff have no source access. Lineage privacy precedes projection/count/replay/conflict disclosure. See the [concrete lock graph, audit and replay rules](V3_I3_SLICE1.md). No staff artifact entitlement is introduced.

## V3-I3 Slice 2 exact pharmacy artifact authority

Current PHARMACY_STAFF user/session, active PHARMACY organization, exact current active/unended membership and the exact routed artifact/privacy are all required. This grants no clinician or patient-record authority. Prescriber assignment ending denies the clinician but does not cancel an independent valid route. Current pharmacy revocation denies subsequent staff access; explicit correction/history purpose is limited to genuine accepted-artifact facts, with no source instructions or unrelated route lineage. Source privacy masks payload/references/counts/replay before conflict; additive database fences serialize queue reads with actual source restriction writers. See [Slice 2 authority, replay and locking](V3_I3_SLICE2.md).
