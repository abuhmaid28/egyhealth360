import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./ui-my-care-browser.mjs";

const [baseline, candidate, evidence] = process.argv.slice(2);
for (const url of [baseline, candidate]) assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
assert.ok(evidence, "Pass an evidence directory");
const output = resolve(evidence);
const binary = process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium";
const axePath = process.env.UI_V2_AXE_PATH;
assert.ok(axePath, "Set UI_V2_AXE_PATH to the existing axe artifact");
await mkdir(output, { recursive: true });

const portals = [
  ["patient", "PATIENT", "/patient/discover"],
  ["doctor", "CLINICIAN", "/doctor/schedule"],
  ["pharmacy", "PHARMACY_STAFF", "/pharmacy"],
  ["lab", "LAB_STAFF", "/laboratory"],
  ["admin", "ADMIN", "/admin"],
];
const modes = ["light", "dark"];
const languages = ["en", "ar"];
const browser = await chromium.launch({ executablePath: binary });
const results = [], failures = [], traffic = { outside: 0, unexpectedApi: 0, writes: 0, pageErrors: 0 };

async function seed(context, origin, options) {
  const { role, lang, live = false, requests = [] } = options;
  const state = myCareDemoState();
  state.session.role = role;
  if (role === "CLINICIAN") state.session.name = state.appointments[0].provider.displayName;
  await context.addInitScript(({ lang, live, state }) => {
    globalThis.localStorage.setItem("eh360-locale", lang);
    globalThis.localStorage.setItem("eh360-ui-mode", live ? "live" : "demo");
    if (!live) globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(state));
  }, { lang, live, state });
  await context.route("**/*", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.protocol === "chrome:") return route.continue();
    if (url.origin !== origin) { traffic.outside++; return route.abort(); }
    if (request.method() !== "GET") { traffic.writes++; return route.abort(); }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (!live) { traffic.unexpectedApi++; return route.abort(); }
    requests.push(url.pathname + url.search);
    if (url.pathname === "/api/v1/auth/me") {
      return route.fulfill({ json: { data: {
        user: { id: "synthetic-shell-account", role, email: "shell-review@example.invalid" },
        csrfToken: "synthetic-shell-control",
      } } });
    }
    return route.fulfill({ status: 503, json: { error: { message: "SHELL_TEST_PRIVATE_CANARY" } } });
  });
}

async function open(page, origin, options) {
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) => { traffic.pageErrors++; console.error(error.message); });
  await page.goto(origin + options.path, { waitUntil: "domcontentloaded" });
  await page.locator(`[data-portal-shell="${options.role}"] #main`).waitFor();
  await page.locator("#main .loading").first().waitFor({ state: "hidden" });
  await page.evaluate(() => globalThis.document.fonts.ready);
}

async function at(origin, options, fn) {
  const context = await browser.newContext({
    viewport: { width: options.width, height: 844 }, colorScheme: options.theme,
    forcedColors: options.forcedColors ?? "none", reducedMotion: "reduce", serviceWorkers: "block",
  });
  try {
    await seed(context, origin, options);
    const page = await context.newPage();
    await open(page, origin, options);
    if (options.large) await enlarge(page);
    return await fn(page);
  } finally { await context.close(); }
}

async function enlarge(page) {
  await page.evaluate(() => {
    const nodes = [...globalThis.document.querySelectorAll("[data-portal-shell] > header *, [data-bottom-navigation] *")];
    const sizes = nodes.map((e) => parseFloat(globalThis.getComputedStyle(e).fontSize));
    nodes.forEach((e, i) => e.style.setProperty("font-size", sizes[i] * 2 + "px", "important"));
  });
}

async function semantics(page) {
  return page.evaluate(() => {
    const shell = globalThis.document.querySelector("[data-portal-shell]");
    const nodes = shell.querySelectorAll(":scope > header a, :scope > header summary, :scope > [data-bottom-navigation] a");
    return {
      role: shell.dataset.portalShell,
      language: shell.lang, direction: shell.dir,
      demo: !!shell.querySelector("[data-demo-indication]"),
      switcher: !!shell.querySelector("[data-workspace-switch]"),
      entries: [...nodes].map((e) => [e.getAttribute("href"), e.getAttribute("aria-current"), e.getAttribute("aria-label") ?? e.textContent.trim()]),
    };
  });
}

