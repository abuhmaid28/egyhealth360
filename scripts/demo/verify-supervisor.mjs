import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ar } from '../../apps/web/src/lib/i18n/ar.ts';
const origin = process.env.DEMO_URL || 'http://127.0.0.1:3200';
const evidence = process.env.DEMO_EVIDENCE || '/tmp/eh-supervisor-local';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.EH_UI_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true });
const results = [], errors = [], unsafe = [], failures = [];
try {
  for (const locale of ['en', 'ar']) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { const u = new URL(r.url()); if (u.origin !== origin || /\/api\//.test(u.pathname) || !['GET','HEAD'].includes(r.method())) unsafe.push(`${r.method()} ${u.origin}${u.pathname}`); });
      page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
      const t = s => locale === 'ar' ? ar[s] || s : s;
      const button = s => page.getByRole('button', { name: t(s), exact: true });
      const field = s => page.getByLabel(t(s), { exact: true });
      await page.goto(origin + '/');
      await page.getByRole('link', { name: 'Explore Patient My Care', exact: true }).click();
      await page.locator('[data-my-care]').waitFor();
      if (locale === 'ar') await button('العربية').click();
      await page.waitForFunction(l => globalThis.document.documentElement.lang === l, locale);
      const overflow = async label => assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 2), `${label}: ${locale} ${width} horizontal overflow`);
      await overflow('patient');
      await page.screenshot({ path: `${evidence}/patient-${locale}-${width}.png`, fullPage: true });
      // Working internal navigation and an actual local booking.
      await page.locator('.demo-notice a').first().click();
      const entryLink = page.locator('main a[href="/patient/"]').first();
      await entryLink.click();
      const hrefs = await page.locator('[data-my-care] a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/')));
      for (const href of new Set(hrefs)) { const response = await context.request.get(origin + href); assert.equal(response.status(), 200, `broken link ${href}`); }
      await page.locator('[data-my-care] a[href="/patient/discover/"]:visible').first().click();
      await page.locator('.demo-slots button').first().click();
      const c = (en, arabic) => locale === 'ar' ? arabic : en;
      await page.getByLabel(c('Reason for this demo appointment','سبب الموعد التجريبي')).fill('Fictional graduation review');
      await page.getByRole('button', { name: c('Confirm demo booking','أكد الحجز التجريبي'), exact: true }).click();
      await page.getByRole('status').filter({ hasText: c('Demo appointment booked','تم حجز الموعد التجريبي') }).waitFor();
      await page.locator('.demo-subnav a[href="/patient/appointments/"]').click();
      await page.getByText('Fictional graduation review', { exact: true }).waitFor();
      await overflow('appointments');
      // Same browser tab: no reload, fixture state lasts across Next navigation.
      await page.locator('.demo-notice a[href="/doctor/consultation/synthetic-visit/documentation/"]').click();
      await field('Complaint').fill('Synthetic review only');
      await button('Save findings draft').click();
      await field('Private note content').fill('PRIVATE DEMONSTRATION CANARY');
      await button('Save private note draft').click();
      await button('Sign private note').click();
      await button('Confirm private signing').click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await field('Patient summary content').fill('Public synthetic summary');
      await field('Patient instructions').fill('Fictional patient instructions');
      await button('Save summary draft').click();
      await button('Review sign and release').click();
      assert.ok(!(await page.getByRole('dialog').innerText()).includes('PRIVATE DEMONSTRATION CANARY'));
      await button('Confirm sign and release').click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await field('Clinician instruction').fill('Synthetic follow-up only');
      await button('Save follow-up draft').click();
      await button('Review follow-up release').click();
      await page.getByRole('dialog').getByRole('checkbox').check();
      await button('Sign and release follow-up').click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await overflow('clinician');
      await page.screenshot({ path: `${evidence}/clinician-${locale}-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: c('Review & close demo visit','راجع واقفل الزيارة التجريبية'), exact: true }).click();
      const close = page.getByRole('button', { name: c('Simulate closing visit','حاكي قفل الزيارة'), exact: true });
      assert.equal(await close.isDisabled(), true);
      await page.getByRole('dialog').getByRole('checkbox').check();
      await close.click();
      await page.getByText(c('Demo visit closed. Reload or reset to start again.','تم قفل الزيارة التجريبية. اعمل إعادة تحميل أو ابدأ العرض من جديد.'), { exact: true }).waitFor();
      assert.equal(await field('Complaint').isDisabled(), true);
      await page.locator('.demo-notice a[href="/patient/"]').click();
      await page.locator('[data-my-care] a[href="/patient/record/"]:visible').first().click();
      await page.waitForURL('**/patient/record/');
      await page.getByText('Public synthetic summary', { exact: true }).first().waitFor();
      await page.getByText('Synthetic follow-up only', { exact: true }).first().waitFor();
      assert.ok(!(await page.locator('main').innerText()).includes('PRIVATE DEMONSTRATION CANARY'));
      await page.locator('.demo-notice button').click();
      await page.waitForURL(origin + '/');
      await page.locator('.demo-notice a[href="/doctor/consultation/synthetic-visit/documentation/"]').click();
      assert.equal(await field('Private note content').inputValue(), '');
      results.push({ locale, width, landing:true, patient:true, booking:true, documentation:true, privateSigning:true, summaryRelease:true, followUp:true, reviewClose:true, patientProjection:true, reset:true, noOverflow:true });
      await context.close();
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(unsafe, []); assert.deepEqual(failures, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ origin, results, errors, unsafe, failures }, null, 2));
  console.log(JSON.stringify({ origin, scenarios: results.length, errors, unsafe, failures, evidence }));
} finally { await browser.close(); }
