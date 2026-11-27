import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
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
  OFFLINE_WEB_ORIGIN,
  OFFLINE_API_ORIGIN,
} from '../scripts/lib/public-preview-safety.mjs';
import { parseCliArgs, formatTerminalReport } from '../scripts/verify-public-preview.mjs';

function textStream(text) {
  const bytes = new globalThis.TextEncoder().encode(text);
  return new globalThis.ReadableStream({start(controller) {controller.enqueue(bytes);controller.close();}});
}

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
  assert.equal(sanitized, '[INVALID_TARGET]');
  assert.equal(sanitized.includes('TOP_SECRET'), false);
  assert.equal(sanitized.includes('key=secret'), false);
  assert.equal(sanitized.includes('#hash'), false);
});

test('Finding F1: validatePreviewUrl never echoes secret paths, hosts or headers in errors', () => {
  // Disallowed path with secret canary token
  const secretPathUrl = 'https://offline-web.egyhealth.invalid/CANARY_SECRET_PATH_123';
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
    () => validatePreviewUrl('https://offline-web.egyhealth.invalid:8080'),
    (err) => {
      assert.equal(err.message, ERROR_CATEGORIES.DISALLOWED_PORT);
      assert.equal(err.message.includes('8080'), false);
      return true;
    }
  );

  // Query parameter error
  assert.throws(
    () => validatePreviewUrl('https://offline-web.egyhealth.invalid/?secret=canary'),
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
    url: 'https://offline-web.egyhealth.invalid',
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
    url: 'https://offline-web.egyhealth.invalid',
    expectedSha: 'INJECTION_CANARY_SHA_VALUE_THAT_IS_NOT_HEX',
  }, async () => ({
    status: 200,
    headers: new globalThis.Headers({ 'content-type': 'text/html' }),
    body: textStream('<html><body>OK</body></html>'),
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
    async () => safeGet('https://offline-web.egyhealth.invalid/', { maxBytes: 1000 }, fetchTooLargeHeader),
    (err) => err.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE
  );

  // 2. Real streaming chunk reader cancels early when byte limit exceeded
  let streamCanceled = false;
  let chunksRead = 0;
  const mockStreamingBody = {
    getReader: () => {
      const chunks = [
        new globalThis.TextEncoder().encode('X'.repeat(600)),
        new globalThis.TextEncoder().encode('Y'.repeat(600)),
        new globalThis.TextEncoder().encode('Z'.repeat(600)),
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
    async () => safeGet('https://offline-web.egyhealth.invalid/', { maxBytes: 1000 }, fetchStreamResponse),
    (err) => err.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE
  );
  assert.equal(streamCanceled, true);
  assert.equal(chunksRead, 2); // Exceeded on chunk 2 (1200 bytes > 1000 bytes); chunk 3 was never read!

  // 3. Multi-byte UTF-8 payload exceeding byte bound even if character count is smaller
  const multibyte3ByteChars = '€'.repeat(400); // 400 chars, but 1200 UTF-8 bytes!
  const fetchMultibyte = async () => ({
    status: 200,
    headers: new globalThis.Headers({}),
    body: textStream(multibyte3ByteChars),
  });
  await assert.rejects(
    async () => safeGet('https://offline-web.egyhealth.invalid/', { maxBytes: 1000 }, fetchMultibyte),
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
    async () => safeGet('https://offline-web.egyhealth.invalid/', { timeout: 30 }, fetchStalledStream),
    (err) => err.message === ERROR_CATEGORIES.REQUEST_TIMEOUT
  );
});

test('Finding F3: no production project name is origin-ownership attestation', () => {
  for (const host of ['egyhealth360.vercel.app','egyhealth360-preview.vercel.app','egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app','egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app','attacker.vercel.app','otherproject.vercel.app','evil-egyhealth360.vercel.app','egyhealth360.attacker.com','egyhealth360.vercel.app.attacker.com']) {
    assert.throws(() => validatePreviewUrl('https://'+host), /UNTRUSTED_PREVIEW_DOMAIN/);
  }
  assert.equal(validatePreviewUrl(OFFLINE_WEB_ORIGIN).origin, OFFLINE_WEB_ORIGIN);
  assert.equal(validatePreviewUrl(OFFLINE_API_ORIGIN).origin, OFFLINE_API_ORIGIN);
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
  for (const status of [301,302,303,307,308]) {
    let calls=0,reads=0,cancels=0;
    const transport=async()=>{calls++;return {status,headers:new globalThis.Headers({location:'https://CANARY_REDIRECT.invalid/private'}),body:{getReader(){reads++;},async cancel(){cancels++;}}};};
    await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN+'/',{},transport), error=>error.message===ERROR_CATEGORIES.REDIRECTS_PROHIBITED);
    assert.equal(calls,1);assert.equal(reads,0);assert.equal(cancels,1);
  }
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
    '--url', 'https://offline-web.egyhealth.invalid',
    '--api-url', 'https://offline-api.egyhealth.invalid',
    '--expected-sha', 'd268264b1d062c65425a223f8f25d6e72442586e',
    '--timeout', '5000',
    '--json',
  ]);
  assert.equal(valid.url, 'https://offline-web.egyhealth.invalid');
  assert.equal(valid.apiUrl, 'https://offline-api.egyhealth.invalid');
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
    'https://offline-web.egyhealth.invalid/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' }),
      body: textStream('<!DOCTYPE html><html><head><title>EgyHealth 360</title></head><body><div id="root">App</div></body></html>'),
    },
    'https://offline-web.egyhealth.invalid/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      body: textStream(JSON.stringify({ data: { status: 'ok', secret_internal: 'IGNORE_ME' } })),
    },
    'https://offline-api.egyhealth.invalid/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      body: textStream(JSON.stringify({ data: { status: 'ok' } })),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    const res = mockResponses[urlStr];
    if (res) return res;
    throw new Error(`MOCK_NOT_FOUND: ${urlStr}`);
  };

  const report = await runPreviewSafetyCheck({
    url: 'https://offline-web.egyhealth.invalid',
    apiUrl: 'https://offline-api.egyhealth.invalid',
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
    'https://offline-web.egyhealth.invalid/': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'text/html' }),
      body: textStream('<html><body>Error DATABASE_URL=postgres://user:pass@neon.tech/main</body></html>'),
    },
    'https://offline-web.egyhealth.invalid/api/v1/health': {
      status: 200,
      headers: new globalThis.Headers({ 'content-type': 'application/json' }),
      body: textStream(JSON.stringify({ data: { status: 'ok' } })),
    },
  };

  const mockFetch = async (target) => {
    const urlStr = typeof target === 'string' ? target : target.href;
    return mockResponses[urlStr];
  };

  const report = await runPreviewSafetyCheck({ url: 'https://offline-web.egyhealth.invalid' }, mockFetch);
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

