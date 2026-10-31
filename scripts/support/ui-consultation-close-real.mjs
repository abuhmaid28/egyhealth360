/** Actual Browser → Next → Nest → PostgreSQL close. No HTTP mocks. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { pastBooking } from "../../tests/support/bookings.mjs";

export async function testRealClose(browser, page, f, fault, login) {
  const origin = "http://localhost:3000";
  // Re-establish current authority through the approved bilateral HTTP workflow
  // after the preceding privacy proof ended its relationship and patient sessions.
  const patientContext = await browser.newContext({
    viewport: { width: 390, height: 1000 },
  });
  const patient = await patientContext.newPage();
  const command = (p, path, method, body) =>
    p.evaluate(
      async ({ path, method, body }) => {
        const auth = await (
          await fetch("/api/v1/auth/me", { cache: "no-store" })
        ).json();
        const r = await fetch("/api/v1" + path, {
          method,
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": auth.data.csrfToken,
          },
          body: JSON.stringify(body),
        });
        return { status: r.status, json: await r.json() };
      },
      { path, method, body },
    );
  await login(patient, "patient");
  const relation = await command(patient, "/me/relationship-requests", "POST", {
    providerId: f.provider.publicId,
    operationKey: randomUUID(),
  });
  assert.equal(relation.status, 200);
  await login(page, "clinician");
  assert.equal(
    (
      await command(
        page,
        `/me/relationship-requests/${relation.json.data.request.id}/accept`,
        "PUT",
        {},
      )
    ).status,
    200,
  );
  const slot = await f.publish(960);
  const bookingResponse = await command(patient, "/me/bookings", "POST", {
    slotId: slot.id,
    operationKey: randomUUID(),
  });
  assert.equal(bookingResponse.status, 200);
  const booked = bookingResponse.json.data;
  await pastBooking(f, booked, false, 4, f.actors.clinician); // Approved timing fixture, guards restored before UI commands.
  await page.goto(`${origin}/doctor/appointments/${booked.id}`);
  const button = (name, p = page) =>
    p.getByRole("button", { name, exact: true });
  await button("Start consultation").click();
  await button("Confirm opening").click();
  await page
    .getByRole("link", { name: "View opening details", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open clinical documentation", exact: true })
    .click();
  await page.getByLabel("Private note content", { exact: true }).waitFor();
  const consultation = (
    await f.pool.query("SELECT * FROM consultations WHERE booking_id=$1", [
      booked.id,
    ])
  ).rows[0];
  const path = `/api/v1/consultations/${consultation.id}/close`;
  const url = `${origin}/doctor/consultation/${booked.id}/documentation`;
  const privateText = "SYNTHETIC_CLOSE_PRIVATE_CANARY";
  await page
    .getByLabel("Private note content", { exact: true })
    .fill(privateText);
  await button("Save private note draft").click();
  await page
    .locator(".documentation-feedback")
    .filter({ hasText: "Saved by the Live service" })
    .waitFor();
  await page.getByText("Saving…", { exact: true }).waitFor({ state: "hidden" });
  await page
    .getByLabel("Patient summary content", { exact: true })
    .fill("Synthetic close summary draft");
  await button("Save summary draft").click();
  await page.getByText("Saving…", { exact: true }).waitFor({ state: "hidden" });
  const follow = page.getByRole("region", {
    name: "Follow-up instructions",
    exact: true,
  });
  await follow
    .getByLabel("Clinician instruction", { exact: true })
    .fill("Synthetic close follow-up draft");
  await button("Save follow-up draft", follow).click();
  await follow.getByText("Draft · clinician only", { exact: true }).waitFor();
  // A full reload must recover exact context without repeating opening or any mutation.
  const writes = [];
  const collect = (r) => {
    if (
      ["PUT", "POST"].includes(r.method()) &&
      new URL(r.url()).pathname.startsWith("/api/v1/")
    )
      writes.push({
        path: new URL(r.url()).pathname,
        body: r.postData(),
        method: r.method(),
        headers: r.headers(),
      });
  };
  page.on("request", collect);
  await page.reload();
  await page.getByLabel("Private note content", { exact: true }).waitFor();
  assert.equal(writes.length, 0, "reload recovers with reads only");
  await patient.goto(origin + "/patient/summaries");
  const patientSnapshot = async () =>
    patient.evaluate(async () => {
      const paths = ["/me/summaries", "/me/follow-up-intents"];
      return Promise.all(
        paths.map(async (path) => {
          const r = await fetch("/api/v1" + path, { cache: "no-store" });
          return { status: r.status, body: await r.json() };
        }),
      );
    });
  const visibleBefore = await patientSnapshot();
  assert.ok(!JSON.stringify(visibleBefore).includes("Synthetic close"));
  const clinicalSnapshot = async () =>
    Object.fromEntries(
      await Promise.all(
        [
          "consultation_documents",
          "consultation_document_versions",
          "consultation_document_operations",
          "follow_up_intents",
          "follow_up_intent_versions",
          "follow_up_intent_operations",
          "care_actions",
        ].map(async (table) => [
          table,
          (await f.pool.query(`SELECT * FROM public.${table} ORDER BY id`))
            .rows,
        ]),
      ),
    );
  const counts = async () =>
    (
      await f.pool.query(
        `SELECT
    (SELECT count(*)::int FROM booking_events WHERE booking_id=$1) events,
    (SELECT count(*)::int FROM booking_operations WHERE booking_id=$1) operations,
    (SELECT count(*)::int FROM audit_logs WHERE entity_id=$2 AND action_type='CONSULTATION_CLOSED') closes`,
        [booked.id, consultation.id],
      )
    ).rows[0];
  const before = await clinicalSnapshot(),
    beforeCounts = await counts();
  const trigger = button("Review & close consultation");
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").waitFor();
  assert.equal(
    await button("Confirm close consultation", dialog).isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await trigger.evaluate((el) => el === globalThis.document.activeElement),
    true,
    "Escape restores review trigger focus",
  );
  await trigger.click();
  await dialog.getByRole("checkbox").check();
  await mkdir("docs/ui-screenshots/closeout", { recursive: true });
  for (const locale of ["en", "ar"]) {
    if (locale === "ar") {
      await page.keyboard.press("Escape");
      await button("العربية").click();
      await page
        .getByRole("button", { name: "مراجعة وإغلاق الاستشارة", exact: true })
        .click();
      await dialog.getByRole("checkbox").check();
    }
    for (const width of [1440, 834, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth + 1,
        ),
        `${locale} ${width} no overflow`,
      );
      const bounds = await dialog.boundingBox();
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= width,
        "dialog stays within viewport",
      );
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        "dialog has no horizontal clipping",
      );
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        locale === "ar" ? "rtl" : "ltr",
      );
      await page.screenshot({
        path: `docs/ui-screenshots/closeout/${locale}-${width}-review.png`,
      });
    }
  }
  await page.keyboard.press("Escape");
  await button("English").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await trigger.click();
  await dialog.getByRole("checkbox").check();
  const dbBefore = (await f.pool.query("SELECT clock_timestamp() now")).rows[0]
    .now;
  fault.dropNextCloseSuccess = true;
  await button("Confirm close consultation", dialog).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(fault.closesDropped, 1);
  assert.equal(
    writes.filter((r) => r.path === path).length,
    1,
    "no automatic mutation retry after lost committed close",
  );
  let closed = (
    await f.pool.query("SELECT * FROM consultations WHERE id=$1", [
      consultation.id,
    ])
  ).rows[0];
  assert.equal(closed.state, "CLOSED");
  assert.equal(closed.version, 2);
  assert.ok(closed.closed_at >= dbBefore);
  assert.equal(
    (await f.bookings.detail(f.actors.clinician, booked.id)).data.state,
    "CONSULTED",
  );
  assert.deepEqual(
    await clinicalSnapshot(),
    before,
    "close signs/releases/creates no clinical material",
  );
  assert.deepEqual(
    await patientSnapshot(),
    visibleBefore,
    "patient projection unchanged by close",
  );
  await button("Retry unchanged close", dialog).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("Closed · booking consulted", { exact: true }).waitFor();
  const posts = writes.filter((r) => r.path === path);
  assert.equal(posts.length, 2);
  assert.equal(posts[0].body, posts[1].body);
  assert.deepEqual(Object.keys(JSON.parse(posts[0].body)), [
    "operationKey",
    "expectedVersion",
  ]);
  assert.equal(JSON.parse(posts[0].body).expectedVersion, 1);
  assert.ok(
    posts.every(
      (r) => r.method === "PUT" && r.headers["idempotency-key"] === undefined,
    ),
  );
  assert.deepEqual(await counts(), {
    events: beforeCounts.events + 1,
    operations: beforeCounts.operations + 1,
    closes: beforeCounts.closes + 1,
  });
  assert.deepEqual(
    await clinicalSnapshot(),
    before,
    "explicit replay duplicates no clinical state",
  );
  assert.deepEqual(
    (
      await f.pool.query("SELECT * FROM consultations WHERE id=$1", [
        consultation.id,
      ])
    ).rows[0],
    closed,
    "replay preserves the exact committed close provenance",
  );
  assert.equal(
    await trigger.count(),
    0,
    "closed workspace has no close trigger",
  );
  await page.waitForFunction(() =>
    globalThis.document.activeElement?.classList.contains("close-result"),
  );
  await page.reload();
  await page.getByText("Closed · booking consulted", { exact: true }).waitFor();
  assert.equal(
    writes.filter((r) => r.path === path).length,
    2,
    "reload never retries close",
  );
  await page
    .getByRole("link", { name: "View consulted booking", exact: true })
    .click();
  await page.getByText("Consulted", { exact: true }).first().waitFor();
  assert.equal(await button("Record attendance").isDisabled(), true);
  assert.equal(await button("Correct attendance").isDisabled(), true);
  await page.goto(origin + "/doctor/schedule");
  await page
    .locator(".live-booking-row")
    .filter({
      has: page.locator(`a[href="/doctor/appointments/${booked.id}"]`),
    })
    .getByText("Consulted", { exact: true })
    .waitFor();
  await patient.goto(origin + "/patient/appointments");
  await patient
    .locator(".live-booking-row")
    .filter({
      has: patient.locator(`a[href="/patient/appointments/${booked.id}"]`),
    })
    .getByText("Consulted", { exact: true })
    .waitFor();
  await patient.goto(`${origin}/patient/appointments/${booked.id}`);
  await patient
    .getByText("Your consultation is closed", { exact: true })
    .waitFor();
  assert.equal(await button("Cancel booking", patient).isDisabled(), true);
  assert.equal(await button("Reschedule booking", patient).isDisabled(), true);
  assert.ok(!(await patient.locator("body").innerText()).includes(privateText));
  // Real backend also rejects illegal post-close operational commands.
  for (const command of [
    "cancel",
    "reschedule",
    "attendance",
    "attendance/correct",
  ]) {
    const result = await f.http(
      `/me/bookings/${booked.id}/${command}`,
      {
        operationKey: randomUUID(),
        expectedVersion: 3,
        ...(command === "reschedule"
          ? { slotId: (await f.publish(1020)).id }
          : {}),
        ...(command.startsWith("attendance") ? { observation: "NO_SHOW" } : {}),
        ...(command.endsWith("correct")
          ? { reason: "Synthetic contradiction" }
          : {}),
      },
      command.startsWith("attendance") ? "clinician" : "patient",
    );
    assert.equal(result.response.status, 409, command);
  }
  // Independent explicit releases remain available after close with current authority.
  await page.goto(url);
  await page.getByLabel("Private note content", { exact: true }).waitFor();
  await button("Review sign and release").click();
  await button("Confirm sign and release").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await follow
    .getByRole("button", { name: "Review follow-up release", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await button("Sign and release follow-up", page.getByRole("dialog")).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await patient.goto(origin + "/patient/summaries");
  await patient
    .getByText("Synthetic close summary draft", { exact: true })
    .waitFor();
  await patient.goto(origin + "/patient/follow-up");
  await patient
    .getByText("Synthetic close follow-up draft", { exact: true })
    .waitFor();
  const afterRelease = await clinicalSnapshot();
  const privateRoots = afterRelease.consultation_documents
    .filter(
      (d) => d.consultation_id === consultation.id && d.kind === "PRIVATE_NOTE",
    )
    .map((d) => d.id);
  const privateVersions = afterRelease.consultation_document_versions.filter(
    (v) => privateRoots.includes(v.document_id),
  );
  assert.equal(privateVersions.length, 1);
  assert.ok(
    privateVersions.every((v) => v.state === "DRAFT"),
    "private draft remains unsigned after independent summary/intent releases",
  );
  closed = (
    await f.pool.query("SELECT * FROM consultations WHERE id=$1", [
      consultation.id,
    ])
  ).rows[0];
  assert.equal(closed.state, "CLOSED");
  for (const p of [page, patient]) {
    const stored = await p.evaluate(() =>
      JSON.stringify({
        ...globalThis.localStorage,
        ...globalThis.sessionStorage,
      }),
    );
    assert.ok(!stored.includes(privateText));
    assert.ok(!stored.includes(consultation.id));
  }
  await patientContext.close();
  page.off("request", collect);
  console.log(
    "PASS real I2 Close Browser→Next→Nest→PostgreSQL: reload recovery; deliberate review/keyboard focus; EN/AR/RTL 1440/834/390; real CLOSED/CONSULTED; lost committed response + retained explicit retry; single event/operation/audit; no automatic clinical release/signing/care action; truthful doctor/patient views; illegal actions blocked; independent explicit post-close releases.",
  );
}
