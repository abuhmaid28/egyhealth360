import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLICATION, options, cookieAttributes, leaks } from '../scripts/test-ui-live-topology.mjs';
import { LEDGER, request, program } from '../scripts/support/f06-live-fixtures.mjs';

test('E2 pins application source and rejects target/replay/ambiguous CLI inputs', () => {
  assert.equal(APPLICATION, '94f3b75476a43ac0118665aecf75a2ce471190b0');
  assert.equal(options(['--evidence-dir', '/tmp/e2']).evidence, '/tmp/e2');
  for (const args of [[], ['--evidence-dir', 'relative'], ['--origin', 'https://example.invalid'], ['--replay'], ['--evidence-dir', '/tmp/e2', '--evidence-dir', '/tmp/other'], ['--evidence-dir', '/tmp/e2', '--chromium']]) assert.throws(() => options(args));
});
test('cookie evidence strips values and retains development/production attributes', () => {
  const value = cookieAttributes('eh_session=SECRET; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800');
  assert.deepEqual(value, { name: 'eh_session', httpOnly: true, secure: false, sameSite: 'Lax', path: '/', domainPresent: false, maxAge: 28800 });
  assert.ok(!JSON.stringify(value).includes('SECRET'));
  assert.equal(cookieAttributes('__Host-eh_session=SECRET; Path=/; Secure; HttpOnly').secure, true);
});
test('privacy scanner detects hidden and accessible markers without recording values', () => {
  assert.equal(leaks('<input hidden value="CANARY">', ['CANARY', 'CANARY', undefined]), 1);
  assert.equal(leaks('{"name":"CANARY"}', ['CANARY']), 1);
  assert.equal(leaks('safe denial', ['CANARY']), 0);
});
test('fixture worker is bounded setup with real clock and no replay/guard bypass', () => {
  assert.equal(LEDGER.identities, 5); assert.equal(LEDGER.fixtureClose, 1);
  assert.equal(LEDGER.clinicalReplay, 0); assert.equal(LEDGER.clinicalReadMutations, 0);
  assert.throws(() => request('replay')); assert.throws(() => request('executeSQL'));
  assert.equal(JSON.parse(request('snapshot')).action, 'snapshot');
  assert.match(program(), /clock_timestamp/);
  assert.doesNotMatch(program(), /DISABLE TRIGGER|ALTER TABLE|assignPatient\(/);
});
