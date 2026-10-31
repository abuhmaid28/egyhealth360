/** Public synthetic Browser → existing Vercel Next → Nest → Neon. No response mocks. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app';
const output = '/workspace/staging-evidence';
if (!process.env.EH_DEMO_PASSWORD || process.env.EH_DEMO_PASSWORD.length < 16) throw new Error('Private synthetic credential required');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
const contexts = [];
const checks = [];
const errors = [];
const mark = message => { checks.push(message); console.log('PASS ' + message); };
const button = (p, name) => p.getByRole('button', { name, exact: true });
async function account(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { globalThis.localStorage.setItem('eh360-ui-mode', 'live'); globalThis.localStorage.setItem('eh360-locale', 'en'); });
  await page.goto(origin);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(process.env.EH_DEMO_PASSWORD);
  await button(page, 'Sign in with live account').click();
  await page.getByText('Live API', { exact: true }).waitFor();
  const cookies = await context.cookies();
  const session = cookies.find(c => c.name === '__Host-eh_session');
  assert.ok(session?.secure && session.httpOnly && session.sameSite === 'Lax' && session.path === '/');
  return page;
}
async function command(page, path, method = 'GET', body, csrf = true) {
  return page.evaluate(async ({ path, method, body, csrf }) => {
    const auth = await (await fetch('/api/v1/auth/me', { cache: 'no-store' })).json();
    const response = await fetch('/api/v1' + path, {
      method, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': auth.data.csrfToken } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text(); return { status: response.status, data: raw ? JSON.parse(raw) : null };
  }, { path, method, body, csrf });
}
async function clickWrite(page, name, suffix) {
  const response = page.waitForResponse(r => r.url().includes('/api/v1/') && r.url().endsWith(suffix) && ['POST', 'PUT'].includes(r.request().method()));
  await button(page, name).click(); assert.ok([200, 201].includes((await response).status()));
  await page.getByText('Saving…', { exact: true }).waitFor({ state: 'hidden' });
}
let patient, doctor, bookingId = process.env.EH_STAGING_BOOKING_ID;
try {
  doctor = await account('eh-m1-clinician-assigned@example.invalid');
  patient = await account('eh-m1-patient-a@example.invalid');
  assert.equal((await command(patient, '/health')).status, 200);
  mark('frontend HTTPS, proxied API health, hosted login and secure sessions');
  assert.equal((await command(patient, '/auth/logout', 'POST', {}, false)).status, 403);
  mark('CSRF-free mutation rejected');
  const providers = await command(patient, '/directory/providers');
  assert.equal(providers.status, 200); const provider = providers.data.data[0]; assert.ok(provider.id);
  if (!bookingId) {
  await doctor.goto(origin + '/doctor/availability');
  await doctor.getByLabel('Publication clinic', { exact: true }).selectOption({ index: 1 });
  const start = new Date(Math.ceil((Date.now() + 90000) / 60000) * 60000);
  const end = new Date(start.getTime() + 300000);
  await doctor.getByLabel('Starts at', { exact: true }).fill(start.toISOString());
  await doctor.getByLabel('Ends at', { exact: true }).fill(end.toISOString());
  await clickWrite(doctor, 'Publish interval', '/me/availability');
  await patient.goto(origin + '/patient/doctors/' + provider.id);
  await patient.locator('.live-slots button').last().click();
  await button(patient, 'Review live booking').click();
  const booked = patient.waitForResponse(r => r.url().endsWith('/api/v1/me/bookings') && r.request().method() === 'POST');
  await button(patient, 'Confirm live booking').click();
  const receipt = await booked; assert.equal(receipt.status(), 200); bookingId = (await receipt.json()).data.id;
  await patient.waitForURL('**/patient/appointments/' + bookingId);
  mark('clinician availability publication and patient booking through public UI');
  await doctor.goto(origin + '/doctor/schedule');
  await doctor.locator(`a[href="/doctor/appointments/${bookingId}"]`).waitFor();
  mark('clinician schedule shows the hosted booking');
  console.log('Waiting for the real published start time; no clock/record backdating.');
  while (Date.now() < start.getTime() + 1500) await new Promise(resolve => setTimeout(resolve, Math.min(10000, start.getTime() + 1500 - Date.now())));
  await doctor.goto(origin + '/doctor/appointments/' + bookingId);
  await button(doctor, 'Start consultation').click();
  await button(doctor, 'Confirm opening').click();
  await doctor.getByRole('link', { name: 'View opening details', exact: true }).click();
  await doctor.getByRole('link', { name: 'Open clinical documentation', exact: true }).click();
  } else {
    assert.match(bookingId, /^[a-f0-9-]{36}$/);
    await doctor.goto(origin + '/doctor/consultation/' + bookingId + '/documentation');
  }
  await doctor.getByLabel('Private note content', { exact: true }).waitFor();
  mark('consultation opens with current treating authority');
  const privateText = 'SYNTHETIC_STAGING_PRIVATE_' + bookingId;
  const summary = 'Synthetic hosted visit summary ' + bookingId;
  const followup = 'Synthetic hosted follow-up instruction ' + bookingId;
  if (await doctor.getByLabel('Private note content', { exact: true }).inputValue() !== privateText) {
    await doctor.getByLabel('Private note content', { exact: true }).fill(privateText);
    await clickWrite(doctor, 'Save private note draft', '/documents');
  }
  if (await doctor.getByLabel('Patient summary content', { exact: true }).inputValue() !== summary) {
    await doctor.getByLabel('Patient summary content', { exact: true }).fill(summary);
    await clickWrite(doctor, 'Save summary draft', '/documents');
  }
  const follow = doctor.getByRole('region', { name: 'Follow-up instructions', exact: true });
  if (!await follow.getByText(followup, { exact: true }).count()) {
    await follow.getByLabel('Clinician instruction', { exact: true }).fill(followup);
    await clickWrite(doctor, 'Save follow-up draft', '/follow-up-intents');
  }
  await follow.getByText('Draft · clinician only', { exact: true }).waitFor();
  const writes = [];
  doctor.on('request', r => { if (['POST', 'PUT'].includes(r.method()) && r.url().includes('/api/v1/')) writes.push(r.url()); });
  await doctor.reload();
  await doctor.getByLabel('Private note content', { exact: true }).waitFor();
  assert.equal(writes.length, 0); assert.equal(await doctor.getByLabel('Private note content', { exact: true }).inputValue(), privateText);
  mark('clinical drafts persist; reload recovers context without mutations');
  const visible = async () => JSON.stringify([await command(patient, '/me/summaries'), await command(patient, '/me/follow-up-intents')]);
  const before = await visible();
  for (const text of [privateText, summary, followup]) assert.ok(!before.includes(text));
  mark('private note, summary draft and follow-up draft hidden from patient');
  await button(doctor, 'Review sign and release').click();
  await clickWrite(doctor, 'Confirm sign and release', '/release');
  const summaryOnly = await visible(); assert.ok(summaryOnly.includes(summary)); assert.ok(!summaryOnly.includes(followup) && !summaryOnly.includes(privateText));
  mark('explicit summary release is independent of private note and follow-up');
  await button(doctor, 'Review follow-up release').click();
  await doctor.getByRole('dialog').getByRole('checkbox').check();
  await clickWrite(doctor, 'Sign and release follow-up', '/release');
  const released = await visible(); assert.ok(released.includes(summary) && released.includes(followup)); assert.ok(!released.includes(privateText));
  mark('explicit FollowUpIntent release; private note remains private');
  await button(doctor, 'Review & close consultation').click();
  const dialog = doctor.getByRole('dialog');
  assert.equal(await button(dialog, 'Confirm close consultation').isDisabled(), true);
  await dialog.getByRole('checkbox').check();
  for (const width of [1440, 390]) {
    await doctor.setViewportSize({ width, height: 1000 });
    assert.ok(await doctor.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
    await doctor.screenshot({ path: `${output}/en-${width}-review.png` });
  }
  await doctor.keyboard.press('Escape'); await button(doctor, 'العربية').click();
  assert.equal(await doctor.locator('html').getAttribute('dir'), 'rtl');
  await button(doctor, 'مراجعة وإغلاق الاستشارة').click();
  await dialog.getByRole('checkbox').check();
  for (const width of [1440, 390]) {
    await doctor.setViewportSize({ width, height: 1000 });
    assert.ok(await doctor.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
    await doctor.screenshot({ path: `${output}/ar-${width}-review.png` });
  }
  await doctor.keyboard.press('Escape'); await button(doctor, 'English').click();
  mark('Review & Close requires deliberate confirmation; EN, AR/RTL, desktop and mobile');
  await button(doctor, 'Review & close consultation').click();
  await dialog.getByRole('checkbox').check();
  await button(dialog, 'Confirm close consultation').click();
  await doctor.getByText('Closed · booking consulted', { exact: true }).waitFor();
  await doctor.reload(); await doctor.getByText('Closed · booking consulted', { exact: true }).waitFor();
  assert.equal(await visible(), released);
  await doctor.getByRole('link', { name: 'View consulted booking', exact: true }).click();
  await doctor.getByText('Consulted', { exact: true }).first().waitFor();
  assert.equal(await button(doctor, 'Record attendance').isDisabled(), true);
  await patient.goto(origin + '/patient/appointments/' + bookingId);
  await patient.getByText('Consulted', { exact: true }).first().waitFor();
  assert.equal(await button(patient, 'Cancel booking').isDisabled(), true);
  mark('CLOSED / CONSULTED survive reload; illegal post-close UI actions blocked; close leaks no unreleased content');
  assert.deepEqual(errors, []);
  for (const p of [doctor, patient]) await command(p, '/auth/logout', 'POST', {});
  await writeFile(output + '/hosted-results.json', JSON.stringify({ origin, bookingId, checks, browserErrors: errors }, null, 2));
} catch (error) {
  for (const [name, page] of [['doctor', doctor], ['patient', patient]]) if (page) await page.screenshot({ path: `${output}/${name}-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  for (const p of [doctor, patient]) if (p) await command(p, '/auth/logout', 'POST', {}).catch(() => {});
  await browser.close();
}
