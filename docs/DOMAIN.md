# Current domain boundaries

CURRENT AUTHORITATIVE overview at the [CURRENT_STATUS](CURRENT_STATUS.md) baseline. [Architecture](ARCHITECTURE.md) maps ownership; [data inventory](DATA_MODEL.md) and [API](API.md) distinguish executable models/routes from future scope. Accepted I1/I2/I3 contracts define exact behavior, not blanket permission for later slices.

| Domain | Implemented now | Future / not authorized |
| --- | --- | --- |
| Identity/access | Auth/session, own profile, current assignment; operational organizations/memberships; curated directory; bilateral relationship lifecycle | No generalized IAM or ADMIN clinical bypass |
| Access to care | Finite availability, general booking/change/attendance/schedule and preserved EH-012 HTN follow-up | No payment/ERP workflow |
| Consultation | General opening/encounter provenance, human documentation, author-private notes, explicit summary release, FollowUpIntent, explicit close | No inferred clinical completion or automatic artifact release |
| Medication/pharmacy | Curated catalog; prescription lifecycle/validity/privacy; route/accept/full-item dispense and immutable correction/reversal | No partial/refill/substitution/adherence inference |
| Diagnostics | Operational LAB organizations/staff only; Demo shell | I3 Slice 3 orders, Slice 4 results, Slice 5 integrated exit paused |
| Care planning/evidence | M2 exact-pinned catalog/plan/BP/coverage/applicability/INITIAL actions | No EACCE or recurrence |
| Longitudinal/research | Bounded released-source/history reads and internal normalized evidence; worker/engine/FHIR scaffolds | I4 cross-module continuity/notifications, I5 EACCE, research pipeline/evaluation |

## Distinct records and meanings

- **Clinical source records:** encounter/document/problem assertions, signed prescription/order, finalized result and its versions, dispense facts, BP, follow-up instructions, exact-pinned plans/actions/decisions. Preserve source, patient, human actor, clinical occurrence and local recording/signing provenance. Correction is attributable history, not silent overwrite or cross-patient movement.
- **Operational records:** provider/membership/status, availability/booking/change history, fulfillment progress/routing, notification state. They do not prove clinical completion, record coverage, diagnosis or medication use.
- **Timeline projections:** patient/current-doctor authorized views of relevant source events, booking and follow-up milestones. Include appropriate event/recording time, source and correction status. They do not become a second writable clinical truth.
- **Audit:** immutable safe actor/action/target/time provenance, distinct from clinical source history and patient timeline; no raw medical payload store.

Prescription ≠ dispense ≠ patient reported use. Order ≠ result. Booking ≠ clinical relationship ≠ encounter ≠ qualifying completion. CareActionDecision ≠ ClosureAssessment. Record coverage assertions ≠ the existence of a provider organization. Missing/unknown/unreviewed facts never become negative clinical assertions.

## Relationship, privacy and fulfillment

Booking gives minimal identity/time/logistics only. Patient authorization + clinician acceptance establishes a continuing ACTIVE relationship before or at consultation; either may explicitly end it. Every subsequent clinical access checks current authority; neither authorship nor pending results revives an ended relationship. Another doctor needs their own relationship.

Private notes are author-only under current clinical authority. Signed/released patient summaries and permitted final results are separate. Implemented pharmacy and future Lab receive only minimum necessary routed-artifact context and own fulfillment history under [D36](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension). ADMIN is operational, not clinically entitled. Source/history preservation never overrides current wrong-patient masking of payload, references, counts and notifications.

## Consultation and booking semantics

Patient books → explicit relationship → consultation starts/links encounter → clinician documents → optional problem/prescription/test/follow-up → signed/released summary and consultation ends. Not every consultation creates every artifact; ending an encounter does not silently sign drafts or close a CareAction. Preserve actual treating participants separately from the recorder. No hospital admission/reception/ERP subsystem is required.

New booking protects clinician/patient overlap and capacity; finite start/end availability has declared clinic timezone and bounded configurable duration/lead/horizon. Preserve changes and explicit attendance/no-show semantics, safe retries and original reservation on failed replacement. Patient/booked doctor cancellation/replacement is before start/consultation opening. This does not retroactively change EH-012 patient-read-only permissions, post-time cancellation or cancel/create behavior.

## Preserved clinical invariants

Published definitions and exact plan/rule pins are immutable. Existing CareAction requires a CarePlan and remains one bounded INITIAL occurrence per exact plan/rule; no mutable completion lifecycle or recurrence is implemented. M2 snapshots/selection/privacy/atomic audit behavior remain as accepted in [EH-014](EH-014_INITIAL_CARE_ACTION_CONTRACT.md).

Fresh BP is independent evidence. Correction creates a fresh complete paired assertion and terminally excludes its exact predecessor; wrong-patient privacy is independently frozen and does not dynamically propagate through correction chains. Effective evidence removes exclusions/private targets without claiming clinical qualification. See [BP correction contract](BP_CORRECTION_INVALIDATION_CONTRACT.md).

Later EACCE retains NOT_DUE, COMPLETED, SCHEDULED, TRUE_GAP, EXEMPT, UNCERTAIN as time-specific classifications, separate from operational state. It needs explicit later applicability/exemption, relevant schedule, qualifying completion, coverage and correction/stale/override contracts. Existing operational events do not satisfy these by inference. The HTN research scope remains bounded, versioned and source-traceable.

See [DATA_MODEL](DATA_MODEL.md) for the exact implemented model inventory, [SECURITY](SECURITY.md) for current/future authority and [Roadmap V3](IMPLEMENTATION_ROADMAP.md) for dependencies. Legacy V1 domain lifecycle sketches are superseded by actual M0–M2 contracts and this approved conceptual direction, not implemented as new behavior.
