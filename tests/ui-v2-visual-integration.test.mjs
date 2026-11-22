import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const read = path => readFileSync(path, "utf8");
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const source = read("apps/web/src/components/v2/frontend-v2-theme.tsx");
let locale = "en";
const exports = {};
new Function("exports", "require", ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023,
} }).outputText)(exports, name => name === "../../lib/i18n/context" ? { useLocale: () => ({ locale }) } : webRequire(name));

test("T1 server render is deterministic System with authored AR/EN choices and no browser dependency", () => {
  for (locale of ["ar", "en"]) {
    const render = () => renderToStaticMarkup(React.createElement(exports.FrontendV2ThemeProvider, null, React.createElement(exports.FrontendV2ThemeSwitch)));
    const html = render();
    assert.equal(html, render());
    assert.match(html, /value="system" selected=""/);
    for (const option of ["light", "dark"]) assert.ok(html.includes(`value="${option}"`));
    assert.ok(html.includes(locale === "ar" ? "المظهر" : "Appearance"));
    assert.ok(html.includes(locale === "ar" ? "اختيارك للجلسة دي بس." : "Your choice lasts for this session only."));
  }
  assert.doesNotMatch(source, /localStorage|sessionStorage|cookie|fetch\(|session\.name|session\.role/);
});

test("Audited V2 text/action/control pairs retain contrast across both authored appearances", () => {
  const luminance = hex => hex.replace("#", "").match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  const css = read("apps/web/src/components/v2/frontend-v2-tokens.css");
  const blocks = [css.slice(css.indexOf(":root {"), css.indexOf("@media")), css.slice(css.indexOf(':root[data-frontend-v2-theme="dark"] {'), css.indexOf("/* Higher"))];
  for (const block of blocks) {
    const tokens = Object.fromEntries([...block.matchAll(/--v2-([\w-]+):\s*(#[a-f\d]{3,6});/g)].map(([, name, value]) => [name, value.length === 4 ? "#" + [...value.slice(1)].map(x => x + x).join("") : value]));
    for (const plane of ["canvas", "surface", "raised"]) {
      for (const text of ["ink", "muted", "action"]) assert.ok(ratio(tokens[text], tokens[plane]) >= 4.5, `${text}/${plane}`);
      assert.ok(ratio(tokens.control, tokens[plane]) >= 3, `control/${plane}`);
    }
    assert.ok(ratio(tokens["on-action"], tokens.action) >= 4.5);
    assert.ok(ratio(tokens["on-action"], tokens.hover) >= 4.5);
  }
});

test("Theme resets consume existing capability notification without keying or commanding the editor", () => {
  const app = read("apps/web/src/components/application.tsx");
  assert.ok(app.includes('const chooseMode = (mode: Mode) => {\n    demoFocusDestination = null;\n    resetTheme();\n    liveSession.clear();'));
  assert.ok(app.includes('await api?.logout();\n      demoFocusDestination = null;\n      resetTheme();'));
  assert.ok(app.includes('session?.mode !== "demo" || pathname !== demoFocusDestination'));
  assert.ok(read("apps/web/app/layout.tsx").includes("<FrontendV2ThemeProvider>"));
  assert.ok(app.includes("source.subscribe(() =>"));
  assert.ok(app.includes("if (next !== stamp) { stamp = next; resetTheme(); }"));
  assert.doesNotMatch(app, /key=\{(?:theme|locale)\}/);
  assert.doesNotMatch(source, /\.submit\(|\.sign\(|\.release\(|\.close\(|\.retry\(/);
});
