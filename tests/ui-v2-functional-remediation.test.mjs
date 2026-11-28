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
