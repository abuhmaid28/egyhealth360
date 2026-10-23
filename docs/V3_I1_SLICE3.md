# V3-I1 Slice 3 — Patient Registration and Own Profile

## Authority and status

[Issue #39 authorization 6374281944](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6374281944) authorizes this slice under [the I1 contract](V3_I1_CONTRACT.md). Starting main: `2c96b2ce7cfd407a828f9ba510e563fe1e5983a9` (PR #41 merged); exact-main [Bootstrap 40010140478](https://github.com/abuhmaid28/egyhealth360/actions/runs/40010140478) completed SUCCESS. The full Issue #39 thread contained no later revocation at verification. This slice changes no D01–D36 policy.

Product V3 APPROVED; V3-G0 and M0/M1/M2 COMPLETE; I1 Slice 1 and Slice 2 COMPLETE. **Slice 3 implemented / in review; I1 overall NOT COMPLETE; Slice 4+ NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN.** Acceptance requires independent review, green exact-head CI, explicit Product Owner merge approval and exact-main verification. No automatic merge.

## Delivered surface

| Method/path, relative to `/api/v1` | Authority and output |
|---|---|
| POST `/auth/register` | Guarded anonymous entry, even if a cookie is supplied; generic 202 `{ "data": { "accepted": true } }` |
| GET `/me/profile` | Current authenticated ACTIVE PATIENT only; `{ "data": { "id": "own-profile-uuid", "displayName": "…", "dateOfBirth": null, "sex": null } }` |
| HEAD `/me/profile` | Same current authority, status and no-store; no response body |
| PUT `/me/profile` | Same PATIENT authority plus existing session-derived CSRF and Origin; replace exactly the three profile fields, return the current projection |

No target ID exists in these request route/body contracts. The authenticated read-only profile ID is a locator for existing patient-scoped resources (including BP), never a grant of authority. `/me/profile` avoids collision with the existing `/patients/{patientId}/profile` read, whose id/displayName projection and ACTIVE-assignment permissions remain unchanged. These are the only two added path groups/four operations and two new OpenAPI component schemas. Existing paths/schemas are byte-preserved; versioned exact-hash checks remove only the appended Slice 3 blocks before asserting the historical hashes, while separately pinning the entire current OpenAPI hash and exact new inventory.

No schema or migration is required: reuse User, PatientProfile, Session and AuditLog. All 25 models, twelve migrations/checksums and existing catalog constraints remain unchanged. No new dependency, fixture seed or codec.

## Frozen registration request and bounds

Required JSON keys are **exactly** `email`, `password`, `displayName`; values must be strings. Unknown keys (including role/status/owner/IDs/privileges), missing keys, arrays, nested structures, malformed UTF-8/JSON and duplicate decoded keys fail 400. Escaped duplicate spellings fail as well.

| Boundary | Exact choice |
|---|---|
| Dedicated header | **`X-EH-Register: 1`**, exactly one occurrence; nonsecret, not authentication |
| Origin | Exactly configured `AUTH_BROWSER_ORIGIN`, exactly one header; mandatory even without Fetch Metadata |
| Fetch Metadata | Reuse existing `Sec-Fetch-Site`: cross-site/unknown/duplicate rejected; same-origin/same-site/none still require exact Origin/header; absent metadata grants no bypass |
| Content type/encoding | Single application/json with optional charset=utf-8, using existing case-insensitive JSON rule; absent encoding or exact identity only, no compression |
| Full JSON body | At most **16384 bytes**, including escapes/whitespace; streamed bound before parsing; strict UTF-8 |
| Aggregate raw headers | At most **8192 UTF-8 bytes**, sum of raw header names and values (transport framing excluded); applies to all new routes; Node transport limits also remain |
| Email representation | At most **1024 UTF-8 bytes before canonicalization**; reuse `canonicalizeEmail`, no duplicate normalization implementation |
| Email identity | Trim outer ASCII SP/HT/LF/VT/FF/CR; lowercase ASCII; remaining printable nonwhitespace ASCII, exactly one @, nonempty parts. No provider-specific dot/plus folding or internationalized-address rules |
| Password | **1–1024 UTF-8 bytes**, untrimmed/unmodified, identical accepted byte semantics to login; existing Argon2id v19/65536KiB/3 passes/p1/salt16/key32 codec. No new minimum-strength or identity-assurance claim |
| Display name | **1–160 Unicode scalar values**; no outer JS trim whitespace, C0/C1 controls or unpaired surrogates; no text normalization. Valid Unicode/Arabic permitted |
| URL/extra request controls | No query string or Idempotency-Key; identity uniqueness is the retry backstop. Only POST accepted for registration; other methods 405 |

Guard Origin/media/header before reading the registration body or hashing. Existing global JSON parser and login/authenticated mutation behavior are unchanged. Dedicated boundary applies before that parser, enforces no-store and sanitized errors, and grants no CORS allowance. No ETag/conditional 304 profile response. Node's existing transport timeouts remain; this is not a production internet abuse perimeter.

## Local resource protection

One `RegistrationBudget` per running API process uses a monotonic fixed window: **30 validated, guarded registration attempts per 60000ms**, with **at most 2 active operations**, no queue. Active permits cover hashing and persistence, limiting queued post-hash registrations as well. Saturated attempts consume the remaining window budget. Window rollover resets attempts, never active permits. Release is idempotent and runs on failure. Invalid guard/input requests never reach Argon2. Duplicate identities consume the same budget and hashing path as new identities. No email/IP/header identifier is a limiter credential.

State is a fixed number of counters; there is no per-email/IP map or unbounded memory. Both limits produce 429 `REGISTRATION_BUSY` / `Registration temporarily unavailable.` They do not expose account existence. Tests inject only a local monotonic clock/hash dependency, never a client-controlled override. This is intentionally a single-process graduation-prototype control: restarts reset it, multiple API instances do not share it, and a caller can exhaust capacity for others. No distributed/global rate-limit or constant-time guarantee is claimed. No Redis, CAPTCHA, SaaS, paid infrastructure or dependency is added.

## Atomicity, duplicates and sessions

The API hashes every admitted valid registration with the existing codec, then invokes the narrow persistence service. A READ COMMITTED transaction inserts fixed PATIENT/ACTIVE using `ON CONFLICT (email) DO NOTHING RETURNING id`. A new row creates its PatientProfile and a minimized successful audit in the same transaction. Only conflict on canonical email yields the duplicate acknowledgement. Other database/crypto/profile/audit failures are sanitized 503, never converted into success. Database uniqueness handles concurrent duplicates; loser rollback/commit behavior is proven on independent connections.

New creation, canonical duplicate and valid retry return identical 202 acknowledgement with no identifier/role/status/profile/existence reason. Duplicates do not inspect/rewrite old credentials/profile, reactivate disabled users or add successful audit. Existing nonpatient roles receive the same public duplicate semantics. The acknowledgement is not a claim that an account was newly created and is not delivery of credentials.

Registration never resolves a supplied session, creates a session, emits Set-Cookie, authenticates or rotates/revokes an existing browser session. Explicit existing login follows. The request password buffer is zeroed in finally; JavaScript strings cannot promise secure memory erasure. No plaintext/hash/request body is logged or audited.

## Own-profile contract and concurrency

Read projection contains the **server-derived read-only own profile id**, plus **displayName, dateOfBirth, sex**. PUT accepts exactly the latter three fields; id is rejected as input. The locator preserves access to unchanged M0–M2 routes without adding a clinical permission or leaking identifiers through anonymous registration. Name follows the registration rule. DOB is null or a strict real calendar date YYYY-MM-DD, years 0001–9999; there is no inferred age/condition/applicability assertion or medical validation. Read preserves existing stored context, including legacy text/date spellings outside the new-write bounds (dates read as PostgreSQL ISO text, avoiding Prisma/JavaScript Date codec limits); historical profiles are not backfilled or truncated. The OpenAPI read projection deliberately separates those existing-value semantics from the bounded PUT body. Sex on new writes is null or 1–64 Unicode scalar values with the same whitespace/control/surrogate exclusions; it remains opaque existing text. PUT requires all three fields, so replacement has deterministic null semantics. No email/password/role/status/owner/IDs/clinical fields are accepted. No new demographic feature is introduced.

Ownership derives only from the current principal. Each operation locks actor User FOR NO KEY UPDATE → exact Session FOR UPDATE → own PatientProfile FOR UPDATE, rechecking current user/session/role before projection/mutation and again before commit. Current ACTIVE account, PATIENT role, nonrevoked/unexpired matching session and own role-bound profile are required. Wrong roles/missing own profile share 404; stale authority is 401. ADMIN/clinician/lab/pharmacy get no new own-profile payload or edit right. Membership/assignment never substitutes for patient ownership here. All old clinical access still uses its existing module policies and sole ClinicianPatientAssignment grant.

PUT serializes replacements; the last serialized replacement wins. It has no stale-edit/CAS promise and adds no version column. This differs intentionally from organization status CAS: profile context is mutable full replacement, not a terminal grant/status transition that a stale retry could restore. Exact current-value no-op preserves updatedAt and emits no audit. A retry after an intervening different edit is a new replacement, not an immutable historical operation replay. No heavyweight concurrency framework is introduced.

Existing M2 lock order is preserved: these operations never acquire assignment/org/clinical resource locks after patient locks. User/session locks serialize disable/revocation; an operation that legitimately locks first may complete, then next access denies. Revocation winning first denies waiting work. Final database-clock expiry checks can roll back a pending profile change. READ COMMITTED, 5s lock timeout, 10s statement timeout, maxWait5s/transaction30s, sanitized rollback and no automatic stale retry match accepted M2 patterns. No response recall is claimed. Real blocker/waiter tests establish both revocation orders; exact concurrent identical replacement adds one change audit.

## Audit and privacy

| Successful mutation | Actor/action/entity | Metadata |
|---|---|---|
| Newly registered identity | NULL anonymous actor; PATIENT_SELF_REGISTERED; user / exact new User ID | `{}` |
| Changed own profile | Genuine authenticated patient User ID; PATIENT_PROFILE_UPDATED; patient_profile / exact own profile ID | `{}` |

All state and audit are atomic. Reads, no-ops, duplicates, denials, saturation/throttling and failed transactions produce no successful mutation events. No passwords/hashes/tokens/cookies/CSRF/email copies/profile before-after bodies are stored in generic audit. Operational audit is not a patient timeline or clinical evidence source. Historical clinical snapshots/provenance and observed-applicability remain untouched by demographics. No new audit reader, permanent-author exception, staff browsing or ADMIN clinical entitlement.

## Exclusions and next gate

No registration recovery/verification platform; no Slice 4 directory/Specialty/publication; no Slice 5 RelationshipRequest/enrollment; no booking/consultation/diagnosis/private notes/summary/prescription/lab/dispense/timeline/notifications/EACCE/recurrence/UI/design/generalized IAM. M1 `eh-m1-demo-v1` remains unchanged; runtime proof uses fresh synthetic isolated identities, never edits fixed M1 profiles. [Validation/evidence](V3_I1_SLICE3_VALIDATION.md) records actual execution separately.

Independent review of the exact Slice 3 PR head. Do not merge until review passes and Product Owner explicitly approves the merge. Exact-main post-merge verification must precede separate Slice 4 authorization. Issue #39 remains open and V3-I1 is not complete.
