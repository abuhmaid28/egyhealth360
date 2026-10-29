import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const output = mkdtempSync(join(tmpdir(), "eh-ui-booking-"));
execFileSync(process.execPath, [
  resolve("node_modules/typescript/bin/tsc"),
  "--outDir",
  output,
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--target",
  "ES2023",
  "--lib",
  "ES2023,DOM",
  "--strict",
  "--skipLibCheck",
  "apps/web/src/lib/api/live.ts",
]);
after(() => rmSync(output, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { createLiveAdapter } = require(join(output, "live.js"));
const { projectBooking, bookingEligibility, correctionReasonValid } = require(
  join(output, "live-booking.js"),
);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const booking = (extra = {}) => ({
  id: id(1),
  slotId: id(2),
  providerId: id(3),
  clinicId: id(4),
  patientDisplayName: "أحمد Synthetic",
  startAt: "2031-01-01T10:00:00Z",
  endAt: "2031-01-01T10:30:00Z",
  timeZone: "Africa/Cairo",
  state: "BOOKED",
  version: 1,
  createdAt: "2030-01-01T10:00:00Z",
  predecessorId: null,
  successorId: null,
  attendance: "UNKNOWN",
  transitions: [
    {
      id: id(5),
      command: "CREATE",
      fromState: null,
      toState: "BOOKED",
      recordedAt: "2030-01-01T10:00:00Z",
    },
  ],
  attendanceHistory: [],
  ...extra,
});
const selection = (extra = {}) => ({
  id: id(6),
  providerId: id(3),
  clinicId: id(4),
  startAt: "2031-01-01T11:00:00Z",
  endAt: "2031-01-01T11:30:00Z",
  timeZone: "Africa/Cairo",
  bookable: true,
  ...extra,
});
async function fixture(run, respond = () => ({ data: booking() })) {
  const original = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (String(url).endsWith("/auth/login"))
      return globalThis.Response.json({
        data: {
          user: { role: "PATIENT", email: "synthetic@example.invalid" },
          csrfToken: "csrf-test",
        },
      });
    return respond(url, init, calls);
  };
  try {
    const api = createLiveAdapter();
    await api.login("synthetic@example.invalid", "test-only");
    await run(api.liveBookings, calls, api);
  } finally {
    globalThis.fetch = original;
  }
}
const keyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test("live create sends only slotId and canonical operationKey with session CSRF, no-store and no authority/clinical fields", async () =>
  fixture(
    async (api, calls) => {
      assert.deepEqual(
        await api.create(id(2), "Never submitted clinical reason"),
        booking(),
      );
      const { init, url } = calls.at(-1),
        body = JSON.parse(init.body);
      assert.equal(url, "/api/v1/me/bookings");
      assert.deepEqual(Object.keys(body).sort(), ["operationKey", "slotId"]);
      assert.match(body.operationKey, keyPattern);
      assert.equal(init.headers["X-CSRF-Token"], "csrf-test");
      assert.equal(init.headers["Content-Type"], "application/json");
      assert.equal(init.headers["Idempotency-Key"], undefined);
      assert.equal(init.cache, "no-store");
      assert.equal(init.credentials, "same-origin");
    },
    () => globalThis.Response.json({ data: booking() }),
  ));
test("lost response retry reuses exact create command; success and changed input get new keys", async () => {
  let attempt = 0;
  await fixture(
    async (api, calls) => {
      await assert.rejects(api.create(id(2)), (e) => e.status === 503);
      await api.create(id(2));
      await api.create(id(2));
      const bodies = calls.slice(1).map((c) => JSON.parse(c.init.body));
      assert.deepEqual(bodies[0], bodies[1]);
      assert.notEqual(bodies[1].operationKey, bodies[2].operationKey);
    },
    () => {
      if (++attempt === 1) throw new Error("SQL PRIVATE RESPONSE");
      return globalThis.Response.json({ data: booking() });
    },
  );
});
test("editing a pending command gets a new key while unchanged retries retain it", async () =>
  fixture(
    async (api, calls) => {
      for (const slotId of [id(2), id(6), id(6)])
        await assert.rejects(api.create(slotId));
      const bodies = calls.slice(1).map((c) => JSON.parse(c.init.body));
      assert.notEqual(bodies[0].operationKey, bodies[1].operationKey);
      assert.deepEqual(bodies[1], bodies[2]);
    },
    () =>
      globalThis.Response.json(
        { error: { message: "PRIVATE" } },
        { status: 503 },
      ),
  ));
test("history, exact detail and exact clinician schedule use merged GET routes and pagination", async () =>
  fixture(
    async (api, calls) => {
      assert.equal((await api.history(2)).meta.page, 2);
      assert.equal((await api.schedule(2)).data[0].id, id(1));
      assert.equal((await api.detail(id(1))).id, id(1));
      assert.deepEqual(
        calls.slice(1).map((c) => c.url),
        [
          "/api/v1/me/bookings?page=2&pageSize=20",
          "/api/v1/me/schedule?page=2&pageSize=20",
          `/api/v1/me/bookings/${id(1)}`,
        ],
      );
    },
    (url) =>
      globalThis.Response.json(
        String(url).includes("?")
          ? { data: [booking()], meta: { page: 2, pageSize: 20, total: 21 } }
          : { data: booking() },
      ),
  ));
test("cancel uses only expectedVersion/key and does not consult provider eligibility", async () =>
  fixture(
    async (api, calls) => {
      await api.cancel(booking());
      assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).init.body)).sort(), [
        "expectedVersion",
        "operationKey",
      ]);
      assert.equal(calls.at(-1).url, `/api/v1/me/bookings/${id(1)}/cancel`);
      assert.equal(calls.length, 2);
    },
    () =>
      globalThis.Response.json({
        data: booking({ state: "CANCELLED", version: 2 }),
      }),
  ));
