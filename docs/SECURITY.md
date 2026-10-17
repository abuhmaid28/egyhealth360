# Security & Medical Safety V1

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


