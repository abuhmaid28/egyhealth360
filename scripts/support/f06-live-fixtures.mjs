/** NEW Issue124 fixture-only worker. Streams synthetic secrets over pipes;
 * never imports/connects at module load. Existing ready()/pastBooking helpers
 * retime protected rows: unsuitable here. Use real clock and public stores.
 */
export const LEDGER = Object.freeze({
  identities: 5, setupSessions: 5, organizations: 1, memberships: 2,
  specialties: 1, clinics: 1, providers: 2, affiliations: 2, publications: 4,
  settings: 1, slots: 2, bookings: 2, relationshipRequests: 2, acceptances: 2,
  opens: 1, documentDrafts: 3, privateSigns: 1, intentDrafts: 2, fixtureClose: 1,
  summaryReleases: 1, intentReleases: 1, summaryRestrictions: 1, intentRestrictions: 1,
  organizationTransitions: 2, membershipEnds: 1, assignmentEnds: 2,
  userTransitions: 2, sessionExpiry: 1, sessionRevocation: 1,
  loginMaximum: 32, logoutMaximum: 24, clinicalReplay: 0, clinicalReadMutations: 0,
});
export const ACTIONS = Object.freeze(['initialize', 'snapshot', 'release', 'grantOther',
  'restrictSummary', 'restrictIntent', 'suspend', 'restore', 'endMembership',
  'endOther', 'endAuthor', 'disable', 'enable', 'expire', 'revoke']);
export function request(action, fixture, input = {}) {
  if (!ACTIONS.includes(action)) throw new Error('FIXTURE_ACTION_REJECTED');
  return JSON.stringify({ action, fixture, input });
}
export const program = () => `(${worker.toString()})(${JSON.stringify(LEDGER)})`;

