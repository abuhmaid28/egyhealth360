import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("V2DemoShell gates on dual Demo api/session, syncs live profile name, and preserves role-scoped navigation", () => {
  const shellSource = readFileSync("apps/web/src/components/v2/shell/V2DemoShell.tsx", "utf8");
  assert.ok(shellSource.includes('api.mode === "demo" && session.mode === "demo"'));
  assert.ok(shellSource.includes("api\n        .profile()") || shellSource.includes("api.profile()"));
  assert.ok(shellSource.includes("profile?.displayName"));
  assert.ok(shellSource.includes('href="#main"'));
  assert.ok(shellSource.includes('variant="compact"'));
  assert.ok(shellSource.includes("data-workspace-switch"));
  assert.ok(shellSource.includes('aria-disabled="true"'));
  assert.ok(!shellSource.includes("/api/v1/"));
  assert.ok(!shellSource.includes("localStorage"));

  const portalShellSource = readFileSync("apps/web/src/components/portal-shell.tsx", "utf8");
  assert.ok(portalShellSource.includes('api.mode === "demo" && session.mode === "demo"'));
  assert.ok(portalShellSource.includes("DemoV2Router"));
});
