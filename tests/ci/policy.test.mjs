import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { selectTests } from '../../scripts/ci/test-selection.mjs';
import { classifyPaths, LANES, MODULES, RUNTIMES, validatePlan, verifyGate } from '../../scripts/ci/policy.mjs';

const scenarios = [
  ['README/docs only', ['README.md', 'docs/PROJECT.md'], ['DOCS_GOVERNANCE'], ['docs-check']],
  ['UX Markdown only', ['docs/UX.md'], ['DOCS_GOVERNANCE'], ['docs-check']],
  ['component', ['apps/web/src/components/doctor.tsx'], ['FRONTEND_ONLY'], ['docs-check', 'frontend-check']],
  ['UI package', ['packages/ui/src/index.ts'], ['FRONTEND_ONLY'], ['docs-check', 'frontend-check']],
  ['booking API', ['apps/api/src/bookings.ts'], ['NORMAL_BACKEND'], ['docs-check', 'backend-check', 'postgres', 'docker-runtime']],
  ['prescription persistence', ['packages/db/src/prescriptions.ts'], ['DATABASE_HIGH_RISK'], LANES],
  ['migration', ['packages/db/prisma/migrations/next/migration.sql'], ['DATABASE_HIGH_RISK'], LANES],
  ['auth', ['apps/api/src/auth.ts'], ['SECURITY_HIGH_RISK'], LANES],
  ['CI workflow', ['.github/workflows/ci.yml'], ['INFRASTRUCTURE'], LANES],
  ['frontend + migration union', ['apps/web/app/layout.tsx', 'packages/db/prisma/migrations/next/migration.sql'], ['DATABASE_HIGH_RISK', 'FRONTEND_ONLY'], LANES],
  ['docs + security union', ['README.md', 'apps/api/src/authorization.ts'], ['DOCS_GOVERNANCE', 'SECURITY_HIGH_RISK'], LANES],
  ['unknown critical path', ['apps/new-service/src/index.ts'], ['INFRASTRUCTURE'], LANES],
];
for (const [name, paths, classes, lanes] of scenarios) test(name, () => {
  const plan = validatePlan(classifyPaths(paths));
  assert.deepEqual(plan.classes, classes);
  assert.deepEqual(LANES.filter(l => plan.lanes[l]), lanes);
  console.log(`SCENARIO ${name}: ${JSON.stringify(plan)}`);
});
test('bounded booking runtime includes authority and affected dependencies, omits unrelated historical chains', () => {
  const p = classifyPaths(['apps/api/src/bookings.ts']);
  assert.equal(p.full, false);
  assert.deepEqual(p.runtime, ['auth', 'authorization', 'availability', 'booking', 'consultation-opening']);
  assert.deepEqual(p.modules, ['bookings']);
});
test('explicit module mapping is complete and points to real suites and verifiers', () => {
  for (const [module, dependencies] of Object.entries(MODULES)) {
    assert.ok(existsSync(`apps/api/src/${module}.ts`));
    for (const prefix of dependencies.tests) {
      const files = execFileSync('git', ['ls-files', 'tests', 'tests/integration'], { encoding: 'utf8' });
      // Singular relationship-* prefixes cover integration-only integrity/races.
      assert.ok(files.includes(`tests/integration/${prefix}.test.mjs`) || files.includes(`tests/integration/${prefix}-`), prefix);
    }
    assert.ok(dependencies.runtime.every(r => RUNTIMES.includes(r)));
  }
});
test('full preserves every historical runtime, in historical execution order', () => {
  const baseline = execFileSync('git', ['show', '2fb940c2759056d63d3a22b640d67a587abccf07:.github/workflows/ci.yml'], { encoding: 'utf8' });
  assert.deepEqual(RUNTIMES, [...baseline.matchAll(/node scripts\/verify-(.+)-runtime\.mjs/g)].map(m => m[1]));
  for (const r of RUNTIMES) assert.ok(existsSync(`scripts/verify-${r}-runtime.mjs`));
  for (const paths of [[], ['unknown.ts'], ['packages/db/src/persistence.ts']]) {
    const p = validatePlan(classifyPaths(paths));
    assert.ok(p.full); assert.deepEqual(p.runtime, RUNTIMES);
  }
});
test('manual full and multi-module unions never downgrade', () => {
  assert.ok(classifyPaths(['README.md'], { full: true }).full);
  const p = classifyPaths(['apps/api/src/bookings.ts', 'apps/api/src/directory.ts']);
  assert.deepEqual(p.modules, ['bookings', 'directory']);
  assert.ok(p.runtime.includes('organization') && p.runtime.includes('booking'));
});
test('sensitive paths, contract docs, shared packages, tooling and unknown API files fail safe', () => {
  for (const path of ['apps/web/src/components/live-session.tsx', 'apps/web/src/lib/api/authority.ts', 'apps/api/src/password.ts', 'apps/api/src/app.ts', 'apps/api/src/main.ts', 'apps/api/src/brand-new.ts', 'packages/db/src/pharmacy.ts', 'packages/db/src/audit.ts', 'packages/db/prisma.config.ts', 'packages/clinical-rules/src/index.ts', 'packages/config/src/index.ts', 'docs/openapi.json', 'docs/SECURITY.md', 'docs/V3_I3_CONTRACT.md', 'docs/PRODUCT_V3_DECISIONS.md', 'package.json', 'apps/web/package.json', 'pnpm-lock.yaml', 'eslint.config.mjs', 'Dockerfile', 'compose.yaml', 'scripts/support/new-helper.mjs', 'tests/integration/new.test.mjs']) assert.ok(validatePlan(classifyPaths([path])).full, path);
});
test('all tracked non-document source paths select real validation; unknown paths cannot get docs-only', () => {
  for (const path of execFileSync('git', ['ls-files', 'apps', 'packages', 'scripts', 'tests'], { encoding: 'utf8' }).trim().split('\n')) {
    const p = validatePlan(classifyPaths([path]));
    if (!path.endsWith('.md')) assert.ok(p.full || p.lanes['frontend-check'] || p.lanes['backend-check'], path);
  }
});
const resultsFor = plan => Object.fromEntries([['classify', { result: 'success' }], ...LANES.map(l => [l, { result: plan.lanes[l] ? 'success' : 'skipped' }])]);
test('gate accepts only successful selected lanes and explicit intentional skips', () => {
  for (const [, paths] of scenarios) {
    const p = classifyPaths(paths), results = resultsFor(p);
    assert.doesNotThrow(() => verifyGate(p, results));
    for (const lane of ['classify', ...LANES]) {
      for (const result of ['failure', 'cancelled', 'skipped', 'success', undefined]) {
        if (results[lane].result === result) continue;
        const copy = JSON.parse(JSON.stringify(results)); copy[lane].result = result;
        assert.throws(() => verifyGate(p, copy), undefined, `${lane}: ${result}`);
      }
      const missing = JSON.parse(JSON.stringify(results)); delete missing[lane];
      assert.throws(() => verifyGate(p, missing));
    }
    assert.throws(() => verifyGate(p, { ...results, surprise: { result: 'success' } }));
  }
});
test('empty/malformed plans, lost outputs and internally inconsistent routing fail closed', () => {
  for (const p of [null, {}, { version: 1 }, { ...classifyPaths(['README.md']), lanes: {} }]) assert.throws(() => validatePlan(p));
  for (const mutate of [p => { p.lanes.postgres = false; }, p => { p.full = false; }, p => { p.runtime = []; }, p => { p.lanes['dependency-audit'] = false; }]) {
    const p = classifyPaths(['apps/api/src/auth.ts']); mutate(p); assert.throws(() => validatePlan(p));
  }
});
test('unsafe repository paths rejected', () => {
  for (const p of ['/tmp/x', '../x', 'apps/../x', './README.md', '']) assert.throws(() => classifyPaths([p]));
});
test('workflow wires every lane, full controls, pinned actions, safe concurrency and caches', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const ids = [...workflow.matchAll(/^ {2}([\w-]+):\n(?= {4}(?:needs:|runs-on:))/gm)].map(m => m[1]);
  assert.deepEqual(ids.sort(), ['classify', ...LANES, 'validate'].sort());
  for (const lane of LANES) assert.ok(workflow.includes(`if: needs.classify.outputs.${lane} == 'true'`));
  assert.match(workflow, /needs: \[classify, docs-check, frontend-check, backend-check, postgres, docker-runtime, dependency-audit\]\n {4}if: always\(\)/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /types: .*labeled, unlabeled/);
  assert.ok(workflow.includes('github.event.pull_request.number || github.run_id'));
  assert.match(workflow, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.doesNotMatch(workflow, /continue-on-error|paths-ignore|^ {4}paths:/m);
  assert.match(workflow, /pnpm test:migrations/); assert.match(workflow, /pnpm test:ui:real/);
  assert.match(workflow, /docker compose build api/); assert.match(workflow, /up -d --no-build/);
  for (const source of [workflow, readFileSync('.github/actions/setup-pnpm/action.yml', 'utf8'), readFileSync('.github/actions/setup-browser/action.yml', 'utf8')]) for (const match of source.matchAll(/uses: ([^\n]+)/g)) assert.ok(match[1].startsWith('./') || /@[a-f\d]{40}$/.test(match[1]), match[1]);
  const cache = readFileSync('.github/actions/setup-pnpm/action.yml', 'utf8');
  assert.match(cache, /cache: pnpm/); assert.match(cache, /cache-dependency-path: pnpm-lock.yaml/);
  assert.doesNotMatch(cache, /path: .*node_modules/);
});

