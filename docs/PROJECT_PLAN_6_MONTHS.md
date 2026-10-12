# EgyHealth 360 — Six-Month Execution Plan V1

## Planning assumption
Approximate project window: 6 months starting 12 Oct 2026. Calendar dates are planning aids, not academic deadlines; supervisor/course deadlines override them if formally provided.

## Execution model
- AI agents perform implementation, technical research synthesis, testing, documentation drafting, and second-pass review.
- Student team coordinates, approves scope decisions, understands deliverables, presents, and submits.
- No default dependency on field interviews, doctor visits, surveys, or real-patient data.
- Work proceeds through GitHub Issues -> issue branch -> PR -> automated checks -> independent review for high-risk areas -> merge.

## Cadence
Two-week sprints with a lightweight checkpoint at the end of each sprint.

Recommended checkpoint questions:
1. What merged?
2. Which acceptance criteria/tests prove it?
3. What changed in the thesis/report?
4. What is blocked?
5. Did scope grow without approval?
6. Can the current demo still run?

---

# Month 1 — Deep foundation + executable bootstrap
Approx. 12 Oct–11 Nov 2026

## Goals
- finish EH-004 Deep Planning Audit;
- merge documentation/research deepening;
- unpause EH-003 only after gate review;
- bootstrap monorepo/tooling/CI/Docker;
- establish executable skeleton without business-feature expansion.

## Sprint 1
- literature/related work
- competitor evidence
- clinical-rule source audit
- formal research protocol/metrics
- diagrams/traceability/UX validation
- thesis structure
- six-month plan/risk register

## Sprint 2
- EH-003 Bootstrap V2
- independent review of architecture/tooling
- local developer/demo startup verification
- update thesis Chapter 5 implementation baseline

## Exit gate
- repository source of truth consistent;
- bootstrap CI green;
- all planned apps/packages start/build;
- no FastAPI/Python/old-scope reintroduction;
- thesis skeleton exists.

---

# Month 2 — Identity, authorization, and data foundation
Approx. 12 Nov–11 Dec 2026

## Goals
- executable Prisma domain foundation;
- server-side sessions;
- role + relationship authorization;
- audit foundation;
- deterministic synthetic/demo identity seed.

## Expected issue groups
1. users/profiles/clinician-patient assignments
2. migration/constraints foundation
3. login/logout/session lifecycle
4. CSRF/session security
5. RBAC + relationship authorization
6. IDOR test matrix
7. audit primitives

## Independent review mandatory
- authentication
- authorization
- migrations/security

## Exit gate
- Patient/Clinician/Admin can authenticate;
- patient isolation proven by tests;
- unassigned clinician access denied;
- admin overreach tested;
- clean migration/seed workflow works.

---

# Month 3 — Clinical planning, evidence, and EACCE core
Approx. 12 Dec 2026–11 Jan 2027

## Goals
- guideline/rule versioning;
- care plans/actions;
- BP evidence/provenance;
- follow-up/encounter/coverage windows;
- pure TypeScript EACCE V1;
- immutable assessments and clinician review.

## Sequence
1. guideline source + rule-definition persistence
2. care-plan lifecycle
3. deterministic/idempotent care-action generation
4. BP measurement + provenance
5. follow-up + encounter evidence
6. RecordCoverageWindow
7. freeze engine input/output contract
8. implement six closure states
9. explanation reason codes
10. immutable assessment persistence/re-evaluation
11. clinician confirm/override
12. golden/edge/determinism tests

## Exit gate
- all golden closure cases pass;
- TRUE_GAP vs UNCERTAIN behavior proven;
- new evidence creates new assessment without overwriting history;
- independent EACCE review complete.

---

# Month 4 — Product UI + FHIR/Synthea pipeline
Approx. 12 Jan–11 Feb 2027

## Parallel streams
### Product stream
- design tokens/components
- clinician dashboard/patient list
- patient overview
- Care Action Detail
- Patient Home/My Plan
- BP form
- schedule
- all critical loading/empty/error/stale/permission states
- responsive/RTL/accessibility pass

### Research-data stream
- Synthea v4.0.0 pinned generation
- FHIR R4 adapter
- eligibility/code-set freeze
- complete-record index-case builder
- ground-truth builder
- corruption engine
- B0/B1 comparators
- research-integrity tests

## Exit gate
- clinician golden journey E2E;
- patient golden journey E2E;
- small reproducible benchmark executes B0/B1/P1 on identical observed inputs;
- no ground-truth leakage.

---

# Month 5 — Evaluation Lab + development experiments
Approx. 12 Feb–11 Mar 2027

## Goals
- experiment persistence/state machine;
- PostgreSQL-backed TypeScript worker;
- metric implementation + independent unit tests;
- Evaluation Lab UI;
- Experiment Results UI;
- run development benchmark across corruption matrix;
- fix implementation defects without inspecting/tuning on final holdout.

