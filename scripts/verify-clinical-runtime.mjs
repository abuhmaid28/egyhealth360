import assert from 'node:assert/strict';
import { createClinicalCatalogPersistence } from '../packages/db/dist/index.js';

// Explicit invocation against the already migrated disposable runtime DB only.
const store=createClinicalCatalogPersistence(process.env.DATABASE_URL);
try {
  const first=await store.bootstrapApprovedCatalog();
  const before=await store.inspectApprovedCatalog();
  const second=await store.bootstrapApprovedCatalog();
  assert.equal(before.template.status,'PUBLISHED');
  assert.deepEqual(second.created,{sources:0,templates:0,rules:0});assert.equal(second.published,0);
  assert.deepEqual(await store.inspectApprovedCatalog(),before);
  assert.equal(first.state.rule.ruleKey,'CR-HTN-FU-001');
  console.log('Clinical runtime approved bootstrap/inspect/zero-write repeat PASS');
} catch {console.error('CLINICAL_RUNTIME_FAILED');process.exitCode=1;}
finally {await store.close();}
