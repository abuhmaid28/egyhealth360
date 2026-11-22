import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(resolve("apps/web/package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const base = resolve("apps/web/src/components");
function renderStaff({ role = "PHARMACY_STAFF", mode = "demo", path = "/pharmacy", locale = "en", preview = "ready", error, errorAt, prescription = "Received", empty = false } = {}) {
  const calls = [];
  const source = { id:"exact-route",patient:"Source patient <script>",provider:"Source prescriber",medication:"SOURCE MEDICATION & unchanged",dosage:"SOURCE DIRECTIONS · unchanged",lab:"" };
  const resources = { artifacts:empty?[]:[source], fulfillment:{prescription,lab:"Requested",result:"PRIVATE_RESULT_CANARY"}, operations:{users:[{name:"Synthetic operational identity",role:"Pharmacy staff",status:"Active"}],organizations:[{name:"Synthetic organization",kind:"Pharmacy",status:"Active"}]}, providers:[] };
  const api = {mode};
  for(const key of Object.keys(resources)) api[key] = () => {calls.push(key);return resources[key];};
  api.updateFulfillment = () => {throw new Error("Rendering must not write");};
  const cache = new Map();
  function load(file) {
    if(cache.has(file))return cache.get(file);
    const source=readFileSync(file,"utf8");
    const exports={};cache.set(file,exports);
    const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire = name => {
      if(name.endsWith(".css"))return new Proxy({}, {get:(_,key)=>String(key)});
      if(name==="next/link")return {default:({children,href,...props})=>React.createElement("a",{href,...props},children)};
      if(name.endsWith("/context") && !name.includes("i18n"))return {useApp:()=>({api,session:{role,mode},preview,refresh:0,notify:()=>{},changed:()=>{}})};
      if(name.endsWith("i18n/context"))return {useLocale:()=>({locale,t:value=>value})};
      if(name.endsWith("/ui") || name==="./ui")return {
        useResource:load=>{const value=load();const denied=error && (!errorAt || calls.at(-1)===errorAt);return {data:denied?undefined:value,pending:false,error:denied?error:undefined,retry:()=>{}};},
        Icon:()=>React.createElement("span",{"aria-hidden":true}),
        Heading:({title,description})=>React.createElement("header",null,React.createElement("h1",null,title),React.createElement("p",null,description)),
        Card:({children})=>React.createElement("section",null,children),
        CardTitle:({title})=>React.createElement("h2",null,title),
        Detail:({title,children})=>React.createElement("div",null,title,children),
        Resource:({resource,children})=>resource.data===undefined?null:children(resource.data),
      };
      if(name.endsWith("/journey") || name==="./journey")return {DemoContinuation:()=>null};
      if(name.startsWith(".")) {const path=resolve(dirname(file),name);for(const ext of [".tsx",".ts"])try{return load(path+ext);}catch(e){if(e.code!=="ENOENT")throw e;}}
      return require(name);
    };
    new Function("require","exports",output)(localRequire,exports);return exports;
  }
  const {OperationsScreen}=load(resolve(base,"operations.tsx"));
  const html=renderToStaticMarkup(React.createElement(OperationsScreen,{path}));
  return {html,calls};
}
for(const role of ["PHARMACY_STAFF","LAB_STAFF","ADMIN"]) test(`Live ${role} never mounts demo capabilities`,()=>{
  const {html,calls}=renderStaff({role,mode:"live",path:role==="ADMIN"?"/admin":role==="LAB_STAFF"?"/laboratory":"/pharmacy"});
  assert.deepEqual(calls,[]);assert.doesNotMatch(html,/SOURCE MEDICATION|PRIVATE_RESULT_CANARY/);assert.match(html,/unavailable|not available/);
  if(role==="LAB_STAFF")assert.match(html,/FUTURE \/ CONCEPT \/ NOT LIVE/);
});
test("Pharmacy renders exact escaped source without invented quantities or result payload",()=>{
  const {html,calls}=renderStaff();assert.deepEqual(calls,["artifacts","fulfillment"]);
  assert.match(html,/SOURCE MEDICATION &amp; unchanged/);assert.match(html,/SOURCE DIRECTIONS · unchanged/);assert.match(html,/Source patient &lt;script&gt;/);
  assert.doesNotMatch(html,/PRIVATE_RESULT_CANARY|<script>/);assert.match(html,/no signed-item quantity or acceptance command/);
  assert.match(html,/Begin preparation/);assert.doesNotMatch(html,/>Confirm full-item dispensing</);
});
test("Preparing allows original full-item action; terminal and unknown states never offer writes",()=>{
  assert.match(renderStaff({prescription:"Preparing"}).html,/Confirm full-item dispensing/);
  for(const prescription of ["Dispensed","UNKNOWN"]){const {html}=renderStaff({prescription});assert.doesNotMatch(html,/Begin preparation|Confirm full-item dispensing/);}
});
test("Denied read suppresses all prior source identities, references, instructions and counts",()=>{
  const {html}=renderStaff({error:"PRIVATE_ERROR_CANARY"});assert.match(html,/This view is unavailable/);assert.doesNotMatch(html,/SOURCE|exact-route|Source patient|PRIVATE_ERROR_CANARY/);
});
test("Empty organization inbox does not invent a route or medication",()=>{
  const {html}=renderStaff({empty:true});assert.match(html,/Your prescription inbox is clear/);assert.doesNotMatch(html,/SOURCE MEDICATION|exact-route/);
});
test("Admin exposes operational identity only; exact membership remains unspecified",()=>{
  const {html,calls}=renderStaff({role:"ADMIN",path:"/admin"});assert.deepEqual(calls,["operations"]);assert.match(html,/Synthetic operational identity/);assert.match(html,/Not supplied by this projection/);assert.doesNotMatch(html,/SOURCE MEDICATION|SOURCE DIRECTIONS|Source patient|PRIVATE_RESULT_CANARY/);
});
test("Admin public directory preserves sole public read in Live",()=>{
  const {calls}=renderStaff({role:"ADMIN",mode:"live",path:"/admin/directory"});assert.deepEqual(calls,["providers"]);
});
test("Future laboratory never renders inherited result payload or fabricated patient values",()=>{
  const {html}=renderStaff({role:"LAB_STAFF",path:"/laboratory"});assert.match(html,/FUTURE \/ CONCEPT \/ NOT LIVE/);assert.match(html,/No active orders or results/);assert.doesNotMatch(html,/PRIVATE_RESULT_CANARY|SOURCE DIRECTIONS|Source patient/);
});
test("Arabic staff copy remains local and source instructions remain byte-accurate",()=>{
  const {html}=renderStaff({locale:"ar"});assert.match(html,/عمل مسند/);assert.match(html,/SOURCE DIRECTIONS · unchanged/);assert.match(html,/عرض تجريبي فقط/);
});

test("Denied exact-detail read hides its source header/reference as well as clinical fields",()=>{
  const {html}=renderStaff({error:"PRIVATE_ERROR_CANARY",errorAt:"fulfillment"});assert.match(html,/This view is unavailable/);assert.doesNotMatch(html,/exact-route|Source patient|SOURCE DIRECTIONS|SOURCE MEDICATION|PRIVATE_ERROR_CANARY/);
});
