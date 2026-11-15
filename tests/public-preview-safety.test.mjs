import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivateIpv4,
  isPrivateHostnameOrIp,
  isIpLiteral,
  sanitizeUrlForReport,
  validatePreviewUrl,
  scanBodyForLeaks,
  evaluateSecurityHeaders,
  safeGet,
  inspectLocalAssets,
  runPreviewSafetyCheck,
} from '../scripts/lib/public-preview-safety.mjs';
import { parseCliArgs, formatTerminalReport } from '../scripts/verify-public-preview.mjs';

test('isPrivateIpv4 correctly identifies loopback and private ranges', () => {
  assert.equal(isPrivateIpv4('127.0.0.1'), true);
  assert.equal(isPrivateIpv4('127.255.255.255'), true);
  assert.equal(isPrivateIpv4('10.0.0.1'), true);
  assert.equal(isPrivateIpv4('172.16.0.1'), true);
  assert.equal(isPrivateIpv4('172.31.255.255'), true);
  assert.equal(isPrivateIpv4('192.168.1.1'), true);
  assert.equal(isPrivateIpv4('169.254.1.1'), true);
  assert.equal(isPrivateIpv4('0.0.0.0'), true);

  // Public IPs
  assert.equal(isPrivateIpv4('8.8.8.8'), false);
  assert.equal(isPrivateIpv4('1.1.1.1'), false);
  assert.equal(isPrivateIpv4('172.15.0.1'), false);
  assert.equal(isPrivateIpv4('172.32.0.1'), false);
  assert.equal(isPrivateIpv4('not.an.ip'), false);
});

test('isPrivateHostnameOrIp handles hostnames and IPv6', () => {
  assert.equal(isPrivateHostnameOrIp('localhost'), true);
  assert.equal(isPrivateHostnameOrIp('sub.localhost'), true);
  assert.equal(isPrivateHostnameOrIp('app.local'), true);
  assert.equal(isPrivateHostnameOrIp('service.internal'), true);
  assert.equal(isPrivateHostnameOrIp('::1'), true);
  assert.equal(isPrivateHostnameOrIp('[::1]'), true);
  assert.equal(isPrivateHostnameOrIp('fc00::1'), true);
  assert.equal(isPrivateHostnameOrIp('fe80::1'), true);
  assert.equal(isPrivateHostnameOrIp('::ffff:127.0.0.1'), true);

  // Public hostnames
  assert.equal(isPrivateHostnameOrIp('egyhealth360.vercel.app'), false);
  assert.equal(isPrivateHostnameOrIp('preview-eh360.example.com'), false);
});

test('isIpLiteral detects IPv4 and IPv6 literals', () => {
  assert.equal(isIpLiteral('127.0.0.1'), true);
  assert.equal(isIpLiteral('93.184.216.34'), true);
  assert.equal(isIpLiteral('::1'), true);
  assert.equal(isIpLiteral('[2001:db8::1]'), true);
  assert.equal(isIpLiteral('preview.vercel.app'), false);
  assert.equal(isIpLiteral('localhost'), false);
});

