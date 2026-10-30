import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);

export async function testLiveJourney(browser, origin, shots) {
  for (const locale of ["en", "ar"]) {
    const t = (key) => (locale === "ar" ? (dictionary.ar[key] ?? key) : key);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const calls = [],
      errors = [];
    let failRecord = false;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((locale) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", locale);
    }, locale);
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      calls.push(path);
      if (path.endsWith("/auth/me"))
        return route.fulfill({
          json: {
            data: {
              user: { role: "PATIENT", email: "synthetic@example.invalid" },
              csrfToken: "synthetic-csrf",
            },
          },
        });
      if (path.endsWith("/me/profile"))
        return route.fulfill({
          json: {
            data: {
              id: "11111111-1111-4111-8111-111111111111",
              displayName: "Synthetic Patient",
              dateOfBirth: null,
              sex: null,
            },
          },
        });
      if (failRecord && path.includes("blood-pressure"))
        return route.fulfill({ status: 503, json: {} });
      return route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
      });
    });
    await page.goto(origin + "/patient");
    await page
      .getByText(t("Your released care, ready to read"), { exact: true })
      .waitFor();
    const summaryStat = page
      .locator(".stat")
      .filter({ hasText: t("Visit summaries") });
    // A separate reader owns released summaries; never render a false zero from legacy data.
    assert.equal(
      await page
        .getByText(t("Open released summaries to view shared care"), {
          exact: true,
        })
        .count(),
      1,
    );
    assert.equal(await summaryStat.count(), 1);
    assert.equal(await summaryStat.getByText("—", { exact: true }).count(), 1);
    assert.equal(
      await page
        .locator('.quick-actions a[href="/patient/medications"]')
        .count(),
      0,
    );
    for (const width of [1440, 834, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1,
        ),
      );
    }
    if (shots) {
      await mkdir(shots, { recursive: true });
      await page.screenshot({
        path: resolve(shots, `59-${locale}-mobile-live-journey.png`),
        fullPage: true,
      });
    }
    await page.locator('.patient-journey a[href="/patient/summaries"]').click();
    await page
      .getByRole("heading", {
        name: t("Released visit summaries"),
        exact: true,
      })
      .waitFor();
    await page
      .getByText(t("No visible released summaries"), { exact: true })
      .waitFor();
    assert.ok(calls.includes("/api/v1/me/summaries"));
    await page.goto(origin + "/patient/record");
    await page
      .getByText(t("Your released care, ready to read"), { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByText(t("No released summaries yet"), { exact: true })
        .count(),
      0,
    );
    failRecord = true;
    await page.goto(origin + "/patient");
    await page.getByRole("alert").waitFor();
    // A legacy-record failure cannot trap the presenter or silently start a demo.
    await page.locator('.patient-journey a[href="/patient/summaries"]').click();
    await page
      .getByText(t("No visible released summaries"), { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-demo-v1")),
      null,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  // Denied storage still permits an in-memory multi-workspace demo across client navigation.
  const page = await browser.newPage();
  await page.addInitScript(() =>
    Object.defineProperty(globalThis.window, "localStorage", {
      get() {
        throw new globalThis.DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Explore the patient demo", exact: true })
    .click();
  await page.getByLabel("Demo workspace").selectOption("CLINICIAN");
  await page.waitForURL("**/doctor");
  await page.getByLabel("Demo workspace").selectOption("PATIENT");
  await page.waitForURL("**/patient");
  await page.getByText("Good morning, Ahmed.", { exact: true }).waitFor();
  await page.close();
  console.log(
    "PASS: Live patient journey, EN/AR responsive summary entry, independent recovery and storage-denied demo.",
  );
}
