# EgyHealth 360 — Clinical Rule Catalog V1

> **V3 applicability:** The bounded HTN catalog and deferred candidates below are unchanged. General clinician-entered prescriptions/diagnoses in approved V3 do not promote a new clinical rule, infer applicability or expand research to recurrence/other diseases. Current product approval is not EACCE implementation. See [approved policy](../PRODUCT_V3_DECISIONS.md) and [research boundary](../RESEARCH.md).

## Rule CR-HTN-FU-001

### Identity
- Rule ID: `CR-HTN-FU-001`
- Name: Controlled uncomplicated hypertension follow-up
- Condition domain: Hypertension
- Rule version: `1.0.0-draft`
- Status: Approved for V1 research implementation

### Authoritative source
- Organization: World Health Organization
- Document: Guideline for the pharmacological treatment of hypertension in adults
- Publication year: 2021
- ISBN: 978-92-4-003398-6
- Relevant sections:
  - 3.6 / Recommendation 6 — target blood pressure
  - 3.7 / Recommendation 7 — frequency of reassessment

### Local corroboration
- Egyptian Hypertension Society
- Egyptian Hypertension Guidelines
- 2014
- Relevant location: page 101 in the journal pagination / PDF page area containing the follow-up recommendations
- Used only to corroborate the 3–6 month stable follow-up interval, not to define the V1 BP target.

### Source-derived clinical statements
1. For hypertension without comorbidities, WHO treatment target is below 140/90 mmHg.
2. WHO suggests follow-up every 3–6 months when BP is under control.

### Benchmark applicability
```text
age >= 18
AND pregnancy_status != pregnant
AND hypertension_diagnosis == true
AND known_CVD == false
AND diabetes_mellitus == false
AND chronic_kidney_disease == false
```

If required applicability data are unavailable in a benchmark case, the case must not be silently assumed eligible.

### Trigger
A qualifying controlled BP assessment:

```text
systolic_mmHg < 140
AND diastolic_mmHg < 90
```

### Generated expected action
```text
code: HTN_BP_FOLLOWUP
label: Hypertension BP reassessment / follow-up
trigger_time: qualifying controlled BP assessment time
recommended_window_start: trigger_time + 3 calendar months
due_by: trigger_time + 6 calendar months
```

### Completion evidence
Minimum V1 completion evidence:
```text
relevant_followup_encounter == present
AND BP_assessment_associated_with_followup == present
AND followup_time > trigger_time
AND followup_time <= due_by
```

Early but relevant reassessment after the trigger may satisfy the action. The 3-month point is a recommended-window start, not a rule that invalidates earlier care.

### Schedule evidence
A future appointment explicitly linked to the follow-up action can be used as schedule evidence under the closure-engine product contract.

### Exemption policy
- No automatic medical exemption rule in V1.
- Manual clinician exemption must be explicit, auditable, and reasoned.
- The engine must never fabricate an exemption.

### Coverage requirement
`TRUE_GAP` requires sufficient record coverage for the relevant evidence period.

If relevant coverage is insufficient and no stronger evidence resolves the action, the expected classification is `UNCERTAIN`, not `TRUE_GAP`.

### Reason-code candidates
- `HTN_FOLLOWUP_COMPLETED`
- `HTN_FOLLOWUP_SCHEDULED`
- `HTN_FOLLOWUP_NOT_YET_DUE`
- `HTN_FOLLOWUP_OVERDUE_COMPLETE_COVERAGE`
- `HTN_FOLLOWUP_OVERDUE_INCOMPLETE_COVERAGE`
- `HTN_RULE_NOT_APPLICABLE`

Reason codes are engineering identifiers and do not represent clinical diagnoses.

### Required golden tests
1. Controlled uncomplicated HTN, evaluation before due date → NOT_DUE.
2. Controlled uncomplicated HTN, qualifying follow-up before due date → COMPLETED.
3. Controlled uncomplicated HTN, overdue, complete coverage, no completion/schedule → TRUE_GAP.
4. Same as #3 but relevant coverage incomplete → UNCERTAIN.
5. Overdue with explicit future linked appointment → SCHEDULED according to final scheduling contract.
6. Patient with excluded comorbidity → not automatically evaluated under this V1 rule.
7. Missing applicability data → do not guess eligibility.
8. Missingness outside relevant evidence period → does not by itself force UNCERTAIN.

### Known limitations
- The V1 rule deliberately narrows the benchmark cohort.
- A single observed BP measurement is used as a reproducible machine operationalization of the WHO target condition; this is not claimed as complete real-world clinical management guidance.
- The source recommendation on 3–6 month follow-up is conditional and based on low-certainty evidence.
- Real-world clinical validation is out of scope.

---

## Candidate Rule CR-HTN-FU-002

- Name: Monthly reassessment after antihypertensive initiation/change
- Source: WHO 2021 Recommendation 7
- Source status: Verified
- Implementation status: Deferred
- Reason: requires medication-treatment change events and would expand Core V1 scope.

No coding agent may implement this candidate unless a later approved scope decision promotes it.
