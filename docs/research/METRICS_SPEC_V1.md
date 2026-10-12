# EgyHealth 360 — Metrics Specification V1

## Purpose
Define metric formulas and edge-case handling before implementation so result calculations cannot be changed opportunistically after experiments run.

## Label mapping
Primary benchmark ground truth:
- Positive: `TRUE_GAP`
- Negative: `COMPLETED`

Method outputs for B0/B1:
- `TRUE_GAP`
- `COMPLETED` / non-gap

Method outputs for P1/EACCE:
- `TRUE_GAP`
- `COMPLETED`
- `UNCERTAIN`

For primary binary metrics, `UNCERTAIN` is an abstention, not a positive or negative prediction.

## Counts
For non-abstained predictions:
- TP: ground truth TRUE_GAP, predicted TRUE_GAP
- FP: ground truth COMPLETED, predicted TRUE_GAP
- TN: ground truth COMPLETED, predicted COMPLETED/non-gap
- FN: ground truth TRUE_GAP, predicted COMPLETED/non-gap

For EACCE additionally:
- U_POS: ground truth TRUE_GAP, predicted UNCERTAIN
- U_NEG: ground truth COMPLETED, predicted UNCERTAIN
- U_ALL = U_POS + U_NEG

## Primary metric — false-gap rate

```text
false_gap_rate = FP / N_ground_truth_COMPLETED
```

Important: EACCE abstentions on completed cases are not counted as false gaps, but they reduce decision coverage and must be reported next to false-gap rate.

## True-gap precision
For predictions where the method actually emits TRUE_GAP:

```text
precision_true_gap = TP / (TP + FP)
```

If denominator is zero, report metric as undefined/NA, not 0 or 1.

## True-gap recall
Abstention on a true gap counts as failure to confirm that gap for recall purposes.

```text
recall_true_gap = TP / N_ground_truth_TRUE_GAP
```

Equivalent denominator includes TP + FN + U_POS for EACCE.

## True-gap F1

```text
F1 = 2 * precision * recall / (precision + recall)
```

If precision or recall is undefined such that F1 cannot be computed, report NA with raw counts.

## Abstention rate
EACCE only:

```text
abstention_rate = U_ALL / N_all_cases
```

## Decision coverage
EACCE only:

```text
decision_coverage = 1 - abstention_rate
```

or equivalently:

```text
(N_all_cases - U_ALL) / N_all_cases
```

## Selective error rate
Among cases where EACCE makes a non-UNCERTAIN decision:

```text
selective_error_rate = (FP + FN) / (N_all_cases - U_ALL)
```

Report only when denominator > 0.

## Confirmed-gap error rate
Among predictions labeled TRUE_GAP:

```text
confirmed_gap_error_rate = FP / (TP + FP)
```

This is `1 - precision_true_gap`; it may be useful in presentation because it directly states how often a confirmed gap is wrong.

## Comparator differences
For each corruption configuration, compute paired differences such as:

```text
Delta_false_gap_B1_vs_P1 = false_gap_rate_B1 - false_gap_rate_P1
Delta_recall_B1_vs_P1 = recall_B1 - recall_P1
Delta_coverage = coverage_P1 - 1.0
```

Positive `Delta_false_gap_B1_vs_P1` means P1 produced fewer false gaps.

## Relative reduction
Where baseline false-gap rate > 0:

```text
relative_false_gap_reduction =
(false_gap_rate_baseline - false_gap_rate_P1) / false_gap_rate_baseline
```

If baseline rate is zero, relative reduction is undefined and must not be forced to 0% or 100%.

## Confidence intervals
Headline paired metric differences use paired bootstrap resampling at the benchmark-case level.

Default specification:
- 10,000 bootstrap resamples for final results;
- resample benchmark cases with replacement;
- maintain pairing across compared methods within every resampled case;
- report percentile 95% CI unless a documented protocol revision chooses another interval method before holdout inspection.

Development runs may use fewer resamples for speed, but final reports must use the frozen final setting.

## McNemar confirmatory comparison
For predeclared binary error comparisons between two methods:
- construct paired discordant error counts on the same cases;
- use McNemar's test;
- report the discordant counts alongside the p-value;
- do not use McNemar as a replacement for effect size or confidence intervals.

If exact vs asymptotic McNemar selection is needed, freeze the rule before final-holdout analysis; a safe default is exact testing when discordant counts are small.

## Seed aggregation
For every corruption family, missingness level, and metadata mode:
- report each of the 5 corruption-seed results;
- report mean;
- report standard deviation;
- do not hide seeds with worse results.

## Required stratification
Final tables/plots must separate:
- corruption family;
- missingness level;
- observable vs silent missingness;
- comparator method.

Do not publish only a single pooled headline number.

## Raw counts requirement
Every percentage/metric table must be reproducible from persisted raw counts.
At minimum persist:
- N total;
- N ground-truth TRUE_GAP;
- N ground-truth COMPLETED;
- TP;
- FP;
- TN;
- FN;
- U_POS;
- U_NEG.

## No cherry-picked threshold
EACCE V1 has no learned probability threshold. If any confidence or abstention threshold is introduced later, it becomes a new method version and must be frozen before final-holdout evaluation.

## Success interpretation
There is no single arbitrary pass/fail percentage target.

Interpretation must consider the trade-off among:
- false-gap reduction;
- true-gap recall;
- decision coverage;
- behavior across missingness families;
- behavior under silent missingness.

A method that achieves near-zero false gaps by abstaining on nearly all cases must not be described as simply "better".

## Visualization requirements
Final experiment reporting should include at least:
1. False-gap rate vs missingness level by method.
2. Decision coverage vs missingness level for P1.
3. True-gap recall vs missingness level by method.
4. Observable vs silent missingness comparison.
5. Error-count or confusion-style summary for selected predeclared scenarios.

Charts must display real computed results only; no placeholder or invented accuracy values.
