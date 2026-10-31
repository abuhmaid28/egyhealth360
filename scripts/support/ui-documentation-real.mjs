import { testRealFollowUps } from "./ui-follow-up-intents-real.mjs";
/** Synthetic actual Browser → Next → Nest → PostgreSQL proof. No route mocks.
 * Reuses the approved past-booking fixture with every DB guard restored. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { pastBooking } from "../../tests/support/bookings.mjs";

export async function testRealDocumentation(browser, page, f, fault) {
  const origin = "http://localhost:3000";
  // Start a distinct real visit after the inherited Opening proof has finished.
  const booked = await f.create(await f.publish(480));
  await pastBooking(f, booked, false);
  const login = async (p, who) => {
    await p.goto(origin);
    await p.getByRole("button", { name: "English", exact: true }).waitFor();
    // Existing proof leaves Arabic selected. Presentation preference only.
    if (await p.getByRole("button", { name: "English", exact: true }).count())
      await p.getByRole("button", { name: "English", exact: true }).click();
    const signout = p.getByRole("button", { name: "Sign out", exact: true });
    if (await signout.count()) await signout.click();
    await p
      .getByLabel("Email address", { exact: true })
      .fill(f.users[who].email);
    await p.getByLabel("Password", { exact: true }).fill(f.password);
    await p
      .getByRole("button", { name: "Sign in with live account", exact: true })
      .click();
    await p.getByText("Live API", { exact: true }).waitFor();
  };
  await login(page, "clinician");
  await page.goto(`${origin}/doctor/appointments/${booked.id}`);
  await page
    .getByRole("button", { name: "Start consultation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm opening", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View opening details", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open clinical documentation", exact: true })
    .click();
  await page.getByLabel("Private note content", { exact: true }).waitFor();
  const c = (
    await f.pool.query(
      "SELECT * FROM public.consultations WHERE booking_id=$1",
      [booked.id],
    )
  ).rows[0];
  const base = `/api/v1/consultations/${c.id}/documents`;
  const b = (name, p = page) => p.getByRole("button", { name, exact: true });
  const docs = [];
  const collect = (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname.startsWith(base))
      docs.push({
        path: new URL(r.url()).pathname,
        body: r.postData(),
        headers: r.headers(),
      });
  };
  page.on("request", collect);
  const count = async () =>
    Object.fromEntries(
      await Promise.all(
        [
          "consultation_documents",
          "consultation_document_versions",
          "consultation_document_operations",
          "consultation_privacy_restrictions",
        ].map(async (t) => [
          t,
          (await f.pool.query(`SELECT count(*)::int n FROM public.${t}`))
            .rows[0].n,
        ]),
      ),
    );
  const write = async (buttonName, suffix = "", p = page) => {
    const response = p.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith(suffix || "/documents") &&
        r.request().method() === "POST",
    );
    await b(buttonName, p).click();
    assert.equal((await response).status(), 200);
    await p
      .locator(".documentation-feedback")
      .filter({ hasText: "Saved by the Live service" })
      .waitFor();
    await p.getByText("Saving…", { exact: true }).waitFor({ state: "hidden" });
  };
  const privateCanary = "SYNTHETIC_PRIVATE_LIVE_CANARY";
  await page
    .getByLabel("Complaint", { exact: true })
    .fill("Private complaint only");
  await page
    .getByLabel("Review state", { exact: true })
    .selectOption("UNKNOWN");
  await page
    .getByLabel("Private note content", { exact: true })
    .fill(privateCanary);
  await b("العربية").click();
  await b("English").click();
  assert.equal(
    await page.getByLabel("Private note content", { exact: true }).inputValue(),
    privateCanary,
    "locale changes preserve transient authoring",
  );
  await write("Save private note draft");
  await b("Sign private note").click();
  await write("Confirm private signing", "/sign");
  assert.equal(
    (
      await f.pool.query(
        "SELECT count(*)::int n FROM public.consultation_document_versions WHERE state='SIGNED'",
      )
    ).rows[0].n,
    1,
  );
  await page
    .getByLabel("Findings document", { exact: true })
    .selectOption("PATIENT_SUMMARY");
  assert.equal(
    await page.getByLabel("Complaint", { exact: true }).inputValue(),
    "",
    "no private findings copying",
  );
  assert.equal(
    await page.getByLabel("Review state", { exact: true }).inputValue(),
    "NOT_REVIEWED",
  );
  for (const state of [
    "NOT_REVIEWED",
    "UNKNOWN",
    "REVIEWED_NO_KNOWN",
    "REVIEWED_POSITIVE",
  ]) {
    if (state !== "NOT_REVIEWED")
      await b("Start a separate summary draft").click();
    await page
      .getByLabel("Findings document", { exact: true })
      .selectOption("PATIENT_SUMMARY");
    await page
      .getByLabel("Complaint", { exact: true })
      .fill("Shared human complaint");
    await b("Add problem").click();
    await page
      .getByLabel("Problem", { exact: true })
      .fill("Shared human problem");
    await b("Add diagnosis").click();
    await page
      .getByLabel("Diagnosis", { exact: true })
      .fill("Shared human diagnosis");
    await page.getByLabel("Review state", { exact: true }).selectOption(state);
    if (state === "REVIEWED_POSITIVE") {
      await b("Add allergy / intolerance item").click();
      await page
        .getByLabel("Substance or finding", { exact: true })
        .fill("Human allergy finding");
      await page
        .getByLabel("Reaction (optional)", { exact: true })
        .fill("Human reaction");
    }
    await page
      .getByLabel("Patient summary content", { exact: true })
      .fill("Synthetic summary " + state);
    await page
      .getByLabel("Patient instructions", { exact: true })
      .fill("Human patient instructions");
    await write("Save summary draft");
  }
  const rows = (
    await f.pool.query(
      "SELECT * FROM public.consultation_document_versions WHERE document_kind='PATIENT_SUMMARY' ORDER BY created_at",
    )
  ).rows;
  assert.deepEqual(
    rows.map((r) => r.allergy_state),
    ["NOT_REVIEWED", "UNKNOWN", "REVIEWED_NO_KNOWN", "REVIEWED_POSITIVE"],
  );
  assert.ok(rows.every((r) => r.state === "DRAFT"));
  const patientContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const patientPage = await patientContext.newPage();
  const patientBodies = [];
  patientPage.on("response", async (r) => {
    if (
      r.url().includes("/summaries") &&
      r.headers()["content-type"]?.includes("application/json")
    )
      patientBodies.push(await r.text().catch(() => ""));
  });
  await login(patientPage, "patient");
  await patientPage.goto(origin + "/patient/summaries");
  await patientPage
    .getByText("No visible released summaries", { exact: true })
    .waitFor();
  assert.ok(!patientBodies.join("").includes(privateCanary));
  await b("Review sign and release").click();
  const dialog = page.getByRole("dialog");
  assert.ok((await dialog.innerText()).includes("Shared human complaint"));
  assert.ok(!(await dialog.innerText()).includes(privateCanary));
  await mkdir("docs/ui-screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/ui-screenshots/55-en-live-documentation-release.png",
  });
  const before = await count();
  fault.dropDocumentSuffix = "/sign-release";
  await b("Confirm sign and release").click();
  await dialog.getByRole("alert").waitFor();
  assert.equal(fault.documentsDropped, 1);
  assert.equal(
    (await count()).consultation_document_versions,
    before.consultation_document_versions + 1,
  );
  await b("Retry unchanged signing").click();
  await dialog.waitFor({ state: "hidden" });
  const releasePosts = docs.filter((r) => r.path.endsWith("/sign-release"));
  assert.equal(releasePosts.length, 2, "no automatic mutation retry");
  assert.equal(
    releasePosts[0].body,
    releasePosts[1].body,
    "unchanged retry keeps exact operationKey/body",
  );
  assert.equal(
    (await count()).consultation_document_versions,
    before.consultation_document_versions + 1,
  );
  await b("Refresh visible documentation", patientPage).click();
  await patientPage
    .getByText("Synthetic summary REVIEWED_POSITIVE", { exact: true })
    .waitFor();
  const patientVisible = await patientPage.locator("body").innerText();
  assert.ok(!patientVisible.includes(privateCanary));
  assert.ok(!patientVisible.includes("Private complaint only"));
  assert.ok(patientVisible.includes("Human allergy finding"));
  assert.ok(!patientBodies.join("").includes(rows[0].id), "no draft lineage");
  for (const width of [1440, 834, 390]) {
    await patientPage.setViewportSize({ width, height: 1000 });
    assert.ok(
      await patientPage.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth + 1,
      ),
    );
  }
  await patientPage.screenshot({
    path: "docs/ui-screenshots/56-en-mobile-live-released-summary.png",
    fullPage: true,
  });
  await b("العربية", patientPage).click();
  await patientPage.screenshot({
    path: "docs/ui-screenshots/58-ar-mobile-live-released-summary.png",
    fullPage: true,
  });
  await b("English", patientPage).click();
  await b("العربية").click();
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
  await page.screenshot({
    path: "docs/ui-screenshots/57-ar-mobile-live-documentation.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await b("English").click();
  const amend = async (change, content) => {
    const entry = page
      .locator(".documentation-version")
      .filter({ hasText: "Synthetic summary REVIEWED_POSITIVE" })
      .last();
    await entry
      .getByRole("button", {
        name:
          change === "ADDENDUM"
            ? "Add signed addendum"
            : "Create signed correction",
        exact: true,
      })
      .click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("New signed content", { exact: true }).fill(content);
    await modal
      .getByLabel("Patient instructions", { exact: true })
      .fill("Human amended instructions");
    await modal
      .getByLabel("Reason for addendum or correction", { exact: true })
      .fill("Explicit human reason");
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname.endsWith(
          change === "ADDENDUM" ? "/addenda" : "/corrections",
        ),
    );
    await modal
      .getByRole("button", { name: "Confirm signed version", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await modal.waitFor({ state: "hidden" });
  };
  await amend("CORRECTION", "Human corrected summary");
  // The corrected current entry becomes the explicit addendum target.
  await page
    .locator(".documentation-version")
    .filter({ hasText: "Human corrected summary" })
    .getByRole("button", { name: "Add signed addendum", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("New signed content", { exact: true })
    .fill("Human supplemental summary");
  await page
    .getByRole("dialog")
    .getByLabel("Reason for addendum or correction", { exact: true })
    .fill("Explicit supplementary reason");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm signed version", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    (
      await f.pool.query(
        "SELECT count(*)::int n FROM public.consultation_document_versions WHERE kind IN ('CORRECT','ADDENDUM')",
      )
    ).rows[0].n,
    2,
  );
  assert.equal(
    (
      await f.pool.query(
        "SELECT content FROM public.consultation_document_versions WHERE id=$1",
        [rows.at(-1).id],
      )
    ).rows[0].content,
    "Synthetic summary REVIEWED_POSITIVE",
  );
  await b("Refresh visible documentation", patientPage).click();
  await patientPage
    .getByText("Human supplemental summary", { exact: true })
    .waitFor();
  // Another clinician must obtain their OWN bilateral active relationship.
  const browserCommand = async (p, path, method = "GET", body) =>
    p.evaluate(
      async ({ path, method, body }) => {
        const auth = await (
          await fetch("/api/v1/auth/me", { cache: "no-store" })
        ).json();
        const r = await fetch("/api/v1" + path, {
          method,
          cache: "no-store",
          headers: body
            ? {
                "Content-Type": "application/json",
                "X-CSRF-Token": auth.data.csrfToken,
              }
            : {},
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: r.status, json: await r.json() };
      },
      { path, method, body },
    );
  const otherProvider = (
    await f.pool.query(
      "SELECT public_id FROM public.clinician_directory WHERE clinician_user_id=$1",
      [f.users.otherClinician.id],
    )
  ).rows[0].public_id;
  const relation = await browserCommand(
    patientPage,
    "/me/relationship-requests",
    "POST",
    { providerId: otherProvider, operationKey: randomUUID() },
  );
  assert.equal(relation.status, 200);
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, "otherClinician");
  assert.equal(
    (
      await browserCommand(
        otherPage,
        `/patients/${f.users.patient.profileId}/summaries`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await browserCommand(
        otherPage,
        `/me/relationship-requests/${relation.json.data.request.id}/accept`,
        "PUT",
        {},
      )
    ).status,
    200,
  );
  await otherPage.goto(origin + "/doctor/summaries");
  await otherPage
    .getByLabel("Patient record locator", { exact: true })
    .fill(f.users.patient.profileId);
  await b("View released summaries", otherPage).click();
  await otherPage
    .getByText("Human supplemental summary", { exact: true })
    .waitFor();
  assert.ok(
    !(await otherPage.locator("body").innerText()).includes(privateCanary),
  );
  assert.equal(
    (await browserCommand(otherPage, `/consultations/${c.id}/documents`))
      .status,
    404,
  );
  const releasedRoot = (
    await f.pool.query(
      "SELECT id FROM public.consultation_documents WHERE kind='PATIENT_SUMMARY' ORDER BY created_at DESC LIMIT 1",
    )
  ).rows[0].id;
  assert.equal(
    (await browserCommand(patientPage, `/me/summaries/${releasedRoot}`)).status,
    200,
  );
  assert.equal(
    (
      await browserCommand(
        otherPage,
        `/patients/${f.users.patient.profileId}/summaries/${releasedRoot}`,
      )
    ).status,
    200,
  );
  await testRealFollowUps(browser, page, f, fault, c.id, login);
  await page
    .getByRole("button", {
      name: "Restrict wrong-patient document",
      exact: true,
    })
    .click();
  const restriction = page.getByRole("dialog");
  await restriction
    .getByLabel("Exact affected item / version", { exact: true })
    .selectOption(rows.at(-1).id);
  await restriction
    .getByLabel("Restriction reason", { exact: true })
    .fill("Synthetic wrong-patient concern");
  assert.equal(await b("Confirm wrong-patient restriction").isDisabled(), true);
  await restriction.getByRole("checkbox").check();
  fault.dropDocumentSuffix = "/privacy-restrictions";
  await b("Confirm wrong-patient restriction").click();
  await restriction.waitFor({ state: "hidden" });
  await page
    .getByText("Human supplemental summary", { exact: true })
    .waitFor({ state: "hidden" });
  assert.equal(fault.documentsDropped, 2);
  await b("Refresh visible documentation", patientPage).click();
  await patientPage
    .getByText("No visible released summaries", { exact: true })
    .waitFor();
  await b("Refresh visible documentation", otherPage).click();
  await otherPage
    .getByText("No visible released summaries", { exact: true })
    .waitFor();
  const replay = releasePosts[0];
  assert.equal(
    (
      await browserCommand(
        page,
        replay.path.slice("/api/v1".length),
        "POST",
        JSON.parse(replay.body),
      )
    ).status,
    404,
  );
  for (const p of [patientPage, otherPage]) {
    const visible = await p.locator("body").innerText();
    for (const hidden of [
      releasedRoot,
      rows.at(-1).id,
      "Human supplemental summary",
      "Human corrected summary",
      privateCanary,
    ])
      assert.ok(!visible.includes(hidden));
  }
  // Current-authority loss denies the author's next command and clears editor state.
  await f.pool.query(
    "UPDATE public.clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'",
    [f.users.clinician.profileId, f.users.patient.profileId],
  );
  await b("Start a separate private draft").click();
  await page
    .getByLabel("Private note content", { exact: true })
    .fill("Transient must clear on denial");
  await b("Save private note draft").click();
  await page
    .getByText(
      "Clinical documentation is unavailable for your current access. A current clinical relationship and clinician authority are required.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page.locator("#live-documentation").getByRole("textbox").count(),
    0,
  );
  // The independent follow-up scope also reauthorizes on its next command.
  const followUp = page.getByRole("region", {
    name: "Follow-up instructions",
    exact: true,
  });
  await followUp
    .getByLabel("Clinician instruction", { exact: true })
    .fill("Transient follow-up must clear on denial");
  await followUp
    .getByRole("button", { name: "Save follow-up draft", exact: true })
    .click();
  await followUp
    .getByText(
      "Follow-up instructions are unavailable for your current access. Refresh your session before continuing.",
      { exact: true },
    )
    .waitFor();
  assert.equal(await page.getByRole("textbox").count(), 0);
  // Session revoke is enforced on the next own-released read.
  await f.pool.query(
    "UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE user_id=$1 AND revoked_at IS NULL",
    [f.users.patient.id],
  );
  await b("Refresh visible documentation", patientPage).click();
  await patientPage
    .getByText("Your session has ended. Please sign in again.", { exact: true })
    .first()
    .waitFor();
  for (const p of [page, patientPage, otherPage])
    assert.ok(
      !(
        await p.evaluate(() =>
          JSON.stringify({
            ...globalThis.localStorage,
            ...globalThis.sessionStorage,
          }),
        )
      ).includes(privateCanary),
    );
  assert.ok(docs.every((r) => r.headers["idempotency-key"] === undefined));
  await patientContext.close();
  await otherContext.close();
  page.off("request", collect);
  console.log(
    "PASS real Slice5 Browser→Next→Nest→PostgreSQL: immutable draft/private signing; all four allergy states; explicit release; lost committed response and exact retry with no duplicate; own/current-related released reads; private boundary; correction/addendum; wrong-patient restriction masking/replay denial; current-authority and session denial; memory-only content; responsive presentation.",
  );
}
