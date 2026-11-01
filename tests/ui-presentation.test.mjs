import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const presentation = {};
new Function('exports', ts.transpileModule(readFileSync('apps/web/src/lib/presentation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(presentation);

test('presentation aliases only approved synthetic metadata and leaves session identity untouched', () => {
  const session = Object.freeze({ name: 'eh-m1-patient-a@example.invalid', role: 'PATIENT', mode: 'live' });
  assert.equal(presentation.accountName(session), 'Demo patient A');
  assert.equal(session.name, 'eh-m1-patient-a@example.invalid');
  assert.equal(session.role, 'PATIENT');
  const translated = [];
  const translate = key => { translated.push(key); return 'ترجمة توضيحية'; };
  assert.equal(presentation.presentationName('Synthetic Demo Patient A', translate), 'ترجمة توضيحية');
  for (const value of ['Real authored name', 'PRIVATE_CLINICAL_CANARY', 'Released', 'constructor', '__proto__']) {
    assert.equal(presentation.presentationName(value, translate), value);
  }
  assert.deepEqual(translated, ['Demo patient A']);
});

test('visit priority preserves source states and chronology without inferring terminal status', () => {
  const rows = [
    { state: 'CONSULTED', startAt: '2026-10-28T10:00:00Z' },
    { state: 'BOOKED', startAt: '2026-10-27T10:00:00Z' },
    { state: 'IN_CONSULTATION', startAt: '2026-10-28T11:00:00Z' },
    { state: 'BOOKED', startAt: '2026-10-29T10:00:00Z' },
  ].map(Object.freeze);
  const original = [...rows];
  const ordered = presentation.visitPriority(rows);
  assert.deepEqual(rows, original);
  assert.deepEqual(ordered.map(row => row.state), ['IN_CONSULTATION', 'BOOKED', 'BOOKED', 'CONSULTED']);
  assert.equal(ordered[1], rows[1], 'past BOOKED remains BOOKED; time does not invent no-show/close');
});
