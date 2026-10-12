# Research Methodology V1

## Research question
Can an evidence-aware care-action closure method reduce false care-gap classifications compared with a simple overdue-and-absence rule when longitudinal health records are incomplete?

## Dataset
- Synthetic longitudinal data from pinned Synthea v4.0.0
- FHIR R4 import through the project adapter
- Development benchmark and locked final holdout
- Unit of evaluation: care-action case

## Ground truth
Ground truth is derived from the complete synthetic record before corruption. `UNCERTAIN` is not a ground-truth class; it is an abstention when observed evidence is insufficient.

## Baseline
If an action is overdue and no visible qualifying completion exists, classify it as TRUE_GAP; otherwise NOT_TRUE_GAP.

## Proposed method
EACCE reasons over applicability, due state, valid completion evidence, future scheduling, exemption evidence, and relevant record-coverage sufficiency.

## Corruption families
- random event loss
- time-window loss
- source loss
- targeted completion-event loss
- silent missingness scenarios for limitation testing

Candidate missingness levels: 0%, 10%, 20%, 30%, 40%, 50%.

## Primary evaluation
Primary task: confirmed TRUE_GAP detection.

Primary metric: False-Gap Rate.

Secondary metrics: TRUE_GAP precision/recall/F1, macro-F1 where appropriate, decision coverage, abstention rate, per-state performance.

## Experiment matrix
Primary benchmark candidate: 4 corruption patterns × 6 missingness levels × 5 seeds = 120 configurations, with Baseline and EACCE evaluated on identical observed cases.

## Ablations
- full EACCE
- without coverage awareness
- without future scheduling
- without exception evidence

## Statistical reporting
Use paired comparisons, bootstrap 95% confidence intervals for metric differences, and McNemar's test for paired binary errors where applicable. Report results across independent seeds rather than a single favorable run.

## Reproducibility
Every run records dataset/Synthea version, seeds, case counts, clinical rule-set version, engine version, corruption configuration, and evaluation-time policy.

## Boundaries
No real patient data, no clinical-validation claim, no claim of generalization beyond the tested hypertension care-action domain, and no ML in Core V1.
