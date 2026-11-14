/** Isolated actual-source F03 fixture. No Next app, credentials, backend, or production injection flag. */
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const component = "apps/web/src/components/live-booking.tsx";
const webRequire = createRequire(resolve("apps/web/package.json"));
let compiled;
export function fixtureSources() {
  if (compiled) return compiled;
  const paths = [component, "apps/web/src/components/ui.tsx", "apps/web/src/lib/presentation.ts",
    "apps/web/src/lib/i18n/ar.ts", "apps/web/src/lib/i18n/catalog.ts", "apps/web/src/lib/i18n/critical-copy.ts",
    "apps/web/src/lib/api/errors.ts", "apps/web/src/lib/api/live-booking.ts"];
  compiled = Object.fromEntries(paths.map((file) => [file, ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText]));
  return compiled;
}
const aliases = {
  "apps/web/src/lib/i18n/context": "locale",
  "apps/web/src/components/context": "app",
  "apps/web/src/components/consultation-opening": "opening",
};
function dependency(from, name, sources) {
  if (!name.startsWith(".")) return name;
  const target = resolve(dirname(resolve(from)), name).slice(root.length + 1);
  if (aliases[target]) return aliases[target];
  for (const ext of [".ts", ".tsx"]) if (sources[target + ext]) return target + ext;
  throw new Error(`Unmapped fixture import ${from}: ${name}`);
}
export const fixtureId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const fixtureSlot = { id: fixtureId(2), clinicId: fixtureId(3),
  startAt: "2026-11-20T10:00:00Z", endAt: "2026-11-20T10:30:00Z", timeZone: "Africa/Cairo" };
export const fixtureProvider = { displayName: "Recorded doctor · دكتور $& {name}",
  clinics: [{ id: fixtureId(3), displayName: "Recorded clinic · عيادة" }] };
export const fixtureBooking = { ...fixtureSlot, id: fixtureId(1), slotId: fixtureSlot.id,
  providerId: fixtureId(4), patientDisplayName: "PRIVATE_PATIENT_CANARY", state: "BOOKED", version: 1,
  createdAt: "2026-11-01T10:00:00Z", predecessorId: null, successorId: null,
  attendance: "UNKNOWN", transitions: [], attendanceHistory: [] };

/** Node component harness: real component/helper/API, deterministic hook lifecycle, no DOM/network. */
export function createReviewFixture() {
  const sources = fixtureSources(), cache = {}, hooks = [], effects = [];
  let index = 0, locale = "ar", account = {}, live, props, tree, status = 0, delayed = false, finish;
  const calls = { writes: [], keys: 0, notifications: [], routes: [], changed: 0, closed: 0 };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useRef(value) { const i = index++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = index++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], (v) => { hooks[i] = typeof v === "function" ? v(hooks[i]) : v; }]; },
    useEffect(run, deps) { const i = index++; const old = effects[i]; if (!old || deps.some((v, n) => v !== old.deps[n])) { old?.cleanup?.(); effects[i] = { deps, cleanup: run() }; } },
  };
  const stubs = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/link": { default: "a" }, opening: {},
    "next/navigation": { useRouter: () => ({ push: (p) => calls.routes.push(p) }) },
    locale: { useLocale: () => ({ locale, t: (key, values) => load("apps/web/src/lib/i18n/catalog.ts").translate(locale, key, values) }) },
    app: { useApp: () => ({ session: account, api: { mode: "live", liveBookings: live },
      notify: (v) => calls.notifications.push(v), changed: () => calls.changed++ }) },
  };
  function load(id) {
    if (stubs[id]) return stubs[id];
    if (cache[id]) return cache[id];
    const output = {}; cache[id] = output;
    assert.ok(sources[id], `Fixture source exists: ${id}`);
    new Function("exports", "require", sources[id])(output, (name) => load(dependency(id, name, sources)));
    return output;
  }
  const api = load("apps/web/src/lib/api/live-booking.ts");
  const request = async (path, init) => {
    calls.writes.push({ path, ...init });
    if (delayed) await new Promise((done) => { finish = done; });
    if (status === 401) live.clearCommands(); // Same disposal boundary as the unchanged Live request adapter.
    if (status) throw new api.BookingUiError(status);
    return { data: fixtureBooking };
  };
  const newLive = () => api.createLiveBookingApi(request, () => "synthetic-csrf", () => fixtureId(100 + ++calls.keys));
  live = newLive();
  props = { provider: fixtureProvider, slot: fixtureSlot, close: () => calls.closed++ };
  const render = () => { index = 0; tree = load(component).LiveCreateReview(props); return tree; };
  const nodes = (node = tree) => node == null || typeof node !== "object" ? [] :
    Array.isArray(node) ? node.flatMap((child) => child === undefined ? [] : nodes(child)) :
      [node, ...(node.props.children === undefined ? [] : nodes(node.props.children))];
  const primary = () => nodes().find((n) => n.type === "button" && n.props.className === "button primary full");
  return { calls, api, render, primary, nodes, load, props,
    dictionary: load("apps/web/src/lib/i18n/ar.ts").ar,
    critical: load("apps/web/src/lib/i18n/critical-copy.ts"),
    locale(value) { locale = value; render(); },
    account() { live.clearCommands(); account = {}; live = newLive(); render(); },
    status(value) { status = value; }, delay(value = true) { delayed = value; },
    finish() { delayed = false; finish?.(); },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
    remount() { for (const effect of effects) effect?.cleanup?.(); hooks.length = 0; effects.length = 0; return render(); },
  };
}

