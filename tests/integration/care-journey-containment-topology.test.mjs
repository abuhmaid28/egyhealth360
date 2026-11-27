import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setTimeout } from 'node:timers/promises';
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
const pg = require('pg');
import { migrationRunner } from '../support/migration-runner.mjs';
import { observeApplicabilityQueries, signal, waitBlocked } from '../support/observed-applicability.mjs';
import { hashPassword } from '../../apps/api/dist/password.js';
import {
  createAuthPersistence,
  createAuthorizationPersistence,
  createAvailabilityPersistence,
  createBookingPersistence,
  createConsultationPersistence,
  createDirectoryPersistence,
  createOrganizationPersistence,
  createPersistence,
  createPrescriptionPersistence,
} from '../../packages/db/dist/index.js';
import { createCareJourneyGuardPersistence } from '../../packages/db/dist/care-journey-guard.js';

const NOTICE_DIGEST = 'a'.repeat(64);
const FINGERPRINT = 'b'.repeat(64);
const MEDICATION_ID = 'a3d10000-0000-4000-8000-000000000001';

const CJP_TABLES = [
  'care_journey_pairs',
  'care_journeys',
  'care_journey_bookings',
  'care_journey_events',
  'care_journey_clinic_admissions',
];

const CJP_FUNCTIONS = [
  'cjp_admission_evidence',
  'cjp_admission_guard',
  'cjp_binding_guard',
  'cjp_booking_event_binding',
  'cjp_consent_anchor',
  'cjp_ended_event_commit',
  'cjp_event_insert',
  'cjp_journey_end_evidence',
  'cjp_journey_guard',
  'cjp_reject_history_change',
];

function roleUrl(baseUrl, username, password, dbName) {
  const u = new URL(baseUrl);
  u.username = username;
  u.password = password;
  u.pathname = `/${dbName}`;
  return u.toString();
}

function authActor(a) {
  return { userId: a.userId, sessionId: a.sessionId, role: a.role };
}

async function seedJourneyOnPool(pool, ctx) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const admissionId = ctx.admissionId ?? randomUUID();
    const verificationEventId = randomUUID();
    const participationEventId = randomUUID();
    const enrollmentEventId = randomUUID();
    const consentEventId = randomUUID();
    const journeyId = randomUUID();
    const bindingId = randomUUID();
    const policyVersion = 'cjp-policy.v1';
    const scopeVersion = ctx.scopeVersion ?? 'cjp-scope.v1';
    const purpose = 'CARE_JOURNEY';

    if (!ctx.admissionId) {
      const now = new Date((await c.query('SELECT clock_timestamp()::timestamptz(3) now')).rows[0].now);
      const validUntil = new Date(now.getTime() + 180 * 86400 * 1000);

      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, clinician_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, purpose, credential_reference
        ) VALUES ($1,'CLINIC_VERIFIED','PARTICIPANT',$2,$3,$4,$5,'ADMIN',$6,$7,$8)`,
        [verificationEventId, ctx.clinician.profileId, admissionId, ctx.clinicOrg.id, ctx.admin.id, policyVersion, purpose, randomUUID()],
      );
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, clinician_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, purpose
        ) VALUES ($1,'STANDING_OPT_IN','PARTICIPANT',$2,$3,$4,$5,'CLINICIAN',$6,$7)`,
        [participationEventId, ctx.clinician.profileId, admissionId, ctx.clinicOrg.id, ctx.clinician.id, policyVersion, purpose],
      );
      const vRow = (await c.query('SELECT recorded_at, credential_reference FROM public.care_journey_events WHERE id=$1', [verificationEventId])).rows[0];
      const pAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [participationEventId])).rows[0].recorded_at;

      await c.query(
        `INSERT INTO public.care_journey_clinic_admissions (
          id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
          policy_version, purpose, credential_source, credential_issuer, credential_reference,
          verification_epoch, verified_at, valid_until, verification_event_id,
          participation_epoch, participated_at, participation_event_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SYNTHETIC_REGISTRY','Synthetic Issuer',$10,1,$11,$12,$13,1,$14,$15)`,
        [
          admissionId, ctx.clinician.profileId, ctx.clinician.id, ctx.clinicOrg.id,
          ctx.provider.id, ctx.membership.id, ctx.publication.id,
          policyVersion, purpose, vRow.credential_reference,
          vRow.recorded_at, validUntil, verificationEventId, pAt, participationEventId,
        ],
      );
    }

    if (!ctx.skipPair) {
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, actor_user_id, actor_role, policy_version
        ) VALUES ($1,'ENROLLED','PARTICIPANT',$2,$3,$4,'PATIENT',$5)`,
        [enrollmentEventId, ctx.patient.profileId, ctx.clinician.profileId, ctx.patient.id, policyVersion],
      );
      const enrolledAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [enrollmentEventId])).rows[0].recorded_at;
      await c.query(
        `INSERT INTO public.care_journey_pairs (
          patient_id, clinician_id, enrolled_at, policy_version, enrollment_event_id
        ) VALUES ($1,$2,$3,$4,$5)`,
        [ctx.patient.profileId, ctx.clinician.profileId, enrolledAt, policyVersion, enrollmentEventId],
      );
    }

    const assignment = (await c.query(
      `INSERT INTO public.clinician_patient_assignments (clinician_id, patient_id, status)
       VALUES ($1,$2,'ACTIVE')
       ON CONFLICT (clinician_id, patient_id) WHERE status = 'ACTIVE'
       DO UPDATE SET assigned_at = public.clinician_patient_assignments.assigned_at
       RETURNING id`,
      [ctx.clinician.profileId, ctx.patient.profileId],
    )).rows[0];

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
        actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
        notice_version, notice_digest, locale, affirmative, operation_key, fingerprint
      ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,$11,$12,'notice.v1',$13,'en',true,$14,$15)`,
      [
        consentEventId, ctx.patient.profileId, ctx.clinician.profileId, journeyId,
        admissionId, ctx.clinicOrg.id, ctx.booking.id, ctx.patient.id, ctx.patientActor.sessionId,
        policyVersion, scopeVersion, purpose, NOTICE_DIGEST, randomUUID(), FINGERPRINT,
      ],
    );
    const startedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [consentEventId])).rows[0].recorded_at;
    const osv = (await c.query('SELECT status_version FROM public.organizations WHERE id=$1', [ctx.clinicOrg.id])).rows[0].status_version;
    const bRow = (await c.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [ctx.booking.id])).rows[0];
    const hardExpiresAt = new Date(startedAt.getTime() + 365 * 86400 * 1000);

    await c.query(
      `INSERT INTO public.care_journeys (
        id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
        provider_id, membership_id, affiliation_id, admission_id, assignment_id,
        scope_version, policy_version, purpose, consent_event_id,
        clinic_status_version, verification_epoch, participation_epoch,
        started_at, original_pre_care_ceiling_at, hard_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,1,$17,$18,$19)`,
      [
        journeyId, ctx.patient.profileId, ctx.patient.id, ctx.clinician.profileId, ctx.clinician.id,
        ctx.clinicOrg.id, ctx.provider.id, ctx.membership.id, ctx.publication.id, admissionId, assignment.id,
        scopeVersion, policyVersion, purpose, consentEventId, osv, startedAt, bRow.end_at, hardExpiresAt,
      ],
    );

    await c.query(
      `INSERT INTO public.care_journey_bookings (
        id, journey_id, booking_id, slot_id, patient_id, patient_user_id,
        clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
        binding_kind, attached_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ANCHOR',$13)`,
      [
        bindingId, journeyId, ctx.booking.id, bRow.slot_id, ctx.patient.profileId, ctx.patient.id,
        ctx.clinician.profileId, ctx.clinician.id, ctx.clinicOrg.id, ctx.provider.id, ctx.membership.id, ctx.publication.id,
        startedAt,
      ],
    );

    await c.query('COMMIT');
    return { admissionId, journeyId, bindingId, assignmentId: assignment.id, policyVersion, scopeVersion };
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

