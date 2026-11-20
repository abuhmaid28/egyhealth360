# V3-I2 Slice 4 validation

Candidate status: IMPLEMENTED / IN REVIEW, not COMPLETE. Exact authorization [6485213892](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6485213892); starting base `b82553e1eb16aac19f9aab24a0bca011217d6dd4`. No frontend, dependency, historical SQL or frozen normative/product decision changes. See [implementation](V3_I2_SLICE4.md). Exact final head/run/job and latest integrated main belong in PR/Issue handoff after execution; no result is inferred from prior Slice 3 CI.

## Executed focused proof

Fresh independent PostgreSQL databases; actual SQL and transaction commits/rollbacks, observed pg_blocking_pids (no in-memory substitutes). Opening races cover distinct-key/identical-key competing opens and winner rollback, cancel/reschedule/no-show versus open in both legal orderings, assignment end, genuine accepted relationship withdrawal, membership end, clinic suspension, clinician/patient disable, actor session revocation and affiliation withdrawal in both orderings. Revocation-first denies the waiter; opening-first retains truthful opening before later revocation. No regrant.

Expiry is tested both after an advisory wait and after tentative opening/audit, with complete rollback and reusable key. Real lock timeout/external deadlock returns sanitized failure without automatic retry or partial source/history. M1 seed and M2 BP concurrency cover both orderings without changing legacy lock order. Existing availability advisory/isolation and booking GiST/adjacency/direct-SQL proofs remain mandatory and unchanged.

HTTP tests cover exact eight-field result; same-origin/Fetch Metadata/CSRF; current actor/role; own exact booked clinician; no assignment/pending relationship denial; duplicate/unknown fields; canonical IDs; malformed/fatal UTF-8; media/encoding; oversized body; mutation query/Idempotency-Key rejection; method/HEAD/alias/no-store and success/error canaries. Source tests cover immutable provenance/terminal rows, unique booking and encounter, same-patient composite FKs, deferred missing-encounter/sidecar/state rejection, explicit attendance and no duplicate prior ATTENDED, terminal NO_SHOW/correction denial, replay/changed-target/current authority and audit rollback.

## Migration preservation

Seventeen migrations / 39 domain tables and Prisma models; only new table is consultations. All sixteen historical SQL files are byte-hash pinned to starting main. Fresh deploy/status/redeploy through the real migration runner are required. Populated 16→17 upgrade retains all 38 existing domain tables and 74 historical rows, including M2/I1/availability/booking/event/operation/attendance/session/audit history; all old rows/ledger entries/checksums remain unchanged. New consultations empty, existing encounter/assignment/attendance rows unchanged, no backfill. Repeated full snapshot after deploy/status is ZERO_WRITE.

## Runtime and regression gates

`eh-v3-i2-slice4-consultation-opening-proof-v1` uses real HTTP and isolated PostgreSQL. Its opening waits for actual database time; no timestamp mutation or mocked runtime clock. Tests alone use the explicit schema-owner synthetic past-booking fixture already accepted by Slice 3. Relationship authorization/acceptance setup executes the real independent existing I1 service, separate from opening. Opening never calls an assignment/acceptance helper.

The dedicated proof is appended after the existing booking runtime in Bootstrap; every preceding gate stays in order. Full install/generate/lint/Prisma/build/typecheck/unit, fresh migrations, all integration tests, Arabic/RTL browser and live availability/booking UI proof, auth measurements, production/full HIGH audits, Docker config/build/start, container auth tests, all accepted runtimes, smoke and cleanup are required. Results and exact counts are recorded after execution below and in the exact-head PR handoff.

EH-012 regression keeps HTN create/list/count/exact BP association scope unchanged, general encounters absent from normalized HTN evidence; no general encounter BP adapter. Existing FollowUpAppointment, BP correction/privacy/normalized candidate and M0–M2/I1/Slice 2–3 tests are not weakened. Prior OpenAPI bytes remain hash-pinned after removing exactly Slice 4 additions and its explicit booking state/event enum extensions.

Known limits: opening only; no consultation read/close/documents/release/follow-up/clinical completion/I3/EACCE/frontend. Structural SQL guards do not authenticate sessions or resist database owner/superuser changes. Final expiry check protects check-time authority. Existing unsuppressed low/moderate dependency findings and pg concurrent-query deprecation warnings are retained; no HIGH/CRITICAL audit findings accepted. Independent exact-head review is still required. DO NOT MERGE.

## Local results before PR creation

Frozen install, generate, lint, Prisma validation, build and typecheck PASS. Unit 150/150; focused Slice 4 integration 50/50 (no failure, skip or cancellation). Real HTTP/database-clock opening runtime 19/19 PASS. Both HIGH audit gates PASS: 0 HIGH / 0 CRITICAL, retained 2 LOW / 3 MODERATE. Fresh/status/redeploy and populated 16→17 preservation PASS. Full legacy integration/browser/container/runtime gates continue in Bootstrap; exact final results belong in the PR/Issue handoff after completion, not inferred here.
