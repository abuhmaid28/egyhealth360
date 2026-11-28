import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import {
  classifyFollowUpTargetRequest,
  createFollowUpResponseObserver,
  FollowUpObserverError,
} from "../scripts/support/ui-follow-up-response-observer.mjs";

const ORIGIN = "http://localhost:3000";
const ROOT_ID = "11111111-1111-4111-8111-111111111111";
const CONSULTATION_ID = "22222222-2222-4222-8222-222222222222";
const DRAFT_ID = "33333333-3333-4333-8333-333333333333";
const RELEASED_ID = "44444444-4444-4444-8444-444444444444";
const CORRECTED_ID = "55555555-5555-4555-8555-555555555555";
const BOOKING_ID = "66666666-6666-4666-8666-666666666666";
const INSTRUCTION = "SYNTHETIC_FOLLOW_UP_CANARY";

function listJson(items, total = items.length) {
  return JSON.stringify({
    data: items,
    meta: { page: 1, pageSize: 20, total },
  });
}

function releasedItem({
  instruction = INSTRUCTION,
  bookingState = null,
  extraVersionFields = {},
} = {}) {
  return {
    id: ROOT_ID,
    consultationId: CONSULTATION_ID,
    versions: [
      {
        id: RELEASED_ID,
        state: "SIGNED_RELEASED",
        instruction,
        desiredWindow: null,
        createdAt: "2026-11-01T10:00:00.000Z",
        signedAt: "2026-11-01T10:00:00.000Z",
        releasedAt: "2026-11-01T10:00:00.000Z",
        reason: null,
        predecessorId: null,
        effective: true,
        ...extraVersionFields,
      },
    ],
    links: bookingState
      ? [
          {
            id: "77777777-7777-4777-8777-777777777777",
            bookingId: BOOKING_ID,
            previousLinkId: null,
            linkedAt: "2026-11-02T10:00:00.000Z",
            bookingState,
          },
        ]
      : [],
    history: { page: 1, pageSize: 1, total: 1 },
    linkHistory: { page: 1, pageSize: 1, total: bookingState ? 1 : 0 },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function emitExchange(
  page,
  {
    url = `${ORIGIN}/api/v1/me/follow-up-intents?page=1&pageSize=20`,
    method = "GET",
    status = 200,
    bodyText,
    bodyPromise,
    failText,
    emitRequest = true,
    emitFinish = true,
  } = {},
) {
  const req = {
    url: () => url,
    method: () => method,
    failure: () => (failText ? { errorText: failText } : null),
  };
  if (emitRequest) page.emit("request", req);
  if (failText && status === null) {
    page.emit("requestfailed", req);
    return req;
  }
  const res = {
    url: () => url,
    status: () => status,
    ok: () => status >= 200 && status < 300,
    request: () => req,
    text: () =>
      bodyPromise ? bodyPromise : Promise.resolve(bodyText ?? listJson([])),
  };
  page.emit("response", res);
  if (failText) page.emit("requestfailed", req);
  else if (emitFinish) page.emit("requestfinished", req);
  return req;
}

test("deterministic pre-fix reproduction: legacy untracked observer crashes on Protocol error and masks late canary", async () => {
  const legacyRejectionProbe = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
      import { EventEmitter } from "node:events";
      const page = new EventEmitter();
      const bodies = [];
      page.on("response", async (r) => {
        if (new URL(r.url()).pathname.includes("/me/follow-up-intents") && r.ok())
          bodies.push(await r.text());
      });
      let rej;
      page.emit("response", {
        url: () => "http://localhost:3000/api/v1/me/follow-up-intents?page=1&pageSize=20",
        ok: () => true,
        text: () => new Promise((_, reject) => { rej = reject; }),
      });
      rej(new Error("Protocol error (Network.getResponseBody): No resource with given identifier found"));
      `,
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(legacyRejectionProbe.status, 0);
  assert.match(legacyRejectionProbe.stderr, /Network\.getResponseBody/);

  const page = new EventEmitter();
  const releasedBodies = [];
  page.on("response", async (r) => {
    if (new URL(r.url()).pathname.includes("/me/follow-up-intents") && r.ok())
      releasedBodies.push(await r.text());
  });
  const d = deferred();
  page.emit("response", {
    url: () => `${ORIGIN}/api/v1/me/follow-up-intents?page=1&pageSize=20`,
    ok: () => true,
    text: () => d.promise,
  });
  assert.equal(!releasedBodies.join("").includes(DRAFT_ID), true);
  d.resolve(listJson([{ id: ROOT_ID, versions: [{ id: DRAFT_ID }] }]));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(releasedBodies.join("").includes(DRAFT_ID), true);
});

test("exact origin/path/method matching ignores unrelated traffic and preserves list/detail variants", () => {
  assert.deepEqual(
    classifyFollowUpTargetRequest({
      url: `${ORIGIN}/api/v1/me/follow-up-intents?page=1&pageSize=20`,
      method: "GET",
      origin: ORIGIN,
    }),
    {
      origin: ORIGIN,
      pathname: "/api/v1/me/follow-up-intents",
      kind: "list",
      method: "GET",
      readMethod: true,
    },
  );
  assert.deepEqual(
    classifyFollowUpTargetRequest({
      url: `${ORIGIN}/api/v1/me/follow-up-intents/${ROOT_ID}`,
      method: "HEAD",
      origin: ORIGIN,
    }),
    {
      origin: ORIGIN,
      pathname: `/api/v1/me/follow-up-intents/${ROOT_ID}`,
      kind: "detail",
      method: "HEAD",
      readMethod: true,
    },
  );
  for (const ignored of [
    `${ORIGIN}/patient/follow-up`,
    `${ORIGIN}/api/v1/me/summaries`,
    `${ORIGIN}/api/v1/consultations/${CONSULTATION_ID}/follow-up-intents`,
    `${ORIGIN}/api/v1/me/follow-up-intents-extra`,
    `${ORIGIN}/api/v1/me/follow-up-intents/${ROOT_ID}/extra`,
    `http://127.0.0.1:3000/api/v1/me/follow-up-intents`,
    `https://attacker.invalid/api/v1/me/follow-up-intents`,
  ]) {
    assert.equal(
      classifyFollowUpTargetRequest({ url: ignored, method: "GET", origin: ORIGIN }),
      null,
    );
  }
});

