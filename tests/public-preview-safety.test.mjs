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
  ERROR_CATEGORIES,
  getSafeErrorCategory,
  APPROVED_EGYHEALTH_PREVIEW_PATTERN,
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
  assert.equal(isPrivateHostnameOrIp('egyhealth360-preview.vercel.app'), false);
});

test('isIpLiteral detects IPv4 and IPv6 literals', () => {
  assert.equal(isIpLiteral('127.0.0.1'), true);
  assert.equal(isIpLiteral('93.184.216.34'), true);
  assert.equal(isIpLiteral('::1'), true);
  assert.equal(isIpLiteral('[2001:db8::1]'), true);
  assert.equal(isIpLiteral('egyhealth360-preview.vercel.app'), false);
  assert.equal(isIpLiteral('localhost'), false);
});

test('Finding F1: sanitizeUrlForReport never echoes malformed inputs or canary tokens', () => {
  // Malformed scheme with secret canary
  const malformed = 'malformed://admin:CANARY_SECRET_PASS@not a valid url';
  const clean = sanitizeUrlForReport(malformed);
  assert.equal(clean, '[INVALID_TARGET]');
  assert.equal(clean.includes('CANARY_SECRET_PASS'), false);

  // Unparseable non-string types
  assert.equal(sanitizeUrlForReport(null), '[INVALID_TARGET]');
  assert.equal(sanitizeUrlForReport(12345), '[INVALID_TARGET]');
  assert.equal(sanitizeUrlForReport(''), '[INVALID_TARGET]');

  // Valid URL strips userinfo, query params, and fragments
  const validWithSecrets = 'https://admin:TOP_SECRET@egyhealth360-preview.vercel.app/api/v1/health?key=secret#hash';
  const sanitized = sanitizeUrlForReport(validWithSecrets);
  assert.equal(sanitized, 'https://egyhealth360-preview.vercel.app/api/v1/health');
  assert.equal(sanitized.includes('TOP_SECRET'), false);
  assert.equal(sanitized.includes('key=secret'), false);
  assert.equal(sanitized.includes('#hash'), false);
});

test('Finding F1: validatePreviewUrl never echoes secret paths, hosts or headers in errors', () => {
  // Disallowed path with secret canary token
  const secretPathUrl = 'https://egyhealth360-preview.vercel.app/CANARY_SECRET_PATH_123';
  assert.throws(
    () => validatePreviewUrl(secretPathUrl),
    (err) => {
      assert.equal(err.message, ERROR_CATEGORIES.DISALLOWED_PATH);
      assert.equal(err.message.includes('CANARY_SECRET_PATH_123'), false);
      return true;
    }
  );

  // Disallowed port error does not echo arbitrary port
  assert.throws(
    () => validatePreviewUrl('https://egyhealth360-preview.vercel.app:8080'),
    (err) => {
      assert.equal(err.message, ERROR_CATEGORIES.DISALLOWED_PORT);
      assert.equal(err.message.includes('8080'), false);
      return true;
    }
  );

  // Query parameter error
  assert.throws(
    () => validatePreviewUrl('https://egyhealth360-preview.vercel.app/?secret=canary'),
    (err) => {
      assert.equal(err.message, ERROR_CATEGORIES.QUERY_PARAMETERS_FORBIDDEN);
      assert.equal(err.message.includes('canary'), false);
      return true;
    }
  );
});

