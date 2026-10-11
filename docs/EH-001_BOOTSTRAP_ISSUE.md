# EH-001 — Bootstrap EgyHealth 360 Monorepo

## Goal

Create the initial technical foundation for the EgyHealth 360 repository.

This task establishes the development environment only.

Do **not** implement healthcare business features.

## Required

Create a monorepo containing:

- Next.js web application
- NestJS API application
- FastAPI AI service
- pnpm workspace
- Python environment managed with `uv`
- PostgreSQL
- Prisma 7 pinned
- Docker Compose
- basic linting
- basic type checking
- basic automated tests
- GitHub Actions CI
- `.env.example`
- root README startup instructions
- root `AGENTS.md`
- existing documentation preserved

## Version principles

At implementation time use stable/patched versions consistent with:

- Node.js 24 LTS
- Python 3.14 initially
- PostgreSQL 18
- Prisma 7 pinned
- latest patched stable Next.js 16.x available at bootstrap time
- stable NestJS / FastAPI compatible versions

Pin important versions instead of uncontrolled `latest`.

## Minimal runtime behavior

### Web

Display a minimal page:

> EgyHealth 360  
> Development Environment Running

No final product UI is required.

### API

Provide:

`GET /api/v1/health`

Example:

```json
{
  "status": "ok"
}
```

The API must successfully connect to PostgreSQL.

### AI service

Provide:

`GET /health`

Example:

```json
{
  "status": "ok"
}
```

No ML model is required.

## Docker

Document a Docker Compose workflow that can start the development stack.

Do not add unnecessary infrastructure.

## CI

CI should run the relevant equivalent of:

- install dependencies
- lint
- type check
- tests
- build

## Out of scope

Do not implement:

- authentication
- authorization
- domain database schema
- patient features
- doctor features
- appointment booking
- care gaps
- AI prediction model
- production deployment
- paid services

## Free-first requirement

Do not introduce paid external services.

The bootstrap environment must run locally without paid dependencies.

## Definition of Done

The task is complete only when:

- web starts successfully,
- API starts successfully,
- AI service starts successfully,
- PostgreSQL connection works,
- Docker Compose workflow works,
- web build passes,
- API build passes,
- Node tests pass,
- Python tests pass,
- lint passes,
- TypeScript type checks pass,
- `.env.example` exists,
- secrets are not committed,
- README explains startup and test commands,
- CI passes.

## Completion report

Before marking complete, report:

- created structure,
- versions used,
- commands to run locally,
- checks/tests executed,
- known limitations,
- any deviation from architecture documentation and why.
