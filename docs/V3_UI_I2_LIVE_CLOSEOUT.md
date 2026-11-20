# I2 Live Demo Closeout

Authorized by [Issue #48](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6545624864), starting from exact main `43d9f28db2cbff4d604e97bb5bfdb353759ee699` after PR #63. One sprint/branch; I3 and EACCE remain outside scope.

## Delivered journey

Live booking → explicit start (current approved patient-authorization/clinician-acceptance relationship required) → human documentation/private draft → independent patient summary and follow-up intent → Review & Close → explicit close → consultation CLOSED and booking CONSULTED. Release/signing actions remain separate and continue to require current authority, including after close. No automatic signing, release, care-action completion, EACCE, prescription, lab, pharmacy, notification or AI behavior.

The review shows recent saved note/summary states and draft/released follow-up counts for the current page. It explicitly asks the clinician to review all saved pages and unsaved changes in the workspace. It does not claim to save editor changes. A confirmation checkbox and separate close button make the terminal action deliberate. Pending close disables dismissal/actions; Escape restores trigger focus before submission; success focuses the closed result. Read failures, conflict/stale state, denied authority, expired session and uncertain outcome stay Live.

`PUT /api/v1/consultations/{consultationId}/close` sends exactly `{operationKey,expectedVersion}` from the consultation context (not booking version). Exact allowlisted CLOSED/CONSULTED/version 2 receipt only. Keys live in authenticated memory and survive unchanged manual retry, including a lost committed response. No automatic mutation retries or browser clinical/credential storage. Logout, identity change and expiry clear close scope; late responses cannot restore it. Conflict offers an explicit current-state refresh, including already-closed recovery. Authority denial clears authoring scopes.

The workspace, doctor detail/schedule/dashboard and patient detail/history accept CONSULTED and CLOSE history. Illegal operational actions remain disabled; patient entry points lead to independent released-summary/follow-up readers and never imply unreleased material was shared. Follow-up linked-booking presentation also accepts CONSULTED.

## Minimum backend gap

The prior frontend depended on an ephemeral opening receipt. Reloading lost the consultation ID, and the backend had no safe way to recover it. The authorized minimal fix is `GET/HEAD /api/v1/me/bookings/{bookingId}/consultation`, a zero-write, booking-scoped projection using existing opening authority checks/lock order and exact booked/actual treating identity. It returns lifecycle/version/open/close time and public provider/clinic locators, with no patient/profile/assignment/membership/key/clinical fields. See [API](API.md#i2-live-closeout-booking-scoped-consultation-recovery) and [OpenAPI](openapi.json). No schema, migration, historical SQL, dependency or clinical-domain change.

## Proof

- Focused adapter tests: exact body/CSRF/no-store, unchanged manual retry, no automatic retry, safe 400/401/403/404/409/503, malformed/mismatched projections, in-flight scope invalidation, terminal booking projection/eligibility, exact OpenAPI agreement.
- Real PostgreSQL recovery tests: OPEN/CLOSED/HEAD/no-store, zero writes, canonical route/no query, no booking-only/other-role/unrelated clinician access, ended assignment/session/patient/clinic/membership/affiliation denial, and ongoing authority after public hiding.
- Controlled real-browser matrix: EN/AR/RTL, pending dismissal, explicit retries, stale/already-closed refresh, authority/session editor clearing, no fallback, safe errors, mobile overflow.
- `pnpm test:ui:real`: actual Browser → production Next rewrite → Nest → disposable PostgreSQL 18.6. Existing real booking and bilateral authority workflow precede opening/documentation. Close proof saves private/summary/follow-up drafts, recovers after reload, executes real close with a deliberately dropped committed response, explicitly retries identical PUT, verifies a single close event/operation/audit and CLOSED/CONSULTED, byte-equivalent clinical tables/patient projections before versus after close, terminal doctor/patient views and backend denial of illegal booking commands. Independent explicit summary/intent releases after close are also proved; private draft stays unsigned.

The existing synthetic timing fixture moves scheduled booking/slot snapshots coherently with guards restored before browser actions; the extra close visit uses a separate past interval to avoid overlap with prior fixture visits. Actual opening/close provenance remains database-clock owned. This is real local HTTP/database execution, not a claim of public hosted validation. The inherited combined backend runtime additionally proves real-clock opening.

Presentation evidence from the real stack: [English desktop review](ui-screenshots/closeout/en-1440-review.png), [English mobile](ui-screenshots/closeout/en-390-review.png), [Arabic desktop](ui-screenshots/closeout/ar-1440-review.png), [Arabic mobile](ui-screenshots/closeout/ar-390-review.png); tablet captures are in the same folder. All use synthetic data.

## Stable presentation deployment

Use the existing [Vercel settings](V3_UI_LIVE_ACCELERATOR.md#vercel-deployment) for preferred frontend `egyhealth360.vercel.app`. The repository is ready for the existing Next deployment path. There are no configured deployment secrets/outbound identities in this managed environment; no public hosted Live backend is claimed.

External deployment step: connect the repository/branch to the intended Vercel project with root `apps/web`, workspace source inclusion, Node 24.x and pinned pnpm; supply a separately hosted synthetic-data Nest/PostgreSQL HTTPS backend via build-time `EH_UI_API_ORIGIN`; set backend `AUTH_BROWSER_ORIGIN=https://egyhealth360.vercel.app`; deploy/redeploy and perform the Live browser smoke with authorized synthetic accounts. Without a public backend origin the hosted frontend explicitly offers Demo only. See the existing guide for full build/cookie/CSRF settings. Local real E2E remains authoritative until those external services/credentials exist.

## Candidate validation

Pinned Node 24.21.0 / pnpm 10.34.6, PostgreSQL 18.6, production Next build and system Chromium:

| Check | Result |
| --- | --- |
| Frozen install; full build/typecheck/lint | PASS |
| Root unit tests | 297/297 PASS, including 155 frontend tests |
| Focused opening/close/recovery PostgreSQL regressions | 25/25 PASS |
| Recovery expiry/revocation after observed PostgreSQL lock waits | 2/2 PASS |
| Full controlled browser suite and final close focus/dialog-bounds delta | PASS, EN/AR/RTL |
| Full real Browser → Next → Nest → PostgreSQL journey | PASS, including real close and unchanged explicit retry with single history/audit |
| Both dependency audits | PASS; 0 HIGH / 0 CRITICAL; lockfile unchanged |
| Historical migration SQL/schema and merged API contracts | Unchanged; exact pre-closeout OpenAPI byte hash preserved after removing only the added recovery methods/schema |

Exact candidate/remote CI evidence is recorded in the PR and single [Issue #48 sprint status comment](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6545687954). No hosted deployment is claimed.
