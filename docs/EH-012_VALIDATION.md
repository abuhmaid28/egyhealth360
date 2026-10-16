# EH-012 implementation validation evidence

Issue #22; final implementation approval [6204890129](https://github.com/abuhmaid28/egyhealth360/issues/22#issuecomment-6204890129). Approved baseline `c24b7c487dc7d56624e8dd3cfa95ba92afa963a5`; implementation branch `feature/EH-012-m2-followup-encounters`.

## Baseline and scope

Before changes: authenticated git fetch succeeded; local main and origin/main matched the exact baseline; working tree including untracked files was clean; Issue #22 open; PRs #17/#19/#21 merged; M1 complete and M2 in progress. All five historical hashes recalculated and matched. No unknown work reset/stashed/discarded. Read the complete issue/comments, remote review, final approval, repository sources/contracts/schema/migrations/auth/authz/BP/CarePlan/API/tests/verifiers/CI/Docker. The final approval's association-history route correction is implemented exactly.

Implements only operational SCHEDULED/CANCELLED appointments, immutable encounters and immutable encounter-BP association, narrow authenticated HTTP, current transactional authorization/provenance/audit, one additive migration and supporting tests/docs. No external dependency, lockfile, BP row/guard or historical migration changes. Prisma requires the redundant composite association unique key for its one-to-one composite relation, in addition to the cardinality-enforcing unique BP key. No clinical source/rule change. Exact contract: EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md / ADR-026.

## Local checks (2026-10-16)

Pinned Node 24.21.0 and pnpm 10.34.6, selected in a temporary tooling prefix because the environment defaults differ. Existing proxy/CA trust preserved. Frozen install: PASS. Prisma generate/validate: PASS. Full workspace build, lint and typecheck: PASS. No dependency/lockfile change.

- Unit: **26/26 PASS**, no skipped/cancelled tests; includes 3 EH-012 unit cases.
- EH-012 focused coverage: **78 distinct cases PASS** (3 unit + 63 persistence + 12 HTTP). The target-concurrency case was strengthened to use two distinct clinician users/sessions and rerun separately as an affected-test check: **1/1 PASS**. This rerun is not claimed as independent review.
- Full integration: **247/247 PASS**, no skipped/cancelled tests; all EH-005 through EH-011 regressions included.
- Final request-parser self-review found an error-code precedence issue: duplicate keys with an invalid final value were rejected, but could return field validation before REQUEST_INVALID. Key-duplicate checking now precedes field validation; regression cases cover invalid string/null/number final values. After that narrow fix, all **26 unit + 12 affected HTTP = 38/38 PASS**, with lint/API build/typecheck PASS. The 247-case full local run above preceded this parser-only correction; final-head CI reruns the complete matrix. No database/persistence/migration change was made by the correction.
- Production and full high-severity dependency audits: PASS; no known vulnerabilities.
- Host concurrent-auth measurement: PASS.
- git diff --check: PASS; all five historical SHA-256 values unchanged.

EH-012 coverage includes exact fields/projections, timestamp/offset/calendar/precision/backdating/future rules, duplicate preservation, two-state lifecycle/terminal behavior/cancellation after schedule, first canceller retention, same-pair no-op, multiple BPs/unique encounter per BP, original patient BP provenance, cross-patient SQL/API denial, SQL/Prisma immutable history including empty/no-op statements, explicit composite FK rejection independent of the insert trigger, structural actor/mapping/assignment checks, trusted invoker functions and TEMP shadows. Four audit failure cases prove atomic rollback. Two-connection blocking tests cover every write against revocation/disable/assignment/mapping in both orders; final expiry rolls back all write types, including a same-pair no-op waiting on BP. A fixture proves operation with an empty catalog/no CarePlan. HTTP tests use genuine sessions/raw request paths and cover strict shape/duplicate keys, nested IDOR/malformed/encoded IDs, authority spoofing, Origin/Fetch Metadata/CSRF, media/charset/encoding/size/query/idempotency-key rejection, pagination, correct Allow, minimized projections, HEAD and no ETag/Last-Modified/304. Explicit assertions preserve deferred scope.

## Migration and preservation

One additive migration: `20261018000000_eh012_followup_encounters/migration.sql`.
SHA-256: `7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01`.

