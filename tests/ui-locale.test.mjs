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
  for (const file of [
    "apps/web/src/components",
    "apps/web/src/previews",
  ].flatMap((folder) =>
    readdirSync(folder)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => folder + "/" + name),
  )) {
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
