import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

// Resolve existing DB-package dependencies; no root dependency is introduced.
const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
export const { Pool } = require('pg');

export async function withTransaction(run) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await run(connection);
  } finally {
    await connection.query('ROLLBACK');
    connection.release();
    await pool.end();
  }
}

export async function rejectsConstraint(connection, sql, values, code, constraint) {
  await connection.query('SAVEPOINT rejected_write');
  try {
    await assert.rejects(connection.query(sql, values), error => {
      assert.equal(error.code, code);
      assert.equal(error.constraint, constraint);
      return true;
    });
  } finally {
    await connection.query('ROLLBACK TO SAVEPOINT rejected_write');
  }
}

export async function user(connection, role = 'PATIENT') {
  const { rows } = await connection.query(`INSERT INTO users (email, password_hash, role)
    VALUES (gen_random_uuid()::text || '@example.invalid', 'synthetic-test-hash', $1) RETURNING *`, [role]);
  return rows[0];
}

export async function pair(connection) {
  const patientUser = await user(connection);
  const clinicianUser = await user(connection, 'CLINICIAN');
  const patient = (await connection.query(`INSERT INTO patient_profiles (user_id, display_name)
    VALUES ($1, 'Synthetic patient') RETURNING *`, [patientUser.id])).rows[0];
  const clinician = (await connection.query(`INSERT INTO clinician_profiles (user_id, display_name)
    VALUES ($1, 'Synthetic clinician') RETURNING *`, [clinicianUser.id])).rows[0];
  return { patientUser, clinicianUser, patient, clinician };
}
