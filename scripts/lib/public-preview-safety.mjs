/** OFFLINE-ONLY fixture inspection. This is not a hosted security/release gate.
 * No CLI/library default network transport exists. Explicit injected functions
 * are trusted test code: arbitrary JavaScript cannot be proven network-free or
 * forcibly terminated. Deadlines bound our awaited asynchronous operations;
 * they cannot preempt synchronous injected code or undo its external effects.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
export const ERROR_CATEGORIES = Object.freeze(Object.fromEntries([
  "UNKNOWN_ERROR", "FETCH_FAILED", "INVALID_URL", "INVALID_PROTOCOL", "DISALLOWED_PORT",
  "USERINFO_FORBIDDEN", "QUERY_PARAMETERS_FORBIDDEN", "FRAGMENT_FORBIDDEN", "DISALLOWED_PATH",
  "IP_HOSTNAME_FORBIDDEN", "SSRF_PROHIBITED", "UNTRUSTED_PREVIEW_DOMAIN", "TEST_TRANSPORT_REQUIRED",
  "REDIRECTS_PROHIBITED", "RESPONSE_TOO_LARGE", "REQUEST_TIMEOUT", "INVALID_SHA_FORMAT",
  "INVALID_RESOURCE_LIMIT", "INVALID_RESPONSE", "STREAM_REQUIRED", "TEST_OPTIONS_REJECTED",
  "UNKNOWN_OPTION", "DUPLICATE_ARGUMENT", "MISSING_ARGUMENT_VALUE", "INVALID_TIMEOUT", "UNEXPECTED_ARGUMENT",
].map(code => [code, code])));
class SafetyError extends Error { constructor(code) { super(code); this.name = "SafetyError"; } }
const fail = code => { throw new SafetyError(code); };
export function getSafeErrorCategory(error) {
  if (!error) return ERROR_CATEGORIES.UNKNOWN_ERROR;
  try {
    const message = typeof error === "string" ? error : Object.getOwnPropertyDescriptor(error, "message")?.value;
    if (typeof message === "string") for (const code of Object.keys(ERROR_CATEGORIES)) if (message === code || message.startsWith(code + ":")) return code;
    if (Object.getOwnPropertyDescriptor(error, "name")?.value === "AbortError") return ERROR_CATEGORIES.REQUEST_TIMEOUT;
  } catch { /* Untrusted accessors/proxies never become report output. */ }
  return ERROR_CATEGORIES.FETCH_FAILED;
}
export const OFFLINE_WEB_ORIGIN = "https://offline-web.egyhealth.invalid";
export const OFFLINE_API_ORIGIN = "https://offline-api.egyhealth.invalid";
export const DEFAULT_MAX_BODY_BYTES = 1048576;
export const HEALTH_MAX_BODY_BYTES = 65536;

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



