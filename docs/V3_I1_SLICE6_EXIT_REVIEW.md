# V3-I1 Slice 6 — Combined exit and security review

Slice 6 IMPLEMENTED / IN REVIEW. **V3-I1 INCOMPLETE; Issue #39 OPEN.** No merge is authorized. This is the implementation agent's review, **not independent approval**. The separate reviewer must inspect the exact final head and CI before separate Product Owner merge approval.

## Authority and independently fetched baseline

The first repository mutation was [Product Owner authorization comment 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109), recording this conversation's Slice-6-only instruction. Before source changes, remote main, Issue #39 body/comments, open PRs, Actions, merge parents and clean local state were fetched. No open PRs or commits after the expected baseline existed. The local `work` checkout was clean but at the older Slice 4 merge; it was preserved and the requested branch created directly from fetched origin/main.

| Baseline evidence | Exact value |
| --- | --- |
| Repository / branch | abuhmaid28/egyhealth360 / main |
| Main / Slice 5 merge | `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, normal PR #45 merge |
| Parent 1 | `e75671ec0adfdf0f0d71485eebb104728b619e91` |
| Parent 2 / approved Slice 5 head | `c9f47f9cd4b14b5b1e906e70762a4ad0704316c0` |
| Exact-main Bootstrap | [40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467), push/main, exact merge SHA, completed/success |
| Validate job | 121346667188; all 36 steps successful; decoded logs inspected |
| Slice 5 completion | [6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558) |
| Implementation branch | `feature/v3-i1-slice-6-exit-security-review` |

Subsequent baseline checks still matched. Historical Issue/ADR/validation status records remain historical; mutable current delivery statements are reconciled. The authorization is bounded to verification, hardening and concrete frozen-contract corrections, never V3-I2+.

## Scope, reviewed components and threat model

Reviewed the I1 contract, Slices 2–5 contracts/evidence, D01–D36/ADR lineage, identity/auth/password/session persistence, own-profile and registration boundaries, organization/membership services, directory SQL/projections, bilateral services and SQL guards, all fourteen migration sources, Prisma model/constraint inventory, M1 fixture, M2 scoped services and privacy functions, API/OpenAPI, CI and runtime/test harnesses.

Practical OWASP ASVS 5.0 L1 is the reference, with risk-driven L2 attention to authentication, sessions, authorization, data/privacy and logging. Threats include hostile anonymous HTTP input, forged targets and replay, valid unrelated/staff/ADMIN principals, stale authority while waiting, partial audit writes and ordinary SQL structural bypass. Database schema owner/superuser, process administrator, stolen live session credentials, production abuse perimeter and formal compliance/certification are outside the claim. All execution uses synthetic disposable data.

No production source, public API/schema, dependency, historical migration or M1 fixture implementation changes are needed by the findings. Added verification uses existing Node/PostgreSQL tools; no new dependency.

## Executable cross-slice authorization matrix

`tests/integration/v3-i1-slice6-matrix.test.mjs` creates populated M1/M2 plans, BP, follow-up, encounters, applicability and INITIAL action, then real compatible memberships, published directory and bilateral history. Each actor is tested against eight protected resource classes, own profile, organization scope, participant history and public directory. Successful reads/denials must add zero audit events. Public/private HTTP and anonymous cases are additionally exercised by the combined runtime and retained HTTP suites.

A = approved minimized read; D = denied. Every protected A requires a current ACTIVE account and nonrevoked/unexpired matching session.

| Actor | Patient A minimal profile | BP/follow-up/encounter/normalized/applicability/CareAction | CarePlan service | Own profile | Org member read | Request/assignment history | Directory |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | D | D | D | D | D | D | A public |
| Patient A | A | A own | D (historical clinician-only service) | A own | D | Own only | A public |
| Patient B | D | D | D | A B only | D | B only | A public |
| Assigned clinician (legacy, no request) | A | A | A | D | Exact membership only | Own only | A public |
| Unassigned clinician | D | D | D | D | Exact membership only | Own only | A public |
| Published clinician + ACTIVE clinic membership | D | D | D | D | A exact | Own only | A public |
| Same clinician + PENDING request | D | D | D | D | A exact | Own request only | A public |
| Fresh designated acceptance + ACTIVE assignment | A | A | A | D | Exact membership only | Own only | A public |
| Accepted request + exact ENDED assignment | D | D | D | D | Exact membership only | Retained minimized history; clinician patientId null | A public |
| LAB_STAFF + ACTIVE LABORATORY membership | D | D | D | D | A exact | D | A public |
| PHARMACY_STAFF + ACTIVE PHARMACY membership | D | D | D | D | A exact | D | A public |
| ADMIN | D | D | D | D | D (management is separate) | D | A public |
| Disabled / revoked / expired staff principal | D | D | D | D | D | D | A public |

The runtime tests real HTTP patient A/B isolation, all fixed roles, registration injection, patient-only account creation, canonical duplicate no-overwrite, explicit login, own profile, discovery, pending denial, designated acceptance, BP access, withdrawal, history, fresh establishment, stale end/withdraw, account disable and logout. Existing auth/profile/directory/relationship and M2 suites extend disabled/revoked/expired checks to their own meaningful actors and operations. Patient demographics never become applicability evidence.

There is no staff clinical inheritance, role array or dynamic permission system. ADMIN management cannot accept/authorize relationships, impersonate, access clinical payload or create a new product assignment path. Prescription/lab/private-note/dispense routes and models do not exist; denial is not a claim those later workflows are implemented.

## Sole grant and independent authority domains

Clinical source inspection confirms `ClinicianPatientAssignment` ACTIVE/null-ended is the only clinician grant in EH-007, CarePlan, BP, EH-012, normalized evidence, applicability, amendments and CareAction, including their SQL provenance guards. RelationshipRequest never appears as an alternate clinical predicate. Legacy direct provisioning helpers remain internal historical utilities, not new ADMIN HTTP APIs.

The combined HTTP proof explicitly removes provider publication, ends membership and suspends its clinic while an accepted assignment exists: clinical access continues, public eligibility disappears. Withdrawal ends only the bound assignment and preserves ACCEPTED provenance. Regrant requires a fresh request/acceptance and distinct assignment identity; stale commands do not retarget it. Ending does not rewrite publication/membership. Current account/session failure denies subsequent operations; no remembered projection is a ticket.

## Public/private exposure and HTTP review

| Boundary | Allowlist / exposure rule | Evidence |
| --- | --- | --- |
| Anonymous registration | Generic 202 accepted only; no IDs, session or cookie | Slice 3 HTTP + combined journey; cross-slice injected fields rejected |
| Own profile | Derived own id/displayName/dateOfBirth/sex; only latter three replaceable | Patient-entry and combined matrix; no staff/ADMIN entitlement |
| Directory specialty | key/displayName | Exact Slice 4 projection/schema tests |
| Directory clinic | independent public id/displayName/city/address | No operational organization provenance |
| Directory provider | independent id/displayName/specialty/eligible clinics | Canary internal user/profile/member/provider-row IDs, hash/email absent; exact nested key tests |
| Request | id/public providerId/display names/status/event times/bound assignmentId | No operation key, internal account/clinician IDs, credentials or clinical content |
| Assignment history | approved participant identity/state/times/end role; ended clinician patientId null | Exact-target IDOR, retained history and new read/end blocking test |
| M2 ordinary reads | Current resource policy plus Issue #31 masking | Combined post-enrollment privacy suppresses action detail/count for patient and clinician; full historical privacy suites |
| Errors / logs / HEAD | Generic approved envelope; no raw parser/driver/SQL/stack or canary reflection; HEAD empty | Retained error-sanitization, auth, BP, follow-up, entry, directory and relationship HTTP tests; new audit-fault canary |

HTTP source and executable suites retain exact method handling, route casing/trailing/encoded behavior per slice contract, duplicate/unknown query and JSON keys, flat primitive inputs, hidden/getter/prototype rejection where required, fatal UTF-8, JSON/media/encoding/body/header/URL bounds, Origin/Fetch Metadata/CSRF, no-store and no conditional authorization 304. Registration and directory use their own bounded contracts; existing login aliases are not silently redefined as new I1 policy. Compressed parser/inflation and malformed input tests remain in the full sanitization suite. No new logging path; Nest logger remains disabled. Private fields in authenticated internal projections are not confused with public directory fields.

OpenAPI remains byte-identical at SHA256 `29929536d16f7c1abd21c21aed8dafbc97a1150f58bf9bcbc67d1e46dc02b48b`: 25 path groups / 22 schemas. Existing exact-delta tests retain every older schema/route byte. Actual controller inventory is health/auth, patient-entry, EH-007, BP, EH-012, directory and participant relationships; organization/directory management, CarePlan, normalized evidence, applicability and CareAction remain internal services. No new endpoint is added to tidy documentation.

## Independently inspected combined lock graph

Source locations: `packages/db/src/{auth,patient-entry,organizations,directory,relationships,demo,care-plans,blood-pressure,followup-common,normalized-evidence,observed-applicability,bp-amendments,care-actions}.ts`, plus migration-owned provenance functions. This map derives from current executable source, not just earlier reports.

| Operation domain | Actual lock order / strength |
| --- | --- |
| Login/session creation | User NO KEY UPDATE → presented previous Session UPDATE → session/audit writes; current verified hash/status checked under User lock |
| Logout | Exact Session UPDATE → conditional current-account/session revocation + atomic audit; no later explicit User UPDATE lock |
| Registration | Canonical unique User INSERT (`ON CONFLICT(email) DO NOTHING`) → new PatientProfile → audit, all atomic; unique-index wait covers absence |
| Own profile | Actor User NO KEY UPDATE → exact Session UPDATE → own PatientProfile UPDATE → final current-session check |
| Organization/membership | Sorted relevant User NO KEY UPDATE → Session UPDATE → Organization UPDATE (management) / SHARE (member read) → exact Membership UPDATE/SHARE; org row serializes absent grants; active-pair unique backstop |
| Directory management | Sorted actor/clinician User NO KEY UPDATE → Session UPDATE → ClinicianProfile SHARE → Specialty SHARE (catalog mutation UPDATE) → sorted Organization/ClinicDirectory SHARE (clinic edits UPDATE on directory row) → Membership SHARE → ClinicianDirectory UPDATE → DirectoryAffiliation UPDATE/write |
| Relationship mutation | Four-table ROW EXCLUSIVE intent **before rows** → sorted participant User NO KEY UPDATE → Session UPDATE → ClinicianProfile SHARE → PatientProfile SHARE → transaction pair advisory lock → exact Assignment UPDATE → Request UPDATE → end provenance/audit; read takes table intent then actor/session locks |
| M1 deterministic seed | users/patient_profiles/clinician_profiles/assignments SHARE ROW EXCLUSIVE table locks before rows; no fixture-semantic rewrite |
| M2 clinical | Actor User NO KEY UPDATE → Session UPDATE → ClinicianProfile SHARE → ACTIVE Assignment SHARE → PatientProfile SHARE, or UPDATE initially for EH-014 generation → exact resource locks (plan/template, encounter/BP; amendments take ordered BP UPDATE locks) → final expiry check |
| Public directory | One READ COMMITTED statement, no row-authority locks/cache; prior committed state until revocation COMMIT, next statement reflects it |
| AssignmentEndProvenance | Insert while exact assignment is ACTIVE/locked; deferred commit check requires that exact assignment ENDED at the same endedAt; no historical actor backfill |

Directory methods take only their relevant subsequence, never acquire patient/assignment locks. Catalog-only specialty edits do not then acquire clinician User locks. Relationship reads serialize participant end through the participant User prefix; no promise of a universal multi-statement serializable snapshot. Pair advisory key is `hashtextextended('eh-i1-relationship-v1:'+clinicianId+':'+patientId,0)`: collisions only serialize unrelated work. Unique operation keys and partial pair indexes are final backstops.

The apparent relationship PatientProfile-before-Assignment versus M2 Assignment-before-PatientProfile order is bounded by relationship's sorted participant User locks: the competing assigned clinician must already serialize on the shared clinician User before reaching those resources. Patient SHARE is never upgraded while waiting for an M2-held assignment. New profile/end and member-or-directory/M2 tests prove representative shared-prefix orderings. Table intent prevents the relationship/M1 table-lock inversion. Audit FK KEY SHARE stays compatible with User NO KEY UPDATE.

Normal I1/M2 service transactions use READ COMMITTED, lock_timeout 5s, statement_timeout 10s, maxWait 5s and transaction timeout 30s. M1 retains its historical 10s lock/15s initial statement then 5s statement limits. There is no automatic stale-authority retry after timeout/deadlock/serialization failure. Final database-clock session checks roll back tentative state/audit on expiry. A correctly serialized operation can finish before a later revoke; no response recall is claimed. EH-007/public directory retain their documented statement-snapshot limits.

## Combined concurrency evidence map

All referenced tests are rerun in the complete final suite. New tests print distinct actual PostgreSQL blocker/waiter PIDs, and assert durable outcomes; older proofs are executed again, not accepted by citation alone.

| Required adversarial overlap | Executable source |
| --- | --- |
| Registration duplicate/existing identity, winner commit/rollback | `patient-entry.test.mjs` |
| Accept vs patient/clinician disable, session revoke/expiry, tentative-write final expiry | `relationship-concurrency.test.mjs` |
| Accept vs legacy assignment end; exact end/accepted withdrawal; old end vs fresh acceptance | Relationship functional/concurrency suites |
| Accepted withdrawal/fresh relationship; stale prior authorization cannot retarget later grant | Relationship concurrency + combined runtime |
| Relationship vs genuine deterministic M1 seed; exact end vs M2 INITIAL, both orders | `relationship-compatibility.test.mjs` |
| Member end, clinician disable, org suspension, clinic/specialty publication vs directory publication | `directory-concurrency.test.mjs` |
| Directory during six uncommitted revocations, next committed read | Directory concurrency MVCC cases |
| Current relationship read vs exact end; profile replacement vs participant end, both orders | **New** `v3-i1-slice6-concurrency.test.mjs` |
| Member end / provider unpublish vs protected M2 BP read, both orders, no assignment rewrite | **New** Slice 6 concurrency tests |
| Profile read/update vs revoke/disable/expiry, both orders | Patient-entry suite |
| Membership operation vs user disable; org read vs M2 INITIAL | Organization/migration suites |
| Bounded real 5s timeout and real PostgreSQL deadlock service victim | Organization, directory and relationship concurrency suites; no retry/partial audits |

## Database, migrations, fixture and audit findings

All fourteen historical SQL files/checksums are preserved; no schema delta or fifteenth migration. Fresh deploy/status/redeploy and historical populated upgrade chains run with the actual Prisma runner. The current populated 13→14 proof compares all 29 prior domain tables and ledger, ACTIVE/ENDED/M1 assignments and CareAction assignment references, and proves new provenance tables empty. The new combined matrix additionally snapshots all 31 final domain tables plus ledger after real bilateral and M2 history/privacy, repeats deploy/status and requires exact zero-write equality. This final-stage proof supplements the actual upgrade chain; it does not pretend a no-op deploy is a new upgrade.

Reviewed role discriminator/composite FKs, compatible role/kind membership, partial active pair uniqueness, public locator uniqueness, exact affiliation scope, request pending-pair/accepted-assignment uniqueness, exact assignment/context FKs, lifecycle chronology, immutable terminal histories, deferred end completeness, RESTRICT FKs, and update/delete/truncate guards. Existing SQL/Prisma/TEMP tests attempt bypasses on final constraints. No dangerous clinical cascade introduced. Trusted function lookups required by later contracts use durable public relations; initial simple assignment/audit guards have no redirectable table lookup. Ordinary SQL structural guards are not session authentication or protection from owners/superusers. Historical profileless accounts have no universal mandatory-profile/role-immutability trigger; this is a documented existing threat boundary, not a new role-changing product path.

M1 `eh-m1-demo-v1` code/semantics remain unchanged: exact repeat/conflict handling and retained identity/hash/assignment/history are revalidated. No automatic publication, membership, specialty verification, consent, acceptance or end actor is fabricated. New proof manifest is separate: `eh-v3-i1-slice6-exit-proof-v1`, 25 grouped real-HTTP cases, isolated synthetic database, no startup seed.

Audit is append-only for ordinary UPDATE/DELETE/TRUNCATE (including zero-row statements). Mutations use genuine actors, exact target and empty metadata, atomically with source state. Replays/no-ops/denials add no successful event. Retained forced audit-failure tests cover registration/profile/org/member/directory/request/acceptance/accepted withdrawal; new participant-end audit failure proves assignment/end provenance/audit all roll back, directory stays published and protected M2 access stays valid. No password/hash/token/session/clinical body/operation key enters public audit projection; no new audit browser.

## Findings, fixes and residual risks

| Severity | Finding / handling |
| --- | --- |
| Critical / High | No unresolved defect identified by the executed scope; local full validation is green; independent review remains mandatory |
| Medium | Two existing MODERATE fast-uri dependency advisories, unchanged and unsuppressed; approved HIGH gate remains clean. No new contract defect identified |
| Low | Two existing LOW fast-uri dependency advisories remain unchanged. Current mutable docs/Issue status lagged Slice 5 completion and Slice 6 authorization. Reconcile current delivery/inventories/gates; retain historical reports and ADR bodies. This prevents authorization/status confusion; no permission policy changed |
| Informational | Existing unsuppressed fast-uri advisories: 2 LOW / 2 MODERATE, both HIGH gates pass; no dependency/suppression change |
| Informational | Existing pg concurrent-query deprecation, Prisma/OpenSSL notices and historical CareAction `M2_IN_PROGRESS` manifest label; no failed/skipped gate implied |
| Informational | New test fixture integration mistakes were corrected before the final run; these were verification defects, not discovered product authorization bugs |

Residual prototype limits remain: process-local registration budget/reset and no distributed abuse guarantee; current snapshot/in-flight boundaries; raw DB administrator is trusted; no production readiness, identity assurance, ASVS certification, HIPAA/GDPR or clinical-validation claim. Finite examples are evidence, not exhaustive proof of every possible interleaving.

## Scope-leak review and exclusions

Runtime source/schema/OpenAPI inventory was searched for booking, availability, reservation/reschedule, general consultation/problems, prescribing/dispensing, lab fulfillment/imaging, notification/timeline, EACCE/closure/recurrence and AI treatment/dose logic. No early implementation exists. Historical clinical rule declarations, HTN FollowUpAppointment/ClinicalEncounter, immutable INITIAL CareAction/decision and package scaffolds retain their original meaning; policy/documentation mentions are not runtime implementations. No historical clinical code was removed.

No V3-I2–I5, D37+, generalized IAM, new permissions/roles/ADMIN powers, UI/UX/design/branding, architecture rewrite or deployment. V3-I1 cannot be COMPLETE before independent exact-head review, successful exact-head CI, separate explicit Product Owner merge approval, merge and independently confirmed successful exact-main push verification. Issue #39 remains OPEN. EACCE NOT STARTED; Design/UI FROZEN.

## Candidate verdict and reviewer instructions

Final execution result and exact tested revision are recorded in [Slice 6 validation](V3_I1_SLICE6_VALIDATION.md). **V3-I1 Slice 6 candidate verdict: READY FOR INDEPENDENT REVIEW.** Combined evidence is implemented and locally green; this is not independent approval or I1 completion. Remote exact-head CI is a separate gate reported on the PR/final handoff after actual completion. Independent review must recheck the sole-grant predicates (including SQL), lock-prefix reasoning and actual race logs, final 13→14/31-table preservation, operation-key/exact-old-target behavior, ended participant projections/Issue #31 masking, HTTP parser/failure canaries, immutable contract bytes, additive CI gate and governance. The implementing agent must not approve its own PR or merge it.
