import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {isolatedIntents} from './follow-up-intents.mjs';
import {draftBody} from './documentation.mjs';
import {createDatabase, createPatientEntryPersistence, createRelationshipPersistence,
  createAuthorizationPersistence, createBloodPressureMeasurementPersistence} from '../../packages/db/dist/index.js';
import {createApp} from '../../apps/api/dist/app.js';
import {patientEntryRuntime} from '../../apps/api/dist/patient-entry.js';
import {createPasswordVerifier} from '../../apps/api/dist/password.js';

// One composed API, with the same persistence implementations as production.
// Existing isolated fixtures supply synthetic administrative setup only. The
// combined journey below never calls their past-booking/assignment shortcuts.
export async function isolatedI2Exit(run, options={}) {
  return isolatedIntents(async f => {
    const db = createDatabase(f.url), entry = createPatientEntryPersistence(f.url);
    const relationships = createRelationshipPersistence(f.url);
    const authorization = createAuthorizationPersistence(f.url), bp = createBloodPressureMeasurementPersistence(f.url);
    const app = await createApp(db, {config:f.config, store:f.auth, passwords:await createPasswordVerifier()},
      authorization, bp, {appointments:f.appointments, encounters:f.encounters}, patientEntryRuntime(entry),
      f.directory, relationships, f.availability, f.bookings, f.consultations, f.documentation, f.intents);
    try {
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const request = async (path, {who=null, method='GET', body, raw, headers={}}={}) => {
        const response = await fetch(base+'/api/v1'+path, {
          method, signal:globalThis.AbortSignal.timeout(15000),
          headers:{...(who ? await f.intentLogin(who) : {}),
            ...(body !== undefined || raw !== undefined ? {Origin:f.config.origin, 'Content-Type':'application/json'} : {}), ...headers},
          ...(body !== undefined || raw !== undefined ? {body:raw ?? JSON.stringify(body)} : {}),
        });
        const text = await response.text();
        return {status:response.status, headers:response.headers, raw:text, json:text ? JSON.parse(text) : null};
      };
      await run({...f, exitRequest:request, exitRelationships:relationships});
    } finally {
      await app.close();
      await Promise.all([db.close(), entry.close(), relationships.close(), authorization.close(), bp.close()]);
    }
  }, options);
}