## Required checks
- metric formula fixtures
- deterministic corruption
- failed-run persistence
- observable/silent missingness behavior
- real metrics only in UI
- paired input equality B0/B1/P1

## Exit gate
- 1,000-case development benchmark reproducible;
- charts/results generated from real runs;
- protocol implementation matches docs;
- engine/rules/metrics ready for freeze candidate.

---

# Month 6 — Final holdout, hardening, thesis, and demo
Approx. 12 Mar–11 Apr 2027

## Week 1 — Freeze
Freeze/tag:
- clinical rule
- engine
- comparators
- FHIR normalization
- eligibility concepts
- corruption engine
- metrics
- final Synthea config/seed

## Week 2 — Final experiments
- generate locked holdout
- run observable matrix
- run silent-missingness robustness matrix
- store raw counts/manifests
- compute CI/statistical comparisons
- no result-driven unversioned tuning

## Week 3 — Discussion + hardening
- error analysis
- security regression
- dependency review
- accessibility regression
- P0/P1 bug closure
- demo reset/backup procedure

## Week 4 — Final delivery package
- thesis finalization
- screenshots/diagrams
- presentation deck
- supervisor-facing competitor/problem/contribution summary
- demo script
- likely viva questions/answers
- local Docker demo rehearsal
- offline backup/demo contingency

## Exit gate
- golden demo passes from clean reset;
- P0/P1 defects = 0;
- final experiment reproducible;
- thesis numbers match saved experiment results;
- presentation claims match verified evidence;
- no placeholder/fake metrics remain.

---

# Buffer policy
Do not schedule 100% of available six-month time as feature work.

Reserve approximately:
- 10% for unexpected technical/toolchain problems;
- 10% for review, bugs, supervisor feedback, and documentation correction.

If schedule pressure appears, reduce optional scope before weakening testing/research integrity.

## Scope cuts in priority order
Cut first:
1. cosmetic animations/polish
2. optional exports
3. non-critical admin convenience features
4. Arabic content completeness beyond architecture/critical demo needs
5. optional charts

Do NOT cut to save time:
- authorization tests
- EACCE golden tests
- research-integrity tests
- reproducibility manifests
- ground-truth isolation
- critical UX error/loading states
- thesis evidence accuracy

---

# Risk register

| Risk | Probability | Impact | Mitigation | Trigger/action |
|---|---|---|---|---|
| Scope explosion | High | High | fixed Core V1 + traceability | reject features without approved problem/requirement |
| AI agent adds old scope/architecture | Medium | High | AGENTS/PROJECT/ADRs + PR review | stop PR, correct source-of-truth conflict |
| Authorization/IDOR bug | Medium | Critical | relationship auth tests + second-pass review | block merge/release |
| EACCE logic bug | Medium | Critical | golden/edge/determinism tests + independent review | block dependent milestones |
| Clinical rule guessed/unsourced | Low-Med | Critical | versioned source audit | mark unresolved; do not implement guess |
| Synthea data mismatch/code issue | Medium | Medium-High | pin tag/commit/artifact hash; inspect FHIR; adapter fixtures | version adapter/concept set |
| Ground-truth leakage | Low-Med | Critical | separate types/storage/runtime tests | invalidate affected experiment runs |
| EACCE lowers false gaps only by abstaining | Medium | High | always report recall + coverage | discuss trade-off; no misleading claim |
| Silent missingness defeats EACCE | Expected limitation | Medium | explicit robustness matrix | report honestly as limitation |
| Final holdout accidentally tuned against | Low-Med | High | freeze/tag before run | generate new versioned holdout if violated |
| Docker/demo environment failure | Medium | High | `demo:verify`, local backup/reset | use tested offline/local fallback |
| Thesis written too late | Medium | High | update report every sprint | chapter checkpoint each sprint |
| Supervisor changes requirement | Medium | Medium-High | record constraint/change decision | impact analysis before execution |
| Agent outputs code team cannot explain | Medium | High | simple architecture + documented decisions + viva prep | generate explanation/training materials per milestone |

---

# Student-team workload policy
The plan must not depend on team members manually writing production code, conducting field visits, or personally debugging frameworks.

Human work is primarily:
- scope/decision approval;
- supervisor communication;
- understanding merged architecture/method/results;
- presentation/demo rehearsal;
- submission logistics.

AI agents and automated tooling perform the technical execution subject to repository tests/review gates.

# Progress accounting
Overall progress should be reported by milestone exit gates, not by number of files or lines of code.

Recommended rough project-weight model:
- Planning/deep research: 20%
- M0 bootstrap: 5%
- M1 identity/security: 10%
- M2 clinical planning/evidence: 15%
- M3 EACCE: 15%
- M4 product UI: 12%
- M5 research pipeline: 10%
- M6 Evaluation Lab: 6%
- M7 final experiment/hardening/report/demo: 7%

Weights are tracking aids, not grading claims.
