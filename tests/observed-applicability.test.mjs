import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ObservedApplicabilityError,
  validateInsertSnapshotInput,
  validateRetractSnapshotInput,
  validateAgeAssertion,
  validatePregnancyStatus,
  validateConditionStatus,
  parseApplicabilityReference,
} from '../packages/db/dist/observed-applicability-values.js';
import {
  projectObservedApplicabilityPoint,
} from '../packages/db/dist/observed-applicability.js';
import { loadObservedApplicabilityFixture } from '../scripts/lib/observed-applicability-fixture.mjs';

test('EH-015 age truth table: valid combinations pass', () => {
  assert.deepEqual(validateAgeAssertion('NO_ASSERTION', null), {
    ageAssertionState: 'NO_ASSERTION',
    ageYearsAtAssessment: null,
  });
  assert.deepEqual(validateAgeAssertion('UNKNOWN', null), {
    ageAssertionState: 'UNKNOWN',
    ageYearsAtAssessment: null,
  });
  assert.deepEqual(validateAgeAssertion('ASSERTED_VALUE', 0), {
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 0,
  });
  assert.deepEqual(validateAgeAssertion('ASSERTED_VALUE', 17), {
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 17,
  });
  assert.deepEqual(validateAgeAssertion('ASSERTED_VALUE', 18), {
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 18,
  });
  assert.deepEqual(validateAgeAssertion('ASSERTED_VALUE', 2147483647), {
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 2147483647,
  });
});

test('EH-015 age truth table: invalid combinations and coercions rejected', () => {
  // Disallowed combinations
  assert.throws(
    () => validateAgeAssertion('NO_ASSERTION', 18),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'representation'
  );
  assert.throws(
    () => validateAgeAssertion('UNKNOWN', 18),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'representation'
  );
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', null),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'type'
  );

  // Invalid numbers
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', -1),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'representation'
  );
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', 2147483648),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'representation'
  );
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', 18.5),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'integer'
  );
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', '18'),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'type'
  );
  assert.throws(
    () => validateAgeAssertion('ASSERTED_VALUE', -0),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'representation'
  );

  // Invalid state
  assert.throws(
    () => validateAgeAssertion('INVALID_STATE', null),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'format'
  );
  assert.throws(
    () => validateAgeAssertion(123, null),
    (err) => err instanceof ObservedApplicabilityError && err.fields[0]?.reason === 'type'
  );
});

test('EH-015 pregnancy and conditions: explicit null, unknown, positive, negative', () => {
  assert.equal(validatePregnancyStatus(null), null);
  assert.equal(validatePregnancyStatus('PREGNANT'), 'PREGNANT');
  assert.equal(validatePregnancyStatus('NOT_PREGNANT'), 'NOT_PREGNANT');
  assert.equal(validatePregnancyStatus('UNKNOWN'), 'UNKNOWN');
  assert.throws(() => validatePregnancyStatus('MALE'), (err) => err.fields[0]?.reason === 'format');

  for (const field of ['hypertensionStatus', 'cvdStatus', 'diabetesStatus', 'ckdStatus']) {
    assert.equal(validateConditionStatus(null, field), null);
    assert.equal(validateConditionStatus('PRESENT', field), 'PRESENT');
    assert.equal(validateConditionStatus('ABSENT', field), 'ABSENT');
    assert.equal(validateConditionStatus('UNKNOWN', field), 'UNKNOWN');
    assert.throws(() => validateConditionStatus('POSSIBLE', field), (err) => err.fields[0]?.reason === 'format');
  }
});

test('EH-015 source and reference validation: strict 1..128 bounded ASCII', () => {
  assert.equal(parseApplicabilityReference('src-1', 'sourceReference'), 'src-1');
  assert.equal(parseApplicabilityReference('a'.repeat(128), 'sourceReference'), 'a'.repeat(128));
  assert.throws(() => parseApplicabilityReference('', 'sourceReference'), (err) => err.fields[0]?.reason === 'format');
  assert.throws(() => parseApplicabilityReference('a'.repeat(129), 'sourceReference'), (err) => err.fields[0]?.reason === 'format');
  assert.throws(() => parseApplicabilityReference('bad space', 'sourceReference'), (err) => err.fields[0]?.reason === 'format');
  assert.throws(() => parseApplicabilityReference('bad@char', 'sourceReference'), (err) => err.fields[0]?.reason === 'format');
});

