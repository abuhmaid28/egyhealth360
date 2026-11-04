# Temporary supervisor demonstration

Authority: Product Owner request in the current Codex chat, 4 November 2026. This authorizes only an isolated, temporary, public synthetic interactive demo. It does not authorize merging PRs #79/#80/#81, changing stable hosting, finalizing Design System V2, touching Neon, or resuming the wider roadmap.

## Verified starting references

Remote main `0a0e9c2038ecad420e95c2c67ae367129e195839`; Patient PR #79 `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`; Clinician PR #80 `6fbd247a09d774fa42d9712068699753a88e10e6`; documentation candidate PR #81 `3c819b0c837deb17b4c10d96634a3a999d548b7c`. All three PRs were open and unmerged. The review branch `demo/supervisor-interactive` starts at PR #80, which already contains Patient #79. PR #81 is not imported.

## Implementation and isolation

`apps/supervisor-demo` is a separate Next.js app with static export and client-side interactivity. It directly imports the accepted Patient My Care, clinical documentation editor, follow-up editor, consultation identity/tasks, CSS modules and local fonts. Those original sources remain byte-identical. Entry and supporting screens use the existing navy/teal family and typography. There are no screenshot pages, new logos or component libraries.

The app never imports Application, LiveSessionProvider or createLiveAdapter. Its Patient context uses the existing memory-only Demo adapter without a Storage object. The clinical editor receives the existing controlled, synthetic-only documentation driver through a reduced wrapper. That driver has no HTTP transport or real authorization. Its test/authority controls are private to the wrapper. No Live clinical command, fabricated auth receipt, cookie, token, database or server action is used. Existing production routes, auth and contracts are unchanged.

The deployed artifact contains only Next-exported HTML, JavaScript, CSS, route data, fonts and a static hosting config. There are zero server functions and no API rewrites, environment variables or connected Git integration. Security headers restrict connections to the deployment origin, deny framing and external form submission, disable camera/microphone/location and request no indexing. Inline script/style support is needed for Next hydration. No paid service or enhanced build/compute feature is enabled.

Every page has a bilingual synthetic-demo notice. Clinical dialogs carry an additional demonstration label. Existing editor feedback explicitly says the controlled preview made no Live backend write. All save/sign/release/booking/close actions modify fictional tab-local state only. They create no clinical record, prescription, actual document release or appointment. Closing requires acknowledgement and does not implicitly sign or release anything.

## Working scope

- Bilingual landing, Patient My Care, desktop header and mobile bottom navigation.
- Synthetic appointment detail/history, doctor search, slot selection and booking with visible feedback. Fixed demonstration dates are retained from the approved fixtures.
- Clinical documentation: complaint/findings, allergy review, private draft/signing, summary draft/explicit release, signed history, amendments and restriction using the controlled local driver.
- Follow-up draft, optional desired window, explicit simulated release and correction.
- Review & Close acknowledgement, synthetic closed state, disabled editors after closure. Closure survives client-side navigation; reset/reload starts a fresh demo.
- Patient released-summary/follow-up projection excludes private notes and drafts. The Patient example is fictional Ahmed; the clinical example is fictional Salma. The shared-view screen explicitly explains the separate illustrative personas.
- Account page explains the synthetic scope. Prescription shortcut leads to an explicit unavailable explanation; there is no prescribing. Other role choices report the bounded scope. No Laboratory, EACCE or AI feature is added.

## Reproduction and checks

Use Node `24.21.0` and pnpm `10.34.6`, as pinned by the repository. No secret/environment file is required.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @egyhealth/supervisor-demo build
pnpm --filter @egyhealth/supervisor-demo typecheck
pnpm lint
node --test tests/ui*.test.mjs tests/supervisor-demo.test.mjs
python -m http.server 3200 --directory apps/supervisor-demo/out
# In a second terminal:
node scripts/demo/verify-supervisor.mjs
node scripts/demo/package-supervisor.mjs
```

The package script copies only the static export to `/tmp/eh-supervisor-publish`, adds deployment-local security headers and creates a SHA1/size file manifest. Publish those files using the authorized Vercel connection into a newly created project named `egyhealth360-supervisor-demo-20261104`, with framework/build/install settings null. Use a preview deployment, not promotion or alias assignment. The Vercel connector supports file upload/deployment; no CLI credential extraction or interactive login is necessary. Never publish the repository root or `.next` directory.

The existing production web build and full `scripts/test-ui-browser.mjs` regression were also run unchanged. Relevant local results: production builds passed; typecheck and repository lint passed; all 162 existing UI tests passed; the new no-network/private-projection/restriction test passed; existing browser regression passed. The new browser suite covers EN/AR at 1440px and 390px, local booking, private signing, explicit summary/follow-up release, acknowledgement/close, reduced patient projection, reset, link HTTP checks and overflow. Its four scenarios recorded zero JavaScript exceptions, failed requests, API requests, mutation HTTP requests or external requests. Deployment/public proof and exact identifiers are recorded in the PR/final handoff after publication; READY alone is not acceptance.

## Limits and preserved systems

This is an ephemeral synthetic review, not medical software for use with real data. Reload/reset clears state; separate browser tabs do not share it. Only Patient/Clinician and one illustrative clinical visit are included. Dates/names are fictional fixture values. Browser evidence is Chromium; it is not native-device, Safari/Firefox, assistive-technology certification or independent Arabic usability review. No independent product/design acceptance is claimed.

Main, PRs #79/#80/#81, existing staging/API/review project deployments and aliases, protected `egyhealth360.vercel.app`, backend/API/auth/OpenAPI, schema/migrations and Neon remain untouched. No paid service is enabled. Keep this review PR open and unmerged. The broader roadmap remains paused pending Product Owner review.
