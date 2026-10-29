/** HTTP-controlled UI regression; actual persistence is separately proven by ui-booking-real. */
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
export async function testLiveBooking(browser, origin, shots) {
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(30000);
    const t = (text) =>
      locale === "ar" ? (dictionary.ar[text] ?? text) : text;
    const button = (text) =>
      page.getByRole("button", { name: t(text), exact: true });
    const link = (text) =>
      page.getByRole("link", { name: t(text), exact: true });
    const errors = [],
      calls = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const provider = {
      id: id(2),
      displayName: "Public Doctor · اسم طبيب طويل لا يُترجم",
      specialty: { key: "general", displayName: "Source specialty" },
      clinics: [
        {
          id: id(3),
          displayName: "Public Clinic · اسم عيادة طويل لا يُترجم",
          city: "Source city",
          address: "Source address",
        },
      ],
    };
    const slot = {
      id: id(1),
      providerId: id(2),
      clinicId: id(3),
      startAt: "2031-01-01T10:00:00Z",
      endAt: "2031-01-01T10:30:00Z",
      timeZone: "Africa/Cairo",
      bookable: true,
    };
    const target = {
      ...slot,
      id: id(6),
      startAt: "2031-01-01T11:00:00Z",
      endAt: "2031-01-01T11:30:00Z",
    };
    const base = {
      id: id(11),
      slotId: slot.id,
      providerId: provider.id,
      clinicId: id(3),
      patientDisplayName: "Synthetic Ahmed · أحمد",
      startAt: slot.startAt,
      endAt: slot.endAt,
      timeZone: slot.timeZone,
      state: "BOOKED",
      version: 1,
      createdAt: "2026-01-01T10:00:00Z",
      predecessorId: null,
      successorId: null,
      attendance: "UNKNOWN",
      transitions: [
        {
          id: id(30),
          command: "CREATE",
          fromState: null,
          toState: "BOOKED",
          recordedAt: "2026-01-01T10:00:00Z",
        },
      ],
      attendanceHistory: [],
    };
    let historyStarted;
    let role = "PATIENT",
      createAttempts = 0,
      cancelAttempts = 0,
      rescheduleAttempts = 0,
      readError = 0,
      empty = false,
      loadingResolve;
    let current = { ...base },
      previous = null,
      created = false,
      loadHistory = false;
    const snap = async (name) => {
      if (shots) {
        await mkdir(shots, { recursive: true });
        await page.screenshot({
          path: resolve(shots, name + ".png"),
          fullPage: !name.includes("mobile"),
        });
      }
    };
    const responsive = async (name) => {
      for (const width of [1440, 834, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth + 1,
          ),
          `${locale} ${name} overflow at ${width}`,
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
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname;
      calls.push({
        path,
        method: request.method(),
        body: request.postData(),
        headers: request.headers(),
      });
      if (path.endsWith("/auth/me"))
        return route.fulfill({
          json: {
            data: {
              user: { email: "synthetic-live@example.invalid", role },
              csrfToken: "booking-browser-csrf",
            },
          },
        });
      if (path === "/api/v1/me/bookings" && request.method() === "POST") {
        if (++createAttempts === 1)
          return route.fulfill({
            status: 503,
            json: {
              error: { message: "PRIVATE SQL STACK INTERNAL-SOURCE-ID" },
            },
          });
        created = true;
        return route.fulfill({
          json: {
            data: {
              ...current,
              patientId: "INTERNAL-SOURCE-ID",
              diagnosis: "PRIVATE CLINICAL",
            },
          },
        });
      }
      if (path === "/api/v1/me/bookings" || path === "/api/v1/me/schedule") {
        if (loadHistory) {
          loadHistory = false;
          await new Promise((r) => {
            loadingResolve = r;
            historyStarted?.();
          });
        }
        if (readError)
          return route.fulfill({
            status: readError,
            json: { error: { message: "PRIVATE SQL STACK" } },
          });
        const all =
          empty || !created
            ? []
            : role === "CLINICIAN"
              ? [current]
              : [
                  current,
                  ...(previous ? [previous] : []),
                  ...Array.from({ length: 20 }, (_, i) => ({
                    ...base,
                    id: id(100 + i),
                    state: "CANCELLED",
                  })),
                ];
        const n = Number(url.searchParams.get("page") ?? 1);
        return route.fulfill({
          json: {
            data: all.slice((n - 1) * 20, n * 20),
            meta: { page: n, pageSize: 20, total: all.length },
          },
        });
      }
      if (path.endsWith("/cancel")) {
        if (++cancelAttempts === 1)
          return route.fulfill({
            status: 409,
            json: { error: { message: "PRIVATE VERSION CONFLICT" } },
          });
        current = {
          ...current,
          state: "CANCELLED",
          version: current.version + 1,
        };
        return route.fulfill({ json: { data: current } });
      }
      if (path.endsWith("/reschedule")) {
        if (++rescheduleAttempts === 1)
          return route.fulfill({
            status: 409,
            json: { error: { message: "PRIVATE SLOT CONFLICT" } },
          });
        previous = { ...current, state: "RESCHEDULED", successorId: id(22) };
        current = {
          ...base,
          id: id(22),
          slotId: target.id,
          startAt: target.startAt,
          endAt: target.endAt,
          predecessorId: previous.id,
        };
        return route.fulfill({ json: { data: current } });
      }
      if (
        path.endsWith("/attendance") ||
        path.endsWith("/attendance/correct")
      ) {
        const body = request.postDataJSON(),
          correction = path.endsWith("/correct"),
          prior = current.attendanceHistory.at(-1);
        current = {
          ...current,
          version: current.version + 1,
          attendance: body.observation,
          state:
            current.state === "NO_SHOW" || body.observation === "NO_SHOW"
              ? "NO_SHOW"
              : "BOOKED",
          attendanceHistory: [
            ...current.attendanceHistory,
            {
              id: id(40 + current.version),
              observation: body.observation,
              supersedesId: correction ? prior.id : null,
              reason: body.reason ?? null,
              recordedAt: "2026-01-01T10:00:00Z",
            },
          ],
        };
        return route.fulfill({ json: { data: current } });
      }
      if (path.startsWith("/api/v1/me/bookings/"))
        return route.fulfill({
          json: {
            data: previous && path.endsWith(previous.id) ? previous : current,
          },
        });
      if (path.endsWith("/availability"))
        return route.fulfill({
          json: {
            data: created
              ? [
                  target,
                  { ...target, id: id(7), providerId: id(99) },
                  { ...target, id: id(8), clinicId: id(99) },
                ]
              : [slot],
            meta: { page: 1, pageSize: 20, total: created ? 3 : 1 },
          },
        });
      if (path.endsWith("/directory/providers/" + provider.id))
        return route.fulfill({ json: { data: provider } });
      if (path.endsWith("/directory/providers"))
        return route.fulfill({ json: { data: [provider] } });
      if (path.endsWith("/directory/clinics"))
        return route.fulfill({ json: { data: provider.clinics } });
      return route.fulfill({
        status: 503,
        json: { error: { message: "PRIVATE" } },
      });
    });
    await page.addInitScript((l) => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", l);
    }, locale);
    await page.goto(origin + "/patient/doctors/" + provider.id);
    await page.locator(".slots button").first().waitFor();
    await responsive("availability");
    assert.equal(
      await page.getByLabel(t("What brings you in?"), { exact: true }).count(),
      0,
    );
    await page.locator(".slots button").first().click();
    await button("Review live booking").click();
    await page.getByRole("dialog").waitFor();
    await responsive("booking review");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await snap(locale === "en" ? "31-en-live-review" : "36-ar-live-review");
    await button("Confirm live booking").click();
    await page.locator(".form-error[role=alert]").waitFor();
    assert.ok(
      !(await page.locator(".form-error[role=alert]").innerText()).includes(
        "PRIVATE",
      ),
    );
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
    await button("Retry unchanged booking").click();
    await page
      .getByRole("heading", { name: t("Booking details"), exact: true })
      .waitFor();
    await button("Cancel booking").waitFor();
    const posts = calls.filter(
      (c) => c.path === "/api/v1/me/bookings" && c.method === "POST",
    );
    assert.equal(posts[0].body, posts[1].body);
    assert.deepEqual(Object.keys(JSON.parse(posts[1].body)).sort(), [
      "operationKey",
      "slotId",
    ]);
    assert.equal(posts[1].headers["x-csrf-token"], "booking-browser-csrf");
    await responsive("confirmation/detail");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await snap(locale === "en" ? "32-en-live-booking" : "37-ar-live-booking");
    assert.equal(
      await page
        .getByRole("link", {
          name: t("Open consultation workspace"),
          exact: true,
        })
        .count(),
      0,
    );
    assert.ok(
      !(await page.locator("body").innerText()).includes("INTERNAL-SOURCE-ID"),
    );
    await link("Back to my bookings").click();
    await link("View booking").first().waitFor();
    await responsive("history");
    if (locale === "ar") await snap("38-ar-mobile-bookings");
    else {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await snap("33-en-live-history");
    }
    await button("Next").click();
    await page
      .getByText(
        t("Page {page} · {total} bookings")
          .replace("{page}", "2")
          .replace("{total}", "21"),
        { exact: true },
      )
      .waitFor();
    await button("Previous").click();
    await link("View booking").first().click();
    await button("Reschedule booking").click();
    await page.getByRole("dialog").locator(".slots button").first().waitFor();
    assert.equal(
      await page.getByRole("dialog").locator(".slots button").count(),
      1,
    );
    await page.getByRole("dialog").locator(".slots button").click();
    await button("Review reschedule").click();
    await responsive("reschedule dialog");
    await button("Confirm reschedule").click();
    await page.locator(".form-error[role=alert]").waitFor();
    assert.equal(current.state, "BOOKED");
    assert.equal(current.id, base.id);
    await button("Confirm reschedule").click();
    await page.waitForURL("**/patient/appointments/" + id(22));
    await button("Cancel booking").waitFor();
    const reschedules = calls.filter((c) => c.path.endsWith("/reschedule"));
    assert.equal(reschedules[0].body, reschedules[1].body);
    assert.equal(JSON.parse(reschedules[1].body).slotId, target.id);
    await button("Cancel booking").click();
    await page.getByRole("dialog").waitFor();
    await responsive("cancel dialog");
    await button("Confirm cancellation").click();
    await page.locator(".form-error[role=alert]").waitFor();
    await button("Confirm cancellation").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .locator(".booking-status")
      .getByText(t("Cancelled"), { exact: true })
      .waitFor();
    const cancels = calls.filter((c) => c.path.endsWith("/cancel"));
    assert.equal(cancels[0].body, cancels[1].body);
    for (const status of [401, 404, 503]) {
      readError = status;
      await page.goto(origin + "/patient/appointments");
      await page.locator("#main .error-panel[role=alert]").waitFor();
      assert.ok(
        !(
          await page.locator("#main .error-panel[role=alert]").innerText()
        ).includes("PRIVATE"),
      );
      assert.equal(await page.getByLabel(t("Demo workspace")).count(), 0);
    }
    readError = 0;
    empty = true;
    await page.reload();
    await page
      .getByRole("heading", { name: t("No bookings yet"), exact: true })
      .waitFor();
    empty = false;
    loadHistory = true;
    const pendingHistory = new Promise((resolve) => {
      historyStarted = resolve;
    });
    const navigation = page.goto(origin + "/patient/appointments").then(
      () => null,
      (error) => error,
    );
    await pendingHistory;
    await page
      .locator("#main")
      .getByRole("status", { name: t("Loading"), exact: true })
      .first()
      .waitFor();
    assert.equal(typeof loadingResolve, "function");
    loadingResolve();
    const navigationError = await navigation;
    assert.equal(navigationError, null);
    await link("View booking").first().waitFor();
    role = "CLINICIAN";
    previous = null;
    current = {
      ...base,
      startAt: "2026-01-01T10:00:00Z",
      endAt: "2026-01-01T10:30:00Z",
    };
    const clinicianStart = calls.length;
    await page.goto(origin + "/doctor/schedule");
    await link("View booking").waitFor();
    await responsive("clinician schedule");
    if (locale === "en") {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await snap("34-en-live-schedule");
    }
    await link("View booking").click();
    await button("Record attendance").click();
    await page.getByRole("dialog").waitFor();
    await responsive("attendance dialog");
    await button("Confirm observation").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .locator(".booking-status")
      .getByText(t("Attended"), { exact: true })
      .waitFor();
    await button("Correct attendance").click();
    await page
      .getByLabel(t("Attendance observation"), { exact: true })
      .selectOption("NO_SHOW");
    await page
      .getByLabel(t("Correction reason"), { exact: true })
      .fill("Synthetic operational correction · تصحيح $&");
    await responsive("correction dialog");
    if (locale === "en") {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await snap("35-en-attendance-correction");
    }
    await button("Append correction").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(current.state, "NO_SHOW");
    assert.equal(current.attendanceHistory.length, 2);
    await button("Correct attendance").click();
    await page
      .getByLabel(t("Attendance observation"), { exact: true })
      .selectOption("ATTENDED");
    await page
      .getByLabel(t("Correction reason"), { exact: true })
      .fill("Second correction — لا إعادة فتح");
    await button("Append correction").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(current.state, "NO_SHOW");
    assert.equal(current.attendanceHistory.length, 3);
    assert.ok(
      !calls
        .slice(clinicianStart)
        .some((c) =>
          /\/patients\/|consultation|assignment|prescription|laboratory/.test(
            c.path,
          ),
        ),
    );
    assert.equal(
      await page
        .getByRole("link", {
          name: t("Open consultation workspace"),
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await page.locator("html").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS live Booking browser EN/AR/RTL: real-contract create/retry/history/detail/pagination/cancel/reschedule/conflicts, same clinician/clinic, schedule/attendance/correction history, safe 401/404/503, no Demo fallback or clinical authority, loading/empty and 1440/834/390 layouts.",
  );
}
