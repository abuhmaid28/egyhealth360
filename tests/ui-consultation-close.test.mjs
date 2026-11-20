import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const output = mkdtempSync(join(tmpdir(), "eh-ui-opening-"));
execFileSync(process.execPath, [
  resolve("node_modules/typescript/bin/tsc"),
  "--outDir",
  output,
  "--rootDir",
  "apps/web/src/lib",
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
const {
  createConsultationCloseApi,
  projectClose,
  projectContext,
  CloseUiError,
} = require(join(output, "api/consultation-close.js"));
const { createLiveAdapter } = require(join(output, "api/live.js"));
const { projectBooking, bookingEligibility } = require(
  join(output, "api/live-booking.js"),
);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = {
  id: id(1),
  encounterId: id(2),
  bookingId: id(3),
  providerId: id(4),
  clinicId: id(5),
  state: "OPEN",
  bookingState: "IN_CONSULTATION",
  version: 1,
  openedAt: "2026-10-31T10:00:00Z",
  closedAt: null,
};
const closedFields = { ...context };
delete closedFields.openedAt;
const receipt = {
  ...closedFields,
  state: "CLOSED",
  bookingState: "CONSULTED",
  version: 2,
  closedAt: "2026-10-31T10:30:00Z",
};

test("exact PUT close contract, retained lost-response manual retry, no automatic write/release/authority fields", async () => {
  const calls = [];
  let lost = true;
  const api = createConsultationCloseApi(
    async (path, init) => {
      calls.push({ path, init });
      if (lost) throw new TypeError("SQL PRIVATE");
      return { data: receipt };
    },
    () => "csrf",
  );
  await assert.rejects(
    api.close(context),
    (e) => e.status === 503 && !e.message.includes("SQL"),
  );
  assert.equal(calls.length, 1);
  lost = false;
  assert.deepEqual(await api.close(context), receipt);
  assert.deepEqual(await api.close(context), receipt);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.init.body === calls[0].init.body));
  assert.equal(calls[0].path, `/consultations/${context.id}/close`);
  assert.equal(calls[0].init.method, "PUT");
  assert.deepEqual(calls[0].init.headers, { "X-CSRF-Token": "csrf" });
  assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body)), [
    "operationKey",
    "expectedVersion",
  ]);
  assert.equal(JSON.parse(calls[0].init.body).expectedVersion, 1);
  assert.match(JSON.parse(calls[0].init.body).operationKey, /^[0-9a-f-]{36}$/);
});
test("context GET projects only exact OPEN/CLOSED lifecycle without writes or secret/private fields", async () => {
  const calls = [];
  const api = createConsultationCloseApi(
    async (...args) => {
      calls.push(args);
      return {
        data: {
          ...context,
          operationKey: id(9),
          patientId: id(9),
          notes: "PRIVATE",
        },
      };
    },
    () => "csrf",
  );
  assert.deepEqual(await api.context(context.bookingId), context);
  assert.deepEqual(calls, [[`/me/bookings/${context.bookingId}/consultation`]]);
  assert.deepEqual(
    projectContext({ ...context, ...receipt }, context.bookingId),
    { ...context, ...receipt },
  );
  assert.deepEqual(
    projectClose(
      { ...receipt, assignmentId: id(9), clinical: "PRIVATE" },
      context,
    ),
    receipt,
  );
  for (const patch of [
    { version: 3 },
    { state: "CLOSED" },
    { bookingState: "CONSULTED" },
    { bookingId: id(9) },
    { openedAt: "invalid" },
    { id: "not-uuid" },
  ])
    assert.throws(
      () => projectContext({ ...context, ...patch }, context.bookingId),
      CloseUiError,
    );
  for (const patch of [
    { id: id(9) },
    { bookingId: id(9) },
    { encounterId: id(9) },
    { providerId: id(9) },
    { clinicId: id(9) },
    { closedAt: null },
    { state: "OPEN" },
    { version: 1 },
  ])
    assert.throws(
      () => projectClose({ ...receipt, ...patch }, context),
      CloseUiError,
    );
});
test("concurrent unchanged close shares key; scope clearing discards late result and resets keys", async () => {
  let finish;
  const wait = new Promise((r) => (finish = r));
  const calls = [];
  const api = createConsultationCloseApi(
    async (p, i) => {
      calls.push(i.body);
      await wait;
      return { data: receipt };
    },
    () => "csrf",
  );
  const first = api.close(context),
    second = api.close(context);
  api.clear();
  finish();
  await assert.rejects(first, (e) => e.status === 401);
  await assert.rejects(second, (e) => e.status === 401);
  await api.close(context);
  assert.equal(calls[0], calls[1]);
  assert.notEqual(calls[0], calls[2]);
  await assert.rejects(
    api.close({ ...context, ...receipt }),
    (e) => e.status === 409,
  );
  assert.equal(calls.length, 3, "closed state never sends a new close");
});
for (const status of [400, 401, 403, 404, 409, 503])
  test(`Live close ${status} stays Live and uses safe error projection`, async () => {
    const original = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (path, init) => {
      calls.push({ path, init });
      return new globalThis.Response(
        JSON.stringify({ error: { message: "SQL PRIVATE MEDICAL" } }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    };
    try {
      const api = createLiveAdapter();
      await assert.rejects(
        api.consultationClose.close(context),
        (e) =>
          e instanceof CloseUiError &&
          e.status === status &&
          !e.message.includes("SQL"),
      );
      assert.equal(calls.length, 1);
      assert.equal(api.mode, "live");
      assert.equal(calls[0].init.cache, "no-store");
      assert.equal(calls[0].init.credentials, "same-origin");
    } finally {
      globalThis.fetch = original;
    }
  });
test("CONSULTED and CLOSE history are accepted; every illegal booking action stays ineligible", () => {
  const booking = {
    id: id(3),
    slotId: id(6),
    providerId: id(4),
    clinicId: id(5),
    patientDisplayName: "Synthetic",
    startAt: "2026-10-31T09:00:00Z",
    endAt: "2026-10-31T09:30:00Z",
    timeZone: "Africa/Cairo",
    state: "CONSULTED",
    version: 3,
    createdAt: "2026-10-30T09:00:00Z",
    predecessorId: null,
    successorId: null,
    attendance: "ATTENDED",
    transitions: [
      {
        id: id(7),
        command: "CLOSE",
        fromState: "IN_CONSULTATION",
        toState: "CONSULTED",
        recordedAt: receipt.closedAt,
      },
    ],
    attendanceHistory: [],
  };
  assert.deepEqual(projectBooking({ ...booking, patientId: id(9) }), booking);
  assert.deepEqual(bookingEligibility(booking), {
    change: false,
    attend: false,
    noShow: false,
    correct: false,
  });
});
test("close receipt/request agree with merged OpenAPI and bounded recovery is read-only", async () => {
  const { readFileSync } = await import("node:fs");
  const schema = JSON.parse(readFileSync("docs/openapi.json", "utf8"));
  const route =
    schema.paths["/api/v1/consultations/{consultationId}/close"].put;
  assert.ok(route);
  const shape = schema.components.schemas;
  const closeShape = shape.ConsultationClosingResponse.properties.data;
  assert.deepEqual(
    closeShape.required.toSorted(),
    Object.keys(receipt).toSorted(),
  );
  const recovery = schema.paths["/api/v1/me/bookings/{bookingId}/consultation"];
  assert.ok(recovery.get);
  assert.ok(recovery.head);
  assert.equal(recovery.get.requestBody, undefined);
  assert.deepEqual(
    shape.ConsultationContext.required.toSorted(),
    Object.keys(context).toSorted(),
  );
});
