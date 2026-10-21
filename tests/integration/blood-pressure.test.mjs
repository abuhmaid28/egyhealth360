import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedBp,bpInput,bpSnapshot } from '../support/blood-pressure.mjs';
import { waitBlocked } from '../support/care-plans.mjs';
const rejects=(p,code)=>assert.rejects(p,e=>e.code===code);
test('paired BP stores exact patient/clinician provenance and duplicates without plan dependency',()=>isolatedBp(async f=>{
  const {bp,write,principals,patientId,pool}=f;
  assert.deepEqual(Object.keys(bp).sort(),['close','createBloodPressureMeasurement','listBloodPressureMeasurements']);
  assert.equal((await pool.query('SELECT count(*)::int n FROM care_plans')).rows[0].n,0);
  const a=await write(principals['patient-a']),b=await write(),c=await write();
  assert.notEqual(b.id,c.id);assert.equal(a.patientId,patientId);assert.equal(a.recordedByUserId,principals['patient-a'].userId);assert.equal(a.sourceKind,'PATIENT_SELF_ENTRY');assert.equal(b.recordedByUserId,f.actor.userId);assert.equal(b.sourceKind,'CLINICIAN_ENTRY');
  const result=await bp.listBloodPressureMeasurements(principals['patient-a'],{patientId,page:1,pageSize:2});assert.equal(result.total,3);assert.equal(result.measurements.length,2);
  assert.deepEqual(result.measurements.map(r=>r.id),[a,b,c].map(r=>r.id).sort().reverse().slice(0,2));
  assert.equal((await bp.listBloodPressureMeasurements(f.actor,{patientId,page:3,pageSize:2})).measurements.length,0);
  const s=await bpSnapshot(pool);assert.equal(s.audit.length,3);assert.ok(s.audit.every(r=>r.entity_type==='blood_pressure_measurement'&&JSON.stringify(r.safe_metadata)==='{}'));
  assert.ok(s.audit.every(r=>s.bp.some(b=>b.id===r.entity_id&&b.recorded_by_user_id===r.actor_user_id)));
  const before=await bpSnapshot(pool);await bp.listBloodPressureMeasurements(f.actor,{patientId,page:1,pageSize:20});assert.deepEqual(await bpSnapshot(pool),before);
}));
for(const key of ['patient-b','clinician-unassigned','admin'])test(`BP ${key} denied without writes`,()=>isolatedBp(async f=>{
  const before=await bpSnapshot(f.pool);await rejects(f.write(f.principals[key]),'BP_NOT_FOUND');await rejects(f.bp.listBloodPressureMeasurements(f.principals[key],{patientId:f.patientId,page:1,pageSize:20}),'BP_NOT_FOUND');assert.deepEqual(await bpSnapshot(f.pool),before);
}));
for(const mode of ['revoked','expired','disabled','role','wrong-patient'])test(`BP current authorization ${mode}`,()=>isolatedBp(async f=>{
  let actor=f.actor,input={};
  if(mode==='revoked')await f.pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[actor.sessionId]);
  if(mode==='expired')await f.pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE id=$1",[actor.sessionId]);
  if(mode==='disabled')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[actor.userId]);
  if(mode==='role')actor={...actor,role:'PATIENT'};
  if(mode==='wrong-patient')input={patientId:f.identities['patient-b'].profileId};
  await rejects(f.write(actor,input),['role','wrong-patient'].includes(mode)?'BP_NOT_FOUND':'BP_UNAUTHENTICATED');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));
