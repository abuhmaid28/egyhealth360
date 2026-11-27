/** Controlled, read-only HTTP presentation proof; no hosted credentials or persistence claim. */
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
    let booking = {
      id: id(1), slotId: id(2), providerId: id(3), clinicId: id(4),
      patientDisplayName: "Synthetic time review", timeZone: "Africa/Cairo",
      state: "BOOKED", version: 1, createdAt: "2026-10-01T10:00:00Z",
      predecessorId: null, successorId: null, attendance: "UNKNOWN",
      transitions: [], attendanceHistory: [],
    };
    await page.route("**/api/v1/**", route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      calls.push({ method: request.method(), path });
      const send = (data, meta) => route.fulfill({ json: { data, ...(meta ? { meta } : {}) } });
      if (request.method() !== "GET") return route.fulfill({ status: 405, json: {} });
      if (path.endsWith("/auth/me")) return send({
        user: { role: "PATIENT", email: "synthetic-time@example.invalid" },
        csrfToken: "controlled-time-only",
      });
      if (path.endsWith("/me/profile")) return send({
        id: id(8), displayName: "Synthetic time review", dateOfBirth: null, sex: null,
      });
      if (path.endsWith("/me/bookings")) return send([booking], { page: 1, pageSize: 20, total: 1 });
      if (path.endsWith(`/me/bookings/${id(1)}`)) return send(booking);
      if (path.endsWith("/directory/providers")) return send([{
        id: id(3), displayName: "Recorded doctor · دكتور",
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
        await anchor.getByText(
          locale === "ar" ? "11:30 م" : "11:30 pm",
          { exact: true },
        ).waitFor();
      } else assert.ok(!text.includes("UTC"), "ordinary appointment retains concise context");
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        if (shots && locale === "ar" && width === 390 && offset)
          await page.screenshot({ path: resolve(shots, `time-patient-${name}-ar-mobile.png`), fullPage: true });
      }
    }

    for (const [name, startAt, endAt] of [
      ["same-day", "2026-11-05T07:00:00Z", "2026-11-05T07:30:00Z"],
      ["cross-midnight", "2026-11-05T21:30:00Z", "2026-11-05T22:30:00Z"],
    ]) {
      booking = { ...booking, startAt, endAt };
      await page.goto(`${origin}/patient/appointments/${id(1)}`);
      const range = page.locator(".booking-time > bdi").first();
      await range.waitFor();
      const formatTime = value => new Intl.DateTimeFormat("en-GB", {
        timeZone: booking.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).format(new Date(value));
      assert.equal(await range.getAttribute("dir"), "ltr");
      const times = range.locator(':scope > bdi[dir="ltr"]');
      assert.deepEqual(await times.allTextContents(), [formatTime(startAt), formatTime(endAt)]);
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
  console.log("PASS staging time review: both Cairo repeated-hour offsets, concise ordinary context, Patient/Clinician EN/AR at 1440/390/320px; same-day and cross-midnight Live booking ranges visually ordered; read-only controlled HTTP, no Demo fallback.");
}
