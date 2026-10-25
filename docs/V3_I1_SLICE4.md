# V3-I1 Slice 4 — Curated Public Provider Directory

## Authority and delivery status

Product Owner implementation authorization: [Issue #39 comment 6391008285](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6391008285), recorded before source mutation. Starting main: `e1a87df5031e7be48a43d99e2b311dbe397b2e7e`. PR #43 is MERGED; exact-main push/main [Bootstrap CI 40116846242](https://github.com/abuhmaid28/egyhealth360/actions/runs/40116846242) SUCCESS restores the security gate and makes Slice 3 COMPLETE. Its actual jobs/logs were inspected, including 87 unit, 471 integration, both HIGH audits and Docker/runtime gates. These are baseline results, not Slice 4 validation counts.

Slice 1/2/3 COMPLETE. Slice 4 IMPLEMENTED / IN REVIEW on its feature branch; no merge or completion claim. Product V3 APPROVED; G0 COMPLETE; M0–M2 COMPLETE; I1 NOT COMPLETE; Issue #39 OPEN. Slice 5/6 NOT AUTHORIZED; EACCE NOT STARTED; design/UI FROZEN. D01–D36, including D06-A, D11-A, D18-A, D23-B and D36, are unchanged. [Validation](V3_I1_SLICE4_VALIDATION.md) is a separate evidence record.

## Compatibility inventory

| Foundation | Classification | Slice 4 treatment |
|---|---|---|
| Canonical identity, five fixed roles, Argon2id, sessions, Origin/Fetch Metadata/CSRF | PRESERVE EXACTLY | No change to auth helpers, codecs, session implementation or browser guards |
| Registration, generic duplicate 202, no auto-login, own-profile fields/current authority | PRESERVE EXACTLY | Existing Slice 3 suite/runtime retained |
| Sole clinical grant `ClinicianPatientAssignment`, patient ownership, ADMIN/staff denial | PRESERVE EXACTLY | Directory never creates assignments or queries clinical records; public ID is not a patient/profile credential |
| M0–M2 migrations, clinical history, BP/privacy/applicability/INITIAL, audit | PRESERVE EXACTLY | Twelve historical SQL checksums retained; no historical clinical migration, rule or fixture edits |
| Organization and membership lifecycle, status and multiple affiliations | EXTEND ADDITIVELY | No old scalar columns/status semantics changed; composite reference key added to membership only |
| ClinicianProfile | EXTEND ADDITIVELY | New composite reference key/reverse relation; legacy specialty/professionalIdentifier unchanged and private |
| Curated specialty, independent public clinic/provider identity and publication | FUTURE NEW → implemented in this slice | Four explicit tables, no migration data backfill |
| Exact inventories | EXTEND ADDITIVELY | 25→29 models; 12→13 migrations; 13→17 OpenAPI paths/schemas. Historical byte/hash checks use explicit prior-slice projection; new full hash and complete inventories are pinned |
| Historical Slice 2 migration proof | PRESERVE EXACTLY | Real runner explicitly pinned to original twelve migrations; original twelve-ledger assertions remain exact |
| Bilateral enrollment/availability/booking/fulfillment/timeline/EACCE/UI | DEFER | No models, routes, clinical authority or design work |

## Physical domain and lifecycle

One additive migration: `20261024000000_v3_i1_directory`. No role/enum or dependency change. Four new Prisma models map to:

| Model/table | Exact purpose and lifecycle |
|---|---|
| Specialty / `specialties` | Immutable public slug `key`, curated name; explicit published boolean, versioned managed correction/publication; starts unpublished |
| ClinicDirectory / `clinic_directory` | One optional explicit public projection per existing CLINIC organization, independent generated public UUID, curated displayName/city/address; starts unpublished |
| ClinicianDirectory / `clinician_directory` | One optional explicit public identity per clinician profile; independent generated public UUID, managed displayName and one current curated specialty reference; starts globally unpublished |
| DirectoryAffiliation / `directory_affiliations` | Deliberate approval of the exact clinician's exact CLINIC membership under the exact current curated specialty. Published row is terminally withdrawable; never retargeted/reactivated; new approval creates new row |

No enterprise hierarchy/CMS/multi-specialty taxonomy. Clinic public information lives in the separate one-to-one directory projection, so operational organization name/status/provenance remain private and operational ACTIVE never means published. Multiple active clinic memberships remain supported: only explicitly approved, currently eligible affiliations appear. A provider without any eligible approved affiliation is absent.

An affiliation may be approved while the provider's global switch is off; global enable then requires at least one eligible approval. This staging avoids a circular creation dependency. Both independent switches and all source eligibility are required for public output. Explicit global withdrawal remains withdrawn across account/org restoration. An ended membership never becomes active; a new membership does not inherit its predecessor's publication. Restoring ACTIVE account/org or specialty publishability can restore visibility only while all separate publication decisions remain valid.

Changing curated specialty requires the provider globally unpublished and atomically withdraws old affiliation approvals before replacing the reference. Old rows retain their specialty snapshot; changing A→B→A never revives prior approvals. Legacy `ClinicianProfile.specialty` is neither rewritten nor mapped; no government licensing/verification claim is made.

## Managed surface and authority

Like Slice 2, management is a narrow **internal principal-checked service**, not new HTTP/admin UI. `createDirectoryPersistence` exports:

- `createSpecialty`, `setSpecialty`;
- `createClinic`, `setClinic`;
- `createProvider`, `setProvider`;
- `publishAffiliation`, `withdrawAffiliation`;
- `inspect` (minimal operational state only), public reads and `close`.

Inputs are exact primitive snapshots before I/O. Server-supplied AuthPrincipal is rechecked against current ACTIVE ADMIN user and its exact nonrevoked/unexpired session; a caller's role/target ID/operation key never grants authority. Inspection does not expose clinical history, raw audit or credentials. No unauthenticated/exported raw client bypass. Non-ADMIN roles are denied all management methods. There is no new browser mutation route; existing HTTP CSRF/Origin/Fetch Metadata rules remain unchanged. Any future management HTTP adapter must apply those guards and is not delivered here.

Create/publish commands accept an actor-scoped UUID operationKey. Creates retain SHA256 fingerprint of the initial validated safe primitive command to distinguish replay from changed payload even after managed correction; fingerprint/key/actor are never public. Exact replay returns existing retained state without new audit or authority. Field/state replacements require expectedVersion; exact no-op and immediate exact prior-version replay make no mutation/event; stale mismatches conflict. Withdrawal addresses an exact publication ID and is terminal/idempotent.

## Public HTTP contract

All routes support GET/HEAD, anonymous or any role, with the **identical allowlist**. No credentials are resolved to widen the projection.

| Route | Output/filters |
|---|---|
| `/api/v1/directory/specialties` | Published `{key,displayName}` catalog |
| `/api/v1/directory/clinics` | Published current ACTIVE CLINIC `{id,displayName,city,address}` |
| `/api/v1/directory/providers` | Published eligible providers; exact `specialty` key / `clinic` public ID filters optional |
| `/api/v1/directory/providers/{publicId}` | Exact eligible provider or safe 404; no query fields |

Provider: `{id,displayName,specialty:{key,displayName},clinics:[{id,displayName,city,address}]}`. Detail envelope `{data:provider}`. Collections `{data:[...],meta:{page,pageSize,total}}`. Exact clinic filtering returns matching eligible affiliations only. Specialty and clinic catalogs may be published without a matching clinician. No patient-derived count/statistic.

Public provider/clinic IDs are newly generated independent lowercase UUIDv4 locators, distinct from protected source/internal identities. Specialty key is a deliberate public slug, not its internal UUID. Unpublished, disabled, ended, invalid or nonexistent provider state yields `{error:{code:"DIRECTORY_NOT_FOUND",message:"Not found."}}`, 404. Malformed collection input is generic REQUEST_INVALID/400; unsupported methods METHOD_NOT_ALLOWED/405 (Allow GET, HEAD); infrastructure failure DIRECTORY_UNAVAILABLE/503. Global safe error serialization is unchanged.

Never return account email/User ID/ClinicianProfile ID/professionalIdentifier, membership ID, grant/end/admin actor/time, operation key/fingerprint, credentials, patient relationships, clinical source/history, audit or availability. Public identity is curated demo data, not professional identity assurance or clinical authority.

## Exact bounds

| Input | Limit/grammar |
|---|---|
| Public provider/clinic locator | Exactly canonical lowercase UUIDv4, 36 ASCII characters |
| Internal target/operation ID | UUIDv4; canonicalized lowercase; never authority |
| Specialty key | 1–48 ASCII; `[a-z][a-z0-9]*(-[a-z0-9]+)*`; immutable |
| Specialty name / city | 1–80 Unicode scalar values |
| Public clinic/provider displayName | 1–160 scalars |
| Address | 1–240 scalars; plain curated text, no geospatial feature |
| Text safety | No leading/trailing whitespace, Unicode control characters or unpaired surrogates; no truncation |
| Managed input | Exact own enumerable data-property keys; plain/null prototype only; no getter/symbol/hidden/authority-bearing extras; no arrays |
| Versions | Integer 0–2147483646, increment on meaningful replacement |
| Page / pageSize | Canonical decimal page 1–10000 / size 1–100; defaults 1 / 20 |
| Public query | Exact allowed ASCII parameters, no duplicate/unknown/encoded values, arbitrary sort or free-text search |
| Public HTTP | Empty body; no transfer encoding; URL ≤2048 bytes (ASCII query/path grammar); aggregate raw headers ≤8192 UTF-8 bytes |

No admin JSON/header contract exists because there are no admin HTTP routes. Internal service text/input bounds above are enforced before await.

## Current reads and database integrity

One parameterized SQL statement per public collection/detail joins only directory/catalog/User/ClinicianProfile/Organization/OrganizationMembership. It requires current CLINICIAN ACTIVE identity/profile, global publication, published curated specialty, unwithdrawn exact specialty/clinician/membership approval, ACTIVE unended compatible membership, ACTIVE CLINIC organization and separate published clinic projection. No clinical tables or N+1 fetches. Indexes cover public keys/locators, specialty/publication ordering, exact affiliation/clinic lookup and active pair.

READ COMMITTED statement snapshot: no dirty reads; an already completed read may reflect prior committed eligibility. After revocation COMMIT, the next statement must remove/update the projection. No application publication cache, static generation, ETag or conditional 304. All directory responses are no-store; HEAD is empty for successes and failures. Pagination orders by immutable public UUID or specialty key with unique tie-break identity. Count/page share a statement snapshot; no promise of a stable multi-request snapshot during concurrent changes.

Composite FKs bind clinician profile/user, provider/user and exact membership/user/org/role/kind; constants restrict CLINIC/CLINICIAN and ADMIN provenance. Unique public identifiers, actor operation identities and partial unique unwithdrawn provider/member pair prevent ambiguity. Source triggers preserve immutable identities/creation data and monotonic versions/time. Affiliation endpoint/specialty/publisher fields are immutable; ending is terminal. DELETE/TRUNCATE denied on all four tables; foreign keys RESTRICT history removal. Curated descriptions remain versioned mutable with minimized audit rather than duplicating full public text into audit.

Triggers are SECURITY INVOKER with explicit durable `public.*` relations and `pg_catalog,public,pg_temp` search path. TEMP shadow tests cannot manufacture eligibility. Actor role FKs provide structural ADMIN truth; application current session/user checks provide actual operational authority. A database superuser is outside the web authorization threat boundary.

## Transactions, audit and concurrency

Managed transactions: READ COMMITTED; lock_timeout 5s; statement_timeout 10s; Prisma maxWait 5s/timeout 30s. Prefix: sorted actor/target clinician User NO KEY UPDATE → exact actor Session UPDATE → current check → ClinicianProfile SHARE → Specialty SHARE (UPDATE for catalog mutation) → ordered organizations/clinic projections → memberships → provider → publication. Organization/clinic target operations keep Slice 2 org-before-member order. A target-user lock serializes provider operations with membership ending and account disable, without patient/assignment locks. Final current session/user check prevents expiry/disable/revoke before commit. No stale-authority retries on deadlock/timeout.

Successful meaningful state changes and audit commit together. Empty safeMetadata; real actor/exact target/time only. No success audit on reads, denied/failed requests, replay or no-op. Audit failure rolls back publication/catalog state. Events:

- SPECIALTY_CREATED / SPECIALTY_RENAMED / SPECIALTY_PUBLISHED / SPECIALTY_UNPUBLISHED;
- CLINIC_DIRECTORY_CREATED / CLINIC_DIRECTORY_UPDATED / CLINIC_DIRECTORY_PUBLISHED / CLINIC_DIRECTORY_UNPUBLISHED;
- CLINICIAN_DIRECTORY_CREATED / CLINICIAN_DIRECTORY_UPDATED / CLINICIAN_DIRECTORY_ENABLED / CLINICIAN_DIRECTORY_DISABLED / CLINICIAN_SPECIALTY_CHANGED;
- CLINICIAN_DIRECTORY_PUBLISHED / CLINICIAN_DIRECTORY_UNPUBLISHED for exact affiliation rows.

Real PostgreSQL transport/blocking evidence, migration proof and actual validation results are in [validation](V3_I1_SLICE4_VALIDATION.md). `scripts/verify-directory-runtime.mjs` uses separately isolated synthetic data and a real HTTP API inside the running container, following Slice 2 proof conventions. Manifest `eh-v3-i1-slice4-directory-proof-v1`, twelve meaningful cases. It neither seeds application startup nor modifies M1; each invocation constructs/asserts the same bounded scenario in a clean disposable DB and drops it, with generated secrets/locators, fail-closed assertions and no default privileged password.

## Exclusions and next gate

No RelationshipRequest/bilateral enrollment, assignment redesign, availability/booking, consultation/problems/notes/release, prescriptions/labs/dispensing/imaging, timeline/notifications, EACCE/recurrence/research or frontend/design. D36 routed artifact authority remains I3. Specialty association/publication is not patient consent or professional licensing verification.

Independent review of the exact V3-I1 Slice 4 PR head. Do not merge until review passes and the Product Owner explicitly approves the merge. After an approved merge, successful exact-main verification is still required before Slice 4 completion and any separate Slice 5 authorization.
