# EgyHealth 360

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Slices 1–5 COMPLETE; PR #45 merged at `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, exact-main [Bootstrap 40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467) SUCCESS; [Slice 5 completion 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6 exit/security review](docs/V3_I1_SLICE6_EXIT_REVIEW.md) IMPLEMENTED / IN REVIEW under [authorization 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). V3-I1 INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.

EgyHealth 360 is an **integrated digital healthcare journey** graduation prototype: patient access, discovery, booking, consultation, prescriptions, diagnostics, dispensing and follow-up connect through a longitudinal record, structured care coordination and later bounded explainable evidence-aware monitoring.

## Product and implementation status

| Area | Status |
|---|---|
| Product V3 policy | **APPROVED** — [owner approval](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6346537901), [D01–D36/lineage](docs/PRODUCT_V3_DECISIONS.md) |
| V3-G0 documentation reconciliation | **COMPLETE**; PR #36 merged, exact-main CI PASS, Issue #35 CLOSED/completed; [evidence](docs/PROJECT.md#v3-g0-completion-evidence) |
| M0 / M1 / M2 | **COMPLETE**, accepted historical foundations; [project/evidence](docs/PROJECT.md) |
| V3-I1 / EACCE implementation | I1 contract APPROVED; Slice 1 merged/verified; [Slice 2 organization/membership implementation](docs/V3_I1_SLICE2.md) COMPLETE, I1 NOT COMPLETE, Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 IMPLEMENTED / IN REVIEW; EACCE NOT STARTED; [Roadmap V3](docs/IMPLEMENTATION_ROADMAP.md) |
| Product UI/design | **NOT STARTED / DESIGN FROZEN**, separate explicit design-unfreeze approval required |

Approved future workspaces: **Patient, Doctor, Laboratory/Diagnostics, Pharmacy and Admin**, one application. Bounded patient registration, doctor discovery/booking, human-authored consultation, prescriptions, full-item pharmacy dispensing and laboratory fulfillment are Tier 1 product scope; implemented subsets are identified above. Imaging is optional Tier 2. Ordinary healthcare does not require a CarePlan/EACCE. Current fixed backend roles are PATIENT/CLINICIAN/ADMIN/LAB_STAFF/PHARMACY_STAFF. Slice 2 operational memberships are COMPLETE; Slice 3 registration/own profile is COMPLETE; Slice 4 curated discovery is COMPLETE; Slice 5 bilateral enrollment is COMPLETE; Slice 6 is IMPLEMENTED / IN REVIEW and V3-I1 remains INCOMPLETE; booking/fulfillment remain unimplemented.

The current implementation includes secure identity/session/ACTIVE-assignment foundations, version-pinned HTN plans, immutable BP and encounter/follow-up evidence, coverage/applicability/correction/privacy, and bounded INITIAL CareAction generation. These remain unchanged; they do not constitute complete V3 journeys. [API](docs/API.md) and [DATA_MODEL](docs/DATA_MODEL.md) distinguish actual interfaces/models from future concepts.

The research differentiator remains bounded HTN care closure under incomplete records, with six future product classifications, explicit uncertainty and isolated B0/B1/P1 evaluation. Engine/worker/FHIR scaffolds are not completed EACCE or experiments. Clinical actors enter diagnoses/prescriptions; no diagnostic AI, autonomous treatment/dose recommendation or adherence inference.

## Architecture

Next.js/TypeScript web application; NestJS modular-monolith API; PostgreSQL 18/Prisma 7; REST/OpenAPI; shared TypeScript packages; experiment worker/FHIR adapter boundaries; Docker Compose/GitHub Actions. No microservice/FastAPI/Python/ML rewrite or paid service requirement.

## Scope boundaries

Synthetic/free-first/self-hostable graduation scope only. No real-patient deployment, payments/insurance, video infrastructure, national marketplace economics, delivery, inventory/hospital ERP, full LIS/PACS/DICOM, diagnostic AI, generalized IAM/rule editor or broad disease/recurrence engine. Pharmacy partial quantities/refills/substitution are outside the frozen release. See [PRODUCT](docs/PRODUCT.md) for complete tiers.

No default fieldwork/interview/survey/real-patient data dependency; see [execution policy](docs/EXECUTION_POLICY.md). ADMIN has no clinical entitlement. Current authority, source history and privacy masking remain mandatory, including future artifact-scoped lab/pharmacy [D36](docs/SECURITY.md#d36--cross-module-fulfillment-authority-and-suspension).

## Source of truth

Read [AGENTS](AGENTS.md), [PROJECT](docs/PROJECT.md), current issue, relevant approved docs and existing contracts/tests/implementation. [Requirements](docs/REQUIREMENTS.md) and [traceability](docs/TRACEABILITY_MATRIX_V1.md) preserve V2 IDs/evidence and version new V3 scope. [ADR-031](docs/DECISIONS.md#adr-031--approved-product-v3-integrated-journey-and-bounded-authorization) records explicit supersession; no historical contract is rewritten. Product V3 is now the repository source of truth. Product approval is not implementation completion/authorization.

## Executable workspace and local tooling

The commands below retain the working bootstrap/M1/M2 setup. The web surface and worker remain scaffolds; API/persistence includes the accepted slices in PROJECT. Shared clinical-rules now contains the exact approved HTN definition; closure-engine, FHIR adapter and UI remain scaffolds. No integrated product UI is claimed.

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
