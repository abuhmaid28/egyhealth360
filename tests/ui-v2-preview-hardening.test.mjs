import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Preview hardening excludes unapproved routes, keeps Live form in liveConfigured mode, and ignores packaging secrets", () => {
  const ignore = readFileSync("apps/web/.vercelignore", "utf8");
  assert.ok(ignore.includes(".env.*"));
  assert.ok(ignore.includes("*.pem"));
  assert.ok(ignore.includes("*.key"));

  const appSource = readFileSync("apps/web/src/components/application.tsx", "utf8");
  assert.ok(appSource.includes("if (!liveConfigured) {\n    return <V2EntryGateway enter={enter} />;\n  }"));
  assert.ok(appSource.includes('api.mode === "live"'));

  const gatewaySource = readFileSync("apps/web/src/components/v2/gateway/V2EntryGateway.tsx", "utf8");
  assert.ok(!gatewaySource.includes('type="email"'));
  assert.ok(!gatewaySource.includes('type="password"'));
  assert.ok(gatewaySource.includes("This preview offers the browser-only demo. Live sign-in is unavailable until a backend is connected."));
  assert.ok(gatewaySource.includes("تتيح هذه المعاينة العرض التجريبي داخل المتصفح فقط. تسجيل الدخول المباشر غير متاح حتى يتم توصيل الخادم."));
});
