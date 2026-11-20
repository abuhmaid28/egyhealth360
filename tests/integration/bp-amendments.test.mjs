import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { isolatedBp, bpInput } from '../support/blood-pressure.mjs';
import { createBpAmendmentPersistence, createNormalizedEvidencePersistence, createClinicalEncounterPersistence, createAuthPersistence, createDatabase, createFollowUpAppointmentPersistence } from '../../packages/db/dist/index.js';
import { observeApplicabilityQueries, signal, waitBlocked, waitBlockedBy } from '../support/observed-applicability.mjs';
import { createApp } from '../../apps/api/dist/app.js';
import { hashPassword, createPasswordVerifier } from '../../apps/api/dist/password.js';
import { authConfiguration } from '../../packages/config/dist/index.js';

const rejects = (promise, code) => assert.rejects(promise, e => e.code === code);
const command = (f, bp, extra = {}) => ({ patientId: f.patientId, bpId: bp.id, operationId: randomUUID(), reason: 'DATA_ENTRY_ERROR', expectedState: 'UNEXCLUDED', duplicateOfBpId: null, ...extra });
const privacy = (f, bp, predecessorIds = [], extra = {}) => ({ patientId: f.patientId, bpId: bp.id, operationId: randomUUID(), predecessorIds, ...extra });
const pair = { ...bpInput, systolic: 149, diastolic: 89 };
const snapshot = async pool => Object.fromEntries(await Promise.all(['blood_pressure_measurements', 'bp_amendment_operations', 'bp_exclusions', 'bp_privacy_targets', 'audit_logs'].map(async t => [t, (await pool.query(`SELECT * FROM public.${t} ORDER BY id`)).rows])));
const use = fn => isolatedBp(async f => {
  const amend = createBpAmendmentPersistence(f.url), normalized = createNormalizedEvidencePersistence(f.url), encounters = createClinicalEncounterPersistence(f.url), appointments = createFollowUpAppointmentPersistence(f.url);
  const evidence = actor => normalized.getNormalizedPatientEvidence(actor ?? f.actor, { patientId: f.patientId, queryInterval: { startAt: '2024-01-01T00:00:00Z', endAt: '2025-01-01T00:00:00Z' }, partition: { sourceType: 'SYNTHETIC_BENCHMARK', sourceReference: 'bp-test' } });
  try { await fn({ ...f, amend, normalized, encounters, appointments, evidence }); } finally { await amend.close(); await normalized.close(); await encounters.close(); await appointments.close(); }
});

test('Issue31 correction is append-only full-pair evidence with truthful provenance and stable exact retry', () => use(async f => {
  const a = await f.write(f.principals['patient-a']), original = (await f.pool.query('SELECT * FROM blood_pressure_measurements WHERE id=$1', [a.id])).rows[0];
  const input = { ...command(f, a), replacement: pair };
  const r = await f.amend.correct(f.actor, input); assert.equal(r.created, true); assert.notEqual(r.replacementId, a.id);
  const b = (await f.pool.query('SELECT * FROM blood_pressure_measurements WHERE id=$1', [r.replacementId])).rows[0];
  assert.equal(b.systolic, 149); assert.equal(b.diastolic, 89); assert.equal(b.source_kind, 'CLINICIAN_ENTRY'); assert.equal(b.recorded_by_user_id, f.actor.userId);
  assert.deepEqual((await f.pool.query('SELECT * FROM blood_pressure_measurements WHERE id=$1', [a.id])).rows[0], original);
  const before = await snapshot(f.pool), retry = await f.amend.correct(f.actor, input);
  assert.deepEqual(retry, { ...r, created: false }); assert.deepEqual(await snapshot(f.pool), before);
  await rejects(f.amend.correct(f.actor, { ...input, replacement: { ...pair, systolic: 150 } }), 'BP_AMENDMENT_CONFLICT');
  await rejects(f.amend.exclude(f.actor, command(f, a)), 'BP_AMENDMENT_CONFLICT');
  const effective = await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 });
  assert.deepEqual(effective.measurements.map(x => x.id), [b.id]);
  const history = await f.amend.getHistory(f.principals['patient-a'], { patientId: f.patientId, bpId: a.id });
  assert.equal(history.measurement.systolic, 128); assert.equal(history.exclusion.replacementId, b.id);
  const audits = before.audit_logs.filter(x => ['BP_EVIDENCE_EXCLUDED', 'BP_MEASUREMENT_CREATED'].includes(x.action_type));
  assert.equal(audits.length, 3); assert.ok(audits.every(x => JSON.stringify(x.safe_metadata) === '{}'));
}));

