import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
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

// Retain all44 historical rows and five B5 overlays. P2 explicitly adds the
// approved DP02 application and reviewed Doctor regression helper overlays.
const overlays = {
  "apps/web/src/components/operations.tsx": "e51f634f1dfac48778b0b0d2050ba07bf433f400",
  "apps/web/src/components/v2/staff-workspace.tsx": "1b244354aec894e63495a164046bbc0569e9e8e3",
  "apps/web/src/components/v2/staff-copy.ts": "28cf7d49645068fd558797f22283dfc28cbf8518",
  "apps/web/src/components/v2/pharmacy-workspace.tsx": "737e998a3bda1f3deeafaa968e3cf44419ca2543",
  "apps/web/src/components/v2/admin-workspace.tsx": "317383ce833232984c2eed239b3cc0a8dc211c7e",
  "apps/web/src/components/application.tsx": "56682e0e560f08fc5c95a22c4304f53a1a29c35d",
  "scripts/support/ui-v2-patient-doctor-browser.mjs": "83a12bbd2f4ca4aba298c30374e6cbc830501625"
};

const visualRecoveryOverlays = {
  "apps/web/src/components/application.tsx": "5327813efdddf753b522bb36a36b3e73ebea8931",
  "apps/web/src/components/doctor.tsx": "41aeec758d5f4976592255d6db4fdff2b3528776",
  "apps/web/src/components/patient-my-care.module.css": "68e92d7589cd588872cbca8a43ba9b7464d410e6",
  "apps/web/src/components/patient-my-care.tsx": "7a13b5b5c42365c6ead57d6b1a24ffca18c0b562",
  "apps/web/src/components/patient.tsx": "507eef5fb8b76577850888ce438541da4cbfd75b",
  "scripts/support/ui-live-journey-browser.mjs": "f435d1c8f49daa9ddd41004f869a2f0324a1d265",
  "scripts/support/ui-v2-patient-doctor-browser.mjs": "b8a19cd02beb019ff9d1314a2955e5406a36cf6c",
  "tests/ui-v2-visual-integration.test.mjs": "61b1c645d2baf74ae075ded7d88fa4684f579b88"
};
const expressiveDiscoveryOverlay = {
  "apps/web/src/components/patient.tsx": "831f3c0e094ac66e24421588bf020f9fe30cf8d6"
};
const expressiveDoctorOverlay = {
  "apps/web/src/components/doctor.tsx": { "blob": "cab39a6f3b87d4863789ad139d2e39449de7a08d", "mode": "100644" }
};
const qaRecoveryOverlay = {
  "scripts/support/ui-v2-patient-doctor-browser.mjs": "56ef00878d1d0da45a6ae0cea42c761810b19a10"
};
const safeDemoPreviewOverlay = {
  "apps/web/src/components/application.tsx": "d07e7feb971b8967f87af75d2ed7d57c66c9079f"
};
test("Combined pins and historical P2 overlays are retained, with explicit Visual Recovery overrides", () => {
  assert.equal(pinned.length,44);assert.equal(Object.keys(overlays).length,7);
  assert.equal(pinned.filter(r=>!Object.hasOwn(overlays,r.path)).length,37);
  assert.equal(pinned.filter(r=>r.path.endsWith(".png")).length,17);
  assert.deepEqual(Object.keys(visualRecoveryOverlays), ["apps/web/src/components/application.tsx", "apps/web/src/components/doctor.tsx", "apps/web/src/components/patient-my-care.module.css", "apps/web/src/components/patient-my-care.tsx", "apps/web/src/components/patient.tsx", "scripts/support/ui-live-journey-browser.mjs", "scripts/support/ui-v2-patient-doctor-browser.mjs", "tests/ui-v2-visual-integration.test.mjs"]);
  assert.ok(pinned.filter(r=>r.path.endsWith(".png")).every(r=>!Object.hasOwn(visualRecoveryOverlays,r.path)));
  assert.deepEqual(Object.keys(expressiveDoctorOverlay), ["apps/web/src/components/doctor.tsx"]);
  assert.equal(visualRecoveryOverlays["apps/web/src/components/doctor.tsx"], "41aeec758d5f4976592255d6db4fdff2b3528776");
  assert.equal(expressiveDoctorOverlay["apps/web/src/components/doctor.tsx"].mode, "100644");
  assert.deepEqual(Object.keys(expressiveDiscoveryOverlay), ["apps/web/src/components/patient.tsx"]);
  assert.equal(visualRecoveryOverlays["apps/web/src/components/patient.tsx"], "507eef5fb8b76577850888ce438541da4cbfd75b");
  assert.deepEqual(Object.keys(qaRecoveryOverlay), ["scripts/support/ui-v2-patient-doctor-browser.mjs"]);
  assert.equal(visualRecoveryOverlays["scripts/support/ui-v2-patient-doctor-browser.mjs"], "b8a19cd02beb019ff9d1314a2955e5406a36cf6c");
  assert.deepEqual(Object.keys(safeDemoPreviewOverlay), ["apps/web/src/components/application.tsx"]);
  assert.equal(visualRecoveryOverlays["apps/web/src/components/application.tsx"], "5327813efdddf753b522bb36a36b3e73ebea8931");
  for(const r of pinned){const bytes=readFileSync(r.path);const hash=createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");assert.equal(hash,safeDemoPreviewOverlay[r.path]??qaRecoveryOverlay[r.path]??expressiveDoctorOverlay[r.path]?.blob??expressiveDiscoveryOverlay[r.path]??visualRecoveryOverlays[r.path]??overlays[r.path]??r.blob,r.path);assert.equal(statSync(r.path).mode&0o111?"100755":"100644",r.mode,r.path);}
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
    if (name.startsWith(".")) {
      const base = resolve(dirname(file), name);
      const target = [base, base + ".ts", base + ".tsx"].find(existsSync);
      assert.ok(target, `Unresolved source-relative module: ${name}`);
      return load(target);
    }
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
test("B5 bounds S0 imports to the exact typed Pharmacy engine and keeps offline tooling out of the application",()=>{
  function inspect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
    const path=resolve(dir,entry.name);if(entry.isDirectory())inspect(path);
    else if(/\.[jt]sx?$/.test(path)&&!path.endsWith("pharmacy-read.ts")){
      const source=readFileSync(path,"utf8");
      assert.doesNotMatch(source,/(?:from\s*|import\s*\(|require\s*\()["'][^"']*(?:public-preview-safety|verify-public-preview)/,path);
      for(const match of source.matchAll(/(?:from\s*|import\s*\(|require\s*\()["']([^"']*pharmacy-read[^"']*)["']/g)){
        assert.equal(path,resolve("apps/web/src/lib/api/pharmacy-live.ts"));assert.equal(match[1],"./pharmacy-read");
      }
    }
  }}inspect(resolve("apps/web/app"));inspect(resolve("apps/web/src"));
});

const frozenB4 = {
  "apps/web/src/components/operations.tsx": "68177748659c42e8ce8dcbc65c0a5d631560d4eff877d20945db3f6f6365cd83",
  "apps/web/src/components/v2/pharmacy-live-read.module.css": "ec9dba3701262e05447d9bbbc7ee24b6c843433d872c485aa59f72a80026c32e",
  "apps/web/src/components/v2/pharmacy-live-read.tsx": "9b098c5bb8f6b54552d047716feaf84cc516117a71bb719e3946d40b95c52df7",
  "apps/web/src/components/v2/staff-workspace.tsx": "b601d98159bf4778cf8f748a3fb1fdd8e70c3fa702607e99e8468ac856d4c827",
  "apps/web/src/lib/api/contracts.ts": "bf7f8bd997c9ccd28e1d27fd501f11e311365c6a32a936473e2e4d3b7e599115",
  "apps/web/src/lib/api/live.ts": "ef31f65d738f75252310335c2776c0939d5b5e4db85d40223a544f6fc66c3953",
  "apps/web/src/lib/api/pharmacy-live.ts": "cb2c08d9c4e965bef714e9ead9de5e796ec7a48a9c662b535625e8c0b9ebe37b",
  "docs/CURRENT_STATUS.md": "9e947bfa9ad50e399654ebaa7aeeb1b06aa1d204415ba886859870ca0f7f8780",
  "docs/SOURCE_OF_TRUTH.md": "8f5418653ab128870a6e558688831ef8c9b7f507fcfb51976e3f5e2e6031c23f",
  "docs/frontend-v2-slices/PHARMACY_LIVE_READ_INTEGRATION.md": "9f00ef430907ef1c5d178b96214da3422cd295d911c50107f155762732392e11",
  "scripts/support/ui-pharmacy-live-browser.mjs": "d1966f8a9922521ea55e381d259d7cc0fb5f4b2f8a68d9fbeab80e7cea4c65a7",
  "scripts/test-ui-browser.mjs": "c34e2dc9fd11e01e4fcae42b87b95924b0cc0b8e770d453986afc7e65d7cddf3"
};
// Original12-owner manifest retained. This remediation explicitly owns shared live.ts; runtime/script/historical receipt entries remain byte-pinned.
const sessionFenceRepairSHA256 = "357e5bc20ccba7662dec6a78893af72b801bb863ede64a289e6ce1a5dbbde786";
// The original browser entrypoint still owns all B4 cases and invokes the original pharmacy runner.
const visualBrowserRunnerSHA256 = "6233cf2bc2c002b624194d019d182a649b197d4f05d7177496cbc0f342a179cd";
// Historical immutable C3c snapshot identity (reconciled dd08b738 bridge at commit 8adbe131).
const historicalBridgeCommitC3c = "8adbe1314b190f52b8725d86f62e9db4eb075212";
const currentStatusBridgeSHA256 = "a4d5844482f2181e9fc1393d972756b95bd6316d50a10353b6deec9ada780767";
const sourceOfTruthBridgeSHA256 = "62532af5af2bf0c7d94db72cc8b58cb98d93604b146e0f8e1c237fa91a06f330";
const mutableCurrentDocs = new Set(["docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md"]);
test("Visual Recovery keeps B4 runtime and Pharmacy runner pinned, adding one explicit UI test-entrypoint overlay",()=>{
  assert.equal(Object.keys(frozenB4).length,12);
  for(const[path,hash]of Object.entries(frozenB4)) {
    if (mutableCurrentDocs.has(path)) continue;
    const expected = path === "apps/web/src/lib/api/live.ts" ? sessionFenceRepairSHA256
      : path === "scripts/test-ui-browser.mjs" ? visualBrowserRunnerSHA256 : hash;
    assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"),expected,path);
  }
  // Verify the preserved C3c baseline snapshot bytes when full commit history is present in the checkout.
  const hasC3cHistory = spawnSync("git", ["cat-file", "-e", `${historicalBridgeCommitC3c}^{commit}`]).status === 0;
  if (hasC3cHistory) {
    assert.equal(createHash("sha256").update(execFileSync("git", ["show", `${historicalBridgeCommitC3c}:docs/CURRENT_STATUS.md`])).digest("hex"), currentStatusBridgeSHA256);
    assert.equal(createHash("sha256").update(execFileSync("git", ["show", `${historicalBridgeCommitC3c}:docs/SOURCE_OF_TRUTH.md`])).digest("hex"), sourceOfTruthBridgeSHA256);
  }
  // Verify currently maintained status/index documents retain core governance structure and pass live link/classification validation.
  const currentStatus = readFileSync("docs/CURRENT_STATUS.md", "utf8");
  assert.match(currentStatus, /^# Current status/m);
  assert.ok(currentStatus.includes("dd08b7380083f7cd4ef0340a25384cb32ff67f1a"));
  assert.ok(currentStatus.includes("frontend-v2-slices/PHARMACY_LIVE_READ_INTEGRATION.md"));
  assert.ok(currentStatus.includes("FOUNDATION_CHARTER.md"));
  const sourceOfTruth = readFileSync("docs/SOURCE_OF_TRUTH.md", "utf8");
  for (const marker of ["## CURRENT AUTHORITATIVE", "## ACCEPTED CONTRACT", "## HISTORICAL EVIDENCE", "CURRENT_STATUS.md", "PHARMACY_LIVE_READ_INTEGRATION.md"]) {
    assert.ok(sourceOfTruth.includes(marker), `Missing SOURCE_OF_TRUTH marker: ${marker}`);
  }
  const docCheck = execFileSync(process.execPath, ["scripts/ci/check-docs.mjs"], { encoding: "utf8" });
  assert.match(docCheck, /: PASS$/m);
});
