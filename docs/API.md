# Current API boundary

CURRENT AUTHORITATIVE overview at the [CURRENT_STATUS](CURRENT_STATUS.md) baseline. [OpenAPI](openapi.json) contains **82 distinct path templates**, including prescription/catalog and pharmacy. These are implemented repository routes, not proof that every route is deployed or integrated into the Live UI. No OpenAPI bytes or API behavior change in this reboot.

## Implemented HTTP groups

All paths are under `/api/v1`; exact methods/bodies/bounds/errors are in OpenAPI and accepted contracts.

| Group | Route families and ownership |
| --- | --- |
| Readiness/auth | `/health`, `/auth/login`, `/auth/logout`, `/auth/me`; patient-only `/auth/register` |
| Own/legacy patient profile | `/me/profile`, `/patients/{patientId}/profile`; current own/assignment boundaries |
| Public directory | `/directory/specialties`, `/directory/clinics`, `/directory/providers[/{publicId}]`, provider `/availability` |
| Relationships | `/me/relationship-requests` detail/accept/decline/withdraw and `/me/relationships` detail/end |
| Availability | `/me/availability` and exact slot withdrawal |
| General booking | `/me/bookings` detail/cancel/reschedule/attendance/correct; `/me/schedule`; booking-scoped `/consultation` opening/recovery |
| Consultation documents | `/consultations/{consultationId}/documents` with detail/sign/sign-release/addenda/corrections/privacy; `/me/summaries` and `/patients/{patientId}/summaries` detail |
| FollowUpIntent | Consultation-scoped intents/detail/release/correction/booking-link/replacement/privacy; own/current-clinician released reads |
| Explicit close | `/consultations/{consultationId}/close`; no automatic signature/release/action closure |
| Prescription/catalog | `/medications`, exact medication `/settings`; consultation prescriptions/detail/edit/sign/cancel/replace/privacy; own/current-clinician signed-source reads |
| Pharmacy | `/pharmacy-destinations`; prescription pharmacy-routes/withdrawals/reroutes; exact `/pharmacies/{pharmacyId}/routes` queue/detail/accept/item dispense/fact correction/reversal |
| BP/EH-012 | Patient-scoped BP measurements, legacy follow-up appointments/cancel, clinical encounters and exact BP associations |

Organizations/memberships, directory maintenance, scheduling configuration, M2 clinical catalog/CarePlans/coverage/applicability/INITIAL actions include principal-checked internal services; their existence does not imply a public generic ADMIN/clinical API. No Lab, I4 notification/timeline, EACCE, experiment or AI endpoint is implemented. Accepted future contract names are not executable routes.

## Current enforcement

Server-owned sessions/identity, HttpOnly cookies, Origin/Fetch Metadata/CSRF on state-changing requests, strict bounded input, safe errors and no-store/HEAD behavior remain per-resource contracts. Own-data/current clinical assignment grants are distinct from pharmacy's exact active user/session/org/membership/routed-artifact grant. Private drafts/notes and wrong-patient restricted payload/IDs/counts/history/conflicts remain suppressed. No ADMIN clinical override.

Clinical mutation keys/replay are explicitly scoped, reauthorized and privacy-checked; no automatic mutation retry is introduced. History/audit/current eligibility remain distinct. [Security](SECURITY.md), [I2](V3_I2_CONTRACT.md), [I3](V3_I3_CONTRACT.md).

## Retained accepted slice notes

These notes record each bounded slice's introduction. Old authorization, inventory and exclusions apply to that historical slice; current route coverage is the inventory above/OpenAPI. “Live” in old API notes means an executable route, not verified current hosted deployment parity.

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

## Historical I2 Slice 2 availability boundary

