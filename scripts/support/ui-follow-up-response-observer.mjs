/** Fail-closed response lifecycle and privacy observer for patient follow-up reads.
 * Keeps raw response bodies transient in memory only; errors and ledgers are sanitized. */
import { Buffer } from "node:buffer";

export const FOLLOW_UP_TARGET_PATH_RE =
  /^\/api\/v1\/me\/follow-up-intents(?:\/([^/]+))?\/?$/i;

export class FollowUpObserverError extends Error {
  constructor(code, message, summary) {
    super(message);
    this.name = "FollowUpObserverError";
    this.code = code;
    this.summary = summary;
  }
}

export function classifyFollowUpTargetRequest({
  url,
  method = "GET",
  origin = "http://localhost:3000",
}) {
  let targetOrigin;
  try {
    if (typeof origin !== "string" || !origin.trim()) {
      throw new Error("INVALID_ORIGIN");
    }
    targetOrigin = new URL(origin).origin;
  } catch {
    throw new FollowUpObserverError(
      "OBSERVER_CLASSIFICATION_ERROR",
      "OBSERVER_CLASSIFICATION_ERROR: invalid origin",
    );
  }

  let parsed;
  try {
    if (typeof url !== "string" || !url.length) {
      throw new Error("INVALID_URL");
    }
    parsed = new URL(url);
  } catch {
    throw new FollowUpObserverError(
      "OBSERVER_CLASSIFICATION_ERROR",
      "OBSERVER_CLASSIFICATION_ERROR: invalid request URL",
    );
  }

  const rawMethod = method === undefined ? "GET" : method;
  if (typeof rawMethod !== "string" || !rawMethod.trim()) {
    throw new FollowUpObserverError(
      "OBSERVER_CLASSIFICATION_ERROR",
      "OBSERVER_CLASSIFICATION_ERROR: invalid request method",
    );
  }

  if (parsed.origin !== targetOrigin) return null;
  const match = FOLLOW_UP_TARGET_PATH_RE.exec(parsed.pathname);
  if (!match) return null;
  const normalizedMethod = rawMethod.trim().toUpperCase();
  return {
    origin: parsed.origin,
    pathname: parsed.pathname,
    kind: match[1] ? "detail" : "list",
    method: normalizedMethod,
    readMethod: normalizedMethod === "GET" || normalizedMethod === "HEAD",
  };
}

function validateEnvelope(kind, parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return false;
  if (kind === "list") {
    if (!Array.isArray(parsed.data)) return false;
    const meta = parsed.meta;
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
    return (
      Number.isInteger(meta.page) &&
      meta.page >= 1 &&
      Number.isInteger(meta.pageSize) &&
      meta.pageSize >= 1 &&
      Number.isInteger(meta.total) &&
      meta.total >= parsed.data.length
    );
  }
  return Boolean(
    parsed.data &&
      typeof parsed.data === "object" &&
      !Array.isArray(parsed.data),
  );
}

function scanDecodedJsonTree(root, cleanMarkers, cleanRequired) {
  let hasVersionKey = false;
  let matchedMarkerIndex = -1;
  const requiredFound = cleanRequired.map(() => false);
  const stack = [root];
  const seen = new Set();

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === "string") {
      if (matchedMarkerIndex === -1) {
        for (let m = 0; m < cleanMarkers.length; m++) {
          if (current.includes(cleanMarkers[m])) {
            matchedMarkerIndex = m;
            break;
          }
        }
      }
      for (let r = 0; r < cleanRequired.length; r++) {
        if (!requiredFound[r] && current.includes(cleanRequired[r])) {
          requiredFound[r] = true;
        }
      }
      continue;
    }
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (let i = 0; i < current.length; i++) {
        stack.push(current[i]);
      }
      continue;
    }

    for (const key of Object.keys(current)) {
      if (key === "version") hasVersionKey = true;
      if (matchedMarkerIndex === -1) {
        for (let m = 0; m < cleanMarkers.length; m++) {
          if (key.includes(cleanMarkers[m])) {
            matchedMarkerIndex = m;
            break;
          }
        }
      }
      stack.push(current[key]);
    }
  }

  return { hasVersionKey, matchedMarkerIndex, requiredFound };
}

function clonePhasePolicy(options = {}) {
  return {
    minSucceeded: options.minSucceeded ?? 1,
    allowAborts: Boolean(options.allowAborts),
    allowHead: Boolean(options.allowHead),
    expectedKind: options.expectedKind,
    expectedDataLength: options.expectedDataLength,
    expectedMetaTotal: options.expectedMetaTotal,
    expectedEmptyLinks: Boolean(options.expectedEmptyLinks),
    requireNoVersionMetadata: options.requireNoVersionMetadata ?? true,
    forbiddenMarkers: Array.isArray(options.forbiddenMarkers)
      ? [...options.forbiddenMarkers]
      : [],
    requiredText: Array.isArray(options.requiredText)
      ? [...options.requiredText]
      : [],
  };
}

