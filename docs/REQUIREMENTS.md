# EgyHealth 360 — Requirements V2

## Scope note
These requirements describe Core V1 only. They do not authorize lab/pharmacy portals, marketplace features, diagnosis, treatment recommendation, medication-dose logic, real-patient deployment, or an ML service.

## Problem IDs
- P-001 False care-gap classification when completion evidence is absent from an incomplete longitudinal record.
- P-002 Clinicians need an inspectable explanation of why a care action was classified a certain way.
- P-003 Patient/clinical data requires relationship-aware authorization and auditable access.
- P-004 Clinical assessments/reviews must preserve history rather than silently overwrite prior state.
- P-005 The research contribution must be reproducible and resistant to ground-truth leakage/cherry-picking.
- P-006 Patients need a simpler view of expected next actions without exposing misleading clinical terminology.

## Functional requirements

### Identity and access
- FR-001 The system shall authenticate Patient, Clinician, and Admin users using server-side sessions.
- FR-002 The system shall authorize patient-owned and clinician-assigned resources on the backend.
- FR-003 The system shall allow logout/session invalidation and expose the current authenticated user/role.

### Clinician workspace
- FR-010 A clinician shall be able to view a paginated/filterable list of actively assigned patients.
- FR-011 A clinician shall be able to open an authorized patient summary.
- FR-012 A clinician shall be able to inspect the patient's care plan, care actions, timeline, and BP measurements.
- FR-013 A clinician shall be able to open a care-action detail view containing current classification, explanation, evidence used, relevant missing/coverage information, rule/version metadata, and review state.

### Care planning and evidence
- FR-020 Authorized clinicians shall be able to create/activate/cancel version-pinned care plans within the approved hypertension scope.
- FR-021 The system shall generate/version care actions from approved rule definitions without silently changing published rules.
- FR-022 Patients shall be able to submit their own BP measurement; authorized clinicians may submit BP measurements for assigned patients.
- FR-023 The system shall preserve provenance for evidence relevant to closure evaluation.
- FR-024 The system shall support follow-up scheduling evidence sufficient for the `SCHEDULED` product state without becoming a general appointment marketplace.
- FR-025 The system shall represent relevant record-coverage windows used by evidence-aware evaluation.

### Care-closure intelligence
- FR-030 The system shall evaluate a care action deterministically using action timing, rule version, observed evidence, relevant coverage, and explicit evaluation time.
- FR-031 EACCE shall support `NOT_DUE`, `COMPLETED`, `SCHEDULED`, `TRUE_GAP`, `EXEMPT`, and `UNCERTAIN` product classifications.
- FR-032 Every closure assessment shall persist an explanation/reason trace and the rule/engine versions used.
- FR-033 New relevant evidence shall cause the current assessment to become stale/superseded and trigger/permit a new immutable assessment rather than overwrite history.
- FR-034 A clinician shall be able to confirm or override an assessment; an override requires a reason and preserves the original engine result.
- FR-035 The system shall expose the effective reviewed state while keeping engine assessment and clinician review distinguishable.

### Patient experience
- FR-040 A patient shall be able to view their current care plan and care actions.
- FR-041 A patient shall see simplified patient-facing wording for closure states.
- FR-042 A patient shall be able to view the next expected action and relevant schedule/status without self-closing restricted clinical actions.
- FR-043 A patient shall be able to view their own BP history.

### Admin/research
- FR-050 An authorized Admin shall be able to manage demo users/data without receiving unrestricted clinical access by role alone.
- FR-051 An authorized Admin shall be able to start a synthetic experiment run using approved configurations.
- FR-052 The system shall persist experiment status, protocol/dataset/engine/rule versions, seeds/configuration, raw counts, and metrics.
- FR-053 An authorized Admin shall be able to view real experiment results and metadata; placeholder/fabricated metrics are prohibited.
- FR-054 The experiment worker shall run the same shared EACCE package/version used by product evaluation for the compared proposed method.

### Auditability
- FR-060 The system shall append audit records for security-sensitive and assessment/review-changing actions.
- FR-061 Audit and immutable assessment history shall remain distinct from the patient-facing clinical timeline.

## Core business rules
- BR-001 Patient can access only own data.
- BR-002 Clinician access requires an active clinician-patient assignment.
- BR-003 Care plans must pin template/rule versions.
- BR-004 Published clinical definitions are immutable.
- BR-005 Critical clinical history is not silently hard-deleted.
- BR-006 EACCE never diagnoses or prescribes.
- BR-007 Missing completion evidence alone does not prove a true gap when relevant coverage is insufficient.
- BR-008 `UNCERTAIN` is allowed under insufficient observed evidence.
- BR-009 `SCHEDULED` requires valid relevant future evidence.
- BR-010 `COMPLETED` requires qualifying completion evidence.
- BR-011 New relevant evidence triggers/requires re-evaluation.
- BR-012 Clinician override preserves original assessment and requires a reason.
- BR-013 Patient cannot arbitrarily self-close restricted clinical actions.
- BR-014 Research ground truth is isolated from engine inputs.
- BR-015 Identical deterministic inputs/evaluation time/rule version produce identical output.
- BR-016 Benchmark methods must receive the same corrupted observed case when compared.
- BR-017 Final-holdout results must not be used for unversioned tuning.
- BR-018 Clinical rules must be source/version/section traceable and may not be invented by agents.
- BR-019 Real patient data is prohibited in Core V1 research/demo workflows.
- BR-020 Admin role alone does not grant unrestricted patient clinical access.

