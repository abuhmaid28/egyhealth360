import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

const [before, after, evidenceDirectory] = process.argv.slice(2);
assert.match(before, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.match(after, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(evidenceDirectory);
const out = resolve(evidenceDirectory);
const executablePath = process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium";
const axePath = process.env.UI_V2_AXE_PATH;
assert.ok(axePath, "Provide the existing local axe bundle");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath });
const results = [];
const failures = [];
const boundary = { unsafe: 0, errors: 0 };
const pilot = "[data-expressive-discovery]";
const sampleClinic = { id: "cairo-clinic", displayName: "Controlled clinic", city: "Controlled city", address: "Example address" };
const sampleSpecialty = { key: "internal-medicine", displayName: "Internal medicine" };
const sampleProvider = { id: "mariam-hassan", displayName: "Controlled directory identity", specialty: sampleSpecialty, clinics: [sampleClinic] };

async function attempt(name, task) {
  try { results.push({ name, ...await task() }); }
  catch (error) { failures.push({ name, message: error.message }); console.error(name, error.stack); }
}

async function prepare(context, origin, { lang = "en", role = "PATIENT", live = "", calls = [] } = {}) {
  const state = myCareDemoState();
  state.session.role = role;
  if (role === "CLINICIAN") state.session.name = state.appointments[0].provider.displayName;
  await context.addInitScript(({ lang, state, live }) => {
    globalThis.localStorage.setItem("eh360-locale", lang);
    globalThis.localStorage.setItem("eh360-ui-mode", live ? "live" : "demo");
    if (!live) globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
  }, { lang, state, live });
  await context.route("**/*", (route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.protocol === "chrome:") return route.continue();
    if (target.origin !== origin || request.method() !== "GET") {
      boundary.unsafe++;
      return route.abort();
    }
    if (target.pathname.startsWith("/api/")) {
      if (!live) { boundary.unsafe++; return route.abort(); }
      calls.push(target.pathname + target.search);
      if (target.pathname.endsWith("/auth/me")) {
        return route.fulfill({ json: { data: { user: { role, email: "controlled@example.invalid" }, csrfToken: "fixture-only" } } });
      }
      const data = {
        "/api/v1/directory/providers": [sampleProvider],
        "/api/v1/directory/specialties": [sampleSpecialty],
        "/api/v1/directory/clinics": [sampleClinic],
      }[target.pathname];
      if (data && !(live === "failure" && target.pathname.endsWith("/providers"))) return route.fulfill({ json: { data } });
      return route.fulfill({ status: 503, json: { error: { message: "CONTROLLED_PRIVATE_CANARY" } } });
    }
    return route.continue();
  });
}

async function at(origin, path, options, task) {
  const { width = 390, height = 844, theme = "light", forcedColors = "none" } = options;
  const context = await browser.newContext({
    viewport: { width, height }, colorScheme: theme, reducedMotion: "reduce",
    forcedColors, serviceWorkers: "block",
  });
  try {
    await prepare(context, origin, options);
    const page = await context.newPage();
    await load(page, origin, path);
    return await task(page);
  } finally { await context.close(); }
}

async function load(page, origin, path) {
  page.on("pageerror", (error) => { boundary.errors++; console.error(error.message); });
  await page.goto(origin + path);
  await page.locator("#main").waitFor();
  await page.locator("#main .loading").first().waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await globalThis.document.fonts.ready;
    const visible = [...globalThis.document.images].filter((image) => {
      const rectangle = image.getBoundingClientRect();
      return rectangle.bottom > 0 && rectangle.top < globalThis.innerHeight && rectangle.width > 0;
    });
    await Promise.race([
      Promise.all(visible.map((image) => image.decode().catch(() => {}))),
      new Promise((done) => globalThis.setTimeout(done, 2000)),
    ]);
  });
}
const discovery = "/patient/discover";
const photo = (page, label) => page.screenshot({ path: join(out, label + ".png"), animations: "disabled" });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function axe(page) {
  await page.addScriptTag({ path: axePath });
  const issues = await page.evaluate(async (scope) => (await globalThis.axe.run(scope, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })), pilot);
  assert.deepEqual(issues, []);
}

