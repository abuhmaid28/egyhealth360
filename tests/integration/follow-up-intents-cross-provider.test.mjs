import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedIntents,intentBody,intentReject} from '../support/follow-up-intents.mjs';
import {intentRace} from '../support/follow-up-intent-races.mjs';
for(const bookingCommand of ['CANCEL','RESCHEDULE'])for(const bookingFirst of [true,false])for(const rollback of [true,false])test(`I2S6 different-provider same-patient ${bookingCommand} first=${bookingFirst} rollback=${rollback}`,()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),r=await f.released(c),other=await f.otherClinician(),b=await f.create(await f.publish(60,{},other.actor)),slot=bookingCommand==='RESCHEDULE'?await f.publish(120,{},other.actor):null;
 // The booked target provider has no clinical assignment. Its booking remains logistics.
 await intentReject(f.intents.releasedRead(other.actor,f.users.patient.profileId,r.data.id));
 const change=()=>bookingCommand==='CANCEL'?f.bookings.cancel(f.actors.patient,{bookingId:b.id,expectedVersion:1,operationKey:randomUUID()}):f.bookings.reschedule(f.actors.patient,{bookingId:b.id,slotId:slot.id,expectedVersion:1,operationKey:randomUUID()});
 const link=()=>f.command(c,r,'LINK',{bookingId:b.id,expectedLinkVersion:0});
 await intentRace(f,bookingFirst?change:link,bookingFirst?link:change,{name:'different-provider/'+bookingCommand,pattern:bookingFirst?/UPDATE public\.bookings/:/INSERT INTO public\.follow_up_intent_booking_links/,rollback,expected:rollback?[bookingFirst?'BOOKING_UNAVAILABLE':'FOLLOW_UP_INTENT_UNAVAILABLE','COMMIT']:bookingFirst?['COMMIT','FOLLOW_UP_INTENT_CONFLICT']:['COMMIT','COMMIT']});
 const links=(await f.intents.authorRead(f.actors.clinician,c.id,r.data.id)).data.links;assert.equal(links.length,bookingFirst?(rollback?1:0):(rollback?0:1));
}));
for(const command of ['DRAFT','RELEASE'])for(const privacyFirst of [true,false])test('I2S6 retained '+command+' replay vs privacy first='+privacyFirst,()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),body=intentBody(),d=await f.draft(c,body),key=randomUUID(),sign={operationKey:key,expectedVersion:1};if(command==='RELEASE')await f.command(c,d,'RELEASE',sign);
 const replay=()=>command==='DRAFT'?f.draft(c,body):f.command(c,d,'RELEASE',sign),privacy=()=>f.command(c,d,'PRIVACY',{versionIds:[d.data.versions[0].id],reason:'Wrong patient'});
 await intentRace(f,privacyFirst?privacy:replay,privacyFirst?replay:privacy,{name:'retained-'+command+'/privacy',pattern:privacyFirst?/INSERT INTO public\.follow_up_intent_privacy_restrictions/:/WITH visible AS MATERIALIZED/,expected:privacyFirst?['COMMIT','FOLLOW_UP_INTENT_NOT_FOUND']:['COMMIT','COMMIT']});
}));
