# Current data model

CURRENT AUTHORITATIVE inventory at baseline `eb61da263ce44db5ca71ffdfea6a87309c8e17ef`. Exactly **63 Prisma models/domain tables, 22 additive migrations**; the migration ledger is one additional table (64 public tables in accepted migration/runtime evidence). [Schema](../packages/db/prisma/schema.prisma), [SQL migrations](../packages/db/prisma/migrations) and accepted contracts govern executable constraints. The earlier 31/34/39/43-model inventories were slice snapshots, not today's schema.

## Implemented model inventory

### Identity/session/assignment/audit

`User`, `Session`, `PatientProfile`, `ClinicianProfile`, `ClinicianPatientAssignment`, `AuditLog`.

### M2 planning and evidence

`GuidelineSource`, `CarePlanTemplate`, `CareRuleDefinition`, `CarePlan`, `BloodPressureMeasurement`, `FollowUpAppointment`, `ClinicalEncounter`, `EncounterBloodPressureAssociation`, `RecordCoverageWindow`, `ObservedClinicalApplicabilitySnapshot`, `ObservedClinicalApplicabilityRetraction`, `BpAmendmentOperation`, `BpExclusion`, `BpPrivacyTarget`, `CareAction`, `CareActionDecision`, `CareActionApplicabilityInput`.

### I1 organizations/directory/relationships

`Organization`, `OrganizationMembership`, `Specialty`, `ClinicDirectory`, `ClinicianDirectory`, `DirectoryAffiliation`, `RelationshipRequest`, `AssignmentEndProvenance`.

### I2 availability/booking/consultation/documents/intent

`ClinicSchedulingSettings`, `AvailabilitySlot`, `AvailabilityOperation`, `Booking`, `BookingOperation`, `BookingEvent`, `BookingAttendance`, `Consultation`, `ConsultationDocument`, `ConsultationDocumentVersion`, `ConsultationDocumentOperation`, `ConsultationPrivacyRestriction`, `FollowUpIntent`, `FollowUpIntentVersion`, `FollowUpIntentBookingLink`, `FollowUpIntentOperation`, `FollowUpIntentPrivacyRestriction`.

### I3 prescription/catalog

`Medication`, `MedicationVersion`, `Prescription`, `PrescriptionItem`, `PrescriptionVersion`, `PrescriptionVersionItem`, `PrescriptionOperation`, `PrescriptionPrivacyRestriction`, `MedicationOperation`.

### I3 pharmacy

`PharmacyRoute`, `PharmacyRouteItem`, `PharmacyRouteVersion`, `PharmacyDispense`, `PharmacyDispenseCorrection`, `PharmacyOperation`.

## Ownership, integrity and future concepts

One `packages/db` schema owns the migration chain. Migrations 1–10 establish M2, 11–14 I1, 15–20 I2, 21 prescriptions/catalog and 22 pharmacy. Latest migration: `20261101170000_v3_i3_pharmacy_fulfillment`, SHA-256 `d1482ce8ac43bb9eb6d86397ce22ca2f015c874d04eeb96eacd9aa5a731eca37`. Add future changes; never edit accepted SQL/checksum history. No migration/schema changes are made by this reboot.

Cross-module foreign keys bind same-patient sources, actual treating/recording identities, exact organization/membership/route provenance and immutable history. SQL adds guards beyond Prisma: append-only update/delete/truncate prevention, immutable published catalog/provenance, unique/exclusion constraints, operation/result/audit completeness, privacy and source eligibility. Review SQL and service lock order together. Application code uses both Prisma and explicit pg transactions, not Prisma-only persistence.

Current clinical authority is assignment; operational membership is distinct. Prescription and dispense are separate facts; reversal does not restore an item entitlement. FollowUpAppointment (legacy HTN) and Booking (general operations) are intentionally distinct; FollowUpIntent is human clinical instruction with explicit booking links. ConsultationDocument private notes/released summaries have separate identities and privacy. INITIAL CareActionDecision is generation provenance, not ClosureAssessment.

There are **no LabOrder/LabResult, notification, ClosureAssessment or experiment-result models**. Future conceptual models in accepted contracts are not implemented. Source-linked I4 longitudinal integration and I5/research remain unauthorized. Hosted migration state is not inferred from this repository inventory; staging evidence currently proves only migrations through 20.

## Retained implementation notes — historical slice scope

The following notes preserve what each slice introduced. Counts, “no later model” and authorization claims inside a slice note apply to that point in history only. The exact inventory above governs the current baseline; accepted behavior/privacy contracts remain preserved.

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

## Historical I2 Slice 2 additive inventory

The current schema has **34 models / 15 migrations**. [Availability implementation](V3_I2_SLICE2.md#database-and-configuration) adds immutable ClinicSchedulingSettings versions, AvailabilitySlot and immutable AvailabilityOperation. No Booking/Consultation/FollowUpIntent models. All 31 previous domain tables and fourteen historical migration bytes remain preserved. There is no scheduling backfill. Existing slice-specific counts above describe those historical stages, not the current complete schema.

## Slice 6 additive persistence

Migration 19 adds FollowUpIntent, FollowUpIntentVersion, FollowUpIntentBookingLink, FollowUpIntentOperation and FollowUpIntentPrivacyRestriction: 48 domain models/tables. [Reconciled contract](V3_I2_SLICE6.md) describes exact composite provenance, immutable version/link chains, operation identity, privacy and deferred atomic-audit guards. Eighteen historical migration hashes/rows are preserved; no backfill or legacy appointment adapter.

## Slice 7 close extension

Migration `20261031140000_v3_i2_consultation_close` adds Consultation `version` (OPEN=1/CLOSED=2) and nullable `closedAt`, `closedByUserId`, `closeAssignmentId`, `closeOperationKey`, `closeCommand`. Original opening/provenance columns remain immutable; old rows gain only version 1/NULL close metadata, with no fabricated close facts. There are still 48 domain models/tables and twenty migrations; all nineteen historical SQL files are unchanged.

The sole update is one current-authorized OPEN→CLOSED, atomic with booking IN_CONSULTATION→CONSULTED. Existing append-only BookingEvent/BookingOperation retain CLOSE history/result; server-owned close actor/time/current grant are immutable after close. Composite FKs and deferred guards require matching states/source/event/operation/current-transaction audit and reject partial/orphan closes. No document/intent/legacy HTN/CareAction/EACCE bridge. See [Slice 7](V3_I2_SLICE7_EXIT_REVIEW.md).

## V3-I3 Slice 1

Migration 21 adds immutable prescription roots, item snapshots, append-only lifecycle versions and version-item bindings, atomic operation/audit references and lineage-wide privacy restrictions, plus three curated medication identities and operational catalog version/operation history. See [source persistence and invariants](V3_I3_SLICE1.md). Existing migration bytes and populated clinical history are preserved; no clinical backfill.

## V3-I3 Slice 2

Migration 22 adds immutable PharmacyRoute, PharmacyRouteItem, PharmacyRouteVersion, PharmacyDispense, PharmacyDispenseCorrection and PharmacyOperation. Parent/item locks plus immutable binding chains prevent multiple active destinations; unique item dispense identity remains consumed after reversal. Actual source cancellation/replacement/privacy writers gain a recipient-organization queue fence through additive triggers. See [persistence and lock graph](V3_I3_SLICE2.md). All 21 previous SQL files and existing rows are preserved; there is no fulfillment backfill.
