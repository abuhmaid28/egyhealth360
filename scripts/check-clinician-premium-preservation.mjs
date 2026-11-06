/** Exact before-head preservation for PR #80's owner-directed CSS-only refinement. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const base='e28dbfb652c35ab12ce50496aade7caac0402203';
const directory='docs/ui-reference/clinician-premium-evidence';
const product='apps/web/src/components/clinician-consultation.module.css';
const modified=new Set([product,'docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md','docs/PROJECT.md','docs/IMPLEMENTATION_ROADMAP.md']);
const added=new Set(['scripts/capture-clinician-premium.mjs','scripts/check-clinician-premium-preservation.mjs','docs/ui-reference/CLINICIAN_PATIENT_DNA_PREMIUM.md']);
const git=(...args)=>execFileSync('git',args,{maxBuffer:32*1024*1024}).toString();
const hash=data=>createHash('sha256').update(data).digest('hex');
const tracked=git('ls-tree','-r','--name-only',base).trim().split('\n');
const preserved=[];
for(const p of tracked.filter(p=>!modified.has(p))){
 const current=readFileSync(p);assert.ok(current.equals(execFileSync('git',['show',`${base}:${p}`],{maxBuffer:32*1024*1024})),`Out-of-scope edit: ${p}`);preserved.push([p,hash(current)]);
}
const paths=[...new Set([...git('diff','--name-only',base).trim().split('\n'),...git('ls-files','--others','--exclude-standard').trim().split('\n')].filter(Boolean))].sort();
for(const p of paths)assert.ok(modified.has(p)||added.has(p)||(!tracked.includes(p)&&p.startsWith(directory+'/')),`Unbounded edit: ${p}`);
const css=readFileSync(product,'utf8');
const approvedCss=git('show',`${base}:${product}`);
for(const selector of ['.root :global(.modal)','.root :global(.modal-header)','.root :global(.modal h2)']) {
 const block=(text)=>{const start=text.indexOf(selector+' {');return text.slice(start,text.indexOf('\n}',start)+2);};
 assert.equal(block(css),block(approvedCss),`Unrelated generic dialog styling changed: ${selector}`);
}
assert.ok(!/#[\da-f]{3,8}\b|@font-face/iu.test(css),'New palette literal/font asset');
const forbidden=/\b(?:prescription|medication|vitals|results|diagnosis|mrn|age|sex)\b/iu;
const delta=git('diff',base,'--',product).split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).join('\n');
assert.ok(!forbidden.test(delta),'Forbidden capability/identity styling');
const capture=JSON.parse(readFileSync(`${directory}/after/checks.json`,'utf8')).find(x=>x.runtimeSourcesSha256);
assert.ok(capture,'Fresh built-source capture is required');
for(const [p,h] of Object.entries(capture.runtimeSourcesSha256))assert.equal(hash(readFileSync(p)),h,`Stale capture source: ${p}`);
const before=JSON.parse(readFileSync(`${directory}/before/checks.json`,'utf8')).find(x=>x.runtimeSourcesSha256);
assert.ok(before,'Fresh before capture manifest is required');
for(const [p,h] of Object.entries(before.runtimeSourcesSha256))assert.equal(hash(execFileSync('git',['show',`${base}:${p}`])),h,`Wrong before source: ${p}`);
const patient=preserved.filter(([p])=>/^docs\/ui-reference\/(?:evidence|refinement-evidence|composition-evidence|polish-evidence)\//u.test(p));
const prior=preserved.filter(([p])=>p.startsWith('docs/ui-reference/clinician-evidence/'));
const result={base,ownerComment:'6604240346',runtimeChangedPaths:[product],changedPaths:paths,preservedExistingFiles:preserved.length,patientEvidenceFiles:patient.length,priorClinicianEvidenceFiles:prior.length,preservedInventorySha256:hash(JSON.stringify(preserved)),allExistingTsTsxMjsUnchanged:true,unrelatedGenericDialogStylingUnchanged:true,patientImplementationFontsTokensAndEvidenceUnchanged:true,backendApiSchemaMigrationsOpenApiSecurityCiDependenciesAndHostingUnchanged:true,capturesBoundToCurrentRuntimeSources:true,beforeBoundToApprovedClinicianHead:true};
writeFileSync(`${directory}/preservation.json`,JSON.stringify(result,null,2)+'\n');
console.log(`PASS: CSS-only product change; ${preserved.length} existing files, ${patient.length} Patient evidence and ${prior.length} prior Clinician evidence preserved. All existing TS/TSX/MJS, command/service/route/privacy machinery unchanged.`);
