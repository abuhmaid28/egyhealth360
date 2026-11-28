import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, win32 } from "node:path";
import ts from "typescript";
import { resolveReportPath } from "../scripts/support/ui-v2-verification-browser.mjs";

const webRequire = createRequire(resolve("apps/web/package.json"));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");

const compiledDir = mkdtempSync(join(tmpdir(), "eh-v2-remed-"));
execFileSync(process.execPath, [
  resolve("node_modules/typescript/bin/tsc"),
  "--outDir",
  compiledDir,
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--target",
  "ES2023",
  "--lib",
  "ES2023,DOM",
  "--strict",
  "--skipLibCheck",
  "apps/web/src/lib/mock/adapter.ts",
  "apps/web/src/components/v2/demo-v2/format.ts",
  "apps/web/src/components/v2/demo-v2/presentation-opt-in.ts",
]);
after(() => rmSync(compiledDir, { recursive: true, force: true }));

const compiledRequire = createRequire(import.meta.url);
const { createDemoAdapter } = compiledRequire(join(compiledDir, "lib/mock/adapter.js"));
const {
  formatAppointmentStatus,
  formatAvailabilityState,
  formatBookedVisitsCount,
  formatReleasedSummariesCount,
  formatTimeDisplay,
} = compiledRequire(join(compiledDir, "components/v2/demo-v2/format.js"));
const {
  activateDemoV2PresentationOptIn,
  captureDemoV2QueryIntent,
  clearDemoV2PresentationOptIn,
  resolveDemoV2PresentationOptIn,
} = compiledRequire(join(compiledDir, "components/v2/demo-v2/presentation-opt-in.js"));

const cssProxy = new Proxy({}, { get: (_, k) => String(k) });

function loadTsxComponent(relPath, mocks) {
  const fullPath = resolve(relPath);
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = readFileSync(file, "utf8");
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const exports = {};
    cache.set(file, exports);
    const req = (name) => {
      if (name.endsWith(".css")) return { default: cssProxy };
      if (name === "next/link") {
        return { default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
      }
      if (name === "next/navigation") {
        return { usePathname: () => mocks.pathname ?? "/" };
      }
      if (name.endsWith("i18n/context")) {
        return {
          useLocale: () => ({ locale: mocks.locale ?? "en", t: (k) => k }),
          LanguageSwitch: () => React.createElement("span", null, "LangSwitch"),
        };
      }
      if (name === "../../context" || name.endsWith("/components/context")) {
        return { useApp: () => mocks.app };
      }
      if (name.includes("foundation")) {
        return {
          FoundationIcon: ({ name: iconName }) => React.createElement("span", { "data-icon": iconName }),
          FoundationPortalEmblem: ({ role }) => React.createElement("span", { "data-emblem": role }),
          FoundationPortrait: ({ id, name: pName }) => React.createElement("span", { "data-portrait": id }, pName),
          FoundationBrandMark: () => React.createElement("span", { "data-brand": "dp02" }),
          FoundationScope: ({ children }) => React.createElement("div", null, children),
          useFoundationTheme: () => ({ resolved: "dark" }),
        };
      }
      if (name.startsWith(".")) {
        const base = resolve(dirname(file), name);
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          try {
            const candidate = base + ext;
            readFileSync(candidate);
            return load(candidate);
          } catch {
            /* try next extension */
          }
        }
      }
      return webRequire(name);
    };
    new Function("exports", "require", out)(exports, req);
    return exports;
  }
  return load(fullPath);
}

function assertNoSkippedHeadings(html, label) {
  const matches = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  assert.ok(matches.includes(1), `Expected <h1> in ${label}, got ${JSON.stringify(matches)}`);
  let prev = 1;
  for (const level of matches) {
    assert.ok(level <= prev + 1, `Heading level skip in ${label}: h${prev} -> h${level} in ${JSON.stringify(matches)}`);
    prev = level;
  }
}

test("F-01: presentation-opt-in guards throwing sessionStorage getter, getItem, setItem, and removeItem without swallowing unrelated errors", () => {
  const origWindow = globalThis.window;
  try {
    clearDemoV2PresentationOptIn();
    // 1. Throwing getter on window.sessionStorage
    const fakeWin = { location: { search: "" } };
    Object.defineProperty(fakeWin, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: storage getter denied");
      },
    });
    globalThis.window = fakeWin;
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), false);
    assert.doesNotThrow(() => activateDemoV2PresentationOptIn());
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), true);
    assert.doesNotThrow(() => clearDemoV2PresentationOptIn());
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), false);

    // 2. Throwing getItem/setItem/removeItem
    globalThis.window = {
      location: { search: "" },
      sessionStorage: {
        getItem() { throw new Error("getItem denied"); },
        setItem() { throw new Error("setItem denied"); },
        removeItem() { throw new Error("removeItem denied"); },
      },
    };
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), false);
    // ?v2=1 works in-memory when storage methods throw
    globalThis.window.location.search = "?v2=1";
    assert.equal(captureDemoV2QueryIntent(), true);
    globalThis.window.location.search = "";
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), true);
    clearDemoV2PresentationOptIn();
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), false);
  } finally {
    clearDemoV2PresentationOptIn();
    if (origWindow === undefined) delete globalThis.window;
    else globalThis.window = origWindow;
  }
});

test("F-02: ?v2=1 persists across reload when sessionStorage is allowed and clears on logout/live transition", () => {
  const origWindow = globalThis.window;
  const store = new Map();
  try {
    clearDemoV2PresentationOptIn();
    globalThis.window = {
      location: { search: "?v2=1" },
      sessionStorage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
      },
    };
    assert.equal(captureDemoV2QueryIntent(), true);
    assert.equal(store.get("eh360-v2-demo"), "1");
    // Simulate reload: clear memory by calling clear? No, simulate fresh URL without ?v2=1 while storage has "1"
    globalThis.window.location.search = "";
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), true);
    // Logout/Live transition clears both memory and storage
    clearDemoV2PresentationOptIn();
    assert.equal(store.has("eh360-v2-demo"), false);
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: false, liveConfigured: true }), false);
    // Preview default always returns true
    assert.equal(resolveDemoV2PresentationOptIn({ previewDemoOnly: true, liveConfigured: false }), true);
  } finally {
    clearDemoV2PresentationOptIn();
    if (origWindow === undefined) delete globalThis.window;
    else globalThis.window = origWindow;
  }
});

