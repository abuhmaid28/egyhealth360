# V3-I2 Slice 4 — Consultation Opening

Status: IMPLEMENTED / IN REVIEW, not COMPLETE. [Issue #48 authorization 6485213892](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6485213892) is the exact Fast-Track boundary. Starting main `b82553e1eb16aac19f9aab24a0bca011217d6dd4` includes completed Slice 3, live booking UI and English/Arabic/RTL. This PR changes no frontend/UI or dependencies. Main run 40799635564 must succeed before handoff. Issue #48 stays OPEN; independent exact-head review required; DO NOT MERGE.

## Exact live command and projection

`POST /api/v1/me/bookings/{bookingId}/consultation` accepts exactly `{operationKey}`. Path and key are canonical lowercase UUIDv4. Returns 200 `{data:{id,encounterId,bookingId,state,bookingState,openedAt,providerId,clinicId}}`: id is the new consultation locator, state OPEN, bookingState IN_CONSULTATION; provider/clinic are public locators. No patient/profile/user/assignment/member/affiliation IDs, contacts, operation key, audit or clinical payload. No consultation read/close/document route is introduced.

Retains current I2 exact media/encoding, fatal UTF-8, duplicate decoded-key rejection, strict flat fields, 16KiB body, 8192-byte raw headers, 2048-byte URL, query/Idempotency-Key rejection, Origin/Fetch Metadata/session-bound CSRF. No-store on all outcomes, no ETag/Last-Modified/304; HEAD is unsupported (405, empty body). Uniform scoped 404 precedes state conflict; 400 shape, 401 current session, 403 browser security, 409 authorized state/key, 405/413/415, sanitized 503. No caller identity/timestamp/status or clinical fields.

## Current authority and timing

Only exact booked current ACTIVE CLINICIAN/profile with valid session may open. Exact ACTIVE/null-ended ClinicianPatientAssignment remains the sole clinical grant. Patient must be ACTIVE with matching current profile. Exact booked clinic must remain ACTIVE CLINIC, exact clinician membership ACTIVE/unended, exact provider/profile/specialty/clinic/affiliation identity current and affiliation unwithdrawn. Current scheduling settings must exist. No public publication flag is required for ongoing clinical scope (frozen I2 section 17); public discoverability never creates clinical authority. Regrant does not retarget old membership/affiliation provenance.

BOOKED only, at/after scheduled start according to current DB time. Late opening is allowed without a fabricated cutoff. No ad-hoc opening or clinician substitution. Booking never accepts/creates/revives a relationship/assignment or consent. ADMIN and other staff have zero clinical authority.

## Atomic state and immutable provenance

One transaction commits BOOKED→IN_CONSULTATION, one immutable GENERAL_CONSULTATION ClinicalEncounter, one Consultation sidecar, OPEN booking event, retained operation result, minimized audit and explicit ATTENDED if attendance was UNKNOWN. Existing ATTENDED stays unchanged. NO_SHOW (including subsequently corrected terminal booking) cannot open. Opened booking cannot cancel, reschedule or receive contradictory attendance. No consultation close or new clinical documentation exists.

Consultation separately retains booked clinician, actual treating clinician, opening recorder, exact assignment, patient/user, clinic/provider/membership/affiliation, slot and immutable scheduled start/end/timezone. Slice 4 enforces booked=treating=current actor; no substitution. General encounter trigger assigns actual occurredAt/createdAt from database clock; sidecar openedAt copies that DB-owned instant, never request time.

Migration `20261029090000_v3_i2_consultation_opening` is migration 17. Only one new table/model: consultations (39 domain tables/models). Composite RESTRICT booking/encounter/assignment/patient/clinician identity FKs, unique booking and encounter, immutable sidecar/history guards, and deferred complete-link checks reject partial opening/orphan general encounter. Operation/event/attendance history remains append-only. No old row/backfill. Existing booking patient/clinician GiST [start,end) exclusions and unique slot capacity remain active for BOOKED and IN_CONSULTATION. Occupied slot withdrawal remains denied. Owners/superusers are outside ordinary-write protection.

## Locking and replay

New opening path only: compatible four M1 table ROW EXCLUSIVE intents before row locks → involved Users sorted UUID NO KEY UPDATE → actor Session UPDATE/current actor checks → ClinicianProfile SHARE → exact ACTIVE Assignment SHARE → PatientProfile SHARE → Specialty SHARE → Organization SHARE → ClinicDirectory SHARE → Membership SHARE → ClinicianDirectory SHARE → Affiliation SHARE → current settings SHARE → EH2P patient advisory (1162359376,hashtext(patient profile UUID)) → EH2C clinician advisory (1162359363,hashtext(clinician profile UUID)) → exact slot UPDATE → booking UPDATE → consultation scope → operation/history. Advisory keys are server-derived transaction scoped and held to commit. No late User, booking→slot, target→assignment, or nested legacy BP call. No legacy runtime lock order changes. The HTN encounter trigger branch is unchanged; the new general branch does not reacquire its earlier clinical prefix.

Fresh current session/user/assignment/clinic checks follow relevant waits, precede mutation and run again before commit; final DB clock/state admission is in the guarded booking UPDATE. READ COMMITTED; lock 5s, statement 10s, transaction 30s, acquisition 5s. No automatic retry on timeout/deadlock/serialization failure.

Reuse bounded BookingOperation ledger, adding command OPEN. Actor+command+UUIDv4 operation identity, SHA256 canonical immutable booking payload; same key/same target returns retained privacy-safe result after current authority, with no duplicate sources/history/attendance/audit. Changed target conflicts after full authorization; rollback does not consume key. Existing booking commands retain their original identities/projections.

## Audit and legacy compatibility

One `CONSULTATION_OPENED` / `consultation` audit records genuine actor, exact consultation id, DB clock and `{}` metadata. No clinical or operational request values in metadata. Audit failure rolls back booking, attendance, encounter, sidecar, event and operation.

EH-012 HTN creation/list/count/encounter-BP APIs remain HTN-only. Legacy list/count and exact encounter lookups explicitly filter HTN_BP_FOLLOWUP; normalized encounter and BP candidate queries do likewise. General encounters cannot be linked through legacy BP routes or qualify as historical HTN evidence. Existing FollowUpAppointment/BP correction/privacy/action/plan semantics and historical SQL remain unchanged.

## Evidence and exclusions

See [validation](V3_I2_SLICE4_VALIDATION.md). Real PostgreSQL independent connections and observed pg_blocking_pids prove competing open/replay/rollback, cancel/reschedule/no-show versus opening, assignment/accepted withdrawal/membership/org/user/session/affiliation revocation, expiry, audit failure, timeout/deadlock; all legacy gates retained. Dedicated real-HTTP/database-clock runtime is additive after booking in Bootstrap.

Not implemented: close, complaint/problems/diagnoses/allergies, notes, summaries/release, documents/addenda/corrections/privacy restrictions, follow-up intent, prescriptions/orders/labs/pharmacy, clinical completion bridge, I3/EACCE, UI, notifications/payments/video, walk-in/substitute clinicians. Slice 5 NOT IMPLEMENTED. V3-I2 INCOMPLETE.
