import { randomUUID } from 'node:crypto';
import { isolatedObservedApplicability } from './observed-applicability.mjs';
import { applyMigrationOnce } from './bp-amendment-schema.mjs';
import { createCareActionPersistence, createBpAmendmentPersistence } from '../../packages/db/dist/index.js';
export const actionMigration='20261022000000_eh014_initial_care_action';
export async function isolatedCareActions(run) {
 return isolatedObservedApplicability(async f=>{
  await applyMigrationOnce(f.pool,actionMigration);
  const actions=createCareActionPersistence(f.url),amend=createBpAmendmentPersistence(f.url);
  const plan=await f.plans.activatePlan(f.actor,f.target(await f.create()));
  const measuredAt=plan.plan.startedAt.toISOString();
  const observation=await f.insertSnapshot({effectiveAt:measuredAt,assertedAt:measuredAt});
  const make=async (extra={},actor=f.actor)=>f.write(actor,{systolic:139,diastolic:89,measuredAt,...extra});
  const bp=await make();
  const selection={patientId:f.patientId,planId:plan.plan.id,bpId:bp.id,applicabilityId:observation.snapshot.id};
  const command=async (s=selection,actor=f.actor)=>({...s,...await actions.previewSelection(actor,s),operationId:randomUUID(),accepted:true});
  try {await run({...f,actions,amend,plan:plan.plan,measuredAt,observation,bp,make,selection,command});}
  finally {await actions.close();await amend.close();}
 });
}
export const counts=async pool=>(await pool.query(`SELECT (SELECT count(*)::int FROM care_actions) actions,(SELECT count(*)::int FROM care_action_decisions) decisions,(SELECT count(*)::int FROM audit_logs WHERE action_type IN ('CARE_ACTION_CREATED','CARE_ACTION_TRIGGER_SELECTED')) audits`)).rows[0];
export const exclude=(f,bp=f.bp)=>f.amend.exclude(f.actor,{patientId:f.patientId,bpId:bp.id,operationId:randomUUID(),reason:'DATA_ENTRY_ERROR',expectedState:'UNEXCLUDED',duplicateOfBpId:null});
export const privacy=(f,bp=f.bp)=>f.amend.restrictWrongPatient(f.actor,{patientId:f.patientId,bpId:bp.id,operationId:randomUUID(),predecessorIds:[]});
export const withdraw=f=>f.retractSnapshot({snapshotId:f.observation.snapshot.id,assertedAt:f.measuredAt});
