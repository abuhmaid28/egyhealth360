# EgyHealth 360 — API Principles

## Style

- REST
- base path: `/api/v1`
- OpenAPI is the formal runtime contract
- JSON payloads
- ISO 8601 timestamps
- UTC storage

## Response formats

### Single result

```json
{
  "data": {}
}
```

### Collection

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### Error

```json
{
  "error": {
    "code": "APPOINTMENT_SLOT_UNAVAILABLE",
    "message": "The selected appointment slot is no longer available."
  }
}
```

Frontend logic should rely on stable error codes rather than parse message text.

## Initial error-code examples

- AUTH_INVALID_CREDENTIALS
- ACCESS_DENIED
- PATIENT_NOT_FOUND
- DOCTOR_NOT_AVAILABLE
- APPOINTMENT_SLOT_UNAVAILABLE
- APPOINTMENT_ALREADY_CANCELLED
- ENCOUNTER_ALREADY_EXISTS
- LAB_ORDER_INVALID_STATE
- PRESCRIPTION_CANCELLED
- AI_INSUFFICIENT_DATA
- AI_SERVICE_UNAVAILABLE

## Security principle

Do not accept server-owned identity or status fields from the client when they can be derived from authentication or server state.

Example appointment request:

```json
{
  "doctorId": "doctor-id",
  "startAt": "2026-11-10T17:00:00Z"
}
```

The backend determines:
- patient identity,
- initial status,
- timestamps.

## Planned endpoint groups

### Auth
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`

### Patients
- GET/PATCH `/patients/me`
- GET/POST `/patients/me/allergies`
- GET/POST `/patients/me/conditions`
- GET `/patients/:patientId/clinical-summary`

### Doctors
- GET `/doctors`
- GET `/doctors/:doctorId`
- GET `/specialties`

### Scheduling
- GET `/doctors/:doctorId/availability`
- GET `/doctors/:doctorId/available-slots`
- PUT `/doctors/me/availability`
- POST `/doctors/me/schedule-exceptions`

### Appointments
- POST `/appointments`
- GET `/appointments/me`
- GET `/appointments/:id`
- POST `/appointments/:id/cancel`
- GET `/doctors/me/appointments`

### Encounters
- POST `/appointments/:appointmentId/encounter`
- GET `/encounters/:id`
- PATCH `/encounters/:id`
- POST `/encounters/:id/complete`
- POST `/encounters/:id/diagnoses`

### Prescriptions
- POST `/encounters/:encounterId/prescriptions`
- GET `/prescriptions/:id`
- POST `/prescriptions/:id/cancel`
- POST `/prescriptions/:id/assign-pharmacy`
- POST `/prescription-items/:itemId/dispensings`

### Labs
- POST `/encounters/:encounterId/lab-orders`
- POST `/lab-orders/:id/assign-lab`
- GET `/labs/me/orders`
- POST `/lab-orders/:id/accept`
- POST `/lab-orders/:id/collect-sample`
- POST `/lab-orders/:id/start-processing`
- POST `/lab-order-items/:itemId/results`
- POST `/lab-results/:id/corrections`

### Care plans
- POST `/patients/:patientId/care-plans`
- GET/PATCH `/care-plans/:id`
- POST `/care-plans/:id/activate`
- POST `/care-plans/:id/complete`
- POST `/care-plans/:id/cancel`
- POST `/care-plans/:id/tasks`
- POST `/care-plan-tasks/:id/complete`

### Follow-ups
- POST `/patients/:patientId/follow-ups`
- GET `/patients/me/follow-ups`
- POST `/follow-ups/:id/cancel`

### Measurements
- POST `/patients/me/measurements`
- GET `/patients/me/measurements`
- GET `/patients/:patientId/measurements`

### Care gaps
- GET `/patients/me/care-gaps`
- GET `/doctors/me/care-gaps`
- POST `/care-gaps/:id/dismiss`

### Risk assessments
- POST `/patients/:patientId/risk-assessments/diabetes`

### Admin
- GET `/admin/users`
- POST `/admin/users/:id/suspend`
- GET `/admin/providers/pending`
- POST `/admin/doctors/:id/verify`
- GET `/admin/analytics/overview`

These endpoint names are a baseline and must not all be implemented during bootstrap.

## Internal AI API

Initial conceptual endpoint:

- POST `/predict/diabetes-risk`

Final input fields are frozen only after dataset/model design.

## Pagination

Potentially large collections must support pagination.

## Versioning

Initial public API version:
- `/api/v1`
