import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

function moduleValue(path) {
  const exports = {};
  new Function(
    "exports",
    ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(exports);
  return exports;
}
const fixture = moduleValue("apps/web/src/lib/mock/fixtures.ts");
export async function openDemoUtility(page) {
  await page
    .locator(
      'select[aria-label="Demo workspace"], select[aria-label="مساحة العرض التجريبي"]',
    )
    .first()
    .waitFor({ state: "attached" });
  const utility = page.locator("[data-demo-utility]");
  if ((await utility.count()) && !(await utility.evaluate((el) => el.open))) {
    await utility.locator("summary").click();
  }
}
export async function toggleDemoControls(page, legacyLabel = "Demo controls") {
  const utility = page.locator("[data-demo-utility]");
  if (await utility.count()) await utility.locator("summary").click();
  else await page.getByText(legacyLabel, { exact: true }).click();
}
export const { myCareCopy } = moduleValue(
  "apps/web/src/lib/patient-my-care-copy.ts",
);
export function myCareDemoState() {
  return {
    session: {
      role: "PATIENT",
      name: fixture.profile.displayName,
      mode: "demo",
    },
    profile: fixture.profile,
    slots: fixture.slots,
    appointments: [
      {
        id: "demo-my-care-visit",
        patientName: fixture.profile.displayName,
        provider: fixture.providers[0],
        slot: fixture.slots[1],
        status: "Upcoming",
        reason: "Synthetic visual-review appointment",
      },
    ],
    consultations: [fixture.previous],
    fulfillment: {},
  };
}
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const booking = {
  id: id(1),
  slotId: id(2),
  providerId: id(3),
  clinicId: id(4),
  patientDisplayName: "Synthetic Ahmed",
  startAt: "2026-11-02T12:30:00Z",
  endAt: "2026-11-02T13:00:00Z",
  timeZone: "Africa/Cairo",
  state: "BOOKED",
  version: 1,
  createdAt: "2026-11-01T10:00:00Z",
  predecessorId: null,
  successorId: null,
  attendance: "UNKNOWN",
  transitions: [],
  attendanceHistory: [],
};

// Controlled browser measurements, not a WCAG certification or hosted/clinical acceptance.
async function measurePresentation(page, locale) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const fonts = [];
  for (const selector of ["[data-appointment-anchor] h3", "[data-appointment-anchor] bdi[dir]", "header bdi[dir=ltr]"]) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const result = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    fonts.push({ selector, fonts: result.fonts.filter(f => f.glyphCount > 0).map(f => f.familyName) });
  }
  assert.ok(fonts[0].fonts.some(f => f.includes(locale === "ar" ? "Plex" : "Inter")), JSON.stringify(fonts));
  assert.ok(fonts[1].fonts.some(f => f.includes(locale === "ar" ? "Plex" : "Inter")), JSON.stringify(fonts));
  assert.ok(fonts[2].fonts.some(f => f.includes("Inter")), JSON.stringify(fonts));
  await cdp.detach();
  const contrast = await page.evaluate(() => {
    const rgb = s => s.match(/[\d.]+/g)?.map(Number);
    const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((n,v,i) => n + v * [.2126,.7152,.0722][i], 0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const background = el => { for (;el;el=el.parentElement) { const c=rgb(globalThis.getComputedStyle(el).backgroundColor); if(c && (c.length<4 || c[3]===1)) return c; } return [255,255,255]; };
    const text = [...globalThis.document.querySelectorAll('[data-my-care] *')].filter(el => el.checkVisibility() && [...el.childNodes].some(n => n.nodeType===3 && n.textContent.trim())).map(el => ({ text: el.textContent.trim().slice(0,50), ratio: ratio(rgb(globalThis.getComputedStyle(el).color),background(el)) }));
    return { minimum: Math.min(...text.map(x=>x.ratio)), failures: text.filter(x=>x.ratio<4.5) };
  });
  assert.deepEqual(contrast.failures, [], JSON.stringify(contrast));
  const primary = page.locator('header nav a').first(); await primary.focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const control = await primary.evaluate(el => {
    const s=globalThis.getComputedStyle(el), rgb=x=>x.match(/[\d.]+/g).slice(0,3).map(Number);
    const l=x=>rgb(x).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
    const bg=globalThis.getComputedStyle(el.closest('header')).backgroundColor;
    return { outline: s.outlineStyle, focusRatio: ratio(s.outlineColor,bg), borderRatio: ratio(s.borderTopColor,bg) };
  });
  assert.equal(control.outline,"solid"); assert.ok(control.focusRatio>=3 && control.borderRatio>=3,JSON.stringify(control));
  return { locale, fonts, contrast, control };
}
const releasedSummary = {
  id: id(30), consultationId: id(31), kind: "PATIENT_SUMMARY", history: { total: 1 },
  versions: [{ id: id(32), kind: "RELEASE", state: "SIGNED_RELEASED", content: "PERMITTED-SYNTHETIC-SUMMARY", patientInstructions: "", complaint: null, problems: [], diagnoses: [], allergyReview: { state: "NOT_REVIEWED", items: [] }, createdAt: "2026-11-01T10:00:00Z", signedAt: "2026-11-01T10:00:00Z", releasedAt: "2026-11-01T10:00:00Z", reason: null, effective: true }],
};

