import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export function resolveReportPath(
  argv = process.argv.slice(2),
  tempDir = tmpdir(),
  joinPath = join,
) {
  const flag = argv.find((a) => a.startsWith("--report="));
  if (flag) {
    const value = flag.slice("--report=".length).trim();
    if (value) return value;
  }
  return joinPath(tempDir, "eh-v2-browser-qa-report.json");
}

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

async function assertHeadingHierarchy(page, label) {
  const levels = await page.evaluate(() =>
    Array.from(globalThis.document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => ({
      level: Number(h.tagName.slice(1)),
      text: (h.textContent || "").trim().slice(0, 48),
    })),
  );
  assert.ok(levels.some((h) => h.level === 1), `Missing h1 at ${label}: ${JSON.stringify(levels)}`);
  let prev = 1;
  for (const h of levels) {
    assert.ok(
      h.level <= prev + 1,
      `Heading level jump at ${label} (${prev} -> ${h.level} "${h.text}"): ${JSON.stringify(levels)}`,
    );
    prev = h.level;
  }
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
    remediation: {},
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
      contentSecurityPolicy: rootRes.headers.get("content-security-policy"),
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

    // 1. F-01 + F-02 dedicated probes in normal configured mode
    if (!isPreview) {
      // F-01: Denied sessionStorage getter probe -> normal Demo must render without ErrorPage or uncaught exception
      const deniedCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const deniedErrors = [];
      const deniedPage = await deniedCtx.newPage();
      deniedPage.on("pageerror", (e) => deniedErrors.push(e.message));
      await deniedPage.addInitScript(() => {
        Object.defineProperty(globalThis.window, "sessionStorage", {
          configurable: true,
          get() {
            throw new globalThis.DOMException("Storage denied by test", "SecurityError");
          },
        });
      });
      await deniedPage.goto(origin, { waitUntil: "networkidle" });
      await deniedPage.locator("#demo-workspaces .demo-button").click();
      await deniedPage.locator("[data-portal-shell='PATIENT']").waitFor();
      assert.equal(deniedErrors.length, 0, `F-01 denied storage errors: ${deniedErrors.join("; ")}`);
      assert.equal(await deniedPage.locator("[data-v2-portal]").count(), 0, "F-01 denied storage without ?v2=1 keeps normal Demo");
      await deniedCtx.close();

      // F-02: Denied sessionStorage WITH /?v2=1 -> bounded in-memory SPA V2 works, role switches, reload without ?v2=1 returns normal Demo cleanly
      const deniedOptCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const deniedOptErrors = [];
      const deniedOptPage = await deniedOptCtx.newPage();
      deniedOptPage.on("pageerror", (e) => deniedOptErrors.push(e.message));
      await deniedOptPage.addInitScript(() => {
        Object.defineProperty(globalThis.window, "sessionStorage", {
          configurable: true,
          get() {
            throw new globalThis.DOMException("Storage denied by test", "SecurityError");
          },
        });
      });
      await deniedOptPage.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await deniedOptPage.locator("#demo-workspaces .demo-button").click();
      await deniedOptPage.locator('[data-v2-portal="patient"]').waitFor();
      await deniedOptPage.locator("[data-workspace-switch]").selectOption("CLINICIAN");
      await deniedOptPage.locator('[data-v2-portal="doctor"]').waitFor();
      assert.equal(deniedOptErrors.length, 0);
      await deniedOptCtx.close();

      // F-02: /?v2=1 entry -> Patient V2 -> Link nav -> reload persistence -> sign out clears V2 opt-in -> normal Demo entry
      const optCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const optPage = await optCtx.newPage();
      optPage.on("pageerror", (e) => pageErrors.push(e.message));
      await optPage.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await optPage.locator("#demo-workspaces .demo-button").click();
      await optPage.locator('[data-v2-portal="patient"]').waitFor();
      await optPage.getByRole("link", { name: /Discover/i }).click();
      await optPage.locator("#discover-search").waitFor();
      await optPage.reload({ waitUntil: "networkidle" });
      await optPage.locator('[data-v2-portal="patient"]').waitFor();
      await optPage.locator("[data-shell-signout]").click();
      await optPage.locator("#demo-workspaces .demo-button").waitFor();
      await optPage.locator("#demo-workspaces .demo-button").click();
      await optPage.locator("[data-portal-shell='PATIENT']").waitFor();
      assert.equal(await optPage.locator('[data-v2-portal="patient"]').count(), 0, "Sign out must clear ?v2=1 opt-in");
      await optCtx.close();

      // F-01/F-02 negative: Live mode with ?v2=1 and tampered eh360-v2-demo must NEVER render DemoV2Router
      const liveCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const livePage = await liveCtx.newPage();
      let liveAuthenticated = false;
      await livePage.route("**/api/v1/**", async (route) => {
        const url = route.request().url();
        if (url.endsWith("/auth/login")) {
          liveAuthenticated = true;
        }
        if (liveAuthenticated && (url.endsWith("/auth/login") || url.endsWith("/auth/me"))) {
          return route.fulfill({
            json: {
              data: {
                user: { email: "patient@example.invalid", role: "PATIENT" },
                session: { expiresAt: "2026-10-29T00:00:00Z" },
                csrfToken: "csrf-live-negative",
              },
            },
          });
        }
        return route.fulfill({ status: 401, json: { error: { message: "Unauthenticated" } } });
      });
      await livePage.addInitScript(() => {
        globalThis.sessionStorage.setItem("eh360-v2-demo", "1");
      });
      await livePage.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await livePage.getByLabel("Email address").fill("patient@example.invalid");
      await livePage.getByLabel("Password", { exact: true }).fill("synthetic-only");
      await livePage.getByRole("button", { name: "Sign in with live account" }).click();
      await livePage.getByText("Live care", { exact: true }).waitFor();
      assert.equal(await livePage.locator("[data-v2-portal]").count(), 0, "Live mode must never mount DemoV2Router");
      await liveCtx.close();

      summary.remediation.f01StorageDenialAndLiveNegative = "PASS";
      summary.remediation.f02QueryOptInLifecycle = "PASS";
    }

    // 2. F-09 Gateway failed-image probe across Dark, Light, and System (preview build)
    if (isPreview) {
      for (const scheme of ["dark", "light", "no-preference"]) {
        const failImgCtx = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          colorScheme: scheme,
        });
        const failImgPage = await failImgCtx.newPage();
        await failImgPage.route("**/care-encounter.webp", (route) => route.abort());
        await failImgPage.goto(origin, { waitUntil: "networkidle" });
        if (scheme === "light") {
          await failImgPage.locator("[data-v2-gateway] summary").click();
          await failImgPage.locator(".v2-theme-switch select").selectOption("light");
          await failImgPage.waitForTimeout(80);
        }
        const paneBg = await failImgPage
          .locator('[data-v2-gateway] [aria-labelledby="entry-title"] > div[aria-hidden="true"]')
          .evaluate((el) => globalThis.getComputedStyle(el).backgroundColor);
        assert.equal(paneBg, "rgb(20, 15, 38)", `Hero visual pane dark fallback must hold in ${scheme}: ${paneBg}`);
        await failImgCtx.close();
      }
      summary.remediation.f09HeroDarkFallback = "PASS";
    }

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
      assert.equal(await page.getByRole("textbox").count(), 0, "No live login textboxes allowed in preview");
      await page.locator(".entry-mode-note").waitFor();
      await page.locator('[data-v2-gateway="true"]').waitFor();
      await assertHeadingHierarchy(page, "gateway");
    } else {
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
      await page.locator("[data-v2-gateway] summary").click();
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.waitForTimeout(100);
      await checkContrast("gateway-en-light", "light");
      await page.locator(".v2-theme-switch select").selectOption("dark");
      await page.waitForTimeout(100);
      await checkViewports("gateway");
      await page.getByRole("button", { name: /العربية/ }).click();
      await page.waitForTimeout(100);
      assert.equal(await page.locator("[data-foundation-surface='gateway']").getAttribute("dir"), "rtl");
      await checkContrast("gateway-ar-dark", "dark");
      await page.getByRole("button", { name: /English/ }).click();
      await page.waitForTimeout(100);

      // F-09: Fresh Gateway -> Doctor empty consultation state check before Patient bookings
      await page.locator('[data-gateway-role-btn="CLINICIAN"]').click();
      await page.locator('[data-v2-portal="doctor"]').waitFor();
      await page.getByRole("link", { name: "Consultation", exact: true }).click();
      await page.locator('[data-doctor-empty-consultations="true"]').waitFor();
      await page.locator('[data-shell-signout]').click();
      await page.locator('[data-v2-gateway="true"]').waitFor();
      summary.remediation.f09FreshDoctorEmpty = "PASS";
    }

    // 3. Enter Patient portal via primary CTA / demo button
    const tPortal = Date.now();
    if (isPreview) {
      await page.locator('[data-gateway-primary-cta="PATIENT"]').click();
    } else {
      await page.locator("#demo-workspaces .demo-button").click();
    }
    await page.locator('[data-v2-portal="patient"]').waitFor();
    summary.performanceMs.enterPatient = Date.now() - tPortal;
    await assertHeadingHierarchy(page, "patient-home");
    await checkContrast("patient-home-dark", "dark");
    await checkViewports("patient");

    // F-05: 0 booked visits + 1 released summary on fresh Patient home
    assert.ok((await page.locator('[data-patient-booked-count]').innerText()).includes("0 booked visits"));
    assert.ok((await page.locator('[data-patient-released-count]').innerText()).includes("1 released summary"));

    // Verify neutral BP text without "optimal" / "safe"
    const homeText = await page.locator('[data-v2-portal="patient"]').innerText();
    assert.ok(!/optimal|safe range/i.test(homeText), "Telemetry must remain strictly neutral");

    // F-07: Unknown doctor ID + unmatched subroute must show Not Found (never fallback to providers[0])
    await page.goto(`${origin}/patient/doctors/unknown-doctor-213`, { waitUntil: "networkidle" });
    await page.locator('[data-v2-not-found="true"]').waitFor();
    assert.equal(await page.locator('[data-slot-chip]').count(), 0);
    await page.goto(`${origin}/patient/unknown-subroute`, { waitUntil: "networkidle" });
    await page.locator('[data-v2-not-found="true"]').waitFor();

    // F-07: Selecting slot on omar-khaled then navigating to mariam-hassan clears stale slot
    await page.goto(`${origin}/patient/doctors/omar-khaled`, { waitUntil: "networkidle" });
    await page.locator('[data-slot-chip]').first().click();
    await page.locator('[data-booking-form="true"]').waitFor();
    await page.goto(`${origin}/patient/doctors/mariam-hassan`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-booking-form="true"]').count(), 0, "Stale slot must clear on doctor route change");

    // Patient discover -> book 1st appointment with Dr. Mariam Hassan (patientName = "Ahmed Mostafa")
    await page.getByRole("link", { name: "All doctors" }).click();
    await page.locator("#discover-search").waitFor();
    await assertHeadingHierarchy(page, "patient-discover");
    await page.locator('[data-slot-chip]').first().click();
    const consentBox = page.locator('[data-consent-checkbox="true"]');
    await consentBox.waitFor();
    assert.equal(await consentBox.isChecked(), false, "Option 1A+2A consent prototype MUST be unchecked by default");
    await page.locator("#booking-reason").fill("G2-F3 verification consultation");
    await page.locator('[data-confirm-booking="true"]').click();
    await page.locator('[data-booking-receipt]').waitFor();
    await checkContrast("patient-discover-receipt");
    summary.flows.patientBooking = "PASS";

    // F-05: 1 booked visit singular check on Patient home + Next-appointment detail link (EN + AR)
    await page.getByRole("link", { name: "My care", exact: true }).click();
    assert.ok((await page.locator('[data-patient-booked-count]').innerText()).includes("1 booked visit"));
    await page.locator('[data-next-appointment-link="true"]').click();
    await page.locator("#patient-appt-detail-title").waitFor();
    await page.getByRole("link", { name: "My care", exact: true }).click();
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    assert.ok((await page.locator('[data-patient-booked-count]').innerText()).includes("موعد واحد مسجل"));
    assert.ok((await page.locator('[data-patient-released-count]').innerText()).includes("ملخص واحد معتمد"));
    await checkContrast("patient-home-ar-dark", "dark");
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);

    // Appointments persistence & detail route after reload
    await page.getByRole("link", { name: "Appointments", exact: true }).click();
    await page.locator('[data-appointment-item]').first().waitFor();
    await assertHeadingHierarchy(page, "patient-appointments");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-appointment-item]').first().waitFor();
    await page.locator('[data-appointment-detail-link="demo-appointment-1"]').click();
    await page.locator("#patient-appt-detail-title").waitFor();
    await assertHeadingHierarchy(page, "patient-appointment-detail");
    summary.flows.patientReloadPersistence = "PASS";
    summary.remediation.f41PatientAppointmentDetailLinks = "PASS";

    // F-06 + F-09: Save profile ("Layla Hassan") triggers toast -> switching locale clears stale toast
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.locator("#profile-name").waitFor();
    await assertHeadingHierarchy(page, "patient-settings");
    await page.locator("#profile-name").fill("Layla Hassan");
    await page.locator('[data-save-profile="true"]').click();
    await page.locator('[data-v2-toast-region="true"]').getByText(/Patient profile updated/i).waitFor();
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    assert.equal(
      (await page.locator('[data-v2-toast-region="true"]').innerText()).trim(),
      "",
      "F-06: Stale EN toast must be cleared on AR switch",
    );
    await page.locator('[data-save-profile="true"]').click();
    await page.locator('[data-v2-toast-region="true"]').getByText(/تم تحديث ملف المريض التجريبي/).waitFor();
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);
    summary.remediation.f06StaleToastCleared = "PASS";

    assert.ok((await page.locator('[data-shell-account-name]').innerText()).includes("Layla Hassan"));
    await page.getByRole("link", { name: "My care", exact: true }).click();
    assert.ok((await page.locator('[data-patient-greeting]').innerText()).includes("Layla Hassan"));
    summary.flows.patientProfileLiveSyncP2 = "PASS";

    // F-09: Book 2nd appointment after profile rename (retains snapshot "Ahmed Mostafa" on 1st, "Layla Hassan" on 2nd)
    await page.getByRole("link", { name: "Discover", exact: true }).click();
    await page.locator('[data-slot-chip]').first().click();
    await page.locator("#booking-reason").fill("Post-rename booking check");
    await page.locator('[data-confirm-booking="true"]').click();
    await page.locator('[data-booking-receipt]').waitFor();

    // F4-1: Book 3rd appointment with a DIFFERENT provider (omar-khaled) to test real existing foreign-appointment UI guard in Doctor portal
    await page.goto(`${origin}/patient/doctors/omar-khaled`, { waitUntil: "networkidle" });
    await page.locator('[data-slot-chip]').first().click();
    await page.locator("#booking-reason").fill("Foreign provider booking check");
    await page.locator('[data-confirm-booking="true"]').click();
    await page.locator('[data-booking-receipt]').waitFor();

    // Wrong-role direct navigation boundary (/admin while PATIENT)
    await page.goto(`${origin}/admin`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Open your active workspace/i }).waitFor();
    summary.flows.wrongRoleGuard = "PASS";

    // Switch to Doctor portal -> verify snapshot labels, 24h time, unknown & foreign consultation not-found, F-03 release & private sentinel
    await page.locator("[data-workspace-switch]").selectOption("CLINICIAN");
    await page.locator('[data-v2-portal="doctor"]').waitFor();
    await page.locator('[data-doctor-appointment="demo-appointment-1"]').waitFor();
    assert.equal(await page.locator('[data-doctor-appointment="demo-appointment-3"]').count(), 0, "Foreign provider appointment must not appear in Doctor schedule");
    await assertHeadingHierarchy(page, "doctor-schedule");
    await checkContrast("doctor-schedule-dark");
    await checkViewports("doctor");
    const appt1Text = await page.locator('[data-doctor-appointment="demo-appointment-1"]').innerText();
    const appt2Text = await page.locator('[data-doctor-appointment="demo-appointment-2"]').innerText();
    assert.ok(appt1Text.includes("Ahmed Mostafa"), "Existing booking must retain booking-time snapshot Ahmed Mostafa");
    assert.ok(appt2Text.includes("Layla Hassan"), "New booking must reflect updated profile Layla Hassan");
    assert.ok((await page.locator('[data-booking-patient-snapshot="true"]').count()) >= 2);
    summary.remediation.f09SnapshotVsProfile = "PASS";

    // F-07 + F4-1: Unknown AND real existing foreign consultation/appointment IDs must show Not Found
    await page.goto(`${origin}/doctor/consultation/unknown-visit-213`, { waitUntil: "networkidle" });
    await page.locator('[data-v2-not-found="true"]').waitFor();
    assert.equal(await page.locator('[data-release-form="true"]').count(), 0);
    await page.goto(`${origin}/doctor/consultation/demo-appointment-3`, { waitUntil: "networkidle" });
    await page.locator('[data-v2-not-found="true"]').waitFor();
    assert.equal(await page.locator('[data-release-form="true"]').count(), 0);
    await page.goto(`${origin}/doctor/appointments/demo-appointment-3`, { waitUntil: "networkidle" });
    await page.locator('[data-v2-not-found="true"]').waitFor();
    summary.remediation.f41RealForeignAppointmentRejected = "PASS";
    await page.goto(`${origin}/doctor/schedule`, { waitUntil: "networkidle" });

    // Availability publish + withdraw + AR status check
    await page.getByRole("link", { name: "Availability", exact: true }).click();
    await page.locator("#slot-date").waitFor();
    await assertHeadingHierarchy(page, "doctor-availability");
    await page.locator('[data-publish-slot-btn="true"]').click();
    await page.waitForTimeout(150);
    await page.locator('[data-withdraw-slot]').last().click();
    await page.waitForTimeout(150);
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    await page.getByText("منشور", { exact: true }).first().waitFor();
    await page.getByText("مسحوب", { exact: true }).first().waitFor();
    await checkContrast("doctor-availability-ar-dark", "dark");
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);
    summary.remediation.f05ArabicCountsAndStatus = "PASS";
    summary.remediation.f41SlotWithdrawAndAr = "PASS";

    // F-03 + F4-1: Open exact /doctor/consultation/demo-appointment-1 -> test empty release block, then full release & reload read-only lock
    await page.goto(`${origin}/doctor/consultation/demo-appointment-1`, { waitUntil: "networkidle" });
    await page.locator("#consult-assessment").waitFor();
    await assertHeadingHierarchy(page, "doctor-consultation");
    await page.locator('[data-release-submit="true"]').click();
    await page.locator('[data-v2-portal="doctor"] [role="alert"]').waitFor();
    assert.equal(await page.locator('[data-consultation-released="true"]').count(), 0, "Empty release must be blocked in UI");
    summary.remediation.f41EmptyReleaseBlocked = "PASS";

    await page.locator("#consult-assessment").fill("Public clinical assessment G2-F3");
    await page.locator("#consult-followup").fill("Public follow-up guidance G2-F3");
    await page.locator("#consult-private-notes").fill("PRIVATE_NOTE_SENTINEL_213");
    await page.locator("#consult-med").fill("Cetirizine 10mg");
    await page.locator("#consult-dosage").fill("10 mg once daily");
    await page.locator("#consult-inst").fill("Take after evening meal");
    await page.locator('[data-release-submit="true"]').click();
    await page.locator('[data-consultation-released="true"]').waitFor();
    assert.equal(await page.locator('[data-release-submit="true"]').count(), 0, "Released visit becomes read-only");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-consultation-released="true"]').waitFor();
    assert.equal(await page.locator('[data-release-submit="true"]').count(), 0, "Duplicate release remains blocked after reload");
    summary.remediation.f41PostReloadReadOnlyLock = "PASS";
    summary.flows.doctorFlow = "PASS";

    // F-03: Switch back to Patient -> Home & Record show public assessment/guidance & NEVER private sentinel
    await page.locator("[data-workspace-switch]").selectOption("PATIENT");
    await page.locator('[data-v2-portal="patient"]').waitFor();
    await page.locator('[data-patient-home-released]').waitFor();
    const patientHomeAfter = await page.locator('[data-v2-portal="patient"]').innerText();
    assert.ok(patientHomeAfter.includes("Public clinical assessment G2-F3"));
    assert.ok(patientHomeAfter.includes("Public follow-up guidance G2-F3"));
    assert.ok(!patientHomeAfter.includes("PRIVATE_NOTE_SENTINEL_213"));
    assert.ok(!patientHomeAfter.includes("Private synthetic note"));

    await page.getByRole("link", { name: "Record", exact: true }).click();
    await page.locator("#record-v2-title").waitFor();
    await assertHeadingHierarchy(page, "patient-record");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#record-v2-title").waitFor();
    const recordAfterReload = await page.locator('[data-v2-portal="patient"]').innerText();
    assert.ok(recordAfterReload.includes("Public clinical assessment G2-F3"));
    assert.ok(recordAfterReload.includes("Public follow-up guidance G2-F3"));
    assert.ok(recordAfterReload.includes("Cetirizine 10mg"));
    assert.ok(!recordAfterReload.includes("PRIVATE_NOTE_SENTINEL_213"));
    assert.ok(!recordAfterReload.includes("Private synthetic note"));
    summary.remediation.f03PrivacyAndShareableSummary = "PASS";

    // Switch to Pharmacy portal -> transition Received -> Preparing -> Dispensed + verify zero private notes + viewport + AR/light parity
    await page.locator("[data-workspace-switch]").selectOption("PHARMACY_STAFF");
    await page.locator('[data-v2-portal="pharmacy"]').waitFor();
    await page.locator("#pharmacy-v2-title").waitFor();
    await assertHeadingHierarchy(page, "pharmacy");
    await checkContrast("pharmacy-dark");
    await checkViewports("pharmacy");
    const pharmText = await page.locator('[data-v2-portal="pharmacy"]').innerText();
    assert.ok(!pharmText.includes("PRIVATE_NOTE_SENTINEL_213"));
    assert.ok(!pharmText.includes("Public clinical assessment G2-F3"));
    if ((await page.locator('[data-pharmacy-action="Preparing"]').count()) > 0) {
      await page.locator('[data-pharmacy-action="Preparing"]').first().click();
      await page.waitForTimeout(120);
    }
    if ((await page.locator('[data-pharmacy-action="Dispensed"]').count()) > 0) {
      await page.locator('[data-pharmacy-action="Dispensed"]').first().click();
      await page.waitForTimeout(120);
    }
    await page.locator('[data-pharmacy-terminal="true"]').first().waitFor();
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    await checkContrast("pharmacy-ar-dark", "dark");
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);
    summary.flows.pharmacyTerminalLock = "PASS";

    // F-08: Switch to Laboratory -> verify FUTURE / NOT LIVE + accessible ARIA tablist keyboard nav in EN LTR & AR RTL
    await page.locator("[data-workspace-switch]").selectOption("LAB_STAFF");
    await page.locator('[data-v2-portal="laboratory"]').waitFor();
    await page.locator('[data-lab-future-badge="true"]').waitFor();
    await assertHeadingHierarchy(page, "laboratory");
    await page.locator('[data-lab-future-badge="true"]').waitFor();
    await checkContrast("laboratory-dark");
    await checkViewports("laboratory");

    const tab1 = page.locator("#lab-tab-orders");
    const tab2 = page.locator("#lab-tab-specimens");
    const tab3 = page.locator("#lab-tab-reports");
    assert.equal(await tab1.getAttribute("aria-selected"), "true");
    assert.equal(await tab1.getAttribute("tabindex"), "0");
    assert.equal(await tab2.getAttribute("tabindex"), "-1");
    await tab1.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await tab2.getAttribute("aria-selected"), "true");
    assert.equal(await tab2.getAttribute("tabindex"), "0");
    await page.keyboard.press("End");
    assert.equal(await tab3.getAttribute("aria-selected"), "true");
    await page.keyboard.press("Home");
    assert.equal(await tab1.getAttribute("aria-selected"), "true");

    // RTL Arabic keyboard test: ArrowLeft moves visually forward (orders -> specimens)
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    await checkContrast("laboratory-ar-dark", "dark");
    await tab1.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await tab2.getAttribute("aria-selected"), "true");
    await page.keyboard.press("ArrowRight");
    assert.equal(await tab1.getAttribute("aria-selected"), "true");
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);

    summary.flows.laboratoryFutureHonesty = "PASS";
    summary.remediation.f07RouteAndSelectionGuards = "PASS";
    summary.remediation.f08HeadingsAndLabTablist = "PASS";

    // Switch to Admin -> verify operational directory, viewports & Light theme parity contrast across Admin + Doctor + Patient
    await page.locator("[data-workspace-switch]").selectOption("ADMIN");
    await page.locator('[data-v2-portal="admin"]').waitFor();
    await page.locator("#admin-user-search").waitFor();
    await assertHeadingHierarchy(page, "admin");
    await page.locator("#admin-user-search").fill("Mariam");
    await checkContrast("admin-dark");
    await checkViewports("admin");

    await page.locator('[data-v2-shell] summary').click();
    await page.locator(".v2-theme-switch select").selectOption("light");
    await page.waitForTimeout(100);
    assert.equal(await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme"), "light");
    await checkContrast("admin-light", "light");
    await page.getByRole("button", { name: /العربية/ }).click();
    await page.waitForTimeout(80);
    await checkContrast("admin-ar-light", "light");
    await page.getByRole("button", { name: /English/ }).click();
    await page.waitForTimeout(80);
    summary.flows.adminDirectoryAndLightTheme = "PASS";

    // Check Light theme contrast on Doctor & Patient too, then reset theme to dark
    await page.locator("[data-workspace-switch]").selectOption("CLINICIAN");
    await page.locator('[data-v2-portal="doctor"]').waitFor();
    if ((await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme")) !== "light") {
      if ((await page.locator('[data-v2-shell] details[open]').count()) === 0) {
        await page.locator('[data-v2-shell] summary').click();
      }
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.waitForTimeout(100);
    }
    await checkContrast("doctor-light", "light");
    await page.locator("[data-workspace-switch]").selectOption("PATIENT");
    await page.locator('[data-v2-portal="patient"]').waitFor();
    if ((await page.locator("[data-foundation-theme]").getAttribute("data-foundation-theme")) !== "light") {
      if ((await page.locator('[data-v2-shell] details[open]').count()) === 0) {
        await page.locator('[data-v2-shell] summary').click();
      }
      await page.locator(".v2-theme-switch select").selectOption("light");
      await page.waitForTimeout(100);
    }
    await checkContrast("patient-home-light", "light");
    if ((await page.locator('[data-v2-shell] details[open]').count()) === 0) {
      await page.locator('[data-v2-shell] summary').click();
    }
    await page.locator(".v2-theme-switch select").selectOption("dark");
    await page.waitForTimeout(100);

    // Sign out preserves demo journey in storage until explicit reset
    await page.locator('[data-shell-signout]').click();
    if (isPreview) {
      await page.locator('[data-v2-gateway="true"]').waitFor();
    } else {
      await page.locator("#demo-workspaces").waitFor();
    }
    summary.flows.signOut = "PASS";

    // F4-1: Sign out preserves persisted Demo state; Explicit Demo Reset clears back to Ahmed Mostafa / 0 booked visits
    if (isPreview) {
      await page.locator('[data-gateway-primary-cta="PATIENT"]').click();
    } else {
      await page.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces .demo-button").click();
    }
    await page.locator('[data-v2-portal="patient"]').waitFor();
    assert.ok((await page.locator('[data-patient-greeting]').innerText()).includes("Layla Hassan"));
    await page.locator('[data-shell-reset]').click();
    if (isPreview) {
      await page.locator('[data-v2-gateway="true"]').waitFor();
      await page.locator('[data-gateway-primary-cta="PATIENT"]').click();
    } else {
      await page.locator("#demo-workspaces").waitFor();
      await page.goto(`${origin}/?v2=1`, { waitUntil: "networkidle" });
      await page.locator("#demo-workspaces .demo-button").click();
    }
    await page.locator('[data-v2-portal="patient"]').waitFor();
    assert.ok((await page.locator('[data-patient-greeting]').innerText()).includes("Ahmed Mostafa"));
    assert.ok((await page.locator('[data-patient-booked-count]').innerText()).includes("0 booked visits"));
    assert.ok((await page.locator('[data-patient-released-count]').innerText()).includes("1 released summary"));
    summary.remediation.f41DemoResetClean = "PASS";

    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join("; ")}`);
    assert.equal(apiRequests.length, 0, `Unexpected /api/v1/ requests in Demo mode: ${apiRequests.join(", ")}`);
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const argSet = new Set(args);
  const mode = argSet.has("--mode=preview") ? "preview" : argSet.has("--mode=normal") ? "normal" : "both";
  const hasExplicitReport = args.some((a) => a.startsWith("--report="));
  let ownedTempDir = null;
  let reportPath;
  if (hasExplicitReport) {
    reportPath = resolveReportPath(args);
  } else {
    ownedTempDir = await mkdtemp(join(tmpdir(), "eh-v2-qa-"));
    reportPath = resolveReportPath(args, ownedTempDir, join);
  }

  try {
    const results = {};
    if (mode === "normal" || mode === "both") results.normal = await runSuite("normal");
    if (mode === "preview" || mode === "both") results.preview = await runSuite("preview");

    await mkdir(dirname(resolve(reportPath)), { recursive: true });
    await writeFile(resolve(reportPath), `${JSON.stringify(results, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(results, null, 2));
  } finally {
    if (ownedTempDir) {
      await rm(ownedTempDir, { recursive: true, force: true });
    }
  }
}

const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isEntrypoint) {
  await main();
}
