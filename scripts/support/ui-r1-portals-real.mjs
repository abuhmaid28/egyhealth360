import assert from "node:assert/strict";
import { r1Capture } from "./ui-r1-evidence.mjs";
/** Real authorized synthetic role accounts, actual Nest/Next/PostgreSQL; no response stubs. */
export async function testR1OperationalPortals(browser, f) {
  const origin = "http://localhost:3000";
  for (const [key, role, routes] of [
    ["pharmacy", "PHARMACY_STAFF", ["/pharmacy", "/pharmacy/settings"]],
    ["lab", "LAB_STAFF", ["/laboratory", "/laboratory/settings"]],
    [
      "admin",
      "ADMIN",
      [
        "/admin",
        "/admin/organizations",
        "/admin/users",
        "/admin/directory",
        "/admin/scheduling",
        "/admin/settings",
      ],
    ],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + routes[0]);
    await page.getByLabel("Email address").fill(f.users[key].email);
    await page.getByLabel("Password", { exact: true }).fill(f.password);
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .click();
    await page.locator(`[data-portal-shell="${role}"]`).waitFor();
    for (const path of routes) {
      await page.goto(origin + path);
      await page.locator(`[data-portal-shell="${role}"]`).waitFor();
      await page.locator("#main .loading").first().waitFor({ state: "hidden" });
      assert.equal(await page.getByLabel("Demo workspace").count(), 0);
      if (!path.endsWith("/settings"))
        await page
          .getByText("Unavailable in the current Live interface", {
            exact: true,
          })
          .waitFor();
      await r1Capture(
        page,
        "real-" + path.slice(1).replaceAll("/", "-") + "-en",
      );
    }
    const denied = await page.evaluate(async (id) => {
      const r = await fetch(`/api/v1/patients/${id}/profile`, {
        cache: "no-store",
      });
      return { status: r.status, body: await r.text() };
    }, f.users.patient.profileId);
    assert.ok([403, 404].includes(denied.status));
    assert.ok(!denied.body.includes("displayName"));
    await page.goto(origin + "/patient");
    await page
      .getByRole("heading", { name: "Choose your workspace" })
      .waitFor();
    assert.equal(await page.locator("[data-my-care]").count(), 0);
    await page.getByRole("link", { name: "Open workspace" }).click();
    await page.getByRole("button", { name: "العربية", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.innerWidth,
      ),
    );
    await r1Capture(page, "real-" + key + "-ar-mobile");
    await page.getByRole("button", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .waitFor();
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS real R1 operational portals: Pharmacy/Laboratory/Admin authorized login, all destinations, truthful Live limits, EN/AR/mobile, patient payload denial, wrong-role UI boundary, logout.",
  );
}
