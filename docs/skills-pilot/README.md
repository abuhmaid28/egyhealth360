# S1 repository Skills pilot

**Evaluation candidates only. No production rollout or design approval.**
This package implements the Product Owner's submitted **7 November 2026 S1
Repository-Scoped Skills Pilot** authorization. [Scope record](AUTHORIZATION.md).
The original R0 package and its 42 cases were **not found**; these fixtures are
explicitly **RECONSTRUCTED_S1_NOT_RECOVERED_R0**.

| Candidate | Responsibility | Selection boundary |
| --- | --- | --- |
| [eh360-ux-review](../../.agents/skills/eh360-ux-review/SKILL.md) | Independent evidence-based role/workflow usability review | Task clarity, navigation, forms, recovery and continuity; report only |
| [eh360-visual-exploration](../../.agents/skills/eh360-visual-exploration/SKILL.md) | Differentiated comparable proposals within an explicit exploration brief | Candidate composition/rationale; no final choice or production implementation |
| [eh360-visual-qa](../../.agents/skills/eh360-visual-qa/SKILL.md) | Bounded rendered/specification comparison | Responsive/RTL/type/focus/state measurements; report only |

All three use a [progressive reference map](REFERENCE_MAP.md) rather than copying
project contracts. No other or deferred Skill is added. Current Codex
[Agent Skills conventions](https://developers.openai.com/codex/skills) were checked
on 7 November: repository `.agents/skills/<name>/SKILL.md`, required YAML name and
description, instruction-only by default, metadata-first progressive loading,
explicit `$skill-name` and implicit description-based invocation. Optional
`agents/openai.yaml` is unnecessary: implicit invocation defaults to enabled.
Host compatibility and useful selection still require runtime proof.

**CLOUD_DISCOVERY_UNVERIFIED.** Actual Cloud task listing and a separate local
Codex probe failed authentication. A manually opened Skill file is not discovery.
Zero of 42 behavioral cases and zero of three paired samples have run. No
activation/quality/token scores are reported. Actual local Chromium fixture
measurements are available and clearly separate from Skill execution.

Read [method](EVALUATION_METHOD.md), [42 structured cases](EVALUATION_CASES.json),
[results](EVALUATION_RESULTS.md), [paired comparison](BASELINE_COMPARISON.md),
and [pilot decision](PILOT_DECISION.md). [Evidence](evidence/) contains sanitized
capability failures, environment metadata, real fixture captures/measurements,
and focused static validation. Exact final head and its CI run belong in the PR
handoff, avoiding a self-referential evidence commit.

## Reproduce focused checks

Run from the repository root:

```sh
python docs/skills-pilot/scripts/validate.py
node --test tests/ci/*.test.mjs
node scripts/ci/check-docs.mjs
git diff --check 5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3
```

The static validator accepts a deliberately narrow valid YAML subset and checks
metadata, exact candidate inventory, references, all case fields/counts and the
complete changed-file allowlist. It does not emulate Codex selection or assess
model behavior. PyYAML was also used for an actual local YAML parse without
adding a repository dependency. The repository checker additionally validates
current/changed Markdown anchors and source-index classification.

For real fixture rendering with an **existing** Python Playwright installation
and Chromium:

```sh
python docs/skills-pilot/scripts/capture_fixture.py
```

In this managed environment the installed interpreter is
`/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin/python`;
Chromium is `/usr/bin/chromium` (override with `CHROMIUM_PATH` if needed).
No install, package/lockfile edit or paid service is required. This renders only
an intentionally defective synthetic fixture. It is not an application test,
Skills invocation, hosted session, device test or WCAG certification.

The unchanged classifier selects DOCS_GOVERNANCE + INFRASTRUCTURE +
SECURITY_HIGH_RISK (the authorization-record filename matches its security
path rule), requiring full regression. [Actual local plan](evidence/ci-plan.json).
Do not
substitute focused checks for the final PR's actual required remote CI.

Keep the single pilot PR **OPEN / UNMERGED / AUTO-MERGE OFF**. PR #86 remains
open and its H/P visual proposals unselected. No final design/system, clinical,
runtime, infrastructure, deployment or protected-domain decision is supplied.
