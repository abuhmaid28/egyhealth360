/** Controlled, read-only HTTP presentation proof; no hosted credentials or persistence claim. */
/* global document, getComputedStyle, innerWidth */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clinicianMasterPage } from "./ui-clinician-master-browser.mjs";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const variants = [
  ["ordinary", "2026-11-05T07:00:00Z", null],
  ["first", "2026-10-29T20:30:00Z", "UTC+03:00"],
  ["second", "2026-10-29T21:30:00Z", "UTC+02:00"],
];

export async function testStagingTime(browser, origin, shots) {
  if (shots) await mkdir(shots, { recursive: true });
  for (const locale of ["en", "ar"]) {
    const calls = [], errors = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(locale => {
      globalThis.localStorage.setItem("eh360-ui-mode", "live");
      globalThis.localStorage.setItem("eh360-locale", locale);
    }, locale);
    let role = "PATIENT", denied = 0;
    let booking = {
      id: id(1), slotId: id(2), providerId: id(3), clinicId: id(4),
      patientDisplayName: "Synthetic time review", timeZone: "Africa/Cairo",
      state: "BOOKED", version: 1, createdAt: "2026-10-01T10:00:00Z",
      predecessorId: null, successorId: null, attendance: "UNKNOWN",
      transitions: [{ id: id(10), command: "CREATE", fromState: null, toState: "BOOKED", recordedAt: "2026-11-01T13:45:00Z" }],
      attendanceHistory: [{ id: id(11), observation: "ATTENDED", supersedesId: null, reason: null, recordedAt: "2026-11-01T15:05:00Z" }],
    };
    await page.route("**/api/v1/**", route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      calls.push({ method: request.method(), path });
      const send = (data, meta) => route.fulfill({ json: { data, ...(meta ? { meta } : {}) } });
      if (request.method() !== "GET") return route.fulfill({ status: 405, json: {} });
      if (path.endsWith("/auth/me")) return send({
        user: { role, email: "synthetic-time@example.invalid" },
        csrfToken: "controlled-time-only",
      });
      if (path.endsWith("/me/profile")) return send({
        id: id(8), displayName: "Synthetic time review", dateOfBirth: null, sex: null,
      });
      if (path.endsWith("/me/bookings")) return send([booking], { page: 1, pageSize: 20, total: 1 });
      if (path.endsWith(`/me/bookings/${id(1)}`)) return denied
        ? route.fulfill({ status: denied, json: { error: { code: "BOOKING_NOT_FOUND", message: "DENIED_TIME_CANARY" }, private: "WRONG_PATIENT_TIME_CANARY" } })
        : send(booking);
      if (path.endsWith("/directory/providers")) return send([{
        id: id(3), displayName: "Recorded doctor · دكتور Synthetic Long Recorded Name Without Truncation",
        specialty: { key: "internal", displayName: "Internal medicine" }, clinics: [],
      }]);
      if (path.endsWith("/directory/clinics")) return send([{
        id: id(4), displayName: "Recorded clinic · عيادة", city: "Cairo", address: "Synthetic address",
      }]);
      if (path.endsWith("/me/summaries") || path.endsWith("/me/follow-up-intents"))
        return send([], { page: 1, pageSize: 20, total: 0 });
      return route.fulfill({ status: 404, json: {} });
    });

    for (const [name, startAt, offset] of variants) {
      booking = { ...booking, startAt, endAt: new Date(Date.parse(startAt) + 1_800_000).toISOString() };
      await page.goto(origin + "/patient");
      const anchor = page.locator("[data-appointment-anchor]");
      await anchor.locator(`a[href$="${id(1)}"]`).waitFor();
      const text = await anchor.innerText();
      assert.ok(text.includes(locale === "ar" ? "بتوقيت القاهرة" : "Cairo time"));
      if (offset) {
        await anchor.getByText(offset, { exact: true }).waitFor();
        assert.ok(text.includes("23:30"), `${name}: preserve repeated clinic clock time`);
      } else assert.ok(!text.includes("UTC"), "ordinary appointment retains concise context");
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        if (shots && locale === "ar" && width === 390 && offset)
          await page.screenshot({ path: resolve(shots, `time-patient-${name}-ar-mobile.png`), fullPage: true });
      }
    }

    for (const [name, startAt, endAt, zone, expected, offsets] of [
      ["same-day", "2026-11-05T07:00:00Z", "2026-11-05T07:30:00Z", "Africa/Cairo", ["9", "9:30"], ["UTC+02:00"]],
      ["cross-midnight", "2026-11-05T21:30:00Z", "2026-11-05T22:30:00Z", "Africa/Cairo", ["11:30", "12:30"], ["UTC+02:00"]],
      ["fold", "2026-10-29T20:30:00Z", "2026-10-29T21:30:00Z", "Africa/Cairo", ["11:30", "11:30"], ["UTC+03:00", "UTC+02:00"]],
      ["cross-zone", "2026-11-12T13:00:00Z", "2026-11-12T13:30:00Z", "America/New_York", ["8", "8:30"], ["UTC-05:00"]],
    ]) {
      booking = { ...booking, startAt, endAt, timeZone: zone };
      await page.goto(`${origin}/patient/appointments/${id(1)}`);
      const range = page.locator(".booking-time > bdi").first();
      await range.waitFor();
      assert.equal(await range.getAttribute("dir"), "ltr");
      const times = range.locator("[data-appointment-endpoint]");
      const morning = locale === "ar" ? "صباحًا" : "am", evening = locale === "ar" ? "مساءً" : "pm";
      assert.deepEqual(await times.allTextContents(), expected.map((clock, i) => `${clock} ${name === "fold" || (name === "cross-midnight" && i === 0) ? evening : morning}`));
      const detailTime = page.locator("[data-patient-detail-time]");
      assert.ok((await detailTime.innerText()).includes(zone));
      for (const offset of offsets) assert.ok((await detailTime.innerText()).includes(offset));
      assert.ok((await page.locator(".timeline").innerText()).includes("15:45"), "consequential booking history remains24h");
      assert.ok((await page.locator(".observation-row").innerText()).includes("17:05"), "attendance timestamp remains24h");
      await page.setViewportSize({ width: 1440, height: 1000 });
      const first = await times.nth(0).boundingBox(), last = await times.nth(1).boundingBox();
      assert.ok(first.x < last.x && Math.abs(first.y - last.y) < 2, `${locale} ${name}: endpoints ordered visually`);
      if (name === "cross-midnight") {
        const dates = await range.locator(":scope > bdi:not([dir])").allTextContents();
        assert.equal(dates.length, 2);
        assert.notEqual(dates[0], dates[1], "retain both actual clinic dates across midnight");
      }
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        if (shots && locale === "ar" && width !== 320)
          await page.screenshot({ path: resolve(shots, `time-booking-${name}-ar-${width}.png`), fullPage: true });
      }
    }
    // Text growth is applied from one pre-captured computed-size snapshot, never compounded.
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(() => {
      const sizes = [...document.querySelectorAll("body *")].map(el => [el, getComputedStyle(el).fontSize]);
      for (const [el, size] of sizes) el.style.fontSize = `${parseFloat(size) * 2}px`;
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "200% text reflow");
    assert.ok((await page.locator(".booking-identity").innerText()).includes("Synthetic Long Recorded Name Without Truncation"));
    const back = page.locator("a.back-link").first();
    await back.focus();
    assert.equal(await back.evaluate(el => el === document.activeElement), true);
    await back.click();
    await page.waitForURL("**/patient/appointments");
    await page.locator(".booking-time").first().waitFor();
    assert.equal(await page.locator("[data-patient-detail-time]").count(), 0, "list caller remains default");
    assert.ok((await page.locator(".booking-time").first().innerText()).includes("08:00"));
    await page.goBack();
    await page.locator("[data-patient-detail-time]").waitFor();
    assert.equal(await page.getByRole("button", { name: locale === "ar" ? "إعادة جدولة الحجز" : "Reschedule booking", exact: true }).count(), 1);

    for (const status of [401, 403, 404, 503]) {
      denied = status;
      await page.reload();
      await page.locator(".error-panel").first().waitFor();
      assert.equal(await page.locator(".booking-time").count(), 0);
      const body = await page.locator("body").innerText(), accessible = await page.locator("body").ariaSnapshot();
      for (const value of ["DENIED_TIME_CANARY", "WRONG_PATIENT_TIME_CANARY", "Synthetic Long Recorded Name Without Truncation", id(1)]) {
        assert.ok(!body.includes(value) && !accessible.includes(value), "denied synthetic payload/reference absent");
      }
      assert.equal(await page.locator("[data-demo-utility]").count(), 0);
    }
    denied = 0;
    role = "CLINICIAN";
    booking = { ...booking, startAt: "2026-11-12T13:00:00Z", endAt: "2026-11-12T13:30:00Z", timeZone: "Africa/Cairo" };
    await page.goto(`${origin}/doctor/appointments/${id(1)}`);
    await page.locator(".booking-time").first().waitFor();
    assert.equal(await page.locator("[data-patient-detail-time]").count(), 0);
    assert.match(await page.locator(".booking-time").first().innerText(), /15:00.*15:30/);
    assert.ok(calls.every(call => call.method === "GET"), "time display must not issue commands");
    assert.equal(await page.locator("[data-demo-utility]").count(), 0);
    assert.deepEqual(errors, []);
    await page.close();

    const clinician = await clinicianMasterPage(browser, origin, locale);
    await clinician.page.locator(".documentation-content textarea").first().waitFor();
    for (const [name, startAt, offset] of variants) {
      clinician.state.startAt = startAt;
      await clinician.page.reload();
      const visit = clinician.page.locator(".master-visit");
      await visit.waitFor();
      await clinician.page.locator(".documentation-content textarea").first().waitFor();
      const context = visit.locator(":scope > small");
      if (offset) await context.getByText(offset, { exact: true }).waitFor();
      else assert.ok(!(await context.innerText()).includes("UTC"));
      for (const width of [1440, 390, 320]) {
        await clinician.page.setViewportSize({ width, height: 1000 });
        assert.ok(await clinician.page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        if (shots && locale === "ar" && width === 390 && offset)
          await clinician.page.screenshot({ path: resolve(shots, `time-clinician-${name}-ar-mobile.png`), fullPage: true });
      }
    }
    assert.deepEqual(clinician.state.writes, []);
    assert.deepEqual(clinician.state.errors, []);
    await clinician.page.close();
  }
  console.log("PASS staging time review: Cairo folds, scoped Patient Detail12h, professional/history24h, midnight/cross-zone, EN/AR1440/390/320px/text200%, Back/focus and controlled401/403/404/503 suppression; GET-only fixtures, NOT Live E2E.");
}