/** Fixed reserved fixture origins are identifiers only; never ownership proof. */
export function validatePreviewUrl(input) {
  if (typeof input !== "string" || input.length > 256) return fail(ERROR_CATEGORIES.INVALID_URL);
  let url; try { url = new URL(input); } catch { return fail(ERROR_CATEGORIES.INVALID_URL); }
  if (url.protocol !== "https:") return fail(ERROR_CATEGORIES.INVALID_PROTOCOL);
  if (url.username || url.password) return fail(ERROR_CATEGORIES.USERINFO_FORBIDDEN);
  if (url.port) return fail(ERROR_CATEGORIES.DISALLOWED_PORT);
  if (url.search || input.includes("?")) return fail(ERROR_CATEGORIES.QUERY_PARAMETERS_FORBIDDEN);
  if (url.hash || input.includes("#")) return fail(ERROR_CATEGORIES.FRAGMENT_FORBIDDEN);
  if (!["/", "/api/v1/health"].includes(url.pathname)) return fail(ERROR_CATEGORIES.DISALLOWED_PATH);
  if (isIpLiteral(url.hostname)) return fail(ERROR_CATEGORIES.IP_HOSTNAME_FORBIDDEN);
  if (isPrivateHostnameOrIp(url.hostname)) return fail(ERROR_CATEGORIES.SSRF_PROHIBITED);
  if (![OFFLINE_WEB_ORIGIN, OFFLINE_API_ORIGIN].includes(url.origin)) return fail(ERROR_CATEGORIES.UNTRUSTED_PREVIEW_DOMAIN);
  if (input !== url.href && input !== url.origin) return fail(ERROR_CATEGORIES.INVALID_URL);
  return url;
}
export function sanitizeUrlForReport(input) {
  try {
    const url = validatePreviewUrl(input);
    return url.origin === OFFLINE_WEB_ORIGIN ? "OFFLINE_WEB" : "OFFLINE_API";
  } catch { return "[INVALID_TARGET]"; }
}
const leakPatterns = [
  /DATABASE_URL|postgres(?:ql)?:\/\//i, /VERCEL_TOKEN|JWT_SECRET|SESSION_TOKEN|CSRF_TOKEN/i,
  /(?:password|api[_-]?key|secret)\s*[:=]\s*["']?[^\s"'<>]{5,}/i,
  /(?:Error:|Exception:)[^\n]*\n\s+at /,
];
export function scanBodyForLeaks(body) {
  const findings = typeof body === "string" ? leakPatterns.flatMap((pattern,index) => pattern.test(body) ? [`SENSITIVE_PATTERN_${index+1}`] : []) : ["INVALID_BODY"];
  return { leaked: findings.length > 0, findings };
}
export function evaluateSecurityHeaders(headers) {
  const warnings = []; let contentType = "", nosniff = "", cookie = false;
  try {
    const type = headers.get("content-type"), sniff = headers.get("x-content-type-options");
    contentType = typeof type === "string" ? type.toLowerCase() : "";
    nosniff = typeof sniff === "string" ? sniff.toLowerCase() : "";
    cookie = headers.has("set-cookie");
  } catch { warnings.push("INVALID_HEADERS"); }
  const isHtml = /^(?:text\/html|application\/xhtml\+xml)(?:;|$)/.test(contentType);
  const isJson = /^application\/json(?:;|$)/.test(contentType);
  const hasNosniff = nosniff === "nosniff";
  if (!hasNosniff) warnings.push("INVALID_NOSNIFF_HEADER");
  if (cookie) warnings.push("UNEXPECTED_SET_COOKIE");
  return {pass:warnings.length === 0, warnings, checks:{isHtml,isJson,hasNosniff}};
}
function requireTransport(transport) {
  if (typeof transport !== "function" || transport === globalThis.fetch) fail(ERROR_CATEGORIES.TEST_TRANSPORT_REQUIRED);
}
function snapshot(input, keys) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail(ERROR_CATEGORIES.INVALID_RESOURCE_LIMIT);
    const copy = {};
    for (const key of keys) {
      const field = Object.getOwnPropertyDescriptor(input,key);
      if (!field) continue;
      if (!Object.hasOwn(field,"value")) fail(ERROR_CATEGORIES.INVALID_RESPONSE);
      copy[key] = field.value;
    }
    return copy;
  } catch(error) { throw new SafetyError(getSafeErrorCategory(error)); }
}
function limits(options) {
  const timeout = options.timeout ?? 10000, maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > DEFAULT_MAX_BODY_BYTES) fail(ERROR_CATEGORIES.INVALID_RESOURCE_LIMIT);
  if (options.allowTestHttp || options.allowAnyPathInTest) fail(ERROR_CATEGORIES.TEST_OPTIONS_REJECTED);
  return {timeout,maxBytes};
}
/** Trusted fixture transport only. Non-streaming/text() fallbacks are rejected. */
export async function safeGet(target, options = {}, transport) {
  let bounds, url;
  try {
    requireTransport(transport);
    options = snapshot(options,["timeout","maxBytes","allowTestHttp","allowAnyPathInTest"]);
    bounds = limits(options);url = validatePreviewUrl(target);
  } catch(error) {throw new SafetyError(getSafeErrorCategory(error));}
  const {timeout,maxBytes} = bounds;
  const started = globalThis.performance.now(), deadline = started + timeout;
  const controller = new globalThis.AbortController();
  let reader, response, rawBody, timer, failed = true;
  const check = () => { if (controller.signal.aborted || globalThis.performance.now() >= deadline) fail(ERROR_CATEGORIES.REQUEST_TIMEOUT); };
  const timedOut = new Promise((_,reject) => { timer = setTimeout(() => {controller.abort();reject(new SafetyError(ERROR_CATEGORIES.REQUEST_TIMEOUT));}, timeout); });
  const within = async task => {
    check();
    const value = await Promise.race([Promise.resolve().then(task),timedOut]);
    check(); return value;
  };
  // Abort first. Cancellation is invoked asynchronously and observed, never an
  // unbounded await. A pending promise alone does not keep the Node process alive.
  const cancel = body => {
    const ownedReader = reader;
    Promise.resolve().then(() => ownedReader ? ownedReader.cancel?.() : body?.cancel?.()).catch(() => {}).finally(() => { try { ownedReader?.releaseLock?.(); } catch { /* Pending injected reads cannot be forcibly terminated. */ } });
  };
  try {
    response = await within(async () => {
      const result = await transport(url.href, {method:"GET",redirect:"manual",signal:controller.signal,credentials:"omit",headers:{Accept:"text/html,application/json"}});
      if (controller.signal.aborted || globalThis.performance.now() >= deadline) { controller.abort();cancel(result?.body);fail(ERROR_CATEGORIES.REQUEST_TIMEOUT); }
      return result;
    });
    if (!response || typeof response !== "object" || Array.isArray(response)) fail(ERROR_CATEGORIES.INVALID_RESPONSE);
    response = snapshot(response,["status","headers","body"]);rawBody = response.body;
    const status = response?.status;
    if (!response || typeof response !== "object" || !Number.isInteger(status) || status < 100 || status > 599) fail(ERROR_CATEGORIES.INVALID_RESPONSE);
    if (status >= 300 && status <= 399) fail(ERROR_CATEGORIES.REDIRECTS_PROHIBITED);
    const headers = response.headers instanceof globalThis.Headers ? response.headers : new globalThis.Headers(response.headers);
    const length = headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) fail(ERROR_CATEGORIES.INVALID_RESPONSE);
    if (length !== null && Number(length) > maxBytes) fail(ERROR_CATEGORIES.RESPONSE_TOO_LARGE);
    if (typeof response.body?.getReader !== "function") fail(ERROR_CATEGORIES.STREAM_REQUIRED);
    reader = response.body.getReader();
    const decoder = new globalThis.TextDecoder();let bytes = 0, body = "";
    for (;;) {
      const chunk = await within(() => reader.read());
      if (!chunk || typeof chunk.done !== "boolean") fail(ERROR_CATEGORIES.INVALID_RESPONSE);
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) fail(ERROR_CATEGORIES.INVALID_RESPONSE);
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) fail(ERROR_CATEGORIES.RESPONSE_TOO_LARGE);
      check(); body += decoder.decode(chunk.value,{stream:true});
    }
    body += decoder.decode();check();failed = false;
    return {status,headers,body,finalUrl:url.origin === OFFLINE_WEB_ORIGIN ? "OFFLINE_WEB" : "OFFLINE_API",elapsedMs:Math.ceil(globalThis.performance.now()-started)};
  } catch (error) {
    controller.abort();cancel(rawBody);
    throw new SafetyError(getSafeErrorCategory(error));
  } finally {
    globalThis.clearTimeout(timer);
    if (failed) controller.abort();
    try { if (!failed) reader?.releaseLock?.(); } catch { /* A noncooperative injected read may still be pending. */ }
  }
}

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



