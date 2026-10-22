# Implementation Roadmap V1

## Principle
Build the smallest vertical slices that prove the architecture, security model, core closure engine, product workflow, and research methodology. Every task is issue-scoped and PR-reviewed.

## Milestone M0 — Repository Reboot
- EH-002: synchronize source-of-truth documentation
- EH-003: bootstrap monorepo V2

Exit gate: repo structure, tooling, Docker, CI, health checks, and shared-package boundaries are stable.

## Milestone M1 — Identity, Authorization, and Core Data Foundation
1. Implement Prisma domain foundation for users/profiles/assignments and core audit primitives.
2. Implement server-side sessions, Argon2id login/logout, CSRF protection, and session lifecycle.
3. Implement backend RBAC + clinician-patient relationship authorization and IDOR tests.
4. Add deterministic synthetic/demo identity seed (EH-008 merged and complete).

Exit gate: Patient/Clinician/Admin can authenticate and protected-resource isolation is proven by tests. COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [recorded final evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884).

## Milestone M2 — Clinical Planning & Evidence — COMPLETE (functional exit)
1. EH-009 (merged / complete): guideline source/template/rule-definition versioning model. See EH-009_CLINICAL_DEFINITION_CONTRACT.md.
2. EH-010 (merged / complete foundation slice): version-pinned CarePlan lifecycle, transactional clinician authorization/audit and deterministic read-only deferred action specification. No CareAction persistence. See EH-010_CARE_PLAN_CONTRACT.md.
   EH-010 itself added no actions; the remaining bounded INITIAL generation gate is now satisfied by EH-014 in step 8. Recurrence is outside this approved M2 scope.
3. EH-011 (merged / complete): immutable paired BP measurements, server-derived entry provenance, Patient self / ACTIVE-assigned Clinician POST and paginated GET/HEAD history. See EH-011_BP_PROVENANCE_CONTRACT.md. Correction/privacy is supplied by Issue #31; bounded INITIAL generation by EH-014 below.
4. EH-012 (merged / complete): operational SCHEDULED/CANCELLED follow-up appointments, immutable clinical encounters and immutable encounter-BP associations. See EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md. No action-linked schedule/closure evidence; FR-024 remains foundation-only.
5. EH-013 (merged / complete): immutable source-scoped record-coverage windows and deterministic normalized evidence queries with explicit unasserted intervals, single-statement snapshot retrieval, authorized product read boundary and internal synthetic writer. No CareAction generation, EACCE classification, coverage-sufficiency decision, FHIR/Synthea ingestion or public HTTP routes. See EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md.
6. EH-015 (merged / complete): immutable observed clinical applicability snapshots and terminal retractions foundation (slice B1). Discriminated age assertion state (`NO_ASSERTION`, `UNKNOWN`, `ASSERTED_VALUE`), exact source partition `(patientId, sourceType, sourceReference, assertionReference)`, research noninterference (hidden complete truth never backfills missing observed data), authorized single-statement read service, and private synthetic observed-input writer. Zero public HTTP routes. B4 is completed by Issue #31; B2 selection and B3 INITIAL-only occurrence are completed by EH-014 below. Recurrence remains outside the frozen scope. See `EH-015_OBSERVED_APPLICABILITY_CONTRACT.md` and `EH-015_VALIDATION.md`.

7. Issue #31 (merged / complete, PR #32): immutable BP correction/exclusion and independent wrong-patient privacy prerequisite.
8. EH-014 (merged / verified, [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33)): explicit assigned-clinician INITIAL generation, protected immutable decision snapshot, durable action, exact traceability, calendar arithmetic, transactional revalidation/idempotency/concurrency/privacy/audit and synthetic runtime proof.

Exit gate: a synthetic patient can receive an active hypertension plan with traceable actions and evidence. **COMPLETE / PASS** at `4a717c4c6be5b1fa9d089823bb093eca43813853`, with successful [exact-main CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) and [M2 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518). Final documentation/status closeout follows the gates recorded below; Issue #28 stays OPEN. FR-024 and AC-004/AC-005 remain later work.

## Milestone M3 — EACCE Core

**NOT STARTED.** Next progression: M2 COMPLETE → M3 EACCE pre-implementation / contract work. The plan below is future scope, not implementation authorization.

1. Freeze typed engine input/output contracts.
2. Implement NOT_DUE, COMPLETED, SCHEDULED, EXEMPT, UNCERTAIN, TRUE_GAP decision logic.
3. Implement reason codes/evidence trace.
4. Implement immutable closure-assessment persistence and stale/superseded behavior.
5. Implement clinician confirm/override workflow and audit.
6. Complete golden-case, edge-case, determinism, and explanation-consistency tests.

