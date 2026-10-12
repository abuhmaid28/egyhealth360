# EgyHealth 360 — Clinical Rule Source Audit V1

## Purpose
Freeze the first hypertension follow-up rule only after checking authoritative clinical sources and separating clinical guidance from engineering interpretation.

## Source hierarchy
1. WHO 2021 Guideline for the Pharmacological Treatment of Hypertension in Adults — primary source.
2. Egyptian Hypertension Society 2014 guideline — local corroboration only where consistent with the current WHO source.
3. Secondary summaries may be used for navigation, never to silently override the primary guideline.

## Verified WHO source facts

### WHO Recommendation 6 — target blood pressure
For adults with hypertension without comorbidities, WHO recommends a treatment goal below 140/90 mmHg.

Source: WHO, Guideline for the pharmacological treatment of hypertension in adults, 2021, section 3.6 / Recommendation 6.

Evidence strength in source: strong recommendation, moderate-certainty evidence.

### WHO Recommendation 7 — frequency of reassessment
WHO suggests:
- monthly follow-up after initiation or a change in antihypertensive medication until target is reached;
- follow-up every 3–6 months for patients whose blood pressure is under control.

Source: WHO, Guideline for the pharmacological treatment of hypertension in adults, 2021, section 3.7 / Recommendation 7.

Evidence strength in source: conditional recommendation, low-certainty evidence.

## Egyptian local corroboration
The Egyptian Hypertension Society 2014 guideline states that BP should be rechecked at one-to-two-month intervals until target is stable, followed by 3–6 month reassessment intervals depending on risk; once BP is at goal and stable, patients are usually seen at 3–6 month intervals.

Use in EgyHealth 360:
- supports the local plausibility of a 3–6 month stable follow-up interval;
- does NOT define the V1 BP target threshold because this older guideline uses different diagnostic/target conventions from current WHO guidance.

## First executable V1 rule selection

### Rule ID
`CR-HTN-FU-001`

### Name
Controlled uncomplicated hypertension follow-up

### Status
APPROVED FOR RESEARCH IMPLEMENTATION V1

### Why this rule was selected
It is the smallest clinically sourced follow-up action that fits the current product and research scope without introducing a medication-management domain, prescribing logic, dosage logic, or treatment recommendations.

The WHO monthly-follow-up recommendation after medication initiation/change is source-verified but deferred because implementing it correctly would require explicit treatment-change events and medication-domain semantics that Core V1 intentionally excludes.

## Applicability for V1 benchmark
The rule is evaluated only for synthetic benchmark cases that satisfy all of the following:
- adult age >= 18;
- non-pregnant;
- hypertension diagnosis present in the synthetic record;
- no CVD, diabetes mellitus, or chronic kidney disease in the V1 benchmark cohort;
- at least one qualifying BP assessment is available.

Rationale: this deliberately narrow cohort allows the WHO <140/90 mmHg target to be applied directly without mixing higher-risk target rules into the first benchmark.

## Engineering operationalization
The following items are engineering interpretations for reproducible evaluation. They are not additional WHO clinical recommendations.

### Control evidence
A qualifying observed BP measurement with:
- systolic < 140 mmHg, and
- diastolic < 90 mmHg
is treated as evidence that the uncomplicated V1 benchmark case is under control at that assessment time.

This operationalization maps WHO Recommendation 6 into a machine-readable benchmark condition.

### Expected follow-up action
After a qualifying controlled BP assessment, create one expected care action:

`Hypertension BP reassessment / follow-up`

Recommended window:
- window opens: +3 calendar months;
- due-by boundary: +6 calendar months.

For care-gap classification, the action is not considered overdue until the 6-month boundary is passed.

### Completion evidence
A qualifying follow-up is completed when the observed record contains a relevant follow-up clinical encounter with an associated BP assessment after the trigger assessment and on or before the due-by boundary.

A more frequent clinically relevant follow-up is allowed to satisfy the action; the engine must not classify earlier reassessment as invalid merely because it occurred before month 3.

### Scheduled evidence
A future appointment explicitly linked to the hypertension follow-up action may support the `SCHEDULED` state. Scheduling semantics are product workflow semantics, not a new clinical recommendation.

### Automatic exemptions
No automatic medical exemption is inferred in V1 from the WHO source.

A clinician/manual exemption may exist as an auditable product workflow, but the system must not invent clinical exemption reasons.

## Frozen EACCE decision order for CR-HTN-FU-001
At an explicit `evaluation_time`, after input validation:

1. Applicability / explicit exemption handling.
   - If the action is not applicable or has a valid documented exemption → `EXEMPT`.
2. Qualifying completion evidence.
   - If present → `COMPLETED`, even if completion occurred earlier than the recommended 3-month window start.
3. Valid future schedule evidence.
   - If present under the frozen scheduling contract → `SCHEDULED`.
4. Due timing.
   - If the due-by boundary has not passed and no earlier resolving state applies → `NOT_DUE`.
5. Relevant record-coverage sufficiency for an overdue unresolved action.
   - Insufficient relevant coverage → `UNCERTAIN`.
   - Sufficient relevant coverage with no completion/schedule/exemption → `TRUE_GAP`.

Why this order is frozen:
- completed care should not be labelled `NOT_DUE` merely because it happened early;
- an explicitly scheduled follow-up should remain visible as `SCHEDULED` rather than be hidden by a pre-due `NOT_DUE` label;
- `TRUE_GAP` is only reachable after the action is overdue and relevant coverage is sufficient.

Any future change to this ordering is a behavior change requiring a versioned engine contract, ADR/requirements update where relevant, and updated golden tests.

## Relevant evidence window
For research V1, the relevant evidence window begins after the trigger controlled assessment and ends at the explicit evaluation time, with the due-by boundary at trigger +6 calendar months.

Record incompleteness outside this relevant period must not automatically force `UNCERTAIN`.

## Deferred source-verified rule

### Candidate Rule ID
`CR-HTN-FU-002`

### Source fact
Monthly follow-up after initiation or change of antihypertensive medications until target is reached.

### Status
DEFERRED — NOT IMPLEMENTED IN CORE V1

### Reason
Would require medication initiation/change events and additional treatment-domain semantics. Adding those solely to use this rule would expand scope without improving the central research question.

## Explicit non-claims
The project does not claim that:
- one BP reading is sufficient for real-world clinical management;
- the V1 cohort represents every hypertension patient;
- the 3–6 month interval is novel;
- the engine diagnoses hypertension;
- the engine recommends treatment or medication changes;
- the synthetic benchmark constitutes clinical validation.

## Implementation gate
No coding agent may implement CR-HTN-FU-001 from memory or a chat summary. The machine-readable rule must reference this rule ID, the source/version, and the approved research protocol. Any change to the threshold, follow-up window, applicability cohort, completion evidence, or decision ordering requires a documented version change and updated tests.
