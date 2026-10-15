# EH-010 implementation validation evidence

Issue #18, final approval [6179110871](https://github.com/abuhmaid28/egyhealth360/issues/18#issuecomment-6179110871).
Branch `feature/EH-010-m2-care-plan-actions`, approved baseline
`ccc967b4d1125c69b2db8725351dca0f50783acf`.

## Scope and contract

Implements only the nine-field, exact-version-pinned CarePlan model and
DRAFT/ACTIVE/CANCELLED lifecycle, current-session clinician authorization, atomic
lifecycle audit, and deterministic read-only deferred action specification.
See EH-010_CARE_PLAN_CONTRACT.md and ADR-024. No product HTTP route, CareAction
persistence/generation, occurrence encoder, BP/evidence/appointment/encounter/
coverage model, calendar arithmetic, closure classifications or EACCE.
Activation is not clinical trigger evidence. FR-020 is persistence/service foundation
only; FR-021 remains incomplete; M1 remains COMPLETE, EH-009 complete, M2 IN PROGRESS.

## Fresh resumed validation (2026-10-15)

The existing uncommitted implementation was preserved on its feature branch. Earlier
runs interrupted by a local Compose configuration mismatch/PostgreSQL restart are
not counted as passing evidence. Resumed validation used a new disposable Compose
project/database, one consistent configuration, separate loopback ports, and all
four services healthy before database test execution. No retained project volume
or repository work was reset. Session-specific proxy CA was supplied as a BuildKit
secret; no environment secret or local orchestration override was committed.

Pinned Node 24.21.0 and pnpm 10.34.6:

- `pnpm install --frozen-lockfile`: PASS; lockfile unchanged, no new dependency.
- `pnpm generate`, DB `prisma validate`: PASS.
- `pnpm lint`, `pnpm build`, `pnpm typecheck`: PASS.
- `node --test tests/*.test.mjs`: **19/19 PASS**.
- `pnpm test:integration`: **130/130 PASS**, no skipped/cancelled tests.
- Focused EH-010 coverage within those totals: **2 unit + 33 integration = 35 PASS**.
- Production and full `pnpm audit --audit-level high`: PASS, no known vulnerabilities.
- `git diff --check`: PASS. Historical migrations and external dependency pins unchanged.

EH-010 tests prove the exact approved pins and deferred object (all keys, symbolic
+3/+6 declarations and unmet gates), zero-write repeated specification/read/no-op,
DRAFT/ACTIVE/CANCELLED inspection, retirement history, creator attribution, lifecycle
and timestamp immutability, one-ACTIVE uniqueness, concurrent activation and
activate/cancel, three audit failure rollbacks, and SQL DELETE/empty DELETE/TRUNCATE
and TEMP-shadow guards. Actor denial covers Patient, Admin, unassigned/wrong-patient
clinician, missing clinician profile, expired/revoked session, disabled user and
principal role mismatch, including draft creation. Controlled two-connection races
prove both orders: revocation/disabling/assignment-end/retirement wins and denies
activation, or activation holds the protected locks through audit/commit and the
concurrent mutation waits. PostgreSQL blocking observations establish actual overlap.
Exact SQL columns, composite FK, partial unique predicate and trusted invoker
functions are checked. No completion operation/state or unsupported clinical model.

The existing EH-009 suite continues to prove exact catalog fidelity, first/repeat/
conflict bootstrap, direct SQL/Prisma publication restrictions, immutable source/
aggregate, retirement, concurrency, audit rollback and TEMP-shadow regressions.
Existing authentication, authorization/IDOR, identity/demo, health and worker
shutdown tests remain included in the full totals.

## Migration and retained state

`pnpm test:migrations`: PASS on the fresh disposable target. All four migrations
applied; second deploy/status unchanged. Preserves the EH-005 -> EH-006 and seeded
M1 -> EH-009 proofs, then upgrades EH-009 -> EH-010 after real M1 HTTP login/logout
history and approved clinical bootstrap. All nine existing M1/catalog tables and
prior ledger entries remain byte-for-byte equal across the EH-010 upgrade and
repeat deploy/status. Actual M1 HTTP verification and zero-insert repeat seed pass.
The migration adds no reference or patient rows.

SHA-256 values:

| Migration | SHA-256 |
|---|---|
| EH-005 (unchanged) | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| EH-006 (unchanged) | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| EH-009 (unchanged) | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| `20261016000000_eh010_care_plan_lifecycle/migration.sql` | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |

## Literal commands and runtime

On a separate fresh disposable database, literal `pnpm demo:seed` creates five
users/four profiles/one assignment; actual HTTP `pnpm m1:verify` passes all roles,
object isolation and logout; literal repeat seed inserts zero rows.
Literal `pnpm clinical:bootstrap` first/repeat passes (1/1/1 + publication, then
0/0/0 + no publication). After genuine explicit catalog retirement, literal
bootstrap exits nonzero with CLINICAL_CATALOG_RETIRED and inspection remains exactly
unchanged. This expected rejection is a passing conflict assertion, not a repaired
or resurrected definition.

Docker Compose config/build/startup: PASS, PostgreSQL/API/web/worker healthy.
Container auth/authorization unit tests: **7/7 PASS**. Host and container Argon2/
concurrent-auth measurement workflows pass. Running API auth and authorization
probes pass. Running-container M1 seed/HTTP/repeat proof and clinical bootstrap/
inspect/repeat probe pass. `verify-m1-runtime.mjs` additionally invokes the EH-010
service probe with its private ephemeral fixture credential. The probe logs in
through actual HTTP, resolves the EH-006 principal, creates/activates/cancels a
synthetic Patient A plan, checks no-op retries and deferred specification, and
logs out. It reports service proof only; no plan endpoint or clinical trigger is
fabricated. The same EH-010 probe passed in the separate literal-command workflow.
Host web and API health probes pass; all services remain healthy after validation.

## Final review and delivery gates

A fresh final independent second-pass review is required after the final source,
tests and documentation. Its findings, any fixes and the final result are recorded
in the PR handoff, together with the final-head remote CI run and commit identity.
No earlier interrupted review/test run substitutes for that gate. The PR must remain
unmerged pending final approval.

## Limits

No CareAction exists. Persisted qualifying evidence, approved calendar arithmetic
and occurrence/retrigger policy remain explicit future gates. Plan completion,
action idempotency, action lifecycle and HTTP clinician workflow remain absent.
The row-lock contract serializes overlapping ordinary mutations; session expiry is
checked again immediately before transaction completion, without claiming time
cannot advance between that check and commit. No automatic stale-authorization
retry. Ordinary database guards do not protect against schema owners/superusers.
Synthetic service evidence is not clinical validation or new HTTP authorization
coverage. No unapproved implementation scope deviation is claimed.
