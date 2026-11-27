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

Each authorized task Issue records its scope, exact base, unique branch, current writer, allowed paths, dependencies, acceptance gates and approved retention route. Use one writer and a separate workspace per task branch. Independent tasks may run in parallel on disjoint paths with compatible interfaces. Coordinate shared schema, API, contracts and integration separately. Cross-lane path overlap or interface-contract changes require orchestration review and explicit scoped Product Owner authorization. Agents, accounts and models may change within the authorized lane. A reassignment carries the same limits.

Routine in-scope implementation, testing, fixes, saves and handoffs under an approved campaign require no repeated Product Owner approval. Scope expansion, clinical policy or architecture changes, integration merges, release or deployment, Live or PHI access and production changes require explicit authorization. Only the coordinator controls shared integration and `main` within that authorization. Preserve historical evidence and protected assets. In a docs/audit-only task, report runtime defects for separate authorization.

Use one final PR per authorized task when a PR is permitted. Keep checkpoints on the task branch and run the applicable CI for the final candidate as authorized. A checkpoint, final PR, technical CI result and merge or release are separate gates. Keep the PR open and unmerged when that is the authorized delivery state.

## Progress and handoff

Use 4–8 concrete checkpoints unless the task prescribes its own count. Report `Progress: X/Y — Z%` and `Current: <checkpoint>` for this task only. Derive percentage from completed checkpoints. Progress is informational and work continues without acknowledgment. 100% requires the assigned scope and required validation, including final remote CI when required, to be complete. Technical success does not constitute Product Owner acceptance.

## GitHub-first durable checkpoints — all agents, mandatory

GitHub is the durable shared record for authorized source, decisions and evidence. The standing permission below takes effect only after independent acceptance and explicit canonical activation of [G1](https://github.com/abuhmaid28/egyhealth360/issues/198). Until then, follow the existing task-specific authorizations.

1. **Approved private route.** After activation, a task or campaign may authorize screened WIP, source and evidence checkpoints once on explicitly approved task branches in the existing private EgyHealth 360 repository. Use ordinary commits and normal fast-forward pushes. Confirm the pinned base, current writer, exact remote, repository privacy and authorized branch before work and before a push. The checkpoint route excludes `main`, tags, other repositories and external transfers. No force push, destructive history rewrite, branch deletion, implicit merge or rebase, auto-merge, ready-for-review, or PR or CI trigger outside authorization. Issue [#174](https://github.com/abuhmaid28/egyhealth360/issues/174) is superseded only for this approved private retention route. External disclosure, release and other refs remain gated. Explicitly local-only tasks, including [#192](https://github.com/abuhmaid28/egyhealth360/issues/192) and [#196](https://github.com/abuhmaid28/egyhealth360/issues/196), require explicit task-specific supersession before any push. Verify the exact recoverable source and obtain explicit reconstruction approval if reconstruction is needed. Historical restrictions remain binding until expressly superseded.
2. **When to save.** Checkpoint each meaningful change, before long tests, at handoff or blocker, and before a context limit or workspace switch. Aim to save every 15–20 minutes when new changes exist. Save the first safe remote checkpoint before full regression. A WIP checkpoint records progress without a PASS or release claim.
3. **Screen and verify each push.** Stage only allowed paths. Inspect the actual diff and all newly reachable commits and assets for secrets, PII or PHI, unauthorized third-party material and out-of-scope configuration or workflows. Private access does not waive these restrictions. Recheck the retention route and integration state, then push only the exact authorized ref. Verify its remote SHA and readable source. Inspect available exact-head and branch CI, checks and deployment metadata, preserve existing aliases and report visibility gaps. Observations are point-in-time. Do not claim background monitoring.
4. **Stop on a blocker.** If remote storage is unavailable, ownership is unclear, or an unexpected event, exposure or material safety uncertainty arises, stop new implementation, preserve local work and promptly post a sanitized Issue receipt. Label source that could not be saved **SOURCE NOT BACKED UP TO GITHUB**. An Issue summary does not retain source. Avoid workarounds, unapproved transfers and silent accumulation of local-only changes.
5. **Record every checkpoint.** Post a concise, sanitized receipt on the task Issue with exact base, head and tree, branch, allowed and changed paths, completed and pending work, actual tests and provenance, design and reproduction references, blockers, next action and ownership state. At final handoff include immutable source and evidence links, the PR and actual CI when applicable, the independent review verdict and the outstanding decision. Keep enough sanitized design and reproducibility evidence at approved durable paths or explicitly approved independent storage. Local paths and Issue summaries alone are insufficient. Avoid transcript dumps and unnecessary reruns.
6. **Transfer the writer role.** The outgoing writer records an explicit release and the orchestrator records the successor assignment under the authorized campaign. After abrupt loss, reconcile the last remote head and verify the predecessor cannot continue before reassigning. Stop if that cannot be verified. The successor fetches the exact authorized branch and checks its remote head, scope and evidence before work. Reuse verified results and preserve the existing history. ChatGPT reads saved GitHub records during active review. No agent approves its own merge or deployment.

### Visual, QA, and provenance evidence rules (all agents, temporary and final)

1. **Evidence retention.** Keep applicable reviewed diffs, visuals, test and accessibility evidence, manifests and recovery receipts at approved durable paths or explicitly approved independent storage. Screen temporary design evidence using the same disclosure rules.
2. **Visual evidence.** Store approved-for-disclosure, sanitized original before/after PNGs under `docs/visual-evidence/<issue>/<candidate>/` or the canonical authorized path, with an index recording locale, viewport, theme, before/after HEAD and tree, PNG dimensions and SHA-256. Verify that authorized readers can open immutable commit-pinned evidence with authenticated private access. Public raw URLs are unnecessary. Never share signed or token-bearing links. Never regenerate or approximate evidence without explicit Owner instruction.
3. **QA and provenance.** Store sanitized test receipts with commands, exits, counts, original or rerun provenance, independent reviews and recovery proofs where applicable. Distinguish agent-reported, independently verified and not-run evidence. Reuse verified results.
4. **Sensitive evidence.** Keep PII, PHI, secrets, internal credentials, unredacted authentication payloads or logs, and unlicensed assets out of GitHub, including Issues and PRs. Large or sensitive evidence requires separate explicit approval for independent private storage, verified access and checksums. If evidence cannot be safely saved, report `SOURCE/EVIDENCE UNPUBLISHED` and preserve it locally. Do not bypass Issue #149.

Existing issue-specific deployment and Live restrictions take precedence. [F06/E2 #124](https://github.com/abuhmaid28/egyhealth360/issues/124) remains NO-GO until its own separately evidenced approval.

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
