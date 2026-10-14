import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { Pool } from '../support/database.mjs';
import { createDemoPersistence, DEMO_FIXTURES, createAuthPersistence, createAuthorizationPersistence, createDatabase } from '../../packages/db/dist/index.js';
import { hashPassword, parsePasswordHash, verifyPassword, createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';
import { passwordCheck } from '../../scripts/lib/m1-demo.mjs';
import { verifyCommand } from '../../scripts/lib/m1-verify.mjs';

const password=Buffer.from(randomBytes(32).toString('base64url'));
const hashes={};for(const f of DEMO_FIXTURES) hashes[f.key]=await hashPassword(password);
const input={newPasswordHashes:hashes,acceptsExistingHash:passwordCheck(password)};
const migrationNames=['20261012200810_eh005_identity_core_foundation','20261013014000_eh006_auth_sessions','20261013235221_eh009_clinical_definition_foundation'];
async function isolated(run) {
  const admin=new Pool({connectionString:process.env.DATABASE_URL});
  const name=`eh008_${randomUUID().replaceAll('-','')}`;const url=new URL(process.env.DATABASE_URL);url.pathname=`/${name}`;
  let pool,store;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    pool=new Pool({connectionString:url.toString()});
    // Actual unchanged migration SQL; isolated test catalog mirrors Prisma's ledger.
    await pool.query('CREATE TABLE _prisma_migrations(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz, migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0)');
    for(const migration of migrationNames) {
      const sql=await readFile(`packages/db/prisma/migrations/${migration}/migration.sql`,'utf8');await pool.query(sql);
      await pool.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES ($1,$2,now(),$3,1)',[randomUUID(),createHash('sha256').update(sql).digest('hex'),migration]);
    }
    store=createDemoPersistence(url.toString());
    const env={...process.env,NODE_ENV:'test',EH_DEMO_SEED_ENABLED:'1',EH_DEMO_PASSWORD:password.toString('utf8'),DATABASE_URL:url.toString(),AUTH_BROWSER_ORIGIN:'http://localhost:3000'};
    await run({pool,store,env});
  } finally {if(store)await store.close();if(pool)await pool.end();await admin.query(`DROP DATABASE IF EXISTS ${name}`);await admin.end();}
}
const snapshot=async pool=>Object.fromEntries(await Promise.all(['users','patient_profiles','clinician_profiles','clinician_patient_assignments','sessions','audit_logs'].map(async table=>[table,(await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows])));
const fixture=state=>Object.fromEntries(state.identities.map(f=>[f.key,f]));
const rejectConflict=async promise=>assert.rejects(promise,error=>{assert.equal(error.code,'DEMO_STATE_CONFLICT');return true;});
async function rawUser(pool,key,overrides={}) {
  const f=DEMO_FIXTURES.find(f=>f.key===key);
  return (await pool.query('INSERT INTO users(email,password_hash,role,status) VALUES ($1,$2,$3,$4) RETURNING id',[f.email,overrides.hash??hashes[key],overrides.role??f.role,overrides.status??'ACTIVE'])).rows[0].id;
}
async function cli(script,env) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});child.on('error',reject);child.on('exit',code=>resolve({code,output}));
  });
}
async function api(env,run,wrap=store=>store) {
  const db=createDatabase(env.DATABASE_URL),auth=createAuthPersistence(env.DATABASE_URL),authorization=createAuthorizationPersistence(env.DATABASE_URL);
  const app=await createApp(db,{store:wrap(auth),config:authConfiguration(env),passwords:await createPasswordVerifier()},authorization);
  try {await app.listen(0,'127.0.0.1');await run({...env,M1_API_BASE_URL:await app.getUrl()});}
  finally {await app.close();await db.close();await auth.close();await authorization.close();}
}

