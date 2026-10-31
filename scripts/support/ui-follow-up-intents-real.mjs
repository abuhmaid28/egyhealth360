/** Actual browser → Next → merged Nest Slice 6 → disposable PostgreSQL.
 * Synthetic data only. Follow-up HTTP routes are never mocked. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
export async function testRealFollowUps(
  browser,
  page,
  f,
  fault,
  consultationId,
  login,
) {
  const origin = "http://localhost:3000";
  const base = `/api/v1/consultations/${consultationId}/follow-up-intents`;
  const section = page.getByRole("region", {
    name: "Follow-up instructions",
    exact: true,
  });
  const button = (name, scope = section) =>
    scope.getByRole("button", { name, exact: true });
  const posts = [],
    releasedBodies = [];
  const collect = (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname.startsWith(base))
      posts.push({
        path: new URL(r.url()).pathname,
        body: r.postData(),
        headers: r.headers(),
      });
  };
  page.on("request", collect);
  const legacy = async () =>
    (
      await f.pool.query(
        "SELECT (SELECT count(*)::int FROM public.follow_up_appointments) appointments,(SELECT count(*)::int FROM public.care_actions) actions",
      )
    ).rows[0];
  const before = await legacy();
  const instruction =
    "Arrange a review with your clinician to discuss the agreed next steps. تعليمات متابعة بشرية";
  await section
    .getByLabel("Clinician instruction", { exact: true })
    .fill(instruction);
  await section
    .getByLabel("Add an optional desired follow-up window", { exact: true })
    .check();
  await section
    .getByLabel("Desired window starts at", { exact: true })
    .fill("2026-11-15T09:00:00+02:00");
  await section
    .getByLabel("Desired window ends at", { exact: true })
    .fill("2026-11-22T09:00:00+02:00");
  await section
    .getByLabel("Desired window time zone", { exact: true })
    .fill("Africa/Cairo");
  await button("Save follow-up draft").click();
  await section.getByText("Draft · clinician only", { exact: true }).waitFor();
  const row = (
    await f.pool.query(
      "SELECT * FROM public.follow_up_intents WHERE consultation_id=$1",
      [consultationId],
    )
  ).rows[0];
  const versionRows = async () =>
    (
      await f.pool.query(
        "SELECT * FROM public.follow_up_intent_versions WHERE root_id=$1 ORDER BY version",
        [row.id],
      )
    ).rows;
  const draftId = (await versionRows())[0].id;
  assert.equal((await versionRows()).length, 1);
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
  });
  const patient = await context.newPage();
  const errors = [];
  patient.on("pageerror", (e) => errors.push(e.message));
  patient.on("response", async (r) => {
    if (new URL(r.url()).pathname.includes("/me/follow-up-intents") && r.ok())
      releasedBodies.push(await r.text());
  });
  await login(patient, "patient");
  await patient.goto(origin + "/patient/follow-up");
  await patient
    .getByText("No released follow-up instructions", { exact: true })
    .waitFor();
  assert.ok(!(await patient.locator("body").innerText()).includes(instruction));
  assert.ok(!releasedBodies.join("").includes(draftId));
  await button("Review follow-up release").click();
  const dialog = page.getByRole("dialog");
  assert.equal(
    await button("Sign and release follow-up", dialog).isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await button("Review follow-up release").evaluate(
      (el) => el === globalThis.document.activeElement,
    ),
    true,
  );
  await button("Review follow-up release").click();
  await dialog
    .getByRole("checkbox", {
      name: "I reviewed this instruction for the correct patient",
      exact: true,
    })
    .check();
  await mkdir("docs/ui-screenshots/follow-up", { recursive: true });
  await page.screenshot({
    path: "docs/ui-screenshots/follow-up/live-en-release-desktop.png",
  });
  const dropped = fault.followUpsDropped;
  fault.dropFollowUpSuffix = "/follow-up-intents/" + row.id + "/sign-release";
  await button("Sign and release follow-up", dialog).click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(fault.followUpsDropped, dropped + 1);
  assert.equal(
    (await versionRows()).length,
    2,
    "release committed once despite lost response",
  );
  assert.equal(
    posts.filter((x) => x.path.endsWith("/sign-release")).length,
    1,
    "no automatic retry",
  );
  await button("Sign and release follow-up", dialog).click();
  await dialog.waitFor({ state: "hidden" });
  const releases = posts.filter((x) => x.path.endsWith("/sign-release"));
  assert.equal(releases.length, 2);
  assert.equal(releases[0].body, releases[1].body);
  assert.equal((await versionRows()).length, 2);
  await patient
    .getByRole("button", {
      name: "Refresh follow-up instructions",
      exact: true,
    })
    .click();
  await patient.getByText(instruction, { exact: true }).waitFor();
  assert.ok(!releasedBodies.join("").includes(draftId));
  assert.ok(!releasedBodies.join("").includes('"version":'));
  assert.equal(await patient.getByRole("textbox").count(), 0);
  // Existing real booking links are displayed, including their current state.
  // Link editing is intentionally outside this bounded UI; fixture setup uses the merged service.
  const booking = await f.create(await f.publish(600));
  await f.intents.execute("LINK", f.actors.clinician, {
    consultationId,
    intentId: row.id,
    bookingId: booking.id,
    expectedLinkVersion: 0,
    operationKey: randomUUID(),
  });
  await patient
    .getByRole("button", {
      name: "Refresh follow-up instructions",
      exact: true,
    })
    .click();
  await patient
    .getByRole("link", { name: "View linked booking", exact: true })
    .waitFor();
  assert.ok(
    (
      await patient
        .getByRole("link", { name: "View linked booking", exact: true })
        .getAttribute("href")
    ).endsWith(booking.id),
  );
  await f.bookings.cancel(f.actors.patient, {
    bookingId: booking.id,
    expectedVersion: booking.version,
    operationKey: randomUUID(),
  });
  await patient
    .getByRole("button", {
      name: "Refresh follow-up instructions",
      exact: true,
    })
    .click();
  await patient
    .getByText(
      "The linked booking is no longer booked. This follow-up instruction remains separate.",
      { exact: true },
    )
    .waitFor();
  await button("Correct released follow-up").click();
  await dialog
    .getByLabel("Clinician instruction", { exact: true })
    .fill(instruction + " Corrected wording.");
  // Returned UTC window is converted back to zone-compatible offsets for the backend.
  assert.equal(
    await dialog
      .getByLabel("Desired window starts at", { exact: true })
      .inputValue(),
    "2026-11-15T09:00:00.000+02:00",
  );
  await dialog
    .getByLabel("Reason for follow-up correction", { exact: true })
    .fill("Clarified the agreed wording");
  await button("Review follow-up correction", dialog).click();
  assert.equal(
    await button("Sign and release correction", dialog).isDisabled(),
    true,
  );
  await dialog
    .getByRole("checkbox", {
      name: "I reviewed this instruction for the correct patient",
      exact: true,
    })
    .check();
  await button("Sign and release correction", dialog).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal((await versionRows()).length, 3);
  assert.equal(
    (await versionRows())[2].predecessor_id,
    (await versionRows())[1].id,
  );
  await patient
    .getByRole("button", {
      name: "Refresh follow-up instructions",
      exact: true,
    })
    .click();
  await patient
    .getByText(instruction + " Corrected wording.", { exact: true })
    .waitFor();
  for (const p of [page, patient]) {
    for (const locale of ["en", "ar"]) {
      await p
        .getByRole("button", {
          name: locale === "en" ? "English" : "العربية",
          exact: true,
        })
        .click();
      assert.equal(
        await p.locator("html").getAttribute("dir"),
        locale === "ar" ? "rtl" : "ltr",
      );
      for (const width of [1440, 834, 390]) {
        await p.setViewportSize({ width, height: 1000 });
        assert.ok(
          await p.evaluate(
            () =>
              globalThis.document.documentElement.scrollWidth <=
              globalThis.innerWidth + 1,
          ),
          `follow-up overflow ${locale} ${width}`,
        );
      }
      if (p === patient)
        await p.screenshot({
          path: `docs/ui-screenshots/follow-up/live-${locale}-patient-mobile.png`,
          fullPage: true,
        });
      else if (locale === "ar")
        await p.locator(".follow-up-intent").screenshot({
          path: "docs/ui-screenshots/follow-up/live-ar-clinician-mobile.png",
        });
    }
    await p.getByRole("button", { name: "English", exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // A real privacy restriction removes the complete root, all links and counts.
  await f.intents.execute("PRIVACY", f.actors.clinician, {
    consultationId,
    intentId: row.id,
    versionIds: [(await versionRows())[2].id],
    reason: "Synthetic wrong-patient suppression proof",
    operationKey: randomUUID(),
  });
  await patient
    .getByRole("button", {
      name: "Refresh follow-up instructions",
      exact: true,
    })
    .click();
  await patient
    .getByText("No released follow-up instructions", { exact: true })
    .waitFor();
  assert.ok(!(await patient.locator("body").innerText()).includes(instruction));
  await button("Refresh follow-up instructions").click();
  await section
    .getByText("No visible follow-up drafts or released instructions", {
      exact: true,
    })
    .waitFor();
  assert.equal(await button("Correct released follow-up").count(), 0);
  for (const p of [page, patient]) {
    const storage = await p.evaluate(() =>
      JSON.stringify({
        ...globalThis.localStorage,
        ...globalThis.sessionStorage,
      }),
    );
    assert.ok(!storage.includes(instruction));
    assert.ok(!storage.includes(consultationId));
  }
  assert.ok(posts.every((x) => !x.headers["idempotency-key"]));
  assert.deepEqual(await legacy(), before, "no EH-012 or CareAction writes");
  assert.deepEqual(errors, []);
  await context.close();
  page.off("request", collect);
  console.log(
    "PASS real Slice6 UI: draft hidden from patient; explicit release; lost committed response/exact retry once; desired zone window; current linked booking/cancellation; reasoned released correction and preserved predecessor; EN/AR/RTL desktop/tablet/mobile; whole-root privacy suppression; no browser clinical storage; no EH-012/CareAction bridge.",
  );
}
