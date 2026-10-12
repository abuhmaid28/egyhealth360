# EH-003 validation status

WIP checkpoint on `feature/EH-003-bootstrap-v2`, preserved for continuation in an environment with effective Prisma download access. EH-003 is incomplete; no final PR has been opened.

## Passed locally

- Node 24.21.0 and pnpm 10.34.6 are installed and used for checks.
- `pnpm install --frozen-lockfile`.
- `pnpm lint`.
- `pnpm --filter @egyhealth/web build` and `typecheck`.
- Builds/typechecks for closure-engine, config, clinical-rules, fhir-adapter, and ui.
- `node --test tests/bootstrap.test.mjs`: two passing tests.
- `docker compose config --quiet` with local environment values.
- PostgreSQL 18.6 Compose startup/readiness and `SELECT 1`.
- Database contains zero public application tables.

## Blocked / not yet validated

The managed environment denies `binaries.prisma.sh` with HTTP 403. Both Prisma 7.10.0 generation and validation stop during the native schema-engine checksum download. The `generate --no-engine` option encounters the same bootstrap download. No checksum bypass, network-policy workaround, pin change, dummy table, or domain model has been introduced.

Consequently model-free Prisma generation, DB/API/worker builds, full typecheck/unit/integration checks, and full application Docker build/startup remain unverified. CI has not been run and no PR has been opened. The required next step is to permit this host through the supported environment configuration, then repeat the original commands.

## Dependency review after approved overrides

The only overrides are deepmerge-ts **8.0.0** and mysql2 **3.23.1** in pnpm-workspace.yaml. These remediate the detected transitive advisories; every approved direct dependency pin, including Prisma **7.10.0**, is unchanged.

Verified with `pnpm why -r deepmerge-ts mysql2`:

- deepmerge-ts 8.0.0 ← @prisma/config 7.10.0 ← prisma 7.10.0.
- mysql2 3.23.1 ← prisma 7.10.0.
- Prisma is a DB-package development dependency and is also resolved through @prisma/client's peer relationship.
- mysql2 is not declared in any application/package manifest and has no application imports or usage. PostgreSQL remains the only database.

Following explicit approval, eslint-config-next was removed and the already approved ESLint/TypeScript rules remain active. This eliminates the braces dependency path (GHSA-vfj7-8cjw-p6xm) without selecting another package version. Both production and full development-inclusive audits now report **zero vulnerabilities at all severities**. Frozen installation and lint pass after removal. No audit finding is suppressed. Next-specific lint rules are deferred; the web skeleton remains covered by TypeScript and generic lint rules.

After the overrides, frozen installation, web build/typecheck, five non-DB shared package builds/typechecks, and two independent smoke tests pass. Prisma compatibility and dependent runtime validation remain blocked by network access, so override compatibility is not yet fully established.

ESLint 9.39.5 carries an upstream unsupported-version warning; its approved pin remains unchanged. Install scripts are allowlisted for Prisma engines, Prisma, and sharp. The removed Next lint configuration also removes the unrs-resolver dependency.