test('Issue31 legacy/newer/identical BP remain independent, and replacement never inherits encounter', () => use(async f => {
  const a = await f.write(), n = await f.write();
  const encounter = await f.encounters.createClinicalEncounter(f.actor, { patientId: f.patientId, occurredAt: bpInput.measuredAt, purpose: 'HTN_BP_FOLLOWUP' });
  await f.encounters.associateBloodPressureMeasurement(f.actor, { patientId: f.patientId, encounterId: encounter.id, measurementId: a.id });
  assert.equal((await f.evidence()).bloodPressureMeasurements.length, 2);
  const r = await f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  const e = await f.evidence(); assert.deepEqual(new Set(e.bloodPressureMeasurements.map(x => x.id)), new Set([n.id, r.replacementId]));
  assert.equal(e.structuralEncounterBpCandidates.length, 0);
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM encounter_bp_associations')).rows[0].n, 1);
  assert.equal((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).total, 3);
  await rejects(f.encounters.associateBloodPressureMeasurement(f.actor, { patientId: f.patientId, encounterId: randomUUID(), measurementId: r.replacementId }), 'EVIDENCE_NOT_FOUND');
  await f.encounters.associateBloodPressureMeasurement(f.actor, { patientId: f.patientId, encounterId: encounter.id, measurementId: r.replacementId });
  assert.equal((await f.evidence()).structuralEncounterBpCandidates[0].bloodPressureMeasurementId, r.replacementId);
}));

test('Issue31 required bare-exclusion restatement and correction-of-correction preserve every predecessor', () => use(async f => {
  const a = await f.write(); await f.amend.exclude(f.actor, command(f, a));
  const input = { patientId: f.patientId, bpId: a.id, operationId: randomUUID(), replacement: pair };
  const b = await f.amend.restate(f.actor, input);
  assert.deepEqual(await f.amend.restate(f.actor, input), { ...b, created: false });
  await rejects(f.amend.restate(f.actor, { ...input, operationId: randomUUID() }), 'BP_AMENDMENT_CONFLICT');
  const c = await f.amend.correct(f.actor, { ...command(f, { id: b.replacementId }), replacement: { ...pair, systolic: 139 } });
  assert.notEqual(c.replacementId, b.replacementId); assert.equal((await snapshot(f.pool)).blood_pressure_measurements.length, 3);
  assert.deepEqual((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).measurements.map(x => x.id), [c.replacementId]);
  await rejects(f.amend.restate(f.actor, { patientId: f.patientId, bpId: b.replacementId, operationId: randomUUID(), replacement: pair }), 'BP_AMENDMENT_INVALID');
}));

test('Issue31 F1 already-excluded source receives independent privacy without rewriting its exclusion', () => use(async f => {
  const a = await f.write(); await f.amend.exclude(f.actor, command(f, a));
  const original = (await f.pool.query('SELECT * FROM bp_exclusions WHERE bp_id=$1', [a.id])).rows[0];
  const input = privacy(f, a), p = await f.amend.restrictWrongPatient(f.actor, input);
  assert.equal(p.exclusionIds.length, 0); assert.equal(p.privacyIds.length, 1);
  assert.deepEqual((await f.pool.query('SELECT * FROM bp_exclusions WHERE bp_id=$1', [a.id])).rows[0], original);
  const before = await snapshot(f.pool); assert.deepEqual(await f.amend.restrictWrongPatient(f.actor, input), { ...p, created: false }); assert.deepEqual(await snapshot(f.pool), before);
  for (const actor of [f.actor, f.principals['patient-a']]) {
    assert.equal((await f.bp.listBloodPressureMeasurements(actor, { patientId: f.patientId, page: 1, pageSize: 1 })).total, 0);
    await rejects(f.amend.getHistory(actor, { patientId: f.patientId, bpId: a.id }), 'BP_AMENDMENT_NOT_FOUND');
  }
  assert.equal((await f.evidence()).bloodPressureMeasurements.length, 0);
  await rejects(f.amend.restrictWrongPatient(f.actor, privacy(f, a)), 'BP_AMENDMENT_CONFLICT');
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM blood_pressure_measurements')).rows[0].n, 1);
}));

test('Issue31 initial WRONG_PATIENT exclusion and privacy are atomic, same behavior through ordinary exclude', () => use(async f => {
  for (const operation of ['privacy', 'exclude']) {
    const a = await f.write();
    const r = operation === 'privacy' ? await f.amend.restrictWrongPatient(f.actor, privacy(f, a)) : await f.amend.exclude(f.actor, command(f, a, { reason: 'WRONG_PATIENT' }));
    assert.equal(r.exclusionIds.length, 1); assert.equal(r.privacyIds.length, 1);
    assert.equal((await f.pool.query('SELECT reason_code FROM bp_exclusions WHERE bp_id=$1', [a.id])).rows[0].reason_code, 'WRONG_PATIENT');
  }
  assert.equal((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).total, 0);
}));

test('Issue31 explicit frozen predecessors only: no recursive privacy growth or hidden retry replacement', () => use(async f => {
  const a = await f.write();
  const ab = await f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  const bcInput = { ...command(f, { id: ab.replacementId }), replacement: { ...pair, systolic: 138 } };
  const bc = await f.amend.correct(f.actor, bcInput);
  const p = privacy(f, { id: ab.replacementId }, [a.id]); await f.amend.restrictWrongPatient(f.actor, p);
  assert.deepEqual((await f.pool.query('SELECT bp_id FROM bp_privacy_targets ORDER BY bp_id')).rows.map(x => x.bp_id), [a.id, ab.replacementId].sort());
  assert.deepEqual((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).measurements.map(x => x.id), [bc.replacementId]);
  const cd = await f.amend.correct(f.actor, { ...command(f, { id: bc.replacementId }), replacement: { ...pair, systolic: 137 } });
  assert.equal((await f.pool.query('SELECT count(*)::int n FROM bp_privacy_targets')).rows[0].n, 2);
  assert.equal((await f.amend.correct(f.actor, { ...command(f, a), operationId: ab.operationId, replacement: pair }).catch(e => ({ code: e.code }))).code, 'BP_AMENDMENT_CONFLICT'); // entity UUID is not client operation key
  assert.ok(cd.replacementId);
  const remaining = await f.write(), before = await snapshot(f.pool);
  await rejects(f.amend.restrictWrongPatient(f.actor, privacy(f, remaining, [a.id])), 'BP_AMENDMENT_INVALID');
  assert.deepEqual(await snapshot(f.pool), before);
  await rejects(f.amend.restrictWrongPatient(f.actor, { ...p, predecessorIds: [] }), 'BP_AMENDMENT_CONFLICT');
}));

