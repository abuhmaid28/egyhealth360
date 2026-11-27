import test from "node:test";
import assert from "node:assert/strict";
import { createReviewFixture, fixtureProvider } from "../scripts/test-ui-critical-booking-copy.mjs";

const sample = createReviewFixture();
const { required, optional } = sample.critical.criticalCopyTasks.bookingCreate;
const effects = (f) => ({ writes: f.calls.writes.length, keys: f.calls.keys,
  notifications: f.calls.notifications.length, routes: f.calls.routes.length, changed: f.calls.changed });
const zero = { writes: 0, keys: 0, notifications: 0, routes: 0, changed: 0 };

for (const key of required) test(`missing required Arabic copy blocks native control and actual handler: ${key}`, async () => {
  const f = createReviewFixture(); delete f.dictionary[key]; f.render();
  assert.equal(f.primary().props.disabled, true);
  assert.equal(f.primary().props["aria-describedby"], "live-booking-description");
  await f.primary().props.onClick(); assert.deepEqual(effects(f), zero);
  assert.ok(f.nodes().some((n) => n.props.role === "status"));
  assert.ok(!JSON.stringify(f.nodes().map((n) => n.props["aria-label"])).includes(key));
});
for (const key of optional) test(`optional progress key omits only the list: ${key}`, async () => {
  const f = createReviewFixture(); delete f.dictionary[key]; f.render();
  assert.equal(f.primary().props.disabled, false);
  assert.equal(f.nodes().some((n) => n.type === "ol"), false);
  await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 1);
  assert.equal(f.calls.routes.length, 1);
});
test("critical API rejects empty, blank, nonstring, inherited and placeholder-incompatible copy before interpolation", () => {
  const f = createReviewFixture();
  for (const value of ["", " \n ", null, 5, "تأكيد {unexpected}", "تأكيد {unclosed", "تأكيد {not-valid}", "تأكيد { name }", "تأكيد }"]) {
    f.dictionary["Confirm live booking"] = value;
    assert.equal(f.critical.criticalCopyState("ar", "bookingCreate").ready, false);
    assert.equal(f.critical.criticalCopyState("en", "bookingCreate").ready, true);
  }
  assert.equal(f.critical.criticalCopyState("ar", "bookingCreate", ["constructor"]).ready, false);
  const other = createReviewFixture();
  other.dictionary["Count {count}"] = "العدد {count}";
  assert.equal(other.critical.criticalCopyState("ar", "bookingCreate", ["Count {count}"]).ready, true);
  other.dictionary["Count {count}"] = "العدد {other}";
  assert.equal(other.critical.criticalCopyState("ar", "bookingCreate", ["Count {count}"]).ready, false);
});
test("English and intact Arabic keep exact global interpolation and second-pass behavior", async () => {
  for (const locale of ["en", "ar"]) {
    const f = createReviewFixture(); f.locale(locale);
    const translate = f.load("apps/web/src/lib/i18n/catalog.ts").translate;
    const literal = "أحمد $& {data}";
    assert.equal(translate(locale, "Good morning, {name}.", { name: literal }), locale === "ar" ? `صباح الخير، ${literal}.` : `Good morning, ${literal}.`);
    const translated = translate("ar", "Your doctor"); assert.equal(translate("ar", translated), translated);
    if (locale === "en") delete f.dictionary["Confirm live booking"];
    f.render(); assert.equal(f.primary().props.disabled, false);
    await f.primary().props.onClick(); assert.deepEqual(effects(f), { writes: 1, keys: 1, notifications: 1, routes: 1, changed: 1 });
  }
});
test("only selected authored aliases and zones gate identity; recorded data never becomes a key", () => {
  const f = createReviewFixture(); delete f.dictionary["Demo doctor A"]; delete f.dictionary["Coordinated Universal Time"];
  f.render(); assert.equal(f.primary().props.disabled, false);
  assert.ok(f.nodes().some((n) => n.props.children === fixtureProvider.displayName));
  f.props.provider = { ...fixtureProvider, displayName: "Synthetic Staging Doctor" };
  f.render(); assert.equal(f.primary().props.disabled, true);
  f.props.provider = fixtureProvider; f.props.slot = { ...f.props.slot, timeZone: "UTC" };
  f.render(); assert.equal(f.primary().props.disabled, true);
  f.props.slot = { ...f.props.slot, timeZone: "Europe/Paris" };
  f.render(); assert.equal(f.primary().props.disabled, false);
});
test("a stale handler rechecks the catalog and synchronously excludes rapid duplicates", async () => {
  const f = createReviewFixture(); f.render(); const handler = f.primary().props.onClick;
  delete f.dictionary["Confirm live booking"]; await handler(); assert.deepEqual(effects(f), zero);
  f.dictionary["Confirm live booking"] = sample.dictionary["Confirm live booking"];
  f.delay(); const pending = handler(); await handler(); assert.equal(f.calls.writes.length, 1);
  f.finish(); await pending; await handler(); assert.equal(f.calls.writes.length, 1);
});
for (const status of [401, 403, 404, 503]) test(`synthetic ${status} has no automatic retry; damaged recovery blocks further execution`, async () => {
  const f = createReviewFixture(); f.status(status); f.render();
  await f.primary().props.onClick(); f.render(); assert.equal(f.calls.writes.length, 1); assert.equal(f.calls.keys, 1);
  const message = new f.api.BookingUiError(status).message; delete f.dictionary[message]; f.render();
  assert.equal(f.primary().props.disabled, true);
  await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 1); assert.equal(f.calls.keys, 1);
  assert.deepEqual(f.calls.notifications, []); assert.deepEqual(f.calls.routes, []);
});
test("503 explicit unchanged recovery retains exact method/body/key; restoring copy never submits", async () => {
  const f = createReviewFixture(); f.status(503); f.render(); await f.primary().props.onClick(); f.render();
  const message = new f.api.BookingUiError(503).message; delete f.dictionary[message]; f.render();
  f.dictionary[message] = sample.dictionary[message]; f.render(); assert.equal(f.calls.writes.length, 1);
  f.status(0); await f.primary().props.onClick();
  assert.equal(f.calls.keys, 1); assert.equal(f.calls.writes.length, 2);
  assert.equal(f.calls.writes[0].method, "POST"); assert.equal(f.calls.writes[0].body, f.calls.writes[1].body);
});
for (const outcome of [0, 503]) test(`EN→AR pending ${outcome || "commit"} preserves actual outcome without unsafe settlement`, async () => {
  const f = createReviewFixture();
  delete f.dictionary[outcome ? new f.api.BookingUiError(503).message : "Your live booking is confirmed."];
  f.locale("en"); f.delay(); f.status(outcome); const pending = f.primary().props.onClick();
  f.locale("ar"); f.finish(); await pending; f.render();
  assert.equal(f.primary().props.disabled, true); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, 1); assert.equal(f.calls.keys, 1);
  assert.deepEqual(f.calls.routes, []); assert.deepEqual(f.calls.notifications, []);
  const text = JSON.stringify(f.nodes().map((n) => n.props.children));
  assert.ok(text.includes(outcome ? f.critical.bookingCopySafety.uncertain : f.critical.bookingCopySafety.confirmed));
  f.locale("en"); assert.equal(f.calls.writes.length, 1);
  if (!outcome) { await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 1); }
});
for (const disposal of ["account", "unmount"]) test(`${disposal} invalidates stale callbacks and pending settlement`, async () => {
  const f = createReviewFixture(); f.render(); const handler = f.primary().props.onClick;
  f.delay(); const pending = handler(); f[disposal](); f.finish(); await pending; await handler();
  assert.equal(f.calls.writes.length, 1); assert.deepEqual(f.calls.routes, []); assert.deepEqual(f.calls.notifications, []);
});
test("normal successful handoff consumes task retention, without reviving a stale callback", async () => {
  const f = createReviewFixture(); f.render(); const handler = f.primary().props.onClick;
  await handler(); f.render(); await handler(); assert.equal(f.calls.writes.length, 1);
  f.remount(); assert.equal(f.primary().props.disabled, false);
  await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 2); assert.equal(f.calls.keys, 2);
});
for (const status of [0, 503]) test(`close/reopen retains suppressed ${status || "committed"} outcome until explicit safe handoff/recovery`, async () => {
  const f = createReviewFixture(); f.locale("en"); f.status(status); f.delay();
  const key = status ? new f.api.BookingUiError(503).message : "Your live booking is confirmed.";
  delete f.dictionary[key]; const pending = f.primary().props.onClick();
  f.locale("ar"); f.unmount(); f.remount();
  assert.equal(f.primary().props.disabled, true);
  f.finish(); await pending; f.render(); assert.equal(f.primary().props.disabled, true);
  await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 1);
  f.dictionary[key] = sample.dictionary[key]; f.remount();
  assert.equal(f.calls.writes.length, 1); f.status(0); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, status ? 2 : 1); assert.equal(f.calls.keys, 1);
  assert.equal(f.calls.routes.length, 1);
  if (status) assert.equal(f.calls.writes[0].body, f.calls.writes[1].body);
});
test("another slot cannot overwrite the adapter's single uncertain CREATE command", async () => {
  const f = createReviewFixture(); f.status(503); f.render(); await f.primary().props.onClick();
  const original = f.props.slot;
  f.props.slot = { ...original, id: "00000000-0000-4000-8000-000000000009" }; f.render();
  assert.equal(f.primary().props.disabled, true); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, 1); assert.equal(f.calls.keys, 1);
  f.props.slot = original; f.render(); f.status(0); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, 2); assert.equal(f.calls.keys, 1);
  assert.equal(f.calls.writes[0].body, f.calls.writes[1].body);
});
for (const status of [403, 404, 409]) test(`503 uncertainty survives subsequent ${status} feedback before another slot`, async () => {
  const f = createReviewFixture(); f.status(503); f.render(); await f.primary().props.onClick(); f.render();
  f.status(status); await f.primary().props.onClick();
  f.props.slot = { ...f.props.slot, id: "00000000-0000-4000-8000-000000000009" }; f.render();
  assert.equal(f.primary().props.disabled, true); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, 2); assert.equal(f.calls.keys, 1);
});
test("401 after unknown result disables recovery across command/session reset", async () => {
  const f = createReviewFixture(); f.status(503); f.render(); await f.primary().props.onClick(); f.render();
  f.status(401); await f.primary().props.onClick(); f.render();
  assert.equal(f.primary().props.disabled, true); await f.primary().props.onClick();
  assert.equal(f.calls.writes.length, 2); assert.equal(f.calls.keys, 1);
  assert.ok(f.nodes().some((n) => n.props.children === f.critical.bookingCopySafety.unrecoverable));
});
test("cross-slot retained receipt displays original target and permits only receipt handoff", async () => {
  const f = createReviewFixture(); delete f.dictionary["Your live booking is confirmed."];
  f.locale("en"); f.delay(); const pending = f.primary().props.onClick(); f.locale("ar"); f.finish(); await pending;
  f.dictionary["Your live booking is confirmed."] = sample.dictionary["Your live booking is confirmed."];
  f.props.provider = { ...fixtureProvider, displayName: "UNSUBMITTED_TARGET_CANARY" };
  f.props.slot = { ...f.props.slot, id: "00000000-0000-4000-8000-000000000009", timeZone: "UTC" }; f.remount();
  assert.equal(f.primary().props.disabled, false);
  const tree = JSON.stringify(f.nodes().map((n) => n.props.children));
  assert.ok(!tree.includes("UNSUBMITTED_TARGET_CANARY")); assert.ok(tree.includes(fixtureProvider.displayName));
  await f.primary().props.onClick(); assert.equal(f.calls.writes.length, 1); assert.equal(f.calls.routes.length, 1);
});
