import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withTransaction, rejectsConstraint, user, pair, Pool } from '../support/database.mjs';
import { createPersistence } from '../../packages/db/dist/index.js';

test('database rejects duplicate/noncanonical identities and blank hashes', () => withTransaction(async connection => {
  const identity = await user(connection, 'ADMIN');
  const insert = 'INSERT INTO users(email, password_hash, role) VALUES ($1, $2, \'ADMIN\')';
  await rejectsConstraint(connection, insert, [identity.email, 'hash'], '23505', 'users_email_key');
  for (const email of [identity.email.toUpperCase(), ` ${identity.email}`, `${identity.email}\t`, 'a b@example.invalid', 'é@example.invalid']) {
    await rejectsConstraint(connection, insert, [email, 'hash'], '23514', 'users_email_canonical_check');
  }
  for (const email of ['missing-at', '@example.invalid', 'a@', 'a@@b']) {
    await rejectsConstraint(connection, insert, [email, 'hash'], '23514', 'users_email_shape_check');
  }
  await rejectsConstraint(connection, insert, ['new@example.invalid', ' \t\n'], '23514', 'users_password_hash_nonblank_check');
  const other = await user(connection, 'ADMIN');
  await rejectsConstraint(connection, 'UPDATE users SET email = $1 WHERE id = $2', [identity.email, other.id], '23505', 'users_email_key');
}));

test('profile cardinality, discriminators, role-qualified FKs and RESTRICT', () => withTransaction(async connection => {
  const { patientUser, clinicianUser, patient, clinician } = await pair(connection);
  for (const [table, owner, constraint] of [
    ['patient_profiles', patientUser, 'patient_profiles_user_id_key'],
    ['clinician_profiles', clinicianUser, 'clinician_profiles_user_id_key'],
  ]) {
    await rejectsConstraint(connection, `INSERT INTO ${table}(user_id, display_name) VALUES ($1, 'Duplicate')`, [owner.id], '23505', constraint);
  }
  const admin = await user(connection, 'ADMIN');
  for (const [table, owners, role, wrongRole] of [
    ['patient_profiles', [clinicianUser.id, admin.id, randomUUID()], 'PATIENT', 'CLINICIAN'],
    ['clinician_profiles', [patientUser.id, admin.id, randomUUID()], 'CLINICIAN', 'PATIENT'],
  ]) {
    for (const owner of owners) {
      await rejectsConstraint(connection, `INSERT INTO ${table}(user_id, display_name) VALUES ($1, 'Wrong owner')`, [owner], '23503', `${table}_user_role_fkey`);
    }
    await rejectsConstraint(connection, `INSERT INTO ${table}(user_id, user_role, display_name) VALUES ($1, $2, 'Spoof')`, [admin.id, wrongRole], '23514', `${table}_role_check`);
    const owner = await user(connection, role);
    await connection.query(`INSERT INTO ${table}(user_id, display_name) VALUES ($1, 'Valid')`, [owner.id]);
    await rejectsConstraint(connection, 'UPDATE users SET role = \'ADMIN\' WHERE id = $1', [owner.id], '23001', `${table}_user_role_fkey`);
    await rejectsConstraint(connection, 'DELETE FROM users WHERE id = $1', [owner.id], '23001', `${table}_user_role_fkey`);
  }
  await connection.query('INSERT INTO clinician_patient_assignments(clinician_id, patient_id) VALUES ($1, $2)', [clinician.id, patient.id]);
  await rejectsConstraint(connection, 'DELETE FROM patient_profiles WHERE id = $1', [patient.id], '23001', 'assignments_patient_fkey');
  await rejectsConstraint(connection, 'DELETE FROM clinician_profiles WHERE id = $1', [clinician.id], '23001', 'assignments_clinician_fkey');
  // Profileless roles remain mutable by SQL; no global role trigger is claimed.
  await connection.query('UPDATE users SET role = \'PATIENT\' WHERE id = $1', [admin.id]);
}));

