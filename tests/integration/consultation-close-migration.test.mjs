import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {draftBody} from '../support/documentation.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';

test('I2S7 populated 19 to 20 preserves every prior source/ledger byte, adds no close facts and repeats ZERO_WRITE',()=>isolatedI2Exit(async f=>{
  const c=await f.readyIntent(),d=await f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...draftBody()});
  await f.documentation.execute('RELEASE',f.actors.clinician,{consultationId:c.id,documentId:d.data.id,expectedVersion:1,operationKey:randomUUID()});
  const intent=await f.released(c),b=await f.create(await f.publish(60));await f.command(c,intent,'LINK',{bookingId:b.id,expectedLinkVersion:0});
  const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);assert.equal(tables.length,49);
  const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])));
  const before=await snapshot(),ledger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;assert.equal(ledger.length,19);
  migrationRunner(f.url,'deploy',20);migrationRunner(f.url,'status',20);
  const after=await snapshot();
  for(const table of tables.filter(t=>t!=='_prisma_migrations')) {
    const rows=after[table].map(r=>{const v={...r.value};if(table==='consultations')for(const key of ['version','closed_at','closed_by_user_id','close_assignment_id','close_operation_key','close_command'])delete v[key];return{value:v};});
    assert.deepEqual(rows,before[table],table);
  }
  const nextLedger=(await f.pool.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;assert.equal(nextLedger.length,20);assert.deepEqual(nextLedger.slice(0,19),ledger);
  for(const row of nextLedger)assert.equal(row.checksum,createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
  const old=(await f.pool.query('SELECT * FROM consultations WHERE id=$1',[c.id])).rows[0];assert.equal(old.state,'OPEN');assert.equal(old.version,1);
  for(const key of ['closed_at','closed_by_user_id','close_assignment_id','close_operation_key','close_command'])assert.equal(old[key],null);
  assert.equal((await f.pool.query("SELECT count(*)::int n FROM booking_events WHERE command='CLOSE'")).rows[0].n,0);
  migrationRunner(f.url,'deploy',20);migrationRunner(f.url,'status',20);assert.deepEqual(await snapshot(),after);
  await f.consultations.closeConsultation(f.actors.clinician,{consultationId:c.id,expectedVersion:1,operationKey:randomUUID()});
  const closed=await snapshot();migrationRunner(f.url,'deploy',20);migrationRunner(f.url,'status',20);assert.deepEqual(await snapshot(),closed);
  console.log('I2S7_CLOSE_POPULATED_UPGRADE',JSON.stringify({from:19,to:20,domainTables:48,retainedRows:Object.entries(before).filter(([k])=>k!=='_prisma_migrations').reduce((n,[,r])=>n+r.length,0),allHistoricalValuesAndChecksumsUnchanged:true,fabricatedCloseFacts:0,openRepeat:'ZERO_WRITE',closedRepeat:'ZERO_WRITE'}));
},{realRunner:true,migrationCount:19}));
