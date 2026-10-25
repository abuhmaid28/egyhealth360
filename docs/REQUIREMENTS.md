# EgyHealth 360 — Versioned Requirements V3

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Security hotfix and Slices 1–4 COMPLETE; PR #44 merged at `e75671ec0adfdf0f0d71485eebb104728b619e91`, exact-main [Bootstrap 40195060034](https://github.com/abuhmaid28/egyhealth360/actions/runs/40195060034) SUCCESS. [Slice 5 bilateral lifecycle](V3_I1_SLICE5.md) IMPLEMENTED / IN REVIEW under [authorization 6401378826](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6401378826). V3-I1 INCOMPLETE; Issue #39 OPEN; Slice 6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.

[I1 contract](V3_I1_CONTRACT.md) is APPROVED by Issue #39. Slice 1/2 COMPLETE; [Slice 3 registration/profile](V3_I1_SLICE3.md) completes the bounded V3-FR-001 surface after PR #43 / exact-main CI 40116846242. I1 NOT COMPLETE; Slice 4 COMPLETE; Slice 5 implemented / in review; Slice 6 NOT AUTHORIZED. V3-FR-003 and the operational V3-FR-018 subset have accepted Slice 2 foundations; remaining end-to-end V3 capabilities are future work. Existing requirement IDs and historical evidence below are unchanged.

## Current requirement authority and status

