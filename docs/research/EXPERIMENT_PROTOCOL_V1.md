# EgyHealth 360 — Formal Experiment Protocol V1

## Protocol status
PRE-REGISTERED DESIGN DRAFT — implementation may clarify file formats and exact concept codes, but must not silently change the research question, primary outcome, holdout policy, or corruption logic.

## 1. Study objective
Evaluate whether an evidence-aware, deterministic care-closure engine reduces false hypertension follow-up gap classifications when longitudinal records are incomplete, compared with coverage-blind gap detection.

The experiment evaluates software behavior on synthetic longitudinal records. It is not a clinical trial and does not claim real-world clinical validation.

## 2. Research questions

### RQ1 — primary
Under controlled record incompleteness, does EACCE reduce false `TRUE_GAP` classifications relative to coverage-blind detection?

### RQ2
How do false-gap rate, true-gap recall, abstention rate, and decision coverage change as missingness increases?

### RQ3
How much of EACCE's behavior is attributable specifically to record-coverage awareness rather than to event normalization/evidence matching?

### RQ4 — robustness
What happens when missingness is silent and the engine is not given coverage metadata that reveals the record is incomplete?

## 3. Clinical rule under evaluation
Primary rule: `CR-HTN-FU-001 — Controlled uncomplicated hypertension follow-up`.

Source and machine interpretation are defined in:
- `CLINICAL_RULE_SOURCE_AUDIT.md`
- `CLINICAL_RULE_CATALOG_V1.md`

No experiment may silently modify the rule threshold, applicability, or follow-up boundary.

## 4. Study design
Paired synthetic benchmark.

For every benchmark case:
1. Build a complete synthetic longitudinal record.
2. Select one eligible index care-action case.
3. Derive ground truth from the complete record.
4. Produce corrupted observed versions of the same case.
5. Give the identical observed input to each compared method.
6. Compare predictions against the hidden complete-record ground truth.

The same corrupted case must be reused across methods. Regenerating separate corrupted inputs for different methods is prohibited.

## 5. Synthetic data source

### Generator
Synthea.

### Frozen baseline version
- release tag: `v4.0.0`
- release commit: `0185c09`
- export format: HL7 FHIR R4

Do not use `master-branch-latest` for final results.

### Reproducibility metadata
Each generation run must record:
- Synthea tag;
- Git commit SHA;
- generator artifact SHA-256 if a built artifact is used;
- Java runtime version;
- complete generation command;
- configuration file hash;
- simulation seed;
- simulation date/end-time configuration;
- FHIR export settings;
- generated patient count;
- eligible case count.

Reason: downstream reports must not rely only on a self-reported version string from the generated artifact.

## 6. Why FHIR R4 is the benchmark input
- aligns with the project FHIR-adapter architecture;
- preserves typed longitudinal resources and relationships better than a simplified ad-hoc table export;
- Synthea officially supports FHIR R4;
- prevents the research pipeline from depending on product database rows as its source of truth.

FHIR is an interchange/input layer. The product database is not a raw FHIR database.

## 7. Benchmark unit of analysis
One care-action case per synthetic patient.

Using one index case per patient avoids treating multiple highly correlated actions from the same synthetic patient as independent observations in the primary benchmark.

## 8. V1 eligibility
A patient can contribute a benchmark case only if all required eligibility facts are present in the complete synthetic record:
- age >= 18 at index assessment;
- non-pregnant at index;
- hypertension diagnosis present;
- no known CVD;
- no diabetes mellitus;
- no chronic kidney disease;
- alive through the action due boundary;
- at least one qualifying controlled BP assessment;
- sufficient future complete-record horizon to determine whether the expected follow-up was completed by the due boundary.

If a required applicability fact is unavailable, the patient is not silently assumed eligible.

Exact versioned FHIR code/concept sets used for HTN, CVD, diabetes, CKD, pregnancy, BP, and encounter matching must be frozen before final holdout generation.

## 9. Index-event selection
For each eligible patient, select the earliest qualifying controlled BP assessment that occurs after the hypertension diagnosis and has enough subsequent complete-record horizon to evaluate the +6 month due boundary.

If multiple BP observations occur at the same timestamp/encounter, the adapter must deterministically choose the validated BP panel/measurement representation according to a versioned normalization rule.

## 10. Expected care action
From index time `t0`:
- recommended-window start: `t0 + 3 calendar months`;
- due boundary: `t0 + 6 calendar months`;
- action: hypertension BP reassessment/follow-up.

For primary care-gap evaluation, the action is considered overdue only after the +6 month boundary.

## 11. Ground-truth construction
Ground truth is built from the complete record before corruption.

