import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  internalInsertObservedApplicabilitySnapshot,
  internalRetractObservedApplicabilitySnapshot,
} from '../../packages/db/dist/observed-applicability.js';

const DEFAULT_FIXTURE_PATH = fileURLToPath(
  new URL('../../tests/fixtures/eh015-observed-input-v1.json', import.meta.url)
);

export async function loadObservedApplicabilityFixture(filePath = DEFAULT_FIXTURE_PATH) {
  const content = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_OBSERVED_FIXTURE');
  }
  if (parsed.manifestVersion !== 'eh015-observed-input-v1') {
    throw new Error('INVALID_OBSERVED_FIXTURE_VERSION');
  }
  if (parsed.logicalPatient !== 'patient-a') {
    throw new Error('INVALID_OBSERVED_FIXTURE_PATIENT');
  }
  if (!Array.isArray(parsed.snapshots) || !Array.isArray(parsed.retractions)) {
    throw new Error('INVALID_OBSERVED_FIXTURE_ARRAYS');
  }
  return parsed;
}

export function mapObservedApplicabilityFixtureItem(item, patientId) {
  return {
    patientId,
    sourceType: item.sourceType,
    sourceReference: item.sourceReference,
    assertionReference: item.assertionReference,
    effectiveAt: item.effectiveAt,
    assertedAt: item.assertedAt,
    ageAssertionState: item.ageAssertionState,
    ageYearsAtAssessment: item.ageYearsAtAssessment,
    pregnancyStatus: item.pregnancyStatus,
    hypertensionStatus: item.hypertensionStatus,
    cvdStatus: item.cvdStatus,
    diabetesStatus: item.diabetesStatus,
    ckdStatus: item.ckdStatus,
  };
}

export async function applyObservedApplicabilityFixture(tx, patientId, customFixture = null) {
  const fixture = customFixture ?? (await loadObservedApplicabilityFixture());

  const insertedSnapshots = [];
  for (const item of fixture.snapshots) {
    const input = mapObservedApplicabilityFixtureItem(item, patientId);
    const result = await internalInsertObservedApplicabilitySnapshot(tx, input);
    insertedSnapshots.push(result.snapshot);
  }

  const insertedRetractions = [];
  for (const rItem of fixture.retractions) {
    const target = insertedSnapshots.find(
      s =>
        s.patientId === patientId &&
        s.sourceType === rItem.sourceType &&
        s.sourceReference === rItem.sourceReference &&
        s.assertionReference === rItem.targetAssertionReference
    );
    if (!target) {
      throw new Error(`TARGET_SNAPSHOT_NOT_FOUND_FOR_RETRACTION: ${rItem.targetAssertionReference}`);
    }

    const rInput = {
      patientId,
      snapshotId: target.id,
      sourceType: rItem.sourceType,
      sourceReference: rItem.sourceReference,
      retractionReference: rItem.retractionReference,
      assertedAt: rItem.assertedAt,
      reasonCode: rItem.reasonCode,
    };
    const result = await internalRetractObservedApplicabilitySnapshot(tx, rInput);
    insertedRetractions.push(result.retraction);
  }

  return {
    snapshotCount: insertedSnapshots.length,
    retractionCount: insertedRetractions.length,
    success: true,
  };
}
