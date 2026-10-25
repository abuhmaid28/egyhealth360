# V3-I1 Slice 5 — Validation and Review Evidence

Implementation is **IN REVIEW**, not accepted main completion. Issue #39 OPEN; V3-I1 INCOMPLETE; Slice 6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN. [Contract, authority and compatibility inventory](V3_I1_SLICE5.md).

## Verified starting gate and authorization

Starting main `e75671ec0adfdf0f0d71485eebb104728b619e91`, PR #44 MERGED, exact-main push/main [Bootstrap 40195060034](https://github.com/abuhmaid28/egyhealth360/actions/runs/40195060034) COMPLETED/SUCCESS. Actual 35 job steps/logs inspected: 93 unit, 510 integration, seven container tests; all prior migration/runtime/smoke/audit gates passed. These are historical baseline observations, not new test counts.

[Authorization 6401378826](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6401378826) records the corrected baseline and Slice 5 only. Historical `091c612aca77ae41941fd1183f2de1cc380b1b30` is not a Slice 5 implementation gate. Prior aborted stale-baseline work made no repository edits/branch/commit/PR. No code/history was reverted.

## Local execution

Pinned Node 24.21.0 / pnpm 10.34.6. PostgreSQL 18.6. Validation runs use disposable local PostgreSQL databases; production secrets/data are absent. This is the local evidence snapshot before publication. Subsequent exact-head reruns, final counts and remote CI are recorded on the PR and in the handoff; no running gate is represented as PASS.

| Gate | Executed result |
|---|---|
| Frozen install, generate, lint, Prisma validate, build, typecheck | PASS |
| Unit | 98 PASS, zero fail/skip (93 historical plus five Slice 5 contract tests) |
| Focused real-PostgreSQL Slice 5 integration | Initial 46 PASS; final lifecycle HTTP file 14 PASS including one additional pending-legacy regression, zero fail/skip |
| Full integration | 556 PASS, zero fail/skip; additional final legacy regression passed in the 14-test lifecycle file. Complete current population is 557; independent final reruns are recorded on the PR |
| Migration verifier | PASS, including final nullable legacy-target draft against a fresh disposable database and all historical upgrade/redeploy gates |
| Auth host measurement | PASS; Argon2 hash median 151.78ms, verify 143.01ms; four HTTP logins 497.12ms; health responsive; no material regression |
| Production HIGH audit | PASS; zero HIGH/CRITICAL, two LOW/two MODERATE |
| Full HIGH audit | PASS; zero HIGH/CRITICAL, two LOW/two MODERATE |
| Docker config/build/startup | PASS final image; fresh isolated PostgreSQL, all 14 migrations and all service health checks |
| Container auth/authorization | Seven PASS, zero fail/skip, final image |
| Runtime auth/authorization/M1/clinical/CareAction/organization/patient-entry/directory | PASS final image; preserved CareAction four / organization four / patient-entry eight / directory twelve cases |
| Slice 5 runtime | Final host and container 15 cases PASS, `eh-v3-i1-slice5-bilateral-proof-v1` |
| Web/API smoke | PASS final image; web HTTP 200, API health `{data:{status:"ok"}}` |
| Runtime cleanup | PASS: Compose down --volumes, runtime services/network/volume removed |

Container auth measurement: PASS, hash median 161.73ms, verify 150.52ms, four-login batch 727.05ms while sharing the two-CPU environment with full integration; health remained responsive. Timing is observational, not an identical-timing promise. Local Docker builds used an ephemeral out-of-repository proxy/CA overlay with TLS verification intact; no Dockerfile/dependency change. Unused build cache was reclaimed to keep the VFS workspace within disk capacity.

## Exact compatibility and migration evidence

New `20261025190000_v3_i1_relationships`: two tables, one new four-value enum, three composite reference indexes on existing tables, request uniqueness/history indexes, ten RESTRICT foreign keys, four lifecycle/timestamp CHECKs, three SECURITY INVOKER functions and five triggers. Thirteen historical migration SQL hashes are pinned unchanged. No old source or fixture fields are rewritten; Assignment receives no new scalar columns.

`relationship-compatibility.test.mjs` executes the real migration runner against exactly 13 historical migrations, populates genuine M1/M2 action/source rows and Slice 2/4 active/ended organization/member/publication history, then deploys migration 14. All 29 old data tables are compared in full; prior ledger rows/checksums retained; existing ACTIVE/ENDED/M1 assignments and CareAction assignment references unchanged. New request/end-provenance tables have **zero rows**; no consent, acceptance or end-actor backfill. Real repeat deploy/status leaves the final 14-entry ledger unchanged. Historical Slice 2/Slice 4 runner tests stay pinned to their original 12/13 migrations.

## Real PostgreSQL concurrency and rollback evidence

Every race uses independent service/PG connections, live pg_blocking_pids observation and bounded coordination. The transport observer pauses a real operation **after** its actual SQL statement, retaining its real PostgreSQL locks; it is not an authorization mock or sleep-only race. Logs emit `I1S5_POSTGRES_RACE` / `I1S5_COMPATIBILITY_OVERLAP` with blocker PID, waiter PID, lock/action, commit/rollback and outcomes. Counts/actor/history assertions inspect committed database rows and minimized audit.

