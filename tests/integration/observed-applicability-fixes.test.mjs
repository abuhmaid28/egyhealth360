import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isolatedObservedApplicability, observeApplicabilityQueries, signal, waitBlocked, waitBlockedBy, applicabilitySnapshot } from '../support/observed-applicability.mjs';
import { internalInsertObservedApplicabilitySnapshot as insert, internalRetractObservedApplicabilitySnapshot as retract } from '../../packages/db/dist/observed-applicability.js';
import { applyObservedApplicabilityFixtureTransaction } from '../../scripts/lib/observed-applicability-fixture.mjs';

const T = '2026-03-01T08:00:00.000Z';
const T2 = '2026-03-01T09:00:00.000Z';
const snapshotInput = (f, overrides = {}) => ({ patientId: f.patientId, sourceType: 'SYNTHETIC_OBSERVED_INPUT',
  sourceReference: 'fix-source', assertionReference: 'fix-item', effectiveAt: T, assertedAt: T,
  ageAssertionState: 'NO_ASSERTION', ageYearsAtAssessment: null, pregnancyStatus: null,
  hypertensionStatus: null, cvdStatus: null, diabetesStatus: null, ckdStatus: null, ...overrides });
const withdrawalInput = (f, s, overrides = {}) => ({ patientId: f.patientId, snapshotId: s.id,
  sourceType: s.sourceType, sourceReference: s.sourceReference, retractionReference: 'withdraw-item',
  assertedAt: T2, reasonCode: 'SOURCE_ASSERTION_WITHDRAWN', ...overrides });
const settle = promise => promise.then(value => ({ value }), error => ({ error }));
const evidence = q => q.text.includes('LEFT JOIN public.observed_applicability_retractions');
const pauseQuery = predicate => {
  const entered = signal(), release = signal();
  let used = false;
  const restore = observeApplicabilityQueries((q, execute) => {
    if (!used && predicate(q)) {
      used = true; entered.resolve(q);
      return release.promise.then(execute);
    }
    return execute();
  });
  return { entered, release, restore };
};

for (const role of ['patient-a', 'clinician-assigned']) test(`EH-015 R1 private target snapshot survives caller mutation (${role})`, { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    const a = await f.insertSnapshot({ assertionReference: 'patient-a-t1' });
    const bId = f.identities['patient-b'].profileId;
    await f.insertSnapshot({ patientId: bId, effectiveAt: T2, assertedAt: T2, assertionReference: 'patient-b-t2' });
    const input = { patientId: f.patientId, effectiveAt: T };
    const gate = pauseQuery(q => q.text.includes('SELECT id FROM public.users') && q.text.includes('FOR NO KEY UPDATE'));
    let pending;
    const actualTargets = [];
    const restoreGate = gate.restore;
    // Chain a second transport observer so target SQL itself is observed.
    const restore = observeApplicabilityQueries((q, execute) => {
      if (evidence(q)) actualTargets.push([...q.values]);
      return execute();
    });
    try {
      pending = settle(f.applicability.getObservedApplicabilitySnapshots(f.principals[role], input));
      await gate.entered.promise;
      input.patientId = bId; input.effectiveAt = T2;
      gate.release.resolve();
      const result = await pending;
      assert.equal(result.error, undefined);
      assert.deepEqual(actualTargets, [[f.patientId, T]]);
      assert.equal(result.value.patientId, f.patientId);
      assert.equal(result.value.effectiveAt, T);
      assert.deepEqual(result.value.snapshots.map(s => s.id), [a.snapshot.id]);
    } finally { gate.release.resolve(); if (pending) await pending; restore(); restoreGate(); }
  }));

