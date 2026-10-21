# EgyHealth 360 — API Principles V1

## Style

- REST
- base path `/api/v1`
- JSON
- OpenAPI is the formal contract
- UTC storage and ISO 8601 timestamps
- stable machine-readable error codes

## Security

- Server-side sessions via secure HttpOnly cookies
- Backend authorization is mandatory
- Clinician access requires an active patient assignment
- Admin does not automatically receive unrestricted clinical access
- Server-owned identity/status fields are derived server-side
- State-changing requests require CSRF protection in the cookie-session architecture

## Response shapes

Single result:
```json
{ "data": {} }
```

Collection:
```json
{ "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

Error:
```json
{ "error": { "code": "ACCESS_DENIED", "message": "Access denied." } }
```

## Planned endpoint groups

### Auth
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`

### Clinician patients
- GET `/clinician/patients`
- GET `/clinician/patients/:patientId/summary`
- GET `/clinician/patients/:patientId/timeline`
- GET `/clinician/patients/:patientId/measurements`

### Care plans/actions
- POST `/patients/:patientId/care-plans`
- GET `/care-plans/:id`
- POST `/care-plans/:id/activate`
- POST `/care-plans/:id/cancel`
- GET `/care-plans/:id/actions`
- GET `/care-actions/:id`

### Evidence / measurements
- POST `/patients/me/measurements/blood-pressure`
- GET `/patients/me/measurements/blood-pressure`
- POST `/patients/:patientId/measurements/blood-pressure` (clinician-authorized)

### Follow-up
- POST `/patients/:patientId/follow-ups`
- GET `/patients/me/follow-ups`
- POST `/follow-ups/:id/cancel`

### Closure assessments
- GET `/care-actions/:id/assessments/current`
- GET `/care-actions/:id/assessments`
- POST `/care-actions/:id/re-evaluate`
- POST `/assessments/:id/confirm`
- POST `/assessments/:id/override`

### Patient view
- GET `/patients/me/care-plan`
- GET `/patients/me/care-actions`
- GET `/patients/me/timeline`

### Admin / research
- GET `/admin/users`
- POST `/admin/users/:id/disable`
- POST `/admin/demo/reset`
- POST `/admin/experiments`
- GET `/admin/experiments`
- GET `/admin/experiments/:id`

Endpoint names are conceptual until implementation issues freeze their contracts.

## Closure-engine boundary

EACCE is not an HTTP microservice. NestJS and the experiment worker call the shared TypeScript package directly.

## Error-code examples

- AUTH_INVALID_CREDENTIALS
- AUTH_SESSION_EXPIRED
- ACCESS_DENIED
- PATIENT_NOT_FOUND
- CARE_PLAN_INVALID_STATE
- CARE_ACTION_NOT_FOUND
- ASSESSMENT_STALE
- ASSESSMENT_UNAVAILABLE
- OVERRIDE_REASON_REQUIRED
- EXPERIMENT_NOT_FOUND
- EXPERIMENT_FAILED

## Pagination

Potentially large collections such as patients, care actions, and experiment runs must support pagination/filtering.

## EH-006 frozen authentication contract

Login/logout/me are frozen in `openapi.json` and `EH-006_AUTH.md`. Health remains public. Authentication does not imply clinical-resource authorization. Current split-port browser integration requires later same-origin routing; no CORS expansion is provided.

## EH-007 frozen authorization contract

GET `/patients/{patientId}/profile` returns only profile id/displayName to the
patient owner or ACTIVE-assigned clinician. ADMIN is denied. Uniform object 404,
no query/body, no-store and HEAD semantics are frozen in `openapi.json` and
`EH-007_AUTHORIZATION.md`. This does not implement clinical summary/list APIs.


## EH-011 frozen BP API

