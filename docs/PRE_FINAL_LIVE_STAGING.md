# Pre-final Live staging continuation

Authorization: [Issue #48](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6546273972).
Base: `fc8a157bf341832fdcdc8c38de19b34904c466ca`.
Branch: `feat/pre-final-live-staging-neon`. Same five-checkpoint sprint; inherited progress was 2/5.

## Existing infrastructure and exact routing

| Component | Existing resource / configuration |
| --- | --- |
| Frontend project | `egyhealth360-pre-final-staging` / `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q` |
| Browser origin | `https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app` |
| API project | `egyhealth360-pre-final-api` / `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF` |
| API origin | `https://egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app` |
| Vercel team | `team_auKJxb8WoqzE3RhVlI7Me0eq` |
| Neon project / branch | `spring-star-16308392` / `br-bold-resonance-ar7tw4rg` |
| Database | `egyhealth360_staging`, PostgreSQL 18.6, pooled TLS connection |

No new frontend/API/Neon projects were created. The owner approved the existing
frontend project's stable alias during this continuation. Vercel rejected aliasing
the original `egyhealth360-pre-final-staging-1ochzl0aq.vercel.app` hostname because
it is an immutable deployment URL. That historical deployment remains available;
the stable alias serves the rebuilt frontend with Live routing enabled.

`egyhealth360.vercel.app` remains reserved and untouched. No production promotion,
final-domain alias, Render or Railway service was used.

The frontend's server-only build variable `EH_UI_API_ORIGIN` is the API origin above.
Next rewrites `/api/v1/:path*` to that origin. Browsers use same-origin requests;
the API's `AUTH_BROWSER_ORIGIN` is the exact browser origin above, without a trailing
slash. No wildcard/CORS relaxation or cross-site cookie change is needed.
`NODE_ENV=production` retains `__Host-eh_session`, Secure, HttpOnly, SameSite=Lax,
CSRF and exact origin checks. Live errors remain Live.

## Deployment settings

API: existing project, root `apps/api`, framework `nestjs`, output `dist`, Node
`24.x`, workspace files outside root enabled. `apps/api/vercel.json` pins the build
toolchain to repository Node `24.21.0` and pnpm `10.34.6`, generates Prisma and builds
only the API dependency graph. Explicit ES2023 library types preserve compatibility.

Vercel's NestJS detector selects files that import `@nestjs/core`. The factory in
`src/app.ts` matched while the original listening `src/main.ts` did not, producing
`FUNCTION_INVOCATION_FAILED`. A side-effect core import makes `main` the first valid
entrypoint; output-directory detection uses the normal TypeScript-compiled JavaScript
and decorator metadata. `PORT` takes precedence over the existing `API_PORT` fallback.
No product route, schema, migration or clinical behavior changes.

Frontend: existing project, root `apps/web`, Next.js, Node `24.x`, workspace files
outside root enabled. Install using the same pinned npm-exec wrapper as the API;
build `pnpm --filter @egyhealth/web build`. Only the server-only API origin is added
to the frontend project. Database credentials are configured solely in the API
project as a sensitive Preview variable, never in frontend source or configuration.

The Vercel REST deployment target is `staging` (Preview); `preview` is not an accepted
REST `target` value. These are temporary project deployments, never the final project.

## Explicit initialization and off switch

The recovered database already had five approved M1 synthetic identities, one
ACTIVE historical assignment, and operational directory/setup. It had zero clinical
encounters/consultations and zero unrevoked admin sessions. **The pre-existing
assignment is preserved, not recreated or attributed to this initializer.**

`scripts/staging-seed.mjs` requires production cookie mode, Vercel Preview, the exact
API project, Neon project, pooled hostname, database name, approved HTTPS browser
origin, TLS, private password, and explicit `EH_STAGING_SEED_ENABLED=1`. Host/query
substitution, non-TLS, other projects/databases, and final/production targets fail.

This continuation reuses `seedDemo(..., { requireExisting: true })`: missing users,
profiles or the historical assignment fail closed. It cannot silently reconstruct
clinical authority. Existing fixed operation keys initialize/replay only synthetic
organization, membership, public directory and scheduling setup through current
ADMIN services. Existing scheduling values are checked without adding a new version.
The temporary real ADMIN session is revoked on success and failure. No clinical
records, availability, bookings, summaries, intents or new assignments are seeded.

Run explicitly from the repository root with private injected variables:

```sh
node scripts/staging-seed.mjs
node scripts/verify-staging-initializer.mjs
```

The verifier executes twice and compares every public table except genuine
sessions/audits, including all identity, operational, clinical and migration rows.
It also verifies no active temporary ADMIN session remains. This proof passed on
the existing Neon database. The same opt-in can execute it during an explicitly
authorized API build. No initialization runs on requests/startup.

**Current project setting: `EH_STAGING_SEED_ENABLED=0`.** The explicit seed command
returns SKIPPED and later builds perform no database initialization. Keep this off
after bootstrap. Builds do not run migrations. All twenty historical migration
names/checksums were independently matched against Neon; no failed entries existed.
Any future migration is a separate reviewed change, using a direct connection.

## Validation commands and evidence

```sh
pnpm build
pnpm typecheck
pnpm lint
node --test tests/*.test.mjs
node --test tests/integration/staging-seed.test.mjs tests/integration/auth.test.mjs tests/integration/health.test.mjs
# Explicit hosted test: inject the existing synthetic EH_DEMO_PASSWORD privately.
node scripts/test-staging-browser.mjs
```

The hosted verifier uses real public HTTPS, UI login, secure browser cookies,
availability publication, patient booking, clinician schedule, actual appointment
time, consultation opening, reload recovery, private drafts, independent summary
and FollowUpIntent releases, deliberate Review & Close and CLOSED/CONSULTED views.
It checks EN/AR/RTL at desktop/mobile widths, post-close controls and patient privacy.
It creates synthetic validation records through normal public application operations.
No backend response mocks, clock changes, disabled constraints or data backdating.
Artifacts are written under `/workspace/staging-evidence`.

Local initializer integration additionally verifies no duplicates, missing-fixture
failure, clinical/authority preservation and session revocation after operational
failure. Auth and health checks preserve the existing contract. Final hosted and CI
results are recorded in the sprint PR; progress stays below 100% until both pass.

I3, EACCE, prescriptions, laboratory/pharmacy fulfillment, notifications and AI remain
outside this staging sprint.
