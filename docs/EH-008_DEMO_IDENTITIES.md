# EH-008 deterministic synthetic identity contract

Approved by Issue #14 comment 6153695039 at baseline
`a36c53940c7d26a706fa89ff12e757646d781b7e`. Dataset: `eh-m1-demo-v1`.
This implements seed and executable M1 proof only, not clinical demo data or UI.

| Key | Role | Email | Profile name / manifest label |
|---|---|---|---|
| patient-a | PATIENT | eh-m1-patient-a@example.invalid | Synthetic Demo Patient A |
| patient-b | PATIENT | eh-m1-patient-b@example.invalid | Synthetic Demo Patient B |
| clinician-assigned | CLINICIAN | eh-m1-clinician-assigned@example.invalid | Synthetic Demo Assigned Clinician |
| clinician-unassigned | CLINICIAN | eh-m1-clinician-unassigned@example.invalid | Synthetic Demo Unassigned Clinician |
| admin | ADMIN | eh-m1-admin@example.invalid | Synthetic Demo Admin (label only) |

All users ACTIVE. Two patient profiles and two clinician profiles; optional fields
NULL. ADMIN has no profile. Exactly one ACTIVE assignment: assigned clinician to
Patient A. No other ACTIVE edge may touch a demo profile, including external peers.

## Determinism and conflicts

Keys/email/roles/names and logical relationship graph are stable. PostgreSQL creates
UUID v4 IDs and real timestamps; EH-006 generates independently salted hashes.
Matching repeated runs insert zero rows and preserve IDs, hashes and timestamps.
No UPDATE, delete, reset, startup provisioning or HTTP administration is introduced.

Insert missing compatible users/profiles/assignment only after validating all
existing fixture users, including password verification, ACTIVE status, correct
role/name and NULL optional fields. Missing profile can be recovered for a compatible
user. Matching email alone is insufficient. Unrelated identities/history remain
untouched. Wrong password/unsupported hash/role/status/profile data or unexpected
ACTIVE edge fails closed. ENDED-only intended-pair history is a conflict, not an
instruction to re-grant access. ACTIVE plus ENDED history is retained unchanged.
Any conflict/failure rolls back all invocation writes; no password rotation/rehash.

## Credentials and execution guard

Require EH_DEMO_PASSWORD, with no default: 16–1024 UTF-8 bytes, not whitespace-only;
never trim or transform it. One private password covers the five synthetic fixtures.
Use the existing EH-006 hash/parser/verification module and unchanged Argon2id policy:
version 19/memory65536KiB/passes3/parallelism1/salt16bytes/key32bytes/109-byte envelope.
No Argon2 dependency or duplicate implementation. Each new user has a random salt.
Existing hashes are checked internally, never returned in public data or printed.

Require EH_DEMO_SEED_ENABLED=1 and NODE_ENV=development or test. Production is
rejected. DATABASE_URL is explicit and PostgreSQL, with host localhost/127.0.0.1/
[::1]/postgres and a database path. Query/fragment overrides are rejected. Hostname
checks prevent accidents; they do not prove ownership or that data is synthetic.
Operator must choose an appropriate dedicated local/test database.

Local operators privately inject a password-manager value; CI/container orchestration
generates a random 32-byte base64url credential once in memory and passes it only via
child environment. No plaintext default, committed hash, Compose secret value,
image layer/build argument/command argument or credential output exists. Never print
passwords/hashes/cookies/session/CSRF values, environment dumps or raw driver errors.
Changing the injected password for an existing dataset fails; rotation is out of scope.

## Boundaries and locking

`createDemoPersistence` exposes only seedIdentities, inspectIdentities and close.
The manifest is fixed; no arbitrary fixture targets, client, general user lookup,
queries or reset helpers. The password checker callback reuses the API codec without
a DB-package dependency on the API. Results include safe manifest IDs, never hashes.
Successful password checks are memoized only within one locked seed transaction;
this is not auth/session/authorization caching.

Seed uses one private Prisma transaction, fixed-order SHARE ROW EXCLUSIVE locks on
users/patient_profiles/clinician_profiles/assignments, a 10-second lock timeout,
15-second lock-statement timeout, subsequent 5-second statement timeout and 30-second
transaction bound. It preflights, inserts missing state and asserts final invariants.
Affected writes wait while bootstrap runs; reads remain possible. Concurrent seeds
serialize. Inspection uses a bounded REPEATABLE READ snapshot and writes no rows.

Require the two approved M1 migrations and their committed-SQL SHA256 checksums;
reject missing/bad-checksum/unfinished/rolled-back ledger entries. Additional completed
future migrations are allowed; no exact-two-migrations database assumption.

Seed emits no fake audit events or sessions. Audit append-only protections/history
remain intact. Real verifier login/logout emits genuine EH-006 audit and session rows.

## Commands and M1 evidence

pnpm demo:seed and pnpm m1:verify require built artifacts and already migrated DB.
They never install/build/migrate/start services/reset automatically. Output is fixed
safe JSON summaries/error codes only, with nonzero exit on failure.

m1:verify strictly inspects complete valid seed/migration/password state before HTTP
or any repeat seed. It never repairs missing/conflicting initial state. Actual HTTP
health, all-five login/me, own/cross-patient, assigned/unassigned clinician, ADMIN,
no-store/minimal projections and all-session logout/invalidation must pass. Cookies/
CSRF remain in memory; finally attempts unfinished session logout. Cleanup failure
fails verification. Redirects/remote HTTP targets are rejected; request timeout 10s.
M1_API_BASE_URL is loopback HTTP origin; default uses API_PORT or 3001. Exact existing
AUTH_BROWSER_ORIGIN is supplied; no Origin inference, CORS/proxy or browser changes.

After initial checks/logout pass, reinspection must still match initial state. The
repeat seed requires complete existing state again under table locks, so concurrent
missing-state drift cannot be repaired by verification. Repeat must create 0 users/profiles/assignments
and preserve safe manifest IDs/mappings/graph. Reinspect before declaring PASS.

**m1:verify is not read-only.** Real login/logout creates retained session/audit
history, excluded from seed determinism. Repeated verification grows that history.
A lost HTTP response can leave an unreachable session until expiry; no lifecycle
redesign/cleanup deletion is introduced. Failure never reports PASS.

M1 remains pending until final validation, final-head remote CI, independent review,
PR merge and recorded exit-gate evidence. FR-010/FR-011 and clinical/UI work remain
future. See M1_DEMO_RUNBOOK.md and EH-008_VALIDATION.md.
