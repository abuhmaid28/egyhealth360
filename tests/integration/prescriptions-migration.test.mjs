import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedConsultations} from '../support/consultations.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';
import {createDocumentationPersistence,createFollowUpIntentPersistence} from '../../packages/db/dist/index.js';
import {draftBody} from '../support/documentation.mjs';
import {intentBody} from '../support/follow-up-intents.mjs';
test('I3S1 populated main 20 to 21 preserves every historical row/checksum and backfills zero clinical sources; repeat ZERO_WRITE',()=>isolatedConsultations(async f=>{
 const c=await f.open(await f.ready()),docs=createDocumentationPersistence(f.url),intents=createFollowUpIntentPersistence(f.url);
 try {
 const d=await docs.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...draftBody()});await docs.execute('RELEASE',f.actors.clinician,{consultationId:c.id,documentId:d.data.id,expectedVersion:1,operationKey:randomUUID()});
 const i=await intents.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...intentBody()});await intents.execute('RELEASE',f.actors.clinician,{consultationId:c.id,intentId:i.data.id,expectedVersion:1,operationKey:randomUUID()});await f.consultations.closeConsultation(f.actors.clinician,{consultationId:c.id,expectedVersion:1,operationKey:randomUUID()});
 const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);assert.equal(tables.length,49);
 const snapshot=async names=>Object.fromEntries(await Promise.all(names.map(async t=>[t,(await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])));
 const before=await snapshot(tables),ledger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;assert.equal(ledger.length,20);
 migrationRunner(f.url,'deploy',21);migrationRunner(f.url,'status',21);
 for(const t of tables.filter(t=>t!=='_prisma_migrations'))assert.deepEqual((await snapshot([t]))[t],before[t],t);
 const afterLedger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;assert.equal(afterLedger.length,21);assert.deepEqual(afterLedger.slice(0,20),ledger);
 for(const row of afterLedger)assert.equal(row.checksum,createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
 for(const t of ['prescriptions','prescription_versions','prescription_items','prescription_version_items','prescription_operations','prescription_privacy_restrictions','medication_operations'])assert.equal((await f.pool.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n,0);
 assert.equal((await f.pool.query('SELECT count(*)::int n FROM medications')).rows[0].n,3);
 const all=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename),final=await snapshot(all);assert.equal(all.length,58);migrationRunner(f.url,'deploy',21);migrationRunner(f.url,'status',21);assert.deepEqual(await snapshot(all),final);
 console.log('I3S1_POPULATED_UPGRADE',JSON.stringify({from:20,to:21,historicalTables:48,newTables:9,allHistoricalRowsAndChecksumsPreserved:true,fabricatedClinicalSources:0,curatedCatalogEntries:3,repeatDeploy:'ZERO_WRITE'}));
 }finally{await docs.close();await intents.close();}
},{realRunner:true,migrationCount:20}));
