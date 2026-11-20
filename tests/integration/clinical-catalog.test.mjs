import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { isolatedCatalog, catalog, draft, insertSource, insertTemplate, insertRule, publish, snapshot, migrationNames } from '../support/clinical-catalog.mjs';
import { Pool, rejectsConstraint } from '../support/database.mjs';
import { createClinicalCatalogPersistence } from '../../packages/db/dist/index.js';
import { PrismaClient } from '../../packages/db/dist/generated/prisma/client.js';
import { validateClinicalDefinition } from '../../packages/clinical-rules/dist/index.js';
const require=createRequire(new URL('../../packages/db/package.json',import.meta.url));
const {PrismaPg}=require('@prisma/adapter-pg');
const sqlReject = async promise => assert.rejects(promise,e=>['23514','23505','23503','23001','40001'].includes(e.code));
const conflict = promise => assert.rejects(promise,e=>e.code==='CLINICAL_CATALOG_CONFLICT');

async function cli(url,args=[]) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/bootstrap-clinical-catalog.mjs',...args],{env:{...process.env,DATABASE_URL:url},stdio:['ignore','pipe','pipe']});let output='';
    child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});child.on('error',reject);child.on('close',code=>resolve({code,output}));
  });
}
test('catalog bootstrap first/repeat and inspection preserve exact source, trace, versions, rows and genuine audit',()=>isolatedCatalog(async({pool,store,url})=>{
  await conflict(store.inspectApprovedCatalog());
  const first=await store.bootstrapApprovedCatalog();
  assert.deepEqual(first.created,{sources:1,templates:1,rules:1});assert.equal(first.published,1);
  const state=await store.inspectApprovedCatalog();assert.deepEqual(state,first.state);
  assert.equal(state.template.status,'PUBLISHED');assert.equal(state.template.version,'1.0.0-draft');assert.equal(state.rule.ruleVersion,'1.0.0-draft');
  assert.equal(state.template.guidelineSourceId,state.source.id);assert.equal(state.rule.templateId,state.template.id);
  const expected=JSON.parse(await readFile('tests/fixtures/eh009-approved-definition.json','utf8'));assert.deepEqual(state.rule.definition,expected);
  for(const key of Object.keys(catalog.source))assert.deepEqual(state.source[key],catalog.source[key]);
  for(const ref of state.rule.definition.sourceReferences)assert.equal(ref.sourceKey,state.source.sourceKey);
  const before=await snapshot(pool);assert.equal(before.audit_logs.length,1);
  assert.equal(before.audit_logs[0].action_type,'CLINICAL_TEMPLATE_PUBLISHED');assert.equal(before.audit_logs[0].actor_user_id,null);
  assert.equal(before.audit_logs[0].entity_id,state.template.id);assert.equal(before.audit_logs[0].entity_type,'care_plan_template');assert.deepEqual(before.audit_logs[0].safe_metadata,{});
  const repeat=await store.bootstrapApprovedCatalog();assert.deepEqual(repeat.created,{sources:0,templates:0,rules:0});assert.equal(repeat.published,0);
  assert.deepEqual(await snapshot(pool),before);
  assert.deepEqual(Object.keys(store).sort(),['bootstrapApprovedCatalog','close','inspectApprovedCatalog','retireTemplateVersion']);
  const result=await cli(url);assert.equal(result.code,0);assert.equal(JSON.parse(result.output).published,0);assert.ok(!result.output.includes(url));
  assert.deepEqual(await snapshot(pool),before);
}));
for(const partial of ['source','template','rule'])test(`compatible partial ${partial} completes without replacing existing rows`,()=>isolatedCatalog(async({pool,store})=>{
  const source=await insertSource(pool);let template,rule;
  if(partial!=='source')template=await insertTemplate(pool,source.id);
  if(partial==='rule')rule=await insertRule(pool,template.id);
  const result=await store.bootstrapApprovedCatalog();assert.equal(result.state.source.id,source.id);
  if(template)assert.equal(result.state.template.id,template.id);if(rule)assert.equal(result.state.rule.id,rule.id);
  assert.deepEqual(result.created,{sources:0,templates:partial==='source'?1:0,rules:partial==='rule'?0:1});
}));
for(const mode of ['source','template','rule-version','template-version'])test(`conflicting ${mode} fails bootstrap/inspection without rewriting`,()=>isolatedCatalog(async({pool,store})=>{
  if(mode==='source')await insertSource(pool,{title:'Conflicting bibliographic title'});
  else if(mode==='template') {const s=await insertSource(pool);await insertTemplate(pool,s.id,{name:'Unapproved draft name'});}
  else await draft(pool,mode==='rule-version'?{rule:{ruleVersion:'2.0.0'}}:{template:{version:'2.0.0'}});
  const before=await snapshot(pool);await conflict(store.bootstrapApprovedCatalog());await conflict(store.inspectApprovedCatalog());assert.deepEqual(await snapshot(pool),before);
}));
test('all malformed/unknown/deviating JSON rejects consistently in application and PostgreSQL including writes',()=>isolatedCatalog(async({pool})=>{
  const s=await insertSource(pool),t=await insertTemplate(pool,s.id);
  const fixture=JSON.parse(await readFile('tests/fixtures/eh009-approved-definition.json','utf8'));
  const bad=[null,[],{},1,true,'text'];
  const alter=fn=>{const d=globalThis.structuredClone(fixture);fn(d);bad.push(d);};
  alter(d=>{d.schemaVersion='eh-cr-htn-fu-001/v2';});
  alter(d=>{d.trigger.systolic.value=141;});alter(d=>{d.trigger.diastolic.value=91;});alter(d=>{d.trigger.combination='ANY';});
  alter(d=>{d.applicability.age.value=17;});alter(d=>{d.applicability.missingOrUnknownRequiredFact='ASSUME_ELIGIBLE';});
  alter(d=>{d.timing.dueBy.value=7;});alter(d=>{d.timing.recommendedWindowStart.value=4;});
  alter(d=>{d.completion.followupTime.atOrBeforeDueBy=false;});alter(d=>{d.completion.bpAssessmentAssociatedWithFollowup='OPTIONAL';});
  alter(d=>{d.coverageRequirement.trueGapRequires='NONE';});alter(d=>{d.coverageRequirement.sufficiencyAlgorithm='INVENTED';});
  alter(d=>{d.sourceReferences[0].section='3.7';});alter(d=>{d.sourceReferences[1].sourceKey='EGYPTIAN-2014';});
  function walk(value,path=[]) {return value&&typeof value==='object'?[{value,path},...Object.entries(value).flatMap(([k,v])=>walk(v,[...path,k]))]:[];}
  const target=(d,path)=>path.reduce((o,k)=>o[k],d);
  for(const {value,path} of walk(fixture)) {
    if(Array.isArray(value))continue;
    alter(d=>{target(d,path).unexpected=true;});
    for(const key of Object.keys(value)) {
      alter(d=>{delete target(d,path)[key];});
      alter(d=>{target(d,path)[key]=null;});
    }
  }
  for(const value of bad) {
    assert.throws(()=>validateClinicalDefinition(value));
    assert.equal((await pool.query('SELECT eh009_is_htn_fu_v1($1::jsonb) AS valid',[JSON.stringify(value)])).rows[0].valid,false);
    await assert.rejects(insertRule(pool,t.id,{definition:value}),e=>e.code==='23514'&&e.constraint==='care_rule_definitions_definition_check');
  }
  await assert.rejects(pool.query("INSERT INTO care_rule_definitions(template_id,rule_key,rule_version,action_type,definition) VALUES($1,'CR-HTN-FU-001','1.0.0-draft','HTN_BP_FOLLOWUP','{bad'::jsonb)",[t.id]),e=>e.code==='22P02');
  assert.equal((await pool.query('SELECT count(*)::int n FROM care_rule_definitions')).rows[0].n,0);
}));
test('duplicate identities and RESTRICT FKs preserve version reservations',()=>isolatedCatalog(async({pool})=>{
  const d=await draft(pool);
  await assert.rejects(insertSource(pool),e=>e.code==='23505');
  await assert.rejects(insertSource(pool,{sourceKey:'OTHER'}),e=>e.code==='23505'&&e.constraint==='guideline_sources_publication_key');
  await assert.rejects(insertTemplate(pool,d.source.id),e=>e.code==='23505');
  await assert.rejects(insertTemplate(pool,d.source.id,{templateKey:'OTHER'}),e=>e.code==='23505'&&e.constraint==='care_plan_templates_name_version_key');
  await assert.rejects(insertRule(pool,d.template.id),e=>e.code==='23505');
  const other=await insertTemplate(pool,d.source.id,{version:'2.0.0'});
  await assert.rejects(insertRule(pool,other.id),e=>e.code==='23505'&&e.constraint==='care_rule_definitions_key_version_key');
  await assert.rejects(insertTemplate(pool,randomUUID(),{version:'3.0.0'}),e=>e.code==='23503');
  await assert.rejects(insertRule(pool,randomUUID(),{ruleVersion:'2.0.0'}),e=>e.code==='23503');
}));
for(const mode of ['template-version','rule-version','template-key','name','source'])test(`direct SQL cannot publish unapproved ${mode}`,()=>isolatedCatalog(async({pool})=>{
  const overrides={};
  if(mode==='template-version')overrides.template={version:'2.0.0'};
  if(mode==='rule-version')overrides.rule={ruleVersion:'2.0.0'};
  if(mode==='template-key')overrides.template={templateKey:'OTHER'};
  if(mode==='name')overrides.template={name:'Other name'};
  if(mode==='source')overrides.source={referenceIdentifier:null};
  const d=await draft(pool,overrides);await assert.rejects(publish(pool,d.template.id),e=>e.code==='23514'&&e.constraint==='care_plan_templates_publication_guard');
  assert.equal((await pool.query('SELECT status FROM care_plan_templates')).rows[0].status,'DRAFT');
}));
test('draft edits allowed; direct insertion, empty publication, identity mutation, and illegal draft retirement rejected',()=>isolatedCatalog(async({pool})=>{
  const s=await insertSource(pool);
  await sqlReject(insertTemplate(pool,s.id,{status:'PUBLISHED'}));await sqlReject(insertTemplate(pool,s.id,{status:'RETIRED'}));
  const t=await insertTemplate(pool,s.id);await sqlReject(publish(pool,t.id));
  await pool.query("UPDATE care_plan_templates SET name='Draft display edit' WHERE id=$1",[t.id]);
  assert.equal((await pool.query('SELECT name FROM care_plan_templates')).rows[0].name,'Draft display edit');
  await pool.query('UPDATE care_plan_templates SET name=$1 WHERE id=$2',[catalog.template.name,t.id]);
  const r=await insertRule(pool,t.id);await pool.query('UPDATE care_rule_definitions SET definition=definition WHERE id=$1',[r.id]);
  for(const [field,value] of [['id',randomUUID()],['template_key','OTHER'],['version','2.0.0'],['condition_domain','OTHER'],['guideline_source_id',randomUUID()],['created_at',new Date(0)],['updated_at',new Date(0)],['status','RETIRED']])await sqlReject(pool.query(`UPDATE care_plan_templates SET ${field}=$1 WHERE id=$2`,[value,t.id]));
  await publish(pool,t.id);
  assert.equal((await pool.query('SELECT status FROM care_plan_templates')).rows[0].status,'PUBLISHED');
}));
test('SQL and Prisma cannot mutate published/retired source or aggregate, repoint, insert members, delete, or truncate',()=>isolatedCatalog(async({pool,store,url})=>{
  const {state}=await store.bootstrapApprovedCatalog();
  const p=new Pool({connectionString:url}),client=new PrismaClient({adapter:new PrismaPg(p),log:[]});
  try {
    for(const retired of [false,true]) {
      if(retired)await store.retireTemplateVersion(state.template.id);
      for(const [table,id,changes] of [
        ['guideline_sources',state.source.id,[['id',randomUUID()],['title','Changed'],['source_key','OTHER'],['reference_url','https://unapproved.invalid'],['updated_at',new Date(0)]]],
        ['care_plan_templates',state.template.id,[['name','Changed'],['version','2.0.0'],['guideline_source_id',randomUUID()],['status',retired?'PUBLISHED':'DRAFT'],['published_at',new Date(0)],['updated_at',new Date(0)]]],
        ['care_rule_definitions',state.rule.id,[['id',randomUUID()],['template_id',randomUUID()],['rule_version','2.0.0'],['action_type','OTHER'],['definition','{}'],['updated_at',new Date(0)]]],
      ]) {
        for(const [field,value] of changes)await sqlReject(pool.query(`UPDATE ${table} SET ${field}=$1 WHERE id=$2`,[value,id]));
        await sqlReject(pool.query(`DELETE FROM ${table} WHERE id=$1`,[id]));
        await sqlReject(pool.query(`TRUNCATE ${table} CASCADE`));
      }
      await sqlReject(insertRule(pool,state.template.id,{ruleVersion:'2.0.0'}));
      await assert.rejects(client.carePlanTemplate.update({where:{id:state.template.id},data:{name:'Changed'}}));
      await assert.rejects(client.careRuleDefinition.updateMany({data:{definition:{}}}));
      await assert.rejects(client.guidelineSource.deleteMany());
      await assert.rejects(client.$executeRawUnsafe('TRUNCATE care_plan_templates CASCADE'));
      const before=await snapshot(pool);await pool.query('UPDATE care_plan_templates SET name=name');await pool.query('UPDATE care_rule_definitions SET definition=definition');assert.deepEqual(await snapshot(pool),before);
    }
    const end=await snapshot(pool);assert.deepEqual(end.audit_logs.map(a=>a.action_type).sort(),['CLINICAL_TEMPLATE_PUBLISHED','CLINICAL_TEMPLATE_RETIRED']);
    assert.equal(end.care_plan_templates[0].published_at.getTime(),state.template.publishedAt.getTime());
    await assert.rejects(store.bootstrapApprovedCatalog(),e=>e.code==='CLINICAL_CATALOG_RETIRED');await conflict(store.retireTemplateVersion(state.template.id));
    assert.deepEqual(await snapshot(pool),end);
  } finally {await client.$disconnect();await p.end();}
}));
test('DRAFT history cannot be deleted/truncated and source is immutable before publication',()=>isolatedCatalog(async({pool})=>{
  const d=await draft(pool);
  await sqlReject(pool.query("UPDATE guideline_sources SET publisher='Changed' WHERE id=$1",[d.source.id]));
  for(const table of ['guideline_sources','care_plan_templates','care_rule_definitions'])for(const statement of [`DELETE FROM ${table}`,`TRUNCATE ${table} CASCADE`])await sqlReject(pool.query(statement));
}));
for(const phase of ['late-rule','publication-audit','retirement-audit'])test(`failure at ${phase} rolls back entire operation`,()=>isolatedCatalog(async({pool,store})=>{
  let state;if(phase==='retirement-audit')state=(await store.bootstrapApprovedCatalog()).state;
  const table=phase==='late-rule'?'care_rule_definitions':'audit_logs';
  await pool.query(`CREATE FUNCTION reject_eh009_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$; CREATE TRIGGER fail_eh009_test BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION reject_eh009_test()`);
  const before=await snapshot(pool);
  await assert.rejects(state?store.retireTemplateVersion(state.template.id):store.bootstrapApprovedCatalog());
  assert.deepEqual(await snapshot(pool),before);
}));
test('concurrent bootstrap creates one aggregate and one publication audit',()=>isolatedCatalog(async({pool,store,url})=>{
  const other=createClinicalCatalogPersistence(url);
  try {const results=await Promise.all([store.bootstrapApprovedCatalog(),other.bootstrapApprovedCatalog()]);assert.deepEqual(results.map(r=>r.published).sort(),[0,1]);assert.deepEqual(results[0].state,results[1].state);assert.equal((await snapshot(pool)).audit_logs.length,1);}finally{await other.close();}
}));
// Block detection avoids sleeps and proves the second statement really overlaps the first.
async function waitBlocked(observer,pid) {
  for(let i=0;i<200;i++)if((await observer.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',[pid])).rows[0].blocked)return;
  assert.fail('concurrent statement did not reach a lock wait');
}
for(const isolation of ['READ COMMITTED','REPEATABLE READ','SERIALIZABLE'])test(`publish/edit and publish/retire races fail closed under ${isolation}`,()=>isolatedCatalog(async({pool})=>{
  const d=await draft(pool),a=await pool.connect(),b=await pool.connect();
  try {
    await a.query(`BEGIN ISOLATION LEVEL ${isolation}`);await b.query(`BEGIN ISOLATION LEVEL ${isolation}`);
    await b.query('SELECT * FROM care_plan_templates'); // establish stale snapshot
    await publish(a,d.template.id);
    const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const edit=b.query("UPDATE care_plan_templates SET name='Racing edit' WHERE id=$1",[d.template.id]).then(()=>({ok:true}),error=>({error}));
    await waitBlocked(pool,pid);await a.query('COMMIT');const result=await edit;assert.ok(result.error);assert.ok(['23514','40001'].includes(result.error.code));await b.query('ROLLBACK');
    await a.query(`BEGIN ISOLATION LEVEL ${isolation}`);await b.query(`BEGIN ISOLATION LEVEL ${isolation}`);await b.query('SELECT * FROM care_plan_templates');
    await a.query("UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1",[d.template.id]);
    const republish=publish(b,d.template.id).then(()=>({ok:true}),error=>({error}));await waitBlocked(pool,pid);await a.query('COMMIT');
    assert.ok((await republish).error);await b.query('ROLLBACK');
    assert.equal((await pool.query('SELECT status FROM care_plan_templates')).rows[0].status,'RETIRED');
  } finally {await a.query('ROLLBACK');await b.query('ROLLBACK');a.release();b.release();}
}));
test('stale REPEATABLE READ publisher after concurrent child insert rejects incomplete snapshot',()=>isolatedCatalog(async({pool})=>{
  const s=await insertSource(pool),t=await insertTemplate(pool,s.id),a=await pool.connect(),b=await pool.connect();
  try {
    await a.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await a.query('SELECT * FROM care_rule_definitions');
    await b.query('BEGIN');await insertRule(b,t.id);
    const pid=(await a.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const publishing=publish(a,t.id).then(()=>({ok:true}),error=>({error}));await waitBlocked(pool,pid);await b.query('COMMIT');
    assert.ok((await publishing).error);await a.query('ROLLBACK');await publish(pool,t.id);
  }finally{await a.query('ROLLBACK');await b.query('ROLLBACK');a.release();b.release();}
}));
test('stale REPEATABLE READ rule insert after publication cannot add a member',()=>isolatedCatalog(async({pool})=>{
  const d=await draft(pool),a=await pool.connect(),b=await pool.connect();
  try {
    await b.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await b.query('SELECT * FROM care_plan_templates');
    await a.query('BEGIN');await publish(a,d.template.id);
    const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const inserting=insertRule(b,d.template.id,{ruleVersion:'2.0.0'}).then(()=>({ok:true}),error=>({error}));await waitBlocked(pool,pid);await a.query('COMMIT');assert.equal((await inserting).error.code,'40001');
  }finally{await a.query('ROLLBACK');await b.query('ROLLBACK');a.release();b.release();}
}));
test('new catalog checks/indexes and historical SQL checksums remain exact',()=>isolatedCatalog(async({pool})=>{
  const hashes=['d8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a','2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b'];
  for(let i=0;i<2;i++)assert.equal(createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${migrationNames[i]}/migration.sql`)).digest('hex'),hashes[i]);
  const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  assert.deepEqual(tables,['_prisma_migrations','audit_logs','care_plan_templates','care_rule_definitions','clinician_patient_assignments','clinician_profiles','guideline_sources','patient_profiles','sessions','users']);
  const indexes=(await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('guideline_sources','care_plan_templates','care_rule_definitions') ORDER BY indexname")).rows.map(r=>r.indexname);
  assert.deepEqual(indexes,['care_plan_templates_key_version_key','care_plan_templates_name_version_key','care_plan_templates_pkey','care_plan_templates_source_idx','care_rule_definitions_key_version_key','care_rule_definitions_pkey','care_rule_definitions_template_rule_key','guideline_sources_pkey','guideline_sources_publication_key','guideline_sources_source_key_key']);
  const fn=(await pool.query("SELECT provolatile,prosecdef FROM pg_proc WHERE proname='eh009_is_htn_fu_v1'")).rows[0];assert.deepEqual(fn,{provolatile:'i',prosecdef:false});
  const d=await draft(pool);await sqlReject(insertRule(pool,d.template.id,{ruleKey:'CR-HTN-FU-002',ruleVersion:'2.0.0'}));
  assert.equal((await pool.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='care_rule_definitions' AND column_name='interpretation'")).rows[0].n,0);
}));
test('invalid migration ledger and CLI options fail safely without catalog writes',()=>isolatedCatalog(async({pool,store,url})=>{
  const before=await snapshot(pool);await pool.query("UPDATE _prisma_migrations SET checksum='bad' WHERE migration_name=$1",[migrationNames[2]]);
  await assert.rejects(store.bootstrapApprovedCatalog(),e=>e.code==='CLINICAL_CATALOG_MIGRATIONS_INVALID');assert.deepEqual(await snapshot(pool),before);
  const result=await cli(url,['--force']);assert.equal(result.code,1);assert.deepEqual(JSON.parse(result.output),{error:{code:'CLINICAL_CATALOG_INVALID'}});
  const unavailable=await cli('postgresql://private:secret@localhost:1/unavailable');assert.equal(unavailable.code,1);assert.ok(!unavailable.output.includes('secret'));assert.ok(!unavailable.output.includes('Error:'));
}));
// Named constraint helper proof also checks failed SQL does not poison the outer fixture.
test('source metadata shape and version syntax checks reject malformed DRAFT rows',()=>isolatedCatalog(async({pool})=>{
  const c=await pool.connect();try{await c.query('BEGIN');
    await rejectsConstraint(c,"INSERT INTO guideline_sources(source_key,title,publisher,publication_identity,publication_year) VALUES('X',' ','P','2021',2021)",[],'23514','guideline_sources_text_check');
    await rejectsConstraint(c,"INSERT INTO guideline_sources(source_key,title,publisher,publication_identity,publication_year) VALUES('X','T','P','2021',0)",[],'23514','guideline_sources_year_check');
    const s=await insertSource(c);
    await rejectsConstraint(c,"INSERT INTO care_plan_templates(template_key,name,condition_domain,version,guideline_source_id) VALUES('X','T','HYPERTENSION','01.0.0',$1)",[s.id],'23514','care_plan_templates_version_check');
  }finally{await c.query('ROLLBACK');c.release();}
}));
for(const isolation of ['READ COMMITTED','REPEATABLE READ'])test(`publication racing retirement is serialized or aborted under ${isolation}`,()=>isolatedCatalog(async({pool})=>{
  const d=await draft(pool),a=await pool.connect(),b=await pool.connect();
  try {
    await a.query('BEGIN');await b.query(`BEGIN ISOLATION LEVEL ${isolation}`);await b.query('SELECT * FROM care_plan_templates');
    await publish(a,d.template.id);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const retiring=b.query("UPDATE care_plan_templates SET status='RETIRED' WHERE id=$1",[d.template.id]).then(()=>({ok:true}),error=>({error}));
    await waitBlocked(pool,pid);await a.query('COMMIT');const result=await retiring;
    if(isolation==='READ COMMITTED') {assert.equal(result.ok,true);await b.query('COMMIT');}
    else {assert.equal(result.error.code,'40001');await b.query('ROLLBACK');}
  }finally{await a.query('ROLLBACK');await b.query('ROLLBACK');a.release();b.release();}
}));
test('Prisma direct publication rejects alternate versions and direct PUBLISHED insertion',()=>isolatedCatalog(async({pool,url})=>{
  const d=await draft(pool,{rule:{ruleVersion:'2.0.0'}});
  const p=new Pool({connectionString:url}),client=new PrismaClient({adapter:new PrismaPg(p),log:[]});
  try {
    await assert.rejects(client.carePlanTemplate.update({where:{id:d.template.id},data:{status:'PUBLISHED'}}),/exact approved clinical aggregate/);
    await assert.rejects(client.carePlanTemplate.create({data:{...catalog.template,version:'3.0.0',guidelineSourceId:d.source.id,status:'PUBLISHED'}}),/must start as DRAFT/);
  }finally{await client.$disconnect();await p.end();}
}));
test('bounded lock wait rolls bootstrap back and later invocation recovers',()=>isolatedCatalog(async({pool,store})=>{
  const c=await pool.connect();const before=await snapshot(pool);
  try {
    await c.query('BEGIN');await c.query('LOCK TABLE guideline_sources IN ACCESS EXCLUSIVE MODE');
    const started=Date.now();await assert.rejects(store.bootstrapApprovedCatalog());const elapsed=Date.now()-started;
    assert.ok(elapsed>=9000&&elapsed<20000);
  }finally{await c.query('ROLLBACK');c.release();}
  assert.deepEqual(await snapshot(pool),before);assert.equal((await store.bootstrapApprovedCatalog()).published,1);
}));
test('privileged pre-existing published drift is detected without repair or duplicate audit',()=>isolatedCatalog(async({pool,store})=>{
  await store.bootstrapApprovedCatalog();
  // Isolated fixture only: schema owners are outside the ordinary-write guarantee.
  await pool.query('ALTER TABLE care_plan_templates DISABLE TRIGGER care_plan_templates_write_guard');
  await pool.query("UPDATE care_plan_templates SET name='Privileged legacy drift'");
  await pool.query('ALTER TABLE care_plan_templates ENABLE TRIGGER care_plan_templates_write_guard');
  const before=await snapshot(pool);await conflict(store.bootstrapApprovedCatalog());await conflict(store.inspectApprovedCatalog());assert.deepEqual(await snapshot(pool),before);
}));
test('privileged pre-existing invalid JSON fails closed at bootstrap and inspection',()=>isolatedCatalog(async({pool,store})=>{
  await draft(pool);
  // Isolated corrupted-state fixture, never a production maintenance/reset path.
  await pool.query('ALTER TABLE care_rule_definitions DROP CONSTRAINT care_rule_definitions_definition_check');
  await pool.query("UPDATE care_rule_definitions SET definition=jsonb_set(definition,'{trigger,systolic,value}','150')");
  const before=await snapshot(pool);await conflict(store.bootstrapApprovedCatalog());await conflict(store.inspectApprovedCatalog());assert.deepEqual(await snapshot(pool),before);
}));
test('TEMP rule-table shadow cannot publish a template without a durable approved rule',()=>isolatedCatalog(async({pool})=>{
  const source=await insertSource(pool),template=await insertTemplate(pool,source.id),c=await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('CREATE TEMP TABLE care_rule_definitions AS SELECT * FROM public.care_rule_definitions WHERE false');
    await c.query('INSERT INTO care_rule_definitions(id,template_id,rule_key,rule_version,action_type,definition,created_at,updated_at) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5::jsonb,now(),now())',
      [template.id,catalog.rule.ruleKey,catalog.rule.ruleVersion,catalog.rule.actionType,JSON.stringify(catalog.rule.definition)]);
    await rejectsConstraint(c,"UPDATE public.care_plan_templates SET status='PUBLISHED' WHERE id=$1",[template.id],'23514','care_plan_templates_publication_guard');
    assert.equal((await c.query('SELECT count(*) FROM public.care_rule_definitions WHERE template_id=$1',[template.id])).rows[0].count,'0');
    assert.equal((await c.query('SELECT status FROM public.care_plan_templates WHERE id=$1',[template.id])).rows[0].status,'DRAFT');
  }finally{await c.query('ROLLBACK');c.release();}
}));
test('TEMP source and parent shadows cannot redirect rule guards',()=>isolatedCatalog(async({pool})=>{
  const source=await insertSource(pool,{sourceKey:'UNAPPROVED-SOURCE',publicationIdentity:'unapproved'}),template=await insertTemplate(pool,source.id,{version:'2.0.0'}),c=await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('CREATE TEMP TABLE guideline_sources AS SELECT * FROM public.guideline_sources WHERE false');
    await c.query('INSERT INTO guideline_sources SELECT * FROM public.guideline_sources WHERE id=$1',[source.id]);
    await c.query("UPDATE guideline_sources SET source_key='WHO-HTN-2021', publication_identity='2021'");
    await rejectsConstraint(c,'INSERT INTO public.care_rule_definitions(template_id,rule_key,rule_version,action_type,definition) VALUES($1,$2,$3,$4,$5::jsonb)',
      [template.id,catalog.rule.ruleKey,catalog.rule.ruleVersion,catalog.rule.actionType,JSON.stringify(catalog.rule.definition)],'23514','care_rule_definitions_source_guard');
    await c.query('DROP TABLE guideline_sources');
    const approved=await draft(pool);await publish(pool,approved.template.id);
    await c.query('CREATE TEMP TABLE care_plan_templates AS SELECT * FROM public.care_plan_templates WHERE false');
    await c.query('INSERT INTO care_plan_templates SELECT * FROM public.care_plan_templates WHERE id=$1',[approved.template.id]);
    await c.query("UPDATE care_plan_templates SET status='DRAFT'");
    await rejectsConstraint(c,'INSERT INTO public.care_rule_definitions(template_id,rule_key,rule_version,action_type,definition) VALUES($1,$2,$3,$4,$5::jsonb)',
      [approved.template.id,catalog.rule.ruleKey,catalog.rule.ruleVersion,catalog.rule.actionType,JSON.stringify(catalog.rule.definition)],'23514','care_rule_definitions_write_guard');
  }finally{await c.query('ROLLBACK');c.release();}
}));
