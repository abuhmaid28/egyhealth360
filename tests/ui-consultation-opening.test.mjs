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
  createConsultationOpeningApi,
  projectOpening,
  openingEligibility,
  OpeningUiError,
} = require(join(output, "consultation-opening.js"));
const { createLiveAdapter } = require(join(output, "live.js"));
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Provisional Stage A view receipt. No merged backend capability is claimed.
const receipt = {
  id: id(1),
  bookingId: id(2),
  providerId: id(3),
  clinicId: id(4),
  openedAt: "2026-10-29T10:00:00Z",
  state: "OPEN",
};
const keyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test("Stage A normal adapter blocks opening before HTTP; no manufactured success or Demo fallback", async () => {
  let calls = 0;
  const api = createConsultationOpeningApi(
    async () => {
      calls++;
    },
    () => "csrf",
  );
  assert.equal(api.available, false);
  await assert.rejects(api.open(id(2)), /awaiting backend integration/);
  assert.equal(calls, 0);
  assert.equal(api.receipt(id(2)), undefined);
});
test("opening sends exact operationKey body, POST and CSRF only; no patient identity or clinical data", async () => {
  const calls = [];
  const api = createConsultationOpeningApi(
    async (...args) => {
      calls.push(args);
      return { data: receipt };
    },
    () => "test-csrf",
    true,
  );
  assert.deepEqual(await api.open(id(2)), receipt);
  const [path, init] = calls[0];
  assert.equal(path, `/me/bookings/${id(2)}/consultation`);
  assert.equal(init.method, "POST");
  assert.deepEqual(Object.keys(JSON.parse(init.body)), ["operationKey"]);
  assert.match(JSON.parse(init.body).operationKey, keyPattern);
  assert.deepEqual(init.headers, { "X-CSRF-Token": "test-csrf" });
});
test("uncertain failure and explicit duplicate success replay retain exact key; another booking has a new key", async () => {
  const bodies = [];
  let fails = true;
  const api = createConsultationOpeningApi(
    async (path, init) => {
      bodies.push(init.body);
      if (fails) throw new TypeError("private parser SQL");
      return { data: { ...receipt, bookingId: path.split("/")[3] } };
    },
    () => "csrf",
    true,
  );
  await assert.rejects(
    api.open(id(2)),
    (e) => e.status === 503 && !e.message.includes("SQL"),
  );
  assert.equal(bodies.length, 1, "no automatic retry");
  fails = false;
  await api.open(id(2));
  await api.open(id(2));
  await api.open(id(5));
  assert.equal(bodies[0], bodies[1]);
  assert.equal(bodies[1], bodies[2]);
  assert.notEqual(bodies[2], bodies[3]);
});
test("concurrent unchanged opening commands share a key while response is delayed", async () => {
  const calls = [];
  let finish;
  const pending = new Promise((r) => {
    finish = r;
  });
  const api = createConsultationOpeningApi(
    async (path, init) => {
      calls.push(init.body);
      await pending;
      return { data: receipt };
    },
    () => "csrf",
    true,
  );
  const first = api.open(id(2)),
    second = api.open(id(2));
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1]);
  finish();
  await Promise.all([first, second]);
});
test("logout/session clearing removes receipts and operation keys", async () => {
  const calls = [];
  const api = createConsultationOpeningApi(
    async (path, init) => {
      calls.push(init.body);
      return { data: receipt };
    },
    () => "csrf",
    true,
  );
  await api.open(id(2));
  assert.deepEqual(api.receipt(id(2)), receipt);
  api.clear();
  assert.equal(api.receipt(id(2)), undefined);
  await api.open(id(2));
  assert.notEqual(calls[0], calls[1]);
});
test("opening receipt is an explicit allowlist; internal IDs, clinical fields and document counts are discarded", () => {
  assert.deepEqual(
    projectOpening(
      {
        ...receipt,
        patientId: id(8),
        clinicianId: id(9),
        assignmentId: id(10),
        membershipId: id(11),
        email: "private",
        professionalIdentifier: "private",
        documents: [{ notes: "private" }],
        documentCount: 4,
      },
      id(2),
    ),
    receipt,
  );
});
test("malformed/mismatched provisional receipts fail closed without retaining a success", async () => {
  for (const bad of [
    null,
    {},
    { ...receipt, bookingId: id(9) },
    { ...receipt, state: "CLOSED" },
    { ...receipt, openedAt: "bad" },
    { ...receipt, id: "private" },
  ]) {
    const api = createConsultationOpeningApi(
      async () => ({ data: bad }),
      () => "csrf",
      true,
    );
    await assert.rejects(api.open(id(2)), (e) => e.status === 503);
    assert.equal(api.receipt(id(2)), undefined);
  }
});
test("frontend eligibility is time/state guidance only, with no relationship inference", () => {
  const b = { state: "BOOKED", startAt: "2026-10-29T10:00:00Z" };
  assert.equal(openingEligibility(b, Date.parse(b.startAt) - 1), "too-early");
  assert.equal(openingEligibility(b, Date.parse(b.startAt)), "may-open");
  for (const state of [
    "CANCELLED",
    "RESCHEDULED",
    "NO_SHOW",
    "IN_CONSULTATION",
  ])
    assert.equal(
      openingEligibility({ ...b, state }, Date.now()),
      "unavailable",
    );
});
for (const status of [400, 401, 403, 404, 409, 503])
  test(`opening safe ${status} never reflects payload or falls back to Demo`, async () => {
    let calls = 0;
    const api = createConsultationOpeningApi(
      async () => {
        calls++;
        throw new OpeningUiError(status);
      },
      () => "csrf",
      true,
    );
    await assert.rejects(
      api.open(id(2)),
      (e) => e.status === status && !/SQL|INTERNAL/.test(e.message),
    );
    assert.equal(calls, 1);
    assert.equal(api.receipt(id(2)), undefined);
  });
