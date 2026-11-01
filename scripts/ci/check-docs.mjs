// Dependency-free repository sanity and local reference checks. No network/DB/build.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const root = process.cwd();
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const index = readFileSync('docs/SOURCE_OF_TRUTH.md', 'utf8');
for (const path of ['AGENTS.md', 'README.md', 'docs/CURRENT_STATUS.md', 'docs/FOUNDATION_CHARTER.md', 'docs/TESTING.md', '.github/workflows/ci.yml', 'pnpm-lock.yaml']) assert.ok(tracked.includes(path), `Missing entrypoint: ${path}`);
for (const path of tracked.filter(p => p.startsWith('docs/') && p.endsWith('.md'))) assert.ok(index.includes(path.slice(5)), `Unclassified document: ${path}`);
// Current references are maintained; historical reports retain their original links.
const current = new Set(['AGENTS.md', 'README.md', 'docs/SOURCE_OF_TRUTH.md']);
const section = index.split('## CURRENT AUTHORITATIVE\n')[1]?.split('\n## ')[0] ?? '';
for (const match of section.matchAll(/\]\(([^)#]+\.md)\)/g)) current.add(`docs/${match[1]}`);
// Also check changed Markdown, including future docs/design-only additions.
if (process.env.GITHUB_EVENT_PATH) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  let base = event.before, head = event.after;
  if (event.pull_request) {
    head = event.pull_request.head.sha;
    base = execFileSync('git', ['merge-base', event.pull_request.base.sha, head], { encoding: 'utf8' }).trim();
  }
  if (base && head && !/^0+$/.test(base)) for (const p of execFileSync('git', ['diff', '--name-only', '--no-renames', base, head], { encoding: 'utf8' }).trim().split('\n')) if (p.endsWith('.md') && existsSync(p)) current.add(p);
}
const anchorCache = new Map();
function anchors(path) {
  if (!anchorCache.has(path)) {
    const counts = new Map(), result = new Set();
    const source = readFileSync(path, 'utf8').replace(/```[^]*?```|~~~[^]*?~~~/g, '');
    for (const match of source.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
      const slug = match[1].toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
      const n = counts.get(slug) ?? 0; counts.set(slug, n + 1);
      result.add(n ? `${slug}-${n}` : slug);
    }
    for (const match of source.matchAll(/(?:id|name)=["']([^"']+)["']/g)) result.add(match[1]);
    anchorCache.set(path, result);
  }
  return anchorCache.get(path);
}
let links = 0;
for (const file of current) {
  const source = readFileSync(file, 'utf8').replace(/```[^]*?```|~~~[^]*?~~~/g, '');
  for (const match of source.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(link) || link.startsWith('//')) continue;
    const [target, fragment] = link.split('#');
    const path = target ? resolve(dirname(file), decodeURIComponent(target)) : resolve(file);
    assert.ok(path.startsWith(root + '/'), `${file}: reference outside repository: ${link}`);
    assert.ok(existsSync(path), `${file}: missing reference ${link}`);
    if (fragment && path.endsWith('.md')) assert.ok(anchors(path).has(decodeURIComponent(fragment)), `${file}: missing anchor ${link}`);
    links++;
  }
}
console.log(`Repository sanity, document classification and ${links} local references in ${current.size} current/changed Markdown files: PASS`);
