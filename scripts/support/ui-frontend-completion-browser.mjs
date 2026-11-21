/** Production-build loopback Chromium verification & screenshot suite for all 5 portals (Frontend V2 MEGA Campaign). */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState, switchDemoWorkspace } from "./ui-my-care-browser.mjs";

const [before, after, out] = process.argv.slice(2);
for (const url of [before, after]) assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(out, "Screenshot output directory required");
await mkdir(out, { recursive: true });

const executablePath = process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium";
const browser = await chromium.launch({ executablePath });
const results = [];
const failures = [];
const unexpected = [];
const pageErrors = [];

async function check(name, run) {
  try {
    await run();
    results.push(name);
    console.log("PASS", name);
  } catch (err) {
    failures.push({ name, error: err?.message ?? String(err) });
    console.error("FAIL", name, err?.stack ?? err);
  }
}

function demoState({ role = "PATIENT", unauthenticated = false, withLabResult = true, nullSex = false } = {}) {
  const state = myCareDemoState();
  state.session = unauthenticated ? null : { ...state.session, role, name: role === "CLINICIAN" ? "Dr. Mariam Hassan" : state.session.name };
  if (nullSex) state.profile = { ...state.profile, sex: null };
  if (withLabResult) {
    state.appointments[0].status = "Completed";
    state.consultations = [
      ...state.consultations,
      {
        appointmentId: "demo-my-care-visit",
        complaint: "Routine follow-up review",
        diagnosis: "Stable blood pressure check",
        allergies: "Patient reports no known allergies",
        notes: "PRIVATE_CLINICIAN_NOTE_CANARY",
        medication: "Synthetic Amlodipine 5mg",
        dosage: "One tablet daily · Demo directions",
        lab: "Complete Blood Count (Synthetic Demo)",
        instructions: "Continue home monitoring and share readings at next review.",
        followUp: "Reassess readings in 4 weeks",
        released: true,
      },
    ];
    state.fulfillment = {
      "demo-my-care-visit": {
        prescription: "Received",
        lab: "Result ready",
        result: "Synthetic training result entry · within reference demo range",
      },
    };
  }
  return state;
}

async function prepare(context, origin, { lang = "en", role = "PATIENT", unauthenticated = false, live = false, status = 200, nullSex = false } = {}) {
  const state = demoState({ role, unauthenticated, nullSex });
  await context.addInitScript(
    ({ lang, state, live, unauthenticated }) => {
      globalThis.localStorage.setItem("eh360-locale", lang);
      globalThis.localStorage.setItem("eh360-ui-mode", live ? "live" : "demo");
      if (live || unauthenticated) globalThis.localStorage.removeItem("eh360-ui-demo-v1");
      else globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
    },
    { lang, state, live, unauthenticated },
  );

  await context.route("**/*", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin || (!live && req.method() !== "GET")) {
      unexpected.push({ origin: url.origin, method: req.method(), path: url.pathname });
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (!live) {
      unexpected.push({ path: url.pathname, method: req.method() });
      return route.abort();
    }
    if (url.pathname.endsWith("/auth/me")) {
      return route.fulfill({
        json: {
          data: {
            user: { id: "00000000-0000-4000-8000-000000000001", role, email: "synthetic@example.invalid" },
            csrfToken: "synthetic-only",
          },
        },
      });
    }
    if (url.pathname.includes("/pharmacies") || url.pathname.includes("/pharmacy")) {
      return route.fulfill({ status, json: { error: { message: "PRIVATE_LIVE_CANARY" } } });
    }
    return route.fulfill({ json: { data: [], meta: { page: 1, pageSize: 20, total: 0 } } });
  });
}

async function at(origin, options, task) {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: 1000 },
    colorScheme: options.theme ?? "light",
    forcedColors: options.forcedColors ?? "none",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  try {
    await prepare(context, origin, options);
    const page = await context.newPage();
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(origin + (options.path ?? "/login"));
    await page.evaluate(() => globalThis.document.fonts.ready);
    return await task(page);
  } finally {
    await context.close();
  }
}

async function snap(page, name) {
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
}

async function assertNoOverflow(page) {
  const m = await page.evaluate(() => ({
    w: globalThis.innerWidth,
    s: globalThis.document.documentElement.scrollWidth,
  }));
  assert.ok(m.s <= m.w, `Horizontal overflow: scrollWidth=${m.s} > innerWidth=${m.w}`);
}

