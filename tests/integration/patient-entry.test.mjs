import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash,randomUUID } from 'node:crypto';
import { isolatedPatientEntry as use,entryAudits,profile } from '../support/patient-entry.mjs';
import { observeApplicabilityQueries,signal,waitBlockedBy } from '../support/observed-applicability.mjs';
import { verifyPassword } from '../../apps/api/dist/password.js';
const reject=(p,code='PATIENT_ENTRY_UNAUTHENTICATED')=>assert.rejects(p,e=>e.code===code);
const snapshot=async pool=>(await pool.query('SELECT id,email,password_hash,role,status FROM users ORDER BY id')).rows.map(({password_hash,...row})=>({...row,credentialFingerprint:createHash('sha256').update(password_hash).digest('hex')}));
const sessionSnapshot=async pool=>createHash('sha256').update(JSON.stringify((await pool.query('SELECT * FROM sessions ORDER BY id')).rows)).digest('hex');

test('I1S3 genuine HTTP registration atomicity, canonical identity, generic retry/duplicate and explicit login; no session side effects',()=>use(async f=>{
 const email=`Name.${randomUUID()}+Tag@Example.INVALID`,password=' untrimmed\u0000é ';
 const input={email:` \t${email}\r\n`,password,displayName:'Synthetic Registration'};
 const originalSessions=await sessionSnapshot(f.pool);
 const first=await f.register(input);assert.equal(first.response.status,202);assert.deepEqual(first.body,{data:{accepted:true}});
 assert.equal(first.response.headers.get('set-cookie'),null);assert.equal(first.response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await sessionSnapshot(f.pool),originalSessions);
 const rows=(await f.pool.query('SELECT u.*,p.id profile_id,p.display_name,p.date_of_birth,p.sex FROM users u JOIN patient_profiles p ON p.user_id=u.id WHERE email=$1',[email.toLowerCase()])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].role,'PATIENT');assert.equal(rows[0].status,'ACTIVE');assert.equal(rows[0].date_of_birth,null);assert.equal(rows[0].sex,null);assert.ok(await verifyPassword(Buffer.from(password),rows[0].password_hash));
 const audit=await entryAudits(f.pool);assert.equal(audit.length,1);assert.equal(audit[0].actor_user_id,null);assert.equal(audit[0].entity_id,rows[0].id);assert.deepEqual(audit[0].safe_metadata,{});
 const existing=await f.login(f.users.patient.email);assert.equal(existing.response.status,200);
 const before=await snapshot(f.pool),sessions=await sessionSnapshot(f.pool);
 for(const fields of [input,{...input,password:'different',displayName:'Overwritten?'}]) {
  const r=await f.register(fields,{Cookie:existing.cookie});assert.deepEqual(r.body,first.body);assert.equal(r.response.status,202);assert.equal(r.response.headers.get('set-cookie'),null);
 }
 for(const key of ['admin','clinician','lab','pharmacy'])assert.deepEqual((await f.register({...input,email:f.users[key].email})).body,first.body);
 await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[rows[0].id]);
 assert.deepEqual((await f.register(input)).body,first.body);
 const after=await snapshot(f.pool);assert.deepEqual(after,before.map(u=>u.id===rows[0].id?{...u,status:'DISABLED'}:u));
 assert.equal((await entryAudits(f.pool)).length,1);assert.equal((await f.pool.query('SELECT display_name FROM patient_profiles WHERE id=$1',[rows[0].profile_id])).rows[0].display_name,input.displayName);
 assert.deepEqual(await sessionSnapshot(f.pool),sessions);
 await f.pool.query("UPDATE users SET status='ACTIVE' WHERE id=$1",[rows[0].id]);
 const anonymous=await f.send('/auth/me');assert.equal(anonymous.response.status,401);
 const login=await f.login(email,password);assert.equal(login.response.status,200);assert.equal(login.body.data.user.role,'PATIENT');
 assert.equal((await f.login(email,password.trim())).response.status,401);
}));

