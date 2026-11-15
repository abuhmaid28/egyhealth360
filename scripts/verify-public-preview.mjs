#!/usr/bin/env node
/**
 * EgyHealth 360 — Public Preview Safety CLI
 * Verifies that a deployed preview meets strict public access, security, and routing invariants
 * without performing clinical mutations or credential operations.
 *
 * Usage:
 *   node scripts/verify-public-preview.mjs --url https://egyhealth360-preview.vercel.app
 *   node scripts/verify-public-preview.mjs --url https://egyhealth360-preview.vercel.app --api-url https://egyhealth360-api.vercel.app
 *   node scripts/verify-public-preview.mjs --url https://egyhealth360-preview.vercel.app --json
 */
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  runPreviewSafetyCheck,
  sanitizeUrlForReport,
  getSafeErrorCategory,
  ERROR_CATEGORIES,
} from './lib/public-preview-safety.mjs';

export function parseCliArgs(args) {
  const options = {
    url: null,
    apiUrl: null,
    expectedSha: null,
    timeout: 10000,
    json: false,
    offlineFixture: null,
  };
  const seenFlags = new Set();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }
    if (arg === '--url') {
      if (seenFlags.has('--url')) throw new Error('DUPLICATE_ARGUMENT: --url specified multiple times');
      seenFlags.add('--url');
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('MISSING_ARGUMENT_VALUE: --url requires a value');
      options.url = args[++i];
    } else if (arg === '--api-url') {
      if (seenFlags.has('--api-url')) throw new Error('DUPLICATE_ARGUMENT: --api-url specified multiple times');
      seenFlags.add('--api-url');
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('MISSING_ARGUMENT_VALUE: --api-url requires a value');
      options.apiUrl = args[++i];
    } else if (arg === '--expected-sha') {
      if (seenFlags.has('--expected-sha')) throw new Error('DUPLICATE_ARGUMENT: --expected-sha specified multiple times');
      seenFlags.add('--expected-sha');
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('MISSING_ARGUMENT_VALUE: --expected-sha requires a value');
      options.expectedSha = args[++i];
    } else if (arg === '--timeout') {
      if (seenFlags.has('--timeout')) throw new Error('DUPLICATE_ARGUMENT: --timeout specified multiple times');
      seenFlags.add('--timeout');
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('MISSING_ARGUMENT_VALUE: --timeout requires a value');
      const val = Number(args[++i]);
      if (!Number.isInteger(val) || val < 1000 || val > 60000) {
        throw new Error('INVALID_TIMEOUT: Timeout must be an integer between 1000 and 60000 ms');
      }
      options.timeout = val;
    } else if (arg === '--json') {
      if (seenFlags.has('--json')) throw new Error('DUPLICATE_ARGUMENT: --json specified multiple times');
      seenFlags.add('--json');
      options.json = true;
    } else if (arg === '--offline-fixture') {
      if (seenFlags.has('--offline-fixture')) throw new Error('DUPLICATE_ARGUMENT: --offline-fixture specified multiple times');
      seenFlags.add('--offline-fixture');
      if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('MISSING_ARGUMENT_VALUE: --offline-fixture requires a value');
      options.offlineFixture = args[++i];
    } else if (arg.startsWith('-')) {
      throw new Error(`UNKNOWN_OPTION: Unrecognized option "${arg.slice(0, 32)}"`);
    } else if (!options.url) {
      options.url = arg;
    } else {
      throw new Error('UNEXPECTED_ARGUMENT: Unexpected positional argument');
    }
  }

  return options;
}

export function printHelp() {
  console.log(`
EgyHealth 360 — Public Preview Safety Verification Harness

Usage:
  node scripts/verify-public-preview.mjs --url <https-preview-url> [options]

Options:
  --url <url>              Public HTTPS frontend preview URL (required)
  --api-url <url>          Optional public HTTPS API URL
  --expected-sha <sha>     Expected 40-character Git commit SHA
  --timeout <ms>           Request timeout in milliseconds (1000 to 60000, default: 10000)
  --json                   Output full report in JSON format
  --offline-fixture <path> Path to mock responses JSON file (offline / test mode)
  --help, -h               Show this help message

Guarantees & Constraints:
  - Enforces HTTPS on standard port 443 only.
  - Restricts public previews to verified egyhealth360-*.vercel.app hostnames; blocks raw IP literals.
  - Zero redirects followed: all 3xx responses are strictly prohibited.
  - Real streaming byte limits with early cancellation.
  - Strictly allowlisted report output preventing secret/canary reflections.
  - Zero clinical commands, zero mutations, zero credential transmissions.
`);
}

