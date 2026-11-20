import test from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Pool } from '../support/database.mjs';
import { createPersistence, createDatabase, createAuthPersistence, createAuthorizationPersistence } from '../../packages/db/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';
import { hashPassword, createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';

const password = randomBytes(32).toString('base64url');
const encoded = await hashPassword(Buffer.from(password));
const passwords = await createPasswordVerifier();
const notFound = { error: { code: 'PATIENT_NOT_FOUND', message: 'Not found.' } };
const unauthenticated = { error: { code: 'AUTH_UNAUTHENTICATED', message: 'Authentication required.' } };

async function withApi(run, wrap = store => store) {
  const persistence = createPersistence(process.env.DATABASE_URL);
  const db = createDatabase(process.env.DATABASE_URL);
  const auth = createAuthPersistence(process.env.DATABASE_URL);
  const authorization = createAuthorizationPersistence(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const config = authConfiguration({ NODE_ENV: 'test', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
  const app = await createApp(db, { store: auth, passwords, config }, wrap(authorization, pool));
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    // Raw HTTP preserves GET bodies and path spellings that fetch may normalize.
    const request = (path, { cookie, method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
      const bytes = body === undefined ? undefined : Buffer.from(body);
      const req = httpRequest(base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(bytes ? { 'Content-Type': 'application/json', 'Content-Length': bytes.length } : {}), ...headers } }, res => {
        let text = '';
        res.on('data', chunk => { text += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, json: text ? JSON.parse(text) : undefined }));
      });
      req.on('error', reject); req.end(bytes);
    });
    const fixture = async (role, profileless = false) => {
      const email = `${randomUUID()}@example.invalid`;
      if (profileless) return (await pool.query('INSERT INTO users(email,password_hash,role) VALUES ($1,$2,$3) RETURNING id,email,role', [email, encoded, role])).rows[0];
      return persistence.createUser({ role, email, passwordHash: encoded, ...(role === 'ADMIN' ? {} : { profile: { displayName: `Protected-${randomUUID()}` } }) });
    };
    const login = async identity => {
      const response = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: identity.email, password }), headers: { Origin: config.origin, 'X-EH-Login': '1' } });
      assert.equal(response.status, 200);
      return { cookie: response.headers['set-cookie'][0].split(';')[0], csrf: response.json.data.csrfToken };
    };
    const path = id => `/api/v1/patients/${id}/profile`;
    const deny = async (id, cookie, options = {}) => {
      const response = await request(path(id), { cookie, ...options });
      assert.equal(response.status, 404); assert.deepEqual(response.json, notFound);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['set-cookie'], undefined);
      return response;
    };
    await run({ persistence, authorization, auth, pool, request, fixture, login, path, deny, config });
  } finally { await app.close(); await persistence.close(); await authorization.close(); await auth.close(); await db.close(); await pool.end(); }
}

