# EgyHealth 360 — Technical Architecture V1

## Goal

Keep the architecture professional, free-first, self-hostable, testable, and easy for interchangeable AI agents to understand.

## Runtime architecture

```text
Browser
  ↓
Next.js Web App
  ↓ REST /api/v1
NestJS Modular-Monolith API
  ├── PostgreSQL 18 / Prisma 7
  ├── shared EACCE package
  └── FHIR R4 adapter

Experiment Worker (TypeScript)
  ├── Synthea/FHIR benchmark input
  ├── same shared EACCE package
  └── experiment/result persistence
```

## Applications

- `apps/web` — Next.js 16.x + TypeScript
- `apps/api` — NestJS v11 + TypeScript modular monolith
- `apps/experiment-worker` — TypeScript background research worker

## Shared packages

- `packages/closure-engine` — pure deterministic TypeScript EACCE; no Nest/Prisma/Next imports
- `packages/clinical-rules` — versioned source-traceable care-rule definitions
- `packages/fhir-adapter` — FHIR R4 ↔ internal normalized model
- `packages/db` — Prisma schema/client/migrations/seed helpers
- `packages/ui` — design-system and healthcare UI components
- `packages/config` — shared validated configuration where useful

## Core decisions

- Modular monolith, not microservices
- REST + OpenAPI, not GraphQL
- PostgreSQL 18
- Prisma 7 pinned/stable
- Node.js 24 LTS
- pnpm workspace
- Docker Compose
- GitHub Actions
- Server-side sessions with HttpOnly cookies
- Argon2id password hashing
- Same-origin browser/API setup where practical

## EACCE boundary

The closure engine is pure domain logic. It receives typed action/evidence/coverage inputs and returns classification, reason codes, evidence trace, and missing-evidence information. It does not access the database or HTTP layer directly.

The product API and research worker must use the same engine implementation.

## Research worker

Experiment runs are asynchronous. PostgreSQL stores run state (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`); a worker claims and executes jobs. Redis/BullMQ/Kafka/RabbitMQ are not required in Core V1.

## FHIR

Use FHIR R4 for interchange, especially Synthea imports. The internal relational model is not a FHIR server/database. A dedicated adapter maps resources such as Patient, Observation, Encounter, Appointment, CarePlan/Task where useful.

## Files and notifications

Core V1 has no medical-file upload/storage requirement. Notifications are in-app only if implemented; no paid SMS/WhatsApp/email dependency is required.

## Deployment

Primary requirement: local/self-hosted Docker Compose demo that works without paid services. Optional cloud deployment may use the same standard containers and PostgreSQL.

## Explicitly rejected in Core V1

- FastAPI/Python runtime service
- ML inference service
- Redis/BullMQ
- Kafka/RabbitMQ
- Kubernetes
- GraphQL
- MongoDB primary storage
- Firebase primary backend
- paid auth providers
- paid AI APIs
- separate lab/pharmacy applications
