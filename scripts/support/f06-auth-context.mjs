/**
 * Issue #203 (G2-Q1) pure diagnostic, privacy-scan, observer, and isolation helpers.
 * No import-time side effects, no shell interpolation, no network or DB I/O.
 */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

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
  'JSON_BODY_MATCH',
  'TOP_OBJECT',
  'TOP_ERROR_ONLY',
  'ERROR_OBJECT',
  'ERROR_EXACT_KEYS',
  'ERROR_CODE_STRING',
  'ERROR_MESSAGE_STRING',
  'ERROR_CODE_MATCH',
  'SUCCESS_SHAPE_VALID',
  'ACTOR_IDENTITY_MATCH',
  'CSRF_TOKEN_MATCH',
  'SET_COOKIE_PRESENT',
  'SET_COOKIE_ABSENT',
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

export const AUTHORIZED_SUCCESS_ENDPOINTS = Object.freeze([
  'AUTH_LOGIN',
  'AUTH_ME',
  'ME_PROFILE',
]);

const ALLOWED_ROLES = new Set(['PATIENT', 'CLINICIAN', 'PHARMACY_STAFF', 'LAB_STAFF', 'ADMIN']);
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PROJECT_PATTERN = /^eh203-q1-[a-f0-9]{12}$/;

export const DOM_LEAK_PATTERNS = Object.freeze([
  /postgresql:\/\//i,
  /postgres:/i,
  /password_hash/i,
  /eh-pw-v1\$/i,
  /(?:__Host-)?eh_session=[A-Za-z0-9_=-]{8,}/i,
]);

export const RESPONSE_LEAK_PATTERNS = Object.freeze([
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
]);

const RECEIPT_LEAK_PATTERNS = Object.freeze([
  /postgresql:\/\//i,
  /eh-pw-v1\$/i,
  /(?:__Host-)?eh_session=[A-Za-z0-9_=-]{8,}/i,
  /password_hash/i,
]);

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
  const pgVolumes = config?.services?.postgres?.volumes ?? [];
  assert.equal(pgVolumes.length, 1, 'POSTGRES_TMPFS_REQUIRED');
  assert.equal(pgVolumes[0]?.type, 'tmpfs', 'POSTGRES_TMPFS_REQUIRED');
  assert.equal(pgVolumes[0]?.target, '/var/lib/postgresql', 'POSTGRES_TMPFS_REQUIRED');
  assert.ok(!config?.services?.postgres?.ports, 'POSTGRES_PORT_PUBLICATION_FORBIDDEN');
  assert.ok(!config?.services?.worker?.ports || config.services.worker.ports.length === 0, 'WORKER_PORT_PUBLICATION_FORBIDDEN');
  for (const svcName of ['api', 'web', 'worker']) {
    assert.ok(!config?.services?.[svcName]?.volumes?.length, 'APP_VOLUME_MOUNTS_FORBIDDEN');
  }
  for (const svcName of ['api', 'web', 'worker', 'postgres']) {
    assert.ok(!config?.services?.[svcName]?.privileged, 'PRIVILEGED_CONTAINER_FORBIDDEN');
    assert.ok(!config?.services?.[svcName]?.network_mode, 'CUSTOM_NETWORK_MODE_FORBIDDEN');
  }
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

function exactSortedKeys(obj, expectedSorted) {
  if (!isPlainRecord(obj)) return false;
  const actual = Object.keys(obj).sort();
  return actual.length === expectedSorted.length && actual.every((k, idx) => k === expectedSorted[idx]);
}

function isValidActorRecord(actor) {
  return isPlainRecord(actor)
    && typeof actor.id === 'string' && actor.id.length > 0
    && typeof actor.profileId === 'string' && actor.profileId.length > 0
    && typeof actor.email === 'string' && actor.email.length > 0
    && typeof actor.displayName === 'string' && actor.displayName.length > 0;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, offset);
    if (idx === -1) return count;
    count += 1;
    offset = idx + needle.length;
  }
}

export function buildDomScanPolicy({ activeActor, allUsers, runtimeSecrets = [], staleCsrfTokens = [] }) {
  assert.ok(isValidActorRecord(activeActor), 'INVALID_ACTIVE_ACTOR');
  const allMarkers = [...new Set(
    Object.values(allUsers ?? {}).flatMap(u => [u?.id, u?.profileId, u?.email, u?.displayName]),
  )].filter(v => typeof v === 'string' && v.length > 0);
  const activeVisibleAllowed = new Set([activeActor.email, activeActor.displayName]);
  const secretSet = [...new Set([...runtimeSecrets, ...staleCsrfTokens])].filter(v => typeof v === 'string' && v.length > 0);
  return {
    domMarkers: [...new Set([...allMarkers.filter(m => !activeVisibleAllowed.has(m)), ...secretSet])],
    storageMarkers: [...new Set([...allMarkers, ...secretSet])],
    cookieMarkers: secretSet,
    patterns: DOM_LEAK_PATTERNS,
  };
}

