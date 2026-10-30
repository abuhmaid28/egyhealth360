import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const config = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/next.config.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(config);

test("API routing keeps local development explicit and unconfigured Vercel demo-only", () => {
  assert.equal(config.apiOrigin(undefined, false), "http://127.0.0.1:3001");
  assert.equal(config.apiOrigin(undefined, true), null);
  assert.equal(config.apiOrigin("", true), null);
  assert.equal(
    config.apiOrigin("https://api.example.invalid/", true),
    "https://api.example.invalid",
  );
  assert.equal(config.apiOrigin("http://api:3001", false), "http://api:3001");
});

test("API routing rejects credentials, non-origins and hosted insecure or loopback targets", () => {
  for (const value of [
    " ",
    "/api",
    "ftp://api.example.invalid",
    "https://user:secret@api.example.invalid",
    "https://api.example.invalid/v1",
    "https://api.example.invalid?key=secret",
    "https://api.example.invalid/#fragment",
  ])
    assert.throws(() => config.apiOrigin(value, false), /EH_UI_API_ORIGIN/);
  for (const value of [
    "http://api.example.invalid",
    "https://localhost",
    "https://127.0.0.1",
    "https://[::1]",
  ])
    assert.throws(() => config.apiOrigin(value, true), /Vercel/);
});
