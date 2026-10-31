import { testFollowUpPresentation } from "./support/ui-follow-up-intents-browser.mjs";
/** Real-browser Golden Demo regression. Built Next app; no API or database required. */
import { testDocumentation } from "./support/ui-documentation-browser.mjs";
import { testConsultationOpening } from "./support/ui-consultation-opening-browser.mjs";
import { testLiveBooking } from "./support/ui-booking-browser.mjs";
import { testPolish } from "./support/ui-polish-browser.mjs";
import { testLiveJourney } from "./support/ui-live-journey-browser.mjs";
import assert from "node:assert/strict";
import { testArabic } from "./support/ui-rtl-browser.mjs";
import { testLiveAvailability } from "./support/ui-availability-browser.mjs";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
const origin = "http://127.0.0.1:3100";
const shots = process.env.UI_SCREENSHOT_DIR;
const server = spawn(
  process.execPath,
  [
    "apps/web/node_modules/next/dist/bin/next",
    "start",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
let logs = "";
server.stdout.on("data", (d) => {
  logs += String(d);
});
server.stderr.on("data", (d) => {
  logs += String(d);
});
let browser;
try {
  let started = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(origin);
      if (r.ok) {
        started = true;
        break;
      }
    } catch {
      /* Wait for startup. */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(started, logs);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM
      ? { executablePath: process.env.EH_UI_CHROMIUM }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snapshot = async (name) => {
    if (shots) {
      await mkdir(shots, { recursive: true });
      await page.screenshot({
        path: resolve(shots, `${name}.png`),
        fullPage: true,
      });
    }
  };
  const visible = async (text) => {
    await page
      .getByText(text, { exact: true })
      .first()
      .waitFor({ state: "visible" });
  };
  const switchRole = async (role) => {
    await page.getByLabel("Demo workspace").selectOption(role);
    await page.waitForURL(
      `**/${{ PATIENT: "patient", CLINICIAN: "doctor", PHARMACY_STAFF: "pharmacy", LAB_STAFF: "laboratory", ADMIN: "admin" }[role]}`,
    );
    await page.locator(".loading").waitFor({ state: "hidden" });
  };
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Explore the patient demo" })
    .waitFor();
  await snapshot("01-login");
  await page.getByRole("button", { name: "Explore the patient demo" }).click();
  await visible("Good morning, Ahmed.");
  await visible("Meet your next care partner");
  await snapshot("02-patient-dashboard");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Find a doctor" })
    .click();
  await page.getByPlaceholder("Search by doctor’s name").fill("Mariam");
  await visible("1 doctors in this directory view");
  await snapshot("03-discovery");
  await page.getByRole("link", { name: "View profile & availability" }).click();
  await visible("Choose your appointment");
  await page.locator(".slots button").first().click();
  await snapshot("04-doctor-profile");
  await page.getByRole("button", { name: "Review appointment" }).click();
  await snapshot("05-booking-review");
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await visible("You’re all set for your visit");
  await snapshot("06-booking-confirmed");
  await switchRole("CLINICIAN");
  await visible("Patient appointments");
  await snapshot("07-clinician-dashboard");
  await page.getByRole("link", { name: "Open patient" }).click();
  await page.getByRole("link", { name: "Open consultation workspace" }).click();
  await visible("Consultation workspace");
  await page
    .getByLabel("Presenting complaint / problems")
    .fill("Synthetic routine follow-up and questions about previous results.");
  await page
    .getByLabel("Clinician-entered diagnosis / assessment")
    .fill("Synthetic follow-up review");
  await page
    .getByLabel("Allergy / intolerance review")
    .selectOption("Unknown — patient unable to confirm");
  await page
    .getByLabel("Private clinician note")
    .fill("PRIVATE GOLDEN DEMO NOTE");
  await page
    .getByLabel("Medication name (optional)")
    .fill("Demo medication A — synthetic");
  await page
    .getByLabel("Dose, route & instructions")
    .fill("Synthetic directions entered manually for presentation.");
  await page
    .getByLabel("Laboratory request (optional)")
    .fill("Synthetic full blood count request");
  await page
    .getByLabel("Released patient instructions / summary")
    .fill(
      "We reviewed your concerns together. Keep your questions ready for the next visit.",
    );
  await page
    .getByLabel("Follow-up intention (optional)")
    .fill("Discuss results at a follow-up visit; not yet booked.");
  await snapshot("08-consultation-workspace");
  await page.getByRole("button", { name: "Review & release summary" }).click();
  await page.getByRole("button", { name: "Release demo summary" }).click();
  await visible("Summary released to the demo patient");
  await switchRole("PHARMACY_STAFF");
  await visible("Prescription details");
  await page.getByRole("button", { name: "Begin preparation" }).click();
  await page
    .getByRole("button", { name: "Confirm full-item dispensing" })
    .click();
  await visible("Dispensed");
  await snapshot("09-pharmacy");
  await switchRole("LAB_STAFF");
  await page.getByRole("button", { name: "Start processing" }).click();
  await page
    .getByLabel("Result text")
    .fill(
      "Synthetic result entered for presentation. Clinician review required.",
    );
  await page.getByRole("button", { name: "Share demo result" }).click();
  await visible("Shared result");
  await snapshot("10-laboratory");
  await switchRole("PATIENT");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Medical record" })
    .click();
  await visible("Synthetic follow-up review");
  assert.ok(
    !(await page.locator("#main").innerText()).includes(
      "PRIVATE GOLDEN DEMO NOTE",
    ),
  );
  await snapshot("11-patient-record");
  await page
    .getByRole("link", { name: "Laboratory", exact: true })
    .last()
    .click();
  await visible(
    "Synthetic result entered for presentation. Clinician review required.",
  );
  await page.reload();
  await visible(
    "Synthetic result entered for presentation. Clinician review required.",
  );
  await switchRole("ADMIN");
  await visible("Administration, with boundaries");
  assert.equal(
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Medical record" })
      .count(),
    0,
  );
  await snapshot("12-admin-operations");
  await page.goto(`${origin}/patient/record`);
  await visible("Choose your workspace");
  await switchRole("PATIENT");
  // Exercise actual ready/loading/error/empty screen variants across all major demo surfaces.
  const patientRoutes = [
    "/patient",
    "/patient/discover",
    "/patient/doctors/mariam-hassan",
    "/patient/clinics/cairo-clinic",
    "/patient/appointments",
    "/patient/record",
    "/patient/history",
    "/patient/medications",
    "/patient/laboratory",
    "/patient/follow-up",
    "/patient/settings",
  ];
  for (const route of patientRoutes) {
    await page.goto(origin + route);
    await page.locator("#main").waitFor();
    await page.locator("#main .loading").first().waitFor({ state: "hidden" });
    await page.getByText("Demo controls", { exact: true }).click();
    for (const state of ["loading", "empty", "error", "ready"]) {
      await page.getByLabel("Screen state").selectOption(state);
      if (state === "loading")
        assert.ok(
          await page
            .getByRole("status", { name: "Loading", exact: true })
            .count(),
        );
      if (state === "empty") await visible("Nothing here yet");
      if (state === "error") await visible("We couldn’t load this view");
    }
    await page.getByText("Demo controls", { exact: true }).click();
  }

  const workspaceRoutes = [
    [
      "CLINICIAN",
      [
        "/doctor",
        "/doctor/schedule",
        "/doctor/availability",
        "/doctor/appointments/demo-appointment-1",
        "/doctor/consultation/demo-appointment-1",
      ],
    ],
    ["PHARMACY_STAFF", ["/pharmacy"]],
    ["LAB_STAFF", ["/laboratory"]],
    [
      "ADMIN",
      [
        "/admin",
        "/admin/organizations",
        "/admin/users",
        "/admin/directory",
        "/admin/scheduling",
      ],
    ],
  ];
  for (const [role, routes] of workspaceRoutes) {
    await switchRole(role);
    for (const route of routes) {
      await page.goto(origin + route);
      await page.locator("#main").waitFor();
      await page.locator("#main .loading").first().waitFor({ state: "hidden" });
      await page.getByText("Demo controls", { exact: true }).click();
      for (const state of ["loading", "empty", "error", "ready"]) {
        await page.getByLabel("Screen state").selectOption(state);
        if (state === "empty") await visible("Nothing here yet");
        if (state === "error") await visible("We couldn’t load this view");
      }
      await page.getByText("Demo controls", { exact: true }).click();
    }
  }
  await switchRole("PATIENT");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/patient",
    "/patient/discover",
    "/patient/doctors/mariam-hassan",
    "/patient/appointments",
    "/patient/record",
    "/patient/settings",
  ]) {
    await page.goto(origin + route);
    await page.locator("#main").waitFor();
    await page.locator("#main .loading").first().waitFor({ state: "hidden" });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.window.innerWidth,
      ),
      `Mobile overflow at ${route}`,
    );
    if (route === "/patient") await snapshot("13-mobile-dashboard");
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Find a doctor" })
    .click();
  await page.waitForURL("**/patient/discover");
  assert.equal(await page.locator(".sidebar.open").count(), 0);
  await page.locator(".provider-grid").waitFor();
  await snapshot("14-mobile-discovery");
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto(`${origin}/patient`);
  await visible("Good morning, Ahmed.");
  assert.ok(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth <=
        globalThis.window.innerWidth,
    ),
  );
  await snapshot("15-tablet-dashboard");

  // A live-mode browser contract probe uses explicit HTTP stubs, not a live-backend completion claim.
  const live = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const liveCalls = [];
  let liveAuthenticated = false;
  await live.route("**/api/v1/**", async (route) => {
    const req = route.request();
    liveCalls.push({
      path: new URL(req.url()).pathname,
      headers: req.headers(),
      body: req.postData(),
    });
    if (req.url().endsWith("/auth/login")) liveAuthenticated = true;
    if (req.url().endsWith("/auth/logout")) {
      if (
        req.postData() !== "{}" ||
        req.headers()["content-type"] !== "application/json"
      )
        return route.fulfill({
          status: 415,
          json: { error: { message: "JSON required" } },
        });
      liveAuthenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (
      liveAuthenticated &&
      (req.url().endsWith("/auth/login") || req.url().endsWith("/auth/me"))
    )
      return route.fulfill({
        json: {
          data: {
            user: { email: "operator@example.invalid", role: "ADMIN" },
            session: { expiresAt: "2026-10-29T00:00:00Z" },
            csrfToken: "session-bound-csrf",
          },
        },
      });
    if (req.url().endsWith("/auth/logout"))
      return route.fulfill({ status: 204 });
    return route.fulfill({
      status: 503,
      json: { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" } },
    });
  });
  await live.goto(origin);
  await live.getByLabel("Email address").fill("operator@example.invalid");
  await live
    .getByLabel("Password", { exact: true })
    .fill("synthetic-test-only");
  await live.getByRole("button", { name: "Sign in with live account" }).click();
  await live.getByText("Live API", { exact: true }).waitFor();
  await live.getByText("We couldn’t load this view", { exact: true }).waitFor();
  assert.equal(await live.getByLabel("Demo workspace").count(), 0);
  assert.equal(
    await live
      .getByRole("navigation")
      .getByRole("link", { name: "Medical record" })
      .count(),
    0,
  );
  await live.getByRole("button", { name: "Sign out" }).click();
  await live
    .getByRole("button", { name: "Explore the patient demo" })
    .waitFor();
  assert.equal(
    liveCalls.find((c) => c.path.endsWith("/auth/login")).headers["x-eh-login"],
    "1",
  );
  assert.equal(
    liveCalls.find((c) => c.path.endsWith("/auth/logout")).headers[
      "x-csrf-token"
    ],
    "session-bound-csrf",
  );
  await live.close();
  await testLiveAvailability(browser, origin, shots);
  await testArabic(browser, origin, shots);
  await testPolish(browser, origin, shots);
  await testLiveJourney(browser, origin, shots);
  await testFollowUpPresentation(browser, origin);
  await testLiveBooking(browser, origin, shots);
  await testConsultationOpening(browser, origin, shots);
  await testDocumentation(browser, origin, shots);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser Golden Demo, role boundaries, patient privacy, reload continuity, 23 route state variants + live HTTP contract probe, desktop/tablet/mobile navigation and overflow; no browser exceptions.",
  );
} catch (e) {
  console.error(logs);
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
