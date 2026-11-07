import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const base='5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3';
const directory='docs/patient-three-directions';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n');
const exceptions=['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md'];
const preserved=[];
for(const path of baseline){
  if(exceptions.includes(path))continue;
  const original=execFileSync('git',['show',`${base}:${path}`],{maxBuffer:40*1024*1024});
  assert.ok(existsSync(path),`Deleted historical path ${path}`);
  assert.equal(hash(readFileSync(path)),hash(original),`Out-of-scope edit ${path}`);
  preserved.push({path,sha256:hash(original)});
}
const report={base,mode:'Every existing tracked file except two minimal current-document entries compared byte-for-byte with verified main; new files separately scoped',exceptions,preservedCount:preserved.length,preserved};
writeFileSync(`${directory}/evidence/preservation.json`,JSON.stringify(report,null,2)+'\n');
const browser=JSON.parse(readFileSync(`${directory}/evidence/browser-results.json`));
assert.equal(browser.viewports.length,15);
assert.equal(browser.errors.length+browser.externalRequests.length+browser.failedResponses.length,0);
for(const v of browser.viewports){
  assert.equal(v.documentWidth,v.width);
  assert.equal(v.overflow.length+v.clipping.length,0,`${v.candidate}/${v.width}/${v.textScale} layout`);
  assert.ok(v.rtl&&v.lang==='ar'&&v.headings===1);
  assert.ok(v.fonts.length>=3);
  assert.equal(v.motion,'auto');
  for(const t of v.targets)assert.ok(t.width>=44&&t.height>=44,`Small control ${v.candidate}: ${t.label}`);
}
for(const c of browser.interactions){
  assert.equal(c.skipTarget,'main');assert.equal(c.skip.outline,'solid');assert.equal(c.actions.length,7);
  for(const a of c.actions)assert.ok(a.open&&a.trapped&&a.returned&&a.focus.style==='solid'&&a.focus.width==='3px',`Keyboard ${c.candidate}/${a.label}`);
}
const contrast=JSON.parse(readFileSync(`${directory}/evidence/contrast.json`));
assert.equal(contrast.failures.length,0);
const facts=['سلمى حسن','د. عمر علي','Nile Care Clinic','2026-11-12','14:30–15:00','UTC+02:00','2026-11-05','التوصية دي مش حجز ميعاد.','لسه مفيش ميعاد مرتبط بالتوصية هنا.','الدكتور شارك الملخص معاك','الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية.'];
for(const c of ['a','b','c']){
  const html=readFileSync(`${directory}/${c}.html`,'utf8');
  for(const f of facts)assert.ok(html.includes(f),`${c}: missing ${f}`);
  for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('#')&&!m[1].startsWith('data:'))assert.ok(existsSync(join(directory,m[1])),`Broken HTML reference ${m[1]}`);
  assert.ok(!/(https?:\/\/|fetch\(|XMLHttpRequest)/.test(html));
}
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(join(path,d.name)):[join(path,d.name)]);}
const inventory=files(directory).filter(p=>p!==`${directory}/evidence/artifact-hashes.json`).map(path=>({path,sha256:hash(readFileSync(path))}));
writeFileSync(`${directory}/evidence/artifact-hashes.json`,JSON.stringify({files:inventory},null,2)+'\n');
console.log(`PASS: ${preserved.length} pre-existing files preserved; 15 layouts, 21 keyboard preview actions, equal synthetic facts, local references and ${inventory.length} artifact hashes.`);
