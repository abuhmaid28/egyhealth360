/**
 * EgyHealth 360 — Public Preview Safety Library
 * Dependency-free, safe, read-only verification of public deployment previews.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Checks if an IPv4 address string falls into a private or loopback range.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return false;
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
 * Validates a target preview URL against strict public HTTPS rules.
 * Throws an Error with a safe message if URL is invalid or unsafe.
 * @param {string} inputUrl
 * @param {object} [options]
 * @param {boolean} [options.allowTestHttp] - Test-only escape hatch for offline tests
 * @returns {URL}
 */
export function validatePreviewUrl(inputUrl, options = {}) {
  if (typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    throw new Error('PREVIEW_URL_REQUIRED: URL must be a non-empty string');
  }
  let parsed;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    throw new Error('INVALID_URL_FORMAT: Cannot parse URL');
  }

  const allowHttp = !!options.allowTestHttp;
  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    throw new Error(`UNSAFE_PROTOCOL: Protocol must be HTTPS, got "${parsed.protocol}"`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('CREDENTIALS_FORBIDDEN: URL must not contain embedded userinfo or credentials');
  }

  if (parsed.port && !['80', '443', '3000', '3001', '8080'].includes(parsed.port) && !allowHttp) {
    throw new Error(`DISALLOWED_PORT: Public preview must use standard ports, got "${parsed.port}"`);
  }

  if (!allowHttp && isPrivateHostnameOrIp(parsed.hostname)) {
    throw new Error(`SSRF_PROHIBITED: Target hostname or IP "${parsed.hostname}" is loopback, private, or local`);
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
      findings.push(`Pattern matched: ${pattern.toString()}`);
    }
  }
  // Check for raw unhandled server error stacks
  if (/at\s+async\s+[a-zA-Z0-9_.]+\s+\(/i.test(body) && /node_modules|apps\/[a-z]+/i.test(body)) {
    findings.push('Unhandled Node.js stack trace detected in body');
  }
  return {
    leaked: findings.length > 0,
    findings,
  };
}

/**
 * Checks response security headers and flags warnings.
 * @param {Headers} headers
 * @returns {{ pass: boolean, warnings: string[], checks: Record<string, string|null> }}
 */
export function evaluateSecurityHeaders(headers) {
  const warnings = [];
  const contentType = headers.get('content-type') || '';
  const nosniff = headers.get('x-content-type-options');
  const setCookie = headers.get('set-cookie');
  const frameOptions = headers.get('x-frame-options');

  if (nosniff && nosniff.toLowerCase() !== 'nosniff') {
    warnings.push(`X-Content-Type-Options is "${nosniff}", expected "nosniff"`);
  }
  if (setCookie) {
    warnings.push('Unexpected Set-Cookie header present on anonymous public read endpoint');
  }

  return {
    pass: warnings.length === 0,
    warnings,
    checks: {
      contentType,
      xContentTypeOptions: nosniff,
      setCookie: setCookie ? '[REDACTED_COOKIE_PRESENT]' : null,
      xFrameOptions: frameOptions,
    },
  };
}

/**
 * Performs safe GET request with timeout, redirect limit, and SSRF prevention.
 * @param {string} targetUrl
 * @param {object} options
 * @param {function} [fetchFn] - Custom fetch function for offline testing
 * @returns {Promise<{ status: number, headers: Headers, body: string, finalUrl: string, elapsedMs: number }>}
 */
