import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fgHex, bgHex) {
  const l1 = luminance(hexToRgb(fgHex));
  const l2 = luminance(hexToRgb(bgHex));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function extractTokens(block) {
  const map = {};
  for (const m of block.matchAll(/(--eh-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

test("Foundation dark and light token palettes satisfy WCAG AA contrast across all foreground/background/focus/semantic pairs", () => {
  const css = readFileSync("apps/web/src/components/v2/foundation/foundation.module.css", "utf8");
  const darkBlock = css.split('.scope[data-foundation-theme="light"]')[0];
  const lightBlock = css.split('.scope[data-foundation-theme="light"]')[1] ?? "";
  const dark = extractTokens(darkBlock);
  const light = { ...dark, ...extractTokens(lightBlock) };

  const requiredPairs = [
    ["--eh-ink-primary", "--eh-bg-canvas", 7.0],
    ["--eh-ink-primary", "--eh-bg-surface", 7.0],
    ["--eh-ink-primary", "--eh-bg-raised", 7.0],
    ["--eh-ink-secondary", "--eh-bg-surface", 7.0],
    ["--eh-ink-muted", "--eh-bg-surface", 4.5],
    ["--eh-ink-muted", "--eh-bg-raised", 4.5],
    ["--eh-ink-accent", "--eh-bg-surface", 4.5],
    ["--eh-action-ink", "--eh-action-bg", 4.5],
    ["--eh-action-ink", "--eh-action-bg-hover", 4.5],
    ["--eh-accent-ink", "--eh-accent-fill", 4.5],
    ["--eh-success-ink", "--eh-success-bg", 4.5],
    ["--eh-warning-ink", "--eh-warning-bg", 4.5],
    ["--eh-danger-ink", "--eh-danger-bg", 4.5],
    ["--eh-info-ink", "--eh-info-bg", 4.5],
    ["--eh-focus-ring", "--eh-bg-surface", 3.0],
    ["--eh-border-strong", "--eh-bg-surface", 3.0],
  ];

  for (const [name, palette] of [
    ["dark", dark],
    ["light", light],
  ]) {
    for (const [fg, bg, minRatio] of requiredPairs) {
      const ratio = contrastRatio(palette[fg], palette[bg]);
      assert.ok(
        ratio >= minRatio,
        `${name} pair ${fg} (${palette[fg]}) on ${bg} (${palette[bg]}) ratio=${ratio.toFixed(2)} < ${minRatio}`,
      );
    }
  }

  // Negative canary proves low-contrast token pairs fail our contrast math
  assert.ok(contrastRatio("#282144", "#171329") < 2.0, "Negative canary must yield failing ratio");
});
