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
4. Add deterministic synthetic/demo identity seed.

Exit gate: Patient/Clinician/Admin can authenticate and protected-resource isolation is proven by tests.

## Milestone M2 — Clinical Planning & Evidence
1. Implement guideline source/template/rule-definition versioning model.
2. Implement care-plan lifecycle and idempotent care-action generation.
3. Implement BP measurements with provenance.
4. Implement follow-up appointments and clinical encounters.
5. Implement record-coverage windows and normalized evidence queries.

Exit gate: synthetic patient can receive an active hypertension plan with traceable actions and evidence.

## Milestone M3 — EACCE Core
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
