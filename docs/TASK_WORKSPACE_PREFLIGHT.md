# Task Workspace Preflight & GitHub-First Freshness Guide

Status: **ADOPTION CANDIDATE — UNMERGED** (Issue `#205` / `G1.1 / G2-D2` and `G1.1-H` hardening, building on `#204` / `G2-D1`).

This guide and helper (`scripts/support/task-workspace-preflight.mjs`) remain an unmerged candidate until independently reviewed, validated in Linux CI, explicitly accepted by the Product Owner, and merged to `main`. No activation or merge is implied by Issue `#205` or its branch alone; until merged, existing canonical `AGENTS.md` and controlling `#198` amendments remain binding. This helper is explicitly invoked; it installs no git hooks, modifies no CI workflows, and never auto-remediates, auto-pushes, merges, or deploys.

> [!IMPORTANT]
> A `PASS_FOR_SOURCE_CHECK` result verifies point-in-time source freshness and isolation only. It **never** authorizes edits, commits, pushes, PR creation, merges, CI dispatch, or deployments, and it is not an atomic distributed lock. Always re-read live GitHub state immediately before any edit, claim, or push. When posting `--json` or CLI output to public GitHub Issues, pass `--redact-paths` (or redact `local.workspacePath`, `local.gitRoot`, dirty sample paths, and error output) so personal OS usernames/paths are never disclosed.

## Controlling Governance Reconciled (as of 2026-11-28)

