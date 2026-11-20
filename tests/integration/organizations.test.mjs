import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isolatedOrganizations as use, audits } from '../support/organizations.mjs';
import { rejectsConstraint } from '../support/database.mjs';
import { observeApplicabilityQueries, signal, waitBlockedBy } from '../support/observed-applicability.mjs';
import { createDatabase, createAuthorizationPersistence, createBloodPressureMeasurementPersistence, createCarePlanPersistence, createClinicalEncounterPersistence, createFollowUpAppointmentPersistence, createNormalizedEvidencePersistence, createObservedApplicabilityPersistence, createCareActionPersistence } from '../../packages/db/dist/index.js';
import { createApp } from '../../apps/api/dist/app.js';
import { createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';
const reject = (p, code = 'ORGANIZATION_NOT_FOUND') => assert.rejects(p, e => e.code === code);

test('I1S2 compatible multi-organization grants, exact retries, terminal ends and fresh regrants preserve truthful audit', () => use(async f => {
  assert.equal((await f.store.readMemberOrganization(f.actors.lab, f.scope)).id, f.organization.id);
  const key = randomUUID(), other = await f.org();
  const first = await f.grant(f.users.lab, other, f.actors.admin, key);
  assert.equal(first.created, true);
  assert.deepEqual(await f.grant(f.users.lab, other, f.actors.admin, key), { ...first, created: false });
  await reject(f.grant(f.users.lab, other), 'ORGANIZATION_CONFLICT');
  await reject(f.grant(f.users.lab2, other, f.actors.admin, key), 'ORGANIZATION_CONFLICT');
  const target = { organizationId: other.id, membershipId: first.membership.id };
  const ended = await f.store.endMembership(f.actors.admin2, target);
  assert.equal(ended.changed, true); assert.equal(ended.membership.status, 'ENDED');
  assert.deepEqual(await f.store.endMembership(f.actors.admin, target), { ...ended, changed: false });
  const old = await f.grant(f.users.lab, other, f.actors.admin, key);
  assert.equal(old.created, false); assert.equal(old.membership.status, 'ENDED');
  const fresh = await f.grant(f.users.lab, other);
  assert.notEqual(fresh.membership.id, first.membership.id);
  await reject(f.store.readMemberOrganization(f.actors.lab, target));
  assert.equal((await f.store.readMemberOrganization(f.actors.lab, { ...target, membershipId: fresh.membership.id })).id, other.id);
  await f.store.endMembership(f.actors.admin, target); // old end cannot end the new grant
  assert.equal((await f.store.inspectMembership(f.actors.admin, { ...target, membershipId: fresh.membership.id })).status, 'ACTIVE');
  const rows = await audits(f.pool); assert.equal(rows.filter(x => x.action_type === 'ORGANIZATION_MEMBERSHIP_GRANTED').length, 3);
  assert.equal(rows.filter(x => x.action_type === 'ORGANIZATION_MEMBERSHIP_ENDED').length, 1);
  const db = (await f.pool.query('SELECT * FROM organization_memberships WHERE id=$1', [first.membership.id])).rows[0];
  assert.equal(db.granted_by_user_id, f.users.admin.id); assert.equal(db.ended_by_user_id, f.users.admin2.id); assert.ok(db.ended_at >= db.granted_at);
  assert.ok(rows.every(x => JSON.stringify(x.safe_metadata) === '{}'));
}));

test('I1S2 fixed roles/kinds, current identity, organization and membership isolation deny by default', () => use(async f => {
  for (const [key, kind] of [['clinician','CLINIC'], ['pharmacy','PHARMACY']]) {
    const org = await f.org(kind), m = (await f.grant(f.users[key], org)).membership;
    assert.equal((await f.store.readMemberOrganization(f.actors[key], { organizationId: org.id, membershipId: m.id })).kind, kind);
  }
  for (const key of ['patient','admin','clinician','pharmacy']) await reject(f.grant(f.users[key]));
  for (const actor of [f.actors.patient, f.actors.clinician, f.actors.lab, f.actors.pharmacy]) {
    await reject(f.store.createOrganization(actor, { kind: 'CLINIC', name: 'Denied', operationKey: randomUUID() }));
    await reject(f.grant(f.users.lab2, f.organization, actor));
    await reject(f.store.endMembership(actor, f.scope));
    await reject(f.store.inspectOrganization(actor, { organizationId: f.organization.id }));
  }
  await reject(f.store.readMemberOrganization(f.actors.admin, f.scope));
  await reject(f.store.readMemberOrganization(f.actors.lab2, f.scope));
  await reject(f.store.readMemberOrganization({ ...f.actors.lab2, userId: f.users.lab.id }, f.scope), 'ORGANIZATION_UNAUTHENTICATED');
  await reject(f.store.readMemberOrganization({ ...f.actors.lab, role: 'ADMIN' }, f.scope));
  const other = await f.org();
  await reject(f.store.readMemberOrganization(f.actors.lab, { ...f.scope, organizationId: other.id }));
  await reject(f.store.inspectMembership(f.actors.admin, { ...f.scope, organizationId: other.id }));
  await reject(f.store.readMemberOrganization(f.actors.lab, { ...f.scope, membershipId: randomUUID() }));
  await f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1", [f.users.lab.id]);
  await reject(f.store.readMemberOrganization(f.actors.lab, f.scope), 'ORGANIZATION_UNAUTHENTICATED');
}));

test('I1S2 explicit suspension/restoration uses versioned status, preserves history and never revives ended membership', () => use(async f => {
  const input = { organizationId: f.organization.id, status: 'SUSPENDED', expectedVersion: 0 };
  const suspended = await f.store.setOrganizationStatus(f.actors.admin, input);
  assert.equal(suspended.changed, true); assert.equal(suspended.organization.statusVersion, 1);
  assert.deepEqual(await f.store.setOrganizationStatus(f.actors.admin, input), { ...suspended, changed: false });
  await reject(f.store.readMemberOrganization(f.actors.lab, f.scope));
  await reject(f.grant(f.users.lab2));
  assert.equal((await f.store.inspectOrganization(f.actors.admin, { organizationId: f.organization.id })).status, 'SUSPENDED');
  await f.store.endMembership(f.actors.admin, f.scope);
  const restored = await f.store.setOrganizationStatus(f.actors.admin, { ...input, status: 'ACTIVE', expectedVersion: 1 });
  assert.equal(restored.organization.statusVersion, 2);
  await reject(f.store.setOrganizationStatus(f.actors.admin, input), 'ORGANIZATION_CONFLICT');
  await reject(f.store.readMemberOrganization(f.actors.lab, f.scope));
  const newGrant = await f.grant(); assert.notEqual(newGrant.membership.id, f.membership.id);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships')).rows[0].n, 2);
}));

test('I1S2 direct SQL constraints prevent role/kind substitution and history mutation; Prisma bypasses fail', () => use(async f => {
  const c = await f.pool.connect();
  try {
    await c.query('BEGIN');
    const insert = 'INSERT INTO organization_memberships(organization_id,organization_kind,user_id,user_role,granted_by_user_id,operation_key) VALUES($1,$2,$3,$4,$5,$6)';
    await rejectsConstraint(c, insert, [f.organization.id,'LABORATORY',f.users.lab.id,'LAB_STAFF',f.users.admin.id,randomUUID()], '23505','memberships_active_pair_key');
    await rejectsConstraint(c, insert, [f.organization.id,'LABORATORY',f.users.pharmacy.id,'PHARMACY_STAFF',f.users.admin.id,randomUUID()], '23514','memberships_compatibility_check');
    await rejectsConstraint(c, insert, [f.organization.id,'LABORATORY',f.users.patient.id,'LAB_STAFF',f.users.admin.id,randomUUID()], '23503','memberships_user_role_fkey');
    await rejectsConstraint(c, insert, [f.organization.id,'PHARMACY',f.users.pharmacy.id,'PHARMACY_STAFF',f.users.admin.id,randomUUID()], '23503','memberships_organization_kind_fkey');
    await rejectsConstraint(c, insert, [f.organization.id,'LABORATORY',f.users.lab2.id,'LAB_STAFF',f.users.lab.id,randomUUID()], '23503','memberships_grant_actor_fkey');
    for (const [column, value] of [['id',randomUUID()],['user_id',f.users.lab2.id],['operation_key',randomUUID()],['granted_at',new Date('2000-01-01')]]) await rejectsConstraint(c, `UPDATE organization_memberships SET ${column}=$1 WHERE id=$2`, [value,f.membership.id], '23514','memberships_history_guard');
    await rejectsConstraint(c, 'UPDATE organization_memberships SET ended_at=now() WHERE id=$1', [f.membership.id], '23514','memberships_history_guard');
    await rejectsConstraint(c, 'UPDATE organization_memberships SET status=\'ENDED\',ended_at=granted_at-interval \'1 second\',ended_by_user_id=$1 WHERE id=$2', [f.users.admin.id,f.membership.id], '23514','memberships_lifecycle_check');
    await rejectsConstraint(c, 'DELETE FROM organization_memberships WHERE false', [], '23514','i1_history_removal_guard');
    // Slice 4 adds a retained affiliation FK. PostgreSQL rejects the plain
    // TRUNCATE before triggers; CASCADE must still reach the original guard.
    await rejectsConstraint(c, 'TRUNCATE organization_memberships', [], '0A000',undefined);
    await rejectsConstraint(c, 'TRUNCATE organization_memberships CASCADE', [], '23514','i1_history_removal_guard');
    await rejectsConstraint(c, 'UPDATE organizations SET kind=\'PHARMACY\' WHERE id=$1', [f.organization.id], '23514','organizations_history_guard');
    await rejectsConstraint(c, 'UPDATE organizations SET status=\'SUSPENDED\' WHERE id=$1', [f.organization.id], '23514','organizations_history_guard');
    await rejectsConstraint(c, 'DELETE FROM organizations WHERE false', [], '23514','i1_history_removal_guard');
    await rejectsConstraint(c, 'UPDATE users SET role=\'ADMIN\' WHERE id=$1', [f.users.lab.id], '23001','memberships_user_role_fkey');
    for (const table of ['patient_profiles','clinician_profiles']) await rejectsConstraint(c, `INSERT INTO ${table}(user_id,display_name) VALUES($1,'Denied')`, [f.users.lab.id], '23503',`${table}_user_role_fkey`);
  } finally { await c.query('ROLLBACK'); c.release(); }
  await f.store.endMembership(f.actors.admin, f.scope);
  await assert.rejects(f.pool.query("UPDATE organization_memberships SET status='ACTIVE',ended_at=NULL,ended_by_user_id=NULL WHERE id=$1", [f.membership.id]), e => e.constraint === 'memberships_history_guard');
  const { createRequire } = await import('node:module'); const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
  const { PrismaPg } = require('@prisma/adapter-pg'); const { PrismaClient } = await import('../../packages/db/dist/generated/prisma/client.js');
  const prisma = new PrismaClient({ adapter: new PrismaPg(f.pool) });
  try { await assert.rejects(prisma.organizationMembership.update({ where: { id:f.membership.id }, data:{ status:'ACTIVE',endedAt:null,endedByUserId:null } })); await assert.rejects(prisma.organization.deleteMany()); }
  finally { await prisma.$disconnect(); }
}));

for (const event of ['ORGANIZATION_CREATED','ORGANIZATION_SUSPENDED','ORGANIZATION_MEMBERSHIP_GRANTED','ORGANIZATION_MEMBERSHIP_ENDED']) test(`I1S2 ${event} audit failure rolls all mutation back`, () => use(async f => {
  const before = { org: (await f.pool.query('SELECT * FROM organizations ORDER BY id')).rows, m: (await f.pool.query('SELECT * FROM organization_memberships ORDER BY id')).rows, audit: await audits(f.pool) };
  await f.pool.query(`CREATE FUNCTION i1_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='${event}' THEN RAISE EXCEPTION 'PRIVATE_CANARY'; END IF; RETURN NEW; END $$; CREATE TRIGGER i1_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION i1_fail_audit()`);
  const op = event === 'ORGANIZATION_CREATED' ? f.org() : event === 'ORGANIZATION_SUSPENDED' ? f.store.setOrganizationStatus(f.actors.admin, { organizationId:f.organization.id,status:'SUSPENDED',expectedVersion:0 }) : event === 'ORGANIZATION_MEMBERSHIP_GRANTED' ? f.grant(f.users.lab2) : f.store.endMembership(f.actors.admin,f.scope);
  await reject(op,'ORGANIZATION_UNAVAILABLE');
  assert.deepEqual((await f.pool.query('SELECT * FROM organizations ORDER BY id')).rows,before.org);
  assert.deepEqual((await f.pool.query('SELECT * FROM organization_memberships ORDER BY id')).rows,before.m);
  assert.deepEqual(await audits(f.pool),before.audit);
}));

// Observe real transport and pause AFTER PostgreSQL has acquired the first operation's lock.
async function held(f, pattern, first, second, check, rollback = false) {
  const entered=signal(),release=signal(); let once=false;
  const restore=observeApplicabilityQueries((q,next)=>{
    if(!once && pattern.test(q.text)) { once=true; return Promise.resolve(next()).then(async r=>{ entered.resolve(q.pid); await release.promise; if(rollback) throw Error('Injected winner rollback'); return r; }); }
    return next();
  });
  let a,b;
  try {
    a=first(); a.catch(()=>{}); const blocker=await entered.promise;
    b=second(); b.catch(()=>{}); const waiter=await waitBlockedBy(f.pool,blocker);
    assert.notEqual(waiter,blocker); release.resolve();
    const outcomes=await Promise.allSettled([a,b]); await check(outcomes,{blocker,waiter});
    console.log('I1S2_POSTGRES_RACE',JSON.stringify({lock:pattern.source,blockerPid:blocker,waiterPid:waiter,rollback,outcomes:outcomes.map(x=>x.status==='fulfilled'?'fulfilled':x.reason.code)}));
  } finally { release.resolve(); restore(); if(a) await Promise.allSettled([a]); if(b) await Promise.allSettled([b]); }
}
for(const rollback of [false,true]) test(`I1S2 real concurrent duplicate grant with winner ${rollback?'rollback':'commit'}`,()=>use(async f=>{
  const firstKey=randomUUID(),secondKey=randomUUID();
  await held(f,/INSERT INTO "public"\."organization_memberships"/,()=>f.grant(f.users.lab2,f.organization,f.actors.admin,firstKey),()=>f.grant(f.users.lab2,f.organization,f.actors.admin2,secondKey),async r=>{
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(r[rollback?1:0].status,'fulfilled'); assert.equal(r[rollback?0:1].reason.code,rollback?'ORGANIZATION_UNAVAILABLE':'ORGANIZATION_CONFLICT');
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships WHERE user_id=$1 AND status=\'ACTIVE\'',[f.users.lab2.id])).rows[0].n,1);
    assert.equal((await audits(f.pool)).filter(x=>x.action_type==='ORGANIZATION_MEMBERSHIP_GRANTED').length,2);
  },rollback);
}));
for(const endingFirst of [false,true]) test(`I1S2 real grant versus end with ${endingFirst?'end':'grant'} first preserves exact historical row`,()=>use(async f=>{
  const end=()=>f.store.endMembership(f.actors.admin2,f.scope),grant=()=>f.grant(f.users.lab,f.organization,f.actors.admin);
  // The grant sees the existing ACTIVE row and fails; hold it after the organization lock.
  await held(f,endingFirst?/UPDATE "public"\."organization_memberships"/:/SELECT id FROM public.organizations/,endingFirst?end:grant,endingFirst?grant:end,async r=>{
    assert.equal(r[endingFirst?0:1].status,'fulfilled');
    if(endingFirst){assert.equal(r[1].status,'fulfilled');assert.notEqual(r[1].value.membership.id,f.membership.id);}
    else assert.equal(r[0].reason.code,'ORGANIZATION_CONFLICT');
    assert.equal((await f.store.inspectMembership(f.actors.admin,f.scope)).status,'ENDED');
    const rows=(await f.pool.query('SELECT * FROM organization_memberships ORDER BY granted_at,id')).rows;
    assert.equal(rows.length,endingFirst?2:1);
    assert.equal((await audits(f.pool)).filter(x=>x.action_type==='ORGANIZATION_MEMBERSHIP_ENDED').length,1);
  });
}));
for(const change of ['membership','organization','user','session']) for(const revocationFirst of [true,false]) test(`I1S2 real ${change} revocation ${revocationFirst?'first':'after authorized read'}`,()=>use(async f=>{
  const read=()=>f.store.readMemberOrganization(f.actors.lab,f.scope);
  const revoke=change==='membership'?()=>f.store.endMembership(f.actors.admin2,f.scope):change==='organization'?()=>f.store.setOrganizationStatus(f.actors.admin2,{organizationId:f.organization.id,status:'SUSPENDED',expectedVersion:0}):change==='user'?()=>f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.lab.id]):()=>f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[f.actors.lab.sessionId]);
  if(revocationFirst && ['user','session'].includes(change)) {
    const c=await f.pool.connect();
    try {await c.query('BEGIN'); const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      await c.query(change==='user'?"UPDATE users SET status='DISABLED' WHERE id=$1":'UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1',[change==='user'?f.users.lab.id:f.actors.lab.sessionId]);
      const p=read();p.catch(()=>{});assert.notEqual(await waitBlockedBy(f.pool,pid),pid);await c.query('COMMIT');await reject(p,'ORGANIZATION_UNAUTHENTICATED');
    }finally{await c.query('ROLLBACK');c.release();}
  } else {
    const pattern=revocationFirst?(change==='membership'?/UPDATE "public"\."organization_memberships"/:/UPDATE "public"\."organizations"/):/SELECT id FROM public.organization_memberships/;
    await held(f,pattern,revocationFirst?revoke:read,revocationFirst?read:revoke,async r=>{
      assert.equal(r[0].status,'fulfilled');
      if(revocationFirst){assert.equal(r[1].status,'rejected');assert.equal(r[1].reason.code,'ORGANIZATION_NOT_FOUND');}else assert.equal(r[1].status,'fulfilled');
    });
  }
  await reject(read(),['user','session'].includes(change)?'ORGANIZATION_UNAUTHENTICATED':'ORGANIZATION_NOT_FOUND');
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships')).rows[0].n,1);
  const count=(await audits(f.pool)).length;assert.equal(count,['membership','organization'].includes(change)?3:2);
}));

