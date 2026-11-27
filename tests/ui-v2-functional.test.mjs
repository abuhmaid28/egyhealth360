import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const output = mkdtempSync(join(tmpdir(), "eh-v2-fn-"));
execFileSync(process.execPath, [
  resolve("node_modules/typescript/bin/tsc"),
  "--outDir",
  output,
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--target",
  "ES2023",
  "--lib",
  "ES2023,DOM",
  "--strict",
  "--skipLibCheck",
  "apps/web/src/components/v2/demo-v2/format.ts",
  "apps/web/src/components/v2/foundation/asset-registry.ts",
]);
after(() => rmSync(output, { recursive: true, force: true }));

const require = createRequire(import.meta.url);
const { toLatinDigits, formatFullDate, formatDayMonthTile, formatTimeDisplay } = require(
  join(output, "components/v2/demo-v2/format.js"),
);
const { isPermittedPublicAssetPath, verifyPublicAssetPath } = require(
  join(output, "components/v2/foundation/asset-registry.js"),
);

test("format helpers normalize Arabic-Indic digits to Latin 0-9, enforce full weekday/month dates, and apply patient 12h / staff 24h", () => {
  assert.equal(toLatinDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  const enDate = formatFullDate("2026-10-28T09:30:00Z", "en");
  assert.match(enDate, /Wednesday, 28 October 2026/);
  const arDate = formatFullDate("2026-10-28T09:30:00Z", "ar");
  assert.match(arDate, /الأربعاء، 28 أكتوبر 2026/);
  assert.deepEqual(formatDayMonthTile("2026-10-28", "en"), { day: "28", month: "Oct" });
  assert.equal(formatTimeDisplay("14:30", "en", "patient"), "02:30 PM");
  assert.equal(formatTimeDisplay("14:30", "ar", "patient"), "02:30 م");
  assert.equal(formatTimeDisplay("14:30", "en", "professional"), "14:30");
  assert.equal(formatTimeDisplay("14:30", "ar", "professional"), "14:30");
});

test("asset registry admits only #158 approved public assets and throws on private/unapproved paths", () => {
  assert.equal(isPermittedPublicAssetPath("/brand/dp02/primary-en-dark.svg"), true);
  assert.equal(isPermittedPublicAssetPath("/visual-recovery/mariam.webp"), true);
  assert.equal(isPermittedPublicAssetPath("/v2-foundation/hero.webp"), false);
  assert.equal(isPermittedPublicAssetPath("https://example.com/x.png"), false);
  assert.throws(() => verifyPublicAssetPath("/v2-foundation/art.webp"), /Disallowed/);
});
