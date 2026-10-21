# EgyHealth 360 — Conceptual Data Model V1

This is a logical model, not executable Prisma/SQL.

## Identity

### users
- id
- email (unique)
- password_hash
- role: PATIENT | CLINICIAN | ADMIN
- status
- created_at / updated_at

### patient_profiles
- id
- user_id (unique FK)
- display_name
- date_of_birth
- sex

### clinician_profiles
- id
- user_id (unique FK)
- display_name
- specialty
- professional_identifier_optional

### clinician_patient_assignments
- id
- clinician_id
- patient_id
- status
- assigned_at
- ended_at

## Clinical planning

### guideline_sources
- id
- name / publisher / version / publication_date
- reference_url
- status

### care_plan_templates
- id
- name
- condition_code
- version
- guideline_source_id
- status: DRAFT | PUBLISHED | RETIRED
- published_at

### care_rule_definitions
- id
- template_id
- rule_key / rule_version
- action_type
- applicability_definition
- timing_definition
- completion_definition
- source_reference

### care_plans
- id
- patient_id
- template_id / template_version
- created_by_clinician_id
- status: DRAFT | ACTIVE | COMPLETED | CANCELLED
- started_at / completed_at / cancelled_at

### care_actions
- id
- care_plan_id
- patient_id
- rule_definition_id
- action_type
- operational_status: PLANNED | ACTIVE | COMPLETED | CANCELLED
- not_before_at / due_at
- stable_occurrence_key
- created_at / completed_at / cancelled_at

## Clinical evidence

### data_sources
- id
- name
- type: PATIENT | CLINIC | EXTERNAL_PROVIDER | SYNTHETIC_GENERATOR | BENCHMARK

### record_coverage_windows
- id
- patient_id
- data_source_id
- start_at / end_at
- coverage_status: COMPLETE | INCOMPLETE | UNKNOWN

### blood_pressure_measurements
- id
- patient_id
- systolic / diastolic
- measured_at
- source_type
- entered_by_user_id
- data_source_id
- created_at

### follow_up_appointments
- id
- patient_id / clinician_id
- scheduled_at
- status: SCHEDULED | COMPLETED | CANCELLED | MISSED
- created_by / created_at

### clinical_encounters
- id
- patient_id / clinician_id
- occurred_at
- encounter_type
- source/data_source_id

## Closure intelligence

### closure_assessments
- id
- care_action_id
- classification: NOT_DUE | COMPLETED | SCHEDULED | TRUE_GAP | EXEMPT | UNCERTAIN
- evaluated_at
- rule_version / engine_version
- explanation_summary
- reason_codes
- is_stale
- supersedes_assessment_id
- created_at

Assessments are immutable.

### assessment_evidence
- id
- assessment_id
- evidence_kind
- evidence_reference_id_optional
- evidence_role: SUPPORTING | CONTRADICTING | MISSING | CONTEXT
- reason

### clinician_assessment_reviews
- id
- assessment_id
- clinician_id
- review_status: CONFIRMED | OVERRIDDEN
- override_classification_optional
- override_reason_optional
- reviewed_at

## System

### audit_logs
- id
- actor_user_id
- action_type
- entity_type / entity_id
- timestamp
- safe_metadata

Application audit is append-only and distinct from the patient clinical timeline.

## Research

### experiment_runs
- id
- dataset_version / synthea_version
- patient_count / random_seed
- missingness_level / corruption_profile
- baseline_engine_version / proposed_engine_version
- rule_set_version
- status: PENDING | RUNNING | COMPLETED | FAILED
- started_at / completed_at

### benchmark_cases
- id
- experiment_run_id
- synthetic_patient_id
- case_key
- ground_truth_classification
- scenario_type

### corruption_events
- id
- benchmark_case_id
- corruption_type
- target_type / target_reference
- corruption_metadata

### engine_predictions
- id
- benchmark_case_id
- engine_type: BASELINE | PROPOSED
- engine_version
- predicted_classification
- reason_codes
- execution_time_ms

