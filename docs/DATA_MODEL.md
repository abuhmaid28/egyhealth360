# EgyHealth 360 — Data Model Status and V3 Concepts

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

[Slice 2](V3_I1_SLICE2.md) Organization/OrganizationMembership and fixed staff roles are COMPLETE. [Slice 3](V3_I1_SLICE3.md) reuses User/PatientProfile/Session/AuditLog with no schema or migration change. I1 COMPLETE; Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 COMPLETE. Specialty/public directory are COMPLETE in Slice 4. RelationshipRequest and AssignmentEndProvenance are COMPLETE in Slice 5. Historical schema/migration/clinical behavior is preserved.

## Implemented model inventory — 34 models; I1 COMPLETE; I2 Slice 2 IN REVIEW

Exactly the following **34 Prisma models** exist: 31 accepted I1 models plus ClinicSchedulingSettings, AvailabilitySlot and AvailabilityOperation in this authorized I2 Slice 2 PR. One additive scheduling migration follows fourteen immutable historical migrations. The [Prisma schema](../packages/db/prisma/schema.prisma), migration SQL and accepted slice contracts are authoritative for executable fields/constraints.

- `User`
- `Session`
- `PatientProfile`
- `ClinicianProfile`
- `ClinicianPatientAssignment`
- `AuditLog`
- `GuidelineSource`
- `CarePlanTemplate`
- `CareRuleDefinition`
- `CarePlan`
- `BloodPressureMeasurement`
- `FollowUpAppointment`
- `ClinicalEncounter`
- `EncounterBloodPressureAssociation`
- `RecordCoverageWindow`
- `ObservedClinicalApplicabilitySnapshot`
- `ObservedClinicalApplicabilityRetraction`
- `BpAmendmentOperation`
- `BpExclusion`
- `BpPrivacyTarget`
- `CareAction`
- `CareActionDecision`
- `CareActionApplicabilityInput`
- `Organization`
- `OrganizationMembership`
- `Specialty`
- `ClinicDirectory`
- `ClinicianDirectory`
- `DirectoryAffiliation`
- `RelationshipRequest`
- `AssignmentEndProvenance`
- `ClinicSchedulingSettings`
- `AvailabilitySlot`
- `AvailabilityOperation`

Current User roles are PATIENT/CLINICIAN/ADMIN/LAB_STAFF/PHARMACY_STAFF. Organization and OrganizationMembership provide operational scope only. RelationshipRequest is provenance only; no general booking, prescription, lab order/result, notification, ClosureAssessment or experiment-result model is implemented. A model's existence does not imply a public route, workspace or completed product requirement.

## Approved V3 domain concepts — delivered foundations and future scope

Product V3 policy is APPROVED; V3-I1 overall is COMPLETE. The table distinguishes delivered I1 foundations from broader future concepts; the exact 34-model inventory above governs this branch. These concepts do not prescribe one table per concept. Further physical schema changes require separately authorized slices; Slice 6 is COMPLETE.

| Concept | Approved meaning, current delivery and integrity boundary |
|---|---|
| Provider / Clinic / location / Specialty | [Slice 4](V3_I1_SLICE4.md) curated Specialty/directory foundation COMPLETE; richer provider/routing capabilities remain future, without enterprise hierarchy or record-completeness inference |
| Provider membership | Slice 2 operational foundation COMPLETE: bounded LAB_STAFF/PHARMACY_STAFF with current active organization/membership and fixed operation scope; not generalized IAM or routed-artifact authority |
| Published availability / general booking | [I2 Slice 2](V3_I2_SLICE2.md) finite availability/configuration/history/withdrawal is IMPLEMENTED / IN REVIEW. General booking, patient reservation operations and booked schedule remain future and NOT AUTHORIZED |
| Genuine clinical relationship | Slice 5 RelationshipRequest / AssignmentEndProvenance COMPLETE: bilateral workflow/provenance around the sole ClinicianPatientAssignment grant, preserved history/current checks; no legacy consent backfill or I1 completion claim |
| General consultation documentation | Booking/encounter/provider/actual treating provenance; signed protected author-only notes versus released summaries/addenda; optional artifacts |
| Problem / Diagnosis / allergy context | Human-entered clinical assertions and minimal unknown/not-reviewed safety context with provenance; no inferred eligibility or diagnosis |
| Medication / Prescription / item | Small catalog and signed immutable prescribed identity/quantity/unit/instructions/validity; cancellation/replacement preserves linkage and reconciles previous dispensing |
| Medication dispense | Routed pharmacy's full-item fulfillment fact/history with actual quantity/unit/actor/time; not medication ingestion; no partial/refill/substitution engine |
| Lab order / result | Distinct clinician request and recipient lab fulfillment/final result; original patient/order/test/source/author/validator/time/status retained; corrections/amendments/retractions preserve prior versions |
| Optional imaging order/report | Tier 2 only, shared diagnostics principles where useful; report/reference metadata, no PACS/DICOM/required binary upload infrastructure |
| Follow-up intent | Clinical intent exists without a slot, may later link to the one new operational booking; no competing editable legacy booking |
| Timeline / in-app notification | Authorized source-linked projection and bounded important updates/reminders; filter current privacy/authority, including revealing counts/references; not generic audit |
| Later closure/review/research | Immutable assessments/explanation/evidence/reviews and isolated experiment manifests/predictions/metrics; I5/I7 scope, not new broad disease/recurrence research |