test('Issue31 B-only privacy leaves predecessor and separately asserted successor untouched', () => use(async f => {
  const a = await f.write(), input = { ...command(f, a), replacement: pair }, b = await f.amend.correct(f.actor, input);
  await f.amend.restrictWrongPatient(f.actor, privacy(f, { id: b.replacementId }));
  const retry = await f.amend.correct(f.actor, input); assert.equal(retry.replacementId, null); assert.equal(retry.operationId, b.operationId);
  assert.deepEqual((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).measurements.map(x => x.id), [a.id]);
}));

test('Issue31 patient/admin/unassigned/other-patient writes denied, malformed/replayed payload fails safely', () => use(async f => {
  const a = await f.write(), input = command(f, a);
  for (const who of ['patient-a', 'patient-b', 'admin', 'clinician-unassigned']) {
    await rejects(f.amend.exclude(f.principals[who], input), 'BP_AMENDMENT_NOT_FOUND');
    await rejects(f.amend.restrictWrongPatient(f.principals[who], privacy(f, a)), 'BP_AMENDMENT_NOT_FOUND');
  }
  const other = await f.write(f.principals['patient-b'], { patientId: f.identities['patient-b'].profileId });
  await rejects(f.amend.exclude(f.actor, { ...input, bpId: other.id }), 'BP_AMENDMENT_NOT_FOUND');
  await rejects(f.amend.exclude(f.actor, { ...input, patientId: f.identities['patient-b'].profileId }), 'BP_AMENDMENT_NOT_FOUND');
  for (const change of [{ reason: 'OTHER' }, { operationId: 'bad' }, { expectedState: 'EXCLUDED' }, { actorUserId: f.actor.userId }, { duplicateOfBpId: other.id }]) await rejects(f.amend.exclude(f.actor, { ...input, ...change }), 'BP_AMENDMENT_INVALID');
  for (const replacement of [{ ...pair, diastolic: undefined }, { ...pair, systolic: 1.5 }, { ...pair, sourceKind: 'PATIENT_SELF_ENTRY' }, { ...pair, measuredAt: '2024-01-01T00:00:00.000001Z' }]) await rejects(f.amend.correct(f.actor, { ...input, replacement }), 'BP_AMENDMENT_INVALID');
  await f.amend.exclude(f.actor, input);
  const b = await f.write(); await rejects(f.amend.exclude(f.actor, { ...input, bpId: b.id }), 'BP_AMENDMENT_CONFLICT');
  await f.pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1', [f.actor.sessionId]);
  await rejects(f.amend.exclude(f.actor, input), 'BP_AMENDMENT_UNAUTHENTICATED');
}));

test('Issue31 duplicate provenance is explicit and cannot reference excluded/cross-patient evidence', () => use(async f => {
  const a = await f.write(), b = await f.write();
  await f.amend.exclude(f.actor, command(f, b, { reason: 'DUPLICATE', duplicateOfBpId: a.id }));
  await rejects(f.amend.exclude(f.actor, command(f, a, { reason: 'DUPLICATE', duplicateOfBpId: b.id })), 'BP_AMENDMENT_CONFLICT');
  await f.amend.exclude(f.actor, command(f, a));
  assert.equal((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 20 })).total, 0);
}));

test('Issue31 frozen overlap conflicts roll back all new targets and preserve source rows', () => use(async f => {
  const a = await f.write(), ab = await f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  await f.amend.restrictWrongPatient(f.actor, privacy(f, a));
  const before = await snapshot(f.pool);
  await rejects(f.amend.restrictWrongPatient(f.actor, privacy(f, { id: ab.replacementId }, [a.id])), 'BP_AMENDMENT_CONFLICT');
  assert.deepEqual(await snapshot(f.pool), before);
}));

