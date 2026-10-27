# V3-I2 Slice 2 — validation record

Status: **IMPLEMENTED / IN REVIEW**, not COMPLETE. [Authorization, baseline and implementation](V3_I2_SLICE2.md). This record reports executed commands, not future-slice capabilities. PR stays OPEN; no merge authorization.

## Executed focused evidence

Pinned Node 24.21.0 / pnpm 10.34.6. Frozen installation PASS, no dependency or lockfile change. Build/generation PASS. Initial focused run: 4 unit and 12 functional tests PASS; subsequent coverage adds the exact additive inventory and two HTTP/regrant tests. Final aggregate counts are recorded below and in exact-head CI handoff.

Real PostgreSQL initial concurrency suite: 31 PASS, zero failures/skips/cancellations. Exact `pg_blocking_pids` relationships and distinct transport PIDs are asserted and emitted as I2S2_POSTGRES_RACE, I2S2_POSTGRES_EXCLUSION, I2S2_POSTGRES_TIMEOUT and I2S2_POSTGRES_DEADLOCK. Later additive cases cover the preserved M1 seed and M2 clinical prefix in both orderings and ADMIN final expiry.

| Race | Observed outcome |
|---|---|
| Same-clinician overlap, same/cross clinic | One valid winner, safe loser conflict; one slot/operation/audit |
| Winner rollback, same/cross clinic | Tentative slot/op/audit rolled back; contender succeeds |
| Adjacent half-open publications | Both commit |
| Same operation, same/changed payload | One result/audit; exact result replay or safe conflict |
| Config first / publication first | Slot captures new / old serialized version and duration/lead |
| Config winner rollback | Waiting publication uses original committed configuration |
| Membership, org, user, session, provider, clinic, affiliation, specialty vs publication | Both orderings; revocation-first denies; publication-first commits before later revocation; public eligibility follows current state (actor session revocation alone does not unpublish professional availability) |
| Final clinician expiry | Slot/op/audit rollback; same operation key reusable |
| Audit failure | Configuration/publication/withdrawal all roll back; keys reusable |
| Bounded real timeout/deadlock | Sanitized unavailable, no retries, no partial operation state |
| Direct independent SQL exclusion | Database rejects overlap with 23P01; rollback permits waiter, independent of application prefix |

Illustrative actual initial-run pairs: cross-clinic overlap 345→346 (commit/conflict), rollback 368→369 (rollback/commit), config-first 400→401, publication-first 417→418, config rollback 425→426, timeout 590→595 and deadlock service 595, direct exclusion 606→612 and rollback 616→622. PIDs vary per isolated invocation; final logs contain the actual final run.

Real runner populated main upgrade PASS: 14→15 migrations, 31 old domain tables→34 total domain tables, 61 retained historical rows in the isolated populated fixture, all old rows/ledger/checksums unchanged, including M1/M2 INITIAL, sessions/audit, genuine bilateral acceptance/withdrawal, directory and ACTIVE/ENDED membership history. Zero fabricated settings/slots/operations. Repeat deploy/status exact complete snapshot **ZERO_WRITE**. Fresh deploy/status/redeploy is also part of the full migration gate.

Real HTTP isolated runtime PASS: manifest `eh-v3-i2-slice2-availability-proof-v1`, **22 cases**, no real patient data. Configuration, clinician publication, public allowlist/all-role equality, unrelated clinician denial, own history, overlap/adjacency, snapshots/new version, revocation/history preservation, withdrawal/replay/conflict and ADMIN clinical denial/no assignments verified. CI adds the proof after the existing accepted runtimes.

## Final validation and remote handoff

Final full local and exact-head Bootstrap results are appended when observed. Prior results apply only to their recorded run and do not substitute for the latest exact head. No independent approval, merge or Slice 2 completion is claimed here.

Known inherited notices: pg concurrent-query deprecation in old Prisma fixture paths; existing audit advisories remain unsuppressed. Actual final severity totals are recorded with final checks. No continue-on-error, skipped security gate or dependency suppression is introduced.

## Final local checks before PR submission

PASS: frozen installation; generation and full workspace build; full workspace typecheck; Prisma validate; lint; **103 unit tests**, zero failures/skips/cancellations. Focused availability final command: **57/57** (5 unit + 52 PostgreSQL integration), followed by **1/1** additional ordinary-SQL integrity test; zero failures/skips/cancellations. These overlap the aggregate suite and must not be added to it as distinct tests.

Fresh **15-migration** deploy/status/redeploy PASS on a newly created disposable database using the final migration bytes. Populated 14→15 proof and all historical upgrade gates PASS. The final schema has **34 domain tables**, plus the migration ledger. All fourteen historical SQL files/checksums and historical I1 execution/validation files are unchanged. Frozen I2 normative sections 2–20 and the exit paragraph, and the D01–D36 policy register are byte-identical. Relative Markdown file-target check: 284 checked, zero broken at that check; diff whitespace PASS.

Production and full audits both PASS the unchanged HIGH gate: each reports **0 HIGH / 0 CRITICAL**, **2 LOW / 3 MODERATE**, unsuppressed. No dependency change. Host and container auth measurements PASS. Docker config/build/startup/health and web/API smoke PASS. Container auth/authorization tests **7/7 PASS**, and the new container availability runtime **22/22 PASS**. Existing accepted container runtimes and the full legacy integration command are also executed; final aggregate/remote outcomes are recorded in the PR handoff, rather than claiming an unfinished run passed.

During development, the first full regression invocation found two new M1-seed fixture failures: those fixtures had applied SQL but lacked the genuine Prisma ledger required by the accepted seed preflight. The new fixtures now use the actual migration runner. Both seed/publication orderings subsequently PASS with observed blockers, without any legacy runtime change. The corrected final focused suite is green. This is a repaired verification defect, not a waived test or relaxed gate.

Remote exact-head run/job/base/head/attempt/event/conclusion and aggregate counts belong in the final PR/Issue #48 handoff after actual logs are inspected. Independent review, explicit merge approval and exact-main post-merge verification remain outstanding. No merge performed.
