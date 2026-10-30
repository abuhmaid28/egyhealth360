# V3-I2 Slice 6 — Follow-up Intent

Status: production implementation present; verification/CI integration pending.
Checkpoint 1 `4e868c7` and checkpoint 2 `fb67fa5` published; no merge authorized.
Baseline `42b59da01e591f9c4792b81c2cb9b48a0a00cd2d`. Exact-main Bootstrap
41008236990 / validate 123907937943 COMPLETED / SUCCESS verified through GitHub.
[Preload](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6515751851)
and [authorization](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6524790227)
apply subject to this reconciliation. The current user authorization supersedes
stale Slice 5/6 status paragraphs; historical validation evidence remains unchanged.

## Repository-wide reconciliation

All eighteen migration SQL files were read in order, against current Prisma,
Booking, Consultation/Encounter, documentation, authorization, EH-012 service/API,
contracts and tests, OpenAPI, migration verifier and runtime verifiers.
Historical SHA-256 bytes are pinned in
[checksum fixture](../tests/fixtures/v3-i2-slice6-migration-checksums.json).

| Migration | Compatibility conclusion |
|---|---|
| EH-005 | Preserve five identity/assignment/audit tables, partial ACTIVE pair uniqueness and immutable assignment/audit history. Current assignment is the only clinical grant. |
| EH-006 | Preserve session identity, expiry/revocation and current checks after waits. |
| EH-009 | Preserve exact clinical catalog; human follow-up text invokes no clinical rule. |
| EH-010 | No plan prerequisite, lifecycle change or new rule/template link. |
| EH-011 | No BP creation, copying, reassignment or time-policy change. Reuse strict timestamp value validation only. |
| EH-012 | Preserve appointment SCHEDULED/CANCELLED, non-idempotent create, post-time cancellation, HTN encounters/BP associations and provenance. No appointment FK or adapter. |
| EH-013 | No coverage writes or new normalized completion/scheduling evidence. |
| EH-015 | No applicability fact or research-input reinterpretation. |
| BP correction/invalidation | Independent wrong-patient suppression pattern only; no BP privacy target propagation. |
| EH-014 | No action/decision/input FK or completion bridge. Immutable INITIAL provenance unchanged. |
| I1 staff roles | ADMIN/LAB_STAFF/PHARMACY_STAFF receive no clinical shortcut. |
| I1 organizations | Source ACTIVE clinic and exact current membership required for writes; read release authority independent of source state. |
| I1 directory | Preserve specialty/org/clinic/member/provider/affiliation lock order; public flags are not ongoing clinical entitlement. |
| I1 relationships | Reuse current ACTIVE/null-ended assignment and bilateral termination discipline; no assignment writer. |
| I2 availability | Preserve EH2P then EH2C namespaces; never publish/reserve/withdraw availability. |
| I2 bookings | Sole operational booking authority, immutable identity and replacement history. Link only an existing same-patient BOOKED row. |
| I2 consultation opening | Root references exact immutable consultation/encounter/patient/treating author; GENERAL_CONSULTATION remains separate from HTN history. |
| I2 documentation | Separate roots, versions, privacy and operation ledgers. Reuse bounded current-authority/read projection patterns without copying private documents. |

No material product-policy conflict was found. D13/D15/D24 and I2 §§12–15 permit
the preload's distinct intent and explicit link model. No legacy lock-order
change is required. The following technical deltas clarify the proposed contract:

1. The five new tables bring 43 domain tables to 48; migration 19 is additive.
   Only supporting unique keys on consultations/bookings are added to old tables;
   no old row rewrite, backfill, trigger replacement or historical SQL edit.
2. The broad existing documentation boundary owns `/consultations/*`. It must
   delegate only the new follow-up-intent family to its own strict boundary;
   existing document routing/parser semantics stay intact.
3. Author lists include own draft roots and the latest version of released roots;
   released lists contain only released roots/latest released version. The preload's
   phrase “latest visible released version” does not hide the author's own draft.
4. Exact detail independently pages versions and links. Empty link history is valid
   on default linkPage=1 when no link exists; explicitly exhausted nonempty history
   or version history returns scoped 404. Otherwise an unlinked intent could never
   be read. All page limits/defaults remain the preload's 1/20, 10000/100.
5. Replay retains version/link result ceilings while calculating current effectivity
   and current booking state. Cancelled/rescheduled historical linked bookings remain
   readable on replay; the original admission requirement BOOKED is checked only for
   a new link. Current source/assignment/privacy checks still apply. Changed payload
   conflicts only after scope and privacy checks; privacy replay returns a safe ack.
6. Multi-provider links gather immutable booking/slot identities as hints before
   locking. Acquire all involved Users sorted, actor session, involved clinician
   profiles sorted, exact actor assignment, patient, directory stages sorted within
   each table, settings sorted, EH2P, all EH2C sorted, slots sorted, bookings sorted,
   consultation/encounter, root and child histories, then ledger. Revalidate hints
   under locks; never discover another lock target and acquire an earlier lock late.
   Replacement includes both old linked booking and requested target in that set.
7. Target booking identity/state is logistics only: neither target-provider assignment
   nor a separate booking read entitlement is granted or required by the reference.
   Source clinical authority is mandatory. Cross-patient/missing targets return 404
   before target state; authorized same-patient invalid state returns 409.
