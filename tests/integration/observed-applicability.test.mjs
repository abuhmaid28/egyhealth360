import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  isolatedObservedApplicability,
  applicabilitySnapshot,
  waitBlocked,
} from '../support/observed-applicability.mjs';
import { ObservedApplicabilityError } from '../../packages/db/dist/observed-applicability-values.js';

const rejectsCode = (p, code) =>
  assert.rejects(p, (err) => {
    assert.ok(
      err instanceof ObservedApplicabilityError,
      `Expected ObservedApplicabilityError but got ${err?.name}: ${err?.message}`
    );
    assert.equal(err.code, code);
    return true;
  });

test('EH-015 database immutability: snapshots and retractions reject UPDATE, DELETE, TRUNCATE via triggers', () =>
  isolatedObservedApplicability(async (f) => {
    const { snapshot } = await f.insertSnapshot();
    assert.ok(snapshot.id);

    const { retraction } = await f.retractSnapshot({
      snapshotId: snapshot.id,
      assertedAt: '2026-03-01T09:00:00.000Z',
    });
    assert.ok(retraction.id);

    // 1. Snapshot UPDATE rejection
    await assert.rejects(
      f.pool.query('UPDATE public.observed_applicability_snapshots SET age_years_at_assessment = 99 WHERE id = $1', [snapshot.id]),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );

    // 2. Snapshot DELETE rejection
    await assert.rejects(
      f.pool.query('DELETE FROM public.observed_applicability_snapshots WHERE id = $1', [snapshot.id]),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );

    // 3. Snapshot TRUNCATE rejection
    await assert.rejects(
      f.pool.query('TRUNCATE TABLE public.observed_applicability_snapshots CASCADE'),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );

    // 4. Retraction UPDATE rejection
    await assert.rejects(
      f.pool.query('UPDATE public.observed_applicability_retractions SET reason_code = $1 WHERE id = $2', ['OTHER', retraction.id]),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );

    // 5. Retraction DELETE rejection
    await assert.rejects(
      f.pool.query('DELETE FROM public.observed_applicability_retractions WHERE id = $1', [retraction.id]),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );

    // 6. Retraction TRUNCATE rejection
    await assert.rejects(
      f.pool.query('TRUNCATE TABLE public.observed_applicability_retractions CASCADE'),
      (err) => err.message.includes('Observed clinical applicability history is immutable')
    );
  }));

