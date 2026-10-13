# EH-005 persistence contract

Approved in Issue #8 comment 6129057503; see ADR-019. This slice prepares
FR-001..003, FR-010..013, FR-050, FR-060/061 and BR-001/002/020 without
claiming authentication, authorization, or event-producing product features.

## Package boundary

The existing `createDatabase` health/close API is unchanged. `createPersistence`
provides only `createUser`, `assignPatient`, `endAssignment`, `appendAudit`, and
`close`. It does not expose a Prisma client, delete, or role-transition operation.
User/profile provisioning is transactional and returns no password hash.
Email is canonicalized before writes. Prisma owns mutable-model updatedAt writes.

Audit input requires an explicit nullable actor, action, and polymorphic entity
reference. No generic target-existence validator or entity-type allowlist exists.
The initial typed append operation accepts only empty metadata; event-specific
safe fields require their owning task. Object-only JSONB does not itself detect
secrets. No passwords, hashes, tokens, secrets, or arbitrary payloads are allowed.

## Migration objects

Migration: `20261012200810_eh005_identity_core_foundation` (transactional SQL).
Five tables, three enums, database-generated UUIDs, ordinary indexes/uniques and
five explicit RESTRICT FKs are generated from Prisma. Redundant profile composite
uniques satisfy Prisma's one-to-one relation-key validation; user_id is still unique.

Custom CHECKs:
- `users_email_canonical_check`: lowercase printable nonwhitespace ASCII.
- `users_email_shape_check`: one @ with nonempty portions; not full RFC validation.
- `users_password_hash_nonblank_check`: nonblank storage, no hashing implementation.
- `patient_profiles_role_check` / `clinician_profiles_role_check`: fixed discriminator.
- `assignments_lifecycle_check`: ACTIVE/null end or ENDED/end not before start.
- `audit_logs_action_type_nonblank_check` / `audit_logs_entity_type_nonblank_check`.
- `audit_logs_metadata_object_check`: JSONB object only.

Partial unique index: `clinician_patient_assignments_active_pair_key` on the
clinician/patient pair WHERE status = ACTIVE. Multiple ended rows remain allowed.

Functions: `guard_assignment_history()` and `reject_audit_mutation()`.
Triggers: `assignments_history_guard` (row UPDATE/DELETE),
`assignments_truncate_guard` (statement TRUNCATE), and
`audit_logs_append_only_guard` (statement UPDATE/DELETE/TRUNCATE).
They run with invoker privileges. No timestamp/user/profile guard triggers exist.

The history guard freezes assignment ID/endpoints/start time and ended rows;
ACTIVE→ENDED is terminal and later reassignment creates a new row. Identical
no-op updates do not rewrite history. Audit statement guards reject even bulk or
zero-row mutation attempts. Owners/superusers can bypass schema protections;
this is not tamper-proof storage or a production least-privilege claim.

## Verification and local workflow

Use Node 24.21.0, pnpm 10.34.6 and PostgreSQL 18.6. After a frozen install:

```sh
pnpm --filter @egyhealth/db generate
pnpm --filter @egyhealth/db validate
pnpm --filter @egyhealth/db exec prisma migrate deploy
pnpm --filter @egyhealth/db exec prisma migrate status
pnpm build
pnpm test
pnpm test:integration
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
```

Only against an empty disposable database, use `pnpm test:migrations`: it asserts
emptiness before first deploy, runs deploy/status twice, compares complete applied
migration records, and verifies a sentinel within a rolled-back transaction.
CI then verifies catalog/invariants and runs the existing Docker regression on the
same migrated volume. Do not use db push or reset retained data implicitly.
Future migrations must deliberately preserve these custom objects.

`tests/integration/catalog.test.mjs` checks tables/enums, all named CHECKs,
composite RESTRICT FKs, partial-index keys/predicate, function privileges and exact
trigger events/enabled state. It exercises Prisma audit bypass attempts and updatedAt.
`identity.test.mjs` checks named SQLSTATE/constraint failures, canonical identity,
profile cardinality/role/FKs, concurrent ACTIVE uniqueness, terminal history and
reassignment, audit append-only behavior, and package provisioning rollback.
Existing API health and worker polling/shutdown tests remain mandatory.

## Limits

No mandatory-profile SQL constraint, global role-immutability trigger, broad
user/profile deletion trigger, normal delete API, or profileless-role policy.
RESTRICT preserves referenced identities/profiles but does not ban all privileged
maintenance. Patient sex remains nullable opaque text; demographic/professional
fields are not inferred. Audit target existence and event-specific safe metadata,
production migration orchestration, retention/reset and least-privilege credentials
remain for later tasks. There are no new dependencies or version-pin changes.
