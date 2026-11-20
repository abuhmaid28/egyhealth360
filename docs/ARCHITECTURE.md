# Current architecture

CURRENT AUTHORITATIVE reference at the [CURRENT_STATUS](CURRENT_STATUS.md) implementation baseline. Accepted contracts constrain behavior; code/schema/OpenAPI establish actual inventory. Health/debt judgments are in the [audit](FOUNDATION_REBOOT_V2_AUDIT.md), not embedded as a PR diary.

## System context

One integrated synthetic healthcare platform targets **Patient, Clinician, Pharmacy, Laboratory and Admin** workspaces. These are domain experiences in one web application and one API, not five microservices. Patient/clinician I2 Live journeys exist; pharmacy backend is implemented through I3 Slice 2, while pharmacy/lab frontend shells are Demo/unsupported. Laboratory backend is future and unauthorized. ADMIN is operational, without blanket clinical access.

## Runtime and deployment

| Layer | Actual responsibility |
| --- | --- |
| `apps/web` | Next.js 16 / React 19 / TypeScript App Router; client-rendered integrated V1 prototype with explicit Demo/Live modes |
| `apps/api` | NestJS 11 / Express TypeScript modular monolith; REST `/api/v1`, request boundaries, session/CSRF guards and sanitized responses |
| `packages/db` | Prisma 7 schema/client and domain persistence factories; both Prisma operations and explicit `pg` SQL transactions/locks/DB projections |
| PostgreSQL 18 | Domain constraints, FKs, partial/exclusion/unique indexes, append-only/history triggers, deferred completeness/audit checks and transaction/advisory locks |
| Tooling | pnpm monorepo; pinned Node 24.21.0/pnpm 10.34.6; Docker/Compose; GitHub Actions; checked-in OpenAPI |

Pre-final hosting is **Browser → Vercel Next.js → Vercel NestJS API → Neon PostgreSQL 18**. Next rewrites same-origin `/api/v1/:path*` to a server-only configured HTTPS API origin. Secure HttpOnly host cookies and exact browser Origin/CSRF checks remain; no permissive CORS bridge is assumed. Prisma does not replace explicit PostgreSQL concurrency semantics.

[Staging evidence](PRE_FINAL_LIVE_STAGING.md) identifies the two Vercel projects, Neon project/branch/database, pooled TLS API connection and explicit initializer off switch. Builds do not migrate. Historical hosted proof covers I2 and migrations through 20, not verified I3 cloud parity. Current observed deployment IDs/readiness and health checks are in the audit. `egyhealth360.vercel.app` remains protected. Docker is the local/CI alternative: PostgreSQL 18.6, API, web and a health-only worker, with persistent disposable volumes; it is not the current hosted deployment topology.

## Composition and backend boundaries

`apps/api/src/main.ts` constructs persistence factories, authentication/password dependencies and `createApp`; it closes resources on signals. `app.ts` composes controller factories into an AuthModule/AppModule and installs ordered request-boundary middleware. It does **not** provide one separately injectable Nest feature module per domain. Conditional composition also supports bounded test runtimes. No controller may substitute frontend role checks for server authorization.

| Implemented boundary | Owning code / scope |
| --- | --- |
| Identity/session/patient authorization | `auth.ts`, `authorization.ts`, `password.ts`; database session, ownership/current assignment |
| Patient entry | `patient-entry.ts`; guarded patient-only registration and own profile |
| Organizations/memberships | `packages/db/src/organizations.ts`; principal-checked internal management, no generic public ADMIN mutation API |
| Public directory | `directory.ts`; curated publication/active operational scope, no clinical data |
| Bilateral relationships | `relationships.ts`; request/accept/decline/withdraw/end around the sole assignment grant |
| Availability | `availability.ts`; finite published slots/configuration/history |
| Booking | `bookings.ts`; reservation/change/attendance/schedule logistics with protected overlap/capacity |
| Consultation/open/close | opening via bookings controller, `consultation-close.ts`, database `consultations.ts`; immutable treating/encounter provenance and explicit close |
| Documentation | `documentation.ts`; separate private notes and explicitly released summaries, versions/corrections/privacy |
| FollowUpIntent | `follow-up-intents.ts`; independent release, booking links and privacy |
| Prescription/catalog | `prescriptions.ts`; author-owned lifecycle, medication snapshots, signed patient/current-clinician views |
| Pharmacy | `pharmacy.ts`; clinician routing and exact current recipient staff queue/accept/full-item dispense/correction/reversal |
| M2 evidence/planning | DB catalog, plans, BP/amendments, EH-012 follow-up/encounters, coverage, normalized evidence, applicability and INITIAL CareActions |