test('Review Finding 1: validatePreviewUrl restricts ports to 443, enforces *.vercel.app, and blocks SSRF/IPs', () => {
  // Valid HTTPS on default port or port 443
  const valid = validatePreviewUrl('https://preview-123.vercel.app');
  assert.equal(valid.origin, 'https://preview-123.vercel.app');

  const validPort443 = validatePreviewUrl('https://preview-123.vercel.app:443');
  assert.equal(validPort443.origin, 'https://preview-123.vercel.app');

  // Disallowed ports in public mode
  assert.throws(() => validatePreviewUrl('https://preview-123.vercel.app:3000'), /DISALLOWED_PORT/);
  assert.throws(() => validatePreviewUrl('https://preview-123.vercel.app:3001'), /DISALLOWED_PORT/);
  assert.throws(() => validatePreviewUrl('https://preview-123.vercel.app:8080'), /DISALLOWED_PORT/);
  assert.throws(() => validatePreviewUrl('https://preview-123.vercel.app:80'), /DISALLOWED_PORT/);

  // Rejects raw IP literals
  assert.throws(() => validatePreviewUrl('https://93.184.216.34'), /IP_HOSTNAME_FORBIDDEN/);
  assert.throws(() => validatePreviewUrl('https://127.0.0.1'), /IP_HOSTNAME_FORBIDDEN/);
  assert.throws(() => validatePreviewUrl('https://[::1]'), /IP_HOSTNAME_FORBIDDEN/);

  // Rejects loopback & private names
  assert.throws(() => validatePreviewUrl('https://localhost'), /SSRF_PROHIBITED/);
  assert.throws(() => validatePreviewUrl('https://app.local'), /SSRF_PROHIBITED/);
  assert.throws(() => validatePreviewUrl('https://metadata.internal'), /SSRF_PROHIBITED/);

  // Rejects non-vercel domain in public mode
  assert.throws(() => validatePreviewUrl('https://attacker.com'), /UNTRUSTED_PREVIEW_DOMAIN/);
  assert.throws(() => validatePreviewUrl('https://example.com'), /UNTRUSTED_PREVIEW_DOMAIN/);
  assert.throws(() => validatePreviewUrl('https://evil-vercel.com'), /UNTRUSTED_PREVIEW_DOMAIN/);
  assert.throws(() => validatePreviewUrl('https://preview.vercel.app.attacker.com'), /UNTRUSTED_PREVIEW_DOMAIN/);

  // Rejects non-HTTPS protocol
  assert.throws(() => validatePreviewUrl('http://preview.vercel.app'), /UNSAFE_PROTOCOL/);
  assert.throws(() => validatePreviewUrl('ftp://preview.vercel.app'), /UNSAFE_PROTOCOL/);

  // Rejects embedded credentials
  assert.throws(() => validatePreviewUrl('https://admin:secret@preview.vercel.app'), /CREDENTIALS_FORBIDDEN/);

  // Test escape hatch
  const testUrl = validatePreviewUrl('http://127.0.0.1:3000', { allowTestHttp: true, allowAnyPathInTest: true });
  assert.equal(testUrl.origin, 'http://127.0.0.1:3000');
});

