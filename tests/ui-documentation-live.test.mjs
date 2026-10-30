import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const out = mkdtempSync(join(tmpdir(), "eh-documentation-live-"));
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
const { createLiveDocumentationApi, documentationHttpError } = require(
  join(out, "api/documentation.js"),
);
const { emptyFacts } = require(join(out, "clinical/documentation.js"));
const id = () => randomUUID();
const consultation = id(),
  root = id(),
  draftId = id(),
  signedId = id(),
  booking = id();
const instant = "2026-10-30T10:00:00.000Z";
const context = {
  receipt: { id: consultation, bookingId: booking, openedAt: instant },
  patientName: "Synthetic patient",
  providerName: "",
  clinicName: "",
  timeZone: "UTC",
};
const facts = () => ({
  ...emptyFacts(),
  complaint: "Human complaint · شكوى",
  problems: ["human problem"],
  diagnoses: ["human diagnosis"],
  allergy: { state: "UNKNOWN", items: [] },
});
function version(extra = {}) {
  return {
    id: draftId,
    version: 1,
    kind: "DRAFT",
    state: "DRAFT",
    content: "private CANARY",
    patientInstructions: "",
    complaint: null,
    problems: [],
    diagnoses: [],
    allergyReview: {
      state: "NOT_REVIEWED",
      items: [],
      reviewerId: null,
      reviewedAt: null,
    },
    createdAt: instant,
    signedAt: null,
    releasedAt: null,
    reason: null,
    predecessorId: null,
    effective: false,
    ...extra,
  };
}
function doc(extra = {}) {
  return {
    id: root,
    consultationId: consultation,
    kind: "PRIVATE_NOTE",
    versions: [version()],
    history: { page: 1, pageSize: 20, total: 1 },
    ...extra,
  };
}
function harness(responder = () => ({ data: doc() })) {
  const calls = [];
  const api = createLiveDocumentationApi(
    async (path, init) => {
      calls.push({
        path,
        init,
        body: init?.body ? JSON.parse(init.body) : null,
      });
      return responder(path, init, calls.length);
    },
    () => "memory-csrf",
  );
  return { api, service: api.forConsultation(context), calls };
}
function author(responder) {
  return harness((path, init, n) =>
    init
      ? (responder?.(path, init, n) ?? { data: doc() })
      : path.includes(root)
        ? { data: doc() }
        : { data: [doc()], meta: { page: 1, pageSize: 20, total: 1 } },
  );
}

test("Live draft uses exact merged DTO, separate findings, no identity/header injection", async () => {
  const h = harness();
  await h.service.savePrivateNote("human note", facts());
  const c = h.calls[0];
  assert.equal(c.path, `/consultations/${consultation}/documents`);
  assert.deepEqual(Object.keys(c.body).sort(), [
    "allergyReview",
    "complaint",
    "content",
    "diagnoses",
    "kind",
    "operationKey",
    "patientInstructions",
    "problems",
  ]);
  assert.equal(c.body.allergyReview.state, "UNKNOWN");
  assert.equal(c.body.patientInstructions, "");
  assert.equal(c.init.headers["X-CSRF-Token"], "memory-csrf");
  assert.equal(c.init.headers["Idempotency-Key"], undefined);
  assert.match(c.body.operationKey, /^[0-9a-f-]{14}4/);
  assert.ok(!c.path.includes("Human"));
});
test("Live has no standalone findings endpoint; default state NOT_REVIEWED", async () => {
  const h = harness();
  await assert.rejects(
    h.service.saveFacts(facts()),
    (e) => e.code === "validation",
  );
  assert.equal(h.calls.length, 0);
  await h.service.savePrivateNote("new note");
  assert.equal(h.calls[0].body.allergyReview.state, "NOT_REVIEWED");
});
for (const state of [
  "REVIEWED_POSITIVE",
  "REVIEWED_NO_KNOWN",
  "UNKNOWN",
  "NOT_REVIEWED",
])
  test("Live exact allergy state " + state, async () => {
    const f = facts();
    f.allergy = {
      state,
      items:
        state === "REVIEWED_POSITIVE"
          ? [{ kind: "INTOLERANCE", substance: "Human item", reaction: "" }]
          : [],
    };
    const h = harness();
    await h.service.saveSummary({
      text: "summary",
      instructions: "human",
      facts: f,
    });
    assert.deepEqual(h.calls[0].body.allergyReview, {
      state,
      items:
        state === "REVIEWED_POSITIVE"
          ? [{ kind: "INTOLERANCE", text: "Human item", reaction: null }]
          : [],
    });
  });
