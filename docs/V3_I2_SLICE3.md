# V3-I2 Slice 3 — booking lifecycle

Status: IMPLEMENTED / IN REVIEW, not COMPLETE. Issue #48 authorization [6458202424](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6458202424); Slice 2 COMPLETE [6458195665](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6458195665). Starting main `9252a1f06b9a851c09b7410882f9e4c0fddd4c53`, exact-main Bootstrap 40611369257 / validate 122563422273 SUCCESS. Fifteen historical migrations are immutable. PR #52 / UI track is independent and untouched.

## Frozen HTTP contract before implementation

All paths below use `/api/v1`. No other Slice 3 routes are live. Mutations return 200 `{data:booking}`; lists return `{data:[booking],meta:{page,pageSize,total}}`; detail returns `{data:booking}`. All protected operations use current session and actor authority, no-store, identical bodyless HEAD checks, existing Origin/Fetch Metadata/CSRF and strict 16KiB flat JSON, fatal UTF-8, duplicate/unknown-key rejection, canonical lowercase UUIDv4, bounded URL/headers. No mutation query or Idempotency-Key. Safe existing 400/401/403/404/405/409/413/415/503 hierarchy; inaccessible targets uniformly 404 before state conflicts.

| Route | Method | Exact body / query |
|---|---|---|
| `/me/bookings` | GET/HEAD | patient own history; page/pageSize only |
| `/me/bookings` | POST | `{slotId,operationKey}`; patient identity derived |
| `/me/bookings/{bookingId}` | GET/HEAD | exact patient/booked clinician; no query |
| `/me/bookings/{bookingId}/cancel` | PUT | `{operationKey,expectedVersion}` |
| `/me/bookings/{bookingId}/reschedule` | PUT | `{slotId,operationKey,expectedVersion}` |
| `/me/bookings/{bookingId}/attendance` | PUT | `{observation,operationKey,expectedVersion}` |
| `/me/bookings/{bookingId}/attendance/correct` | PUT | `{observation,reason,operationKey,expectedVersion}` |
| `/me/schedule` | GET/HEAD | exact clinician history, page/pageSize only |

Observation is exactly ATTENDED or NO_SHOW. Correction reason is 1–1000 Unicode scalars, no controls/unpaired surrogates; no silent truncation. It is protected operational source data, never audit metadata. The separate correction command requires a prior observation, appends a superseding observation and retains original actor/time/reason. ATTENDED requires now >= start; NO_SHOW requires now >= end. Initial observation requires BOOKED and UNKNOWN. Correction may supersede ATTENDED/NO_SHOW; effective NO_SHOW terminates a BOOKED booking; an already NO_SHOW booking stays terminal even if corrected to ATTENDED. No correction reopens capacity. No consultation exists in this slice.

Booking exact projection: `id,slotId,providerId,clinicId,patientDisplayName,startAt,endAt,timeZone,state,version,createdAt,predecessorId,successorId,attendance,transitions,attendanceHistory`. No general patient locator is needed: the booking id scopes the logistics resource. Transition exact keys: `id,command,fromState,toState,recordedAt`. Attendance-history exact keys: `id,observation,supersedesId,reason,recordedAt`. Actor/user/profile/member/affiliation/configuration/operation/audit IDs, contacts, professionalIdentifier and clinical payload are excluded. Attendance is UNKNOWN absent an explicit observation. No private/clinical queries or patient browse.

Page defaults 1/20, page <=10000, size <=100; all histories fixed startAt DESC,id ASC. Page/items/count use one SQL snapshot. Patient logistics survives provider revocation. Exact clinician reads logistics only; writes additionally require current original clinic/membership/provider authority. ADMIN/LAB_STAFF/PHARMACY_STAFF and unrelated participants are denied.

## Lifecycle and authority

BOOKED -> CANCELLED / RESCHEDULED / NO_SHOW; terminals never reopen. ATTENDED is separate operational truth. Cancellation/rescheduling require BOOKED and DB now strictly before original start. Patient cancellation does not require provider eligibility. Fresh create/replacement requires published finite slot and exact current provider/specialty/clinic/affiliation/membership/organization/clinician authority, current settings and DB now strictly before start minus current lead; equality closes. Horizon applies to the complete slot. Published slot timezone/config snapshot is immutable; admission version is separately retained. Same-clinician/same-clinic replacement atomically links old/new identities and releases original capacity only on commit.

Booking grants ZERO clinical authority: no assignment lookup/requirement/create/accept/end, no consent, clinical access, consultation or EH-012 bridge. All M0–M2/I1 services remain independent.

## Persistence, locking and proof boundary

Add only Booking, BookingEvent, BookingOperation and BookingAttendance relational objects. Ordinary SQL independently enforces active slot uniqueness and patient/clinician half-open range exclusions. Identity/time/config snapshots and retained events/observations/operations cannot be rewritten or removed; state/version changes are bounded and history is append-only. No backfill.

Canonical order: compatible four M1 table intents before rows -> sorted involved Users NO KEY UPDATE -> actor Session UPDATE/current role/expiry -> ClinicianProfile SHARE -> PatientProfile SHARE (no Assignment authority lock) -> Specialty -> Organization -> ClinicDirectory -> Membership -> ClinicianDirectory -> Affiliation -> current Settings SHARE -> patient EH2P then clinician EH2C transaction advisory keys -> sorted slots -> sorted bookings -> history/operation work. Replacement takes old and target scopes up front. No late User/Session/Organization, no booking-to-slot inversion, no nested legacy writer. Recheck authority/settings/clock after waits and final session before commit. Existing ADMIN operational subset remains unchanged.

READ COMMITTED; acquisition/lock 5s, statement 10s, transaction 30s; no automatic retry. Actor+command+UUIDv4 operation identity and canonical payload SHA256 retain original outcome atomically; changed payload conflicts; rollback permits key reuse; every replay rechecks current authority. Genuine actor, fixed action/entity, database timestamp, safeMetadata={} audit; audit failure rolls back everything.

Independent PostgreSQL connections, pg_blocking_pids and actual commit/rollback outcomes must prove capacity, overlap, replay, reschedule races, current authority/expiry/audit, timeout/deadlock and legacy lock compatibility. Fresh/populated upgrade/status/redeploy must preserve every prior table/row/checksum and return ZERO_WRITE. Real HTTP synthetic isolated-database runtime proof is additive after availability in CI. Results belong in validation and exact-head PR/Issue handoff after execution.

Excluded: consultation/encounter extension, clinical documentation, follow-up intent, prescribing/labs/pharmacy/I3/EACCE, payments/video/notifications/recurrence/external calendar, UI/frontend. Slice 4–7 NOT AUTHORIZED. I2 overall INCOMPLETE. Independent review and separate merge authorization required; DO NOT MERGE.

Implementation migration: `20261028090000_v3_i2_bookings` (16 total migrations; 38 domain tables). New relational sources are bookings, booking_events, booking_operations and booking_attendance. Partial unique booking_slot_capacity plus booking_patient_overlap / booking_clinician_overlap GiST exclusions protect capacity and half-open reservations independently. Deferred history guards require every current version to have contiguous retained events and attendance lineage; occupied-slot withdrawal has its own database guard. Actor/time are genuine, operation and event time database-owned.

Real-clock HTTP runtime `eh-v3-i2-slice3-booking-proof-v1` executed locally: 21/21 PASS, including a genuine five-minute interval, no automatic attendance/no-show, reasoned correction and zero assignment/clinical authority. Full regression and exact-head CI readiness evidence must be checked separately in the validation and PR/Issue handoff.
