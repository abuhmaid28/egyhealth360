# EgyHealth 360

EgyHealth 360 is a graduation-research prototype for **evidence-aware chronic-care coordination**.

The core problem is that an expected care action may look overdue simply because the available longitudinal record is incomplete. The project evaluates whether an explainable Evidence-Aware Care Closure Engine (EACCE) can reduce false care-gap classifications compared with a naive overdue-and-missing-event rule.

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

## Source of truth

AI coding agents must not rely on prior chat history. Read:
1. `AGENTS.md`
2. `docs/PROJECT.md`
3. the current GitHub Issue
4. task-relevant documentation
5. existing tests/contracts and implementation

Major scope or architecture changes require a recorded decision.

## Project status

Planning/reboot phases 0–13 are complete. Repository documentation synchronization is tracked in **EH-002**. Coding remains blocked until the synchronized documentation is merged and a clean Bootstrap V2 issue is opened.
