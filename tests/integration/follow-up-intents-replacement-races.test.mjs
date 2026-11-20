import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedIntents} from '../support/follow-up-intents.mjs';
import {intentRace} from '../support/follow-up-intent-races.mjs';
for(const subject of ['OLD','TARGET'])for(const bookingCommand of ['CANCEL','RESCHEDULE'])for(const bookingFirst of [true,false])for(const rollback of [false,true])test(`I2S6 replacement vs ${subject} ${bookingCommand} first=${bookingFirst} rollback=${rollback}`,()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),r=await f.released(c),old=await f.create(await f.publish(60)),l=await f.command(c,r,'LINK',{bookingId:old.id,expectedLinkVersion:0}),target=await f.create(await f.publish(120));
 if(subject==='TARGET')await f.bookings.cancel(f.actors.patient,{bookingId:old.id,expectedVersion:1,operationKey:randomUUID()});
 const changing=subject==='OLD'?old:target,slot=bookingCommand==='RESCHEDULE'?await f.publish(180):null;
 const change=()=>bookingCommand==='CANCEL'?f.bookings.cancel(f.actors.patient,{bookingId:changing.id,expectedVersion:1,operationKey:randomUUID()}):f.bookings.reschedule(f.actors.patient,{bookingId:changing.id,slotId:slot.id,expectedVersion:1,operationKey:randomUUID()});
 const replace=()=>f.command(c,r,'REPLACE',{bookingId:target.id,previousLinkId:l.data.links[0].id,expectedLinkVersion:1});
 const expected=bookingFirst?(rollback?['BOOKING_UNAVAILABLE',subject==='OLD'?'FOLLOW_UP_INTENT_CONFLICT':'COMMIT']:['COMMIT',subject==='OLD'?'COMMIT':'FOLLOW_UP_INTENT_CONFLICT']):(rollback?['FOLLOW_UP_INTENT_UNAVAILABLE','COMMIT']:[subject==='OLD'?'FOLLOW_UP_INTENT_CONFLICT':'COMMIT','COMMIT']);
 await intentRace(f,bookingFirst?change:replace,bookingFirst?replace:change,{name:'replacement/'+subject+'/'+bookingCommand,pattern:bookingFirst?/UPDATE public\.bookings/:/SELECT id FROM public\.consultations WHERE id=/,rollback,expected});
 const links=(await f.intents.authorRead(f.actors.clinician,c.id,r.data.id)).data.links;assert.equal(links.length,expected.includes('FOLLOW_UP_INTENT_CONFLICT')||!bookingFirst&&rollback?1:2);assert.equal(links[0].bookingId,old.id);
}));
