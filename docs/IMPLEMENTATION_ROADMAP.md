# Current implementation roadmap

CURRENT AUTHORITATIVE sequencing; execution still requires a separately scoped Product Owner authorization. [CURRENT_STATUS](CURRENT_STATUS.md) owns mutable delivery state. [Charter](FOUNDATION_CHARTER.md) owns decision and milestone health gates. No dates or completion weights are inferred.

## Accepted complete

| Milestone | Accepted boundary / evidence |
| --- | --- |
| M0 | Repository/bootstrap/toolchain/Docker/CI; [EH-003](EH-003_VALIDATION.md) |
| M1 | Identity, sessions, clinical assignment, audit, deterministic demo; [final exit](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884) |
| M2 | Exact-pinned clinical planning/evidence and bounded INITIAL CareActions; [EH-014 exit](EH-014_VALIDATION.md#post-merge-validation); not EACCE |
| V3-G0 | Approved Product V3 reconciliation; [completion](PROJECT.md#v3-g0-completion-evidence) |
| V3-I1 | Entry/directory/organizations/relationships and compatibility exit; [closeout](V3_I1_CLOSEOUT.md) |
| V3-I2 | Booking/consultation/documentation/FollowUpIntent/explicit close, all seven slices; [exit](V3_I2_SLICE7_EXIT_REVIEW.md), [validation](V3_I2_SLICE7_VALIDATION.md) |
| V3-I3 contract | Accepted five-slice contract; [contract](V3_I3_CONTRACT.md); future slice descriptions grant no implementation authorization |
| I3 Slice 1 | Medication catalog + prescription source lifecycle; [implementation](V3_I3_SLICE1.md), [PR #70](https://github.com/abuhmaid28/egyhealth360/pull/70) |
| I3 Slice 2 | Pharmacy routing + full-item dispensing; [implementation](V3_I3_SLICE2.md), [PR #71](https://github.com/abuhmaid28/egyhealth360/pull/71), baseline main `eb61da263ce44db5ca71ffdfea6a87309c8e17ef` |

Pre-final I2 Live UI/hosting and UI polish are implemented/evidenced; they are not acceptance of final V2 design. [Hosted evidence](PRE_FINAL_DOCTOR_DEMO_UI.md). **Overall I3 is incomplete.**

## Foundation acceptance and active Visual Directions

Foundation Reboot V2 Stage 0+1 is complete/accepted: [independent review PASS and PR #73 merge](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6564358810). Verdict B — healthy with non-blocking debt; Stage 1.5 is NOT REQUIRED on reviewed evidence. A newly established P0/P1 defect would require separate triage/remediation authorization, not an automatic fix in Product UX work.

CI Accelerator V2 is independently reviewed PASS and merged through [PR #74 / owner disposition](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565142946). Stage 2 Product UX is accepted/merged through [PR #75 / owner acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565530772), main `248347f72a7c1d4646cbceb7224f0ec1a9d92f06`; post-merge CI 41362415955 SUCCESS. Accepted UXD10–UXD16 and role/task/journey foundation inform IA; UXD19 is planning only.

Stage 3 IA is accepted/merged at `86cc044314c865404a114903bbe417fde00e10ec` through [PR #76 / acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567526978): IA01–IA05, Patient Candidate B and Clinician Candidate B. Post-merge exact-main CI 41377208348 SUCCESS.

Content System + Egyptian Arabic UX is accepted/merged at `80cb2bc27d9439f0e57e5bec320ac9bde0121e87` through [PR #77 / owner acceptance 6568210676](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568210676), accepting CD01–CD07. Exact-main CI 41382337698 SUCCESS. Older pending content wording is adoption-time context.

Brand Research BR01–BR08 is accepted/merged through PR #78 at `0a0e9c2038ecad420e95c2c67ae367129e195839`. A/B/C were rejected; D/E/F and their six logo concepts remain unselected exploration history. The latest [Product Owner authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6574268901) permits exactly one real-frontend implementation gate: **Premium Synthesis — Patient My Care**. Follow the [committed handoff/specification](ui-reference/README_START_HERE.md), not prior visual-direction memory. Scope includes desktop/mobile EN/AR, relevant states, local primitives/tokens and QA evidence. [Implementation review](ui-reference/PATIENT_MY_CARE_IMPLEMENTATION.md). PR #79 remains open/unmerged/auto-merge off. No backend/API/database/security change, wider rollout, final Brand/Design System freeze or production promotion is authorized.

## Product/Design sequence — future authorizations

1. **Stage 2 — Product UX Foundation** accepted; **Stage 3 — Information Architecture** accepted (IA01–IA05, Patient B, Clinician B). CD01–CD07 material terminology is now accepted; later material changes remain owner-gated.
2. Content System and Egyptian Arabic UX accepted/merged (CD01–CD07); no runtime implementation implied.
3. Brand Research BR01–BR08 accepted. **Earlier visual exploration** presented three distinct directions: at least two materially different logo concepts each (**minimum six total**), rationales and comparable Patient + Doctor UI. [V2 review artifacts](visual-directions-v2/README.md) remain exploratory and unselected.
4. **Current bounded exception:** the owner-supplied Premium Synthesis reference authorizes Patient My Care implementation only. Independent implementation review + owner review must precede any wider work; Codex cannot select a global winner.
5. Refinement after direction choice, then a separate **Final Brand V2 approval gate** for final logo/palette/typography; Design System V2 follows approved final choices.
6. High-fidelity Patient + Clinician prototypes; **owner final visual approval**.
7. Frontend Architecture V2, then Frontend V2 implementation.
8. Visual QA against approved prototypes and preserved before/after evidence.

The [charter](FOUNDATION_CHARTER.md#future-productdesign-approval-process--document-only) defines required direction differences, minimum samples and approval rules. Do not finalize the Design System before direction approval or broadly implement React/frontend before owner visual approval. Current V1 screenshots remain byte-identical historical BEFORE evidence.

## Resume domain roadmap only after the reboot/design gates

| Later milestone | Future deliverable and dependency |
| --- | --- |
| I3 Slice 3 — Lab Order | Independently authorized clinician source/catalog/routing + lab acceptance; pharmacy is not an artificial prerequisite for Lab authority |
| I3 Slice 4 — Lab Results | Explicit result verification/finalization/release, corrections/retractions/privacy |
| I3 Slice 5 — Integrated Exit | Combined prescription/pharmacy/lab proof; only this can complete I3 |
| I4 — Longitudinal Continuity | Source-linked timeline, in-app important updates/bounded reminders and approved BP/plan/action integration; preserve one booking authority |
| I5 — EACCE | Bounded deterministic HTN engine, explicit applicability/scheduling/completion/coverage/observed-input/correction/override contracts; input/concept feasibility before implementation |
| Research / Evaluation (I7) | Pinned FHIR R4/Synthea, isolated B0/B1/P1 ground truth, reproducible worker/manifests/counts/metrics; no fabricated results |
| Final Hardening / Presentation / Final Domain (I8) | Final security/data/recovery/holdout/demo/thesis evidence and separately authorized promotion of protected `egyhealth360.vercel.app` |

I3 Slices 3–5, I4, I5/EACCE, AI inference and final-domain promotion remain paused/unauthorized. No research execution starts here. Every major milestone must pass the whole-project health review before the next is authorized.

## Historical plan reconciliation

Old M3–M7 names remain history: M3 EACCE maps to I5; M4 product UI maps to the owner-gated Frontend V2 process (formerly I6); M5/M6 research pipeline/Evaluation Lab map to input feasibility + I7; M7 final hardening maps to I8. No accepted M0–M2 IDs are renamed or reopened. The former I6 placement after I5 is resequenced by issue #72; ordinary Product/UX/Frontend V2 work no longer waits for EACCE.

The [pre-reboot roadmap](https://github.com/abuhmaid28/egyhealth360/blob/eb61da263ce44db5ca71ffdfea6a87309c8e17ef/docs/IMPLEMENTATION_ROADMAP.md) preserves prior wording and evidence. [Capacity planning](PROJECT_PLAN_6_MONTHS.md) requires actual deadline/capacity before commitments; prior dates/percentages are not commitments. Journey A remains incomplete without Lab; backend pharmacy completion is not a claim of Live frontend or longitudinal/research completion.