## Closure decision semantics
The implementation contract must be frozen by tests. Current semantics require at minimum:
1. applicability/exemption handling;
2. qualifying completion evidence;
3. valid future schedule evidence;
4. due/not-due timing;
5. relevant coverage sufficiency;
6. confirmed true gap vs uncertainty.

No implementation may reorder these in a way that changes approved acceptance behavior without a versioned decision and test update.

## Core acceptance criteria
- AC-001 Overdue + complete relevant coverage + no completion/schedule/exemption => `TRUE_GAP`.
- AC-002 Overdue + insufficient relevant coverage + no stronger resolving evidence => `UNCERTAIN`, not confirmed `TRUE_GAP`.
- AC-003 Future due boundary with no earlier resolving state => `NOT_DUE`.
- AC-004 Valid relevant future follow-up evidence => `SCHEDULED` according to the frozen scheduling contract.
- AC-005 Valid qualifying completion evidence => `COMPLETED`.
- AC-006 Documented valid exemption => `EXEMPT`; no exemption is fabricated by the engine.
- AC-007 Every assessment exposes a reason/explanation trace consistent with the decision path.
- AC-008 Assessment history is immutable/auditable; re-evaluation inserts a new assessment.
- AC-009 Clinician override preserves original engine assessment and records actor, reason, and time.
- AC-010 Backend authorization is enforced independently of UI visibility.
- AC-011 A clinician without an active assignment cannot access another patient's protected resource even with a valid clinician role.
- AC-012 Ground-truth fields cannot reach B0/B1/EACCE observed inputs during research evaluation.
- AC-013 Identical deterministic input + rule version + engine version + evaluation time produces identical output.
- AC-014 Experiment runs store sufficient manifest/version/seed/config/raw-count information to reproduce reported metrics.
- AC-015 Patient-facing UI distinguishes `TRUE_GAP` from `UNCERTAIN` using wording/icon semantics, not color alone.
- AC-016 No final result screen displays invented or placeholder accuracy/metric values as real results.

## Error/edge requirements
- ERR-001 Missing/invalid authorization -> deny without leaking protected resource existence beyond approved error behavior.
- ERR-002 EACCE evaluation failure -> assessment unavailable/error state; never silently substitute a clinical classification.
- ERR-003 Missing required clinical-rule applicability data -> do not guess eligibility.
- ERR-004 Stale assessment review attempt -> reject or require refresh using a stable machine-readable error.
- ERR-005 Experiment failure -> persist failed state/error context; do not display stale previous metrics as the failed run's results.
- ERR-006 Invalid BP input -> reject with validated field errors; no silent coercion into clinically plausible values.

## Non-functional requirements
- NFR-001 Free-first/self-hostable Core V1.
- NFR-002 Responsive web app; clinician/admin desktop-first and patient mobile-first.
- NFR-003 RTL-ready and English-first i18n architecture; Arabic support must not require redesign.
- NFR-004 WCAG 2.2 AA target for critical flows.
- NFR-005 Deterministic research runs from pinned configuration/seed/version.
- NFR-006 Critical authorization, EACCE, clinical-rule, migration, and research-integrity areas require independent second-pass review where practical.
- NFR-007 Normal product evaluation should be interactive under demo-scale load; no unsupported uptime/latency SLA is claimed.
- NFR-008 Secrets and sensitive authentication data must not be committed or logged.

## Source relationships
- `docs/PRODUCT.md` defines product scope.
- `docs/UX.md` defines navigation/screen behavior.
- `docs/API.md` defines conceptual endpoint groups until implementation freezes OpenAPI contracts.
- `docs/research/CLINICAL_RULE_CATALOG_V1.md` defines the first executable clinical rule.
- `docs/research/EXPERIMENT_PROTOCOL_V1.md` defines research-evaluation behavior.
- `docs/TESTING.md` and the traceability matrix define verification coverage.

## Issue #31 implementation evidence boundary

BP source-history preservation, append-only amendment provenance, atomic audit and wrong-patient masking extend FR-023/FR-060/FR-061 foundations. FR-012/FR-043 history remains an API foundation without UI completion. Evidence semantics are specified in [the BP correction contract](BP_CORRECTION_INVALIDATION_CONTRACT.md) and verified in its validation report. This does not satisfy FR-021 (incomplete), FR-024 (foundation-only) or AC-004/AC-005 (unsatisfied). EH-014 remains open pending readiness re-review after this prerequisite's independent review, merge and post-merge validation. M2 IN PROGRESS; EACCE remains M3.


## EH-014 bounded INITIAL implementation — pending review

FR-021: bounded INITIAL generation is implemented on the EH-014 feature branch, pending independent implementation review, merge and post-merge CI/exit verification; recurring care and arbitrary versions remain unimplemented. FR-024 remains foundation-only/incomplete; AC-004/AC-005 remain unsatisfied. M2 IN PROGRESS. No closure classifications or design work are added. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).
