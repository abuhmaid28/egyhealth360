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
  buildDomScanPolicy,
  cookieAttributes,
  createBudgetTracker,
  createObserverMetrics,
  finalizeSafeReceipt,
  inspectAuthResponse,
  parseOptions,
  scanAuthorizedResponse,
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
      postgres: { volumes: [{ type: 'tmpfs', target: '/var/lib/postgresql' }] },
      api: { build: { args: { EH_UI_API_ORIGIN: 'http://api:3001' } }, ports: [{ host_ip: '127.0.0.1', published: 23001 }] },
      web: { ports: [{ host_ip: '127.0.0.1', published: 23000 }] },
      worker: {},
    },
  };
  assertIsolatedComposeConfig(validConfig, validProject, 23001, 23000);

  const foreignHostIp = JSON.parse(JSON.stringify(validConfig));
  foreignHostIp.services.web.ports[0].host_ip = '0.0.0.0';
  assert.throws(() => assertIsolatedComposeConfig(foreignHostIp, validProject, 23001, 23000));

  const exposedPg = JSON.parse(JSON.stringify(validConfig));
  exposedPg.services.postgres.ports = [{ host_ip: '127.0.0.1', published: 5432 }];
  assert.throws(() => assertIsolatedComposeConfig(exposedPg, validProject, 23001, 23000), /POSTGRES_PORT_PUBLICATION_FORBIDDEN/);

  const workerPorts = JSON.parse(JSON.stringify(validConfig));
  workerPorts.services.worker.ports = [{ host_ip: '127.0.0.1', published: 23002 }];
  assert.throws(() => assertIsolatedComposeConfig(workerPorts, validProject, 23001, 23000), /WORKER_PORT_PUBLICATION_FORBIDDEN/);

  const wrongPgMount = JSON.parse(JSON.stringify(validConfig));
  wrongPgMount.services.postgres.volumes = [{ type: 'tmpfs', target: '/tmp/pg' }];
  assert.throws(() => assertIsolatedComposeConfig(wrongPgMount, validProject, 23001, 23000), /POSTGRES_TMPFS_REQUIRED/);

  const extraPgMount = JSON.parse(JSON.stringify(validConfig));
  extraPgMount.services.postgres.volumes.push({ type: 'tmpfs', target: '/var/lib/postgresql/extra' });
  assert.throws(() => assertIsolatedComposeConfig(extraPgMount, validProject, 23001, 23000), /POSTGRES_TMPFS_REQUIRED/);

  const appMount = JSON.parse(JSON.stringify(validConfig));
  appMount.services.api.volumes = [{ type: 'bind', source: '/tmp', target: '/mnt' }];
  assert.throws(() => assertIsolatedComposeConfig(appMount, validProject, 23001, 23000), /APP_VOLUME_MOUNTS_FORBIDDEN/);

  const privilegedSvc = JSON.parse(JSON.stringify(validConfig));
  privilegedSvc.services.web.privileged = true;
  assert.throws(() => assertIsolatedComposeConfig(privilegedSvc, validProject, 23001, 23000), /PRIVILEGED_CONTAINER_FORBIDDEN/);

  const customNet = JSON.parse(JSON.stringify(validConfig));
  customNet.services.api.network_mode = 'host';
  assert.throws(() => assertIsolatedComposeConfig(customNet, validProject, 23001, 23000), /CUSTOM_NETWORK_MODE_FORBIDDEN/);
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

