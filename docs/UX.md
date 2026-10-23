# EgyHealth 360 — Conceptual Journeys and Workspace Scope V3

## Design gate

**DESIGN FROZEN. Product UI/UX NOT STARTED.** Product V3 policy approval and this documentation reconciliation authorize no wireframes, portal screens, components, Design System, branding, typography/color or frontend visual work. Separate explicit design-unfreeze approval is required after scope/domain prerequisites. UX_VALIDATION_V2 and DESIGN_SYSTEM retain historical references only.

This document describes product information flows and access boundaries, not navigation layouts or visual specifications. [PRODUCT](PRODUCT.md) / [D01–D36](PRODUCT_V3_DECISIONS.md) / [SECURITY](SECURITY.md) govern future behavior.

## Five workspace information responsibilities — approved future, not implemented

| Workspace | Conceptual information flow | Access/release boundary |
|---|---|---|
| Patient | Register/login/profile → public discovery/profile/availability → own booking → explicit relationship → released consultation/prescription/lab/follow-up → own longitudinal record/BP/plan/actions and in-app updates | No private clinician notes, drafts, privileged role choice or clinical authoring |
| Doctor | Professional information/availability → own schedule/minimal logistics → current authorized patient consultation → human documentation/orders/prescription/follow-up → clinically appropriate released history/BP/plan/actions | Booking alone no clinical record; private notes author-only under current relationship |
| Laboratory / Diagnostics | Routed order → fulfillment progress/result entry → explicit verification/finalization → release/correction history | Current artifact-scoped staff authority; no whole-record search. Imaging optional in same workspace |
| Pharmacy | Valid signed routed prescription → full-item dispensing → status/history | No prescription alteration, partial/refill/substitution or adherence inference |
| Admin | Operational users/providers/membership/status/config/demo and research administration | No clinical payload, impersonation or fulfillment by ADMIN alone |

## Product journey coverage before design

- A: Register → discover → book → explicit patient authorization/clinician acceptance → consultation → signed/released summary, prescription, test order and follow-up.
- B: Clinician order → routed lab → process/finalize → permitted patient/current-doctor result → longitudinal source history.
- C: Signed prescription → routed pharmacy → full-item dispense → preserved quantity/actor/time → appropriate patient/current-doctor view.
- D: Timeline/follow-up/BP → retained CarePlan/actions → future explicitly contracted EACCE. No care plan/engine prerequisite for A–C.

These are policy-covered journeys, not implemented frontend flows. Source records, operational booking/fulfillment, timeline and audit remain distinct. Current masking also governs revealing references/counts/notifications. Patient-facing future continuity wording must distinguish uncertainty from confirmed unresolved care without invented urgency or diagnostic claims; six EACCE classifications and accessible semantics remain later approved work.

Ordinary UI eventually depends on stable relevant I1–I4 contracts; EACCE presentation additionally I5, and all visual work requires the separate design gate. Nothing here specifies screens/layouts or revives the old Care-action-first navigation.
