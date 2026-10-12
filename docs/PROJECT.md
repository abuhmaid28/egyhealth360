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
Repository reboot and **EH-004 Deep Planning Audit Pass 2** are complete at documentation level and ready to merge.

After EH-004 is merged, the active first implementation task is:
**EH-003 — Bootstrap Monorepo V2**

Required branch:
`feature/EH-003-bootstrap-v2`

EH-003 is infrastructure/bootstrap only. No later product/clinical/research feature may be pulled forward without its dependency gate.

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
