import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bootstrapSmoke } from '../packages/closure-engine/dist/index.js';
import { positiveInteger } from '../packages/config/dist/index.js';

test('engine import is deterministic and framework-independent', async () => {
  assert.equal(bootstrapSmoke('bootstrap'), 'bootstrap');
  assert.equal(bootstrapSmoke('bootstrap'), bootstrapSmoke('bootstrap'));
  const manifest = JSON.parse(await readFile(new URL('../packages/closure-engine/package.json', import.meta.url)));
  assert.deepEqual(manifest.dependencies ?? {}, {});
  const source = await readFile(new URL('../packages/closure-engine/src/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /(?:^|\n)\s*import\b|\brequire\s*\(|Date\.|Math\.random/);
});

test('configuration rejects unsafe polling values', () => {
  assert.equal(positiveInteger(undefined, 5000), 5000);
  assert.equal(positiveInteger('10', 5000), 10);
  for (const value of ['0', '-1', 'NaN', '1.2', '2147483648']) assert.throws(() => positiveInteger(value, 5000));
});
