# EgyHealth 360 — Architecture and V3 Extension Boundary

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Slices 1–5 COMPLETE; PR #45 merged at `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, exact-main [Bootstrap 40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467) SUCCESS; [Slice 5 completion 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6 exit/security review](V3_I1_SLICE6_EXIT_REVIEW.md) AUTHORIZED / IN PROGRESS under [authorization 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). V3-I1 INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.

[Slice 2](V3_I1_SLICE2.md) operational memberships are COMPLETE. [Slice 3](V3_I1_SLICE3.md) adds a narrow patient-entry persistence service and isolated HTTP boundary, reusing existing schema/auth/password/audit. Slice 1 COMPLETE; Slice 3 COMPLETE; I1 NOT COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 AUTHORIZED / IN PROGRESS. Membership remains operational only; D36 artifact authority is I3.

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

[Product V3](PRODUCT.md) targets **Patient, Doctor, Laboratory/Diagnostics, Pharmacy and Admin workspaces in the same application**, not five applications/microservices. Imaging adds no sixth portal. Slice 2 memberships, Slice 3 patient onboarding and Slice 4 public directory are COMPLETE within their bounded contracts. Slice 5 bilateral relationship lifecycle is COMPLETE around the sole ClinicianPatientAssignment grant. Remaining conceptual modular extensions are availability/booking, consultation/documentation/problems, medication/prescription, diagnostics/result, dispensing, longitudinal projection and in-app coordination; Slice 6 is AUTHORIZED / IN PROGRESS and I1 remains INCOMPLETE. Their final package/table/route layout remains milestone-specific reviewed work.

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

## Current Slice 6 applicability

Slices 1–5 are COMPLETE through [PR #45](https://github.com/abuhmaid28/egyhealth360/pull/45), exact-main Bootstrap 40252309467 and [completion comment 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6](V3_I1_SLICE6_EXIT_REVIEW.md) is AUTHORIZED / IN PROGRESS by comment 6406691109 for combined verification/security review and strictly necessary contract fixes only. Historical slice/ADR status text records its adoption point. V3-I1 remains INCOMPLETE pending independent exact-head review, successful CI, separate Product Owner merge approval, merge and independently confirmed exact-main verification. Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.