test('Review Finding 2: reject cross-origin redirects, unexpected paths, queries, and fragments', async () => {
  // Queries and fragments rejected on target URL
  assert.throws(() => validatePreviewUrl('https://preview.vercel.app/?secret=token'), /QUERY_PARAMETERS_FORBIDDEN/);
  assert.throws(() => validatePreviewUrl('https://preview.vercel.app/#anchor'), /FRAGMENT_FORBIDDEN/);

  // Unapproved paths rejected
  assert.throws(() => validatePreviewUrl('https://preview.vercel.app/admin'), /DISALLOWED_PATH/);
  assert.throws(() => validatePreviewUrl('https://preview.vercel.app/users/profile'), /DISALLOWED_PATH/);

  // Approved paths permitted
  const root = validatePreviewUrl('https://preview.vercel.app/');
  assert.equal(root.pathname, '/');
  const health = validatePreviewUrl('https://preview.vercel.app/api/v1/health');
  assert.equal(health.pathname, '/api/v1/health');

  // Mock fetch simulating redirect behaviors
  const mockRedirectFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    if (urlStr === 'https://preview-a.vercel.app/') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://preview-b.vercel.app/' }),
        text: async () => '',
      };
    }
    if (urlStr === 'https://preview-a.vercel.app/redirect-to-query') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://preview-a.vercel.app/?token=leak' }),
        text: async () => '',
      };
    }
    if (urlStr === 'https://preview-a.vercel.app/redirect-to-fragment') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://preview-a.vercel.app/#leak' }),
        text: async () => '',
      };
    }
    if (urlStr === 'https://preview-a.vercel.app/redirect-to-ssrf') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'http://169.254.169.254/metadata' }),
        text: async () => '',
      };
    }
    if (urlStr === 'https://preview-a.vercel.app/redirect-safe') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://preview-a.vercel.app/api/v1/health' }),
        text: async () => '',
      };
    }
    if (urlStr === 'https://preview-a.vercel.app/api/v1/health') {
      return {
        status: 200,
        headers: new globalThis.Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ data: { status: 'ok' } }),
      };
    }
    throw new Error(`NOT_MOCKED: ${urlStr}`);
  };

  // 1. Cross-origin redirect must throw CROSS_ORIGIN_REDIRECT_FORBIDDEN
  await assert.rejects(
    async () => safeGet('https://preview-a.vercel.app/', {}, mockRedirectFetch),
    /CROSS_ORIGIN_REDIRECT_FORBIDDEN/
  );

  // 2. Redirect to SSRF target must throw CROSS_ORIGIN_REDIRECT_FORBIDDEN
  await assert.rejects(
    async () => safeGet('https://preview-a.vercel.app/redirect-to-ssrf', { allowAnyPathInTest: true }, mockRedirectFetch),
    /CROSS_ORIGIN_REDIRECT_FORBIDDEN/
  );

  // 3. Redirect with query string must throw QUERY_PARAMETERS_FORBIDDEN
  await assert.rejects(
    async () => safeGet('https://preview-a.vercel.app/redirect-to-query', { allowAnyPathInTest: true }, mockRedirectFetch),
    /QUERY_PARAMETERS_FORBIDDEN/
  );

  // 4. Redirect with fragment must throw FRAGMENT_FORBIDDEN
  await assert.rejects(
    async () => safeGet('https://preview-a.vercel.app/redirect-to-fragment', { allowAnyPathInTest: true }, mockRedirectFetch),
    /FRAGMENT_FORBIDDEN/
  );

  // 5. Safe same-origin redirect succeeds
  const safeRes = await safeGet('https://preview-a.vercel.app/redirect-safe', { allowAnyPathInTest: true }, mockRedirectFetch);
  assert.equal(safeRes.status, 200);
  assert.equal(safeRes.finalUrl, 'https://preview-a.vercel.app/api/v1/health');
});

test('Review Finding 3: sanitizeUrlForReport completely strips credentials, userinfo, queries, and fragments', () => {
  const dirty = 'https://admin:SUPER_SECRET_TOKEN_999@preview-123.vercel.app/api/v1/health?param=secret#token';
  const clean = sanitizeUrlForReport(dirty);
  assert.equal(clean, 'https://preview-123.vercel.app/api/v1/health');
  assert.equal(clean.includes('SUPER_SECRET'), false);
  assert.equal(clean.includes('admin'), false);
  assert.equal(clean.includes('param=secret'), false);
  assert.equal(clean.includes('#token'), false);

  // Fallback for unparseable input
  assert.equal(sanitizeUrlForReport(12345), '[NON_STRING_URL]');
});

test('Review Finding 3: runPreviewSafetyCheck never leaks userinfo or response bodies into report or logs', async () => {
  const dirtyUrl = 'https://bot:MY_HIGHLY_SECRET_KEY@preview-test.vercel.app';
  const report = await runPreviewSafetyCheck({ url: dirtyUrl }, async () => {
    throw new Error('NETWORK_DOWN');
  });

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('MY_HIGHLY_SECRET_KEY'), false);

  const formatted = formatTerminalReport(report);
  assert.equal(formatted.includes('MY_HIGHLY_SECRET_KEY'), false);

  // Proxied health route check only stores allowlisted healthStatus, never unvetted payload fields
  const mockHealthFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    if (urlStr === 'https://preview-safe.vercel.app/') {
      return {
        status: 200,
        headers: new globalThis.Headers({ 'content-type': 'text/html' }),
        text: async () => '<!DOCTYPE html><html><body>EgyHealth</body></html>',
      };
    }
    if (urlStr === 'https://preview-safe.vercel.app/api/v1/health') {
      return {
        status: 200,
        headers: new globalThis.Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({
          data: {
            status: 'ok',
            internal_db_secret: 'SHOULD_NOT_BE_EXPOSED_IN_REPORT_DETAILS',
            nested: { confidential: true },
          },
        }),
      };
    }
    throw new Error('NOT_FOUND');
  };

  const healthReport = await runPreviewSafetyCheck({ url: 'https://preview-safe.vercel.app' }, mockHealthFetch);
  const healthCheck = healthReport.checks.find(c => c.name.includes('Proxied Health'));
  assert.ok(healthCheck);
  assert.equal(healthCheck.status, 'PASS');
  assert.equal(healthCheck.details.healthStatus, 'ok');
  assert.equal('internal_db_secret' in healthCheck.details, false);
  assert.equal(JSON.stringify(healthReport).includes('SHOULD_NOT_BE_EXPOSED_IN_REPORT_DETAILS'), false);
});

