import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBloodPressureJson,parseBloodPressurePage } from '../apps/api/dist/blood-pressure.js';
import { bpTimestamp,validateBpValues } from '../packages/db/dist/index.js';
const body={systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2026-01-01T00:00:00.000Z'};
test('BP parser accepts only exact flat keys and lossless integer tokens',()=>{
  assert.deepEqual(parseBloodPressureJson(JSON.stringify(body)),body);
  for(const token of ['"128"','true','null','128.1','128.0','1e2','-0','2147483648','-2147483649','128.00000000000000001','1e999','NaN','Infinity','-Infinity','1e-999','-0.0','2147483647.00000001'])assert.throws(()=>parseBloodPressureJson(JSON.stringify(body).replace('128',token)));
  for(const raw of ['', '{bad','null','[]','true','{}',JSON.stringify({...body,actorId:'fake'}),JSON.stringify(body).replace('"systolic":128','"systolic":128,"systolic":129'),JSON.stringify(body).replace('"systolic":128','"systolic":128,"sy\\u0073tolic":129')])assert.throws(()=>parseBloodPressureJson(raw));
  for(const key of Object.keys(body)){const b={...body};delete b[key];assert.throws(()=>parseBloodPressureJson(JSON.stringify(b)));}
  for(const unit of ['mmhg',' mmHg','kPa',null])assert.throws(()=>parseBloodPressureJson(JSON.stringify({...body,unit})));
  for(const n of [-2147483648,0,2147483647])assert.equal(parseBloodPressureJson(JSON.stringify({...body,systolic:n,diastolic:n})).systolic,n);
  for(const value of [NaN,Infinity,-Infinity,-0,1.2,'1',null])assert.throws(()=>validateBpValues({...body,systolic:value}));
  assert.equal(parseBloodPressureJson(JSON.stringify(body).replace('"unit"','"u\\u006eit"')).unit,'mmHg');
});
test('BP timestamp validates calendar, timezone, supported years and precision without repair',()=>{
  assert.equal(bpTimestamp('2024-02-29T02:30:00.12+02:30').toISOString(),'2024-02-29T00:00:00.120Z');
  assert.equal(bpTimestamp('2024-02-28T23:30:00.1-00:30').toISOString(),'2024-02-29T00:00:00.100Z');
  assert.equal(bpTimestamp('0001-01-01T00:00:00Z').toISOString(),'0001-01-01T00:00:00.000Z');
  for(const value of ['2023-02-29T00:00:00Z','2024-04-31T00:00:00Z','2024-01-01T24:00:00Z','2024-01-01T00:00:60Z','2024-01-01T00:00:00','2024-01-01','2024-01-01T00:00:00.0001Z','2024-01-01T00:00:00-00:00','0000-01-01T00:00:00Z','0001-01-01T00:00:00+01:00','9999-12-31T23:59:59-01:00','2024-01-01T00:00:00+24:00','2024-01-01T00:00:00+00:60',' 2024-01-01T00:00:00Z'])assert.throws(()=>bpTimestamp(value));
});
test('BP pagination is bounded, canonical and rejects duplicate/unknown/encoded query authority',()=>{
  assert.deepEqual(parseBloodPressurePage('/bp'),{page:1,pageSize:20});
  assert.deepEqual(parseBloodPressurePage('/bp?page=2&pageSize=100'),{page:2,pageSize:100});
  for(const q of ['','page=0','page=-1','page=01','page=1.0','page=1e2','page=2147483648','pageSize=101','pageSize=','page=1&page=2','actor=x','%70age=1','page=%31','page=1&'])assert.throws(()=>parseBloodPressurePage('/bp?'+q));
});
test('BP OpenAPI projection, schema scope and historical migration bytes remain approved',async()=>{
  const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');
  const api=JSON.parse(await readFile('docs/openapi.json','utf8'));
  assert.deepEqual(Object.keys(api.components.schemas.BloodPressureMeasurement.properties).sort(),['id','patientId','systolic','diastolic','unit','measuredAt','createdAt','sourceKind'].sort());
  const path=api.paths['/api/v1/patients/{patientId}/blood-pressure-measurements'];assert.deepEqual(Object.keys(path).sort(),['get','head','post']);
  assert.equal(path.post.responses['201'].headers['Cache-Control'].schema.const,'no-store');assert.equal(path.head.responses['200'].content,undefined);
  const schema=await readFile('packages/db/prisma/schema.prisma','utf8'),bp=schema.split('model BloodPressureMeasurement {')[1].split('\n}')[0];
  assert.doesNotMatch(bp,/updatedAt|controlled|qualifying|eligibility|carePlanId|ruleDefinitionId|encounterId|metadata|externalReference/);
  assert.doesNotMatch(schema,/model (ClosureAssessment)/);
  for(const [name,hash] of [['20261012200810_eh005_identity_core_foundation','d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a'],['20261013014000_eh006_auth_sessions','2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b'],['20261013235221_eh009_clinical_definition_foundation','bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a'],['20261016000000_eh010_care_plan_lifecycle','47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38']])assert.equal(createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${name}/migration.sql`)).digest('hex'),hash);
});