test("multi-phase happy path covers all required phases and passes sanitized privacy checks", async () => {
  const page = new EventEmitter();
  const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
  try {
    // Unrelated traffic must never contaminate target ledger
    emitExchange(page, { url: `${ORIGIN}/patient/follow-up`, bodyText: DRAFT_ID });
    emitExchange(page, { url: `${ORIGIN}/api/v1/me/summaries`, bodyText: "{}" });
    emitExchange(page, {
      url: "https://other-origin.invalid/api/v1/me/follow-up-intents",
      bodyText: listJson([]),
    });

    observer.beginPhase("login_landing");
    emitExchange(page, { bodyText: listJson([]) });
    await observer.waitForPhaseSettled("login_landing", { minSucceeded: 1 });
    observer.assertPhasePrivacy("login_landing", {
      minSucceeded: 1,
      expectedDataLength: 0,
      expectedMetaTotal: 0,
      forbiddenMarkers: [INSTRUCTION, DRAFT_ID, ROOT_ID],
    });

    observer.beginPhase("initial_draft_hidden");
    emitExchange(page, { bodyText: listJson([]) });
    await observer.waitForPhaseSettled("initial_draft_hidden", { minSucceeded: 1 });
    observer.assertPhasePrivacy("initial_draft_hidden", {
      minSucceeded: 1,
      expectedDataLength: 0,
      expectedMetaTotal: 0,
      forbiddenMarkers: [INSTRUCTION, DRAFT_ID, ROOT_ID],
    });

    observer.beginPhase("released");
    emitExchange(page, { bodyText: listJson([releasedItem()]) });
    await observer.waitForPhaseSettled("released", { minSucceeded: 1 });
    observer.assertPhasePrivacy("released", {
      minSucceeded: 1,
      expectedDataLength: 1,
      expectedMetaTotal: 1,
      requiredText: [INSTRUCTION],
      forbiddenMarkers: [DRAFT_ID],
    });

    observer.beginPhase("linked");
    emitExchange(page, {
      bodyText: listJson([releasedItem({ bookingState: "BOOKED" })]),
    });
    await observer.waitForPhaseSettled("linked", { minSucceeded: 1 });
    observer.assertPhasePrivacy("linked", {
      minSucceeded: 1,
      expectedDataLength: 1,
      expectedMetaTotal: 1,
      requiredText: [INSTRUCTION, BOOKING_ID, "BOOKED"],
      forbiddenMarkers: [DRAFT_ID],
    });

    observer.beginPhase("booking_cancelled");
    emitExchange(page, {
      bodyText: listJson([releasedItem({ bookingState: "CANCELLED" })]),
    });
    await observer.waitForPhaseSettled("booking_cancelled", { minSucceeded: 1 });
    observer.assertPhasePrivacy("booking_cancelled", {
      minSucceeded: 1,
      expectedDataLength: 1,
      expectedMetaTotal: 1,
      requiredText: [INSTRUCTION, BOOKING_ID, "CANCELLED"],
      forbiddenMarkers: [DRAFT_ID],
    });

    observer.beginPhase("corrected");
    emitExchange(page, {
      bodyText: listJson([
        releasedItem({
          instruction: INSTRUCTION + " Corrected wording.",
          bookingState: "CANCELLED",
        }),
      ]),
    });
    await observer.waitForPhaseSettled("corrected", { minSucceeded: 1 });
    observer.assertPhasePrivacy("corrected", {
      minSucceeded: 1,
      expectedDataLength: 1,
      expectedMetaTotal: 1,
      requiredText: [INSTRUCTION + " Corrected wording."],
      forbiddenMarkers: [DRAFT_ID],
    });

    observer.beginPhase("privacy_restricted");
    emitExchange(page, { bodyText: listJson([]) });
    await observer.waitForPhaseSettled("privacy_restricted", { minSucceeded: 1 });
    observer.assertPhasePrivacy("privacy_restricted", {
      minSucceeded: 1,
      expectedDataLength: 0,
      expectedMetaTotal: 0,
      expectedEmptyLinks: true,
      forbiddenMarkers: [
        ROOT_ID,
        DRAFT_ID,
        RELEASED_ID,
        CORRECTED_ID,
        INSTRUCTION,
        "Corrected wording.",
        BOOKING_ID,
      ],
    });

    observer.assertGlobalPrivacy({ forbiddenMarkers: [DRAFT_ID] });
    const summary = observer.getSummary();
    assert.equal(summary.observedCount, 7);
    assert.equal(summary.succeededGetCount, 7);
    assert.equal(summary.scannedCount, 7);
    assert.equal(summary.unrelatedIgnoredCount, 3);
    assert.equal(summary.bodyErrorCount, 0);
  } finally {
    observer.dispose();
  }
  assert.equal(page.listenerCount("request"), 0);
  assert.equal(page.listenerCount("response"), 0);
  assert.equal(page.listenerCount("requestfailed"), 0);
  assert.equal(page.listenerCount("requestfinished"), 0);
});

