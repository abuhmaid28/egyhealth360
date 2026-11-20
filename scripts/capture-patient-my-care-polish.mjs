/** Final optical evidence only; existing synthetic fixtures, no API/DB mutations. */
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState } from "./support/ui-my-care-browser.mjs";

const output = resolve("docs/ui-reference/polish-evidence");
const origin = process.env.MY_CARE_ORIGIN ?? "http://127.0.0.1:3222";
const baseline = JSON.parse(
  await readFile(
    "docs/ui-reference/composition-evidence/patient-my-care-visual.json",
    "utf8",
  ),
);
const results = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.EH_UI_CHROMIUM ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(30_000);
    await page.addInitScript(
      ({ locale, state }) => {
        globalThis.localStorage.setItem("eh360-locale", locale);
        globalThis.localStorage.setItem("eh360-ui-mode", "demo");
        globalThis.localStorage.setItem(
          "eh360-ui-demo-v1",
          JSON.stringify(state),
        );
      },
      { locale, state: myCareDemoState() },
    );
    await page.goto(origin + "/patient");
    await page
      .locator('[data-appointment-anchor] a[href$="demo-my-care-visit"]')
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    const measure = () =>
      page.evaluate((locale) => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const words = (el) => {
          const node = el.firstChild,
            lines = new Set(),
            items = [];
          const parent = el.parentElement.getBoundingClientRect();
          for (const match of node.textContent.matchAll(/\S+/gu)) {
            const range = globalThis.document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const rects = [...range.getClientRects()];
            rects.forEach((r) => lines.add(Math.round(r.top)));
            items.push({
              text: match[0],
              lines: new Set(rects.map((r) => Math.round(r.top))).size,
              contained: rects.every(
                (r) =>
                  r.left >= parent.left - 0.5 && r.right <= parent.right + 0.5,
              ),
            });
          }
          return {
            text: el.textContent,
            lines: lines.size,
            words: items,
            fontSize: globalThis.getComputedStyle(el).fontSize,
            wrap: globalThis.getComputedStyle(el).overflowWrap,
            box: box(el),
          };
        };
        const root = globalThis.document.querySelector("[data-my-care]"),
          main = root.querySelector("main"),
          grid = main.querySelector("[data-appointment-anchor]").parentElement;
        return {
          locale,
          viewport: {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight,
          },
          scrollWidth: globalThis.document.documentElement.scrollWidth,
          anchor: box(root.querySelector("[data-appointment-anchor]")),
          main: box(main),
          gridColumns: globalThis.getComputedStyle(grid).gridTemplateColumns,
          gridGap: globalThis.getComputedStyle(grid).columnGap,
          shortcuts: box(root.querySelector("[data-care-shortcuts]")),
          shortcutItems: [
            ...root.querySelectorAll("[data-care-shortcuts] > *"),
          ].map(box),
          labels: [
            ...root.querySelectorAll("[data-care-shortcuts] strong"),
          ].map(words),
          bottomLabels: [
            ...root.querySelectorAll("[data-bottom-navigation] span"),
          ].map(words),
          bottomItems: [
            ...root.querySelectorAll("[data-bottom-navigation] a"),
          ].map(box),
          demoDisclosure: root
            .querySelector("[data-demo-indication]")
            .textContent.trim(),
          demoDefaultClosed: !root.querySelector("[data-demo-utility]").open,
          demoInGreeting: !!main.querySelector("[data-demo-indication]"),
        };
      }, locale);
    const capture = async (name, full = false) => {
      const sheet = full
        ? await page.addStyleTag({
            content: "[data-bottom-navigation]{position:static!important}",
          })
        : null;
      await page.screenshot({
        path: resolve(output, `patient-my-care-${name}-${locale}.png`),
        fullPage: full,
      });
      if (sheet) await sheet.evaluate((el) => el.remove());
    };
    const desktop = await measure();
    const before = baseline.measurements.find(
      (m) => m.locale === locale && m.viewport.width === 1600,
    );
    assert.equal(
      desktop.anchor.height,
      before.anchorHeight,
      "Accepted appointment height remains exact",
    );
    assert.equal(desktop.anchor.width, before.anchorWidth);
    assert.equal(desktop.shortcuts.width, 1360);
    assert.equal(desktop.gridGap, "24px");
    assert.ok(desktop.demoDefaultClosed && !desktop.demoInGreeting);
    results.push({ kind: "desktop", ...desktop });
    await capture("desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await measure();
    assert.equal(new Set(mobile.shortcutItems.map((r) => r.y)).size, 1);
    for (const label of mobile.labels) {
      assert.ok(
        label.lines <= 2 && label.words.every((w) => w.lines === 1),
        JSON.stringify(label),
      );
      assert.notEqual(label.wrap, "anywhere");
    }
    for (const item of mobile.bottomItems)
      assert.ok(item.width >= 44 && item.height >= 44);
    for (const label of mobile.bottomLabels)
      assert.ok(label.words.every((w) => w.lines === 1));
    results.push({ kind: "mobile", ...mobile });
    await capture("mobile");
    await capture("mobile-full", true);
    await page.setViewportSize({ width: 320, height: 844 });
    const narrow = await measure();
    assert.ok(narrow.scrollWidth <= 320);
    assert.ok(
      narrow.labels.every((l) =>
        l.words.every((w) => w.lines === 1 && w.contained),
      ),
    );
    results.push({ kind: "320", ...narrow });
    await capture("320", true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const sizes = [
        ...globalThis.document.querySelectorAll("[data-my-care] *"),
      ].map((el) => [el, parseFloat(globalThis.getComputedStyle(el).fontSize)]);
      for (const [el, size] of sizes) el.style.fontSize = `${size * 2}px`;
    });
    const enlarged = await measure();
    assert.ok(enlarged.scrollWidth <= 390, `${locale} text scaling overflow`);
    for (const label of [...enlarged.labels, ...enlarged.bottomLabels])
      assert.ok(
        label.words.every((w) => w.lines === 1 && w.contained),
        JSON.stringify(label),
      );
    results.push({ kind: "200%", ...enlarged });
    await capture("text-200", true);
    await page.close();
  }
  await writeFile(
    resolve(output, "optical-checks.json"),
    JSON.stringify(
      { base: "47fa8e8bafaac1b96d4ba0065a65250f80448156", results },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: 10 fresh optical captures; desktop width/appointment height preserved, four 390px shortcuts, intact label words, touch targets, 320px and 200% reflow.",
  );
} finally {
  await browser.close();
}
