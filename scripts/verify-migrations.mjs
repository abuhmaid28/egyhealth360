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
import { createDatabase, createAuthPersistence, createAuthorizationPersistence } from '../packages/db/dist/index.js';

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
  assert.deepEqual(before.map(row => row.migration_name), ['20261012200810_eh005_identity_core_foundation', '20261013014000_eh006_auth_sessions', '20261013235221_eh009_clinical_definition_foundation']);
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
