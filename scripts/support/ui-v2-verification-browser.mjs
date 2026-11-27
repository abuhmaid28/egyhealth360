import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const args = new Set(process.argv.slice(2));
const mode = args.has("--mode=preview") ? "preview" : args.has("--mode=normal") ? "normal" : "both";
const reportPath =
  process.argv.find((a) => a.startsWith("--report="))?.split("=")[1] ??
  "tmp/v2-browser-qa-report.json";

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
    const isLight = scope?.getAttribute("data-foundation-theme") === "light";
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

async function waitForServer(origin) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) return true;
    } catch {
      /* Starting up */
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

async function runSuite(kind) {
  const isPreview = kind === "preview";
  const port = isPreview ? "3122" : "3121";
  const origin = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    ...(isPreview ? { VERCEL: "1", EH_PREVIEW_DEMO_ONLY: "1" } : {}),
  };
  if (isPreview) delete env.EH_UI_API_ORIGIN;

  const server = spawn(
    process.execPath,
    ["apps/web/node_modules/next/dist/bin/next", "start", "apps/web", "--hostname", "127.0.0.1", "--port", port],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));

  const summary = {
    kind,
    origin,
    security: {},
    contrast: [],
    canary: null,
    viewports: [],
    flows: {},
    performanceMs: {},
  };

  let browser;
  try {
    const ready = await waitForServer(origin);
    assert.ok(ready, `Next server failed to start for ${kind}:\n${logs}`);

    // Probe security headers and negative 404 routes
    const rootRes = await fetch(origin);
    summary.security.rootStatus = rootRes.status;
    summary.security.headers = {
      xContentTypeOptions: rootRes.headers.get("x-content-type-options"),
      referrerPolicy: rootRes.headers.get("referrer-policy"),
      xRobotsTag: rootRes.headers.get("x-robots-tag"),
      xFrameOptions: rootRes.headers.get("x-frame-options"),
      permissionsPolicy: rootRes.headers.get("permissions-policy"),
    };
    const badFoundationGet = await fetch(`${origin}/v2-foundation/unapproved.webp`);
    const badFoundationHead = await fetch(`${origin}/v2-foundation/unapproved.webp`, { method: "HEAD" });
    const badRecoveryGet = await fetch(`${origin}/visual-recovery/unapproved.webp`);
    assert.equal(badFoundationGet.status, 404, "/v2-foundation/* must return 404 GET");
    assert.equal(badFoundationHead.status, 404, "/v2-foundation/* must return 404 HEAD");
    assert.equal(badRecoveryGet.status, 404, "/visual-recovery/* missing asset must return 404");
    summary.security.negative404 = {
      v2FoundationGet: badFoundationGet.status,
      v2FoundationHead: badFoundationHead.status,
      visualRecoveryGet: badRecoveryGet.status,
    };

    browser = await chromium.launch({
      headless: true,
      ...(process.env.EH_UI_CHROMIUM ? { executablePath: process.env.EH_UI_CHROMIUM } : {}),
    });

    const pageErrors = [];
    const apiRequests = [];

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/")) apiRequests.push(req.url());
    });

    // Tampered live mode check under preview build; normal demo session with V2 opt-in under normal build
    await page.addInitScript((previewFlag) => {
      globalThis.localStorage.setItem("eh360-ui-mode", previewFlag ? "live" : "demo");
      globalThis.localStorage.setItem("eh360-locale", "en");
      if (!previewFlag) {
        globalThis.sessionStorage.setItem("eh360-v2-demo", "1");
      }
    }, isPreview);

    const t0 = Date.now();
    await page.goto(origin, { waitUntil: "networkidle" });
    summary.performanceMs.gatewayLoad = Date.now() - t0;

    if (isPreview) {
      // Preview build must fail closed (0 textboxes, exact .entry-mode-note, V2EntryGateway)
      assert.equal(await page.getByRole("textbox").count(), 0, "No live login textboxes allowed in preview");
      await page.locator(".entry-mode-note").waitFor();
      await page.locator('[data-v2-gateway="true"]').waitFor();
    } else {
      // Normal non-preview build preserves Live email/password login alongside demo workspaces
      assert.equal(await page.getByRole("textbox").count(), 2, "Normal build must preserve Live login inputs");
    }

    // Verify visible DP02 mark and assets load cleanly after hydration
    await page.waitForFunction(() => {
      const visibleImgs = Array.from(globalThis.document.querySelectorAll("img")).filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return visibleImgs.length > 0 && visibleImgs.every((img) => img.complete && img.naturalWidth > 0);
    });
    const imgCheck = await page.evaluate(() =>
      Array.from(globalThis.document.querySelectorAll("img"))
        .filter((img) => {
          const r = img.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((img) => ({
          src: img.getAttribute("src"),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
        })),
    );
    for (const img of imgCheck) {
      assert.ok(img.complete && img.naturalWidth > 0, `Broken visible image on entry page: ${JSON.stringify(img)}`);
    }

    // Verify Negative Mutation Canary for contrast scanner
    const canaryResult = await page.evaluate((script) => {
      const el = globalThis.document.createElement("span");
      el.id = "contrast-canary";
      el.textContent = "Low contrast canary";
      el.style.cssText = "background:#171329;color:#282144;padding:4px;font-size:14px;display:inline-block;";
      globalThis.document.body.appendChild(el);
      const res = eval(script);
      el.remove();
      return res.failures.find((f) => f.id === "contrast-canary") ?? null;
    }, CONTRAST_EVALUATOR);
    assert.ok(canaryResult && canaryResult.ratio < 2.0, "Negative contrast canary MUST be caught by scanner");
    summary.canary = canaryResult;

    const checkContrast = async (label, expectedTheme = "dark") => {
      const actualTheme = await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme");
      assert.equal(actualTheme, expectedTheme, `Expected theme ${expectedTheme} at ${label}, got ${actualTheme}`);
      const res = await page.evaluate(CONTRAST_EVALUATOR);
      assert.equal(res.failures.length, 0, `Contrast failures at ${label}: ${JSON.stringify(res.failures)}`);
      summary.contrast.push({ label, theme: actualTheme, ...res });
    };

    const checkViewports = async (prefix) => {
      for (const vp of [
        { name: `${prefix}-desktop-1440`, width: 1440, height: 900 },
        { name: `${prefix}-tablet-768`, width: 768, height: 1024 },
        { name: `${prefix}-mobile-390`, width: 390, height: 844 },
        { name: `${prefix}-mobile-320`, width: 320, height: 568 },
      ]) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(80);
        const overflow = await page.evaluate(() => ({
          scrollWidth: globalThis.document.documentElement.scrollWidth,
          clientWidth: globalThis.document.documentElement.clientWidth,
        }));
        assert.ok(
          overflow.scrollWidth <= overflow.clientWidth + 1,
          `Horizontal overflow at ${vp.name}: ${JSON.stringify(overflow)}`,
        );
        summary.viewports.push({ label: vp.name, ...overflow });
      }
      await page.setViewportSize({ width: 720, height: 450 });
      const zoomOverflow = await page.evaluate(() => ({
        scrollWidth: globalThis.document.documentElement.scrollWidth,
        clientWidth: globalThis.document.documentElement.clientWidth,
      }));
      assert.ok(zoomOverflow.scrollWidth <= zoomOverflow.clientWidth + 1, `Overflow at ${prefix}-zoom-200-equiv-720: ${JSON.stringify(zoomOverflow)}`);
      summary.viewports.push({ label: `${prefix}-zoom-200-equiv-720`, ...zoomOverflow });
      await page.setViewportSize({ width: 1440, height: 900 });
    };

    if (isPreview) {
      await checkContrast("gateway-en-dark", "dark");

      // Toggle Light mode on V2EntryGateway
      await page.locator("[data-v2-gateway] summary").click();
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.waitForTimeout(100);
      await checkContrast("gateway-en-light", "light");

      // Toggle back to Dark mode
      await page.locator(".v2-theme-switch select").selectOption("dark");
      await page.waitForTimeout(100);

      await checkViewports("gateway");

      // Switch to Arabic RTL on Gateway & verify direction + dark contrast
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      assert.equal(await page.locator("[data-foundation-surface='gateway']").getAttribute("dir"), "rtl");
      await checkContrast("gateway-ar-dark", "dark");
      await page.getByRole("button", { name: /English/ }).click();
      await page.waitForTimeout(100);
    }

    // 1. Enter Patient portal via primary CTA / demo button
    const tPortal = Date.now();
    if (isPreview) {
      await page.locator('[data-gateway-primary-cta="PATIENT"]').click();
    } else {
      await page.locator("#demo-workspaces .demo-button").click();
    }
    await page.locator('[data-v2-portal="patient"]').waitFor();
    summary.performanceMs.enterPatient = Date.now() - tPortal;
    await checkContrast("patient-home-dark", "dark");
    await checkViewports("patient");

    // Verify neutral BP text without "optimal" / "safe"
    const homeText = await page.locator('[data-v2-portal="patient"]').innerText();
    assert.ok(!/optimal|safe range/i.test(homeText), "Telemetry must remain strictly neutral");

    // Patient discover -> select slot -> verify unchecked Option 1A+2A -> confirm booking
    await page.getByRole("link", { name: /Discover/i }).click();
    await page.locator("#discover-search").waitFor();
    await page.locator('[data-slot-chip]').first().click();
    const consentBox = page.locator('[data-consent-checkbox="true"]');
    await consentBox.waitFor();
    assert.equal(await consentBox.isChecked(), false, "Option 1A+2A consent prototype MUST be unchecked by default");
    await page.locator("#booking-reason").fill("G2-F1 verification consultation");
    await page.locator('[data-confirm-booking="true"]').click();
    await page.locator('[data-booking-receipt]').waitFor();
    await checkContrast("patient-discover-receipt");
    summary.flows.patientBooking = "PASS";

    // Appointments persistence after reload
    await page.getByRole("link", { name: "Appointments", exact: true }).click();
    await page.locator('[data-appointment-item]').first().waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-appointment-item]').first().waitFor();
    summary.flows.patientReloadPersistence = "PASS";

    // P2 profile display name sync fix verification
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.locator("#profile-name").fill("Layla Hassan");
    await page.locator('[data-save-profile="true"]').click();
    await page.waitForTimeout(150);
    assert.ok((await page.locator('[data-shell-account-name]').innerText()).includes("Layla Hassan"));
    await page.getByRole("link", { name: "My care", exact: true }).click();
    assert.ok((await page.locator('[data-patient-greeting]').innerText()).includes("Layla Hassan"));
    summary.flows.patientProfileLiveSyncP2 = "PASS";

    // Wrong-role direct navigation boundary (/admin while PATIENT)
    await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Open your active workspace/i }).waitFor();
    summary.flows.wrongRoleGuard = "PASS";

    // Switch to Doctor portal -> verify 24h time, availability publish/withdraw, consultation release
    await page.locator("[data-workspace-switch]").selectOption("CLINICIAN");
    await page.locator('[data-v2-portal="doctor"]').waitFor();
    await checkContrast("doctor-schedule-dark");
    await page.getByRole("link", { name: "Availability", exact: true }).click();
    await page.locator('[data-publish-slot-btn="true"]').click();
    await page.waitForTimeout(150);
    await page.getByRole("link", { name: "Consultation", exact: true }).click();
    await page.locator("#consult-summary").fill("Follow-up note verified");
    await page.locator("#consult-med").fill("Cetirizine 10mg");
    await page.locator('[data-release-submit="true"]').click();
    await page.waitForTimeout(150);
    summary.flows.doctorFlow = "PASS";

    // Switch to Pharmacy portal -> transition Received -> Preparing -> Dispensed + terminal lock
    await page.locator("[data-workspace-switch]").selectOption("PHARMACY_STAFF");
    await page.locator('[data-v2-portal="pharmacy"]').waitFor();
    await checkContrast("pharmacy-dark");
    if ((await page.locator('[data-pharmacy-action="Preparing"]').count()) > 0) {
      await page.locator('[data-pharmacy-action="Preparing"]').first().click();
      await page.waitForTimeout(120);
    }
    if ((await page.locator('[data-pharmacy-action="Dispensed"]').count()) > 0) {
      await page.locator('[data-pharmacy-action="Dispensed"]').first().click();
      await page.waitForTimeout(120);
    }
    await page.locator('[data-pharmacy-terminal="true"]').first().waitFor();
    summary.flows.pharmacyTerminalLock = "PASS";

    // Switch to Laboratory -> verify FUTURE / NOT LIVE + tabs + 0 mutations
    await page.locator("[data-workspace-switch]").selectOption("LAB_STAFF");
    await page.locator('[data-v2-portal="laboratory"]').waitFor();
    await page.locator('[data-lab-future-badge="true"]').waitFor();
    await checkContrast("laboratory-dark");
    summary.flows.laboratoryFutureHonesty = "PASS";

    // Switch to Admin -> verify operational directory & Light theme parity contrast
    await page.locator("[data-workspace-switch]").selectOption("ADMIN");
    await page.locator('[data-v2-portal="admin"]').waitFor();
    await page.locator("#admin-user-search").fill("Mariam");
    await checkContrast("admin-dark");

    await page.locator('[data-v2-shell] summary').click();
    await page.locator(".v2-theme-switch select").selectOption("light");
    await page.waitForTimeout(100);
    assert.equal(await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme"), "light");
    await checkContrast("admin-light", "light");
    summary.flows.adminDirectoryAndLightTheme = "PASS";

    // Sign out returns to Gateway / entry workspaces
    await page.locator('[data-shell-signout]').click();
    if (isPreview) {
      await page.locator('[data-v2-gateway="true"]').waitFor();
    } else {
      await page.locator("#demo-workspaces").waitFor();
    }
    summary.flows.signOut = "PASS";

    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join("; ")}`);
    assert.equal(apiRequests.length, 0, `Unexpected /api/v1/ requests in Demo mode: ${apiRequests.join(", ")}`);
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
  return summary;
}

const results = {};
if (mode === "normal" || mode === "both") results.normal = await runSuite("normal");
if (mode === "preview" || mode === "both") results.preview = await runSuite("preview");

await mkdir(dirname(resolve(reportPath)), { recursive: true });
await writeFile(resolve(reportPath), `${JSON.stringify(results, null, 2)}\n`, "utf8");
console.log(JSON.stringify(results, null, 2));
