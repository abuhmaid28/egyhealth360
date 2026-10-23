import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Pool } from './database.mjs';
import { createOrganizationPersistence, createPersistence, createAuthPersistence } from '../../packages/db/dist/index.js';
import { hashPassword } from '../../apps/api/dist/password.js';

export async function isolatedOrganizations(run) {
  const root = new Pool({ connectionString: process.env.DATABASE_URL });
  const name = `i1s2_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL); url.pathname = `/${name}`;
  let pool, store, identities, auth;
  try {
    await root.query(`CREATE DATABASE ${name}`);
    pool = new Pool({ connectionString: url.toString() });
    for (const migration of (await readdir('packages/db/prisma/migrations')).sort()) {
      if (migration === 'migration_lock.toml') continue;
      await pool.query(await readFile(`packages/db/prisma/migrations/${migration}/migration.sql`, 'utf8'));
    }
    store = createOrganizationPersistence(url.toString()); identities = createPersistence(url.toString()); auth = createAuthPersistence(url.toString());
    const password = randomBytes(32).toString('base64url'), hash = await hashPassword(Buffer.from(password));
    const users = {}, actors = {};
    for (const [key, role] of Object.entries({ admin: 'ADMIN', admin2: 'ADMIN', lab: 'LAB_STAFF', lab2: 'LAB_STAFF', pharmacy: 'PHARMACY_STAFF', clinician: 'CLINICIAN', patient: 'PATIENT' })) {
      users[key] = await identities.createUser({ email: `${randomUUID()}@example.invalid`, passwordHash: hash, role, ...(['PATIENT','CLINICIAN'].includes(role) ? { profile: { displayName: 'Synthetic Slice 2' } } : {}) });
      actors[key] = await auth.createSession({ userId: users[key].id, verifiedHash: hash, tokenHash: randomBytes(32).toString('hex'), previousHash: null });
    }
    const org = async (kind = 'LABORATORY', actor = actors.admin) => (await store.createOrganization(actor, { kind, name: 'Synthetic Slice 2 organization', operationKey: randomUUID() })).organization;
    const organization = await org();
    const grant = async (user = users.lab, target = organization, actor = actors.admin, operationKey = randomUUID()) => store.grantMembership(actor, { organizationId: target.id, userId: user.id, operationKey });
    const membership = (await grant()).membership;
    const scope = { organizationId: organization.id, membershipId: membership.id };
    await run({ root, pool, url: url.toString(), store, identities, auth, password, hash, users, actors, org, organization, grant, membership, scope });
  } finally {
    if (store) await store.close(); if (auth) await auth.close(); if (identities) await identities.close(); if (pool) await pool.end();
    await root.query(`DROP DATABASE IF EXISTS ${name}`); await root.end();
  }
}
export const audits = async pool => (await pool.query("SELECT action_type,entity_type,entity_id,actor_user_id,safe_metadata FROM audit_logs WHERE action_type LIKE 'ORGANIZATION_%' ORDER BY timestamp,id")).rows;