test('EH-015 snapshot input validator: rejects extra keys, missing keys, and invalid chronology', () => {
  const valid = {
    patientId: '00000000-0000-4000-8000-000000000001',
    sourceType: 'SYNTHETIC_OBSERVED_INPUT',
    sourceReference: 'src-1',
    assertionReference: 'item-1',
    effectiveAt: '2026-03-01T08:00:00.000Z',
    assertedAt: '2026-03-01T08:30:00.000Z',
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 50,
    pregnancyStatus: 'NOT_PREGNANT',
    hypertensionStatus: 'PRESENT',
    cvdStatus: 'ABSENT',
    diabetesStatus: null,
    ckdStatus: null,
  };

  const parsed = validateInsertSnapshotInput(valid);
  assert.equal(parsed.patientId, valid.patientId);
  assert.equal(parsed.ageYearsAtAssessment, 50);

  // Extra key
  assert.throws(
    () => validateInsertSnapshotInput({ ...valid, extraKey: 123 }),
    (err) => err.fields[0]?.reason === 'unknown_fields'
  );

  // Missing key
  const missing = { ...valid };
  delete missing.diabetesStatus;
  assert.throws(
    () => validateInsertSnapshotInput(missing),
    (err) => err.fields[0]?.reason === 'required'
  );

  // Inverted chronology
  assert.throws(
    () => validateInsertSnapshotInput({ ...valid, effectiveAt: '2026-03-02T00:00:00.000Z', assertedAt: '2026-03-01T00:00:00.000Z' }),
    (err) => err.fields[0]?.reason === 'chronology'
  );

  // Rejection of EH-013 source type in EH-015
  assert.throws(
    () => validateInsertSnapshotInput({ ...valid, sourceType: 'SYNTHETIC_BENCHMARK' }),
    (err) => err.fields[0]?.reason === 'format'
  );
});

test('EH-015 retraction input validator: rejects invalid reason, targets, or missing fields', () => {
  const valid = {
    patientId: '00000000-0000-4000-8000-000000000001',
    snapshotId: '00000000-0000-4000-8000-000000000002',
    sourceType: 'SYNTHETIC_OBSERVED_INPUT',
    sourceReference: 'src-1',
    retractionReference: 'retract-1',
    assertedAt: '2026-03-01T09:00:00.000Z',
    reasonCode: 'SOURCE_ASSERTION_WITHDRAWN',
  };

  const parsed = validateRetractSnapshotInput(valid);
  assert.equal(parsed.snapshotId, valid.snapshotId);

  // Invalid reason
  assert.throws(
    () => validateRetractSnapshotInput({ ...valid, reasonCode: 'CLINICAL_ERROR' }),
    (err) => err.fields[0]?.reason === 'format'
  );
});

