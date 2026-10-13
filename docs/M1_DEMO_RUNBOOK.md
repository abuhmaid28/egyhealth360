# M1 synthetic demo runbook

Use only a dedicated local/test database. Dataset/guard/conflict contracts are in
EH-008_DEMO_IDENTITIES.md. Commands require built artifacts and the repository's
Node 24.21.0/pnpm 10.34.6 pins. No auth UI or clinical scenarios are provided.

Configure DATABASE_URL, PostgreSQL Compose variables, NODE_ENV=development,
AUTH_BROWSER_ORIGIN=http://localhost:3000 and EH_DEMO_SEED_ENABLED=1. Privately inject
EH_DEMO_PASSWORD using a password manager or hidden terminal prompt; do not put its
value in command arguments, shared files, logs, screenshots or tracked documents.
Keep the same private value for repeated seed/verification on that database.

After the normal frozen install/build and image build, from an empty database:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --wait postgres
pnpm --filter @egyhealth/db exec prisma migrate deploy
pnpm --filter @egyhealth/db exec prisma migrate status
pnpm demo:seed
docker compose up -d --wait --wait-timeout 120
pnpm m1:verify
pnpm demo:seed
pnpm m1:verify
pnpm --filter @egyhealth/db exec prisma migrate deploy
pnpm --filter @egyhealth/db exec prisma migrate status
```

Do not run test:migrations against populated demo data: it intentionally refuses a
nonempty database. That regression command needs its own empty disposable database.
No unsafe reset command is provided. Existing retained data must not be discarded.

Seed emits created counts; repeat must report all zeros. Verification prints PASS
only after valid initial state, actual API proof, session cleanup and zero-insert
repeat proof. m1:verify is NOT read-only: it appends real login/logout session/audit
history. Operational history does not change deterministic logical fixtures.

The API must use the same database and configured browser Origin. Optional
M1_API_BASE_URL selects a loopback HTTP origin; default is port API_PORT or 3001.
The CLI sends the existing EH-006 Origin/header/CSRF controls. It does not enable
split-port browser authentication or change CORS/proxy behavior.

## CI/container proof

On an already running API whose migrated database has no conflicting demo fixtures:

```sh
docker compose exec -T api node scripts/verify-m1-runtime.mjs
```

The orchestrator privately generates one ephemeral password, explicitly sets child
NODE_ENV=test/EH_DEMO_SEED_ENABLED=1, and runs seed/verify/seed/verify using that same
value. It forwards no child response/secret output. Production rejection in seed
is unchanged. No password enters Compose, build args, image layers or argv.

This ephemeral workflow is for disposable CI databases. A fresh orchestrator run
against its retained prior dataset uses a different password and safely conflicts.
For retained local demo state, use the original private injected credential with
individual commands. Never resolve conflicts by silently resetting credentials.

## Failure handling

DEMO_CONFIG_INVALID: check opt-in, mode, password length, explicit local database and
loopback API configuration without printing their secret values.
DEMO_MIGRATIONS_INVALID: inspect required migration application/checksums and failed
ledger state. Do not alter historical migrations to silence the check.
DEMO_STATE_CONFLICT: review the fixed fixture key/state; wrong role/status/password/
profile or ended/conflicting assignment is preserved, not overwritten.
M1_HTTP_FAILED: confirm running API/database/Origin; no partial PASS is valid.
M1_CLEANUP_FAILED: logout cleanup failed; investigate API availability. Retained
sessions expire under EH-006; no direct session deletion/reset is added.

A hostname check is accident prevention, not proof of database ownership. Do not
mark M1 complete from the existence of these commands: final validation/CI/review,
merge and recorded exit evidence are required.
