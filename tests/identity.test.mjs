import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeEmail } from '../packages/db/dist/index.js';

test('bounded email canonicalization preserves provider distinctions', () => {
  assert.equal(canonicalizeEmail(' \t\n\r\f\vAlice+TAG@Example.INVALID \t'), 'alice+tag@example.invalid');
  assert.equal(canonicalizeEmail('A.LICE@example.invalid'), 'a.lice@example.invalid');
  for (const value of ['', 'a@@b', 'a@', '@b', 'a b@example.invalid', 'é@example.invalid', '\u00a0a@b']) {
    assert.throws(() => canonicalizeEmail(value), /Invalid bounded email/);
  }
});