### Ground-truth positive
`TRUE_GAP` if no qualifying follow-up encounter with associated BP assessment is present after `t0` and on/before the due boundary.

### Ground-truth negative
`COMPLETED` if at least one qualifying follow-up encounter with associated BP assessment occurs after `t0` and on/before the due boundary.

### Primary benchmark scope
The primary research benchmark intentionally focuses on the binary question:
`TRUE_GAP` vs `NOT_TRUE_GAP/COMPLETED`.

`SCHEDULED`, `EXEMPT`, and `NOT_DUE` remain required product-engine states and must be tested in product/golden test suites, but they are not artificially balanced into the primary research dataset.

Rationale: the headline research question is false-gap identification under missing evidence, not synthetic multiclass state balancing.

## 12. Evaluation time
Primary benchmark evaluation time is fixed at:

`due_boundary + 1 calendar day`

This ensures the benchmark asks whether the action is overdue at a consistent point, rather than mixing pre-due and post-due evaluations.

## 13. Ground-truth isolation
The following is mandatory:
- `BenchmarkGroundTruth` is stored separately from `ObservedCaseInput`;
- no ground-truth field may be serialized into the input passed to Baseline or EACCE;
- runtime assertions/tests must fail if ground-truth fields are present in model/engine input;
- corruption operates on a copy of the observed record, never on the ground-truth label object;
- product code must not have a path to benchmark ground truth.

## 14. Compared methods

### B0 — naive overdue detector
If the action is overdue and no observed qualifying completion event is visible, predict `TRUE_GAP`; otherwise predict non-gap.

B0 ignores record coverage.

### B1 — normalized coverage-blind detector
Use the same normalized action/evidence representation and completion matching used by EACCE, but disable coverage-aware abstention.

If no qualifying completion evidence is visible at the overdue evaluation time, predict `TRUE_GAP` regardless of incomplete coverage.

Purpose: B1 is the stronger comparator. It prevents EACCE's result from being attributed merely to better parsing or event matching.

### P1 — full EACCE
Uses the same normalized observed evidence as B1 plus record-coverage reasoning.

At the primary overdue evaluation point:
- visible qualifying completion → `COMPLETED`;
- no completion + sufficient relevant coverage → `TRUE_GAP`;
- no completion + insufficient relevant coverage → `UNCERTAIN`.

## 15. Corruption families
Corruption is applied only after ground truth is frozen.

Missingness levels:
`0%, 10%, 20%, 30%, 40%, 50%`.

### C1 — random relevant-event loss
Each relevant observed event in the evidence interval is independently eligible for deletion according to the configured probability.

### C2 — contiguous time-window occlusion
A contiguous interval occupying the configured percentage of the action evidence horizon is selected deterministically from the corruption seed; observed events inside that interval are hidden.

### C3 — BP observation-channel loss
The configured percentage of relevant BP Observation resources in the evidence interval is removed while other event classes remain available.

### C4 — targeted completion-evidence loss
For ground-truth-completed cases, the configured probability controls removal of the event evidence needed to prove the follow-up completion. This intentionally stresses the false-gap failure mode.

For true-gap cases, this corruption must not fabricate completion evidence.

## 16. Observable vs silent missingness
Each corruption configuration has two metadata modes.

### Observable missingness
The corrupted observed record includes accurate `RecordCoverageWindow` metadata sufficient to reveal the relevant interval/source is incomplete or unknown.

### Silent missingness
The same event corruption is applied, but no coverage hint is supplied that would reveal the removed events.

Purpose: EACCE must not be assumed capable of detecting missingness that leaves no observable trace.

Silent-missingness results are a required limitation/robustness analysis, not an optional appendix.

## 17. Experiment matrix

Primary observable-missingness matrix:
- 4 corruption families;
- 6 missingness levels;
- 5 predeclared corruption seeds.

Total: `4 × 6 × 5 = 120` configurations.

Robustness silent-missingness matrix:
- same 120 configurations with coverage metadata withheld.

Total planned corruption configurations: `240`.

Each configuration is evaluated with B0, B1, and P1 on the same cases.

Predeclared corruption seeds:
`101, 202, 303, 404, 505`.

These seeds must not be replaced because they produce inconvenient results.

## 18. Dataset splits
No ML model is trained, so conventional train/validation/test terminology is avoided.

### Pipeline smoke set
50–100 eligible cases.
Purpose: CI/research-integrity smoke tests only.

### Development benchmark
Target: 1,000 eligible care-action cases.
Purpose: implementation debugging, protocol validation, performance checks, and plotting development.

### Locked final holdout
Target: 5,000 eligible care-action cases.
Purpose: final thesis results.

