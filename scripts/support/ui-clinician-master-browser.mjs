/** Synthetic HTTP presentation proof through the current Live adapters, never real persistence proof. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

export const masterId = (n) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const existing = myCareDemoState();
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(dictionary);
export const masterTranslate = (locale, value) =>
  locale === "ar" ? (dictionary.ar[value] ?? value) : value;
export const masterFixture = {
  patient: existing.profile.displayName,
  provider: existing.appointments[0].provider.displayName,
  clinic: existing.appointments[0].provider.clinics[0].displayName,
  // Same logistical timestamps and IDs used by the existing controlled close browser fixture.
  startAt: "2026-10-31T10:00:00Z",
  openedAt: "2026-10-31T10:00:00Z",
  timeZone: "Africa/Cairo",
};
export async function clinicianMasterPage(
  browser,
  origin,
  locale,
  kind = "draft",
) {
  const state = { kind, writes: [], calls: [], errors: [], release: () => {} };
  let authEntered;
  state.authReady = new Promise((done) => {
    authEntered = done;
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (e) => state.errors.push(e.message));
  await page.addInitScript((locale) => {
    globalThis.localStorage.setItem("eh360-ui-mode", "live");
    globalThis.localStorage.setItem("eh360-locale", locale);
  }, locale);
  const doc = (privateSource) => {
    const signed = ["signed", "closed"].includes(state.kind);
    const result = {
      id: masterId(privateSource ? 20 : 21),
      consultationId: masterId(1),
      kind: privateSource ? "PRIVATE_NOTE" : "PATIENT_SUMMARY",
      versions: [
        {
          id: masterId(privateSource ? 30 : 31),
          version: 1,
          kind: signed ? (privateSource ? "SIGN" : "RELEASE") : "DRAFT",
          state: signed
            ? privateSource
              ? "SIGNED"
              : "SIGNED_RELEASED"
            : "DRAFT",
          content: privateSource
            ? "SYNTHETIC_PRIVATE_LIVE_CANARY"
            : "Synthetic summary NOT_REVIEWED",
          patientInstructions: "",
          complaint: privateSource
            ? "Private complaint only"
            : "Shared human complaint",
          problems: [],
          diagnoses: [],
          allergyReview: { state: "NOT_REVIEWED", items: [] },
          createdAt: "2026-10-31T10:05:00Z",
          signedAt: signed ? "2026-10-31T10:10:00Z" : null,
          releasedAt: signed && !privateSource ? "2026-10-31T10:10:00Z" : null,
          predecessorId: null,
          reason: null,
          effective: true,
        },
      ],
      history: { page: 1, pageSize: 20, total: 1 },
    };
    if (signed) {
      const saved = result.versions[0];
      result.versions = [
        {
          ...saved,
          kind: "DRAFT",
          state: "DRAFT",
          signedAt: null,
          releasedAt: null,
          effective: false,
        },
        {
          ...saved,
          id: masterId(privateSource ? 32 : 33),
          version: 2,
          predecessorId: saved.id,
          createdAt: "2026-10-31T10:10:00Z",
        },
      ];
      result.history.total = 2;
    }
    return result;
  };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    state.calls.push({ path, method: req.method() });
    if (req.method() !== "GET") {
      state.writes.push({ path, body: req.postDataJSON() });
      return route.fulfill({
        status: 503,
        json: { error: { message: "PRIVATE_SQL_CANARY" } },
      });
    }
    const send = (data, meta) =>
      route.fulfill({ json: { data, ...(meta ? { meta } : {}) } });
    if (path.endsWith("/auth/me")) {
      if (state.kind === "boot")
        await new Promise((done) => {
          state.release = done;
          authEntered();
        });
      return send({
        user: { role: "CLINICIAN", email: "synthetic@example.invalid" },
        csrfToken: "synthetic-master-csrf",
      });
    }
    if (path.endsWith("/consultation"))
      return send({
        id: masterId(1),
        encounterId: masterId(2),
        bookingId: masterId(3),
        providerId: masterId(4),
        clinicId: masterId(5),
        openedAt: masterFixture.openedAt,
        closedAt: state.kind === "closed" ? "2026-10-31T10:30:00Z" : null,
        state: state.kind === "closed" ? "CLOSED" : "OPEN",
        bookingState: state.kind === "closed" ? "CONSULTED" : "IN_CONSULTATION",
        version: state.kind === "closed" ? 2 : 1,
      });
    if (path.endsWith(`/me/bookings/${masterId(3)}`))
      return send({
        id: masterId(3),
        slotId: masterId(6),
        providerId: masterId(4),
        clinicId: masterId(5),
        patientDisplayName: masterFixture.patient,
        startAt: masterFixture.startAt,
        endAt: "2026-10-31T10:30:00Z",
        timeZone: masterFixture.timeZone,
        state: state.kind === "closed" ? "CONSULTED" : "IN_CONSULTATION",
        version: state.kind === "closed" ? 3 : 2,
        createdAt: "2026-10-30T10:00:00Z",
        predecessorId: null,
        successorId: null,
        attendance: "ATTENDED",
        transitions: [],
        attendanceHistory: [],
      });
    if (path.endsWith("/directory/providers"))
      return send(
        [
          {
            id: masterId(4),
            displayName: masterFixture.provider,
            specialty: {
              key: "internal-medicine",
              displayName: "Internal medicine",
            },
            clinics: [],
          },
        ],
        { page: 1, pageSize: 100, total: 1 },
      );
    if (path.endsWith("/directory/clinics"))
      return send(
        [
          {
            id: masterId(5),
            displayName: masterFixture.clinic,
            city: "Cairo",
            address: "Synthetic address",
          },
        ],
        { page: 1, pageSize: 100, total: 1 },
      );
    if (path.includes("/documents")) {
      if (state.kind === "loading")
        await new Promise((resolve) => {
          state.release = resolve;
        });
      if (state.kind === "error")
        return route.fulfill({ status: 503, json: {} });
      if (state.kind === "redacted")
        return route.fulfill({
          status: 404,
          json: { private: "PRIVATE_SQL_CANARY" },
        });
      if (path.endsWith("/documents")) {
        const data = state.kind === "empty" ? [] : [doc(true), doc(false)];
        return send(data, { page: 1, pageSize: 20, total: data.length });
      }
      return send(doc(path.endsWith(masterId(20))));
    }
    if (state.kind === "follow-up" && path.endsWith("/follow-up-intents")) {
      const versions = [false, true].map((released, i) => ({
        id: masterId(51 + i),
        version: i + 1,
        state: released ? "SIGNED_RELEASED" : "DRAFT",
        instruction: "Synthetic released follow-up · تعليمات بشرية",
        desiredWindow: {
          startAt: "2026-11-15T07:00:00.000Z",
          endAt: "2026-11-22T07:00:00.000Z",
          timeZone: "Africa/Cairo",
        },
        createdAt: "2026-11-01T10:00:00.000Z",
        signedAt: released ? "2026-11-01T10:00:00.000Z" : null,
        releasedAt: released ? "2026-11-01T10:00:00.000Z" : null,
        predecessorId: released ? masterId(51) : null,
        reason: null,
        effective: released,
      }));
      return send(
        [
          {
            id: masterId(50),
            consultationId: masterId(1),
            versions,
            links: [],
            history: { page: 1, pageSize: 20, total: 2 },
            linkHistory: { page: 1, pageSize: 20, total: 0 },
          },
        ],
        { page: 1, pageSize: 20, total: 1 },
      );
    }
    return send([], { page: 1, pageSize: 20, total: 0 });
  });
  await page.goto(`${origin}/doctor/consultation/${masterId(3)}/documentation`);
  return { page, state };
}

export async function assertClinicianMaster(page) {
  await page.locator("[data-clinician-master]").waitFor();
  await page.locator(".documentation-content textarea").first().waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const root = globalThis.document.querySelector("[data-clinician-master]"),
      main = root.querySelector("main"),
      grid = root.querySelector(".documentation-grid");
    const style = globalThis.getComputedStyle(main),
      r = main.getBoundingClientRect();
    return {
      viewport: globalThis.innerWidth,
      scroll: globalThis.document.documentElement.scrollWidth,
      usefulWidth:
        r.width -
        parseFloat(style.paddingInlineStart) -
        parseFloat(style.paddingInlineEnd),
      columns: globalThis.getComputedStyle(grid).gridTemplateColumns,
      font: globalThis.getComputedStyle(root).fontFamily,
      brand: root.querySelector("header a").textContent,
      headerStart: (() => {
        const inner = root.querySelector("header").firstElementChild;
        return (
          inner.getBoundingClientRect().x +
          parseFloat(globalThis.getComputedStyle(inner).paddingLeft)
        );
      })(),
      workspaceStart: root
        .querySelector(".master-context-ribbon")
        .getBoundingClientRect().x,
      contextHeight: root
        .querySelector(".master-context-ribbon")
        .getBoundingClientRect().height,
      headerHeight: root.querySelector("header").getBoundingClientRect().height,
      colors: Object.fromEntries(
        ["navy", "teal", "muted", "canvas", "ink"].map((name) => [
          name,
          globalThis
            .getComputedStyle(root)
            .getPropertyValue(`--care-${name}`)
            .trim(),
        ]),
      ),
      nav: [...root.querySelectorAll("[data-clinician-local-tasks] a")].map(
        (x) => x.getAttribute("href"),
      ),
    };
  });
  assert.equal(metrics.usefulWidth, 1360);
  assert.equal(metrics.brand, "EgyHealth 360");
  assert.equal(metrics.headerStart, metrics.workspaceStart);
  assert.equal(metrics.headerHeight, 73);
  assert.ok(
    Math.round(metrics.contextHeight) >= 88 &&
      Math.round(metrics.contextHeight) <= 104,
    `Approximate context ribbon bounds: ${metrics.contextHeight}px including border`,
  );
  assert.equal(metrics.columns.split(" ").length, 3);
  assert.deepEqual(metrics.nav, [
    "#live-documentation",
    "#live-follow-up",
    "#review-close",
  ]);
  assert.ok(metrics.scroll <= metrics.viewport);
  assert.equal(await page.locator("[data-clinician-source-rail]").count(), 1);
  assert.equal(await page.locator("[data-clinician-master] img").count(), 0);
  return metrics;
}

export async function testClinicianMaster(browser, origin) {
  for (const locale of ["en", "ar"]) {
    const boot = await clinicianMasterPage(browser, origin, locale, "boot");
    await boot.state.authReady;
    await boot.page.locator("[data-clinician-master-boot]").waitFor();
    assert.equal(
      await boot.page
        .locator("[data-clinician-master-boot] header svg")
        .count(),
      0,
    );
    assert.equal(
      await boot.page.locator(".documentation-content textarea").count(),
      0,
    );
    boot.state.release();
    await boot.page.close();
    const t = (value) =>
      locale === "ar" ? (dictionary.ar[value] ?? value) : value;
    const { page, state } = await clinicianMasterPage(browser, origin, locale);
    await assertClinicianMaster(page);
    for (const width of [1600, 1280, 1024, 834, 768, 560, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth,
        ),
        `${locale} master overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page
      .locator('.documentation-outline a[href="#master-doc-allergy"]')
      .click();
    await page.waitForFunction(
      () =>
        globalThis.document
          .querySelector("#master-doc-allergy")
          .getBoundingClientRect().top >=
        globalThis.document
          .querySelector(".consultation-ribbon")
          .getBoundingClientRect().bottom -
          1,
    );
    await page.locator('.documentation-outline a[href="#doc-private"]').click();
    await page.waitForFunction(() => {
      const field = globalThis.document
        .querySelector("#doc-private")
        .getBoundingClientRect();
      return (
        field.top >=
        globalThis.document
          .querySelector(".consultation-ribbon")
          .getBoundingClientRect().bottom -
          1
      );
    });
    const input = page.getByLabel(t("Private note content"), { exact: true });
    await input.fill("SYNTHETIC_PRIVATE_LIVE_CANARY unchanged retry");
    await page
      .getByRole("button", { name: t("Save private note draft"), exact: true })
      .click();
    const retry = page.getByRole("button", {
      name: t("Retry unchanged private note"),
      exact: true,
    });
    await retry.waitFor();
    assert.equal(state.writes.length, 1, "No automatic mutation retry");
    assert.equal(await input.isDisabled(), true);
    assert.equal(
      await page
        .getByLabel(t("Patient summary content"), { exact: true })
        .inputValue(),
      "Synthetic summary NOT_REVIEWED",
    );
    const response = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/documents"),
    );
    await retry.click();
    await response;
    await page.waitForFunction(
      (label) =>
        [...globalThis.document.querySelectorAll("button")].some(
          (el) => el.textContent.trim() === label && !el.disabled,
        ),
      t("Retry unchanged private note"),
    );
    assert.equal(state.writes.length, 2);
    assert.deepEqual(
      state.writes[0],
      state.writes[1],
      "Explicit retry retains the unchanged body/key",
    );
    assert.equal(state.writes[0].body.kind, "PRIVATE_NOTE");
    state.kind = "redacted";
    await page
      .getByRole("button", {
        name: t("Recheck visible documentation"),
        exact: true,
      })
      .click();
    await page
      .locator("[data-clinician-source-rail]")
      .waitFor({ state: "detached" });
    await page.getByRole("alert").first().waitFor();
    assert.equal(
      await page.locator("[data-clinician-source-rail]").count(),
      0,
      "Denied source state is erased with the editor",
    );
    assert.equal(
      await page.locator(".documentation-content textarea").count(),
      0,
    );
    assert.ok(
      !(await page.locator("body").innerText()).includes("PRIVATE_SQL_CANARY"),
    );
    assert.deepEqual(state.errors, []);
    await page.close();
  }
  console.log(
    "PASS: Clinician master exact route, inherited family, three planes, EN/AR reflow to 320px, anchor/focus clearance, private/summary separation, explicit unchanged retry and source-rail redaction.",
  );
}
