import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedIntents,intentBody,intentCounts,intentReject} from '../support/follow-up-intents.mjs';
test('I2S6 immutable draft/release/correction and exact scoped projections',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),input=intentBody({desiredWindow:{startAt:'2026-01-01T00:00:00+02:00',endAt:'2026-01-02T00:00:00+02:00',timeZone:'Africa/Cairo'}}),d=await f.draft(c,input);
 assert.equal(d.status,201);assert.equal(d.data.versions[0].state,'DRAFT');assert.equal((await f.intents.releasedRead(f.actors.patient,null,null)).meta.total,0);assert.equal((await f.intents.authorRead(f.actors.clinician,c.id,null)).meta.total,1);
 const before=await intentCounts(f),replay=await f.draft(c,input);assert.equal(replay.status,200);assert.deepEqual(replay.data,d.data);assert.deepEqual(await intentCounts(f),before);
 await intentReject(f.draft(c,{...input,instruction:'changed'}),'FOLLOW_UP_INTENT_CONFLICT');
 const r=await f.command(c,d,'RELEASE',{expectedVersion:1});assert.equal(r.data.versions.length,2);assert.equal(r.data.versions[0].effective,false);assert.equal(r.data.versions[1].effective,true);
 const p=await f.intents.releasedRead(f.actors.patient,null,d.data.id);assert.equal(p.data.versions.length,1);assert.equal(p.data.versions[0].predecessorId,null);assert.equal(p.data.versions[0].version,undefined);assert.equal(p.data.versions[0].desiredWindow.startAt,'2025-12-31T22:00:00.000Z');
 const x=await f.command(c,d,'CORRECT',{instruction:'Human correction',desiredWindow:null,reason:'Correction reason',expectedVersion:2,predecessorId:r.data.versions.at(-1).id});assert.equal(x.status,201);assert.equal(x.data.versions[1].releasedAt,r.data.versions[1].releasedAt);assert.equal(x.data.versions[1].effective,false);assert.equal(x.data.versions[2].effective,true);
 await intentReject(f.command(c,d,'RELEASE',{expectedVersion:1}),'FOLLOW_UP_INTENT_CONFLICT');
 const page=await f.intents.authorRead(f.actors.clinician,c.id,d.data.id,{pageSize:1});assert.equal(page.data.versions.length,1);assert.equal(page.data.history.total,3);
 await intentReject(f.intents.authorRead(f.actors.clinician,c.id,d.data.id,{page:4,pageSize:1}));await intentReject(f.intents.authorRead(f.actors.clinician,c.id,d.data.id,{linkPage:2}));
 const other=await f.otherClinician();await intentReject(f.intents.releasedRead(other.actor,f.users.patient.profileId,d.data.id));await f.identities.assignPatient({clinicianId:other.user.profileId,patientId:f.users.patient.profileId});assert.equal((await f.intents.releasedRead(other.actor,f.users.patient.profileId,d.data.id)).data.versions.length,2);await intentReject(f.intents.authorRead(other.actor,c.id,d.data.id));
 for(const who of ['admin','lab','pharmacy','other'])await intentReject(f.intents.authorRead(f.actors[who],c.id,d.data.id));
 await f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.clinicOrg.id,status:'SUSPENDED',expectedVersion:0});assert.equal((await f.intents.releasedRead(f.actors.patient,null,d.data.id)).data.id,d.data.id);assert.equal((await f.intents.authorRead(f.actors.clinician,c.id,d.data.id)).data.id,d.data.id);await intentReject(f.draft(c));
}));
test('I2S6 explicit same-patient immutable booking/replacement chain; no booking entitlement',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),r=await f.released(c),b=await f.create(await f.publish(60)),body={bookingId:b.id,expectedLinkVersion:0,operationKey:randomUUID()},link=await f.command(c,r,'LINK',body);assert.equal(link.data.links.length,1);assert.equal(link.data.links[0].bookingState,'BOOKED');
 await f.bookings.cancel(f.actors.patient,{bookingId:b.id,expectedVersion:1,operationKey:randomUUID()});const replay=await f.command(c,r,'LINK',body);assert.equal(replay.data.links[0].bookingState,'CANCELLED');
 const b2=await f.create(await f.publish(120)),x=await f.command(c,r,'REPLACE',{previousLinkId:link.data.links[0].id,bookingId:b2.id,expectedLinkVersion:1});assert.equal(x.data.links.length,2);assert.equal(x.data.links[1].previousLinkId,link.data.links[0].id);assert.equal(x.data.links[0].bookingId,b.id);
 const cross=await f.create(await f.publish(180),f.actors.other);await intentReject(f.command(c,r,'REPLACE',{previousLinkId:x.data.links[1].id,bookingId:cross.id,expectedLinkVersion:2}));
 await intentReject(f.command(c,r,'REPLACE',{previousLinkId:x.data.links[1].id,bookingId:b.id,expectedLinkVersion:2}),'FOLLOW_UP_INTENT_CONFLICT');
 const other=await f.otherClinician(),slot=await f.publish(240,{},other.actor),b3=await f.create(slot);await f.bookings.cancel(f.actors.patient,{bookingId:b2.id,expectedVersion:1,operationKey:randomUUID()});const y=await f.command(c,r,'REPLACE',{previousLinkId:x.data.links[1].id,bookingId:b3.id,expectedLinkVersion:2});assert.equal(y.data.links.at(-1).bookingId,b3.id);assert.equal((await f.intents.releasedRead(f.actors.patient,null,r.data.id)).data.links.length,3);
}));
test('I2S6 privacy exact immutable target suppresses every ordinary read/count/replay',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),body=intentBody(),d=await f.draft(c,body),r=await f.command(c,d,'RELEASE',{expectedVersion:1}),restriction={versionIds:[r.data.versions[1].id],reason:'Wrong patient',operationKey:randomUUID()};const p=await f.command(c,d,'PRIVACY',restriction);assert.deepEqual(p,{status:200,data:{restricted:true}});assert.deepEqual(await f.command(c,d,'PRIVACY',restriction),p);assert.equal((await f.intents.releasedRead(f.actors.patient,null,null)).meta.total,0);assert.equal((await f.intents.authorRead(f.actors.clinician,c.id,null)).meta.total,0);
 await intentReject(f.draft(c,body));await intentReject(f.draft(c,{...body,instruction:'changed'}));await intentReject(f.intents.authorRead(f.actors.clinician,c.id,d.data.id));await intentReject(f.intents.releasedRead(f.actors.patient,null,d.data.id));
}));
test('I2S6 EH-012 independent API/service semantics and zero CareAction/EACCE/Booking side effects',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),before=await intentCounts(f),d=await f.draft(c),after=await intentCounts(f);for(const t of ['follow_up_appointments','bookings','care_actions'])assert.equal(after[t],before[t]);
 const input={patientId:f.users.patient.profileId,scheduledAt:'2099-01-01T00:00:00.000Z',purpose:'HTN_BP_FOLLOWUP'},a=await f.appointments.createFollowUpAppointment(f.actors.clinician,input),a2=await f.appointments.createFollowUpAppointment(f.actors.clinician,input);assert.notEqual(a.id,a2.id);assert.equal(a.status,'SCHEDULED');assert.notEqual(a.id,d.data.id);const final=await intentCounts(f);for(const t of ['follow_up_intents','follow_up_intent_versions','bookings','care_actions'])assert.equal(final[t],after[t]);
 const root='/patients/'+f.users.patient.profileId+'/follow-up-appointments',read=await f.read(root);assert.equal(read.response.status,200);assert.equal(read.json.meta.total,2);assert.equal((await f.write(root,{scheduledAt:input.scheduledAt,purpose:input.purpose},'patient')).response.status,404);
 const cancel=root+'/'+a.id+'/cancel';assert.equal((await f.write(cancel,{})).json.data.status,'CANCELLED');assert.equal((await f.write(cancel,{})).json.data.status,'CANCELLED');assert.equal((await intentCounts(f)).follow_up_intents,after.follow_up_intents);
}));