test('Review Finding 4: apply timeout and response-size limits to complete request including body consumption', async () => {
  // 1. Content-Length header exceeding limit
  const fetchTooLargeHeader = async () => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-length': '2000000' }),
    text: async () => '',
  });
  await assert.rejects(
    async () => safeGet('https://preview-size.vercel.app/', { maxBytes: 100000 }, fetchTooLargeHeader),
    /RESPONSE_TOO_LARGE/
  );

  // 2. Body text length exceeding limit
  const fetchTooLargeBody = async () => ({
    status: 200,
    headers: new globalThis.Headers({}),
    text: async () => 'X'.repeat(5000),
  });
  await assert.rejects(
    async () => safeGet('https://preview-size.vercel.app/', { maxBytes: 1000 }, fetchTooLargeBody),
    /RESPONSE_TOO_LARGE/
  );

  // 3. Stalled body consumption triggers end-to-end timeout
  const fetchStalledBody = async (_url, options) => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-type': 'text/html' }),
    text: () => new Promise((_, reject) => {
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          const abortErr = new Error('The operation was aborted');
          abortErr.name = 'AbortError';
          reject(abortErr);
        });
      }
    }),
  });

  await assert.rejects(
    async () => safeGet('https://preview-size.vercel.app/', { timeout: 30 }, fetchStalledBody),
    /REQUEST_TIMEOUT/
  );
});

test('Review Finding 5: AP05 asset audit marks gate OPEN and status NOT_VERIFIED', () => {
  const assets = inspectLocalAssets();
  assert.equal(assets.pass, false);
  assert.equal(assets.status, 'NOT_VERIFIED');
  assert.ok(assets.ap05Status.includes('OPEN_GATE'));
  assert.ok(assets.ap05Status.includes('inventory check only'));
});

test('scanBodyForLeaks detects sensitive environment and DB secrets', () => {
  const cleanHtml = '<!DOCTYPE html><html><head><title>EgyHealth 360</title></head><body>App</body></html>';
  assert.equal(scanBodyForLeaks(cleanHtml).leaked, false);

  const leakDb = '<div>Config: DATABASE_URL = postgresql://user:pass@neon.tech/db</div>';
  const resDb = scanBodyForLeaks(leakDb);
  assert.equal(resDb.leaked, true);
  assert.ok(resDb.findings.length >= 1);

  const leakToken = 'window.ENV = { VERCEL_TOKEN: "abc123secret" };';
  assert.equal(scanBodyForLeaks(leakToken).leaked, true);

  const leakStack = '<pre>Error: fail\n    at async main (/app/apps/api/src/main.ts:12:3)</pre>';
  assert.equal(scanBodyForLeaks(leakStack).leaked, true);
});

test('evaluateSecurityHeaders flags unexpected Set-Cookie and nosniff mismatch', () => {
  const goodHeaders = new globalThis.Headers({
    'content-type': 'application/json',
    'x-content-type-options': 'nosniff',
  });
  const goodRes = evaluateSecurityHeaders(goodHeaders);
  assert.equal(goodRes.pass, true);
  assert.equal(goodRes.warnings.length, 0);

  const cookieHeaders = new globalThis.Headers({
    'content-type': 'application/json',
    'set-cookie': 'eh_session=xyz; Path=/; HttpOnly',
  });
  const cookieRes = evaluateSecurityHeaders(cookieHeaders);
  assert.equal(cookieRes.pass, false);
  assert.ok(cookieRes.warnings.some(w => /Set-Cookie/i.test(w)));
});

