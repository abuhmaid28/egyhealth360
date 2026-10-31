# EgyHealth 360 — AI Agent Instructions

These instructions apply to every coding, review, research, and automation agent working on this repository.

## 0. Authoritative execution mode — supersedes all older agent workflows

This section is the current execution source of truth and **supersedes older workflow/process instructions in historical issues, PR descriptions, validation records, and stale project-status paragraphs**.

Current delivery state:

- M0, M1, M2, V3-G0, and V3-I1 are COMPLETE.
- V3-I2 backend/core is technically complete through Slice 7 Consultation Close. PR #63 merged to `main` on 31 October 2026.
- The active Product Owner priority is **I2 Live Demo Closeout**: turn the completed I2 backend into a polished, truthful, doctor-facing Live graduation-demo journey.
- Graduation-demo frontend/UI work is explicitly authorized. Older statements saying Design/UI is frozen are historical and **do not block the currently authorized Live/UI work**.
- I3 is NOT authorized unless a newer explicit Product Owner/GitHub authorization says otherwise.
- EACCE is NOT authorized unless a newer explicit Product Owner/GitHub authorization says otherwise.

Repository state and current GitHub authorization supersede chat memory. Do not restart completed work.

## 1. Mandatory reading order

Before substantial work, read in this order:

1. `AGENTS.md`
2. the current GitHub Issue / current Product Owner authorization
3. `docs/PROJECT.md` for product/history context
4. task-relevant accepted contracts/docs
5. current `main`, target branch/PR, implementation, tests, and OpenAPI/schema as relevant

Historical documents remain evidence, but stale status/process sentences inside them are not current execution instructions when they conflict with this file or newer GitHub authorization.

## 2. Source-of-truth priority

For current execution decisions:

1. Current explicit Product Owner authorization recorded in GitHub
2. This `AGENTS.md` execution policy
3. Accepted frozen product/security/clinical contracts and ADRs
4. Current tests, schemas, OpenAPI, and implementation on `main`
5. Historical project/status documents
6. Agent assumptions

Never silently redesign a frozen clinical/security policy. If a genuine new product/security decision is required, stop and request that decision.

## 3. One Active Codex Sprint only

The project uses **one active implementation sprint at a time**.

Do not create parallel Codex implementation tasks, competing feature branches, or overlapping implementation PRs unless the Product Owner explicitly changes this policy.

A sprint should be a **large coherent vertical capability**, not a tiny backend-only or UI-only fragment when the feature can safely be completed end-to-end.

Examples of one sprint scope:

- backend/API/database changes if required
- frontend/Live integration
- EN/AR/RTL presentation where applicable
- focused tests
- real E2E proof
- necessary docs
- final CI

Do not combine unrelated milestones merely to make the task larger.

## 4. Codex owns the sprint through Green PR

Once a sprint is authorized, the implementation agent owns the complete execution loop:

`implement -> focused tests -> diagnose/fix -> continue -> final sync if needed -> final validation -> PR -> CI -> fix CI -> GREEN`

Do **not** stop and hand back intermediate technical blockers that can be solved inside the already authorized/frozen scope.

The agent should autonomously fix and continue for:

- implementation defects inside the sprint scope
- lint/type/build failures
- focused-test failures
- CI failures caused by the sprint
- missing tests/docs required by the same feature
- simple merge/sync conflicts inside the authorized scope
- normal synchronization with `main`
- bounded technical gaps whose correct behavior is already determined by accepted contracts

Stop only for a genuine Owner Decision, such as:

- a new product behavior not covered by accepted requirements
- a change to frozen clinical/security/privacy policy
- a destructive or ambiguous migration/data-loss decision
- a dangerous scope overlap
- starting an unauthorized milestone such as I3/EACCE
- an architectural choice with materially different product/security outcomes and no existing source of truth

## 5. Current-task progress reporting

Progress reporting is for the **current assigned sprint/task only**, never for the whole project.

