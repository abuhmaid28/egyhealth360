import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
export async function testLiveAvailability(browser, origin, shots) {
  const provider = "22222222-2222-4222-8222-222222222222",
    clinic = "33333333-3333-4333-8333-333333333333";
  const clinicName =
    "Connected Care Clinic with a deliberately long public display name for responsive verification";
  const publicProvider = {
    id: provider,
    displayName: "Dr. Public Availability Presentation Specialist",
    specialty: { key: "general", displayName: "General medicine" },
    clinics: [
      {
        id: clinic,
        displayName: clinicName,
        city: "City",
        address: "Public address",
      },
    ],
  };
  const slot = {
    id: "11111111-1111-4111-8111-111111111111",
    providerId: provider,
    clinicId: clinic,
    startAt: "2026-11-02T23:30:00-05:00",
    endAt: "2026-11-03T00:00:00-05:00",
    timeZone: "America/New_York",
    bookable: true,
  };
  let state = "populated",
    role = "PATIENT",
    signedIn = false,
    history = [],
    publishCount = 0,
    withdrawCount = 0;
  const calls = [];
  let releaseLoading;
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    timezoneId: "Asia/Tokyo",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snap = async (name) => {
    if (shots) {
      await mkdir(shots, { recursive: true });
      await page.screenshot({
        path: resolve(shots, `${name}.png`),
        fullPage: true,
      });
    }
  };
  await page.route("**/api/v1/**", async (route) => {
    const r = route.request(),
      url = new URL(r.url()),
      path = url.pathname;
    calls.push({ path, method: r.method(), body: r.postData() });
    if (path.endsWith("/auth/login")) signedIn = true;
    if (path.endsWith("/auth/logout")) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith("/auth/login") || path.endsWith("/auth/me"))
      return route.fulfill(
        signedIn
          ? {
              json: {
                data: {
                  user: { email: "live-identity@example.invalid", role },
                  csrfToken: "availability-csrf",
                  session: { expiresAt: "2099-01-01T00:00:00Z" },
                },
              },
            }
          : { status: 401, json: { error: { code: "AUTH_UNAUTHENTICATED" } } },
      );
    if (path.endsWith("/directory/clinics"))
      return route.fulfill({ json: { data: publicProvider.clinics } });
    if (path.endsWith("/directory/providers"))
      return route.fulfill({ json: { data: [publicProvider] } });
    if (path.endsWith(`/directory/providers/${provider}`))
      return route.fulfill({ json: { data: publicProvider } });
    if (path.endsWith(`/providers/${provider}/availability`)) {
      if (state === "loading")
        await new Promise((resolve) => {
          releaseLoading = resolve;
        });
      if (state === "failure")
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "AVAILABILITY_UNAVAILABLE",
              message: "PRIVATE SQL CANARY",
            },
          },
        });
      const second = url.searchParams.get("page") === "2";
      return route.fulfill({
        json: {
          data:
            state === "empty"
              ? []
              : second
                ? [{ ...slot, id: "second-page" }]
                : [slot, { ...slot, id: "non-bookable", bookable: false }],
          meta: {
            page: second ? 2 : 1,
            pageSize: 20,
            total: state === "empty" ? 0 : 21,
          },
        },
      });
    }
    if (path === "/api/v1/me/availability" && r.method() === "GET")
      return route.fulfill({
        json: {
          data: history,
          meta: { page: 1, pageSize: 20, total: history.length },
        },
      });
    if (path === "/api/v1/me/availability" && r.method() === "POST") {
      publishCount++;
      const value = r.postDataJSON();
      assert.deepEqual(
        Object.keys(value).sort(),
        ["clinicId", "startAt", "endAt", "operationKey"].sort(),
      );
      assert.equal(r.headers()["x-csrf-token"], "availability-csrf");
      if (publishCount === 1)
        return route.fulfill({
          status: 409,
          json: { error: { message: "PRIVATE SQL CANARY" } },
        });
      history = [
        {
          ...slot,
          bookable: undefined,
          state: "PUBLISHED",
          version: 1,
          publishedAt: "2026-10-28T12:00:00Z",
          withdrawnAt: null,
        },
      ];
      return route.fulfill({ json: { data: history[0] } });
    }
    if (path.endsWith("/withdraw") && r.method() === "PUT") {
      withdrawCount++;
      const value = r.postDataJSON();
      assert.deepEqual(
        Object.keys(value).sort(),
        ["operationKey", "expectedVersion"].sort(),
      );
      assert.equal(value.expectedVersion, 1);
      assert.equal(r.headers()["x-csrf-token"], "availability-csrf");
      if (withdrawCount === 1)
        return route.fulfill({
          status: 503,
          json: { error: { message: "PRIVATE SQL CANARY" } },
        });
      history = [
        {
          ...history[0],
          state: "WITHDRAWN",
          version: 2,
          withdrawnAt: "2026-10-28T13:00:00Z",
        },
      ];
      return route.fulfill({ json: { data: history[0] } });
    }
    return route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE" } },
    });
  });
  const login = async () => {
    await page.goto(origin);
    await page
      .getByLabel("Email address")
      .fill("live-identity@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-only");
    await page
      .getByRole("button", { name: "Sign in with live account" })
      .click();
    await page.getByText("Live API", { exact: true }).waitFor();
  };
  await login();
  await page.goto(`${origin}/patient/doctors/${provider}`);
  await page.locator(".live-slots button").first().waitFor();
  assert.ok(
    (await page.locator(".live-slots").innerText()).includes("2 Nov 2026"),
  );
  assert.ok(
    (await page.locator(".live-slots").innerText()).includes("23:30–00:00"),
  );
  assert.equal(await page.locator(".live-slots button:disabled").count(), 1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 · 21 intervals").waitFor();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await page.getByText("Page 1 · 21 intervals").waitFor();
  await page.getByLabel("Availability clinic").selectOption(clinic);
  await page.locator(".live-slots button").first().waitFor();
  await snap("16-live-availability-desktop");
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth <=
          globalThis.window.innerWidth,
      ),
      `Availability overflow at ${width}`,
    );
    await snap(
      width === 390
        ? "17-live-availability-mobile"
        : "18-live-availability-tablet",
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  state = "empty";
  await page.reload();
  await page.getByText("No available times", { exact: true }).waitFor();
  assert.equal(await page.locator(".live-slots button").count(), 0);
  state = "failure";
  await page.reload();
  await page.getByText("We couldn’t load this view", { exact: true }).waitFor();
  assert.equal(await page.locator(".live-slots button").count(), 0);
  assert.ok(!(await page.locator("#main").innerText()).includes("PRIVATE SQL"));
  state = "loading";
  const navigation = page.reload();
  await page
    .getByRole("status", { name: "Loading", exact: true })
    .first()
    .waitFor();
  while (!releaseLoading) await new Promise((r) => setTimeout(r, 10));
  state = "populated";
  releaseLoading();
  await navigation;
  await page.locator(".live-slots button").first().waitFor();
  await page.locator(".live-slots button").first().click();
  await page.getByRole("button", { name: "Review demo booking" }).click();
  await page
    .getByRole("dialog")
    .getByText("Live availability → Demo booking", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Confirm demo booking" }).click();
  await page
    .getByText("Demo appointment saved — live slot not reserved", {
      exact: true,
    })
    .waitFor();
  assert.equal(await page.getByLabel("Demo workspace").inputValue(), "PATIENT");
  await page.getByLabel("Demo workspace").selectOption("CLINICIAN");
  await page.getByRole("link", { name: "Open patient" }).click();
  await page
    .getByText("Live-slot preview · synthetic clinical continuation", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("link", { name: "Open consultation workspace" }).click();
  await page
    .getByLabel("Presenting complaint / problems")
    .fill("Synthetic continuation");
  await page
    .getByLabel("Clinician-entered diagnosis / assessment")
    .fill("Synthetic review");
  await page
    .getByLabel("Released patient instructions / summary")
    .fill("Synthetic continuity after public availability preview.");
  await page.getByRole("button", { name: "Review & release summary" }).click();
  await page.getByRole("button", { name: "Release demo summary" }).click();
  await page
    .getByText("Summary released to the demo patient", { exact: true })
    .waitFor();
  assert.ok(
    !calls.some((c) =>
      /booking|consultation|prescription|laboratory/.test(c.path),
    ),
  );
  // A separate live clinician session never inherits the demo role switch or synthetic clinical identity.
  await page.getByRole("button", { name: "Sign out" }).click();
  role = "CLINICIAN";
  await login();
  await page.goto(origin + "/doctor/availability");
  await page.getByText("No published intervals", { exact: true }).waitFor();
  await page.getByLabel("Publication clinic").selectOption(clinic);
  await page.getByLabel("Starts at").fill(slot.startAt);
  await page.getByLabel("Ends at").fill(slot.endAt);
  await page
    .getByRole("button", { name: "Publish interval", exact: true })
    .click();
  await page.locator(".form-error[role=alert]").waitFor();
  assert.ok(
    !(await page.locator(".form-error[role=alert]").innerText()).includes(
      "PRIVATE",
    ),
  );
  await page
    .getByRole("button", { name: "Publish interval", exact: true })
    .click();
  await page.getByText("Published", { exact: true }).waitFor();
  const publishes = calls.filter(
    (c) => c.method === "POST" && c.path.endsWith("/me/availability"),
  );
  assert.equal(
    JSON.parse(publishes[0].body).operationKey,
    JSON.parse(publishes[1].body).operationKey,
  );
  await snap("19-live-clinician-availability");
  await page
    .getByRole("button", { name: "Withdraw interval", exact: true })
    .click();
  await page.locator(".form-error[role=alert]").waitFor();
  await page
    .getByRole("button", { name: "Withdraw interval", exact: true })
    .click();
  await page.getByText("Withdrawn", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Withdraw interval", exact: true })
      .count(),
    0,
  );
  const withdrawals = calls.filter((c) => c.method === "PUT");
  assert.equal(
    JSON.parse(withdrawals[0].body).operationKey,
    JSON.parse(withdrawals[1].body).operationKey,
  );
  assert.deepEqual(errors, []);
  await page.close();
  console.log(
    "PASS: live availability browser contracts (success/empty/error/loading/non-bookable, pagination, clinic timezone under Tokyo browser, responsive long names), explicit demo handoff and consultation continuity, clinician publish/withdraw and stable retry keys.",
  );
}
