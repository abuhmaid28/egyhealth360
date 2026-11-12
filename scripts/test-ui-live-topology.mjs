/** Issue124 opt-in E2: NEW reconstruction, never the lost reviewed candidate.
 * Application under test is archived from PR123, not the harness branch.
 * No import-time effects; no inherited target, credentials or replay mode.
 * Checkpoints are WIP until measured E2 and exact-head CI earn acceptance.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPLICATION = '94f3b75476a43ac0118665aecf75a2ce471190b0';
export const ALLOWLIST = Object.freeze([
  'scripts/support/f06-live-fixtures.mjs',
  'scripts/test-ui-live-topology.mjs',
  'tests/ui-live-topology.test.mjs',
]);
export function options(args) {
  const values = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert.ok(['--evidence-dir', '--chromium'].includes(key), 'Unknown E2 option');
    assert.ok(!Object.hasOwn(values, key), 'Duplicate E2 option');
    const value = args[++i]; assert.ok(typeof value === 'string' && value.startsWith('/'));
    values[key] = resolve(value);
  }
  assert.ok(values['--evidence-dir']);
  return { evidence: values['--evidence-dir'], chromium: values['--chromium'] };
}
export function cookieAttributes(header) {
  const [cookie, ...parts] = header.split(';');
  const fields = Object.fromEntries(parts.map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key.toLowerCase(), value.length ? value.join('=') : true];
  }));
  return { name: cookie.split('=')[0], httpOnly: fields.httponly === true,
    secure: fields.secure === true, sameSite: fields.samesite, path: fields.path,
    domainPresent: Object.hasOwn(fields, 'domain'), maxAge: Number(fields['max-age']) };
}
export function leaks(text, markers) {
  return [...new Set(markers)].filter(value => typeof value === 'string' && value.length && text.includes(value)).length;
}
async function main() {
  options(process.argv.slice(2));
  // Crash-safe first checkpoint: deliberately no infrastructure or data work.
  throw new Error('E2_WIP_NOT_EXECUTABLE');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('E2_WIP_NOT_EXECUTABLE'); process.exitCode = 1; });
}
