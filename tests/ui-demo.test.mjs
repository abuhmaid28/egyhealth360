import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const output = mkdtempSync(join(tmpdir(), "eh-ui-test-"));
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
  "apps/web/src/lib/mock/adapter.ts",
  "apps/web/src/lib/api/live.ts",
]);
after(() => rmSync(output, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { createDemoAdapter } = require(join(output, "mock/adapter.js"));
const { createLiveAdapter } = require(join(output, "api/live.js"));
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
};
async function booked(api) {
  await api.enter("PATIENT");
  const [slot] = await api.availability("mariam-hassan");
  return api.book(slot.id, "Synthetic visit");
}
const visit = (id) => ({
  appointmentId: id,
  complaint: "Synthetic concern",
  diagnosis: "Human-entered assessment",
  allergies: "Unknown — patient unable to confirm",
  notes: "PRIVATE NOTE",
  medication: "Synthetic medication",
  dosage: "Synthetic directions",
  lab: "Synthetic test",
  instructions: "Shared visit instructions",
  followUp: "Discuss at next visit",
  released: false,
});
test("UI Golden Demo persists booking, consultation and patient release across adapter instances", async () => {
  const store = storage();
  const patient = createDemoAdapter(store);
  const a = await booked(patient);
  const clinician = createDemoAdapter(store);
  await clinician.enter("CLINICIAN");
  assert.equal((await clinician.appointments())[0].id, a.id);
  await clinician.release(visit(a.id));
  await patient.enter("PATIENT");
  const r = await patient.record();
  const c = r.consultations.find((c) => c.appointmentId === a.id);
  assert.equal(c.instructions, "Shared visit instructions");
  assert.equal(c.notes, "");
  assert.equal((await patient.appointments())[0].status, "Completed");
  await assert.rejects(patient.release(visit(a.id)), /cannot access/);
});
test("demo cannot reserve the same slot twice and reset reproduces original slots", async () => {
  const api = createDemoAdapter(storage());
  const original = await api.availability();
  const a = await booked(api);
  await assert.rejects(api.book(a.slot.id, "repeat"), /no longer available/);
  api.reset();
  assert.deepEqual(await api.availability(), original);
});
test("availability exposes exactly the frozen seven public fields and Cairo offset matches", async () => {
  const api = createDemoAdapter();
  for (const s of await api.availability()) {
    assert.deepEqual(
      Object.keys(s).sort(),
      [
        "id",
        "providerId",
        "clinicId",
        "startAt",
        "endAt",
        "timeZone",
        "bookable",
      ].sort(),
    );
    assert.equal(s.bookable, true);
    assert.equal(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: s.timeZone,
      }).format(new Date(s.startAt)),
      s.startAt.slice(11, 16),
    );
  }
});
test("clinician sees own schedule only; booking another doctor does not grant consultation access", async () => {
  const api = createDemoAdapter();
  await api.enter("PATIENT");
  const [slot] = await api.availability("omar-khaled");
  const a = await api.book(slot.id, "Visit");
  await api.enter("CLINICIAN");
  assert.deepEqual(await api.appointments(), []);
  await assert.rejects(api.consultation(a.id), /not found/);
  await assert.rejects(api.release(visit(a.id)), /not found/);
});
test("released summaries cannot be silently overwritten; notes remain clinician-only", async () => {
  const api = createDemoAdapter();
  const a = await booked(api);
  await api.enter("CLINICIAN");
  await api.release(visit(a.id));
  assert.equal((await api.consultation(a.id)).notes, "PRIVATE NOTE");
  await assert.rejects(api.release(visit(a.id)), /already released/);
  assert.equal((await api.record()).consultations.at(-1).notes, "");
});
test("ADMIN receives operations and no patient record, schedule, artifacts or fulfillment", async () => {
  const api = createDemoAdapter();
  await api.enter("ADMIN");
  assert.ok((await api.operations()).organizations.length);
  for (const fn of [
    () => api.profile(),
    () => api.record(),
    () => api.appointments(),
    () => api.artifacts(),
    () => api.fulfillment(),
    () => api.consultation("any"),
  ])
    await assert.rejects(fn, /cannot access/);
});
test("staff projections are limited to their routed artifact kind, without private notes or diagnosis", async () => {
  const api = createDemoAdapter();
  const a = await booked(api);
  await api.enter("CLINICIAN");
  await api.release(visit(a.id));
  await api.enter("PHARMACY_STAFF");
  const [p] = await api.artifacts();
  assert.equal(p.medication, "Synthetic medication");
  assert.equal(p.lab, "");
  assert.equal("diagnosis" in p, false);
  assert.equal("notes" in p, false);
  await assert.rejects(api.record(), /cannot access/);
  await api.enter("LAB_STAFF");
  const [l] = await api.artifacts();
  assert.equal(l.lab, "Synthetic test");
  assert.equal(l.medication, "");
  assert.equal(l.dosage, "");
  await assert.rejects(api.record(), /cannot access/);
});
test("fulfillment status is per artifact; staff cannot overwrite the other kind", async () => {
  const api = createDemoAdapter();
  const a = await booked(api);
  await api.enter("CLINICIAN");
  await api.release(visit(a.id));
  await api.enter("PHARMACY_STAFF");
  await api.updateFulfillment(
    { prescription: "Preparing", lab: "Result ready", result: "bad overwrite" },
    a.id,
  );
  assert.equal((await api.fulfillment(a.id)).lab, "Requested");
  assert.equal((await api.fulfillment("another")).prescription, "Received");
  await api.enter("LAB_STAFF");
  await api.updateFulfillment(
    {
      prescription: "Received",
      lab: "Result ready",
      result: "Synthetic result",
    },
    a.id,
  );
  assert.equal((await api.fulfillment(a.id)).prescription, "Received");
  await api.enter("PATIENT");
  const f = await api.fulfillment(a.id);
  assert.equal(f.prescription, "Preparing");
  assert.equal(f.result, "Synthetic result");
});
test("demo publish rejects overlapping intervals and accepts adjacent finite intervals", async () => {
  const api = createDemoAdapter();
  await api.enter("CLINICIAN");
  await assert.rejects(
    api.publishSlot("2026-10-28T09:15:00+03:00", "2026-10-28T09:45:00+03:00"),
    /overlaps/,
  );
  await api.publishSlot(
    "2026-10-28T09:30:00+03:00",
    "2026-10-28T10:00:00+03:00",
  );
  assert.ok(
    (await api.availability("mariam-hassan")).some((s) =>
      s.startAt.includes("09:30"),
    ),
  );
});
test("live requests use existing OpenAPI routes, session CSRF, own-only profile and no-store", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new globalThis.Response(
      JSON.stringify({
        data: url.endsWith("/auth/login")
          ? {
              user: { email: "synthetic@example.invalid", role: "PATIENT" },
              csrfToken: "session-csrf",
            }
          : {
              id: "own-id",
              displayName: "Synthetic",
              dateOfBirth: null,
              sex: null,
            },
      }),
      { status: 200 },
    );
  };
  try {
    const api = createLiveAdapter();
    const s = await api.login(
      "synthetic@example.invalid",
      "not-a-real-password",
    );
    assert.equal(s.mode, "live");
    await api.saveProfile({
      displayName: "Synthetic",
      dateOfBirth: null,
      sex: null,
    });
    assert.equal(calls[0].init.headers["X-EH-Login"], "1");
    assert.equal(calls[1].init.headers["X-CSRF-Token"], "session-csrf");
    assert.equal(calls[1].url, "/api/v1/me/profile");
    assert.equal("id" in JSON.parse(calls[1].init.body), false);
    assert.equal(calls[0].init.credentials, "same-origin");
    assert.equal(calls[0].init.cache, "no-store");
    await api.logout();
    assert.equal(calls[2].init.headers["Content-Type"], "application/json");
    assert.equal(calls[2].init.headers["X-CSRF-Token"], "session-csrf");
    assert.equal(calls[2].init.body, "{}");
    const spec = JSON.parse(readFileSync("docs/openapi.json", "utf8"));
    for (const c of calls) assert.ok(spec.paths[c.url]);
  } finally {
    globalThis.fetch = original;
  }
});
test("live future capabilities fail explicitly without network calls or demo fallback", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    throw new Error("Should not call");
  };
  try {
    const api = createLiveAdapter();
    for (const fn of [
      () => api.book("slot", "reason"),
      () => api.availability(),
      () => api.release(visit("x")),
      () => api.artifacts(),
      () => api.operations(),
    ])
      await assert.rejects(fn, /not integrated/);
    assert.equal(count, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("live service errors are sanitized and never replace records with synthetic fixtures", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new globalThis.Response("sensitive upstream message", { status: 503 });
  try {
    await assert.rejects(
      createLiveAdapter().providers(),
      (e) => !e.message.includes("sensitive") && e.message.includes("service"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