// Both transactions call the real helper. The winner is held after its write,
// and the contender's exact backend must report the winner as its blocker.
async function race(f, winnerOp, contenderOp, rollback = false) {
  const winnerReady = signal(), contenderReady = signal(), release = signal();
  let first, second;
  try {
    first = settle(f.transaction(async tx => {
      const pid = (await tx.$queryRaw`SELECT pg_backend_pid() pid`)[0].pid;
      const value = await winnerOp(tx);
      winnerReady.resolve({ pid, value });
      await release.promise;
      if (rollback) throw new Error('EXPECTED_WINNER_ROLLBACK');
      return value;
    }));
    const winner = await winnerReady.promise;
    second = settle(f.transaction(async tx => {
      const pid = (await tx.$queryRaw`SELECT pg_backend_pid() pid`)[0].pid;
      contenderReady.resolve(pid);
      return contenderOp(tx);
    }));
    const pid = await contenderReady.promise;
    await waitBlocked(f.pool, pid, 4000, winner.pid);
    release.resolve();
    return { first: await first, second: await second, winner: winner.value };
  } finally {
    release.resolve();
    await Promise.allSettled([first, second].filter(Boolean));
  }
}

for (const mode of ['exact', 'conflict', 'rollback']) test(`EH-015 real snapshot writer race ${mode}`, { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    const input = snapshotInput(f);
    const result = await race(f, tx => insert(tx, input), tx => insert(tx,
      mode === 'conflict' ? { ...input, diabetesStatus: 'ABSENT' } : input), mode === 'rollback');
    const rows = (await f.pool.query('SELECT * FROM observed_applicability_snapshots')).rows;
    assert.equal(rows.length, 1);
    if (mode === 'conflict') assert.equal(result.second.error?.code, 'APPLICABILITY_CONFLICT');
    else {
      assert.equal(result.second.value.created, mode === 'rollback');
      assert.equal(result.second.value.snapshot.id, rows[0].id);
      if (mode === 'exact') {
        assert.equal(result.second.value.snapshot.id, result.winner.snapshot.id);
        assert.deepEqual(result.second.value.snapshot.recordedAt, result.winner.snapshot.recordedAt);
      } else assert.match(result.first.error.message, /EXPECTED_WINNER_ROLLBACK/);
    }
  }));

for (const mode of ['exact', 'conflict', 'rollback']) test(`EH-015 real retraction writer race ${mode}`, { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    const { snapshot } = await f.transaction(tx => insert(tx, snapshotInput(f)));
    const input = withdrawalInput(f, snapshot);
    const result = await race(f, tx => retract(tx, input), tx => retract(tx,
      mode === 'conflict' ? { ...input, retractionReference: 'different-withdrawal' } : input), mode === 'rollback');
    const rows = (await f.pool.query('SELECT * FROM observed_applicability_retractions')).rows;
    assert.equal(rows.length, 1);
    if (mode === 'conflict') assert.equal(result.second.error?.code, 'APPLICABILITY_CONFLICT');
    else {
      assert.equal(result.second.value.created, mode === 'rollback');
      assert.equal(result.second.value.retraction.id, rows[0].id);
      if (mode === 'exact') assert.equal(result.second.value.retraction.id, result.winner.retraction.id);
      else assert.match(result.first.error.message, /EXPECTED_WINNER_ROLLBACK/);
    }
    const point = await f.getRawPoint(f.patientId, T);
    assert.equal(point.snapshots[0].id, snapshot.id);
    assert.equal(point.snapshots[0].retraction.id, rows[0].id);
    assert.equal(point.tupleComparison, 'NO_NON_RETRACTED_ROWS');
  }));

