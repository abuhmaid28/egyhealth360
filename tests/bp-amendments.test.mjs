import {beforeI2Slice5} from './support/openapi-baseline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createBpAmendmentPersistence, BP_EXCLUSION_REASONS } from '../packages/db/dist/index.js';

test('Issue31 strict command validation rejects authority, partial pairs, target ambiguity and unsafe arrays before I/O', async () => {
  const store = createBpAmendmentPersistence('postgresql://unused:unused@127.0.0.1:1/unused');
  const input = { patientId: randomUUID(), bpId: randomUUID(), operationId: randomUUID(), expectedState: 'UNEXCLUDED', reason: 'DATA_ENTRY_ERROR', duplicateOfBpId: null };
  const bad = promise => assert.rejects(promise, e => e.code === 'BP_AMENDMENT_INVALID');
  try {
    for (const extra of [{ actor: 'forged' }, { reason: 'OTHER' }, { expectedState: false }, { operationId: 'invalid' }, { replacement: {} }]) await bad(store.exclude({}, { ...input, ...extra }));
    const replacement = { systolic: 139, diastolic: 89, unit: 'mmHg', measuredAt: '2026-10-19T09:00:00.000Z' };
    for (const badPair of [{ ...replacement, systolic: '139' }, { ...replacement, diastolic: undefined }, { ...replacement, unit: 'kPa' }, { ...replacement, measuredAt: '2026-10-19T09:00:00.000001Z' }]) await bad(store.correct({}, { ...input, replacement: badPair }));
    const ids = [randomUUID()]; Object.defineProperty(ids, 0, { get() { throw new Error('getter must not execute'); } });
    for (const predecessorIds of [[input.bpId], [input.operationId, input.operationId], Array(1), ids, [randomUUID(), ...Array(100).fill(randomUUID())]]) await bad(store.restrictWrongPatient({}, { patientId: input.patientId, bpId: input.bpId, operationId: input.operationId, predecessorIds }));
    assert.ok(Object.isFrozen(BP_EXCLUSION_REASONS)); assert.equal(BP_EXCLUSION_REASONS.length, 8);
    await bad(store.getHistory({}, { patientId: input.patientId, bpId: input.bpId, actorUserId: input.operationId }));
    await bad(store.listEffective({}, { patientId: input.patientId, page: 1, pageSize: 10, includePrivate: true }));
  } finally { await store.close(); }
});

test('Issue31 preserves product/research boundary: no public mutation route, client export or clinical selector', async () => {
  const raw=await readFile('docs/openapi.json','utf8'),api=JSON.parse(beforeI2Slice5(raw));
  assert.deepEqual(Object.keys(JSON.parse(raw).paths).filter(path=>/privacy/.test(path)),['/api/v1/consultations/{consultationId}/documents/{documentId}/privacy-restrictions','/api/v1/consultations/{consultationId}/follow-up-intents/{intentId}/privacy-restrictions']);
  assert.ok(Object.keys(api.paths).every(path => !/amendment|privacy|exclusion|restatement/.test(path)));
  const source = await readFile('packages/db/src/bp-amendments.ts', 'utf8');
  assert.doesNotMatch(source, /CareAction|ClosureAssessment|TRUE_GAP|COMPLETED|groundTruth|eligible\s*:/);
  const index = await readFile('packages/db/src/index.ts', 'utf8');
  assert.doesNotMatch(index, /export\s*\{[^}]*PrismaClient|export\s*\{[^}]*evidenceTransactions/);
  const ddl = await readFile('packages/db/prisma/migrations/20261021000000_bp_correction_invalidation/migration.sql', 'utf8');
  assert.doesNotMatch(ddl, /UPDATE public\.blood_pressure_measurements|DELETE FROM public\.blood_pressure_measurements|ALTER TABLE public\.blood_pressure_measurements/);
});