### evaluation_metrics
- id
- experiment_run_id
- engine_type
- metric_name / metric_value
- class_label_optional

## Key constraints

- `users.email` unique
- one corresponding profile per user
- no duplicate active clinician-patient assignment for the same pair
- care-plan template `(name, version)` unique
- rule `(template/version, rule_key)` unique
- one ACTIVE hypertension care plan per patient in MVP V1
- generated care actions idempotent by patient+plan+rule+expected occurrence
- foreign-key integrity for all core relationships
- product-facing APIs must never expose benchmark ground truth

## Time/versioning

Technical timestamps use UTC. Date-only clinical concepts use date types when appropriate. Published templates/rules and closure assessments are not silently mutated; new versions/assessments preserve history.

## EH-009 executable clinical-definition slice

The conceptual future models above are not all implemented. EH-009 adds only
GuidelineSource, CarePlanTemplate and CareRuleDefinition. Exact fields, indexes,
CHECKs and lifecycle are in the Prisma schema and EH-009_CLINICAL_DEFINITION_CONTRACT.md.
Publication year is stored instead of an unsupported exact publication date.
Sources are append-only, without a separate lifecycle. Templates own DRAFT/PUBLISHED/
RETIRED for the aggregate; rule status is inherited. Structured versioned JSONB holds
applicability/trigger/timing/completion/schedule/exemption/coverage/source declarations.
No free-form interpretation column. Uniques retain (name,version), add stable
(templateKey,version), (templateId,ruleKey) and global (ruleKey,ruleVersion).
All relationships RESTRICT. New catalog timestamps are database-trigger owned.
Patient CarePlan is implemented by EH-010 as specified below; CareAction remains deferred.


## EH-010 executable care-plan slice

CarePlan has exactly id, patientId (patient_profiles.id), templateId, ruleDefinitionId,
createdByUserId, status (DRAFT/ACTIVE/CANCELLED), createdAt, startedAt, cancelledAt.
UUID defaults and timestamps are database-owned. Explicit exact template and rule
FKs, with composite rule/template consistency; no copied versions or latest lookup.
Only the approved EH-009 aggregate is permitted. Pins/creator/patient immutable from
insertion; DELETE/TRUNCATE blocked. One ACTIVE hypertension plan per patient via a
partial unique index; multiple drafts allowed. No completedAt/updatedAt/reason.
Conceptual COMPLETED and all CareAction/evidence models above remain future work.
Exact contract: EH-010_CARE_PLAN_CONTRACT.md. Activation is not clinical evidence.


## EH-011 executable BP slice

BloodPressureMeasurement contains exactly id, patientId (patient profile FK), systolic,
diastolic (int32), unit (mmHg), measuredAt, createdAt, recordedByUserId (user FK),
sourceKind (PATIENT_SELF_ENTRY/CLINICIAN_ENTRY). No clinical plausibility bounds or
qualification columns. Event time is caller-owned, TIMESTAMPTZ(6) with millisecond
alignment; receipt time is database-owned TIMESTAMPTZ(3); event <= receipt.
All UPDATE/DELETE/TRUNCATE rejected. Two RESTRICT FKs, patient/event/id history index
and actor index. Conceptual data_sources, encounter and CarePlan links are deferred.
Internal recorder UUID is omitted from HTTP. Identical submissions retain distinct
identities. Corrections/invalidation are future evidence-consumer gates.
Exact contract: EH-011_BP_PROVENANCE_CONTRACT.md. No CareAction generation.

## EH-012 executable follow-up and encounter slice

