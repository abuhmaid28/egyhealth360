/** Package A: built production frontend + existing synthetic transport fixtures only. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { myCareDemoState, switchDemoWorkspace, verifyDp02Brand } from "./ui-my-care-browser.mjs";
import { clinicianMasterPage, masterTranslate, masterId } from "./ui-clinician-master-browser.mjs";

const palettes = { light: "rgb(248, 247, 251)", dark: "rgb(16, 18, 29)" };
export async function selectAppearance(page, theme) {
  const account = page.locator("header details:has(> summary[aria-label])").first();
  if (!(await account.evaluate(el => el.open))) await account.locator("summary").click();
  await account.locator("select").selectOption(theme);
  await account.locator("select").press("Escape");
  // Native select may consume the first Escape on some platforms.
  if (await account.evaluate(el => el.open)) await account.locator("summary").press("Escape");
  assert.equal(await account.evaluate(el => el.open), false);
}
const patientHomeScope = { path: "/patient", role: "PATIENT", mode: "demo" };
const doctorHomeScope = { path: "/doctor", role: "CLINICIAN", mode: "demo" };
const doctorSourceScope = { path: `/doctor/consultation/${masterId(3)}/documentation`, role: "CLINICIAN", mode: "live" };
function assertCanvas(sample, appearance) {
  assert.ok(Object.hasOwn(palettes, appearance), "canvas expected appearance");
  assert.equal(sample.count, 1, "canvas root count");
  assert.equal(sample.connected, true, "canvas connected root");
  assert.equal(sample.current, true, "canvas current root identity");
  assert.equal(sample.pathMatches, true, "canvas expected route");
  assert.equal(sample.roleMatches, true, "canvas expected session role");
  assert.equal(sample.modeMatches, true, "canvas expected session mode");
  assert.equal(sample.color, palettes[appearance], "canvas exact palette");
}
async function sampleCanvas(page, scope) {
  assert.ok(scope && ["PATIENT", "CLINICIAN"].includes(scope.role) && ["demo", "live"].includes(scope.mode), "canvas explicit scope");
  // Resolve and read in ONE synchronous browser evaluation. Locator.evaluate
  // can retain a node removed between remote handle acquisition and execution.
  // No wait, retry, cached element, global hook or palette fallback is involved.
  return page.evaluate(scope => {
    const selector = "[data-frontend-v2][data-portal-shell]";
    const roots = globalThis.document.querySelectorAll(selector), root = roots[0];
    return {
      count: roots.length,
      connected: !!root?.isConnected,
      current: !!root && root === globalThis.document.querySelector(selector),
      pathMatches: globalThis.location.pathname === scope.path,
      roleMatches: root?.getAttribute("data-portal-shell") === scope.role,
      modeMatches: root?.querySelector("[data-session-mode]")?.getAttribute("data-session-mode") === scope.mode,
      color: root ? globalThis.getComputedStyle(root).backgroundColor : null,
    };
  }, scope);
}
async function canvas(page, appearance, scope) {
  assertCanvas(await sampleCanvas(page, scope), appearance);
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
    const hero = root.querySelector(".clinician-hero h1");
    const heading = hero ? (() => {
      const style = globalThis.getComputedStyle(hero), foreground = rgb(style.color), bg = background(hero);
      const a = lum(foreground), b = lum(bg);
      return { foreground, background: bg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), size: style.fontSize, weight: style.fontWeight };
    })() : undefined;
    return { width: globalThis.innerWidth, scroll: globalThis.document.documentElement.scrollWidth, contrast: failures, clipped, heading };
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
async function canvasRegressions(browser, origin, locale) {
  const { page, context, calls, errors } = await patientPage(browser, origin, locale);
  try {
    await selectAppearance(page, "light");
    await canvas(page, "light", patientHomeScope);
    const valid = await sampleCanvas(page, patientHomeScope);
    await assert.rejects(() => canvas(page, "light", { ...patientHomeScope, path: "/doctor" }), /canvas expected route/);
    await assert.rejects(() => canvas(page, "light", { ...patientHomeScope, role: "CLINICIAN" }), /canvas expected session role/);
    await assert.rejects(() => canvas(page, "light", { ...patientHomeScope, mode: "live" }), /canvas expected session mode/);
    assert.throws(() => assertCanvas({ ...valid, current: false }, "light"), /canvas current root identity/);
    // Use the real theme control, not injected CSS or a fabricated DOM node.
    await selectAppearance(page, "dark");
    await canvas(page, "dark", patientHomeScope);
    await assert.rejects(() => canvas(page, "light", patientHomeScope), /canvas exact palette/);
    const oldRoot = await page.locator("[data-frontend-v2]").elementHandle();
    await page.locator("footer > button").click();
    await page.waitForURL("**/login");
    await page.locator(".demo-button").waitFor();
    const connected = await oldRoot.evaluate(el => el.isConnected);
    assert.equal(connected, false, "Real previous-session root is detached after logout");
    assert.throws(() => assertCanvas({ ...valid, connected }, "light"), /canvas connected root/);
    await assert.rejects(() => canvas(page, "light", patientHomeScope), /canvas root count/);
    assert.deepEqual(calls, [], "Canvas negative fixtures never acquire Live authority");
    assert.deepEqual(errors, []);
    return { locale, correctRoot: true, wrongRouteRejected: true, wrongRoleRejected: true, wrongModeRejected: true, noncurrentProjectionRejected: true, actualDarkRejectedAsLight: true, detachedPreviousRootRejected: true, missingRootRejected: true };
  } finally { await context.close(); }
}
// The rich Live workspace does not render the Demo schedule hero/AppointmentRow.
// Exercise the actual Demo route as well; no source or DOM substitute for the row.
async function doctorSchedule(browser, origin, locale, receipt, out) {
  for (const [fixture, name] of [["recorded", myCareDemoState().appointments[0].patientName], ["long-mixed", "Synthetic مريض RecordedIdentityWithoutSpacesForEmergencyWrapping"]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, colorScheme: "light" });
    const calls = [], external = [], errors = [];
    await context.route("**/*", route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { external.push(request.method()); return route.abort(); }
      if (url.pathname.startsWith("/api/")) { calls.push(request.method()); return route.fulfill({ status: 503, json: { error: { message: "SYNTHETIC_PRIVATE_TRANSPORT_CANARY" } } }); }
      return route.continue();
    });
    const state = myCareDemoState();
    state.session.role = "CLINICIAN";
    state.appointments[0].patientName = name;
    await context.addInitScript(({ state, locale }) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "demo");
      globalThis.localStorage.setItem("eh360-locale", locale);
      globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
    }, { state, locale });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(origin + "/doctor");
      await page.locator(".appointment-main h3").waitFor();
      await page.evaluate(() => globalThis.document.fonts.ready);
      for (const theme of ["light", "dark"]) {
        await selectAppearance(page, theme);
        await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
        await canvas(page, theme, doctorHomeScope);
        // Existing normal-motion controls transition colors for160ms. Measure
        // the selected appearance after actual completion, never by relaxing
        // contrast or ignoring a timeout. Reduced-motion and animation frames
        // remain distinct from this steady-state matrix.
        await page.waitForFunction(() => globalThis.document.querySelector("[data-frontend-v2]").getAnimations({ subtree: true }).every(a => a.playState === "finished" || a.playState === "idle"), null, { timeout: 2000 });
        for (const width of [320, 390]) for (const doubled of [false, true]) {
          await page.setViewportSize({ width, height: 1000 });
          if (doubled) assert.ok(await text200(page), "Actual computed font sizes doubled");
          const geometry = await page.locator(".appointment-row").first().evaluate(row => {
            const main = row.querySelector(".appointment-main"), h3 = main.querySelector("h3"), action = row.querySelector(".button");
            const bounds = el => { const b = el.getBoundingClientRect(); return { width: b.width, height: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
            const style = globalThis.getComputedStyle(h3), ctx = globalThis.document.createElement("canvas").getContext("2d");
            ctx.font = style.font;
            const walker = globalThis.document.createTreeWalker(h3, globalThis.NodeFilter.SHOW_TEXT);
            const spans = [];
            let pos = 0;
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const len = n.nodeValue?.length ?? 0;
              if (len) { spans.push({ node: n, start: pos, end: pos + len }); pos += len; }
            }
            const loc = (offset, isEnd) => {
              const s = spans.find(x => isEnd ? offset > x.start && offset <= x.end : offset >= x.start && offset < x.end) ?? spans[spans.length - 1];
              return [s.node, Math.max(0, Math.min(s.node.nodeValue.length, offset - s.start))];
            };
            const wordLines = [...h3.textContent.matchAll(/\S+/gu)].map(match => {
              const range = globalThis.document.createRange();
              const [sn, so] = loc(match.index, false);
              const [en, eo] = loc(match.index + match[0].length, true);
              range.setStart(sn, so); range.setEnd(en, eo);
              return { fits: ctx.measureText(match[0]).width <= h3.clientWidth - 1, lines: new Set([...range.getClientRects()].map(r => Math.round(r.top))).size };
            });
            return { row: bounds(row), identity: bounds(main), name: bounds(h3), action: bounds(action), text: h3.textContent, wordLines, scrollHeight: h3.scrollHeight, clientHeight: h3.clientHeight, overflow: style.overflow, textOverflow: style.textOverflow, lineClamp: style.webkitLineClamp };
          });
          assert.equal(geometry.text, name, "Complete exact recorded identity");
          assert.ok(geometry.identity.width >= geometry.row.width - 65, "Identity reserves all space after date and gap");
          assert.ok(geometry.action.top >= geometry.identity.bottom - 1, "Action cannot compete with patient name");
          assert.ok(geometry.name.left >= -1 && geometry.name.right <= width + 1);
          assert.ok(geometry.scrollHeight <= geometry.clientHeight + 1, "No hidden identity lines");
          assert.notEqual(geometry.overflow, "hidden"); assert.notEqual(geometry.textOverflow, "ellipsis");
          assert.equal(geometry.lineClamp, "none");
          assert.ok(geometry.wordLines.every(word => !word.fits || word.lines === 1), "Ordinary words do not wrap character by character");
          const measured = await presentation(page, `doctor-schedule/${locale}/${theme}/${width}/${doubled ? 200 : 100}/${fixture}`);
          assert.ok(measured.heading.ratio >= 4.5, "Hero normal-text contrast");
          assert.ok(!(await page.locator("body").innerText()).includes("SYNTHETIC_PRIVATE_TRANSPORT_CANARY"));
          receipt.scans.push({ role: "doctor-schedule", locale, theme, fixture, textScale: doubled ? 2 : 1, ...measured, identity: { width: geometry.identity.width, height: geometry.name.height, exact: true, untruncated: true, wordLines: geometry.wordLines } });
          if (!doubled && width === 390 && fixture === "recorded") {
            receipt.journeys.push({ role: "doctor-schedule", locale, theme, brand: await verifyDp02Brand(page, locale) });
            if (out) receipt.screens.push(await screenshot(page, out, `p2-doctor-${locale}-${theme}-390.png`, { role: "doctor-schedule", locale, theme, width, fixture }));
            if (process.env.UI_V2_AXE_PATH) {
              await page.addScriptTag({ path: process.env.UI_V2_AXE_PATH });
              const violations = await page.evaluate(async () => (await globalThis.window.axe.run(globalThis.document.querySelector("[data-frontend-v2]"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(n => n.target) })));
              assert.deepEqual(violations, [], `Doctor schedule ${locale}/${theme} axe`);
              receipt.axe.push({ role: "doctor-schedule", locale, theme, violations });
            }
          }
          if (doubled) await restoreText(page);
        }
      }
      assert.deepEqual(calls, [], "Doctor Demo has no API authority or POSTs");
      assert.deepEqual(external, [], "No external resources");
      assert.deepEqual(errors, []);
      receipt.journeys.push({ role: "doctor-schedule", locale, fixture, apiRequests: calls.length, externalRequests: external.length, postRequests: 0 });
    } finally { await context.close(); }
  }
}
export async function testV2PatientDoctor(browser, origin, shots) {
  // System palette must apply to F04's neutral shell before any application JS.
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({ javaScriptEnabled: false, colorScheme });
    await page.goto(origin + "/patient");
    const boot = page.locator("[data-initial-locale]");
    await boot.waitFor();
    assert.equal(await boot.evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[colorScheme]);
    assert.equal(await page.locator("body").evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[colorScheme]);
    assert.equal(await page.locator("noscript .boot").evaluate(el => globalThis.getComputedStyle(el).color), colorScheme === "dark" ? "rgb(246, 242, 255)" : "rgb(23, 20, 43)");
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
        assert.equal(await page.locator("body").evaluate(el => globalThis.getComputedStyle(el).backgroundColor), palettes[colorScheme]);
        assert.ok(!(await boot.innerText()).includes("SYNTHETIC_HELD_AUTH_CANARY"));
        assert.equal(await boot.locator("button,input,textarea,a").count(), 0);
      } finally { release(); await page.close(); }
    }
  }
  const out = process.env.UI_V2_PACKAGE_A_EVIDENCE_DIR ?? shots;
  if (out) await mkdir(out, { recursive: true });
  const receipt = { source: process.env.EH_UI_VISUAL_SOURCE_TREE ?? execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim(), browser: browser.version(), origin, synthetic: true, systemFirstPaint: ["light", "dark"], heldAuthRestorationCases: 8, screens: [], scans: [], axe: [], journeys: [], routeFailures: [], canvasRegressions: [] };
  const capture = async (page, role, locale, theme, width) => {
    if (!out) return;
    receipt.screens.push(await screenshot(page, out, `a-${role}-${locale}-${theme}-${width}.png`, { role, locale, theme, viewport: { width, height: 1000 }, fullPage: true, source: receipt.source, fixture: role === "patient" ? "myCareDemoState" : "clinicianMasterPage controlled GET" }));
  };
  for (const locale of ["ar", "en"]) {
    receipt.canvasRegressions.push(await canvasRegressions(browser, origin, locale));
    await doctorSchedule(browser, origin, locale, receipt, out);
    const patient = await patientPage(browser, origin, locale);
    const doctor = await clinicianMasterPage(browser, origin, locale);
    await doctor.page.locator(".documentation-content textarea").first().waitFor();
    for (const [role, { page }] of [["patient", patient], ["doctor", doctor]]) {
      const scope = role === "patient" ? patientHomeScope : doctorSourceScope;
      for (const system of ["light", "dark"]) {
        await selectAppearance(page, "system");
        await page.emulateMedia({ colorScheme: system });
        await canvas(page, system, scope);
      }
      for (const theme of ["light", "dark"]) {
        await selectAppearance(page, theme);
        // Opposing system scheme proves the explicit override wins.
        await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
        await canvas(page, theme, scope);
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => globalThis.document.fonts.ready);
          receipt.scans.push({ role, locale, theme, ...(await presentation(page, `${role}/${locale}/${theme}/${width}`)) });
          if (role === "patient") receipt.journeys.push({ role, locale, theme, width, brand: await verifyDp02Brand(page, locale) });
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
    await canvas(patient.page, "dark", { ...patientHomeScope, path: "/patient/discover" });
    await patient.page.goBack();
    await patient.page.locator("[data-appointment-anchor] h3").waitFor();
    await canvas(patient.page, "dark", patientHomeScope);
    await patient.page.emulateMedia({ colorScheme: "light" });
    await patient.page.reload();
    await patient.page.locator("[data-appointment-anchor] h3").waitFor();
    await canvas(patient.page, "light", patientHomeScope);
    assert.equal(await patient.page.locator("html").getAttribute("data-frontend-v2-theme"), null);
    // Supported existing destinations remain navigable in both languages and appearances.
    for (const path of ["/patient/discover", "/patient/doctors/mariam-hassan", "/patient/clinics/cairo-clinic", "/patient/appointments", "/patient/appointments/demo-my-care-visit", "/patient/record", "/patient/history", "/patient/follow-up", "/patient/settings"]) {
      await patient.page.goto(origin + path);
      await patient.page.locator("#main").waitFor();
      await patient.page.locator(".loading").waitFor({ state: "hidden" });
      await selectAppearance(patient.page, "dark");
      try { await presentation(patient.page, `${locale} ${path}`); } catch (error) { receipt.routeFailures.push(error.message); }
      if (path === "/patient/appointments/demo-my-care-visit") {
        const endpoints = patient.page.locator("[data-patient-detail-time] [data-appointment-endpoint]");
        assert.equal(await endpoints.count(), 2, "Demo appointment detail uses the same scoped12h endpoint presentation as Live");
        for (const text of await endpoints.allTextContents()) assert.match(text, locale === "ar" ? /صباحًا|مساءً/ : /\b(?:am|pm)\b/);
        await patient.page.setViewportSize({ width: 320, height: 1000 });
        assert.ok(await text200(patient.page));
        receipt.scans.push({ role: "patient", locale, theme: "dark", route: path, textScale: 2, ...(await presentation(patient.page, `${locale} Demo appointment detail320/text200`)) });
        await restoreText(patient.page);
        await patient.page.setViewportSize({ width: 390, height: 1000 });
      }
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
    await switchDemoWorkspace(patient.page,"CLINICIAN");
    await patient.page.waitForURL("**/doctor");
    // A URL commit can precede the newly mounted Demo workspace.
    await patient.page.locator('[data-portal-shell="CLINICIAN"] [data-session-mode="demo"]').waitFor();
    await canvas(patient.page, "light", doctorHomeScope);
    receipt.journeys.push({ locale, uncertainOriginalWrites: 1, presentationWrites: 0, editorDOMPreserved: true, themeReloadAccountReset: true, themeLogoutReset: true });
    await selectAppearance(patient.page, "dark");
    await patient.page.locator("footer > button").click();
    await patient.page.waitForURL("**/login");
    await patient.page.locator(".demo-button").waitFor();
    assert.equal(await patient.page.locator("html").getAttribute("data-frontend-v2-theme"), null);
    await patient.page.locator(".demo-button").click();
    // enter() sets the session before router.push replaces the generic shell
    // with PatientMyCare. Await that real destination, never a target color.
    await patient.page.waitForURL(origin + "/patient", { timeout: 10000 });
    await patient.page.locator('[data-portal-shell="PATIENT"] [data-appointment-anchor] h3').waitFor({ timeout: 10000 });
    await patient.page.locator("[data-frontend-v2]").waitFor();
    await canvas(patient.page, "light", patientHomeScope);
    receipt.journeys.push({ locale, demoReentryDestinationReady: true, atomicScopedCanvas: true });
    await patient.context.close(); await doctor.page.close();
  }
  assert.deepEqual(receipt.routeFailures, [], "Supported journey presentation failures");
  if (shots) await writeFile(resolve(shots, "package-a-browser-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(`Package A PASS: ${receipt.scans.length} visual/reflow scans, ${receipt.screens.length} screenshots, ${receipt.axe.length} axe scans; uncertain editor/key preserved.`);
  return receipt;
}
