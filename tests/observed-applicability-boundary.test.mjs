import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as dbExports from '../packages/db/dist/index.js';

test('EH-015 architectural boundary: @egyhealth/db does not export internal writer or raw reader', () => {
  const exports = Object.keys(dbExports);

  // Assert approved public factory and error exist
  assert.ok(exports.includes('createObservedApplicabilityPersistence'));
  assert.ok(exports.includes('ObservedApplicabilityError'));

  // Assert internal writers and internal readers are NOT exported
  assert.equal(exports.includes('internalInsertObservedApplicabilitySnapshot'), false);
  assert.equal(exports.includes('internalRetractObservedApplicabilitySnapshot'), false);
  assert.equal(exports.includes('internalGetObservedApplicabilitySnapshots'), false);
  assert.equal(exports.includes('validateInsertSnapshotInput'), false);
  assert.equal(exports.includes('validateRetractSnapshotInput'), false);
  assert.equal(exports.includes('projectObservedApplicabilityPoint'), false);
});

async function getAllSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllSourceFiles(fullPath)));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      files.push(fullPath);
    }
  }
  return files;
}

test('EH-015 architectural boundary: apps/api does not import internal applicability writer or raw reader', async () => {
  const apiFiles = await getAllSourceFiles('apps/api/src');
  assert.ok(apiFiles.length > 0, 'apps/api/src must contain source files to verify');

  for (const file of apiFiles) {
    const content = await readFile(file, 'utf8');
    assert.doesNotMatch(content, /internalInsertObservedApplicabilitySnapshot/, `Violation in ${file}`);
    assert.doesNotMatch(content, /internalRetractObservedApplicabilitySnapshot/, `Violation in ${file}`);
    assert.doesNotMatch(content, /internalGetObservedApplicabilitySnapshots/, `Violation in ${file}`);
    assert.doesNotMatch(content, /observed-applicability(?:\.js)?['"]/, `Violation in ${file}`);
  }
});

test('EH-015 architectural boundary: zero public HTTP routes; current OpenAPI includes approved Issue31 read privacy', async () => {
  const openapiContent = await readFile('docs/openapi.json', 'utf8');
  const hash = createHash('sha256').update(openapiContent).digest('hex');
  assert.equal(hash, 'c4577d43f7c2d43b9ff2c0d4ef1516e2cd5a48d59176ae869ae34c26cdca9ae0');

  const openapi = JSON.parse(openapiContent);
  const pathKeys = Object.keys(openapi.paths ?? {});
  for (const path of pathKeys) {
    assert.doesNotMatch(path, /applicability/, `No public applicability route allowed: ${path}`);
  }
});

test('EH-015 schema boundary: no CareAction, ClosureAssessment, or extraneous models', async () => {
  const schema = await readFile('packages/db/prisma/schema.prisma', 'utf8');
  assert.doesNotMatch(schema, /model\s+CareAction\b/);
  assert.doesNotMatch(schema, /model\s+ClosureAssessment\b/);
  assert.match(schema, /model\s+ObservedClinicalApplicabilitySnapshot\b/);
  assert.match(schema, /model\s+ObservedClinicalApplicabilityRetraction\b/);
});

test('EH-015 product/web/worker/startup imports cannot reach private writer or fixture helpers', async () => {
  const { resolve, dirname, extname } = await import('node:path');
  const { existsSync } = await import('node:fs');
  const roots = (await Promise.all(['apps/api/src', 'apps/web/app', 'apps/web/src', 'apps/experiment-worker/src'].map(async dir =>
    existsSync(dir) ? getAllSourceFiles(dir) : []))).flat();
  roots.push('scripts/dev.mjs');
  const visited = new Set();
  async function scan(file) {
    file = resolve(file);
    if (visited.has(file)) return;
    visited.add(file);
    const text = await readFile(file, 'utf8');
    assert.doesNotMatch(text, /internal(?:Insert|Retract|Get)ObservedApplicability|applyObservedApplicabilityFixture|PrismaClient|@prisma\/client|generated\/prisma/);
    const imports = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const specifier of imports) {
      assert.doesNotMatch(specifier, /observed-applicability|observed-applicability-fixture/);
      if (specifier === '@egyhealth/db') continue; // approved root service exports only
      if (specifier.startsWith('@egyhealth/')) {
        const entry = resolve('packages', specifier.slice('@egyhealth/'.length), 'src/index.ts');
        if (existsSync(entry)) await scan(entry);
      }
      if (specifier.startsWith('.')) {
        const path = resolve(dirname(file), specifier);
        const candidates = [path, path.replace(/\.js$/, '.ts'), path.replace(/\.js$/, '.tsx')];
        const target = candidates.find(candidate => existsSync(candidate) && ['.ts', '.tsx', '.js', '.mjs'].includes(extname(candidate)));
        if (target) await scan(target);
      }
    }
  }
  for (const root of roots) await scan(root);
  assert.ok(visited.size >= roots.length);
  const pkg = JSON.parse(await readFile('packages/db/package.json', 'utf8'));
  assert.deepEqual(Object.keys(pkg.exports), ['.']);
});

test('EH-015 runtime logs fixed failures and uses only bounded fixture transaction entry', async () => {
  // Actual cleanup failure containment is exercised by observed-applicability-cleanup.test.mjs.
  const source = await readFile('scripts/verify-observed-applicability-runtime.mjs', 'utf8');
  assert.match(source, /applyObservedApplicabilityFixtureTransaction\(dbClient, patientA.profileId\)/);
  assert.doesNotMatch(source, /console\.error\([^\n]*,\s*(?:error|err)\b/);
  assert.match(source, /console\.error\('APPLICABILITY_RUNTIME_FAILED'\)/);
  assert.match(source, /console\.error\('APPLICABILITY_RUNTIME_CLEANUP_FAILED'\)/);
});