async function layout(page, lang) {
  const m = await page.evaluate((scope) => {
    const d = globalThis.document;
    const shell = d.querySelector(scope);
    const native = [...shell.querySelectorAll("select")];
    const selects = native.map((select) => {
      const mirror = select.parentElement.querySelector("[data-discovery-select-value]");
      const r = new globalThis.Range();
      r.selectNodeContents(mirror);
      const frames = [...r.getClientRects()];
      const f = mirror.getBoundingClientRect();
      return {
        native: select instanceof globalThis.HTMLSelectElement,
        text: mirror.textContent,
        selected: select.selectedOptions[0].textContent,
        fits: frames.length > 0 && frames.every((b) => b.left >= f.left - 1 && b.right <= f.right + 1 && b.top >= f.top - 1 && b.bottom <= f.bottom + 1),
        lines: frames.length,
      };
    });
    const targets = [...shell.querySelectorAll("a,button,input,select,summary")]
      .filter((element) => element.getClientRects().length)
      .map((element) => element.getBoundingClientRect());
    const action = shell.querySelector("article a")?.getBoundingClientRect();
    return {
      width: globalThis.innerWidth, overflow: d.documentElement.scrollWidth - globalThis.innerWidth,
      dir: d.querySelector("[data-portal-shell]").dir, zoom: globalThis.devicePixelRatio,
      min: Math.min(...targets.flatMap((r) => [r.height, r.width])),
      firstAction: action?.bottom ?? null,
      dockTop: d.querySelector("[data-bottom-navigation]")?.getBoundingClientRect().top ?? null,
      selects,
    };
  }, pilot);
  assert.equal(m.dir, lang === "ar" ? "rtl" : "ltr");
  assert.ok(m.overflow <= 1 && m.min >= 43.9, JSON.stringify(m));
  assert.ok(m.selects.length === 2 && m.selects.every((s) => s.native && s.text === s.selected && s.fits), JSON.stringify(m));
  return m;
}

async function reflow(page, lang) {
  await page.locator("#expressive-doctor-search").focus();
  await page.keyboard.press("Tab");
  assert.ok(await page.locator("#expressive-specialty").evaluate((e) => e === globalThis.document.activeElement));
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.locator("#expressive-specialty").inputValue(), "internal-medicine");
  await page.keyboard.press("Tab");
  const clinic = page.locator("#expressive-clinic");
  assert.ok(await clinic.evaluate((e) => e === globalThis.document.activeElement));
  await page.keyboard.press("End");
  assert.equal(await clinic.inputValue(), "new-cairo");
  assert.ok(await clinic.evaluate((e) => globalThis.getComputedStyle(e.closest("label") ?? e.parentElement.parentElement).outlineStyle === "solid"));
  await clinic.evaluate((e) => e.scrollIntoView({ block: "center" }));
  assert.ok(await clinic.evaluate((e) => {
    const bar = globalThis.document.querySelector("[data-bottom-navigation]");
    return e.getBoundingClientRect().bottom <= (bar?.getBoundingClientRect().top || globalThis.innerHeight);
  }), "Focused clinic select clears fixed dock");
  await page.locator("#expressive-specialty").selectOption("");
  const data = await layout(page, lang);
  assert.match(data.selects[1].text, lang === "ar" ? /مركز إيست سايد الطبي/ : /Eastside Medical Center/);
  return data;
}

const fixedRoutes = [
  ["my-care", "PATIENT", "/patient"],
  ["profile", "PATIENT", "/patient/doctors/mariam-hassan"],
  ["clinic", "PATIENT", "/patient/clinics/cairo-clinic"],
  ["doctor", "CLINICIAN", "/doctor/schedule"],
  ["pharmacy", "PHARMACY_STAFF", "/pharmacy"],
  ["laboratory", "LAB_STAFF", "/laboratory"],
  ["admin", "ADMIN", "/admin"],
];

