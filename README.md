# EgyHealth 360

An integrated synthetic graduation healthcare platform connecting patient access, booking, consultation, prescriptions, diagnostics, dispensing and follow-up, with later longitudinal continuity and bounded explainable HTN research.

Start with [CURRENT_STATUS](docs/CURRENT_STATUS.md), [stable charter](docs/FOUNDATION_CHARTER.md) and [source index](docs/SOURCE_OF_TRUTH.md). Agents follow [AGENTS](AGENTS.md) and current GitHub authorization first.

Accepted complete: M0/M1/M2, V3-G0, I1, I2, I3 contract, I3 Slice 1 Prescription and Slice 2 Pharmacy. Active: Foundation Reboot V2 Stage 2, Product UX documentation/analysis only; [current UX reading path](docs/UX_FOUNDATION.md). Stage 0+1 and CI Accelerator V2 are accepted/merged; Stage 2 review/owner acceptance and separate Stage 3 authorization remain required. Lab and I4/I5/EACCE remain paused. [Roadmap](docs/IMPLEMENTATION_ROADMAP.md).

The functional V1 web UI includes separate Demo and Live adapters. [Pre-final Live](https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app/) evidences the I2 patient/clinician journey through explicit close; I3 cloud/UI parity is not verified. Current UI/logo/design are not final. `egyhealth360.vercel.app` remains protected.

Runtime: Next.js/TypeScript → NestJS modular monolith → PostgreSQL 18/Prisma 7; pnpm monorepo, REST/OpenAPI, Docker and GitHub Actions. Hosted pre-final uses Vercel web/API and Neon. [Architecture](docs/ARCHITECTURE.md). Backend authority, current assignments, exact staff artifact scope, immutable source history and wrong-patient privacy are preserved.

Synthetic/free-first/self-hostable scope only. No real-patient deployment, diagnostic AI/autonomous prescribing, payments/insurance, inventory/hospital ERP, full LIS/PACS/DICOM or partial/refill/substitution workflow. [Product](docs/PRODUCT.md), [execution policy](docs/EXECUTION_POLICY.md).

## Local setup and retained runbooks

The web/API now implement the accepted slices above. Only closure-engine, FHIR adapter, shared UI package and research worker capability remain scaffolds; clinical-rules contains the exact accepted definition. Commands below are local/disposable workflows, not permission to initialize/migrate hosted staging or the final domain.

### Pinned toolchain

Node **24.21.0**, pnpm **10.34.6**, TypeScript **5.9.3**, Next.js **16.4.1**, React **19.3.0**, NestJS **11.2.7**, Prisma **7.10.0**, PostgreSQL **18.6**. Root `packageManager`, `.nvmrc`, CI, and Docker fix the runtime/toolchain versions. Direct dependencies are exact and transitive resolutions are in `pnpm-lock.yaml`.

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

Integration tests require the loopback PostgreSQL service above, `.env`, and `prisma migrate deploy`. Unit tests include the pure deterministic engine import, configuration validation, sanitized API failure response, and bounded email policy. Integration tests verify database constraints/catalog, audit and assignment history, the persistence boundary, API health, and worker polling/shutdown. The original EH-003 bootstrap introduced no seed/authentication/clinical behavior; later M1/M2 tests and runtime verifiers now cover the accepted foundations. See [TESTING](docs/TESTING.md) for slice-specific evidence.

For a **clean disposable database only**, `pnpm test:migrations` verifies emptiness, deploy/status, second deploy/status, and preservation of migration history and a rolled-back sentinel. It refuses an already migrated database. CI runs it before integration tests and keeps the migrated volume for Docker regression. Both `pnpm audit --prod --audit-level high` and `pnpm audit --audit-level high` are required. No production/container migration runner is provided.

The health endpoint returns `{"data":{"status":"ok"}}` only after a successful database query. Failures return HTTP 503 with `DATABASE_UNAVAILABLE` and a generic message. Worker readiness is based on a recent successful database heartbeat, not merely process existence.

## M1 synthetic identities

After the normal build/migration workflow, `pnpm demo:seed` and `pnpm m1:verify`
provide deterministic logical identities and actual HTTP milestone proof. Require
explicit local/test opt-in and a privately injected EH_DEMO_PASSWORD; no password
default is supplied. Verification is not read-only: real session/audit history is
retained. Follow [M1 runbook](docs/M1_DEMO_RUNBOOK.md). M1 is complete; [final exit-gate evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884).

## EH-009 clinical catalog

After build and migration, explicitly run `pnpm clinical:bootstrap` with DATABASE_URL.
It loads only the exact approved WHO CR-HTN-FU-001 catalog, fails on conflicts and
preserves identical repeat state. It does not run on application startup. See
[clinical-definition contract](docs/EH-009_CLINICAL_DEFINITION_CONTRACT.md) and
[validation](docs/EH-009_VALIDATION.md). This describes the EH-009 catalog slice only. Later M2 slices add patient plans, BP/evidence and INITIAL actions; M2 is COMPLETE. No EACCE evaluator is implemented.
