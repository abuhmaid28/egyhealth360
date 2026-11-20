import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { classifyPaths } from './policy.mjs';
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
let paths = [], reason = '', full = false;
const name = process.env.GITHUB_EVENT_NAME;
try {
  let base, head;
  if (name === 'pull_request') {
    base = event.pull_request.base.sha;
    head = event.pull_request.head.sha;
    const labels = event.pull_request.labels.map(l => l.name);
    full = labels.some(l => ['ci:full', 'milestone-exit'].includes(l));
    if (full) reason = 'PR full-regression/milestone label';
    base = execFileSync('git', ['merge-base', base, head], { encoding: 'utf8' }).trim();
  } else if (name === 'push') { base = event.before; head = event.after; }
  else { full = true; reason = 'Manual full regression'; }
  if (!full) {
    if (![base, head].every(s => /^[0-9a-f]{40}$/.test(s) && !/^0+$/.test(s))) throw new Error('Unavailable diff SHA');
    paths = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
  }
} catch (error) { full = true; reason = `Diff unavailable: ${error.message.split('\n')[0]}`; }
const plan = classifyPaths(paths, { full, reason });
const json = JSON.stringify(plan);
writeFileSync(process.env.CI_PLAN_PATH, json + '\n');
appendFileSync(process.env.GITHUB_OUTPUT, `plan=${json}\n` + Object.entries(plan.lanes).map(([k, v]) => `${k}=${v}\n`).join(''));
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## CI classification\n\nClasses: ${plan.classes.join(', ')}\n\nFull regression: ${plan.full}\n\nModules: ${plan.modules.join(', ') || 'none'}\n\nRuntime: ${plan.runtime.join(', ') || 'none'}\n\n| Lane | Required |\n| --- | --- |\n${Object.entries(plan.lanes).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\nReasons: ${plan.reasons.join('; ') || 'Known bounded paths'}\n`);
console.log(json);