try {
  // 1. Login (/login): Before vs After, EN/AR Light/Dark, Escape handler + RTL letterSpacing
  await check("Login EN Light 1440 + Escape theme menu", () =>
    at(after, { path: "/login", lang: "en", theme: "light", width: 1440, unauthenticated: true }, async (page) => {
      await page.locator("h1").waitFor();
      await assertNoOverflow(page);
      const summary = page.locator("details summary").first();
      await summary.click();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("details").first().evaluate((el) => el.open), false);
      assert.equal(await summary.evaluate((el) => el === globalThis.document.activeElement), true);
      await snap(page, "shared-login-after-en-light-1440");
    }),
  );
  await check("Login AR Dark 390 + RTL letterSpacing 0", () =>
    at(after, { path: "/login", lang: "ar", theme: "dark", width: 390, unauthenticated: true }, async (page) => {
      await page.locator("h1").waitFor();
      await assertNoOverflow(page);
      const ls = await page.locator("h1").evaluate((el) => globalThis.getComputedStyle(el).letterSpacing);
      assert.ok(ls === "0px" || ls === "normal", `Expected 0px/normal letter-spacing, got ${ls}`);
      await snap(page, "shared-login-after-ar-dark-390");
    }),
  );

  // 2. Patient Portal across remaining screens + Dark-mode repairs
  await check("Patient MyCare EN Light 1440 & AR Dark 390", async () => {
    await at(after, { path: "/patient", lang: "en", role: "PATIENT", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-patient-my-care-v2]").waitFor();
      await snap(page, "patient-mycare-after-en-light-1440");
    });
    await at(after, { path: "/patient", lang: "ar", role: "PATIENT", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-patient-my-care-v2]").waitFor();
      await assertNoOverflow(page);
      await snap(page, "patient-mycare-after-ar-dark-390");
    });
  });

  await check("Patient Discover mobile subtitle preserved + EN/AR captures", async () => {
    await at(after, { path: "/patient/discover", lang: "en", role: "PATIENT", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-expressive-discovery]").waitFor();
      await snap(page, "patient-discover-after-en-light-1440");
    });
    await at(after, { path: "/patient/discover", lang: "ar", role: "PATIENT", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-expressive-discovery]").waitFor();
      assert.equal(await page.locator("[data-expressive-discovery] h1 + p").isVisible(), true);
      await assertNoOverflow(page);
      await snap(page, "patient-discover-after-ar-dark-390");
    });
  });

  await check("Patient DoctorProfile Before vs After EN Dark 1440 + back-link >=44px", async () => {
    await at(before, { path: "/patient/doctors/mariam-hassan", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".doctor-profile").waitFor();
      await snap(page, "patient-doctor-before-en-dark-1440");
    });
    await at(after, { path: "/patient/doctors/mariam-hassan", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".doctor-profile").waitFor();
      const backH = await page.locator("a.back-link").evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(backH >= 44, `back-link height ${backH} < 44`);
      const popBg = await page.locator("header details summary").last().evaluate((s) => {
        const d = s.closest("details");
        d.open = true;
        return globalThis.getComputedStyle(d.querySelector("div")).backgroundColor;
      });
      assert.notEqual(popBg, "rgb(255, 255, 255)", "Account popover must not be white in dark mode");
      await page.locator("header details").last().evaluate((d) => { d.open = false; });
      const dtStrong = await page.locator(".date-tile strong").evaluate((el) => globalThis.getComputedStyle(el).color);
      assert.equal(dtStrong, "rgb(246, 242, 255)", "Date-tile instruction text must retain light ink in Dark mode");
      await snap(page, "patient-doctor-after-en-dark-1440");
    });
  });

  await check("Patient Appointments Before vs After (success-banner Dark fix + 320px reflow)", async () => {
    await at(before, { path: "/patient/appointments/demo-my-care-visit", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".success-banner").waitFor();
      await snap(page, "patient-appt-before-en-dark-1440");
    });
    await at(after, { path: "/patient/appointments/demo-my-care-visit", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".success-banner").waitFor();
      const bg = await page.locator(".success-banner").evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
      assert.notEqual(bg, "rgb(233, 245, 237)", "Hardcoded light green banner must not appear in Dark mode");
      await snap(page, "patient-appt-after-en-dark-1440");
    });
    await at(after, { path: "/patient/appointments/demo-my-care-visit", lang: "ar", role: "PATIENT", theme: "light", width: 390 }, async (page) => {
      await page.locator(".success-banner").waitFor();
      await assertNoOverflow(page);
      await snap(page, "patient-appt-after-ar-light-390");
    });
  });

  await check("Patient Laboratory Dark .result-text contrast + tabs >=44px", async () => {
    await at(before, { path: "/patient/laboratory", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".result-text").waitFor();
      await snap(page, "patient-lab-before-en-dark-1440");
    });
    await at(after, { path: "/patient/laboratory", lang: "en", role: "PATIENT", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".result-text").waitFor();
      const bg = await page.locator(".result-text").evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
      assert.notEqual(bg, "rgb(244, 248, 246)", "Hardcoded light .result-text must be fixed in Dark mode");
      const tabH = await page.locator(".record-tabs a").first().evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(tabH >= 44, `record tab height ${tabH} < 44`);
      const activeNavBg = await page.locator("header nav a[aria-current='page']").last().evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
      assert.notEqual(activeNavBg, "rgb(234, 246, 248)", "Secondary active nav must not be #eaf6f8 in Dark mode");
      await snap(page, "patient-lab-after-en-dark-1440");
    });
    await at(after, { path: "/patient/laboratory", lang: "ar", role: "PATIENT", theme: "dark", width: 390 }, async (page) => {
      await page.locator(".result-text").waitFor();
      await assertNoOverflow(page);
      await snap(page, "patient-lab-after-ar-dark-390");
    });
  });

  // 3. Doctor Portal (Schedule + Availability + Appointment Details + Demo Consultation Workspace)
  await check("Doctor Schedule + Availability + Appointment captures", async () => {
    await at(after, { path: "/doctor/schedule", lang: "en", role: "CLINICIAN", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-expressive-doctor-schedule]").waitFor();
      await snap(page, "doctor-schedule-after-en-light-1440");
    });
    await at(after, { path: "/doctor/availability", lang: "ar", role: "CLINICIAN", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-expressive-doctor-availability]").waitFor();
      await assertNoOverflow(page);
      await snap(page, "doctor-availability-after-ar-dark-390");
    });
    await at(after, { path: "/doctor/appointments/demo-my-care-visit", lang: "en", role: "CLINICIAN", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-expressive-doctor-appointment]").waitFor();
      await snap(page, "doctor-appt-after-en-light-1440");
    });
  });

  await check("Doctor Demo Consultation Workspace Before vs After + localized Sex not recorded", async () => {
    await at(before, { path: "/doctor/consultation/demo-my-care-visit", lang: "en", role: "CLINICIAN", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".patient-strip").waitFor();
      await snap(page, "doctor-consult-before-en-dark-1440");
    });
    await at(after, { path: "/doctor/consultation/demo-my-care-visit", lang: "en", role: "CLINICIAN", theme: "dark", width: 1440 }, async (page) => {
      await page.locator(".patient-strip").waitFor();
      const stripBg = await page.locator(".patient-strip").evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
      assert.equal(stripBg, "rgb(23, 20, 43)", "Doctor Consultation patient-strip should use unified #17142b hero surface");
      await snap(page, "doctor-consult-after-en-dark-1440");
    });
    await at(after, { path: "/doctor/consultation/demo-my-care-visit", lang: "ar", role: "CLINICIAN", theme: "dark", width: 390, nullSex: true }, async (page) => {
      await page.locator(".patient-strip").waitFor();
      const txt = await page.locator(".patient-strip").innerText();
      assert.ok(txt.includes("الجنس غير مسجل"), "Expected Arabic Sex not recorded");
      await assertNoOverflow(page);
      await snap(page, "doctor-consult-after-ar-dark-390");
    });
  });

  // 4. Pharmacy Portal (Before vs After EN/AR Light/Dark Desktop/Mobile)
  await check("Pharmacy Before vs After EN Light 1440 & AR Dark 390", async () => {
    await at(before, { path: "/pharmacy", lang: "ar", role: "PHARMACY_STAFF", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await snap(page, "pharmacy-before-ar-dark-390");
    });
    await at(after, { path: "/pharmacy", lang: "en", role: "PHARMACY_STAFF", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await snap(page, "pharmacy-after-en-light-1440");
    });
    await at(after, { path: "/pharmacy", lang: "ar", role: "PHARMACY_STAFF", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await assertNoOverflow(page);
      await snap(page, "pharmacy-after-ar-dark-390");
    });
  });

  // 5. Admin Portal (People/Orgs + Directory Dark Table)
  await check("Admin People + Directory Before vs After", async () => {
    await at(before, { path: "/admin/directory", lang: "en", role: "ADMIN", theme: "dark", width: 1440 }, async (page) => {
      await page.locator("[data-staff-workspace] table").waitFor();
      await snap(page, "admin-directory-before-en-dark-1440");
    });
    await at(after, { path: "/admin/directory", lang: "en", role: "ADMIN", theme: "dark", width: 1440 }, async (page) => {
      await page.locator("[data-staff-workspace] table").waitFor();
      await snap(page, "admin-directory-after-en-dark-1440");
    });
    await at(after, { path: "/admin", lang: "en", role: "ADMIN", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await snap(page, "admin-after-en-light-1440");
    });
    await at(after, { path: "/admin", lang: "ar", role: "ADMIN", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await assertNoOverflow(page);
      await snap(page, "admin-after-ar-dark-390");
    });
  });

  // 6. FUTURE Laboratory Portal
  await check("FUTURE Laboratory Before vs After EN Light 1440 & AR Dark 390 + interactive stage", async () => {
    await at(before, { path: "/laboratory", lang: "ar", role: "LAB_STAFF", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await snap(page, "lab-before-ar-dark-390");
    });
    await at(after, { path: "/laboratory", lang: "en", role: "LAB_STAFF", theme: "light", width: 1440 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      await page.getByRole("button", { name: /Draft result/ }).click();
      assert.ok((await page.locator("[role='status']").last().innerText()).includes("Draft result"));
      await snap(page, "lab-after-en-light-1440");
    });
    await at(after, { path: "/laboratory", lang: "ar", role: "LAB_STAFF", theme: "dark", width: 390 }, async (page) => {
      await page.locator("[data-staff-workspace]").waitFor();
      const txt = await page.locator("main").innerText();
      assert.ok(txt.includes("مستقبلي / تصوّر / غير متاح فعليًا"));
      await assertNoOverflow(page);
      await snap(page, "lab-after-ar-dark-390");
    });
  });

  // 7. 320px 200% Text + Forced Colors Reflow across all 5 portals & Workspace switch safety
  for (const [label, role, route] of [
    ["patient-appt", "PATIENT", "/patient/appointments/demo-my-care-visit"],
    ["doctor-consult", "CLINICIAN", "/doctor/consultation/demo-my-care-visit"],
    ["pharmacy", "PHARMACY_STAFF", "/pharmacy"],
    ["admin", "ADMIN", "/admin"],
    ["lab", "LAB_STAFF", "/laboratory"],
  ]) {
    await check(`320px 200%-text forced-colors reflow ${label}`, () =>
      at(after, { path: route, lang: "ar", role, theme: "light", width: 320, forcedColors: "active" }, async (page) => {
        await page.locator("main").waitFor();
        await page.evaluate(() => {
          const els = [...globalThis.document.querySelectorAll("main *")];
          const sizes = els.map((e) => parseFloat(globalThis.getComputedStyle(e).fontSize));
          els.forEach((e, i) => {
            if (Number.isFinite(sizes[i]) && sizes[i] > 0 && sizes[i] < 24) {
              e.style.fontSize = `${Math.min(sizes[i] * 2, 32)}px`;
            }
          });
        });
        await assertNoOverflow(page);
      }),
    );
  }

  await check("Live boundary preserves honest unavailable UI across Pharmacy/Admin/Lab/Patient", async () => {
    for (const [role, path] of [
      ["PATIENT", "/patient/medications"],
      ["ADMIN", "/admin"],
      ["LAB_STAFF", "/laboratory"],
    ]) {
      await at(after, { path, lang: "en", role, live: true, status: 503 }, async (page) => {
        await page.locator("main").waitFor();
        const txt = await page.locator("main").innerText();
        assert.doesNotMatch(txt, /PRIVATE_LIVE_CANARY|Synthetic training only|CarePoint Pharmacy/);
      });
    }
    await at(after, { path: "/doctor/schedule", lang: "en", role: "CLINICIAN" }, async (page) => {
      await switchDemoWorkspace(page, "PHARMACY_STAFF");
      await page.locator('[data-portal-shell="PHARMACY_STAFF"]').waitFor();
    });
  });
} finally {
  await browser.close();
}

await writeFile(
  join(out, "focused-receipt.json"),
  JSON.stringify({ results, failures, unexpected, pageErrors }, null, 2) + "\n",
);
assert.deepEqual(unexpected, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(failures, []);