test('EH-015 pure tuple comparison: NO_NON_RETRACTED_ROWS, IDENTICAL_TUPLES, DIFFERING_TUPLES', () => {
  const patientId = '00000000-0000-4000-8000-000000000001';
  const effectiveAt = '2026-03-01T08:00:00.000Z';

  // 1. Zero rows
  const point0 = projectObservedApplicabilityPoint(patientId, effectiveAt, []);
  assert.equal(point0.tupleComparison, 'NO_NON_RETRACTED_ROWS');
  assert.deepEqual(point0.nonRetractedSnapshotIds, []);
  assert.deepEqual(point0.differingTupleSnapshotIds, []);

  // 2. Retracted only
  const retractedRow = {
    id: '00000000-0000-4000-8000-000000000010',
    patientId,
    sourceType: 'SYNTHETIC_OBSERVED_INPUT',
    sourceReference: 'src-1',
    assertionReference: 'item-1',
    effectiveAt: new Date(effectiveAt),
    assertedAt: new Date(effectiveAt),
    recordedAt: new Date(effectiveAt),
    ageAssertionState: 'ASSERTED_VALUE',
    ageYearsAtAssessment: 40,
    pregnancyStatus: 'NOT_PREGNANT',
    hypertensionStatus: 'PRESENT',
    cvdStatus: 'ABSENT',
    diabetesStatus: 'ABSENT',
    ckdStatus: 'ABSENT',
    retractionId: '00000000-0000-4000-8000-000000000020',
    retractionSnapshotId: '00000000-0000-4000-8000-000000000010',
    retractionPatientId: patientId,
    retractionSourceType: 'SYNTHETIC_OBSERVED_INPUT',
    retractionSourceReference: 'src-1',
    retractionReference: 'ret-1',
    retractionAssertedAt: new Date(effectiveAt),
    retractionRecordedAt: new Date(effectiveAt),
    retractionReasonCode: 'SOURCE_ASSERTION_WITHDRAWN',
  };
  const pointRet = projectObservedApplicabilityPoint(patientId, effectiveAt, [retractedRow]);
  assert.equal(pointRet.tupleComparison, 'NO_NON_RETRACTED_ROWS');
  assert.equal(pointRet.snapshots.length, 1);
  assert.ok(pointRet.snapshots[0].retraction !== null);

  // 3. Single non-retracted row
  const activeRow1 = { ...retractedRow, id: '00000000-0000-4000-8000-000000000011', retractionId: null };
  const point1 = projectObservedApplicabilityPoint(patientId, effectiveAt, [activeRow1]);
  assert.equal(point1.tupleComparison, 'IDENTICAL_TUPLES');
  assert.deepEqual(point1.nonRetractedSnapshotIds, [activeRow1.id]);
  assert.deepEqual(point1.differingTupleSnapshotIds, []);

  // 4. Two identical non-retracted rows with different provenance
  const activeRow2 = {
    ...activeRow1,
    id: '00000000-0000-4000-8000-000000000005', // lexicographically smaller UUID
    sourceReference: 'src-2',
    assertionReference: 'item-2',
  };
  const pointIdentical = projectObservedApplicabilityPoint(patientId, effectiveAt, [activeRow1, activeRow2]);
  assert.equal(pointIdentical.tupleComparison, 'IDENTICAL_TUPLES');
  // Canonical sort order
  assert.deepEqual(pointIdentical.nonRetractedSnapshotIds, [activeRow2.id, activeRow1.id]);
  assert.deepEqual(pointIdentical.differingTupleSnapshotIds, []);

  // 5. Differing tuples (e.g. one has diabetes ABSENT, another has diabetes NULL)
  const activeRow3 = {
    ...activeRow1,
    id: '00000000-0000-4000-8000-000000000012',
    diabetesStatus: null,
  };
  const pointDiff = projectObservedApplicabilityPoint(patientId, effectiveAt, [activeRow1, activeRow3]);
  assert.equal(pointDiff.tupleComparison, 'DIFFERING_TUPLES');
  assert.deepEqual(pointDiff.differingTupleSnapshotIds, [activeRow1.id, activeRow3.id]);

  // 6. Age difference: NO_ASSERTION vs UNKNOWN
  const ageNoAssert = { ...activeRow1, id: '00000000-0000-4000-8000-000000000030', ageAssertionState: 'NO_ASSERTION', ageYearsAtAssessment: null };
  const ageUnknown = { ...activeRow1, id: '00000000-0000-4000-8000-000000000031', ageAssertionState: 'UNKNOWN', ageYearsAtAssessment: null };
  const pointAgeDiff = projectObservedApplicabilityPoint(patientId, effectiveAt, [ageNoAssert, ageUnknown]);
  assert.equal(pointAgeDiff.tupleComparison, 'DIFFERING_TUPLES');
});

