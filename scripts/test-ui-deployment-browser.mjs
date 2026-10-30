/** Run after VERCEL=1 pnpm --filter @egyhealth/web build, without EH_UI_API_ORIGIN. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const routes = JSON.parse(
  await readFile("apps/web/.next/routes-manifest.json", "utf8"),
);
const rewrites = Array.isArray(routes.rewrites)
  ? routes.rewrites
  : Object.values(routes.rewrites).flat();
assert.equal(
  rewrites.length,
  0,
  "Unconfigured hosted build must not route to loopback.",
);
const origin = "http://127.0.0.1:3109";
const server = spawn(
  process.execPath,
  [
    "apps/web/node_modules/next/dist/bin/next",
    "start",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3109",
  ],
  {
    env: { ...process.env, VERCEL: "1", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  browser;
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Startup. */
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM
      ? { executablePath: process.env.EH_UI_CHROMIUM }
      : {}),
  });
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const calls = [],
      errors = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/")) calls.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((locale) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", locale);
    }, locale);
    await page.goto(origin);
    const notice = page.locator(".entry-mode-note");
    await notice
      .getByText(
        locale === "en"
          ? "This preview offers the browser-only demo. Live sign-in is unavailable until a backend is connected."
          : "تتيح هذه المعاينة العرض التجريبي داخل المتصفح فقط. تسجيل الدخول المباشر غير متاح حتى يتم توصيل الخادم.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(
      await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-mode")),
      "live",
    );
    assert.equal(
      await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-demo-v1")),
      null,
    );
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    assert.ok(
      await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1,
      ),
    );
    if (process.env.UI_SCREENSHOT_DIR) {
      await mkdir(process.env.UI_SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({
        path: resolve(
          process.env.UI_SCREENSHOT_DIR,
          `61-${locale}-hosted-demo-entry.png`,
        ),
        fullPage: true,
      });
    }
    await page
      .getByRole("button", {
        name:
          locale === "en" ? "Explore the patient demo" : "استكشف تجربة المريض",
        exact: true,
      })
      .click();
    await page.waitForURL("**/patient");
    await page.locator(".patient-journey").waitFor();
    assert.deepEqual(calls, []);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS: Vercel demo-only build starts, EN/AR mobile entry is explicit, no loopback rewrite/API calls or silent fallback.",
  );
} finally {
  await browser?.close();
  const exited =
    server.exitCode === null
      ? new Promise((done) => server.once("exit", done))
      : Promise.resolve();
  server.kill("SIGTERM");
  await exited;
}
