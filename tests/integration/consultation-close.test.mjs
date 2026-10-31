import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {draftBody} from '../support/documentation.mjs';

export const closeBody=(c,key=randomUUID())=>({consultationId:c.id,expectedVersion:1,operationKey:key});
export const closeCounts=async f=>Object.fromEntries(await Promise.all(['consultations','booking_operations','booking_events','booking_attendance','audit_logs','consultation_document_versions','follow_up_intent_versions','care_actions'].map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
const reject=(p,code)=>assert.rejects(p,e=>e.code===code);

test('I2S7 explicit close atomically persists terminal states/server actor/time/history; no implicit release or clinical completion',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), doc=await f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...draftBody('PRIVATE_NOTE')});
  const summary=await f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...draftBody()}),intent=await f.draft(c);
  const before=await closeCounts(f), command=closeBody(c), result=await f.consultations.closeConsultation(f.actors.clinician,command);
  assert.equal(result.state,'CLOSED');assert.equal(result.bookingState,'CONSULTED');assert.equal(result.version,2);
  assert.deepEqual(Object.keys(result).sort(),['id','encounterId','bookingId','state','bookingState','version','closedAt','providerId','clinicId'].sort());
  const row=(await f.pool.query('SELECT * FROM consultations WHERE id=$1',[c.id])).rows[0];
  assert.equal(row.state,'CLOSED');assert.equal(row.closed_by_user_id,f.users.clinician.id);assert.equal(row.close_operation_key,command.operationKey);assert.equal(row.closed_at.toISOString(),result.closedAt);assert.ok(row.closed_at>=row.opened_at);
  assert.equal((await f.bookings.detail(f.actors.patient,c.bookingId)).data.state,'CONSULTED');
  const audit=(await f.pool.query("SELECT * FROM audit_logs WHERE action_type='CONSULTATION_CLOSED'")).rows;assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,f.users.clinician.id);assert.deepEqual(audit[0].safe_metadata,{});
  const after=await closeCounts(f);for(const t of ['booking_operations','booking_events','audit_logs'])assert.equal(after[t],before[t]+1,t);
  for(const t of ['consultations','booking_attendance','consultation_document_versions','follow_up_intent_versions','care_actions'])assert.equal(after[t],before[t],t);
  assert.equal((await f.documentation.releasedRead(f.actors.patient,null,null)).meta.total,0);assert.equal((await f.intents.releasedRead(f.actors.patient,null,null)).meta.total,0);
  assert.equal((await f.documentation.authorRead(f.actors.clinician,c.id,doc.data.id)).data.versions[0].state,'DRAFT');
  assert.deepEqual(await f.consultations.closeConsultation(f.actors.clinician,command),result);assert.deepEqual(await closeCounts(f),after);
  await reject(f.consultations.closeConsultation(f.actors.clinician,{...command,expectedVersion:2}),'BOOKING_CONFLICT');
  await reject(f.consultations.closeConsultation(f.actors.clinician,closeBody(c)),'BOOKING_CONFLICT');
  for(const method of ['cancel','reschedule','attend','correct']) {
    const extra=method==='reschedule'?{slotId:(await f.publish(60)).id}:method==='attend'?{observation:'NO_SHOW'}:method==='correct'?{observation:'NO_SHOW',reason:'Cannot change closed booking'}:{};
    await reject(f.bookings[method](f.actors.clinician,{bookingId:c.bookingId,expectedVersion:3,operationKey:randomUUID(),...extra}),'BOOKING_CONFLICT');
  }
  // Explicit commands remain independently authorized after close.
  await f.documentation.execute('RELEASE',f.actors.clinician,{consultationId:c.id,documentId:summary.data.id,expectedVersion:1,operationKey:randomUUID()});
  await f.command(c,intent,'RELEASE',{expectedVersion:1});
  assert.equal((await f.documentation.releasedRead(f.actors.patient,null,null)).meta.total,1);assert.equal((await f.intents.releasedRead(f.actors.patient,null,null)).meta.total,1);
}));

