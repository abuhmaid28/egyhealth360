import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const out = mkdtempSync(join(tmpdir(), "eh-follow-up-ui-"));
execFileSync("node_modules/.bin/tsc", [
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--target",
  "ES2022",
  "--esModuleInterop",
  "--skipLibCheck",
  "--rootDir",
  "apps/web/src/lib",
  "--outDir",
  out,
  "apps/web/src/lib/api/live.ts",
]);
const require = createRequire(import.meta.url);
const { createLiveFollowUpApi, followUpHttpError, windowForEditing } = require(
  join(out, "api/follow-up-intents.js"),
);
const { createLiveAdapter } = require(join(out, "api/live.js"));
const consultation = randomUUID(),
  root = randomUUID(),
  draftId = randomUUID(),
  releasedId = randomUUID(),
  booking = randomUUID();
const instant = "2026-11-01T10:00:00.000Z";
const draft = {
  instruction: "Human-entered · تعليمات الطبيب",
  desiredWindow: null,
};
function dto(released = false) {
  return {
    id: root,
    consultationId: consultation,
    versions: [
      {
        id: released ? releasedId : draftId,
        ...(released ? {} : { version: 1 }),
        state: released ? "SIGNED_RELEASED" : "DRAFT",
        ...draft,
        createdAt: instant,
        signedAt: released ? instant : null,
        releasedAt: released ? instant : null,
        reason: null,
        predecessorId: null,
        effective: released,
      },
    ],
    links: [],
    history: { page: 1, pageSize: 1, total: 1 },
    linkHistory: { page: 1, pageSize: 1, total: 0 },
  };
}
function harness(
  responder = (path, init) =>
    init
      ? { data: dto() }
      : { data: [dto()], meta: { page: 1, pageSize: 20, total: 1 } },
) {
  const calls = [];
  const api = createLiveFollowUpApi(
    async (path, init) => {
      calls.push({
        path,
        init,
        body: init?.body ? JSON.parse(init.body) : null,
      });
      return responder(path, init);
    },
    () => "memory-csrf",
  );
  return { api, service: api.forConsultation(consultation), calls };
}
test("Slice 6 exact draft and release bodies, CSRF and no identity/Idempotency-Key injection", async () => {
  const h = harness();
  await h.service.create(draft);
  const call = h.calls[0];
  assert.equal(call.path, `/consultations/${consultation}/follow-up-intents`);
  assert.deepEqual(Object.keys(call.body).sort(), [
    "desiredWindow",
    "instruction",
    "operationKey",
  ]);
  assert.equal(call.body.instruction, draft.instruction);
  assert.equal(call.init.headers["X-CSRF-Token"], "memory-csrf");
  assert.equal(call.init.headers["Idempotency-Key"], undefined);
  await h.service.list();
  await h.service.release(draftId);
  assert.equal(h.calls.at(-1).path, `${call.path}/${root}/sign-release`);
  assert.deepEqual(Object.keys(h.calls.at(-1).body).sort(), [
    "expectedVersion",
    "operationKey",
  ]);
  assert.equal(h.calls.at(-1).body.expectedVersion, 1);
});
test("uncertain response makes no automatic retry; unchanged explicit retry preserves exact bytes; changed text gets new key", async () => {
  let lost = true;
  const h = harness(() => {
    if (lost) throw new Error("private SQL canary");
    return { data: dto() };
  });
  await assert.rejects(
    h.service.create(draft),
    (e) => e.code === "uncertain" && !e.message.includes("canary"),
  );
  assert.equal(h.calls.length, 1);
  lost = false;
  await h.service.create(draft);
  assert.equal(h.calls[0].init.body, h.calls[1].init.body);
  await h.service.create({ ...draft, instruction: "Changed" });
  assert.notEqual(h.calls[1].body.operationKey, h.calls[2].body.operationKey);
});
test("malformed committed receipt stays uncertain with stable retry identity", async () => {
  let corrupt = true;
  const h = harness(() => ({
    data: corrupt ? { ...dto(), versions: [] } : dto(),
  }));
  await assert.rejects(h.service.create(draft), (e) => e.code === "uncertain");
  corrupt = false;
  await h.service.create(draft);
  assert.equal(h.calls[0].init.body, h.calls[1].init.body);
});
test("released reader allowlist omits root/consultation/sequence/draft predecessor/internal identities and projects latest booking", async () => {
  const data = dto(true);
  data.privateCanary = "FORBIDDEN";
  data.links = [
    {
      id: randomUUID(),
      bookingId: booking,
      previousLinkId: null,
      linkedAt: instant,
      bookingState: "RESCHEDULED",
      operationId: "FORBIDDEN",
    },
  ];
  data.linkHistory.total = 1;
  const h = harness(() => ({
    data: [data],
    meta: { page: 1, pageSize: 20, total: 1 },
  }));
  const result = await h.api.forPatient().list();
  for (const secret of [
    root,
    consultation,
    draftId,
    "FORBIDDEN",
    "predecessorId",
    "operationId",
  ])
    assert.ok(!JSON.stringify(result).includes(secret));
  assert.deepEqual(result.data[0].booking, {
    id: booking,
    state: "RESCHEDULED",
  });
  assert.equal(h.calls[0].path, "/me/follow-up-intents?page=1&pageSize=20");
});
for (const corruption of [
  (d) => {
    d.versions[0].state = "DRAFT";
  },
  (d) => {
    d.versions[0].version = 2;
  },
  (d) => {
    d.versions[0].releasedAt = null;
  },
  (d) => {
    d.links = [{ bookingState: "DONE" }];
  },
  (d) => {
    d.versions[0].desiredWindow = {
      startAt: instant,
      endAt: instant,
      timeZone: "UTC",
    };
  },
])
  test("released read rejects malformed/private DTO rather than exposing it", async () => {
    const data = dto(true);
    corruption(data);
    const h = harness(() => ({
      data: [data],
      meta: { page: 1, pageSize: 20, total: 1 },
    }));
    await assert.rejects(h.api.forPatient().list(), (e) => e.code === "read");
  });
