# V3-I1 Slice 2 — Bounded Organization Membership Implementation

## Authority and status

[Issue #39 authorization 6366843150](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6366843150) authorizes Slice 2 only under the [approved I1 contract](V3_I1_CONTRACT.md). Starting main `a03c0b63a0ed44bcf39a32428002af0c92edc7e0` includes merged PR #40; exact-main [Bootstrap 39948145751](https://github.com/abuhmaid28/egyhealth360/actions/runs/39948145751) completed SUCCESS, including all validation/runtime steps. Slice 1 is merged/verified. Slice 2 implementation is submitted for independent review; **V3-I1 overall NOT COMPLETE; Slice 3 NOT AUTHORIZED; EACCE NOT STARTED; design FROZEN**. No D01–D36 decision changes.

## Delivered boundary

Two fixed staff roles, Organization and OrganizationMembership, and a narrow principal-checked operational persistence service. Five fixed account roles now supported by the implementation: PATIENT, CLINICIAN, ADMIN, LAB_STAFF, PHARMACY_STAFF. Existing trusted provisioning can create staff without patient/clinician profiles. Login/me/logout retain the same session, password, cookie, Origin, Fetch Metadata and CSRF behavior; only the AuthSuccess role enum expands in OpenAPI.

**No new HTTP routes.** Bounded managed operations are internal runtime service operations, following the existing CarePlan service boundary. No startup provisioning, controller/admin browser, arbitrary Prisma client or general user/clinical lookup is exposed. A real current principal is still mandatory; possession of a target UUID or a previously returned snapshot is not authority. Future HTTP exposure requires separate review and cannot infer permission from this service's existence.

Organization identity, kind, operational name (trimmed, nonblank, no controls, maximum 160 characters), creation actor/time and creation operation key are immutable. Only ACTIVE ↔ SUSPENDED operational status changes are allowed. Each genuine transition increments statusVersion and preserves current transition actor/time; minimized append-only audit retains prior operational transitions. No organization removal, hierarchy, location catalog, directory or publication flag is introduced.

Membership compatibility is exactly CLINICIAN–CLINIC, LAB_STAFF–LABORATORY, PHARMACY_STAFF–PHARMACY. Multiple compatible organizations are allowed. PATIENT and ADMIN have no memberships. Membership identity/endpoints/role/kind/grant provenance/operation key are immutable; ACTIVE → ENDED is terminal with ending actor/time. Explicit regrant requires a fresh operation key and new row. Ending or suspension preserves history. Restoration never reactivates an ended membership.

## Physical schema and migration contract

Two additive migrations after the ten historical migrations:

1. `20261023000000_v3_i1_staff_roles`: add LAB_STAFF and PHARMACY_STAFF to user_role. This separate migration commits before the next migration references those values.
2. `20261023000100_v3_i1_organizations`: create organization_kind (CLINIC/LABORATORY/PHARMACY), organization_status (ACTIVE/SUSPENDED), organization_membership_status (ACTIVE/ENDED), organizations and organization_memberships.

The current schema has 25 models. Historical model fields/guards, migration files/checksums and deterministic M1 fixture are retained; no consent, membership, specialty or clinical backfill. Exact catalog tests extend only the approved objects, rather than relaxing inventory assertions.

| Object | Enforcement |
|---|---|
| Organization keys | UUID primary key; organizations_id_kind_key; organizations_operation_key on creator + operation key |
| Organization CHECKs | organizations_admin_role_check, organizations_name_check, organizations_lifecycle_check |
| Organization foreign keys | organizations_creator_fkey and organizations_status_actor_fkey reference users(id, role), requiring ADMIN discriminator; RESTRICT update/delete |
| Membership keys/indexes | UUID primary key; memberships_operation_key on grant actor + operation key; partial unique memberships_active_pair_key on user + organization WHERE ACTIVE; memberships_user_history_idx |
| Membership CHECKs | memberships_admin_role_check, memberships_compatibility_check, memberships_actor_check, memberships_lifecycle_check |
| Membership foreign keys | memberships_user_role_fkey → users(id, role); memberships_organization_kind_fkey → organizations(id, kind); memberships_grant_actor_fkey / memberships_end_actor_fkey → ADMIN user discriminator; all RESTRICT |
| Lifecycle guards | i1_guard_organization / organizations_write_guard; i1_guard_membership / memberships_write_guard freeze identities and terminal history |
| Removal guards | i1_reject_removal with organizations_removal_guard and memberships_removal_guard rejects DELETE/TRUNCATE, including zero-row statements |

Role/kind mismatch cannot be manufactured by providing a compatible label against an incompatible actual user/organization: composite foreign keys bind both discriminators to the referenced identities. Existing profile discriminators continue rejecting staff patient/clinician profiles. Historical profileless users have no new universal role-change trigger; no ordinary role-change operation is introduced, and membership/profile/admin references prevent referenced-role rewriting. SQL guards enforce structural integrity; they do not authenticate sessions or resist schema owners/superusers.

## Runtime operations and retry contract

Factory: [createOrganizationPersistence](../packages/db/src/organizations.ts), exported through the database package root. Inputs are exact data properties, rejecting unknown/hidden/getter authority fields; copy/canonicalize primitive targets before awaiting. UUIDs use the existing bounded UUID-v4 spelling policy. Organization IDs are never patient IDs or credentials.

| Operation | Input / current authority | Result / retry |
|---|---|---|
| createOrganization | ADMIN; kind/name/operationKey | Creation returns created=true; exact actor/key/kind/name replay returns original current projection, created=false. Changed payload/key reuse conflicts; no duplicate audit |
| inspectOrganization | ADMIN; organizationId | Bounded organization projection, including suspended state so administration/restoration is possible |
| setOrganizationStatus | ADMIN; organizationId/status/expectedVersion | Exact version compare-and-set; current same-state no-op. Immediate transition replay at expectedVersion+1 and same desired state is a no-op; older stale version conflicts. No silent replay of an old suspension/restoration over intervening history |
| grantMembership | ADMIN; organizationId/userId/operationKey | New grant requires ACTIVE target account, compatible role/kind and ACTIVE organization. Duplicate active pair with different operation conflicts. Exact actor/key replay returns the original row's current state, even if now ended; it never regrants |
| endMembership | ADMIN; exact organizationId/membershipId | End exact row; exact terminal retry is a no-op. Administrative ending is permitted during organization suspension/target disable; old end cannot affect a new grant |
| inspectMembership | ADMIN; exact organizationId/membershipId | Minimized operational grant/end history, not user email/profile/clinical payload |
| readMemberOrganization | Current CLINICIAN/LAB_STAFF/PHARMACY_STAFF; exact organizationId/membershipId | Requires current ACTIVE organization and exact ACTIVE membership owned by current account with compatible role. Returns only organization projection; no clinical data, membership list or authorization ticket |
| close | Service lifecycle | Release database resources |

Organization projection: id, kind, name, status, statusVersion, createdAt, statusChangedAt. Membership projection: id, organizationId, userId, userRole, status, grantedAt, endedAt. Internal actors/operation keys remain stored for provenance/retry but are omitted from these operational projections.

Errors are sanitized OrganizationError codes: ORGANIZATION_INVALID, ORGANIZATION_UNAUTHENTICATED, ORGANIZATION_NOT_FOUND, ORGANIZATION_CONFLICT, ORGANIZATION_UNAVAILABLE. Missing/forbidden/cross-scope targets share NOT_FOUND; no raw SQL, supplied secrets or protected existence reasons. These are internal service errors, not newly frozen HTTP mappings.

## Authorization and D36

ADMIN alone can manage these operational sources but gains no patient profile/clinical payload, patient/clinician impersonation, relationship manufacturing, signing, result finalization, dispensing, fulfillment, break-glass or forensic browser. Staff cannot self-grant or browse patients. Management target IDs cannot substitute for the genuine session actor.

ClinicianPatientAssignment remains the sole effective clinical grant. Existing patient authorization files are unchanged: never assignment OR membership. A clinician clinic affiliation alone does not authorize a patient, and clinic suspension does not silently end an unrelated assignment. Lab/pharmacy roles have no M0–M2 clinical-resource entitlement. D36 additionally needs exact routed artifact authority at I3; membership never satisfies it.

## Locking, current state and revocation

READ COMMITTED; lock_timeout 5s, statement_timeout 10s, Prisma maxWait 5s / transaction 30s. No automatic stale-authority retries. Lock relevant user identities in UUID order FOR NO KEY UPDATE → exact actor session FOR UPDATE → organization FOR UPDATE for management mutations / FOR SHARE for reads → exact membership where needed. Grant/end lock the target user's immutable identity as well as the actor before descending; end's preliminary target lookup grants no authority and the exact target is rechecked under locks. Both account/session authority and fixed role are checked inside the transaction and again before return.

Organization management serializes pair creation even when a membership row does not yet exist; the partial unique constraint is the final backstop. Exact member reads hold organization and membership SHARE locks through commit. Suspension/end must serialize with those reads; a waiting operation rechecks committed current state after acquiring the lock. Administrative status/end reads intentionally remain possible during suspension, enabling restoration/revocation without granting staff an exception.

No assignment/patient/resource locks are acquired by this service. Existing M2 ordering is untouched; same-clinician organization reads and INITIAL generation serialize on their existing user/session prefix without adding an inverted clinical lock dependency. Compatible NO KEY UPDATE user locks allow genuine audit foreign-key checks. Final session expiry can roll back a mutation/audit; clock checks cannot recall an already authorized response.

## Audit, tests and acceptance

Atomic {} metadata events: ORGANIZATION_CREATED, ORGANIZATION_SUSPENDED, ORGANIZATION_RESTORED, ORGANIZATION_MEMBERSHIP_GRANTED and ORGANIZATION_MEMBERSHIP_ENDED. Genuine session actor, exact source identity and actual transaction timestamps; reads/denials/retries/no-ops add no events. Audit failure rolls back all source changes. No broad audit reader or fake historical membership/consent.

[Focused integration tests](../tests/integration/organizations.test.mjs) cover compatibility, minimized reads, exact retries/new grants, suspension/restoration, current account/session/IDOR, SQL/Prisma bypass and audit faults. Actual independent PostgreSQL connections and observed blocker PIDs prove duplicate grant winner commit/rollback, grant/end both orders, member-read versus end/suspension/disable/session revoke both orders, target disable versus grant, final expiry, lock timeout and a real deadlock victim. [Migration/M2 overlap tests](../tests/integration/organizations-migration.test.mjs) use the actual Prisma runner against populated INITIAL/action/decision history, repeat deploy/status and both orders of same-clinician organization read versus M2 generation. Historical isolated suites retain their old schema baselines.

[Runtime proof](../scripts/verify-organization-runtime.mjs) uses separately isolated `eh-v3-i1-slice2-proof-v1` synthetic data, real staff login/logout and patient denial plus operational suspension/end/regrant. It does not change `eh-m1-demo-v1` or run at application startup. CI adds this one container proof step and retains all prior gates/thresholds. [Validation record](V3_I1_SLICE2_VALIDATION.md) distinguishes actual commands/results from future I1 tests.

Acceptance requires independent review + successful exact-head CI + Product Owner merge approval + exact-main post-merge verification. PR existence is not acceptance. Slice 3 remains unauthorized until that gate completes; no registration, directory, Specialty, RelationshipRequest, booking, fulfillment, EACCE, UI or generalized IAM is implemented here.
