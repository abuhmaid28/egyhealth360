# Real staging preflight — sanitized evidence

Observed: 4 November 2026. Runtime candidate: `6fbd247a09d774fa42d9712068699753a88e10e6`. [Decision report](../REAL_STAGING_UI_PREFLIGHT.md). No credentials, sessions or clinical payloads are included.

## Deployed source identities

Vercel file IDs are compared with raw candidate SHA-1 values. Complete small returned files independently matched their IDs; large content responses were truncated and are not presented as full decoded-file hashes.

| Path | Deployment file ID | Candidate raw SHA-1 | Content truncated |
| --- | --- | --- | --- |
| `apps/web/src/components/application.tsx` | `d96ba53ee25bcce5b2a4666389432f50bfe62471` | `ae0ff6c28e404dd939c2810a0731a46fb7e78175` | True |
| `apps/web/next.config.ts` | `d7e891171631d2f7426a112fe4932435bf9a15bd` | `d7e891171631d2f7426a112fe4932435bf9a15bd` | False |
| `apps/api/src/main.ts` | `fc026d7c823539a728b060e23e580b2e4ec56dd0` | `9060cd5f3dad28a1af8467babbb59cff58a79979` | True |
| `packages/db/prisma/schema.prisma` | `7bb54b5bee7d124a928013b7dcb904c15f51d0ff` | `dcf88eaeba5ec93e26fc77212618f86ac227d142` | True |
| `apps/api/vercel.json` | `0c54f801766331ec199f93222054e6df9ccaf4e2` | `0c54f801766331ec199f93222054e6df9ccaf4e2` | False |

## Inspected migration ledger

Neon `spring-star-16308392` / `br-bold-resonance-ar7tw4rg` / `egyhealth360_staging`, PostgreSQL 18.6. Read-only SELECT; 20 completed entries, no rolled-back entries. All checksums matched the pinned source.

| Migration | SHA-256 |
| --- | --- |
| `20261012200810_eh005_identity_core_foundation` | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| `20261013014000_eh006_auth_sessions` | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| `20261013235221_eh009_clinical_definition_foundation` | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| `20261016000000_eh010_care_plan_lifecycle` | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |
| `20261017000000_eh011_bp_provenance` | `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21` |
| `20261018000000_eh012_followup_encounters` | `7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01` |
| `20261019000000_eh013_record_coverage_windows` | `f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b` |
| `20261020000000_eh015_observed_clinical_applicability` | `49b5afca8d394e7f501a111409eb39dcba65166f8ef22f39a954028de8f9ea69` |
| `20261021000000_bp_correction_invalidation` | `00fb72bcd773f1927e520cfe9db37ade2f78f546ab8ea330a66c633f1b6fc91f` |
| `20261022000000_eh014_initial_care_action` | `244207da379c6db2a8132d2aabe8a138d5f9183054b519f58676848c9f80e228` |
| `20261023000000_v3_i1_staff_roles` | `fe77189c4dddbf4dbc2f1ef7faf958103b1202de57c0bac47d30cb48dba48a3b` |
| `20261023000100_v3_i1_organizations` | `f6a14d2fa1bbaabb0b1b6e4a0ce8215820a2b6b4da23cee62d5a67d28a235b31` |
| `20261024000000_v3_i1_directory` | `2175f8d202f1e774ba3465a5afda1652ceccf4e3ef98150eb54ab8dd0ed8f104` |
| `20261025190000_v3_i1_relationships` | `44a6848ac658afeec01b6ea1005d226589b9b96967f11fcc62623089ac9e729d` |
| `20261027210000_v3_i2_availability` | `973eb49890e444434d94013c234c19399eabaf5e814c289fec74244f43c43c0f` |
| `20261028090000_v3_i2_bookings` | `e9ed5902893077701c4b81fcde955c358002757c48ef6f44157b7fe18dabdced` |
| `20261029090000_v3_i2_consultation_opening` | `0bba25fc11730f383b152da4e3a9e0076d682484515c67f109d153823e58d241` |
| `20261030090000_v3_i2_consultation_documentation` | `94629df2d3daaecf75247c158a0c73f7948ed28e5f1b440e84e811f4b03737ef` |
| `20261030120000_v3_i2_follow_up_intent` | `5b71c23dadf91f2585276ff9ac7ccd8de5b986d8e02e1f616787bbb25df40407` |
| `20261031140000_v3_i2_consultation_close` | `d138d5ad27be0185db086c68153a72069cd487c1ad72fa233c50c13eae2e84f6` |

The two absent migrations and exact hashes are in the decision report. `prescriptions` and `pharmacy_routes` are absent (read-only `to_regclass` queries). The initial lookup of database `neondb` returned 404; the documented database above was then inspected.

## Observed boundaries

- Frontend 200; direct and proxied health 200 (`data.status=ok`); unauthenticated auth/me 401.
- Login with unapproved Origin and login with missing required login header each returned 403 AUTH_CSRF_INVALID and no-store. No credentials or valid login were supplied.
- Stable alias/deployment IDs and non-secret environment mapping are in the decision report. DATABASE_URL remained sealed.
- Existing deployments had no Git SHA; new design component files were absent from the frontend tree.
- Repo-filtered Vercel project discovery returned zero projects; this does not establish a universal absence of integrations. No deployment was triggered.

## Fresh validation of the frozen runtime source

Pinned Node 24.21.0 / pnpm 10.34.6: frozen-lockfile install, production web build, web TypeScript check, frontend/support ESLint, 162/162 UI tests, complete existing browser regression all passed. Browser installation was initially missing; installing the pinned Playwright Chromium resolved that environment prerequisite. No application changes were needed. These checks ran at #80 before preparing the documentation-only review branch from main.

Exact-head remote CI was independently read: Patient 41560670558 and combined 41645588316 SUCCESS; all eight combined jobs SUCCESS at the exact frozen SHA. PostgreSQL/browser persistence evidence is separate from controlled presentation states. No hosted authenticated mutation journey ran in this task.

## Inspection limits

- File content MCP responses truncate large base64 payloads at 2000 characters; full deployed source was not downloaded. File IDs and decoded prefixes establish mismatch, not an exact deployed Git commit.
- API effective DATABASE_URL is sealed; project metadata is not proof of the deployed binding.
- No hosted authenticated browser writes performed.
- Rollback-candidate listing denied HTTP 403; Vercel CLI unavailable.
- Current quota/billing and complete project settings not exposed by inspected responses.
