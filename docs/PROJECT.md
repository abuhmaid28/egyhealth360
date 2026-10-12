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

## Current project stage

Planning/reboot phases 0–13 are complete. EH-002 is synchronizing repository documentation. Coding remains blocked until this source-of-truth sync is merged and a replacement Bootstrap V2 issue is opened.

## Required reading by task type

Every task: `AGENTS.md`, this file, current GitHub Issue.

Product/UI: `PRODUCT.md`, `REQUIREMENTS.md`, `UX.md`, `DESIGN_SYSTEM.md`.

Backend/data: `DOMAIN.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`, `SECURITY.md`, `API.md`.

Research: `RESEARCH.md`, `TESTING.md`, clinical-source documentation.
