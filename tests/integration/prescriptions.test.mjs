import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedPrescriptions,prescriptionBody,prescriptionCounts,medicationId,rxReject} from '../support/prescriptions.mjs';
test('I3S1 catalog, private draft/edit/version, explicit sign, exact replay and immutable signed cancellation',()=>isolatedPrescriptions(async f=>{
 const catalog=await f.prescriptions.catalogRead(f.actors.clinician);assert.equal(catalog.data.length,3);
 for(const actor of ['patient','lab','pharmacy'])await rxReject(f.prescriptions.catalogRead(f.actors[actor]));
 const c=await f.readyRx(),body=prescriptionBody(),d=await f.draft(c,body),base='/consultations/'+c.id+'/prescriptions';assert.equal(d.data.state,'DRAFT');assert.equal(d.data.version,1);
 assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,null)).meta.total,0);await rxReject(f.prescriptions.signedRead(f.actors.patient,null,d.data.id));
 const edit=prescriptionBody({expectedVersion:1});delete edit.operationKey;const e=await f.command(c,d,'EDIT',edit);assert.equal(e.data.version,2);await rxReject(f.command(c,d,'EDIT',edit),'PRESCRIPTION_CONFLICT');
 const key=randomUUID(),signed=await f.command(c,e,'SIGN',{operationKey:key});assert.equal(signed.data.state,'SIGNED');assert.equal(signed.data.eligible,true);assert.deepEqual(signed.data.items,e.data.items);assert.ok(signed.data.signedAt);
 const before=await prescriptionCounts(f);assert.deepEqual((await f.command(c,e,'SIGN',{operationKey:key})).data,signed.data);assert.deepEqual(await prescriptionCounts(f),before);await rxReject(f.command(c,e,'SIGN',{operationKey:key,expectedVersion:1}),'PRESCRIPTION_CONFLICT');
 assert.equal((await f.read('/me/prescriptions/'+d.data.id)).response.status,200);assert.equal((await f.read(base+'/'+d.data.id,'clinician','HEAD')).raw,'');
 const cancelled=await f.command(c,signed,'CANCEL',{reason:'Synthetic reason'});assert.equal(cancelled.data.state,'CANCELLED');assert.equal(cancelled.data.eligible,false);assert.deepEqual(cancelled.data.items,signed.data.items);assert.equal(cancelled.data.signedAt,signed.data.signedAt);await rxReject(f.command(c,cancelled,'SIGN'),'PRESCRIPTION_CONFLICT');
 assert.equal((await f.draft(c,body)).data.state,'DRAFT'); // retained outcome
 const audit=(await f.pool.query("SELECT safe_metadata FROM audit_logs WHERE entity_type='prescription'")).rows;assert.ok(audit.every(a=>JSON.stringify(a.safe_metadata)==='{}'));
 for(const table of ['prescriptions','prescription_versions','prescription_items','prescription_version_items','prescription_operations','prescription_privacy_restrictions'])await assert.rejects(f.pool.query(`DELETE FROM public.${table} WHERE false`),e=>e.code==='23514');
}));
test('I3S1 atomic replacement uses new root/items/explicit validity and masks entire lineage before replay/conflict',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),d=await f.signed(c),body=prescriptionBody({reason:'Synthetic correction',expectedVersion:d.data.version});const n=await f.command(c,d,'REPLACE',body);assert.notEqual(n.data.id,d.data.id);assert.notEqual(n.data.items[0].id,d.data.items[0].id);assert.equal(n.data.predecessorId,d.data.id);assert.equal(n.data.state,'SIGNED');
 const old=(await f.prescriptions.signedRead(f.actors.patient,null,d.data.id)).data;assert.equal(old.state,'REPLACED');assert.equal(old.replacementId,n.data.id);assert.deepEqual(old.items,d.data.items);
 const key=randomUUID(),p={reason:'Wrong patient synthetic',operationKey:key};assert.deepEqual((await f.command(c,n,'PRIVACY',p)).data,{restricted:true});const counts=await prescriptionCounts(f);assert.deepEqual((await f.command(c,n,'PRIVACY',p)).data,{restricted:true});assert.deepEqual(await prescriptionCounts(f),counts);
 for(const id of [d.data.id,n.data.id]){await rxReject(f.prescriptions.signedRead(f.actors.patient,null,id));await rxReject(f.prescriptions.authorRead(f.actors.clinician,c.id,id));}
 assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,null)).meta.total,0);assert.equal((await f.prescriptions.authorRead(f.actors.clinician,c.id,null)).meta.total,0);
 await rxReject(f.command(c,d,'REPLACE',body));await rxReject(f.command(c,d,'REPLACE',{...body,reason:'changed'}));await rxReject(f.command(c,n,'PRIVACY',{...p,reason:'changed'}));
}));
test('I3S1 current assignment and exact author boundaries, own-data and operational/staff denial',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),d=await f.draft(c),other=await f.otherClinician();await f.identities.assignPatient({clinicianId:other.user.profileId,patientId:f.users.patient.profileId});
 for(const actor of ['admin','lab','pharmacy','other']){await rxReject(f.prescriptions.authorRead(f.actors[actor],c.id,null));await rxReject(f.prescriptions.signedRead(f.actors[actor],f.users.patient.profileId,null));await rxReject(f.draft(c,prescriptionBody(),f.actors[actor]));}
 await rxReject(f.prescriptions.authorRead(other.actor,c.id,d.data.id));assert.equal((await f.prescriptions.signedRead(other.actor,f.users.patient.profileId,null)).meta.total,0);
 const s=await f.command(c,d,'SIGN');assert.equal((await f.prescriptions.signedRead(other.actor,f.users.patient.profileId,s.data.id)).data.id,s.data.id);await rxReject(f.command(c,s,'CANCEL',{reason:'Other clinician'},other.actor));await rxReject(f.prescriptions.signedRead(f.actors.other,null,s.data.id));
 await f.pool.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE'",[f.users.clinician.profileId,f.users.patient.profileId]);await rxReject(f.prescriptions.authorRead(f.actors.clinician,c.id,s.data.id));await rxReject(f.command(c,s,'CANCEL',{reason:'Ended assignment'}));assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,s.data.id)).data.id,s.data.id);
}));
test('I3S1 catalog updates are keyed/versioned, block new signing, preserve signed snapshots',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),s=await f.signed(c),d=await f.draft(c);const input={medicationId,operationKey:randomUUID(),expectedVersion:1,displayName:'Renamed synthetic catalog entry',isActive:false,isPublished:false};
 const before=await prescriptionCounts(f);await rxReject(f.prescriptions.catalogSet(f.actors.clinician,input));assert.deepEqual(await prescriptionCounts(f),before);
 const result=await f.prescriptions.catalogSet(f.actors.admin,input);assert.equal(result.data.version,2);const after=await prescriptionCounts(f);assert.deepEqual(await f.prescriptions.catalogSet(f.actors.admin,input),result);assert.deepEqual(await prescriptionCounts(f),after);await rxReject(f.prescriptions.catalogSet(f.actors.admin,{...input,displayName:'Changed'}),'PRESCRIPTION_CONFLICT');
 await rxReject(f.command(c,d,'SIGN'),'PRESCRIPTION_CONFLICT');assert.equal((await f.prescriptions.catalogRead(f.actors.clinician)).data.length,2);assert.equal((await f.prescriptions.signedRead(f.actors.patient,null,s.data.id)).data.items[0].medicationDisplay,'Paracetamol');
}));
test('I3S1 validity is explicit, future until required, future from signing allowed; post-close sign/edit/correct only existing sources',()=>isolatedPrescriptions(async f=>{
 const c=await f.readyRx(),d=await f.draft(c),expired=await f.draft(c,prescriptionBody({validFrom:'2020-01-01T00:00:00Z',validUntil:'2021-01-01T00:00:00Z'}));await rxReject(f.command(c,expired,'SIGN'),'PRESCRIPTION_CONFLICT');
 await f.consultations.closeConsultation(f.actors.clinician,{consultationId:c.id,expectedVersion:1,operationKey:randomUUID()});
 await rxReject(f.draft(c),'PRESCRIPTION_CONFLICT');assert.equal((await f.prescriptions.authorRead(f.actors.clinician,c.id,d.data.id)).data.state,'DRAFT');
 const e=await f.command(c,d,'EDIT',prescriptionBody({expectedVersion:1}));const s=await f.command(c,e,'SIGN');assert.equal(s.data.state,'SIGNED');
 const n=await f.command(c,s,'REPLACE',prescriptionBody({reason:'Explicit bounded correction',validFrom:'2090-01-01T00:00:00Z'}));assert.equal(n.data.eligible,false);assert.equal(n.data.state,'SIGNED');assert.equal((await f.command(c,n,'CANCEL',{reason:'Correction'})).data.state,'CANCELLED');
}));
