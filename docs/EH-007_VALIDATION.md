# EH-007 implementation validation

Baseline: `96f24a079701567a2a05cacc5e0304d950ec5c00`.
Approval: Issue #12 comment 6150370205. Branch: feature/EH-007-m1-authorization.
Validation used Node24.21.0, pnpm10.34.6, Prisma7.10.0 and PostgreSQL18.6.
Pinned tooling was installed outside the repository; project pins are unchanged.

## Passed local gates

- Frozen dependency install; lockfile unchanged.
- Prisma generate and validate; full workspace build and typecheck; ESLint.
- Unit tests: 11/11 (2 authorization, 9 existing).
- Integration: 31/31 (10 authorization, 12 EH-006, 7 EH-005, 2 health/worker).
- Existing fresh migration deploy/status twice and EH-005 upgrade preservation:
  passed, exactly the two historical migrations, no new migration or schema change.
- Production and development-inclusive high-severity pnpm audits: no known
  vulnerabilities reported by either audit.
- Auth measurement regression completed on pinned runtime, with no crashes,
  OOM, derivation failures or timeouts. These remain demo-scale observations,
  not a timing-equality or production-latency guarantee.
- Docker Compose config and build; all four services healthy; web and API HTTP health.
- Pinned container auth + authorization unit tests: 7/7.
- Existing running-container login/me/CSRF/logout/invalidation probe: passed.
- New running-container patient ownership, clinician assignment, ADMIN, HEAD,
  no-store and committed ENDED denial probe: passed.
- Container authentication measurement regression completed successfully.
- `git diff --check`; prohibited schema/migration/dependency/lockfile/toolchain/
  Dockerfile changes absent.

## IDOR evidence

The ten HTTP integration groups cover self/cross ownership, user-vs-profile ID,
ACTIVE/ENDED/no/wrong clinician, both missing role profiles, ADMIN, nonexistent/
malformed/uppercase/encoded UUIDs, forged query/body/headers, casing/trailing slash/
extra segment/encoded separator variants, HEAD/unsupported methods, ending and
reassignment, audit silence/no renewal, current session invalidation and principal
consistency, sanitized failures and read-snapshot concurrency. All use real Nest
listeners, real EH-006 login cookies and PostgreSQL. Failures expose no projection.

Two test hooks coordinate writes between the actual session guard and actual scoped
read, proving current revocation/disabled-user rejection. Role inconsistency is
injected only as server-side test evidence: EH-005 FK/CHECKs prohibit incompatible
persisted role changes for a bound profile. No production test-only endpoint exists.

The initial integration run found Express malformed percent/UTF-8 targets could
produce a pre-guard400. The fixed boundary routes encoded targets to an invalid
literal so actual Nest authentication and generic404 apply; regression tests cover
valid ASCII encodings, invalid escapes/UTF-8 and authenticated/unauthenticated cases.

## Independent review

Independent second-pass authorization review: PASS after the encoded-target fix
and added logout-to-profile regression. Reviewer independently ran 2/2 authorization
unit tests, 10/10 real-HTTP/database authorization groups, and 42/42 encoded/malformed
path/authentication/casing/trailing-slash probes. No malformed-target DB reads and
no remaining actionable security findings. SQL, package exposure, route policy,
projection, error/leakage and concurrency contracts were reviewed.

## Remote gate and limits

CI executes the full suite and running-container authorization probe. Final head
remote CI status/run link is recorded in the PR handoff after the workflow completes;
green CI remains mandatory. This document records local evidence, not a claim that
an unexecuted remote workflow passed.

READ COMMITTED cannot retract an already authorized in-flight read after concurrent
assignment ending/session revocation. No caching, serializable guarantee or timing
equality is claimed. Future clinical endpoints and mutations need their own scoped
policies/tests/transaction contracts. No FR-010/FR-011/full M1 completion is claimed.
There are no scope/dependency/migration/session/CSRF/CORS/proxy deviations.