async function worker(limits) {
  const { default: assert } = await import('node:assert/strict');
  const { createRequire } = await import('node:module');
  const { randomBytes, randomUUID, createHash } = await import('node:crypto');
  const { Buffer } = await import('node:buffer');
  const { setTimeout: delay } = await import('node:timers/promises');
  const { Pool } = createRequire('/app/packages/db/package.json')('pg');
  const db = await import('/app/packages/db/dist/index.js');
  const { hashPassword } = await import('/app/apps/api/dist/password.js');
  const stores = [], counts = {};
  let pool, output, phase = 'input';
  try {
    let raw = ''; for await (const part of process.stdin) { raw += part; assert.ok(raw.length < 1000000); }
    const { action, fixture: f, input } = JSON.parse(raw);
    const url = new URL(process.env.DATABASE_URL);
    assert.equal(url.protocol, 'postgresql:'); assert.equal(url.hostname, 'postgres');
    assert.equal(url.port, '5432'); assert.equal(url.pathname, '/eh124_e2');
    assert.equal(url.username, 'eh124_e2'); assert.ok(url.password.length >= 32);
    assert.equal(url.search + url.hash, ''); assert.equal(process.env.NODE_ENV, 'development');
    assert.match(process.env.EH124_PROJECT ?? '', /^eh124-e2-[a-f0-9]{12}$/);
    pool = new Pool({ connectionString: url.href, max: 2, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    const store = factory => { const s = factory(url.href); stores.push(s); return s; };
    const users = store(db.createPersistence), auth = store(db.createAuthPersistence);
    const orgs = store(db.createOrganizationPersistence), directory = store(db.createDirectoryPersistence);
    const availability = store(db.createAvailabilityPersistence), bookings = store(db.createBookingPersistence);
    const relationships = store(db.createRelationshipPersistence), consultations = store(db.createConsultationPersistence);
    const documents = store(db.createDocumentationPersistence), intents = store(db.createFollowUpIntentPersistence);
    const call = async (label, fn) => { phase = label; counts[label] = (counts[label] ?? 0) + 1; assert.ok(counts[label] <= limits[label]); return fn(); };
    const key = () => randomUUID();
    const actor = async alias => { const a = await auth.resolve(f.setupHashes[alias]); assert.equal(a?.userId, f.users[alias].id); return a; };
    const grant = async (state, alias, patient, clinician) => {
      const r = await call('relationshipRequests', () => relationships.authorize(patient, { providerId: state.providers[alias].publicId, operationKey: key() }));
      await call('acceptances', () => relationships.decide(clinician, { requestId: r.request.id }, 'accept'));
      const rows = (await pool.query("SELECT id FROM clinician_patient_assignments WHERE clinician_id=$1 AND patient_id=$2 AND status='ACTIVE' AND ended_at IS NULL", [state.users[alias].profileId, state.users.patientA.profileId])).rows;
      assert.equal(rows.length, 1); return rows[0].id;
    };
    let result;
    if (action === 'initialize') {
      assert.equal((await pool.query('SELECT count(*)::int n FROM users')).rows[0].n, 0);
      assert.match(input.nonce, /^[a-f0-9]{12}$/); assert.ok(input.password.length >= 32);
      const hash = await hashPassword(Buffer.from(input.password));
      const state = { users: {}, setupHashes: {}, memberships: {}, providers: {}, grants: {}, sources: {}, canaries: {}, secretHashes: [hash] }, actors = {};
      for (const [alias, role] of Object.entries({ admin: 'ADMIN', doctorA: 'CLINICIAN', doctorB: 'CLINICIAN', patientA: 'PATIENT', patientB: 'PATIENT' })) {
        const name = `Synthetic E2 ${alias} ${input.nonce}`;
        state.users[alias] = await call('identities', () => users.createUser({ email: `${alias.toLowerCase()}-${input.nonce}@e2.example.invalid`, passwordHash: hash, role, ...(role === 'ADMIN' ? {} : { profile: { displayName: name } }) }));
        state.users[alias].displayName = name;
        state.setupHashes[alias] = randomBytes(32).toString('hex'); state.secretHashes.push(state.setupHashes[alias]);
        actors[alias] = await call('setupSessions', () => auth.createSession({ userId: state.users[alias].id, verifiedHash: hash, tokenHash: state.setupHashes[alias], previousHash: null }));
        assert.ok(actors[alias]);
      }
      const admin = actors.admin, doctor = actors.doctorA;
      state.organization = (await call('organizations', () => orgs.createOrganization(admin, { kind: 'CLINIC', name: 'Synthetic E2 clinic', operationKey: key() }))).organization;
      let specialty = (await call('specialties', () => directory.createSpecialty(admin, { key: 'e2-general', displayName: 'Synthetic E2 general', operationKey: key() }))).specialty;
      specialty = (await call('publications', () => directory.setSpecialty(admin, { specialtyId: specialty.id, displayName: specialty.displayName, expectedVersion: specialty.version, isPublished: true }))).specialty;
      let clinic = (await call('clinics', () => directory.createClinic(admin, { organizationId: state.organization.id, displayName: 'Synthetic E2 clinic', city: 'Synthetic', address: 'Synthetic only', operationKey: key() }))).clinic;
      clinic = (await call('publications', () => directory.setClinic(admin, { clinicId: clinic.id, displayName: clinic.displayName, city: clinic.city, address: clinic.address, expectedVersion: clinic.version, isPublished: true }))).clinic; state.clinic = clinic;
      for (const alias of ['doctorA', 'doctorB']) {
        state.memberships[alias] = (await call('memberships', () => orgs.grantMembership(admin, { organizationId: state.organization.id, userId: state.users[alias].id, operationKey: key() }))).membership;
        let p = (await call('providers', () => directory.createProvider(admin, { clinicianId: state.users[alias].profileId, specialtyId: specialty.id, displayName: `Synthetic E2 ${alias}`, operationKey: key() }))).provider;
        await call('affiliations', () => directory.publishAffiliation(admin, { providerId: p.id, membershipId: state.memberships[alias].id, operationKey: key() }));
        p = (await call('publications', () => directory.setProvider(admin, { providerId: p.id, specialtyId: specialty.id, displayName: p.displayName, expectedVersion: p.version, isPublished: true }))).provider; state.providers[alias] = p;
      }
      await call('settings', () => availability.setConfiguration(admin, { organizationId: state.organization.id, expectedVersion: 0, timeZone: 'UTC', durationMinutes: 5, minimumBookingLead: 0, publicationHorizonDays: 30 }));
      const start = new Date((await pool.query('SELECT clock_timestamp() now')).rows[0].now.getTime() + 15000);
      for (const [alias, offset] of [['patientA', 0], ['patientB', 3600000]]) {
        const at = new Date(start.getTime() + offset);
        const slot = await call('slots', () => availability.publish(doctor, { clinicId: clinic.publicId, startAt: at.toISOString(), endAt: new Date(at.getTime() + 300000).toISOString(), operationKey: key() }));
        state[alias === 'patientA' ? 'booking' : 'otherBooking'] = await call('bookings', () => bookings.create(actors[alias], { slotId: slot.id, operationKey: key() }));
      }
      state.grants.doctorA = await grant(state, 'doctorA', actors.patientA, doctor);
      const deadline = Date.now() + 30000;
      for (;;) { const remaining = Number((await pool.query('SELECT extract(epoch FROM $1::timestamptz-clock_timestamp()) seconds', [start])).rows[0].seconds); if (remaining <= 0) break; assert.ok(Date.now() < deadline); await delay(Math.min(remaining * 1000 + 20, 1000)); }
      state.consultation = await call('opens', () => consultations.open(doctor, { bookingId: state.booking.id, operationKey: key() }));
      for (const [name, kind] of [['private', 'PRIVATE_NOTE'], ['draftSummary', 'PATIENT_SUMMARY'], ['summary', 'PATIENT_SUMMARY']]) {
        state.canaries[name] = `SYNTH_E2_${name}_${input.nonce}`;
        state.sources[name] = (await call('documentDrafts', () => documents.execute('DRAFT', doctor, { consultationId: state.consultation.id, operationKey: key(), kind, content: state.canaries[name], patientInstructions: '', complaint: 'Synthetic only', problems: [], diagnoses: [], allergyReview: { state: 'UNKNOWN', items: [] } }))).data;
      }
      state.sources.private = (await call('privateSigns', () => documents.execute('SIGN', doctor, { consultationId: state.consultation.id, documentId: state.sources.private.id, expectedVersion: 1, operationKey: key() }))).data;
      for (const name of ['draftIntent', 'intent']) { state.canaries[name] = `SYNTH_E2_${name}_${input.nonce}`; state.sources[name] = (await call('intentDrafts', () => intents.execute('DRAFT', doctor, { consultationId: state.consultation.id, operationKey: key(), instruction: state.canaries[name], desiredWindow: null }))).data; }
      const closed = await call('fixtureClose', () => consultations.closeConsultation(doctor, { consultationId: state.consultation.id, expectedVersion: 1, operationKey: key() }));
      state.consultation = { ...state.consultation, ...closed }; result = state;
    } else if (action === 'snapshot') {
      const names = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
      const hashes = {}, rows = {};
      for (const name of names) { assert.match(name, /^[a-z_][a-z0-9_]*$/); const value = (await pool.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) value FROM public."${name}" t`)).rows[0].value; rows[name] = value.length; hashes[name] = createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
      result = { hashes, rows, audits: Object.fromEntries((await pool.query('SELECT action_type,count(*)::int n FROM audit_logs GROUP BY action_type')).rows.map(r => [r.action_type, r.n])), unsafeAudit: (await pool.query("SELECT count(*)::int n FROM audit_logs WHERE safe_metadata<>'{}'::jsonb")).rows[0].n };
    } else {
      assert.equal(Object.keys(f.users).length, 5);
      if (action === 'release') { const a = await actor('doctorA'); f.sources.summary = (await call('summaryReleases', () => documents.execute('RELEASE', a, { consultationId: f.consultation.id, documentId: f.sources.summary.id, expectedVersion: 1, operationKey: key() }))).data; f.sources.intent = (await call('intentReleases', () => intents.execute('RELEASE', a, { consultationId: f.consultation.id, intentId: f.sources.intent.id, expectedVersion: 1, operationKey: key() }))).data; }
      else if (action === 'grantOther') f.grants.doctorB = await grant(f, 'doctorB', await actor('patientA'), await actor('doctorB'));
      else if (['restrictSummary', 'restrictIntent'].includes(action)) { const summary = action === 'restrictSummary', source = f.sources[summary ? 'summary' : 'intent'], a = await actor('doctorA'); await call(summary ? 'summaryRestrictions' : 'intentRestrictions', () => (summary ? documents : intents).execute('PRIVACY', a, { consultationId: f.consultation.id, [summary ? 'documentId' : 'intentId']: source.id, versionIds: [source.versions.at(-1).id], reason: 'Synthetic fixture restriction', operationKey: key() })); }
      else if (['suspend', 'restore'].includes(action)) f.organization = (await call('organizationTransitions', async () => orgs.setOrganizationStatus(await actor('admin'), { organizationId: f.organization.id, expectedVersion: f.organization.statusVersion, status: action === 'suspend' ? 'SUSPENDED' : 'ACTIVE' }))).organization;
      else if (action === 'endMembership') await call('membershipEnds', async () => orgs.endMembership(await actor('admin'), { organizationId: f.organization.id, membershipId: f.memberships.doctorA.id }));
      else if (['endOther', 'endAuthor'].includes(action)) await call('assignmentEnds', async () => relationships.end(await actor('patientA'), { assignmentId: f.grants[action === 'endOther' ? 'doctorB' : 'doctorA'] }));
      else if (['disable', 'enable'].includes(action)) await call('userTransitions', async () => { const r = await pool.query('UPDATE users SET status=$1 WHERE id=$2 AND email=$3', [action === 'disable' ? 'DISABLED' : 'ACTIVE', f.users.patientB.id, f.users.patientB.email]); assert.equal(r.rowCount, 1); });
      else if (['expire', 'revoke'].includes(action)) { assert.match(input.tokenHash, /^[a-f0-9]{64}$/); if (action === 'expire') await call('sessionExpiry', async () => { const r = await pool.query("UPDATE sessions SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' WHERE token_hash=$1 AND user_id=$2 AND revoked_at IS NULL", [input.tokenHash, f.users.patientB.id]); assert.equal(r.rowCount, 1); }); else await call('sessionRevocation', async () => { assert.equal((await auth.resolve(input.tokenHash))?.userId, f.users.patientB.id); assert.equal(await auth.revoke(input.tokenHash), true); }); }
      else throw new Error('UNKNOWN_ACTION');
      result = f;
    }
    output = { ok: true, result, counts };
  } catch { output = { ok: false, phase, counts }; }
  finally { let closed = true; for (const s of stores.reverse()) { try { await s.close(); } catch { closed = false; } } if (pool) { try { await pool.end(); } catch { closed = false; } } if (!closed) output = { ok: false, phase: 'cleanup', counts }; }
  process.stdout.write(JSON.stringify(output)); if (!output.ok) process.exitCode = 1;
}
