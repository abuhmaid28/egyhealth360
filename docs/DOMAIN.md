# EgyHealth 360 — Domain Model

## Identity

### User
Authentication identity.

Roles:
- PATIENT
- DOCTOR
- LAB
- PHARMACY
- ADMIN

### PatientProfile
Patient demographic/profile information.

### DoctorProfile
Professional doctor information.

### LabProfile
Laboratory provider information.

### PharmacyProfile
Pharmacy provider information.

### ConsentRecord
Versioned patient consent record.

## Scheduling

### AvailabilityRule
Recurring doctor availability.

### ScheduleException
Specific unavailable or extra-availability period.

### Appointment
Booking between one patient and one doctor.

Lifecycle:

```text
SCHEDULED
  ├─→ COMPLETED
  ├─→ CANCELLED
  └─→ NO_SHOW
```

An appointment has at most one encounter.

## Clinical

### Encounter
The clinical consultation that actually occurred.

Appointment and Encounter are intentionally separate.

Lifecycle:

```text
DRAFT → COMPLETED
```

### Diagnosis
Diagnosis recorded within an encounter.

### Prescription
Prescription header created from an encounter.

### PrescriptionItem
One medication instruction within a prescription.

### DispensingRecord
A pharmacy dispensing action for a prescription item.
Supports partial dispensing.

### LabOrder
Doctor-requested group of laboratory tests.

### LabOrderItem
One requested test.

### LabResult
Published result for a lab-order item.

Published results are not silently overwritten.
Corrections create a new result version referencing the previous result.

## Continuity of care

### CarePlan
Doctor-created plan for one patient.

Lifecycle:

```text
DRAFT → ACTIVE
        ├─→ COMPLETED
        └─→ CANCELLED
```

### CarePlanTask
Trackable action inside a care plan.

Stored states:
- PENDING
- COMPLETED
- SKIPPED

Overdue should normally be derived from due date + state.

### FollowUp
Required patient follow-up.

Can be linked to:
- an encounter,
- a care plan,
- or both when appropriate.

### HealthMeasurement
Structured patient measurement such as:
- weight,
- blood pressure,
- glucose.

Each measurement stores:
- value,
- unit,
- timestamp,
- source.

### CareGap
Detected missing care step.

Initial types:
- MISSED_FOLLOWUP
- PENDING_LAB_TEST
- UNREVIEWED_LAB_RESULT

Lifecycle:

```text
OPEN
 ├─→ RESOLVED
 └─→ DISMISSED
```

Each care gap must reference a real source record.

Duplicate open gaps for the same rule/source should be prevented.

## Intelligence

### RiskAssessment
Historical AI-assisted risk assessment.

Multiple assessments may exist for one patient.

Possible states:
- COMPLETED
- INSUFFICIENT_DATA
- FAILED

A completed assessment may contain:
- score,
- risk level,
- model version,
- explanation,
- doctor review information.

## System concepts

### Notification
User-facing message.

Notification is not a source of truth.

### AuditLog
Immutable trace of important actions.

### Health Timeline
Patient-facing / doctor-facing chronological projection.

The timeline is not the primary source of medical data.

Initial implementation should build the timeline from source records rather than duplicate all clinical data in a dedicated timeline table.

## Important distinctions

- User ≠ Patient ≠ Doctor
- Appointment ≠ Encounter
- LabOrder ≠ LabResult
- Prescription ≠ PrescriptionItem
- PrescriptionItem ≠ DispensingRecord
- Timeline ≠ Audit Log
- Notification ≠ Domain event
- AI risk assessment ≠ diagnosis
