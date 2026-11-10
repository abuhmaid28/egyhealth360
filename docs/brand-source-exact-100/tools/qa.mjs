/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(process.env.EH100_PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.EH100_ORIGIN || 'http://127.0.0.1:8100';
const base = `${origin}/docs/brand-source-exact-100/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
page.on('requestfailed', r => errors.push(`requestfailed ${r.url()}`));
page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) errors.push(`external ${r.url()}`); });

// Render SVGs directly, with no resampling or raster tracing.
const renders = [];
for (const [name, width, height] of [
  ...[16, 24, 32, 64, 192, 512].map(n => [`icon-${n}`, n, n]),
  ['maskable-512', 512, 512], ['symbol-transparent', 310, 320],
  ...['dark', 'light'].flatMap(t => [[`bilingual-${t}`, 1010, 402], ...['en', 'ar'].map(l => [`compact-${l}-${t}`, 234, 43.5])]),
]) {
  const svg = await readFile(resolve(root, `assets/${name}.svg`), 'utf8');
  await page.setViewportSize({ width, height: Math.ceil(height) });
  await page.setContent(`<html><head><style>html,body{margin:0}svg{display:block;width:${width}px;height:${height}px}</style></head><body>${svg}</body></html>`);
  const geometry = await page.evaluate(() => {
    const frame = document.querySelector('svg').getBoundingClientRect();
    const groups = Array.from(document.querySelectorAll('g[data-text],g#master-symbol')).map(e => {
      const b = e.getBoundingClientRect();
      return { group: e.dataset.text || e.id, x: b.x, y: b.y, width: b.width, height: b.height, inside: b.left >= -.01 && b.top >= -.01 && b.right <= frame.right + .01 && b.bottom <= frame.bottom + .01 };
    });
    return { groups, noClipping: groups.every(g => g.inside) };
  });
  assert.ok(geometry.noClipping, `${name}: asset clipping`);
  await page.screenshot({ path: resolve(root, `evidence/${name}.png`), omitBackground: true });
  const png = await readFile(resolve(root, `evidence/${name}.png`));
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), Math.ceil(height));
  renders.push({ asset: name, width, height: Math.ceil(height), deviceScaleFactor: 1, ...geometry });
}

// Actual intended-size before/after proofs and transformed geometry clearance.
const clearance = [];
for (const [file, label, height] of [['source/lockup-dark.svg', 'before', 175], ['assets/bilingual-dark.svg', 'after-dark', 201], ['assets/bilingual-light.svg', 'after-light', 201]]) {
  const svg = await readFile(resolve(root, file), 'utf8');
  await page.setViewportSize({ width: 505, height });
  await page.setContent(`<html><head><style>html,body{margin:0}svg{display:block;width:505px;height:${height}px}</style></head><body>${svg}</body></html>`);
  const metrics = await page.evaluate(() => {
    const box = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
    const arabic = box(document.querySelector('[data-text="إيجي هيلث"]'));
    const tagline = box(document.querySelector('[data-text="رعاية متكاملة حولك"]'));
    const bounds = box(document.querySelector('svg'));
    const all = Array.from(document.querySelectorAll('g[data-text],g#master-symbol')).map(box);
    return { arabic, tagline, gapCssPx: tagline.y - arabic.bottom, bounds, noClipping: all.every(b => b.x >= 0 && b.y >= 0 && b.right <= bounds.right && b.bottom <= bounds.bottom) };
  });
  if (label !== 'before') assert.ok(metrics.gapCssPx > 12 && metrics.noClipping, `${label}: Arabic clearance`);
  await page.screenshot({ path: resolve(root, `evidence/arabic-${label}-505.png`) });
  clearance.push({ file, intendedCssWidth: 505, ...metrics });
}

const cases = [], keyboard = [], contrast = [];
function lum(rgb) { return rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); }
function ratio(a, b) { const l = [lum(a), lum(b)].sort((x, y) => y - x); return (l[0] + .05) / (l[1] + .05); }
function rgb(color) { return color.match(/[\d.]+/g).slice(0, 3).map(Number); }
for (const theme of ['dark', 'light']) for (const lang of ['en', 'ar']) for (const width of [320, 390, 768, 1024, 1440]) for (const scale of [1, 2]) {
  await page.setViewportSize({ width, height: 960 });
  await page.goto(`${base}?lang=${lang}&theme=${theme}`);
  await page.evaluate(() => document.fonts.ready);
  const normal = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(e => Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())).map((e, i) => { e.dataset.qaText = String(i); return { id: i, text: e.textContent.trim(), px: parseFloat(getComputedStyle(e).fontSize) }; }));
  if (scale === 2) await page.evaluate(rows => { for (const row of rows) document.querySelector(`[data-qa-text="${row.id}"]`).style.fontSize = `${row.px * 2}px`; }, normal);
  const result = await page.evaluate(({ normal, scale }) => {
    const text = normal.map(row => { const e = document.querySelector(`[data-qa-text="${row.id}"]`); const cs = getComputedStyle(e); let ancestor = e, bg; while (ancestor) { bg = getComputedStyle(ancestor).backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') break; ancestor = ancestor.parentElement; } return { text: row.text, normalPx: row.px, computedPx: parseFloat(cs.fontSize), expectedPx: row.px * scale, color: cs.color, background: bg, clipped: e.scrollHeight > e.clientHeight + 1 && ['hidden', 'clip'].includes(cs.overflowY) }; });
    const controls = Array.from(document.querySelectorAll('.web-header a')).map(e => { const r = e.getBoundingClientRect(); return { name: e.textContent.trim() || e.querySelector('img')?.alt, x: r.x, y: r.y, width: r.width, height: r.height }; });
    const img = document.querySelector('#header-logo');
    const escapees = Array.from(document.querySelectorAll('body *')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !e.classList.contains('skip'); }).map(e => e.tagName + '.' + e.className);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, direction: document.documentElement.dir, imageReady: img.complete && img.naturalWidth > 0, logoSrc: img.getAttribute('src'), controls, escapees, text };
  }, { normal, scale });
  assert.equal(result.documentWidth, width, `${theme}/${lang}/${width}/${scale} document overflow`);
  assert.equal(result.escapees.length, 0, JSON.stringify(result.escapees));
  assert.ok(result.imageReady);
  for (const t of result.text) { assert.equal(t.computedPx, t.expectedPx); assert.ok(!t.clipped); const value = ratio(rgb(t.color), rgb(t.background)); assert.ok(value >= 4.5, `${t.text}: contrast ${value}`); contrast.push({ theme, text: t.text, foreground: t.color, background: t.background, ratio: value, threshold: 4.5 }); }
  for (const c of result.controls) assert.ok(c.height >= 48 && c.width >= 48);
  const name = `${theme}-${lang}-${width}-${scale === 2 ? 'text200' : 'normal'}`;
  await page.locator('.web-header').screenshot({ path: resolve(root, `evidence/header-${name}.png`) });
  if (scale === 1 && [390, 1440].includes(width)) await page.screenshot({ path: resolve(root, `evidence/page-${name}.png`), fullPage: true });
  // Keyboard from skip link, through both real header links, to locale navigation.
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('class'), 'skip');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('class'), 'brand');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'locale');
  const focus = await page.locator(':focus').evaluate(e => { const s = getComputedStyle(e), p = getComputedStyle(e.parentElement); return { outlineColor: s.outlineColor, outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, borderColor: s.borderTopColor, background: p.backgroundColor }; });
  assert.equal(focus.outlineStyle, 'solid');
  assert.ok(parseFloat(focus.outlineWidth) >= 3);
  for (const role of ['outlineColor', 'borderColor']) { const value = ratio(rgb(focus[role]), rgb(focus.background)); assert.ok(value >= 3); contrast.push({ theme, text: role, foreground: focus[role], background: focus.background, ratio: value, threshold: 3 }); }
  if (width === 320) await page.locator('.web-header').screenshot({ path: resolve(root, `evidence/focus-${name}.png`) });
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator(':focus').getAttribute('class'), 'brand');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForURL(url => url.searchParams.get('lang') === (lang === 'ar' ? 'en' : 'ar'));
  assert.equal(await page.locator('html').getAttribute('dir'), lang === 'ar' ? 'ltr' : 'rtl');
  keyboard.push({ name, pass: true, actions: ['Tab: skip', 'Tab: brand', 'Tab: locale', 'Shift+Tab: brand', 'Tab: locale', 'Enter: locale changes direction'], focus });
  cases.push({ name, pass: true, ...result });
}

// Native maskable safe area: transformed geometry bounding box corners within radius.
await page.setViewportSize({ width: 512, height: 512 });
const mask = await readFile(resolve(root, 'assets/maskable-512.svg'), 'utf8');
await page.setContent(`<html><body style="margin:0">${mask}</body></html>`);
const maskable = await page.evaluate(() => { const b = document.querySelector('#master-symbol').getBoundingClientRect(); const radii = [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]].map(([x, y]) => Math.hypot(x - 256, y - 256)); return { boundingBox: { x: b.x, y: b.y, width: b.width, height: b.height }, maxBoundingCornerRadius: Math.max(...radii), safeRadius: 204.8, conservativeRectangleInside: radii.every(r => r < 204.8) }; });
assert.ok(maskable.conservativeRectangleInside);
await page.goto(`${base}?lang=ar&theme=dark`);
await page.locator('.mask-review').first().screenshot({ path: resolve(root, 'evidence/maskable-safe-area.png') });
await page.locator('.mask-review.round').screenshot({ path: resolve(root, 'evidence/maskable-circle.png') });
await page.locator('#native-icons').screenshot({ path: resolve(root, 'evidence/native-pixel-strip.png') });
assert.deepEqual(errors, []);
const uniqueContrast = Array.from(new Map(contrast.map(row => [JSON.stringify([row.theme, row.foreground, row.background, row.threshold]), row])).values());
const hover = [];
for (const theme of ['dark', 'light']) {
  await page.goto(`${base}?lang=en&theme=${theme}`);
  for (const selector of ['.locale', '.review-links a:first-child']) {
    await page.locator(selector).hover();
    const colors = await page.locator(selector).evaluate(e => { const s = getComputedStyle(e); let parent = e.parentElement, surrounding; while (parent) { surrounding = getComputedStyle(parent).backgroundColor; if (surrounding !== 'rgba(0, 0, 0, 0)') break; parent = parent.parentElement; } return { foreground: s.color, background: s.backgroundColor, surrounding }; });
    const value = ratio(rgb(colors.foreground), rgb(colors.background));
    assert.ok(value >= 4.5);
    const boundary = ratio(rgb(colors.background), rgb(colors.surrounding));
    assert.ok(boundary >= 3);
    const row = { theme, text: `hover ${selector}`, ...colors, ratio: value, threshold: 4.5, filledBoundaryRatio: boundary, boundaryThreshold: 3 };
    hover.push(row);
    uniqueContrast.push(row);
  }
}
await writeFile(resolve(root, 'evidence/contrast.json'), JSON.stringify(uniqueContrast, null, 2) + '\n');
assert.deepEqual(errors, []);
await writeFile(resolve(root, 'evidence/browser-qa.json'), JSON.stringify({ result: 'PASS', engine: await browser.version(), deviceScaleFactor: 1, method200: 'Each normal computed text-owning element font-size multiplied by 2. Outlined trademark artwork is not text and is not enlarged.', cases, keyboard, hover, contrastObservations: contrast.length + hover.length, errors, renders, clearance, maskable, notTested: ['native zoom', 'screen readers', 'real devices', 'installed PWA', 'WebKit', 'print', 'trademark clearance'] }, null, 2) + '\n');
await browser.close();
console.log(`PASS: ${cases.length} responsive/contrast/computed-text cases; ${keyboard.length} keyboard cases; ${contrast.length + hover.length} contrast observations; DP01 clearance and maskable geometry.`);