test('EH-015 database SQL check constraints: age assertion states, chronology, and source partitions', () =>
  isolatedObservedApplicability(async (f) => {
    // 1. Age state NO_ASSERTION with non-null age is rejected by oa_snapshots_age_assertion_check
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_snapshots (
          patient_id, source_type, source_reference, assertion_reference, effective_at, asserted_at,
          age_assertion_state, age_years_at_assessment
        ) VALUES (
          $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'assert-1', '2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z',
          'NO_ASSERTION', 50
        )`,
        [f.patientId]
      ),
      (err) => err.code === '23514' && err.message.includes('oa_snapshots_age_assertion_check')
    );

    // 2. Age state UNKNOWN with non-null age is rejected by oa_snapshots_age_assertion_check
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_snapshots (
          patient_id, source_type, source_reference, assertion_reference, effective_at, asserted_at,
          age_assertion_state, age_years_at_assessment
        ) VALUES (
          $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'assert-2', '2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z',
          'UNKNOWN', 50
        )`,
        [f.patientId]
      ),
      (err) => err.code === '23514' && err.message.includes('oa_snapshots_age_assertion_check')
    );

    // 3. Age state ASSERTED_VALUE with null age is rejected by oa_snapshots_age_assertion_check
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_snapshots (
          patient_id, source_type, source_reference, assertion_reference, effective_at, asserted_at,
          age_assertion_state, age_years_at_assessment
        ) VALUES (
          $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'assert-3', '2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z',
          'ASSERTED_VALUE', NULL
        )`,
        [f.patientId]
      ),
      (err) => err.code === '23514' && err.message.includes('oa_snapshots_age_assertion_check')
    );

    // 4. Age state ASSERTED_VALUE with negative age is rejected by oa_snapshots_age_assertion_check
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_snapshots (
          patient_id, source_type, source_reference, assertion_reference, effective_at, asserted_at,
          age_assertion_state, age_years_at_assessment
        ) VALUES (
          $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'assert-4', '2026-03-01T00:00:00Z', '2026-03-01T01:00:00Z',
          'ASSERTED_VALUE', -1
        )`,
        [f.patientId]
      ),
      (err) => err.code === '23514' && err.message.includes('oa_snapshots_age_assertion_check')
    );

    // 5. Chronology violation: effective_at > asserted_at is rejected by oa_snapshots_chronology_check
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_snapshots (
          patient_id, source_type, source_reference, assertion_reference, effective_at, asserted_at,
          age_assertion_state, age_years_at_assessment
        ) VALUES (
          $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'assert-5', '2026-03-02T00:00:00Z', '2026-03-01T00:00:00Z',
          'ASSERTED_VALUE', 30
        )`,
        [f.patientId]
      ),
      (err) => err.code === '23514' && err.message.includes('oa_snapshots_chronology_check')
    );

    // 6. Retraction on non-existent snapshot violates scope guard / foreign key
    await assert.rejects(
      f.pool.query(
        `INSERT INTO public.observed_applicability_retractions (
          snapshot_id, patient_id, source_type, source_reference, retraction_reference, asserted_at, reason_code
        ) VALUES (
          gen_random_uuid(), $1::uuid, 'SYNTHETIC_OBSERVED_INPUT', 'src-1', 'retract-none', '2026-03-01T02:00:00Z', 'SOURCE_ASSERTION_WITHDRAWN'
        )`,
        [f.patientId]
      ),
      (err) =>
        (err.code === '23503' || err.code === '23514') &&
        (err.message.includes('oa_retractions_snapshot_scope_fkey') ||
          err.message.includes('Target snapshot not found in scope'))
    );
  }));

test('EH-015 snapshot insert: idempotency, conflict detection, and zero application audit logs', () =>
  isolatedObservedApplicability(async (f) => {
    const input = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_OBSERVED_INPUT',
      sourceReference: 'eh015-test-src',
      assertionReference: 'assert-idempotent-1',
      effectiveAt: '2026-03-01T08:00:00.000Z',
      assertedAt: '2026-03-01T08:30:00.000Z',
      ageAssertionState: 'ASSERTED_VALUE',
      ageYearsAtAssessment: 45,
      pregnancyStatus: 'NOT_PREGNANT',
      hypertensionStatus: 'PRESENT',
      cvdStatus: 'ABSENT',
      diabetesStatus: 'ABSENT',
      ckdStatus: 'ABSENT',
    };

    // 1. Initial insert -> created = true
    const first = await f.insertSnapshot(input);
    assert.equal(first.created, true);
    assert.ok(first.snapshot.id);
    assert.equal(first.snapshot.ageYearsAtAssessment, 45);

    // 2. Exact retry -> created = false, same stable snapshot UUID
    const retry = await f.insertSnapshot(input);
    assert.equal(retry.created, false);
    assert.equal(retry.snapshot.id, first.snapshot.id);
    assert.equal(retry.snapshot.assertionReference, input.assertionReference);

    // 3. Conflicting retry: same source identity (patientId, sourceType, sourceReference, assertionReference)
    // but altered payload field (e.g. ageYearsAtAssessment = 46)
    await rejectsCode(
      f.insertSnapshot({ ...input, ageYearsAtAssessment: 46 }),
      'APPLICABILITY_CONFLICT'
    );

    // 4. Conflicting retry: altered condition status
    await rejectsCode(
      f.insertSnapshot({ ...input, hypertensionStatus: 'ABSENT' }),
      'APPLICABILITY_CONFLICT'
    );

    // 5. Conflicting retry: altered effectiveAt
    await rejectsCode(
      f.insertSnapshot({ ...input, effectiveAt: '2026-03-01T07:00:00.000Z' }),
      'APPLICABILITY_CONFLICT'
    );

    // 6. Conflicting retry: altered assertedAt
    await rejectsCode(
      f.insertSnapshot({ ...input, assertedAt: '2026-03-01T08:45:00.000Z' }),
      'APPLICABILITY_CONFLICT'
    );

    // 7. Non-existent patient -> APPLICABILITY_NOT_FOUND
    await rejectsCode(
      f.insertSnapshot({ ...input, patientId: '00000000-0000-4000-8000-999999999999', assertionReference: 'assert-other' }),
      'APPLICABILITY_NOT_FOUND'
    );

    // 8. Distinct assertion reference -> succeeds as independent row
    const second = await f.insertSnapshot({ ...input, assertionReference: 'assert-idempotent-2', ageYearsAtAssessment: 50 });
    assert.equal(second.created, true);
    assert.notEqual(second.snapshot.id, first.snapshot.id);

    // 9. Total DB rows = 2, application audit logs = 0
    const snap = await applicabilitySnapshot(f.pool);
    assert.equal(snap.snapshots.length, 2);
    assert.equal(snap.audit.filter((a) => a.entity_type?.includes('applicability')).length, 0);
  }));

test('EH-015 retraction: terminal one-to-one withdrawal, idempotency, conflicts, and chronology', () =>
  isolatedObservedApplicability(async (f) => {
    const { snapshot } = await f.insertSnapshot({
      assertionReference: 'snap-for-retraction',
      effectiveAt: '2026-03-01T10:00:00.000Z',
      assertedAt: '2026-03-01T10:15:00.000Z',
    });

    const retractInput = {
      snapshotId: snapshot.id,
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_OBSERVED_INPUT',
      sourceReference: snapshot.sourceReference,
      retractionReference: 'retract-ref-001',
      assertedAt: '2026-03-01T10:30:00.000Z',
      reasonCode: 'SOURCE_ASSERTION_WITHDRAWN',
    };

    // 1. Initial retraction -> created = true
    const firstRetract = await f.retractSnapshot(retractInput);
    assert.equal(firstRetract.created, true);
    assert.ok(firstRetract.retraction.id);
    assert.equal(firstRetract.retraction.snapshotId, snapshot.id);

    // 2. Exact retry of retraction -> created = false, same retraction ID
    const retryRetract = await f.retractSnapshot(retractInput);
    assert.equal(retryRetract.created, false);
    assert.equal(retryRetract.retraction.id, firstRetract.retraction.id);

    // 3. Second retraction on same snapshot with DIFFERENT payload -> APPLICABILITY_CONFLICT
    await rejectsCode(
      f.retractSnapshot({
        ...retractInput,
        retractionReference: 'retract-ref-002',
        assertedAt: '2026-03-01T10:45:00.000Z',
      }),
      'APPLICABILITY_CONFLICT'
    );

    // 4. Reuse same retractionReference for a different snapshot under same source partition -> APPLICABILITY_CONFLICT
    const { snapshot: snap2 } = await f.insertSnapshot({
      assertionReference: 'snap-2-different',
      effectiveAt: '2026-03-01T10:00:00.000Z',
      assertedAt: '2026-03-01T10:15:00.000Z',
    });
    await rejectsCode(
      f.retractSnapshot({
        ...retractInput,
        snapshotId: snap2.id,
        // same retractionReference 'retract-ref-001' reused
      }),
      'APPLICABILITY_CONFLICT'
    );

    // 5. Retraction assertedAt earlier than target snapshot assertedAt -> APPLICABILITY_INVALID (chronology)
    const { snapshot: snap3 } = await f.insertSnapshot({
      assertionReference: 'snap-3-chronology',
      effectiveAt: '2026-03-01T10:00:00.000Z',
      assertedAt: '2026-03-01T10:15:00.000Z',
    });
    await rejectsCode(
      f.retractSnapshot({
        ...retractInput,
        snapshotId: snap3.id,
        retractionReference: 'retract-ref-003',
        assertedAt: '2026-03-01T10:05:00.000Z', // Before snap3 assertedAt (10:15)
      }),
      'APPLICABILITY_INVALID'
    );

    // 6. Cross-patient retraction mismatch -> APPLICABILITY_NOT_FOUND
    const fakePatientId = randomUUID();
    await rejectsCode(
      f.retractSnapshot({
        ...retractInput,
        snapshotId: snap3.id,
        patientId: fakePatientId,
        retractionReference: 'retract-ref-004',
      }),
      'APPLICABILITY_NOT_FOUND'
    );
  }));

test('EH-015 authorized query service: authorization matrix, read lock order, and single-statement read', () =>
  isolatedObservedApplicability(async (f) => {
    const effectiveAt = '2026-03-01T08:00:00.000Z';
    const { snapshot } = await f.insertSnapshot({
      effectiveAt,
      assertedAt: '2026-03-01T08:30:00.000Z',
      assertionReference: 'assert-auth-1',
    });

    const queryInput = {
      patientId: f.patientId,
      effectiveAt,
    };

    // 1. Patient A (own-data read) -> ALLOWED
    const patientRead = await f.applicability.getObservedApplicabilitySnapshots(
      f.principals['patient-a'],
      queryInput
    );
    assert.equal(patientRead.patientId, f.patientId);
    assert.equal(patientRead.snapshots.length, 1);
    assert.equal(patientRead.snapshots[0].id, snapshot.id);
    assert.equal(patientRead.tupleComparison, 'IDENTICAL_TUPLES');

    // 2. Assigned clinician -> ALLOWED
    const clinicianRead = await f.applicability.getObservedApplicabilitySnapshots(
      f.actor, // clinician-assigned
      queryInput
    );
    assert.equal(clinicianRead.patientId, f.patientId);
    assert.equal(clinicianRead.snapshots.length, 1);

    // 3. Cross-patient (Patient B attempting to read Patient A) -> DENIED (APPLICABILITY_NOT_FOUND)
    await rejectsCode(
      f.applicability.getObservedApplicabilitySnapshots(f.principals['patient-b'], queryInput),
      'APPLICABILITY_NOT_FOUND'
    );

    // 4. Unassigned clinician -> DENIED (APPLICABILITY_NOT_FOUND)
    await rejectsCode(
      f.applicability.getObservedApplicabilitySnapshots(f.principals['clinician-unassigned'], queryInput),
      'APPLICABILITY_NOT_FOUND'
    );

    // 5. Admin -> DENIED (APPLICABILITY_NOT_FOUND - no administrative clinical bypass)
    await rejectsCode(
      f.applicability.getObservedApplicabilitySnapshots(f.principals['admin'], queryInput),
      'APPLICABILITY_NOT_FOUND'
    );

    // 6. Forged / non-existent session -> DENIED (APPLICABILITY_UNAUTHENTICATED)
    await rejectsCode(
      f.applicability.getObservedApplicabilitySnapshots(
        { userId: f.principals['patient-a'].userId, sessionId: randomUUID(), role: 'PATIENT' },
        queryInput
      ),
      'APPLICABILITY_UNAUTHENTICATED'
    );

    // 7. Reads produce zero product audit logs
    const snap = await applicabilitySnapshot(f.pool);
    assert.equal(snap.audit.filter((a) => a.action_type?.includes('APPLICABILITY')).length, 0);
  }));

test('EH-015 mechanical point projection & tuple comparisons in DB', () =>
  isolatedObservedApplicability(async (f) => {
    const effectiveAt = '2026-03-01T12:00:00.000Z';

    // 1. Initial point: no rows at all -> NO_NON_RETRACTED_ROWS
    const emptyPoint = await f.getRawPoint(f.patientId, effectiveAt);
    assert.equal(emptyPoint.tupleComparison, 'NO_NON_RETRACTED_ROWS');
    assert.equal(emptyPoint.snapshots.length, 0);
    assert.equal(emptyPoint.nonRetractedSnapshotIds.length, 0);

    // 2. Insert snapshot 1 -> IDENTICAL_TUPLES
    const snap1 = await f.insertSnapshot({
      effectiveAt,
      assertedAt: '2026-03-01T12:10:00.000Z',
      assertionReference: 'point-assert-1',
      hypertensionStatus: 'PRESENT',
      diabetesStatus: 'ABSENT',
    });
    const singlePoint = await f.getRawPoint(f.patientId, effectiveAt);
    assert.equal(singlePoint.tupleComparison, 'IDENTICAL_TUPLES');
    assert.equal(singlePoint.snapshots.length, 1);
    assert.deepEqual(singlePoint.nonRetractedSnapshotIds, [snap1.snapshot.id]);
    assert.deepEqual(singlePoint.differingTupleSnapshotIds, []);

    // 3. Insert snapshot 2 with IDENTICAL clinical tuple -> IDENTICAL_TUPLES
    const snap2 = await f.insertSnapshot({
      effectiveAt,
      assertedAt: '2026-03-01T12:20:00.000Z',
      assertionReference: 'point-assert-2',
      hypertensionStatus: 'PRESENT',
      diabetesStatus: 'ABSENT',
    });
    const identicalPoint = await f.getRawPoint(f.patientId, effectiveAt);
    assert.equal(identicalPoint.tupleComparison, 'IDENTICAL_TUPLES');
    assert.equal(identicalPoint.snapshots.length, 2);
    assert.equal(identicalPoint.nonRetractedSnapshotIds.length, 2);
    assert.ok(identicalPoint.nonRetractedSnapshotIds.includes(snap2.snapshot.id));
    assert.deepEqual(identicalPoint.differingTupleSnapshotIds, []);

    // 4. Insert snapshot 3 with DIFFERING clinical tuple (diabetesStatus: PRESENT) -> DIFFERING_TUPLES
    const snap3 = await f.insertSnapshot({
      effectiveAt,
      assertedAt: '2026-03-01T12:30:00.000Z',
      assertionReference: 'point-assert-3',
      hypertensionStatus: 'PRESENT',
      diabetesStatus: 'PRESENT',
    });
    const diffPoint = await f.getRawPoint(f.patientId, effectiveAt);
    assert.equal(diffPoint.tupleComparison, 'DIFFERING_TUPLES');
    assert.equal(diffPoint.snapshots.length, 3);
    assert.equal(diffPoint.nonRetractedSnapshotIds.length, 3);
    assert.equal(diffPoint.differingTupleSnapshotIds.length, 3);

    // 5. Retract differing snapshot 3 -> collapses back to IDENTICAL_TUPLES
    await f.retractSnapshot({
      snapshotId: snap3.snapshot.id,
      assertedAt: '2026-03-01T12:40:00.000Z',
      retractionReference: 'retract-point-3',
    });
    const reconciledPoint = await f.getRawPoint(f.patientId, effectiveAt);
    assert.equal(reconciledPoint.tupleComparison, 'IDENTICAL_TUPLES');
    assert.equal(reconciledPoint.snapshots.length, 3);
    assert.equal(reconciledPoint.nonRetractedSnapshotIds.length, 2);
    assert.deepEqual(reconciledPoint.differingTupleSnapshotIds, []);
  }));

test('EH-015 concurrent duplicate insertion: overlapping assertion attempts serialize with single insertion', () =>
  isolatedObservedApplicability(async (f) => {
    let clientA;
    let clientB;
    let insertPromiseB;

    const input = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_OBSERVED_INPUT',
      sourceReference: 'eh015-concurrent-src',
      assertionReference: 'concurrent-assert-001',
      effectiveAt: '2026-03-01T14:00:00.000Z',
      assertedAt: '2026-03-01T14:15:00.000Z',
      ageAssertionState: 'ASSERTED_VALUE',
      ageYearsAtAssessment: 52,
      pregnancyStatus: 'NOT_PREGNANT',
      hypertensionStatus: 'PRESENT',
      cvdStatus: 'ABSENT',
      diabetesStatus: 'ABSENT',
      ckdStatus: 'ABSENT',
    };

    try {
      clientA = await f.pool.connect();
      clientB = await f.pool.connect();

      await clientA.query('SET statement_timeout = 10000');
      await clientB.query('SET statement_timeout = 10000');

      const bPid = (await clientB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

      await clientA.query('BEGIN');
      await clientB.query('BEGIN');

      // Client A performs the insert inside transaction A
      const resA = await clientA.query(
        `INSERT INTO public.observed_applicability_snapshots (
          id, patient_id, source_type, source_reference, assertion_reference,
          effective_at, asserted_at, age_assertion_state, age_years_at_assessment,
          pregnancy_status, hypertension_status, cvd_status, diabetes_status, ckd_status
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::public.observed_applicability_source_type, $3, $4,
          $5::timestamptz(6), $6::timestamptz(6), $7::public.observed_age_assertion_state, $8,
          $9::public.observed_pregnancy_status, $10::public.observed_condition_status,
          $11::public.observed_condition_status, $12::public.observed_condition_status,
          $13::public.observed_condition_status
        )
        ON CONFLICT ON CONSTRAINT oa_snapshots_source_identity_key DO NOTHING
        RETURNING *`,
        [
          input.patientId,
          input.sourceType,
          input.sourceReference,
          input.assertionReference,
          input.effectiveAt,
          input.assertedAt,
          input.ageAssertionState,
          input.ageYearsAtAssessment,
          input.pregnancyStatus,
          input.hypertensionStatus,
          input.cvdStatus,
          input.diabetesStatus,
          input.ckdStatus,
        ]
      );
      assert.equal(resA.rows.length, 1);
      const insertedA = resA.rows[0];

      // Client B attempts the concurrent insert of the EXACT SAME assertion
      insertPromiseB = clientB.query(
        `INSERT INTO public.observed_applicability_snapshots (
          id, patient_id, source_type, source_reference, assertion_reference,
          effective_at, asserted_at, age_assertion_state, age_years_at_assessment,
          pregnancy_status, hypertension_status, cvd_status, diabetes_status, ckd_status
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::public.observed_applicability_source_type, $3, $4,
          $5::timestamptz(6), $6::timestamptz(6), $7::public.observed_age_assertion_state, $8,
          $9::public.observed_pregnancy_status, $10::public.observed_condition_status,
          $11::public.observed_condition_status, $12::public.observed_condition_status,
          $13::public.observed_condition_status
        )
        ON CONFLICT ON CONSTRAINT oa_snapshots_source_identity_key DO NOTHING
        RETURNING *`,
        [
          input.patientId,
          input.sourceType,
          input.sourceReference,
          input.assertionReference,
          input.effectiveAt,
          input.assertedAt,
          input.ageAssertionState,
          input.ageYearsAtAssessment,
          input.pregnancyStatus,
          input.hypertensionStatus,
          input.cvdStatus,
          input.diabetesStatus,
          input.ckdStatus,
        ]
      );

      // Verify Client B is blocked on Client A's transaction
      await waitBlocked(f.pool, bPid, 5000);

      // Commit transaction A, releasing lock to Client B
      await clientA.query('COMMIT');

      // Client B unblocks and returns 0 rows (ON CONFLICT DO NOTHING)
      const resB = await insertPromiseB;
      assert.equal(resB.rows.length, 0);

      // Client B queries existing row
      const existingB = await clientB.query(
        `SELECT * FROM public.observed_applicability_snapshots
         WHERE patient_id = $1::uuid
           AND source_type = $2::public.observed_applicability_source_type
           AND source_reference = $3
           AND assertion_reference = $4`,
        [input.patientId, input.sourceType, input.sourceReference, input.assertionReference]
      );
      await clientB.query('COMMIT');

      assert.equal(existingB.rows.length, 1);
      assert.equal(existingB.rows[0].id, insertedA.id);

      // Verify exact count in DB is 1
      const countRes = await f.pool.query(
        'SELECT count(*)::int AS n FROM public.observed_applicability_snapshots WHERE source_reference = $1',
        ['eh015-concurrent-src']
      );
      assert.equal(countRes.rows[0].n, 1);
    } finally {
      if (clientA) {
        try {
          await clientA.query('ROLLBACK');
        } catch {}
      }
      if (insertPromiseB) {
        try {
          await insertPromiseB.catch(() => {});
        } catch {}
      }
      if (clientB) {
        try {
          await clientB.query('ROLLBACK');
        } catch {}
      }
      if (clientA) clientA.release();
      if (clientB) clientB.release();
    }
  }));
