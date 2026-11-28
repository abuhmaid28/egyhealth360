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
  let parsed;
  try {
    targetOrigin = new URL(origin).origin;
    parsed = new URL(String(url));
  } catch {
    return null;
  }
  if (parsed.origin !== targetOrigin) return null;
  const match = FOLLOW_UP_TARGET_PATH_RE.exec(parsed.pathname);
  if (!match) return null;
  const normalizedMethod = String(method || "GET").toUpperCase();
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

function summarizeLedger(entries, extras) {
  const counts = {
    observedCount: entries.length,
    pendingCount: 0,
    succeededGetCount: 0,
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
  };
  for (const entry of entries) {
    if (entry.terminalState === "pending") counts.pendingCount++;
    else if (entry.terminalState === "succeeded") {
      if (entry.method === "HEAD") counts.succeededHeadCount++;
      else {
        counts.succeededGetCount++;
        if (entry.bodyComplete) counts.scannedCount++;
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
  } = {},
) {
  const targetOrigin = new URL(origin).origin;
  let activePhase = "initial";
  let attached = false;
  let disposed = false;
  let nextSeq = 0;
  let duplicateResponseCount = 0;
  let duplicateRequestCount = 0;
  let lateFailureAfterSuccessCount = 0;
  let unrelatedIgnoredCount = 0;

  const entries = [];
  const entryByRequest = new WeakMap();
  const transientBodies = new Map();
  const inFlightRequests = new Set();
  const pendingBodyTasks = new Set();
  const activeTimers = new Set();
  const waiters = new Set();

  const notifyWaiters = () => {
    for (const wake of waiters) wake();
  };

  const scopeEntries = (phase) =>
    phase === undefined
      ? entries
      : entries.filter((entry) => entry.phase === phase);

  const scopePendingCount = (phase) =>
    phase === undefined
      ? inFlightRequests.size + pendingBodyTasks.size
      : entries.filter(
          (entry) =>
            entry.phase === phase && entry.terminalState === "pending",
        ).length;

  const currentSummary = (phase) => {
    const scoped = scopeEntries(phase);
    const base = summarizeLedger(scoped, {
      duplicateResponseCount,
      lateFailureAfterSuccessCount,
    });
    return {
      phase: phase ?? "all",
      activePhase,
      disposed,
      duplicateRequestCount,
      unrelatedIgnoredCount,
      inFlightCount: inFlightRequests.size,
      pendingBodyCount: pendingBodyTasks.size,
      ...base,
    };
  };

  const makeEntry = (target, phase) => ({
    seq: ++nextSeq,
    phase,
    kind: target.kind,
    method: target.method,
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
      if (disposed) return;
      const target = classifyFollowUpTargetRequest({
        url: req?.url?.(),
        method: req?.method?.(),
        origin: targetOrigin,
      });
      if (!target) {
        unrelatedIgnoredCount++;
        return;
      }
      if (req && typeof req === "object" && entryByRequest.has(req)) {
        duplicateRequestCount++;
        return;
      }
      const entry = makeEntry(target, activePhase);
      entries.push(entry);
      if (req && typeof req === "object") entryByRequest.set(req, entry);
      inFlightRequests.add(entry.seq);
      if (!target.readMethod) {
        entry.terminalState = "http_error";
        entry.failureCode = "UNEXPECTED_METHOD";
      }
      notifyWaiters();
    } catch {
      /* Listener must never emit uncaught exceptions. */
    }
  };

  const startBodyRead = (entry, res) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("BODY_TIMEOUT"));
      }, bodyReadTimeoutMs);
      activeTimers.add(timer);
    });
    const textPromise = Promise.resolve().then(() => res.text());
    const task = Promise.race([textPromise, timeoutPromise])
      .then(
        (rawText) => {
          if (disposed) {
            if (entry.terminalState === "pending") {
              entry.terminalState = "body_error";
              entry.failureCode = "OBSERVER_CLOSED";
            }
            return;
          }
          if (typeof rawText !== "string" || rawText.length === 0) {
            entry.terminalState = "body_error";
            entry.failureCode = "EMPTY_BODY";
            return;
          }
          let parsed;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            entry.terminalState = "body_error";
            entry.failureCode = "INVALID_JSON";
            return;
          }
          if (!validateEnvelope(entry.kind, parsed)) {
            entry.terminalState = "body_error";
            entry.failureCode = "INVALID_PAYLOAD";
            return;
          }
          transientBodies.set(entry.seq, { text: rawText, json: parsed });
          entry.bodyComplete = true;
          entry.bodyByteLength = Buffer.byteLength(rawText, "utf8");
          entry.parsedSummary = {
            isList: entry.kind === "list",
            dataCount: entry.kind === "list" ? parsed.data.length : 1,
            total: entry.kind === "list" ? parsed.meta.total : null,
          };
          entry.terminalState = "succeeded";
          entry.failureCode = null;
        },
        (err) => {
          if (entry.terminalState === "pending") {
            entry.terminalState = "body_error";
            entry.failureCode = disposed
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
        }
        pendingBodyTasks.delete(task);
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
      });
    // Ensure background textPromise cannot emit an unhandled rejection if timeout won first.
    textPromise.catch(() => {});
    pendingBodyTasks.add(task);
  };

  const handleResponse = (res) => {
    try {
      if (disposed) return;
      const req = typeof res?.request === "function" ? res.request() : null;
      const url = typeof res?.url === "function" ? res.url() : req?.url?.();
      const method =
        req && typeof req.method === "function"
          ? req.method()
          : typeof res?.method === "function"
            ? res.method()
            : "GET";
      const target = classifyFollowUpTargetRequest({
        url,
        method,
        origin: targetOrigin,
      });
      if (!target) {
        if (!req) unrelatedIgnoredCount++;
        return;
      }
      let entry =
        req && typeof req === "object" ? entryByRequest.get(req) : undefined;
      if (!entry) {
        entry = makeEntry(target, activePhase);
        entries.push(entry);
        if (req && typeof req === "object") entryByRequest.set(req, entry);
        inFlightRequests.add(entry.seq);
      }
      if (entry.responseSeen) {
        duplicateResponseCount++;
        return;
      }
      entry.responseSeen = true;
      const status = typeof res?.status === "function" ? Number(res.status()) : 0;
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
        entry.bodyComplete = true;
        inFlightRequests.delete(entry.seq);
        notifyWaiters();
        return;
      }
      startBodyRead(entry, res);
      notifyWaiters();
    } catch {
      /* Listener must never emit uncaught exceptions. */
    }
  };

  const handleRequestFinished = (req) => {
    try {
      const entry =
        req && typeof req === "object" ? entryByRequest.get(req) : undefined;
      if (!entry) return;
      inFlightRequests.delete(entry.seq);
      notifyWaiters();
    } catch {
      /* Listener must never emit uncaught exceptions. */
    }
  };

  const handleRequestFailed = (req) => {
    try {
      const entry =
        req && typeof req === "object" ? entryByRequest.get(req) : undefined;
      if (!entry) return;
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
        const failureText = String(req?.failure?.()?.errorText ?? "");
        if (/abort|cancel/i.test(failureText)) {
          entry.terminalState = "aborted";
          entry.failureCode = "REQUEST_ABORTED";
        } else {
          entry.terminalState = "request_failed";
          entry.failureCode = "REQUEST_FAILED";
        }
      }
      notifyWaiters();
    } catch {
      /* Listener must never emit uncaught exceptions. */
    }
  };

  const attach = () => {
    if (disposed)
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: cannot attach a disposed observer",
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
    if (disposed) return;
    disposed = true;
    detach();
    for (const timer of activeTimers) globalThis.clearTimeout(timer);
    activeTimers.clear();
    transientBodies.clear();
    inFlightRequests.clear();
    notifyWaiters();
    waiters.clear();
  };

  const beginPhase = (phase) => {
    if (disposed)
      throw new FollowUpObserverError(
        "INVALID_OBSERVER_STATE",
        "INVALID_OBSERVER_STATE: cannot change phase after dispose",
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
  } = {}) => {
    const s = currentSummary(phase);
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
      s.succeededGetCount < minSucceeded ||
      s.scannedCount < s.succeededGetCount
    ) {
      throw new FollowUpObserverError(
        "EVIDENCE_INCOMPLETE",
        `EVIDENCE_INCOMPLETE phase=${s.phase} observed=${s.observedCount} succeededGet=${s.succeededGetCount} minRequired=${minSucceeded} pending=${s.pendingCount} bodyErrors=${s.bodyErrorCount} httpErrors=${s.httpErrorCount} redirects=${s.redirectCount} aborts=${s.abortedCount} requestFailed=${s.requestFailedCount}`,
        s,
      );
    }
    return s;
  };

  const scanEntriesPrivacy = (
    targetEntries,
    {
      phaseLabel,
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

    for (let i = 0; i < targetEntries.length; i++) {
      const entry = targetEntries[i];
      const payload = transientBodies.get(entry.seq);
      if (!payload || !entry.bodyComplete) {
        throw new FollowUpObserverError(
          "EVIDENCE_INCOMPLETE",
          `EVIDENCE_INCOMPLETE phase=${phaseLabel} missing transient body seq=${entry.seq}`,
          currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
        );
      }
      const { text, json } = payload;

      if (requireNoVersionMetadata) {
        if (text.includes('"version":') || /"version"\s*:/.test(text)) {
          throw new FollowUpObserverError(
            "PRIVACY_CANARY_LEAK",
            `PRIVACY_CANARY_LEAK phase=${phaseLabel} violation=VERSION_TEXT_KEY entryIndex=${i}`,
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
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
              currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
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
                currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
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
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
          );
        }
        if (
          expectedMetaTotal !== undefined &&
          json.meta.total !== expectedMetaTotal
        ) {
          throw new FollowUpObserverError(
            "FORBIDDEN_PHASE_MARKER",
            `FORBIDDEN_PHASE_MARKER phase=${phaseLabel} violation=META_TOTAL observed=${json.meta.total} expected=${expectedMetaTotal}`,
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
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
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
          );
        }
      }

      for (let m = 0; m < cleanMarkers.length; m++) {
        if (text.includes(cleanMarkers[m])) {
          throw new FollowUpObserverError(
            "PRIVACY_CANARY_LEAK",
            `PRIVACY_CANARY_LEAK phase=${phaseLabel} markerIndex=${m} scanned=${targetEntries.length}`,
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
          );
        }
      }
    }

    if (cleanRequired.length > 0) {
      const latestPayload = transientBodies.get(targetEntries.at(-1).seq);
      for (let r = 0; r < cleanRequired.length; r++) {
        if (!latestPayload.text.includes(cleanRequired[r])) {
          throw new FollowUpObserverError(
            "EVIDENCE_INCOMPLETE",
            `EVIDENCE_INCOMPLETE phase=${phaseLabel} missingRequiredIndex=${r} scanned=${targetEntries.length}`,
            currentSummary(phaseLabel === "all" ? undefined : phaseLabel),
          );
        }
      }
    }
  };

  const assertPhasePrivacy = (phase, options = {}) => {
    const minSucceeded = options.minSucceeded ?? 1;
    const summary = assertEvidenceComplete({
      phase,
      minSucceeded,
      allowAborts: options.allowAborts ?? false,
    });
    const succeededGets = scopeEntries(phase).filter(
      (entry) => entry.terminalState === "succeeded" && entry.method === "GET",
    );
    if (succeededGets.length > 0) {
      scanEntriesPrivacy(succeededGets, {
        phaseLabel: phase,
        ...options,
      });
    }
    return summary;
  };

  const assertGlobalPrivacy = ({
    forbiddenMarkers = [],
    requireNoVersionMetadata = true,
  } = {}) => {
    const succeededGets = entries.filter(
      (entry) => entry.terminalState === "succeeded" && entry.method === "GET",
    );
    if (succeededGets.length === 0) {
      throw new FollowUpObserverError(
        "EVIDENCE_INCOMPLETE",
        "EVIDENCE_INCOMPLETE phase=all succeededGet=0",
        currentSummary(),
      );
    }
    scanEntriesPrivacy(succeededGets, {
      phaseLabel: "all",
      forbiddenMarkers,
      requireNoVersionMetadata,
    });
    return currentSummary();
  };

  const waitForPhaseSettled = async (
    phase,
    { minSucceeded = 1, timeoutMs = drainTimeoutMs, allowAborts = false } = {},
  ) => {
    await settle({ timeoutMs, minSucceeded, phase });
    return assertEvidenceComplete({ phase, minSucceeded, allowAborts });
  };

  const getLedger = (phase) => ({
    ...currentSummary(phase),
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
    assertGlobalPrivacy,
    getLedger,
    getSummary: currentSummary,
  };
  return api;
}
