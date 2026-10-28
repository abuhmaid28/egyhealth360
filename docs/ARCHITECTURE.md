# EgyHealth 360 — Architecture and V3 Extension Boundary

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

[Slice 2](V3_I1_SLICE2.md) operational memberships are COMPLETE. [Slice 3](V3_I1_SLICE3.md) adds a narrow patient-entry persistence service and isolated HTTP boundary, reusing existing schema/auth/password/audit. Slice 1 COMPLETE; Slice 3 COMPLETE; I1 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 COMPLETE. Membership remains operational only; D36 artifact authority is I3.

## Current architecture — retained

One Next.js/TypeScript application, one NestJS/TypeScript modular-monolith API, PostgreSQL 18/Prisma 7 and shared packages in a pnpm monorepo. Retain REST/OpenAPI, server-side sessions/HttpOnly cookies, Argon2id, CSRF/Origin controls, Docker Compose and GitHub Actions. No microservice/FastAPI/Python/ML rewrite, Redis/BullMQ, Kafka/RabbitMQ, GraphQL, Kubernetes, MongoDB or paid auth/AI dependency.

| Workspace package | Actual baseline status versus intended responsibility |
|---|---|
| `apps/web` | Bootstrap web surface; integrated product workspaces/UI NOT STARTED, design FROZEN |
| `apps/api` | Health, auth/session, scoped profile/BP/EH-012 and Slice 4 public directory HTTP behavior; [API inventory](API.md) and OpenAPI govern actual routes |
| `packages/db` | Implemented M0–M2 persistence/internal principal-checked services and Slice 2/4 operational-directory and relationship models/fourteen migrations; exact [31-model inventory](DATA_MODEL.md) |
| `packages/clinical-rules` | Exact approved HTN definition/manifest/validation; no arbitrary rule editor/evaluator |
| `packages/closure-engine` | Bootstrap import check only; EACCE implementation NOT STARTED |
| `packages/fhir-adapter` | Scaffold; no completed import pipeline |
| `apps/experiment-worker` | Database health polling scaffold, not a running experiment pipeline |
| `packages/ui` | Scaffold; no V3 Design System/components authorized |
| `packages/config` | Shared validated runtime configuration |

Node 24.21.0 and pnpm 10.34.6 remain pinned. Local/self-hosted Docker Compose without paid services is the demo target; optional cloud hosting does not imply production healthcare readiness. Browser/API same-origin integration remains later reviewed work, not a new CORS allowance.

## Approved modules — bounded delivery versus future scope

[Product V3](PRODUCT.md) targets **Patient, Doctor, Laboratory/Diagnostics, Pharmacy and Admin workspaces in the same application**, not five applications/microservices. Imaging adds no sixth portal. Slice 2 memberships, Slice 3 patient onboarding and Slice 4 public directory are COMPLETE within their bounded contracts. Slice 5 bilateral relationship lifecycle is COMPLETE around the sole ClinicianPatientAssignment grant. Remaining conceptual modular extensions are availability/booking, consultation/documentation/problems, medication/prescription, diagnostics/result, dispensing, longitudinal projection and in-app coordination; Slice 6 is COMPLETE and I1 technical exit is COMPLETE. Their final package/table/route layout remains milestone-specific reviewed work.

Keep clinical sources owned by their modules. Connect them through explicit same-patient/source links and authorized read projections, not a universal clinical JSON event table, event-sourcing rewrite or messaging platform. Timeline and audit are separate. Clinical occurrence, signing/availability and local recording provenance must remain truthful; no generalized historical-knowledge guarantee is created.

Authorization remains backend-first: public directory is published professional data only; booking logistics do not grant clinical access; current patient ownership/ACTIVE relationship governs clinical records; future current organization membership plus routed artifact scope governs staff fulfillment under [D36](PRODUCT_V3_DECISIONS.md#d36--fulfillment-authorization-and-suspension). Private notes, release and wrong-patient masking apply through projections/counts/notifications. ADMIN remains operational.

## Preserved M2 service boundaries

CarePlan, catalog, normalized coverage/applicability, BP amendment and INITIAL action services are not automatically public routes. Existing session/transaction locks, exact plan/rule pins, history guards and minimized atomic audit remain as frozen in their contracts. New booking or staff authority cannot bypass legacy checks. EH-012 retains HTN follow-up/immutable encounter-BP semantics; new general consultation is an explicit later extension.

EH-014 adds principal-checked INITIAL generation and protected immutable decision records, without HTTP route or autonomous hook. Ordinary action views are minimized/current-privacy-safe; generation snapshots never become timeline expansions. See [contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md), [post-merge validation](EH-014_VALIDATION.md#post-merge-validation), [BP correction/privacy](BP_CORRECTION_INVALIDATION_CONTRACT.md).

## Future research boundary — I5/I7

EACCE remains pure deterministic shared TypeScript called by API and worker, with no Nest/Prisma/Next imports in domain logic or database/HTTP access by the engine. It will consume approved observed action/evidence/coverage/evaluation-time inputs and emit classification/explanation; implementation NOT STARTED. CareActionDecision is generation provenance, not a closure assessment.

Use FHIR R4 at the adapter boundary, not as the primary database. Pin Synthea/config/concept sets; prepare observed-input feasibility before I5. Planned experiment execution uses PostgreSQL-backed TypeScript worker states and isolated ground truth, with no new queue service. Research B0/B1/P1 and the HTN protocol remain bounded and unchanged.

## Files, notifications and design

No medical file/image storage infrastructure is required. Laboratory final results are Tier 1; imaging narrative/report is Tier 2 and unimplemented. Important in-app events/bounded reminders are approved future scope; paid SMS/WhatsApp/email is not required. Separate explicit design-unfreeze approval remains mandatory after scope/domain prerequisites; this document specifies no screens, components or visual work.

## Current I2 Slice 2 applicability

Current delivery: Product V3 APPROVED; M0, M1, M2, V3-G0 and V3-I1 COMPLETE. V3-I2 Slice 1 COMPLETE: PR #49 MERGED at `925c4f7bb02d9ee7e6ee443ad290bc70c343fc47`; exact-main [Bootstrap 40519168675](https://github.com/abuhmaid28/egyhealth360/actions/runs/40519168675) SUCCESS (push/main, attempt 1, validate 122241181235); [completion 6444726271](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6444726271). [Issue #48 authorization 6452226103](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6452226103) authorizes V3-I2 Slice 2 only; its finite availability implementation is IMPLEMENTED / IN REVIEW in this PR. V3-I2 overall INCOMPLETE. Slices 3–7 NOT AUTHORIZED. I3 NOT AUTHORIZED. EACCE NOT STARTED. Design/UI FROZEN. No merge authorized.

## V3-I2 contract/readiness boundary

See the [I2 contract](V3_I2_CONTRACT.md) and [Slice 2 implementation](V3_I2_SLICE2.md) for the frozen boundaries and current delivery. Only finite availability and operational scheduling configuration are implemented in Slice 2. Full Journey A is incomplete. Historical evidence and D01–D36 retain their original meaning.

## V3-I2 Slice 2 current scheduling boundary

[Finite availability](V3_I2_SLICE2.md) adds one bounded persistence factory and HTTP boundary/controller within the existing API/database packages. Three additive models and one migration; pg/Node Intl reuse existing dependencies. ADMIN scheduling configuration is internal; public availability uses one current SQL projection and protected clinician history/commands reuse session/Origin/CSRF. No frontend, background scheduling, booking service or legacy runtime lock reordering.
