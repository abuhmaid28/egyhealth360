import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { Pool } from '../support/database.mjs';
import { migrationRunner } from '../support/migration-runner.mjs';
import { createDemoPersistence } from '../../packages/db/dist/index.js';
import { seedDemo } from '../../scripts/lib/m1-demo.mjs';
import { initializeStaging } from '../../scripts/lib/staging-seed.mjs';
import { proveStagingInitialization } from '../../scripts/lib/staging-seed-proof.mjs';

test('staging continuation preserves existing identities/authority and clinical rows, repeats without duplicates, revokes admin session', async () => {
  const root = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = `staging_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL); url.pathname = '/' + name;
  let pool, demo;
  const password = Buffer.from('synthetic-staging-test-' + randomUUID());
  try {
    await root.query(`CREATE DATABASE ${name}`);
    migrationRunner(url.toString(), 'deploy', 20);
    pool = new Pool({ connectionString: url.toString() });
    const config = { databaseUrl: url.toString(), password };
    // A continuation cannot silently recreate a missing fixture or assignment.
    await assert.rejects(initializeStaging(config));
    assert.equal((await pool.query('SELECT count(*)::int n FROM users')).rows[0].n, 0);
    demo = createDemoPersistence(url.toString());
    await seedDemo(demo, password); // Approved historical fixture, test setup only.
    const authority = (await pool.query('SELECT * FROM clinician_patient_assignments ORDER BY id')).rows;
    await initializeStaging(config);
    await proveStagingInitialization(config);
    assert.deepEqual((await pool.query('SELECT * FROM clinician_patient_assignments ORDER BY id')).rows, authority);
    for (const table of ['clinical_encounters', 'consultations', 'consultation_documents', 'follow_up_intents', 'care_plans', 'care_actions', 'blood_pressure_measurements']) {
      assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
    }
    // A later operational conflict still revokes the initializer's own session.
    await pool.query("UPDATE organizations SET status='SUSPENDED',status_version=status_version+1,status_changed_at=clock_timestamp()");
    await assert.rejects(initializeStaging(config), /STAGING_SETUP_STEP_5_FAILED/);
    assert.equal((await pool.query('SELECT count(*)::int n FROM sessions WHERE revoked_at IS NULL')).rows[0].n, 0);
  } finally {
    password.fill(0);
    await demo?.close(); await pool?.end();
    await root.query(`DROP DATABASE IF EXISTS ${name}`); await root.end();
  }
});