try {
  for (const lang of ["en", "ar"]) for (const theme of ["light", "dark"]) for (const width of [320, 390, 1440]) {
    await attempt(`${lang}-${theme}-${width}`, async () => {
      const opts = { lang, theme, width, height: width === 1440 ? 1000 : 844 };
      const key = `${lang}-${theme}-${width}`;
      await at(before, discovery, opts, async (p) => {
        await p.locator(".provider-card").first().waitFor();
        await photo(p, key + "-before");
      });
      return at(after, discovery, opts, async (p) => {
        await p.locator(pilot + " .provider-card").first().waitFor();
        const m = await layout(p, lang);
        if (width === 390) assert.ok(m.firstAction <= m.dockTop, "First profile CTA is clear of the mobile dock");
        assert.equal(await p.locator("[data-demo-indication]").count(), 1);
        assert.equal(await p.locator(pilot + " details").count(), 1);
        assert.equal(await p.locator(pilot + " article a[href^='/patient/doctors/']").count(), 3);
        if (lang === "ar") assert.match(await p.locator(pilot).innerText(), /د\. مريم حسن/);
        await photo(p, key + "-after");
        if (width !== 390) await axe(p);
        return { ...m, axe: width !== 390 };
      });
    });
  }
  for (const lang of ["ar", "en"]) {
    await attempt("native-select and 200% text " + lang, () => at(after, discovery, { lang, theme: "dark", width: 320, height: 1000 }, async (p) => {
      await p.locator("#expressive-clinic").waitFor();
      await p.evaluate(() => {
        const selectors = "[data-expressive-discovery] *, [data-bottom-navigation] *";
        const all = [...globalThis.document.querySelectorAll(selectors)];
        const sizes = all.map((e) => parseFloat(globalThis.getComputedStyle(e).fontSize));
        all.forEach((e, i) => e.style.setProperty("font-size", sizes[i] * 2 + "px", "important"));
      });
      const m = await reflow(p, lang);
      await photo(p, "text-200-" + lang);
      return m;
    }));
  }
  for (const lang of ["ar", "en"]) await attempt("long Discovery display names " + lang, () => at(after, discovery, {
    lang, width: 320, height: 844,
  }, async (p) => {
    const full = lang === "ar" ? "د. مريم حسن عبد الرحمن عبد العزيز السيد" : "Dr. Mariam Hassan Abdelrahman Abdelaziz El-Sayed";
    const fragments = await p.locator(pilot + " h3 bdi").first().evaluate((node, label) => {
      node.textContent = label;
      const box = node.closest("article").getBoundingClientRect();
      const range = new globalThis.Range();
      range.selectNodeContents(node);
      return [...range.getClientRects()].map((r) => r.left >= box.left && r.right <= box.right);
    }, full);
    assert.ok(fragments.length > 1 && fragments.every(Boolean));
  }));
  await attempt("native Forced Colors, reduced motion, initials fallback and profile navigation", () => at(after, discovery, {
    lang: "ar", forcedColors: "active", width: 320,
  }, async (p) => {
    await p.locator("[data-discovery-initials]").first().waitFor();
    assert.equal(await p.locator("[data-discovery-initials]").count(), 3);
    assert.equal(await p.locator("[data-discovery-initials]").nth(2).innerText(), "سع");
    assert.equal(await p.locator("#expressive-clinic").evaluate((e) => globalThis.getComputedStyle(e).appearance), "auto");
    assert.ok(await p.evaluate(() => globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches));
    await p.locator("#expressive-doctor-search").fill("عُمَر");
    assert.equal(await p.locator(pilot + " article").count(), 1);
    await p.locator(pilot + " article a").click();
    await p.waitForURL("**/patient/doctors/omar-khaled");
    assert.equal(await p.locator(pilot).count(), 0);
    await p.goBack();
    await p.locator("#expressive-doctor-search").fill("no-synthetic-match");
    await p.locator(".search-empty").waitFor();
    await p.locator(".search-empty button").click();
    assert.equal(await p.locator(pilot + " article").count(), 3);
    assert.ok(await p.locator("#expressive-doctor-search").evaluate((e) => e === globalThis.document.activeElement));
    await p.goto(after + "/patient/doctors/not-a-provider");
    await p.locator("#main .error-panel").waitFor();
    assert.equal(await p.locator(pilot).count(), 0);
  }));
  for (const [name, role, route] of fixedRoutes) await attempt("unchanged " + name, async () => {
    const captures = [];
    for (const [origin, suffix] of [[before, "before"], [after, "after"]]) {
      await at(origin, route, { role, width: 1440, height: 900 }, async (p) => {
        assert.equal(await p.locator(pilot).count(), 0);
        if (role === "LAB_STAFF") assert.match(await p.locator("#main").innerText(), /FUTURE \/ CONCEPT \/ NOT LIVE/);
        captures.push(digest(await photo(p, name + "-" + suffix)));
      });
    }
    assert.equal(captures[0], captures[1], "Unrelated viewport pixels differ");
    return { sha256: captures[0] };
  });
  for (const live of ["success", "failure"]) await attempt("intercepted Live-mode " + live, async () => {
    const observations = [];
    for (const origin of [before, after]) {
      const calls = [];
      observations.push(await at(origin, discovery, { live, calls, lang: "ar" }, async (p) => {
        await p.locator(live === "success" ? ".provider-card" : ".error-panel").waitFor();
        assert.equal(await p.locator(pilot + ", [data-demo-indication], [data-discovery-portrait]").count(), 0);
        const text = await p.locator("#main").innerText();
        assert.doesNotMatch(text, /د\. مريم حسن|CONTROLLED_PRIVATE_CANARY/);
        assert.equal(/Controlled directory identity/.test(text), live === "success");
        return { text, calls: [...calls].sort(), shot: digest(await p.screenshot({ animations: "disabled" })) };
      }));
    }
    assert.deepEqual(observations[0], observations[1]);
    return { paths: observations[0].calls };
  });
  await attempt("actual Chromium page zoom 200% at effective 320px AR/EN", async () => {
    const profile = await mkdtemp(join(tmpdir(), "expressive-ui-zoom-"));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath, viewport: null, colorScheme: "dark", args: ["--window-size=640,1740"],
    });
    try {
      await prepare(context, after, { lang: "ar" });
      const preferences = await context.newPage();
      await preferences.goto("chrome://settings/appearance");
      const zoom = preferences.getByRole("combobox", { name: "Page zoom", exact: true });
      await zoom.selectOption({ label: "200%" });
      assert.equal((await zoom.locator("option:checked").innerText()).trim(), "200%");
      const p = context.pages()[0];
      await load(p, after, discovery);
      await p.waitForFunction(() => globalThis.devicePixelRatio === 2);
      assert.equal((await reflow(p, "ar")).width, 320);
      const snap = async (lang) => {
        const cdp = await context.newCDPSession(p);
        const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
        const bytes = globalThis.Buffer.from(data, "base64");
        assert.equal(bytes.readUInt32BE(16), 640);
        await writeFile(join(out, "page-zoom-200-" + lang + ".png"), bytes);
        await cdp.detach();
      };
      await snap("ar");
      await p.getByRole("button", { name: "English", exact: true }).click();
      assert.equal((await reflow(p, "en")).width, 320);
      await snap("en");
    } finally {
      await context.close();
      await rm(profile, { recursive: true });
    }
  });
} finally {
  await browser.close();
  await writeFile(join(out, "results.json"), JSON.stringify({ results, failures, boundary }, null, 2) + "\n");
}
console.log(JSON.stringify({ cases: results.length, failures: failures.length, boundary }));
assert.deepEqual(boundary, { unsafe: 0, errors: 0 });
assert.deepEqual(failures, []);
