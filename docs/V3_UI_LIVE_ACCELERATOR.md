# Graduation UI / live delivery accelerator

Bounded frontend work for [Issue #51](https://github.com/abuhmaid28/egyhealth360/issues/51). Exact base: `4cb20b39370e5317eba14c4916517b6ae88c12e5`; branch: `feat/v3-ui-live-accelerator`. Base [Bootstrap 41118583027](https://github.com/abuhmaid28/egyhealth360/actions/runs/41118583027) was verified completed/success, push/main, at that exact SHA. Leave the resulting PR OPEN / UNMERGED with no auto-merge.

## Assessment and changes

Main already contains the five English/Arabic workspaces, responsive Golden Demo, real Availability/Booking/Consultation Opening and Slice 5 documentation. PR #59 merged at `b97bd990644aef1e0de77098b139597adb2fbf0f`; older open/in-review documentation describes an earlier review point.

The largest remaining presentation issues were disconnected Live record entry, false zero-summary statistics from the legacy projection, stale unavailable-documentation copy, medication/lab shortcuts into unintegrated Live flows, missing nested navigation markers and a deployment rewrite defaulting to local loopback.

- The responsive EN/AR care-journey strip links discovery → appointments → released care, even when the independent legacy-record read fails. It infers no completion or clinical authority.
- Live dashboard/recent care/history link to the actual released-summary reader. The legacy record cannot claim zero released summaries; the unqueried count is explicitly unknown. No extra background clinical read/cache is introduced.
- Record copy reflects merged Slice 5. Live medication/lab shortcuts are replaced with integrated entry points. Prescriptions, lab/pharmacy fulfillment and general follow-up intentions remain Demo-only; all supporting Demo workspaces remain available.
- Detail pages retain their workspace navigation marker. Mobile navigation has dialog semantics. Released summaries have a specific breadcrumb.
- Login explains the two modes, prevents concurrent Demo entry during Live sign-in and uses LTR email input in Arabic. Live greetings no longer imply a fixed morning.
- One browser Demo adapter survives client navigation when storage access throws. Blocked storage uses memory; full reload then starts a fresh demo. Live failure never chooses Demo.
- The existing design and local font fallbacks remain. Inter/Noto Sans Arabic are preferred when available; no font download, paid asset or product dependency is added.

## Present the journey

**Browser Golden Demo:** select **Explore the patient demo**, discover Mariam, book a time, **Continue as doctor**, open the patient/consultation, manually enter and explicitly release the synthetic summary, then **See the patient record**. Optional Pharmacy/Laboratory handoffs remain synthetic. Reset through Demo controls before a fresh presentation. Fixture dates remain 28–29 October 2026.

**Live synthetic accounts:** directory → availability → Real Booking → clinician schedule → appointment → explicit Consultation Opening → **Open clinical documentation**. Save a patient-summary draft and deliberately sign/release it. Saving/signing a private note does not release it. Sign in as the patient and choose **Read released care** or **Open released summaries**. Server-side clinical authority is required independently of booking.

The backend still lacks a consultation-read/recovery endpoint. Clinician full reload loses the opening receipt; the existing recovery message remains explicit. This task does not invent a binding, persist clinical context or implement that backend dependency. Related-clinician summary reading still requires an exact patient locator. See [Phase 5](V3_UI_PHASE5_DOCUMENTATION.md) for privacy/retry/restriction evidence.

## Vercel deployment

The web app is ordinary Next.js 16 in a pnpm monorepo. No `vercel.json`, static export, custom server, database build step or Vercel-specific dependency is required.

Import the GitHub repository into Vercel with these settings:

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | Enabled for workspace lockfile/configuration |
| Node | 24.x; validation uses repository-pinned 24.21.0 |
| Package manager | Root `packageManager`: pnpm 10.34.6 |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` (the web package's `next build`) |
| Output Directory | Leave unset; Next.js default |

The standalone web build imports no internal compiled workspace package and needs no Prisma generation/database URL. Full repository validation still generates/builds all packages.

| Variable | Where / behavior |
| --- | --- |
| `EH_UI_API_ORIGIN` | Optional **build-time server configuration**, e.g. `https://api.example.invalid`. Bare origin without `/api/v1`, path, query, fragment or credentials. Vercel requires HTTPS and a non-loopback hostname. Redeploy after changing it. |
| `VERCEL` | Automatically supplied by Vercel (`1`). With no API origin, the hosted build has no API rewrite, explicitly offers Demo only and hides Live sign-in. An old Live preference triggers no API probe or automatic Demo entry. |
| `EH_UI_LIVE_CONFIGURED` | Derived build constant; do not set manually. Only a boolean marker, never an upstream secret. |
| `NEXT_TELEMETRY_DISABLED` | Optional `1` for local/CI tooling. |
| Backend `AUTH_BROWSER_ORIGIN` | Configure the separately hosted API with the exact HTTPS browser origin. Preview domains need matching synthetic backend configuration; do not add wildcard origins. |

Outside Vercel, an omitted API origin retains the local `http://127.0.0.1:3001` default; Compose builds can explicitly use `http://api:3001`. Browser requests remain same-origin `/api/v1/*`. Cookies remain HttpOnly/browser-managed and CSRF remains in memory. No database URL, password or session token belongs in browser code or `NEXT_PUBLIC_*` variables.

A configured but unavailable backend stays Live with explicit errors/recovery. For Live hosting, separately host the existing API/PostgreSQL over HTTPS with synthetic data, configure its exact browser origin, set `EH_UI_API_ORIGIN` and redeploy. Vercel hosts the web app, not the Nest/PostgreSQL services.

No Vercel CLI, token, organization/project IDs or linked project were available here. **No hosted deployment is claimed.** Exact external step: connect/import this repository into the intended Vercel account/project and deploy the branch with the settings above. Supply the separately hosted backend origin for Live access; a Demo-only deployment needs no backend credentials.

## Validation

Validation uses Node 24.21.0 / pnpm 10.34.6. Browser contract stubs demonstrate presentation; `test:ui:real` separately proves Browser → Next → Nest → disposable PostgreSQL. No backend, schema, migration, OpenAPI, Slice 6 test/verifier or CI workflow changes are authored.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; unchanged lockfile/dependencies |
| `pnpm generate` | PASS |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | PASS |
| `node --test tests/*.test.mjs` | PASS, 242/242 including frontend/unit and two deployment-origin tests |
| `pnpm test:ui:browser` | PASS; existing Golden Demo/RTL/Booking/Opening/controlled documentation matrices plus the new Live summary-entry, legacy-record-failure recovery and storage-denied Demo checks |
| `pnpm test:ui:real` | PASS; real Availability, Booking, authority-gated Opening and Slice 5 signing/release/retry/privacy/restriction against disposable PostgreSQL 18.6 |
| Vercel build without API + `node scripts/test-ui-deployment-browser.mjs` | PASS; actual production start, EN/AR mobile, no loopback rewrite or API calls, explicit Demo entry |
| `pnpm audit --prod --audit-level high` | PASS; 0 HIGH / 0 CRITICAL |
| `pnpm audit --audit-level high` | PASS; 0 HIGH / 0 CRITICAL; inherited 2 LOW / 3 MODERATE |

Selected visually inspected evidence, using synthetic data only:

| Capture | Meaning |
| --- | --- |
| [Desktop Demo overview](ui-screenshots/accelerator/demo-en-desktop.png) | Existing design with continuous journey entry |
| [English mobile Live entry](ui-screenshots/accelerator/live-en-mobile.png) | Contract-stub presentation; unknown summary count and real-reader navigation |
| [Arabic mobile Live entry](ui-screenshots/accelerator/live-ar-mobile.png) | Same EN/AR/RTL layout and truthfulness checks |
| [English hosted Demo entry](ui-screenshots/accelerator/hosted-demo-en-mobile.png) | Actual local Vercel-mode production build, backend unconfigured |
| [Arabic hosted Demo entry](ui-screenshots/accelerator/hosted-demo-ar-mobile.png) | Explicit Demo-only disclosure in RTL |

The Live-entry screenshots are contract-stub UI evidence, not additional persistence proof. The real backend suite passed independently. Historical screenshots 01–58 are preserved.

To verify an unconfigured hosted build locally from the repository root:

```sh
# Ensure EH_UI_API_ORIGIN is absent for this build.
VERCEL=1 pnpm --filter @egyhealth/web build
node scripts/test-ui-deployment-browser.mjs
# Rebuild normally before connected Live browser suites.
pnpm build
```

This checks production start, absent loopback rewrite, EN/AR mobile disclosure, explicit Demo entry, no API calls and no silent fallback. It does not imply an external deployment.
