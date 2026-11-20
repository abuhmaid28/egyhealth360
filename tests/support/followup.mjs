import { applyMigrationOnce } from './bp-amendment-schema.mjs';
import { isolatedBp } from './blood-pressure.mjs';
import { createFollowUpAppointmentPersistence,createClinicalEncounterPersistence } from '../../packages/db/dist/index.js';
export const followupMigration='20261018000000_eh012_followup_encounters';
export const appointmentInput={scheduledAt:'2099-01-01T00:00:00.000Z',purpose:'HTN_BP_FOLLOWUP'};
export const encounterInput={occurredAt:'2024-02-29T00:00:00.000Z',purpose:'HTN_BP_FOLLOWUP'};
export async function isolatedFollowup(run){return isolatedBp(async f=>{
  await applyMigrationOnce(f.pool, followupMigration);

  const appointments=createFollowUpAppointmentPersistence(f.url),encounters=createClinicalEncounterPersistence(f.url);
  const appointment=(actor=f.actor,input={})=>appointments.createFollowUpAppointment(actor,{patientId:f.patientId,...appointmentInput,...input});
  const encounter=(actor=f.actor,input={})=>encounters.createClinicalEncounter(actor,{patientId:f.patientId,...encounterInput,...input});
  try{await run({...f,appointments,encounters,appointment,encounter});}finally{await appointments.close();await encounters.close();}
});}
export const followupSnapshot=async pool=>Object.fromEntries(await Promise.all(['follow_up_appointments','clinical_encounters','encounter_bp_associations','audit_logs'].map(async t=>[t,(await pool.query(`SELECT * FROM public.${t} ORDER BY id`)).rows])));