test('BP values, timestamp normalization, future rejection and spoofing fail without mutation',()=>isolatedBp(async f=>{
  for(const change of [{systolic:'128'},{diastolic:null},{systolic:true},{systolic:1.2},{systolic:2147483648},{sourceKind:'CLINICIAN_ENTRY'},{recordedByUserId:f.actor.userId},{measuredAt:'9999-01-01T00:00:00Z'},{unit:'kPa'}])await rejects(f.write(f.actor,change),'BP_MEASUREMENT_INVALID');
  const row=await f.write(f.principals['patient-a'],{systolic:-2147483648,diastolic:0,measuredAt:'2024-02-29T02:30:00.12+02:30'});assert.equal(row.measuredAt.toISOString(),'2024-02-29T00:00:00.120Z');assert.ok(row.createdAt>=row.measuredAt);
}));
test('BP SQL constraints, immutability including empty statements, and FK protection',()=>isolatedBp(async f=>{
  const row=await f.write();
  for(const sql of ['UPDATE blood_pressure_measurements SET systolic=systolic','UPDATE blood_pressure_measurements SET systolic=1 WHERE false','DELETE FROM blood_pressure_measurements WHERE false','DELETE FROM blood_pressure_measurements','TRUNCATE blood_pressure_measurements','TRUNCATE blood_pressure_measurements CASCADE','TRUNCATE users CASCADE'])await assert.rejects(f.pool.query(sql));
  for(const [table,id] of [['users',f.actor.userId],['patient_profiles',f.patientId]])await assert.rejects(f.pool.query(`DELETE FROM ${table} WHERE id=$1`,[id]));
  const insert=(actor,source,time='2024-01-01T00:00:00Z',unit='mmHg')=>f.pool.query('INSERT INTO blood_pressure_measurements(patient_id,systolic,diastolic,unit,measured_at,recorded_by_user_id,source_kind) VALUES($1,128,82,$2,$3,$4,$5)',[f.patientId,unit,time,actor,source]);
  for(const [actor,source] of [[f.principals.admin.userId,'CLINICIAN_ENTRY'],[f.principals['patient-b'].userId,'PATIENT_SELF_ENTRY'],[f.actor.userId,'PATIENT_SELF_ENTRY'],[f.principals['patient-a'].userId,'CLINICIAN_ENTRY'],[f.principals['clinician-unassigned'].userId,'CLINICIAN_ENTRY'],[randomUUID(),'PATIENT_SELF_ENTRY']])await assert.rejects(insert(actor,source));
  for(const time of ['infinity','-infinity','2024-01-01T00:00:00.000001Z','9999-01-01T00:00:00Z','0001-01-01 BC'])await assert.rejects(insert(f.actor.userId,'CLINICIAN_ENTRY',time));
  await assert.rejects(insert(f.actor.userId,'CLINICIAN_ENTRY',bpInput.measuredAt,'kPa'));
  assert.equal((await bpSnapshot(f.pool)).bp[0].id,row.id);
}));
test('BP audit failure rolls back evidence and reports only safe service error',()=>isolatedBp(async f=>{
  await f.pool.query("CREATE FUNCTION fail_bp_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'secret'; END $$; CREATE TRIGGER fail_bp_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_bp_audit()");
  await rejects(f.write(),'BP_SERVICE_UNAVAILABLE');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));
test('BP TEMP shadows cannot forge actor or assignment provenance',()=>isolatedBp(async f=>{
  const c=await f.pool.connect();try{await c.query('BEGIN');for(const t of ['users','clinician_profiles','patient_profiles','clinician_patient_assignments'])await c.query(`CREATE TEMP TABLE ${t} AS SELECT * FROM public.${t}`);
    await c.query("UPDATE users SET role='CLINICIAN' WHERE id=$1",[f.principals.admin.userId]);await c.query('UPDATE clinician_profiles SET user_id=$1',[f.principals.admin.userId]);
    await assert.rejects(c.query("INSERT INTO public.blood_pressure_measurements(patient_id,systolic,diastolic,unit,measured_at,recorded_by_user_id,source_kind) VALUES($1,1,2,'mmHg','2024-01-01',$2,'CLINICIAN_ENTRY')",[f.patientId,f.principals.admin.userId]),e=>e.constraint==='blood_pressure_measurements_provenance_guard');
  }finally{await c.query('ROLLBACK');c.release();}
}));
const changes={session:'UPDATE sessions SET revoked_at=now() WHERE id=$1',user:"UPDATE users SET status='DISABLED' WHERE id=$1",assignment:"UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1"};
for(const race of Object.keys(changes))for(const first of ['revocation','submission'])test(`BP ${race} race ${first} wins`,()=>isolatedBp(async f=>{
  const c=await f.pool.connect(),gate=await f.pool.connect();let pending,mutation;
  const id={session:f.actor.sessionId,user:f.actor.userId,assignment:f.assignmentId}[race];
  try{
    if(first==='revocation'){
      await c.query('BEGIN');await c.query(changes[race],[id]);const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=f.write().then(value=>({value}),error=>({error}));
      let blocked=false;for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[pid])).rowCount){blocked=true;break;}assert.ok(blocked);
      await c.query('COMMIT');assert.equal((await pending).error.code,race==='assignment'?'BP_NOT_FOUND':'BP_UNAUTHENTICATED');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
    }else{
      await f.pool.query("CREATE FUNCTION pause_bp_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_MEASUREMENT_CREATED' THEN PERFORM pg_advisory_xact_lock(1111); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_bp_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_bp_audit()");
      await gate.query('BEGIN');await gate.query('SELECT pg_advisory_xact_lock(1111)');const gatePid=(await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=f.write().then(value=>({value}),error=>({error}));let waiting=false;for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[gatePid])).rowCount){waiting=true;break;}assert.ok(waiting);
      const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;mutation=c.query(changes[race],[id]);await waitBlocked(f.pool,pid);await gate.query('COMMIT');assert.ok((await pending).value);await mutation;assert.equal((await bpSnapshot(f.pool)).audit.length,1);
    }
  }finally{await gate.query('ROLLBACK');await c.query('ROLLBACK');if(pending)await pending;if(mutation)await mutation;c.release();gate.release();}
}));

