import { applyBpReadSchema } from './bp-amendment-schema.mjs';
import { readFile } from 'node:fs/promises';
import { randomUUID,createHash } from 'node:crypto';
import { isolatedPlans } from './care-plans.mjs';
import { createBloodPressureMeasurementPersistence } from '../../packages/db/dist/index.js';
export const bpMigration='20261017000000_eh011_bp_provenance';
export const bpInput={systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-29T00:00:00.000Z'};
export async function isolatedBp(run){return isolatedPlans(async f=>{
  const sql=await readFile(`packages/db/prisma/migrations/${bpMigration}/migration.sql`,'utf8');await f.pool.query(sql);
  await f.pool.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)',[randomUUID(),createHash('sha256').update(sql).digest('hex'),bpMigration]);
  await applyBpReadSchema(f.pool);
  const bp=createBloodPressureMeasurementPersistence(f.url);
  try{await run({...f,bp,write:(actor=f.actor,input={})=>bp.createBloodPressureMeasurement(actor,{patientId:f.patientId,...bpInput,...input})});}finally{await bp.close();}
});}
export const bpSnapshot=async pool=>({bp:(await pool.query('SELECT * FROM blood_pressure_measurements ORDER BY id')).rows,audit:(await pool.query("SELECT * FROM audit_logs WHERE action_type='BP_MEASUREMENT_CREATED' ORDER BY id")).rows});
