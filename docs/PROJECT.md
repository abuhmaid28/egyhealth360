# EgyHealth 360 — Project State

## What this project is

EgyHealth 360 is a graduation-research prototype for evidence-aware chronic-care coordination. It investigates whether a deterministic, explainable closure engine can reduce false care-gap classifications when longitudinal health records are incomplete.

Initial evaluation domain: hypertension follow-up care actions.

## Core problem statement

Chronic-care systems often identify care gaps by checking whether an expected action is overdue and whether a completion event is present. Longitudinal records may be incomplete or fragmented, so absence of evidence does not always mean care was not delivered. EgyHealth 360 evaluates an evidence-aware method that distinguishes genuinely unresolved actions from insufficient/uncertain evidence.

## Roles
- Patient
- Clinician
- Admin

## Core product modules
- Authentication and role-aware access
- Clinician patient list/summary
- Hypertension care plan and expected care actions
- Timeline/evidence and BP measurements
- Follow-up scheduling
- Evidence-Aware Care Closure Engine (EACCE)
- Clinician confirm/override workflow
- Patient care view
- Evaluation Lab for synthetic benchmark runs

## Closure states
- NOT_DUE
- COMPLETED
- SCHEDULED
- TRUE_GAP
- EXEMPT
- UNCERTAIN

`UNCERTAIN` is a system abstention under insufficient observed evidence, not ground truth.

## Non-goals
No hospital ERP, lab/pharmacy portals, marketplace, insurance/payments, diagnostic AI, automated treatment, medication-dose recommendation, diabetes-risk model, chatbot, OCR, telemedicine infrastructure, or real-patient clinical deployment in Core V1.

## Execution model
The project is AI-agent-executed. The student team coordinates, approves scope decisions, understands the system/method/results, presents, and submits.

The default methodology does not depend on visiting doctors, interviewing clinicians/patients, surveys, focus groups, or collecting real patient data. Desk research, authoritative published sources, standards, and public/synthetic data are used unless the academic supervisor explicitly adds a primary-research requirement.

See `docs/EXECUTION_POLICY.md`.

## Current architecture
- Next.js + TypeScript
- NestJS modular monolith
- PostgreSQL 18 + Prisma 7
- shared pure-TypeScript EACCE package
- TypeScript experiment worker
- FHIR R4 adapter
- Synthea synthetic data
- Docker Compose
- GitHub Actions

No FastAPI/Python runtime or ML service in Core V1.

## Frozen V1 research direction
Primary rule:
`CR-HTN-FU-001 — Controlled uncomplicated hypertension follow-up`.

Primary method question:
Can explicit record-coverage reasoning reduce false confirmed follow-up gaps when observed longitudinal evidence is incomplete?

Research comparison:
- B0 naive overdue detector
- B1 normalized coverage-blind detector
- P1 full EACCE

Primary outcome:
False-gap rate, reported together with true-gap recall and decision coverage/abstention.

## Current project stage
**EH-004 Deep Planning Audit Pass 2** is complete and merged.

**EH-003 — Bootstrap Monorepo V2** implementation and validation are complete. **Milestone M0 — Repository Reboot / Bootstrap** is complete at the current baseline. EH-003 provides infrastructure/bootstrap only.

**EH-005 — M1 Identity & Core Data Foundation** implements the first persistence slice: users, role-bound profiles, assignment history, and audit primitives. See ADR-019 and `EH-005_PERSISTENCE.md`. EH-006 implements authentication/session/CSRF foundations (`EH-006_AUTH.md`). EH-007 authorization is merged. M1 is COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [final exit-gate evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). EH-009 is merged and complete (M2 step 1). EH-010 is merged and complete: version-pinned CarePlan lifecycle and read-only deferred action specification. EH-011 is merged and complete: immutable paired BP persistence, explicit entry provenance and authenticated submission/history APIs. EH-012 is merged and complete: operational follow-up appointments, immutable encounters and immutable encounter-BP associations. EH-013 is merged and complete: immutable source-scoped record-coverage windows and deterministic normalized evidence queries with explicit unasserted intervals, single-statement snapshot retrieval, authorized product read boundary and internal synthetic writer. Durable action generation remains gated on evidence, calendar arithmetic and occurrence semantics. M2 remains in progress; no care-action generation/EACCE completion is claimed.

Later product/clinical/research work requires its own GitHub Issue, branch, defined scope, acceptance criteria, and review gate.

## Pre-coding deep-audit result
No unresolved P0 planning blocker remains for EH-003.

Known P1 items are milestone-gated, including:
- final `SCHEDULED` validity contract before care-action/EACCE implementation;
- complete FHIR eligibility concept-set freeze before the final research pipeline;
- executable clinical-rule representation before M2/M3 implementation.

These are not blockers for monorepo/bootstrap work.

