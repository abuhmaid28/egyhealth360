import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APPROVED_CLINICAL_CATALOG as catalog, validateClinicalDefinition } from '../packages/clinical-rules/dist/index.js';

const fixture = JSON.parse(await readFile('tests/fixtures/eh009-approved-definition.json','utf8'));
test('approved clinical manifest equals the reviewed fixture; source/version/section identities remain exact', () => {
  assert.deepEqual(catalog.rule.definition, fixture);
  assert.deepEqual(catalog.source, {sourceKey:'WHO-HTN-2021', title:'Guideline for the pharmacological treatment of hypertension in adults',publisher:'World Health Organization',publicationIdentity:'2021',publicationYear:2021,referenceIdentifier:'ISBN:978-92-4-003398-6',referenceUrl:null});
  assert.equal(catalog.rule.ruleVersion,'1.0.0-draft'); assert.equal(catalog.template.version,'1.0.0-draft');
  assert.deepEqual(catalog.rule.definition.sourceReferences.map(s=>[s.section,s.recommendation,s.purpose]),[['3.6',6,'CONTROL_TARGET'],['3.7',7,'FOLLOWUP_INTERVAL']]);
  assert.equal(validateClinicalDefinition(JSON.parse(JSON.stringify(fixture))),catalog.rule.definition);
  assert.throws(()=>{catalog.rule.definition.trigger.systolic.value=150;});
});
function objects(value) { return value && typeof value==='object' ? [value,...Object.values(value).flatMap(objects)] : []; }
test('strict validator rejects missing/extra properties at every depth, wrong types and unknown schemas', () => {
  for (const bad of [null,[],true,1,'definition',{}, {...fixture,schemaVersion:'unknown'}]) assert.throws(()=>validateClinicalDefinition(bad));
  const nodes=objects(fixture);
  for(let i=0;i<nodes.length;i++) {
    if(Array.isArray(nodes[i])) continue;
    for(const key of Object.keys(nodes[i])) {
      const missing=globalThis.structuredClone(fixture);delete objects(missing)[i][key];assert.throws(()=>validateClinicalDefinition(missing));
      const wrong=globalThis.structuredClone(fixture);objects(wrong)[i][key]=null;assert.throws(()=>validateClinicalDefinition(wrong));
    }
    const extra=globalThis.structuredClone(fixture);objects(extra)[i].unexpected=true;assert.throws(()=>validateClinicalDefinition(extra));
  }
  const getter=globalThis.structuredClone(fixture);Object.defineProperty(getter,'domain',{get(){throw new Error('getter executed');},enumerable:true});
  assert.throws(()=>validateClinicalDefinition(getter),/CLINICAL_CATALOG_INVALID/);
});
test('representation declares only the approved rule and deferred behaviors without evaluator/code execution', async () => {
  const source=await readFile('packages/clinical-rules/src/index.ts','utf8');
  assert.doesNotMatch(source,/\beval\s*\(|new Function\b|CR-HTN-FU-002/);
  assert.equal(fixture.scheduleEvidence.finalScheduledDecisionContract,'DEFERRED');
  assert.equal(fixture.coverageRequirement.sufficiencyAlgorithm,'DEFERRED');
  assert.equal(fixture.exemptionPolicy.manualWorkflow,'DEFERRED');
  assert.equal(fixture.completion.beforeRecommendedWindowStartAllowed,true);
  const reordered=Object.fromEntries(Object.entries(fixture).reverse());assert.equal(validateClinicalDefinition(reordered),catalog.rule.definition);
});
