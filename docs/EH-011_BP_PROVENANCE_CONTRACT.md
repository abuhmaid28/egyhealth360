# EH-011 BP measurement and entry provenance contract

Approved by [Issue #20 comment 6183982525](https://github.com/abuhmaid28/egyhealth360/issues/20#issuecomment-6183982525), baseline `9ed0d2e09a06fb1e63ae30e86678088ff805c5b8`. ADR-025 records the decision. EH-009 and EH-010 are complete; EH-011 is merged and complete at `c24b7c487dc7d56624e8dd3cfa95ba92afa963a5`; M2 remains IN PROGRESS.

## Evidence model

One immutable paired assessment has exactly nine persisted fields: database-generated UUID id; patientId FK to patient_profiles.id; PostgreSQL int32 systolic and diastolic; unit exactly mmHg; caller event measuredAt; database receipt createdAt; recordedByUserId FK to users.id; sourceKind PATIENT_SELF_ENTRY or CLINICIAN_ENTRY. Both FKs RESTRICT updates/deletion. No updatedAt, external/source reference, arbitrary metadata, CarePlan/rule/encounter FK, qualification or eligibility column.

PATIENT_SELF_ENTRY records authenticated self-submission for the user's patient profile. CLINICIAN_ENTRY records authenticated submission under a current ACTIVE/null-ended assignment. Neither means device operation, witnessing, medical verification, diagnosis or clinical validity. Actor and source are derived by the service. SQL verifies structural relationships, not session authentication. Stored provenance describes submission time, not permanent assignment/ownership.

All UPDATE, DELETE and TRUNCATE statements are rejected, including no-op/empty statements and cascading removal attempts. No correction, invalidation, supersession, edit or delete workflow exists. Another submission is another reading, never an implicit correction. A future evidence consumer must not assume every retained row is usable clinical evidence: correction/invalidation and normalization are explicit gates before automated selection.

## Input and time

POST accepts exactly systolic, diastolic, unit, measuredAt. No missing/unknown fields, duplicate keys (including escaped equivalents), arrays, primitives or null roots. BP values require JSON integer tokens; numeric strings, booleans, null, decimal/fraction/exponent spellings, negative zero, nonfinite values and int32 overflow are rejected. No trimming, coercion, rounding, clamping or defaults. The BP-only raw token scan first validates JSON grammar and then inspects a bounded flat object. It never replaces the global JSON parser; no new parsing dependency.

The signed int32 range is a technical storage limit only. No medical plausibility range, positivity or systolic/diastolic ordering rule is approved. Structural acceptance is not medical validity.

measuredAt requires a real Gregorian date, four-digit year 0001..9999, uppercase T, seconds, mandatory Z or numeric ±HH:MM and zero to three fractional digits. Offset hours 00..23 and minutes 00..59; -00:00, impossible dates, leap seconds, 24:00, whitespace, excess precision and normalized UTC years outside 0001..9999 are rejected. Return UTC ISO with exactly three fractional digits. Backdating has no clinical lookback limit. Future readings are rejected; equality with receipt time is permitted. No clock-skew allowance or clinical time window.

measured_at is TIMESTAMPTZ(6) with finite/year/millisecond-alignment CHECKs; created_at is database-owned TIMESTAMPTZ(3). A chronology CHECK enforces measured_at <= created_at. The guard assigns receipt time after structural locks using clock_timestamp rounded to milliseconds. API values are already millisecond-aligned, so unsupported precision is never silently rounded into acceptance. SQL casts have PostgreSQL's own lexical/type conversion semantics; DB guards do not claim to recover text lost through an explicit caller cast.

## HTTP

POST and GET `/api/v1/patients/{patientId}/blood-pressure-measurements`; HEAD executes GET authorization/history validation with no response body. No individual-record or convenience alias route. patientId is a hyphenated UUID v4 profile ID; uppercase hex normalizes; encoded/alternate spellings are generic target denial. Express case/trailing-slash variants retain all controls.

PATIENT self only; CLINICIAN current ACTIVE/null-ended assignment only; ADMIN denied. EH-006 session principal is the only identity authority. Body actor/source/owner fields are rejected; identity-like headers do not authorize. EH-007 profile-read policy remains unchanged and is not a write ticket.

POST requires exact configured Origin, approved Fetch Metadata, session and session-bound CSRF. One application/json Content-Type, optionally UTF-8 charset, 16 KiB maximum, identity content encoding only. Query strings (including bare ?) and Idempotency-Key are rejected. No CORS expansion.

GET/HEAD reject bodies and transfer encoding. Only page/pageSize query keys, once each, canonical positive decimal digits. Defaults 1/20; page maximum 2147483647; pageSize maximum 100. Unknown, encoded, duplicate, empty and noncanonical query forms fail. One SQL statement snapshot supplies count and page, ordered measuredAt DESC,id DESC. Independent requests can observe newly inserted readings. Empty authorized history returns 200 with [].

POST 201: `{data:{id,patientId,systolic,diastolic,unit,measuredAt,createdAt,sourceKind}}`.
GET 200: `{data:[measurement,...],meta:{page,pageSize,total}}`.
The HTTP projection never includes recordedByUserId, actor email, session identity or clinician internals. Recorder display/identity would require a separately authorized projection.

Every BP response uses Cache-Control:no-store, including errors and unsupported methods. No session renewal, ETag or conditional caching. Unsupported methods return 405 METHOD_NOT_ALLOWED and Allow: GET, HEAD, POST, without patient lookup. OPTIONS grants no CORS access.

Errors use the existing error envelope: 400 REQUEST_INVALID (syntax/query/framing); 400 BP_MEASUREMENT_INVALID (validated fields); 401 AUTH_UNAUTHENTICATED and unusable-cookie clearing; 403 AUTH_CSRF_INVALID; uniform 404 PATIENT_NOT_FOUND for malformed/nonexistent/forbidden targets; 405 METHOD_NOT_ALLOWED; 413 REQUEST_TOO_LARGE; 415 REQUEST_CONTENT_TYPE_INVALID; sanitized 503 BP_SERVICE_UNAVAILABLE or existing AUTH_SERVICE_UNAVAILABLE. Syntax/Origin/media errors can precede authentication and depend only on request content. Object denial never explains resource existence.

Field errors contain only systolic, diastolic, unit, measuredAt or $, with allowlisted reasons. No payload, unknown key names, SQL/driver diagnostics or credentials are echoed/logged. See openapi.json for exact schemas.

## Transactions and persistence boundary

createBloodPressureMeasurementPersistence exposes only createBloodPressureMeasurement(principal,{patientId,systolic,diastolic,unit,measuredAt}), listBloodPressureMeasurements(principal,{patientId,page,pageSize}), close. No client, generic query/CRUD, actor/source override, delete/reset or qualification input. Internal snapshots retain actor provenance; HTTP uses an explicit reduced projection.

All operations use bounded READ COMMITTED transactions. Copy/validate scalar inputs before awaiting. Fixed order: actor users FOR NO KEY UPDATE -> exact session FOR UPDATE -> clinician profile FOR SHARE when clinician -> ACTIVE/null-ended assignment FOR SHARE when clinician -> patient profile FOR SHARE -> insert/query -> audit if insertion -> final current-session validity/expiry check -> commit. Patient self ownership is checked under the patient lock. Session-user linkage, role consistency, ACTIVE actor, profiles and assignment are revalidated inside the transaction. Locks are held through completion.

A revocation/disable/assignment-end/mapping change that wins its relevant lock makes the submission wait and deny after recheck. If submission locks first, mutation waits until commit/rollback. Losing writes retain zero evidence and zero BP audits. Clock-based expiry is checked again before completion; this is a check-time guarantee, not a promise that time stops before commit. No automatic stale-authorization retry. Lock timeout 5s, statement timeout 10s, transaction maxWait 5s, timeout 30s. Reads revalidate similarly and emit no event.

SQL insertion guard follows the same relative actor/profile/assignment/patient order. Custom functions are SECURITY INVOKER with trusted search_path pg_catalog,public,pg_temp and explicit public-qualified relations/types; builtins qualified where relevant. TEMP shadows cannot supply provenance. Ordinary-write protection does not cover schema owners disabling guards.

## Audit, duplicates and clinical boundary

Only BP_MEASUREMENT_CREATED, genuine authenticated actor, entityType blood_pressure_measurement, row UUID, safeMetadata {}. Mutation/audit are atomic. No values, measuredAt, payload, cookies or tokens in metadata/logs. Reads, invalid/denied writes and parser failures emit none.

POST is non-idempotent. Identical successful submissions create distinct rows and creation audits. No value/time deduplication, request-ID column, idempotency ledger, expiration policy or automatic retry. Lost responses can leave committed evidence; history cannot prove whether an identical row is a retry. Idempotency-Key is explicitly rejected rather than honored.

No CarePlan/catalog prerequisite or FK. No threshold helper, eligibility evaluator, controlled/qualifying flag, index/trigger selection, occurrence key, CareAction, encounter, appointment, coverage, ClosureAssessment, EACCE, CR-HTN-FU-002 or FHIR/Synthea import. BP below 140/90 and ACTIVE CarePlan are not proof of full CR-HTN-FU-001 applicability. Diagnosis, age-at-trigger, pregnancy, CVD/DM/CKD facts, correction-aware evidence selection, retirement/generation interaction, calendar-month arithmetic, occurrence identity/retriggering and generation concurrency remain unresolved gates. FR-021 is incomplete.

FR-022 is implemented only for the tested HTTP submission behavior. FR-012/FR-043 are BP history API/data foundations, not UI completion. FR-023 is BP entry provenance only. Research imports and ground truth remain separate future contracts. Demo identities retain their existing null clinical facts.

## Migration and validation

Exactly one additive migration: 20261017000000_eh011_bp_provenance. Enum, nine-column table, PK, two RESTRICT FKs, four CHECKs, history/actor indexes, eh011_guard_bp_insert / eh011_reject_bp_mutation and insertion/statement-history triggers. No reference or BP seed rows, external dependencies or historical migration changes. Fresh/upgrade/redeploy, existing regressions, actual HTTP/runtime, both audits, Docker, independent review and final-head CI are required. Observed evidence belongs in EH-011_VALIDATION.md.

## EH-012 additive relationship annotation

EH-012 adds an immutable association table and supporting composite BP unique key; no BP row, field, source or historical migration changes. EH-011 exclusions describe its original slice, not a prohibition on separately approved later models. See EH-012 contract.
