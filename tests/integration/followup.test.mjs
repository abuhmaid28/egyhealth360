import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedFollowup,followupSnapshot } from '../support/followup.mjs';
import { waitBlocked } from '../support/care-plans.mjs';
const rejects=(p,code)=>assert.rejects(p,e=>e.code===code);
const page={page:1,pageSize:20};
const link=(f,e,b,actor=f.actor)=>f.encounters.associateBloodPressureMeasurement(actor,{patientId:f.patientId,encounterId:e.id,measurementId:b.id});
const audit=async f=>(await f.pool.query("SELECT * FROM audit_logs WHERE action_type IN ('FOLLOW_UP_APPOINTMENT_CREATED','FOLLOW_UP_APPOINTMENT_CANCELLED','CLINICAL_ENCOUNTER_CREATED','ENCOUNTER_BP_ASSOCIATED') ORDER BY id")).rows;
test('EH-012 exact service boundaries, creations, duplicates, provenance, history and no-op audits',()=>isolatedFollowup(async f=>{
  assert.deepEqual(Object.keys(f.appointments).sort(),['cancelFollowUpAppointment','close','createFollowUpAppointment','listFollowUpAppointments']);
  assert.deepEqual(Object.keys(f.encounters).sort(),['associateBloodPressureMeasurement','close','createClinicalEncounter','listClinicalEncounters','listEncounterBloodPressureAssociations']);
  const a=await f.appointment(),a2=await f.appointment(),e=await f.encounter(),e2=await f.encounter();assert.notEqual(a.id,a2.id);assert.notEqual(e.id,e2.id);
  assert.equal(a.status,'SCHEDULED');assert.equal(a.cancelledAt,null);assert.equal(a.cancelledByUserId,null);assert.equal(a.createdByUserId,f.actor.userId);assert.equal(e.recordedByUserId,f.actor.userId);
  const b=await f.write(f.principals['patient-a']),b2=await f.write();const bpBefore=(await f.pool.query('SELECT * FROM blood_pressure_measurements ORDER BY id')).rows;
  const x=await link(f,e,b),y=await link(f,e,b2);assert.equal(x.changed,true);assert.equal(y.changed,true);assert.equal(x.association.recordedByUserId,f.actor.userId);assert.ok(x.association.createdAt>=e.createdAt&&x.association.createdAt>=b.createdAt);
  const before=await followupSnapshot(f.pool);assert.deepEqual(await link(f,e,b),{association:x.association,changed:false});
  await rejects(link(f,e2,b),'ENCOUNTER_BP_CONFLICT');assert.deepEqual(await followupSnapshot(f.pool),before);assert.deepEqual((await f.pool.query('SELECT * FROM blood_pressure_measurements ORDER BY id')).rows,bpBefore);
  for(const actor of [f.actor,f.principals['patient-a']]){
    assert.equal((await f.appointments.listFollowUpAppointments(actor,{patientId:f.patientId,...page})).meta.total,2);
    assert.equal((await f.encounters.listClinicalEncounters(actor,{patientId:f.patientId,...page})).meta.total,2);
    const result=await f.encounters.listEncounterBloodPressureAssociations(actor,{patientId:f.patientId,encounterId:e.id,...page});assert.equal(result.meta.total,2);assert.equal(result.data.length,2);
  }
  assert.deepEqual(await followupSnapshot(f.pool),before);
  const target={patientId:f.patientId,appointmentId:a.id},cancelled=await f.appointments.cancelFollowUpAppointment(f.actor,target);assert.equal(cancelled.changed,true);assert.equal(cancelled.appointment.status,'CANCELLED');assert.equal(cancelled.appointment.cancelledByUserId,f.actor.userId);assert.ok(cancelled.appointment.cancelledAt>=a.createdAt);
  const after=await followupSnapshot(f.pool);assert.deepEqual(await f.appointments.cancelFollowUpAppointment(f.actor,target),{appointment:cancelled.appointment,changed:false});assert.deepEqual(await followupSnapshot(f.pool),after);
  const events=await audit(f);assert.equal(events.length,7);assert.ok(events.every(r=>r.actor_user_id===f.actor.userId&&JSON.stringify(r.safe_metadata)==='{}'));
  for(const r of events)assert.ok(after[{follow_up_appointment:'follow_up_appointments',clinical_encounter:'clinical_encounters',encounter_bp_association:'encounter_bp_associations'}[r.entity_type]].some(x=>x.id===r.entity_id));
}));
for(const who of ['patient-a','patient-b','clinician-unassigned','admin'])test(`EH-012 ${who} write matrix and protected reads`,()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write(),actor=f.principals[who],before=await followupSnapshot(f.pool);
  for(const op of [()=>f.appointment(actor),()=>f.encounter(actor),()=>f.appointments.cancelFollowUpAppointment(actor,{patientId:f.patientId,appointmentId:a.id}),()=>link(f,e,b,actor)])await rejects(op(),'EVIDENCE_NOT_FOUND');
  for(const operation of [()=>f.appointments.listFollowUpAppointments(actor,{patientId:f.patientId,...page}),()=>f.encounters.listClinicalEncounters(actor,{patientId:f.patientId,...page}),()=>f.encounters.listEncounterBloodPressureAssociations(actor,{patientId:f.patientId,encounterId:e.id,...page})])if(who==='patient-a')await operation();else await rejects(operation(),'EVIDENCE_NOT_FOUND');
  assert.deepEqual(await followupSnapshot(f.pool),before);
}));
test('EH-012 time ownership, backdating, future checks and no caller authority',()=>isolatedFollowup(async f=>{
  for(const input of [{scheduledAt:'2024-01-01T00:00:00Z'},{purpose:'OTHER'},{createdByUserId:f.actor.userId},{status:'CANCELLED'},{createdAt:'2099-01-01'}])await assert.rejects(f.appointment(f.actor,input));
  for(const input of [{occurredAt:'9999-01-01T00:00:00Z'},{purpose:null},{recordedByUserId:f.actor.userId},{createdAt:'1900-01-01'}])await assert.rejects(f.encounter(f.actor,input));
  const e=await f.encounter(f.actor,{occurredAt:'0001-01-01T00:00:00Z'});assert.equal(e.occurredAt.toISOString(),'0001-01-01T00:00:00.000Z');
  const a=await f.appointment(f.actor,{scheduledAt:'2099-01-01T02:30:00.12+02:30'});assert.equal(a.scheduledAt.toISOString(),'2099-01-01T00:00:00.120Z');
  const sql="INSERT INTO clinical_encounters(patient_id,occurred_at,purpose,recorded_by_user_id,created_at) VALUES($1,$2,'HTN_BP_FOLLOWUP',$3,'1900-01-01') RETURNING *";
  const r=(await f.pool.query(sql,[f.patientId,'2024-01-01',f.actor.userId])).rows[0];assert.ok(r.created_at>new Date('2024-01-01'));
  for(const time of ['infinity','-infinity','0001-01-01 BC','2024-01-01T00:00:00.000001Z','9999-01-01'])await assert.rejects(f.pool.query(sql,[f.patientId,time,f.actor.userId]));
}));
test('EH-012 appointment cancels after scheduled time, retains first cancelling clinician and terminal history',()=>isolatedFollowup(async f=>{
  const a=await f.appointment(f.actor,{scheduledAt:new Date(Date.now()+1500).toISOString()});
  // DB-owned delay proves cancellation is permitted after the schedule without rewriting history.
  await f.pool.query('SELECT pg_sleep(1.6)');
  const p={patientId:f.patientId,appointmentId:a.id},c=await f.appointments.cancelFollowUpAppointment(f.actor,p);assert.ok(c.appointment.cancelledAt>a.scheduledAt);
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.identities['clinician-unassigned'].profileId,f.patientId]);
  const retry=await f.appointments.cancelFollowUpAppointment(f.principals['clinician-unassigned'],p);assert.deepEqual(retry,{appointment:c.appointment,changed:false});
  for(const sql of ["UPDATE follow_up_appointments SET status='SCHEDULED',cancelled_at=NULL,cancelled_by_user_id=NULL",'UPDATE follow_up_appointments SET cancelled_by_user_id=created_by_user_id,cancelled_at=cancelled_at+interval \'1 second\''])await assert.rejects(f.pool.query(sql));
}));
test('EH-012 concurrent cancellation and same/different association serialize',()=>isolatedFollowup(async f=>{
  // Distinct clinician users/sessions ensure target locks, rather than one actor lock, serialize the race.
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)',[f.identities['clinician-unassigned'].profileId,f.patientId]);
  const second=f.principals['clinician-unassigned'];
  const a=await f.appointment(),e=await f.encounter(),e2=await f.encounter(),b=await f.write(),b2=await f.write();
  const c=await Promise.all([f.actor,second].map(actor=>f.appointments.cancelFollowUpAppointment(actor,{patientId:f.patientId,appointmentId:a.id})));assert.deepEqual(c.map(x=>x.changed).sort(),[false,true]);assert.deepEqual(c[0].appointment,c[1].appointment);
  const same=await Promise.all([link(f,e,b),link(f,e,b,second)]);assert.deepEqual(same.map(x=>x.changed).sort(),[false,true]);assert.deepEqual(same[0].association,same[1].association);
  const different=await Promise.allSettled([link(f,e,b2),link(f,e2,b2,second)]);assert.equal(different.filter(x=>x.status==='fulfilled').length,1);assert.equal(different.find(x=>x.status==='rejected').reason.code,'ENCOUNTER_BP_CONFLICT');
  assert.equal((await audit(f)).filter(x=>x.action_type==='ENCOUNTER_BP_ASSOCIATED').length,2);
}));
test('EH-012 ordinary SQL and Prisma preserve immutable history, lifecycle and composite patient consistency',()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write();await link(f,e,b);
  const before=await followupSnapshot(f.pool);
  for(const t of ['clinical_encounters','encounter_bp_associations'])for(const sql of [`UPDATE ${t} SET id=id`,`UPDATE ${t} SET id=id WHERE false`,`DELETE FROM ${t}`,`DELETE FROM ${t} WHERE false`,`TRUNCATE ${t}`,`TRUNCATE ${t} CASCADE`])await assert.rejects(f.pool.query(sql));
  for(const sql of ['DELETE FROM follow_up_appointments','DELETE FROM follow_up_appointments WHERE false','TRUNCATE follow_up_appointments','TRUNCATE users CASCADE'])await assert.rejects(f.pool.query(sql));
  for(const field of ['id','patient_id','created_by_user_id'])await assert.rejects(f.pool.query(`UPDATE follow_up_appointments SET ${field}=$1 WHERE id=$2`,[randomUUID(),a.id]));
  for(const change of ["scheduled_at=scheduled_at+interval '1 second'","purpose='OTHER'","created_at=created_at+interval '1 second'","cancelled_at=now()","status='CANCELLED'"])await assert.rejects(f.pool.query('UPDATE follow_up_appointments SET '+change));
  const insert='INSERT INTO encounter_bp_associations(patient_id,encounter_id,blood_pressure_measurement_id,recorded_by_user_id) VALUES($1,$2,$3,$4)';
  for(const values of [[f.identities['patient-b'].profileId,e.id,b.id,f.actor.userId],[f.patientId,randomUUID(),b.id,f.actor.userId],[f.patientId,e.id,randomUUID(),f.actor.userId],[f.patientId,e.id,b.id,f.principals.admin.userId]])await assert.rejects(f.pool.query(insert,values));
  const {createRequire}=await import('node:module'),require=createRequire(new URL('../../packages/db/package.json',import.meta.url));const {PrismaPg}=require('@prisma/adapter-pg');const {PrismaClient}=await import('../../packages/db/dist/generated/prisma/client.js');const client=new PrismaClient({adapter:new PrismaPg(f.pool),log:[]});
  try{for(const model of [client.clinicalEncounter,client.encounterBloodPressureAssociation]){await assert.rejects(model.updateMany({data:{recordedByUserId:f.principals.admin.userId}}));await assert.rejects(model.deleteMany());}await assert.rejects(client.followUpAppointment.update({where:{id:a.id},data:{scheduledAt:new Date('2100-01-01')}}));}finally{await client.$disconnect();}
  assert.deepEqual(await followupSnapshot(f.pool),before);
}));
for(const target of ['appointment','encounter','association'])test(`EH-012 ${target} SQL actor/TEMP shadow protection`,()=>isolatedFollowup(async f=>{
  const e=await f.encounter(),b=await f.write();const c=await f.pool.connect();
  try{await c.query('BEGIN');for(const t of ['users','clinician_profiles','clinician_patient_assignments','patient_profiles','clinical_encounters','blood_pressure_measurements'])await c.query(`CREATE TEMP TABLE ${t} AS SELECT * FROM public.${t}`);
    await c.query("UPDATE users SET role='CLINICIAN' WHERE id=$1",[f.principals.admin.userId]);await c.query('UPDATE clinician_profiles SET user_id=$1',[f.principals.admin.userId]);
    const sql={appointment:"INSERT INTO public.follow_up_appointments(patient_id,scheduled_at,purpose,created_by_user_id) VALUES($1,'2099-01-01','HTN_BP_FOLLOWUP',$2)",encounter:"INSERT INTO public.clinical_encounters(patient_id,occurred_at,purpose,recorded_by_user_id) VALUES($1,'2024-01-01','HTN_BP_FOLLOWUP',$2)",association:'INSERT INTO public.encounter_bp_associations(patient_id,recorded_by_user_id,encounter_id,blood_pressure_measurement_id) VALUES($1,$2,$3,$4)'}[target];
    await assert.rejects(c.query(sql,[f.patientId,f.principals.admin.userId,...(target==='association'?[e.id,b.id]:[])]),x=>x.constraint==='eh012_provenance_guard');
  }finally{await c.query('ROLLBACK');c.release();}
}));
for(const mode of ['create-appointment','cancel','create-encounter','associate'])test(`EH-012 ${mode} audit failure is atomic`,()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write(),before=await followupSnapshot(f.pool);
  await f.pool.query("CREATE FUNCTION fail_eh012_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'secret-driver'; END $$; CREATE TRIGGER fail_eh012_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_eh012_audit()");
  const op=()=>({'create-appointment':()=>f.appointment(),cancel:()=>f.appointments.cancelFollowUpAppointment(f.actor,{patientId:f.patientId,appointmentId:a.id}),'create-encounter':()=>f.encounter(),associate:()=>link(f,e,b)}[mode]());
  await rejects(op(),['create-appointment','cancel'].includes(mode)?'FOLLOW_UP_SERVICE_UNAVAILABLE':'CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE');assert.deepEqual(await followupSnapshot(f.pool),before);
}));
for(const operation of ['appointment','cancel','encounter','association'])for(const race of ['session','user','assignment','mapping'])for(const first of ['revocation','write'])test(`EH-012 ${operation} ${race}: ${first} wins`,()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write();
  const write=()=>({appointment:()=>f.appointment(),cancel:()=>f.appointments.cancelFollowUpAppointment(f.actor,{patientId:f.patientId,appointmentId:a.id}),encounter:()=>f.encounter(),association:()=>link(f,e,b)}[operation]());
  const id={session:f.actor.sessionId,user:f.actor.userId,assignment:f.assignmentId,mapping:f.identities['clinician-assigned'].profileId}[race];
  const newUser=race==='mapping'?(await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,'synthetic-test-hash','CLINICIAN') RETURNING id",[randomUUID()+'@example.invalid'])).rows[0].id:null;
  const sql={session:'UPDATE sessions SET revoked_at=now() WHERE id=$1',user:"UPDATE users SET status='DISABLED' WHERE id=$1",assignment:"UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1",mapping:'UPDATE clinician_profiles SET user_id=$2 WHERE id=$1'}[race];
  const c=await f.pool.connect(),gate=await f.pool.connect();let pending,mutation;const before=await followupSnapshot(f.pool);
  try{
    if(first==='revocation'){
      await c.query('BEGIN');await c.query(sql,race==='mapping'?[id,newUser]:[id]);const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=write().then(value=>({value}),error=>({error}));
      let blocked=false;for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[pid])).rowCount){blocked=true;break;}assert.ok(blocked);
      await c.query('COMMIT');assert.equal((await pending).error?.code,['session','user'].includes(race)?'EVIDENCE_UNAUTHENTICATED':'EVIDENCE_NOT_FOUND');assert.deepEqual(await followupSnapshot(f.pool),before);
    }else{
      await f.pool.query("CREATE FUNCTION pause_eh012_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type IN ('FOLLOW_UP_APPOINTMENT_CREATED','FOLLOW_UP_APPOINTMENT_CANCELLED','CLINICAL_ENCOUNTER_CREATED','ENCOUNTER_BP_ASSOCIATED') THEN PERFORM pg_advisory_xact_lock(1212); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_eh012_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_eh012_audit()");
      await gate.query('BEGIN');await gate.query('SELECT pg_advisory_xact_lock(1212)');const gatePid=(await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=write().then(value=>({value}),error=>({error}));let blocked=false;for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[gatePid])).rowCount){blocked=true;break;}assert.ok(blocked);
      const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;mutation=c.query(sql,race==='mapping'?[id,newUser]:[id]);await waitBlocked(f.pool,pid);await gate.query('COMMIT');assert.ok((await pending).value);await mutation;
      assert.equal((await audit(f)).length,3);
    }
  }finally{await gate.query('ROLLBACK');await c.query('ROLLBACK');if(pending)await pending;if(mutation)await mutation;c.release();gate.release();}
}));
for(const operation of ['appointment','cancel','encounter','association'])test(`EH-012 ${operation} final expiry check rolls back`,()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write(),before=await followupSnapshot(f.pool);
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE id=$1",[f.actor.sessionId]);
  await f.pool.query("CREATE FUNCTION expire_eh012_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1.1); RETURN NEW; END $$; CREATE TRIGGER expire_eh012_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION expire_eh012_audit()");
  const write=()=>({appointment:()=>f.appointment(),cancel:()=>f.appointments.cancelFollowUpAppointment(f.actor,{patientId:f.patientId,appointmentId:a.id}),encounter:()=>f.encounter(),association:()=>link(f,e,b)}[operation]());
  await rejects(write(),'EVIDENCE_UNAUTHENTICATED');assert.deepEqual(await followupSnapshot(f.pool),before);
}));
for(const state of ['expired','revoked','disabled','role','missing','wrong-patient'])test(`EH-012 current authorization ${state} denies reads/writes/no-ops`,()=>isolatedFollowup(async f=>{
  const a=await f.appointment(),e=await f.encounter(),b=await f.write();await link(f,e,b);await f.appointments.cancelFollowUpAppointment(f.actor,{patientId:f.patientId,appointmentId:a.id});
  let actor=f.actor,patientId=f.patientId;const before=await followupSnapshot(f.pool);
  if(state==='expired')await f.pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE id=$1",[actor.sessionId]);
  if(state==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[actor.sessionId]);
  if(state==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[actor.userId]);
  if(state==='role')actor={...actor,role:'ADMIN'};
  if(state==='missing')actor=null;
  if(state==='wrong-patient')patientId=f.identities['patient-b'].profileId;
  const code=['expired','revoked','disabled','missing'].includes(state)?'EVIDENCE_UNAUTHENTICATED':'EVIDENCE_NOT_FOUND';
  for(const op of [()=>f.appointment(actor,{patientId}),()=>f.encounter(actor,{patientId}),()=>f.appointments.cancelFollowUpAppointment(actor,{patientId,appointmentId:a.id}),()=>f.encounters.associateBloodPressureMeasurement(actor,{patientId,encounterId:e.id,measurementId:b.id}),()=>f.appointments.listFollowUpAppointments(actor,{patientId,...page}),()=>f.encounters.listClinicalEncounters(actor,{patientId,...page}),()=>f.encounters.listEncounterBloodPressureAssociations(actor,{patientId,encounterId:e.id,...page})])await rejects(op(),code);
  assert.deepEqual(await followupSnapshot(f.pool),before);
}));
test('EH-012 exact SQL schema, trusted functions, indexes and composite FKs',()=>isolatedFollowup(async f=>{
  const models={follow_up_appointments:['id','patient_id','scheduled_at','purpose','status','created_by_user_id','created_at','cancelled_at','cancelled_by_user_id'],clinical_encounters:['id','patient_id','occurred_at','purpose','recorded_by_user_id','created_at'],encounter_bp_associations:['id','patient_id','encounter_id','blood_pressure_measurement_id','recorded_by_user_id','created_at']};
  for(const [table,expected] of Object.entries(models)){
    const columns=(await f.pool.query("SELECT column_name,datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows;assert.deepEqual(columns.map(c=>c.column_name),expected);
    assert.ok(columns.filter(c=>['occurred_at','scheduled_at'].includes(c.column_name)).every(c=>c.datetime_precision===6));assert.ok(columns.filter(c=>['created_at','cancelled_at'].includes(c.column_name)).every(c=>c.datetime_precision===3));
    const fks=(await f.pool.query("SELECT confdeltype,confupdtype FROM pg_constraint WHERE conrelid=$1::regclass AND contype='f'",['public.'+table])).rows;assert.ok(fks.every(c=>c.confdeltype==='r'&&c.confupdtype==='r'));
  }
  const fks=(await f.pool.query("SELECT pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='public.encounter_bp_associations'::regclass AND contype='f'")).rows.map(r=>r.def).join('\n');assert.match(fks,/FOREIGN KEY \(encounter_id, patient_id\) REFERENCES clinical_encounters\(id, patient_id\)/);assert.match(fks,/FOREIGN KEY \(blood_pressure_measurement_id, patient_id\) REFERENCES blood_pressure_measurements\(id, patient_id\)/);
  const funcs=(await f.pool.query("SELECT prosecdef,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'eh012_%'")).rows;assert.equal(funcs.length,6);assert.ok(funcs.every(x=>!x.prosecdef&&x.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
  const indices=(await f.pool.query("SELECT indexdef FROM pg_indexes WHERE tablename='encounter_bp_associations' AND schemaname='public'")).rows.map(x=>x.indexdef).join('\n');assert.match(indices,/UNIQUE INDEX encounter_bp_associations_measurement_key .*\(blood_pressure_measurement_id\)/);
}));
test('EH-012 composite FKs independently reject cross-patient links and TEMP parents cannot satisfy guards',()=>isolatedFollowup(async f=>{
  const e=await f.encounter(),b=await f.write(f.principals['patient-b'],{patientId:f.identities['patient-b'].profileId}),c=await f.pool.connect();
  try{
    await c.query('BEGIN');await c.query('ALTER TABLE public.encounter_bp_associations DISABLE TRIGGER encounter_bp_associations_insert_guard');
    await assert.rejects(c.query('INSERT INTO public.encounter_bp_associations(patient_id,encounter_id,blood_pressure_measurement_id,recorded_by_user_id) VALUES($1,$2,$3,$4)',[f.patientId,e.id,b.id,f.actor.userId]),x=>x.code==='23503'&&x.constraint==='encounter_bp_associations_measurement_patient_fkey');
    await c.query('ROLLBACK');await c.query('BEGIN');
    for(const table of ['clinical_encounters','blood_pressure_measurements'])await c.query(`CREATE TEMP TABLE ${table} AS SELECT * FROM public.${table}`);
    const fake=randomUUID();await c.query('UPDATE clinical_encounters SET id=$1',[fake]);await c.query('UPDATE blood_pressure_measurements SET patient_id=$1',[f.patientId]);
    await assert.rejects(c.query('INSERT INTO public.encounter_bp_associations(patient_id,encounter_id,blood_pressure_measurement_id,recorded_by_user_id) VALUES($1,$2,$3,$4)',[f.patientId,fake,b.id,f.actor.userId]),x=>x.constraint==='encounter_bp_associations_scope_guard');
  }finally{await c.query('ROLLBACK');c.release();}
}));
test('EH-012 structural provenance rejects patient/admin/unassigned actors and inactive assignments for every insert',()=>isolatedFollowup(async f=>{
  const e=await f.encounter(),b=await f.write();
  for(const actor of [f.principals['patient-a'].userId,f.principals.admin.userId,f.principals['clinician-unassigned'].userId,randomUUID()]){
    for(const [sql,args] of [["INSERT INTO follow_up_appointments(patient_id,scheduled_at,purpose,created_by_user_id) VALUES($1,'2099-01-01','HTN_BP_FOLLOWUP',$2)",[f.patientId,actor]],["INSERT INTO clinical_encounters(patient_id,occurred_at,purpose,recorded_by_user_id) VALUES($1,'2024-01-01','HTN_BP_FOLLOWUP',$2)",[f.patientId,actor]],['INSERT INTO encounter_bp_associations(patient_id,recorded_by_user_id,encounter_id,blood_pressure_measurement_id) VALUES($1,$2,$3,$4)',[f.patientId,actor,e.id,b.id]]])await assert.rejects(f.pool.query(sql,args),x=>x.constraint==='eh012_provenance_guard');
  }
  const patientB=f.identities['patient-b'].profileId;
  assert.deepEqual((await f.appointments.listFollowUpAppointments(f.principals['patient-b'],{patientId:patientB,...page})).data,[]);
  assert.deepEqual((await f.encounters.listClinicalEncounters(f.principals['patient-b'],{patientId:patientB,...page})).data,[]);
}));
test('EH-012 same-pair no-op waiting on BP still rechecks clock expiry',()=>isolatedFollowup(async f=>{
  const e=await f.encounter(),b=await f.write();await link(f,e,b);const before=await followupSnapshot(f.pool),c=await f.pool.connect();let pending;
  try{
    await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE id=$1",[f.actor.sessionId]);
    await c.query('BEGIN');await c.query('SELECT id FROM blood_pressure_measurements WHERE id=$1 FOR UPDATE',[b.id]);const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    pending=link(f,e,b).then(value=>({value}),error=>({error}));let blocked=false;for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[pid])).rowCount){blocked=true;break;}assert.ok(blocked);
    await c.query('SELECT pg_sleep(1.1)');await c.query('COMMIT');assert.equal((await pending).error.code,'EVIDENCE_UNAUTHENTICATED');assert.deepEqual(await followupSnapshot(f.pool),before);
  }finally{await c.query('ROLLBACK');if(pending)await pending;c.release();}
}));
test('EH-012 persists operational records with an empty clinical catalog and no CarePlan',async()=>{
  const {isolatedCatalog}=await import('../support/clinical-catalog.mjs'),{readFile}=await import('node:fs/promises'),{randomBytes}=await import('node:crypto'),{Buffer}=await import('node:buffer');
  const {createDemoPersistence,createAuthPersistence,createFollowUpAppointmentPersistence,createClinicalEncounterPersistence,createBloodPressureMeasurementPersistence}=await import('../../packages/db/dist/index.js');const {seedDemo}=await import('../../scripts/lib/m1-demo.mjs');
  await isolatedCatalog(async({pool,url})=>{
    for(const name of ['20261016000000_eh010_care_plan_lifecycle','20261017000000_eh011_bp_provenance','20261018000000_eh012_followup_encounters'])await pool.query(await readFile(`packages/db/prisma/migrations/${name}/migration.sql`,'utf8'));
    const demo=createDemoPersistence(url),auth=createAuthPersistence(url),appointments=createFollowUpAppointmentPersistence(url),encounters=createClinicalEncounterPersistence(url),bp=createBloodPressureMeasurementPersistence(url);
    try{
      const state=(await seedDemo(demo,Buffer.from(randomBytes(32).toString('base64url')))).state,actor=state.identities.find(i=>i.key==='clinician-assigned'),patientId=state.identities.find(i=>i.key==='patient-a').profileId;
      const hash=(await pool.query('SELECT password_hash FROM users WHERE id=$1',[actor.userId])).rows[0].password_hash;
      const principal=await auth.createSession({userId:actor.userId,verifiedHash:hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});
      const a=await appointments.createFollowUpAppointment(principal,{patientId,scheduledAt:'2099-01-01T00:00:00Z',purpose:'HTN_BP_FOLLOWUP'});
      const e=await encounters.createClinicalEncounter(principal,{patientId,occurredAt:'2024-01-01T00:00:00Z',purpose:'HTN_BP_FOLLOWUP'}),b=await bp.createBloodPressureMeasurement(principal,{patientId,systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-01T00:00:00Z'});
      await encounters.associateBloodPressureMeasurement(principal,{patientId,encounterId:e.id,measurementId:b.id});await appointments.cancelFollowUpAppointment(principal,{patientId,appointmentId:a.id});
      for(const table of ['care_plans','guideline_sources','care_plan_templates','care_rule_definitions'])assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0);
    }finally{await bp.close();await encounters.close();await appointments.close();await auth.close();await demo.close();}
  });
});
