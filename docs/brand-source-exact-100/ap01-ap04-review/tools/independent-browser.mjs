/* global document, NodeFilter, getComputedStyle, innerWidth, outerWidth, devicePixelRatio, visualViewport */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('/tmp/eh-review-tools/node_modules/playwright/index.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:8100';
const url = `${origin}/docs/brand-source-exact-100/ap01-ap04-review/`;
const evidence = `${root}evidence/independent/`;
await mkdir(evidence, { recursive: true });
const hash = data => createHash('sha256').update(data).digest('hex');
const lum = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((a, b, i) => a + b * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const errors = [], fontResponses = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => errors.push(r.url()));
page.on('request', r => { if (!r.url().startsWith(origin)) errors.push(`external ${r.url()}`); });
page.on('response', response => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});
await page.route('**/*.ttf', async route => {
  const response = await route.fetch(), data = await response.body();
  const filename = route.request().url().split('/').at(-1);
  assert.equal(hash(data), hash(await readFile(`${root}fonts/${filename}`)));
  fontResponses.push({ filename, status: response.status(), sha256: hash(data) });
  await route.fulfill({ response, body: data });
});
async function fontNode(selector) {
  const { root: tree } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: tree.nodeId, selector });
  return (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
}
async function directText(scale) {
  return page.evaluate(scale => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parents = new Set(); let node;
    while ((node = walker.nextNode())) {
      const e = node.parentElement;
      if (node.textContent.trim() && e.checkVisibility() && e.getClientRects().length && !e.closest('#font-probes')) parents.add(e);
    }
    for (const e of document.querySelectorAll('body *')) {
      if (!e.checkVisibility() || !e.getClientRects().length || e.closest('#font-probes')) continue;
      const generated = ['::before', '::after'].some(pseudo => {
        const value = getComputedStyle(e, pseudo).content;
        return value && !['none', 'normal', '""'].includes(value);
      });
      if (generated || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) parents.add(e);
    }
    const nodes = [...parents];
    const original = nodes.map(e => parseFloat(getComputedStyle(e).fontSize));
    const originalPseudo = [...document.querySelectorAll('td')].map(e => parseFloat(getComputedStyle(e, '::before').fontSize));
    const originalInputs = [...document.querySelectorAll('input')].map(e => parseFloat(getComputedStyle(e).fontSize));
    if (scale === 2) nodes.forEach((e, i) => { e.style.fontSize = `${original[i] * 2}px`; });
    const rows = nodes.map((e, i) => {
      e.setAttribute('data-independent-text', String(i));
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      let a = e, bg;
      do { bg = getComputedStyle(a).backgroundColor; a = a.parentElement; } while (a && bg === 'rgba(0, 0, 0, 0)');
      return { selector: `[data-independent-text="${i}"]`, text: e.value || e.textContent.trim(), emptyInput: e.matches('input,textarea') && !e.value, size: parseFloat(s.fontSize), original: original[i], color: s.color, background: bg, weight: s.fontWeight, synthesis: s.fontSynthesis, stretch: s.fontStretch, style: s.fontStyle, optical: s.fontOpticalSizing, clipped: (['hidden', 'clip'].includes(s.overflowY) && e.scrollHeight > e.clientHeight + 1), outside: !e.classList.contains('skip') && (r.left < -1 || r.right > innerWidth + 1) };
    });
    return { rows, inputSizes: [...document.querySelectorAll('input')].map((e, i) => ({ original: originalInputs[i], current: parseFloat(getComputedStyle(e).fontSize) })), generatedSizes: [...document.querySelectorAll('td')].filter(e => getComputedStyle(e, '::before').content !== 'none').map((e, i) => ({ original: originalPseudo[i], current: parseFloat(getComputedStyle(e, '::before').fontSize), content: getComputedStyle(e, '::before').content })) };
  }, scale);
}
const cases = [], matches = [], fonts = [], pairs = [];
for (const family of ['plex', 'noto']) for (const audience of ['patient', 'doctor']) for (const language of ['ar', 'en']) for (const mode of ['light', 'dark']) for (const width of [320, 390, 768, 1024, 1440]) for (const scale of [1, 2]) {
  const name = `${family}-${audience}-${language}-${mode}-${width}-${scale === 1 ? 'normal' : 'text200'}`;
  await page.setViewportSize({ width, height: 960 });
  await page.goto(`${url}?font=${family}&role=${audience}&lang=${language}&theme=${mode}`);
  await page.evaluate(() => document.fonts.ready);
  const inspection = await directText(scale), text = inspection.rows;
  for (const size of [...inspection.inputSizes, ...inspection.generatedSizes]) assert.equal(size.current, size.original * scale, `${name} all input/generated text must scale`);
  for (const row of text) {
    assert.equal(row.size, row.original * scale, name);
    assert.equal(row.synthesis, 'none'); assert.equal(row.style, 'normal'); assert.equal(row.stretch, '100%');
    assert.ok(!row.clipped && !row.outside, `${name} ${row.text}`);
    assert.ok(ratio(row.color, row.background) >= 4.5, `${name} text contrast`);
  }
  const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, direction: document.documentElement.dir, imageFailures: [...document.images].filter(i => !i.complete || !i.naturalWidth).length, latin: [...document.querySelectorAll('bdi')].map(e => ({ text: e.textContent, direction: getComputedStyle(e).direction, bidi: getComputedStyle(e).unicodeBidi })) }));
  assert.equal(metrics.width, metrics.scroll, name);
  assert.equal(metrics.direction, language === 'ar' ? 'rtl' : 'ltr');
  assert.equal(metrics.imageFailures, 0);
  assert.ok(metrics.latin.every(x => x.direction === 'ltr' && x.bidi === 'isolate'));
  // Inspect visible specimen text rather than author-provided hidden probes.
  const selectors = text.filter(row => !row.emptyInput && (width === 390 && scale === 1 || /visible-(ar|en)/.test(row.selector)));
  const selected = width === 390 && scale === 1 ? selectors.map(x => x.selector) : ['#visible-ar400', '#visible-ar600', '#visible-en400', '#visible-en500', '#visible-en600', '#visible-en700'];
  for (const selector of selected) {
    const actual = await fontNode(selector);
    assert.ok(actual.length > 0);
    for (const f of actual) {
      assert.ok(f.isCustomFont && (f.postScriptName === 'Inter-Regular' || (family === 'plex' ? /^IBMPlexSansArabic-(Regular|SemiBold)$/.test(f.postScriptName) : f.postScriptName === 'NotoSansArabic-Regular')), `${name} ${selector} ${JSON.stringify(actual)}`);
    }
    if (selector === '#visible-ar600' && family === 'plex') assert.ok(actual.some(f => f.postScriptName === 'IBMPlexSansArabic-SemiBold'));
    fonts.push({ name, selector, actual });
  }
  // Independently recapture eight Arabic representatives and two 320/200 cases.
  if (language === 'ar' && scale === 1 && (audience === 'patient' && width === 390 || audience === 'doctor' && width === 1440) || language === 'ar' && scale === 2 && width === 320 && audience === 'doctor' && mode === 'dark') {
    const data = await page.screenshot({ path: `${evidence}${name}.png`, fullPage: true });
    const original = await readFile(`${root}evidence/screenshots/${name}.png`);
    matches.push({ name, independentSHA256: hash(data), authorSHA256: hash(original), byteIdentical: data.equals(original) });
  }
  const count = await page.locator('a[href],button:not(:disabled),input,summary').count();
  const focus = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    const f = await page.locator(':focus').evaluate(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect(); let a = e.parentElement, bg;
      do { bg = getComputedStyle(a).backgroundColor; a = a.parentElement; } while (a && bg === 'rgba(0, 0, 0, 0)');
      return { tag: e.tagName, id: e.id, label: e.textContent.trim(), color: s.outlineColor, background: bg, outline: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: s.outlineOffset, inViewport: r.bottom > 0 && r.top < 960 };
    });
    assert.equal(f.outline, 'solid'); assert.ok(f.width >= 3 && ratio(f.color, f.background) >= 3 && f.inViewport, name);
    focus.push(f);
  }
  assert.equal(focus[0].label, language === 'ar' ? 'روح للمحتوى' : 'Skip to specimen');
  cases.push({ name, family, audience, language, mode, width, scale, metrics, textNodes: text.length, inputSizes: inspection.inputSizes, generatedSizes: inspection.generatedSizes, focus });
  if (cases.length % 40 === 0) console.log(`Independent ${cases.length}/160 cases`);
}
// Capture actual current browser style for all interactive/semantic roles and
// recalculate independently, including both sides of input/CTA boundaries.
for (const theme of ['light', 'dark']) {
  await page.goto(`${url}?theme=${theme}&lang=ar`); await page.evaluate(() => document.fonts.ready);
  await page.locator('summary').click();
  for (const selector of ['.primary', '.action', 'input', '[aria-invalid]', 'button:disabled', '.tip', '.state.error', '.state.warning', '.state.success', '.tag', '.accent', '.bar', '#medical-info dd', 'th']) {
    const item = page.locator(selector).first();
    if (!await item.count()) continue;
    for (const state of ['rest', 'hover']) {
      if (state === 'hover') await item.hover(); else await page.mouse.move(0, 0);
      const colors = await item.evaluate(e => {
        const s = getComputedStyle(e); let a = e.parentElement, outer;
        do { outer = getComputedStyle(a).backgroundColor; a = a.parentElement; } while (a && outer === 'rgba(0, 0, 0, 0)');
        return { color: s.color, background: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? outer : s.backgroundColor, outer, border: s.borderTopColor, borderWidth: s.borderTopWidth };
      });
      const textContrast = ratio(colors.color, colors.background);
      if (selector !== '.bar') assert.ok(textContrast >= 4.5);
      const boundary = ['.primary', '.action', 'input', '[aria-invalid]', 'button:disabled'].includes(selector) ? ratio(colors.border, colors.outer) : null;
      if (boundary !== null) assert.ok(boundary >= 3);
      pairs.push({ theme, selector, state, ...colors, textContrast, boundary });
    }
  }
  await page.locator('#preview-action').click();
  assert.match(await page.locator('#preview-result').textContent(), /مفيش حاجة اتحفظت/);
  await page.locator('#details-action').click(); assert.ok(await page.locator('details').evaluate(e => e.open));
}
assert.deepEqual(errors, []);
const negative = await browser.newPage();
await negative.route('**/*.ttf', r => r.abort());
await negative.goto(`${url}?lang=ar&font=plex`); await negative.evaluate(() => document.fonts.ready);
const nc = await negative.context().newCDPSession(negative); await nc.send('DOM.enable'); await nc.send('CSS.enable');
const { root: nt } = await nc.send('DOM.getDocument');
const { nodeId: ni } = await nc.send('DOM.querySelector', { nodeId: nt.nodeId, selector: '#visible-ar600' });
const rejected = (await nc.send('CSS.getPlatformFontsForNode', { nodeId: ni })).fonts;
assert.ok(rejected.some(f => !f.isCustomFont));
await writeFile(`${root}evidence/independent-browser.json`, JSON.stringify({ browser: await browser.version(), cases, fonts, pairs, fontResponses, screenshotReproductions: matches, errors, blockedFontNegativeControl: rejected }, null, 2) + '\n');
await browser.close();
// Native page zoom: separately constructed profile preferences, paired physical
// window 640, selected Noto/doctor/Arabic/light case, no viewport emulation.
const native = [];
for (const zoom of [1, 2]) {
  const profile = await mkdtemp(`${tmpdir()}/independent-ap01-zoom-`);
  await mkdir(`${profile}/Default`);
  await writeFile(`${profile}/Default/Preferences`, JSON.stringify({ partition: { default_zoom_level: { x: Math.log(zoom) / Math.log(1.2) } } }));
  const context = await chromium.launchPersistentContext(profile, { executablePath: '/usr/bin/chromium', headless: true, viewport: null, args: ['--no-sandbox', '--window-size=640,960'] });
  const p = await context.newPage();
  await p.goto(`${url}?font=noto&role=doctor&lang=ar&theme=light`); await p.evaluate(() => document.fonts.ready);
  const metrics = await p.evaluate(() => ({ innerWidth, outerWidth, dpr: devicePixelRatio, viewportScale: visualViewport.scale, cssZoom: getComputedStyle(document.documentElement).zoom, titleSize: getComputedStyle(document.querySelector('h1')).fontSize, scrollWidth: document.documentElement.scrollWidth }));
  assert.equal(metrics.outerWidth, 640); assert.equal(metrics.innerWidth, 640 / zoom); assert.equal(metrics.dpr, zoom); assert.equal(metrics.viewportScale, 1); assert.equal(metrics.cssZoom, '1'); assert.equal(metrics.titleSize, '30px'); assert.equal(metrics.scrollWidth, metrics.innerWidth);
  await p.keyboard.press('Tab'); assert.equal(await p.locator(':focus').getAttribute('class'), 'skip');
  const session = await context.newCDPSession(p);
  const layout = await session.send('Page.getLayoutMetrics');
  assert.equal(layout.cssVisualViewport.zoom, zoom);
  const raster = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...layout.contentSize, scale: 1 } });
  const bitmap = Buffer.from(raster.data, 'base64');
  const bitmapWidth = bitmap.readUInt32BE(16), bitmapHeight = bitmap.readUInt32BE(20);
  assert.equal(bitmapWidth, 640);
  await writeFile(`${evidence}native-${zoom * 100}-noto-doctor-ar-light-window640.png`, bitmap);
  native.push({ zoom, ...metrics, cdpZoom: layout.cssVisualViewport.zoom, bitmapWidth, bitmapHeight });
  await context.close(); await rm(profile, { recursive: true, force: true });
}
await writeFile(`${root}evidence/independent-native-zoom.json`, JSON.stringify({ method: 'Independent persistent Chromium profile partition.default_zoom_level.x preference; actual host zoom, physical window640', native }, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, fonts: fonts.length, pairs: pairs.length, screenshotReproductions: matches, native }, null, 2));
