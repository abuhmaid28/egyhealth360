/**
 * EgyHealth 360 — Public Preview Safety Library
 * Dependency-free, safe, read-only verification of public deployment previews.
 *
 * Security Invariants:
 * 1. Enforces HTTPS on standard port 443 only (no arbitrary ports).
 * 2. Restricts preview domains to reviewed *.vercel.app hosts; bans IP literals.
 * 3. Rejects queries, fragments, and disallowed paths (permits only / and /api/v1/health).
 * 4. Strictly forbids cross-origin redirects and redirects with query/fragment.
 * 5. Complete end-to-end timeout covering body consumption; strict response byte caps.
 * 6. Zero secret leakage: sanitizes URL userinfo and never logs raw response bodies or unvetted JSON.
 * 7. AP05 asset audit returns NOT_VERIFIED / OPEN_GATE (inventory != license clearance).
 * 8. Never conflates HTTP 200 with Live clinical release readiness.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
 * Sanitizes any raw input URL before recording in logs, reports, or terminal outputs.
 * Completely removes userinfo (passwords/tokens), search params, and hash fragments.
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeUrlForReport(rawUrl) {
  if (typeof rawUrl !== 'string') return '[NON_STRING_URL]';
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    // Fallback: strip userinfo pattern if URL parsing fails
    return rawUrl.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@').slice(0, 120);
  }
}

/**
 * Pattern for approved public Vercel preview hostnames.
 * Matches *.vercel.app, e.g. egyhealth360-preview.vercel.app
 */
export const APPROVED_VERCEL_PREVIEW_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.vercel\.app$/i;

/**
 * Validates a target preview URL against strict public HTTPS rules.
 * Throws an Error with a safe message if URL is invalid or unsafe.
 * @param {string} inputUrl
 * @param {object} [options]
 * @param {boolean} [options.allowTestHttp] - Test-only escape hatch for offline tests
 * @param {boolean} [options.isInspectionRoute] - Whether validating an inspection subroute (/api/v1/health)
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

  const allowTest = !!options.allowTestHttp;

  // 1. Protocol: HTTPS only in public mode
  if (parsed.protocol !== 'https:' && !(allowTest && parsed.protocol === 'http:')) {
    throw new Error(`UNSAFE_PROTOCOL: Protocol must be HTTPS, got "${parsed.protocol}"`);
  }

  // 2. Reject embedded userinfo
  if (parsed.username || parsed.password) {
    throw new Error('CREDENTIALS_FORBIDDEN: URL must not contain embedded userinfo or credentials');
  }

  // 3. Port: Port 443 ONLY (or omitted). No arbitrary ports like 3000, 3001, 8080 in public mode.
  if (parsed.port && parsed.port !== '443' && !allowTest) {
    throw new Error(`DISALLOWED_PORT: Public preview must use standard HTTPS port 443, got "${parsed.port}"`);
  }

  // 4. Query parameters and fragments strictly forbidden
  if (parsed.search && parsed.search !== '') {
    throw new Error('QUERY_PARAMETERS_FORBIDDEN: Target URL must not contain query parameters');
  }
  if (parsed.hash && parsed.hash !== '') {
    throw new Error('FRAGMENT_FORBIDDEN: Target URL must not contain URL fragments');
  }

  // 5. Hostname & IP Restrictions
  if (!allowTest) {
    if (isIpLiteral(parsed.hostname)) {
      throw new Error(`IP_HOSTNAME_FORBIDDEN: Public preview requires a domain hostname, got IP literal "${parsed.hostname}"`);
    }
    if (isPrivateHostnameOrIp(parsed.hostname)) {
      throw new Error(`SSRF_PROHIBITED: Target hostname "${parsed.hostname}" is loopback, private, or local`);
    }
    if (!APPROVED_VERCEL_PREVIEW_PATTERN.test(parsed.hostname)) {
      throw new Error(`UNTRUSTED_PREVIEW_DOMAIN: Target hostname "${parsed.hostname}" must be an approved *.vercel.app domain`);
    }
  }

  // 6. Path restrictions: Only '/' or '/api/v1/health' allowed
  const normalizedPath = parsed.pathname === '' ? '/' : parsed.pathname;
  const allowedPaths = ['/', '/api/v1/health'];
  if (!allowedPaths.includes(normalizedPath) && !options.allowAnyPathInTest) {
    throw new Error(`DISALLOWED_PATH: Target URL path must be root / or /api/v1/health, got "${normalizedPath}"`);
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

/** Maximum allowed response size: 1MB for web root, 64KB for health */
export const DEFAULT_MAX_BODY_BYTES = 1048576; // 1 MB
export const HEALTH_MAX_BODY_BYTES = 65536; // 64 KB

/**
 * Performs safe GET request with complete end-to-end timeout, strict redirect limits,
 * response size ceiling, and same-origin redirect enforcement.
 * @param {string} targetUrl
 * @param {object} options
 * @param {number} [options.timeout]
 * @param {number} [options.maxRedirects]
 * @param {number} [options.maxBytes]
 * @param {boolean} [options.allowTestHttp]
 * @param {function} [fetchFn] - Custom fetch function for offline testing
 * @returns {Promise<{ status: number, headers: Headers, body: string, finalUrl: string, elapsedMs: number }>}
 */