test("rejected response.text() is caught without unhandled rejection and fails closed with sanitized error", async () => {
  const page = new EventEmitter();
  const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
  let unhandledCount = 0;
  const onUnhandled = () => {
    unhandledCount++;
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    observer.beginPhase("initial_draft_hidden");
    const d = deferred();
    emitExchange(page, { bodyPromise: d.promise });
    d.reject(
      new Error(
        `Protocol error (Network.getResponseBody): No resource with given identifier found ${INSTRUCTION}`,
      ),
    );
    await assert.rejects(
      observer.waitForPhaseSettled("initial_draft_hidden", {
        minSucceeded: 1,
        timeoutMs: 200,
      }),
      (err) => {
        assert.ok(err instanceof FollowUpObserverError);
        assert.equal(err.code, "EVIDENCE_INCOMPLETE");
        assert.ok(!err.message.includes("No resource with given identifier"));
        assert.ok(!err.message.includes(INSTRUCTION));
        return true;
      },
    );
    const ledger = observer.getLedger("initial_draft_hidden");
    assert.equal(ledger.bodyErrorCount, 1);
    assert.equal(ledger.succeededGetCount, 0);
    assert.equal(ledger.entries[0].terminalState, "body_error");
    assert.equal(ledger.entries[0].failureCode, "BODY_READ_ERROR");
  } finally {
    process.off("unhandledRejection", onUnhandled);
    observer.dispose();
  }
  assert.equal(unhandledCount, 0);
});