The conceptual four-state appointment/clinician fields above are future concepts, not executable behavior. FollowUpAppointment has exactly id, patientId, scheduledAt, purpose, status SCHEDULED/CANCELLED, createdByUserId, createdAt, cancelledAt, cancelledByUserId. Only SCHEDULED->CANCELLED; schedule/provenance immutable; removal prohibited. ClinicalEncounter has exactly id, patientId, occurredAt, purpose, recordedByUserId, createdAt. EncounterBloodPressureAssociation has exactly id, patientId, encounterId, bloodPressureMeasurementId, recordedByUserId, createdAt. Encounters/links reject every UPDATE/DELETE/TRUNCATE. Purpose HTN_BP_FOLLOWUP is operational only; no clinician participant/CarePlan/rule/action FK or qualification. Composite same-patient FKs and unique BP enforce many BPs per encounter, at most one encounter per BP. No BP row changes; supporting unique keys only. No action-linked schedule or completion inference. Exact schema/guards/time/provenance: EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md.

## EH-013 executable record coverage slice

RecordCoverageWindow has exactly id, patientId (patient_profiles.id FK), sourceType (RecordCoverageSourceType enum with single variant SYNTHETIC_BENCHMARK), sourceReference (VARCHAR(128)), status (RecordCoverageStatus enum: COMPLETE, INCOMPLETE, UNKNOWN), startAt (TIMESTAMPTZ(6)), endAt (TIMESTAMPTZ(6)), createdAt (TIMESTAMPTZ(3) database-owned).
Chronology invariant: startAt < endAt. Exact assertion uniqueness: (patient_id, source_type, source_reference, status, start_at, end_at).
Covering index: (patient_id, source_type, source_reference, start_at, end_at).
Every UPDATE, DELETE, and TRUNCATE is unconditionally prohibited by database trigger.
No recordedByUserId column; no DataSource table.
Normalization is strictly source-partitioned: (patientId, sourceType, sourceReference).
Normalized evidence query executes as a single-statement transactional snapshot returning canonical intervals, BP candidates, encounter BP candidates, and operational appointment candidates without clinical qualification.
Exact contract: EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md. No CareAction generation or EACCE classification.

## EH-015 executable observed applicability slice

Two models: ObservedClinicalApplicabilitySnapshot (15 scalar fields) and ObservedClinicalApplicabilityRetraction (9 scalar fields).
Four enums:
- ObservedApplicabilitySourceType: SYNTHETIC_OBSERVED_INPUT
- ObservedAgeAssertionState: NO_ASSERTION | UNKNOWN | ASSERTED_VALUE
- ObservedPregnancyStatus: PREGNANT | NOT_PREGNANT | UNKNOWN
- ObservedConditionStatus: PRESENT | ABSENT | UNKNOWN

Snapshot fields: id, patientId, sourceType, sourceReference, assertionReference, effectiveAt, assertedAt, recordedAt, ageAssertionState, ageYearsAtAssessment, pregnancyStatus, hypertensionStatus, cvdStatus, diabetesStatus, ckdStatus.
Retraction fields: id, snapshotId, patientId, sourceType, sourceReference, retractionReference, assertedAt, recordedAt, reasonCode.

Constraints and invariants:
- Natural identity uniqueness on (patient_id, source_type, source_reference, assertion_reference).
- Terminal one-to-one retraction on snapshot_id with composite partition FK (snapshot_id, patient_id, source_type, source_reference).
- Retraction reference uniqueness on (patient_id, source_type, source_reference, retraction_reference).
- Age assertion check: NO_ASSERTION and UNKNOWN require age NULL; ASSERTED_VALUE requires age >= 0.
- Chronology: snapshot effectiveAt <= assertedAt <= recordedAt. Retraction assertedAt >= target snapshot assertedAt and assertedAt <= its own recordedAt; retraction recordedAt >= target snapshot recordedAt. Receipt is database-owned TIMESTAMPTZ(3).
- Immutability: database triggers reject UPDATE, DELETE, and TRUNCATE unconditionally on both tables.
- Research noninterference: complete ground truth never backfills missing observed fields (null strictly preserved).
- Read-only authorized query service with canonical user/session/assignment lock discipline and mechanical point projection.
Exact contract: EH-015_OBSERVED_APPLICABILITY_CONTRACT.md. No CareAction generation or EACCE classification.


