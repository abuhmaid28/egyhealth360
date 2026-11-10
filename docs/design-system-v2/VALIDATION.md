# Design System V2 — validation truth and handoff boundaries

Scope: [Issue #102](https://github.com/abuhmaid28/egyhealth360/issues/102), [DS01–DS05 plan](BLUEPRINT.md), [authority/decision matrix](DECISION_AND_EVIDENCE_MATRIX.md). Delivery baseline/main: **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**; new branch `docs/102-design-system-v2-blueprint` starts there, not from Brand PR #101.

## Observed focused checks — 10 November 2026

- Existing CI-policy tests: **30/30 PASS**, zero skipped. The intentional invalid-SHA negative-control test prints a Git fatal diagnostic while its expected fail-safe assertion passes.
- Existing Markdown/classification/local-reference gate with actual base/candidate event: **959 references / 56 current-or-changed files PASS**; complete-range whitespace PASS. An initial index edit removed the sole R1 classification reference; its preserved historical link was restored before this result.
- Git path/blob/mode comparison: **all 1,423 base paths retained; 1,421 identical**, with only CURRENT_STATUS/SOURCE_OF_TRUTH summary exceptions; exactly three new Markdown files. No Brand branch content copied.
- **17 unique external GitHub targets resolved** in the three-file package. Color-audit blob verified as `53300351b7e860b29d4c806d73088bead2acc8d6`; all 96 historical records meet their recorded threshold. This verifies the pinned evidence, not new product contrast.
- Existing classifier selects **DOCS_GOVERNANCE**, docs-check required; five heavy lanes unselected. This is a local observed plan, not remote success. Latest baseline-main CI observed SUCCESS: [run 42165554605](https://github.com/abuhmaid28/egyhealth360/actions/runs/42165554605).

Independent review and final remote exact-head results are reported in the Draft PR after completion; they are not asserted by this pre-push record. Repeat commit-dependent checks on the final candidate.

## Evidence method

1. Re-read issue/latest applicable owner comments and check current main/open PRs before edits. #102 is open, initially has no comments; #101 remains Draft/Open/Unmerged at `687f94074c0ac4d45610546517ea6aa228d36183`. Owner comment `6761920764` controls AP02 acceptance over historical pending prose. No superseding applicable scope found.
2. Inspect actual accepted UX/IA/content and security/I1/I2/I3 references plus runtime/V1 inventory. Read pinned #101 color audit and font/material references through GitHub; retain immutable links, not copies. The color audit has 96 records; Brand file Git blob `53300351b7e860b29d4c806d73088bead2acc8d6`. Review selected table entries against their exact theme/selector/state/adjacency, not just a palette name.
3. Stage only the three new Markdown files here and minimal CURRENT_STATUS/SOURCE_OF_TRUTH reconciliation. Verify the complete base-to-candidate diff is exclusively these five paths. Compare Git blobs for every prior tracked path, allowing only those two summaries; this proves byte-identical runtime, schema/migrations/OpenAPI, dependencies/CI, contracts/assets and protected historical screenshots.
4. Run existing repository Markdown classification/local-reference checker against a GitHub-event fixture with the actual base/head, repository CI-policy tests and complete-range whitespace check. No Markdown formatter/linter dependency is added; the repository checker is the existing docs gate. Separately verify pinned GitHub URLs/files and authority comments. External link existence is distinct from owner approval.
5. Obtain a separate read-only reviewer pass over issue, authority, candidate documents and preservation/check results. Resolve material findings and re-review changed content before final sync. Record actual verdict/input fingerprints in the Draft PR handoff; no self-review is described as independent.
6. Push one final reviewed candidate and create **one issue-scoped Draft PR against main**. Inspect actual required remote jobs for that exact head, including classifier/validator disposition. Confirm remote head equals reviewed commit after CI and PR remains Draft/Open/Unmerged with auto-merge off. Report actual runs and any skips/failures rather than substituting #101's CI.

The final commit SHA, independent committed-input verification and remote CI result belong in the PR handoff, avoiding a self-referential commit SHA or a post-CI documentation commit. This file describes reproducible method and limits, not a premature remote PASS. The handoff must supply actual command results, changed-file inventory, reviewer verdict, run/job links and final base/head.

## Reproduce focused local gates

From repository root, with `BASE` set to the pinned main SHA and `HEAD_SHA` to the final candidate, write a temporary GitHub event JSON outside the repo with `pull_request.base.sha` / `pull_request.head.sha` (and `labels: []` for classification). Then run:

```sh
node --test tests/ci/*.test.mjs
GITHUB_EVENT_PATH=/tmp/eh360-102-event.json node scripts/ci/check-docs.mjs
git diff --check "$BASE" "$HEAD_SHA"
git diff --name-status "$BASE" "$HEAD_SHA"
```

Compare `git ls-tree -r` path/blob/mode inventories for base and candidate: every base path must remain with the same blob/mode except CURRENT_STATUS and SOURCE_OF_TRUTH; only the three named Markdown additions may appear. This checks all runtime and protected evidence without executing it. Existing CI classification determines selected lanes; do not invent a docs-only waiver or alter workflow paths to obtain Green.

## Claim boundaries and next owner action

| Evidence category | Honest disposition for this planning delivery |
| --- | --- |
| Docs completeness/authority/preservation | Subject to focused checks and independent verdict recorded on the final PR. Covers DS01–DS05 planning, not final design fitness. |
| Exact-head CI | Actual final run/jobs reported in PR; technical success alone cannot approve Product/UX/Brand/Design. |
| Browser, visual, responsive, contrast, AT and physical PWA tests on V2 | **NOT EXECUTED by this sprint.** DS05 is a future test plan; no V2 UI or new rendered specimen is created. #101's bounded historical evidence is referenced accurately. |
| AP03 / AP05 | **OPEN distribution/release gates.** Actual installed icon selection, physical devices/print and five Type3 warnings remain; underlying artwork/creator/trademark rights unverified. No docs-only blocker or legal clearance inferred. |
| Content time conflict / new visual choices | **OWNER GATE.** DSV2-01–05 identify dependent decisions and future authorization; no silent content amendment. |
| Runtime health/deployment | Prior accepted health/debt and current capability distinctions retained; no runtime/production test, hosted parity claim, migration, implementation, deployment or new health clearance. |

Delivery stops at **Product Owner review of the plan**. Suggested next approval is a bounded DS specification brief after plan review, not five final portal specs, frontend implementation or final Design System adoption. No merge, deployment, production change or ready-for-review transition.
