# V3-I3 Slice 1 — Medication catalog and prescription source

Authorization: [issue #68 comment 6559193597](https://github.com/abuhmaid28/egyhealth360/issues/68#issuecomment-6559193597). Base `67e132744f7251b5a95e0db246c5e143f6d14442`; accepted [I3 contract](V3_I3_CONTRACT.md). This implementation is only Slice 1. Historical readiness/status documents remain historical evidence.

## Persistence and bounds

Migration 21, `20261101150000_v3_i3_prescription_source`, adds nine tables: medications, medication versions/operations, prescriptions, prescription versions/items/version-items/operations/privacy restrictions. All twenty historical SQL files remain byte-identical. There is no patient/source backfill. The only initial data is three deterministic opaque medication identities with names Paracetamol, Amoxicillin and Saline nasal spray; there is no dose metadata or recommendation. Existing entries have ADMIN-only keyed/versioned display/active/publication maintenance. No arbitrary catalog creation endpoint.

A root captures the consultation, same-patient encounter, exact author, clinic, membership and current assignment used to create it. Draft edits append immutable versions and new item identities. Signing preserves the draft item identities and freezes the payload, catalog name, validity and database signing time. Catalog rename requires an explicit draft edit before signing; deactivation/unpublication prevents new signing. Neither changes old signed payloads. Items carry positive decimal strings, at most nine integer and three fractional digits (`numeric(12,3)`), one to twenty items, nonblank units up to 40 code points and clinician instructions up to 2,000. Reasons are nonblank and at most 1,000 code points, catalog display at most 200. Invalid values are rejected, never truncated. Array/accessor/prototype/unknown/duplicate JSON keys and invalid UTF-8 are rejected. HTTP bodies are bounded to 16 KiB, URLs to 2 KiB and headers to 8 KiB.

Validity is explicit offset-bearing `validFrom < validUntil`, canonicalized to millisecond UTC instants. `validUntil` must remain future at signing, checked again after tentative audit and by deferred constraints at commit. Signing before `validFrom` is allowed. Eligibility is current state SIGNED and `validFrom <= clock_timestamp() < validUntil`. It is a source status, with no pharmacy entitlement in Slice 1. Every item projects `NOT_DISPENSED`; there are no fulfillment tables or commands.

## Lifecycle, correction and privacy

DRAFT → SIGNED → CANCELLED or REPLACED. Every transition is append-only. Signed content cannot be updated/deleted, and version-item bindings cannot be appended to a committed snapshot. Cancellation preserves items, original validity/signing time, provenance and reasoned history. Replacement atomically creates a new signed root with fresh items, explicit new validity, same patient/consultation/author and immutable predecessor lineage, then appends the predecessor's REPLACED transition. Both roots, operation and audit commit together. Failure preserves the predecessor and consumes no operation key.

Only OPEN consultations accept independent new drafts. Existing drafts can be edited/signed and existing sources cancelled/replaced/restricted after close by the same exact treating author, with all current assignment/session/clinic checks. Close does not sign anything.

Privacy is a separate append-only reasoned restriction of the entire prescription lineage. No cross-patient move or implicit copying. Every ordinary list/detail and keyed replay filters the restriction before counts, payload, IDs, references or conflict disclosure. Only an identical privacy command under current exact-author authority returns `{restricted:true}` after restriction; changed keys/payloads cannot expose the restricted target. Other I2 modules' restrictions are independent and no I2 clinical content is copied.

## Authority and transport

| Actor | Catalog | Source reads | Source writes |
|---|---|---|---|
| Exact treating author | Active published selections | Own draft/signed material, current assignment and originating clinic authority | Current session, active clinician/profile, current active unended assignment, exact consultation author and current clinic/membership/affiliation |
| Patient | None | Own signed history, including cancelled/replaced | None |
| Other clinician | Active published selections | Signed material only through own current active assignment | None |
| ADMIN | Operational inventory and bounded maintenance | None | None |
| LAB_STAFF / PHARMACY_STAFF | None | None | None |

Booking, authorship, directory publication, membership or role alone grants no clinical access. Signed patient/current-clinician reads remain available if the original author loses authority or the source clinic is suspended. Patient/general-clinician projections omit draft version numbers and all draft history. Signed history includes only signed/terminal transitions. Author detail supplies the optimistic version for the next command. Lists are deterministic newest-root-first, tie-broken by UUID, page 1–10,000 and pageSize 1–100 (default 20), filtered before count/pagination.

Routes use `/api/v1` and the existing session, CSRF, Origin/Fetch Metadata, safe error, HEAD and no-store conventions:

- `GET/HEAD /medications`; `POST /medications/:medicationId/settings`.
- `GET/HEAD/POST /consultations/:consultationId/prescriptions`.
- `GET/HEAD /consultations/:consultationId/prescriptions/:prescriptionId`.
- `POST` under that source: `/edits`, `/sign`, `/cancellations`, `/replacements`, `/privacy-restrictions`.
- `GET/HEAD /me/prescriptions[/:prescriptionId]`.
- `GET/HEAD /patients/:patientId/prescriptions[/:prescriptionId]`.

Every mutation uses a UUIDv4 body operation key. Every non-create command except privacy uses `expectedVersion`. No generic PATCH, caller identity, signing time, route, destination, dispensing, refill or substitution fields. Missing, unauthorized and restricted clinical targets return the same 404; malformed input 400; revoked session 401; request defenses 403; authorized nonrestricted conflicts 409; transaction failures 503.

## Replay, audit and concrete lock graph

Canonical validated payloads include target, expected version, item order/data, normalized exact quantity/instants, reason and command fields. Operations are unique by actor/command/key; catalog operations have their separate command ledger. Exact replay retains the operation's result version under current authority/privacy. It also projects `currentState` and current eligibility, so a retained signed outcome after cancellation cannot appear eligible. Replays append no rows or audit. Changed payload conflicts only after authorization/privacy of both requested and previous targets. Prior scope is discovered before transaction locking and re-read under the actor lock; a newly appeared cross-scope key safely denies until an explicit retry can lock both scopes.

The transaction locks, in order: I2 compatibility table modes; sorted actor/patient user rows FOR NO KEY UPDATE; current session FOR UPDATE; clinician/profile and sorted active assignment rows FOR SHARE; patient profiles; sorted specialty, organization, clinic directory, exact membership, provider, affiliation and scheduling rows; sorted existing I2 patient advisory key `(1162359376, hashtext(patient))`; clinician advisory key `(1162359363, hashtext(clinician))`; sorted consultation/encounter rows; source root; sorted catalog identities FOR SHARE during item selection/signing. Catalog maintenance locks its current ADMIN user/session then catalog identity FOR UPDATE. These conflict with existing assignment-end/withdraw, session revoke, membership end, organization suspension and affiliation withdrawal writers. The patient user/advisory locks serialize privacy with all ordinary projections. No new private revocation lock protocol is assumed.

Checks run after waits, immediately before mutation response and again immediately before commit. Database clock governs session expiry and validity. Timeouts are lock 5 s, statement 10 s, transaction 30 s; no automatic mutation, timeout or deadlock retry. Connection errors are handled without printing driver/clinical payload. Uncertain commit requires the caller to retry the identical key/command explicitly after reauthorization.

Clinical history contains sensitive reasons/instructions. Generic AuditLog contains only actor, action, opaque entity, database time and empty safe metadata. Deferred foreign keys/completeness triggers require the exact result and minimized matching audit; audit failure rolls back the entire operation. All source, item, transition, operation, privacy and catalog history rows reject update/delete/truncate.

## Verification

Focused tests: `tests/prescriptions.test.mjs` and `tests/integration/prescriptions*.test.mjs`. Real two-connection barriers observe actual blocking PIDs; no mocked database race outcomes. Cases cover sign/sign, expected-version edits, both orders of assignment/session/membership/org/affiliation/user revocation, cancel/replace, privacy versus sign/edit/cancel/replace/read/replay, forced rollback, audit failure/key reuse, expiry after waits/audit, lock/statement timeout, deadlock and connection loss. Populated upgrade proof retains genuine I2 signed documentation, released follow-up intent and a closed consultation. Historical checksum fixture is pinned separately. OpenAPI is additive; removing only the I3 blocks restores the exact baseline SHA-256 `d909bd9a8130f6db9d3c9b4ccfb16f8a69950416bf77180d309ffd27da0f9594`.

`node scripts/verify-prescription-runtime.mjs` runs an isolated synthetic HTTP journey with real finite availability, Booking, bilateral assignment and database-clock consultation opening, then draft/edit/sign/read/replace/cancel/privacy/replay/revocation. CI runs it in the built Docker runtime alongside preserved I2 verifiers. Final command counts, exact-head CI and audit evidence are recorded in the PR handoff after validation.

No pharmacy routing/acceptance/dispensing, lab, imaging, reported actual use, I4/I5/EACCE, notifications, UI expansion or production-domain promotion is included.
