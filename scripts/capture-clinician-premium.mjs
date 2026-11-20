import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import {
  clinicianMasterPage,
  assertClinicianMaster,
  masterTranslate,
} from "./support/ui-clinician-master-browser.mjs";
const phase = process.env.CLINICIAN_CAPTURE_PHASE ?? "after";
assert.ok(["before", "after"].includes(phase));
if (phase === "before") {
  for (const path of [
    "apps/web/src/components/application.tsx",
    "apps/web/src/components/documentation.tsx",
    "apps/web/src/components/live-documentation.tsx",
    "apps/web/src/components/clinician-consultation.module.css",
  ]) {
    assert.ok(
      (await readFile(path)).equals(
        execFileSync("git", [
          "show",
          `e28dbfb652c35ab12ce50496aade7caac0402203:${path}`,
        ]),
      ),
      "Before capture requires the exact original product source",
    );
  }
}
const output = resolve("docs/ui-reference/clinician-premium-evidence", phase);
const origin = process.env.CLINICIAN_ORIGIN ?? "http://127.0.0.1:3235";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const report = [];
const runtimePaths = ['application.tsx','documentation.tsx','live-documentation.tsx','consultation-close.tsx','follow-up-intents.tsx', 'clinician-consultation.tsx','clinician-consultation-presentation.tsx','clinician-consultation.module.css', 'patient-my-care.module.css'].map((p) => `apps/web/src/components/${p}`);
runtimePaths.push('apps/web/src/lib/clinician-consultation-copy.ts');
const runtimeHashes = async () => Object.fromEntries(await Promise.all(runtimePaths.map(async (path) => [path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const capturedSources = await runtimeHashes();
try {
  for (const locale of ["en", "ar"]) {
    const { page, state } = await clinicianMasterPage(browser, origin, locale);
    const t = (value) => masterTranslate(locale, value);
    await page.locator(".documentation-content textarea").first().waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    const shot = (name, fullPage = false) =>
      page.screenshot({
        path: resolve(output, `${name}-${locale}.png`),
        fullPage,
      });
    if (phase === "after") {
      report.push({ locale, ...(await assertClinicianMaster(page)) });
      const logistics = await page.locator(".master-visit").innerText();
      assert.ok(logistics.includes("12:00") && logistics.includes("UTC+02:00"));
      assert.ok(
        !/[٠-٩]/u.test(logistics),
        "Clinical/logistics values retain Latin digits in Arabic",
      );
    }
    if (phase === "after") {
      const premium = await page.evaluate(() => {
        const css = (selector) => globalThis.getComputedStyle(globalThis.document.querySelector(selector));
        return {
          anchorBackground: css(".master-context-ribbon").backgroundImage,
          patientNameColor: css(".master-context-ribbon h1").color,
          navBackground: css(".master-local-tasks").backgroundColor,
          railLabels: [...globalThis.document.querySelectorAll(".master-source-rail dt")].map(el => el.textContent),
          privateAccent: css("#doc-private").borderInlineStartColor,
          summaryAccent: css("#doc-summary").borderInlineStartColor,
        };
      });
      assert.ok(premium.anchorBackground.includes("rgb(11, 37, 69)") && premium.anchorBackground.includes("rgb(11, 110, 127)"));
      assert.equal(premium.patientNameColor, "rgb(255, 255, 255)");
      assert.equal(premium.navBackground, "rgb(255, 255, 255)");
      assert.equal(premium.privateAccent, "rgb(11, 37, 69)");
      assert.equal(premium.summaryAccent, "rgb(11, 110, 127)");
      report.push({ locale, premium });
    }
    await shot("desktop");
    await shot("full", true);
    if (phase === "before") {
      await page.close();
      continue;
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
    );
    await shot("1280", true);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('.documentation-outline a[href="#doc-private"]').focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator('.documentation-outline a[href="#doc-private"]')
        .evaluate((el) => globalThis.getComputedStyle(el).outlineWidth),
      "3px",
    );
    await shot("focus");
    await page.evaluate(() => {
      const values = [
        ...globalThis.document.querySelectorAll("[data-clinician-master] *"),
      ].map((el) => [el, parseFloat(globalThis.getComputedStyle(el).fontSize)]);
      values.forEach(([el, size]) => (el.style.fontSize = `${size * 2}px`));
    });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
      `${locale} 200% text overflow`,
    );
    await shot("text-200", true);
    await page.close();
    const interaction = await clinicianMasterPage(browser, origin, locale);
    const p = interaction.page;
    await p.locator(".documentation-content textarea").first().waitFor();
    await p
      .getByRole("button", { name: t("Review sign and release"), exact: true })
      .click();
    await p.getByRole("dialog").waitFor();
    assert.ok(
      !(await p.getByRole("dialog").innerText()).includes(
        "SYNTHETIC_PRIVATE_LIVE_CANARY",
      ),
    );
    await p.screenshot({
      path: resolve(output, `release-review-${locale}.png`),
    });
    await p.keyboard.press("Escape");
    await p
      .getByRole("button", {
        name: t("Review & close consultation"),
        exact: true,
      })
      .click();
    await p.getByRole("dialog").getByRole("checkbox").waitFor();
    await p.screenshot({ path: resolve(output, `close-review-${locale}.png`) });
    const returnBounds = await p.getByRole("button", { name: t("Return to documentation"), exact: true }).evaluate(el => {
      const r=el.getBoundingClientRect(), d=el.closest("dialog").getBoundingClientRect();
      return { top:r.top, bottom:r.bottom, dialogTop:d.top, dialogBottom:d.bottom };
    });
    assert.ok(returnBounds.top >= returnBounds.dialogTop && returnBounds.bottom <= returnBounds.dialogBottom, `${locale} return control is visible without dialog scrolling`);
    await p.getByRole("dialog").getByRole("checkbox").check();
    const confirmClose=p.getByRole("button", { name:t("Confirm close consultation"), exact:true });
    assert.equal(await confirmClose.isEnabled(),true);
    assert.equal(await confirmClose.evaluate(el=>globalThis.getComputedStyle(el).backgroundColor),"rgb(11, 110, 127)");
    assert.equal(interaction.state.writes.length,0,"Acknowledgement must not submit close");
    await p.screenshot({ path:resolve(output,`close-review-ready-${locale}.png`) });
    report.push({ locale, closeReturnVisible:true, acknowledgedCloseReady:true, tealConfirmation:true, noImplicitCloseMutation:true });
    await p.keyboard.press("Escape");
    await p
      .getByLabel(t("Private note content"), { exact: true })
      .fill("SYNTHETIC_PRIVATE_LIVE_CANARY unchanged retry");
    await p
      .getByRole("button", { name: t("Save private note draft"), exact: true })
      .click();
    await p
      .getByRole("button", {
        name: t("Retry unchanged private note"),
        exact: true,
      })
      .waitFor();
    assert.equal(interaction.state.writes.length, 1);
    await p.evaluate(() => globalThis.scrollTo(0, 0));
    await p.screenshot({
      path: resolve(output, `uncertain-${locale}.png`),
      fullPage: true,
    });
    report.push({
      locale,
      command: "uncertain explicit private save",
      mutations: interaction.state.writes.length,
      noAutomaticRetry: true,
      releasePreviewExcludesPrivate: true,
    });
    await p.close();
    const long = await clinicianMasterPage(browser, origin, locale, "empty");
    await long.page
      .locator(".documentation-content textarea")
      .first()
      .waitFor();
    const narrative = (
      locale === "en"
        ? "Long synthetic human-entered narrative, preserved without inference or truncation. "
        : "نص تجريبي طويل مدخل يدويًا لاختبار العرض مع الحفاظ على محتواه كما هو. "
    ).repeat(15);
    await long.page
      .getByLabel(t("Private note content"), { exact: true })
      .fill(narrative);
    assert.equal(
      await long.page
        .getByLabel(t("Private note content"), { exact: true })
        .inputValue(),
      narrative,
    );
    await long.page.evaluate(() => globalThis.scrollTo(0, 0));
    await long.page.screenshot({
      path: resolve(output, `long-${locale}.png`),
      fullPage: true,
    });
    assert.equal(long.state.writes.length, 0);
    await long.page.close();
    for (const kind of [
      "empty",
      "boot",
      "signed",
      "closed",
      "follow-up",
      "loading",
      "error",
      "redacted",
    ]) {
      const sample = await clinicianMasterPage(browser, origin, locale, kind);
      if (kind === "boot") {
        await sample.state.authReady;
        await sample.page.locator("[data-clinician-master-boot]").waitFor();
        await sample.page.locator(`html[lang="${locale}"]`).waitFor();
        await sample.page.evaluate(() => globalThis.document.fonts.ready);
        assert.equal(await sample.page.locator("header svg").count(), 0);
        await sample.page.screenshot({
          path: resolve(output, `boot-${locale}.png`),
        });
        sample.state.release();
        await sample.page.close();
        continue;
      }
      await sample.page.locator("[data-clinician-master]").waitFor();
      await sample.page.locator(".consultation-ribbon").waitFor();
      if (["empty", "signed", "closed", "follow-up"].includes(kind))
        await sample.page
          .locator(".documentation-content textarea")
          .first()
          .waitFor();
      else if (kind === "loading")
        await sample.page.locator("#live-documentation .loading").waitFor();
      else await sample.page.getByRole("alert").first().waitFor();
      if (kind === "follow-up") {
        await sample.page
          .getByText("Synthetic released follow-up · تعليمات بشرية", {
            exact: true,
          })
          .waitFor();
        assert.ok(
          !/[٠-٩]/u.test(
            await sample.page.locator(".follow-up-intent").innerText(),
          ),
        );
      }
      if (["error", "redacted"].includes(kind)) {
        assert.equal(
          await sample.page.locator("[data-clinician-source-rail]").count(),
          0,
        );
        assert.ok(
          !(await sample.page.locator("body").innerText()).includes(
            "PRIVATE_SQL_CANARY",
          ),
        );
      }
      await sample.page.evaluate(() => globalThis.document.fonts.ready);
      await sample.page.screenshot({
        path: resolve(output, `${kind}-${locale}.png`),
        fullPage: true,
      });
      sample.state.release();
      await sample.page.close();
    }
    report.push({ locale, writes: state.writes, errors: state.errors, reads: state.calls });
  }
  assert.deepEqual(await runtimeHashes(),capturedSources,'Product source changed during capture');
  report.push({ runtimeSourcesSha256:capturedSources, buildId:(await readFile('apps/web/.next/BUILD_ID','utf8')).trim() });
  await writeFile(
    resolve(output, "checks.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  if (phase === "after") {
    const directory = resolve("docs/ui-reference/clinician-premium-evidence");
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Clinician Patient-DNA premium visual review</title><style>@font-face{font-family:Manrope;src:url('/apps/web/public/fonts/my-care/manrope.ttf')}*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#0f172a;font:14px/1.6 Manrope,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font-size:28px;margin:0 0 8px}h2{font-size:20px;margin:24px 0 12px}p{color:#526178;margin:4px 0 16px}section{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px}h3{font-size:14px;margin:0 0 8px}img{display:block;width:100%;height:auto}a{color:#0b6e7f}footer{margin-top:24px}</style><main><h1>Clinician Patient-DNA premium visual review</h1><p>Actual production-built frontend · 1600 × 1000 · same controlled synthetic HTTP fixture before and after.<br>Visual/product/security acceptance remains pending. These images are presentation evidence, not a production-data or persistence claim.</p>${["en", "ar"].map((locale) => `<h2>${locale.toUpperCase()}${locale === "ar" ? " / RTL" : ""}</h2><section><article><h3>Before — approved Clinician master e28dbfb6</h3><a href="before/desktop-${locale}.png"><img src="before/desktop-${locale}.png" alt="Before ${locale}"></a></article><article><h3>After — owner-directed Patient-DNA premium pass</h3><a href="after/desktop-${locale}.png"><img src="after/desktop-${locale}.png" alt="After ${locale}"></a></article></section><p><a href="after/full-${locale}.png">Full page</a> · <a href="after/1280-${locale}.png">1280px</a> · <a href="after/text-200-${locale}.png">200% text</a> · <a href="after/focus-${locale}.png">Focus</a> · <a href="after/release-review-${locale}.png">Summary release review</a> · <a href="after/close-review-${locale}.png">Independent close review</a></p>`).join("")}<footer>Read the implementation handoff for source provenance, all state evidence, discrepancies, exact inventory and validation. No merge or deployment.</footer></main></html>`;
    await writeFile(resolve(directory, "review.html"), html);
    const root = process.cwd();
    const host = createServer(async (req, res) => {
      try {
        const path = resolve(
          root,
          "." + new URL(req.url, "http://localhost").pathname,
        );
        assert.ok(path.startsWith(root + "/"));
        res.setHeader(
          "Content-Type",
          path.endsWith(".html")
            ? "text/html; charset=utf-8"
            : path.endsWith(".png")
              ? "image/png"
              : "font/ttf",
        );
        res.end(await readFile(path));
      } catch {
        res.statusCode = 404;
        res.end("Unavailable");
      }
    });
    await new Promise((done) => host.listen(0, "127.0.0.1", done));
    try {
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      });
      await page.goto(
        `http://127.0.0.1:${host.address().port}/docs/ui-reference/clinician-premium-evidence/review.html`,
      );
      await page.evaluate(async () => {
        await globalThis.document.fonts.ready;
        await Promise.all(
          [...globalThis.document.images].map((i) => i.decode()),
        );
      });
      await page.screenshot({
        path: resolve(directory, "review.png"),
        fullPage: true,
      });
      await page.close();
    } finally {
      await new Promise((done) => host.close(done));
    }
  }
  console.log(`PASS: ${phase} actual built-frontend clinician evidence`);
} finally {
  await browser.close();
}
