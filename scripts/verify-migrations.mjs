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
import { createDatabase, createAuthPersistence, createAuthorizationPersistence, createClinicalCatalogPersistence, createCarePlanPersistence } from '../packages/db/dist/index.js';

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
  assert.deepEqual(before.map(row => row.migration_name), ['20261012200810_eh005_identity_core_foundation', '20261013014000_eh006_auth_sessions', '20261013235221_eh009_clinical_definition_foundation', '20261016000000_eh010_care_plan_lifecycle', '20261017000000_eh011_bp_provenance']);
  for (const row of before) assert.equal(row.checksum, createHash('sha256').update(await readFile(`packages/db/prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
  assert.equal(before[0].checksum, 'd8396ed97e82550866a44055f308fb039ed29d6c8cdcdd74d95da060f441749a');
  assert.equal(before[1].checksum, '2fb1704ab28b698bfcf6995f6120cb1b1f0138ab18fcf7db562517f47d53b79b');
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
