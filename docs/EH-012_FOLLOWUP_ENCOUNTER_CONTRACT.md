# EH-012 operational follow-up and encounter evidence contract

Approved by [Issue #22 final approval 6204890129](https://github.com/abuhmaid28/egyhealth360/issues/22#issuecomment-6204890129), following the complete A–V report and [remote desk review](https://github.com/abuhmaid28/egyhealth360/issues/22#issuecomment-6204748227). Baseline `c24b7c487dc7d56624e8dd3cfa95ba92afa963a5`. ADR-026 records this foundation slice. The approval corrects the association-history route to `blood-pressure-associations`.

## Evidence and lifecycle

FollowUpAppointment has exactly id, patientId, scheduledAt, purpose, status, createdByUserId, createdAt, cancelledAt and cancelledByUserId. UUID identity is database generated. Patient points to patient_profiles.id; creator/canceller point to users.id. Purpose is exactly HTN_BP_FOLLOWUP as operational intent only. Status starts SCHEDULED with null cancellation provenance. Only SCHEDULED -> CANCELLED is permitted. CANCELLED is terminal. Identity/patient/schedule/purpose/creator/receipt time never change. Already-cancelled authorized requests return the original row without mutation/audit. Cancellation may occur after scheduled time; passing time never infers MISSED/COMPLETED. Rescheduling uses separate cancel/create operations. DELETE/TRUNCATE are rejected, including empty statements. No updatedAt, completedAt, missedAt, notes, reason, arbitrary metadata or participant clinician.

ClinicalEncounter has exactly id, patientId, occurredAt, purpose, recordedByUserId and createdAt. Purpose is exactly HTN_BP_FOLLOWUP. Recorder is the authenticated recording clinician, not a claim about who participated or delivered care. No lifecycle/status, appointment FK, external source or clinical-result fields. All UPDATE/DELETE/TRUNCATE statements are rejected, including empty/no-op attempts. Correction/invalidation/supersession remains deferred.

EncounterBloodPressureAssociation has exactly id, patientId, encounterId, bloodPressureMeasurementId, recordedByUserId and createdAt. It is immutable, including UPDATE/DELETE/TRUNCATE statements affecting zero rows. One encounter may have zero/many BPs; one BP has zero/one association. Existing patient-entered BP can be associated by an authorized clinician; BP values, time, recorder and sourceKind do not change. Association does not claim witnessing, measurement, verification, clinical relevance or completion.

No new model references CarePlan, template, rule or CareAction. No catalog or plan prerequisite. Retirement does not alter the operational records or their availability under current authorization. No qualification, relevance, completedEvidence, closesAction or scheduledEvidence booleans.

## Database representation and guards

One additive migration `20261018000000_eh012_followup_encounters`. All five historical migrations remain byte-identical. It adds no reference/demo rows and rewrites no BP row. Existing EH-011 guards remain unchanged; BP receives only a supporting UNIQUE(id,patient_id).

All FKs RESTRICT updates/deletes. Encounter UNIQUE(id,patient_id) and BP UNIQUE(id,patient_id) are referenced by association composite FKs (encounter_id,patient_id) and (blood_pressure_measurement_id,patient_id). Direct patient and recorder-user FKs remain. Thus patient equality is declarative, not only a service/trigger check. UNIQUE(blood_pressure_measurement_id) enforces cardinality. Prisma additionally requires a redundant UNIQUE(blood_pressure_measurement_id,patient_id) for the composite one-to-one relation; it changes no cardinality.

Appointment indexes: (patient_id,scheduled_at DESC,id DESC), creator, canceller. Encounter indexes: (patient_id,occurred_at DESC,id DESC), recorder, composite unique. Association indexes: unique BP, redundant composite unique, (patient_id,encounter_id,created_at DESC,id DESC), (encounter_id,patient_id), recorder. No patient/time or one-scheduled-appointment uniqueness.

Migration-owned functions: eh012_lock_clinician (shared structural actor locking), eh012_guard_appointment, eh012_guard_encounter_insert, eh012_guard_encounter_bp_insert, eh012_reject_appointment_removal, eh012_reject_immutable_evidence_mutation. Functions are SECURITY INVOKER with fixed search_path pg_catalog,public,pg_temp; explicit public-qualified relations/types/functions and pg_catalog-qualified built-ins where applicable resist TEMP shadows. Row insert/lifecycle guards plus statement removal/immutability guards enforce ordinary-write invariants. Structural provenance checks ACTIVE clinician user/profile/assignment and patient under locks. They do not authenticate sessions or emit genuine application audit. Schema owners/superusers can disable guards; no tamper-proof claim.

## Time

Reuse EH-011's strict timestamp grammar: YYYY-MM-DDTHH:mm:ss with optional 1..3 fractional digits and mandatory Z or ±HH:MM. Real Gregorian calendar, years 0001..9999 before/after UTC normalization, uppercase T/Z, seconds, offsets 00..23 hours and 00..59 minutes. Reject whitespace, impossible dates, leap seconds, 24:00, -00:00, missing offset, excess precision or out-of-range normalized years. Return UTC ISO with exactly three fractional digits. No silent rounding/coercion/clinical lookback window.

scheduledAt is caller event time and strictly greater than database receipt time at insertion. occurredAt is caller event time, may be backdated, and cannot exceed receipt time. Event columns use TIMESTAMPTZ(6) with finite/year/millisecond-alignment CHECKs. createdAt is database-owned TIMESTAMPTZ(3), assigned after structural locks. cancelledAt is database-owned TIMESTAMPTZ(3), monotonic >= creation. Association receipt is at least both parent receipt timestamps using database clock/lower bounds. API/service checks provide field errors; database CHECKs remain the final invariant under concurrent timing. A boundary-time constraint failure can be a sanitized service failure.

No encounter/BP event-time equality, same-day or clinical-distance condition is invented. No +3/+6-month CareAction arithmetic. SQL casts retain PostgreSQL's own lexical conversion behavior; guards do not recover text lost through explicit casts.

## Authorization and transaction boundary

Only EH-006 AuthPrincipal establishes actor authority. Patient reads own appointments/encounters/associations; no Patient create/cancel/associate. Clinician requires current ACTIVE/null-ended assignment for all reads/writes, including no-op retries. Original creator identity grants no permanent access. Wrong/unassigned clinician, missing profile and Admin fail closed. Caller actor/owner/status/provenance authority is rejected.

createFollowUpAppointmentPersistence exposes createFollowUpAppointment, cancelFollowUpAppointment, listFollowUpAppointments, close. createClinicalEncounterPersistence exposes createClinicalEncounter, listClinicalEncounters, associateBloodPressureMeasurement, listEncounterBloodPressureAssociations, close. No client export, generic query/CRUD, delete/reset or actor override. Inputs and principal scalars are copied/validated before awaiting. Internal snapshots retain provenance; HTTP uses explicit reduced projections.

All operations use bounded READ COMMITTED transactions: user FOR NO KEY UPDATE -> exact session FOR UPDATE -> clinician profile FOR SHARE -> ACTIVE/null-ended assignment FOR SHARE -> patient FOR SHARE -> targets -> mutation/audit -> final current session/user/role/expiry check. Patient reads check own mapping under patient lock. Cancellation locks scoped appointment FOR UPDATE. Association locks scoped encounter first FOR SHARE, then BP FOR UPDATE, then checks existing link. Read history count/page share one SQL statement snapshot. Locks remain until completion. Revocation/disable/assignment-end/profile-map changes winning locks cause waiting operations to deny; operations winning locks complete before changes. Final clock-based expiry is check-time protection, not stopping time before commit. No stale authorization tickets/cache or automatic retry. Lock/deadlock/serialization failures roll back and are sanitized. lock_timeout 5s, statement_timeout 10s, transaction maxWait 5s and timeout 30s.

Direct SQL UPDATE can acquire a target before its trigger locks provenance; incompatible ordinary SQL lock ordering may abort. Service lock order remains compatible with EH-010/EH-011. No unsafe retry hides authorization changes.

## HTTP

All paths below are relative to `/api/v1/patients/{patientId}`:

| Method | Suffix | Body | Success |
|---|---|---|---|
| POST | /follow-up-appointments | scheduledAt,purpose | 201 |
| GET/HEAD | /follow-up-appointments | none | 200 paginated |
| POST | /follow-up-appointments/{appointmentId}/cancel | {} | 200 including no-op |
| POST | /clinical-encounters | occurredAt,purpose | 201 |
| GET/HEAD | /clinical-encounters | none | 200 paginated |
| POST | /clinical-encounters/{encounterId}/blood-pressure-measurements/{measurementId} | {} | 201 new / 200 exact pair |
| GET/HEAD | /clinical-encounters/{encounterId}/blood-pressure-associations | none | 200 paginated references |

Appointment projection: id,patientId,scheduledAt,purpose,status,createdAt,cancelledAt. Encounter: id,patientId,occurredAt,purpose,createdAt. Association: id,patientId,encounterId,bloodPressureMeasurementId,createdAt. Raw creator/recorder/canceller user IDs and clinician internals are omitted. Association history does not expand BP values or replace EH-011 BP history.

Single {data:row}; collections {data:[],meta:{page,pageSize,total}}. Only canonical positive decimal page/pageSize, each once; defaults 1/20, max page 2147483647 and pageSize 100. Unknown/duplicate/encoded/empty/noncanonical query forms rejected. Appointments order scheduledAt DESC,id DESC; encounters occurredAt DESC,id DESC; associations createdAt DESC,id DESC. Separate page requests are not a frozen snapshot.

Hyphenated UUID v4 raw target forms only; uppercase hex normalizes; encoded/malformed/nonexistent/forbidden/wrong-patient targets share generic 404. Full patient/resource scope authorization precedes association conflict information. POST requires exact configured Origin, existing Fetch Metadata, session and session-bound CSRF; one application/json Content-Type, optional UTF-8 charset, identity content encoding, 16 KiB. Reject every POST query including bare ?, Idempotency-Key, missing/unknown fields, duplicate decoded keys, arrays/primitives/null. EH-012-only parser validates JSON grammar, exact shape/fields and duplicate keys without replacing global or BP parsers. Invalid UTF-8 rejected. GET/HEAD reject bodies/transfer encoding and require no CSRF. HEAD executes GET checks without a body at every status. Every response no-store, no ETag/Last-Modified/conditional 304 or renewal. Unsupported methods 405 without target lookup; Allow GET,HEAD,POST for creation collections; GET,HEAD for association history; POST for mutation-only routes. OPTIONS grants no CORS.

Errors: 400 REQUEST_INVALID for syntax/framing/query/body shape; 400 FOLLOW_UP_APPOINTMENT_INVALID or CLINICAL_ENCOUNTER_INVALID for validated fields; 401 AUTH_UNAUTHENTICATED clears unusable cookie; 403 AUTH_CSRF_INVALID; uniform 404 PATIENT_NOT_FOUND/Not found.; 409 ENCOUNTER_BP_CONFLICT after full scope; existing 405/413/415; sanitized 503 FOLLOW_UP_SERVICE_UNAVAILABLE or CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE (authentication-resolution failures retain AUTH_SERVICE_UNAVAILABLE). Errors never echo unknown property names, clinical values, payloads or driver diagnostics. Allowed fields scheduledAt,occurredAt,purpose,$; fixed reasons only. Syntax/Origin/media failures can precede authentication and reveal no target state. See openapi.json.

## Duplicates and audit

Appointment/encounter creation is non-idempotent: identical accepted requests create distinct identities and events. No payload/time deduplication, request ledger, Idempotency-Key support or automatic creation retry. Lost response can leave committed evidence. Exact existing encounter/BP pair is authorized no-op preserving original actor/time; same BP/different encounter is conflict, never move/reassign. No ON CONFLICT DO UPDATE.

Exactly FOLLOW_UP_APPOINTMENT_CREATED, FOLLOW_UP_APPOINTMENT_CANCELLED, CLINICAL_ENCOUNTER_CREATED and ENCOUNTER_BP_ASSOCIATED. Entity types follow_up_appointment,clinical_encounter,encounter_bp_association and actual entity UUID. Genuine authenticated actor, safeMetadata {}, same transaction. Audit failure rolls back mutation. No values/timestamps/payload/patient IDs in metadata; no reads/denials/parser failures/failed writes/no-op audit noise. Audit remains distinct from clinical history.

## Deferred clinical and milestone gates

Operational SCHEDULED is not EACCE SCHEDULED; cancellation is not a closure decision; encounter existence and associated BP do not prove COMPLETED. No EH-012 appointment is valid closure scheduling evidence because a real CareAction and explicit action link do not exist. FR-024 remains foundation-only/incomplete; AC-004/AC-005 are not satisfied. FR-012/FR-023 are raw API/provenance foundations, not completed UI/normalization requirements.

CareAction persistence/FR-021 remains deferred: HTN diagnosis, age-at-trigger, pregnancy/CVD/diabetes/CKD facts, correction/invalidation-aware BP selection, trigger/index selection, calendar arithmetic/month-end/leap-day/timezone policy, occurrence/retrigger identity, concurrent idempotent generation, retirement interaction, real appointment/action linkage and normalized encounter/BP interpretation remain unresolved. ACTIVE plan + below-threshold BP is not full applicability. No rule change/CR-HTN-FU-002, evaluator/ClosureAssessment/EACCE, eligibility facts, FHIR/Synthea import or UI. EH-013 owns RecordCoverageWindow and normalized queries; stable immutable UUIDs/relationships permit later additive work. M2 remains IN PROGRESS.

Synthetic proof uses existing five EH-008 identities with null clinical facts. New runtime probe uses genuine HTTP sessions, existing BP endpoints, multiple links, minimized reads/denials/cancellation/no-ops and persisted provenance/audit checks. It runs through verify-m1-runtime, never startup. Independent second-pass review remains a separate task before merge. Actual results belong in EH-012_VALIDATION.md.

## Issue #31 approved BP interpretation extension

Existing encounters/links remain immutable. A correction creates no inherited encounter link. New association creation rejects excluded/private BP, while an existing exact nonprivate pair remains an authorized no-op. Ordinary association history filters private BP references and matching counts; normalized encounter-BP candidates exclude terminally excluded/private BP even though the stored association remains. Encounter correction itself remains deferred. See [the BP extension contract](BP_CORRECTION_INVALIDATION_CONTRACT.md); FR-024 remains foundation-only and AC-004/005 unsatisfied.