export async function runPreviewSafetyCheck(params = {}, transport) {
  const report = {
    evaluatedAt:new Date().toISOString(), mode:"OFFLINE_ONLY", overallStatus:"PASS",
    targetWebUrl:"[INVALID_TARGET]",targetApiUrl:null,expectedSha:null,
    originOwnership:"NOT_VERIFIED",dnsSocketSafety:"NOT_VERIFIED",
    ssrfPolicy:"OFFLINE_ONLY: no built-in network transport; origin ownership and DNS/socket safety NOT_VERIFIED.",
    clinicalReadiness:"NOT_VERIFIED",
    clinicalReadinessReason:"Offline fixture success grants ZERO clinical readiness; no hosted, session, CSRF, DB or source attestation.",
    transportTrust:"Injected functions are trusted test code, not independently proven offline or forcibly terminable.",
    checks:[],summary:{pass:0,warn:0,fail:0,notVerified:0},
  };
  const record = (name,status,details={}) => {
    report.checks.push({name,status,details});
    report.summary[status === "NOT_VERIFIED" ? "notVerified" : status.toLowerCase()]++;
    if (status === "FAIL") report.overallStatus = "FAIL";
  };
  try {requireTransport(transport);} catch(error) {record("Test Transport Isolation Check","FAIL",{errorCategory:getSafeErrorCategory(error)});return report;}
  let web,api,deadline,expired = false;
  try {
    params = snapshot(params,["url","apiUrl","expectedSha","timeout","maxBytes","allowTestHttp","allowAnyPathInTest"]);
    const bounds = limits(params);deadline = globalThis.performance.now() + bounds.timeout;
    web = validatePreviewUrl(params.url ?? OFFLINE_WEB_ORIGIN);
    if (web.origin !== OFFLINE_WEB_ORIGIN || web.pathname !== "/") fail(ERROR_CATEGORIES.UNTRUSTED_PREVIEW_DOMAIN);
    if (params.apiUrl !== undefined && params.apiUrl !== null) {
      api = validatePreviewUrl(params.apiUrl);
      if (api.origin !== OFFLINE_API_ORIGIN) fail(ERROR_CATEGORIES.UNTRUSTED_PREVIEW_DOMAIN);
    }
    report.targetWebUrl="OFFLINE_WEB";report.targetApiUrl=api?"OFFLINE_API":null;
  } catch(error) {record("Offline Target Validation","FAIL",{errorCategory:getSafeErrorCategory(error)});return report;}
  if (params.expectedSha !== undefined && params.expectedSha !== null && (typeof params.expectedSha !== "string" || !/^[0-9a-f]{40}$/i.test(params.expectedSha))) {
    record("Source SHA Attestation","FAIL",{errorCategory:ERROR_CATEGORIES.INVALID_SHA_FORMAT});return report;
  }
  const probe = async (name,url,html) => {
    try {
      const remaining = Math.floor(deadline-globalThis.performance.now());
      if (expired || remaining < 1) fail(ERROR_CATEGORIES.REQUEST_TIMEOUT);
      const response = await safeGet(url,{timeout:remaining,maxBytes:html?params.maxBytes:Math.min(params.maxBytes ?? HEALTH_MAX_BODY_BYTES,HEALTH_MAX_BODY_BYTES)},transport);
      if (response.status !== 200) {record(name,"FAIL",{classification:"NON_200_RESPONSE"});return;}
      const headers = evaluateSecurityHeaders(response.headers);
      const leaks = scanBodyForLeaks(response.body);
      if (html) {
        record(name,!headers.checks.isHtml || leaks.leaked?"FAIL":"PASS",{isHtml:headers.checks.isHtml,hasNosniff:headers.checks.hasNosniff,warnings:headers.warnings,leaks:leaks.findings});
      } else {
        let payload;try {payload=JSON.parse(response.body);}catch{fail(ERROR_CATEGORIES.INVALID_RESPONSE);}
        record(name,headers.checks.isJson && payload?.data?.status === "ok" && !leaks.leaked?"PASS":"FAIL",{isJson:headers.checks.isJson,healthOk:payload?.data?.status === "ok",leaks:leaks.findings});
      }
    } catch(error) {const code=getSafeErrorCategory(error);if(code===ERROR_CATEGORIES.REQUEST_TIMEOUT)expired=true;record(name,"FAIL",{errorCategory:code});}
  };
  await probe("Web Root Fixture",OFFLINE_WEB_ORIGIN+"/",true);
  await probe("Proxied Health Fixture",OFFLINE_WEB_ORIGIN+"/api/v1/health",false);
  if (api) await probe("Direct API Health Fixture",OFFLINE_API_ORIGIN+"/api/v1/health",false);
  record("Source SHA Attestation","NOT_VERIFIED",{reason:"Offline fixtures cannot attest deployed source."});
  record("AP05 Brand & Asset Inventory","NOT_VERIFIED",{classification:"OPEN_GATE"});
  return report;
}
