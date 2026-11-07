import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const base='5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3';
const source='e760ed4332ffca876702b32f6ffd4b1787d20783';
const directory='docs/nova-evolution-refinement-03';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{maxBuffer:50*1024*1024});
const exceptions=['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md'];
const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n').filter(p=>!exceptions.includes(p));
const inventory=[];
for(const path of paths){
  assert.ok(existsSync(path),`Deleted historical path ${path}`);
  const expected=hash(git('show',`${base}:${path}`));
  assert.equal(hash(readFileSync(path)),expected,`Out-of-scope edit ${path}`);
  inventory.push(`${expected}  ${path}`);
}
const browser=JSON.parse(readFileSync(`${directory}/evidence/browser-results.json`));
assert.equal(browser.viewports.length,6);
assert.equal(browser.errors.length+browser.externalRequests.length+browser.failedResponses.length,0);
for(const v of browser.viewports){
  assert.equal(v.documentWidth,v.width);
  assert.equal(v.overflow.length+v.clipping.length,0,`${v.width}/${v.textScale} layout`);
  assert.ok(v.rtl&&v.lang==='ar'&&v.headings===1);
  assert.equal(v.fonts.length,3);assert.equal(v.motion,'auto');
  for(const t of v.targets)assert.ok(t.width>=44&&t.height>=44,`Small target: ${t.label}`);
}
for(const c of browser.interactions){
  assert.equal(c.skipTarget,'main');assert.equal(c.skip.outline,'solid');assert.equal(c.actions.length,7);
  for(const a of c.actions)assert.ok(a.open&&a.trapped&&a.reverseTrapped&&a.returned&&a.focus.style==='solid'&&a.focus.width==='3px',`Keyboard ${a.label}`);
}
const contrast=JSON.parse(readFileSync(`${directory}/evidence/contrast.json`));assert.equal(contrast.failures.length,0);
const html=readFileSync(`${directory}/index.html`,'utf8');
const original=git('show',`${source}:docs/nova-evolution-refinement/index.html`).toString();
const bodyText=h=>h.split('<body>')[1].replace(/<[^>]*>/g,' ').replace(/REFINEMENT 0[13]/g,'REFINEMENT').replace('ع ع','').replace(/\s+/g,' ').trim();
assert.equal(bodyText(html),bodyText(original),'All original visible copy and synthetic facts preserved except removed doctor initials and specimen revision');
assert.equal(hash(readFileSync(`${directory}/specimen.js`)),hash(git('show',`${source}:docs/nova-evolution-refinement/specimen.js`)),'Preview behavior preserved');
assert.ok(!html.includes('doctor-monogram')&&!html.includes('ع ع'));
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('#')&&!m[1].startsWith('data:'))assert.ok(existsSync(join(directory,m[1])),`Broken HTML reference ${m[1]}`);
const comparison=JSON.parse(readFileSync(`${directory}/evidence/comparison-sources.json`));
for(const f of comparison.fingerprints)assert.equal(hash(git('show',`${source}:${f.sourcePath}`)),f.beforeSha256);
const changed=git('diff','--name-only',base).toString().trim().split('\n').filter(Boolean);
for(const path of changed)assert.ok(path.startsWith(directory+'/')||exceptions.includes(path),`Unscoped path ${path}`);
const report={base,primaryVisualSource:source,preservedCount:paths.length,exceptions,method:'Every pre-existing tracked file except two bounded documentation notices compared byte-for-byte with main using SHA-256.',sortedInventorySha256:hash(inventory.join('\n')+'\n'),protectedEvidence:'All historical/main screenshots included in this comparison; PR91 remote head separately rechecked at handoff.',visibleText:'Exact body text equality against pinned PR91, excluding only doctor initials and specimen revision label.',previewJavaScript:'Byte-identical to pinned PR91.',layouts:6,keyboardActions:7,contrastObservations:contrast.observations,minimumSampledTextContrast:contrast.minimum,changed};
writeFileSync(`${directory}/evidence/preservation.json`,JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${paths.length} original tracked files preserved; all visible copy/facts preserved; 6 layouts, 7 keyboard actions and ${contrast.observations} contrast samples.`);
