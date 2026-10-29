import { randomUUID } from "node:crypto";
/** Actual browser → Next rewrite → Nest → PostgreSQL. No HTTP mocks. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { pastBooking } from "../../tests/support/bookings.mjs";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
export async function testRealBooking(page, f) {
  const origin = "http://localhost:3000";
  // Existing availability smoke has signed in the real patient and selected Arabic.
  const t = (text) => dictionary.ar[text] ?? text;
  const button = (text) =>
    page.getByRole("button", { name: t(text), exact: true });
  const link = (text) => page.getByRole("link", { name: t(text), exact: true });
  const ready = async () =>
    page.locator("#main .loading").waitFor({ state: "hidden" });
  const requests = [];
  page.on("request", (r) =>
    requests.push({
      url: new URL(r.url()).pathname,
      method: r.method(),
      body: r.postData(),
    }),
  );
  await page.locator(".live-slots button").first().click();
  assert.equal(
    await page.getByLabel(t("What brings you in?"), { exact: true }).count(),
    0,
  );
  await button("Review live booking").click();
  await page.getByRole("dialog").waitFor();
  await button("Confirm live booking").click();
  await page
    .getByRole("heading", { name: t("Booking details"), exact: true })
    .waitFor();
  await ready();
  const created = (await f.bookings.history(f.actors.patient, {})).data[0];
  assert.equal(created.state, "BOOKED");
  assert.equal((await f.request(f.path)).json.meta.total, 0);
  const post = requests.find(
    (r) => r.url === "/api/v1/me/bookings" && r.method === "POST",
  );
  assert.deepEqual(Object.keys(JSON.parse(post.body)).sort(), [
    "operationKey",
    "slotId",
  ]);
  assert.equal(JSON.parse(post.body).slotId, created.slotId);
  assert.equal(await page.getByLabel(t("Demo workspace")).count(), 0);
  assert.equal(
    await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-mode")),
    "live",
  );
  await link("Back to my bookings").click();
  await page
    .getByRole("heading", { name: t("My bookings"), exact: true })
    .first()
    .waitFor();
  await link("View booking").click();
  await button("Reschedule booking").waitFor();
  const replacement = await f.publish(60);
  await button("Reschedule booking").click();
  await page.getByRole("dialog").locator(".slots button").first().waitFor();
  await page.getByRole("dialog").locator(".slots button").first().click();
  await button("Review reschedule").click();
  await button("Confirm reschedule").click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/patient/appointments/") &&
      !url.pathname.endsWith(created.id),
  );
  await button("Cancel booking").waitFor();
  const history = (await f.bookings.history(f.actors.patient, {})).data;
  const next = history.find((b) => b.predecessorId === created.id);
  assert.ok(next);
  assert.equal(next.slotId, replacement.id);
  assert.equal(
    (await f.bookings.detail(f.actors.patient, created.id)).data.state,
    "RESCHEDULED",
  );
  // Cancellation is not gated by current directory eligibility.
  await f.setProvider({ isPublished: false });
  await page.reload();
  await button("Cancel booking").waitFor();
  await button("Cancel booking").click();
  await button("Confirm cancellation").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".booking-status")
    .getByText(t("Cancelled"), { exact: true })
    .waitFor();
  assert.equal(
    (await f.bookings.detail(f.actors.patient, next.id)).data.state,
    "CANCELLED",
  );
  await f.setProvider({ isPublished: true });
  // Approved, isolated timing fixture restores all guards before browser assertions.
  // The independent backend runtime additionally proves real-clock boundaries.
  const attended = await f.create(await f.publish(120));
  const missed = await f.create(await f.publish(180));
  await pastBooking(f, missed, true);
  // Switch accounts explicitly, retaining only the presentation language preference.
  await button("Sign out").click();
  await page
    .getByRole("button", { name: t("Sign in with live account"), exact: true })
    .waitFor();
  await page
    .getByLabel(t("Email address"), { exact: true })
    .fill(f.users.clinician.email);
  await page.getByLabel(t("Password"), { exact: true }).fill(f.password);
  const clinicianStart = requests.length;
  await button("Sign in with live account").click();
  await page.waitForURL("**/doctor");
  await page
    .getByRole("heading", { name: t("My schedule"), exact: true })
    .waitFor();
  await ready();
  const exactSchedule = (await f.bookings.schedule(f.actors.clinician, {}))
    .data;
  assert.equal(exactSchedule.length, 4);
  for (const b of [attended, missed])
    assert.ok(exactSchedule.some((v) => v.id === b.id));
  await page.goto(origin + "/doctor/appointments/" + missed.id);
  await button("Record attendance").waitFor();
  await button("Record attendance").click();
  await page
    .getByLabel(t("Attendance observation"), { exact: true })
    .selectOption("NO_SHOW");
  await button("Confirm observation").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await button("Correct attendance").waitFor();
  const original = (await f.bookings.detail(f.actors.clinician, missed.id))
    .data;
  assert.equal(original.state, "NO_SHOW");
  await button("Correct attendance").click();
  await page
    .getByRole("dialog")
    .getByText(t("Previous observation"), { exact: true })
    .waitFor();
  await page
    .getByLabel(t("Attendance observation"), { exact: true })
    .selectOption("ATTENDED");
  const reason = "تصحيح تشغيلي اصطناعي — unchanged $&";
  await page.getByLabel(t("Correction reason"), { exact: true }).fill(reason);
  await button("Append correction").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText(reason, { exact: true }).waitFor();
  const corrected = (await f.bookings.detail(f.actors.clinician, missed.id))
    .data;
  assert.equal(corrected.state, "NO_SHOW");
  assert.equal(corrected.attendance, "ATTENDED");
  assert.equal(corrected.attendanceHistory.length, 2);
  assert.deepEqual(
    corrected.attendanceHistory[0],
    original.attendanceHistory[0],
  );
  assert.equal(corrected.attendanceHistory[1].reason, reason);
  await f.availability.withdraw(f.actors.clinician, {
    slotId: missed.slotId,
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  await pastBooking(f, attended, true);
  await page.goto(origin + "/doctor/appointments/" + attended.id);
  await button("Record attendance").waitFor();
  await button("Record attendance").click();
  await page
    .getByLabel(t("Attendance observation"), { exact: true })
    .selectOption("ATTENDED");
  await button("Confirm observation").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .locator(".booking-status")
    .getByText(t("Attended"), { exact: true })
    .waitFor();
  assert.equal(
    (await f.bookings.detail(f.actors.clinician, attended.id)).data.attendance,
    "ATTENDED",
  );

  const body = await page.locator("body").innerText();
  for (const canary of [
    f.users.patient.id,
    f.users.patient.profileId,
    f.users.clinician.id,
    f.users.clinician.profileId,
    f.clinicOrg.id,
    f.membership.id,
  ])
    assert.ok(!body.includes(canary));
  assert.ok(
    !requests
      .slice(clinicianStart)
      .some((r) =>
        /\/patients\/|consultation|prescription|laboratory|assignment/.test(
          r.url,
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
  const counts = await f.counts();
  assert.equal(counts.clinician_patient_assignments, 0);
  assert.equal(counts.relationship_requests, 0);
  assert.equal(counts.clinical_encounters, 0);
  console.log(
    "PASS real browser/API Booking: real create and occupied-slot hiding, patient history/detail, atomic same-clinician/clinic reschedule, cancellation after provider unpublication, exact clinician schedule, explicit attendance/no-show, reasoned correction with retained terminal history, logistics privacy, zero clinical queries/assignments/authority.",
  );
  return { attended };
}
