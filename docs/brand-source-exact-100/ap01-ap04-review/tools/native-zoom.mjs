/* global document, getComputedStyle, innerWidth, outerWidth, devicePixelRatio, visualViewport */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.EH_REVIEW_PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const base = `${process.env.EH_REVIEW_ORIGIN || 'http://127.0.0.1:8100'}/docs/brand-source-exact-100/ap01-ap04-review/`;
const cases = [];
for (const physicalWidth of [640, 1280]) {
  for (const zoom of [1, 2]) {
    const profile = await mkdtemp(`${tmpdir()}/eh100-native-zoom-`);
    await mkdir(`${profile}/Default`);
    // Chromium's actual profile page-zoom preference. This is NOT CSS zoom,
    // Emulation.setPageScaleFactor, pinch zoom, a resized screenshot or doubled text.
    // The default storage partition key is x (empty relative path).
    await writeFile(`${profile}/Default/Preferences`, JSON.stringify({ partition: { default_zoom_level: { x: Math.log(zoom) / Math.log(1.2) } } }));
    const context = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, viewport: null, args: ['--no-sandbox', `--window-size=${physicalWidth},960`] });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('requestfailed', r => errors.push(r.url()));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      for (const font of ['plex', 'noto']) for (const role of ['patient', 'doctor']) for (const lang of ['ar', 'en']) for (const theme of ['dark', 'light']) {
        await page.goto(`${base}?font=${font}&role=${role}&lang=${lang}&theme=${theme}`);
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.evaluate(() => ({ innerWidth, outerWidth, dpr: devicePixelRatio, visualScale: visualViewport.scale, documentWidth: document.documentElement.scrollWidth, h1ComputedSize: getComputedStyle(document.querySelector('h1')).fontSize, cssZoom: getComputedStyle(document.documentElement).zoom }));
        assert.equal(metrics.outerWidth, physicalWidth);
        assert.equal(metrics.innerWidth, physicalWidth / zoom);
        assert.equal(metrics.dpr, zoom);
        assert.equal(metrics.visualScale, 1);
        assert.equal(metrics.cssZoom, '1');
        assert.equal(metrics.h1ComputedSize, '30px');
        assert.equal(metrics.documentWidth, metrics.innerWidth);
        await page.keyboard.press('Tab');
        assert.equal(await page.locator(':focus').getAttribute('class'), 'skip');
        const name = `native${zoom * 100}-${font}-${role}-${lang}-${theme}-window${physicalWidth}`;
        const layout = await cdp.send('Page.getLayoutMetrics');
        assert.equal(layout.cssVisualViewport.zoom, zoom);
        let bitmap = null;
        if (zoom === 2) {
          // Playwright's fullPage helper normalizes page-zoom screenshots to CSS
          // pixels. Capture Chromium's native compositor raster directly using
          // its non-CSS content rectangle; no image scaling/post-processing.
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { ...layout.contentSize, scale: 1 } });
          const png = Buffer.from(shot.data, 'base64');
          bitmap = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
          assert.equal(bitmap.width, physicalWidth);
          await writeFile(`${root}evidence/screenshots/${name}.png`, png);
        }
        cases.push({ name, zoom, physicalWidth, font, role, lang, theme, ...metrics, layout, bitmap, screenshot: zoom === 2 ? `screenshots/${name}.png` : null, pass: true });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); await rm(profile, { recursive: true, force: true }); }
  }
}
await writeFile(`${root}evidence/native-zoom.json`, JSON.stringify({ method: 'Chromium profile partition.default_zoom_level.x = log(zoom)/log(1.2); native host page zoom; no viewport emulation', evidence: 'CSS viewport halves and devicePixelRatio doubles; CSS font size remains 30px; visualViewport.scale=1 and CSS zoom=1', cases, limits: 'Automated Linux Chromium profile zoom only; no physical keyboard/OS/device/installed-PWA evidence' }, null, 2) + '\n');
console.log(`PASS: ${cases.length} paired native-zoom observations; 32 actual 200% screenshots`);