function summarizeLedger(entries, extras) {
  const counts = {
    observedCount: entries.length,
    pendingCount: 0,
    succeededGetCount: 0,
    succeededListGetCount: 0,
    succeededDetailGetCount: 0,
    succeededHeadCount: 0,
    scannedCount: 0,
    bodyErrorCount: 0,
    httpErrorCount: 0,
    redirectCount: 0,
    abortedCount: 0,
    requestFailedCount: 0,
    unexpectedMethodCount: 0,
    duplicateResponseCount: extras.duplicateResponseCount,
    lateFailureAfterSuccessCount: extras.lateFailureAfterSuccessCount,
    observerFaultCount: extras.scopedFaultCount,
    globalObserverFaultCount: extras.globalFaultCount,
  };
  for (const entry of entries) {
    if (entry.terminalState === "pending") counts.pendingCount++;
    else if (entry.terminalState === "succeeded") {
      if (entry.method === "HEAD") counts.succeededHeadCount++;
      else {
        counts.succeededGetCount++;
        if (entry.kind === "list") counts.succeededListGetCount++;
        else if (entry.kind === "detail") counts.succeededDetailGetCount++;
        if (entry.bodyComplete && entry.bodyByteLength > 0)
          counts.scannedCount++;
      }
    } else if (entry.terminalState === "body_error") counts.bodyErrorCount++;
    else if (entry.terminalState === "http_error") {
      if (entry.failureCode === "UNEXPECTED_METHOD")
        counts.unexpectedMethodCount++;
      else counts.httpErrorCount++;
    } else if (entry.terminalState === "redirected") counts.redirectCount++;
    else if (entry.terminalState === "aborted") counts.abortedCount++;
    else if (entry.terminalState === "request_failed")
      counts.requestFailedCount++;
  }
  return counts;
}

