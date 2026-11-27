import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";

const root = "apps/web/src/";
// Reviewed immutable baseline5355ae5. Digests keep scope tests independent of CI checkout depth.
const baseline = {
  "apps/web/src/components/patient-my-care.tsx": {
    "sha256": "b7b746b670aafd067ce8f46da6c4c6afa77e28f679d7ac56db0c088ee7961ea5"
  },
  "apps/web/src/components/clinician-consultation-presentation.tsx": {
    "sha256": "94509d8def649fb09caca8e2ffbe5562e42f8afcb79c1398543bdc5a6ae80ce0"
  },
  "apps/web/src/components/patient-my-care.module.css": {
    "characters": 35703,
    "sha256": "c6295daeacdd1cdff81127e0c13e43ee7a6739ba8af8ad8eb0d3bf603639c909"
  },
  "apps/web/src/components/clinician-consultation.module.css": {
    "characters": 21529,
    "sha256": "3f139ece2068afad2cf36d28e9af9e62d48d8976e00f4b32c32371fdde03deb6"
  },
  "scripts/support/ui-staging-time-browser.mjs": {
    "sha256": "dd8ba6e8432f5ab83b660cfa8187b0b1c4f86498f81f7fc3ea87533e00b7ff4e"
  }
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
const styles = new Proxy({}, { get: (_, name) => String(name) });
const read = (path) => readFileSync(path, "utf8");
function evaluate(source, bindings = {}) {
  const exports = {};
  const require = (name) => {
    if (name.endsWith(".module.css")) return { default: styles };
    return webRequire(name);
  };
  new Function("exports", "require", ...Object.keys(bindings), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText)(exports, require, ...Object.values(bindings));
  return exports;
}
const copy = evaluate(read(root + "lib/patient-my-care-copy.ts")).myCareCopy;
const dictionary = evaluate(read(root + "lib/i18n/ar.ts")).ar;
const presentation = evaluate(read(root + "lib/presentation.ts"));
const dates = evaluate(read(root + "lib/patient-my-care.ts"));
const avatar = evaluate(read(root + "lib/patient-my-care-avatar.ts"));
const neutral = evaluate(read(root + "components/v2/read-context.tsx"));
const Link = ({ children, ...props }) => React.createElement("a", props, children);
const Icon = () => React.createElement("svg", { "aria-hidden": true });
let locale = "en";
const translate = (text) => locale === "ar" ? dictionary[text] ?? text : text;
const useLocale = () => ({ locale, t: translate });
function functions(file, names) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return ast.statements.filter((n) => ts.isFunctionDeclaration(n) && names.includes(n.name?.text))
    .map((n) => n.getText(ast)).join("\n") + `\nexport { ${names.join(", ")} };`;
}
const patientFile = root + "components/patient-my-care.tsx";
const doctorFile = root + "components/clinician-consultation-presentation.tsx";
// Execute the actual component declarations, without exporting new production APIs,
// loading an adapter or changing the existing provider/route harness.
const patient = evaluate(functions(patientFile, ["AppointmentAnchor", "CareLoading", "StateLabel"]), {
  ...presentation, ...dates, ...avatar, ...neutral, styles, Link, Icon,
});
const doctor = evaluate(functions(doctorFile, ["ConsultationIdentity", "ClinicalTimestamp"]), {
  ...presentation, ...dates, ...neutral, styles, Link, Icon, useLocale,
});
const appointment = Object.freeze({ id: "own-logistics", doctor: "د. مريم Recorded Doctor", specialty: "Cardiology", clinic: "Recorded clinic عيادة", startAt: "2026-10-29T20:30:00Z", timeZone: "Africa/Cairo", state: "BOOKED" });
function renderPatient(extra = {}) {
  return renderToStaticMarkup(React.createElement(patient.AppointmentAnchor, {
    c: copy[locale], locale, appointment, loading: false, error: false,
    sessionRecovery: false, retry: () => { throw Error("render must not retry"); }, translate, ...extra,
  }));
}
function renderDoctor(extra = {}) {
  return renderToStaticMarkup(React.createElement(doctor.ConsultationIdentity, {
    patientName: "Recorded patient مريض", providerName: "Recorded doctor", clinicName: "Recorded clinic",
    startAt: appointment.startAt, timeZone: appointment.timeZone, state: "OPEN", bookingId: "permitted-visit", ...extra,
  }));
}

