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

### ADR-019 — Identity and Core Persistence Foundation
Status: Accepted (EH-005 final approval, Issue #8 comment 6129057503)

The first persistence slice contains only users, patient/clinician profiles,
clinician-patient assignments, and audit logs. PostgreSQL generates UUID v4 IDs
with `gen_random_uuid()`; Prisma uses `String @db.Uuid` and snake_case mappings.
Roles are PATIENT/CLINICIAN/ADMIN, user status ACTIVE/DISABLED, and assignment
status ACTIVE/ENDED. No authentication or authorization behavior is implied.

Email identity is bounded ASCII: trim outer ASCII whitespace and lowercase ASCII;
store canonical values under a unique constraint and database canonical/shape
CHECKs. This is not full RFC email validation. No provider-specific alias rules.

Profiles have unique user IDs, fixed-role discriminator CHECKs, and composite
RESTRICT FKs to users(id, role). Prisma requires redundant composite uniqueness
on each profile's relation key in addition to unique user_id. Bound users cannot
change to an incompatible role. Profileless-role transitions are deferred.
User/profile provisioning is transactional through the package boundary; SQL
does not require every applicable user to have a profile. No global role,
user/profile deletion, ownership, or database timestamp trigger is introduced.
Mutable user/profile timestamps use Prisma @updatedAt; raw SQL does not maintain it.

An ACTIVE-pair partial unique index permits only one current assignment per pair.
The lifecycle CHECK ties status to ended_at and enforces time ordering. Narrow
history guards freeze IDs/endpoints/start time, permit ACTIVE→ENDED, retain ended
rows, and reject history mutation/deletion/truncation. Reassignment inserts a new
row. All FKs explicitly RESTRICT key updates/deletion; the normal boundary has no
delete/role-change operation. Controlled maintenance/reset policy is deferred.

Audit logs reject UPDATE/DELETE/TRUNCATE in PostgreSQL and expose only a typed
append operation. The actor may explicitly be NULL for system/unattributed events.
Entity references remain polymorphic without generic target validation/allowlists.
Metadata is object-only JSONB; the initial append primitive accepts only empty
metadata until event-specific safe fields are approved. Passwords, hashes, tokens,
secrets, and arbitrary payloads are prohibited. This is ordinary-operation
protection, not tamper-proof storage against database owners/superusers.

Patient sex is nullable opaque text with no inferred clinical/FHIR meaning.
Custom CHECKs, partial index, functions, and triggers are owned by the committed
migration and verified by catalog and behavior tests. No db push, preview feature,
new dependency, or production/container migration runner is introduced. Host/CI
migrate deploy proves clean deployment and second-deploy behavior before Docker
regression. Future migrations must preserve custom SQL deliberately.

### ADR-020 — Authentication/session foundation
Status: Accepted (EH-006 final approval, Issue #10 comment 6136179437)

Use Node 24.21.0 built-in asynchronous Argon2id and the strict application-specific
109-byte versioned encoding; no external dependency. Eight-hour opaque database
sessions store only SHA-256 lookup hashes. Sessions rotate at successful relogin,
remain retained, and have no sliding/last-used/cleanup machinery. Production
__Host- cookie; session-derived CSRF; exact mandatory browser Origin and login
custom-header controls. Successful session mutations append empty-metadata audit
atomically. Only login/logout/me and minimal principal; authorization remains later.
See `EH-006_AUTH.md` for the frozen contract and limitations.

### ADR-021 — Relationship-aware authorization foundation
Status: Accepted (Issue #12 final approval comment 6150370205)

EH-006 server principal is the only actor source. Patient ownership uses
patient_profiles.id and authenticated user_id mapping; clinician mapping uses
its own user_id and requires ACTIVE/null-ended assignment. Missing profiles and
ADMIN patient access fail closed. Only explicit actions can permit access.
The minimal production proof route reads id/displayName only. Authorization and
projection share one narrow parameterized SQL statement, rechecking session/user/
role. No general client/read, cache, migration, dependency, write or audit expansion.
Uniform object 404 covers malformed/nonexistent/forbidden targets; current-session
failure remains 401. READ COMMITTED statement semantics do not retract in-flight
responses after concurrent ending/revocation. Future clinical writes need separate
transaction contracts. See EH-007_AUTHORIZATION.md.

### ADR-022 — Deterministic logical demo identities and M1 verification
Status: Accepted (Issue #14 final approval comment 6153695039)

Dataset eh-m1-demo-v1 fixes five synthetic logical identities and one ACTIVE edge.
UUIDs/timestamps/salts are naturally generated. Insert missing / validate existing
only, with credential/profile/relationship conflicts rolling back; ENDED-only intended
history never silently re-grants access. Narrow bootstrap helper; explicit local/test
CLI opt-in; private injected password and existing EH-006 Argon2id; no production
allowance, reset, HTTP administration, schema/dependency/pin/auth redesign.
M1 verification inspects valid state before real HTTP and any repeat seed, accepts
additional valid future migrations while requiring M1 checksums, and proves zero
repeat inserts. It is not read-only: genuine login/logout history is retained.
M1 status stays pending validation/CI/independent review/merge/recorded exit evidence.
See EH-008_DEMO_IDENTITIES.md and M1_DEMO_RUNBOOK.md.

## Change process

A major scope, architecture, security, or clinical-rule change requires a documented proposal and an explicit decision update before implementation.