// Combined authorization strengthens the same16 original regression groups:
// fixed reserved offline targets replace project-name attestation; fixtures are
// actual streams; no inherited byte, cancellation, secrecy or redirect check is removed.
const CANARY = 'SYNTHETIC_REVIEW_CANARY';
const clean = report => {
  assert.doesNotMatch(JSON.stringify(report),new RegExp(CANARY));
  assert.doesNotMatch(formatTerminalReport(report),new RegExp(CANARY));
};
const deadline = async promise => {
  let timer;
  try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TEST_WATCHDOG_EXCEEDED')),250);})]);}
  finally {globalThis.clearTimeout(timer);}
};
const response = (body='<html>synthetic</html>',headers={'content-type':'text/html','x-content-type-options':'nosniff'})=>({status:200,headers:new globalThis.Headers(headers),body:textStream(body)});

test('F1 full reports reject valid-looking target paths, hosts, ports and apiUrl without reflection or transport',async()=>{
  for(const url of [`https://offline-web.egyhealth.invalid/${CANARY}`,`https://${CANARY.toLowerCase()}.example/`,`https://offline-web.egyhealth.invalid:8443/`,`https://egyhealth360-${CANARY.toLowerCase()}.vercel.app/`,`https://user:${CANARY}@offline-web.egyhealth.invalid/`,`https://offline-web.egyhealth.invalid/?secret=${CANARY}`,`https://offline-web.egyhealth.invalid/#${CANARY}`]) {
    for(const input of [{url},{url:OFFLINE_WEB_ORIGIN,apiUrl:url}]) {
      let calls=0;const report=await runPreviewSafetyCheck(input,async()=>{calls++;return response();});
      assert.equal(report.overallStatus,'FAIL');assert.equal(calls,0);assert.equal(report.targetWebUrl,'[INVALID_TARGET]');assert.equal(report.targetApiUrl,null);clean(report);
      assert.equal(sanitizeUrlForReport(url),'[INVALID_TARGET]');
    }
  }
});
test('F1 fixture statuses must be numeric integer HTTP statuses before any report classification',async()=>{
  for(const status of [CANARY,{secret:CANARY},null,undefined,'200',NaN,Infinity,0,99,600,200.5]) {
    const report=await runPreviewSafetyCheck({url:OFFLINE_WEB_ORIGIN},async()=>({...response(),status}));
    assert.equal(report.overallStatus,'FAIL');assert.ok(report.checks.some(c=>c.details.errorCategory==='INVALID_RESPONSE'));clean(report);
    await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{},async()=>({...response(),status})),/INVALID_RESPONSE/);
  }
});
test('F1 accepted fixture reports expose static target identifiers only, never headers, body extras or expected SHA',async()=>{
  const report=await runPreviewSafetyCheck({url:OFFLINE_WEB_ORIGIN,apiUrl:OFFLINE_API_ORIGIN,expectedSha:'a'.repeat(40)},async url=>url.endsWith('/health')?response(JSON.stringify({data:{status:'ok',extra:CANARY}}),{'content-type':'application/json','x-canary':CANARY}):response(`<html>${CANARY}</html>`,{'content-type':'text/html','x-content-type-options':CANARY,'set-cookie':CANARY}));
  assert.equal(report.mode,'OFFLINE_ONLY');assert.equal(report.targetWebUrl,'OFFLINE_WEB');assert.equal(report.targetApiUrl,'OFFLINE_API');assert.equal(report.expectedSha,null);clean(report);
  assert.equal(report.originOwnership,'NOT_VERIFIED');assert.equal(report.dnsSocketSafety,'NOT_VERIFIED');assert.equal(report.clinicalReadiness,'NOT_VERIFIED');
});
test('F1 terminal formatting rejects arbitrary untrusted names, target values, status and details',()=>{
  assert.doesNotMatch(formatTerminalReport({overallStatus:CANARY,targetWebUrl:CANARY,targetApiUrl:CANARY,checks:[{name:CANARY,status:CANARY,details:{errorCategory:CANARY,leaks:[CANARY]}}]}),new RegExp(CANARY));
});
test('F1 argument/accessor/Proxy exceptions are classified without evaluating or reflecting untrusted data',async()=>{
  let getters=0;const params={url:OFFLINE_WEB_ORIGIN};Object.defineProperty(params,'expectedSha',{get(){getters++;throw new Error(CANARY);}});
  const report=await runPreviewSafetyCheck(params,async()=>response());assert.equal(report.overallStatus,'FAIL');assert.equal(getters,0);clean(report);
  const proxy=new Proxy({}, {getOwnPropertyDescriptor(){throw new Error(CANARY);}});
  const failed=await runPreviewSafetyCheck(proxy,async()=>response());assert.equal(failed.overallStatus,'FAIL');clean(failed);
  assert.equal(getSafeErrorCategory(new Proxy({}, {getOwnPropertyDescriptor(){throw new Error(CANARY);}})),ERROR_CATEGORIES.FETCH_FAILED);
});
test('F2 exported request and report limits reject invalid timeout/maxBytes before invoking transport',async()=>{
  for(const field of ['timeout','maxBytes'])for(const value of [0,-1,NaN,Infinity,'10',1.5,field==='timeout'?60001:1048577]) {
    let calls=0;const transport=async()=>{calls++;return response();};
    await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{[field]:value},transport),/INVALID_RESOURCE_LIMIT/);
    const report=await runPreviewSafetyCheck({url:OFFLINE_WEB_ORIGIN,[field]:value},transport);assert.equal(report.overallStatus,'FAIL');assert.equal(calls,0);clean(report);
  }
  for(const options of [null,1,'secret',[]])await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,options,async()=>response()),/INVALID_RESOURCE_LIMIT/);
});
test('F2 non-streaming fallback is rejected without calling text or claiming a post-buffer memory bound',async()=>{
  let reads=0;
  await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{},async()=>({status:200,headers:new globalThis.Headers(),text:async()=>{reads++;return CANARY;}})),/STREAM_REQUIRED/);
  assert.equal(reads,0);
});
test('F2 asynchronous fetch that ignores abort cannot delay the owned deadline indefinitely',async()=>{
  let signal;const started=globalThis.performance.now();
  await assert.rejects(deadline(safeGet(OFFLINE_WEB_ORIGIN,{timeout:10},async(_url,options)=>{signal=options.signal;return new Promise(()=>{});})),/REQUEST_TIMEOUT/);
  assert.equal(signal.aborted,true);assert.ok(globalThis.performance.now()-started<200);
});
test('F2 late successful transport is rejected and its eventual body is cancelled after abort',async()=>{
  let cancels=0,signal;
  await assert.rejects(deadline(safeGet(OFFLINE_WEB_ORIGIN,{timeout:5},async(_url,options)=>{signal=options.signal;await new Promise(r=>setTimeout(r,30));return{status:200,headers:new globalThis.Headers(),body:{async cancel(){assert.equal(signal.aborted,true);cancels++;}}};})),/REQUEST_TIMEOUT/);
  await new Promise(r=>setTimeout(r,40));assert.equal(cancels,1);
});
test('F2 noncooperative reader/cancellation settles rejection with abort before asynchronous cleanup',async()=>{
  let signal,cancels=0;const started=globalThis.performance.now();
  await assert.rejects(deadline(safeGet(OFFLINE_WEB_ORIGIN,{timeout:10},async(_url,options)=>{signal=options.signal;return{status:200,headers:new globalThis.Headers(),body:{getReader:()=>({read:()=>new Promise(()=>{}),cancel(){cancels++;assert.equal(signal.aborted,true);return new Promise(()=>{});}})}};})),/REQUEST_TIMEOUT/);
  assert.equal(cancels,1);assert.ok(globalThis.performance.now()-started<200);
});
test('F2 oversized stream aborts before a pending cancel and never reads or decodes the next chunk',async()=>{
  let signal,reads=0,cancels=0;
  await assert.rejects(deadline(safeGet(OFFLINE_WEB_ORIGIN,{timeout:100,maxBytes:2},async(_url,options)=>{signal=options.signal;return{status:200,headers:new globalThis.Headers(),body:{getReader:()=>({async read(){reads++;return{done:false,value:new Uint8Array([1,2,3])};},cancel(){cancels++;assert.equal(signal.aborted,true);return new Promise(()=>{});}})}};})),/RESPONSE_TOO_LARGE/);
  assert.equal(reads,1);assert.equal(cancels,1);
});
test('F2 UTF-8 characters split between chunks preserve text and obey exact byte cap',async()=>{
  const transport=async()=>({status:200,headers:new globalThis.Headers(),body:new globalThis.ReadableStream({start(c){for(const n of [0xe2,0x82,0xac])c.enqueue(new Uint8Array([n]));c.close();}})});
  assert.equal((await safeGet(OFFLINE_WEB_ORIGIN,{maxBytes:3},transport)).body,'€');
  await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{maxBytes:2},transport),/RESPONSE_TOO_LARGE/);
});
test('F2 malformed stream values fail with a constant error and timers do not survive successful reads',async()=>{
  for(const chunk of [null,{done:'yes'},{done:false,value:CANARY}])await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{timeout:20},async()=>({status:200,headers:new globalThis.Headers(),body:{getReader:()=>({read:async()=>chunk,cancel:async()=>{}})}})),/INVALID_RESPONSE/);
  let signal;await safeGet(OFFLINE_WEB_ORIGIN,{timeout:20},async(_url,o)=>{signal=o.signal;return response();});await new Promise(r=>setTimeout(r,25));assert.equal(signal.aborted,false);
});
test('F3 public exported entries have zero default/global fetch path, including rejected production names',async()=>{
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error(CANARY);};
  try {
    for(const target of [OFFLINE_WEB_ORIGIN,'https://egyhealth360.vercel.app','https://egyhealth360-prefix.vercel.app']) {
      await assert.rejects(safeGet(target),/TEST_TRANSPORT_REQUIRED/);
      await assert.rejects(safeGet(target,{},globalThis.fetch),/TEST_TRANSPORT_REQUIRED/);
      const report=await runPreviewSafetyCheck({url:target});assert.equal(report.overallStatus,'FAIL');clean(report);
    }
    assert.equal(calls,0);
    // Injection is a trusted-code boundary, not a sandbox for arbitrary wrappers.
    await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{},()=>globalThis.fetch()),/FETCH_FAILED/);assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
