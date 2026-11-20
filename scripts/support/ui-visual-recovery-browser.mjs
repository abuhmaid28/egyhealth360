import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

const origin = process.argv[2];
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const output = resolve(process.argv[3]);
const baseline = process.argv.includes("--baseline");
const paths = {
  PATIENT: "/patient",
  CLINICIAN: "/doctor",
  PHARMACY_STAFF: "/pharmacy",
  LAB_STAFF: "/laboratory",
  ADMIN: "/admin",
};
const axe = process.env.UI_V2_AXE_PATH;
const cases = [];
const traffic = { external: 0, api: 0, posts: 0, errors: 0 };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
  headless: true,
});

async function open(role, locale, scheme, width, height = 950, reducedMotion = "reduce") {
  const ctx = await browser.newContext({
    viewport: { width, height }, colorScheme: scheme, reducedMotion, serviceWorkers: "block",
  });
  await ctx.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { traffic.external++; return route.abort(); }
    if (url.pathname.startsWith("/api/v1/")) { traffic.api++; return route.abort(); }
    if (route.request().method() === "POST") { traffic.posts++; return route.abort(); }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on("pageerror", () => traffic.errors++);
  await page.addInitScript(({ locale, state }) => {
    globalThis.localStorage.setItem("eh360-locale", locale);
    if (!state) return;
    globalThis.localStorage.setItem("eh360-ui-mode", "demo");
    globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
  }, { locale, state: role ? syntheticState(role) : null });
  return { page, ctx };
}

function syntheticState(role) {
  const state = myCareDemoState();
  state.session.role = role;
  if (role === "CLINICIAN") state.session.name = state.appointments[0].provider.displayName;
  state.consultations.push({
    ...state.consultations[0],
    appointmentId: "synthetic-recovery-staff",
    released: true,
    medication: "Synthetic training item",
    dosage: "Synthetic source directions",
    lab: "Synthetic training request",
    notes: "VISUAL_PRIVATE_CANARY",
  });
  return state;
}

async function render(page, route, role) {
  await page.goto(origin + route);
  if (role) {
    await page.locator(`[data-portal-shell="${role}"]`).waitFor();
    await page.locator("#main :is(.loading, [role=status])").filter({ hasText: /Loading permitted work|بنحمّل العمل/ }).waitFor({ state: "hidden" });
    await page.locator("#main .loading").first().waitFor({ state: "hidden" });
  } else await page.locator(".demo-button").waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
}

async function measure(page, id, { picture = false, axeCheck = false } = {}) {
  const geometry = await page.evaluate(() => ({
    width: globalThis.innerWidth,
    scrollWidth: globalThis.document.documentElement.scrollWidth,
    direction: globalThis.document.documentElement.dir,
    headerHeight: Math.round(globalThis.document.querySelector("header, main > section")?.getBoundingClientRect().height ?? 0),
  }));
  assert.ok(geometry.scrollWidth <= geometry.width + 1, `${id}: ${JSON.stringify(geometry)}`);
  let violations = null;
  if (axe && axeCheck) {
    await page.addScriptTag({ path: axe });
    violations = await page.evaluate(async () => (await globalThis.axe.run({
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })));
  }
  cases.push({ id, ...geometry, violations });
  if (picture) await page.screenshot({ path: resolve(output, id + ".png"), fullPage: false });
  if (violations) assert.deepEqual(violations, [], id);
}

async function zoomText(page) {
  await page.evaluate(() => {
    const nodes = [...globalThis.document.querySelectorAll("main *, header *, footer *, [data-bottom-navigation] *")];
    const sizes = nodes.map((node) => globalThis.getComputedStyle(node).fontSize);
    nodes.forEach((node, i) => node.style.setProperty("font-size", `${parseFloat(sizes[i]) * 2}px`, "important"));
  });
}

const representative = [
  ["entry", undefined, "/"],
  ["my-care", "PATIENT", "/patient"],
  ["discovery", "PATIENT", "/patient/discover"],
  ["profile", "PATIENT", "/patient/doctors/mariam-hassan"],
  ["clinic", "PATIENT", "/patient/clinics/cairo-clinic"],
  ["booking-review", "PATIENT", "/patient/doctors/mariam-hassan"],
  ["appointment", "PATIENT", "/patient/appointments/demo-my-care-visit"],
  ["history", "PATIENT", "/patient/history"],
  ["summary", "PATIENT", "/patient/record"],
  ["follow-up", "PATIENT", "/patient/follow-up"],
  ["doctor", "CLINICIAN", "/doctor"],
  ["schedule", "CLINICIAN", "/doctor/schedule"],
  ["availability", "CLINICIAN", "/doctor/availability"],
  ["consultation", "CLINICIAN", "/doctor/consultation/demo-my-care-visit"],
  ["pharmacy", "PHARMACY_STAFF", "/pharmacy"],
  ["laboratory", "LAB_STAFF", "/laboratory"],
  ["admin", "ADMIN", "/admin"],
  ["organizations", "ADMIN", "/admin/organizations"],
  ["users", "ADMIN", "/admin/users"],
];