| Case | Required observed outcome |
|---|---|
| Same operation duplicate request, winner commit / rollback | One request, one authorization audit; committed replay same ID/changed=false; rolled-back winner leaves no rows/audit and waiter creates once |
| Different operation keys, unresolved pair, commit / rollback | At most one PENDING; committed winner causes sanitized conflict; rolled-back winner permits exactly one new request/audit |
| Concurrent accept, commit / rollback | One ACTIVE assignment and one accepted binding; original authorization + one establishment + one acceptance audit; rollback leaves no partial grant/audit |
| Accept vs withdraw both orders | Withdraw first: WITHDRAWN/no assignment. Accept first: retained ACCEPTED and separate withdrawal, exact bound assignment ENDED and participant end fact, truthful five total lifecycle audits |
| Accept vs decline both orders | First disposition wins; losing contradictory command conflicts without audit/grant duplication |
| Patient / clinician disable, both orders | Committed disable first denies pending acceptance; correctly serialized acceptance may commit before later disable |
| Revoked / expired session while waiting | Current check after actual lock wait denies; request/grant/audit unchanged |
| Accept first vs session revocation | Acceptance commits truthfully; subsequent replay is unauthenticated, never cached authority |
| Final expiry after tentative writes | Assignment, request disposition and audit roll back |
| Old exact end A vs fresh acceptance B, both orders | A remains ENDED, B ACTIVE; old end changed=false/no new audit/no operation retarget |
| First old authorization withdrawal after A ended and B exists | Only old request withdrawal fact added; A end provenance preserved, B untouched |
| Exact end vs accepted withdrawal both orders | One genuine end fact/actor, ACCEPTED retained, withdrawal recorded; no duplicate ending audit |
| Pair lock with zero rows | Real advisory-lock waiter observed before any request exists; five-second lock timeout sanitized, no rows/audit, no retry |
| Actual two-connection deadlock | Service victim sanitized/rolled back; external transaction rolled back, no stale retry; fresh explicit operation can succeed |
| M2 INITIAL generation vs exact end, both orders | End first causes CARE_ACTION_NOT_FOUND with no action; generation first preserves action/decision/audits then relationship ends |
| Genuine M1 seed vs legacy confirmation, both orders | Real seed table lock and enrollment wait observed; seed creates zero users/profiles/assignments, accepted request binds original unchanged M1 assignment |
| Create / accept / accepted-withdraw audit fault | Entire relevant request/grant/end-provenance/audit transaction rolls back |

## Privacy, input, API and regression review

Actual HTTP tests cover no grant from PENDING/directory/membership; designated acceptance; patient/clinician exact ownership and cross-patient/cross-clinician IDOR; ADMIN/LAB_STAFF/PHARMACY_STAFF denial; injected actor/role/unknown keys; malformed/escaped duplicate JSON; origin/CSRF; strict locators/query/pagination; HEAD/no-store; body bounds; database-failure sanitization and empty HEAD failure. Canary malformed request content never appears in errors. Application logger remains disabled as in accepted bootstrap; no new logging/secret/audit-body path is introduced.

Legacy confirmation works through the patient's own exact ACTIVE assignment even when provider unpublished; no automatic publication or consent history. Later acceptance/end do not depend on membership/publication (those are not clinical authority). Ended clinician relationship projection masks patientId; request JSON allowlist excludes internal user/clinician IDs, email, professional identifier, operation key and clinical/audit payload. Historical end actor is null, never inferred.

OpenAPI appends exactly eight participant-only resources and five schemas (25 paths / 22 schemas total). GET/HEAD on four resources, POST authorization, PUT four exact commands; all authenticated. Historical 17-path API bytes retain SHA256 `cd005b69cc22f783ced7458545360adf839b7f6861d4316943dcf64a8384f371`, including previous numeric-response key/escape formatting; independent tests pin the complete current hash, exact inventory and public allowlists. Historical exact inventories are extended deliberately, never weakened into subsets.

Current D01–D36 decision register and cross-provider interpretation bytes retain SHA256 `f79fc639968c21b2351e90e369c9e97b654310f28076b667df8e41d6f2e1ea53`; only surrounding delivery-status metadata is reconciled. Relative Markdown verification at publication checked 264 links across 19 changed Markdown files, zero failures. Protected-file inventory and git diff --check passed.

No change to existing clinical authorizer, auth/session/password implementation, registration/profile rules, M1 fixture, M0–M2 clinical source, prior migrations, package manifests/lockfile or dependencies. CI adds exactly one runtime-proof step; all old gates/severity thresholds retained. No Slice 6/I2+ schema/routes, EACCE/research or frontend/design work.

## Remaining gate

Final remote exact-head Bootstrap evidence and subsequent local full rerun are linked on the PR after completion. Local evidence alone is not remote CI. Known non-blocking observations: pg adapter concurrent-query deprecation warning (no skipped tests/failure), accepted historical CareAction runtime `M2_IN_PROGRESS` label, and Prisma/OpenSSL informational container notices. These were not changed as unrelated cleanup. Remaining fast-uri advisories are two LOW/two MODERATE, unsuppressed; both HIGH gates exit zero.

The branch must remain unmerged for independent review and separate Product Owner merge approval. Even successful PR CI does not establish main completion or authorize Slice 6.
