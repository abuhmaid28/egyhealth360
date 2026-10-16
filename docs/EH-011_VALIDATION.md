# EH-011 implementation validation evidence

Issue #20, final approval [6183982525](https://github.com/abuhmaid28/egyhealth360/issues/20#issuecomment-6183982525).
Branch `feature/EH-011-m2-bp-provenance`, approved baseline
`9ed0d2e09a06fb1e63ae30e86678088ff805c5b8`. Existing uncommitted work was preserved
across the usage-limit interruption; no reset/stash/restart of implementation.

## Scope

Implements the approved nine-field immutable paired BP row, current-session Patient
self / ACTIVE-assigned Clinician submission, paginated GET/HEAD history, server-derived
entry provenance and atomic BP_MEASUREMENT_CREATED audit. Internal recorder user UUID
is persisted and verified but omitted from every BP HTTP projection. Exact contract:
EH-011_BP_PROVENANCE_CONTRACT.md and ADR-025. No new external dependency/lockfile change.

Structural acceptance is not clinical validity. No medical plausibility bounds,
controlled/qualifying flag, CarePlan FK or catalog prerequisite. No correction workflow,
CareAction/generation/occurrence/trigger selection, encounter, appointment, coverage,
ClosureAssessment, EACCE, CR-HTN-FU-002 or FHIR/Synthea import. Below-threshold BP and an
ACTIVE plan do not establish full clinical applicability. Correction-aware normalization,
clinical facts, calendar arithmetic and occurrence/generation policy remain gated.
FR-022 covers proven HTTP submission; FR-012/043 are API/data foundations; FR-023 is BP
entry provenance only. FR-021 incomplete; M2 IN PROGRESS.

## Resumed local validation (2026-10-15)

Validation was rerun after resuming, using pinned Node 24.21.0 and pnpm 10.34.6 and a
new disposable Compose project/database. Earlier incomplete runs and raw-HTTP harness
failures are excluded. The harness explicitly preserves Host headers and raw request
paths (including bare ?) so tests reach the intended HTTP contracts.

- Frozen install: PASS; no dependency or lockfile changes.
- Prisma generate/validate: PASS.
- Lint/build/typecheck: PASS.
- Full unit suite: **23/23 PASS**, including **4 EH-011 unit cases**.
- EH-011 focused coverage: **46 distinct cases** (4 unit + 29 persistence + 13 HTTP). The original 41 integration cases passed within the full run; all 13 HTTP cases passed again after the cache fix below.
- Complete integration suite: **171/171 PASS**, covering EH-005 through EH-010 and the original EH-011 cases. After the independently identified cache issue was fixed, all **23 unit + 13 affected HTTP = 36/36** cases passed again. The repository now contains **172 integration cases**, including the new conditional-response regression; final-head CI runs that complete matrix.
- Production and full high-severity dependency audits: PASS; no known vulnerabilities.
- Historical migration SHA verification and git diff --check: PASS.

Tests exercise exact integer lexical forms, escaped duplicate keys, primitive/null/
missing/unknown fields, malformed JSON, nonfinite/overflow/precision-loss forms, exact
mmHg, real calendar/offset/year parsing and UTC millisecond serialization. No clinical
ranges or component ordering are inferred. Genuine HTTP sessions cover both patients,
assigned/unassigned clinician and ADMIN, malformed/encoded IDs, spoofing, Origin/Fetch
Metadata/CSRF/media/size/query, HEAD/method/no-store, strict pagination/order/count,
empty history and minimized response keys. Invalid/denied writes and reads retain no
BP audit. Identical successful requests retain distinct rows and audits.

Controlled two-connection tests observe actual PostgreSQL blocking for both orderings
of session revocation, user disabling, assignment ending and patient/clinician mapping
changes. A losing write retains zero BP rows/events; a winning submission holds the
relevant locks through audit/commit. Expiry during the transaction rolls back evidence
and audit. Missing/inconsistent principals/profiles and state changes after the HTTP
guard fail closed. Session expiry remains a final-check-time guarantee.

Direct SQL/Prisma tests reject mutation of all nine fields, no-op/empty UPDATE, DELETE,
zero-row DELETE, TRUNCATE/CASCADE; verify exact structural source/actor/ownership/
assignment checks, unit/chronology/millisecond constraints, both RESTRICT FKs, indexes,
trusted invoker functions and TEMP-shadow attempts. Equality is tested against the
actual chronology CHECK expression without a flaky clock-equality assumption. SQL
sub-millisecond parameters avoid JavaScript Date truncation before reaching PostgreSQL.
Audit failure rolls back BP; successful audits have genuine actor/entity and metadata {}.
A fresh fixture proves submission with no CarePlan or catalog rows.