Product V3 policy is **APPROVED** by [Issue #35 final owner approval](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6346537901); [D01–D36](PRODUCT_V3_DECISIONS.md) governs the complete frozen package. V3-G0 COMPLETE ([verified closeout](PROJECT.md#v3-g0-completion-evidence)); V3-I1 NOT COMPLETE; EACCE NOT STARTED; DESIGN FROZEN. Policy approval does not mean any new workflow is implemented or authorized to start.

The new `V3-FR-*` grouping is versioned separately from existing `FR-*`, `BR-*`, `AC-*`, `ERR-*`, `NFR-*` and `P-*` IDs. Those historical requirements/evidence are retained below. No ID is recycled and no unfinished acceptance criterion is relabeled satisfied.

## Approved future V3 requirements — NOT IMPLEMENTED as complete V3 capabilities

All rows below are approved future scope. Existing reusable foundations are identified explicitly in the last column; they do not complete the new end-to-end requirement. Exact implementation contracts/fields/endpoints/lifecycle names belong to later reviewed issues. Five workspaces operate in one application; ordinary care needs no CarePlan/EACCE.

| ID | Approved requirement | Decision | Future milestone | Current implementation boundary |
|---|---|---|---|---|
| V3-FR-001 | Patient-only bounded self-registration and permitted own profile/demographics; managed privileged accounts; preserve M1 seed and separately version integrated fixtures | D06-A / D03 | I1 | Slice 3 guarded registration/own profile COMPLETE; preserved M1 fixture; no claim of complete integrated journey |
| V3-FR-002 | Curated public doctors/profiles/specialties/clinic/location; simple provider affiliation, no fixed count limits or enterprise hierarchy | D02 / D07 | I1 | Slice 4 curated public directory COMPLETE; explicit specialty/publication, minimized public IDs, current eligibility and no clinical authority; see V3_I1_SLICE4.md |
| V3-FR-003 | Fixed LAB_STAFF/PHARMACY_STAFF operations under active organization membership; no generalized multi-role IAM | D05 / D28 / D36 | I1 | Slice 2 fixed staff roles/operational memberships COMPLETE; no artifact fulfillment authority |
| V3-FR-004 | Explicit patient authorization + clinician acceptance before/at consultation; continuing current relationship until either ends; preserve history and deny subsequent access, including author | D10 / D11-A | I1 | Slice 5 participant authorization/accept/decline/withdraw/history/exact end implemented / in review; sole ACTIVE assignment grant, legacy confirmation without backfill, accepted withdrawal atomic, no booking/consultation authority |
| V3-FR-005 | Finite clinician-published start/end availability, declared clinic timezone, provider/patient overlap and capacity protection; bounded configurable duration/lead/horizon/cutoff | D08 | I2 | No availability/slots |
| V3-FR-006 | Patient own booking/cancel/reschedule/history, clinician own schedule, explicit attendance/no-show; before-start/consultation-opening changes, safe retries, failed replacement preserves original; no fees | D09 / D10 | I2 | EH-012 HTN follow-up is not general booking |
| V3-FR-007 | General consultation/booking/encounter/provider/actual treating provenance; optional artifact creation; preserve EH-012 history and BP links | D12 | I2 | Immutable HTN encounter/link foundation only |
| V3-FR-008 | Human-entered complaint/problems/diagnoses and minimal allergy/intolerance review including unknown/not-reviewed; optional curated codes, no automated inference | D14 | I2 | Synthetic applicability tuples are not clinical problem/allergy records |
| V3-FR-009 | Author-only private notes under current relationship, separate signed/released patient summary/instructions and preserved addenda/corrections | D13 / D15 | I2 | No consultation documentation/release model |
| V3-FR-010 | Small medication catalog; clinician-signed prescription/items preserving prescribed identity/quantity/unit/instructions and clinician-entered validity; cancellation/replacement reconciles past dispensing | D16 / D17 | I3 | No prescribing/catalog/medication workflow |
| V3-FR-011 | Routed authorized pharmacy full prescribed quantity per item, items separately fulfillable, actual quantity/unit/actor/time/history; no partial quantities/refills/substitution/adherence inference | D18-A / D19 / D36 | I3 | No prescription-scoped staff/dispense workflow |
| V3-FR-012 | Clinician lab order routed to recipient lab; meaningful fulfillment progress and reasoned cancellation/rejection; order/result distinct; no mandatory LIS sample-state depth | D20 / D36 | I3 | No lab order/provider workflow |
| V3-FR-013 | Lab entry and explicit verification/finalization with patient/original order/test/provider/author/validator/time/status/provenance; same entry/validator allowed; linked corrections/retractions preserve versions | D15 / D21 | I3 | No result/version/finalization workflow |
| V3-FR-014 | Verified final lab results available to own patient/current authorized doctor; drafts hidden, amendments/retractions identified; no mandatory doctor-release queue in synthetic demo | D22 / D23-B | I3 | Laboratory MUST; imaging not implemented/required |
| V3-FR-015 | Follow-up clinical intent remains meaningful without a slot and connects to one operational booking authority; preserve EH-012 behavior and use legacy links only where needed | D24 | I2 / I4 | Legacy operational HTN appointment only, no unbooked intent/general booking |
| V3-FR-016 | Authorized source-linked longitudinal view of booking/encounter/problems/prescriptions/dispenses/labs/follow-up/BP/plans/actions with occurrence/recording/correction provenance; separate clinical sources, operations, projection and audit | D25 / D26 | I4 | BP/encounter/internal normalized evidence only, not integrated timeline |
| V3-FR-017 | In-app important appointment/result/prescription/dispense/follow-up/action updates and bounded reminders with deduplication/status/cancellation/current privacy; no paid channels | D27 | I4 | No notification module |
| V3-FR-018 | Operational user/provider/affiliation/membership/status/catalog/demo/config and research administration without ADMIN clinical payload/impersonation/signing/fulfillment or routine history reset | D28 / D36 | I1–I4 / I7 | Identity/provisioning plus Slice 2 bounded organization/membership operations COMPLETE; Slice 4 internal catalog/publication management COMPLETE; no admin workspace |
| V3-FR-019 | Retain exact-pinned BP/CarePlan/immutable INITIAL action/protected decision and privacy behavior; future explicit links only, no automatic applicability/coverage/completion or recurrence bridge | D26 / D30 | I4 / I5 | M2 accepted; integrated exposure/evidence bridges not implemented |
| V3-FR-020 | Retained bounded HTN EACCE/six classifications/immutable explanations and clinician overrides; isolated reproducible B0/B1/P1 evaluation, no all-disease/recurrence expansion | D29 / D30 | I5 / I7 / I8 | Engine/FHIR/worker scaffolds are not completed research functionality |

## Cross-cutting V3 acceptance and safety obligations

- Prove golden journeys A–D in [PRODUCT](PRODUCT.md) through real backend/domain behavior before claiming implementation; frontend simulations cannot satisfy clinical workflows. These are policy-covered, not completed tests.
- Recheck patient ownership, current clinical relationship and current user/org/membership/routed artifact authority; deny cross-patient/provider IDOR, private-note leakage and ADMIN clinical overreach. Public directory and pre-relationship schedule access contain no clinical payload.
- Apply D36 to pending/completed artifacts: relationship ending does not cancel otherwise valid routed sources, suspension denies subsequent staff access, cancellation blocks future fulfillment and independent patient/current-doctor authority remains. Preserve history; no permanent author/break-glass/forensic access.
- Separate prescribed, dispensed and actual use. Separate order/result, booking/clinical relationship/encounter/qualifying completion and generation decision/closure assessment. No operational event proves adherence, applicability, completeness or action closure.
- Signed history uses reasoned corrections/addenda/retractions/reversals; wrong-patient restriction independently masks payload and revealing references/counts/notifications. No silent cross-patient transfer or destructive rewrite. Generic audit and clinical history/timeline remain distinct.
- Patient signup cannot select privileged roles or author clinical artifacts. No paid verification, production identity assurance or mandatory full recovery subsystem is introduced. Staff provisioning remains managed.
- Laboratory fulfillment is MUST; imaging SHOULD/optional and claimed only after implemented/proven. Full-item dispensing is frozen; partial/refill/substitution need a new decision.
- Synthetic/free-first scope, deterministic catalogs/fixtures, unchanged research ground-truth isolation and source-traceable HTN rules remain mandatory. Design stays separately frozen; accessibility/i18n goals do not authorize design work.

## V2 → V3 crosswalk and supersession

| V2 IDs / scope | Current disposition | V3 relationship |
|---|---|---|
| P-001..006 | Retained Layer B/C research/access/history problems; not the whole product problem | V3 adds the pre-care access and integrated fulfillment journey |
| FR-001..003; BR-001/002/020; AC-010/011 | Retained accepted auth/own-data/ACTIVE-assignment principles and evidence | V3-FR-001/003/004/018 extend entry/staff/current authority without weakening legacy checks |
| FR-010..013 | Patient list/summary/full action explanation remain incomplete product requirements; profile/BP/internal action reads are foundations only | V3-FR-007/009/016 and later I5; no UI completion claimed |
| FR-020 / BR-003/004 | Exact-pinned plan internal lifecycle implemented, not full product UI/API | Retained by V3-FR-019 |
| FR-021 | Satisfied only for accepted bounded INITIAL generation under EH-014; no recurrence | V3-FR-019 preserves this limit |
| FR-022/023/025; FR-043 | BP/provenance/coverage and authorized history foundations implemented within slice contracts; no complete integrated timeline/UI/coverage sufficiency decision | V3-FR-016/019 plus later evidence contracts |
| FR-024 / BR-009/010 / AC-004/005 | Foundation-only/incomplete / explicit evidence obligations / unsatisfied | General booking V3-FR-005/006/015 does not satisfy EACCE SCHEDULED/COMPLETED |
| FR-030..035 / AC-001..009 / FR-041 | Retained future bounded EACCE/review requirements, not implemented | V3-I5; product wording/UI after its separate design gate |
| FR-040/042 | Minimal internal action/plan foundations, not completed patient product journey | V3-FR-016/019 and later approved UI |
| FR-050..054 | Operational admin/research remains incomplete; no fabricated result claims | V3-FR-018/020; I7/I8 |
| FR-060/061; BR-005; ERR/NFR requirements | Preserve accepted audit/history/error/security/determinism principles; evidence is slice-specific | Extend to future sources; no claim every future requirement is already verified |
| V2 scope note: lab/pharmacy/booking and broad diagnosis exclusion | **SUPERSEDED for current direction by ADR-031 / D01–D36** | Permit bounded discovery/booking/lab/pharmacy and authorized human clinical authoring. Keep diagnostic AI/autonomous treatment, paid/enterprise/production exclusions |
| V2 three-experience/Care-action-first framing and M3-next | **SUPERSEDED/AMENDED as current product plan** | Five future workspaces and integrated journey first; Roadmap V3, EACCE at I5 |

## Retained V2 requirement baseline and implementation evidence

The original normative IDs and slice evidence below are preserved for historical continuity. **Its broad scope exclusions and old roadmap references are historical, superseded as stated above.** Screen/visual references are historical targets, not current design permission. Earlier per-slice incomplete statuses describe those slices, not current M0–M2 completion. Current overall status is [PROJECT](PROJECT.md).

## Requirements V2 — retained baseline

## Scope note
These requirements describe Core V1 only. They do not authorize lab/pharmacy portals, marketplace features, diagnosis, treatment recommendation, medication-dose logic, real-patient deployment, or an ML service.

## Problem IDs
- P-001 False care-gap classification when completion evidence is absent from an incomplete longitudinal record.
- P-002 Clinicians need an inspectable explanation of why a care action was classified a certain way.
- P-003 Patient/clinical data requires relationship-aware authorization and auditable access.
- P-004 Clinical assessments/reviews must preserve history rather than silently overwrite prior state.
- P-005 The research contribution must be reproducible and resistant to ground-truth leakage/cherry-picking.
- P-006 Patients need a simpler view of expected next actions without exposing misleading clinical terminology.

## Functional requirements

### Identity and access
- FR-001 The system shall authenticate Patient, Clinician, and Admin users using server-side sessions.
- FR-002 The system shall authorize patient-owned and clinician-assigned resources on the backend.
- FR-003 The system shall allow logout/session invalidation and expose the current authenticated user/role.

### Clinician workspace
- FR-010 A clinician shall be able to view a paginated/filterable list of actively assigned patients.
- FR-011 A clinician shall be able to open an authorized patient summary.
- FR-012 A clinician shall be able to inspect the patient's care plan, care actions, timeline, and BP measurements.
- FR-013 A clinician shall be able to open a care-action detail view containing current classification, explanation, evidence used, relevant missing/coverage information, rule/version metadata, and review state.

### Care planning and evidence
- FR-020 Authorized clinicians shall be able to create/activate/cancel version-pinned care plans within the approved hypertension scope.
- FR-021 The system shall generate/version care actions from approved rule definitions without silently changing published rules.
- FR-022 Patients shall be able to submit their own BP measurement; authorized clinicians may submit BP measurements for assigned patients.
- FR-023 The system shall preserve provenance for evidence relevant to closure evaluation.
- FR-024 The system shall support follow-up scheduling evidence sufficient for the `SCHEDULED` product state without becoming a general appointment marketplace.
- FR-025 The system shall represent relevant record-coverage windows used by evidence-aware evaluation.

### Care-closure intelligence
- FR-030 The system shall evaluate a care action deterministically using action timing, rule version, observed evidence, relevant coverage, and explicit evaluation time.
- FR-031 EACCE shall support `NOT_DUE`, `COMPLETED`, `SCHEDULED`, `TRUE_GAP`, `EXEMPT`, and `UNCERTAIN` product classifications.
- FR-032 Every closure assessment shall persist an explanation/reason trace and the rule/engine versions used.
- FR-033 New relevant evidence shall cause the current assessment to become stale/superseded and trigger/permit a new immutable assessment rather than overwrite history.
- FR-034 A clinician shall be able to confirm or override an assessment; an override requires a reason and preserves the original engine result.
- FR-035 The system shall expose the effective reviewed state while keeping engine assessment and clinician review distinguishable.

### Patient experience
- FR-040 A patient shall be able to view their current care plan and care actions.
- FR-041 A patient shall see simplified patient-facing wording for closure states.
- FR-042 A patient shall be able to view the next expected action and relevant schedule/status without self-closing restricted clinical actions.
- FR-043 A patient shall be able to view their own BP history.

### Admin/research
- FR-050 An authorized Admin shall be able to manage demo users/data without receiving unrestricted clinical access by role alone.
- FR-051 An authorized Admin shall be able to start a synthetic experiment run using approved configurations.
- FR-052 The system shall persist experiment status, protocol/dataset/engine/rule versions, seeds/configuration, raw counts, and metrics.
- FR-053 An authorized Admin shall be able to view real experiment results and metadata; placeholder/fabricated metrics are prohibited.
- FR-054 The experiment worker shall run the same shared EACCE package/version used by product evaluation for the compared proposed method.

### Auditability
- FR-060 The system shall append audit records for security-sensitive and assessment/review-changing actions.
- FR-061 Audit and immutable assessment history shall remain distinct from the patient-facing clinical timeline.

## Core business rules
- BR-001 Patient can access only own data.
- BR-002 Clinician access requires an active clinician-patient assignment.
- BR-003 Care plans must pin template/rule versions.
- BR-004 Published clinical definitions are immutable.
- BR-005 Critical clinical history is not silently hard-deleted.
- BR-006 EACCE never diagnoses or prescribes.
- BR-007 Missing completion evidence alone does not prove a true gap when relevant coverage is insufficient.
- BR-008 `UNCERTAIN` is allowed under insufficient observed evidence.
- BR-009 `SCHEDULED` requires valid relevant future evidence.
- BR-010 `COMPLETED` requires qualifying completion evidence.
- BR-011 New relevant evidence triggers/requires re-evaluation.
- BR-012 Clinician override preserves original assessment and requires a reason.
- BR-013 Patient cannot arbitrarily self-close restricted clinical actions.
- BR-014 Research ground truth is isolated from engine inputs.
- BR-015 Identical deterministic inputs/evaluation time/rule version produce identical output.
- BR-016 Benchmark methods must receive the same corrupted observed case when compared.
- BR-017 Final-holdout results must not be used for unversioned tuning.
- BR-018 Clinical rules must be source/version/section traceable and may not be invented by agents.
- BR-019 Real patient data is prohibited in Core V1 research/demo workflows.
- BR-020 Admin role alone does not grant unrestricted patient clinical access.

## Closure decision semantics
The implementation contract must be frozen by tests. Current semantics require at minimum:
1. applicability/exemption handling;
2. qualifying completion evidence;
3. valid future schedule evidence;
4. due/not-due timing;
5. relevant coverage sufficiency;
6. confirmed true gap vs uncertainty.

No implementation may reorder these in a way that changes approved acceptance behavior without a versioned decision and test update.

## Core acceptance criteria
- AC-001 Overdue + complete relevant coverage + no completion/schedule/exemption => `TRUE_GAP`.
- AC-002 Overdue + insufficient relevant coverage + no stronger resolving evidence => `UNCERTAIN`, not confirmed `TRUE_GAP`.
- AC-003 Future due boundary with no earlier resolving state => `NOT_DUE`.
- AC-004 Valid relevant future follow-up evidence => `SCHEDULED` according to the frozen scheduling contract.
- AC-005 Valid qualifying completion evidence => `COMPLETED`.
- AC-006 Documented valid exemption => `EXEMPT`; no exemption is fabricated by the engine.
- AC-007 Every assessment exposes a reason/explanation trace consistent with the decision path.
- AC-008 Assessment history is immutable/auditable; re-evaluation inserts a new assessment.
- AC-009 Clinician override preserves original engine assessment and records actor, reason, and time.
- AC-010 Backend authorization is enforced independently of UI visibility.
- AC-011 A clinician without an active assignment cannot access another patient's protected resource even with a valid clinician role.
- AC-012 Ground-truth fields cannot reach B0/B1/EACCE observed inputs during research evaluation.
- AC-013 Identical deterministic input + rule version + engine version + evaluation time produces identical output.
- AC-014 Experiment runs store sufficient manifest/version/seed/config/raw-count information to reproduce reported metrics.
- AC-015 Patient-facing UI distinguishes `TRUE_GAP` from `UNCERTAIN` using wording/icon semantics, not color alone.
- AC-016 No final result screen displays invented or placeholder accuracy/metric values as real results.

## Error/edge requirements
- ERR-001 Missing/invalid authorization -> deny without leaking protected resource existence beyond approved error behavior.
- ERR-002 EACCE evaluation failure -> assessment unavailable/error state; never silently substitute a clinical classification.
- ERR-003 Missing required clinical-rule applicability data -> do not guess eligibility.
- ERR-004 Stale assessment review attempt -> reject or require refresh using a stable machine-readable error.
- ERR-005 Experiment failure -> persist failed state/error context; do not display stale previous metrics as the failed run's results.
- ERR-006 Invalid BP input -> reject with validated field errors; no silent coercion into clinically plausible values.

## Non-functional requirements
- NFR-001 Free-first/self-hostable Core V1.
- NFR-002 Responsive web app; clinician/admin desktop-first and patient mobile-first.
- NFR-003 RTL-ready and English-first i18n architecture; Arabic support must not require redesign.
- NFR-004 WCAG 2.2 AA target for critical flows.
- NFR-005 Deterministic research runs from pinned configuration/seed/version.
- NFR-006 Critical authorization, EACCE, clinical-rule, migration, and research-integrity areas require independent second-pass review where practical.
- NFR-007 Normal product evaluation should be interactive under demo-scale load; no unsupported uptime/latency SLA is claimed.
- NFR-008 Secrets and sensitive authentication data must not be committed or logged.

## Source relationships
- `docs/PRODUCT.md` defines product scope.
- `docs/UX.md` defines navigation/screen behavior.
- `docs/API.md` defines conceptual endpoint groups until implementation freezes OpenAPI contracts.
- `docs/research/CLINICAL_RULE_CATALOG_V1.md` defines the first executable clinical rule.
- `docs/research/EXPERIMENT_PROTOCOL_V1.md` defines research-evaluation behavior.
- `docs/TESTING.md` and the traceability matrix define verification coverage.

## Issue #31 implementation evidence boundary (historical prerequisite scope)

BP source-history preservation, append-only amendment provenance, atomic audit and wrong-patient masking extend FR-023/FR-060/FR-061 foundations. FR-012/FR-043 history remains an API foundation without UI completion. Evidence semantics are specified in [the BP correction contract](BP_CORRECTION_INVALIDATION_CONTRACT.md) and verified in its validation report. Issue #31 alone did not satisfy FR-021, FR-024 or AC-004/AC-005. The later merged EH-014 evidence below satisfies only the approved FR-021 bounded INITIAL scope. EACCE remains M3.


## EH-014 bounded INITIAL implementation — merged and verified

FR-021 — satisfied for the approved Core V1 bounded INITIAL generation scope. FR-024 remains foundation-only / incomplete pending the final SCHEDULED evidence contract. AC-004 (`SCHEDULED`) and AC-005 (`COMPLETED`) remain unsatisfied. M2 completion does not imply completion of all Core V1 acceptance criteria or EACCE. Generalized recurrence, recurring action generation and arbitrary future rule workflows are not implemented. Normative requirement and acceptance wording above is unchanged.

[PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. [Contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md); [validation](EH-014_VALIDATION.md#post-merge-validation).


## Current completion boundary after V3 adoption

M0–M2 COMPLETE; Issue #28 CLOSED/completed at the reconciliation baseline. This corrects prior pending-closeout status, not historical behavior. FR-021 bounded INITIAL only; FR-024 incomplete; AC-004/005 unsatisfied. No V3 capability, EACCE assessment/research result or design completion is created by this documentation reconciliation.

## Current Slice 5 applicability

The authoritative implementation extension is [V3_I1_SLICE5](V3_I1_SLICE5.md), with [executed validation](V3_I1_SLICE5_VALIDATION.md). It adds participant-only request/accept/decline/withdraw/history/exact assignment end, additive request/end provenance and current-authority locks; the sole clinical grant remains ClinicianPatientAssignment. Earlier slice-local “future/not implemented” notes are historical to those slices. Slice 4 is COMPLETE via PR #44 / exact-main CI 40195060034. Slice 5 is in review; Slice 6 is not authorized. No I1 completion, booking, fulfillment, EACCE or design work is claimed.
