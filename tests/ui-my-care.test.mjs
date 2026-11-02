import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const view = {};
new Function(
  "exports",
  ts.transpileModule(
    readFileSync("apps/web/src/lib/patient-my-care.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
)(view);

test("My Care preserves past booked status, prioritizes open visits, and never selects a terminal visit as upcoming", () => {
  const rows = [
    { id: "closed", state: "CONSULTED", startAt: "2026-11-02T10:00:00Z" },
    { id: "past-booked", state: "BOOKED", startAt: "2020-01-01T10:00:00Z" },
    { id: "open", state: "IN_CONSULTATION", startAt: "2026-11-02T11:00:00Z" },
    { id: "cancelled", state: "CANCELLED", startAt: "2026-11-03T11:00:00Z" },
  ].map(Object.freeze);
  const original = [...rows];
  assert.equal(view.nextCareAppointment(rows).id, "open");
  assert.equal(
    view.nextCareAppointment(rows.filter((x) => x.id !== "open")).id,
    "past-booked",
  );
  assert.equal(
    view.nextCareAppointment(
      rows.filter((x) => !["BOOKED", "IN_CONSULTATION"].includes(x.state)),
    ),
    undefined,
  );
  assert.deepEqual(rows, original);
});
test("My Care keeps clinical payloads out of the source-list projection and filters non-current/unreleased versions", () => {
  const valid = {
    key: "allowed",
    state: "SIGNED_RELEASED",
    current: true,
    authorName: "Recorded author",
    releasedAt: "2026-11-02T10:30:00Z",
    text: "SOURCE-CONTENT-CANARY",
    facts: { private: "PRIVATE-CANARY" },
  };
  const result = view.sharedActivity([
    valid,
    { ...valid, key: "draft", state: "DRAFT" },
    { ...valid, key: "old", current: false },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].source, "Recorded author");
  assert.equal(result[0].href, "/patient/summaries");
  assert.ok(!JSON.stringify(result).includes("CANARY"));
  assert.equal(
    result[0].timeZone,
    "UTC",
    "no clinic zone is invented for a source without one",
  );
});
test("My Care uses actual event timezone/DST and Latin 24-hour values", () => {
  assert.equal(view.careTime("2026-10-28T07:00:00Z", "Africa/Cairo"), "10:00");
  assert.equal(
    view.careOffset("2026-10-28T07:00:00Z", "Africa/Cairo"),
    "UTC+03:00",
  );
  assert.equal(view.careTime("2026-11-02T12:30:00Z", "Africa/Cairo"), "14:30");
  assert.equal(
    view.careOffset("2026-11-02T12:30:00Z", "Africa/Cairo"),
    "UTC+02:00",
  );
  assert.match(
    view.careDate("2026-11-02T12:30:00Z", "Africa/Cairo", "ar"),
    /2.*2026/,
  );
  assert.doesNotMatch(
    view.careDate("2026-11-02T12:30:00Z", "Africa/Cairo", "ar"),
    /[٠-٩]/,
  );
});
test("Live logistics enrichment never substitutes Demo identities when the directory is unavailable", () => {
  const row = Object.freeze({
    id: "a",
    providerId: "p",
    clinicId: "c",
    startAt: "2026-11-02T10:00:00Z",
    timeZone: "UTC",
    state: "BOOKED",
    patientDisplayName: "UNNECESSARY-PATIENT-CANARY",
  });
  const result = view.ownLiveAppointment(row, [], []);
  assert.equal(result.doctor, null);
  assert.equal(result.clinic, null);
  assert.equal(result.specialty, null);
  assert.ok(!JSON.stringify(result).includes("CANARY"));
  assert.equal(result.state, "BOOKED");
});
