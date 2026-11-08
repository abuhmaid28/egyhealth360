import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const directory='docs/brand-nova-alignment';
const r=JSON.parse(await readFile(`${directory}/evidence/browser-results.json`,'utf8'));
assert.equal(r.cases.length,96);
assert.deepEqual(r.errors,[]);assert.deepEqual(r.externalRequests,[]);assert.deepEqual(r.failedResponses,[]);
for(const c of r.cases){
  const context=`${c.locale}/${c.state}/${c.width}/${c.textScale}`;
  assert.equal(c.documentWidth,c.width,context);assert.deepEqual(c.overflow,[],context);assert.deepEqual(c.clipping,[],context);
  assert.equal(c.lang,c.locale);assert.equal(c.dir,c.locale==='ar'?'rtl':'ltr');assert.equal(c.mainCount,1);assert.equal(c.h1Count,1);
  assert.deepEqual(c.badReferences,[]);assert.deepEqual(c.duplicateIds,[]);
  assert.ok(c.ax.controls.every(x=>x.name.trim()),context);
  assert.ok(c.targets.every(t=>t.width>=44&&t.height>=44),context);
  assert.ok(c.textRatios.every(x=>Math.abs(x-c.textScale)<.001),context);
  assert.ok(c.fonts.includes(c.locale==='ar'?'Plex':'Inter'),context);
  assert.equal(c.fixture.connected,false);assert.equal(c.fixture.timeZone,'Africa/Cairo');
  assert.equal(c.fixture.appointmentStart,'2026-11-12T14:30:00+02:00');assert.equal(c.fixture.appointmentEnd,'2026-11-12T15:00:00+02:00');
  assert.equal(Date.parse(c.fixture.appointmentEnd)-Date.parse(c.fixture.appointmentStart),30*60000);
  assert.ok(!/UTC|Africa\/Cairo|14:30|15:00/.test(c.mainText),context);
  if(c.locale==='en')assert.ok(!/[\u0600-\u06ff]/.test(c.mainText),context);
  if(['loading','empty','error'].includes(c.state)){
    assert.deepEqual(c.timeInstants,[]);assert.ok(!/Omar|عمر|2:30|اتأكد|confirmed/i.test(c.appointmentText),context);
    assert.equal(c.busy,c.state==='loading'?'true':'false');assert.equal(c.alert,c.state==='error'?1:0);
  }else{
    assert.deepEqual(c.timeInstants,['2026-11-12T14:30:00+02:00','2026-11-12T15:00:00+02:00']);assert.equal(c.clinicZone,'Africa/Cairo');
    assert.ok(c.appointmentText.includes('2:30')&&c.appointmentText.includes('3:00'));
  }
  if(['no-sources','unavailable'].includes(c.state)){
    assert.equal(c.sourceArticles,0);assert.equal(c.sourceProvenance,0);
    assert.ok(!/Omar|عمر|2026|5 November|5 نوفمبر|draft|مسودة/.test(c.sharedText),context);
  }else{assert.equal(c.sourceArticles,2);assert.equal(c.sourceProvenance,2);}
}
for(const c of r.keyboard){
  assert.equal(c.skipTarget,'main');assert.equal(c.skip.outline,'solid');assert.ok(c.skip.top>=0);
  for(const a of c.actions){
    assert.equal(a.initialDialog.scrollTop,0);assert.equal(a.initialDialog.focused,'preview-title');assert.ok(a.initialDialog.titleTop>=a.initialDialog.top);
    assert.equal(a.focus.style,'solid');assert.equal(a.focus.width,'3px');assert.ok(a.forward&&a.backward&&a.returned);
    assert.ok(a.dialogClipping.width<=c.width&&a.dialogClipping.scrollWidth<=a.dialogClipping.clientWidth+2);
    assert.match(a.dialogText,c.locale==='ar'?/معاينة/:/Preview|preview/);
    if(c.locale==='en')assert.ok(!/[\u0600-\u06ff]/.test(a.dialogText));
  }
}
const report={result:'PASS',cases:r.cases.length,keyboardCases:r.keyboard.length,keyboardActions:r.keyboard.reduce((s,c)=>s+c.actions.length,0),minimumTarget:Math.min(...r.cases.flatMap(c=>c.targets.flatMap(t=>[t.width,t.height]))),textScale:'All visible direct-text samples measured exactly 2× at 200% root text; not native browser zoom.',time:{startUTC:new Date('2026-11-12T14:30:00+02:00').toISOString(),endUTC:new Date('2026-11-12T15:00:00+02:00').toISOString(),zone:'Africa/Cairo',durationMinutes:30},assertions:['96 layouts without horizontal overflow or essential text clipping','named AX controls, valid ID references, single main and h1, correct language/direction','44px target floor, skip link, 3px focus, modal trapping, Escape/focus return','identical synthetic facts and exact instants; local 12-hour presentation','loading/empty/error exclude stale appointment facts; sources remain independent','unavailable/no-shared rendered regions contain no source provenance or counts','no browser errors, failed responses or external requests'],privacyBoundary:'Rendered synthetic specimen projections only. Raw HTML/JS includes synthetic fixtures; this is not server authorization or protected-payload redaction evidence.'};
await writeFile(`${directory}/evidence/assessment.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
