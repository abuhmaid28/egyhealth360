/**
 * EgyHealth 360 — Public Preview Safety Library
 * Dependency-free, safe, read-only verification of public deployment previews.
 *
 * Security Invariants:
 * 1. F1: Strict reporting secrecy: allowlisted report fields, fixed error categories, zero reflection.
 * 2. F2: Real streaming resource limits with byte-counting, early stream cancellation, and end-to-end deadline.
 * 3. F3: Bounded to approved EgyHealth preview origins (egyhealth360-*.vercel.app); strict test transport isolation.
 * 4. F4: Zero redirects followed: every 3xx is immediately rejected with REDIRECTS_PROHIBITED.
 * 5. AP05 asset audit marks status NOT_VERIFIED / OPEN_GATE (inventory != license clearance).
 * 6. Never conflates HTTP 200 with Live clinical release readiness.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Fixed, allowlisted error categories preventing user data / exception message reflection */
export const ERROR_CATEGORIES = {
  PREVIEW_URL_REQUIRED: 'PREVIEW_URL_REQUIRED',
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',
  UNSAFE_PROTOCOL: 'UNSAFE_PROTOCOL',
  CREDENTIALS_FORBIDDEN: 'CREDENTIALS_FORBIDDEN',
  DISALLOWED_PORT: 'DISALLOWED_PORT',
  QUERY_PARAMETERS_FORBIDDEN: 'QUERY_PARAMETERS_FORBIDDEN',
  FRAGMENT_FORBIDDEN: 'FRAGMENT_FORBIDDEN',
  IP_HOSTNAME_FORBIDDEN: 'IP_HOSTNAME_FORBIDDEN',
  SSRF_PROHIBITED: 'SSRF_PROHIBITED',
  UNTRUSTED_PREVIEW_DOMAIN: 'UNTRUSTED_PREVIEW_DOMAIN',
  DISALLOWED_PATH: 'DISALLOWED_PATH',
  REDIRECTS_PROHIBITED: 'REDIRECTS_PROHIBITED',
  RESPONSE_TOO_LARGE: 'RESPONSE_TOO_LARGE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  TEST_TRANSPORT_REQUIRED: 'TEST_TRANSPORT_REQUIRED',
  FETCH_FAILED: 'FETCH_FAILED',
  INVALID_HEALTH_PAYLOAD: 'INVALID_HEALTH_PAYLOAD',
  INVALID_SHA_FORMAT: 'INVALID_SHA_FORMAT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Maps any error or message into a fixed allowlisted error category string.
 * @param {unknown} err
 * @returns {string}
 */
export function getSafeErrorCategory(err) {
  if (!err) return ERROR_CATEGORIES.UNKNOWN_ERROR;
  const msg = typeof err === 'string' ? err : err.message || '';
  for (const cat of Object.keys(ERROR_CATEGORIES)) {
    if (msg.startsWith(cat)) return cat;
  }
  if (err.name === 'AbortError') return ERROR_CATEGORIES.REQUEST_TIMEOUT;
  return ERROR_CATEGORIES.FETCH_FAILED;
}

/**
 * Checks if an IPv4 address string falls into a private or loopback range.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 127) return true; // Loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

/**
 * Checks if an IPv6 or hostname is private or loopback.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isPrivateHostnameOrIp(hostname) {
  const clean = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (clean === 'localhost' || clean.endsWith('.localhost') || clean.endsWith('.local') || clean.endsWith('.internal')) {
    return true;
  }
  if (isPrivateIpv4(clean)) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (clean.startsWith('::ffff:')) {
    const v4 = clean.slice(7);
    if (isPrivateIpv4(v4)) return true;
  }
  // IPv6 loopback / unspecified
  if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1') return true;
  // Unique local fc00::/7 (fc.. or fd..)
  if (/^f[cd][0-9a-f]{2}:/i.test(clean)) return true;
  // Link-local fe80::/10 (fe8, fe9, fea, feb)
  if (/^fe[89ab][0-9a-f]:/i.test(clean)) return true;
  return false;
}

/**
 * Checks if a hostname is an IP address literal (IPv4 or IPv6).
 * @param {string} hostname
 * @returns {boolean}
 */
export function isIpLiteral(hostname) {
  const clean = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (clean.includes(':')) return true;
  return false;
}

/**
 * Sanitizes input URL for reporting. Returns [INVALID_TARGET] for unparseable or disallowed URLs.
 * Never echoes raw unparsed inputs, userinfo, query strings, or fragments.
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeUrlForReport(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') return '[INVALID_TARGET]';
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '[INVALID_TARGET]';
    }
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    const cleanPath = parsed.pathname === '' || parsed.pathname === '/' ? '/' : parsed.pathname;
    return `${parsed.origin}${cleanPath}`;
  } catch {
    /* Invalid URL format: never echo raw input! */
    return '[INVALID_TARGET]';
  }
}