test('full selection plus frontend units exactly preserves the historical top-level suite', () => {
  const files = readdirSync('tests').filter(f => f.endsWith('.test.mjs'));
  const selected = selectTests(classifyPaths([], { full: true }), 'unit', files);
  const ui = files.filter(f => f.startsWith('ui')).map(f => `tests/${f}`);
  assert.deepEqual([...selected, ...ui].sort(), files.map(f => `tests/${f}`).sort());
  const integration = readdirSync('tests/integration').filter(f => f.endsWith('.test.mjs'));
  assert.deepEqual(selectTests(classifyPaths([], { full: true }), 'integration', integration), integration.sort().map(f => `tests/integration/${f}`));
});
test('booking selection includes actual race, integrity and authority suites without unrelated pharmacy', () => {
  const plan = classifyPaths(['apps/api/src/bookings.ts']);
  const selected = selectTests(plan, 'integration', readdirSync('tests/integration'));
  for (const file of ['bookings.test.mjs', 'bookings-concurrency.test.mjs', 'bookings-integrity.test.mjs', 'availability-lock-contract.test.mjs', 'consultations-concurrency.test.mjs', 'auth.test.mjs', 'authorization.test.mjs']) assert.ok(selected.includes(`tests/integration/${file}`), file);
  assert.ok(!selected.some(f => f.includes('pharmacy') || f.includes('prescriptions')));
  assert.throws(() => selectTests(plan, 'integration', []));
});

test('every indexed accepted contract and new sensitive Markdown path selects deep validation', () => {
  const section = readFileSync('docs/SOURCE_OF_TRUTH.md', 'utf8').split('## ACCEPTED CONTRACT\n')[1].split('\n## ')[0];
  for (const match of section.matchAll(/\]\(([^)#]+\.md)\)/g)) assert.ok(classifyPaths([`docs/${match[1]}`]).full, match[1]);
  for (const path of ['docs/security/new-policy.md', 'docs/authority-boundaries.md', 'docs/research/CLINICAL_RULE_CATALOG_V1.md']) assert.ok(classifyPaths([path]).full, path);
});

test('ordinary frontend filenames containing clock or block do not imply lockfile changes', () => {
  for (const path of ['apps/web/src/components/clock.tsx', 'apps/web/src/components/block.tsx']) assert.deepEqual(classifyPaths([path]).classes, ['FRONTEND_ONLY']);
  for (const path of ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb']) assert.ok(classifyPaths([path]).full);
});
