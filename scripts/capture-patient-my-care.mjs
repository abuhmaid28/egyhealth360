/** Actual built-frontend + original-reference evidence. No production API or DB mutations. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import {
  testPatientMyCare,
  myCareDemoState,
} from "./support/ui-my-care-browser.mjs";

const root = process.cwd(),
  output = resolve(root, "docs/ui-reference/evidence");
const origin = process.env.MY_CARE_ORIGIN ?? "http://127.0.0.1:3222";
const app = process.env.MY_CARE_ORIGIN
  ? null
  : spawn(
      process.execPath,
      [
        "apps/web/node_modules/next/dist/bin/next",
        "start",
        "apps/web",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3222",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
let logs = "",
  browser;
app?.stdout.on("data", (d) => {
  logs += d;
});
app?.stderr.on("data", (d) => {
  logs += d;
});
const types = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const reference = createServer(async (req, res) => {
  try {
    const file = resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(root + "/")) throw Error("Outside repository");
    res.setHeader(
      "Content-Type",
      types[extname(file)] ?? "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end("Unavailable");
  }
});
try {
  await mkdir(output, { recursive: true });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Startup only. */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, logs);
  await new Promise((r) => reference.listen(0, "127.0.0.1", r));
  const staticOrigin = `http://127.0.0.1:${reference.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const browserReport = await testPatientMyCare(browser, origin, output);
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: "reduce",
  });
  await page.goto(
    staticOrigin + "/docs/ui-reference/reference/patient-my-care-reference.svg",
  );
  await page.screenshot({ path: resolve(output, "reference-board.png") });
  await page.screenshot({
    path: resolve(output, "reference-desktop-window.png"),
    clip: { x: 56, y: 120, width: 1110, height: 800 },
  });
  await page.screenshot({
    path: resolve(output, "reference-mobile-window.png"),
    clip: { x: 1218, y: 128, width: 314, height: 674 },
  });
  const measurements = [],
    contrast = [];
  for (const locale of ["en", "ar"]) {
    const p = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      reducedMotion: "reduce",
    });
    await p.addInitScript(
      ({ locale, state }) => {
        globalThis.localStorage.setItem("eh360-locale", locale);
        globalThis.localStorage.setItem(
          "eh360-ui-demo-v1",
          JSON.stringify(state),
        );
      },
      { locale, state: myCareDemoState() },
    );
    await p.goto(origin + "/patient");
    await p
      .locator('[data-appointment-anchor] a[href$="demo-my-care-visit"]')
      .waitFor();
    await p.evaluate(() => globalThis.document.fonts.ready);
    measurements.push(
      await p.evaluate((locale) => {
        const root = globalThis.document.querySelector("[data-my-care]"),
          anchor = globalThis.document.querySelector(
            "[data-appointment-anchor]",
          ),
          header = root.querySelector("header"),
          main = root.querySelector("main"),
          style = globalThis.getComputedStyle(anchor);
        return {
          locale,
          viewport: {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight,
          },
          headerHeight: header.getBoundingClientRect().height,
          pagePadding: globalThis.getComputedStyle(main).paddingInlineStart,
          anchorRadius: style.borderRadius,
          anchorWidth: anchor.getBoundingClientRect().width,
          anchorHeight: anchor.getBoundingClientRect().height,
          anchorBackground: style.backgroundImage,
          bodyFamily: globalThis.getComputedStyle(root).fontFamily,
          loadedFonts: [...globalThis.document.fonts]
            .filter((f) => f.status === "loaded")
            .map((f) => f.family),
        };
      }, locale),
    );
    const pairs = await p.evaluate(() => {
      const result = new Map();
      for (const el of globalThis.document.querySelectorAll(
        "[data-my-care] *",
      )) {
        const r = el.getBoundingClientRect(),
          s = globalThis.getComputedStyle(el);
        if (
          !r.width ||
          !r.height ||
          s.visibility === "hidden" ||
          s.clipPath !== "none"
        )
          continue;
        const text = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent)
          .join("")
          .trim();
        if (!text) continue;
        let node = el,
          bg = "",
          method = "solid surface";
        while (node) {
          const style = globalThis.getComputedStyle(node);
          if (style.backgroundImage !== "none") {
            bg = "rgb(11, 110, 127)";
            method = "worst appointment gradient endpoint";
            break;
          }
          if (
            !["rgba(0, 0, 0, 0)", "transparent"].includes(style.backgroundColor)
          ) {
            bg = style.backgroundColor;
            break;
          }
          node = node.parentElement;
        }
        const key = s.color + "/" + bg;
        if (!result.has(key))
          result.set(key, {
            foreground: s.color,
            background: bg,
            method,
            example: text.slice(0, 70),
          });
      }
      return [...result.values()];
    });
    const luminance = (c) =>
      c
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((x) => x / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    for (const pair of pairs) {
      const [low, high] = [
        luminance(pair.foreground),
        luminance(pair.background),
      ].sort((a, b) => a - b);
      contrast.push({
        locale,
        ...pair,
        ratio: Math.round(((high + 0.05) / (low + 0.05)) * 100) / 100,
      });
    }
    await p.setViewportSize({ width: 1110, height: 800 });
    await p.screenshot({
      path: resolve(output, `patient-my-care-matched-desktop-${locale}.png`),
    });
    await p.setViewportSize({ width: 314, height: 674 });
    await p.screenshot({
      path: resolve(output, `patient-my-care-matched-mobile-${locale}.png`),
    });
    await p.close();
  }
  assert.ok(
    contrast.every((p) => p.ratio >= 4.5),
    JSON.stringify(contrast.filter((p) => p.ratio < 4.5)),
  );
  await writeFile(
    resolve(output, "patient-my-care-visual.json"),
    JSON.stringify(
      {
        base: "04311ba44336f164ca13c8ced310a64d957f2ed3",
        browser: await browser.version(),
        measurements,
        contrast,
        browserScreens: browserReport.screens,
        reference:
          "Original SVG rasterized without source edits. Matched window captures exclude board/device chrome; responsive written spec still governs.",
        limits:
          "Chromium Linux only; sampled text roles, not WCAG certification or independent visual approval.",
      },
      null,
      2,
    ) + "\n",
  );
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Patient My Care — implementation review</title><style>body{margin:0;background:#f7f9fc;color:#0f172a;font:14px/1.6 system-ui}header,main{padding:28px 40px}h1{font-size:28px}h2{font-size:20px}p{max-width:950px}img{width:100%;border:1px solid #e2e8f0;display:block}section{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}article{min-width:0}.mobile img{max-width:390px;margin:auto}a{color:#0b6e7f}@media(max-width:800px){section{grid-template-columns:1fr}header,main{padding:20px}}</style><header><h1>Patient — My Care / implementation review</h1><p>Owner reference + actual built frontend. Accepted IA, data, 24-hour time, type/accessibility and touch-size constraints take precedence over illustrative content. No pixel-perfect parity claim. Review all recorded discrepancies before approval.</p><a href="../PATIENT_MY_CARE_IMPLEMENTATION.md">Scope, validation and discrepancy register</a></header><main><h2>Original supplied board — 1600 × 1000</h2><img src="reference-board.png" alt="Supplied owner SVG board"><h2>Matched reference-window captures</h2><section><article><h3>Reference desktop window / 1110 × 800</h3><img src="reference-desktop-window.png" alt="Reference desktop"></article><article><h3>Implementation / 1110 × 800</h3><img src="patient-my-care-matched-desktop-en.png" alt="Implementation matched desktop"></article></section><h2>Required desktop views / 1600 × 1000</h2><section><article><h3>English</h3><img src="patient-my-care-desktop-en.png" alt="English desktop"></article><article><h3>Arabic RTL</h3><img src="patient-my-care-desktop-ar.png" alt="Arabic desktop"></article></section><h2>Required mobile views / 390 × 844</h2><section class="mobile"><article><h3>English</h3><img src="patient-my-care-mobile-en.png" alt="English mobile"></article><article><h3>Arabic RTL</h3><img src="patient-my-care-mobile-ar.png" alt="Arabic mobile"></article></section><p>Additional 314px reference-window, 200% text, focus, loading/empty/error/source-verification and controlled Live captures are in the adjacent files. Full-page reading exports move sticky navigation to the footer; matched viewport images retain actual navigation.</p></main></html>`;
  await writeFile(resolve(output, "patient-my-care-review.html"), html);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(
    staticOrigin + "/docs/ui-reference/evidence/patient-my-care-review.html",
    { waitUntil: "networkidle" },
  );
  await page.screenshot({
    path: resolve(output, "patient-my-care-review.png"),
    fullPage: true,
  });
  console.log(
    `PASS: original reference, matched windows, typography/geometry and ${contrast.length} sampled text roles (minimum ${Math.min(...contrast.map((p) => p.ratio))}:1).`,
  );
} finally {
  await browser?.close();
  if (app) app.kill("SIGTERM");
  await new Promise((r) => reference.close(r));
}
