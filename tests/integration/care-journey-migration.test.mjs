import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isolatedPharmacy } from '../support/pharmacy.mjs';
import { isolatedBookings } from '../support/bookings.mjs';
import { migrationRunner } from '../support/migration-runner.mjs';
import { observeApplicabilityQueries, signal, waitBlocked } from '../support/observed-applicability.mjs';
import { createAuthorizationPersistence } from '../../packages/db/dist/index.js';

const DARK_TABLES = [
  'care_journey_pairs',
  'care_journeys',
  'care_journey_bookings',
  'care_journey_events',
  'care_journey_clinic_admissions',
];

const NOTICE_DIGEST = 'a'.repeat(64);
const FINGERPRINT = 'b'.repeat(64);

async function bootstrapAdmission(pool, f, extra = {}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const admissionId = randomUUID();
    const verificationEventId = randomUUID();
    const participationEventId = randomUUID();
    const credentialReference = extra.credentialReference ?? randomUUID();
    const verifiedAt = new Date((await c.query('SELECT clock_timestamp()::timestamptz(3) now')).rows[0].now);
    const validUntil = extra.validUntil ?? new Date(verifiedAt.getTime() + 30 * 86400 * 1000);
    const policyVersion = extra.policyVersion ?? 'cjp-policy.v1';
    const purpose = extra.purpose ?? 'CARE_JOURNEY_V1';

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, clinician_id, admission_id, organization_id,
        actor_user_id, actor_role, policy_version, purpose, credential_reference, recorded_at
      ) VALUES ($1, 'CLINIC_VERIFIED', 'SYSTEM', $2, $3, $4, NULL, NULL, $5, $6, $7, $8)`,
      [verificationEventId, f.users.clinician.profileId, admissionId, f.clinicOrg.id, policyVersion, purpose, credentialReference, verifiedAt],
    );
    const actualVerifiedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [verificationEventId])).rows[0].recorded_at;

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, clinician_id, admission_id, organization_id,
        actor_user_id, actor_role, policy_version, purpose
      ) VALUES ($1, 'STANDING_OPT_IN', 'PARTICIPANT', $2, $3, $4, $5, 'CLINICIAN', $6, $7)`,
      [participationEventId, f.users.clinician.profileId, admissionId, f.clinicOrg.id, f.users.clinician.id, policyVersion, purpose],
    );
    const participatedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [participationEventId])).rows[0].recorded_at;

    await c.query(
      `INSERT INTO public.care_journey_clinic_admissions (
        id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
        policy_version, purpose, credential_source, credential_issuer, credential_reference,
        verified_at, valid_until, participated_at, verification_epoch, participation_epoch,
        verification_event_id, participation_event_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SYNTHETIC_REGISTRY','Synthetic Issuer',$10,$11,$12,$13,1,1,$14,$15)`,
      [
        admissionId, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id,
        f.provider.id, f.membership.id, f.publication.id, policyVersion, purpose,
        credentialReference, actualVerifiedAt, validUntil, participatedAt,
        verificationEventId, participationEventId,
      ],
    );
    await c.query('COMMIT');
    return { admissionId, verificationEventId, participationEventId, credentialReference, policyVersion, purpose, validUntil };
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