for(const profile of ['patient','clinician'])for(const first of ['mapping','submission'])test(`BP ${profile} profile relationship race: ${first} first`,()=>isolatedBp(async f=>{
  const table=profile==='patient'?'patient_profiles':'clinician_profiles';
  const original=profile==='patient'?f.identities['patient-a']:f.identities['clinician-assigned'];
  const actor=profile==='patient'?f.principals['patient-a']:f.actor;
  const newUser=(await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,'synthetic-test-hash',$2) RETURNING id",[randomUUID()+'@example.invalid',profile==='patient'?'PATIENT':'CLINICIAN'])).rows[0].id;
  const c=await f.pool.connect(),gate=await f.pool.connect();let pending,mutation;
  const change=()=>c.query(`UPDATE public.${table} SET user_id=$1 WHERE id=$2`,[newUser,original.profileId]);
  try{
    if(first==='mapping'){
      await c.query('BEGIN');await change();const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=f.write(actor).then(value=>({value}),error=>({error}));let blocked=false;
      for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[pid])).rowCount){blocked=true;break;}assert.ok(blocked);
      await c.query('COMMIT');assert.equal((await pending).error?.code,'BP_NOT_FOUND');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
    }else{
      await f.pool.query("CREATE FUNCTION pause_bp_mapping() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_MEASUREMENT_CREATED' THEN PERFORM pg_advisory_xact_lock(1112); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_bp_mapping BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_bp_mapping()");
      await gate.query('BEGIN');await gate.query('SELECT pg_advisory_xact_lock(1112)');const pid=(await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      pending=f.write(actor).then(value=>({value}),error=>({error}));let blocked=false;
      for(let i=0;i<500;i++)if((await f.pool.query('SELECT pid FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))',[pid])).rowCount){blocked=true;break;}assert.ok(blocked);
      const changePid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;mutation=change();await waitBlocked(f.pool,changePid);await gate.query('COMMIT');assert.ok((await pending).value);await mutation;
      const state=await bpSnapshot(f.pool);assert.equal(state.bp[0].recorded_by_user_id,actor.userId);assert.equal(state.audit.length,1);
    }
  }finally{await gate.query('ROLLBACK');await c.query('ROLLBACK');if(pending)await pending;if(mutation)await mutation;c.release();gate.release();}
}));
test('BP session expiry during transaction rolls back inserted evidence and audit',()=>isolatedBp(async f=>{
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actor.sessionId]);
  await f.pool.query("CREATE FUNCTION delay_bp_expiry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_MEASUREMENT_CREATED' THEN PERFORM pg_sleep(2.1); END IF; RETURN NEW; END $$; CREATE TRIGGER delay_bp_expiry BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION delay_bp_expiry()");
  await rejects(f.write(),'BP_UNAUTHENTICATED');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));
