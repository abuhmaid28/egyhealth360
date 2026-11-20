import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePatientProfileId, evaluatePatientAccess } from '../apps/api/dist/authorization.js';

test('patient UUID v4 parser rejects alternate spellings and normalizes hex case', () => {
  const id = 'ab12cd34-1234-4567-89ab-abcdef123456';
  assert.equal(parsePatientProfileId(id.toUpperCase()), id);
  for (const value of [undefined, 12, ` ${id}`, `${id}\n`, id.replaceAll('-', ''), `{${id}}`, `urn:uuid:${id}`, id.replace('-4567-', '-1567-'), id.replace('-89ab-', '-79ab-'), '%61' + id.slice(1)]) assert.equal(parsePatientProfileId(value), null);
});

test('policy explicitly permits only consistent scoped evidence for the read action', () => {
  const profile = { id: 'ab12cd34-1234-4567-89ab-abcdef123456', displayName: 'Synthetic' };
  const evidence = { sessionValid: true, principalConsistent: true, profile };
  assert.deepEqual(evaluatePatientAccess('patient-profile:read', evidence), { kind: 'allowed', profile });
  for (const input of [{ ...evidence, principalConsistent: false }, { ...evidence, profile: null }]) assert.deepEqual(evaluatePatientAccess('patient-profile:read', input), { kind: 'denied' });
  assert.deepEqual(evaluatePatientAccess('unknown', evidence), { kind: 'denied' });
  assert.deepEqual(evaluatePatientAccess('patient-profile:read', { ...evidence, sessionValid: false }), { kind: 'unauthenticated' });
});