export function createFollowUpResponseObserver(
  page,
  {
    origin = "http://localhost:3000",
    bodyReadTimeoutMs = 5000,
    drainTimeoutMs = 10000,
    classifyRequest = classifyFollowUpTargetRequest,
  } = {},
) {
  if (typeof classifyRequest !== "function") {
    throw new FollowUpObserverError(
      "INVALID_OBSERVER_STATE",
      "INVALID_OBSERVER_STATE: classifyRequest must be a function",
    );
  }
  let targetOrigin;
  try {
    if (typeof origin !== "string" || !origin.trim()) {
      throw new Error("INVALID_ORIGIN");
    }
    targetOrigin = new URL(origin).origin;
  } catch {
    throw new FollowUpObserverError(
      "OBSERVER_CLASSIFICATION_ERROR",
      "OBSERVER_CLASSIFICATION_ERROR: invalid origin",
    );
  }

  let activePhase = "initial";
  let attached = false;
  let observationClosed = false;
  let disposed = false;
  let nextSeq = 0;
  let duplicateResponseCount = 0;
  let duplicateRequestCount = 0;
  let lateFailureAfterSuccessCount = 0;
  let unrelatedIgnoredCount = 0;

  const entries = [];
  const observerFaults = [];
  const entryByRequest = new WeakMap();
  const transientBodies = new Map();
  const phasePolicies = new Map();
  const inFlightRequests = new Set();
  const pendingBodyTasks = new Set();
  const pendingBodyCancelers = new Set();
  const activeTimers = new Set();
  const waiters = new Set();

  const notifyWaiters = () => {
    for (const wake of waiters) wake();
  };

  const recordObserverFault = (
    event,
    phase = activePhase,
    code = "OBSERVER_CALLBACK_FAULT",
  ) => {
    observerFaults.push({
      seq: ++nextSeq,
      event,
      phase,
      code,
    });
    notifyWaiters();
  };

  const faultCodeFromError = (err) =>
    err instanceof FollowUpObserverError &&
    err.code === "OBSERVER_CLASSIFICATION_ERROR"
      ? "OBSERVER_CLASSIFICATION_ERROR"
      : "OBSERVER_CALLBACK_FAULT";

  const scopeEntries = (phase) =>
    phase === undefined
      ? entries
      : entries.filter((entry) => entry.phase === phase);

  const scopeFaults = (phase) =>
    phase === undefined
      ? observerFaults
      : observerFaults.filter((fault) => fault.phase === phase);

  const scopePendingCount = (phase) =>
    phase === undefined
      ? inFlightRequests.size + pendingBodyTasks.size
      : entries.filter(
          (entry) =>
            entry.phase === phase && entry.terminalState === "pending",
        ).length;

  const currentSummary = (phase) => {
    const scoped = scopeEntries(phase);
    const scopedFaults = scopeFaults(phase);
    const base = summarizeLedger(scoped, {
      duplicateResponseCount,
      lateFailureAfterSuccessCount,
      scopedFaultCount: scopedFaults.length,
      globalFaultCount: observerFaults.length,
    });
    return {
      phase: phase ?? "all",
      activePhase,
      attached,
      observationClosed,
      disposed,
      duplicateRequestCount,
      unrelatedIgnoredCount,
      inFlightCount: inFlightRequests.size,
      pendingBodyCount: pendingBodyTasks.size,
      activeTimerCount: activeTimers.size,
      transientBodyCount: transientBodies.size,
      ...base,
    };
  };

  const makeEntry = (target, phase) => ({
    seq: ++nextSeq,
    phase,
    kind: target.kind,
    method: target.method,
    readMethod: target.readMethod,
    status: null,
    terminalState: "pending",
    failureCode: null,
    responseSeen: false,
    bodyComplete: false,
    bodyByteLength: 0,
    parsedSummary: null,
  });

  const handleRequest = (req) => {
    try {
      if (disposed || observationClosed) return;
      if (
        !req ||
        typeof req !== "object" ||
        typeof req.url !== "function" ||
        typeof req.method !== "function"
      ) {
        throw new Error("INVALID_REQUEST_EVENT");
      }
      const target = classifyRequest({
        url: req.url(),
        method: req.method(),
        origin: targetOrigin,
      });
      if (!target) {
        unrelatedIgnoredCount++;
        return;
      }
      if (entryByRequest.has(req)) {
        duplicateRequestCount++;
        return;
      }
      const entry = makeEntry(target, activePhase);
      entries.push(entry);
      entryByRequest.set(req, entry);
      inFlightRequests.add(entry.seq);
      if (!target.readMethod) {
        entry.terminalState = "http_error";
        entry.failureCode = "UNEXPECTED_METHOD";
      }
      notifyWaiters();
    } catch (err) {
      try {
        recordObserverFault("request", activePhase, faultCodeFromError(err));
      } catch {
        /* Listener must never emit uncaught exceptions. */
      }
    }
  };

  const startBodyRead = (entry, res) => {
    let settled = false;
    let timer;
    let cancelWaiter;
    const cancelPromise = new Promise((_, reject) => {
      cancelWaiter = (reasonCode) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) {
          globalThis.clearTimeout(timer);
          activeTimers.delete(timer);
          timer = undefined;
        }
        reject(new Error(reasonCode));
      };
      timer = setTimeout(() => {
        cancelWaiter("BODY_TIMEOUT");
      }, bodyReadTimeoutMs);
      activeTimers.add(timer);
      pendingBodyCancelers.add(cancelWaiter);
    });
    const textPromise = Promise.resolve().then(() => res.text());
    const task = Promise.race([textPromise, cancelPromise])
      .then(
        (rawText) => {
          settled = true;
          if (disposed) {
            if (entry.terminalState === "pending") {
              entry.terminalState = "body_error";
              entry.failureCode = "OBSERVER_CLOSED";
              entry.bodyComplete = false;
            }
            return;
          }
          if (typeof rawText !== "string" || rawText.length === 0) {
            entry.terminalState = "body_error";
            entry.failureCode = "EMPTY_BODY";
            entry.bodyComplete = false;
            return;
          }
          let parsed;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            entry.terminalState = "body_error";
            entry.failureCode = "INVALID_JSON";
            entry.bodyComplete = false;
            return;
          }
          if (!validateEnvelope(entry.kind, parsed)) {
            entry.terminalState = "body_error";
            entry.failureCode = "INVALID_PAYLOAD";
            entry.bodyComplete = false;
            return;
          }
          const byteLength = Buffer.byteLength(rawText, "utf8");
          if (byteLength <= 0) {
            entry.terminalState = "body_error";
            entry.failureCode = "EMPTY_BODY";
            entry.bodyComplete = false;
            return;
          }
          transientBodies.set(entry.seq, { text: rawText, json: parsed });
          entry.bodyComplete = true;
          entry.bodyByteLength = byteLength;
          entry.parsedSummary = {
            isList: entry.kind === "list",
            dataCount: entry.kind === "list" ? parsed.data.length : 1,
            total: entry.kind === "list" ? parsed.meta.total : null,
          };
          entry.terminalState = "succeeded";
          entry.failureCode = null;
        },
        (err) => {
          settled = true;
          if (entry.terminalState === "pending") {
            entry.terminalState = "body_error";
            entry.bodyComplete = false;
            entry.failureCode =
              disposed || err?.message === "OBSERVER_CLOSED"
                ? "OBSERVER_CLOSED"
                : err?.message === "BODY_TIMEOUT"
                  ? "BODY_TIMEOUT"
                  : "BODY_READ_ERROR";
          }
        },
      )
      .finally(() => {
        if (timer !== undefined) {
          globalThis.clearTimeout(timer);
          activeTimers.delete(timer);
          timer = undefined;
        }
        pendingBodyCancelers.delete(cancelWaiter);
        pendingBodyTasks.delete(task);
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
      });
    // Ensure background textPromise cannot emit an unhandled rejection if timeout/dispose won first.
    textPromise.catch(() => {});
    pendingBodyTasks.add(task);
  };

  const handleResponse = (res) => {
    let entry;
    try {
      if (disposed || observationClosed) return;
      if (
        !res ||
        typeof res !== "object" ||
        typeof res.url !== "function" ||
        typeof res.status !== "function"
      ) {
        throw new Error("INVALID_RESPONSE_EVENT");
      }
      let req = null;
      if (res.request !== undefined) {
        if (typeof res.request !== "function") {
          throw new Error("INVALID_RESPONSE_REQUEST_ACCESSOR");
        }
        req = res.request();
        if (req !== null && typeof req !== "object") {
          throw new Error("INVALID_RESPONSE_REQUEST");
        }
      }
      const url = res.url();
      let method;
      if (req) {
        if (typeof req.method !== "function") {
          throw new Error("INVALID_REQUEST_METHOD_ACCESSOR");
        }
        method = req.method();
      } else if (typeof res.method === "function") {
        method = res.method();
      } else {
        method = "GET";
      }
      const target = classifyRequest({
        url,
        method,
        origin: targetOrigin,
      });
      if (!target) {
        if (!req) unrelatedIgnoredCount++;
        return;
      }
      entry = req ? entryByRequest.get(req) : undefined;
      if (!entry) {
        entry = makeEntry(target, activePhase);
        entries.push(entry);
        if (req) entryByRequest.set(req, entry);
        inFlightRequests.add(entry.seq);
      }
      if (entry.responseSeen) {
        duplicateResponseCount++;
        return;
      }
      const status = Number(res.status());
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        throw new Error("INVALID_RESPONSE_STATUS");
      }
      entry.responseSeen = true;
      entry.status = status;

      if (!target.readMethod) {
        entry.terminalState = "http_error";
        entry.failureCode = "UNEXPECTED_METHOD";
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
        return;
      }
      if (status >= 300 && status < 400) {
        entry.terminalState = "redirected";
        entry.failureCode = "REDIRECT_RESPONSE";
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
        return;
      }
      if (status < 200 || status >= 400) {
        entry.terminalState = "http_error";
        entry.failureCode =
          status >= 500 ? "HTTP_STATUS_5XX" : "HTTP_STATUS_4XX";
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
        return;
      }
      if (entry.method === "HEAD") {
        entry.terminalState = "succeeded";
        entry.bodyComplete = false;
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
        return;
      }
      startBodyRead(entry, res);
      notifyWaiters();
    } catch (err) {
      try {
        const code = faultCodeFromError(err);
        if (entry) {
          if (entry.terminalState === "pending") {
            entry.terminalState = "body_error";
            entry.failureCode = code;
            entry.bodyComplete = false;
          }
          inFlightRequests.delete(entry.seq);
        }
        recordObserverFault("response", entry?.phase ?? activePhase, code);
      } catch {
        /* Listener must never emit uncaught exceptions. */
      }
    }
  };

  const handleRequestFinished = (req) => {
    let entry;
    try {
      if (disposed || observationClosed) return;
      if (
        !req ||
        typeof req !== "object" ||
        typeof req.url !== "function" ||
        typeof req.method !== "function"
      ) {
        throw new Error("INVALID_REQUEST_FINISHED_EVENT");
      }
      entry = entryByRequest.get(req);
      const target = classifyRequest({
        url: req.url(),
        method: req.method(),
        origin: targetOrigin,
      });
      if (!entry) {
        if (target) {
          recordObserverFault(
            "requestfinished",
            activePhase,
            "UNTRACKED_TARGET_EVENT",
          );
        }
        return;
      }
      inFlightRequests.delete(entry.seq);
      if (entry.readMethod && !entry.responseSeen) {
        entry.terminalState = "body_error";
        entry.failureCode = "MISSING_RESPONSE_EVENT";
        entry.bodyComplete = false;
        recordObserverFault(
          "requestfinished",
          entry.phase,
          "MISSING_RESPONSE_EVENT",
        );
        return;
      }
      notifyWaiters();
    } catch (err) {
      try {
        const code = faultCodeFromError(err);
        if (entry) {
          if (entry.terminalState === "pending") {
            entry.terminalState = "body_error";
            entry.failureCode = code;
            entry.bodyComplete = false;
          }
          inFlightRequests.delete(entry.seq);
        }
        recordObserverFault(
          "requestfinished",
          entry?.phase ?? activePhase,
          code,
        );
      } catch {
        /* Listener must never emit uncaught exceptions. */
      }
    }
  };

  const handleRequestFailed = (req) => {
    let entry;
    try {
      if (disposed || observationClosed) return;
      if (
        !req ||
        typeof req !== "object" ||
        typeof req.url !== "function" ||
        typeof req.method !== "function"
      ) {
        throw new Error("INVALID_REQUEST_FAILED_EVENT");
      }
      entry = entryByRequest.get(req);
      const target = classifyRequest({
        url: req.url(),
        method: req.method(),
        origin: targetOrigin,
      });
      let failureInfo = null;
      if (target || entry) {
        if (req.failure !== undefined) {
          if (typeof req.failure !== "function") {
            throw new Error("INVALID_REQUEST_FAILURE_ACCESSOR");
          }
          failureInfo = req.failure();
        }
      }
      if (!entry) {
        if (target) {
          recordObserverFault(
            "requestfailed",
            activePhase,
            "UNTRACKED_TARGET_EVENT",
          );
        }
        return;
      }
      inFlightRequests.delete(entry.seq);
      if (
        entry.responseSeen &&
        entry.status !== null &&
        entry.status >= 200 &&
        entry.status < 300
      ) {
        // A delivered 2xx response must never be downgraded to a benign cancel.
        lateFailureAfterSuccessCount++;
        notifyWaiters();
        return;
      }
      if (entry.terminalState === "pending") {
        const failureText = String(failureInfo?.errorText ?? "");
        if (/abort|cancel/i.test(failureText)) {
          entry.terminalState = "aborted";
          entry.failureCode = "REQUEST_ABORTED";
        } else {
          entry.terminalState = "request_failed";
          entry.failureCode = "REQUEST_FAILED";
        }
      }
      notifyWaiters();
    } catch (err) {
      try {
        const code = faultCodeFromError(err);
        if (entry) {
          if (entry.terminalState === "pending") {
            entry.terminalState = "body_error";
            entry.failureCode = code;
            entry.bodyComplete = false;
          }
          inFlightRequests.delete(entry.seq);
        }
        recordObserverFault(
          "requestfailed",
          entry?.phase ?? activePhase,
          code,
        );
      } catch {
        /* Listener must never emit uncaught exceptions. */
      }
    }
  };

  const attach = () => {
    if (disposed || observationClosed)
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: cannot attach a closed or disposed observer",
        currentSummary(),
      );
    if (attached) return api;
    page.on("request", handleRequest);
    page.on("response", handleResponse);
    page.on("requestfailed", handleRequestFailed);
    page.on("requestfinished", handleRequestFinished);
    attached = true;
    return api;
  };

  const detach = () => {
    if (!attached) return;
    const remove = (event, handler) => {
      if (typeof page.off === "function") page.off(event, handler);
      else if (typeof page.removeListener === "function")
        page.removeListener(event, handler);
    };
    remove("request", handleRequest);
    remove("response", handleResponse);
    remove("requestfailed", handleRequestFailed);
    remove("requestfinished", handleRequestFinished);
    attached = false;
  };

  const dispose = () => {
    if (!disposed) {
      disposed = true;
      observationClosed = true;
      detach();
      for (const timer of activeTimers) globalThis.clearTimeout(timer);
      activeTimers.clear();
      for (const cancel of [...pendingBodyCancelers]) {
        cancel("OBSERVER_CLOSED");
      }
      pendingBodyCancelers.clear();
      for (const entry of entries) {
        if (entry.terminalState === "pending") {
          entry.terminalState = "body_error";
          entry.failureCode = "OBSERVER_CLOSED";
          entry.bodyComplete = false;
        }
      }
      transientBodies.clear();
      inFlightRequests.clear();
      notifyWaiters();
      waiters.clear();
    }
    return Promise.allSettled([...pendingBodyTasks]);
  };

  const beginPhase = (phase) => {
    if (disposed || observationClosed)
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: cannot change phase after close or dispose",
        currentSummary(),
      );
    if (typeof phase !== "string" || !phase.trim())
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: phase name must be non-empty",
        currentSummary(),
      );
    activePhase = phase;
  };

  const hasScopedFailure = (phase) => {
    const s = currentSummary(phase);
    return (
      s.globalObserverFaultCount > 0 ||
      s.observerFaultCount > 0 ||
      s.bodyErrorCount > 0 ||
      s.httpErrorCount > 0 ||
      s.redirectCount > 0 ||
      s.abortedCount > 0 ||
      s.requestFailedCount > 0 ||
      s.unexpectedMethodCount > 0 ||
      s.lateFailureAfterSuccessCount > 0
    );
  };

  const settle = async ({
    timeoutMs = drainTimeoutMs,
    minSucceeded = 0,
    phase,
  } = {}) => {
    if (disposed)
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: cannot settle after dispose",
        currentSummary(phase),
      );
    const isComplete = () => {
      const globalPending = inFlightRequests.size + pendingBodyTasks.size;
      const scopedPending = scopePendingCount(phase);
      if (globalPending > 0 || scopedPending > 0) return false;
      if (observerFaults.length > 0) return true;
      if (minSucceeded <= 0) return true;
      const s = currentSummary(phase);
      return s.succeededGetCount >= minSucceeded || hasScopedFailure(phase);
    };
    if (isComplete()) return currentSummary(phase);

    await new Promise((resolve, reject) => {
      let timer;
      const check = () => {
        if (disposed) {
          cleanup();
          reject(
            new FollowUpObserverError(
              "INVALID_OBSERVER_STATE",
              "INVALID_OBSERVER_STATE: observer disposed during settle",
              currentSummary(phase),
            ),
          );
          return;
        }
        if (isComplete()) {
          cleanup();
          resolve();
        }
      };
      const cleanup = () => {
        if (timer !== undefined) {
          globalThis.clearTimeout(timer);
          activeTimers.delete(timer);
        }
        waiters.delete(check);
      };
      timer = setTimeout(() => {
        cleanup();
        if (inFlightRequests.size > 0 || pendingBodyTasks.size > 0) {
          const s = currentSummary(phase);
          reject(
            new FollowUpObserverError(
              "OBSERVER_DRAIN_TIMEOUT",
              `OBSERVER_DRAIN_TIMEOUT phase=${s.phase} inFlight=${s.inFlightCount} pendingBodies=${s.pendingBodyCount}`,
              s,
            ),
          );
          return;
        }
        resolve();
      }, timeoutMs);
      activeTimers.add(timer);
      waiters.add(check);
    });
    return currentSummary(phase);
  };

  const assertEvidenceComplete = ({
    phase,
    minSucceeded = 1,
    allowAborts = false,
    allowHead = false,
    expectedKind = "any",
  } = {}) => {
    const s = currentSummary(phase);
    if (s.globalObserverFaultCount > 0 || s.observerFaultCount > 0) {
      throw new FollowUpObserverError(
        "OBSERVER_FAULT",
        `OBSERVER_FAULT phase=${s.phase} faults=${s.globalObserverFaultCount}`,
        s,
      );
    }
    if (
      s.disposed ||
      s.inFlightCount > 0 ||
      s.pendingBodyCount > 0 ||
      s.pendingCount > 0 ||
      s.bodyErrorCount > 0 ||
      s.httpErrorCount > 0 ||
      s.redirectCount > 0 ||
      s.requestFailedCount > 0 ||
      s.unexpectedMethodCount > 0 ||
      s.lateFailureAfterSuccessCount > 0 ||
      (!allowAborts && s.abortedCount > 0) ||
      (!allowHead && s.succeededHeadCount > 0)
    ) {
      throw new FollowUpObserverError(
        "EVIDENCE_INCOMPLETE",
        `EVIDENCE_INCOMPLETE phase=${s.phase} observed=${s.observedCount} succeededGet=${s.succeededGetCount} minRequired=${minSucceeded} pending=${s.pendingCount} bodyErrors=${s.bodyErrorCount} httpErrors=${s.httpErrorCount} redirects=${s.redirectCount} aborts=${s.abortedCount} requestFailed=${s.requestFailedCount}`,
        s,
      );
    }

    for (const entry of scopeEntries(phase)) {
      if (entry.terminalState === "succeeded" && entry.method === "GET") {
        if (
          !entry.responseSeen ||
          !entry.bodyComplete ||
          entry.bodyByteLength <= 0 ||
          entry.parsedSummary === null ||
          !transientBodies.has(entry.seq)
        ) {
          throw new FollowUpObserverError(
            "EVIDENCE_INCOMPLETE",
            `EVIDENCE_INCOMPLETE phase=${s.phase} incompleteBody seq=${entry.seq}`,
            s,
          );
        }
      } else if (
        entry.terminalState === "succeeded" &&
        entry.method === "HEAD"
      ) {
        if (!allowHead || !entry.responseSeen || entry.bodyComplete) {
          throw new FollowUpObserverError(
            "EVIDENCE_INCOMPLETE",
            `EVIDENCE_INCOMPLETE phase=${s.phase} invalidHeadState seq=${entry.seq}`,
            s,
          );
        }
      } else if (!(allowAborts && entry.terminalState === "aborted")) {
        throw new FollowUpObserverError(
          "EVIDENCE_INCOMPLETE",
          `EVIDENCE_INCOMPLETE phase=${s.phase} incompleteTerminal seq=${entry.seq}`,
          s,
        );
      }
    }

    const relevantSucceeded =
      expectedKind === "list"
        ? s.succeededListGetCount
        : expectedKind === "detail"
          ? s.succeededDetailGetCount
          : s.succeededGetCount;
    if (
      relevantSucceeded < minSucceeded ||
      s.scannedCount < s.succeededGetCount
    ) {
      throw new FollowUpObserverError(
        "EVIDENCE_INCOMPLETE",
        `EVIDENCE_INCOMPLETE phase=${s.phase} observed=${s.observedCount} succeededGet=${s.succeededGetCount} relevantSucceeded=${relevantSucceeded} minRequired=${minSucceeded} expectedKind=${expectedKind}`,
        s,
      );
    }
    return s;
  };

  const scanEntriesPrivacy = (
    targetEntries,
    {
      phaseLabel,
      expectedKind = "any",
      expectedDataLength,
      expectedMetaTotal,
      expectedEmptyLinks = false,
      requireNoVersionMetadata = true,
      forbiddenMarkers = [],
      requiredText = [],
    },
  ) => {
    const cleanMarkers = forbiddenMarkers.filter(
      (m) => typeof m === "string" && m.length > 0,
    );
    const cleanRequired = requiredText.filter(
      (r) => typeof r === "string" && r.length > 0,
    );
    const scopedName = phaseLabel === "all" ? undefined : phaseLabel;

    for (let i = 0; i < targetEntries.length; i++) {
      const entry = targetEntries[i];
      const payload = transientBodies.get(entry.seq);
      if (!payload || !entry.bodyComplete || entry.bodyByteLength <= 0) {
        throw new FollowUpObserverError(
          "EVIDENCE_INCOMPLETE",
          `EVIDENCE_INCOMPLETE phase=${phaseLabel} missing transient body seq=${entry.seq}`,
          currentSummary(scopedName),
        );
      }
      const { text, json } = payload;

      if (
        (expectedKind === "list" && entry.kind !== "list") ||
        (expectedKind === "detail" && entry.kind !== "detail")
      ) {
        throw new FollowUpObserverError(
          "FORBIDDEN_PHASE_MARKER",
          `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=UNEXPECTED_KIND observed=${entry.kind} expected=${expectedKind}`,
          currentSummary(scopedName),
        );
      }

      const decodedScan = scanDecodedJsonTree(
        json,
        cleanMarkers,
        cleanRequired,
      );

      if (requireNoVersionMetadata) {
        if (
          text.includes('"version":') ||
          /"version"\s*:/.test(text) ||
          decodedScan.hasVersionKey
        ) {
          throw new FollowUpObserverError(
            "PRIVACY_CANARY_LEAK",
            `PRIVACY_CANARY_LEAK phase=${phaseLabel} violation=VERSION_TEXT_KEY entryIndex=${i}`,
            currentSummary(scopedName),
          );
        }
        const items = entry.kind === "list" ? json.data : [json.data];
        for (const item of items) {
          if (
            !item ||
            typeof item !== "object" ||
            !Array.isArray(item.versions) ||
            item.versions.length === 0 ||
            !Array.isArray(item.links)
          ) {
            throw new FollowUpObserverError(
              "FORBIDDEN_PHASE_MARKER",
              `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=PROJECTION_SHAPE entryIndex=${i}`,
              currentSummary(scopedName),
            );
          }
          for (const version of item.versions) {
            if (
              !version ||
              typeof version !== "object" ||
              version.state !== "SIGNED_RELEASED" ||
              Object.hasOwn(version, "version")
            ) {
              throw new FollowUpObserverError(
                "PRIVACY_CANARY_LEAK",
                `PRIVACY_CANARY_LEAK phase=${phaseLabel} violation=NON_RELEASED_OR_VERSION_FIELD entryIndex=${i}`,
                currentSummary(scopedName),
              );
            }
          }
        }
      }

      if (entry.kind === "list") {
        if (
          expectedDataLength !== undefined &&
          json.data.length !== expectedDataLength
        ) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=DATA_LENGTH observed=${json.data.length} expected=${expectedDataLength}`,
            currentSummary(scopedName),
          );
        }
        if (
          expectedMetaTotal !== undefined &&
          json.meta.total !== expectedMetaTotal
        ) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=META_TOTAL observed=${json.meta.total} expected=${expectedMetaTotal}`,
            currentSummary(scopedName),
          );
        }
        if (
          expectedEmptyLinks &&
          json.data.some(
            (item) => !Array.isArray(item.links) || item.links.length > 0,
          )
        ) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=NON_EMPTY_LINKS entryIndex=${i}`,
            currentSummary(scopedName),
          );
        }
      } else {
        if (expectedDataLength === 0 || expectedMetaTotal === 0) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=NON_EMPTY_DETAIL_IN_EMPTY_PHASE entryIndex=${i}`,
            currentSummary(scopedName),
          );
        }
        if (expectedDataLength !== undefined && expectedDataLength !== 1) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=DATA_LENGTH observed=1 expected=${expectedDataLength}`,
            currentSummary(scopedName),
          );
        }
        if (expectedMetaTotal !== undefined && expectedMetaTotal !== 1) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=META_TOTAL observed=1 expected=${expectedMetaTotal}`,
            currentSummary(scopedName),
          );
        }
        if (
          expectedEmptyLinks &&
          (!Array.isArray(json.data.links) || json.data.links.length > 0)
        ) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=NON_EMPTY_LINKS entryIndex=${i}`,
            currentSummary(scopedName),
          );
        }
      }

      for (let m = 0; m < cleanMarkers.length; m++) {
        if (text.includes(cleanMarkers[m])) {
          throw new FollowUpObserverError(
            "PRIVACY_CANARY_LEAK",
            `PRIVACY_CANARY_LEAK phase=${phaseLabel} markerIndex=${m} scanned=${targetEntries.length}`,
            currentSummary(scopedName),
          );
        }
      }
      if (decodedScan.matchedMarkerIndex !== -1) {
        throw new FollowUpObserverError(
          "PRIVACY_CANARY_LEAK",
          `PRIVACY_CANARY_LEAK phase=${phaseLabel} markerIndex=${decodedScan.matchedMarkerIndex} source=DECODED_JSON scanned=${targetEntries.length}`,
          currentSummary(scopedName),
        );
      }

      for (let r = 0; r < cleanRequired.length; r++) {
        if (!text.includes(cleanRequired[r]) && !decodedScan.requiredFound[r]) {
          throw new FollowUpObserverError(
            "EVIDENCE_INCOMPLETE",
            `EVIDENCE_INCOMPLETE phase=${phaseLabel} missingRequiredIndex=${r} entryIndex=${i} scanned=${targetEntries.length}`,
            currentSummary(scopedName),
          );
        }
      }
    }
  };

  const verifyPhasePrivacyWithPolicy = (phase, policy) => {
    assertEvidenceComplete({
      phase,
      minSucceeded: 0,
      allowAborts: policy.allowAborts,
      allowHead: policy.allowHead,
    });
    const succeededGets = scopeEntries(phase).filter(
      (entry) => entry.terminalState === "succeeded" && entry.method === "GET",
    );
    if (succeededGets.length > 0) {
      scanEntriesPrivacy(succeededGets, {
        phaseLabel: phase,
        ...policy,
      });
    }
    return assertEvidenceComplete({
      phase,
      minSucceeded: policy.minSucceeded,
      allowAborts: policy.allowAborts,
      allowHead: policy.allowHead,
      expectedKind: policy.expectedKind,
    });
  };

  const assertPhasePrivacy = (phase, options = {}) => {
    const policy = clonePhasePolicy(options);
    const effectiveExpectedKind =
      policy.expectedKind ??
      (policy.expectedDataLength !== undefined ||
      policy.expectedMetaTotal !== undefined
        ? "list"
        : "any");
    policy.expectedKind = effectiveExpectedKind;
    phasePolicies.set(phase, policy);
    return verifyPhasePrivacyWithPolicy(phase, policy);
  };

  const assertRetainedPhasesPrivacy = ({
    requireAllObservedPhasesCovered = false,
  } = {}) => {
    if (observerFaults.length > 0) {
      throw new FollowUpObserverError(
        "OBSERVER_FAULT",
        `OBSERVER_FAULT phase=all faults=${observerFaults.length}`,
        currentSummary(),
      );
    }
    if (requireAllObservedPhasesCovered) {
      for (const entry of entries) {
        if (!phasePolicies.has(entry.phase)) {
          throw new FollowUpObserverError(
            "EVIDENCE_INCOMPLETE",
            `EVIDENCE_INCOMPLETE phase=all uncoveredPhase=${entry.phase}`,
            currentSummary(),
          );
        }
      }
    }
    for (const [phase, policy] of phasePolicies.entries()) {
      verifyPhasePrivacyWithPolicy(phase, policy);
    }
    return currentSummary();
  };

  const assertGlobalPrivacy = ({
    forbiddenMarkers = [],
    requireNoVersionMetadata = true,
  } = {}) => {
    assertEvidenceComplete({ minSucceeded: 1 });
    const succeededGets = entries.filter(
      (entry) => entry.terminalState === "succeeded" && entry.method === "GET",
    );
    scanEntriesPrivacy(succeededGets, {
      phaseLabel: "all",
      forbiddenMarkers,
      requireNoVersionMetadata,
    });
    return currentSummary();
  };

  const closeAndVerifyFinalEvidence = async ({
    timeoutMs = drainTimeoutMs,
    minSucceeded = 1,
    globalForbiddenMarkers = [],
    requireNoVersionMetadata = true,
    requireAllObservedPhasesCovered = false,
  } = {}) => {
    await settle({ timeoutMs });
    observationClosed = true;
    detach();
    if (inFlightRequests.size > 0 || pendingBodyTasks.size > 0) {
      const s = currentSummary();
      throw new FollowUpObserverError(
        "EVIDENCE_INCOMPLETE",
        `EVIDENCE_INCOMPLETE phase=all residualPending inFlight=${s.inFlightCount} pendingBodies=${s.pendingBodyCount}`,
        s,
      );
    }
    assertRetainedPhasesPrivacy({ requireAllObservedPhasesCovered });
    assertEvidenceComplete({ minSucceeded });
    assertGlobalPrivacy({
      forbiddenMarkers: globalForbiddenMarkers,
      requireNoVersionMetadata,
    });
    const summary = currentSummary();
    await dispose();
    return summary;
  };

  const waitForPhaseSettled = async (
    phase,
    {
      minSucceeded = 1,
      timeoutMs = drainTimeoutMs,
      allowAborts = false,
      allowHead = false,
      expectedKind = "any",
    } = {},
  ) => {
    await settle({ timeoutMs, minSucceeded, phase });
    return assertEvidenceComplete({
      phase,
      minSucceeded,
      allowAborts,
      allowHead,
      expectedKind,
    });
  };

  const getLedger = (phase) => ({
    ...currentSummary(phase),
    faults: scopeFaults(phase).map((fault) => ({ ...fault })),
    entries: scopeEntries(phase).map((entry) => ({
      seq: entry.seq,
      phase: entry.phase,
      kind: entry.kind,
      method: entry.method,
      status: entry.status,
      terminalState: entry.terminalState,
      failureCode: entry.failureCode,
      bodyComplete: entry.bodyComplete,
      bodyByteLength: entry.bodyByteLength,
      parsedSummary: entry.parsedSummary ? { ...entry.parsedSummary } : null,
    })),
  });

  const api = {
    attach,
    detach,
    dispose,
    beginPhase,
    settle,
    waitForPhaseSettled,
    assertEvidenceComplete,
    assertPhasePrivacy,
    assertRetainedPhasesPrivacy,
    assertGlobalPrivacy,
    closeAndVerifyFinalEvidence,
    getLedger,
    getSummary: currentSummary,
  };
  return api;
}