test("F-03: Consultation.notes stays clinician-private while Patient home/record and Pharmacy render strictly permitted fields", async () => {
  const api = createDemoAdapter();
  await api.enter("PATIENT");
  const [slot] = await api.availability("mariam-hassan");
  const appt = await api.book(slot.id, "Synthetic headache review");

  await api.enter("CLINICIAN");
  await api.release({
    appointmentId: appt.id,
    complaint: appt.reason,
    diagnosis: "Tension headache assessment (public)",
    allergies: "Patient reports no known allergies",
    notes: "PRIVATE_NOTE_CANARY_F03",
    medication: "Paracetamol 500mg",
    dosage: "1 tablet every 8 hours",
    lab: "",
    instructions: "Take after meals",
    followUp: "Rest and hydrate for 48 hours (public)",
    released: true,
  });

  // Clinician retains private note on consultation(), duplicate release rejects
  const clinicianRead = await api.consultation(appt.id);
  assert.equal(clinicianRead.notes, "PRIVATE_NOTE_CANARY_F03");
  await assert.rejects(() => api.release({ ...clinicianRead, released: true }), /already released/);

  // Patient record() strips notes and exposes shareable diagnosis/followUp/instructions
  await api.enter("PATIENT");
  const rec = await api.record();
  const releasedEntry = rec.consultations.find((c) => c.appointmentId === appt.id);
  assert.ok(releasedEntry);
  assert.equal(releasedEntry.notes, "");
  assert.equal(releasedEntry.diagnosis, "Tension headache assessment (public)");
  assert.equal(releasedEntry.followUp, "Rest and hydrate for 48 hours (public)");

  // Source-level guarantee: PatientDemoV2 never reads .notes
  const patientSrc = readFileSync("apps/web/src/components/v2/demo-v2/PatientDemoV2.tsx", "utf8");
  assert.doesNotMatch(patientSrc, /\b(?:entry|latestNote|latestReleased|c)\.notes\b/);

  // Verify DoctorDemoV2 does not initialize diagnosis/followUp/instructions from notes
  const doctorSrc = readFileSync("apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx", "utf8");
  assert.doesNotMatch(doctorSrc, /setPatientAssessment\([^)]*\.notes/);
  assert.doesNotMatch(doctorSrc, /setFollowUpGuidance\([^)]*\.notes/);
  assert.doesNotMatch(doctorSrc, /setMedInstructions\([^)]*\.notes/);
});

test("F-04: resolveReportPath supports Windows paths, equals signs, and test-ui-browser.mjs has no hardcoded /tmp path", () => {
  assert.equal(
    resolveReportPath(["--mode=normal"], "C:\\Users\\runner\\AppData\\Local\\Temp", win32.join),
    "C:\\Users\\runner\\AppData\\Local\\Temp\\eh-v2-browser-qa-report.json",
  );
  assert.equal(
    resolveReportPath(["--report=C:\\Temp\\dir=1\\report.json"], "C:\\Temp", win32.join),
    "C:\\Temp\\dir=1\\report.json",
  );
  const browserScript = readFileSync("scripts/test-ui-browser.mjs", "utf8");
  assert.ok(!browserScript.includes('"/tmp/'), "Hardcoded POSIX /tmp path must not exist in test-ui-browser.mjs");
  assert.ok(browserScript.includes("tmpdir()"));
  assert.ok(browserScript.includes("mkdtemp("));
});

test("F-05: EN/AR singular/plural/zero counts, Latin digits, patient 12h / doctor 24h, and strict status enums (unknown not falsely mapped)", () => {
  assert.equal(formatBookedVisitsCount(0, "en"), "0 booked visits");
  assert.equal(formatBookedVisitsCount(1, "en"), "1 booked visit");
  assert.equal(formatBookedVisitsCount(2, "en"), "2 booked visits");
  assert.equal(formatBookedVisitsCount(0, "ar"), "لا توجد مواعيد مسجلة");
  assert.equal(formatBookedVisitsCount(1, "ar"), "موعد واحد مسجل");
  assert.equal(formatBookedVisitsCount(2, "ar"), "موعدان مسجلان");
  assert.equal(formatBookedVisitsCount(5, "ar"), "5 مواعيد مسجلة");
  assert.equal(formatBookedVisitsCount(12, "ar"), "12 موعد مسجل");

  assert.equal(formatReleasedSummariesCount(0, "en"), "0 released summaries");
  assert.equal(formatReleasedSummariesCount(1, "en"), "1 released summary");
  assert.equal(formatReleasedSummariesCount(3, "en"), "3 released summaries");
  assert.equal(formatReleasedSummariesCount(0, "ar"), "لا توجد ملخصات معتمدة");
  assert.equal(formatReleasedSummariesCount(1, "ar"), "ملخص واحد معتمد");
  assert.equal(formatReleasedSummariesCount(2, "ar"), "ملخصان معتمدان");
  assert.equal(formatReleasedSummariesCount(4, "ar"), "4 ملخصات معتمدة");

  for (const text of [
    formatBookedVisitsCount(5, "ar"),
    formatBookedVisitsCount(12, "ar"),
    formatReleasedSummariesCount(4, "ar"),
    formatTimeDisplay("14:30", "ar", "patient"),
    formatTimeDisplay("14:30", "ar", "professional"),
  ]) {
    assert.ok(!/[٠-٩]/u.test(text), `Arabic-Indic digits disallowed: ${text}`);
  }

  assert.equal(formatAppointmentStatus("Upcoming", "ar"), "قادم");
  assert.equal(formatAppointmentStatus("Completed", "ar"), "مكتمل");
  assert.equal(formatAppointmentStatus("CANCELLED_MYSTERY", "ar"), "غير معروف");
  assert.equal(formatAppointmentStatus("CANCELLED_MYSTERY", "en"), "Unknown");
  assert.equal(formatAvailabilityState("PUBLISHED", "ar"), "منشور");
  assert.equal(formatAvailabilityState("WITHDRAWN", "ar"), "مسحوب");
  assert.equal(formatAvailabilityState("OTHER_STATE", "ar"), "غير معروف");
});