test('I1S3 HTTP guards, strict bounds/shape/media, authority injection, malformed UTF8 and query/method controls precede hashing',()=>use(async f=>{
 let hashes=0;const hash=f.runtime.hash;f.runtime.hash=async p=>{hashes++;return hash(p);};
 const data={email:`${randomUUID()}@example.invalid`,password:'a',displayName:'A'};
 for(const [headers,status] of [[{Origin:'http://evil.invalid'},403],[{Origin:''},403],[{'X-EH-Register':''},403],[{'X-EH-Register':'wrong'},403],[{'Sec-Fetch-Site':'cross-site'},403],[{'Content-Type':'text/plain'},415],[{'Content-Encoding':'gzip'},415]])assert.equal((await f.register(data,headers)).response.status,status);
 for(const extra of ['role','status','owner','patientId','profileId','userId','organization','membership','auditActor','__proto__'])assert.equal((await f.register({...data,[extra]:'ADMIN'})).response.status,400);
 for(const body of ['null','[]','{','{"email":"a@b","email":"c@d","password":"a","displayName":"A"}',JSON.stringify({...data,password:''}),JSON.stringify({...data,password:'é'.repeat(513)}),JSON.stringify({...data,email:'a'.repeat(1025)+'@b'}),JSON.stringify({...data,displayName:'x'.repeat(161)})])assert.equal((await f.register(body)).response.status,400);
 assert.equal((await f.register(' '.repeat(16385))).response.status,413);
 const bad=await f.send('/auth/register',{method:'POST',headers:{Origin:f.config.origin,'X-EH-Register':'1','Content-Type':'application/json'},body:Buffer.from([123,34,255,34,58,49,125])});assert.equal(bad.response.status,400);
 assert.equal((await f.send('/auth/register?role=ADMIN',{method:'POST'})).response.status,400);
 assert.equal((await f.send('/auth/register',{method:'GET'})).response.status,405);
 assert.equal((await f.register(data,{'X-Extra':'x'.repeat(8192)})).response.status,400);
 assert.equal(hashes,0);assert.equal((await entryAudits(f.pool)).length,0);
 for(const password of ['x','a'.repeat(1024),'é'.repeat(512)]){
  const email=`${randomUUID()}@example.invalid`;
  const r=await f.register({...data,email,password});assert.equal(r.response.status,202);
  assert.equal((await f.login(email,password)).response.status,200);
 }
 const raw=JSON.stringify({...data,email:`${randomUUID()}@example.invalid`});
 assert.equal((await f.register(raw+' '.repeat(16384-Buffer.byteLength(raw)))).response.status,202);
}));

for(const source of ['profile','audit'])test(`I1S3 forced ${source} failure rolls back identity/profile/audit and returns sanitized failure`,()=>use(async f=>{
 const input={email:`${randomUUID()}@example.invalid`,password:f.password,displayName:'Synthetic'};
 const before=await snapshot(f.pool),count=await entryAudits(f.pool);
 const table=source==='profile'?'patient_profiles':'audit_logs';
 await f.pool.query(`CREATE FUNCTION public.i1s3_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private test failure'; END $$; CREATE TRIGGER i1s3_fault BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION public.i1s3_fault()`);
 const result=await f.register(input);assert.equal(result.response.status,503);assert.deepEqual(result.body,{error:{code:'PATIENT_ENTRY_UNAVAILABLE',message:'Service unavailable.'}});
 assert.equal(result.response.headers.get('set-cookie'),null);assert.deepEqual(await snapshot(f.pool),before);assert.deepEqual(await entryAudits(f.pool),count);
 await f.pool.query(`DROP TRIGGER i1s3_fault ON ${table}; DROP FUNCTION public.i1s3_fault()`);
 assert.equal((await f.register(input)).response.status,202);
}));