test('I1S2 final expiry rolls back grant; lock timeout is sanitized and does not retry',()=>use(async f=>{
  // Expiry is time-based; hold a real insert until its pre-set deadline passes.
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1",[f.actors.admin.sessionId]);
  const entered=signal(),release=signal();let once=false;
  const stop=observeApplicabilityQueries((q,next)=>{if(!once&&/INSERT INTO "public"\."organization_memberships"/.test(q.text)){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve();await release.promise;return r;});}return next();});
  try {const p=f.grant(f.users.lab2);p.catch(()=>{});await entered.promise;await f.pool.query('SELECT pg_sleep(2.1)');release.resolve();await reject(p,'ORGANIZATION_UNAUTHENTICATED');}finally{release.resolve();stop();}
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships')).rows[0].n,1);
  const c=await f.pool.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[f.organization.id]);
    const start=Date.now();await reject(f.store.readMemberOrganization(f.actors.lab,f.scope),'ORGANIZATION_UNAVAILABLE');assert.ok(Date.now()-start<9000);
  }finally{await c.query('ROLLBACK');c.release();}
  assert.equal((await audits(f.pool)).length,2);
}));

 test('I1S2 strict input is copied before await; no authority-bearing unknown keys or getters',()=>use(async f=>{
  for(const input of [{...f.scope,role:'ADMIN'},{...f.scope,userId:f.users.lab.id},{...f.scope,membershipId:'%bad'}])await assert.rejects(f.store.readMemberOrganization(f.actors.lab,input));
  const bad={...f.scope};Object.defineProperty(bad,'membershipId',{get(){throw Error('Getter must not execute');}});await reject(f.store.readMemberOrganization(f.actors.lab,bad),'ORGANIZATION_INVALID');
  const input={...f.scope},entered=signal(),release=signal();let once=false;
  const stop=observeApplicabilityQueries((q,next)=>{if(!once&&/SELECT id FROM public.users/.test(q.text)){once=true;entered.resolve();return release.promise.then(next);}return next();});
  try {const pending=f.store.readMemberOrganization(f.actors.lab,input);await entered.promise;input.membershipId=randomUUID();release.resolve();assert.equal((await pending).id,f.organization.id);}finally{release.resolve();stop();}
}));

