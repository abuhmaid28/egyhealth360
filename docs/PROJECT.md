# EgyHealth 360 — Project State

Current Slice 3 delivery: [Slice 1 and Slice 2 COMPLETE; Slice 3 implemented / in review; I1 overall NOT COMPLETE; Slice 4+ NOT AUTHORIZED; EACCE NOT STARTED; design FROZEN](V3_I1_SLICE3.md). [Authorization](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6374281944); starting main `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9`, exact-main [CI 40010140478](https://github.com/abuhmaid28/egyhealth360/actions/runs/40010140478) SUCCESS. No later slice is authorized.

## Authoritative status

| Area | Status |
|---|---|
| Product V3 policy | **APPROVED** — [final Product Owner approval](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6346537901) |
| V3-G0 documentation reconciliation | **COMPLETE**; PR #36 merged, exact-main CI PASS, Issue #35 CLOSED/completed; [closeout evidence](PROJECT.md#v3-g0-completion-evidence) |
| M0 / M1 / M2 | **COMPLETE**; accepted historical IDs, contracts and evidence preserved |
| V3-I1 | **Contract APPROVED**; Slice 1 merged/verified; [Slice 2 implementation](V3_I1_SLICE2.md) COMPLETE; I1 overall **NOT COMPLETE**, Slice 3 **implemented / in review**; Slice 4+ **NOT AUTHORIZED** |
| EACCE implementation | **NOT STARTED**; old M3 is superseded/resequenced to V3-I5 |
| Product UI/design | **NOT STARTED / DESIGN FROZEN**; separate explicit design-unfreeze approval required |

Product V3 is now the repository source of truth. Policy approval is not implementation completion or blanket implementation authorization; it does not retroactively redefine M0–M2.

## V3-G0 completion evidence

[PR #36](https://github.com/abuhmaid28/egyhealth360/pull/36) merged at `2ad6ecadcdd973bc7f61d6613d9b4d2c5ef81ddb`. Exact-main post-merge [Bootstrap CI 39881994529](https://github.com/abuhmaid28/egyhealth360/actions/runs/39881994529) completed **SUCCESS** (`event=push`, `branch=main`, exact head SHA above). [Issue #35 final verification](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6355210754) records **V3-G0 COMPLETE**; Issue #35 is **CLOSED/completed**. This closes V3-G0 reconciliation only. Subsequent [Issue #39](https://github.com/abuhmaid28/egyhealth360/issues/39) approves the I1 contract; [Slice 1 authorization](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6356123914) permits documentation adoption only.

## Current direction

EgyHealth 360 is an integrated digital healthcare platform that connects patient access, booking, consultation, prescriptions, diagnostics, dispensing and follow-up into one longitudinal healthcare journey, enhanced by structured care coordination and bounded explainable evidence-aware monitoring.

The integrated journey is Layer A, longitudinal continuity Layer B, bounded HTN EACCE Layer C. Approved future workspaces are Patient, Doctor, Laboratory/Diagnostics, Pharmacy and Admin in one application. Ordinary care does not require a CarePlan/EACCE. See [PRODUCT](PRODUCT.md) for scope and [approved D01–D36/lineage](PRODUCT_V3_DECISIONS.md) for policy. Final owner approval is product-policy approval only.

## Accepted implementation foundation

| Milestone | Accepted delivered scope and evidence |
|---|---|
| M0 — Repository Reboot / Bootstrap | COMPLETE: EH-002 documentation, EH-003 tooling/monorepo/Docker/CI; EH-004 deep audit. [Bootstrap validation](EH-003_VALIDATION.md) |
| M1 — Identity, Authorization, and Core Data Foundation | COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`: EH-005 users/profiles/assignments/audit, EH-006 sessions/auth/CSRF, EH-007 own/ACTIVE-assignment authorization, EH-008 deterministic seed and runtime proof. [Final exit evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884) |
| M2 — Clinical Planning & Evidence | COMPLETE: EH-009 definitions, EH-010 exact-pinned plans, EH-011 immutable BP, EH-012 HTN follow-up/encounters/BP links, EH-013 coverage/normalized evidence, EH-015 observed applicability, Issue #31 correction/privacy, EH-014 immutable INITIAL generation. [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33), [functional exit PASS](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518), [post-merge validation](EH-014_VALIDATION.md#post-merge-validation) |

Issue [#28](https://github.com/abuhmaid28/egyhealth360/issues/28) is CLOSED/completed. `ea777ce71c3639a37ec015739a12f0fadc0b4dcc` was the original verified main baseline for PR #36, including M2 documentation closeout. [Final M2 completion record](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6330230875) and [successful exact-baseline CI 39702452808](https://github.com/abuhmaid28/egyhealth360/actions/runs/39702452808) preserve that final closeout evidence. Older closeout-pending/Open statements in immutable validation reports describe an earlier review point and do not reopen M2. These are historical results, not CI rerun for this documentation change.

M0–M2 were built under the narrower V2 scope. They remain valuable accepted foundations, not completed V3 booking/consultation/fulfillment. Preserve contract text, migrations, fixed M1 seed and validation/issue/PR evidence. Exact implemented models are in [DATA_MODEL](DATA_MODEL.md); actual routes are in [API](API.md) and [OpenAPI](openapi.json). Internal services are not automatically public APIs.

FR-021 is satisfied only for the bounded INITIAL scope. FR-024 is foundation-only/incomplete; AC-004 SCHEDULED and AC-005 COMPLETED remain unsatisfied. There is no recurrence or EACCE implementation. Existing CareActionDecision is immutable generation provenance, not a closure assessment.

## Next gates

1. V3-G0 is COMPLETE. Slice 1 contract adoption is merged in [PR #40](https://github.com/abuhmaid28/egyhealth360/pull/40) at `a03c0b63a0ed44bcf39a32428002af0c92edc7e0`; exact-main [CI 39948145751](https://github.com/abuhmaid28/egyhealth360/actions/runs/39948145751) SUCCESS. [Authorization 6366843150](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6366843150) permits Slice 2 only. Its [bounded implementation](V3_I1_SLICE2.md) is COMPLETE: PR #41 merged at `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9`, exact-main CI 40010140478 SUCCESS.
2. Confirm actual academic deadline/capacity and re-estimate selected V3 scope under D33; old dates/weights/buffer percentages are not V3 commitments.
3. Slice 3 is authorized by comment 6374281944. Independent exact-head Slice 3 review, successful CI, explicit Product Owner merge approval and exact-main verification precede any separate Slice 4 authorization. I1 overall remains NOT COMPLETE.
4. Follow [Roadmap V3](IMPLEMENTATION_ROADMAP.md). Old unstarted M3–M7 are superseded/resequenced; EACCE moves to I5. Final schedule/completion/coverage/observed-input feasibility contracts precede EACCE.

**Design is frozen** even after V3 policy approval/PR #36 merge: no screens, wireframes, Design System, branding, UI/UX or frontend visual work until separate explicit approval after scope/domain prerequisites. Existing visual documents are historical, not ready-to-implement instructions.

## Architecture and execution

Retain Next.js/TypeScript, NestJS modular monolith, PostgreSQL 18/Prisma 7, shared packages, TypeScript experiment worker/FHIR adapter scaffolds, Docker and GitHub Actions. No microservice rewrite, FastAPI/Python runtime or ML service. Current auth/own-data/ACTIVE-assignment checks remain in force; future staff/relationship policies require reviewed extensions.

AI agents execute issue-scoped work; the student team owns decisions, understands/presents deliverables and coordinates submission. No default fieldwork/interview/survey/real-patient dependency. Use authoritative sources, desk research and synthetic data. See [EXECUTION_POLICY](EXECUTION_POLICY.md).

## Retained research direction

CR-HTN-FU-001 controlled uncomplicated HTN follow-up; B0 naive overdue, B1 normalized coverage-blind, P1 EACCE. Primary false-gap rate must be reported with true-gap recall and decision coverage/abstention. Ground truth remains isolated; missingness/uncertainty is explicit. The integrated product does not broaden the clinical rule or benchmark.

## Required reading

- Every task: [AGENTS](../AGENTS.md), this file, current issue, [EXECUTION_POLICY](EXECUTION_POLICY.md), relevant accepted contracts/tests/branch/PR.
- Product/planning: [PRODUCT](PRODUCT.md), [approved decisions](PRODUCT_V3_DECISIONS.md), [DECISIONS](DECISIONS.md), [REQUIREMENTS](REQUIREMENTS.md), [TRACEABILITY](TRACEABILITY_MATRIX_V1.md), [ROADMAP](IMPLEMENTATION_ROADMAP.md), [capacity planning](PROJECT_PLAN_6_MONTHS.md).
- Backend: [DOMAIN](DOMAIN.md), [DATA_MODEL](DATA_MODEL.md), [ARCHITECTURE](ARCHITECTURE.md), [SECURITY](SECURITY.md), [API](API.md), plus the exact M0–M2 slice contracts and validation reports referenced there.
- Conceptual journeys only: [UX](UX.md). UX_VALIDATION_V2 and DESIGN_SYSTEM are historical/frozen references, not permission to design.
- Research: [RESEARCH](RESEARCH.md), [TESTING](TESTING.md), [clinical source audit](research/CLINICAL_RULE_SOURCE_AUDIT.md), [rule catalog](research/CLINICAL_RULE_CATALOG_V1.md), [protocol](research/EXPERIMENT_PROTOCOL_V1.md), [metrics](research/METRICS_SPEC_V1.md), literature/related-work/competitor matrices in `research/`.
- Reporting: [THESIS_STRUCTURE_V1](THESIS_STRUCTURE_V1.md). [Deep audit](DEEP_PLANNING_AUDIT_SUMMARY.md) and [V1 diagrams](diagrams/SYSTEM_DIAGRAMS_V1.md) retain historical context; they do not supersede V3 policy or actual implementation evidence.
