import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isolatedObservedApplicability, observeApplicabilityQueries } from '../support/observed-applicability.mjs';
import { applyObservedApplicabilityFixtureTransaction } from '../../scripts/lib/observed-applicability-fixture.mjs';

const inputFields = ['sourceType', 'sourceReference', 'assertionReference', 'effectiveAt', 'assertedAt',
  'ageAssertionState', 'ageYearsAtAssessment', 'pregnancyStatus', 'hypertensionStatus', 'cvdStatus', 'diabetesStatus', 'ckdStatus'];
const pick = row => Object.fromEntries(inputFields.map(key => [key,
  row[key] instanceof Date ? row[key].toISOString() : row[key]]));
const base = JSON.parse(await readFile('tests/fixtures/eh015-observed-input-v1.json', 'utf8'));
const fixtureFor = item => ({ manifestVersion: base.manifestVersion, logicalPatient: base.logicalPatient,
  snapshots: [item], retractions: [] });

test('EH-015 actual fixture validator→mapper→writer: inaccessible canaries do not repair observed missingness', { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    const observed = { ...base.snapshots[0], ageAssertionState: 'NO_ASSERTION', ageYearsAtAssessment: null,
      pregnancyStatus: null, hypertensionStatus: null, cvdStatus: null, diabetesStatus: null, ckdStatus: null };
    const hidden = Object.create(null);
    // Canaries are outside the observed argument and production import graph.
    // Any accidental access from visible getters/global/SQL fails, rather than
    // comparing against an unused local object.
    const hiddenKeys = ['groundTruth', 'cohort', 'futureOutcome', 'corruption'];
    let reads = 0;
    let hiddenScenario;
    for (const key of hiddenKeys) Object.defineProperty(hidden, key, { get() {
      reads++; throw new Error('HIDDEN_CANARY_ACCESSED:' + hiddenScenario.complete.diabetesStatus);
    } });
    const restore = observeApplicabilityQueries((q, execute) => {
      assert.doesNotMatch(q.text, /benchmark_cases|ground_truth|corruption_events|engine_predictions/i);
      return execute();
    });
    try {
      for (const diabetesStatus of [null, 'UNKNOWN', 'ABSENT']) {
        const item = { ...observed, diabetesStatus, assertionReference: `visible-${diabetesStatus ?? 'null'}` };
        // Change the external complete-data objects while keeping observed input
        // byte-equivalent. Neither is a production input. Hidden inherited keys
        // trap any fallback such as item.groundTruth; own-key validation still
        // sees exactly the allowed plain observed object.
        for (const truth of ['ABSENT', 'PRESENT']) {
          hiddenScenario = { complete: { diabetesStatus: truth }, cohort: truth,
            futureOutcome: truth, corruption: { removed: truth }, canaries: hidden };
          assert.equal(hiddenScenario.complete.diabetesStatus, truth);
          const guarded = new Proxy(item, { get(target, key, receiver) {
            if (hiddenKeys.includes(key)) return hidden[key];
            return Reflect.get(target, key, receiver);
          } });
          await applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, fixtureFor(guarded));
          const point = await f.getRawPoint(f.patientId, item.effectiveAt);
          const stored = point.snapshots.find(s => s.assertionReference === item.assertionReference);
          assert.deepEqual(pick(stored), pick(item));
          assert.equal(stored.diabetesStatus, diabetesStatus);
        }
      }
      assert.equal(reads, 0);
      const rows = (await f.pool.query('SELECT * FROM observed_applicability_snapshots')).rows;
      assert.equal(rows.length, 3, 'exact fixture retries retain only original rows');
      for (const row of rows) {
        assert.equal(row.age_assertion_state, 'NO_ASSERTION');
        assert.equal(row.age_years_at_assessment, null);
        for (const field of ['pregnancy_status', 'hypertension_status', 'cvd_status', 'ckd_status']) assert.equal(row[field], null);
      }
      const unknown = { ...observed, assertionReference: 'explicit-unknown', ageAssertionState: 'UNKNOWN',
        pregnancyStatus: 'UNKNOWN', hypertensionStatus: 'UNKNOWN', cvdStatus: 'UNKNOWN', diabetesStatus: 'UNKNOWN', ckdStatus: 'UNKNOWN' };
      await applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, fixtureFor(unknown));
      const stored = (await f.getRawPoint(f.patientId, unknown.effectiveAt)).snapshots.find(s => s.assertionReference === unknown.assertionReference);
      assert.deepEqual(pick(stored), pick(unknown));
    } finally { restore(); }
  }));

for (const level of ['manifest', 'snapshot', 'retraction']) test(`EH-015 actual fixture entry rejects hidden keys at ${level}`, () =>
  isolatedObservedApplicability(async f => {
    const before = (await f.pool.query('SELECT count(*)::int n FROM observed_applicability_snapshots')).rows[0].n;
    for (const key of ['eligible', 'applicable', 'ruleSatisfied', 'groundTruth', 'trueDiabetes', 'trueCvd', 'cohort', 'corruption', 'futureOutcome', 'benchmarkLabel', 'arbitrary']) {
      const fixture = JSON.parse(JSON.stringify(base));
      const target = level === 'manifest' ? fixture : level === 'snapshot' ? fixture.snapshots[0] : fixture.retractions[0];
      target[key] = 'hidden';
      await assert.rejects(applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, fixture), e => e.code === 'APPLICABILITY_INVALID');
    }
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM observed_applicability_snapshots')).rows[0].n, before);
  }));
