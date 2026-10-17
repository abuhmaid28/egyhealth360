# EH-015 Validation Evidence

## 1. Environment & Baseline Verification
- **Host OS:** Windows
- **Node.js Engines Target:** `v24.21.0` (matching `package.json` engines requirement)
- **pnpm Version:** `10.34.6` (matching `packageManager` specification)
- **Approved Baseline Commit:** `40f3a0ecd64e0d9fe2389c9bd3efea4acaa63591` on `origin/main`
- **Implementation Branch:** `feature/EH-015-m2-observed-clinical-applicability`
- **Working Tree:** Scoped implementation files only; zero untracked project files outside approved EH-015 scope.

---

## 2. Historical & Additive Migration Verification

All eight migrations in `packages/db/prisma/migrations` were verified with exact SHA-256 checksums:

| Migration Name | Milestone | Status | SHA-256 Hash |
|---|---|---|---|
| `20261012200810_eh005_identity_core_foundation` | EH-005 | Frozen | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| `20261013014000_eh006_auth_sessions` | EH-006 | Frozen | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| `20261013235221_eh009_clinical_definition_foundation` | EH-009 | Frozen | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| `20261016000000_eh010_care_plan_lifecycle` | EH-010 | Frozen | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |
| `20261017000000_eh011_bp_provenance` | EH-011 | Frozen | `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21` |
| `20261018000000_eh012_followup_encounters` | EH-012 | Frozen | `7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01` |
| `20261019000000_eh013_record_coverage_windows` | EH-013 | Frozen | `f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b` |
| `20261020000000_eh015_observed_clinical_applicability` | EH-015 | Additive | `4e2d01269e51649de029f79a7687f420659a32f81ccd9c03d0a709235c44304f` |

---

## 3. Actual Executed Test Results

### 3.1 EH-015 Unit & Boundary Test Suites
Executed command:
```powershell
node --test tests/observed-applicability.test.mjs tests/observed-applicability-boundary.test.mjs
```
Output:
```
✔ EH-015 architectural boundary: @egyhealth/db does not export internal writer or raw reader
✔ EH-015 architectural boundary: apps/api does not import internal applicability writer or raw reader
✔ EH-015 architectural boundary: zero public HTTP routes and OpenAPI hash unchanged
✔ EH-015 schema boundary: no CareAction, ClosureAssessment, or extraneous models
✔ EH-015 age truth table: valid combinations pass
✔ EH-015 age truth table: invalid combinations and coercions rejected
✔ EH-015 pregnancy and conditions: explicit null, unknown, positive, negative
✔ EH-015 source and reference validation: strict 1..128 bounded ASCII
✔ EH-015 snapshot input validator: rejects extra keys, missing keys, and invalid chronology
✔ EH-015 retraction input validator: rejects invalid reason, targets, or missing fields
✔ EH-015 pure tuple comparison: NO_NON_RETRACTED_ROWS, IDENTICAL_TUPLES, DIFFERING_TUPLES
✔ EH-015 fixed manifest fixture loads and validates
✔ EH-015 research noninterference & missingness: null is never coerced to ABSENT or UNKNOWN
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ duration_ms 252.4661
```
Result: **PASS (13/13 passed)**

### 3.2 Prisma Schema Validation
Executed command:
```powershell
pnpm --config.engine-strict=false --filter @egyhealth/db validate
```
Output:
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
The schema at prisma\schema.prisma is valid 🚀
```
Result: **PASS**

### 3.3 TypeScript Workspace Build
Executed command:
```powershell
pnpm --config.engine-strict=false -r build
```
Output:
```
Scope: 9 of 10 workspace projects
packages/clinical-rules build: Done
packages/closure-engine build: Done
packages/config build: Done
packages/fhir-adapter build: Done
packages/ui build: Done
apps/web build: Done
packages/db build: Done
apps/api build: Done
apps/experiment-worker build: Done
```
Result: **PASS (0 build or TypeScript compilation errors)**

### 3.4 ESLint Validation
Executed command:
```powershell
pnpm --config.engine-strict=false exec eslint .
```
Result: **PASS (0 errors, 0 warnings)**

### 3.5 Typecheck Across All Workspace Packages
Executed command:
```powershell
pnpm --config.engine-strict=false -r typecheck
```
Result: **PASS (all 9 workspace projects passed)**

### 3.6 Dependency Audit
Executed command:
```powershell
pnpm --config.engine-strict=false audit --prod --audit-level high
pnpm --config.engine-strict=false audit --audit-level high
```
Output:
```
No known vulnerabilities found
No known vulnerabilities found
```
Result: **PASS**

---

## 4. Contractual & Invariance Verifications
1. **OpenAPI Invariance:**
   `docs/openapi.json` SHA-256 hash verified as `37a52027d416859f0c676fce86e8d7b347eae16a5d11398748e5ab17cdfcd83d`.
2. **Architectural Boundary:**
   `@egyhealth/db` exports only `createObservedApplicabilityPersistence`, `ObservedApplicabilityError`, and read-only type declarations. Private writers (`internalInsertObservedApplicabilitySnapshot`, `internalRetractObservedApplicabilitySnapshot`) and unauthenticated readers (`internalGetObservedApplicabilitySnapshots`) remain unexported from package root.
3. **No Forbidden Models:**
   Prisma schema contains zero CareAction, CareActionOccurrence, ClosureAssessment, or extraneous models.
