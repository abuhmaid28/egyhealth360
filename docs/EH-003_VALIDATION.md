# EH-003 validation status

## Fresh-environment continuation — 2026-10-12

Resumed the existing `feature/EH-003-bootstrap-v2` branch at exactly
`3e912e9b3e7979b83426ea1a139c6801e8e0e868`, with a clean working tree and
`packages/db` present. No direct pin, architecture, or implementation scope changed.

**NETWORK PREFLIGHT: PASSED.** Startup HTTP policy reports unrestricted.
The Prisma host returned an upstream 404 at its root, with no policy 403.
Actual Prisma 7.10.0 client generation succeeded after a frozen install using
approved Node 24.21.0 and pnpm 10.34.6. npm and Node distribution requests
returned HTTP 200; authenticated GitHub operations and container pulls succeeded.
Runtime policy telemetry reports enforcement state unknown; actual successful
requests and Prisma generation provide the observed network evidence.

The environment defaults were Node 24.19.0 / pnpm 11.25.0. An initial command
stopped in pnpm 11's minimum-release-age check before running Prisma. Approved
versions were installed outside the project; Node's distribution checksum was
verified and inherited proxy/CA settings were preserved. Corepack used
`NODE_USE_ENV_PROXY=1`. No policy was relaxed or dependency version changed.

## Passed locally

- `pnpm install --frozen-lockfile` with Node 24.21.0 / pnpm 10.34.6.
- `pnpm --filter @egyhealth/db generate` and `validate`: model-free Prisma 7.10.0.
- `pnpm lint`, `pnpm build`, and `pnpm typecheck`: all apps/packages.
- `node --test tests/*.test.mjs`: three passing unit tests, including sanitized API failure output.
- `pnpm test:integration`: two passing tests against PostgreSQL 18.6, covering model-free Prisma connectivity, API contract, worker repeated polling and clean shutdown.
- SQL inspection: zero public application tables.
- `pnpm audit --prod --audit-level high` and full `pnpm audit --audit-level high`: no known vulnerabilities.
- `docker compose config --quiet`.
- `docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t egyhealth360-bootstrap:local .`: clean container build, including fresh dependency install and Prisma generation.
- `docker compose up -d --no-build --wait --wait-timeout 120`: PostgreSQL, API, web, and worker all healthy.
- Web HTTP 200; API HTTP 200 with `{"data":{"status":"ok"}}`; repeated worker database health success.
- Diff review: bootstrap only, no domain model/clinical/auth/research implementation; generated output and credentials remain ignored.

Disposable local database credentials were supplied through command environment
variables. The host integration run used the loopback Compose override; the full
stack uses default Compose without publishing PostgreSQL. Containers run as the
unprivileged `node` user.

## Remaining external validation and limitations

GitHub Actions results are tracked on the review PR; local results alone do not
establish remote CI success. No automatic merge or production deployment.
Prisma emitted an OpenSSL detection warning in the slim Docker build image;
generation and all runtime checks passed. The bootstrap uses Prisma's pg adapter;
no migration/native-engine runtime workflow is claimed. The image retains build
tooling as already documented; production image hardening is outside EH-003.

## Dependency review after approved overrides

The only overrides are deepmerge-ts **8.0.0** and mysql2 **3.23.1** in pnpm-workspace.yaml. These remediate the detected transitive advisories; every approved direct dependency pin, including Prisma **7.10.0**, is unchanged.

Verified with `pnpm why -r deepmerge-ts mysql2`:

- deepmerge-ts 8.0.0 ← @prisma/config 7.10.0 ← prisma 7.10.0.
- mysql2 3.23.1 ← prisma 7.10.0.
- Prisma is a DB-package development dependency and is also resolved through @prisma/client's peer relationship.
- mysql2 is not declared in any application/package manifest and has no application imports or usage. PostgreSQL remains the only database.

Following explicit approval, eslint-config-next was removed and the already approved ESLint/TypeScript rules remain active. This eliminates the braces dependency path (GHSA-vfj7-8cjw-p6xm) without selecting another package version. Both production and full development-inclusive audits now report **zero vulnerabilities at all severities**. Frozen installation and lint pass after removal. No audit finding is suppressed. Next-specific lint rules are deferred; the web skeleton remains covered by TypeScript and generic lint rules.

After the overrides, frozen installation, web build/typecheck, five non-DB shared package builds/typechecks, and two independent smoke tests pass. Prisma generation/validation, dependent builds, PostgreSQL integration tests, and Docker runtime checks now pass with these overrides.

ESLint 9.39.5 carries an upstream unsupported-version warning; its approved pin remains unchanged. Install scripts are allowlisted for Prisma engines, Prisma, and sharp. The removed Next lint configuration also removes the unrs-resolver dependency.
