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

**Milestone M0 — Repository Reboot / Bootstrap** is complete and validated. EH-004 Deep Planning Audit Pass 2 is complete and merged; EH-003 Bootstrap Monorepo V2 implementation and validation are complete. See `docs/EH-003_VALIDATION.md` for observed results and limitations.

**EH-005 — M1 Identity & Core Data Foundation** adds the first migration-backed users, profiles, relationship history, and append-only audit primitives. See ADR-019 and `docs/EH-005_PERSISTENCE.md`. EH-006 adds password authentication, database-backed sessions, and CSRF-protected login/logout/me; see `docs/EH-006_AUTH.md`. Authorization, demo seeds, and clinical/research behavior remain unimplemented. The full M1 exit gate is not satisfied by this persistence slice. Later work remains issue-scoped and review-gated.

Important planning references:
- `docs/DEEP_PLANNING_AUDIT_SUMMARY.md`
- `docs/PROJECT_PLAN_6_MONTHS.md`
- `docs/TRACEABILITY_MATRIX_V1.md`
- `docs/research/EXPERIMENT_PROTOCOL_V1.md`

## EH-003 executable workspace

Infrastructure only: the web page, `/api/v1/health`, and worker database health polling contain no product, clinical, or experiment functionality. The machine-readable bootstrap contract is `docs/openapi.json`. Shared clinical-rules, FHIR-adapter, and UI packages are intentionally empty.

### Pinned toolchain

Node **24.21.0**, pnpm **10.34.6**, TypeScript **5.9.3**, Next.js **16.4.0**, React **19.3.0**, NestJS **11.2.7**, Prisma **7.10.0**, PostgreSQL **18.6**. Root `packageManager`, `.nvmrc`, CI, and Docker fix the runtime/toolchain versions. Direct dependencies are exact and transitive resolutions are in `pnpm-lock.yaml`.

### Local startup

Use Node 24.21.0 (`nvm install && nvm use` if using nvm), then:

```sh
npm install --global pnpm@10.34.6
cp .env.example .env
pnpm install --frozen-lockfile
docker compose -f compose.yaml -f compose.local.yaml up -d --wait postgres
pnpm --filter @egyhealth/db exec prisma migrate deploy
pnpm dev
```

Web: http://localhost:3000. API readiness: http://localhost:3001/api/v1/health. The worker logs health only; it does not execute experiments. `pnpm dev` builds first, then runs web development mode, TypeScript watches, and API/worker restart watches. Stop with Ctrl+C.

The default example credentials are explicitly local-only. For custom credentials, URL-encode reserved characters in `DATABASE_URL`; Compose's interpolated password must be URL-safe. Never commit `.env`. The local override exposes PostgreSQL only on loopback. Default Compose does not publish its port. The web service receives no database credentials.

### Full Docker startup

```sh
cp .env.example .env
docker compose config --quiet
pnpm install --frozen-lockfile
docker compose build
docker compose -f compose.yaml -f compose.local.yaml up -d --wait postgres
pnpm --filter @egyhealth/db exec prisma migrate deploy
docker compose up -d --wait --wait-timeout 120
curl --fail http://localhost:3000
curl --fail http://localhost:3001/api/v1/health
docker compose down
```

PostgreSQL data persists in a named volume mounted at `/var/lib/postgresql`, matching the PostgreSQL 18 image layout. `docker compose down --volumes` deletes this local database; use it only when intentionally resetting disposable bootstrap data.

Docker Engine 28.4.0 / Compose 2.40.3 were available during bootstrap development. Application containers run as the unprivileged `node` user. The shared bootstrap image retains workspace build tooling to keep package resolution straightforward; production image minimization/deployment is outside EH-003.

In managed environments with a TLS proxy, supply the proxy CA as a BuildKit secret named `proxy_ca` to **each networked build step**; the Dockerfile supports it without embedding it in the image. Preserve the platform proxy configuration. Do not disable certificate verification. The environment must permit npm, Node/container downloads, and `binaries.prisma.sh` for Prisma CLI engine setup.

### Checks

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm --filter @egyhealth/db validate
pnpm build
pnpm typecheck
pnpm test
pnpm test:integration
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
```

Integration tests require the loopback PostgreSQL service above, `.env`, and `prisma migrate deploy`. Unit tests include the pure deterministic engine import, configuration validation, sanitized API failure response, and bounded email policy. Integration tests verify database constraints/catalog, audit and assignment history, the persistence boundary, API health, and worker polling/shutdown. No seed/authentication/clinical behavior is introduced.

For a **clean disposable database only**, `pnpm test:migrations` verifies emptiness, deploy/status, second deploy/status, and preservation of migration history and a rolled-back sentinel. It refuses an already migrated database. CI runs it before integration tests and keeps the migrated volume for Docker regression. Both `pnpm audit --prod --audit-level high` and `pnpm audit --audit-level high` are required. No production/container migration runner is provided.

The health endpoint returns `{"data":{"status":"ok"}}` only after a successful database query. Failures return HTTP 503 with `DATABASE_UNAVAILABLE` and a generic message. Worker readiness is based on a recent successful database heartbeat, not merely process existence.

## M1 synthetic identities

After the normal build/migration workflow, `pnpm demo:seed` and `pnpm m1:verify`
provide deterministic logical identities and actual HTTP milestone proof. Require
explicit local/test opt-in and a privately injected EH_DEMO_PASSWORD; no password
default is supplied. Verification is not read-only: real session/audit history is
retained. Follow [M1 runbook](docs/M1_DEMO_RUNBOOK.md). M1 completion remains gated
on final validation/CI/review, merge and recorded exit-gate evidence.