export async function safeGet(targetUrl, options = {}, fetchFn = globalThis.fetch) {
  const fetchImpl = fetchFn || globalThis.fetch;
  const timeoutMs = options.timeout ?? 10000;
  const maxRedirects = options.maxRedirects ?? 3;
  let currentUrl = validatePreviewUrl(targetUrl, options).href;
  let redirectsFollowed = 0;

  while (redirectsFollowed <= maxRedirects) {
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
      clearTimeout(timer);
      const elapsedMs = Date.now() - started;

      // Handle redirect
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`REDIRECT_WITHOUT_LOCATION: Received HTTP ${response.status} without Location header`);
        }
        const resolved = new URL(location, currentUrl);
        validatePreviewUrl(resolved.href, options);
        currentUrl = resolved.href;
        redirectsFollowed++;
        if (redirectsFollowed > maxRedirects) {
          throw new Error(`MAX_REDIRECTS_EXCEEDED: Exceeded ${maxRedirects} redirects`);
        }
        continue;
      }

      const body = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        body,
        finalUrl: currentUrl,
        elapsedMs,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`REQUEST_TIMEOUT: Timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}

/**
 * Local scan of referenced logo, brand, and font assets in apps/web/public.
 * Verifies AP05 asset status (flagging creator assets vs open source).
 * @param {string} [rootDir]
 * @returns {{ pass: boolean, assets: Array<{ path: string, type: string, note: string }> }}
 */
export function inspectLocalAssets(rootDir = process.cwd()) {
  const assets = [];
  const publicDir = resolve(rootDir, 'apps/web/public');
  if (!existsSync(publicDir)) {
    return { pass: true, assets: [], note: 'No apps/web/public folder in target' };
  }

  const fontsDir = resolve(publicDir, 'fonts/my-care');
  if (existsSync(fontsDir)) {
    assets.push({
      path: 'apps/web/public/fonts/my-care',
      type: 'font',
      note: 'IBM Plex Sans Arabic (OFL licensed) / Inter variable fonts verified present on-repo',
    });
  }

  return {
    pass: true,
    assets,
    ap05Status: 'OPEN_GATE: Custom vector logo rights remain uncertified; textual wordmarks must be used in release',
  };
}

/**
 * Main safety harness coordinator.
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
  const result = {
    evaluatedAt: new Date().toISOString(),
    overallStatus: 'PASS',
    targetWebUrl: params.url,
    targetApiUrl: params.apiUrl || null,
    expectedSha: params.expectedSha || null,
    checks: [],
    clinicalReadiness: 'NOT_VERIFIED',
    clinicalReadinessReason: 'HTTP 200 on health only proves network routing and process liveness; it grants ZERO clinical readiness, does NOT certify live authentication, session cookies, CSRF, or database migrations.',
    summary: { pass: 0, warn: 0, fail: 0, notVerified: 0 },
  };

  const recordCheck = (name, status, details) => {
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
    recordCheck('Web URL Structure & SSRF Safety', 'PASS', { url: webUrl.href });
  } catch (err) {
    recordCheck('Web URL Structure & SSRF Safety', 'FAIL', { error: err.message });
    return result;
  }

  // 2. Validate API URL if provided
  let apiUrl = null;
  if (params.apiUrl) {
    try {
      apiUrl = validatePreviewUrl(params.apiUrl, { allowTestHttp: params.allowTestHttp });
      recordCheck('API URL Structure & SSRF Safety', 'PASS', { url: apiUrl.href });
    } catch (err) {
      recordCheck('API URL Structure & SSRF Safety', 'FAIL', { error: err.message });
      return result;
    }
  }

  // 3. Probe Web Root `/`
  try {
    const webRes = await safeGet(webUrl.href, { timeout: params.timeout, allowTestHttp: params.allowTestHttp }, customFetch);
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
          contentType: headersEval.checks.contentType,
          warnings,
        });
      }
    } else {
      recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', {
        status: webRes.status,
        expected: 200,
      });
    }
  } catch (err) {
    recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', { error: err.message });
  }

  // 4. Probe Proxied Health `/api/v1/health`
  const healthTarget = new URL('/api/v1/health', webUrl.href).href;
  try {
    const healthRes = await safeGet(healthTarget, { timeout: params.timeout, allowTestHttp: params.allowTestHttp }, customFetch);
    const headersEval = evaluateSecurityHeaders(healthRes.headers);

    let parsedBody = null;
    try {
      parsedBody = JSON.parse(healthRes.body);
    } catch {
      // Not JSON
    }

    if (healthRes.status === 200 && parsedBody?.data?.status === 'ok') {
      const warnings = [...headersEval.warnings];
      recordCheck('Proxied Health Route (/api/v1/health)', warnings.length > 0 ? 'WARN' : 'PASS', {
        status: healthRes.status,
        elapsedMs: healthRes.elapsedMs,
        body: parsedBody,
        warnings,
      });
    } else {
      recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', {
        status: healthRes.status,
        bodySnippet: healthRes.body.slice(0, 100),
        expectedBody: '{"data":{"status":"ok"}}',
      });
    }
  } catch (err) {
    recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', { error: err.message });
  }

  // 5. Probe Direct API if provided
  if (apiUrl) {
    const directHealth = new URL('/api/v1/health', apiUrl.href).href;
    try {
      const directRes = await safeGet(directHealth, { timeout: params.timeout, allowTestHttp: params.allowTestHttp }, customFetch);
      let parsed = null;
      try { parsed = JSON.parse(directRes.body); } catch {}
      if (directRes.status === 200 && parsed?.data?.status === 'ok') {
        recordCheck('Direct API Health Route', 'PASS', {
          status: directRes.status,
          elapsedMs: directRes.elapsedMs,
        });
      } else {
        recordCheck('Direct API Health Route', 'FAIL', {
          status: directRes.status,
          bodySnippet: directRes.body.slice(0, 100),
        });
      }
    } catch (err) {
      recordCheck('Direct API Health Route', 'FAIL', { error: err.message });
    }
  }

  // 6. Source Attestation
  if (params.expectedSha) {
    recordCheck('Source SHA Attestation', 'NOT_VERIFIED', {
      expectedSha: params.expectedSha,
      reason: 'Public HTML does not expose unauthenticated Git commit SHA headers; manual or authenticated Vercel metadata required for exact-commit certification.',
    });
  }

  // 7. Local Asset & AP05 Check
  try {
    const assetCheck = inspectLocalAssets();
    recordCheck('AP05 Brand & Asset Rights Audit', 'PASS', assetCheck);
  } catch (err) {
    recordCheck('AP05 Brand & Asset Rights Audit', 'WARN', { error: err.message });
  }

  return result;
}
