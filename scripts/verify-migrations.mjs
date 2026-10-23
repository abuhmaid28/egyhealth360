import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Pool } from '../tests/support/database.mjs';
import { mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { seedCommand } from './lib/m1-demo.mjs';
import { verifyCommand } from './lib/m1-verify.mjs';
import { createApp } from '../apps/api/dist/app.js';
import { createPasswordVerifier } from '../apps/api/dist/password.js';
import { authConfiguration } from '../packages/config/dist/index.js';
import { createDatabase, createAuthPersistence, createAuthorizationPersistence, createClinicalCatalogPersistence, createCarePlanPersistence, createBloodPressureMeasurementPersistence, createFollowUpAppointmentPersistence, createClinicalEncounterPersistence } from '../packages/db/dist/index.js';

// Intentionally refuses nonempty databases. Use only disposable local/CI DBs.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = await pool.connect();
function prisma(command, extra = [], databaseUrl = process.env.DATABASE_URL) {
  const result = spawnSync('pnpm', ['--filter', '@egyhealth/db', 'exec', 'prisma', 'migrate', command, ...extra], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl } });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `prisma migrate ${command} failed`);
}
try {
  const tables = await connection.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  assert.equal(tables.rowCount, 0, 'Migration verification requires a clean disposable database');
  prisma('deploy');
  prisma('status');
  const before = (await connection.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
  assert.deepEqual(before.map(row => row.migration_name), ['20261012200810_eh005_identity_core_foundation', '20261013014000_eh006_auth_sessions', '20261013235221_eh009_clinical_definition_foundation', '20261016000000_eh010_care_plan_lifecycle', '20261017000000_eh011_bp_provenance', '20261018000000_eh012_followup_encounters', '20261019000000_eh013_record_coverage_windows', '20261020000000_eh015_observed_clinical_applicability', '20261021000000_bp_correction_invalidation', '20261022000000_eh014_initial_care_action', '20261023000000_v3_i1_staff_roles', '20261023000100_v3_i1_organizations']);
  for (const row of before) assert.equal(row.checksum, createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
  assert.equal(before[0].checksum, 'd8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a');
  assert.equal(before[1].checksum, '2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b');
  assert.equal(before[2].checksum, 'bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a');
  assert.equal(before[3].checksum, '47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38');
  assert.equal(before[4].checksum, '5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21');
  assert.equal(before[5].checksum, '7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01');
  assert.equal(before[6].checksum, 'f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b');
  assert.equal(before[7].checksum, '49b5afca8d394e7f501a111409eb39dcba65166f8ef22f39a954028de8f9ea69');
  assert.ok(before.every(row => row.finished_at && row.rolled_back_at === null));
  await connection.query('BEGIN');
  const sentinel = (await connection.query(`INSERT INTO users(email, password_hash, role)
    VALUES ('migration-sentinel@example.invalid', 'synthetic-test-hash', 'ADMIN') RETURNING *`)).rows[0];
  prisma('deploy');
  prisma('status');
  assert.deepEqual((await connection.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, before);
  assert.deepEqual((await connection.query('SELECT * FROM users WHERE id = $1', [sentinel.id])).rows[0], sentinel);
  await connection.query('ROLLBACK');
  console.log('Fresh migration and second deploy verified; sentinel rolled back');
  // Upgrade an isolated database using only the unchanged EH-005 migration first.
  const directory = await mkdtemp(join(tmpdir(), 'eh006-upgrade-'));
  const name = `eh006_upgrade_${randomUUID().replaceAll('-', '')}`;
  const upgradeUrl = new URL(process.env.DATABASE_URL);
  upgradeUrl.pathname = `/${name}`;
  let upgrade;
  try {
    await connection.query(`CREATE DATABASE ${name}`);
    await mkdir(join(directory, 'migrations'));
    await cp('packages/db/prisma/schema.prisma', join(directory, 'schema.prisma'));
    await cp('packages/db/prisma/migrations/migration_lock.toml', join(directory, 'migrations/migration_lock.toml'));
    await cp('packages/db/prisma/migrations/20261012200810_eh005_identity_core_foundation', join(directory, 'migrations/20261012200810_eh005_identity_core_foundation'), { recursive: true });
    const schema = ['--schema', join(directory, 'schema.prisma')];
    prisma('deploy', schema, upgradeUrl.toString());
    upgrade = new Pool({ connectionString: upgradeUrl.toString() });
    const identity = (await upgrade.query(`INSERT INTO users(email,password_hash,role) VALUES ('upgrade@example.invalid','synthetic-test-hash','PATIENT') RETURNING *`)).rows[0];
    const clinician = (await upgrade.query(`INSERT INTO users(email,password_hash,role) VALUES ('clinician@example.invalid','synthetic-test-hash','CLINICIAN') RETURNING *`)).rows[0];
    const patient = (await upgrade.query(`INSERT INTO patient_profiles(user_id,display_name) VALUES ($1,'Synthetic') RETURNING *`, [identity.id])).rows[0];
    const profile = (await upgrade.query(`INSERT INTO clinician_profiles(user_id,display_name) VALUES ($1,'Synthetic') RETURNING *`, [clinician.id])).rows[0];
    await upgrade.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES ($1,$2)', [profile.id, patient.id]);
    await upgrade.query(`INSERT INTO audit_logs(actor_user_id,action_type,entity_type,entity_id) VALUES ($1,'UPGRADE_TEST','user',$1)`, [identity.id]);
    const retainedTables = ['users', 'patient_profiles', 'clinician_profiles', 'clinician_patient_assignments', 'audit_logs'];
    const retained = await Promise.all(retainedTables.map(table => upgrade.query(`SELECT * FROM ${table} ORDER BY id`)));
    await cp('packages/db/prisma/migrations/20261013014000_eh006_auth_sessions', join(directory, 'migrations/20261013014000_eh006_auth_sessions'), { recursive: true });
    prisma('deploy', schema, upgradeUrl.toString());
    prisma('status', schema, upgradeUrl.toString());
    for (let i = 0; i < retainedTables.length; i++) assert.deepEqual((await upgrade.query(`SELECT * FROM ${retainedTables[i]} ORDER BY id`)).rows, retained[i].rows);
    const migrations = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(migrations.length, 2);
    prisma('deploy', schema, upgradeUrl.toString());
    prisma('status', schema, upgradeUrl.toString());
    assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, migrations);
    console.log('EH-005 upgrade preserved identity/profile/assignment/audit rows; second deploy unchanged');

    // Preserve the EH-005 -> EH-006 proof above, then upgrade a populated M1 baseline.
    const env = { ...process.env, DATABASE_URL: upgradeUrl.toString(), NODE_ENV: 'test', EH_DEMO_SEED_ENABLED: '1', EH_DEMO_PASSWORD: randomBytes(32).toString('base64url'), AUTH_BROWSER_ORIGIN: 'http://localhost:3000' };
    await seedCommand(env);
    const db = createDatabase(env.DATABASE_URL), auth = createAuthPersistence(env.DATABASE_URL), authorization = createAuthorizationPersistence(env.DATABASE_URL);
    const app = await createApp(db, { store: auth, passwords: await createPasswordVerifier(), config: authConfiguration(env) }, authorization);
    try {
      await app.listen(0, '127.0.0.1'); env.M1_API_BASE_URL = await app.getUrl();
      await verifyCommand(env); // Creates genuine sessions/audits on the M1-only baseline.
      const allM1 = [...retainedTables, 'sessions'];
      const seeded = await Promise.all(allM1.map(table => upgrade.query(`SELECT * FROM ${table} ORDER BY id`)));
      const oldLedger = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      await cp('packages/db/prisma/migrations/20261013235221_eh009_clinical_definition_foundation', join(directory, 'migrations/20261013235221_eh009_clinical_definition_foundation'), { recursive: true });
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      for (let i = 0; i < allM1.length; i++) assert.deepEqual((await upgrade.query(`SELECT * FROM ${allM1[i]} ORDER BY id`)).rows, seeded[i].rows);
      const newLedger = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(newLedger.length, 3); assert.deepEqual(newLedger.slice(0, 2), oldLedger);
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, newLedger);
      for (let i = 0; i < allM1.length; i++) assert.deepEqual((await upgrade.query(`SELECT * FROM ${allM1[i]} ORDER BY id`)).rows, seeded[i].rows);
      assert.deepEqual((await seedCommand(env)).created, { users: 0, profiles: 0, assignments: 0 });
      assert.equal((await verifyCommand(env)).result, 'PASS');
      const catalog = createClinicalCatalogPersistence(env.DATABASE_URL);
      try { await catalog.bootstrapApprovedCatalog(); } finally { await catalog.close(); }
      const retainedAll = [...allM1, 'guideline_sources', 'care_plan_templates', 'care_rule_definitions'];
      const baselineRows = await Promise.all(retainedAll.map(table => upgrade.query(`SELECT * FROM ${table} ORDER BY id`)));
      const baselineLedger = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      await cp('packages/db/prisma/migrations/20261016000000_eh010_care_plan_lifecycle', join(directory, 'migrations/20261016000000_eh010_care_plan_lifecycle'), { recursive: true });
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      for (let i=0;i<retainedAll.length;i++) assert.deepEqual((await upgrade.query(`SELECT * FROM ${retainedAll[i]} ORDER BY id`)).rows, baselineRows[i].rows);
      const finalLedger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(finalLedger.length,4); assert.deepEqual(finalLedger.slice(0,3),baselineLedger);
      assert.equal(finalLedger[2].checksum,'bf341361c12c50741987ee68d50c4ee7f80637adabc2f52f3fee77aa0c81af2a');
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,finalLedger);
      for (let i=0;i<retainedAll.length;i++) assert.deepEqual((await upgrade.query(`SELECT * FROM ${retainedAll[i]} ORDER BY id`)).rows, baselineRows[i].rows);
      assert.deepEqual((await seedCommand(env)).created,{users:0,profiles:0,assignments:0});
      assert.equal((await verifyCommand(env)).result,'PASS');
      // Populate every EH-010 lifecycle state before the EH-011 upgrade.
      const demoState = (await seedCommand(env));
      assert.deepEqual(demoState.created,{users:0,profiles:0,assignments:0});
      const clinicianUser=(await upgrade.query("SELECT * FROM users WHERE email='eh-m1-clinician-assigned@example.invalid'")).rows[0];
      const patientId=(await upgrade.query("SELECT id FROM patient_profiles WHERE user_id=(SELECT id FROM users WHERE email='eh-m1-patient-a@example.invalid')")).rows[0].id;
      const tokenHash=randomBytes(32).toString('hex');
      const actor=await auth.createSession({userId:clinicianUser.id,verifiedHash:clinicianUser.password_hash,tokenHash,previousHash:null});
      const plans=createCarePlanPersistence(env.DATABASE_URL);
      try {
        const draft=await plans.createDraftPlan(actor,{patientId});
        const active=await plans.createDraftPlan(actor,{patientId});await plans.activatePlan(actor,{patientId,planId:active.id});
        const cancelled=await plans.createDraftPlan(actor,{patientId});await plans.cancelPlan(actor,{patientId,planId:cancelled.id});
        assert.equal((await plans.inspectPlan(actor,{patientId,planId:draft.id})).status,'DRAFT');
      } finally {await plans.close();await auth.revoke(tokenHash);}
      const eh010Tables=[...retainedAll,'care_plans'];
      const eh010Rows=await Promise.all(eh010Tables.map(table=>upgrade.query(`SELECT * FROM ${table} ORDER BY id`)));
      const eh010Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      await cp('packages/db/prisma/migrations/20261017000000_eh011_bp_provenance',join(directory,'migrations/20261017000000_eh011_bp_provenance'),{recursive:true});
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      const eh011Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(eh011Ledger.length,5);assert.deepEqual(eh011Ledger.slice(0,4),eh010Ledger);
      assert.equal(eh011Ledger[3].checksum,'47cfa990e016bae42e07875b99c3400f2783c91bcaae234994ac7e32e0822c38');
      assert.equal((await upgrade.query('SELECT count(*)::int n FROM blood_pressure_measurements')).rows[0].n,0);
      for(let i=0;i<eh010Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM ${eh010Tables[i]} ORDER BY id`)).rows,eh010Rows[i].rows);
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,eh011Ledger);
      for(let i=0;i<eh010Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM ${eh010Tables[i]} ORDER BY id`)).rows,eh010Rows[i].rows);
      assert.equal((await verifyCommand(env)).result,'PASS');
      // Populate retained EH-011 evidence/provenance before the additive EH-012 upgrade.
      const bp=createBloodPressureMeasurementPersistence(env.DATABASE_URL);
      const freshHash=randomBytes(32).toString('hex');
      const clinicianActor=await auth.createSession({userId:clinicianUser.id,verifiedHash:clinicianUser.password_hash,tokenHash:freshHash,previousHash:null});
      const patientUser=(await upgrade.query("SELECT * FROM users WHERE email='eh-m1-patient-a@example.invalid'")).rows[0];
      const patientHash=randomBytes(32).toString('hex');
      const patientActor=await auth.createSession({userId:patientUser.id,verifiedHash:patientUser.password_hash,tokenHash:patientHash,previousHash:null});
      try {
        for(const principal of [clinicianActor,patientActor])await bp.createBloodPressureMeasurement(principal,{patientId,systolic:128,diastolic:82,unit:'mmHg',measuredAt:'2024-02-29T00:00:00.000Z'});
      }finally{await bp.close();await auth.revoke(freshHash);await auth.revoke(patientHash);}
      const eh011Tables=[...eh010Tables,'blood_pressure_measurements'];
      const eh011Rows=await Promise.all(eh011Tables.map(table=>upgrade.query(`SELECT * FROM public.${table} ORDER BY id`)));
      const oldEh011Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      await cp('packages/db/prisma/migrations/20261018000000_eh012_followup_encounters',join(directory,'migrations/20261018000000_eh012_followup_encounters'),{recursive:true});
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      const eh012Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(eh012Ledger.length,6);assert.deepEqual(eh012Ledger.slice(0,5),oldEh011Ledger);
      assert.equal(eh012Ledger[4].checksum,'5383cc5f606a73959194f0615ac6525b211a8719d41ef2dc1542a6205bdc3e21');
      for(const table of ['follow_up_appointments','clinical_encounters','encounter_bp_associations'])assert.equal((await upgrade.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n,0);
      for(let i=0;i<eh011Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh011Tables[i]} ORDER BY id`)).rows,eh011Rows[i].rows);
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,eh012Ledger);
      for(let i=0;i<eh011Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh011Tables[i]} ORDER BY id`)).rows,eh011Rows[i].rows);
      assert.equal((await verifyCommand(env)).result,'PASS');
      assert.deepEqual((await seedCommand(env)).created,{users:0,profiles:0,assignments:0});
      // Retain meaningful operational rows and the exact encounter→BP link across
      // both later upgrades, rather than comparing only empty evidence tables.
      const followups = createFollowUpAppointmentPersistence(env.DATABASE_URL);
      const encounters = createClinicalEncounterPersistence(env.DATABASE_URL);
      const upgradeToken = randomBytes(32).toString('hex');
      const upgradeActor = await auth.createSession({ userId: clinicianUser.id,
        verifiedHash: clinicianUser.password_hash, tokenHash: upgradeToken, previousHash: null });
      try {
        await followups.createFollowUpAppointment(upgradeActor, { patientId,
          scheduledAt: '2099-01-01T00:00:00.000Z', purpose: 'HTN_BP_FOLLOWUP' });
        const encounter = await encounters.createClinicalEncounter(upgradeActor, { patientId,
          occurredAt: '2024-02-29T00:00:00.000Z', purpose: 'HTN_BP_FOLLOWUP' });
        const retainedBp = (await upgrade.query('SELECT id FROM blood_pressure_measurements WHERE patient_id=$1 ORDER BY id LIMIT 1', [patientId])).rows[0];
        // Populate the old executable contract before deploying the new read dependencies.
        await upgrade.query('INSERT INTO public.encounter_bp_associations(patient_id,encounter_id,blood_pressure_measurement_id,recorded_by_user_id) VALUES($1,$2,$3,$4)',
          [patientId, encounter.id, retainedBp.id, upgradeActor.userId]);
      } finally { await followups.close(); await encounters.close(); await auth.revoke(upgradeToken); }
      const eh012Tables=[...eh011Tables,'follow_up_appointments','clinical_encounters','encounter_bp_associations'];
      const eh012Rows=await Promise.all(eh012Tables.map(table=>upgrade.query(`SELECT * FROM public.${table} ORDER BY id`)));
      await cp('packages/db/prisma/migrations/20261019000000_eh013_record_coverage_windows',join(directory,'migrations/20261019000000_eh013_record_coverage_windows'),{recursive:true});
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      const eh013Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(eh013Ledger.length,7);assert.deepEqual(eh013Ledger.slice(0,6),eh012Ledger);
      assert.equal(eh013Ledger[5].checksum,'7df16c1ccf5c9985b3a375b103d54041cad5051e1f23dea5104f4c3149bbbe01');
      assert.equal(eh013Ledger[6].checksum,'f59b690059bcb2cd99a9b67dc55c2f84758c495c90b218f52c1c75f54f770d1b');
      assert.equal((await upgrade.query('SELECT count(*)::int n FROM public.record_coverage_windows')).rows[0].n,0);
      for(let i=0;i<eh012Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh012Tables[i]} ORDER BY id`)).rows,eh012Rows[i].rows);
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,eh013Ledger);
      for(let i=0;i<eh012Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh012Tables[i]} ORDER BY id`)).rows,eh012Rows[i].rows);
      assert.equal((await verifyCommand(env)).result,'PASS');
      assert.deepEqual((await seedCommand(env)).created,{users:0,profiles:0,assignments:0});

      // Populate coverage evidence before the additive EH-015 upgrade.
      await upgrade.query(`
        INSERT INTO public.record_coverage_windows (
          patient_id, source_type, source_reference, coverage_status, start_at, end_at
        ) VALUES (
          $1, 'SYNTHETIC_BENCHMARK', 'upgrade-source-1', 'COMPLETE',
          TIMESTAMPTZ '2026-01-01 00:00:00+00', TIMESTAMPTZ '2026-06-01 00:00:00+00'
        )
      `, [patientId]);
      const eh013Tables = [...eh012Tables, 'record_coverage_windows'];
      const eh013Rows = await Promise.all(eh013Tables.map(table => upgrade.query(`SELECT * FROM public.${table} ORDER BY id`)));
      await cp('packages/db/prisma/migrations/20261020000000_eh015_observed_clinical_applicability', join(directory, 'migrations/20261020000000_eh015_observed_clinical_applicability'), { recursive: true });
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      const eh015Ledger = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(eh015Ledger.length, 8); assert.deepEqual(eh015Ledger.slice(0, 7), eh013Ledger);
      assert.equal(eh015Ledger[7].checksum, '49b5afca8d394e7f501a111409eb39dcba65166f8ef22f39a954028de8f9ea69');
      for (const table of ['observed_applicability_snapshots', 'observed_applicability_retractions']) {
        assert.equal((await upgrade.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n, 0);
      }
      for (let i = 0; i < eh013Tables.length; i++) assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh013Tables[i]} ORDER BY id`)).rows, eh013Rows[i].rows);
      prisma('deploy', schema, upgradeUrl.toString()); prisma('status', schema, upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, eh015Ledger);
      for (let i = 0; i < eh013Tables.length; i++) assert.deepEqual((await upgrade.query(`SELECT * FROM public.${eh013Tables[i]} ORDER BY id`)).rows, eh013Rows[i].rows);
      assert.equal((await verifyCommand(env)).result, 'PASS');
      assert.deepEqual((await seedCommand(env)).created, { users: 0, profiles: 0, assignments: 0 });

      // Populated exact approved baseline -> Issue #31, preserving all historical rows.
      const oldTables = [...eh013Tables, 'observed_applicability_snapshots', 'observed_applicability_retractions'];
      await upgrade.query(`INSERT INTO public.observed_applicability_snapshots(patient_id,source_type,source_reference,assertion_reference,effective_at,asserted_at,age_assertion_state,age_years_at_assessment)
        VALUES($1,'SYNTHETIC_OBSERVED_INPUT','upgrade-observed','one','2024-01-01','2024-01-01','ASSERTED_VALUE',40)`, [patientId]);
      const oldRows = await Promise.all(oldTables.map(table => upgrade.query(`SELECT * FROM public.${table} ORDER BY id`)));
      await cp('packages/db/prisma/migrations/20261021000000_bp_correction_invalidation', join(directory,'migrations/20261021000000_bp_correction_invalidation'), {recursive:true});
      prisma('deploy',schema,upgradeUrl.toString()); prisma('status',schema,upgradeUrl.toString());
      const bp31Ledger = (await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(bp31Ledger.length,9); assert.deepEqual(bp31Ledger.slice(0,8),eh015Ledger);
      for (let i=0;i<oldTables.length;i++) assert.deepEqual((await upgrade.query(`SELECT * FROM public.${oldTables[i]} ORDER BY id`)).rows,oldRows[i].rows);
      for (const table of ['bp_amendment_operations','bp_exclusions','bp_privacy_targets']) assert.equal((await upgrade.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n,0);
      prisma('deploy',schema,upgradeUrl.toString()); prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,bp31Ledger);
      for (let i=0;i<oldTables.length;i++) assert.deepEqual((await upgrade.query(`SELECT * FROM public.${oldTables[i]} ORDER BY id`)).rows,oldRows[i].rows);
      console.log('Issue #31 populated exact-baseline upgrade and repeated deploy preserved all historical rows/links/ledger; no amendment backfill');

      // Exact nine-migration baseline -> EH-014, with populated amendments and every old table retained.
      // Populate exclusion and independent privacy history before the EH-014 upgrade.
      const historicalBp=(await upgrade.query('SELECT id FROM blood_pressure_measurements WHERE patient_id=$1 ORDER BY id LIMIT 1',[patientId])).rows[0];
      const operationId=randomUUID();
      await upgrade.query('BEGIN');
      try {
        await upgrade.query(`INSERT INTO bp_amendment_operations(id,patient_id,actor_user_id,kind,operation_key,target_bp_id,reason_code) VALUES($1,$2,$3,'EXCLUDE',$4,$5,'WRONG_PATIENT')`,[operationId,patientId,clinicianUser.id,randomUUID(),historicalBp.id]);
        await upgrade.query(`INSERT INTO bp_exclusions(patient_id,bp_id,operation_id,reason_code) VALUES($1,$2,$3,'WRONG_PATIENT')`,[patientId,historicalBp.id,operationId]);
        await upgrade.query('INSERT INTO bp_privacy_targets(patient_id,bp_id,operation_id) VALUES($1,$2,$3)',[patientId,historicalBp.id,operationId]);
        await upgrade.query('COMMIT');
      }catch(error){await upgrade.query('ROLLBACK');throw error;}
      const bp31Tables=[...oldTables,'bp_amendment_operations','bp_exclusions','bp_privacy_targets'];
      const bp31Rows=await Promise.all(bp31Tables.map(table=>upgrade.query(`SELECT * FROM public.${table} ORDER BY id`)));
      await cp('packages/db/prisma/migrations/20261022000000_eh014_initial_care_action',join(directory,'migrations/20261022000000_eh014_initial_care_action'),{recursive:true});
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      const actionLedger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(actionLedger.length,10);assert.deepEqual(actionLedger.slice(0,9),bp31Ledger);
      for(let i=0;i<bp31Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${bp31Tables[i]} ORDER BY id`)).rows,bp31Rows[i].rows);
      for(const table of ['care_actions','care_action_decisions','care_action_applicability_inputs'])assert.equal((await upgrade.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n,0);
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,actionLedger);
      for(let i=0;i<bp31Tables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${bp31Tables[i]} ORDER BY id`)).rows,bp31Rows[i].rows);
      console.log('EH-014 populated nine-to-ten migration upgrade/redeploy preserved history/ledger; zero action/decision backfill');

      // Populated M0–M2 -> Slice 2 through the real runner, with enum values committed first.
      const i1OldTables=[...bp31Tables,'care_actions','care_action_decisions','care_action_applicability_inputs'];
      const i1OldRows=await Promise.all(i1OldTables.map(table=>upgrade.query(`SELECT * FROM public.${table} ORDER BY ${table==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)));
      for(const migration of ['20261023000000_v3_i1_staff_roles','20261023000100_v3_i1_organizations']) {
        await cp(`packages/db/prisma/migrations/${migration}`,join(directory,'migrations',migration),{recursive:true});
      }
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      const i1Ledger=(await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
      assert.equal(i1Ledger.length,12);assert.deepEqual(i1Ledger.slice(0,10),actionLedger);
      for(let i=0;i<i1OldTables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${i1OldTables[i]} ORDER BY ${i1OldTables[i]==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)).rows,i1OldRows[i].rows);
      for(const table of ['organizations','organization_memberships'])assert.equal((await upgrade.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n,0);
      prisma('deploy',schema,upgradeUrl.toString());prisma('status',schema,upgradeUrl.toString());
      assert.deepEqual((await upgrade.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows,i1Ledger);
      for(let i=0;i<i1OldTables.length;i++)assert.deepEqual((await upgrade.query(`SELECT * FROM public.${i1OldTables[i]} ORDER BY ${i1OldTables[i]==='care_action_applicability_inputs'?'decision_id,snapshot_id':'id'}`)).rows,i1OldRows[i].rows);
      assert.deepEqual((await seedCommand(env)).created,{users:0,profiles:0,assignments:0});
      assert.equal((await verifyCommand(env)).result,'PASS');
      console.log('I1 Slice 2 populated ten-to-twelve migration upgrade/redeploy: historical rows/ledger retained, committed enum extension, zero organization/membership backfill, M1 PASS');

      console.log('EH-013 -> EH-015: fifteen retained domain tables, coverage/followup/BP/care-plan/identity rows and ledger unchanged; observed applicability tables empty; repeat deploy/status and M1 HTTP PASS');
      console.log('EH-012 -> EH-013: fourteen retained domain tables, followup/BP/care-plan/identity rows and ledger unchanged; record_coverage_windows empty; repeat deploy/status and M1 HTTP PASS');
      console.log('EH-011 -> EH-012: eleven retained domain tables, BP provenance and ledger unchanged; new tables empty; repeat deploy/status and M1 HTTP PASS');
      console.log('EH-010 -> EH-011: all ten M1/catalog/plan tables and ledger preserved; no BP seed; repeat deploy/status and real M1 HTTP PASS');
      console.log('EH-009 -> EH-010 preserved M1/session/audit/catalog rows and ledger; repeat deploy/status and HTTP M1 PASS');
      console.log('M1 -> EH-009 upgrade preserved all seeded identity/session/audit state and ledger; repeat deploy/status and real HTTP M1 verification passed');
    } finally { await app.close(); await db.close(); await auth.close(); await authorization.close(); }

  } finally {
    if (upgrade) await upgrade.end();
    await connection.query(`DROP DATABASE IF EXISTS ${name}`);
    await rm(directory, { recursive: true, force: true });
  }
} finally {
  await connection.query('ROLLBACK');
  connection.release();
  await pool.end();
}
