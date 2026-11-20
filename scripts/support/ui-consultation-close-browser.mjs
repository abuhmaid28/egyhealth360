/** Controlled HTTP presentation/error matrix; real close proof is separate. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const dictionary = {};
new Function(
  "exports",
  ts.transpileModule(readFileSync("apps/web/src/lib/i18n/ar.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(dictionary);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export async function testConsultationClose(browser, origin) {
  for (const locale of ["en", "ar"])
    for (const status of [0, 400, 401, 403, 404, 409, 503]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 1000 },
      });
      page.setDefaultTimeout(15000);
      const t = (k) => (locale === "ar" ? (dictionary.ar[k] ?? k) : k);
      const button = (k, scope = page) =>
        scope.getByRole("button", { name: t(k), exact: true });
      await page.addInitScript((locale) => {
        globalThis.localStorage.setItem("eh360-ui-mode", "live");
        globalThis.localStorage.setItem("eh360-locale", locale);
      }, locale);
      let closed = false,
        fail = status,
        release,
        entered;
      const arrived = new Promise((r) => (entered = r));
      const hold = new Promise((r) => (release = r));
      const writes = [],
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const context = () => ({
        id: id(1),
        encounterId: id(2),
        bookingId: id(3),
        providerId: id(4),
        clinicId: id(5),
        openedAt: "2026-10-31T10:00:00Z",
        closedAt: closed ? "2026-10-31T10:30:00Z" : null,
        state: closed ? "CLOSED" : "OPEN",
        bookingState: closed ? "CONSULTED" : "IN_CONSULTATION",
        version: closed ? 2 : 1,
      });
      await page.route("**/api/v1/**", async (route) => {
        const req = route.request(),
          path = new URL(req.url()).pathname;
        if (path.endsWith("/auth/me"))
          return route.fulfill({
            json: {
              data: {
                user: { role: "CLINICIAN", email: "synthetic@example.invalid" },
                csrfToken: "close-browser-csrf",
              },
            },
          });
        if (path.endsWith("/close")) {
          writes.push(req.postData());
          entered();
          if (status === 0) await hold;
          if (fail)
            return route.fulfill({
              status: fail,
              json: { error: { message: "PRIVATE_SQL_CANARY" } },
            });
          closed = true;
          const result = { ...context() };
          delete result.openedAt;
          return route.fulfill({ json: { data: result } });
        }
        if (path.endsWith("/consultation"))
          return route.fulfill({ json: { data: context() } });
        if (path.endsWith(`/me/bookings/${id(3)}`))
          return route.fulfill({
            json: {
              data: {
                id: id(3),
                slotId: id(6),
                providerId: id(4),
                clinicId: id(5),
                patientDisplayName: "Synthetic close patient · مريض للعرض",
                startAt: "2026-10-31T10:00:00Z",
                endAt: "2026-10-31T10:30:00Z",
                timeZone: "Africa/Cairo",
                state: closed ? "CONSULTED" : "IN_CONSULTATION",
                version: closed ? 3 : 2,
                createdAt: "2026-10-30T10:00:00Z",
                predecessorId: null,
                successorId: null,
                attendance: "ATTENDED",
                transitions: [],
                attendanceHistory: [],
              },
            },
          });
        return route.fulfill({
          json: { data: [], meta: { page: 1, pageSize: 20, total: 0 } },
        });
      });
      await page.goto(`${origin}/doctor/consultation/${id(3)}/documentation`);
      await page
        .getByLabel(t("Private note content"), { exact: true })
        .waitFor();
      if (status === 0) {
        for (const width of [1440, 1200, 1024, 834, 768, 560, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.waitForFunction(() => {
            const ribbon = globalThis.document.querySelector('.consultation-ribbon');
            const note = globalThis.document.querySelector('#doc-private');
            return parseFloat(globalThis.getComputedStyle(note).scrollMarginBlockStart) >= ribbon.getBoundingClientRect().height + 20;
          });
          await page.locator('.documentation-outline a[href="#doc-private"]').click();
          await page.waitForFunction(() => {
            const ribbon = globalThis.document.querySelector('.consultation-ribbon').getBoundingClientRect();
            const note = globalThis.document.querySelector('#doc-private').getBoundingClientRect();
            return note.top >= ribbon.bottom - 1;
          });
          for (const editor of await page.locator('.documentation-content textarea').all()) {
            await editor.focus();
            const editorBounds = await editor.boundingBox();
            const ribbonBounds = await page.locator('.consultation-ribbon').boundingBox();
            assert.ok(editorBounds.y >= ribbonBounds.y + ribbonBounds.height - 1, 'focused editor stays below patient context');
          }
        }
      }
      await button("Review & close consultation").click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox").check();
      assert.ok(!(await dialog.innerText()).includes("PRIVATE_SQL_CANARY"));
      assert.ok(
        await page.evaluate(
          () =>
            globalThis.document.documentElement.scrollWidth <=
            globalThis.innerWidth + 1,
        ),
      );
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await button("Confirm close consultation", dialog).click();
      await arrived;
      if (status === 0) {
        assert.equal(
          await button("Closing consultation…", dialog).isDisabled(),
          true,
        );
        await page.keyboard.press("Escape");
        assert.equal(
          await dialog.isVisible(),
          true,
          "pending close cannot be dismissed",
        );
        release();
        await dialog.waitFor({ state: "hidden" });
        await page
          .getByText(t("Closed · booking consulted"), { exact: true })
          .waitFor();
        assert.equal(writes.length, 1);
        assert.equal(await button("Review & close consultation").count(), 0);
      } else {
        await dialog.getByRole("alert").first().waitFor();
        assert.equal(writes.length, 1, "no automatic retry");
        assert.ok(
          !(await page.locator("body").innerText()).includes(
            "PRIVATE_SQL_CANARY",
          ),
        );
        if (status === 503) {
          fail = 0;
          await button("Retry unchanged close", dialog).click();
          await dialog.waitFor({ state: "hidden" });
          assert.equal(writes.length, 2);
          assert.equal(writes[0], writes[1]);
        } else if (status === 409) {
          closed = true;
          await button("Refresh consultation state", dialog).click();
          await button("Show closed consultation", dialog).click();
          await dialog.waitFor({ state: "hidden" });
          assert.equal(writes.length, 1);
        } else if (status === 401 || status === 404) {
          assert.equal(
            await page.getByRole("textbox").count(),
            0,
            "authority denial clears editors",
          );
        } else
          assert.equal(
            await button("Retry unchanged close", dialog).isDisabled(),
            true,
          );
      }
      if (closed)
        await page.waitForFunction(() =>
          globalThis.document.activeElement?.classList.contains("close-result"),
        );
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem("eh360-ui-mode"),
        ),
        "live",
      );
      assert.equal(
        await page.evaluate(() =>
          globalThis.localStorage.getItem("eh360-ui-demo-v1"),
        ),
        null,
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
  console.log(
    "PASS controlled Close EN/AR/RTL: pending dismissal guard, 400/401/403/404/409/503, authority editor clearing, manual same-key retry, stale/already-closed reconciliation, Live separation and mobile overflow.",
  );
}
