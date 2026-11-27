# Task Workspace Preflight & GitHub-First Freshness Guide

Status: **OPT-IN CANDIDATE** (Issue `#204` / `G2-D1`).

Until separately reviewed and accepted by the Product Owner, **canonical G1 manual preflight remains binding**. This helper (`scripts/support/task-workspace-preflight.mjs`) is explicitly invoked; it installs no git hooks, modifies no `AGENTS.md` or CI workflows, and never auto-remediates, auto-pushes, merges, or deploys.

> [!IMPORTANT]
> A `PASS_FOR_SOURCE_CHECK` result verifies point-in-time source freshness and isolation only. It **never** authorizes edits, commits, pushes, PR creation, merges, CI dispatch, or deployments, and it is not an atomic distributed lock. Always re-read live GitHub state immediately before any edit, claim, or push. When posting `--json` output to public GitHub Issues, pass `--redact-paths` (or redact `local.workspacePath` and `local.gitRoot`) so personal OS usernames/paths are never disclosed.

## Controlling Governance Reconciled (as of 2026-11-27)

1. **Canonical `AGENTS.md`** on `main` (`407ca42b8b1f71bf9020367d581124b95989df57`, blob `8f4642868f6147411e3e6e03582d95540872a2e9`).
2. **Flexible Local Concurrency Amendment** ([#198 comment `7209748645`](https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209748645), [#204 comment `7209750713`](https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209750713)):
   - Supersedes the former one-Antigravity-Local slot limit in `AGENTS.md` without editing `AGENTS.md`.
   - Retains the overall cap of **4 concurrent implementation executors** (`<= 2` Codex Cloud, `<= 1` Antigravity Remote, **0 Codex Local**).
   - Permits **multiple Antigravity Local executors** within that cap of 4, provided each holds a separate authorized task, exclusive writer claim on its own task branch, dedicated isolated clone/worktree, isolated build/cache/DB/ports, and disjoint paths.
3. **Mandatory GitHub-Only Durable Handoff & Reporting** ([#198 comment `7209770604`](https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209770604), [#204 comment `7209774584`](https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209774584)):
   - GitHub is the sole durable source of truth — never leave essential source, design decisions, test receipts, reviews, or handoffs only in local workspaces or chat.
   - Persist screened task-branch commits frequently, verify remote SHA/tree readback, and post sanitized receipts directly on the task Issue so any successor or reviewer can inspect GitHub without manual log forwarding.
   - Where a compact durable evidence file is genuinely required beyond Issue comments, `7209770604`/`7209774584` provide a narrow additive exception for NEW screened evidence-only files under `docs/task-evidence/<issue-number>/` (or the canonical `docs/visual-evidence/<issue>/<candidate>/` path for cleared PNGs and hash indexes) on an already authorized task branch.
4. **Adoption & Merge Gates (Opt-In Candidate Status):**
   - Future adoption or merge of this tool requires separate explicit Owner approval, classifying `docs/TASK_WORKSPACE_PREFLIGHT.md` in `docs/SOURCE_OF_TRUTH.md` (so `scripts/ci/check-docs.mjs` passes), and full CI validation (`scripts/ci/policy.mjs` classifies `scripts/support/*` and `tests/*` as `INFRASTRUCTURE`).

## Exact Invocations

Default mode (`--mode verify`) is **strictly read-only**: no `fetch`, `pull`, `checkout`, `reset`, `commit`, `push`, or PR/CI actions.

### Windows (PowerShell)

```powershell
node scripts/support/task-workspace-preflight.mjs `
  --issue 204 `
  --branch task/g2-d1-workspace-preflight `
  --base 407ca42b8b1f71bf9020367d581124b95989df57 `
  --workspace "C:\work\EgyHealth360-G2-D1" `
  --confirm-scope `
  --claim-holder "antigravity-local-2" `
  --executor-type antigravity-local `
  --total-executors 4 --codex-cloud 1 --ag-remote 1 --ag-local 2 --codex-local 0 `
  --same-task-active-writer false --isolated-resources true --disjoint-paths true `
  --peer-workspace "C:\work\EgyHealth360-G2-Q1" `
  --json
```

### Linux (`bash`)

```bash
node scripts/support/task-workspace-preflight.mjs \
  --issue 204 \
  --branch task/g2-d1-workspace-preflight \
  --base 407ca42b8b1f71bf9020367d581124b95989df57 \
  --workspace "/home/antigravity/work/g2-d1-workspace-preflight" \
  --confirm-scope \
  --claim-holder "antigravity-remote-1" \
  --executor-type antigravity-remote \
  --total-executors 4 --codex-cloud 1 --ag-remote 1 --ag-local 2 --codex-local 0 \
  --same-task-active-writer false --isolated-resources true --disjoint-paths true \
  --json
```

### Exit Codes
- `0`: `PASS_FOR_SOURCE_CHECK`
- `1`: CLI usage or argument validation failure
- `2`: `REVIEW_REQUIRED` (missing confirmation, unknown concurrency/isolation, base/policy drift, missing ancestry, local ahead, wrong ref)
- `3`: `BLOCKED` (unreachable GitHub, closed issue, dirty workspace, behind/diverged branch, duplicate/untrusted/credentialed remote, workspace overlap, cap exceeded, Codex local, active same-task writer)

## Scenario Matrix

| Scenario | Expected Classification / Action |
| --- | --- |
| **New task at `main`** | Target branch `ABSENT` on GitHub, local clean at verified `origin/main` SHA (`NEW_BRANCH_AT_BASE`) -> `PASS_FOR_SOURCE_CHECK` (when ownership & concurrency verified). |
| **New/resumed task on pinned historical base** | Pass `--historical-base`. Distinguishes intentional historical product pin from unapproved base drift (`NEW_BRANCH_AT_HISTORICAL_BASE` vs `BASE_DRIFT_FROM_MAIN`). |
| **Resume on existing task branch** | Target branch `EXISTS` on GitHub; local must match remote SHA (`CURRENT`) and include authorized base in ancestry. |
| **Stale local cache / checkout behind remote** | Local is `BEHIND` or at an old local `main` (`LOCAL_HEAD_NOT_AT_AUTHORIZED_BASE`) -> `BLOCKED`. Create a fresh isolated clone from official GitHub or let that branch's sole writer reconcile explicitly. |
| **Dirty workspace** | `DIRTY_WORKSPACE` -> `BLOCKED`. Preserve existing uncommitted work untouched; never run `git reset --hard`, `clean`, or `stash`. |
| **Active writer (same task vs concurrent disjoint task)** | Same-task active predecessor without release -> `BLOCKED` (`ACTIVE_PREDECESSOR_ON_SAME_TASK`). Concurrent disjoint local task within cap of 4 and isolated workspace/resources -> permitted under `7209748645` / `7209750713`. |
| **Missing / unreachable GitHub source** | `GITHUB_*_UNREACHABLE` -> `BLOCKED`; missing local objects -> `REVIEW_REQUIRED` (`MISSING_*_ANCESTRY`). Never returns `PASS_FOR_SOURCE_CHECK`. |

## Dated Historical Branch Examples (2026-11-27 — Do Not Hardcode)

These examples reflect point-in-time observations on `2026-11-27` to illustrate intentional historical bases vs `main`. Always re-resolve live GitHub refs before work:
- **Canonical `main` (2026-11-27):** `407ca42b8b1f71bf9020367d581124b95989df57` (G1 active).
- **`#201` (`task/g2-b1-dark-foundation`):** Pinned historical base `#155` (`8c6ea2682fad7da4a3b687bae7a57a87611f25ac`); observed checkpoint head `68c141dc79c40a4bf48afacbdaa375da7cb68a8f`.
- **`#202` (`task/g2-f1-frontend-v2`):** Pinned historical base `#158` (`42bfcfbe0f4ba4b3b14408befbc1545f1c9c668a`); observed checkpoint head `07c777d47daa50d2e9163eda8b55d517ff3bfbae`.
- **`#203` (`task/g2-q1-f06-auth-diagnostic`):** Pinned historical harness base `781e92bffea26f79c5a89abab79158072383feda` (app pin `94f3b75476a43ac0118665aecf75a2ce471190b0`); observed checkpoint head `c0bb7ba947ee390c0e232f0d63d4deea70280f66`.

## Future-Agent Preflight Checklist

1. **Read latest canonical `main` rules:** Fetch/read `AGENTS.md`, `docs/CURRENT_STATUS.md`, `docs/FOUNDATION_CHARTER.md`, and `docs/SOURCE_OF_TRUTH.md` directly from GitHub `main` — never rely on stale local `main` copies or chat memory.
2. **Read latest Issue & controlling Owner amendments:** Check the target Issue, `#198`, and `#200` comments for superseding rules (including `7209748645` / `7209750713` on local concurrency and `7209770604` / `7209774584` on GitHub-only durable reporting); reconcile stale wording instead of blindly enforcing superseded limits.
3. **Verify concurrency & resource isolation:** Confirm total active implementation executors `<= 4` (`<= 2` Codex Cloud, `<= 1` Antigravity Remote, `0` Codex Local), confirm no active un-released writer on the same task, and confirm dedicated isolated clone/worktree, build/cache/temp paths, DB/ports, and disjoint file paths.
4. **Resolve authorized branch & pinned base:** Confirm exact branch name and whether base is current `main` or an intentional pinned historical base (`--historical-base`).
5. **Run read-only freshness & origin check:** Verify clean workspace, trusted single `origin`, exact remote SHA/absent state, and ancestry (`node scripts/support/task-workspace-preflight.mjs ...`). Preserve any dirty/predecessor work untouched.
6. **Record exclusive writer claim on GitHub Issue:** Post claim with verified base/head/tree and isolated workspace confirmation before editing any file.
7. **Implement & screen checkpoints continuously:** Stage only allowlisted paths, screen diffs and newly reachable git objects for secrets/PII/PHI/unlicensed assets, push screened commits to the exact authorized task branch, verify remote SHA/tree readback, and post sanitized Issue receipts directly on GitHub.
8. **Re-read remote & release cleanly at handoff:** Re-verify remote HEAD/tree/CI state and post final GitHub handoff + explicit writer release on the Issue. Future adoption/merge of this opt-in helper requires separate explicit Owner review and approval.