/**
 * Pattern for approved public EgyHealth preview project hostnames.
 * Matches egyhealth360.vercel.app or egyhealth360-*.vercel.app.
 * Strictly prevents arbitrary foreign *.vercel.app projects.
 */
export const APPROVED_EGYHEALTH_PREVIEW_PATTERN = /^egyhealth360(?:-[a-z0-9-]+)?\.vercel\.app$/i;

/**
 * Validates a target preview URL against strict public HTTPS rules.
 * Throws an Error with a fixed category string if URL is invalid or unsafe.
 * @param {string} inputUrl
 * @param {object} [options]
 * @param {boolean} [options.allowTestHttp] - Test-only escape hatch for offline tests
 * @param {boolean} [options.allowAnyPathInTest] - Test-only escape hatch for path tests
 * @returns {URL}
 */
export function validatePreviewUrl(inputUrl, options = {}) {
  if (typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    throw new Error(ERROR_CATEGORIES.PREVIEW_URL_REQUIRED);
  }
  let parsed;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    throw new Error(ERROR_CATEGORIES.INVALID_URL_FORMAT);
  }

  const allowTest = !!options.allowTestHttp;

  // 1. Protocol: HTTPS only in public mode
  if (parsed.protocol !== 'https:' && !(allowTest && parsed.protocol === 'http:')) {
    throw new Error(ERROR_CATEGORIES.UNSAFE_PROTOCOL);
  }

  // 2. Reject embedded userinfo
  if (parsed.username || parsed.password) {
    throw new Error(ERROR_CATEGORIES.CREDENTIALS_FORBIDDEN);
  }

  // 3. Port: Port 443 ONLY (or omitted). No arbitrary ports in public mode.
  if (parsed.port && parsed.port !== '443' && !allowTest) {
    throw new Error(ERROR_CATEGORIES.DISALLOWED_PORT);
  }

  // 4. Query parameters and fragments strictly forbidden
  if (parsed.search && parsed.search !== '') {
    throw new Error(ERROR_CATEGORIES.QUERY_PARAMETERS_FORBIDDEN);
  }
  if (parsed.hash && parsed.hash !== '') {
    throw new Error(ERROR_CATEGORIES.FRAGMENT_FORBIDDEN);
  }

  // 5. Hostname & IP Restrictions: must match approved EgyHealth project preview
  if (!allowTest) {
    if (isIpLiteral(parsed.hostname)) {
      throw new Error(ERROR_CATEGORIES.IP_HOSTNAME_FORBIDDEN);
    }
    if (isPrivateHostnameOrIp(parsed.hostname)) {
      throw new Error(ERROR_CATEGORIES.SSRF_PROHIBITED);
    }
    if (!APPROVED_EGYHEALTH_PREVIEW_PATTERN.test(parsed.hostname)) {
      throw new Error(ERROR_CATEGORIES.UNTRUSTED_PREVIEW_DOMAIN);
    }
  }

  // 6. Path restrictions: Only '/' or '/api/v1/health' allowed
  const normalizedPath = parsed.pathname === '' ? '/' : parsed.pathname;
  const allowedPaths = ['/', '/api/v1/health'];
  if (!allowedPaths.includes(normalizedPath) && !options.allowAnyPathInTest) {
    throw new Error(ERROR_CATEGORIES.DISALLOWED_PATH);
  }

  return parsed;
}

/**
 * Known sensitive tokens or environment variables to detect in HTML bodies.
 */
