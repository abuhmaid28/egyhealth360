import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
const folder = "apps/web/src/lib/i18n/";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync(folder + "ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
const catalog = {};
new Function(
  "exports",
  "require",
  ts.transpileModule(readFileSync(folder + "catalog.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(catalog, () => dictionary);
test("locale preference accepts only presentation enums; interpolation preserves literal entered values", () => {
  assert.equal(catalog.localePreferenceKey, "eh360-locale");
  for (const invalid of [null, "", "fr", '{"role":"ADMIN","patient":"x"}'])
    assert.equal(catalog.parseLocale(invalid), "en");
  assert.equal(catalog.parseLocale("ar"), "ar");
  const entered = "أحمد $& {data}";
  assert.equal(
    catalog.translate("ar", "Good morning, {name}.", { name: entered }),
    `صباح الخير، ${entered}.`,
  );
  assert.equal(
    catalog.translate("en", "Good morning, {name}.", { name: entered }),
    `Good morning, ${entered}.`,
  );
});
test("authored UI translation calls have Arabic catalog entries with matching placeholders", () => {
  const allowed = new Set([
    "EgyHealth",
    "360",
    "+",
    "/",
    "·",
    "–",
    "العربية",
    "Africa/Cairo",
    "you@example.com",
    "2026-11-02T09:00:00+02:00",
    "2026-11-02T09:30:00+02:00",
    "’s",
  ]);
  const recursive = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? recursive(folder + "/" + entry.name) : entry.name.endsWith(".tsx") ? [folder + "/" + entry.name] : [],
  );
  for (const file of [
    "apps/web/src/components",
    "apps/web/src/previews",
  ].flatMap(recursive)) {
    const ast = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (n) => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === "t" &&
        ts.isStringLiteral(n.arguments[0])
      ) {
        const key = n.arguments[0].text;
        assert.ok(
          dictionary.ar[key] || allowed.has(key),
          `Missing Arabic UI copy: ${key}`,
        );
      }
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t" && n.arguments[0] && ts.isConditionalExpression(n.arguments[0])) {
        const check = (value) => {
          if (ts.isConditionalExpression(value)) { check(value.whenTrue); check(value.whenFalse); }
          else if (ts.isStringLiteral(value)) assert.ok(dictionary.ar[value.text] || allowed.has(value.text), `Missing conditional Arabic UI copy: ${value.text}`);
        };
        check(n.arguments[0]);
      }
      ts.forEachChild(n, visit);
    };
    visit(ast);
  }
  for (const [key, value] of Object.entries(dictionary.ar)) {
    const parameters = (s) => (s.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(
      parameters(value),
      parameters(key),
      `Placeholder mismatch: ${key}`,
    );
  }
});

test("finite booking task dependencies and dynamic errors remain covered; optional labels are explicitly bounded", () => {
  const critical = {};
  new Function("exports", "require", ts.transpileModule(readFileSync(folder + "critical-copy.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(critical, () => dictionary);
  assert.deepEqual(critical.criticalCopyTasks.bookingCreate.optional, ["Booking progress", "Choose a time", "Review details", "Booking confirmation"]);
  assert.equal(critical.criticalCopyState("ar", "bookingCreate").ready, true);
  for (const file of ["apps/web/src/lib/api/live-booking.ts", "apps/web/src/lib/api/errors.ts"]) {
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const messages = [];
    const visit = (n) => {
      if (ts.isStringLiteral(n) && /\s/.test(n.text) && !n.text.startsWith("./")) messages.push(n.text);
      ts.forEachChild(n, visit);
    };
    visit(ast);
    for (const key of messages) assert.ok(dictionary.ar[key], `Missing finite booking error copy: ${key}`);
    for (const key of messages) assert.ok(critical.criticalCopyTasks.bookingCreate.required.includes(key), `Unregistered booking error copy: ${key}`);
  }
});
