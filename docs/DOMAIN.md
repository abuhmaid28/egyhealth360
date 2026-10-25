# EgyHealth 360 — Domain Boundaries V3

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Security hotfix and Slices 1–4 COMPLETE; PR #44 merged at `e75671ec0adfdf0f0d71485eebb104728b619e91`, exact-main [Bootstrap 40195060034](https://github.com/abuhmaid28/egyhealth360/actions/runs/40195060034) SUCCESS. [Slice 5 bilateral lifecycle](V3_I1_SLICE5.md) IMPLEMENTED / IN REVIEW under [authorization 6401378826](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6401378826). V3-I1 INCOMPLETE; Issue #39 OPEN; Slice 6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.

The [approved I1 contract](V3_I1_CONTRACT.md#minimal-domain-foundation) bounds I1 to Organization, Specialty, OrganizationMembership and RelationshipRequest around reused identity/session/audit/assignment foundations. ClinicianPatientAssignment remains the sole effective clinical grant; no fabricated legacy consent or competing authority. Slice 1 is merged/verified; [Slice 2](V3_I1_SLICE2.md) implements Organization/OrganizationMembership and fixed staff roles (COMPLETE). [Slice 4](V3_I1_SLICE4.md) implements Specialty and curated publication for review; RelationshipRequest remains unimplemented. I1 NOT COMPLETE; Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 implemented / in review; Slice 6 NOT AUTHORIZED.

## Status and implementation boundary

Product V3 policy is APPROVED; V3-I1 overall is NOT COMPLETE; EACCE is NOT STARTED and design is FROZEN. [Approved D01–D36](PRODUCT_V3_DECISIONS.md) is the policy input. The concepts below are **APPROVED FUTURE V3 DOMAIN — NOT YET IMPLEMENTED** unless explicitly identified as M0–M2 foundations or the accepted Slice 2 operational foundation, COMPLETE Slice 3 registration/profile and Slice 4 directory in review. This broad domain overview adds no physical schema or HTTP contract; the linked I1 contract freezes its bounded enrollment dispositions and concurrency guarantees for later implementation.

## Boundaries and reuse

| Domain | Accepted M0–M2 foundation | Approved future addition |
|---|---|---|
| Identity, providers and access | User, PatientProfile, ClinicianProfile, Session, ACTIVE/ENDED assignment history, own-data/assigned-clinician checks | Bounded patient registration/profile; simple curated provider/clinic/location/specialty/public doctor information; fixed lab/pharmacy staff membership; explicit relationship authorization/acceptance/ending |
| Access to care | EH-012 HTN-only FollowUpAppointment | Finite clinician-published availability, general booking/changes/schedule and one operational booking authority; follow-up intent remains meaningful without a slot |
| Consultation and documentation | Immutable ClinicalEncounter and encounter-BP association | Actual treating/provider/booking provenance, general consultation, human-entered complaint/problem/diagnosis/minimal allergy review, signed private notes and released summaries/addenda |
| Medications and pharmacy | None | Curated medication definition, signed prescription/items, clinician-entered instructions/validity, cancellation/replacement and full-item dispense/reversal history; no adherence inference |
| Diagnostics | None | Clinician lab order, routed lab processing, result entry/verification/finalization/release and versioned amendment/retraction. Imaging optional Tier 2 using shared principles |
| Longitudinal record/coordination | BP history and internal normalized evidence candidates | Authorized source-linked cross-module projection, important in-app updates/bounded reminders and follow-up links; no generic audit feed |
| Care planning/evidence | Published definition versions, exact-pinned CarePlan, immutable BP/coverage/applicability/correction/privacy, INITIAL CareAction and protected decision | Product integration under later explicit boundaries; no automatic bridge from a diagnosis/result/booking into applicability, coverage or action closure |
| Care closure/review | Package bootstrap only; generation decision is not a closure assessment | Later deterministic EACCE, immutable assessments/evidence explanations, stale/superseded handling and clinician override preserving engine output at I5 |
| Audit/research/admin | Append-only audit primitives; worker/FHIR scaffolds | Bounded operational administration/Evaluation Lab and isolated reproducible HTN B0/B1/P1 pipeline; ground truth never reaches observed engine inputs |

## Distinct records and meanings

- **Clinical source records:** encounter/document/problem assertions, signed prescription/order, finalized result and its versions, dispense facts, BP, follow-up instructions, exact-pinned plans/actions/decisions. Preserve source, patient, human actor, clinical occurrence and local recording/signing provenance. Correction is attributable history, not silent overwrite or cross-patient movement.
- **Operational records:** provider/membership/status, availability/booking/change history, fulfillment progress/routing, notification state. They do not prove clinical completion, record coverage, diagnosis or medication use.
- **Timeline projections:** patient/current-doctor authorized views of relevant source events, booking and follow-up milestones. Include appropriate event/recording time, source and correction status. They do not become a second writable clinical truth.
- **Audit:** immutable safe actor/action/target/time provenance, distinct from clinical source history and patient timeline; no raw medical payload store.

Prescription ≠ dispense ≠ patient reported use. Order ≠ result. Booking ≠ clinical relationship ≠ encounter ≠ qualifying completion. CareActionDecision ≠ ClosureAssessment. Record coverage assertions ≠ the existence of a provider organization. Missing/unknown/unreviewed facts never become negative clinical assertions.

## Relationship, privacy and fulfillment

Booking gives minimal identity/time/logistics only. Patient authorization + clinician acceptance establishes a continuing ACTIVE relationship before or at consultation; either may explicitly end it. Every subsequent clinical access checks current authority; neither authorship nor pending results revives an ended relationship. Another doctor needs their own relationship.

Private notes are author-only under current clinical authority. Signed/released patient summaries and permitted final results are separate. Lab/pharmacy receive only minimum necessary routed-artifact context and own fulfillment history under [D36](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension). ADMIN is operational, not clinically entitled. Source/history preservation never overrides current wrong-patient masking of payload, references, counts and notifications.

## Consultation and booking semantics

Patient books → explicit relationship → consultation starts/links encounter → clinician documents → optional problem/prescription/test/follow-up → signed/released summary and consultation ends. Not every consultation creates every artifact; ending an encounter does not silently sign drafts or close a CareAction. Preserve actual treating participants separately from the recorder. No hospital admission/reception/ERP subsystem is required.

New booking protects clinician/patient overlap and capacity; finite start/end availability has declared clinic timezone and bounded configurable duration/lead/horizon. Preserve changes and explicit attendance/no-show semantics, safe retries and original reservation on failed replacement. Patient/booked doctor cancellation/replacement is before start/consultation opening. This does not retroactively change EH-012 patient-read-only permissions, post-time cancellation or cancel/create behavior.

## Preserved clinical invariants

Published definitions and exact plan/rule pins are immutable. Existing CareAction requires a CarePlan and remains one bounded INITIAL occurrence per exact plan/rule; no mutable completion lifecycle or recurrence is implemented. M2 snapshots/selection/privacy/atomic audit behavior remain as accepted in [EH-014](EH-014_INITIAL_CARE_ACTION_CONTRACT.md).

Fresh BP is independent evidence. Correction creates a fresh complete paired assertion and terminally excludes its exact predecessor; wrong-patient privacy is independently frozen and does not dynamically propagate through correction chains. Effective evidence removes exclusions/private targets without claiming clinical qualification. See [BP correction contract](BP_CORRECTION_INVALIDATION_CONTRACT.md).

Later EACCE retains NOT_DUE, COMPLETED, SCHEDULED, TRUE_GAP, EXEMPT, UNCERTAIN as time-specific classifications, separate from operational state. It needs explicit later applicability/exemption, relevant schedule, qualifying completion, coverage and correction/stale/override contracts. Existing operational events do not satisfy these by inference. The HTN research scope remains bounded, versioned and source-traceable.

See [DATA_MODEL](DATA_MODEL.md) for the exact implemented model inventory, [SECURITY](SECURITY.md) for current/future authority and [Roadmap V3](IMPLEMENTATION_ROADMAP.md) for dependencies. Legacy V1 domain lifecycle sketches are superseded by actual M0–M2 contracts and this approved conceptual direction, not implemented as new behavior.

## Current Slice 5 applicability

The authoritative implementation extension is [V3_I1_SLICE5](V3_I1_SLICE5.md), with [executed validation](V3_I1_SLICE5_VALIDATION.md). It adds participant-only request/accept/decline/withdraw/history/exact assignment end, additive request/end provenance and current-authority locks; the sole clinical grant remains ClinicianPatientAssignment. Earlier slice-local “future/not implemented” notes are historical to those slices. Slice 4 is COMPLETE via PR #44 / exact-main CI 40195060034. Slice 5 is in review; Slice 6 is not authorized. No I1 completion, booking, fulfillment, EACCE or design work is claimed.
