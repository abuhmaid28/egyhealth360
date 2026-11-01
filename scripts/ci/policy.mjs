// Paths are a safety contract: new runtime/module paths fail closed to full CI.
export const LANES = ['docs-check', 'frontend-check', 'backend-check', 'postgres', 'docker-runtime', 'dependency-audit'];
export const RUNTIMES = [
  'auth', 'authorization', 'm1', 'clinical', 'care-action', 'organization',
  'patient-entry', 'directory', 'relationship', 'v3-i1-exit', 'availability',
  'booking', 'consultation-opening', 'consultation-documentation',
  'follow-up-intent', 'v3-i2-exit', 'prescription', 'pharmacy',
];
// Keys match apps/api/src/<key>.ts. Dependencies are deliberately explicit.
export const MODULES = {
  bookings: { tests: ['bookings', 'availability', 'consultations'], runtime: ['availability', 'booking', 'consultation-opening'] },
  availability: { tests: ['availability', 'bookings'], runtime: ['availability', 'booking'] },
  directory: { tests: ['directory', 'organizations'], runtime: ['organization', 'directory'] },
  'patient-entry': { tests: ['patient-entry', 'relationships'], runtime: ['patient-entry', 'relationship'] },
  relationships: { tests: ['relationships', 'relationship'], runtime: ['relationship', 'v3-i1-exit'] },
  'blood-pressure': { tests: ['blood-pressure', 'bp-amendments', 'followup'], runtime: ['clinical', 'care-action'] },
  followup: { tests: ['followup', 'blood-pressure'], runtime: ['clinical', 'care-action'] },
  documentation: { tests: ['documentation', 'consultation-context', 'consultations'], runtime: ['consultation-opening', 'consultation-documentation'] },
  'follow-up-intents': { tests: ['follow-up-intents', 'documentation', 'consultation-close'], runtime: ['consultation-documentation', 'follow-up-intent', 'v3-i2-exit'] },
  'consultation-close': { tests: ['consultation-close', 'consultations', 'documentation', 'follow-up-intents'], runtime: ['consultation-opening', 'consultation-documentation', 'follow-up-intent', 'v3-i2-exit'] },
};
const SECURITY = /(?:^|[/_.-])(auth(?:orization)?|session|password|csrf|origin|privacy|masking|authority|membership|assignment|security)(?:[/_.-]|$)/i;
const CONTRACT = /^docs\/(?:SECURITY\.md|PRODUCT(?:_V3_DECISIONS)?\.md|DECISIONS\.md|.*CONTRACT\.md|V3_I[123]_SLICE[0-9]+\.md|research\/CLINICAL_RULE_CATALOG_V1\.md|EH-00[5-9].*\.md|openapi\.json)$/;
const INFRA = /^(?:\.github\/|Dockerfile(?:\.|$)|compose.*\.ya?ml$|\.dockerignore$|\.npmrc$|.*(?:^|\/)package\.json$|pnpm-.*\.yaml$|.*lock.*$|.*tsconfig.*\.json$|eslint\.config\.|.*vercel\.json$|scripts\/ci\/|tests\/ci\/)/;
export function classifyPaths(paths, { full = false, reason = '' } = {}) {
  const classes = new Set();
  const modules = new Set();
  const reasons = [];
  let all = full;
  const elevate = (group, why) => { classes.add(group); all = true; reasons.push(why); };
  if (full) { classes.add('MANUAL_FULL'); reasons.push(reason || 'Explicit full regression'); }
  if (!full && (!Array.isArray(paths) || paths.length === 0)) elevate('INFRASTRUCTURE', 'Empty/unavailable change set: conservative full regression');
  for (const path of paths ?? []) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) throw new Error('Invalid repository path');
    if (CONTRACT.test(path)) elevate('SECURITY_HIGH_RISK', `Accepted behavior/security contract: ${path}`);
    else if (/^packages\/db\//.test(path) || /(?:^|\/)migrations?\//.test(path) || /(?:persistence|transaction|locking)/i.test(path)) elevate('DATABASE_HIGH_RISK', `Persistence/schema/transaction boundary: ${path}`);
    else if (INFRA.test(path)) elevate('INFRASTRUCTURE', `CI/build/tooling boundary: ${path}`);
    else if (/^docs\/ui-screenshots\//.test(path)) classes.add('DOCS_GOVERNANCE');
    else if (SECURITY.test(path)) elevate('SECURITY_HIGH_RISK', `Security/authority boundary: ${path}`);
    else if (path.endsWith('.md') || path === 'FIRST_AGENT_PROMPT.txt') classes.add('DOCS_GOVERNANCE');
    else if (/^(?:apps\/web\/|packages\/ui\/|tests\/ui[^/]*\.test\.mjs$|scripts\/test-ui-browser\.mjs$|scripts\/support\/ui-.*-browser\.mjs$)/.test(path)) classes.add('FRONTEND_ONLY');
    else if (/^apps\/api\/src\/(?:prescriptions|pharmacy)\.ts$/.test(path) || /^packages\/clinical-rules\//.test(path)) elevate('DATABASE_HIGH_RISK', `Clinical/prescription/fulfillment boundary: ${path}`);
    else {
      const key = /^apps\/api\/src\/([^/]+)\.ts$/.exec(path)?.[1];
      if (Object.hasOwn(MODULES, key ?? '')) { classes.add('NORMAL_BACKEND'); modules.add(key); }
      else elevate('INFRASTRUCTURE', `Unmapped path: ${path}`);
    }
  }
  const backend = all || modules.size > 0;
  const runtime = all ? [...RUNTIMES] : RUNTIMES.filter(r => ['auth', 'authorization', ...[...modules].flatMap(m => MODULES[m].runtime)].includes(r));
  const lanes = Object.fromEntries(LANES.map(l => [l, l === 'docs-check' || (l === 'frontend-check' ? all || classes.has('FRONTEND_ONLY') : l === 'dependency-audit' ? all : backend)]));
  return { version: 1, classes: [...classes].sort(), full: all, modules: [...modules].sort(), runtime: backend ? runtime : [], lanes, reasons };
}
export function validatePlan(plan) {
  if (!plan || plan.version !== 1 || typeof plan.full !== 'boolean' || !Array.isArray(plan.classes) || plan.classes.length === 0 || !Array.isArray(plan.modules) || !Array.isArray(plan.runtime) || !plan.lanes) throw new Error('Missing/invalid classification plan');
  if (Object.keys(plan.lanes).sort().join() !== [...LANES].sort().join() || LANES.some(l => typeof plan.lanes[l] !== 'boolean') || !plan.lanes['docs-check']) throw new Error('Invalid lane contract');
  if (plan.modules.some(m => !Object.hasOwn(MODULES, m)) || plan.runtime.some(r => !RUNTIMES.includes(r))) throw new Error('Unknown module/runtime');
  if (plan.full && (LANES.some(l => !plan.lanes[l]) || plan.runtime.join() !== RUNTIMES.join())) throw new Error('Incomplete full regression plan');
  const allowedClasses = ['DOCS_GOVERNANCE', 'FRONTEND_ONLY', 'NORMAL_BACKEND', 'DATABASE_HIGH_RISK', 'SECURITY_HIGH_RISK', 'INFRASTRUCTURE', 'MANUAL_FULL'];
  if (plan.classes.some(c => !allowedClasses.includes(c))) throw new Error('Unknown risk class');
  if (!plan.full && plan.classes.some(c => ['DATABASE_HIGH_RISK', 'SECURITY_HIGH_RISK', 'INFRASTRUCTURE', 'MANUAL_FULL'].includes(c))) throw new Error('High risk requires full regression');
  const backend = plan.full || plan.modules.length > 0;
  for (const lane of ['backend-check', 'postgres', 'docker-runtime']) if (plan.lanes[lane] !== backend) throw new Error('Incomplete backend plan');
  if (plan.lanes['frontend-check'] !== (plan.full || plan.classes.includes('FRONTEND_ONLY')) || plan.lanes['dependency-audit'] !== plan.full) throw new Error('Incomplete frontend/audit plan');
  const expectedRuntime = backend ? (plan.full ? RUNTIMES : RUNTIMES.filter(r => ['auth', 'authorization', ...plan.modules.flatMap(m => MODULES[m].runtime)].includes(r))) : [];
  if (plan.runtime.join() !== expectedRuntime.join()) throw new Error('Incomplete runtime plan');
  return plan;
}
export function verifyGate(plan, needs) {
  validatePlan(plan);
  if (Object.keys(needs).sort().join() !== ['classify', ...LANES].sort().join()) throw new Error('Missing/unexpected lane result');
  if (needs.classify.result !== 'success') throw new Error('Classification did not succeed');
  for (const lane of LANES) {
    const expected = plan.lanes[lane] ? 'success' : 'skipped';
    if (needs[lane]?.result !== expected) throw new Error(`${lane}: expected ${expected}, got ${needs[lane]?.result}`);
  }
}