async function enrollAndOpenJourney(pool, f, admission, booking, options = {}) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const enrollmentEventId = randomUUID();
    const consentEventId = randomUUID();
    const journeyId = randomUUID();
    const bindingId = randomUUID();
    const scopeVersion = options.scopeVersion ?? 'cjp-scope.v1';

    if (!options.skipPair) {
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, actor_user_id, actor_role, policy_version
        ) VALUES ($1, 'ENROLLED', 'PARTICIPANT', $2, $3, $4, 'PATIENT', $5)`,
        [enrollmentEventId, f.users.patient.profileId, f.users.clinician.profileId, f.users.patient.id, admission.policyVersion],
      );
      const enrolledAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [enrollmentEventId])).rows[0].recorded_at;
      await c.query(
        `INSERT INTO public.care_journey_pairs (
          patient_id, clinician_id, enrolled_at, policy_version, enrollment_event_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [f.users.patient.profileId, f.users.clinician.profileId, enrolledAt, admission.policyVersion, enrollmentEventId],
      );
    }

    const assignment = (await c.query(
      `INSERT INTO public.clinician_patient_assignments (clinician_id, patient_id, status)
       VALUES ($1, $2, 'ACTIVE')
       ON CONFLICT (clinician_id, patient_id) WHERE status = 'ACTIVE'
       DO UPDATE SET assigned_at = public.clinician_patient_assignments.assigned_at
       RETURNING id`,
      [f.users.clinician.profileId, f.users.patient.profileId],
    )).rows[0];

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
        actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
        notice_version, notice_digest, locale, affirmative, operation_key, fingerprint
      ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,$11,$12,'notice.v1',$13,'en',true,$14,$15)`,
      [
        consentEventId, f.users.patient.profileId, f.users.clinician.profileId, journeyId,
        admission.admissionId, f.clinicOrg.id, booking.id, f.users.patient.id, f.actors.patient.sessionId,
        admission.policyVersion, scopeVersion, admission.purpose, NOTICE_DIGEST, randomUUID(), FINGERPRINT,
      ],
    );
    const startedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [consentEventId])).rows[0].recorded_at;
    const orgStatusVersion = (await c.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
    const bookingRow = (await c.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [booking.id])).rows[0];
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
        journeyId, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id,
        f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, admission.admissionId, assignment.id,
        scopeVersion, admission.policyVersion, admission.purpose, consentEventId,
        orgStatusVersion, startedAt, bookingRow.end_at, hardExpiresAt,
      ],
    );

    await c.query(
      `INSERT INTO public.care_journey_bookings (
        id, journey_id, booking_id, slot_id, patient_id, patient_user_id,
        clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
        binding_kind, attached_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ANCHOR',$13)`,
      [
        bindingId, journeyId, booking.id, bookingRow.slot_id, f.users.patient.profileId, f.users.patient.id,
        f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id,
        startedAt,
      ],
    );

    await c.query('COMMIT');
    return { journeyId, bindingId, assignmentId: assignment.id, consentEventId, startedAt, hardExpiresAt, originalCeiling: bookingRow.end_at, scopeVersion };
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

async function expectSql23514(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await assert.rejects(
      async () => {
        await fn(c);
        await c.query('COMMIT');
      },
      err => {
        assert.equal(err.code, '23514', `Expected SQLSTATE 23514, got ${err.code}: ${err.message}`);
        return true;
      },
    );
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    c.release();
  }
}