At the start of the sprint, divide the task into **4–8 concrete checkpoints** with meaningful completion criteria.

Use a lightweight indicator such as:

`Progress: 3/6 — 50%`

`Current: Clinician Review & Close UX`

Rules:

- Percentage must derive from completed checkpoints, not a vague feeling.
- Update progress when a meaningful checkpoint completes.
- Prefer updating one existing sprint-status GitHub comment instead of creating repetitive comments.
- Progress updates are informational only.
- **Never pause and wait for acknowledgment after a progress update.**
- Continue autonomously until Green PR or a genuine Owner Decision.
- 100% means the assigned sprint is implemented and its required validation is complete; if remote CI is required for the sprint, 100% means that final required CI is green.

Do not provide unreliable time-to-completion promises. Report checkpoints/remaining effort instead.

## 6. Branch and PR policy

Use one issue/sprint-scoped branch and one reviewable PR.

Avoid opening a PR early when doing so would trigger expensive GitHub CI for every intermediate push. Work on the branch with focused validation first, then open/update the PR when implementation is substantially complete and ready for final remote validation.

Do not create a second implementation PR while the single active sprint is still in progress.

Keep scope locked:

- no unrelated refactors
- no opportunistic dependency upgrades
- no broad cleanup merely because nearby code was touched
- no unrelated architecture rewrite

One normal sync with latest stable `main` near the final candidate is preferred over repeated merge churn. Sync earlier only when correctness genuinely depends on a new main change.

## 7. CI and testing policy

### During implementation

Run **focused affected validation**, not the entire regression suite after every edit.

Typical development checks:

- affected unit tests
- affected integration tests
- lint/typecheck/build when relevant
- focused browser/E2E proof for changed UI behavior
- targeted security/authorization tests for changed boundaries

### Final candidate

Run the validation appropriate to the risk of the change.

Risk-based review/testing:

- UI/docs-only: frontend build/typecheck, focused unit/browser/E2E and relevant contract checks
- normal backend: affected backend/integration/runtime checks
- auth/privacy/clinical-authority/migration changes: deeper PostgreSQL, concurrency, migration, security and runtime proof
- milestone/release gate: full regression/security/runtime/browser/migration/audit suite

Do not weaken required security or clinical gates merely to save time.

### CI does not stop all development

CI is primarily a **merge/release gate**, not a stop-the-world development gate.

A pending post-merge/main CI does not automatically block a safely scoped next sprint. If main CI later fails, repairing main becomes the priority before a later merge, but implementation need not have idled while the run was pending.

When a newer commit supersedes an older candidate, cancel superseded CI runs where supported rather than wasting runner time.

Path-aware/risk-aware CI, caching, and cancellation are preferred infrastructure improvements. Until those improvements are implemented, do not pretend skipped gates exist; use the actual repository workflow truthfully.

## 8. Fast handoff and independent review

The implementation agent's final handoff should be concise:

- Progress `X/Y — 100%`
- PR
- base SHA
- head SHA
- changed files/scope
- delivered behavior
- focused/final tests
- CI result
- blockers / remaining external-only step
- verdict

The Control Center performs an **independent risk-based double check**, not a wasteful duplicate execution of every test.

Review should verify, as appropriate:

- reported head/base are real/current
- scope stayed authorized
- critical diff/invariants
- actual GitHub CI on the claimed SHA
- review threads/mergeability
- migration/security/clinical authority for high-risk changes

If only a small delta changed after a prior review, review the delta plus critical invariants instead of rereading the entire PR from scratch.

## 9. Current I2 Live Demo Closeout policy

The current sprint is UI/Live-first.

Goal: convert the completed I2 backend into a polished Live graduation-demo journey that can be shown to the supervisor/doctor.

The Live journey should truthfully connect, where already implemented:

`Availability -> Booking -> Consultation Opening -> Clinical Documentation -> explicit Release -> Follow-up Intent -> explicit Consultation Close -> CLOSED / CONSULTED`

