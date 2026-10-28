/** Opt-in synthetic PostgreSQL/browser proof using existing approved Slice 2 test fixtures. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { chromium } from "playwright";
import { isolatedAvailability } from "../tests/support/availability.mjs";
assert.ok(
  process.env.DATABASE_URL,
  "A disposable PostgreSQL DATABASE_URL is required.",
);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.EH_UI_CHROMIUM
      ? { executablePath: process.env.EH_UI_CHROMIUM }
      : {}),
  });
  await isolatedAvailability(async (f) => {
    const backend = new URL((await f.request()).response.url).origin;
    const proxy = createServer((incoming, outgoing) => {
      const upstream = request(
        backend + incoming.url,
        { method: incoming.method, headers: incoming.headers },
        (r) => {
          outgoing.writeHead(r.statusCode, r.headers);
          r.pipe(outgoing);
        },
      );
      upstream.on("error", () => {
        outgoing.writeHead(503);
        outgoing.end();
      });
      incoming.pipe(upstream);
    });
    await new Promise((resolve, reject) => {
      proxy.once("error", reject);
      proxy.listen(3001, "127.0.0.1", resolve);
    });
    const web = spawn(
      process.execPath,
      [
        "apps/web/node_modules/next/dist/bin/next",
        "start",
        "apps/web",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3000",
      ],
      {
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: "ignore",
      },
    );
    const webExit = new Promise((resolve) => web.once("exit", resolve));
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch("http://localhost:3000")).ok) {
            ready = true;
            break;
          }
        } catch {
          /* Startup. */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready, "Built web server must start on port 3000.");
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        timezoneId: "Asia/Tokyo",
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const login = async (key) => {
        await page.goto("http://localhost:3000");
        await page.getByLabel("Email address").fill(f.users[key].email);
        await page.getByLabel("Password", { exact: true }).fill(f.password);
        await page
          .getByRole("button", { name: "Sign in with live account" })
          .click();
        await page.getByText("Live API", { exact: true }).waitFor();
      };
      await login("clinician");
      await page.goto("http://localhost:3000/doctor/availability");
      await page.getByText("No published intervals", { exact: true }).waitFor();
      const input = f.input();
      await page
        .getByLabel("Publication clinic")
        .selectOption(f.clinic.publicId);
      await page.getByLabel("Starts at").fill(input.startAt);
      await page.getByLabel("Ends at").fill(input.endAt);
      await page
        .getByRole("button", { name: "Publish interval", exact: true })
        .click();
      await page.getByText("Published", { exact: true }).waitFor();
      assert.equal((await f.request(f.path)).json.meta.total, 1);
      const overlap = f.input(15);
      await page.getByLabel("Starts at").fill(overlap.startAt);
      await page.getByLabel("Ends at").fill(overlap.endAt);
      await page
        .getByRole("button", { name: "Publish interval", exact: true })
        .click();
      await page.locator(".form-error[role=alert]").waitFor();
      assert.ok(
        (await page.locator(".form-error[role=alert]").innerText()).includes(
          "conflicts",
        ),
      );
      assert.equal((await f.request(f.path)).json.meta.total, 1);
      const adjacent = f.input(30);
      await page.getByLabel("Starts at").fill(adjacent.startAt);
      await page.getByLabel("Ends at").fill(adjacent.endAt);
      await page
        .getByRole("button", { name: "Publish interval", exact: true })
        .click();
      await page
        .getByText("Availability published.", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Withdraw interval", exact: true })
        .first()
        .click();
      await page.getByText("Withdrawn", { exact: true }).waitFor();
      assert.equal((await f.request(f.path)).json.meta.total, 1);
      await page.getByRole("button", { name: "Sign out" }).click();
      await page
        .getByRole("button", { name: "Explore the patient demo" })
        .waitFor();
      await login("patient");
      await page.goto(
        `http://localhost:3000/patient/doctors/${f.provider.publicId}`,
      );
      await page.locator(".live-slots button").first().waitFor();
      assert.ok(
        (await page.locator(".live-slots").innerText()).includes("UTC"),
      );
      const before = (await f.availability.history(f.actors.clinician, {}))
        .data;
      await page.locator(".live-slots button").first().click();
      await page.getByRole("button", { name: "Review demo booking" }).click();
      await page.getByRole("button", { name: "Confirm demo booking" }).click();
      await page
        .getByText("Demo appointment saved — live slot not reserved", {
          exact: true,
        })
        .waitFor();
      assert.equal((await f.request(f.path)).json.meta.total, 1);
      assert.deepEqual(
        (await f.availability.history(f.actors.clinician, {})).data,
        before,
      );
      assert.equal(
        (
          await f.pool.query(
            "SELECT count(*)::int n FROM clinician_patient_assignments",
          )
        ).rows[0].n,
        0,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        "PASS: real Nest/PostgreSQL/browser availability list, finite publish, overlap error, terminal withdrawal, public clinic timezone, explicit demo handoff; publication history unchanged by demo booking, zero clinical assignments.",
      );
    } finally {
      web.kill("SIGTERM");
      await webExit;
      proxy.closeAllConnections();
      await new Promise((resolve) => proxy.close(resolve));
    }
  });
} finally {
  await browser?.close();
}