test('I1S3 infrastructure/hash failures remain sanitized; saturation and throttle have no audit/session side effects',()=>use(async f=>{
 const input={email:`${randomUUID()}@example.invalid`,password:f.password,displayName:'Synthetic'};
 const before=await snapshot(f.pool),count=await entryAudits(f.pool);const entered=signal(),release=signal();const hash=f.runtime.hash;
 f.runtime.hash=async p=>{entered.resolve();await release.promise;return hash(p);};
 const first=f.register(input);await entered.promise;const second=f.register({...input,email:`${randomUUID()}@example.invalid`});
 // The limiter's two permits are a synchronous state transition; coordinate both hash entries explicitly.
 let ready=signal();f.runtime.hash=async p=>{ready.resolve();await release.promise;return hash(p);};
 await ready.promise;
 const full=await f.register(input);assert.equal(full.response.status,429);assert.deepEqual(full.body,{error:{code:'REGISTRATION_BUSY',message:'Registration temporarily unavailable.'}});
 release.resolve();await Promise.all([first,second]);
 f.runtime.hash=async()=>{throw new Error('secret internal crypto failure');};
 assert.equal((await f.register({...input,email:`${randomUUID()}@example.invalid`})).response.status,503);
 f.runtime.hash=hash;const register=f.entry.register;f.entry.register=async()=>{throw new Error('private database outage');};
 const failed=await f.register(input);assert.equal(failed.response.status,503);assert.doesNotMatch(JSON.stringify(failed.body),/private|secret|database/);
 f.entry.register=register;
 for(let i=0;i<30;i++) {const r=await f.register(input);if(r.response.status===429)break;assert.equal(r.response.status,202);}
 assert.equal((await f.register(input)).response.status,429);
 assert.equal((await entryAudits(f.pool)).length,count.length+2);assert.equal((await snapshot(f.pool)).length,before.length+2);
}));

for(const rollback of [false,true])test(`I1S3 real canonical duplicate INSERT blocking, first winner ${rollback?'rollback':'commit'}`,()=>use(async f=>{
 const input={email:`${randomUUID()}@example.invalid`,passwordHash:f.hash,displayName:'Winner'};
 const entered=signal(),release=signal();let held=false,blocker;const events=[];
 const restore=observeApplicabilityQueries((q,next)=>{
  if(!held&&q.text?.includes('INSERT INTO public.users')&&q.values?.includes(input.email)){
   held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;if(rollback)throw new Error('forced winner rollback');return r;});
  }
  return next();
 });
 let first,second;
 try{
  first=f.entry.register(input);const firstResult=Promise.allSettled([first]);await entered.promise;
  second=f.entry.register({...input,email:` \t${input.email.toUpperCase()} `,displayName:'Loser'});const waiter=await waitBlockedBy(f.pool,blocker);assert.notEqual(waiter,blocker);
  release.resolve();const results=[...(await firstResult),...(await Promise.allSettled([second]))];events.push(...results.map(x=>x.status==='fulfilled'?'fulfilled':x.reason.code));
  assert.deepEqual(events,rollback?['PATIENT_ENTRY_UNAVAILABLE','fulfilled']:['fulfilled','fulfilled']);
  const rows=(await f.pool.query('SELECT u.id,p.display_name FROM users u JOIN patient_profiles p ON p.user_id=u.id WHERE u.email=$1',[input.email])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].display_name,rollback?'Loser':'Winner');
  const audit=await entryAudits(f.pool);assert.equal(audit.length,1);assert.equal(audit[0].entity_id,rows[0].id);assert.equal(audit[0].actor_user_id,null);
  console.log(JSON.stringify({scope:'I1S3_DUPLICATE',blocker,waiter,rollback,events,identities:1,profiles:1,audits:1}));
 }finally{release.resolve();restore();await Promise.allSettled([first,second].filter(Boolean));}
}));