test('Issue31 immutable source/operation/exclusion/privacy, direct SQL scope, fresh ownership and atomic completeness', () => use(async f => {
  const a = await f.write(); await f.amend.restrictWrongPatient(f.actor, privacy(f, a));
  const before = await snapshot(f.pool);
  for (const table of ['bp_amendment_operations', 'bp_exclusions', 'bp_privacy_targets', 'blood_pressure_measurements']) for (const sql of [`UPDATE public.${table} SET id=id WHERE false`, `DELETE FROM public.${table} WHERE false`, `TRUNCATE public.${table} CASCADE`]) await assert.rejects(f.pool.query(sql));
  const b = await f.write(), c = await f.pool.connect();
  try {
    await c.query('BEGIN');
    await assert.rejects(c.query("INSERT INTO bp_amendment_operations(patient_id,actor_user_id,kind,operation_key,target_bp_id,reason_code,new_bp_id,systolic,diastolic,measured_at) VALUES($1,$2,'CORRECT',$3,$4,'DATA_ENTRY_ERROR',$5,128,82,$6)", [f.patientId, f.actor.userId, randomUUID(), b.id, a.id, bpInput.measuredAt]));
    await c.query('ROLLBACK');
    await c.query('BEGIN');
    await c.query("INSERT INTO bp_amendment_operations(patient_id,actor_user_id,kind,operation_key,target_bp_id,reason_code) VALUES($1,$2,'EXCLUDE',$3,$4,'DATA_ENTRY_ERROR')", [f.patientId, f.actor.userId, randomUUID(), b.id]);
    await assert.rejects(c.query('COMMIT')); // cannot commit an operation without its exclusion
    await c.query('ROLLBACK');
  } finally { await c.query('ROLLBACK'); c.release(); }
  assert.deepEqual((await snapshot(f.pool)).bp_amendment_operations, before.bp_amendment_operations);
}));

for (const stage of ['BP_EVIDENCE_EXCLUDED', 'BP_MEASUREMENT_CREATED', 'BP_PRIVACY_RESTRICTED', 'BP_EVIDENCE_RESTATED']) test(`Issue31 late ${stage} audit fault rolls all clinical/operation writes back`, () => use(async f => {
  const a = await f.write();
  if (stage === 'BP_EVIDENCE_RESTATED') await f.amend.exclude(f.actor, command(f, a));
  const before = await snapshot(f.pool);
  await f.pool.query(`CREATE FUNCTION fail_bp31_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='${stage}' THEN RAISE EXCEPTION 'CANARY_SECRET_SQL'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_bp31_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_bp31_audit()`);
  const action = stage === 'BP_PRIVACY_RESTRICTED' ? f.amend.restrictWrongPatient(f.actor, privacy(f, a))
    : stage === 'BP_EVIDENCE_RESTATED' ? f.amend.restate(f.actor, { patientId: f.patientId, bpId: a.id, operationId: randomUUID(), replacement: pair })
      : f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  await rejects(action, 'BP_AMENDMENT_UNAVAILABLE'); assert.deepEqual(await snapshot(f.pool), before);
}));

for (const kind of ['correct-correct', 'correct-exclude', 'exclude-exclude', 'privacy-privacy', 'privacy-existing', 'privacy-rollback', 'privacy-correct', 'correct-privacy', 'exact', 'rollback']) test(`Issue31 real target race ${kind}`, { timeout: 45000 }, () => use(async f => {
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)', [f.identities['clinician-unassigned'].profileId, f.patientId]);
  const second = f.principals['clinician-unassigned'], a = await f.write(), input = command(f, a), gate = await f.pool.connect();
  if (kind === 'privacy-existing') await f.amend.exclude(f.actor, command(f, a));
  let first, next;
  const leftKind = kind.startsWith('privacy') ? 'privacy' : kind.startsWith('exclude') ? 'exclude' : 'correct';
  const rightKind = kind.endsWith('privacy') || ['privacy-existing', 'privacy-rollback'].includes(kind) ? 'privacy' : kind.endsWith('exclude') ? 'exclude' : 'correct';
  const invoke = (actor, operation, key) => operation === 'privacy' ? f.amend.restrictWrongPatient(actor, privacy(f, a, [], { operationId: key })) : operation === 'exclude' ? f.amend.exclude(actor, { ...input, operationId: key }) : f.amend.correct(actor, { ...input, operationId: key, replacement: pair });
  try {
    await gate.query('BEGIN'); await gate.query('SELECT pg_advisory_xact_lock(313131)');
    await f.pool.query(`CREATE FUNCTION pause_bp31() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='${kind === 'privacy-existing' ? 'BP_PRIVACY_RESTRICTED' : 'BP_EVIDENCE_EXCLUDED'}' AND NEW.actor_user_id='${f.actor.userId}'::uuid THEN PERFORM pg_advisory_xact_lock(313131); ${kind.endsWith('rollback') ? "RAISE EXCEPTION 'rollback winner';" : ''} END IF; RETURN NEW; END $$; CREATE TRIGGER pause_bp31 BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_bp31()`);
    const gatePid = (await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    first = invoke(f.actor, leftKind, input.operationId).then(value => ({ value }), error => ({ error }));
    const firstPid = await waitBlockedBy(f.pool, gatePid);
    // Exact retry shares the actor/session; other competitors use another clinician.
    next = invoke(kind === 'exact' ? f.actor : second, rightKind, kind === 'exact' ? input.operationId : randomUUID()).then(value => ({ value }), error => ({ error }));
    await waitBlockedBy(f.pool, firstPid);
    await gate.query('COMMIT');
    const one = await first, two = await next;
    if (kind.endsWith('rollback')) { assert.equal(one.error.code, 'BP_AMENDMENT_UNAVAILABLE'); assert.ok(two.value); }
    else {
      assert.ok(one.value);
      if (kind === 'correct-privacy') assert.ok(two.value);
      else if (kind === 'exact') assert.deepEqual(two.value, { ...one.value, created: false });
      else assert.equal(two.error.code, 'BP_AMENDMENT_CONFLICT');
    }
    assert.ok((await f.pool.query('SELECT count(*)::int n FROM bp_exclusions WHERE bp_id=$1', [a.id])).rows[0].n <= 1);
  } finally { await gate.query('ROLLBACK'); if (first) await first; if (next) await next; gate.release(); }
}));