function browserBundle(mainSource) {
  const sources = { ...fixtureSources() };
  if (mainSource) sources[component] = ts.transpileModule(mainSource, { fileName: component,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const vendor = (pkg, file) => readFileSync(resolve(dirname(webRequire.resolve(`${pkg}/package.json`)), file), "utf8");
  Object.assign(sources, {
    react: vendor("react", "cjs/react.development.js"),
    "react/jsx-runtime": vendor("react", "cjs/react-jsx-runtime.development.js"),
    "react-dom": vendor("react-dom", "cjs/react-dom.development.js"),
    "react-dom/client": vendor("react-dom", "cjs/react-dom-client.development.js"),
    scheduler: readFileSync(webRequire.resolve("next/dist/compiled/scheduler/cjs/scheduler.development.js"), "utf8"),
    locale: `exports.useLocale=()=>{const r=require('react'),v=r.useContext(globalThis.window.f03Locale);return {locale:v,t:(k,p)=>require('apps/web/src/lib/i18n/catalog.ts').translate(v,k,p)}};`,
    app: `exports.useApp=()=>require('react').useContext(globalThis.window.f03App);`,
    opening: "", "next/link": `exports.default=p=>require('react/jsx-runtime').jsx('a',p);`,
    "next/navigation": `exports.useRouter=()=>({push:p=>globalThis.window.f03.calls.routes.push(p)});`,
  });
  const factory = Object.entries(sources).map(([id, code]) => {
    const deps = Object.fromEntries([...code.matchAll(/require\(["']([^"']+)["']\)/g)].map((m) => [m[1], dependency(id, m[1], sources)]));
    for (const dep of Object.values(deps)) assert.ok(sources[dep] !== undefined, `Browser fixture dependency: ${dep}`);
    return `${JSON.stringify(id)}:function(module,exports,load){const require=n=>load(${JSON.stringify(deps)}[n]);\n${code}\n}`;
  }).join(",\n");
  return `const process={env:{NODE_ENV:'development'}};const factories={${factory}},cache={};
function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;factories[id](m,m.exports,load);return m.exports;}
${browserEntry()}`;
}
function browserEntry() {
  return `
const React=load('react'),DOM=load('react-dom/client'),J=load('react/jsx-runtime');
const originalJsx=J.jsx,originalJsxs=J.jsxs;
function capture(fn){return (type,props,...rest)=>{if(type==='button'&&props.className==='button primary full')globalThis.window.f03.handler=props.onClick;return fn(type,props,...rest)}}
J.jsx=capture(originalJsx);J.jsxs=capture(originalJsxs);
globalThis.window.f03Locale=React.createContext('ar');globalThis.window.f03App=React.createContext(null);
const dictionary=load('apps/web/src/lib/i18n/ar.ts').ar,pristine={...dictionary};
const api=load('apps/web/src/lib/api/live-booking.ts'),Component=load(${JSON.stringify(component)}).LiveCreateReview;
const safety=load('apps/web/src/lib/i18n/critical-copy.ts');
const id=${fixtureId.toString()},slot=${JSON.stringify(fixtureSlot)},provider=${JSON.stringify(fixtureProvider)},booking=${JSON.stringify(fixtureBooking)};
let config={},setOpen,setLocale,setAccount,setTarget,resolveRequest,epoch=0;
const f=globalThis.window.f03={calls:{},safety,handler:()=>{},setLocale:v=>setLocale(v),close:()=>setOpen(false),
 finish:()=>{config.delayed=false;resolveRequest?.()},setStatus:v=>config.status=v,
 missing:key=>{delete dictionary[key];setLocale(v=>v==='ar'?'en':'ar');},
 dispose:()=>{f.live.clearCommands();setAccount({epoch:++epoch})},
 target:other=>setTarget(other?{provider:{...provider,displayName:'UNSUBMITTED_TARGET_CANARY'},slot:{...slot,id:id(9),startAt:'2027-02-01T10:00:00Z',timeZone:'UTC'}}:{provider,slot}),
 start:async value=>{config=value;Object.keys(dictionary).forEach(k=>delete dictionary[k]);Object.assign(dictionary,pristine);
  for(const key of config.missing||[])delete dictionary[key];Object.assign(dictionary,config.corrupt||{});
  f.calls={writes:[],keys:0,notifications:[],routes:[],changed:0};
  globalThis.document.documentElement.lang=config.locale||'ar';globalThis.document.documentElement.dir=(config.locale||'ar')==='ar'?'rtl':'ltr';
  root.render(J.jsx(App,{key:++epoch}));},
};
function App(){const [open,changeOpen]=React.useState(false),[locale,changeLocale]=React.useState(config.locale||'ar'),[account,changeAccount]=React.useState({epoch}),[target,changeTarget]=React.useState({provider:config.alias?{...provider,displayName:'Synthetic Staging Doctor'}:config.long?{...provider,displayName:provider.displayName.repeat(3)}:provider,slot:{...slot,timeZone:config.zone||slot.timeZone}});
setTarget=changeTarget;
setOpen=changeOpen;setLocale=v=>{globalThis.document.documentElement.lang=v;globalThis.document.documentElement.dir=v==='ar'?'rtl':'ltr';changeLocale(v)};setAccount=changeAccount;
const live=React.useMemo(()=>api.createLiveBookingApi(async(path,init)=>{f.calls.writes.push({path,...init});
 if(config.delayed)await new Promise(done=>{resolveRequest=done});if(config.status===401)f.live.clearCommands();if(config.status)throw new api.BookingUiError(config.status);
 if(config.rawError)throw new Error('PRIVATE_RAW_CANARY');return {data:booking};},()=> 'synthetic-csrf',()=>id(100+ ++f.calls.keys)),[account]);f.live=live;
const app={session:account,api:{mode:'live',liveBookings:live},notify:v=>f.calls.notifications.push(v),changed:()=>f.calls.changed++};
return J.jsx(globalThis.window.f03Locale.Provider,{value:locale,children:J.jsx(globalThis.window.f03App.Provider,{value:app,children:[
J.jsx('button',{id:'opener',onClick:()=>changeOpen(true),children:'Open synthetic booking'}),
open&&J.jsx(Component,{...target,close:()=>changeOpen(false)})]})});}
const root=DOM.createRoot(globalThis.document.getElementById('root'));f.ready=true;
`;
}

export async function runCriticalBookingBrowser() {
  const { chromium } = await import("playwright");
  const output = mkdtempSync(resolve(tmpdir(), "eh-f03-browser-"));
  const bundle = browserBundle();
  const reviewedBase = "5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3";
  const baseline = browserBundle(execFileSync("git", ["show", `${reviewedBase}:${component}`], { encoding: "utf8" }));
  writeFileSync(resolve(output, "fixture.js"), bundle);
  const css = readFileSync("apps/web/app/globals.css", "utf8");
  const fonts = new Map(["inter-latin-variable.woff2", "noto-sans-arabic-variable.woff2"].map((name) =>
    [`/fonts/${name}`, readFileSync(`apps/web/public/fonts/${name}`)],
  ));
  const server = createServer((req, res) => {
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript; charset=utf-8"); res.end(bundle); }
    else if (req.url === "/baseline.js") { res.setHeader("Content-Type", "text/javascript; charset=utf-8"); res.end(baseline); }
    else if (req.url === "/fixture.css") { res.setHeader("Content-Type", "text/css; charset=utf-8"); res.end(css); }
    else if (fonts.has(req.url)) { res.setHeader("Content-Type", "font/woff2"); res.end(fonts.get(req.url)); }
    else if (req.url === "/" || req.url === "/baseline") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="${req.url === "/baseline" ? "/baseline.js" : "/fixture.js"}"></script></body></html>`); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.EH_UI_CHROMIUM ? { executablePath: process.env.EH_UI_CHROMIUM } : {}) });
    const page = await browser.newPage();
    const errors = [], network = [], fontResponses = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => { if (new URL(r.url()).pathname.startsWith("/fonts/")) fontResponses.push(r.status()); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.route("**/*", async (route) => {
      if (!route.request().url().startsWith(origin + "/")) { network.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const scaleText = async (scale) => page.locator("dialog").evaluate((el, scale) => {
      const sizes = [el, ...el.querySelectorAll("*")].map(child => [child, parseFloat(globalThis.getComputedStyle(child).fontSize)]);
      for (const [child, size] of sizes) child.style.fontSize = `${size * scale}px`;
      return sizes.every(([child, size]) => Math.abs(parseFloat(globalThis.getComputedStyle(child).fontSize) / size - scale) < 0.01);
    }, scale);
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.goto(origin + "/baseline"); await page.waitForFunction(() => globalThis.window.f03?.ready);
    await page.evaluate(() => globalThis.window.f03.start({ locale: "en" })); await page.locator("#opener").click();
    await page.locator("dialog[open]").waitFor(); await page.evaluate(() => globalThis.document.fonts.ready);
    assert.equal(await scaleText(2), true);
    const baselineGeometry = await page.locator("dialog").evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth,
      progress: el.querySelector("ol").textContent }));
    await page.goto(origin); await page.waitForFunction(() => globalThis.window.f03?.ready);
    const start = async (config) => {
      await page.evaluate((config) => globalThis.window.f03.start(config), config);
      await page.locator("#opener").click(); await page.locator("dialog[open]").waitFor();
      await page.evaluate(() => globalThis.document.fonts.ready);
    };
    const primary = page.locator("dialog .button.primary.full");
    const calls = () => page.evaluate(() => globalThis.window.f03.calls);
    const safe = "المهمة دي مش متاحة بالعربي دلوقتي.";
    const keys = await page.evaluate(() => globalThis.window.f03.safety.criticalCopyTasks.bookingCreate);
    for (const key of keys.required) {
      await start({ missing: [key] }); assert.equal(await primary.isDisabled(), true);
      await page.evaluate(() => globalThis.window.f03.handler()); assert.equal((await calls()).writes.length, 0);
      assert.equal(await page.locator("dialog").getAttribute("aria-describedby"), "live-booking-description");
      assert.ok((await page.locator("dialog").textContent()).includes(safe), `Safe fallback for ${key}`);
      const dom = await page.locator("dialog").evaluate((el) => el.outerHTML);
      const ax = await page.locator("dialog").ariaSnapshot();
      for (const value of [key, "PRIVATE_RAW_CANARY", "PRIVATE_PATIENT_CANARY", fixtureId(1)]) {
        assert.ok(!dom.includes(value), `No DOM leak: ${key}`); assert.ok(!ax.includes(value), `No AX leak: ${key}`);
      }
      await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
      assert.equal((await calls()).writes.length, 0);
      results.push(`missing ${key}`);
    }
    for (const key of keys.optional) {
      await start({ missing: [key] }); assert.equal(await primary.isEnabled(), true);
      assert.equal(await page.locator("ol.workflow-steps").count(), 0);
      await primary.click(); await page.waitForFunction(() => globalThis.window.f03.calls.routes.length === 1);
      assert.equal((await calls()).writes.length, 1); results.push(`optional ${key}`);
    }
    for (const value of ["", "   ", "نص {unexpected}", "نص {unclosed", "نص { name }"]) {
      await start({ corrupt: { "Confirm live booking": value } }); assert.equal(await primary.isDisabled(), true);
      await page.evaluate(() => globalThis.window.f03.handler()); assert.equal((await calls()).keys, 0); results.push(`corrupt ${JSON.stringify(value)}`);
    }
    for (const locale of ["en", "ar"]) for (const missing of [false, true]) for (const width of [320, 390, 1440]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 1000 });
      await start({ locale, long: true, missing: missing ? ["Confirm live booking"] : [] });
      const scaled = await scaleText(scale);
      assert.equal(scaled, true, "Measured text scaling matches requested ratio");
      assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
      const dialog = await page.locator("dialog").boundingBox(); assert.ok(dialog.width <= width);
      const geometry = await page.locator("dialog").evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth,
        progress: el.querySelector("ol")?.textContent }));
      if (geometry.scroll > geometry.client + 1) {
        assert.ok(locale === "en" && width === 320 && scale === 2, "Only independently measured main overflow may remain");
        assert.deepEqual(geometry, baselineGeometry, "Existing EN progress-list overflow is byte/source-matched, not hidden");
      }
      for (const control of [primary, page.locator("dialog .button.subtle.full")]) {
        await control.scrollIntoViewIfNeeded();
        assert.ok(await control.isVisible());
        const box = await control.boundingBox(); assert.ok(box.x >= dialog.x && box.x + box.width <= dialog.x + dialog.width + 1);
      }
      assert.equal(await primary.isDisabled(), locale === "ar" && missing);
      await page.keyboard.press("Escape"); await page.locator("dialog").waitFor({ state: "detached" });
      assert.equal(await page.locator("#opener").evaluate((el) => el === globalThis.document.activeElement), true);
      results.push(`${locale} ${missing ? "missing" : "intact"} ${width} text${scale * 100}`);
    }
    await start({ missing: ["Confirm live booking"] });
    await page.locator("dialog .icon-button").focus(); await page.keyboard.press("Shift+Tab");
    // Chromium may visit browser chrome (document.body) at the native dialog wrap.
    // The inert opener must never receive focus; the next traversal returns inside.
    assert.equal(await page.locator("#opener").evaluate((el) => el === globalThis.document.activeElement), false);
    if (await page.evaluate(() => globalThis.document.activeElement === globalThis.document.body)) await page.keyboard.press("Shift+Tab");
    assert.equal(await page.locator("dialog .button.subtle.full").evaluate((el) => el === globalThis.document.activeElement), true);
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => globalThis.document.activeElement === globalThis.document.body)) await page.keyboard.press("Tab");
    assert.equal(await page.locator("dialog .icon-button").evaluate((el) => el === globalThis.document.activeElement), true);
    await primary.dispatchEvent("click"); assert.equal((await calls()).writes.length, 0);
    results.push("native focus containment, Shift+Tab/Tab and disabled click");
    for (const status of [401, 403, 404, 503]) {
      await start({ status }); await primary.click(); await page.waitForFunction(() => globalThis.window.f03.calls.writes.length === 1);
      await page.getByRole("alert").waitFor(); assert.equal((await calls()).keys, 1);
      if (status === 503) {
        await page.evaluate(() => globalThis.window.f03.setStatus(0)); await primary.click();
        await page.waitForFunction(() => globalThis.window.f03.calls.routes.length === 1);
        const c = await calls(); assert.equal(c.writes.length, 2); assert.equal(c.keys, 1);
        assert.equal(c.writes[0].body, c.writes[1].body);
      }
      results.push(`HTTP ${status}`);
    }
    await start({ locale: "en", missing: ["Your live booking is confirmed."], delayed: true });
    await primary.click(); await page.evaluate(() => globalThis.window.f03.setLocale("ar"));
    await page.getByRole("heading", { name: safe, exact: true }).waitFor();
    await page.evaluate(() => globalThis.window.f03.finish());
    await page.getByText("تم تأكيد حجزك الفعلي.", { exact: true }).waitFor();
    assert.equal((await calls()).routes.length, 0); assert.equal((await calls()).notifications.length, 0);
    await page.evaluate(() => globalThis.window.f03.handler()); assert.equal((await calls()).writes.length, 1);
    await page.getByRole("button", { name: "رجوع", exact: true }).click();
    await page.locator("#opener").click(); await page.getByText("تم تأكيد حجزك الفعلي.", { exact: true }).waitFor();
    assert.equal(await primary.isDisabled(), true);
    await page.evaluate(() => globalThis.window.f03.setLocale("en"));
    await page.evaluate(() => globalThis.window.f03.target(true));
    await page.getByRole("heading", { name: "Booking details", exact: true }).waitFor();
    const retainedDom = await page.locator("dialog").evaluate((el) => el.outerHTML);
    const retainedAx = await page.locator("dialog").ariaSnapshot();
    assert.ok(!retainedDom.includes("UNSUBMITTED_TARGET_CANARY") && !retainedAx.includes("UNSUBMITTED_TARGET_CANARY"));
    assert.ok(retainedDom.includes(fixtureProvider.displayName.replace("&", "&amp;")));
    await page.getByRole("button", { name: "View booking", exact: true }).click();
    assert.equal((await calls()).writes.length, 1); assert.equal((await calls()).routes.length, 1);
    results.push("committed EN→AR: receipt retained, no duplicate/toast/navigation");
    await start({ locale: "en", missing: [keys.required.find((k) => k.startsWith("The booking service is unavailable"))], status: 503, delayed: true });
    await primary.click(); await page.evaluate(() => globalThis.window.f03.setLocale("ar"));
    await page.getByRole("heading", { name: safe, exact: true }).waitFor(); await page.evaluate(() => globalThis.window.f03.finish());
    await page.getByRole("alert").waitFor(); assert.equal(await primary.isDisabled(), true);
    await page.evaluate(() => globalThis.window.f03.handler()); assert.equal((await calls()).writes.length, 1);
    assert.ok((await page.getByRole("alert").innerText()).includes("ما تبدأش طلب جديد"));
    await page.getByRole("button", { name: "رجوع", exact: true }).click(); await page.locator("#opener").click();
    await page.getByRole("alert").waitFor(); assert.equal(await primary.isDisabled(), true);
    await page.evaluate(() => { globalThis.window.f03.setLocale("en"); globalThis.window.f03.setStatus(0); });
    await primary.click(); await page.waitForFunction(() => globalThis.window.f03.calls.routes.length === 1);
    const recovered = await calls(); assert.equal(recovered.keys, 1); assert.equal(recovered.writes[0].body, recovered.writes[1].body);
    results.push("uncertain EN→AR: original context retained, no retry");
    await start({ locale: "en", status: 503 }); await primary.click(); await page.getByRole("alert").waitFor();
    await page.evaluate(() => globalThis.window.f03.setStatus(403)); await primary.click(); await page.getByRole("alert").waitFor();
    await page.evaluate(() => globalThis.window.f03.target(true));
    await page.getByRole("status").filter({ hasText: "Do not start a new action" }).waitFor();
    assert.equal(await primary.isDisabled(), true); await page.evaluate(() => globalThis.window.f03.handler());
    assert.equal((await calls()).writes.length, 2); assert.equal((await calls()).keys, 1);
    const otherDom = await page.locator("dialog").evaluate((el) => el.outerHTML);
    assert.ok(!otherDom.includes("UNSUBMITTED_TARGET_CANARY"));
    assert.equal(await page.getByRole("button", { name: "Go back", exact: true }).count(), 1);
    results.push("503→403→other slot: uncertainty retained, no replacement key, coherent EN");
    await start({ status: 503 }); await primary.click(); await page.getByRole("alert").waitFor();
    await page.evaluate(() => globalThis.window.f03.setStatus(401)); await primary.click();
    await page.getByText("مش متاح استعادة الطلب الأصلي هنا. ما تكررش إجراء الرعاية بطلب جديد.", { exact: true }).waitFor();
    assert.equal(await primary.isDisabled(), true); await page.evaluate(() => globalThis.window.f03.handler());
    assert.equal((await calls()).writes.length, 2); assert.equal((await calls()).keys, 1);
    results.push("503→401 reset: no fresh-key recovery workaround");
    await start({ delayed: true }); await primary.click(); await page.evaluate(() => globalThis.window.f03.dispose());
    await page.waitForFunction(() => !globalThis.document.querySelector("dialog .button.primary.full").disabled);
    await page.evaluate(() => globalThis.window.f03.finish()); await page.waitForTimeout(50);
    assert.equal((await calls()).notifications.length, 0); assert.equal((await calls()).routes.length, 0);
    assert.equal(await page.getByText("تم تأكيد حجزك الفعلي.", { exact: true }).count(), 0);
    assert.ok(!(await page.locator("dialog").ariaSnapshot()).includes("PRIVATE_PATIENT_CANARY"));
    results.push("account disposal suppresses old settlement");
    await start({ delayed: true }); await primary.click(); await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await page.evaluate(() => globalThis.window.f03.finish()); await page.waitForFunction(() => globalThis.window.f03.calls.routes.length === 1);
    results.push("busy Escape cannot discard pending operation");
    await start({ rawError: true }); await primary.click(); await page.getByRole("alert").waitFor();
    assert.ok(!(await page.locator("dialog").evaluate((el) => el.outerHTML)).includes("PRIVATE_RAW_CANARY"));
    assert.ok(!(await page.locator("dialog").ariaSnapshot()).includes("PRIVATE_RAW_CANARY"));
    await start({}); await primary.focus(); await page.keyboard.press("Space");
    await page.waitForFunction(() => globalThis.window.f03.calls.routes.length === 1);
    assert.equal((await calls()).writes.length, 1);
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    assert.ok(fontResponses.length > 0 && fontResponses.every((status) => status === 200), "Existing local font requests succeed");
    console.log(JSON.stringify({ result: "PASS", cases: results.length, results, browser: browser.version(), externalRequests: network.length, pageErrors: errors.length, fontResponses,
      preservedBaseline: { base: reviewedBase, scenario: "EN320/text200 static progress list", ...baselineGeometry },
      fixture: "actual source, synthetic adapter transport, native dialog; computed text scaling, not backend/F06/E2 or AT certification" }, null, 2));
  } finally {
    await browser?.close(); await new Promise((done) => server.close(done)); rmSync(output, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await runCriticalBookingBrowser();