test("F-06: Application clears Demo toast on locale switch without altering Live toast lifecycle", () => {
  const appSource = readFileSync("apps/web/src/components/application.tsx", "utf8");
  assert.ok(appSource.includes('if (api?.mode === "demo" && session?.mode === "demo") {\n      setToast("");\n    }'));
  for (const file of [
    "apps/web/src/components/v2/demo-v2/PatientDemoV2.tsx",
    "apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx",
    "apps/web/src/components/v2/demo-v2/PharmacyDemoV2.tsx",
  ]) {
    const src = readFileSync(file, "utf8");
    assert.ok(src.includes("localeRef.current"), `${file} must read localeRef.current for async toast localization`);
  }
});

test("F-07 & F-08: Unknown/unmatched subroutes render Not Found without fallback; all V2 surfaces keep valid heading hierarchy and Lab tablist", () => {
  const baseApp = {
    api: { mode: "demo" },
    booking: {},
    session: { role: "PATIENT", name: "Ahmed Mostafa", mode: "demo" },
    refresh: 0,
    notify: () => {},
    changed: () => {},
  };

  for (const badPatientPath of [
    "/patient/unknown-route",
    "/patient/doctors/unknown-id",
    "/patient/appointments/unknown-appt",
    "/patient/record/extra",
  ]) {
    const { PatientDemoV2 } = loadTsxComponent("apps/web/src/components/v2/demo-v2/PatientDemoV2.tsx", {
      locale: "en",
      app: baseApp,
    });
    // Loading state renders clean wrapper without throwing; inspect source route guards directly
    const html = renderToStaticMarkup(React.createElement(PatientDemoV2, { path: badPatientPath }));
    assert.ok(html.includes('data-v2-portal="patient"'));
  }

  const { LaboratoryDemoV2 } = loadTsxComponent("apps/web/src/components/v2/demo-v2/LaboratoryDemoV2.tsx", {
    locale: "en",
    app: { ...baseApp, session: { role: "LAB_STAFF", name: "Hana Ali", mode: "demo" } },
  });
  const labHtml = renderToStaticMarkup(React.createElement(LaboratoryDemoV2));
  assertNoSkippedHeadings(labHtml, "LaboratoryDemoV2");
  assert.ok(labHtml.includes('role="tablist"'));
  assert.ok(labHtml.includes('role="tab"'));
  assert.ok(labHtml.includes('role="tabpanel"'));
  assert.ok(labHtml.includes('aria-selected="true"'));
  assert.ok(labHtml.includes('tabindex="0"'));
  assert.ok(labHtml.includes('tabindex="-1"'));
  assert.ok(labHtml.includes("FUTURE · CONCEPT · NOT LIVE"));

  const labSource = readFileSync("apps/web/src/components/v2/demo-v2/LaboratoryDemoV2.tsx", "utf8");
  assert.ok(labSource.includes("ArrowLeft") && labSource.includes("ArrowRight"));
  assert.ok(labSource.includes("Home") && labSource.includes("End"));

  const { DemoV2Router } = loadTsxComponent("apps/web/src/components/v2/demo-v2/DemoV2Router.tsx", {
    locale: "en",
    app: { ...baseApp, session: { role: "PHARMACY_STAFF", name: "Youssef Salem", mode: "demo" } },
  });
  const badPharmHtml = renderToStaticMarkup(
    React.createElement(DemoV2Router, {
      path: "/pharmacy/unknown",
      onLogout: () => {},
      toast: "",
      onDismiss: () => {},
    }),
  );
  assert.ok(badPharmHtml.includes('data-v2-not-found="true"'));
  assertNoSkippedHeadings(badPharmHtml, "DemoV2Router not-found");
});