test('Issue31 private target/input copy survives caller mutation while authorization awaits', () => use(async f => {
  const a = await f.write(), b = await f.write(), input = { ...command(f, a), replacement: { ...pair } }, started = signal(), release = signal();
  let once = false;
  const restore = observeApplicabilityQueries((q, next) => {
    if (!once && /SELECT id FROM public.users/.test(q.text)) { once = true; started.resolve(); return release.promise.then(next); }
    return next();
  });
  let pending;
  try {
    pending = f.amend.correct(f.actor, input); await started.promise;
    input.bpId = b.id; input.patientId = f.identities['patient-b'].profileId; input.replacement.systolic = 999;
    release.resolve(); const result = await pending;
    assert.equal((await f.pool.query('SELECT bp_id FROM bp_exclusions')).rows[0].bp_id, a.id);
    assert.equal((await f.pool.query('SELECT systolic FROM blood_pressure_measurements WHERE id=$1', [result.replacementId])).rows[0].systolic, 149);
  } finally { release.resolve(); if (pending) await pending; restore(); }
}));

test('Issue31 actual HTTP history and encounter references mask F1 for patient/clinician including HEAD', () => use(async f => {
  const password = randomBytes(32).toString('base64url');
  await f.pool.query('UPDATE users SET password_hash=$1', [await hashPassword(Buffer.from(password))]);
  const auth = createAuthPersistence(f.url), db = createDatabase(f.url), config = authConfiguration({ NODE_ENV: 'test', AUTH_BROWSER_ORIGIN: 'http://localhost:3000' });
  const app = await createApp(db, { store: auth, passwords: await createPasswordVerifier(), config }, undefined, f.bp, { encounters: f.encounters, appointments: f.appointments });
  try {
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const a = await f.write(), e = await f.encounters.createClinicalEncounter(f.actor, { patientId: f.patientId, occurredAt: bpInput.measuredAt, purpose: 'HTN_BP_FOLLOWUP' });
    await f.encounters.associateBloodPressureMeasurement(f.actor, { patientId: f.patientId, encounterId: e.id, measurementId: a.id });
    await f.amend.exclude(f.actor, command(f, a)); await f.amend.restrictWrongPatient(f.actor, privacy(f, a));
    for (const who of ['patient-a', 'clinician-assigned']) {
      const login = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json', 'X-EH-Login': '1' }, body: JSON.stringify({ email: f.identities[who].email, password }) }); assert.equal(login.status, 200);
      const cookie = login.headers.getSetCookie()[0].split(';')[0];
      for (const suffix of ['/blood-pressure-measurements', `/clinical-encounters/${e.id}/blood-pressure-associations`]) {
        const response = await fetch(base + `/api/v1/patients/${f.patientId}` + suffix, { headers: { Cookie: cookie } }); assert.equal(response.status, 200);
        const body = await response.json(); assert.deepEqual(body.data, []); assert.equal(body.meta.total, 0); assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal((await fetch(base + `/api/v1/patients/${f.patientId}` + suffix, { method: 'HEAD', headers: { Cookie: cookie } })).status, 200);
      }
    }
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM blood_pressure_measurements')).rows[0].n, 1);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM encounter_bp_associations')).rows[0].n, 1);
  } finally { await app.close(); await auth.close(); await db.close(); }
}));

const settle = p => p.then(value => ({ value }), error => ({ error }));
for (const scope of ['session', 'user', 'assignment', 'profile']) for (const winner of ['change', 'amendment']) test(`Issue31 locked current authority ${scope}: ${winner} wins`, { timeout: 45000 }, () => use(async f => {
  const a = await f.write(), before = await snapshot(f.pool), c = await f.pool.connect();
  const newUser = scope === 'profile' ? (await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,'synthetic','CLINICIAN') RETURNING id", [randomUUID() + '@example.invalid'])).rows[0].id : null;
  const change = scope === 'session' ? ['UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1', [f.actor.sessionId], 'BP_AMENDMENT_UNAUTHENTICATED']
    : scope === 'user' ? ["UPDATE public.users SET status='DISABLED' WHERE id=$1", [f.actor.userId], 'BP_AMENDMENT_UNAUTHENTICATED']
      : scope === 'profile' ? ['UPDATE public.clinician_profiles SET user_id=$1 WHERE id=$2', [newUser, f.identities['clinician-assigned'].profileId], 'BP_AMENDMENT_NOT_FOUND']
      : ["UPDATE public.clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE id=$1", [f.assignmentId], 'BP_AMENDMENT_NOT_FOUND'];
  let pending, mutation, restore; const entered = signal(), release = signal();
  try {
    await c.query('SET statement_timeout=10000'); const pid = (await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    if (winner === 'change') {
      await c.query('BEGIN'); await c.query(...change.slice(0, 2));
      pending = settle(f.amend.correct(f.actor, { ...command(f, a), replacement: pair }));
      await waitBlockedBy(f.pool, pid); await c.query('COMMIT');
      assert.equal((await pending).error.code, change[2]); assert.deepEqual(await snapshot(f.pool), before);
    } else {
      let once = false;
      restore = observeApplicabilityQueries((q, next) => {
        if (!once && /INSERT INTO "public"\."bp_amendment_operations"/.test(q.text)) { once = true; entered.resolve(q); return release.promise.then(next); }
        return next();
      });
      pending = settle(f.amend.correct(f.actor, { ...command(f, a), replacement: pair }));
      const query = await entered.promise;
      mutation = settle(c.query(...change.slice(0, 2))); await waitBlocked(f.pool, pid, 4000, query.pid);
      release.resolve(); assert.ok((await pending).value); assert.equal((await mutation).error, undefined);
      await rejects(f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 }), change[2]);
    }
  } finally { entered.resolve(); release.resolve(); await c.query('ROLLBACK'); await Promise.allSettled([pending, mutation].filter(Boolean)); restore?.(); c.release(); }
}));

