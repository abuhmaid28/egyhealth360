import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALLOWLIST,
  APPLICATION,
  AUTH_LEDGER,
  HARNESS_BASE,
  authSetupProgram,
  buildComposeOverrideYaml,
  cleanupOwnedResources,
  rawHttpRequest,
} from '../scripts/test-ui-f06-auth-context.mjs';
import {
  DIAGNOSTIC_CASES,
  DIAGNOSTIC_PHASES,
  DIAGNOSTIC_PREDICATES,
  DiagnosticAssertionError,
  assertDatabaseWrites,
  assertIsolatedComposeConfig,
  assertLoopbackHttpUrl,
  assertObserverQuiescent,
  assertOwnedProject,
  cookieAttributes,
  createBudgetTracker,
  createObserverMetrics,
  finalizeSafeReceipt,
  inspectAuthResponse,
  parseOptions,
  scanSensitiveText,
  sha256Hex,
  summarizeBrowserCookieState,
} from '../scripts/support/f06-auth-context.mjs';

function makeAuthResponse(overrides = {}) {
  return {
    status: 403,
    headers: { 'cache-control': 'no-store' },
    text: JSON.stringify({ error: { code: 'AUTH_CSRF_INVALID', message: 'Request verification failed.' } }),
    elapsedMs: 12,
    ...overrides,
  };
}

test('pins exact historical application/harness and rejects unsafe CLI options or targets', () => {
  assert.equal(APPLICATION, '94f3b75476a43ac0118665aecf75a2ce471190b0');
  assert.equal(HARNESS_BASE, '781e92bffea26f79c5a89abab79158072383feda');
  assert.deepEqual(ALLOWLIST, [
    'scripts/support/f06-auth-context.mjs',
    'scripts/test-ui-f06-auth-context.mjs',
    'tests/ui-f06-auth-context.test.mjs',
  ]);
  assert.equal(parseOptions(['--evidence-dir', '/tmp/q1']).evidence, resolve('/tmp/q1'));
  for (const invalid of [
    [],
    ['--evidence-dir', 'relative/dir'],
    ['--origin', 'https://example.invalid'],
    ['--replay'],
    ['--full'],
    ['--evidence-dir', '/tmp/q1', '--evidence-dir', '/tmp/q2'],
    ['--evidence-dir', '/tmp/q1', '--chromium'],
  ]) {
    assert.throws(() => parseOptions(invalid));
  }
  assert.equal(assertLoopbackHttpUrl('http://localhost:3000').hostname, 'localhost');
  assert.equal(assertLoopbackHttpUrl('http://127.0.0.1:3001').hostname, '127.0.0.1');
  for (const badTarget of [
    'https://localhost:3000',
    'http://example.invalid:3000',
    'http://192.168.1.5:3000',
    'http://user:pass@localhost:3000',
    'http://localhost/no-port',
    'http://localhost:80/privileged-port',
  ]) {
    assert.throws(() => assertLoopbackHttpUrl(badTarget));
  }
});