test('I1S3 profile HTTP owns exact fields; current PATIENT only; CSRF, target injection and no-op audit',()=>use(async f=>{
 const p=await f.login(f.users.patient.email),headers={Cookie:p.cookie,Origin:f.config.origin,'X-CSRF-Token':p.csrf,'Content-Type':'application/json'};
 let r=await f.send('/me/profile',{headers:{Cookie:p.cookie}});assert.equal(r.response.status,200);assert.deepEqual(r.body,{data:{displayName:'Synthetic Slice 2',dateOfBirth:null,sex:null}});
 assert.equal(r.response.headers.get('cache-control'),'no-store');assert.equal(r.response.headers.get('etag'),null);
 assert.equal((await f.send('/me/profile',{headers:{Cookie:p.cookie,'If-None-Match':'*'}})).response.status,200);
 const before=await entryAudits(f.pool);
 r=await f.send('/me/profile',{method:'PUT',headers,body:JSON.stringify(profile)});assert.equal(r.response.status,200);assert.deepEqual(r.body,{data:profile});
 let audit=await entryAudits(f.pool);assert.equal(audit.length,before.length+1);assert.equal(audit.at(-1).actor_user_id,f.users.patient.id);assert.equal(audit.at(-1).entity_id,f.users.patient.profileId);assert.deepEqual(audit.at(-1).safe_metadata,{});
 const stored=(await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows;
 for(let i=0;i<2;i++)assert.equal((await f.send('/me/profile',{method:'PUT',headers,body:JSON.stringify(profile)})).response.status,200);
 assert.deepEqual((await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows,stored);assert.deepEqual(await entryAudits(f.pool),audit);
 for(const extra of ['userId','profileId','patientId','owner','role','status','email','password','assignmentId'])assert.equal((await f.send('/me/profile',{method:'PUT',headers,body:JSON.stringify({...profile,[extra]:f.users.admin.id})})).response.status,400);
 assert.equal((await f.send('/me/profile?patientId='+f.users.admin.id,{headers})).response.status,400);
 assert.equal((await f.send('/me/profile',{method:'PUT',headers:{...headers,'X-CSRF-Token':'wrong'},body:JSON.stringify(profile)})).response.status,403);
 assert.equal((await f.send('/me/profile',{method:'PUT',headers:{...headers,Origin:'http://evil.invalid'},body:JSON.stringify(profile)})).response.status,403);
 for(const key of ['admin','clinician','lab','pharmacy']){
  const a=await f.login(f.users[key].email);const h={...headers,Cookie:a.cookie,'X-CSRF-Token':a.csrf};
  for(const method of ['GET','HEAD','PUT'])assert.equal((await f.send('/me/profile',{method,headers:h,...(method==='PUT'?{body:JSON.stringify(profile)}:{})})).response.status,404);
 }
 const other=await f.identities.createUser({email:`${randomUUID()}@example.invalid`,role:'PATIENT',passwordHash:f.hash,profile:{displayName:'Other Synthetic'}});
 const b=await f.login(other.email);assert.equal((await f.send('/me/profile',{headers:{Cookie:b.cookie,'X-Patient-Id':f.users.patient.profileId,'X-User-Id':f.users.patient.id}})).body.data.displayName,'Other Synthetic');
 assert.equal((await f.send('/me/profile',{method:'HEAD',headers})).response.status,200);
 assert.equal((await f.send('/me/profile',{method:'DELETE',headers})).response.status,405);
 assert.deepEqual(await entryAudits(f.pool),audit);
}));

for(const mode of ['revoke','disable','expire'])test(`I1S3 current ${mode} denies profile read/update after previously successful access`,()=>use(async f=>{
 assert.ok(await f.entry.readOwnProfile(f.actors.patient));
 if(mode==='disable')await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.patient.id]);
 else if(mode==='revoke')await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.patient.sessionId]);
 else await f.pool.query("UPDATE sessions SET expires_at=created_at+interval '1 millisecond' WHERE id=$1",[f.actors.patient.sessionId]);
 await reject(f.entry.readOwnProfile(f.actors.patient));await reject(f.entry.replaceOwnProfile(f.actors.patient,profile));assert.equal((await entryAudits(f.pool)).length,0);
}));

