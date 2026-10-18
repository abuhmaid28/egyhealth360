import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
const dbRequire = createRequire(new URL('../packages/db/package.json', import.meta.url));
const { Pool } = dbRequire('pg');
const { PrismaPg } = dbRequire('@prisma/adapter-pg');
import { PrismaClient } from '../packages/db/dist/generated/prisma/client.js';
import {
  createDemoPersistence,
  createAuthPersistence,
  createObservedApplicabilityPersistence,
  ObservedApplicabilityError,
} from '../packages/db/dist/index.js';
import { demoConfiguration, passwordCheck, verificationConfiguration } from './lib/m1-demo.mjs';
import { sessionHash } from '../apps/api/dist/auth.js';
import { applyObservedApplicabilityFixtureTransaction } from './lib/observed-applicability-fixture.mjs';

const config = demoConfiguration(process.env);
const http = verificationConfiguration(process.env);
const demo = createDemoPersistence(config.databaseUrl);
const auth = createAuthPersistence(config.databaseUrl);
const applicability = createObservedApplicabilityPersistence(config.databaseUrl);

const pool = new Pool({ connectionString: config.databaseUrl, max: 2 });
const dbClient = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });

const sessions = [];

try {
  const state = await demo.inspectIdentities({ acceptsExistingHash: passwordCheck(config.password) });
  const identities = Object.fromEntries(state.identities.map(i => [i.key, i]));
  const patientA = identities['patient-a'];
  assert.ok(patientA, 'patient-a required');

  // Count existing audit logs before applicability operations
  const preAudit = await dbClient.$queryRaw`
    SELECT COUNT(*)::int AS count FROM public.audit_logs
  `;
  const preAuditCount = preAudit[0].count;

  // Both first application and exact repeat use the same bounded write entry.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await applyObservedApplicabilityFixtureTransaction(dbClient, patientA.profileId);
    assert.equal(res.success, true);
    assert.equal(res.snapshotCount, 4);
    assert.equal(res.retractionCount, 1);
  }

  // Verify zero audit logs created by internal synthetic writes
  const postAudit = await dbClient.$queryRaw`
    SELECT COUNT(*)::int AS count FROM public.audit_logs
  `;
  assert.equal(postAudit[0].count, preAuditCount, 'AuditLog must remain completely silent for synthetic writes');

  // 3. Establish genuine HTTP sessions for all demo identities
  for (const identity of state.identities) {
    const login = await fetch(http.base + '/api/v1/auth/login', {
      method: 'POST',
      headers: {
        Origin: http.origin,
        'Content-Type': 'application/json',
        'X-EH-Login': '1',
      },
      body: JSON.stringify({ email: identity.email, password: config.password.toString('utf8') }),
    });
    assert.equal(login.status, 200);
    const data = await login.json();
    sessions.push({
      key: identity.key,
      role: identity.role,
      cookie: login.headers.get('set-cookie').split(';')[0],
      csrf: data.data.csrfToken,
    });
  }

  // 4. Test authorized read matrix
  for (const session of sessions) {
    const token = Buffer.from(session.cookie.split('=')[1], 'base64url');
    const principal = await auth.resolve(sessionHash(token));
    assert.ok(principal, `Session principal resolved for ${session.key}`);

    const isPatientA = session.key === 'patient-a';
    const isAssignedClinician = session.key === 'clinician-assigned';
    const allowed = isPatientA || isAssignedClinician;

    // Point 1: 2026-03-01T08:00:00.000Z (has 1 active snapshot + 1 retracted snapshot)
    if (allowed) {
      const point1 = await applicability.getObservedApplicabilitySnapshots(principal, {
        patientId: patientA.profileId,
        effectiveAt: '2026-03-01T08:00:00.000Z',
      });
      assert.equal(point1.patientId, patientA.profileId);
      assert.equal(point1.effectiveAt, '2026-03-01T08:00:00.000Z');
      assert.equal(point1.snapshots.length, 2);
      assert.equal(point1.nonRetractedSnapshotIds.length, 1);
      assert.equal(point1.tupleComparison, 'IDENTICAL_TUPLES');
      assert.deepEqual(point1.differingTupleSnapshotIds, []);

      // Point 2: 2026-03-15T09:00:00.000Z (has 2 differing active snapshots)
      const point2 = await applicability.getObservedApplicabilitySnapshots(principal, {
        patientId: patientA.profileId,
        effectiveAt: '2026-03-15T09:00:00.000Z',
      });
      assert.equal(point2.snapshots.length, 2);
      assert.equal(point2.nonRetractedSnapshotIds.length, 2);
      assert.equal(point2.tupleComparison, 'DIFFERING_TUPLES');
      assert.equal(point2.differingTupleSnapshotIds.length, 2);
      assert.deepEqual(point2.differingTupleSnapshotIds, point2.nonRetractedSnapshotIds);
    } else {
      await assert.rejects(
        () =>
          applicability.getObservedApplicabilitySnapshots(principal, {
            patientId: patientA.profileId,
            effectiveAt: '2026-03-01T08:00:00.000Z',
          }),
        (err) => {
          assert.ok(err instanceof ObservedApplicabilityError);
          assert.equal(err.code, 'APPLICABILITY_NOT_FOUND');
          return true;
        }
      );
    }
  }

  console.log('EH-015 observed applicability runtime PASS');
} catch {
  console.error('APPLICABILITY_RUNTIME_FAILED');
  process.exitCode = 1;
} finally {
  for (const session of sessions) {
    try {
      const r = await fetch(http.base + '/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Origin: http.origin,
          'Content-Type': 'application/json',
          Cookie: session.cookie,
          'X-CSRF-Token': session.csrf,
        },
        body: '{}',
      });
      assert.equal(r.status, 204);
    } catch {
      console.error('APPLICABILITY_RUNTIME_LOGOUT_FAILED');
      process.exitCode = 1;
    }
  }
  config.password.fill(0);
  await applicability.close();
  await auth.close();
  await demo.close();
  await dbClient.$disconnect();
  await pool.end();
}
