import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes,randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPersistence } from '../packages/db/dist/index.js';
import { hashPassword } from '../apps/api/dist/password.js';
const require=createRequire(new URL('../packages/db/package.json',import.meta.url));const {Pool}=require('pg');
const manifest={manifest:'eh-v3-i1-slice3-proof-v1',scope:'V3_I1_SLICE3_PATIENT_REGISTRATION_PROFILE'};
let pool,identities;
try{
 assert.ok(['development','test'].includes(process.env.NODE_ENV),'Disposable development/test runtime only');
 const base='http://127.0.0.1:3001/api/v1',origin=process.env.AUTH_BROWSER_ORIGIN;
 assert.ok(origin&&process.env.DATABASE_URL);
 pool=new Pool({connectionString:process.env.DATABASE_URL});identities=createPersistence(process.env.DATABASE_URL);
 const password=randomBytes(32).toString('base64url'),email=`slice3-${randomUUID()}@example.invalid`;
 const input={email,password,displayName:'Synthetic Slice 3 Runtime'};
 const mutation={Origin:origin,'Content-Type':'application/json','X-EH-Register':'1'};
 const send=async(path,options={})=>{
  const r=await fetch(base+path,options);const body=options.method==='HEAD'?null:await r.json();return{r,body};
 };
 const register=(value=input,headers={})=>send('/auth/register',{method:'POST',headers:{...mutation,...headers},body:JSON.stringify(value)});
 const sessions=(await pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n;
 const first=await register();assert.equal(first.r.status,202);assert.deepEqual(first.body,{data:{accepted:true}});assert.equal(first.r.headers.get('set-cookie'),null);
 assert.equal(first.r.headers.get('cache-control'),'no-store');assert.equal((await pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n,sessions);
 assert.equal((await send('/auth/me')).r.status,401);
 for(const [headers,status] of [[{Origin:'http://evil.invalid'},403],[{'X-EH-Register':''},403],[{'Sec-Fetch-Site':'cross-site'},403],[{'Content-Type':'text/plain'},415]])assert.equal((await register(input,headers)).r.status,status);
 for(const key of ['role','status','owner','userId'])assert.equal((await register({...input,[key]:'ADMIN'})).r.status,400);
 assert.equal((await register({...input,displayName:[]})).r.status,400);
 const duplicate=await register({...input,email:email.toUpperCase(),password:'unchosen replacement',displayName:'Unchosen replacement'});
 assert.equal(duplicate.r.status,202);assert.deepEqual(duplicate.body,first.body);assert.equal(duplicate.r.headers.get('set-cookie'),null);
 const login=async(email)=>{
  const {r,body}=await send('/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email,password})});
  assert.equal(r.status,200);return{cookie:r.headers.get('set-cookie').split(';')[0],csrf:body.data.csrfToken,userId:body.data.user.id};
 };
 const patient=await login(email),headers={Origin:origin,'Content-Type':'application/json',Cookie:patient.cookie,'X-CSRF-Token':patient.csrf};
 const row=(await pool.query('SELECT u.id,u.role,u.status,p.id profile_id,p.display_name FROM users u JOIN patient_profiles p ON p.user_id=u.id WHERE u.email=$1',[email])).rows[0];
 assert.equal(row.role,'PATIENT');assert.equal(row.status,'ACTIVE');assert.equal(row.display_name,input.displayName);
 const prior=(await pool.query('SELECT * FROM sessions WHERE user_id=$1 ORDER BY id',[row.id])).rows;
 const sameSession=await register(input,{Cookie:patient.cookie});assert.equal(sameSession.r.headers.get('set-cookie'),null);assert.equal(sameSession.r.status,202);
 assert.deepEqual((await pool.query('SELECT * FROM sessions WHERE user_id=$1 ORDER BY id',[row.id])).rows,prior);
 assert.deepEqual((await send('/me/profile',{headers})).body,{data:{displayName:input.displayName,dateOfBirth:null,sex:null}});
 const updated={displayName:'Synthetic Slice 3 Updated',dateOfBirth:'2000-02-29',sex:'opaque context'};
 for(let i=0;i<2;i++){const r=await send('/me/profile',{method:'PUT',headers,body:JSON.stringify(updated)});assert.equal(r.r.status,200);assert.deepEqual(r.body,{data:updated});}
 assert.equal((await send('/me/profile',{method:'PUT',headers:{...headers,'X-CSRF-Token':'wrong'},body:JSON.stringify(updated)})).r.status,403);
 assert.equal((await send('/me/profile',{method:'PUT',headers,body:JSON.stringify({...updated,userId:randomUUID()})})).r.status,400);
 assert.equal((await send('/me/profile?patientId='+randomUUID(),{headers})).r.status,400);
 const hash=await hashPassword(Buffer.from(password));
 for(const role of ['ADMIN','CLINICIAN','LAB_STAFF','PHARMACY_STAFF']){
  const staff=await identities.createUser({email:`slice3-${randomUUID()}@example.invalid`,passwordHash:hash,role,...(role==='CLINICIAN'?{profile:{displayName:'Synthetic Slice 3 Clinician'}}:{})});
  const auth=await login(staff.email);const h={...headers,Cookie:auth.cookie,'X-CSRF-Token':auth.csrf};
  assert.equal((await send('/me/profile',{headers:h})).r.status,404);
  assert.equal((await send('/me/profile',{method:'PUT',headers:h,body:JSON.stringify(updated)})).r.status,404);
 }
 await pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE user_id=$1 AND revoked_at IS NULL',[row.id]);
 assert.equal((await send('/me/profile',{headers})).r.status,401);
 const again=await login(email);const active={...headers,Cookie:again.cookie,'X-CSRF-Token':again.csrf};
 await pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[row.id]);
 assert.equal((await send('/me/profile',{headers:active})).r.status,401);
 assert.equal((await send('/me/profile',{method:'PUT',headers:active,body:JSON.stringify(updated)})).r.status,401);
 assert.deepEqual((await register(input)).body,first.body); // Disabled identity is never reactivated.
 assert.equal((await pool.query('SELECT status FROM users WHERE id=$1',[row.id])).rows[0].status,'DISABLED');
 const audit=(await pool.query("SELECT actor_user_id,action_type,entity_id,safe_metadata FROM audit_logs WHERE (action_type='PATIENT_SELF_REGISTERED' AND entity_id=$1) OR (action_type='PATIENT_PROFILE_UPDATED' AND entity_id=$2) ORDER BY timestamp,id",[row.id,row.profile_id])).rows;
 assert.equal(audit.length,2);assert.equal(audit.find(a=>a.action_type==='PATIENT_SELF_REGISTERED').actor_user_id,null);assert.equal(audit.find(a=>a.action_type==='PATIENT_PROFILE_UPDATED').actor_user_id,row.id);assert.ok(audit.every(a=>Object.keys(a.safe_metadata).length===0));
 console.log(JSON.stringify({...manifest,result:'PASS',cases:8,runningApi:true}));
}catch{console.error(JSON.stringify({...manifest,result:'FAIL'}));process.exitCode=1;}
finally{if(identities)await identities.close();if(pool)await pool.end();}
