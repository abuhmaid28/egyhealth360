# EgyHealth 360 — Decision Register V2

AI agents must not silently reverse accepted decisions.

## Superseded decisions

The original five-role continuity-of-care scope, separate FastAPI/Python prediction service, diabetes-risk model, pharmacy/lab portals, and generic care-gap design are superseded by the 2026 reboot.

## Current accepted decisions

### ADR-001 — Focused chronic-care coordination
Status: Accepted

Core V1 focuses on evidence-aware care-action closure, initially hypertension follow-up actions, rather than a generic healthcare super-app.

### ADR-002 — One Next.js frontend
Status: Accepted

One responsive web application serves Patient, Clinician, and Admin experiences.

### ADR-003 — NestJS modular monolith
Status: Accepted

Use one NestJS API application. Microservices are rejected for Core V1.

### ADR-004 — PostgreSQL + Prisma
Status: Accepted

Use PostgreSQL 18 and Prisma 7.

### ADR-005 — Shared pure-TypeScript EACCE
Status: Accepted

The product API and experiment worker use the same deterministic TypeScript Evidence-Aware Care Closure Engine.

### ADR-006 — No FastAPI/Python runtime in Core V1
Status: Accepted

Python/ML is not required by the current research question and is removed from runtime architecture.

### ADR-007 — REST + OpenAPI
Status: Accepted

GraphQL is not required.

### ADR-008 — Server-side sessions
Status: Accepted

Use database-backed server sessions, secure HttpOnly cookies, CSRF protection, and Argon2id password hashing.

### ADR-009 — Free-first / self-hostable
Status: Accepted

Core operation must not depend on paid external services.

### ADR-010 — Monorepo
Status: Accepted

Web, API, worker, shared packages, research assets/config, and docs live in one repository.

### ADR-011 — GitHub is operational source of truth
Status: Accepted

Issues, branches, PRs, docs, tests, and CI replace AI-chat memory.

### ADR-012 — PRs are handoff points
Status: Accepted

Do not maintain a permanent HANDOFF.md. The current branch/PR must state completed work, checks, limitations, and remaining work.

### ADR-013 — FHIR R4 adapter, not FHIR-native database
Status: Accepted

Use an internal relational domain model with FHIR R4 import/export mapping where useful.

### ADR-014 — Immutable assessment history
Status: Accepted

Closure assessments are time-specific immutable records. New evidence creates/requires a new assessment rather than overwriting prior inference.

### ADR-015 — Synthetic-only research benchmark
Status: Accepted

Research/evaluation uses Synthea synthetic data. Real patient data is prohibited in Core V1.

### ADR-016 — No ML in Core V1
Status: Accepted

The primary method is deterministic and explainable. ML may only be a future extension after the core study is complete.

### ADR-017 — PostgreSQL-backed experiment worker
Status: Accepted

Experiment runs use a TypeScript worker and database run states. Redis/BullMQ/Kafka/RabbitMQ are not required.

### ADR-018 — Source-traceable clinical rules
Status: Accepted

Clinical rules must be versioned and tied to authoritative source/version/location plus tests. Agents must not invent medical logic.

## Change process

A major scope, architecture, security, or clinical-rule change requires a documented proposal and an explicit decision update before implementation.
