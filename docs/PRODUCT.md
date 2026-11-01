# EgyHealth 360 — Product V3 scope

CURRENT AUTHORITATIVE product scope, distinct from delivery and task authorization. [CURRENT_STATUS](CURRENT_STATUS.md) owns implemented/Live/active/paused truth; [SOURCE_OF_TRUTH](SOURCE_OF_TRUTH.md) classifies accepted contracts and historical evidence. M0–M2, G0, I1, I2, I3 contract and Slices 1/2 are accepted complete; I3 overall is incomplete. Current task is issue #72 Stage 0+1 audit/governance only. The existing V1 UI and logo are not final approval.

## Vision

EgyHealth 360 is an integrated digital healthcare platform that connects patient access, booking, consultation, prescriptions, diagnostics, dispensing and follow-up into one longitudinal healthcare journey, enhanced by structured care coordination and bounded explainable evidence-aware monitoring.

The deployment/demo/research boundary remains a synthetic, free-first, self-hostable graduation prototype. Ordinary healthcare entry, consultation and fulfillment work without a hypertension CarePlan, CareAction or EACCE assessment.

## Product hierarchy

1. **Layer A — Integrated Healthcare Journey:** patient entry → provider discovery → availability → booking → consultation → clinician documentation → prescription/tests → results/dispensing → follow-up.
2. **Layer B — Longitudinal Continuity:** visits, human-entered problems, prescriptions, medications/dispenses, diagnostics, BP, follow-up, CarePlans and CareActions form a coherent authorized record.
3. **Layer C — Research Differentiator:** bounded explainable evidence-aware continuity/EACCE distinguishes unresolved, scheduled, completed and uncertain care without diagnosing or choosing treatment.

## Five workspaces — approved scope versus delivery

The table describes approved full workspace scope, not delivery of every feature. Patient/clinician I2 Live journeys and I3 prescription/pharmacy backend are implemented; Lab, integrated continuity and research remain future. [CURRENT_STATUS](CURRENT_STATUS.md) separates accepted, implemented and hosted evidence.

| Workspace | Approved capability / target scope | Essential boundary |
|---|---|---|
| Patient | Self-register, login/session, permitted own profile/demographics; discover doctors/specialties/clinics/availability; book/cancel/reschedule own appointments; view released summaries/problems, prescriptions, medication/dispense history, lab orders/final results, follow-up, timeline, BP and applicable CarePlan/actions; receive in-app updates | No privileged-role selection, clinical authoring or arbitrary action closure |
| Doctor | Curated professional/public profile and clinic/specialty; finite availability/own schedule; authorized consultation, complaint/problems/diagnoses, minimal allergy/intolerance review including unknown/not-reviewed, measurements, protected notes, released summary/instructions, signed prescriptions/orders, follow-up and longitudinal review | Explicit patient authorization + clinician acceptance establish continuing current relationship; booking alone grants logistics only |
| Laboratory / Diagnostics | Routed clinician order, meaningful processing, result entry, explicit verification/finalization, release, correction/retraction and history | Artifact-scoped current staff/org/membership authority; minimum necessary context; no production LIS; imaging optional within diagnostics |
| Pharmacy | Routed valid signed prescription, full prescribed quantity per item, separate item fulfillment, attributable dispense history and appropriate status | No prescription editing, partial quantity, refill, substitution or adherence inference |
| Admin | Users/providers/clinicians/specialties/labs/pharmacies, role/status/membership, safe demo/configuration and Evaluation Lab operations | ADMIN alone grants no clinical payload, impersonation, signing or fulfillment rights |

Small curated catalogs and representative synthetic fixtures suffice. Doctor/site/specialty counts are fixture choices, not architecture limits. Use simple provider/clinic/location concepts, not an enterprise facility hierarchy. Keep the deterministic M1 seed intact; integrated fixtures are separately versioned.

## Complete patient journey

Register/login → discover doctor → review public profile/clinic/availability → select and book → manage appointment → explicitly authorize relationship and receive clinician acceptance before or at consultation → encounter → optional human-entered problem/diagnosis, prescription, lab order and follow-up → released summary/instructions → authorized lab result and pharmacy full-item dispensing → longitudinal history → follow-up booking/home BP → CarePlan/CareActions where applicable → future EACCE under separately approved evidence contracts.

Not every consultation creates every artifact. Signed source records preserve actors/provenance; amendments/addenda/retractions replace silent overwrites. Clinician-private notes remain author-only under current clinical authority, separate from patient-released summaries. Source records, operational state, timeline projections and audit are different concepts. Dispensing proves supply, not ingestion/adherence.

## Scope tiers

### Tier 1 — MUST HAVE