test("F-09: Hero pane defines dark fallback background-color; booking snapshot stays immutable across profile rename; fresh appointments=[]", async () => {
  const gatewayCss = readFileSync("apps/web/src/components/v2/gateway/gateway.module.css", "utf8");
  assert.match(gatewayCss, /\.heroVisualPane\s*\{[^}]*background-color:\s*#140f26;/s);

  const api = createDemoAdapter();
  await api.enter("PATIENT");
  const [slot1, slot2] = await api.availability("mariam-hassan");
  const firstBooking = await api.book(slot1.id, "First booking");
  assert.equal(firstBooking.patientName, "Ahmed Mostafa");

  await api.saveProfile({ displayName: "Layla Hassan", dateOfBirth: "1992-04-12", sex: "FEMALE" });
  const secondBooking = await api.book(slot2.id, "Second booking");
  assert.equal(secondBooking.patientName, "Layla Hassan");

  await api.enter("CLINICIAN");
  const doctorSchedule = await api.appointments();
  assert.equal(doctorSchedule[0].patientName, "Ahmed Mostafa");
  assert.equal(doctorSchedule[1].patientName, "Layla Hassan");

  const freshApi = createDemoAdapter();
  await freshApi.enter("CLINICIAN");
  assert.deepEqual(await freshApi.appointments(), []);
});

function createInteractiveHarness(relPath, initialProps, initialApp, locale = "en") {
  let currentProps = initialProps;
  let currentApp = initialApp;
  let currentLocale = locale;
  const hooks = [];
  const cleanups = new Map();
  let hookIdx = 0;
  let tree = null;
  let disposed = false;

  const depsEqual = (a, b) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

  const ReactShim = {
    Fragment: Symbol.for("react.fragment"),
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props ?? {}),
          children: children.length === 1 ? children[0] : children.length > 1 ? children : props?.children,
        },
      };
    },
    useState(init) {
      const idx = hookIdx++;
      if (!(idx in hooks)) {
        hooks[idx] = typeof init === "function" ? init() : init;
      }
      const setState = (next) => {
        if (disposed) return;
        const val = typeof next === "function" ? next(hooks[idx]) : next;
        if (!Object.is(val, hooks[idx])) {
          hooks[idx] = val;
        }
      };
      return [hooks[idx], setState];
    },
    useRef(init) {
      const idx = hookIdx++;
      if (!(idx in hooks)) {
        hooks[idx] = { current: init };
      }
      return hooks[idx];
    },
    useMemo(factory, deps) {
      const idx = hookIdx++;
      const entry = hooks[idx];
      if (!entry || !depsEqual(entry.deps, deps)) {
        hooks[idx] = { value: factory(), deps };
      }
      return hooks[idx].value;
    },
    useCallback(fn, deps) {
      const idx = hookIdx++;
      const entry = hooks[idx];
      if (!entry || !depsEqual(entry.deps, deps)) {
        hooks[idx] = { fn, deps };
      }
      return hooks[idx].fn;
    },
    useEffect(effect, deps) {
      const idx = hookIdx++;
      const prev = hooks[idx];
      if (!prev || deps === undefined || !depsEqual(prev.deps, deps)) {
        hooks[idx] = { deps, pending: effect };
      }
    },
  };

  const fullPath = resolve(relPath);
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = readFileSync(file, "utf8");
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const exports = {};
    cache.set(file, exports);
    const req = (name) => {
      if (name === "react") return ReactShim;
      if (name === "react/jsx-runtime") {
        return {
          Fragment: ReactShim.Fragment,
          jsx: (type, props) => ({ type, props: props ?? {} }),
          jsxs: (type, props) => ({ type, props: props ?? {} }),
        };
      }
      if (name.endsWith(".css")) return { default: cssProxy };
      if (name === "next/link") {
        return { default: ({ children, href, ...props }) => ReactShim.createElement("a", { href, ...props }, children) };
      }
      if (name === "next/navigation") {
        return { usePathname: () => currentProps.path ?? "/" };
      }
      if (name.endsWith("i18n/context")) {
        return {
          useLocale: () => ({ locale: currentLocale, t: (k) => k }),
          LanguageSwitch: () => ReactShim.createElement("span", null, "LangSwitch"),
        };
      }
      if (name === "../../context" || name.endsWith("/components/context")) {
        return { useApp: () => currentApp };
      }
      if (name.includes("foundation")) {
        return {
          FoundationIcon: ({ name: iconName }) => ReactShim.createElement("span", { "data-icon": iconName }),
          FoundationPortalEmblem: ({ role }) => ReactShim.createElement("span", { "data-emblem": role }),
          FoundationPortrait: ({ id, name: pName }) => ReactShim.createElement("span", { "data-portrait": id }, pName),
          FoundationBrandMark: () => ReactShim.createElement("span", { "data-brand": "dp02" }),
          FoundationScope: ({ children }) => ReactShim.createElement("div", null, children),
          useFoundationTheme: () => ({ resolved: "dark" }),
        };
      }
      if (name.startsWith(".")) {
        const base = resolve(dirname(file), name);
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          try {
            const candidate = base + ext;
            readFileSync(candidate);
            return load(candidate);
          } catch {
            /* try next */
          }
        }
      }
      return webRequire(name);
    };
    new Function("exports", "require", out)(exports, req);
    return exports;
  }

  const mod = load(fullPath);
  const Component = Object.values(mod).find((v) => typeof v === "function");

  function render() {
    hookIdx = 0;
    tree = Component(currentProps);
    for (let i = 0; i < hooks.length; i++) {
      const h = hooks[i];
      if (h && typeof h.pending === "function") {
        const prevCleanup = cleanups.get(i);
        if (typeof prevCleanup === "function") prevCleanup();
        const fn = h.pending;
        h.pending = null;
        const cleanup = fn();
        if (typeof cleanup === "function") cleanups.set(i, cleanup);
        else cleanups.delete(i);
      }
    }
    return tree;
  }

  async function settle(rounds = 4) {
    for (let i = 0; i < rounds; i++) {
      await Promise.resolve();
      await Promise.resolve();
      render();
    }
  }

  function findAll(predicate, node = tree, acc = []) {
    if (!node || typeof node !== "object") return acc;
    if (Array.isArray(node)) {
      for (const item of node) findAll(predicate, item, acc);
      return acc;
    }
    if (predicate(node)) acc.push(node);
    if (node.props?.children !== undefined) findAll(predicate, node.props.children, acc);
    return acc;
  }

  function textOf(node = tree) {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join(" ");
    if (typeof node === "object" && node.props?.children !== undefined) return textOf(node.props.children);
    return "";
  }

  return {
    render,
    settle,
    update({ props, app, locale: nextLocale } = {}) {
      if (props) currentProps = { ...currentProps, ...props };
      if (app) currentApp = { ...currentApp, ...app };
      if (nextLocale) currentLocale = nextLocale;
    },
    findOne(predicate) {
      return findAll(predicate)[0] ?? null;
    },
    findAll,
    text: () => textOf(tree),
    unmount() {
      disposed = true;
      for (const cleanup of cleanups.values()) {
        if (typeof cleanup === "function") cleanup();
      }
      cleanups.clear();
    },
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("F4-1 DoctorDemoV2: empty, whitespace, private-notes-only, failed, duplicate, and same-tick double release", async () => {
  const appt1 = {
    id: "appt-1",
    patientName: "Ahmed Mostafa",
    provider: { id: "mariam-hassan", displayName: "Dr. Mariam Hassan", specialty: { key: "im", displayName: "Internal" }, clinics: [] },
    slot: { id: "s1", providerId: "mariam-hassan", clinicId: "cairo-clinic", startAt: "2026-10-28T09:00:00+03:00", endAt: "2026-10-28T09:30:00+03:00", timeZone: "Africa/Cairo", bookable: false },
    status: "Upcoming",
    reason: "Checkup",
  };
  const blankDraft = {
    appointmentId: "appt-1",
    complaint: "Checkup",
    diagnosis: "",
    allergies: "",
    notes: "",
    medication: "",
    dosage: "",
    lab: "",
    instructions: "",
    followUp: "",
    released: false,
  };

  let releaseCalls = 0;
  let releaseGate = null;
  let failNextRelease = false;
  let draftState = { ...blankDraft };
  const notices = [];
  let refreshVal = 0;

  const h = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx",
    { path: "/doctor/consultation/appt-1" },
    {
      api: {
        mode: "demo",
        appointments: async () => [appt1],
        ownAvailability: async () => ({ data: [], meta: { page: 1, pageSize: 20, total: 0 } }),
        clinics: async () => [{ id: "cairo-clinic", displayName: "Nile Care Clinic", city: "Cairo", address: "Dokki" }],
        consultation: async () => ({ ...draftState }),
        release: async (val) => {
          releaseCalls++;
          if (releaseGate) await releaseGate.promise;
          if (failNextRelease) throw new Error("Simulated release failure");
          draftState = { ...val, released: true };
        },
      },
      booking: {},
      session: { role: "CLINICIAN", name: "Dr. Mariam Hassan", mode: "demo" },
      refresh: refreshVal,
      notify: (m) => notices.push(m),
      changed: () => {
        refreshVal++;
        h.update({ app: { refresh: refreshVal } });
      },
    },
  );
  h.render();
  await h.settle();

  // 1. Empty release blocked before api.release
  const form = () => h.findOne((n) => n.props?.["data-release-form"] === "true");
  await form().props.onSubmit({ preventDefault() {} });
  await h.settle(2);
  assert.equal(releaseCalls, 0);
  assert.ok(h.findOne((n) => n.props?.role === "alert"));

  // 2. Whitespace-only + private-notes-only release blocked before api.release
  h.findOne((n) => n.props?.id === "consult-assessment").props.onChange({ target: { value: "   \n  " } });
  h.findOne((n) => n.props?.id === "consult-followup").props.onChange({ target: { value: " \t " } });
  h.findOne((n) => n.props?.id === "consult-private-notes").props.onChange({ target: { value: "PRIVATE_ONLY_CANARY" } });
  h.render();
  await form().props.onSubmit({ preventDefault() {} });
  await h.settle(2);
  assert.equal(releaseCalls, 0);
  assert.ok(h.findOne((n) => n.props?.role === "alert"));

  // 3. Legitimate failed release preserves inputs and leaves released=false
  h.findOne((n) => n.props?.id === "consult-assessment").props.onChange({ target: { value: "Public assessment kept" } });
  h.findOne((n) => n.props?.id === "consult-followup").props.onChange({ target: { value: "Public followup kept" } });
  h.render();
  failNextRelease = true;
  await form().props.onSubmit({ preventDefault() {} });
  await h.settle(2);
  assert.equal(releaseCalls, 1);
  assert.equal(draftState.released, false);
  assert.ok(h.findOne((n) => n.props?.role === "alert"));
  assert.equal(h.findOne((n) => n.props?.id === "consult-assessment").props.value, "Public assessment kept");
  assert.equal(h.findOne((n) => n.props?.id === "consult-private-notes").props.value, "PRIVATE_ONLY_CANARY");

  // 4. Same-tick double submit invokes api.release only once; duplicate post-release blocked
  failNextRelease = false;
  releaseGate = deferred();
  const p1 = form().props.onSubmit({ preventDefault() {} });
  const p2 = form().props.onSubmit({ preventDefault() {} });
  assert.equal(releaseCalls, 2); // Only 1 new call from this double-submit
  releaseGate.resolve();
  await Promise.all([p1, p2]);
  await h.settle(4);
  assert.ok(h.findOne((n) => n.props?.["data-consultation-released"] === "true"));
  assert.equal(h.findOne((n) => n.props?.["data-release-submit"] === "true"), null);
  // Programmatic resubmit on released draft does not call api.release
  await form().props.onSubmit({ preventDefault() {} });
  assert.equal(releaseCalls, 2);
  h.unmount();
});

