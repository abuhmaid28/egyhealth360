# EH-014 — bounded INITIAL CareAction contract

Authorized by [Issue #28 final approval 6317196946](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6317196946), from `e83e9b3e0e6e42988cc4e4ba905d9bcc589b9adc`. This implements the frozen R1–R8 extension to EH-009–EH-015 and Issue #31; earlier slice deferrals are historical scope statements. Implementation is pending independent review/merge/post-merge validation. Issue #28 stays OPEN; M2 IN PROGRESS.

## Explicit selection and admission (R1–R3)

`createCareActionPersistence` is a root-exported principal-checked internal service. `previewSelection(principal,{patientId,planId,bpId,applicabilityId})` inspects those exact identities and returns provisional `expectedInputs`; it selects no alternative and asserts no clinical acceptance. Only a currently ACTIVE assigned clinician can preview/select/generate. `generateInitialAction` requires the same four identities, `operationId` (UUID-v4), `accepted:true` and the complete expected input object. Acceptance is an explicit assertion by the invoking clinician about that exact pair, provenance and measuredAt for INITIAL, persisted only with successful creation. Both entry sources require it. BP recording, encounter association and activation never imply acceptance. Corrected/restated BP needs a new explicit selection.

The EH-010 deferred specification remains a read-only declaration surface; it evaluates no explicit selection and reports no persisted action. The new service is the durable generation/read boundary.

Inputs reject unknown top-level keys, accessors, hidden properties, symbols, non-JSON values, malformed IDs and missing acceptance. Expected material is privately copied before any await and compared as exact JSONB to the fixed database-derived ordinary selection shape; unknown nested policy/ground-truth fields cannot match and cannot persist. Depth/item bounds are resource limits, not clinical rules. Caller identity/status/pins/timing never supply authority. Provisional selection is not a reusable authorization ticket.

The only clinical predicate is the approved CR-HTN-FU-001 / 1.0.0-draft: systolic <140 AND diastolic <90 mmHg, explicit age ASSERTED_VALUE >=18, NOT_PREGNANT, hypertension PRESENT and CVD/diabetes/CKD ABSENT. No invented plausibility floor/ceiling, repeated-reading requirement or encounter prerequisite. Structural BP validity and clinician acceptance are distinct.

`triggerAt = BP.measuredAt`. Selected same-patient applicability must have `effectiveAt == triggerAt` and be non-retracted. The complete current non-retracted point membership must have identical seven-scalar tuples. No partial merging, negative inference, source precedence or latest/nearest/carry-forward rule. Retrospective assertions remain allowed under EH-015 chronology; receipts are not commit timestamps or arbitrary knowledge-at-wall-clock-T. Require `triggerAt >= startedAt`; equality is valid, pre-plan evidence fails.

## Persistence and exact replay (R3–R4)

One additive migration, `20261022000000_eh014_initial_care_action`, adds:

| Table/model | Purpose |
|---|---|
| care_actions / CareAction | Immutable action UUID, patient/plan/exact template/rule pins, INITIAL, HTN_BP_FOLLOWUP, triggerAt/recommendedAt/dueBy and DB-owned createdAt |
| care_action_decisions / CareActionDecision | Protected one-to-one selected decision, exact BP/applicability same-patient FKs, original selecting user/assignment, frozen clinician/assignment provenance and operation key, explicit acceptance, evaluated fixed-shape inputs, immutable schedule/creation time and transaction ownership |
| care_action_applicability_inputs / CareActionApplicabilityInput | Exact immutable participating snapshot membership with same-patient RESTRICT FKs |

Protected `inputs` is fixed-shape database-derived JSONB, validated for exact equality at insertion, not arbitrary caller clinical JSON. The preflight/command `expectedInputs` view always excludes BP correction-origin lineage, which can contain private predecessor IDs. The service compares this ordinary view and persists the full server-derived protected record. Exact retries compare the same immutable ordinary view; no raw protected decision is returned. It captures the immutable BP pair/unit/entry source/recorder/measuredAt/original receipt, selected applicability ID, sorted exact non-retracted snapshot rows with values/source/assertion/effective/asserted/receipt fields, consulted point withdrawals, BP replacement-origin operation when present, actual effective/disclosable/threshold/comparison outcomes, plan/start/lifecycle, exact template/rule/definition/source metadata and policy/calendar versions. Selecting user/assignment, capture instant, schedule and action UUID are protected relational fields. Encounter input is explicitly null. Absence of an exclusion/privacy record is captured as the final effective/disclosable observation, never a fabricated exclusion identity.

Replay uses this snapshot and immutable references, never today's effective evidence query. Subsequent assertions or backdated BP cannot change it. FKs retain source identities; snapshots retain evaluated values. SQL guards reject every UPDATE/DELETE/TRUNCATE statement, including empty/no-op statements, on all three tables. Cyclic same-patient action/decision FKs enforce one-to-one ownership; deferred completeness requires all point members and both correct audit events. Transaction IDs ensure new action/member rows belong to their decision's insertion transaction. They are internal transaction-integrity markers, not a historical visibility API.

`UNIQUE(care_plan_id,rule_definition_id,occurrence)` permits exactly one INITIAL per exact plan/rule. Evidence UUID/time is traceability, not occurrence identity. No broad action lifecycle/status, updatedAt, completion or recurring occurrence exists. All nine historical migrations stay byte-identical. No existing plan/evidence row gets a fabricated action/decision backfill.

## Idempotency, current authority and concurrency (R4–R5/R7–R8)

Successful command identity is `(selecting_user_id,operation_key)` across sessions/scopes. The original successful creation reserves that identity; changed payload or reuse for a different authorized plan conflicts. Exact retries of the occupied logical occurrence compare exact evidence/point/acceptance inputs and preserve original IDs/times/selector with `created:false`. A different currently authorized clinician may retry that same canonical decision using the original creation key, preserving the original command owner and authorship. A fresh key is a different command and conflicts on the occupied occurrence; no successful alias can escape scoped command uniqueness. Different selections conflict, never overwrite or pretend to have won.

Lock order: user FOR NO KEY UPDATE → exact session FOR UPDATE → clinician profile FOR SHARE → ACTIVE/null-ended assignment FOR SHARE → patient FOR UPDATE (initially exclusive) → scoped plan FOR UPDATE → pinned template FOR SHARE → selected BP FOR UPDATE. Fresh statements after waits read current state. EH-015 insertion/retraction guards take patient FOR SHARE, preventing point phantoms under the exclusive patient lock. Issue #31 service and guarded SQL writes take compatible selected-BP locks. Plan/template locks serialize cancellation/retirement. Locks remain through commit. Structural SQL provenance checks do not replace genuine session authentication or grant autonomous writer authority.

READ COMMITTED transaction limits: lock 5s, statement 10s, maxWait 5s, transaction 30s. Final current session/user/role/expiry check can roll back all work. No automatic stale-authority transaction retry. Lost acknowledgement is resolved by a fresh fully authorized exact retry. Same/different selection races and winner rollback are tested with separate connections and different clinician users/sessions, observing actual PostgreSQL blocker PIDs.

Immediately before durable insertion the guard revalidates exact expected inputs, current effectiveness/disclosure, point membership/retraction/values, scope, ACTIVE/PUBLISHED state, exact supported definition and trigger timing. Excluded/private/withdrawn/stale inputs fail atomically, with no alternate BP/applicability selection. Privacy uses generic object denial. First successful explicit selection binds INITIAL; transaction order does not claim medically earliest/best evidence.

## Preservation and ordinary privacy (R5)

Later correction, exclusion, applicability withdrawal or privacy does not delete/cancel/regenerate/replace/reschedule an action, move its dates or emit a new action event. Nonprivate historical basis may remain inspectable as history; that does not claim current qualification. New source rows never repoint the old decision.

`inspectAction` and `listActions` expose only action identity/patient/plan/pins/INITIAL/type/timing, with no protected snapshot, selected BP/applicability IDs or selecting-clinician internals. Reads permit self-patient/current assigned clinician only. Admin is denied. Every call rechecks current authority. Counts/pages share one statement-visible filtered set. Current `bp31_disclosable` masks the entire affected action, including its dates and retry acknowledgement, honoring retained wrong-patient operation targets even when privacy children are damaged. Integrity checks fail unavailable on broken decision/member/source linkage; no raw fallback/forensic entitlement exists.

## Calendar (R6)

`eh014_add_months` independently derives recommendedAt = original trigger +3 and dueBy = original trigger +6 UTC Gregorian months. Preserve UTC time-of-day and milliseconds, clamp day to destination month end, honor century/leap rules, reject invalid precision/nonfinite instants/years outside 0001–9999/output overflow. No 90/180 days or chained +3/+3. Inclusive dueBy is retained as a contract declaration; no overdue/completion/EACCE classification is executed. Fixed vectors are independent of the runtime clock and tested under multiple PostgreSQL timezones.

## Audit and lifecycle (R7–R8)

First success atomically appends CARE_ACTION_TRIGGER_SELECTED / care_action_decision / actual decision UUID / genuine clinician actor / {} and CARE_ACTION_CREATED / care_action / actual action UUID / NULL actor / {}. NULL denotes deterministic derivation within an authorized clinician invocation. Snapshot, membership, action and both audits commit or roll back together. No audit on denied/failed commands, reads or exact retries; no clinical content in generic metadata.

New generation requires ACTIVE CarePlan and PUBLISHED exact approved pinned template/rule; cancellation/retirement blocks new creation. History remains. A currently authorized/disclosable exact historical retry after cancellation/retirement is a no-op. No appointment prerequisite/FK/link or appointment creation/cancellation/completion coupling.

Errors are sanitized CARE_ACTION_INVALID, UNAUTHENTICATED, NOT_FOUND, STALE_SELECTION, CONFLICT and UNAVAILABLE (each prefixed CARE_ACTION_). Missing/forbidden/private targets share object denial. Storage/corrupt-linkage/timeout/audit failures return unavailable. Invalid or stale qualifying/lifecycle inputs fail without substitution. Raw driver messages and payloads are not returned.

## Proof, validation and exclusions

`pnpm m2:verify` runs `scripts/verify-care-action-runtime.mjs`: explicit disposable synthetic DB, real seeded assignment/session principals, exact pinned plan, reached DB-owned startedAt as equality trigger, observed applicability and selected BP, durable replay, fixed calendar expectations, real competing-selection blocking, exact retry, post-creation preservation/privacy masking and pre-creation exclusion/privacy/withdrawal failures. Fixtures preserve M1 null DOB/sex and contain no research outcomes. Logical expectations are deterministic; UUIDs/receipts are naturally generated. The script is a trusted verifier, never product/startup/worker code. The focused integration suite additionally proves authorization/IDOR, audit failures, direct SQL/Prisma integrity, current-authority races, calendar edge cases and legacy regressions. CI runs this proof in the built runtime container.

Actual commands/counts/results belong in [validation](EH-014_VALIDATION.md). The proof is implementation evidence toward M2, not M2 completion. FR-021 is narrowly implemented/pending review and validation of the full merged slice; FR-024 foundation-only/incomplete; AC-004/AC-005 unsatisfied pending their separately approved scheduling/completion contracts and evidence. No recurrence, scanner, implicit hook, new route/role, forensic access, general verification/amendment/temporal system, automatic substitution/reconciliation, appointment workflow, completion inference, EACCE, research mutation, UI/UX, Design System, branding or visual design is implemented.

## Acceptance trace

| Frozen decision | Executable acceptance evidence in `tests/integration/care-actions.test.mjs` |
|---|---|
| R1 | both entry sources require acceptance; association has no side effect; strict threshold vectors including 139/89, 140/89, 139/90, 140/90 and no invented plausibility floor |
| R2 | each missing/conflicting/explicitly excluding fact, age 17/18, exact point, withdrawal, pre-plan/equality/post-start and retrospective assertion |
| R3 | exact protected JSON/source membership, actual selector, defensive copy, expected-value/membership conflict and late backdated/new evidence preservation |
| R4 | exact retry, changed selection/key/scope, two distinct clinician sessions, actual blocking, winner commit/rollback, at most one occurrence |
| R5 | both-order exclusion/privacy/withdrawal with distinct clinician writers where applicable; immutable post-creation history; count/page/detail/retry masking; broken membership, retained privacy operations and correction-origin defenses |
| R6 | fixed independent +3/+6 vectors, UTC time preservation, Gregorian month-end/leap/century, equivalent offset, multiple session timezones, precision and overflow |
| R7 | role/assignment/IDOR denial; both-order session/user/assignment/mapping changes; final expiry; exact actor/entity/metadata on both events; audit fault and deferred-completeness rollback |
| R8 | ACTIVE/PUBLISHED prerequisites; both-order cancellation/retirement; historical exact retry; no required encounter/appointment and no automatic coupling |

The new schema-boundary unit assertion allows exactly the previously approved models plus these three EH-014 models. Root catalog tests add the exact new constraints, RESTRICT FKs, invoker functions and enabled history/completeness guards; historical foundation tests retain their earlier isolated schema baselines.