/**
 * Field-aware, fail-closed scanner for HTTP API responses.
 * Active actor fields are exempted ONLY when status === 200, endpoint + method
 * match a source-supported auth/profile response, exact JSON shape and actor
 * identity validate, and no extra/stale/credential leaks occur anywhere else.
 */
export function scanAuthorizedResponse({
  text,
  status,
  endpoint,
  method,
  activeActor = null,
  allUserMarkers = [],
  credentialSecrets = [],
  staleCsrfTokens = [],
  currentCsrfToken = null,
  allowFreshCsrf = false,
  expectEmptyBody = false,
}) {
  const source = typeof text === 'string' ? text : '';
  const strictMarkers = [...new Set([
    ...allUserMarkers,
    ...credentialSecrets,
    ...staleCsrfTokens,
    ...(currentCsrfToken ? [currentCsrfToken] : []),
  ])].filter(v => typeof v === 'string' && v.length > 0);

  const methodMatches = (endpoint === 'AUTH_LOGIN' && method === 'POST')
    || ((endpoint === 'AUTH_ME' || endpoint === 'ME_PROFILE') && method === 'GET');
  const eligibleForSuccessScope = !expectEmptyBody
    && status === 200
    && AUTHORIZED_SUCCESS_ENDPOINTS.includes(endpoint)
    && methodMatches
    && isValidActorRecord(activeActor);

  if (!eligibleForSuccessScope) {
    return {
      scan: scanSensitiveText(source, strictMarkers, RESPONSE_LEAK_PATTERNS),
      jsonParsed: false,
      parsedJson: null,
      shapeValid: false,
      actorMatch: false,
      csrfMatch: false,
      extractedCsrf: null,
      successScoped: false,
    };
  }

  let parsed = null;
  let jsonParsed = false;
  try {
    parsed = JSON.parse(source);
    jsonParsed = isPlainRecord(parsed) || Array.isArray(parsed);
  } catch {
    jsonParsed = false;
  }

  if (!jsonParsed || !exactSortedKeys(parsed, ['data']) || !isPlainRecord(parsed.data)) {
    return {
      scan: scanSensitiveText(source, strictMarkers, RESPONSE_LEAK_PATTERNS),
      jsonParsed,
      parsedJson: parsed,
      shapeValid: false,
      actorMatch: false,
      csrfMatch: false,
      extractedCsrf: null,
      successScoped: true,
    };
  }

  const data = parsed.data;
  let shapeKeysOk = false;
  let actorMatch = false;
  let csrfMatch = false;
  let extractedCsrf = null;

  if (endpoint === 'AUTH_LOGIN' || endpoint === 'AUTH_ME') {
    shapeKeysOk = exactSortedKeys(data, ['csrfToken', 'session', 'user'])
      && exactSortedKeys(data.user, ['email', 'id', 'role'])
      && exactSortedKeys(data.session, ['expiresAt'])
      && typeof data.session.expiresAt === 'string' && data.session.expiresAt.length > 0
      && typeof data.user.role === 'string' && ALLOWED_ROLES.has(data.user.role)
      && data.user.role === (activeActor.role ?? 'PATIENT');
    actorMatch = shapeKeysOk
      && data.user.id === activeActor.id
      && data.user.email === activeActor.email;
    const csrfWellFormed = shapeKeysOk && typeof data.csrfToken === 'string' && CSRF_TOKEN_PATTERN.test(data.csrfToken);
    const csrfNotForbidden = csrfWellFormed
      && !staleCsrfTokens.includes(data.csrfToken)
      && !credentialSecrets.includes(data.csrfToken)
      && !allUserMarkers.includes(data.csrfToken);
    const csrfExpectedOk = csrfWellFormed
      && (allowFreshCsrf || currentCsrfToken === null || data.csrfToken === currentCsrfToken);
    csrfMatch = csrfWellFormed && csrfNotForbidden && csrfExpectedOk;
    if (shapeKeysOk && actorMatch && csrfMatch) extractedCsrf = data.csrfToken;
  } else if (endpoint === 'ME_PROFILE') {
    shapeKeysOk = exactSortedKeys(data, ['dateOfBirth', 'displayName', 'id', 'sex'])
      && (data.dateOfBirth === null || typeof data.dateOfBirth === 'string')
      && (data.sex === null || typeof data.sex === 'string');
    actorMatch = shapeKeysOk
      && data.id === activeActor.profileId
      && data.displayName === activeActor.displayName;
    csrfMatch = true;
  }

  const shapeValid = Boolean(shapeKeysOk && actorMatch && csrfMatch);
  if (!shapeValid) {
    return {
      scan: scanSensitiveText(source, strictMarkers, RESPONSE_LEAK_PATTERNS),
      jsonParsed,
      parsedJson: parsed,
      shapeValid: false,
      actorMatch,
      csrfMatch,
      extractedCsrf: null,
      successScoped: true,
    };
  }

  const redacted = JSON.parse(JSON.stringify(parsed));
  let exemptValues;
  if (endpoint === 'AUTH_LOGIN' || endpoint === 'AUTH_ME') {
    redacted.data.user.id = '<ACTIVE_ID>';
    redacted.data.user.email = '<ACTIVE_EMAIL>';
    redacted.data.csrfToken = '<ACTIVE_CSRF>';
    exemptValues = [activeActor.id, activeActor.email, data.csrfToken];
  } else {
    redacted.data.id = '<ACTIVE_PROFILE_ID>';
    redacted.data.displayName = '<ACTIVE_DISPLAY_NAME>';
    exemptValues = [activeActor.profileId, activeActor.displayName];
  }

  const allMarkersWithExtractedCsrf = [...new Set([
    ...strictMarkers,
    ...(extractedCsrf ? [extractedCsrf] : []),
  ])].filter(v => typeof v === 'string' && v.length > 0);
  const redactedScan = scanSensitiveText(JSON.stringify(redacted), allMarkersWithExtractedCsrf, RESPONSE_LEAK_PATTERNS);
  const nonExemptMarkers = allMarkersWithExtractedCsrf.filter(m => !exemptValues.includes(m));
  const rawScan = scanSensitiveText(source, nonExemptMarkers, RESPONSE_LEAK_PATTERNS);
  const duplicateExemptHits = exemptValues.filter(v => countOccurrences(source, v) > 1).length;
  const markerHits = redactedScan.markerHits + rawScan.markerHits + duplicateExemptHits;
  const patternHits = Math.max(redactedScan.patternHits, rawScan.patternHits);

  return {
    scan: {
      scanned: true,
      markerCount: allMarkersWithExtractedCsrf.length,
      markerHits,
      patternHits,
      leaksDetected: markerHits + patternHits,
      clean: markerHits === 0 && patternHits === 0,
    },
    jsonParsed,
    parsedJson: parsed,
    shapeValid: true,
    actorMatch: true,
    csrfMatch: true,
    extractedCsrf,
    successScoped: true,
  };
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
  expectNoSetCookie = false,
  expectClearedCookie = false,
  expectEmptyBody = false,
  response,
  secretMarkers = [],
  activeActor = null,
  allUserMarkers = [],
  credentialSecrets = [],
  staleCsrfTokens = [],
  currentCsrfToken = null,
  allowFreshCsrf = false,
}) {
  assert.ok(DIAGNOSTIC_CASES.includes(caseId), 'INVALID_DIAGNOSTIC_CASE');
  assert.ok(DIAGNOSTIC_PHASES.includes(phase), 'INVALID_DIAGNOSTIC_PHASE');

  const text = typeof response?.text === 'string' ? response.text : '';
  const combinedCredentials = [...new Set([...secretMarkers, ...credentialSecrets])];
  const actualStatus = Number(response?.status ?? 0);

  const scanResult = scanAuthorizedResponse({
    text,
    status: actualStatus,
    endpoint,
    method,
    activeActor,
    allUserMarkers,
    credentialSecrets: combinedCredentials,
    staleCsrfTokens,
    currentCsrfToken,
    allowFreshCsrf,
    expectEmptyBody,
  });
  const scan = scanResult.scan;

  const cacheControl = headerValue(response?.headers, 'cache-control');
  const setCookie = firstSetCookie(response?.headers);
  const cookieAttrs = typeof setCookie === 'string' ? cookieAttributes(setCookie) : null;

  let json = scanResult.parsedJson;
  let jsonParsed = scanResult.jsonParsed;
  if (!scanResult.successScoped && text.length > 0 && !expectEmptyBody) {
    try {
      json = JSON.parse(text);
      jsonParsed = isPlainRecord(json) || Array.isArray(json);
    } catch {
      jsonParsed = false;
    }
  }
  const jsonBodyMatch = response?.json === undefined
    ? true
    : Boolean(jsonParsed && isDeepStrictEqual(json, response.json));

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
  if (!jsonBodyMatch) failedPredicates.push('JSON_BODY_MATCH');
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
    if (expectedStatus === 200 && scanResult.successScoped) {
      if (!scanResult.shapeValid) failedPredicates.push('SUCCESS_SHAPE_VALID');
      if (!scanResult.actorMatch) failedPredicates.push('ACTOR_IDENTITY_MATCH');
      if (!scanResult.csrfMatch) failedPredicates.push('CSRF_TOKEN_MATCH');
    }
  }
  if (expectSetCookie && !setCookiePresent) {
    failedPredicates.push('SET_COOKIE_PRESENT');
  }
  if (expectNoSetCookie && setCookiePresent) {
    failedPredicates.push('SET_COOKIE_ABSENT');
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
    jsonBodyMatch,
    topObject,
    topErrorOnly,
    errorObject,
    exactErrorKeys,
    codeString,
    messageString,
    errorCodeMatch,
    errorCode,
    errorCategory: classifyErrorCategory(actualStatus, errorCode),
    successShapeValid: scanResult.successScoped ? scanResult.shapeValid : null,
    actorIdentityMatch: scanResult.successScoped ? scanResult.actorMatch : null,
    csrfTokenMatch: scanResult.successScoped ? scanResult.csrfMatch : null,
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
