import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const EXPECTED_158_ASSETS = {
  "apps/web/public/visual-recovery/care-encounter.webp": "ee37f8f323246d28fc0b5b2c7b98fc2b98b12552bd8ff5ec49eba32449af5b9e",
  "apps/web/public/visual-recovery/mariam.webp": "8f4d04fe4e1f1f41c2a46be8faac78740dbda52121c06e47ceb09e79d4c03dfb",
  "apps/web/public/visual-recovery/omar.webp": "d596fe12701029829d574fd6d226f4bcefefa2fec19148c7850fbe933d09f156",
  "apps/web/public/visual-recovery/sara.webp": "ae1d2d5a8c19c1b7d6b2f5cf0f31387b92c3974f5deed2c6f279d2a8a6b27541",
  "apps/web/public/brand/dp02/compact-ar-dark.svg": "bbed526c401f31fefdd1b98d8ab62c64663f2b03b1b8b0ef24a5f81498ea922d",
  "apps/web/public/brand/dp02/compact-ar-light.svg": "d83098460ac57d43801314dd5a8f96fa40b72268ae27893b302a0661e8ca89ff",
  "apps/web/public/brand/dp02/compact-en-dark.svg": "6ad7f9b61b1a43308e16e8d0a6a4bf80c389bac29d46d292eef938af8e2120c3",
  "apps/web/public/brand/dp02/compact-en-light.svg": "e49f02c9e4a7619ca8265d9d01e8e8a3b52176ec4654658b72e2cac6bf60b887",
  "apps/web/public/brand/dp02/primary-ar-dark.svg": "f96e38a2a6e1e7273edd57b8e98005f28b0894efa03ffba41ef2c0394a5196da",
  "apps/web/public/brand/dp02/primary-ar-light.svg": "76d14637666b2d9aadbdc211223454c3f216bff38927c11577ed4d77abce4fa4",
  "apps/web/public/brand/dp02/primary-en-dark.svg": "eaa33073140aff82d87d34e134157671f7f8d38ac625618a26b69978641bddd5",
  "apps/web/public/brand/dp02/primary-en-light.svg": "f6935c1441d2e68092109425d31f707621f6ec33b405d6ceb00fc0876f53b54e",
};

test("v2/foundation excludes unapproved public/v2-foundation binaries and preserves all #158 assets byte-exact", () => {
  assert.equal(
    existsSync("apps/web/public/v2-foundation"),
    false,
    "Un-cleared private assets must never be placed in public/v2-foundation",
  );

  const registrySource = readFileSync(
    "apps/web/src/components/v2/foundation/asset-registry.ts",
    "utf8",
  );
  assert.ok(registrySource.includes("EXCLUDED_PUBLIC_AP05_PENDING"));
  assert.ok(registrySource.includes("PREVIEW_ATTESTED_REUSED"));
  assert.ok(!registrySource.includes("http://") && !registrySource.includes("https://"));

  const foundationFiles = readdirSync("apps/web/src/components/v2/foundation");
  for (const file of foundationFiles) {
    const content = readFileSync(join("apps/web/src/components/v2/foundation", file), "utf8");
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/(^|[}\s]):root\b/m.test(stripped), `${file} must not leak :root tokens`);
    assert.ok(!content.includes("localStorage"), `${file} must not write storage directly`);
    assert.ok(!content.includes("/api/v1/"), `${file} must not call clinical API endpoints`);
  }

  for (const [assetPath, expectedSha] of Object.entries(EXPECTED_158_ASSETS)) {
    assert.ok(existsSync(assetPath), `Missing #158 asset ${assetPath}`);
    assert.equal(sha256(readFileSync(assetPath)), expectedSha, `Hash mismatch on ${assetPath}`);
  }
});

test("apps/web/app/v2-foundation/[...slug]/route.ts and [[...path]]/page.tsx return 404 / notFound()", () => {
  const routeSource = readFileSync("apps/web/app/v2-foundation/[...slug]/route.ts", "utf8");
  assert.ok(routeSource.includes("status: 404"));
  const catchAll = readFileSync("apps/web/app/[[...path]]/page.tsx", "utf8");
  assert.ok(catchAll.includes('first === "v2-foundation"'));
});
