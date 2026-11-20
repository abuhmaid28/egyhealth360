import { MODULES, validatePlan } from './policy.mjs';
export function selectTests(plan, kind, filenames) {
  validatePlan(plan);
  if (!['unit', 'integration'].includes(kind)) throw new Error('Expected unit or integration');
  const directory = kind === 'unit' ? 'tests' : 'tests/integration';
  const prefixes = ['auth', 'authorization', 'identity', 'error-sanitization', ...plan.modules.flatMap(m => MODULES[m].tests)];
  const files = filenames.filter(f => f.endsWith('.test.mjs') &&
    (plan.full ? kind !== 'unit' || !f.startsWith('ui') : prefixes.some(p => f === `${p}.test.mjs` || f.startsWith(`${p}-`)))).sort().map(f => `${directory}/${f}`);
  if (files.length === 0) throw new Error('Selected test suite is empty');
  return files;
}