async function terminateJourney(pool, ctx, seeded, reason = 'PATIENT_STOP') {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL lock_timeout='5s'");
    const ev = randomUUID();
    const isClin = reason === 'CLINICIAN_END';
    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
        actor_user_id, actor_role, policy_version, scope_version, purpose
      ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,$9,$10,'CARE_JOURNEY')`,
      [
        ev, ctx.patient.profileId, ctx.clinician.profileId, seeded.journeyId, seeded.admissionId, ctx.clinicOrg.id,
        isClin ? ctx.clinician.id : ctx.patient.id, isClin ? 'CLINICIAN' : 'PATIENT', seeded.policyVersion, seeded.scopeVersion,
      ],
    );
    const endedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ev])).rows[0].recorded_at;
    await c.query(
      `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason=$4 WHERE id=$1`,
      [seeded.journeyId, endedAt, ev, reason],
    );
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

test('Stage A0 non-superuser containment topology, effective ACL inventory, session termination, 5 lock-wait pairs, and positive/negative controls', async () => {
  const hex = randomBytes(6).toString('hex');
  const dbName = `cjp_a0_${hex}`;
  const ownerRole = `cjp_a0_owner_${hex}`;
  const legacyRole = `cjp_a0_legacy_${hex}`;
  const successorRole = `cjp_a0_successor_${hex}`;
  const groupRole = `cjp_a0_group_${hex}`;
  const ownerPass = randomBytes(18).toString('hex');
  const legacyPass = randomBytes(18).toString('hex');
  const successorPass = randomBytes(18).toString('hex');

  const baseUrl = process.env.DATABASE_URL;
  assert.ok(baseUrl, 'DATABASE_URL must be configured');
  const adminUrlObj = new URL(baseUrl);
  adminUrlObj.pathname = '/postgres';
  const adminPool = new pg.Pool({ connectionString: adminUrlObj.toString(), max: 4 });
  adminPool.on('error', () => {});

  const ownerUrl = roleUrl(baseUrl, ownerRole, ownerPass, dbName);
  const legacyUrl = roleUrl(baseUrl, legacyRole, legacyPass, dbName);
  const successorUrl = roleUrl(baseUrl, successorRole, successorPass, dbName);

  const cleanupHandles = [];
  let adminOnEphemeralPool;

  try {
    // 1. Provision isolated DB and strictly non-superuser roles on PG 18.6.
    await adminPool.query(`CREATE ROLE ${groupRole} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
    await adminPool.query(`CREATE ROLE ${ownerRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${ownerPass}'`);
    await adminPool.query(`CREATE ROLE ${legacyRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT PASSWORD '${legacyPass}'`);
    await adminPool.query(`CREATE ROLE ${successorRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT PASSWORD '${successorPass}'`);
    await adminPool.query(`CREATE DATABASE ${dbName} OWNER ${ownerRole}`);
    await adminPool.query(`REVOKE ALL ON DATABASE ${dbName} FROM PUBLIC`);
    await adminPool.query(`GRANT CONNECT ON DATABASE ${dbName} TO ${ownerRole}`);
    await adminPool.query(`GRANT CONNECT ON DATABASE ${dbName} TO ${legacyRole}`);
    await adminPool.query(`GRANT CONNECT ON DATABASE ${dbName} TO ${successorRole}`);

    adminOnEphemeralPool = new pg.Pool({ connectionString: roleUrl(baseUrl, adminUrlObj.username, adminUrlObj.password, dbName), max: 4 });
    adminOnEphemeralPool.on('error', () => {});
    await adminOnEphemeralPool.query(`ALTER SCHEMA public OWNER TO ${ownerRole}`);
    await adminOnEphemeralPool.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);

    // Verify ownerRole is strictly non-superuser before deploying all 23 migrations.
    const ownerPool = new pg.Pool({ connectionString: ownerUrl, max: 6 });
    ownerPool.on('error', () => {});
    cleanupHandles.push(() => ownerPool.end());

    const ownerMeta = (await ownerPool.query(
      `SELECT current_user AS u, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user`,
    )).rows[0];
    assert.equal(ownerMeta.u, ownerRole);
    assert.equal(ownerMeta.rolsuper, false);
    assert.equal(ownerMeta.rolbypassrls, false);
    assert.equal(ownerMeta.rolcreatedb, false);
    assert.equal(ownerMeta.rolcreaterole, false);

    // Run all 23 Prisma migrations as non-superuser ownerRole.
    const migrationCount = (await readdir('packages/db/prisma/migrations')).filter(n => n !== 'migration_lock.toml').length;
    assert.equal(migrationCount, 23);
    migrationRunner(ownerUrl, 'deploy', migrationCount);

    // Grant legacyRole and successorRole realistic runtime privileges on public objects, keeping PUBLIC zero-access on sidecars.
    await ownerPool.query(`GRANT USAGE ON SCHEMA public TO ${groupRole}`);
    await adminPool.query(`GRANT ${groupRole} TO ${legacyRole}`);
    await adminPool.query(`GRANT ${groupRole} TO ${successorRole}`);
    await ownerPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ${legacyRole}`);
    await ownerPool.query(`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO ${successorRole}`);
    await ownerPool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${legacyRole}`);
    await ownerPool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${successorRole}`);
    await ownerPool.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${legacyRole}`);
    await ownerPool.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${successorRole}`);
    await ownerPool.query(`REVOKE ALL ON TABLE ${CJP_TABLES.map(t => `public.${t}`).join(', ')} FROM PUBLIC`);
    await ownerPool.query(`REVOKE SELECT (password_hash) ON TABLE public.users FROM PUBLIC`);

    // 2. Full PG 18.6 effective ACL inventory across database, schema, tables, columns, functions, and role memberships.
    const dbAcl = (
      await ownerPool.query(
        `SELECT datname, datacl::text AS datacl,
                has_database_privilege('public', datname, 'CONNECT') AS pub_connect,
                has_database_privilege('public', datname, 'TEMP') AS pub_temp,
                EXISTS (SELECT 1 FROM aclexplode(COALESCE(datacl, acldefault('d', datdba))) WHERE grantee = 0) AS pub_acl_entry
         FROM pg_database WHERE datname = $1`,
        [dbName],
      )
    ).rows[0];
    assert.equal(dbAcl.pub_connect, false, 'PUBLIC must not hold CONNECT on ephemeral DB');
    assert.equal(dbAcl.pub_temp, false, 'PUBLIC must not hold TEMP on ephemeral DB');
    assert.equal(dbAcl.pub_acl_entry, false, 'PUBLIC must not have any entry in datacl');

    const schemaAcl = (
      await ownerPool.query(
        `SELECT nspname, nspacl::text AS nspacl,
                has_schema_privilege('public', 'public', 'USAGE') AS pub_usage,
                has_schema_privilege('public', 'public', 'CREATE') AS pub_create,
                EXISTS (SELECT 1 FROM aclexplode(COALESCE(nspacl, acldefault('n', nspowner))) WHERE grantee = 0) AS pub_acl_entry
         FROM pg_namespace WHERE nspname = 'public'`,
      )
    ).rows[0];
    assert.equal(schemaAcl.pub_usage, false, 'PUBLIC must not hold USAGE on public');
    assert.equal(schemaAcl.pub_create, false, 'PUBLIC must not hold CREATE on public');
    assert.equal(schemaAcl.pub_acl_entry, false, 'PUBLIC must not have any entry in nspacl');

    const relAcls = (
      await ownerPool.query(
        `SELECT c.relname,
                c.relacl::text AS relacl,
                acldefault('r', c.relowner)::text AS default_acl,
                has_table_privilege('public', format('public.%I', c.relname), 'SELECT') AS pub_sel,
                has_table_privilege('public', format('public.%I', c.relname), 'INSERT') AS pub_ins,
                has_table_privilege('public', format('public.%I', c.relname), 'UPDATE') AS pub_upd,
                has_table_privilege('public', format('public.%I', c.relname), 'DELETE') AS pub_del,
                has_table_privilege($2, format('public.%I', c.relname), 'SELECT') AS leg_sel,
                has_table_privilege($3, format('public.%I', c.relname), 'SELECT') AS suc_sel
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
         ORDER BY c.relname`,
        [CJP_TABLES, legacyRole, successorRole],
      )
    ).rows;
    assert.equal(relAcls.length, 5);
    for (const row of relAcls) {
      assert.equal(row.pub_sel, false, `${row.relname} must not grant PUBLIC SELECT`);
      assert.equal(row.pub_ins, false, `${row.relname} must not grant PUBLIC INSERT`);
      assert.equal(row.pub_upd, false, `${row.relname} must not grant PUBLIC UPDATE`);
      assert.equal(row.pub_del, false, `${row.relname} must not grant PUBLIC DELETE`);
      assert.equal(row.leg_sel, true);
      assert.equal(row.suc_sel, true);
    }

    const colAcls = (
      await ownerPool.query(
        `SELECT a.attname, a.attacl::text AS attacl,
                has_column_privilege('public', 'public.users', a.attname, 'SELECT') AS pub_col_sel
         FROM pg_attribute a
         WHERE a.attrelid = 'public.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attname = 'password_hash'`,
      )
    ).rows[0];
    assert.equal(colAcls.pub_col_sel, false);

    const procAcls = (
      await ownerPool.query(
        `SELECT p.proname, p.proacl::text AS proacl, p.prosecdef,
                has_function_privilege('public', p.oid, 'EXECUTE') AS pub_exec,
                has_function_privilege($2, p.oid, 'EXECUTE') AS suc_exec
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = ANY($1::text[])
         ORDER BY p.proname`,
        [CJP_FUNCTIONS, successorRole],
      )
    ).rows;
    assert.equal(procAcls.length, 10);
    for (const p of procAcls) {
      assert.equal(p.prosecdef, false, `${p.proname} must be SECURITY INVOKER`);
      assert.equal(p.pub_exec, false, `${p.proname} must revoke PUBLIC EXECUTE`);
      assert.equal(p.suc_exec, true);
    }

    const memberRows = (
      await ownerPool.query(
        `SELECT r.rolname AS grp, m.rolname AS member
         FROM pg_auth_members am
         JOIN pg_roles r ON r.oid = am.roleid
         JOIN pg_roles m ON m.oid = am.member
         WHERE r.rolname = $1
         ORDER BY m.rolname`,
        [groupRole],
      )
    ).rows;
    assert.deepEqual(memberRows.map(x => x.member), [legacyRole, successorRole].sort());

    // Seed baseline clinical/org/directory/booking/pharmacy data cleanly as ownerRole.
    const store = createOrganizationPersistence(ownerUrl);
    const identities = createPersistence(ownerUrl);
    const auth = createAuthPersistence(ownerUrl);
    const directory = createDirectoryPersistence(ownerUrl);
    const availability = createAvailabilityPersistence(ownerUrl);
    const bookings = createBookingPersistence(ownerUrl);
    const consultations = createConsultationPersistence(ownerUrl);
    const prescriptions = createPrescriptionPersistence(ownerUrl);
    const authorization = createAuthorizationPersistence(successorUrl);
    const prescriptionsSuccessor = createPrescriptionPersistence(successorUrl);
    const pharmacySuccessor = prescriptionsSuccessor.pharmacy;
    const guardSuccessor = createCareJourneyGuardPersistence(successorUrl);
    cleanupHandles.push(
      () => guardSuccessor.close(),
      () => prescriptionsSuccessor.close(),
      () => authorization.close(),
      () => prescriptions.close(),
      () => consultations.close(),
      () => bookings.close(),
      () => availability.close(),
      () => directory.close(),
      () => auth.close(),
      () => identities.close(),
      () => store.close(),
    );

    const passwordHash = await hashPassword(Buffer.from(randomBytes(24).toString('base64url')));
    const admin = await identities.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash, role: 'ADMIN' });
    const clinician = await identities.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash, role: 'CLINICIAN', profile: { displayName: 'A0 Clinician' } });
    const patient = await identities.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash, role: 'PATIENT', profile: { displayName: 'A0 Patient' } });
    const pharmacyUser = await identities.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash, role: 'PHARMACY_STAFF' });

    const adminActor = await auth.createSession({ userId: admin.id, verifiedHash: passwordHash, tokenHash: randomBytes(32).toString('hex'), previousHash: null });
    const clinicianActor = await auth.createSession({ userId: clinician.id, verifiedHash: passwordHash, tokenHash: randomBytes(32).toString('hex'), previousHash: null });
    const patientActor = await auth.createSession({ userId: patient.id, verifiedHash: passwordHash, tokenHash: randomBytes(32).toString('hex'), previousHash: null });
    const pharmacyActor = await auth.createSession({ userId: pharmacyUser.id, verifiedHash: passwordHash, tokenHash: randomBytes(32).toString('hex'), previousHash: null });

    const clinicOrg = (await store.createOrganization(adminActor, { kind: 'CLINIC', name: 'A0 Synthetic Clinic', operationKey: randomUUID() })).organization;
    const pharmacyOrg = (await store.createOrganization(adminActor, { kind: 'PHARMACY', name: 'A0 Synthetic Pharmacy', operationKey: randomUUID() })).organization;
    const membership = (await store.grantMembership(adminActor, { organizationId: clinicOrg.id, userId: clinician.id, operationKey: randomUUID() })).membership;
    await store.grantMembership(adminActor, { organizationId: pharmacyOrg.id, userId: pharmacyUser.id, operationKey: randomUUID() });

    let specialty = (await directory.createSpecialty(adminActor, { key: 'a0-general', displayName: 'A0 General', operationKey: randomUUID() })).specialty;
    specialty = (await directory.setSpecialty(adminActor, { specialtyId: specialty.id, displayName: specialty.displayName, isPublished: true, expectedVersion: specialty.version })).specialty;
    let clinic = (await directory.createClinic(adminActor, { organizationId: clinicOrg.id, displayName: 'A0 Clinic', city: 'Cairo', address: 'Synthetic 1', operationKey: randomUUID() })).clinic;
    await directory.setClinic(adminActor, { clinicId: clinic.id, displayName: clinic.displayName, city: clinic.city, address: clinic.address, isPublished: true, expectedVersion: clinic.version });
    let provider = (await directory.createProvider(adminActor, { clinicianId: clinician.profileId, specialtyId: specialty.id, displayName: 'Dr A0', operationKey: randomUUID() })).provider;
    const publication = (await directory.publishAffiliation(adminActor, { providerId: provider.id, membershipId: membership.id, operationKey: randomUUID() })).publication;
    provider = (await directory.setProvider(adminActor, { providerId: provider.id, specialtyId: provider.specialtyId, displayName: provider.displayName, isPublished: true, expectedVersion: provider.version })).provider;

    await availability.setConfiguration(adminActor, {
      organizationId: clinicOrg.id,
      expectedVersion: 0,
      timeZone: 'UTC',
      durationMinutes: 30,
      minimumBookingLead: 0,
      publicationHorizonDays: 30,
    });
    const dbNowSeed = new Date((await ownerPool.query('SELECT clock_timestamp() now')).rows[0].now);
    const slotA = await availability.publish(clinicianActor, {
      clinicId: clinic.publicId,
      startAt: new Date(dbNowSeed.getTime() + 1500).toISOString(),
      endAt: new Date(dbNowSeed.getTime() + 30 * 60000 + 1500).toISOString(),
      operationKey: randomUUID(),
    });
    const bookingA = await bookings.create(patientActor, { slotId: slotA.id, operationKey: randomUUID() });
    const slotB = await availability.publish(clinicianActor, {
      clinicId: clinic.publicId,
      startAt: new Date(dbNowSeed.getTime() + 120 * 60000).toISOString(),
      endAt: new Date(dbNowSeed.getTime() + 150 * 60000).toISOString(),
      operationKey: randomUUID(),
    });
    const bookingB = await bookings.create(patientActor, { slotId: slotB.id, operationKey: randomUUID() });

    // Wait only if slotA has not yet entered its appointment window naturally.
    const remMs = new Date(slotA.startAt).getTime() - (await ownerPool.query('SELECT clock_timestamp() now')).rows[0].now.getTime();
    if (remMs >= 0) {
      await setTimeout(remMs + 60);
    }

    const ctx = {
      admin, clinician, patient, patientActor, clinicOrg, provider, membership, publication, booking: bookingA,
    };
    const seededA = await seedJourneyOnPool(ownerPool, ctx);

    // 3. Prove REVOKE CONNECT (42501) and NOLOGIN (28000) fail ONLY for new connections while existing/prepared/in-flight sessions survive.
    const legacyEstablished = new pg.Client({ connectionString: legacyUrl });
    const legacyClientErrors = [];
    let resolveTerminated;
    const terminatedErrPromise = new Promise(resolve => {
      resolveTerminated = resolve;
    });
    legacyEstablished.on('error', err => {
      legacyClientErrors.push(err);
      if (err?.code === '57P01') {
        resolveTerminated(err);
      }
    });
    cleanupHandles.push(() => legacyEstablished.end().catch(() => {}));
    await legacyEstablished.connect();
    const prepInitRes = await legacyEstablished.query({
      name: 'cjp_probe_stmt',
      text: 'SELECT id FROM public.users WHERE id = $1',
      values: [patient.id],
    });
    assert.equal(prepInitRes.rows[0].id, patient.id);
    await legacyEstablished.query('BEGIN');
    await legacyEstablished.query('SELECT id FROM public.care_journeys WHERE id = $1 FOR SHARE', [seededA.journeyId]);

    const legacyPool = new pg.Pool({ connectionString: legacyUrl, max: 2 });
    legacyPool.on('error', () => {});
    cleanupHandles.push(() => legacyPool.end().catch(() => {}));
    const pooledEstablished = await legacyPool.connect();
    await pooledEstablished.query('SELECT 1');
    pooledEstablished.release();

    // Case 3a: REVOKE CONNECT alone rejects new login with SQLSTATE 42501.
    await adminPool.query(`REVOKE CONNECT ON DATABASE ${dbName} FROM ${legacyRole}`);
    await assert.rejects(async () => {
      const c = new pg.Client({ connectionString: legacyUrl });
      c.on('error', () => {});
      try {
        await c.connect();
      } finally {
        await c.end().catch(() => {});
      }
    }, err => err.code === '42501');

    // Restore CONNECT and apply NOLOGIN: new login fails with SQLSTATE 28000.
    await adminPool.query(`GRANT CONNECT ON DATABASE ${dbName} TO ${legacyRole}`);
    await adminPool.query(`ALTER ROLE ${legacyRole} NOLOGIN`);
    await assert.rejects(async () => {
      const c = new pg.Client({ connectionString: legacyUrl });
      c.on('error', () => {});
      try {
        await c.connect();
      } finally {
        await c.end().catch(() => {});
      }
    }, err => err.code === '28000');

    // Re-apply REVOKE CONNECT too: BOTH CONNECT revoked + NOLOGIN, yet established prepared + in-flight tx KEEP RUNNING!
    await adminPool.query(`REVOKE CONNECT ON DATABASE ${dbName} FROM ${legacyRole}`);
    const prepRes = await legacyEstablished.query({
      name: 'cjp_probe_stmt',
      text: 'SELECT id FROM public.users WHERE id = $1',
      values: [patient.id],
    });
    assert.equal(prepRes.rows[0].id, patient.id);
    await legacyEstablished.query('COMMIT');

    // 4. REVOKE ALL (42501) + SET ROLE containment + Wait Pair 5 + targeted pg_terminate_backend (57P01) -> 0 retained sessions/locks.
    // First hold an active lock on care_journeys from legacyEstablished, blocking successor termination writer (Wait Pair 5), then terminate legacy!
    const legacyLockPid = (await legacyEstablished.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    await legacyEstablished.query('BEGIN');
    await legacyEstablished.query('SELECT id FROM public.care_journeys WHERE id = $1 FOR SHARE', [seededA.journeyId]);

    const successorPool = new pg.Pool({ connectionString: successorUrl, max: 6 });
    successorPool.on('error', () => {});
    cleanupHandles.push(() => successorPool.end());

    const blockedTerminationPromise = terminateJourney(successorPool, ctx, seededA, 'PATIENT_STOP');
    blockedTerminationPromise.catch(() => {});
    const waiterTermPid = (
      await ownerPool.query(
        `SELECT pid FROM pg_stat_activity WHERE datname = $1 AND usename = $2 AND $3 = ANY(pg_blocking_pids(pid))`,
        [dbName, successorRole, legacyLockPid],
      )
    );
    if (waiterTermPid.rowCount === 0) {
      let foundWaiter = null;
      const startW = Date.now();
      while (Date.now() - startW < 4000) {
        const q = await ownerPool.query(
          `SELECT pid FROM pg_stat_activity WHERE datname = $1 AND usename = $2 AND $3 = ANY(pg_blocking_pids(pid))`,
          [dbName, successorRole, legacyLockPid],
        );
        if (q.rows[0]?.pid) {
          foundWaiter = q.rows[0].pid;
          break;
        }
        await setTimeout(20);
      }
      assert.ok(foundWaiter, 'Expected successor writer to block on legacyRole held lock (Wait Pair 5)');
      console.log('CJP_A0_WAIT_PAIR_5_LEGACY_LOCK', JSON.stringify({ legacyLockPid, successorWaiterPid: foundWaiter }));
    }

    // Revoke membership and privileges on legacyRole before terminating backends.
    await adminPool.query(`REVOKE ${groupRole} FROM ${legacyRole}`);
    await ownerPool.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${legacyRole}`);
    await ownerPool.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${legacyRole}`);
    await ownerPool.query(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ${legacyRole}`);
    await ownerPool.query(`REVOKE ALL ON SCHEMA public FROM ${legacyRole}`);

    // Verify SET ROLE and direct table query fail with 42501 on pooledEstablished BEFORE pg_terminate_backend!
    const pooledCheckClient = await legacyPool.connect();
    pooledCheckClient.on('error', () => {});
    await assert.rejects(
      () => pooledCheckClient.query(`SET ROLE ${groupRole}`),
      err => err.code === '42501',
    );
    await assert.rejects(
      () => pooledCheckClient.query('SELECT count(*) FROM public.care_journeys'),
      err => err.code === '42501',
    );
    pooledCheckClient.release();

    // Expect 57P01 on legacyEstablished when targeted pg_terminate_backend fires, and verify successor writer commits immediately!
    const termCount = (
      await adminOnEphemeralPool.query(
        `SELECT count(*)::int AS n FROM (
           SELECT pg_terminate_backend(pid)
           FROM pg_stat_activity
           WHERE datname = $1 AND usename = $2 AND pid <> pg_backend_pid()
         ) t`,
        [dbName, legacyRole],
      )
    ).rows[0].n;
    assert.ok(termCount >= 1);

    const [termErr] = await Promise.all([terminatedErrPromise, blockedTerminationPromise]);
    assert.equal(termErr.code, '57P01');
    assert.ok(legacyClientErrors.some(e => e?.code === '57P01'));
    await legacyEstablished.end().catch(() => {});

    // Pooled reconnect attempt as legacyRole fails immediately with 28000 / 42501; zero retained sessions/locks remain!
    await assert.rejects(
      () => legacyPool.query('SELECT 1'),
      err => ['28000', '42501', '57P01'].includes(err.code),
    );
    await legacyPool.end().catch(() => {});

    const retainedSessions = (
      await adminOnEphemeralPool.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1 AND usename = $2`,
        [dbName, legacyRole],
      )
    ).rows[0].n;
    assert.equal(retainedSessions, 0);

    const retainedLocks = (
      await adminOnEphemeralPool.query(
        `SELECT count(*)::int AS n
         FROM pg_locks l
         JOIN pg_stat_activity a ON a.pid = l.pid
         WHERE a.datname = $1 AND a.usename = $2`,
        [dbName, legacyRole],
      )
    ).rows[0].n;
    assert.equal(retainedLocks, 0);

    // 5. Remaining 4 real concurrent lock-wait pairs (Pairs 1..4) on successorRole!
    await identities.endAssignment(seededA.assignmentId);
    const seededB = await seedJourneyOnPool(ownerPool, { ...ctx, booking: bookingB, admissionId: seededA.admissionId, skipPair: true, scopeVersion: 'cjp-scope.a0.1' });

    // Wait Pair 1: Guard locks care_journeys FOR SHARE first -> writer termination blocks -> Guard ELIGIBLE -> writer commits -> fresh DENY.
    {
      const gEntered = signal(), gRelease = signal();
      let gHeld = false, gPid;
      const stop = observeApplicabilityQueries((q, next) => {
        if (!gHeld && /FROM public\.care_journeys/.test(q.text) && /FOR SHARE/.test(q.text)) {
          gHeld = true;
          return Promise.resolve(next()).then(async r => {
            gPid = q.pid;
            gEntered.resolve();
            await gRelease.promise;
            return r;
          });
        }
        return next();
      });
      const guardP = guardSuccessor.evaluateReadAccess({
        actor: authActor(clinicianActor),
        patientId: patient.profileId,
        clinicianId: clinician.profileId,
        organizationId: clinicOrg.id,
        journeyId: seededB.journeyId,
        resourceClass: 'PROFILE',
      });
      guardP.catch(() => {});
      let wPid;
      const wReady = signal();
      const writerP = (async () => {
        await gEntered.promise;
        const cw = await successorPool.connect();
        try {
          wPid = (await cw.query('SELECT pg_backend_pid() pid')).rows[0].pid;
          wReady.resolve();
          await cw.query('BEGIN');
          await cw.query("SET LOCAL lock_timeout='5s'");
          const ev = randomUUID();
          await cw.query(
            `INSERT INTO public.care_journey_events (
              id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
              actor_user_id, actor_role, policy_version, scope_version, purpose
            ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,'CARE_JOURNEY')`,
            [ev, patient.profileId, clinician.profileId, seededB.journeyId, seededB.admissionId, clinicOrg.id, patient.id, seededB.policyVersion, seededB.scopeVersion],
          );
          const t = (await cw.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ev])).rows[0].recorded_at;
          await cw.query(`UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='PATIENT_STOP' WHERE id=$1`, [seededB.journeyId, t, ev]);
          await cw.query('COMMIT');
        } finally {
          await cw.query('ROLLBACK').catch(() => {});
          cw.release();
        }
      })();
      try {
        await Promise.all([gEntered.promise, wReady.promise]);
        await waitBlocked(ownerPool, wPid, 4000, gPid);
        gRelease.resolve();
        const [gRes] = await Promise.all([guardP, writerP]);
        assert.equal(gRes.decision, 'ELIGIBLE');
        console.log('CJP_A0_WAIT_PAIR_1', JSON.stringify({ gPid, wPid }));
      } finally {
        gRelease.resolve();
        stop();
      }
      const postRes = await guardSuccessor.evaluateReadAccess({
        actor: authActor(clinicianActor),
        patientId: patient.profileId,
        clinicianId: clinician.profileId,
        organizationId: clinicOrg.id,
        journeyId: seededB.journeyId,
        resourceClass: 'PROFILE',
      });
      assert.equal(postRes.decision, 'DENY');
      assert.equal(postRes.reason, 'JOURNEY_ENDED');
    }

    // Open jC for Wait Pairs 2, 3, 4 & Positive Controls.
    await identities.endAssignment(seededB.assignmentId);
    const slotC = await availability.publish(clinicianActor, {
      clinicId: clinic.publicId,
      startAt: new Date(dbNowSeed.getTime() + 180 * 60000).toISOString(),
      endAt: new Date(dbNowSeed.getTime() + 210 * 60000).toISOString(),
      operationKey: randomUUID(),
    });
    const bookingC = await bookings.create(patientActor, { slotId: slotC.id, operationKey: randomUUID() });
    const seededC = await seedJourneyOnPool(ownerPool, { ...ctx, booking: bookingC, admissionId: seededA.admissionId, skipPair: true, scopeVersion: 'cjp-scope.a0.2' });

    // Wait Pair 2: Termination writer blocks Guard -> writer commits -> Guard wakes -> DENY.
    {
      const wEntered = signal(), wRelease = signal(), gReady = signal();
      let wHeld = false, wPid, gPid;
      const stop = observeApplicabilityQueries((q, next) => {
        if (!wHeld && /UPDATE public\.care_journeys SET ended_at/.test(q.text)) {
          wHeld = true;
          return Promise.resolve(next()).then(async r => {
            wPid = q.pid;
            wEntered.resolve();
            await wRelease.promise;
            return r;
          });
        }
        if (wHeld && /FROM public\.care_journeys/.test(q.text) && /FOR SHARE/.test(q.text)) {
          gPid = q.pid;
          gReady.resolve();
        }
        return next();
      });
      const writerP = terminateJourney(successorPool, ctx, seededC, 'CLINICIAN_END');
      writerP.catch(() => {});
      const guardP = (async () => {
        await wEntered.promise;
        return guardSuccessor.evaluateReadAccess({
          actor: authActor(clinicianActor),
          patientId: patient.profileId,
          clinicianId: clinician.profileId,
          organizationId: clinicOrg.id,
          journeyId: seededC.journeyId,
          resourceClass: 'SUMMARY',
        });
      })();
      try {
        await Promise.all([wEntered.promise, gReady.promise]);
        await waitBlocked(ownerPool, gPid, 4000, wPid);
        wRelease.resolve();
        const [, gRes] = await Promise.all([writerP, guardP]);
        assert.equal(gRes.decision, 'DENY');
        assert.equal(gRes.reason, 'JOURNEY_ENDED');
        console.log('CJP_A0_WAIT_PAIR_2', JSON.stringify({ wPid, gPid }));
      } finally {
        wRelease.resolve();
        stop();
      }
    }

    // Open jD for Wait Pairs 3 (assignment end) and 4 (clinic deactivation) + positive Journey control.
    await identities.endAssignment(seededC.assignmentId);
    const slotD = await availability.publish(clinicianActor, {
      clinicId: clinic.publicId,
      startAt: new Date(dbNowSeed.getTime() + 240 * 60000).toISOString(),
      endAt: new Date(dbNowSeed.getTime() + 270 * 60000).toISOString(),
      operationKey: randomUUID(),
    });
    const bookingD = await bookings.create(patientActor, { slotId: slotD.id, operationKey: randomUUID() });
    const seededD = await seedJourneyOnPool(ownerPool, { ...ctx, booking: bookingD, admissionId: seededA.admissionId, skipPair: true, scopeVersion: 'cjp-scope.a0.3' });

    // Wait Pair 3: Assignment end writer blocks Guard -> Guard wakes -> DENY (ASSIGNMENT_INACTIVE).
    {
      const aEntered = signal(), aRelease = signal(), gReady = signal();
      let aHeld = false, aPid, gPid;
      const stop = observeApplicabilityQueries((q, next) => {
        if (!aHeld && /UPDATE "public"\."clinician_patient_assignments"/.test(q.text)) {
          aHeld = true;
          return Promise.resolve(next()).then(async r => {
            aPid = q.pid;
            aEntered.resolve();
            await aRelease.promise;
            return r;
          });
        }
        if (aHeld && /FROM public\.clinician_patient_assignments/.test(q.text) && /FOR SHARE/.test(q.text)) {
          gPid = q.pid;
          gReady.resolve();
        }
        return next();
      });
      const assignEndP = (async () => {
        const ca = await successorPool.connect();
        try {
          await ca.query('BEGIN');
          await ca.query(`UPDATE "public"."clinician_patient_assignments" SET status='ENDED', ended_at=clock_timestamp() WHERE id=$1`, [seededD.assignmentId]);
          await ca.query('COMMIT');
        } finally {
          await ca.query('ROLLBACK').catch(() => {});
          ca.release();
        }
      })();
      assignEndP.catch(() => {});
      const guardP = (async () => {
        await aEntered.promise;
        return guardSuccessor.evaluateReadAccess({
          actor: authActor(clinicianActor),
          patientId: patient.profileId,
          clinicianId: clinician.profileId,
          organizationId: clinicOrg.id,
          journeyId: seededD.journeyId,
          resourceClass: 'FOLLOW_UP',
        });
      })();
      try {
        await Promise.all([aEntered.promise, gReady.promise]);
        await waitBlocked(ownerPool, gPid, 4000, aPid);
        aRelease.resolve();
        const [, gRes] = await Promise.all([assignEndP, guardP]);
        assert.equal(gRes.decision, 'DENY');
        assert.equal(gRes.reason, 'ASSIGNMENT_INACTIVE');
        console.log('CJP_A0_WAIT_PAIR_3', JSON.stringify({ aPid, gPid }));
      } finally {
        aRelease.resolve();
        stop();
      }
    }

    // Terminate seededD cleanly (SCOPE_LOST) before opening jE for Wait Pair 4 (clinic deactivation) & Positive Controls.
    await terminateJourney(ownerPool, ctx, seededD, 'SCOPE_LOST');
    const slotE = await availability.publish(clinicianActor, {
      clinicId: clinic.publicId,
      startAt: new Date(dbNowSeed.getTime() + 300 * 60000).toISOString(),
      endAt: new Date(dbNowSeed.getTime() + 330 * 60000).toISOString(),
      operationKey: randomUUID(),
    });
    const bookingE = await bookings.create(patientActor, { slotId: slotE.id, operationKey: randomUUID() });
    const seededE = await seedJourneyOnPool(ownerPool, { ...ctx, booking: bookingE, admissionId: seededA.admissionId, skipPair: true, scopeVersion: 'cjp-scope.a0.4' });

    // 6. Positive Controls on successorRole AFTER legacyRole full containment:
    // Control A: Patient-own read/booking & authorization check succeeds cleanly.
    const patProfileAccess = await authorization.readPatientProfileAccess(patientActor, { patientId: patient.profileId });
    assert.equal(patProfileAccess.sessionValid, true);
    assert.equal(patProfileAccess.principalConsistent, true);
    assert.equal(patProfileAccess.profile?.id, patient.profileId);

    // Control B: Eligible Care Journey read succeeds as ELIGIBLE.
    const eligRes = await guardSuccessor.evaluateReadAccess({
      actor: authActor(clinicianActor),
      patientId: patient.profileId,
      clinicianId: clinician.profileId,
      organizationId: clinicOrg.id,
      journeyId: seededE.journeyId,
      resourceClass: 'PRESCRIPTION',
    });
    assert.equal(eligRes.decision, 'ELIGIBLE');

    // Control C: Legacy D36 Pharmacy dispense chain executes cleanly as successorRole.
    const openRes = await consultations.open(clinicianActor, { bookingId: bookingA.id, operationKey: randomUUID() });
    const draftRx = await prescriptions.execute('DRAFT', clinicianActor, {
      consultationId: openRes.id,
      items: [{ medicationId: MEDICATION_ID, quantity: '10.000', unit: 'tablets', instructions: 'A0 D36 synthetic instruction' }],
      validFrom: '2026-01-01T00:00:00.000Z',
      validUntil: '2099-01-01T00:00:00.000Z',
      operationKey: randomUUID(),
    });
    const signedRx = await prescriptions.execute('SIGN', clinicianActor, {
      consultationId: openRes.id,
      prescriptionId: draftRx.data.id,
      expectedVersion: draftRx.data.version,
      operationKey: randomUUID(),
    });
    const routed = await pharmacySuccessor.execute('ROUTE', clinicianActor, {
      consultationId: openRes.id,
      prescriptionId: signedRx.data.id,
      expectedVersion: signedRx.data.version,
      itemIds: signedRx.data.items.map(i => i.id),
      destinationId: pharmacyOrg.id,
      operationKey: randomUUID(),
    });
    const accepted = await pharmacySuccessor.execute('ACCEPT', pharmacyActor, {
      pharmacyId: routed.data.pharmacyId,
      routeId: routed.data.id,
      expectedVersion: routed.data.version,
      operationKey: randomUUID(),
    });
    const dispensed = await pharmacySuccessor.execute('DISPENSE', pharmacyActor, {
      pharmacyId: accepted.data.pharmacyId,
      routeId: accepted.data.id,
      expectedVersion: accepted.data.version,
      itemId: signedRx.data.items[0].id,
      operationKey: randomUUID(),
    });
    assert.ok([200, 201].includes(dispensed.status));

    // Negative Counterexamples BEFORE Wait Pair 4 clinic deactivation:
    // a) Even non-superuser ownerRole cannot bypass sidecar history trigger on DELETE/TRUNCATE.
    await assert.rejects(
      () => ownerPool.query('DELETE FROM public.care_journey_events WHERE id = $1', [randomUUID()]),
      err => err.code === '23514',
    );
    // b) Non-CLINICIAN role rejected as ROLE_NOT_CLINICIAN.
    const adminRes = await guardSuccessor.evaluateReadAccess({
      actor: authActor(adminActor),
      patientId: patient.profileId,
      clinicianId: clinician.profileId,
      organizationId: clinicOrg.id,
      journeyId: seededE.journeyId,
      resourceClass: 'BP',
    });
    assert.equal(adminRes.decision, 'DENY');
    assert.equal(adminRes.reason, 'ROLE_NOT_CLINICIAN');
    // c) Cross-scope journeyId returns DENY (JOURNEY_SCOPE_MISMATCH), never OUTSIDE_COHORT.
    const crossRes = await guardSuccessor.evaluateReadAccess({
      actor: authActor(clinicianActor),
      patientId: patient.profileId,
      clinicianId: clinician.profileId,
      organizationId: pharmacyOrg.id,
      journeyId: seededE.journeyId,
      resourceClass: 'BP',
    });
    assert.equal(crossRes.decision, 'DENY');
    assert.equal(crossRes.reason, 'JOURNEY_SCOPE_MISMATCH');

    // Wait Pair 4: Clinic deactivation writer blocks Guard -> Guard wakes -> DENY (CLINIC_INACTIVE_OR_STATUS_CHANGED).
    {
      const oEntered = signal(), oRelease = signal(), gReady = signal();
      let oHeld = false, oPid, gPid;
      const stop = observeApplicabilityQueries((q, next) => {
        if (!oHeld && /UPDATE "public"\."organizations"/.test(q.text)) {
          oHeld = true;
          return Promise.resolve(next()).then(async r => {
            oPid = q.pid;
            oEntered.resolve();
            await oRelease.promise;
            return r;
          });
        }
        if (oHeld && /FROM public\.organizations/.test(q.text) && /FOR SHARE/.test(q.text)) {
          gPid = q.pid;
          gReady.resolve();
        }
        return next();
      });
      const orgDeactP = (async () => {
        const co = await successorPool.connect();
        try {
          await co.query('BEGIN');
          await co.query(
            `UPDATE "public"."organizations" SET status='SUSPENDED', status_version=status_version+1, status_changed_by_user_id=$2, status_changed_at=clock_timestamp() WHERE id=$1`,
            [clinicOrg.id, admin.id],
          );
          await co.query('COMMIT');
        } finally {
          await co.query('ROLLBACK').catch(() => {});
          co.release();
        }
      })();
      orgDeactP.catch(() => {});
      const guardP = (async () => {
        await oEntered.promise;
        return guardSuccessor.evaluateReadAccess({
          actor: authActor(clinicianActor),
          patientId: patient.profileId,
          clinicianId: clinician.profileId,
          organizationId: clinicOrg.id,
          journeyId: seededE.journeyId,
          resourceClass: 'BP',
        });
      })();
      try {
        await Promise.all([oEntered.promise, gReady.promise]);
        await waitBlocked(ownerPool, gPid, 4000, oPid);
        oRelease.resolve();
        const [, gRes] = await Promise.all([orgDeactP, guardP]);
        assert.equal(gRes.decision, 'DENY');
        assert.equal(gRes.reason, 'CLINIC_INACTIVE_OR_STATUS_CHANGED');
        console.log('CJP_A0_WAIT_PAIR_4', JSON.stringify({ oPid, gPid }));
      } finally {
        oRelease.resolve();
        stop();
      }
    }
  } finally {
    for (const closeFn of cleanupHandles) {
      await closeFn().catch(() => {});
    }
    if (adminOnEphemeralPool) {
      await adminOnEphemeralPool.end().catch(() => {});
    }
    await adminPool.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    ).catch(() => {});
    await adminPool.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => {});
    for (const r of [legacyRole, successorRole, groupRole, ownerRole]) {
      await adminPool.query(`DROP ROLE IF EXISTS ${r}`).catch(() => {});
    }
    const leftoverDb = (await adminPool.query('SELECT count(*)::int n FROM pg_database WHERE datname = $1', [dbName])).rows[0].n;
    const leftoverRoles = (await adminPool.query('SELECT count(*)::int n FROM pg_roles WHERE rolname = ANY($1::text[])', [[ownerRole, legacyRole, successorRole, groupRole]])).rows[0].n;
    await adminPool.end();
    assert.equal(leftoverDb, 0, 'Ephemeral A0 database must be completely dropped in finally');
    assert.equal(leftoverRoles, 0, 'Ephemeral A0 roles must be completely dropped in finally');
  }
});