test('auth setup worker and runner have zero path to clinical fixtures or full matrix', () => {
  const runnerSource = readFileSync('scripts/test-ui-f06-auth-context.mjs', 'utf8');
  assert.doesNotMatch(runnerSource, /from ['"][^'"]*f06-live-fixtures/);
  assert.doesNotMatch(runnerSource, /from ['"][^'"]*test-ui-live-topology/);

  const program = authSetupProgram();
  assert.match(program, /patientA/);
  assert.match(program, /patientB/);
  assert.doesNotMatch(program, /assignPatient|createOrganization|createConsultation|createBooking|DISABLE TRIGGER|ALTER TABLE/);
});

test('enforces unique owned project names and isolated tmpfs Compose config', () => {
  const validProject = 'eh203-q1-0123456789ab';
  assert.equal(assertOwnedProject(validProject), validProject);
  for (const badProject of ['', 'egyhealth360', 'eh124-e2-0123456789ab', 'eh203-q1-XYZ']) {
    assert.throws(() => assertOwnedProject(badProject), /INVALID_OWNED_PROJECT_NAME/);
  }
  const yaml = buildComposeOverrideYaml({ project: validProject, tag: `${validProject}:local`, apiPort: 23001, webPort: 23000 });
  assert.match(yaml, /EH203_PROJECT: eh203-q1-0123456789ab/);
  assert.match(yaml, /type: tmpfs/);

  const validConfig = {
    name: validProject,
    volumes: {},
    services: {
      postgres: { volumes: [{ type: 'tmpfs' }] },
      api: { build: { args: { EH_UI_API_ORIGIN: 'http://api:3001' } }, ports: [{ host_ip: '127.0.0.1', published: 23001 }] },
      web: { ports: [{ host_ip: '127.0.0.1', published: 23000 }] },
    },
  };
  assertIsolatedComposeConfig(validConfig, validProject, 23001, 23000);

  const foreignHostIp = JSON.parse(JSON.stringify(validConfig));
  foreignHostIp.services.web.ports[0].host_ip = '0.0.0.0';
  assert.throws(() => assertIsolatedComposeConfig(foreignHostIp, validProject, 23001, 23000));

  const exposedPg = JSON.parse(JSON.stringify(validConfig));
  exposedPg.services.postgres.ports = [{ host_ip: '127.0.0.1', published: 5432 }];
  assert.throws(() => assertIsolatedComposeConfig(exposedPg, validProject, 23001, 23000));
});

test('positive and negative/mutation HTTP projections classify cache, JSON shape, and status accurately', () => {
  const ok = inspectAuthResponse({
    caseId: 'CSRF_EMPTY',
    phase: 'R05/R06',
    endpoint: 'AUTH_LOGOUT',
    method: 'POST',
    callSite: 'rawLogout:CSRF_EMPTY',
    expectedStatus: 403,
    expectedCode: 'AUTH_CSRF_INVALID',
    response: makeAuthResponse(),
  });
  assert.equal(ok.noStore, true);
  assert.equal(ok.jsonParsed, true);
  assert.equal(ok.exactErrorKeys, true);
  assert.equal(ok.errorCode, 'AUTH_CSRF_INVALID');
  assert.deepEqual(ok.failedPredicates, []);

  // Mutation 1: missing Cache-Control: no-store
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'CSRF_EMPTY',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:CSRF_EMPTY',
      expectedStatus: 403,
      expectedCode: 'AUTH_CSRF_INVALID',
      response: makeAuthResponse({ headers: {} }),
    }),
    err => err instanceof DiagnosticAssertionError
      && err.projection.noStore === false
      && err.failedPredicates.includes('NO_STORE_HEADER'),
  );

  // Mutation 2: malformed non-JSON upstream error body (must NOT crash with TypeError)
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ABSENT',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ABSENT',
      expectedStatus: 401,
      expectedCode: 'AUTH_UNAUTHENTICATED',
      expectClearedCookie: true,
      response: { status: 502, headers: {}, text: 'Bad Gateway', elapsedMs: 5 },
    }),
    err => err instanceof DiagnosticAssertionError
      && err.projection.actualStatus === 502
      && err.projection.jsonParsed === false
      && err.projection.noStore === false
      && err.projection.scanCoverage.scanned === true
      && err.failedPredicates.includes('STATUS_MATCH')
      && err.failedPredicates.includes('JSON_PARSED'),
  );

  // Mutation 3: extra JSON key in error envelope (e.g. Nest { statusCode, message, error })
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'CSRF_MALFORMED',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:CSRF_MALFORMED',
      expectedStatus: 403,
      expectedCode: 'AUTH_CSRF_INVALID',
      response: makeAuthResponse({
        text: JSON.stringify({ error: { code: 'AUTH_CSRF_INVALID', message: 'fail', extra: 'bad' } }),
      }),
    }),
    err => err instanceof DiagnosticAssertionError
      && err.projection.exactErrorKeys === false
      && err.failedPredicates.includes('ERROR_EXACT_KEYS'),
  );

  // Mutation 4: non-allowlisted error code is redacted to NON_ALLOWLISTED
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'CSRF_OLD',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:CSRF_OLD',
      expectedStatus: 403,
      expectedCode: 'AUTH_CSRF_INVALID',
      response: makeAuthResponse({
        text: JSON.stringify({ error: { code: 'RAW_INTERNAL_LEAK', message: 'fail' } }),
      }),
    }),
    err => err instanceof DiagnosticAssertionError
      && err.projection.errorCode === 'NON_ALLOWLISTED'
      && err.failedPredicates.includes('ERROR_CODE_MATCH'),
  );

  // Positive 204 logout and negative non-empty 204 body / missing cleared cookie
  const logout204 = inspectAuthResponse({
    caseId: 'LOGOUT_VALID_B',
    phase: 'R05/R06',
    endpoint: 'AUTH_LOGOUT',
    method: 'POST',
    callSite: 'rawLogout:LOGOUT_VALID_B',
    expectedStatus: 204,
    expectClearedCookie: true,
    expectEmptyBody: true,
    response: {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'set-cookie': 'eh_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      },
      text: '',
      elapsedMs: 4,
    },
  });
  assert.equal(logout204.emptyBody, true);
  assert.equal(logout204.setCookieCleared, true);

  assert.throws(
    () => inspectAuthResponse({
      caseId: 'LOGOUT_VALID_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:LOGOUT_VALID_B',
      expectedStatus: 204,
      expectClearedCookie: true,
      expectEmptyBody: true,
      response: { status: 204, headers: { 'cache-control': 'no-store' }, text: 'unexpected', elapsedMs: 4 },
    }),
    err => err instanceof DiagnosticAssertionError
      && err.failedPredicates.includes('EMPTY_BODY')
      && err.failedPredicates.includes('SET_COOKIE_PRESENT'),
  );
});