const changes = {
  session: f => ['UPDATE public.sessions SET revoked_at=clock_timestamp() WHERE id=$1', [f.actor.sessionId], 'APPLICABILITY_UNAUTHENTICATED'],
  user: f => ["UPDATE public.users SET status='DISABLED' WHERE id=$1", [f.actor.userId], 'APPLICABILITY_UNAUTHENTICATED'],
  assignment: f => ["UPDATE public.clinician_patient_assignments SET status='ENDED',ended_at=clock_timestamp() WHERE id=$1", [f.assignmentId], 'APPLICABILITY_NOT_FOUND'],
};
for (const kind of ['session', 'user', 'assignment', 'mapping']) for (const first of ['change', 'read']) test(`EH-015 current authorization race ${kind}: ${first} wins`, { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    let change;
    if (kind === 'mapping') {
      const user = (await f.pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,'synthetic','CLINICIAN') RETURNING id", [randomUUID() + '@example.invalid'])).rows[0];
      change = ['UPDATE public.clinician_profiles SET user_id=$1 WHERE id=$2', [user.id, f.identities['clinician-assigned'].profileId], 'APPLICABILITY_NOT_FOUND'];
    } else change = changes[kind](f);
    const c = await f.pool.connect();
    let pending, mutation, gate;
    try {
      await c.query('SET statement_timeout=10000');
      const pid = (await c.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      if (first === 'change') {
        await c.query('BEGIN'); await c.query(change[0], change[1]);
        pending = settle(f.applicability.getObservedApplicabilitySnapshots(f.actor, { patientId: f.patientId, effectiveAt: T }));
        await waitBlockedBy(f.pool, pid);
        await c.query('COMMIT');
        assert.equal((await pending).error?.code, change[2]);
      } else {
        gate = pauseQuery(evidence);
        pending = settle(f.applicability.getObservedApplicabilitySnapshots(f.actor, { patientId: f.patientId, effectiveAt: T }));
        const readQuery = await gate.entered.promise;
        mutation = settle(c.query(change[0], change[1]));
        await waitBlocked(f.pool, pid, 4000, readQuery.pid);
        gate.release.resolve();
        assert.ok((await pending).value);
        assert.equal((await mutation).error, undefined);
        await assert.rejects(f.applicability.getObservedApplicabilitySnapshots(f.actor, { patientId: f.patientId, effectiveAt: T }), e => e.code === change[2]);
      }
    } finally {
      gate?.release.resolve();
      await c.query('ROLLBACK');
      await Promise.allSettled([pending, mutation].filter(Boolean));
      gate?.restore(); c.release();
    }
  }));

test('EH-015 final expiry check returns no projection after time expires during read', { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    await f.pool.query("UPDATE sessions SET expires_at=clock_timestamp()+interval '3 seconds' WHERE id=$1", [f.actor.sessionId]);
    const gate = pauseQuery(evidence);
    let pending;
    try {
      pending = settle(f.applicability.getObservedApplicabilitySnapshots(f.actor, { patientId: f.patientId, effectiveAt: T }));
      await gate.entered.promise;
      await f.pool.query('SELECT pg_sleep(3.1)');
      gate.release.resolve();
      assert.equal((await pending).error?.code, 'APPLICABILITY_UNAUTHENTICATED');
    } finally { gate.release.resolve(); if (pending) await pending; gate.restore(); }
  }));

test('EH-015 exact point, offset equivalence, one evidence statement, all streams and retained history', () =>
  isolatedObservedApplicability(async f => {
    const s = await f.transaction(tx => insert(tx, snapshotInput(f)));
    await f.transaction(tx => insert(tx, snapshotInput(f, { sourceReference: 'another-source', assertionReference: 'a' })));
    await f.transaction(tx => retract(tx, withdrawalInput(f, s.snapshot)));
    for (const point of ['2026-03-01T07:59:59.999Z', '2026-03-01T08:00:00.001Z']) assert.equal((await f.getRawPoint(f.patientId, point)).snapshots.length, 0);
    let count = 0;
    const restore = observeApplicabilityQueries((q, execute) => { if (evidence(q)) count++; return execute(); });
    try {
      const point = await f.applicability.getObservedApplicabilitySnapshots(f.actor, { patientId: f.patientId, effectiveAt: '2026-03-01T10:00:00+02:00' });
      assert.equal(count, 1);
      assert.equal(point.effectiveAt, T);
      assert.equal(point.snapshots.length, 2);
      assert.deepEqual(point.snapshots.map(row => row.sourceReference), ['another-source', 'fix-source']);
      assert.equal(point.snapshots[1].retraction.snapshotId, s.snapshot.id);
    } finally { restore(); }
  }));

test('EH-015 coherent query sees no uncommitted retraction and keeps original history after commit', () =>
  isolatedObservedApplicability(async f => {
    const { snapshot } = await f.transaction(tx => insert(tx, snapshotInput(f)));
    const ready = signal(), release = signal();
    let writer;
    try {
      writer = settle(f.transaction(async tx => {
        await retract(tx, withdrawalInput(f, snapshot)); ready.resolve(); await release.promise;
      }));
      await ready.promise;
      const before = await f.getRawPoint(f.patientId, T);
      assert.equal(before.snapshots[0].retraction, null);
      assert.equal(before.tupleComparison, 'IDENTICAL_TUPLES');
      release.resolve(); assert.equal((await writer).error, undefined);
      const after = await f.getRawPoint(f.patientId, T);
      assert.equal(after.snapshots[0].id, snapshot.id);
      assert.ok(after.snapshots[0].retraction);
      assert.equal(after.tupleComparison, 'NO_NON_RETRACTED_ROWS');
    } finally { release.resolve(); if (writer) await writer; }
  }));