export const SENSITIVE_PATTERNS = [
  /DATABASE_URL\s*[:=]/i,
  /postgres(?:ql)?:\/\/[^\s"'<>]+/i,
  /AUTH_SESSION_SECRET\s*[:=]/i,
  /VERCEL_TOKEN\s*[:=]/i,
  /BEGIN (?:RSA )?PRIVATE KEY/i,
  /password\s*[:=]\s*["'][^"']{6,}["']/i,
  /jwt_secret/i,
  /neon\.tech\/[a-z0-9_-]+\?sslmode=/i,
];

/**
 * Scans an HTML body for accidental secret leakage or stack traces.
 * @param {string} body
 * @returns {{ leaked: boolean, findings: string[] }}
 */
export function scanBodyForLeaks(body) {
  if (typeof body !== 'string') return { leaked: false, findings: [] };
  const findings = [];
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(body)) {
      findings.push('SENSITIVE_PATTERN_MATCHED');
    }
  }
  // Check for raw unhandled server error stacks
  if (/at\s+async\s+[a-zA-Z0-9_.]+\s+\(/i.test(body) && /node_modules|apps\/[a-z]+/i.test(body)) {
    findings.push('UNHANDLED_STACK_TRACE_MATCHED');
  }
  return {
    leaked: findings.length > 0,
    findings,
  };
}

/**
 * Checks response security headers without reflecting unvalidated header values.
 * @param {Headers} headers
 * @returns {{ pass: boolean, warnings: string[], checks: { isHtml: boolean, isJson: boolean, hasNosniff: boolean } }}
 */
export function evaluateSecurityHeaders(headers) {
  const warnings = [];
  const contentType = (headers?.get('content-type') || '').toLowerCase();
  const nosniff = headers?.get('x-content-type-options');
  const setCookie = headers?.get('set-cookie');

  const isHtml = contentType.includes('text/html');
  const isJson = contentType.includes('application/json');
  const hasNosniff = nosniff ? nosniff.toLowerCase() === 'nosniff' : false;

  if (nosniff && !hasNosniff) {
    warnings.push('INVALID_NOSNIFF_HEADER');
  }
  if (setCookie) {
    warnings.push('UNEXPECTED_SET_COOKIE');
  }

  return {
    pass: warnings.length === 0,
    warnings,
    checks: {
      isHtml,
      isJson,
      hasNosniff,
    },
  };
}

/** Maximum allowed response size: 1MB for web root, 64KB for health */
export const DEFAULT_MAX_BODY_BYTES = 1048576; // 1 MB
export const HEALTH_MAX_BODY_BYTES = 65536; // 64 KB

/**
 * Performs safe GET request with complete streaming resource bounds:
 * - Reject ALL redirects immediately (Finding F4).
 * - Real streaming chunk byte counting with early reader cancellation (Finding F2).
 * - Enforces explicit offline transport injection when test options are active (Finding F3).
 * - Fixed error categories (Finding F1).
 *
 * @param {string} targetUrl
 * @param {object} [options]
 * @param {number} [options.timeout]
 * @param {number} [options.maxBytes]
 * @param {boolean} [options.allowTestHttp]
 * @param {boolean} [options.allowAnyPathInTest]
 * @param {function} [fetchFn] - Custom fetch function for offline testing
 * @returns {Promise<{ status: number, headers: Headers, body: string, finalUrl: string, elapsedMs: number }>}
 */