export async function safeGet(targetUrl, options = {}, fetchFn = globalThis.fetch) {
  const fetchImpl = fetchFn || globalThis.fetch;
  const timeoutMs = options.timeout ?? 10000;
  const maxRedirects = options.maxRedirects ?? 2;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const initialUrl = validatePreviewUrl(targetUrl, options);
  let currentUrl = initialUrl.href;
  const initialOrigin = initialUrl.origin;
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

      // Handle redirect
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`REDIRECT_WITHOUT_LOCATION: Received HTTP ${response.status} without Location header`);
        }
        const resolved = new URL(location, currentUrl);

        // Strict redirect invariant: SAME-ORIGIN ONLY!
        if (resolved.origin !== initialOrigin) {
          throw new Error(`CROSS_ORIGIN_REDIRECT_FORBIDDEN: Redirect to foreign origin "${resolved.origin}" is forbidden`);
        }

        // Validate redirect target against safe path & no-query invariants
        validatePreviewUrl(resolved.href, options);
        currentUrl = resolved.href;
        redirectsFollowed++;
        if (redirectsFollowed > maxRedirects) {
          throw new Error(`MAX_REDIRECTS_EXCEEDED: Exceeded ${maxRedirects} redirects`);
        }
        continue;
      }

      // Check Content-Length if provided before reading full body
      const clHeader = response.headers.get('content-length');
      if (clHeader) {
        const clNum = Number(clHeader);
        if (!Number.isNaN(clNum) && clNum > maxBytes) {
          throw new Error(`RESPONSE_TOO_LARGE: Content-Length ${clNum} exceeds limit of ${maxBytes} bytes`);
        }
      }

      // Read body text while controller timeout remains active!
      const body = await response.text();
      if (body.length > maxBytes) {
        throw new Error(`RESPONSE_TOO_LARGE: Body size ${body.length} exceeds limit of ${maxBytes} bytes`);
      }

      const elapsedMs = Date.now() - started;
      return {
        status: response.status,
        headers: response.headers,
        body,
        finalUrl: currentUrl,
        elapsedMs,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`REQUEST_TIMEOUT: Request and body consumption timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      globalThis.clearTimeout(timer);
    }
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
      note: 'IBM Plex Sans Arabic (OFL licensed) / Inter variable fonts present on-repo (inventory check only)',
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
  // Sanitize URLs immediately before storing in report
  const safeWebUrl = sanitizeUrlForReport(params.url);
  const safeApiUrl = params.apiUrl ? sanitizeUrlForReport(params.apiUrl) : null;

  const result = {
    evaluatedAt: new Date().toISOString(),
    overallStatus: 'PASS',
    targetWebUrl: safeWebUrl,
    targetApiUrl: safeApiUrl,
    expectedSha: params.expectedSha || null,
    checks: [],
    ssrfPolicy: 'Restricted to approved *.vercel.app preview hosts on port 443; socket-level DNS pinning is unverified in standard Node fetch.',
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
    recordCheck('Web URL Structure & Preview Origin Safety', 'PASS', { origin: webUrl.origin });
  } catch (err) {
    recordCheck('Web URL Structure & Preview Origin Safety', 'FAIL', { error: err.message.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@') });
    return result;
  }

  // 2. Validate API URL if provided
  let apiUrl = null;
  if (params.apiUrl) {
    try {
      apiUrl = validatePreviewUrl(params.apiUrl, { allowTestHttp: params.allowTestHttp });
      recordCheck('API URL Structure & Preview Origin Safety', 'PASS', { origin: apiUrl.origin });
    } catch (err) {
      recordCheck('API URL Structure & Preview Origin Safety', 'FAIL', { error: err.message.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@') });
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
    recordCheck('Web Root Public Exposure & Leak Check', 'FAIL', { error: err.message.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@') });
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
      // Non-JSON response
    }

    if (healthRes.status === 200 && parsedBody?.data?.status === 'ok') {
      const warnings = [...headersEval.warnings];
      recordCheck('Proxied Health Route (/api/v1/health)', warnings.length > 0 ? 'WARN' : 'PASS', {
        status: healthRes.status,
        elapsedMs: healthRes.elapsedMs,
        healthStatus: parsedBody.data.status, // Only record allowlisted field!
        warnings,
      });
    } else {
      recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', {
        status: healthRes.status,
        errorCategory: 'INVALID_HEALTH_PAYLOAD',
        expectedPayload: '{"data":{"status":"ok"}}',
      });
    }
  } catch (err) {
    recordCheck('Proxied Health Route (/api/v1/health)', 'FAIL', { error: err.message.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@') });
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
      try { parsed = JSON.parse(directRes.body); } catch { /* ignore non-json response */ }
      if (directRes.status === 200 && parsed?.data?.status === 'ok') {
        recordCheck('Direct API Health Route', 'PASS', {
          status: directRes.status,
          elapsedMs: directRes.elapsedMs,
          healthStatus: parsed.data.status,
        });
      } else {
        recordCheck('Direct API Health Route', 'FAIL', {
          status: directRes.status,
          errorCategory: 'INVALID_DIRECT_HEALTH_PAYLOAD',
        });
      }
    } catch (err) {
      recordCheck('Direct API Health Route', 'FAIL', { error: err.message.replace(/:\/\/[^@/\s]+@/g, '://[REDACTED]@') });
    }
  }

  // 6. Source Attestation
  if (params.expectedSha) {
    recordCheck('Source SHA Attestation', 'NOT_VERIFIED', {
      expectedSha: params.expectedSha,
      reason: 'Public HTML does not expose unauthenticated Git commit SHA headers; manual or authenticated Vercel metadata required for exact-commit certification.',
    });
  }

  // 7. Local Asset & AP05 Check: NOT_VERIFIED (OPEN_GATE)
  try {
    const assetCheck = inspectLocalAssets();
    recordCheck('AP05 Brand & Asset Rights Audit', 'NOT_VERIFIED', {
      status: assetCheck.status,
      ap05Status: assetCheck.ap05Status,
      assets: assetCheck.assets,
    });
  } catch (err) {
    recordCheck('AP05 Brand & Asset Rights Audit', 'NOT_VERIFIED', { error: err.message });
  }

  return result;
}