test('real HTTP patient/clinician/admin IDOR, profiles, projection, aliases and uniform nonexistent denial', () => withApi(async ({ fixture, login, persistence, pool, request, path, deny }) => {
  const [a,b,c,ca,cb,admin,missingP,missingC] = await Promise.all(['PATIENT','PATIENT','PATIENT','CLINICIAN','CLINICIAN','ADMIN','PATIENT','CLINICIAN'].map((role,i) => fixture(role,i>=6)));
  const [sa,sb,sc,sadmin,smp,smc] = await Promise.all([a,b,ca,admin,missingP,missingC].map(login));
  await persistence.assignPatient({ clinicianId: ca.profileId, patientId: a.profileId });
  const ended = await persistence.assignPatient({ clinicianId: ca.profileId, patientId: b.profileId });
  await persistence.endAssignment(ended.id);
  await persistence.assignPatient({ clinicianId: cb.profileId, patientId: b.profileId });
  for (const [target,session] of [[a,sa],[b,sb],[a,sc],[b,await login(cb)]]) {
    const response = await request(path(target.profileId), { cookie: session.cookie });
    assert.equal(response.status,200);
    const name = (await pool.query('SELECT display_name FROM patient_profiles WHERE id=$1',[target.profileId])).rows[0].display_name;
    assert.deepEqual(response.json,{data:{id:target.profileId,displayName:name}});
    assert.equal(response.headers['cache-control'],'no-store');
    assert.equal(response.headers['set-cookie'],undefined);
  }
  for (const [id,cookie] of [[b.profileId,sa.cookie],[a.profileId,sb.cookie],[a.id,sa.cookie],[b.profileId,sc.cookie],[c.profileId,sc.cookie],[a.profileId,sadmin.cookie],[a.profileId,smp.cookie],[a.profileId,smc.cookie]]) await deny(id,cookie);
  for (const cookie of [sa.cookie,sc.cookie,sadmin.cookie,smp.cookie,smc.cookie]) {
    await deny(randomUUID(),cookie);
    for (const id of ['bad',a.profileId.replaceAll('-',''),`{${a.profileId}}`,`urn:uuid:${a.profileId}`,a.profileId.replace('-4','-1'),`%20${a.profileId}`,`%${a.profileId.slice(0,2)}${a.profileId.slice(2)}`,`%2520${a.profileId}`,`%${a.profileId.charCodeAt(0).toString(16)}${a.profileId.slice(1)}`,'%', '%ZZ', '%E0%A4%A', '%FF']) await deny(id,cookie);
  }
  assert.equal((await request(path(a.profileId.toUpperCase()),{cookie:sa.cookie})).status,200);
  const spoof = { 'X-User-Id': b.id, 'X-Actor-Id': b.id, 'X-Role':'ADMIN', 'X-Owner-Id': b.profileId, 'X-Clinician-Id': cb.profileId };
  await deny(b.profileId,sa.cookie,{headers:spoof});
  await deny(b.profileId,sc.cookie,{headers:spoof});
  assert.equal((await request(path(a.profileId),{cookie:sa.cookie,headers:spoof})).status,200);
  for (const query of ['patientId','userId','ownerId','role','clinicianId','actorId']) {
    const response = await request(path(a.profileId)+`?${query}=${b.profileId}&${query}=${a.profileId}`,{cookie:sa.cookie});
    assert.equal(response.status,400); assert.deepEqual(response.json,{error:{code:'REQUEST_INVALID',message:'Invalid request.'}});
  }
  for (const body of ['{}',JSON.stringify({patientId:b.profileId,role:'CLINICIAN',clinicianId:cb.profileId})]) assert.equal((await request(path(a.profileId),{cookie:sa.cookie,body})).status,400);
  const contract = JSON.parse(await readFile('docs/openapi.json','utf8')).paths['/api/v1/patients/{patientId}/profile'].get;
  assert.deepEqual(contract.responses['404'].content['application/json'].schema.const,notFound);
}));

test('path/method/HEAD variants retain authorization and no protected content', () => withApi(async ({ fixture, login, request, path }) => {
  const a = await fixture('PATIENT'), b = await fixture('PATIENT');
  const sa = await login(a);
  for (const id of [a.profileId,b.profileId]) {
    for (const variant of [path(id),path(id)+'/',path(id).replace('/patients/','/PATIENTS/').replace('/profile','/PROFILE')]) {
      for (const method of ['GET','HEAD']) {
        const response = await request(variant,{cookie:sa.cookie,method});
        assert.equal(response.status,id===a.profileId?200:404);
        assert.equal(response.headers['cache-control'],'no-store');
        if(method==='HEAD') assert.equal(response.text,'');
        else if(id===b.profileId) assert.deepEqual(response.json,notFound);
      }
    }
  }
  for (const variant of [path(b.profileId).replace('/patients/','/patients//'),path(b.profileId)+'/extra',path(b.profileId).replace(b.profileId,b.profileId+'%2Fextra'),path(b.profileId).replace(b.profileId,b.profileId+'%252Fextra')]) {
    const response = await request(variant,{cookie:sa.cookie}); assert.equal(response.status,404); assert.ok(!response.text.includes('Protected-'));
  }
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']) {
    const response=await request(path(b.profileId),{cookie:sa.cookie,method});
    assert.ok(!response.text.includes('Protected-')); assert.notEqual(response.status,200);
  }
}));

test('assignment ending, reassignment and repeated reads never use stale cache or add audits/renew sessions', () => withApi(async ({fixture,login,persistence,pool,request,path,deny}) => {
  const p=await fixture('PATIENT'), c=await fixture('CLINICIAN'); const s=await login(c);
  const assignment=await persistence.assignPatient({clinicianId:c.profileId,patientId:p.profileId});
  const sessionsBefore=(await pool.query('SELECT * FROM sessions WHERE user_id=$1',[c.id])).rows;
  const auditsBefore=(await pool.query('SELECT * FROM audit_logs WHERE actor_user_id=$1',[c.id])).rows;
  assert.equal((await request(path(p.profileId),{cookie:s.cookie})).status,200);
  await persistence.endAssignment(assignment.id);
  for(let i=0;i<3;i++) await deny(p.profileId,s.cookie);
  const next=await persistence.assignPatient({clinicianId:c.profileId,patientId:p.profileId}); assert.notEqual(next.id,assignment.id);
  assert.equal((await request(path(p.profileId),{cookie:s.cookie})).status,200);
  await persistence.endAssignment(next.id); await deny(p.profileId,s.cookie);
  assert.deepEqual((await pool.query('SELECT * FROM sessions WHERE user_id=$1',[c.id])).rows,sessionsBefore);
  assert.deepEqual((await pool.query('SELECT * FROM audit_logs WHERE actor_user_id=$1',[c.id])).rows,auditsBefore);
}));