test('I1S3 profile audit failure rolls back demographics and updated timestamp',()=>use(async f=>{
 const before=(await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows;
 await f.pool.query("CREATE FUNCTION i1s3_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='PATIENT_PROFILE_UPDATED' THEN RAISE EXCEPTION 'fault'; END IF; RETURN NEW; END $$; CREATE TRIGGER i1s3_fault BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION i1s3_fault()");
 await reject(f.entry.replaceOwnProfile(f.actors.patient,profile),'PATIENT_ENTRY_UNAVAILABLE');
 assert.deepEqual((await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows,before);assert.equal((await entryAudits(f.pool)).length,0);
}));

for(const resource of ['user','session'])for(const first of ['revocation','operation'])for(const operation of ['read','update'])test(`I1S3 real ${resource} ${first} first vs profile ${operation}`,()=>use(async f=>{
 const entered=signal(),release=signal();let held=false,blocker;let pending,revocation;
 const sql=resource==='user'?"UPDATE users SET status='DISABLED' WHERE id=$1":'UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1';
 const target=resource==='user'?f.users.patient.id:f.actors.patient.sessionId;
 const connection=await f.pool.connect();let restore=()=>{};
 try{
  if(first==='revocation'){
   await connection.query('BEGIN');blocker=(await connection.query('SELECT pg_backend_pid() pid')).rows[0].pid;await connection.query(sql,[target]);
  }else{
   restore=observeApplicabilityQueries((q,next)=>{
    const marker=resource==='user'?'public.users':'public.sessions';
    if(!held&&q.text?.includes(marker)&&q.text.includes(resource==='user'?'FOR NO KEY UPDATE':'FOR UPDATE')&&q.values?.includes(target)){
     held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;return r;});
    }return next();
   });
  }
  pending=operation==='read'?f.entry.readOwnProfile(f.actors.patient):f.entry.replaceOwnProfile(f.actors.patient,profile);
  const result=Promise.allSettled([pending]);
  if(first==='operation'){await entered.promise;revocation=connection.query(sql,[target]);}
  const waiter=await waitBlockedBy(f.pool,blocker);assert.notEqual(blocker,waiter);
  if(first==='revocation')await connection.query('COMMIT');else release.resolve();
  const [outcome]=await result;if(revocation)await revocation;
  assert.equal(outcome.status,first==='operation'?'fulfilled':'rejected');if(outcome.status==='rejected')assert.equal(outcome.reason.code,'PATIENT_ENTRY_UNAUTHENTICATED');
  await reject(f.entry.readOwnProfile(f.actors.patient));await reject(f.entry.replaceOwnProfile(f.actors.patient,profile));
  assert.equal((await entryAudits(f.pool)).length,first==='operation'&&operation==='update'?1:0);
  const finalProfile=(await f.pool.query('SELECT display_name AS "displayName",date_of_birth::text AS "dateOfBirth",sex FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows[0];
  assert.deepEqual(finalProfile,first==='operation'&&operation==='update'?profile:{displayName:'Synthetic Slice 2',dateOfBirth:null,sex:null});
  console.log(JSON.stringify({scope:'I1S3_REVOCATION',resource,first,operation,blocker,waiter,outcome:outcome.status,audits:(await entryAudits(f.pool)).length}));
 }finally{entered.resolve();release.resolve();restore();await connection.query('ROLLBACK');await Promise.allSettled([pending,revocation].filter(Boolean));connection.release();}
}));

test('I1S3 concurrent identical profile replacements serialize on real user lock and audit only one change',()=>use(async f=>{
 const entered=signal(),release=signal();let held=false,blocker;let one,two;
 const restore=observeApplicabilityQueries((q,next)=>{
  if(!held&&q.text?.includes('public.patient_profiles')&&q.text.includes('FOR UPDATE')){held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;return r;});}return next();
 });
 try{
  one=f.entry.replaceOwnProfile(f.actors.patient,profile);await entered.promise;
  two=f.entry.replaceOwnProfile(f.actors.patient,profile);const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();
  assert.deepEqual(await Promise.all([one,two]),[profile,profile]);assert.equal((await entryAudits(f.pool)).length,1);
  console.log(JSON.stringify({scope:'I1S3_PROFILE_RETRY',blocker,waiter,audits:1}));
 }finally{release.resolve();restore();await Promise.allSettled([one,two].filter(Boolean));}
}));

