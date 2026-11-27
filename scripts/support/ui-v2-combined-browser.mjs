/** Combined production UI + existing isolated synthetic browser fixtures only. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { myCareDemoState, switchDemoWorkspace } from "./ui-my-care-browser.mjs";
import { clinicianMasterPage } from "./ui-clinician-master-browser.mjs";
import { selectAppearance } from "./ui-v2-patient-doctor-browser.mjs";
const homes={PATIENT:"/patient",CLINICIAN:"/doctor",PHARMACY_STAFF:"/pharmacy",ADMIN:"/admin",LAB_STAFF:"/laboratory"};
const colors={light:"rgb(248, 247, 251)",dark:"rgb(16, 18, 29)"};
const footerSurface={light:"rgb(255, 255, 255)",dark:"rgb(29, 32, 48)"};
function seed(role) {
  const state=myCareDemoState();state.session.role=role;
  if(["PHARMACY_STAFF","ADMIN","LAB_STAFF"].includes(role))state.session.name="Synthetic staff";
  state.consultations.push({...state.consultations[0],appointmentId:"staff-route-A",released:true,medication:"Synthetic source item A",dosage:"SOURCE DIRECTIONS A · as entered",lab:"Synthetic training request",notes:"PRIVATE_STAFF_CANARY",diagnosis:"PRIVATE_DIAGNOSIS_CANARY"});
  return state;
}
async function demoPage(browser,origin,role,locale,width=390) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
  const page=await context.newPage(),calls=[],errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/v1/**",route=>{calls.push({method:route.request().method(),path:new URL(route.request().url()).pathname});return route.fulfill({status:503,json:{error:{message:"SYNTHETIC_PRIVATE_TRANSPORT_CANARY"}}});});
  await page.addInitScript(({locale,state})=>{
    globalThis.localStorage.setItem("eh360-ui-mode","demo");globalThis.localStorage.setItem("eh360-locale",locale);globalThis.localStorage.setItem("eh360-ui-demo-v1",JSON.stringify(state));
  },{locale,state:seed(role)});
  await page.goto(origin+homes[role]);await page.locator(`[data-portal-shell="${role}"] h1`).first().waitFor();
  if(role==="PATIENT")await page.locator("[data-appointment-anchor] h3").waitFor();
  if(["PHARMACY_STAFF","ADMIN","LAB_STAFF"].includes(role))await page.locator('[data-staff-workspace] [role="status"]').filter({hasText:/Loading|بنحمّل/}).waitFor({state:"hidden"});
  return{page,context,calls,errors};
}
async function measure(page,label,role) {
  const result=await page.evaluate(()=>{
    const root=globalThis.document.querySelector("[data-portal-shell]"),computed=globalThis.getComputedStyle;
    const visible=el=>el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
    const rgb=value=>value.match(/[\d.]+/g)?.map(Number);
    const lum=values=>values.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const background=element=>{for(let el=element;el;el=el.parentElement){const value=rgb(computed(el).backgroundColor);if(value&&(value.length<4||value[3]===1))return value;}return[255,255,255];};
    const contrast=[];
    for(const el of root.querySelectorAll("*")) {
      if(!visible(el)||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
      const style=computed(el),a=lum(rgb(style.color)),b=lum(background(el)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(style.fontSize)>=24||parseFloat(style.fontSize)>=18.66&&Number(style.fontWeight)>=700;
      if(ratio<(large?3:4.5))contrast.push({text:el.textContent.trim().slice(0,50),ratio});
    }
    const controls=[...root.querySelectorAll('button,a,input:not([type=checkbox]),textarea,select,summary')].filter(visible);
    const clipped=controls.filter(el=>{const r=el.getBoundingClientRect();return r.left < -1||r.right>globalThis.innerWidth+1||r.width>globalThis.innerWidth+1;}).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,35)}));
    const small=controls.filter(el=>el.matches("button,input,textarea,select,summary")&&el.getBoundingClientRect().height<43.5).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,35),height:el.getBoundingClientRect().height}));
    return{width:globalThis.innerWidth,scroll:globalThis.document.documentElement.scrollWidth,background:computed(root).backgroundColor,header:computed(root.querySelector(":scope > header")).backgroundColor,footer:computed(root.querySelector(":scope > footer")).backgroundColor,staff:root.querySelector("[data-staff-workspace]")?computed(root.querySelector("[data-staff-workspace]")).backgroundColor:null,contrast,clipped,small};
  });
  assert.ok(result.scroll<=result.width+1,label+": overflow "+JSON.stringify(result));
  assert.deepEqual(result.clipped,[],label+": clipped controls");assert.deepEqual(result.small,[],label+": controls below44px "+JSON.stringify(result.small));assert.deepEqual(result.contrast,[],label+": contrast "+JSON.stringify(result.contrast));
  const ax=await page.locator("[data-portal-shell]").ariaSnapshot();
  if(role!=="CLINICIAN")assert.doesNotMatch(ax+"\n"+(await page.locator("[data-portal-shell]").innerHTML()),/PRIVATE_STAFF_CANARY|PRIVATE_DIAGNOSIS_CANARY|SYNTHETIC_PRIVATE_LIVE_CANARY|SYNTHETIC_PRIVATE_TRANSPORT_CANARY/);
  return result;
}
async function fonts(page,locale) {
  const session=await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");await session.send("CSS.enable");
    const document=await session.send("DOM.getDocument");
    const node=await session.send("DOM.querySelector",{nodeId:document.root.nodeId,selector:"[data-portal-shell] header nav a"});
    const result=await session.send("CSS.getPlatformFontsForNode",{nodeId:node.nodeId});
    assert.ok(result.fonts.some(font=>font.glyphCount>0&&new RegExp(locale==="ar"?"Plex":"Inter","i").test(font.familyName)),JSON.stringify(result));
    return result.fonts.map(({familyName,glyphCount})=>({familyName,glyphCount}));
  } finally {await session.detach();}
}
async function scaleText(page) {
  return page.evaluate(()=>{
    const nodes=[...globalThis.document.querySelectorAll("[data-portal-shell], [data-portal-shell] *")];
    const sizes=nodes.map(el=>parseFloat(globalThis.getComputedStyle(el).fontSize));
    nodes.forEach((el,i)=>{el.style.setProperty("font-size",sizes[i]*2+"px","important");});
    const failed=sizes.flatMap((n,i)=>{const actual=parseFloat(globalThis.getComputedStyle(nodes[i]).fontSize);return actual===n*2?[]:[{tag:nodes[i].tagName,cls:nodes[i].className,want:n*2,actual}];});return{valid:failed.length===0,failed};
  });
}
async function restoreText(page) {await page.locator("[data-portal-shell], [data-portal-shell] *").evaluateAll(nodes=>nodes.forEach(el=>el.style.removeProperty("font-size")));}
export async function testCombinedSessionBoundaries(browser,origin) {
  const journeys=[];
  // All-role account, role, reload, mode and synthetic expired-session boundaries.
  for(const role of Object.keys(homes)) {
    const frame=await demoPage(browser,origin,role,"en"),{page}=frame;
    try {
      await selectAppearance(page,"dark");await page.reload();await page.locator(`[data-portal-shell="${role}"]`).waitFor();assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),null);
      await selectAppearance(page,"dark");
      const next=role==="PATIENT"?"ADMIN":"PATIENT";await switchDemoWorkspace(page,next);await page.locator(`[data-portal-shell="${next}"]`).waitFor();assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),null);
      await selectAppearance(page,"dark");await page.locator("[data-portal-shell] > footer button").first().click();await page.getByRole("button",{name:"Explore the patient demo",exact:true}).waitFor();assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),null);
      let loggedIn=false,expired=false;const auth=[];
      await page.route("**/api/v1/**",route=>{
        const path=new URL(route.request().url()).pathname,method=route.request().method();auth.push({path,method});
        if(path.endsWith("/auth/login")){loggedIn=true;return route.fulfill({json:{data:{user:{role,email:"synthetic@example.invalid"},csrfToken:"synthetic-only"}}});}
        if(path.endsWith("/auth/me")&&loggedIn&&!expired)return route.fulfill({json:{data:{user:{role,email:"synthetic@example.invalid"},csrfToken:"synthetic-only"}}});
        if(path.endsWith("/auth/logout")){expired=true;return route.fulfill({status:401,json:{error:{message:"SYNTHETIC_PRIVATE_TRANSPORT_CANARY"}}});}
        return route.fulfill({status:expired?401:503,json:{error:{message:"SYNTHETIC_PRIVATE_TRANSPORT_CANARY"}}});
      });
      await page.getByLabel("Email address",{exact:true}).fill("synthetic@example.invalid");await page.getByLabel("Password",{exact:true}).fill("SYNTHETIC_LOCAL_ONLY");await page.getByRole("button",{name:"Sign in with live account",exact:true}).click();await page.locator(`[data-portal-shell="${role}"]`).waitFor();assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),null);
      await selectAppearance(page,"dark");await page.locator("[data-portal-shell] > footer button").first().click();await page.waitForFunction(()=>globalThis.document.documentElement.getAttribute("data-frontend-v2-theme")===null);
      const visible=(await page.locator("body").innerHTML())+(await page.locator("body").ariaSnapshot());assert.doesNotMatch(visible,/PRIVATE_STAFF_CANARY|PRIVATE_DIAGNOSIS_CANARY|SYNTHETIC_PRIVATE_TRANSPORT_CANARY/);
      const state=await page.evaluate(()=>({local:Object.keys(globalThis.localStorage),session:Object.keys(globalThis.sessionStorage),cookie:globalThis.document.cookie}));assert.deepEqual(state.local.filter(k=>/theme|appearance|frontend-v2/i.test(k)),[]);assert.deepEqual(state.session,[]);assert.equal(state.cookie,"");
      assert.deepEqual(auth.filter(r=>r.method!=="GET").map(r=>r.path),["/api/v1/auth/login","/api/v1/auth/logout"]);assert.ok(!auth.some(r=>/pharmac|fulfill|dispens/.test(r.path)));
      journeys.push({role,reloadReset:true,accountRoleReset:true,logoutReset:true,modeReset:true,controlled401Reset:true,storage:state,authRequests:auth});
    } finally {await frame.context.close();}
  }
  return journeys;
}
export async function testCombinedV2(browser,origin,evidenceDir) {
  const out=evidenceDir?resolve(evidenceDir):await mkdtemp(join(tmpdir(),"eh135-combined-"));await mkdir(out,{recursive:true});
  const receipt={source:process.env.EH_UI_VISUAL_SOURCE_TREE ?? execFileSync("git",["rev-parse","HEAD^{tree}"],{encoding:"utf8"}).trim(),dirty:!!execFileSync("git",["status","--porcelain"],{encoding:"utf8"}).trim(),browser:browser.version(),origin,synthetic:true,scans:[],screens:[],fonts:[],axe:[],journeys:[],heldAuth:[],noJS:[]};
  for(const role of Object.keys(homes))for(const locale of["ar","en"]) {
    let frame;
    if(role==="CLINICIAN") {
      const {page,state}=await clinicianMasterPage(browser,origin,locale);await page.locator(".documentation-content textarea").first().waitFor();
      frame={page,context:page.context(),calls:state.calls,errors:state.errors,writes:state.writes};
    } else frame=await demoPage(browser,origin,role,locale);
    const {page}=frame;page.setDefaultTimeout(15000);
    try {
      await page.setViewportSize({width:390,height:1000});await page.evaluate(()=>globalThis.document.fonts.ready);
      receipt.fonts.push({role,locale,fonts:await fonts(page,locale)});
      for(const [choice,os,effective] of[["system","light","light"],["system","dark","dark"],["light","dark","light"],["dark","light","dark"]]) {
        await page.emulateMedia({colorScheme:os});await selectAppearance(page,choice);
        const result=await measure(page,`${role}/${locale}/${choice}/${os}/390`,role);
        assert.equal(result.background,colors[effective]);assert.equal(result.header,colors[effective]);assert.equal(result.footer,footerSurface[effective]);if(result.staff)assert.equal(result.staff,colors[effective]);
        assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),choice==="system"?null:choice);
        assert.equal(await page.locator("html").getAttribute("data-theme"),null);
        receipt.scans.push({role,locale,choice,os,effective,...result});
      }
      for(const appearance of["light","dark"]) {
        await page.setViewportSize({width:320,height:1000});await page.emulateMedia({colorScheme:appearance==="dark"?"light":"dark"});await selectAppearance(page,appearance);const scale=await scaleText(page);assert.equal(scale.valid,true,`${role}/${locale} text200: ${JSON.stringify(scale.failed)}`);
        receipt.scans.push({role,locale,choice:appearance,textScale:2,...await measure(page,`${role}/${locale}/${appearance}/320/text200`,role)});await restoreText(page);
      }
      if(["PHARMACY_STAFF","ADMIN","LAB_STAFF"].includes(role)) {
        await page.setViewportSize({width:1024,height:1000});receipt.scans.push({role,locale,choice:"dark",...await measure(page,`${role}/${locale}/1024`,role)});
      }
      for(const appearance of["light","dark"]) {
        const width=locale==="ar"?390:1440;await page.setViewportSize({width,height:1000});await selectAppearance(page,appearance);
        await measure(page,`${role}/${locale}/${appearance}/${width}`,role);
        if(process.env.UI_V2_AXE_PATH) {
          await page.addScriptTag({path:resolve(process.env.UI_V2_AXE_PATH)});
          const violations=await page.evaluate(async()=>{const r=await globalThis.window.axe.run(globalThis.document.querySelector("[data-portal-shell]"),{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});return r.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.map(n=>n.target)}));});
          assert.deepEqual(violations,[],`${role}/${locale}/${appearance} axe`);receipt.axe.push({role,locale,appearance,violations});
        }
        if(evidenceDir) {
          await page.evaluate(()=>{globalThis.document.activeElement?.blur();globalThis.window.scrollTo(0,0);});await page.evaluate(()=>globalThis.document.fonts.ready);
          const name=`combined-${role.toLowerCase()}-${locale}-${appearance}-${width}.png`,path=resolve(out,name);await page.screenshot({path,fullPage:true});const bytes=await readFile(path);
          receipt.screens.push({name,role,locale,appearance,viewport:{width,height:1000},deviceScaleFactor:1,fullPage:true,fixture:role==="CLINICIAN"?"clinicianMasterPage controlled GET":"myCareDemoState + isolated staff seed",source:receipt.source,sha256:createHash("sha256").update(bytes).digest("hex")});
        }
      }
      assert.deepEqual(frame.errors,[]);if(frame.writes)assert.equal(frame.writes.length,0,"Theme/presentation never invokes a clinical command");
      else assert.equal(frame.calls.length,0,"Demo does not call Live endpoints");
    } finally {await frame.context.close();}
  }
  await writeFile(resolve(out,"combined-visual-receipt.json"),JSON.stringify({...receipt,visualPhaseComplete:true},null,2)+"\n");
  console.log(`Combined visual phase PASS: ${receipt.scans.length} seams,${receipt.screens.length} screenshots,${receipt.axe.length} axe scans.`);
  receipt.journeys = await testCombinedSessionBoundaries(browser,origin);
  // Neutral first paint applies to every route, including staff restoration.
  for(const colorScheme of["light","dark"])for(const role of Object.keys(homes)) {
    const page=await browser.newPage({javaScriptEnabled:false,colorScheme});try {
      await page.goto(origin+homes[role]);assert.equal(await page.locator("body").evaluate(el=>globalThis.getComputedStyle(el).backgroundColor),colors[colorScheme]);assert.equal(await page.locator("button,a,input,textarea").count(),0);receipt.noJS.push({role,colorScheme});
    } finally {await page.close();}
  }
  for(const role of Object.keys(homes))for(const locale of["ar","en"]) {
    const page=await browser.newPage({colorScheme:"dark"});let release;const held=new Promise(r=>{release=r;});
    try {
      await page.addInitScript(locale=>{globalThis.localStorage.setItem("eh360-ui-mode","live");globalThis.localStorage.setItem("eh360-locale",locale);},locale);
      await page.route("**/api/v1/**",async route=>{await held;await route.fulfill({status:401,json:{error:{message:"SYNTHETIC_PRIVATE_TRANSPORT_CANARY"}}});});
      await page.goto(origin+homes[role]+"/settings");await page.locator("main.boot").waitFor();assert.equal(await page.locator("body").evaluate(el=>globalThis.getComputedStyle(el).backgroundColor),colors.dark);assert.equal(await page.locator("button,a,input,textarea").count(),0);assert.equal(await page.locator("html").getAttribute("data-frontend-v2-theme"),null);receipt.heldAuth.push({role,locale,colorScheme:"dark",taskControls:0});
    } finally {release();await page.close();}
  }
  await writeFile(resolve(out,"combined-browser-receipt.json"),JSON.stringify(receipt,null,2)+"\n");
  assert.ok(receipt.scans.length>=66);console.log(`Combined V2 PASS: ${receipt.scans.length} seams,${receipt.screens.length} actual screenshots,${receipt.axe.length} axe scans,5 lifecycle/401 contexts,10 noJS and10 held-auth contexts; synthetic only.`);
}