test('EH-015 fixture apply held-lock failure is bounded and rolls back partial snapshots', { timeout: 45000 }, () =>
  isolatedObservedApplicability(async f => {
    const fixture = JSON.parse(await readFile('tests/fixtures/eh015-observed-input-v1.json', 'utf8'));
    const gate = await f.pool.connect();
    let pending;
    try {
      await gate.query('BEGIN');
      // A winning uncommitted duplicate is invisible to the other transaction.
      // First item in contender is new, second waits on this duplicate.
      const item = fixture.snapshots[0];
      await gate.query(`INSERT INTO observed_applicability_snapshots(patient_id,source_type,source_reference,assertion_reference,effective_at,asserted_at,age_assertion_state,age_years_at_assessment) VALUES($1,'SYNTHETIC_OBSERVED_INPUT',$2,$3,$4,$5,'ASSERTED_VALUE',52)`, [f.patientId, item.sourceReference, item.assertionReference, item.effectiveAt, item.assertedAt]);
      const custom = { ...fixture, snapshots: [{ ...item, assertionReference: 'first-partial' }, item], retractions: [] };
      const start = Date.now();
      pending = settle(applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, custom));
      await waitBlockedBy(f.pool, (await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid);
      const result = await pending;
      assert.equal(result.error?.code, 'APPLICABILITY_SERVICE_UNAVAILABLE');
      assert.ok(Date.now() - start < 15000, 'database lock timeout bounds the actual fixture path');
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM observed_applicability_snapshots')).rows[0].n, 0);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM observed_applicability_retractions')).rows[0].n, 0);
      await gate.query('ROLLBACK');
      await applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, custom);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM observed_applicability_snapshots')).rows[0].n, 2);
    } finally { await gate.query('ROLLBACK'); if (pending) await pending; gate.release(); }
  }));

test('EH-015 atomic corrected snapshot plus withdrawal rolls back on late failure', () =>
  isolatedObservedApplicability(async f => {
    const { snapshot } = await f.transaction(tx => insert(tx, snapshotInput(f)));
    const before = await applicabilitySnapshot(f.pool);
    await assert.rejects(f.transaction(async tx => {
      await insert(tx, snapshotInput(f, { assertionReference: 'correction' }));
      await retract(tx, withdrawalInput(f, snapshot));
      throw new Error('INJECTED_LATE_FAILURE');
    }), /INJECTED_LATE_FAILURE/);
    assert.deepEqual(await applicabilitySnapshot(f.pool), before);
  }));