test('runPreviewSafetyCheck executes complete workflow deterministically', async () => {
  const mockResponses = {
    'https://preview-134.vercel.app/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' }),
      text: async () => '<!DOCTYPE html><html><head><title>EgyHealth 360</title></head><body><div id="root">App</div></body></html>',
    },
    'https://preview-134.vercel.app/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok' } }),
    },
    'https://api-134.vercel.app/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok' } }),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    const res = mockResponses[urlStr];
    if (res) return res;
    throw new Error(`MOCK_NOT_FOUND: ${urlStr}`);
  };

  const report = await runPreviewSafetyCheck({
    url: 'https://preview-134.vercel.app',
    apiUrl: 'https://api-134.vercel.app',
    expectedSha: 'd268264b1d062c65425a223f8f25d6e72442586e',
  }, mockFetch);

  assert.equal(report.overallStatus, 'PASS');
  assert.equal(report.clinicalReadiness, 'NOT_VERIFIED');
  assert.ok(report.clinicalReadinessReason.includes('ZERO clinical readiness'));
  assert.ok(report.ssrfPolicy.includes('socket-level DNS pinning is unverified'));
  assert.equal(report.summary.fail, 0);
  assert.ok(report.checks.some(c => c.name.includes('Proxied Health') && c.status === 'PASS'));
  assert.ok(report.checks.some(c => c.name.includes('Direct API Health') && c.status === 'PASS'));
  assert.ok(report.checks.some(c => c.name.includes('Source SHA Attestation') && c.status === 'NOT_VERIFIED'));
  assert.ok(report.checks.some(c => c.name.includes('AP05 Brand & Asset') && c.status === 'NOT_VERIFIED'));
});

test('runPreviewSafetyCheck flags FAIL on secret leak in HTML', async () => {
  const mockResponses = {
    'https://preview-leak.vercel.app/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>Error DATABASE_URL=postgres://user:pass@neon.tech/main</body></html>',
    },
    'https://preview-leak.vercel.app/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok' } }),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    return mockResponses[urlStr];
  };

  const report = await runPreviewSafetyCheck({ url: 'https://preview-leak.vercel.app' }, mockFetch);
  assert.equal(report.overallStatus, 'FAIL');
  assert.ok(report.summary.fail >= 1);
  const leakCheck = report.checks.find(c => c.name.includes('Web Root'));
  assert.equal(leakCheck.status, 'FAIL');
  assert.ok(leakCheck.details.leaks.length >= 1);
});

test('parseCliArgs parses all flags and options correctly', () => {
  const args = [
    '--url', 'https://preview.vercel.app',
    '--api-url', 'https://api.vercel.app',
    '--expected-sha', 'abcdef123456',
    '--timeout', '5000',
    '--json',
  ];
  const parsed = parseCliArgs(args);
  assert.equal(parsed.url, 'https://preview.vercel.app');
  assert.equal(parsed.apiUrl, 'https://api.vercel.app');
  assert.equal(parsed.expectedSha, 'abcdef123456');
  assert.equal(parsed.timeout, 5000);
  assert.equal(parsed.json, true);

  // Formatting check
  const fakeReport = {
    evaluatedAt: '2026-11-15T00:00:00.000Z',
    targetWebUrl: 'https://preview.vercel.app',
    overallStatus: 'PASS',
    checks: [{ name: 'Test Check', status: 'PASS', details: { elapsedMs: 50 } }],
    ssrfPolicy: 'Restricted to approved *.vercel.app',
    clinicalReadiness: 'NOT_VERIFIED',
    clinicalReadinessReason: 'Test reason',
    summary: { pass: 1, warn: 0, fail: 0, notVerified: 0 },
  };
  const formatted = formatTerminalReport(fakeReport);
  assert.ok(formatted.includes('EGYHEALTH 360'));
  assert.ok(formatted.includes('[PASS        ] Test Check'));
  assert.ok(formatted.includes('NETWORK & SSRF POLICY NOTE:'));
});
