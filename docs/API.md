# EgyHealth 360 — API Status and V3 Resource Boundaries

[I1 future logical API groups](V3_I1_CONTRACT.md#future-logical-api-and-architecture-map) are approved contract scope, not live endpoints or OpenAPI changes. Slice 1 adopts documentation only; runtime NOT STARTED, Slice 2 NOT AUTHORIZED. Availability is I2 and fulfillment I3.

## Implemented HTTP boundary

The unchanged [OpenAPI](openapi.json) and accepted M0–M2 contracts define actual behavior at baseline `ea777ce71c3639a37ec015739a12f0fadc0b4dcc`. REST under `/api/v1`, JSON, ISO timestamps, backend session/CSRF/Origin and per-resource authorization remain in force. Future conceptual names are not live routes.

| Implemented group | Actual routes relative to `/api/v1` | Scope |
|---|---|---|
| Readiness | `/health` | Public database-backed readiness |
| Authentication | `/auth/login`, `/auth/logout`, `/auth/me` | EH-006 frozen operations |
| Patient profile | `/patients/{patientId}/profile` | Minimal own/ACTIVE-assigned read; no registration/update/list/summary |
| BP | `/patients/{patientId}/blood-pressure-measurements` | EH-011 create/history with current correction/privacy filtering |
| HTN follow-up | `/patients/{patientId}/follow-up-appointments` and `/{appointmentId}/cancel` beneath it | EH-012 clinician create/cancel, own/assigned history; not general patient booking |
| Encounter / BP associations | `/patients/{patientId}/clinical-encounters`, `/{encounterId}/blood-pressure-measurements/{measurementId}` and `/{encounterId}/blood-pressure-associations` beneath it | EH-012 immutable HTN encounter/link and minimized history |

Methods, validation, pagination, response/error shapes and status mappings remain exactly those in OpenAPI/contracts; this reconciliation changes none. Do not infer that generic examples in former API planning were frozen routes. Current patient reads require own identity; clinician access requires current ACTIVE assignment; ADMIN denied clinical payload. No staff role, patient registration, marketplace or fulfillment API exists.

## PLANNED / NOT IMPLEMENTED — approved V3 resource groups

These are conceptual groups only; no endpoint paths, request fields, final enums or HTTP mappings are added/frozen here.

| Future group | Product boundary |
|---|---|
| Patient enrollment/profile | Bounded patient-only registration and own permitted profile updates; privileged accounts managed, no user-selected role |
| Public directory | Curated published doctor/specialty/clinic/profile/availability; no private account or patient data |
| Professional schedule and booking | Clinician availability/own schedule; own patient booking/cancel/reschedule and preserved history; minimum logistics access before relationship |
| Clinical relationship | Explicit patient authorization + clinician acceptance and ending; ongoing current checks, history, no authorship bypass |
| Consultation | Actual treating/booking/encounter links, human-entered problems/minimal allergy context, protected notes and signed/released summaries/addenda |
| Prescribing and medication history | Signed prescription/items/validity/cancel/replace; prescribed versus dispensed versus actual-use distinctions |
| Diagnostics | Routed lab order/processing/result/finalization/release/corrections; imaging optional, not implemented |
| Pharmacy fulfillment | Current routed valid prescription access and full-item dispense/history; no prescription modification/adherence inference |
| Longitudinal coordination | Authorized source-linked timeline, follow-up intent/booking, in-app important updates/reminders; current privacy on payload/references/counts |
| Operational administration | Bounded users/providers/memberships/status/catalog/demo/config; no clinical entitlement or impersonation |
| Later continuity/research | Approved product exposure of retained M2 internal services; later EACCE/review and isolated Evaluation Lab, not protected generation snapshot export |

Future exposure needs milestone-specific auth, IDOR/provider isolation, privacy/history, retry/concurrency and input contracts before implementation. [D36](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension) requires current user/org/membership/artifact authority for lab/pharmacy; booking or role alone never grants whole-record access. Separate released summaries/final results from private notes/drafts. Current OpenAPI must change only in a separately authorized implementation task.

The former V2 conceptual endpoint list is superseded as an active API plan; it never overrode frozen EH-006/007/011/012 paths. Source/history operations and timeline/audit are different resources. EACCE stays a future shared TypeScript package, not an HTTP microservice.

## Accepted implementation notes

The slice notes below retain implemented contracts and limitations. Statements that a slice left OpenAPI unchanged are historical relative to that slice; the file as committed on current main governs today's complete interface.

## EH-006 frozen authentication contract

Login/logout/me are frozen in `openapi.json` and `EH-006_AUTH.md`. Health remains public. Authentication does not imply clinical-resource authorization. Current split-port browser integration requires later same-origin routing; no CORS expansion is provided.

## EH-007 frozen authorization contract

GET `/patients/{patientId}/profile` returns only profile id/displayName to the
patient owner or ACTIVE-assigned clinician. ADMIN is denied. Uniform object 404,
no query/body, no-store and HEAD semantics are frozen in `openapi.json` and
`EH-007_AUTHORIZATION.md`. This does not implement clinical summary/list APIs.


## EH-011 frozen BP API

POST /patients/{patientId}/blood-pressure-measurements creates one paired immutable row
(201); GET/HEAD provide authorized paginated history (200), page/pageSize default 1/20,
max pageSize 100, measuredAt DESC/id DESC. PATIENT self / ACTIVE-assigned CLINICIAN only;
ADMIN denied. POST requires EH-006 session/Origin/CSRF, application/json (optional UTF-8),
16 KiB, no query or Idempotency-Key. Exactly systolic/diastolic integer tokens, unit mmHg,
measuredAt with strict offset/calendar/millisecond rules. No medical plausibility limits.
POST is non-idempotent: identical accepted requests create separate rows. No automatic retry.
HTTP exposes id/patientId/systolic/diastolic/unit/measuredAt/createdAt/sourceKind only;
internal recordedByUserId is never projected. All responses no-store; HEAD performs
GET checks with no body; unsupported methods 405 Allow GET, HEAD, POST. Exact errors,
input/time/provenance and transaction contracts are in openapi.json and
EH-011_BP_PROVENANCE_CONTRACT.md. Former V2 conceptual endpoint names are not implemented contracts.

## EH-012 frozen follow-up and encounter API

POST and paginated GET/HEAD /patients/{patientId}/follow-up-appointments; POST /patients/{patientId}/follow-up-appointments/{appointmentId}/cancel. POST and paginated GET/HEAD /patients/{patientId}/clinical-encounters; POST /patients/{patientId}/clinical-encounters/{encounterId}/blood-pressure-measurements/{measurementId}; paginated GET/HEAD /patients/{patientId}/clinical-encounters/{encounterId}/blood-pressure-associations. The final read returns association references only; EH-011 retains BP-resource history. These are the frozen follow-up names for this implemented slice.

Create accepts exactly scheduledAt/purpose or occurredAt/purpose and returns 201; cancellation/link accept {}. Cancel returns 200; new association 201/exact pair 200/different encounter 409 after full scope authorization. Internal creator/recorder/canceller omitted. Patient reads own; assigned clinician writes; Admin denied. Strict timestamp/JSON/UUID, session/Origin/CSRF, no-store/no ETag/304, canonical pagination default 1/20/max100, generic 404 and method Allow contracts are frozen in openapi.json and EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md. No action-linked SCHEDULED or qualifying completion evidence is claimed.

## EH-013 record coverage and normalized evidence boundary

EH-013 introduces zero public HTTP routes. `docs/openapi.json` is byte-for-byte unchanged.
RecordCoverageWindow is written internally by machine processes (demo/bootstrap, synthetic benchmark fixtures).
Normalized evidence queries are internal repository operations exposed via authorized persistence methods (`packages/db/src/normalized-evidence.ts`), returning canonical timelines and evidence candidates directly for internal and downstream evaluation use.

## EH-015 observed clinical applicability boundary

EH-015 introduces zero public HTTP routes. `docs/openapi.json` is byte-for-byte unchanged (SHA-256: `37a52027d416859f0c676fce86e8d7b347eae16a5d11398748e5ab17cdfcd83d`).
ObservedClinicalApplicabilitySnapshot and Retraction models are written internally by synthetic input processors and research benchmark fixtures.
Querying applicability points is an internal operation exposed via the authorized persistence wrapper (`packages/db/src/observed-applicability.ts`), returning point-in-time snapshots and mechanical tuple comparisons directly for internal clinical planning and evaluation use.

## Issue #31 changes to existing BP read semantics

No new HTTP endpoints. BP GET/HEAD history omits wrong-patient privacy targets (and WRONG_PATIENT exclusions defensively); ordinary history still contains nonprivate excluded facts. Encounter association GET/HEAD likewise omits private BP references, including pagination counts. Existing association POST denies private targets and new links to excluded targets; an existing exact nonprivate link remains an authorized no-op. Normalized internal BP/encounter candidates additionally omit every terminal exclusion. HTTP response schemas, authentication/CSRF/no-store/error contracts remain as before. OpenAPI descriptions reflect these actual read changes. Internal amendment operations/retry semantics are defined in [BP_CORRECTION_INVALIDATION_CONTRACT.md](BP_CORRECTION_INVALIDATION_CONTRACT.md), without a product raw-history route.


## EH-014 bounded INITIAL implementation — merged and verified

EH-014 adds zero HTTP routes and leaves OpenAPI unchanged. Root internal factory createCareActionPersistence provides previewSelection, generateInitialAction, inspectAction, listActions and close with genuine current principals. Preview/generation are assigned-clinician-only; ordinary reads allow self-patient/current assigned clinician and expose minimized action fields only. No raw decision snapshot route, forensic role or autonomous/research generation API. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) and [validation](EH-014_VALIDATION.md).

Status evidence: [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. [Post-merge validation](EH-014_VALIDATION.md#post-merge-validation). No behavioral or R1–R8 contract change is introduced by this status closeout.
