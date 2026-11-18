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

Use one issue-scoped branch and one coherent PR per **authorized implementation lane**. The Product Owner explicitly authorizes **two independent parallel agents**: Codex owning Frontend V2/Visual Recovery/Synthetic Demo and Antigravity Remote owning separately approved Backend/F06/E2 readiness. The agents must have distinct workspace/branch ownership, exact pinned base and disjoint changed-file allowlists. Neither agent may edit the other's branch, overwrite uncommitted work, merge/rebase its candidate, or silently integrate its work. Any overlap or interface-contract change requires orchestration review and a new explicit scoped Owner decision. Additional parallel agents, broad scope changes and parallel PRs on the **same task** remain disallowed unless separately approved. No unrelated cleanup, dependency churn or architecture rewrite.

Complete the authorized loop: implement/document → focused validation → diagnose → final candidate → PR → required CI → Green. Continue through routine technical problems inside authorized scope. In a docs/audit-only sprint, record runtime defects and remediation recommendations; do not fix them without separate authorization. Stop only for a genuine missing owner decision or an external blocker that cannot be resolved within scope. Do not merge, promote production or enable auto-merge without explicit authorization.

Avoid an early PR that triggers expensive CI on each intermediate edit. Prefer one final sync with stable main when needed; do not overwrite user work. Keep historical evidence at its existing paths and preserve protected screenshots/assets.

## Progress and handoff

Use 4–8 concrete checkpoints unless the task prescribes its own count. Report `Progress: X/Y — Z%` and `Current: <checkpoint>` for this task only. Derive percentage from completed checkpoints. Progress is informational; continue without waiting for acknowledgment. 100% requires the assigned scope and required validation, including final remote CI when required, to be complete.

Handoff with PR, exact base/head, scope/changed files, evidence, actual CI, debt/blockers and independent-review verdict. Never equate technical Green with Product/UX/Design approval. Keep the PR open/unmerged when that is the authorized delivery state.

## GitHub-first durable checkpoints — all agents, mandatory

This is a permanent execution requirement, not a message or chat-history preference. It applies to Codex, Antigravity Remote, ChatGPT orchestration and future repo-aware coding agents. GitHub is authoritative for published source, decisions and evidence.

1. **Start:** Read this `AGENTS.md` and the latest authorized Issue/PR. Verify the target repo, remote/ref/HEAD, active scope and file-ownership separation before work. Never assume another agent's unpublished local files are present.
2. **During work:** At meaningful milestones, before a context/session limit, and at final handoff, post a concise **sanitized** result directly to the task's existing GitHub Issue (or PR when appropriate). Include exact base/head/tree/hash if available, changed-file inventory, actual tests/evidence, blockers, current GO/NO-GO and next action. Avoid redundant status spam.
3. **Authorized source work:** Maintain recoverable local commits at coherent checkpoints on a dedicated issue-scoped branch. After verifying **publication safety and exact owner permission**, push checkpoints to that branch and update its Draft PR; never push directly to `main` or integrate another agent's branch. Do not trigger CI, automatic deployment, merge or Ready state outside explicit permitted scope.
4. **If publication is blocked:** Preserve local source/patches, post the safe decision receipt to the GitHub Issue immediately and label **SOURCE NOT BACKED UP TO GITHUB**. An Issue receipt is not a backup of source. Do not bypass deployment-safety gates by disguising source code as an Issue comment, using another Git remote, or splitting writes into unexpected routes. If unpublished source may be lost, request a bounded approved secure-transfer or publication path.
5. **Safety:** Never write secrets, tokens, unredacted authentication payloads, PHI, private evidence or unauthorized third-party assets to the public GitHub repository, Issues or PRs. Preserve all accepted security, clinical, privacy and release restrictions.
6. **Handoff:** Always return a durable GitHub Issue/PR link, exact published commit SHA (or explicitly `UNPUBLISHED`), a short verified outcome and outstanding decision. The Product Owner must not have to paste the whole agent transcript into ChatGPT.
7. **Orchestration:** ChatGPT reads saved GitHub records directly during active chats. None of the agents may claim background/asynchronous ChatGPT review or silently approve its own merge/deployment. Each agent maintains only its authorized lane.

Existing issue-specific deployment/Live restrictions take precedence. F06/E2 remains NO-GO until its own separately evidenced approval.

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