test('assignment uniqueness, lifecycle, terminal history and later reassignment', () => withTransaction(async connection => {
  const { patient, clinician } = await pair(connection);
  const insert = 'INSERT INTO clinician_patient_assignments(clinician_id, patient_id, status, ended_at) VALUES ($1, $2, $3, $4) RETURNING *';
  const endpoints = [clinician.id, patient.id];
  for (const [values, constraint, code] of [
    [[randomUUID(), patient.id, 'ACTIVE', null], 'assignments_clinician_fkey', '23503'],
    [[clinician.id, randomUUID(), 'ACTIVE', null], 'assignments_patient_fkey', '23503'],
    [[...endpoints, 'ACTIVE', new Date()], 'assignments_lifecycle_check', '23514'],
    [[...endpoints, 'ENDED', null], 'assignments_lifecycle_check', '23514'],
    [[...endpoints, 'ENDED', new Date('2000-01-01')], 'assignments_lifecycle_check', '23514'],
  ]) await rejectsConstraint(connection, insert, values, code, constraint);
  const assignment = (await connection.query(insert, [...endpoints, 'ACTIVE', null])).rows[0];
  await rejectsConstraint(connection, insert, [...endpoints, 'ACTIVE', null], '23505', 'clinician_patient_assignments_active_pair_key');
  for (const [field, value] of [['id', randomUUID()], ['clinician_id', randomUUID()], ['patient_id', randomUUID()], ['assigned_at', new Date('2000-01-01')]]) {
    await rejectsConstraint(connection, `UPDATE clinician_patient_assignments SET ${field} = $1 WHERE id = $2`, [value, assignment.id], '23514', 'assignments_history_guard');
  }
  await rejectsConstraint(connection, 'UPDATE clinician_patient_assignments SET ended_at = now() WHERE id = $1', [assignment.id], '23514', 'assignments_lifecycle_check');
  await connection.query('UPDATE clinician_patient_assignments SET status = \'ENDED\', ended_at = assigned_at WHERE id = $1', [assignment.id]);
  await rejectsConstraint(connection, 'UPDATE clinician_patient_assignments SET status = \'ACTIVE\', ended_at = NULL WHERE id = $1', [assignment.id], '23514', 'assignments_history_guard');
  await rejectsConstraint(connection, 'UPDATE clinician_patient_assignments SET ended_at = ended_at + interval \'1 second\' WHERE id = $1', [assignment.id], '23514', 'assignments_history_guard');
  await rejectsConstraint(connection, 'DELETE FROM clinician_patient_assignments WHERE id = $1', [assignment.id], '23514', 'assignments_history_guard');
  // EH-014 retains selector assignment provenance: PostgreSQL first rejects plain TRUNCATE via FK.
  await rejectsConstraint(connection, 'TRUNCATE clinician_patient_assignments', [], '0A000');
  // Including children independently proves the original assignment history guard still rejects removal.
  await rejectsConstraint(connection, 'TRUNCATE clinician_patient_assignments CASCADE', [], '23514', 'assignments_history_guard');
  const later = (await connection.query(insert, [...endpoints, 'ACTIVE', null])).rows[0];
  assert.notEqual(later.id, assignment.id);
  await connection.query('UPDATE clinician_patient_assignments SET status = \'ENDED\', ended_at = assigned_at WHERE id = $1', [later.id]);
  await connection.query(insert, [...endpoints, 'ACTIVE', null]);
  assert.equal((await connection.query('SELECT count(*)::int AS count FROM clinician_patient_assignments WHERE clinician_id = $1 AND patient_id = $2', endpoints)).rows[0].count, 3);
}));

