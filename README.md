# EgyHealth 360

EgyHealth 360 is a graduation-research prototype for **evidence-aware chronic-care coordination**.

The core problem is that an expected care action may look overdue simply because the available longitudinal record is incomplete. The project evaluates whether an explainable Evidence-Aware Care Closure Engine (EACCE) can reduce false care-gap classifications compared with coverage-blind gap detection.

## Core V1

Roles:
- Patient
- Clinician
- Admin

Clinical evaluation domain:
- Hypertension follow-up care actions

Core states:
- NOT_DUE
- COMPLETED
- SCHEDULED
- TRUE_GAP
- EXEMPT
- UNCERTAIN

`UNCERTAIN` is an abstention caused by insufficient observed evidence; it is not ground truth.

## Architecture

- `apps/web` — Next.js + TypeScript
- `apps/api` — NestJS modular monolith
- `apps/experiment-worker` — TypeScript research worker
- PostgreSQL 18
- Prisma 7
- REST + OpenAPI
- shared pure-TypeScript EACCE package
- FHIR R4 adapter
- Synthea synthetic research data
- Docker Compose
- GitHub Actions

Core V1 has **no FastAPI service, no Python runtime, and no ML model**.

## Explicit non-goals

No lab portal, pharmacy portal, doctor marketplace, full appointment marketplace, telemedicine platform, diagnostic AI, treatment recommender, diabetes-risk model, chatbot, OCR, hospital ERP, insurance, payments, or real-patient deployment.

The project does not depend by default on doctor visits, interviews, surveys, or real-patient data collection. See `docs/EXECUTION_POLICY.md`.

## Source of truth

AI coding agents must not rely on prior chat history. Read:
1. `AGENTS.md`
2. `docs/PROJECT.md`
3. the current GitHub Issue
4. task-relevant documentation
5. existing tests/contracts and implementation

Major scope or architecture changes require a recorded decision.

## Project status

Repository reboot and Deep Planning Audit Pass 2 are complete/ready to merge through EH-004. The next implementation task is **EH-003 — Bootstrap Monorepo V2** on branch `feature/EH-003-bootstrap-v2`.

After EH-004 is merged, EH-003 is authorized to resume. Later milestones remain blocked until their dependency/acceptance gates are completed.

Important planning references:
- `docs/DEEP_PLANNING_AUDIT_SUMMARY.md`
- `docs/PROJECT_PLAN_6_MONTHS.md`
- `docs/TRACEABILITY_MATRIX_V1.md`
- `docs/research/EXPERIMENT_PROTOCOL_V1.md`