test('I2S7 close requires exact treating clinician and current assignment; booking/publication/role never grants authority',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), other=await f.otherClinician(), command=closeBody(c);
  await f.identities.assignPatient({clinicianId:other.user.profileId,patientId:f.users.patient.profileId});
  for(const actor of [f.actors.patient,f.actors.other,f.actors.admin,f.actors.lab,f.actors.pharmacy,other.actor])await reject(f.consultations.closeConsultation(actor,command),'BOOKING_NOT_FOUND');
  await f.exitRelationships.end(f.actors.patient,{assignmentId:(await f.pool.query('SELECT assignment_id FROM consultations')).rows[0].assignment_id});
  await reject(f.consultations.closeConsultation(f.actors.clinician,command),'BOOKING_NOT_FOUND');
  assert.equal((await f.pool.query('SELECT state FROM consultations')).rows[0].state,'OPEN');
  // A fresh valid relationship is current authority, not the old opening ticket.
  const grant=await f.identities.assignPatient({clinicianId:f.users.clinician.profileId,patientId:f.users.patient.profileId});
  await f.consultations.closeConsultation(f.actors.clinician,command);
  assert.equal((await f.pool.query('SELECT close_assignment_id FROM consultations')).rows[0].close_assignment_id,grant.id);
  await f.exitRelationships.end(f.actors.patient,{assignmentId:grant.id});await reject(f.consultations.closeConsultation(f.actors.clinician,command),'BOOKING_NOT_FOUND');
}));

test('I2S7 close HTTP exact PUT contract, IDOR/CSRF/media/UTF8/HEAD/no-store and no caller actor/time',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(), path='/consultations/'+c.id+'/close',body={expectedVersion:1,operationKey:randomUUID()},request=f.exitRequest;
  for(const who of ['patient','other','admin','lab','pharmacy'])assert.equal((await request(path,{who,method:'PUT',body})).status,404);
  assert.equal((await request(path,{method:'PUT',body})).status,401);
  for(const key of ['closedAt','closedByUserId','actorUserId','patientId','state','closeAssignmentId','consultationId'])assert.equal((await request(path,{who:'clinician',method:'PUT',body:{...body,[key]:'CANARY'}})).status,400);
  for(const headers of [{Origin:'http://evil.invalid'},{'Sec-Fetch-Site':'cross-site'},{'X-CSRF-Token':'bad'}])assert.equal((await request(path,{who:'clinician',method:'PUT',body,headers})).status,403);
  for(const raw of ['{','null','[]','{}',JSON.stringify(body).replace('"expectedVersion":1','"expectedVersion":1,"\\u0065xpectedVersion":1'),Buffer.from([0xff])])assert.equal((await request(path,{who:'clinician',method:'PUT',raw})).status,400);
  assert.equal((await request(path,{who:'clinician',method:'PUT',raw:' '.repeat(16385)})).status,413);
  for(const headers of [{'Content-Type':'text/plain'},{'Content-Encoding':'gzip'}])assert.equal((await request(path,{who:'clinician',method:'PUT',body,headers})).status,415);
  for(const headers of [{'Idempotency-Key':randomUUID()},{'X-Header-Bound':'x'.repeat(8300)}])assert.equal((await request(path,{who:'clinician',method:'PUT',body,headers})).status,400);
  assert.equal((await request(path+'?x=1',{who:'clinician',method:'PUT',body})).status,400);
  for(const alias of [path+'/',path.replace('/close','/Close'),path.replace('/close','/%63lose'),path.replace(c.id,randomUUID())])assert.equal((await request(alias,{who:'clinician',method:'PUT',body})).status,404);
  for(const method of ['GET','HEAD','POST','PATCH','DELETE']) {const r=await request(path,{who:'clinician',method});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'PUT');if(method==='HEAD')assert.equal(r.raw,'');assert.equal(r.headers.get('cache-control'),'no-store');}
  const r=await request(path,{who:'clinician',method:'PUT',body});assert.equal(r.status,200,r.raw);assert.equal(r.json.data.state,'CLOSED');
  assert.equal(r.headers.get('cache-control'),'no-store');for(const h of ['etag','last-modified'])assert.equal(r.headers.get(h),null);
  for(const value of [body.operationKey,f.password,f.hash,f.users.patient.id,f.users.patient.profileId,f.users.clinician.id,f.membership.id,f.publication.id])assert.ok(!r.raw.includes(value));
  assert.deepEqual((await request(path,{who:'clinician',method:'PUT',body})).json,r.json);
}));
