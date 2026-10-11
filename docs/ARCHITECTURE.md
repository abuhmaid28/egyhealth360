# EgyHealth 360 — Technical Architecture

## Goal

Use the simplest architecture that is:

- professional,
- maintainable by interchangeable AI coding agents,
- free/open-source first,
- self-hostable,
- easy to test,
- appropriate for a graduation-project scope.

## High-level architecture

```text
Browser / PWA
      |
      v
Next.js Web App
      |
      | REST / HTTPS
      v
NestJS Main API
   |          |
   v          v
PostgreSQL   FastAPI AI Service
                  |
                  v
               ML Model
```

NestJS is the application brain and owner of persistence.

## Applications

### `apps/web`
- Next.js
- TypeScript
- one frontend for all five roles
- patient experience: mobile-first
- provider/admin experiences: desktop-first
- Arabic RTL + English

### `apps/api`
- NestJS
- TypeScript
- modular monolith
- REST + OpenAPI
- PostgreSQL persistence
- authentication / authorization
- business rules
- audit
- care-gap engine
- AI orchestration

### `apps/ai`
- Python
- FastAPI
- prediction-only service
- no direct database access
- no direct browser access

## Technical baseline

At bootstrap time, use pinned stable versions consistent with:

- Node.js 24 LTS
- latest patched stable Next.js 16.x
- stable NestJS
- PostgreSQL 18
- Prisma 7 initially
- Python 3.14 initially
- FastAPI
- Tailwind CSS
- selective shadcn/ui primitives
- Docker / Docker Compose
- GitHub Actions
- pnpm workspace
- `uv` for Python environment management

## Backend architecture

Use a modular monolith.

Planned modules:

- auth
- users
- patients
- doctors
- scheduling
- appointments
- encounters
- prescriptions
- labs
- pharmacies
- care-plans
- follow-ups
- measurements
- care-gaps
- risk-assessments
- notifications
- audit
- admin
- common

Module ownership must be respected.

A module must not bypass another module's business rules by directly mutating records owned by that module.

## Authentication

Initial strategy:

- database-backed server sessions,
- secure HttpOnly cookie,
- Argon2id password hashing.

Do not use localStorage authentication tokens by default.

## Authorization

Use:

- role-based access,
- resource-level rules.

A doctor role alone does not grant access to every patient.

## API

- REST
- base path `/api/v1`
- OpenAPI as the formal contract
- stable response/error formats
- UTC storage
- ISO 8601 timestamps
- pagination for large collections

## AI boundary

Correct flow:

```text
Browser
  ↓
NestJS
  ↓
FastAPI
  ↓
Model
  ↓
FastAPI response
  ↓
NestJS validation / persistence / audit
```

Forbidden:

```text
Browser → FastAPI
FastAPI → Main PostgreSQL DB
```

## Care-gap engine

Initial detection is deterministic and rule-based.

Examples:

- missed follow-up,
- pending lab test,
- unreviewed result.

Care-gap detection is not an ML feature.

## Background work

Start with NestJS scheduling.

Do not add Redis, BullMQ, Kafka, RabbitMQ, or distributed-job infrastructure unless a demonstrated requirement appears.

## Files

Do not store large binary files directly in PostgreSQL.

Use a storage abstraction:

- local storage during development,
- S3-compatible/self-hostable/free storage later only if needed.

## Notifications

MVP:

- in-app notifications only.

Do not add paid SMS, WhatsApp, or email services to the core MVP.

## Analytics

Initial analytics should use PostgreSQL queries/views and application dashboards.

External reporting tools may use sanitized reporting data later.

## Deployment

The core must run locally without paid services.

Development orchestration:

- Docker Compose.

Graduation-demo deployment:

- free tier where practical,
- or self-hosted/simple Linux server.

No Kubernetes is required.

## Explicitly rejected from the baseline

- microservices
- Kubernetes
- MongoDB
- GraphQL
- Kafka
- RabbitMQ
- Redis by default
- Firebase as primary backend
- paid auth providers
- paid AI APIs
- five separate frontend apps
- multiple repositories
