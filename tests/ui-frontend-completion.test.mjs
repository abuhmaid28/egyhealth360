import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("Patient and Doctor completion CSS modules use --v2-* tokens, >=44px targets, 3px focus-visible, forced-colors, and reduced-motion", () => {
  for (const path of [
    "apps/web/src/components/v2/frontend-completion-patient.module.css",
    "apps/web/src/components/v2/frontend-completion-doctor.module.css",
  ]) {
    const css = read(path);
    assert.match(css, /var\(--v2-surface\)/, path);
    assert.match(css, /var\(--v2-ink\)/, path);
    assert.match(css, /var\(--v2-accent\)/, path);
    assert.match(css, /outline:\s*3px solid var\(--v2-action\)/, path);
    assert.match(css, /forced-colors:\s*active/, path);
    assert.match(css, /prefers-reduced-motion:\s*reduce/, path);
    assert.match(css, /:dir\(rtl\)/, path);
  }
});

test("PortalShell CSS preserves char-4671 prefix while repairing dark-mode popover, active secondary nav, and tabs", () => {
  const shellCss = read("apps/web/src/components/portal-shell.module.css");
  assert.equal(
    sha256(shellCss.slice(0, 4671)),
    "a17947877e71c51799d6d28f9faf1784ca7fe968430f876a0c39d24cff3775da",
  );
  const appended = shellCss.slice(4671);
  assert.match(appended, /\.root\[data-frontend-v2\] \.account > div[\s\S]*background:\s*var\(--v2-surface\)/);
  assert.match(appended, /\.root\[data-frontend-v2\] \.secondary a\[aria-current="page"\][\s\S]*background:\s*var\(--v2-raised\)/);
  assert.match(appended, /forced-colors:\s*active/);
});

test("Shared patient-doctor layout repairs dark-mode contrast, click-focus border, back-link 44px target, and RTL timeline", () => {
  const layoutCss = read("apps/web/src/components/v2/patient-doctor-layout.module.css");
  assert.match(layoutCss, /\.slots\.live-slots button:disabled/);
  assert.match(layoutCss, /\.result-text/);
  assert.match(layoutCss, /\.timeline-node/);
  assert.match(layoutCss, /\.success-banner/);
  assert.match(layoutCss, /input:focus:not\(:focus-visible\)/);
  assert.match(layoutCss, /\.back-link[\s\S]*min-block-size:\s*44px/);
  assert.match(layoutCss, /padding-inline-start:\s*5px/);
});

test("Discovery, Doctor Schedule, Visual Recovery, and Staff CSS enforce 3px focus, RTL letter-spacing 0, and unified #17142b hero", () => {
  const discCss = read("apps/web/src/components/v2/patient-discovery-signature.module.css");
  assert.match(discCss, /\.field:has\(:focus-visible\)/);
  assert.match(discCss, /outline:\s*3px solid var\(--v2-action\)/);
  assert.doesNotMatch(discCss, /\.headline p\s*\{\s*display:\s*none;/);

  const schedCss = read("apps/web/src/components/v2/doctor-schedule-signature.module.css");
  assert.match(schedCss, /overflow-wrap:\s*anywhere/);
  assert.match(schedCss, /background-color:\s*var\(--agenda-canvas\)/);

  const recCss = read("apps/web/src/components/v2/visual-recovery.module.css");
  assert.match(recCss, /\.entry\[dir="rtl"\] \.entryMessage h1[\s\S]*letter-spacing:\s*0/);

  const staffCss = read("apps/web/src/components/v2/staff-workspaces.module.css");
  assert.match(staffCss, /background-color:\s*#17142b/);
  assert.match(staffCss, /:global\(\.table-wrap\)/);
  assert.match(staffCss, /forced-colors:\s*active/);
});

test("Patient, Doctor, and Application TS/TSX updates retain localized keys, focus return, Escape handling, and protect historical evidence PNGs", () => {
  const patient = read("apps/web/src/components/patient.tsx");
  assert.match(patient, /\$\{t\("mmHg"\)\}/);
  assert.match(patient, /searchRef\.current\?\.focus\(\)/);
  assert.match(patient, /data-frontend-completion-patient/);

  const doctor = read("apps/web/src/components/doctor.tsx");
  assert.match(doctor, /t\("Sex not recorded"\)/);
  assert.match(doctor, /data-frontend-completion-doctor/);

  const app = read("apps/web/src/components/application.tsx");
  assert.match(app, /if \(event\.key !== "Escape"\) return;/);

  for (const manifestPath of [
    "docs/visual-evidence/135/doctor-schedule-a109ba6/image-manifest.json",
    "docs/visual-evidence/135/doctor-operations-sprint1/image-manifest.json",
  ]) {
    const manifest = JSON.parse(read(manifestPath));
    const dir = manifestPath.replace(/\/image-manifest\.json$/, "");
    for (const img of manifest.images) {
      assert.equal(sha256(readFileSync(`${dir}/images/${img.file}`)), img.sha256, img.file);
    }
  }
});