## Migration and preservation

One additive migration: `20261017000000_eh011_bp_provenance/migration.sql`.
SHA-256: `5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21`.
No reference/BP seed rows. Fresh five-migration deploy/status and repeat deploy/status:
PASS. Seeded EH-010 -> EH-011 upgrade preserves all ten existing domain tables byte-for-
byte, including M1 sessions/audits, approved EH-009 catalog, and DRAFT/ACTIVE/CANCELLED
CarePlans plus prior migration ledger. Repeated deploy/status preserves that state and
actual M1 HTTP verification passes. Existing EH-005 -> EH-006 and M1 -> EH-009 -> EH-010
upgrade proofs remain in the verifier. Historical isolated suites retain their baselines.

| Historical migration | Unchanged SHA-256 |
|---|---|
| EH-005 | `d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a` |
| EH-006 | `2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b` |
| EH-009 | `bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a` |
| EH-010 | `47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38` |

## Literal commands and runtime

Separate disposable database: literal pnpm demo:seed created five users/four profiles/
one assignment; actual HTTP pnpm m1:verify passed; repeat seed created zero rows.
Literal clinical:bootstrap first created/published the exact catalog; repeat created/
published zero. After service retirement, literal bootstrap rejected with
CLINICAL_CATALOG_RETIRED and inspection proved retained state unchanged. CarePlan
service runtime, genuine BP HTTP runtime and clinical inspect/repeat runtime: PASS.
Existing synthetic identities retain their null clinical facts.

Docker Compose config/build/startup: PASS; PostgreSQL/API/web/worker all healthy.
Session proxy CA was mounted as a build secret; no secret/override committed. Container
auth/authorization unit tests: **7/7 PASS**. Host and container concurrent-auth measurement
passed. Running API auth/authorization probes, M1 seed/HTTP/logout/repeat workflow,
clinical bootstrap/inspect/repeat, CarePlan service probe and new genuine demo-session
BP POST/GET/HEAD/IDOR/minimized-projection/internal-provenance probe: PASS. Host web/API
health: PASS. After the cache fix, the image was rebuilt and a second clean Compose
project/database deployed all five migrations; all four services became healthy and the
complete container unit/measurement/auth/authorization/M1/CarePlan/BP/clinical/health
workflow passed again with exit 0. verify-m1-runtime invokes both CarePlan and BP probes with the same private
ephemeral demo credential and sanitizes child output.

## Independent review and final delivery

Independent review identified one P2 issue: Express automatically generated ETags and
could return 304 for conditional BP history requests despite no-store. The narrow fix
uses direct ServerResponse.end for BP success responses only; other routes retain
existing behavior. A raw-HTTP regression proves POST/GET/HEAD emit no ETag and authorized
conditional GET/HEAD remain 200 (HEAD empty), including If-None-Match:*.
Affected build/lint/API typecheck and 36/36 unit/HTTP tests passed after the fix.

The reviewer independently reran **45/45** original focused cases (4 unit + 29 persistence
+ 12 HTTP), then **1/1** new conditional regression against the rebuilt final API. All
passed with no skipped/cancelled tests. The P2 finding is resolved; final review confirms
zero unresolved findings after rechecking the final source/tests/contracts/evidence.
Final-head remote CI and exact commit/run identities are recorded in the PR after
completion. No merge is authorized by this validation document.

## Limits

POST is non-idempotent; a lost response can leave a committed row and identical genuine
readings cannot be distinguished from retries by payload equality. Idempotency-Key is
explicitly rejected; no automatic retry. Wrong entries remain immutable; later evidence
consumers need approved correction/invalidation and selection semantics. Entry provenance
does not attest clinical truth or operation of a device. Ordinary SQL guards do not
authenticate callers and cannot protect against schema owners disabling them. SQL casts
have PostgreSQL type-conversion behavior; the HTTP boundary preserves the approved raw
lexical contract. History pages from different requests are not one frozen snapshot.
No product UI or same-origin browser routing expansion is claimed.

## Final merge annotation

PR #21 squash-merged as `c24b7c487dc7d56624e8dd3cfa95ba92afa963a5`; Issue #20 closed. Final implementation head `29d28929b5dcd6310e6386d0fa9bba536d342daf`, CI run `38735336245` SUCCESS, independent review `5533350769` PASS. [Final merge record](https://github.com/abuhmaid28/egyhealth360/issues/20#issuecomment-6192622574). EH-011 is complete. Pending-delivery wording above is historical; these are not newly rerun results. M2 remains in progress.