async function geometry(page) {
  return page.evaluate(() => {
    const d = globalThis.document;
    const shell = d.querySelector("[data-portal-shell]");
    const header = shell.querySelector(":scope > header");
    const dock = shell.querySelector(":scope > [data-bottom-navigation]");
    const exposed = (e) => e.getClientRects().length > 0 && (!e.closest("details:not([open])") || !!e.closest("summary"));
    const groups = [header, ...(dock?.getClientRects().length ? [dock] : [])];
    const fragments = [], small = [];
    for (const group of groups) {
      const words = d.createTreeWalker(group, globalThis.NodeFilter.SHOW_TEXT);
      for (let node = words.nextNode(); node; node = words.nextNode()) {
        if (!exposed(node.parentElement)) continue;
        for (const word of node.data.matchAll(/[\p{L}\p{M}]{2,}/gu)) {
          const r = d.createRange();
          r.setStart(node, word.index); r.setEnd(node, word.index + word[0].length);
          const lines = new Set([...r.getClientRects()].filter((b) => b.width > 0).map((b) => Math.round(b.top)));
          if (lines.size > 1) fragments.push(word[0]);
        }
      }
      for (const e of [...group.querySelectorAll("a[href], button:not([disabled]), summary")].filter(exposed)) {
        const r = e.getBoundingClientRect();
        if (r.width < 43.9 || r.height < 43.9) small.push({ label: e.getAttribute("aria-label") ?? e.textContent.trim(), width: r.width, height: r.height });
      }
    }
    const nav = dock?.getClientRects().length
      ? { position: globalThis.getComputedStyle(dock).position, tracks: globalThis.getComputedStyle(dock).gridTemplateColumns, paddingEnd: globalThis.getComputedStyle(dock).paddingBlockEnd }
      : null;
    return { width: globalThis.innerWidth, dpr: globalThis.devicePixelRatio, overflow: d.documentElement.scrollWidth - globalThis.innerWidth,
      header: header.getBoundingClientRect().height, fragments, small, nav };
  });
}

async function focusedTarget(page) {
  return page.evaluate(() => {
    const d = globalThis.document, e = d.activeElement;
    if (!e || e === d.body || e === d.documentElement) return null;
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = Math.min(6, r.width / 3), dy = Math.min(6, r.height / 3);
    const points = [[cx, cy], [r.left + dx, cy], [r.right - dx, cy], [cx, r.top + dy], [cx, r.bottom - dy]];
    const style = globalThis.getComputedStyle(e);
    return {
      index: [...d.querySelectorAll("a[href],button,input,select,textarea,summary,[tabindex]")].indexOf(e),
      label: e.getAttribute("aria-label") ?? e.textContent.trim().slice(0, 65), href: e.getAttribute("href"),
      section: e.closest("[data-bottom-navigation]") ? "dock" : e.closest("header") ? "header" : e.closest("main") ? "main" : "other",
      visible: r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= globalThis.innerWidth + 1 &&
        r.top >= -1 && r.bottom <= globalThis.innerHeight + 1,
      hit: points.every(([x, y]) => e.contains(d.elementFromPoint(x, y))),
      focus: e.matches(":focus-visible"),
      ring: style.outlineStyle !== "none" || style.boxShadow !== "none" ||
        (e.parentElement && globalThis.getComputedStyle(e.parentElement).outlineStyle !== "none"),
    };
  });
}

async function traverse(page, direction = "Tab") {
  const targets = [];
  const seen = new Set();
  const limit = await page.evaluate(() => globalThis.document.querySelectorAll("a[href],button,input,select,textarea,summary,[tabindex]").length + 3);
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press(direction);
    const target = await focusedTarget(page);
    if (!target) return targets;
    if (seen.has(target.index)) {
      assert.equal(target.index, targets[0].index, "Keyboard focus looped within the page");
      return targets;
    }
    seen.add(target.index);
    targets.push(target);
  }
  assert.fail("Native tab traversal did not reach the end of the page");
}

function assertReachable(targets) {
  assert.ok(targets.length > 0, "No keyboard targets observed");
  const problems = targets.filter((e) => !e.visible || !e.hit || !e.focus || (!e.ring && e.section !== "main"));
  assert.deepEqual(problems, [], "Obscured, clipped, or unmarked keyboard targets");
}

