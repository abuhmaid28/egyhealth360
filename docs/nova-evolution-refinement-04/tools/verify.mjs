import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const base='5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3';
const source='6e1d5aa011d2e229f17e22415bf3efe0aa035c49';
const directory='docs/nova-evolution-refinement-04';
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
const facts=['سلمى حسن','د. عمر علي','Nile Care Clinic','2026-11-12','2026-11-05','2026-11-12T14:30:00+02:00','2026-11-12T15:00:00+02:00','data-time-zone="Africa/Cairo"','متابعتي','دور على دكتور','الملخصات والمتابعة','السجل المتاح','روشتاتك','دي توصية من الدكتور، مش ميعاد محجوز.','لسه مفيش ميعاد مربوط بالمتابعة دي هنا.','الدكتور شارك الملخص معاك','مش متاحة في المعاينة دي','الحجز لوحده مش بيشارك معلوماتك الطبية.'];
for(const fact of facts)assert.ok(html.includes(fact),`Missing preserved fact or bounded meaning: ${fact}`);
assert.ok(!/(class="avatar"|doctor-monogram|س ح|ع ع)/.test(html));
const preview=readFileSync(`${directory}/specimen.js`,'utf8');
assert.ok(preview.includes('الحجز لوحده مش بيدي الدكتور صلاحية يشوف معلوماتك الطبية. طلب الرعاية الجديد محتاج موافقتك وقبول الدكتور.'));
const meaning=JSON.parse(readFileSync(`${directory}/evidence/content-checks.json`));
assert.ok(meaning.main.noTechnicalTime&&meaning.main.noInitials&&meaning.main.spriteComplete&&meaning.appointment.sameInstants&&meaning.privacy.detailPreservesBothApprovals);
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('#')&&!m[1].startsWith('data:'))assert.ok(existsSync(join(directory,m[1])),`Broken HTML reference ${m[1]}`);
const comparison=JSON.parse(readFileSync(`${directory}/evidence/comparison-sources.json`));
for(const f of comparison.fingerprints){
  assert.equal(hash(git('show',`${source}:${f.sourcePath}`)),f.beforeSha256);
  assert.equal(hash(readFileSync(`${directory}/evidence/refined-ar-${f.width}-full.png`)),f.afterSha256);
}
for(const name of ['manrope.ttf','plex-arabic-regular.ttf','plex-arabic-semibold.ttf','manrope-OFL.txt','plex-arabic-OFL.txt'])assert.equal(hash(readFileSync(`${directory}/assets/${name}`)),hash(git('show',`${source}:docs/nova-evolution-refinement-03/assets/${name}`)));
const changed=git('diff','--name-only',base).toString().trim().split('\n').filter(Boolean);
for(const path of changed)assert.ok(path.startsWith(directory+'/')||exceptions.includes(path),`Unscoped path ${path}`);
const report={base,primaryVisualSource:source,preservedCount:paths.length,exceptions,method:'Every pre-existing tracked file except two bounded documentation notices compared byte-for-byte with main using SHA-256.',sortedInventorySha256:hash(inventory.join('\n')+'\n'),protectedEvidence:'All historical/main screenshots included in this comparison; PR92 remote head separately rechecked at handoff.',visibleText:'Authorized editorial rewrite; factual identities, both exact appointment instants, source dates, independent recommendation/summary, bounded history/Rx and access meaning checked separately in content-checks.json.',previewJavaScript:'Same seven local preview actions; copy simplified, consent/acceptance explanation retained in existing appointment detail.',layouts:6,keyboardActions:7,contrastObservations:contrast.observations,minimumSampledTextContrast:contrast.minimum,changed};
writeFileSync(`${directory}/evidence/preservation.json`,JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${paths.length} original tracked files preserved; factual instants and bounded meanings preserved; 6 layouts, 7 keyboard actions and ${contrast.observations} contrast samples.`);
