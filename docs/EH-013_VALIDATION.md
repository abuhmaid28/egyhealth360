# EH-013 Validation Evidence

## 1. Environment & Baseline Verification
- **Host OS:** Windows 11
- **Node.js Version:** `v24.21.0` (matching `package.json` engines requirement)
- **pnpm Version:** `10.34.6` (matching `packageManager` specification)
- **Approved Baseline Commit:** `5c8cbe3fbe6e4709fb6975d6c50f1bec68e2ae9e`
- **Implementation Branch:** `feature/EH-013-m2-coverage-normalized-evidence`
- **Working Tree:** Clean; zero untracked project files outside scoped implementation.

---

## 2. Historical & Additive Migration Verification

All seven migrations in `packages/db/prisma/migrations` were verified with exact SHA-256 checksums:

| Migration Name | Milestone | Status | SHA-256 Hash |
|---|---|---|---|
| `20261012200810_eh005_identity_core_foundation` | EH-005 | Frozen | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| `20261013014000_eh006_auth_sessions` | EH-006 | Frozen | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| `20261013235221_eh009_clinical_definition_foundation` | EH-009 | Frozen | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| `20261016000000_eh010_care_plan_lifecycle` | EH-010 | Frozen | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |
| `20261017000000_eh011_bp_provenance` | EH-011 | Frozen | `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21` |
| `20261018000000_eh012_followup_encounters` | EH-012 | Frozen | `7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01` |
| `20261019000000_eh013_record_coverage_windows` | EH-013 | Additive | `f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b` |

---

## 3. Actual Executed Test Results

### 3.1 Unit Test Suite (`node --test tests/*.test.mjs`)
Executed command:
```powershell
node --test tests/*.test.mjs
```
Output:
```
✔ public health sanitizes database failures and matches OpenAPI (276.4957ms)
✔ pinned runtime Argon2id matches independent RFC 9106 known-answer vector (6.5764ms)
✔ strict 109-byte application codec round trips and verifies unmodified UTF-8 passwords (662.4492ms)
✔ dummy verifier rejects unsupported/nonexistent credentials without substituting an account (914.5814ms)
✔ auth mode/origin configuration fails closed and describes the browser origin (0.8246ms)
✔ cookie credentials are canonical, duplicated values rejected; cookie flags and clearing exact (2.0676ms)
✔ patient UUID v4 parser rejects alternate spellings and normalizes hex case (1.2882ms)
✔ policy explicitly permits only consistent scoped evidence for the read action (1.0894ms)
✔ BP parser accepts only exact flat keys and lossless integer tokens (4.6119ms)
✔ BP timestamp validates calendar, timezone, supported years and precision without repair (0.9546ms)
✔ BP pagination is bounded, canonical and rejects duplicate/unknown/encoded query authority (0.8396ms)
✔ BP OpenAPI projection, schema scope and historical migration bytes remain approved (17.3542ms)
✔ engine import is deterministic and framework-independent (13.203ms)
✔ configuration rejects unsafe polling values (0.9611ms)
✔ deferred projection is exact, immutable, deterministic and accepts only the approved definition (5.7324ms)
✔ EH-010 schema and API contain no action/evidence/completion or product route expansion (8.2228ms)
✔ approved clinical manifest equals the reviewed fixture; source/version/section identities remain exact (5.4931ms)
✔ strict validator rejects missing/extra properties at every depth, wrong types and unknown schemas (28.07ms)
✔ representation declares only the approved rule and deferred behaviors without evaluator/code execution (5.6793ms)
✔ EH-013 sourceReference validation enforces strict 1..128 bounded ASCII grammar (2.5395ms)
✔ EH-013 coverage input validation rejects invalid chronology, status, and extra fields (1.4251ms)
✔ EH-013 normalized evidence query input rejects extra keys, invalid dates, and inverted intervals (0.9767ms)
✔ EH-013 normalization: absence of raw windows yields 100% unasserted coverage (silent missingness) (1.3053ms)
✔ EH-013 normalization: precedence INCOMPLETE > UNKNOWN > COMPLETE within exact partition (1.4845ms)
✔ EH-013 normalization: contiguous windows with gaps produce alternating effective and unasserted segments (0.3967ms)
✔ EH-013 normalization: boundary clipping ignores coverage facts outside queryInterval (0.2424ms)
✔ EH-013 architectural boundary: @egyhealth/db does not export internal unauthenticated writer or raw reader (0.2041ms)
✔ EH-013 architectural boundary: apps/api does not import internal coverage writer or raw reader (8.4194ms)
✔ EH-013 research integrity and candidate factual contracts (0.5252ms)
✔ EH-013 schema scope, frozen migrations, and additive migration verification (5.2605ms)
✔ demo credential/execution/topology guard has no fallback and preserves password bytes (2.3197ms)
✔ verification URL rejects remote/redirect-target-like configuration (1.0296ms)
✔ fixed manifest and safe failures never expose arbitrary exception data (0.5924ms)
✔ EH-012 exact flat parser rejects shapes, identity authority and escaped duplicate keys (3.6674ms)
✔ EH-012 timestamp grammar preserves strict EH-011 date/offset/millisecond semantics (1.127ms)
✔ EH-012 exact schema, corrected route, minimized projections and frozen history (12.0992ms)
✔ bounded email canonicalization preserves provider distinctions (1.8854ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2146.4186
```
Result: **PASS (37/37 passed, 0 failed)**

