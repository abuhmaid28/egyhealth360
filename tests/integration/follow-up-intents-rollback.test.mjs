import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedIntents,intentBody,intentCounts,intentReject} from '../support/follow-up-intents.mjs';
import {observeApplicabilityQueries} from '../support/observed-applicability.mjs';
test('I2S6 constraint failure rolls back root/version/ledger/audit and leaves operation key reusable without retry',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),body=intentBody(),before=await intentCounts(f);await f.pool.query('ALTER TABLE public.follow_up_intent_operations ADD CONSTRAINT synthetic_intent_constraint CHECK(false)');let attempts=0;const stop=observeApplicabilityQueries((q,next)=>{if(/INSERT INTO public\.follow_up_intent_operations/.test(q.text))attempts++;return next();});try{await intentReject(f.draft(c,body),'FOLLOW_UP_INTENT_UNAVAILABLE');assert.equal(attempts,1);assert.deepEqual(await intentCounts(f),before);}finally{stop();await f.pool.query('ALTER TABLE public.follow_up_intent_operations DROP CONSTRAINT synthetic_intent_constraint');}await f.draft(c,{...body,instruction:'Explicit revised payload after rollback'});
}));
test('I2S6 retained replay rechecks all current authority even for original author',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),body=intentBody(),d=await f.draft(c,body),r=await f.command(c,d,'RELEASE',{expectedVersion:1});assert.equal(r.data.versions.length,2);
 await f.pool.query("UPDATE public.clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'",[f.users.clinician.profileId,f.users.patient.profileId]);await intentReject(f.draft(c,body));await intentReject(f.draft(c,{...body,instruction:'changed'}));assert.equal((await f.intents.releasedRead(f.actors.patient,null,d.data.id)).data.id,d.data.id);
 await f.pool.query('UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.clinician.sessionId]);await intentReject(f.draft(c,body),'FOLLOW_UP_INTENT_UNAUTHENTICATED');
 const inactive=await f.add('PATIENT','disabledPatient');await f.pool.query("UPDATE public.users SET status='DISABLED' WHERE id=$1",[inactive.user.id]);await intentReject(f.intents.releasedRead(inactive.actor,null,randomUUID()),'FOLLOW_UP_INTENT_UNAUTHENTICATED');
}));
