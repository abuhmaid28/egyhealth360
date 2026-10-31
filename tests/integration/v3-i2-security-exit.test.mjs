import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {draftBody} from '../support/documentation.mjs';
import {observeApplicabilityQueries,signal,waitBlockedBy} from '../support/observed-applicability.mjs';

const count=async f => Object.fromEntries(await Promise.all([
  'bookings','booking_operations','consultation_documents','consultation_document_versions','consultation_document_operations',
  'follow_up_intents','follow_up_intent_versions','follow_up_intent_operations','follow_up_intent_booking_links',
  'consultation_privacy_restrictions','follow_up_intent_privacy_restrictions','audit_logs',
].map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));

async function clinicalSources(f) {
  const c=await f.readyIntent(), docs='/consultations/'+c.id+'/documents', intents='/consultations/'+c.id+'/follow-up-intents';
  const key=randomUUID(), noteBody=draftBody('PRIVATE_NOTE');
  const note=await f.exitRequest(docs,{who:'clinician',method:'POST',body:noteBody});assert.equal(note.status,200,note.raw);
  const summaryBody=draftBody('PATIENT_SUMMARY',{operationKey:key});
  const summary=await f.exitRequest(docs,{who:'clinician',method:'POST',body:summaryBody});assert.equal(summary.status,200,summary.raw);
  const intentBody={instruction:'S7_SYNTHETIC_INTENT',desiredWindow:null,operationKey:key};
  const intent=await f.exitRequest(intents,{who:'clinician',method:'POST',body:intentBody});assert.equal(intent.status,201,intent.raw);
  const summaryRoot=docs+'/'+summary.json.data.id, intentRoot=intents+'/'+intent.json.data.id;
  const releaseBody={operationKey:key,expectedVersion:1};
  const released=await f.exitRequest(summaryRoot+'/sign-release',{who:'clinician',method:'POST',body:releaseBody});assert.equal(released.status,200,released.raw);
  const releasedIntent=await f.exitRequest(intentRoot+'/sign-release',{who:'clinician',method:'POST',body:releaseBody});assert.equal(releasedIntent.status,200,releasedIntent.raw);
  return {c,docs,intents,key,note,noteBody,summary,summaryBody,intent,intentBody,summaryRoot,intentRoot,releaseBody,released,releasedIntent};
}

test('I2S7 operation keys are scoped to actor command and module; changed payload and unauthorized replay are silent',()=>isolatedI2Exit(async f=>{
  const s=await clinicalSources(f);
  // Prewarm genuine logins so auth success audits are excluded from mutation counts.
  for(const who of ['patient','other','admin','lab','pharmacy'])await f.intentLogin(who);
  const before=await count(f);
  for(const [path,body] of [[s.docs,s.summaryBody],[s.intents,s.intentBody],
    [s.summaryRoot+'/sign-release',s.releaseBody],[s.intentRoot+'/sign-release',s.releaseBody]]) {
    const r=await f.exitRequest(path,{who:'clinician',method:'POST',body});assert.equal(r.status,200,r.raw);
    for(const who of ['patient','other','admin','lab','pharmacy']) {
      const denied=await f.exitRequest(path,{who,method:'POST',body});assert.equal(denied.status,404,denied.raw);
      for(const v of [s.summary.json.data.id,s.intent.json.data.id,s.summaryBody.content,s.intentBody.instruction,s.key])assert.ok(!denied.raw.includes(v));
    }
  }
  assert.equal((await f.exitRequest(s.docs,{who:'clinician',method:'POST',body:{...s.summaryBody,content:'Changed payload'}})).status,409);
  assert.equal((await f.exitRequest(s.intents,{who:'clinician',method:'POST',body:{...s.intentBody,instruction:'Changed payload'}})).status,409);
  assert.deepEqual(await count(f),before);
  // The same UUID also works for another actor's independent CREATE command.
  const slots=[await f.publish(60),await f.publish(120)];
  const a=await f.bookings.create(f.actors.patient,{slotId:slots[0].id,operationKey:s.key});
  const b=await f.bookings.create(f.actors.other,{slotId:slots[1].id,operationKey:s.key});assert.notEqual(a.id,b.id);
}));