test('BP schema objects, precision, FK rules and trusted invoker functions are exact',()=>isolatedBp(async f=>{
  const columns=(await f.pool.query("SELECT column_name,udt_name,datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name='blood_pressure_measurements' ORDER BY ordinal_position")).rows;
  assert.deepEqual(columns.map(c=>c.column_name),['id','patient_id','systolic','diastolic','unit','measured_at','created_at','recorded_by_user_id','source_kind']);assert.equal(columns.find(c=>c.column_name==='measured_at').datetime_precision,6);assert.equal(columns.find(c=>c.column_name==='created_at').datetime_precision,3);
  const fks=(await f.pool.query("SELECT conname,confdeltype,confupdtype FROM pg_constraint WHERE conrelid='public.blood_pressure_measurements'::regclass AND contype='f'")).rows;assert.equal(fks.length,2);assert.ok(fks.every(r=>r.confdeltype==='r'&&r.confupdtype==='r'));
  const functions=(await f.pool.query("SELECT prosecdef,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'eh011_%'")).rows;assert.equal(functions.length,2);assert.ok(functions.every(f=>f.prosecdef===false&&f.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
  const indexes=(await f.pool.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='blood_pressure_measurements'")).rows;assert.equal(indexes.length,4);assert.match(indexes.find(i=>i.indexname.endsWith('history_idx')).indexdef,/patient_id, measured_at DESC, id DESC/);
  const before=await bpSnapshot(f.pool);for(const sql of ['DELETE FROM blood_pressure_measurements','TRUNCATE blood_pressure_measurements CASCADE','UPDATE blood_pressure_measurements SET systolic=1'])await assert.rejects(f.pool.query(sql),e=>e.constraint==='blood_pressure_measurements_history_guard');assert.deepEqual(await bpSnapshot(f.pool),before);
}));

test('BP Prisma cannot mutate any historical field or bypass removal guards',()=>isolatedBp(async f=>{
  const {createRequire}=await import('node:module');const require=createRequire(new URL('../../packages/db/package.json',import.meta.url));
  const {PrismaPg}=require('@prisma/adapter-pg');const {PrismaClient}=await import('../../packages/db/dist/generated/prisma/client.js');
  const client=new PrismaClient({adapter:new PrismaPg(f.pool),log:[]});
  try{
    const row=await f.write(),before=await bpSnapshot(f.pool);
    for(const data of [{id:randomUUID()},{patientId:randomUUID()},{systolic:129},{diastolic:83},{unit:'kPa'},{measuredAt:new Date('2024-01-01')},{createdAt:new Date('2024-01-01')},{recordedByUserId:f.principals['patient-a'].userId},{sourceKind:'PATIENT_SELF_ENTRY'},{systolic:row.systolic}])await assert.rejects(client.bloodPressureMeasurement.update({where:{id:row.id},data}));
    await assert.rejects(client.bloodPressureMeasurement.deleteMany());await assert.rejects(client.$executeRawUnsafe('TRUNCATE public.blood_pressure_measurements'));
    assert.deepEqual(await bpSnapshot(f.pool),before);
  }finally{await client.$disconnect();}
}));
test('BP rejects missing patient/clinician profiles and missing principal without writes',()=>isolatedBp(async f=>{
  await f.pool.query('DELETE FROM clinician_profiles WHERE id=$1',[f.identities['clinician-unassigned'].profileId]);
  await rejects(f.write(f.principals['clinician-unassigned']),'BP_NOT_FOUND');
  await rejects(f.write(f.actor,{patientId:randomUUID()}),'BP_NOT_FOUND');
  await rejects(f.write(null),'BP_UNAUTHENTICATED');assert.deepEqual(await bpSnapshot(f.pool),{bp:[],audit:[]});
}));
test('BP timestamp constraints admit equality and reject sub-millisecond precision before JS conversion',()=>isolatedBp(async f=>{
  const def=(await f.pool.query("SELECT pg_get_expr(conbin,conrelid) expr FROM pg_constraint WHERE conrelid='public.blood_pressure_measurements'::regclass AND conname='blood_pressure_measurements_chronology_check'")).rows[0].expr;
  const result=(await f.pool.query(`SELECT ${def} AS valid FROM (SELECT TIMESTAMPTZ '2024-01-01 00:00:00+00' AS measured_at,TIMESTAMPTZ '2024-01-01 00:00:00+00' AS created_at) t`)).rows[0];assert.equal(result.valid,true);
  // Parameters are SQL text, avoiding Date's millisecond conversion before the DB check.
  await assert.rejects(f.pool.query("INSERT INTO blood_pressure_measurements(patient_id,systolic,diastolic,unit,measured_at,recorded_by_user_id,source_kind) VALUES($1,1,2,'mmHg',$2,$3,'CLINICIAN_ENTRY')",[f.patientId,'2024-01-01T00:00:00.123456Z',f.actor.userId]),e=>e.constraint==='blood_pressure_measurements_measured_at_check');
}));
test('BP submission succeeds with no clinical catalog rows and no CarePlan',async()=>{
  const {isolatedCatalog}=await import('../support/clinical-catalog.mjs');const {readFile}=await import('node:fs/promises');const {Buffer}=await import('node:buffer');const {randomBytes}=await import('node:crypto');
  const {createDemoPersistence,createAuthPersistence,createBloodPressureMeasurementPersistence}=await import('../../packages/db/dist/index.js');const {seedDemo}=await import('../../scripts/lib/m1-demo.mjs');
  await isolatedCatalog(async({pool,url})=>{
    for(const name of ['20261016000000_eh010_care_plan_lifecycle','20261017000000_eh011_bp_provenance'])await pool.query(await readFile(`packages/db/prisma/migrations/${name}/migration.sql`,'utf8'));
    const demo=createDemoPersistence(url),auth=createAuthPersistence(url),bp=createBloodPressureMeasurementPersistence(url);
    try{
      const seeded=await seedDemo(demo,Buffer.from(randomBytes(32).toString('base64url'))),a=seeded.state.identities.find(i=>i.key==='patient-a');
      const hash=(await pool.query('SELECT password_hash FROM users WHERE id=$1',[a.userId])).rows[0].password_hash;
      const principal=await auth.createSession({userId:a.userId,verifiedHash:hash,tokenHash:randomBytes(32).toString('hex'),previousHash:null});
      const row=await bp.createBloodPressureMeasurement(principal,{patientId:a.profileId,...bpInput});assert.equal(row.recordedByUserId,a.userId);
      for(const table of ['care_plans','guideline_sources','care_plan_templates','care_rule_definitions'])assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,0);
    }finally{await bp.close();await auth.close();await demo.close();}
  });
});