test("cancel conflict preserves exact retry command and safely reports conflict", async () =>
  fixture(
    async (api, calls) => {
      for (let n = 0; n < 2; n++)
        await assert.rejects(
          api.cancel(booking()),
          (e) => e.status === 409 && !e.message.includes("PRIVATE"),
        );
      assert.equal(calls[1].init.body, calls[2].init.body);
    },
    () =>
      globalThis.Response.json(
        { error: { message: "PRIVATE SQL" } },
        { status: 409 },
      ),
  ));
test("reschedule is an atomic command with same clinician and clinic, exact slot/version/key only", async () =>
  fixture(
    async (api, calls) => {
      await api.reschedule(booking(), selection());
      assert.equal(calls.at(-1).url, `/api/v1/me/bookings/${id(1)}/reschedule`);
      assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).init.body)).sort(), [
        "expectedVersion",
        "operationKey",
        "slotId",
      ]);
      const count = calls.length;
      for (const slot of [
        selection({ providerId: id(7) }),
        selection({ clinicId: id(8) }),
        selection({ bookable: false }),
        selection({ id: id(2) }),
      ])
        await assert.rejects(
          api.reschedule(booking(), slot),
          (e) => e.status === 409,
        );
      assert.equal(calls.length, count);
    },
    () =>
      globalThis.Response.json({
        data: booking({ id: id(9), slotId: id(6), predecessorId: id(1) }),
      }),
  ));
test("reschedule conflict leaves presentation input unchanged and reuses command key", async () =>
  fixture(
    async (api, calls) => {
      const b = booking();
      for (let n = 0; n < 2; n++)
        await assert.rejects(
          api.reschedule(b, selection()),
          (e) => e.status === 409,
        );
      assert.equal(b.state, "BOOKED");
      assert.equal(calls[1].init.body, calls[2].init.body);
    },
    () => globalThis.Response.json({}, { status: 409 }),
  ));