test('F3 old test escape flags cannot approve real origins even with an injected function',async()=>{
  for(const field of ['allowTestHttp','allowAnyPathInTest']) {
    let calls=0;await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{[field]:true},async()=>{calls++;return response();}),/TEST_OPTIONS_REJECTED/);assert.equal(calls,0);
  }
});
test('F4 entire300–399 range aborts/cancels before body processing, with exactly one request and no Location access',async()=>{
  for(let status=300;status<=399;status++) {
    let calls=0,reads=0,cancels=0,signal;
    await assert.rejects(safeGet(OFFLINE_WEB_ORIGIN,{},async(_url,o)=>{calls++;signal=o.signal;return{status,headers:{get(){throw new Error(CANARY);}},body:{getReader(){reads++;},async cancel(){assert.equal(signal.aborted,true);cancels++;}}};}),/REDIRECTS_PROHIBITED/);
    assert.equal(calls,1);assert.equal(reads,0);assert.equal(cancels,1);
  }
});

test('F1 invalid SHA is rejected before any fixture call and is never attested or reflected',async()=>{
  let calls=0;const report=await runPreviewSafetyCheck({url:OFFLINE_WEB_ORIGIN,expectedSha:CANARY},async()=>{calls++;return response();});
  assert.equal(calls,0);assert.equal(report.overallStatus,'FAIL');clean(report);
});
test('F2 report probes share one owned deadline instead of resetting the budget per response',async()=>{
  let calls=0;const report=await deadline(runPreviewSafetyCheck({url:OFFLINE_WEB_ORIGIN,apiUrl:OFFLINE_API_ORIGIN,timeout:5},async()=>{calls++;await new Promise(r=>setTimeout(r,25));return response();}));
  assert.equal(report.overallStatus,'FAIL');assert.equal(calls,1);assert.ok(report.checks.some(c=>c.details.errorCategory==='REQUEST_TIMEOUT'));
});
const cli=(args)=>{
  const guard='globalThis.fetch=()=>{process.stderr.write("FORBIDDEN_NETWORK_CALL");throw new Error("NO_NETWORK");};';
  const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(guard),resolve('scripts/verify-public-preview.mjs'),...args],{encoding:'utf8',timeout:3000});
  assert.ifError(result.error);assert.doesNotMatch(result.stdout+result.stderr,/FORBIDDEN_NETWORK_CALL/);assert.doesNotMatch(result.stdout+result.stderr,new RegExp(CANARY));return result;
};
test('F1/F3 actual CLI JSON/stdout/stderr/terminal reject malformed fixture status without reflection',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'eh135-'+CANARY+'-'));const file=join(dir,CANARY+'.json');
  try {
    for(const status of [CANARY,null,{secret:CANARY},'200',0,999,200.5]) {
      await writeFile(file,JSON.stringify({default:{status,body:'<html>OK</html>',headers:{'content-type':'text/html'}}}));
      for(const flags of [[],['--json']]) {
        const r=cli(['--offline-fixture',file,...flags]);assert.equal(r.status,1);assert.match(r.stdout,/INVALID_RESPONSE/);
        if(flags.length) {const report=JSON.parse(r.stdout);assert.equal(report.mode,'OFFLINE_ONLY');assert.equal(report.overallStatus,'FAIL');}
      }
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('F1 actual CLI rejected URL/apiUrl/ports/flags/duplicate targets and file errors have fixed output',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'eh135-'+CANARY+'-'));const file=join(dir,CANARY+'.json');
  try {
    await writeFile(file,'{invalid '+CANARY);
    const cases=[[],['--url',`https://egyhealth360-${CANARY.toLowerCase()}.vercel.app/`],['--'+CANARY],['--url',OFFLINE_WEB_ORIGIN,OFFLINE_WEB_ORIGIN],['--offline-fixture',join(dir,'MISSING-'+CANARY)],['--offline-fixture',file],['--offline-fixture',file,'--url',`${OFFLINE_WEB_ORIGIN}/${CANARY}`],['--offline-fixture',file,'--api-url',`${OFFLINE_API_ORIGIN}:8443/`]];
    for(const args of cases)assert.equal(cli(args).status,1);
    await writeFile(file,'x'.repeat(2*1024*1024+1));assert.equal(cli(['--offline-fixture',file]).status,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('F3 actual CLI succeeds only with explicit local bounded streaming fixtures and keeps all hosted gates unverified',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'eh135-fixture-'));const file=join(dir,'fixture.json');
  const health={status:200,headers:{'content-type':'application/json'},body:JSON.stringify({data:{status:'ok',extra:CANARY}})};
  try {
    await writeFile(file,JSON.stringify({web:{status:200,headers:{'content-type':'text/html','x-content-type-options':'nosniff'},body:`<html>${CANARY}</html>`},health,api:health}));
    const result=cli(['--offline-fixture',file,'--api-url',OFFLINE_API_ORIGIN,'--json']);assert.equal(result.status,0);
    const report=JSON.parse(result.stdout);assert.equal(report.mode,'OFFLINE_ONLY');assert.equal(report.overallStatus,'PASS');assert.equal(report.clinicalReadiness,'NOT_VERIFIED');assert.equal(report.originOwnership,'NOT_VERIFIED');assert.equal(report.dnsSocketSafety,'NOT_VERIFIED');assert.equal(report.expectedSha,null);
    const terminal=cli(['--offline-fixture',file]);assert.equal(terminal.status,0);assert.match(terminal.stdout,/OFFLINE_ONLY/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