test('I2S7 independent document/intent privacy suppresses full lineage counts links and replay without cross-module rewriting',()=>isolatedI2Exit(async f=>{
  const s=await clinicalSources(f), other=await f.otherClinician();
  const b=await f.create(await f.publish(60,{},other.actor));
  const linked=await f.exitRequest(s.intentRoot+'/booking-links',{who:'clinician',method:'POST',body:{bookingId:b.id,expectedLinkVersion:0,operationKey:randomUUID()}});
  assert.equal(linked.status,201,linked.raw);
  const privacy={operationKey:randomUUID(),versionIds:[s.released.json.data.versions.at(-1).id],reason:'Synthetic wrong-patient safety'};
  assert.equal((await f.exitRequest(s.summaryRoot+'/privacy-restrictions',{who:'clinician',method:'POST',body:privacy})).status,200);
  assert.equal((await f.exitRequest('/me/summaries',{who:'patient'})).json.meta.total,0);
  const stillVisible=await f.exitRequest('/me/follow-up-intents/'+s.intent.json.data.id,{who:'patient'});
  assert.equal(stillVisible.status,200,stillVisible.raw);assert.equal(stillVisible.json.data.links[0].bookingId,b.id);
  assert.equal((await f.exitRequest(s.docs,{who:'clinician',method:'POST',body:s.summaryBody})).status,404);
  // A changed payload must not turn a restricted retained result into a
  // distinguishable operation-key conflict (the original Slice 5 gap).
  assert.equal((await f.exitRequest(s.docs,{who:'clinician',method:'POST',body:{...s.summaryBody,content:'Changed after restriction'}})).status,404);
  assert.equal((await f.exitRequest(s.summaryRoot+'/sign-release',{who:'clinician',method:'POST',body:{...s.releaseBody,expectedVersion:2}})).status,404);
  const restriction={operationKey:randomUUID(),versionIds:[s.releasedIntent.json.data.versions.at(-1).id],reason:'Independent exact intent target'};
  assert.equal((await f.exitRequest(s.intentRoot+'/privacy-restrictions',{who:'clinician',method:'POST',body:restriction})).status,200);
  for(const path of ['/me/follow-up-intents',s.intents]) {
    const r=await f.exitRequest(path,{who:path===s.intents?'clinician':'patient'});assert.equal(r.status,200);assert.equal(r.json.meta.total,0);
    for(const v of [s.intent.json.data.id,linked.json.data.links[0].id,b.id,s.intentBody.instruction])assert.ok(!r.raw.includes(v));
  }
  for(const [path,body] of [[s.intents,s.intentBody],[s.intents,{...s.intentBody,instruction:'Changed after restriction'}],
    [s.intentRoot+'/sign-release',s.releaseBody]])assert.equal((await f.exitRequest(path,{who:'clinician',method:'POST',body})).status,404);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM consultation_privacy_restrictions')).rows[0].n,1);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM follow_up_intent_privacy_restrictions')).rows[0].n,1);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM consultation_document_versions')).rows[0].n,3);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM follow_up_intent_versions')).rows[0].n,2);
}));

test('I2S7 different-provider same-patient link grants no clinical or booking access; wrong-patient targets fail before state',()=>isolatedI2Exit(async f=>{
  const s=await clinicalSources(f), other=await f.otherClinician();
  const b=await f.create(await f.publish(60,{},other.actor));
  const linked=await f.exitRequest(s.intentRoot+'/booking-links',{who:'clinician',method:'POST',body:{bookingId:b.id,expectedLinkVersion:0,operationKey:randomUUID()}});
  assert.equal(linked.status,201,linked.raw);
  assert.equal((await f.exitRequest('/patients/'+f.users.patient.profileId+'/follow-up-intents',{who:'otherClinician'})).status,404);
  assert.equal((await f.exitRequest('/patients/'+f.users.patient.profileId+'/summaries',{who:'otherClinician'})).status,404);
  assert.equal((await f.exitRequest('/me/bookings/'+b.id,{who:'clinician'})).status,404);
  const wrong=await f.create(await f.publish(120),f.actors.other);
  await f.bookings.cancel(f.actors.other,{bookingId:wrong.id,expectedVersion:1,operationKey:randomUUID()});
  const before=await count(f);
  for(const bookingId of [wrong.id,randomUUID()]) {
    const denied=await f.exitRequest(s.intentRoot+'/booking-links/replacements',{who:'clinician',method:'POST',body:{bookingId,
      previousLinkId:linked.json.data.links[0].id,expectedLinkVersion:1,operationKey:randomUUID()}});
    assert.equal(denied.status,404,denied.raw);assert.ok(!denied.raw.includes(bookingId));assert.ok(!denied.raw.includes('CANCELLED'));
  }
  assert.deepEqual(await count(f),before);
}));

