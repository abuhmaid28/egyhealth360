# V3-I1 Slice 5 — Bilateral Relationship Lifecycle

Status: **IMPLEMENTED / IN REVIEW**. V3-I1 is **INCOMPLETE**, Issue #39 OPEN. Slice 6 is NOT AUTHORIZED. EACCE NOT STARTED; design/UI FROZEN. This document describes this branch's implementation, not accepted main completion.

## Authority and corrected baseline

[Issue #39](https://github.com/abuhmaid28/egyhealth360/issues/39) approves the I1 contract. The Product Owner's current execution instruction explicitly corrected the obsolete `091c612aca77ae41941fd1183f2de1cc380b1b30` baseline (post-G0/pre-I1 history only). The aborted stale-baseline attempt made no repository edits, branch, commit or PR. Slices 1–4 are accepted, not unauthorized drift.

The independently verified starting main is `e75671ec0adfdf0f0d71485eebb104728b619e91`, PR #44 merged. [Exact-main Bootstrap 40195060034](https://github.com/abuhmaid28/egyhealth360/actions/runs/40195060034) was push/main, exact SHA, COMPLETED/SUCCESS; all actual job steps passed (93 unit, 510 integration, seven container tests, migrations, both HIGH audits and all runtime/smoke/cleanup gates). Issue #39 remained OPEN; no later baseline change or overlapping open PR existed at start.

[Product Owner implementation authorization 6401378826](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6401378826) records Slice 5 only, including accepted-authorization withdrawal, legacy compatibility and the independent-review/exact-head-CI/separate-merge-approval gate. D01–D36 are unchanged. [I1 contract](V3_I1_CONTRACT.md) remains governing policy.

## Compatibility inventory

| Existing foundation | Classification | Protected behavior / extension |
|---|---|---|
| User identity, five fixed roles and ACTIVE/DISABLED, canonical email/Argon2id | PRESERVE EXACTLY | No role, password, registration, profile mutation or authentication change |
| Session, cookies, Origin/Fetch Metadata/CSRF, parser sanitization | PRESERVE EXACTLY | Authenticated commands retain existing guards; current actor/session checked under locks and finally before commit |
| PatientProfile / ClinicianProfile | EXTEND ADDITIVELY | Reverse relations and patient composite reference index only; no scalar/demographic/legacy-specialty changes |
| ClinicianPatientAssignment | PRESERVE EXACTLY / EXTEND ADDITIVELY | Same immutable identity/endpoints/assignedAt, ACTIVE pair uniqueness and terminal ENDED guard. Add composite reference index/reverse relations only; no new scalar defaults or changed historical queries |
| Patient own / clinician ACTIVE-assignment / ADMIN clinical denial | PRESERVE EXACTLY | Existing authorizers unchanged; no `assignment OR request/membership` |
| AuditLog | PRESERVE EXACTLY | Append-only, empty metadata, genuine actor, atomic state/audit, no browser |
| eh-m1-demo-v1 | PRESERVE EXACTLY | No source, hashes, fixed identities, specialty, assignment or default seed changes. No consent/end actor backfill |
| CarePlan/BP/follow-up/encounter/coverage/applicability/correction/privacy/INITIAL CareAction | PRESERVE EXACTLY | Same source history, wrong-patient masking, action assignment references, locks and clinical rules |
| Slice 2 organizations/memberships and Slice 4 directory | EXTEND ADDITIVELY | Directory composite reference key/internal locator resolver only; publication/membership never becomes a clinical grant |
| RelationshipRequest | NEW | Participant-scoped bilateral authorization/decision provenance bound to exact assignment on acceptance |
| AssignmentEndProvenance | NEW | One immutable participant end fact per exact assignment, only for actual new endings; historical unknown actor stays unknown |
| Exact schema/migration/API inventories | EXTEND ADDITIVELY | 29→31 models, 13→14 migrations, 17→25 HTTP paths, five appended API schemas. Historical SQL hashes and historical API bytes remain pinned |
| Slice 6 / V3-I2+ / fulfillment / EACCE / UI | DEFER | No implementation or completion claim |

## Sole authority and lifecycle

**ClinicianPatientAssignment is the ONLY effective patient–clinician clinical grant.** Accepted requests, public locators/publication, memberships, authorship and ADMIN never satisfy clinical authorization. Legacy ACTIVE assignments continue working with no request. No booking is introduced.

A current PATIENT authorizes a currently published provider using its independent public UUID locator. The service resolves the designated clinician internally; public directory data supplies a target, not authority. For legacy confirmation, the patient may instead target their own exact ACTIVE assignment by assignmentId; no clinician publication, public directory row or new grant is required. The designated current CLINICIAN alone can accept/decline. ADMIN/staff/other patients/other clinicians cannot manufacture either side.

`RelationshipRequest` states:

| Operation | Result |
|---|---|
| Patient authorization | New PENDING row, actual patient user/time, designated profile/user/public locator and immutable operation key |
| Clinician acceptance | ACCEPTED, real accept actor/time, exact assignment ID; create ACTIVE assignment if absent, or bind the exact pre-existing ACTIVE legacy assignment unchanged |
| Clinician decline | DECLINED, real actor/time; no assignment |
| Pending patient withdrawal | WITHDRAWN, real patient actor/time; no assignment |
| Accepted patient withdrawal | **Retain ACCEPTED and acceptance actor/time**; separately record first authorization withdrawal actor/time and atomically end the exact bound ACTIVE assignment, or preserve that exact already-ended row |
| Either participant ends relationship | End immutable exact assignment identity. ACTIVE→ENDED is terminal; record new participant end provenance and audit atomically |
| Exact accepted/declined/withdrawn/end replay | Return original retained target, changed=false, no new state/audit/grant; contradictory terminal command conflicts |

Withdrawing/declining a **pending legacy confirmation** does not rewrite the independently valid pre-existing legacy grant; the participant can explicitly end that exact assignment. Only acceptance binds the new authorization to that grant, after which authorization withdrawal atomically ends it. No hidden request predicate is imposed on legacy access.

At most one unresolved PENDING request per pair. An assignment has at most one accepted request binding. Authorization snapshots the exact current legacy assignment (if any) and historical pair assignment count. Acceptance requires the same context: ending the authorized legacy row or an intervening grant invalidates that pending authorization. Withdraw and freshly authorize; no stale consent creates a replacement grant. Re-establishment always uses a fresh request/operation key and a new assignment row. A previously accepted request never reactivates anything.

After A ends and B is established, replaying end(A) or withdrawing A's old acceptance never touches B and never fabricates end audit. Successful accepted withdrawal cannot commit with its bound grant still ACTIVE. The SQL trigger independently enforces this.

## Data, provenance and migration

One additive migration: `20261025190000_v3_i1_relationships`. Thirteen historical migrations remain immutable. New enum `relationship_request_status` has exactly PENDING/ACCEPTED/DECLINED/WITHDRAWN; no existing role enum change.

`relationship_requests` contains exact patient/profile-user, clinician/profile-user and public-provider scope, actual authorization time, immutable operation key, nullable public-provider locator (null for own legacy confirmation), context assignment/count, nullable accepted assignment and separate acceptance/decline/withdrawal actors/times. Composite RESTRICT FKs prevent scope substitution. Unique operation key is scoped to authorizing patient; partial unique pair prevents two PENDING rows; unique accepted assignment prevents ambiguous repeated confirmation. Initial rows must be PENDING. Immutable source/context and terminal decision history cannot be rewritten/deleted/truncated. CHECKs require complete actor/time pairs, finite timestamps and chronology.

`assignment_end_provenance` uses assignment ID as its stable primary identity, exact patient/clinician composite FK, actual PATIENT/CLINICIAN participant actor/role and endedAt. INSERT is allowed only while that exact assignment is ACTIVE and the actor is its active participant. A deferred commit constraint requires the same assignment to be ENDED at that exact time. The fact is inserted before terminally updating the assignment in one transaction; it cannot be attached to an already-ended historical row. No UPDATE/DELETE/TRUNCATE. The original assignment guard is unchanged.

Separating new end provenance avoids adding scalar columns that generated Prisma default-selects would demand from historical migration-stage databases. Existing M1/M2 data and reference identities stay byte-for-byte intact. New tables start empty. No consent, acceptance, membership, specialty or end-actor backfill. All trigger lookups use qualified durable public relations; SECURITY INVOKER, no TEMP substitution or privileged definer function.

## Participant API and privacy

All routes are under `/api/v1`, authenticated current PATIENT/CLINICIAN participant only. Wrong role/other participant/object is generic 404, not a privileged history view. Identity comes from session, never body/path actor fields.

| Path | Methods / input |
|---|---|
| `/me/relationship-requests` | GET/HEAD own incoming/outgoing history; POST exactly `{providerId,operationKey}` OR `{assignmentId,operationKey}` for own ACTIVE legacy confirmation |
| `/me/relationship-requests/{requestId}` | GET/HEAD exact own request |
| `/me/relationship-requests/{requestId}/accept` | PUT `{}`; designated clinician only |
| `/me/relationship-requests/{requestId}/decline` | PUT `{}`; designated clinician only |
| `/me/relationship-requests/{requestId}/withdraw` | PUT `{}`; authorizing patient only, including after acceptance |
| `/me/relationships` | GET/HEAD exact participant assignment history, including legacy rows |
| `/me/relationships/{assignmentId}` | GET/HEAD exact participant relationship |
| `/me/relationships/{assignmentId}/end` | PUT `{}`; either participant, immutable exact identity |

Mutations return 200 `{data:{request,changed}}` or `{data:{relationship,changed}}`. Read detail `{data:item}`; collections `{data:[...],meta:{page,pageSize,total}}`. No auto login/session issuance or relationship effect from GET.

Request providerId is null for legacy-assignment targeting. Request projection allowlist: `id,providerId,patientDisplayName,clinicianDisplayName,status,authorizedAt,acceptedAt,declinedAt,authorizationWithdrawnAt,assignmentId`. No internal user/clinician IDs, email, professionalIdentifier, account/membership data, operation key, audit or clinical payload.

Relationship projection: `id,patientId,patientDisplayName,clinicianDisplayName,status,assignedAt,endedAt,endedByRole`. Patient ID is own for PATIENT; available to CLINICIAN only on an ACTIVE assignment. Ended clinician history masks it to null. End role is null for legacy unknown actor. Minimal participant provenance is not an unrestricted clinical-history endpoint or permanent author entitlement.

Subsequent decisions/end/history depend on actual participants/current account/session and exact request/assignment, not continuing directory publication or clinic membership. Unpublishing a doctor does not silently revoke a clinical grant; explicit ending does. Counterparty disable does not prevent the active participant withdrawing/ending. Acceptance/new authorization require both accounts active.

Exact OpenAPI is [openapi.json](openapi.json). Codes: REQUEST_INVALID/400, AUTH_UNAUTHENTICATED/401, existing CSRF/Origin 403, RELATIONSHIP_NOT_FOUND/404, METHOD_NOT_ALLOWED/405, RELATIONSHIP_CONFLICT/409, REQUEST_TOO_LARGE/413, REQUEST_CONTENT_TYPE_INVALID/415, RELATIONSHIP_UNAVAILABLE/503. Infrastructure errors are sanitized; no raw request/parser/SQL/stack reflection.

## Bounds, replay and HTTP controls

Canonical lowercase UUIDv4 locators/operation keys only. Flat string JSON create; empty-object commands. Reject duplicate keys including escaped aliases, unknown/authority keys, getters/symbols/hidden properties/prototype shapes in service inputs. Snapshot primitive input before any await.

Body max 16384 bytes; raw header aggregate 8192 bytes; URL max 2048 characters. Fatal UTF-8 decoding, exact JSON content type, identity Content-Encoding only, no Idempotency-Key header. Existing Origin/Fetch Metadata/current-session CSRF checks remain mandatory for commands. No CORS relaxation. Canonical paths only, no case/trailing/encoded aliases. History query only canonical unencoded `page`/`pageSize`, each once, default 1/20, max 10000/100. Deterministic order authorizedAt DESC or assignedAt DESC plus immutable UUID ASC. No arbitrary search/filter/sort.

All responses no-store, no ETag/304, HEAD empty. No cache or reusable authorization ticket. History reads lock current actor/session; relationship projections are current operation snapshots, not a claim that already-completed responses can be recalled after a later revocation.

Create idempotency is `(patientUserId,operationKey)` with immutable provider target. Same key/different target or targeting mode conflicts, including after publication withdrawal. Exact retries return original disposition without regrant; terminal-fresh authorization uses new key. Other commands use exact immutable request/assignment URI as intrinsic idempotent identity; there is no pair-targeted end and no operation-key retargeting.

## Transactions, races and revocation

READ COMMITTED; lock_timeout 5s, statement_timeout 10s, Prisma maxWait 5s, transaction timeout 30s. No silent retry after failure.

Mutation lock order:

1. Validate current actor; acquire ROW EXCLUSIVE intent on users, patient_profiles, clinician_profiles and clinician_patient_assignments **before row locks**. This is compatible with normal writes and orders safely against M1 seed's existing SHARE ROW EXCLUSIVE table lock.
2. Immutable target scope, then both participant User rows sorted by UUID, FOR NO KEY UPDATE.
3. Exact actor Session FOR UPDATE; current ACTIVE user/nonrevoked/unexpired session recheck.
4. ClinicianProfile then PatientProfile FOR SHARE; actual profile-user scope and required active counterparty.
5. Pair transaction advisory lock on `hashtextextended('eh-i1-relationship-v1:'+clinicianId+':'+patientId,0)` covers absent-row races; recheck current authority after waiting. Hash collisions only reduce concurrency, never grant authority.
6. Exact assignment FOR UPDATE before request FOR UPDATE. Patient lock stays SHARE; never take patient exclusive then wait for an M2-held assignment.
7. Atomic source/provenance/audit; final actor/session clock recheck before commit. New acceptance rechecks both active participants.

This preserves the existing M2 actor/session/profile/assignment/patient/resource graph; EH-014 patient FOR UPDATE can serialize before ending. Tests use real independent connections, observed pg_blocking_pids, both orderings and rollback winners, actual timeout/deadlock and no stale retry. M1 seed overlapping confirmation binds its original assignment without fixture edits. Direct legacy assignment creation is not a new public V3 enrollment path.

If revocation serializes first, waiting work denies; correctly serialized work may commit before a later revoke. Session time expiry after tentative writes causes rollback at final check. Audit failure rolls back all identity/provenance/grant updates. Public read snapshot rules are not retroactively strengthened to universal serializability.

## Audit and delivery gate

Successful meaningful actions: RELATIONSHIP_AUTHORIZED, RELATIONSHIP_REQUEST_ACCEPTED, RELATIONSHIP_REQUEST_DECLINED, RELATIONSHIP_AUTHORIZATION_WITHDRAWN, CLINICIAN_PATIENT_RELATIONSHIP_ESTABLISHED (new assignment only), CLINICIAN_PATIENT_RELATIONSHIP_ENDED (actual transition only). Real authenticated actor; entity exact immutable UUID; safeMetadata `{}`. No secret, email copy, narrative, request body, before/after payload or duplicate success on retry. Legacy confirmation adds current acceptance truth, never a fabricated historical establishment event.

See [Slice 5 validation](V3_I1_SLICE5_VALIDATION.md) for executed evidence. The dedicated disposable runtime proof is `eh-v3-i1-slice5-bilateral-proof-v1`, 15 meaningful real-HTTP cases; it is not an automatic seed or a change to eh-m1-demo-v1.

Independent review of the exact V3-I1 Slice 5 PR head. Do not merge until review passes and the Product Owner explicitly approves the merge. Slice 6 remains separately unauthorized; V3-I1 remains incomplete.
