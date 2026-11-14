/** F04: disposable browser contexts, real built frontend, intercepted synthetic transport only. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { myCareDemoState } from "./ui-my-care-browser.mjs";
import { clinicianMasterPage, masterTranslate } from "./ui-clinician-master-browser.mjs";

const loading = ["Loading your workspace…", "بنجهّز مساحة العمل…"];
const canary = "F04_PRIVATE_PAYLOAD_CANARY";
const login = { en: "Explore the patient demo", ar: "استكشف تجربة المريض" };
const direction = locale => locale === "ar" ? "rtl" : "ltr";

// Runs before application JS. Captures only locale enums and synthetic presentation evidence.
function observeStartup({ storage }) {
  const win = globalThis, doc = win.document;
  const trace = win.__f04 = { storage: [], samples: [], reads: [] };
  const sample = source => {
    if (!doc.body) return;
    const controls = [...doc.querySelectorAll("button")].map(node => node.textContent.trim());
    const shell = doc.querySelector("[data-initial-locale]");
    const record = {
      source, time: win.performance.now(), lang: doc.documentElement.lang,
      dir: doc.documentElement.dir, computed: win.getComputedStyle(doc.body).direction,
      shell: !!shell, controls, text: doc.body.innerText,
    };
    if (trace.samples.length < 400) trace.samples.push(record);
  };
  if (storage === "getter-denied") Object.defineProperty(win, "localStorage", {
    get() { throw new win.DOMException("Synthetic storage denial", "SecurityError"); },
  });
  else {
    const proto = win.Storage.prototype, get = proto.getItem, set = proto.setItem;
    proto.getItem = function (key) {
      if (key !== "eh360-locale") return get.call(this, key);
      trace.reads.push(doc.querySelector("[data-initial-locale]")?.outerHTML ?? null);
      if (storage === "methods-denied") { trace.storage.push(["get", "denied"]); throw new Error("Synthetic denial"); }
      const value = get.call(this, key);
      trace.storage.push(["get", value]);
      return value;
    };
    proto.setItem = function (key, value) {
      if (key === "eh360-locale") {
        trace.storage.push(["set", value]);
        if (["methods-denied", "setter-denied"].includes(storage)) throw new Error("Synthetic denial");
      }
      return set.call(this, key, value);
    };
  }
  const observer = new win.MutationObserver(() => sample("mutation"));
  observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: ["lang", "dir"] });
  function frame() {
    sample("raf");
    if (!trace.samples.some(s => s.controls.length) || win.performance.now() < 2500)
      win.requestAnimationFrame(frame);
  }
  win.requestAnimationFrame(frame);

}

export async function testInitialLocale(browser, origin, shots) {
  const results = [];
  if (shots) await mkdir(shots, { recursive: true });
  const cases = [];
  for (const width of [390, 1440]) {
    for (const path of ["/login", "/patient/appointments", "/doctor/schedule"])
      cases.push({ name: `ar-${width}-${path}`, width, path, stored: "ar" });
    for (const role of ["PATIENT", "CLINICIAN"])
      cases.push({ name: `demo-${role}-${width}`, width, stored: "ar", role });
  }
  for (const role of ["PATIENT", "CLINICIAN"])
    cases.push({ name: `demo-en-${role}`, width: 1440, stored: "en", expected: "en", role });
  for (const stored of [null, "en", "invalid"])
    cases.push({ name: `preference-${stored}`, stored, expected: "en" });
  for (const storage of ["getter-denied", "methods-denied", "setter-denied"])
    cases.push({ name: storage, storage, stored: "ar", expected: storage === "setter-denied" ? "ar" : "en", switch: true });
  for (const status of [401, 403, 404, 503])
    cases.push({ name: `auth-${status}`, status, stored: "ar" });
  for (const [role, path] of [["ADMIN", "/patient"], ["PATIENT", "/doctor/schedule"]])
    cases.push({ name: `wrong-role-${role}`, liveRole: role, path, stored: "ar" });
  for (const width of [320, 390, 1440])
    cases.push({ name: `held-js-${width}`, width, stored: "ar", held: true, textScale: width === 320 });
  cases.push({ name: "held-js-en-320-text200", width: 320, stored: "en", expected: "en", held: true, textScale: true });
  cases.push({ name: "cpu4-css-delay", stored: "ar", throttle: true });
  for (const role of [undefined, "PATIENT"])
    cases.push({ name: `no-js-${role ?? "anonymous"}`, stored: "ar", noJS: true, role });
  cases.push({ name: "no-js-320-text200", width: 320, stored: "ar", noJS: true, textScale: true });
  cases.push({ name: "switch-reload-back", stored: "ar", role: "PATIENT", navigation: true });

  for (const scenario of cases) {
    const expected = scenario.expected ?? "ar", width = scenario.width ?? 390;
    const demo = myCareDemoState();
    if (scenario.role) demo.session.role = scenario.role;
    const localStorage = [
      ...(scenario.stored === null ? [] : [{ name: "eh360-locale", value: scenario.stored }]),
      { name: "eh360-ui-mode", value: scenario.role ? "demo" : "live" },
      { name: "eh360-ui-demo-v1", value: JSON.stringify(demo) },
    ];
    const context = await browser.newContext({
      viewport: { width, height: 1000 }, locale: "ar-EG", javaScriptEnabled: !scenario.noJS,
      reducedMotion: "reduce", storageState: { cookies: [], origins: [{ origin, localStorage }] },
    });
    const page = await context.newPage(), errors = [], calls = [], unexpected = [];
    let release;
    const held = new Promise(done => { release = done; });
    try {
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) errors.push(message.text());
      });
      await context.addInitScript(observeStartup, { storage: scenario.storage, textScale: scenario.textScale });
      await context.route("**/*", async route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== origin) { unexpected.push(req.url()); return route.abort(); }
        if (url.pathname.startsWith("/api/")) {
          calls.push({ path: url.pathname, method: req.method() });
          if (url.pathname !== "/api/v1/auth/me" || req.method() !== "GET") unexpected.push(url.pathname);
          if (scenario.liveRole) return route.fulfill({ json: { data: {
            user: { role: scenario.liveRole, email: "synthetic-f04@example.invalid" }, csrfToken: "synthetic-f04-only",
          } } });
          return route.fulfill({ status: scenario.status ?? 401, json: { error: { message: canary } } });
        }
        if (req.resourceType() === "script" && scenario.held) await held;
        if (req.resourceType() === "stylesheet" && scenario.throttle)
          await new Promise(done => setTimeout(done, 1000));
        return route.continue();
      });
      if (scenario.throttle) {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      }
      const path = scenario.path ?? (scenario.role === "CLINICIAN" ? "/doctor/schedule" : scenario.role ? "/patient" : "/login");
      const response = await page.goto(origin + path, { waitUntil: scenario.held ? "commit" : "load" });
      const raw = await response.text(), headers = response.headers();
      assert.match(raw, /<html[^>]*lang="en"[^>]*dir="ltr"/);
      assert.ok(raw.includes("data-initial-locale"));
      assert.ok(raw.includes(loading[0]) && raw.includes(loading[1]));
      assert.ok(raw.includes("<noscript>") && raw.includes("فتح مساحة العمل دي محتاج JavaScript."));
      assert.ok(!/<button|<input|<textarea/.test(raw), "SSR contains no task controls");
      for (const privateValue of [canary, demo.profile.displayName, "synthetic-f04@example.invalid", "PRIVATE_SQL"])
        assert.ok(!raw.includes(privateValue), "SSR/RSC contains no account/clinical fixture");
      assert.match(headers["cache-control"], /private/);
      assert.match(headers["cache-control"], /no-store/);
      assert.equal(headers["set-cookie"], undefined);
      assert.match(headers.vary, /rsc/i);
      let initialShell;
      if (scenario.held || scenario.noJS) {
        await page.locator("[data-initial-locale]").waitFor();
        if (scenario.textScale) {
          const metrics = await page.evaluate(() => {
            const nodes = [...globalThis.document.querySelectorAll("[data-initial-locale], [data-initial-locale] *, noscript *")];
            const sizes = nodes.map(node => parseFloat(globalThis.getComputedStyle(node).fontSize));
            nodes.forEach((node, i) => { node.style.fontSize = `${sizes[i] * 2}px`; });
            return nodes.map((node, i) => [sizes[i], parseFloat(globalThis.getComputedStyle(node).fontSize)]);
          });
          assert.ok(metrics.length > 3 && metrics.every(([before, after]) => after === before * 2), "measured 200% text");
        }
        initialShell = await page.locator("[data-initial-locale]").evaluate(node => node.outerHTML);
        assert.equal(await page.locator("button,input,textarea,a").count(), 0);
        const status = page.getByRole("status");
        assert.equal(await status.getAttribute("aria-atomic"), "true");
        for (const [lang, dir, text] of [["en", "ltr", loading[0]], ["ar", "rtl", loading[1]]]) {
          const copy = status.locator(`[lang="${lang}"][dir="${dir}"]`);
          assert.equal(await copy.innerText(), text);
          assert.equal(await copy.evaluate(node => globalThis.getComputedStyle(node).direction), dir);
        }
        const ax = await page.locator("body").ariaSnapshot();
        assert.ok(ax.includes(loading[0]) && ax.includes(loading[1]));
        assert.ok(!ax.includes("button"));
        await page.evaluate(() => globalThis.document.fonts.ready);
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), scenario.name);
        await page.screenshot(shots ? { path: resolve(shots, `f04-${scenario.name.replaceAll(/[^a-z0-9-]/gi, "-")}.png`), fullPage: true } : {});
        if (scenario.noJS) {
          assert.ok((await page.locator("body").innerText()).includes("JavaScript is needed to open this workspace."));
          assert.ok((await page.locator("body").innerText()).includes("فتح مساحة العمل دي محتاج JavaScript."));
          const cdp = await context.newCDPSession(page);
          const axTree = await cdp.send("Accessibility.getFullAXTree");
          const readableNames = axTree.nodes.filter(node => !node.ignored).map(node => node.name?.value ?? "");
          for (const text of ["JavaScript is needed to open this workspace.", "فتح مساحة العمل دي محتاج JavaScript."])
            assert.ok(readableNames.includes(text), "native no-JS accessibility tree contains notice");
          assert.deepEqual(calls, []);
        } else {
          assert.deepEqual(calls, [], "no app/session mounted before initialization");
          release();
        }
      }
      if (!scenario.noJS) {
        if (scenario.liveRole) await page.getByRole("heading", { name: "اختر مساحة العمل" }).waitFor();
        else if (scenario.role) await page.locator("[data-my-care], [data-portal-shell]").first().waitFor();
        else await page.getByRole("button", { name: login[expected], exact: true }).waitFor();
        assert.equal(await page.locator("html").getAttribute("lang"), expected);
        assert.equal(await page.locator("html").getAttribute("dir"), direction(expected));
        assert.equal(await page.locator("body").evaluate(node => globalThis.getComputedStyle(node).direction), direction(expected));
        const trace = await page.evaluate(() => globalThis.__f04);
        const content = trace.samples.filter(s => s.controls.length);
        assert.ok(content.length, "observed first meaningful content");
        for (const sample of content) {
          assert.equal(sample.lang, expected, scenario.name);
          assert.equal(sample.dir, direction(expected));
          assert.equal(sample.computed, direction(expected));
          if (!scenario.role && !scenario.liveRole) assert.ok(sample.controls.includes(login[expected]));
          assert.ok(!sample.text.includes(canary));
        }
        if (!scenario.storage || scenario.storage === "setter-denied") {
          assert.deepEqual(trace.storage[0], ["get", scenario.stored]);
          assert.ok(trace.storage.slice(1).every(([op, value]) => op !== "set" || value === expected), "no transient English write for stored Arabic");
          assert.ok(trace.storage.some(([op]) => op === "set"));
        }
        assert.ok(trace.reads.every(html => html?.includes("data-initial-locale")), "storage read after shell hydration, before task mount");
        if (initialShell && !scenario.textScale) assert.equal(trace.reads[0], initialShell, "SSR and hydrated initial shell identical");
        if (scenario.switch) {
          await page.getByRole("button", { name: "العربية", exact: true }).click();
          assert.equal(await page.locator("html").getAttribute("lang"), "ar");
          await page.getByRole("button", { name: login.ar, exact: true }).waitFor();
          await page.reload();
          await page.getByRole("button", { name: login[expected], exact: true }).waitFor();
        }
        if (scenario.navigation) {
          const before = await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-demo-v1"));
          await page.getByRole("button", { name: "English", exact: true }).click();
          await page.reload();
          assert.equal(await page.locator("html").getAttribute("lang"), "en");
          await page.getByRole("button", { name: "العربية", exact: true }).click();
          await page.locator('a[href="/patient/appointments"]').filter({ visible: true }).first().click();
          await page.waitForURL("**/patient/appointments");
          await page.goBack();
          await page.locator("[data-my-care]").waitFor();
          assert.equal(await page.locator("html").getAttribute("lang"), "ar");
          assert.equal(await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-demo-v1")), before);
        }
        if (scenario.name === "ar-390-/login") {
          assert.equal(await page.evaluate(() => globalThis.document.activeElement.tagName), "BODY", "reveal does not move focus");
          const en = page.getByRole("button", { name: "English", exact: true });
          await en.focus();
          await page.keyboard.press("Tab");
          assert.equal(await page.locator(":focus").innerText(), "العربية");
          await page.keyboard.press("Enter");
          assert.equal(await page.locator(":focus").innerText(), "العربية");
          assert.equal(await page.locator(":focus").getAttribute("aria-pressed"), "true");
          assert.ok((await page.locator("body").ariaSnapshot()).includes('group "Language / اللغة"'));
        }
        assert.ok(!(await page.locator("body").innerText()).includes(canary));
        if (!scenario.role) assert.equal(await page.locator("[data-demo-utility]").count(), 0);
        results.push({ name: scenario.name, expected, storage: trace.storage, firstContent: content[0], samples: trace.samples.length });
      } else results.push({ name: scenario.name, noJS: true });
      assert.deepEqual(unexpected, []);
      assert.ok(calls.every(call => call.method === "GET" && call.path === "/api/v1/auth/me"));
      if (scenario.role) assert.deepEqual(calls, []);
      assert.deepEqual(await context.cookies(), []);
      assert.deepEqual(errors, [], scenario.name);
    } catch (error) {
      error.message = `${scenario.name}: ${error.message}`;
      throw error;
    } finally {
      release();
      await context.close();
    }
  }
  await testLocaleSessionLifetime(browser, origin);
  if (shots) await writeFile(resolve(shots, "f04-results.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(`PASS F04: ${results.length} isolated initial-locale scenarios + Live editor/pending-command lifetime; SSR/first client parity, before-paint locale/direction, storage order, no-JS/held JS, keyboard/AX, no hydration errors or SSR clinical data. Synthetic transport only; no real AT/hosted acceptance.`);
}

async function testLocaleSessionLifetime(browser, origin) {
  const { page, state } = await clinicianMasterPage(browser, origin, "en");
  let release;
  const pending = new Promise(done => { release = done; });
  const attempts = [], errors = [];
  try {
    page.on("pageerror", error => errors.push(error.message));
    const field = page.getByLabel("Private note content", { exact: true });
    await field.waitFor();
    const value = "F04 unchanged editor · نص سريري $& {name} 1.25 mL";
    await field.fill(value);
    const node = await field.elementHandle();
    await page.route("**/api/v1/**", async route => {
      if (route.request().method() === "GET") return route.fallback();
      attempts.push({ path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() });
      await pending;
      return route.abort("failed");
    });
    await page.getByRole("button", { name: "Save private note draft", exact: true }).click();
    await page.waitForFunction(() => [...globalThis.document.querySelectorAll('[role="status"]')].some(n => n.textContent.includes("Saving")));
    const authBefore = state.calls.filter(call => call.path.endsWith("/auth/me")).length;
    for (const locale of ["ar", "en", "ar"]) {
      await page.getByRole("button", { name: locale === "ar" ? "العربية" : "English", exact: true }).click();
      assert.equal(await node.evaluate(n => n.isConnected), true, "editor DOM instance retained");
      assert.equal(await page.getByLabel(masterTranslate(locale, "Private note content"), { exact: true }).inputValue(), value);
      assert.equal(await page.locator("[data-initial-locale]").count(), 0);
      assert.equal(state.calls.filter(call => call.path.endsWith("/auth/me")).length, authBefore, "Application/session not restarted");
      assert.equal(attempts.length, 1, "locale never retries pending command");
    }
    release();
    await page.getByRole("button", { name: masterTranslate("ar", "Retry unchanged private note"), exact: true }).waitFor();
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Retry unchanged private note", exact: true }).click();
    await page.getByRole("button", { name: "Retry unchanged private note", exact: true }).waitFor();
    assert.equal(attempts.length, 2);
    assert.match(attempts[0].body.operationKey, /^[0-9a-f-]{36}$/i, "actual original operation key recorded");
    assert.deepEqual(attempts[1], attempts[0], "explicit uncertain replay keeps original command/key/payload");
    assert.deepEqual(state.writes, [], "all attempted commands intercepted before existing synthetic handler");
    assert.deepEqual(errors, []);
  } finally {
    release();
    await page.close();
  }
}