test("delayed, out-of-order, duplicate callbacks, and pending drain timeout behave deterministically", async () => {
  const page = new EventEmitter();
  const observer = createFollowUpResponseObserver(page, {
    origin: ORIGIN,
    bodyReadTimeoutMs: 120,
    drainTimeoutMs: 120,
  }).attach();
  try {
    observer.beginPhase("released");
    const d1 = deferred();
    const d2 = deferred();
    const req1 = emitExchange(page, { bodyPromise: d1.promise, emitFinish: false });
    const req2 = emitExchange(page, { bodyPromise: d2.promise, emitFinish: false });

    // Duplicate response callback for req1 must not double-count
    page.emit("response", {
      url: () => `${ORIGIN}/api/v1/me/follow-up-intents`,
      status: () => 200,
      request: () => req1,
      text: () => Promise.resolve(listJson([])),
    });

    // Out-of-order completion: req2 resolves before req1
    d2.resolve(listJson([releasedItem({ instruction: INSTRUCTION })]));
    page.emit("requestfinished", req2);
    d1.resolve(listJson([releasedItem({ instruction: INSTRUCTION })]));
    page.emit("requestfinished", req1);

    await observer.waitForPhaseSettled("released", { minSucceeded: 2, timeoutMs: 300 });
    const ledger = observer.getLedger("released");
    assert.equal(ledger.succeededGetCount, 2);
    assert.equal(ledger.duplicateResponseCount, 1);

    // Never-settling response triggers OBSERVER_DRAIN_TIMEOUT cleanly
    observer.beginPhase("stalled");
    const dNever = deferred();
    emitExchange(page, { bodyPromise: dNever.promise, emitFinish: false });
    await assert.rejects(
      observer.settle({ timeoutMs: 40, minSucceeded: 1, phase: "stalled" }),
      (err) => err instanceof FollowUpObserverError && err.code === "OBSERVER_DRAIN_TIMEOUT",
    );
    dNever.resolve(listJson([]));
  } finally {
    observer.dispose();
  }
});

