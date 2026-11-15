import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivateIpv4,
  isPrivateHostnameOrIp,
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

test('validatePreviewUrl enforces HTTPS, rejects credentials and private IPs', () => {
  // Valid HTTPS
  const valid = validatePreviewUrl('https://preview-123.vercel.app');
  assert.equal(valid.origin, 'https://preview-123.vercel.app');

  // Rejects HTTP by default
  assert.throws(() => validatePreviewUrl('http://preview.example.com'), /UNSAFE_PROTOCOL/);

  // Rejects embedded user/pass
  assert.throws(() => validatePreviewUrl('https://admin:secret@preview.example.com'), /CREDENTIALS_FORBIDDEN/);

  // Rejects loopback & SSRF targets
  assert.throws(() => validatePreviewUrl('https://localhost'), /SSRF_PROHIBITED/);
  assert.throws(() => validatePreviewUrl('https://127.0.0.1'), /SSRF_PROHIBITED/);
  assert.throws(() => validatePreviewUrl('https://10.0.0.5'), /SSRF_PROHIBITED/);
  assert.throws(() => validatePreviewUrl('https://192.168.1.1'), /SSRF_PROHIBITED/);

  // Rejects non-standard ports
  assert.throws(() => validatePreviewUrl('https://preview.example.com:22'), /DISALLOWED_PORT/);

  // Permits HTTP when allowTestHttp is enabled
  const testUrl = validatePreviewUrl('http://127.0.0.1:3000', { allowTestHttp: true });
  assert.equal(testUrl.origin, 'http://127.0.0.1:3000');
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

test('safeGet handles responses and protects against malicious redirects', async () => {
  // Mock fetch function simulating safe redirect
  const mockFetch = async (url) => {
    if (url === 'https://example.com/start') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'https://example.com/final' }),
        text: async () => '',
      };
    }
    if (url === 'https://example.com/final') {
      return {
        status: 200,
        headers: new globalThis.Headers({ 'content-type': 'text/html' }),
        text: async () => '<h1>Final Destination</h1>',
      };
    }
    if (url === 'https://example.com/bad-redirect') {
      return {
        status: 302,
        headers: new globalThis.Headers({ location: 'http://169.254.169.254/metadata' }),
        text: async () => '',
      };
    }
    throw new Error('NOT_FOUND');
  };

  const res = await safeGet('https://example.com/start', {}, mockFetch);
  assert.equal(res.status, 200);
  assert.equal(res.finalUrl, 'https://example.com/final');
  assert.equal(res.body, '<h1>Final Destination</h1>');

  // Attempting redirect to SSRF target must throw
  await assert.rejects(
    async () => safeGet('https://example.com/bad-redirect', {}, mockFetch),
    /SSRF_PROHIBITED|UNSAFE_PROTOCOL/
  );
});

test('inspectLocalAssets inspects fonts and notes AP05 open gate', () => {
  const assets = inspectLocalAssets();
  assert.equal(assets.pass, true);
  assert.ok(assets.ap05Status.includes('OPEN_GATE'));
});

test('runPreviewSafetyCheck executes complete workflow deterministically', async () => {
  const mockResponses = {
    'https://preview.example.com/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' }),
      text: async () => '<!DOCTYPE html><html><head><title>EgyHealth 360</title></head><body><div id="root">App</div></body></html>',
    },
    'https://preview.example.com/api/v1/health': {
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
    url: 'https://preview.example.com',
    expectedSha: 'd268264b1d062c65425a223f8f25d6e72442586e',
  }, mockFetch);

  assert.equal(report.overallStatus, 'PASS');
  assert.equal(report.clinicalReadiness, 'NOT_VERIFIED');
  assert.ok(report.clinicalReadinessReason.includes('ZERO clinical readiness'));
  assert.equal(report.summary.fail, 0);
  assert.ok(report.checks.some(c => c.name.includes('Proxied Health') && c.status === 'PASS'));
  assert.ok(report.checks.some(c => c.name.includes('Source SHA Attestation') && c.status === 'NOT_VERIFIED'));
});

test('runPreviewSafetyCheck flags FAIL on secret leak in HTML', async () => {
  const mockResponses = {
    'https://preview.example.com/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>Error DATABASE_URL=postgres://user:pass@neon.tech/main</body></html>',
    },
    'https://preview.example.com/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ data: { status: 'ok' } }),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    return mockResponses[urlStr];
  };

  const report = await runPreviewSafetyCheck({ url: 'https://preview.example.com' }, mockFetch);
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
    clinicalReadiness: 'NOT_VERIFIED',
    clinicalReadinessReason: 'Test reason',
    summary: { pass: 1, warn: 0, fail: 0, notVerified: 0 },
  };
  const formatted = formatTerminalReport(fakeReport);
  assert.ok(formatted.includes('EGYHEALTH 360'));
  assert.ok(formatted.includes('[PASS        ] Test Check'));
});
