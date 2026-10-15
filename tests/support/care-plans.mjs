import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { isolatedCatalog } from './clinical-catalog.mjs';
import { createCarePlanPersistence, createDemoPersistence, createAuthPersistence } from '../../packages/db/dist/index.js';
import { seedDemo } from '../../scripts/lib/m1-demo.mjs';
import { sessionHash } from '../../apps/api/dist/auth.js';
export const planMigration='20261016000000_eh010_care_plan_lifecycle';
export async function isolatedPlans(run) {
  return isolatedCatalog(async({pool,store:catalog,url})=>{
    const sql=await readFile(`packages/db/prisma/migrations/${planMigration}/migration.sql`,'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)',[randomUUID(),createHash('sha256').update(sql).digest('hex'),planMigration]);
    const demo=createDemoPersistence(url),auth=createAuthPersistence(url),plans=createCarePlanPersistence(url);
    try {
      const seeded=await seedDemo(demo,Buffer.from(randomBytes(32).toString('base64url')));
      const identities=Object.fromEntries(seeded.state.identities.map(i=>[i.key,i]));
      const principals={};
      for(const [key,i] of Object.entries(identities)) {
        const token=randomBytes(32),hash=sessionHash(token);
        const user=(await pool.query('SELECT password_hash FROM users WHERE id=$1',[i.userId])).rows[0];
        await auth.createSession({userId:i.userId,verifiedHash:user.password_hash,tokenHash:hash,previousHash:null});
        principals[key]=await auth.resolve(hash);
      }
      const definition=(await catalog.bootstrapApprovedCatalog()).state;
      const actor=principals['clinician-assigned'],patientId=identities['patient-a'].profileId;
      const create=()=>plans.createDraftPlan(actor,{patientId});
      const target=plan=>({patientId,planId:plan.id});
      await run({pool,plans,catalog,definition,actor,patientId,create,target,identities,principals,assignmentId:seeded.state.assignmentId,url});
    } finally {await plans.close();await auth.close();await demo.close();}
  });
}
export const planSnapshot=async pool=>Object.fromEntries(await Promise.all(['care_plans','audit_logs'].map(async t=>[t,(await pool.query(`SELECT * FROM public.${t} ORDER BY id`)).rows])));
export async function waitBlocked(pool,pid) {
  for(let i=0;i<500;i++) if((await pool.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid])).rows[0].blocked)return;
  throw new Error('Expected lock wait');
}