## Required reading by task type
Every task:
1. `AGENTS.md`
2. this file
3. current GitHub Issue
4. `docs/EXECUTION_POLICY.md`

Product/UI:
- `PRODUCT.md`
- `REQUIREMENTS.md`
- `UX.md`
- `UX_VALIDATION_V2.md`
- `DESIGN_SYSTEM.md`
- `TRACEABILITY_MATRIX_V1.md`

Backend/data:
- `DOMAIN.md`
- `DATA_MODEL.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `API.md`
- `TRACEABILITY_MATRIX_V1.md`

Research:
- `RESEARCH.md`
- `TESTING.md`
- `research/CLINICAL_RULE_SOURCE_AUDIT.md`
- `research/CLINICAL_RULE_CATALOG_V1.md`
- `research/EXPERIMENT_PROTOCOL_V1.md`
- `research/METRICS_SPEC_V1.md`
- `research/LITERATURE_REVIEW.md`
- `research/RELATED_WORK_MATRIX.md`
- `research/COMPETITOR_EVIDENCE_MATRIX.md`

Project planning/reporting:
- `DEEP_PLANNING_AUDIT_SUMMARY.md`
- `PROJECT_PLAN_6_MONTHS.md`
- `THESIS_STRUCTURE_V1.md`
- `diagrams/SYSTEM_DIAGRAMS_V1.md`

## EH-007 implementation slice

EH-007 adds deny-by-default patient-profile authorization and actual HTTP IDOR
coverage, using EH-006 principals and ACTIVE assignments. Review/validation evidence
is in `EH-007_AUTHORIZATION.md` and `EH-007_VALIDATION.md`. FR-010/FR-011 are not
complete. EH-008 deterministic identities and the full M1 exit gate are complete; see the recorded final evidence above.

## Current M2 slice

M1 is COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [final exit-gate evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). EH-009 is merged and complete (M2 step 1). EH-010 is merged and complete: version-pinned CarePlan lifecycle and read-only deferred action specification. EH-011 is merged and complete: immutable paired BP persistence, explicit entry provenance and authenticated submission/history APIs. EH-012 is merged and complete: operational follow-up appointments, immutable encounters and immutable encounter-BP associations. EH-013 is merged and complete: immutable source-scoped record-coverage windows and deterministic normalized evidence queries with explicit unasserted intervals, single-statement snapshot retrieval, authorized product read boundary and internal synthetic writer. EH-015 is merged and complete: immutable observed clinical applicability snapshots and terminal retractions (slice B1). Issue #31 supplies completed B4 correction/privacy prerequisites. The approved EH-014 implementation below covers explicit BP selection and INITIAL-only durable generation; recurrence remains deferred. Milestone M2 remains in progress; no M2 or EACCE completion is claimed.

See `EH-009_CLINICAL_DEFINITION_CONTRACT.md`, `EH-009_VALIDATION.md`, `EH-010_CARE_PLAN_CONTRACT.md`, `EH-010_VALIDATION.md`, `EH-011_BP_PROVENANCE_CONTRACT.md` and `EH-011_VALIDATION.md`.

See `EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md`, `EH-012_VALIDATION.md`, `EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md`, `EH-013_VALIDATION.md`, `EH-015_OBSERVED_APPLICABILITY_CONTRACT.md`, and `EH-015_VALIDATION.md`. FR-024 remains foundation-only; M2 in progress.


## Issue #31 implementation status

BP correction/invalidation prerequisite is merged in PR #32; Issue #31 is CLOSED/completed at the approved baseline. [Contract](BP_CORRECTION_INVALIDATION_CONTRACT.md); [validation](BP_CORRECTION_INVALIDATION_VALIDATION.md). EH-014 R1–R8 and the bounded INITIAL implementation are approved by Issue #28 comment 6317196946. The implementation below remains subject to independent review, approved merge, exact-main post-merge CI and explicit M2 exit verification. No additional EH number assigned.


## Current EH-014 implementation status

Issue #31 is CLOSED/completed; PR #32 merged at `e83e9b3e0e6e42988cc4e4ba905d9bcc589b9adc` and post-merge CI passed.

EH-014 is implemented on `feature/eh-014-initial-care-action` under approval comment 6317196946, locally validated as recorded below, pending PR submission, independent implementation review, merge and post-merge verification. It adds only explicit clinician-selected immutable INITIAL actions/decisions, exact replay, UTC calendar schedule, current privacy-safe reads, atomic audits and synthetic proof. No recurrence or EACCE; no appointment coupling or design. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [actual validation](EH-014_VALIDATION.md).

Issue #28 remains OPEN. M2 IN PROGRESS. FR-021 bounded implementation is pending review/merge/post-merge validation; FR-024 incomplete/foundation-only; AC-004/AC-005 unsatisfied. Independent review → approved merge → exact-main post-merge CI → explicit M2 exit proof/review remain mandatory before considering milestone completion.
