# EgyHealth 360 — stable agent execution rules

Applies to every agent working in this repository. Mutable task/milestone/deployment state belongs in `docs/CURRENT_STATUS.md` and current GitHub authorization, never here.

## Mandatory reading order

After this file, read only the relevant current path:

1. Current GitHub issue and latest applicable explicit Product Owner authorization; check supersession.
2. [CURRENT_STATUS](docs/CURRENT_STATUS.md).
3. [FOUNDATION_CHARTER](docs/FOUNDATION_CHARTER.md) and [SOURCE_OF_TRUTH](docs/SOURCE_OF_TRUTH.md).
4. Task-relevant accepted contracts/current references identified by that index.
5. Current main/target branch, implementation, tests, schema and OpenAPI as relevant.

Do not reconstruct current authorization from old PRs or chat memory. Historical reports establish past evidence. Their old workflow, UI freeze and milestone-status statements do not authorize or block a newer explicitly scoped task. No future milestone is authorized merely by being in the roadmap.

## Scope and decisions

Follow the charter's authority hierarchy. Current explicit owner authorization sets scope; accepted product/security/clinical contracts remain binding unless explicitly amended. Code/tests describe reality, not permission to change policy. Report a material contract/implementation conflict.

**NO IMPLEMENTATION FROM UNDEFINED PRODUCT OR DESIGN DECISIONS.** Codex implements approved final UX/content/brand/Design System/prototypes; the Product Owner chooses final product/design direction. Do not finalize journeys, navigation, important terminology, brand/logo/colors/fonts, final visual direction, Design System, high-fidelity prototypes, clinical/security policy or major architecture replacement without explicit approval. Resolve routine implementation details autonomously inside approved contracts.

## One sprint through review

Use one issue-scoped branch and one coherent PR. No parallel implementation tasks, competing branches/PRs or old multi-agent ping-pong workflow without explicit owner authorization. No unrelated cleanup, dependency churn or architecture rewrite.

Complete the authorized loop: implement/document → focused validation → diagnose → final candidate → PR → required CI → Green. Continue through routine technical problems inside authorized scope. In a docs/audit-only sprint, record runtime defects and remediation recommendations; do not fix them without separate authorization. Stop only for a genuine missing owner decision or an external blocker that cannot be resolved within scope. Do not merge, promote production or enable auto-merge without explicit authorization.

Avoid an early PR that triggers expensive CI on each intermediate edit. Prefer one final sync with stable main when needed; do not overwrite user work. Keep historical evidence at its existing paths and preserve protected screenshots/assets.

## Progress and handoff

Use 4–8 concrete checkpoints unless the task prescribes its own count. Report `Progress: X/Y — Z%` and `Current: <checkpoint>` for this task only. Derive percentage from completed checkpoints. Progress is informational; continue without waiting for acknowledgment. 100% requires the assigned scope and required validation, including final remote CI when required, to be complete.

Handoff with PR, exact base/head, scope/changed files, evidence, actual CI, debt/blockers and independent-review verdict. Never equate technical Green with Product/UX/Design approval. Keep the PR open/unmerged when that is the authorized delivery state.

## Risk-based validation

During work run focused checks. For a final candidate use actual repository gates; do not invent skipped/path-aware gates or weaken checks. Docs-only work proves reference consistency and byte-identical runtime/schema/migrations/OpenAPI/dependencies/protected evidence; use repository Markdown tooling if available. Runtime work requires appropriate build/typecheck/lint and affected tests. Auth/privacy/clinical/migration work additionally requires real PostgreSQL, negative authority, history, rollback and concurrency proof; high-risk work needs independent second-pass review where practical.

A pending main CI need not block safe audit/documentation, but a genuine main regression blocks a later review-ready/merge claim. Cancel superseded runs where supported. Do not rerun expensive complete suites without new changes or unresolved failures.

## Preserved authority and safety

- Backend authorization is mandatory. Patients access own permitted data.
- Current `ClinicianPatientAssignment` is the clinical grant; booking grants ZERO clinical authority. Membership, public directory, authorship and role alone never create clinical authority.
- ADMIN has no blanket clinical payload, impersonation, signing, assignment-creation or break-glass shortcut. LAB_STAFF/PHARMACY_STAFF do not gain clinician authority; accepted fulfillment contracts require exact current organization/membership/routed-artifact authority.
- Recheck current authority/privacy on ordinary reads, writes and replay. Preserve immutable history, minimized audit and wrong-patient payload/reference/count suppression.
- Server/database own actor, time and status where required. Preserve canonical operation keys, no automatic clinical mutation retry, lock ordering and atomic audit/result behavior.
- Never log secrets, session tokens, credentials or unnecessary medical payloads. Use synthetic patient data only; isolate research ground truth from product/observed inputs.
- Never invent a clinical rule: require authoritative source/version/location, interpretation, machine representation and tests. Ambiguity remains unresolved.
- Missing evidence alone does not prove TRUE_GAP. EACCE may abstain with UNCERTAIN; it must not diagnose, prescribe, recommend dosage or fabricate facts.

## Architecture and milestone governance

Retain Next.js/TypeScript, NestJS modular monolith, PostgreSQL 18/Prisma 7, REST/OpenAPI, pnpm, Docker Compose and GitHub Actions unless explicitly changed. No fashionable microservice/FastAPI/ML/queue/GraphQL rewrite or unapproved paid production dependency. New dependencies need necessity, maintenance/license/security and existing-alternative justification.

Use the charter's ready/done definitions and mandatory whole-project health review after each major milestone before the next is authorized. Update CURRENT_STATUS, source index and affected current references in the delivery PR; link historical evidence instead of duplicating status. P0/P1 foundation defects require a bounded Stage 1.5 recommendation and separate execution authorization.