test('I2S7 source suspension denies both clinical writers while own released history survives; ending assignment denies author reads and replay',()=>isolatedI2Exit(async f=>{
  const s=await clinicalSources(f);
  for(const who of ['patient','clinician'])await f.intentLogin(who);
  await f.store.setOrganizationStatus(f.actors.admin,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});
  const before=await count(f);
  for(const [path,body] of [[s.docs,s.summaryBody],[s.intents,s.intentBody]])assert.equal((await f.exitRequest(path,{who:'clinician',method:'POST',body})).status,404);
  for(const path of ['/me/summaries/'+s.summary.json.data.id,'/me/follow-up-intents/'+s.intent.json.data.id])
    assert.equal((await f.exitRequest(path,{who:'patient'})).status,200);
  await f.exitRelationships.end(f.actors.patient,{assignmentId:(await f.pool.query('SELECT id FROM clinician_patient_assignments WHERE patient_id=$1',[f.users.patient.profileId])).rows[0].id});
  const afterEnd=await count(f);assert.ok(afterEnd.audit_logs>before.audit_logs);
  for(const path of [s.docs,s.intents])assert.equal((await f.exitRequest(path,{who:'clinician'})).status,404);
  assert.equal((await f.exitRequest(s.docs+'/'+s.note.json.data.id,{who:'clinician'})).status,404);
  for(const [path,body] of [[s.docs,s.summaryBody],[s.intents,s.intentBody]])assert.equal((await f.exitRequest(path,{who:'clinician',method:'POST',body})).status,404);
  assert.deepEqual(await count(f),afterEnd);
}));

test('I2S7 composed middleware rejects CSRF origin metadata malformed UTF8 and nested duplicate JSON without writes or leaked canaries',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), docs='/consultations/'+c.id+'/documents', intents='/consultations/'+c.id+'/follow-up-intents';
  await f.intentLogin('clinician');const before=await count(f);
  for(const [path,body] of [[docs,draftBody()],[intents,{instruction:'S7_SECRET_CANARY',desiredWindow:null,operationKey:randomUUID()}]]) {
    for(const headers of [{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'X-CSRF-Token':'invalid'}]) {
      const r=await f.exitRequest(path,{who:'clinician',method:'POST',body,headers});assert.equal(r.status,403,r.raw);assert.ok(!r.raw.includes('S7_SECRET_CANARY'));
    }
    for(const raw of [Buffer.from([0xc3,0x28]),'{',JSON.stringify(body).replace('"operationKey":','"operationKey":"'+randomUUID()+'","\\u006fperationKey":')]) {
      const r=await f.exitRequest(path,{who:'clinician',method:'POST',raw});assert.equal(r.status,400,r.raw);assert.ok(!r.raw.includes('S7_SECRET_CANARY'));
    }
  }
  const nested=JSON.stringify(draftBody()).replace('"state":"UNKNOWN"','"state":"UNKNOWN","\\u0073tate":"NOT_REVIEWED"');
  assert.equal((await f.exitRequest(docs,{who:'clinician',method:'POST',raw:nested})).status,400);
  assert.deepEqual(await count(f),before);
}));

for(const rollback of [false,true])test('I2S7 restricted changed-payload document replay waits for privacy commit/rollback='+rollback,()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), body=draftBody(), d=await f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...body});
  const entered=signal(), release=signal();let held=false,blocker,a,b;
  const stop=observeApplicabilityQueries((q,next)=>{
    if(!held&&/INSERT INTO public\.consultation_privacy_restrictions/.test(q.text)) {
      held=true;return Promise.resolve(next()).then(async result=>{blocker=q.pid;entered.resolve();await release.promise;if(rollback)throw Error('Synthetic rollback');return result;});
    }
    return next();
  });
  try {
    a=f.documentation.execute('PRIVACY',f.actors.clinician,{consultationId:c.id,documentId:d.data.id,versionIds:[d.data.versions[0].id],reason:'Synthetic restriction',operationKey:randomUUID()});a.catch(()=>{});
    await entered.promise;
    b=f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...body,content:'Changed after privacy wait'});b.catch(()=>{});
    const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();
    const outcomes=(await Promise.allSettled([a,b])).map(r=>r.status==='fulfilled'?'COMMIT':r.reason.code);
    assert.deepEqual(outcomes,rollback?['DOCUMENT_UNAVAILABLE','DOCUMENT_CONFLICT']:['COMMIT','DOCUMENT_NOT_FOUND']);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM consultation_document_operations')).rows[0].n,rollback?1:2);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM consultation_document_versions')).rows[0].n,1);
    console.log('I2S7_POSTGRES_PRIVACY_REPLAY',JSON.stringify({blockerPid:blocker,waiterPid:waiter,pgBlockingPidsObserved:true,rollback,outcomes}));
  } finally {release.resolve();stop();await Promise.allSettled([a,b]);}
}));