for(const operation of ['read','update'])test(`I1S3 final current-session expiry check rolls back pending ${operation}`,()=>use(async f=>{
 const entered=signal(),release=signal();let held=false,pending;const before=(await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows;
 const [{expires_at}]=(await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '5 seconds' WHERE id=$1 RETURNING expires_at",[f.actors.patient.sessionId])).rows;
 const restore=observeApplicabilityQueries((q,next)=>{
  if(!held&&q.text?.includes('public.patient_profiles')&&q.text.includes('FOR UPDATE')) {held=true;return Promise.resolve(next()).then(async r=>{entered.resolve();await release.promise;return r;});}return next();
 });
 try{
  pending=operation==='read'?f.entry.readOwnProfile(f.actors.patient):f.entry.replaceOwnProfile(f.actors.patient,profile);const result=Promise.allSettled([pending]);await entered.promise;
  // This is a clock-boundary proof, not a synthetic race: wait to the actual stored database expiry.
  await f.pool.query('SELECT pg_sleep(greatest(0,extract(epoch FROM ($1::timestamptz-clock_timestamp())))+0.01)',[expires_at]);
  release.resolve();const [outcome]=await result;assert.equal(outcome.status,'rejected');assert.equal(outcome.reason.code,'PATIENT_ENTRY_UNAUTHENTICATED');
  assert.deepEqual((await f.pool.query('SELECT * FROM patient_profiles WHERE user_id=$1',[f.users.patient.id])).rows,before);assert.equal((await entryAudits(f.pool)).length,0);
 }finally{release.resolve();restore();await Promise.allSettled([pending].filter(Boolean));}
}));

test('I1S3 actual PostgreSQL lock failure is sanitized and rolls back without audit or stale retry',()=>use(async f=>{
 const c=await f.pool.connect();
 try{
  await c.query('BEGIN');await c.query('SELECT id FROM patient_profiles WHERE user_id=$1 FOR UPDATE',[f.users.patient.id]);
  const result=f.entry.replaceOwnProfile(f.actors.patient,profile);const awaited=Promise.allSettled([result]);
  const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;const waiter=await waitBlockedBy(f.pool,pid);assert.notEqual(pid,waiter);
  const [outcome]=await awaited;assert.equal(outcome.status,'rejected');assert.equal(outcome.reason.code,'PATIENT_ENTRY_UNAVAILABLE');assert.equal((await entryAudits(f.pool)).length,0);
 }finally{await c.query('ROLLBACK');c.release();}
}));

for(const first of ['profile','M2'])test(`I1S3 real own profile and accepted M2 clinician BP lock compatibility, ${first} first`,()=>use(async f=>{
 const {createBloodPressureMeasurementPersistence}=await import('../../packages/db/dist/index.js');const bp=createBloodPressureMeasurementPersistence(f.url);
 await f.identities.assignPatient({clinicianId:f.users.clinician.profileId,patientId:f.users.patient.profileId});
 const entered=signal(),release=signal();let held=false,blocker,one,two;
 const profileWork=()=>f.entry.replaceOwnProfile(f.actors.patient,profile);
 const bpWork=()=>bp.createBloodPressureMeasurement(f.actors.clinician,{patientId:f.users.patient.profileId,systolic:120,diastolic:80,unit:'mmHg',measuredAt:'2026-01-01T00:00:00.000Z'});
 const restore=observeApplicabilityQueries((q,next)=>{
  if(!held&&q.text?.includes('public.patient_profiles')&&q.text.includes(first==='profile'?'FOR UPDATE':'FOR SHARE')) {held=true;return Promise.resolve(next()).then(async r=>{blocker=q.pid;entered.resolve();await release.promise;return r;});}return next();
 });
 try{
  one=first==='profile'?profileWork():bpWork();await entered.promise;two=first==='profile'?bpWork():profileWork();const waiter=await waitBlockedBy(f.pool,blocker);release.resolve();
  const results=await Promise.allSettled([one,two]);assert.ok(results.every(r=>r.status==='fulfilled'));
  assert.deepEqual(await f.entry.readOwnProfile(f.actors.patient),profile);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM blood_pressure_measurements WHERE patient_id=$1',[f.users.patient.profileId])).rows[0].n,1);
  assert.equal((await entryAudits(f.pool)).length,1);console.log(JSON.stringify({scope:'I1S3_M2_LOCK_COMPATIBILITY',first,blocker,waiter,outcomes:results.map(r=>r.status)}));
 }finally{release.resolve();restore();await Promise.allSettled([one,two].filter(Boolean));await bp.close();}
}));

test('I1S3 new registration with an unrelated authenticated cookie preserves the entire existing session',()=>use(async f=>{
 const login=await f.login(f.users.patient.email);const before=await sessionSnapshot(f.pool);
 const input={email:`${randomUUID()}@example.invalid`,password:f.password,displayName:'Unrelated new identity'};
 const created=await f.register(input,{Cookie:login.cookie});assert.equal(created.response.status,202);assert.equal(created.response.headers.get('set-cookie'),null);
 assert.deepEqual(await sessionSnapshot(f.pool),before);
 assert.equal((await f.send('/auth/me',{headers:{Cookie:login.cookie}})).body.data.user.id,f.users.patient.id);
 const user=(await f.pool.query('SELECT * FROM users WHERE email=$1',[input.email])).rows[0];
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM sessions WHERE user_id=$1',[user.id])).rows[0].n,0);
 assert.equal((await entryAudits(f.pool)).length,1);
}));

test('I1S3 genuine unavailable PostgreSQL registration is a sanitized failure rather than false acknowledgement',()=>use(async f=>{
 const {createPatientEntryPersistence}=await import('../../packages/db/dist/index.js');
 const {createServer}=await import('node:net');
 // Reserve a local port with a non-PostgreSQL peer that closes handshakes: real adapter/network failure.
 const server=createServer(socket=>socket.destroy());await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=new URL(f.url);url.hostname='127.0.0.1';url.port=String(server.address().port);
 const unavailable=createPatientEntryPersistence(url.toString()),original=f.runtime.store;f.runtime.store=unavailable;
 try{
  const result=await f.register({email:`${randomUUID()}@example.invalid`,password:f.password,displayName:'Synthetic failure'});
  assert.equal(result.response.status,503);assert.deepEqual(result.body,{error:{code:'PATIENT_ENTRY_UNAVAILABLE',message:'Service unavailable.'}});
  assert.equal((await entryAudits(f.pool)).length,0);assert.equal(result.response.headers.get('set-cookie'),null);
 }finally{f.runtime.store=original;await unavailable.close();await new Promise(resolve=>server.close(resolve));}
}));

test('I1S3 own read preserves legacy free profile context outside new-write bounds without backfill or truncation',()=>use(async f=>{
 const displayName='x'.repeat(200),sex='context'.repeat(30);
 await f.pool.query("UPDATE patient_profiles SET display_name=$1,sex=$2,date_of_birth=DATE '10000-01-01' WHERE user_id=$3",[displayName,sex,f.users.patient.id]);
 assert.deepEqual(await f.entry.readOwnProfile(f.actors.patient),{displayName,sex,dateOfBirth:'10000-01-01'});
 assert.equal((await entryAudits(f.pool)).length,0);
 await reject(f.entry.replaceOwnProfile(f.actors.patient,{displayName,sex,dateOfBirth:'10000-01-01'}),'PATIENT_ENTRY_INVALID');
 for(const dateOfBirth of ['0001-01-01','9999-12-31']){
  const next={...profile,dateOfBirth};assert.deepEqual(await f.entry.replaceOwnProfile(f.actors.patient,next),next);assert.deepEqual(await f.entry.readOwnProfile(f.actors.patient),next);
 }
}));