test('scans response BEFORE failing and prevents secret/canary leaks in exceptions and receipts', () => {
  const canaryToken = 'CANARY_SESSION_TOKEN_VALUE_12345';
  const canaryCsrf = 'CANARY_CSRF_SECRET_98765';
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_UNKNOWN',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_UNKNOWN',
      expectedStatus: 401,
      expectedCode: 'AUTH_UNAUTHENTICATED',
      response: {
        status: 500,
        headers: {},
        text: `Crash: postgresql://user:pass@postgres:5432/db token=${canaryToken} csrf=${canaryCsrf}`,
      },
      secretMarkers: [canaryToken, canaryCsrf],
    }),
    err => {
      assert.ok(err instanceof DiagnosticAssertionError);
      assert.equal(err.projection.scanCoverage.scanned, true);
      assert.equal(err.projection.scanCoverage.leaksDetected > 0, true);
      assert.ok(err.failedPredicates.includes('PRIVACY_CLEAN'));
      assert.ok(err.failedPredicates.includes('DRIVER_PATTERN_ABSENT'));
      const dumped = JSON.stringify({ message: err.message, projection: err.projection });
      assert.equal(dumped.includes(canaryToken), false);
      assert.equal(dumped.includes(canaryCsrf), false);
      assert.equal(dumped.includes('postgresql://'), false);
      return true;
    },
  );

  const leakyReceipt = { result: 'PASS', leaked: canaryToken };
  assert.throws(() => finalizeSafeReceipt(leakyReceipt, [canaryToken]), /RECEIPT_PRIVACY_VIOLATION/);
  const cleanReceipt = finalizeSafeReceipt({ result: 'FAIL', cases: DIAGNOSTIC_CASES.length }, [canaryToken]);
  assert.equal(cleanReceipt.scan.clean, true);
  assert.match(cleanReceipt.receiptSha256, /^[a-f0-9]{64}$/);
});

