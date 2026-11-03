# EgyHealth 360 — Pre-final Link Refresh Readiness Plan (R1)

**Status: RELEASE PLAN / READ-ONLY PREFLIGHT. NO DEPLOYMENT OR MERGE AUTHORIZATION.**

Prepared against:
- PR #79 Patient My Care visual master: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0` — OPEN / UNMERGED.
- PR #80 stacked Clinician master / Patient-DNA premium head: `6fbd247a09d774fa42d9712068699753a88e10e6` — OPEN / UNMERGED.
- This Design System V2 candidate branch is documentation-only and stacked on PR #80; it is NOT a reason to hold a limited two-screen preview hostage to a final brand/icon decision.

## 1. Existing host verified by connected Vercel read-only inspection

The currently connected team is on Vercel Hobby. The project `egyhealth360-pre-final-staging` has ID `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q`. At inspection:
- A latest Vercel **staging** deployment `dpl_E8HY54CoDEHwXDgeJHcjqvkAbmSK` was **READY**.
- Its generated URL: `https://egyhealth360-pre-final-staging-o6fyo1so1.vercel.app`.
- Its confirmed alias in deployment metadata: `https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app/`.
- Related API project: `egyhealth360-pre-final-api`, ID `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF`; latest inspected deployment was READY.
- No reliable Git SHA was returned for the current staging deployment. **READY != same-source release parity or complete clinical availability.**
- Vercel Git deployment context did not list these EgyHealth projects among directly linked Git projects. Do not assume a new GitHub PR push automatically creates an accessible preview.

Do not infer that these Vercel deployments already contain PR #79/#80. They do not have verified exact-commit parity and both PRs are unmerged.

## 2. Two distinct goals, two decision gates

**R1 — Safe design-preview refresh**: allow the Product Owner and graduation supervisor to inspect the newly approved Patient / Clinician visual language on a **separate temporary preview URL** first. Clearly label any synthetic fixtures/Demo as such. Keep current stable host untouched while examining layout, functionality and Arabic.

**R2 — Promote verified staging release**: only after R1 acceptance, combine the accepted frontend commits with the authorized main/backend baseline, verify Live adapter/backend/database compatibility and deploy the exact reviewed release artifact to the stable staging alias.

Neither step is a production-domain promotion. A Product Owner must explicitly authorize the specific release target and commit. Requesting "update the link soon" expresses priority, not permission to merge or deploy unknown content.

## 3. R1 staging preview readiness checklist

1. **Commit/provenance**: identify exact Patient+Clinician combined SHA; check PR #79, #80 heads unchanged and verify dependency order. The current PR #80 head already contains the Patient baseline by stacking.
2. **Changeset**: confirm only accepted visual slices and their separately authorized interfaces are included. Do not accidentally include final brand/logo proposals, backend changes, hidden clinical data or Lab.
3. **Build evidence**: exact-head production build, typecheck, lint, 162 UI tests, browser regressions, docs and security/privacy tests, workflow CI; verify actual required job statuses. Green source tests do not establish deployed parity.
4. **Deployment method**: inspect Vercel project build root, environment, routes, API rewrites, current deployment source and access protection. If not Git-connected, use an explicitly authorized, reproducible project deployment action rather than assuming PR autodeployment.
5. **Isolation**: a preview must not point at an unverified production database or clinical state. Either run clearly synthetic, non-persistent Demo presentation with explicit label, or connect to a known-isolated staging backend with versioned fixtures.
6. **Preview smoke**: first load, auth bootstrap, EN/AR, RTL, 390px Patient, 1600/1280 Clinician, 320 and 200% reflow, login/role boundaries, loading, error, redaction, private-vs-released content, unavailable destination, and no Demo-to-Live fallback.
7. **Evidence/rollback**: capture the preview URL, deployment ID, commit SHA, environment, tests, representative screenshots, and previous working deployment. Record rollback route before any alias assignment.
8. **Owner gate**: Product Owner reviews the new URL and gives explicit approval for a stable-link update.

## 4. R2 stable-link release readiness checklist

1. **Integration**: separately authorize merge of PR #79, followed by rebased/integrated PR #80, or create a reviewed, exact-SHA release candidate with equivalent dependency order. Do not let a stacked PR merge unexpectedly or trigger auto-merge.
2. **Backend/API compatibility**: verify actual Live consultation routes, auth/session/CSRF, booking/documentation/follow-up/close contracts, source audience boundaries and no unauthorized service calls. Unavailable People in your care must remain unavailable until supported.
3. **Database migration parity**: current documentation earlier noted hosting migration evidence through migration 20 while main contains 22. Check actual staging migration table and runtime schema. Never assume migrations 21/22 were applied or run migrations implicitly without a dedicated safe plan and authorization.
4. **Exact environment**: verify frontend same-origin `/api/v1` proxy route, API target, Neon staging database connection, region and essential configuration **without exposing secret values**. Keep API/final-domain boundaries unchanged.
5. **Live smoke on isolated staging**: login → directory/availability → booking → explicit open → clinical documentation → independent release → independent follow-up → review & close → CLOSED/CONSULTED; verify EN/AR and role/authority boundaries. Include wrong-patient access, redaction, operation-key/uncertain command and audit tests as required by accepted contracts.
6. **Deploy exact build**: build/release from one frozen commit, inspect deployment readiness and logs; serve the preview/release candidate before moving the stable alias. If the Vercel route requires production-target promotion, do **not** promote without separate explicit approval; do not silently switch environments.
7. **Post-release**: verify the stable URL, health endpoint, privacy checks, Browser→Next→API→Postgres round trip (staging only), and actual deployed commit. Record pass/fail, screenshots, deployment IDs and rollback instructions.
8. **Stop-the-line**: any broken auth, wrong-patient privacy, data-source mismatch, migration drift, accidental lab exposure, false clinical state or API outage blocks release. Roll back the alias/build, not the clinical database, if a site deployment is faulty.

## 5. Next task for implementation agent — documentation and audit only

Prepare an **R1/R2 release candidate readiness report** containing:
- exact base+head dependency graph for PR #79/#80,
- Vercel project/staging alias mapping,
- actual frontend/API build and environment ownership (no secret values),
- frontend current/staging source parity (unknown until independently established),
- hosting migrations vs code migrations, without applying anything,
- specific preview method and any required user authorizations,
- current Live-compatible vs Demo-only UI,
- read-only smoke checklist and roll-back candidate.

**No merge, no push to stable alias, no database migration, no deployment and no production-domain promotion under this plan alone.**

## 6. Release decision request

After the separate preview artifact/URL is inspected, request an explicit choice:
- **Approve updating the current staging alias to exact reviewed commit `<sha>`**, or
- **Keep the current stable URL and use only a temporary preview**.

Do not promise a release date until blockers and exact environment are verified.
