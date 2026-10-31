# EgyHealth 360 — AI Agent Instructions

## Current Slice 7 exit-review boundary

[Issue #48 authorization 6536467435](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6536467435) authorizes combined verification and independent security review from exact main `b8ed01e4546ac94e52f9fcbec2f23e90b6fc6262` (Bootstrap 41146078616 SUCCESS). Slices 1–6 are merged; older in-review/not-authorized paragraphs below are historical snapshots. [Slice 7 exit review](docs/V3_I2_SLICE7_EXIT_REVIEW.md) records the current evidence, bounded documentation privacy fix and unresolved consultation-close contract conflict. Slice 7 is IN REVIEW; I2 exit is **BLOCKED**, not COMPLETE. PR must remain OPEN / UNMERGED with auto-merge OFF. I3 remains NOT AUTHORIZED; EACCE NOT STARTED. No frontend or deployment changes in this track.

Current backend delivery: V3-I2 Slices 1–5 COMPLETE. [Flow Accelerator authorization 6524790227](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6524790227) follows exact-main `42b59da01e591f9c4792b81c2cb9b48a0a00cd2d`, Bootstrap 41008236990 / validate 123907937943 SUCCESS and authorizes Slice 6 Core. [Slice 6](docs/V3_I2_SLICE6.md) production implementation is IMPLEMENTED / IN REVIEW. The Lane A gate is open: exact-main `4cb20b39370e5317eba14c4916517b6ae88c12e5` / Bootstrap 41118583027 SUCCESS, [routing 6532727912](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6532727912). Main was normally merged into the existing branch and the runtime verifier is wired into accelerated CI. Final validation and independent exact-head review remain required; DO NOT MERGE. V3-I2 INCOMPLETE. Slice 7 and I3 NOT AUTHORIZED. EACCE NOT STARTED. No frontend or deployment work in Slice 6. No merge authorized.

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

Product V3 policy is APPROVED: integrated healthcare journey → longitudinal continuity → bounded HTN EACCE. Read `docs/PRODUCT_V3_DECISIONS.md` for D01–D36 and Issue #35 approval lineage; ADR-031 explicitly supersedes the narrower Product V2 positioning/exclusions. Ordinary care does not require a CarePlan/EACCE.

One application targets five future workspaces: Patient, Doctor, Laboratory/Diagnostics, Pharmacy and Admin. The Slice 2 implementation adds fixed LAB_STAFF/PHARMACY_STAFF to PATIENT/CLINICIAN/ADMIN and bounded organization memberships for operational scope only. Patient self-registration/own profile are COMPLETE in Slice 3; directory is COMPLETE in Slice 4; bilateral enrollment is COMPLETE in Slice 5; general booking/consultation and fulfillment remain unimplemented future slices. No membership grants patient-record access. Human-entered diagnoses/prescriptions are permitted; diagnostic AI and autonomous treatment/dose recommendation remain prohibited. Laboratory is MUST; imaging SHOULD/optional. Full-item dispensing only; no partial quantities/refills/substitution.

M0–M2 remain COMPLETE and historically unchanged. V3-G0 is COMPLETE: PR #36 merged, exact-main CI passed and Issue #35 is CLOSED/completed (see `docs/PROJECT.md`). Product V3 is the repository source of truth. V3-I1 contract is APPROVED in Issue #39; read `docs/V3_I1_CONTRACT.md`. Slice 1 is merged/verified in PR #40 at a03c0b63a0ed44bcf39a32428002af0c92edc7e0 (exact-main CI 39948145751 SUCCESS). Slice 2 is authorized by Issue #39 comment 6366843150; its organization/membership implementation is COMPLETE (PR #41; exact-main CI 40010140478 SUCCESS; docs/V3_I1_SLICE2.md). V3-I1 overall is COMPLETE; Slice 3 is COMPLETE after PR #43 / exact-main CI 40116846242; Slice 4 is COMPLETE via PR #44 / exact-main CI 40195060034; Slice 5 is COMPLETE via PR #45 / exact-main CI 40252309467; Slice 6 is COMPLETE. EACCE remains NOT STARTED. Do not treat policy approval as implementation authorization. Preserve accepted contracts, migration history, deterministic M1 seed and validation evidence; extend only through reviewed milestone-specific work.

Design remains FROZEN: no UI/UX, screens, wireframes, Design System, branding or frontend visual work until separate explicit design-unfreeze approval. Historical visual docs are not active instructions.

No real-patient deployment, paid service dependency, national marketplace economics, ERP/LIS/PACS, video infrastructure, diagnostic AI, generalized IAM/rule editor or broad disease/recurrence engine is authorized. See `docs/PRODUCT.md` for frozen scope tiers and `docs/IMPLEMENTATION_ROADMAP.md` for V3 sequencing.

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
- Preserve audit and clinical source history separately from timeline projections; apply wrong-patient masking.
- Future relationships require explicit patient authorization and clinician acceptance; booking grants logistics only. Continue until explicitly ended, recheck current access, and grant no permanent author entitlement.
- Future lab/pharmacy access is routed-artifact scoped with current active user/organization/membership/artifact authority (D36); suspension denies subsequent reads/writes. ADMIN has no clinical fulfillment entitlement. Do not use these future policies to bypass existing ACTIVE-assignment contracts.
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

## V3-I2 contract/readiness boundary

See the [I2 contract](docs/V3_I2_CONTRACT.md) and [Slice 2 implementation](docs/V3_I2_SLICE2.md) for the frozen boundaries and current delivery. Only finite availability and operational scheduling configuration are implemented in Slice 2. Full Journey A is incomplete. Historical evidence and D01–D36 retain their original meaning.
