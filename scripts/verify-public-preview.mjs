/** OFFLINE-ONLY fixture CLI. Never performs a hosted/public/private request. */
import { openSync, readSync, closeSync, fstatSync, constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPreviewSafetyCheck, ERROR_CATEGORIES, getSafeErrorCategory, OFFLINE_WEB_ORIGIN, OFFLINE_API_ORIGIN, validatePreviewUrl } from "./lib/public-preview-safety.mjs";
const argumentError = code => { throw new Error(code); };
export function parseCliArgs(args) {
  const options = {url:null,apiUrl:null,expectedSha:null,timeout:10000,json:false,offlineFixture:null};
  const seen = new Set();
  const fields = {"--url":"url","--api-url":"apiUrl","--expected-sha":"expectedSha","--timeout":"timeout","--offline-fixture":"offlineFixture"};
  const mark = key => { if (seen.has(key)) argumentError(ERROR_CATEGORIES.DUPLICATE_ARGUMENT);seen.add(key); };
  for (let i=0;i<args.length;i++) {
    const arg=args[i];if(typeof arg!=="string")argumentError(ERROR_CATEGORIES.UNKNOWN_OPTION);
    if (arg === "--help" || arg === "-h") {mark("help");options.help=true;}
    else if (arg === "--json") {mark("json");options.json=true;}
    else if (Object.hasOwn(fields,arg)) {
      const field=fields[arg];mark(field);
      const value=args[++i];if (typeof value!=="string" || !value || value.startsWith("--")) argumentError(ERROR_CATEGORIES.MISSING_ARGUMENT_VALUE);
      options[field]=value;
    } else if (arg.startsWith("-")) argumentError(ERROR_CATEGORIES.UNKNOWN_OPTION);
    else {mark("url");options.url=arg;}
  }
  options.timeout=Number(options.timeout);
  if (!Number.isInteger(options.timeout) || options.timeout<1000 || options.timeout>60000) argumentError(ERROR_CATEGORIES.INVALID_TIMEOUT);
  return options;
}
export function printHelp() {
  console.log("EgyHealth360 OFFLINE-ONLY fixture inspection\nUsage: node scripts/verify-public-preview.mjs --offline-fixture <file> [--json] [--timeout 1000..60000]\nOptional --url / --api-url identify reserved offline fixtures only. No hosted origin, DNS, source, rights or clinical attestation. Injected test code is trusted, not universally proven offline or forcibly terminable.");
}
const checkNames = new Set(["Test Transport Isolation Check","Offline Target Validation","Web Root Fixture","Proxied Health Fixture","Direct API Health Fixture","Source SHA Attestation","AP05 Brand & Asset Inventory"]);
const statuses = new Set(["PASS","FAIL","WARN","NOT_VERIFIED"]);
/** Deliberately does not stringify arbitrary check details, target values or errors. */
export function formatTerminalReport(report) {
  const lines=["EgyHealth360 — OFFLINE_ONLY fixture results", "Origin / DNS / hosted source / clinical readiness: NOT_VERIFIED"];
  try {
    const state=Object.getOwnPropertyDescriptor(report,"overallStatus")?.value;
    lines.push("Overall State: "+(statuses.has(state)?state:"FAIL"));
    const checks=Object.getOwnPropertyDescriptor(report,"checks")?.value;
    if (Array.isArray(checks)) for (const check of checks.slice(0,32)) {
      const name=Object.getOwnPropertyDescriptor(check,"name")?.value, status=Object.getOwnPropertyDescriptor(check,"status")?.value;
      lines.push((statuses.has(status)?status:"FAIL")+": "+(checkNames.has(name)?name:"UNRECOGNIZED_CHECK"));
      const details=Object.getOwnPropertyDescriptor(check,"details")?.value;
      const code=details && Object.getOwnPropertyDescriptor(details,"errorCategory")?.value;
      if (typeof code === "string" && Object.hasOwn(ERROR_CATEGORIES,code)) lines.push("Category: "+code);
    }
  } catch {lines.push("FAIL: INVALID_REPORT");}
  return lines.join("\n");
}
function readFixture(path) {
  let fd;
  try {
    fd=openSync(path,constants.O_RDONLY|constants.O_NONBLOCK);
    if (!fstatSync(fd).isFile()) throw new Error();
    const maximum=2*1024*1024, bytes=globalThis.Buffer.alloc(maximum+1);let count=0;
    while (count<bytes.length) {const n=readSync(fd,bytes,count,bytes.length-count,null);if(!n)break;count+=n;}
    if (count>maximum) throw new Error();
    const data=JSON.parse(new globalThis.TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(0,count)));
    if (!data || typeof data!=="object" || Array.isArray(data)) throw new Error();
    return data;
  } finally {if(fd!==undefined)closeSync(fd);}
}
function fixtureTransport(fixtures) {
  return async target => {
    const key=target===OFFLINE_WEB_ORIGIN+"/"?"web":target===OFFLINE_WEB_ORIGIN+"/api/v1/health"?"health":target===OFFLINE_API_ORIGIN+"/api/v1/health"?"api":null;
    if (!key) throw new Error(ERROR_CATEGORIES.INVALID_URL);
    const row=fixtures[key] ?? fixtures.default;
    if (!row || typeof row!=="object" || typeof row.body!=="string" || row.body.length>1048576) throw new Error(ERROR_CATEGORIES.INVALID_RESPONSE);
    // Encode bounded segments, retaining surrogate pairs across segment boundaries.
    let cursor=0;
    return {status:Object.hasOwn(row,"status")?row.status:200,headers:new globalThis.Headers(row.headers ?? {}),body:new globalThis.ReadableStream({pull(controller) {
      if (cursor>=row.body.length) {controller.close();return;}
      let end=Math.min(cursor+512,row.body.length);
      const last=row.body.charCodeAt(end-1);if(end<row.body.length&&last>=0xd800&&last<=0xdbff)end++;
      controller.enqueue(new globalThis.TextEncoder().encode(row.body.slice(cursor,end)));cursor=end;
    }})};
  };
}
export async function main(argv=process.argv.slice(2)) {
  let options;
  try {options=parseCliArgs(argv);} catch(error) {console.error("Error: "+getSafeErrorCategory(error));return 1;}
  if(options.help){printHelp();return 0;}
  if(!options.offlineFixture){console.error("Error: TEST_TRANSPORT_REQUIRED");return 1;}
  options.url ??= OFFLINE_WEB_ORIGIN;
  try {validatePreviewUrl(options.url);if(options.apiUrl)validatePreviewUrl(options.apiUrl);}catch(error){console.error("Error: "+getSafeErrorCategory(error));return 1;}
  let fixtures;
  try {fixtures=readFixture(resolve(options.offlineFixture));}catch{console.error("Error: OFFLINE_FIXTURE_UNAVAILABLE_OR_INVALID");return 1;}
  const report=await runPreviewSafetyCheck(options,fixtureTransport(fixtures));
  console.log(options.json?JSON.stringify(report,null,2):formatTerminalReport(report));
  return report.overallStatus==="FAIL"?1:0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().then(code=>{process.exitCode=code;}).catch(error=>{console.error("Fatal execution error: "+getSafeErrorCategory(error));process.exitCode=1;});
}
