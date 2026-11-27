/** Production-build loopback browser checks for Doctor Availability & Appointment Details. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState, switchDemoWorkspace } from "./ui-my-care-browser.mjs";
import { selectAppearance } from "./ui-v2-patient-doctor-browser.mjs";

const [before, after, out] = process.argv.slice(2);
for (const url of [before, after]) assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(out, "Screenshot output directory argument required");
await mkdir(out, { recursive: true });

const executablePath = process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium";
const browser = await chromium.launch({ executablePath });
const results = [];
const failures = [];
const unexpected = [];
const errorText = [];

const availSelector = "[data-expressive-doctor-availability]";
const apptSelector = "[data-expressive-doctor-appointment]";
const availPath = "/doctor/availability";
const apptPath = "/doctor/appointments/demo-my-care-visit";
const longPatient = "Synthetic Ahmed · أحمد تجريبي Very Long Recorded Patient Identity";

async function check(name, run) {
  try {
    await run();
    results.push(name);
    console.log("PASS", name);
  } catch (error) {
    failures.push({ name, error: error.message });
    console.error("FAIL", name, error.stack);
  }
}

async function prepare(
  context,
  origin,
  {
    lang = "en",
    role = "CLINICIAN",
    live = false,
    status = 200,
    calls = [],
    emptySlots = false,
    long = false,
    missingAppt = false,
  } = {},
) {
  const state = myCareDemoState();
  state.session = { ...state.session, role, name: "Synthetic Doctor" };
  state.ownSlots = emptySlots
    ? []
    : [
        {
          id: "slot-demo-pub-1",
          providerId: "mariam-hassan",
          clinicId: "cairo-clinic",
          startAt: "2026-11-22T09:00:00+02:00",
          endAt: "2026-11-22T09:30:00+02:00",
          timeZone: "Africa/Cairo",
          state: "PUBLISHED",
          version: 1,
          publishedAt: "2026-11-21T10:00:00Z",
          withdrawnAt: null,
        },
        {
          id: "slot-demo-wd-1",
          providerId: "mariam-hassan",
          clinicId: "new-cairo",
          startAt: "2026-11-23T14:00:00+02:00",
          endAt: "2026-11-23T14:30:00+02:00",
          timeZone: "Africa/Cairo",
          state: "WITHDRAWN",
          version: 2,
          publishedAt: "2026-11-20T10:00:00Z",
          withdrawnAt: "2026-11-21T08:00:00Z",
        },
      ];
  if (long) {
    state.appointments[0].patientName = longPatient;
    state.appointments[0].slot = {
      ...state.appointments[0].slot,
      startAt: "2026-11-21T23:30:00Z",
      endAt: "2026-11-22T00:00:00Z",
      timeZone: "Asia/Tokyo",
    };
  }
  state.appointments[0].reason = "PRIVATE_LOGISTICS_TEST_CANARY";
  if (missingAppt) state.appointments = [];

  await context.addInitScript(
    ({ lang, state, live }) => {
      globalThis.localStorage.setItem("eh360-locale", lang);
      globalThis.localStorage.setItem("eh360-ui-mode", live ? "live" : "demo");
      if (!live) globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
    },
    { lang, state, live },
  );

  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin || (!live && request.method() !== "GET")) {
      unexpected.push({ origin: url.origin, method: request.method(), path: url.pathname });
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (!live) {
      unexpected.push({ path: url.pathname, method: request.method() });
      return route.abort();
    }
    calls.push({ method: request.method(), path: url.pathname + url.search });
    if (url.pathname.endsWith("/auth/me")) {
      return route.fulfill({
        json: {
          data: {
            user: {
              id: "00000000-0000-4000-8000-000000000001",
              role,
              email: "controlled@example.invalid",
            },
            csrfToken: "synthetic-only",
          },
        },
      });
    }
    if (url.pathname.endsWith("/me/availability") && status !== 200) {
      return route.fulfill({ status, json: { error: { message: "PRIVATE_LIVE_TEST_CANARY" } } });
    }
    if (url.pathname.endsWith("/me/clinics")) {
      return route.fulfill({ json: { data: [] } });
    }
    if (url.pathname.includes("/me/bookings/")) {
      return route.fulfill({ status: status === 200 ? 404 : status, json: { error: { message: "PRIVATE_LIVE_TEST_CANARY" } } });
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
    page.on("pageerror", (error) => errorText.push(error.message));
    await page.goto(origin + (options.path ?? availPath));
    return await task(page);
  } finally {
    await context.close();
  }
}

async function measureReflow(page, selector, lang) {
  const m = await page.locator(selector).evaluate((root) => {
    const { document, innerWidth } = globalThis;
    const controls = [...root.querySelectorAll("a, button, input, select")].map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, width: r.width, height: r.height, left: r.left, right: r.right };
    });
    return {
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      dir: document.documentElement.dir,
      controls,
    };
  });
  assert.equal(m.dir, lang === "ar" ? "rtl" : "ltr");
  assert.ok(m.scroll <= m.width + 1, `Horizontal overflow: ${JSON.stringify(m)}`);
  for (const c of m.controls) {
    assert.ok(c.width >= 44 && c.height >= 44, `Small target: ${JSON.stringify(c)}`);
    assert.ok(c.left >= -1 && c.right <= m.width + 1, `Clipped control: ${JSON.stringify(c)}`);
  }
  return m;
}

const capture = (page, name) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage: true, animations: "disabled" });

try {
  // 1. Before & After screenshots + responsive layout checks on Doctor Availability & Appointment Details
  for (const lang of ["en", "ar"]) {
    for (const width of [390, 1440]) {
      await check(`avail before ${lang} ${width}`, () =>
        at(before, { path: availPath, lang, width }, async (page) => {
          await page.getByRole("button", { name: lang === "ar" ? "نشر الفترة" : "Publish interval", exact: true }).waitFor();
          assert.equal(await page.locator(availSelector).count(), 0);
          await page.evaluate(() => globalThis.document.fonts.ready);
          await capture(page, `avail-before-${lang}-${width}`);
        }),
      );
      await check(`appt before ${lang} ${width}`, () =>
        at(before, { path: apptPath, lang, width }, async (page) => {
          await page.locator(`a[href="/doctor/consultation/demo-my-care-visit"]`).waitFor();
          assert.equal(await page.locator(apptSelector).count(), 0);
          await page.evaluate(() => globalThis.document.fonts.ready);
          await capture(page, `appt-before-${lang}-${width}`);
        }),
      );
    }

    for (const width of [320, 390, 768, 1440]) {
      for (const theme of ["light", "dark"]) {
        await check(`avail after ${lang} ${width} ${theme}`, () =>
          at(after, { path: availPath, lang, width, theme }, async (page) => {
            await page.locator(availSelector).getByRole("button", { name: lang === "ar" ? "نشر الفترة" : "Publish interval", exact: true }).waitFor();
            assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), null);
            await page.evaluate(() => globalThis.document.fonts.ready);
            await measureReflow(page, availSelector, lang);
            if (width === 390 || width === 1440) await capture(page, `avail-after-${lang}-${theme}-${width}`);
          }),
        );

        await check(`appt after ${lang} ${width} ${theme}`, () =>
          at(after, { path: apptPath, lang, width, theme, long: width === 320 }, async (page) => {
            await page.locator(apptSelector).locator(`a[href="/doctor/consultation/demo-my-care-visit"]`).waitFor();
            assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), null);
            const txt = await page.locator(apptSelector).innerText();
            assert.match(txt, /PRIVATE_LOGISTICS_TEST_CANARY/);
            if (width === 320) {
              assert.ok(txt.includes(longPatient));
              assert.match(txt, /08:30–09:00/);
            }
            await page.evaluate(() => globalThis.document.fonts.ready);
            await measureReflow(page, apptSelector, lang);
            if (width === 390 || width === 1440) await capture(page, `appt-after-${lang}-${theme}-${width}`);
          }),
        );
      }
    }

    // 200% native page zoom
    for (const [label, route, selector] of [
      ["avail", availPath, availSelector],
      ["appt", apptPath, apptSelector],
    ]) {
      await check(`${label} ${lang} 200% page zoom`, async () => {
        const profile = await mkdtemp(join(tmpdir(), `doc-ops-${label}-zoom-`));
        const context = await chromium.launchPersistentContext(profile, {
          executablePath,
          viewport: null,
          args: ["--window-size=640,1740"],
          serviceWorkers: "block",
        });
        try {
          await prepare(context, after, { path: route, lang, long: true });
          const settings = await context.newPage();
          await settings.goto("chrome://settings/appearance");
          await settings.getByRole("combobox", { name: "Page zoom", exact: true }).selectOption({ label: "200%" });
          const page = context.pages()[0];
          await page.goto(after + route);
          await page.locator(selector).waitFor();
          await page.waitForFunction(() => globalThis.devicePixelRatio === 2);
          await page.evaluate(() => globalThis.document.fonts.ready);
          assert.equal((await measureReflow(page, selector, lang)).width, 320);
          const cdp = await context.newCDPSession(page);
          const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
          await writeFile(join(out, `${label}-zoom-${lang}.png`), globalThis.Buffer.from(data, "base64"));
        } finally {
          await context.close();
          await rm(profile, { recursive: true, force: true });
        }
      });
    }

    // 200% text + forced colors + reduced motion
    for (const [label, route, selector] of [
      ["avail", availPath, availSelector],
      ["appt", apptPath, apptSelector],
    ]) {
      await check(`${label} ${lang} 200% text + forced-colors`, () =>
        at(after, { path: route, lang, width: 320, long: true, forcedColors: "active" }, async (page) => {
          await page.locator(selector).waitFor();
          await page.evaluate((sel) => {
            const els = [...globalThis.document.querySelectorAll(sel + " *")];
            const sizes = els.map((el) => parseFloat(globalThis.getComputedStyle(el).fontSize));
            els.forEach((el, idx) => {
              el.style.fontSize = sizes[idx] * 2 + "px";
            });
          }, selector);
          assert.equal(
            await page.evaluate(
              () =>
                globalThis.matchMedia("(forced-colors: active)").matches &&
                globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches,
            ),
            true,
          );
          await page.evaluate(() => globalThis.document.fonts.ready);
          await measureReflow(page, selector, lang);
          await capture(page, `${label}-text-200-${lang}`);
        }),
      );
    }
  }

  // 2. Functional Demo flows on Doctor Availability: publish, withdraw, empty, keyboard & T1 theme
  await check("DoctorAvailability Demo publish, withdraw, keyboard, and T1 theme", () =>
    at(after, { path: availPath, width: 390 }, async (page) => {
      const root = page.locator(availSelector);
      await root.waitFor();
      assert.equal(await root.locator("li").count(), 2);

      // Keyboard focus on Back link & solid outline check
      const back = root.getByRole("link", { name: "← Back to schedule", exact: true });
      await back.focus();
      assert.ok(
        await back.evaluate((el) => globalThis.getComputedStyle(el).outlineStyle === "solid"),
      );

      // T1 appearance selector cycle retains focus
      await selectAppearance(page, "dark");
      assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), "dark");
      await selectAppearance(page, "system");

      // Publish a finite interval
      await root.getByLabel("Publication clinic").selectOption("cairo-clinic");
      await root.getByLabel("Starts at").fill("2026-11-25T10:00:00+02:00");
      await root.getByLabel("Ends at").fill("2026-11-25T10:30:00+02:00");
      await root.getByRole("button", { name: "Publish interval", exact: true }).click();
      await page.waitForFunction((sel) => globalThis.document.querySelectorAll(`${sel} li`).length === 3, availSelector);

      // Withdraw one published interval
      const withdrawButtons = root.getByRole("button", { name: "Withdraw interval", exact: true });
      const beforeCount = await withdrawButtons.count();
      await withdrawButtons.first().click();
      await page.waitForFunction(
        ({ sel, expected }) =>
          [...globalThis.document.querySelectorAll(`${sel} button`)].filter((b) => b.textContent?.includes("Withdraw interval")).length === expected,
        { sel: availSelector, expected: beforeCount - 1 },
      );
    }),
  );

  await check("DoctorAvailability Empty intervals state", () =>
    at(after, { path: availPath, emptySlots: true }, async (page) => {
      await page.locator(availSelector).getByText("No published intervals", { exact: true }).waitFor();
      assert.equal(await page.locator(availSelector).locator("li").count(), 0);
    }),
  );

  // 3. Functional Demo flows on PatientAppointment: back to schedule, consultation link, missing ID, role switch
  await check("PatientAppointment Demo navigation, notice, and missing ID", () =>
    at(after, { path: apptPath, width: 390 }, async (page) => {
      const root = page.locator(apptSelector);
      await root.waitFor();
      await root.getByText("Separate relationship check", { exact: true }).waitFor();
      await root.getByText(/independent of the booking/).waitFor();
      await root.getByRole("link", { name: "Open consultation workspace", exact: true }).click();
      await page.waitForURL("**/doctor/consultation/demo-my-care-visit");
      assert.equal(await page.locator(apptSelector).count(), 0);
      await page.goBack();
      await root.waitFor();
      await root.getByRole("link", { name: "← Back to schedule", exact: true }).click();
      await page.waitForURL("**/doctor/schedule");
      await page.locator("[data-expressive-doctor-schedule]").waitFor();
    }),
  );

  await check("PatientAppointment missing booking renders Empty", () =>
    at(after, { path: "/doctor/appointments/does-not-exist", missingAppt: true }, async (page) => {
      await page.locator(apptSelector).getByText("Appointment not found", { exact: true }).waitFor();
    }),
  );

  await check("Role switch away from Doctor hides expressive operations surfaces", () =>
    at(after, { path: availPath }, async (page) => {
      await page.locator(availSelector).waitFor();
      await switchDemoWorkspace(page, "PATIENT");
      await page.locator('[data-portal-shell="PATIENT"]').waitFor();
      assert.equal(await page.locator(availSelector).count(), 0);
      assert.equal(await page.locator(apptSelector).count(), 0);
    }),
  );

  // 4. Live boundary & request parity proof (Live never mounts Expressive Demo UI and issues identical HTTP calls)
  for (const status of [200, 401, 503]) {
    await check(`Live DoctorAvailability ${status} parity & non-mounting`, async () => {
      const traces = [];
      for (const origin of [before, after]) {
        const calls = [];
        await at(origin, { path: availPath, live: true, status, calls }, async (page) => {
          await page.waitForFunction(() =>
            globalThis.performance.getEntriesByType("resource").some((e) => e.name.includes("/api/v1/me/availability")),
          );
          await page.locator("main .loading").first().waitFor({ state: "hidden" }).catch(() => {});
          assert.equal(await page.locator(availSelector).count(), 0);
          assert.doesNotMatch(await page.locator("main").innerText(), /PRIVATE_LIVE_TEST_CANARY/);
        });
        traces.push(calls.map((c) => `${c.method}:${c.path}`).sort());
      }
      assert.deepEqual(traces[1], traces[0]);
    });
  }

  await check("Live DoctorAppointment stays on LiveBookingDetail and never mounts Demo card", () =>
    at(after, { path: "/doctor/appointments/00000000-0000-4000-8000-000000000099", live: true, status: 404 }, async (page) => {
      await page.waitForFunction(() =>
        globalThis.performance.getEntriesByType("resource").some((e) => e.name.includes("/api/v1/me/bookings/")),
      );
      assert.equal(await page.locator(apptSelector).count(), 0);
      assert.doesNotMatch(await page.locator("main").innerText(), /PRIVATE_LIVE_TEST_CANARY/);
    }),
  );
} finally {
  await browser.close();
}

await writeFile(
  join(out, "focused-receipt.json"),
  JSON.stringify({ results, failures, unexpected, errorText }, null, 2) + "\n",
);
assert.deepEqual(unexpected, []);
assert.deepEqual(errorText, []);
assert.deepEqual(failures, []);