test('audit object checks, actor integrity, polymorphism and append-only SQL', () => withTransaction(async connection => {
  const actor = await user(connection, 'ADMIN');
  const insert = 'INSERT INTO audit_logs(actor_user_id, action_type, entity_type, entity_id, safe_metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *';
  const values = [actor.id, 'TEST_APPEND', 'future_polymorphic_type', randomUUID(), '{}'];
  const audit = (await connection.query(insert, values)).rows[0];
  await connection.query(insert, [null, ...values.slice(1)]);
  await rejectsConstraint(connection, insert, [randomUUID(), ...values.slice(1)], '23503', 'audit_logs_actor_fkey');
  for (const metadata of ['[]', 'null', '"text"', '42']) {
    await rejectsConstraint(connection, insert, [...values.slice(0, 4), metadata], '23514', 'audit_logs_metadata_object_check');
  }
  await rejectsConstraint(connection, insert, [actor.id, ' \t', ...values.slice(2)], '23514', 'audit_logs_action_type_nonblank_check');
  await rejectsConstraint(connection, insert, [actor.id, values[1], '\n', ...values.slice(3)], '23514', 'audit_logs_entity_type_nonblank_check');
  for (const sql of ['UPDATE audit_logs SET action_type = \'REWRITE\'', 'DELETE FROM audit_logs', 'TRUNCATE audit_logs']) {
    await rejectsConstraint(connection, sql, [], '23514', 'audit_logs_append_only_guard');
  }
  await rejectsConstraint(connection, 'DELETE FROM users WHERE id = $1', [actor.id], '23001', 'audit_logs_actor_fkey');
  assert.deepEqual((await connection.query('SELECT * FROM audit_logs WHERE id = $1', [audit.id])).rows[0], audit);
}));

test('narrow boundary canonicalizes, provisions atomically and resolves concurrent assignments', async () => {
  const persistence = createPersistence(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const token = randomUUID();
  try {
    const patient = await persistence.createUser({ email: ` \t${token.toUpperCase()}@EXAMPLE.INVALID\r\n`, passwordHash: 'synthetic-test-hash', role: 'PATIENT', profile: { displayName: 'Synthetic', sex: 'opaque-test-text', dateOfBirth: new Date('2000-02-29') } });
    assert.equal(patient.email, `${token}@example.invalid`);
    assert.equal('passwordHash' in patient, false);
    for (const email of [patient.email.toUpperCase(), ` ${patient.email} `]) {
      await assert.rejects(persistence.createUser({ email, passwordHash: 'hash', role: 'ADMIN' }), { code: 'P2002' });
    }
    const failedEmail = `${randomUUID()}@example.invalid`;
    await assert.rejects(persistence.createUser({ email: failedEmail, passwordHash: 'hash', role: 'PATIENT', profile: { displayName: null } }));
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM users WHERE email = $1', [failedEmail])).rows[0].count, 0);
    const clinician = await persistence.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash: 'hash', role: 'CLINICIAN', profile: { displayName: 'Synthetic' } });
    const input = { patientId: patient.profileId, clinicianId: clinician.profileId };
    const attempts = await Promise.allSettled([persistence.assignPatient(input), persistence.assignPatient(input)]);
    assert.equal(attempts.filter(attempt => attempt.status === 'fulfilled').length, 1);
    assert.equal(attempts.find(attempt => attempt.status === 'rejected').reason.code, 'P2002');
    const assignment = attempts.find(attempt => attempt.status === 'fulfilled').value;
    await persistence.endAssignment(assignment.id);
    await assert.rejects(persistence.endAssignment(assignment.id), /Active assignment not found/);
    const later = await persistence.assignPatient(input);
    assert.notEqual(later.id, assignment.id);
    const audit = await persistence.appendAudit({ actorUserId: patient.id, actionType: 'TEST_APPEND', entityType: 'polymorphic', entityId: randomUUID() });
    assert.deepEqual(audit.safeMetadata, {});
    for (const safeMetadata of [{ password: 'test' }, { token: 'test' }, [], null]) {
      await assert.rejects(persistence.appendAudit({ actorUserId: null, actionType: 'TEST_APPEND', entityType: 'polymorphic', entityId: randomUUID(), safeMetadata }), /empty safe metadata/);
    }
    assert.deepEqual(Object.keys(persistence).sort(), ['appendAudit', 'assignPatient', 'close', 'createUser', 'endAssignment']);
    const profile = (await pool.query('SELECT * FROM patient_profiles WHERE id = $1', [patient.profileId])).rows[0];
    assert.equal(profile.sex, 'opaque-test-text');
    assert.equal(profile.date_of_birth.getFullYear(), 2000);
    assert.match(patient.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally { await persistence.close(); await pool.end(); }
});
