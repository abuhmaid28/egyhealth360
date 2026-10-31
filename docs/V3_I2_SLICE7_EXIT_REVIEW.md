# V3-I2 Slice 7 — Combined exit proof and security review

**I2 exit verdict: BLOCKED.** The merged Slices 1–6 journey can be exercised together, but consultation close remains an unresolved frozen-contract gap. Passing regression or runtime checks do not waive it. Slice 7 is IN REVIEW; no milestone completion, merge or deployment is claimed.

## Authority and exact boundary

- Repository: `abuhmaid28/egyhealth360`.
- Authoritative base: `b8ed01e4546ac94e52f9fcbec2f23e90b6fc6262`.
- Base [Bootstrap 41146078616](https://github.com/abuhmaid28/egyhealth360/actions/runs/41146078616): COMPLETED / SUCCESS; postgres 124371388254, static-browser 124371388585, docker-runtime 124371388673, aggregate validate 124377834344.
- Controlling [Issue #48 comment 6536467435](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6536467435): verification/security review of merged Slices 1–6, with minimum fixes only for existing frozen invariants.
- Branch: `feat/v3-i2-slice7-exit-review`; one PR to main, OPEN / UNMERGED, auto-merge OFF. Final exact head, PR and Bootstrap identity/results belong in the PR evidence, after observation.

The review is a second pass over the merged implementation, contracts, SQL guards, projections, replay and transaction paths, independent of the original slice implementation claims. It does not represent a separate external penetration test or a separate reviewer approval of this PR's fix. Control Center must independently review the final PR head.

## Findings and bounded disposition

| Finding | Evidence and impact | Disposition |
|---|---|---|
| I2-S7-SEC-01, P2: restricted document changed-payload replay disclosed a key conflict | `packages/db/src/documentation.ts` checked the retained operation fingerprint before privacy. After restricting a summary, retrying its DRAFT key with changed content returned 409, while exact replay returned 404. A target-specific RELEASE retry similarly reached conflict before suppression. This distinguished retained restricted operation existence. | Fixed only denial precedence: check the targeted root and retained result's privacy before non-PRIVACY fingerprint conflicts. No schema, route, projection, key scope, history or authority expansion. Authorized unrestricted changed-payload reuse still returns 409; restricted non-PRIVACY retries return uniform 404. PRIVACY's existing safe acknowledgement remains. |
| I2-S7-EXIT-01: consultation lifecycle cannot reach close | Frozen [I2 §8](V3_I2_CONTRACT.md#8-booking-lifecycle-and-retries) requires IN_CONSULTATION→CONSULTED; [§10](V3_I2_CONTRACT.md#10-consultation-lifecycle-and-encounter-linkage) requires OPEN→CLOSED once with actual close time/actor and no implicit release. Migration 17 constrains state to OPEN and blocks all consultation updates; booking state CHECK/commands omit CONSULTED/CLOSE. `ConsultationPersistence.close()` only shuts down its connection pool. The merged [Slice 6 delta 11](V3_I2_SLICE6.md#repository-wide-reconciliation) explicitly says no close endpoint and immutable OPEN sidecars. | **Unresolved exit blocker / approved-document conflict.** No close implementation or silent contract relaxation in this verification PR. AGENTS.md says “If an Issue conflicts with an accepted ADR or current approved requirement, stop and report the conflict.” The conflicting decision was reported to the owner while independent verification continued. Control Center must resolve the frozen close requirement versus the merged slice exclusion before an I2 PASS; any implementation needs a bounded reviewed migration/API/authority/replay/rollback proof. |

The privacy fix falls exactly within frozen I2 §§5, 11, 15 and 19: wrong-patient restrictions suppress ordinary existence/references/retries, and scope/privacy denial precedes conflict disclosure. A regression first reproduced **409 != 404** against the unmodified build. The new proof also uses independent PostgreSQL connections and observed `pg_blocking_pids` for privacy COMMIT and ROLLBACK versus changed-payload replay. Privacy commit must yield 404; rollback leaves the original unrestricted key conflict 409; neither retry adds a source/version/operation/audit.

No other exploitable defect is claimed from the executed bounded review. Dependency advisories and the actual validation outcomes are recorded separately; tests cannot prove absence of all vulnerabilities.

## Combined coverage and evidence map

Existing slice suites remain intact. New coverage composes their actual services through one Nest application, rather than replacing source checks with a frontend simulation.

| Requirement | Executable evidence retained or added |
|---|---|
| Finite capacity, patient/clinician overlap, adjacency, competing reservations | `availability*.test.mjs`, `bookings-integrity.test.mjs`, `bookings-concurrency.test.mjs`; independent SQL GiST/unique backstops, observed waiters, commit and rollback. Combined journey checks real HTTP capacity conflict without patient/booking leakage. |
| Idempotency, replay abuse, actor/command/module key scope | Existing booking/documentation/intent HTTP and race suites; new `v3-i2-security-exit.test.mjs` reuses one UUID across modules/commands, tests actor independence, changed-payload conflicts, unauthorized replay, immutable retained counts and restricted replay denial. |
| Cancel, atomic reschedule commit/rollback, attendance/no-show | Existing real PostgreSQL booking races/integrity suites and real-clock booking runtime. No-show is explicit; corrections do not reopen terminal reservations. Opening races retain cancel/reschedule/no-show exclusion. |
| Clinical grant, current authority, revocation/expiry, disabled identities, source org/member/affiliation loss | Existing opening/documentation concurrency and full Slice 6 authority matrix (both orderings and rollback); new combined withdrawal and suspension checks across both clinical modules. No booking/role/author shortcut. |
| Consultation exact provenance, current relationship, cross-provider/patient isolation | Opening integrity/HTTP/concurrency suites and combined persisted booking/encounter/patient/booked/treating/recorder assertions. New cross-provider link tests confirm logistics creates zero target-provider clinical authority. **Close remains blocked as above.** |
| Human complaints/problems/diagnoses/allergy uncertainty, private note author-only, released summaries, immutable correction/addenda/history | Existing documentation unit/HTTP/integrity/concurrency/populated upgrade and runtime; new composed journey checks explicit human values, unreleased/private canaries, explicit release, patient HEAD and withdrawn-author denial. |
| Privacy/IDOR/reference/count/history suppression | Existing documentation and intent privacy suites plus new independent same-consultation restrictions, linked-booking/reference suppression, wrong-patient cancelled versus nonexistent target uniform 404, changed replay and observed privacy races. No cross-module automatic privacy propagation. |
| Intent draft/release/correction/link/replacement, other-provider same patient | All retained `follow-up-intents*.test.mjs`, including cross-provider and replacement races; new composed HTTP link/isolation/security checks. Booking and linking remain explicit independent commands. |
| EH-012 compatibility, no auto-booking/CareAction/EACCE | Historical followup/BP/normalized/CareAction suites and intent compatibility tests; composed journey verifies general encounter absent from legacy HTN history and no CarePlan/FollowUpAppointment/CareAction rows. |
| Historical migrations 1→19, populated upgrade, old rows, no destructive/history edits, ZERO_WRITE | New exact-base 19-file plus migration-lock SHA-256 fixture/test. Unchanged historical migration verifier and every populated upgrade suite, including 14→15→16→17→18→19. New populated latest-schema repeat proof includes released docs, intent correction/privacy/link/replacement, booking cancellation, EH-012 and audit across all 48 domain tables and 19 ledger rows. |
| Real PostgreSQL, Docker runtime, Browser→Next→Nest→PostgreSQL | Full unchanged validation lanes; new runtime appended after Slice 6 in docker-runtime. Existing real browser regression includes availability/booking/opening/documentation. Exact-head CI, not the base run, must establish the final Docker/browser/full regression outcomes. |
| Bounded Journey A I2 portion | New `verify-v3-i2-exit-runtime.mjs`, manifest `eh-v3-i2-slice7-combined-journey-proof-v1`: real anonymous registration→login→public discovery→finite availability→patient booking→patient authorization→clinician acceptance→real-time opening→human documentation→explicit summary/intent release→explicit follow-up booking/link→withdrawal. No runtime timestamp rewriting or direct assignment helper. |
| CSRF/Origin/Fetch Metadata, malformed JSON/UTF-8, methods/HEAD/no-store/leakage | Retained strict HTTP suites and new composed middleware adversarial checks with no-write/canary assertions. |
| Timing, locks, expiry, timeout/deadlock, audit rollback | Retained independent connection suites observe actual blockers and final expiry/rollback/no-retry; new privacy retry races assert actual serialization and durable counts. No application-memory-only or sleep-only race claim. |

Full Golden Journey A is still incomplete pending separately authorized I3. No prescriptions, medication catalog, lab/results, pharmacy, EACCE, notifications, AI diagnosis or unrelated frontend work is included. Synthetic data only; no real-patient or production-readiness claim.

## Review limits and next gate

Database guards protect ordinary writes, not a schema owner/superuser disabling guards. Expiry checks are check-time protections; an already authorized response is not recalled. Current-authority and privacy guarantees remain the frozen ones. Historical slice validation reports are retained unchanged and are not represented as new runs.

[Validation record](V3_I2_SLICE7_VALIDATION.md) distinguishes local observations, deliberate red regression, interrupted attempts and final exact-head CI. The next gate is independent Control Center review of this exact PR head and resolution of I2-S7-EXIT-01. This PR must remain OPEN / UNMERGED with auto-merge OFF.
