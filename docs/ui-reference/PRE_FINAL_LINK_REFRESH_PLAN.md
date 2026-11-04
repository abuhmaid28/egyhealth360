# EgyHealth 360 — Pre-final Link Refresh Readiness Plan (R1)

**Status: RELEASE READINESS PLAN — R1 INTERACTIVE PREVIEW BLOCKED / R2 STABLE-ALIAS REFRESH BLOCKED, pending explicit gates. READ-ONLY AUDIT, NOT DEPLOYMENT OR MERGE AUTHORIZATION.**

Audit source: independent read-only review of PR #81 and Vercel/Neon configuration, received 2026-11-04. Findings below are verified **as reported by the independent audit** unless independently re-read from connected tools at a later release gate. Environment state can change; recheck immediately before deployment.

Prepared against:
- PR #79 Patient My Care visual master: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0` — OPEN / UNMERGED.
- PR #80 stacked Clinician master / Patient-DNA premium head: `6fbd247a09d774fa42d9712068699753a88e10e6` — OPEN / UNMERGED.
- This Design System V2 candidate branch is documentation-only and stacked on PR #80; it is NOT a reason to hold a limited two-screen preview hostage to a final brand/icon decision.

## 1. Existing host verified by connected Vercel read-only inspection

The previously observed Vercel plan was Hobby, but the later audit did **not** re-establish billing/quota limits; recheck them before preview builds. Verified team ID `team_auKJxb8WoqzE3RhVlI7Me0eq`. The project `egyhealth360-pre-final-staging` has ID `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q`. At inspection:
- A latest Vercel **staging** deployment `dpl_E8HY54CoDEHwXDgeJHcjqvkAbmSK` was **READY**.
- Its generated URL: `https://egyhealth360-pre-final-staging-o6fyo1so1.vercel.app`.
- Its confirmed alias in deployment metadata: `https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app/`.
- Related API project: `egyhealth360-pre-final-api`, ID `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF`; latest inspected deployment was READY.
- No reliable Git SHA was returned from deployment metadata. **Source inspection showed an actual mismatch**: the deployed frontend tree lacks both new accepted slices, and deployed frontend/API application/schema source identities differ from current accepted repository heads. This is a **confirmed deployed source mismatch**, not merely unknown parity (R1).
- Current frontend HTTP 200 and direct/proxied API health HTTP 200 with `status: ok` establish reachability only. They do not prove clinical contracts, source parity, isolated authority or persistence.
- Vercel Git deployment context did not return EgyHealth projects as Git-linked. Root/build/install/workspace configuration and deployment method must be re-read, not assumed (R6).
- Frontend Preview configuration currently points at the **existing API**. The API's `AUTH_BROWSER_ORIGIN` is bound to the current stable frontend origin; exact Origin checks apply. A new frontend hostname cannot safely use Live sign-in/commands without a scoped API Origin + cookie/CSRF plan (R2).
- Existing staging Neon records were found with **20 completed migrations out of 22** source migrations, without incomplete/rolled-back rows and with existing 20 checksums matching source. The two absent migrations are `20261101150000_v3_i3_prescription_source` and `20261101170000_v3_i3_pharmacy_fulfillment`; their new tables are absent there. This is **verified 20/22 gap** on the inspected staging DB (R4), not speculation.
- Neon project/host metadata matches the documented staging branch/database, **but the deployed API's sealed effective `DATABASE_URL` binding remains unverified** (R5). Do not assume the running API is connected to exactly that verified DB.
- Deployment records exist, but those listed were not marked Vercel rollback candidates. Recovery actions must be explicitly rehearsed and documented; do not promise generic rollback (R7).

These facts prohibit claiming that the current hosted link includes PR #79/#80, supports their live features, or has complete migration/schema parity.

## 2. Two distinct goals, two decision gates

**R1 — Paired, isolated interactive preview (currently BLOCKED)**: demonstrate **both** accepted Patient My Care and authenticated Live Clinician documentation in one review experience on a **separate temporary frontend review URL** backed by a deliberately paired **preview API** and an **expiring isolated Neon branch with verified synthetic-only fixtures**. Label synthetic data truthfully. **Demo-only frontend preview is insufficient**: the accepted Clinician shell is gated on authenticated `Live CLINICIAN`. Keep existing stable frontend/API aliases and staging DB untouched. No preview may be created before target, isolated database, exact-origin authentication and migration authorization are verified.

