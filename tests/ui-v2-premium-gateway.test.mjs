import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("V2EntryGateway exposes patient-primary CTA, four secondary role workspaces, DP02 mark, theme and locale switches", () => {
  const gateway = readFileSync("apps/web/src/components/v2/gateway/V2EntryGateway.tsx", "utf8");
  for (const role of ["PATIENT", "CLINICIAN", "PHARMACY_STAFF", "LAB_STAFF", "ADMIN"]) {
    assert.ok(gateway.includes(`"${role}"`), `Missing role trigger for ${role}`);
  }
  assert.ok(gateway.includes("FoundationBrandMark"));
  assert.ok(gateway.includes("LanguageSwitch"));
  assert.ok(gateway.includes("FrontendV2ThemeSwitch"));
  assert.ok(gateway.includes("FoundationHeroVisual"));
  assert.ok(gateway.includes('data-gateway-primary-cta="PATIENT"'));
  assert.ok(gateway.includes("FUTURE · NOT LIVE"));
});
