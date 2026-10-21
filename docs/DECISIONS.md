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
The original M1 completion gate was subsequently satisfied at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [recorded evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884).
See EH-008_DEMO_IDENTITIES.md and M1_DEMO_RUNBOOK.md.

### ADR-023 — Source-traceable clinical definitions and explicit catalog bootstrap
Status: Accepted (Issue #16 final approval comment 6157539102)

Three catalog models only: immutable GuidelineSource, lifecycle-owning CarePlanTemplate,
and CareRuleDefinition with exact specialized JSONB. WHO 2021 alone is authoritative;
Egyptian 2014 remains documented corroboration. No free-form interpretation column.
The approved 1.0.0-draft identity can have PUBLISHED lifecycle. Only the exact approved
source/template/rule manifest and machine definition can publish, including through
ordinary SQL/Prisma. Version regex validity alone never authorizes a new version.
Future versions require explicit approval, manifest and validator support.

Template aggregate transitions DRAFT -> PUBLISHED -> RETIRED only. Parent-row locks,
CHECKs, migration-owned invoker functions/triggers, immutable identities/FKs and
statement DELETE/TRUNCATE guards protect history. No-op updates preserve timestamps;
new-model timestamps are database-owned. DRAFT display name may change but must match
the approved name at publication. Source is immutable from insertion. No independent
rule lifecycle, patient model, evaluator, expression language, or generic rules CRUD.

Explicit pnpm clinical:bootstrap; fixed manifest in clinical-rules; narrow private
DB boundary; one bounded atomic insert-missing/validate-existing/publish transaction.
Exact repeat is zero-write. Conflicting/retired state fails closed; no force/reset.
Genuine publication/retirement append empty-metadata system audits atomically. Only
an internal workspace dependency is added. One additive migration; EH-005/006 SQL
unchanged. No product endpoint or auth change. See EH-009_CLINICAL_DEFINITION_CONTRACT.md.

### ADR-024 — Version-pinned CarePlan lifecycle and evidence-gated action generation
Status: Accepted (Issue #18 final approval comment 6179110871)

One CarePlan model only, with exact patient-profile/template/rule UUIDs and authenticated
creator user identity. Composite rule/template FK; no copied versions/latest lookup.
DRAFT/ACTIVE/CANCELLED only; completion is deferred. Pins immutable from insertion;
one ACTIVE hypertension plan per patient; ordinary SQL guards restrict the exact
approved EH-009 aggregate and reject DELETE/TRUNCATE. PUBLISHED required on creation
and activation under retirement-conflicting locks; retirement retains historical plans.

Narrow internal principal-checked operations, transactional session/user/profile/
assignment/patient/plan/template locking and genuine atomic lifecycle audit. No HTTP
route or EH-007 authorization ticket. Deterministic read-only deferred specification
contains approved declarations and explicit gates only, never an action/occurrence/
evidence identity, eligibility result or concrete timestamp. No CareAction table,
generation writer, key encoder, BP/evidence, calendar arithmetic or EACCE. Activation
is not trigger evidence. No new external dependency. One additive migration; prior
migrations unchanged. FR-020 foundation only; FR-021 incomplete; M2 in progress.
See EH-010_CARE_PLAN_CONTRACT.md and EH-010_VALIDATION.md.

### ADR-025 — Immutable paired BP evidence and authenticated entry provenance
Status: Accepted (Issue #20 final approval comment 6183982525)

One nine-field paired BP row, int32 components and mmHg only; caller event time,
database receipt time, patient-profile FK, authenticated recorder user FK and exactly
PATIENT_SELF_ENTRY/CLINICIAN_ENTRY. No clinical plausibility bounds, qualifications,
CarePlan/catalog dependency or external source identity. No correction workflow;
all UPDATE/DELETE/TRUNCATE prohibited. Later evidence use requires correction-aware
normalization and selection. Identical POSTs create distinct rows; no idempotency.

Narrow principal-checked creation/history boundary, fixed current-authorization locks,
final expiry recheck and atomic empty-metadata BP_MEASUREMENT_CREATED audit. SQL guards
check structure, not authentication, with invoker/trusted search path/qualified lookups.
POST and paginated GET/HEAD use existing session/Origin/CSRF and uniform object denial.
Raw duplicate/token validation is confined to BP POST; global parser unchanged.
HTTP explicitly omits recorder user UUID. No external dependency. One additive migration;
four historical migrations unchanged. CareAction generation/FR-021 remain deferred;
below-threshold BP and active plan do not establish clinical eligibility. M2 in progress.
See EH-011_BP_PROVENANCE_CONTRACT.md and EH-011_VALIDATION.md.


### ADR-026 — Operational follow-up and immutable encounter/BP evidence foundation
Status: Accepted (Issue #22 final approval 6204890129)

Three narrow models: SCHEDULED->CANCELLED operational appointments, immutable encounters, immutable BP associations. HTN_BP_FOLLOWUP is purpose only. No provider allocation/participant claim, rule/plan/action FK or clinical qualification. Preserve BP rows and guards; composite same-patient FKs plus unique BP prevent cross-patient/ambiguous association. Prisma requires a redundant composite unique for its one-to-one relation. Current session/user/profile/assignment transactions and final expiry recheck; genuine empty-metadata atomic audit. Patient own reads; assigned clinician writes; Admin denied. Non-idempotent creation; authorized cancellation/exact-pair retries preserve provenance without events. One additive migration, no external dependency. Corrected association-reference GET/HEAD ends blood-pressure-associations. CareAction/FR-021 deferred, FR-024 foundation-only, AC-004/005 unsatisfied, M2 in progress; EH-013 owns coverage/normalization. Exact contract: EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md.

### ADR-027 — Record coverage windows and normalized evidence queries
Status: Accepted (Issue #24 final approval comment 6223961083)

One new model RecordCoverageWindow with immutable machine-process provenance. Source type is strictly SYNTHETIC_BENCHMARK; sourceReference is required opaque string (1..128 chars, regex ^[A-Za-z0-9_.-]+$). Status is COMPLETE | INCOMPLETE | UNKNOWN. No recordedByUserId; no DataSource table. Chronology check startAt < endAt. Assertion uniqueness on (patient_id, source_type, source_reference, status, start_at, end_at). Immutability enforced by database trigger rejecting all UPDATE, DELETE, and TRUNCATE.
Internal insert-missing helper performs ON CONFLICT DO NOTHING without application audit events because EH-013 is an internal machine slice with no public HTTP endpoints.
Coverage interval normalization is pure, in-memory, deterministic, and strictly partitioned by (patientId, sourceType, sourceReference). Overlap resolution precedence is INCOMPLETE > UNKNOWN > COMPLETE. Contributing raw window IDs are preserved on every segment. Adjacent identical-status intervals coalesce. Gaps with no assertions remain unasserted (silent missingness preserved; never synthesized as UNKNOWN).
Normalized evidence queries execute as a single-statement transactional snapshot returning canonical coverage intervals, raw BP measurements, encounter-anchored BP candidates, and operational appointment candidates without clinical qualification. Zero HTTP endpoints.
See EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md and EH-013_VALIDATION.md.

### ADR-028 — Observed clinical applicability persistence foundation
Status: Accepted (Issue #29 authoritative review comments 6242326017 and 6242103787)

Two new models: ObservedClinicalApplicabilitySnapshot (15 scalar fields) and ObservedClinicalApplicabilityRetraction (9 scalar fields).
Source type is strictly SYNTHETIC_OBSERVED_INPUT; sourceReference, assertionReference, and retractionReference are required bounded ASCII strings (1..128 chars, regex ^[A-Za-z0-9_.-]+$) sorted using PostgreSQL C collation.
Discriminated age assertion state machine: NO_ASSERTION and UNKNOWN enforce ageYearsAtAssessment IS NULL; ASSERTED_VALUE enforces ageYearsAtAssessment IS NOT NULL AND >= 0. Coercions (e.g. floats, strings, negative numbers) are strictly rejected.
Clinical conditions (hypertension, CVD, diabetes, CKD) and pregnancy status are explicit four-state domains (NULL, PRESENT/PREGNANT, ABSENT/NOT_PREGNANT, UNKNOWN).
Research noninterference: Complete ground truth is logically inaccessible; unasserted observed fields remain NULL and are never backfilled or inferred from ground truth.
Terminal one-to-one retraction: A retraction locks its target snapshot FOR UPDATE, enforces composite partition key consistency (snapshot_id, patient_id, source_type, source_reference), and withdraws the snapshot permanently. Retraction retries are idempotent; conflicting attempts fail closed with APPLICABILITY_CONFLICT.
Immutability: Database triggers reject all UPDATE, DELETE, and TRUNCATE operations unconditionally on both tables.
Internal machine writer operates with zero application audit events.
Authorized query service executes a single-statement parameterized LEFT JOIN snapshot under canonical user/session/assignment lock discipline, returning an ObservedApplicabilityPoint with mechanical tuple comparison (NO_NON_RETRACTED_ROWS, IDENTICAL_TUPLES, DIFFERING_TUPLES). Zero public HTTP routes.
Slices B2 (BP qualification/selection), B3 (occurrence/retrigger), B4 (BP evidence invalidation/correction), and CareAction generation remain deferred. Milestone M2 remains in progress.
See EH-015_OBSERVED_APPLICABILITY_CONTRACT.md and EH-015_VALIDATION.md.

### ADR-029 — BP terminal exclusion and independent wrong-patient privacy
Status: Accepted (Issue #31 complete frozen contract, final approval comment 6305526971)

Immutable source BP remains intact. One terminal exclusion per BP; correction/restatement uses fresh full-pair same-patient evidence and truthful new provenance. Separate append-only wrong-patient privacy supports F1's already-excluded case without overwriting the original reason. Privacy targets are explicit frozen same-lineage identities, never dynamically propagated. Current assigned clinicians only; principal-checked internal service, canonical operation idempotency, locked atomic mutation/audit. Existing product reads mask private payload/references and effective normalized evidence removes every exclusion. D1 defers exact captured decision inputs to EH-014/B2 and guarantees no arbitrary historical transaction visibility. D2 adds no forensic role, raw endpoint or cross-patient transfer. One additive migration, no BP backfill or historical migration changes. No B2/B3/CareAction/EACCE implementation; M2 IN PROGRESS. See BP_CORRECTION_INVALIDATION_CONTRACT.md and BP_CORRECTION_INVALIDATION_VALIDATION.md. Implementation acceptance still requires independent review, merge and post-merge CI.

## Change process

A major scope, architecture, security, or clinical-rule change requires a documented proposal and an explicit decision update before implementation.