Exit gate: all EACCE golden cases pass and new evidence can change current assessment without erasing history.

## Milestone M4 — Clinician & Patient Product UI
1. Implement design tokens/components.
2. Clinician dashboard and patient list.
3. Patient workspace/overview.
4. Care Action Detail with explanation/evidence/review.
5. Patient Home/My Plan/BP measurement flow.
6. Schedule and core loading/empty/error/stale states.
7. Responsive and accessibility QA for critical screens.

Exit gate: clinician and patient golden journeys pass end-to-end.

## Milestone M5 — FHIR/Synthea Research Pipeline
1. Pin Synthea version/config and import fixtures.
2. Implement FHIR R4 adapter for required resource types only.
3. Generate complete synthetic care-action cases and ground truth.
4. Implement corruption engine with deterministic seeds.
5. Implement naive baseline and research input isolation.
6. Add research-integrity tests.

Exit gate: a small reproducible benchmark can run baseline and EACCE on identical observed inputs with hidden ground truth.

## Milestone M6 — Evaluation Lab
1. Implement experiment-run persistence/state machine.
2. Implement PostgreSQL-backed TypeScript worker.
3. Implement metrics: false-gap rate, precision, recall, F1, decision coverage, abstention.
4. Implement Evaluation Lab configuration/results screens.
5. Add experiment smoke E2E.

Exit gate: admin can run a small experiment and view real results/metadata.

## Milestone M7 — Final Experiment & Hardening
1. Freeze EACCE V1, rule set, metrics, and holdout config.
2. Run missingness/corruption/seed matrix and ablations.
3. Produce final reproducible results and limitations.
4. Security regression pass and dependency review.
5. Golden demo seed + `demo:verify` command.
6. Local Docker demo rehearsal and backup/reset procedure.

Exit gate: P0/P1 defects = 0, golden demo passes, final research results are reproducible, and no fake metrics/claims remain.

## Dependency graph

```text
EH-002 docs sync
   ↓
EH-003 bootstrap
   ↓
Identity/data foundation
   ↓
Auth + authorization ───────────────┐
   ↓                               │
Clinical planning/evidence          │
   ↓                               │
EACCE core                          │
   ↓                               │
Product UI golden journey           │
   │                               │
   └──── FHIR/Synthea pipeline ─────┘
                 ↓
          Evaluation Lab
                 ↓
       Final experiments/hardening
```

## Task rules

- One reviewable issue/PR per coherent unit.
- High-risk tasks (auth, authorization, EACCE, clinical rules, migrations, research integrity) require independent second-pass review.
- No future milestone feature is pulled forward without an explicit dependency need.
- Tests/acceptance criteria are part of each implementation issue, not a later QA phase.


## Issue #31 implementation status

BP correction/invalidation prerequisite is merged in PR #32; Issue #31 is CLOSED/completed at the approved baseline. [Contract](BP_CORRECTION_INVALIDATION_CONTRACT.md); [validation](BP_CORRECTION_INVALIDATION_VALIDATION.md). EH-014 R1–R8 and the bounded INITIAL implementation are approved by Issue #28 comment 6317196946. EH-014 has since merged and passed exact-main post-merge CI and the functional M2 exit review, as recorded below. No additional EH number assigned.


## EH-014 merged verification and M2 closeout

[PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**.

The merged INITIAL slice proves an active version-pinned hypertension CarePlan, explicit observed applicability and clinician-selected BP, immutable decision snapshot and source/rule/evidence traceability, one durable INITIAL CareAction, deterministic trigger/+3/+6 calendar schedule, exact retry, concurrency protection, correction/privacy-aware history and atomic audit. [Contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md); [post-merge validation](EH-014_VALIDATION.md#post-merge-validation).

FR-021 — satisfied for the approved Core V1 bounded INITIAL generation scope. FR-024 remains foundation-only / incomplete pending the final SCHEDULED evidence contract. AC-004 (`SCHEDULED`) and AC-005 (`COMPLETED`) remain unsatisfied. M2 completion does not imply completion of all Core V1 acceptance criteria or EACCE.

M2 is COMPLETE for its functional exit criterion. Final repository milestone closeout awaits independent review and merge of this documentation-only PR, exact-main post-merge validation/status verification, and a final M2 completion comment. Issue #28 remains OPEN until those steps finish. Next: M3 EACCE pre-implementation / contract work; M3 has NOT started. No recurrence, EACCE, scheduling/completion classification or design work is added.