export function formatTerminalReport(report) {
  const lines = [];
  lines.push('======================================================================');
  lines.push('           EGYHEALTH 360 — PUBLIC PREVIEW SAFETY AUDIT                ');
  lines.push('======================================================================');
  lines.push(`Evaluated At : ${report.evaluatedAt}`);
  lines.push(`Target Web   : ${sanitizeUrlForReport(report.targetWebUrl)}`);
  if (report.targetApiUrl) lines.push(`Target API   : ${sanitizeUrlForReport(report.targetApiUrl)}`);
  lines.push(`Overall State: [${report.overallStatus}]`);
  lines.push('----------------------------------------------------------------------');
  lines.push('CHECK RESULTS:');

  for (const check of report.checks) {
    const badge = `[${check.status.padEnd(12)}]`;
    lines.push(`  ${badge} ${check.name}`);
    if (check.details && Object.keys(check.details).length > 0) {
      for (const [k, v] of Object.entries(check.details)) {
        if (k === 'warnings' && Array.isArray(v) && v.length > 0) {
          for (const w of v) lines.push(`      ! WARN: ${w}`);
        } else if (k === 'leaks' && Array.isArray(v) && v.length > 0) {
          for (const l of v) lines.push(`      X LEAK: ${l}`);
        } else if (k !== 'warnings' && k !== 'leaks') {
          const strVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
          lines.push(`      - ${k}: ${strVal}`);
        }
      }
    }
  }

  lines.push('----------------------------------------------------------------------');
  lines.push('NETWORK & SSRF POLICY NOTE:');
  lines.push(`  Notice : ${report.ssrfPolicy}`);
  lines.push('----------------------------------------------------------------------');
  lines.push('CLINICAL READINESS GATE (STRICT INVARIANT):');
  lines.push(`  Status : [${report.clinicalReadiness}]`);
  lines.push(`  Notice : ${report.clinicalReadinessReason}`);
  lines.push('----------------------------------------------------------------------');
  lines.push(`SUMMARY: PASS=${report.summary.pass} | WARN=${report.summary.warn} | FAIL=${report.summary.fail} | NOT_VERIFIED=${report.summary.notVerified}`);
  lines.push('======================================================================');
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    console.error(`Error: ${getSafeErrorCategory(err)}`);
    return 1;
  }

  if (options.help) {
    printHelp();
    return 0;
  }

  if (!options.url && !options.offlineFixture) {
    console.error('Error: --url parameter is required.');
    printHelp();
    return 1;
  }

  let customFetch = null;
  if (options.offlineFixture) {
    const fixturePath = resolve(process.cwd(), options.offlineFixture);
    if (!existsSync(fixturePath)) {
      console.error('Error: Offline fixture file not found.');
      return 1;
    }
    let fixture;
    try {
      fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    } catch {
      console.error('Error: Offline fixture file is not valid JSON.');
      return 1;
    }
    options.allowTestHttp = true;
    customFetch = async (inputUrl) => {
      const urlStr = typeof inputUrl === 'string' ? inputUrl : inputUrl.href;
      const matched = fixture[urlStr] || fixture[new URL(urlStr).pathname] || fixture.default;
      if (!matched) {
        throw new Error(ERROR_CATEGORIES.FETCH_FAILED);
      }
      return {
        status: matched.status ?? 200,
        headers: new globalThis.Headers(matched.headers ?? {}),
        text: async () => matched.body ?? '',
      };
    };
  }

  const report = await runPreviewSafetyCheck(options, customFetch);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatTerminalReport(report));
  }

  return report.overallStatus === 'FAIL' ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((err) => {
    console.error('Fatal execution error:', getSafeErrorCategory(err));
    process.exitCode = 1;
  });
}