POST /patients/{patientId}/blood-pressure-measurements creates one paired immutable row
(201); GET/HEAD provide authorized paginated history (200), page/pageSize default 1/20,
max pageSize 100, measuredAt DESC/id DESC. PATIENT self / ACTIVE-assigned CLINICIAN only;
ADMIN denied. POST requires EH-006 session/Origin/CSRF, application/json (optional UTF-8),
16 KiB, no query or Idempotency-Key. Exactly systolic/diastolic integer tokens, unit mmHg,
measuredAt with strict offset/calendar/millisecond rules. No medical plausibility limits.
POST is non-idempotent: identical accepted requests create separate rows. No automatic retry.
HTTP exposes id/patientId/systolic/diastolic/unit/measuredAt/createdAt/sourceKind only;
internal recordedByUserId is never projected. All responses no-store; HEAD performs
GET checks with no body; unsupported methods 405 Allow GET, HEAD, POST. Exact errors,
input/time/provenance and transaction contracts are in openapi.json and
EH-011_BP_PROVENANCE_CONTRACT.md. Other endpoint names above remain conceptual.

## EH-012 frozen follow-up and encounter API

POST and paginated GET/HEAD /patients/{patientId}/follow-up-appointments; POST /patients/{patientId}/follow-up-appointments/{appointmentId}/cancel. POST and paginated GET/HEAD /patients/{patientId}/clinical-encounters; POST /patients/{patientId}/clinical-encounters/{encounterId}/blood-pressure-measurements/{measurementId}; paginated GET/HEAD /patients/{patientId}/clinical-encounters/{encounterId}/blood-pressure-associations. The final read returns association references only; EH-011 retains BP-resource history. These replace conceptual follow-up names above for this implemented slice.

Create accepts exactly scheduledAt/purpose or occurredAt/purpose and returns 201; cancellation/link accept {}. Cancel returns 200; new association 201/exact pair 200/different encounter 409 after full scope authorization. Internal creator/recorder/canceller omitted. Patient reads own; assigned clinician writes; Admin denied. Strict timestamp/JSON/UUID, session/Origin/CSRF, no-store/no ETag/304, canonical pagination default 1/20/max100, generic 404 and method Allow contracts are frozen in openapi.json and EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md. No action-linked SCHEDULED or qualifying completion evidence is claimed.

## EH-013 record coverage and normalized evidence boundary

EH-013 introduces zero public HTTP routes. `docs/openapi.json` is byte-for-byte unchanged.
RecordCoverageWindow is written internally by machine processes (demo/bootstrap, synthetic benchmark fixtures).
Normalized evidence queries are internal repository operations exposed via authorized persistence methods (`packages/db/src/normalized-evidence.ts`), returning canonical timelines and evidence candidates directly for internal and downstream evaluation use.

## EH-015 observed clinical applicability boundary

EH-015 introduces zero public HTTP routes. `docs/openapi.json` is byte-for-byte unchanged (SHA-256: `37a52027d416859f0c676fce86e8d7b347eae16a5d11398748e5ab17cdfcd83d`).
ObservedClinicalApplicabilitySnapshot and Retraction models are written internally by synthetic input processors and research benchmark fixtures.
Querying applicability points is an internal operation exposed via the authorized persistence wrapper (`packages/db/src/observed-applicability.ts`), returning point-in-time snapshots and mechanical tuple comparisons directly for internal clinical planning and evaluation use.

## Issue #31 changes to existing BP read semantics

No new HTTP endpoints. BP GET/HEAD history omits wrong-patient privacy targets (and WRONG_PATIENT exclusions defensively); ordinary history still contains nonprivate excluded facts. Encounter association GET/HEAD likewise omits private BP references, including pagination counts. Existing association POST denies private targets and new links to excluded targets; an existing exact nonprivate link remains an authorized no-op. Normalized internal BP/encounter candidates additionally omit every terminal exclusion. HTTP response schemas, authentication/CSRF/no-store/error contracts remain as before. OpenAPI descriptions reflect these actual read changes. Internal amendment operations/retry semantics are defined in [BP_CORRECTION_INVALIDATION_CONTRACT.md](BP_CORRECTION_INVALIDATION_CONTRACT.md), without a product raw-history route.
