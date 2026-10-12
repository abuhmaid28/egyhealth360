# EgyHealth 360 — Domain Model V1

## Domain boundaries

### 1. Identity & Access
Owns users, patient/clinician profiles, roles, sessions, and clinician-patient assignments.

### 2. Clinical Planning
Owns guideline sources, care-plan templates, rule definitions, patient care plans, and care actions.

### 3. Clinical Evidence
Owns normalized evidence used by closure reasoning, initially including BP measurements, follow-up appointments, clinical encounters, data sources, and record-coverage windows.

### 4. Care Closure Intelligence
Owns immutable closure assessments, evidence traces, reason codes, and stale/superseded assessment relationships.

### 5. Clinician Review & Audit
Owns clinician confirmations/overrides and append-only audit events. Human review never overwrites the raw engine result.

### 6. Research / Evaluation
Owns experiment runs, benchmark cases, corruption events, engine predictions, metrics, and ground truth. Ground truth is never exposed to runtime engine inputs.

## Core distinctions

- CarePlanTemplate ≠ CarePlan instance
- CareAction lifecycle ≠ ClosureAssessment classification
- FollowUpAppointment ≠ ClinicalEncounter
- Engine assessment ≠ Clinician review
- Patient-facing product data ≠ research ground truth

## Care-action lifecycle

Operational states:
- PLANNED
- ACTIVE
- COMPLETED
- CANCELLED

Closure classifications:
- NOT_DUE
- COMPLETED
- SCHEDULED
- TRUE_GAP
- EXEMPT
- UNCERTAIN

A closure classification is a time-specific inference and must not be stored as the mutable lifecycle state of a CareAction.

## Core business invariants

1. No CareAction without a CarePlan.
2. No ClosureAssessment without a CareAction.
3. ClosureAssessments are immutable after creation.
4. Published clinical definitions are immutable; changes create versions.
5. Clinician access requires an authorized patient relationship.
6. Overrides preserve the original engine assessment and require a reason.
7. Patient-entered evidence preserves provenance.
8. Missing relevant evidence does not automatically imply a true gap.
9. Research engines cannot read ground truth.
10. The closure engine never diagnoses or prescribes treatment.

## Evidence and coverage

Record completeness is modeled explicitly through relevant coverage windows. Missing data outside an action's relevant evidence window must not automatically make that action uncertain.

## Current clinical scope

Hypertension follow-up care actions are the first evaluation domain. Clinical rules must remain traceable to authoritative sources and versioned independently of patient instances.