test('EH-015 PostgreSQL time checks, receipt ownership, real patient/source FK and terminal integrity', () =>
  isolatedObservedApplicability(async f => {
    const sql = `INSERT INTO public.observed_applicability_snapshots
      (patient_id,source_type,source_reference,assertion_reference,effective_at,asserted_at,recorded_at,age_assertion_state)
      VALUES($1,'SYNTHETIC_OBSERVED_INPUT','sql-src',$2,$3::timestamptz(6),$4::timestamptz(6),$5::timestamptz(3),'NO_ASSERTION') RETURNING *`;
    for (const time of ['infinity', '-infinity', '0001-01-01 BC', '10000-01-01T00:00:00Z', '2026-03-01T08:00:00.000001Z']) {
      await assert.rejects(f.pool.query(sql, [f.patientId, randomUUID(), time, T2, '9999-01-01']));
      await assert.rejects(f.pool.query(sql, [f.patientId, randomUUID(), T, time, '9999-01-01']));
    }
    await assert.rejects(f.pool.query(sql, [f.patientId, randomUUID(), T2, T, '9999-01-01']), e => e.constraint === 'oa_snapshots_chronology_check');
    await assert.rejects(f.pool.query(sql, [f.patientId, randomUUID(), T, '9999-01-01', '9999-01-01']), e => e.constraint === 'oa_snapshots_chronology_check');
    const s = (await f.pool.query(sql, [f.patientId, 'receipt-spoof', T, T, '0001-01-01T00:00:00Z'])).rows[0];
    assert.ok(s.recorded_at.getTime() > Date.parse(T));
    assert.ok(Math.abs(s.recorded_at.getTime() - Date.now()) < 5000);
    const target = { id: s.id, sourceType: s.source_type, sourceReference: s.source_reference };
    const r = await f.transaction(tx => retract(tx, withdrawalInput(f, target)));
    await assert.rejects(f.pool.query(`INSERT INTO observed_applicability_retractions(snapshot_id,patient_id,source_type,source_reference,retraction_reference,asserted_at,reason_code) VALUES($1,$2,'SYNTHETIC_OBSERVED_INPUT','sql-src','second',$3,'SOURCE_ASSERTION_WITHDRAWN')`, [s.id, f.patientId, T2]), e => e.code === '23505');
    assert.ok(r.retraction.recordedAt >= s.recorded_at);
    assert.equal((await f.getRawPoint(f.patientId, T)).snapshots[0].retraction.id, r.retraction.id);

    const independent = await f.insertSnapshot({ assertionReference: 'independent-fk' });
    const c = await f.pool.connect();
    try {
      await c.query('BEGIN');
      // Independent FK proof, without the scope guard short-circuiting the FK.
      await c.query('ALTER TABLE public.observed_applicability_retractions DISABLE TRIGGER oa_retractions_insert_guard');
      for (const [patient, source] of [[f.identities['patient-b'].profileId, independent.snapshot.sourceReference], [f.patientId, 'other-source']]) {
        await c.query('SAVEPOINT fk_test');
        await assert.rejects(c.query(`INSERT INTO public.observed_applicability_retractions(snapshot_id,patient_id,source_type,source_reference,retraction_reference,asserted_at,reason_code) VALUES($1,$2,'SYNTHETIC_OBSERVED_INPUT',$3,$4,$5,'SOURCE_ASSERTION_WITHDRAWN')`, [independent.snapshot.id, patient, source, randomUUID(), T2]), e => e.constraint === 'oa_retractions_snapshot_scope_fkey');
        await c.query('ROLLBACK TO SAVEPOINT fk_test');
      }
    } finally { await c.query('ROLLBACK'); c.release(); }

    const fresh = await f.insertSnapshot({ assertionReference: 'scope-real-target' });
    for (const change of [{ patientId: f.identities['patient-b'].profileId }, { sourceReference: 'other-source' }]) {
      await assert.rejects(f.retractSnapshot({ snapshotId: fresh.snapshot.id, ...change }), e => e.code === 'APPLICABILITY_NOT_FOUND');
    }
    for (const table of ['observed_applicability_snapshots', 'observed_applicability_retractions']) {
      for (const statement of [`UPDATE ${table} SET id=id WHERE false`, `UPDATE ${table} SET id=id`, `DELETE FROM ${table} WHERE false`, `DELETE FROM ${table}`, `TRUNCATE ${table} CASCADE`]) {
        await assert.rejects(f.pool.query(statement), e => e.constraint === 'eh015_immutable_applicability_guard');
      }
    }
  }));

