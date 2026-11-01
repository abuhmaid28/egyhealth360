# V3-I3 Slice 2 — Pharmacy routing and full-item dispensing

[Owner authorization](https://github.com/abuhmaid28/egyhealth360/issues/68#issuecomment-6560093094), accepted [I3 contract](V3_I3_CONTRACT.md), and merged [Slice 1](V3_I3_SLICE1.md) govern this bounded implementation. Base main: `b4cecd39a6323e0241663ff3870d42660459a57a`. This is Slice 2, not I3 completion. Laboratory and later milestones remain outside scope.

## Persistence and lifecycle

Additive migration 22, `20261101170000_v3_i3_pharmacy_fulfillment`, adds PharmacyRoute, PharmacyRouteItem, PharmacyRouteVersion, PharmacyDispense, PharmacyDispenseCorrection and PharmacyOperation. All 21 historical SQL files, including migration 21, remain unchanged. Upgrade creates no routes, accepts, dispenses or corrections. Existing items remain NOT_DISPENSED until an actual committed dispense exists.

A route binds one signed source, exact source items (1–20), same patient and one active PHARMACY destination. The server records the exact source author/current assignment, destination and database time. Routing contains identifiers/provenance, without copied source instructions or narrative. Each item has an immutable binding chain. Database item/root locks and predecessor/sequence uniqueness prevent a second active destination even independently of controller checks. An existing committed route cannot gain new item bindings.

Recorded route transitions are PENDING → ACCEPTED or PENDING → WITHDRAWN. Whole-route withdrawal is reasoned and only allowed before acceptance. Reroute atomically appends old WITHDRAWN and a fresh PENDING route for the exact same items at a different active pharmacy, preserving predecessor, both destinations, reason and actor/time. Failure leaves the original route unchanged. Accepted routes cannot be moved or withdrawn. Completion derives from all bound items having committed dispense facts; cancellation/replacement/expiry derive from current source state/time and preserve recorded history. There is no expiration worker or fabricated terminal event.

Staff explicitly accept before dispensing. Acceptance is operational and may precede validFrom, just as routing may; neither is a clinical grant or dispense. A dispense requires `validFrom <= clock_timestamp() < validUntil` and a current SIGNED, unrestricted source. Checks run after waits, after tentative audit and before commit, with a deferred database eligibility guard. A database unique constraint on item_id permits exactly one fact across every route. Medication identity/display, exact prescribed quantity/unit, actual staff, exact current membership, pharmacy and database time are server-resolved and immutable. There is no caller quantity, substitution or partial accumulation.

Correction appends a bounded reasoned annotation. Reversal appends a terminal REVERSAL annotation; it never deletes/modifies the original fact or returns the item to NOT_DISPENSED. Optimistic correction version starts at zero; every event records predecessor, actor, membership, organization and time. After reversal, no further correction or second dispense is permitted for that item. Further dispensing requires an independently signed new source and fresh routing. Each item projects only NOT_DISPENSED or FULLY_DISPENSED, with a separate explicit reversed flag/history for erroneous original facts.

## Authority and privacy

| Actor | Granted scope |
|---|---|
| Current exact source author | Route/withdraw/reroute with active clinician/profile, valid session, own current active assignment and originating clinic/membership/affiliation; existing signed source may be routed after consultation close |
| PHARMACY_STAFF | Exact routed artifact plus active user/current session, active PHARMACY organization and exact current active/unended membership; no patient clinical grant |
| Patient / currently assigned clinician | Existing permitted signed-source reads with truthful routing/dispense/correction history |
| ADMIN / LAB_STAFF | No fulfillment payload or commands |

ClinicianPatientAssignment remains the sole clinical grant. Booking, authorship, role and membership alone do not grant clinical access. Staff never use the prescriber's assignment as their grant: ending that relationship denies clinician access but does not cancel an otherwise valid routed artifact. Staff user/session/membership/organization revocation denies subsequent staff access; previous acceptance/authorship does not grandfather it. Patient/current-clinician historical reads remain independent of recipient pharmacy suspension.

Normal pharmacy queue/detail purpose is `fulfillment`: exact own-organization PENDING/ACCEPTED artifacts with remaining undisposed items, signed/unexpired source and current privacy. Completed, cancelled, replaced or expired accepted artifacts are accessible only via explicit `purpose=history`, with actual dispense/correction data, no patient display name or source instructions. Withdrawn pending routes have no staff history entitlement. Corrections can target a genuine own-route fact after source cancellation/expiry under current staff/org/membership and privacy checks. Exact mutation receipts may show current completion, never revive entitlement; accept/dispense replay after source cancellation/replacement/expiry is denied. Correction/reversal receipts retain bounded correction authority.

Queue/detail filter before counts and pagination. Staff see only their exact route and its items; unrelated route lineage, consultation/encounter/patient-profile identifiers, private notes and other records are excluded. Source readers retain their own permitted full routing lineage. Source item routing/correction histories are bounded and paginated: list summaries show latest one, detail defaults to page 1/20, maximum 100. Total/page metadata identifies remaining preserved history. Staff history purpose includes only actually dispensed items.

Slice 1 append-only wrong-patient restriction suppresses the entire source lineage across pharmacy payload, IDs, route references, queue counts, history, mutation receipts and conflicts. It is checked before replay or changed-payload conflict disclosure. No forensic endpoint, ADMIN override or cross-patient move exists.

## Transactions, locks, replay and audit

Clinician route commands compose with the existing Slice 1 author transaction rather than introducing an alternative clinical authority check. Its sorted user/session/profile/assignment/originating-clinic locks, patient/clinician advisory locks and source locks remain intact. Routing additionally locks affected pharmacy organization rows in sorted order, source items and route roots. Staff mutations lock sorted own/patient user rows, exact session, sorted recipient organizations, server-resolved current membership rows, the existing patient advisory key `(1162359376, hashtext(patient))`, sorted source roots, route/item/fact roots. These row modes conflict with actual session revoke, user disable, membership end and organization suspension writers. Staff perform no prescriber assignment check.

Queue readers lock their own current user/session/recipient organization FOR SHARE and exact current membership. Additive triggers on actual source CANCEL/REPLACE/privacy INSERT writers acquire affected recipient organization rows FOR UPDATE, including every destination in a restricted lineage. Thus queue read first can finish before restriction commits; restriction first blocks and then removes content/counts before the queue snapshot. Single-artifact commands/reads also coordinate through the existing patient row/advisory locks. No private lock substitutes for revocation writers. The real barrier tests observe actual pg_blocking_pids for both relevant commit orders.

All mutations require canonical UUIDv4 operation keys scoped by actor/command. Fingerprints include targets, sorted exact item set, expected version, destination and reason. Current requested/prior artifact authority and privacy are checked before retained results or conflict. Exact replay adds no fact/history/audit. Rollback consumes no key. Replay projects current route state/correction history and rechecks current source eligibility for fulfillment receipts. Transactional reads stay on the checked-out connection, including retained-target checks, so concurrent receipts cannot exhaust the four-connection pool by waiting for another connection while holding locks.

Lock/statement/transaction timeouts are 5/10/30 seconds. Server clock and current authority are rechecked after waits and before commit. Deadlock, timeout and connection loss return safe failure with no automatic clinical retry. An uncertain commit requires an explicit identical command/key retry after current checks. Transactions with unknown failures, transport errors or failed rollback discard the checked-out connection rather than returning a potentially disconnected client to the pool before its asynchronous disconnect event arrives. Audit/result/version/fact/correction commit together through deferred FKs/completeness guards. Generic AuditLog carries only actor, action, opaque route entity, server time and empty safe metadata; sensitive reasons remain in artifact history. All committed route, binding, transition, fact, correction and operation rows reject UPDATE/DELETE/TRUNCATE.

## Bounded API

All routes use `/api/v1`, current sessions, CSRF for POST, Origin/Fetch Metadata checks, strict JSON/unknown-field/duplicate-key rejection, UUIDv4 identities, 16 KiB bodies, 2 KiB URLs, 8 KiB headers, safe HEAD/no-store and uniform privacy-safe denials. No generic PATCH, staff patient search, inventory or pharmacy general source browser.

- GET/HEAD `/pharmacy-destinations`: current clinician sees active pharmacy identities/names only; no patient grant.
- POST `/consultations/:consultationId/prescriptions/:prescriptionId/pharmacy-routes`: expected source version, itemIds, destinationId, operationKey.
- POST under that collection `/:routeId/withdrawals` or `/reroutes`: expected route version, reason, operationKey; reroute also requires destinationId.
- GET/HEAD `/pharmacies/:pharmacyId/routes[/:routeId]`: page/pageSize and explicit optional purpose=fulfillment/history. Filter before counts; no arbitrary patient/search filters.
- POST `/:routeId/accept`: expected route version and operationKey.
- POST `/:routeId/items/:itemId/dispenses`: expected route version and operationKey, no clinical content.
- POST `/:routeId/dispenses/:dispenseId/corrections` or `/reversals`: expected correction version (initial zero), reason and operationKey.

Source signed list/detail remains the patient/current-clinician entrypoint. Existing source detail page/pageSize also pages per-item routing/correction history. Bounds are page 1–10,000 and size 1–100; reasons nonblank and at most 1,000 Unicode code points. Unauthorized/absent/restricted or ineligible ordinary staff artifacts deny uniformly (404); current session failure 401, request defenses 403, validated nonrestricted conflict 409, transaction/uncertain commit 503. No actor, membership, patient, dispense time, quantity or medication injection is accepted.

## Evidence

Focused tests: `tests/pharmacy.test.mjs` and `tests/integration/pharmacy*.test.mjs`. Coverage includes actual PostgreSQL route/route, accept/reroute, dispense/dispense, cancel/replace, correction/reversal, current staff revocation, source privacy versus queue/read/replay/mutation and source validity races; pool saturation, audit failure, forced rollback/key reuse, lock/statement timeout, deadlock, connection loss, immutable facts, direct SQL uniqueness and allocation guards, bounded projections and exact HTTP defenses. Populated 21→22 upgrades preserve signed/cancelled/replaced/restricted/draft sources and all historical values/checksums, add zero fulfillment rows and repeat ZERO_WRITE. Static schema/catalog fixtures pin every additive database object without relaxing legacy guards.

`node scripts/verify-pharmacy-runtime.mjs` runs an isolated actual HTTP journey: clinician login/draft/sign, active pharmacy selection, explicit routing, staff login/queue/accept/dispense, patient FULLY_DISPENSED history, reversal, duplicate prevention, source replacement/cancellation, privacy and membership/org revocation. CI invokes it inside the built Docker runtime alongside preserved Slice 1 and I2 verifiers. Final test counts and exact-head CI evidence are recorded in the PR handoff.

No laboratory implementation, partial dispense, refill, substitution, inventory/payment/delivery, actual-use/adherence inference, notifications, I4/I5/EACCE/AI, unrelated UI or production promotion is included. `egyhealth360.vercel.app` is untouched.