test("explicit attendance/no-show and separate correction use exact merged routes and preserve free-text bytes", async () =>
  fixture(
    async (api, calls) => {
      await api.attendance(booking(), "ATTENDED");
      await api.attendance(booking(), "NO_SHOW");
      await api.correct(
        booking({ version: 2, attendance: "NO_SHOW" }),
        "ATTENDED",
        "تصحيح $& unchanged",
      );
      const bodies = calls.slice(1).map((c) => JSON.parse(c.init.body));
      assert.equal(bodies[0].observation, "ATTENDED");
      assert.equal(bodies[1].observation, "NO_SHOW");
      assert.equal(bodies[2].reason, "تصحيح $& unchanged");
      assert.equal(
        calls.at(-1).url,
        `/api/v1/me/bookings/${id(1)}/attendance/correct`,
      );
      assert.deepEqual(Object.keys(bodies[2]).sort(), [
        "expectedVersion",
        "observation",
        "operationKey",
        "reason",
      ]);
    },
    () => globalThis.Response.json({ data: booking() }),
  ));
for (const status of [400, 401, 403, 404, 409, 503])
  test(`booking ${status} is safe, recoverable and never falls back to Demo`, async () =>
    fixture(
      async (api, calls, adapter) => {
        await assert.rejects(
          api.create(id(2)),
          (e) => e.status === status && !e.message.includes("PRIVATE"),
        );
        assert.equal(adapter.mode, "live");
        assert.equal(calls.length, 2);
        assert.ok(
          calls.every(
            (c) =>
              !c.url.includes("/patients/") && !c.url.includes("assignment"),
          ),
        );
      },
      () =>
        globalThis.Response.json(
          { error: { message: "PRIVATE JSON stack SQL internal_id" } },
          { status },
        ),
    ));
test("booking projection drops every extra/internal/clinical field including nested history extras", () => {
  const b = booking({
    patientId: "PRIVATE",
    diagnosis: "PRIVATE",
    clinicalNotes: "PRIVATE",
    transitions: [
      {
        ...booking().transitions[0],
        actorUserId: "PRIVATE",
        operationKey: "PRIVATE",
      },
    ],
    attendanceHistory: [
      {
        id: id(10),
        observation: "ATTENDED",
        supersedesId: null,
        reason: null,
        recordedAt: "2031-01-01T10:00:00Z",
        actorId: "PRIVATE",
      },
    ],
  });
  const p = projectBooking(b);
  assert.ok(!JSON.stringify(p).includes("PRIVATE"));
  assert.equal(Object.keys(p).length, 16);
  assert.equal(p.patientDisplayName, b.patientDisplayName);
  assert.throws(() => projectBooking({ ...b, state: "COMPLETED" }));
});
test("timing and terminal eligibility never infer clinical access or automatic attendance", () => {
  const b = booking(),
    start = Date.parse(b.startAt),
    end = Date.parse(b.endAt);
  assert.deepEqual(bookingEligibility(b, start - 1), {
    change: true,
    attend: false,
    noShow: false,
    correct: false,
  });
  assert.deepEqual(bookingEligibility(b, start), {
    change: false,
    attend: true,
    noShow: false,
    correct: false,
  });
  assert.equal(bookingEligibility(b, end).noShow, true);
  assert.equal(
    bookingEligibility(booking({ state: "CANCELLED" }), end).attend,
    false,
  );
  assert.equal(
    bookingEligibility(
      booking({ state: "NO_SHOW", attendance: "ATTENDED" }),
      end,
    ).change,
    false,
  );
});
test("correction reasons use exact Unicode scalar/control limits without truncation", () => {
  assert.equal(correctionReasonValid("😀".repeat(1000)), true);
  for (const s of ["", " ", "x".repeat(1001), "x\n", "\uD800", "x\u007f"])
    assert.equal(correctionReasonValid(s), false);
});

test("concurrent unchanged commands share the pending key while delayed responses resolve", async () => {
  let resolveResponse;
  const response = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  await fixture(
    async (api, calls) => {
      const first = api.create(id(2));
      const retry = api.create(id(2));
      assert.equal(calls.length, 3);
      assert.equal(calls[1].init.body, calls[2].init.body);
      resolveResponse();
      await Promise.all([first, retry]);
      await api.create(id(2));
      assert.notEqual(
        JSON.parse(calls[2].init.body).operationKey,
        JSON.parse(calls[3].init.body).operationKey,
      );
    },
    async () => {
      await response;
      return globalThis.Response.json({ data: booking() });
    },
  );
});
