import {randomUUID} from 'node:crypto';
import {isolatedBookings,pastBooking} from './bookings.mjs';
export const openCommand=b=>({bookingId:b.id,operationKey:randomUUID()});
export const openingCounts=async f=>Object.fromEntries(await Promise.all(['consultations','clinical_encounters','clinician_patient_assignments','relationship_requests','booking_operations','booking_events','booking_attendance','audit_logs'].map(async t=>[t,(await f.pool.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n])));
export async function isolatedConsultations(run,options={}) {return isolatedBookings(async f=>{
 const assign=async()=>f.identities.assignPatient({clinicianId:f.users.clinician.profileId,patientId:f.users.patient.profileId});
 const ready=async({offset=0,assignment=true,ended=true}={})=>{const b=await f.create(await f.publish(offset));if(assignment)await assign();return pastBooking(f,b,ended);};
 const open=(b,key=randomUUID(),actor=f.actors.clinician)=>f.consultations.open(actor,{bookingId:b.id,operationKey:key});
 await run({...f,assign,ready,open});
},options);}
