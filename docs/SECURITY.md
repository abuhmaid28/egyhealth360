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