Fresh six-migration deploy/status and repeat deploy/status: PASS. Populated EH-011->EH-012 upgrade: PASS. All eleven prior domain tables and existing migration ledger entries remain byte-for-byte equal, including M1 identities/profiles/assignments/sessions/audits, EH-009 catalog, DRAFT/ACTIVE/CANCELLED CarePlans and Patient/Clinician-entry BP rows/provenance. All three new tables are empty immediately after upgrade. Repeat deploy/status retains state. Real M1 HTTP verification and zero-insert repeat seed pass. Earlier EH-005->EH-006 and M1->EH-009->EH-010->EH-011 preservation proofs remain in the verifier. Historical isolated suites retain original migration baselines.

| Historical migration | SHA-256 (unchanged) |
|---|---|
| EH-005 | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| EH-006 | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| EH-009 | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| EH-010 | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |
| EH-011 | `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21` |

## Literal commands and runtime

Separate disposable literal-command database: pnpm demo:seed created five users/four profiles/one assignment; pnpm m1:verify passed actual HTTP isolation/logout; repeat seed inserted zero. Literal clinical:bootstrap created/published exactly the approved catalog; repeat created/published zero. After service retirement, literal bootstrap exited nonzero with CLINICAL_CATALOG_RETIRED and retained inspection state unchanged. EH-012 genuine HTTP runtime passed both before and after retirement. No clinical facts were fabricated.

All established host auth/authorization/CarePlan/BP/clinical runtime probes passed; new verify-followup-runtime passed. It creates an appointment/encounter for Patient A using the assigned clinician's real HTTP session, submits Patient/Clinician BP using EH-011, links both, verifies Patient reads/denials/minimized references, checks original BP provenance, cancels/retries and checks exact persisted actor/audit/no-op behavior. It logs out verifier-created sessions and never prints credentials. The same new probe is chained into verify-m1-runtime with the existing private ephemeral credential flow.

Docker Compose config/build/startup: PASS, PostgreSQL/API/web/worker healthy. Used a new disposable Compose project/database; retained project volumes were not reset. Session proxy CA supplied as BuildKit secret; no secret/override committed. Running-container auth/authorization unit tests **7/7 PASS**; concurrent-auth measurement, auth/authorization runtime, M1 seed/real HTTP/logout/repeat, CarePlan, BP, new EH-012 and clinical bootstrap/inspect/repeat runtime: PASS. Host web/API health: PASS. Full host build also passed.

After the parser correction, the image was rebuilt and all six migrations deployed to another fresh disposable runtime database. All services became healthy. Container 7/7 auth/authorization unit tests, concurrent-auth measurement, auth/authorization/M1/CarePlan/BP/EH-012/clinical probes and web/API health all passed again. The earlier attempt to rerun the ephemeral-credential M1 driver against its retained database correctly rejected a credential conflict; no retained credentials/history were repaired or overwritten, and that attempt is excluded from passing results. Runtime reruns need a fresh fixture database or the original private fixture credential.

## Delivery and independent review

Implementation self-review covers complete diff, scope, historical hashes, no secrets/generated junk, prior OpenAPI operation/schema preservation and new contract/HTTP agreement. Exact feature head, PR and final-head remote CI run/result are recorded in the PR handoff after push. Independent second-pass review is deliberately a separate next task and is not represented as completed by implementation self-review. No merge or manual issue closure is authorized by this document.

## Limits and remaining gates

Non-idempotent creates can leave committed evidence after a lost response; no automatic replay/deduplication. Mistaken encounter/BP associations remain immutable; correction/invalidation/reassociation needs a separate approved contract. Recording provenance is not participant identity or medical verification. A timestamp crossing the DB receipt boundary between service validation and insertion can fail with sanitized service error; the database invariant remains enforced. Ordinary guards do not protect against schema owners disabling them. Expiry is a final-check-time guarantee, not stopping time until commit. Separate history pages are not one frozen snapshot.

No CareAction/generation/occurrence/action link, ClosureAssessment/EACCE, coverage/normalized evidence, eligibility facts, CR-HTN-FU-002, FHIR/Synthea ingestion, UI/marketplace/provider allocation/notifications/telemedicine. Diagnosis, age/pregnancy/comorbidity facts, correction-aware BP selection, trigger/index selection, calendar arithmetic, occurrence/retrigger identity, generation concurrency, retirement interaction and action-linked scheduling remain unresolved. FR-021 incomplete; FR-024 foundation-only/incomplete; AC-004/AC-005 unsatisfied; M2 IN PROGRESS. EH-013 owns coverage/normalization.