### 3.2 Prisma Schema Validation
Executed command:
```powershell
pnpm --filter @egyhealth/db validate
```
Output:
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
The schema at prisma\schema.prisma is valid 🚀
```
Result: **PASS**

### 3.3 Static Analysis (ESLint)
Executed command:
```powershell
pnpm lint
```
Output:
```
> egyhealth360@ lint
> eslint .
```
Result: **PASS (0 errors, 0 warnings)**

### 3.4 Build & TypeScript Typecheck
Executed command:
```powershell
pnpm build
pnpm typecheck
```
Output:
```
Scope: 9 of 10 workspace projects
packages/clinical-rules build: Done
packages/config build: Done
packages/closure-engine build: Done
packages/fhir-adapter build: Done
packages/ui build: Done
apps/web build: Done
packages/db build: Done
apps/experiment-worker build: Done
apps/api build: Done
```
Result: **PASS (All projects built and typechecked cleanly)**

### 3.5 Dependency Audit
Executed commands:
```powershell
pnpm audit --prod --audit-level high
pnpm audit --audit-level high
```
Output:
```
No known vulnerabilities found
No known vulnerabilities found
```
Result: **PASS**

---

## 4. Scope & Architecture Conformance Verification

- **No DataSource table:** Confirmed; zero `data_sources` table created.
- **No `PRIMARY_CLINICAL_SYSTEM`:** Confirmed; enum contains only `SYNTHETIC_BENCHMARK`.
- **Required `sourceReference`:** Confirmed; validated via regex `^[A-Za-z0-9_.-]{1,128}$` and database CHECK constraint.
- **No `recordedByUserId`:** Confirmed; `RecordCoverageWindow` contains no human actor FK.
- **No fake application audit:** Confirmed; `RECORD_COVERAGE_WINDOW_CREATED` is not logged.
- **Exact duplicate assertion handling:** Confirmed; `ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING` returns existing row with `created: false`.
- **Partition isolation:** Confirmed; differing `sourceReference` values are never merged or collapsed together.
- **Precedence:** Confirmed; `INCOMPLETE > UNKNOWN > COMPLETE` enforced strictly within partition.
- **Silent missingness:** Confirmed; absent metadata produces factual `unassertedSegments` without synthesizing fake `UNKNOWN` windows.
- **Single-statement snapshot:** Confirmed; CTE query fetches all 5 evidence streams in one statement snapshot.
- **Encounter-anchored candidates:** Confirmed; `StructuralEncounterBpCandidate` included when encounter is in interval, exposing paired BP factually without completion booleans.
- **Operational appointments:** Confirmed; `OperationalAppointmentCandidate` includes `SCHEDULED` appointments and excludes cancelled ones.
- **Authorized persistence boundary:** Confirmed; `createNormalizedEvidencePersistence` enforces strict `AuthPrincipal` checks (Patient own-data allowed, assigned Clinician allowed, unassigned Clinician denied, Admin denied).
- **Internal reader/writer isolation:** Confirmed; `@egyhealth/db` exports only authorized wrapper and types; `apps/api` contains zero unauthenticated imports.
- **Zero HTTP routes:** Confirmed; `docs/openapi.json` left byte-for-byte unchanged.
- **Milestone status:** Milestone M2 remains **IN PROGRESS**. CareAction generation and EACCE classification remain deferred.