test("empty coverage, empty body, bad JSON/shape, redirects, HTTP errors, unexpected methods, and aborts fail closed", async () => {
  const page = new EventEmitter();
  const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
  try {
    observer.beginPhase("empty_coverage");
    await assert.rejects(
      observer.waitForPhaseSettled("empty_coverage", { minSucceeded: 1, timeoutMs: 30 }),
      (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
    );

    observer.beginPhase("bad_bodies");
    emitExchange(page, { bodyText: "" });
    emitExchange(page, { bodyText: "{bad json" });
    emitExchange(page, { bodyText: JSON.stringify({ data: "wrong" }) });
    await observer.settle({ phase: "bad_bodies", timeoutMs: 100 });
    const badLedger = observer.getLedger("bad_bodies");
    assert.equal(badLedger.bodyErrorCount, 3);
    assert.deepEqual(
      badLedger.entries.map((e) => e.failureCode),
      ["EMPTY_BODY", "INVALID_JSON", "INVALID_PAYLOAD"],
    );
    assert.throws(
      () => observer.assertEvidenceComplete({ phase: "bad_bodies", minSucceeded: 1 }),
      (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
    );

    observer.beginPhase("network_faults");
    emitExchange(page, { status: 302, bodyText: "" });
    emitExchange(page, { status: 404, bodyText: "{}" });
    emitExchange(page, { status: 503, bodyText: "{}" });
    emitExchange(page, { method: "POST", status: 200, bodyText: "{}" });
    emitExchange(page, { status: null, failText: "net::ERR_ABORTED" });
    emitExchange(page, { status: null, failText: "net::ERR_CONNECTION_REFUSED" });
    // Delivered 2xx whose body fails and then emits requestfailed abort MUST NOT count as benign abort
    const dAbortAfter200 = deferred();
    const reqDelivered = emitExchange(page, {
      bodyPromise: dAbortAfter200.promise,
      emitFinish: false,
    });
    page.emit("requestfailed", reqDelivered);
    dAbortAfter200.reject(new Error("Network.getResponseBody missing"));

    await observer.settle({ phase: "network_faults", timeoutMs: 100 });
    const faults = observer.getLedger("network_faults");
    assert.equal(faults.redirectCount, 1);
    assert.equal(faults.httpErrorCount, 2);
    assert.equal(faults.unexpectedMethodCount, 1);
    assert.equal(faults.abortedCount, 1);
    assert.equal(faults.requestFailedCount, 1);
    assert.equal(faults.bodyErrorCount, 1);
    assert.equal(faults.lateFailureAfterSuccessCount, 1);
    assert.throws(
      () => observer.assertEvidenceComplete({ phase: "network_faults", minSucceeded: 1 }),
      (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
    );
  } finally {
    observer.dispose();
  }
});

test("privacy canary leak detection catches wrong-phase leaks, delayed leaks, version metadata, and post-suppression leaks without exposing raw values", async () => {
  // 1. Pre-release leak
  {
    const page = new EventEmitter();
    const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
    try {
      observer.beginPhase("initial_draft_hidden");
      emitExchange(page, { bodyText: listJson([releasedItem()]) });
      await observer.waitForPhaseSettled("initial_draft_hidden", { minSucceeded: 1 });
      assert.throws(
        () =>
          observer.assertPhasePrivacy("initial_draft_hidden", {
            minSucceeded: 1,
            expectedDataLength: 0,
            expectedMetaTotal: 0,
            forbiddenMarkers: [INSTRUCTION, DRAFT_ID, ROOT_ID],
          }),
        (err) => {
          assert.ok(err instanceof FollowUpObserverError);
          assert.ok(["FORBIDDEN_PHASE_MARKER", "PRIVACY_CANARY_LEAK"].includes(err.code));
          assert.ok(!err.message.includes(INSTRUCTION));
          assert.ok(!err.message.includes(ROOT_ID));
          return true;
        },
      );
    } finally {
      observer.dispose();
    }
  }

  // 2. Delayed second response leaks draftId and "version": metadata before drain
  {
    const page = new EventEmitter();
    const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
    try {
      observer.beginPhase("released");
      emitExchange(page, { bodyText: listJson([releasedItem()]) });
      const dLate = deferred();
      emitExchange(page, { bodyPromise: dLate.promise, emitFinish: false });
      dLate.resolve(
        listJson([
          releasedItem({
            extraVersionFields: { version: 1, predecessorId: DRAFT_ID },
          }),
        ]),
      );
      await observer.waitForPhaseSettled("released", { minSucceeded: 2 });
      assert.throws(
        () =>
          observer.assertPhasePrivacy("released", {
            minSucceeded: 1,
            forbiddenMarkers: [DRAFT_ID],
          }),
        (err) => {
          assert.ok(err instanceof FollowUpObserverError);
          assert.equal(err.code, "PRIVACY_CANARY_LEAK");
          assert.ok(!err.message.includes(DRAFT_ID));
          return true;
        },
      );
    } finally {
      observer.dispose();
    }
  }

  // 3. Post-privacy-restriction lingering count or booking/root leak
  {
    const page = new EventEmitter();
    const observer = createFollowUpResponseObserver(page, { origin: ORIGIN }).attach();
    try {
      observer.beginPhase("privacy_restricted");
      emitExchange(page, {
        bodyText: listJson([releasedItem({ bookingState: "BOOKED" })]),
      });
      await observer.waitForPhaseSettled("privacy_restricted", { minSucceeded: 1 });
      assert.throws(
        () =>
          observer.assertPhasePrivacy("privacy_restricted", {
            minSucceeded: 1,
            expectedDataLength: 0,
            expectedMetaTotal: 0,
            expectedEmptyLinks: true,
            forbiddenMarkers: [ROOT_ID, INSTRUCTION, BOOKING_ID],
          }),
        (err) =>
          err instanceof FollowUpObserverError &&
          ["FORBIDDEN_PHASE_MARKER", "PRIVACY_CANARY_LEAK"].includes(err.code) &&
          !err.message.includes(INSTRUCTION),
      );
    } finally {
      observer.dispose();
    }
  }
});

test("mutation controls fail if a rejection is ignored, a required response is omitted, or private data is allowed", async () => {
  // Control A: rejection cannot be masked into pass even if another valid response exists in same phase
  const p1 = new EventEmitter();
  const o1 = createFollowUpResponseObserver(p1, { origin: ORIGIN }).attach();
  try {
    o1.beginPhase("released");
    emitExchange(p1, { bodyText: listJson([releasedItem()]) });
    const dFail = deferred();
    emitExchange(p1, { bodyPromise: dFail.promise });
    dFail.reject(new Error("Protocol error"));
    await assert.rejects(
      o1.waitForPhaseSettled("released", { minSucceeded: 1, timeoutMs: 100 }),
      (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
    );
  } finally {
    o1.dispose();
  }

  // Control B: omitting a required refresh in a later phase cannot pass using prior phase observations
  const p2 = new EventEmitter();
  const o2 = createFollowUpResponseObserver(p2, { origin: ORIGIN }).attach();
  try {
    o2.beginPhase("released");
    emitExchange(p2, { bodyText: listJson([releasedItem()]) });
    await o2.waitForPhaseSettled("released", { minSucceeded: 1 });

    o2.beginPhase("privacy_restricted");
    // No refresh emitted in privacy_restricted
    await assert.rejects(
      o2.waitForPhaseSettled("privacy_restricted", { minSucceeded: 1, timeoutMs: 30 }),
      (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
    );
  } finally {
    o2.dispose();
  }

  // Control C: private canary leaked in an earlier phase is still caught by assertGlobalPrivacy even if final phase is clean
  const p3 = new EventEmitter();
  const o3 = createFollowUpResponseObserver(p3, { origin: ORIGIN }).attach();
  try {
    o3.beginPhase("released");
    emitExchange(p3, {
      bodyText: listJson([
        {
          ...releasedItem(),
          versions: [
            {
              ...releasedItem().versions[0],
              predecessorId: DRAFT_ID,
            },
          ],
        },
      ]),
    });
    await o3.waitForPhaseSettled("released", { minSucceeded: 1 });
    o3.beginPhase("privacy_restricted");
    emitExchange(p3, { bodyText: listJson([]) });
    await o3.waitForPhaseSettled("privacy_restricted", { minSucceeded: 1 });

    assert.throws(
      () => o3.assertGlobalPrivacy({ forbiddenMarkers: [DRAFT_ID] }),
      (err) => err instanceof FollowUpObserverError && err.code === "PRIVACY_CANARY_LEAK",
    );
  } finally {
    o3.dispose();
  }
});

test("dispose during pending body read removes listeners, clears transient bodies, and never throws", async () => {
  const page = new EventEmitter();
  const observer = createFollowUpResponseObserver(page, {
    origin: ORIGIN,
    bodyReadTimeoutMs: 500,
    drainTimeoutMs: 500,
  }).attach();
  observer.beginPhase("released");
  const d = deferred();
  emitExchange(page, { bodyPromise: d.promise, emitFinish: false });
  observer.dispose();
  assert.equal(page.listenerCount("request"), 0);
  assert.equal(page.listenerCount("response"), 0);
  assert.equal(page.listenerCount("requestfailed"), 0);
  assert.equal(page.listenerCount("requestfinished"), 0);
  // Resolving or rejecting after dispose must be completely inert
  d.resolve(listJson([releasedItem()]));
  await new Promise((r) => setTimeout(r, 0));
  assert.throws(
    () => observer.assertEvidenceComplete({ minSucceeded: 1 }),
    (err) => err instanceof FollowUpObserverError && err.code === "EVIDENCE_INCOMPLETE",
  );
});