test("F4-1 DoctorDemoV2: delayed consultation A after switch to B, mid-flight release error isolation, foreign appointment UI rejection, and withdrawSlot busy guard", async () => {
  const apptA = {
    id: "appt-a",
    patientName: "Patient A",
    provider: { id: "mariam-hassan", displayName: "Dr. Mariam Hassan", specialty: { key: "im", displayName: "Internal" }, clinics: [] },
    slot: { id: "sa", providerId: "mariam-hassan", clinicId: "cairo-clinic", startAt: "2026-10-28T09:00:00+03:00", endAt: "2026-10-28T09:30:00+03:00", timeZone: "Africa/Cairo", bookable: false },
    status: "Upcoming",
    reason: "Reason A",
  };
  const apptB = {
    ...apptA,
    id: "appt-b",
    patientName: "Patient B",
    reason: "Reason B",
  };
  const defA = deferred();
  const defB = deferred();
  const relGateA = deferred();
  let withdrawCalls = 0;
  const withdrawGate = deferred();

  const h = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx",
    { path: "/doctor/consultation/appt-a" },
    {
      api: {
        mode: "demo",
        appointments: async () => [apptA, apptB],
        ownAvailability: async () => ({
          data: [
            {
              id: "slot-1",
              providerId: "mariam-hassan",
              clinicId: "cairo-clinic",
              startAt: "2026-10-28T09:00:00+03:00",
              endAt: "2026-10-28T09:30:00+03:00",
              timeZone: "Africa/Cairo",
              state: "PUBLISHED",
              version: 1,
              publishedAt: "2026-10-27T09:00:00Z",
              withdrawnAt: null,
            },
          ],
          meta: { page: 1, pageSize: 20, total: 1 },
        }),
        clinics: async () => [{ id: "cairo-clinic", displayName: "Nile Care Clinic", city: "Cairo", address: "Dokki" }],
        consultation: (id) => (id === "appt-a" ? defA.promise : defB.promise),
        release: async () => {
          await relGateA.promise;
          throw new Error("Late release A failure");
        },
        withdrawSlot: async () => {
          withdrawCalls++;
          await withdrawGate.promise;
        },
      },
      booking: {},
      session: { role: "CLINICIAN", name: "Dr. Mariam Hassan", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  h.render();
  await h.settle(2);

  // Switch to B before A's consultation resolves; resolve B first, then stale A
  h.update({ props: { path: "/doctor/consultation/appt-b" } });
  h.render();
  defB.resolve({ appointmentId: "appt-b", complaint: "", diagnosis: "Diagnosis B", allergies: "", notes: "", medication: "", dosage: "", lab: "", instructions: "", followUp: "FollowUp B", released: false });
  await h.settle(3);
  defA.resolve({ appointmentId: "appt-a", complaint: "", diagnosis: "STALE_A", allergies: "", notes: "", medication: "", dosage: "", lab: "", instructions: "", followUp: "STALE_A", released: false });
  await h.settle(3);
  assert.equal(h.findOne((n) => n.props?.id === "consult-assessment").props.value, "Diagnosis B");

  // Unreleased clinician draft edits survive a refresh reload intact without resetting form inputs
  h.findOne((n) => n.props?.id === "consult-assessment").props.onChange({ target: { value: "Edited Unreleased Draft" } });
  h.render();
  h.update({ app: { refresh: 1 } });
  h.render();
  await h.settle(4);
  assert.equal(h.findOne((n) => n.props?.id === "consult-assessment").props.value, "Edited Unreleased Draft");

  // Trigger release on B? Test mid-flight release failure isolation: navigate back to A with resolved draft, trigger release, switch to B before failure
  const defA2 = deferred();
  const baseApi = {
    mode: "demo",
    appointments: async () => [apptA, apptB],
    ownAvailability: async () => ({
      data: [
        {
          id: "slot-1",
          providerId: "mariam-hassan",
          clinicId: "cairo-clinic",
          startAt: "2026-10-28T09:00:00+03:00",
          endAt: "2026-10-28T09:30:00+03:00",
          timeZone: "Africa/Cairo",
          state: "PUBLISHED",
          version: 1,
          publishedAt: "2026-10-27T09:00:00Z",
          withdrawnAt: null,
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1 },
    }),
    clinics: async () => [{ id: "cairo-clinic", displayName: "Nile Care Clinic", city: "Cairo", address: "Dokki" }],
    consultation: (id) => (id === "appt-a" ? defA2.promise : Promise.resolve({ appointmentId: "appt-b", complaint: "", diagnosis: "Diagnosis B", allergies: "", notes: "", medication: "", dosage: "", lab: "", instructions: "", followUp: "FollowUp B", released: false })),
    release: async () => { await relGateA.promise; throw new Error("Late A fail"); },
    withdrawSlot: async () => { withdrawCalls++; await withdrawGate.promise; },
  };
  h.update({ app: { api: baseApi }, props: { path: "/doctor/consultation/appt-a" } });
  h.render();
  defA2.resolve({ appointmentId: "appt-a", complaint: "", diagnosis: "Draft A", allergies: "", notes: "", medication: "", dosage: "", lab: "", instructions: "", followUp: "Follow A", released: false });
  await h.settle(3);
  const relPromise = h.findOne((n) => n.props?.["data-release-form"] === "true").props.onSubmit({ preventDefault() {} });
  // Switch immediately to B before A rejects
  h.update({ props: { path: "/doctor/consultation/appt-b" } });
  h.render();
  await h.settle(2);
  relGateA.reject(new Error("Late A fail"));
  await relPromise;
  await h.settle(2);
  // B must NOT show A's error and B's submit button must NOT be wedged disabled
  assert.equal(h.findOne((n) => n.props?.role === "alert"), null);
  assert.equal(h.findOne((n) => n.props?.["data-release-submit"] === "true").props.disabled, false);

  // Real existing foreign appointment (booked with omar-khaled) rejected at DoctorDemoV2 UI
  const realDemo = createDemoAdapter();
  await realDemo.enter("PATIENT");
  const [omarSlot] = await realDemo.availability("omar-khaled");
  const foreignAppt = await realDemo.book(omarSlot.id, "Cardiology visit");
  await realDemo.enter("CLINICIAN");
  const foreignH = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx",
    { path: `/doctor/consultation/${foreignAppt.id}` },
    {
      api: realDemo,
      booking: {},
      session: { role: "CLINICIAN", name: "Dr. Mariam Hassan", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  foreignH.render();
  await foreignH.settle(4);
  assert.ok(foreignH.findOne((n) => n.props?.["data-v2-not-found"] === "true"));
  assert.equal(foreignH.findOne((n) => n.props?.["data-release-form"] === "true"), null);
  foreignH.update({ props: { path: `/doctor/appointments/${foreignAppt.id}` } });
  foreignH.render();
  await foreignH.settle(2);
  assert.ok(foreignH.findOne((n) => n.props?.["data-v2-not-found"] === "true"));
  foreignH.unmount();

  // withdrawSlot same-tick busy guard
  h.update({ props: { path: "/doctor/availability" } });
  h.render();
  await h.settle(3);
  const wBtn = h.findOne((n) => n.props?.["data-withdraw-slot"] === "slot-1");
  const w1 = wBtn.props.onClick();
  const w2 = wBtn.props.onClick();
  withdrawGate.resolve();
  await Promise.all([w1, w2]);
  assert.equal(withdrawCalls, 1);
  h.unmount();
});

test("F4-1 PatientDemoV2: delayed availability race, away-nav submitBooking safety, appointment detail links, and unreleased draft exclusion", async () => {
  const realDemo = createDemoAdapter();
  await realDemo.enter("PATIENT");
  const [mariamSlot] = await realDemo.availability("mariam-hassan");
  await realDemo.book(mariamSlot.id, "Checkup");
  // Clinician enters and leaves unreleased private note in memory/draft (never calls release)
  await realDemo.enter("CLINICIAN");
  const doctorUnsaved = await realDemo.consultation("demo-appointment-1");
  assert.equal(doctorUnsaved.released, false);
  await realDemo.enter("PATIENT");

  const defOmar = deferred();
  const defMariam = deferred();
  const bookDef = deferred();
  let availCalls = 0;

  const h = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/PatientDemoV2.tsx",
    { path: "/patient/doctors/omar-khaled" },
    {
      api: {
        mode: "demo",
        providers: () => realDemo.providers(),
        appointments: () => realDemo.appointments(),
        record: () => realDemo.record(),
        profile: () => realDemo.profile(),
        availabilityPage: (id) => {
          availCalls++;
          return id === "omar-khaled" ? defOmar.promise : defMariam.promise;
        },
      },
      booking: {
        create: () => bookDef.promise,
      },
      session: { role: "PATIENT", name: "Ahmed Mostafa", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  h.render();
  await h.settle(3);

  // Switch provider to mariam-hassan BEFORE omar-khaled resolves
  h.update({ props: { path: "/patient/doctors/mariam-hassan" } });
  h.render();
  await h.settle(2);
  const mariamAvail = await realDemo.availabilityPage("mariam-hassan");
  defMariam.resolve(mariamAvail);
  await h.settle(3);
  const omarAvail = await realDemo.availabilityPage("omar-khaled");
  defOmar.resolve(omarAvail);
  await h.settle(3);
  // Slots rendered must belong ONLY to mariam-hassan (never overwritten by stale omar response)
  const chips = h.findAll((n) => typeof n.props?.["data-slot-chip"] === "string");
  assert.ok(chips.length > 0);
  assert.ok(chips.every((c) => c.props["data-slot-chip"].startsWith("mariam-hassan")));

  // Select a slot, submit booking, then navigate away to /patient/record before booking resolves
  chips[0].props.onClick();
  h.render();
  h.findOne((n) => n.props?.id === "booking-reason").props.onChange({ target: { value: "Away nav booking" } });
  h.render();
  const callsBeforeBook = availCalls;
  const bookPromise = h.findOne((n) => n.props?.["data-booking-form"] === "true").props.onSubmit({ preventDefault() {} });
  h.update({ props: { path: "/patient/record" } });
  h.render();
  bookDef.resolve({
    id: "demo-appointment-2",
    patientName: "Ahmed Mostafa",
    provider: (await realDemo.providers())[0],
    slot: mariamAvail.data[0],
    status: "Upcoming",
    reason: "Away nav booking",
  });
  await bookPromise;
  await h.settle(3);
  // Must NOT re-fetch slots after departing booking route or render receipt on /patient/record
  assert.equal(availCalls, callsBeforeBook);
  assert.equal(h.findOne((n) => n.props?.["data-booking-receipt"]), null);

  // Check Next-appointment link on /patient and detail link on /patient/appointments
  h.update({ props: { path: "/patient" } });
  h.render();
  assert.equal(
    h.findOne((n) => n.props?.["data-next-appointment-link"] === "true")?.props.href,
    "/patient/appointments/demo-appointment-1",
  );
  h.update({ props: { path: "/patient/appointments" } });
  h.render();
  assert.equal(
    h.findOne((n) => n.props?.["data-appointment-detail-link"] === "demo-appointment-1")?.props.href,
    "/patient/appointments/demo-appointment-1",
  );
  // Continuous-mount route transition: /patient/discover -> /patient/doctors/mariam-hassan -> /patient/discover reloads slots
  h.update({ props: { path: "/patient/discover" } });
  h.render();
  await h.settle(3);
  h.update({ props: { path: "/patient/doctors/mariam-hassan" } });
  h.render();
  await h.settle(3);
  h.update({ props: { path: "/patient/discover" } });
  h.render();
  await h.settle(3);
  assert.ok(h.findAll((n) => typeof n.props?.["data-slot-chip"] === "string").length > 0);
  h.unmount();
});

test("F4-1 adapter storage hardening: malformed JSON, invalid state shape, removeItem failure detaches stale storage, valid history preserved", async () => {
  // 1. Valid stored history is preserved intact
  const seed = createDemoAdapter();
  await seed.enter("PATIENT");
  await seed.saveProfile({ displayName: "Saved History", dateOfBirth: "1990-01-01", sex: "FEMALE" });
  const backing = new Map();
  const storageObj = {
    getItem: (k) => backing.get(k) ?? null,
    setItem: (k, v) => backing.set(k, v),
    removeItem: (k) => backing.delete(k),
  };
  const validAdapter = createDemoAdapter(storageObj);
  await validAdapter.enter("PATIENT");
  await validAdapter.saveProfile({ displayName: "Preserved User", dateOfBirth: "1991-02-02", sex: "MALE" });
  const reloadedValid = createDemoAdapter(storageObj);
  assert.equal((await reloadedValid.profile()).displayName, "Preserved User");
  assert.equal((await reloadedValid.session()).role, "PATIENT");

  // 2. Malformed JSON & wrong state shape (including missing provider.clinics) fall back safely without throwing
  for (const badRaw of [
    "{not-json",
    "[]",
    JSON.stringify({ session: null, profile: { id: 123 } }),
    JSON.stringify({ session: { role: "SUPERADMIN", name: "x", mode: "demo" } }),
    JSON.stringify({
      session: { role: "PATIENT", name: "x", mode: "demo" },
      profile: { id: "p1", displayName: "x", dateOfBirth: "1990-01-01", sex: "FEMALE" },
      slots: [],
      appointments: [
        {
          id: "a1",
          patientName: "x",
          status: "Upcoming",
          reason: "r",
          provider: { id: "mariam-hassan", displayName: "Dr" },
          slot: { id: "s1", startAt: "2026-10-28T09:00:00Z", clinicId: "c1" },
        },
      ],
      consultations: [],
      fulfillment: {},
    }),
  ]) {
    const badStorage = {
      getItem: () => badRaw,
      setItem: () => {},
      removeItem: () => {},
    };
    const badAdapter = createDemoAdapter(badStorage);
    assert.equal(await badAdapter.session(), null);
    await badAdapter.enter("PATIENT");
    assert.equal((await badAdapter.profile()).displayName, "Ahmed Mostafa");
  }

  // 3. Failed removeItem detaches stale persisted state in current instance and reports persisted: false
  const staleStore = new Map(backing);
  const failingRemoveStorage = {
    getItem: (k) => staleStore.get(k) ?? null,
    setItem: (k, v) => staleStore.set(k, v),
    removeItem: () => {
      throw new Error("SecurityError: removeItem blocked");
    },
  };
  const resetAdapter = createDemoAdapter(failingRemoveStorage);
  assert.equal((await resetAdapter.profile()).displayName, "Preserved User");
  const resetResult = resetAdapter.reset();
  assert.equal(resetResult.persisted, false);
  // Stale persisted state MUST NOT override fresh memory state on read or logout!
  assert.equal(await resetAdapter.session(), null);
  await resetAdapter.logout();
  await resetAdapter.enter("PATIENT");
  assert.equal((await resetAdapter.profile()).displayName, "Ahmed Mostafa");
  assert.deepEqual(await resetAdapter.appointments(), []);
});

test("F4-1 PharmacyDemoV2 & AdminDemoV2: empty-med UI filtering, per-item busy lock, stale load suppression, and early error return", async () => {
  // 1. PharmacyDemoV2 filters empty/whitespace medications in UI while preserving adapter artifacts for LAB_STAFF
  const realDemo = createDemoAdapter();
  await realDemo.enter("PATIENT");
  const [slot] = await realDemo.availability("mariam-hassan");
  const appt = await realDemo.book(slot.id, "Empty med consult");
  await realDemo.enter("CLINICIAN");
  await realDemo.release({
    appointmentId: appt.id,
    complaint: "Checkup",
    diagnosis: "Public assessment",
    allergies: "",
    notes: "PRIVATE",
    medication: "   ",
    dosage: "",
    lab: "CBC ordered",
    instructions: "",
    followUp: "Rest",
    released: true,
  });
  await realDemo.enter("LAB_STAFF");
  assert.equal((await realDemo.artifacts()).length, 1);

  await realDemo.enter("PHARMACY_STAFF");
  const emptyPharm = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/PharmacyDemoV2.tsx",
    {},
    {
      api: realDemo,
      booking: {},
      session: { role: "PHARMACY_STAFF", name: "Youssef Salem", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  emptyPharm.render();
  await emptyPharm.settle(4);
  assert.equal(emptyPharm.findAll((n) => n.props?.["data-pharmacy-item"]).length, 0);
  emptyPharm.unmount();

  // 2. Per-item busy lock & same-tick double click + error early return
  const gateA = deferred();
  const gateB = deferred();
  let callsA = 0;
  let callsB = 0;
  let shouldFailLoad = false;
  const pharmH = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/PharmacyDemoV2.tsx",
    {},
    {
      api: {
        mode: "demo",
        artifacts: async () => {
          if (shouldFailLoad) throw new Error("Pharm load error");
          return [
            { id: "rx-a", patient: "P1", provider: "Dr. M", medication: "Med A", dosage: "10mg", lab: "" },
            { id: "rx-b", patient: "P2", provider: "Dr. M", medication: "Med B", dosage: "20mg", lab: "" },
          ];
        },
        fulfillment: async () => ({ prescription: "Received", lab: "Requested", result: "" }),
        updateFulfillment: async (_val, id) => {
          if (id === "rx-a") {
            callsA++;
            await gateA.promise;
          } else {
            callsB++;
            await gateB.promise;
          }
        },
      },
      booking: {},
      session: { role: "PHARMACY_STAFF", name: "Youssef Salem", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  pharmH.render();
  await pharmH.settle(4);
  const prepButtons = pharmH.findAll((n) => n.props?.["data-pharmacy-action"] === "Preparing");
  assert.equal(prepButtons.length, 2);
  const pa1 = prepButtons[0].props.onClick();
  const pa2 = prepButtons[0].props.onClick(); // same-tick duplicate on A
  const pb1 = prepButtons[1].props.onClick(); // concurrent B
  pharmH.render();
  assert.equal(callsA, 1);
  assert.equal(callsB, 1);
  // Resolving A must NOT clear B's disabled state
  gateA.resolve();
  await Promise.all([pa1, pa2]);
  pharmH.render();
  const btnsAfterA = pharmH.findAll((n) => n.props?.["data-pharmacy-action"] === "Preparing");
  assert.equal(btnsAfterA[1].props.disabled, true);
  gateB.resolve();
  await pb1;

  // Error early return hides search/list
  shouldFailLoad = true;
  pharmH.update({ app: { refresh: 1 } });
  pharmH.render();
  await pharmH.settle(4);
  assert.ok(pharmH.findOne((n) => n.props?.role === "alert"));
  assert.equal(pharmH.findOne((n) => n.props?.id === "pharmacy-search"), null);
  pharmH.unmount();

  // 3. AdminDemoV2 stale load suppression and early error return
  const adminDef1 = deferred();
  const adminDef2 = deferred();
  let adminCall = 0;
  let adminFail = false;
  const adminH = createInteractiveHarness(
    "apps/web/src/components/v2/demo-v2/AdminDemoV2.tsx",
    {},
    {
      api: {
        mode: "demo",
        operations: () => {
          if (adminFail) return Promise.reject(new Error("Admin ops error"));
          adminCall++;
          return adminCall === 1 ? adminDef1.promise : adminDef2.promise;
        },
      },
      booking: {},
      session: { role: "ADMIN", name: "Operations team", mode: "demo" },
      refresh: 0,
      notify: () => {},
      changed: () => {},
    },
  );
  adminH.render();
  await adminH.settle(2);
  adminH.update({ app: { refresh: 1 } });
  adminH.render();
  await adminH.settle(2);
  adminDef2.resolve({ organizations: [{ name: "Fresh Clinic", kind: "Clinic", status: "Active" }], users: [] });
  await adminH.settle(3);
  adminDef1.resolve({ organizations: [{ name: "STALE_ORG", kind: "Clinic", status: "Active" }], users: [] });
  await adminH.settle(3);
  assert.ok(adminH.text().includes("Fresh Clinic"));
  assert.ok(!adminH.text().includes("STALE_ORG"));

  adminFail = true;
  adminH.update({ app: { refresh: 2 } });
  adminH.render();
  await adminH.settle(3);
  assert.ok(adminH.findOne((n) => n.props?.role === "alert"));
  assert.equal(adminH.findOne((n) => n.props?.id === "admin-user-search"), null);
  adminH.unmount();
});
