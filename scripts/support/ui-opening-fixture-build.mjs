/** Stage A only: exercise pending integration through an explicit controlled build,
 * then restore the normal disabled artifact before real-API smoke can run. */
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { testConsultationOpening } from "./ui-consultation-opening-browser.mjs";
const run = promisify(execFile);
export async function testOpeningFixtureBuild(shots) {
  const normalEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  delete normalEnv.NEXT_PUBLIC_EH_OPENING_FIXTURE;
  const build = (env) =>
    run(
      process.execPath,
      ["apps/web/node_modules/next/dist/bin/next", "build", "apps/web"],
      { env, maxBuffer: 5 * 1024 * 1024 },
    );
  let server, browser;
  let logs = "";
  try {
    await build({
      ...normalEnv,
      NEXT_PUBLIC_EH_OPENING_FIXTURE: "stage-a-controlled-fixture",
    });
    server = spawn(
      process.execPath,
      [
        "apps/web/node_modules/next/dist/bin/next",
        "start",
        "apps/web",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3102",
      ],
      { env: normalEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (data) => {
      logs += String(data);
    });
    server.stderr.on("data", (data) => {
      logs += String(data);
    });
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try {
        if ((await fetch("http://127.0.0.1:3102")).ok) {
          ready = true;
          break;
        }
      } catch {
        /* bounded server startup */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(ready, logs);
    browser = await chromium.launch({
      headless: true,
      ...(process.env.EH_UI_CHROMIUM
        ? { executablePath: process.env.EH_UI_CHROMIUM }
        : {}),
    });
    await testConsultationOpening(
      browser,
      "http://127.0.0.1:3102",
      shots,
      true,
    );
  } finally {
    await browser?.close();
    if (server && server.exitCode === null) {
      const exited = new Promise((r) => server.once("exit", r));
      server.kill("SIGTERM");
      await exited;
    }
    await build(normalEnv);
  }
}