**R2 — Stable staging alias refresh (currently BLOCKED)**: only after a separately authorized, tested R1 and reviewed release integration may the Product Owner approve changing the existing stable frontend alias. Compare/reconcile the frozen Patient+Clinician candidate with the authorized main/backend baseline; verify Live adapters, source parity and staging migrations/database binding first. A successful preview is necessary but **not sufficient** for safe alias assignment.

Neither step is a production-domain promotion. A Product Owner must explicitly authorize the specific release target and commit. Requesting "update the link soon" expresses priority, not permission to merge or deploy unknown content.

## 3. Readiness gap register — R1–R8

| ID | Read-only audit finding | Release gate |
| --- | --- | --- |
| R1 | Neither deployment supplies Git SHA; source inspection finds **actual** frontend/API mismatch to accepted repo. | Require frozen exact source manifest + deployed-code verification; do not equate health 200 with parity |
| R2 | Frontend Preview currently points to existing API; `AUTH_BROWSER_ORIGIN` enforces existing stable origin. | One temporary review hostname and paired API with explicit exact Origin, CSRF, cookie and rewrite mapping |
| R3 | Patient is Demo/Live; accepted Clinician shell is authenticated **Live-only**. | One isolated **interactive paired frontend/API preview**, not fake Demo-only Clinician |
| R4 | Inspected staging Neon has 20/22 source migrations; last two I3 migrations/tables are absent. | **No changes to existing staging DB**; verify all 22 checksums and apply missing migrations **only to explicitly approved isolated branch** |
| R5 | Neon host metadata checked; deployed API's effective sealed database binding not independently established. | Resolve API→Neon binding by safe metadata/integration proof, never by printing secret values |
| R6 | Node 24/frameworks known; exact build/root/install settings, deployment method and current billing/quota not fully verified; no Git-linked EgyHealth project in discovery. | Reinspect Vercel project settings and reproducible source upload/Git mechanism; no assumptions |
| R7 | Retained Vercel deployment records are not marked rollback candidates. | Define alias restoration/deployment recovery commands with explicit target IDs before any mutation |
| R8 | PR #81 previously lacked exact-head checks; no release authorization. Preview→production promotion can rebuild under different env values. | Separate **candidate-doc**, **temporary preview**, **migration**, **stable-alias** approvals; build once under reviewed target, verify artifacts/environment |

## 3A. Narrow R1 preview preflight (not execution authorization)

1. **Freeze source**: Patient `f0d94e7e...` → Clinician combined `6fbd247a...` already includes both slices. Independently verify exact Git ancestry, current PR heads, tests and the live entry route. PR #81 documentation adds no runtime.
2. **Owner-authorized isolation**: specify an expiring, synthetic-only Neon branch (distinct from current staging DB). Record source branch, TTL/cleanup/retention and fixture provenance. **Do not touch old staging** or treat an existing staging branch as disposable.
3. **Migration gate**: inspect all 22 migration files/hashes and isolated branch state. Before any `migrate deploy`, obtain explicit approval **for migrations 21/22 on that isolated Neon branch only**; inspect outcomes and stop on mismatch. Never perform implicit migration on staging or production.
4. **Paired frontend/API**: exact reviewed frontend commit, compatible API source, deployment configuration and minimal environment mapping. Validate that preview Frontend `/api/v1` rewrite points only to preview API. Validate API `AUTH_BROWSER_ORIGIN` to the **specific temporary frontend origin**, secure cookies/session/CSRF, no cross-environment fallback. A generic wildcard origin is forbidden.
5. **Vercel settings/provenance**: re-read project team, framework, install/build/root, deployment generation method, quota/plan and protection. With no verified Git link, an explicit reproducible project deployment may be necessary; no auto-generated PR link may be assumed.
6. **Auth and synthetic workflows**: real auth/authority-preserving Live CLINICIAN against isolated synthetic records; Patient Demo/Live made clear. Do not seed real patients or capture secrets. Run negative-role, wrong-patient, redaction, signed/source visibility, explicit command-retry and state changes.
7. **Preview evidence**: one temporary review frontend URL, paired API deployment ID, branch/fixture identity (non-secret), exact source and schema fingerprints, EN/AR screenshots and scoped smoke results. No source/fixture discrepancy is allowed to pass silently.
8. **Cleanup and recovery**: expiry/removal plan for review hostname, API mapping, test accounts, and isolated Neon branch. Keep current stable domains and database untouched. If preflight fails, return `BLOCKED` and actionable blockers—not a partial interactive preview.

