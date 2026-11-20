import { stagingSeedConfiguration } from './lib/staging-seed.mjs';
import { proveStagingInitialization } from './lib/staging-seed-proof.mjs';
let config;
try {
  config = stagingSeedConfiguration(process.env);
  await proveStagingInitialization(config);
  console.log('PASS staging initializer twice: no duplicate identities/setup; all authority, clinical and migration rows unchanged; temporary admin sessions revoked.');
} catch (error) {
  const code = /^(STAGING_(CONFIG_INVALID|SETUP_STEP_[0-6]_FAILED)|DEMO_(STATE_CONFLICT|MIGRATIONS_INVALID))$/.test(error?.message) ? error.message : 'STAGING_INITIALIZER_PROOF_FAILED';
  console.error(code); process.exitCode = 1;
}
finally { config?.password.fill(0); }
