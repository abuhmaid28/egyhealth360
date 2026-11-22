/** Build & browser verification for isolated EH_PREVIEW_DEMO_ONLY=1 synthetic Demo preview. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

const removedPaths = [
  "/visual-recovery/care-encounter.webp",
  "/visual-recovery/mariam.webp",
  "/visual-recovery/omar.webp",
  "/visual-recovery/sara.webp",
  "/brand/dp02/compact-ar-dark.svg",
  "/brand/dp02/compact-ar-light.svg",
  "/brand/dp02/compact-en-dark.svg",
  "/brand/dp02/compact-en-light.svg",
  "/brand/dp02/primary-ar-dark.svg",
  "/brand/dp02/primary-ar-light.svg",
  "/brand/dp02/primary-en-dark.svg",
  "/brand/dp02/primary-en-light.svg",
];

function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

// 1. Verify Next build output has zero rewrites and zero AP05 asset references.
const routes = JSON.parse(readFileSync("apps/web/.next/routes-manifest.json", "utf8"));
const rewrites = Array.isArray(routes.rewrites)
  ? routes.rewrites
  : Object.values(routes.rewrites).flat();
assert.equal(rewrites.length, 0, "Preview build must have zero /api/v1 rewrites");

const clientFiles = walkFiles("apps/web/.next/static").filter((f) => /\.(js|css|json)$/i.test(f));
for (const file of clientFiles) {
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(
    content,
    /\/brand\/dp02\/|\/visual-recovery\/|care-encounter\.webp|mariam\.webp|omar\.webp|sara\.webp/,
    `Removed AP05 reference leaked into client bundle: ${file}`,
  );
}
const allNextFiles = walkFiles("apps/web/.next").filter((f) => /\.(html|js|css|json|rsc|meta)$/i.test(f));
for (const file of allNextFiles) {
  const content = readFileSync(file, "utf8");
  assert.doesNotMatch(
    content,
    /\/brand\/dp02\/|care-encounter\.webp|mariam\.webp|omar\.webp|sara\.webp/,
    `Removed AP05 asset filename leaked into build artifact: ${file}`,
  );
}

const origin = "http://127.0.0.1:3111";
const shotDir = process.env.UI_PREVIEW_SCREENSHOT_DIR
  ? resolve(process.env.UI_PREVIEW_SCREENSHOT_DIR)
  : null;
if (shotDir) await mkdir(shotDir, { recursive: true });

const server = spawn(
  process.execPath,
  [
    "apps/web/node_modules/next/dist/bin/next",
    "start",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3111",
  ],
  {
    env: {
      ...process.env,
      VERCEL: "1",
      EH_PREVIEW_DEMO_ONLY: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));

let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(origin);
      if (r.ok) {
        assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
        assert.equal(r.headers.get("x-content-type-options"), "nosniff");
        assert.equal(r.headers.get("referrer-policy"), "no-referrer");
        ready = true;
        break;
      }
    } catch {
      /* Startup wait */
    }
    await new Promise((done) => setTimeout(done, 150));
  }
  assert.ok(ready, logs);

  // 2. Verify every removed AP05 asset returns HTTP 404.
  for (const path of removedPaths) {
    const res = await fetch(origin + path, { redirect: "manual" });
    assert.equal(res.status, 404, `Expected 404 for removed AP05 asset ${path}, got ${res.status}`);
  }

  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM ? { executablePath: process.env.EH_UI_CHROMIUM } : {}),
  });

  const shots = [];
  const checkRoute = async ({ name, locale, theme, width, height = 900, route, role }) => {
    const ctx = await browser.newContext({
      viewport: { width, height },
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const apiCalls = [];
    const external = [];
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (u.origin !== origin) {
        external.push(u.href);
        return r.abort();
      }
      if (u.pathname.startsWith("/api/")) {
        apiCalls.push(u.pathname);
        return r.abort();
      }
      return r.continue();
    });
    // Attempt tampered eh360-ui-mode="live" — must fail closed to Demo!
    const demoFixture = role ? myCareDemoState() : null;
    if (demoFixture && role) {
      demoFixture.session = { role, mode: "demo", name: role === "CLINICIAN" ? "Dr. Mariam Hassan" : demoFixture.session.name };
    }
    await page.addInitScript(({ locale, demoFixture }) => {
      globalThis.localStorage.setItem("eh360-locale", locale);
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      if (demoFixture) {
        globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(demoFixture));
      } else {
        globalThis.localStorage.removeItem("eh360-ui-demo-v1");
      }
    }, { locale, demoFixture });

    await page.goto(origin + route);
    if (role) {
      await page.locator(`[data-portal-shell="${role}"]`).waitFor();
    } else {
      await page.locator(".entry-mode-note").waitFor();
      assert.equal(await page.getByRole("textbox").count(), 0, "Zero Live credential inputs");
    }
    await page.evaluate(() => globalThis.document.fonts.ready);

    const metrics = await page.evaluate(() => {
      const images = [...globalThis.document.querySelectorAll("img")].map((i) => i.src);
      return {
        dir: globalThis.document.documentElement.getAttribute("dir"),
        scrollWidth: globalThis.document.documentElement.scrollWidth,
        innerWidth: globalThis.innerWidth,
        brand: globalThis.document.querySelector('[data-preview-brand="text-only"]')?.textContent?.trim() ?? null,
        images,
      };
    });
    assert.equal(metrics.dir, locale === "ar" ? "rtl" : "ltr", name);
    assert.ok(metrics.scrollWidth <= metrics.innerWidth + 1, `${name} overflow: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
    assert.ok(metrics.brand, `${name} missing text-only brand`);
    assert.deepEqual(metrics.images, [], `${name} must render zero <img> assets`);
    assert.deepEqual(apiCalls, [], `${name} triggered /api calls`);
    assert.deepEqual(external, [], `${name} triggered external calls`);
    assert.deepEqual(errors, [], `${name} page errors`);

    if (shotDir) {
      const path = join(shotDir, `${name}.png`);
      await page.screenshot({ path, fullPage: true });
      shots.push(path);
    }
    await ctx.close();
  };

  // Entry & 5 portals across EN/AR, Light/Dark, 320/390/1440
  await checkRoute({ name: "01-login-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/login" });
  await checkRoute({ name: "02-login-ar-dark-390", locale: "ar", theme: "dark", width: 390, route: "/login" });
  await checkRoute({ name: "03-patient-mycare-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/patient", role: "PATIENT" });
  await checkRoute({ name: "04-patient-mycare-ar-dark-390", locale: "ar", theme: "dark", width: 390, route: "/patient", role: "PATIENT" });
  await checkRoute({ name: "05-patient-discover-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/patient/discover", role: "PATIENT" });
  await checkRoute({ name: "06-patient-discover-ar-dark-320", locale: "ar", theme: "dark", width: 320, route: "/patient/discover", role: "PATIENT" });
  await checkRoute({ name: "07-patient-doctor-profile-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/patient/doctors/mariam-hassan", role: "PATIENT" });
  await checkRoute({ name: "08-doctor-schedule-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/doctor/schedule", role: "CLINICIAN" });
  await checkRoute({ name: "09-doctor-schedule-ar-dark-390", locale: "ar", theme: "dark", width: 390, route: "/doctor/schedule", role: "CLINICIAN" });
  await checkRoute({ name: "10-pharmacy-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/pharmacy", role: "PHARMACY_STAFF" });
  await checkRoute({ name: "11-pharmacy-ar-dark-390", locale: "ar", theme: "dark", width: 390, route: "/pharmacy", role: "PHARMACY_STAFF" });
  await checkRoute({ name: "12-laboratory-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/laboratory", role: "LAB_STAFF" });
  await checkRoute({ name: "13-admin-en-light-1440", locale: "en", theme: "light", width: 1440, route: "/admin", role: "ADMIN" });

  console.log(JSON.stringify({ ok: true, removed404s: removedPaths.length, rewrites: 0, shots: shots.length }));
} finally {
  await browser?.close();
  const exited = server.exitCode === null ? new Promise((done) => server.once("exit", done)) : Promise.resolve();
  server.kill("SIGTERM");
  await exited;
}
