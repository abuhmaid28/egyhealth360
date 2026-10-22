# Research Methodology V1 — Retained HTN Study within Product V3

## Product context and implementation status

The approved [Product V3](PRODUCT.md) centers the integrated healthcare journey (Layer A), connects longitudinal continuity (Layer B), and retains bounded evidence-aware HTN research as Layer C. EACCE is a differentiator within the platform. Ordinary booking/consultation/fulfillment does not require a CarePlan or assessment. M0–M2 COMPLETE; EACCE implementation/experiments NOT STARTED. Engine/FHIR/worker scaffolds are not executed research.

## Retained question and authoritative protocol

Can evidence-aware care-action closure reduce false confirmed HTN follow-up gaps under incomplete longitudinal records relative to coverage-blind detection? Keep CR-HTN-FU-001 controlled uncomplicated hypertension follow-up, authoritative source/version traceability and the existing binary overdue primary study.

The unchanged [formal protocol](research/EXPERIMENT_PROTOCOL_V1.md), [metric specification](research/METRICS_SPEC_V1.md), [clinical source audit](research/CLINICAL_RULE_SOURCE_AUDIT.md) and [rule catalog](research/CLINICAL_RULE_CATALOG_V1.md) govern exact definitions, source interpretation, seeds, concept freeze, splits, holdout, metrics and corruption. This summary does not amend them or add a broader disease/recurrence study. Human-entered general product diagnoses/prescriptions are not diagnostic/treatment AI or automatically new research predicates.

## Compared methods and inputs

- **B0:** naive overdue/no visible qualifying completion detector; coverage-blind.
- **B1:** normalized coverage-blind comparator, using P1's normalized matching representation without coverage-aware abstention.
- **P1:** full EACCE with relevant record coverage; no completion under insufficient coverage may yield UNCERTAIN rather than a confirmed gap.

Each receives the identical corrupted observed case. Complete-record ground truth remains isolated, derived before corruption and never serialized into product/engine observed inputs. Missing/unasserted data is not backfilled from truth. UNCERTAIN is abstention, not a ground-truth class.

## Evaluation and claims

Retain pinned Synthea v4.0.0 / release commit 0185c09 / FHIR R4, one index care-action case per patient, fixed overdue evaluation time and eligibility requirements defined in the protocol. Research-input/concept-set feasibility is required before I5 semantics freeze; full pipeline/evaluation remains I7. Product provider organizations/diagnoses/results do not automatically assert clinical applicability or complete coverage.

The protocol declares random relevant-event loss, contiguous time-window occlusion, BP observation-channel loss and targeted completion loss; six missingness levels and five predeclared seeds yield 120 observable plus 120 silent configurations, each compared with B0/B1/P1. No new experiment parameters are introduced here.

Report primary false-gap rate with true-gap recall, decision coverage/abstention, raw counts and paired B0/B1/P1 comparisons. Preserve bootstrap confidence intervals, predeclared paired tests, stratification, development/untouched holdout separation and failed runs/manifests. Silent missingness is a required robustness limitation, not an optional appendix. A lower false-gap rate from nearly universal abstention is not sufficient improvement evidence.

All six product classifications remain required later product/golden cases: NOT_DUE, COMPLETED, SCHEDULED, TRUE_GAP, EXEMPT, UNCERTAIN. The primary study remains binary overdue gap versus qualifying completion; do not fabricate a balanced six-class dataset. Assessments/explanations are immutable, new evidence produces/requires re-evaluation, and clinician overrides preserve raw engine output/history. These are future I5 obligations, not implemented features.

No real patient data, clinical effectiveness/generalization claim, diagnostic AI, autonomous treatment/dose recommendation, broad condition engine or recurrence is added. Laboratory/pharmacy extend the product journey, not the primary HTN benchmark. See [Roadmap V3](IMPLEMENTATION_ROADMAP.md), [requirements](REQUIREMENTS.md) and [thesis structure](THESIS_STRUCTURE_V1.md).