test('Issue31 expiry during amendment rolls replacement, exclusion and audit back', { timeout: 45000 }, () => use(async f => {
  const a = await f.write(), before = await snapshot(f.pool);
  await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE id=$1", [f.actor.sessionId]);
  await f.pool.query("CREATE FUNCTION delay_bp31_expiry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_EVIDENCE_EXCLUDED' THEN PERFORM pg_sleep(2.1); END IF; RETURN NEW; END $$; CREATE TRIGGER delay_bp31_expiry BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION delay_bp31_expiry()");
  await rejects(f.amend.correct(f.actor, { ...command(f, a), replacement: pair }), 'BP_AMENDMENT_UNAUTHENTICATED');
  assert.deepEqual(await snapshot(f.pool), before);
}));

test('Issue31 canonical frozen set retry and local receipts preserve separately captured inputs', () => use(async f => {
  const a = await f.write(), ab = await f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  const bc = await f.amend.correct(f.actor, { ...command(f, { id: ab.replacementId }), replacement: { ...pair, measuredAt: '2024-03-01T09:00:00.000Z', systolic: 138 } });
  const captured = globalThis.structuredClone(await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 }));
  const input = privacy(f, { id: bc.replacementId }, [a.id, ab.replacementId]), r = await f.amend.restrictWrongPatient(f.actor, input), before = await snapshot(f.pool);
  assert.deepEqual(await f.amend.restrictWrongPatient(f.actor, { ...input, operationId: input.operationId.toUpperCase(), predecessorIds: input.predecessorIds.toReversed() }), { ...r, created: false });
  assert.deepEqual(await snapshot(f.pool), before); assert.equal(captured.total, 1); assert.equal(captured.measurements[0].id, bc.replacementId);
  assert.equal((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).total, 0);
  assert.ok(before.bp_amendment_operations.every(x => x.asserted_at.getTime() === x.recorded_at.getTime()));
  assert.ok(before.bp_exclusions.every(x => x.recorded_at >= before.bp_amendment_operations.find(o => o.id === x.operation_id).recorded_at));
  // The captured object is a test fixture only; no B2 decision snapshot persistence or wall-clock replay API exists.
}));

