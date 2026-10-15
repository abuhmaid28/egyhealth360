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

**EH-005 — M1 Identity & Core Data Foundation** implements the first persistence slice: users, role-bound profiles, assignment history, and audit primitives. See ADR-019 and `EH-005_PERSISTENCE.md`. EH-006 implements authentication/session/CSRF foundations (`EH-006_AUTH.md`). EH-007 authorization is merged. M1 is COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [final exit-gate evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). EH-009 is merged and complete (M2 step 1). EH-010 is merged and complete: version-pinned CarePlan lifecycle and read-only deferred action specification. EH-011 is the current M2 slice: immutable paired BP persistence, explicit entry provenance and authenticated submission/history APIs. Durable action generation remains gated on evidence, calendar arithmetic and occurrence semantics. M2 remains in progress; no care-action generation/EACCE completion is claimed.

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

M1 is COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [final exit-gate evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). EH-009 is merged and complete (M2 step 1). EH-010 is merged and complete: version-pinned CarePlan lifecycle and read-only deferred action specification. EH-011 is the current M2 slice: immutable paired BP persistence, explicit entry provenance and authenticated submission/history APIs. Durable action generation remains gated on evidence, calendar arithmetic and occurrence semantics. M2 remains in progress; no care-action generation/EACCE completion is claimed.

See `EH-009_CLINICAL_DEFINITION_CONTRACT.md`, `EH-009_VALIDATION.md`, `EH-010_CARE_PLAN_CONTRACT.md`, `EH-010_VALIDATION.md`, `EH-011_BP_PROVENANCE_CONTRACT.md` and `EH-011_VALIDATION.md`.
