# EH-007 authorization contract

Approved by Issue #12 comment 6150370205 at baseline
`96f24a079701567a2a05cacc5e0304d950ec5c00`. Implements the M1 authorization
foundation for P-003, FR-002, BR-001/002/020, AC-010/011 and ERR-001.
FR-010/011 and the full M1 exit gate remain incomplete; identity demo seed is later.

## Actor, ownership and policy

EH-006 SessionAuthGuard resolves AuthPrincipal from the server-side session cookie.
No client actor/user/role/owner/clinician identifier is consumed for authorization.
`patientId` is patient_profiles.id, not users.id. PATIENT maps through the profile's
unique user_id and may read only that profile. CLINICIAN maps through its own
clinician_profiles.user_id and requires an ACTIVE assignment with ended_at NULL
to the target profile. Missing profiles fail closed. ADMIN has no patient-resource
permission. No break-glass, impersonation or global read exists.

`parsePatientProfileId` accepts hyphenated UUID v4 with case-insensitive hex and
normalizes lowercase. `evaluatePatientAccess('patient-profile:read', evidence)`
returns allowed with the scoped projection, unauthenticated for an invalid current
session, or denied for inconsistent principal/missing projection/unknown action.
HTTP mapping lives in Nest, not the policy. Future actions require explicit policies.
No decision cache or reusable authorization ticket exists.

## Narrow persistence and concurrency

`createAuthorizationPersistence` exposes only readPatientProfileAccess and close.
Prisma remains private. A parameterized SQL statement uses an actor CTE to recheck
session ID/user ID, current ACTIVE user, expiry, revocation, and principal/current
role consistency. A permitted CTE projects only id/displayName under PATIENT self
or CLINICIAN profile + ACTIVE/null-ended assignment predicates. No unrestricted
existence query or subsequent profile read exists. The result contains sessionValid,
principalConsistent, and nullable authorized profile; no denial reason/existence bit.

Existing PKs, unique profile user_id indexes and ACTIVE-pair partial index support
these predicates; the planner decides which indexes to use. ENDED history never
satisfies the relationship predicate. Reassignment inserts a new ACTIVE row.

One READ COMMITTED statement snapshot combines permission and content. A committed
end visible before that snapshot denies. An end committed after the snapshot may
overlap an allowed in-flight response. No locks/serializable guarantee or response
retraction is claimed. Subsequent requests after committed ending deny. The same
in-flight limitation applies to concurrent session/user changes. Future clinical
mutations require their own transactional authorization contract.

## HTTP contract

GET `/api/v1/patients/{patientId}/profile`, session authenticated:

```json
{"data":{"id":"patient-profile-uuid","displayName":"Synthetic patient"}}
```

No user ID/email/demographics/clinician/assignment/session/clinical fields.
No query parameters or body; supplied query (including bare ?) or any nonempty
body fails 400 REQUEST_INVALID. Actor headers are ignored. Whitespace, compact
UUIDs, braces, URNs and encoded target spellings fail generic object denial.
Before Express parameter decoding, encoded target spellings are routed as a fixed
invalid literal, preserving query shape. This lets the real session guard and
controller produce uniform 401/404 even for invalid percent/UTF-8 escapes; no
framework decode error echoes the target. Express casing/trailing-slash variants
and implicit HEAD retain the same policy.
HEAD emits no body. Unmatched paths/unsupported methods expose no profile content.
All patient-route responses use Cache-Control:no-store, including pre-parser
errors. GET has no CSRF requirement and never renews the session.

- 401 AUTH_UNAUTHENTICATED / Authentication required.: EH-006 invalid session
  conditions, or invalid session detected by the scoped read; clear unusable cookie.
- 404 PATIENT_NOT_FOUND / Not found.: cross-patient, ended/unassigned/wrong clinician,
  ADMIN, missing profile, inconsistent role, malformed or nonexistent target.
- 400 REQUEST_INVALID / Invalid request.: forbidden query/body or malformed JSON.
- 413 REQUEST_TOO_LARGE: existing parser size limit.
- 503 AUTHORIZATION_SERVICE_UNAVAILABLE / Service unavailable.: scoped-read failure.
- 503 AUTH_SERVICE_UNAVAILABLE: existing authentication resolution failure.

No new object-level 403. Forbidden and nonexistent objects share the exact error
projection, without content or existence reason. This favors nonenumeration over
explanatory client errors; it does not claim constant-time behavior. Parser errors
may precede authentication and depend only on request syntax/size. Valid-session
400/404/503 responses do not clear cookies.

## Scope, audit and verification

No schema/migration/dependency/lockfile/pin change, write API, new audit event,
session/CSRF/CORS/proxy redesign, demo seed, clinical model or research feature.
Authorization reads/denials append no audit rows. Logs never emit credentials,
CSRF values, request payloads, driver failures or protected records.

`tests/authorization.test.mjs` verifies policy/parser fail-closed behavior.
`tests/integration/authorization.test.mjs` drives actual Nest HTTP, real sessions
and PostgreSQL for ownership, roles/profiles, assignment lifecycle, path/HEAD/body/
query/header attacks, uniform errors, current-state recheck, no caching/audit/
renewal, failure sanitization and snapshot concurrency. Existing EH-005/EH-006,
health/worker, migration, both audit and Docker checks remain mandatory.
`scripts/verify-authorization-runtime.mjs` probes the running API without printing
secrets or installing a test-only production endpoint. NFR-006 independent review
and green remote CI are required before merge. See EH-007_VALIDATION.md for results.
