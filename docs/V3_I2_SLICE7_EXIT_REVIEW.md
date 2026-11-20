# V3-I2 Slice 7 — Combined exit proof and explicit Consultation Close

Consultation Close is implemented under the continuation authorization. Final technical exit verdict, exact head, complete counts and observed Bootstrap results are recorded in PR #63 after validation; pending checks are not described as passed. I2 milestone completion still requires independent review, merge and exact-main verification. Keep PR OPEN / UNMERGED, auto-merge OFF.

## Authority and continuation

[Issue #48 authorization 6536467435](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6536467435) permits minimum frozen-invariant fixes. [Control Center continuation review 5723355039](https://github.com/abuhmaid28/egyhealth360/pull/63#pullrequestreview-5723355039) explicitly requires this close remediation on the SAME `feat/v3-i2-slice7-exit-review` branch and PR #63. The earlier `ca37f5a2a60904819c70e78f323eeb214ecda880` BLOCKED report was not a completed handoff. Close is an existing frozen I2 §§8/10 invariant, not a new product decision.

Original base: `b8ed01e4546ac94e52f9fcbec2f23e90b6fc6262`, Bootstrap 41146078616 SUCCESS. Before final full validation, Bootstrap **41211238454** was verified COMPLETED / SUCCESS on exact main `689a9a5c1e8e6d262dfce05a9adc27cc87b01304`, push/main, attempt 1: postgres 124566504438, docker-runtime 124566504590, static-browser 124566504625, aggregate validate 124570081382. Main is normally merged into this same branch; ordered parents/final head belong in PR evidence. No rebase or force push.

## Findings and minimum fixes

| Finding | Implementation |
|---|---|
| I2-S7-SEC-01, P2: restricted-document changed-payload retry exposed conflict existence | Preserved the privacy-first denial fix. Restricted exact/changed replay denies uniformly; unrestricted changed payload conflicts; existing safe privacy acknowledgement remains. Original red regression reproduced 409 != 404. |
| I2-S7-EXIT-01: Consultation Close absent | Remediated with the explicit close operation, one additive migration 20, exact current treating authority, immutable server-owned close actor/time/assignment/history and PostgreSQL concurrency/rollback proof. OPEN→CLOSED and IN_CONSULTATION→CONSULTED commit atomically, with no implicit signing, release or clinical completion. |

This is a second pass over merged Slices 1–6 with bounded remediation, not an external penetration-test certification or independent approval of this PR's final fix. Control Center still reviews the final exact head.

## Exact close API and authority

`PUT /api/v1/consultations/{consultationId}/close` accepts exactly `{operationKey,expectedVersion}`; expectedVersion is consultation version (OPEN=1, CLOSED=2). Canonical lowercase UUIDv4; no caller actor, timestamp, patient, status or assignment. Success/exact replay: 200 `{data:{id,encounterId,bookingId,state:"CLOSED",bookingState:"CONSULTED",version:2,closedAt,providerId,clinicId}}`. Internal actor/patient/profile/assignment/membership/affiliation/key/audit values are omitted. No generic consultation read/metadata endpoint. Other methods return 405; HEAD is bodyless.

Only exact booked AND actual treating clinician may close, with valid current session, ACTIVE clinician/current profile, ACTIVE patient/profile, current ACTIVE/null-ended ClinicianPatientAssignment and exact ACTIVE CLINIC, compatible ACTIVE/unended membership, valid provider/specialty/clinic/affiliation without withdrawal. Publication flags are not ongoing clinical authority. A fresh valid assignment can supply current authority after an old opening grant ends; the exact close grant is retained separately. Booking, authorship, role, membership or past success never replaces clinical authority. No patient/ADMIN/LAB/PHARMACY/other-provider shortcut.

Retain strict bounded JSON/decoded duplicate rejection/fatal UTF-8/media/encoding, 16KiB body, 8192-byte headers/2048-byte URL, Origin/Fetch Metadata/session CSRF, no mutation query or Idempotency-Key, no-store/no ETag/Last-Modified/304. Existing safe BOOKING_NOT_FOUND / BOOKING_CONFLICT / BOOKING_UNAVAILABLE error hierarchy. No clinical values/SQL reflected in errors.

## Persistence and locks

One new additive migration `20261031140000_v3_i2_consultation_close` (20 total); all nineteen historical SQL bytes/lockfile unchanged. No new model/table: 48 remain. Add consultation version and nullable close time/actor/assignment/command/key. Existing OPEN rows retain all historical values, gain version 1/NULL close metadata, and receive no fabricated close facts. No destructive data migration/backfill.

The sole legal update is one OPEN→CLOSED transition. Opening/source provenance remains immutable. Append-only CLOSE BookingEvent/BookingOperation retains exact source/result; one genuine `CONSULTATION_CLOSED` audit has DB time and `{}` metadata. Row/deferred guards require both terminal states, correct current close grant, matching operation/result/event and current-transaction audit, and reject an orphan close operation or fabricated OPEN/CLOSE booking chain without a consultation/encounter. SQL cannot inject close time or reopen/retarget history. Ordinary guards are not database-session authentication and do not resist schema owners/superusers.

Canonical prefix: compatible M1 table intents → sorted involved Users NO KEY UPDATE → exact Session UPDATE/current checks → ClinicianProfile SHARE → current Assignment SHARE → PatientProfile SHARE → existing directory/organization/membership/affiliation order → settings SHARE → patient EH2P then clinician EH2C advisory → slot UPDATE → booking UPDATE → consultation UPDATE / encounter SHARE → retained operation/history/audit. Current authority is checked after waits, before mutation and before commit. READ COMMITTED, 5s acquisition/lock, 10s statement, 30s transaction; no automatic retry, late User lock or legacy lock-order change.

Ledger scope `(actorUserId,CLOSE,operationKey)` with canonical consultation/expectedVersion fingerprint. Exact replay rechecks current authority and returns the same retained result with no duplicate history/audit. Changed payload/target conflicts after scope authorization. Rollback consumes no key and leaves no partial state. Released documents and FollowUpIntent remain independent; explicit author commands after close still require their own current authority/privacy. Close never signs/releases drafts, creates/completes CareAction, invokes EACCE, creates ClosureAssessment, prescribes, orders labs or triggers pharmacy behavior.

## New close evidence

- Core/HTTP: atomic states, actual actor/time/close grant, exact replay, current authority/role/IDOR, caller-identity/time injection and parser/browser security; no implicit release; independent explicit release after close; illegal cancel/reschedule/no-show/correction denied.
- Independent PostgreSQL close-vs-close distinct/same keys and winner rollback; both-order assignment ending/session revoke/clinician and patient disable/org suspension/membership end/affiliation withdrawal; observed `pg_blocking_pids`; expiry after wait and tentative audit; audit failure, real timeout/external deadlock, reusable keys and no automatic retry.
- Direct SQL partial/missing operation/audit/result/orphan-chain/provenance/terminal mutation rejection.
- Populated real-runner 19→20 preserves all original values/ledger/checksums and fabricates zero closes; OPEN and CLOSED repeat deploy/status ZERO_WRITE. Original populated 19-repeat proof remains explicitly pinned to 19.
- Combined runtime **v2** executes genuine HTTP/database-clock close between private drafts and independent explicit releases: 17 assertions. All existing Docker runtimes and real Browser→Next→Nest→PostgreSQL regression remain.

## Combined coverage and evidence map

Existing slice suites remain intact. New coverage composes their actual services through one Nest application, rather than replacing source checks with a frontend simulation.

| Requirement | Executable evidence retained or added |
|---|---|
| Finite capacity, patient/clinician overlap, adjacency, competing reservations | `availability*.test.mjs`, `bookings-integrity.test.mjs`, `bookings-concurrency.test.mjs`; independent SQL GiST/unique backstops, observed waiters, commit and rollback. Combined journey checks real HTTP capacity conflict without patient/booking leakage. |
| Idempotency, replay abuse, actor/command/module key scope | Existing booking/documentation/intent HTTP and race suites; new `v3-i2-security-exit.test.mjs` reuses one UUID across modules/commands, tests actor independence, changed-payload conflicts, unauthorized replay, immutable retained counts and restricted replay denial. |
| Cancel, atomic reschedule commit/rollback, attendance/no-show | Existing real PostgreSQL booking races/integrity suites and real-clock booking runtime. No-show is explicit; corrections do not reopen terminal reservations. Opening races retain cancel/reschedule/no-show exclusion. |
| Clinical grant, current authority, revocation/expiry, disabled identities, source org/member/affiliation loss | Existing opening/documentation concurrency and full Slice 6 authority matrix (both orderings and rollback); new combined withdrawal and suspension checks across both clinical modules. No booking/role/author shortcut. |
| Consultation exact provenance, current relationship, cross-provider/patient isolation | Opening integrity/HTTP/concurrency suites and combined persisted booking/encounter/patient/booked/treating/recorder assertions. New cross-provider link tests confirm logistics creates zero target-provider clinical authority. Explicit close is covered by the new core, concurrency, integrity, upgrade and HTTP journey proofs. |
| Human complaints/problems/diagnoses/allergy uncertainty, private note author-only, released summaries, immutable correction/addenda/history | Existing documentation unit/HTTP/integrity/concurrency/populated upgrade and runtime; new composed journey checks explicit human values, unreleased/private canaries, explicit release, patient HEAD and withdrawn-author denial. |
| Privacy/IDOR/reference/count/history suppression | Existing documentation and intent privacy suites plus new independent same-consultation restrictions, linked-booking/reference suppression, wrong-patient cancelled versus nonexistent target uniform 404, changed replay and observed privacy races. No cross-module automatic privacy propagation. |
| Intent draft/release/correction/link/replacement, other-provider same patient | All retained `follow-up-intents*.test.mjs`, including cross-provider and replacement races; new composed HTTP link/isolation/security checks. Booking and linking remain explicit independent commands. |
| EH-012 compatibility, no auto-booking/CareAction/EACCE | Historical followup/BP/normalized/CareAction suites and intent compatibility tests; composed journey verifies general encounter absent from legacy HTN history and no CarePlan/FollowUpAppointment/CareAction rows. |
| Historical migrations 1→19, populated upgrade, old rows, no destructive/history edits, ZERO_WRITE | New exact-base 19-file plus migration-lock SHA-256 fixture/test. Unchanged historical migration verifier and every populated upgrade suite, including 14→15→16→17→18→19. New populated latest-schema repeat proof includes released docs, intent correction/privacy/link/replacement, booking cancellation, EH-012 and audit across all 48 domain tables and 19 ledger rows. |
| Real PostgreSQL, Docker runtime, Browser→Next→Nest→PostgreSQL | Full unchanged validation lanes; new runtime appended after Slice 6 in docker-runtime. Existing real browser regression includes availability/booking/opening/documentation. Exact-head CI, not the base run, must establish the final Docker/browser/full regression outcomes. |
| Bounded Journey A I2 portion | New `verify-v3-i2-exit-runtime.mjs`, manifest `eh-v3-i2-slice7-combined-journey-proof-v2`: real anonymous registration→login→public discovery→finite availability→patient booking→patient authorization→clinician acceptance→real-time opening→human documentation→explicit close without release→explicit summary/intent release→explicit follow-up booking/link→withdrawal. No runtime timestamp rewriting or direct assignment helper. |
| CSRF/Origin/Fetch Metadata, malformed JSON/UTF-8, methods/HEAD/no-store/leakage | Retained strict HTTP suites and new composed middleware adversarial checks with no-write/canary assertions. |
| Timing, locks, expiry, timeout/deadlock, audit rollback | Retained independent connection suites observe actual blockers and final expiry/rollback/no-retry; new privacy retry races assert actual serialization and durable counts. No application-memory-only or sleep-only race claim. |

Full Golden Journey A is still incomplete pending separately authorized I3. No prescriptions, medication catalog, lab/results, pharmacy, EACCE, notifications, AI diagnosis or unrelated frontend work is included. Synthetic data only; no real-patient or production-readiness claim.


## Final gate and limits

[Validation record](V3_I2_SLICE7_VALIDATION.md) separates focused/local evidence, historical attempts and final exact-head CI. Final PR evidence supplies actual head, merge parents, run/jobs, counts and verdict after inspection. Independent final-head review remains required; DO NOT MERGE. Expiry is check-time protection, not recall of authorized responses. No frontend implementation, I3, EACCE, prescription/catalog/lab/pharmacy/notifications/AI or deployment work.
