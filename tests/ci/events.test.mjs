import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// Exercise the actual CLI against real commit ranges, not mocked file lists.
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'eh-ci-events-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init', '-q'); git('config', 'user.email', 'ci@example.invalid'); git('config', 'user.name', 'CI policy test');
    mkdirSync(join(dir, 'scripts/ci'), { recursive: true });
    for (const name of ['classify.mjs', 'policy.mjs']) copyFileSync(resolve('scripts/ci', name), join(dir, 'scripts/ci', name));
    const commit = (path, content = path) => {
      mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), content);
      git('add', '.'); git('commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD');
    };
    const classify = (event, name) => {
      const path = join(dir, 'event.json'), output = join(dir, 'output'), plan = join(dir, 'plan.json');
      writeFileSync(path, JSON.stringify(event));
      execFileSync(process.execPath, ['scripts/ci/classify.mjs'], { cwd: dir, env: { ...process.env, GITHUB_EVENT_PATH: path, GITHUB_EVENT_NAME: name, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: join(dir, 'summary'), CI_PLAN_PATH: plan } });
      return JSON.parse(readFileSync(plan, 'utf8'));
    };
    run({ dir, git, commit, classify });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('push uses the complete before/after range, including earlier high-risk commits', () => fixture(({ commit, classify }) => {
  const before = commit('README.md');
  commit('apps/api/src/auth.ts');
  const after = commit('docs/UX.md');
  const p = classify({ before, after }, 'push');
  assert.ok(p.full); assert.ok(p.classes.includes('SECURITY_HIGH_RISK'));
}));
test('PR uses merge-base and cannot hide deleted/renamed runtime paths behind Markdown', () => fixture(({ commit, git, dir, classify }) => {
  commit('README.md'); const base = commit('apps/api/src/auth.ts');
  git('mv', 'apps/api/src/auth.ts', 'auth-history.md'); git('commit', '-qm', 'rename');
  const head = git('rev-parse', 'HEAD');
  const p = classify({ pull_request: { base: { sha: base }, head: { sha: head }, labels: [] } }, 'pull_request');
  assert.ok(p.full); assert.ok(p.classes.includes('SECURITY_HIGH_RISK'));
  assert.ok(readFileSync(join(dir, 'summary'), 'utf8').includes('postgres | true'));
}));
test('docs-only PR and main push select zero heavy lanes through the real CLI', () => fixture(({ commit, classify }) => {
  const before = commit('README.md'), after = commit('docs/UX.md');
  for (const [event, name] of [[{ before, after }, 'push'], [{ pull_request: { base: { sha: before }, head: { sha: after }, labels: [] } }, 'pull_request']]) {
    const p = classify(event, name);
    assert.deepEqual(p.classes, ['DOCS_GOVERNANCE']); assert.equal(p.full, false);
    assert.deepEqual(Object.entries(p.lanes).filter(([, required]) => required).map(([lane]) => lane), ['docs-check']);
    assert.deepEqual(p.runtime, []);
  }
}));
test('unavailable ranges, initial push and manual/milestone controls select all historical gates', () => fixture(({ commit, classify }) => {
  const head = commit('README.md');
  for (const [event, name] of [
    [{ before: '0'.repeat(40), after: head }, 'push'],
    [{ before: 'f'.repeat(40), after: head }, 'push'],
    [{}, 'workflow_dispatch'],
    [{ pull_request: { base: { sha: head }, head: { sha: head }, labels: [{ name: 'milestone-exit' }] } }, 'pull_request'],
    [{ pull_request: { base: { sha: head }, head: { sha: head }, labels: [{ name: 'ci:full' }] } }, 'pull_request'],
  ]) {
    const p = classify(event, name); assert.ok(p.full); assert.ok(Object.values(p.lanes).every(Boolean));
  }
}));