[Exact scheduling API and security contract](V3_I2_SLICE2.md#http-and-projection): GET/HEAD `/directory/providers/{publicId}/availability`, GET/HEAD/POST `/me/availability`, PUT `/me/availability/{slotId}/withdraw`, all under `/api/v1`. Public allowlist is id/providerId/clinicId/startAt/endAt/timeZone/bookable=true; no role widens it. Own history is operational, with current clinician/session/profile. Publication/withdrawal additionally require exact current clinic/member/directory authority and strict Origin/CSRF/input checks. ADMIN configuration stays internal. OpenAPI now has 28 paths / 26 schemas. Booking and all later I2 APIs remain unimplemented and unauthorized; older slice-specific API inventories above retain their historical scope.

## Slice 6 Follow-up Intent

The exact new bounded routes, strict inputs, author/released projections, status and replay semantics are in [Slice 6](V3_I2_SLICE6.md) and [OpenAPI](openapi.json). Existing EH-012 routes remain unchanged. Clinical authority comes solely from current ClinicianPatientAssignment; Booking linkage grants none. The Slice 6 runtime verifier is wired into accelerated CI before smoke and cleanup.

## Slice 7 explicit Consultation Close

`PUT /api/v1/consultations/{consultationId}/close` accepts exactly `{operationKey,expectedVersion}` (consultation OPEN version 1). Only the exact booked/actual treating clinician with current session/account/profile/assignment and exact active source clinic/membership/provider/affiliation authority may close. Booking grants zero clinical authority. Atomically persist Consultation CLOSED/version 2 and Booking CONSULTED, server-owned actual close time/actor/assignment, immutable CLOSE event/operation and minimized audit. Exact replay returns the retained result after current authority; changed payload conflicts; failure rolls everything back with reusable key. No caller close timestamp or actor.

200 `{data:{id,encounterId,bookingId,state,bookingState,version,closedAt,providerId,clinicId}}`; CLOSED/CONSULTED/version 2 are fixed. Same strict browser/parser/no-store and minimized BOOKING errors as opening; only PUT, `Allow: PUT`, bodyless HEAD 405. Close signs/releases/completes nothing else. See [exact contract, locks and proof](V3_I2_SLICE7_EXIT_REVIEW.md). No other consultation API is introduced.

## I2 Live closeout: booking-scoped consultation recovery

`GET /api/v1/me/bookings/{bookingId}/consultation` (HEAD bodyless) recovers the exact current treating consultation context after reload. Requires the same current clinical authority as opening/close: exact booked and actual treating clinician, valid current session, active patient and clinician, current ACTIVE/null-ended assignment, and exact current clinic/membership/provider/affiliation. Booking or past authorship grants no access. Public directory hiding alone does not revoke current care. Other roles, inaccessible/unopened bookings and withdrawn authority receive uniform 404.

No query or request body; canonical lowercase UUIDv4 and path, `Cache-Control: no-store`. Result `{data:{id,encounterId,bookingId,providerId,clinicId,openedAt,closedAt,state,bookingState,version}}`, with OPEN/IN_CONSULTATION/version 1/closedAt null or CLOSED/CONSULTED/version 2/server close time. No clinical content, patient/profile/grant identifiers, operation key, or historical command receipt is returned. Recovery performs zero writes. This minimal I2 gap fix enables reload-safe documentation and explicit close; it introduces no general consultation browser or patient clinical entitlement. The merged close PUT contract is unchanged.

## V3-I3 Slice 1 prescription source

The implemented catalog, author commands and patient/current-assignment signed reads are specified in [Slice 1](V3_I3_SLICE1.md) and the additive OpenAPI schemas. Every mutation is keyed; edits/sign/cancel/replace require an expected version. No pharmacy or lab endpoint exists in this slice.

## V3-I3 Slice 2 pharmacy fulfillment

[Slice 2](V3_I3_SLICE2.md) defines explicit clinician route/withdraw/reroute, exact pharmacy membership queue/detail/accept, full-item dispense and append-only correction/reversal endpoints. Signed prescription items now expose truthful bounded routing/dispense history and binary fulfillment state. Normal fulfillment and explicit correction/history purposes remain distinct; staff receive no general patient browser.