test('allows active actor auth/profile 200 payloads while failing closed on wrong actor, misplaced CSRF, or credentials', () => {
  const patientA = {
    id: '11111111-1111-4111-8111-111111111111',
    profileId: '22222222-2222-4222-8222-222222222222',
    email: 'patienta-0123456789ab@q1.example.invalid',
    displayName: 'Synthetic Q1 patientA 0123456789ab',
  };
  const patientB = {
    id: '33333333-3333-4333-8333-333333333333',
    profileId: '44444444-4444-4444-8444-444444444444',
    email: 'patientb-0123456789ab@q1.example.invalid',
    displayName: 'Synthetic Q1 patientB 0123456789ab',
  };
  const allUsers = { patientA, patientB };
  const allUserMarkers = Object.values(allUsers).flatMap(u => [u.id, u.profileId, u.email, u.displayName]);
  const csrfA = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const csrfB = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  const sessionSecret = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
  const pwHash = 'eh-pw-v1$argon2id$v=19$m=65536,t=3,p=1$s=aaaaaaaaaaaaaaaaaaaaaa$h=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const credentialSecrets = ['SYNTHETIC_PASSWORD_VALUE_XYZ', pwHash, sessionSecret];

  const loginBodyA = JSON.stringify({
    data: {
      user: { id: patientA.id, email: patientA.email, role: 'PATIENT' },
      session: { expiresAt: '2026-11-28T00:00:00.000Z' },
      csrfToken: csrfA,
    },
  });
  const loginProj = inspectAuthResponse({
    caseId: 'LOGIN_RAW_A',
    phase: 'R05/R06',
    endpoint: 'AUTH_LOGIN',
    method: 'POST',
    callSite: 'rawLogin:patientA',
    expectedStatus: 200,
    expectSetCookie: true,
    response: {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        'set-cookie': `eh_session=${sessionSecret}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
      },
      text: loginBodyA,
    },
    activeActor: patientA,
    allUserMarkers,
    credentialSecrets,
    allowFreshCsrf: true,
  });
  assert.equal(loginProj.successShapeValid, true);
  assert.equal(loginProj.actorIdentityMatch, true);
  assert.equal(loginProj.csrfTokenMatch, true);
  assert.equal(loginProj.scanCoverage.leaksDetected, 0);

  const meBodyB = JSON.stringify({
    data: {
      user: { id: patientB.id, email: patientB.email, role: 'PATIENT' },
      session: { expiresAt: '2026-11-28T00:00:00.000Z' },
      csrfToken: csrfB,
    },
  });
  const meProjB = inspectAuthResponse({
    caseId: 'ME_ACTIVE_B',
    phase: 'R05/R06',
    endpoint: 'AUTH_ME',
    method: 'GET',
    callSite: 'meRaw:ME_ACTIVE_B',
    expectedStatus: 200,
    expectNoSetCookie: true,
    response: { status: 200, headers: { 'cache-control': 'no-store' }, text: meBodyB },
    activeActor: patientB,
    allUserMarkers,
    credentialSecrets,
    staleCsrfTokens: [csrfA],
    currentCsrfToken: csrfB,
  });
  assert.equal(meProjB.successShapeValid, true);
  assert.equal(meProjB.actorIdentityMatch, true);
  assert.equal(meProjB.csrfTokenMatch, true);

  // Positive ME_PROFILE for active patientA
  const profileScanA = scanAuthorizedResponse({
    text: JSON.stringify({ data: { id: patientA.profileId, displayName: patientA.displayName, dateOfBirth: null, sex: null } }),
    status: 200,
    endpoint: 'ME_PROFILE',
    method: 'GET',
    activeActor: patientA,
    allUserMarkers,
    credentialSecrets,
    staleCsrfTokens: [csrfA],
    currentCsrfToken: csrfB,
  });
  assert.equal(profileScanA.scan.clean, true);
  assert.equal(profileScanA.shapeValid, true);
  assert.equal(profileScanA.actorMatch, true);

  // Negative 1: unexpected Set-Cookie on ME_ACTIVE_B fails SET_COOKIE_ABSENT
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      expectNoSetCookie: true,
      response: {
        status: 200,
        headers: { 'cache-control': 'no-store', 'set-cookie': `eh_session=${sessionSecret}; Path=/; HttpOnly` },
        text: meBodyB,
      },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError && err.failedPredicates.includes('SET_COOKIE_ABSENT'),
  );

  // Negative 2: wrong actor (patientA returned when patientB expected)
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      response: { status: 200, headers: { 'cache-control': 'no-store' }, text: loginBodyA },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      staleCsrfTokens: [csrfA],
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError
      && err.failedPredicates.includes('ACTOR_IDENTITY_MATCH')
      && err.failedPredicates.includes('CSRF_TOKEN_MATCH')
      && err.failedPredicates.includes('PRIVACY_CLEAN'),
  );

  // Negative 3: stale CSRF returned on ME_ACTIVE_B
  const staleMeBody = JSON.stringify({
    data: {
      user: { id: patientB.id, email: patientB.email, role: 'PATIENT' },
      session: { expiresAt: '2026-11-28T00:00:00.000Z' },
      csrfToken: csrfA,
    },
  });
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      response: { status: 200, headers: { 'cache-control': 'no-store' }, text: staleMeBody },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      staleCsrfTokens: [csrfA],
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError
      && err.failedPredicates.includes('CSRF_TOKEN_MATCH')
      && err.failedPredicates.includes('PRIVACY_CLEAN'),
  );

  // Negative 4: current CSRF placed in extra JSON field or misplaced in session/ME_PROFILE/OTHER_API/error
  const extraFieldCsrf = JSON.stringify({
    data: {
      user: { id: patientB.id, email: patientB.email, role: 'PATIENT' },
      session: { expiresAt: '2026-11-28T00:00:00.000Z' },
      csrfToken: csrfB,
      extra: csrfB,
    },
  });
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      response: { status: 200, headers: { 'cache-control': 'no-store' }, text: extraFieldCsrf },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError
      && err.failedPredicates.includes('SUCCESS_SHAPE_VALID')
      && err.failedPredicates.includes('PRIVACY_CLEAN'),
  );

  const profileLeakingCsrf = scanAuthorizedResponse({
    text: JSON.stringify({ data: { id: patientA.profileId, displayName: patientA.displayName, dateOfBirth: null, sex: csrfB } }),
    status: 200,
    endpoint: 'ME_PROFILE',
    method: 'GET',
    activeActor: patientA,
    allUserMarkers,
    credentialSecrets,
    currentCsrfToken: csrfB,
  });
  assert.equal(profileLeakingCsrf.scan.clean, false);

  const unrelatedApiLeak = scanAuthorizedResponse({
    text: JSON.stringify({ data: [{ patientEmail: patientA.email, csrf: csrfB }] }),
    status: 200,
    endpoint: 'OTHER_API',
    method: 'GET',
    activeActor: patientA,
    allUserMarkers,
    credentialSecrets,
    currentCsrfToken: csrfB,
  });
  assert.equal(unrelatedApiLeak.scan.clean, false);
  assert.equal(unrelatedApiLeak.successScoped, false);

  // Negative 5: credential/session/active-actor leak in 4xx/5xx error or inside 200 expiresAt fails closed
  const credInSuccess = JSON.stringify({
    data: {
      user: { id: patientB.id, email: patientB.email, role: 'PATIENT' },
      session: { expiresAt: sessionSecret },
      csrfToken: csrfB,
    },
  });
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      response: { status: 200, headers: { 'cache-control': 'no-store' }, text: credInSuccess },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError && err.failedPredicates.includes('PRIVACY_CLEAN'),
  );

  assert.throws(
    () => inspectAuthResponse({
      caseId: 'CSRF_ABSENT',
      phase: 'R05/R06',
      endpoint: 'AUTH_LOGOUT',
      method: 'POST',
      callSite: 'rawLogout:CSRF_ABSENT',
      expectedStatus: 403,
      expectedCode: 'AUTH_CSRF_INVALID',
      response: {
        status: 403,
        headers: { 'cache-control': 'no-store' },
        text: JSON.stringify({ error: { code: 'AUTH_CSRF_INVALID', message: `bad ${patientB.email} ${csrfB}` } }),
      },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets,
      currentCsrfToken: csrfB,
    }),
    err => err instanceof DiagnosticAssertionError && err.failedPredicates.includes('PRIVACY_CLEAN'),
  );
});

test('enforces DOM/AX/visible/storage/cookie active-actor boundaries and JSON-body correspondence', () => {
  const patientA = {
    id: '11111111-1111-4111-8111-111111111111',
    profileId: '22222222-2222-4222-8222-222222222222',
    email: 'patienta-0123456789ab@q1.example.invalid',
    displayName: 'Synthetic Q1 patientA 0123456789ab',
  };
  const patientB = {
    id: '33333333-3333-4333-8333-333333333333',
    profileId: '44444444-4444-4444-8444-444444444444',
    email: 'patientb-0123456789ab@q1.example.invalid',
    displayName: 'Synthetic Q1 patientB 0123456789ab',
  };
  const csrfA = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const staleCsrf = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
  const sessionSecret = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
  const policy = buildDomScanPolicy({
    activeActor: patientA,
    allUsers: { patientA, patientB },
    runtimeSecrets: ['SYNTHETIC_PW', sessionSecret, csrfA],
    staleCsrfTokens: [staleCsrf],
  });

  // Permitted own DOM (email, displayName, CSS class "stack", English "Update")
  const okDom = `<div class="stack"><p>Update status</p><bdi>${patientA.email}</bdi><span>${patientA.displayName}</span></div>`;
  assert.equal(scanSensitiveText(okDom, policy.domMarkers, policy.patterns).clean, true);

  // Forbidden in DOM: active id, active profileId, other actor fields, current/stale CSRF, session secret
  for (const leakedValue of [patientA.id, patientA.profileId, patientB.email, patientB.displayName, csrfA, staleCsrf, sessionSecret, 'postgresql://u:p@postgres:5432/db']) {
    assert.equal(scanSensitiveText(`<div class="stack">${leakedValue}</div>`, policy.domMarkers, policy.patterns).clean, false);
  }

  // Forbidden in storage: ALL user markers including activeActor.email & displayName, plus CSRF
  for (const leakedStorage of [patientA.email, patientA.displayName, patientA.id, patientB.id, csrfA]) {
    assert.equal(scanSensitiveText(JSON.stringify({ local: { k: leakedStorage } }), policy.storageMarkers, policy.patterns).clean, false);
  }

  // Supplied response.json cannot diverge from response.text to bypass byte scan
  const allUserMarkers = [patientA, patientB].flatMap(u => [u.id, u.profileId, u.email, u.displayName]);
  assert.throws(
    () => inspectAuthResponse({
      caseId: 'ME_ACTIVE_B',
      phase: 'R05/R06',
      endpoint: 'AUTH_ME',
      method: 'GET',
      callSite: 'meRaw:ME_ACTIVE_B',
      expectedStatus: 200,
      response: {
        status: 200,
        headers: { 'cache-control': 'no-store' },
        text: '',
        json: { data: { user: { id: patientB.id, email: patientB.email, role: 'PATIENT' }, session: { expiresAt: '2026-11-28T00:00:00.000Z' }, csrfToken: csrfA } },
      },
      activeActor: patientB,
      allUserMarkers,
      credentialSecrets: [sessionSecret],
      currentCsrfToken: csrfA,
    }),
    err => err instanceof DiagnosticAssertionError
      && err.failedPredicates.includes('JSON_BODY_MATCH')
      && err.failedPredicates.includes('JSON_PARSED'),
  );
});
