import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedCoverage, coverageSnapshot, waitBlocked } from '../support/coverage.mjs';
import { RecordCoverageError } from '../../packages/db/dist/record-coverage.js';

const rejects = (p, code) => assert.rejects(p, (e) => e.code === code);

test('EH-013 database immutability: UPDATE, DELETE, TRUNCATE strictly rejected by trigger', () =>
  isolatedCoverage(async (f) => {
    const { window } = await f.insertCoverage();
    assert.ok(window.id);

    // Rejection of UPDATE (even no-op)
    await assert.rejects(
      f.pool.query('UPDATE public.record_coverage_windows SET source_reference = $1 WHERE id = $2', ['new-ref', window.id]),
      (err) => err.message.includes('Record coverage history is immutable')
    );

    // Rejection of DELETE
    await assert.rejects(
      f.pool.query('DELETE FROM public.record_coverage_windows WHERE id = $1', [window.id]),
      (err) => err.message.includes('Record coverage history is immutable')
    );

    // Rejection of TRUNCATE
    await assert.rejects(
      f.pool.query('TRUNCATE TABLE public.record_coverage_windows'),
      (err) => err.message.includes('Record coverage history is immutable')
    );
  }));

test('EH-013 real machine writer: exact assertions, idempotency, distinct partitions, safe error paths and immutability', () =>
  isolatedCoverage(async (f) => {
    const input = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'eh013-demo-v1',
      coverageStatus: 'COMPLETE',
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-06-01T00:00:00.000Z',
    };

    // 1. First exact assertion: created = true
    const first = await f.insertCoverage(input);
    assert.equal(first.created, true);
    assert.ok(first.window.id);

    // 2. Second exact assertion: created = false, same stable row UUID
    const second = await f.insertCoverage(input);
    assert.equal(second.created, false);
    assert.equal(second.window.id, first.window.id);

    // 3. Different status: persists as new row
    const diffStatus = await f.insertCoverage({ ...input, coverageStatus: 'INCOMPLETE' });
    assert.equal(diffStatus.created, true);
    assert.notEqual(diffStatus.window.id, first.window.id);

    // 4. Different sourceReference: persists as new row
    const diffRef = await f.insertCoverage({ ...input, sourceReference: 'eh013-demo-v2' });
    assert.equal(diffRef.created, true);
    assert.notEqual(diffRef.window.id, first.window.id);

    // 5. Invalid patient: safe expected failure (COVERAGE_NOT_FOUND)
    await assert.rejects(
      f.insertCoverage({ ...input, patientId: '00000000-0000-4000-8000-999999999999' }),
      (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_NOT_FOUND'
    );

    // 6. Invalid source reference: expected validation failure (COVERAGE_INVALID)
    for (const invalid of ['', 'has space', 'invalid@char', 'a'.repeat(129)]) {
      await assert.rejects(
        f.insertCoverage({ ...input, sourceReference: invalid }),
        (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
      );
    }

    // 7. Invalid chronology: expected validation failure (COVERAGE_INVALID)
    await assert.rejects(
      f.insertCoverage({ ...input, startAt: '2026-06-01T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' }),
      (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
    );

    // 8. Historical row remains immutable
    await assert.rejects(
      f.pool.query('UPDATE public.record_coverage_windows SET source_reference = $1 WHERE id = $2', ['modified-ref', first.window.id]),
      (err) => err.message.includes('Record coverage history is immutable')
    );
    await assert.rejects(
      f.pool.query('DELETE FROM public.record_coverage_windows WHERE id = $1', [first.window.id]),
      (err) => err.message.includes('Record coverage history is immutable')
    );

    // Total rows in DB is 3
    const snap = await coverageSnapshot(f.pool);
    assert.equal(snap.windows.length, 3);
    // Coverage insertion produces ZERO application audit logs
    assert.equal(snap.audit.filter((a) => a.entity_type === 'record_coverage_window').length, 0);
  }));

test('EH-013 real concurrent duplicate test: overlapping assertion attempts serialize with single insertion and idempotent no-op', () =>
  isolatedCoverage(async (f) => {
    const clientA = await f.pool.connect();
    const clientB = await f.pool.connect();

    const input = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'eh013-concurrent-v1',
      coverageStatus: 'COMPLETE',
      startAt: '2026-02-01T00:00:00.000Z',
      endAt: '2026-05-01T00:00:00.000Z',
    };

    try {
      const bPid = (await clientB.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

      await clientA.query('BEGIN');
      await clientB.query('BEGIN');

      // Client A performs the insert inside transaction A
      const resA = await clientA.query(
        `INSERT INTO public.record_coverage_windows (
          id, patient_id, source_type, source_reference, coverage_status, start_at, end_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::public.record_coverage_source_type, $3, $4::public.record_coverage_status, $5::timestamptz(6), $6::timestamptz(6)
        )
        ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING
        RETURNING *`,
        [input.patientId, input.sourceType, input.sourceReference, input.coverageStatus, input.startAt, input.endAt]
      );
      assert.equal(resA.rows.length, 1);
      const insertedA = resA.rows[0];

      // Client B attempts the concurrent overlapping insert of the EXACT SAME assertion
      const insertPromiseB = clientB.query(
        `INSERT INTO public.record_coverage_windows (
          id, patient_id, source_type, source_reference, coverage_status, start_at, end_at
        ) VALUES (
          gen_random_uuid(), $1::uuid, $2::public.record_coverage_source_type, $3, $4::public.record_coverage_status, $5::timestamptz(6), $6::timestamptz(6)
        )
        ON CONFLICT ON CONSTRAINT record_coverage_windows_assertion_key DO NOTHING
        RETURNING *`,
        [input.patientId, input.sourceType, input.sourceReference, input.coverageStatus, input.startAt, input.endAt]
      );

      // Prove Client B is genuinely blocked waiting for Client A's transaction
      await waitBlocked(f.pool, bPid);

      // Commit transaction A, releasing the lock to Client B
      await clientA.query('COMMIT');

      // Client B unblocks and returns 0 rows (ON CONFLICT DO NOTHING)
      const resB = await insertPromiseB;
      assert.equal(resB.rows.length, 0);

      // Client B queries the existing row as the deterministic idempotent resolution
      const existingB = await clientB.query(
        `SELECT * FROM public.record_coverage_windows
         WHERE patient_id = $1::uuid
           AND source_type = $2::public.record_coverage_source_type
           AND source_reference = $3
           AND coverage_status = $4::public.record_coverage_status
           AND start_at = $5::timestamptz(6)
           AND end_at = $6::timestamptz(6)`,
        [input.patientId, input.sourceType, input.sourceReference, input.coverageStatus, input.startAt, input.endAt]
      );
      await clientB.query('COMMIT');

      assert.equal(existingB.rows.length, 1);
      assert.equal(existingB.rows[0].id, insertedA.id);

      // Verify DB contains EXACTLY 1 row for this assertion
      const countRes = await f.pool.query(
        'SELECT count(*)::int AS n FROM public.record_coverage_windows WHERE source_reference = $1',
        ['eh013-concurrent-v1']
      );
      assert.equal(countRes.rows[0].n, 1);
    } finally {
      clientA.release();
      clientB.release();
    }
  }));

test('EH-013 authorization matrix: patient own read allowed, cross-patient and admin denied', () =>
  isolatedCoverage(async (f) => {
    await f.insertCoverage();

    const queryInput = {
      patientId: f.patientId,
      queryInterval: {
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-12-31T23:59:59.999Z',
      },
      partition: {
        sourceType: 'SYNTHETIC_BENCHMARK',
        sourceReference: 'eh013-demo-v1',
      },
    };

    // 1. Patient A (own read) -> ALLOW
    const patientResult = await f.normalized.getNormalizedPatientEvidence(f.principals['patient-a'], queryInput);
    assert.equal(patientResult.patientId, f.patientId);
    assert.equal(patientResult.coverageFacts.rawWindows.length, 1);

    // 2. Assigned Clinician -> ALLOW
    const clinicianResult = await f.normalized.getNormalizedPatientEvidence(f.actor, queryInput);
    assert.equal(clinicianResult.patientId, f.patientId);

    // 3. Patient B (cross-patient read) -> DENY (EVIDENCE_NOT_FOUND)
    await rejects(f.normalized.getNormalizedPatientEvidence(f.principals['patient-b'], queryInput), 'EVIDENCE_NOT_FOUND');

    // 4. Unassigned Clinician -> DENY (EVIDENCE_NOT_FOUND)
    await rejects(f.normalized.getNormalizedPatientEvidence(f.principals['clinician-unassigned'], queryInput), 'EVIDENCE_NOT_FOUND');

    // 5. Admin -> DENY (EVIDENCE_NOT_FOUND)
    await rejects(f.normalized.getNormalizedPatientEvidence(f.principals['admin'], queryInput), 'EVIDENCE_NOT_FOUND');

    // 6. Reads generate zero audit logs
    const snap = await coverageSnapshot(f.pool);
    assert.equal(snap.audit.filter((a) => a.action_type === 'NORMALIZED_EVIDENCE_READ').length, 0);
  }));

test('EH-013 factual candidate extraction and encounter-anchored inclusion', () =>
  isolatedCoverage(async (f) => {
    // Evidence 1: BP measurement inside interval
    const bpInside = await f.write(f.actor, {
      measuredAt: '2026-03-01T10:00:00.000Z',
      systolic: 130,
      diastolic: 85,
    });

    // Evidence 2: BP measurement outside interval (older)
    const bpOutside = await f.write(f.actor, {
      measuredAt: '2025-12-01T10:00:00.000Z',
      systolic: 140,
      diastolic: 90,
    });

    // Evidence 3: Encounter inside interval, associated with bpOutside!
    const encInside = await f.encounter(f.actor, {
      occurredAt: '2026-03-01T10:30:00.000Z',
    });
    await f.encounters.associateBloodPressureMeasurement(f.actor, {
      patientId: f.patientId,
      encounterId: encInside.id,
      measurementId: bpOutside.id,
    });

    // Evidence 4: Encounter outside interval, associated with bpInside!
    const encOutside = await f.encounter(f.actor, {
      occurredAt: '2025-12-01T10:30:00.000Z',
    });
    await f.encounters.associateBloodPressureMeasurement(f.actor, {
      patientId: f.patientId,
      encounterId: encOutside.id,
      measurementId: bpInside.id,
    });

    // Evidence 5: Operational appointment inside interval (SCHEDULED)
    const appScheduled = await f.appointment(f.actor, {
      scheduledAt: '2026-04-01T09:00:00.000Z',
    });

    // Evidence 6: Operational appointment inside interval (CANCELLED)
    const appCancelled = await f.appointment(f.actor, {
      scheduledAt: '2026-04-15T09:00:00.000Z',
    });
    await f.appointments.cancelFollowUpAppointment(f.actor, {
      patientId: f.patientId,
      appointmentId: appCancelled.id,
    });

    // Coverage window
    await f.insertCoverage({
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-06-01T00:00:00.000Z',
      coverageStatus: 'COMPLETE',
    });

    // Query interval: [2026-01-01, 2026-06-01)
    const result = await f.normalized.getNormalizedPatientEvidence(f.actor, {
      patientId: f.patientId,
      queryInterval: {
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-06-01T00:00:00.000Z',
      },
      partition: {
        sourceType: 'SYNTHETIC_BENCHMARK',
        sourceReference: 'eh013-demo-v1',
      },
    });

    // Factual verification:
    // 1. bpInside is included in bloodPressureMeasurements; bpOutside is excluded
    assert.equal(result.bloodPressureMeasurements.length, 1);
    assert.equal(result.bloodPressureMeasurements[0].id, bpInside.id);

    // 2. encInside is included in clinicalEncounters; encOutside is excluded
    assert.equal(result.clinicalEncounters.length, 1);
    assert.equal(result.clinicalEncounters[0].id, encInside.id);

    // 3. StructuralEncounterBpCandidate is ENCOUNTER-ANCHORED:
    // encInside was inside the interval, so its candidate pair is included EVEN THOUGH bpOutside is outside the interval!
    // encOutside was outside the interval, so its candidate pair is EXCLUDED even though bpInside is inside the interval!
    assert.equal(result.structuralEncounterBpCandidates.length, 1);
    assert.equal(result.structuralEncounterBpCandidates[0].encounterId, encInside.id);
    assert.equal(result.structuralEncounterBpCandidates[0].bloodPressureMeasurementId, bpOutside.id);
    assert.equal(result.structuralEncounterBpCandidates[0].systolic, 140);
    assert.equal(result.structuralEncounterBpCandidates[0].diastolic, 90);

    // 4. OperationalAppointmentCandidate: appScheduled included, appCancelled excluded!
    assert.equal(result.operationalAppointmentCandidates.length, 1);
    assert.equal(result.operationalAppointmentCandidates[0].appointmentId, appScheduled.id);
    assert.equal(result.operationalAppointmentCandidates[0].status, 'SCHEDULED');

    // 5. Zero completion, qualification, or EACCE flags on candidates
    assert.equal(result.structuralEncounterBpCandidates[0].completed, undefined);
    assert.equal(result.structuralEncounterBpCandidates[0].qualifying, undefined);
    assert.equal(result.operationalAppointmentCandidates[0].actionLinked, undefined);
    assert.equal(result.operationalAppointmentCandidates[0].closureState, undefined);
  }));

test('EH-013 single-statement snapshot proof: query-counting and cross-table consistency', () =>
  isolatedCoverage(async (f) => {
    // Populate baseline evidence across multiple domain tables
    await f.write(f.actor, { measuredAt: '2026-02-01T00:00:00.000Z' });
    await f.encounter(f.actor, { occurredAt: '2026-02-01T00:00:00.000Z' });
    await f.appointment(f.actor, { scheduledAt: '2026-03-01T00:00:00.000Z' });
    await f.insertCoverage({
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-06-01T00:00:00.000Z',
      coverageStatus: 'COMPLETE',
    });

    const queryInput = {
      patientId: f.patientId,
      queryInterval: {
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-06-01T00:00:00.000Z',
      },
      partition: {
        sourceType: 'SYNTHETIC_BENCHMARK',
        sourceReference: 'eh013-demo-v1',
      },
    };

    // Prove exactly one SQL evidence query executes during retrieval
    let snapshotQueryCount = 0;
    const origQuery = f.pool.query.bind(f.pool);
    f.pool.query = function (...args) {
      const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text || '';
      if (sql.includes('WITH') && sql.includes('bp_rows') && sql.includes('coverage_rows')) {
        snapshotQueryCount++;
      }
      return origQuery(...args);
    };

    try {
      const result1 = await f.normalized.getNormalizedPatientEvidence(f.actor, queryInput);
      assert.equal(snapshotQueryCount, 1, 'Exactly one single-statement snapshot query must execute');

      assert.equal(result1.bloodPressureMeasurements.length, 1);
      assert.equal(result1.clinicalEncounters.length, 1);
      assert.equal(result1.operationalAppointmentCandidates.length, 1);
      assert.equal(result1.coverageFacts.rawWindows.length, 1);
      assert.equal(result1.coverageFacts.effectiveSegments.length, 1);

      // Repeat query verification for deterministic byte-for-byte snapshot result
      const result2 = await f.normalized.getNormalizedPatientEvidence(f.actor, queryInput);
      assert.equal(snapshotQueryCount, 2, 'Second fetch executes exactly one second snapshot query');
      assert.deepEqual(JSON.stringify(result1), JSON.stringify(result2));
    } finally {
      f.pool.query = origQuery;
    }
  }));