test('EH-015 TEMP shadows cannot forge public patient or snapshot scope; catalog matches Prisma PKs', () =>
  isolatedObservedApplicability(async f => {
    const s = await f.insertSnapshot();
    const c = await f.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('CREATE TEMP TABLE patient_profiles AS SELECT * FROM public.patient_profiles');
      await c.query('CREATE TEMP TABLE observed_applicability_snapshots AS SELECT * FROM public.observed_applicability_snapshots');
      const fake = randomUUID();
      await c.query('UPDATE pg_temp.patient_profiles SET id=$1 WHERE id=$2', [fake, f.patientId]);
      await c.query('SAVEPOINT shadow');
      await assert.rejects(c.query(`INSERT INTO public.observed_applicability_snapshots(patient_id,source_type,source_reference,assertion_reference,effective_at,asserted_at,age_assertion_state) VALUES($1,'SYNTHETIC_OBSERVED_INPUT','temp','temp',$2,$2,'NO_ASSERTION')`, [fake, T]), e => e.constraint === 'oa_snapshots_scope_guard');
      await c.query('ROLLBACK TO SAVEPOINT shadow');
      await c.query('UPDATE pg_temp.observed_applicability_snapshots SET patient_id=$1 WHERE id=$2', [f.identities['patient-b'].profileId, s.snapshot.id]);
      await assert.rejects(c.query(`INSERT INTO public.observed_applicability_retractions(snapshot_id,patient_id,source_type,source_reference,retraction_reference,asserted_at,reason_code) VALUES($1,$2,'SYNTHETIC_OBSERVED_INPUT',$3,'temp',$4,'SOURCE_ASSERTION_WITHDRAWN')`, [s.snapshot.id, f.identities['patient-b'].profileId, s.snapshot.sourceReference, T2]), e => e.constraint === 'oa_retractions_target_scope_guard');
    } finally { await c.query('ROLLBACK'); c.release(); }
    const pk = (await f.pool.query("SELECT conname FROM pg_constraint WHERE conrelid IN ('public.observed_applicability_snapshots'::regclass,'public.observed_applicability_retractions'::regclass) AND contype='p' ORDER BY conname")).rows;
    assert.deepEqual(pk.map(x => x.conname), ['oa_retractions_pkey', 'oa_snapshots_pkey']);
    const funcs = (await f.pool.query("SELECT prosecdef,proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'eh015_%'")).rows;
    assert.equal(funcs.length, 3);
    assert.ok(funcs.every(x => !x.prosecdef && x.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
  }));

test('EH-015 withdrawal receipt spoof and invalid source times cannot rewrite chronology', () =>
  isolatedObservedApplicability(async f => {
    const { snapshot } = await f.transaction(tx => insert(tx, snapshotInput(f)));
    const sql = `INSERT INTO public.observed_applicability_retractions
      (snapshot_id,patient_id,source_type,source_reference,retraction_reference,asserted_at,recorded_at,reason_code)
      VALUES($1,$2,'SYNTHETIC_OBSERVED_INPUT',$3,$4,$5::timestamptz(6),$6::timestamptz(3),'SOURCE_ASSERTION_WITHDRAWN') RETURNING *`;
    for (const time of ['2026-03-01T07:59:59.999Z', 'infinity', '-infinity', '10000-01-01T00:00:00Z', '2026-03-01T09:00:00.000001Z', '9999-01-01T00:00:00Z']) {
      await assert.rejects(f.pool.query(sql, [snapshot.id, f.patientId, snapshot.sourceReference, randomUUID(), time, '9999-01-01']));
    }
    const r = (await f.pool.query(sql, [snapshot.id, f.patientId, snapshot.sourceReference, 'spoofed-receipt', T2, '0001-01-01T00:00:00Z'])).rows[0];
    assert.ok(r.recorded_at >= snapshot.recordedAt);
    assert.ok(Math.abs(r.recorded_at.getTime() - Date.now()) < 5000);
    const before = await applicabilitySnapshot(f.pool);
    await assert.rejects(f.prisma.observedClinicalApplicabilitySnapshot.update({ where: { id: snapshot.id }, data: { ageYearsAtAssessment: null } }));
    await assert.rejects(f.prisma.observedClinicalApplicabilityRetraction.deleteMany());
    assert.deepEqual(await applicabilitySnapshot(f.pool), before);
  }));

test('EH-015 actual fixture path rolls back snapshots and first withdrawal on a later conflict', () =>
  isolatedObservedApplicability(async f => {
    const fixture = JSON.parse(await readFile('tests/fixtures/eh015-observed-input-v1.json', 'utf8'));
    fixture.retractions.push({ ...fixture.retractions[0], retractionReference: 'late-conflicting-withdrawal' });
    const before = await applicabilitySnapshot(f.pool);
    await assert.rejects(applyObservedApplicabilityFixtureTransaction(f.prisma, f.patientId, fixture), e => e.code === 'APPLICABILITY_CONFLICT');
    assert.deepEqual(await applicabilitySnapshot(f.pool), before);
  }));
