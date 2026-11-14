import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
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
test("neutral locale SSR does not mount task children or consult browser storage", () => {
  const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
  const React = require("react");
  const { renderToString } = require("react-dom/server");
  const context = {};
  new Function("exports", "require", ts.transpileModule(
    readFileSync(folder + "context.tsx", "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText)(context, (name) => {
    if (name === "./catalog") return catalog;
    if (name.endsWith(".css")) return { default: { root: "root", wordmark: "wordmark" } };
    return require(name);
  });
  let mounted = 0;
  function Task() { mounted++; return React.createElement("button", null, "PRIVATE_TASK_CANARY"); }
  const html = renderToString(React.createElement(context.LocaleProvider, null, React.createElement(Task)));
  assert.equal(mounted, 0);
  assert.ok(!html.includes("PRIVATE_TASK_CANARY"));
  assert.match(html, /data-initial-locale/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /lang="en" dir="ltr">Loading your workspace…/);
  assert.match(html, /lang="ar" dir="rtl">بنجهّز مساحة العمل…/);
  assert.ok(!/<button|<input/.test(html));
  const layout = readFileSync("apps/web/app/layout.tsx", "utf8");
  assert.match(layout, /<html lang="en" dir="ltr">/);
  assert.match(layout, /<noscript>[\s\S]*lang="en" dir="ltr"[\s\S]*JavaScript is needed to open this workspace\.[\s\S]*lang="ar" dir="rtl"[\s\S]*فتح مساحة العمل دي محتاج JavaScript\.[\s\S]*<\/noscript>/);
  assert.ok(!layout.includes("suppressHydrationWarning"));
});
test("locale changes preserve recorded values without translating them twice", () => {
  const entered = "Recorded name · أحمد $& {name} Amoxicillin 1.25 mL";
  for (const locale of ["ar", "en", "ar"]) {
    const translated = catalog.translate(locale, "Good morning, {name}.", { name: entered });
    assert.equal(translated, locale === "ar" ? `صباح الخير، ${entered}.` : `Good morning, ${entered}.`);
    assert.equal(catalog.translate(locale, entered), entered);
  }
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