async function menus(page, demo) {
  const header = page.locator("[data-portal-shell] > header");
  const account = header.locator("details > summary[aria-label]").last();
  const summaries = demo ? [header.locator("[data-workspace-switch] > summary"), account] : [account];
  let checks = 0;
  for (const summary of summaries) {
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await summary.evaluate((e) => e.parentElement.open), true);
    const panel = summary.locator("xpath=..");
    const actions = await panel.locator("button:not([disabled]), a[href], select").count();
    assert.ok(actions > 0);
    for (let i = 0; i < actions; i++) {
      await page.keyboard.press("Tab");
      assert.ok(await panel.evaluate((e) => e.contains(globalThis.document.activeElement)), "Keyboard focus left the open disclosure early");
      assertReachable([await focusedTarget(page)]);
      checks++;
    }
    await page.keyboard.press("Escape");
    assert.equal(await summary.evaluate((e) => !e.parentElement.open && globalThis.document.activeElement === e), true);
  }
  return checks;
}

async function capture(page, name, zoom = false) {
  const file = join(output, name + ".png");
  if (!zoom) {
    await page.evaluate(async () => {
      const images = [...globalThis.document.images].filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < globalThis.innerHeight && rect.bottom > 0;
      });
      await Promise.race([
        Promise.all(images.map((image) => image.decode().catch(() => {}))),
        new Promise((_, reject) => globalThis.setTimeout(() => reject(new Error("Visible images did not decode before screenshot")), 20000)),
      ]);
      await new Promise((done) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(done)));
    });
    return page.screenshot({ path: file, animations: "disabled" });
  }
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const bytes = globalThis.Buffer.from(data, "base64");
    assert.equal(bytes.readUInt32BE(16), 640);
    await writeFile(file, bytes);
    return bytes;
  } finally { await session.detach(); }
}

async function assertScreenshotParity(page, before, after) {
  if (before.equals(after)) return 0;
  const differences = await page.evaluate(async (images) => {
    const decoded = await Promise.all(images.map(async (source) => {
      const image = new globalThis.Image();
      image.src = "data:image/png;base64," + source;
      await image.decode();
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data };
    }));
    const [first, second] = decoded;
    if (first.width !== second.width || first.height !== second.height) return { sizeChanged: true };
    const authoredImages = [...globalThis.document.querySelectorAll("main img, main [data-discovery-portrait]")]
      .map((element) => element.getBoundingClientRect());
    let pixels = 0, outsideImages = 0, maxDelta = 0;
    for (let i = 0; i < first.data.length; i += 4) {
      const delta = Math.max(...[0, 1, 2, 3].map((channel) => Math.abs(first.data[i + channel] - second.data[i + channel])));
      if (!delta) continue;
      pixels++;
      maxDelta = Math.max(maxDelta, delta);
      const x = (i / 4) % first.width, y = Math.floor(i / 4 / first.width);
      if (!authoredImages.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) outsideImages++;
    }
    return { pixels, outsideImages, maxDelta };
  }, [before.toString("base64"), after.toString("base64")]);
  // Chromium can rasterize the curved edges of portraits and their decorative frames differently across
  // runs. Any changed shell pixel, missing image or appreciable image change fails.
  assert.ok(!differences.sizeChanged && differences.outsideImages === 0 &&
    differences.pixels <= 200 && differences.maxDelta <= 40, JSON.stringify(differences));
  return differences.pixels;
}

async function audit(page, options) {
  const m = await geometry(page);
  assert.equal(m.width, options.width);
  assert.ok(m.overflow <= 1, "Horizontal overflow");
  assert.deepEqual(m.fragments, []);
  assert.deepEqual(m.small, [], "Header and dock actions must be at least 44×44 CSS px");
  if (options.role === "PATIENT" && options.path !== "/patient" && options.width <= 760) {
    assert.equal(m.nav?.position, "static");
    assert.equal(m.nav.tracks.trim().split(/\s+/).length, 2);
    const s = await semantics(page);
    const existing = s.entries.map(([href]) => href);
    for (const destination of ["/patient", "/patient/discover", "/patient/history", "/patient/settings"]) {
      assert.ok(existing.filter((href) => href === destination).length >= 2, `Header alternative for ${destination}`);
    }
  } else assert.equal(m.nav, null);
  const expected = await page.evaluate(() => [...globalThis.document.querySelectorAll(
    "a[href],button,input,select,textarea,summary,[tabindex]",
  )].flatMap((element, index) => {
    const shellControl = element.closest("[data-portal-shell] > header,[data-bottom-navigation]");
    const closedDisclosure = element.closest("details:not([open])") && !element.closest("summary");
    return shellControl && !closedDisclosure && !element.matches(":disabled") && element.tabIndex >= 0 &&
      element.getClientRects().length ? [index] : [];
  }));
  const targets = await traverse(page);
  assertReachable(targets);
  const visited = new Set(targets.map((target) => target.index));
  assert.deepEqual(expected.filter((index) => !visited.has(index)), [], "Shell controls missing from native traversal");
  if (options.reverse) {
    const reverse = await traverse(page, "Shift+Tab");
    assertReachable(reverse);
    assert.deepEqual(reverse.map((e) => e.index), targets.map((e) => e.index).reverse(), "Reverse tab order differs");
  }
  return { geometry: m, targets: targets.length };
}

