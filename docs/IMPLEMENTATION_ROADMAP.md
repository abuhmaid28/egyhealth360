# Implementation Roadmap V3

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

## Current gates

Product V3 policy is APPROVED ([D01–D36 and lineage](PRODUCT_V3_DECISIONS.md)). V3-G0 documentation reconciliation is COMPLETE ([verified closeout](PROJECT.md#v3-g0-completion-evidence)); Product V3 is the repository source of truth. V3-I1 Slice 2 is COMPLETE; Slice 3 implementation is COMPLETE; I1 overall COMPLETE, Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 COMPLETE. EACCE and product UI are NOT STARTED. Design remains FROZEN until separate explicit approval. This roadmap starts no implementation and assigns no new EH numbers.

## Preserved completed milestones

| Historical ID and name | Status and evidence |
|---|---|
| M0 — Repository Reboot / Bootstrap | COMPLETE: EH-002 documentation and EH-003 monorepo/tooling/Docker/CI. [M0 validation](EH-003_VALIDATION.md) |
| M1 — Identity, Authorization, and Core Data Foundation | COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`: EH-005–008 identity/session/auth/assignment/audit/deterministic demo. [Final exit evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884) |
| M2 — Clinical Planning & Evidence | COMPLETE: EH-009 definitions, EH-010 CarePlan, EH-011 BP, EH-012 follow-up/encounter/BP links, EH-013 coverage, EH-015 applicability, Issue #31 correction/privacy, EH-014 bounded INITIAL. [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33), [functional exit PASS](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518), [post-merge validation](EH-014_VALIDATION.md#post-merge-validation) |

Issue #28 is CLOSED/completed; verified main `ea777ce71c3639a37ec015739a12f0fadc0b4dcc` includes the M2 documentation closeout. Existing contracts, migration history, validations and IDs remain intact. M2 proves only its bounded INITIAL exit; FR-024 remains foundation-only/incomplete and AC-004/AC-005 remain unsatisfied. Historical slice deferrals are not new work authorizations.

## V3 sequence — I1 COMPLETE; I2 Slice 1 COMPLETE; Slice 2 IMPLEMENTED / IN REVIEW; Slices 3–7 and I3 NOT AUTHORIZED

| Milestone | Dependencies and approved future scope | Future exit evidence required |
|---|---|---|
| **V3-G0 — Scope & Authorization Freeze** | **COMPLETE**: policy approved, PR #36 merged, exact-main CI PASS, Issue #35 CLOSED/completed | [Verified completion evidence](PROJECT.md#v3-g0-completion-evidence); no implementation authorized |
| **V3-I1 — Integrated Domain & Access Foundations** | G0 COMPLETE; [I1 contract APPROVED](V3_I1_CONTRACT.md), Slice 1 merged/verified, [Slice 2 implementation](V3_I1_SLICE2.md) COMPLETE, I1 COMPLETE and Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 COMPLETE; patient registration/profile, simple provider/clinic/specialty/public profiles, bounded lab/pharmacy actor/membership, relationship establishment/ending, visibility/history/access policy | Legacy regressions preserved; own-data/public boundary/ACTIVE assignment/org/membership isolation and revocation proof; artifact fulfillment authority is I3 |
| **V3-I2 — Booking & Consultation** | I1 COMPLETE; [I2 contract](V3_I2_CONTRACT.md) Slice 1 COMPLETE; [Slice 2](V3_I2_SLICE2.md) only authorized and IMPLEMENTED / IN REVIEW; Slices 3–7 NOT AUTHORIZED. Future scope: finite availability, booking/cancel/reschedule/schedule, general consultation/encounter linkage, actual treating provenance, problems/diagnoses/minimal allergy review, private notes/released summary, follow-up intent | Journey A's access/booking/consultation/summary/follow-up portion without a pre-existing CarePlan; booking contention/history/privacy/IDOR evidence. Full A additionally requires I3 prescription/test-order sources |
| **V3-I3 — Prescription, Diagnostics & Pharmacy** | I1–I2 signed source/clinical authority; curated medication catalog, prescription/items/validity/cancel/replace, full-item dispensing, lab order/result/finalization/release, correction/privacy | Complete A's prescription/test-order portion plus journeys B/C, valid entitlement/routing, cross-provider denial, suspension, correction/history/concurrency proof. Laboratory required; imaging optional Tier 2 |
| **V3-I4 — Longitudinal Continuity Integration** | I2–I3 + retained M2; authorized source-linked timeline, in-app important updates/bounded reminders, follow-up booking, BP/CarePlan/CareAction connections and separately versioned integrated fixture | Journey D and combined A–D backend proof; one booking authority, source/audit distinction, private payload/reference/count/notification masking |
| **V3-I5 — Bounded EACCE & Research Input Contracts** | I4 plus explicit action-linked scheduling, qualifying completion/coverage, observed-input/concept feasibility and correction/stale/override contracts | Six classifications, immutable explainable assessments/reviews; shared deterministic engine and frozen B0/B1/P1 observed-input boundary; no recurrence/new disease |
| **V3-I6 — Product UI** | Stable relevant implemented domain/contracts **and separate explicit design-unfreeze approval**; ordinary journey depends on I1–I4, EACCE-facing behavior additionally I5 | Later approved five-workspace user journeys and accessibility/authorization evidence; no design authorized now |
| **V3-I7 — Research Pipeline & Evaluation** | I5 engine/input boundary; approved product integration for Evaluation Lab presentation; pinned FHIR/Synthea/concept sets, controlled corruption, isolated truth, worker/metrics | Real reproducible B0/B1/P1 manifests/counts/metrics, observable/silent missingness, no fabricated results |
| **V3-I8 — Final Evaluation & Hardening** | Product/research evidence; freeze before untouched final holdout, final security/history/recovery/demo/thesis checks | Accurate implemented/evaluated claims, reproducible holdout results, golden demo and no known P0/P1 defects |

The order is dependency-safe with these qualifications: lab and pharmacy fulfillment depend on their respective signed sources, not artificially on each other. Research-input/concept-set feasibility needed by I5 must happen before I5, not wait for I7. Final experiment results are not a prerequisite for ordinary product UI; domain readiness and explicit design approval are. Security, history, testing, hardening and documentation occur throughout; I8 is the final pass.

## Superseded/resequenced unstarted planning history

These historical IDs are preserved, not reused or renamed. Their former scope does not authorize execution.

| Old milestone | Historical status | V3 cross-reference |
|---|---|---|
| M3 — EACCE Core | NOT STARTED; superseded/resequenced | V3-I5; integrated journey foundations now precede EACCE |
| M4 — Clinician & Patient Product UI | NOT STARTED; superseded/resequenced | V3-I6; five future workspaces, separate design gate |
| M5 — FHIR/Synthea Research Pipeline | NOT STARTED; superseded/resequenced | Input feasibility before I5; full pipeline at I7 |
| M6 — Evaluation Lab | NOT STARTED; superseded/resequenced | I7 and approved product integration |
| M7 — Final Experiment & Hardening | NOT STARTED; superseded/resequenced | I8; hardening also continuous |

The [pre-V3 roadmap at the reconciliation baseline](https://github.com/abuhmaid28/egyhealth360/blob/ea777ce71c3639a37ec015739a12f0fadc0b4dcc/docs/IMPLEMENTATION_ROADMAP.md) preserves the former plan verbatim. The old M2 → M3 → UI progression is no longer the active sequence.

## Delivery and readiness rules

Re-estimate V3 using actual academic deadline/capacity and explicit contingency ([D33 planning](PROJECT_PLAN_6_MONTHS.md)); no prior date/weight/buffer percentage is carried forward as a commitment. Prefer complete thin journeys over enterprise depth; raise a concrete owner scope/schedule tradeoff if Tier 1 plus bounded research is infeasible.

Each future coherent unit needs a ready issue, approved contracts, appropriate acceptance/security/history/concurrency tests and reviewable PR. High-risk auth/clinical/research/migration work needs independent second-pass review. No future feature is pulled forward merely because it is listed here. Issue #39 records the approved I1 contract, merged/verified Slice 1 and separate Slice 2 authorization (6366843150). Slice 2 completed that gate in PR #41 at `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9` / CI 40010140478 SUCCESS. Slice 3 is COMPLETE after PR #43 / exact-main CI 40116846242. Slice 4 completed its gate in PR #44 / exact-main CI 40195060034. Slice 5 completed its gate via PR #45 / exact-main CI 40252309467. Slice 6 completed independent review, approved merge in PR #46 and exact-main CI 40433851129 SUCCESS. Final documentation closeout PR #47 merged; exact-main CI 40496696728 SUCCESS; Issue #39 CLOSED / completed. Issue #48 comment 6452226103 authorizes Slice 2 only; IMPLEMENTED / IN REVIEW in this PR. Slices 3–7 remain NOT AUTHORIZED. Design/UI FROZEN.

## Current I2 Slice 2 applicability

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

## V3-I2 contract/readiness boundary

See the [I2 contract](V3_I2_CONTRACT.md) and [Slice 2 implementation](V3_I2_SLICE2.md) for the frozen boundaries and current delivery. Only finite availability and operational scheduling configuration are implemented in Slice 2. Full Journey A is incomplete. Historical evidence and D01–D36 retain their original meaning.
