# Without-Skill versus With-Skill protocol and results

**Actual paired runs: 0/3 samples (0/6 arms). Status: BLOCKED_AUTHENTICATION.**
No quality gain, activation accuracy, token overhead or task-completion advantage
has been measured. Do not interpret static checks or author-written Skills as
evidence that B outperforms A.

| Pair | Identical prompt source | A — without pilot instructions | B — Skill-enabled | Result |
| --- | --- | --- | --- | --- |
| UX workflow | UX-I02 in [case fixtures](EVALUATION_CASES.json) | No pilot metadata/body/map | Relevant UX Skill available | NOT_EXECUTED |
| Visual alternatives | VE-I01 in case fixtures | No pilot metadata/body/map | Relevant exploration Skill available | NOT_EXECUTED |
| Rendered QA | VQ-I02 in case fixtures | No pilot metadata/body/map | Relevant QA Skill available | NOT_EXECUTED |

## Reproducible isolation

Use two disposable directories/sessions exported from the **same recorded final
pilot commit**. Do not create competing implementation branches/PRs. Store the
evaluator fixture, oracle, rubrics, results, Skill bodies and prior traces
outside A's accessible inputs. Preserve identical application source, accepted
product references, AGENTS, task constraints and synthetic candidate in both
arms. Restore `CURRENT_STATUS.md` and `SOURCE_OF_TRUTH.md` from the pinned S1 base
in **both** exports so S1 status/index links do not expose treatment instructions.
Keep the fresh S1 report-only evaluation authorization in a common external task
envelope; old source status never overrides it.

From each export, remove `docs/skills-pilot/` except
`fixtures/ui-candidate.html`; remove `.agents/skills/` from A. In B restore only
the relevant Skill and its `docs/skills-pilot/REFERENCE_MAP.md`. These are the
declared treatment delta. Check for inherited user/admin/plugin copies of the
pilot Skills and disable/exclude them for A using the actual host's supported
configuration. Verify the absence from its host-provided catalog before the
task. If the host cannot isolate availability, mark the baseline contaminated
and do not score a paired result. Do not expose B's body in A's setup prompt or
use the same conversation for both arms.

Record the complete file hash inventories: outside the declared metadata/body/
reference-map delta, they must match. The runtime snapshot is equivalent; the
instruction-availability delta is explicit, not a claim of byte-identical inputs.
Keep evaluator tooling outside both task roots. For Cloud, use equivalent
ephemeral session preparation only when the host supports it; a normal branch
checkout that exposes the pilot package to A does **not** establish a clean
baseline. Local isolated exports are acceptable only as ACTUAL_LOCAL_CODEX,
never proof of hosted discovery.

Fix model ID/revision where available, reasoning effort, tool set, budgets,
permissions, environment, task constraints, synthetic state and rubric. Use the
same literal natural-language prompt; do not add `$skill` to B. Run the order
A→B for UX/QA and B→A for exploration to reduce a single fixed order effect;
sessions remain fresh and independent. Record unavoidable provider/model drift
or hidden host behavior as a comparability limitation. No settings are guessed
from this author's model identity.

## Capture and compare

Retain raw traces and final reports, then blind the arm labels for independent
review. [Method](EVALUATION_METHOD.md) defines the dimension rubric and hard
failures. Compare task quality, supported/incorrect findings, severity/evidence,
contract/policy adherence, RTL/mobile/accessibility, unauthorized changes, wall
time/tool calls and actual reported tokens. Report deltas per sample with raw
denominators, unavailable metrics, disagreements and no significance claims.
The [oracle](fixtures/ORACLE.json) is evaluator-only; real-artifact findings need
independent confirmation. A correct abstention on missing evidence is preferable
to fabricated completion, but abstention alone does not count as complete work.

## Current comparison evidence

[Cloud list and local probe](evidence/capability-probes.txt) failed with 401/token
refresh errors before any model task output. [Raw local events](evidence/codex-exec-probe.jsonl)
contain a thread start and failed turn only. They are capability evidence,
not A or B results. All outcome/overhead cells remain unmeasured. Required next
work is authenticated isolated sessions, six actual completed arms and blind
scoring. No simulated evaluation substitutes for them.