test('Finding F1: runPreviewSafetyCheck never reflects exception traces or unvetted headers into reports', async () => {
  // Mock fetch throwing exception containing secret canary
  const mockLeakingFetch = async () => {
    throw new Error('INTERNAL_SECRET_CANARY_TRACE_INFO');
  };

  const report = await runPreviewSafetyCheck({
    url: 'https://egyhealth360-preview.vercel.app',
  }, mockLeakingFetch);

  assert.equal(report.overallStatus, 'FAIL');
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('INTERNAL_SECRET_CANARY_TRACE_INFO'), false);

  const formatted = formatTerminalReport(report);
  assert.equal(formatted.includes('INTERNAL_SECRET_CANARY_TRACE_INFO'), false);

  // Header security evaluation does not reflect malicious nosniff canary
  const badHeaders = new globalThis.Headers({
    'content-type': 'text/html; secret-canary=true',
    'x-content-type-options': 'CANARY_INJECTED_NOSNIFF_VALUE',
  });
  const headersEval = evaluateSecurityHeaders(badHeaders);
  assert.equal(headersEval.pass, false);
  assert.equal(headersEval.warnings.includes('INVALID_NOSNIFF_HEADER'), true);
  assert.equal(JSON.stringify(headersEval).includes('CANARY_INJECTED_NOSNIFF_VALUE'), false);

  // Expected SHA validation: rejects non-40hex canary values without echoing
  const badShaReport = await runPreviewSafetyCheck({
    url: 'https://egyhealth360-preview.vercel.app',
    expectedSha: 'INJECTION_CANARY_SHA_VALUE_THAT_IS_NOT_HEX',
  }, async () => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-type': 'text/html' }),
    text: async () => '<html><body>OK</body></html>',
  }));

  const shaCheck = badShaReport.checks.find(c => c.name.includes('Source SHA'));
  assert.ok(shaCheck);
  assert.equal(shaCheck.status, 'FAIL');
  assert.equal(shaCheck.details.errorCategory, ERROR_CATEGORIES.INVALID_SHA_FORMAT);
  assert.equal(JSON.stringify(badShaReport).includes('INJECTION_CANARY_SHA_VALUE_THAT_IS_NOT_HEX'), false);
});

test('Finding F2: safeGet enforces real streaming byte limits with early cancellation', async () => {
  // 1. Upfront Content-Length header check
  const fetchTooLargeHeader = async () => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-length': '5000000' }),
    body: { cancel: async () => {} },
  });
  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/', { maxBytes: 1000 }, fetchTooLargeHeader),
    (err) => err.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE
  );

  // 2. Real streaming chunk reader cancels early when byte limit exceeded
  let streamCanceled = false;
  let chunksRead = 0;
  const mockStreamingBody = {
    getReader: () => {
      const chunks = [
        new TextEncoder().encode('X'.repeat(600)),
        new TextEncoder().encode('Y'.repeat(600)),
        new TextEncoder().encode('Z'.repeat(600)),
      ];
      let idx = 0;
      return {
        read: async () => {
          if (idx < chunks.length) {
            chunksRead++;
            return { done: false, value: chunks[idx++] };
          }
          return { done: true, value: undefined };
        },
        cancel: async () => {
          streamCanceled = true;
        },
      };
    },
  };

  const fetchStreamResponse = async () => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-type': 'text/html' }),
    body: mockStreamingBody,
  });

  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/', { maxBytes: 1000 }, fetchStreamResponse),
    (err) => err.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE
  );
  assert.equal(streamCanceled, true);
  assert.equal(chunksRead, 2); // Exceeded on chunk 2 (1200 bytes > 1000 bytes); chunk 3 was never read!

  // 3. Multi-byte UTF-8 payload exceeding byte bound even if character count is smaller
  const multibyte3ByteChars = '€'.repeat(400); // 400 chars, but 1200 UTF-8 bytes!
  const fetchMultibyte = async () => ({
    status: 200,
    headers: new globalThis.Headers({}),
    text: async () => multibyte3ByteChars,
  });
  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/', { maxBytes: 1000 }, fetchMultibyte),
    (err) => err.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE
  );

  // 4. Stalled stream triggers REQUEST_TIMEOUT
  const fetchStalledStream = async (_url, options) => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-type': 'text/html' }),
    body: {
      getReader: () => ({
        read: () => new Promise((_, reject) => {
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        }),
        cancel: async () => {},
      }),
    },
  });

  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/', { timeout: 30 }, fetchStalledStream),
    (err) => err.message === ERROR_CATEGORIES.REQUEST_TIMEOUT
  );
});