export async function testPatientMyCare(browser, origin, shots) {
  const report = {
    desktop: { width: 1600, height: 1000 },
    mobile: { width: 390, height: 844 },
    screens: [],
    reflow: [],
    textResize: [],
    focus: [],
    live: [],
    presentation: [],
    errors: [],
  };
  if (shots) await mkdir(shots, { recursive: true });
  for (const locale of ["en", "ar"]) {
    const c = myCareCopy[locale];
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      reducedMotion: "reduce",
    });
    const requests = [];
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/")) requests.push(r.url());
    });
    await page.addInitScript(
      ({ locale, state }) => {
        globalThis.localStorage.setItem("eh360-locale", locale);
        globalThis.localStorage.setItem("eh360-ui-mode", "demo");
        globalThis.localStorage.setItem(
          "eh360-ui-demo-v1",
          JSON.stringify(state),
        );
      },
      { locale, state: myCareDemoState() },
    );
    await page.goto(origin + "/patient");
    await page
      .locator('[data-appointment-anchor] a[href$="demo-my-care-visit"]')
      .waitFor();
    await page
      .getByRole("heading", { name: c.recentCare, exact: true })
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    assert.equal(await page.locator("[data-demo-utility][open]").count(), 0);
    assert.equal(
      await page.getByLabel(c.demoWorkspace, { exact: true }).isVisible(),
      false,
    );
    assert.equal(
      await page.getByLabel(c.screenState, { exact: true }).isVisible(),
      false,
    );
    assert.equal(
      await page
        .locator("#main")
        .getByText(c.sourceMissing, { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .locator("#main")
        .getByText(c.dateMissing, { exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("heading", { name: `${c.greeting} Ahmed`, exact: true })
      .waitFor();
    assert.equal(
      await page.locator("[data-clinician-monogram]").innerText(),
      "MH",
    );
    assert.equal(
      await page.locator("[data-my-care]").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    const capture = async (name, fullPage = false) => {
      if (shots) {
        await page.screenshot({
          path: resolve(shots, name + ".png"),
          fullPage,
        });
      }
      report.screens.push(name + ".png");
    };
    await capture(`patient-my-care-desktop-${locale}`);
    await capture(`patient-my-care-desktop-${locale}-full`, true);
    const quickAccess = page.locator("[data-care-shortcuts] a").first();
    await quickAccess.hover();
    assert.equal(
      await quickAccess.evaluate(
        (el) => globalThis.getComputedStyle(el).backgroundColor,
      ),
      "rgb(239, 234, 247)",
    );
    await quickAccess.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(
      await quickAccess.evaluate(
        (el) => globalThis.getComputedStyle(el).outlineWidth,
      ),
      "3px",
    );
    await capture(`patient-my-care-focus-desktop-${locale}`);
    await page.mouse.move(0, 0);
    await page
      .getByRole("heading", { name: `${c.greeting} Ahmed`, exact: true })
      .click();
    const boxes = await page.locator("[data-appointment-anchor]").boundingBox();
    assert.ok(boxes.width > 600);
    for (const width of [1440, 1200, 1024, 834, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const metrics = await page.evaluate(() => ({
        width: globalThis.innerWidth,
        scroll: globalThis.document.documentElement.scrollWidth,
      }));
      assert.ok(metrics.scroll <= width, `${locale} overflow at ${width}`);
      assert.ok(await page.locator("[data-demo-indication]").isVisible());
      report.reflow.push({ locale, ...metrics });
    }
    await capture(`patient-my-care-320-${locale}`, true);
    await page.setViewportSize({ width: 390, height: 844 });
    const labels = await page
      .locator("[data-care-shortcuts] strong")
      .evaluateAll((els) =>
        els.map((el) => {
          const lines = new Set();
          const words = [];
          const text = el.firstChild;
          for (const match of text.textContent.matchAll(/\S+/gu)) {
            const range = globalThis.document.createRange();
            range.setStart(text, match.index);
            range.setEnd(text, match.index + match[0].length);
            const rects = [...range.getClientRects()];
            rects.forEach((r) => lines.add(Math.round(r.top)));
            words.push({
              text: match[0],
              lines: new Set(rects.map((r) => Math.round(r.top))).size,
            });
          }
          return {
            label: el.textContent,
            lines: lines.size,
            words,
            wrap: globalThis.getComputedStyle(el).overflowWrap,
            top: el.parentElement.getBoundingClientRect().top,
          };
        }),
      );
    assert.equal(
      new Set(labels.map((x) => x.top)).size,
      6,
      "390px retrieval keeps six separate readable rows",
    );
    for (const label of labels) {
      assert.notEqual(label.wrap, "anywhere");
      assert.ok(
        label.lines <= 2,
        `${locale} shortcut exceeds two lines: ${label.label}`,
      );
      assert.ok(
        label.words.every((word) => word.lines === 1),
        `${locale} shortcut splits a word: ${label.label}`,
      );
    }
    assert.equal(await page.locator("[data-demo-indication]").count(), 1);
    assert.equal(await page.locator("#main [data-demo-indication]").count(), 0);
    assert.ok(await page.locator("[data-clinician-monogram]").isVisible());
    await page.evaluate(() => globalThis.scrollTo(0, 0));
    report.presentation.push(await measurePresentation(page, locale));
    await capture(`patient-my-care-mobile-${locale}`);
    await capture(`patient-my-care-mobile-${locale}-full`, true);
    assert.equal(
      await page
        .locator("[data-my-care] nav")
        .filter({ has: page.locator('a[aria-current="page"]') })
        .count(),
      1,
      "one visible normal-flow primary navigation",
    );
    assert.equal(await page.locator("[data-bottom-navigation]").count(), 0);
    const order = await page.locator("#main section").evaluateAll((xs) =>
      xs.map((x) => ({
        heading: x.querySelector("h2")?.textContent,
        top: x.getBoundingClientRect().top,
      })),
    );
    assert.ok(
      order.every((x, i) => i === 0 || x.top >= order[i - 1].top),
      "mobile event/actions/shortcuts/recent order",
    );
    const positions = await page
      .locator("[data-my-care] a:visible,[data-my-care] button:visible")
      .evaluateAll((xs) =>
        xs
          .filter(
            (x) =>
              x.closest("header,nav") || x.closest("[data-appointment-anchor]"),
          )
          .map((x) => ({
            text: x.textContent,
            width: x.getBoundingClientRect().width,
            height: x.getBoundingClientRect().height,
          })),
      );
    for (const control of positions)
      assert.ok(
        control.width >= 44 && control.height >= 44,
        `small control ${JSON.stringify(control)}`,
      );
    await page.evaluate(() => {
      const entries = [
        ...globalThis.document.querySelectorAll("[data-my-care] *"),
      ].map((el) => [el, parseFloat(globalThis.getComputedStyle(el).fontSize)]);
      for (const [el, size] of entries) el.style.fontSize = `${size * 2}px`;
    });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), `${locale} ${width} text resize overflow`);
      report.textResize.push({ locale, width, scale: 2 });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(`patient-my-care-text-200-${locale}`, true);
    await page.reload();
    await page
      .locator('[data-appointment-anchor] a[href$="demo-my-care-visit"]')
      .waitFor();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator('a[href="#main"]').evaluate(el => el === globalThis.document.activeElement), true);
    await page.keyboard.press("Enter");
    assert.equal(await page.locator('#main').evaluate(el => el === globalThis.document.activeElement), true);
    await page.locator('header summary').click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator('header details[open]').count(), 0);
    await page.locator('header nav a[href="/patient/discover"]').click();
    await page.waitForURL("**/patient/discover");
    assert.equal(await page.locator('[data-patient-my-care-v2]').count(), 0);
    await page.goBack(); await page.locator('[data-patient-my-care-v2]').waitFor();
    await page.goForward(); await page.waitForURL("**/patient/discover");
    assert.equal(await page.locator('[data-patient-my-care-v2]').count(), 0);
    await page.goBack(); await page.locator('[data-patient-my-care-v2]').waitFor();
    await page.locator('header nav a').first().focus();
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({
      tag: globalThis.document.activeElement.tagName,
      outline: globalThis.getComputedStyle(globalThis.document.activeElement)
        .outlineStyle,
    }));
    assert.equal(focus.outline, "solid");
    report.focus.push({ locale, ...focus });
    await capture(`patient-my-care-focus-${locale}`);
    await openDemoUtility(page);
    assert.ok(
      await page.getByLabel(c.demoWorkspace, { exact: true }).isVisible(),
    );
    await page.getByLabel(c.screenState, { exact: true }).focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("[data-demo-utility][open]").count(), 0);
    assert.equal(
      await page
        .locator("[data-demo-utility] summary")
        .evaluate((el) => el === globalThis.document.activeElement),
      true,
    );
    for (const [state, key] of [
      ["loading", "loading"],
      ["empty", "empty"],
      ["error", "error"],
      ["uncertain", "unverified"],
    ]) {
      await openDemoUtility(page);
      await page.getByLabel(c.screenState, { exact: true }).selectOption(state);
      await toggleDemoControls(page);
      if (state === "loading")
        await page
          .getByRole("status", { name: c.loading, exact: true })
          .first()
          .waitFor();
      else
        await page
          .getByRole("heading", { name: c[key], exact: true })
          .waitFor();
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await capture(`patient-my-care-${state}-${locale}`, true);
    }
    assert.deepEqual(requests, [], "Demo must issue no Live API calls");
    await page.close();
  }
  // Live responses exercise the real client/adapter without any synthetic fallback or commands.
  for (const locale of ["en", "ar"]) {
    const c = myCareCopy[locale],
      calls = [];
    let profileFails = false,
      sourceFails = false,
      bookingsFail = false,
      sessionFails = false, sourceStatus = 0, accountB = false;
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.addInitScript((locale) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", locale);
    }, locale);
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname,
        method = route.request().method();
      calls.push({ path, method });
      if (
        sessionFails &&
        !path.includes("/directory/") &&
        !path.endsWith("/auth/me")
      )
        return route.fulfill({ status: 401, json: {} });
      if (path.endsWith("/auth/me"))
        return route.fulfill({
          json: {
            data: {
              user: {
                role: "PATIENT",
                email: accountB ? "synthetic-b@example.invalid" : "synthetic-live@example.invalid",
              },
              csrfToken: "synthetic-csrf",
            },
          },
        });
      if (path.endsWith("/me/profile"))
        return profileFails
          ? route.fulfill({ status: 503, json: {} })
          : route.fulfill({
              json: {
                data: {
                  id: id(accountB ? 9 : 8),
                  displayName: accountB ? "New permitted account" : "Live source · أحمد",
                  dateOfBirth: null,
                  sex: null,
                },
              },
            });
      if (path.endsWith("/me/bookings"))
        return bookingsFail
          ? route.fulfill({ status: 503, json: {} })
          : route.fulfill({
              json: {
                data: accountB ? [] : [booking],
                meta: { page: 1, pageSize: 20, total: accountB ? 0 : 1 },
              },
            });
      if (path.endsWith("/directory/providers"))
        return route.fulfill({
          json: {
            data: [
              {
                id: id(3),
                displayName: "Live doctor · مريم",
                specialty: {
                  key: "internal",
                  displayName: "Internal medicine",
                },
                clinics: [],
              },
            ],
          },
        });
      if (path.endsWith("/directory/clinics"))
        return route.fulfill({
          json: {
            data: [
              {
                id: id(4),
                displayName: "Live clinic · القاهرة",
                city: "Cairo",
                address: "Synthetic address",
              },
            ],
          },
        });
      if (path.includes("/me/summaries")) {
        if (sourceFails || sourceStatus) return route.fulfill({ status: sourceStatus || 404, json: { private: "PRIVATE-CANARY", id: "WRONG-PATIENT-ID", count: 99 } });
        return route.fulfill({ json: path.endsWith("/me/summaries") ? { data: [releasedSummary], meta: { total: 1 } } : { data: releasedSummary } });
      }
      return route.fulfill({
        json: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
      });
    });
    await page.goto(origin + "/patient");
    await page
      .locator('[data-appointment-anchor] a[href$="' + id(1) + '"]')
      .waitFor();
    await page
      .getByText("Live doctor · مريم", { exact: true })
      .first()
      .waitFor();
    if (shots) {
      const name = `patient-my-care-live-desktop-${locale}.png`;
      await page.screenshot({ path: resolve(shots, name) });
      report.screens.push(name);
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.getByText(c.live, { exact: true }).isVisible());
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth,
        ),
      );
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    assert.equal(await page.locator("[data-demo-utility]").count(), 0);
    assert.equal(await page.locator("[data-demo-indication]").count(), 0);
    assert.equal(await page.getByText(c.demo, { exact: true }).count(), 0);
    assert.equal(await page.getByLabel(c.demoWorkspace).count(), 0);
    assert.equal(await page.getByLabel(c.screenState).count(), 0);
    assert.equal(
      await page.locator('a[href="/patient/medications"]').count(),
      0,
    );
    assert.equal(await page.locator("[data-source-verification]").count(), 0);
    await page.locator('[data-care-shortcuts]').getByText(c.readSummary, { exact: true }).waitFor();
    for (sourceStatus of [401, 403, 404, 503]) {
      await page.reload(); await page.locator('[data-source-verification]').waitFor();
      assert.equal(await page.locator('[data-care-shortcuts]').getByText(c.readSummary, { exact: true }).count(), 0, "revoked reread removes released-source claim");
      const dom = await page.content(), ax = await page.locator('body').ariaSnapshot();
      for (const canary of ["PRIVATE-CANARY", "WRONG-PATIENT-ID", "PERMITTED-SYNTHETIC-SUMMARY", id(30), id(32)]) { assert.ok(!dom.includes(canary)); assert.ok(!ax.includes(canary)); }
      await page.locator('[data-appointment-anchor] a[href$="' + id(1) + '"]').waitFor();
    }
    sourceStatus = 0;
    profileFails = true;
    sourceFails = true;
    await page.reload();
    await page.locator("[data-profile-error]").waitFor();
    await page.locator("[data-source-verification]").waitFor();
    await page
      .locator('[data-appointment-anchor] a[href$="' + id(1) + '"]')
      .waitFor();
    assert.ok(
      !(await page.locator("[data-my-care]").innerText()).includes(
        "PRIVATE-CANARY",
      ),
    );
    accountB = true; profileFails = false;
    await page.reload(); await page.getByRole("heading", { name: c.empty, exact: true }).waitFor();
    await page.getByRole("heading", { name: c.greeting + " New", exact: true }).waitFor();
    const accountDOM = await page.content(), accountAX = await page.locator('body').ariaSnapshot();
    for (const canary of ["Live source · أحمد", "Live doctor · مريم", '/patient/appointments/' + id(1)]) { assert.ok(!accountDOM.includes(canary)); assert.ok(!accountAX.includes(canary)); }
    bookingsFail = true;
    await page.reload();
    await page.getByRole("heading", { name: c.error, exact: true }).waitFor();
    if (shots) {
      const name = `patient-my-care-live-error-${locale}.png`;
      await page.screenshot({ path: resolve(shots, name) });
      report.screens.push(name);
    }
    sessionFails = true;
    const beforeExpiry = calls.length;
    await page.reload();
    await page
      .getByRole("button", { name: c.refreshSession, exact: true })
      .waitFor();
    assert.ok(
      calls.length - beforeExpiry < 15,
      "access loss must not remount/retry unrelated readers indefinitely",
    );
    assert.equal(
      await page.evaluate(() =>
        globalThis.localStorage.getItem("eh360-ui-demo-v1"),
      ),
      null,
    );
    assert.ok(
      calls.every((r) => r.method === "GET"),
      "My Care has no clinical mutations",
    );
    assert.ok(
      calls.every((r) =>
        [
          "/api/v1/auth/me",
          "/api/v1/me/profile",
          "/api/v1/me/bookings",
          "/api/v1/directory/providers",
          "/api/v1/directory/clinics",
          "/api/v1/me/summaries",
          "/api/v1/me/follow-up-intents",
          "/api/v1/me/summaries/" + id(30),
        ].includes(r.path),
      ),
      JSON.stringify(calls),
    );
    report.live.push({
      locale,
      profileFailureKeepsAppointments: true,
      sourceVerification: true,
      deniedStatuses: [401, 403, 404, 503], deniedFreshReread: true, accountReloadBoundary: true, domAndAXCanariesAbsent: true,
      liveFailureStaysLive: true,
      expiredSessionRecovery: true,
      visibleModeAt320: true,
      methods: [...new Set(calls.map((r) => r.method))],
      paths: [...new Set(calls.map((r) => r.path))],
    });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  if (shots)
    await writeFile(
      resolve(shots, "patient-my-care-browser.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  console.log(
    "PASS: My Care reference composition, EN/AR 1600/390, 320 reflow, 200% text, focus, states and read-only Live/Demo isolation.",
  );
  return report;
}
