import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
/** Opt-in evidence contains synthetic rendered UI only; never cookies, request bodies or login forms. */
export function r1EvidencePath(legacy) {
  return process.env.UI_R1_EVIDENCE_DIR
    ? join(
        process.env.UI_R1_EVIDENCE_DIR,
        legacy.replace(/^docs\/ui-screenshots\//, ""),
      )
    : legacy;
}
export async function r1Capture(page, name) {
  if (!process.env.UI_R1_EVIDENCE_DIR) return;
  const path = join(process.env.UI_R1_EVIDENCE_DIR, name + ".png");
  await mkdir(dirname(path), { recursive: true });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path, fullPage: true });
  const report = join(process.env.UI_R1_EVIDENCE_DIR, "routes.json");
  let rows = [];
  try {
    rows = JSON.parse(await readFile(report, "utf8"));
  } catch {
    /* First capture. */
  }
  rows.push({
    name,
    pathname: new URL(page.url()).pathname,
    locale: await page.locator("html").getAttribute("lang"),
    viewport: page.viewportSize(),
    shell: await page
      .locator("[data-portal-shell]")
      .first()
      .getAttribute("data-portal-shell"),
    mode: await page
      .locator("[data-session-mode]")
      .first()
      .getAttribute("data-session-mode"),
    timestamp: new Date().toISOString(),
  });
  await writeFile(report, JSON.stringify(rows, null, 2));
}
