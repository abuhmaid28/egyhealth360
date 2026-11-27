/**
 * Issue #203 (G2-Q1) pure diagnostic, privacy-scan, observer, and isolation helpers.
 * No import-time side effects, no shell interpolation, no network or DB I/O.
 */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';

export const APPLICATION = '94f3b75476a43ac0118665aecf75a2ce471190b0';
export const HARNESS_BASE = '781e92bffea26f79c5a89abab79158072383feda';
export const ALLOWLIST = Object.freeze([
  'scripts/support/f06-auth-context.mjs',
  'scripts/test-ui-f06-auth-context.mjs',
  'tests/ui-f06-auth-context.test.mjs',
]);

export const AUTH_LEDGER = Object.freeze({
  migrations: 1,
  identities: 2,
  loginMaximum: 3,
  logoutMaximum: 7,
  clinicalFixtures: 0,
  clinicalWrites: 0,
});

export const OMITTED_HISTORICAL_VARIABLES = Object.freeze([
  'clinicalFixtures',
  'clinicianAndAdminBrowserSessions',
  'postR06MatrixGroups',
]);

export const DIAGNOSTIC_CASES = Object.freeze([
  'LOGIN_BROWSER_A',
  'ME_BROWSER_A',
  'LOGIN_RAW_A',
  'ME_ABSENT',
  'ME_MALFORMED',
  'ME_UNKNOWN',
  'ME_DUPLICATE',
  'LOGIN_RAW_B_ROTATE',
  'ME_ROTATED',
  'CSRF_ABSENT',
  'CSRF_EMPTY',
  'CSRF_MALFORMED',
  'CSRF_OLD',
  'CSRF_DUPLICATE',
  'ME_ACTIVE_B',
  'LOGOUT_VALID_B',
  'ME_LOGGED_OUT',
  'LOGOUT_REVOKED',
]);

export const DIAGNOSTIC_PHASES = Object.freeze([
  'preflight',
  'build',
  'start',
  'migrations',
  'auth-setup',
  'R01/R02',
  'R04',
  'R05/R06',
  'observer',
  'R13',
]);

export const DIAGNOSTIC_PREDICATES = Object.freeze([
  'STATUS_MATCH',
  'NO_STORE_HEADER',
  'JSON_PARSED',
  'TOP_OBJECT',
  'TOP_ERROR_ONLY',
  'ERROR_OBJECT',
  'ERROR_EXACT_KEYS',
  'ERROR_CODE_STRING',
  'ERROR_MESSAGE_STRING',
  'ERROR_CODE_MATCH',
  'SET_COOKIE_PRESENT',
  'SET_COOKIE_CLEARED',
  'EMPTY_BODY',
  'PRIVACY_CLEAN',
  'DRIVER_PATTERN_ABSENT',
  'OBSERVER_QUIESCENT',
]);

export const ALLOWLISTED_ERROR_CODES = Object.freeze([
  'AUTH_UNAUTHENTICATED',
  'AUTH_CSRF_INVALID',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_SERVICE_UNAVAILABLE',
  'REQUEST_INVALID',
  'REQUEST_TOO_LARGE',
  'REQUEST_CONTENT_TYPE_INVALID',
  'ROUTE_NOT_FOUND',
  'DATABASE_UNAVAILABLE',
]);

const PROJECT_PATTERN = /^eh203-q1-[a-f0-9]{12}$/;
const RESPONSE_LEAK_PATTERNS = [
  /postgresql:\/\//i,
  /postgres:/i,
  /\bSELECT\s+/i,
  /\bINSERT\s+/i,
  /\bUPDATE\s+/i,
  /\bDELETE\s+/i,
  /password_hash/i,
  /eh-pw-v1\$/i,
  /(?:__Host-)?eh_session=[A-Za-z0-9_=-]{8,}/i,
  /\bx-csrf-token\b/i,
  /\bstack\b/i,
];

const RECEIPT_LEAK_PATTERNS = [
  /postgresql:\/\//i,
  /eh-pw-v1\$/i,
  /(?:__Host-)?eh_session=[A-Za-z0-9_=-]{8,}/i,
  /password_hash/i,
];

export class DiagnosticAssertionError extends Error {
  constructor(caseId, failedPredicates, projection) {
    const primary = failedPredicates[0] ?? 'UNKNOWN_FAILURE';
    super(`DIAGNOSTIC_FAILURE:${caseId}:${primary}`);
    this.name = 'DiagnosticAssertionError';
    this.caseId = caseId;
    this.failedPredicates = Object.freeze([...failedPredicates]);
    this.projection = Object.freeze({ ...projection });
  }
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function parseOptions(args) {
  const values = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert.ok(['--evidence-dir', '--chromium'].includes(key), 'UNKNOWN_DIAGNOSTIC_OPTION');
    assert.ok(!Object.hasOwn(values, key), 'DUPLICATE_DIAGNOSTIC_OPTION');
    const value = args[++i];
    assert.ok(typeof value === 'string' && value.length > 0 && isAbsolute(value), 'INVALID_OPTION_PATH');
    values[key] = resolve(value);
  }
  assert.ok(values['--evidence-dir'], 'MISSING_EVIDENCE_DIR');
  return { evidence: values['--evidence-dir'], chromium: values['--chromium'] };
}

