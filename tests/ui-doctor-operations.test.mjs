import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const webRequire = createRequire(resolve("apps/web/package.json"));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");

let currentMode = "demo";
let currentRole = "CLINICIAN";
let currentBookingImpl = "demo";
let currentLocale = "en";
let adapterCalls = 0;

function loadDictionary() {
  const out = {};
  new Function(
    "exports",
    ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
  )(out);
  return out.ar;
}

const arDict = loadDictionary();
const cache = new Map();

function loadComponent(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  const exports = {};
  cache.set(filePath, exports);
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const fakeApp = () => ({
    api: new Proxy(
      { mode: currentMode },
      {
        get(target, key) {
          if (key === "mode") return target.mode;
          return () => {
            adapterCalls++;
            throw new Error("Render must not call API adapter");
          };
        },
      },
    ),
    booking: new Proxy(
      { implementation: currentBookingImpl },
      {
        get(target, key) {
          if (key === "implementation") return target.implementation;
          return () => {
            adapterCalls++;
            throw new Error("Render must not call booking adapter");
          };
        },
      },
    ),
    session: { role: currentRole, mode: currentMode, name: "Synthetic Doctor" },
    preview: "ready",
    refresh: 0,
    changed: () => {},
    notify: () => {},
  });
  const requireFn = (name) => {
    if (name.endsWith(".css")) {
      return { default: new Proxy({}, { get: (_, prop) => String(prop) }) };
    }
    if (name === "next/link") {
      return {
        default: ({ children, ...props }) => React.createElement("a", props, children),
      };
    }
    if (name.endsWith("i18n/context")) {
      return {
        useLocale: () => ({
          locale: currentLocale,
          t: (text) => (currentLocale === "ar" ? (arDict[text] ?? text) : text),
        }),
      };
    }
    if (name === "./context") return { useApp: fakeApp };
    if (name === "./live-documentation") {
      return { LiveDocumentationWorkspace: () => null, RelatedSummaries: () => null };
    }
    if (name === "./live-booking") {
      return {
        LiveBookingList: () => React.createElement("div", { "data-live-list": "true" }),
        LiveBookingDetail: () => React.createElement("div", { "data-live-detail": "true" }),
      };
    }
    if (name === "./consultation-opening") return { LiveConsultationShell: () => null };
    if (name === "./journey") return { DemoContinuation: () => null };
    if (name === "./patient") return { AppointmentRow: () => null, Stat: () => null };
    if (name.startsWith(".")) {
      const base = resolve(dirname(filePath), name);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(target, `Unresolved module: ${name} from ${filePath}`);
      return loadComponent(target);
    }
    return webRequire(name);
  };
  new Function("exports", "require", compiled)(exports, requireFn);
  return exports;
}

const { DoctorAvailability } = loadComponent(resolve("apps/web/src/components/availability.tsx"));
const { DoctorScreen } = loadComponent(resolve("apps/web/src/components/doctor.tsx"));

test("DoctorAvailability mounts expressive presentation strictly for Demo Clinician and preserves Live JSX", () => {
  for (const locale of ["en", "ar"]) {
    currentLocale = locale;
    currentRole = "CLINICIAN";
    currentBookingImpl = "demo";

    currentMode = "demo";
    adapterCalls = 0;
    const demoHtml = renderToStaticMarkup(React.createElement(DoctorAvailability));
    assert.match(demoHtml, /data-expressive-doctor-availability="true"/);
    assert.ok(demoHtml.includes('href="/doctor/schedule"'));
    assert.equal(adapterCalls, 0);

    currentMode = "live";
    adapterCalls = 0;
    const liveHtml = renderToStaticMarkup(React.createElement(DoctorAvailability));
    assert.doesNotMatch(liveHtml, /data-expressive-doctor-availability/);
    assert.match(liveHtml, /availability-columns/);
    assert.equal(adapterCalls, 0);
  }
});

test("DoctorScreen routes Live appointment details to LiveBookingDetail and scopes expressive appointment card to Demo Clinician", () => {
  for (const locale of ["en", "ar"]) {
    currentLocale = locale;
    currentRole = "CLINICIAN";
    currentBookingImpl = "demo";

    currentMode = "live";
    adapterCalls = 0;
    const liveHtml = renderToStaticMarkup(
      React.createElement(DoctorScreen, { path: "/doctor/appointments/demo-my-care-visit" }),
    );
    assert.match(liveHtml, /data-live-detail="true"/);
    assert.doesNotMatch(liveHtml, /data-expressive-doctor-appointment/);
    assert.equal(adapterCalls, 0);

    currentMode = "demo";
    adapterCalls = 0;
    const demoHtml = renderToStaticMarkup(
      React.createElement(DoctorScreen, { path: "/doctor/appointments/demo-my-care-visit" }),
    );
    assert.match(demoHtml, /data-expressive-doctor-appointment="true"/);
    assert.ok(demoHtml.includes('href="/doctor/schedule"'));
    assert.equal(adapterCalls, 0);
  }
});

test("DoctorAvailability and Doctor operations CSS avoid hardcoded non-v2 light backgrounds and protect Schedule evidence", () => {
  const css = readFileSync("apps/web/src/components/v2/doctor-operations-signature.module.css", "utf8");
  assert.match(css, /var\(--v2-surface\)/);
  assert.match(css, /var\(--v2-raised\)/);
  assert.match(css, /var\(--v2-accent\)/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /prefers-reduced-motion: reduce/);

  const manifest = JSON.parse(
    readFileSync("docs/visual-evidence/135/doctor-schedule-a109ba6/image-manifest.json", "utf8"),
  );
  assert.equal(manifest.images.length, 16);
  for (const entry of manifest.images) {
    const png = readFileSync(`docs/visual-evidence/135/doctor-schedule-a109ba6/images/${entry.file}`);
    assert.equal(createHash("sha256").update(png).digest("hex"), entry.sha256, entry.file);
  }
});