8. SQL enforces structural identities, chain transitions, operation/result ownership,
   DB times and atomic minimized audit completeness using deferred guards. Session
   authentication remains application-owned, as in existing migrations. No claim of
   protection against schema owners/superusers.
9. Audit completeness uses a unique operation audit locator and a deferred exact
   actor/action/root/empty-metadata/current-transaction existence check. No audit FK
   is needed: one would change legacy audit TRUNCATE rejection precedence before
   its existing append-only guard. Historical audit behavior is preserved.
10. No close endpoint is added; current consultations are immutable OPEN sidecars.
   Intent creation/release/correction does not change consultation or documentation.

## Stable implementation contract

The full preload is adopted only with the deltas above. Human instruction 1–2000
Unicode scalars, reason 1–1000; C0/C1 rejected except LF; no trim/inference.
`desiredWindow` is null or exact `{startAt,endAt,timeZone}`, finite real-calendar
EH-012 timestamp syntax, explicit offsets matching the IANA zone at each instant,
UTC normalization to three fractional digits; start < end; no future-only rule.

All paths below are relative to `/api/v1`; canonical lowercase UUIDv4 throughout.
Exact JSON bodies, no mutation query or Idempotency-Key.

| Method | Path | Body |
|---|---|---|
| POST | `/consultations/{consultationId}/follow-up-intents` | instruction,desiredWindow,operationKey |
| GET/HEAD | same collection and `/{intentId}` | author/current assignment; list page/pageSize; detail also linkPage/linkPageSize |
| POST | `/{intentId}/sign-release` beneath collection | expectedVersion,operationKey |
| POST | `/{intentId}/corrections` | expectedVersion,predecessorId,reason,instruction,desiredWindow,operationKey |
| POST | `/{intentId}/booking-links` | bookingId,expectedLinkVersion=0,operationKey |
| POST | `/{intentId}/booking-links/replacements` | previousLinkId,bookingId,expectedLinkVersion,operationKey |
| POST | `/{intentId}/privacy-restrictions` | versionIds (1–100 unique),reason,operationKey |
| GET/HEAD | `/me/follow-up-intents` and `/{intentId}` | own patient released only |
| GET/HEAD | `/patients/{patientId}/follow-up-intents` and `/{intentId}` | current related clinician released only |

New draft/correction/link returns 201; replay 200; sign-release/privacy 200.
Intent shape: `{id,consultationId,versions,links,history,linkHistory}`. Version:
`{id,version,state,instruction,desiredWindow,createdAt,signedAt,releasedAt,reason,predecessorId,effective}`.
Released readers omit version sequence and draft predecessors. Link:
`{id,bookingId,previousLinkId,linkedAt,bookingState}` only. Counts filtered before
pagination in one SQL snapshot; createdAt DESC/id ASC roots; newest-first pages
with ascending sequence inside each page. No internal actor/patient/profile/grant
or operation identity projection. Any restricted version suppresses entire root,
links, identifiers/counts/replay. No forensic route.

SQL root preserves exact provenance; versions are DRAFT 1, SIGNED_RELEASED 2 with
identical content, then reasoned released corrections of the immediate head.
Immutable links have linear same-root/patient predecessors; replacement only when
prior booking CANCELLED/RESCHEDULED and different target BOOKED. Different roots
may reference the same booking. Operations retain SHA-256 canonical command/path/
payload and result identities, never cached narrative. One genuine fixed-action
empty-metadata audit per successful new command; failures fully roll back; no retry.

HTTP: strict JSON/decoded duplicate keys/fatal UTF-8/scalar bounds; 16KiB body,
8192 raw headers/2048 URL; exact media/encoding, Origin/Fetch Metadata/session CSRF;
no-store, no ETag/Last-Modified/304, safe HEAD; sanitized 400 REQUEST_INVALID,
401 AUTH_UNAUTHENTICATED,403 AUTH_CSRF_INVALID,404 FOLLOW_UP_INTENT_NOT_FOUND,
409 FOLLOW_UP_INTENT_CONFLICT,405 METHOD_NOT_ALLOWED,413 REQUEST_TOO_LARGE,
415 REQUEST_CONTENT_TYPE_INVALID,503 FOLLOW_UP_INTENT_UNAVAILABLE.

## Verification obligations and Lane A

Real PostgreSQL observed-blocker proofs: authority ending/withdrawal, clinician and
patient disable, session revocation/expiry, source org/member/affiliation loss vs
all writes; commit/rollback and both orders; duplicate keys/competing corrections/
replacements; booking cancel/reschedule/open/no-show vs links; different provider
same patient; privacy vs writes/replay; audit/constraint failure, timeout/deadlock,
rollback key reuse and no retry. EH-012 cross-table/API regression and no CareAction/
EACCE bridge. Fresh deploy/status/redeploy and populated 18→19 preservation of all
43 tables and old ledger; ordinary SQL bypass/immutability tests.

CI `.github/workflows/ci.yml` belongs to Lane A and is untouched. Planned command:
`docker compose exec -T api node scripts/verify-follow-up-intent-runtime.mjs`.
After Control Center confirms Lane A merge, normally merge main and wire into its
accelerated architecture, then full exact-head Bootstrap. No duplicate CI rewrite.

Follow-up Intent ≠ Booking ≠ historical FollowUpAppointment. Intent is not CareAction
completion or EACCE. Booking clinical authority ZERO. No frontend, I3, EACCE,
notifications, automatic scheduling, inference, destructive migration or deployment.
