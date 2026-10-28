import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCareActionPersistence } from '../packages/db/dist/index.js';

test('EH014 only authorized root services; no product/research/startup generation callers',async()=>{
 const index=await readFile('packages/db/src/index.ts','utf8');
 assert.doesNotMatch(index,/export.*(?:eh014_inputs|guard_decision|rawGenerate)/);
 for(const file of ['apps/api/src/app.ts','apps/api/src/main.ts','apps/experiment-worker/src/main.ts','packages/db/src/blood-pressure.ts','packages/db/src/care-plans.ts']){
  const source=await readFile(file,'utf8');assert.doesNotMatch(source,/generateInitialAction|createCareActionPersistence/);
 }
 const schema=await readFile('packages/db/prisma/schema.prisma','utf8');
 assert.deepEqual([...schema.matchAll(/^model (\w+) \{/gm)].map(m=>m[1]).sort(),['Booking','BookingEvent','BookingOperation','BookingAttendance','RelationshipRequest','AssignmentEndProvenance','ClinicSchedulingSettings','AvailabilitySlot','AvailabilityOperation','Specialty','ClinicDirectory','ClinicianDirectory','DirectoryAffiliation','Organization','OrganizationMembership','User','Session','PatientProfile','ClinicianProfile','ClinicianPatientAssignment','AuditLog','GuidelineSource','CarePlanTemplate','CareRuleDefinition','CarePlan','BloodPressureMeasurement','FollowUpAppointment','ClinicalEncounter','EncounterBloodPressureAssociation','RecordCoverageWindow','ObservedClinicalApplicabilitySnapshot','ObservedClinicalApplicabilityRetraction','BpAmendmentOperation','BpExclusion','BpPrivacyTarget','CareAction','CareActionDecision','CareActionApplicabilityInput'].sort());
 const pkg=JSON.parse(await readFile('packages/db/package.json','utf8'));assert.deepEqual(Object.keys(pkg.exports),['.']);
});

test('EH014 strict command rejects unsafe input before any I/O',async()=>{
 const actions=createCareActionPersistence('postgresql://invalid:invalid@127.0.0.1:1/unused');
 try{
  for(const raw of [null,{},[],{patientId:'bad'},Object.create({patientId:'hidden'})])await assert.rejects(actions.generateInitialAction({},raw),e=>e.code==='CARE_ACTION_INVALID');
  const id='11111111-1111-4111-8111-111111111111',hidden=[{}];Object.defineProperty(hidden,'0',{value:{},enumerable:false});
  for(const point of [hidden,new (class extends Array {})({}),[{get forbidden(){throw Error('must not execute');}}]]){
   await assert.rejects(actions.generateInitialAction({}, {patientId:id,planId:id,bpId:id,applicabilityId:id,operationId:id,accepted:true,expectedInputs:{point}}),e=>e.code==='CARE_ACTION_INVALID');
  }
 }
 finally{await actions.close();}
});