test('missing/invalid/duplicate/expired/revoked/disabled sessions uniformly fail through actual guard', () => withApi(async ({fixture,login,pool,request,path}) => {
  const target=await fixture('PATIENT');
  const cookies=[undefined,'eh_session=invalid',`eh_session=${randomBytes(32).toString('base64url')}`];
  for(const mode of ['expired','revoked','disabled','duplicate']) {
    const p=await fixture('PATIENT'),s=await login(p);
    if(mode==='expired') await pool.query("UPDATE sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' WHERE user_id=$1",[p.id]);
    if(mode==='revoked') await pool.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[p.id]);
    if(mode==='disabled') await pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[p.id]);
    cookies.push(mode==='duplicate'?`${s.cookie}; ${s.cookie}`:s.cookie);
  }
  for(const cookie of cookies) for(const id of [target.profileId,'bad','%ZZ','%E0%A4%A','%FF']) {
    const response=await request(path(id),{cookie}); assert.equal(response.status,401); assert.deepEqual(response.json,unauthenticated);
    assert.match(response.headers['set-cookie'][0],/Max-Age=0/); assert.equal(response.headers['cache-control'],'no-store');
  }
}));

for(const mode of ['revoked','disabled','role']) test(`state change between guard and scoped read: ${mode} fails closed`, () => withApi(async ({fixture,login,request,path}) => {
  const p=await fixture('PATIENT'), s=await login(p);
  const response=await request(path(p.profileId),{cookie:s.cookie});
  assert.equal(response.status,mode==='role'?404:401); assert.deepEqual(response.json,mode==='role'?notFound:unauthenticated);
}, (store,pool) => ({...store,readPatientProfileAccess:async(principal,target)=>{
  if(mode==='revoked') await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[principal.sessionId]);
  if(mode==='disabled') await pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[principal.userId]);
  if(mode==='role') principal={...principal,role:'ADMIN'}; // DB CHECK/FK prevents persisted profile-role mismatch.
  return store.readPatientProfileAccess(principal,target);
}})));

test('authorization failure is sanitized and logs/denials contain no protected data or secrets', async () => {
  const output=[]; const originals=[console.log,console.error];
  console.log=console.error=(...args)=>output.push(args.join(' '));
  try {
    await withApi(async({fixture,login,request,path,authorization})=>{
      assert.deepEqual(Object.keys(authorization).sort(),['close','readPatientProfileAccess']);
      const p=await fixture('PATIENT'), s=await login(p);
      const response=await request(path(p.profileId),{cookie:s.cookie});
      assert.equal(response.status,503); assert.deepEqual(response.json,{error:{code:'AUTHORIZATION_SERVICE_UNAVAILABLE',message:'Service unavailable.'}});
      assert.equal(response.headers['set-cookie'],undefined);
      for(const value of [password,encoded,s.cookie,s.csrf,'driver-secret','Protected-']) { assert.ok(!response.text.includes(value)); assert.ok(!output.join('').includes(value)); }
    },store=>({...store,readPatientProfileAccess:async()=>{throw new Error('driver-secret');}}));
  } finally { [console.log,console.error]=originals; }
});

// Deterministic two-connection snapshot test: an uncommitted end is invisible;
// no promise is made for overlapping HTTP reads after a statement starts.
test('uncommitted assignment end remains visible to a read; committed end denies next HTTP request', () => withApi(async({fixture,login,persistence,pool,request,path,deny})=>{
  const p=await fixture('PATIENT'), c=await fixture('CLINICIAN'), s=await login(c);
  const assignment=await persistence.assignPatient({clinicianId:c.profileId,patientId:p.profileId});
  const connection=await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query("UPDATE clinician_patient_assignments SET status='ENDED',ended_at=now() WHERE id=$1",[assignment.id]);
    assert.equal((await request(path(p.profileId),{cookie:s.cookie})).status,200);
    await connection.query('COMMIT'); await deny(p.profileId,s.cookie);
  } finally { await connection.query('ROLLBACK'); connection.release(); }
}));

 test('logout invalidation applies to the protected profile route', () => withApi(async({fixture,login,request,path,config})=>{
  const p=await fixture('PATIENT'),s=await login(p);
  assert.equal((await request(path(p.profileId),{cookie:s.cookie})).status,200);
  const logout=await request('/api/v1/auth/logout',{method:'POST',cookie:s.cookie,body:'{}',headers:{Origin:config.origin,'X-CSRF-Token':s.csrf}});
  assert.equal(logout.status,204);
  const response=await request(path(p.profileId),{cookie:s.cookie});
  assert.equal(response.status,401); assert.deepEqual(response.json,unauthenticated);
}));
