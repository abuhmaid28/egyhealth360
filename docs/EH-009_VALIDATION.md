# EH-009 implementation validation evidence

Issue #16, approved by comment 6157539102. Implementation branch:
`feature/EH-009-m2-clinical-rule-versioning`. Approved M1 baseline:
`a4b2f2a4a496daba32aead5b612cb105e8873d27` (M1 COMPLETE, with final
exit-gate evidence on Issue #14). This document records EH-009 validation only;
earlier milestone validation documents remain historical.

## Contract and scope

The only durable clinical aggregate is immutable WHO-HTN-2021 source, template
CPT-HTN-FU-001 / 1.0.0-draft, and rule CR-HTN-FU-001 / 1.0.0-draft with action
HTN_BP_FOLLOWUP. The structured machine definition and Section 3.6 /
Recommendation 6 and Section 3.7 / Recommendation 7 references are reproduced
in EH-009_CLINICAL_DEFINITION_CONTRACT.md and compared against an independently
committed test fixture. The version's `-draft` suffix is identity, not database
lifecycle. The Egyptian 2014 material is corroboration only.

PostgreSQL compares the full approved JSONB value and requires the exact source,
template, rule, action and sole rule membership at publication. The TypeScript
validator rejects missing/extra/wrong-type properties at every depth, unknown
schema versions and any changed value, returning the frozen approved value. Neither
layer accepts arbitrary expressions, JavaScript or inferred defaults. Direct
ordinary SQL and Prisma attempts to publish syntactically valid alternative
versions/content fail. No CR-HTN-FU-002, free-form interpretation column,
patient CarePlan/CareAction/BP/evidence/appointment/encounter/coverage models,
EACCE evaluator, product endpoint or authorization change is introduced.

## Local checks (2026-10-14)

Pinned Node 24.21.0 and pnpm 10.34.6 were used. `pnpm install
--frozen-lockfile`, `pnpm generate`, `pnpm --filter @egyhealth/db validate`,
`pnpm build`, `pnpm typecheck`, and `pnpm lint` passed. The lockfile changes only
the `packages/db` importer link to internal `@egyhealth/clinical-rules`; no
external package/version resolution changed. Both `pnpm audit --prod
--audit-level high` and `pnpm audit --audit-level high` returned no known
vulnerabilities.

`node --test tests/*.test.mjs`: 17/17 pass. `pnpm test:integration`: 97/97 pass,
covering EH-005 persistence/catalog/history/audit, EH-006 authentication/session/
cookie/CSRF/concurrency, EH-007 authorization/IDOR/path/HEAD/current-state,
EH-008 demo seed/conflict/idempotency/verifier, health, worker and EH-009.
The focused EH-009 integration file independently passed 38/38. Its cases plus
three clinical unit cases give 41 focused clinical cases. Checks include exact
source metadata/sections/JSON; malformed/unknown/missing/extra/changed values;
direct SQL/Prisma publication bypass attempts; all allowed and forbidden lifecycle
transitions; source, published and retired immutability; FK/version/uniqueness;
DELETE/TRUNCATE prohibition; concurrent bootstrap; publish/edit and
publish/retire races under READ COMMITTED, REPEATABLE READ and SERIALIZABLE;
stale snapshots; bounded lock timeout; rollback on late insert/audit failure;
and conflicting, partially compatible and identical-repeat bootstrap states.
The independent second pass found a TEMP-table shadowing bypass in the initial
publication guard. Explicitly qualified catalog object references and fixed
trusted function search paths closed it; two new ordinary-SQL regression cases
prove fake temporary rules cannot publish a real empty aggregate and fake
temporary source/parent rows cannot redirect the rule guard.

`scripts/verify-migrations.mjs` passed on an empty disposable database. It
deployed all three migrations, checked ledger checksums, repeated deploy/status
without change, and retained the EH-005 to EH-006 upgrade proof. It upgraded a
seeded M1 database with real HTTP-generated sessions/audits to EH-009, checked
byte-for-byte M1 table/ledger preservation and repeated M1 HTTP verification.
On a separate disposable database, literal `pnpm demo:seed` created five users,
four profiles and one relationship; `pnpm m1:verify` passed actual HTTP isolation
and logout; a second `pnpm demo:seed` created zero rows.

Historical SQL SHA-256 values remain:

- EH-005: `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a`
- EH-006: `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b`
- EH-009 `20261013235221_eh009_clinical_definition_foundation/migration.sql`:
  `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a`

An explicit `pnpm clinical:bootstrap` first run created one source, template
and rule, with one publication. The repeat reported zero created and zero
published. Integration snapshot comparison proves unchanged rows/UUIDs/
timestamps and no duplicate audit. Conflicting DRAFT/PUBLISHED/RETIRED,
pre-existing drift and malformed JSON fail closed; late failures roll back.
Publication and retirement via the narrow persistence boundary append only
`CLINICAL_TEMPLATE_PUBLISHED` and `CLINICAL_TEMPLATE_RETIRED`, with null actor,
template UUID and empty metadata, in the same transaction. The database
enforces clinical/lifecycle state; audit emission is through that boundary.

## Docker and remote review

Docker Compose configuration validated, all images built with the pinned Node
and pnpm versions, and PostgreSQL/API/web/worker all reached healthy state in a
disposable local project. Running-container auth and authorization unit tests,
concurrent authentication measurement, actual API login/me/CSRF/logout/health,
ownership/assignment/ADMIN/HEAD/no-store/ended-relationship checks and M1
seed/HTTP isolation/logout/repeat probe passed. The running-container clinical
probe inspected the exact approved catalog and proved a zero-write repeat.
Host web and API health returned success. The container workflow used the same
commands as CI; the database was isolated from pre-existing local volumes.

The final read-only independent clinical/schema/immutability review passed with
no remaining actionable findings after the TEMP-shadow fix. The reviewer
independently reran 41/41 focused clinical tests and verified the final migration
hash/pin, old migration hashes, scope and source fidelity. Final-head remote CI
results are recorded in the PR handoff after completion.

## Limits

EH-009 stores declarations only. Final SCHEDULED validity, manual exemption
workflow, record-coverage sufficiency, clinical date arithmetic, normalization,
FHIR sets, BP plausibility/averaging, encounter association, retriggering and
patient evaluation/action generation remain deferred. The ordinary-write
database guard does not claim protection against PostgreSQL schema owners or
superusers. M2, FR-021 care-action generation and EACCE are not complete.

## Post-merge annotation

PR #17 merged as `ccc967b4d1125c69b2db8725351dca0f50783acf`; Issue #16 closed.
Final independent review PASS on `69f6a1e1af7c73b055f1f02ad204fe5706d04df7`.
[Final-head CI 38588723326](https://github.com/abuhmaid28/egyhealth360/actions/runs/38588723326)
completed successfully. EH-009 completes M2 step 1 only; EH-010 is the next slice.
These are historical EH-009 results, not a rerun of this validation document.
