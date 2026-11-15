import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import ts from "typescript";
const pinned = [
  {
    "path": "apps/web/app/layout.tsx",
    "blob": "cf11c161291dc48d00a0ea2c5d3336bc2f4bfa63",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/application.tsx",
    "blob": "97f31c86733e0d49c0df42ca53f037232f17ae62",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/clinician-consultation-presentation.tsx",
    "blob": "34c8c5b26f678593c92ca77b32c412558eb1f7be",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/consultation-close.tsx",
    "blob": "49939ccc881bc19db0c458a931bfaa01d9e95591",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/doctor.tsx",
    "blob": "e8303427ff22725e7cca6a6196b866970f0913b7",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/documentation.tsx",
    "blob": "21d7810f3c98a9bf7ccb552e9e2114674060e238",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/follow-up-intents.tsx",
    "blob": "3284ac58a5969150c77cccc6b94a4571084606b2",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/live-documentation.tsx",
    "blob": "89a7f3e5e4d8a2e1caaa1765d922dd810acce333",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/patient-my-care.module.css",
    "blob": "2dda0dd42dcd968e0dcb41291d9f9a55728e604c",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/patient-my-care.tsx",
    "blob": "4976aa08959797b7b241372756f1a9fae84ca2e1",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/patient.tsx",
    "blob": "cdfb5bd6bdf717bbf90765626397e328751bad1b",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/frontend-v2-theme.tsx",
    "blob": "4b8228b773d3594cf1b2463eb501a2ee860cd3c2",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/frontend-v2-tokens.css",
    "blob": "f0f6ea6b778d48216d5cb98a7de3442340b74936",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/FRONTEND_V2_PACKAGE_A.md",
    "blob": "deb8c41ce3af042c200c121e52a0414796dee5c0",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md",
    "blob": "50accda85343e274e08e4d3784839f5b7d2fc6dd",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-doctor-ar-dark-390.png",
    "blob": "8430e187510a0ad9b7986d1c01783d18ee4571ff",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-doctor-ar-light-390.png",
    "blob": "d2724b72f64ecab12d4a2ca933f0386b45151969",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-doctor-en-dark-1440.png",
    "blob": "f5c05578978c75ddc69708fc61fea1b3113214e5",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-doctor-en-light-1440.png",
    "blob": "9e8d7686332498fe8f31df7960dedbe7138806ca",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-patient-ar-dark-390.png",
    "blob": "d53081ff7c71beb62cddb287584de7e08164bc78",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-patient-ar-light-390.png",
    "blob": "f844897aa36313c6d50daa4abd2ec4a079d06283",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-patient-en-dark-1440.png",
    "blob": "c6b9f0839d6e15ee8669ebb0decb3641001552a3",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/a-patient-en-light-1440.png",
    "blob": "3331bd26b6f8a0e50acf6494f4c6d26a6b177bb2",
    "mode": "100644"
  },
  {
    "path": "scripts/support/ui-live-journey-browser.mjs",
    "blob": "a63d32c81dd12b16ec62cc4682bfeb9b5d612e6c",
    "mode": "100644"
  },
  {
    "path": "scripts/support/ui-v2-patient-doctor-browser.mjs",
    "blob": "3b48d89a8891ce59c54e1ddab5a5e39b345edd1d",
    "mode": "100644"
  },
  {
    "path": "tests/ui-v2-visual-integration.test.mjs",
    "blob": "dc2d534d3323d5748a3a803746fb207027fb34c5",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/operations.tsx",
    "blob": "1ae5a4e71f8e0e1e9580fc7cfdef5731599572bd",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/admin-workspace.tsx",
    "blob": "620322133e2fdedf6f5242c44e1eea0ecd5e6dd2",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/laboratory-future.tsx",
    "blob": "ac90cb2936ed950bf349313f4da07fedb00d33a7",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/pharmacy-workspace.tsx",
    "blob": "c5431ef386542199b705fffe9ec44e53e8812adb",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/staff-copy.ts",
    "blob": "96fd7fc0dfd837be325f59f7afa9b1eeab1ea3fe",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/components/v2/staff-workspace.tsx",
    "blob": "5956496fb599e7c632cbbc758919e9c746ade44b",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-admin-ar-dark-390.png",
    "blob": "afa0acb733d810bd52074fbe25873eac2c219f00",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-admin-ar-light-390.png",
    "blob": "dd964fa9884a9bad173dbcaa66d1f0b282eedc93",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-admin-en-light-1440.png",
    "blob": "4d072d483c26204d0cbfa3bb59f1b93c74dc27fa",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-lab-ar-dark-390.png",
    "blob": "515b6b0c22a0aacc9932937a6f52c3148f62c515",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-lab-ar-light-390.png",
    "blob": "a7011ced309822025d4437f42ad222135b162633",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-lab-en-light-1440.png",
    "blob": "04f74e8d818399c450708f5bef5b869e7dd7d5fd",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-pharmacy-ar-dark-390.png",
    "blob": "2c3fc7426ef0d209039c7896d0acff1f2213c9da",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-pharmacy-ar-light-390.png",
    "blob": "5845d86b50bb177ed4dbf368ad260ea1951d2ca6",
    "mode": "100644"
  },
  {
    "path": "docs/frontend-v2-slices/evidence/b-pharmacy-en-light-1440.png",
    "blob": "83e7ca8363db3e7de8003a8ec06be81217200a9f",
    "mode": "100644"
  },
  {
    "path": "tests/ui-v2-staff.test.mjs",
    "blob": "a187f8e628ae5d20af7f57d67c5072da67c6a957",
    "mode": "100644"
  },
  {
    "path": "apps/web/src/lib/api/pharmacy-read.ts",
    "blob": "c13ec07c276d180695ad25ea16ce09ab2b0733cf",
    "mode": "100644"
  },
  {
    "path": "tests/ui-pharmacy-read.test.mjs",
    "blob": "52d75afcc261ab1b543ab9bb606d6f6aeface4cb",
    "mode": "100644"
  }
];

