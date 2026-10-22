# EgyHealth 360 — Critical UX Validation V2

> **V3 applicability:** Historical Product V2 interaction/reference document, not an active V3 screen specification or completed UX validation. **DESIGN FROZEN** under D35. Its nine-screen/Care-action-first scope does not define the five-workspace V3 journey. No screens, components or visual behavior are added/changed here. See [approved policy/lineage](PRODUCT_V3_DECISIONS.md).

## Purpose
Convert the current visual direction into implementation-ready interaction rules for the nine critical screens. This document validates behavior/states, not pixel-perfect styling.

## Global UX rules
- One responsive web application.
- Clinician/Admin: desktop-first.
- Patient: mobile-first.
- English-first i18n architecture with RTL-safe layout; Arabic must not require re-architecting components.
- Status is never communicated by color alone.
- Clinical events, engine assessments, clinician reviews, and research results must be visually distinct concepts.
- No fabricated medical urgency, diagnosis, or treatment recommendation.
- No fake metrics/placeholder accuracy presented as real results.

## Patient-facing terminology
| Internal state | Patient wording |
|---|---|
| TRUE_GAP | Needs attention |
| UNCERTAIN | More information needed |
| SCHEDULED | Scheduled |
| COMPLETED | Completed |
| NOT_DUE | Upcoming |
| EXEMPT | Not required |

Clinician UI may use technical closure-state labels with plain-language explanation.

## Screen 1 — Clinician Dashboard
### Primary goal
Show what needs attention across assigned patients without forcing the clinician to inspect every record.

### Required content
- Active Patients count
- Confirmed True Gaps count
- Uncertain count
- Upcoming count
- Needs Attention queue
- Upcoming queue

### Interaction target
Dashboard -> patient/action explanation in <=3 primary interactions.

### Required states
- loading skeleton
- no assigned patients
- assigned patients but no active gaps
- API error/retry
- permission/session expired

### Prohibited
- generic `Stable` clinical status
- Reports navigation in Core V1
- Add Patient as a required primary action

## Screen 2 — Patient List
### Required
- search
- filter by closure attention state
- pagination
- patient name/basic non-sensitive summary
- assignment-aware access only

### Empty states
Differentiate:
- no assigned patients
- no results for current filters

## Screen 3 — Patient Overview
### Required
- patient summary
- active care plan
- Needs Attention section
- upcoming care actions
- recent clinical timeline
- recent BP measurements

### Important wording
Use `No Active Gaps/Issues` when appropriate; do not infer the patient is medically stable.

## Screen 4 — Care Action Detail
Most important explanatory screen.

### Required sections
1. Action identity and due information
2. Current closure classification
3. Plain-language reason
4. Evidence used
5. Relevant missing/coverage information
6. Rule ID/version
7. Engine version/evaluation time
8. Review status
9. Confirm/Override controls for authorized clinician

### TRUE_GAP presentation
Must show why the gap is confirmed and that relevant evidence coverage was considered sufficient.

### UNCERTAIN presentation
Must explicitly say that available records are insufficient to confirm the care action was missed.

Never phrase UNCERTAIN as patient non-adherence.

### Override modal
Must show:
- original engine classification
- requested effective classification
- mandatory reason
- warning that original engine result remains preserved

## Screen 5 — Patient Home
### Mobile-first hierarchy
1. Next Action hero
2. Care-plan progress/status summary
3. More information needed / needs attention items
4. Recent BP summary

### Prohibited
- engine internals
- alarming technical wording
- patient self-closing a restricted care action

## Screen 6 — My Plan
Sections:
- Upcoming
- Completed
- Needs attention / More information needed

Each action shows a concise status and due/schedule information.

## Screen 7 — BP Measurement
### Fields
- systolic
- diastolic
- measured at/time
- optional context only if approved by requirements

### Validation
- required values
- numeric/acceptable input shape validation
- impossible/invalid form values rejected rather than silently corrected

The UI must not diagnose based on the entered BP.

## Screen 8 — Evaluation Lab
Admin/research surface only.

### Required configuration visibility
- dataset/manifest
- protocol version
- corruption family
- missingness level
- metadata mode observable/silent
- seed/config
- compared methods

### Run states
- ready
- queued
- running
- completed
- failed

A failed run must not show stale metrics from a prior run.

## Screen 9 — Experiment Results
### Required
- real metric values only
- raw case counts
- false-gap rate
- true-gap precision/recall/F1 where defined
- abstention/decision coverage for EACCE
- method/version metadata
- dataset/protocol/corruption metadata
- comparison charts

### Required visualizations
- false-gap rate vs missingness
- coverage vs missingness
- true-gap recall vs missingness
- observable vs silent missingness comparison

### Empty/failure
If results are unavailable, say so. Never invent sample metrics.

## Closure-state component validation
Every state badge/card must include:
- text label
- icon or non-color cue
- accessible name

TRUE_GAP and UNCERTAIN must remain distinguishable in grayscale/high-contrast usage.

## Responsive rules
### >=1024px
- persistent clinician/admin sidebar
- two-column detail layouts allowed
- tables allowed where appropriate

### 768–1023px
- collapsible navigation
- avoid wide multi-column tables where essential data can be cards

### <768px
- patient screens optimized first
- bottom/tab navigation for patient Home / My Plan / Measurements / Profile
- clinician screens remain usable but are not primary mobile workflow
- action buttons minimum touch target ~44px

## RTL validation
Before UI milestone completion, test representative Arabic rendering for:
- sidebar/nav order
- breadcrumbs/back navigation
- status badges
- forms
- modal alignment
- mixed LTR data such as dates, BP values, IDs, and version strings

Do not mirror medical numeric values themselves.

## Accessibility validation
Critical flows target WCAG 2.2 AA:
- keyboard navigation
- visible focus
- semantic headings/labels
- modal focus trap/return
- form-error association
- non-color status semantics
- sufficient contrast
- 44px touch targets on patient mobile actions

## State matrix required for every critical screen
Each implementation PR must show handling for applicable:
- loading
- empty
- success
- validation error
- server error
- permission denied
- stale data/assessment
- offline/network interruption where practical

## Golden UX flows
### Clinician
Dashboard -> Needs Attention -> Patient Overview -> Care Action Detail -> inspect evidence/explanation -> confirm/override.

### Patient
Home -> Next Action -> My Plan/action detail -> Measurements -> add BP.

### Research
Evaluation Lab -> configure -> run -> running state -> completed -> Results -> inspect metadata/metrics.

## UX Definition of Done
A critical screen is not done because a screenshot looks polished. It is done when:
- required data and actions are represented;
- authorization/state behavior is correct;
- loading/empty/error/stale states exist;
- responsive behavior is verified;
- accessibility checks pass for the critical flow;
- wording does not overclaim medical certainty;
- implementation matches requirements/traceability IDs.
