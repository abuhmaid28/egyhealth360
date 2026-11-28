import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { isolatedBookings } from '../support/bookings.mjs';
import { observeApplicabilityQueries, signal, waitBlocked } from '../support/observed-applicability.mjs';
import {
  CARE_JOURNEY_RESOURCE_CLASSES,
  createCareJourneyGuardPersistence,
} from '../../packages/db/dist/care-journey-guard.js';

const NOTICE_DIGEST = 'a'.repeat(64);
const FINGERPRINT = 'b'.repeat(64);

function authActor(a) {
  return { userId: a.userId, sessionId: a.sessionId, role: a.role };
}

async function seedJourney(f, booking, options = {}) {
  const c = await f.pool.connect();
  try {
    await c.query('BEGIN');
    const admissionId = randomUUID();
    const verificationEventId = randomUUID();
    const participationEventId = randomUUID();
    const enrollmentEventId = randomUUID();
    const consentEventId = randomUUID();
    const journeyId = randomUUID();
    const bindingId = randomUUID();
    const policyVersion = 'cjp-policy.v1';
    const scopeVersion = options.scopeVersion ?? 'cjp-scope.v1';
    const purpose = 'CARE_JOURNEY';

    const verifiedAt = new Date((await c.query('SELECT clock_timestamp()::timestamptz(3) now')).rows[0].now);
    const validUntil = options.admissionValidUntil ?? new Date(verifiedAt.getTime() + 180 * 86400 * 1000);

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, clinician_id, admission_id, organization_id,
        actor_user_id, actor_role, policy_version, purpose, credential_reference
      ) VALUES ($1,'CLINIC_VERIFIED','PARTICIPANT',$2,$3,$4,$5,'ADMIN',$6,$7,$8)`,
      [
        verificationEventId, f.users.clinician.profileId, admissionId, f.clinicOrg.id,
        f.users.admin.id, policyVersion, purpose, randomUUID(),
      ],
    );
    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, clinician_id, admission_id, organization_id,
        actor_user_id, actor_role, policy_version, purpose
      ) VALUES ($1,'STANDING_OPT_IN','PARTICIPANT',$2,$3,$4,$5,'CLINICIAN',$6,$7)`,
      [
        participationEventId, f.users.clinician.profileId, admissionId, f.clinicOrg.id,
        f.users.clinician.id, policyVersion, purpose,
      ],
    );
    const vAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [verificationEventId])).rows[0].recorded_at;
    const pAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [participationEventId])).rows[0].recorded_at;

    await c.query(
      `INSERT INTO public.care_journey_clinic_admissions (
        id, clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
        policy_version, purpose, credential_source, credential_issuer, credential_reference,
        verification_epoch, verified_at, valid_until, verification_event_id,
        participation_epoch, participated_at, participation_event_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SYNTHETIC_REGISTRY','Synthetic Issuer',$10,1,$11,$12,$13,1,$14,$15)`,
      [
        admissionId, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id,
        f.provider.id, f.membership.id, f.publication.id,
        policyVersion, purpose,
        (await c.query('SELECT credential_reference FROM public.care_journey_events WHERE id=$1', [verificationEventId])).rows[0].credential_reference,
        vAt, validUntil, verificationEventId,
        pAt, participationEventId,
      ],
    );

    await c.query(
      `INSERT INTO public.care_journey_events (
        id, kind, source, patient_id, clinician_id, actor_user_id, actor_role, policy_version
      ) VALUES ($1,'ENROLLED','PARTICIPANT',$2,$3,$4,'PATIENT',$5)`,
      [enrollmentEventId, f.users.patient.profileId, f.users.clinician.profileId, f.users.patient.id, policyVersion],
    );
    const enrolledAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [enrollmentEventId])).rows[0].recorded_at;
    await c.query(
      `INSERT INTO public.care_journey_pairs (
        patient_id, clinician_id, enrolled_at, policy_version, enrollment_event_id
      ) VALUES ($1,$2,$3,$4,$5)`,
      [f.users.patient.profileId, f.users.clinician.profileId, enrolledAt, policyVersion, enrollmentEventId],
    );

    const assignment = (await c.query(
      `INSERT INTO public.clinician_patient_assignments (clinician_id, patient_id, status)
       VALUES ($1,$2,'ACTIVE')
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
        admissionId, f.clinicOrg.id, booking.id, f.users.patient.id, f.actors.patient.sessionId,
        policyVersion, scopeVersion, purpose, NOTICE_DIGEST, randomUUID(), FINGERPRINT,
      ],
    );
    const startedAt = (await c.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [consentEventId])).rows[0].recorded_at;
    const osv = (await c.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
    const bRow = (await c.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [booking.id])).rows[0];
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
        f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, admissionId, assignment.id,
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
        bindingId, journeyId, booking.id, bRow.slot_id, f.users.patient.profileId, f.users.patient.id,
        f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id,
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

test('Stage B2 PG guard classifies ELIGIBLE, OUTSIDE_COHORT, #189 DENY pitfalls, rollback recovery, and bidirectional lock waits', () =>
  isolatedBookings(async f => {
    const guard = createCareJourneyGuardPersistence(f.url);
    try {
      const slot1 = await f.publish(30);
      const booking1 = await f.create(slot1);
      const seeded = await seedJourney(f, booking1);

      const otherClinician = await f.otherClinician();
      const outsidePatient = await f.add('PATIENT', 'Outside Cohort Patient');

      let canaryCalls = 0;
      const canaryLoader = ctx => {
        canaryCalls++;
        return { canary: true, resourceClass: ctx.resourceClass, journeyId: ctx.journeyId };
      };

      // 1. Positive ELIGIBLE across all 5 allowlisted resource classes (with and without explicit journeyId).
      for (const rc of CARE_JOURNEY_RESOURCE_CLASSES) {
        const res = await guard.evaluateReadAccess({
          actor: authActor(f.actors.clinician),
          patientId: f.users.patient.profileId,
          clinicianId: f.users.clinician.profileId,
          organizationId: f.clinicOrg.id,
          journeyId: seeded.journeyId,
          resourceClass: rc,
        });
        assert.equal(res.decision, 'ELIGIBLE');
        assert.equal(res.reason, 'ELIGIBLE');
        assert.equal(res.journeyId, seeded.journeyId);
        assert.equal(res.projection?.resourceClass, rc);
        assert.equal(res.projection?.synthetic, true);
      }

      const customRes = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        resourceClass: 'BP',
        loadProjection: canaryLoader,
      });
      assert.equal(customRes.decision, 'ELIGIBLE');
      assert.equal(canaryCalls, 1);
      assert.equal(customRes.projection?.canary, true);

      // 2. Non-CLINICIAN roles fail before any Care Journey SQL and never invoke loader.
      let sawCareJourneySql = false;
      const stopSqlObs = observeApplicabilityQueries((q, next) => {
        if (/care_journey/.test(q.text)) sawCareJourneySql = true;
        return next();
      });
      try {
        for (const nonClinActor of [f.actors.admin, f.actors.lab, f.actors.pharmacy, f.actors.patient]) {
          const r = await guard.evaluateReadAccess({
            actor: authActor(nonClinActor),
            patientId: f.users.patient.profileId,
            clinicianId: f.users.clinician.profileId,
            organizationId: f.clinicOrg.id,
            journeyId: seeded.journeyId,
            resourceClass: 'PROFILE',
            loadProjection: canaryLoader,
          });
          assert.equal(r.decision, 'DENY');
          assert.equal(r.reason, 'ROLE_NOT_CLINICIAN');
          assert.equal(r.projection, null);
        }
      } finally {
        stopSqlObs();
      }
      assert.equal(sawCareJourneySql, false);
      assert.equal(canaryCalls, 1);

      // 3. True OUTSIDE_COHORT vs #189 DENY pitfalls.
      const outsideRes = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: outsidePatient.user.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        resourceClass: 'PROFILE',
        loadProjection: canaryLoader,
      });
      assert.equal(outsideRes.decision, 'OUTSIDE_COHORT');
      assert.equal(outsideRes.reason, 'NOT_IN_CARE_JOURNEY_COHORT');
      assert.equal(outsideRes.projection, null);

      // #189 pitfall: other active clinician targeting real journeyId must get DENY, NEVER OUTSIDE_COHORT.
      const wrongClinicianRes = await guard.evaluateReadAccess({
        actor: authActor(otherClinician.actor),
        patientId: f.users.patient.profileId,
        clinicianId: otherClinician.user.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: seeded.journeyId,
        resourceClass: 'SUMMARY',
        loadProjection: canaryLoader,
      });
      assert.equal(wrongClinicianRes.decision, 'DENY');
      assert.equal(wrongClinicianRes.reason, 'JOURNEY_SCOPE_MISMATCH');
      assert.equal(wrongClinicianRes.projection, null);

      // #189 pitfall: enrolled pair queried with non-matching journeyId or wrong org returns DENY, never OUTSIDE_COHORT.
      const missingIdInCohort = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: randomUUID(),
        resourceClass: 'FOLLOW_UP',
        loadProjection: canaryLoader,
      });
      assert.equal(missingIdInCohort.decision, 'DENY');
      assert.equal(missingIdInCohort.reason, 'JOURNEY_NOT_FOUND_IN_COHORT');
      assert.equal(canaryCalls, 1);

      // 4. Rollback + fresh readback proof: rolled-back termination leaves Journey ELIGIBLE.
      const cRoll = await f.pool.connect();
      try {
        await cRoll.query('BEGIN');
        const ev = randomUUID();
        await cRoll.query(
          `INSERT INTO public.care_journey_events (
            id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
            actor_user_id, actor_role, policy_version, scope_version, purpose
          ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,'CARE_JOURNEY')`,
          [ev, f.users.patient.profileId, f.users.clinician.profileId, seeded.journeyId, seeded.admissionId, f.clinicOrg.id, f.users.patient.id, seeded.policyVersion, seeded.scopeVersion],
        );
        const t = (await cRoll.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ev])).rows[0].recorded_at;
        await cRoll.query(
          `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='PATIENT_STOP' WHERE id=$1`,
          [seeded.journeyId, t, ev],
        );
        await cRoll.query('ROLLBACK');
      } finally {
        cRoll.release();
      }
      const afterRollbackRes = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: seeded.journeyId,
        resourceClass: 'PRESCRIPTION',
      });
      assert.equal(afterRollbackRes.decision, 'ELIGIBLE');

      const slot2 = await f.publish(90);
      const booking2 = await f.create(slot2);

      // 5. Real PG bidirectional wait pairs:
      // Order A: Guard locks care_journeys FOR SHARE first -> Writer blocks -> Guard returns ELIGIBLE -> Writer commits termination -> Fresh readback returns DENY.
      const gEntered = signal(), gRelease = signal();
      let gHeld = false, gBlockerPid;
      const stopGuardFirst = observeApplicabilityQueries((q, next) => {
        if (!gHeld && /FROM public\.care_journeys/.test(q.text) && /FOR SHARE/.test(q.text)) {
          gHeld = true;
          return Promise.resolve(next()).then(async r => {
            gBlockerPid = q.pid;
            gEntered.resolve();
            await gRelease.promise;
            return r;
          });
        }
        return next();
      });
      let writerPid;
      const writerReady = signal();
      const guardFirstPromise = guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: seeded.journeyId,
        resourceClass: 'SUMMARY',
        loadProjection: canaryLoader,
      });
      guardFirstPromise.catch(() => {});
      const writerSecondPromise = (async () => {
        await gEntered.promise;
        const cW = await f.pool.connect();
        try {
          writerPid = (await cW.query('SELECT pg_backend_pid() pid')).rows[0].pid;
          writerReady.resolve();
          await cW.query('BEGIN');
          await cW.query("SET LOCAL lock_timeout='5s'");
          const ev = randomUUID();
          await cW.query(
            `INSERT INTO public.care_journey_events (
              id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
              actor_user_id, actor_role, policy_version, scope_version, purpose
            ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'PATIENT',$8,$9,'CARE_JOURNEY')`,
            [ev, f.users.patient.profileId, f.users.clinician.profileId, seeded.journeyId, seeded.admissionId, f.clinicOrg.id, f.users.patient.id, seeded.policyVersion, seeded.scopeVersion],
          );
          const t = (await cW.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ev])).rows[0].recorded_at;
          await cW.query(
            `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='PATIENT_STOP' WHERE id=$1`,
            [seeded.journeyId, t, ev],
          );
          await cW.query('COMMIT');
        } finally {
          await cW.query('ROLLBACK').catch(() => {});
          cW.release();
        }
      })();
      try {
        await Promise.all([gEntered.promise, writerReady.promise]);
        await waitBlocked(f.pool, writerPid, 4000, gBlockerPid);
        gRelease.resolve();
        const [guardOutcome] = await Promise.all([guardFirstPromise, writerSecondPromise]);
        assert.equal(guardOutcome.decision, 'ELIGIBLE');
        assert.equal(canaryCalls, 2);
        console.log('CJP_B2_GUARD_FIRST_WAIT', JSON.stringify({ blockerPid: gBlockerPid, writerPid }));
      } finally {
        gRelease.resolve();
        stopGuardFirst();
      }

      const freshAfterTermination = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: seeded.journeyId,
        resourceClass: 'SUMMARY',
        loadProjection: canaryLoader,
      });
      assert.equal(freshAfterTermination.decision, 'DENY');
      assert.equal(freshAfterTermination.reason, 'JOURNEY_ENDED');
      assert.equal(canaryCalls, 2);

      // Open a second Journey cleanly (after ending prior assignment) to test Writer-first wait & revocations.
      await f.identities.endAssignment(seeded.assignmentId);
      const cCleanPair = await f.pool.connect();
      try {
        // Seed second Journey on j2 (already enrolled pair, new assignment + admission + journey).
        await cCleanPair.query('BEGIN');
        const j2Id = randomUUID(), ce2 = randomUUID(), bind2 = randomUUID();
        const a2 = (await cCleanPair.query(
          `INSERT INTO public.clinician_patient_assignments (clinician_id, patient_id, status) VALUES ($1,$2,'ACTIVE') RETURNING id`,
          [f.users.clinician.profileId, f.users.patient.profileId],
        )).rows[0];
        await cCleanPair.query(
          `INSERT INTO public.care_journey_events (
            id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
            actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
            notice_version, notice_digest, locale, affirmative, operation_key, fingerprint
          ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,'cjp-scope.v2','CARE_JOURNEY','notice.v1',$11,'en',true,$12,$13)`,
          [ce2, f.users.patient.profileId, f.users.clinician.profileId, j2Id, seeded.admissionId, f.clinicOrg.id, booking2.id, f.users.patient.id, f.actors.patient.sessionId, seeded.policyVersion, NOTICE_DIGEST, randomUUID(), FINGERPRINT],
        );
        const s2 = (await cCleanPair.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ce2])).rows[0].recorded_at;
        const osv2 = (await cCleanPair.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
        const b2r = (await cCleanPair.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [booking2.id])).rows[0];
        await cCleanPair.query(
          `INSERT INTO public.care_journeys (
            id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
            provider_id, membership_id, affiliation_id, admission_id, assignment_id,
            scope_version, policy_version, purpose, consent_event_id,
            clinic_status_version, verification_epoch, participation_epoch,
            started_at, original_pre_care_ceiling_at, hard_expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'cjp-scope.v2',$12,'CARE_JOURNEY',$13,$14,1,1,$15,$16,$17)`,
          [j2Id, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, seeded.admissionId, a2.id, seeded.policyVersion, ce2, osv2, s2, b2r.end_at, new Date(s2.getTime() + 365 * 86400 * 1000)],
        );
        await cCleanPair.query(
          `INSERT INTO public.care_journey_bookings (
            id, journey_id, booking_id, slot_id, patient_id, patient_user_id,
            clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
            binding_kind, attached_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ANCHOR',$13)`,
          [bind2, j2Id, booking2.id, b2r.slot_id, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, s2],
        );
        await cCleanPair.query('COMMIT');

        // Order B: Writer holds termination lock first -> Guard waits -> Writer commits -> Guard wakes up -> DENY (canary unchanged).
        const wEntered = signal(), wRelease = signal();
        let wHeld = false, wBlockerPid, guardWaiterPid;
        const stopWriterFirst = observeApplicabilityQueries((q, next) => {
          if (!wHeld && /UPDATE public\.care_journeys SET ended_at/.test(q.text)) {
            wHeld = true;
            return Promise.resolve(next()).then(async r => {
              wBlockerPid = q.pid;
              wEntered.resolve();
              await wRelease.promise;
              return r;
            });
          }
          if (wHeld && /FROM public\.care_journeys/.test(q.text) && /FOR SHARE/.test(q.text)) {
            guardWaiterPid = q.pid;
            guardReady.resolve();
          }
          return next();
        });
        const guardReady = signal();
        const writerFirstPromise = (async () => {
          const cW2 = await f.pool.connect();
          try {
            await cW2.query('BEGIN');
            const ev2 = randomUUID();
            await cW2.query(
              `INSERT INTO public.care_journey_events (
                id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id,
                actor_user_id, actor_role, policy_version, scope_version, purpose
              ) VALUES ($1,'ENDED','PARTICIPANT',$2,$3,$4,$5,$6,$7,'CLINICIAN',$8,'cjp-scope.v2','CARE_JOURNEY')`,
              [ev2, f.users.patient.profileId, f.users.clinician.profileId, j2Id, seeded.admissionId, f.clinicOrg.id, f.users.clinician.id, seeded.policyVersion],
            );
            const t2 = (await cW2.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ev2])).rows[0].recorded_at;
            await cW2.query(
              `UPDATE public.care_journeys SET ended_at=$2, effective_cutoff_at=$2, end_event_id=$3, end_reason='CLINICIAN_END' WHERE id=$1`,
              [j2Id, t2, ev2],
            );
            await cW2.query('COMMIT');
          } finally {
            await cW2.query('ROLLBACK').catch(() => {});
            cW2.release();
          }
        })();
        const guardSecondPromise = (async () => {
          await wEntered.promise;
          return guard.evaluateReadAccess({
            actor: authActor(f.actors.clinician),
            patientId: f.users.patient.profileId,
            clinicianId: f.users.clinician.profileId,
            organizationId: f.clinicOrg.id,
            journeyId: j2Id,
            resourceClass: 'PROFILE',
            loadProjection: canaryLoader,
          });
        })();
        try {
          await Promise.all([wEntered.promise, guardReady.promise]);
          await waitBlocked(f.pool, guardWaiterPid, 4000, wBlockerPid);
          wRelease.resolve();
          const [, guardOutcome] = await Promise.all([writerFirstPromise, guardSecondPromise]);
          assert.equal(guardOutcome.decision, 'DENY');
          assert.equal(guardOutcome.reason, 'JOURNEY_ENDED');
          assert.equal(guardOutcome.projection, null);
          assert.equal(canaryCalls, 2);
          console.log('CJP_B2_WRITER_FIRST_WAIT', JSON.stringify({ wBlockerPid, guardWaiterPid }));
        } finally {
          wRelease.resolve();
          stopWriterFirst();
        }
      } finally {
        cCleanPair.release();
      }

      // 6. Real PG session expiry / DB clock_timestamp() cutoff and legacy grant revocation proofs.
      const slot3 = await f.publish(150);
      const booking3 = await f.create(slot3);
      const shortSessionToken = randomBytes(32).toString('hex');
      const shortClinActor = await f.auth.createSession({
        userId: f.users.clinician.id,
        verifiedHash: f.hash,
        tokenHash: shortSessionToken,
        previousHash: null,
      });
      const activeAssignRow = (await f.pool.query(
        `SELECT id FROM public.clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'`,
        [f.users.clinician.profileId, f.users.patient.profileId],
      )).rows[0];
      if (activeAssignRow) {
        await f.identities.endAssignment(activeAssignRow.id);
      }
      // Open j3 on active assignment & clinician.
      const cJ3 = await f.pool.connect();
      let j3Id;
      try {
        await cJ3.query('BEGIN');
        j3Id = randomUUID();
        const ce3 = randomUUID(), b3Id = randomUUID();
        const a3 = (await cJ3.query(
          `INSERT INTO public.clinician_patient_assignments (clinician_id, patient_id, status)
           VALUES ($1,$2,'ACTIVE')
           ON CONFLICT (clinician_id, patient_id) WHERE status = 'ACTIVE'
           DO UPDATE SET assigned_at = public.clinician_patient_assignments.assigned_at
           RETURNING id`,
          [f.users.clinician.profileId, f.users.patient.profileId],
        )).rows[0];
        await cJ3.query(
          `INSERT INTO public.care_journey_events (
            id, kind, source, patient_id, clinician_id, journey_id, admission_id, organization_id, booking_id,
            actor_user_id, actor_role, session_evidence_id, policy_version, scope_version, purpose,
            notice_version, notice_digest, locale, affirmative, operation_key, fingerprint
          ) VALUES ($1,'CONSENT_ACTIVATED','PARTICIPANT',$2,$3,$4,$5,$6,$7,$8,'PATIENT',$9,$10,'cjp-scope.v3','CARE_JOURNEY','notice.v1',$11,'en',true,$12,$13)`,
          [ce3, f.users.patient.profileId, f.users.clinician.profileId, j3Id, seeded.admissionId, f.clinicOrg.id, booking3.id, f.users.patient.id, f.actors.patient.sessionId, seeded.policyVersion, NOTICE_DIGEST, randomUUID(), FINGERPRINT],
        );
        const s3 = (await cJ3.query('SELECT recorded_at FROM public.care_journey_events WHERE id=$1', [ce3])).rows[0].recorded_at;
        const osv3 = (await cJ3.query('SELECT status_version FROM public.organizations WHERE id=$1', [f.clinicOrg.id])).rows[0].status_version;
        const b3r = (await cJ3.query('SELECT slot_id, end_at FROM public.bookings WHERE id=$1', [booking3.id])).rows[0];
        await cJ3.query(
          `INSERT INTO public.care_journeys (
            id, patient_id, patient_user_id, clinician_id, clinician_user_id, organization_id,
            provider_id, membership_id, affiliation_id, admission_id, assignment_id,
            scope_version, policy_version, purpose, consent_event_id,
            clinic_status_version, verification_epoch, participation_epoch,
            started_at, original_pre_care_ceiling_at, hard_expires_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'cjp-scope.v3',$12,'CARE_JOURNEY',$13,$14,1,1,$15,$16,$17)`,
          [j3Id, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, seeded.admissionId, a3.id, seeded.policyVersion, ce3, osv3, s3, b3r.end_at, new Date(s3.getTime() + 365 * 86400 * 1000)],
        );
        await cJ3.query(
          `INSERT INTO public.care_journey_bookings (
            id, journey_id, booking_id, slot_id, patient_id, patient_user_id,
            clinician_id, clinician_user_id, organization_id, provider_id, membership_id, affiliation_id,
            binding_kind, attached_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ANCHOR',$13)`,
          [b3Id, j3Id, booking3.id, b3r.slot_id, f.users.patient.profileId, f.users.patient.id, f.users.clinician.profileId, f.users.clinician.id, f.clinicOrg.id, f.provider.id, f.membership.id, f.publication.id, s3],
        );
        await cJ3.query('COMMIT');
      } finally {
        cJ3.release();
      }

      // Real DB clock_timestamp() cutoff expiry test.
      await f.pool.query(`UPDATE public.sessions SET expires_at = clock_timestamp() + interval '100 milliseconds' WHERE id = $1`, [shortClinActor.sessionId]);
      await setTimeout(160);
      const expiredSessionRes = await guard.evaluateReadAccess({
        actor: { userId: f.users.clinician.id, sessionId: shortClinActor.sessionId, role: 'CLINICIAN' },
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: j3Id,
        resourceClass: 'BP',
        loadProjection: canaryLoader,
      });
      assert.equal(expiredSessionRes.decision, 'DENY');
      assert.equal(expiredSessionRes.reason, 'SESSION_INVALID_OR_EXPIRED');

      // Cancelling anchor booking immediately denies access.
      await f.bookings.cancel(f.actors.patient, { bookingId: booking3.id, expectedVersion: booking3.version, operationKey: randomUUID() });
      const cancelledAnchorRes = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: j3Id,
        resourceClass: 'BP',
        loadProjection: canaryLoader,
      });
      assert.equal(cancelledAnchorRes.decision, 'DENY');
      assert.equal(cancelledAnchorRes.reason, 'ANCHOR_BOOKING_INVALID_STATE');

      // Withdrawing affiliation denies access.
      await f.directory.withdrawAffiliation(f.actors.admin, {
        providerId: f.provider.id,
        publicationId: f.publication.id,
      });
      const withdrawnRes = await guard.evaluateReadAccess({
        actor: authActor(f.actors.clinician),
        patientId: f.users.patient.profileId,
        clinicianId: f.users.clinician.profileId,
        organizationId: f.clinicOrg.id,
        journeyId: j3Id,
        resourceClass: 'PROFILE',
        loadProjection: canaryLoader,
      });
      assert.equal(withdrawnRes.decision, 'DENY');
      assert.equal(withdrawnRes.reason, 'AFFILIATION_WITHDRAWN_OR_MISSING');
      assert.equal(canaryCalls, 2);
    } finally {
      await guard.close();
    }
  }));
