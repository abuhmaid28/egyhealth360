import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPrescriptions,prescriptionBody,prescriptionCounts,medicationId,rxReject} from '../support/prescriptions.mjs';
import {observeApplicabilityQueries} from '../support/observed-applicability.mjs';
test('I3S1 database guards reject wrong-patient provenance, frozen update/delete and late item insertion',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),d=await f.signed(c),root=(await f.pool.query('SELECT * FROM prescriptions WHERE id=$1',[d.data.id])).rows[0],version=(await f.pool.query('SELECT * FROM prescription_versions WHERE root_id=$1 ORDER BY version DESC LIMIT 1',[d.data.id])).rows[0];
 const newId=randomUUID();await assert.rejects(f.pool.query('INSERT INTO prescriptions(id,consultation_id,encounter_id,patient_id,author_user_id,author_clinician_id,organization_id,membership_id,assignment_id,lineage_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$1)',[newId,c.id,root.encounter_id,f.users.other.profileId,root.author_user_id,root.author_clinician_id,root.organization_id,root.membership_id,root.assignment_id]),e=>e.code==='23514');
 for(const table of ['prescriptions','prescription_versions','prescription_items','prescription_version_items','prescription_operations','prescription_privacy_restrictions','medication_versions','medication_operations'])await assert.rejects(f.pool.query(`TRUNCATE public.${table}`),e=>['23514','0A000'].includes(e.code));
 await assert.rejects(f.pool.query('UPDATE prescription_items SET instructions=$1 WHERE id=$2',['changed',d.data.items[0].id]),e=>e.code==='23514');
 await assert.rejects(f.pool.query('INSERT INTO prescription_version_items(version_id,root_id,item_id,position) VALUES($1,$2,$3,2)',[version.id,root.id,d.data.items[0].id]),e=>e.code==='23514');
 await assert.rejects(f.pool.query("INSERT INTO prescription_items(root_id,medication_id,medication_display,quantity,unit,instructions) VALUES($1,$2,'Paracetamol',1,'unit','Text')",[root.id,medicationId]),e=>e.code==='23514');
}));
test('I3S1 failed replacement leaves source unchanged and does not consume key; changed payload reusable after rollback',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),s=await f.signed(c),body=prescriptionBody({reason:'Synthetic replace',operationKey:randomUUID()}),before=await prescriptionCounts(f);
 await f.pool.query('ALTER TABLE prescription_operations ADD CONSTRAINT synthetic_rx_failure CHECK(false) NOT VALID');try{await rxReject(f.command(c,s,'REPLACE',body),'PRESCRIPTION_UNAVAILABLE');assert.deepEqual(await prescriptionCounts(f),before);assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,s.data.id)).data.state,'SIGNED');}finally{await f.pool.query('ALTER TABLE prescription_operations DROP CONSTRAINT synthetic_rx_failure');}
 const n=await f.command(c,s,'REPLACE',{...body,reason:'Explicit revised payload after rollback'});assert.equal(n.data.state,'SIGNED');
}));
test('I3S1 prior operation privacy and authority precede cross-target replay conflict disclosure',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),body=prescriptionBody(),a=await f.draft(c,body),b=await f.draft(c),key=randomUUID();await f.command(c,a,'SIGN',{operationKey:key});await f.command(c,a,'PRIVACY',{reason:'Wrong patient'});
 await rxReject(f.command(c,b,'SIGN',{operationKey:key}));await rxReject(f.draft(c,{...body,items:[{...body.items[0],instructions:'changed'}]}));
 const c2=await f.open(await (await import('../support/bookings.mjs')).pastBooking(f,await f.create(await f.publish(60)),true,2));await rxReject(f.draft(c2,body));
 const signed=await f.command(c,b,'SIGN'),cancelled=await f.command(c,signed,'CANCEL',{reason:'Synthetic cancel'});const replay=await f.command(c,b,'SIGN',{operationKey:(await f.pool.query("SELECT operation_key FROM prescription_operations WHERE target_root_id=$1 AND command='SIGN'",[b.data.id])).rows[0].operation_key});assert.equal(replay.data.currentState,'CANCELLED');assert.equal(replay.data.eligible,false);assert.equal(cancelled.data.items[0].id,signed.data.items[0].id);
}));
test('I3S1 half-open validity uses database clock including exact lower and upper boundaries',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx();const stamp=(await f.pool.query('SELECT clock_timestamp() now')).rows[0].now;
 const from=new Date(stamp.getTime()+2500),until=new Date(stamp.getTime()+4500),s=await f.command(c,await f.draft(c,prescriptionBody({validFrom:from.toISOString(),validUntil:until.toISOString()})),'SIGN');assert.equal(s.data.eligible,false);
 await f.pool.query('SELECT pg_sleep(greatest(0,extract(epoch FROM $1::timestamptz-clock_timestamp()))+0.01)',[from]);assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,s.data.id)).data.eligible,true);
 await f.pool.query('SELECT pg_sleep(greatest(0,extract(epoch FROM $1::timestamptz-clock_timestamp()))+0.01)',[until]);assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,s.data.id)).data.eligible,false);
 const interval=(await f.pool.query('SELECT valid_from<=valid_from AND valid_from<valid_until lower,valid_from<=valid_until AND valid_until<valid_until upper FROM prescription_versions WHERE root_id=$1 AND state=\'SIGNED\'',[s.data.id])).rows[0];assert.deepEqual(interval,{lower:true,upper:false});
}));
test('I3S1 forced connection failure after tentative write rolls back all facts and permits explicit identical retry',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),body=prescriptionBody(),before=await prescriptionCounts(f);let killed=false;const stop=observeApplicabilityQueries((q,next)=>!killed&&/INSERT INTO public\.prescription_operations/.test(q.text)?(killed=true,Promise.resolve(next()).then(async r=>{await f.pool.query('SELECT pg_terminate_backend($1)',[q.pid]);return r;})):next());
 try{await rxReject(f.draft(c,body),'PRESCRIPTION_UNAVAILABLE');assert.ok(killed);assert.deepEqual(await prescriptionCounts(f),before);}finally{stop();}await f.draft(c,body);
}));
test('I3S1 cross-patient operation-key conflict checks both current scopes before disclosure',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),body=prescriptionBody();await f.draft(c,body);
 const {pastBooking}=await import('../support/bookings.mjs');await f.identities.assignPatient({clinicianId:f.users.clinician.profileId,patientId:f.users.other.profileId});
 const c2=await f.open(await pastBooking(f,await f.create(await f.publish(60),f.actors.other),true,2,f.actors.other));
 await rxReject(f.draft(c2,body),'PRESCRIPTION_CONFLICT');
 await f.pool.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE patient_id=$1 AND clinician_id=$2 AND status='ACTIVE'",[f.users.patient.profileId,f.users.clinician.profileId]);await rxReject(f.draft(c2,body));
}));