Source clinical records, operational records, timeline projections and immutable audit remain distinct. Signed clinical records use reasoned versions/addenda/retractions/reversals; no silent overwrite or cross-patient move. Apply [D36](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension) to new lab/pharmacy artifacts. Completed fulfillment and relationship ending never erase historical sources or imply ongoing personal entitlement.

The former V1 field/lifecycle sketches are not a schema specification; conceptual COMPLETED CarePlan, mutable CareAction lifecycle, DataSource, four-state legacy follow-up and generic research tables were never made executable by documentation. Existing CarePlan remains DRAFT/ACTIVE/CANCELLED; EH-012 only SCHEDULED/CANCELLED; EH-014 immutable INITIAL with no operational status. That original V3 reconciliation added no schema/SQL. Subsequent Slice 4 delivered the four directory models; Slice 5 adds the two provenance models above, COMPLETE. Historical schema and migrations remain preserved.

## Historical executable slice notes — retained implementation truth

The notes below describe what each slice introduced at its time. Later slices extend earlier deferrals; read them together with the exact inventory above and accepted contracts. In particular, Issue #31 supplies BP correction/privacy and EH-014 supplies INITIAL actions; no EACCE, recurrence or V3 models are claimed. References to old conceptual fields/lifecycles describe the [baseline V1 sketches](https://github.com/abuhmaid28/egyhealth360/blob/ea777ce71c3639a37ec015739a12f0fadc0b4dcc/docs/DATA_MODEL.md), not implemented models or newly frozen V3 fields.

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

## Issue #31 executable BP correction/invalidation slice

BpAmendmentOperation freezes actor/patient/kind/client operation key, exact BP target, structured reason, optional duplicate target, explicitly selected predecessor IDs and optional fresh full-pair replacement. BpExclusion enforces one immutable terminal exclusion per BP. BpPrivacyTarget independently enforces one wrong-patient privacy membership per BP, including already-excluded evidence without changing its reason. All references preserve same-patient context with RESTRICT FKs; no source BP rewrite, mutable valid flag or backfill. Unique actor/kind/operation key, replacement ownership, one bare restatement and immutable/deferred-completeness guards enforce the [contract](BP_CORRECTION_INVALIDATION_CONTRACT.md). Source occurrence time differs from database-owned local assertion/receipt; no commit-time or arbitrary historical-knowledge model.


## EH-014 bounded INITIAL implementation — merged and verified

The executable EH-014 slice supersedes the conceptual care_actions lifecycle above: CareAction has only exact patient/plan/template/rule pins, INITIAL/type, immutable triggerAt/recommendedAt/dueBy/createdAt and one-to-one protected decision. CareActionDecision stores explicit selection, clinician/assignment/command provenance and a fixed-shape exact evaluated snapshot. CareActionApplicabilityInput pins exact point membership. No operational status/completed/cancelled/superseded fields. SQL-owned deferred completeness and same-patient composite RESTRICT FKs accompany the Prisma models. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).

Status evidence: [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. [Post-merge validation](EH-014_VALIDATION.md#post-merge-validation). No behavioral or R1–R8 contract change is introduced by this status closeout.

## Current I2 Slice 2 applicability

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

## V3-I2 contract/readiness boundary

See the [I2 contract](V3_I2_CONTRACT.md) and [Slice 2 implementation](V3_I2_SLICE2.md) for the frozen boundaries and current delivery. Only finite availability and operational scheduling configuration are implemented in Slice 2. Full Journey A is incomplete. Historical evidence and D01–D36 retain their original meaning.

## V3-I2 Slice 2 current additive inventory

The current schema has **34 models / 15 migrations**. [Availability implementation](V3_I2_SLICE2.md#database-and-configuration) adds immutable ClinicSchedulingSettings versions, AvailabilitySlot and immutable AvailabilityOperation. No Booking/Consultation/FollowUpIntent models. All 31 previous domain tables and fourteen historical migration bytes remain preserved. There is no scheduling backfill. Existing slice-specific counts above describe those historical stages, not the current complete schema.
