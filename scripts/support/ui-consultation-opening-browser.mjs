/** Controlled merged-contract UI tests. Real persistence proof is separate. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export async function testConsultationOpening(browser, origin, shots) {
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    const t = (key) => (locale === "ar" ? (dictionary.ar[key] ?? key) : key);
    const button = (key) =>
      page.getByRole("button", { name: t(key), exact: true });
    const errors = [],
      calls = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const booking = {
      id: id(1),
      slotId: id(2),
      providerId: id(3),
      clinicId: id(4),
      patientDisplayName: "Synthetic patient · مريض للعرض",
      startAt: "2026-01-01T10:00:00Z",
      endAt: "2026-01-01T10:30:00Z",
      timeZone: "Africa/Cairo",
      state: "BOOKED",
      version: 1,
      createdAt: "2025-12-01T10:00:00Z",
      predecessorId: null,
      successorId: null,
      attendance: "UNKNOWN",
      transitions: [],
      attendanceHistory: [],
    };
    let current = { ...booking },
      status = 0,
      attempts = 0,
      release,
      entered;
    let wait = false;
    await page.addInitScript((l) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", l);
    }, locale);
    await page.route("**/api/v1/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      calls.push({
        path,
        method: req.method(),
        body: req.postData(),
        headers: req.headers(),
      });
      if (path.endsWith("/auth/me"))
        return route.fulfill({
          json: {
            data: {
              user: { role: "CLINICIAN", email: "synthetic@example.invalid" },
              csrfToken: "opening-browser-csrf",
            },
          },
        });
      if (path.endsWith("/consultation") && req.method() === "GET") return route.fulfill({ json: { data: {
        id:id(8),encounterId:id(9),bookingId:booking.id,providerId:booking.providerId,clinicId:booking.clinicId,
        openedAt:"2026-10-29T10:00:00Z",state:"OPEN",bookingState:"IN_CONSULTATION",version:1,closedAt:null,
      } } });
      if (path.endsWith("/consultation")) {
        attempts++;
        if (wait) {
          wait = false;
          await new Promise((r) => {
            release = r;
            entered?.();
          });
        }
        if (status)
          return route.fulfill({
            status,
            json: {
              error: { message: "PRIVATE SQL INTERNAL-IDENTITY diagnosis" },
            },
          });
        current = {
          ...current,
          state: "IN_CONSULTATION",
          version: 2,
          attendance: "ATTENDED",
          transitions: [
            {
              id: id(10),
              command: "OPEN",
              fromState: "BOOKED",
              toState: "IN_CONSULTATION",
              recordedAt: "2026-01-01T10:05:00Z",
            },
          ],
        };
        return route.fulfill({
          json: {
            data: {
              id: id(8),
              encounterId: id(9),
              bookingState: "IN_CONSULTATION",
              bookingId: id(1),
              providerId: id(3),
              clinicId: id(4),
              openedAt: "2026-01-01T10:05:00Z",
              state: "OPEN",
              patientId: "INTERNAL-IDENTITY",
              assignmentId: "INTERNAL-IDENTITY",
              notes: "PRIVATE CLINICAL",
              documentCount: 3,
            },
          },
        });
      }
      if (path === "/api/v1/me/schedule")
        return route.fulfill({
          json: { data: [current], meta: { page: 1, pageSize: 20, total: 1 } },
        });
      if (path.endsWith("/me/bookings/" + id(1)))
        return route.fulfill({ json: { data: current } });
      if (path.endsWith("/directory/providers"))
        return route.fulfill({ json: { data: [] } });
      if (path.endsWith("/directory/clinics"))
        return route.fulfill({
          json: {
            data: [
              {
                id: id(4),
                displayName: "Synthetic clinic · عيادة العرض ذات الاسم الطويل",
                city: "Cairo",
                address: "Synthetic",
              },
            ],
          },
        });
      throw new Error("Unexpected UI request: " + path);
    });
    const bodySafe = async () =>
      assert.ok(
        !/INTERNAL-IDENTITY|PRIVATE SQL|PRIVATE CLINICAL|documentCount/.test(
          await page.locator("body").innerText(),
        ),
      );
    const responsive = async (label) => {
      for (const width of [1440, 834, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth + 1,
          ),
          `${locale} ${label}: ${width}px overflow`,
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
    const snap = async (name) => {
      if (!shots) return;
      await mkdir(shots, { recursive: true });
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: resolve(shots, name + ".png"),
        fullPage: !name.includes("mobile"),
      });
    };
    await page.goto(origin + "/doctor");
    await page
      .getByRole("link", { name: t("View booking"), exact: true })
      .waitFor();
    await responsive("dashboard and schedule");
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (locale === "en") await snap("39-en-opening-schedule");
    await page
      .getByRole("link", { name: t("View booking"), exact: true })
      .click();
    await button("Start consultation").waitFor();
    await responsive("booking detail / eligibility");
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (locale === "en") await snap("40-en-opening-booking-detail");
    assert.equal(await button("Start consultation").isEnabled(), true);
    // No clinical read or relationship mutation is mocked by these UI tests.
    current = { ...booking, state: "IN_CONSULTATION", attendance: "ATTENDED" };
    await page.reload();
    await page
      .getByRole("link", { name: t("View opening details"), exact: true })
      .waitFor();
    assert.equal(await button("Start consultation").count(), 0);
    assert.equal(await button("Record attendance").isDisabled(), true);
    assert.equal(attempts, 0, "already opened state does not auto-replay");
    await responsive("already opened");
    for (const [state, startAt] of [
      ["BOOKED", "2031-01-01T10:00:00Z"],
      ["CANCELLED", booking.startAt],
      ["RESCHEDULED", booking.startAt],
      ["NO_SHOW", booking.startAt],
    ]) {
      current = {
        ...booking,
        state,
        startAt,
        endAt: state === "BOOKED" ? "2031-01-01T10:30:00Z" : booking.endAt,
      };
      await page.reload();
      await button("Start consultation").waitFor();
      assert.equal(await button("Start consultation").isDisabled(), true);
      await responsive(state === "BOOKED" ? "too early" : state);
    }
    current = { ...booking };
    await page.reload();
    await button("Start consultation").click();
    await page.getByRole("dialog").waitFor();
    await responsive("start consultation dialog");
    await page.setViewportSize({ width: 1440, height: 1000 });
    if (locale === "en") await snap("41-en-start-consultation");
    // Keyboard dismissal restores focus to the initiating control.
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      await button("Start consultation").evaluate(
        (el) => el === globalThis.document.activeElement,
      ),
      true,
    );
    await button("Start consultation").click();
    for (const code of [404, 409, 401, 503]) {
      status = code;
      await button(
        attempts ? "Retry unchanged opening" : "Confirm opening",
      ).click();
      await page.locator(".form-error[role=alert]").waitFor();
      await bodySafe();
      await responsive(`safe error ${code}`);
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem("eh360-ui-mode"),
        ),
        "live",
      );
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem("eh360-ui-demo-v1"),
        ),
        null,
      );
      if (code === 404 && locale === "en") {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await snap("42-en-opening-relationship-required");
      }
    }
    // Route navigation must retain an uncertain command's key without storage.
    await button("Go back").click();
    await page
      .getByRole("link", { name: t("Back to schedule"), exact: true })
      .click();
    await page
      .getByRole("link", { name: t("View booking"), exact: true })
      .click();
    await button("Start consultation").click();
    status = 0;
    wait = true;
    const requestEntered = new Promise((r) => {
      entered = r;
    });
    await button("Confirm opening").click();
    await requestEntered;
    await page
      .getByText(
        t(
          "Opening the consultation… Keep this visit open while the server confirms the outcome.",
        ),
        { exact: true },
      )
      .waitFor();
    assert.equal(await button("Opening…").isDisabled(), true);
    await responsive("opening pending");
    release();
    await page
      .getByText(t("Consultation opened"), { exact: true })
      .first()
      .waitFor();
    const posts = calls.filter((c) => c.path.endsWith("/consultation") && c.method === "POST");
    assert.equal(posts.length, 5);
    assert.equal(new Set(posts.slice(0, 3).map((c) => c.body)).size, 1);
    assert.equal(new Set(posts.slice(3).map((c) => c.body)).size, 1);
    assert.notEqual(
      posts[2].body,
      posts[3].body,
      "session expiry discards old command identity",
    );
    assert.deepEqual(Object.keys(JSON.parse(posts[0].body)), ["operationKey"]);
    assert.equal(posts[0].headers["x-csrf-token"], "opening-browser-csrf");
    assert.equal(posts[0].headers["idempotency-key"], undefined);
    assert.equal(await button("Record attendance").isDisabled(), true);
    assert.equal(await button("Correct attendance").isDisabled(), true);
    assert.ok(
      calls.some(
        (c) => c.path.endsWith("/me/bookings/" + id(1)) && c.method === "GET",
      ),
    );
    await page
      .getByRole("link", { name: t("View opening details"), exact: true })
      .click();
    await page.getByText(t("Opening confirmed"), { exact: true }).waitFor();
    await responsive("metadata shell / opening success");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await snap(
      locale === "en"
        ? "43-en-consultation-opened"
        : "44-ar-consultation-opened",
    );
    if (locale === "ar") {
      await page.setViewportSize({ width: 390, height: 1000 });
      await snap("45-ar-mobile-consultation-opened");
    }
    await bodySafe();
    assert.equal(
      await page.getByRole("textbox").count(),
      0,
      "no clinical authoring",
    );
    assert.ok(
      !calls.some((c) =>
        /\/patients\/|assignment|relationship|prescription|laboratory|\/documents/.test(
          c.path,
        ),
      ),
      "no clinical read or relationship writes",
    );
    await page.reload();
    await page.getByText(t("Opening confirmed"), { exact: true }).waitFor();
    assert.equal(attempts, 5, "no automatic replay on reload");
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS Consultation Opening controlled EN/AR/RTL 1440/834/390: eligible/early/terminal/opened states, scoped access errors, pending/retry, metadata shell, focus restoration and privacy. Real persistence proof is separate.",
  );
}