test('enforces request budgets, unexpected DB writes, observer quiescence, and cookie boolean summary', () => {
  const budget = createBudgetTracker(AUTH_LEDGER);
  assert.equal(budget.recordIdentity(), 1);
  assert.equal(budget.recordIdentity(), 2);
  assert.throws(() => budget.recordIdentity(), /IDENTITY_BUDGET_EXCEEDED/);
  for (let i = 0; i < AUTH_LEDGER.loginMaximum; i++) budget.recordAuthRequest('login');
  assert.throws(() => budget.recordAuthRequest('login'), /AUTH_LOGIN_BUDGET_EXCEEDED/);
  for (let i = 0; i < AUTH_LEDGER.logoutMaximum; i++) budget.recordAuthRequest('logout');
  assert.throws(() => budget.recordAuthRequest('logout'), /AUTH_LOGOUT_BUDGET_EXCEEDED/);

  const before = { hashes: { users: 'h1', sessions: 's1', audit_logs: 'a1', consultations: 'c1' }, audits: { AUTH_LOGIN: 1 }, unsafeAudit: 0 };
  const validAuthAfter = { hashes: { users: 'h1', sessions: 's2', audit_logs: 'a2', consultations: 'c1' }, audits: { AUTH_LOGIN: 2 }, unsafeAudit: 0 };
  assertDatabaseWrites(before, validAuthAfter, { allowAuthMutations: true });
  assert.throws(() => assertDatabaseWrites(before, validAuthAfter, { allowAuthMutations: false }), /UNEXPECTED_DATABASE_WRITE/);

  const clinicalWrite = { hashes: { users: 'h1', sessions: 's2', audit_logs: 'a2', consultations: 'c2' }, audits: { AUTH_LOGIN: 2 }, unsafeAudit: 0 };
  assert.throws(() => assertDatabaseWrites(before, clinicalWrite, { allowAuthMutations: true }), /UNEXPECTED_DATABASE_WRITE/);
  const unexpectedAudit = { hashes: { users: 'h1', sessions: 's2', audit_logs: 'a2', consultations: 'c1' }, audits: { AUTH_LOGIN: 1, CLINICAL_WRITE: 1 }, unsafeAudit: 0 };
  assert.throws(() => assertDatabaseWrites(before, unexpectedAudit, { allowAuthMutations: true }), /UNEXPECTED_AUDIT_ACTION/);

  const metrics = createObserverMetrics();
  metrics.drainsStarted = 2;
  metrics.drainsCompleted = 2;
  metrics.scansStarted = 2;
  metrics.scansCompleted = 2;
  assertObserverQuiescent(metrics, { inflight: 0, drains: 0, scans: 0 });
  assert.throws(() => assertObserverQuiescent({ ...metrics, drainErrors: 1 }), /OBSERVER_DRAIN_ERRORS/);

  const secretCookie = 'SECRET_COOKIE_BYTES_ABC';
  const digest = sha256Hex(secretCookie);
  const summary = summarizeBrowserCookieState([{ name: 'eh_session', value: secretCookie }], digest);
  assert.deepEqual(summary, { present: true, cleared: false, matchesCurrentSession: true, count: 1 });
  assert.equal(JSON.stringify(summary).includes(secretCookie), false);
  assert.deepEqual(summarizeBrowserCookieState([], digest), { present: false, cleared: true, matchesCurrentSession: false, count: 0 });
  assert.equal(cookieAttributes('eh_session=SECRET; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800').maxAge, 28800);
  assert.ok(DIAGNOSTIC_PHASES.includes('R05/R06'));
  assert.ok(DIAGNOSTIC_PREDICATES.includes('OBSERVER_QUIESCENT'));
});

test('cleanup fails closed on leftover resources or browser close failure, and rawHttpRequest enforces loopback', async () => {
  const dirtyR13 = await cleanupOwnedResources({
    browser: { async close() { throw new Error('close failed'); } },
    compose: ['compose', '--project-name', 'eh203-q1-0123456789ab'],
    docker: () => '',
    listResources: kind => (kind === 'container' ? ['leftover-id'] : []),
    project: 'eh203-q1-0123456789ab',
    imageBuilt: true,
    ports: [],
  });
  assert.equal(dirtyR13.result, 'FAIL');

  const cleanR13 = await cleanupOwnedResources({
    browser: { async close() {} },
    compose: ['compose', '--project-name', 'eh203-q1-0123456789ab'],
    docker: () => '',
    listResources: () => [],
    project: 'eh203-q1-0123456789ab',
    imageBuilt: true,
    ports: [],
  });
  assert.equal(cleanR13.result, 'PASS');
  assert.equal(cleanR13.browserClosed, true);

  await assert.rejects(() => rawHttpRequest('https://example.invalid:3000', '/api/v1/health'), /NON_HTTP_TARGET_REJECTED|FOREIGN_TARGET_REJECTED/);

  const server = createServer((req, res) => {
    res.statusCode = 403;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.end(Buffer.from(JSON.stringify({ error: { code: 'AUTH_CSRF_INVALID', message: 'Request verification failed.' } })));
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  try {
    const port = server.address().port;
    const raw = await rawHttpRequest(`http://127.0.0.1:${port}`, '/api/v1/auth/logout', { method: 'POST', body: '{}' });
    const projection = inspectAuthResponse({
      caseId: 'CSRF_ABSENT',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:CSRF_ABSENT',
      expectedStatus: 403,
      expectedCode: 'AUTH_CSRF_INVALID',
      response: raw,
    });
    assert.equal(projection.actualStatus, 403);
    assert.equal(projection.noStore, true);
    assert.equal(scanSensitiveText(raw.text).clean, true);
  } finally {
    await new Promise(resolveClose => server.close(resolveClose));
  }
});
