import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedIntents,intentTables,intentCounts} from '../support/follow-up-intents.mjs';
async function rejected(f,action,codes=['23514','23503','23505']){const x=await f.pool.connect();try{await x.query('BEGIN');await assert.rejects((async()=>{await action(x);await x.query('SET CONSTRAINTS ALL IMMEDIATE');})(),e=>codes.includes(e.code));}finally{await x.query('ROLLBACK');x.release();}}
test('I2S6 ordinary SQL immutability, composite provenance, chain/ledger/audit completeness',()=>isolatedIntents(async f=>{
 const c=await f.readyIntent(),d=await f.draft(c),r=await f.command(c,d,'RELEASE',{expectedVersion:1}),v=r.data.versions.at(-1),before=await intentCounts(f);
 for(const table of intentTables)for(const verb of ['UPDATE','DELETE','TRUNCATE']){const sql=verb==='UPDATE'?`UPDATE public.${table} SET id=id WHERE false`:verb==='DELETE'?`DELETE FROM public.${table} WHERE false`:`TRUNCATE public.${table} CASCADE`;await rejected(f,x=>x.query(sql),['23514']);}
 await rejected(f,x=>x.query('INSERT INTO public.follow_up_intents(consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) VALUES($1,$2,$3,$4,$5)',[c.id,c.encounterId,f.users.other.profileId,f.users.clinician.profileId,f.users.clinician.id]),['23503']);
 await rejected(f,x=>x.query('INSERT INTO public.follow_up_intents(consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id) VALUES($1,$2,$3,$4,$5)',[c.id,c.encounterId,f.users.patient.profileId,f.users.clinician.profileId,f.users.clinician.id]),['23514']); // no initial draft
 await rejected(f,x=>x.query(`INSERT INTO public.follow_up_intent_versions(root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id,version,command,state,instruction,predecessor_id,reason,operation_id)
 SELECT root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id,4,'CORRECT','SIGNED_RELEASED','Human',id,'Human',gen_random_uuid() FROM public.follow_up_intent_versions WHERE id=$1`,[v.id]),['23514']);
 await rejected(f,x=>x.query(`INSERT INTO public.follow_up_intent_versions(root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id,version,command,state,instruction,predecessor_id,reason,operation_id)
 SELECT root_id,consultation_id,encounter_id,patient_id,author_clinician_id,author_user_id,3,'CORRECT','SIGNED_RELEASED','Human',id,'Human',gen_random_uuid() FROM public.follow_up_intent_versions WHERE id=$1`,[v.id]),['23503']); // missing exact operation
 const b=await f.create(await f.publish(60)),cross=await f.create(await f.publish(120),f.actors.other);
 for(const booking of [cross.id,randomUUID(),c.bookingId])await rejected(f,x=>x.query("INSERT INTO public.follow_up_intent_booking_links(root_id,patient_id,booking_id,sequence,actor_user_id,command,operation_id) VALUES($1,$2,$3,1,$4,'LINK',$5)",[d.data.id,f.users.patient.profileId,booking,f.users.clinician.id,randomUUID()]));
 const link=await f.command(c,d,'LINK',{bookingId:b.id,expectedLinkVersion:0});assert.equal(link.data.links.length,1);
 await rejected(f,x=>x.query("INSERT INTO public.follow_up_intent_operations(actor_user_id,root_id,patient_id,command,operation_key,fingerprint,result_version_id,audit_id,version_limit,link_limit) VALUES($1,$2,$3,'CORRECT',$4,$5,$6,$7,2,1)",[f.users.clinician.id,d.data.id,f.users.patient.profileId,randomUUID(),'0'.repeat(64),v.id,randomUUID()]));
 await f.command(c,d,'PRIVACY',{versionIds:[v.id],reason:'Human privacy'});const op=(await f.pool.query("SELECT id FROM public.follow_up_intent_operations WHERE root_id=$1 AND command='PRIVACY'",[d.data.id])).rows[0];
 await rejected(f,x=>x.query('INSERT INTO public.follow_up_intent_privacy_restrictions(root_id,patient_id,version_id,actor_user_id,operation_id,reason) VALUES($1,$2,$3,$4,$5,$6)',[d.data.id,f.users.patient.profileId,d.data.versions[0].id,f.users.clinician.id,op.id,'Human privacy']),['23514']);
 assert.equal((await intentCounts(f)).follow_up_intents,before.follow_up_intents);
 const audit=(await f.pool.query("SELECT a.* FROM public.follow_up_intent_operations o JOIN public.audit_logs a ON a.id=o.audit_id")).rows;assert.equal(audit.length,4);assert.ok(audit.every(x=>x.actor_user_id===f.users.clinician.id&&JSON.stringify(x.safe_metadata)==='{}'));
}));