export async function safeGet(targetUrl, options = {}, fetchFn = globalThis.fetch) {
  // Finding F3: If relaxed test options are active, an explicit injected offline transport is MANDATORY!
  if (options.allowTestHttp || options.allowAnyPathInTest) {
    if (!fetchFn || fetchFn === globalThis.fetch) {
      throw new Error(ERROR_CATEGORIES.TEST_TRANSPORT_REQUIRED);
    }
  }

  const fetchImpl = fetchFn || globalThis.fetch;
  const timeoutMs = options.timeout ?? 10000;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const initialUrl = validatePreviewUrl(targetUrl, options);
  const currentUrl = initialUrl.href;

  const started = Date.now();
  const controller = new globalThis.AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': 'EgyHealth360-ReleaseSafetyHarness/1.0',
      },
      signal: controller.signal,
    });

    // Finding F4: REJECT ALL REDIRECTS! Zero redirects followed!
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (response.body && typeof response.body.cancel === 'function') {
        try { await response.body.cancel(); } catch { /* ignore stream cancel */ }
      }
      throw new Error(ERROR_CATEGORIES.REDIRECTS_PROHIBITED);
    }

    // Upfront Content-Length check if provided
    const clHeader = response.headers?.get('content-length');
    if (clHeader) {
      const clNum = Number(clHeader);
      if (!Number.isNaN(clNum) && clNum > maxBytes) {
        if (response.body && typeof response.body.cancel === 'function') {
          try { await response.body.cancel(); } catch { /* ignore stream cancel */ }
        }
        throw new Error(ERROR_CATEGORIES.RESPONSE_TOO_LARGE);
      }
    }

    // Finding F2: Real streaming resource limits with early cancellation
    let bodyText = '';
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let totalBytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            controller.abort();
            throw new Error(ERROR_CATEGORIES.RESPONSE_TOO_LARGE);
          }
          bodyText += decoder.decode(value, { stream: true });
        }
        bodyText += decoder.decode(); // flush remaining
      } catch (streamErr) {
        if (streamErr.message === ERROR_CATEGORIES.RESPONSE_TOO_LARGE) throw streamErr;
        if (streamErr.name === 'AbortError') throw new Error(ERROR_CATEGORIES.REQUEST_TIMEOUT);
        throw streamErr;
      }
    } else {
      // Offline / mock fetch fallback
      const rawText = await response.text();
      const encoder = new TextEncoder();
      const actualByteLength = encoder.encode(rawText).byteLength;
      if (actualByteLength > maxBytes) {
        throw new Error(ERROR_CATEGORIES.RESPONSE_TOO_LARGE);
      }
      bodyText = rawText;
    }

    const elapsedMs = Date.now() - started;
    return {
      status: response.status,
      headers: response.headers,
      body: bodyText,
      finalUrl: currentUrl,
      elapsedMs,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(ERROR_CATEGORIES.REQUEST_TIMEOUT);
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * Local scan of referenced logo, brand, and font assets in apps/web/public.
 * Verifies AP05 asset status (inventory check only, NOT rights clearance).
 * @param {string} [rootDir]
 * @returns {{ pass: boolean, status: string, assets: Array<{ path: string, type: string, note: string }>, ap05Status: string }}
 */
export function inspectLocalAssets(rootDir = process.cwd()) {
  const assets = [];
  const publicDir = resolve(rootDir, 'apps/web/public');
  if (!existsSync(publicDir)) {
    return {
      pass: false,
      status: 'NOT_VERIFIED',
      assets: [],
      ap05Status: 'NOT_VERIFIED: apps/web/public directory not found; assets cannot be audited',
    };
  }

  const fontsDir = resolve(publicDir, 'fonts/my-care');
  if (existsSync(fontsDir)) {
    assets.push({
      path: 'apps/web/public/fonts/my-care',
      type: 'font',
      note: 'Local font assets folder present; contents, license clearance, and creator rights unverified on-repo (inventory check only)',
    });
  }

  return {
    pass: false, // NOT pass: presence of files is not license or trademark clearance
    status: 'NOT_VERIFIED',
    assets,
    ap05Status: 'OPEN_GATE: Local font asset presence is an inventory check only, NOT proof of third-party creator rights or trademark clearance. AP05 creator rights gate remains OPEN.',
  };
}

/**
 * Main safety harness coordinator.
 * Strictly allowlisted report fields, zero raw exception or unvetted header reflection.
 * @param {object} params
 * @param {string} params.url - Web root URL
 * @param {string} [params.apiUrl] - Optional separate API URL
 * @param {string} [params.expectedSha] - Optional expected Git SHA
 * @param {number} [params.timeout]
 * @param {boolean} [params.allowTestHttp]
 * @param {function} [customFetch]
 * @returns {Promise<object>} Full verified report
 */
export async function runPreviewSafetyCheck(params, customFetch) {
  // Finding F3: If relaxed test options are active, explicit injected offline transport is required!
  if (params.allowTestHttp) {
    if (!customFetch || customFetch === globalThis.fetch) {
      return {
        evaluatedAt: new Date().toISOString(),
        overallStatus: 'FAIL',
        targetWebUrl: '[TEST_TRANSPORT_REQUIRED]',
        targetApiUrl: null,
        expectedSha: null,
        checks: [{
          name: 'Test Transport Isolation Check',
          status: 'FAIL',
          details: { errorCategory: ERROR_CATEGORIES.TEST_TRANSPORT_REQUIRED },
        }],
        ssrfPolicy: 'Restricted to approved egyhealth360-*.vercel.app preview hosts on port 443.',
        clinicalReadiness: 'NOT_VERIFIED',
        clinicalReadinessReason: 'HTTP 200 on health only proves network routing and process liveness; it grants ZERO clinical readiness.',
        summary: { pass: 0, warn: 0, fail: 1, notVerified: 0 },
      };
    }
  }

  // Finding F1: Sanitize URLs immediately before storing in report
  const safeWebUrl = sanitizeUrlForReport(params.url);
  const safeApiUrl = params.apiUrl ? sanitizeUrlForReport(params.apiUrl) : null;

  const result = {
    evaluatedAt: new Date().toISOString(),
    overallStatus: 'PASS',
    targetWebUrl: safeWebUrl,
    targetApiUrl: safeApiUrl,
    expectedSha: null,
    checks: [],
    ssrfPolicy: 'Restricted to approved egyhealth360-*.vercel.app preview hosts on port 443; socket-level DNS pinning is unverified in standard Node fetch.',
    clinicalReadiness: 'NOT_VERIFIED',
    clinicalReadinessReason: 'HTTP 200 on health only proves network routing and process liveness; it grants ZERO clinical readiness, does NOT certify live authentication, session cookies, CSRF, or database migrations.',
    summary: { pass: 0, warn: 0, fail: 0, notVerified: 0 },
  };

  const recordCheck = (name, status, details = {}) => {
    result.checks.push({ name, status, details });
    if (status === 'PASS') result.summary.pass++;
    else if (status === 'WARN') {
      result.summary.warn++;
      if (result.overallStatus !== 'FAIL') result.overallStatus = 'WARN';
    } else if (status === 'FAIL') {
      result.summary.fail++;
      result.overallStatus = 'FAIL';
    } else {
      result.summary.notVerified++;
    }
  };

  // 1. Validate Web URL
  let webUrl;
  try {
    webUrl = validatePreviewUrl(params.url, { allowTestHttp: params.allowTestHttp });
    recordCheck('Web URL Structure & Preview Origin Safety', 'PASS', { origin: webUrl.origin });
  } catch (err) {
    recordCheck('Web URL Structure & Preview Origin Safety', 'FAIL', { errorCategory: getSafeErrorCategory(err) });
    return result;
  }

  // 2. Validate API URL if provided
  let apiUrl = null;
  if (params.apiUrl) {
    try {
      apiUrl = validatePreviewUrl(params.apiUrl, { allowTestHttp: params.allowTestHttp });
      recordCheck('API URL Structure & Preview Origin Safety', 'PASS', { origin: apiUrl.origin });
    } catch (err) {
      recordCheck('API URL Structure & Preview Origin Safety', 'FAIL', { errorCategory: getSafeErrorCategory(err) });
      return result;
    }
  }

  // 3. Probe Web Root `/`
  try {
    const webRes = await safeGet(webUrl.origin + '/', {
      timeout: params.timeout,
      allowTestHttp: params.allowTestHttp,
      maxBytes: DEFAULT_MAX_BODY_BYTES,
    }, customFetch);
    const leakCheck = scanBodyForLeaks(webRes.body);
    const headersEval = evaluateSecurityHeaders(webRes.headers);

    if (webRes.status === 200) {
      if (leakCheck.leaked) {
        recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', {
          status: webRes.status,
          leaks: leakCheck.findings,
        });
      } else {
        const warnings = [...headersEval.warnings];
        recordCheck('Web Root Public Exposure & Leak Check', warnings.length > 0 ? 'WARN' : 'PASS', {
          status: webRes.status,
          elapsedMs: webRes.elapsedMs,
          isHtml: headersEval.checks.isHtml,
          warnings,
        });
      }
    } else {
      recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', {
        status: webRes.status,
        errorCategory: 'NON_200_STATUS',
      });
    }
  } catch (err) {
    recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', { errorCategory: getSafeErrorCategory(err) });
  }

  // 4. Probe Proxied Health `/api/v1/health`
  const healthTarget = webUrl.origin + '/api/v1/health';
  try {
    const healthRes = await safeGet(healthTarget, {
      timeout: params.timeout,
      allowTestHttp: params.allowTestHttp,
      maxBytes: HEALTH_MAX_BODY_BYTES,
    }, customFetch);
    const headersEval = evaluateSecurityHeaders(healthRes.headers);

    let parsedBody = null;
    try {
      parsedBody = JSON.parse(healthRes.body);
    } catch {
      /* ignore non-json response */
    }

    if (healthRes.status === 200 && parsedBody?.data?.status === 'ok') {
      const warnings = [...headersEval.warnings];
      recordCheck('Proxied Health Route (/api/v1/health)', warnings.length > 0 ? 'WARN' : 'PASS', {
        status: healthRes.status,
        elapsedMs: healthRes.elapsedMs,
        healthStatus: 'ok',
        warnings,
      });
    } else {
      recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', {
        status: healthRes.status,
        errorCategory: ERROR_CATEGORIES.INVALID_HEALTH_PAYLOAD,
      });
    }
  } catch (err) {
    recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', { errorCategory: getSafeErrorCategory(err) });
  }

  // 5. Probe Direct API if provided
  if (apiUrl) {
    const directHealth = apiUrl.origin + '/api/v1/health';
    try {
      const directRes = await safeGet(directHealth, {
        timeout: params.timeout,
        allowTestHttp: params.allowTestHttp,
        maxBytes: HEALTH_MAX_BODY_BYTES,
      }, customFetch);
      let parsed = null;
      try {
        parsed = JSON.parse(directRes.body);
      } catch {
        /* ignore non-json response */
      }
      if (directRes.status === 200 && parsed?.data?.status === 'ok') {
        recordCheck('Direct API Health Route', 'PASS', {
          status: directRes.status,
          elapsedMs: directRes.elapsedMs,
          healthStatus: 'ok',
        });
      } else {
        recordCheck('Direct API Health Route', 'FAIL', {
          status: directRes.status,
          errorCategory: ERROR_CATEGORIES.INVALID_HEALTH_PAYLOAD,
        });
      }
    } catch (err) {
      recordCheck('Direct API Health Route', 'FAIL', { errorCategory: getSafeErrorCategory(err) });
    }
  }

  // 6. Source Attestation (Finding F1: strictly validated expectedSha)
  if (params.expectedSha) {
    if (/^[0-9a-f]{40}$/i.test(params.expectedSha)) {
      result.expectedSha = params.expectedSha.toLowerCase();
      recordCheck('Source SHA Attestation', 'NOT_VERIFIED', {
        expectedSha: params.expectedSha.toLowerCase(),
        reason: 'Public HTML does not expose unauthenticated Git commit SHA headers; manual or authenticated Vercel metadata required for exact-commit certification.',
      });
    } else {
      recordCheck('Source SHA Attestation', 'FAIL', {
        errorCategory: ERROR_CATEGORIES.INVALID_SHA_FORMAT,
      });
    }
  }

  // 7. Local Asset & AP05 Check: NOT_VERIFIED (OPEN_GATE)
  try {
    const assetCheck = inspectLocalAssets();
    recordCheck('AP05 Brand & Asset Rights Audit', 'NOT_VERIFIED', {
      status: assetCheck.status,
      ap05Status: assetCheck.ap05Status,
      assets: assetCheck.assets,
    });
  } catch {
    recordCheck('AP05 Brand & Asset Rights Audit', 'NOT_VERIFIED', {
      status: 'NOT_VERIFIED',
      errorCategory: ERROR_CATEGORIES.UNKNOWN_ERROR,
    });
  }

  return result;
}