test('EH-015 fixed manifest fixture loads and validates', async () => {
  const fixture = await loadObservedApplicabilityFixture();
  assert.equal(fixture.manifestVersion, 'eh015-observed-input-v1');
  assert.equal(fixture.logicalPatient, 'patient-a');
  assert.equal(fixture.snapshots.length, 4);
  assert.equal(fixture.retractions.length, 1);
});

test('EH-015 research noninterference & missingness: null is never coerced to ABSENT or UNKNOWN', () => {
  // A raw observation with unasserted fields must validate to explicit null, never inferred
  const input = {
    patientId: '00000000-0000-4000-8000-000000000001',
    sourceType: 'SYNTHETIC_OBSERVED_INPUT',
    sourceReference: 'synth-src',
    assertionReference: 'assert-1',
    effectiveAt: '2026-03-01T08:00:00.000Z',
    assertedAt: '2026-03-01T08:30:00.000Z',
    ageAssertionState: 'NO_ASSERTION',
    ageYearsAtAssessment: null,
    pregnancyStatus: null,
    hypertensionStatus: 'PRESENT',
    cvdStatus: null,
    diabetesStatus: null,
    ckdStatus: null,
  };

  const validated = validateInsertSnapshotInput(input);
  assert.equal(validated.pregnancyStatus, null);
  assert.equal(validated.cvdStatus, null);
  assert.equal(validated.diabetesStatus, null);
  assert.equal(validated.ckdStatus, null);
  assert.equal(validated.ageYearsAtAssessment, null);
  assert.equal(validated.ageAssertionState, 'NO_ASSERTION');

  // Ground truth with true diabetes = PRESENT must not be part of the validated snapshot schema
  assert.equal(Object.prototype.hasOwnProperty.call(validated, 'trueDiabetes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(validated, 'groundTruth'), false);
});


test('EH-015 source times reject nonfinite/year/sub-ms/calendar/offset representations', () => {
  const base = {
    patientId: '00000000-0000-4000-8000-000000000001', sourceType: 'SYNTHETIC_OBSERVED_INPUT',
    sourceReference: 'src', assertionReference: 'item', effectiveAt: '2026-03-01T08:00:00.000Z',
    assertedAt: '2026-03-01T08:00:00.000Z', ageAssertionState: 'NO_ASSERTION', ageYearsAtAssessment: null,
    pregnancyStatus: null, hypertensionStatus: null, cvdStatus: null, diabetesStatus: null, ckdStatus: null,
  };
  for (const field of ['effectiveAt', 'assertedAt']) for (const value of [
    'infinity', '-infinity', '0000-01-01T00:00:00Z', '10000-01-01T00:00:00Z',
    '2026-03-01T08:00:00.000001Z', '2026-02-30T00:00:00Z',
    '2026-03-01T08:00:00-00:00', '2026-03-01T08:00Z', NaN, Infinity,
  ]) assert.throws(() => validateInsertSnapshotInput({ ...base, [field]: value }), e => e.code === 'APPLICABILITY_INVALID');
});

test('EH-015 fixture loading and custom injection share exact manifest/item validation', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { validateObservedApplicabilityFixture } = await import('../scripts/lib/observed-applicability-fixture.mjs');
  const fixture = await loadObservedApplicabilityFixture();
  const dir = await mkdtemp(join(tmpdir(), 'eh015-fixture-shape-'));
  try {
    for (const level of ['manifest', 'snapshot', 'retraction']) {
      const bad = JSON.parse(JSON.stringify(fixture));
      (level === 'manifest' ? bad : level === 'snapshot' ? bad.snapshots[0] : bad.retractions[0]).groundTruth = { diabetesStatus: 'ABSENT' };
      assert.throws(() => validateObservedApplicabilityFixture(bad), e => e.code === 'APPLICABILITY_INVALID');
      const path = join(dir, level + '.json');
      await writeFile(path, JSON.stringify(bad));
      await assert.rejects(loadObservedApplicabilityFixture(path), e => e.code === 'APPLICABILITY_INVALID');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