test('Finding F3: APPROVED_EGYHEALTH_PREVIEW_PATTERN restricts origins to EgyHealth projects', () => {
  // Approved EgyHealth preview domains
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360.vercel.app'), true);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360-preview.vercel.app'), true);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app'), true);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app'), true);

  // Foreign or unapproved Vercel projects MUST be rejected
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('attacker.vercel.app'), false);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('otherproject.vercel.app'), false);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('evil-egyhealth360.vercel.app'), false);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360.attacker.com'), false);
  assert.equal(APPROVED_EGYHEALTH_PREVIEW_PATTERN.test('egyhealth360.vercel.app.attacker.com'), false);

  assert.throws(
    () => validatePreviewUrl('https://attacker.vercel.app'),
    /UNTRUSTED_PREVIEW_DOMAIN/
  );
});

test('Finding F3: test options strictly require explicit injected offline transport', async () => {
  // Invoking safeGet with allowTestHttp without customFetch MUST reject
  await assert.rejects(
    async () => safeGet('http://127.0.0.1:3000', { allowTestHttp: true }),
    /TEST_TRANSPORT_REQUIRED/
  );

  // Explicitly passing globalThis.fetch as customFetch with test options MUST reject
  await assert.rejects(
    async () => safeGet('http://127.0.0.1:3000', { allowTestHttp: true }, globalThis.fetch),
    /TEST_TRANSPORT_REQUIRED/
  );

  // runPreviewSafetyCheck fails closed immediately when allowTestHttp is passed without customFetch
  const testReport = await runPreviewSafetyCheck({
    url: 'http://127.0.0.1:3000',
    allowTestHttp: true,
  });
  assert.equal(testReport.overallStatus, 'FAIL');
  assert.equal(testReport.checks[0].details.errorCategory, ERROR_CATEGORIES.TEST_TRANSPORT_REQUIRED);
});

test('Finding F4: safeGet rejects ALL HTTP redirects (301, 302, 303, 307, 308)', async () => {
  const mockRedirectFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    if (urlStr.includes('/redirect-301')) {
      return {
        status: 301,
        headers: new globalThis.Headers({ location: 'https://egyhealth360-preview.vercel.app/api/v1/health' }),
        body: { cancel: async () => {} },
      };
    }
    if (urlStr.includes('/redirect-302')) {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://egyhealth360-preview.vercel.app/target' }),
        body: { cancel: async () => {} },
      };
    }
    if (urlStr.includes('/redirect-307')) {
      return {
        status: 307,
        headers: new globalThis.Headers({ location: 'https://attacker.com/leak' }),
        body: { cancel: async () => {} },
      };
    }
    return {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html' }),
      text: async () => '<h1>OK</h1>',
    };
  };

  // 301 redirect rejected
  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/redirect-301', { allowAnyPathInTest: true }, mockRedirectFetch),
    (err) => err.message === ERROR_CATEGORIES.REDIRECTS_PROHIBITED
  );

  // 302 redirect rejected
  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/redirect-302', { allowAnyPathInTest: true }, mockRedirectFetch),
    (err) => err.message === ERROR_CATEGORIES.REDIRECTS_PROHIBITED
  );

  // 307 redirect rejected
  await assert.rejects(
    async () => safeGet('https://egyhealth360-preview.vercel.app/redirect-307', { allowAnyPathInTest: true }, mockRedirectFetch),
    (err) => err.message === ERROR_CATEGORIES.REDIRECTS_PROHIBITED
  );
});

test('P3: parseCliArgs strictly rejects unknown options, duplicate flags, and invalid timeout', () => {
  // Unknown option
  assert.throws(() => parseCliArgs(['--unknown-flag', 'value']), /UNKNOWN_OPTION/);

  // Duplicate flag
  assert.throws(
    () => parseCliArgs(['--url', 'https://egyhealth360.vercel.app', '--url', 'https://egyhealth360-2.vercel.app']),
    /DUPLICATE_ARGUMENT/
  );

  // Invalid timeout (string)
  assert.throws(() => parseCliArgs(['--timeout', 'not-a-number']), /INVALID_TIMEOUT/);

  // Timeout out of range (<1000)
  assert.throws(() => parseCliArgs(['--timeout', '500']), /INVALID_TIMEOUT/);

  // Timeout out of range (>60000)
  assert.throws(() => parseCliArgs(['--timeout', '70000']), /INVALID_TIMEOUT/);

  // Valid arguments parse cleanly
  const valid = parseCliArgs([
    '--url', 'https://egyhealth360-preview.vercel.app',
    '--api-url', 'https://egyhealth360-api.vercel.app',
    '--expected-sha', 'd268264b1d062c65425a223f8f25d6e72442586e',
    '--timeout', '5000',
    '--json',
  ]);
  assert.equal(valid.url, 'https://egyhealth360-preview.vercel.app');
  assert.equal(valid.apiUrl, 'https://egyhealth360-api.vercel.app');
  assert.equal(valid.expectedSha, 'd268264b1d062c65425a223f8f25d6e72442586e');
  assert.equal(valid.timeout, 5000);
  assert.equal(valid.json, true);
});

