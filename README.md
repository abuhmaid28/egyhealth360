# EgyHealth 360

**EgyHealth 360** is an AI-assisted continuity-of-care platform connecting patients, doctors, laboratories, pharmacies, and administrators around one continuous healthcare journey.

## Current status

The project is ready for repository bootstrap.

The first implementation task is:

**EH-001 — Bootstrap EgyHealth 360 Monorepo**

No healthcare business feature should be implemented before EH-001 is completed successfully.

## Core product idea

**Connect → Understand → Predict → Follow**

- **Connect:** patient, doctor, laboratory, pharmacy.
- **Understand:** structured medical records and longitudinal health timeline.
- **Predict:** responsible AI-assisted risk assessment.
- **Follow:** care plans, follow-ups, and care-gap detection.

## Planned applications

- `apps/web` — Next.js web application for all roles.
- `apps/api` — NestJS main backend and business logic.
- `apps/ai` — FastAPI prediction service.

## Planned core infrastructure

- PostgreSQL
- Prisma
- REST + OpenAPI
- Docker / Docker Compose
- GitHub Actions
- Free-first / open-source-first / self-hostable architecture

## Source of truth

The project is implemented by interchangeable AI coding agents.

Do not rely on prior agent chat history.

The source of truth is:

1. Repository documentation.
2. GitHub Issues.
3. Existing branch / Pull Request.
4. Automated checks and tests.
5. Existing code.

## Required reading before coding

1. `AGENTS.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DOMAIN.md`
5. `docs/DATA_MODEL.md`
6. `docs/API.md`
7. `docs/DECISIONS.md`

## Cost principle

The core project must remain free to develop and self-host.

Paid dependencies are not allowed by default when a reasonable free, open-source, local, or self-hosted alternative exists.
