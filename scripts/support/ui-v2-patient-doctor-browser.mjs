/** Package A: built production frontend + existing synthetic transport fixtures only. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { myCareDemoState, openDemoUtility } from "./ui-my-care-browser.mjs";
import { clinicianMasterPage, masterTranslate } from "./ui-clinician-master-browser.mjs";

const palettes = { light: "rgb(248, 247, 251)", dark: "rgb(16, 18, 29)" };
export async function selectAppearance(page, theme) {
  const account = page.locator("header details").first();
  if (!(await account.evaluate(el => el.open))) await account.locator("summary").click();
  await account.locator("select").selectOption(theme);
  await account.locator("select").press("Escape");
  // Native select may consume the first Escape on some platforms.
  if (await account.evaluate(el => el.open)) await account.locator("summary").press("Escape");
  assert.equal(await account.evaluate(el => el.open), false);
}
async function canvas(page, appearance) {
  assert.equal(await page.locator("[data-frontend-v2]").evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[appearance]);
}
async function presentation(page, label) {
  const result = await page.evaluate(() => {
    const root = globalThis.document.querySelector("[data-frontend-v2]");
    const shown = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const rgb = value => value.match(/[\d.]+/g)?.map(Number);
    const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
    const background = el => {
      for (; el; el = el.parentElement) { const c = rgb(globalThis.getComputedStyle(el).backgroundColor); if (c && (c.length < 4 || c[3] === 1)) return c; }
      return [255, 255, 255];
    };
    const failures = [];
    for (const el of root.querySelectorAll("*")) {
      if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const style = globalThis.getComputedStyle(el), a = lum(rgb(style.color)), b = lum(background(el));
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700;
      if (ratio < (large ? 3 : 4.5)) failures.push({ text: el.textContent.trim().slice(0, 65), className: el.className, ratio });
    }
    const clipped = [...root.querySelectorAll("button, a, input:not([type=checkbox]), select, textarea, summary")]
      .filter(shown).filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > globalThis.window.innerWidth + 1 || r.left < -1 || r.right > globalThis.window.innerWidth + 1;
      }).map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 45) }));
    return { width: globalThis.innerWidth, scroll: globalThis.document.documentElement.scrollWidth, contrast: failures, clipped };
  });
  assert.ok(result.scroll <= result.width + 1, `${label}: horizontal overflow ${JSON.stringify(result)}`);
  assert.deepEqual(result.clipped, [], `${label}: clipped controls`);
  assert.deepEqual(result.contrast, [], `${label}: text contrast ${JSON.stringify(result.contrast)}`);
  return result;
}
async function text200(page) {
  return page.evaluate(() => {
    const nodes = [...globalThis.document.querySelectorAll("[data-frontend-v2], [data-frontend-v2] *")];
    const sizes = nodes.map(el => parseFloat(globalThis.getComputedStyle(el).fontSize));
    nodes.forEach((el, i) => { el.style.fontSize = `${sizes[i] * 2}px`; });
    return sizes.every((size, i) => parseFloat(globalThis.getComputedStyle(nodes[i]).fontSize) === size * 2);
  });
}
async function restoreText(page) {
  await page.locator("[data-frontend-v2], [data-frontend-v2] *").evaluateAll(nodes => nodes.forEach(el => el.style.removeProperty("font-size")));
}
async function screenshot(page, dir, name, metadata) {
  await page.evaluate(() => { globalThis.document.activeElement?.blur(); globalThis.window.scrollTo(0, 0); });
  await page.evaluate(() => globalThis.document.fonts.ready);
  const path = resolve(dir, name);
  await page.screenshot({ path, fullPage: true });
  const data = await readFile(path);
  return { name, sha256: createHash("sha256").update(data).digest("hex"), bytes: data.length, ...metadata };
}
async function patientPage(browser, origin, locale) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", storageState: { cookies: [], origins: [{ origin, localStorage: [
    { name: "eh360-locale", value: locale }, { name: "eh360-ui-mode", value: "demo" }, { name: "eh360-ui-demo-v1", value: JSON.stringify(myCareDemoState()) },
  ] }] } });
  const page = await context.newPage();
  const calls = [], errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", e => { if (/hydration|did not match|Minified React error/i.test(e.text())) errors.push(e.text()); });
  await page.route("**/api/v1/**", route => { calls.push({ method: route.request().method(), path: new URL(route.request().url()).pathname }); return route.fulfill({ status: 503, json: { error: { message: "SYNTHETIC_PRIVATE_TRANSPORT_CANARY" } } }); });
  await page.goto(origin + "/patient");
  await page.locator("[data-appointment-anchor] h3").waitFor();
  return { page, context, calls, errors };
}
export async function testV2PatientDoctor(browser, origin, shots) {
  // System palette must apply to F04's neutral shell before any application JS.
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ javaScriptEnabled: false, colorScheme });
    await page.goto(origin + "/patient");
    const boot = page.locator("[data-initial-locale]");
    await boot.waitFor();
    assert.equal(await boot.evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[colorScheme]);
    assert.equal(await page.locator("button,input,textarea,a").count(), 0);
    assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"), null);
    await page.close();
  }
  // Hold only synthetic auth: neither the generic nor professional restoring shell
  // may flash the inherited Light palette between neutral locale and themed content.
  for (const locale of ["ar", "en"]) for (const colorScheme of ["light", "dark"]) {
    for (const path of ["/patient/appointments", "/doctor/consultation/00000000-0000-4000-8000-000000000003/documentation"]) {
      const page = await browser.newPage({ colorScheme });
      await page.addInitScript(locale => { globalThis.localStorage.setItem("eh360-ui-mode", "live"); globalThis.localStorage.setItem("eh360-locale", locale); }, locale);
      let release;
      const held = new Promise(done => { release = done; });
      await page.route("**/api/v1/auth/me", async route => { await held; await route.fulfill({ status: 401, json: { error: { message: "SYNTHETIC_HELD_AUTH_CANARY" } } }); });
      try {
        await page.goto(origin + path);
        const boot = page.locator(path.startsWith("/doctor") ? "[data-clinician-master-boot]" : "main.boot:not([data-initial-locale])");
        await boot.waitFor();
        assert.equal(await boot.evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[colorScheme]);
        assert.ok(!(await boot.innerText()).includes("SYNTHETIC_HELD_AUTH_CANARY"));
        assert.equal(await boot.locator("button,input,textarea,a").count(), 0);
      } finally { release(); await page.close(); }
    }
  }
  const out = process.env.UI_V2_PACKAGE_A_EVIDENCE_DIR ?? shots;
  if (out) await mkdir(out, { recursive: true });
  const receipt = { source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), browser: browser.version(), origin, synthetic: true, systemFirstPaint: ["light", "dark"], heldAuthRestorationCases: 8, screens: [], scans: [], axe: [], journeys: [], routeFailures: [] };
  const capture = async (page, role, locale, theme, width) => {
    if (!out) return;
    receipt.screens.push(await screenshot(page, out, `a-${role}-${locale}-${theme}-${width}.png`, { role, locale, theme, viewport: { width, height: 1000 }, fullPage: true, source: receipt.source, fixture: role === "patient" ? "myCareDemoState" : "clinicianMasterPage controlled GET" }));
  };
  for (const locale of ["ar", "en"]) {
    const patient = await patientPage(browser, origin, locale);
    const doctor = await clinicianMasterPage(browser, origin, locale);
    await doctor.page.locator(".documentation-content textarea").first().waitFor();
    for (const [role, { page }] of [["patient", patient], ["doctor", doctor]]) {
      for (const system of ["light", "dark"]) {
        await selectAppearance(page, "system");
        await page.emulateMedia({ colorScheme: system });
        await canvas(page, system);
      }
      for (const theme of ["light", "dark"]) {
        await selectAppearance(page, theme);
        // Opposing system scheme proves the explicit override wins.
        await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
        await canvas(page, theme);
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => globalThis.document.fonts.ready);
          receipt.scans.push({ role, locale, theme, ...(await presentation(page, `${role}/${locale}/${theme}/${width}`)) });
          if (locale === "ar" && width === 390 || locale === "en" && width === 1440) await capture(page, role, locale, theme, width);
        }
        if (process.env.UI_V2_AXE_PATH) {
          await page.addScriptTag({ path: process.env.UI_V2_AXE_PATH });
          const axe = await page.evaluate(async () => {
            const result = await globalThis.window.axe.run(globalThis.document.querySelector("[data-frontend-v2]"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
            return result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(n => n.target) }));
          });
          assert.deepEqual(axe, [], `${role}/${locale}/${theme} axe`);
          receipt.axe.push({ role, locale, theme, violations: axe });
        }
      }
      await page.setViewportSize({ width: 320, height: 1000 });
      if (role === "doctor") await page.locator(".v2-source-context").evaluate(el => { el.open = true; });
      assert.ok(await text200(page));
      receipt.scans.push({ role, locale, theme: "dark", textScale: 2, ...(await presentation(page, `${role}/${locale}/320/text200`)) });
      await restoreText(page);
      await page.setViewportSize({ width: 390, height: 1000 });
      const skip = page.locator('a[href="#main"]').first();
      await skip.focus(); await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => globalThis.document.activeElement.id), "main");
      const cdp = await page.context().newCDPSession(page);
      const ax = await cdp.send("Accessibility.getFullAXTree");
      assert.ok(ax.nodes.some(n => n.role?.value === "main"));
      assert.ok(!JSON.stringify(ax).includes("SYNTHETIC_PRIVATE_TRANSPORT_CANARY"));
      await cdp.detach();
    }
    // Theme survives ordinary Next navigation and browser Back, then clears on reload.
    await selectAppearance(patient.page, "dark");
    await patient.page.locator('header nav a[href="/patient/discover"]').click();
    await patient.page.waitForURL("**/patient/discover");
    await patient.page.locator("#main h1").waitFor();
    await canvas(patient.page, "dark");
    await patient.page.goBack();
    await patient.page.locator("[data-appointment-anchor] h3").waitFor();
    await canvas(patient.page, "dark");
    await patient.page.emulateMedia({ colorScheme: "light" });
    await patient.page.reload();
    await patient.page.locator("[data-appointment-anchor] h3").waitFor();
    await canvas(patient.page, "light");
    assert.equal(await patient.page.locator("html").getAttribute("data-frontend-v2-theme"), null);
    // Supported existing destinations remain navigable in both languages and appearances.
    for (const path of ["/patient/discover", "/patient/doctors/mariam-hassan", "/patient/clinics/cairo-clinic", "/patient/appointments", "/patient/appointments/demo-my-care-visit", "/patient/record", "/patient/history", "/patient/follow-up", "/patient/settings"]) {
      await patient.page.goto(origin + path);
      await patient.page.locator("#main").waitFor();
      await patient.page.locator(".loading").waitFor({ state: "hidden" });
      await selectAppearance(patient.page, "dark");
      try { await presentation(patient.page, `${locale} ${path}`); } catch (error) { receipt.routeFailures.push(error.message); }
      assert.ok(!/SYNTHETIC_PRIVATE_TRANSPORT_CANARY/.test(await patient.page.locator("body").innerText()));
      receipt.journeys.push({ locale, path, theme: "dark" });
    }
    // Actual uncertain command stays immutable across presentation and hash history changes.
    const p = doctor.page, t = value => masterTranslate(locale, value);
    const input = p.locator("#doc-private textarea");
    await input.fill("PACKAGE_A_SYNTHETIC_UNCERTAIN_NOTE");
    const handle = await input.elementHandle();
    await p.getByRole("button", { name: t("Save private note draft"), exact: true }).click();
    await p.getByRole("button", { name: t("Retry unchanged private note"), exact: true }).waitFor();
    assert.equal(doctor.state.writes.length, 1);
    const original = globalThis.structuredClone(doctor.state.writes[0]);
    for (const theme of ["light", "dark", "system"]) {
      await selectAppearance(p, theme);
      for (const id of ["live-follow-up", "review-close", "live-documentation"]) {
        await p.locator(`[data-clinician-local-tasks] a[href="#${id}"]`).click();
        assert.equal(await p.evaluate(() => globalThis.document.activeElement.id), id);
        assert.equal(await input.evaluate((el, original) => el === original, handle), true);
        assert.equal(await input.inputValue(), "PACKAGE_A_SYNTHETIC_UNCERTAIN_NOTE");
      }
    }
    await p.goBack();
    await p.getByRole("button", { name: locale === "ar" ? "English" : "العربية", exact: true }).click();
    assert.equal(await input.evaluate((el, original) => el === original, handle), true);
    assert.equal(doctor.state.writes.length, 1, "Theme/locale/hash/back never retry a clinical command");
    assert.deepEqual(doctor.state.writes[0], original);
    assert.deepEqual(patient.calls, [], "Demo never acquires Live authority");
    assert.deepEqual(patient.errors, []); assert.deepEqual(doctor.state.errors, []);
    const storage = await p.evaluate(() => ({ local: Object.keys(globalThis.localStorage), session: Object.keys(globalThis.sessionStorage), cookie: globalThis.document.cookie }));
    assert.deepEqual(storage.local.sort(), ["eh360-locale", "eh360-ui-mode"]);
    assert.deepEqual(storage.session, []); assert.equal(storage.cookie, "");
    await selectAppearance(patient.page, "dark");
    await openDemoUtility(patient.page);
    await patient.page.locator('select[aria-label="Demo workspace"],select[aria-label="مساحة العرض التجريبي"]').selectOption("CLINICIAN");
    await patient.page.waitForURL("**/doctor");
    await canvas(patient.page, "light");
    receipt.journeys.push({ locale, uncertainOriginalWrites: 1, presentationWrites: 0, editorDOMPreserved: true, themeReloadAccountReset: true, themeLogoutReset: true });
    await selectAppearance(patient.page, "dark");
    await patient.page.locator("footer > button").click();
    await patient.page.waitForURL("**/login");
    await patient.page.locator(".demo-button").waitFor();
    assert.equal(await patient.page.locator("html").getAttribute("data-frontend-v2-theme"), null);
    await patient.page.locator(".demo-button").click();
    await patient.page.locator("[data-frontend-v2]").waitFor();
    await canvas(patient.page, "light");
    await patient.context.close(); await doctor.page.close();
  }
  assert.deepEqual(receipt.routeFailures, [], "Supported journey presentation failures");
  if (shots) await writeFile(resolve(shots, "package-a-browser-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(`Package A PASS: ${receipt.scans.length} visual/reflow scans, ${receipt.screens.length} screenshots, ${receipt.axe.length} axe scans; uncertain editor/key preserved.`);
  return receipt;
}