1. **Canonical `AGENTS.md`** on `main` (`64cd6e9b9c00712e223366836d5763f49e8c1682` retains the pre-`#205` canonical baseline until `#205` is accepted and merged).
2. **Flexible Local Concurrency Amendment** ([#198 comment `7209748645`](https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209748645), [#204 comment `7209750713`](https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209750713)):
   - Supersedes the former one-Antigravity-Local slot limit in `AGENTS.md` without editing `AGENTS.md`.
   - Retains the overall cap of **4 concurrent implementation executors** (`<= 2` Codex Cloud, `<= 1` Antigravity Remote, **0 Codex Local**).
   - Permits **multiple Antigravity Local executors** within that cap of 4, provided each holds a separate authorized task, exclusive writer claim on its own task branch, dedicated isolated clone/worktree, isolated build/cache/DB/ports, and disjoint paths.
3. **Mandatory GitHub-Only Durable Handoff & Reporting** ([#198 comment `7209770604`](https://github.com/abuhmaid28/egyhealth360/issues/198#issuecomment-7209770604), [#204 comment `7209774584`](https://github.com/abuhmaid28/egyhealth360/issues/204#issuecomment-7209774584)):
   - GitHub is the sole durable source of truth — never leave essential source, design decisions, test receipts, reviews, or handoffs only in local workspaces or chat.
   - Persist screened task-branch commits frequently, verify remote SHA/tree readback, and post sanitized receipts directly on the task Issue so any successor or reviewer can inspect GitHub without manual log forwarding.
   - Where a compact durable evidence file is genuinely required beyond Issue comments, `7209770604`/`7209774584` provide a narrow additive exception for NEW screened evidence-only files under `docs/task-evidence/<issue-number>/` (or the canonical `docs/visual-evidence/<issue>/<candidate>/` path for cleared PNGs and hash indexes) on an already authorized task branch.
4. **Adoption & Merge Gates (Issue `#205` Candidate Status):**
   - Issue `#205` proposes minimal canonical synchronization of `#198` amendments in `AGENTS.md`, classification of this guide in `docs/SOURCE_OF_TRUTH.md`, workspace isolation hardening in `G1.1-H`, and full Linux CI validation (`scripts/ci/policy.mjs` classifies `scripts/support/*` and `tests/*` as `INFRASTRUCTURE`).
   - Actual adoption and activation take effect only after independent review, verified Linux CI evidence, separate explicit Owner acceptance, and merge to `main`.

## Staged Operation Ordering & Isolation Guarantees

`runPreflightWorkflow` and the CLI execute in four strict, fail-closed stages:

1. **Read-Only Observation:** Reads live GitHub repository/branch/issue metadata and runs `inspectLocalGitWorkspace` in strictly read-only `verify` mode (`GIT_OPTIONAL_LOCKS=0`, `GIT_TERMINAL_PROMPT=0`, `GIT_CONFIG_COUNT=0`, bounded timeouts, and case-insensitive stripping of all inherited `GIT_*` redirection/config-injection variables such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_COMMON_DIR`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, and `GIT_CONFIG_*`).
2. **Policy & Physical Containment Evaluation:** Verifies physical workspace root equality (`realpathSync.native` workspace root === Git top-level root, rejecting parent-repo subdirectory discovery and symlink/junction aliases), standalone clone isolation, peer `gitCommonDir` non-overlap, remote/push URL trust, clean worktree, authorized base/ancestry, explicit scope/claim, and strict executor concurrency counts.
3. **Pre-Side-Effect Recheck & Explicit Fetch (Optional `--mode fetch` Only):** Fetch **never** runs unless Stage 2 returned `PASS_FOR_SOURCE_CHECK`, an immediate Stage 3a re-read of live GitHub + local state still returns `PASS_FOR_SOURCE_CHECK` with zero state drift, the workspace is a verified standalone clone (`!isWorktree && worktreeCount === 1`) with verified non-overlapping peers, and every `--fetch-ref` is strictly `'main'` or the target `--branch`. Fetch uses non-force exact refspecs (`refs/heads/<ref>:refs/remotes/origin/<ref>`, `--no-tags`, `--no-prune`); wildcard refspecs, force updates, tags, pruning, checkout, pull, reset, clean, stash, push, and merge are never executed.
4. **Post-Operation Re-Verification:** After any permitted fetch, GitHub and local workspace state are re-read in read-only mode and re-evaluated; unexpected drift fails closed (`STATE_DRIFT_AFTER_FETCH`).

### Executor Count Convention

All concurrency flags (`--total-executors`, `--codex-cloud`, `--ag-remote`, `--ag-local`, `--codex-local`) are **required** finite nonnegative integers representing **projected active concurrent implementation executors including the selected `--executor-type` invoking preflight**. The classifier enforces:
- `totalExecutors === codexCloud + agRemote + agLocal + codexLocal` (exact equality; missing or mismatched counts never pass or permit fetch)
- `totalExecutors <= 4`, `codexCloud <= 2`, `agRemote <= 1`, `codexLocal === 0`
- Selected `--executor-type` has count `>= 1` in its corresponding category (`antigravity-local` requires `--ag-local >= 1`, `antigravity-remote` requires `--ag-remote >= 1`, `codex-cloud` requires `--codex-cloud >= 1`; `codex-local` is always `BLOCKED`).

## Exact Invocations

Default mode (`--mode verify`) is **strictly read-only**: no `fetch`, `pull`, `checkout`, `reset`, `commit`, `push`, or PR/CI actions. Always pass `--redact-paths` before sharing `--json` or text output on public Issues; pass `--historical-base` when the task's authorized base is an intentional non-`main` pin.

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
  --redact-paths `
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
  --redact-paths \
  --json
```

### Exit Codes
- `0`: `PASS_FOR_SOURCE_CHECK`
- `1`: CLI usage or argument validation failure (including negative or noninteger executor counts)
- `2`: `REVIEW_REQUIRED` (missing confirmation, missing/unknown concurrency or isolation inputs, base/policy drift, missing ancestry, local ahead, wrong ref)
- `3`: `BLOCKED` (unreachable GitHub, subprocess timeout, failed Git/peer inspection, closed issue, dirty workspace, parent-repo discovery / `WORKSPACE_NOT_GIT_ROOT`, behind/diverged branch, duplicate/untrusted/credentialed remote, workspace or shared `gitCommonDir` overlap, invalid/inconsistent/exceeded concurrency counts, selected executor absent from counts, cap exceeded, Codex local, disallowed fetch ref, pre/post-fetch state drift, active same-task writer)

## Scenario Matrix

| Scenario | Expected Classification / Action |
| --- | --- |
| **New task at `main`** | Target branch `ABSENT` on GitHub, local clean at verified `origin/main` SHA (`NEW_BRANCH_AT_BASE`) -> `PASS_FOR_SOURCE_CHECK` (when ownership & concurrency verified). |
| **New/resumed task on pinned historical base** | Pass `--historical-base`. Distinguishes intentional historical product pin from unapproved base drift (`NEW_BRANCH_AT_HISTORICAL_BASE` vs `BASE_DRIFT_FROM_MAIN`). |
| **Resume on existing task branch** | Target branch `EXISTS` on GitHub; local must match remote SHA (`CURRENT`) and include authorized base in ancestry. |
| **Stale local cache / checkout behind remote** | Local is `BEHIND` or at an old local `main` (`LOCAL_HEAD_NOT_AT_AUTHORIZED_BASE`) -> `BLOCKED`. Create a fresh isolated clone from official GitHub or let that branch's sole writer reconcile explicitly. |
| **Dirty workspace** | `DIRTY_WORKSPACE` -> `BLOCKED`. Preserve existing uncommitted work untouched; never run `git reset --hard`, `clean`, or `stash`. |
| **Subdirectory / symlink alias / shared peer common-dir** | `WORKSPACE_NOT_GIT_ROOT`, `WORKSPACE_PATH_OVERLAP`, or `SHARED_GIT_COMMON_DIR_WITH_PEER` -> `BLOCKED` with zero fetch calls. |
| **Incomplete or inconsistent executor counts** | Missing count -> `REVIEW_REQUIRED` (`CONCURRENCY_COUNTS_UNKNOWN`); negative/noninteger/mismatched sum/missing selected executor -> `BLOCKED` with zero fetch calls. |
| **Active writer (same task vs concurrent disjoint task)** | Same-task active predecessor without release -> `BLOCKED` (`ACTIVE_PREDECESSOR_ON_SAME_TASK`). Concurrent disjoint local task within cap of 4 and isolated workspace/resources -> permitted under `7209748645` / `7209750713`. |
| **Missing / unreachable GitHub source** | `GITHUB_*_UNREACHABLE` / `GITHUB_SUBPROCESS_TIMEOUT` -> `BLOCKED`; missing local objects -> `REVIEW_REQUIRED` (`MISSING_*_ANCESTRY`). Never returns `PASS_FOR_SOURCE_CHECK` or permits fetch. |

## Remaining Manual Verification Boundaries

- **Issue claim & authorization:** Reading the GitHub Issue, verifying Owner acceptance comments, and checking competing active writers remain manual/coordinator responsibilities; `--confirm-scope` and `--claim-holder` record explicit human/executor attestation, not cryptographic proof.
- **Disjoint paths & external runtime resources:** `--isolated-resources` and `--disjoint-paths` attest that separate ports, databases, build caches, and file allowlists are configured; the helper inspects Git paths and peer directories, not live database ports or container state.
- **Canonical adoption:** Requires independent review, full Linux CI (`ubuntu-24.04`, Node `24.21.0`), explicit Owner acceptance, and merge to `main`.

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
8. **Re-read remote & release cleanly at handoff:** Re-verify remote HEAD/tree/CI state and post final GitHub handoff + explicit writer release on the Issue. Adoption and canonical activation require separate explicit Owner acceptance and merge to `main`.
