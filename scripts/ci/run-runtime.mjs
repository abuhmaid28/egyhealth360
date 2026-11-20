import { spawnSync } from 'node:child_process';
import { validatePlan } from './policy.mjs';
const plan = validatePlan(JSON.parse(process.env.CI_PLAN));
if (!plan.lanes['docker-runtime'] || plan.runtime.length === 0) throw new Error('Runtime lane has no selected verifiers');
for (const runtime of plan.runtime) {
  const file = `scripts/verify-${runtime}-runtime.mjs`;
  console.log(`::group::${file}`);
  const started = Date.now();
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'api', 'node', file], { stdio: 'inherit' });
  console.log(`${file}: ${((Date.now() - started) / 1000).toFixed(1)}s\n::endgroup::`);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
