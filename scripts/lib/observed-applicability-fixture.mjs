import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  internalInsertObservedApplicabilitySnapshot,
  internalRetractObservedApplicabilitySnapshot,
} from '../../packages/db/dist/observed-applicability.js';
import {
  exactApplicabilityKeys,
  validateInsertSnapshotInput,
  validateRetractSnapshotInput,
  parseApplicabilityReference,
} from '../../packages/db/dist/observed-applicability-values.js';

const DEFAULT_FIXTURE_PATH = fileURLToPath(
  new URL('../../tests/fixtures/eh015-observed-input-v1.json', import.meta.url)
);
const SNAPSHOT_KEYS = [
  'sourceType', 'sourceReference', 'assertionReference', 'effectiveAt', 'assertedAt',
  'ageAssertionState', 'ageYearsAtAssessment', 'pregnancyStatus',
  'hypertensionStatus', 'cvdStatus', 'diabetesStatus', 'ckdStatus',
];
const RETRACTION_KEYS = [
  'sourceType', 'sourceReference', 'targetAssertionReference',
  'retractionReference', 'assertedAt', 'reasonCode',
];
const VALIDATION_ID = '00000000-0000-4000-8000-000000000001';

function copyItem(item, keys) {
  exactApplicabilityKeys(item, keys);
  return Object.fromEntries(keys.map(key => [key, item[key]]));
}

export function mapObservedApplicabilityFixtureItem(item, patientId) {
  return { patientId, ...copyItem(item, SNAPSHOT_KEYS) };
}

// Loading and isolated-test injection share exactly this validator. Copy every
// scalar before persistence awaits; neither extras nor accessors are discarded.
export function validateObservedApplicabilityFixture(raw) {
  exactApplicabilityKeys(raw, ['manifestVersion', 'logicalPatient', 'snapshots', 'retractions']);
  if (raw.manifestVersion !== 'eh015-observed-input-v1' || raw.logicalPatient !== 'patient-a'
      || !Array.isArray(raw.snapshots) || !Array.isArray(raw.retractions)) {
    throw new Error('INVALID_OBSERVED_FIXTURE');
  }
  const snapshots = raw.snapshots.map(item => {
    const copy = copyItem(item, SNAPSHOT_KEYS);
    validateInsertSnapshotInput(mapObservedApplicabilityFixtureItem(copy, VALIDATION_ID));
    return copy;
  });
  const retractions = raw.retractions.map(item => {
    const copy = copyItem(item, RETRACTION_KEYS);
    parseApplicabilityReference(copy.targetAssertionReference, 'assertionReference');
    validateRetractSnapshotInput({
      patientId: VALIDATION_ID, snapshotId: VALIDATION_ID,
      sourceType: copy.sourceType, sourceReference: copy.sourceReference,
      retractionReference: copy.retractionReference, assertedAt: copy.assertedAt,
      reasonCode: copy.reasonCode,
    });
    return copy;
  });
  return { manifestVersion: raw.manifestVersion, logicalPatient: raw.logicalPatient, snapshots, retractions };
}

export async function loadObservedApplicabilityFixture(filePath = DEFAULT_FIXTURE_PATH) {
  return validateObservedApplicabilityFixture(JSON.parse(await readFile(filePath, 'utf8')));
}

export async function applyObservedApplicabilityFixture(tx, patientId, customFixture = null) {
  const fixture = validateObservedApplicabilityFixture(customFixture ?? (await loadObservedApplicabilityFixture()));
  const insertedSnapshots = [];
  for (const item of fixture.snapshots) {
    const result = await internalInsertObservedApplicabilitySnapshot(tx, mapObservedApplicabilityFixtureItem(item, patientId));
    insertedSnapshots.push(result.snapshot);
  }
  // Lock all existing withdrawal targets in canonical order, shared with helpers.
  const targets = fixture.retractions.map(item => {
    const target = insertedSnapshots.find(s => s.patientId === patientId
      && s.sourceType === item.sourceType && s.sourceReference === item.sourceReference
      && s.assertionReference === item.targetAssertionReference);
    if (!target) throw new Error('INVALID_OBSERVED_FIXTURE_TARGET');
    return { item, target };
  }).sort((a, b) => a.target.id < b.target.id ? -1 : a.target.id > b.target.id ? 1 : 0);
  for (const { target } of targets) {
    await tx.$queryRaw`SELECT id FROM public.observed_applicability_snapshots WHERE id=${target.id}::uuid FOR UPDATE`;
  }
  for (const { item, target } of targets) {
    await internalRetractObservedApplicabilitySnapshot(tx, {
      patientId, snapshotId: target.id, sourceType: item.sourceType,
      sourceReference: item.sourceReference, retractionReference: item.retractionReference,
      assertedAt: item.assertedAt, reasonCode: item.reasonCode,
    });
  }
  return { snapshotCount: insertedSnapshots.length, retractionCount: targets.length, success: true };
}

// The sole runtime write entry; tests use this same bounded transaction path.
export function applyObservedApplicabilityFixtureTransaction(client, patientId, fixture = null) {
  return client.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
    await tx.$executeRaw`SET LOCAL statement_timeout='10s'`;
    return applyObservedApplicabilityFixture(tx, patientId, fixture);
  }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 });
}
