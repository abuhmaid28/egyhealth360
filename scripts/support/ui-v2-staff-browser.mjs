/** Direct opt-in proof on the built app; not invoked by the inherited CI browser runner. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { myCareDemoState, openDemoUtility } from "./ui-my-care-browser.mjs";
const origin = "http://127.0.0.1:3107";
const shots = process.env.STAFF_V2_EVIDENCE_DIR || await mkdtemp(join(tmpdir(), "eh135-staff-"));
const rolePaths = { PHARMACY_STAFF: "pharmacy", ADMIN: "admin", LAB_STAFF: "laboratory" };
const state = role => {
  const s = myCareDemoState();
  s.session = { role, name: "Synthetic staff", mode: "demo" };
  s.consultations.push({ ...s.consultations[0], appointmentId: "staff-route-A", released: true, medication: "Synthetic source item A", dosage: "SOURCE DIRECTIONS A · as entered", lab: "Synthetic training request", notes: "PRIVATE_STAFF_CANARY", diagnosis: "PRIVATE_DIAGNOSIS_CANARY" });
  s.consultations.push({ ...s.consultations[1], appointmentId: "staff-route-B", medication: "Synthetic source item B", dosage: "SOURCE DIRECTIONS B · unchanged" });
  return s;
};
const server = spawn(process.execPath, ["apps/web/node_modules/next/dist/bin/next", "start", "apps/web", "--hostname", "127.0.0.1", "--port", "3107"], { stdio: ["ignore", "pipe", "pipe"] });
let logs = "", browser;
server.stdout.on("data", x => logs += x); server.stderr.on("data", x => logs += x);
let cases = 0;
const errors = [];
async function open(role, locale = "en", theme = "light", width = 1440, text = 100, populated = true) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" });
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/api/v1/**", route => route.fulfill({ status: 503, json: { error: "PRIVATE_HTTP_CANARY" } }));
  await page.addInitScript(({ role, locale, populated, seeded }) => {
    globalThis.localStorage.setItem("eh360-ui-mode", "demo");
    globalThis.localStorage.setItem("eh360-locale", locale);
    if (!populated) seeded.consultations = [];
    seeded.session.role = role;
    globalThis.localStorage.setItem("eh360-ui-demo-v1", JSON.stringify(seeded));
  }, { role, locale, populated, seeded: state(role) });
  await page.goto(`${origin}/${rolePaths[role]}`);
  await page.locator("[data-staff-workspace] h1").waitFor();
  await page.locator('[data-staff-workspace] [role="status"]').filter({ hasText: /Loading|بنحمّل/ }).waitFor({ state: "hidden" });
  if (text === 200) await page.addStyleTag({ content: "html {font-size:200%!important}" });
  await page.evaluate(() => globalThis.document.fonts.ready);
  return page;
}
async function measure(page) {
  const result = await page.locator("[data-staff-workspace]").evaluate(root => {
    const styles = globalThis.getComputedStyle;
    const rgb = v => v.match(/[\d.]+/g)?.map(Number);
    const lum = c => c.slice(0, 3).map(v => {v /= 255;return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;}).reduce((n,v,i) => n + v * [.2126,.7152,.0722][i],0);
    const background = el => {for (; el; el=el.parentElement) {const c=rgb(styles(el).backgroundColor);if(c && (c.length<4 || c[3]===1)) return c;}return [255,255,255];};
    const contrast = [...root.querySelectorAll("*")].filter(el => el.checkVisibility() && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(el => {
      const a=lum(rgb(styles(el).color)),b=lum(background(el));return {text:el.textContent.slice(0,45),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
    const small = [...root.querySelectorAll("button,a,summary")].filter(el=>el.checkVisibility()).map(el=>({text:el.textContent.slice(0,45),h:el.getBoundingClientRect().height})).filter(x=>x.h<43.5);
    return { overflow: root.scrollWidth-root.clientWidth, failures: contrast.filter(x=>x.ratio<4.5), small, bg:styles(root).backgroundColor };
  });
  assert.ok(result.overflow <= 1, JSON.stringify(result));
  assert.deepEqual(result.failures, [], JSON.stringify(result));
  assert.deepEqual(result.small, [], JSON.stringify(result));
  const ax = await page.locator("[data-staff-workspace]").ariaSnapshot();
  assert.doesNotMatch(ax, /PRIVATE_STAFF_CANARY|PRIVATE_DIAGNOSIS_CANARY|PRIVATE_HTTP_CANARY/);
  assert.doesNotMatch(await page.locator("[data-staff-workspace]").innerHTML(), /PRIVATE_STAFF_CANARY|PRIVATE_DIAGNOSIS_CANARY/);
  return result;
}
try {
  let ready=false;
  for(let n=0;n<100;n++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{/* startup */}await new Promise(r=>setTimeout(r,200));}
  assert.ok(ready,logs);
  browser=await chromium.launch({ headless:true, executablePath:process.env.EH_UI_CHROMIUM || "/usr/bin/chromium" });
  await mkdir(shots,{recursive:true});
  if (!process.env.STAFF_FOCUS_ONLY) for(const role of Object.keys(rolePaths)) for(const locale of ["ar","en"]) for(const theme of ["light","dark"]) for(const width of [320,390,768,1440]) for(const text of [100,200]) {
    const page=await open(role,locale,theme,width,text);
    const result=await measure(page);
    assert.equal(await page.locator("html").getAttribute("dir"),locale==="ar"?"rtl":"ltr");
    if(role==="LAB_STAFF") assert.match(await page.locator("[data-staff-workspace]").innerText(),locale==="ar"?/مستقبلي.*غير متاح فعليًا/:/FUTURE.*NOT LIVE/);
    if(text===100 && (locale==="ar" && width===390 || locale==="en" && theme==="light" && width===1440)) {
      const name=role==="PHARMACY_STAFF"?"pharmacy":role==="ADMIN"?"admin":"lab";
      await page.screenshot({ path:`${shots}/b-${name}-${locale}-${theme}-${width}.png`,fullPage:true });
    }
    if(text===100 && width===390 && locale==="ar") console.log(role,theme,result.bg);
    cases++; await page.close();
  }
  // Exact source switching is a read. Keyboard has a visible focus outline; Back follows native links.
  const p=await open("PHARMACY_STAFF");
  const before=await p.evaluate(()=>globalThis.localStorage.getItem("eh360-ui-demo-v1"));
  const second=p.getByRole("button",{name:/Route 2/});await second.focus();await p.keyboard.press("Enter");
  await p.getByText("SOURCE DIRECTIONS B · unchanged",{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>globalThis.localStorage.getItem("eh360-ui-demo-v1")),before);
  assert.notEqual(await second.evaluate(el=>globalThis.getComputedStyle(el).outlineStyle),"none");
  await p.getByRole("button",{name:"Begin preparation",exact:true}).click();
  await p.waitForFunction(()=>globalThis.document.activeElement?.hasAttribute("data-staff-action"));
  await p.getByRole("button",{name:"Confirm full-item dispensing",exact:true}).click();
  await p.getByText("Dispensed",{exact:true}).waitFor();
  await p.waitForFunction(()=>globalThis.document.activeElement?.hasAttribute("data-staff-status"));
  assert.notEqual(await p.locator("[data-staff-status]").evaluate(el=>globalThis.getComputedStyle(el).outlineStyle),"none");
  const committed=JSON.parse(await p.evaluate(()=>globalThis.localStorage.getItem("eh360-ui-demo-v1")));
  assert.equal(committed.fulfillment["staff-route-B"].prescription,"Dispensed");assert.equal(committed.fulfillment["staff-route-A"],undefined);
  await p.getByRole("link",{name:"Workspace access"}).click();await p.waitForURL("**/pharmacy/settings");await p.goBack();await p.waitForURL("**/pharmacy");await p.getByText("Prescription details",{exact:true}).waitFor();
  await openDemoUtility(p);await p.getByLabel("Demo workspace").selectOption("ADMIN");await p.waitForURL("**/admin");await p.getByText("Administration, with boundaries",{exact:true}).waitFor();assert.doesNotMatch(await p.locator("[data-staff-workspace]").innerText(),/SOURCE DIRECTIONS|Synthetic source item/);await p.close();
  for(const role of Object.keys(rolePaths)) {const page=await open(role,"en","light",390,100,false);await measure(page);await page.close();}
  // Preview failures remove previously visible payload and are explicit read recovery only.
  for(const role of ["PHARMACY_STAFF","ADMIN"]) {
    const page=await open(role);await openDemoUtility(page);
    const preview=page.locator('select').filter({has:page.locator('option[value="error"]')});
    await preview.selectOption("error");await page.getByText("This view is unavailable",{exact:true}).waitFor();
    assert.doesNotMatch(await page.locator("[data-staff-workspace]").innerText(),/SOURCE DIRECTIONS|Ahmed Mostafa/);await page.close();
  }
  const uncertain=await open("PHARMACY_STAFF");
  await uncertain.evaluate(()=>{const seeded=JSON.parse(globalThis.localStorage.getItem("eh360-ui-demo-v1"));seeded.fulfillment=null;globalThis.localStorage.setItem("eh360-ui-demo-v1",JSON.stringify(seeded));});
  await uncertain.getByRole("button",{name:"Begin preparation",exact:true}).click();
  await uncertain.getByText("Outcome not confirmed",{exact:true}).waitFor();
  assert.equal(await uncertain.getByRole("button",{name:/Begin preparation|Confirm full-item dispensing/}).count(),0);
  assert.doesNotMatch(await uncertain.locator("[data-staff-workspace]").innerText(),/TypeError|Cannot read properties/);await uncertain.close();
  // Controlled HTTP negatives. No hosted account or clinical data; all staff writes forbidden.
  for(const role of Object.keys(rolePaths)) for(const status of [401,403,503]) {
    const page=await browser.newPage();const calls=[];
    await page.addInitScript(()=>{globalThis.localStorage.setItem("eh360-ui-mode","live");globalThis.localStorage.setItem("eh360-locale","en");});
    await page.route("**/api/v1/**",route=>{
      const req=route.request(),path=new URL(req.url()).pathname;calls.push({path,method:req.method()});
      if(path.endsWith("/auth/me"))return route.fulfill({json:{data:{user:{role,email:"staff@example.invalid"},csrfToken:"controlled-only"}}});
      return route.fulfill({status,json:{error:"PRIVATE_HTTP_CANARY"}});
    });
    await page.goto(`${origin}/${rolePaths[role]}`);await page.locator(role==="PHARMACY_STAFF"?"[data-pharmacy-read] h1":"[data-staff-workspace] h1").waitFor();
    if(role==="PHARMACY_STAFF"){await page.locator("[data-read-status][role=alert]").waitFor();assert.equal(await page.locator("[data-pharmacy-read] select").count(),0);}
    else assert.match(await page.locator("[data-staff-workspace]").innerText(),/unavailable|not available/);
    if(role==="ADMIN") {await page.getByRole("link",{name:"Directory",exact:true}).last().click();await page.locator(".error-panel").waitFor();}
    assert.ok(calls.every(c=>c.method==="GET" && (/\/auth\/me$|\/directory\/providers/.test(c.path)||(role==="PHARMACY_STAFF"&&c.path==="/api/v1/pharmacies/context"))),JSON.stringify(calls));
    assert.doesNotMatch(await page.locator("#main").ariaSnapshot(),/PRIVATE_HTTP_CANARY|SOURCE DIRECTIONS|Synthetic source item|PRIVATE_STAFF_CANARY/);await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({visualCases:cases,screenshots:cases ? 9 : 0,sourceSwitch:"read-only",pharmacyTransitions:"original exact artifact",liveNegatives:9,errors}));
} finally {await browser?.close();server.kill("SIGTERM");}