export function assertOwnedProject(project) {
  assert.equal(typeof project, 'string');
  assert.match(project, PROJECT_PATTERN, 'INVALID_OWNED_PROJECT_NAME');
  return project;
}

export function assertLoopbackHttpUrl(targetUrl, allowedHosts = ['localhost', '127.0.0.1']) {
  const url = targetUrl instanceof URL ? targetUrl : new URL(targetUrl);
  assert.equal(url.protocol, 'http:', 'NON_HTTP_TARGET_REJECTED');
  assert.ok(allowedHosts.includes(url.hostname), 'FOREIGN_TARGET_REJECTED');
  assert.ok(url.port && Number(url.port) >= 1024, 'UNBOUNDED_PORT_REJECTED');
  assert.equal(url.username + url.password, '', 'URL_CREDENTIALS_REJECTED');
  return url;
}

export function assertIsolatedComposeConfig(config, project, apiPort, webPort) {
  assertOwnedProject(project);
  assert.ok(Number.isInteger(apiPort) && apiPort >= 1024 && apiPort <= 65535, 'INVALID_API_PORT');
  assert.ok(Number.isInteger(webPort) && webPort >= 1024 && webPort <= 65535, 'INVALID_WEB_PORT');
  assert.notEqual(apiPort, webPort, 'DUPLICATE_LOOPBACK_PORTS');
  assert.equal(config?.name, project, 'COMPOSE_PROJECT_MISMATCH');
  assert.equal(Object.keys(config?.volumes ?? {}).length, 0, 'NAMED_VOLUMES_FORBIDDEN');
  assert.equal(config?.services?.postgres?.volumes?.[0]?.type, 'tmpfs', 'POSTGRES_TMPFS_REQUIRED');
  assert.ok(!config?.services?.postgres?.ports, 'POSTGRES_PORT_PUBLICATION_FORBIDDEN');
  assert.deepEqual(config?.services?.api?.build?.args, { EH_UI_API_ORIGIN: 'http://api:3001' });
  const apiPorts = config?.services?.api?.ports ?? [];
  const webPorts = config?.services?.web?.ports ?? [];
  assert.equal(apiPorts.length, 1);
  assert.equal(webPorts.length, 1);
  assert.equal(apiPorts[0].host_ip, '127.0.0.1');
  assert.equal(String(apiPorts[0].published), String(apiPort));
  assert.equal(webPorts[0].host_ip, '127.0.0.1');
  assert.equal(String(webPorts[0].published), String(webPort));
}

export function cookieAttributes(header) {
  assert.equal(typeof header, 'string', 'MISSING_SET_COOKIE_HEADER');
  const [cookie, ...parts] = header.split(';');
  const fields = Object.fromEntries(parts.map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key.toLowerCase(), value.length ? value.join('=') : true];
  }));
  return {
    name: cookie.split('=')[0],
    httpOnly: fields.httponly === true,
    secure: fields.secure === true,
    sameSite: fields.samesite,
    path: fields.path,
    domainPresent: Object.hasOwn(fields, 'domain'),
    maxAge: Number(fields['max-age']),
  };
}

export function scanSensitiveText(text, markers = [], patterns = RESPONSE_LEAK_PATTERNS) {
  const source = typeof text === 'string' ? text : '';
  const uniqueMarkers = [...new Set(markers)].filter(v => typeof v === 'string' && v.length > 0);
  const markerHits = uniqueMarkers.filter(value => source.includes(value)).length;
  const patternHits = patterns.filter(re => re.test(source)).length;
  return {
    scanned: true,
    markerCount: uniqueMarkers.length,
    markerHits,
    patternHits,
    leaksDetected: markerHits + patternHits,
    clean: markerHits === 0 && patternHits === 0,
  };
}

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function classifyErrorCategory(status, errorCode) {
  if (errorCode === 'AUTH_CSRF_INVALID') return 'CSRF';
  if (errorCode && errorCode.startsWith('AUTH_')) return 'AUTH';
  if (errorCode && errorCode.startsWith('REQUEST_')) return 'REQUEST';
  if (status >= 500) return 'UPSTREAM';
  return 'UNKNOWN';
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== 'object') return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined;
  return headers[name.toLowerCase()];
}

