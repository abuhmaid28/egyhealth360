import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

// Reuse the authored catalog; no automatic clinical/free-text translation.
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
export async function testPolish(browser, origin, shots) {
  for (const locale of ["en", "ar"]) {
    const t = (text) =>
      locale === "ar" ? (dictionary.ar[text] ?? text) : text;
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);
    console.log(`Phase 3 ${locale}: navigation and search`);
    const errors = [];
    const requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/")) requests.push(r.url());
    });
    const button = (text) =>
      page.getByRole("button", { name: t(text), exact: true });
    const link = (text) =>
      page.getByRole("link", { name: t(text), exact: true });
    const ready = async () => {
      await page.locator(".loading").waitFor({ state: "hidden" });
    };
    const responsive = async (name) => {
      for (const width of [1440, 834, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth + 1,
          ),
          `${locale} ${name} overflow at ${width}`,
        );
      }
    };
    await page.goto(origin);
    if (locale === "ar") await button("العربية").click();
    await button("Explore the patient demo").click();
    await ready();
    await responsive("dashboard");
    // Closed mobile navigation is absent from keyboard/accessibility traversal.
    assert.equal(
      await page.locator(".sidebar").evaluate((el) => el.inert),
      true,
    );
    await button("Open navigation").click();
    await page.locator(".sidebar.open").waitFor();
    assert.equal(
      await page.locator(".app-body").evaluate((el) => el.inert),
      true,
    );
    const first = page.locator(".sidebar button").first();
    await first.focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page
        .locator(".sidebar")
        .evaluate((el) => el.contains(globalThis.document.activeElement)),
      true,
    );
    await page.keyboard.press("Escape");
    await button("Open navigation").waitFor();
    assert.equal(
      await button("Open navigation").evaluate(
        (el) => el === globalThis.document.activeElement,
      ),
      true,
    );
    assert.equal(
      await page.evaluate(() => globalThis.document.body.style.overflow),
      "",
    );
    await button("Open navigation").click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name: t("Find a doctor"), exact: true })
      .click();
    await ready();
    assert.equal(
      await page.locator(".sidebar").evaluate((el) => el.inert),
      true,
    );
    await page
      .getByLabel(t("Search doctors"), { exact: true })
      .fill("no-match-synthetic");
    await page
      .getByRole("heading", { name: t("No doctors match your search") })
      .waitFor();
    await button("Clear search & filters").last().click();
    assert.equal(
      await page.getByLabel(t("Search doctors"), { exact: true }).inputValue(),
      "",
    );
    await page.getByLabel(t("Search doctors"), { exact: true }).fill("Mariam");
    await responsive("discovery");
    console.log(`Phase 3 ${locale}: booking review and confirmation`);
    await link("View profile & availability").click();
    await page.locator(".slots button").first().waitFor();
    await responsive("doctor profile");
    const reviewButton = button("Review appointment");
    assert.equal(await reviewButton.isDisabled(), true);
    await page.locator(".slots button").first().click();
    await page
      .getByLabel(t("What brings you in?"), { exact: true })
      .fill("زيارة follow-up $& دون ترجمة");
    await reviewButton.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog
      .getByText(
        t(
          "Demo booking only. No live slot is reserved and no clinical access is granted.",
        ),
        { exact: true },
      )
      .waitFor();
    assert.equal(await dialog.locator('[aria-current="step"]').count(), 1);
    await responsive("booking dialog");
    assert.ok(
      await dialog.evaluate(
        (el) => el.getBoundingClientRect().bottom <= globalThis.innerHeight + 1,
      ),
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await reviewButton.evaluate(
        (el) => el === globalThis.document.activeElement,
      ),
      true,
    );
    await reviewButton.click();
    await button("Confirm booking").click();
    await button("Continue as doctor").waitFor();
    await responsive("confirmation");
    const appointmentUrl = page.url();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin + "/patient");
    await ready();
    await page.locator(".hero-compact").waitFor();
    if (shots) {
      await mkdir(shots, { recursive: true });
      await page.screenshot({
        path: resolve(
          shots,
          locale === "ar"
            ? "30-ar-upcoming-dashboard.png"
            : "29-upcoming-dashboard.png",
        ),
        fullPage: true,
      });
    }
    await page.goto(appointmentUrl);
    await ready();
    await button("Continue as doctor").click();
    await page.waitForURL("**/doctor/schedule");
    await ready();
    await responsive("doctor schedule");
    console.log(`Phase 3 ${locale}: consultation review and handoffs`);
    await link("Open patient").click();
    await link("Open consultation workspace").click();
    await ready();
    const complaint = "شكوى بشرية محفوظة without translation $&";
    const privateNote = "PHASE3 PRIVATE NOTE — لا تُنشر";
    await page
      .getByLabel(t("Presenting complaint / problems"), { exact: true })
      .fill(complaint);
    await page
      .getByLabel(t("Clinician-entered diagnosis / assessment"), {
        exact: true,
      })
      .fill("Human assessment — تقييم");
    await page
      .getByLabel(t("Private clinician note"), { exact: true })
      .fill(privateNote);
    await page
      .getByLabel(t("Medication name (optional)"), { exact: true })
      .fill("Synthetic medication");
    await page
      .getByLabel(t("Dose, route & instructions"), { exact: true })
      .fill("Human-entered directions");
    await page
      .getByLabel(t("Laboratory request (optional)"), { exact: true })
      .fill("Synthetic test");
    await page
      .getByLabel(t("Released patient instructions / summary"), { exact: true })
      .fill("تعليمات المريض unchanged");
    await page
      .getByLabel(t("Follow-up intention (optional)"), { exact: true })
      .fill("مراجعة لاحقة unchanged");
    await responsive("consultation workspace");
    await link("Instructions & follow-up").click();
    assert.ok(
      await page
        .locator("#consultation-instructions")
        .evaluate((el) => el.getBoundingClientRect().top >= 0),
    );
    await button("Review & release summary").click();
    await dialog.waitFor();
    await dialog.getByText(complaint, { exact: true }).waitFor();
    await dialog.getByText(t("Not yet reviewed"), { exact: true }).waitFor();
    assert.equal(
      await dialog.getByText(privateNote, { exact: true }).count(),
      0,
    );
    await responsive("release dialog");
    await button("Release demo summary").click();
    await button("Continue to pharmacy").waitFor();
    assert.equal(
      await page
        .getByLabel(t("Presenting complaint / problems"), { exact: true })
        .isDisabled(),
      true,
    );
    await button("Continue to pharmacy").click();
    await page.waitForURL("**/pharmacy");
    await ready();
    await responsive("pharmacy");
    await button("Continue to laboratory").click();
    await page.waitForURL("**/laboratory");
    await ready();
    await responsive("laboratory");
    await button("See the patient record").click();
    await page.waitForURL("**/patient/record");
    await ready();
    assert.equal(await page.getByText(privateNote, { exact: true }).count(), 0);
    await page
      .getByText("تعليمات المريض unchanged", { exact: true })
      .first()
      .waitFor();
    await responsive("patient record");
    assert.deepEqual(
      requests,
      [],
      "Demo continuation must never issue Booking or clinical HTTP requests",
    );
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        json: {
          data: {
            user: { email: "synthetic-live@example.invalid", role: "PATIENT" },
            csrfToken: "synthetic-csrf",
          },
        },
      }),
    );
    await page.evaluate(() =>
      globalThis.localStorage.setItem("eh360-ui-mode", "live"),
    );
    await page.goto(origin + "/patient/appointments");
    await page
      .getByRole("heading", {
        name: t("Live booking is not connected"),
        exact: true,
      })
      .waitFor();
    await responsive("unavailable live booking");
    assert.equal(await page.locator(".journey-continuation").count(), 0);
    assert.ok(
      requests.every((url) => new URL(url).pathname === "/api/v1/auth/me"),
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS: Phase 3 EN/AR continuity, booking service boundaries, complete release review, private-note exclusion, search recovery, drawer keyboard/focus, dialog Escape and responsive matrix at 1440/834/390.",
  );
}
