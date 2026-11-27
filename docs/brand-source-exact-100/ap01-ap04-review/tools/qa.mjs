/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.EH_REVIEW_PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.EH_REVIEW_ORIGIN || 'http://127.0.0.1:8100';
const base = `${origin}/docs/brand-source-exact-100/ap01-ap04-review/`;
const provenance = JSON.parse(await readFile(`${root}evidence/font-provenance.json`, 'utf8'));
const expectedHashes = new Map(provenance.files.map(f => [f.file.split('/').at(-1), f.sha256]));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const errors = [], network = new Map();
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => errors.push(`requestfailed ${r.url()}`));
page.on('request', r => { if (!r.url().startsWith(origin)) errors.push(`external ${r.url()}`); });
page.on('response', r => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.route('**/*.ttf', async route => {
  const response = await route.fetch(), body = await response.body();
  const name = route.request().url().split('/').at(-1);
  const hash = createHash('sha256').update(body).digest('hex');
  assert.equal(hash, expectedHashes.get(name));
  network.set(name, { status: response.status(), bytes: body.length, sha256: hash });
  await route.fulfill({ response, body });
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
export function contrast(fg, bg) {
  const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const a = [lum(fg), lum(bg)].sort((x, y) => y - x); return (a[0] + .05) / (a[1] + .05);
}
async function renderedFonts(selector) {
  const { root: dom } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: dom.nodeId, selector });
  const fonts = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
  if (fonts.length) return fonts;
  // Input values live in Chromium's user-agent shadow DOM, not direct text nodes.
  const { node } = await cdp.send('DOM.describeNode', { nodeId, depth: 3, pierce: true });
  const backend = node.shadowRoots?.[0]?.children?.[0]?.backendNodeId;
  if (!backend) return fonts;
  const { nodeIds } = await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [backend] });
  return (await cdp.send('CSS.getPlatformFontsForNode', { nodeId: nodeIds[0] })).fonts;
}
async function textAudit(scale) {
  return page.evaluate(scale => {
    const generated = e => ['::before', '::after'].map(kind => ({ kind, style: getComputedStyle(e, kind) })).filter(p => !['none', 'normal', '""'].includes(p.style.content));
    const nodes = Array.from(document.querySelectorAll('body *')).filter(e => e.checkVisibility() && e.getClientRects().length && !e.closest('#font-probes') && (Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()) || e.matches('input,textarea,select') || generated(e).length));
    const before = nodes.map(e => ({ size: parseFloat(getComputedStyle(e).fontSize), pseudo: generated(e).map(p => ({ kind: p.kind, content: p.style.content, originalSize: parseFloat(p.style.fontSize) })) }));
    if (scale === 2) {
      nodes.forEach((e, i) => { e.style.fontSize = `${before[i].size * 2}px`; });
    }
    return nodes.map((e, i) => {
      e.dataset.qa = String(i); const s = getComputedStyle(e);
      let ancestor = e, bg;
      while (ancestor) { bg = getComputedStyle(ancestor).backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') break; ancestor = ancestor.parentElement; }
      const r = e.getBoundingClientRect();
      return { selector: `[data-qa="${i}"]`, text: e.value || e.textContent.trim(), emptyFormControl: e.matches('input,textarea') && !e.value, color: s.color, background: bg, font: s.fontFamily, weight: s.fontWeight, synthesis: s.fontSynthesis, size: parseFloat(s.fontSize), originalSize: before[i].size, pseudoText: before[i].pseudo.map(p => ({ ...p, size: parseFloat(getComputedStyle(e, p.kind).fontSize) })), lineHeight: s.lineHeight, clipped: (['hidden', 'clip'].includes(s.overflowY) && e.scrollHeight > e.clientHeight + 1), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
    });
  }, scale);
}
const cases = [], pairs = new Map(), fontObservations = [], interactions = [];
for (const font of ['plex', 'noto']) for (const role of ['patient', 'doctor']) for (const lang of ['ar', 'en']) for (const theme of ['dark', 'light']) for (const width of [320, 390, 768, 1024, 1440]) for (const scale of [1, 2]) {
  const name = `${font}-${role}-${lang}-${theme}-${width}-${scale === 1 ? 'normal' : 'text200'}`;
  await page.setViewportSize({ width, height: 960 });
  await page.goto(`${base}?font=${font}&role=${role}&lang=${lang}&theme=${theme}`);
  await page.evaluate(() => document.fonts.ready);
  const text = await textAudit(scale);
  const layout = await page.evaluate(() => ({
    width: innerWidth, documentWidth: document.documentElement.scrollWidth, direction: document.documentElement.dir,
    images: Array.from(document.images).map(i => ({ src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0 })),
    overflow: Array.from(document.querySelectorAll('body *')).filter(e => {
      if (e.closest('#font-probes') || e.classList.contains('skip')) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
    }).map(e => e.tagName + '.' + e.className),
  }));
  assert.equal(layout.documentWidth, width, name);
  assert.deepEqual(layout.overflow, [], `${name}: ${layout.overflow}`);
  assert.equal(layout.direction, lang === 'ar' ? 'rtl' : 'ltr');
  assert.ok(layout.images.every(i => i.loaded && i.src.includes('compact-')));
  for (const row of text) {
    assert.equal(row.size, row.originalSize * scale, `${name}: ${row.text} size`);
    for (const pseudo of row.pseudoText) assert.equal(pseudo.size, pseudo.originalSize * scale, `${name}: ${pseudo.kind} ${pseudo.content} size`);
    assert.equal(row.synthesis, 'none'); assert.ok(!row.clipped, `${name}: ${row.text} clipping`);
    const ratio = contrast(row.color, row.background);
    assert.ok(ratio >= 4.5, `${name}: ${row.text}: ${ratio}`);
    const key = `${theme}:${row.color}:${row.background}:text`;
    const pair = pairs.get(key) || { theme, foreground: row.color, background: row.background, role: 'text', threshold: 4.5, ratio, observations: 0, example: row.text };
    pair.observations++; pairs.set(key, pair);
  }
  // Check actual rendering of all visible direct-text elements once per layout family.
  // Mixed runs may legitimately use both the selected Arabic font and Inter.
  if (width === 390 && scale === 1) {
    for (const row of text) {
      if (row.emptyFormControl) continue;
      const fonts = await renderedFonts(row.selector);
      assert.ok(fonts.length > 0, `${name}: no rendered font ${row.text}`);
      for (const f of fonts) {
        assert.ok(f.isCustomFont && /^(Inter-Regular|IBMPlexSansArabic-(Regular|SemiBold)|NotoSansArabic-Regular)$/.test(f.postScriptName), `${name}: fallback ${JSON.stringify(f)} ${row.text}`);
        if (f.postScriptName.startsWith('IBMPlex')) assert.equal(font, 'plex');
        if (f.postScriptName.startsWith('Noto')) assert.equal(font, 'noto');
      }
      fontObservations.push({ case: name, ...row, renderedFonts: fonts });
    }
  }
  const probes = [];
  for (const script of ['ar', 'en']) for (const weight of (script === 'ar' ? [400, 600] : [400, 500, 600, 700])) {
    const selector = `#probe-${script}${weight}`, fonts = await renderedFonts(selector);
    const ps = script === 'en' ? 'Inter-Regular' : font === 'noto' ? 'NotoSansArabic-Regular' : `IBMPlexSansArabic-${weight === 400 ? 'Regular' : 'SemiBold'}`;
    assert.ok(fonts.length === 1 && fonts[0].isCustomFont && fonts[0].postScriptName === ps, `${name}: ${selector} ${JSON.stringify(fonts)}`);
    assert.equal(await page.locator(selector).evaluate(e => getComputedStyle(e).fontWeight), String(weight));
    probes.push({ selector, weight, fonts });
  }
  await page.screenshot({ path: `${root}evidence/screenshots/${name}.png`, fullPage: true });
  // Tab through each interactive element, including opened tooltip content.
  const focus = [];
  const controlCount = await page.locator('a[href],button:not(:disabled),input,summary').count();
  for (let step = 0; step < controlCount; step++) {
    await page.keyboard.press('Tab');
    const f = await page.locator(':focus').evaluate(e => {
      const s = getComputedStyle(e); let a = e.parentElement, bg;
      while (a) { bg = getComputedStyle(a).backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)') break; a = a.parentElement; }
      return { tag: e.tagName, name: e.textContent.trim() || e.getAttribute('id'), width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor, background: bg };
    });
    assert.equal(f.style, 'solid', `${name}: focus ${f.name}`); assert.ok(parseFloat(f.width) >= 3);
    const ratio = contrast(f.color, f.background); assert.ok(ratio >= 3, `${name}: focus contrast`);
    pairs.set(`${theme}:${f.color}:${f.background}:focus`, { theme, foreground: f.color, background: f.background, role: 'focus', threshold: 3, ratio });
    focus.push(f);
    if (width === 320 && scale === 2 && step === controlCount - 1) await page.screenshot({ path: `${root}evidence/screenshots/focus-${name}.png`, fullPage: true });
  }
  cases.push({ name, font, role, lang, theme, width, scale, layout, textCount: text.length, probes, keyboard: focus, screenshot: `screenshots/${name}.png`, pass: true });
  if (cases.length % 20 === 0) console.log(`${cases.length}/160 responsive cases`);
}
// Record actual rest, hover, invalid, disabled, tooltip, semantic and chart pairs.
for (const theme of ['dark', 'light']) {
  await page.goto(`${base}?theme=${theme}&lang=en&role=patient`); await page.evaluate(() => document.fonts.ready);
  await page.locator('summary').click();
  for (const selector of ['.primary', '.action', 'input', '[aria-invalid]', 'button:disabled', '.tip', '.state.error', '.state.warning', '.state.success', '.tag', '.accent', '.bar']) {
    const target = page.locator(selector).first();
    for (const state of ['rest', 'hover']) {
      if (state === 'hover') await target.hover(); else await page.mouse.move(0, 0);
      const colors = await target.evaluate(e => {
        const s = getComputedStyle(e); let a = e.parentElement, adjacent;
        while (a) { adjacent = getComputedStyle(a).backgroundColor; if (adjacent !== 'rgba(0, 0, 0, 0)') break; a = a.parentElement; }
        return { foreground: s.color, background: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? adjacent : s.backgroundColor, border: s.borderTopColor, adjacent };
      });
      const ratio = contrast(colors.foreground, colors.background);
      if (selector !== '.bar') assert.ok(ratio >= 4.5, `${theme} ${selector} ${state}: text ${ratio}`);
      if (['.primary', '.action', 'input', '[aria-invalid]', 'button:disabled'].includes(selector)) {
        const boundary = contrast(colors.border, colors.adjacent); assert.ok(boundary >= 3, `${theme} ${selector} boundary ${boundary}`);
        pairs.set(`${theme}:${selector}:${state}:boundary`, { theme, selector, state, foreground: colors.border, background: colors.adjacent, role: 'meaningful boundary', threshold: 3, ratio: boundary });
      }
      if (selector !== '.bar') pairs.set(`${theme}:${selector}:${state}:text`, { theme, selector, state, ...colors, role: 'text', threshold: 4.5, ratio });
    }
  }
  await page.locator('#preview-action').click();
  assert.match(await page.locator('#preview-result').textContent(), /Nothing was saved/);
  await page.locator('#details-action').click(); assert.ok(await page.locator('details').evaluate(e => e.open));
  await page.screenshot({ path: `${root}evidence/screenshots/interaction-${theme}.png`, fullPage: true });
  interactions.push({ theme, tooltipOpen: true, previewWorks: true, savedData: false });
}
assert.equal(network.size, 4); assert.deepEqual(errors, []);
// Negative control: block all font assets, then verify the SAME rendered-font
// detector sees system fallback. Do not count this expected failure as positive QA.
const negativePage = await browser.newPage();
const expectedFailures = [];
negativePage.on('requestfailed', r => expectedFailures.push(r.url()));
await negativePage.route('**/*.ttf', r => r.abort());
await negativePage.goto(`${base}?lang=ar&font=plex`); await negativePage.evaluate(() => document.fonts.ready);
const nc = await negativePage.context().newCDPSession(negativePage);
await nc.send('DOM.enable'); await nc.send('CSS.enable');
const { root: nr } = await nc.send('DOM.getDocument');
const { nodeId: ni } = await nc.send('DOM.querySelector', { nodeId: nr.nodeId, selector: '#probe-ar600' });
const negativeFonts = (await nc.send('CSS.getPlatformFontsForNode', { nodeId: ni })).fonts;
assert.ok(expectedFailures.length > 0 && negativeFonts.some(f => !f.isCustomFont));
const report = { browser: await browser.version(), platform: process.platform, deviceScaleFactor: 1, cases, renderedFontObservations: fontObservations, fontNetwork: Object.fromEntries(network), errors, interactions, fallbackNegativeControl: { detected: true, expectedFailures, fonts: negativeFonts }, limits: ['Chromium Linux only', 'Computed text doubling is not native zoom', 'No physical devices, installed PWA, assistive technology, WebKit, Firefox, print or native Egyptian participant validation'] };
await writeFile(`${root}evidence/browser-qa.json`, JSON.stringify(report, null, 2) + '\n');
await writeFile(`${root}evidence/color-pairs.json`, JSON.stringify({ method: 'WCAG sRGB relative luminance; actual browser computed foreground/background; solid opaque surfaces', pairs: [...pairs.values()] }, null, 2) + '\n');
console.log(`PASS: ${cases.length} cases, ${fontObservations.length} rendered text observations, ${pairs.size} contrast pairs; fallback detector negative control passed`);
await browser.close();
