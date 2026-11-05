/** Controlled HTTP proof for client mode restoration; real cookie/database proof remains in test-ui-availability-real. */
import assert from "node:assert/strict";
export async function testR1Mode(browser, origin) {
  for (const storage of ["normal", "denied"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    if (storage === "denied")
      await page.addInitScript(() => {
        Object.defineProperty(globalThis, "localStorage", {
          get() {
            throw new globalThis.DOMException(
              "Storage denied",
              "SecurityError",
            );
          },
        });
      });
    let authenticated = false;
    const calls = [];
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      calls.push(path);
      if (path.endsWith("/auth/login")) authenticated = true;
      if (path.endsWith("/auth/logout")) {
        authenticated = false;
        return route.fulfill({ status: 204 });
      }
      if (
        path.endsWith("/auth/login") ||
        (path.endsWith("/auth/me") && authenticated)
      )
        return route.fulfill({
          json: {
            data: {
              user: {
                role: "PATIENT",
                email: "synthetic-mode-test@example.invalid",
              },
              csrfToken: "controlled-mode-test-only",
            },
          },
        });
      return route.fulfill({
        status: path.endsWith("/auth/me") ? 401 : 503,
        json: { error: { message: "CONTROLLED_PRIVATE_ERROR_CANARY" } },
      });
    });
    // Missing storage preference must resolve real auth, and preserve an authorized deep link after login.
    await page.goto(origin + "/patient/appointments");
    await page
      .getByLabel("Email address")
      .fill("synthetic-mode-test@example.invalid");
    await page
      .getByLabel("Password", { exact: true })
      .fill("controlled-test-only");
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .click();
    await page.locator('[data-session-mode="live"]').waitFor();
    assert.equal(new URL(page.url()).pathname, "/patient/appointments");
    await page.locator(".error-panel").waitFor();
    for (const path of [
      "/patient",
      "/patient/discover",
      "/patient/appointments",
      "/patient/summaries",
      "/patient/follow-up",
      "/patient/history",
      "/patient/medications",
      "/patient/laboratory",
      "/patient/settings",
    ]) {
      await page.goto(origin + path);
      await page.locator('[data-session-mode="live"]').waitFor();
      assert.equal(await page.locator("[data-demo-utility]").count(), 0);
      assert.equal(await page.getByLabel("Demo workspace").count(), 0);
      assert.ok(
        !(await page.locator("#main").innerText()).includes(
          "CONTROLLED_PRIVATE_ERROR_CANARY",
        ),
      );
    }
    await page.reload();
    await page.locator('[data-session-mode="live"]').waitFor();
    await page.goto(origin + "/doctor/schedule");
    await page
      .getByRole("heading", { name: "Choose your workspace" })
      .waitFor();
    assert.equal(
      await page.locator('[data-portal-shell="PATIENT"]').count(),
      1,
    );
    await page.getByRole("link", { name: "Open workspace" }).click();
    await page.locator("[data-my-care]").waitFor();
    const languages = page.getByRole("button", {
      name: "العربية",
      exact: true,
    });
    await languages.click();
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .waitFor();
    await page.goBack();
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .waitFor();
    assert.equal(await page.locator("[data-portal-shell]").count(), 0);
    await page.reload();
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .waitFor();
    assert.equal(await page.locator("[data-portal-shell]").count(), 0);
    assert.ok(calls.includes("/api/v1/auth/me"));
    await page.close();
  }
  // Controlled HTTP presentation proof for the three operational Live portals.
  // This does not replace authenticated hosted or database acceptance.
  for (const [role, routes] of [
    ["PHARMACY_STAFF", ["/pharmacy", "/pharmacy/settings"]],
    ["LAB_STAFF", ["/laboratory", "/laboratory/settings"]],
    ["ADMIN", ["/admin", "/admin/organizations", "/admin/users", "/admin/directory", "/admin/scheduling", "/admin/settings"]],
  ]) {
    const page = await browser.newPage();
    const calls = [], errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      calls.push(path);
      return route.fulfill(path.endsWith("/auth/me") ? {
        json: { data: { user: { role, email: "operational-ui@example.invalid" }, csrfToken: "controlled-ui-only" } },
      } : { status: 503, json: { error: { message: "PRIVATE_OPERATIONAL_CANARY" } } });
    });
    for (const path of routes) {
      await page.goto(origin + path);
      await page.locator(`[data-portal-shell="${role}"]`).waitFor();
      for (const locale of ["en", "ar"]) {
        await page.getByRole("button", { name: locale === "ar" ? "العربية" : "English", exact: true }).click();
        assert.equal(await page.locator("html").getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
        assert.equal(await page.locator("[data-demo-utility]").count(), 0);
        await page.locator('[data-session-mode="live"]').waitFor();
        if (!path.endsWith("/settings"))
          await page.getByRole("heading", { name: locale === "ar" ? "الإمكانية دي مش متاحة في الواجهة الحالية" : "Unavailable in the current Live interface", exact: true }).waitFor();
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), `${role} ${path} ${locale} overflow at ${width}`);
        }
        assert.ok(!(await page.locator("#main").innerText()).includes("PRIVATE_OPERATIONAL_CANARY"));
      }
    }
    assert.ok(calls.every((path) => /\/(auth\/me|directory\/(providers|clinics))$/.test(path)), `${role}: no clinical payload requests`);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("PASS controlled operational Live portals: all Pharmacy/Laboratory/Admin destinations, truthful limits, no Demo or clinical reads, EN/AR RTL/LTR, 1440/390/320px.");
  console.log(
    "PASS R1 mode: configured Live default, storage denial, failed Live reads, authenticated deep link, reload, wrong-role boundary, EN/AR, logout; no unintended Demo transition.",
  );
}