export async function proveI2Journey() {
  const cases=[];
  const check = async (name, action) => { await action(); cases.push(name); };
  await isolatedI2Exit(async f => {
    const request=f.exitRequest, key=randomUUID();
    f.users.journey={email:randomUUID()+'@example.invalid'};
    await check('anonymous registration does not create a session or privileged role', async () => {
      const r=await request('/auth/register', {method:'POST', headers:{'X-EH-Register':'1'},
        body:{email:f.users.journey.email, password:f.password, displayName:'Synthetic combined I2 patient'}});
      assert.equal(r.status,202,r.raw); assert.deepEqual(r.json,{data:{accepted:true}});
      assert.equal(r.headers.get('set-cookie'),null);
    });
    const profile=await request('/me/profile',{who:'journey'});
    assert.equal(profile.status,200,profile.raw);
    const patientId=profile.json.data.id;
    await check('public discovery and exact provider remain logistics only', async () => {
      const r=await request('/directory/providers/'+f.provider.publicId);
      assert.equal(r.status,200,r.raw);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);
    });
    await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:1,durationMinutes:5});
    const now=(await f.pool.query('SELECT clock_timestamp() now')).rows[0].now;
    const start=new Date(now.getTime()+20000), end=new Date(start.getTime()+300000);
    const published=await request('/me/availability',{who:'clinician',method:'POST',
      body:{clinicId:f.clinic.publicId,startAt:start.toISOString(),endAt:end.toISOString(),operationKey:key}});
    assert.equal(published.status,200,published.raw);
    const slot=published.json.data;
    await check('finite public availability has the exact public allowlist',async () => {
      const r=await request(f.path);assert.equal(r.status,200,r.raw);
      assert.deepEqual(Object.keys(r.json.data[0]).sort(),['id','providerId','clinicId','startAt','endAt','timeZone','bookable'].sort());
    });
    const booked=await request('/me/bookings',{who:'journey',method:'POST',body:{slotId:slot.id,operationKey:key}});
    assert.equal(booked.status,200,booked.raw);
    const booking=booked.json.data, opening='/me/bookings/'+booking.id+'/consultation';
    await check('booking replay is retained and capacity conflict leaks no patient', async () => {
      const replay=await request('/me/bookings',{who:'journey',method:'POST',body:{slotId:slot.id,operationKey:key}});
      assert.equal(replay.status,200,replay.raw);assert.deepEqual(replay.json,booked.json);
      const loser=await request('/me/bookings',{who:'other',method:'POST',body:{slotId:slot.id,operationKey:key}});
      assert.equal(loser.status,409,loser.raw);assert.ok(!loser.raw.includes(patientId));assert.ok(!loser.raw.includes(booking.id));
    });
    await check('booking alone cannot open or read clinical records',async () => {
      assert.equal((await request(opening,{who:'clinician',method:'POST',body:{operationKey:key}})).status,404);
      assert.equal((await request('/patients/'+patientId+'/profile',{who:'clinician'})).status,404);
    });
    const authorized=await request('/me/relationship-requests',{who:'journey',method:'POST',body:{providerId:f.provider.publicId,operationKey:key}});
    assert.equal(authorized.status,200,authorized.raw);
    const requestId=authorized.json.data.request.id;
    await check('pending patient authorization is not clinical authority',async () => {
      assert.equal((await request(opening,{who:'clinician',method:'POST',body:{operationKey:key}})).status,404);
    });
    const accepted=await request('/me/relationship-requests/'+requestId+'/accept',{who:'clinician',method:'PUT',body:{}});
    assert.equal(accepted.status,200,accepted.raw);
    await check('explicit bilateral acceptance creates the sole current clinical grant',async () => {
      assert.equal((await f.pool.query("SELECT count(*)::int n FROM clinician_patient_assignments WHERE patient_id=$1 AND status='ACTIVE'",[patientId])).rows[0].n,1);
    });
    const deadline=Date.now()+30000;
    for (;;) {
      const remaining=Number((await f.pool.query('SELECT extract(epoch FROM $1::timestamptz-clock_timestamp()) seconds',[start])).rows[0].seconds);
      if(remaining<=0)break;
      assert.ok(Date.now()<deadline,'bounded real database clock wait');
      await delay(Math.min(remaining*1000+20,1000));
    }
    const opened=await request(opening,{who:'clinician',method:'POST',body:{operationKey:key}});
    assert.equal(opened.status,200,opened.raw);
    const c=opened.json.data, docs='/consultations/'+c.id+'/documents', intents='/consultations/'+c.id+'/follow-up-intents';
    await check('exact booking encounter patient treating and recorder provenance; explicit attendance',async () => {
      const row=(await f.pool.query(`SELECT c.*,e.patient_id encounter_patient,e.recorded_by_user_id,b.state booking_state
        FROM consultations c JOIN clinical_encounters e ON e.id=c.encounter_id JOIN bookings b ON b.id=c.booking_id WHERE c.id=$1`,[c.id])).rows[0];
      assert.equal(row.booking_id,booking.id);assert.equal(row.encounter_id,c.encounterId);assert.equal(row.patient_id,patientId);
      assert.equal(row.encounter_patient,patientId);assert.equal(row.treating_clinician_user_id,f.users.clinician.id);
      assert.equal(row.recorded_by_user_id,f.users.clinician.id);assert.equal(row.booking_state,'IN_CONSULTATION');
      assert.equal((await request('/me/bookings/'+booking.id,{who:'journey'})).json.data.attendance,'ATTENDED');
    });
    const privateNote=await request(docs,{who:'clinician',method:'POST',body:draftBody('PRIVATE_NOTE')});
    const summary=await request(docs,{who:'clinician',method:'POST',body:draftBody('PATIENT_SUMMARY',{operationKey:key})});
    assert.equal(privateNote.status,200,privateNote.raw);assert.equal(summary.status,200,summary.raw);
    const intentBody={instruction:'Human-entered synthetic follow-up',desiredWindow:null,operationKey:key};
    const intent=await request(intents,{who:'clinician',method:'POST',body:intentBody});assert.equal(intent.status,201,intent.raw);
    await check('separate module operation scopes and unreleased clinical secrecy',async () => {
      assert.equal((await request('/me/summaries',{who:'journey'})).json.meta.total,0);
      assert.equal((await request('/me/follow-up-intents',{who:'journey'})).json.meta.total,0);
      for(const who of ['journey','other','admin','lab','pharmacy'])for(const path of [docs,intents])
        assert.equal((await request(path,{who})).status,404);
    });
    await check('explicit real HTTP close atomically persists CLOSED/CONSULTED without implicit signing or release',async () => {
      const path='/consultations/'+c.id+'/close',body={operationKey:key,expectedVersion:1};
      const closed=await request(path,{who:'clinician',method:'PUT',body});assert.equal(closed.status,200,closed.raw);
      assert.equal(closed.json.data.state,'CLOSED');assert.equal(closed.json.data.bookingState,'CONSULTED');
      const row=(await f.pool.query('SELECT state,closed_at,closed_by_user_id FROM consultations WHERE id=$1',[c.id])).rows[0];
      assert.equal(row.state,'CLOSED');assert.equal(row.closed_at.toISOString(),closed.json.data.closedAt);assert.equal(row.closed_by_user_id,f.users.clinician.id);
      assert.equal((await request('/me/bookings/'+booking.id,{who:'journey'})).json.data.state,'CONSULTED');
      assert.equal((await request('/me/summaries',{who:'journey'})).json.meta.total,0);
      assert.equal((await request('/me/follow-up-intents',{who:'journey'})).json.meta.total,0);
      assert.equal((await f.pool.query('SELECT state FROM consultation_document_versions WHERE id=$1',[privateNote.json.data.versions[0].id])).rows[0].state,'DRAFT');
      assert.deepEqual((await request(path,{who:'clinician',method:'PUT',body})).json,closed.json);
      assert.equal((await f.pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type='CONSULTATION_CLOSED'")).rows[0].n,1);
    });
    const root=docs+'/'+summary.json.data.id, intentRoot=intents+'/'+intent.json.data.id;
    const released=await request(root+'/sign-release',{who:'clinician',method:'POST',body:{expectedVersion:1,operationKey:key}});
    const releasedIntent=await request(intentRoot+'/sign-release',{who:'clinician',method:'POST',body:{expectedVersion:1,operationKey:key}});
    assert.equal(released.status,200,released.raw);assert.equal(releasedIntent.status,200,releasedIntent.raw);
    await check('explicit summary and intent release; no private or draft canaries in patient views',async () => {
      for(const path of ['/me/summaries','/me/follow-up-intents']) {
        const r=await request(path,{who:'journey'});assert.equal(r.status,200,r.raw);assert.equal(r.json.meta.total,1);
        for(const value of [privateNote.json.data.id,privateNote.json.data.versions[0].content,
          summary.json.data.versions[0].id,intent.json.data.versions[0].id,key,f.password,f.hash,patientId,f.users.clinician.id])assert.ok(!r.raw.includes(value));
      }
    });
    await check('human complaints problems diagnoses and uncertainty survive explicit release',async () => {
      const v=(await request('/me/summaries/'+summary.json.data.id,{who:'journey'})).json.data.versions[0];
      assert.equal(v.complaint,'Human complaint');assert.deepEqual(v.problems,['Human problem']);assert.deepEqual(v.diagnoses,['Human diagnosis']);
      assert.equal(v.allergyReview.state,'UNKNOWN');assert.deepEqual(v.allergyReview.items,[]);
    });
    await f.availability.setConfiguration(f.actors.admin,{...f.settings,expectedVersion:2,durationMinutes:30});
    const future=await f.publish(60);
    const followup=await request('/me/bookings',{who:'journey',method:'POST',body:{slotId:future.id,operationKey:randomUUID()}});
    assert.equal(followup.status,200,followup.raw);
    await check('follow-up booking and intent link are explicit independent commands',async () => {
      const r=await request(intentRoot+'/booking-links',{who:'clinician',method:'POST',body:{bookingId:followup.json.data.id,expectedLinkVersion:0,operationKey:key}});
      assert.equal(r.status,201,r.raw);assert.equal(r.json.data.links[0].bookingId,followup.json.data.id);
      for(const table of ['care_plans','care_actions','follow_up_appointments'])
        assert.equal((await f.pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0,table);
    });
    await check('EH-012 history excludes the general consultation',async () => {
      const r=await request('/patients/'+patientId+'/clinical-encounters',{who:'journey'});
      assert.equal(r.status,200,r.raw);assert.equal(r.json.meta.total,0);
    });
    await check('released HEAD and conditional GET retain privacy and no-store',async () => {
      for(const path of ['/me/summaries/'+summary.json.data.id,'/me/follow-up-intents/'+intent.json.data.id]) {
        const head=await request(path,{who:'journey',method:'HEAD'});assert.equal(head.status,200);assert.equal(head.raw,'');
        assert.equal(head.headers.get('cache-control'),'no-store');assert.equal(head.headers.get('etag'),null);
        assert.equal((await request(path,{who:'journey',headers:{'If-None-Match':'*'}})).status,200);
      }
    });
    await check('patient withdrawal immediately removes author authority across both clinical modules',async () => {
      const r=await request('/me/relationship-requests/'+requestId+'/withdraw',{who:'journey',method:'PUT',body:{}});
      assert.equal(r.status,200,r.raw);
      for(const path of [docs,intents])assert.equal((await request(path,{who:'clinician'})).status,404);
      assert.equal((await request(docs,{who:'clinician',method:'POST',body:draftBody()})).status,404);
      assert.equal((await request(intents,{who:'clinician',method:'POST',body:{...intentBody,operationKey:randomUUID()}})).status,404);
      assert.equal((await request('/me/summaries/'+summary.json.data.id,{who:'journey'})).status,200);
      assert.equal((await request('/me/follow-up-intents/'+intent.json.data.id,{who:'journey'})).status,200);
    });
    await check('retained history and minimized genuine audit; no automatic booking or EACCE bridge',async () => {
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM bookings')).rows[0].n,2);
      const audits=(await f.pool.query('SELECT safe_metadata FROM audit_logs')).rows;
      assert.ok(audits.length>0);assert.ok(audits.every(a=>JSON.stringify(a.safe_metadata)==='{}'));
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM consultation_document_versions')).rows[0].n,3);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM follow_up_intent_versions')).rows[0].n,2);
    });
  });
  return {manifest:'eh-v3-i2-slice7-combined-journey-proof-v2',result:'PASS',cases:cases.length,caseNames:cases,
    realHttp:true,realPostgreSqlClock:true,isolatedSyntheticDatabase:true,
    scope:'Bounded I2 journey including explicit close; no I3 or EACCE'};
}
