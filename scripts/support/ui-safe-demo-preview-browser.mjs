/** Build & browser verification for isolated EH_PREVIEW_DEMO_ONLY=1 preview with owner-attested DP02 & WebP assets. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

const approvedAssetHashes = {
  "/visual-recovery/care-encounter.webp": "ee37f8f323246d28fc0b5b2c7b98fc2b98b12552bd8ff5ec49eba32449af5b9e",
  "/visual-recovery/mariam.webp": "8f4d04fe4e1f1f41c2a46be8faac78740dbda52121c06e47ceb09e79d4c03dfb",
  "/visual-recovery/omar.webp": "d596fe12701029829d574fd6d226f4bcefefa2fec19148c7850fbe933d09f156",
  "/visual-recovery/sara.webp": "ae1d2d5a8c19c1b7d6b2f5cf0f31387b92c3974f5deed2c6f279d2a8a6b27541",
  "/brand/dp02/compact-ar-dark.svg": "bbed526c401f31fefdd1b98d8ab62c64663f2b03b1b8b0ef24a5f81498ea922d",
  "/brand/dp02/compact-ar-light.svg": "d83098460ac57d43801314dd5a8f96fa40b72268ae27893b302a0661e8ca89ff",
  "/brand/dp02/compact-en-dark.svg": "6ad7f9b61b1a43308e16e8d0a6a4bf80c389bac29d46d292eef938af8e2120c3",
  "/brand/dp02/compact-en-light.svg": "e49f02c9e4a7619ca8265d9d01e8e8a3b52176ec4654658b72e2cac6bf60b887",
  "/brand/dp02/primary-ar-dark.svg": "f96e38a2a6e1e7273edd57b8e98005f28b0894efa03ffba41ef2c0394a5196da",
  "/brand/dp02/primary-ar-light.svg": "76d14637666b2d9aadbdc211223454c3f216bff38927c11577ed4d77abce4fa4",
  "/brand/dp02/primary-en-dark.svg": "eaa33073140aff82d87d34e134157671f7f8d38ac625618a26b69978641bddd5",
  "/brand/dp02/primary-en-light.svg": "f6935c1441d2e68092109425d31f707621f6ec33b405d6ceb00fc0876f53b54e",
};

const untrustedNegativePaths = [
  "/brand/dp02/untrusted.svg",
  "/brand/other/missing.png",
  "/visual-recovery/untrusted.webp",
  "/visual-recovery/arbitrary.png",
];

// 1. Verify Next build output has zero /api/v1 rewrites.
const routes = JSON.parse(readFileSync("apps/web/.next/routes-manifest.json", "utf8"));
const rewrites = Array.isArray(routes.rewrites)
  ? routes.rewrites
  : Object.values(routes.rewrites).flat();
assert.equal(rewrites.length, 0, "Preview build must have zero /api/v1 rewrites");

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

  // 2. Verify all 12 restored approved assets return HTTP 200 and match exact SHA-256 hashes.
  for (const [path, expectedSha256] of Object.entries(approvedAssetHashes)) {
    const res = await fetch(origin + path, { redirect: "manual" });
    assert.equal(res.status, 200, `Expected 200 for approved asset ${path}, got ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(actualSha256, expectedSha256, `Asset digest mismatch at ${path}`);
  }

  // 3. Retain negative checks: unavailable/untrusted paths under /brand/* & /visual-recovery/* return 404.
  for (const path of untrustedNegativePaths) {
    const res = await fetch(origin + path, { redirect: "manual" });
    assert.equal(res.status, 404, `Expected 404 for untrusted asset ${path}, got ${res.status}`);
  }

  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM ? { executablePath: process.env.EH_UI_CHROMIUM } : {}),
  });

  const shots = [];
  const checkRoute = async ({
    name,
    locale,
    theme,
    width,
    height = 900,
    route,
    role,
    expectEncounterBg = false,
    expectedPortraits = [],
  }) => {
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
      demoFixture.session = {
        role,
        mode: "demo",
        name: role === "CLINICIAN" ? "Dr. Mariam Hassan" : demoFixture.session.name,
      };
    }
    await page.addInitScript(
      ({ locale, demoFixture }) => {
        globalThis.localStorage.setItem("eh360-locale", locale);
        globalThis.localStorage.setItem("eh360-ui-mode", "live");
        if (demoFixture) {
          globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(demoFixture));
        } else {
          globalThis.localStorage.removeItem("eh360-ui-demo-v1");
        }
      },
      { locale, demoFixture },
    );

    await page.goto(origin + route);
    if (role) {
      await page.locator(`[data-portal-shell="${role}"]`).waitFor();
    } else {
      await page.locator(".entry-mode-note").waitFor();
      assert.equal(await page.getByRole("textbox").count(), 0, "Zero Live credential inputs");
    }
    await page.evaluate(async () => {
      await globalThis.document.fonts.ready;
      const visibleImgs = [...globalThis.document.images].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      await Promise.race([
        Promise.all(visibleImgs.map((img) => img.decode().catch(() => {}))),
        new Promise((done) => globalThis.setTimeout(done, 2000)),
      ]);
    });

    const metrics = await page.evaluate(async () => {
      const visibleBrandImgs = [...globalThis.document.querySelectorAll("[data-dp02-logo] picture")]
        .filter((p) => globalThis.getComputedStyle(p).display !== "none")
        .map((p) => {
          const img = p.querySelector("img");
          const rect = img?.getBoundingClientRect();
          return {
            src: img?.currentSrc || img?.getAttribute("src"),
            complete: Boolean(img?.complete && img?.naturalWidth > 0),
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
          };
        });
      const mainImgs = [...globalThis.document.querySelectorAll("main img")].map((img) => ({
        src: img.currentSrc || img.getAttribute("src"),
        complete: img.complete && img.naturalWidth > 0,
      }));
      const entryBg = (() => {
        const el = globalThis.document.querySelector('[aria-labelledby="entry-title"] > div[aria-hidden="true"]');
        return el ? globalThis.getComputedStyle(el).backgroundImage : "";
      })();
      return {
        dir: globalThis.document.documentElement.getAttribute("dir"),
        scrollWidth: globalThis.document.documentElement.scrollWidth,
        innerWidth: globalThis.innerWidth,
        dp02Count: globalThis.document.querySelectorAll("[data-dp02-logo]").length,
        visibleBrandImgs,
        mainImgs,
        entryBg,
      };
    });

    assert.equal(metrics.dir, locale === "ar" ? "rtl" : "ltr", name);
    assert.ok(metrics.scrollWidth <= metrics.innerWidth + 1, `${name} overflow: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
    assert.ok(metrics.dp02Count >= 1, `${name} missing DP02 brand lockup`);
    assert.ok(
      metrics.visibleBrandImgs.some((i) => i.complete && i.src?.includes("/brand/dp02/")),
      `${name} missing decoded visible DP02 SVG: ${JSON.stringify(metrics.visibleBrandImgs)}`,
    );
    if (expectEncounterBg) {
      assert.match(metrics.entryBg, /\/visual-recovery\/care-encounter\.webp/, `${name} missing care-encounter.webp`);
    }
    for (const expectedPortrait of expectedPortraits) {
      assert.ok(
        metrics.mainImgs.some((i) => i.complete && i.src?.includes(`/visual-recovery/${expectedPortrait}`)),
        `${name} missing decoded ${expectedPortrait}: ${JSON.stringify(metrics.mainImgs)}`,
      );
    }
    assert.deepEqual(apiCalls, [], `${name} triggered /api calls`);
    assert.deepEqual(external, [], `${name} triggered external calls`);
    assert.deepEqual(errors, [], `${name} page errors`);

    if (shotDir) {
      const path = join(shotDir, `${name}.png`);
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
      shots.push(path);
    }
    await ctx.close();
  };

  await checkRoute({
    name: "01-login-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/login",
    expectEncounterBg: true,
  });
  await checkRoute({
    name: "02-login-ar-dark-390",
    locale: "ar",
    theme: "dark",
    width: 390,
    route: "/login",
    expectEncounterBg: true,
  });
  await checkRoute({
    name: "03-patient-mycare-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/patient",
    role: "PATIENT",
  });
  await checkRoute({
    name: "04-patient-mycare-ar-dark-390",
    locale: "ar",
    theme: "dark",
    width: 390,
    route: "/patient",
    role: "PATIENT",
  });
  await checkRoute({
    name: "05-patient-discover-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/patient/discover",
    role: "PATIENT",
    expectedPortraits: ["mariam.webp", "omar.webp", "sara.webp"],
  });
  await checkRoute({
    name: "06-patient-discover-ar-dark-320",
    locale: "ar",
    theme: "dark",
    width: 320,
    route: "/patient/discover",
    role: "PATIENT",
    expectedPortraits: ["mariam.webp", "omar.webp", "sara.webp"],
  });
  await checkRoute({
    name: "07-patient-doctor-profile-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/patient/doctors/mariam-hassan",
    role: "PATIENT",
    expectedPortraits: ["mariam.webp"],
  });
  await checkRoute({
    name: "08-doctor-schedule-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/doctor/schedule",
    role: "CLINICIAN",
  });
  await checkRoute({
    name: "09-doctor-schedule-ar-dark-390",
    locale: "ar",
    theme: "dark",
    width: 390,
    route: "/doctor/schedule",
    role: "CLINICIAN",
  });
  await checkRoute({
    name: "10-pharmacy-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/pharmacy",
    role: "PHARMACY_STAFF",
  });
  await checkRoute({
    name: "11-pharmacy-ar-dark-390",
    locale: "ar",
    theme: "dark",
    width: 390,
    route: "/pharmacy",
    role: "PHARMACY_STAFF",
  });
  await checkRoute({
    name: "12-laboratory-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/laboratory",
    role: "LAB_STAFF",
  });
  await checkRoute({
    name: "13-admin-en-light-1440",
    locale: "en",
    theme: "light",
    width: 1440,
    route: "/admin",
    role: "ADMIN",
  });

  console.log(
    JSON.stringify({
      ok: true,
      approvedAssets200: Object.keys(approvedAssetHashes).length,
      untrustedAssets404: untrustedNegativePaths.length,
      rewrites: 0,
      shots: shots.length,
    }),
  );
} finally {
  await browser?.close();
  const exited = server.exitCode === null ? new Promise((done) => server.once("exit", done)) : Promise.resolve();
  server.kill("SIGTERM");
  await exited;
}
