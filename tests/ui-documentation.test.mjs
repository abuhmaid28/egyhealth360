import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const output = mkdtempSync(join(tmpdir(), "eh-doc-ui-"));
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
  "apps/web/src/lib/mock/documentation-controlled.ts",
  "apps/web/src/lib/api/live.ts",
]);
after(() => rmSync(output, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const {
  createControlledDocumentation,
  controlledDocumentationCanary,
} = require(join(output, "mock/documentation-controlled.js"));
const {
  createUnavailableDocumentation,
  createDocumentationCommands,
  emptyFacts,
  validFacts,
  validNarrative,
  scalarLength,
} = require(join(output, "clinical/documentation.js"));
const { createLiveAdapter } = require(join(output, "api/live.js"));
const summary = {
  text: "Patient-authored release candidate · ملخص",
  instructions: "Human instructions · تعليمات $&",
};
const keyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
async function releasedFixture() {
  const f = createControlledDocumentation();
  await f.api.savePrivateNote(controlledDocumentationCanary);
  await f.api.saveSummary(summary);
  const d = (await f.api.workspace()).summary;
  await f.api.releaseSummary(d.key);
  return f;
}
test("unavailable capability fails closed before any fetch; Live has its separate merged transport", async () => {
  const previous = globalThis.fetch;
  assert.equal(createLiveAdapter().documentation.mode, "live");
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("unexpected network");
  };
  try {
    for (const api of [
      createUnavailableDocumentation(),
    ]) {
      assert.equal(api.mode, "unavailable");
      for (const run of [
        () => api.workspace(),
        () => api.released(),
        () => api.saveFacts(emptyFacts()),
        () => api.savePrivateNote("private"),
        () => api.saveSummary(summary),
        () => api.releaseSummary("x"),
        () => api.signPrivateNote("x"),
        () =>
          api.amend({
            targetKey: "x",
            change: "CORRECTION",
            text: "x",
            instructions: "",
            reason: "x",
          }),
        () => api.restrict({ targetKey: "x", reason: "x" }),
      ])
        await assert.rejects(run(), (e) => e.code === "unavailable");
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previous;
  }
});
test("missing allergy review is NOT_REVIEWED; all four states remain distinct and bounded", () => {
  const facts = emptyFacts();
  assert.equal(facts.allergy.state, "NOT_REVIEWED");
  assert.ok(validFacts(facts));
  for (const state of ["NOT_REVIEWED", "UNKNOWN", "REVIEWED_NO_KNOWN"]) {
    assert.ok(validFacts({ ...facts, allergy: { state, items: [] } }));
    assert.ok(
      !validFacts({
        ...facts,
        allergy: {
          state,
          items: [{ kind: "ALLERGY", substance: "entered", reaction: "" }],
        },
      }),
    );
  }
  assert.ok(
    !validFacts({
      ...facts,
      allergy: { state: "REVIEWED_POSITIVE", items: [] },
    }),
  );
  assert.ok(
    validFacts({
      ...facts,
      allergy: {
        state: "REVIEWED_POSITIVE",
        items: [
          {
            kind: "INTOLERANCE",
            substance: "Human entered",
            reaction: "Human reaction",
          },
        ],
      },
    }),
  );
});
test("Unicode scalar limits, LF-only control handling, no truncation or replacement of entered text", () => {
  assert.equal(scalarLength("أ😀"), 2);
  assert.ok(validNarrative("أ😀\n$&", 5, true));
  assert.ok(!validNarrative("😀".repeat(2001), 2000));
  for (const value of ["a\r", "a\t", "a\0", "a\u0085", "a\ud800"])
    assert.ok(!validNarrative(value, 100));
  assert.ok(!validNarrative(" ", 8000, true));
  assert.ok(validNarrative("", 2000));
});
test("problem/diagnosis counts and narrative bounds reject rather than silently trim", async () => {
  const { api } = createControlledDocumentation();
  for (const value of [
    { ...emptyFacts(), problems: Array(21).fill("human") },
    { ...emptyFacts(), diagnoses: ["x".repeat(501)] },
    { ...emptyFacts(), complaint: "x".repeat(2001) },
    { ...emptyFacts(), problems: [""] },
  ])
    await assert.rejects(api.saveFacts(value), (e) => e.code === "validation");
  assert.deepEqual((await api.workspace()).facts, emptyFacts());
  const facts = {
    ...emptyFacts(),
    complaint: "Human complaint · شكوى",
    problems: ["Human problem"],
    diagnoses: ["Human diagnosis"],
  };
  await api.saveFacts(facts);
  assert.deepEqual((await api.workspace()).facts, facts);
});
test("aggregate UTF-8 command budget rejects oversized valid-per-field narratives without writes", async () => {
  const { api } = createControlledDocumentation();
  await assert.rejects(
    api.saveSummary({ text: "أ".repeat(8000), instructions: "أ".repeat(8000) }),
    (e) => e.code === "budget",
  );
  assert.equal((await api.workspace()).summary, null);
});
test("draft saves never sign or release; private note and summary have separate identities", async () => {
  const { api, controls } = createControlledDocumentation();
  await api.savePrivateNote(controlledDocumentationCanary);
  await api.saveSummary(summary);
  const workspace = await api.workspace();
  assert.notEqual(workspace.note.key, workspace.summary.key);
  assert.equal(workspace.note.state, "DRAFT");
  assert.equal(workspace.summary.state, "DRAFT");
  assert.equal(workspace.summary.text, summary.text);
  assert.ok(
    !JSON.stringify(workspace.summary).includes(controlledDocumentationCanary),
  );
  controls.setActor("patient");
  assert.deepEqual(await api.released(), []);
});
test("PRIVATE_NOTE cannot use sign-and-release, even by its current author", async () => {
  const { api } = createControlledDocumentation();
  await api.savePrivateNote(controlledDocumentationCanary);
  const note = (await api.workspace()).note;
  await assert.rejects(
    api.releaseSummary(note.key),
    (e) => e.code === "validation",
  );
  await api.signPrivateNote(note.key);
  assert.equal((await api.workspace()).note.state, "SIGNED");
});
test("patient receives only own explicitly SIGNED_RELEASED allowlist, no note/facts/private lineage", async () => {
  const { api, controls } = await releasedFixture();
  controls.setActor("patient");
  const result = await api.released();
  assert.equal(result.length, 1);
  assert.equal(result[0].text, summary.text);
  assert.equal(result[0].instructions, summary.instructions);
  assert.equal(result[0].state, "SIGNED_RELEASED");
  for (const forbidden of [
    "PRIVATE_NOTE",
    controlledDocumentationCanary,
    "facts",
    "authority",
    "patientId",
    "assignmentId",
    "privateCount",
  ])
    assert.ok(!JSON.stringify(result).includes(forbidden));
  assert.equal(result[0].predecessorKey, undefined, "draft identity omitted");
  controls.setActor("other-patient");
  assert.deepEqual(await api.released(), []);
});
test("other clinician, ADMIN, absent context/current authority and expired actor fail closed", async () => {
  const { api, controls } = await releasedFixture();
  for (const actor of ["other-clinician", "admin"]) {
    controls.setActor(actor);
    await assert.rejects(api.workspace(), (e) => e.code === "access");
    await assert.rejects(api.released(), (e) => e.code === "access");
    await assert.rejects(
      api.savePrivateNote("unavailable"),
      (e) => e.code === "access",
    );
  }
  controls.setActor("author");
  controls.setAuthority(false);
  await assert.rejects(api.workspace(), (e) => e.code === "access");
  controls.setAuthority(true);
  controls.setOpened(false);
  await assert.rejects(api.workspace(), (e) => e.code === "access");
  controls.setOpened(true);
  controls.setExpired(true);
  await assert.rejects(api.workspace(), (e) => e.code === "expired");
});
test("patient released history survives author's loss of clinical authority without exposing private data", async () => {
  const { api, controls } = await releasedFixture();
  controls.setAuthority(false);
  controls.setActor("patient");
  assert.equal((await api.released()).length, 1);
});
test("author data pending across a scope change is dropped, not delivered to the patient", async () => {
  const { api, controls } = await releasedFixture();
  const release = controls.hold();
  const pending = api.workspace();
  controls.setActor("patient");
  release();
  await assert.rejects(pending, (e) => e.code === "access");
  assert.ok(
    !JSON.stringify(await api.released()).includes(
      controlledDocumentationCanary,
    ),
  );
});
test("signed correction and addendum append immutable distinct sources; originals preserved", async () => {
  const { api, controls } = await releasedFixture();
  const original = (await api.workspace()).summary;
  const snapshot = controls
    .retainedVersionsForTest()
    .find((v) => v.key === original.key);
  await api.amend({
    targetKey: original.key,
    change: "CORRECTION",
    text: "Human correction",
    instructions: "Corrected instructions",
    reason: "Human reason · سبب",
  });
  const correction = (await api.workspace()).summary;
  assert.notEqual(correction.key, original.key);
  assert.equal(correction.predecessorKey, original.key);
  assert.equal(correction.change, "CORRECTION");
  await api.amend({
    targetKey: correction.key,
    change: "ADDENDUM",
    text: "Human addendum",
    instructions: "Additional instructions",
    reason: "Additional human reason",
  });
  assert.deepEqual(
    controls.retainedVersionsForTest().find((v) => v.key === original.key),
    snapshot,
  );
  controls.setActor("patient");
  const view = await api.released();
  assert.equal(view.length, 3);
  assert.equal(view.filter((v) => v.current).length, 1);
  assert.equal(view.at(-1).change, "ADDENDUM");
});
test("signed sources cannot be overwritten as drafts; stale amendment target conflicts", async () => {
  const { api } = await releasedFixture();
  const original = (await api.workspace()).summary;
  await assert.rejects(api.saveSummary(summary), (e) => e.code === "conflict");
  await api.amend({
    targetKey: original.key,
    change: "CORRECTION",
    text: "New signed",
    instructions: "",
    reason: "Human reason",
  });
  await assert.rejects(
    api.amend({
      targetKey: original.key,
      change: "CORRECTION",
      text: "Stale",
      instructions: "",
      reason: "Human reason",
    }),
    (e) => e.code === "conflict",
  );
});
test("private signed addendum remains private and cannot contain patient instructions", async () => {
  const { api, controls } = createControlledDocumentation();
  await api.savePrivateNote(controlledDocumentationCanary);
  await api.signPrivateNote((await api.workspace()).note.key);
  const key = (await api.workspace()).note.key;
  await assert.rejects(
    api.amend({
      targetKey: key,
      change: "ADDENDUM",
      text: "private",
      instructions: "for patient",
      reason: "human",
    }),
    (e) => e.code === "validation",
  );
  await api.amend({
    targetKey: key,
    change: "ADDENDUM",
    text: "private addition",
    instructions: "",
    reason: "human",
  });
  controls.setActor("patient");
  assert.deepEqual(await api.released(), []);
});
test("wrong-patient restriction removes ordinary payload, IDs/lineage/counts while sources stay retained", async () => {
  const { api, controls } = await releasedFixture();
  const original = (await api.workspace()).summary;
  await api.amend({
    targetKey: original.key,
    change: "CORRECTION",
    text: "Corrected",
    instructions: "",
    reason: "Human",
  });
  const before = controls.retainedVersionsForTest();
  await api.restrict({
    targetKey: original.key,
    reason: "Explicit wrong-patient concern",
  });
  assert.deepEqual(controls.retainedVersionsForTest(), before);
  const workspace = await api.workspace();
  assert.equal(workspace.summary, null);
  assert.ok(!workspace.history.some((v) => v.kind === "PATIENT_SUMMARY"));
  controls.setActor("patient");
  assert.deepEqual(await api.released(), []);
});
test("uncertain restriction retry cannot replay hidden payload or resurrect any lineage", async () => {
  const { api, controls } = await releasedFixture();
  const key = (await api.workspace()).summary.key;
  controls.failNext("uncertain", true);
  await assert.rejects(
    api.restrict({ targetKey: key, reason: "Explicit reason" }),
    (e) => e.code === "uncertain",
  );
  await assert.rejects(
    api.restrict({ targetKey: key, reason: "Explicit reason" }),
    (e) => e.code === "restricted",
  );
  assert.equal((await api.workspace()).summary, null);
  controls.setActor("patient");
  assert.deepEqual(await api.released(), []);
});
test("uncertain save/sign retries retain canonical key and do not duplicate outcomes", async () => {
  const { api, controls } = createControlledDocumentation();
  controls.failNext("uncertain", true);
  await assert.rejects(api.saveSummary(summary), (e) => e.code === "uncertain");
  await api.saveSummary(summary);
  let keys = controls.commandKeysForTest();
  assert.equal(keys[0], keys[1]);
  assert.match(keys[0], keyPattern);
  assert.equal(controls.retainedVersionsForTest().length, 1);
  const key = (await api.workspace()).summary.key;
  controls.failNext("uncertain", true);
  await assert.rejects(api.releaseSummary(key), (e) => e.code === "uncertain");
  await api.releaseSummary(key);
  keys = controls.commandKeysForTest();
  assert.equal(keys[2], keys[3]);
  assert.equal(
    controls
      .retainedVersionsForTest()
      .filter((v) => v.state === "SIGNED_RELEASED").length,
    1,
  );
});
test("changed payload or genuine new command gets a new key; no automatic retry", async () => {
  const { api, controls } = createControlledDocumentation();
  controls.failNext("uncertain");
  await assert.rejects(api.saveSummary(summary), (e) => e.code === "uncertain");
  assert.equal(controls.commandKeysForTest().length, 1);
  await api.saveSummary({ ...summary, text: "changed" });
  await api.saveSummary({ ...summary, text: "changed" });
  const keys = controls.commandKeysForTest();
  assert.notEqual(keys[0], keys[1]);
  assert.notEqual(keys[1], keys[2]);
});
test("command coordinator snapshots entered content before await; delayed concurrent retry shares key", async () => {
  const calls = [];
  let finish;
  const blocked = new Promise((r) => {
    finish = r;
  });
  const run = createDocumentationCommands(
    () => "author",
    async (value) => {
      calls.push(value);
      await blocked;
    },
  );
  const entered = { text: "entered unchanged · $&" };
  const first = run("SUMMARY", entered);
  entered.text = "edited later";
  const second = run("SUMMARY", { text: "entered unchanged · $&" });
  assert.equal(calls[0].operationKey, calls[1].operationKey);
  assert.equal(calls[0].payload.text, "entered unchanged · $&");
  finish();
  await Promise.all([first, second]);
});
test("errors contain authored copy only, never entered clinical text or UUIDs", async () => {
  const { api, controls } = createControlledDocumentation();
  controls.failNext("conflict");
  await assert.rejects(
    api.savePrivateNote(controlledDocumentationCanary),
    (e) =>
      e.code === "conflict" &&
      !e.message.includes(controlledDocumentationCanary),
  );
  await assert.rejects(
    api.savePrivateNote("x".repeat(8001)),
    (e) => e.code === "validation" && !e.message.includes("x".repeat(10)),
  );
});
test("a retained uncertain save cannot reveal its outcome after restriction", async () => {
  const { api, controls } = createControlledDocumentation();
  controls.failNext("uncertain", true);
  await assert.rejects(api.saveSummary(summary), (e) => e.code === "uncertain");
  const key = (await api.workspace()).summary.key;
  await api.restrict({
    targetKey: key,
    reason: "Explicit wrong-patient concern",
  });
  await assert.rejects(
    api.saveSummary(summary),
    (e) => e.code === "restricted",
  );
  assert.equal((await api.workspace()).summary, null);
  controls.setActor("patient");
  assert.deepEqual(await api.released(), []);
});

test("unchanged clinical commands retain their key across object-key reordering", async () => {
  const keys = [];
  let fail = true;
  const execute = createDocumentationCommands(
    () => "same-scope",
    async (value) => {
      keys.push(value.operationKey);
      if (fail) throw new Error("uncertain");
    },
  );
  await assert.rejects(
    execute("SUMMARY", { text: "unchanged", instructions: "human" }),
  );
  fail = false;
  await execute("SUMMARY", { instructions: "human", text: "unchanged" });
  assert.equal(keys[0], keys[1]);
});
