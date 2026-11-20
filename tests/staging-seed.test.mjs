import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingTargetConfiguration, stagingSeedConfiguration, stagingSeedCommand } from '../scripts/lib/staging-seed.mjs';

const valid = {
  NODE_ENV: 'production', VERCEL_ENV: 'preview',
  VERCEL_PROJECT_ID: 'prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF',
  EH_STAGING_NEON_PROJECT_ID: 'spring-star-16308392',
  AUTH_BROWSER_ORIGIN: 'https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app',
  EH_STAGING_SEED_ENABLED: '1', EH_DEMO_PASSWORD: 'synthetic-test-password-only',
  DATABASE_URL: 'postgresql://user:synthetic@ep-sweet-frog-ar3p5xkm-pooler.c-4.us-west-2.aws.neon.tech/egyhealth360_staging?sslmode=verify-full',
};

test('staging initialization pins disposable project, preview, exact browser and TLS database', () => {
  assert.equal(stagingTargetConfiguration(valid).databaseUrl, valid.DATABASE_URL);
  const c = stagingSeedConfiguration(valid);
  assert.equal(c.password.toString(), valid.EH_DEMO_PASSWORD);
  c.password.fill(0);
  for (const key of Object.keys(valid)) {
    if (key === 'EH_DEMO_PASSWORD' || key === 'EH_STAGING_SEED_ENABLED') continue;
    assert.throws(() => stagingSeedConfiguration({ ...valid, [key]: undefined }), /STAGING_CONFIG_INVALID/);
  }
  for (const change of [
    { NODE_ENV: 'development' }, { VERCEL_ENV: 'production' },
    { VERCEL_PROJECT_ID: 'final-project' }, { EH_STAGING_NEON_PROJECT_ID: 'other-project' },
    { AUTH_BROWSER_ORIGIN: 'https://egyhealth360.vercel.app' },
    { AUTH_BROWSER_ORIGIN: valid.AUTH_BROWSER_ORIGIN + '/' },
    { EH_STAGING_SEED_ENABLED: undefined }, { EH_STAGING_SEED_ENABLED: 'true' },
    { EH_DEMO_PASSWORD: 'short' }, { EH_DEMO_PASSWORD: ' '.repeat(20) },
    { EH_DEMO_PASSWORD: 'x'.repeat(1025) },
  ]) assert.throws(() => stagingSeedConfiguration({ ...valid, ...change }), /STAGING_CONFIG_INVALID/);
});

test('database guards reject target substitution, TLS downgrade and libpq overrides', () => {
  for (const url of [
    valid.DATABASE_URL.replace('sslmode=verify-full', 'sslmode=disable'),
    valid.DATABASE_URL.replace('egyhealth360_staging?', 'production?'),
    valid.DATABASE_URL.replace('ep-sweet-frog-ar3p5xkm-pooler', 'ep-other'),
    valid.DATABASE_URL.replace('postgresql:', 'https:'),
    valid.DATABASE_URL + '&host=localhost', valid.DATABASE_URL + '&sslmode=disable',
    valid.DATABASE_URL + '&channel_binding=disable', valid.DATABASE_URL + '#secret',
    valid.DATABASE_URL.replace('/egyhealth360_staging', ':1234/egyhealth360_staging'),
  ]) assert.throws(() => stagingSeedConfiguration({ ...valid, DATABASE_URL: url }), /STAGING_CONFIG_INVALID/);
});

test('explicit off switch never requires credentials or touches persistence', async () => {
  assert.deepEqual(await stagingSeedCommand({ EH_STAGING_SEED_ENABLED: '0' }), { result: 'SKIPPED' });
});