function firstSetCookie(headers) {
  const value = headerValue(headers, 'set-cookie');
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Scans response bytes in memory BEFORE evaluating or throwing any assertion,
 * returning a sanitized projection with fixed enums and booleans only.
 */
export function inspectAuthResponse({
  caseId,
  phase,
  endpoint,
  method,
  callSite,
  expectedStatus,
  expectedCode = null,
  expectSetCookie = false,
  expectClearedCookie = false,
  expectEmptyBody = false,
  response,
  secretMarkers = [],
}) {
  assert.ok(DIAGNOSTIC_CASES.includes(caseId), 'INVALID_DIAGNOSTIC_CASE');
  assert.ok(DIAGNOSTIC_PHASES.includes(phase), 'INVALID_DIAGNOSTIC_PHASE');

  const text = typeof response?.text === 'string' ? response.text : '';
  const scan = scanSensitiveText(text, secretMarkers);
  const cacheControl = headerValue(response?.headers, 'cache-control');
  const setCookie = firstSetCookie(response?.headers);
  const cookieAttrs = typeof setCookie === 'string' ? cookieAttributes(setCookie) : null;

  let json = response?.json;
  let jsonParsed = isPlainRecord(json) || Array.isArray(json);
  if (json === undefined && text.length > 0 && !expectEmptyBody) {
    try {
      json = JSON.parse(text);
      jsonParsed = true;
    } catch {
      jsonParsed = false;
    }
  }

  const actualStatus = Number(response?.status ?? 0);
  const cachePresent = typeof cacheControl === 'string' && cacheControl.length > 0;
  const noStore = cacheControl === 'no-store';
  const topObject = isPlainRecord(json);
  const topKeys = topObject ? Object.keys(json) : [];
  const topErrorOnly = topObject && topKeys.length === 1 && topKeys[0] === 'error';
  const errorObj = topErrorOnly ? json.error : null;
  const errorObject = isPlainRecord(errorObj);
  const errorKeys = errorObject ? Object.keys(errorObj).sort() : [];
  const exactErrorKeys = errorObject && errorKeys.length === 2 && errorKeys[0] === 'code' && errorKeys[1] === 'message';
  const codeString = Boolean(errorObject && typeof errorObj.code === 'string' && errorObj.code.length > 0);
  const messageString = Boolean(errorObject && typeof errorObj.message === 'string' && errorObj.message.length > 0);
  const rawCode = codeString ? errorObj.code : null;
  const errorCode = rawCode && ALLOWLISTED_ERROR_CODES.includes(rawCode)
    ? rawCode
    : rawCode
      ? 'NON_ALLOWLISTED'
      : null;

  const setCookiePresent = typeof setCookie === 'string';
  const setCookieCleared = Boolean(cookieAttrs && cookieAttrs.maxAge === 0);
  const emptyBody = text.length === 0;
  const statusMatch = actualStatus === expectedStatus;
  const errorCodeMatch = expectedCode === null || rawCode === expectedCode;

  const failedPredicates = [];
  if (scan.markerHits > 0) failedPredicates.push('PRIVACY_CLEAN');
  if (scan.patternHits > 0) failedPredicates.push('DRIVER_PATTERN_ABSENT');
  if (!statusMatch) failedPredicates.push('STATUS_MATCH');
  if (!noStore) failedPredicates.push('NO_STORE_HEADER');
  if (expectEmptyBody) {
    if (!emptyBody) failedPredicates.push('EMPTY_BODY');
  } else {
    if (!jsonParsed) failedPredicates.push('JSON_PARSED');
    if (!topObject) failedPredicates.push('TOP_OBJECT');
    if (!topErrorOnly && expectedStatus >= 400) failedPredicates.push('TOP_ERROR_ONLY');
    if (expectedStatus >= 400) {
      if (!errorObject) failedPredicates.push('ERROR_OBJECT');
      if (!exactErrorKeys) failedPredicates.push('ERROR_EXACT_KEYS');
      if (!codeString) failedPredicates.push('ERROR_CODE_STRING');
      if (!messageString) failedPredicates.push('ERROR_MESSAGE_STRING');
      if (!errorCodeMatch) failedPredicates.push('ERROR_CODE_MATCH');
    }
  }
  if (expectSetCookie && !setCookiePresent) {
    failedPredicates.push('SET_COOKIE_PRESENT');
  }
  if (expectClearedCookie) {
    if (!setCookiePresent) failedPredicates.push('SET_COOKIE_PRESENT');
    if (!setCookieCleared) failedPredicates.push('SET_COOKIE_CLEARED');
  }

  const projection = {
    caseId,
    phase,
    endpoint,
    method,
    callSite,
    expectedStatus,
    actualStatus,
    cachePresent,
    noStore,
    jsonParsed,
    topObject,
    topErrorOnly,
    errorObject,
    exactErrorKeys,
    codeString,
    messageString,
    errorCodeMatch,
    errorCode,
    errorCategory: classifyErrorCategory(actualStatus, errorCode),
    setCookiePresent,
    setCookieCleared,
    emptyBody,
    bodyBytes: Buffer.byteLength(text, 'utf8'),
    elapsedMs: Number.isFinite(response?.elapsedMs) ? Math.max(0, Math.round(response.elapsedMs)) : 0,
    scanCoverage: {
      scanned: scan.scanned,
      markerCount: scan.markerCount,
      leaksDetected: scan.leaksDetected,
      driverPatternDetected: scan.patternHits > 0,
    },
    failedPredicates,
  };

  if (failedPredicates.length > 0) {
    throw new DiagnosticAssertionError(caseId, failedPredicates, projection);
  }
  return projection;
}

export function createBudgetTracker(ledger = AUTH_LEDGER) {
  const counts = { identities: 0, login: 0, logout: 0 };
  return {
    recordIdentity() {
      counts.identities += 1;
      assert.ok(counts.identities <= ledger.identities, 'IDENTITY_BUDGET_EXCEEDED');
      return counts.identities;
    },
    recordAuthRequest(kind) {
      assert.ok(['login', 'logout'].includes(kind), 'INVALID_AUTH_REQUEST_KIND');
      counts[kind] += 1;
      const limit = kind === 'login' ? ledger.loginMaximum : ledger.logoutMaximum;
      assert.ok(counts[kind] <= limit, `AUTH_${kind.toUpperCase()}_BUDGET_EXCEEDED`);
      return counts[kind];
    },
    snapshot() {
      return { ...counts };
    },
  };
}

export function assertDatabaseWrites(before, after, { allowAuthMutations = false } = {}) {
  assert.equal(after.unsafeAudit, 0, 'UNSAFE_AUDIT_METADATA');
  for (const table of Object.keys(before.hashes)) {
    if (allowAuthMutations && ['sessions', 'audit_logs'].includes(table)) continue;
    assert.equal(before.hashes[table], after.hashes[table], 'UNEXPECTED_DATABASE_WRITE');
  }
  if (allowAuthMutations) {
    const allowedAudits = new Set(['AUTH_LOGIN', 'AUTH_SESSION_REVOKED']);
    for (const key of new Set([...Object.keys(before.audits), ...Object.keys(after.audits)])) {
      if (!allowedAudits.has(key)) {
        assert.equal(before.audits[key] ?? 0, after.audits[key] ?? 0, 'UNEXPECTED_AUDIT_ACTION');
      }
    }
  }
}

export function createObserverMetrics() {
  return {
    requestsStarted: 0,
    requestsFinished: 0,
    requestsFailed: 0,
    drainsStarted: 0,
    drainsCompleted: 0,
    drainCancelled: 0,
    drainErrors: 0,
    scansStarted: 0,
    scansCompleted: 0,
    scanErrors: 0,
  };
}

export function assertObserverQuiescent(metrics, activeSizes = { inflight: 0, drains: 0, scans: 0 }) {
  assert.equal(activeSizes.inflight, 0, 'OBSERVER_INFLIGHT_ACTIVE');
  assert.equal(activeSizes.drains, 0, 'OBSERVER_DRAINS_ACTIVE');
  assert.equal(activeSizes.scans, 0, 'OBSERVER_SCANS_ACTIVE');
  assert.equal(metrics.drainErrors, 0, 'OBSERVER_DRAIN_ERRORS');
  assert.equal(metrics.scanErrors, 0, 'OBSERVER_SCAN_ERRORS');
  assert.equal(metrics.drainsStarted, metrics.drainsCompleted, 'OBSERVER_DRAIN_MISMATCH');
  assert.equal(metrics.scansStarted, metrics.scansCompleted, 'OBSERVER_SCAN_MISMATCH');
}

/**
 * Summarizes browser cookie presence/clear/match using SHA-256 digests only.
 * Never returns or retains raw cookie values.
 */
export function summarizeBrowserCookieState(cookies, expectedDigest = null) {
  const matches = (cookies ?? []).filter(c => c?.name === 'eh_session');
  if (matches.length === 0) {
    return { present: false, cleared: true, matchesCurrentSession: false, count: 0 };
  }
  const value = matches[0]?.value ?? '';
  const digest = value ? sha256Hex(value) : null;
  return {
    present: Boolean(value),
    cleared: !value,
    matchesCurrentSession: Boolean(expectedDigest && digest && digest === expectedDigest),
    count: matches.length,
  };
}

export function finalizeSafeReceipt(receipt, secretMarkers = []) {
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  const scan = scanSensitiveText(serialized, secretMarkers, RECEIPT_LEAK_PATTERNS);
  assert.ok(scan.clean, 'RECEIPT_PRIVACY_VIOLATION');
  return { serialized, receiptSha256: sha256Hex(serialized), scan };
}
