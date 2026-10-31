import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedI2Exit} from '../support/v3-i2-exit.mjs';
import {draftBody} from '../support/documentation.mjs';
import {migrationRunner} from '../support/migration-runner.mjs';

test('I2S7 populated latest-schema repeat deploy/status preserves all 48 domain tables and 19 ledger entries ZERO_WRITE',()=>isolatedI2Exit(async f=>{
  // Existing upgrade suites prove every historical stage. This final snapshot
  // adds populated Slice 6 sources, correction/link/privacy history and audit.
  const c=await f.readyIntent(), d=await f.documentation.execute('DRAFT',f.actors.clinician,{consultationId:c.id,...draftBody()});
  await f.documentation.execute('RELEASE',f.actors.clinician,{consultationId:c.id,documentId:d.data.id,expectedVersion:1,operationKey:randomUUID()});
  const intent=await f.released(c), b=await f.create(await f.publish(60));
  const linked=await f.command(c,intent,'LINK',{bookingId:b.id,expectedLinkVersion:0});
  await f.bookings.cancel(f.actors.patient,{bookingId:b.id,expectedVersion:1,operationKey:randomUUID()});
  const replacement=await f.create(await f.publish(120));
  await f.command(c,intent,'REPLACE',{bookingId:replacement.id,previousLinkId:linked.data.links[0].id,expectedLinkVersion:1});
  const corrected=await f.command(c,intent,'CORRECT',{instruction:'Retained human correction',desiredWindow:null,reason:'Synthetic correction',expectedVersion:2,predecessorId:intent.data.versions.at(-1).id});
  await f.command(c,intent,'PRIVACY',{versionIds:[corrected.data.versions.at(-1).id],reason:'Retained independent restriction'});
  const appointment=await f.appointments.createFollowUpAppointment(f.actors.clinician,{patientId:f.users.patient.profileId,scheduledAt:'2099-01-01T00:00:00.000Z',purpose:'HTN_BP_FOLLOWUP'});
  await f.appointments.cancelFollowUpAppointment(f.actors.clinician,{patientId:f.users.patient.profileId,appointmentId:appointment.id});
  const tables=(await f.pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  assert.equal(tables.length,49);
  const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await f.pool.query(`SELECT to_jsonb(x) value FROM public.${t} x ORDER BY to_jsonb(x)::text`)).rows])));
  const before=await snapshot();assert.equal(before._prisma_migrations.length,19);
  for(const t of ['follow_up_intents','follow_up_intent_versions','follow_up_intent_operations','follow_up_intent_booking_links','follow_up_intent_privacy_restrictions'])assert.ok(before[t].length>0,t);
  migrationRunner(f.url,'deploy',19);migrationRunner(f.url,'status',19);
  assert.deepEqual(await snapshot(),before);
  console.log('I2S7_POPULATED_REPEAT',JSON.stringify({migrations:19,domainTables:48,retainedRows:Object.entries(before).filter(([t])=>t!=='_prisma_migrations').reduce((n,[,rows])=>n+rows.length,0),allRowsAndLedgerUnchanged:true,result:'ZERO_WRITE'}));
},{realRunner:true,migrationCount:19}));