test("current-related reader and bounded collection pagination use exact paths", async () => {
  const patient = randomUUID();
  const h = harness(() => ({
    data: [],
    meta: { page: 2, pageSize: 20, total: 21 },
  }));
  assert.deepEqual((await h.api.forPatient(patient).list(2)).data, []);
  assert.equal(
    h.calls[0].path,
    `/patients/${patient}/follow-up-intents?page=2&pageSize=20`,
  );
  await assert.rejects(h.service.list(10001), (e) => e.code === "validation");
});
test("reasoned correction uses author-only sequence/root and exact immediate predecessor", async () => {
  const data = dto(true);
  data.versions[0].version = 3;
  const h = harness((p, init) =>
    init
      ? { data }
      : { data: [data], meta: { page: 1, pageSize: 20, total: 1 } },
  );
  await h.service.list();
  await h.service.correct(releasedId, draft, "Explicit human reason");
  const c = h.calls.at(-1);
  assert.equal(
    c.path,
    `/consultations/${consultation}/follow-up-intents/${root}/corrections`,
  );
  assert.deepEqual(Object.keys(c.body).sort(), [
    "desiredWindow",
    "expectedVersion",
    "instruction",
    "operationKey",
    "predecessorId",
    "reason",
  ]);
  assert.equal(c.body.expectedVersion, 3);
  assert.equal(c.body.predecessorId, releasedId);
  await assert.rejects(
    async () => h.service.release(releasedId),
    (e) => e.code === "conflict",
  );
});
test("correction UTC projection becomes explicit zone offsets independently across DST", () => {
  const w = windowForEditing({
    startAt: "2026-10-31T13:00:00.000Z",
    endAt: "2026-11-02T14:00:00.000Z",
    timeZone: "America/New_York",
  });
  assert.equal(w.startAt, "2026-10-31T09:00:00.000-04:00");
  assert.equal(w.endAt, "2026-11-02T09:00:00.000-05:00");
  assert.equal(windowForEditing(null), null);
});
for (const instruction of ["", "😀".repeat(2001), "bad\u0000text"])
  test("invalid instruction rejected before transport with no truncation", async () => {
    const h = harness();
    await assert.rejects(
      async () => h.service.create({ ...draft, instruction }),
      (e) => e.code === "validation",
    );
    assert.equal(h.calls.length, 0);
  });
test("expired/changed session clears every retained author target and delayed response", async () => {
  let finish;
  const barrier = new Promise((r) => (finish = r));
  const h = harness(async () => {
    await barrier;
    return { data: [dto()], meta: { page: 1, pageSize: 20, total: 1 } };
  });
  const read = h.service.list();
  h.api.clear("expired");
  finish();
  await assert.rejects(read, (e) => e.code === "expired");
  await assert.rejects(
    async () => h.service.release(draftId),
    (e) => e.code === "expired",
  );
  assert.deepEqual(
    (await h.api.forConsultation(consultation).list()).data[0].instruction,
    draft.instruction,
  );
});
test("denial and disposal synchronously invalidate pending editors/targets", async () => {
  let denied = false;
  const h = harness((p, init) => {
    if (denied) throw followUpHttpError(404, !!init);
    return init
      ? { data: dto() }
      : { data: [dto()], meta: { page: 1, pageSize: 20, total: 1 } };
  });
  await h.service.list();
  let changed = 0;
  h.service.subscribe(() => changed++);
  denied = true;
  await assert.rejects(h.service.release(draftId), (e) => e.code === "access");
  assert.equal(changed, 1);
  const n = h.calls.length;
  await assert.rejects(h.service.list(), (e) => e.code === "access");
  assert.equal(h.calls.length, n);
  const fresh = h.api.forConsultation(consultation);
  fresh.dispose();
  await assert.rejects(fresh.list(), (e) => e.code === "access");
});
test("failed refresh drops command targets from an earlier permitted page", async () => {
  let failed = false;
  const h = harness(() => {
    if (failed) throw followUpHttpError(503);
    return { data: [dto()], meta: { page: 1, pageSize: 20, total: 1 } };
  });
  await h.service.list();
  failed = true;
  await assert.rejects(h.service.list(), (e) => e.code === "read");
  await assert.rejects(
    async () => h.service.release(draftId),
    (e) => e.code === "conflict",
  );
});
for (const [status, code] of [
  [400, "validation"],
  [401, "expired"],
  [403, "csrf"],
  [404, "access"],
  [409, "conflict"],
  [413, "budget"],
  [415, "media"],
  [503, "uncertain"],
])
  test(`safe follow-up error ${status}`, () =>
    assert.equal(followUpHttpError(status, true).code, code));
test("actual Live transport failure stays Live and keeps no Demo result or credential in its projection", async () => {
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async (path, init) => {
      assert.equal(init.credentials, "same-origin");
      assert.equal(init.cache, "no-store");
      return { ok: false, status: 503 };
    };
    const api = createLiveAdapter();
    await assert.rejects(
      api.followUpIntents.forPatient().list(),
      (e) => e.code === "read",
    );
    assert.equal(api.mode, "live");
  } finally {
    globalThis.fetch = saved;
  }
});