test('Issue31 database scope/reason constraints and truthful receipt resist direct SQL and TEMP shadows', () => use(async f => {
  const a = await f.write(), other = await f.write(f.principals['patient-b'], { patientId: f.identities['patient-b'].profileId });
  for (const [patientId, target, reason] of [[f.patientId, other.id, 'DATA_ENTRY_ERROR'], [f.patientId, a.id, 'OTHER']]) {
    await assert.rejects(f.pool.query("INSERT INTO public.bp_amendment_operations(patient_id,actor_user_id,kind,operation_key,target_bp_id,reason_code) VALUES($1,$2,'EXCLUDE',$3,$4,$5)", [patientId, f.actor.userId, randomUUID(), target, reason]));
  }
  const c = await f.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('CREATE TEMP TABLE bp_privacy_targets(bp_id uuid); CREATE TEMP TABLE bp_exclusions(bp_id uuid,reason_code text)');
    const o = (await c.query("INSERT INTO public.bp_amendment_operations(patient_id,actor_user_id,kind,operation_key,target_bp_id,reason_code,asserted_at,recorded_at) VALUES($1,$2,'EXCLUDE',$3,$4,'DATA_ENTRY_ERROR','1900-01-01','1900-01-01') RETURNING *", [f.patientId, f.actor.userId, randomUUID(), a.id])).rows[0];
    const e = (await c.query("INSERT INTO public.bp_exclusions(patient_id,bp_id,operation_id,reason_code,asserted_at,recorded_at) VALUES($1,$2,$3,'DATA_ENTRY_ERROR','1900-01-01','1900-01-01') RETURNING *", [f.patientId, a.id, o.id])).rows[0];
    assert.ok(o.recorded_at > new Date('2026-01-01')); assert.equal(o.asserted_at.getTime(), o.recorded_at.getTime()); assert.ok(e.recorded_at >= o.recorded_at);
    assert.equal((await c.query('SELECT public.bp31_effective($1) effective', [a.id])).rows[0].effective, false);
    await c.query('COMMIT');
  } finally { await c.query('ROLLBACK'); c.release(); }
  const functions = (await f.pool.query("SELECT prosecdef,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'bp31_%'")).rows;
  assert.equal(functions.length, 7); assert.ok(functions.every(x => !x.prosecdef && x.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
}));

for (const missing of ['privacy', 'exclusion', 'privacy-after-exclusion', 'both-children']) test(`Issue31 corrupted WRONG_PATIENT linkage still masks payload: missing ${missing}`, () => use(async f => {
  const a = await f.write();
  if (missing === 'privacy-after-exclusion') await f.amend.exclude(f.actor, command(f, a));
  const input = privacy(f, a);
  await f.amend.restrictWrongPatient(f.actor, input);
  // Fixture-only schema-owner corruption. Ordinary writers cannot disable these guards.
  const tables = missing === 'both-children' ? ['bp_privacy_targets', 'bp_exclusions'] : missing.startsWith('privacy') ? ['bp_privacy_targets'] : ['bp_exclusions'];
  for (const table of tables) await f.pool.query(`ALTER TABLE public.${table} DISABLE TRIGGER USER; DELETE FROM public.${table}; ALTER TABLE public.${table} ENABLE TRIGGER USER`);
  await rejects(f.amend.restrictWrongPatient(f.actor, input), 'BP_AMENDMENT_UNAVAILABLE');
  assert.equal((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).total, 0);
  assert.equal((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).total, 0);
  assert.equal((await f.evidence()).bloodPressureMeasurements.length, 0);
  await rejects(f.amend.getHistory(f.actor, { patientId: f.patientId, bpId: a.id }), 'BP_AMENDMENT_NOT_FOUND');
}));

test('Issue31 corrupted missing nonprivate exclusion child never makes its source effective again', () => use(async f => {
  const a = await f.write(); await f.amend.exclude(f.actor, command(f, a));
  await f.pool.query('ALTER TABLE public.bp_exclusions DISABLE TRIGGER USER; DELETE FROM public.bp_exclusions; ALTER TABLE public.bp_exclusions ENABLE TRIGGER USER');
  assert.equal((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).total, 0);
  assert.equal((await f.evidence()).bloodPressureMeasurements.length, 0);
  assert.equal((await f.bp.listBloodPressureMeasurements(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).total, 1);
  await rejects(f.amend.getHistory(f.actor, { patientId: f.patientId, bpId: a.id }), 'BP_AMENDMENT_UNAVAILABLE');
}));

test('Issue31 operation identity spans sessions and assigned patients without duplicating evidence/audit', () => use(async f => {
  const a = await f.write(), input = { ...command(f, a), replacement: pair }, r = await f.amend.correct(f.actor, input);
  const auth = createAuthPersistence(f.url), tokenHash = randomBytes(32).toString('hex');
  try {
    const { password_hash: verifiedHash } = (await f.pool.query('SELECT password_hash FROM users WHERE id=$1', [f.actor.userId])).rows[0];
    await auth.createSession({ userId: f.actor.userId, verifiedHash, tokenHash, previousHash: null });
    const secondSession = await auth.resolve(tokenHash); assert.notEqual(secondSession.sessionId, f.actor.sessionId);
    const before = await snapshot(f.pool);
    assert.deepEqual(await f.amend.correct(secondSession, { ...input, replacement: { ...pair, measuredAt: '2024-02-29T02:00:00+02:00' } }), { ...r, created: false });
    assert.deepEqual(await snapshot(f.pool), before);
    const patientId = f.identities['patient-b'].profileId, other = await f.write(f.principals['patient-b'], { patientId });
    await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)', [f.identities['clinician-assigned'].profileId, patientId]);
    await rejects(f.amend.correct(secondSession, { ...input, patientId, bpId: other.id }), 'BP_AMENDMENT_CONFLICT');
  } finally { await auth.close(); }
}));

test('Issue31 opposing duplicate adjudications lock identities in canonical order and explicitly conflict', { timeout: 45000 }, () => use(async f => {
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)', [f.identities['clinician-unassigned'].profileId, f.patientId]);
  const a = await f.write(), b = await f.write(), gate = await f.pool.connect(); let first, second;
  try {
    await gate.query('BEGIN'); await gate.query('SELECT pg_advisory_xact_lock(313132)');
    await f.pool.query("CREATE FUNCTION pause_duplicate31() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_EVIDENCE_EXCLUDED' THEN PERFORM pg_advisory_xact_lock(313132); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_duplicate31 BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_duplicate31()");
    const pid = (await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    first = settle(f.amend.exclude(f.actor, command(f, a, { reason: 'DUPLICATE', duplicateOfBpId: b.id })));
    const blocker = await waitBlockedBy(f.pool, pid);
    second = settle(f.amend.exclude(f.principals['clinician-unassigned'], command(f, b, { reason: 'DUPLICATE', duplicateOfBpId: a.id })));
    await waitBlockedBy(f.pool, blocker); await gate.query('COMMIT');
    assert.ok((await first).value); assert.equal((await second).error.code, 'BP_AMENDMENT_CONFLICT');
    assert.deepEqual((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).measurements.map(x => x.id), [b.id]);
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM bp_exclusions')).rows[0].n, 1);
  } finally { await gate.query('ROLLBACK'); await Promise.allSettled([first, second].filter(Boolean)); gate.release(); }
}));

test('Issue31 explicit privacy predecessors include required linked restatement provenance without automatic growth', () => use(async f => {
  const a = await f.write(); await f.amend.exclude(f.actor, command(f, a));
  const b = await f.amend.restate(f.actor, { patientId: f.patientId, bpId: a.id, operationId: randomUUID(), replacement: pair });
  const c = await f.amend.correct(f.actor, { ...command(f, { id: b.replacementId }), replacement: { ...pair, systolic: 138 } });
  await f.amend.restrictWrongPatient(f.actor, privacy(f, { id: b.replacementId }, [a.id]));
  assert.deepEqual((await f.pool.query('SELECT bp_id FROM bp_privacy_targets ORDER BY bp_id')).rows.map(x => x.bp_id), [a.id, b.replacementId].sort());
  assert.deepEqual((await f.amend.listEffective(f.actor, { patientId: f.patientId, page: 1, pageSize: 10 })).measurements.map(x => x.id), [c.replacementId]);
}));

test('Issue31 late audit failure rolls every explicit privacy target back, including missing exclusions', () => use(async f => {
  const a = await f.write(), b = await f.amend.correct(f.actor, { ...command(f, a), replacement: pair });
  const last = [a.id, b.replacementId].sort().at(-1), before = await snapshot(f.pool);
  await f.pool.query(`CREATE FUNCTION fail_last_privacy31() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_PRIVACY_RESTRICTED' AND EXISTS(SELECT 1 FROM public.bp_privacy_targets WHERE id=NEW.entity_id AND bp_id='${last}'::uuid) THEN RAISE EXCEPTION 'late privacy fault'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_last_privacy31 BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_last_privacy31()`);
  await rejects(f.amend.restrictWrongPatient(f.actor, privacy(f, { id: b.replacementId }, [a.id])), 'BP_AMENDMENT_UNAVAILABLE');
  assert.deepEqual(await snapshot(f.pool), before);
}));

test('Issue31 generated Prisma writes cannot bypass amendment history guards or retained uniqueness', () => use(async f => {
  const a = await f.write(); await f.amend.restrictWrongPatient(f.actor, privacy(f, a));
  const before = await snapshot(f.pool), { createRequire } = await import('node:module');
  const require = createRequire(new URL('../../packages/db/package.json', import.meta.url));
  const { PrismaPg } = require('@prisma/adapter-pg'), { PrismaClient } = await import('../../packages/db/dist/generated/prisma/client.js');
  const client = new PrismaClient({ adapter: new PrismaPg(f.pool), log: [] });
  try {
    for (const model of ['bpAmendmentOperation', 'bpExclusion', 'bpPrivacyTarget']) {
      await assert.rejects(client[model].updateMany({ data: { reasonCode: 'WRONG_PATIENT' } }));
      await assert.rejects(client[model].deleteMany());
    }
    for (const table of ['bp_amendment_operations', 'bp_exclusions', 'bp_privacy_targets']) await assert.rejects(client.$executeRawUnsafe(`TRUNCATE public.${table} CASCADE`));
  } finally { await client.$disconnect(); }
  assert.deepEqual(await snapshot(f.pool), before);
  const indexes = (await f.pool.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('bp_exclusions_bp_id_key','bp_privacy_targets_bp_id_key','bp_amendment_operations_new_bp_id_key','bp_amendment_operations_actor_user_id_kind_operation_key_key','bp_one_restatement_per_target')")).rows;
  assert.equal(indexes.length, 5); assert.ok(indexes.every(x => x.indexdef.startsWith('CREATE UNIQUE INDEX')));
}));

test('Issue31 privacy wins BP lock: waiting exact encounter association retry cannot acknowledge a hidden BP', { timeout: 45000 }, () => use(async f => {
  await f.pool.query('INSERT INTO clinician_patient_assignments(clinician_id,patient_id) VALUES($1,$2)', [f.identities['clinician-unassigned'].profileId, f.patientId]);
  const a = await f.write(), e = await f.encounters.createClinicalEncounter(f.actor, { patientId: f.patientId, occurredAt: bpInput.measuredAt, purpose: 'HTN_BP_FOLLOWUP' });
  const link = { patientId: f.patientId, encounterId: e.id, measurementId: a.id };
  await f.encounters.associateBloodPressureMeasurement(f.actor, link);
  const gate = await f.pool.connect(); let determination, retry;
  try {
    await gate.query('BEGIN'); await gate.query('SELECT pg_advisory_xact_lock(313133)');
    await f.pool.query("CREATE FUNCTION pause_privacy_association31() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='BP_PRIVACY_RESTRICTED' THEN PERFORM pg_advisory_xact_lock(313133); END IF; RETURN NEW; END $$; CREATE TRIGGER pause_privacy_association31 BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION pause_privacy_association31()");
    const pid = (await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    determination = settle(f.amend.restrictWrongPatient(f.actor, privacy(f, a)));
    const blocker = await waitBlockedBy(f.pool, pid);
    retry = settle(f.encounters.associateBloodPressureMeasurement(f.principals['clinician-unassigned'], link));
    await waitBlockedBy(f.pool, blocker); await gate.query('COMMIT');
    assert.ok((await determination).value); assert.equal((await retry).error.code, 'EVIDENCE_NOT_FOUND');
    assert.equal((await f.pool.query('SELECT count(*)::int n FROM encounter_bp_associations')).rows[0].n, 1);
  } finally { await gate.query('ROLLBACK'); await Promise.allSettled([determination, retry].filter(Boolean)); gate.release(); }
}));