test("Patient overview renders locale-specific 12-hour periods and both Cairo fold offsets, with no duration inference", () => {
  for (locale of ["en", "ar"]) {
    for (const [startAt, offset] of [["2026-10-29T20:30:00Z", "UTC+03:00"], ["2026-10-29T21:30:00Z", "UTC+02:00"]]) {
      const html = renderPatient({ appointment: { ...appointment, startAt } });
      assert.ok(html.includes(locale === "ar" ? "11:30 م" : "11:30 pm"));
      assert.ok(html.includes(offset));
      assert.ok(html.includes(dates.careDate(startAt, "Africa/Cairo", locale)));
      assert.ok(!html.includes("23:30"));
      assert.ok(!html.includes("endAt"));
    }
  }
});
test("Patient date follows the event zone across midnight and seasons, independent of browser zone", () => {
  for (locale of ["en", "ar"]) {
    for (const [startAt, zone, clock] of [
      ["2026-11-05T22:30:00Z", "Africa/Cairo", locale === "ar" ? "12:30 ص" : "12:30 am"],
      ["2026-07-01T12:00:00Z", "Africa/Cairo", locale === "ar" ? "3:00 م" : "3:00 pm"],
      ["2026-11-05T22:30:00Z", "Asia/Kolkata", locale === "ar" ? "4:00 ص" : "4:00 am"],
    ]) {
      const html = renderPatient({ appointment: { ...appointment, startAt, timeZone: zone } });
      assert.ok(html.includes(clock), `${locale} ${zone} ${clock}`);
      assert.ok(html.includes(dates.careDate(startAt, zone, locale)));
      assert.ok(!/[٠-٩]/u.test(html));
    }
  }
});
test("Patient render suppresses stale identities, links, status and metadata during loading or denied/read error", () => {
  const sensitive = { ...appointment, id: "DENIED-ID-CANARY", doctor: "WRONG-PATIENT-CANARY", clinic: "PRIVATE-CLINIC-CANARY" };
  for (locale of ["en", "ar"]) {
    for (const flags of [{ loading: true }, { error: true }, { error: true, sessionRecovery: true }]) {
      const html = renderPatient({ appointment: sensitive, ...flags });
      assert.ok(!html.includes("CANARY"), "including hidden DOM, attributes and accessible labels");
      assert.ok(!html.includes("/patient/appointments/"));
      assert.ok(!html.includes(copy[locale].booked));
      assert.ok(html.includes(flags.loading ? copy[locale].loading : copy[locale].error));
    }
    const absent = renderPatient({ appointment: undefined });
    assert.ok(absent.includes(copy[locale].empty));
    assert.ok(!absent.includes("/patient/appointments/"));
  }
});
test("Permitted Patient projection retains full recorded identity, exact navigation and booking boundary; missing names are not fabricated", () => {
  for (locale of ["en", "ar"]) {
    const html = renderPatient();
    assert.ok(html.includes(appointment.doctor));
    assert.ok(html.includes(appointment.clinic));
    assert.ok(html.includes('href="/patient/appointments/own-logistics"'));
    assert.ok(html.includes(copy[locale].bookingBoundary));
    const unknown = renderPatient({ appointment: { ...appointment, doctor: null, specialty: null, clinic: null } });
    for (const key of ["doctorUnavailable", "specialtyUnavailable", "clinicUnavailable"]) assert.ok(unknown.includes(copy[locale][key]));
    assert.ok(!unknown.includes(appointment.doctor));
  }
});
test("Doctor header keeps professional 24-hour date/offset, OPEN/CLOSED semantics and exact existing Back route", () => {
  for (locale of ["en", "ar"]) {
    for (const state of ["OPEN", "CLOSED"]) {
      const html = renderDoctor({ state });
      assert.ok(html.includes("23:30"));
      assert.ok(html.includes("UTC+03:00"));
      assert.ok(!html.includes("11:30"));
      assert.ok(html.includes(translate(state === "OPEN" ? "Consultation open" : "Closed visit")));
      assert.ok(html.includes('href="/doctor/consultation/permitted-visit"'));
      assert.ok(html.includes(translate("Back to consultation")));
      assert.ok(html.includes("Recorded patient مريض"));
      assert.ok(!html.includes("SIGNED_RELEASED"));
    }
  }
});
test("All critical slice copy is already authored in Arabic; no new fallback key or translated recorded identity", () => {
  for (const key of ["nextAppointment", "booked", "opened", "viewDetails", "doctorUnavailable", "specialtyUnavailable", "clinicUnavailable", "bookingBoundary", "loading", "loadingContext", "error", "errorContext", "empty", "emptyContext", "sessionRecovery", "refreshSession", "loadAgain"]) {
    assert.ok(copy.ar[key]);
    assert.notEqual(copy.ar[key], copy.en[key]);
  }
  for (const key of ["Patient and visit", "Consultation open", "Closed visit", "Back to consultation", "Cairo time", "Coordinated Universal Time"]) assert.ok(dictionary[key], key);
});
test("Only the two authorized component declarations change; loaders, source rail, timestamps and command composition stay byte-identical", () => {
  for (const [file, target] of [[patientFile, "AppointmentAnchor"], [doctorFile, "ConsultationIdentity"]]) {
    const declarations = (text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).statements
      .filter((n) => !ts.isImportDeclaration(n) && !(ts.isFunctionDeclaration(n) && n.name?.text === target)).map((n) => n.getText());
    assert.equal(sha256(JSON.stringify(declarations(read(file)))), baseline[file].sha256);
  }
});
test("Neutral display components import only React types and local CSS; no hooks, request, storage, policy or clinical dependency", () => {
  const file = root + "components/v2/read-context.tsx", source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = ast.statements.filter(ts.isImportDeclaration).map((n) => n.moduleSpecifier.text);
  assert.deepEqual(imports, ["react", "./read-context.module.css"]);
  assert.doesNotMatch(source, /\b(fetch|localStorage|sessionStorage|useEffect|useState|useContext)\b/);
});
test("Scoped CSS appends only new view treatment; existing global/other-surface rules are preserved", () => {
  for (const name of ["patient-my-care.module.css", "clinician-consultation.module.css"]) {
    const path = root + "components/" + name;
    assert.equal(sha256(read(path).slice(0, baseline[path].characters)), baseline[path].sha256);
  }
  const css = read(root + "components/v2/read-context.module.css");
  assert.doesNotMatch(css, /prefers-color-scheme|@font-face|https?:|:root/);
});
test("Eighth-file exception changes only Patient fold expectation; all Doctor/detail24h, offsets and safety assertions remain exact", () => {
  const path = "scripts/support/ui-staging-time-browser.mjs";
  const normalized = read(path).replace(`await anchor.getByText(
          locale === "ar" ? "11:30 م" : "11:30 pm",
          { exact: true },
        ).waitFor();`, 'assert.ok(text.includes("23:30"), `${name}: preserve repeated clinic clock time`);');
  assert.notEqual(normalized, read(path), "the approved exact locale-specific assertion must exist");
  assert.equal(sha256(normalized), baseline[path].sha256);
});