try {
  for (const [locale, scheme, width] of [["en", "light", 1440], ["ar", "dark", 390]]) {
    for (const [view, role, uri] of representative) {
      const { page, ctx } = await open(role, locale, scheme, width);
      await render(page, uri, role);
      if (view === "booking-review") {
        await page.locator(".slots button").first().click();
        await page.getByRole("button", { name: locale === "ar" ? /راجع.*الموعد|مراجعة.*الموعد/ : "Review appointment" }).click();
        await page.getByRole("dialog").waitFor();
      }
      if (role === "LAB_STAFF") assert.match(await page.locator("#main").innerText(), /FUTURE \/ CONCEPT \/ NOT LIVE|مستقبلي \/ تصوّر \/ غير متاح فعليًا/);
      if (role && role !== "CLINICIAN") assert.doesNotMatch(await page.locator("#main").innerText(), /VISUAL_PRIVATE_CANARY/);
      if (!baseline) {
        assert.equal(await page.locator("[data-demo-utility], footer [data-workspace-switch]").count(), 0);
        if (role) assert.equal(await page.locator("header [data-workspace-switch]").count(), 1);
      }
      await measure(page, `${view}-${locale}-${scheme}-${width}`, { picture: true, axeCheck: !baseline && ["entry", "my-care", "discovery", "profile", "doctor", "consultation", "pharmacy", "laboratory", "admin"].includes(view) });
      await ctx.close();
    }
  }
  if (!baseline) {
    for (const [locale, scheme] of [["ar", "light"], ["en", "dark"]]) {
      for (const width of [320, 390, 768, 1440]) {
        for (const [role, uri] of [[null, "/"], ...Object.entries(paths)]) {
          const { page, ctx } = await open(role, locale, scheme, width, 700);
          await render(page, uri, role);
          await measure(page, `${role ?? "entry"}-${locale}-${scheme}-${width}`);
          await zoomText(page);
          await measure(page, `${role ?? "entry"}-${locale}-${scheme}-${width}-text200`);
          await ctx.close();
        }
      }
    }
    const { page, ctx } = await open("PATIENT", "ar", "dark", 320, 568);
    await render(page, "/patient", "PATIENT");
    await zoomText(page);
    const switcher = page.locator("[data-workspace-switch]");
    const summary = switcher.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const options = switcher.getByRole("button");
    assert.equal(await options.count(), 5);
    assert.equal(await switcher.locator("[aria-current=true]").count(), 1);
    assert.equal(await switcher.locator("summary").evaluate((element) => globalThis.getComputedStyle(element).transitionDuration), "0s");
    const menu = options.first().locator("xpath=..");
    assert.equal(await menu.evaluate((element) => globalThis.getComputedStyle(element).animationName), "none");
    const last = options.last();
    await last.scrollIntoViewIfNeeded();
    assert.ok(await last.isVisible());
    assert.ok(await last.evaluate((element) => element.getBoundingClientRect().bottom <= globalThis.innerHeight + 1));
    await last.focus();
    await page.keyboard.press("Escape");
    assert.equal(await summary.evaluate((element) => element === globalThis.document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.waitForURL(origin + "/doctor");
    await page.waitForFunction(() => globalThis.document.activeElement?.id === "main");
    cases.push({ id: "keyboard-short-viewport-text200-escape-role-focus-reduced-motion", pass: true });
    await ctx.close();

    const hostile = await open(undefined, "en", "light", 390);
    await hostile.page.addInitScript(() => {
      if (globalThis.sessionStorage.getItem("recovery-hostile-seeded")) return;
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.sessionStorage.setItem("recovery-hostile-seeded", "1");
    });
    await render(hostile.page, "/admin", undefined);
    assert.equal(await hostile.page.locator('input[type=email], input[type=password], [data-portal-shell], [data-workspace-switch]').count(), 0);
    await hostile.page.getByRole("button", { name: "Explore the patient demo" }).click();
    await hostile.page.locator('[data-session-mode="demo"]').waitFor();
    await hostile.page.goto(origin + "/patient/discover?__eh_ui_test_scenario=error");
    await hostile.page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event("eh-visual-test-scenario")));
    await hostile.page.locator('.provider-card').first().waitFor();
    assert.equal(await hostile.page.locator('.provider-card').count(), 3);
    cases.push({ id: "live-preference-no-fallback-test-scenario-inert", pass: true });
    await hostile.ctx.close();
  }
  assert.deepEqual(traffic, { external: 0, api: 0, posts: 0, errors: 0 });
} finally {
  await browser.close();
  await writeFile(resolve(output, "results.json"), JSON.stringify({ origin, baseline, cases, traffic }, null, 2));
}
console.log(JSON.stringify({ baseline, cases: cases.length, axe: cases.filter((x) => x.violations !== null && x.violations !== undefined).length, traffic }));
