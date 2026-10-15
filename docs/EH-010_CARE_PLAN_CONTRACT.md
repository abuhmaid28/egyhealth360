# EH-010 CarePlan lifecycle contract

Approved by Issue #18 comment [6179110871](https://github.com/abuhmaid28/egyhealth360/issues/18#issuecomment-6179110871), baseline `ccc967b4d1125c69b2db8725351dca0f50783acf`. ADR-024 records the approved scope split. No product HTTP route or durable CareAction generation.

## Persistence

CarePlan has exactly nine persisted fields: UUID id (database gen_random_uuid), patientId referencing patient_profiles.id, exact templateId, exact ruleDefinitionId, createdByUserId referencing users.id, status DRAFT/ACTIVE/CANCELLED, database-owned TIMESTAMPTZ(3) createdAt, nullable startedAt and cancelledAt. No copied versions, updatedAt, completedAt, reason, eligibility or clinical content.

Every FK RESTRICTs update/delete. Composite `(rule_definition_id, template_id)` references the added unique `(id, template_id)` rule key; direct template FK retained. Pins, patient, creator and identity are immutable from insertion. DRAFT correction requires cancellation and a new plan. Multiple drafts are allowed; database partial unique index permits at most one ACTIVE plan per patient across versions. No automatic cancellation of another active plan.

Ordinary SQL is restricted to the exact approved EH-009 source/template/rule/JSON aggregate: WHO-HTN-2021 -> CPT-HTN-FU-001 / 1.0.0-draft -> CR-HTN-FU-001 / 1.0.0-draft -> HTN_BP_FOLLOWUP. This makes ACTIVE uniqueness hypertension-specific without duplicating a domain column. No latest-version lookup or arbitrary template/rule selection. Historical trace resolves exact rule and template FKs, template source FK and immutable rule sourceReferences. Future versions never repoint existing plans.

## Lifecycle and timestamps

Only INSERT DRAFT, DRAFT -> ACTIVE, DRAFT -> CANCELLED, ACTIVE -> CANCELLED. CANCELLED is terminal. COMPLETED and a completion workflow are absent. Same-state authorized retries preserve timestamps and append no audit. Creation is not idempotent: intentional repeated creation can produce separate drafts; lost acknowledgements must not be blindly retried as an idempotent operation.

DRAFT has null started/cancelled times. Activation sets start >= creation. Cancellation retains the prior start (including null) and sets cancellation >= creation/start. SQL guards reject caller changes to existing timestamps and use database clock_timestamp rounded to milliseconds with monotonic chronology bounds. Insertion owns createdAt. No clinical timestamps are inferred.

Creation and activation require PUBLISHED and exact aggregate validation. Template FOR SHARE conflicts with EH-009 retirement's row update; status is checked after acquiring that lock. Retirement before activation denies; retirement after activation retains the plan unchanged. Historical inspection/specification and cancellation remain available. Retirement does not cancel, migrate or repoint a plan.

## Actor and transaction contract

createCarePlanPersistence exports only createDraftPlan(principal,{patientId}), activatePlan/cancelPlan/inspectPlan/inspectDeferredActionSpecification(principal,{patientId,planId}), and close. Inputs accept no creator, clinician, template, rule, status or timestamp authority. Strict input keys and UUID-v4 shape are checked. AuthPrincipal comes from EH-006 trusted server code; its session/user/role are revalidated in the transaction. Patient, Admin, unassigned/wrong-patient clinicians, missing profiles and inconsistent principals fail closed. Session expiry/revocation and ACTIVE user status are checked using current database state.

Fixed lock order: user FOR NO KEY UPDATE -> session FOR UPDATE -> clinician profile FOR SHARE -> ACTIVE/null-ended assignment FOR SHARE -> patient profile FOR SHARE -> scoped plan FOR UPDATE -> exact template FOR SHARE where needed. All are retained until transaction end. NO KEY UPDATE is compatible with audit actor FK KEY SHARE and EH-006's user locking; logout takes its existing session lock. Mapping/assignment SHARE locks conflict with updates, including non-key status updates. READ COMMITTED rechecks locked rows after waits. No automatic transaction retry or reusable EH-007 authorization ticket. Session validity is checked again after the operation, because expiry itself is clock-based; this is a check-time guarantee, not a promise to stop time between final check and commit. Lock timeout 5s, statement timeout 10s, transaction maxWait 5s and timeout 30s. Lock/serialization failures roll back and return a sanitized service error.

