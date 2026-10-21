import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseFollowupJson } from '../apps/api/dist/followup.js';
import { appointmentInput,encounterInput } from './support/followup.mjs';
test('EH-012 exact flat parser rejects shapes, identity authority and escaped duplicate keys',()=>{
  for(const [kind,input] of [['appointment',appointmentInput],['encounter',encounterInput]]){
    assert.deepEqual(parseFollowupJson(JSON.stringify(input),kind,true),input);assert.deepEqual(parseFollowupJson(' {} ',kind,false),{});
    for(const raw of ['', '{bad','[]','null','true','{}',JSON.stringify({...input,status:'SCHEDULED'}),JSON.stringify({...input,recordedByUserId:'secret'}),JSON.stringify(input).replace('"purpose":','"purp\\u006fse":"HTN_BP_FOLLOWUP","purpose":')])assert.throws(()=>parseFollowupJson(raw,kind,true));
    for(const last of ['"OTHER"','null','42']){
      const duplicate=JSON.stringify(input).replace('"purpose":"HTN_BP_FOLLOWUP"','"purp\\u006fse":"HTN_BP_FOLLOWUP","purpose":'+last);
      assert.throws(()=>parseFollowupJson(duplicate,kind,true),e=>e.code==='REQUEST_INVALID'||e.getResponse?.().error.code==='REQUEST_INVALID');
    }
    for(const key of Object.keys(input)){const body={...input};delete body[key];assert.throws(()=>parseFollowupJson(JSON.stringify(body),kind,true));}
    for(const raw of ['null','[]','{"x":1}','{"x":1,"x":2}'])assert.throws(()=>parseFollowupJson(raw,kind,false));
    for(const value of [null,1,[],{},'WRONG'])assert.throws(()=>parseFollowupJson(JSON.stringify({...input,purpose:value}),kind,true));
  }
});
test('EH-012 timestamp grammar preserves strict EH-011 date/offset/millisecond semantics',()=>{
  for(const [kind,field] of [['appointment','scheduledAt'],['encounter','occurredAt']]){
    for(const time of ['0001-01-01T00:00:00Z','2024-02-29T02:30:00.12+02:30','2024-02-28T23:30:00.123-00:30'])assert.ok(parseFollowupJson(JSON.stringify({[field]:time,purpose:'HTN_BP_FOLLOWUP'}),kind,true));
    for(const time of ['2023-02-29T00:00:00Z','2024-04-31T00:00:00Z','2024-01-01T24:00:00Z','2024-01-01T00:00:60Z','2024-01-01T00:00:00','2024-01-01T00:00:00.0001Z','2024-01-01T00:00:00-00:00','0000-01-01T00:00:00Z','0001-01-01T00:00:00+01:00','9999-12-31T23:59:59-01:00','2024-01-01T00:00:00+24:00','2024-01-01T00:00:00+00:60',' 2024-01-01T00:00:00Z',null])assert.throws(()=>parseFollowupJson(JSON.stringify({[field]:time,purpose:'HTN_BP_FOLLOWUP'}),kind,true));
  }
});
test('EH-012 exact schema, corrected route, minimized projections and frozen history',async()=>{
  const schema=await readFile('packages/db/prisma/schema.prisma','utf8');
  for(const model of ['FollowUpAppointment','ClinicalEncounter','EncounterBloodPressureAssociation']){
    const body=schema.split(`model ${model} {`)[1].split('\n}')[0];assert.doesNotMatch(body,/carePlan|templateId|ruleDefinition|careAction|qualifying|relevant|completedEvidence|closesAction|scheduledEvidence|updatedAt|notes|metadata|clinicianId/);
  }
  assert.doesNotMatch(schema,/model (ClosureAssessment)/);
  const api=JSON.parse(await readFile('docs/openapi.json','utf8'));
  const root='/api/v1/patients/{patientId}/clinical-encounters/{encounterId}';
  assert.ok(api.paths[root+'/blood-pressure-associations']);assert.equal(api.paths[root+'/blood-pressure-measurements'],undefined);
  for(const [name,keys] of [['FollowUpAppointment',['id','patientId','scheduledAt','purpose','status','createdAt','cancelledAt']],['ClinicalEncounter',['id','patientId','occurredAt','purpose','createdAt']],['EncounterBloodPressureAssociation',['id','patientId','encounterId','bloodPressureMeasurementId','createdAt']]])assert.deepEqual(Object.keys(api.components.schemas[name].properties).sort(),keys.sort());
  const hashes=['d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a','2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b','bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a','47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38','5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21','7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01'];
  const {readdir}=await import('node:fs/promises');const dirs=(await readdir('packages/db/prisma/migrations')).filter(n=>n!=='migration_lock.toml').sort();assert.equal(dirs.length,10); // EH-014 additive migration; historical checksums unchanged.
  for(let i=0;i<6;i++)assert.equal(createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${dirs[i]}/migration.sql`)).digest('hex'),hashes[i]);
});
