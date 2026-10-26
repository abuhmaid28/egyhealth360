import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedDirectory} from '../support/directory.mjs';
const fixture=run=>isolatedDirectory(run,{relationships:true});
const authorize=f=>f.relationships.authorize(f.actors.patient,{providerId:f.provider.publicId,operationKey:randomUUID()});
const rejected=async(f,sql,values=[],commit=false)=>{const c=await f.pool.connect();try{await c.query('BEGIN');await assert.rejects(async()=>{await c.query(sql,values);if(commit)await c.query('COMMIT');},e=>['23514','23503','23505','0A000'].includes(e.code));}finally{await c.query('ROLLBACK');c.release();}};
test('I1S5 exact new columns/indexes and SQL scope/lifecycle guards',()=>fixture(async f=>{
 const expected={relationship_requests:['id','patient_id','patient_user_id','clinician_id','clinician_user_id','provider_public_id','operation_key','status','authorized_at','authorized_assignment_id','assignment_count_at_authorization','assignment_id','accepted_at','accepted_by_user_id','declined_at','declined_by_user_id','authorization_withdrawn_at','withdrawn_by_user_id'],assignment_end_provenance:['assignment_id','clinician_id','patient_id','actor_user_id','actor_role','ended_at']};
 for(const [table,columns]of Object.entries(expected))assert.deepEqual((await f.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.map(x=>x.column_name),columns);
 assert.deepEqual((await f.pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('relationship_requests','assignment_end_provenance') ORDER BY indexname")).rows.map(x=>x.indexname),['assignment_end_provenance_pkey','relationship_requests_assignment_key','relationship_requests_clinician_history_idx','relationship_requests_operation_key','relationship_requests_patient_history_idx','relationship_requests_pending_pair_key','relationship_requests_pkey']);
 const r=(await authorize(f)).request;
 await rejected(f,'UPDATE relationship_requests SET patient_user_id=$2 WHERE id=$1',[r.id,f.users.lab.id]);
 await rejected(f,"UPDATE relationship_requests SET status='ACCEPTED',accepted_at=clock_timestamp(),accepted_by_user_id=$2 WHERE id=$1",[r.id,f.users.clinician.id]);
 await rejected(f,'UPDATE relationship_requests SET operation_key=$2 WHERE id=$1',[r.id,randomUUID()]);
 await rejected(f,"INSERT INTO relationship_requests(patient_id,patient_user_id,clinician_id,clinician_user_id,provider_public_id,operation_key,authorized_at,assignment_count_at_authorization) SELECT patient_id,patient_user_id,clinician_id,clinician_user_id,provider_public_id,$2,authorized_at,assignment_count_at_authorization FROM relationship_requests WHERE id=$1",[r.id,randomUUID()]);
 const a=(await f.relationships.decide(f.actors.clinician,{requestId:r.id},'accept')).request.assignmentId;
 await rejected(f,'UPDATE relationship_requests SET authorization_withdrawn_at=clock_timestamp(),withdrawn_by_user_id=$2 WHERE id=$1',[r.id,f.users.patient.id]);
 await rejected(f,"INSERT INTO assignment_end_provenance SELECT id,clinician_id,patient_id,$2,'PATIENT',clock_timestamp() FROM clinician_patient_assignments WHERE id=$1",[a,f.users.patient.id],true);
 await rejected(f,"INSERT INTO assignment_end_provenance SELECT id,clinician_id,patient_id,$2,'ADMIN',clock_timestamp() FROM clinician_patient_assignments WHERE id=$1",[a,f.users.admin.id]);
 await f.relationships.end(f.actors.clinician,{assignmentId:a});
 for(const table of ['relationship_requests','assignment_end_provenance'])for(const sql of [`DELETE FROM public.${table}`,`TRUNCATE public.${table} CASCADE`])await rejected(f,sql);
 await rejected(f,"UPDATE assignment_end_provenance SET actor_user_id=$1",[f.users.patient.id]);await rejected(f,"UPDATE clinician_patient_assignments SET status='ACTIVE',ended_at=NULL WHERE id=$1",[a]);
 // Historical ended assignment cannot receive invented new end actor provenance.
 const legacy=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});await f.identities.endAssignment(legacy.id);
 await rejected(f,"INSERT INTO assignment_end_provenance SELECT id,clinician_id,patient_id,$2,'PATIENT',ended_at FROM clinician_patient_assignments WHERE id=$1",[legacy.id,f.users.patient.id]);
}));
test('I1S5 SQL guards use durable public relations even with TEMP shadow tables',()=>fixture(async f=>{
 const a=await f.identities.assignPatient({patientId:f.users.patient.profileId,clinicianId:f.users.clinician.profileId});await f.identities.endAssignment(a.id);
 const c=await f.pool.connect();try{await c.query('BEGIN');await c.query('CREATE TEMP TABLE clinician_patient_assignments AS TABLE public.clinician_patient_assignments');await c.query("UPDATE pg_temp.clinician_patient_assignments SET status='ACTIVE',ended_at=NULL");await assert.rejects(c.query("INSERT INTO public.assignment_end_provenance SELECT id,clinician_id,patient_id,$2,'PATIENT',clock_timestamp() FROM public.clinician_patient_assignments WHERE id=$1",[a.id,f.users.patient.id]),e=>e.code==='23514');}finally{await c.query('ROLLBACK');c.release();}
}));
test('I1S5 request creation and acceptance audit failures roll back all proposed authority',()=>fixture(async f=>{
 for(const action of ['RELATIONSHIP_AUTHORIZED','RELATIONSHIP_REQUEST_ACCEPTED']){
  let r;if(action.endsWith('ACCEPTED'))r=(await authorize(f)).request;
  await f.pool.query("CREATE OR REPLACE FUNCTION public.s5_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='"+action+"' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER s5_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION public.s5_fail_audit()");
  await assert.rejects(r?f.relationships.decide(f.actors.clinician,{requestId:r.id},'accept'):authorize(f),e=>e.code==='RELATIONSHIP_UNAVAILABLE');
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM clinician_patient_assignments')).rows[0].n,0);assert.equal((await f.pool.query('SELECT count(*)::int n FROM relationship_requests')).rows[0].n,r?1:0);
  await f.pool.query('DROP TRIGGER s5_fail_audit ON audit_logs');
 }
}));
