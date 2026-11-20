# EH-008 implementation validation evidence

> Post-merge status annotation: M1 is COMPLETE at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [final evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). Pending statements below record the historical pre-merge gate, not current status. Historical test results are not represented as newly executed.


Approved baseline: `a36c53940c7d26a706fa89ff12e757646d781b7e`.
Final approval: Issue #14 comment 6153695039.
Branch: feature/EH-008-m1-demo-seed. M1 remains pending merge and recorded final exit gate.

## Local validation

Used Node 24.21.0 / pnpm 10.34.6 / PostgreSQL 18.6 / Prisma 7.10.0.

- Frozen install, Prisma generate/validate, full build/typecheck and ESLint: PASS.
- Unit tests: 14/14, including three EH-008 configuration/manifest/sanitization tests.
- Integration tests: 59/59. EH-008 contributes 28 seed/verifier groups; all existing
  31 EH-005/EH-006/EH-007/health/worker groups remain green.
- Stronger unrelated ENDED-history preservation case also rerun independently
  within local validation: PASS; all unrelated identity/profile/assignment/session/
  audit rows preserved.
- Fresh deploy/status twice and isolated EH-005 upgrade preserving existing data:
  PASS using the existing migration verifier on an explicitly empty disposable DB.
- Current-baseline deploy/status twice with seeded rows and migration ledger
  unchanged: PASS. Exactly the two existing historical migrations; none added/edited.
- Production and development-inclusive high-severity dependency audits: both report
  no known vulnerabilities.
- Host/container existing authentication measurement regressions: completed without
  crashes, OOM, derivation failures or timeouts. No timing equality/production SLA claim.
- Diff whitespace/scope checks: PASS. No schema, historical migration, dependency,
  lockfile, toolchain pin, Dockerfile, OpenAPI, auth/session or authorization edits.

A repeated tooling check encountered workspace ENOSPC after repeated container
builds. Unused build cache/dangling images were removed without touching volumes or
repository work. Prisma generation/typecheck/validation and unit tests then passed.
This was environment recovery, not a project change or waived gate.

## Seed/verifier test coverage

First/repeat/concurrent seed, compatible partial users/profiles, missing relationship,
matching row/hash/timestamp preservation, missing profile recovery, role/status/
password/unsupported-hash/profile/optional-field conflicts, ENDED-only conflict,
ACTIVE plus history preservation, unexpected ACTIVE graph including external peers,
late insertion/candidate conflict rollback, unrelated history/audit/session preservation,
independent random salts and EH-006 policy verification all passed.

Migration tests reject missing/bad-checksum/incomplete/rolled-back records and accept
an additional completed future migration. Fixture tests use isolated databases with
the actual unchanged migration SQL; the separate migration regression uses Prisma
migrate deploy/status. No shared demo reset/delete helper is introduced.

Verifier tests exercise actual Nest HTTP with real database-backed sessions for all
five login/me identities, own/cross-patient isolation, assigned/unassigned clinician,
ADMIN denial, exact minimal projections/no-store, all-session logout and invalidation,
repeat validation, generic failures, secret-output rejection and fatal cleanup failure.
Missing/wrong initial state fails before HTTP/reseed. Post-HTTP missing-profile drift
also fails without repair; repeat-only seed checks complete state under table locks.

## Docker/runtime evidence

Compose config/build/startup PASS; postgres/API/web/worker healthy. Web and API HTTP
health PASS. Container unit tests: 10/10 (auth, authorization and demo configuration).
Existing running API auth/CSRF/logout and authorization ownership/assignment/admin/
HEAD/ENDED probes PASS.

Running-container scripts/verify-m1-runtime.mjs PASS against the migrated disposable
validation database: one private ephemeral credential, seed/verify/seed/verify using
the actual running API; all five identities login, ownership/relationship/admin
matrix, logout invalidation and zero-insert stable repeat state verified. No secrets
were printed or added to Compose/image/build args/argv. Child mode/opt-in explicit;
production rejection remains enforced by the commands.

m1:verify is NOT read-only: real login/logout creates retained session/audit history.
Operational history is excluded from logical seed determinism. Seed itself appends
no audit events or sessions. Existing append-only audit protections remain green.

## Independent review and remote gate

Independent second-pass security/persistence review: PASS, no actionable findings.
Reviewer independently passed 28 initial targeted unit/integration tests and all
three added baseline/repeat-only/post-HTTP drift regressions. A separate disposable
blocked-table probe confirmed bounded lock timeout (~10.085 seconds), complete
rollback and subsequent recovery. Reviewed code, credential/output guards, migration
future compatibility, seed locking/conflicts, HTTP cleanup, docs and CI.

Final-head remote CI must be green; its run/link/result are recorded in the PR handoff
when complete. This file records local evidence, not an unexecuted remote PASS.

## Limits / remaining gate

Table-wide seed write locks are intentional for short offline bootstrap and have
bounded waits/transaction duration. Hostname guards prevent accidents, not prove DB
ownership. Shared private credential is for this synthetic dataset only. Ephemeral
orchestration cannot silently replace an existing dataset's different password.
Repeated verification retains real audit/session rows; lost responses may leave
unreachable sessions until EH-006 expiry. No reset/rotation/cleanup redesign exists.

No scope deviation. No clinical/EACCE/FHIR/research model or auth UI. FR-010/FR-011
remain incomplete. M1 is not complete until final validation, green final-head CI,
independent review, approved PR merge and final recorded exit evidence all hold.
