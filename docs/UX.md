# UX scope and V1 audit boundary

CURRENT AUTHORITATIVE UX boundary, **not an approved final UX/navigation specification**. The Live V1 UI exists; older “UI/UX NOT STARTED / DESIGN FROZEN” snapshots do not describe implementation. Issue #72 authorizes an audit only; it does not authorize redesign. [CURRENT_STATUS](CURRENT_STATUS.md), [charter and owner gates](FOUNDATION_CHARTER.md).

Current UI is a **FUNCTIONAL V1 PROTOTYPE / BEFORE BASELINE**. Reusable safety/client boundaries coexist with an unapproved final IA, repeated card hierarchy, technical terminology and incomplete date/content localization. See [frontend/UX audit](FOUNDATION_REBOOT_V2_AUDIT.md#frontend-ux-arabic-brand-and-design-system). Current logo/colors/fonts are not final. No new navigation, terminology or screens are selected here.

## Conceptual workspace responsibilities — scope, not delivery promises

Patient/clinician I2 flows and prescription/pharmacy backend are implemented within accepted contracts. Lab and integrated longitudinal journeys remain future/unauthorized. The following table describes scope responsibilities; it must not be read as a statement that all five Live workspaces exist.

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


Journey C's backend is implemented through pharmacy Slice 2, with no Live pharmacy frontend claim. Journey A still lacks Lab; B is future; D has M2 foundations but lacks I4/I5 integration. This is not final IA or approved user-facing terminology. Future UX/IA/content/Arabic, three visual directions, owner selection, Brand V2, Design System V2 and prototypes precede frontend implementation under the charter. Preserve all doctor-demo screenshots byte-for-byte.