Close must not automatically:

- sign private notes
- release patient summaries
- release FollowUpIntent
- complete CareAction
- invoke EACCE
- imply clinical completion beyond the exact frozen Close contract

Live failures stay Live. Never silently fall back to Demo.

A **small bounded I2 backend fix** is allowed only when it is genuinely necessary for a trustworthy Live I2 demo and does not expand into I3. Any such fix must preserve frozen authority/privacy contracts and include focused proof.

Do not start prescriptions, laboratory fulfillment, pharmacy fulfillment, notifications, AI inference, I3, or EACCE under this authorization.

## 10. Clinical and security invariants

Preserve these unless a newer explicit approved contract changes them:

- Backend authorization is mandatory.
- Patient access is own-data only unless an accepted contract explicitly grants another bounded view.
- Current `ClinicianPatientAssignment` is the clinical authority for the implemented I2 clinical journey.
- Booking grants **ZERO clinical authority**.
- Operational membership/directory/publication/authorship alone does not grant clinical authority.
- ADMIN has no blanket clinical access, authoring, impersonation, assignment creation, or break-glass shortcut.
- LAB_STAFF / PHARMACY_STAFF do not gain clinician authority.
- Never trust client-supplied identity/status/time when server/database ownership is required.
- Preserve immutable provenance/history and minimized audit semantics.
- Preserve wrong-patient privacy masking/suppression and safe replay boundaries.
- Never log secrets, session tokens, credentials, or unnecessary full medical payloads.
- Research ground truth and product-facing data remain logically isolated.

## 11. Clinical-rule safety

Never invent a clinical rule. Every implemented clinical rule requires an authoritative source, version/location, human-readable interpretation, machine representation, and tests. If ambiguous, mark it unresolved rather than guessing.

EACCE remains a separate future bounded system. Missing completion evidence alone must not automatically mean `TRUE_GAP`; `UNCERTAIN` is allowed under insufficient observed evidence. The engine must not diagnose, prescribe, recommend dosage, or fabricate medical facts.

## 12. Architecture constraints

Retain the accepted architecture unless explicitly authorized otherwise:

- Next.js + TypeScript frontend
- NestJS + TypeScript modular-monolith API
- PostgreSQL 18
- Prisma 7
- REST + OpenAPI
- pnpm monorepo
- Docker Compose
- GitHub Actions
- shared TypeScript packages for accepted domain/research capabilities

No unapproved microservice rewrite, FastAPI/Python runtime service, Redis/Kafka/RabbitMQ/GraphQL introduction, paid auth, paid AI API, or other paid production dependency.

Prefer local/open-source/self-hostable/free solutions. New dependencies require justification for necessity, maintenance, license, security impact, and why existing dependencies are insufficient.

## 13. Definition of Ready

A sprint is ready when goal, authorized scope, dependencies, acceptance criteria, relevant frozen contracts, and major architecture choices are clear enough to execute autonomously.

Clinical-rule work additionally requires an approved authoritative source.

## 14. Definition of Done

A sprint is done when:

- required behavior works end-to-end for its authorized scope
- acceptance criteria pass
- authorization/privacy/error paths are handled where relevant
- focused/final tests appropriate to risk pass
- required final CI is green
- documentation/contracts are updated when behavior changed
- no known P0/P1 blocker remains
- the final handoff is concise and truthful

Critical auth, authorization, privacy, database-migration, clinical-rule, EACCE, and research-evaluation changes require independent second-pass review where practical.

## 15. Historical evidence

Historical milestone docs, PR descriptions, validation reports, and old authorization comments remain useful evidence and must not be rewritten merely to erase history.

However, **their old execution workflow, stale current-status statements, old Design/UI freeze statements, and old stop-and-wait handoff behavior are superseded by this file and newer explicit GitHub authorization**.

Do not use historical process text to resurrect the old multi-agent/parallel/ping-pong workflow.
