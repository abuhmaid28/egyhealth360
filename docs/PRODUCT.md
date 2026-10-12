# EgyHealth 360 — Product Definition V2

## Vision

EgyHealth 360 is a standards-oriented chronic-care coordination prototype that helps patients and clinicians track expected care actions and understand whether each action is completed, scheduled, unresolved, exempt, not yet due, or uncertain based on available longitudinal evidence.

## Core problem

An overdue expected action with no visible completion event is not always a genuine care gap. Records can be incomplete or fragmented. The product therefore treats evidence quality and relevant record coverage as first-class inputs instead of equating absence with failure.

## Roles

### Clinician — primary
- View assigned patients
- Review patient summary, care plan, timeline, measurements, and care actions
- See EACCE classification and explanation
- Confirm or override an assessment with a required reason
- Schedule/manage follow-up

### Patient — secondary
- View own plan and next actions
- View completed/upcoming items
- Enter permitted BP measurements
- View follow-up information
- Receive simple, non-accusatory wording for uncertain/attention states

### Admin — operational/research
- Manage accounts/status
- Load/reset demo data
- Run/view Evaluation Lab experiments
- No default unrestricted clinical-data editing

## MVP modules

1. Authentication & roles
2. Patient profile
3. Clinician patient list
4. Patient clinical summary
5. Hypertension care-plan template/rules
6. Care actions/tasks
7. Patient timeline/evidence
8. BP measurements
9. Follow-up scheduling
10. Evidence-Aware Care Closure Engine (EACCE)
11. Clinician review/override
12. Patient care view
13. Evaluation Lab

## Closure classifications

- NOT_DUE
- COMPLETED
- SCHEDULED
- TRUE_GAP
- EXEMPT
- UNCERTAIN

Operational action lifecycle is separate from closure classification.

## Product principles

1. Care-action first
2. Evidence before assumption
3. Uncertainty is allowed
4. Every classification must be explainable
5. Clinician remains in control
6. Standards-oriented, not standards-for-show
7. Focused hypertension-first scope

## Core differentiation

The graduation contribution is not generic reminders or a combined health record. It is the evidence-aware classification of expected care-action closure under incomplete longitudinal data, plus a reproducible controlled-missingness benchmark.

## Golden demo

1. Clinician opens a synthetic hypertensive patient.
2. One overdue action with complete relevant coverage becomes TRUE_GAP.
3. A similar case with missing relevant coverage becomes UNCERTAIN instead of a confirmed gap.
4. Another case with a valid future follow-up becomes SCHEDULED.
5. Patient view shows next steps in simple wording.
6. Evaluation Lab compares the naive baseline with EACCE across controlled missingness.

## Explicit non-goals

- Lab portal or laboratory ERP
- Pharmacy portal/e-commerce/dispensing workflow
- Doctor marketplace or reviews
- Full appointment marketplace
- Online consultation/video infrastructure
- Hospital ERP
- Insurance/payments
- Diagnostic AI
- Treatment recommendation or dose selection
- Diabetes-risk prediction
- Chatbot/OCR/image diagnosis
- Real-patient clinical deployment

## Success

Product success: the golden journey works end-to-end with correct authorization, auditable assessments, understandable explanations, clinician override, and stable synthetic demo data.

Academic success: baseline and proposed engine are reproducibly evaluated on synthetic care-action cases under controlled incompleteness with transparent metrics and limitations.
