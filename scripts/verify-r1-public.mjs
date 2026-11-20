/** Read-only public access/security verification against the explicitly isolated R1 targets. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
const web = "https://eh360-r1-6fbd247-review.vercel.app";
const api =
  "https://eh360-r1-api-6fbd247-a0vhq6thv-abuhmaid2810gmailcoms-projects.vercel.app";
const output = resolve("docs/r1-repair-evidence");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const report = {
  testedAt: new Date().toISOString(),
  context: "New anonymous browser context, no storageState or supplied cookies",
  requests: [],
  security: [],
  errors: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
try {
  for (const [base, path, expected] of [
    [web, "/", 200],
    [web, "/login", 200],
    [web, "/patient", 200],
    ...[web, api].flatMap((base) => [
      [base, "/api/v1/health", 200],
      ...[
        "/auth/me",
        "/me/bookings",
        "/me/schedule",
        "/me/summaries",
        "/patients/00000000-0000-4000-8000-000000000001/profile",
        "/consultations/00000000-0000-4000-8000-000000000001/documents",
      ].map((path) => [base, "/api/v1" + path, 401]),
    ]),
  ]) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), expected, path);
    assert.equal(new URL(page.url()).origin, base);
    if (!path.startsWith("/api/"))
      await page
        .getByRole("button", { name: "Sign in with live account" })
        .waitFor();
    const appLogin = await page
      .getByRole("button", { name: "Sign in with live account" })
      .count();
    if (!path.startsWith("/api/")) assert.equal(appLogin, 1);
    report.requests.push({
      base,
      path,
      status: response.status(),
      finalUrl: page.url(),
      appLogin: !!appLogin,
    });
    if (path === "/login")
      await page.screenshot({
        path: resolve(output, "public-login.png"),
        fullPage: true,
      });
  }
  await page.goto(web + "/login");
  for (const [label, origin, loginHeader, expected] of [
    ["wrong Origin", "https://untrusted.example.invalid", true, 403],
    ["missing login verification header", web, false, 403],
    ["invalid synthetic credentials", web, true, 401],
  ]) {
    const response = await context.request.post(web + "/api/v1/auth/login", {
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(loginHeader ? { "X-EH-Login": "1" } : {}),
      },
      data: {
        email: "r1-anonymous-negative@example.invalid",
        password: "invalid-negative-test-only",
      },
    });
    assert.equal(response.status(), expected, label);
    report.security.push({ label, status: response.status() });
  }
  const logout = await context.request.post(web + "/api/v1/auth/logout", {
    headers: { Origin: web },
    data: {},
  });
  assert.ok([401, 403].includes(logout.status()));
  report.security.push({
    label: "anonymous logout without CSRF/session",
    status: logout.status(),
  });
  const env = await context.request.get(web + "/.env");
  const body = await env.text();
  assert.ok(
    !/DATABASE_URL=|postgres(?:ql)?:\/\/|AUTH_SESSION_SECRET=|VERCEL_TOKEN=/.test(
      body,
    ),
  );
  report.security.push({
    label: "/.env catches app route; no dotenv payload",
    status: env.status(),
  });
  const cookies = await context.cookies();
  assert.ok(!cookies.some((c) => /vercel|session/i.test(c.name)));
  report.security.push({
    label: "no Vercel SSO or app-session cookies issued anonymously",
    passed: true,
  });
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    resolve(output, "public-access.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
console.log(
  `PASS: ${report.requests.length} anonymous route/API probes; ${report.security.length} security checks.`,
);
