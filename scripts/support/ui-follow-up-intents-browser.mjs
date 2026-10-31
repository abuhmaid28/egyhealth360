/** Controlled HTTP projection and Live failure presentation, separate from real persistence proof. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
export async function testFollowUpPresentation(browser, origin) {
  for (const locale of ["en", "ar"]) {
    const t = (key) => (locale === "ar" ? (dictionary.ar[key] ?? key) : key);
    const page = await browser.newPage({
      viewport: { width: 390, height: 1000 },
    });
    const errors = [],
      reads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((locale) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", locale);
    }, locale);
    let state = "loading",
      finish;
    const barrier = new Promise((r) => (finish = r));
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/me"))
        return route.fulfill({
          json: {
            data: {
              user: { role: "PATIENT", email: "synthetic@example.invalid" },
              csrfToken: "synthetic-csrf",
            },
          },
        });
      assert.equal(path, "/api/v1/me/follow-up-intents");
      reads.push(path);
      if (state === "loading") await barrier;
      if (state === "failed")
        return route.fulfill({
          status: 503,
          json: { error: { message: "PRIVATE_SQL_CANARY" } },
        });
      if (state === "expired") return route.fulfill({ status: 401, json: {} });
      if (state === "ready")
        return route.fulfill({
          json: {
            data: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                consultationId: "22222222-2222-4222-8222-222222222222",
                versions: [
                  {
                    id: "33333333-3333-4333-8333-333333333333",
                    state: "SIGNED_RELEASED",
                    instruction: "Synthetic released follow-up · تعليمات بشرية",
                    desiredWindow: {
                      startAt: "2026-11-15T07:00:00.000Z",
                      endAt: "2026-11-22T07:00:00.000Z",
                      timeZone: "Africa/Cairo",
                    },
                    createdAt: "2026-11-01T10:00:00.000Z",
                    signedAt: "2026-11-01T10:00:00.000Z",
                    releasedAt: "2026-11-01T10:00:00.000Z",
                    predecessorId: null,
                    reason: null,
                    effective: true,
                  },
                ],
                links: [],
                history: { page: 1, pageSize: 1, total: 1 },
                linkHistory: { page: 1, pageSize: 1, total: 0 },
              },
            ],
            meta: { page: 1, pageSize: 20, total: 1 },
          },
        });
      return route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
      });
    });
    await page.goto(origin + "/patient/follow-up");
    await page.locator(".loading").waitFor();
    state = "empty";
    finish();
    await page
      .getByText(t("No released follow-up instructions"), { exact: true })
      .waitFor();
    state = "ready";
    await page
      .getByRole("button", {
        name: t("Refresh follow-up instructions"),
        exact: true,
      })
      .click();
    await page
      .getByText("Synthetic released follow-up · تعليمات بشرية", {
        exact: true,
      })
      .waitFor();
    for (const width of [1440, 834, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth + 1,
        ),
      );
    }
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    state = "failed";
    await page
      .getByRole("button", {
        name: t("Refresh follow-up instructions"),
        exact: true,
      })
      .click();
    await page
      .getByText(
        t("Follow-up instructions could not be refreshed. Please try again."),
        { exact: true },
      )
      .waitFor();
    const body = await page.locator("body").innerText();
    assert.ok(!body.includes("PRIVATE_SQL_CANARY"));
    assert.ok(!body.includes("Synthetic released follow-up"));
    assert.ok(!body.includes("Demo error preview"));
    assert.ok(body.includes(t("Live API")));
    assert.equal(
      await page.evaluate(() =>
        globalThis.localStorage.getItem("eh360-ui-mode"),
      ),
      "live",
    );
    state = "expired";
    await page
      .getByRole("button", { name: t("Try again"), exact: true })
      .click();
    await page
      .getByText(t("Your session has ended. Please sign in again."), {
        exact: true,
      })
      .first()
      .waitFor();
    assert.ok(reads.length >= 4);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS controlled Slice6 patient UI: loading/empty/released/failure/expiry, EN/AR/RTL responsive, no draft editor or raw payload, Live failure remains Live.",
  );
}