test('I1S2 real staff login/logout and membership never grant M0–M2 clinical access',()=>use(async f=>{
  const db=createDatabase(f.url),authorization=createAuthorizationPersistence(f.url),bp=createBloodPressureMeasurementPersistence(f.url),plans=createCarePlanPersistence(f.url),enc=createClinicalEncounterPersistence(f.url),appointments=createFollowUpAppointmentPersistence(f.url),normalized=createNormalizedEvidencePersistence(f.url),applicability=createObservedApplicabilityPersistence(f.url),actions=createCareActionPersistence(f.url);
  const app=await createApp(db,{store:f.auth,passwords:await createPasswordVerifier(),config:authConfiguration({NODE_ENV:'test',AUTH_BROWSER_ORIGIN:'http://localhost:3000'})},authorization,bp,{appointments,encounters:enc});
  try{await app.listen(0,'127.0.0.1');const base=await app.getUrl(),patientId=f.users.patient.profileId;
    for(const key of ['lab','pharmacy','admin']){
      const login=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-EH-Login':'1'},body:JSON.stringify({email:f.users[key].email,password:f.password})});assert.equal(login.status,200);const json=await login.json();assert.equal(json.data.user.role,f.users[key].role);const cookie=login.headers.get('set-cookie').split(';')[0];
      for(const route of ['profile','blood-pressure-measurements','follow-up-appointments','clinical-encounters']){const res=await fetch(`${base}/api/v1/patients/${patientId}/${route}`,{headers:{Cookie:cookie,'X-Role':'CLINICIAN','X-User-Id':f.users.clinician.id}});assert.equal(res.status,404);assert.equal(res.headers.get('cache-control'),'no-store');}
      const actor=f.actors[key],target={patientId};
      assert.equal((await authorization.readPatientProfileAccess(actor,target)).profile,null);
      await assert.rejects(plans.createDraftPlan(actor,target));
      await assert.rejects(bp.listBloodPressureMeasurements(actor,{...target,page:1,pageSize:20}));
      await assert.rejects(enc.listClinicalEncounters(actor,{...target,page:1,pageSize:20}));
      await assert.rejects(appointments.listFollowUpAppointments(actor,{...target,page:1,pageSize:20}));
      await assert.rejects(normalized.getNormalizedPatientEvidence(actor,{...target,queryInterval:{startAt:'2024-01-01T00:00:00.000Z',endAt:'2025-01-01T00:00:00.000Z'},partition:{sourceType:'SYNTHETIC_BENCHMARK',sourceReference:'i1s2'}}),e=>e.code==='EVIDENCE_NOT_FOUND');
      await assert.rejects(applicability.getObservedApplicabilitySnapshots(actor,{...target,effectiveAt:'2024-01-01T00:00:00.000Z'}),e=>e.code==='APPLICABILITY_NOT_FOUND');
      await assert.rejects(actions.listActions(actor,{...target,page:1,pageSize:20}));
      const logout=await fetch(base+'/api/v1/auth/logout',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':json.data.csrfToken},body:'{}'});assert.equal(logout.status,204);
    }
    const clinic=await f.org('CLINIC');await f.grant(f.users.clinician,clinic);
    assert.equal((await authorization.readPatientProfileAccess(f.actors.clinician,{patientId})).profile,null);
    const assignment=await f.identities.assignPatient({patientId,clinicianId:f.users.clinician.profileId});
    assert.ok((await authorization.readPatientProfileAccess(f.actors.clinician,{patientId})).profile);
    await f.store.setOrganizationStatus(f.actors.admin,{organizationId:clinic.id,status:'SUSPENDED',expectedVersion:0});
    assert.ok((await authorization.readPatientProfileAccess(f.actors.clinician,{patientId})).profile);
    await f.identities.endAssignment(assignment.id);assert.equal((await authorization.readPatientProfileAccess(f.actors.clinician,{patientId})).profile,null);
  }finally{await app.close();for(const x of [db,authorization,bp,plans,enc,appointments,normalized,applicability,actions])await x.close();}
}));

for(const disableFirst of [true,false])test(`I1S2 membership grant and target disable, ${disableFirst?'disable':'grant'} first`,()=>use(async f=>{
 if(disableFirst){
  const c=await f.pool.connect();try{await c.query('BEGIN');const pid=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
   await c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.lab2.id]);const grant=f.grant(f.users.lab2);grant.catch(()=>{});
   assert.notEqual(await waitBlockedBy(f.pool,pid),pid);await c.query('COMMIT');await reject(grant);
  }finally{await c.query('ROLLBACK');c.release();}
 }else await held(f,/INSERT INTO "public"\."organization_memberships"/,()=>f.grant(f.users.lab2),()=>f.pool.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.lab2.id]),async results=>{assert.ok(results.every(x=>x.status==='fulfilled'));});
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships WHERE user_id=$1',[f.users.lab2.id])).rows[0].n,disableFirst?0:1);
 assert.equal((await audits(f.pool)).filter(x=>x.action_type==='ORGANIZATION_MEMBERSHIP_GRANTED').length,disableFirst?1:2);
}));

test('I1S2 real PostgreSQL deadlock victim fails sanitized without stale retry or audit',()=>use(async f=>{
 const c=await f.pool.connect();let operation,competing;
 try{
  await c.query('BEGIN');await c.query("SET LOCAL deadlock_timeout='10s'");
  const blocker=(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[f.organization.id]);
  operation=f.store.readMemberOrganization(f.actors.lab,f.scope);operation.catch(()=>{});
  const waiter=await waitBlockedBy(f.pool,blocker);
  console.log('I1S2_POSTGRES_DEADLOCK',JSON.stringify({blockerPid:blocker,servicePid:waiter}));
  competing=c.query("UPDATE users SET status='DISABLED' WHERE id=$1",[f.users.lab.id]);competing.catch(()=>{});
  assert.equal(await waitBlockedBy(f.pool,waiter),blocker);
  await reject(operation,'ORGANIZATION_UNAVAILABLE');await competing;await c.query('ROLLBACK');
  assert.equal((await f.store.readMemberOrganization(f.actors.lab,f.scope)).id,f.organization.id);
  assert.equal((await audits(f.pool)).length,2);
 }finally{await c.query('ROLLBACK');c.release();await Promise.allSettled([operation,competing]);}
}));
