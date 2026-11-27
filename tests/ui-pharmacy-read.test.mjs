import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
// Pure module: no imports, compilation output or request ever reaches disk/network.
const source = readFileSync("apps/web/src/lib/api/pharmacy-read.ts", "utf8");
const exports = {};
const blocked = () => { throw new Error("NETWORK_MUST_NOT_RUN"); };
new Function("exports", "fetch", "window", "localStorage", ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports, blocked, undefined, undefined);
const { createPharmacyRead, parsePharmacyList, parsePharmacyDetail, PharmacyReadError } = exports;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const when = "2026-11-15T09:00:00.000Z";
const selector = { pharmacyId: id(1) };
const item = n => ({ id: id(n), medicationId: id(20+n), medicationDisplay: "Synthetic source medication", quantity: "123.4500", unit: "source unit", instructions: "تعليمات المصدر · unchanged", fulfillmentState: "NOT_DISPENSED", dispense: null });
function route() { return { id: id(2), prescriptionId: id(3), pharmacyId: id(1), pharmacyName: "Synthetic pharmacy", version: 1, state: "PENDING", recordedState: "PENDING", purpose: "FULFILLMENT", createdAt: when, patientDisplayName: "Synthetic source identity", validFrom: when, validUntil: "2026-12-15T09:00:00Z", transitions: [{ state: "PENDING", recordedAt: when, reason: null }], items: [item(4)] }; }
function fact(i) { return { id: id(100), routeId: id(2), pharmacyId: id(1), pharmacyName: "Synthetic pharmacy", dispensedAt: when, medicationId: i.medicationId, medicationDisplay: i.medicationDisplay, quantity: i.quantity, unit: i.unit, correctionVersion: 2, corrections: [{ id: id(101), kind: "REVERSAL", reason: "Synthetic erroneous original fact", recordedAt: when }, { id: id(102), kind: "CORRECTION", reason: "Synthetic prior correction", recordedAt: when }], correctionHistoryMeta: { page: 1, pageSize: 20, total: 2 }, reversed: true }; }
function history() { const r=route();r.purpose="CORRECTION_HISTORY";r.patientDisplayName=null;r.state="COMPLETED";r.recordedState="ACCEPTED";r.version=2;r.transitions.push({state:"ACCEPTED",recordedAt:when,reason:null});r.items[0].instructions=null;r.items[0].fulfillmentState="FULLY_DISPENSED";r.items[0].dispense=fact(r.items[0]);return r; }
const envelope = (r=route(), purpose="fulfillment") => ({data:[r],meta:{page:1,pageSize:20,total:1,purpose}});
function safe(code) { return e => { assert.ok(e instanceof PharmacyReadError);assert.equal(e.code,code);assert.equal(e.message,"Pharmacy read failed.");assert.doesNotMatch(JSON.stringify(e)+String(e)+e.stack,/PRIVATE_CANARY|password=|RAW_BODY/);return true; }; }
test("inactive import/factory has no network or auth side effects; transport is mandatory",()=>{
  assert.doesNotMatch(source,/\b(?:fetch|window|localStorage|sessionStorage|console)\s*[.(]/);
  assert.throws(()=>createPharmacyRead(),safe("INVALID_INPUT"));let calls=0;
  const api=createPharmacyRead(async()=>{calls++;return {status:200,body:envelope()};});
  assert.equal(calls,0);assert.equal(api.authority,"NOT_VERIFIED");assert.equal(api.readiness,"NOT_VERIFIED");assert.deepEqual(Object.keys(api).sort(),["authority","detail","list","readiness"]);
});
test("GET-only canonical list and detail; exact source strings and provenance survive",async()=>{
  const calls=[];const api=createPharmacyRead(async req=>{calls.push(req);return {status:200,body:calls.length===1?JSON.stringify(envelope()):{data:route()}};});
  const list=await api.list(selector),detail=await api.detail({...selector,routeId:id(2),page:2,pageSize:3});
  assert.deepEqual(calls,[{method:"GET",cache:"no-store",path:`/api/v1/pharmacies/${id(1)}/routes?page=1&pageSize=20&purpose=fulfillment`},{method:"GET",cache:"no-store",path:`/api/v1/pharmacies/${id(1)}/routes/${id(2)}?page=2&pageSize=3&purpose=fulfillment`}]);
  assert.equal(list.data[0].items[0].quantity,"123.4500");assert.equal(detail.data.items[0].instructions,"تعليمات المصدر · unchanged");assert.equal(detail.data.prescriptionId,id(3));assert.ok(Object.isFrozen(calls[0]));
});
for(const change of [{pharmacyId:""},{pharmacyId:"../PRIVATE_CANARY"},{pharmacyId:"https://PRIVATE_CANARY"},{pharmacyId:id(1).toUpperCase()+"?x"},{page:0},{page:10001},{page:1.2},{page:"1"},{pageSize:0},{pageSize:101},{pageSize:NaN},{purpose:"CORRECTION_HISTORY"},{purpose:"forensic"},{method:"POST"},{path:"/auth/login"},{headers:{cookie:"PRIVATE_CANARY"}},{patientId:id(9)},{search:"PRIVATE_CANARY"}]) test(`invalid selector ${Object.keys(change).join()} rejected before transport ${JSON.stringify(change)}`,async()=>{
  let calls=0;const api=createPharmacyRead(async()=>{calls++;return {status:200,body:envelope()};});await assert.rejects(api.list({...selector,...change}),safe("INVALID_INPUT"));assert.equal(calls,0);
});
test("strict route ID and pagination edges; no staff discovery or arbitrary input path",async()=>{
  let calls=0;const api=createPharmacyRead(async()=>{calls++;return {status:200,body:{data:route()}};});
  for(const routeId of [undefined,"",id(2)+"/accept","../x","PRIVATE_CANARY"])await assert.rejects(api.detail({...selector,routeId}),safe("INVALID_INPUT"));
  await api.detail({...selector,routeId:id(2),page:10000,pageSize:100});assert.equal(calls,1);
});
test("history projection is distinct, minimized, immutable and contains real reversed fact",async()=>{
  const r=history();const h=parsePharmacyDetail({data:r},{...selector,routeId:r.id,purpose:"history"});
  assert.equal(h.data.patientDisplayName,null);assert.equal(h.data.items[0].instructions,null);assert.equal(h.data.state,"COMPLETED");assert.equal(h.data.recordedState,"ACCEPTED");assert.equal(h.data.items[0].fulfillmentState,"FULLY_DISPENSED");assert.equal(h.data.items[0].dispense.reversed,true);assert.equal(h.data.items[0].dispense.correctionVersion,2);assert.equal(h.data.items[0].dispense.correctionHistoryMeta.total,2);
  assert.ok(Object.isFrozen(h.data.items[0].dispense.corrections[0]));r.items[0].dispense.corrections[0].reason="PRIVATE_CANARY";assert.notEqual(h.data.items[0].dispense.corrections[0].reason,r.items[0].dispense.corrections[0].reason);
  const omitted=history();delete omitted.patientDisplayName;delete omitted.items[0].instructions;assert.equal(parsePharmacyDetail({data:omitted},{...selector,routeId:id(2),purpose:"history"}).data.patientDisplayName,null);
  const api=createPharmacyRead(async req=>({status:200,body:req.path.includes("purpose=history")?envelope((()=>{const r=history();r.items[0].dispense.correctionHistoryMeta.pageSize=1;r.items[0].dispense.corrections=r.items[0].dispense.corrections.slice(0,1);return r;})(),"history"):envelope()}));
  const f=await api.list(selector),g=await api.list({...selector,purpose:"history"});assert.notEqual(f.data[0].patientDisplayName,g.data[0].patientDisplayName);
});
test("mixed item truth preserved; no expiry/reversal calculation or legacy state coercion",()=>{
  const r=route();r.state=r.recordedState="ACCEPTED";r.items.push(item(5));r.items[0].fulfillmentState="FULLY_DISPENSED";r.items[0].dispense=fact(r.items[0]);r.items[0].dispense.correctionHistoryMeta.pageSize=1;r.items[0].dispense.corrections=r.items[0].dispense.corrections.slice(0,1);
  const value=parsePharmacyList(envelope(r),selector);assert.deepEqual(value.data[0].items.map(i=>i.fulfillmentState),["FULLY_DISPENSED","NOT_DISPENSED"]);
  for(const state of ["COMPLETED","CANCELLED","REPLACED","EXPIRED"]){const r=history();r.state=state;assert.equal(parsePharmacyDetail({data:r},{...selector,routeId:id(2),purpose:"history"}).data.state,state);}
});
for(const [status,code] of [[401,"UNAUTHENTICATED"],[403,"FORBIDDEN"],[404,"NOT_FOUND"],[409,"CONFLICT"],[503,"UNAVAILABLE"],[500,"TRANSPORT_UNKNOWN"],[302,"TRANSPORT_UNKNOWN"],[204,"TRANSPORT_UNKNOWN"]]) test(`HTTP ${status} never returns fake empty or raw server error`,async()=>{
  const api=createPharmacyRead(async()=>({status,body:{error:{code:"PRIVATE_CANARY",message:"RAW_BODY password=secret"},data:[]}}));await assert.rejects(api.list(selector),safe(code));
});
test("transport rejection is safe, single attempt, no retries/fallback/cause",async()=>{
  let n=0;const api=createPharmacyRead(async()=>{n++;throw new Error("PRIVATE_CANARY password=secret");});await assert.rejects(api.list(selector),safe("TRANSPORT_UNKNOWN"));assert.equal(n,1);
});
const mutations=[
  r=>{r.extra="PRIVATE_CANARY";},r=>{r.patientId=id(99);},r=>{r.items[0].routingHistory=[];},r=>{r.state="Preparing";},r=>{r.recordedState="COMPLETED";},r=>{r.version="1";},r=>{r.pharmacyId=id(99);},r=>{r.purpose="CORRECTION_HISTORY";},r=>{r.items[0].quantity=2;},r=>{r.items[0].quantity="0";},r=>{r.items[0].quantity="1e3";},r=>{r.items[0].quantity="-1";},r=>{r.items[0].fulfillmentState="Dispensed";},r=>{r.items[0].fulfillmentState="FULLY_DISPENSED";},r=>{r.createdAt="PRIVATE_CANARY";},r=>{r.transitions[0].actor="PRIVATE_CANARY";},r=>{r.items.push({...r.items[0]});},
];
mutations.forEach((mutate,n)=>test(`malformed/source-leaking response ${n} rejected without payload exposure`,()=>{const r=route();mutate(r);assert.throws(()=>parsePharmacyList(envelope(r),selector),safe("INVALID_RESPONSE"));}));
test("history rejects patient/instructions, unrelated facts, undisposed items and receipt-only visibility",()=>{
  for(const mutate of [r=>{r.patientDisplayName="PRIVATE_CANARY";},r=>{r.items[0].instructions="PRIVATE_CANARY";},r=>{r.items[0].dispense.routeId=id(90);},r=>{r.items[0].dispense.quantity="999";},r=>{r.items[0].dispense.actor="PRIVATE_CANARY";},r=>{r.items[0].dispense.corrections[0].extra="PRIVATE_CANARY";},r=>{r.state="ACCEPTED";},r=>{r.items[0].fulfillmentState="NOT_DISPENSED";r.items[0].dispense=null;}]){const r=history();mutate(r);assert.throws(()=>parsePharmacyDetail({data:r},{...selector,routeId:id(2),purpose:"history"}),safe("INVALID_RESPONSE"));}
  assert.throws(()=>parsePharmacyList({data:history()},{...selector,purpose:"history"}),safe("INVALID_RESPONSE"));
});
test("invalid JSON, envelopes, pagination, cross-route and malformed transport safely fail",async()=>{
  for(const body of ["PRIVATE_CANARY RAW_BODY",null,[],{data:[],meta:{page:1,pageSize:20,total:0,purpose:"history"}},{data:[],meta:{page:2,pageSize:20,total:0,purpose:"fulfillment"}},{data:[],meta:{page:1,pageSize:20,total:-1,purpose:"fulfillment"}},{...envelope(),receipt:"PRIVATE_CANARY"}]){const api=createPharmacyRead(async()=>({status:200,body}));await assert.rejects(api.list(selector),safe("INVALID_RESPONSE"));}
  assert.throws(()=>parsePharmacyDetail({data:route()},{...selector,routeId:id(77)}),safe("INVALID_RESPONSE"));
  for(const response of [undefined,null,{}, {status:"200",body:envelope()},{status:200,body:envelope(),headers:{cookie:"PRIVATE_CANARY"}}])await assert.rejects(createPharmacyRead(async()=>response).list(selector),safe("INVALID_RESPONSE"));
});
test("plain data only: accessors/symbols/sparse arrays/prototype branches never leak",()=>{
  let invoked=0;const r=route();Object.defineProperty(r,"patientDisplayName",{enumerable:true,get(){invoked++;throw new Error("PRIVATE_CANARY");}});assert.throws(()=>parsePharmacyList(envelope(r),selector),safe("INVALID_RESPONSE"));assert.equal(invoked,0);
  const s=route();s[Symbol("PRIVATE_CANARY")]=1;assert.throws(()=>parsePharmacyList(envelope(s),selector),safe("INVALID_RESPONSE"));
  const a=route();a.items=new Array(1);assert.throws(()=>parsePharmacyList(envelope(a),selector),safe("INVALID_RESPONSE"));
  const p=Object.create(route());assert.throws(()=>parsePharmacyList(envelope(p),selector),safe("INVALID_RESPONSE"));
});
test("valid empty queue is explicit success only, pagination/selection never manufactures entitlement",()=>{
  const x={data:[],meta:{page:10000,pageSize:100,total:0,purpose:"fulfillment"}};assert.deepEqual(parsePharmacyList(x,{...selector,page:10000,pageSize:100}),x);
});
test("untrusted proxies cannot override safe exception output or evaluated data",async()=>{
  const injected=new PharmacyReadError("FORBIDDEN");injected.message="PRIVATE_CANARY";injected.stack="PRIVATE_CANARY";
  for(const trap of ["getPrototypeOf","ownKeys","getOwnPropertyDescriptor"]){const response=new Proxy({status:200,body:envelope()},{[trap](){throw injected;}});await assert.rejects(createPharmacyRead(async()=>response).list(selector),safe("INVALID_RESPONSE"));}
  let reads=0;const response=new Proxy({status:200,body:envelope()},{get(t,k){if(k==="status"){reads++;throw injected;}return Reflect.get(t,k);}});
  assert.equal((await createPharmacyRead(async()=>response).list(selector)).data.length,1);assert.equal(reads,0);
  for(const date of ["2026-02-30T09:00:00Z","2026-13-01T09:00:00Z","2026-11-01T24:00:00Z"]){const r=route();r.createdAt=date;assert.throws(()=>parsePharmacyList(envelope(r),selector),safe("INVALID_RESPONSE"));}
});

test("nested correction metadata binds queue summary vs exact detail page without invented full history",()=>{
  const r=history();r.items[0].dispense.correctionHistoryMeta.pageSize=1;r.items[0].dispense.corrections=r.items[0].dispense.corrections.slice(0,1);assert.equal(parsePharmacyList(envelope(r,"history"),{...selector,purpose:"history"}).data.length,1);
  assert.throws(()=>parsePharmacyList(envelope(history(),"history"),{...selector,purpose:"history"}),safe("INVALID_RESPONSE"));
  const detail=history();detail.items[0].dispense.corrections=[];detail.items[0].dispense.correctionHistoryMeta={page:2,pageSize:3,total:2};assert.equal(parsePharmacyDetail({data:detail},{...selector,routeId:id(2),purpose:"history",page:2,pageSize:3}).data.items[0].dispense.reversed,true);
  for(const change of [d=>{d.reversed=false;},d=>{d.correctionVersion=0;},d=>{d.corrections.push({...d.corrections[0]});},d=>{d.correctionHistoryMeta.total=0;}]){const r=history();change(r.items[0].dispense);assert.throws(()=>parsePharmacyDetail({data:r},{...selector,routeId:id(2),purpose:"history"}),safe("INVALID_RESPONSE"));}
  const nullItems=history();nullItems.items=null;assert.throws(()=>parsePharmacyDetail({data:nullItems},{...selector,routeId:id(2),purpose:"history"}),safe("INVALID_RESPONSE"));
});

test("same-snapshot pagination never accepts falsely empty/truncated queue or correction history",()=>{
  for(const data of [[],[route()]])assert.throws(()=>parsePharmacyList({data,meta:{page:1,pageSize:20,total:2,purpose:"fulfillment"}},selector),safe("INVALID_RESPONSE"));
  const r=history();r.items[0].dispense.corrections=[];assert.throws(()=>parsePharmacyDetail({data:r},{...selector,routeId:id(2),purpose:"history"}),safe("INVALID_RESPONSE"));
  const array=new Proxy([item(4)],{get(t,k){if(k==="length")throw new Error("PRIVATE_CANARY");return Reflect.get(t,k);}});const a=route();a.items=array;assert.equal(parsePharmacyList(envelope(a),selector).data[0].items.length,1);
});
