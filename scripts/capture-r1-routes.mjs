/** Matched presentation evidence only. Demo fixtures and controlled Live responses are explicitly distinct from PostgreSQL proof. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./support/ui-my-care-browser.mjs";
import { clinicianMasterPage } from "./support/ui-clinician-master-browser.mjs";
const origin = process.env.R1_CAPTURE_ORIGIN ?? "http://127.0.0.1:3102";
const phase = process.env.R1_CAPTURE_PHASE ?? "after";
assert.ok(["before", "after"].includes(phase));
const output = resolve("docs/r1-repair-evidence", phase);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
});
const report = {
  phase,
  origin,
  evidence:
    "Demo fixtures + explicitly controlled Live responses; persistence is proved separately by the real browser suite",
  routes: [],
  errors: [],
};
const groups = [
  [
    "PATIENT",
    [
      "/patient",
      "/patient/discover",
      "/patient/doctors/mariam-hassan",
      "/patient/clinics/cairo-clinic",
      "/patient/appointments",
      "/patient/appointments/demo-my-care-visit",
      "/patient/record",
      "/patient/history",
      "/patient/medications",
      "/patient/laboratory",
      "/patient/follow-up",
      "/patient/settings",
    ],
  ],
  [
    "CLINICIAN",
    [
      "/doctor",
      "/doctor/schedule",
      "/doctor/availability",
      "/doctor/appointments/demo-my-care-visit",
      "/doctor/consultation/demo-my-care-visit",
      "/doctor/settings",
    ],
  ],
  ["PHARMACY_STAFF", ["/pharmacy", "/pharmacy/settings"]],
  ["LAB_STAFF", ["/laboratory", "/laboratory/settings"]],
  [
    "ADMIN",
    [
      "/admin",
      "/admin/organizations",
      "/admin/users",
      "/admin/directory",
      "/admin/scheduling",
      "/admin/settings",
    ],
  ],
];
try {
  for (const [role, routes] of groups) {
    for (const [locale, width] of [
      ["en", 1440],
      ["ar", 1440],
      ["en", 390],
      ["ar", 390],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (e) => report.errors.push(e.message));
      const state = myCareDemoState();
      state.session.role = role;
      await page.addInitScript(
        ({ locale, state }) => {
          globalThis.localStorage.setItem("eh360-locale", locale);
          globalThis.localStorage.setItem("eh360-ui-mode", "demo");
          globalThis.localStorage.setItem(
            "eh360-ui-demo-v1",
            JSON.stringify(state),
          );
        },
        { locale, state },
      );
      const selected =
        width === 1440 && locale === "en"
          ? routes
          : routes.filter(
              (path) =>
                path === routes[0] ||
                ["/patient/discover", "/doctor/schedule"].includes(path),
            );
      for (const path of selected) {
        await page.goto(origin + path);
        await page.locator("#main").waitFor();
        await page
          .locator("#main .loading")
          .first()
          .waitFor({ state: "hidden" });
        await page.evaluate(() => globalThis.document.fonts.ready);
        assert.equal(new URL(page.url()).origin, origin);
        assert.equal(
          await page.evaluate(() =>
            globalThis.localStorage.getItem("eh360-ui-mode"),
          ),
          "demo",
        );
        if (phase === "after")
          assert.equal(
            await page.locator(`[data-portal-shell="${role}"]`).count(),
            1,
          );
        assert.ok(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth,
          ),
          `${locale} ${width} overflow ${path}`,
        );
        const name =
          path.slice(1).replaceAll("/", "-") + `-${locale}-${width}.png`;
        await page.screenshot({ path: resolve(output, name), fullPage: true });
        report.routes.push({
          role,
          path,
          locale,
          width,
          mode: "demo",
          screenshot: name,
        });
      }
      await page.close();
    }
  }
  for (const locale of ["en", "ar"]) {
    const { page } = await clinicianMasterPage(
      browser,
      origin,
      locale,
      "signed",
    );
    await page.goto(
      origin +
        "/doctor/consultation/00000000-0000-4000-8000-000000000003/documentation",
    );
    await page.locator("[data-clinician-master]").waitFor();
    await page
      .getByLabel(
        locale === "en" ? "Private note content" : "محتوى الملاحظة الخاصة",
        { exact: true },
      )
      .waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => globalThis.document.fonts.ready);
      const name = `clinician-documentation-${locale}-${width}.png`;
      await page.screenshot({ path: resolve(output, name), fullPage: true });
      report.routes.push({
        role: "CLINICIAN",
        path: new URL(page.url()).pathname,
        locale,
        width,
        mode: "controlled Live signed projection",
        screenshot: name,
      });
    }
    await page.close();
  }
  // Existing real Live scope of the operational portals: identity and public directory only.
  for (const role of ["PHARMACY_STAFF", "LAB_STAFF", "ADMIN"]) {
    const root = {
      PHARMACY_STAFF: "/pharmacy",
      LAB_STAFF: "/laboratory",
      ADMIN: "/admin",
    }[role];
    for (const [locale, width] of [
      ["en", 1440],
      ["ar", 390],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.addInitScript((locale) => {
        globalThis.localStorage.setItem("eh360-ui-mode", "live");
        globalThis.localStorage.setItem("eh360-locale", locale);
      }, locale);
      await page.route("**/api/v1/**", (route) =>
        new URL(route.request().url()).pathname.endsWith("/auth/me")
          ? route.fulfill({
              json: {
                data: {
                  user: { role, email: "synthetic-review@example.invalid" },
                  csrfToken: "synthetic-review-only",
                },
              },
            })
          : route.fulfill({
              status: 503,
              json: { error: { message: "Unavailable" } },
            }),
      );
      await page.goto(origin + root);
      await page.locator("#main").waitFor();
      await page.evaluate(() => globalThis.document.fonts.ready);
      const name = `${role.toLowerCase()}-live-${locale}-${width}.png`;
      await page.screenshot({ path: resolve(output, name), fullPage: true });
      if (phase === "after") {
        assert.equal(
          await page.locator('[data-session-mode="live"]').count(),
          1,
        );
        assert.equal(await page.locator("[data-demo-utility]").count(), 0);
      }
      report.routes.push({
        role,
        path: root,
        locale,
        width,
        mode: "controlled Live unavailable scope",
        screenshot: name,
      });
      await page.close();
    }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    resolve(output, "routes.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
console.log(
  `PASS ${phase}: ${report.routes.length} matched route/state screenshots.`,
);