test('inspectLocalAssets inspects fonts and notes AP05 open gate', () => {
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

test('runPreviewSafetyCheck executes complete workflow deterministically in offline mode', async () => {
  const mockResponses = {
    'https://egyhealth360-preview.vercel.app/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' }),
      text: async () => '<!DOCTYPE html><html><head><title>EgyHealth 360</title></head><body><div id="root">App</div></body></html>',
    },
    'https://egyhealth360-preview.vercel.app/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok', secret_internal: 'IGNORE_ME' } }),
    },
    'https://egyhealth360-api.vercel.app/api/v1/health': {
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
    url: 'https://egyhealth360-preview.vercel.app',
    apiUrl: 'https://egyhealth360-api.vercel.app',
    expectedSha: 'd268264b1d062c65425a223f8f25d6e72442586e',
  }, mockFetch);

  assert.equal(report.overallStatus, 'PASS');
  assert.equal(report.clinicalReadiness, 'NOT_VERIFIED');
  assert.ok(report.clinicalReadinessReason.includes('ZERO clinical readiness'));
  assert.equal(report.summary.fail, 0);
  assert.ok(report.checks.some(c => c.name.includes('Proxied Health') && c.status === 'PASS'));
  assert.ok(report.checks.some(c => c.name.includes('Direct API Health') && c.status === 'PASS'));
  assert.ok(report.checks.some(c => c.name.includes('Source SHA Attestation') && c.status === 'NOT_VERIFIED'));
  assert.ok(report.checks.some(c => c.name.includes('AP05 Brand & Asset') && c.status === 'NOT_VERIFIED'));

  // Ensure secret_internal was never copied into check details
  assert.equal(JSON.stringify(report).includes('IGNORE_ME'), false);
});

test('runPreviewSafetyCheck flags FAIL on secret leak in HTML', async () => {
  const mockResponses = {
    'https://egyhealth360-leak.vercel.app/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>Error DATABASE_URL=postgres://user:pass@neon.tech/main</body></html>',
    },
    'https://egyhealth360-leak.vercel.app/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok' } }),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    return mockResponses[urlStr];
  };

  const report = await runPreviewSafetyCheck({ url: 'https://egyhealth360-leak.vercel.app' }, mockFetch);
  assert.equal(report.overallStatus, 'FAIL');
  assert.ok(report.summary.fail >= 1);
  const leakCheck = report.checks.find(c => c.name.includes('Web Root'));
  assert.equal(leakCheck.status, 'FAIL');
  assert.ok(leakCheck.details.leaks.length >= 1);
});

test('getSafeErrorCategory maps errors correctly to enum categories', () => {
  assert.equal(getSafeErrorCategory(new Error(ERROR_CATEGORIES.DISALLOWED_PORT)), ERROR_CATEGORIES.DISALLOWED_PORT);
  assert.equal(getSafeErrorCategory(new Error(ERROR_CATEGORIES.REDIRECTS_PROHIBITED)), ERROR_CATEGORIES.REDIRECTS_PROHIBITED);
  const abortErr = new Error('The operation was aborted');
  abortErr.name = 'AbortError';
  assert.equal(getSafeErrorCategory(abortErr), ERROR_CATEGORIES.REQUEST_TIMEOUT);
  assert.equal(getSafeErrorCategory(new Error('Unknown connection dropped')), ERROR_CATEGORIES.FETCH_FAILED);
  assert.equal(getSafeErrorCategory(null), ERROR_CATEGORIES.UNKNOWN_ERROR);
});
