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

## Issue #31 BP amendment boundary

Clinical Evidence now owns the internal principal-checked BP amendment service and three additive append-only records: operation, terminal exclusion and independent wrong-patient privacy target. Ordinary BP/encounter history masks private targets; normalized/effective projections also remove every excluded target. EH-015 applicability remains unchanged. D1 provides truthful local receipts, not historical transaction visibility; EH-014 below captures the exact decision inputs. See [the implemented contract](BP_CORRECTION_INVALIDATION_CONTRACT.md). Issue #31 itself added no public amendment route, CareAction/B2/B3 or EACCE implementation; the later EH-014 extension below supplies bounded INITIAL generation.


## EH-014 bounded INITIAL implementation — merged and verified

EH-014 adds a narrow root-exported principal-checked internal action service and three immutable persistence tables. Explicit assigned-clinician generation only; no startup/BP/activation hook, public HTTP route or research-worker authority. SQL guards/retained locks enforce exact INITIAL identity, immutable replay and atomic audits. Protected decision data never forms an ordinary product expansion. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).

Status evidence: [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. [Post-merge validation](EH-014_VALIDATION.md#post-merge-validation). No behavioral or R1–R8 contract change is introduced by this status closeout.
