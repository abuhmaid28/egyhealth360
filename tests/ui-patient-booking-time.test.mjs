import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync("apps/web/src/components/live-booking.tsx", "utf8");
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
let locale = "en";
function declarations(text, names) {
  const ast = ts.createSourceFile("component.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return ast.statements.filter(node =>
    ts.isFunctionDeclaration(node) ? names.includes(node.name?.text) :
      ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.getText(ast))),
  ).map(node => node.getText(ast)).join("\n");
}
const exports = {};
// Actual production declarations and date/time primitives, without adapters, network or state.
new Function("exports", "require", "useLocale", ts.transpileModule(
  declarations(readFileSync("apps/web/src/components/ui.tsx", "utf8"), ["date", "time"]) +
  declarations(readFileSync("apps/web/src/lib/presentation.ts", "utf8"), ["timeZoneLabel"]) +
  declarations(source, ["patientDetailEndpoint", "BookingTime"]) + "\nexport { BookingTime };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText)(exports, webRequire, () => ({ locale, t: value => value }));
const render = (startAt, endAt, timeZone = "Africa/Cairo", patientDetail = true) =>
  renderToStaticMarkup(React.createElement(exports.BookingTime, {
    booking: Object.freeze({ startAt, endAt, timeZone }), patientDetail,
  }));
const text = html => html.replace(/<[^>]+>/g, "");
const clocks = html => [...html.matchAll(/data-appointment-endpoint="(?:start|end)">([^<]+)</g)].map(m => m[1]);

test("Patient detail authors both periods and named Gregorian dates in EN and Egyptian AR", () => {
  for (const [lang, expected, namedDate] of [
    ["en", ["3 pm", "3:30 pm"], "12 Nov 2026"],
    ["ar", ["3 مساءً", "3:30 مساءً"], "12 نوفمبر 2026"],
  ]) {
    locale = lang;
    const html = render("2026-11-12T13:00:00Z", "2026-11-12T13:30:00Z");
    assert.deepEqual(clocks(html), expected);
    assert.ok(text(html).includes(namedDate));
    assert.ok(text(html).includes("Africa/Cairo (UTC+02:00)"));
    assert.doesNotMatch(text(html), /[٠-٩۰-۹]/);
    assert.match(html, /<bdi dir="ltr">/);
    assert.match(html, new RegExp(`dir="${lang === "ar" ? "rtl" : "ltr"}" data-appointment-endpoint="start"`));
  }
});
test("Noon and midnight retain both explicit periods and actual date", () => {
  for (const [lang, noon, midnight] of [["en", "12 pm", "12 am"], ["ar", "12 مساءً", "12 صباحًا"]]) {
    locale = lang;
    assert.equal(clocks(render("2026-11-12T10:00:00Z", "2026-11-12T10:30:00Z"))[0], noon);
    const html = render("2026-11-12T22:00:00Z", "2026-11-12T22:30:00Z");
    assert.equal(clocks(html)[0], midnight);
    assert.match(text(html), lang === "ar" ? /13 نوفمبر 2026/ : /13 Nov 2026/);
  }
});
test("Cairo winter/summer use the date-specific offset, never a permanent Cairo offset", () => {
  locale = "en";
  assert.match(text(render("2026-07-01T12:00:00Z", "2026-07-01T12:30:00Z")), /3 pm.*UTC\+03:00/);
  assert.match(text(render("2026-11-12T13:00:00Z", "2026-11-12T13:30:00Z")), /3 pm.*UTC\+02:00/);
});
test("Repeated hours and backwards wall-clock ranges keep chronological endpoint offsets", () => {
  for (locale of ["en", "ar"]) {
    const same = render("2026-10-29T20:30:00Z", "2026-10-29T21:30:00Z");
    assert.deepEqual(clocks(same), locale === "ar" ? ["11:30 مساءً", "11:30 مساءً"] : ["11:30 pm", "11:30 pm"]);
    assert.match(text(same), /UTC\+03:00.*UTC\+02:00/);
    const backwards = render("2026-10-29T20:45:00Z", "2026-10-29T21:15:00Z");
    assert.deepEqual(clocks(backwards), locale === "ar" ? ["11:45 مساءً", "11:15 مساءً"] : ["11:45 pm", "11:15 pm"]);
    assert.match(text(backwards), /UTC\+03:00.*UTC\+02:00/);
  }
});
test("Cross-midnight displays both real dates in source chronological order", () => {
  for (locale of ["en", "ar"]) {
    const html = render("2026-11-12T21:30:00Z", "2026-11-12T22:30:00Z");
    assert.match(text(html), locale === "ar" ? /12 نوفمبر 2026.*11:30 مساءً.*13 نوفمبر 2026.*12:30 صباحًا/ : /12 Nov 2026.*11:30 pm.*13 Nov 2026.*12:30 am/);
  }
});
test("Event zone governs cross-zone readings independently of machine TZ, including fractional offsets", () => {
  locale = "en";
  const old = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Honolulu";
    for (const [zone, clock, offset] of [
      ["America/New_York", "8 am", "UTC-05:00"], ["Asia/Kolkata", "6:30 pm", "UTC+05:30"], ["UTC", "1 pm", "UTC+00:00"],
    ]) {
      const html = render("2026-11-12T13:00:00Z", "2026-11-12T13:30:00Z", zone);
      assert.equal(clocks(html)[0], clock);
      assert.ok(text(html).includes(`${zone} (${offset})`));
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("Spring-forward renders exact supplied instants without fabricating the missing local hour", () => {
  locale = "en";
  const html = render("2026-03-08T06:30:00Z", "2026-03-08T07:30:00Z", "America/New_York");
  assert.deepEqual(clocks(html), ["1:30 am", "3:30 am"]);
  assert.match(text(html), /UTC-05:00.*UTC-04:00/);
});
test("Default and explicit false remain professional 24h, with no patient variant markup", () => {
  for (locale of ["en", "ar"]) {
    const props = { booking: { startAt: "2026-11-12T13:00:00Z", endAt: "2026-11-12T13:30:00Z", timeZone: "Africa/Cairo" } };
    const original = renderToStaticMarkup(React.createElement(exports.BookingTime, props));
    assert.equal(original, render(props.booking.startAt, props.booking.endAt, props.booking.timeZone, false));
    assert.match(text(original), /15:00.*15:30/);
    assert.doesNotMatch(original, /data-patient-detail-time|data-appointment-endpoint|صباحًا|مساءً|\b[ap]m\b/);
  }
});
test("Only BookingDetails opts in; professional/history/default branches retain source behavior", () => {
  const ast = ts.createSourceFile("live-booking.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls = [];
  const visit = (node, owner) => {
    if (ts.isFunctionDeclaration(node)) owner = node.name?.text;
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "BookingTime") calls.push({ owner, node });
    ts.forEachChild(node, child => visit(child, owner));
  };
  visit(ast);
  assert.equal(calls.length, 7);
  const optIns = calls.filter(({ node }) => node.attributes.properties.some(p => p.name?.getText(ast) === "patientDetail"));
  assert.equal(optIns.length, 1);
  assert.equal(optIns[0].owner, "BookingDetails");
  assert.match(optIns[0].node.getText(ast), /patientDetail=\{!clinician\}/);
  const details = declarations(source, ["BookingDetails"]);
  assert.ok(details.includes("{time(e.recordedAt, b.timeZone, locale)}"));
  assert.equal((details.match(/time\(e.recordedAt, b.timeZone, locale\)/g) ?? []).length, 2);
  const variant = declarations(source, ["patientDetailEndpoint", "BookingTime"]);
  assert.doesNotMatch(variant, /fetch\(|localStorage|sessionStorage|setState|useEffect|bookingEligibility|\.endAt\s*=/);
});
