/**
 * Issue #210 (G2-F2) bounded local synthetic browser capture & measurement script.
 * - Loopback 127.0.0.1 only; aborts & records any external or /api/v1/ request.
 * - Captures ONLY explicitly labeled cropped/partial region clips that exclude
 *   all 12 PREVIEW_ATTESTED_REUSED (#158 DP02 / visual-recovery) assets.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";

const args = new Set(process.argv.slice(2));
const target =
  process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "202-preview";
const appRoot = resolve(
  process.argv.find((a) => a.startsWith("--app-root="))?.split("=")[1] ?? ".",
);
const outDir = resolve(
  process.argv.find((a) => a.startsWith("--out-dir="))?.split("=")[1] ??
    "docs/visual-evidence/202/g2-f2-750b7b93",
);
const reportOut = resolve(
  process.argv.find((a) => a.startsWith("--report="))?.split("=")[1] ??
    join(outDir, `report-${target}.json`),
);
const skipCaptures = args.has("--no-captures");

const PORT_MAP = {
  "202-preview": "3132",
  "202-normal": "3131",
  "158-before": "3133",
};
const port = PORT_MAP[target];
assert.ok(port, `Unsupported --target=${target}`);
const origin = `http://127.0.0.1:${port}`;
const isPreview = target !== "202-normal";

const CONTRAST_EVALUATOR = `(() => {
  function parseColor(str) {
    if (!str || str === "transparent") return [0, 0, 0, 0];
    const m = str.match(/rgba?\\((\\d+\\.?\\d*),\\s*(\\d+\\.?\\d*),\\s*(\\d+\\.?\\d*)(?:,\\s*(\\d+\\.?\\d*))?\\)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  }
  function blend(fg, bg) {
    const a = fg[3];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1,
    ];
  }
  function luminance([r, g, b]) {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function ratio(c1, c2) {
    const l1 = luminance(c1), l2 = luminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function effectiveBg(el) {
    const layers = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const bg = parseColor(getComputedStyle(cur).backgroundColor);
      if (bg && bg[3] > 0) layers.push(bg);
      cur = cur.parentElement;
    }
    const scope = document.querySelector("[data-v2-foundation]");
    const rootTheme = document.documentElement.getAttribute("data-theme");
    const isLight =
      scope?.getAttribute("data-foundation-theme") === "light" ||
      (!scope && rootTheme === "light");
    let acc = isLight ? [246, 244, 251, 1] : [14, 11, 26, 1];
    for (let i = layers.length - 1; i >= 0; i--) acc = blend(layers[i], acc);
    return acc;
  }

  const failures = [];
  let minNormal = 99;
  let minLarge = 99;
  let checked = 0;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent || !node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    if (el.classList.contains("sr-only")) continue;

    const fgRaw = parseColor(st.color);
    if (!fgRaw) continue;
    const bg = effectiveBg(el);
    const fg = fgRaw[3] < 1 ? blend(fgRaw, bg) : fgRaw;
    const r = ratio(fg, bg);
    const fontSize = parseFloat(st.fontSize) || 16;
    const weight = Number(st.fontWeight) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
    const threshold = isLarge ? 3.0 : 4.5;
    checked++;
    if (isLarge) minLarge = Math.min(minLarge, r);
    else minNormal = Math.min(minNormal, r);
    if (r + 0.02 < threshold) {
      failures.push({
        tag: el.tagName,
        id: el.id || "",
        text: (el.innerText || "").trim().slice(0, 48),
        ratio: Number(r.toFixed(2)),
        threshold,
      });
    }
  }
  return {
    checked,
    minNormal: minNormal === 99 ? null : Number(minNormal.toFixed(2)),
    minLarge: minLarge === 99 ? null : Number(minLarge.toFixed(2)),
    failures,
  };
})()`;

function parsePngDimensions(buf) {
  // PNG signature (8) + IHDR length (4) + "IHDR" (4) + width (4 BE) + height (4 BE)
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "Invalid PNG signature");
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function waitForServer(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

async function collectRegionAudit(page) {
  return page.evaluate(() => {
    const restrictedBoxes = [];
    const checkUrl = (val) =>
      typeof val === "string" &&
      (val.includes("/brand/dp02/") || val.includes("/visual-recovery/"));

    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const src = img.currentSrc || img.getAttribute("src") || "";
      if (checkUrl(src)) {
        restrictedBoxes.push({
          tag: "IMG",
          src,
          x: r.left,
          y: r.top,
          right: r.right,
          bottom: r.bottom,
        });
      }
    }
    for (const el of document.querySelectorAll("*")) {
      const bg = getComputedStyle(el).backgroundImage;
      if (checkUrl(bg)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          restrictedBoxes.push({
            tag: el.tagName,
            src: bg,
            x: r.left,
            y: r.top,
            right: r.right,
            bottom: r.bottom,
          });
        }
      }
    }
    return restrictedBoxes;
  });
}

async function safeClipScreenshot(page, selector, outputPath, meta) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);

  let box = await loc.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, `Empty bounding box for ${selector}`);
  const vp = page.viewportSize();
  if (box.y >= vp.height - 80 || box.y < 0) {
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    box = await loc.boundingBox();
  }

  // Clamp clip below any sticky/fixed header so header DP02 logos never intrude on main clips.
  const stickyBottom = await page.evaluate(() => {
    let maxB = 0;
    for (const h of document.querySelectorAll("header")) {
      const st = getComputedStyle(h);
      if (st.position === "sticky" || st.position === "fixed") {
        const r = h.getBoundingClientRect();
        if (r.height > 0 && r.top <= 4) maxB = Math.max(maxB, r.bottom);
      }
    }
    return maxB;
  });

  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y), Math.ceil(stickyBottom) + 2);
  const maxW = Math.max(1, vp.width - x);
  const maxH = Math.max(1, vp.height - y);
  const boxEndY = Math.ceil(box.y + box.height);
  const width = Math.min(Math.ceil(box.width), maxW);
  const height = Math.min(Math.max(1, boxEndY - y), maxH, 760);

  // Fail-closed: verify zero intersection between clip box and any PREVIEW_ATTESTED_REUSED asset box.
  const restricted = await collectRegionAudit(page);
  for (const rb of restricted) {
    const overlaps =
      rb.x < x + width &&
      rb.right > x &&
      rb.y < y + height &&
      rb.bottom > y;
    assert.equal(
      overlaps,
      false,
      `Rights safety abort: ${outputPath} clip (${x},${y},${width},${height}) intersects restricted asset ${rb.src} (${rb.x},${rb.y},${rb.right},${rb.bottom})`,
    );
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await page.screenshot({
    path: outputPath,
    clip: { x, y, width, height },
    animations: "disabled",
  });
  const buf = await readFile(outputPath);
  const dims = parsePngDimensions(buf);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const info = await stat(outputPath);

  return {
    ...meta,
    file: outputPath.replaceAll("\\", "/").split("/docs/visual-evidence/202/g2-f2-750b7b93/")[1],
    captureKind: "cropped_partial_region_clip",
    fullScreenFidelityClaimed: false,
    excludedRestrictedAssetsVerified: true,
    restrictedBoxesOnPage: restricted.length,
    clip: { x, y, width, height },
    dimensions: dims,
    bytes: info.size,
    sha256,
  };
}

async function measurePageMetrics(page, label) {
  return page.evaluate((lbl) => {
    const doc = document.documentElement;
    const interactive = [...document.querySelectorAll("button, a[href], select, input, summary, textarea")].filter((el) => {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return st.display !== "none" && st.visibility !== "hidden" && r.width > 0 && r.height > 0;
    });
    const smallTargets = interactive
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.innerText || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 32),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      })
      .filter((t) => t.height < 44 || t.width < 44);

    const bodyFonts = [...document.querySelectorAll("p, li, label, span, td, th")]
      .filter((el) => {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return st.display !== "none" && r.width > 0 && r.height > 0 && (el.innerText || "").trim().length > 0;
      })
      .map((el) => parseFloat(getComputedStyle(el).fontSize) || 0)
      .filter((n) => n > 0);

    const bodyText = document.body.innerText || "";
    const hasArabicIndicDigits = /[٠-٩۰-۹]/.test(bodyText);

    return {
      label: lbl,
      dir: doc.getAttribute("dir"),
      lang: doc.getAttribute("lang"),
      theme:
        document.querySelector("[data-foundation-theme]")?.getAttribute("data-foundation-theme") ??
        doc.getAttribute("data-theme") ??
        "unknown",
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
      interactiveCount: interactive.length,
      under44pxCount: smallTargets.length,
      under44pxSample: smallTargets.slice(0, 8),
      minBodyFontPx: bodyFonts.length ? Math.min(...bodyFonts) : null,
      medianBodyFontPx: bodyFonts.length
        ? bodyFonts.slice().sort((a, b) => a - b)[Math.floor(bodyFonts.length / 2)]
        : null,
      hasArabicIndicDigits,
    };
  }, label);
}

const nextBin = join(appRoot, "apps/web/node_modules/next/dist/bin/next");
const webDir = join(appRoot, "apps/web");
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  ...(isPreview ? { VERCEL: "1", EH_PREVIEW_DEMO_ONLY: "1" } : {}),
};
if (isPreview) delete env.EH_UI_API_ORIGIN;

const server = spawn(
  process.execPath,
  [nextBin, "start", webDir, "--hostname", "127.0.0.1", "--port", port],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));

let browser;
const report = {
  target,
  origin,
  mode: isPreview ? "locked_preview" : "normal_configured",
  nodeVersion: process.version,
  platform: process.platform,
  security: {},
  metrics: [],
  contrast: [],
  zoom200Checks: [],
  keyboardAndFocus: {},
  normalBuildChecks: {},
  captures: [],
  errors: [],
  externalRequests: [],
  apiRequests: [],
};

try {
  const rootRes = await waitForServer(origin);
  assert.ok(rootRes, `Server failed for ${target}:\n${logs}`);
  report.security.rootStatus = rootRes.status;
  report.security.headers = {
    xRobotsTag: rootRes.headers.get("x-robots-tag"),
    xContentTypeOptions: rootRes.headers.get("x-content-type-options"),
    referrerPolicy: rootRes.headers.get("referrer-policy"),
    permissionsPolicy: rootRes.headers.get("permissions-policy"),
    xFrameOptions: rootRes.headers.get("x-frame-options"),
    csp: rootRes.headers.get("content-security-policy"),
  };

  if (target === "202-preview") {
    const f404Get = await fetch(`${origin}/v2-foundation/probe.webp`);
    const f404Head = await fetch(`${origin}/v2-foundation/probe.webp`, { method: "HEAD" });
    assert.equal(f404Get.status, 404);
    assert.equal(f404Head.status, 404);
    report.security.v2Foundation404 = { get: f404Get.status, head: f404Head.status };
  }

  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM ? { executablePath: process.env.EH_UI_CHROMIUM } : {}),
  });

  const makePage = async ({
    locale = "en",
    colorScheme = "dark",
    width = 1440,
    height = 900,
    tamperLive = false,
    v2SessionOptIn = false,
    denySessionStorage = false,
  } = {}) => {
    const ctx = await browser.newContext({
      viewport: { width, height },
      colorScheme,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => report.errors.push(`${target}:${e.message}`));
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== origin) {
        report.externalRequests.push(u.href);
        return route.abort();
      }
      if (u.pathname.startsWith("/api/v1/")) {
        report.apiRequests.push(u.pathname);
        return route.abort();
      }
      return route.continue();
    });
    await page.addInitScript(
      ({ locale, tamperLive, v2SessionOptIn, denySessionStorage }) => {
        globalThis.localStorage.setItem("eh360-locale", locale);
        globalThis.localStorage.setItem("eh360-ui-mode", tamperLive ? "live" : "demo");
        if (v2SessionOptIn) {
          globalThis.sessionStorage.setItem("eh360-v2-demo", "1");
        }
        if (denySessionStorage) {
          Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            get() {
              throw new DOMException("Storage disabled probe", "SecurityError");
            },
          });
        }
      },
      { locale, tamperLive, v2SessionOptIn, denySessionStorage },
    );
    return { ctx, page };
  };

  if (target === "202-normal") {
    // 1. Default normal build preserves V1 Login + #158 V1 portal without opt-in
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark" });
      await page.goto(origin, { waitUntil: "networkidle" });
      const textboxes = await page.getByRole("textbox").count();
      await page.locator("#demo-workspaces .demo-button").click();
      await page.locator('[data-portal-shell="PATIENT"]').waitFor();
      const hasV2Portal = (await page.locator('[data-v2-portal="patient"]').count()) > 0;
      const hasLegacyMyCare = (await page.locator('[data-patient-my-care-v2]').count()) > 0;
      report.normalBuildChecks.defaultWithoutOptIn = {
        entryTextboxes: textboxes,
        hasV2Portal,
        hasLegacyMyCare,
      };
      await ctx.close();
    }
    // 2. /?v2=1 entry query opt-in probe (checks whether query param survives router.push('/patient'))
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark" });
      await page.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces .demo-button").click();
      await page.locator('[data-portal-shell="PATIENT"]').waitFor();
      await page.waitForTimeout(150);
      const entryQueryOptInActivatedV2 = (await page.locator('[data-v2-portal="patient"]').count()) > 0;
      // Direct /patient?v2=1 navigation check
      await page.goto(`${origin}/patient?v2=1`, { waitUntil: "networkidle" });
      await page.locator('[data-portal-shell="PATIENT"]').waitFor();
      await page.waitForTimeout(150);
      const directRouteQueryOptInActivatedV2 = (await page.locator('[data-v2-portal="patient"]').count()) > 0;
      report.normalBuildChecks.queryOptInV2 = {
        entryQuerySurvivedRouterPush: entryQueryOptInActivatedV2,
        directPatientQueryActivatedV2: directRouteQueryOptInActivatedV2,
      };
      await ctx.close();
    }
    // 3. sessionStorage opt-in activates DemoV2Router
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", v2SessionOptIn: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces .demo-button").click();
      await page.locator('[data-v2-portal="patient"]').waitFor();
      report.normalBuildChecks.sessionStorageOptInV2 = true;
      await ctx.close();
    }
    // 4. sessionStorage denial probe: record exact behavior when window.sessionStorage getter throws
    {
      const errorsBefore = report.errors.length;
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", denySessionStorage: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces .demo-button").click();
      await page.waitForTimeout(400);
      const bodyLen = await page.evaluate(() => (document.body.innerText || "").trim().length);
      const shellCount = await page.locator('[data-portal-shell="PATIENT"]').count();
      report.normalBuildChecks.sessionStorageDenialProbe = {
        pageErrorsTriggered: report.errors.slice(errorsBefore),
        shellMounted: shellCount > 0,
        bodyTextLength: bodyLen,
      };
      await ctx.close();
    }
  } else if (target === "158-before") {
    const capDir = join(outDir, "captures");
    // Entry workspaces EN Dark 1440
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", tamperLive: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces").waitFor();
      report.metrics.push(await measurePageMetrics(page, "158-entry-en-dark-1440"));
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#demo-workspaces",
            join(capDir, "01-before-158-entry-workspaces-en-dark-1440.png"),
            { id: "before-entry-en-dark-1440", baseline: "158", role: "ENTRY", route: "/", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }
      // Enter Patient -> My Care (note #158 PatientMyCare has header with DP02 logo, clip main area excluding header)
      await page.locator("#demo-workspaces .demo-button").click();
      await page.locator("#main").waitFor();
      report.metrics.push(await measurePageMetrics(page, "158-patient-home-en-dark-1440"));
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "05-before-158-patient-home-en-dark-1440.png"),
            { id: "before-patient-home-en-dark-1440", baseline: "158", role: "PATIENT", route: "/patient", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }
      await ctx.close();
    }
    // Staff roles in #158 via role switcher or direct portal entry
    const staffCases = [
      { idx: 1, file: "11-before-158-doctor-schedule-en-dark-1440.png", role: "CLINICIAN", route: "/doctor/schedule", label: "158-doctor-schedule-en-dark-1440" },
      { idx: 2, file: "15-before-158-pharmacy-en-dark-1440.png", role: "PHARMACY_STAFF", route: "/pharmacy", label: "158-pharmacy-en-dark-1440" },
      { idx: 3, file: "18-before-158-lab-future-en-dark-1440.png", role: "LAB_STAFF", route: "/laboratory", label: "158-lab-future-en-dark-1440" },
      { idx: 4, file: "20-before-158-admin-en-dark-1440.png", role: "ADMIN", route: "/admin", label: "158-admin-en-dark-1440" },
    ];
    for (const sc of staffCases) {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", tamperLive: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces button").nth(sc.idx).click();
      await page.locator(`[data-portal-shell="${sc.role}"]`).waitFor();
      await page.waitForTimeout(200);
      report.metrics.push(await measurePageMetrics(page, sc.label));
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(page, "#main", join(capDir, sc.file), {
            id: sc.label,
            baseline: "158",
            role: sc.role,
            route: sc.route,
            locale: "en",
            theme: "dark",
            viewport: "1440x900",
          }),
        );
      }
      await ctx.close();
    }
  } else if (target === "202-preview") {
    const capDir = join(outDir, "captures");
    // 1. Gateway EN Dark 1440, keyboard Escape focus test, Light 1440, AR Dark 390, System theme check
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", tamperLive: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator('[data-v2-gateway="true"]').waitFor();
      assert.equal(await page.getByRole("textbox").count(), 0);
      report.metrics.push(await measurePageMetrics(page, "202-gateway-en-dark-1440"));
      report.contrast.push({ label: "202-gateway-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });

      // Keyboard focus & Escape test on theme details
      await page.locator("[data-v2-gateway] summary").focus();
      await page.locator("[data-v2-gateway] summary").click();
      const openBefore = await page.locator("[data-v2-gateway] details").evaluate((d) => d.open);
      await page.keyboard.press("Escape");
      const openAfter = await page.locator("[data-v2-gateway] details").evaluate((d) => d.open);
      const focusReturned = await page.evaluate(() => document.activeElement?.tagName === "SUMMARY");
      report.keyboardAndFocus.gatewayThemeEscape = { openBefore, openAfter, focusReturned };

      // System preference probe (prefers-color-scheme: light -> resolved light)
      await page.emulateMedia({ colorScheme: "light" });
      await page.waitForTimeout(80);
      const systemResolvedLight = await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme");
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForTimeout(80);
      const systemResolvedDark = await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme");
      report.keyboardAndFocus.systemThemeParity = { systemResolvedLight, systemResolvedDark };

      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#demo-workspaces",
            join(capDir, "02-after-202-gateway-roles-en-dark-1440.png"),
            { id: "after-gateway-roles-en-dark-1440", baseline: "202", role: "GATEWAY", route: "/", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // Light mode on Gateway
      await page.locator("[data-v2-gateway] summary").click();
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.waitForTimeout(100);
      report.contrast.push({ label: "202-gateway-en-light-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#demo-workspaces",
            join(capDir, "04-after-202-gateway-roles-en-light-1440.png"),
            { id: "after-gateway-roles-en-light-1440", baseline: "202", role: "GATEWAY", route: "/", locale: "en", theme: "light", viewport: "1440x900" },
          ),
        );
      }

      // Real 200% text zoom check on Gateway 1440 and 390
      await page.locator(".v2-theme-switch select").selectOption("dark");
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await page.waitForTimeout(80);
      report.zoom200Checks.push(await measurePageMetrics(page, "202-gateway-en-dark-1440-text200"));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(80);
      report.zoom200Checks.push(await measurePageMetrics(page, "202-gateway-en-dark-390-text200"));
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
      });

      // AR RTL mobile 390
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      report.metrics.push(await measurePageMetrics(page, "202-gateway-ar-dark-390"));
      report.contrast.push({ label: "202-gateway-ar-dark-390", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#demo-workspaces",
            join(capDir, "03-after-202-gateway-roles-ar-dark-390.png"),
            { id: "after-gateway-roles-ar-dark-390", baseline: "202", role: "GATEWAY", route: "/", locale: "ar", theme: "dark", viewport: "390x844" },
          ),
        );
      }
      await ctx.close();
    }

    // 2. Patient journeys: My care (1440 dark + 390 AR dark), Discover booking form (unchecked 1A+2A), Appointments (Light 1440), Settings (live sync)
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", tamperLive: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator('[data-gateway-primary-cta="PATIENT"]').click();
      await page.locator('[data-v2-portal="patient"]').waitFor();
      report.metrics.push(await measurePageMetrics(page, "202-patient-home-en-dark-1440"));
      report.contrast.push({ label: "202-patient-home-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });

      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "06-after-202-patient-home-en-dark-1440.png"),
            { id: "after-patient-home-en-dark-1440", baseline: "202", role: "PATIENT", route: "/patient", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // 200% text zoom on Patient home
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      await page.waitForTimeout(80);
      report.zoom200Checks.push(await measurePageMetrics(page, "202-patient-home-en-dark-1440-text200"));
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
      });

      // Discover -> slot -> unchecked Option 1A+2A consent form clip (excludes doctor portrait cards!)
      await page.getByRole("link", { name: /Discover/i }).click();
      await page.locator('[data-slot-chip]').first().click();
      await page.locator('[data-booking-form="true"]').waitFor();
      const consentChecked = await page.locator('[data-consent-checkbox="true"]').isChecked();
      assert.equal(consentChecked, false);
      const discoverText = await page.locator('[data-v2-portal="patient"]').innerText();
      const has12hPatient = /\b(0?[1-9]|1[0-2]):\d{2}\s?(AM|PM)\b/.test(discoverText);
      report.metrics.push({
        label: "202-patient-discover-12h-and-1a2a",
        has12hPatient,
        consentUncheckedDefault: !consentChecked,
      });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            '[data-booking-form="true"]',
            join(capDir, "08-after-202-patient-booking-consent-en-dark-1440.png"),
            { id: "after-patient-booking-consent-en-dark-1440", baseline: "202", role: "PATIENT", route: "/patient/discover", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // Confirm booking & check Appointments in Light mode
      await page.locator("#booking-reason").fill("G2-F2 visual acceptance check");
      await page.locator('[data-confirm-booking="true"]').click();
      await page.locator('[data-booking-receipt]').waitFor();
      await page.getByRole("link", { name: "Appointments", exact: true }).click();
      await page.locator('[data-appointment-item]').first().waitFor();
      await page.locator('[data-v2-shell] summary').click();
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      report.contrast.push({ label: "202-patient-appointments-en-light-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "09-after-202-patient-appointments-en-light-1440.png"),
            { id: "after-patient-appointments-en-light-1440", baseline: "202", role: "PATIENT", route: "/patient/appointments", locale: "en", theme: "light", viewport: "1440x900" },
          ),
        );
      }

      // Settings live display name sync
      await page.locator('[data-v2-shell] summary').click();
      await page.locator(".v2-theme-switch select").selectOption("dark");
      await page.keyboard.press("Escape");
      await page.getByRole("link", { name: "Settings", exact: true }).click();
      await page.locator("#profile-name").fill("Layla Hassan");
      await page.locator('[data-save-profile="true"]').click();
      await page.waitForTimeout(150);
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "10-after-202-patient-settings-en-dark-1440.png"),
            { id: "after-patient-settings-en-dark-1440", baseline: "202", role: "PATIENT", route: "/patient/settings", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // Mobile 390 AR RTL on Patient home
      await page.getByRole("link", { name: "My care", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      report.metrics.push(await measurePageMetrics(page, "202-patient-home-ar-dark-390"));
      report.contrast.push({ label: "202-patient-home-ar-dark-390", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "07-after-202-patient-home-ar-dark-390.png"),
            { id: "after-patient-home-ar-dark-390", baseline: "202", role: "PATIENT", route: "/patient", locale: "ar", theme: "dark", viewport: "390x844" },
          ),
        );
      }

      // Switch back to EN 1440 and transition Patient -> Doctor -> Pharmacy -> Lab -> Admin in the same session
      // so Doctor Schedule/Consultation and Pharmacy have live synthetic booked/released state.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole("button", { name: /English/ }).click();
      await page.waitForTimeout(80);

      await page.locator("[data-workspace-switch]").selectOption("CLINICIAN");
      await page.locator('[data-v2-portal="doctor"]').waitFor();
      const docText = await page.locator('[data-v2-portal="doctor"]').innerText();
      report.metrics.push({
        ...(await measurePageMetrics(page, "202-doctor-schedule-en-dark-1440")),
        has24hProfessional: /\b([01]\d|2[0-3]):\d{2}\b/.test(docText),
      });
      report.contrast.push({ label: "202-doctor-schedule-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "12-after-202-doctor-schedule-en-dark-1440.png"),
            { id: "after-doctor-schedule-en-dark-1440", baseline: "202", role: "CLINICIAN", route: "/doctor/schedule", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      await page.getByRole("link", { name: "Consultation", exact: true }).click();
      await page.locator('[data-release-form="true"]').waitFor();
      await page.locator("#consult-summary").fill("Follow-up guidance verified in G2-F2");
      await page.locator("#consult-med").fill("Cetirizine 10mg");
      await page.locator('[data-release-submit="true"]').click();
      await page.waitForTimeout(150);
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "14-after-202-doctor-consultation-en-dark-1440.png"),
            { id: "after-doctor-consultation-en-dark-1440", baseline: "202", role: "CLINICIAN", route: "/doctor/consultation", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // Doctor Schedule AR 390
      await page.getByRole("link", { name: "Schedule", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      report.metrics.push(await measurePageMetrics(page, "202-doctor-schedule-ar-dark-390"));
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "13-after-202-doctor-schedule-ar-dark-390.png"),
            { id: "after-doctor-schedule-ar-dark-390", baseline: "202", role: "CLINICIAN", route: "/doctor/schedule", locale: "ar", theme: "dark", viewport: "390x844" },
          ),
        );
      }

      // Switch back to EN 1440 for Pharmacy, Lab, Admin
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole("button", { name: /English/ }).click();
      await page.waitForTimeout(80);

      // Pharmacy EN 1440 + AR 390
      await page.locator("[data-workspace-switch]").selectOption("PHARMACY_STAFF");
      await page.locator('[data-v2-portal="pharmacy"]').waitFor();
      if ((await page.locator('[data-pharmacy-action="Preparing"]').count()) > 0) {
        await page.locator('[data-pharmacy-action="Preparing"]').first().click();
        await page.waitForTimeout(120);
      }
      if ((await page.locator('[data-pharmacy-action="Dispensed"]').count()) > 0) {
        await page.locator('[data-pharmacy-action="Dispensed"]').first().click();
        await page.waitForTimeout(120);
      }
      const pharmacyTerminalLockVisible = (await page.locator('[data-pharmacy-terminal="true"]').count()) > 0;
      report.metrics.push({
        ...(await measurePageMetrics(page, "202-pharmacy-en-dark-1440")),
        pharmacyTerminalLockVisible,
      });
      report.contrast.push({ label: "202-pharmacy-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "16-after-202-pharmacy-en-dark-1440.png"),
            { id: "after-pharmacy-en-dark-1440", baseline: "202", role: "PHARMACY_STAFF", route: "/pharmacy", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      report.metrics.push(await measurePageMetrics(page, "202-pharmacy-ar-dark-390"));
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "17-after-202-pharmacy-ar-dark-390.png"),
            { id: "after-pharmacy-ar-dark-390", baseline: "202", role: "PHARMACY_STAFF", route: "/pharmacy", locale: "ar", theme: "dark", viewport: "390x844" },
          ),
        );
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.getByRole("button", { name: /English/ }).click();
      await page.waitForTimeout(80);

      // Laboratory EN 1440 (all 3 concept tabs)
      await page.locator("[data-workspace-switch]").selectOption("LAB_STAFF");
      await page.locator('[data-v2-portal="laboratory"]').waitFor();
      await page.locator("#lab-tab-specimens").click();
      await page.locator("#lab-tab-reports").click();
      await page.locator("#lab-tab-orders").click();
      report.metrics.push(await measurePageMetrics(page, "202-lab-future-en-dark-1440"));
      report.contrast.push({ label: "202-lab-future-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "19-after-202-lab-future-en-dark-1440.png"),
            { id: "after-lab-future-en-dark-1440", baseline: "202", role: "LAB_STAFF", route: "/laboratory", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      // Admin EN Dark 1440 + EN Light 1440
      await page.locator("[data-workspace-switch]").selectOption("ADMIN");
      await page.locator('[data-v2-portal="admin"]').waitFor();
      report.metrics.push(await measurePageMetrics(page, "202-admin-en-dark-1440"));
      report.contrast.push({ label: "202-admin-en-dark-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "21-after-202-admin-en-dark-1440.png"),
            { id: "after-admin-en-dark-1440", baseline: "202", role: "ADMIN", route: "/admin", locale: "en", theme: "dark", viewport: "1440x900" },
          ),
        );
      }

      await page.locator('[data-v2-shell] summary').click();
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      report.contrast.push({ label: "202-admin-en-light-1440", ...(await page.evaluate(CONTRAST_EVALUATOR)) });
      if (!skipCaptures) {
        report.captures.push(
          await safeClipScreenshot(
            page,
            "#main",
            join(capDir, "22-after-202-admin-en-light-1440.png"),
            { id: "after-admin-en-light-1440", baseline: "202", role: "ADMIN", route: "/admin", locale: "en", theme: "light", viewport: "1440x900" },
          ),
        );
      }
      await ctx.close();
    }

    // 3. Direct Gateway entry to Doctor in fresh context (observes empty consultation fixture state)
    {
      const { ctx, page } = await makePage({ locale: "en", colorScheme: "dark", tamperLive: true });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.locator('[data-gateway-role-btn="CLINICIAN"]').click();
      await page.locator('[data-v2-portal="doctor"]').waitFor();
      await page.getByRole("link", { name: "Consultation", exact: true }).click();
      await page.locator("#doc-consult-title").waitFor();
      const emptyConsultationMessage = await page.getByText("No booked consultations available.").count();
      report.metrics.push({
        label: "202-doctor-fresh-gateway-consultation-empty-state",
        emptyConsultationMessagePresent: emptyConsultationMessage > 0,
      });
      await ctx.close();
    }
  }

  assert.equal(report.externalRequests.length, 0, `External requests detected: ${report.externalRequests.join(", ")}`);
  assert.equal(report.apiRequests.length, 0, `API requests detected: ${report.apiRequests.join(", ")}`);
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill("SIGTERM");
  }
}

await mkdir(dirname(reportOut), { recursive: true });
await writeFile(reportOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ target, captures: report.captures.length, metrics: report.metrics.length, contrast: report.contrast.length, errors: report.errors.length }, null, 2));
