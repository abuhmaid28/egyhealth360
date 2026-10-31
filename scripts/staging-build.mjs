import { spawnSync } from 'node:child_process';

// Schema deployment stays separate; an explicit one-time opt-in proves the existing seed.
for (const args of [['generate'], ['--filter', '@egyhealth/api...', 'build']]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) process.exit(1);
}
if (process.env.EH_STAGING_SEED_ENABLED === '1') {
  const result = spawnSync(process.execPath, ['scripts/verify-staging-initializer.mjs'], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) process.exit(1);
}
