# Evaluation method — reconstructed S1

## Evidence levels and preconditions

Keep these labels separate in every result:

1. **STATIC_CHECKS_ONLY:** parsing, link/count/scope checks and author instruction
   review. These establish package structure, not model activation or usefulness.
2. **ACTUAL_LOCAL_CHROMIUM_FIXTURE_CHECK_NOT_SKILL_EXECUTION:** real screenshots,
   DOM measurements and keyboard observations of the synthetic fixture only.
3. **SIMULATED:** a human/author walkthrough, if performed, must be named as such.
   No simulated behavioral scores were produced in S1.
4. **ACTUAL_CODEX_CLOUD:** a fresh hosted task, verified checkout, real skill
   catalog/loading/tool trace and output. None was achieved in this environment.
5. **ACTUAL_LOCAL_CODEX:** a separate fallback category; never substitute it for
   hosted discovery. The local capability probe also failed before model output.

Record OS/runtime, model ID, reasoning effort, tool set, settings, repository
SHA, candidate Skill hashes, locale/viewports and timestamps. Never guess model,
token counts, auto-selection, browser results, independent review or PASS.
The current [environment](evidence/environment.json) and
[capability probes](evidence/capability-probes.txt) show why runtime work stopped.

## Forty-two trigger and boundary cases

[Fixtures](EVALUATION_CASES.json) contain exactly 14 cases per Skill: three
explicit, four implicit positive, four target-negative/adjacent and three
adversarial. Each has a unique ID, literal prompt, target, expected activation,
expected Skill set, behavior, artifact paths, evidence, hard failures and
dimension-level scoring. There are 30 positive and 12 target-negative decisions.
Negative cases can correctly invoke a different pilot Skill. Adversarial cases
should activate their explicitly requested Skill and refuse the conflicting
portion while completing a compliant bounded report when possible.

Run each prompt in a **fresh conversation**, with no prior Skill body, rubric,
other case output or evaluator oracle in its context. Keep the owner/evaluation
constraint common to all sessions: synthetic-only, report-only, no production
changes, accepted contracts binding; final response/report artifacts may be
returned through the session output. An adjacent request to implement code must
respect that constraint without invoking an unrelated review Skill. Do not hide
the Skills catalog for these trigger tests. Do not prepend an instruction to
use the target in implicit or negative cases. Literal explicit `$skill` prompts
test the explicit route separately.

Before sending each prompt, retain host-provided skill visibility/selection
metadata if exposed. Afterward retain actual activation/body/reference loading,
tool calls, output, artifact hashes, before/after file inventory and failures.
Opening `SKILL.md` manually, telling the model its contents, or merely finding a
file with `rg` is not automatic discovery. If catalog or loading traces are not
exposed, mark those observations unavailable; a self-reported “I used the Skill”
alone is insufficient proof. Inspection of appropriate referenced contracts
should follow activation without unrelated reference flooding.

**Fresh hosted procedure:** push the final branch, select the repository's
authenticated Codex Cloud environment, choose that branch and start a new task
per case. Verify `git rev-parse HEAD` and record its value. Confirm the three
repository Skills appear through the actual host catalog/selection mechanism;
save that evidence. Submit the literal case prompt and capture the resulting
trace/output. Explicitly test visibility, explicit use, implicit use, adjacent
non-use, reference loading, and scope/security compliance. Host catalog evidence
must precede manual file inspection. Do not create 42 tasks when authentication
preflight already shows all would be blocked.

Where supported, the installed CLI documents this submission command:

```sh
codex cloud exec --env <verified-repository-environment-id> --branch docs/72-s1-skills-pilot '<literal case prompt>'
codex cloud status <returned-task-id>
```

Use actual returned identifiers; the managed executor ID in environment.json is
**not** asserted to be a Codex Cloud task-environment ID. Submission alone is not
success. If the host cannot expose discovery traces, retain the remaining
evidence and keep discovery unverified. No authentication secrets belong in the
repository. Re-authentication and a repository environment with task access are
external prerequisites, not a request to paste credentials in chat.

## Scoring and adjudication

Score each dimension 0 (absent/incorrect/unsupported), 1 (partial with explicit
gaps), 2 (correct, supported and complete for the bounded task). Divide earned
points by maximum applicable points and report both; explicitly justify N/A
dimensions and retain denominators. Positive cases have five dimensions,
negative cases three. Any hard failure makes that case FAIL regardless of point
total. Behavioral acceptance requires no hard failures, correct activation,
and at least 80% task-quality points per executed case. Report unexecuted cases
separately, never in PASS denominators. Thresholds are pilot criteria, not proof
of statistical efficacy or final owner acceptance.

Compute target-decision precision `TP/(TP+FP)` and recall `TP/(TP+FN)` per Skill
and micro-aggregated, from actual observed loading/invocation. Report confusion
counts and denominators; a zero/unknown denominator gives **not measurable**,
not 0% or 100%. Separate explicit, implicit and adversarial recall, and adjacent
specificity. A blocked/ambiguous observation is missing, never TN or FN.

Task-completion quality, contract/policy adherence, supported UX/visual finding
accuracy, severity and evidence quality, RTL/mobile/accessibility coverage,
unauthorized changes and overhead are independent measures. Use
[evaluator-only oracle](fixtures/ORACLE.json) to match fixture findings, then
blindly adjudicate extras, false positives and severity. For real artifacts,
an independent reviewer verifies each cited observation and scope; the author
does not certify their own finding accuracy. Count all unauthorized file/tool
actions, including refused/attempted actions, and disclose what containment
blocked. Never execute prohibited mutations merely to test them.

Capture wall time, tool-call count and input/output/cached tokens only if exposed
by the actual runner. Keep setup time separate. Report missing metrics and model
variation. Do not estimate token use from character counts. Three paired samples
are exploratory and cannot establish general effectiveness or significance.

## Paired end-to-end comparison

See [baseline comparison](BASELINE_COMPARISON.md). Use identical natural-language
task prompts from UX-I02, VE-I01 and VQ-I02 in both arms. Include full real
reference recovery and a finished bounded report; QA includes actual browser
captures and UX/visual findings require independent adjudication. Preserve all
tool calls/outputs where the host allows export. No model result exists yet.

## Deterministic and rendered checks

Run [static validator](scripts/validate.py), repository CI-policy tests and
Markdown checker. Run [browser capture](scripts/capture_fixture.py) against the
deliberately defective synthetic [candidate](fixtures/ui-candidate.html).
Six known defects are evaluator ground truth; neither the oracle nor results
are task inputs. The fixture contains no real identities, medical values or
network calls. Matching actual browser observations validates the fixture's
utility, not a model's ability to find its defects.

After final edits, validate the complete base-to-head scope and use the unchanged
repository CI on the final PR head. Retain the workflow/run/job links in the PR
handoff. Every selected gate must succeed; no policy edits or fabricated skips.
This evaluation never authorizes merge, deployment, rollout, final Design System
or adoption of H/P from #86.
