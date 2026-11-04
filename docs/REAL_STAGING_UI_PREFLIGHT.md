# Real pre-final staging UI refresh — decision report

Status: **PREFLIGHT COMPLETE / R1 AND R2 BLOCKED FOR EXECUTION**. Read-only infrastructure observations on 4 November 2026. This report does not establish hosted end-to-end success or authorize a release.

## Owner scope and decision

The current Product Owner brief, “EgyHealth 360 — REAL Pre-Final Staging UI Upgrade”, authorizes inspection and necessary visual integration on a separate review branch. It identifies PR #79 and #80 as the approved visual sources, explicitly excludes PR #82, and requires precise further approval for infrastructure and release actions. This supersedes older task-status wording only within that scope. Clinical/security contracts remain binding.

**Recommendation: reuse the actual `apps/web` at PR #80's exact head with its unchanged compatible NestJS/database source. No additional visual integration code is necessary on the evidence inspected.** First verify that source in an isolated, genuinely authenticated full-stack preview; then request a separate stable staging release decision. Preserve unsupported portal capabilities and the protected final domain.

The [PR #81 R1/R2 readiness plan](https://github.com/abuhmaid28/egyhealth360/blob/3c819b0c837deb17b4c10d96634a3a999d548b7c/docs/ui-reference/PRE_FINAL_LINK_REFRESH_PLAN.md) is the controlling release checklist. Its Design System candidate is documentation, not a runtime dependency or approval to redesign more screens.

## 1. Implemented in the real application

- Database-backed authentication/session, exact Origin/CSRF/Fetch Metadata checks, public directory, finite availability, patient booking and clinician scheduling.
- Explicit consultation opening and current-authority recheck; actual private documentation and summary persistence; separate private-note signing and patient-summary sign/release; independent FollowUpIntent draft/release and acknowledged Review & Close.
- PR #79 selects `PatientMyCare` on the existing authenticated Patient `/patient` route. Its Live readers use own profile/bookings, released summaries and released follow-up sources; Live failures do not fall back to Demo records.
- PR #80 selects `ClinicianConsultation` on `/doctor/consultation/:bookingId/documentation` for an authenticated **Live CLINICIAN**, wrapping the existing Live documentation workspace and services. Presentation flags preserve command handlers, authority, retries, signing/release/close independence and default rendering elsewhere.
- EN/AR, RTL, approved Egyptian Arabic copy, local Manrope/IBM Plex Sans Arabic assets and responsive rules are already present for these bounded slices. Wider content/IA adoption is incomplete. The clinician People in your care destination remains visibly unavailable; it is not a new feature.
- Prescription/pharmacy backend exists on main, but its full frontend integration is not delivered. Pharmacy/Laboratory shells retain their existing Demo/unsupported boundaries. No active Lab/Results/AI/prescribing UI is introduced by this refresh.

These are source/CI findings. Prior hosted I2 evidence is in [the staging runbook](PRE_FINAL_LIVE_STAGING.md); a fresh authenticated hosted journey has not been performed in this task.

## 2. Frozen source and compatibility

| Source | Exact commit | Fresh observation |
| --- | --- | --- |
| main | `0a0e9c2038ecad420e95c2c67ae367129e195839` | Ancestor of combined candidate; current main CI SUCCESS |
| Patient PR #79 | `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0` | OPEN, unmerged, auto-merge off; ancestor of #80 |
| Combined Patient + Clinician PR #80 | `6fbd247a09d774fa42d9712068699753a88e10e6` | OPEN, unmerged, auto-merge off; recommended runtime source |
| Readiness PR #81 | `3c819b0c837deb17b4c10d96634a3a999d548b7c` | OPEN, documentation-only delta above #80; no exact-head workflow run returned |
| Excluded PR #82 | `76f9a6cc9c6db15674b9feabb5ce2398000e3ea7` | Not fetched, merged, cherry-picked or used as a runtime source |

Git ancestry was checked locally and against GitHub: the combined source is 21 commits ahead of main, zero behind. Compared with main, **20 `apps/web` source/font paths change; zero changes to `apps/api`, `packages/db`, `packages/config`, OpenAPI, lockfile or CI workflow**. Existing Live transport/service code is unchanged. This establishes repository API compatibility, not parity with the deployed API.

No new runtime patch, migration, shared-design-system extraction or portal rewrite is proposed. The separate review branch contains this decision/evidence package only; it does not import the design history into main or merge either design PR. A future release can deploy the pinned #80 source directly after approval, or follow the separately approved #79 then #80 merge order. Recheck heads and CI if either changes.

## 3. Fresh infrastructure findings

Vercel team: `team_auKJxb8WoqzE3RhVlI7Me0eq`.

| Resource | Confirmed state |
| --- | --- |
| Frontend project | `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q`, Next.js, Node 24.x |
| Stable frontend alias | `egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app` → `dpl_E8HY54CoDEHwXDgeJHcjqvkAbmSK` |
| Frontend deployment URL | `egyhealth360-pre-final-staging-o6fyo1so1.vercel.app`, READY, target `staging` |
| API project | `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF`, NestJS, Node 24.x |
| Stable API alias | `egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app` → `dpl_55m4NTg5QiGMV1TBPpmPet35HUxA` |
| API deployment URL | `egyhealth360-pre-final-egohcpbm5-abuhmaid2810gmailcoms-projects.vercel.app`, READY, target `staging` |
| Inspected database | Neon project `spring-star-16308392`, branch `br-bold-resonance-ar7tw4rg` (`main`), database `egyhealth360_staging`, PostgreSQL 18.6 |

**Source mismatch confirmed.** Deployment metadata still supplies neither Git SHA nor Git source. The frontend file tree lacks both new design components/CSS. Deployed `application.tsx`, API `main.ts` and Prisma schema file identities differ from #80. Decoded returned prefixes of application/main also differ. Small complete files establish that deployed `next.config.ts` and API `vercel.json` match the candidate byte-for-byte. Large file-content responses truncate base64 at 2,000 characters: full deployed-file hashes or an exact deployed commit are not claimed. File IDs and candidate hashes are in [the sanitized evidence](real-staging-preflight/evidence.md).

**Database remains 20/22.** All 20 ledger entries are completed, none rolled back, and all 20 SHA-256 checksums match candidate migration SQL. Missing:

| Migration | SHA-256 |
| --- | --- |
| `20261101150000_v3_i3_prescription_source` | `04ab2e4869c7290df7e8f2cd86358bc0847767e096d66df0ee122c18a1cdd087` |
| `20261101170000_v3_i3_pharmacy_fulfillment` | `d1482ce8ac43bb9eb6d86397ce22ca2f015c874d04eeb96eacd9aa5a731eca37` |

`prescriptions` and `pharmacy_routes` are absent. The visuals themselves require no migration; the repository API includes I3 routes whose storage requires those existing migrations. Do not release that API against a 20-migration database as though all current features were compatible.

**Origin isolation is required.** Frontend Preview `EH_UI_API_ORIGIN` points to the existing stable API. API Preview `AUTH_BROWSER_ORIGIN` is exactly the stable frontend HTTPS origin, without a trailing slash. A random preview frontend therefore cannot safely reuse that API. Preserve same-origin `/api/v1` rewrites, production `__Host-eh_session` cookies (Secure/HttpOnly/Path=/, SameSite=Lax), Origin/Fetch Metadata and CSRF. No wildcard or permissive CORS bridge is proposed. `EH_STAGING_SEED_ENABLED=0` is confirmed; builds do not migrate.

**API database identity remains unresolved.** Non-secret project/host metadata matches the documented Neon deployment, but `DATABASE_URL` is sensitive/sealed. It was not decrypted. Health proves reachability/database availability, not which database was used or schema parity. No public diagnostic endpoint or credential disclosure is proposed; establish effective binding through an authorized deployment with an explicit private binding and metadata-only validation.

**Build provenance is partially resolved.** Existing build logs confirm uploaded source files (62 frontend / 104 API), Next build in `/vercel/path0/apps/web`, pinned Node 24.21.0/pnpm 10.34.6 install and web build, Prisma generation/API dependency builds, and Nest `main.js` entrypoint selection. Complete current root/build/install settings are not returned by the inspected project tool. Repository-filtered team project discovery returns no Git-linked project; do not assume auto-preview or push-to-release behavior. Current plan/quota/cost limits remain unverified; the team response omits them. No paid plan change is proposed.

**Recovery needs verification.** Each inspected project has one active alias, mapped above. Rollback-candidate listing now returns HTTP 403 for both projects; the mapped CLI fallback is unavailable because Vercel CLI is not installed/authenticated here. This is an access limitation, not proof that no rollback candidates exist. Alias restoration to the captured deployment IDs is a proposed recovery operation, not a rehearsed capability.

## 4. Validation and limits

| Evidence | Result |
| --- | --- |
| Patient exact-head [CI 41560670558](https://github.com/abuhmaid28/egyhealth360/actions/runs/41560670558) | SUCCESS on `f0d94e7e…` |
| Combined exact-head [CI 41645588316](https://github.com/abuhmaid28/egyhealth360/actions/runs/41645588316) | SUCCESS on `6fbd247a…`, all 8 jobs; workflow_dispatch, including PostgreSQL migrations/integration, real browser/API persistence tests and Docker runtime |
| main [CI 41384993898](https://github.com/abuhmaid28/egyhealth360/actions/runs/41384993898) | SUCCESS on `0a0e9c2…`; does not validate unmerged visuals |
| Fresh local #80 validation | Pinned install, production web build, web typecheck, frontend/support lint, 162/162 UI tests and complete existing browser regression PASS |
| Current public endpoints | Frontend 200; direct and proxied health 200; unauthenticated `/auth/me` 401 |
| Current negative auth boundary | Unapproved Origin login rejected 403; stable Origin without required login header rejected 403; both no-store, no credentials or valid login supplied |
| Hosted acceptance workflow | **NOT RUN / BLOCKED** pending authorized paired infrastructure and release actions |

The browser presentation suite uses controlled responses for some Live-contract states; those checks do not prove hosted persistence. Existing exact-head CI includes separate real NestJS/PostgreSQL browser tests. Current CI/visual evidence does not replace new hosted verification, native-device/cross-browser/assistive testing or independent Arabic review. [Independent visual review at #80](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6613466373) passed the pinned premium source; release/infrastructure readiness remains blocked.

## 5. Minimal safe sequence

1. Freeze #80 source and a sanitized deployment manifest: commit, source hash inventory, roots/frameworks/toolchain/build commands, environment target, exact rewrite/auth origin, API deployment, Neon branch/database and migration hashes. Resolve settings/quota/access gaps before provisioning or upload.
2. After the separate R1 approvals below, create a temporary Neon child and paired temporary frontend/API projects, distinct from stable projects. Proposed names: `real-ui-review-20261104` for the Neon child, `egyhealth360-real-ui-review-20261104` for frontend, `egyhealth360-real-api-review-20261104` for API; record actual IDs/hostname availability before binding. Use the documented staging branch as parent only after synthetic-only provenance is confirmed. Stop rather than clone any unverified data.
3. In that approved child only, verify inherited 20 checksums; apply the two exact missing migrations using a direct TLS connection; verify all 22. Use pooled TLS for the preview API. Revoke copied sessions only in the child under explicit fixture authorization. Reuse approved synthetic identities/operational fixtures and established assignment provenance; do not fabricate clinical authority. Keep initializer off. Expire the child after 48 hours and separately authorize cleanup of review resources.
4. Bind preview API to that child and **one exact temporary frontend HTTPS origin**; frontend `/api/v1` rewrites to preview API only. Deploy original web + API from #80 with frozen provenance, no stable alias changes. If a dedicated project's first deployment is platform-labelled production, that exact temporary target needs approval; it never means the protected final project. Record effective configuration privately and export only safe identities/hash evidence.
5. Run the matrix below through the actual hosted browser, real API and isolated database. Verify persisted source versions, audit/authority and migration state independently. Capture sanitized screenshots/results in EN/AR desktop and responsive widths. Any source/authority/privacy/persistence discrepancy blocks R2.
6. Return preview evidence for separate PO approval of the exact stable release. First prove stable API→database binding and recovery. If retaining the current staging database, separately approve/apply migrations 21/22 there after isolated proof. Prepare the compatible exact-source API for the stable browser origin; then the frontend for its stable API. Test the stable-origin bundle before switching traffic where feasible and immediately after each approved switch. Maintenance/cutover timing must be explicit if the old/new API overlap cannot be proved compatible.
7. Switch only the specifically approved pre-final API/frontend aliases. Re-run the complete hosted acceptance matrix at the original staging URL and report success only after it passes. On failure restore the recorded frontend/API alias pair under the authorized recovery plan; preserve database history rather than rolling clinical records back. Leave `egyhealth360.vercel.app` untouched.

An alternative release retaining the old unidentified API and merely uploading frontend files is not recommended: it leaves the source/schema/binding risks unverified. No new application, screenshot gallery or frontend-only demonstration is part of this sequence.

## 6. Hosted acceptance matrix

| Actor / flow | Required proof |
| --- | --- |
| Patient + assigned clinician | Real login, production cookie properties, reload/session persistence, logout invalidation; no browser-stored authentication substitute |
| Patient discovery/booking | Public directory, published clinic/timezone slot, actual booking persisted and visible in clinician schedule; booking creates zero assignment authority |
| Patient My Care | New design uses actual own bookings/released sources, reload persists, details/history work, unavailable data stays unavailable |
| Clinician consultation | Explicit eligible opening; exact current treating/assignment scope; new Live shell and persisted drafts survive reload |
| Private note / summary | Private signing independent of summary sign/release; patient cannot see drafts/private notes; only explicitly released summary appears |
| Follow-up / close | Independent follow-up release, explicit acknowledgement, close creates CLOSED/CONSULTED; close does not implicitly save/sign/release other sources |
| Negative authority/privacy | Other patient, unassigned/ended clinician, ADMIN, Lab/Pharmacy role denials; wrong-patient restrictions, suppressed history/counts/replay, revocation and expiry |
| Commands/history | Canonical operation keys, no automatic mutation retry, deliberate identical retry after uncertain outcome, retained source versions and minimized audits |
| EN/AR/RTL/responsive | Desktop and mobile/reflow, actual event timezone, focus/keyboard/dialog behavior; preserve other portals and truthful unsupported states |
| Environment proof | Browser→Next rewrite→pinned API→approved database, all 22 migration hashes, sanitized deployment/source manifest; direct + proxied health |

## 7. Precise approvals still required

Each item is a separate action scope. None has been executed by this preflight.

1. **Neon R1 provisioning:** create only child `real-ui-review-20261104` in project `spring-star-16308392`, parent `br-bold-resonance-ar7tw4rg`, synthetic-only provenance prerequisite, 48-hour expiry; no existing branch mutation.
2. **R1 migrations:** apply only `20261101150000_v3_i3_prescription_source` and `20261101170000_v3_i3_pharmacy_fulfillment`, with hashes above, to that new child after recording its actual ID and inherited parity. No staging/main/production migration permission is included.
3. **R1 fixtures:** reuse the approved synthetic identities and existing assignment provenance in that child; revoke its copied sessions; allow test bookings/documentation/releases/close through ordinary authorized APIs. No direct creation of new clinician grants or real-patient data.
4. **R1 Vercel provisioning/configuration:** create only the two proposed temporary projects in the verified team; configure isolated private database credentials and the exact temporary frontend Origin/API rewrite once hostnames are confirmed. No changes to stable `AUTH_BROWSER_ORIGIN`, stable frontend routing, paid plans or protected projects.
5. **R1 deployments:** deploy original `apps/web` and `apps/api` from `6fbd247a09d774fa42d9712068699753a88e10e6` to those temporary projects only, with reviewed settings/limits. Approve temporary project aliases only; never reuse stable aliases. Explicitly approve cleanup/expiry handling for these new resources.
6. **R2 stable database:** after successful R1 and verified binding, separately approve migrations 21/22 on the exact existing staging database if that database is retained. This approval requires the final rollout/recovery plan; it is not requested as an immediate execution gate.
7. **R2 release:** separately approve the exact API/frontend builds and both specified pre-final alias changes, cutover order and restoration to the captured deployment IDs. No release is performed before that concrete build/preview evidence is reviewable.
8. **Optional merges:** only if choosing a merged-main release, separately approve #79 then the reconciled #80 (or a reviewed release PR). Direct pinned-source preview does not require these merges. No merge/auto-merge or PR #82 inclusion is proposed.

The user explicitly withheld these permissions in the current brief. Infrastructure approvals are needed because of that instruction, not an inferred design freeze. Final disposition: the two visual slices are already integrated in the real source; **the original hosted staging refresh is not complete**.