These are bounded modules by persistence/controller ownership, not physical service isolation. M2 catalog/plans/coverage/applicability/INITIAL operations remain internal principal-checked services unless explicitly exposed by OpenAPI; BP/EH-012 have bounded HTTP resources. Pharmacy is composed inside prescription persistence, sharing its pool and source-authority transaction capability internally. No raw pharmacy transaction capability is exported publicly. Cross-module reads/FKs are intentional same-patient/source/provenance coupling; they do not authorize a universal workflow or JSON event store.

## Data and transaction ownership

One schema and additive migration chain own **63 domain models / 22 migrations**; [DATA_MODEL](DATA_MODEL.md) enumerates them. The migration ledger is an additional database table. Schema alone omits important SQL guards; review migration SQL and checksum fixtures together.

Persistence factories own transactions, safe projections, current checks and minimized audit. Most own separate small connection pools; prescription/pharmacy share one. Explicit SQL handles lock ordering, DB clock expiry, atomic operations and projection privacy. This creates connection-budget and reviewability debt, not evidence that a new distributed architecture is needed.

Reuse sorted user/session/profile/assignment/operational scope locks, existing patient/clinician advisory namespaces, source/root/item locks and after-wait/final current-authority checks according to the accepted slice. Canonical actor/command operation keys retain zero-write replay only after current privacy/authority; uncertain commit needs an explicit identical command retry. Immutable source versions and append-only correction/restriction histories retain facts. Unique pharmacy item dispense identity remains consumed after reversal. Source cancellation/replacement/expiry blocks new fulfillment without erasing history. [Security](SECURITY.md), [I3 contracts](V3_I3_CONTRACT.md).

## Authority and privacy

- Patients read own permitted data. Clinical grant is current ACTIVE `ClinicianPatientAssignment`; bilateral workflow records its provenance. Booking, public publication, membership and authorship alone grant no clinical access.
- Clinical authoring additionally requires the exact current treating/source-author and originating clinic scope specified by the contract. Closing a consultation does not automatically sign/release other artifacts, complete actions or run EACCE.
- PHARMACY_STAFF use active user/session, exact current active pharmacy/membership and valid routed artifact authority. They receive no general patient browser or prescriber assignment grant. Ending the prescriber relationship does not cancel valid pharmacy artifact authority. LAB_STAFF fulfillment is future.
- ADMIN is operational. Private notes remain author-only under current authority; summary/intent release is explicit and independent. Wrong-patient restrictions suppress payload, identifiers, revealing counts/history/replay conflicts. Audit is minimized and distinct from a clinical timeline.

## Frontend as implemented

`app/[[...path]]/page.tsx` renders `Application`; layout supplies LocaleProvider and LiveSessionProvider. `application.tsx` owns shell/navigation, role-path dispatch and mode/session orchestration; large feature components own local state and feature flows. Routing is not yet organized into independent workspace/feature route trees.

`src/lib/api` contains typed contracts, same-origin Live clients and feature command/recovery handling; `src/lib/mock` is a separate browser-persisted synthetic Demo implementation. The persistent client Live capability scope retains only in-memory request/command state; HttpOnly sessions remain server-owned and reads/writes reauthorize. Unsupported Live capabilities fail explicitly, with no silent Demo fallback.

`src/components/ui.tsx` holds actual shared primitives/icons/logo/date formatting. `packages/ui/src/index.ts` is only `export {}` and has no real shared Design System. `globals.css` owns local fonts, color/spacing-like variables and many feature rules; no complete semantic token/component specification exists.

Localization uses an English-string-key Arabic catalog, React context/localStorage preference, document `lang`/`dir`, RTL CSS and Intl formatting. Missing translations fall back to English. Some date/time calls omit locale and default to English; clinician-authored clinical text and proper nouns are preserved. This is implemented bilingual V1 support, not a complete Arabic Content System.

V1 is a **FUNCTIONAL PROTOTYPE / BEFORE BASELINE**. Frontend Architecture V2 and final design are future owner-gated work; the current layout, logo, colors and fonts are not final decisions. Preserve current safety/client contracts and historical screenshots while later architecture is approved.

## Other packages and future boundaries

`packages/config` validates runtime configuration. `packages/clinical-rules` contains the exact approved HTN definition/manifest; it is not an arbitrary rule editor. `packages/closure-engine` contains only `bootstrapSmoke`, `packages/fhir-adapter` is empty, and `apps/experiment-worker` polls database health/heartbeat only. They do not implement inference, EACCE, FHIR import, experiments or a deployed job pipeline.

Future, currently unauthorized: Lab orders/results and I3 integrated exit; I4 longitudinal continuity/in-app updates; I5 deterministic EACCE; research/evaluation pipeline. FHIR R4 remains an adapter boundary rather than the product database. Research ground truth stays logically isolated. No ML/FastAPI/microservice/queue replacement is implied. [Governance](FOUNDATION_CHARTER.md) and [roadmap](IMPLEMENTATION_ROADMAP.md) govern subsequent authorization.
