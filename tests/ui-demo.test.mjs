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
  "apps/web/src/lib/api/booking.ts",
  "apps/web/src/lib/mock/booking.ts",
]);
after(() => rmSync(output, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { createDemoAdapter } = require(join(output, "mock/adapter.js"));
const { createLiveAdapter } = require(join(output, "api/live.js"));
const { createBookingService } = require(join(output, "api/booking.js"));
const { previewDemoBooking } = require(join(output, "mock/booking.js"));
const { UiError, safeErrorMessage } = require(join(output, "api/errors.js"));
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
test("booking presentation service is demo-only and uses existing scoped adapter state", async () => {
  const api = createDemoAdapter(storage());
  await api.enter("PATIENT");
  const service = createBookingService(api);
  assert.equal(service.implementation, "demo");
  const [slot] = await api.availability("mariam-hassan");
  const appointment = await service.create(slot.id, "ألم $& unchanged");
  assert.deepEqual(await service.detail(appointment.id), appointment);
  assert.deepEqual(await service.listOwn(), [appointment]);
  assert.equal(await service.detail("missing"), undefined);
  await api.enter("CLINICIAN");
  assert.deepEqual(await service.clinicianSchedule(), [appointment]);
  await api.enter("ADMIN");
  await assert.rejects(service.clinicianSchedule(), /cannot access/);
  await assert.rejects(service.detail(appointment.id), /cannot access/);
});
test("live logistics cannot be coerced into clinical-shaped demo appointment methods", async () => {
  const service = createBookingService(
    new Proxy(
      { mode: "live" },
      {
        get(target, key) {
          if (key === "mode") return target.mode;
          throw new Error(`Unexpected live call: ${String(key)}`);
        },
      },
    ),
  );
  assert.equal(service.implementation, "live");
  for (const action of [
    () => service.create("slot", "reason"),
    () => service.listOwn(),
    () => service.detail("id"),
    () => service.clinicianSchedule(),
  ])
    await assert.rejects(action(), /not integrated on main/);
});
test("explicit preview service copies public availability into synthetic state only", async () => {
  const demo = createDemoAdapter(storage());
  const provider = await demo.provider("mariam-hassan");
  const [slot] = await demo.availability(provider.id);
  const original = globalThis.structuredClone(slot);
  const result = await previewDemoBooking(
    demo,
    provider,
    slot,
    "أحمد unchanged",
  );
  assert.equal(result.session.mode, "demo");
  assert.equal(result.session.role, "PATIENT");
  assert.equal(result.appointment.availabilitySource, "live");
  assert.equal(result.appointment.reason, "أحمد unchanged");
  assert.deepEqual(slot, original);
  assert.equal((await demo.availability(provider.id))[0].bookable, true);
});
test("UI errors keep authored guidance but suppress transport, parser and arbitrary payload text", () => {
  assert.equal(
    safeErrorMessage(new UiError("Availability changed. Please refresh.")),
    "Availability changed. Please refresh.",
  );
  for (const error of [
    new Error('{"patient":"raw-private-value"}'),
    new SyntaxError("Unexpected JSON token"),
    "raw response",
    null,
  ])
    assert.equal(
      safeErrorMessage(error),
      "The service could not complete this request. Please try again.",
    );
});
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
    api.publishSlot({
      clinicId: "cairo-clinic",
      startAt: "2026-10-28T09:15:00+03:00",
      endAt: "2026-10-28T09:45:00+03:00",
      operationKey: "demo-overlap",
    }),
    /overlaps/,
  );
  await api.publishSlot({
    clinicId: "cairo-clinic",
    startAt: "2026-10-28T09:30:00+03:00",
    endAt: "2026-10-28T10:00:00+03:00",
    operationKey: "demo-adjacent",
  });
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
test("legacy clinical-shaped demo methods remain unavailable without network calls or synthetic fallback", async () => {
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

const publicAvailability = {
  id: "11111111-1111-4111-8111-111111111111",
  providerId: "22222222-2222-4222-8222-222222222222",
  clinicId: "33333333-3333-4333-8333-333333333333",
  startAt: "2026-11-02T23:30:00-05:00",
  endAt: "2026-11-03T00:00:00-05:00",
  timeZone: "America/New_York",
  bookable: true,
};
const ownAvailability = {
  id: publicAvailability.id,
  providerId: publicAvailability.providerId,
  clinicId: publicAvailability.clinicId,
  startAt: publicAvailability.startAt,
  endAt: publicAvailability.endAt,
  timeZone: publicAvailability.timeZone,
  state: "PUBLISHED",
  version: 1,
  publishedAt: "2026-10-28T12:00:00Z",
  withdrawnAt: null,
};
const pageOf = (data) => ({
  data,
  meta: { page: 1, pageSize: 20, total: data.length },
});
test("live availability projects seven fields, retains disabled slots, sends canonical pagination/clinic/date filters and no-store", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new globalThis.Response(
      JSON.stringify(
        pageOf([
          { ...publicAvailability, internalSecret: "do-not-project" },
          { ...publicAvailability, id: "disabled", bookable: false },
        ]),
      ),
    );
  };
  try {
    const api = createLiveAdapter();
    const result = await api.availabilityPage(publicAvailability.providerId, {
      page: 2,
      pageSize: 20,
      clinic: publicAvailability.clinicId,
      from: "2026-11-01T00:00:00+02:00",
      to: "2026-11-07T00:00:00+02:00",
    });
    assert.deepEqual(
      Object.keys(result.data[0]).sort(),
      Object.keys(publicAvailability).sort(),
    );
    assert.equal(result.data[1].bookable, false);
    assert.equal(result.data[0].timeZone, "America/New_York");
    assert.equal(calls[0].init.cache, "no-store");
    const url = new URL(calls[0].url, "http://localhost");
    assert.equal(
      url.pathname,
      `/api/v1/directory/providers/${publicAvailability.providerId}/availability`,
    );
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("clinic"), publicAvailability.clinicId);
    assert.equal(url.searchParams.get("from"), "2026-11-01T00:00:00+02:00");
    assert.equal([...url.searchParams.keys()].length, 5);
  } finally {
    globalThis.fetch = original;
  }
});
test("live availability has real empty/error paths and rejects malformed responses without synthetic fallback", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new globalThis.Response(JSON.stringify(pageOf([])));
    assert.deepEqual(
      (await createLiveAdapter().availabilityPage("provider")).data,
      [],
    );
    globalThis.fetch = async () =>
      new globalThis.Response("PRIVATE SQL", { status: 503 });
    await assert.rejects(
      createLiveAdapter().availabilityPage("provider"),
      (e) =>
        e.message.includes("unavailable") && !e.message.includes("PRIVATE"),
    );
    globalThis.fetch = async () =>
      new globalThis.Response(
        JSON.stringify(
          pageOf([{ ...publicAvailability, timeZone: "not/a/zone" }]),
        ),
      );
    await assert.rejects(
      createLiveAdapter().availabilityPage("provider"),
      /invalid response/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("clinician live list/publish/withdraw use exact Slice 2 paths, CSRF, operation keys and CAS version without authority injection", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const data = url.endsWith("/auth/login")
      ? {
          user: { role: "CLINICIAN", email: "synthetic@example.invalid" },
          csrfToken: "csrf-current",
        }
      : url.includes("?")
        ? null
        : { ...ownAvailability, internalUser: "do-not-project" };
    return new globalThis.Response(
      JSON.stringify(data ? { data } : pageOf([ownAvailability])),
    );
  };
  try {
    const api = createLiveAdapter();
    await api.login("synthetic@example.invalid", "synthetic");
    const own = await api.ownAvailability(2);
    assert.equal(own.data[0].state, "PUBLISHED");
    assert.equal(calls[1].url, "/api/v1/me/availability?page=2&pageSize=20");
    const command = {
      clinicId: publicAvailability.clinicId,
      startAt: publicAvailability.startAt,
      endAt: publicAvailability.endAt,
      operationKey: "44444444-4444-4444-8444-444444444444",
      timeZone: "must-not-send",
      clinicianId: "must-not-send",
    };
    const result = await api.publishSlot(command);
    assert.equal("internalUser" in result, false);
    assert.deepEqual(
      Object.keys(JSON.parse(calls[2].init.body)).sort(),
      ["clinicId", "startAt", "endAt", "operationKey"].sort(),
    );
    await api.withdrawSlot({
      slotId: ownAvailability.id,
      expectedVersion: 1,
      operationKey: command.operationKey,
      owner: "must-not-send",
    });
    assert.equal(
      calls[3].url,
      `/api/v1/me/availability/${ownAvailability.id}/withdraw`,
    );
    assert.equal(calls[3].init.method, "PUT");
    assert.equal(calls[3].init.headers["X-CSRF-Token"], "csrf-current");
    assert.deepEqual(JSON.parse(calls[3].init.body), {
      operationKey: command.operationKey,
      expectedVersion: 1,
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("live publication and withdrawal preserve backend validation/conflict/authority errors without leaking raw payloads", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [400, 401, 403, 404, 409, 503]) {
      globalThis.fetch = async () =>
        new globalThis.Response("PRIVATE SQL ERROR", { status });
      const api = createLiveAdapter();
      await assert.rejects(
        api.publishSlot({}),
        (e) => !e.message.includes("PRIVATE"),
      );
      await assert.rejects(
        api.withdrawSlot({
          slotId: "slot",
          operationKey: "key",
          expectedVersion: 1,
        }),
        (e) => !e.message.includes("PRIVATE"),
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
test("demo own history and withdrawal remain deterministic and separate from the public allowlist", async () => {
  const api = createDemoAdapter();
  await api.enter("CLINICIAN");
  const before = await api.ownAvailability();
  const slot = before.data[0];
  await api.withdrawSlot({
    slotId: slot.id,
    expectedVersion: 1,
    operationKey: "demo-withdraw",
  });
  assert.equal(
    (await api.ownAvailability()).data.find((s) => s.id === slot.id).state,
    "WITHDRAWN",
  );
  assert.ok(
    !(await api.availability("mariam-hassan")).some((s) => s.id === slot.id),
  );
  api.reset();
  await api.enter("CLINICIAN");
  assert.deepEqual(await api.ownAvailability(), before);
});
test("explicit live-slot to demo booking copies only public selection, uses synthetic identity and no live booking API", async () => {
  const store = storage();
  const api = createDemoAdapter(store);
  await api.enter("PATIENT");
  const provider = {
    id: publicAvailability.providerId,
    displayName: "Public doctor",
    specialty: { key: "general", displayName: "General" },
    clinics: [
      {
        id: publicAvailability.clinicId,
        displayName: "Public clinic",
        city: "City",
        address: "Public address",
      },
    ],
    privateEmail: "do-not-copy",
  };
  const a = await api.bookPreview(
    provider,
    {
      ...publicAvailability,
      patient: "PRIVATE PATIENT",
      session: "PRIVATE SESSION",
    },
    "Synthetic visit",
  );
  assert.equal(a.patientName, "Ahmed Mostafa");
  assert.equal(a.availabilitySource, "live");
  assert.equal(a.slot.providerId, provider.id);
  assert.deepEqual(
    Object.keys(a.slot).sort(),
    Object.keys(publicAvailability).sort(),
  );
  assert.equal("privateEmail" in a.provider, false);
  assert.equal(
    (await api.bookPreview(provider, publicAvailability, "repeat")).id,
    a.id,
  );
  await api.enter("CLINICIAN");
  assert.equal((await api.appointments())[0].id, a.id);
  await api.release(visit(a.id));
  await api.enter("PATIENT");
  assert.equal(
    (await api.record()).consultations.at(-1).instructions,
    "Shared visit instructions",
  );
  await assert.rejects(
    createLiveAdapter().book(a.slot.id, "reason"),
    /not integrated/,
  );
});
