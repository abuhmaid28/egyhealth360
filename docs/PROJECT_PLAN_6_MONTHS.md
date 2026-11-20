# EgyHealth 360 — V3 Capacity and Delivery Planning

## Status and supersession — D33

CURRENT AUTHORITATIVE capacity constraints, not a dated delivery commitment. [CURRENT_STATUS](CURRENT_STATUS.md) owns delivery; [roadmap](IMPLEMENTATION_ROADMAP.md) owns sequencing. Issue #72 now inserts the owner-gated Foundation/Product/Design/Frontend V2 process before remaining Lab work. Prior six-month dates/weights/buffers remain invalid as current commitments.

## Inputs needed before a delivery commitment

1. Actual supervisor/course submission and demonstration deadlines, including any mandated interim artifacts.
2. Available agent execution/review capacity and student coordination/understanding/presentation time.
3. Remaining approved Tier 1 vertical slices and bounded research deliverable, with implementation contracts, tests, independent reviews, integration and documentation effort.
4. Research concept/input feasibility, dataset eligibility yield, reproducibility/holdout execution and demo environment constraints.
5. Explicit contingency for security/history/concurrency defects, review iterations, CI/runtime failures and final thesis/demo rehearsal; size it using these inputs rather than copying a fixed percentage.

These inputs are not verified by policy approval. Missing schedule data does not reopen the approved choices or authorize implementation. A later planning action must record estimates/assumptions and uncertainty before promising dates.

## Dependency plan and scope control

Use the [current roadmap](IMPLEMENTATION_ROADMAP.md): accepted foundations through I3 Slice 2 → Foundation Reboot/review → conditional Stage 1.5 → owner-gated Product/Design/Frontend V2 → remaining I3 Lab/results/exit → I4 → I5 → research/evaluation → final hardening/presentation/domain. Preserve M0–M2 IDs and old M3–M7 as superseded/resequenced planning history.

This is a dependency spine, not all-to-all serial waiting: prepare I5 research-input feasibility early; lab/pharmacy need their own signed sources; Frontend V2 integrates existing implemented contracts after explicit design/prototype approval; future Lab UI additionally needs its separately authorized backend. Final research results are not a prerequisite for ordinary UI. Security, clinical-history integrity, verification and documentation occur throughout.

Prioritize complete thin journeys A–D over enterprise depth. Curated catalogs, finite availability, simple clinic/provider representation, full-item dispensing and laboratory fulfillment are frozen scope choices. Counts/slot length/horizon are fixture/configuration choices, not architectural limits. Imaging, extra measurement types, richer reminders/catalog/admin and fixture breadth are SHOULD, removed first if necessary.

If actual capacity cannot cover Tier 1 **and retained bounded academic research**, raise that concrete owner scope/schedule tradeoff. Do not silently drop lab/pharmacy, replace backend behavior with a visual simulation, promote excluded partial/refill/substitution behavior, or report policy PASS as implementation completion.

## Execution and reporting cadence

Use issue → ready contracts/acceptance → branch → checks → independent review where risk requires → PR/merge → exact-main verification. No EH number or implementation issue is allocated by this reconciliation. AI agents execute technical work; students own product decisions, supervisor communication, understanding/presentation and submissions. No default fieldwork/interview/survey/real-patient dependency.

At each lightweight checkpoint record merged evidence, requirement/acceptance status, current risks, thesis changes, next prerequisites and whether scope/claims changed. Progress is milestone exit evidence, not file/line counts or old weighted percentages. Report queued/in-progress CI honestly.

## V3 risks and planning controls

| Risk | Control / escalation |
|---|---|
| Integrated breadth crowds out research or finish | Thin vertical slices and explicit re-estimate; cut SHOULD first; owner decision for genuine Tier 1 tradeoff |
| Clinical/provider authorization leakage | Deny-by-default ownership/current relationship/routed artifact policies, D36 suspension and independent review |
| History/privacy loss | Source versions/addenda/retractions; independent wrong-patient masking across timeline/counts/notifications; preserve migrations/contracts |
| Race/retry inconsistency | Later reviewed reservation/dispense/replacement contracts and contention proof, no invented legacy behavior |
| Unsupported clinical inference | Human authoring/source-traceable rules; no adherence, coverage, eligibility or action-completion inference |
| Synthea/input mismatch or hidden truth leakage | Concept feasibility before I5, pinned protocol/observed types, isolation tests and versioned manifests |
| Apparent benefit only from abstention / silent missingness | Report false-gap rate with recall/coverage and required silent robustness analysis |
| Holdout contamination / fabricated claims | Freeze before untouched holdout, retain failed runs and actual raw counts; new version if tuned |
| Design starts early / integration rework | Separate design-unfreeze approval; stable domain first; historical design files are not active instructions |
| Demo environment/thesis pressure | Local self-hosted rehearsal/recovery with preserved history, regular evidence-backed chapter updates and viva preparation |

No dates, estimates, success probabilities, delivery commitments or new implementation authorization are created here.
