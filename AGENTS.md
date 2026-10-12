# EgyHealth 360 — AI Agent Instructions

These instructions apply to every coding/research agent working on this repository.

## Mandatory context before work

Read, in order:
1. `AGENTS.md`
2. `docs/PROJECT.md`
3. the current GitHub Issue
4. task-relevant docs
5. existing branch/PR/tests/contracts

Do not rely on prior AI chat memory. Do not restart completed work.

Before changing anything, summarize the task, current state, dependencies/risks, and implementation plan.

## Source-of-truth priority

1. Accepted ADRs and current approved repository docs
2. Current GitHub Issue
3. Tests, schemas, and API contracts
4. Existing implementation
5. Agent assumptions

If an Issue conflicts with an accepted ADR or current approved requirement, stop and report the conflict. Do not silently redesign the project.

## Core architecture

- Next.js + TypeScript frontend
- NestJS + TypeScript modular-monolith API
- PostgreSQL 18
- Prisma 7
- REST + OpenAPI
- pure TypeScript shared EACCE package
- TypeScript experiment worker
- FHIR R4 adapter
- pnpm monorepo
- Docker Compose

Core V1 explicitly has no FastAPI/Python runtime, ML service, Redis, Kafka, RabbitMQ, GraphQL, paid auth, paid AI APIs, or microservice architecture.

## Product scope

MVP roles: Patient, Clinician, Admin.

Core product: chronic-care coordination around expected care actions and evidence-aware closure classification.

Do not add lab/pharmacy portals, marketplace, telemedicine, diagnosis, treatment recommendation, diabetes-risk prediction, chatbot, OCR, or other removed features without an approved scope change.

## EACCE rules

- Missing completion evidence alone must not automatically produce `TRUE_GAP` when relevant record coverage is insufficient.
- `UNCERTAIN` is allowed and represents abstention under insufficient observed evidence.
- Closure assessments are immutable historical records.
- New relevant evidence creates/requires a new assessment; do not overwrite history.
- The engine must not diagnose, prescribe, recommend dosage, or fabricate missing medical data.
- Ground truth must never be available to Baseline/EACCE inputs during research evaluation.

## Clinical-rule safety

Never invent a clinical rule. Every implemented clinical rule needs an authoritative source, version, location/section, human-readable interpretation, machine representation, and tests. If the source is ambiguous, mark the rule unresolved instead of guessing.

## Security

- Backend authorization is mandatory.
- Patient access is own-data only.
- Clinician access requires an active patient relationship, not role alone.
- Admin does not automatically receive unrestricted clinical access.
- Never trust client-supplied identity/status fields when derivable server-side.
- Never commit secrets or log passwords/session tokens/secrets/full medical payloads unnecessarily.
- Preserve audit history.
- Research ground truth and product-facing data must remain logically isolated.

## Free-first

Prefer local, open-source, self-hostable, or free solutions. New dependencies require justification: why needed, maintained status, license, security impact, and why existing dependencies are insufficient.

## Task workflow

Use one issue-scoped branch and one reviewable PR. Implement only defined scope. Run relevant lint, type checks, tests, builds, and security/authorization tests. Review your diff before handoff.

PR handoff must state:
- implemented work
- files/modules changed
- checks/tests run and results
- acceptance criteria status
- known limitations
- remaining work
- next recommended step if incomplete

## Definition of Ready

A task is ready only when goal, scope, dependencies, acceptance criteria, relevant requirements, and major architecture decisions are clear. Clinical tasks also require an approved source.

## Definition of Done

A task is done only when required behavior works, acceptance criteria pass, authorization/validation/error paths are handled where relevant, tests pass, CI/build checks pass, documentation is updated when contracts change, and no known P0/P1 blocker remains.

Critical areas—authentication, authorization, EACCE, clinical rules, database migrations, and research evaluation—require independent second-pass review where practical.
