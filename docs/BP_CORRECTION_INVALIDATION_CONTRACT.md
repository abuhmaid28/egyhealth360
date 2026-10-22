# BP measurement correction and invalidation — Issue #31

Implementation contract for the slice authorized by [the final approval](https://github.com/abuhmaid28/egyhealth360/issues/31#issuecomment-6305526971), including D1, D2 and F1 in the complete issue discussion. Baseline: `4733d1c27e70672ed6a4f52a793e53b320290b03` (merged EH-015). No EH number is assigned to this prerequisite. Issue #31 was independently reviewed, merged in PR #32 at `e83e9b3e0e6e42988cc4e4ba905d9bcc589b9adc`, post-merge validated and CLOSED/completed.

## Evidence invariants

Original BP UUID, patient, paired values, measuredAt, createdAt and entry provenance never change. Source and amendment tables reject UPDATE, DELETE and TRUNCATE, including empty statements. No deletion, mutable valid flag or implicit invalidation when a newer/identical measurement arrives. Clinical implausibility alone creates no exclusion.

One immutable terminal exclusion per BP removes that exact identity from new effective evidence. Supported machine reasons: DATA_ENTRY_ERROR, MEASUREMENT_ERROR, DUPLICATE, WRONG_PATIENT, WRONG_CONTEXT, SOURCE_WITHDRAWAL, PROVENANCE_ERROR, CORRECTION_ERROR. No free-text reason or narrative field. These describe an authorized assertion, not an automatic clinical judgment. A duplicate may optionally reference another same-patient, currently nonexcluded/nonprivate BP; no value-based deduplication or permanent guarantee about that other BP's future state.

A factual correction creates a fresh complete paired BP and an exclusion/link atomically. Even if only systolic is wrong, the clinician explicitly asserts both replacement components. Corrected measuredAt is on the new row. Recorder/source derive from the current authenticated clinician, never the old recorder. Encounter links remain on their original immutable BP; replacement receives none automatically. An authorized subsequent EH-012 association is separate.

An erroneous bare exclusion may be restated once with fresh complete evidence, retaining the original exclusion. It cannot reactivate a row or restate a source whose exclusion already owns a replacement. A later erroneous replacement is corrected/excluded as its own BP identity. No general amendment undo, correction-retraction workflow or cross-patient movement is implemented.

## Identity, linkage and F1 privacy

Three additive protected tables:

| Table | Responsibility |
|---|---|
| bp_amendment_operations | Immutable command identity, actor/patient, EXCLUDE/CORRECT/RESTATE/PRIVACY kind, target, structured reason, canonical retry fields, optional duplicate reference, frozen predecessor IDs, optional owned fresh replacement and paired assertion |
| bp_exclusions | One terminal exclusion per BP with immutable originating operation and reason |
| bp_privacy_targets | One independent wrong-patient restriction per explicitly targeted BP, with originating operation |

CORRECT/RESTATE replacement ownership is unique. Database guards require a fresh row inserted in the same transaction, truthful clinician provenance, exact asserted pair/time and no existing encounter/amendment use. Same-patient composite RESTRICT foreign keys preserve linkage. Fresh ownership and immutable forward edges prevent cycles and shared replacements.

F1 deliberately separates privacy membership from exclusion. A WRONG_PATIENT exclusion on an unexcluded BP creates both exclusion and privacy atomically. A later PRIVACY operation on an already DATA_ENTRY_ERROR-excluded BP preserves that exclusion and adds only privacy. A privacy operation on multiple targets creates any missing WRONG_PATIENT exclusions and all privacy memberships atomically.

PRIVACY accepts one primary BP plus explicit predecessor UUIDs from that primary's backward CORRECT/RESTATE replacement lineage, in the same patient. The service sorts/deduplicates by rejecting duplicate input IDs, validates membership and freezes exactly those IDs. Maximum 100 total targets is an input/transaction resource bound, not a clinical selection policy. Both correction and required linked restatement edges preserve accepted predecessor provenance. No automatic traversal to choose privacy targets, forward propagation, live graph masking or future set growth. In A→B→C, explicitly restricting A and B leaves C unaffected; restricting B alone leaves A unaffected by privacy. A new wrongly associated node requires a separate authorized determination.

Wrong-patient evidence is not moved to a correct patient. A separate fresh entry for that patient requires independent current authorization and truthful provenance. No destination-patient reference is stored here.

## Internal service surface and authorization

`createBpAmendmentPersistence` exposes principal-checked exclude, correct, restate, restrictWrongPatient, getHistory and listEffective, plus lifecycle close. No public HTTP mutation route, raw-history endpoint, forensic role, UI or new dependency.

Mutation inputs contain patientId, bpId and caller-generated operationId (UUID v4); EXCLUDE/CORRECT additionally require reason, expectedState=UNEXCLUDED and explicit nullable duplicateOfBpId. CORRECT/RESTATE require the complete replacement `{systolic,diastolic,unit:'mmHg',measuredAt}`. PRIVACY requires predecessorIds, including an explicit empty array when none. Unknown fields, accessors, hidden keys, incomplete pairs, invalid units/times and authority/provenance fields fail validation. Commands are privately copied/canonicalized before asynchronous authorization. No caller-supplied assertion/receipt timestamp.

Only a currently active assigned clinician can mutate. Patients can continue submitting fresh BP under EH-011 but cannot amend old evidence; ADMIN alone grants no clinical authority. Reads allow self-patient/currently assigned clinician. Every call reuses current user/session/profile/assignment/patient transaction checks, canonical locks and final session/role/clock-expiry recheck. Denied patient/resource scope returns uniform BP_AMENDMENT_NOT_FOUND; expired/revoked session returns BP_AMENDMENT_UNAUTHENTICATED. Invalid/conflicting commands use BP_AMENDMENT_INVALID/CONFLICT; unavailable/corrupt/unexpected storage failure is sanitized BP_AMENDMENT_UNAVAILABLE. No automatic stale-authority retry.

## Retrieval and medical safety

| View | Deterministic rule |
|---|---|
| Protected persistence | Original BP and every amendment/link remain available to authorized database maintenance; this is not a product service or forensic entitlement |
| Ordinary BP history (existing GET/HEAD and service) | Patient-scoped source rows with no privacy membership and no WRONG_PATIENT exclusion; retains nonprivate terminally excluded facts |
| Amendment getHistory | Same ordinary privacy filter on requested BP and linked BP references; no hidden target payload or replacement reference |
| Effective list | Ordinary disclosable BP with zero terminal exclusions, one statement for count/page |
| Normalized BP and encounter/BP candidates | Same effective predicate, preserving EH-013 time windows, partitions and single-statement snapshot |
| Ordinary encounter association history | Retains stored links but omits references to nondisclosable BP; count/page use the same filter |

Privacy membership, a WRONG_PATIENT exclusion and the operation's explicitly frozen wrong-patient target IDs independently suppress disclosure. Missing child linkage cannot relax privacy, including F1 privacy after an earlier nonprivate exclusion. Effective reads also honor a retained terminal operation if its exclusion child is corrupted; amendment history and operation acknowledgements fail unavailable on incomplete required linkage. These are fail-closed checks on stored identities, without graph-derived propagation. No BP values, protected BP references, destination identity or narrative is exposed through ordinary projections. An exact amendment retry uses the current privacy projection; a subsequently private replacement ID becomes null. Association creation rejects excluded/private BP; an existing exact nonprivate association is still an authorized no-op. Association retries recheck current disclosure in a fresh statement after any BP lock wait, since a privacy writer need not update the source BP tuple. Source links are never removed.

Effective means only not excluded and not privacy-restricted. It does not mean valid, plausible, verified, qualifying, applicable, controlled, selected or sufficient. No threshold, B2 selector or EACCE inference is added.

## Time and D1 boundary

Source measuredAt is clinical time; source createdAt is the original database receipt time. They remain immutable. Replacement has a separately asserted measuredAt and fresh receipt. Local clinician amendment assertedAt and recordedAt are owned by the database and equal for each local record; operation precedes its child receipts. These are local assertions, not imported source timestamps or commit timestamps. Service and database enforce finite supported dates, millisecond precision and no future clinical time at recording. No fabricated source assertedAt/backfill.

Wednesday's correction preserves Monday's original source fact. Current effective reads on Wednesday omit Monday's excluded identity and may include the fresh replacement. This slice does **not** claim arbitrary knowledge-at-wall-clock-T, transaction visibility history, commit order or a temporal database. No recorded-by-T API is supplied. D1 requires EH-014/B2 to capture exact decision inputs/identities and actual evaluated values in the future; later exclusion cannot silently rewrite those captured historical decisions. Retrospective CareAction cancellation/regeneration/reconciliation is an unresolved EH-014 lifecycle decision. No such event consumer or action policy is implemented.

## Atomicity, retries and concurrency

Unique `(actor_user_id,kind,operation_key)` spans sessions and patients. Exact canonical retry reuses original successful IDs/time without clinical/audit writes; changed target, patient, reason, duplicate reference, pair/time or frozen target set conflicts. Uppercase UUID and equivalent UTC time representations canonicalize. Set order is canonical, not meaningful. Retry authorization is current, and response privacy is current. Different kinds intentionally have distinct key namespaces.

Transactions lock all supplied BP/duplicate IDs in UUID order after existing authorization locks. One terminal exclusion, one privacy membership and one bare restatement are enforced by uniqueness and guards. Different competing exclusions conflict, not last-write-wins. Overlapping nonidentical privacy operations conflict in full, even when some targets could otherwise succeed. Canonical target locking also serializes duplicate adjudications and association creation. Waiting operations recheck committed state; a rolled-back winner leaves no partial mutation and permits the waiter to proceed. Lock/deadlock/timeouts fail closed with rollback, no hidden retry.

Replacement, operation, exclusion/privacy children and audits commit together. Deferred database checks prohibit incomplete exclusion/privacy operations; child records belong to a same-transaction parent and frozen scope. Service audit failure rolls the entire transaction back. Generic audit contains genuine actor, fixed action/entity, row UUID and timestamp with safeMetadata `{}`. Actions: BP_MEASUREMENT_CREATED, BP_EVIDENCE_EXCLUDED, BP_PRIVACY_RESTRICTED, BP_EVIDENCE_RESTATED. No clinical values, patient destinations or narratives in generic audit. Reads/denials/retries produce no new audits. Database provenance guards do not authenticate sessions or manufacture genuine application audit; schema owners can bypass guards and remain outside the ordinary-write threat model.

## Migration, security and downstream boundaries

`20261021000000_bp_correction_invalidation` adds the three tables, constraints, indexes and schema-qualified SECURITY INVOKER guards/read predicates. All eight historical migrations are byte-identical. No existing clinical rows change and new tables start empty. Legacy BP simply has no amendment records; absence is not fabricated verification. No metadata backfill or fixture insertion in deployment. No Prisma/schema change outside the additive relationships/models. Replay and idempotency abuse are bounded by current authority and scoped unique command identity. All reads remain patient-scoped and existing no-store HTTP behavior remains intact. Research worker/FHIR/research interfaces are unchanged and cannot mutate clinical amendments; no generalized raw export is added.

EH-015 remains the observed-applicability foundation. After this prerequisite is reviewed, merged and validated, EH-014 must be re-reviewed: B2 still owns trigger qualification/selection, exact captured input snapshots, generation-time races and temporal decisions; B3 still owns occurrence/retrigger semantics. CareAction generation and later-invalidated-source lifecycle policy remain deferred. EACCE remains M3. FR-021 incomplete; FR-024 foundation-only; AC-004/AC-005 unsatisfied; M2 IN PROGRESS.

Validation evidence: [BP_CORRECTION_INVALIDATION_VALIDATION.md](BP_CORRECTION_INVALIDATION_VALIDATION.md).


## EH-014 approved consumer extension

The historical deferred B2/B3/action-policy statements above described the prerequisite boundary. The frozen R1–R8 extension now implements explicit INITIAL generation and protected decision capture without changing D1/D2/F1. See [EH-014 contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md). EH-014 merged in [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) at `4a717c4c6be5b1fa9d089823bb093eca43813853`, passed [exact-main CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) and the [functional M2 exit review](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518). Final documentation/status closeout remains pending; Issue #28 OPEN, M3 NOT STARTED. Historical prerequisite boundaries above remain unchanged.
