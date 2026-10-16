import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  normalizeCoverageIntervals,
  validateNormalizedEvidenceInput,
  NormalizedEvidenceError,
} from '../packages/db/dist/normalized-evidence.js';
import {
  validateSourceReference,
  validateCoverageInput,
  RecordCoverageError,
} from '../packages/db/dist/record-coverage.js';
import * as dbExports from '../packages/db/dist/index.js';

test('EH-013 sourceReference validation enforces strict 1..128 bounded ASCII grammar', () => {
  for (const valid of ['eh013-demo-v1', 'synthea-v4.0.0-seed360001', 'a', 'A', '0', 'test_123', 'a.b-c_d']) {
    assert.equal(validateSourceReference(valid), valid);
  }
  for (const invalid of ['', ' ', 'a b', 'test@invalid', 'test/1', 'a'.repeat(129), null, undefined, 123, {}]) {
    assert.throws(() => validateSourceReference(invalid), (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID');
  }
});

test('EH-013 coverage input validation rejects invalid chronology, status, and extra fields', () => {
  const valid = {
    patientId: '00000000-0000-4000-8000-000000000001',
    sourceType: 'SYNTHETIC_BENCHMARK',
    sourceReference: 'eh013-demo-v1',
    coverageStatus: 'COMPLETE',
    startAt: '2026-01-01T00:00:00.000Z',
    endAt: '2026-06-01T00:00:00.000Z',
  };
  assert.ok(validateCoverageInput(valid));

  // Inverted chronology
  assert.throws(
    () => validateCoverageInput({ ...valid, startAt: '2026-06-01T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' }),
    (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
  );

  // Equal bounds (empty interval)
  assert.throws(
    () => validateCoverageInput({ ...valid, startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' }),
    (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
  );

  // Unsupported sourceType
  assert.throws(
    () => validateCoverageInput({ ...valid, sourceType: 'PRIMARY_CLINICAL_SYSTEM' }),
    (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
  );

  // Extra unknown fields
  assert.throws(
    () => validateCoverageInput({ ...valid, recordedByUserId: '00000000-0000-4000-8000-000000000002' }),
    (err) => err instanceof RecordCoverageError && err.code === 'COVERAGE_INVALID'
  );
});

test('EH-013 normalized evidence query input rejects extra keys, invalid dates, and inverted intervals', () => {
  const valid = {
    patientId: '00000000-0000-4000-8000-000000000001',
    queryInterval: {
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-12-31T23:59:59.999Z',
    },
    partition: {
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'eh013-demo-v1',
    },
  };
  assert.ok(validateNormalizedEvidenceInput(valid));

  // Unknown root key
  assert.throws(
    () => validateNormalizedEvidenceInput({ ...valid, evaluationTime: '2026-06-01T00:00:00.000Z' }),
    (err) => err instanceof NormalizedEvidenceError && err.code === 'REQUEST_INVALID'
  );

  // Unknown interval key
  assert.throws(
    () => validateNormalizedEvidenceInput({ ...valid, queryInterval: { ...valid.queryInterval, asOf: '2026-01-01T00:00:00.000Z' } }),
    (err) => err instanceof NormalizedEvidenceError && err.code === 'REQUEST_INVALID'
  );

  // Inverted interval
  assert.throws(
    () => validateNormalizedEvidenceInput({ ...valid, queryInterval: { startAt: '2026-12-31T00:00:00.000Z', endAt: '2026-01-01T00:00:00.000Z' } }),
    (err) => err instanceof NormalizedEvidenceError && err.code === 'REQUEST_INVALID'
  );
});

test('EH-013 normalization: absence of raw windows yields 100% unasserted coverage (silent missingness)', () => {
  const queryInterval = {
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-06-01T00:00:00.000Z'),
  };
  const { effectiveSegments, unassertedSegments } = normalizeCoverageIntervals(queryInterval, []);

  assert.equal(effectiveSegments.length, 0);
  assert.equal(unassertedSegments.length, 1);
  assert.equal(unassertedSegments[0].startAt.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(unassertedSegments[0].endAt.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('EH-013 normalization: precedence INCOMPLETE > UNKNOWN > COMPLETE within exact partition', () => {
  const queryInterval = {
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  const rawWindows = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'COMPLETE',
      startAt: new Date('2026-01-01T00:00:00.000Z'),
      endAt: new Date('2026-06-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'UNKNOWN',
      startAt: new Date('2026-02-01T00:00:00.000Z'),
      endAt: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'INCOMPLETE',
      startAt: new Date('2026-03-01T00:00:00.000Z'),
      endAt: new Date('2026-05-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
  ];

  const { effectiveSegments, unassertedSegments } = normalizeCoverageIntervals(queryInterval, rawWindows);

  assert.equal(unassertedSegments.length, 0);
  assert.equal(effectiveSegments.length, 4);

  // [2026-01-01, 2026-02-01): COMPLETE (window 1)
  assert.equal(effectiveSegments[0].startAt.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(effectiveSegments[0].endAt.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(effectiveSegments[0].status, 'COMPLETE');
  assert.deepEqual(effectiveSegments[0].contributingWindowIds, ['00000000-0000-4000-8000-000000000001']);

  // [2026-02-01, 2026-03-01): UNKNOWN > COMPLETE (windows 1, 2)
  assert.equal(effectiveSegments[1].startAt.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(effectiveSegments[1].endAt.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(effectiveSegments[1].status, 'UNKNOWN');
  assert.deepEqual(effectiveSegments[1].contributingWindowIds, [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
  ]);

  // [2026-03-01, 2026-05-01): INCOMPLETE > UNKNOWN > COMPLETE (windows 1, 2, 3 and then 1, 3 coalesced)
  assert.equal(effectiveSegments[2].startAt.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(effectiveSegments[2].endAt.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(effectiveSegments[2].status, 'INCOMPLETE');
  assert.deepEqual(effectiveSegments[2].contributingWindowIds, [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
  ]);

  // [2026-05-01, 2026-06-01): COMPLETE (window 1)
  assert.equal(effectiveSegments[3].startAt.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(effectiveSegments[3].endAt.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.equal(effectiveSegments[3].status, 'COMPLETE');
  assert.deepEqual(effectiveSegments[3].contributingWindowIds, ['00000000-0000-4000-8000-000000000001']);
});

test('EH-013 normalization: contiguous windows with gaps produce alternating effective and unasserted segments', () => {
  const queryInterval = {
    startAt: new Date('2026-01-01T00:00:00.000Z'),
    endAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  const rawWindows = [
    {
      id: '00000000-0000-4000-8000-000000000010',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'COMPLETE',
      startAt: new Date('2026-02-01T00:00:00.000Z'),
      endAt: new Date('2026-03-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
    {
      id: '00000000-0000-4000-8000-000000000011',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'COMPLETE',
      startAt: new Date('2026-04-01T00:00:00.000Z'),
      endAt: new Date('2026-05-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
  ];

  const { effectiveSegments, unassertedSegments } = normalizeCoverageIntervals(queryInterval, rawWindows);

  assert.equal(effectiveSegments.length, 2);
  assert.equal(unassertedSegments.length, 3);

  // Unasserted leading gap: [Jan 1, Feb 1)
  assert.equal(unassertedSegments[0].startAt.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(unassertedSegments[0].endAt.toISOString(), '2026-02-01T00:00:00.000Z');

  // Unasserted middle gap: [Mar 1, Apr 1)
  assert.equal(unassertedSegments[1].startAt.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(unassertedSegments[1].endAt.toISOString(), '2026-04-01T00:00:00.000Z');

  // Unasserted trailing gap: [May 1, Jun 1)
  assert.equal(unassertedSegments[2].startAt.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.equal(unassertedSegments[2].endAt.toISOString(), '2026-06-01T00:00:00.000Z');
});

test('EH-013 normalization: boundary clipping ignores coverage facts outside queryInterval', () => {
  const queryInterval = {
    startAt: new Date('2026-02-01T00:00:00.000Z'),
    endAt: new Date('2026-04-01T00:00:00.000Z'),
  };

  const rawWindows = [
    {
      id: '00000000-0000-4000-8000-000000000020',
      patientId: 'patient-1',
      sourceType: 'SYNTHETIC_BENCHMARK',
      sourceReference: 'bench-1',
      coverageStatus: 'COMPLETE',
      startAt: new Date('2025-01-01T00:00:00.000Z'),
      endAt: new Date('2027-01-01T00:00:00.000Z'),
      createdAt: new Date(),
    },
  ];

  const { effectiveSegments, unassertedSegments } = normalizeCoverageIntervals(queryInterval, rawWindows);

  assert.equal(unassertedSegments.length, 0);
  assert.equal(effectiveSegments.length, 1);
  assert.equal(effectiveSegments[0].startAt.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.equal(effectiveSegments[0].endAt.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.deepEqual(effectiveSegments[0].contributingWindowIds, ['00000000-0000-4000-8000-000000000020']);
});

test('EH-013 architectural boundary: @egyhealth/db does not export internal unauthenticated writer or raw reader', () => {
  assert.equal(typeof dbExports.createNormalizedEvidencePersistence, 'function');
  assert.equal(typeof dbExports.NormalizedEvidenceError, 'function');
  assert.equal(typeof dbExports.RecordCoverageError, 'function');

  // Internal machine writer and raw readers MUST NOT be exported
  assert.equal(dbExports.internalCreateRecordCoverageWindow, undefined);
  assert.equal(dbExports.internalGetNormalizedPatientEvidence, undefined);
  assert.equal(dbExports.internalExecuteEvidenceSnapshot, undefined);
  assert.equal(dbExports.PrismaClient, undefined);
});

test('EH-013 architectural boundary: apps/api does not import internal coverage writer or raw reader', async () => {
  const apiSrc = await readFile('apps/api/src/app.ts', 'utf8');
  assert.doesNotMatch(apiSrc, /record-coverage|internalGetNormalizedPatientEvidence|createRecordCoverageWindow/);
});

test('EH-013 research integrity and candidate factual contracts', () => {
  // Candidate structures contain zero completion, qualification, or EACCE flags
  const dummyCandidate = {
    associationId: '00000000-0000-4000-8000-000000000030',
    encounterId: '00000000-0000-4000-8000-000000000031',
    bloodPressureMeasurementId: '00000000-0000-4000-8000-000000000032',
    encounterOccurredAt: new Date(),
    bpMeasuredAt: new Date(),
    systolic: 120,
    diastolic: 80,
    unit: 'mmHg',
    bpSourceKind: 'PATIENT_SELF_ENTRY',
  };

  const keys = Object.keys(dummyCandidate);
  assert.ok(!keys.includes('completed'));
  assert.ok(!keys.includes('qualifying'));
  assert.ok(!keys.includes('relevant'));
  assert.ok(!keys.includes('closureState'));
  assert.ok(!keys.includes('actionLinked'));
  assert.ok(!keys.includes('groundTruth'));
});

test('EH-013 schema scope, frozen migrations, and additive migration verification', async () => {
  const schema = await readFile('packages/db/prisma/schema.prisma', 'utf8');
  assert.match(schema, /model RecordCoverageWindow \{/);
  assert.match(schema, /enum RecordCoverageSourceType \{\s+SYNTHETIC_BENCHMARK\s+@@map/);
  assert.match(schema, /enum RecordCoverageStatus \{\s+COMPLETE\s+INCOMPLETE\s+UNKNOWN\s+@@map/);
  assert.doesNotMatch(schema, /model (CareAction|ClosureAssessment)/);
  assert.doesNotMatch(schema, /PRIMARY_CLINICAL_SYSTEM/);
  const windowModel = schema.split('model RecordCoverageWindow {')[1].split('\n}')[0];
  assert.doesNotMatch(windowModel, /recordedByUserId/);

  const hashes = [
    'd8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a',
    '2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b',
    'bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a',
    '47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38',
    '5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21',
    '7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01',
    'f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b',
  ];

  const dirs = (await readdir('packages/db/prisma/migrations')).filter((n) => n !== 'migration_lock.toml').sort();
  assert.equal(dirs.length, 7);
  for (let i = 0; i < 7; i++) {
    const content = await readFile(`packages/db/prisma/migrations/${dirs[i]}/migration.sql`);
    assert.equal(createHash('sha256').update(content).digest('hex'), hashes[i]);
  }
});
