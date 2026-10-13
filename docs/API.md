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
