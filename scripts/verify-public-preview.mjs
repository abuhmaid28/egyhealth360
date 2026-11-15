#!/usr/bin/env node
/**
 * EgyHealth 360 — Public Preview Safety CLI
 * Verifies that a deployed preview meets strict public access, security, and routing invariants
 * without performing clinical mutations or credential operations.
 *
 * Usage:
 *   node scripts/verify-public-preview.mjs --url https://preview.example.com
 *   node scripts/verify-public-preview.mjs --url https://preview.example.com --api-url https://api.example.com
 *   node scripts/verify-public-preview.mjs --url https://preview.example.com --json
 */
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runPreviewSafetyCheck } from './lib/public-preview-safety.mjs';

export function parseCliArgs(args) {
  const options = {
    url: null,
    apiUrl: null,
    expectedSha: null,
    timeout: 10000,
    json: false,
    offlineFixture: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }
    if (arg === '--url' && args[i + 1]) {
      options.url = args[++i];
    } else if (arg === '--api-url' && args[i + 1]) {
      options.apiUrl = args[++i];
    } else if (arg === '--expected-sha' && args[i + 1]) {
      options.expectedSha = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = Number(args[++i]);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--offline-fixture' && args[i + 1]) {
      options.offlineFixture = args[++i];
    } else if (!arg.startsWith('-') && !options.url) {
      options.url = arg;
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
  --expected-sha <sha>     Expected Git commit SHA for deployment verification
  --timeout <ms>           Request timeout in milliseconds (default: 10000)
  --json                   Output full report in JSON format
  --offline-fixture <path> Path to mock responses JSON file (offline / test mode)
  --help, -h               Show this help message

Guarantees:
  - Enforces public HTTPS and strictly blocks SSRF to private/loopback networks.
  - Zero clinical commands, zero mutations, zero credential transmissions.
  - Differentiates public network reachability from live clinical release readiness.
`);
}

export function formatTerminalReport(report) {
  const lines = [];
  lines.push('======================================================================');
  lines.push('           EGYHEALTH 360 — PUBLIC PREVIEW SAFETY AUDIT                ');
  lines.push('======================================================================');
  lines.push(`Evaluated At : ${report.evaluatedAt}`);
  lines.push(`Target Web   : ${report.targetWebUrl}`);
  if (report.targetApiUrl) lines.push(`Target API   : ${report.targetApiUrl}`);
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
  lines.push('CLINICAL READINESS GATE (STRICT INVARIANT):');
  lines.push(`  Status : [${report.clinicalReadiness}]`);
  lines.push(`  Notice : ${report.clinicalReadinessReason}`);
  lines.push('----------------------------------------------------------------------');
  lines.push(`SUMMARY: PASS=${report.summary.pass} | WARN=${report.summary.warn} | FAIL=${report.summary.fail} | NOT_VERIFIED=${report.summary.notVerified}`);
  lines.push('======================================================================');
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);

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
      console.error(`Error: Offline fixture not found at "${fixturePath}"`);
      return 1;
    }
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
    options.allowTestHttp = true;
    customFetch = async (inputUrl) => {
      const urlStr = typeof inputUrl === 'string' ? inputUrl : inputUrl.href;
      const matched = fixture[urlStr] || fixture[new URL(urlStr).pathname] || fixture.default;
      if (!matched) {
        throw new Error(`OFFLINE_FIXTURE_MISSING: No mock response for "${urlStr}"`);
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
    console.error('Fatal execution error:', err);
    process.exitCode = 1;
  });
}