test("existing Live adapter keeps consultation documentation unavailable and separates opening capability", async () => {
  const api = createLiveAdapter();
  assert.equal(api.mode, "live");
  assert.ok(api.consultationOpening);
  await assert.rejects(api.consultation(id(2)), /not integrated/);
  await assert.rejects(api.release({ notes: "synthetic" }), /not integrated/);
});
test("persistent Live capability clears receipts and keys on identity change, expired resolution and logout", async () => {
  const originalFetch = globalThis.fetch;
  const originalFlag = process.env.NEXT_PUBLIC_EH_OPENING_FIXTURE;
  process.env.NEXT_PUBLIC_EH_OPENING_FIXTURE = "stage-a-controlled-fixture";
  const bodies = [];
  let identity = "clinician-one@example.invalid",
    expired = false;
  globalThis.fetch = async (path, init) => {
    if (path.endsWith("/auth/logout"))
      return new globalThis.Response(null, { status: 204 });
    if (path.endsWith("/auth/me"))
      return expired
        ? new globalThis.Response(null, { status: 401 })
        : globalThis.Response.json({
            data: {
              user: { role: "CLINICIAN", email: identity },
              csrfToken: "test-csrf",
            },
          });
    bodies.push(init.body);
    return globalThis.Response.json({ data: receipt });
  };
  try {
    const api = createLiveAdapter();
    await api.session();
    await api.consultationOpening.open(id(2));
    assert.ok(api.consultationOpening.receipt(id(2)));
    identity = "clinician-two@example.invalid";
    await api.session();
    assert.equal(api.consultationOpening.receipt(id(2)), undefined);
    await api.consultationOpening.open(id(2));
    assert.notEqual(bodies[0], bodies[1]);
    expired = true;
    assert.equal(await api.session(), null);
    assert.equal(api.consultationOpening.receipt(id(2)), undefined);
    expired = false;
    await api.session();
    await api.consultationOpening.open(id(2));
    await api.logout();
    assert.equal(api.consultationOpening.receipt(id(2)), undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalFlag === undefined)
      delete process.env.NEXT_PUBLIC_EH_OPENING_FIXTURE;
    else process.env.NEXT_PUBLIC_EH_OPENING_FIXTURE = originalFlag;
  }
});
