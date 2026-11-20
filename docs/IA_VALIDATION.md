# Stage 3 — IA validation

Point-in-time documentation/product-structure validation. Authorization: [Issue #72 comment 6565633586](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565633586). Base: **`248347f72a7c1d4646cbceb7224f0ec1a9d92f06`**. The [IA proposal](INFORMATION_ARCHITECTURE.md), [sitemaps](IA_SITEMAPS.md) and [decision register](IA_DECISION_REGISTER.md) are recommendations pending independent review and explicit owner acceptance. Exact final head/PR/remote CI evidence belongs in the final PR handoff, avoiding a self-referential commit claim.

## Method and limits

Read the prescribed current path, accepted Stage 2 tasks and J1–J7, selected I1/I2/I3 contracts and V1 route/navigation/source evidence. Inspected existing Arabic-mobile Patient and English-desktop documentation screenshots; no screenshots regenerated. Audit E01–E18 covers repetition, hierarchy, backend leakage, dead ends, locales/mobile and Demo/Live. No interviews, analytics, browser task study or runtime tests were performed; conceptual path counts are not measured clicks or performance results.

All references below use sitemap IDs. Every contextual information group may remain inside a sustained task; a transition does not require a new screen, URL, component or visual arrangement. Read-only indices and multiple links to one canonical detail do not create a second detail destination.

## Accepted P0/P1 task coverage

All **37 accepted Stage 2 P0/P1 tasks** are mapped: **23 P0 + 14 P1**, comprising **29 CURRENT domain tasks + 8 FUTURE tasks**. CURRENT includes integration gaps; mapping is IA coverage, not Live delivery. Relationship P1 prerequisites and pharmacy routing P1 handoffs remain present wherever a P0 branch needs them. [Task inventory](UX_FOUNDATION.md#3-task-priorities--recommendations-for-review).

| Task / priority | Clear entry point | Destination/context | Action location | Status/feedback location |
| --- | --- | --- | --- | --- |
| P01 P0 | Platform entry or session expiry; P3 continuation | G0 | Supported registration/login/session recovery at G0 | G0 acknowledgement/session; revalidated return to P3/P1 |
| P02 P0 | Patient P2 Find care | P3 selection | Public clinician/clinic/availability choice in P3 | Current selection/eligible times/no-match state P3 |
| P03 P0 | Selected time P3 | P3 → P4 on committed success | Exact review/booking and explicit same-command recovery P3 | Committed appointment P4; uncertain/conflict P3 |
| P04 P0 | P1 next visit or P8 all-appointment retrieval | P4 | Inspect status/time/location, choose eligible next action P4 | P4 current booking state; P1 references same state |
| P05 P0 | P1/P4 released-source link or P11 independent retrieval | P5/P6 | Read exact released summary/recommendation there | Source/release/correction or truthful no-release state P5/P6; no drafts/counts |
| P06 P0 | P1 relevant medication, P5 source reference or P8 prescription retrieval | P7 | Read signed prescription and per-item supply/correction history P7 | Validity, route, acceptance, actual dispense and correction separately P7 |
| P07 P1 | Existing appointment P4 | P4 change context | Eligible cancellation/reschedule review/submit P4, availability selection as needed | Original retained on failed replacement; current confirmed booking on success P4 |
| P08 P1 | P1 secondary relationships or P4 missing-grant continuation | P9 | Explicit request/withdraw/end P9 | Pending/accepted/ended state P9, safe P4 return; acceptance belongs to C3 |
| P09 P1 | Released recommendation P6, independently retrieved through P11 | P6 → P2/P3 → P4 | Patient books in P3; clinician explicitly associates in C8 | P4 actual booking; P6 recommendation/link and actual booking state remain distinct |
| P11 P0 FUTURE | Future P1/P5 or bounded source retrieval | P10 | Read permitted final/current correction P10 | Current/superseded/retracted final status P10, no draft leakage |
| C01 P0 | Clinician workspace entry | C1 Today/current schedule scope | Inspect/select exact dated work C1 | Visit/logistics state C1; no clinical preview without grant |
| C02 P0 | Eligible C1 selection or C2 prerequisite resolution | C5 after exact opening checks | Explicit begin/recover in C5; C2 exposes missing prerequisite, C3 acceptance | Current authority and OPEN state C5; safe blocked state C2 |
| C03 P0 | C5 consultation entry; C4 relevant permitted source | C6 within C5 | Review findings/allergy uncertainty and purpose-specific documentation C6 | Patient/visit/access context C5; uncertainty and draft/save state C6 |
| C04 P0 | C5/C6 patient-summary task | C6 | Review exact audience/content and explicitly release summary C6 | Separate saved/signed/released/version feedback C6; patient P5 |
| C05 P0 | Optional clinical choice within C5 | C7 | Human prescription draft/review/sign C7 | Exact source validity/signature/history C7; patient P7 only signed source |
| C06 P0 | C5 follow-up or finishing visit | C8/C9 within C5 | Optional recommendation save/review/release C8; independent review/explicit close C9 | Intent state C8; CLOSED/CONSULTED and limited evidence C9/C1, no auto-release |
| C07 P1 | C1 logistics or availability management | C2/C11 | Attendance/eligible booking change C2; publish/withdraw finite times C11 | Confirmed logistics C2/C1; finite availability/conflict C11 |
| C08 P1 | C3 requests/current relationship or C2 missing grant | C3 → C4 only after current grant | Explicit accept/decline/end C3 | Pending/current/ended authority C3; unavailable clinical context safely withheld |
| C09 P1 | Signed source C7 | C7 exact prescription/item set | Route, pre-acceptance withdraw/reroute C7 | Actual destination/route state C7; exact receiver work F1/F2 |
| C10 P1 | C7 current source or C4 permitted prior source | C7 exact existing prescription | Review prior supply; deliberate correct/cancel/replace/restrict as supported C7 | New/old validity/source lineage/history C7; new source needs fresh routing |
| C11 P1 | C5 current source or C4 permitted prior source | C6/C8 exact documentation/intent | Addendum/correction/restriction C6; follow-up correction/restriction/explicit valid same-patient booking link C8 | Source-specific version/privacy/link feedback C6/C8; no automatic cross-module repair |
| C13 P0 FUTURE | Optional diagnostic decision in C5; C4 permitted final | C10 | Human order/routing and final review C10 | Future order/current-final/correction state C10, not automatically clinician-reviewed |
| F01 P0 | Pharmacy current authorized workspace | F1 | Select exact pending/accepted work F1 | Filtered queue scope/counts, responsibility and remaining work F1 |
| F02 P0 | F1 eligible exact work | F2 | Inspect allowed source/items/validity, explicitly accept F2 | Committed acceptance F2; acceptance not dispense/readiness |
| F03 P0 | Accepted F2 exact item | F2 | Verify and record eligible full-item dispense F2 | Immutable FULLY_DISPENSED fact/remaining items F2; no partial quantities |
| F04 P0 | F2 after submit or interrupted command | F2 receipt/current eligible context; F3/F4 after purpose transition | Explicit identical-command recovery F2 after reauthorization, not automatic retry | Exact committed/uncertain state F2; current reduced-purpose facts F3/F4; no stale full-detail reuse |
| F05 P1 | F3 genuine fact or permitted F2 fact reference | F4 | Reasoned correction/reversal F4 | Original fact plus correction/reversal/terminal effect F4, no renewed entitlement |
| F06 P1 | Explicit Pharmacy history entry | F3 → F4 | Retrieve bounded actual own-route supply/corrections | Reduced history projection F3/F4 without patient display name/instructions; empty if no eligible facts |
| L01 P0 FUTURE | Future authorized Lab entry | L1 → L2 | Select exact assigned order L1 | Responsibility/current permitted order state L1/L2 |
| L02 P0 FUTURE | L1 selected exact order | L2 | Explicit accept or reasoned reject L2 | Confirmed responsibility/stopped status L2; no result implied |
| L03 P0 FUTURE | Accepted L2 | L3 | Human draft entry/review L3 | Draft/current version and actual author L3; invisible to general readers |
| L04 P0 FUTURE | Exact draft L3 | L3 | Explicit verify/finalize L3 | Current verified final/provenance L3; direct permitted P10/C10 visibility |
| L05 P1 FUTURE | L4 eligible exact final/history | L3 via same exact order | Reasoned amendment/retraction L3 | Current versus superseded/retracted history L3/L4; no overwrite/new entitlement |
| L06 P1 FUTURE | Lab explicit history entry | L4 | Bounded permitted completed/stopped order/result retrieval L4 | Current order/final/history purpose L4; no patient-record browse |
| A01 P0 | Admin People or Organizations entry according to task | A1/A2 → A3/A4/A5 | Locate exact operational scope and choose supported operation | Separate user/org/membership status and intended effect in exact context |
| A02 P1 | Exact account/organization and membership reference | A3/A4/A5 | Supported compatible account/org/membership status action there | Authoritative committed state/provenance there; no new clinical authority |
| A03 P1 | Admin secondary directory/configuration or exact organization | A6/A4 | Actually supported publication/catalog/clinic configuration there | Operational publication/configuration state there; no clinical change implied |

P2/P3 tasks are not dropped: P10 → P8/G1, C12 → C4/source histories, F07 → F5, L07 → future L5, A04 → A7, A05 → future A8. Future P12/C14 continuity evolves P8/C4 only after separate authorization; P13/A06 EACCE/research has no speculative destination. This is an explicit defer decision, not an orphaned CURRENT task.

## Primary destination test

Columns R/I/U/O/M: recurring goal; independently revisited; unique information/actions; nesting would overload another context; meaningful without backend knowledge. These are reasoned qualitative judgments from accepted tasks, not usability findings. Primary navigation does not imply every role's highest-priority action must be primary.

| Proposed primary | R/I/U/O/M | Meaningful accepted tasks / distinct purpose | Challenge resolved |
| --- | --- | --- | --- |
| P1 My care | Y/Y/Y/Y/Y | P04–P06: current next responsibility and existing-care entry | No separate Home duplication; full source content stays contextual |
| P2 Find care | Y/Y/Y/Y/Y | P02/P03/P09: published clinician/time selection and new booking | Different goal from managing existing care; not promoted from directory module merely because it exists |
| C1 Schedule | Y/Y/Y/Y/Y | C01/C02/C07: dated work and exact visit entry | Today is its initial scope; no second Overview destination |
| C3 Care relationships | Y/Y/Y/Y/Y | C08/C10/C11: requests and continuing authorized aftercare | Independent ongoing goal beyond dates; never unscoped patient browse; D01 must support entry |
| F1 Assigned work | Y/Y/Y/Y/Y | F01–F04: exact current responsibility through actual supply | Pending/accepted/remaining are scopes, not three primaries |
| L1 Assigned diagnostics — FUTURE | Y/Y/Y/Y/Y, future role hypothesis | L01–L04: exact order through verified result | Entire workspace future; no new processing module per step |
| A1 People | Y/Y/Y/Y/Y | A01/A02: account-led operational resolution | Operational identity goal distinct from org configuration; no patient chart |
| A2 Organizations | Y/Y/Y/Y/Y | A01–A03: organization-led membership/configuration work | Can begin without knowing one user; no duplicate membership editor |

Rejected standalone primary examples: Cancel appointment (N/N/N/N/Y), Sign prescription (N/N/N/N/Y), Release summary (N/N/N/N/Y), Close consultation (N/N/N/N/Y): exact actions within a recurring task, not independently useful destinations. Prescription detail (Y/Y/Y/N/Y) is meaningful/revisitable but nests without overloading My care's retrieval. Availability (Y/Y/Y/N/Y) nests under Schedule. These judgments permit contextual direct access without creating a global module. Owner gate IA02 explicitly covers secondary all-appointment/prescription access.

## Conceptual navigation depth and P0 journeys

Count a transition between named goal/task contexts as one conceptual navigation step; selecting an object or entering a local task group counts, but scrolling, field edits, mutation review/confirmation and status filtering are **not** separate navigation steps. They remain required deliberate actions. Counts start at the stated entry, exclude a cold application launch, and describe the recommended IA. V1 comparison is source-observed structure, not a measured click benchmark. No arbitrary two-click target is imposed.

| P0 journey / coverage | Proposed conceptual path and steps | Friction/branch explicitly checked |
| --- | --- | --- |
| J1 enter own care, P01 | Signed-out entry → G0 → P1 = 2; expired task → G0 → reauthorized same target = 2 | No detour through role picker; no auto-resubmit; registration acknowledgement is not a session |
| J1 discovery/booking, P02/P03 | P1 → P2 → P3 (selection, availability, review, submit within task) → P4 = 3; independent P2 entry = 2 | G0 interruption adds P3→G0→P3 = 2 if needed; no extra global clinic/booking module hop |
| J1 current appointment, P04 | P1 → P4 = 1; independent older visit P1 → P8 → P4 = 2 | Source scopes filter inside P8. Check secondary appointment discovery in later evaluation; repeated home/recent copies removed |
| J1 released outcome, P05 | P1 → P5 = 1 if a validated task reference; from appointment P4 → P5 = 1; independent P1 → P11 → P5 = 2 | If association unavailable, use explicit source retrieval, not an invented link. No release remains truthful, no dead-end private counts |
| J2 daily work/open, C01/C02 | Workspace default C1 → C5 = 1 after current prerequisites; C1 → C2 → C5 = 2 when logistics review needed | V1 schedule→booking→opening→documentation has up to 3 context transitions; no mandatory intermediate C2. Missing grant: C2→C3→C2 = 2 plus asynchronous patient action; navigation cannot remove consent/acceptance |
| J2 review/document/release, C03/C04 | Inside C5 → C6 = 1; all findings/private-note/summary actions remain C6 | No global documentation/summary page hop or repeated patient orientation; independent release still explicit |
| J2 prescribe, C05 | C5 → C7 = 1; if already in C6, C6 → C7 = 1 | Draft/review/sign in same exact task; no forced global medication catalog destination |
| J2 follow-up/review/close, C06 | C6 or C7 → C8 → C9 = 2 if follow-up selected; current group → C9 = 1 if not | No new follow-up required rule; review can return to group and back (+2 each correction loop); close never saves/releases |
| J3 patient prescription, P06 | P1 → P7 = 1 when relevant; independent P1 → P8 → P7 = 2; P5 → P7 = 1 when valid source reference | No separate global pharmacy page for supply status; correction/history stays within P7 |
| J3 exact pharmacy work, F01–F04 | Workspace default F1 → F2 = 1; accept/review/dispense/recover and remaining items inside F2 | Reduced-purpose completion history: F2→F3→F4 = 2 only if retrieval/correction needed; never full-detail history backdoor |
| J4 follow-up continuation supporting P05/C06 | P5 → P6 → P2 → P3 → P4 = 4; return P4→P6 = 1; clinician C4→C8 = 1 for explicit link | One intentional goal switch to Find care. Booking success cannot imply intent link; no pharmacy/Lab prerequisite or return through unrelated global modules |
| J5 clinician diagnostics, C13 FUTURE | C5 → C10 = 1; final revisit C3 → C4 → C10 = 2 | Order and final review local to exact care context; no mandatory pharmacy step |
| J5 Lab order/result, L01–L04 FUTURE | Workspace default L1 → L2 → L3 = 2; draft/review/finalize within L3 | No invented sample/LIS screens, second-verifier detour or doctor-release queue |
| J5 patient verified result, P11 FUTURE | P1 → P10 = 1 relevant task; independent P1→P8→P10 = 2 | Only after future delivery; current final/amendment/retraction/history in one source context |
| J6 operational access, A01 | Default A1 → A3 → A5 = 2 account-led; A2 → A4 → A5 = 2 org-led | Membership is one canonical detail with two entry references; no overview-card detour or patient chart |

J7 cross-role continuity uses the [handoff table](INFORMATION_ARCHITECTURE.md#handoff-destinations-and-safe-return): each role enters only its permitted destination. There is no navigable universal patient story available to all roles. No P0 branch is orphaned. Changing patient, workspace or authority is an intentional boundary; removing it to minimize steps would be unsafe.

## Destination coverage, orphans and duplicate purpose

All 43 named destination/context records are covered: shared G0–G1 (2), Patient P1–P11 (11), Clinician C1–C12 (12), Pharmacy F1–F5 (5), Lab L1–L5 (5), Admin A1–A8 (8) = **43** records. Each row supplies a parent/entry and task evidence; FUTURE rows do not become current navigation. There are no additional unnamed destinations.

| Check | Evidence / result |
| --- | --- |
| Root entry | G0 resolves legitimate session/workspace; defaults P1/C1/F1/future L1/A1. Each alternate primary reachable through workspace navigation |
| Secondary reachability | P8/P9/P11 from P1; C11 from C1, C12 from workspace; F3/F5 from pharmacy; L4/L5 future lab; A6/A7/future A8 from Admin; G1 shared |
| Contextual reachability | Every detail has explicit list/task/direct authorized entry in sitemap; direct entry cannot bypass current checks |
| Orphan destination | None in proposed structure; EACCE/help/notification placeholders deliberately excluded, not dangling destinations |
| Duplicate details | P4 appointment, P7 prescription, C6/C7/C8 source contexts and A5 membership canonical per authorized actor; multiple references reuse them |
| Duplicate retrieval | P8 logistical/prescription/legacy lists versus P11 released summary/recommendation index have distinct purposes; P8 only references P11, never copies its list |
| Home duplication | No separate Patient Home plus My care, no Today plus Schedule, no Admin dashboard plus same entity lists |
| Task action versus destination | Sign/cancel/accept/dispense/release/close have action locations in coverage; no standalone global destination |

## Authority, capability and anti-pattern checks

| Prohibited pattern / boundary | Proof in proposal / result |
| --- | --- |
| Dashboard of unrelated cards | Patient immediate/conditional/on-demand rules reference current tasks, not feature grid; Schedule owns dated work; Admin enters People. No visual composition chosen |
| One nav item per backend module / entity-driven Patient | P1/P2 are existing/new care goals; prescriptions, follow-up and results subordinate; I01 destination test maps every primary to tasks |
| Giant clinician global menu during consultation | C6–C10 local to exact C5; global exit intentional; no component selected |
| Pharmacy patient browser | F1 exact routed scope and F3/F4 reduced history; no patient directory, profile/consultation links, names/instructions in history or unrelated route counts |
| Admin clinical console | A1–A7 operational identities/configuration only; no charts, clinical counts, impersonation, signing, assignment creation or break-glass |
| Booking or role switch grants authority | P9/C3 bilateral prerequisite, C2 logistics-only until current grant; scope switch only server-supported actual permissions, D07 |
| Old authority retained by navigation/history | Current checks on deep entry/back/replay; safely clear unavailable scope/payload; history purpose never revives fulfillment |
| Future features appear Live | P10/C10/L1–L5/A8 FUTURE; I4/notifications/EACCE have no active destination; current-but-unintegrated P7/C7/F1–F4 marked GAP; no I3 hosted parity claim |
| Same destination under multiple names | Canonical object IDs and retrieval-purpose rules above; source readers re-enter the same actor-specific detail |
| English structure mechanically copied into Arabic | I09 plus naming requirements require independent natural-Arabic task/grouping/return validation with equivalent authority/status semantics; no final translated menu |
| Mobile overloaded with desktop destinations | Two Patient/two Clinician/one Pharmacy/one future Lab/two Admin primary goals; all management/history secondary; consultation local task context prioritized |
| Deliberate actions collapsed | Separate sign/release/route/accept/dispense/future-finalize/close review and feedback; no automatic clinical retry/save/release or completeness requirement |
| New clinical/data model invented by grouping | Outcome association is source-labelled navigation only; D03 forbids inferred episodes/aggregate API; clinical/fulfillment contracts unchanged |

## Fresh-agent comprehension

**Actual result: 20/20 clear at proposal level.** A separately tasked fresh product/design reader (`ia_fresh_reader`) read AGENTS/current GitHub Issue #72 and latest authorization 6565633586, CURRENT_STATUS/charter/source index, then only the proposal, sitemaps and decision register. It did **not** read this validation file/answer key, runtime/backend code or the parent conversation. It returned numbered answers with document/section references for all 20 questions below, found no contradictions/material gaps within that restricted set, and correctly identified D01–D09 and the pending IA01–IA05 owner gates. It made no edits. Final candidate, wording and presentation remain intentionally unresolved. This is an actual separate-agent comprehension check, not independent final Stage 3 acceptance, runtime fidelity proof or an empirical usability study.

| # | Required question | Expected answer / source |
| --- | --- | --- |
| 1 | Patient primaries? | P1 My care, P2 Find care; Patient sitemap |
| 2 | Why each primary? | Existing-care next responsibility P04–P06 versus independently revisited seeking/booking P02/P03/P09; primary destination test |
| 3 | Booking starts where? | P2 Find care, including P6 continuation, then P3; Patient sitemap |
| 4 | Existing appointment lives where? | Canonical P4 under My care; P1 direct or P8 all-appointment retrieval |
| 5 | Follow-up lives where? | P6 released recommendation under P5 outcome; P11 independent retrieval; C8 author/link task |
| 6 | Prescription fulfillment status? | P7 signed prescription detail including actual per-item supply/correction, not separate pharmacy page |
| 7 | Future Lab results? | P10 within My care and later P8 source retrieval, entire capability FUTURE |
| 8 | Primary versus contextual? | Recurring independently revisited goals versus exact object/task; actions stay with target; I01–I04 |
| 9 | Clinician primaries? | C1 Schedule (Today scope), C3 Care relationships; Clinician sitemap |
| 10 | Consultation versus global nav? | C5 sustained exact visit context with C6–C10 local groups, not global modules; proposal §5 |
| 11 | Prescribing where? | C7 inside consultation; prior-source correction/routing entered through permitted C4 |
| 12 | Review/close where? | C9 inside C5, independent explicit close with no auto-save/release |
| 13 | Pharmacy primary IA? | F1 Assigned work; exact F2 detail, secondary reduced F3 history/F4 fact correction |
| 14 | Pharmacy general patient browse? | No; exact organization/membership/routed artifact and purpose-specific minimal projection |
| 15 | Future Lab IA? | L1 assigned diagnostics → L2 exact order → L3 entry/finalization, L4 bounded history/correction; all FUTURE |
| 16 | Admin access? | Operational people/orgs/memberships/directory/supported settings only; no clinical payload/override |
| 17 | Mobile structural difference? | Small recurring primary goal set, management/history secondary; consultation/exact-work local context retains identity/state/actions, no desktop-item copy; proposal §7 |
| 18 | Labels final? | No, all working semantic labels; final Content System + Arabic UX deferred |
| 19 | Visual decisions final? | None made; no component/layout/brand/Design System specification |
| 20 | Owner decisions still open? | IA01 workspace model, IA02 Patient, IA03 Clinician, IA04 staff/Admin, IA05 responsive/visibility; independent review + explicit acceptance required |

## Repository validation and CI handoff

Required focused checks: complete-base whitespace check; existing `node scripts/ci/check-docs.mjs`; existing `node --test tests/ci/*.test.mjs`; actual `classifyPaths` evaluation of changed paths. No new runtime tests, dependencies or CI changes. Preserve byte-identical non-documentation tree, accepted contracts, all screenshots/assets, schema/migrations/OpenAPI/manifests/lockfile through base-to-head Git comparison and tracked working-tree comparison.

Observed local results: docs/source-index/local-reference checks PASS; **30/30 existing CI-policy tests PASS** (the unavailable-ref fixture intentionally emits a bad-object diagnostic while its fail-closed assertion passes). Exact task-ID/priority comparison against Stage 2 confirms 37/37 coverage, 23 P0/14 P1 and 8 future tasks. Sitemap record count/uniqueness confirms 43/43. Actual changed-path classifier selects only DOCS_GOVERNANCE/docs-check, with all heavy lanes false. Working-tree Git-object comparison confirms **481 existing non-Markdown tracked files byte-identical to base**, including all runtime/config/schema/OpenAPI/dependencies and protected screenshots/assets/migrations. The ten changed paths are documentation Markdown only; accepted contract files remain unchanged. Complete candidate-range checks are repeated after the final documentation commit, before push.

Expected remote route: **DOCS_GOVERNANCE → classify → docs-check → validate**. Frontend/backend/PostgreSQL/Docker/dependency audit must be explicitly skipped by policy. Confirm actual classification, lane conclusions and timestamps on final PR head; investigate any heavy lane rather than waiting through Full CI. Baseline main post-merge run [41362415955](https://github.com/abuhmaid28/egyhealth360/actions/runs/41362415955) was independently read through GitHub: completed/SUCCESS on exact base `248347f72a7c1d4646cbceb7224f0ec1a9d92f06`.

Exact final head and CI duration live in the PR handoff after this record is committed. No merge or auto-merge authorization. No deployed runtime parity, frontend/backend change or new runtime validation claim follows from docs Green.

## Whole-project handoff limits

Current status/source index/roadmap are refreshed for accepted Stage 2 and proposed Stage 3. Architecture/domain/security/clinical contracts remain unchanged through I3 Slice 2. Existing health B with non-blocking debt is inherited; no concrete new P0/P1 foundation defect was found, and no fresh runtime/deployment audit was performed. D01–D09 remain later integration/exposure/content/research needs, not fixes in this sprint. Independent Stage 3 review, explicit owner decisions and a whole-project health disposition precede any next-stage authorization. Content/Arabic, Brand, Design System, frontend and domain implementation remain stopped.
