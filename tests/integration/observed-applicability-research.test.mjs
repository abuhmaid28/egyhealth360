import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isolatedObservedApplicability,
  applicabilitySnapshot,
} from '../support/observed-applicability.mjs';

test('EH-015 research noninterference: hidden complete truth never backfills missing observed applicability data', () =>
  isolatedObservedApplicability(async (f) => {
    // Simulated research ground truth that is NOT visible to the observed applicability engine:
    // In ground truth, the patient is a 55-year-old non-pregnant diabetic with HTN, no CVD, no CKD.
    const hiddenGroundTruth = {
      patientId: f.patientId,
      cohort: 'DIABETIC_HYPERTENSIVE_STUDY_COHORT_2026',
      trueAge: 55,
      truePregnancy: 'NOT_PREGNANT',
      trueHypertension: 'PRESENT',
      trueCvd: 'ABSENT',
      trueDiabetes: 'PRESENT',
      trueCkd: 'ABSENT',
      futureOutcome30d: 'NO_EVENT',
    };

    // Visible clinical / observed record only has an assertion of hypertension = PRESENT.
    // Age has no assertion, pregnancy is unmentioned (null), CVD is unmentioned (null),
    // diabetes is unmentioned (null), CKD is unmentioned (null).
    const visibleObservedRecord = {
      patientId: f.patientId,
      sourceType: 'SYNTHETIC_OBSERVED_INPUT',
      sourceReference: 'eh015-research-run-001',
      assertionReference: 'obs-assert-001',
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

    const { snapshot: snap1 } = await f.insertSnapshot(visibleObservedRecord);

    // Assert that the stored snapshot strictly preserves missingness (null):
    // It must NOT backfill trueAge (55), trueDiabetes ('PRESENT'), trueCvd ('ABSENT'), etc.
    assert.equal(snap1.ageAssertionState, 'NO_ASSERTION');
    assert.equal(snap1.ageYearsAtAssessment, null);
    assert.equal(snap1.pregnancyStatus, null);
    assert.equal(snap1.hypertensionStatus, 'PRESENT');
    assert.equal(snap1.cvdStatus, null);
    assert.equal(snap1.diabetesStatus, null); // NOT 'PRESENT' from ground truth
    assert.equal(snap1.ckdStatus, null);

    // Verify directly from the database row
    const dbRow = (
      await f.pool.query(
        'SELECT * FROM public.observed_applicability_snapshots WHERE id = $1',
        [snap1.id]
      )
    ).rows[0];
    assert.equal(dbRow.age_assertion_state, 'NO_ASSERTION');
    assert.equal(dbRow.age_years_at_assessment, null);
    assert.equal(dbRow.pregnancy_status, null);
    assert.equal(dbRow.hypertension_status, 'PRESENT');
    assert.equal(dbRow.cvd_status, null);
    assert.equal(dbRow.diabetes_status, null);
    assert.equal(dbRow.ckd_status, null);

    // Now simulate an alternative ground truth (cohort changed, true diabetes changed to ABSENT, etc.)
    const alternateGroundTruth = {
      ...hiddenGroundTruth,
      cohort: 'HEALTHY_CONTROL_COHORT',
      trueDiabetes: 'ABSENT',
      trueCvd: 'PRESENT',
    };

    // Storing for another assertion under the exact same visible record
    const { snapshot: snap2 } = await f.insertSnapshot({
      ...visibleObservedRecord,
      assertionReference: 'obs-assert-002',
    });

    // Both snapshots are identical in clinical fields regardless of hidden ground truth
    assert.equal(snap2.diabetesStatus, null);
    assert.equal(snap2.cvdStatus, null);
    assert.equal(snap2.ckdStatus, null);
    assert.equal(snap2.pregnancyStatus, null);
    assert.equal(snap2.ageAssertionState, 'NO_ASSERTION');
    assert.equal(snap2.ageYearsAtAssessment, null);
    assert.notEqual(snap2.diabetesStatus, alternateGroundTruth.trueDiabetes);
    assert.notEqual(snap2.cvdStatus, alternateGroundTruth.trueCvd);

    // Zero audit logs generated
    const snap = await applicabilitySnapshot(f.pool);
    assert.equal(snap.audit.filter((a) => a.entity_type?.includes('applicability')).length, 0);
  }));

test('EH-015 missingness preservation vs explicit UNKNOWN vs explicit ABSENT across all clinical dimensions', () =>
  isolatedObservedApplicability(async (f) => {
    // 1. Explicit UNKNOWN values are preserved as UNKNOWN (distinct from null / unasserted)
    const { snapshot: snapUnknown } = await f.insertSnapshot({
      assertionReference: 'assert-explicit-unknown',
      ageAssertionState: 'UNKNOWN',
      ageYearsAtAssessment: null,
      pregnancyStatus: 'UNKNOWN',
      hypertensionStatus: 'UNKNOWN',
      cvdStatus: 'UNKNOWN',
      diabetesStatus: 'UNKNOWN',
      ckdStatus: 'UNKNOWN',
    });

    assert.equal(snapUnknown.ageAssertionState, 'UNKNOWN');
    assert.equal(snapUnknown.ageYearsAtAssessment, null);
    assert.equal(snapUnknown.pregnancyStatus, 'UNKNOWN');
    assert.equal(snapUnknown.hypertensionStatus, 'UNKNOWN');
    assert.equal(snapUnknown.cvdStatus, 'UNKNOWN');
    assert.equal(snapUnknown.diabetesStatus, 'UNKNOWN');
    assert.equal(snapUnknown.ckdStatus, 'UNKNOWN');

    // 2. Explicit ABSENT / NOT_PREGNANT values are preserved as ABSENT / NOT_PREGNANT
    const { snapshot: snapAbsent } = await f.insertSnapshot({
      assertionReference: 'assert-explicit-absent',
      ageAssertionState: 'ASSERTED_VALUE',
      ageYearsAtAssessment: 32,
      pregnancyStatus: 'NOT_PREGNANT',
      hypertensionStatus: 'ABSENT',
      cvdStatus: 'ABSENT',
      diabetesStatus: 'ABSENT',
      ckdStatus: 'ABSENT',
    });

    assert.equal(snapAbsent.ageAssertionState, 'ASSERTED_VALUE');
    assert.equal(snapAbsent.ageYearsAtAssessment, 32);
    assert.equal(snapAbsent.pregnancyStatus, 'NOT_PREGNANT');
    assert.equal(snapAbsent.hypertensionStatus, 'ABSENT');
    assert.equal(snapAbsent.cvdStatus, 'ABSENT');
    assert.equal(snapAbsent.diabetesStatus, 'ABSENT');
    assert.equal(snapAbsent.ckdStatus, 'ABSENT');

    // 3. Unasserted values (missingness) remain strictly NULL
    const { snapshot: snapMissing } = await f.insertSnapshot({
      assertionReference: 'assert-pure-missing',
      ageAssertionState: 'NO_ASSERTION',
      ageYearsAtAssessment: null,
      pregnancyStatus: null,
      hypertensionStatus: null,
      cvdStatus: null,
      diabetesStatus: null,
      ckdStatus: null,
    });

    assert.equal(snapMissing.ageAssertionState, 'NO_ASSERTION');
    assert.equal(snapMissing.ageYearsAtAssessment, null);
    assert.equal(snapMissing.pregnancyStatus, null);
    assert.equal(snapMissing.hypertensionStatus, null);
    assert.equal(snapMissing.cvdStatus, null);
    assert.equal(snapMissing.diabetesStatus, null);
    assert.equal(snapMissing.ckdStatus, null);

    // Verify all 3 rows in DB have exact representation
    const rows = (
      await f.pool.query(
        'SELECT id, age_assertion_state, age_years_at_assessment, pregnancy_status, hypertension_status, cvd_status, diabetes_status, ckd_status FROM public.observed_applicability_snapshots WHERE id IN ($1, $2, $3)',
        [snapUnknown.id, snapAbsent.id, snapMissing.id]
      )
    ).rows;

    const rowUnknown = rows.find((r) => r.id === snapUnknown.id);
    assert.equal(rowUnknown.diabetes_status, 'UNKNOWN');
    assert.equal(rowUnknown.pregnancy_status, 'UNKNOWN');

    const rowAbsent = rows.find((r) => r.id === snapAbsent.id);
    assert.equal(rowAbsent.diabetes_status, 'ABSENT');
    assert.equal(rowAbsent.pregnancy_status, 'NOT_PREGNANT');

    const rowMissing = rows.find((r) => r.id === snapMissing.id);
    assert.equal(rowMissing.diabetes_status, null);
    assert.equal(rowMissing.pregnancy_status, null);

    // Zero product audit logs created
    const snap = await applicabilitySnapshot(f.pool);
    assert.equal(snap.audit.filter((a) => a.entity_type?.includes('applicability')).length, 0);
  }));