- Bounded patient self-registration/login/session/own profile; managed privileged accounts. No paid identity verification, production identity-assurance claim or mandatory full password-recovery subsystem.
- Curated doctor discovery, specialties/clinic/public professional information; finite clinician-published availability with declared clinic timezone, overlap/capacity protection and clear booking cutoff. Duration, lead and horizon are bounded configuration choices.
- Own booking/cancellation/rescheduling/history and doctor schedule; safe retries and failed replacement preserving the original. Patient/booked-clinician cancellation/replacement occurs before start/consultation opening; explicit attendance/no-show semantics; no fees.
- Explicit patient authorization + clinician acceptance; continuing relationship until either ends it; current authority on later access and preserved relationship history, with no permanent author entitlement.
- General consultation/encounter with actual treating provenance, human-entered problems/diagnoses and minimal allergy/intolerance review, private notes and signed/released summary/instructions.
- Small medication catalog, clinician-signed prescriptions/items, preserved instructions/quantity/unit/clinician-entered validity, cancellation/replacement and reconciliation of prior dispensing; full-item-only pharmacy fulfillment.
- Clinician lab order, explicit lab routing, meaningful processing, result entry/verification/finalization, final release and versioned corrections/retractions. **Laboratory is mandatory.** Same actor may enter and verify with truthful provenance; drafts stay hidden and no mandatory doctor-release queue is required in this synthetic demo.
- Follow-up intent even without a booked slot, then one operational booking authority; preserve EH-012 historical behavior.
- Source-linked authorized longitudinal record; in-app important events/basic bounded reminders; existing BP and exact-pinned CarePlan/INITIAL CareAction foundations; all five workspaces' authorization, privacy/history and golden-journey verification.
- Retained academic deliverable later: bounded HTN EACCE, six classifications, immutable assessments/explanations, clinician review/override and reproducible isolated B0/B1/P1 evaluation. This is not a prerequisite for ordinary healthcare journeys.

### Tier 2 — SHOULD HAVE if capacity permits

Bounded imaging narrative/report fulfillment using shared diagnostics principles; additional measurement types with their own contracts; richer reminders/preferences, catalog/admin support, history/reconciliation and demo breadth. Imaging is not required for the mandatory diagnostics journey, adds no sixth portal and may not be claimed complete without implementation and proof.

### Tier 3 — LATER / NON-GOAL

Payments, insurance, video consultation, national marketplace economics/ratings/advertising, delivery, stock/procurement/inventory ERP, hospital ERP, full LIS/analyzer integration, PACS/DICOM, medical-image upload infrastructure, diagnostic/image AI, autonomous treatment/dose recommendations, real-patient deployment, paid notification infrastructure, generalized multi-role IAM/permission builder, arbitrary rule editor and broad disease/recurrence engines. Partial quantities/refills/substitution are outside the frozen release, not optional polish; changing them needs a new scope decision.

## Differentiation and research boundary

Booking, profiles, appointments, clinical records, prescriptions, labs, medication history and follow-up are expected platform features. EgyHealth 360 connects them with a continuous cross-provider journey, structured plans/actions, provenance-aware evidence, patient next steps, explicit uncertainty and later explainable EACCE decisions/clinician overrides.

The bounded HTN contribution remains CR-HTN-FU-001, B0/B1/P1, controlled missingness and isolated ground truth. Retain NOT_DUE, COMPLETED, SCHEDULED, TRUE_GAP, EXEMPT and UNCERTAIN as future product classifications; UNCERTAIN is abstention, not truth. Operational booking, result or dispense never implies eligibility, coverage sufficiency, clinical completion or CareAction closure. No diagnostic AI, autonomous prescribing or dose choice is permitted.

## Golden journeys and success

| Journey | Required backend/domain proof before claiming completion |
|---|---|
| A — Access and consultation | Register → discover → book → explicit relationship → consult → released summary, prescription, test order and follow-up; no prior CarePlan |
| B — Laboratory | Clinician order → authorized routed lab → process/finalize → released patient/current-doctor result → timeline; corrections/history and wrong-provider denials |
| C — Pharmacy | Signed valid prescription → authorized routed pharmacy → full-item dispense → preserved quantity/unit/actor/time → patient/current-doctor status; no duplicate entitlement/adherence claim |
| D — Continuity | Longitudinal sources → follow-up → BP → preserved CarePlan/actions → later explicitly contracted EACCE; no automatic bridges or private-data leaks |

These are complete target journeys. A remains partial without Lab; B is future; C backend is accepted through I3 Slice 2, with no hosted/UI claim; D has M2 foundations and future I4/I5 integration. Graduation success requires real domain behavior, negative authorization/history/concurrency proof and honest reproducible academic results. If deadline/capacity cannot support the thin Tier 1 journey plus research, raise the specific scope tradeoff rather than silently omit fulfillment.

The approved [D01–D36 record](PRODUCT_V3_DECISIONS.md), [Roadmap V3](IMPLEMENTATION_ROADMAP.md), [requirements](REQUIREMENTS.md) and [security policy](SECURITY.md) govern later work. Product V2's narrower positioning/exclusions are superseded through ADR-031; historical contracts remain unchanged. Final Product/UX/Brand/Design decisions follow the [charter owner gates](FOUNDATION_CHARTER.md); this scope document grants no design or implementation authority.
