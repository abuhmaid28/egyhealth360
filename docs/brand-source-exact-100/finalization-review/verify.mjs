/* global document, getComputedStyle, innerWidth, outerWidth, devicePixelRatio, visualViewport */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const root = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(root, '../../..');
const previous = 'cca4942a75672f2fae1a79f771cae8e7070d2e1b';
const base = '5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3';
const source96 = 'cb3fd9112f15e17b3d500d7a9dd085dd6e412525';
const boardSHA = '0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417';
const hash = data => createHash('sha256').update(data).digest('hex');
const json = (name, value) => writeFileSync(resolve(root, 'evidence', name), JSON.stringify(value, null, 2) + '\n');
const git = args => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

if (!process.argv.includes('--inventory')) {
  const { chromium, firefox, webkit } = await import(process.env.EH_REVIEW_PLAYWRIGHT || '/tmp/eh-review-tools/node_modules/playwright/index.mjs');
  const boardPath = process.env.EH_BOARD_PATH || '/tmp/eh101-approved-board.png';
  if (!existsSync(boardPath)) {
    const blob = JSON.parse(execFileSync('gh', ['api', 'repos/abuhmaid28/egyhealth360/git/blobs/22a93818c30ec8feed68a5f3ad049c9856151bfe'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
    writeFileSync(boardPath, Buffer.from(blob.content, 'base64'));
  }
  const board = readFileSync(boardPath); assert.equal(hash(board), boardSHA);
  const origin = process.env.EH_REVIEW_ORIGIN || 'http://127.0.0.1:8100';
  const url = `${origin}/docs/brand-source-exact-100/finalization-review/comparison.html`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [], cases = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => errors.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  page.on('request', r => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) errors.push(`external ${r.url()}`); });
  for (const theme of ['dark', 'light']) {
    await page.goto(url); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(({ theme, board }) => {
      document.documentElement.dataset.theme = theme;
      document.querySelector('#theme-label').textContent = `${theme} review surface · evidence only · AP02 owner decision pending`;
      document.querySelectorAll('.themed').forEach(img => { img.src = `../assets/${img.dataset.file}-${theme}.svg`; });
      document.querySelector('#board-reference').src = `data:image/png;base64,${board}`;
      document.querySelector('#board-crop').dataset.ready = 'true';
      document.querySelector('#board-status').textContent = 'Hash-verified original board master crop (145,70,310,320); archival only, not a current primary asset.';
    }, { theme, board: board.toString('base64') });
    await page.evaluate(() => Promise.all(Array.from(document.images).filter(i => i.getAttribute('src')).map(i => i.decode())));
    const result = await page.evaluate(() => ({
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      nativeSizes: Array.from(document.querySelectorAll('.native-row img')).map(i => ({ file: i.getAttribute('src'), width: i.getBoundingClientRect().width, height: i.getBoundingClientRect().height, expected: Number(i.getAttribute('width')) })),
      images: Array.from(document.images).filter(i => i.getAttribute('src')).map(i => ({ src: i.id === 'board-reference' ? 'verified historical board data URL' : i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0 })),
    }));
    assert.equal(result.width, result.documentWidth); assert.ok(result.images.every(i => i.loaded));
    for (const i of result.nativeSizes) { assert.equal(i.width, i.expected); assert.equal(i.height, i.expected); }
    await page.locator('main').screenshot({ path: resolve(root, `evidence/material-${theme}.png`) });
    if (theme === 'dark') await page.locator('#small-sizes').screenshot({ path: resolve(root, 'evidence/native-sizes.png') });
    cases.push({ theme, pass: true, ...result });
  }
  await page.emulateMedia({ media: 'print' });
  const printPath = resolve(tmpdir(), 'eh101-finalization-print.pdf');
  const pdf = await page.pdf({ path: printPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  // Preserve the native PDF payload in gzip. Required PDF xref spaces must not
  // be edited to satisfy Git's text heuristic; no CI/attribute waiver is used.
  writeFileSync(resolve(root, 'evidence/chromium-print.pdf.gz'), gzipSync(pdf, { mtime: 0 }));
  const pdfInfo = execFileSync('pdfinfo', [printPath], { encoding: 'utf8' });
  const pdfPages = Number(pdfInfo.match(/^Pages:\s+(\d+)/m)?.[1]); assert.equal(pdfPages, 1);
  await browser.close(); assert.deepEqual(errors, []);
  const nativeZoom = [];
  for (const zoom of [1, 2]) {
    const profile = mkdtempSync(resolve(tmpdir(), 'eh101-final-zoom-')); mkdirSync(resolve(profile, 'Default'));
    writeFileSync(resolve(profile, 'Default/Preferences'), JSON.stringify({ partition: { default_zoom_level: { x: Math.log(zoom) / Math.log(1.2) } } }));
    const context = await chromium.launchPersistentContext(profile, { executablePath: '/usr/bin/chromium', headless: true, viewport: null, args: ['--no-sandbox', '--window-size=1280,960'] });
    try {
      const p = await context.newPage();
      await p.goto(`${origin}/docs/brand-source-exact-100/ap01-ap04-review/?lang=ar&font=plex&role=patient&theme=dark`); await p.evaluate(() => document.fonts.ready);
      const actual = await p.evaluate(() => ({ innerWidth, outerWidth, dpr: devicePixelRatio, visualScale: visualViewport.scale, titleSize: getComputedStyle(document.querySelector('h1')).fontSize, documentWidth: document.documentElement.scrollWidth }));
      const cdp = await context.newCDPSession(p); const layout = await cdp.send('Page.getLayoutMetrics');
      assert.equal(actual.innerWidth, 1280 / zoom); assert.equal(actual.dpr, zoom); assert.equal(actual.visualScale, 1); assert.equal(actual.titleSize, '30px'); assert.equal(actual.innerWidth, actual.documentWidth); assert.equal(layout.cssVisualViewport.zoom, zoom);
      nativeZoom.push({ zoom, pass: true, ...actual, nativeZoom: layout.cssVisualViewport.zoom, reusedApprovedSpecimen: true });
    } finally { await context.close(); rmSync(profile, { recursive: true, force: true }); }
  }
  const availability = { chromium: { path: '/usr/bin/chromium', tested: true }, edge: { path: '/usr/bin/microsoft-edge', exists: existsSync('/usr/bin/microsoft-edge'), tested: false }, firefox: { path: firefox.executablePath(), exists: existsSync(firefox.executablePath()), tested: false }, webkit: { path: webkit.executablePath(), exists: existsSync(webkit.executablePath()), tested: false }, safari: { available: false, tested: false, reason: 'No Apple Safari / OS' }, android: { available: false, tested: false, reason: 'No physical Android device' }, ios: { available: false, tested: false, reason: 'No physical Apple device' } };
  json('validation.json', { browser: execFileSync('/usr/bin/chromium', ['--version'], { encoding: 'utf8' }).trim(), platform: process.platform, kernel: execFileSync('uname', ['-sr'], { encoding: 'utf8' }).trim(), os: readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME=(.+)$/m)?.[1], availability, board: { sourceCommit: source96, sourcePath: 'docs/brand-identity-reconstruction/source/approved-board.png', sha256: boardSHA, bytes: board.length, crop: [145, 70, 310, 320], role: 'Historical material reference only' }, cases, nativeZoom, print: { method: 'Actual Chromium Page.printToPDF; A4 with backgrounds; parsed by Poppler pdfinfo; native payload retained in deterministic gzip', artifact: 'chromium-print.pdf.gz', payloadSha256: hash(pdf), pages: pdfPages, physicalPrintTested: false, colorManagementTested: false }, errors, limits: ['No actual Chrome-branded/Edge/Firefox/Safari result inferred from Chromium', 'No physical devices, OS text settings, installed PWA or physical print proof', 'No public distribution or legal clearance claim'] });
}

const exceptions = ['docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md'];
const old = git(['ls-tree', '-r', '--format=%(objectname) %(path)', previous]).trim().split('\n').map(line => ({ blob: line.slice(0, 40), path: line.slice(41) }));
const actual = execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], { cwd: repo, input: old.map(x => x.path).join('\n') + '\n', encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }).trim().split('\n');
const changed = old.filter((x, i) => x.blob !== actual[i]).map(x => x.path);
assert.ok(changed.every(p => exceptions.includes(p)), `Protected file changed: ${changed}`);
const svg = old.filter(x => /docs\/brand-source-exact-100\/(assets|source)\/.*\.svg$/.test(x.path)).map(x => ({ path: x.path, sha256: hash(readFileSync(resolve(repo, x.path))), blob: x.blob }));
assert.equal(svg.length, 23);
json('preservation.json', { method: 'Batch git hash-object of every baseline tracked file versus immutable baseline ls-tree blob IDs; no filter override; source/glyph files unchanged', baseline: previous, baseMain: base, baselineTree: git(['rev-parse', `${previous}^{tree}`]).trim(), baselineFiles: old.length, identical: old.length - changed.length, authorizedSummaryExceptions: changed, protectedSVGs: svg, approvedTypographyAndRoles: ['docs/brand-source-exact-100/ap01-ap04-review/evidence/font-provenance.json', 'docs/brand-source-exact-100/ap01-ap04-review/evidence/color-pairs.json'].map(path => ({ path, sha256: hash(readFileSync(resolve(repo, path))) })), reusedPriorEvidence: 'All pre-existing screenshots/JSON/PDF/fonts/assets included in whole-baseline identity proof; prior hash manifests are referenced, not rewritten.' });
const files = [];
function visit(dir) { for (const item of readdirSync(dir, { withFileTypes: true })) { const path = resolve(dir, item.name); if (item.isDirectory()) visit(path); else if (item.name !== 'inventory.json') { const bytes = readFileSync(path); files.push({ path: path.slice(repo.length + 1), bytes: bytes.length, sha256: hash(bytes) }); } } }
visit(root); files.sort((a, b) => a.path.localeCompare(b.path));
json('inventory.json', { selfExclusion: 'this inventory only', files, changedPathsFromAcceptedHead: [...exceptions, ...files.map(f => f.path), 'docs/brand-source-exact-100/finalization-review/evidence/inventory.json'].sort() });
console.log(`PASS: ${old.length - changed.length}/${old.length} prior files identical; ${svg.length} SVGs preserved; ${files.length} new artifacts inventoried`);