test('CJP B1 populated 22 to 23 upgrade preserves all 63 legacy tables, D36 dispense, and repeats ZERO_WRITE', () =>
  isolatedPharmacy(async f => {
    const route = await f.readyPharmacy();
    const dispensed = await f.dispense(route);
    assert.equal(dispensed.data.items[0].fulfillmentState, 'FULLY_DISPENSED');

    const tables = (await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
    assert.equal(tables.length, 64);
    const snapshot = async names => Object.fromEntries(
      await Promise.all(names.map(async t => [t, (await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])),
    );
    const before = await snapshot(tables);
    const ledger = (await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(ledger.length, 22);

    migrationRunner(f.url, 'deploy', 23);
    migrationRunner(f.url, 'status', 23);

    for (const t of tables.filter(name => name !== '_prisma_migrations')) {
      assert.deepEqual((await snapshot([t]))[t], before[t], t);
    }
    const next = (await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(next.length, 23);
    assert.deepEqual(next.slice(0, 22), ledger);
    for (const row of next) {
      assert.equal(row.checksum, createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
    }
    for (const name of DARK_TABLES) {
      assert.equal((await f.pool.query(`SELECT count(*)::int n FROM public.${name}`)).rows[0].n, 0);
    }

    const all = (await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
    assert.equal(all.length, 69);
    const after = await snapshot(all);
    migrationRunner(f.url, 'deploy', 23);
    migrationRunner(f.url, 'status', 23);
    assert.deepEqual(await snapshot(all), after);

    // D36 fulfillment read and legacy own/assigned authorization remain intact after 22->23.
    const rxRead = await f.prescriptions.signedRead(f.actors.patient, null, f.signed.data.id);
    assert.equal(rxRead.data.items[0].fulfillmentState, 'FULLY_DISPENSED');
    const authz = createAuthorizationPersistence(f.url);
    try {
      const own = await authz.readPatientProfileAccess(f.actors.patient, { patientId: f.users.patient.profileId });
      assert.equal(own.profile.id, f.users.patient.profileId);
      const deniedOther = await authz.readPatientProfileAccess(f.actors.otherClinician ?? f.actors.clinician, { patientId: f.users.otherPatient?.profileId ?? randomUUID() });
      assert.equal(deniedOther.profile, null);
    } finally {
      await authz.close();
    }
    console.log('CJP_B1_POPULATED_UPGRADE', JSON.stringify({
      from: 22, to: 23, oldDomainTables: 63, newDomainTables: 68, sidecarsEmpty: true, repeatDeploy: 'ZERO_WRITE',
    }));
  }, { realRunner: true, migrationCount: 22 }));

test('CJP B1 migration enforces participant-exact provenance, booking-event bindings, post-termination denial, immutability, and concurrency', () =>
  isolatedBookings(async f => {
    const slot1 = await f.publish(30);
    const slot2 = await f.publish(60);
    const unattachedSlot = await f.publish(90);
    const booking1 = await f.create(slot1);
    const unattachedBooking = await f.create(unattachedSlot);
    const admission = await bootstrapAdmission(f.pool, f);
    const journey = await enrollAndOpenJourney(f.pool, f, admission, booking1);

    // Unrelated patient / clinician / lab / pharmacy / admin cannot forge participant events.
    const otherClinician = await f.otherClinician();
    const labUser = { user: await f.identities.createUser({ email: randomUUID() + '@example.invalid', passwordHash: f.hash, role: 'LAB_STAFF' }) };
    const pharmacyUser = { user: await f.identities.createUser({ email: randomUUID() + '@example.invalid', passwordHash: f.hash, role: 'PHARMACY_STAFF' }) };

    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('ENDED', 'PARTICIPANT', $1, $2, $3, $4, $5, $6, $7, 'PATIENT', $8, $9, $10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
          f.clinicOrg.id, booking1.id, f.users.other.id, admission.policyVersion, journey.scopeVersion, admission.purpose,
        ],
      );
    });

    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('CARE_COMPLETED', 'PARTICIPANT', $1, $2, $3, $4, $5, $6, $7, 'CLINICIAN', $8, $9, $10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
          f.clinicOrg.id, booking1.id, otherClinician.user.id, admission.policyVersion, journey.scopeVersion, admission.purpose,
        ],
      );
    });

    for (const badActor of [labUser.user, pharmacyUser.user, f.users.admin]) {
      await expectSql23514(f.pool, async c => {
        await c.query(
          `INSERT INTO public.care_journey_events (
            kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
            actor_user_id, actor_role, policy_version, scope_version, purpose
          ) VALUES ('ENDED', 'PARTICIPANT', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
            f.clinicOrg.id, booking1.id, badActor.id, badActor.role, admission.policyVersion, journey.scopeVersion, admission.purpose,
          ],
        );
      });
    }

    // Booking-event referencing an unbound same-pair/same-clinic booking must reject at commit.
    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('BOOKING_ATTACHED', 'PARTICIPANT', $1, $2, $3, $4, $5, $6, $7, 'PATIENT', $8, $9, $10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
          f.clinicOrg.id, unattachedBooking.id, f.users.patient.id, admission.policyVersion, journey.scopeVersion, admission.purpose,
        ],
      );
    });

    // BOOKING_ATTACHED referencing an ANCHOR binding (not VISIT) must also reject.
    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('BOOKING_ATTACHED', 'PARTICIPANT', $1, $2, $3, $4, $5, $6, $7, 'PATIENT', $8, $9, $10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
          f.clinicOrg.id, booking1.id, f.users.patient.id, admission.policyVersion, journey.scopeVersion, admission.purpose,
        ],
      );
    });

    // PATIENT_STOP cannot use SYSTEM or CLINICIAN event; orphan ENDED event rejected.
    await expectSql23514(f.pool, async c => {
      const fakeEndId = randomUUID();
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ($1, 'ENDED', 'SYSTEM', $2, $3, $4, $5, $6, NULL, NULL, $7, $8, $9)`,
        [fakeEndId, f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId, f.clinicOrg.id, admission.policyVersion, journey.scopeVersion, admission.purpose],
      );
      const endedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [fakeEndId])).rows[0].recorded_at;
      await c.query(
        `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='PATIENT_STOP' WHERE id=$1`,
        [journey.journeyId, endedAt, fakeEndId],
      );
    });

    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ($1, 'ENDED', 'PARTICIPANT', $2, $3, $4, $5, $6, $7, 'PATIENT', $8, $9, $10)`,
        [randomUUID(), f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId, f.clinicOrg.id, f.users.patient.id, admission.policyVersion, journey.scopeVersion, admission.purpose],
      );
    });

    // Sidecar history guards reject UPDATE/DELETE/TRUNCATE on immutable tables and columns.
    await expectSql23514(f.pool, c => c.query(`DELETE FROM public.care_journey_events WHERE id=$1`, [journey.consentEventId]));
    await expectSql23514(f.pool, c => c.query(`UPDATE public.care_journey_pairs SET policy_version='tampered' WHERE patient_id=$1`, [f.users.patient.profileId]));
    await expectSql23514(f.pool, c => c.query(`UPDATE public.care_journeys SET first_care_completed_at=clock_timestamp() WHERE id=$1`, [journey.journeyId]));

    // Second unended Journey for the same pair must reject (cjp_journey_unended_pair).
    const slotLater = await f.publish(120);
    const bookingLater = await f.create(slotLater);
    await expectSql23514(f.pool, async c => {
      const ce2 = randomUUID(), j2 = randomUUID();
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
          notice_version, notice_digest, locale, affirmative
        ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,$11,$12,'notice.v1',$13,'en',true)`,
        [ce2, f.users.patient.profileId, f.users.clinician.profileId, j2, admission.admissionId, f.clinicOrg.id, bookingLater.id, f.users.patient.id, f.actors.patient.sessionId, admission.policyVersion, journey.scopeVersion, admission.purpose, NOTICE_DIGEST],
      );
      const s2 = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ce2])).rows[0].recorded_at;
      const osv = (await c.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
      const b2r = (await c.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [bookingLater.id])).rows[0];
      await assert.rejects(
        c.query(
          `INSERT INTO public.care_journeys (
            id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
            provider_id, membership_id, affiliation_id, admission_id, assignment_id,
            scope_version, policy_version, purpose, consent_event_id,
            clinic_status_version, verification_epoch, participation_epoch,
            started_at, original_pre_care_ceiling_at, hard_expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,1,$17,$18,$19)`,
          [j2, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, admission.admissionId, journey.assignmentId, journey.scopeVersion, admission.policyVersion, admission.purpose, ce2, osv, s2, b2r.end_at, new Date(s2.getTime() + 365 * 86400 * 1000)],
        ),
        err => err.code === '23505' && err.constraint === 'cjp_journey_assignment_key',
      );
      throw Object.assign(new Error('force savepoint abort'), { code: '23514' });
    });

    // Real concurrent lock wait on care_journeys termination vs booking binding (FOR SHARE in cjp_binding_guard).
    const unattachedSlotId = (await f.pool.query('SELECT slot_id FROM public.bookings WHERE id=$1', [unattachedBooking.id])).rows[0].slot_id;
    const entered = signal(), release = signal();
    let held = false, blockerPid;
    const stop = observeApplicabilityQueries((q, next) => {
      if (!held && /UPDATE public\.care_journeys SET ended_at/.test(q.text)) {
        held = true;
        return Promise.resolve(next()).then(async r => {
          blockerPid = q.pid;
          entered.resolve();
          await release.promise;
          return r;
        });
      }
      return next();
    });
    const endEventId = randomUUID();
    const tx1 = (async () => {
      const c1 = await f.pool.connect();
      try {
        await c1.query('BEGIN');
        await c1.query(
          `INSERT INTO public.care_journey_events (
            id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
            actor_user_id, actor_role, policy_version, scope_version, purpose
          ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,$10)`,
          [endEventId, f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId, f.clinicOrg.id, f.users.patient.id, admission.policyVersion, journey.scopeVersion, admission.purpose],
        );
        const endedAt = (await c1.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [endEventId])).rows[0].recorded_at;
        await c1.query(
          `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='PATIENT_STOP' WHERE id=$1`,
          [journey.journeyId, endedAt, endEventId],
        );
        await c1.query('COMMIT');
      } finally {
        c1.release();
      }
    })();
    tx1.catch(() => {});
    let waiterBindingPid;
    const txBindingReady = signal();
    const txBinding = (async () => {
      await entered.promise;
      const c3 = await f.pool.connect();
      try {
        waiterBindingPid = (await c3.query('SELECT pg_backend_pid() pid')).rows[0].pid;
        txBindingReady.resolve();
        await c3.query('BEGIN');
        await c3.query("SET LOCAL lock_timeout='5s'");
        await assert.rejects(
          async () => {
            await c3.query(
              `INSERT INTO public.care_journey_bookings (
                journey_id, booking_id, slot_id, patient_id, patient_user_id,
                clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
                binding_kind, attached_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'VISIT',clock_timestamp()::timestamptz(3))`,
              [
                journey.journeyId, unattachedBooking.id, unattachedSlotId, f.users.patient.profileId, f.users.patient.id,
                f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id,
              ],
            );
            await c3.query('COMMIT');
          },
          err => err.code === '23514',
        );
      } finally {
        await c3.query('ROLLBACK').catch(() => {});
        c3.release();
      }
    })();
    try {
      await Promise.all([entered.promise, txBindingReady.promise]);
      await waitBlocked(f.pool, waiterBindingPid, 4000, blockerPid);
      release.resolve();
      await Promise.all([tx1, txBinding]);
      console.log('CJP_B1_TERMINATION_WAIT', JSON.stringify({ blockerPid, waiterBindingPid }));
    } finally {
      release.resolve();
      stop();
    }

    // Reject a new binding (VISIT or ANCHOR) after Journey termination!
    await expectSql23514(f.pool, async c => {
      const slotRow = (await c.query('SELECT slot_id FROM public.bookings WHERE id=$1', [unattachedBooking.id])).rows[0];
      await c.query(
        `INSERT INTO public.care_journey_bookings (
          journey_id, booking_id, slot_id, patient_id, patient_user_id,
          clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
          binding_kind, attached_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'VISIT',clock_timestamp()::timestamptz(3))`,
        [
          journey.journeyId, unattachedBooking.id, slotRow.slot_id, f.users.patient.profileId, f.users.patient.id,
          f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id,
        ],
      );
    });

    // Reject BOOKING_ATTACHED / CARE_COMPLETED event after Journey termination!
    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('CARE_COMPLETED','PARTICIPANT',$1,$2,$3,$4,$5,$6,$7,'CLINICIAN',$8,$9,$10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, journey.journeyId, admission.admissionId,
          f.clinicOrg.id, booking1.id, f.users.clinician.id, admission.policyVersion, journey.scopeVersion, admission.purpose,
        ],
      );
    });

    // Negative consent checks: revoked session fails cjp_event_insert.
    const revokedToken = randomBytes(32).toString('hex');
    const revokedActor = await f.auth.createSession({ userId: f.users.patient.id, verifiedHash: f.hash, tokenHash: revokedToken, previousHash: null });
    await f.auth.revoke(revokedToken);
    await expectSql23514(f.pool, async c => {
      await c.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
          notice_version, notice_digest, locale, affirmative
        ) VALUES ('CONSENT_ACTIVATED','PARTICIPANT',$1,$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,$10,$11,'notice.v1',$12,'en',true)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, randomUUID(), admission.admissionId,
          f.clinicOrg.id, unattachedBooking.id, f.users.patient.id, revokedActor.sessionId,
          admission.policyVersion, journey.scopeVersion, admission.purpose, NOTICE_DIGEST,
        ],
      );
    });

    // Negative DDL rollback check: failed DDL transaction inside migration leaves zero sidecar residue.
    const cRoll = await f.pool.connect();
    try {
      await cRoll.query('BEGIN');
      await cRoll.query('CREATE TABLE public.cjp_temp_ddl_probe (id uuid PRIMARY KEY)');
      await cRoll.query('ROLLBACK');
      const probeExists = (await cRoll.query("SELECT to_regclass('public.cjp_temp_ddl_probe') reg")).rows[0].reg;
      assert.equal(probeExists, null);
    } finally {
      cRoll.release();
    }

    // Second Journey on the same pair: end prior assignment and open a fresh assignment for j2.
    await f.identities.endAssignment(journey.assignmentId);
    const slotEarlier = await f.publish(180);
    const slotOriginal = await f.publish(210);
    const bOrig = await f.create(slotOriginal);
    const j2 = await enrollAndOpenJourney(f.pool, f, admission, bOrig, { skipPair: true });
    const bRep = await f.bookings.reschedule(f.actors.patient, { bookingId: bOrig.id, expectedVersion: bOrig.version, slotId: slotEarlier.id, operationKey: randomUUID() });
    assert.ok(slot2.id);

    const cRep = await f.pool.connect();
    try {
      await cRep.query('BEGIN');
      const nowRep = (await cRep.query('SELECT clock_timestamp()::timestamptz(3) now')).rows[0].now;
      await cRep.query(`UPDATE public.care_journey_bookings SET ended_at=$2 WHERE id=$1`, [j2.bindingId, nowRep]);
      const repBindingId = randomUUID();
      await cRep.query(
        `INSERT INTO public.care_journey_bookings (
          id, journey_id, booking_id, slot_id, patient_id, patient_user_id,
          clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
          binding_kind, attached_at, replaced_binding_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ANCHOR',$13,$14)`,
        [
          repBindingId, j2.journeyId, bRep.id, slotEarlier.id, f.users.patient.profileId, f.users.patient.id,
          f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id,
          nowRep, j2.bindingId,
        ],
      );
      await cRep.query(
        `INSERT INTO public.care_journey_events (
          kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ('ANCHOR_REPLACED','PARTICIPANT',$1,$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,$10)`,
        [
          f.users.patient.profileId, f.users.clinician.profileId, j2.journeyId, admission.admissionId,
          f.clinicOrg.id, bRep.id, f.users.patient.id, admission.policyVersion, j2.scopeVersion, admission.purpose,
        ],
      );
      await cRep.query('COMMIT');
    } finally {
      cRep.release();
    }

    // CLINICIAN_END cannot use a PATIENT event.
    await expectSql23514(f.pool, async c => {
      const badEnd = randomUUID();
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, scope_version, purpose
        ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,$10)`,
        [badEnd, f.users.patient.profileId, f.users.clinician.profileId, j2.journeyId, admission.admissionId, f.clinicOrg.id, f.users.patient.id, admission.policyVersion, j2.scopeVersion, admission.purpose],
      );
      const t = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [badEnd])).rows[0].recorded_at;
      await c.query(`UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='CLINICIAN_END' WHERE id=$1`, [j2.journeyId, t, badEnd]);
    });

    // Valid CLINICIAN_END commits cleanly and blocks concurrent Journey UPDATE until commit.
    const endEntered = signal(), endRelease = signal();
    let endHeld = false, endBlockerPid, updateWaiterPid;
    const stopEnd = observeApplicabilityQueries((q, next) => {
      if (!endHeld && /UPDATE public\.care_journeys SET ended_at/.test(q.text)) {
        endHeld = true;
        return Promise.resolve(next()).then(async r => {
          endBlockerPid = q.pid;
          endEntered.resolve();
          await endRelease.promise;
          return r;
        });
      }
      return next();
    });
    const txEnd1 = (async () => {
      const cEnd = await f.pool.connect();
      try {
        await cEnd.query('BEGIN');
        const goodEnd = randomUUID();
        await cEnd.query(
          `INSERT INTO public.care_journey_events (
            id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
            actor_user_id, actor_role, policy_version, scope_version, purpose
          ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'CLINICIAN',$8,$9,$10)`,
          [goodEnd, f.users.patient.profileId, f.users.clinician.profileId, j2.journeyId, admission.admissionId, f.clinicOrg.id, f.users.clinician.id, admission.policyVersion, j2.scopeVersion, admission.purpose],
        );
        const t = (await cEnd.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [goodEnd])).rows[0].recorded_at;
        await cEnd.query(`UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='CLINICIAN_END' WHERE id=$1`, [j2.journeyId, t, goodEnd]);
        await cEnd.query('COMMIT');
      } finally {
        cEnd.release();
      }
    })();
    txEnd1.catch(() => {});
    const updateReady = signal();
    const txEndUpdate = (async () => {
      await endEntered.promise;
      const cUpd = await f.pool.connect();
      try {
        updateWaiterPid = (await cUpd.query('SELECT pg_backend_pid() pid')).rows[0].pid;
        updateReady.resolve();
        await cUpd.query('BEGIN');
        await cUpd.query("SET LOCAL lock_timeout='5s'");
        await assert.rejects(
          async () => {
            await cUpd.query(`UPDATE public.care_journeys SET end_reason='PATIENT_STOP' WHERE id=$1`, [j2.journeyId]);
            await cUpd.query('COMMIT');
          },
          err => err.code === '23514',
        );
      } finally {
        await cUpd.query('ROLLBACK').catch(() => {});
        cUpd.release();
      }
    })();
    try {
      await Promise.all([endEntered.promise, updateReady.promise]);
      await waitBlocked(f.pool, updateWaiterPid, 4000, endBlockerPid);
      endRelease.resolve();
      await Promise.all([txEnd1, txEndUpdate]);
      console.log('CJP_B1_UPDATE_WAIT', JSON.stringify({ endBlockerPid, updateWaiterPid }));
    } finally {
      endRelease.resolve();
      stopEnd();
    }

    // End the admission and prove a new Journey cannot open on an ended admission.
    const cAdm = await f.pool.connect();
    try {
      await cAdm.query('BEGIN');
      const admEndId = randomUUID();
      await cAdm.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, clinician_id, admission_id, organization_id,
          actor_user_id, actor_role, policy_version, purpose
        ) VALUES ($1,'PARTICIPATION_ENDED','PARTICIPANT',$2,$3,$4,$5,'CLINICIAN',$6,$7)`,
        [admEndId, f.users.clinician.profileId, admission.admissionId, f.clinicOrg.id, f.users.clinician.id, admission.policyVersion, admission.purpose],
      );
      const t = (await cAdm.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [admEndId])).rows[0].recorded_at;
      await cAdm.query(`UPDATE public.care_journey_clinic_admissions SET ended_at=$2, end_event_id=$3 WHERE id=$1`, [admission.admissionId, t, admEndId]);
      await cAdm.query('COMMIT');
    } finally {
      cAdm.release();
    }

    const slotPostEnd = await f.publish(240);
    const bPostEnd = await f.create(slotPostEnd);
    await expectSql23514(f.pool, async c => {
      const ce3 = randomUUID(), j3 = randomUUID();
      await c.query(
        `INSERT INTO public.care_journey_events (
          id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
          actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
          notice_version, notice_digest, locale, affirmative
        ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,$11,$12,'notice.v1',$13,'en',true)`,
        [ce3, f.users.patient.profileId, f.users.clinician.profileId, j3, admission.admissionId, f.clinicOrg.id, bPostEnd.id, f.users.patient.id, f.actors.patient.sessionId, admission.policyVersion, j2.scopeVersion, admission.purpose, NOTICE_DIGEST],
      );
      const s3 = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ce3])).rows[0].recorded_at;
      const osv = (await c.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
      const b3r = (await c.query('SELECT end_at FROM public.bookings WHERE id=$1', [bPostEnd.id])).rows[0];
      await c.query(
        `INSERT INTO public.care_journeys (
          id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
          provider_id, membership_id, affiliation_id, admission_id, assignment_id,
          scope_version, policy_version, purpose, consent_event_id,
          clinic_status_version, verification_epoch, participation_epoch,
          started_at, original_pre_care_ceiling_at, hard_expires_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,1,$17,$18,$19)`,
        [j3, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, admission.admissionId, j2.assignmentId, j2.scopeVersion, admission.policyVersion, admission.purpose, ce3, osv, s3, b3r.end_at, new Date(s3.getTime() + 365 * 86400 * 1000)],
      );
    });
  }));
