/** Stage A controlled presentation proof. NEVER real Slice 5 backend evidence. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import {
  startDocumentationHost,
  assertNoDocumentationFixturesInLiveBuild,
} from "./ui-documentation-host.mjs";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
export async function testDocumentation(browser, liveOrigin, shots) {
  await assertNoDocumentationFixturesInLiveBuild();
  // Ordinary production build remains unavailable, including attempted flag injection.
  const live = await browser.newPage();
  const liveCalls = [];
  const role = "CLINICIAN";
  await live.addInitScript(() => {
    globalThis.localStorage.setItem("eh360-ui-mode", "live");
    globalThis.localStorage.setItem("eh360-documentation-controlled", "true");
  });
  await live.route("**/api/v1/**", (route) => {
    liveCalls.push({
      path: new URL(route.request().url()).pathname,
      method: route.request().method(),
    });
    return route.fulfill({
      json: {
        data: {
          user: { role, email: "synthetic@example.invalid" },
          csrfToken: "controlled-boundary-csrf",
        },
      },
    });
  });
  await live.goto(
    liveOrigin +
      "/doctor/consultation/00000000-0000-4000-8000-000000000001/documentation?fixture=controlled",
  );
  await live.getByText("Consultation context could not be refreshed. Check your current access and try again.", { exact: true }).waitFor();
  assert.equal(await live.getByRole("textbox").count(), 0);
  assert.ok(liveCalls.every(call => (call.path === "/api/v1/auth/me" || call.path.endsWith("/consultation")) && call.method === "GET"), "flag injection cannot create opening context or activate fixtures");
  assert.equal(
    await live.evaluate(() =>
      globalThis.localStorage.getItem("eh360-ui-demo-v1"),
    ),
    null,
  );
  await live.close();
  const host = await startDocumentationHost();
  try {
    for (const locale of ["en", "ar"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(20000);
      const t = (key) => (locale === "ar" ? (dictionary.ar[key] ?? key) : key);
      const button = (key) =>
        page.getByRole("button", { name: t(key), exact: true });
      const field = (key) => page.getByLabel(t(key), { exact: true });
      const errors = [],
        calls = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/api/"))
          calls.push(request.url());
      });
      await page.addInitScript(
        (value) => globalThis.localStorage.setItem("eh360-locale", value),
        locale,
      );
      const controls = page.locator(".documentation-preview-controls");
      const openControls = async () => {
        if ((await controls.getAttribute("open")) === null)
          await controls.locator("summary").click();
      };
      const selectRole = async (value) => {
        await openControls();
        await field("Preview role").selectOption(value);
      };
      const scenario = async (value) => {
        await openControls();
        await field("Next explicit action scenario").selectOption(value);
      };
      const ready = () =>
        page.waitForFunction(
          () => !globalThis.document.querySelector(".loading"),
        );
      const responsive = async (label) => {
        for (const width of [1440, 834, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            () =>
              new Promise((done) =>
                globalThis.requestAnimationFrame(() =>
                  globalThis.requestAnimationFrame(done),
                ),
              ),
          );
          assert.ok(
            await page.evaluate(
              () =>
                globalThis.document.documentElement.scrollWidth <=
                globalThis.innerWidth + 1,
            ),
            `${locale} ${label} overflow at ${width}`,
          );
          if (await page.getByRole("dialog").count())
            assert.ok(
              await page
                .getByRole("dialog")
                .evaluate(
                  (el) =>
                    el.getBoundingClientRect().bottom <=
                    globalThis.innerHeight + 1,
                ),
            );
        }
      };
      const snap = async (name, selector) => {
        if (
          !(await page.getByRole("dialog").count()) &&
          (await controls.getAttribute("open")) !== null
        )
          await controls.locator("summary").click();
        await page.evaluate(() =>
          globalThis.scrollTo({ top: 0, left: 0, behavior: "instant" }),
        );
        await page.waitForFunction(() => globalThis.scrollY < 1);
        if (!shots) return;
        await mkdir(shots, { recursive: true });
        if (selector)
          await page
            .locator(selector)
            .screenshot({ path: resolve(shots, name + ".png") });
        else
          await page.screenshot({
            path: resolve(shots, name + ".png"),
            fullPage: false,
          });
      };
      await page.goto(host.origin);
      await field("Complaint").waitFor();
      await responsive("workspace / forms");
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.equal(await field("Review state").inputValue(), "NOT_REVIEWED");
      await field("Review state").selectOption("UNKNOWN");
      assert.equal(
        await page.locator(".documentation-review [role=status]").innerText(),
        t("Unknown — information is not available"),
      );
      assert.equal(await field("Review state").inputValue(), "UNKNOWN");
      await snap(
        locale === "en"
          ? "46-en-documentation-workspace"
          : "52-ar-documentation-workspace",
      );
      await openControls();
      await button("Hold preview response").click();
      await page
        .getByRole("status", { name: t("Loading"), exact: true })
        .waitFor();
      await responsive("loading state");
      await button("Continue preview response").click();
      await field("Complaint").waitFor();
      const complaint =
          "A concern to discuss during this visit · أمر أود مناقشته خلال الزيارة",
        privateText =
          "Private reflection for this synthetic visit · ملاحظة خاصة لهذه الزيارة التجريبية",
        publicText =
          "We discussed the concerns recorded for this visit. · ناقشنا الملاحظات المسجلة لهذه الزيارة.",
        instructions =
          "Refer to this summary when discussing the visit with your clinician. · راجع هذا الملخص عند مناقشة الزيارة مع طبيبك.";
      await field("Complaint").fill(complaint);
      await button("Add problem").click();
      await field("Problem").fill("Human problem · مشكلة");
      await button("Add problem").click();
      await field("Problem").nth(1).fill("Draft item to remove");
      await page
        .getByRole("button", {
          name: t("Remove problem {number}").replace("{number}", "2"),
          exact: true,
        })
        .click();
      assert.equal(await field("Problem").count(), 1);
      await button("Add diagnosis").click();
      await field("Diagnosis").fill("Human diagnosis · تشخيص مدخل");
      await field("Review state").selectOption("REVIEWED_POSITIVE");
      await button("Add allergy / intolerance item").click();
      await field("Item kind").selectOption("INTOLERANCE");
      await field("Substance or finding").fill("Human finding · نتيجة مدخلة");
      await field("Reaction (optional)").fill("Human reaction · تفاعل مدخل");
      await scenario("pending");
      await button("Save findings draft").click();
      await page
        .getByRole("status")
        .filter({ hasText: t("Saving…") })
        .waitFor();
      await ready();
      await page
        .getByText(
          t("Saved in the controlled preview. No Live backend write occurred."),
          { exact: true },
        )
        .waitFor();
      await scenario("conflict");
      await button("Save findings draft").click();
      await page
        .getByText(
          t(
            "This document changed. Refresh the visible record before making a new command.",
          ),
          { exact: true },
        )
        .waitFor();
      await button("Recheck visible documentation").click();
      await field("Complaint").waitFor();
      assert.equal(await field("Complaint").inputValue(), complaint);
      await field("Private note content").fill(privateText);
      await field("Patient summary content").fill(publicText);
      await field("Patient instructions").fill(instructions);
      await button("Save private note draft").click();
      await button("Sign private note").waitFor();
      assert.equal(
        await field("Patient summary content").inputValue(),
        publicText,
        "saving note preserves unrelated unsaved summary",
      );
      assert.equal(await field("Complaint").inputValue(), complaint);
      await snap(
        locale === "en"
          ? "47-en-documentation-private-boundary"
          : "53-ar-documentation-private-boundary",
        "#doc-private",
      );
      await button("Save summary draft").click();
      await page
        .getByText(
          t("Saved in the controlled preview. No Live backend write occurred."),
          { exact: true },
        )
        .waitFor();
      await selectRole("patient");
      await page
        .getByRole("heading", {
          name: t("No visible released summaries"),
          exact: true,
        })
        .waitFor();
      assert.ok(
        !(await page.locator("body").innerText()).includes(privateText),
      );
      assert.ok(!(await page.locator("body").innerText()).includes(publicText));
      assert.equal(await page.getByRole("textbox").count(), 0);
      for (const actor of ["other-clinician", "admin"]) {
        await selectRole(actor);
        await page.locator(".error-panel[role=alert]").waitFor();
        assert.equal(await page.getByRole("textbox").count(), 0);
        assert.ok(
          !(await page.locator("body").innerText()).includes(privateText),
        );
      }
      await selectRole("author");
      await field("Private note content").waitFor();
      await button("Sign private note").click();
      await page.getByRole("dialog").waitFor();
      assert.ok(
        !(await page.getByRole("dialog").innerText()).includes(publicText),
      );
      await button("Confirm private signing").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await field("Patient summary content").fill(publicText + " unsaved");
      assert.equal(await button("Review sign and release").isDisabled(), true);
      await field("Patient summary content").fill(publicText);
      await scenario("uncertain-after");
      await button("Review sign and release").click();
      await page.getByRole("dialog").waitFor();
      assert.ok(
        !(await page.getByRole("dialog").innerText()).includes(privateText),
      );
      await responsive("release dialog");
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (locale === "en") await snap("48-en-documentation-release-review");
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        await button("Review sign and release").evaluate(
          (el) => el === globalThis.document.activeElement,
        ),
        true,
      );
      await button("Review sign and release").click();
      await button("Confirm sign and release").click();
      await page
        .getByRole("dialog")
        .locator(".form-error[role=alert]")
        .waitFor();
      await button("Retry unchanged signing").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(await field("Patient summary content").isDisabled(), true);
      await selectRole("patient");
      await page.getByText(publicText, { exact: true }).waitFor();
      const patientBody = await page.locator("body").innerText();
      assert.ok(!patientBody.includes(privateText));
      assert.ok(!patientBody.includes(complaint));
      assert.equal(await page.getByRole("textbox").count(), 0);
      assert.ok(
        !/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.test(
          patientBody,
        ),
        "no UUIDs rendered",
      );
      await responsive("patient released summary");
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (locale === "en") await snap("51-en-patient-released-summary");
      else {
        await page.setViewportSize({ width: 390, height: 1000 });
        await snap("54-ar-mobile-released-summary");
      }
      await selectRole("author");
      await field("Private note content").waitFor();
      const summaryHistory = page.locator(".documentation-version").filter({
        has: page.getByRole("heading", {
          name: t("Patient summary"),
          exact: true,
        }),
      });
      await summaryHistory
        .getByRole("button", {
          name: t("Create signed correction"),
          exact: true,
        })
        .click();
      await field("New signed content").fill(
        "Corrected human summary · ملخص مصحح",
      );
      await field("Patient instructions")
        .last()
        .fill("Corrected human instructions");
      await field("Reason for addendum or correction").fill(
        "Human correction reason · سبب التصحيح",
      );
      await responsive("correction dialog");
      await button("Confirm signed version").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        await page
          .locator("#doc-history")
          .getByText(publicText, { exact: true })
          .count(),
        1,
        "original remains preserved",
      );
      await page
        .locator(".documentation-version")
        .filter({ hasText: "Corrected human summary · ملخص مصحح" })
        .getByRole("button", { name: t("Add signed addendum"), exact: true })
        .click();
      await field("New signed content").fill(
        "Human appended detail · إضافة بشرية",
      );
      await field("Reason for addendum or correction").fill(
        "Additional human reason",
      );
      await button("Confirm signed version").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await responsive("signed version history");
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (locale === "en")
        await snap("49-en-documentation-signed-history", "#doc-history");
      await scenario("uncertain-before");
      await button("Restrict wrong-patient document").click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await button("Confirm wrong-patient restriction").isDisabled(),
        true,
      );
      const picker = field("Exact affected item / version");
      const options = await picker.locator("option").allTextContents();
      const targetIndex = options.findIndex(
        (value) =>
          value.includes(t("Patient summary")) &&
          value.includes(t("Signed and released")),
      );
      assert.ok(targetIndex > 0);
      await picker.selectOption({ index: targetIndex });
      await field("Restriction reason").fill(
        "Explicit synthetic wrong-patient concern · قلق محدد",
      );
      await page
        .getByRole("checkbox", {
          name: t(
            "I checked the exact item and understand that this restricts visibility without moving the record.",
          ),
          exact: true,
        })
        .check();
      await responsive("wrong-patient restriction dialog");
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (locale === "en") await snap("50-en-documentation-restriction");
      await button("Confirm wrong-patient restriction").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await ready();
      const restrictionWarning =
        "The restriction result is uncertain. Visible documentation has been refreshed. Review the exact item before explicitly retrying; no restriction success is assumed.";
      await page
        .getByRole("status")
        .filter({ hasText: t(restrictionWarning) })
        .waitFor();
      assert.ok(
        (await page.locator("#doc-history").innerText()).includes(publicText),
        "uncertain-before restriction does not claim success",
      );
      await scenario("uncertain-after");
      await button("Restrict wrong-patient document").click();
      await picker.selectOption({ index: targetIndex });
      await field("Restriction reason").fill(
        "Explicit synthetic wrong-patient concern · قلق محدد",
      );
      await page
        .getByRole("checkbox", {
          name: t(
            "I checked the exact item and understand that this restricts visibility without moving the record.",
          ),
          exact: true,
        })
        .check();
      await button("Confirm wrong-patient restriction").click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await ready();
      await page
        .getByRole("status")
        .filter({ hasText: t(restrictionWarning) })
        .waitFor();
      assert.ok(
        !(await page.locator("#doc-history").innerText()).includes(publicText),
      );
      assert.ok(
        !(await page.locator("#doc-history").innerText()).includes(
          "Corrected human summary",
        ),
      );
      await selectRole("patient");
      await page
        .getByRole("heading", {
          name: t("No visible released summaries"),
          exact: true,
        })
        .waitFor();
      const restrictedBody = await page.locator("body").innerText();
      for (const hidden of [
        publicText,
        privateText,
        "Corrected human summary",
        "Human appended detail",
      ])
        assert.ok(!restrictedBody.includes(hidden));
      await selectRole("other-patient");
      await page
        .getByRole("heading", {
          name: t("No visible released summaries"),
          exact: true,
        })
        .waitFor();
      await selectRole("author");
      await openControls();
      await field("Current clinical authority in fixture").uncheck();
      await page.locator(".error-panel[role=alert]").waitFor();
      assert.equal(await page.getByRole("textbox").count(), 0);
      await field("Current clinical authority in fixture").check();
      await field("Complaint").waitFor();
      await field("Expired session in fixture").check();
      await page
        .getByText(t("Your session has ended. Please sign in again."), {
          exact: true,
        })
        .waitFor();
      assert.equal(await page.getByRole("textbox").count(), 0);
      const storage = await page.evaluate(() =>
        Object.fromEntries(Object.entries(globalThis.localStorage)),
      );
      assert.deepEqual(Object.keys(storage), ["eh360-locale"]);
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        locale === "ar" ? "rtl" : "ltr",
      );
      assert.deepEqual(calls, [], "controlled docs never use backend routes");
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await host.stop();
  }
  await assertNoDocumentationFixturesInLiveBuild();
  console.log(
    "PASS Phase 5 Stage A EN/AR/RTL controlled documentation: normal build rejects forged opening context/fixture flags; findings/allergy uncertainty, private boundaries, saved drafts, explicit release/uncertain retry, patient/other-clinician/ADMIN privacy, immutable amendments, wrong-patient masking, session/access denial, memory-only state, keyboard focus and 1440/834/390. NOT backend persistence proof.",
  );
}