const work = [];
function enqueue(name, run) { work.push({ name, run }); }
const selector = process.env.UI_SHELL_CASE;
for (const [portal, role, path] of portals) {
  for (const width of [320, 390, 768, 1440]) for (const lang of languages) for (const theme of modes) {
    const options = { role, path, width, lang, theme, reverse: width === 320 };
    const name = `${portal}-${width}-${lang}-${theme}`;
    enqueue(name, async () => {
      const original = await at(baseline, options, async (p) => ({
        semantics: await semantics(p),
        ...(width === 1440 || (portal === "patient" && width === 390 && lang === "ar" && theme === "dark")
          ? { screenshot: await capture(p, name + "-before") } : {}),
      }));
      return at(candidate, options, async (p) => {
        assert.deepEqual(await semantics(p), original.semantics);
        const screenshot = original.screenshot && await capture(p, name + "-after");
        const desktopPortraitPixelDelta = width === 1440 ? await assertScreenshotParity(p, original.screenshot, screenshot) : null;
        return { ...await audit(p, options), desktopPortraitPixelDelta };
      });
    });
  }
  for (const width of [320, 390]) for (const lang of languages) for (const theme of modes) {
    const options = { role, path, width, lang, theme, large: true, reverse: true };
    const name = `text-${portal}-${width}-${lang}-${theme}`;
    enqueue(name, async () => {
      const proof = portal === "patient" && width === 320 && theme === "dark";
      if (proof) await at(baseline, options, (p) => capture(p, name + "-before"));
      return at(candidate, options, async (p) => {
        if (proof) await capture(p, name + "-after");
        const observed = await audit(p, options);
        const menuTargets = await menus(p, true);
        if (proof) await p.locator("[data-bottom-navigation]").screenshot({ path: join(output, name + "-dock.png") });
        return { ...observed, menuTargets };
      });
    });
  }
  for (const lang of languages) enqueue(`intercepted-${portal}-${lang}`, async () => {
    const mode = { role, path, width: 320, lang, theme: "dark", live: true };
    const run = async (origin) => {
      const requests = [];
      return at(origin, { ...mode, requests }, async (p) => {
        const route = await semantics(p);
        assert.equal(route.demo || route.switcher, false);
        const text = await p.locator("#main").innerText();
        assert.doesNotMatch(text, /SHELL_TEST_PRIVATE_CANARY/);
        if (origin === candidate) await audit(p, mode);
        return { route, text, requests: [...requests].sort() };
      });
    };
    assert.deepEqual(await run(candidate), await run(baseline));
  });
}
enqueue("patient-profile-link-keyboard-and-native-select", () => at(candidate, {
  role: "PATIENT", path: "/patient/discover", width: 320, lang: "ar", theme: "dark", forcedColors: "active",
}, async (p) => {
  await p.locator("#expressive-doctor-search").focus();
  await p.keyboard.press("Tab");
  const specialty = p.locator("#expressive-specialty");
  assert.equal(await specialty.evaluate((e) => e === globalThis.document.activeElement && e instanceof globalThis.HTMLSelectElement), true);
  await p.keyboard.press("ArrowDown");
  assert.equal(await specialty.inputValue(), "internal-medicine");
  assert.equal(await p.evaluate(() => globalThis.matchMedia("(forced-colors: active)").matches && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches), true);
  const cta = p.locator("[data-expressive-discovery] article a");
  assert.equal(await cta.count(), 1);
  await cta.focus();
  assertReachable([await focusedTarget(p)]);
  await p.keyboard.press("Enter");
  await p.waitForURL("**/patient/doctors/mariam-hassan");
  await p.goBack();
  await p.locator("[data-expressive-discovery]").waitFor();
}));
enqueue("safe-area-and-workspace-switch", () => at(candidate, {
  role: "PATIENT", path: "/patient/discover", width: 320, lang: "ar", theme: "dark",
}, async (p) => {
  const session = await p.context().newCDPSession(p);
  await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 26, right: 12, bottom: 34, left: 10 } });
  try {
    assert.equal((await geometry(p)).nav.paddingEnd, "34px");
    assertReachable(await traverse(p));
    const options = p.locator("[data-workspace-switch]");
    await options.locator("summary").focus();
    await p.keyboard.press("Enter");
    assert.equal(await options.locator("[data-workspace-role]").count(), 5);
    await options.locator('[data-workspace-role="PHARMACY_STAFF"]').focus();
    await p.keyboard.press("Enter");
    await p.waitForURL("**/pharmacy");
    await p.locator('[data-portal-shell="PHARMACY_STAFF"]').waitFor();
  } finally { await session.detach(); }
}));
for (const [portal, role, path] of portals) for (const lang of languages) enqueue(`actual-page-zoom-${portal}-${lang}`, async () => {
  const profile = await mkdtemp(join(tmpdir(), "eh-shell-zoom-"));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: binary, viewport: null, args: ["--window-size=640,1740"], colorScheme: "dark",
    reducedMotion: "reduce",
  });
  try {
    const options = { role, path, width: 320, lang, reverse: true };
    await seed(context, candidate, options);
    const settings = await context.newPage();
    await settings.goto("chrome://settings/appearance");
    const select = settings.getByRole("combobox", { name: "Page zoom", exact: true });
    assert.equal((await select.locator("option:checked").innerText()).trim(), "100%");
    await select.selectOption({ label: "200%" });
    assert.equal((await select.locator("option:checked").innerText()).trim(), "200%");
    const page = context.pages()[0];
    await open(page, candidate, options);
    await page.waitForFunction(() => globalThis.devicePixelRatio === 2);
    if (portal === "patient") await capture(page, `page-zoom-200-${lang}-after`, true);
    return await audit(page, options);
  } finally {
    await context.close();
    await rm(profile, { recursive: true });
  }
});
for (const [name, path] of [["my-care", "/patient"], ["clinic", "/patient/clinics/cairo-clinic"], ["profile", "/patient/doctors/mariam-hassan"]]) {
  enqueue(`unrelated-${name}`, async () => {
    const opts = { role: "PATIENT", path, width: name === "my-care" ? 320 : 1440, lang: "en", theme: "light" };
    const before = await at(baseline, opts, (p) => capture(p, name + "-before"));
    return at(candidate, opts, async (p) => ({ portraitPixelDelta: await assertScreenshotParity(p, before, await capture(p, name + "-after")) }));
  });
}
for (const lang of languages) enqueue(`axe-${lang}`, () => at(candidate, {
  role: "PATIENT", path: "/patient/discover", width: 320, lang, theme: lang === "ar" ? "dark" : "light", large: true,
}, async (p) => {
  await p.addScriptTag({ path: axePath });
  const issueIds = await p.evaluate(async () => (await globalThis.axe.run(globalThis.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  })).violations.map((v) => ({ id: v.id, selectors: v.nodes.map((n) => n.target) })));
  assert.deepEqual(issueIds, []);
}));
try {
  const matrix = selector ? work.filter((job) => job.name.includes(selector)) : work;
  assert.ok(matrix.length > 0);
  for (let i = 0; i < matrix.length; i += 4) {
    await Promise.all(matrix.slice(i, i + 4).map(async ({ name, run }) => {
      try { results.push({ name, ...await run() }); console.log("PASS", name); }
      catch (error) { failures.push({ name, message: error.message }); console.error(name, error.stack); }
    }));
  }
} finally {
  await browser.close();
  await writeFile(join(output, "results.json"), JSON.stringify({ results, failures, traffic }, null, 2) + "\n");
}
console.log(JSON.stringify({ cases: results.length, failed: failures.length, traffic }));
assert.deepEqual(traffic, { outside: 0, unexpectedApi: 0, writes: 0, pageErrors: 0 });
assert.deepEqual(failures, []);
