/** Production-build browser checks with synthetic local-only transport. */
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState, switchDemoWorkspace } from "./ui-my-care-browser.mjs";
import { selectAppearance } from "./ui-v2-patient-doctor-browser.mjs";

const [before, after, out] = process.argv.slice(2);
for (const url of [before, after]) assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
const axePath = process.env.UI_V2_AXE_PATH;
assert.ok(out && axePath);
await mkdir(out, { recursive: true });
const executablePath = process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium";
const browser = await chromium.launch({ executablePath });
const results = [];
const failures = [];
const pilot = "[data-expressive-doctor-schedule]";
const schedule = "/doctor/schedule";
const longName = "Synthetic Ahmed · أحمد تجريبي Very Long Recorded Name Without Truncation";
const unexpected = [];
const errorText = [];
const linkNames = { en: "View appointment", ar: "عرض الموعد" };

async function check(name, run) {
  try {
    await run();
    results.push(name);
    console.log("PASS", name);
  } catch (error) {
    failures.push({ name, error: error.message });
    console.error(name, error.stack);
  }
}

async function prepare(context, origin, { lang = "en", role = "CLINICIAN", live = false, status = 200, calls = [], empty = false, broken = false, long = false } = {}) {
  const state = myCareDemoState();
  state.session = { ...state.session, role, name: "Synthetic Doctor" };
  const item = state.appointments[0];
  item.reason = "PRIVATE_LOGISTICS_TEST_CANARY";
  if (long) {
    item.patientName = longName;
    item.slot = {
      ...item.slot,
      startAt: "2026-11-21T23:30:00Z",
      endAt: "2026-11-22T00:00:00Z",
      timeZone: "Asia/Tokyo",
    };
  }
  if (broken) state.appointments = null;
  else if (empty) state.appointments = [];
  else state.appointments.push({ ...item, id: "completed-synthetic", status: "Completed" });
  await context.addInitScript(({ lang, state, live }) => {
    globalThis.localStorage.setItem("eh360-locale", lang);
    globalThis.localStorage.setItem("eh360-ui-mode", live ? "live" : "demo");
    if (!live) globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
  }, { lang, state, live });
  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin || request.method() !== "GET") {
      unexpected.push({ origin: url.origin, method: request.method(), path: url.pathname });
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (!live) {
      unexpected.push({ path: url.pathname, method: request.method() });
      return route.abort();
    }
    calls.push(url.pathname + url.search);
    if (url.pathname.endsWith("/auth/me"))
      return route.fulfill({ json: { data: { user: { id: "00000000-0000-4000-8000-000000000001", role, email: "controlled@example.invalid" }, csrfToken: "synthetic-only" } } });
    if (url.pathname.endsWith("/me/schedule") && status !== 200)
      return route.fulfill({ status, json: { error: { message: "PRIVATE_LIVE_TEST_CANARY" } } });
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
    page.on("pageerror", error => errorText.push(error.message));
    await page.goto(origin + (options.path ?? schedule));
    return await task(page);
  } finally {
    await context.close();
  }
}

async function ready(page, lang) {
  await page.locator(pilot).getByRole("link", { name: linkNames[lang], exact: true }).first().waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
}

async function reflow(page, lang) {
  const measured = await page.locator(pilot).evaluate((root) => {
    const { document, innerWidth } = globalThis;
    const controls = [...root.querySelectorAll("a, button")].map((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, left: r.left, right: r.right };
    });
    const names = [...root.querySelectorAll("h3 bdi")].map(el => {
      const r = el.getBoundingClientRect();
      return { full: el.textContent, left: r.left, right: r.right, dir: el.dir };
    });
    return { width: innerWidth, scroll: document.documentElement.scrollWidth, controls, names, dir: document.documentElement.dir };
  });
  assert.equal(measured.dir, lang === "ar" ? "rtl" : "ltr");
  assert.ok(measured.scroll <= measured.width + 1, JSON.stringify(measured));
  for (const rect of measured.controls) {
    assert.ok(rect.width >= 44 && rect.height >= 44, JSON.stringify(rect));
    assert.ok(rect.left >= -1 && rect.right <= measured.width + 1, JSON.stringify(rect));
  }
  for (const name of measured.names) assert.ok(name.left >= -1 && name.right <= measured.width + 1, JSON.stringify(name));
  return measured;
}

