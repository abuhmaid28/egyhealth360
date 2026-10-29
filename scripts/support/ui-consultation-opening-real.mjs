/** Actual Browser → Next → Nest → isolated PostgreSQL, never HTTP mocks.
 * Reuses the approved past-booking timing fixture from Booking proof, with all
 * database guards restored before any UI action. DB owns actual opening time. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
export async function testRealConsultation(page, f, booked, networkFault) {
  const origin = "http://localhost:3000";
  const t = (key) => dictionary.ar[key] ?? key;
  const button = (key) =>
    page.getByRole("button", { name: t(key), exact: true });
  const requests = [];
  let currentRole = "clinician";
  page.on("request", (r) =>
    requests.push({
      path: new URL(r.url()).pathname,
      actor: currentRole,
      method: r.method(),
      body: r.postData(),
      headers: r.headers(),
    }),
  );
  const dbCounts = async () =>
    Object.fromEntries(
      await Promise.all(
        [
          "consultations",
          "clinical_encounters",
          "clinician_patient_assignments",
          "relationship_requests",
          "booking_operations",
          "booking_events",
          "booking_attendance",
          "audit_logs",
        ].map(async (table) => [
          table,
          (await f.pool.query(`SELECT count(*)::int n FROM public.${table}`))
            .rows[0].n,
        ]),
      ),
    );
  const browserCommand = (path, method, body) =>
    page.evaluate(
      async ({ path, method, body }) => {
        const auth = await fetch("/api/v1/auth/me", { cache: "no-store" });
        const session = await auth.json();
        const response = await fetch("/api/v1" + path, {
          method,
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.data.csrfToken,
          },
          body: JSON.stringify(body),
        });
        return { status: response.status, json: await response.json() };
      },
      { path, method, body },
    );
  const switchAccount = async (name) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await button("Sign out").click();
    await page
      .getByLabel(t("Email address"), { exact: true })
      .fill(f.users[name].email);
    await page.getByLabel(t("Password"), { exact: true }).fill(f.password);
    currentRole = name;
    await button("Sign in with live account").click();
    await page.getByText(t("Live API"), { exact: true }).waitFor();
  };
  const openingPath = `/me/bookings/${booked.id}/consultation`;
  await page.goto(origin + "/doctor/schedule");
  await page.locator(`a[href="/doctor/appointments/${booked.id}"]`).click();
  await button("Start consultation").waitFor();
  assert.equal(await button("Start consultation").isEnabled(), true);
  const baseline = await dbCounts();
  assert.equal(baseline.clinician_patient_assignments, 0);
  assert.equal(baseline.consultations, 0);
  await button("Start consultation").click();
  await button("Confirm opening").click();
  await page.locator(".form-error[role=alert]").waitFor();
  assert.equal((await dbCounts()).consultations, 0);
  assert.equal((await dbCounts()).clinician_patient_assignments, 0);
  assert.equal((await dbCounts()).relationship_requests, 0);
  assert.equal(await page.getByRole("textbox").count(), 0);
  assert.equal(
    await page.evaluate(() => globalThis.localStorage.getItem("eh360-ui-mode")),
    "live",
  );
  const denied = requests.find(
    (r) => r.path.endsWith("/consultation") && r.method === "POST",
  );
  assert.deepEqual(Object.keys(JSON.parse(denied.body)), ["operationKey"]);
  await button("Go back").click();
  // Explicit test setup through the EXISTING patient-authorize + clinician-accept
  // HTTP workflow. No direct assignPatient, fake consent or frontend auto-grant.
  await switchAccount("patient");
  const authorized = await browserCommand("/me/relationship-requests", "POST", {
    providerId: f.provider.publicId,
    operationKey: randomUUID(),
  });
  assert.equal(authorized.status, 200);
  const requestId = authorized.json.data.request.id;
  assert.equal(
    (await dbCounts()).clinician_patient_assignments,
    0,
    "pending authorization is not a grant",
  );
  await switchAccount("clinician");
  const accepted = await browserCommand(
    `/me/relationship-requests/${requestId}/accept`,
    "PUT",
    {},
  );
  assert.equal(accepted.status, 200);
  assert.equal((await dbCounts()).clinician_patient_assignments, 1);
  await page.goto(origin + "/doctor/appointments/" + booked.id);
  await button("Start consultation").click();
  const before = await dbCounts();
  const beforeTime = (await f.pool.query("SELECT clock_timestamp() now"))
    .rows[0].now;
  networkFault.dropNextOpeningSuccess = true;
  const postStart = requests.length;
  await button("Confirm opening").click();
  await page.locator(".form-error[role=alert]").waitFor();
  assert.equal(networkFault.dropped, 1, "a real committed response was lost");
  assert.equal(
    (await dbCounts()).consultations,
    1,
    "commit preceded the lost response",
  );
  await button("Retry unchanged opening").click();
  await page
    .getByText(t("Consultation opened"), { exact: true })
    .first()
    .waitFor();
  const posts = requests
    .slice(postStart)
    .filter((r) => r.path.endsWith("/consultation") && r.method === "POST");
  assert.equal(posts.length, 2, "no automatic service retry");
  assert.equal(
    posts[0].body,
    posts[1].body,
    "exact unchanged UI retry key/body",
  );
  assert.deepEqual(Object.keys(JSON.parse(posts[0].body)), ["operationKey"]);
  assert.equal(posts[0].headers["idempotency-key"], undefined);
  const c = (
    await f.pool.query(
      "SELECT * FROM public.consultations WHERE booking_id=$1",
      [booked.id],
    )
  ).rows[0];
  const e = (
    await f.pool.query("SELECT * FROM public.clinical_encounters WHERE id=$1", [
      c.encounter_id,
    ])
  ).rows[0];
  const afterTime = (await f.pool.query("SELECT clock_timestamp() now")).rows[0]
    .now;
  assert.equal(e.purpose, "GENERAL_CONSULTATION");
  assert.equal(c.opened_at.toISOString(), e.occurred_at.toISOString());
  assert.equal(c.opened_at.toISOString(), e.created_at.toISOString());
  assert.ok(
    c.opened_at >= beforeTime && c.opened_at <= afterTime,
    "DB-owned current actual time, not scheduled/request time",
  );
  assert.equal(c.patient_id, f.users.patient.profileId);
  assert.equal(c.booked_clinician_id, c.treating_clinician_id);
  assert.equal(c.opened_by_user_id, f.users.clinician.id);
  assert.equal(c.assignment_id, accepted.json.data.request.assignmentId);
  const detail = (await f.bookings.detail(f.actors.clinician, booked.id)).data;
  assert.equal(detail.state, "IN_CONSULTATION");
  assert.equal(detail.transitions.at(-1).command, "OPEN");
  assert.equal(await button("Record attendance").isDisabled(), true);
  assert.equal(await button("Correct attendance").isDisabled(), true);
  const after = await dbCounts();
  assert.equal(after.consultations, before.consultations + 1);
  assert.equal(after.clinical_encounters, before.clinical_encounters + 1);
  assert.equal(after.booking_events, before.booking_events + 1);
  assert.equal(after.booking_operations, before.booking_operations + 1);
  assert.equal(
    after.booking_attendance,
    before.booking_attendance,
    "existing attendance retained",
  );
  assert.equal(
    after.clinician_patient_assignments,
    before.clinician_patient_assignments,
  );
  assert.equal(after.relationship_requests, before.relationship_requests);
  const replay = await browserCommand(
    openingPath,
    "POST",
    JSON.parse(posts[0].body),
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.json.data.openedAt, c.opened_at.toISOString());
  assert.equal(replay.json.data.encounterId, e.id);
  assert.equal(replay.json.data.bookingState, "IN_CONSULTATION");
  assert.deepEqual(await dbCounts(), after, "exact replay creates nothing");
  await page
    .getByRole("link", { name: t("View opening details"), exact: true })
    .click();
  await page.getByText(t("Opening confirmed"), { exact: true }).waitFor();
  const visible = await page.locator("body").innerText();
  for (const value of [
    f.users.patient.id,
    f.users.patient.profileId,
    f.users.clinician.id,
    f.users.clinician.profileId,
    c.assignment_id,
    f.membership.id,
    f.publication.id,
    f.clinicOrg.id,
  ])
    assert.ok(!visible.includes(value), "no internal identity in presentation");
  assert.equal(
    await page.getByRole("textbox").count(),
    0,
    "metadata-only shell",
  );
  for (const width of [1440, 834, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth + 1,
      ),
    );
  }
  // Actual Nest rejects the clinician's contradictory no-show on an opened visit.
  assert.equal(
    (
      await browserCommand(`/me/bookings/${booked.id}/attendance`, "PUT", {
        operationKey: randomUUID(),
        expectedVersion: detail.version,
        observation: "NO_SHOW",
      })
    ).status,
    409,
  );
  await switchAccount("patient");
  await page.goto(origin + "/patient/appointments/" + booked.id);
  await button("Cancel booking").waitFor();
  assert.equal(await button("Cancel booking").isDisabled(), true);
  assert.equal(await button("Reschedule booking").isDisabled(), true);
  assert.equal(
    (await browserCommand(openingPath, "POST", { operationKey: randomUUID() }))
      .status,
    404,
  );
  const replacement = await f.publish(300);
  for (const action of ["cancel", "reschedule"])
    assert.equal(
      (
        await browserCommand(`/me/bookings/${booked.id}/${action}`, "PUT", {
          operationKey: randomUUID(),
          expectedVersion: detail.version,
          ...(action === "reschedule" ? { slotId: replacement.id } : {}),
        })
      ).status,
      409,
    );
  const other = await f.otherClinician();
  assert.ok(other.user);
  await switchAccount("otherClinician");
  assert.equal(
    (await browserCommand(openingPath, "POST", { operationKey: randomUUID() }))
      .status,
    404,
  );
  await switchAccount("admin");
  assert.equal(
    (await browserCommand(openingPath, "POST", { operationKey: randomUUID() }))
      .status,
    404,
  );
  assert.deepEqual(
    await f.pool
      .query("SELECT * FROM public.consultations WHERE booking_id=$1", [
        booked.id,
      ])
      .then((r) => r.rows),
    [c],
  );
  assert.equal((await dbCounts()).consultations, 1);
  assert.equal((await dbCounts()).clinical_encounters, 1);
  const documentTables = (
    await f.pool.query(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND (tablename LIKE '%consultation%document%' OR tablename LIKE '%prescription%' OR tablename LIKE '%lab_order%')",
    )
  ).rows;
  assert.deepEqual(
    documentTables,
    [],
    "Slice 4 has no clinical document/prescription/lab source",
  );
  // Patient self-service retains existing own BP/HTN/profile APIs. The clinician
  // opening flow must not browse clinical records or future artifact APIs.
  assert.deepEqual(
    requests
      .filter(
        (r) =>
          ["clinician", "otherClinician"].includes(r.actor) &&
          r.path.startsWith("/api/v1/") &&
          /\/patients\/|\/documents|prescription|laboratory/.test(r.path),
      )
      .map((r) => r.path),
    [],
    "no clinician clinical payload read/write",
  );
  assert.equal(
    await page.evaluate(() =>
      globalThis.localStorage.getItem("eh360-ui-demo-v1"),
    ),
    null,
  );
  console.log(
    "PASS real Consultation Opening Browser→Next→Nest→PostgreSQL: exact schedule; booking-only 404; existing bilateral HTTP authorization/acceptance; persisted Consultation + GENERAL_CONSULTATION; DB actual time; IN_CONSULTATION; cancel/reschedule/no-show blocked; lost committed response + exact UI retry/replay with no duplicate; unrelated clinician/patient/ADMIN denied; no document, internal identity, clinical/Demo payload or implicit assignment.",
  );
}
