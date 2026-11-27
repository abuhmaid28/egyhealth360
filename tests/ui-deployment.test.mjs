import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { topologyOptions, verifyRewrite } from "../scripts/verify-web-api-topology.mjs";

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

test("Compose has one build owner with an explicit server-only origin", () => {
  const compose = readFileSync("compose.yaml", "utf8");
  const dockerfile = readFileSync("Dockerfile", "utf8");
  assert.equal((compose.match(/^ {4}build:/gm) ?? []).length, 1);
  assert.match(compose, /api:\n {4}<<: \*app\n[^]*?build:\n {6}context: \.\n {6}args:\n {8}EH_UI_API_ORIGIN: http:\/\/api:3001/);
  assert.doesNotMatch(compose, /^ {2}build:/m);
  assert.match(dockerfile, /ARG EH_UI_API_ORIGIN\nRUN [^\n]*test -n "\$EH_UI_API_ORIGIN"[^\n]*pnpm build/);
  assert.doesNotMatch(dockerfile, /ENV [^\n]*EH_UI_API_ORIGIN/);
});

test("E1 artifact gate rejects the historical loopback and ambiguous rewrites", () => {
  const route = { source: "/api/v1/:path*", destination: "http://api:3001/api/v1/:path*" };
  verifyRewrite({ version: 3, rewrites: { beforeFiles: [], afterFiles: [route], fallback: [] } });
  assert.throws(() => verifyRewrite({ version: 3, rewrites: [{ ...route, destination: "http://127.0.0.1:3001/api/v1/:path*" }] }));
  assert.throws(() => verifyRewrite({ version: 3, rewrites: [route, route] }));
});

test("E1 verifier refuses ordinary projects, hosted URLs and unsafe input", () => {
  const args = ["--project", "eh122-e1-1234abcd", "--source", "a".repeat(40), "--image", "sha256:" + "b".repeat(64), "--web", "http://localhost:23000", "--api", "http://127.0.0.1:23001"];
  topologyOptions(args);
  for (const [index, value] of [[1, "egyhealth360"], [3, "main"], [5, "latest"], [7, "https://example.invalid"], [7, "http://user:secret@localhost:23000"], [9, "http://localhost:23001"], [9, "http://127.0.0.1:23001/api"]]) {
    const invalid = [...args]; invalid[index] = value;
    assert.throws(() => topologyOptions(invalid));
  }
  assert.throws(() => topologyOptions([...args, "--project", "eh122-e1-other123"]));
  assert.throws(() => topologyOptions([...args, "--clinical-write"]));
});
