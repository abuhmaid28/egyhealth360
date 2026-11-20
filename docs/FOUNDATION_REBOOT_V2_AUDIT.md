# Foundation Reboot V2 — Stage 0+1 health audit

Proposed CURRENT AUTHORITATIVE audit for independent review under [issue #72 final authorization 6563757904](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6563757904). Earlier 6563631251 is superseded. Audited implementation baseline: `eb61da263ce44db5ca71ffdfea6a87309c8e17ef`, after PR #71. This is an audit/governance delivery, not owner acceptance of the findings or authorization for implementation.

## Foundation health verdict

**B. HEALTHY WITH NON-BLOCKING DEBT.** Preserve the accepted backend/security/clinical/data foundation. **Stage 1.5 is not required by the concrete findings observed in this audit.** No observed P0/P1 foundation defect makes Product UX discovery irresponsible. Backend refactoring is not a prerequisite to that discovery. Independent review can revise this assessment; any concrete P0/P1 foundation defect then requires separately authorized Stage 1.5 before Product UX.

This is not verdict A: frontend/content/brand/Design System maturity, backend maintainability, deployment provenance/parity and documentation automation have material debt. Nor does the verdict accept final UX, brand, logo or UI. The next authorized action is independent Stage 0+1 review and owner disposition, not automatic UX, remediation, Lab or production work. A genuine regression in the exact-baseline main CI blocks review-ready handoff.

## Method, coverage and limits

Inspected current main and the owner issue/comment, all repository documentation paths, top-level entrypoints/package/pnpm/Docker/CI configuration, backend composition/controllers and persistence ownership, Prisma schema/migration chain, explicit transaction/authority/privacy patterns, accepted test/runtime/checksum evidence, frontend routes/components/adapters/session/i18n/CSS, shared packages, research plans and screenshot/browser/accessibility records. Selected actual desktop clinician and Arabic mobile patient doctor-demo screenshots were visually inspected without modification.

Inventory is schema/OpenAPI-derived: **63 models, 22 SQL migrations, 82 OpenAPI paths**. Large-file measurements exclude generated Prisma output. Review considered contracts and implementation; CI Green was not used as a substitute for architecture assessment. The accepted pharmacy candidate PR #71 reports 327 unit, 1,286 PostgreSQL integration tests, 40 actual barrier races and 18 pharmacy HTTP runtime cases. Those counts are cited historical evidence, not tests rerun by this docs sprint.

Read-only Vercel project/deployment inspection and direct/proxied public health checks were performed. No login, clinical write, database connection, migration, seed, build deployment, alias, DNS or final-domain operation was performed. No database credentials are available/needed for this documentation audit. Consequently this audit does not independently establish live Neon catalog/backup/recovery state, migration 21/22 deployment, or exact cloud source SHA. It does not claim an exhaustive penetration test, clinical validation, all-screen accessibility conformance or independent replication of every accepted race. Remote final CI and preservation proof are recorded in [validation/handoff](FOUNDATION_REBOOT_V2_VALIDATION.md).

## Required area verdicts

| Area | Verdict | Disposition / next gate |
| --- | --- | --- |
| Backend architecture | Healthy enough to preserve; no required pre-UX backend rewrite | KEEP; P2 modernize composition/readability during separately scoped technical work |
| Database/migrations | Healthy accepted additive foundation; SQL guards are essential beyond Prisma | KEEP; preserve checksums, populated upgrades, immutable history and concurrency proof |
| API/module boundaries | Bounded behavior is credible; package separation is coarse and Nest feature modules are mostly controller factories | KEEP boundaries; P2 CONSOLIDATE documentation/composition, do not invent public internal-service endpoints |
| Security/clinical authority | Current assignment versus exact staff artifact authority is correctly distinct in inspected code/contracts | KEEP; future changes require current-authority/privacy/race proof; no new policy approval |
| Frontend architecture | Useful V1 with large orchestration/feature files and global CSS; not a final V2 architecture | MODERNIZE/CONSOLIDATE in approved Frontend Architecture V2 before broad visual implementation |
| packages/ui | Empty scaffold (`export {}`), no real shared Design System | MODERNIZE only after owner-approved DS/architecture; extraction is a recommendation, not a finalized architecture decision |
| Product UX foundation | Functional prototype with partial Live journeys, no approved final IA/content hierarchy | MODERNIZE through owner-approved Product UX/IA; not a Stage 1.5 foundation blocker |
| Arabic/i18n | Substantial EN/AR/RTL support; English fallback and inconsistent date/time locale propagation | MODERNIZE in Content/Arabic UX + later implementation; preserve clinical text/proper nouns |
| Brand | Generic implemented plus-mark/wordmark and clinical blue/teal styling; no complete approved final identity | MODERNIZE through research + three distinct directions + owner selection |
| Design System | Incomplete historical V1 direction, insufficient for final implementation | ARCHIVE direction as reference; owner-approved DS V2 before final frontend work |
| Testing/CI | Strong accepted real-DB/HTTP/browser proof, with repeated setup/checks and no docs freshness/reference gate | KEEP required gates; P2 optimize only with equivalent evidence, add separately authorized docs checks later |
| Deployment | Pre-final web/API READY; health 200; I2 hosted evidence exists; current-main/I3 parity unverified | KEEP topology; P2 source/migration provenance and parity gate before next hosted capability claim |
| Documentation/source of truth | Material incoming drift repaired in this proposal; history preserved/classified | CONSOLIDATE around CURRENT_STATUS/charter/index; periodic health gate required to prevent recurrence |

## Full repository truth and drift inventory

The observations below refer to the audited **incoming baseline**, so their quoted old claims need not remain in the repaired files. Paths are preserved; current references replace stale summaries, while accepted/historical records retain adoption context. [SOURCE_OF_TRUTH](SOURCE_OF_TRUTH.md) classifies every documentation Markdown path, including research and milestone records.

| ID / incoming path | Concrete conflicting or stale claim | Evidence / correction |
| --- | --- | --- |
| D01 `AGENTS.md` §§0/9 | I2 Live closeout active; I3 unauthorized; sprint-specific delivery and permissions embedded in stable instructions | Main contains I3 Slices 1/2. Replaced with stable execution/preservation rules and current reading path; task state moved to CURRENT_STATUS |
| D02 `FIRST_AGENT_PROMPT.txt` | I2 Slices 1–3 complete, Slice 4 in review, Slice 5 unimplemented | Replaced obsolete startup authorization with stable pointer to issue/current status/charter/index |
| D03 `README.md` opening/tooling | Product UI not started/frozen; web bootstrap, no integrated UI; duplicate I2 Slice 2-only status | Live V1 and hosted evidence exist. Current entry rewritten; local runbook retained |
| D04 `ARCHITECTURE.md` | Bootstrap web, fourteen migrations/31 models, booking/consultation/pharmacy future, same-origin routing later | Main has current route/persistence/Live rewrite architecture through pharmacy. Rewritten as architecture, removing PR-diary status |
| D05 `PROJECT.md` | Competing I2 Slice 2 and Slice 6 snapshots; UI not started; “next” section grants obsolete slice | Current opening answers product/complete/Live/active/paused/next. Historical G0/I1/M0–M2 evidence remains separated, stable anchors retained |
| D06 `IMPLEMENTATION_ROADMAP.md` | I3 contract/readiness only, none implemented; I2 overall incomplete; UI after EACCE | Accepted I2/I3 Slice 1/2 recorded; issue #72 inserts Foundation/Product/Design/Frontend V2 before remaining Lab. Old milestone mappings retained |
| D07 `PRODUCT.md` | Future-only workspaces, all journeys not implemented, repeated availability-only status | Scope retained, partial/current backend and Live distinctions corrected. Journey A still lacks Lab; C backend accepted; no complete A–D claim |
| D08 `PRODUCT_V3_DECISIONS.md` | Policy adoption page also presented stale execution table/freeze as current | D01–D36 preserved. Delivery delegates to CURRENT_STATUS; D35 original gate is historical alongside later scoped V1 approvals and new final-V2 charter gates |
| D09 `DOMAIN.md` | General booking/follow-up intent/prescription/pharmacy future or not authorized as current implementation | Updated actual domain table; clinical source/operational/projection/audit distinctions preserved |
| D10 `DATA_MODEL.md` | Current exact inventory says 34 models/15 migrations; separate appended 39/43 and later slices compete | Replaced current inventory with all 63 schema models and 22 migrations; older technical slice notes explicitly historical; no Lab/result/assessment model claim |
| D11 `API.md` | Current inventory stops at M2/I1; old sections say no close/document APIs while later sections introduce them | Current 82-path summary through prescription/pharmacy; internal services stay internal; later notes labeled historical introduction context |
| D12 `SECURITY.md` | “Booking and fulfillment NOT IMPLEMENTED”; staff D36 universally future | Current enforcement table distinguishes implemented pharmacy from future Lab, preserving accepted authority/privacy policy |
| D13 `TESTING.md` | Old “typical CI” includes EACCE Golden/research smoke; Playwright described as future; stale Slice 7 PR open | Actual four-lane workflow documented, including pharmacy runtime. EACCE/experiments still future; no fictitious CI gates |
| D14 `UX.md` | “Product UI/UX NOT STARTED / DESIGN FROZEN,” all five flows future-only | Live V1 exists, final UX is unapproved. Scope table retained as conceptual, not final navigation/terminology; no redesign authorized |
| D15 `DESIGN_SYSTEM.md` | High-level V1 style directions plus old blanket freeze can be mistaken for final implementation specification | Explicit legacy/incomplete/insufficient classification; lists missing V2 contracts. No replacement logo/colors/fonts/components selected |
| D16 `REQUIREMENTS.md` | Current delivery column says no availability, booking, consultation documentation, prescription/catalog or dispensing | Reconciled delivery columns only through I3 Slice 2; requirement meanings and historical V2 IDs retained |
| D17 `TRACEABILITY_MATRIX_V1.md` | “All rows future” and old I2/UI state obscure accepted slices and can understate implementation | Added current requirement-to-evidence map; old trace matrices explicitly historical. No Lab/continuity/research completion fabricated |
| D18 `DECISIONS.md` | Repeated mutable I2 status next to binding ADRs blurs old scope/freeze and current policy | Removed duplicated status paragraphs, classified adoption context; accepted ADR behavior preserved |
| D19 `PROJECT_PLAN_6_MONTHS.md` | Old I1/I2 state and I6-after-I5 sequencing conflict with issue #72 | Capacity constraints retained; current roadmap owns sequence; no new deadlines/percentages |
| D20 `EXECUTION_POLICY.md` | Academic constraints lack new permanent Product/Design decision boundary and health-review connection | Linked stable charter; synthetic/free-first/no-fieldwork/source-traceability policy unchanged |
| D21 I1/I2/I3 contract headers | Adoption inventories/status/“not authorized” statements can look current when read alone | Added scope notices to the three main contracts. Binding behavior unchanged; exact accepted/current boundary now explicit |
| D22 EH-*, I1/I2 slice/validation/exit records | Old migration counts, deferred features, open PR and slice-specific permissions are mixed with accepted behavior | Index classifies contracts versus historical evidence; no mass rewriting/deletion/moving of evidence or tests |
| D23 `V3_UI_*`, pre-final UI/live reports | “Not integrated on main,” I3 exclusions, older visual approvals and temporary workspace paths apply to each past sprint | Classified historical feature/hosting evidence; these do not approve final V2 or disprove later merged backend. Temporary `/workspace/...` artifacts are not durable repo deliverables; committed PNG/JSON are |
| D24 doctor-demo screenshots/accessibility/browser records | Useful bounded V1 before evidence could be mistaken for final product/design or universal accessibility proof | Preserve all 18 doctor-demo PNG/JSON files byte-identically; inspect existing evidence only; no regeneration |
| D25 `docs/research/*`, RESEARCH/thesis/old planning/diagrams | Future EACCE/pipeline/protocol/metrics and older scope can look implemented when detached from status | Research plans/sources classified; draft protocol is not implementation approval/results. Actual engine/FHIR/worker remain scaffolds. There is no top-level `research/` directory |
| D26 Hosting versus repository | Last staging evidence lists twenty migration checksums; main has twenty-two, no deployment source SHA returned | Distinguish I2 hosted proof from accepted I3 backend. Do not infer current migration parity, run seeds/migrations or promote final domain |
| D27 Package/workspace/Docker/CI labels | “Bootstrap” image/workflow and engine health import persist despite real application domains | Names are historical labels, not architecture capability; KEEP tooling and disclose actual health-only worker/engine/FHIR/UI scaffold limits |
| D28 Repeated “Current I2 Slice 2 applicability” paragraphs | Exact obsolete authorization copied across many current docs; source priority ambiguous and reading order requires history | Consolidated current truth, classified historical sections, stable AGENTS and same-PR freshness/health obligations; no duplicate independent status table |

## Architecture, backend and data findings

### Runtime and package ownership

KEEP Next.js/TypeScript, NestJS modular monolith, PostgreSQL 18, Prisma 7, REST/OpenAPI, pnpm, Docker/Compose and GitHub Actions. The pre-final Vercel web/API → Neon architecture already exists. No evidence justifies a backend framework or microservice replacement.

`apps/api/src/main.ts` explicitly creates domain persistence resources and passes them to `createApp`. `apps/api/src/app.ts` creates AuthModule/AppModule with controller factories and ordered middleware; it is not a conventional feature-per-Nest-module service graph. Controllers mostly handle transport/auth/request bounds, while principal-checked DB factories own business transactions and projections. This is coherent for the current scope but has a long positional composition signature and explicit per-resource lifecycle management (P2 B01).

`packages/db` is one large physical package, with domain files/value validators and SQL constraints rather than independently deployed stores. Code is often dense, with long lines/embedded SQL; file line counts alone understate prescription/pharmacy complexity. Observed-applicability is 838 lines; normalized-evidence 689. Current API controllers are smaller (largest relationships 231 lines), but controller/request parsing and persistence patterns repeat. Refactor only with preserved authority, SQL, lock ordering, replay and negative tests; do not extract a generic clinical workflow platform (P2 B02).

Public HTTP routes are explicitly composed; internal organization/scheduling/catalog/M2 services are not automatically browser APIs. Pharmacy is an internal composition of prescription source authority using the same pool/transaction capability; the public DB package exposes bounded persistence operations. This reuse avoids a competing source authority model. No new API is justified by a document inventory alone.

### Transaction and authority health

Inspection confirms explicit current user/session, own-data/current assignment and exact author/originating clinic checks; sorted lock/advisory order; DB clock expiry; safe replay after authority/privacy; minimized atomic audit; same-patient/provenance FK guards. Pharmacy staff independently use exact active user/session/pharmacy/membership/routed source; they do not inherit clinical authority from the prescriber. Current recipient-org locks coordinate queue filtering with actual source cancel/replace/privacy writers. The code and tests preserve no duplicate dispense even after reversal, no automatic mutation retry, and checked-out connection cleanup on uncertain pharmacy/source transaction failure.

These findings support KEEP, not blanket security certification. Shared lock/SQL patterns are safety-critical and deliberately duplicated across accepted slices; extraction requires actual revocation/rollback/race proof, not a formatting-only equivalence claim. Older modules have different transaction/error-cleanup shapes; future hardening should compare failure recovery before any consolidation, without asserting an unproved vulnerability (P2 B02).

Per-factory connection pools are small but numerous, and a serverless instance may multiply them. `main.ts` constructs multiple pools rather than one globally budgeted pool. The audit did not load-test Neon connection capacity or observe connection exhaustion. Establish an explicit process/concurrency/pool budget and recovery/load proof before expansion/final hardening; no immediate deployment scale-up or pool rewrite (P2 B03).

### Data and migrations

KEEP one additive chain: migrations 1–10 M2, 11–14 I1, 15–20 I2, 21 prescription/catalog, 22 pharmacy. Latest SHA-256 is `d1482ce8ac43bb9eb6d86397ce22ca2f015c874d04eeb96eacd9aa5a731eca37`. Prisma declares 63 domain models; SQL supplies important constraints/triggers/deferred integrity beyond generated ORM declarations. Existing tests pin historical checksums and populated upgrades, immutable rows, rollback/no consumed key, real barrier locks and zero-write redeploys. This sprint changes none of those bytes.

Cross-module foreign keys are purposeful same-patient/source/actor/org/membership links. They create migration/lock coupling that must be reviewed, but are not a reason to drop relational integrity. Append-only roots/versions/operations/restrictions and unique fact identities support auditability. Audit logs are not a clinical timeline or medical payload store.

Potential duplicated concepts were checked: `FollowUpAppointment` is preserved legacy HTN operations, `Booking` is general reservation authority, `FollowUpIntent` is human clinical instruction with explicit Booking links; ClinicalEncounter records evidence/provenance while Consultation links the general visit; CareActionDecision is INITIAL generation provenance, not ClosureAssessment. Do not unify these simply because their names overlap. Future I4 must contract any cross-module read projection; no automatic schedule/completion/coverage inference.

### Existing domain disposition

| Foundation | Classification | Reason |
| --- | --- | --- |
| Auth/session/request defenses | KEEP | Bounded session/current-check/request-defense code and accepted HTTP tests |
| Organizations/memberships | KEEP | Exact operational scope, current revocation checks; no clinical grant |
| Assignments/bilateral lifecycle | KEEP | Sole effective clinical grant with preserved legacy/provenance semantics |
| Directory | KEEP | Curated current public projection, no clinical payload |
| Availability/booking | KEEP | Finite slots, current provider scope, reservation/overlap/history/replay semantics |
| Consultation/documentation/close | KEEP | Actual treating provenance; private versus released identities; explicit close |
| FollowUpIntent | KEEP | Independent instruction release/privacy and explicit booking links; no second booking system |
| Prescription/pharmacy | KEEP | Source versus fulfillment distinction, immutable full-item facts, exact staff authority and concurrency evidence |
| M2 planning/evidence | KEEP | Exact-pinned definitions/plans/INITIAL and privacy; no engine-completion claim |
| API composition and persistence readability | MODERNIZE / CONSOLIDATE | P2 maintainability, pool ownership and safety-critical pattern visibility; no immediate behavior rewrite |

## Frontend, UX, Arabic, brand and Design System

### Frontend structure and reusable parts

`app/[[...path]]/page.tsx` delegates to a 677-line `application.tsx` shell with client role/path dispatch, navigation/mode/session and layout state. Feature files mix rendering, local state, transport orchestration and domain-specific feedback: `documentation.tsx` 1,693 lines, `patient.tsx` 1,617, `live-booking.tsx` 950, `doctor.tsx` 723, `follow-up-intents.tsx` 628. `globals.css` has 3,479 lines. This is feature growth without a fully specified feature/route/component ownership architecture (P2 F01).

KEEP typed Live contracts, explicit separate mock adapter, in-memory Live capability scope, server-owned cookie/session, feature command keys/recovery, deliberate clinical writes and privacy/error behaviors. `src/components/ui.tsx` already supplies reusable primitives/icons/modal focus/date helpers. The architecture must later separate primitives, healthcare patterns, features, navigation and state ownership without losing those behaviors. React Context/useState/useEffect are the actual state mechanisms; no central external state library is required by evidence.

`packages/ui/src/index.ts` is empty and its package has no implemented components. **Recommendation:** consider making it the real shared, dependency-disciplined Design System package after owner-approved V2 specifications, if reuse across consumers warrants it. An empty monorepo package is not evidence that all components should be extracted now. Final package boundaries belong to separately reviewed Frontend Architecture V2 (P2 F02).

Before broad final visual implementation, require approved frontend feature/route/data/session/i18n/component boundaries and an integration/migration/visual QA plan. This work belongs after owner-approved prototypes under the charter, not a pre-UX Stage 1.5. Do not preserve mechanically the giant shell/global styles, Demo-shaped unsupported feature assumptions, duplicated presentation/status mappings or literal English keys as immutable V2 requirements (P2 F01/F03).

### Product UX and content

Visual inspection of existing clinician desktop and Arabic patient mobile captures shows a coherent functional clinical flow and useful privacy grouping, alongside repeated bordered cards, a long consultation surface, several draft/sign/release controls and persistent explanatory text. Similar cards carry different significance (journey, appointment, profile, privacy, next step), weakening hierarchy. Mobile patient home repeats journey/appointment/information panels; consultation combines findings, private note, summary, signed history, follow-up and close in a long page. These are reasons for deliberate UX/IA review, not proof of unsafe behavior (P2 U01).

Current navigation is a role-keyed array in application.tsx with Patient record/medications/lab/follow-up links and clinician schedule/availability; backend and Live support differ from Demo breadth. Current labels such as Doctor/Clinician, released/shared, consultation/visit and record/history need an approved audience/context glossary. Profile and home already use friendly synthetic aliases, but no complete content taxonomy or user-tested task hierarchy exists. No final journey or navigation choice is made by this audit.

System terms remain visible in operational/clinical flows: availability asks for “ISO date/time with an explicit offset”; other guidance explains membership/publication/authority and immutable drafts/operation uncertainty. Some safety information is necessary, but the content phase must decide what users need to act versus what belongs in engineering documentation. Do not hide truthful clinical boundaries or invent simpler behavior to reduce copy (P2 U02).

### Arabic and i18n

Substantial Arabic content exists in the 1,300-line catalog and RTL document/CSS behavior. The selected Arabic mobile capture has readable mirrored structure and translated major headings/status/next actions. Existing controlled/hosted browser records cover EN/AR/RTL at relevant sizes. No fresh browser conformance run was needed for this docs-only sprint.

Concrete debt: `translate` uses English strings as keys and silently returns the key on a missing Arabic entry; `LocaleProvider` starts English, restores localStorage after mount and changes document lang/dir client-side; not a route/server locale contract. `ui.tsx` date/time helpers default to English. Calls in availability, patient/doctor, documentation history and Live booking history omit locale even where other nearby Live visit fields pass it. This yields incomplete localization; clinic timezone must remain truthful. The same page can have translated headings and English date metadata (P2 F03).

A focused static scan of literal `t("...")` keys, accounting for quoted and identifier catalog keys, found only five English-looking missing-key candidates: email placeholder, two ISO timestamp examples, `Africa/Cairo`, and `EgyHealth`. These are proper-name/technical-format candidates, **not evidence of widespread untranslated headings**; dynamic strings/free text and every visual state were not exhaustively scanned. Clinical authored text, medication names, proper nouns, IDs/timezone/ISO necessities require explicit future content exceptions, not blind translation.

Content/Arabic UX must approve consistent patient/clinician terminology, Arabic numbers/date/time/timezone/status patterns, professional/clinical vocabulary, message tone, loading/error/empty/success language and technical exceptions. Missing-key detection and all-state localization QA should then become implementation gates (P2 F03/U02).

### Branding and Design System maturity

The current Logo function combines a generic plus icon, EgyHealth360 wordmark and slogan; icons are local inline stroke SVGs. Global CSS uses blue/teal/neutral values and local OFL Inter/Noto Sans Arabic. The result is recognizable as a clinical prototype, but there is no complete approved brand research/identity/lockup/min-size/clear-space/monochrome/icon/illustration system or evidence establishing distinctiveness. Current assets are **not final** (P2 V01).

`DESIGN_SYSTEM.md` is a short historical V1 direction, **incomplete and insufficient for final implementation**. It lists generic component names/visual preferences without a full semantic token taxonomy, anatomy/variants/states, responsive grid/density/type scale, healthcare patterns, Arabic layout/type/content rules, do/don't examples and approved-prototype visual QA contract. `globals.css` variables and ui.tsx controls do not supply that missing specification (P2 V02).

The charter requires Product UX/IA → Content/Arabic owner approval → brand research → exactly three distinct directions → owner selection/rejection/hybrid → final Brand V2 → Design System V2 → high-fidelity Patient/Clinician prototypes → owner final visual approval → Frontend Architecture V2 → implementation → Visual QA/before-after evidence. Three palettes on the same layout do not qualify. No direction, logo, colors, fonts, DS component or prototype is created here.

## Testing, deployment and operational health

### Test/CI reality

The actual workflow has static-browser, postgres, docker-runtime and required aggregate validate, with no path-aware docs skip. It builds/generates in several lanes; some auth/domain checks repeat across unit/integration/runtime and container checks. This buys different environments and must not be removed wholesale. A future risk-aware optimization needs an explicit coverage matrix before deduplication (P2 T01).

Real PostgreSQL tests exercise deferred guards, actual blocking PIDs, rollback/key reuse, revocation/privacy conflicts and source eligibility; runtime scripts perform real HTTP journeys through pharmacy. Strong proof justifies KEEP. There is no current EACCE classification/experiment lane or complete final-design visual comparison. No Markdown/reference/source-status checker is configured; this sprint uses focused read-only checks and documented consistency obligations instead of changing CI (P2 D01).

### Observed deployment and limits

| Resource | Observation |
| --- | --- |
| Vercel team | `team_auKJxb8WoqzE3RhVlI7Me0eq` |
| Web project | `egyhealth360-pre-final-staging`, `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q` |
| Web deployment | `dpl_E8HY54CoDEHwXDgeJHcjqvkAbmSK`, READY, alias `egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app` |
| API project | `egyhealth360-pre-final-api`, `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF` |
| API deployment | `dpl_55m4NTg5QiGMV1TBPpmPet35HUxA`, READY, alias `egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app` |
| Public health | Direct API and web-rewritten `/api/v1/health`: HTTP 200, `{"data":{"status":"ok"}}` |
| Source parity | Deployment response exposes no git source SHA/meta; exact-main/I3 hosted parity not verified |
| Neon | Historical staging evidence: `spring-star-16308392`, branch `br-bold-resonance-ar7tw4rg`, `egyhealth360_staging`, PostgreSQL 18.6; migration evidence through 20 only; no new DB inspection |
| Initialization | Historical runbook says `EH_STAGING_SEED_ENABLED=0`; no live env read/write or initialization here |
| Final domain | `egyhealth360.vercel.app` protected; untouched |

The topology is appropriate for the current synthetic pre-final demo. READY and a DB-backed health query do not prove all clinical flows, migration parity, connection capacity or recovery/backup readiness. Require source/build/migration provenance and a separately authorized I3 migration/deployment/browser gate before claiming hosted pharmacy (P2 O01). Confirm pooled runtime/direct migration separation and recovery proof in later hardening without touching staging here. No Render/Railway migration, new hosting project, production promotion or paid service was needed.

## Debt priority and required dispositions

**P0:** none observed. **P1 foundation debt:** none established. This is bounded audit evidence, not a guarantee against undiscovered defects. Incoming documentation defects were significant and repaired by this proposal; they do not justify an invented backend remediation phase.

| ID | Priority | Evidence / required next action | Timing / class |
| --- | --- | --- | --- |
| B01 | P2 | Long positional createApp/controller-factory composition and resource lifecycle; document/incrementally clarify ownership with preserved tests | Relevant backend maintenance; MODERNIZE |
| B02 | P2 | Dense persistence/SQL and repeated authority/lock/recovery patterns; future extraction needs safety proof, not generic workflow abstraction | Relevant technical hardening; CONSOLIDATE |
| B03 | P2 | Multiple small pools per serverless instance; no measured capacity budget | Before expansion/final hosting hardening; MODERNIZE |
| F01 | P2 | Large route dispatcher/feature components/global stylesheet; approve feature/route/state/primitive boundaries | Frontend Architecture V2 before broad visual implementation; MODERNIZE/CONSOLIDATE |
| F02 | P2 | Empty packages/ui; choose real shared DS package responsibilities after approved design | Frontend Architecture/DS V2; MODERNIZE |
| F03 | P2 | English fallback/string keys/client-only locale and omitted date locale | Content/Arabic UX then implementation/QA; MODERNIZE |
| U01 | P2 | Repeated cards/long mixed-task surfaces; unapproved final IA/navigation/journeys | Product UX/IA approval; MODERNIZE |
| U02 | P2 | Technical wording/status/profile/audience glossary lacks complete content rules | Content/Arabic UX owner approval; MODERNIZE |
| V01 | P2 | No complete final identity/brand usage system | Brand research/three directions/owner selection; MODERNIZE |
| V02 | P2 | Historical short DS lacks semantic/components/states/responsive/Arabic/QA specifications | Approved DS V2 and prototypes; MODERNIZE |
| T01 | P2 | Repeated full CI setup/checks; no path/risk-aware plan or superseded-run cancellation | Separately authorized CI optimization preserving required gate; CONSOLIDATE |
| D01 | P2 | No automated reference/status freshness gate; drift can recur despite charter | Future docs tooling plus mandatory same-PR updates/health review now; MODERNIZE |
| O01 | P2 | No returned source SHA, staging migration evidence stops at 20, no I3 hosted proof | Before next hosted I3 claim, not before Product UX discovery; MODERNIZE |
| H01 | P3 | Historical filenames/diagrams/reports and old status paragraphs increase search noise | Link-preserving future archive plan; ARCHIVE |
| H02 | P3 | Obsolete V1-only styling/duplicate helpers and bootstrap-only placeholders may outlive their consumers | Remove only after approved replacement/equivalent proof; REMOVE LATER |

**REFACTOR NOW:** no runtime area qualifies under the observed P0/P1 rule, and no runtime refactor is authorized in this sprint. Current documentation/source hierarchy required immediate **CONSOLIDATE/MODERNIZE**, delivered here. **KEEP** accepted backend/data/security/tests/runtime and all evidence bytes. **ARCHIVE** means classify in place now, possible later link-safe relocation; no files were mass-moved/deleted. **REMOVE LATER** is conditional, not deletion authority for accepted tests/scaffolds/history.

## Stage 1.5 and owner decision

Recommend **no Stage 1.5** on current evidence. Independent foundation review must first validate scope, findings, references and actual main/PR CI. If it establishes P0/P1 foundation debt, document the exact invariant/impact/evidence, bound Stage 1.5 and seek explicit execution authorization before Product UX. Do not start remediation automatically.

No new Product Owner decision was needed to finish this audit proposal. Required future decisions remain acceptance of Stage 0+1/verdict, authorization of the next phase, UX/journeys/IA/navigation/terminology/content approval, selection among the three future visual directions (or reject/hybrid), final brand/logo/color/type/DS/prototype approval and final visual approval. No design artifact is selected by this PR. Lab, I4/I5/EACCE/AI and final-domain promotion remain unauthorized.
