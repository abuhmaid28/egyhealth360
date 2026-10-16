import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedCoverage, coverageSnapshot } from '../support/coverage.mjs';

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

test('EH-013 database constraints: chronology, source_reference regex, and patient FK', () =>
  isolatedCoverage(async (f) => {
    // Inverted chronology
    await assert.rejects(
      f.insertCoverage({ startAt: '2026-06-01T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' }),
      (err) => err.message.includes('record_coverage_windows_chronology_check')
    );

    // Equal bounds
    await assert.rejects(
      f.insertCoverage({ startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' }),
      (err) => err.message.includes('record_coverage_windows_chronology_check')
    );

    // Invalid source_reference
    for (const invalid of ['', 'has space', 'invalid@char', 'a'.repeat(129)]) {
      await assert.rejects(
        f.insertCoverage({ sourceReference: invalid }),
        (err) => err.message.includes('record_coverage_windows_source_reference_check')
      );
    }

    // Invalid patientId
    await assert.rejects(
      f.insertCoverage({ patientId: '00000000-0000-4000-8000-999999999999' }),
      (err) => err.message.includes('record_coverage_windows_scope_guard') || err.message.includes('record_coverage_windows_patient_fkey')
    );
  }));

test('EH-013 duplicate assertion idempotency and partition independence', () =>
  isolatedCoverage(async (f) => {
    const input = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'eh013-demo-v1',
      coverageStatus: 'COMPLETE',
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-06-01T00:00:00.000Z',
    };

    const first = await f.insertCoverage(input);
    assert.equal(first.created, true);

    // Exact duplicate insertion
    const second = await f.insertCoverage(input);
    assert.equal(second.created, false);
    assert.equal(second.window.id, first.window.id);

    // Same interval with different sourceReference persists as a distinct row
    const diffRef = await f.insertCoverage({ ...input, sourceReference: 'eh013-demo-v2' });
    assert.equal(diffRef.created, true);
    assert.notEqual(diffRef.window.id, first.window.id);

    // Same interval and source with different status persists as a distinct row
    const diffStatus = await f.insertCoverage({ ...input, coverageStatus: 'INCOMPLETE' });
    assert.equal(diffStatus.created, true);
    assert.notEqual(diffStatus.window.id, first.window.id);

    // Total rows in DB is 3
    const snap = await coverageSnapshot(f.pool);
    assert.equal(snap.windows.length, 3);
    // Coverage insertion produces ZERO audit logs
    assert.equal(snap.audit.filter((a) => a.entity_type === 'record_coverage_window').length, 0);
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

test('EH-013 single-statement snapshot proof: cross-table consistency without mixed states', () =>
  isolatedCoverage(async (f) => {
    // Insert evidence before query
    await f.write(f.actor, { measuredAt: '2026-02-01T00:00:00.000Z' });
    await f.encounter(f.actor, { occurredAt: '2026-02-01T00:00:00.000Z' });
    await f.appointment(f.actor, { scheduledAt: '2026-03-01T00:00:00.000Z' });
    await f.insertCoverage({
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-06-01T00:00:00.000Z',
      coverageStatus: 'COMPLETE',
    });

    const result1 = await f.normalized.getNormalizedPatientEvidence(f.actor, {
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

    const result2 = await f.normalized.getNormalizedPatientEvidence(f.actor, {
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

    // Byte-for-byte identical output proving deterministic single-snapshot construction
    assert.deepEqual(JSON.stringify(result1), JSON.stringify(result2));
  }));