test('first and repeat seed preserve exact rows/hash/timestamps, unique profiles/relationship and no audit/session noise',()=>isolated(async({pool,store})=>{
  const first=await store.seedIdentities(input);assert.deepEqual(first.created,{users:5,profiles:4,assignments:1});
  assert.deepEqual(Object.keys(store).sort(),['close','inspectIdentities','seedIdentities']);
  const before=await snapshot(pool);assert.equal(before.audit_logs.length,0);assert.equal(before.sessions.length,0);
  assert.equal(before.users.length,5);assert.equal(before.patient_profiles.length,2);assert.equal(before.clinician_profiles.length,2);assert.equal(before.clinician_patient_assignments.length,1);
  for(const u of before.users) {assert.ok(parsePasswordHash(u.password_hash));assert.equal(await verifyPassword(password,u.password_hash),true);}
  assert.equal(new Set(before.users.map(u=>u.password_hash)).size,5);
  assert.equal(JSON.stringify(first).includes('passwordHash'),false);for(const h of Object.values(hashes))assert.ok(!JSON.stringify(first).includes(h));
  const second=await store.seedIdentities(input);assert.deepEqual(second.created,{users:0,profiles:0,assignments:0});assert.deepEqual(second.state,first.state);assert.deepEqual(await snapshot(pool),before);
}));
test('concurrent seed serializes without duplicates',()=>isolated(async({pool,store,env})=>{
  const other=createDemoPersistence(env.DATABASE_URL);try{const results=await Promise.all([store.seedIdentities(input),other.seedIdentities(input)]);assert.deepEqual(results.map(r=>r.created.users).sort(),[0,5]);assert.deepEqual(results[0].state,results[1].state);assert.equal((await snapshot(pool)).users.length,5);}finally{await other.close();}
}));
test('partial compatible users and missing profiles recover without rewriting existing identities',()=>isolated(async({pool,store})=>{
  const a=await rawUser(pool,'patient-a'),admin=await rawUser(pool,'admin');const before=(await pool.query('SELECT * FROM users ORDER BY id')).rows;
  const result=await store.seedIdentities(input);assert.deepEqual(result.created,{users:3,profiles:4,assignments:1});assert.equal(fixture(result.state)['patient-a'].userId,a);assert.equal(fixture(result.state).admin.userId,admin);
  assert.deepEqual((await pool.query('SELECT * FROM users WHERE id=ANY($1::uuid[]) ORDER BY id',[[a,admin]])).rows,before);
}));
for(const [label,overrides] of [['wrong role',{role:'ADMIN'}],['disabled',{status:'DISABLED'}],['wrong password',{hash:await hashPassword(Buffer.from(randomBytes(32).toString('base64url')))}],['unsupported hash',{hash:'unsupported-synthetic-encoding'}]]) test(`${label} conflict fails without creating partial state`,()=>isolated(async({pool,store})=>{
  await rawUser(pool,'patient-a',overrides);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));
for(const [field,value] of [['display_name','Unexpected Synthetic Label'],['sex','unexpected'],['date_of_birth','2000-01-01']]) test(`patient profile ${field} mismatch is conflict`,()=>isolated(async({pool,store})=>{
  const state=fixture((await store.seedIdentities(input)).state);await pool.query(`UPDATE patient_profiles SET ${field}=$1 WHERE id=$2`,[value,state['patient-a'].profileId]);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));
for(const [field,value] of [['display_name','Unexpected Synthetic Clinician'],['specialty','unexpected'],['professional_identifier','synthetic-unexpected']]) test(`clinician profile ${field} mismatch is conflict`,()=>isolated(async({pool,store})=>{
  const state=fixture((await store.seedIdentities(input)).state);await pool.query(`UPDATE clinician_profiles SET ${field}=$1 WHERE id=$2`,[value,state['clinician-assigned'].profileId]);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));
test('ENDED-only relationship never regrants; ACTIVE plus history is preserved',()=>isolated(async({pool,store})=>{
  const seeded=await store.seedIdentities(input),f=fixture(seeded.state);await pool.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1",[seeded.state.assignmentId]);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
  await pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES ($1,$2)',[f['clinician-assigned'].profileId,f['patient-a'].profileId]);const restored=await snapshot(pool);assert.deepEqual((await store.seedIdentities(input)).created,{users:0,profiles:0,assignments:0});assert.deepEqual(await snapshot(pool),restored);
}));
test('unexpected ACTIVE relationship touching demo profile is conflict; unrelated rows remain unchanged',()=>isolated(async({pool,store})=>{
  const seeded=await store.seedIdentities(input),f=fixture(seeded.state);
  await pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES ($1,$2)',[f['clinician-unassigned'].profileId,f['patient-b'].profileId]);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));
test('unrelated identities, ENDED history, sessions and audit rows are preserved',()=>isolated(async({pool,store})=>{
  const u=(await pool.query("INSERT INTO users(email,password_hash,role) VALUES ($1,$2,'ADMIN') RETURNING id",[`${randomUUID()}@example.invalid`,hashes.admin])).rows[0];
  await pool.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')",[u.id,randomBytes(32).toString('hex')]);await pool.query("INSERT INTO audit_logs(actor_user_id,action_type,entity_type,entity_id) VALUES ($1,'TEST_APPEND','user',$1)",[u.id]);
  const pu=(await pool.query("INSERT INTO users(email,password_hash,role) VALUES ($1,$2,'PATIENT') RETURNING id",[`${randomUUID()}@example.invalid`,hashes['patient-a']])).rows[0];
  const cu=(await pool.query("INSERT INTO users(email,password_hash,role) VALUES ($1,$2,'CLINICIAN') RETURNING id",[`${randomUUID()}@example.invalid`,hashes['clinician-assigned']])).rows[0];
  const p=(await pool.query("INSERT INTO patient_profiles(user_id,display_name) VALUES ($1,'Synthetic unrelated patient') RETURNING id",[pu.id])).rows[0];
  const c=(await pool.query("INSERT INTO clinician_profiles(user_id,display_name) VALUES ($1,'Synthetic unrelated clinician') RETURNING id",[cu.id])).rows[0];
  await pool.query("INSERT INTO clinician_patient_assignments(clinician_id,patient_id,status,ended_at) VALUES ($1,$2,'ENDED',now())",[c.id,p.id]);
  const before=await snapshot(pool);await store.seedIdentities(input);const after=await snapshot(pool);
  for(const table of ['users','patient_profiles','clinician_profiles','clinician_patient_assignments','sessions','audit_logs']) {
    const retained=new Set(before[table].map(row=>row.id));assert.deepEqual(after[table].filter(row=>retained.has(row.id)),before[table]);
  }
}));
test('late insert failure rolls back all earlier identities/profiles',()=>isolated(async({pool,store})=>{
  await pool.query("CREATE FUNCTION fail_demo_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic late failure'; END $$; CREATE TRIGGER test_late_failure BEFORE INSERT ON clinician_patient_assignments FOR EACH ROW EXECUTE FUNCTION fail_demo_assignment()");const before=await snapshot(pool);await assert.rejects(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));
test('future valid migration accepted; missing/checksum/failed/incomplete M1 ledger rejects without repair',()=>isolated(async({pool,store})=>{
  await store.seedIdentities(input);await pool.query("INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name) VALUES ($1,$2,now(),'future_valid_test')",[randomUUID(),'a'.repeat(64)]);await store.inspectIdentities({acceptsExistingHash:input.acceptsExistingHash});
  for(const mode of ['checksum','unfinished','rolledback','missing']) {
    const conn=await pool.connect(); // independent committed ledger state for actual helper read.
    const rows=(await conn.query('SELECT * FROM _prisma_migrations WHERE migration_name=$1',[migrationNames[0]])).rows;
    try {
      if(mode==='checksum')await conn.query('UPDATE _prisma_migrations SET checksum=$1 WHERE migration_name=$2',['b'.repeat(64),migrationNames[0]]);
      if(mode==='unfinished')await conn.query('UPDATE _prisma_migrations SET finished_at=NULL WHERE migration_name=$1',[migrationNames[0]]);
      if(mode==='rolledback')await conn.query('UPDATE _prisma_migrations SET rolled_back_at=now() WHERE migration_name=$1',[migrationNames[0]]);
      if(mode==='missing')await conn.query('DELETE FROM _prisma_migrations WHERE migration_name=$1',[migrationNames[0]]);
      await assert.rejects(store.inspectIdentities({acceptsExistingHash:input.acceptsExistingHash}),e=>e.code==='DEMO_MIGRATIONS_INVALID');
    } finally {
      await conn.query('DELETE FROM _prisma_migrations WHERE migration_name=$1',[migrationNames[0]]);const r=rows[0];await conn.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name) VALUES ($1,$2,$3,$4)',[r.id,r.checksum,r.finished_at,r.migration_name]);conn.release();
    }
  }
}));
test('strict verifier preflight never repairs absent/conflicting fixtures or wrong password',()=>isolated(async({pool,store,env})=>{
  const before=await snapshot(pool);await rejectConflict(verifyCommand(env));assert.deepEqual(await snapshot(pool),before);
  await store.seedIdentities(input);const seeded=await snapshot(pool);await rejectConflict(verifyCommand({...env,EH_DEMO_PASSWORD:randomBytes(32).toString('base64url')}));assert.deepEqual(await snapshot(pool),seeded);
}));
test('actual Nest HTTP M1 verification authenticates all roles, isolates objects, logs out and repeats without drift',()=>isolated(async({pool,store,env})=>{
  await store.seedIdentities(input);const before=await snapshot(pool);
  await api(env,async runtime=>{const result=await verifyCommand(runtime);assert.equal(result.result,'PASS');assert.deepEqual(result.repeatCreated,{users:0,profiles:0,assignments:0});assert.equal((await verifyCommand(runtime)).result,'PASS');const command=await cli('scripts/verify-m1.mjs',runtime);assert.equal(command.code,0);assert.equal(JSON.parse(command.output).result,'PASS');for(const secret of [password.toString(),...Object.values(hashes)])assert.ok(!command.output.includes(secret));});
  const after=await snapshot(pool);for(const table of ['users','patient_profiles','clinician_profiles','clinician_patient_assignments'])assert.deepEqual(after[table],before[table]);assert.equal(after.sessions.length,15);assert.ok(after.sessions.every(s=>s.revoked_at));assert.equal(after.audit_logs.length,30);assert.ok(after.audit_logs.every(a=>['AUTH_LOGIN','AUTH_SESSION_REVOKED'].includes(a.action_type)&&Object.keys(a.safe_metadata).length===0));
}));
test('CLI outputs sanitize database/native failures and production guard rejects before writes',()=>isolated(async({pool,env})=>{
  const before=await snapshot(pool);
  for(const overrides of [{NODE_ENV:'production'},{DATABASE_URL:'postgresql://secret:secret@localhost:1/demo'},{EH_DEMO_PASSWORD:'short'}]) {
    const response=await cli('scripts/demo-seed.mjs',{...env,...overrides});assert.equal(response.code,1);for(const value of ['secret',password.toString(),...Object.values(hashes)])assert.ok(!response.output.includes(value));assert.ok(!response.output.includes('Error:'));
  }
  assert.deepEqual(await snapshot(pool),before);
}));
test('verifier HTTP failure sanitizes errors; cleanup failure is fatal',()=>isolated(async({store,env})=>{
  await store.seedIdentities(input);
  await assert.rejects(verifyCommand({...env,M1_API_BASE_URL:'http://127.0.0.1:1'}),/M1_HTTP_FAILED/);
  const identity=fixture(await store.inspectIdentities({acceptsExistingHash:input.acceptsExistingHash}))['patient-a'];let logoutAttempts=0;
  const server=createServer((req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
    if(req.url.endsWith('/health'))return res.end(JSON.stringify({data:{status:'ok'}}));
    if(req.url.endsWith('/login')) {res.setHeader('Set-Cookie',`eh_session=${randomBytes(32).toString('base64url')}`);return res.end(JSON.stringify({data:{user:{id:identity.userId,email:identity.email,role:identity.role},session:{expiresAt:new Date(Date.now()+10000).toISOString()},csrfToken:randomBytes(32).toString('base64url')}}));}
    if(req.url.endsWith('/logout'))logoutAttempts++;
    res.statusCode=503;res.end('{}');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {await assert.rejects(verifyCommand({...env,M1_API_BASE_URL:`http://127.0.0.1:${server.address().port}`}),/M1_CLEANUP_FAILED/);assert.equal(logoutAttempts,1);}finally{await new Promise(resolve=>server.close(resolve));}
}));

test('all compatible users/profiles with missing relationship create only the ACTIVE edge',()=>isolated(async({pool,store})=>{
  for(const f of DEMO_FIXTURES) {
    const id=await rawUser(pool,f.key);
    if(f.role==='PATIENT')await pool.query('INSERT INTO patient_profiles(user_id,display_name) VALUES ($1,$2)',[id,f.label]);
    if(f.role==='CLINICIAN')await pool.query('INSERT INTO clinician_profiles(user_id,display_name) VALUES ($1,$2)',[id,f.label]);
  }
  const before=await snapshot(pool);const result=await store.seedIdentities(input);assert.deepEqual(result.created,{users:0,profiles:0,assignments:1});const after=await snapshot(pool);for(const table of ['users','patient_profiles','clinician_profiles'])assert.deepEqual(after[table],before[table]);
}));
test('late candidate hash conflict rolls back identities already inserted',()=>isolated(async({pool,store})=>{
  const before=await snapshot(pool);await rejectConflict(store.seedIdentities({...input,newPasswordHashes:{...hashes,admin:'unsupported'}}));assert.deepEqual(await snapshot(pool),before);
}));
test('ACTIVE unrelated clinician to demo patient is conflict, including cross-boundary endpoints',()=>isolated(async({pool,store})=>{
  const f=fixture((await store.seedIdentities(input)).state);
  const u=(await pool.query("INSERT INTO users(email,password_hash,role) VALUES ($1,$2,'CLINICIAN') RETURNING id",[`${randomUUID()}@example.invalid`,hashes['clinician-assigned']])).rows[0];
  const c=(await pool.query("INSERT INTO clinician_profiles(user_id,display_name) VALUES ($1,'Synthetic unrelated clinician') RETURNING id",[u.id])).rows[0];
  await pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES ($1,$2)',[c.id,f['patient-b'].profileId]);const before=await snapshot(pool);await rejectConflict(store.seedIdentities(input));assert.deepEqual(await snapshot(pool),before);
}));

test('baseline migrate deploy/status twice preserves seeded rows and applied history',()=>isolated(async({pool,store,env})=>{
  await store.seedIdentities(input);const before=await snapshot(pool);const ledger=(await pool.query('SELECT * FROM _prisma_migrations ORDER BY id')).rows;
  for(const command of ['deploy','status','deploy','status']) {
    await new Promise((resolve,reject)=>{
      const child=spawn('pnpm',['--filter','@egyhealth/db','exec','prisma','migrate',command],{env,stdio:'ignore'});
      child.on('error',()=>reject(new Error('Migration child failed')));child.on('close',code=>code===0?resolve():reject(new Error('Migration regression failed')));
    });
  }
  assert.deepEqual(await snapshot(pool),before);assert.deepEqual((await pool.query('SELECT * FROM _prisma_migrations ORDER BY id')).rows,ledger);
}));

test('repeat-only seed rejects incomplete state atomically instead of repairing it',()=>isolated(async({pool,store})=>{
  await rawUser(pool,'patient-a');const before=await snapshot(pool);
  await rejectConflict(store.seedIdentities({...input,requireExisting:true}));assert.deepEqual(await snapshot(pool),before);
  await store.seedIdentities(input);assert.deepEqual((await store.seedIdentities({...input,requireExisting:true})).created,{users:0,profiles:0,assignments:0});
}));
test('verifier detects missing-profile drift after HTTP and does not repair it',()=>isolated(async({pool,store,env})=>{
  const f=fixture((await store.seedIdentities(input)).state);let revocations=0;
  await api(env,async runtime=>{
    await rejectConflict(verifyCommand(runtime));
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM patient_profiles WHERE user_id=$1',[f['patient-b'].userId])).rows[0].n,0);
  },auth=>({...auth,revoke:async hash=>{
    const result=await auth.revoke(hash);revocations++;
    if(revocations===5)await pool.query('DELETE FROM patient_profiles WHERE user_id=$1',[f['patient-b'].userId]);
    return result;
  }}));
}));