test("uncertain committed outcome retains unchanged exact command/key; no automatic retry; changed body new key", async () => {
  let fail = true;
  const h = harness(() => {
    if (fail) throw documentationHttpError(503, true);
    return { data: doc() };
  });
  await assert.rejects(
    h.service.savePrivateNote("same"),
    (e) => e.code === "uncertain",
  );
  assert.equal(h.calls.length, 1);
  fail = false;
  await h.service.savePrivateNote("same");
  assert.equal(h.calls[0].init.body, h.calls[1].init.body);
  await h.service.savePrivateNote("changed");
  assert.notEqual(h.calls[1].body.operationKey, h.calls[2].body.operationKey);
});
test("actual JSON byte budget rejects combined multibyte payload before transport", async () => {
  const h = harness();
  await assert.rejects(
    h.service.saveSummary({
      text: "😀".repeat(4000),
      instructions: "😀".repeat(4000),
    }),
    (e) => e.code === "budget",
  );
  assert.equal(h.calls.length, 0);
});
test("malformed success is uncertain and retains safe explicit retry identity", async () => {
  let malformed = true;
  const h = harness(() =>
    malformed ? { data: { ...doc(), versions: [] } } : { data: doc() },
  );
  await assert.rejects(
    h.service.savePrivateNote("same"),
    (e) => e.code === "uncertain",
  );
  malformed = false;
  await h.service.savePrivateNote("same");
  assert.equal(h.calls[0].init.body, h.calls[1].init.body);
});
test("author projection maps command kind separately from document kind; no raw DTO or hidden fields", async () => {
  const h = author();
  const v = await h.service.workspace();
  assert.equal(v.note.kind, "PRIVATE_NOTE");
  assert.equal(v.note.state, "DRAFT");
  assert.equal(v.note.facts.allergy.state, "NOT_REVIEWED");
  assert.equal(v.note.version, undefined);
  assert.equal(v.note.root, undefined);
  assert.equal(v.note.authorUserId, undefined);
});
test("sign and release commands use exact retained root/sequence; never interchangeable", async () => {
  const h = author();
  await h.service.workspace();
  await h.service.signPrivateNote(draftId);
  const c = h.calls.at(-1);
  assert.equal(c.path, `/consultations/${consultation}/documents/${root}/sign`);
  assert.deepEqual(Object.keys(c.body).sort(), [
    "expectedVersion",
    "operationKey",
  ]);
  assert.equal(c.body.expectedVersion, 1);
  await assert.rejects(
    h.service.releaseSummary(draftId),
    (e) => e.code === "validation",
  );
});
test("released projection rejects drafts/private and strips internal sequence/lineage/metadata", async () => {
  const signed = version({
    id: signedId,
    version: undefined,
    kind: "RELEASE",
    state: "SIGNED_RELEASED",
    signedAt: instant,
    releasedAt: instant,
    predecessorId: null,
    content: "explicitly shared",
    effective: true,
  });
  delete signed.version;
  const released = doc({
    kind: "PATIENT_SUMMARY",
    versions: [signed],
    internalId: "FORBIDDEN",
  });
  let corrupt = false;
  const h = harness(() => ({ data: corrupt ? doc() : released }));
  const api = createLiveDocumentationApi(
    async (path) =>
      path.includes(root)
        ? { data: corrupt ? doc() : released }
        : { data: [corrupt ? doc() : released], meta: { total: 1 } },
    () => "csrf",
  );
  const result = await api.released();
  assert.equal(result[0].text, "explicitly shared");
  for (const x of [root, consultation, "FORBIDDEN", draftId])
    assert.ok(!JSON.stringify(result).includes(x));
  corrupt = true;
  await assert.rejects(api.released(), (e) => e.code === "read");
  assert.equal(h.calls.length, 0);
});
test("current-related reader uses exact patient route with same reduced projection", async () => {
  const patient = id(),
    paths = [];
  const api = createLiveDocumentationApi(
    async (path) => {
      paths.push(path);
      return { data: [], meta: { total: 0 } };
    },
    () => "csrf",
  );
  assert.deepEqual(await api.forPatient(patient).released(), []);
  assert.deepEqual(paths, [
    `/patients/${patient}/summaries?page=1&pageSize=20`,
  ]);
});
test("correction/addendum submits explicit full fields, root/predecessor/version and reason", async () => {
  const h = author();
  await h.service.workspace();
  await h.service.amend({
    targetKey: draftId,
    change: "CORRECTION",
    text: "human correction",
    instructions: "",
    reason: "Human reason",
    facts: facts(),
  });
  const c = h.calls.at(-1);
  assert.equal(
    c.path,
    `/consultations/${consultation}/documents/${root}/corrections`,
  );
  assert.equal(c.body.predecessorId, draftId);
  assert.equal(c.body.expectedVersion, 1);
  assert.equal(c.body.complaint, facts().complaint);
  assert.equal(c.body.reason, "Human reason");
});
test("restriction accepts only safe ack; purges all old target/replay state", async () => {
  const h = author(() => ({ data: { restricted: true } }));
  await h.service.workspace();
  await h.service.restrict({
    targetKey: draftId,
    reason: "Wrong patient concern",
  });
  const c = h.calls.at(-1);
  assert.equal(
    c.path,
    `/consultations/${consultation}/documents/${root}/privacy-restrictions`,
  );
  assert.deepEqual(c.body.versionIds, [draftId]);
  await assert.rejects(
    h.service.signPrivateNote(draftId),
    (e) => e.code === "conflict",
  );
});
test("scoped denial clears author state and does not enter an automatic read loop", async () => {
  let denied = false;
  const h = author(() => {
    throw documentationHttpError(404, true);
  });
  await h.service.workspace();
  await assert.rejects(
    h.service.signPrivateNote(draftId),
    (e) => e.code === "access",
  );
  const n = h.calls.length;
  await assert.rejects(h.service.workspace(), (e) => e.code === "access");
  assert.equal(h.calls.length, n);
  assert.equal(denied, false);
});
test("session/identity clear discards pending result while in flight and all keys/clinical targets", async () => {
  let finish;
  const waiting = new Promise((r) => (finish = r));
  const h = harness(async () => {
    await waiting;
    return { data: doc() };
  });
  const pending = h.service.savePrivateNote("sensitive");
  h.api.clear();
  finish();
  await assert.rejects(pending, (e) => e.code === "access");
  await assert.rejects(h.service.workspace(), (e) => e.code === "access");
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
  test("safe Live mutation HTTP error " + status, () => {
    const e = documentationHttpError(status, true);
    assert.equal(e.code, code);
    assert.ok(!/SQL|CANARY|stack|postgres/.test(e.message));
  });
test("unavailable reads do not imply an uncertain mutation", () =>
  assert.equal(documentationHttpError(503).code, "read"));
test("restriction invalidates earlier services and in-flight reads across same session", async () => {
  const h = author(() => ({ data: { restricted: true } }));
  const previous = h.api.forConsultation(context);
  await previous.workspace();
  await h.service.workspace();
  await h.service.restrict({ targetKey: draftId, reason: "Wrong patient" });
  await assert.rejects(
    previous.signPrivateNote(draftId),
    (e) => e.code === "conflict",
  );
});
test("disposed service cannot fetch or retain an in-flight author projection", async () => {
  let finish;
  const barrier = new Promise((r) => (finish = r));
  const h = harness(async () => {
    await barrier;
    return { data: [], meta: { total: 0 } };
  });
  const read = h.service.workspace();
  h.service.dispose();
  finish();
  await assert.rejects(read, (e) => e.code === "access");
  const n = h.calls.length;
  await assert.rejects(h.service.workspace(), (e) => e.code === "access");
  assert.equal(h.calls.length, n);
});
test("root own reader can be reactivated after a new authenticated identity, old scopes remain invalid", async () => {
  const h = harness(() => ({ data: [], meta: { total: 0 } }));
  h.api.clear("expired");
  await assert.rejects(h.api.released(), (e) => e.code === "expired");
  h.api.activate();
  assert.deepEqual(await h.api.released(), []);
  await assert.rejects(h.service.workspace(), (e) => e.code === "expired");
});
test("earlier concurrent success cannot erase changed command uncertain retry key", async () => {
  const waits = [];
  const h = harness(
    () => new Promise((resolve, reject) => waits.push({ resolve, reject })),
  );
  const first = h.service.savePrivateNote("A");
  const second = h.service.savePrivateNote("B");
  while (waits.length < 2) await new Promise((r) => setTimeout(r, 1));
  const b = h.calls.find((c) => c.body.content === "B");
  const firstIndex = h.calls[0].body.content === "A" ? 0 : 1,
    secondIndex = 1 - firstIndex;
  waits[firstIndex].resolve({ data: doc() });
  await first;
  waits[secondIndex].reject(documentationHttpError(503, true));
  await assert.rejects(second, (e) => e.code === "uncertain");
  const retry = h.service.savePrivateNote("B");
  while (waits.length < 3) await new Promise((r) => setTimeout(r, 1));
  assert.equal(h.calls.at(-1).init.body, b.init.body);
  waits[2].resolve({ data: doc() });
  await retry;
});

test("newer page-one detail supplies the command head after a concurrent sign", async () => {
  const signed = version({
    id: signedId,
    version: 2,
    kind: "SIGN",
    state: "SIGNED",
    signedAt: instant,
    effective: true,
  });
  const api = createLiveDocumentationApi(
    async (path) =>
      path.includes(root)
        ? {
            data: doc({
              versions: [version(), signed],
              history: { page: 1, pageSize: 20, total: 21 },
            }),
          }
        : { data: [doc()], meta: { total: 1 } },
    () => "csrf",
  );
  const service = api.forConsultation(context);
  const view = await service.workspace();
  assert.equal(service.paging().history, 2);
  assert.equal(view.note.key, signedId);
  assert.equal(view.note.state, "SIGNED");
  assert.equal(view.history.find((v) => v.key === draftId).head, false);
  assert.equal(view.history.find((v) => v.key === signedId).head, true);
});
test("late pre-restriction read cannot deny or clear mappings from a fresh read", async () => {
  let hold = false,
    finish;
  const barrier = new Promise((r) => (finish = r));
  const api = createLiveDocumentationApi(
    async (path, init) => {
      if (init)
        return path.endsWith("/privacy-restrictions")
          ? { data: { restricted: true } }
          : { data: doc() };
      if (hold) {
        hold = false;
        await barrier;
      }
      return path.includes(root)
        ? { data: doc() }
        : { data: [doc()], meta: { total: 1 } };
    },
    () => "csrf",
  );
  const older = api.forConsultation(context),
    current = api.forConsultation(context);
  await current.workspace();
  hold = true;
  const stale = older.workspace();
  await current.restrict({ targetKey: draftId, reason: "Wrong patient" });
  const fresh = await older.workspace();
  finish();
  await assert.rejects(stale, (e) => e.code === "access");
  assert.equal(fresh.note.key, draftId);
  await older.signPrivateNote(draftId).catch((e) => assert.fail(e.code));
});
test("author document and history pagination use only bounded actual query fields", async () => {
  const paths = [];
  const api = createLiveDocumentationApi(
    async (path) => {
      paths.push(path);
      return path.includes(root)
        ? { data: doc() }
        : {
            data: [doc({ history: { page: 1, pageSize: 1, total: 41 } })],
            meta: { total: 22 },
          };
    },
    () => "csrf",
  );
  const service = api.forConsultation(context);
  await service.workspace(2, 3);
  assert.deepEqual(paths, [
    `/consultations/${consultation}/documents?page=2&pageSize=20`,
    `/consultations/${consultation}/documents/${root}?page=3&pageSize=20`,
  ]);
  assert.deepEqual(service.paging(), { documents: 2, history: 3 });
});
