import test from 'node:test';
import assert from 'node:assert/strict';
import {migrationRunner} from '../support/migration-runner.mjs';
import { isolatedCareActions } from '../support/care-actions.mjs';
import { createOrganizationPersistence } from '../../packages/db/dist/index.js';
import { randomUUID } from 'node:crypto';
import { observeApplicabilityQueries,signal,waitBlockedBy } from '../support/observed-applicability.mjs';

const migrate=(url,command)=>migrationRunner(url,command,12);
test('I1S2 real runner upgrades populated ten-migration INITIAL/action provenance, retains exact rows/ledger and repeats safely',()=>isolatedCareActions(async f=>{
 await f.actions.generateInitialAction(f.actor,await f.command());
 const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename);
 const rows=await Promise.all(tables.map(t=>f.pool.query(`SELECT * FROM public.${t} ORDER BY ${t==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)));
 migrate(f.url,'deploy');migrate(f.url,'status');migrate(f.url,'deploy');migrate(f.url,'status');
 for(let i=0;i<tables.length;i++){
  const actual=(await f.pool.query(`SELECT * FROM public.${tables[i]} ORDER BY ${tables[i]==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)).rows;
  if(tables[i]==='_prisma_migrations'){assert.equal(actual.length,12);assert.deepEqual(actual.filter(x=>rows[i].rows.some(y=>y.id===x.id)),rows[i].rows);}
  else assert.deepEqual(actual,rows[i].rows);
 }
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM organizations')).rows[0].n,0);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM organization_memberships')).rows[0].n,0);
 assert.deepEqual((await f.pool.query("SELECT enumlabel FROM pg_enum WHERE enumtypid='user_role'::regtype ORDER BY enumsortorder")).rows.map(x=>x.enumlabel),['PATIENT','CLINICIAN','ADMIN','LAB_STAFF','PHARMACY_STAFF']);
}));

for(const membershipFirst of [true,false])test(`I1S2 clinician membership operation and existing M2 INITIAL generation overlap, ${membershipFirst?'membership':'clinical'} first`,()=>isolatedCareActions(async f=>{
 migrate(f.url,'deploy');
 const store=createOrganizationPersistence(f.url),admin=f.principals.admin;
 try{
  const org=(await store.createOrganization(admin,{kind:'CLINIC',name:'Synthetic clinic',operationKey:randomUUID()})).organization;
  const member=(await store.grantMembership(admin,{organizationId:org.id,userId:f.actor.userId,operationKey:randomUUID()})).membership;
  const target={organizationId:org.id,membershipId:member.id},command=await f.command();
  const entered=signal(),release=signal();let once=false;
  const stop=observeApplicabilityQueries((q,next)=>{
   const matches=membershipFirst?/SELECT id FROM public.organization_memberships/.test(q.text):/INSERT INTO public.care_action_decisions/.test(q.text);
   if(!once&&matches){once=true;return Promise.resolve(next()).then(async r=>{entered.resolve(q.pid);await release.promise;return r;});}return next();
  });
  let a,b;
  try{
   const read=()=>store.readMemberOrganization(f.actor,target),generate=()=>f.actions.generateInitialAction(f.actor,command);
   a=membershipFirst?read():generate();a.catch(()=>{});const pid=await entered.promise;
   b=membershipFirst?generate():read();b.catch(()=>{});const waiter=await waitBlockedBy(f.pool,pid);assert.notEqual(waiter,pid);console.log('I1S2_POSTGRES_M2_OVERLAP',JSON.stringify({membershipFirst,blockerPid:pid,waiterPid:waiter}));release.resolve();
   const results=await Promise.all([a,b]);assert.equal(results[membershipFirst?1:0].created,true);
   assert.equal((await f.pool.query('SELECT count(*)::int n FROM care_actions')).rows[0].n,1);
   assert.equal((await f.pool.query("SELECT count(*)::int n FROM audit_logs WHERE action_type LIKE 'CARE_ACTION_%'")).rows[0].n,2);
  }finally{release.resolve();stop();await Promise.allSettled([a,b]);}
 }finally{await store.close();}
}));
