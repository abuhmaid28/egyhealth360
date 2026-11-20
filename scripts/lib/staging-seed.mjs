import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { createDemoPersistence, createAuthPersistence, createOrganizationPersistence, createDirectoryPersistence, createAvailabilityPersistence } from '../../packages/db/dist/index.js';
import { seedDemo, passwordCheck } from './m1-demo.mjs';

/** Pins this continuation to the existing disposable API and Neon database. */
export function stagingTargetConfiguration(env) {
  try {
    if (env.NODE_ENV !== 'production' || env.VERCEL_ENV !== 'preview'
      || env.VERCEL_PROJECT_ID !== 'prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF'
      || env.EH_STAGING_NEON_PROJECT_ID !== 'spring-star-16308392'
      || env.AUTH_BROWSER_ORIGIN !== 'https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app') throw new Error();
    const url = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || url.hostname !== 'ep-sweet-frog-ar3p5xkm-pooler.c-4.us-west-2.aws.neon.tech'
      || (url.port && url.port !== '5432') || url.pathname !== '/egyhealth360_staging'
      || !url.username || !url.password || url.hash) throw new Error();
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length
      || keys.some(key => !['sslmode', 'channel_binding'].includes(key))
      || !['require', 'verify-full'].includes(url.searchParams.get('sslmode'))
      || (url.searchParams.has('channel_binding') && url.searchParams.get('channel_binding') !== 'require')) throw new Error();
    return { databaseUrl: env.DATABASE_URL };
  } catch { throw new Error('STAGING_CONFIG_INVALID'); }
}

export function stagingSeedConfiguration(env) {
  const target = stagingTargetConfiguration(env);
  if (env.EH_STAGING_SEED_ENABLED !== '1') throw new Error('STAGING_CONFIG_INVALID');
  const password = Buffer.from(env.EH_DEMO_PASSWORD ?? '', 'utf8');
  if (password.length < 16 || password.length > 1024 || /^\s*$/u.test(password.toString())) {
    password.fill(0); throw new Error('STAGING_CONFIG_INVALID');
  }
  return { ...target, password };
}

/** Existing approved identities only: never repair/create clinical authority. */
export async function initializeStaging(config) {
  const demo = createDemoPersistence(config.databaseUrl);
  try {
    const result = await seedDemo(demo, config.password, { requireExisting: true });
    await initializeDirectory(config, result.state);
    return { result: 'PASS', created: result.created };
  } finally { await demo.close(); }
}

async function initializeDirectory(config, state) {
  const auth = createAuthPersistence(config.databaseUrl);
  const organizations = createOrganizationPersistence(config.databaseUrl);
  const directory = createDirectoryPersistence(config.databaseUrl);
  const availability = createAvailabilityPersistence(config.databaseUrl);
  const tokenHash = randomBytes(32).toString('hex');
  const key = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  let step = 0;
  try {
    const admin = state.identities.find(i => i.key === 'admin');
    const clinician = state.identities.find(i => i.key === 'clinician-assigned');
    const credentials = await auth.credentials(admin.email);
    if (!credentials || credentials.status !== 'ACTIVE' || !await passwordCheck(config.password)(credentials.passwordHash)) throw new Error('STAGING_STATE_INVALID');
    const actor = await auth.createSession({ userId: credentials.id, verifiedHash: credentials.passwordHash, tokenHash, previousHash: null });
    if (!actor || actor.role !== 'ADMIN') throw new Error('STAGING_STATE_INVALID');
    step = 1;
    const { organization } = await organizations.createOrganization(actor, { kind: 'CLINIC', name: 'Synthetic Staging Clinic', operationKey: key(1) });
    step = 2;
    const { membership } = await organizations.grantMembership(actor, { organizationId: organization.id, userId: clinician.userId, operationKey: key(2) });
    step = 3;
    const { specialty } = await directory.createSpecialty(actor, { key: 'synthetic-staging-general', displayName: 'Synthetic Staging General', operationKey: key(3) });
    await directory.setSpecialty(actor, { specialtyId: specialty.id, displayName: specialty.displayName, isPublished: true, expectedVersion: specialty.version });
    step = 4;
    const { clinic } = await directory.createClinic(actor, { organizationId: organization.id, displayName: 'Synthetic Staging Clinic', city: 'Synthetic City', address: 'Synthetic staging address', operationKey: key(4) });
    await directory.setClinic(actor, { clinicId: clinic.id, displayName: clinic.displayName, city: clinic.city, address: clinic.address, isPublished: true, expectedVersion: clinic.version });
    step = 5;
    const { provider } = await directory.createProvider(actor, { clinicianId: clinician.profileId, specialtyId: specialty.id, displayName: 'Synthetic Staging Doctor', operationKey: key(5) });
    await directory.publishAffiliation(actor, { providerId: provider.id, membershipId: membership.id, operationKey: key(6) });
    await directory.setProvider(actor, { providerId: provider.id, specialtyId: provider.specialtyId, displayName: provider.displayName, isPublished: true, expectedVersion: provider.version });
    step = 6;
    const history = await availability.configurationHistory(actor, organization.id);
    const current = history.at(-1);
    if (current) {
      if (current.time_zone !== 'UTC' || current.duration_minutes !== 5 || current.minimum_booking_lead !== 0 || current.publication_horizon_days !== 30) throw new Error('STAGING_STATE_INVALID');
    } else {
      await availability.setConfiguration(actor, { organizationId: organization.id, expectedVersion: 0, timeZone: 'UTC', durationMinutes: 5, minimumBookingLead: 0, publicationHorizonDays: 30 });
    }
  } catch { throw new Error(`STAGING_SETUP_STEP_${step}_FAILED`); }
  finally {
    try { await auth.revoke(tokenHash); }
    finally { await Promise.allSettled([availability.close(), directory.close(), organizations.close(), auth.close()]); }
  }
}

export async function stagingSeedCommand(env) {
  if (env.EH_STAGING_SEED_ENABLED === '0') return { result: 'SKIPPED' };
  const config = stagingSeedConfiguration(env);
  try { return await initializeStaging(config); }
  finally { config.password.fill(0); }
}