Inspection uses the same authorization/locking boundary, writes no rows, and is not an unscoped read. No HTTP/CSRF/Origin behavior is added or claimed. Future routes need their own HTTP security contract and tests.

Database creator checks establish structural clinician/assignment consistency on insertion, not authentication. Direct SQL does not establish genuine clinician audit provenance. Authenticated service operations must use this boundary. Ordinary-write history protection does not protect against schema owners/superusers disabling guards.

## Audit and errors

Only CARE_PLAN_CREATED, CARE_PLAN_ACTIVATED, CARE_PLAN_CANCELLED, actor=current validated clinician user, entityType=care_plan, entityId=plan UUID, metadata={}. Audit and mutation commit atomically; any failure rolls back both. No audit for reads, specification, rejected operations or no-op retries. SQL structural guards do not pretend to authenticate or emit clinician events.

Stable internal codes: CARE_PLAN_INVALID (input), CARE_PLAN_UNAUTHENTICATED (invalid current session/user), CARE_PLAN_NOT_FOUND (generic denied/nonexistent/wrong-patient target), CARE_PLAN_INVALID_STATE, CARE_PLAN_ACTIVE_CONFLICT, CARE_PLAN_DEFINITION_UNAVAILABLE, CARE_PLAN_SERVICE_UNAVAILABLE. Raw SQL/driver errors, connection strings and credentials are never returned. No HTTP mapping is introduced.

## Deferred specification

The pure projectDeferredActionSpecification helper accepts only the exact validated approved clinical definition. inspectDeferredActionSpecification adds the authorized plan/patient/template/rule IDs and planStatus. Result includes actionType HTN_BP_FOLLOWUP, triggerRequirement QUALIFYING_OBSERVED_BP_ASSESSMENT, symbolic ADD_CALENDAR_MONTHS declarations 3 and 6, persistence DEFERRED, and unmetGates PERSISTED_QUALIFYING_EVIDENCE / APPROVED_CALENDAR_ARITHMETIC / OCCURRENCE_RETRIGGER_SELECTION.

It is deterministic and inspectable in DRAFT/ACTIVE/CANCELLED, including after retirement. It is never permission/instruction to persist an action. No action ID, evidence ID, occurrence key, BP/eligibility result, trigger/not-before/due timestamps, closure/schedule/coverage result. Plan activation is not clinical trigger evidence. The helper performs no eligibility/trigger selection, calendar arithmetic or EACCE.

Future canonical occurrence inputs are patient profile UUID from plan, CarePlan UUID, exact CareRuleDefinition UUID, persisted qualifying trigger kind and immutable evidence identity, plus an approved occurrence discriminator if needed. No identity or discriminator is invented now. No key encoder, action UNIQUE constraint or idempotent/concurrent generation writer is implemented. Concrete calendar/end-of-month/leap-day/timezone policy remains gated. FR-020 is service foundation only; FR-021 and M2 remain incomplete.

## Migration and validation

One additive migration: 20261016000000_eh010_care_plan_lifecycle. Adds only care_plan_status/care_plans, composite rule key, four RESTRICT FKs, ACTIVE partial unique, four lookup/history indexes, lifecycle CHECK, eh010_guard_care_plan and eh010_reject_care_plan_removal with row-write and statement DELETE/TRUNCATE triggers. Functions are invoker and use trusted search paths with explicit public-qualified lookups. EH-005/006/009 SQL remains byte-identical. No reference rows or external dependencies.

Synthetic service tests use only existing EH-008 identities and real EH-006 session creation/resolution. They prove service behavior, not a new plan HTTP workflow. Existing actual HTTP M1 verification remains mandatory. See EH-010_VALIDATION.md for observed evidence.
