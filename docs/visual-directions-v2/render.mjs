// Capture isolated visual specimens; no application, API, database or external requests.
/* global document, getComputedStyle, innerWidth, Node -- Playwright browser evaluation callbacks */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const folder = resolve(root, 'docs/visual-directions-v2');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + '/')) throw new Error('Outside repository');
    const s = await stat(path);
    const file = s.isDirectory() ? resolve(path, 'index.html') : path;
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end('Unavailable'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/docs/visual-directions-v2/`;
const browser = await chromium.launch({ executablePath: process.env.VISUAL_CHROMIUM ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const inventory = JSON.parse(await readFile(resolve(folder, 'evidence/inventory.json')));
const results = [], failures = [], network = [], fontErrors = [], textContrast = [];
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.route('**/*', async route => {
  if (route.request().url().startsWith(`http://127.0.0.1:${server.address().port}/`)) return route.continue();
  network.push(route.request().url());
  return route.abort();
});
page.on('pageerror', e => failures.push(e.message));
page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
async function open(path, width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}
async function measure() {
  return page.evaluate(() => {
    const over = [...document.querySelectorAll('main *')].filter(el => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1) && s.position !== 'absolute';
    }).map(el => ({ tag: el.tagName, class: el.className?.baseVal ?? el.className, text: el.textContent.slice(0, 60) }));
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflow: over, fonts: [...document.fonts].filter(f => f.status === 'error').map(f => f.family) };
  });
}
async function renderedContrast(path) {
  const pairs = await page.evaluate(() => {
    const colors = new Map();
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden') continue;
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
      if (!text && !['INPUT', 'TEXTAREA'].includes(el.tagName)) continue;
      let parent = el, background = '';
      while (parent) {
        const b = getComputedStyle(parent).backgroundColor;
        if (b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { background = b; break; }
        parent = parent.parentElement;
      }
      const key = s.color + '/' + background;
      if (!colors.has(key)) colors.set(key, { foreground: s.color, background, example: text.slice(0, 70), tag: el.tagName });
    }
    return [...colors.values()];
  });
  function luminance(color) {
    const values = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return values.reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  }
  for (const pair of pairs) {
    const [low, high] = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => a - b);
    textContrast.push({ path, ...pair, ratio: Math.round((high + .05) / (low + .05) * 100) / 100 });
  }
}
try {
  const subset = process.env.VISUAL_SAMPLE ? inventory.filter(x => ['patient', 'consultation', 'patient-mobile'].includes(x.screen) && x.language === 'en') : inventory;
  for (const item of subset) {
    await open(item.path, item.width, item.height);
    const m = await measure();
    await renderedContrast(item.path);
    if (m.fonts.length) fontErrors.push({ path: item.path, fonts: m.fonts });
    if (item.width < 800) {
      await page.screenshot({ path: resolve(folder, item.path.replace('.html', '-viewport.png')) });
      // Preserve an unobscured long-form export alongside the actual sticky-nav viewport.
      await page.evaluate(() => document.body.classList.add('capture-full'));
    }
    await page.screenshot({ path: resolve(folder, item.path.replace('.html', '.png')), fullPage: true });
    results.push({ ...item, ...m });
  }
  if (!process.env.VISUAL_SAMPLE) {
    for (const key of ['d1','d2','e1','e2','f1','f2']) {
      await open(`${key}-proof.html`, 820, 800);
      await page.screenshot({ path: resolve(folder, `${key}-proof.png`), fullPage: true });
    }
    for (const key of ['d','e','f']) {
      await open(`direction-${key}/board.html`, 1600, 1000);
      await page.screenshot({ path: resolve(folder, `direction-${key}/board.png`), fullPage: true });
    }
    for (const file of ['comparison','logos','index']) {
      await open(`${file}.html`, file === 'comparison' ? 1920 : 1600, 1000);
      await page.screenshot({ path: resolve(folder, `${file}.png`), fullPage: true });
    }
    // All screen types in both languages at 320px; capture a compact representative proof.
    const reflow = [];
    for (const item of inventory.filter(x => !['consultation','find','schedule','typography','states'].includes(x.screen))) {
      await open(item.path, 320, 780);
      reflow.push({ path: item.path, ...await measure() });
    }
    // Text zoom via browser default font multiplier; stylesheet has fixed px, so also
    // apply 200% text scaling to every text element without changing container width.
    const resize = [];
    for (const key of ['d','e','f']) for (const lang of ['ar','en']) {
      await open(`direction-${key}/patient-mobile-${lang}.html`, 390, 844);
      await page.evaluate(() => {
        const items = [...document.querySelectorAll('main *')].map(el => [el, parseFloat(getComputedStyle(el).fontSize)]);
        for (const [el, size] of items) el.style.fontSize = `${size * 2}px`;
      });
      resize.push({ path: `direction-${key}/patient-mobile-${lang}.html`, ...await measure() });
    }
    // Keyboard reaches visible visual controls; these are intentionally inert specimens.
    const keyboard = [];
    for (const key of ['d','e','f']) for (const lang of ['ar','en']) {
      await open(`direction-${key}/find-${lang}.html`, 1440);
      await page.keyboard.press('Tab');
      keyboard.push(await page.evaluate(() => ({ direction: document.body.className, lang: document.documentElement.lang, tag: document.activeElement.tagName, id: document.activeElement.id, outline: getComputedStyle(document.activeElement).outlineStyle })));
    }
    const report = { browser: await browser.version(), deviceScaleFactor: 1, captureMethod: 'Actual Chromium render; no external requests', screens: results, reflow320: reflow, textResize200: resize, keyboard, failures, externalRequests: network, fontErrors, textContrast };
    await writeFile(resolve(folder, 'evidence/browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ screens: results.length, reflow320: reflow.length, textResize200: resize.length, overflow: results.filter(x => x.overflow.length || x.scrollWidth > x.width).map(x => x.path), narrowOverflow: reflow.filter(x => x.overflow.length || x.scrollWidth > x.width).map(x => x.path), resizeOverflow: resize.filter(x => x.overflow.length || x.scrollWidth > x.width).map(x => x.path), failures, externalRequests: network, fontErrors, renderedTextContrastFailures: textContrast.filter(x => x.ratio < 4.5) }, null, 2));
  } else console.log(JSON.stringify(results.map(x => ({ path: x.path, height: x.height, overflow: x.overflow })), null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