test("Combined source preserves all44 import-only owner blobs and modes, including17 reference PNGs", () => {
  assert.equal(pinned.length, 44);
  assert.equal(pinned.filter(r => r.path.endsWith(".png")).length, 17);
  for (const r of pinned) {
    const bytes = readFileSync(r.path);
    const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(hash, r.blob, r.path);
    assert.equal(statSync(r.path).mode & 0o111 ? "100755" : "100644", r.mode, r.path);
  }
});
const webRequire = createRequire(resolve("apps/web/package.json"));
const React = webRequire("react");
const { renderToStaticMarkup } = webRequire("react-dom/server");
let locale = "en", role = "PATIENT", apiCalls = 0;
const homes = { PATIENT:"/patient", CLINICIAN:"/doctor", PHARMACY_STAFF:"/pharmacy", ADMIN:"/admin", LAB_STAFF:"/laboratory" };
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2023, jsx:ts.JsxEmit.ReactJSX } }).outputText;
  const require = name => {
    if (name.endsWith(".css")) return {default:new Proxy({}, {get:(_,k)=>String(k)})};
    if (name === "next/link") return {default:({children,...props})=>React.createElement("a",props,children)};
    if (name === "next/navigation") return {usePathname:()=>homes[role]};
    if (name.endsWith("i18n/context")) return {useLocale:()=>({locale,t:text=>locale==="ar"?(load(resolve("apps/web/src/lib/i18n/ar.ts")).ar[text]??text):text}),LanguageSwitch:()=>null};
    if (name === "./context") return {useApp:()=>({api:new Proxy({mode:"live"},{get:(obj,key)=>key==="mode"?obj.mode:()=>{apiCalls++;throw new Error("Render must not invoke adapters");}}),session:{role,mode:"live",name:"Recorded <source> identity"}})};
    if (name === "./ui") return {Icon:()=>React.createElement("svg",{"aria-hidden":true})};
    if (name.startsWith(".")) return load(resolve(dirname(file),name)+(name.endsWith(".tsx")||name.endsWith(".ts")?"":name.includes("frontend-v2-theme")?".tsx":".ts"));
    return webRequire(name);
  };
  new Function("exports","require",output)(exports,require); return exports;
}
const {PortalShell}=load(resolve("apps/web/src/components/portal-shell.tsx"));
for (const candidate of Object.keys(homes)) test(`Combined ${candidate} has one shared session-only T1 selector, scoped content and honest role shell`,()=>{
  role=candidate;
  for (locale of ["ar","en"]) {
    apiCalls=0;
    const html=renderToStaticMarkup(React.createElement(PortalShell,{toast:"",onDismiss:()=>{},onLogout:async()=>{},children:React.createElement("p",null,"Permitted source") }));
    assert.match(html,/data-frontend-v2="true"/);
    assert.match(html,new RegExp(`data-portal-shell="${role}"`));
    assert.match(html,new RegExp(`dir="${locale==="ar"?"rtl":"ltr"}"`));
    assert.equal((html.match(/<select/g)||[]).length,1);
    for(const value of ["system","light","dark"]) assert.ok(html.includes(`value="${value}"`));
    assert.ok(html.includes(`href="${homes[role]}/settings"`));
    assert.equal(html.includes('data-frontend-v2-content="true"'),role==="PATIENT"||role==="CLINICIAN");
    assert.doesNotMatch(html,/data-theme=/);
    assert.equal(apiCalls,0);
  }
});
test("Inactive S0 and offline tooling never become application imports during composition",()=>{
  function inspect(dir) {for(const entry of readdirSync(dir,{withFileTypes:true})) {
    const path=resolve(dir,entry.name);if(entry.isDirectory())inspect(path);
    else if(/\.[jt]sx?$/.test(path)&&!path.endsWith("pharmacy-read.ts"))assert.doesNotMatch(readFileSync(path,"utf8"),/(?:from\s*|import\s*\(|require\s*\()["'][^"']*(?:pharmacy-read|public-preview-safety|verify-public-preview)/,path);
  }}
  inspect(resolve("apps/web/app"));inspect(resolve("apps/web/src"));
});
