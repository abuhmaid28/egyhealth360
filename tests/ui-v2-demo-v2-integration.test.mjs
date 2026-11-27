import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("DemoV2Router fails closed unless both api.mode and session.mode are demo", () => {
  const router = readFileSync("apps/web/src/components/v2/demo-v2/DemoV2Router.tsx", "utf8");
  assert.ok(router.includes('if (api.mode !== "demo" || session.mode !== "demo")'));
  assert.ok(router.includes("return null;"));
  assert.ok(router.includes('CLINICIAN: "/doctor"'));
});

test("Five-portal Demo V2 components enforce audience time format, unchecked Option 1A+2A, terminal pharmacy lock, and honest Lab boundary", () => {
  const format = readFileSync("apps/web/src/components/v2/demo-v2/format.ts", "utf8");
  assert.ok(format.includes("toLatinDigits"));
  assert.ok(format.includes('audience === "professional"'));
  assert.ok(format.includes('"AM"') && format.includes('"PM"'));

  const patient = readFileSync("apps/web/src/components/v2/demo-v2/PatientDemoV2.tsx", "utf8");
  assert.ok(patient.includes("useState(false)"));
  assert.ok(patient.includes('data-consent-prototype="nonoperative"'));
  assert.ok(patient.includes('formatTimeDisplay(slot.startAt, locale, "patient")'));
  assert.ok(!/optimal|safe\s+range/i.test(patient));

  const doctor = readFileSync("apps/web/src/components/v2/demo-v2/DoctorDemoV2.tsx", "utf8");
  assert.ok(doctor.includes('formatTimeDisplay(a.slot.startAt, locale, "professional")'));
  assert.ok(doctor.includes("api.publishSlot"));
  assert.ok(doctor.includes("api.withdrawSlot"));
  assert.ok(doctor.includes("api.release"));

  const pharmacy = readFileSync("apps/web/src/components/v2/demo-v2/PharmacyDemoV2.tsx", "utf8");
  assert.ok(pharmacy.includes('rxState === "Dispensed"'));
  assert.ok(pharmacy.includes('data-pharmacy-terminal="true"'));
  assert.ok(pharmacy.includes('item.status') === false || pharmacy.includes("item.fulfillment.prescription"));

  const lab = readFileSync("apps/web/src/components/v2/demo-v2/LaboratoryDemoV2.tsx", "utf8");
  assert.ok(lab.includes("FUTURE · CONCEPT · NOT LIVE"));
  assert.ok(!lab.includes("api.release") && !lab.includes("api.updateFulfillment"));

  const admin = readFileSync("apps/web/src/components/v2/demo-v2/AdminDemoV2.tsx", "utf8");
  assert.ok(admin.includes("api.operations()"));
  assert.ok(!admin.includes("api.record") && !admin.includes("api.consultation"));
});