The final holdout uses a different predeclared Synthea simulation seed and must not be inspected for outcome-driven tuning before engine/rule/metric freeze.

Recommended fixed generation seeds:
- development: `360001`
- final holdout: `360002`

If the generated population does not contain enough eligible cases, population size may be increased using the same generation seed/config. The eligibility rule must not be weakened merely to reach the target count.

## 19. Freeze policy
Before running the final holdout, freeze and tag:
- clinical rule version;
- EACCE version;
- B0/B1 definitions;
- FHIR normalization rules;
- eligibility concept sets;
- corruption implementation;
- corruption seeds;
- primary/secondary metrics;
- evaluation time policy;
- final Synthea tag/commit/config/seed.

If a substantive change is made after final-holdout inspection, the run is no longer the untouched holdout. The change must receive a new protocol/engine version and a newly generated holdout seed.

## 20. Primary outcome
### False-gap rate
Among complete-record ground-truth `COMPLETED` cases:

`false_gap_rate = predicted_TRUE_GAP / ground_truth_COMPLETED`

This is the headline safety/error metric.

## 21. Secondary outcomes
- true-gap precision;
- true-gap recall;
- true-gap F1;
- abstention rate (`UNCERTAIN / all cases` for P1);
- decision coverage (`non-UNCERTAIN / all cases` for P1);
- error counts by corruption family and missingness level;
- B0 vs B1 vs P1 paired disagreement.

A lower false-gap rate is not considered sufficient evidence of improvement by itself if it is achieved only by abstaining on nearly every case. Results must always display decision coverage and true-gap recall alongside false-gap rate.

## 22. Exploratory outcomes
- selective risk / coverage relationship;
- error distribution by corruption family;
- error examples with explanation trace;
- performance/runtime measurements where useful.

Multiclass macro-F1 across all six product states is not a primary thesis metric unless a separate non-artificial state benchmark is later justified and predeclared.

## 23. Statistical reporting
For paired method comparisons:
- report absolute metric differences;
- report relative differences where interpretable;
- use paired bootstrap 95% confidence intervals for headline metric differences;
- use McNemar's test as a confirmatory paired test for binary error disagreement in predeclared headline comparisons;
- report mean and standard deviation across corruption seeds for each family/level;
- report raw counts, not only percentages.

Do not search across many unplanned statistical tests and report only significant results.

## 24. Missingness-level aggregation
Never publish only one overall number across all corruption patterns.

At minimum, final results must be stratified by:
- corruption family;
- missingness level;
- observable vs silent mode.

An overall summary may be added only alongside the stratified results.

## 25. Explanation integrity
For every P1 prediction, persist:
- rule ID/version;
- evaluation time;
- classification;
- reason code;
- evidence used;
- missing/coverage evidence considered;
- engine version.

Tests must verify that the explanation is consistent with the actual decision path.

## 26. Failure-state expectations
The experiment is successful as a scientific exercise even if EACCE does not outperform the comparator in every condition.

Expected limitation:
Under silent missingness, EACCE may be unable to distinguish absent evidence from truly absent care. This failure mode must be reported rather than hidden.

## 27. Reproducibility manifest
Every experiment run must persist:
- experiment ID;
- protocol version;
- dataset manifest ID;
- Synthea tag/commit/config hash/seed;
- eligible case count;
- rule version;
- engine version;
- baseline versions;
- corruption family/level/seed/mode;
- evaluation time policy;
- run start/end time;
- software commit SHA;
- metric outputs;
- failure status/error if the run fails.

Failed runs are not silently deleted.

## 28. Prohibited practices
- no real patient records;
- no field data collection dependency;
- no ground-truth leakage into observed input;
- no tuning against final holdout results;
- no replacing inconvenient seeds;
- no deleting failed configurations;
- no changing missingness definitions after seeing final results without versioning a new protocol;
- no claiming Egypt prevalence or clinical effectiveness from Synthea;
- no diagnosis/treatment claims.

## 29. Exit criteria for research-method planning
This protocol is implementation-ready when:
1. clinical-rule source is frozen;
2. Synthea version/commit/export format are frozen;
3. exact FHIR concept/code sets for eligibility and BP/follow-up matching are versioned;
4. corruption semantics have deterministic unit tests;
5. ground-truth isolation tests exist;
6. B0/B1/P1 receive identical observed inputs;
7. metrics have independent fixture-based unit tests;
8. final-holdout freeze procedure is implemented.

The exact FHIR concept/code-set freeze remains a required implementation-preparation subtask; agents may inspect Synthea v4.0.0 data/code to produce it, but may not guess codes from memory.
