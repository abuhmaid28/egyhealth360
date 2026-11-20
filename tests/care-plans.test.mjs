import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projectDeferredActionSpecification, APPROVED_CLINICAL_CATALOG as catalog } from '../packages/clinical-rules/dist/index.js';
test('deferred projection is exact, immutable, deterministic and accepts only the approved definition',()=>{
  const expected={actionType:'HTN_BP_FOLLOWUP',triggerRequirement:'QUALIFYING_OBSERVED_BP_ASSESSMENT',timing:{recommendedWindowStart:{operation:'ADD_CALENDAR_MONTHS',value:3},dueBy:{operation:'ADD_CALENDAR_MONTHS',value:6}},persistence:'DEFERRED',unmetGates:['PERSISTED_QUALIFYING_EVIDENCE','APPROVED_CALENDAR_ARITHMETIC','OCCURRENCE_RETRIGGER_SELECTION']};
  assert.deepEqual(projectDeferredActionSpecification(catalog.rule.definition),expected);
  assert.deepEqual(projectDeferredActionSpecification(globalThis.structuredClone(catalog.rule.definition)),expected);
  for(const invalid of [{}, {...catalog.rule.definition,bp:120}, {...catalog.rule.definition,eligible:true}])assert.throws(()=>projectDeferredActionSpecification(invalid));
  assert.throws(()=>{projectDeferredActionSpecification(catalog.rule.definition).timing.dueBy.value=180;});
});
test('EH-010 schema and API contain no action/evidence/completion or product route expansion',async()=>{
  const schema=await readFile('packages/db/prisma/schema.prisma','utf8');
  assert.doesNotMatch(schema,/model (ClosureAssessment)/);
  const plan=schema.split('model CarePlan {')[1].split('\n}')[0];assert.doesNotMatch(plan,/updatedAt|completedAt|cancellationReason|templateVersion|ruleVersion/);
  assert.match(schema,/enum CarePlanStatus \{\s+DRAFT\s+ACTIVE\s+CANCELLED\s+@@map/);
  const api=await readFile('apps/api/src/app.ts','utf8');assert.doesNotMatch(api,/CarePlan|care-plans/);
});
