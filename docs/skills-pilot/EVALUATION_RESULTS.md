# S1 evaluation results

**CLOUD_DISCOVERY_UNVERIFIED.** No Skill activation, task-quality improvement,
hosted usefulness or rollout readiness is established. Static package checks and
real local fixture rendering are distinct evidence streams.

| Evaluation | Executed | Result / evidence |
| --- | --- | --- |
| Workspace/R0 and duplicate-work search | Yes | No available original package/draft; [provenance](AUTHORIZATION.md) |
| Current Codex conventions review | Yes | Official documentation checked; [environment/source hash](evidence/environment.json) |
| Manifest syntax and exact three-candidate inventory | Yes | Restricted valid YAML + actual PyYAML parse; [focused checks](evidence/focused-checks.txt) |
| Descriptions/collision boundary review | Static only | Distinct descriptions and 42 declared target decisions; no empirical selection precision/recall |
| Reference paths, fixture structure/count and full scope allowlist | Yes | [Static output](evidence/static-checks.json); deterministic checks only |
| Author instruction/accepted-contract review | Yes | [Reference map](REFERENCE_MAP.md), preservation rules in all three bodies; author review, not independent certification |
| Repository documentation/policy checks | Yes | Actual local output retained in focused-checks.txt; final remote gates recorded in PR |
| Actual synthetic fixture browser rendering | Yes | 16 EN/AR × 320/390/768/1440 × 100/200% text captures and [measurements](evidence/browser/measurements.json) |
| Fresh Codex Cloud task preflight | Attempted | 401 Unauthorized; [capability evidence](evidence/capability-probes.txt); no hosted task created |
| Actual local Codex fallback preflight | Attempted | Token-refresh failure before model output; [raw events](evidence/codex-exec-probe.jsonl) |
| 42 trigger/boundary behavioral cases | **0/42** | NOT_EXECUTED; all observed activation/score fields null |
| Representative paired end-to-end samples | **0/3 (0/6 arms)** | NOT_EXECUTED; [comparison protocol](BASELINE_COMPARISON.md) |
| Simulated model evaluations | **0** | No simulated PASS or score substituted |
| Final required remote CI | PR handoff | Actual final SHA/run/job results must be recorded on the PR; previous SHA success is insufficient |

## Actual rendered fixture evidence

The [capture script](scripts/capture_fixture.py) serves only the synthetic fixture
over loopback HTTP using installed Playwright/Chromium. File navigation was
initially blocked by managed Chromium policy; loopback HTTP resolved it without
changing policy. An initial check incorrectly expected viewport overflow at
768px; measured geometry showed that width is within the viewport, so the
assertion was corrected to the actually overflowing 320/390px samples before
the complete final capture. No failed attempt is claimed as PASS.

The completed run records browser version, viewport, locale/direction, actual
element bounds, clipped dimensions, focused element/outline/shadow, input label
count, disabled semantics, dynamic feedback attributes and screenshot SHA-256.
The **six planted defect classes** are observable: fixed-row overflow at narrow
sizes (including negative-left RTL bounds), clipped next-step text, placeholder
without label, keyboard focus without visible outline/shadow, unavailable
styling without disabled semantics, and dynamic error without live/status or
recovery. These are known evaluation defects, not findings about the product.

Text enlargement changes the base font from 16px to 32px; it is not browser zoom.
Keyboard Tab and Enter are actual Playwright actions. Screenshots do not prove
screen-reader announcements, native-device behavior, cross-browser conformance
or WCAG certification. Browser results do not establish a Skill discovered or
found any defect. The evaluator oracle is excluded from all model task inputs.

## Behavioral results and remaining hosted work

| Hosted requirement | Actual state |
| --- | --- |
| Skill visibility/discovery | UNVERIFIED; no fresh authenticated hosted catalog |
| Explicit invocation | NOT_EXECUTED |
| Natural-language implicit invocation | NOT_EXECUTED |
| Adjacent-request non-invocation | NOT_EXECUTED |
| Instruction/reference loading | NOT_EXECUTED; author reads are not automatic loading evidence |
| Scope/security compliance | NOT_EXECUTED as model behavior; only static author assessment |

Activation TP/FP/FN/TN, precision/recall, task-completion quality, supported finding
accuracy, severity quality, contract adherence, RTL/mobile/accessibility coverage,
unauthorized-change rate and token/time overhead are **not measurable** from the
failed preflights. Zero observed unauthorized application changes in this author
worktree is a preservation check, not a model-regression score.

To remove CLOUD_DISCOVERY_UNVERIFIED, authenticate a fresh Codex Cloud environment
for this repository, check out the pilot's exact final head, retain host-provided
catalog/selection and loading traces, execute the 42 cases in fresh sessions,
then execute the three isolated paired samples/six arms and independently score
the reports. Record model, effort and tools before comparison. If catalog traces
remain inaccessible, keep that part unverified even if outputs look plausible.
Do not infer installation/usefulness from a manual file read or self-report.

No secrets, real patient data or raw credential files were collected. Local tool
versions differ from the repository's pinned Node/pnpm CI versions; focused
checks use no package installs/builds, and the unchanged remote workflow supplies
the required pinned runtime regression proof.