**R1 authorization is a separate explicit decision.** This review document does not grant permission to deploy, allocate a new database branch, migrate it, seed fixtures or mutate authentication origins.

## 4. R2 stable-link release readiness checklist

1. **Integration**: separately authorize merge of PR #79, followed by rebased/integrated PR #80, or create a reviewed, exact-SHA release candidate with equivalent dependency order. Do not let a stacked PR merge unexpectedly or trigger auto-merge.
2. **Backend/API compatibility**: verify actual Live consultation routes, auth/session/CSRF, booking/documentation/follow-up/close contracts, source audience boundaries and no unauthorized service calls. Unavailable People in your care must remain unavailable until supported.
3. **Database migration parity**: independent audit confirmed **20/22 migrations on inspected staging DB**, with I3 prescription/pharmacy migrations absent and related tables absent. Verify that the API's effective database binding maps to this staging DB; if so, create an authorized, explicit staging migration rollout plan and rollback/forward-recovery approach before any migration. **Do not run migrations now.** An isolated preview branch reaching 22/22 does not automatically update or prove current staging parity.
4. **Exact environment and origin**: verify frontend same-origin `/api/v1` proxy route, exact API target, API `AUTH_BROWSER_ORIGIN`, cookie/CSRF policy and the deployed API's sealed Neon database binding **without exposing secrets**. Preserve current stable origins while Preview uses strictly bound isolated origins.
5. **Live smoke on isolated staging**: login → directory/availability → booking → explicit open → clinical documentation → independent release → independent follow-up → review & close → CLOSED/CONSULTED; verify EN/AR and role/authority boundaries. Include wrong-patient access, redaction, operation-key/uncertain command and audit tests as required by accepted contracts.
6. **Deploy exact build**: build/release from one frozen, independently reviewed commit and environment; inspect readiness, logs and post-deploy source fingerprints. A Preview promoted to production may **rebuild with different environment values**, so verify the target artifact/environment rather than treating it as identical. No stable alias mutation or production-target promotion without explicit PO authorization.
7. **Post-release**: verify stable URL, direct/proxied health, authentication origin, authorization/privacy, Browser→Next→API→Postgres round trip (staging only), actual deployed source manifest, current DB migration version and failure recovery target. **Do not promise a generic Vercel rollback**, because the retained deployments were not verified as rollback candidates.
8. **Stop-the-line**: any broken auth, wrong-patient privacy, data-source mismatch, migration drift, accidental lab exposure, false clinical state or API outage blocks release. Roll back the alias/build, not the clinical database, if a site deployment is faulty.

## 5. Next bounded task: **R1 paired-preview readiness, no provisioning**

Prepare a single **READY / BLOCKED** preflight from fresh metadata:
- Frozen exact Patient+Clinician source SHA and compatible backend source, preserving PR #79/#80.
- Vercel project build/root/install settings, deployment method and quota/billing limits; do not presume Git auto previews.
- Requested temporary review hostname and matching API `AUTH_BROWSER_ORIGIN`, rewrite and cookie/CSRF design.
- Exact Neon isolated-branch provision plan with synthetic fixture lineage, TTL and safe cleanup; explicit request for migration 21/22 approval **only for that new branch**.
- Current deployed API sealed database-binding parity: verify safely without dumping any secret values.
- List of all existing active aliases and a concrete restoration plan if an authorized future alias change fails.
- Account/action privacy and release/close smoke matrix for **actual authenticated Live Clinician** and Patient.
- Estimated deployment method/cost only after reading current account limits, with stop conditions.
- Explicit list of the specific Product Owner authorizations needed before any provisioning, migrations or deployment.

**Do not execute**: database branch provisioning, migration, seeding, authentication configuration changes, frontend/API deployment, alias changes, merge, rebase or production promotion in this preflight. If a safe paired-preview cannot be established with supported tooling, report the blocker and alternatives without inventing success.

## 6. Release decision request

After the separate preview artifact/URL is inspected, request an explicit choice:
- **Approve updating the current staging alias to exact reviewed commit `<sha>`**, or
- **Keep the current stable URL and use only a temporary preview**.

Do not promise a release date until blockers and exact environment are verified. **Current disposition: R1 BLOCKED, R2 BLOCKED**; next acceptable output is a verified isolated-preview design and explicit authorization request, not a live URL claim.