async function axe(page) {
  await page.addScriptTag({ path: axePath });
  const issues = await page.evaluate(async (selector) => (await globalThis.axe.run(selector, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), pilot);
  assert.deepEqual(issues, []);
}

const capture = (page, name) => page.screenshot({ path: join(out, name + ".png"), fullPage: true, animations: "disabled" });

try {
  for (const lang of ["en", "ar"]) {
    for (const width of [390, 1440]) await check(`before ${lang} ${width}`, () => at(before, { width, lang }, async (page) => {
      await page.locator('main a[href="/doctor/appointments/demo-my-care-visit"]').waitFor();
      assert.equal(await page.locator(pilot).count(), 0);
      await capture(page, `before-${lang}-${width}`);
    }));
    for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) {
      await check(`${lang} ${width} system ${theme}`, () => at(after, { width, lang, theme, long: width === 320 }, async (page) => {
        await ready(page, lang);
        assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), null);
        const rows = page.locator(pilot).locator("li");
        assert.equal(await rows.count(), 2);
        assert.match(await rows.first().innerText(), /\d\d:\d\d–\d\d:\d\d/);
        assert.doesNotMatch(await page.locator(pilot).innerText(), /PRIVATE_LOGISTICS_TEST_CANARY/);
        const measured = await reflow(page, lang);
        if (width === 320) {
          assert.equal(measured.names[0].full, longName);
          assert.equal(await rows.first().locator("time strong").innerText(), "22");
          assert.match(await rows.first().innerText(), /08:30–09:00/);
        }
        await axe(page);
        if (width === 390 || width === 1440) await capture(page, `after-${lang}-${theme}-${width}`);
      }));
    }
    await check(`${lang} actual 200% Chromium page zoom`, async () => {
      const profile = await mkdtemp(join(tmpdir(), "doctor-schedule-zoom-"));
      const context = await chromium.launchPersistentContext(profile, {
        executablePath, viewport: null, args: ["--window-size=640,1740"], serviceWorkers: "block",
      });
      try {
        await prepare(context, after, { lang, long: true });
        const settings = await context.newPage();
        await settings.goto("chrome://settings/appearance");
        await settings.getByRole("combobox", { name: "Page zoom", exact: true }).selectOption({ label: "200%" });
        const page = context.pages()[0];
        await page.goto(after + schedule);
        await ready(page, lang);
        await page.waitForFunction(() => globalThis.devicePixelRatio === 2);
        assert.equal((await reflow(page, lang)).width, 320);
        const cdp = await context.newCDPSession(page);
        const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
        await writeFile(join(out, `zoom-${lang}.png`), globalThis.Buffer.from(data, "base64"));
      } finally {
        await context.close();
        await rm(profile, { recursive: true, force: true });
      }
    });
    await check(`${lang} text 200%, forced colors and reduced motion`, () =>
      at(after, { width: 320, lang, long: true, forcedColors: "active" }, async (page) => {
        await ready(page, lang);
        await page.evaluate((selector) => {
          const elements = [...globalThis.document.querySelectorAll(selector + " *")];
          const sizes = elements.map(el => parseFloat(globalThis.getComputedStyle(el).fontSize));
          elements.forEach((el, index) => { el.style.fontSize = sizes[index] * 2 + "px"; });
        }, pilot);
        assert.equal(await page.evaluate(() => globalThis.matchMedia("(forced-colors: active)").matches && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches), true);
        await reflow(page, lang);
        await capture(page, `text-200-${lang}`);
      }));
  }
  await check("Filters, keyboard reverse traversal, Escape, destination, Back and availability", () => at(after, { width: 390 }, async (page) => {
    await ready(page, "en");
    const root = page.locator(pilot);
    const all = root.getByRole("button", { name: "All", exact: true });
    const upcoming = root.getByRole("button", { name: "Upcoming", exact: true });
    await all.focus();
    await page.keyboard.press("Tab");
    assert.ok(await upcoming.evaluate(el => el === globalThis.document.activeElement));
    await page.keyboard.press("Shift+Tab");
    assert.ok(await all.evaluate(el => el === globalThis.document.activeElement));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    assert.ok(await upcoming.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = globalThis.document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return el.contains(hit) && globalThis.getComputedStyle(el).outlineStyle === "solid";
    }));
    assert.equal(await upcoming.getAttribute("aria-pressed"), "true");
    assert.equal(await root.locator("li").count(), 1);
    await root.getByRole("button", { name: "Completed", exact: true }).click();
    assert.equal(await root.locator("li a").getAttribute("href"), "/doctor/appointments/completed-synthetic");
    await all.click();
    await selectAppearance(page, "dark");
    assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), "dark");
    await selectAppearance(page, "light");
    assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), "light");
    await selectAppearance(page, "system");
    const summary = page.locator("header details:has(> summary[aria-label]) > summary").first();
    assert.ok(await summary.evaluate(el => el === globalThis.document.activeElement));
    await root.getByRole("link", { name: "View appointment" }).first().press("Enter");
    await page.waitForURL("**/doctor/appointments/demo-my-care-visit");
    assert.equal(await page.locator(pilot).count(), 0);
    await page.goBack();
    await ready(page, "en");
    await page.waitForFunction(() => globalThis.document.activeElement?.getAttribute("href") === "/doctor/appointments/demo-my-care-visit");
    await root.getByRole("link", { name: "Manage availability" }).click();
    await page.waitForURL("**/doctor/availability");
    assert.equal(await page.locator(pilot).count(), 0);
    await page.goBack();
    await ready(page, "en");
  }));
  await check("Empty schedule", () => at(after, { empty: true }, async (page) => {
    await page.locator(pilot).getByRole("status").filter({ hasText: "A little space in your day" }).waitFor();
    assert.equal(await page.locator(pilot).locator("li").count(), 0);
  }));
  await check("Demo read error hides rows and explicit retry restores them", () => at(after, { broken: true }, async (page) => {
    const root = page.locator(pilot);
    const error = root.getByRole("alert");
    await error.waitFor();
    assert.equal(await root.locator("li").count(), 0);
    assert.doesNotMatch(await error.innerText(), /TypeError|Cannot read|null\.filter/);
    await page.evaluate((appointments) => {
      const key = "eh360-ui-demo-v1";
      const state = JSON.parse(globalThis.localStorage.getItem(key));
      globalThis.localStorage.setItem(key, JSON.stringify({ ...state, appointments }));
    }, myCareDemoState().appointments);
    await error.getByRole("button", { name: "Try again", exact: true }).click();
    await ready(page, "en");
    assert.equal(await root.locator("li").count(), 1);
    assert.equal(await error.count(), 0);
  }));
  for (const [role, path] of [["CLINICIAN", "/doctor"], ["PATIENT", "/patient"], ["PHARMACY_STAFF", "/pharmacy"], ["ADMIN", "/admin"], ["LAB_STAFF", "/laboratory"], ["PATIENT", schedule]]) {
    await check(`Portal boundary ${role} ${path}`, () => at(after, { role, path }, async (page) => {
      await page.locator(`[data-portal-shell="${role}"]`).waitFor();
      assert.equal(await page.locator(pilot).count(), 0);
    }));
  }
  await check("Demo role switch clears Schedule and restores it only for Doctor", () => at(after, {}, async (page) => {
    await ready(page, "en");
    await switchDemoWorkspace(page, "PATIENT");
    await page.locator('[data-portal-shell="PATIENT"]').waitFor();
    assert.equal(await page.locator(pilot).count(), 0);
    await switchDemoWorkspace(page, "CLINICIAN");
    await page.waitForURL("**/doctor");
    assert.equal(await page.locator(pilot).count(), 0);
    await page.goto(after + schedule);
    await ready(page, "en");
  }));
  for (const status of [200, 401, 403, 503]) await check(`Live ${status} request parity`, async () => {
    const traces = [];
    for (const origin of [before, after]) {
      const calls = [];
      await at(origin, { live: true, status, calls }, async (page) => {
        await page.waitForFunction(() => globalThis.performance.getEntriesByType("resource").some(entry => entry.name.includes("/api/v1/me/schedule")));
        await page.locator("main .loading").waitFor({ state: "hidden" });
        assert.equal(await page.locator(pilot).count(), 0);
        assert.doesNotMatch(await page.locator("main").innerText(), /PRIVATE_LIVE_TEST_CANARY/);
      });
      assert.ok(calls.includes("/api/v1/me/schedule?page=1&pageSize=20"));
      traces.push(calls.sort());
    }
    assert.deepEqual(traces[1], traces[0]);
  });
  await check("Wrong-role Live access never reads Doctor Schedule", async () => {
    const calls = [];
    await at(after, { live: true, role: "PATIENT", calls }, async (page) => {
      await page.locator('[data-portal-shell="PATIENT"]').waitFor();
      assert.equal(await page.locator(pilot).count(), 0);
    });
    assert.ok(!calls.some(path => path.includes("/me/schedule")));
  });
} finally {
  await browser.close();
}
await writeFile(join(out, "focused-receipt.json"), JSON.stringify({ results, failures, unexpected, errorText }, null, 2) + "\n");
assert.deepEqual(unexpected, []);
assert.deepEqual(errorText, []);
assert.deepEqual(failures, []);
